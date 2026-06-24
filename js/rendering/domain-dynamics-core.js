const ZERO = Object.freeze({ re: 0, im: 0 });
const ONE = Object.freeze({ re: 1, im: 0 });
const TWO_PI = 2 * Math.PI;
const PI = Math.PI;
const DEFAULT_FRACTIONAL_POWER = 0.5;
const DOMAIN_LIGHTNESS_MIN = 0.34;
const DOMAIN_LIGHTNESS_MAX = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_BASE = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_SCALE = 0.28;
import { createJitTileRenderer } from './domain-dynamics-jit.js';
import { compileExpression } from '../math/expression/evaluator.js';

const DYNAMICS_ESCAPE_RADIUS = 1e4;
const DYNAMICS_ESCAPE_RADIUS_SQ = DYNAMICS_ESCAPE_RADIUS * DYNAMICS_ESCAPE_RADIUS;
const DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE = 1e8;
const NUM_ZETA_TERMS_DIRECT_SUM = 100;
const NUM_ZETA_TERMS_ETA_SERIES = 500;
const NUM_ZETA_HASSE_LEVELS = 32;
const ZETA_REFLECTION_POINT_RE = 1.0;
const DEFAULT_PALETTE_STOPS = Object.freeze([
    Object.freeze([1, 0, 0]),
    Object.freeze([0, 1, 0]),
    Object.freeze([0, 1, 1]),
    Object.freeze([0, 0, 1]),
    Object.freeze([1, 0, 0])
]);

const zetaLogIntegerCache = [0, 0];
const zetaHasseBinomialRowsCache = new Map();
const NO_ACCELERATOR = Object.freeze({ type: 'none' });

function finite(value) {
    return Number.isFinite(value);
}

function complex(re = 0, im = 0) {
    return { re, im };
}

function toComplex(value, im = 0) {
    if (value && typeof value === 'object') {
        return complex(Number(value.re ?? value.real ?? 0), Number(value.im ?? value.imag ?? 0));
    }
    return complex(Number(value ?? 0), Number(im ?? 0));
}

function validComplex(value) {
    return !!value && finite(value.re) && finite(value.im);
}

function complexAdd(a, b) {
    const z = toComplex(a);
    const w = toComplex(b);
    return { re: z.re + w.re, im: z.im + w.im };
}

function complexSub(a, b) {
    const z = toComplex(a);
    const w = toComplex(b);
    return { re: z.re - w.re, im: z.im - w.im };
}

function complexMul(a, b) {
    const z = toComplex(a);
    const w = toComplex(b);
    return {
        re: z.re * w.re - z.im * w.im,
        im: z.re * w.im + z.im * w.re
    };
}

function complexScalarMul(scale, z) {
    const value = toComplex(z);
    return { re: scale * value.re, im: scale * value.im };
}

function complexDivide(a, b) {
    const n = toComplex(a);
    const d = toComplex(b);
    const absRe = Math.abs(d.re);
    const absIm = Math.abs(d.im);
    const scale = Math.max(absRe, absIm);

    if (scale < 1e-15) return { re: NaN, im: NaN };

    if (absRe >= absIm) {
        const ratio = d.im / d.re;
        const divisor = d.re + d.im * ratio;
        return {
            re: (n.re + n.im * ratio) / divisor,
            im: (n.im - n.re * ratio) / divisor
        };
    }

    const ratio = d.re / d.im;
    const divisor = d.im + d.re * ratio;
    return {
        re: (n.re * ratio + n.im) / divisor,
        im: (n.im * ratio - n.re) / divisor
    };
}

function expSafe(x) {
    if (x > 700) return Math.exp(700);
    if (x < -745) return 0;
    return Math.exp(x);
}

function complexExp(z) {
    const value = toComplex(z);
    const magnitude = expSafe(value.re);
    return {
        re: magnitude * Math.cos(value.im),
        im: magnitude * Math.sin(value.im)
    };
}

function complexLn(z) {
    const value = toComplex(z);
    if (value.re === 0 && value.im === 0) return { re: -Infinity, im: 0 };
    return {
        re: Math.log(Math.hypot(value.re, value.im)),
        im: Math.atan2(value.im, value.re)
    };
}

function complexPow(base, exponent) {
    const b = toComplex(base);
    const e = toComplex(exponent);
    if (b.re === 0 && b.im === 0) {
        if (e.re > 0 || (e.re === 0 && e.im !== 0)) return { re: 0, im: 0 };
        if (e.re === 0 && e.im === 0) return { re: 1, im: 0 };
    }
    return complexExp(complexMul(e, complexLn(b)));
}

function complexReciprocal(z) {
    return complexDivide(ONE, z);
}

function complexCos(z) {
    const value = toComplex(z);
    return {
        re: Math.cos(value.re) * Math.cosh(value.im),
        im: -Math.sin(value.re) * Math.sinh(value.im)
    };
}

function complexSin(z) {
    const value = toComplex(z);
    return {
        re: Math.sin(value.re) * Math.cosh(value.im),
        im: Math.cos(value.re) * Math.sinh(value.im)
    };
}

function complexTan(z) {
    return complexDivide(complexSin(z), complexCos(z));
}

function complexSec(z) {
    return complexDivide(ONE, complexCos(z));
}

