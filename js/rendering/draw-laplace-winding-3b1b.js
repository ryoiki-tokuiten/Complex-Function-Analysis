// 3Blue1Brown-Quality Laplace Winding Visualization
// Shows f(t)·e^(-st) building up over time with vectors and labels

/**
 * Draw premium-quality SPLIT-PANEL visualization for Laplace Transform
 * TOP: e^(-st) spiral, BOTTOM: f(t)·e^(-st) with tip-to-tail vectors
 */
function drawLaplaceWindingPremium(ctx, signal, planeParams) {
    if (!signal || signal.length === 0) {
        ctx.save();
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = '16px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No signal data available', planeParams.width / 2, planeParams.height / 2);
        ctx.restore();
        return;
    }
    
    // Safety check: limit signal size to prevent freeze
    if (signal.length > 1000) {
        console.warn('Signal too large, sampling down');
        const step = Math.floor(signal.length / 500);
        signal = signal.filter((_, i) => i % step === 0);
    }
    
    ctx.save();
    
    // Clear with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
    
    // Get Laplace parameters
    const sigma = state.laplaceSigma || 0;
    const omega = state.laplaceOmega || 1;
    
    // Split: TOP 45%, gap 10%, BOTTOM 45%
    const totalHeight = planeParams.height;
    const topHeight = Math.floor(totalHeight * 0.45);
    const gap = Math.floor(totalHeight * 0.10);
    const bottomHeight = totalHeight - topHeight - gap;
    
    const topParams = {
        ...planeParams,
        height: topHeight,
        offsetY: 0
    };
    
    const bottomParams = {
        ...planeParams,
        height: bottomHeight,
        offsetY: topHeight + gap
    };
    
    // Compute data once
    const expData = computeExponentialSpiralData(signal, sigma, omega);
    const windingData = computeLaplaceWindingData(signal, sigma, omega);
    
    if (expData.points.length === 0 || windingData.points.length === 0) {
        ctx.restore();
        return;
    }
    
    // Initialize viewport ONLY on first render or reset
    if (!planeParams.scale || !planeParams.origin || state.laplaceNeedViewportReset) {
        setupWindingViewportSplit(planeParams, windingData);
        state.laplaceNeedViewportReset = false;
    }
    
    // TOP PANEL - Show f(t)·e^(-st) winding spiral (3b1b style!)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, topParams.width, topParams.height);
    ctx.clip();
    
    // Adjust origin for top panel
    const topViewParams = {
        ...planeParams,
        width: topParams.width,
        height: topParams.height,
        offsetY: 0,
        origin: {
            x: planeParams.origin.x,
            y: planeParams.origin.y * (topParams.height / planeParams.height)
        }
    };
    
    drawEnhancedGrid(ctx, topViewParams);
    drawEnhancedAxes(ctx, topViewParams);
    // Draw the weighted spiral (this is what winds!)
    drawEnhancedSpiral(ctx, windingData, topViewParams, {r: 150, g: 200, b: 255});
    
    // Title - the key formula with better typography
    ctx.fillStyle = 'rgba(255, 200, 150, 1)';
    ctx.font = 'bold 16px "STIX Two Math", "Cambria Math", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('f(t) · e⁻ˢᵗ', topParams.width / 2, 18);
    
    ctx.restore();
    
    // BOTTOM PANEL - Show tip-to-tail integration (how it sums to center of mass)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bottomParams.offsetY, bottomParams.width, bottomParams.height);
    ctx.clip();
    
    // Adjust origin for bottom panel
    const bottomViewParams = {
        ...planeParams,
        width: bottomParams.width,
        height: bottomParams.height,
        offsetY: bottomParams.offsetY,
        origin: {
            x: planeParams.origin.x,
            y: bottomParams.offsetY + (planeParams.origin.y * (bottomParams.height / planeParams.height))
        }
    };
    
    drawEnhancedGrid(ctx, bottomViewParams);
    drawEnhancedAxes(ctx, bottomViewParams);
    // Draw tip-to-tail vectors showing integration
    drawTipToTailVectorsEnhanced(ctx, windingData, bottomViewParams);
    
    // Title - simplified for reliability (component rendering can be flaky)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleY = bottomParams.offsetY + 18;
    const centerX = bottomParams.width / 2;
    
    // Use a single, clear title with proper Unicode
    ctx.font = 'bold 15px "STIX Two Math", "Cambria Math", serif';
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.fillText('∫₀ᵀ f(τ)e⁻ˢᵗ dτ', centerX - 50, titleY);
    
    // Explanation label
    ctx.font = 'italic 13px "SF Pro Text", sans-serif';
    ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
    ctx.fillText('(Tip-to-Tail Sum)', centerX + 50, titleY + 2);
    ctx.restore();
    
    ctx.restore();
    
    ctx.restore();
}


