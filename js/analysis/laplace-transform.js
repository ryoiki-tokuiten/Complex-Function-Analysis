// Laplace Transform Analysis Module
// Handles time domain signal generation and Laplace transform calculations
// F(s) = ∫₀^∞ f(t)e^(-st) dt where s = σ + jω

/**
 * Generate time domain signal for Laplace analysis
 * @param {string} funcType - Type of signal function
 * @param {number} frequency - Frequency parameter (ω)
 * @param {number} damping - Damping parameter (σ)
 * @param {number} amplitude - Signal amplitude
 * @param {number} timeWindow - Time window in seconds
 * @param {number} samples - Number of samples
 * @returns {Array} Array of {t, value} objects
 */
function generateLaplaceTimeDomainSignal(funcType, frequency, damping, amplitude, timeWindow, samples) {
    const signal = [];
    const dt = timeWindow / samples;
    const omega = 2 * Math.PI * frequency;
    
    for (let i = 0; i < samples; i++) {
        const t = i * dt;
        let value = 0;
        
        switch(funcType) {
            case 'step': // Unit step u(t)
                value = amplitude;
                break;
                
            case 'exponential': // Exponential decay e^(-at)
                value = amplitude * Math.exp(-damping * t);
                break;
                
            case 'sine': // Sine wave
                value = amplitude * Math.sin(omega * t);
                break;
                
            case 'cosine': // Cosine wave
                value = amplitude * Math.cos(omega * t);
                break;
                
            case 'damped_sine': // Damped sine: e^(-σt)·sin(ωt)
                value = amplitude * Math.exp(-damping * t) * Math.sin(omega * t);
                break;
                
            case 'damped_cosine': // Damped cosine: e^(-σt)·cos(ωt)
                value = amplitude * Math.exp(-damping * t) * Math.cos(omega * t);
                break;
                
            case 'ramp': // Ramp function: t·u(t)
                value = amplitude * t;
                break;
                
            case 'impulse': // Impulse (approximated as very narrow pulse)
                value = (t < dt * 2) ? amplitude / dt : 0;
                break;
                
            case 'exponential_sine': // e^(at)·sin(ωt) - growing oscillation
                value = amplitude * Math.exp(damping * 0.3 * t) * Math.sin(omega * t);
                break;
                
            case 'underdamped': // Underdamped system (ζ < 1)
                const zeta = 0.3; // damping ratio
                const wd = omega * Math.sqrt(1 - zeta * zeta);
                value = amplitude * Math.exp(-zeta * omega * t) * Math.sin(wd * t);
                break;
                
            case 'critically_damped': // Critically damped (ζ = 1)
                value = amplitude * (1 + omega * t) * Math.exp(-omega * t);
                break;
                
            case 'overdamped': // Overdamped (ζ > 1)
                const zeta2 = 1.5;
                const term1 = Math.exp((-zeta2 + Math.sqrt(zeta2 * zeta2 - 1)) * omega * t);
                const term2 = Math.exp((-zeta2 - Math.sqrt(zeta2 * zeta2 - 1)) * omega * t);
                value = amplitude * 0.5 * (term1 + term2);
                break;
                
            default:
                value = amplitude * Math.exp(-damping * t) * Math.sin(omega * t);
        }
        
        signal.push({ t, value });
    }
    
    return signal;
}

/**
 * Compute closed-form Laplace Transform for known functions
 * @param {string} funcType - Type of signal
 * @param {number} sigmaS - Real part of s
 * @param {number} omegaS - Imaginary part of s
 * @param {Object} params - Additional parameters (frequency, damping, amplitude)
 * @returns {Object} {real, imag, magnitude, phase} or null if no closed form
 */
