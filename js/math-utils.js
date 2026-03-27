function getComplexParts(re, im) {
    if (typeof re === 'object' && re !== null) {
        return {
            re: re.re ?? re.real ?? 0,
            im: re.im ?? re.imag ?? 0
        };
    }

    return {
        re: re ?? 0,
        im: im ?? 0
    };
}

function toMathComplex(re, im) {
    const parts = getComplexParts(re, im);
    return math.complex(parts.re, parts.im);
}

function C(re, im) {
    const parts = getComplexParts(re, im);

    return {
        re: parts.re,
        im: parts.im,
        get real() { return this.re; },
        get imag() { return this.im; },
        add: function(other) {
            const res = math.add(toMathComplex(this), toMathComplex(other));
            return C(res.re, res.im);
        },
        subtract: function(other) {
            const res = math.subtract(toMathComplex(this), toMathComplex(other));
            return C(res.re, res.im);
        },
        multiply: function(other) {
            const res = math.multiply(toMathComplex(this), toMathComplex(other));
            return C(res.re, res.im);
        },
        divide: function(other) {
            const res = math.divide(toMathComplex(this), toMathComplex(other));
            return C(res.re, res.im);
        },
        abs: function() {
            return Math.sqrt(this.re * this.re + this.im * this.im);
        },
        arg: function() {
            return Math.atan2(this.im, this.re);
        },
        clone: function() {
            return C(this.re, this.im);
        },
        equals: function(other) {
            const normalized = getComplexParts(other);
            return Math.abs(this.re - normalized.re) < 1e-12 && Math.abs(this.im - normalized.im) < 1e-12;
        },
        isFinite: function() {
            return Number.isFinite(this.re) && Number.isFinite(this.im);
        },
        conjugate: function() {
            return C(this.re, -this.im);
        },
        negate: function() {
            return C(-this.re, -this.im);
        }
    };
}

C.power = function(base, exp) {
    const res = typeof exp === 'number'
        ? math.pow(toMathComplex(base), exp)
        : math.pow(toMathComplex(base), toMathComplex(exp));
    return C(res.re, res.im);
};

// Aliases for backward compatibility in parts of code that still use `new Complex(re, im)`
const Complex = C;

function complexAdd(z1, z2) { const res = math.add(toMathComplex(z1), toMathComplex(z2)); return { re: res.re, im: res.im }; }
function complexSub(z1, z2) { const res = math.subtract(toMathComplex(z1), toMathComplex(z2)); return { re: res.re, im: res.im }; }
function complexMul(z1, z2) { const res = math.multiply(toMathComplex(z1), toMathComplex(z2)); return { re: res.re, im: res.im }; }
function complexScalarMul(s, z) { return { re: s * z.re, im: s * z.im }; }
function complexDivide(num, den) {
    if (Math.abs(den.re * den.re + den.im * den.im) < 1e-30) {
        const num_sq_mag = num.re * num.re + num.im * num.im;
        if (Math.abs(num_sq_mag) < 1e-30) return { re: NaN, im: NaN };
        const large_val = POLE_MAGNITUDE_THRESHOLD * 2;
        if (Math.abs(num.re) < 1e-15 && Math.abs(num.im) < 1e-15) return { re: 0, im: 0 };
        const scale = large_val / Math.sqrt(num_sq_mag);
        return { re: num.re * scale, im: num.im * scale };
    }
    const res = math.divide(toMathComplex(num), toMathComplex(den));
    return { re: res.re, im: res.im };
}

function cosh(x) { return Math.cosh(x); }
function sinh(x) { return Math.sinh(x); }

function complexCos(a, b) { const res = math.cos(toMathComplex(a, b)); return { re: res.re, im: res.im }; }
function complexSin(a, b) { const res = math.sin(toMathComplex(a, b)); return { re: res.re, im: res.im }; }
function complexTan(a, b) { const res = math.tan(toMathComplex(a, b)); return { re: res.re, im: res.im }; }
function complexSec(a, b) { const res = math.sec(toMathComplex(a, b)); return { re: res.re, im: res.im }; }
function complexExp(a, b) { const res = math.exp(toMathComplex(a, b)); return { re: res.re, im: res.im }; }
function complexLn(a, b) {
    if (a === 0 && b === 0) return { re: -Infinity, im: 0 };
    const res = math.log(toMathComplex(a, b));
    return { re: res.re, im: res.im };
}
function complexReciprocal(a, b) {
    if (a === 0 && b === 0) return { re: NaN, im: NaN };
    const res = math.divide(1, toMathComplex(a, b));
    return { re: res.re, im: res.im };
}
function complexPow(base_re, base_im, exp_re, exp_im) {
    if (base_re === 0 && base_im === 0) {
        if (exp_re > 0 || (exp_re === 0 && exp_im !== 0)) return { re: 0, im: 0 };
        if (exp_re === 0 && exp_im === 0) return { re: 1, im: 0 };
    }
    const res = math.pow(toMathComplex(base_re, base_im), toMathComplex(exp_re, exp_im));
    return { re: res.re, im: res.im };
}

