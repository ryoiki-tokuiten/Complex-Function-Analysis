import { state } from './store/state.js';
import { eventBus } from './store/events.js';

let cachesDirty = true;
const mappedProfileCache = new Map();
const chainedFuncCache = new Map();

if (typeof eventBus !== 'undefined' && eventBus.on) {
    eventBus.on('state:change', () => {
        cachesDirty = true;
    });
}

import {
    POLE_MAGNITUDE_THRESHOLD,
    MAX_POLY_DEGREE,
    DEFAULT_TAYLOR_SERIES_CENTER,
    TWO_PI,
    PI,
    ZETA_REFLECTION_POINT_RE,
    NUM_ZETA_TERMS_DIRECT_SUM,
    NUM_ZETA_TERMS_ETA_SERIES,
    NUM_ZETA_HASSE_LEVELS
} from './constants/numerical.js';

// This module is intentionally built around a tiny complex-number kernel.

const ZERO = Object.freeze({ re: 0, im: 0 });
const ONE = Object.freeze({ re: 1, im: 0 });
const NAN_COMPLEX = Object.freeze({ re: NaN, im: NaN });
const COMPLEX_ZERO_EPSILON = 1e-15;
const COMPLEX_ZERO_MAG_SQ = 1e-30;
const DEFAULT_FRACTIONAL_POWER = 0.5;
const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
const LN_2 = Math.log(2);
let activeTransformProvider = null;

const isObject = value => value !== null && typeof value === 'object';
const finite = Number.isFinite;
const realOf = value => value?.re ?? value?.real ?? 0;
const imagOf = value => value?.im ?? value?.imag ?? 0;
const hypotComplex = value => Math.hypot(value.re, value.im);
const cloneComplex = value => ({ re: value.re, im: value.im });
const complex = (re = 0, im = 0) => ({ re, im });

function toComplex(value, im = 0) {
    return isObject(value) ? complex(realOf(value), imagOf(value)) : complex(value ?? 0, im ?? 0);
}

function normalizeUnaryComplexArgs(a, b) {
    return isObject(a) ? toComplex(a) : complex(a ?? 0, b ?? 0);
}

function normalizeBinaryComplexArgs(left, right) {
    return [toComplex(left), toComplex(right)];
}

function validComplex(value) {
    return !!value && finite(value.re) && finite(value.im);
}

function invalidComplex(value) {
    return !validComplex(value);
}

function finiteComplexOrNaN(value) {
    return validComplex(value) ? value : { re: NaN, im: NaN };
}

function addInto(target, value, scale = 1) {
    target.re += value.re * scale;
    target.im += value.im * scale;
    return target;
}

function scalarComplex(value, scale) {
    return { re: value.re * scale, im: value.im * scale };
}

function zeroLike() {
    return { re: 0, im: 0 };
}

export function withMaxMag(res, ...inputs) {
    return res;
}

export function isNumericallyStable(w) {
    return true;
}

export function complexAdd(z1, z2) {
    const a = toComplex(z1);
    const b = toComplex(z2);
    return withMaxMag({ re: a.re + b.re, im: a.im + b.im }, z1, z2);
}

export function complexSub(z1, z2) {
    const a = toComplex(z1);
    const b = toComplex(z2);
    return withMaxMag({ re: a.re - b.re, im: a.im - b.im }, z1, z2);
}

export function complexMul(z1, z2) {
    const a = toComplex(z1);
    const b = toComplex(z2);
    return withMaxMag({
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    }, z1, z2);
}

export function complexScalarMul(s, z) {
    const value = toComplex(z);
    return withMaxMag({ re: s * value.re, im: s * value.im }, s, z);
}

export function complexDivide(num, den) {
    const n = toComplex(num);
    const d = toComplex(den);
    const absRe = Math.abs(d.re);
    const absIm = Math.abs(d.im);
    const scale = Math.max(absRe, absIm);

    if (scale < COMPLEX_ZERO_EPSILON) {
        const numMagSq = n.re * n.re + n.im * n.im;
        if (numMagSq < COMPLEX_ZERO_MAG_SQ) return { re: NaN, im: NaN };
        if (Math.abs(n.re) < COMPLEX_ZERO_EPSILON && Math.abs(n.im) < COMPLEX_ZERO_EPSILON) {
            return { re: 0, im: 0 };
        }

        const largeValue = POLE_MAGNITUDE_THRESHOLD * 2;
        const safeScale = largeValue / Math.sqrt(numMagSq);
        return withMaxMag({ re: n.re * safeScale, im: n.im * safeScale }, num, den);
    }

    if (absRe >= absIm) {
        const ratio = d.im / d.re;
        const divisor = d.re + d.im * ratio;
        return withMaxMag({
            re: (n.re + n.im * ratio) / divisor,
            im: (n.im - n.re * ratio) / divisor
        }, num, den);
    }

    const ratio = d.re / d.im;
    const divisor = d.im + d.re * ratio;
    return withMaxMag({
        re: (n.re * ratio + n.im) / divisor,
        im: (n.im * ratio - n.re) / divisor
    }, num, den);
}

export function complexAbs(z) {
    return hypotComplex(toComplex(z));
}

export function complexArg(z) {
    const value = toComplex(z);
    return Math.atan2(value.im, value.re);
}

export function _cosh(x) { return Math.cosh(x); }
export function _sinh(x) { return Math.sinh(x); }

export function complexCos(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const cosh = _cosh(z.im);
    const sinh = _sinh(z.im);
    return withMaxMag({
        re: Math.cos(z.re) * cosh,
        im: -Math.sin(z.re) * sinh
    }, a, cosh, sinh);
}

export function complexSin(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const cosh = _cosh(z.im);
    const sinh = _sinh(z.im);
    return withMaxMag({
        re: Math.sin(z.re) * cosh,
        im: Math.cos(z.re) * sinh
    }, a, cosh, sinh);
}

export function complexTan(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const sinZ = complexSin(z);
    const cosZ = complexCos(z);
    return withMaxMag(complexDivide(sinZ, cosZ), a, sinZ, cosZ);
}

export function complexSec(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const cosZ = complexCos(z);
    return withMaxMag(complexDivide(ONE, cosZ), a, cosZ);
}

export function expSafe(x) {
    if (x > 700) return Math.exp(700);
    if (x < -745) return 0;
    return Math.exp(x);
}

export function complexExp(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const magnitude = expSafe(z.re);
    return withMaxMag({
        re: magnitude * Math.cos(z.im),
        im: magnitude * Math.sin(z.im)
    }, a, magnitude);
}

export function complexLn(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    if (z.re === 0 && z.im === 0) return { re: -Infinity, im: 0 };
    return withMaxMag({
        re: Math.log(Math.hypot(z.re, z.im)),
        im: Math.atan2(z.im, z.re)
    }, a);
}

