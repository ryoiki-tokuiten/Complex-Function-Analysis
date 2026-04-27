// --- Inline complex arithmetic: zero allocations through math.js ---

function complexAdd(z1, z2) {
    return { re: z1.re + z2.re, im: z1.im + z2.im };
}

function complexSub(z1, z2) {
    return { re: z1.re - z2.re, im: z1.im - z2.im };
}

function complexMul(z1, z2) {
    return {
        re: z1.re * z2.re - z1.im * z2.im,
        im: z1.re * z2.im + z1.im * z2.re
    };
}

function complexScalarMul(s, z) {
    return { re: s * z.re, im: s * z.im };
}

function complexDivide(num, den) {
    const denMagSq = den.re * den.re + den.im * den.im;
    if (denMagSq < 1e-30) {
        const numMagSq = num.re * num.re + num.im * num.im;
        if (numMagSq < 1e-30) return { re: NaN, im: NaN };
        const large_val = POLE_MAGNITUDE_THRESHOLD * 2;
        if (Math.abs(num.re) < 1e-15 && Math.abs(num.im) < 1e-15) return { re: 0, im: 0 };
        const scale = large_val / Math.sqrt(numMagSq);
        return { re: num.re * scale, im: num.im * scale };
    }
    return {
        re: (num.re * den.re + num.im * den.im) / denMagSq,
        im: (num.im * den.re - num.re * den.im) / denMagSq
    };
}

function complexAbs(z) {
    return Math.sqrt(z.re * z.re + z.im * z.im);
}

function complexArg(z) {
    return Math.atan2(z.im, z.re);
}

function _cosh(x) { return Math.cosh(x); }
function _sinh(x) { return Math.sinh(x); }

function complexCos(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    return { re: Math.cos(a) * _cosh(b), im: -Math.sin(a) * _sinh(b) };
}

function complexSin(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    return { re: Math.sin(a) * _cosh(b), im: Math.cos(a) * _sinh(b) };
}

function complexTan(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    const sinZ = complexSin(a, b);
    const cosZ = complexCos(a, b);
    return complexDivide(sinZ, cosZ);
}

function complexSec(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    const cosZ = complexCos(a, b);
    return complexDivide({ re: 1, im: 0 }, cosZ);
}

function complexExp(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    const ea = expSafe(a);
    return { re: ea * Math.cos(b), im: ea * Math.sin(b) };
}

function complexLn(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    if (a === 0 && b === 0) return { re: -Infinity, im: 0 };
    return { re: Math.log(Math.sqrt(a * a + b * b)), im: Math.atan2(b, a) };
}

function complexReciprocal(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    if (a === 0 && b === 0) return { re: NaN, im: NaN };
    const magSq = a * a + b * b;
    return { re: a / magSq, im: -b / magSq };
}

function complexSinh(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    return { re: _sinh(a) * Math.cos(b), im: _cosh(a) * Math.sin(b) };
}

function complexCosh(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    return { re: _cosh(a) * Math.cos(b), im: _sinh(a) * Math.sin(b) };
}

function complexTanh(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    const sinhZ = complexSinh(a, b);
    const coshZ = complexCosh(a, b);
    return complexDivide(sinhZ, coshZ);
}

function complexPowerFractional(a, b) {
    if (typeof a === 'object') { b = a.im; a = a.re; }
    const n = state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5;
    if (a === 0 && b === 0) return { re: 0, im: 0 };
    const lnZ = complexLn(a, b);
    return complexExp(n * lnZ.re, n * lnZ.im);
}

function complexPow(base_re, base_im, exp_re, exp_im) {
    if (base_re === 0 && base_im === 0) {
        if (exp_re > 0 || (exp_re === 0 && exp_im !== 0)) return { re: 0, im: 0 };
        if (exp_re === 0 && exp_im === 0) return { re: 1, im: 0 };
    }
    // z^w = exp(w * ln(z))
    const lnZ = complexLn(base_re, base_im);
    const wLnZ = complexMul({ re: exp_re, im: exp_im }, lnZ);
    return complexExp(wLnZ.re, wLnZ.im);
}

/**
 * C() factory — thin wrapper providing fluent API for analysis modules.
 * Internally uses the inline arithmetic above (no math.js round-trips).
 */