function computeClosedFormLaplace(funcType, sigmaS, omegaS, params) {
    const { frequency, damping, amplitude } = params;
    const omega = 2 * Math.PI * frequency;
    const a = damping;
    
    // s = σ + jω
    const s_real = sigmaS;
    const s_imag = omegaS;
    
    let F_real = 0;
    let F_imag = 0;
    
    switch(funcType) {
        case 'step': // L{u(t)} = 1/s
            // F(s) = 1/s = 1/(σ + jω) = (σ - jω)/(σ² + ω²)
            const denom_step = s_real * s_real + s_imag * s_imag;
            if (denom_step > 0.001) {
                F_real = amplitude * s_real / denom_step;
                F_imag = -amplitude * s_imag / denom_step;
            }
            break;
            
        case 'exponential': // L{e^(-at)} = 1/(s+a)
            const s_plus_a_real = s_real + a;
            const s_plus_a_imag = s_imag;
            const denom_exp = s_plus_a_real * s_plus_a_real + s_plus_a_imag * s_plus_a_imag;
            if (denom_exp > 0.001) {
                F_real = amplitude * s_plus_a_real / denom_exp;
                F_imag = -amplitude * s_plus_a_imag / denom_exp;
            }
            break;
            
        case 'sine': // L{sin(ωt)} = ω/(s² + ω²)
            const s_sq = s_real * s_real - s_imag * s_imag;
            const s_sq_imag = 2 * s_real * s_imag;
            const denom_real = s_sq + omega * omega;
            const denom_imag = s_sq_imag;
            const denom_mag_sq = denom_real * denom_real + denom_imag * denom_imag;
            if (denom_mag_sq > 0.001) {
                F_real = amplitude * omega * denom_real / denom_mag_sq;
                F_imag = -amplitude * omega * denom_imag / denom_mag_sq;
            }
            break;
            
        case 'cosine': // L{cos(ωt)} = s/(s² + ω²)
            const s_sq_cos = s_real * s_real - s_imag * s_imag;
            const s_sq_imag_cos = 2 * s_real * s_imag;
            const denom_real_cos = s_sq_cos + omega * omega;
            const denom_imag_cos = s_sq_imag_cos;
            const denom_mag_sq_cos = denom_real_cos * denom_real_cos + denom_imag_cos * denom_imag_cos;
            if (denom_mag_sq_cos > 0.001) {
                // Numerator is s = σ + jω
                const num_real = s_real * denom_real_cos + s_imag * denom_imag_cos;
                const num_imag = s_imag * denom_real_cos - s_real * denom_imag_cos;
                F_real = amplitude * num_real / denom_mag_sq_cos;
                F_imag = amplitude * num_imag / denom_mag_sq_cos;
            }
            break;
            
        case 'damped_sine': // L{e^(-at)sin(ωt)} = ω/((s+a)² + ω²)
            const s_plus_a_ds_real = s_real + a;
            const s_plus_a_ds_imag = s_imag;
            const sq_real = s_plus_a_ds_real * s_plus_a_ds_real - s_plus_a_ds_imag * s_plus_a_ds_imag;
            const sq_imag = 2 * s_plus_a_ds_real * s_plus_a_ds_imag;
            const denom_ds_real = sq_real + omega * omega;
            const denom_ds_imag = sq_imag;
            const denom_ds_mag_sq = denom_ds_real * denom_ds_real + denom_ds_imag * denom_ds_imag;
            if (denom_ds_mag_sq > 0.001) {
                F_real = amplitude * omega * denom_ds_real / denom_ds_mag_sq;
                F_imag = -amplitude * omega * denom_ds_imag / denom_ds_mag_sq;
            }
            break;
            
        case 'damped_cosine': // L{e^(-at)cos(ωt)} = (s+a)/((s+a)² + ω²)
            const s_plus_a_dc_real = s_real + a;
            const s_plus_a_dc_imag = s_imag;
            const sq_dc_real = s_plus_a_dc_real * s_plus_a_dc_real - s_plus_a_dc_imag * s_plus_a_dc_imag;
            const sq_dc_imag = 2 * s_plus_a_dc_real * s_plus_a_dc_imag;
            const denom_dc_real = sq_dc_real + omega * omega;
            const denom_dc_imag = sq_dc_imag;
            const denom_dc_mag_sq = denom_dc_real * denom_dc_real + denom_dc_imag * denom_dc_imag;
            if (denom_dc_mag_sq > 0.001) {
                const num_dc_real = s_plus_a_dc_real * denom_dc_real + s_plus_a_dc_imag * denom_dc_imag;
                const num_dc_imag = s_plus_a_dc_imag * denom_dc_real - s_plus_a_dc_real * denom_dc_imag;
                F_real = amplitude * num_dc_real / denom_dc_mag_sq;
                F_imag = amplitude * num_dc_imag / denom_dc_mag_sq;
            }
            break;
            
        case 'ramp': // L{t·u(t)} = 1/s²
            const s_sq_ramp = s_real * s_real - s_imag * s_imag;
            const s_sq_imag_ramp = 2 * s_real * s_imag;
            const denom_ramp_mag_sq = s_sq_ramp * s_sq_ramp + s_sq_imag_ramp * s_sq_imag_ramp;
            if (denom_ramp_mag_sq > 0.001) {
                F_real = amplitude * s_sq_ramp / denom_ramp_mag_sq;
                F_imag = -amplitude * s_sq_imag_ramp / denom_ramp_mag_sq;
            }
            break;
            
        case 'impulse': // L{δ(t)} = 1
            F_real = amplitude;
            F_imag = 0;
            break;
            
        default:
            // Use numerical integration for others
            return null;
    }
    
    const magnitude = Math.sqrt(F_real * F_real + F_imag * F_imag);
    const phase = Math.atan2(F_imag, F_real);
    
    return { real: F_real, imag: F_imag, magnitude, phase };
}