export function complexReciprocal(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    if (z.re === 0 && z.im === 0) return { re: NaN, im: NaN };
    return complexDivide(ONE, z);
}

export function complexSinh(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const cosh = _cosh(z.re);
    const sinh = _sinh(z.re);
    return withMaxMag({
        re: sinh * Math.cos(z.im),
        im: cosh * Math.sin(z.im)
    }, a, cosh, sinh);
}

export function complexCosh(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const cosh = _cosh(z.re);
    const sinh = _sinh(z.re);
    return withMaxMag({
        re: cosh * Math.cos(z.im),
        im: sinh * Math.sin(z.im)
    }, a, cosh, sinh);
}

export function complexTanh(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const sinhZ = complexSinh(z);
    const coshZ = complexCosh(z);
    return withMaxMag(complexDivide(sinhZ, coshZ), a, sinhZ, coshZ);
}

export function complexPowerFractional(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    const n = state.fractionalPowerN !== undefined ? state.fractionalPowerN : DEFAULT_FRACTIONAL_POWER;
    if (z.re === 0 && z.im === 0) return { re: 0, im: 0 };
    const lnZ = complexLn(z);
    return withMaxMag(complexExp(n * lnZ.re, n * lnZ.im), a, lnZ);
}

function normalizePowerArgs(baseRe, baseIm, expRe, expIm) {
    if (isObject(baseRe)) {
        const base = toComplex(baseRe);
        const exp = isObject(baseIm) && expRe === undefined
            ? toComplex(baseIm)
            : complex(baseIm ?? 0, expRe ?? 0);
        return { base, exp, baseInput: baseRe };
    }

    const base = complex(baseRe ?? 0, baseIm ?? 0);
    const exp = isObject(expRe) && expIm === undefined
        ? toComplex(expRe)
        : complex(expRe ?? 0, expIm ?? 0);

    return { base, exp, baseInput: base };
}

export function complexPow(base_re, base_im, exp_re, exp_im) {
    const { base, exp, baseInput } = normalizePowerArgs(base_re, base_im, exp_re, exp_im);

    if (base.re === 0 && base.im === 0) {
        if (exp.re > 0 || (exp.re === 0 && exp.im !== 0)) return { re: 0, im: 0 };
        if (exp.re === 0 && exp.im === 0) return { re: 1, im: 0 };
    }

    const lnZ = complexLn(base);
    const exponent = complexMul(exp, lnZ);
    return withMaxMag(complexExp(exponent), baseInput, lnZ, exponent);
}

export function C(re, im) {
    const input = isObject(re) ? re : null;
    const value = input ? toComplex(input) : complex(re ?? 0, im ?? 0);
    const obj = {
        re: value.re,
        im: value.im,
        _maxMag: input?._maxMag ?? Math.hypot(value.re, value.im),
        get real() { return this.re; },
        get imag() { return this.im; },
        add(other) {
            const result = complexAdd(this, other);
            return withMaxMag(C(result), this, other);
        },
        subtract(other) {
            const result = complexSub(this, other);
            return withMaxMag(C(result), this, other);
        },
        multiply(other) {
            const result = complexMul(this, other);
            return withMaxMag(C(result), this, other);
        },
        divide(other) {
            const o = toComplex(other);
            const magSq = o.re * o.re + o.im * o.im;
            if (magSq < COMPLEX_ZERO_MAG_SQ) return C(NaN, NaN);
            const result = complexDivide(this, o);
            return withMaxMag(C(result), this, other);
        },
        abs() {
            return Math.hypot(this.re, this.im);
        },
        arg() {
            return Math.atan2(this.im, this.re);
        },
        clone() {
            const result = C(this.re, this.im);
            result._maxMag = this._maxMag;
            return result;
        },
        equals(other, tolerance) {
            const tol = tolerance ?? 1e-12;
            const o = toComplex(other);
            return Math.abs(this.re - o.re) < tol && Math.abs(this.im - o.im) < tol;
        },
        isFinite() {
            return finite(this.re) && finite(this.im);
        },
        conjugate() {
            const result = C(this.re, -this.im);
            result._maxMag = this._maxMag;
            return result;
        },
        negate() {
            const result = C(-this.re, -this.im);
            result._maxMag = this._maxMag;
            return result;
        }
    };
    return obj;
}

C.power = function(base, exp) {
    const result = complexPow(base, exp);
    return C(result.re, result.im);
};

export const Complex = C;

const LANCZOS_G = 7;
const LANCZOS_P = Object.freeze([
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
]);

const zetaLogIntegerCache = [0, 0];
const zetaEvalCache = new Map();
const ZETA_EVAL_CACHE_MAX = 180000;

export function ensureZetaLogIntegerCache(maxN) {
    if (!finite(maxN) || maxN < 1) return;
    const target = Math.floor(maxN);
    for (let n = zetaLogIntegerCache.length; n <= target; n++) {
        zetaLogIntegerCache[n] = Math.log(n);
    }
}

export function complexPositiveRealPowFromLog(logBase, expRe, expIm) {
    const magnitude = expSafe(expRe * logBase);
    const angle = expIm * logBase;
    return { re: magnitude * Math.cos(angle), im: magnitude * Math.sin(angle) };
}

export function getZetaEvalCacheKey(a, b, continuationEnabled) {
    return `${continuationEnabled ? 1 : 0}:${Math.round(a * 1e7)}:${Math.round(b * 1e7)}`;
}

export function readZetaEvalCache(cacheKey) {
    const cached = zetaEvalCache.get(cacheKey);
    return cached ? cloneComplex(cached) : null;
}

export function writeZetaEvalCache(cacheKey, value) {
    if (!cacheKey || !value) return;
    if (zetaEvalCache.size >= ZETA_EVAL_CACHE_MAX) zetaEvalCache.clear();
    zetaEvalCache.set(cacheKey, cloneComplex(value));
}

function zetaInteractionThrottled() {
    return !!(
        state.panStateZ?.isPanning ||
        state.panStateW?.isPanning ||
        state.particleAnimationEnabled
    );
}

function dynamicWorkload(base, floor, ratio) {
    return zetaInteractionThrottled() ? Math.max(floor, Math.floor(base * ratio)) : base;
}

export function getDynamicZetaDirectTerms() {
    return dynamicWorkload(NUM_ZETA_TERMS_DIRECT_SUM, 40, 0.65);
}

export function getDynamicZetaHasseLevels() {
    return dynamicWorkload(NUM_ZETA_HASSE_LEVELS, 14, 0.62);
}