function complexSinh(z) {
    const value = toComplex(z);
    return {
        re: Math.sinh(value.re) * Math.cos(value.im),
        im: Math.cosh(value.re) * Math.sin(value.im)
    };
}

function complexCosh(z) {
    const value = toComplex(z);
    return {
        re: Math.cosh(value.re) * Math.cos(value.im),
        im: Math.sinh(value.re) * Math.sin(value.im)
    };
}

function complexTanh(z) {
    return complexDivide(complexSinh(z), complexCosh(z));
}

function ensureZetaLogIntegerCache(maxN) {
    const target = Math.max(1, Math.floor(maxN));
    for (let n = zetaLogIntegerCache.length; n <= target; n += 1) {
        zetaLogIntegerCache[n] = Math.log(n);
    }
}

function positiveRealPowFromLog(logBase, expRe, expIm) {
    const magnitude = expSafe(expRe * logBase);
    const angle = expIm * logBase;
    return { re: magnitude * Math.cos(angle), im: magnitude * Math.sin(angle) };
}

function complexRiemannZetaDirect(a, b, numTerms) {
    if (a <= 1.0) return { re: NaN, im: NaN };
    ensureZetaLogIntegerCache(numTerms);
    let sum = { re: 0, im: 0 };
    for (let n = 1; n <= numTerms; n += 1) {
        sum = complexAdd(sum, positiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b));
    }
    return sum;
}

function complexRiemannZetaEta(a, b, numTerms) {
    if (a === 1 && b === 0) return { re: Infinity, im: NaN };
    ensureZetaLogIntegerCache(numTerms);
    let sum = { re: 0, im: 0 };
    for (let n = 1; n <= numTerms; n += 1) {
        const term = positiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b);
        sum = complexAdd(sum, complexScalarMul(n % 2 === 0 ? -1 : 1, term));
    }
    const denominator = complexSub(ONE, positiveRealPowFromLog(Math.log(2), 1 - a, -b));
    return complexDivide(sum, denominator);
}

function zetaHasseRows(maxLevel) {
    if (zetaHasseBinomialRowsCache.has(maxLevel)) return zetaHasseBinomialRowsCache.get(maxLevel);
    const rows = Array.from({ length: maxLevel }, (_, n) => {
        const row = new Array(n + 1);
        row[0] = 1;
        for (let k = 1; k <= n; k += 1) row[k] = row[k - 1] * (n - k + 1) / k;
        return row;
    });
    zetaHasseBinomialRowsCache.set(maxLevel, rows);
    return rows;
}

function complexRiemannZetaHasse(a, b, numLevels) {
    if (a === 1 && b === 0) return { re: Infinity, im: NaN };
    const denominator = complexSub(ONE, positiveRealPowFromLog(Math.log(2), 1 - a, -b));
    if (Math.abs(denominator.re) < 1e-14 && Math.abs(denominator.im) < 1e-14) {
        return complexRiemannZetaEta(a, b, NUM_ZETA_TERMS_ETA_SERIES);
    }

    const rows = zetaHasseRows(numLevels);
    ensureZetaLogIntegerCache(numLevels + 1);
    let outerSum = { re: 0, im: 0 };

    for (let n = 0; n < numLevels; n += 1) {
        let inner = { re: 0, im: 0 };
        for (let k = 0; k <= n; k += 1) {
            const coeff = (k % 2 === 0 ? 1 : -1) * rows[n][k];
            const term = positiveRealPowFromLog(zetaLogIntegerCache[k + 1], -a, -b);
            inner = complexAdd(inner, complexScalarMul(coeff, term));
        }
        outerSum = complexAdd(outerSum, complexScalarMul(Math.pow(2, -n - 1), inner));
    }

    return complexDivide(outerSum, denominator);
}

function complexRiemannZeta(z, continuationEnabled) {
    const value = toComplex(z);
    if (!continuationEnabled) {
        return value.re > ZETA_REFLECTION_POINT_RE
            ? complexRiemannZetaDirect(value.re, value.im, NUM_ZETA_TERMS_DIRECT_SUM)
            : { re: NaN, im: NaN };
    }
    if (value.re === 1 && value.im === 0) return { re: Infinity, im: NaN };
    if (value.re === 0 && value.im === 0) return { re: -0.5, im: 0 };
    if (value.im === 0 && value.re < 0 && value.re % 2 === 0) return { re: 0, im: 0 };
    return complexRiemannZetaHasse(value.re, value.im, NUM_ZETA_HASSE_LEVELS);
}

function complexMobius(z, snapshot) {
    const value = toComplex(z);
    const numerator = complexAdd(complexMul(snapshot.mobiusA, value), snapshot.mobiusB);
    const denominator = complexAdd(complexMul(snapshot.mobiusC, value), snapshot.mobiusD);
    return complexDivide(numerator, denominator);
}

function complexPolynomial(z, snapshot) {
    const value = toComplex(z);
    const degree = Math.max(0, Math.floor(Number(snapshot.polynomialN) || 0));
    let acc = { re: 0, im: 0 };
    for (let k = degree; k >= 0; k -= 1) {
        acc = complexAdd(complexMul(acc, value), snapshot.polynomialCoeffs?.[k] ?? ZERO);
    }
    return acc;
}

