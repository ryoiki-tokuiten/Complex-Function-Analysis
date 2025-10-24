// Laplace Transform 3-Panel Visualization
// Professional rendering with time domain, s-plane, and 3D surface

/**
 * Draw LEFT PANEL: Time domain signal with exponential weighting e^(-σt)
 * Shows both original signal f(t) and weighted version f(t)·e^(-σt)
 */
function drawLaplaceTimeDomain(ctx, signal, planeParams) {
    if (!signal || signal.length === 0) {
        ctx.save();
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = '16px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No signal data', planeParams.width / 2, planeParams.height / 2);
        ctx.restore();
        return;
    }
    
    ctx.save();
    
    // Clear canvas
    ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
    
    // Draw axes
    drawAxes(ctx, planeParams, "Time (t)", "f(t)");
    
    const sigma = state.laplaceSigma || 0;
    const timeWindow = 5.0;
    const maxAmp = Math.max(...signal.map(pt => Math.abs(pt.value))) * 1.2;
    
    const xRange = planeParams.currentVisXRange || [0, 5];
    const yRange = planeParams.currentVisYRange || [-3, 3];
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSpacing = 1.0;
    for (let x = 0; x <= timeWindow; x += gridSpacing) {
        const worldX = xRange[0] + (x / timeWindow) * (xRange[1] - xRange[0]);
        const canvasX = mapToCanvasCoords(worldX, 0, planeParams).x;
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, planeParams.height);
        ctx.stroke();
    }
    
    // Draw ORIGINAL signal f(t) in light blue
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
        const worldY = (pt.value / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
        const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
        
        if (i === 0) {
            ctx.moveTo(canvasPos.x, canvasPos.y);
        } else {
            ctx.lineTo(canvasPos.x, canvasPos.y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw WEIGHTED signal f(t)·e^(-σt) with gradient
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 100, 150, 0.5)';
    ctx.shadowBlur = 8;
    
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        const weight = Math.exp(-sigma * pt.t);
        const weightedValue = pt.value * weight;
        
        const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
        const worldY = (weightedValue / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
        const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
        
        // Gradient stroke based on position
        const t = i / signal.length;
        const hue = 340 - t * 20;
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.7 + t * 0.3})`;
        
        if (i > 0) {
            const prevPt = signal[i - 1];
            const prevWeight = Math.exp(-sigma * prevPt.t);
            const prevWeightedValue = prevPt.value * prevWeight;
            const prevWorldX = xRange[0] + (prevPt.t / timeWindow) * (xRange[1] - xRange[0]);
            const prevWorldY = (prevWeightedValue / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
            const prevCanvasPos = mapToCanvasCoords(prevWorldX, prevWorldY, planeParams);
            
            ctx.beginPath();
            ctx.moveTo(prevCanvasPos.x, prevCanvasPos.y);
            ctx.lineTo(canvasPos.x, canvasPos.y);
            ctx.stroke();
        }
    }
    ctx.shadowBlur = 0;
    
    // Draw exponential envelope e^(-σt)
    if (Math.abs(sigma) > 0.01) {
        ctx.strokeStyle = sigma > 0 ? 'rgba(255, 200, 100, 0.4)' : 'rgba(100, 255, 200, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        
        for (let i = 0; i < signal.length; i++) {
            const pt = signal[i];
            const envelope = Math.exp(-sigma * pt.t) * maxAmp * 0.4;
            
            const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
            const worldY = (envelope / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
            const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
            
            if (i === 0) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        ctx.stroke();
        
        // Negative envelope
        ctx.beginPath();
        for (let i = 0; i < signal.length; i++) {
            const pt = signal[i];
            const envelope = -Math.exp(-sigma * pt.t) * maxAmp * 0.4;
            
            const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
            const worldY = (envelope / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
            const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
            
            if (i === 0) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Draw sample points with color coding based on damping
    for (let i = 0; i < signal.length; i += Math.max(1, Math.floor(signal.length / 50))) {
        const pt = signal[i];
        const weight = Math.exp(-sigma * pt.t);
        const weightedValue = pt.value * weight;
        
        const worldX = xRange[0] + (pt.t / timeWindow) * (xRange[1] - xRange[0]);
        const worldY = (weightedValue / maxAmp) * (yRange[1] - yRange[0]) * 0.4;
        const canvasPos = mapToCanvasCoords(worldX, worldY, planeParams);
        
        const t = i / signal.length;
        const dampingIntensity = sigma > 0 ? weight : Math.min(1, weight);
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 100, 150, ${0.1 * dampingIntensity})`;
        ctx.fill();
        
        // Main point
        const gradient = ctx.createRadialGradient(canvasPos.x, canvasPos.y, 0, canvasPos.x, canvasPos.y, 3);
        gradient.addColorStop(0, `rgba(255, 150, ${200 - sigma * 30}, 1)`);
        gradient.addColorStop(1, `rgba(255, 100, 150, 0.9)`);
        
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    // Minimal info panel - clean and focused
    const panelX = 20, panelY = 20, panelW = 320, panelH = 90;
    
    // Background with subtle gradient
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, 'rgba(15, 18, 28, 0.94)');
    panelGradient.addColorStop(1, 'rgba(10, 12, 22, 0.94)');
    ctx.fillStyle = panelGradient;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    // Subtle border
    ctx.strokeStyle = 'rgba(255, 150, 180, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Function display
    ctx.fillStyle = 'rgba(255, 220, 230, 0.95)';
    ctx.font = 'bold 14px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`f(t) = ${getLaplaceFunctionText(state.laplaceFunction)}`, panelX + 14, panelY + 28);
    
    // Weighting display
    ctx.fillStyle = 'rgba(220, 230, 255, 0.85)';
    ctx.font = '12px "SF Pro Text", sans-serif';
    ctx.fillText(`Weighted: f(t) · e^(-σt)`, panelX + 14, panelY + 52);
    
    // Damping value with color coding
    const dampingColor = sigma > 0 ? 'rgba(255, 200, 120, 1)' : sigma < 0 ? 'rgba(120, 255, 200, 1)' : 'rgba(220, 220, 220, 1)';
    ctx.fillStyle = dampingColor;
    ctx.font = 'bold 13px "SF Mono", monospace';
    ctx.fillText(`σ = ${sigma.toFixed(2)}`, panelX + 14, panelY + 74);
    
    ctx.restore();
}