const LANCZOS_G = 7;
const LANCZOS_P = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
const LN_2 = Math.log(2);
const zetaLogIntegerCache = [0, 0]; // index n -> log(n), valid for n >= 1
const zetaEvalCache = new Map();
const ZETA_EVAL_CACHE_MAX = 180000;

function ensureZetaLogIntegerCache(maxN) {
    if (!Number.isFinite(maxN) || maxN < 1) return;
    const target = Math.floor(maxN);
    for (let n = zetaLogIntegerCache.length; n <= target; n++) {
        zetaLogIntegerCache[n] = Math.log(n);
    }
}

function expSafe(x) {
    if (x > 700) return Math.exp(700);
    if (x < -745) return 0;
    return Math.exp(x);
}

function complexPositiveRealPowFromLog(logBase, expRe, expIm) {
    const magnitude = expSafe(expRe * logBase);
    const angle = expIm * logBase;
    return { re: magnitude * Math.cos(angle), im: magnitude * Math.sin(angle) };
}

function getZetaEvalCacheKey(a, b, continuationEnabled) {
    const reKey = Math.round(a * 1e7);
    const imKey = Math.round(b * 1e7);
    return `${continuationEnabled ? 1 : 0}:${reKey}:${imKey}`;
}

function readZetaEvalCache(cacheKey) {
    const cached = zetaEvalCache.get(cacheKey);
    if (!cached) return null;
    return { re: cached.re, im: cached.im };
}

function writeZetaEvalCache(cacheKey, value) {
    if (!cacheKey || !value) return;
    if (zetaEvalCache.size >= ZETA_EVAL_CACHE_MAX) {
        zetaEvalCache.clear();
    }
    zetaEvalCache.set(cacheKey, { re: value.re, im: value.im });
}

function getDynamicZetaDirectTerms() {
    const isInteracting = !!(
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning) ||
        state.particleAnimationEnabled
    );
    if (!isInteracting) return NUM_ZETA_TERMS_DIRECT_SUM;
    return Math.max(40, Math.floor(NUM_ZETA_TERMS_DIRECT_SUM * 0.65));
}

function getDynamicZetaHasseLevels() {
    const isInteracting = !!(
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning) ||
        state.particleAnimationEnabled
    );
    if (!isInteracting) return NUM_ZETA_HASSE_LEVELS;
    return Math.max(14, Math.floor(NUM_ZETA_HASSE_LEVELS * 0.62));
}

function complexGamma(re, im) {
    const z = {re, im};
    
    if (z.re < 0.5) {
        const one_minus_z = {re: 1 - z.re, im: -z.im};
        const gamma_one_minus_z = complexGamma(one_minus_z.re, one_minus_z.im);
        
        const pi_z_val = {re: Math.PI * z.re, im: Math.PI * z.im};
        const sin_pi_z = complexSin(pi_z_val.re, pi_z_val.im);

        const denominator = complexMul(sin_pi_z, gamma_one_minus_z);
        return complexDivide({re: Math.PI, im: 0}, denominator);
    }

    const z_minus_1 = {re: z.re - 1, im: z.im};
    let x = {re: LANCZOS_P[0], im: 0};
    for (let k = 1; k < LANCZOS_P.length; k++) {
        const term_k_val = {re: LANCZOS_P[k], im: 0};
        const z_plus_k_minus_1 = {re: z_minus_1.re + k, im: z_minus_1.im}; 
        x = complexAdd(x, complexDivide(term_k_val, z_plus_k_minus_1));
    }

    const t = {re: z.re + LANCZOS_G - 0.5, im: z.im}; 
    const exp_power = {re: z.re - 0.5, im: z.im}; 

    
    let result = complexPow(t.re, t.im, exp_power.re, exp_power.im);
    const t_exp_neg_t = complexExp(-t.re, -t.im);
    result = complexMul(result, t_exp_neg_t);
    result = complexMul(result, x);
    result = complexScalarMul(Math.sqrt(2 * Math.PI), result);
    return result;
}