/**
 * Compute e^(-st) spiral data (no f(t) modulation)
 */
function computeExponentialSpiralData(signal, sigma, omega) {
    const points = [];
    
    // Animation time parameter
    const animTime = state.laplaceAnimationTime !== undefined ? state.laplaceAnimationTime : 1.0;
    const maxT = signal[signal.length - 1].t * animTime;
    
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        if (pt.t > maxT) break;
        
        const t = pt.t;
        
        // Pure e^(-st) = e^(-(σ + jω)t)
        const expFactor = Math.exp(-sigma * t);
        const angle = -omega * t;
        const real = expFactor * Math.cos(angle);
        const imag = expFactor * Math.sin(angle);
        
        points.push({
            t: t,
            real: real,
            imag: imag,
            magnitude: expFactor,
            phase: angle
        });
    }
    
    return {
        points: points,
        maxT: maxT,
        animTime: animTime
    };
}

/**
 * Compute winding path data with animation support
 */
function computeLaplaceWindingData(signal, sigma, omega) {
    const points = [];
    let integralReal = 0;
    let integralImag = 0;
    let count = 0;
    
    // Animation time parameter (0 to 1)
    const animTime = state.laplaceAnimationTime !== undefined ? state.laplaceAnimationTime : 1.0;
    const maxT = signal[signal.length - 1].t * animTime;
    
    for (let i = 0; i < signal.length; i++) {
        const pt = signal[i];
        if (pt.t > maxT) break;
        
        const t = pt.t;
        const ft = pt.value;
        
        // Compute e^(-st) = e^(-(σ + jω)t)
        const expFactor = Math.exp(-sigma * t);
        const angle = -omega * t;
        const eCos = expFactor * Math.cos(angle);
        const eSin = expFactor * Math.sin(angle);
        
        // f(t) · e^(-st)
        const real = ft * eCos;
        const imag = ft * eSin;
        
        points.push({
            t: t,
            real: real,
            imag: imag,
            ft: ft,
            expReal: eCos,
            expImag: eSin,
            expMag: expFactor,
            expPhase: angle
        });
        
        integralReal += real;
        integralImag += imag;
        count++;
    }
    
    // Normalize integral (Riemann sum approximation)
    const dt = signal.length > 1 ? signal[1].t - signal[0].t : 0.01;
    integralReal *= dt;
    integralImag *= dt;
    
    return {
        points: points,
        integral: { real: integralReal, imag: integralImag },
        maxT: maxT,
        animTime: animTime
    };
}

/**
 * Setup viewport for winding - SIMPLE initialization with better framing
 */