/**
 * Draw MIDDLE PANEL: Premium 3b1b-quality winding visualization
 */
function drawLaplaceWindingVisualization(ctx, signal, planeParams) {
    // Use the new premium renderer
    drawLaplaceWindingPremium(ctx, signal, planeParams);
    
    // Draw poles and zeros overlay on top
    drawPolesAndZerosOverlay(ctx, planeParams);
    
    // Get current s value for info overlay
    const sigma = state.laplaceSigma || 0;
    const omega = state.laplaceOmega || 1;
    
    // Draw info overlay on top of everything
    drawLaplaceInfoOverlay(ctx, sigma, omega, planeParams);
}

/**
 * Draw poles (×) and zeros (○) on the s-plane with 3b1b quality
 */
function drawPolesAndZerosOverlay(ctx, planeParams) {
    // Check if user wants to see poles/zeros
    const showPolesZeros = state.laplaceShowPolesZeros !== false;
    const showROC = state.laplaceShowROC !== false;
    
    if (!showPolesZeros && !showROC) return;
    if (!state.laplacePoles && !state.laplaceZeros && !state.laplaceROC) return;
    
    ctx.save();
    
    // Draw ROC (Region of Convergence) first as subtle background
    if (showROC && state.laplaceROC && state.laplaceROC.boundary !== null) {
        const sigma_boundary = state.laplaceROC.boundary;
        const boundaryCanvas = mapToCanvasCoords(sigma_boundary, 0, planeParams);
        
        // Shade the ROC region
        ctx.fillStyle = 'rgba(100, 255, 150, 0.08)';
        ctx.fillRect(boundaryCanvas.x, 0, planeParams.width - boundaryCanvas.x, planeParams.height);
        
        // Draw ROC boundary line
        ctx.strokeStyle = 'rgba(100, 255, 150, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(boundaryCanvas.x, 0);
        ctx.lineTo(boundaryCanvas.x, planeParams.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // ROC label
        ctx.fillStyle = 'rgba(100, 255, 150, 0.9)';
        ctx.font = 'italic 11px "SF Pro Text", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ROC', boundaryCanvas.x + 8, 20);
    }
    
    // Draw ZEROS (○) - less emphasis
    if (showPolesZeros && state.laplaceZeros && state.laplaceZeros.length > 0) {
        for (const zero of state.laplaceZeros) {
            const canvas = mapToCanvasCoords(zero.sigma, zero.omega, planeParams);
            
            // Outer glow
            ctx.beginPath();
            ctx.arc(canvas.x, canvas.y, 12, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
            ctx.fill();
            
            // Circle marker
            ctx.beginPath();
            ctx.arc(canvas.x, canvas.y, 8, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Label if provided
            if (zero.label) {
                ctx.fillStyle = 'rgba(150, 220, 255, 0.9)';
                ctx.font = '10px "SF Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(zero.label, canvas.x, canvas.y + 20);
            }
        }
    }
    
    // Draw POLES (×) - more emphasis
    if (showPolesZeros && state.laplacePoles && state.laplacePoles.length > 0) {
        for (const pole of state.laplacePoles) {
            const canvas = mapToCanvasCoords(pole.sigma, pole.omega, planeParams);
            
            // Large glow for poles
            ctx.beginPath();
            ctx.arc(canvas.x, canvas.y, 18, 0, 2 * Math.PI);
            const poleGlow = ctx.createRadialGradient(canvas.x, canvas.y, 0, canvas.x, canvas.y, 18);
            poleGlow.addColorStop(0, 'rgba(255, 150, 100, 0.4)');
            poleGlow.addColorStop(1, 'rgba(255, 150, 100, 0)');
            ctx.fillStyle = poleGlow;
            ctx.fill();
            
            // X marker (two diagonal lines)
            const size = 10;
            ctx.strokeStyle = 'rgba(255, 150, 100, 1)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(canvas.x - size, canvas.y - size);
            ctx.lineTo(canvas.x + size, canvas.y + size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(canvas.x + size, canvas.y - size);
            ctx.lineTo(canvas.x - size, canvas.y + size);
            ctx.stroke();
            
            // Label if provided
            if (pole.label) {
                // Background for readability
                ctx.font = '10px "SF Mono", monospace';
                const labelWidth = ctx.measureText(pole.label).width;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(canvas.x - labelWidth/2 - 2, canvas.y + 16, labelWidth + 4, 14);
                
                // Label text
                ctx.fillStyle = 'rgba(255, 180, 120, 1)';
                ctx.textAlign = 'center';
                ctx.fillText(pole.label, canvas.x, canvas.y + 26);
            }
        }
    }
    
    ctx.restore();
}

/**
 * Draw Laplace-specific info overlay on top of winding visualization
 */
function drawLaplaceInfoOverlay(ctx, sigma, omega, planeParams) {
    ctx.save();
    
    // Beautiful info panel matching Fourier style
    const panelX = 15, panelY = 15, panelW = 380, panelH = 125;
    
    // Panel background with gradient
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, 'rgba(15, 18, 25, 0.95)');
    panelGradient.addColorStop(1, 'rgba(10, 12, 20, 0.95)');
    ctx.fillStyle = panelGradient;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    // Gradient border
    const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
    borderGradient.addColorStop(0, 'rgba(100, 220, 180, 0.4)');
    borderGradient.addColorStop(0.5, 'rgba(120, 240, 200, 0.6)');
    borderGradient.addColorStop(1, 'rgba(100, 220, 180, 0.4)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Title
    ctx.fillStyle = 'rgba(150, 255, 200, 1)';
    ctx.font = 'bold 15px "SF Pro Display", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Complex Frequency Domain: Winding Visualization', panelX + 12, panelY + 12);
    
    // Formula
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.font = '13px "SF Mono", monospace';
    ctx.fillText('f(t) · e^(-st)', panelX + 12, panelY + 35);
    
    ctx.fillStyle = 'rgba(180, 200, 240, 0.8)';
    ctx.font = '11px "SF Pro Text", sans-serif';
    ctx.fillText('Signal weighted by complex exponential', panelX + 12, panelY + 55);
    
    // Evaluation point with highlighting
    ctx.fillStyle = 'rgba(255, 240, 150, 1)';
    ctx.font = 'bold 12px "SF Pro Text", sans-serif';
    ctx.fillText(`s = ${sigma.toFixed(2)} + ${omega.toFixed(2)}j`, panelX + 12, panelY + 75);
    
    // Result with color coding
    if (state.laplaceCurrentValue) {
        const magColor = state.laplaceCurrentValue.magnitude > 1 ? 'rgba(255, 180, 100, 1)' : 'rgba(100, 255, 180, 1)';
        ctx.fillStyle = magColor;
        ctx.font = 'bold 11px "SF Pro Text", sans-serif';
        ctx.fillText(`F(s) = ${state.laplaceCurrentValue.magnitude.toFixed(3)}`, panelX + 12, panelY + 93);
    }
    
    // Stability status (if available) - 3b1b style system analysis
    if (state.laplaceStability) {
        ctx.fillStyle = state.laplaceStability.color || 'rgba(150, 180, 255, 0.9)';
        ctx.font = 'bold 10px "SF Pro Text", sans-serif';
        ctx.fillText(state.laplaceStability.message, panelX + 12, panelY + 110);
    } else {
        // Hint about center of mass interpretation
        ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
        ctx.font = 'italic 10px "SF Pro Text", sans-serif';
        ctx.fillText('Tip: The center of mass shows the Laplace transform value!', panelX + 12, panelY + 110);
    }
    
    ctx.restore();
}

/**
 * Get display text for Laplace function type
 */
function getLaplaceFunctionText(funcType) {
    const funcMap = {
        'step': 'Step function',
        'exponential': 'e^(-at)',
        'sine': 'sin(ωt)',
        'cosine': 'cos(ωt)',
        'damped_sine': 'Damped sine: e^(-σt)·sin(ωt)',
        'damped_cosine': 'Damped cosine: e^(-σt)·cos(ωt)',
        'ramp': 'Ramp: t',
        'impulse': 'Impulse δ(t)',
        'exponential_sine': 'Growing sine: e^(at)·sin(ωt)',
        'underdamped': 'Underdamped oscillation',
        'critically_damped': 'Critically damped',
        'overdamped': 'Overdamped'
    };
    return funcMap[funcType] || funcType;
}