function complexPoincare(z) {
    const value = toComplex(z);
    if (value.im <= 1e-9) return { re: NaN, im: NaN };
    const sqrtIm = Math.sqrt(value.im);
    return { re: value.re / sqrtIm, im: sqrtIm };
}

function evaluateBuiltin(functionKey, z, snapshot, evalContext) {
    switch (functionKey) {
        case 'cos': return complexCos(z);
        case 'sin': return complexSin(z);
        case 'tan': return complexTan(z);
        case 'sec': return complexSec(z);
        case 'exp': return complexExp(z);
        case 'ln': return complexLn(z);
        case 'reciprocal': return complexReciprocal(z);
        case 'sinh': return complexSinh(z);
        case 'cosh': return complexCosh(z);
        case 'tanh': return complexTanh(z);
        case 'power': return complexPow(z, { re: snapshot.fractionalPowerN ?? DEFAULT_FRACTIONAL_POWER, im: 0 });
        case 'mobius': return complexMobius(z, snapshot);
        case 'polynomial': return complexPolynomial(z, snapshot);
        case 'poincare': return complexPoincare(z);
        case 'zeta': return complexRiemannZeta(z, !!snapshot.zetaContinuationEnabled);
        case 'algebraic_chaining': return evaluateAlgebraicChaining(z, snapshot, evalContext);
        case 'c': return toComplex(evalContext?.c ?? z);
        default: return toComplex(z);
    }
}

function algebraicParameter(context, fallback) {
    return toComplex(context?.c ?? fallback);
}

function evaluateFunctionBlock(block, z, snapshot, context) {
    if (!block || block.func === 'none') return toComplex(z);

    let arg = toComplex(z);
    if (block.chainedFunc && block.chainedFunc !== 'none') {
        arg = block.chainedFunc === 'c'
            ? algebraicParameter(context, arg)
            : evaluateBuiltin(block.chainedFunc, arg, snapshot, context);
    }

    let value = block.func === 'c'
        ? algebraicParameter(context, arg)
        : evaluateBuiltin(block.func, arg, snapshot, context);

    if (block.power !== undefined && block.power !== 1) value = complexPow(value, { re: Number(block.power), im: 0 });
    if (block.reciprocal) value = complexReciprocal(value);
    if (block.log) value = complexLn(value);
    if (block.exp) value = complexExp(value);

    return value;
}

function evaluateAlgebraicTerm(term, z, snapshot, context) {
    if (!term) return { re: NaN, im: NaN };
    let value = toComplex(term.coeff ?? ONE);
    for (const factor of term.factors ?? []) {
        if (!factor || factor.func === 'none') break;
        value = complexMul(value, evaluateFunctionBlock(factor, z, snapshot, context));
    }
    return value;
}

let algebraicZExprCompiled = null;
let algebraicZExprCacheKey = null;

function evaluateAlgebraicChaining(z, snapshot, context = null) {
    const terms = snapshot.algebraicChainingTerms;
    if (!snapshot.algebraicChainingEnabled || !Array.isArray(terms) || terms.length === 0) {
        return { re: 0, im: 0 };
    }

    let point = toComplex(z);

    if (snapshot.algebraicChainingZExpr && snapshot.algebraicChainingZExpr !== 'z') {
        if (algebraicZExprCacheKey !== snapshot.algebraicChainingZExpr) {
            try {
                algebraicZExprCompiled = compileExpression(snapshot.algebraicChainingZExpr, { allowedVariables: ['z'] });
            } catch (e) {
                algebraicZExprCompiled = null;
            }
            algebraicZExprCacheKey = snapshot.algebraicChainingZExpr;
        }
        if (algebraicZExprCompiled) {
            try {
                const result = algebraicZExprCompiled({ z: point });
                if (result !== null && result !== undefined) {
                    if (typeof result === 'number') {
                        point = { re: result, im: 0 };
                    } else if (typeof result === 'object' && 're' in result) {
                        point = { re: result.re, im: result.im || 0 };
                    }
                }
            } catch (e) {}
        }
    }

    const evalContext = context || { c: point };
    let sum = { re: 0, im: 0 };
    for (const term of terms) {
        const value = evaluateAlgebraicTerm(term, point, snapshot, evalContext);
        if (!validComplex(value)) return { re: NaN, im: NaN };
        sum = complexAdd(sum, value);
    }
    return sum;
}

function plainAlgebraicFactor(factor) {
    return !!factor &&
        (!factor.chainedFunc || factor.chainedFunc === 'none') &&
        !factor.reciprocal &&
        !factor.log &&
        !factor.exp &&
        Number(factor.power ?? 1) === 1;
}

function scaledComplex(value, scale) {
    return complexMul(toComplex(value), toComplex(scale));
}

function addIntoCoeff(coeffs, index, value) {
    const current = coeffs[index] || ZERO;
    coeffs[index] = complexAdd(current, value);
}

function nearlyZero(value) {
    return Math.abs(value) < 1e-12;
}

function isIdentityPolynomial(snapshot) {
    const degree = Math.max(0, Math.floor(Number(snapshot.polynomialN) || 0));
    if (degree !== 1) return false;
    const c0 = toComplex(snapshot.polynomialCoeffs?.[0] ?? ZERO);
    const c1 = toComplex(snapshot.polynomialCoeffs?.[1] ?? ZERO);
    return nearlyZero(c0.re) && nearlyZero(c0.im) &&
        nearlyZero(c1.re - 1) && nearlyZero(c1.im);
}

