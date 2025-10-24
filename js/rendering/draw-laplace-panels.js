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
    
    // Hint
    ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
    ctx.font = 'italic 10px "SF Pro Text", sans-serif';
    ctx.fillText('Tip: The center of mass shows the Laplace transform value!', panelX + 12, panelY + 110);
    
    ctx.restore();
}

/**
 * DEPRECATED - keeping for reference, replaced by drawLaplaceWindingVisualization
 */
function drawLaplaceSPlane_OLD(ctx, planeParams) {
    ctx.save();
    
    // Clear canvas with darker background
    ctx.fillStyle = 'rgba(8, 10, 18, 1)';
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
    
    // Get current s value
    const s_sigma = state.laplaceSigma || 0;
    const s_omega = state.laplaceOmega || 1;
    
    // Compute winding spiral first: f(t) * e^(-st) for t ∈ [0, T]
    const windingPath = computeWindingPath(s_sigma, s_omega);
    
    // Initialize coordinate system if not already set (first time or after reset)
    const needsInit = !planeParams.scale || !planeParams.origin;
    
    if (needsInit) {
        // Set up coordinate system based on winding path
        if (windingPath && windingPath.length >= 2) {
            // Auto-scale to fit the spiral
            const xRange = computeWindingRange(windingPath, 'real');
            const yRange = computeWindingRange(windingPath, 'imag');
            planeParams.currentVisXRange = xRange;
            planeParams.currentVisYRange = yRange;
        } else {
            // Default ranges
            planeParams.currentVisXRange = [-2, 2];
            planeParams.currentVisYRange = [-2, 2];
        }
        
        // Update scale and origin based on ranges
        const xRange = planeParams.currentVisXRange;
        const yRange = planeParams.currentVisYRange;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        
        planeParams.scale = {
            x: planeParams.width / xSpan,
            y: planeParams.height / ySpan
        };
        planeParams.origin = {
            x: -xRange[0] * planeParams.scale.x,
            y: planeParams.height + yRange[0] * planeParams.scale.y
        };
    }
    
    // Always update viewport ranges based on current scale/origin (for pan/zoom)
    updatePlaneViewportRanges(planeParams);
    
    // Draw axes in complex plane (Re horizontal, Im vertical)
    drawAxes(ctx, planeParams, "Real", "Imaginary");
    
    if (windingPath && windingPath.length >= 2) {
        
        // Draw grid for reference
        drawGrid(ctx, planeParams);
        
        // Draw the winding spiral path
        drawWindingSpiral(ctx, windingPath, planeParams);
        
        // Draw center of mass (the integral result - THE key insight!)
        const centerOfMass = computeCenterOfMass(windingPath);
        if (centerOfMass) {
            drawCenterOfMass(ctx, centerOfMass, planeParams);
        }
    } else {
        // Draw grid anyway
        drawGrid(ctx, planeParams);
        
        ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
        ctx.font = '13px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generating winding visualization...', planeParams.width / 2, planeParams.height / 2);
    }
    
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
    ctx.fillText(`s = ${s_sigma.toFixed(2)} + ${s_omega.toFixed(2)}j`, panelX + 12, panelY + 75);
    
    // Result with color coding
    if (state.laplaceCurrentValue) {
        const magColor = state.laplaceCurrentValue.magnitude > 1 ? 'rgba(255, 180, 100, 1)' : 'rgba(100, 255, 180, 1)';
        ctx.fillStyle = magColor;
        ctx.font = 'bold 11px "SF Pro Text", sans-serif';
        ctx.fillText(`F(s) = ${state.laplaceCurrentValue.magnitude.toFixed(3)}`, panelX + 12, panelY + 93);
    }
    
    // Hint
    ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
    ctx.font = 'italic 10px "SF Pro Text", sans-serif';
    ctx.fillText('Tip: The center of mass shows the Laplace transform value!', panelX + 12, panelY + 110);
    
    ctx.restore();
}

/**
 * Compute winding path: f(t) · e^(-st) as parametric curve in complex plane
 */
function computeWindingPath(sigma, omega) {
    if (!state.laplaceTimeDomainSignal || state.laplaceTimeDomainSignal.length === 0) {
        return [];
    }
    
    const path = [];
    const signal = state.laplaceTimeDomainSignal;
    
    for (const point of signal) {
        const t = point.t;
        const ft_real = point.value;
        const ft_imag = 0; // Real-valued signal
        
        // Compute e^(-st) = e^(-(σ + jω)t) = e^(-σt) · e^(-jωt)
        const exp_sigma_t = Math.exp(-sigma * t);
        const cos_omega_t = Math.cos(-omega * t);
        const sin_omega_t = Math.sin(-omega * t);
        
        // f(t) · e^(-st) in complex plane
        const real = ft_real * exp_sigma_t * cos_omega_t - ft_imag * exp_sigma_t * sin_omega_t;
        const imag = ft_real * exp_sigma_t * sin_omega_t + ft_imag * exp_sigma_t * cos_omega_t;
        
        path.push({ t, real, imag, value: point.value });
    }
    
    return path;
}