function complexRiemannZeta_DirectSum(a, b, numTerms) {
    
    if (a <= 1.0) return { re: NaN, im: NaN }; 
    let sum_s = { re: 0, im: 0 };
    ensureZetaLogIntegerCache(numTerms);
    for (let n = 1; n <= numTerms; n++) {
        const term = complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b);
        sum_s = complexAdd(sum_s, term);
    }
    return sum_s;
}

function complexRiemannZeta_EtaSeries(a, b, numTerms) {
    
    if(a === 1 && b === 0) return {re: Infinity, im: NaN}; 

    ensureZetaLogIntegerCache(numTerms);
    let eta_s = {re: 0, im: 0};
    for(let n = 1; n <= numTerms; n++){
        const n_pow_minus_s = complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b);
        let term = n_pow_minus_s;
        if((n - 1) % 2 !== 0){ 
            term = complexScalarMul(-1, term);
        }
        eta_s = complexAdd(eta_s, term);
    }
    
    const two_pow_one_minus_s = complexPositiveRealPowFromLog(LN_2, 1 - a, -b);
    const denominator = complexSub({re: 1, im: 0}, two_pow_one_minus_s);

    
    const den_re_abs = Math.abs(denominator.re);
    const den_im_abs = Math.abs(denominator.im);
    const eta_re_abs = Math.abs(eta_s.re);
    const eta_im_abs = Math.abs(eta_s.im);

    if(den_re_abs < 1e-14 && den_im_abs < 1e-14){ 
        if(eta_re_abs < 1e-10 && eta_im_abs < 1e-10){ 
             return {re: NaN, im: NaN};
        }
        
        const large_val = POLE_MAGNITUDE_THRESHOLD * 1.5;
        const eta_s_mag_sq = eta_s.re * eta_s.re + eta_s.im * eta_s.im;
        if(eta_s_mag_sq < 1e-20) return {re:0, im:0}; 
        const scale = large_val / Math.sqrt(eta_s_mag_sq);
        return {re: eta_s.re * scale, im: eta_s.im * scale};
    }
    return complexDivide(eta_s, denominator);
}

const zetaHasseBinomialRowsCache = {};
function getZetaHasseBinomialRows(maxLevel) {
    if (zetaHasseBinomialRowsCache[maxLevel]) {
        return zetaHasseBinomialRowsCache[maxLevel];
    }

    const rows = new Array(maxLevel);
    for (let n = 0; n < maxLevel; n++) {
        const row = new Array(n + 1);
        row[0] = 1;
        for (let k = 1; k <= n; k++) {
            row[k] = row[k - 1] * (n - k + 1) / k;
        }
        rows[n] = row;
    }
    zetaHasseBinomialRowsCache[maxLevel] = rows;
    return rows;
}

function complexRiemannZeta_HasseSeries(a, b, numLevels) {
    if (a === 1 && b === 0) return { re: Infinity, im: NaN };

    const denom = complexSub({ re: 1, im: 0 }, complexPositiveRealPowFromLog(LN_2, 1 - a, -b));
    if (Math.abs(denom.re) < 1e-14 && Math.abs(denom.im) < 1e-14) {
        return complexRiemannZeta_EtaSeries(a, b, NUM_ZETA_TERMS_ETA_SERIES);
    }

    const hasseRows = getZetaHasseBinomialRows(numLevels);
    ensureZetaLogIntegerCache(numLevels + 1);
    const negPowers = new Array(numLevels + 1);
    for (let n = 1; n <= numLevels; n++) {
        negPowers[n] = complexPositiveRealPowFromLog(zetaLogIntegerCache[n], -a, -b);
    }
    let outerSum = { re: 0, im: 0 };

    for (let n = 0; n < numLevels; n++) {
        const row = hasseRows[n];
        let innerSum = { re: 0, im: 0 };

        for (let k = 0; k <= n; k++) {
            const coeff = ((k % 2 === 0) ? 1 : -1) * row[k];
            const term = negPowers[k + 1];
            innerSum.re += coeff * term.re;
            innerSum.im += coeff * term.im;
        }

        const outerScale = Math.pow(2, -n - 1);
        outerSum.re += outerScale * innerSum.re;
        outerSum.im += outerScale * innerSum.im;
    }

    return complexDivide(outerSum, denom);
}

