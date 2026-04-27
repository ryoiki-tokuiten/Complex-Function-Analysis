

function getVectorFieldValueAtPoint(x, y, currentFunctionStr, vectorFieldTypeStr, runtimeState = state) {
    const z = { re: x, im: y };
    const baseFunc = transformFunctions[currentFunctionStr];
    if (!baseFunc) {
        return { re: 0, im: 0 };
    }

    const f_z = baseFunc(z.re, z.im, runtimeState);

    if (!f_z || !isFinite(f_z.re) || !isFinite(f_z.im)) {
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

    // Scale step size to viewport so it works at any zoom level
    const viewSpan = Math.max(xMax - xMin, yMax - yMin);
    const step = state.streamlineStepSize * viewSpan * 0.1;

    for (let i = 0; i < state.streamlineMaxLength; i++) {
        const k1 = getVectorAtPointCallback(currentX, currentY, state.currentFunction, state.vectorFieldFunction, state);
        const k1Mag = Math.hypot(k1.vx, k1.vy);

        streamlinePoints.push({ x: currentX, y: currentY, magnitude: k1Mag });

        if (currentX < xMin || currentX > xMax || currentY < yMin || currentY > yMax) break;
        if (k1Mag < 1e-9) break;

        // Normalize direction — streamlines trace direction, not speed.
        // This prevents explosion when |f(z)| is large (e.g. sinh terms at wide zoom).
        const k1nx = k1.vx / k1Mag, k1ny = k1.vy / k1Mag;

        const midX = currentX + k1nx * step * 0.5;
        const midY = currentY + k1ny * step * 0.5;
        const k2 = getVectorAtPointCallback(midX, midY, state.currentFunction, state.vectorFieldFunction, state);
        const k2Mag = Math.hypot(k2.vx, k2.vy);

        if (k2Mag < 1e-9 || !isFinite(k2.vx) || !isFinite(k2.vy)) {
            currentX += k1nx * step;
            currentY += k1ny * step;
        } else {
            currentX += (k2.vx / k2Mag) * step;
            currentY += (k2.vy / k2Mag) * step;
        }
    }

    return streamlinePoints;
}
