

function getVectorForStreamline(x, y, currentFunctionStr, vectorFieldTypeStr, state) {
    const z = { re: x, im: y };
    let f_z;

    
    const funcDefinition = transformFunctions[currentFunctionStr];
    if (!funcDefinition) {
        
        return { vx: 0, vy: 0 }; 
    }

    
    
    
    
    
    let baseFunc;
    if (typeof funcDefinition === 'function') {
        baseFunc = funcDefinition;
    } else if (funcDefinition && typeof funcDefinition.func === 'function') {
        baseFunc = funcDefinition.func; 
    } else {
        
        return { vx: 0, vy: 0 };
    }

    try {
        f_z = baseFunc(z.re, z.im, state); 
    } catch (e) {
        
        return { vx: 0, vy: 0 }; 
    }


    if (f_z === undefined || f_z === null || isNaN(f_z.re) || isNaN(f_z.im) || !isFinite(f_z.re) || !isFinite(f_z.im)) {
        return { vx: 0, vy: 0 }; 
    }

    let vector = { vx: 0, vy: 0 };

    switch (vectorFieldTypeStr) {
        case 'f(z)':
            vector.vx = f_z.re;
            vector.vy = f_z.im;
            break;
        case '1/f(z)':
            const magSq_f_z = f_z.re * f_z.re + f_z.im * f_z.im;
            if (magSq_f_z < 1e-12) { 
                return { vx: 0, vy: 0 }; 
            }
            vector.vx = f_z.re / magSq_f_z;
            vector.vy = -f_z.im / magSq_f_z; 
            break;
        case "f'(z)": 
            
            
            const deriv = numericDerivative(currentFunctionStr, z, state); 
            if (deriv === undefined || deriv === null || isNaN(deriv.re) || isNaN(deriv.im) || !isFinite(deriv.re) || !isFinite(deriv.im)) {
                return { vx: 0, vy: 0 };
            }
            vector.vx = deriv.re;
            vector.vy = deriv.im;
            break;
        default:
            
            return { vx: 0, vy: 0 };
    }

    
    
    
    
    
    
    
    
    

    return vector;
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