function createPolynomialParameterAccelerator(snapshot) {
    if (
        snapshot.functionKey !== 'algebraic_chaining' ||
        !snapshot.algebraicChainingEnabled ||
        !Array.isArray(snapshot.algebraicChainingTerms) ||
        (snapshot.algebraicChainingZExpr && snapshot.algebraicChainingZExpr !== 'z')
    ) {
        return null;
    }

    const degree = Math.max(0, Math.floor(Number(snapshot.polynomialN) || 0));
    const coeffs = Array.from({ length: degree + 1 }, () => ({ re: 0, im: 0 }));
    let cCoeff = { re: 0, im: 0 };
    let hasPolynomial = false;
    let hasParameter = false;

    for (const term of snapshot.algebraicChainingTerms) {
        const termCoeff = toComplex(term?.coeff ?? ONE);
        const factors = Array.isArray(term?.factors)
            ? term.factors.filter(factor => factor && factor.func && factor.func !== 'none')
            : [];

        if (!factors.length) {
            addIntoCoeff(coeffs, 0, termCoeff);
            continue;
        }

        if (factors.length !== 1 || !plainAlgebraicFactor(factors[0])) return null;

        const factor = factors[0];
        if (factor.func === 'polynomial') {
            for (let k = 0; k <= degree; k += 1) {
                addIntoCoeff(coeffs, k, scaledComplex(snapshot.polynomialCoeffs?.[k] ?? ZERO, termCoeff));
            }
            hasPolynomial = true;
            continue;
        }

        if (factor.func === 'c') {
            cCoeff = complexAdd(cCoeff, termCoeff);
            hasParameter = true;
            continue;
        }

        return null;
    }

    return hasPolynomial
        ? {
            type: 'polynomial-parameter',
            degree,
            coeffs,
            coeffsRe: coeffs.map(coeff => coeff.re),
            coeffsIm: coeffs.map(coeff => coeff.im),
            cCoeff,
            cCoeffRe: cCoeff.re,
            cCoeffIm: cCoeff.im,
            hasParameter
        }
        : null;
}

function laurentFactorExponent(factor, snapshot) {
    if (!factor || factor.func !== 'polynomial' || !isIdentityPolynomial(snapshot)) return null;
    if (factor.chainedFunc && factor.chainedFunc !== 'none') return null;
    if (factor.log || factor.exp) return null;

    const power = Number(factor.power ?? 1);
    if (!Number.isInteger(power) || power < 0) return null;
    return factor.reciprocal ? -power : power;
}

function createLaurentParameterAccelerator(snapshot) {
    if (
        snapshot.functionKey !== 'algebraic_chaining' ||
        !snapshot.algebraicChainingEnabled ||
        !Array.isArray(snapshot.algebraicChainingTerms) ||
        (snapshot.algebraicChainingZExpr && snapshot.algebraicChainingZExpr !== 'z')
    ) {
        return null;
    }

    const terms = [];
    let cCoeff = { re: 0, im: 0 };
    let hasParameter = false;

    for (const term of snapshot.algebraicChainingTerms) {
        const termCoeff = toComplex(term?.coeff ?? ONE);
        const factors = Array.isArray(term?.factors)
            ? term.factors.filter(factor => factor && factor.func && factor.func !== 'none')
            : [];

        if (!factors.length) {
            terms.push({ exponent: 0, coeffRe: termCoeff.re, coeffIm: termCoeff.im });
            continue;
        }

        if (factors.length !== 1) return null;

        const factor = factors[0];
        if (factor.func === 'c' && plainAlgebraicFactor(factor)) {
            cCoeff = complexAdd(cCoeff, termCoeff);
            hasParameter = true;
            continue;
        }

        const exponent = laurentFactorExponent(factor, snapshot);
        if (exponent === null) return null;
        terms.push({ exponent, coeffRe: termCoeff.re, coeffIm: termCoeff.im });
    }

    return terms.length
        ? {
            type: 'laurent-parameter',
            terms,
            cCoeff,
            cCoeffRe: cCoeff.re,
            cCoeffIm: cCoeff.im,
            hasParameter
        }
        : null;
}

function createDynamicsAccelerator(snapshot) {
    const jit = createJitTileRenderer(
        snapshot, 
        writeDynamicsEscapeColor, 
        writeBlack, 
        writeDomainColor,
        evaluateBuiltin
    );
    if (jit) return jit;

    return createPolynomialParameterAccelerator(snapshot) ||
        createLaurentParameterAccelerator(snapshot) ||
        NO_ACCELERATOR;
}

function evaluatePolynomialParameterAccelerator(accelerator, z, c) {
    const value = toComplex(z);
    let acc = accelerator.coeffs[accelerator.degree] || ZERO;
    for (let k = accelerator.degree - 1; k >= 0; k -= 1) {
        acc = complexAdd(complexMul(acc, value), accelerator.coeffs[k] || ZERO);
    }
    return accelerator.hasParameter
        ? complexAdd(acc, complexMul(accelerator.cCoeff, c))
        : acc;
}

