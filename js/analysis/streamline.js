import { state } from '../store/state.js';
import {
    getChainedTransformFunction,
    getMappedTransformProfile,
    evaluateMappedTransform,
    numericDerivative
} from '../math-utils.js';
import {
    STREAMLINE_COLOR_MIN_MAG,
    STREAMLINE_COLOR_MAX_MAG,
    STREAMLINE_COLOR_LOW_MAG,
    STREAMLINE_COLOR_HIGH_MAG,
    COLOR_STREAMLINE
} from '../constants/colors.js';

const ZERO_COMPLEX = Object.freeze({ re: 0, im: 0 });
const ZERO_VECTOR = Object.freeze({ vx: 0, vy: 0 });
const MIN_VECTOR_MAG_SQ = 1e-18;

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteComplex(value) {
    return !!value && isFiniteNumber(value.re) && isFiniteNumber(value.im);
}

function isFiniteVector(value) {
    return !!value && isFiniteNumber(value.vx) && isFiniteNumber(value.vy);
}

function finiteOr(value, fallback) {
    return isFiniteNumber(value) ? value : fallback;
}

function safeComplex(value, fallback = ZERO_COMPLEX) {
    return isFiniteComplex(value) ? value : fallback;
}

function safeVector(value, fallback = ZERO_VECTOR) {
    return isFiniteVector(value) ? value : fallback;
}

function safeEvaluateComplex(evaluate, x, y) {
    if (typeof evaluate !== 'function' || !isFiniteNumber(x) || !isFiniteNumber(y)) {
        return null;
    }

    try {
        const value = evaluate(x, y);
        return isFiniteComplex(value) ? value : null;
    } catch (_error) {
        return null;
    }
}

function vectorFromComplex(value) {
    return isFiniteComplex(value) ? { vx: value.re, vy: value.im } : ZERO_VECTOR;
}

function inverseVectorFromComplex(value) {
    if (!isFiniteComplex(value)) return ZERO_VECTOR;

    const magnitudeSquared = value.re * value.re + value.im * value.im;
    if (!isFiniteNumber(magnitudeSquared) || magnitudeSquared < MIN_VECTOR_MAG_SQ) {
        return ZERO_VECTOR;
    }

    return {
        vx: value.re / magnitudeSquared,
        vy: -value.im / magnitudeSquared
    };
}

function safeDerivativeVector(currentFunctionStr, x, y) {
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return ZERO_VECTOR;

    try {
        return vectorFromComplex(numericDerivative(currentFunctionStr, { re: x, im: y }));
    } catch (_error) {
        return ZERO_VECTOR;
    }
}

function safeEvaluateVector(evaluate, x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState) {
    if (typeof evaluate !== 'function') return ZERO_VECTOR;

    try {
        return safeVector(evaluate(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState));
    } catch (_error) {
        return ZERO_VECTOR;
    }
}

export function getVectorFieldValueAtPoint(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState = state, transformProfile = null) {
    let f_z;
    const isChained = runtimeState.chainingEnabled && runtimeState.chainCount > 1;
    if (isChained) {
        const chainedFunc = getChainedTransformFunction(currentFunctionStr);
        f_z = safeEvaluateComplex(chainedFunc, x, y);
    } else {
        const profile = transformProfile || getMappedTransformProfile(currentFunctionStr);
        if (!profile || !profile.transformFunc) {
            return { re: 0, im: 0 };
        }
        try {
            f_z = evaluateMappedTransform(profile, x, y, currentFunctionStr);
        } catch (_error) {
            f_z = null;
        }
    }

    if (!isFiniteComplex(f_z)) {
        return { re: 0, im: 0 };
    }

    switch (vectorFieldTypeStr) {
        case 'f(z)':
            return { re: f_z.re, im: f_z.im };
        case '1/f(z)': {
            const magnitudeSquared = f_z.re * f_z.re + f_z.im * f_z.im;
            if (!isFiniteNumber(magnitudeSquared) || magnitudeSquared < MIN_VECTOR_MAG_SQ) {
                return { re: 0, im: 0 };
            }
            return {
                re: f_z.re / magnitudeSquared,
                im: -f_z.im / magnitudeSquared
            };
        }
        case "f'(z)": {
            if (!isChained) {
                const profile = transformProfile || getMappedTransformProfile(currentFunctionStr);
                if (profile && profile.isConstant) {
                    return { re: 0, im: 0 };
                }
            }
            const derivative = safeDerivativeVector(currentFunctionStr, x, y);
            return { re: derivative.vx, im: derivative.vy };
        }
        default:
            return { re: 0, im: 0 };
    }
}

export function getVectorForStreamline(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState = state) {
    const vector = getVectorFieldValueAtPoint(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState);
    return { vx: vector.re, vy: vector.im };
}