export function complexGamma(re, im) {
    const z = toComplex(re, im);

    if (z.re < 0.5) {
        const reflected = complexGamma(1 - z.re, -z.im);
        const sinPiZ = complexSin(PI * z.re, PI * z.im);
        return complexDivide({ re: PI, im: 0 }, complexMul(sinPiZ, reflected));
    }

    const zMinusOne = { re: z.re - 1, im: z.im };
    let lanczos = { re: LANCZOS_P[0], im: 0 };

    for (let k = 1; k < LANCZOS_P.length; k++) {
        lanczos = complexAdd(
            lanczos,
            complexDivide({ re: LANCZOS_P[k], im: 0 }, { re: zMinusOne.re + k, im: zMinusOne.im })
        );
    }

    const t = { re: z.re + LANCZOS_G - 0.5, im: z.im };
    const exponent = { re: z.re - 0.5, im: z.im };
    const powered = complexPow(t, exponent);
    const decayed = complexExp(-t.re, -t.im);

    return complexScalarMul(
        SQRT_TWO_PI,
        complexMul(complexMul(powered, decayed), lanczos)
    );
}

export function complexRiemannZeta_DirectSum(a, b, numTerms) {
    if (a <= 1.0) return { re: NaN, im: NaN };

    ensureZetaLogIntegerCache(numTerms);
    let sum = { re: 0, im: 0 };

    for (let n = 1; n <= numTerms; n++) {
        addInto(sum, complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b));
    }

    return sum;
}

export function complexRiemannZeta_EtaSeries(a, b, numTerms) {
    if (a === 1 && b === 0) return { re: Infinity, im: NaN };

    ensureZetaLogIntegerCache(numTerms);
    let eta = { re: 0, im: 0 };

    for (let n = 1; n <= numTerms; n++) {
        const sign = n % 2 === 0 ? -1 : 1;
        addInto(eta, complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b), sign);
    }

    const denominator = complexSub(ONE, complexPositiveRealPowFromLog(LN_2, 1 - a, -b));

    if (Math.abs(denominator.re) < 1e-14 && Math.abs(denominator.im) < 1e-14) {
        const etaMagSq = eta.re * eta.re + eta.im * eta.im;
        if (Math.abs(eta.re) < 1e-10 && Math.abs(eta.im) < 1e-10) return { re: NaN, im: NaN };
        if (etaMagSq < 1e-20) return { re: 0, im: 0 };

        const scale = (POLE_MAGNITUDE_THRESHOLD * 1.5) / Math.sqrt(etaMagSq);
        return { re: eta.re * scale, im: eta.im * scale };
    }

    return complexDivide(eta, denominator);
}

const zetaHasseBinomialRowsCache = {};

export function getZetaHasseBinomialRows(maxLevel) {
    if (zetaHasseBinomialRowsCache[maxLevel]) return zetaHasseBinomialRowsCache[maxLevel];

    const rows = Array.from({ length: maxLevel }, (_, n) => {
        const row = new Array(n + 1);
        row[0] = 1;
        for (let k = 1; k <= n; k++) row[k] = row[k - 1] * (n - k + 1) / k;
        return row;
    });

    zetaHasseBinomialRowsCache[maxLevel] = rows;
    return rows;
}

export function complexRiemannZeta_HasseSeries(a, b, numLevels) {
    if (a === 1 && b === 0) return { re: Infinity, im: NaN };

    const denominator = complexSub(ONE, complexPositiveRealPowFromLog(LN_2, 1 - a, -b));
    if (Math.abs(denominator.re) < 1e-14 && Math.abs(denominator.im) < 1e-14) {
        return complexRiemannZeta_EtaSeries(a, b, NUM_ZETA_TERMS_ETA_SERIES);
    }

    const rows = getZetaHasseBinomialRows(numLevels);
    ensureZetaLogIntegerCache(numLevels + 1);

    const negPowers = Array.from({ length: numLevels + 1 }, (_, n) =>
        n === 0 ? null : complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b)
    );

    let outerSum = { re: 0, im: 0 };
    let maxTermMag = 0;

    for (let n = 0; n < numLevels; n++) {
        const row = rows[n];
        const inner = { re: 0, im: 0 };

        for (let k = 0; k <= n; k++) {
            const coeff = (k % 2 === 0 ? 1 : -1) * row[k];
            const term = negPowers[k + 1];
            addInto(inner, term, coeff);
            maxTermMag = Math.max(maxTermMag, Math.abs(coeff) * Math.hypot(term.re, term.im));
        }

        addInto(outerSum, inner, Math.pow(2, -n - 1));
    }

    return withMaxMag(complexDivide(outerSum, denominator), maxTermMag, denominator);
}

export function complexRiemannZeta(a, b) {
    const s = isObject(a) ? toComplex(a) : complex(a, b);
    const continuationEnabled = !!state.zetaContinuationEnabled;
    const cacheKey = getZetaEvalCacheKey(s.re, s.im, continuationEnabled);
    const cached = readZetaEvalCache(cacheKey);
    if (cached) return cached;

    let result;

    if (!continuationEnabled) {
        result = s.re > ZETA_REFLECTION_POINT_RE
            ? complexRiemannZeta_DirectSum(s.re, s.im, getDynamicZetaDirectTerms())
            : { re: NaN, im: NaN };
        writeZetaEvalCache(cacheKey, result);
        return result;
    }

    if (s.re === 1 && s.im === 0) result = { re: Infinity, im: NaN };
    else if (s.re === 0 && s.im === 0) result = { re: -0.5, im: 0 };
    else if (s.im === 0 && s.re < 0 && s.re % 2 === 0) result = { re: 0, im: 0 };
    else result = complexRiemannZeta_HasseSeries(s.re, s.im, getDynamicZetaHasseLevels());

    writeZetaEvalCache(cacheKey, result);
    return result;
}

export function complexMobius(z_re, z_im) {
    const z = toComplex(z_re, z_im);
    const numerator = complexAdd(complexMul(state.mobiusA, z), state.mobiusB);
    const denominator = complexAdd(complexMul(state.mobiusC, z), state.mobiusD);
    return complexDivide(numerator, denominator);
}

export function complexPolynomial(z_re, z_im) {
    const z = toComplex(z_re, z_im);
    const degree = Math.max(0, Math.floor(finite(state.polynomialN) ? state.polynomialN : 0));
    let acc = zeroLike();

    for (let k = degree; k >= 0; k--) {
        acc = complexAdd(complexMul(acc, z), state.polynomialCoeffs?.[k] ?? ZERO);
    }

    return acc;
}

export function complexPoincareCustomMetric(a, b) {
    const z = normalizeUnaryComplexArgs(a, b);
    if (z.im <= 1e-9) return { re: NaN, im: NaN };
    const sqrtIm = Math.sqrt(z.im);
    return { re: z.re / sqrtIm, im: sqrtIm };
}