/**
 * Compute Laplace Transform numerically using Simpson's rule
 * F(s) = ∫₀^∞ f(t)e^(-st) dt
 * @param {Array} signal - Time domain signal
 * @param {number} sigmaS - Real part of s
 * @param {number} omegaS - Imaginary part of s
 * @param {number} timeWindow - Time window
 * @returns {Object} {real, imag, magnitude, phase}
 */
function computeNumericalLaplace(signal, sigmaS, omegaS, timeWindow) {
    const N = signal.length;
    const dt = timeWindow / N;
    
    let F_real = 0;
    let F_imag = 0;
    
    // Simpson's rule: ∫f(x)dx ≈ (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + f(xₙ)]
    for (let i = 0; i < N; i++) {
        const t = signal[i].t;
        const f_t = signal[i].value;
        
        // e^(-st) = e^(-(σ+jω)t) = e^(-σt)[cos(ωt) - j·sin(ωt)]
        const exp_sigma_t = Math.exp(-sigmaS * t);
        const cos_omega_t = Math.cos(omegaS * t);
        const sin_omega_t = Math.sin(omegaS * t);
        
        const integrand_real = f_t * exp_sigma_t * cos_omega_t;
        const integrand_imag = -f_t * exp_sigma_t * sin_omega_t;
        
        // Simpson's rule coefficients
        let coeff = 1;
        if (i === 0 || i === N - 1) {
            coeff = 1;
        } else if (i % 2 === 1) {
            coeff = 4;
        } else {
            coeff = 2;
        }
        
        F_real += coeff * integrand_real;
        F_imag += coeff * integrand_imag;
    }
    
    F_real *= dt / 3;
    F_imag *= dt / 3;
    
    const magnitude = Math.sqrt(F_real * F_real + F_imag * F_imag);
    const phase = Math.atan2(F_imag, F_real);
    
    return { real: F_real, imag: F_imag, magnitude, phase };
}

/**
 * Compute Laplace transform over a grid of s values for 3D surface
 * @param {string} funcType - Function type
 * @param {Object} params - Parameters {frequency, damping, amplitude}
 * @param {Array} signal - Time domain signal (for numerical fallback)
 * @param {number} timeWindow - Time window
 * @param {Object} grid - {sigmaRange, omegaRange, sigmaSteps, omegaSteps}
 * @returns {Array} Grid of {sigma, omega, magnitude, phase} values
 */