function setupWindingViewportSplit(params, windingData) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    // Find bounds of BOTH the spiral AND the integral result
    let minReal = 0, maxReal = 0;
    let minImag = 0, maxImag = 0;
    
    for (const pt of points) {
        minReal = Math.min(minReal, pt.real);
        maxReal = Math.max(maxReal, pt.real);
        minImag = Math.min(minImag, pt.imag);
        maxImag = Math.max(maxImag, pt.imag);
    }
    
    // Include the integral result point
    const integral = windingData.integral;
    minReal = Math.min(minReal, integral.real);
    maxReal = Math.max(maxReal, integral.real);
    minImag = Math.min(minImag, integral.imag);
    maxImag = Math.max(maxImag, integral.imag);
    
    // Add generous padding for visibility
    const padding = 0.4;
    const rangeReal = maxReal - minReal;
    const rangeImag = maxImag - minImag;
    
    minReal -= rangeReal * padding;
    maxReal += rangeReal * padding;
    minImag -= rangeImag * padding;
    maxImag += rangeImag * padding;
    
    // Ensure reasonable minimum size (not too zoomed in)
    const minSize = 1.0;
    if (maxReal - minReal < minSize) {
        const center = (maxReal + minReal) / 2;
        minReal = center - minSize / 2;
        maxReal = center + minSize / 2;
    }
    if (maxImag - minImag < minSize) {
        const center = (maxImag + minImag) / 2;
        minImag = center - minSize / 2;
        maxImag = center + minSize / 2;
    }
    
    // Use same scale for X and Y to avoid distortion (like other panels)
    const xSpan = maxReal - minReal;
    const ySpan = maxImag - minImag;
    const maxSpan = Math.max(xSpan, ySpan);
    
    const scale = params.width / maxSpan;
    
    // Center the view
    const centerX = (minReal + maxReal) / 2;
    const centerY = (minImag + maxImag) / 2;
    
    params.scale = { x: scale, y: scale };
    params.origin = {
        x: params.width / 2 - centerX * scale,
        y: params.height / 2 + centerY * scale
    };
    params.currentVisXRange = [centerX - maxSpan/2, centerX + maxSpan/2];
    params.currentVisYRange = [centerY - maxSpan/2, centerY + maxSpan/2];
}

/**
 * Setup viewport to show winding nicely - ONLY on first init, preserve pan/zoom after
 */
function setupWindingViewport(planeParams, windingData) {
    // If already initialized with scale/origin, DON'T reset (preserve user pan/zoom)
    if (planeParams.scale && planeParams.origin && !state.laplaceNeedViewportReset) {
        // Just update the ranges based on current scale/origin
        updatePlaneViewportRanges(planeParams);
        return;
    }
    
    const points = windingData.points;
    if (points.length === 0) return;
    
    // Find bounds
    let minReal = Infinity, maxReal = -Infinity;
    let minImag = Infinity, maxImag = -Infinity;
    
    for (const pt of points) {
        minReal = Math.min(minReal, pt.real);
        maxReal = Math.max(maxReal, pt.real);
        minImag = Math.min(minImag, pt.imag);
        maxImag = Math.max(maxImag, pt.imag);
    }
    
    // Add padding
    const rangeReal = maxReal - minReal;
    const rangeImag = maxImag - minImag;
    const padding = 0.2;
    
    minReal -= rangeReal * padding;
    maxReal += rangeReal * padding;
    minImag -= rangeImag * padding;
    maxImag += rangeImag * padding;
    
    // Ensure reasonable minimum size
    const minSize = 1;
    if (maxReal - minReal < minSize) {
        const center = (maxReal + minReal) / 2;
        minReal = center - minSize / 2;
        maxReal = center + minSize / 2;
    }
    if (maxImag - minImag < minSize) {
        const center = (maxImag + minImag) / 2;
        minImag = center - minSize / 2;
        maxImag = center + minSize / 2;
    }
    
    planeParams.currentVisXRange = [minReal, maxReal];
    planeParams.currentVisYRange = [minImag, maxImag];
    
    const xSpan = maxReal - minReal;
    const ySpan = maxImag - minImag;
    
    planeParams.scale = {
        x: planeParams.width / xSpan,
        y: planeParams.height / ySpan
    };
    planeParams.origin = {
        x: -minReal * planeParams.scale.x,
        y: planeParams.height + minImag * planeParams.scale.y
    };
    
    // Clear reset flag
    state.laplaceNeedViewportReset = false;
}

/**
 * Draw subtle grid
 */
