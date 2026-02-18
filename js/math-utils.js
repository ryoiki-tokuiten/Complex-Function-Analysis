
class Complex {
    constructor(real, imag) {
        this.real = real;
        this.imag = imag;
    }
    add(other) { return new Complex(this.real + other.real, this.imag + other.imag); }
    subtract(other) { return new Complex(this.real - other.real, this.imag - other.imag); }
    multiply(other) {
        return new Complex(this.real * other.real - this.imag * other.imag,
                           this.real * other.imag + this.imag * other.real);
    }
    divide(other) {
        const d = other.real * other.real + other.imag * other.imag;
        if (d === 0) return new Complex(NaN, NaN); 
        return new Complex((this.real * other.real + this.imag * other.imag) / d,
                           (this.imag * other.real - this.real * other.imag) / d);
    }
    abs() { return Math.sqrt(this.real * this.real + this.imag * this.imag); }

    
    static power(base, exp) {
        let res = new Complex(1, 0);
        if (exp === 0) return res;

        let currentPower = base.clone();
        let positiveExp = Math.abs(exp);

        
        for (let i = 0; i < positiveExp; i++) {
            res = res.multiply(currentPower);
        }

        if (exp < 0) {
            if (res.abs() < 1e-100) return new Complex(NaN, NaN); 
            return (new Complex(1,0)).divide(res);
        }
        return res;
    }

    clone() { return new Complex(this.real, this.imag); }
    arg() { return Math.atan2(this.imag, this.real); }
    equals(other, tol = 1e-9) {
        if (!other) return false;
        return Math.abs(this.real - other.real) < tol && Math.abs(this.imag - other.imag) < tol;
    }
    isFinite() {
        return isFinite(this.real) && isFinite(this.imag);
    }
    
    conjugate() {
        return new Complex(this.real, -this.imag);
    }
    
    negate() {
        return new Complex(-this.real, -this.imag);
    }
}



function complexAdd(z1, z2) { return { re: z1.re + z2.re, im: z1.im + z2.im }; }
function complexSub(z1, z2) { return { re: z1.re - z2.re, im: z1.im - z2.im }; }
function complexMul(z1, z2) { return { re: z1.re * z2.re - z1.im * z2.im, im: z1.re * z2.im + z1.im * z2.re }; }
function complexScalarMul(s, z) { return { re: s * z.re, im: s * z.im }; }
function cosh(x) { return (Math.exp(x) + Math.exp(-x)) / 2; }
function sinh(x) { return (Math.exp(x) - Math.exp(-x)) / 2; }
function complexCos(a, b) { return { re: Math.cos(a) * cosh(b), im: -Math.sin(a) * sinh(b) }; }
function complexSin(a, b) { return { re: Math.sin(a) * cosh(b), im: Math.cos(a) * sinh(b) }; }
function complexExp(a,b) { return { re: Math.exp(a) * Math.cos(b), im: Math.exp(a) * Math.sin(b) }; }

function complexDivide(num, den) {
    const den_sq_mag = den.re * den.re + den.im * den.im;
    const num_sq_mag = num.re * num.re + num.im * num.im;

    if (Math.abs(den_sq_mag) < 1e-30) { 
        if (Math.abs(num_sq_mag) < 1e-30) { 
            return { re: NaN, im: NaN }; 
        }
        
        const large_val = POLE_MAGNITUDE_THRESHOLD * 2; 
        if (Math.abs(num.re) < 1e-15 && Math.abs(num.im) < 1e-15) return {re:0, im:0}; 
        const scale = large_val / Math.sqrt(num_sq_mag); 
        return { re: num.re * scale, im: num.im * scale };
    }
    
    return { re: (num.re * den.re + num.im * den.im) / den_sq_mag, im: (num.im * den.re - num.re * den.im) / den_sq_mag };
}

function complexTan(a, b) { return complexDivide(complexSin(a, b), complexCos(a, b)); }
function complexSec(a, b) { return complexDivide({ re: 1, im: 0 }, complexCos(a, b)); }

function complexLn(a,b) {
    if (a === 0 && b === 0) { return { re: -Infinity, im: 0 }; } 
    const mod = Math.sqrt(a * a + b * b);
    const arg = Math.atan2(b, a); 
    return { re: Math.log(mod), im: arg };
}

function complexReciprocal(a,b) { return complexDivide({re:1, im:0}, {re:a, im:b}); }

function complexPow(base_re, base_im, exp_re, exp_im) {
    
    if (base_re === 0 && base_im === 0) {
        if (exp_re > 0 || (exp_re === 0 && exp_im !== 0)) return { re: 0, im: 0 }; 
        if (exp_re === 0 && exp_im === 0) return { re: 1, im: 0}; 
        
        
    }
    const logBase = complexLn(base_re, base_im);
    
    
    const exponent = {re: exp_re, im: exp_im};
    const product = complexMul(exponent, logBase);
    return complexExp(product.re, product.im);
}