function complexRiemannZeta(a,b){
    const s = {re: a, im: b};
    const continuationEnabled = !!state.zetaContinuationEnabled;
    const cacheKey = getZetaEvalCacheKey(s.re, s.im, continuationEnabled);
    const cached = readZetaEvalCache(cacheKey);
    if (cached) return cached;

    let result;

    if (!continuationEnabled) {
        if (s.re > ZETA_REFLECTION_POINT_RE) { 
            result = complexRiemannZeta_DirectSum(s.re, s.im, getDynamicZetaDirectTerms());
        } else {
            result = { re: NaN, im: NaN };
        }
        writeZetaEvalCache(cacheKey, result);
        return result;
    }

    
    if(s.re === 1 && s.im === 0) {
        result = {re: Infinity, im: NaN};
        writeZetaEvalCache(cacheKey, result);
        return result;
    }
    if(s.re === 0 && s.im === 0) {
        result = {re: -0.5, im: 0};
        writeZetaEvalCache(cacheKey, result);
        return result;
    }
    if(s.im === 0 && s.re < 0 && s.re % 2 === 0) {
        result = {re: 0, im: 0};
        writeZetaEvalCache(cacheKey, result);
        return result;
    }

    result = complexRiemannZeta_HasseSeries(s.re, s.im, getDynamicZetaHasseLevels());
    writeZetaEvalCache(cacheKey, result);
    return result;
}


function complexMobius(z_re, z_im) {
    const z = {re: z_re, im: z_im};
    
    const ta = state.mobiusA;
    const tb = state.mobiusB;
    const tc = state.mobiusC;
    const td = state.mobiusD;
    const num = complexAdd(complexMul(ta, z), tb);
    const den = complexAdd(complexMul(tc, z), td);
    return complexDivide(num, den);
}

function complexPolynomial(z_re, z_im) {
    let w = {re: 0, im: 0};
    const z = {re: z_re, im: z_im};
    
    
    for (let k = 0; k <= state.polynomialN; ++k) {
        const ck = state.polynomialCoeffs[k];
        if (!ck) continue; 

        let z_pow_k;
        if (k === 0) {
            z_pow_k = {re: 1, im: 0}; 
        } else if (z.re === 0 && z.im === 0) {
            
            z_pow_k = {re: 0, im: 0};
        } else {
            z_pow_k = complexPow(z.re, z.im, k, 0);
        }
        const term = complexMul(ck, z_pow_k);
        w = complexAdd(w, term);
    }
    return w;
}



function complexPoincareCustomMetric(a, b) {
    if (b <= 1e-9) { 
        return { re: NaN, im: NaN };
    }
    const sqrt_b = Math.sqrt(b);
    return { re: a / sqrt_b, im: sqrt_b };
}


function numericDerivative(funcName, z, h = 1e-7) {
    const func = transformFunctions[funcName];
    if (!func) return {re: NaN, im: NaN};

    
    if (funcName === 'zeta' && !state.zetaContinuationEnabled) {
        
        if (z.re <= ZETA_REFLECTION_POINT_RE) {
            return {re: NaN, im: NaN};
        }
        
        if (z.re + h <= ZETA_REFLECTION_POINT_RE || z.re - h <= ZETA_REFLECTION_POINT_RE) {
            
            
            return {re: NaN, im: NaN};
        }
    }
    
    
    

    const z_plus_h_real  = {re: z.re + h, im: z.im};
    const z_minus_h_real = {re: z.re - h, im: z.im};

    const f_z_plus_h  = func(z_plus_h_real.re,  z_plus_h_real.im);
    const f_z_minus_h = func(z_minus_h_real.re, z_minus_h_real.im);

    if (isNaN(f_z_plus_h.re) || isNaN(f_z_plus_h.im) ||
        isNaN(f_z_minus_h.re) || isNaN(f_z_minus_h.im) ||
        !isFinite(f_z_plus_h.re) || !isFinite(f_z_plus_h.im) ||
        !isFinite(f_z_minus_h.re) || !isFinite(f_z_minus_h.im)) {
        return {re: NaN, im: NaN}; 
    }

    const numerator = complexSub(f_z_plus_h, f_z_minus_h);
    const denominator = {re: 2 * h, im: 0};
    return complexDivide(numerator, denominator);
}