function algebraicParameter(context, fallback) {
    return toComplex(context?.c ?? fallback);
}

export function numericDerivative(funcName, z, h = 1e-7) {
    const func = getChainedTransformFunction(funcName);
    if (!func) return { re: NaN, im: NaN };

    const point = toComplex(z);
    const step = finite(h) ? h : 1e-7;

    if (
        funcName === 'zeta' &&
        !state.zetaContinuationEnabled &&
        (
            point.re <= ZETA_REFLECTION_POINT_RE ||
            point.re + step <= ZETA_REFLECTION_POINT_RE ||
            point.re - step <= ZETA_REFLECTION_POINT_RE
        )
    ) {
        return { re: NaN, im: NaN };
    }

    const plus = func(point.re + step, point.im);
    const minus = func(point.re - step, point.im);

    if (invalidComplex(plus) || invalidComplex(minus)) return { re: NaN, im: NaN };
    return complexDivide(complexSub(plus, minus), { re: 2 * step, im: 0 });
}

export function evaluateFunctionBlock(block, z_re, z_im, context = null) {
    if (!block || block.func === 'none') {
        return isObject(z_re) ? z_re : { re: z_re, im: z_im };
    }

    let arg = toComplex(z_re, z_im);

    if (block.chainedFunc && block.chainedFunc !== 'none') {
        if (block.chainedFunc === 'c') {
            arg = algebraicParameter(context, arg);
        } else {
            const chained = transformFunctions[block.chainedFunc];
            if (chained) arg = chained(arg);
        }
    }

    let value;
    if (block.func === 'c') {
        value = algebraicParameter(context, arg);
    } else {
        const base = transformFunctions[block.func];
        if (!base) return arg;
        value = base(arg);
    }

    if (block.power !== undefined && block.power !== 1) value = complexPow(value, block.power, 0);
    if (block.reciprocal) value = complexReciprocal(value);
    if (block.log) value = complexLn(value);
    if (block.exp) value = complexExp(value);

    return value;
}

export function evaluateAlgebraicTerm(term, z_re, z_im, context = null) {
    if (!term) return { re: NaN, im: NaN };

    let value = toComplex(term.coeff ?? ONE);
    const z = toComplex(z_re, z_im);
    const evalContext = context || { c: z };

    for (const factor of term.factors ?? []) {
        if (!factor || factor.func === 'none') break;
        value = complexMul(value, evaluateFunctionBlock(factor, z, undefined, evalContext));
    }

    return value;
}

export function evaluateAlgebraicChaining(z_re, z_im, context = null) {
    const terms = state.algebraicChainingTerms;
    if (!state.algebraicChainingEnabled || !Array.isArray(terms) || terms.length === 0) {
        return { re: 0, im: 0 };
    }

    const z = toComplex(z_re, z_im);
    const evalContext = context || { c: z };
    let sum = { re: 0, im: 0 };

    for (const term of terms) {
        const value = evaluateAlgebraicTerm(term, z, undefined, evalContext);
        if (invalidComplex(value)) return { re: NaN, im: NaN };
        sum = complexAdd(sum, value);
    }

    return sum;
}

export const transformFunctions = {
    cos: complexCos,
    sin: complexSin,
    tan: complexTan,
    sec: complexSec,
    exp: complexExp,
    ln: complexLn,
    reciprocal: complexReciprocal,
    sinh: complexSinh,
    cosh: complexCosh,
    tanh: complexTanh,
    power: complexPowerFractional,
    mobius: complexMobius,
    zeta: complexRiemannZeta,
    polynomial: complexPolynomial,
    poincare: complexPoincareCustomMetric,
    algebraic_chaining: evaluateAlgebraicChaining
};

const MAPPED_TRANSFORM_ABS_EPSILON = 1e-5;
const MAPPED_TRANSFORM_REL_EPSILON = 1e-7;
const MAPPED_TRANSFORM_MIN_AGREEMENT_RATIO = 0.9;
const MAPPED_TRANSFORM_MIN_CONSTANT_SAMPLES = 9;
const DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE = 1e18;
const MAPPED_TRANSFORM_DIAGNOSTIC_STENCIL = Object.freeze([
    Object.freeze({ re: 0, im: 0 }),
    Object.freeze({ re: 1, im: 0 }),
    Object.freeze({ re: -1, im: 0.75 }),
    Object.freeze({ re: 0.5, im: -1 }),
    Object.freeze({ re: 2.25, im: 0.25 }),
    Object.freeze({ re: -2, im: -0.5 }),
    Object.freeze({ re: 1.75, im: 1.25 }),
    Object.freeze({ re: -1.5, im: -1.25 }),
    Object.freeze({ re: 0.25, im: 2 }),
    Object.freeze({ re: -0.75, im: -2 }),
    Object.freeze({ re: 2, im: -1.75 }),
    Object.freeze({ re: -2.25, im: 1.5 }),
    Object.freeze({ re: 0.33, im: -2.5 }),
    Object.freeze({ re: 2.75, im: 2.25 }),
    Object.freeze({ re: -2.5, im: -2.25 })
]);

let mappedTransformProfileCacheKey = null;
let mappedTransformProfileCacheValue = null;

export function mappedTransformNumberKey(value) {
    return finite(value) ? value.toFixed(12) : `${value}`;
}

export function mappedTransformComplexKey(value) {
    if (!value) return 'none';
    return `${mappedTransformNumberKey(realOf(value))},${mappedTransformNumberKey(imagOf(value))}`;
}

function boundedPolynomialDegree() {
    return Math.max(0, Math.min(MAX_POLY_DEGREE, finite(state.polynomialN) ? state.polynomialN : 0));
}

function appendPolynomialProfileParts(parts, prefix = 'p') {
    const degree = boundedPolynomialDegree();
    parts.push(`n:${degree}`);
    for (let i = 0; i <= degree; i++) {
        parts.push(`${prefix}${i}:${mappedTransformComplexKey(state.polynomialCoeffs?.[i])}`);
    }
}

function serializeAlgebraicTerms(terms) {
    if (!Array.isArray(terms)) return '[]';

    return terms.map((term, termIndex) => {
        const coeff = mappedTransformComplexKey(term?.coeff);
        const factors = (term?.factors ?? []).map((factor, factorIndex) => [
            termIndex,
            factorIndex,
            factor?.func ?? 'none',
            factor?.chainedFunc ?? 'none',
            mappedTransformNumberKey(factor?.power ?? 1),
            factor?.reciprocal ? 1 : 0,
            factor?.log ? 1 : 0,
            factor?.exp ? 1 : 0
        ].join(':')).join(';');

        return `${termIndex}|${coeff}|${factors}`;
    }).join('||');
}

