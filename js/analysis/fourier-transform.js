// Fourier Transform Analysis Module
// Handles time domain signal generation and Fourier transform calculations

/**
 * Generate time domain signal
 * @param {string} funcType - Type of signal function
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Signal amplitude
 * @param {number} timeWindow - Time window in seconds
 * @param {number} samples - Number of samples
 * @returns {Array} Array of {t, value} objects
 */
function generateTimeDomainSignal(funcType, frequency, amplitude, timeWindow, samples) {
    const signal = [];
    const dt = timeWindow / samples;
    const omega = 2 * Math.PI * frequency;
    
    for (let i = 0; i < samples; i++) {
        const t = i * dt;
        let value = 0;
        
        switch(funcType) {
            // Basic waves
            case 'sine':
                value = amplitude * Math.sin(omega * t);
                break;
            case 'cosine':
                value = amplitude * Math.cos(omega * t);
                break;
            case 'square':
                value = amplitude * Math.sign(Math.sin(omega * t));
                break;
            case 'sawtooth':
                value = amplitude * (2 * ((omega * t / (2 * Math.PI)) % 1) - 1);
                break;
            case 'triangle': {
                const phase = (omega * t / (2 * Math.PI)) % 1;
                value = amplitude * (4 * Math.abs(phase - 0.5) - 1);
                break;
            }
            
            // Modulated signals
            case 'am': { // Amplitude Modulation
                const carrier = omega;
                const modulation = omega / 4;
                value = amplitude * (1 + 0.5 * Math.sin(modulation * t)) * Math.sin(carrier * t);
                break;
            }
            case 'fm': { // Frequency Modulation
                const modulationIndex = 2;
                const modFreq = omega / 5;
                value = amplitude * Math.sin(omega * t + modulationIndex * Math.sin(modFreq * t));
                break;
            }
            case 'chirp': { // Frequency Sweep
                const startFreq = omega;
                const endFreq = omega * 3;
                const instantFreq = startFreq + (endFreq - startFreq) * (t / timeWindow);
                value = amplitude * Math.sin(instantFreq * t);
                break;
            }
            
            // Transient signals
            case 'damped_sine': { // Damped sine
                const dampingFactor = 1.5 / timeWindow;
                value = amplitude * Math.exp(-dampingFactor * t) * Math.sin(omega * t);
                break;
            }
            case 'exponential': { // Exponential decay
                const decayRate = 2 / timeWindow;
                value = amplitude * Math.exp(-decayRate * t);
                break;
            }
            case 'gaussian': { // Gaussian pulse
                const sigma = timeWindow / 8;
                const center = timeWindow / 2;
                value = amplitude * Math.exp(-Math.pow(t - center, 2) / (2 * sigma * sigma));
                break;
            }
            case 'pulse': { // Rectangular pulse
                const pulseStart = timeWindow * 0.3;
                const pulseEnd = timeWindow * 0.7;
                value = (t >= pulseStart && t <= pulseEnd) ? amplitude : 0;
                break;
            }
            
            // Complex waveforms
            case 'harmonics': { // Harmonic series
                value = 0;
                for (let h = 1; h <= 5; h++) {
                    value += (amplitude / h) * Math.sin(h * omega * t);
                }
                break;
            }
            case 'beat': { // Beat frequency
                const freq1 = omega;
                const freq2 = omega * 1.1;
                value = amplitude * 0.5 * (Math.sin(freq1 * t) + Math.sin(freq2 * t));
                break;
            }
            case 'noise': // White noise
                value = amplitude * (2 * Math.random() - 1);
                break;
                
            default:
                value = amplitude * Math.sin(omega * t);
        }
        
        signal.push({ t, value });
    }
    
    return signal;
}

/**
 * Compute Discrete Fourier Transform (DFT)
 * @param {Array} signal - Array of time domain values
 * @returns {Array} Array of {frequency, real, imag, magnitude, phase} objects
 */
function computeDFT(signal) {
    if (!signal || signal.length === 0) return [];
    
    // Extract real values
    const values = signal.map(s => s.value);
    
    // Perform FFT
    const fftResult = math.fft(values);
    
    const N = signal.length;
    const dft = [];
    
    for (let k = 0; k < fftResult.length; k++) {
        const comp = fftResult[k];
        
        // Normalize by N
        const real = (comp.re || 0) / N;
        const imag = (comp.im || 0) / N;
        
        const magnitude = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);
        
        // Frequency in Hz (assuming sample rate matches time window)
        const frequency = k;
        
        dft.push({
            k: k,
            frequency: frequency,
            real: real,
            imag: imag,
            magnitude: magnitude,
            phase: phase
        });
    }
    
    return dft;
}

/**
 * Update Fourier transform calculations
 * Called when parameters change or when entering Fourier mode
 */
function updateFourierTransform() {
    if (!state.fourierModeEnabled) return;
    
    // Ensure all Fourier parameters have valid values
    const funcType = state.fourierFunction || 'sine';
    const frequency = state.fourierFrequency || 1.0;
    const amplitude = state.fourierAmplitude || 1.0;
    const timeWindow = state.fourierTimeWindow || 4.0;
    const samples = state.fourierSamples || 128;
    
    // Generate time domain signal
    state.fourierTimeDomainSignal = generateTimeDomainSignal(
        funcType,
        frequency,
        amplitude,
        timeWindow,
        samples
    );
    
    // Compute DFT
    if (state.fourierTimeDomainSignal && state.fourierTimeDomainSignal.length > 0) {
        state.fourierDFTResult = computeDFT(state.fourierTimeDomainSignal);
    } else {
        console.error('Failed to generate time domain signal');
        state.fourierDFTResult = [];
    }
}