const transformFunctions = {
    cos: complexCos, sin: complexSin, tan: complexTan, sec: complexSec,
    exp: complexExp, ln: complexLn, reciprocal: complexReciprocal,
    mobius: complexMobius, zeta: complexRiemannZeta, polynomial: complexPolynomial,
    poincare: complexPoincareCustomMetric 
};


function getContourPoints(shapeType, params, numSteps) {
    const points = [];
    if (shapeType === 'circle') {
        const { cx, cy, r } = params;
        if (r <= 0) return points; 
        for (let i = 0; i <= numSteps; i++) { 
            const t = (i / numSteps) * 2 * Math.PI;
            points.push({ re: cx + r * Math.cos(t), im: cy + r * Math.sin(t) });
        }
    } else if (shapeType === 'ellipse') {
        const { cx, cy, a, b } = params;
        if (a <= 0 || b <= 0) return points; 
        for (let i = 0; i <= numSteps; i++) {
            const t = (i / numSteps) * 2 * Math.PI;
            points.push({ re: cx + a * Math.cos(t), im: cy + b * Math.sin(t) });
        }
    }
    
    return points; 
}

function numericalLineIntegral(transformFunc, contourPoints) {
    let totalIntegral = { re: 0, im: 0 };
    if (!contourPoints || contourPoints.length < 2) return totalIntegral;

    for (let i = 0; i < contourPoints.length - 1; i++) {
        const z_i = contourPoints[i];
        const z_i_plus_1 = contourPoints[i+1];

        const dz = complexSub(z_i_plus_1, z_i);
        
        const z_mid = { re: (z_i.re + z_i_plus_1.re) / 2, im: (z_i.im + z_i_plus_1.im) / 2 };

        const f_val_at_mid = transformFunc(z_mid.re, z_mid.im);

        if (isNaN(f_val_at_mid.re) || isNaN(f_val_at_mid.im) ||
            !isFinite(f_val_at_mid.re) || !isFinite(f_val_at_mid.im)) {
            
            
            
            
            return { re: NaN, im: NaN };
        }
        const term = complexMul(f_val_at_mid, dz);
        totalIntegral = complexAdd(totalIntegral, term);
    }
    return totalIntegral;
}

function isPointInsideContour(point, contourType, params) {
    const { re: px, im: py } = point;
    const toleranceFactor = 1 - 1e-9; 

    if (contourType === 'circle') {
        const { cx, cy, r } = params;
        if (r <= 0) return false;
        return (px - cx) * (px - cx) + (py - cy) * (py - cy) < r * r * toleranceFactor;
    } else if (contourType === 'ellipse') {
        const { cx, cy, a, b } = params;
        if (a <= 0 || b <= 0) return false;
        const termX = (px - cx) / a;
        const termY = (py - cy) / b;
        return termX * termX + termY * termY < 1 * toleranceFactor;
    }
    
    return false;
}

function estimateResidue(transformFunc, pole, epsilonRadius, numSteps) {
    
    const safeEpsilonRadius = Math.max(epsilonRadius, 1e-6);

    const smallCircleParams = { type: 'circle', cx: pole.re, cy: pole.im, r: safeEpsilonRadius };
    const smallCirclePoints = getContourPoints('circle', smallCircleParams, numSteps);

    if (!smallCirclePoints || smallCirclePoints.length === 0) {
        
        return { re: NaN, im: NaN };
    }

    const integralAroundPole = numericalLineIntegral(transformFunc, smallCirclePoints);

    if (isNaN(integralAroundPole.re) || isNaN(integralAroundPole.im)) {
        
        
        
        return { re: NaN, im: NaN };
    }

    const twoPiI = { re: 0, im: 2 * Math.PI };
    
    return complexDivide(integralAroundPole, twoPiI);
}


function factorial(n) {
    if (n < 0) return NaN; 
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}






function isFiniteComplex(c) {
    return isFinite(c.re) && isFinite(c.im);
}