export function buildMappedTransformProfileKey(functionKey) {
    const parts = [
        `f:${functionKey}`,
        `zetaC:${state.zetaContinuationEnabled ? 1 : 0}`,
        `frac:${mappedTransformNumberKey(state.fractionalPowerN !== undefined ? state.fractionalPowerN : DEFAULT_FRACTIONAL_POWER)}`
    ];

    if (functionKey === 'mobius') {
        parts.push(
            `a:${mappedTransformComplexKey(state.mobiusA)}`,
            `b:${mappedTransformComplexKey(state.mobiusB)}`,
            `c:${mappedTransformComplexKey(state.mobiusC)}`,
            `d:${mappedTransformComplexKey(state.mobiusD)}`
        );
    } else if (functionKey === 'polynomial') {
        appendPolynomialProfileParts(parts);
    } else if (functionKey === 'algebraic_chaining') {
        parts.push(`alg:${serializeAlgebraicTerms(state.algebraicChainingTerms)}`);
    }

    return parts.join('|');
}

export function cloneMappedComplex(value) {
    return value ? { re: value.re, im: value.im } : null;
}

export function isValidMappedTransformValue(value) {
    return !!(
        value &&
        typeof value.re === 'number' &&
        typeof value.im === 'number' &&
        finite(value.re) &&
        finite(value.im) &&
        isNumericallyStable(value)
    );
}

export function shouldSkipMappedTransformPoint(functionKey, zPoint) {
    return functionKey === 'zeta' &&
        !state.zetaContinuationEnabled &&
        zPoint &&
        zPoint.re <= ZETA_REFLECTION_POINT_RE;
}

export function evaluateRawMappedTransform(transformFunc, zPoint, functionKey = state.currentFunction, evalContext = null) {
    if (!transformFunc || !zPoint || zPoint.re === undefined || zPoint.im === undefined) return null;
    if (shouldSkipMappedTransformPoint(functionKey, zPoint)) return null;

    const mapped = transformFunc(zPoint.re, zPoint.im, evalContext);
    return isValidMappedTransformValue(mapped) ? mapped : null;
}

export function getMappedTransformTolerance(value) {
    return MAPPED_TRANSFORM_ABS_EPSILON +
        MAPPED_TRANSFORM_REL_EPSILON * Math.max(1, Math.hypot(value.re, value.im));
}

export function getMappedConstantCluster(samples, minSamples = MAPPED_TRANSFORM_MIN_CONSTANT_SAMPLES) {
    if (!samples || samples.length < minSamples) return null;

    let bestValue = null;
    let bestCount = 0;

    for (const candidate of samples) {
        const eps = getMappedTransformTolerance(candidate);
        const epsSq = eps * eps;
        let count = 0;
        let sumRe = 0;
        let sumIm = 0;

        for (const sample of samples) {
            const dRe = sample.re - candidate.re;
            const dIm = sample.im - candidate.im;

            if (dRe * dRe + dIm * dIm <= epsSq) {
                count++;
                sumRe += sample.re;
                sumIm += sample.im;
            }
        }

        if (count > bestCount) {
            bestCount = count;
            bestValue = { re: sumRe / count, im: sumIm / count };
        }
    }

    const agreement = samples.length ? bestCount / samples.length : 0;
    return bestValue && agreement >= MAPPED_TRANSFORM_MIN_AGREEMENT_RATIO
        ? { value: bestValue, agreement, validCount: samples.length }
        : null;
}

export function detectMappedConstantTransform(transformFunc, functionKey = state.currentFunction) {
    const samples = [];

    for (const point of MAPPED_TRANSFORM_DIAGNOSTIC_STENCIL) {
        const mapped = evaluateRawMappedTransform(transformFunc, point, functionKey);
        if (mapped) samples.push(mapped);
    }

    return getMappedConstantCluster(samples);
}

export function getMappedTransformProfile(functionKey = state.currentFunction, transformFunc = null) {
    const resolvedTransform = transformFunc || transformFunctions[functionKey];

    if (typeof resolvedTransform !== 'function') {
        return { functionKey, transformFunc: null, isConstant: false, constantValue: null };
    }

    const cacheable = resolvedTransform === transformFunctions[functionKey];
    if (cacheable) {
        if (cachesDirty) {
            mappedProfileCache.clear();
            chainedFuncCache.clear();
            cachesDirty = false;
        }
        const cached = mappedProfileCache.get(functionKey);
        if (cached) {
            return cached;
        }
    }

    const constant = detectMappedConstantTransform(resolvedTransform, functionKey);
    const profile = {
        functionKey,
        transformFunc: resolvedTransform,
        isConstant: !!constant,
        constantValue: constant ? constant.value : null,
        constantAgreement: constant ? constant.agreement : 0,
        constantSampleCount: constant ? constant.validCount : 0
    };

    if (cacheable) {
        mappedProfileCache.set(functionKey, profile);
    }

    return profile;
}

export function evaluateMappedTransform(profileOrTransform, re, im, functionKey = state.currentFunction, evalContext = null) {
    if (!profileOrTransform) return null;

    if (typeof profileOrTransform === 'function') {
        return evaluateRawMappedTransform(profileOrTransform, { re, im }, functionKey, evalContext);
    }

    if (!evalContext && profileOrTransform.isConstant && profileOrTransform.constantValue) {
        return cloneMappedComplex(profileOrTransform.constantValue);
    }

    return evaluateRawMappedTransform(
        profileOrTransform.transformFunc,
        { re, im },
        profileOrTransform.functionKey || functionKey,
        evalContext
    );
}