function computeLaplaceSurface(funcType, params, signal, timeWindow, grid) {
    const { sigmaRange, omegaRange, sigmaSteps, omegaSteps } = grid;
    const surface = [];
    
    const dSigma = (sigmaRange[1] - sigmaRange[0]) / sigmaSteps;
    const dOmega = (omegaRange[1] - omegaRange[0]) / omegaSteps;
    
    for (let i = 0; i <= sigmaSteps; i++) {
        for (let j = 0; j <= omegaSteps; j++) {
            const sigma = sigmaRange[0] + i * dSigma;
            const omega = omegaRange[0] + j * dOmega;
            
            // Try closed form first
            let result = computeClosedFormLaplace(funcType, sigma, omega, params);
            
            // Fallback to numerical if no closed form
            if (!result && signal) {
                result = computeNumericalLaplace(signal, sigma, omega, timeWindow);
            }
            
            if (result) {
                surface.push({
                    sigma,
                    omega,
                    magnitude: result.magnitude,
                    phase: result.phase,
                    real: result.real,
                    imag: result.imag
                });
            }
        }
    }
    
    return surface;
}

/**
 * Find poles and zeros from analytical formulas
 * @param {string} funcType - Function type
 * @param {Object} params - Parameters
 * @returns {Object} {poles: Array, zeros: Array}
 */
function findPolesZeros(funcType, params) {
    const { frequency, damping } = params;
    const omega = 2 * Math.PI * frequency;
    const a = damping;
    
    const poles = [];
    const zeros = [];
    
    switch(funcType) {
        case 'step': // F(s) = 1/s → pole at s = 0
            poles.push({ sigma: 0, omega: 0, label: 's = 0' });
            break;
            
        case 'exponential': // F(s) = 1/(s+a) → pole at s = -a
            poles.push({ sigma: -a, omega: 0, label: `s = ${-a.toFixed(2)}` });
            break;
            
        case 'sine': // F(s) = ω/(s² + ω²) → poles at s = ±jω
            poles.push({ sigma: 0, omega: omega, label: `s = j${omega.toFixed(2)}` });
            poles.push({ sigma: 0, omega: -omega, label: `s = -j${omega.toFixed(2)}` });
            zeros.push({ sigma: 0, omega: 0, label: 's = 0' });
            break;
            
        case 'cosine': // F(s) = s/(s² + ω²) → poles at s = ±jω
            poles.push({ sigma: 0, omega: omega, label: `s = j${omega.toFixed(2)}` });
            poles.push({ sigma: 0, omega: -omega, label: `s = -j${omega.toFixed(2)}` });
            break;
            
        case 'damped_sine': // F(s) = ω/((s+a)² + ω²) → poles at s = -a ± jω
            poles.push({ sigma: -a, omega: omega, label: `s = ${-a.toFixed(2)} + j${omega.toFixed(2)}` });
            poles.push({ sigma: -a, omega: -omega, label: `s = ${-a.toFixed(2)} - j${omega.toFixed(2)}` });
            break;
            
        case 'damped_cosine': // F(s) = (s+a)/((s+a)² + ω²)
            poles.push({ sigma: -a, omega: omega, label: `s = ${-a.toFixed(2)} + j${omega.toFixed(2)}` });
            poles.push({ sigma: -a, omega: -omega, label: `s = ${-a.toFixed(2)} - j${omega.toFixed(2)}` });
            zeros.push({ sigma: -a, omega: 0, label: `s = ${-a.toFixed(2)}` });
            break;
            
        case 'ramp': // F(s) = 1/s² → double pole at s = 0
            poles.push({ sigma: 0, omega: 0, label: 's = 0 (×2)', order: 2 });
            break;
            
        case 'impulse': // F(s) = 1 → no poles or zeros
            break;
    }
    
    return { poles, zeros };
}

/**
 * Analyze system stability based on pole locations
 * @param {Array} poles - Array of pole objects
 * @returns {Object} {stable, message, marginally_stable}
 */
function analyzeStability(poles) {
    if (!poles || poles.length === 0) {
        return { stable: true, message: 'No poles detected', marginally_stable: false };
    }
    
    let maxRealPart = -Infinity;
    let hasPolesOnAxis = false;
    
    for (const pole of poles) {
        if (pole.sigma > maxRealPart) {
            maxRealPart = pole.sigma;
        }
        if (Math.abs(pole.sigma) < 0.01) { // Near imaginary axis
            hasPolesOnAxis = true;
        }
    }
    
    if (maxRealPart < -0.01) {
        return {
            stable: true,
            message: '✓ STABLE: All poles in left-half plane',
            marginally_stable: false,
            color: 'rgba(100, 255, 150, 1)'
        };
    } else if (maxRealPart > 0.01) {
        return {
            stable: false,
            message: '✗ UNSTABLE: Poles in right-half plane',
            marginally_stable: false,
            color: 'rgba(255, 100, 100, 1)'
        };
    } else {
        return {
            stable: false,
            message: '⚠ MARGINALLY STABLE: Poles on jω axis',
            marginally_stable: true,
            color: 'rgba(255, 220, 100, 1)'
        };
    }
}