function numericDerivativeNthOrder(funcWrapper, zComplex, order, h_base = 1e-5) {
    if (order < 1) return funcWrapper(zComplex);

    let h = h_base;

    if (order === 1) {
        const f_plus_h = funcWrapper({ re: zComplex.re + h, im: zComplex.im });
        const f_minus_h = funcWrapper({ re: zComplex.re - h, im: zComplex.im });
        if (!isFiniteComplex(f_plus_h) || !isFiniteComplex(f_minus_h)) return { re: NaN, im: NaN };
        return complexDivide(complexSub(f_plus_h, f_minus_h), { re: 2 * h, im: 0 });
    } else if (order === 2) {
        const f_z = funcWrapper(zComplex);
        const f_plus_h = funcWrapper({ re: zComplex.re + h, im: zComplex.im });
        const f_minus_h = funcWrapper({ re: zComplex.re - h, im: zComplex.im });
        if (!isFiniteComplex(f_z) || !isFiniteComplex(f_plus_h) || !isFiniteComplex(f_minus_h)) return { re: NaN, im: NaN };
        const term2 = complexScalarMul(2, f_z);
        return complexDivide(complexAdd(complexSub(f_plus_h, term2), f_minus_h), { re: h * h, im: 0 });
    } else if (order === 3) {
        const f_p2h = funcWrapper({ re: zComplex.re + 2 * h, im: zComplex.im });
        const f_ph = funcWrapper({ re: zComplex.re + h, im: zComplex.im });
        const f_mh = funcWrapper({ re: zComplex.re - h, im: zComplex.im });
        const f_m2h = funcWrapper({ re: zComplex.re - 2 * h, im: zComplex.im });
        if (!isFiniteComplex(f_p2h) || !isFiniteComplex(f_ph) || !isFiniteComplex(f_mh) || !isFiniteComplex(f_m2h)) return { re: NaN, im: NaN };
        const t2 = complexScalarMul(2, f_ph);
        const t3 = complexScalarMul(2, f_mh);
        return complexDivide(complexSub(complexAdd(complexSub(f_p2h, t2), t3), f_m2h), { re: 2 * h * h * h, im: 0 });
    } else if (order === 4) {
        const f_p2h = funcWrapper({ re: zComplex.re + 2 * h, im: zComplex.im });
        const f_ph = funcWrapper({ re: zComplex.re + h, im: zComplex.im });
        const f_z = funcWrapper(zComplex);
        const f_mh = funcWrapper({ re: zComplex.re - h, im: zComplex.im });
        const f_m2h = funcWrapper({ re: zComplex.re - 2 * h, im: zComplex.im });
        if (!isFiniteComplex(f_p2h) || !isFiniteComplex(f_ph) || !isFiniteComplex(f_z) || !isFiniteComplex(f_mh) || !isFiniteComplex(f_m2h)) return { re: NaN, im: NaN };
        const t2 = complexScalarMul(4, f_ph);
        const t3 = complexScalarMul(6, f_z);
        const t4 = complexScalarMul(4, f_mh);
        return complexDivide(complexAdd(complexSub(complexAdd(complexSub(f_p2h, t2), t3), t4), f_m2h), { re: h * h * h * h, im: 0 });
    }

    console.warn(`numericDerivativeNthOrder not implemented for order ${order} using general recursive method (less accurate).`);
    if (order > 0) {
        const deriv_n_minus_1_plus_h = numericDerivativeNthOrder(funcWrapper, { re: zComplex.re + h, im: zComplex.im }, order - 1, h);
        const deriv_n_minus_1_minus_h = numericDerivativeNthOrder(funcWrapper, { re: zComplex.re - h, im: zComplex.im }, order - 1, h);
        if (!isFiniteComplex(deriv_n_minus_1_plus_h) || !isFiniteComplex(deriv_n_minus_1_minus_h)) return { re: NaN, im: NaN };
        return complexDivide(complexSub(deriv_n_minus_1_plus_h, deriv_n_minus_1_minus_h), { re: 2 * h, im: 0 });
    }
    return { re: NaN, im: NaN };
}