function exceedsDomainColorChainBailout(value) {
    return Math.max(Math.abs(value?.re ?? 0), Math.abs(value?.im ?? 0)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE;
}

export function evaluateDomainColoringMappedTransform(profileOrTransform, re, im, functionKey = state.currentFunction) {
    const c = { re, im };

    if (!state.chainingEnabled || state.chainCount <= 1) {
        return evaluateMappedTransform(profileOrTransform, re, im, functionKey, { c });
    }

    const count = Math.max(1, Math.floor(Number(state.chainCount) || 1));

    if (state.chainingMode === 'zero_seed') {
        let current = { re: 0, im: 0 };

        for (let i = 0; i < count; i += 1) {
            const next = evaluateMappedTransform(profileOrTransform, current.re, current.im, functionKey, { c });
            if (!next || !isValidMappedTransformValue(next)) return null;

            current = next;

            if (exceedsDomainColorChainBailout(current)) return null;
        }

        return current;
    }

    let current = evaluateMappedTransform(profileOrTransform, re, im, functionKey, { c });
    if (!current) return null;

    let lastFinite = isValidMappedTransformValue(current) ? current : null;
    if (!lastFinite || exceedsDomainColorChainBailout(lastFinite)) return lastFinite;
    const baseValue = lastFinite;

    for (let i = 1; i < count; i += 1) {
        let next;

        switch (state.chainingMode) {
            case 'power':
                next = complexMul(current, baseValue);
                break;
            case 'sqrt':
                next = complexPow(current, 0.5, 0);
                break;
            case 'ln':
                next = complexLn(current);
                break;
            case 'exp':
                next = complexExp(current);
                break;
            case 'reciprocal':
                next = complexReciprocal(current);
                break;
            case 'recursion':
            default:
                next = evaluateMappedTransform(profileOrTransform, current.re, current.im, functionKey, { c });
                break;
        }

        if (!next || !isValidMappedTransformValue(next)) return lastFinite;

        current = next;
        lastFinite = current;

        if (exceedsDomainColorChainBailout(current)) return current;
    }

    return current;
}

export function getEffectiveBaseTransformFunction(funcKey = state.currentFunction) {
    let baseFunc = transformFunctions[funcKey];
    if (!baseFunc) return (re, im) => ({ re, im });

    if (state.taylorSeriesEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        baseFunc = createTaylorApproximationTransform(
            funcKey,
            state.taylorSeriesCenter,
            state.taylorSeriesOrder
        );
    }

    if (typeof activeTransformProvider === 'function') {
        const provided = activeTransformProvider({ funcKey, baseFunc, state });
        if (typeof provided === 'function') {
            baseFunc = provided;
        }
    }

    return baseFunc;
}

export function setActiveTransformProvider(provider) {
    activeTransformProvider = typeof provider === 'function' ? provider : null;
}

const CHAIN_TRANSFORMS = {
    power: (previous, context) => (re, im) =>
        complexMul(previous(re, im), context.evalBaseAtInput(re, im)),
    sqrt: previous => (re, im) =>
        complexPow(previous(re, im), 0.5, 0),
    ln: previous => (re, im) =>
        complexLn(previous(re, im)),
    exp: previous => (re, im) =>
        complexExp(previous(re, im)),
    reciprocal: previous => (re, im) =>
        complexReciprocal(previous(re, im)),
    recursion: (previous, context) => (re, im) =>
        context.evalBase(previous(re, im), { re, im })
};

function createChainedTransformForStage(funcKey, stageIndex, baseFunc) {
    const baseProfile = getMappedTransformProfile(funcKey, baseFunc);
    const context = {
        evalBase: (value, c) => invalidComplex(value)
            ? { re: NaN, im: NaN }
            : evaluateMappedTransform(baseProfile, value.re, value.im, funcKey, { c }) || { re: NaN, im: NaN },
        evalBaseAtInput: (re, im) => evaluateMappedTransform(baseProfile, re, im, funcKey, { c: { re, im } }) || { re: NaN, im: NaN }
    };
    const stage = Math.max(0, Math.floor(Number(stageIndex) || 0));

    if (state.chainingMode === 'zero_seed') {
        return (re, im) => {
            const c = { re, im };
            let current = { re: 0, im: 0 };

            for (let i = 0; i <= stage; i++) {
                current = context.evalBase(current, c);
                if (invalidComplex(current)) return { re: NaN, im: NaN };
            }

            return current;
        };
    }

    const mode = CHAIN_TRANSFORMS[state.chainingMode] ? state.chainingMode : 'recursion';
    let current = baseFunc;

    for (let i = 0; i < stage; i++) {
        current = CHAIN_TRANSFORMS[mode](current, context);
    }

    return current;
}

export function getChainedStageTransformFunction(funcKey = state.currentFunction, stageIndex = 0) {
    const baseFunc = getEffectiveBaseTransformFunction(funcKey);

    if (!state.chainingEnabled) {
        return baseFunc;
    }

    return createChainedTransformForStage(funcKey, stageIndex, baseFunc);
}

export function getChainedTransformFunction(funcKey = state.currentFunction) {
    if (cachesDirty) {
        mappedProfileCache.clear();
        chainedFuncCache.clear();
        cachesDirty = false;
    }

    const cached = chainedFuncCache.get(funcKey);
    if (cached) {
        return cached;
    }

    const baseFunc = getEffectiveBaseTransformFunction(funcKey);

    let resultFunc;
    if (!state.chainingEnabled || (state.chainCount <= 1 && state.chainingMode !== 'zero_seed')) {
        resultFunc = baseFunc;
    } else {
        const stageIndex = Math.max(0, Math.floor(Number(state.chainCount) || 1) - 1);
        resultFunc = createChainedTransformForStage(funcKey, stageIndex, baseFunc);
    }

    chainedFuncCache.set(funcKey, resultFunc);
    return resultFunc;
}

const CONTOUR_GENERATORS = {
    circle: {
        valid: ({ r }) => r > 0,
        point: ({ cx, cy, r }, t) => ({ re: cx + r * Math.cos(t), im: cy + r * Math.sin(t) }),
        inside: (point, { cx, cy, r }, toleranceFactor) => {
            if (r <= 0) return false;
            const dx = point.re - cx;
            const dy = point.im - cy;
            return dx * dx + dy * dy < r * r * toleranceFactor;
        }
    },
    ellipse: {
        valid: ({ a, b }) => a > 0 && b > 0,
        point: ({ cx, cy, a, b }, t) => ({ re: cx + a * Math.cos(t), im: cy + b * Math.sin(t) }),
        inside: (point, { cx, cy, a, b }, toleranceFactor) => {
            if (a <= 0 || b <= 0) return false;
            const x = (point.re - cx) / a;
            const y = (point.im - cy) / b;
            return x * x + y * y < toleranceFactor;
        }
    }
};

export function getContourPoints(shapeType, params, numSteps) {
    const shape = CONTOUR_GENERATORS[shapeType];
    const steps = Math.floor(numSteps);

    if (!shape || !params || !shape.valid(params) || !finite(steps) || steps < 1) return [];

    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = (i / steps) * TWO_PI;
        return shape.point(params, t);
    });
}

export function numericalLineIntegral(transformFunc, contourPoints) {
    const total = { re: 0, im: 0 };
    if (!contourPoints || contourPoints.length < 2) return total;

    for (let i = 0; i < contourPoints.length - 1; i++) {
        const z0 = contourPoints[i];
        const z1 = contourPoints[i + 1];
        const dz = complexSub(z1, z0);
        const mid = { re: (z0.re + z1.re) / 2, im: (z0.im + z1.im) / 2 };
        const value = transformFunc(mid.re, mid.im);

        if (invalidComplex(value)) return { re: NaN, im: NaN };
        addInto(total, complexMul(value, dz));
    }

    return total;
}

export function isPointInsideContour(point, contourType, params) {
    const shape = CONTOUR_GENERATORS[contourType];
    return !!shape && !!params && shape.inside(toComplex(point), params, 1 - 1e-9);
}