function evaluateBase(snapshot, value, c, accelerator = NO_ACCELERATOR) {
    if (accelerator.type === 'polynomial-parameter') {
        return evaluatePolynomialParameterAccelerator(accelerator, value, c);
    }
    return evaluateBuiltin(snapshot.functionKey, value, snapshot, { c });
}

function exceedsChainBailout(value) {
    return Math.max(Math.abs(value?.re ?? 0), Math.abs(value?.im ?? 0)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE;
}

function validOrNull(value) {
    return validComplex(value) ? value : null;
}

function snapshotChainCount(snapshot) {
    return Math.max(1, Math.floor(Number(snapshot.chainCount) || 1));
}

function evaluateChainStep(mode, current, baseValue, snapshot, c, accelerator = NO_ACCELERATOR) {
    switch (mode) {
        case 'power': return validOrNull(complexMul(current, baseValue));
        case 'sqrt': return validOrNull(complexPow(current, { re: 0.5, im: 0 }));
        case 'ln': return validOrNull(complexLn(current));
        case 'exp': return validOrNull(complexExp(current));
        case 'reciprocal': return validOrNull(complexReciprocal(current));
        case 'recursion':
        default: return validOrNull(evaluateBase(snapshot, current, c, accelerator));
    }
}

export function evaluateDomainDynamicsValue(snapshot, re, im, accelerator = createDynamicsAccelerator(snapshot)) {
    const count = snapshotChainCount(snapshot);
    const c = { re, im };

    if (!snapshot.chainingEnabled || (count <= 1 && snapshot.chainMode !== 'zero_seed')) {
        return validOrNull(evaluateBase(snapshot, c, c, accelerator));
    }

    if (snapshot.chainMode === 'zero_seed') {
        let current = { re: 0, im: 0 };
        let lastFinite = null;
        for (let i = 0; i < count; i += 1) {
            current = validOrNull(evaluateBase(snapshot, current, c, accelerator));
            if (!current) return lastFinite;
            lastFinite = current;
            if (exceedsChainBailout(current)) return current;
        }
        return current;
    }

    let current = validOrNull(evaluateBase(snapshot, c, c, accelerator));
    if (!current) return null;
    let lastFinite = current;
    if (exceedsChainBailout(lastFinite)) return lastFinite;

    const baseValue = lastFinite;
    for (let i = 1; i < count; i += 1) {
        current = evaluateChainStep(snapshot.chainMode || 'recursion', current, baseValue, snapshot, c, accelerator);
        if (!current) return lastFinite;
        lastFinite = current;
        if (exceedsChainBailout(current)) return current;
    }

    return current;
}

function paletteColor(stops, h) {
    const palette = Array.isArray(stops) && stops.length >= 2 ? stops : DEFAULT_PALETTE_STOPS;
    const hue = Math.min(0.999999, Math.max(0, h));
    const value = hue * (palette.length - 1);
    const idx = Math.min(palette.length - 2, Math.floor(value));
    const t = value - idx;
    const a = palette[idx];
    const b = palette[idx + 1];
    return [
        a[0] * (1 - t) + b[0] * t,
        a[1] * (1 - t) + b[1] * t,
        a[2] * (1 - t) + b[2] * t
    ];
}

function applyLightnessAndSaturation(rgb, lightness, saturation) {
    let [r, g, b] = rgb;
    if (lightness < 0.5) {
        const t = lightness / 0.5;
        r *= t;
        g *= t;
        b *= t;
    } else {
        const t = (lightness - 0.5) / 0.5;
        r = r * (1 - t) + t;
        g = g * (1 - t) + t;
        b = b * (1 - t) + t;
    }

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray * (1 - saturation) + r * saturation;
    g = gray * (1 - saturation) + g * saturation;
    b = gray * (1 - saturation) + b * saturation;

    return [
        Math.min(255, Math.max(0, Math.round(r * 255))),
        Math.min(255, Math.max(0, Math.round(g * 255))),
        Math.min(255, Math.max(0, Math.round(b * 255)))
    ];
}

function magnitudeLightness(logMod, cycles) {
    if (!finite(logMod)) return DOMAIN_LIGHTNESS_MAX;
    if (cycles <= 0.0001) return 0.5;
    const detail = Math.max(0.05, cycles);
    const tone = (2 / Math.PI) * Math.atan(
        logMod * (DOMAIN_LIGHTNESS_DETAIL_BASE + detail * DOMAIN_LIGHTNESS_DETAIL_SCALE)
    );
    return DOMAIN_LIGHTNESS_MIN + (DOMAIN_LIGHTNESS_MAX - DOMAIN_LIGHTNESS_MIN) * tone;
}

export function domainColorForValue(value, snapshot) {
    if (!validComplex(value)) return [0, 0, 0];
    const phase = Math.atan2(value.im, value.re);
    const modValue = Math.hypot(value.re, value.im);
    if (!finite(modValue)) return [0, 0, 0];

    const style = snapshot.style || {};
    const logMod = Math.log1p(modValue);
    const lightnessBase = magnitudeLightness(logMod, Number(style.lightnessCycles) || 0);
    const contrast = finite(style.contrast) ? style.contrast : 1;
    const brightness = finite(style.brightness) ? style.brightness : 1;
    const saturation = finite(style.saturation) ? style.saturation : 1;
    const lightness = Math.min(0.95, Math.max(0.05, (0.5 + (lightnessBase - 0.5) * contrast) * brightness));
    const finalSaturation = Math.min(1, Math.max(0, saturation));
    let hue = (phase / TWO_PI) % 1;
    if (hue < 0) hue += 1;
    return applyLightnessAndSaturation(paletteColor(snapshot.paletteStops, hue), lightness, finalSaturation);
}

function dynamicsEscapeColor(smoothIteration, count, snapshot) {
    const t = Math.max(0, Math.min(1, smoothIteration / Math.max(1, count)));
    const style = snapshot.style || {};
    const baseColor = paletteColor(snapshot.paletteStops, Math.min(t, 0.9999));
    const lightnessBase = 0.22 + 0.58 * Math.pow(t, 0.65);
    const contrast = finite(style.contrast) ? style.contrast : 1;
    const brightness = finite(style.brightness) ? style.brightness : 1;
    const saturation = finite(style.saturation) ? style.saturation : 1;
    const lightness = Math.min(0.95, Math.max(0.05, (0.5 + (lightnessBase - 0.5) * contrast) * brightness));
    return applyLightnessAndSaturation(baseColor, lightness, Math.min(1, Math.max(0, saturation)));
}

function writeRgb(data, idx, r, g, b) {
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
}

export function writeBlack(data, idx) {
    writeRgb(data, idx, 0, 0, 0);
}

function paletteComponents(stops, h) {
    const palette = Array.isArray(stops) && stops.length >= 2 ? stops : DEFAULT_PALETTE_STOPS;
    const hue = Math.min(0.999999, Math.max(0, h));
    const value = hue * (palette.length - 1);
    const idx = Math.min(palette.length - 2, Math.floor(value));
    const t = value - idx;
    const a = palette[idx];
    const b = palette[idx + 1];
    return {
        r: a[0] * (1 - t) + b[0] * t,
        g: a[1] * (1 - t) + b[1] * t,
        b: a[2] * (1 - t) + b[2] * t
    };
}

function writeStyledColor(data, idx, baseR, baseG, baseB, lightness, saturation) {
    let r = baseR;
    let g = baseG;
    let b = baseB;

    if (lightness < 0.5) {
        const t = lightness / 0.5;
        r *= t;
        g *= t;
        b *= t;
    } else {
        const t = (lightness - 0.5) / 0.5;
        r = r * (1 - t) + t;
        g = g * (1 - t) + t;
        b = b * (1 - t) + t;
    }

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray * (1 - saturation) + r * saturation;
    g = gray * (1 - saturation) + g * saturation;
    b = gray * (1 - saturation) + b * saturation;

    writeRgb(
        data,
        idx,
        Math.min(255, Math.max(0, Math.round(r * 255))),
        Math.min(255, Math.max(0, Math.round(g * 255))),
        Math.min(255, Math.max(0, Math.round(b * 255)))
    );
}

function styleValues(snapshot) {
    const style = snapshot.style || {};
    return {
        brightness: finite(style.brightness) ? style.brightness : 1,
        contrast: finite(style.contrast) ? style.contrast : 1,
        saturation: Math.min(1, Math.max(0, finite(style.saturation) ? style.saturation : 1)),
        lightnessCycles: Number(style.lightnessCycles) || 0
    };
}

export function writeDomainColor(data, idx, re, im, snapshot) {
    if (!finite(re) || !finite(im)) {
        writeBlack(data, idx);
        return;
    }

    const modValue = Math.hypot(re, im);
    if (!finite(modValue)) {
        writeBlack(data, idx);
        return;
    }

    const style = styleValues(snapshot);
    const phase = Math.atan2(im, re);
    const logMod = Math.log1p(modValue);
    const lightnessBase = magnitudeLightness(logMod, style.lightnessCycles);
    const lightness = Math.min(0.95, Math.max(0.05, (0.5 + (lightnessBase - 0.5) * style.contrast) * style.brightness));
    let hue = (phase / TWO_PI) % 1;
    if (hue < 0) hue += 1;
    const base = paletteComponents(snapshot.paletteStops, hue);
    writeStyledColor(data, idx, base.r, base.g, base.b, lightness, style.saturation);
}

export function writeDynamicsEscapeColor(data, idx, smoothIteration, count, snapshot) {
    const style = styleValues(snapshot);
    const t = Math.max(0, Math.min(1, smoothIteration / Math.max(1, count)));
    const base = paletteComponents(snapshot.paletteStops, Math.min(t, 0.9999));
    const lightnessBase = 0.22 + 0.58 * Math.pow(t, 0.65);
    const lightness = Math.min(0.95, Math.max(0.05, (0.5 + (lightnessBase - 0.5) * style.contrast) * style.brightness));
    writeStyledColor(data, idx, base.r, base.g, base.b, lightness, style.saturation);
}

export function orbitColorForPoint(snapshot, re, im, accelerator = createDynamicsAccelerator(snapshot)) {
    const count = snapshotChainCount(snapshot);
    const c = { re, im };
    let current = snapshot.chainMode === 'zero_seed' ? { re: 0, im: 0 } : c;
    let smoothIteration = count;
    let escaped = false;

    for (let i = 0; i < count; i += 1) {
        const next = validOrNull(evaluateBase(snapshot, current, c, accelerator));
        const magSq = next ? next.re * next.re + next.im * next.im : DYNAMICS_ESCAPE_RADIUS_SQ;
        const tooLarge = next && (
            magSq > DYNAMICS_ESCAPE_RADIUS_SQ ||
            Math.max(Math.abs(next.re), Math.abs(next.im)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE
        );

        if (!next || tooLarge) {
            const magnitude = Math.sqrt(Math.max(magSq, DYNAMICS_ESCAPE_RADIUS));
            smoothIteration = i + 1;
            if (next && finite(magnitude) && magnitude > 1.0001) {
                const smoothAdjust = Math.log(
                    Math.max(Math.log(magnitude) / Math.log(DYNAMICS_ESCAPE_RADIUS), 1e-6)
                ) / Math.LN2;
                smoothIteration = Math.max(0, Math.min(count, smoothIteration - smoothAdjust));
            }
            escaped = true;
            break;
        }

        current = next;
    }

    return escaped ? dynamicsEscapeColor(smoothIteration, count, snapshot) : [0, 0, 0];
}

export function colorDomainDynamicsPoint(snapshot, re, im, accelerator = createDynamicsAccelerator(snapshot)) {
    if (snapshot.fractalOrbitColoringEnabled) {
        return orbitColorForPoint(snapshot, re, im, accelerator);
    }
    return domainColorForValue(evaluateDomainDynamicsValue(snapshot, re, im, accelerator), snapshot);
}

export function createDomainDynamicsTileRenderer(snapshot) {
    const accelerator = createDynamicsAccelerator(snapshot);
    return tile => renderDomainDynamicsTile(snapshot, tile, accelerator);
}

function renderPolynomialParameterOrbitTile(snapshot, tile, accelerator) {
    const data = new Uint8ClampedArray(tile.width * tile.height * 4);
    const xRange = snapshot.viewport.xRange;
    const yRange = snapshot.viewport.yRange;
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];
    const xStep = tile.scale * spanX / snapshot.viewport.width;
    const yStep = -tile.scale * spanY / snapshot.viewport.height;
    const xStart = xRange[0] + (tile.x + 0.5) * tile.scale * spanX / snapshot.viewport.width;
    const yStart = yRange[1] - (tile.y + 0.5) * tile.scale * spanY / snapshot.viewport.height;
    const count = snapshotChainCount(snapshot);
    const zeroSeed = snapshot.chainMode === 'zero_seed';
    const degree = accelerator.degree;
    const coeffsRe = accelerator.coeffsRe;
    const coeffsIm = accelerator.coeffsIm;
    const cCoeffRe = accelerator.cCoeffRe;
    const cCoeffIm = accelerator.cCoeffIm;
    const hasParameter = accelerator.hasParameter;

    for (let y = 0; y < tile.height; y += 1) {
        const ci = yStart + y * yStep;
        for (let x = 0; x < tile.width; x += 1) {
            const cr = xStart + x * xStep;
            let zr = zeroSeed ? 0 : cr;
            let zi = zeroSeed ? 0 : ci;
            let smoothIteration = count;
            let escaped = false;

            for (let i = 0; i < count; i += 1) {
                let nr = coeffsRe[degree] || 0;
                let ni = coeffsIm[degree] || 0;

                for (let k = degree - 1; k >= 0; k -= 1) {
                    const tr = nr * zr - ni * zi + (coeffsRe[k] || 0);
                    ni = nr * zi + ni * zr + (coeffsIm[k] || 0);
                    nr = tr;
                }

                if (hasParameter) {
                    nr += cCoeffRe * cr - cCoeffIm * ci;
                    ni += cCoeffRe * ci + cCoeffIm * cr;
                }

                const magSq = nr * nr + ni * ni;
                const tooLarge = magSq > DYNAMICS_ESCAPE_RADIUS_SQ ||
                    Math.max(Math.abs(nr), Math.abs(ni)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE;

                if (!finite(nr) || !finite(ni) || tooLarge) {
                    const magnitude = Math.sqrt(Math.max(magSq, DYNAMICS_ESCAPE_RADIUS));
                    smoothIteration = i + 1;
                    if (finite(magnitude) && magnitude > 1.0001) {
                        const smoothAdjust = Math.log(
                            Math.max(Math.log(magnitude) / Math.log(DYNAMICS_ESCAPE_RADIUS), 1e-6)
                        ) / Math.LN2;
                        smoothIteration = Math.max(0, Math.min(count, smoothIteration - smoothAdjust));
                    }
                    escaped = true;
                    break;
                }

                zr = nr;
                zi = ni;
            }

            const idx = (y * tile.width + x) * 4;
            if (escaped) {
                writeDynamicsEscapeColor(data, idx, smoothIteration, count, snapshot);
            } else {
                writeBlack(data, idx);
            }
        }
    }

    return data;
}

function renderPolynomialParameterValueTile(snapshot, tile, accelerator) {
    const mode = snapshot.chainMode || 'recursion';
    if (mode !== 'recursion' && mode !== 'zero_seed') return null;

    const data = new Uint8ClampedArray(tile.width * tile.height * 4);
    const xRange = snapshot.viewport.xRange;
    const yRange = snapshot.viewport.yRange;
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];
    const xStep = tile.scale * spanX / snapshot.viewport.width;
    const yStep = -tile.scale * spanY / snapshot.viewport.height;
    const xStart = xRange[0] + (tile.x + 0.5) * tile.scale * spanX / snapshot.viewport.width;
    const yStart = yRange[1] - (tile.y + 0.5) * tile.scale * spanY / snapshot.viewport.height;
    const count = snapshotChainCount(snapshot);
    const zeroSeed = mode === 'zero_seed';
    const degree = accelerator.degree;
    const coeffsRe = accelerator.coeffsRe;
    const coeffsIm = accelerator.coeffsIm;
    const cCoeffRe = accelerator.cCoeffRe;
    const cCoeffIm = accelerator.cCoeffIm;
    const hasParameter = accelerator.hasParameter;

    for (let y = 0; y < tile.height; y += 1) {
        const ci = yStart + y * yStep;
        for (let x = 0; x < tile.width; x += 1) {
            const cr = xStart + x * xStep;
            let zr = zeroSeed ? 0 : cr;
            let zi = zeroSeed ? 0 : ci;
            let lastRe = NaN;
            let lastIm = NaN;
            const iterations = snapshot.chainingEnabled || zeroSeed ? count : 1;

            for (let i = 0; i < iterations; i += 1) {
                let nr = coeffsRe[degree] || 0;
                let ni = coeffsIm[degree] || 0;

                for (let k = degree - 1; k >= 0; k -= 1) {
                    const tr = nr * zr - ni * zi + (coeffsRe[k] || 0);
                    ni = nr * zi + ni * zr + (coeffsIm[k] || 0);
                    nr = tr;
                }

                if (hasParameter) {
                    nr += cCoeffRe * cr - cCoeffIm * ci;
                    ni += cCoeffRe * ci + cCoeffIm * cr;
                }

                if (!finite(nr) || !finite(ni)) break;

                zr = nr;
                zi = ni;
                lastRe = nr;
                lastIm = ni;
                if (Math.max(Math.abs(nr), Math.abs(ni)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE) break;
            }

            writeDomainColor(data, (y * tile.width + x) * 4, lastRe, lastIm, snapshot);
        }
    }

    return data;
}

function renderPolynomialParameterTile(snapshot, tile, accelerator) {
    if (accelerator.type !== 'polynomial-parameter') return null;
    if (snapshot.fractalOrbitColoringEnabled) {
        return renderPolynomialParameterOrbitTile(snapshot, tile, accelerator);
    }
    return renderPolynomialParameterValueTile(snapshot, tile, accelerator);
}

export function renderDomainDynamicsTile(snapshot, tile, accelerator = createDynamicsAccelerator(snapshot)) {
    if (accelerator.type === 'jit') {
        return accelerator.renderTile(
            tile, DYNAMICS_ESCAPE_RADIUS_SQ, DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE,
            DYNAMICS_ESCAPE_RADIUS, writeDynamicsEscapeColor, writeBlack, writeDomainColor
        );
    }

    const accelerated = renderPolynomialParameterTile(snapshot, tile, accelerator);
    if (accelerated) return accelerated;

    const data = new Uint8ClampedArray(tile.width * tile.height * 4);
    const xRange = snapshot.viewport.xRange;
    const yRange = snapshot.viewport.yRange;
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];

    for (let y = 0; y < tile.height; y += 1) {
        const sampleY = (tile.y + y + 0.5) * tile.scale;
        const im = yRange[1] - (sampleY / snapshot.viewport.height) * spanY;
        for (let x = 0; x < tile.width; x += 1) {
            const sampleX = (tile.x + x + 0.5) * tile.scale;
            const re = xRange[0] + (sampleX / snapshot.viewport.width) * spanX;
            const rgb = colorDomainDynamicsPoint(snapshot, re, im, accelerator);
            const idx = (y * tile.width + x) * 4;
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }

    return data;
}

export function domainDynamicsSignature(snapshot) {
    return JSON.stringify({
        functionKey: snapshot.functionKey,
        chainingEnabled: snapshot.chainingEnabled,
        chainMode: snapshot.chainMode,
        chainCount: snapshot.chainCount,
        fractalOrbitColoringEnabled: snapshot.fractalOrbitColoringEnabled,
        algebraicChainingEnabled: snapshot.algebraicChainingEnabled,
        algebraicChainingTerms: snapshot.algebraicChainingTerms,
        algebraicChainingZExpr: snapshot.algebraicChainingZExpr,
        polynomialN: snapshot.polynomialN,
        polynomialCoeffs: snapshot.polynomialCoeffs,
        mobiusA: snapshot.mobiusA,
        mobiusB: snapshot.mobiusB,
        mobiusC: snapshot.mobiusC,
        mobiusD: snapshot.mobiusD,
        fractionalPowerN: snapshot.fractionalPowerN,
        zetaContinuationEnabled: snapshot.zetaContinuationEnabled,
        style: snapshot.style,
        paletteStops: snapshot.paletteStops,
        viewport: snapshot.viewport
    });
}

export function isDomainDynamicsSnapshot(snapshot) {
    return !!snapshot &&
        !snapshot.isWPlaneColoring &&
        snapshot.chainingEnabled &&
        (snapshot.chainCount > 1 || snapshot.chainMode === 'zero_seed') &&
        (snapshot.chainMode === 'recursion' || snapshot.chainMode === 'zero_seed' || !snapshot.fractalOrbitColoringEnabled);
}
