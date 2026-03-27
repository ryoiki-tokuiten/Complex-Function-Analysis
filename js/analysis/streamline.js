

function getVectorFieldValueAtPoint(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState = state) {
    const z = { re: x, im: y };
    const funcDefinition = transformFunctions[currentFunctionStr];
    if (!funcDefinition) {
        return { re: 0, im: 0 };
    }

    let baseFunc;
    if (typeof funcDefinition === 'function') {
        baseFunc = funcDefinition;
    } else if (funcDefinition && typeof funcDefinition.func === 'function') {
        baseFunc = funcDefinition.func;
    } else {
        return { re: 0, im: 0 };
    }

    let f_z;
    try {
        f_z = baseFunc(z.re, z.im, runtimeState);
    } catch (e) {
        return { re: 0, im: 0 };
    }

    if (
        f_z === undefined ||
        f_z === null ||
        isNaN(f_z.re) ||
        isNaN(f_z.im) ||
        !isFinite(f_z.re) ||
        !isFinite(f_z.im)
    ) {
        return { re: 0, im: 0 };
    }

    switch (vectorFieldTypeStr) {
        case 'f(z)':
            return { re: f_z.re, im: f_z.im };
        case '1/f(z)': {
            const magnitudeSquared = f_z.re * f_z.re + f_z.im * f_z.im;
            if (magnitudeSquared < 1e-12) {
                return { re: 0, im: 0 };
            }
            return {
                re: f_z.re / magnitudeSquared,
                im: -f_z.im / magnitudeSquared
            };
        }
        case "f'(z)": {
            const derivative = numericDerivative(currentFunctionStr, z);
            if (
                derivative === undefined ||
                derivative === null ||
                isNaN(derivative.re) ||
                isNaN(derivative.im) ||
                !isFinite(derivative.re) ||
                !isFinite(derivative.im)
            ) {
                return { re: 0, im: 0 };
            }
            return { re: derivative.re, im: derivative.im };
        }
        default:
            return { re: 0, im: 0 };
    }
}

function getVectorForStreamline(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState = state) {
    const vector = getVectorFieldValueAtPoint(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState);
    return { vx: vector.re, vy: vector.im };
}


function calculateStreamline(startX, startY, getVectorAtPointCallback, zPlaneParams, state) {
    const streamlinePoints = [];
    let currentX = startX;
    let currentY = startY;

    const xMin = zPlaneParams.currentVisXRange[0];
    const xMax = zPlaneParams.currentVisXRange[1];
    const yMin = zPlaneParams.currentVisYRange[0]; 
    const yMax = zPlaneParams.currentVisYRange[1];

    for (let i = 0; i < state.streamlineMaxLength; i++) { 
        
        const k1_vector = getVectorAtPointCallback(currentX, currentY, state.currentFunction, state.vectorFieldFunction, state);
        const currentMagnitude = Math.sqrt(k1_vector.vx * k1_vector.vx + k1_vector.vy * k1_vector.vy);

        
        streamlinePoints.push({ x: currentX, y: currentY, magnitude: currentMagnitude });

        
        if (currentX < xMin || currentX > xMax || currentY < yMin || currentY > yMax) {
            break; 
        }

        
        if (Math.abs(k1_vector.vx) < 1e-9 && Math.abs(k1_vector.vy) < 1e-9) {
             break; 
        }

        
        
        const midX = currentX + k1_vector.vx * state.streamlineStepSize / 2; 
        const midY = currentY + k1_vector.vy * state.streamlineStepSize / 2; 

        
        const k2_midVector = getVectorAtPointCallback(midX, midY, state.currentFunction, state.vectorFieldFunction, state);

        
        if (Math.abs(k2_midVector.vx) < 1e-9 && Math.abs(k2_midVector.vy) < 1e-9 || !isFinite(k2_midVector.vx) || !isFinite(k2_midVector.vy)) {
            currentX += k1_vector.vx * state.streamlineStepSize; 
            currentY += k1_vector.vy * state.streamlineStepSize; 
        } else {
            
            currentX += k2_midVector.vx * state.streamlineStepSize; 
            currentY += k2_midVector.vy * state.streamlineStepSize; 
        }
    }

    return streamlinePoints;
}
