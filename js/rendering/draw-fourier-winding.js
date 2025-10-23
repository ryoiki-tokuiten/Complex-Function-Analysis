
// 3Blue1Brown-style Fourier "Winding" Visualization
// This shows the KEY intuition: wrapping the signal around the origin

/**
 * Draw "winding" visualization - signal wrapped around origin at winding frequency
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} signal - Time domain signal data
 * @param {Object} planeParams - Plane parameters for drawing
 */
function drawWindingVisualization(ctx, signal, planeParams) {
    if (!signal || signal.length === 0) {
        ctx.save();
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = '16px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No signal data available', planeParams.width / 2, planeParams.height / 2);
        ctx.restore();
        return;
    }
    
    ctx.save();
    
    // Clear canvas
    ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
    
    // Draw axes for complex plane
    drawAxes(ctx, planeParams, "Real", "Imaginary");
    
    // Get winding parameters
    const windingFreq = state.fourierWindingFrequency || 1.0;
    const windingTime = state.fourierWindingTime || 1.0;
    const timeWindow = state.fourierTimeWindow;
    
    // Calculate winding: g(t) * e^(-2πift)
    const windedPoints = [];
    let centerOfMassX = 0;
    let centerOfMassY = 0;
    let count = 0;
    
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        if (pt.t > windingTime * timeWindow) break; // Only up to current time
        
        const angle = -2 * Math.PI * windingFreq * pt.t;
        const re = pt.value * Math.cos(angle);
        const im = pt.value * Math.sin(angle);
        
        windedPoints.push({ re, im, t: pt.t, value: pt.value });
        centerOfMassX += re;
        centerOfMassY += im;
        count++;
    }
    
    if (count > 0) {
        centerOfMassX /= count;
        centerOfMassY /= count;
    }
    
    // Draw beautiful reference circle with gradient
    const origin = mapToCanvasCoords(0, 0, planeParams);
    const maxSignalAmp = Math.max(...signal.map(pt => Math.abs(pt.value)));
    const circleRadiusWorld = maxSignalAmp * 1.1;
    const circleRadiusCanvas = circleRadiusWorld * planeParams.scale.x;
    
    // Outer glow
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.1)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, circleRadiusCanvas, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Main circle
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, circleRadiusCanvas, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw the winding path with gradient
    if (windedPoints.length > 1) {
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Draw path segments with color gradient based on time
        for (let i = 1; i < windedPoints.length; i++) {
            const t = i / windedPoints.length;
            const hue = 280 + t * 60; // Gradient from purple to pink
            
            const prevPos = mapToCanvasCoords(windedPoints[i-1].re, windedPoints[i-1].im, planeParams);
            const currPos = mapToCanvasCoords(windedPoints[i].re, windedPoints[i].im, planeParams);
            
            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(currPos.x, currPos.y);
            ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${0.3 + t * 0.5})`;
            ctx.stroke();
        }
    }
    
    // Draw vectors from origin with fading opacity
    const vectorStep = Math.max(1, Math.floor(windedPoints.length / 50));
    for (let i = 0; i < windedPoints.length; i += vectorStep) {
        const wp = windedPoints[i];
        const canvasPos = mapToCanvasCoords(wp.re, wp.im, planeParams);
        const t = i / windedPoints.length;
        
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(canvasPos.x, canvasPos.y);
        ctx.strokeStyle = `rgba(100, 180, 255, ${0.1 + t * 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw winded sample points with gradient and glow
    for (let i = 0; i < windedPoints.length; i++) {
        const wp = windedPoints[i];
        const canvasPos = mapToCanvasCoords(wp.re, wp.im, planeParams);
        const t = i / windedPoints.length;
        const size = 2.5 + t * 1.5;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, size + 3, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 100, 200, ${0.08 + t * 0.12})`;
        ctx.fill();
        
        // Main point with radial gradient
        const gradient = ctx.createRadialGradient(canvasPos.x, canvasPos.y, 0, canvasPos.x, canvasPos.y, size);
        gradient.addColorStop(0, 'rgba(255, 180, 230, 1)');
        gradient.addColorStop(1, 'rgba(255, 100, 200, 0.9)');
        
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 200, 240, 0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw CENTER OF MASS with beautiful emphasis (KEY insight!)
    const comCanvas = mapToCanvasCoords(centerOfMassX, centerOfMassY, planeParams);
    const comMag = Math.sqrt(centerOfMassX * centerOfMassX + centerOfMassY * centerOfMassY);
    
    // Large outer glow
    ctx.beginPath();
    ctx.arc(comCanvas.x, comCanvas.y, 20, 0, 2 * Math.PI);
    const glowGradient = ctx.createRadialGradient(comCanvas.x, comCanvas.y, 0, comCanvas.x, comCanvas.y, 20);
    glowGradient.addColorStop(0, 'rgba(255, 220, 50, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 220, 50, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    // Vector from origin with beautiful gradient
    const vectorGradient = ctx.createLinearGradient(origin.x, origin.y, comCanvas.x, comCanvas.y);
    vectorGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
    vectorGradient.addColorStop(1, 'rgba(255, 220, 50, 1)');
    
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(comCanvas.x, comCanvas.y);
    ctx.strokeStyle = vectorGradient;
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(255, 220, 50, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Arrow head
    const angle = Math.atan2(comCanvas.y - origin.y, comCanvas.x - origin.x);
    const arrowSize = 12;
    ctx.beginPath();
    ctx.moveTo(comCanvas.x, comCanvas.y);
    ctx.lineTo(
        comCanvas.x - arrowSize * Math.cos(angle - Math.PI / 6),
        comCanvas.y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        comCanvas.x - arrowSize * Math.cos(angle + Math.PI / 6),
        comCanvas.y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 220, 50, 1)';
    ctx.fill();
    
    // Center of mass point with radial gradient
    const comGradient = ctx.createRadialGradient(comCanvas.x, comCanvas.y, 0, comCanvas.x, comCanvas.y, 8);
    comGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    comGradient.addColorStop(0.7, 'rgba(255, 220, 50, 1)');
    comGradient.addColorStop(1, 'rgba(255, 180, 0, 1)');
    
    ctx.beginPath();
    ctx.arc(comCanvas.x, comCanvas.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = comGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Label with background
    const labelText = 'Center of Mass';
    const labelX = comCanvas.x + 15;
    const labelY = comCanvas.y - 8;
    
    ctx.font = 'bold 13px "SF Pro Display", sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    
    // Label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX - 4, labelY - 14, textWidth + 8, 20);
    
    // Label text
    ctx.fillStyle = 'rgba(255, 240, 100, 1)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, labelX, labelY);
    
    // Draw origin with subtle pulse
    const originGradient = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, 6);
    originGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    originGradient.addColorStop(1, 'rgba(180, 200, 255, 0.8)');
    
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = originGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 150, 255, 1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Beautiful info panel
    const panelX = 15, panelY = 15, panelW = 380, panelH = 125;
    
    // Panel background with gradient
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, 'rgba(15, 18, 25, 0.95)');
    panelGradient.addColorStop(1, 'rgba(10, 12, 20, 0.95)');
    ctx.fillStyle = panelGradient;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    // Gradient border
    const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
    borderGradient.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
    borderGradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.6)');
    borderGradient.addColorStop(1, 'rgba(255, 200, 50, 0.4)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Title
    ctx.fillStyle = 'rgba(255, 220, 150, 1)';
    ctx.font = 'bold 15px "SF Pro Display", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Frequency Domain: Winding Visualization', panelX + 12, panelY + 12);
    
    // Formula
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.font = '13px "SF Mono", monospace';
    ctx.fillText('g(t) · e^(-2πift)', panelX + 12, panelY + 35);
    
    ctx.fillStyle = 'rgba(180, 200, 240, 0.8)';
    ctx.font = '11px "SF Pro Text", sans-serif';
    ctx.fillText('Signal wraps around origin at test frequency', panelX + 12, panelY + 55);
    
    // Center of mass info with highlighting
    ctx.fillStyle = 'rgba(255, 240, 150, 1)';
    ctx.font = 'bold 12px "SF Pro Text", sans-serif';
    ctx.fillText(`Center of Mass: (${centerOfMassX.toFixed(3)}, ${centerOfMassY.toFixed(3)})`, panelX + 12, panelY + 75);
    
    // Magnitude with color coding
    const magColor = comMag > 0.3 ? 'rgba(100, 255, 150, 1)' : 'rgba(255, 180, 100, 0.8)';
    ctx.fillStyle = magColor;
    ctx.font = 'bold 11px "SF Pro Text", sans-serif';
    ctx.fillText(`Magnitude: ${comMag.toFixed(3)}`, panelX + 12, panelY + 93);
    
    // Hint
    ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
    ctx.font = 'italic 10px "SF Pro Text", sans-serif';
    ctx.fillText('Tip: When winding frequency matches signal, center of mass jumps!', panelX + 12, panelY + 110);
    
    ctx.restore();
}

/**
 * Draw time domain signal with highlighted current time
 */
function drawTimeDomainSignal(ctx, signal, planeParams) {
    if (!signal || signal.length === 0) {
        ctx.save();
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = '16px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No signal data available', planeParams.width / 2, planeParams.height / 2);
        ctx.restore();
        return;
    }
    
    ctx.save();
    
    // Clear canvas with subtle gradient background
    ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
    
    // Draw custom axes
    drawAxes(ctx, planeParams, "Time (t)", "g(t)");
    
    const xRange = planeParams.currentVisXRange || [-3, 3];
    const yRange = planeParams.currentVisYRange || [-3, 3];
    const timeWindow = state.fourierTimeWindow;
    const maxAmp = Math.max(...signal.map(pt => Math.abs(pt.value))) * 1.2;
    
    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSpacing = (xRange[1] - xRange[0]) / 8;
    for (let x = Math.ceil(xRange[0] / gridSpacing) * gridSpacing; x <= xRange[1]; x += gridSpacing) {
        const canvasX = mapToCanvasCoords(x, 0, planeParams).x;
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, planeParams.height);
        ctx.stroke();
    }
    
    // Draw the signal curve with beautiful gradient
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
    ctx.shadowBlur = 8;
    
    let firstPoint = true;
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
        const worldY = (pt.value / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
        const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
        
        if (firstPoint) {
            ctx.moveTo(canvasPos.x, canvasPos.y);
            firstPoint = false;
        } else {
            ctx.lineTo(canvasPos.x, canvasPos.y);
        }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw sample points with beautiful styling
    const windingTime = state.fourierWindingTime || 1.0;
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
        const worldY = (pt.value / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
        const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
        
        const isPastTime = pt.t <= windingTime * timeWindow;
        
        // Outer glow
        if (isPastTime) {
            ctx.beginPath();
            ctx.arc(canvasPos.x, canvasPos.y, 5.5, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 100, 200, 0.15)';
            ctx.fill();
        }
        
        // Main point
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, isPastTime ? 4 : 3, 0, 2 * Math.PI);
        
        if (isPastTime) {
            const gradient = ctx.createRadialGradient(canvasPos.x, canvasPos.y, 0, canvasPos.x, canvasPos.y, 4);
            gradient.addColorStop(0, 'rgba(255, 150, 220, 1)');
            gradient.addColorStop(1, 'rgba(255, 100, 200, 0.9)');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
        }
        ctx.fill();
        
        if (isPastTime) {
            ctx.strokeStyle = 'rgba(255, 200, 240, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    
    // Draw beautiful time cursor
    if (windingTime > 0 && windingTime <= 1) {
        const worldX = xRange[0] + windingTime * (xRange[1] - xRange[0]);
        const topCanvas = mapToCanvasCoords(worldX, yRange[1], planeParams);
        const bottomCanvas = mapToCanvasCoords(worldX, yRange[0], planeParams);
        
        // Gradient line
        const gradient = ctx.createLinearGradient(topCanvas.x, topCanvas.y, bottomCanvas.x, bottomCanvas.y);
        gradient.addColorStop(0, 'rgba(255, 180, 100, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 180, 100, 0.3)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 150, 100, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(topCanvas.x, topCanvas.y);
        ctx.lineTo(bottomCanvas.x, bottomCanvas.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Time label
        ctx.fillStyle = 'rgba(255, 200, 150, 1)';
        ctx.font = 'bold 11px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`t = ${(windingTime * timeWindow).toFixed(2)}s`, topCanvas.x, topCanvas.y - 10);
    }
    
    // Draw zero line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const zeroLeft = mapToCanvasCoords(xRange[0], 0, planeParams);
    const zeroRight = mapToCanvasCoords(xRange[1], 0, planeParams);
    ctx.moveTo(zeroLeft.x, zeroLeft.y);
    ctx.lineTo(zeroRight.x, zeroRight.y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Beautiful info panel with gradient
    const panelX = 15, panelY = 15, panelW = 350, panelH = 100;
    
    // Panel background with subtle gradient
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, 'rgba(15, 18, 25, 0.95)');
    panelGradient.addColorStop(1, 'rgba(10, 12, 20, 0.95)');
    ctx.fillStyle = panelGradient;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    // Border with gradient
    const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
    borderGradient.addColorStop(0, 'rgba(100, 150, 255, 0.3)');
    borderGradient.addColorStop(0.5, 'rgba(150, 100, 255, 0.5)');
    borderGradient.addColorStop(1, 'rgba(100, 150, 255, 0.3)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Title
    ctx.fillStyle = 'rgba(150, 200, 255, 1)';
    ctx.font = 'bold 15px "SF Pro Display", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const funcText = getFourierFunctionText(state.fourierFunction);
    ctx.fillText('Time Domain Signal', panelX + 12, panelY + 12);
    
    // Function display
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.font = '13px "SF Mono", monospace';
    ctx.fillText(funcText, panelX + 12, panelY + 35);
    
    // Parameters
    ctx.fillStyle = 'rgba(180, 200, 240, 0.85)';
    ctx.font = '11px "SF Pro Text", sans-serif';
    ctx.fillText(`Signal Frequency: ${state.fourierFrequency.toFixed(2)} Hz  •  Samples: ${state.fourierSamples}`, panelX + 12, panelY + 58);
    
    // Winding frequency highlight
    const windingFreq = state.fourierWindingFrequency || 1;
    const isResonance = Math.abs(windingFreq - state.fourierFrequency) < 0.1;
    ctx.fillStyle = isResonance ? 'rgba(255, 220, 100, 1)' : 'rgba(255, 180, 150, 0.9)';
    ctx.font = 'bold 11px "SF Pro Text", sans-serif';
    ctx.fillText(`Testing at: ${windingFreq.toFixed(2)} Hz`, panelX + 12, panelY + 78);
    
    if (isResonance) {
        ctx.fillStyle = 'rgba(100, 255, 150, 1)';
        ctx.font = 'bold italic 11px "SF Pro Text", sans-serif';
        ctx.fillText('» RESONANCE «', panelX + 150, panelY + 78);
    }
    
    ctx.restore();
}

/**
 * Get display text for Fourier function type
 */
function getFourierFunctionText(funcType) {
    const funcMap = {
        // Basic waves
        'sine': 'f(t) = A·sin(ωt)',
        'cosine': 'f(t) = A·cos(ωt)',
        'square': 'f(t) = Square Wave',
        'sawtooth': 'f(t) = Sawtooth Wave',
        'triangle': 'f(t) = Triangle Wave',
        // Modulated signals
        'am': 'f(t) = AM Signal',
        'fm': 'f(t) = FM Signal',
        'chirp': 'f(t) = Chirp (Sweep)',
        // Transient signals
        'damped_sine': 'f(t) = Damped Sine',
        'exponential': 'f(t) = Exponential Decay',
        'gaussian': 'f(t) = Gaussian Pulse',
        'pulse': 'f(t) = Rect. Pulse',
        // Complex waveforms
        'harmonics': 'f(t) = Harmonic Series',
        'beat': 'f(t) = Beat Frequency',
        'noise': 'f(t) = White Noise'
    };
    return funcMap[funcType] || 'f(t) = ' + funcType;
}