export function estimateResidue(transformFunc, pole, epsilonRadius, numSteps) {
    const center = toComplex(pole);
    const radius = Math.max(epsilonRadius, 1e-6);
    const points = getContourPoints('circle', { cx: center.re, cy: center.im, r: radius }, numSteps);

    if (!points.length) return { re: NaN, im: NaN };

    const integral = numericalLineIntegral(transformFunc, points);
    if (invalidComplex(integral)) return { re: NaN, im: NaN };

    return complexDivide(integral, { re: 0, im: TWO_PI });
}

export function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;

    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

export function isFiniteComplex(c) {
    return !!c && finite(c.re) && finite(c.im);
}

export function getTaylorDerivativeStep(zComplex, order, hBase = 1e-4) {
    const z = toComplex(zComplex);
    const scale = Math.max(1, Math.abs(z.re), Math.abs(z.im));
    const multiplier = ({ 1: 1, 2: 2, 3: 8, 4: 24 })[order] || Math.max(24, order * order * 2);
    return hBase * multiplier * scale;
}

const DERIVATIVE_STENCILS = Object.freeze({
    1: Object.freeze({ denominator: h => 2 * h, offsets: Object.freeze([-1, 1]), weights: Object.freeze([-1, 1]) }),
    2: Object.freeze({ denominator: h => h * h, offsets: Object.freeze([-1, 0, 1]), weights: Object.freeze([1, -2, 1]) }),
    3: Object.freeze({ denominator: h => 2 * h * h * h, offsets: Object.freeze([-2, -1, 1, 2]), weights: Object.freeze([-1, 2, -2, 1]) }),
    4: Object.freeze({ denominator: h => h * h * h * h, offsets: Object.freeze([-2, -1, 0, 1, 2]), weights: Object.freeze([1, -4, 6, -4, 1]) })
});

function applyDerivativeStencil(funcWrapper, zComplex, h, stencil) {
    const z = toComplex(zComplex);
    const sum = { re: 0, im: 0 };

    for (let i = 0; i < stencil.offsets.length; i++) {
        const value = funcWrapper({ re: z.re + stencil.offsets[i] * h, im: z.im });
        if (!isFiniteComplex(value)) return { re: NaN, im: NaN };
        addInto(sum, value, stencil.weights[i]);
    }

    return complexDivide(sum, { re: stencil.denominator(h), im: 0 });
}

export function numericDerivativeNthOrder(funcWrapper, zComplex, order, h_base = 1e-5) {
    if (order < 1) return funcWrapper(zComplex);

    const z = toComplex(zComplex);
    const h = getTaylorDerivativeStep(z, order, h_base);
    const stencil = DERIVATIVE_STENCILS[order];

    if (stencil) return applyDerivativeStencil(funcWrapper, z, h, stencil);

    console.warn(`numericDerivativeNthOrder not implemented for order ${order} using general recursive method (less accurate).`);
    const plus = numericDerivativeNthOrder(funcWrapper, { re: z.re + h, im: z.im }, order - 1, h);
    const minus = numericDerivativeNthOrder(funcWrapper, { re: z.re - h, im: z.im }, order - 1, h);

    if (!isFiniteComplex(plus) || !isFiniteComplex(minus)) return { re: NaN, im: NaN };
    return complexDivide(complexSub(plus, minus), { re: 2 * h, im: 0 });
}

const taylorSeriesCoefficientCache = {
    key: null,
    coefficients: null
};

export function toTaylorCacheNumber(value) {
    return finite(value) ? value.toFixed(9) : `${value}`;
}

export function appendTaylorCacheComplexParts(parts, prefix, value) {
    const safeValue = value || DEFAULT_TAYLOR_SERIES_CENTER;
    parts.push(`${prefix}r:${toTaylorCacheNumber(realOf(safeValue))}`);
    parts.push(`${prefix}i:${toTaylorCacheNumber(imagOf(safeValue))}`);
}

function appendTaylorPolynomialParts(parts, prefix) {
    const degree = boundedPolynomialDegree();
    parts.push(`${prefix}polyN:${degree}`);
    for (let i = 0; i <= degree; i++) {
        appendTaylorCacheComplexParts(parts, `${prefix}p${i}`, state.polynomialCoeffs?.[i] ?? null);
    }
}

function appendTaylorMobiusParts(parts, prefix) {
    appendTaylorCacheComplexParts(parts, `${prefix}mA`, state.mobiusA);
    appendTaylorCacheComplexParts(parts, `${prefix}mB`, state.mobiusB);
    appendTaylorCacheComplexParts(parts, `${prefix}mC`, state.mobiusC);
    appendTaylorCacheComplexParts(parts, `${prefix}mD`, state.mobiusD);
}

export function buildTaylorSeriesCoefficientCacheKey(functionKey, z0Complex, order) {
    const z0 = toComplex(z0Complex);
    const parts = [
        `f:${functionKey}`,
        `order:${order}`,
        `z0r:${toTaylorCacheNumber(z0.re)}`,
        `z0i:${toTaylorCacheNumber(z0.im)}`
    ];

    if (functionKey === 'zeta') {
        parts.push(`zetaC:${state.zetaContinuationEnabled ? 1 : 0}`);
    } else if (functionKey === 'mobius') {
        appendTaylorMobiusParts(parts, '');
    } else if (functionKey === 'polynomial') {
        appendTaylorPolynomialParts(parts, '');
    } else if (functionKey === 'algebraic_chaining') {
        const terms = state.algebraicChainingTerms ?? [];
        parts.push(`algTerms:${terms.length}`);

        terms.forEach((term, termIndex) => {
            parts.push(`t${termIndex}:${(term.factors ?? []).map(factor => factor.func).join(',')}`);
            appendTaylorCacheComplexParts(parts, `t${termIndex}c`, term.coeff);

            (term.factors ?? []).forEach((factor, factorIndex) => {
                if (factor.func === 'none') return;

                const prefix = `t${termIndex}f${factorIndex}`;
                parts.push(`${prefix}chain:${factor.chainedFunc}`);
                parts.push(`${prefix}pow:${toTaylorCacheNumber(factor.power)}`);
                parts.push(`${prefix}recip:${factor.reciprocal ? 1 : 0}`);
                parts.push(`${prefix}log:${factor.log ? 1 : 0}`);
                parts.push(`${prefix}exp:${factor.exp ? 1 : 0}`);

                if (factor.func === 'mobius' || factor.chainedFunc === 'mobius') appendTaylorMobiusParts(parts, prefix);
                if (factor.func === 'polynomial' || factor.chainedFunc === 'polynomial') appendTaylorPolynomialParts(parts, prefix);
                if (factor.func === 'power' || factor.chainedFunc === 'power') {
                    parts.push(`${prefix}fracN:${toTaylorCacheNumber(state.fractionalPowerN !== undefined ? state.fractionalPowerN : DEFAULT_FRACTIONAL_POWER)}`);
                }
            });
        });
    }

    return parts.join('|');
}

