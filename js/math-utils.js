// --- Inline complex arithmetic: zero allocations through math.js ---

function withMaxMag(res, ...inputs) {
    return res;
}

function isNumericallyStable(w) {
    return true;
}

function complexAdd(z1, z2) {
    const res = { re: z1.re + z2.re, im: z1.im + z2.im };
    return withMaxMag(res, z1, z2);
}

function complexSub(z1, z2) {
    const res = { re: z1.re - z2.re, im: z1.im - z2.im };
    return withMaxMag(res, z1, z2);
}

function complexMul(z1, z2) {
    const res = {
        re: z1.re * z2.re - z1.im * z2.im,
        im: z1.re * z2.im + z1.im * z2.re
    };
    return withMaxMag(res, z1, z2);
}

function complexScalarMul(s, z) {
    const res = { re: s * z.re, im: s * z.im };
    return withMaxMag(res, s, z);
}

function complexDivide(num, den) {
    const denMagSq = den.re * den.re + den.im * den.im;
    if (denMagSq < 1e-30) {
        const numMagSq = num.re * num.re + num.im * num.im;
        if (numMagSq < 1e-30) return { re: NaN, im: NaN };
        const large_val = POLE_MAGNITUDE_THRESHOLD * 2;
        if (Math.abs(num.re) < 1e-15 && Math.abs(num.im) < 1e-15) return { re: 0, im: 0 };
        const scale = large_val / Math.sqrt(numMagSq);
        const res = { re: num.re * scale, im: num.im * scale };
        return withMaxMag(res, num, den);
    }
    const res = {
        re: (num.re * den.re + num.im * den.im) / denMagSq,
        im: (num.im * den.re - num.re * den.im) / denMagSq
    };
    return withMaxMag(res, num, den);
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
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const cosh_b = _cosh(b);
    const sinh_b = _sinh(b);
    const res = { re: Math.cos(a) * cosh_b, im: -Math.sin(a) * sinh_b };
    return withMaxMag(res, zInput, cosh_b, sinh_b);
}

function complexSin(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const cosh_b = _cosh(b);
    const sinh_b = _sinh(b);
    const res = { re: Math.sin(a) * cosh_b, im: Math.cos(a) * sinh_b };
    return withMaxMag(res, zInput, cosh_b, sinh_b);
}

function complexTan(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const sinZ = complexSin(a, b);
    const cosZ = complexCos(a, b);
    const res = complexDivide(sinZ, cosZ);
    return withMaxMag(res, zInput, sinZ, cosZ);
}

function complexSec(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const cosZ = complexCos(a, b);
    const res = complexDivide({ re: 1, im: 0 }, cosZ);
    return withMaxMag(res, zInput, cosZ);
}

function complexExp(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const ea = expSafe(a);
    const res = { re: ea * Math.cos(b), im: ea * Math.sin(b) };
    return withMaxMag(res, zInput, ea);
}

function complexLn(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    if (a === 0 && b === 0) return { re: -Infinity, im: 0 };
    const res = { re: Math.log(Math.sqrt(a * a + b * b)), im: Math.atan2(b, a) };
    return withMaxMag(res, zInput);
}

function complexReciprocal(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    if (a === 0 && b === 0) return { re: NaN, im: NaN };
    const magSq = a * a + b * b;
    const res = { re: a / magSq, im: -b / magSq };
    return withMaxMag(res, zInput);
}

function complexSinh(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const cosh_a = _cosh(a);
    const sinh_a = _sinh(a);
    const res = { re: sinh_a * Math.cos(b), im: cosh_a * Math.sin(b) };
    return withMaxMag(res, zInput, cosh_a, sinh_a);
}

function complexCosh(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const cosh_a = _cosh(a);
    const sinh_a = _sinh(a);
    const res = { re: cosh_a * Math.cos(b), im: sinh_a * Math.sin(b) };
    return withMaxMag(res, zInput, cosh_a, sinh_a);
}

function complexTanh(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const sinhZ = complexSinh(a, b);
    const coshZ = complexCosh(a, b);
    const res = complexDivide(sinhZ, coshZ);
    return withMaxMag(res, zInput, sinhZ, coshZ);
}

function complexPowerFractional(a, b) {
    let zInput = null;
    if (typeof a === 'object') { b = a.im; a = a.re; zInput = a; }
    const n = state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5;
    if (a === 0 && b === 0) return { re: 0, im: 0 };
    const lnZ = complexLn(a, b);
    const res = complexExp(n * lnZ.re, n * lnZ.im);
    return withMaxMag(res, zInput, lnZ);
}