function C(re, im) {
    if (typeof re === 'object' && re !== null) {
        im = re.im ?? re.imag ?? 0;
        re = re.re ?? re.real ?? 0;
    } else {
        re = re ?? 0;
        im = im ?? 0;
    }

    return {
        re: re,
        im: im,
        get real() { return this.re; },
        get imag() { return this.im; },
        add(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            return C(this.re + (o.re ?? o.real ?? 0), this.im + (o.im ?? o.imag ?? 0));
        },
        subtract(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            return C(this.re - (o.re ?? o.real ?? 0), this.im - (o.im ?? o.imag ?? 0));
        },
        multiply(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const oRe = o.re ?? o.real ?? 0;
            const oIm = o.im ?? o.imag ?? 0;
            return C(this.re * oRe - this.im * oIm, this.re * oIm + this.im * oRe);
        },
        divide(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const oRe = o.re ?? o.real ?? 0;
            const oIm = o.im ?? o.imag ?? 0;
            const magSq = oRe * oRe + oIm * oIm;
            if (magSq < 1e-30) return C(NaN, NaN);
            return C(
                (this.re * oRe + this.im * oIm) / magSq,
                (this.im * oRe - this.re * oIm) / magSq
            );
        },
        abs() {
            return Math.sqrt(this.re * this.re + this.im * this.im);
        },
        arg() {
            return Math.atan2(this.im, this.re);
        },
        clone() {
            return C(this.re, this.im);
        },
        equals(other, tolerance) {
            const tol = tolerance ?? 1e-12;
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            return Math.abs(this.re - (o.re ?? o.real ?? 0)) < tol && Math.abs(this.im - (o.im ?? o.imag ?? 0)) < tol;
        },
        isFinite() {
            return Number.isFinite(this.re) && Number.isFinite(this.im);
        },
        conjugate() {
            return C(this.re, -this.im);
        },
        negate() {
            return C(-this.re, -this.im);
        }
    };
}

C.power = function(base, exp) {
    const bRe = base.re ?? base.real ?? 0;
    const bIm = base.im ?? base.imag ?? 0;
    if (typeof exp === 'number') {
        const result = complexPow(bRe, bIm, exp, 0);
        return C(result.re, result.im);
    }
    const eRe = exp.re ?? exp.real ?? 0;
    const eIm = exp.im ?? exp.imag ?? 0;
    const result = complexPow(bRe, bIm, eRe, eIm);
    return C(result.re, result.im);
};

const Complex = C;


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
    const step = Number.isFinite(h) ? h : 1e-7;

    
    if (funcName === 'zeta' && !state.zetaContinuationEnabled) {
        
        if (z.re <= ZETA_REFLECTION_POINT_RE) {
            return {re: NaN, im: NaN};
        }
        
        if (z.re + step <= ZETA_REFLECTION_POINT_RE || z.re - step <= ZETA_REFLECTION_POINT_RE) {
            
            
            return {re: NaN, im: NaN};
        }
    }
    
    
    
    const z_plus_h_real  = {re: z.re + step, im: z.im};
    const z_minus_h_real = {re: z.re - step, im: z.im};

    const f_z_plus_h  = func(z_plus_h_real.re,  z_plus_h_real.im);
    const f_z_minus_h = func(z_minus_h_real.re, z_minus_h_real.im);

    if (isNaN(f_z_plus_h.re) || isNaN(f_z_plus_h.im) ||
        isNaN(f_z_minus_h.re) || isNaN(f_z_minus_h.im) ||
        !isFinite(f_z_plus_h.re) || !isFinite(f_z_plus_h.im) ||
        !isFinite(f_z_minus_h.re) || !isFinite(f_z_minus_h.im)) {
        return {re: NaN, im: NaN}; 
    }

    const numerator = complexSub(f_z_plus_h, f_z_minus_h);
    const denominator = {re: 2 * step, im: 0};
    return complexDivide(numerator, denominator);
}

