// Helper functions for drawing split-panel Laplace visualizations

/**
 * Simple optimized grid (no expensive loops)
 */
function drawSimpleGrid(ctx, params) {
    if (!params.currentVisXRange || !params.currentVisYRange) return;
    
    ctx.strokeStyle = 'rgba(40, 60, 80, 0.25)';
    ctx.lineWidth = 0.5;
    
    // Draw only major grid lines
    const xRange = params.currentVisXRange;
    const yRange = params.currentVisYRange;
    
    for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x++) {
        if (x === 0) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath();
        ctx.moveTo(canvasX, params.offsetY);
        ctx.lineTo(canvasX, params.offsetY + params.height);
        ctx.stroke();
    }
    
    for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y++) {
        if (y === 0) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(params.width, canvasY);
        ctx.stroke();
    }
}

/**
 * Simple optimized axes
 */
function drawSimpleAxes(ctx, params) {
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(params.width, originY);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(originX, params.offsetY);
    ctx.lineTo(originX, params.offsetY + params.height);
    ctx.stroke();
    
    // Origin dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(originX, originY, 2, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * Enhanced grid with better styling (SAFE - limited lines)
 */
function drawEnhancedGrid(ctx, params) {
    if (!params.currentVisXRange || !params.currentVisYRange) return;
    
    const xRange = params.currentVisXRange;
    const yRange = params.currentVisYRange;
    
    // Safety: limit grid lines to prevent freeze
    const maxLines = 30;
    const xSpan = xRange[1] - xRange[0];
    const ySpan = yRange[1] - yRange[0];
    
    if (xSpan > maxLines || ySpan > maxLines) {
        // Too zoomed out, draw only major grid
        drawSimpleGrid(ctx, params);
        return;
    }
    
    // Minor grid (0.5 spacing)
    ctx.strokeStyle = 'rgba(40, 60, 80, 0.15)';
    ctx.lineWidth = 0.5;
    
    let lineCount = 0;
    for (let x = Math.ceil(xRange[0] * 2) / 2; x <= Math.floor(xRange[1] * 2) / 2 && lineCount < maxLines; x += 0.5) {
        if (Math.abs(x) < 0.01) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath();
        ctx.moveTo(canvasX, params.offsetY);
        ctx.lineTo(canvasX, params.offsetY + params.height);
        ctx.stroke();
        lineCount++;
    }
    
    lineCount = 0;
    for (let y = Math.ceil(yRange[0] * 2) / 2; y <= Math.floor(yRange[1] * 2) / 2 && lineCount < maxLines; y += 0.5) {
        if (Math.abs(y) < 0.01) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(params.width, canvasY);
        ctx.stroke();
        lineCount++;
    }
    
    // Major grid (1.0 spacing)
    ctx.strokeStyle = 'rgba(60, 80, 100, 0.3)';
    ctx.lineWidth = 1;
    
    lineCount = 0;
    for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]) && lineCount < maxLines; x++) {
        if (x === 0) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath();
        ctx.moveTo(canvasX, params.offsetY);
        ctx.lineTo(canvasX, params.offsetY + params.height);
        ctx.stroke();
        lineCount++;
    }
    
    lineCount = 0;
    for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]) && lineCount < maxLines; y++) {
        if (y === 0) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(params.width, canvasY);
        ctx.stroke();
        lineCount++;
    }
}

/**
 * Enhanced axes (NO GLOW - performance optimized)
 */
function drawEnhancedAxes(ctx, params) {
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    // X-axis
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(params.width, originY);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(originX, params.offsetY);
    ctx.lineTo(originX, params.offsetY + params.height);
    ctx.stroke();
    
    // Origin dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Axis labels
    ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Re', params.width - 10, originY - 8);
    ctx.textAlign = 'left';
    ctx.fillText('Im', originX + 8, params.offsetY + 18);
}

/**
 * Enhanced spiral with smooth gradient coloring (BRIGHT & VISIBLE)
 */