function complexPow(base_re, base_im, exp_re, exp_im) {
    let baseInput = null;
    if (typeof base_re === 'object') {
        baseInput = base_re;
        exp_im = exp_re;
        exp_re = base_im;
        base_im = base_re.im;
        base_re = base_re.re;
    }
    if (base_re === 0 && base_im === 0) {
        if (exp_re > 0 || (exp_re === 0 && exp_im !== 0)) return { re: 0, im: 0 };
        if (exp_re === 0 && exp_im === 0) return { re: 1, im: 0 };
    }
    const lnZ = complexLn(base_re, base_im);
    const wLnZ = complexMul({ re: exp_re, im: exp_im }, lnZ);
    const res = complexExp(wLnZ.re, wLnZ.im);
    return withMaxMag(res, baseInput, lnZ, wLnZ);
}

/**
 * C() factory — thin wrapper providing fluent API for analysis modules.
 * Internally uses the inline arithmetic above (no math.js round-trips).
 */
function C(re, im) {
    let initialMax = undefined;
    if (typeof re === 'object' && re !== null) {
        initialMax = re._maxMag;
        im = re.im ?? re.imag ?? 0;
        re = re.re ?? re.real ?? 0;
    } else {
        re = re ?? 0;
        im = im ?? 0;
    }

    const obj = {
        re: re,
        im: im,
        _maxMag: initialMax ?? Math.sqrt(re * re + im * im),
        get real() { return this.re; },
        get imag() { return this.im; },
        add(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const res = C(this.re + (o.re ?? o.real ?? 0), this.im + (o.im ?? o.imag ?? 0));
            return withMaxMag(res, this, o);
        },
        subtract(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const res = C(this.re - (o.re ?? o.real ?? 0), this.im - (o.im ?? o.imag ?? 0));
            return withMaxMag(res, this, o);
        },
        multiply(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const oRe = o.re ?? o.real ?? 0;
            const oIm = o.im ?? o.imag ?? 0;
            const res = C(this.re * oRe - this.im * oIm, this.re * oIm + this.im * oRe);
            return withMaxMag(res, this, o);
        },
        divide(other) {
            const o = typeof other === 'object' ? other : { re: other, im: 0 };
            const oRe = o.re ?? o.real ?? 0;
            const oIm = o.im ?? o.imag ?? 0;
            const magSq = oRe * oRe + oIm * oIm;
            if (magSq < 1e-30) return C(NaN, NaN);
            const res = C(
                (this.re * oRe + this.im * oIm) / magSq,
                (this.im * oRe - this.re * oIm) / magSq
            );
            return withMaxMag(res, this, o);
        },
        abs() {
            return Math.sqrt(this.re * this.re + this.im * this.im);
        },
        arg() {
            return Math.atan2(this.im, this.re);
        },
        clone() {
            const res = C(this.re, this.im);
            res._maxMag = this._maxMag;
            return res;
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
            const res = C(this.re, -this.im);
            res._maxMag = this._maxMag;
            return res;
        },
        negate() {
            const res = C(-this.re, -this.im);
            res._maxMag = this._maxMag;
            return res;
        }
    };
    return obj;
}

C.power = function(base, exp) {
    if (typeof exp === 'number') {
        const result = complexPow(base, exp, 0);
        return C(result.re, result.im);
    }
    const result = complexPow(base, exp);
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
    let maxTermMag = 0;

    for (let n = 0; n < numLevels; n++) {
        const row = hasseRows[n];
        let innerSum = { re: 0, im: 0 };

        for (let k = 0; k <= n; k++) {
            const coeff = ((k % 2 === 0) ? 1 : -1) * row[k];
            const term = negPowers[k + 1];
            innerSum.re += coeff * term.re;
            innerSum.im += coeff * term.im;
            
            const termMag = Math.abs(coeff) * Math.sqrt(term.re * term.re + term.im * term.im);
            if (termMag > maxTermMag) maxTermMag = termMag;
        }

        const outerScale = Math.pow(2, -n - 1);
        outerSum.re += outerScale * innerSum.re;
        outerSum.im += outerScale * innerSum.im;
    }

    const res = complexDivide(outerSum, denom);
    return withMaxMag(res, maxTermMag, denom);
}