const transformFunctions = {
    cos: complexCos, sin: complexSin, tan: complexTan, sec: complexSec,
    exp: complexExp, ln: complexLn, reciprocal: complexReciprocal,
    sinh: complexSinh, cosh: complexCosh, tanh: complexTanh,
    power: complexPowerFractional,
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

function getTaylorDerivativeStep(zComplex, order, hBase = 1e-4) {
    const scale = Math.max(1, Math.abs(zComplex.re), Math.abs(zComplex.im));
    const multipliers = {
        1: 1,
        2: 2,
        3: 8,
        4: 24
    };
    const multiplier = multipliers[order] || Math.max(24, order * order * 2);
    return hBase * multiplier * scale;
}

function numericDerivativeNthOrder(funcWrapper, zComplex, order, h_base = 1e-5) {
    if (order < 1) return funcWrapper(zComplex);

    let h = getTaylorDerivativeStep(zComplex, order, h_base);

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

const taylorSeriesCoefficientCache = {
    key: null,
    coefficients: null
};

function toTaylorCacheNumber(value) {
    return Number.isFinite(value) ? value.toFixed(9) : `${value}`;
}

function appendTaylorCacheComplexParts(parts, prefix, value) {
    const safeValue = value || DEFAULT_TAYLOR_SERIES_CENTER;
    parts.push(`${prefix}r:${toTaylorCacheNumber(safeValue.re)}`);
    parts.push(`${prefix}i:${toTaylorCacheNumber(safeValue.im)}`);
}

function buildTaylorSeriesCoefficientCacheKey(functionKey, z0Complex, order) {
    const keyParts = [
        `f:${functionKey}`,
        `order:${order}`,
        `z0r:${toTaylorCacheNumber(z0Complex.re)}`,
        `z0i:${toTaylorCacheNumber(z0Complex.im)}`
    ];

    if (functionKey === 'zeta') {
        keyParts.push(`zetaC:${state.zetaContinuationEnabled ? 1 : 0}`);
    } else if (functionKey === 'mobius') {
        appendTaylorCacheComplexParts(keyParts, 'mA', state.mobiusA);
        appendTaylorCacheComplexParts(keyParts, 'mB', state.mobiusB);
        appendTaylorCacheComplexParts(keyParts, 'mC', state.mobiusC);
        appendTaylorCacheComplexParts(keyParts, 'mD', state.mobiusD);
    } else if (functionKey === 'polynomial') {
        const degree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        keyParts.push(`polyN:${degree}`);
        for (let i = 0; i <= degree; i++) {
            appendTaylorCacheComplexParts(keyParts, `p${i}`, state.polynomialCoeffs && state.polynomialCoeffs[i]);
        }
    }

    return keyParts.join('|');
}

function getTaylorContourRadius(z0Complex) {
    const convergenceRadius = state && Number.isFinite(state.taylorSeriesConvergenceRadius)
        ? state.taylorSeriesConvergenceRadius
        : null;

    if (convergenceRadius !== null) {
        if (convergenceRadius <= 1e-9) {
            return 0;
        }
        return Math.max(1e-3, Math.min(1.25, convergenceRadius * 0.45));
    }

    const centerScale = Math.max(1, Math.abs(z0Complex.re), Math.abs(z0Complex.im));
    return Math.max(0.25, Math.min(1.25, centerScale * 0.35));
}

function computeTaylorSeriesCoefficients(originalTransformFuncKey, z0Complex, order) {
    const originalTransformFunc = transformFunctions[originalTransformFuncKey];
    if (!originalTransformFunc) {
        console.error("Taylor: Original transform function not found for key:", originalTransformFuncKey);
        return null;
    }

    const cacheKey = buildTaylorSeriesCoefficientCacheKey(originalTransformFuncKey, z0Complex, order);
    if (taylorSeriesCoefficientCache.key === cacheKey) {
        return taylorSeriesCoefficientCache.coefficients;
    }

    const contourRadius = getTaylorContourRadius(z0Complex);
    if (!(contourRadius > 0)) {
        taylorSeriesCoefficientCache.key = cacheKey;
        taylorSeriesCoefficientCache.coefficients = null;
        return null;
    }

    const contourStepCount = Math.max(192, 48 * (order + 1));
    const contourPoints = getContourPoints('circle', {
        cx: z0Complex.re,
        cy: z0Complex.im,
        r: contourRadius
    }, contourStepCount);

    if (!Array.isArray(contourPoints) || contourPoints.length < 2) {
        taylorSeriesCoefficientCache.key = cacheKey;
        taylorSeriesCoefficientCache.coefficients = null;
        return null;
    }

    const coefficients = [];

    for (let n = 0; n <= order; n++) {
        const integrand = (re, im) => {
            const functionValue = originalTransformFunc(re, im);
            if (!isFiniteComplex(functionValue)) {
                return { re: NaN, im: NaN };
            }

            const delta = { re: re - z0Complex.re, im: im - z0Complex.im };
            const deltaPower = complexPow(delta.re, delta.im, n + 1, 0);
            if (!isFiniteComplex(deltaPower)) {
                return { re: NaN, im: NaN };
            }

            return complexDivide(functionValue, deltaPower);
        };

        const contourIntegral = numericalLineIntegral(integrand, contourPoints);
        if (!isFiniteComplex(contourIntegral)) {
            taylorSeriesCoefficientCache.key = cacheKey;
            taylorSeriesCoefficientCache.coefficients = null;
            return null;
        }

        const coefficient = complexDivide(contourIntegral, { re: 0, im: TWO_PI });
        if (!isFiniteComplex(coefficient)) {
            taylorSeriesCoefficientCache.key = cacheKey;
            taylorSeriesCoefficientCache.coefficients = null;
            return null;
        }

        coefficients.push(coefficient);
    }

    taylorSeriesCoefficientCache.key = cacheKey;
    taylorSeriesCoefficientCache.coefficients = coefficients;
    return coefficients;
}

function evaluateTaylorSeries(coefficients, zInputComplex, z0Complex) {
    if (!Array.isArray(coefficients) || coefficients.length === 0) {
        return { re: NaN, im: NaN };
    }

    const delta = complexSub(zInputComplex, z0Complex);
    let seriesSum = { re: 0, im: 0 };
    let deltaPower = { re: 1, im: 0 };

    for (let n = 0; n < coefficients.length; n++) {
        const coefficient = coefficients[n];
        if (isFiniteComplex(coefficient)) {
            seriesSum = complexAdd(seriesSum, complexMul(coefficient, deltaPower));
        }
        deltaPower = complexMul(deltaPower, delta);
    }

    return seriesSum;
}

function updateTaylorSeriesCenterAndRadius() {
    if (state.taylorSeriesCustomCenterEnabled) {
        state.taylorSeriesCenter = {
            re: state.taylorSeriesCustomCenter.re,
            im: state.taylorSeriesCustomCenter.im
        };
    } else {
        state.taylorSeriesCenter = {
            re: DEFAULT_TAYLOR_SERIES_CENTER.re,
            im: DEFAULT_TAYLOR_SERIES_CENTER.im
        };
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