export function getVectorEvaluator(currentFunctionStr, vectorFieldTypeStr, runtimeState = state) {
    const isChained = runtimeState.chainingEnabled && runtimeState.chainCount > 1;
    let evalFunc;
    
    if (isChained) {
        const chainedFunc = getChainedTransformFunction(currentFunctionStr);
        evalFunc = (x, y) => safeEvaluateComplex(chainedFunc, x, y);
    } else {
        const profile = getMappedTransformProfile(currentFunctionStr);
        if (!profile || !profile.transformFunc) {
            evalFunc = () => ZERO_COMPLEX;
        } else if (profile.isConstant && profile.constantValue) {
            const val = safeComplex(profile.constantValue);
            evalFunc = () => val;
        } else {
            evalFunc = (x, y) => {
                try {
                    return safeComplex(
                        evaluateMappedTransform(profile, x, y, currentFunctionStr),
                        null
                    );
                } catch (_error) {
                    return null;
                }
            };
        }
    }
    
    switch (vectorFieldTypeStr) {
        case 'f(z)':
            return (x, y) => {
                const f_z = evalFunc(x, y);
                return vectorFromComplex(f_z);
            };
        case '1/f(z)':
            return (x, y) => {
                const f_z = evalFunc(x, y);
                return inverseVectorFromComplex(f_z);
            };
        case "f'(z)": {
            const isChainedVal = isChained;
            const profile = isChainedVal ? null : getMappedTransformProfile(currentFunctionStr);
            const isConstant = profile && profile.isConstant;
            
            return (x, y) => {
                if (!isChainedVal && isConstant) {
                    return ZERO_VECTOR;
                }
                return safeDerivativeVector(currentFunctionStr, x, y);
            };
        }
        default:
            return () => ZERO_VECTOR;
    }
}


export function calculateStreamline(startX, startY, getVectorAtPointCallback, zPlaneParams, state, options = null) {
    const streamlinePoints = [];
    let currentX = startX;
    let currentY = startY;

    const xMin = zPlaneParams.currentVisXRange[0];
    const xMax = zPlaneParams.currentVisXRange[1];
    const yMin = zPlaneParams.currentVisYRange[0];
    const yMax = zPlaneParams.currentVisYRange[1];

    // Scale step size to viewport so it works at any zoom level
    const viewSpan = Math.max(xMax - xMin, yMax - yMin);
    const step = state.streamlineStepSize * viewSpan * 0.1;
    const requestedMaxLength = Math.max(0, Math.floor(finiteOr(state.streamlineMaxLength, 0)));
    const optionMaxSteps = options && isFiniteNumber(options.maxSteps)
        ? Math.max(0, Math.floor(options.maxSteps))
        : requestedMaxLength;
    const maxLength = Math.min(requestedMaxLength, optionMaxSteps);
    const shouldContinue = options && typeof options.shouldContinue === 'function'
        ? options.shouldContinue
        : null;

    if (
        maxLength <= 0 ||
        !isFiniteNumber(step) ||
        step <= 0 ||
        ![currentX, currentY, xMin, xMax, yMin, yMax].every(isFiniteNumber)
    ) {
        return streamlinePoints;
    }

    for (let i = 0; i < maxLength; i++) {
        if (!isFiniteNumber(currentX) || !isFiniteNumber(currentY)) break;
        if (shouldContinue && i > 0 && (i & 7) === 0 && !shouldContinue()) break;
        if (currentX < xMin || currentX > xMax || currentY < yMin || currentY > yMax) break;

        const k1 = safeEvaluateVector(
            getVectorAtPointCallback,
            currentX,
            currentY,
            state.currentFunction,
            state.vectorFieldFunction,
            state
        );
        const k1Mag = Math.hypot(k1.vx, k1.vy);

        if (!isFiniteNumber(k1Mag) || k1Mag < 1e-9) break;
        streamlinePoints.push({ x: currentX, y: currentY, magnitude: k1Mag });

        // Normalize direction — streamlines trace direction, not speed.
        // This prevents explosion when |f(z)| is large (e.g. sinh terms at wide zoom).
        const k1nx = k1.vx / k1Mag, k1ny = k1.vy / k1Mag;

        const midX = currentX + k1nx * step * 0.5;
        const midY = currentY + k1ny * step * 0.5;
        if (!isFiniteNumber(midX) || !isFiniteNumber(midY)) break;

        const k2 = safeEvaluateVector(
            getVectorAtPointCallback,
            midX,
            midY,
            state.currentFunction,
            state.vectorFieldFunction,
            state
        );
        const k2Mag = Math.hypot(k2.vx, k2.vy);

        if (!isFiniteNumber(k2Mag) || k2Mag < 1e-9) {
            currentX += k1nx * step;
            currentY += k1ny * step;
        } else {
            currentX += (k2.vx / k2Mag) * step;
            currentY += (k2.vy / k2Mag) * step;
        }
    }

    return streamlinePoints;
}

export function getStreamlineColorByMagnitude(magnitude) {
    let t = (magnitude - STREAMLINE_COLOR_MIN_MAG) / (STREAMLINE_COLOR_MAX_MAG - STREAMLINE_COLOR_MIN_MAG);
    t = Math.max(0, Math.min(1, t)); 

    const r = Math.round(STREAMLINE_COLOR_LOW_MAG.r * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.r * t);
    const g = Math.round(STREAMLINE_COLOR_LOW_MAG.g * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.g * t);
    const b = Math.round(STREAMLINE_COLOR_LOW_MAG.b * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.b * t);

    let alpha = 0.75; 
    try {
        const parts = COLOR_STREAMLINE.substring(COLOR_STREAMLINE.indexOf('(') + 1, COLOR_STREAMLINE.lastIndexOf(')')).split(/,\s*/);
        if (parts.length === 4) {
            alpha = parseFloat(parts[3]);
        }
    } catch (e) {
        // Fallback
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