function complexRiemannZeta(a,b){
    let s = {re: a, im: b};
    if (typeof a === 'object') {
        s = a;
    }
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
    let z = {re: z_re, im: z_im};
    if (typeof z_re === 'object') {
        z = z_re;
    }
    
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
    let z = {re: z_re, im: z_im};
    if (typeof z_re === 'object') {
        z = z_re;
    }
    
    for (let k = 0; k <= state.polynomialN; ++k) {
        const ck = state.polynomialCoeffs[k];
        if (!ck) continue; 

        let z_pow_k;
        if (k === 0) {
            z_pow_k = {re: 1, im: 0}; 
        } else if (z.re === 0 && z.im === 0) {
            z_pow_k = {re: 0, im: 0};
        } else {
            z_pow_k = complexPow(z, k, 0);
        }
        const term = complexMul(ck, z_pow_k);
        w = complexAdd(w, term);
    }
    return w;
}

function complexPoincareCustomMetric(a, b) {
    if (typeof a === 'object') {
        b = a.im;
        a = a.re;
    }
    if (b <= 1e-9) { 
        return { re: NaN, im: NaN };
    }
    const sqrt_b = Math.sqrt(b);
    return { re: a / sqrt_b, im: sqrt_b };
}


function numericDerivative(funcName, z, h = 1e-7) {
    const func = getChainedTransformFunction(funcName);
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

function evaluateFunctionBlock(block, z_re, z_im) {
    if (!block || block.func === 'none') {
        return (typeof z_re === 'object') ? z_re : { re: z_re, im: z_im };
    }
    
    // 1. Chained function g(z)
    let arg_z = (typeof z_re === 'object') ? z_re : { re: z_re, im: z_im };
    if (block.chainedFunc && block.chainedFunc !== 'none') {
        const g = transformFunctions[block.chainedFunc];
        if (g) {
            arg_z = g(arg_z);
        }
    }
    
    // 2. Base function f(arg)
    const f = transformFunctions[block.func];
    if (!f) {
        return arg_z;
    }
    
    let w = f(arg_z);
    
    // 3. Higher power w^n
    if (block.power !== undefined && block.power !== 1) {
        w = complexPow(w, block.power, 0);
    }
    
    // 4. Reciprocal
    if (block.reciprocal) {
        w = complexReciprocal(w);
    }
    
    // 5. Log
    if (block.log) {
        w = complexLn(w);
    }
    
    // 6. Exponential
    if (block.exp) {
        w = complexExp(w);
    }
    
    return w;
}

function evaluateAlgebraicTerm(term, z_re, z_im) {
    let termVal = { re: term.coeff.re, im: term.coeff.im };
    let z = (typeof z_re === 'object') ? z_re : { re: z_re, im: z_im };
    
    for (const factor of term.factors) {
        if (!factor || factor.func === 'none') {
            break;
        }
        const factorVal = evaluateFunctionBlock(factor, z);
        termVal = complexMul(termVal, factorVal);
    }
    
    return termVal;
}

function evaluateAlgebraicChaining(z_re, z_im) {
    let sum = { re: 0, im: 0 };
    if (!state.algebraicChainingEnabled || !state.algebraicChainingTerms || state.algebraicChainingTerms.length === 0) {
        return sum;
    }
    let z = (typeof z_re === 'object') ? z_re : { re: z_re, im: z_im };
    for (const term of state.algebraicChainingTerms) {
        const termVal = evaluateAlgebraicTerm(term, z);
        if (isNaN(termVal.re) || isNaN(termVal.im)) {
            return { re: NaN, im: NaN };
        }
        sum = complexAdd(sum, termVal);
    }
    return sum;
}

const transformFunctions = {
    cos: complexCos, sin: complexSin, tan: complexTan, sec: complexSec,
    exp: complexExp, ln: complexLn, reciprocal: complexReciprocal,
    sinh: complexSinh, cosh: complexCosh, tanh: complexTanh,
    power: complexPowerFractional,
    mobius: complexMobius, zeta: complexRiemannZeta, polynomial: complexPolynomial,
    poincare: complexPoincareCustomMetric,
    algebraic_chaining: evaluateAlgebraicChaining
};

const MAPPED_TRANSFORM_ABS_EPSILON = 1e-5;
const MAPPED_TRANSFORM_REL_EPSILON = 1e-7;
const MAPPED_TRANSFORM_MIN_AGREEMENT_RATIO = 0.9;
const MAPPED_TRANSFORM_MIN_CONSTANT_SAMPLES = 9;
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

function mappedTransformNumberKey(value) {
    return Number.isFinite(value) ? value.toFixed(12) : `${value}`;
}

function mappedTransformComplexKey(value) {
    if (!value) return 'none';
    return `${mappedTransformNumberKey(value.re ?? 0)},${mappedTransformNumberKey(value.im ?? 0)}`;
}

function buildMappedTransformProfileKey(functionKey) {
    const parts = [
        `f:${functionKey}`,
        `zetaC:${state.zetaContinuationEnabled ? 1 : 0}`,
        `frac:${mappedTransformNumberKey(state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5)}`
    ];

    if (functionKey === 'mobius') {
        parts.push(
            `a:${mappedTransformComplexKey(state.mobiusA)}`,
            `b:${mappedTransformComplexKey(state.mobiusB)}`,
            `c:${mappedTransformComplexKey(state.mobiusC)}`,
            `d:${mappedTransformComplexKey(state.mobiusD)}`
        );
    } else if (functionKey === 'polynomial') {
        const degree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        parts.push(`n:${degree}`);
        for (let i = 0; i <= degree; i++) {
            parts.push(`p${i}:${mappedTransformComplexKey(state.polynomialCoeffs && state.polynomialCoeffs[i])}`);
        }
    } else if (functionKey === 'algebraic_chaining') {
        parts.push(`alg:${JSON.stringify(state.algebraicChainingTerms || [])}`);
    }

    return parts.join('|');
}

function cloneMappedComplex(value) {
    return value ? { re: value.re, im: value.im } : null;
}

function isValidMappedTransformValue(value) {
    return !!(
        value &&
        typeof value.re === 'number' &&
        typeof value.im === 'number' &&
        Number.isFinite(value.re) &&
        Number.isFinite(value.im) &&
        isNumericallyStable(value)
    );
}

function shouldSkipMappedTransformPoint(functionKey, zPoint) {
    return functionKey === 'zeta' &&
        !state.zetaContinuationEnabled &&
        zPoint &&
        zPoint.re <= ZETA_REFLECTION_POINT_RE;
}

function evaluateRawMappedTransform(transformFunc, zPoint, functionKey = state.currentFunction) {
    if (!transformFunc || !zPoint || zPoint.re === undefined || zPoint.im === undefined) {
        return null;
    }
    if (shouldSkipMappedTransformPoint(functionKey, zPoint)) {
        return null;
    }
    const mapped = transformFunc(zPoint.re, zPoint.im);
    return isValidMappedTransformValue(mapped) ? mapped : null;
}

function getMappedTransformTolerance(value) {
    return MAPPED_TRANSFORM_ABS_EPSILON +
        MAPPED_TRANSFORM_REL_EPSILON * Math.max(1, Math.hypot(value.re, value.im));
}

function getMappedConstantCluster(samples, minSamples = MAPPED_TRANSFORM_MIN_CONSTANT_SAMPLES) {
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

    return bestValue && bestCount / samples.length >= MAPPED_TRANSFORM_MIN_AGREEMENT_RATIO
        ? { value: bestValue, agreement: bestCount / samples.length, validCount: samples.length }
        : null;
}

function detectMappedConstantTransform(transformFunc, functionKey = state.currentFunction) {
    const samples = [];
    for (const point of MAPPED_TRANSFORM_DIAGNOSTIC_STENCIL) {
        const mapped = evaluateRawMappedTransform(transformFunc, point, functionKey);
        if (mapped) samples.push(mapped);
    }
    return getMappedConstantCluster(samples);
}

function getMappedTransformProfile(functionKey = state.currentFunction, transformFunc = null) {
    const resolvedTransform = transformFunc || transformFunctions[functionKey];
    if (typeof resolvedTransform !== 'function') {
        return { functionKey, transformFunc: null, isConstant: false, constantValue: null };
    }

    const cacheable = resolvedTransform === transformFunctions[functionKey];
    const cacheKey = cacheable ? buildMappedTransformProfileKey(functionKey) : null;
    if (cacheable && cacheKey === mappedTransformProfileCacheKey && mappedTransformProfileCacheValue) {
        return mappedTransformProfileCacheValue;
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
        mappedTransformProfileCacheKey = cacheKey;
        mappedTransformProfileCacheValue = profile;
    }

    return profile;
}

function evaluateMappedTransform(profileOrTransform, re, im, functionKey = state.currentFunction) {
    if (!profileOrTransform) return null;
    if (typeof profileOrTransform === 'function') {
        return evaluateRawMappedTransform(profileOrTransform, { re, im }, functionKey);
    }
    if (profileOrTransform.isConstant && profileOrTransform.constantValue) {
        return cloneMappedComplex(profileOrTransform.constantValue);
    }
    return evaluateRawMappedTransform(
        profileOrTransform.transformFunc,
        { re, im },
        profileOrTransform.functionKey || functionKey
    );
}

function getEffectiveBaseTransformFunction(funcKey = state.currentFunction) {
    let baseFunc = transformFunctions[funcKey];
    if (!baseFunc) return (re, im) => ({ re, im });
    
    if (state.taylorSeriesEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        if (typeof createTaylorApproximationTransform === 'function') {
            baseFunc = createTaylorApproximationTransform(
                funcKey,
                state.taylorSeriesCenter,
                state.taylorSeriesOrder
            );
        }
    }
    return baseFunc;
}

function getChainedTransformFunction(funcKey = state.currentFunction) {
    const baseFunc = getEffectiveBaseTransformFunction(funcKey);
    if (!state.chainingEnabled || state.chainCount <= 1) {
        return baseFunc;
    }
    const baseProfile = getMappedTransformProfile(funcKey, baseFunc);
    const evalBaseFunc = value => evaluateMappedTransform(baseProfile, value.re, value.im) || { re: NaN, im: NaN };
    
    let curFunc = baseFunc;
    const count = state.chainCount;
    for (let i = 1; i < count; i++) {
        const prevFunc = curFunc;
        switch(state.chainingMode) {
            case 'power':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    const w0 = evaluateMappedTransform(baseProfile, re, im) || { re: NaN, im: NaN };
                    return complexMul(temp, w0);
                };
                break;
            case 'sqrt':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexPow(temp, 0.5, 0);
                };
                break;
            case 'ln':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexLn(temp);
                };
                break;
            case 'exp':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexExp(temp);
                };
                break;
            case 'reciprocal':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexReciprocal(temp);
                };
                break;
            case 'recursion':
            default:
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return evalBaseFunc(temp);
                };
                break;
        }
    }
    return curFunc;
}


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
    } else if (functionKey === 'algebraic_chaining') {
        keyParts.push(`algTerms:${state.algebraicChainingTerms.length}`);
        state.algebraicChainingTerms.forEach((term, idx) => {
            keyParts.push(`t${idx}:${term.factors.map(f => f.func).join(',')}`);
            appendTaylorCacheComplexParts(keyParts, `t${idx}c`, term.coeff);
            term.factors.forEach((factor, fIdx) => {
                if (factor.func === 'none') return;
                keyParts.push(`t${idx}f${fIdx}chain:${factor.chainedFunc}`);
                keyParts.push(`t${idx}f${fIdx}pow:${toTaylorCacheNumber(factor.power)}`);
                keyParts.push(`t${idx}f${fIdx}recip:${factor.reciprocal ? 1 : 0}`);
                keyParts.push(`t${idx}f${fIdx}log:${factor.log ? 1 : 0}`);
                keyParts.push(`t${idx}f${fIdx}exp:${factor.exp ? 1 : 0}`);
                
                if (factor.func === 'mobius' || factor.chainedFunc === 'mobius') {
                    appendTaylorCacheComplexParts(keyParts, `t${idx}f${fIdx}mA`, state.mobiusA);
                    appendTaylorCacheComplexParts(keyParts, `t${idx}f${fIdx}mB`, state.mobiusB);
                    appendTaylorCacheComplexParts(keyParts, `t${idx}f${fIdx}mC`, state.mobiusC);
                    appendTaylorCacheComplexParts(keyParts, `t${idx}f${fIdx}mD`, state.mobiusD);
                }
                if (factor.func === 'polynomial' || factor.chainedFunc === 'polynomial') {
                    const polyDegree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
                    keyParts.push(`t${idx}f${fIdx}polyN:${polyDegree}`);
                    for (let i = 0; i <= polyDegree; i++) {
                        appendTaylorCacheComplexParts(keyParts, `t${idx}f${fIdx}p${i}`, (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null);
                    }
                }
                if (factor.func === 'power' || factor.chainedFunc === 'power') {
                    keyParts.push(`t${idx}f${fIdx}fracN:${toTaylorCacheNumber(state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5)}`);
                }
            });
        });
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