const LANCZOS_G = 7;
const LANCZOS_P = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
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
    for (let n = 1; n <= numTerms; n++) {
        const term = complexPow(n, 0, -a, -b); 
        sum_s = complexAdd(sum_s, term);
    }
    return sum_s;
}

function complexRiemannZeta_EtaSeries(a, b, numTerms) {
    
    if(a === 1 && b === 0) return {re: Infinity, im: NaN}; 

    let eta_s = {re: 0, im: 0};
    for(let n = 1; n <= numTerms; n++){
        const n_pow_minus_s = complexPow(n, 0, -a, -b); 
        let term = n_pow_minus_s;
        if((n - 1) % 2 !== 0){ 
            term = complexScalarMul(-1, term);
        }
        eta_s = complexAdd(eta_s, term);
    }
    
    const one_minus_s_exp = {re: 1 - a, im: -b};
    const two_pow_one_minus_s = complexPow(2, 0, one_minus_s_exp.re, one_minus_s_exp.im);
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

    const denom = complexSub({ re: 1, im: 0 }, complexPow(2, 0, 1 - a, -b));
    if (Math.abs(denom.re) < 1e-14 && Math.abs(denom.im) < 1e-14) {
        return complexRiemannZeta_EtaSeries(a, b, NUM_ZETA_TERMS_ETA_SERIES);
    }

    const hasseRows = getZetaHasseBinomialRows(numLevels);
    let outerSum = { re: 0, im: 0 };

    for (let n = 0; n < numLevels; n++) {
        const row = hasseRows[n];
        let innerSum = { re: 0, im: 0 };

        for (let k = 0; k <= n; k++) {
            const coeff = ((k % 2 === 0) ? 1 : -1) * row[k];
            const term = complexPow(k + 1, 0, -a, -b);
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

    if (!state.zetaContinuationEnabled) {
        if (s.re > ZETA_REFLECTION_POINT_RE) { 
            return complexRiemannZeta_DirectSum(s.re, s.im, NUM_ZETA_TERMS_DIRECT_SUM);
        } else {
            return { re: NaN, im: NaN }; 
        }
    }

    
    if(s.re === 1 && s.im === 0) return {re: Infinity, im: NaN};
    if(s.re === 0 && s.im === 0) return {re: -0.5, im: 0};
    if(s.im === 0 && s.re < 0 && s.re % 2 === 0) return {re: 0, im: 0};

    return complexRiemannZeta_HasseSeries(s.re, s.im, NUM_ZETA_HASSE_LEVELS);
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






function numericDerivativeNthOrder(funcWrapper, zComplex, order, h_base = 1e-5) {
    if (order < 1) return funcWrapper(zComplex); 

    let h = h_base;

    if (order === 1) {
        const f_plus_h = funcWrapper(new Complex(zComplex.real + h, zComplex.imag));
        const f_minus_h = funcWrapper(new Complex(zComplex.real - h, zComplex.imag));
        if (!f_plus_h.isFinite() || !f_minus_h.isFinite()) return new Complex(NaN, NaN);
        return f_plus_h.subtract(f_minus_h).divide(new Complex(2 * h, 0));
    } else if (order === 2) {
        const f_z = funcWrapper(zComplex);
        const f_plus_h = funcWrapper(new Complex(zComplex.real + h, zComplex.imag));
        const f_minus_h = funcWrapper(new Complex(zComplex.real - h, zComplex.imag));
        if (!f_z.isFinite() || !f_plus_h.isFinite() || !f_minus_h.isFinite()) return new Complex(NaN, NaN);
        const term1 = f_plus_h;
        const term2 = f_z.multiply(new Complex(2,0));
        const term3 = f_minus_h;
        return term1.subtract(term2).add(term3).divide(new Complex(h * h, 0));
    } else if (order === 3) {
        const f_p2h = funcWrapper(new Complex(zComplex.real + 2*h, zComplex.imag));
        const f_ph = funcWrapper(new Complex(zComplex.real + h, zComplex.imag));
        const f_mh = funcWrapper(new Complex(zComplex.real - h, zComplex.imag));
        const f_m2h = funcWrapper(new Complex(zComplex.real - 2*h, zComplex.imag));
        if(!f_p2h.isFinite() || !f_ph.isFinite() || !f_mh.isFinite() || !f_m2h.isFinite()) return new Complex(NaN,NaN);
        const t1 = f_p2h;
        const t2 = f_ph.multiply(new Complex(2,0));
        const t3 = f_mh.multiply(new Complex(2,0));
        const t4 = f_m2h;
        return t1.subtract(t2).add(t3).subtract(t4).divide(new Complex(2 * h*h*h, 0));
    } else if (order === 4) {
        const f_p2h = funcWrapper(new Complex(zComplex.real + 2*h, zComplex.imag));
        const f_ph = funcWrapper(new Complex(zComplex.real + h, zComplex.imag));
        const f_z = funcWrapper(zComplex);
        const f_mh = funcWrapper(new Complex(zComplex.real - h, zComplex.imag));
        const f_m2h = funcWrapper(new Complex(zComplex.real - 2*h, zComplex.imag));
        if(!f_p2h.isFinite() || !f_ph.isFinite() || !f_z.isFinite() || !f_mh.isFinite() || !f_m2h.isFinite()) return new Complex(NaN,NaN);
        const t1 = f_p2h;
        const t2 = f_ph.multiply(new Complex(4,0));
        const t3 = f_z.multiply(new Complex(6,0));
        const t4 = f_mh.multiply(new Complex(4,0));
        const t5 = f_m2h;
        return t1.subtract(t2).add(t3).subtract(t4).add(t5).divide(new Complex(h*h*h*h, 0));
    }

    console.warn(`numericDerivativeNthOrder not implemented for order ${order} using general recursive method (less accurate).`);
    if (order > 0) {
        const deriv_n_minus_1_plus_h = numericDerivativeNthOrder(funcWrapper, new Complex(zComplex.real + h, zComplex.imag), order - 1, h);
        const deriv_n_minus_1_minus_h = numericDerivativeNthOrder(funcWrapper, new Complex(zComplex.real - h, zComplex.imag), order - 1, h);
        if (!deriv_n_minus_1_plus_h.isFinite() || !deriv_n_minus_1_minus_h.isFinite()) return new Complex(NaN,NaN);
        return deriv_n_minus_1_plus_h.subtract(deriv_n_minus_1_minus_h).divide(new Complex(2 * h, 0));
    }
    return new Complex(NaN,NaN);
}


function calculateTaylorApproximation(originalTransformFuncKey, zInputComplex, z0Complex, order) {
    const originalTransformFunc = transformFunctions[originalTransformFuncKey];
    if (!originalTransformFunc) {
        console.error("Taylor: Original transform function not found for key:", originalTransformFuncKey);
        return new Complex(NaN, NaN);
    }

    
    
    const funcWrapper = (z_complex) => {
        const res = originalTransformFunc(z_complex.real, z_complex.imag);
        return new Complex(res.re, res.im);
    };

    let seriesSum = new Complex(0, 0);

    for (let n = 0; n <= order; n++) {
        const nthDerivativeAtZ0 = numericDerivativeNthOrder(funcWrapper, z0Complex, n);
        if (!nthDerivativeAtZ0.isFinite()) {
            
            if (n === 0) { 
                return new Complex(NaN, NaN);
            }
            
            
            if (!zInputComplex.equals(z0Complex)) {
                 console.warn(`Taylor: Derivative order ${n} at z0=${z0Complex.real}+${z0Complex.imag}i is not finite: ${nthDerivativeAtZ0.real}+${nthDerivativeAtZ0.imag}i. Term might be non-finite.`);
                
                
                
            }
        }

        const fact_n = factorial(n);
        if (isNaN(fact_n) || fact_n === 0) { 
            console.error("Taylor: Factorial is NaN or zero for n=", n);
            return new Complex(NaN, NaN);
        }

        let z_minus_z0_pow_n;
        if (n === 0) {
            z_minus_z0_pow_n = new Complex(1, 0); 
        } else {
            const z_minus_z0 = zInputComplex.subtract(z0Complex);
            z_minus_z0_pow_n = Complex.power(z_minus_z0, n);
        }

        if (!z_minus_z0_pow_n.isFinite()) {
            
            if (nthDerivativeAtZ0.abs() > 1e-9) { 
                 
            } else { 
                
                
                continue; 
            }
        }

        const derivative_div_factorial = nthDerivativeAtZ0.divide(new Complex(fact_n, 0));
        const term = derivative_div_factorial.multiply(z_minus_z0_pow_n);

        if (!term.isFinite()) {
            if (n === 0 && zInputComplex.equals(z0Complex)) {
                
                return new Complex(NaN, NaN);
            } else if (n > 0 && zInputComplex.equals(z0Complex)) {
                
                
            } else if (term.abs() > POLE_MAGNITUDE_THRESHOLD * 100 && n > 0){
              
              
              
            }
        }
        seriesSum = seriesSum.add(term);
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