function drawWindingGrid(ctx, planeParams) {
    const xRange = planeParams.currentVisXRange;
    const yRange = planeParams.currentVisYRange;
    
    ctx.strokeStyle = 'rgba(40, 60, 80, 0.3)';
    ctx.lineWidth = 0.5;
    
    const xStart = Math.floor(xRange[0]);
    const xEnd = Math.ceil(xRange[1]);
    const yStart = Math.floor(yRange[0]);
    const yEnd = Math.ceil(yRange[1]);
    
    // Vertical lines
    for (let x = xStart; x <= xEnd; x++) {
        if (x === 0) continue;
        const canvas = mapToCanvasCoords(x, 0, planeParams);
        ctx.beginPath();
        ctx.moveTo(canvas.x, 0);
        ctx.lineTo(canvas.x, planeParams.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = yStart; y <= yEnd; y++) {
        if (y === 0) continue;
        const canvas = mapToCanvasCoords(0, y, planeParams);
        ctx.beginPath();
        ctx.moveTo(0, canvas.y);
        ctx.lineTo(planeParams.width, canvas.y);
        ctx.stroke();
    }
}

/**
 * Draw axes with labels
 */
function drawWindingAxes(ctx, planeParams) {
    const origin = mapToCanvasCoords(0, 0, planeParams);
    
    // X-axis (Real)
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(planeParams.width, origin.y);
    ctx.stroke();
    
    // Y-axis (Imaginary)
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, planeParams.height);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = 'rgba(150, 180, 220, 0.9)';
    ctx.font = 'italic 12px "SF Pro Text", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Re', planeParams.width - 10, origin.y - 8);
    ctx.textAlign = 'left';
    ctx.fillText('Im', origin.x + 8, 20);
    
    // Origin dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 4, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * Draw the winding spiral path with progressive coloring (3b1b style!)
 * Uses perceptually uniform color gradient showing time evolution
 */