/**
 * Compute Region of Convergence (ROC) boundaries
 * @param {Array} poles - Array of poles
 * @returns {Object} {rocType, boundary, description}
 */
function computeROC(poles) {
    if (!poles || poles.length === 0) {
        return {
            rocType: 'entire',
            boundary: null,
            description: 'Entire s-plane (no poles)'
        };
    }
    
    // Find rightmost pole (determines ROC for causal signals)
    let rightmostSigma = -Infinity;
    for (const pole of poles) {
        if (pole.sigma > rightmostSigma) {
            rightmostSigma = pole.sigma;
        }
    }
    
    return {
        rocType: 'right_half',
        boundary: rightmostSigma,
        description: `ROC: σ > ${rightmostSigma.toFixed(2)} (right-sided signal)`
    };
}

/**
 * Update ONLY the evaluation point (fast - for slider interaction)
 * Called when σ or ω changes
 */
function updateLaplaceEvaluationPoint() {
    if (!state.laplaceModeEnabled) return;
    
    const funcType = state.laplaceFunction || 'damped_sine';
    const frequency = state.laplaceFrequency || 2.0;
    const damping = state.laplaceDamping || 0.5;
    const amplitude = state.laplaceAmplitude || 1.0;
    const timeWindow = 5.0;
    
    const sigma = state.laplaceSigma || 0;
    const omega = state.laplaceOmega || 1;
    
    // Quick evaluation at current s point
    let result = computeClosedFormLaplace(funcType, sigma, omega, { frequency, damping, amplitude });
    if (!result && state.laplaceTimeDomainSignal) {
        result = computeNumericalLaplace(state.laplaceTimeDomainSignal, sigma, omega, timeWindow);
    }
    state.laplaceCurrentValue = result;
}

/**
 * Update Laplace transform calculations (full recompute - expensive!)
 * Only call when signal parameters change, not when exploring s-plane
 */
function updateLaplaceTransform() {
    if (!state.laplaceModeEnabled) return;
    
    const funcType = state.laplaceFunction || 'damped_sine';
    const frequency = state.laplaceFrequency || 2.0;
    const damping = state.laplaceDamping || 0.5;
    const amplitude = state.laplaceAmplitude || 1.0;
    const timeWindow = 5.0; // Fixed time window for Laplace
    const samples = 256;
    
    try {
        // Generate time domain signal
        state.laplaceTimeDomainSignal = generateLaplaceTimeDomainSignal(
            funcType, frequency, damping, amplitude, timeWindow, samples
        );
        
        // Find poles and zeros
        const pz = findPolesZeros(funcType, { frequency, damping, amplitude });
        state.laplacePoles = pz.poles;
        state.laplaceZeros = pz.zeros;
        
        // Compute ROC
        state.laplaceROC = computeROC(pz.poles);
        
        // Analyze stability
        state.laplaceStability = analyzeStability(pz.poles);
        
        // Compute surface for 3D visualization with higher resolution
        const grid = {
            sigmaRange: [-3, 2],
            omegaRange: [-10, 10],
            sigmaSteps: 70,  // Increased for smoother surface
            omegaSteps: 70   // Increased for smoother surface
        };
        
        state.laplaceSurface = computeLaplaceSurface(
            funcType,
            { frequency, damping, amplitude },
            state.laplaceTimeDomainSignal,
            timeWindow,
            grid
        );
        
        // Also update evaluation point
        updateLaplaceEvaluationPoint();
        
    } catch (error) {
        console.error('Error in updateLaplaceTransform:', error);
        state.laplaceTimeDomainSignal = [];
        state.laplacePoles = [];
        state.laplaceZeros = [];
    }
}