export function getTaylorContourRadius(z0Complex) {
    const convergenceRadius = state && finite(state.taylorSeriesConvergenceRadius)
        ? state.taylorSeriesConvergenceRadius
        : null;

    if (convergenceRadius !== null) {
        return convergenceRadius <= 1e-9 ? 0 : Math.max(1e-3, Math.min(1.25, convergenceRadius * 0.45));
    }

    const z0 = toComplex(z0Complex);
    const centerScale = Math.max(1, Math.abs(z0.re), Math.abs(z0.im));
    return Math.max(0.25, Math.min(1.25, centerScale * 0.35));
}

function cacheTaylorCoefficients(cacheKey, coefficients) {
    taylorSeriesCoefficientCache.key = cacheKey;
    taylorSeriesCoefficientCache.coefficients = coefficients;
    return coefficients;
}

function computeCauchyCoefficients(originalTransformFunc, z0Complex, contourPoints, order) {
    const integrals = Array.from({ length: order + 1 }, zeroLike);

    for (let i = 0; i < contourPoints.length - 1; i++) {
        const a = contourPoints[i];
        const b = contourPoints[i + 1];
        const dz = complexSub(b, a);
        const mid = { re: (a.re + b.re) / 2, im: (a.im + b.im) / 2 };
        const functionValue = originalTransformFunc(mid.re, mid.im);

        if (!isFiniteComplex(functionValue)) return null;

        const delta = { re: mid.re - z0Complex.re, im: mid.im - z0Complex.im };
        const inverseDelta = complexReciprocal(delta);

        if (!isFiniteComplex(inverseDelta)) return null;

        let inversePower = inverseDelta;

        for (let n = 0; n <= order; n++) {
            addInto(integrals[n], complexMul(complexMul(functionValue, inversePower), dz));
            inversePower = complexMul(inversePower, inverseDelta);
        }
    }

    const coefficients = integrals.map(integral => complexDivide(integral, { re: 0, im: TWO_PI }));
    return coefficients.every(isFiniteComplex) ? coefficients : null;
}

export function computeTaylorSeriesCoefficients(originalTransformFuncKey, z0Complex, order) {
    const originalTransformFunc = transformFunctions[originalTransformFuncKey];
    if (!originalTransformFunc) {
        console.error('Taylor: Original transform function not found for key:', originalTransformFuncKey);
        return null;
    }

    const z0 = toComplex(z0Complex);
    const cacheKey = buildTaylorSeriesCoefficientCacheKey(originalTransformFuncKey, z0, order);

    if (taylorSeriesCoefficientCache.key === cacheKey) {
        return taylorSeriesCoefficientCache.coefficients;
    }

    const radius = getTaylorContourRadius(z0);
    if (!(radius > 0)) return cacheTaylorCoefficients(cacheKey, null);

    const contourStepCount = Math.max(192, 48 * (order + 1));
    const contourPoints = getContourPoints('circle', { cx: z0.re, cy: z0.im, r: radius }, contourStepCount);

    if (!Array.isArray(contourPoints) || contourPoints.length < 2) {
        return cacheTaylorCoefficients(cacheKey, null);
    }

    return cacheTaylorCoefficients(
        cacheKey,
        computeCauchyCoefficients(originalTransformFunc, z0, contourPoints, order)
    );
}

export function evaluateTaylorSeries(coefficients, zInputComplex, z0Complex) {
    if (!Array.isArray(coefficients) || coefficients.length === 0) return { re: NaN, im: NaN };

    const delta = complexSub(toComplex(zInputComplex), toComplex(z0Complex));
    let sum = { re: 0, im: 0 };

    for (let n = coefficients.length - 1; n >= 0; n--) {
        const coefficient = coefficients[n];
        sum = complexAdd(complexMul(sum, delta), isFiniteComplex(coefficient) ? coefficient : ZERO);
    }

    return sum;
}

const ENTIRE_FUNCTIONS = new Set(['exp', 'sin', 'cos', 'polynomial']);

export function updateTaylorSeriesCenterAndRadius() {
    state.taylorSeriesCenter = state.taylorSeriesCustomCenterEnabled
        ? { re: state.taylorSeriesCustomCenter.re, im: state.taylorSeriesCustomCenter.im }
        : { re: DEFAULT_TAYLOR_SERIES_CENTER.re, im: DEFAULT_TAYLOR_SERIES_CENTER.im };

    let minDistanceSq = Infinity;
    let nearestPole = null;

    if (Array.isArray(state.poles)) {
        for (const pole of state.poles) {
            if (!pole || typeof pole.re !== 'number' || typeof pole.im !== 'number' || !finite(pole.re) || !finite(pole.im)) {
                continue;
            }

            const dx = pole.re - state.taylorSeriesCenter.re;
            const dy = pole.im - state.taylorSeriesCenter.im;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                nearestPole = pole;
            }
        }
    }

    if (nearestPole) {
        state.taylorSeriesConvergenceRadius = minDistanceSq < 1e-12 ? 0 : Math.sqrt(minDistanceSq);
    } else {
        state.taylorSeriesConvergenceRadius = ENTIRE_FUNCTIONS.has(state.currentFunction) ? Infinity : 1000;
    }

    if (
        state.currentFunction === 'ln' &&
        state.taylorSeriesCenter.re === 0 &&
        state.taylorSeriesCenter.im === 0
    ) {
        state.taylorSeriesConvergenceRadius = 0;
    }
}

export function isWithinTaylorConvergenceRegion(zInputComplex, z0Complex) {
    const radius = state.taylorSeriesConvergenceRadius;
    if (!finite(radius)) return true;

    const z = toComplex(zInputComplex);
    const z0 = toComplex(z0Complex);
    const dx = z.re - z0.re;
    const dy = z.im - z0.im;

    return dx * dx + dy * dy <= radius * radius * 1.000001;
}

export function createTaylorApproximationTransform(functionKey, taylorCenter, taylorOrder) {
    const z0 = { re: taylorCenter.re, im: taylorCenter.im };
    const coefficients = computeTaylorSeriesCoefficients(functionKey, z0, taylorOrder);

    return (re, im) => {
        if (!coefficients) return { re: NaN, im: NaN };

        const input = { re, im };
        if (!isWithinTaylorConvergenceRegion(input, z0)) return { re: NaN, im: NaN };

        const result = evaluateTaylorSeries(coefficients, input, z0);
        return { re: result.re, im: result.im };
    };
}