function calculateTaylorApproximation(originalTransformFuncKey, zInputComplex, z0Complex, order) {
    const originalTransformFunc = transformFunctions[originalTransformFuncKey];
    if (!originalTransformFunc) {
        console.error("Taylor: Original transform function not found for key:", originalTransformFuncKey);
        return { re: NaN, im: NaN };
    }

    const funcWrapper = (z_complex) => {
        return originalTransformFunc(z_complex.re, z_complex.im);
    };

    let seriesSum = { re: 0, im: 0 };

    for (let n = 0; n <= order; n++) {
        const nthDerivativeAtZ0 = numericDerivativeNthOrder(funcWrapper, z0Complex, n);
        if (!isFiniteComplex(nthDerivativeAtZ0)) {
            if (n === 0) return { re: NaN, im: NaN };
            const equals = Math.abs(zInputComplex.re - z0Complex.re) < 1e-9 && Math.abs(zInputComplex.im - z0Complex.im) < 1e-9;
            if (!equals) {
                console.warn(`Taylor: Derivative order ${n} at z0=${z0Complex.re}+${z0Complex.im}i is not finite: ${nthDerivativeAtZ0.re}+${nthDerivativeAtZ0.im}i. Term might be non-finite.`);
            }
        }

        const fact_n = factorial(n);
        if (isNaN(fact_n) || fact_n === 0) {
            console.error("Taylor: Factorial is NaN or zero for n=", n);
            return { re: NaN, im: NaN };
        }

        let z_minus_z0_pow_n;
        if (n === 0) {
            z_minus_z0_pow_n = { re: 1, im: 0 };
        } else {
            const z_minus_z0 = complexSub(zInputComplex, z0Complex);
            z_minus_z0_pow_n = complexPow(z_minus_z0.re, z_minus_z0.im, n, 0);
        }

        if (!isFiniteComplex(z_minus_z0_pow_n)) {
            if (Math.sqrt(nthDerivativeAtZ0.re * nthDerivativeAtZ0.re + nthDerivativeAtZ0.im * nthDerivativeAtZ0.im) > 1e-9) {
            } else {
                continue;
            }
        }

        const derivative_div_factorial = complexDivide(nthDerivativeAtZ0, { re: fact_n, im: 0 });
        const term = complexMul(derivative_div_factorial, z_minus_z0_pow_n);

        if (!isFiniteComplex(term)) {
            const equals = Math.abs(zInputComplex.re - z0Complex.re) < 1e-9 && Math.abs(zInputComplex.im - z0Complex.im) < 1e-9;
            if (n === 0 && equals) {
                return { re: NaN, im: NaN };
            } else if (n > 0 && equals) {
            } else if (Math.sqrt(term.re * term.re + term.im * term.im) > POLE_MAGNITUDE_THRESHOLD * 100 && n > 0) {
            }
        }
        seriesSum = complexAdd(seriesSum, term);
    }
    return seriesSum;
}

function updateTaylorSeriesCenterAndRadius() {
    const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (state.taylorSeriesCustomCenterEnabled) {
        state.taylorSeriesCenter = {
            re: state.taylorSeriesCustomCenter.re,
            im: state.taylorSeriesCustomCenter.im
        };
    } else if (state.probeActive && zIsPlanar && state.probeZ && typeof state.probeZ.re === 'number' && typeof state.probeZ.im === 'number') {
        state.taylorSeriesCenter = { re: state.probeZ.re, im: state.probeZ.im };
    } else {
        
        state.taylorSeriesCenter = { re: 0, im: 0 };
    }

    let minDistanceSq = Infinity;
    let nearestPole = null;

    
    if (state.poles && Array.isArray(state.poles) && state.poles.length > 0) {
        state.poles.forEach(pole => {
            if (!pole || typeof pole.re !== 'number' || typeof pole.im !== 'number' ||
                !isFinite(pole.re) || !isFinite(pole.im)) {
                
                return;
            }
            const distSq = (pole.re - state.taylorSeriesCenter.re)**2 + (pole.im - state.taylorSeriesCenter.im)**2;
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                nearestPole = pole;
            }
        });
    }

    if (nearestPole) {
        
        if (minDistanceSq < 1e-12) {
            state.taylorSeriesConvergenceRadius = 0;
        } else {
            state.taylorSeriesConvergenceRadius = Math.sqrt(minDistanceSq);
        }
    } else {
        
        const entireFunctions = ['exp', 'sin', 'cos', 'polynomial'];
        if (entireFunctions.includes(state.currentFunction)) {
            state.taylorSeriesConvergenceRadius = Infinity;
        } else {
            
            
            
            
            
            
            state.taylorSeriesConvergenceRadius = 1000; 
             
        }
    }

    
    if (state.currentFunction === 'ln' && state.taylorSeriesCenter.re === 0 && state.taylorSeriesCenter.im === 0) {
        state.taylorSeriesConvergenceRadius = 0;
    }
    
    
    
}