/**
 * Compute range for winding path auto-scaling
 */
function computeWindingRange(path, component) {
    if (!path || path.length === 0) return [-1, 1];
    
    const values = path.map(p => p[component]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 0.5;
    
    return [min - padding, max + padding];
}

/**
 * Draw the winding spiral with beautiful gradient
 */
function drawWindingSpiral(ctx, path, planeParams) {
    if (path.length < 2) return;
    
    ctx.save();
    
    // Draw the spiral path with gradient based on time
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        
        const canvas1 = mapToCanvasCoords(p1.real, p1.imag, planeParams);
        const canvas2 = mapToCanvasCoords(p2.real, p2.imag, planeParams);
        
        // Color gradient: blue → cyan → pink based on time progress
        const progress = i / (path.length - 1);
        const hue = 200 + progress * 100; // Blue to pink
        const alpha = 0.6 + progress * 0.4;
        
        ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(canvas1.x, canvas1.y);
        ctx.lineTo(canvas2.x, canvas2.y);
        ctx.stroke();
    }
    
    // Draw sample points along the path
    const skipPoints = Math.max(1, Math.floor(path.length / 60));
    for (let i = 0; i < path.length; i += skipPoints) {
        const p = path[i];
        const canvas = mapToCanvasCoords(p.real, p.imag, planeParams);
        const progress = i / (path.length - 1);
        
        ctx.beginPath();
        ctx.arc(canvas.x, canvas.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${200 + progress * 100}, 80%, 70%, 0.8)`;
        ctx.fill();
    }
    
    ctx.restore();
}

/**
 * Compute center of mass (the integral result!)
 */
function computeCenterOfMass(path) {
    if (!path || path.length === 0) return null;
    
    let sumReal = 0;
    let sumImag = 0;
    
    for (const p of path) {
        sumReal += p.real;
        sumImag += p.imag;
    }
    
    return {
        real: sumReal / path.length,
        imag: sumImag / path.length
    };
}

/**
 * Draw center of mass - the KEY insight!
 */
function drawCenterOfMass(ctx, center, planeParams) {
    const canvas = mapToCanvasCoords(center.real, center.imag, planeParams);
    
    ctx.save();
    
    // Large glow
    ctx.beginPath();
    ctx.arc(canvas.x, canvas.y, 25, 0, 2 * Math.PI);
    const glow = ctx.createRadialGradient(canvas.x, canvas.y, 0, canvas.x, canvas.y, 25);
    glow.addColorStop(0, 'rgba(255, 235, 100, 0.4)');
    glow.addColorStop(1, 'rgba(255, 235, 100, 0)');
    ctx.fillStyle = glow;
    ctx.fill();
    
    // Center marker
    ctx.beginPath();
    ctx.arc(canvas.x, canvas.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 240, 120, 1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Label
    ctx.fillStyle = 'rgba(255, 250, 180, 1)';
    ctx.font = 'bold 11px "SF Pro Text", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Center of Mass', canvas.x + 12, canvas.y - 8);
    ctx.font = '10px "SF Mono", monospace';
    ctx.fillText(`(${center.real.toFixed(3)}, ${center.imag.toFixed(3)})`, canvas.x + 12, canvas.y + 6);
    
    ctx.restore();
}

/**
 * Draw simple grid for reference
 */
function drawGrid(ctx, planeParams) {
    const xRange = planeParams.currentVisXRange || [-1, 1];
    const yRange = planeParams.currentVisYRange || [-1, 1];
    
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 100, 130, 0.15)';
    ctx.lineWidth = 0.5;
    
    // Draw subtle grid lines at integer intervals
    const xStart = Math.floor(xRange[0]);
    const xEnd = Math.ceil(xRange[1]);
    const yStart = Math.floor(yRange[0]);
    const yEnd = Math.ceil(yRange[1]);
    
    // Vertical grid lines
    for (let x = xStart; x <= xEnd; x++) {
        if (x === 0) continue; // Skip axes
        const canvas = mapToCanvasCoords(x, 0, planeParams);
        if (canvas.x >= 0 && canvas.x <= planeParams.width) {
            ctx.beginPath();
            ctx.moveTo(canvas.x, 0);
            ctx.lineTo(canvas.x, planeParams.height);
            ctx.stroke();
        }
    }
    
    // Horizontal grid lines  
    for (let y = yStart; y <= yEnd; y++) {
        if (y === 0) continue; // Skip axes
        const canvas = mapToCanvasCoords(0, y, planeParams);
        if (canvas.y >= 0 && canvas.y <= planeParams.height) {
            ctx.beginPath();
            ctx.moveTo(0, canvas.y);
            ctx.lineTo(planeParams.width, canvas.y);
            ctx.stroke();
        }
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
