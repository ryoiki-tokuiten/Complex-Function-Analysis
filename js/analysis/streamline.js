// js/analysis/streamline.js

function getVectorForStreamline(x, y, currentFunctionStr, vectorFieldTypeStr, state) {
    const z = { re: x, im: y };
    let f_z;

    // Get the primary function definition
    const funcDefinition = transformFunctions[currentFunctionStr];
    if (!funcDefinition) {
        // console.error(`Streamline: Unknown function ${currentFunctionStr}`);
        return { vx: 0, vy: 0 }; // Should not happen if UI is synced
    }

    // Calculate f(z) based on the current function
    // This might involve state for polynomial coefficients or Mobius params
    // For simplicity, we assume funcDefinition handles this if it's complex like polynomial
    // For functions like polynomial, mobius, zeta, the transformFunctions entry is an object
    // with a 'func' property. For simpler functions, it's the function itself.
    let baseFunc;
    if (typeof funcDefinition === 'function') {
        baseFunc = funcDefinition;
    } else if (funcDefinition && typeof funcDefinition.func === 'function') {
        baseFunc = funcDefinition.func; // For polynomial, mobius, etc.
    } else {
        // console.error(`Streamline: Invalid function definition for ${currentFunctionStr}`);
        return { vx: 0, vy: 0 };
    }

    try {
        f_z = baseFunc(z.re, z.im, state); // Pass state for functions that need it (e.g. polynomial coeffs)
    } catch (e) {
        // console.error(`Error calculating f(z) for streamline: ${e}`);
        return { vx: 0, vy: 0 }; // Error in calculation
    }


    if (f_z === undefined || f_z === null || isNaN(f_z.re) || isNaN(f_z.im) || !isFinite(f_z.re) || !isFinite(f_z.im)) {
        return { vx: 0, vy: 0 }; // Undefined or non-finite result
    }

    let vector = { vx: 0, vy: 0 };

    switch (vectorFieldTypeStr) {
        case 'f(z)':
            vector.vx = f_z.re;
            vector.vy = f_z.im;
            break;
        case '1/f(z)':
            const magSq_f_z = f_z.re * f_z.re + f_z.im * f_z.im;
            if (magSq_f_z < 1e-12) { // Avoid division by zero if f(z) is very small
                return { vx: 0, vy: 0 }; // Or a very large vector, but 0,0 is safer
            }
            vector.vx = f_z.re / magSq_f_z;
            vector.vy = -f_z.im / magSq_f_z; // Conjugate for reciprocal
            break;
        case "f'(z)": // Note: Corrected the case to match the string in select dropdown
            // Note: numericDerivative needs the function string, not the evaluated f_z
            // It also needs access to the state for functions like polynomial.
            const deriv = numericDerivative(currentFunctionStr, z, state); // Pass state to numericDerivative
            if (deriv === undefined || deriv === null || isNaN(deriv.re) || isNaN(deriv.im) || !isFinite(deriv.re) || !isFinite(deriv.im)) {
                return { vx: 0, vy: 0 };
            }
            vector.vx = deriv.re;
            vector.vy = deriv.im;
            break;
        default:
            // console.warn(`Streamline: Unknown vector field type ${vectorFieldTypeStr}`);
            return { vx: 0, vy: 0 };
    }

    // Normalize the vector to prevent extremely fast steps in strong fields
    // This is optional but can make for more uniform streamlines.
    // However, for true field representation, non-normalized is better.
    // Let's skip normalization for now to represent true field strength.
    // const mag = Math.sqrt(vector.vx * vector.vx + vector.vy * vector.vy);
    // if (mag > 1e-6) {
    //     vector.vx /= mag;
    //     vector.vy /= mag;
    // }

    return vector;
}

// Removed maxSteps and stepSize from signature, will use state.streamlineMaxLength and state.streamlineStepSize
function calculateStreamline(startX, startY, getVectorAtPointCallback, zPlaneParams, state) {
    const streamlinePoints = [];
    let currentX = startX;
    let currentY = startY;

    const xMin = zPlaneParams.currentVisXRange[0];
    const xMax = zPlaneParams.currentVisXRange[1];
    const yMin = zPlaneParams.currentVisYRange[0]; // Y range is often inverted in canvas
    const yMax = zPlaneParams.currentVisYRange[1];

    for (let i = 0; i < state.streamlineMaxLength; i++) { // Use state.streamlineMaxLength
        // Get the vector (k1) at the current point first
        const k1_vector = getVectorAtPointCallback(currentX, currentY, state.currentFunction, state.vectorFieldFunction, state);
        const currentMagnitude = Math.sqrt(k1_vector.vx * k1_vector.vx + k1_vector.vy * k1_vector.vy);

        // Push the current point along with the magnitude of the vector field at this point
        streamlinePoints.push({ x: currentX, y: currentY, magnitude: currentMagnitude });

        // Boundary check for the current point
        if (currentX < xMin || currentX > xMax || currentY < yMin || currentY > yMax) {
            break; // Stop if streamline goes out of visible bounds
        }

        // Stagnation check based on the vector at the current point (k1)
        if (Math.abs(k1_vector.vx) < 1e-9 && Math.abs(k1_vector.vy) < 1e-9) {
             break; // Stop if vector is zero (stagnation point)
        }

        // RK2 (Midpoint) integration
        // 1. Calculate the midpoint using k1_vector
        const midX = currentX + k1_vector.vx * state.streamlineStepSize / 2; // Use state.streamlineStepSize
        const midY = currentY + k1_vector.vy * state.streamlineStepSize / 2; // Use state.streamlineStepSize

        // 2. Get the vector at the midpoint (k2_midVector)
        const k2_midVector = getVectorAtPointCallback(midX, midY, state.currentFunction, state.vectorFieldFunction, state);

        // Handle cases where k2_midVector might be zero or invalid, then fallback to Euler step using k1_vector
        if (Math.abs(k2_midVector.vx) < 1e-9 && Math.abs(k2_midVector.vy) < 1e-9 || !isFinite(k2_midVector.vx) || !isFinite(k2_midVector.vy)) {
            currentX += k1_vector.vx * state.streamlineStepSize; // Euler step, use state.streamlineStepSize
            currentY += k1_vector.vy * state.streamlineStepSize; // Euler step, use state.streamlineStepSize
        } else {
            // 3. Update the position using the k2_midVector
            currentX += k2_midVector.vx * state.streamlineStepSize; // Use state.streamlineStepSize
            currentY += k2_midVector.vy * state.streamlineStepSize; // Use state.streamlineStepSize
        }
    }

    return streamlinePoints;
}