function drawWindingSpiral(ctx, windingData, planeParams) {
    const points = windingData.points;
    if (points.length < 2) return;
    
    const origin = mapToCanvasCoords(0, 0, planeParams);
    
    // Draw sample points first (so path draws over them)
    const sampleInterval = Math.max(1, Math.floor(points.length / 40));
    for (let i = 0; i < points.length; i += sampleInterval) {
        const pt = points[i];
        const canvas = mapToCanvasCoords(pt.real, pt.imag, planeParams);
        const progress = i / points.length;
        
        // Outer glow for sample points
        ctx.beginPath();
        ctx.arc(canvas.x, canvas.y, 5, 0, 2 * Math.PI);
        const glowHue = 180 + progress * 60;
        ctx.fillStyle = `hsla(${glowHue}, 70%, 60%, 0.15)`;
        ctx.fill();
        
        // Inner point
        ctx.beginPath();
        ctx.arc(canvas.x, canvas.y, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${glowHue}, 80%, 70%, 0.9)`;
        ctx.fill();
    }
    
    // Draw each segment with individual coloring (Riemann sum visualization)
    for (let i = 1; i < points.length; i++) {
        const pt0 = points[i - 1];
        const pt1 = points[i];
        
        const canvas0 = mapToCanvasCoords(pt0.real, pt0.imag, planeParams);
        const canvas1 = mapToCanvasCoords(pt1.real, pt1.imag, planeParams);
        
        // 3b1b-style color: Blue → Cyan → Teal gradient (perceptually smooth)
        const progress = i / points.length;
        const hue = 180 + progress * 60; // Cyan to blue
        const lightness = 55 + progress * 10; // Slight brightness increase
        const alpha = 0.5 + progress * 0.4; // More visible as we progress
        
        // Draw segment with thickness variation
        ctx.strokeStyle = `hsla(${hue}, 75%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = 2 + progress * 0.5; // Slight thickness increase
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(canvas0.x, canvas0.y);
        ctx.lineTo(canvas1.x, canvas1.y);
        ctx.stroke();
    }
    
    // Highlight the most recent segment (current timestep)
    if (points.length > 1 && windingData.animTime < 1.0) {
        const lastIdx = points.length - 1;
        const pt0 = points[lastIdx - 1];
        const pt1 = points[lastIdx];
        
        const canvas0 = mapToCanvasCoords(pt0.real, pt0.imag, planeParams);
        const canvas1 = mapToCanvasCoords(pt1.real, pt1.imag, planeParams);
        
        ctx.strokeStyle = 'rgba(255, 230, 100, 1)';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(canvas0.x, canvas0.y);
        ctx.lineTo(canvas1.x, canvas1.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

/**
 * Draw vector arrows at key sample points with labels
 */
function drawWindingVectors(ctx, windingData, planeParams) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    const origin = mapToCanvasCoords(0, 0, planeParams);
    
    // Show vectors at ~8-12 evenly spaced points
    const numVectors = Math.min(10, Math.max(5, Math.floor(points.length / 20)));
    const step = Math.floor(points.length / numVectors);
    
    for (let i = 0; i < points.length; i += step) {
        const pt = points[i];
        const canvas = mapToCanvasCoords(pt.real, pt.imag, planeParams);
        
        // Draw vector from origin
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(canvas.x, canvas.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Arrow head
        const angle = Math.atan2(canvas.y - origin.y, canvas.x - origin.x);
        const arrowSize = 8;
        ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(canvas.x, canvas.y);
        ctx.lineTo(
            canvas.x - arrowSize * Math.cos(angle - Math.PI / 6),
            canvas.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            canvas.x - arrowSize * Math.cos(angle + Math.PI / 6),
            canvas.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Point marker
        ctx.fillStyle = 'rgba(150, 220, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(canvas.x, canvas.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label e^(-st) value at select points
        if (i % (step * 2) === 0) {
            const label = `e^{-s·${pt.t.toFixed(1)}}`;
            ctx.fillStyle = 'rgba(180, 220, 255, 0.95)';
            ctx.font = '10px "SF Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, canvas.x, canvas.y - 12);
        }
    }
}

/**
 * Draw CENTER OF MASS - THE KEY INSIGHT! (3b1b emphasis)
 * This is what makes the Laplace transform intuitive
 */
function drawIntegralResult(ctx, windingData, planeParams) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    const origin = mapToCanvasCoords(0, 0, planeParams);
    const integral = windingData.integral;
    const resultCanvas = mapToCanvasCoords(integral.real, integral.imag, planeParams);
    
    // STEP 1: Show the spiral "balances" around this point
    // Draw subtle connection lines from sample points to center of mass
    const connectionInterval = Math.max(1, Math.floor(points.length / 12));
    for (let i = 0; i < points.length; i += connectionInterval) {
        const pt = points[i];
        const ptCanvas = mapToCanvasCoords(pt.real, pt.imag, planeParams);
        
        ctx.strokeStyle = 'rgba(100, 255, 180, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(ptCanvas.x, ptCanvas.y);
        ctx.lineTo(resultCanvas.x, resultCanvas.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // STEP 2: Draw partial sums building up (optional, subtle)
    const segmentSkip = Math.max(1, Math.floor(points.length / 15));
    let runningReal = 0;
    let runningImag = 0;
    
    const dt = points.length > 1 ? (points[1].t - points[0].t) : 0.01;
    
    for (let i = 0; i < points.length; i += segmentSkip) {
        const pt = points[i];
        runningReal += pt.real * dt;
        runningImag += pt.imag * dt;
        
        const runningCanvas = mapToCanvasCoords(runningReal, runningImag, planeParams);
        const progress = i / points.length;
        
        // Tiny dots showing accumulation
        ctx.fillStyle = `rgba(100, 255, 180, ${0.2 + progress * 0.3})`;
        ctx.beginPath();
        ctx.arc(runningCanvas.x, runningCanvas.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // STEP 3: CENTER OF MASS MARKER - Maximum emphasis!
    // This is THE visualization that makes Laplace transform click
    
    // Outermost glow (large, subtle)
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 50, 0, 2 * Math.PI);
    const outerGlow = ctx.createRadialGradient(resultCanvas.x, resultCanvas.y, 0, resultCanvas.x, resultCanvas.y, 50);
    outerGlow.addColorStop(0, 'rgba(100, 255, 150, 0.25)');
    outerGlow.addColorStop(0.5, 'rgba(100, 255, 150, 0.12)');
    outerGlow.addColorStop(1, 'rgba(100, 255, 150, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fill();
    
    // Middle glow (brighter)
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 30, 0, 2 * Math.PI);
    const midGlow = ctx.createRadialGradient(resultCanvas.x, resultCanvas.y, 0, resultCanvas.x, resultCanvas.y, 30);
    midGlow.addColorStop(0, 'rgba(150, 255, 180, 0.5)');
    midGlow.addColorStop(1, 'rgba(100, 255, 150, 0)');
    ctx.fillStyle = midGlow;
    ctx.fill();
    
    // Vector from origin to final integral
    const vecGradient = ctx.createLinearGradient(origin.x, origin.y, resultCanvas.x, resultCanvas.y);
    vecGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
    vecGradient.addColorStop(1, 'rgba(100, 255, 150, 1)');
    
    ctx.strokeStyle = vecGradient;
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(100, 255, 150, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(resultCanvas.x, resultCanvas.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Arrow head
    const angle = Math.atan2(resultCanvas.y - origin.y, resultCanvas.x - origin.x);
    const arrowSize = 16;
    ctx.fillStyle = 'rgba(100, 255, 150, 1)';
    ctx.shadowColor = 'rgba(100, 255, 150, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(resultCanvas.x, resultCanvas.y);
    ctx.lineTo(
        resultCanvas.x - arrowSize * Math.cos(angle - Math.PI / 6),
        resultCanvas.y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        resultCanvas.x - arrowSize * Math.cos(angle + Math.PI / 6),
        resultCanvas.y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Result point with gradient
    const pointGradient = ctx.createRadialGradient(resultCanvas.x, resultCanvas.y, 0, resultCanvas.x, resultCanvas.y, 12);
    pointGradient.addColorStop(0, 'rgba(220, 255, 220, 1)');
    pointGradient.addColorStop(0.6, 'rgba(100, 255, 150, 1)');
    pointGradient.addColorStop(1, 'rgba(50, 200, 100, 1)');
    
    ctx.fillStyle = pointGradient;
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 12, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Label: CENTER OF MASS emphasis (3b1b style)
    const magnitude = Math.sqrt(integral.real * integral.real + integral.imag * integral.imag);
    
    // Title banner with background
    const labelX = resultCanvas.x + 20;
    const labelY = resultCanvas.y - 12;
    const labelText = 'Center of Mass';
    ctx.font = 'bold 13px "SF Pro Display", sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    
    // Dark background for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(labelX - 4, labelY - 14, textWidth + 8, 40);
    
    // Border
    ctx.strokeStyle = 'rgba(100, 255, 150, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(labelX - 4, labelY - 14, textWidth + 8, 40);
    
    // Main label
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, labelX, labelY);
    
    // Integral notation
    ctx.fillStyle = 'rgba(180, 220, 255, 0.95)';
    ctx.font = '11px "SF Mono", monospace';
    ctx.fillText('∫ f(t)e⁻ˢᵗ dt', labelX, labelY + 16);
    
    // Magnitude
    ctx.fillStyle = 'rgba(255, 255, 150, 1)';
    ctx.font = 'bold 11px "SF Mono", monospace';
    ctx.fillText(`|F(s)| = ${magnitude.toFixed(3)}`, resultCanvas.x + 20, resultCanvas.y + 30);
}

/**
 * Draw labels and info overlay
 */
function drawWindingLabels(ctx, sigma, omega, windingData, planeParams) {
    // Top-right formula display
    const formulaX = planeParams.width - 200;
    const formulaY = 20;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'italic 16px "Latin Modern Math", serif';
    ctx.textAlign = 'right';
    ctx.fillText('f(t)e', formulaX, formulaY);
    
    ctx.font = '10px "Latin Modern Math", serif';
    ctx.fillText('-st', formulaX + 5, formulaY - 5);
    
    // Current s value
    ctx.fillStyle = 'rgba(255, 230, 100, 1)';
    ctx.font = 'bold 13px "SF Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`s = ${sigma >= 0 ? '+' : ''}${sigma.toFixed(2)} ${omega >= 0 ? '+' : ''}${omega.toFixed(2)}i`, planeParams.width - 20, formulaY + 25);
    
    // Time parameter if animating
    if (windingData.animTime < 1.0) {
        ctx.fillStyle = 'rgba(255, 200, 100, 1)';
        ctx.font = 'bold 14px "SF Pro Display", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`t = ${windingData.maxT.toFixed(2)}`, planeParams.width - 20, formulaY + 50);
    }
}