function drawEnhancedSpiral(ctx, data, params, baseColor) {
    const points = data.points;
    if (points.length < 2) return;
    
    // Limit segments to max 20 for performance
    const maxSegments = 20;
    const segmentSize = Math.max(1, Math.floor(points.length / maxSegments));
    
    for (let i = 0; i < points.length - 1; i += segmentSize) {
        const endIdx = Math.min(i + segmentSize, points.length - 1);
        const progress = i / points.length;
        const alpha = 0.6 + progress * 0.4;  // Brighter: 0.6 to 1.0
        
        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.lineWidth = 2 + progress * 1;  // Thicker: 2px to 3px
        ctx.beginPath();
        
        for (let j = i; j <= endIdx; j++) {
            const pt = points[j];
            const x = params.origin.x + pt.real * params.scale.x;
            const y = params.origin.y - pt.imag * params.scale.y;
            
            if (j === i) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Highlight current endpoint during animation
    if (data.animTime < 1.0 && points.length > 0) {
        const lastPt = points[points.length - 1];
        const x = params.origin.x + lastPt.real * params.scale.x;
        const y = params.origin.y - lastPt.imag * params.scale.y;
        
        ctx.fillStyle = 'rgba(255, 230, 100, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add white outline for visibility
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

/**
 * Simple spiral drawing - single pass, no gradients
 */
function drawSimpleSpiral(ctx, data, params, color) {
    const points = data.points;
    if (points.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const x = params.origin.x + pt.real * params.scale.x;
        const y = params.origin.y - pt.imag * params.scale.y;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
}

/**
 * ENHANCED tip-to-tail vectors with better visuals
 */
function drawTipToTailVectorsEnhanced(ctx, windingData, params) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    const dt = points.length > 1 ? (points[1].t - points[0].t) : 0.01;
    const numVectors = 12;
    const step = Math.max(1, Math.floor(points.length / numVectors));
    
    let runningReal = 0;
    let runningImag = 0;
    
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    const animTime = windingData.animTime || 1.0;
    const maxIndex = Math.floor(points.length * animTime);
    
    // Determine if we should show labels based on zoom level
    // Show labels ONLY when significantly zoomed in (vectors are well separated)
    const avgScale = (params.scale.x + params.scale.y) / 2;
    const showLabels = avgScale > 800; // Very high threshold - labels hidden by default, only show when really zoomed
    
    // Draw faint connecting line from origin to current sum first
    if (maxIndex > 0) {
        let sumReal = 0, sumImag = 0;
        for (let i = 0; i < maxIndex; i += step) {
            const pt = points[i];
            sumReal += pt.real * dt * step;
            sumImag += pt.imag * dt * step;
        }
        
        const sumX = originX + sumReal * params.scale.x;
        const sumY = originY - sumImag * params.scale.y;
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(sumX, sumY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Track where visible vectors actually end
    let lastVisibleReal = 0;
    let lastVisibleImag = 0;
    
    // Draw vectors tip-to-tail
    for (let i = 0; i < points.length && i < maxIndex; i += step) {
        const pt = points[i];
        
        const vecReal = pt.real * dt * step;
        const vecImag = pt.imag * dt * step;
        
        const startX = originX + runningReal * params.scale.x;
        const startY = originY - runningImag * params.scale.y;
        
        runningReal += vecReal;
        runningImag += vecImag;
        
        const endX = originX + runningReal * params.scale.x;
        const endY = originY - runningImag * params.scale.y;
        
        const isLast = (i + step >= maxIndex);
        const progress = i / points.length;
        
        // Track the actual end point of visible vectors
        lastVisibleReal = runningReal;
        lastVisibleImag = runningImag;
        
        // Vector color - purple to pink gradient (BRIGHTER)
        const hue = 280 + progress * 60;
        const alpha = isLast ? 1.0 : (0.7 + progress * 0.3);  // Brighter: 0.7 to 1.0
        const lineWidth = isLast ? 4 : 2.5;  // Thicker
        
        // Vector line (NO SHADOW for performance)
        ctx.strokeStyle = isLast ? 'rgba(255, 230, 100, 0.95)' : `hsla(${hue}, 75%, 65%, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowSize = isLast ? 10 : 8;
        
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // 3b1b-style integral label with limits (only when zoomed in, show for ALL vectors)
        if (showLabels && pt.t > 0.1) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Use proper mathematical notation with better spacing
            const t_val = pt.t.toFixed(1);
            // Build label with proper spacing: ∫ from 0 to t
            const integralSymbol = '∫';
            const subscript = '₀';
            const superscript = t_val;
            const mainText = `f(τ)e`;
            const exponent = '⁻ˢᵗ';
            const differential = 'dτ';
            
            // Measure components for proper layout
            // Use slightly smaller font size when showing many labels
            const fontSize = numVectors > 8 ? 11 : 13;
            ctx.font = `bold ${fontSize}px "STIX Two Math", "Cambria Math", "Latin Modern Math", serif`;
            
            // Draw background
            const totalText = `${integralSymbol}${subscript} ${mainText}${exponent} ${differential}`;
            const estimatedWidth = ctx.measureText(totalText).width + 15; // Extra space for superscript
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(midX - estimatedWidth/2 - 5, midY - 12, estimatedWidth + 10, 24);
            
            ctx.strokeStyle = 'rgba(150, 255, 180, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(midX - estimatedWidth/2 - 5, midY - 12, estimatedWidth + 10, 24);
            
            // Draw text components with proper positioning
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(180, 255, 200, 1)';
            
            let currentX = midX - estimatedWidth/2;
            
            // Integral symbol (larger)
            ctx.font = `bold ${fontSize + 3}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillText(integralSymbol, currentX, midY);
            currentX += ctx.measureText(integralSymbol).width;
            
            // Subscript 0 (smaller)
            ctx.font = `bold ${fontSize - 3}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillText(subscript, currentX - 3, midY + 4);
            
            // Superscript t value (slightly smaller)
            ctx.font = `bold ${fontSize - 2}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillStyle = 'rgba(255, 255, 150, 1)';
            ctx.fillText(superscript, currentX, midY - 6);
            currentX += Math.max(ctx.measureText(subscript).width, ctx.measureText(superscript).width) + 3;
            
            // Main expression
            ctx.font = `bold ${fontSize}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillStyle = 'rgba(180, 255, 200, 1)';
            ctx.fillText(mainText, currentX, midY);
            currentX += ctx.measureText(mainText).width;
            
            // Exponent (slightly smaller)
            ctx.font = `bold ${fontSize - 2}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillText(exponent, currentX, midY - 2);
            currentX += ctx.measureText(exponent).width + 2;
            
            // Differential
            ctx.font = `bold ${fontSize}px "STIX Two Math", "Cambria Math", serif`;
            ctx.fillText(differential, currentX, midY);
        }
        
        // Dot at tip (larger and brighter)
        ctx.fillStyle = isLast ? 'rgba(255, 230, 100, 1)' : `hsla(${hue}, 85%, 70%, 1.0)`;
        ctx.beginPath();
        ctx.arc(endX, endY, isLast ? 5 : 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // White outline for better visibility
        if (isLast) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(endX, endY, 5, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
    
    // DRAW FINAL SUMMED VECTOR - from origin to where visible vectors actually end!
    const visibleSumX = originX + lastVisibleReal * params.scale.x;
    const visibleSumY = originY - lastVisibleImag * params.scale.y;
    
    // Only draw if we have visible vectors
    if (Math.abs(lastVisibleReal) > 0.001 || Math.abs(lastVisibleImag) > 0.001) {
        // Draw glowing line from origin to final sum
        ctx.strokeStyle = 'rgba(100, 255, 150, 0.6)';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(100, 255, 150, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(visibleSumX, visibleSumY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // White outline for final vector
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(visibleSumX, visibleSumY);
        ctx.stroke();
        
        // Arrow head on final vector
        const finalAngle = Math.atan2(visibleSumY - originY, visibleSumX - originX);
        const arrowSize = 14;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(visibleSumX, visibleSumY);
        ctx.lineTo(
            visibleSumX - arrowSize * Math.cos(finalAngle - Math.PI / 6),
            visibleSumY - arrowSize * Math.sin(finalAngle - Math.PI / 6)
        );
        ctx.lineTo(
            visibleSumX - arrowSize * Math.cos(finalAngle + Math.PI / 6),
            visibleSumY - arrowSize * Math.sin(finalAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }
    
    // Show theoretical full integral result as a separate marker
    const integral = windingData.integral;
    const resultX = originX + integral.real * params.scale.x;
    const resultY = originY - integral.imag * params.scale.y;
    
    // Draw faint line from current sum to theoretical full integral (shows where we're heading)
    if (animTime < 0.99 && (Math.abs(lastVisibleReal - integral.real) > 0.01 || Math.abs(lastVisibleImag - integral.imag) > 0.01)) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(visibleSumX, visibleSumY);
        ctx.lineTo(resultX, resultY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Outer glow circles (multiple for better visibility)
    ctx.fillStyle = 'rgba(100, 255, 150, 0.15)';
    ctx.beginPath();
    ctx.arc(resultX, resultY, 18, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(100, 255, 150, 0.25)';
    ctx.beginPath();
    ctx.arc(resultX, resultY, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // Main dot (larger and brighter)
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.beginPath();
    ctx.arc(resultX, resultY, 7, 0, 2 * Math.PI);
    ctx.fill();
    
    // Thick white outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(resultX, resultY, 7, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Label with FULL integral notation (3b1b style!) - MUCH MORE READABLE
    const mag = Math.sqrt(integral.real * integral.real + integral.imag * integral.imag);
    const maxT = points[points.length - 1].t;
    
    // Build readable integral notation
    const boxWidth = 180;
    const boxHeight = 44;
    
    // Dark background with glowing border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(resultX + 14, resultY - 20, boxWidth, boxHeight);
    
    ctx.strokeStyle = 'rgba(100, 255, 150, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(resultX + 14, resultY - 20, boxWidth, boxHeight);
    
    // LINE 1: Integral with limits
    let currentX = resultX + 20;
    let currentY = resultY - 8;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Integral symbol (large)
    ctx.font = 'bold 18px "STIX Two Math", "Cambria Math", serif';
    ctx.fillStyle = 'rgba(180, 255, 200, 1)';
    ctx.fillText('∫', currentX, currentY);
    currentX += 12;
    
    // Lower limit: 0
    ctx.font = 'bold 11px "STIX Two Math", serif';
    ctx.fillText('0', currentX - 6, currentY + 6);
    
    // Upper limit: T
    ctx.font = 'bold 12px "STIX Two Math", serif';
    ctx.fillStyle = 'rgba(255, 255, 150, 1)';
    ctx.fillText(maxT.toFixed(1), currentX - 3, currentY - 8);
    currentX += 12;
    
    // Function notation f(τ)
    ctx.font = 'bold 14px "STIX Two Math", "Cambria Math", serif';
    ctx.fillStyle = 'rgba(180, 255, 200, 1)';
    ctx.fillText('f(τ)', currentX, currentY);
    currentX += ctx.measureText('f(τ)').width + 2;
    
    // e with exponent
    ctx.fillText('e', currentX, currentY);
    currentX += ctx.measureText('e').width;
    
    ctx.font = 'bold 11px "STIX Two Math", serif';
    ctx.fillText('⁻ˢᵗ', currentX, currentY - 3);
    currentX += ctx.measureText('⁻ˢᵗ').width + 3;
    
    // Differential dτ
    ctx.font = 'bold 14px "STIX Two Math", serif';
    ctx.fillText('dτ', currentX, currentY);
    
    // LINE 2: Equals and result
    currentX = resultX + 20;
    currentY = resultY + 10;
    
    ctx.font = 'bold 15px "SF Pro Display", sans-serif';
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.fillText('= 𝐹(s)', currentX, currentY);
    currentX += ctx.measureText('= 𝐹(s)').width + 8;
    
    // Magnitude with better styling
    ctx.font = 'bold 12px "SF Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 150, 1)';
    ctx.fillText(`≈ ${mag.toFixed(3)}`, currentX, currentY);
}

/**
 * Optimized tip-to-tail vectors - max 12 vectors, no expensive operations
 */
function drawTipToTailVectorsOptimized(ctx, windingData, params) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    const dt = points.length > 1 ? (points[1].t - points[0].t) : 0.01;
    const numVectors = 12;  // Fixed count for performance
    const step = Math.max(1, Math.floor(points.length / numVectors));
    
    let runningReal = 0;
    let runningImag = 0;
    
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    // Determine how many vectors to show based on animation
    const animTime = windingData.animTime || 1.0;
    const maxIndex = Math.floor(points.length * animTime);
    
    for (let i = 0; i < points.length && i < maxIndex; i += step) {
        const pt = points[i];
        
        // Vector contribution
        const vecReal = pt.real * dt * step;
        const vecImag = pt.imag * dt * step;
        
        // Start and end points
        const startX = originX + runningReal * params.scale.x;
        const startY = originY - runningImag * params.scale.y;
        
        runningReal += vecReal;
        runningImag += vecImag;
        
        const endX = originX + runningReal * params.scale.x;
        const endY = originY - runningImag * params.scale.y;
        
        // Draw vector
        const isLast = (i + step >= maxIndex);
        ctx.strokeStyle = isLast ? 'rgba(255, 230, 100, 0.9)' : 'rgba(200, 150, 255, 0.6)';
        ctx.lineWidth = isLast ? 3 : 2;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowSize = isLast ? 10 : 7;
        
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Time label (every other vector)
        if (i % (step * 2) === 0 && pt.t > 0) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            ctx.fillStyle = 'rgba(255, 220, 180, 0.9)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`t=${pt.t.toFixed(1)}`, midX, midY - 8);
        }
    }
    
    // Final result
    const integral = windingData.integral;
    const resultX = originX + integral.real * params.scale.x;
    const resultY = originY - integral.imag * params.scale.y;
    
    ctx.fillStyle = 'rgba(100, 255, 150, 0.8)';
    ctx.beginPath();
    ctx.arc(resultX, resultY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    const mag = Math.sqrt(integral.real * integral.real + integral.imag * integral.imag);
    ctx.fillText(`F(s)=${mag.toFixed(2)}`, resultX + 10, resultY);
}

/**
 * Draw grid for subpanel
 */
function drawSubpanelGrid(ctx, params) {
    const xRange = params.currentVisXRange;
    const yRange = params.currentVisYRange;
    
    if (!xRange || !yRange) return;
    
    ctx.strokeStyle = 'rgba(40, 60, 80, 0.3)';
    ctx.lineWidth = 0.5;
    
    const xStart = Math.floor(xRange[0]);
    const xEnd = Math.ceil(xRange[1]);
    const yStart = Math.floor(yRange[0]);
    const yEnd = Math.ceil(yRange[1]);
    
    // Vertical lines
    for (let x = xStart; x <= xEnd; x++) {
        if (x === 0) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath();
        ctx.moveTo(canvasX, params.offsetY);
        ctx.lineTo(canvasX, params.offsetY + params.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = yStart; y <= yEnd; y++) {
        if (y === 0) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(params.width, canvasY);
        ctx.stroke();
    }
}

/**
 * Draw axes for subpanel
 */
function drawSubpanelAxes(ctx, params) {
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    // X-axis (Real)
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(params.width, originY);
    ctx.stroke();
    
    // Y-axis (Imaginary)
    ctx.beginPath();
    ctx.moveTo(originX, params.offsetY);
    ctx.lineTo(originX, params.offsetY + params.height);
    ctx.stroke();
    
    // Origin dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Axis labels (smaller for subpanels)
    ctx.fillStyle = 'rgba(150, 180, 220, 0.7)';
    ctx.font = '9px "SF Pro Text", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Re', params.width - 8, originY - 5);
    ctx.textAlign = 'left';
    ctx.fillText('Im', originX + 5, params.offsetY + 15);
}

/**
 * Draw exponential spiral path (for top panel)
 */
function drawExponentialPath(ctx, expData, params) {
    const points = expData.points;
    if (points.length < 2) return;
    
    // Draw spiral with gradient coloring
    for (let i = 1; i < points.length; i++) {
        const pt0 = points[i - 1];
        const pt1 = points[i];
        
        const canvas0 = {
            x: params.origin.x + pt0.real * params.scale.x,
            y: params.origin.y - pt0.imag * params.scale.y
        };
        const canvas1 = {
            x: params.origin.x + pt1.real * params.scale.x,
            y: params.origin.y - pt1.imag * params.scale.y
        };
        
        // Color based on progress
        const progress = i / points.length;
        const hue = 180 + progress * 60; // Cyan to blue
        const alpha = 0.4 + progress * 0.4;
        
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas0.x, canvas0.y);
        ctx.lineTo(canvas1.x, canvas1.y);
        ctx.stroke();
    }
    
    // Highlight current segment if animating
    if (points.length > 1 && expData.animTime < 1.0) {
        const lastIdx = points.length - 1;
        const pt0 = points[lastIdx - 1];
        const pt1 = points[lastIdx];
        
        const canvas0 = {
            x: params.origin.x + pt0.real * params.scale.x,
            y: params.origin.y - pt0.imag * params.scale.y
        };
        const canvas1 = {
            x: params.origin.x + pt1.real * params.scale.x,
            y: params.origin.y - pt1.imag * params.scale.y
        };
        
        ctx.strokeStyle = 'rgba(255, 230, 100, 1)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(canvas0.x, canvas0.y);
        ctx.lineTo(canvas1.x, canvas1.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

/**
 * Draw TIP-TO-TAIL vector addition (3Blue1Brown style!)
 * Shows f(t_i)·e^(-st_i)·Δt vectors being added sequentially
 */
function drawTipToTailVectors(ctx, windingData, params) {
    const points = windingData.points;
    if (points.length === 0) return;
    
    const dt = points.length > 1 ? (points[1].t - points[0].t) : 0.01;
    
    // Show ~10-15 discrete vectors for clarity
    const numVectors = Math.min(15, Math.max(8, Math.floor(points.length / 20)));
    const step = Math.floor(points.length / numVectors);
    
    // Running position (tip of previous vector)
    let runningReal = 0;
    let runningImag = 0;
    
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    for (let i = 0; i < points.length; i += step) {
        const pt = points[i];
        
        // Vector contribution: f(t_i)·e^(-st_i)·Δt
        const vecReal = pt.real * dt;
        const vecImag = pt.imag * dt;
        
        // Start point (tip of previous vector)
        const startX = params.origin.x + runningReal * params.scale.x;
        const startY = params.origin.y - runningImag * params.scale.y;
        
        // End point (tip of this vector)
        runningReal += vecReal;
        runningImag += vecImag;
        const endX = params.origin.x + runningReal * params.scale.x;
        const endY = params.origin.y - runningImag * params.scale.y;
        
        // Color based on progress
        const progress = i / points.length;
        const hue = 280 + progress * 80; // Purple to pink
        const alpha = 0.6 + progress * 0.3;
        
        // Draw vector arrow from start to end
        ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowSize = 8;
        ctx.fillStyle = `hsla(${hue}, 75%, 65%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Label with time value
        if (i % (step * 2) === 0) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Background for label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            const labelText = `t=${pt.t.toFixed(1)}`;
            ctx.font = '9px "SF Mono", monospace';
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillRect(midX - textWidth/2 - 3, midY - 10, textWidth + 6, 14);
            
            // Label text
            ctx.fillStyle = 'rgba(255, 220, 180, 1)';
            ctx.textAlign = 'center';
            ctx.fillText(labelText, midX, midY);
        }
        
        // Draw dot at tip
        ctx.fillStyle = `hsla(${hue}, 85%, 75%, 0.9)`;
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Highlight current vector if animating
        if (windingData.animTime < 1.0 && i >= points.length - step) {
            // Glow on current vector
            ctx.strokeStyle = 'rgba(255, 230, 100, 1)';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
    
    // Draw faint line from origin to final sum for reference
    const finalX = params.origin.x + runningReal * params.scale.x;
    const finalY = params.origin.y - runningImag * params.scale.y;
    
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(finalX, finalY);
    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * Draw final integral result for split panel (smaller, less emphasis)
 */
function drawIntegralResultSplit(ctx, windingData, params) {
    const integral = windingData.integral;
    const origin = { x: params.origin.x, y: params.origin.y };
    const resultCanvas = {
        x: params.origin.x + integral.real * params.scale.x,
        y: params.origin.y - integral.imag * params.scale.y
    };
    
    // Glow
    const glowGradient = ctx.createRadialGradient(resultCanvas.x, resultCanvas.y, 0, resultCanvas.x, resultCanvas.y, 25);
    glowGradient.addColorStop(0, 'rgba(100, 255, 150, 0.3)');
    glowGradient.addColorStop(1, 'rgba(100, 255, 150, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 25, 0, 2 * Math.PI);
    ctx.fill();
    
    // Result point
    const pointGradient = ctx.createRadialGradient(resultCanvas.x, resultCanvas.y, 0, resultCanvas.x, resultCanvas.y, 10);
    pointGradient.addColorStop(0, 'rgba(220, 255, 220, 1)');
    pointGradient.addColorStop(0.6, 'rgba(100, 255, 150, 1)');
    pointGradient.addColorStop(1, 'rgba(50, 200, 100, 1)');
    
    ctx.fillStyle = pointGradient;
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(resultCanvas.x, resultCanvas.y, 10, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Label
    const magnitude = Math.sqrt(integral.real * integral.real + integral.imag * integral.imag);
    
    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.font = 'bold 11px "SF Pro Display", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText('F(s)', resultCanvas.x + 14, resultCanvas.y - 5);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'rgba(200, 255, 220, 0.95)';
    ctx.font = '10px "SF Mono", monospace';
    ctx.fillText(`= ${magnitude.toFixed(3)}`, resultCanvas.x + 14, resultCanvas.y + 8);
}

/**
 * Draw sample vectors for exponential spiral (top panel)
 */
function drawExponentialVectors(ctx, expData, params) {
    const points = expData.points;
    if (points.length === 0) return;
    
    const originX = params.origin.x;
    const originY = params.origin.y;
    
    // Show vectors at evenly spaced points
    const numVectors = Math.min(8, Math.max(4, Math.floor(points.length / 25)));
    const step = Math.floor(points.length / numVectors);
    
    for (let i = 0; i < points.length; i += step) {
        const pt = points[i];
        
        const canvasX = params.origin.x + pt.real * params.scale.x;
        const canvasY = params.origin.y - pt.imag * params.scale.y;
        
        // Draw vector from origin
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(canvasX, canvasY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Arrow head
        const angle = Math.atan2(canvasY - originY, canvasX - originX);
        const arrowSize = 6;
        ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY);
        ctx.lineTo(
            canvasX - arrowSize * Math.cos(angle - Math.PI / 6),
            canvasY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            canvasX - arrowSize * Math.cos(angle + Math.PI / 6),
            canvasY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Point marker
        ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label with time value at select points
        if (i % (step * 2) === 0 && pt.t > 0) {
            ctx.fillStyle = 'rgba(180, 220, 255, 0.9)';
            ctx.font = '9px "SF Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`t=${pt.t.toFixed(1)}`, canvasX, canvasY - 10);
        }
    }
}
