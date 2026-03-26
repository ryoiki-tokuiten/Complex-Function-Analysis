/**
 * Canvas Primitives - Shared rendering utilities
 */

function drawGrid(ctx, params, { style = 'enhanced', maxLines = 30 } = {}) {
    if (!params.currentVisXRange || !params.currentVisYRange) return;

    const xRange = params.currentVisXRange;
    const yRange = params.currentVisYRange;

    if (style === 'simple' || (xRange[1] - xRange[0] > maxLines || yRange[1] - yRange[0] > maxLines)) {
        ctx.strokeStyle = 'rgba(40, 60, 80, 0.25)';
        ctx.lineWidth = 0.5;
        for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x++) {
            if (x === 0) continue;
            const canvasX = params.origin.x + x * params.scale.x;
            ctx.beginPath(); ctx.moveTo(canvasX, params.offsetY || 0); ctx.lineTo(canvasX, (params.offsetY || 0) + params.height); ctx.stroke();
        }
        for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y++) {
            if (y === 0) continue;
            const canvasY = params.origin.y - y * params.scale.y;
            ctx.beginPath(); ctx.moveTo(0, canvasY); ctx.lineTo(params.width, canvasY); ctx.stroke();
        }
        return;
    }

    ctx.strokeStyle = 'rgba(40, 60, 80, 0.15)';
    ctx.lineWidth = 0.5;
    let lineCount = 0;
    for (let x = Math.ceil(xRange[0] * 2) / 2; x <= Math.floor(xRange[1] * 2) / 2 && lineCount < maxLines; x += 0.5) {
        if (Math.abs(x) < 0.01) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath(); ctx.moveTo(canvasX, params.offsetY || 0); ctx.lineTo(canvasX, (params.offsetY || 0) + params.height); ctx.stroke();
        lineCount++;
    }
    lineCount = 0;
    for (let y = Math.ceil(yRange[0] * 2) / 2; y <= Math.floor(yRange[1] * 2) / 2 && lineCount < maxLines; y += 0.5) {
        if (Math.abs(y) < 0.01) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath(); ctx.moveTo(0, canvasY); ctx.lineTo(params.width, canvasY); ctx.stroke();
        lineCount++;
    }

    ctx.strokeStyle = 'rgba(60, 80, 100, 0.3)';
    ctx.lineWidth = 1;
    lineCount = 0;
    for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]) && lineCount < maxLines; x++) {
        if (x === 0) continue;
        const canvasX = params.origin.x + x * params.scale.x;
        ctx.beginPath(); ctx.moveTo(canvasX, params.offsetY || 0); ctx.lineTo(canvasX, (params.offsetY || 0) + params.height); ctx.stroke();
        lineCount++;
    }
    lineCount = 0;
    for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]) && lineCount < maxLines; y++) {
        if (y === 0) continue;
        const canvasY = params.origin.y - y * params.scale.y;
        ctx.beginPath(); ctx.moveTo(0, canvasY); ctx.lineTo(params.width, canvasY); ctx.stroke();
        lineCount++;
    }
}

function drawAxes(ctx, params, { labels = true, glow = false, color = 'rgba(100, 180, 255, 0.6)' } = {}) {
    const originX = params.origin.x;
    const originY = params.origin.y;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
    }

    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(params.width, originY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX, params.offsetY || 0);
    ctx.lineTo(originX, (params.offsetY || 0) + params.height);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
    ctx.fill();

    if (labels) {
        ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Re', params.width - 10, originY - 8);
        ctx.textAlign = 'left';
        ctx.fillText('Im', originX + 8, (params.offsetY || 0) + 18);
    }
}

function drawArrowHead(ctx, x, y, angle, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawTipToTailVectors(ctx, windingData, params, options = {}) {
    const { numVectors = 12, style = 'enhanced', animTime = windingData.animTime || 1.0, showLabels = false } = options;
    const points = windingData.points;
    if (points.length === 0) return;

    const dt = points.length > 1 ? (points[1].t - points[0].t) : 0.01;
    const step = Math.max(1, Math.floor(points.length / numVectors));

    let runningReal = 0, runningImag = 0;
    const originX = params.origin.x, originY = params.origin.y;
    const maxIndex = Math.floor(points.length * animTime);
    let lastVisibleReal = 0, lastVisibleImag = 0;

    for (let i = 0; i < points.length && i < maxIndex; i += step) {
        const pt = points[i];
        const vecReal = pt.real * dt * step;
        const vecImag = pt.imag * dt * step;

        const startX = originX + runningReal * params.scale.x;
        const startY = originY - runningImag * params.scale.y;

        runningReal += vecReal; runningImag += vecImag;

        const endX = originX + runningReal * params.scale.x;
        const endY = originY - runningImag * params.scale.y;

        lastVisibleReal = runningReal; lastVisibleImag = runningImag;
        const isLast = (i + step >= maxIndex);
        const progress = i / points.length;

        let strokeColor, lineWidth, arrowSize;
        if (style === 'optimized') {
            strokeColor = isLast ? 'rgba(255, 230, 100, 0.9)' : 'rgba(200, 150, 255, 0.6)';
            lineWidth = isLast ? 3 : 2;
            arrowSize = isLast ? 10 : 7;
        } else {
            const hue = 280 + progress * 60;
            const alpha = isLast ? 1.0 : (0.7 + progress * 0.3);
            strokeColor = isLast ? 'rgba(255, 230, 100, 0.95)' : `hsla(${hue}, 75%, 65%, ${alpha})`;
            lineWidth = isLast ? 4 : 2.5;
            arrowSize = isLast ? 10 : 8;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

        const angle = Math.atan2(endY - startY, endX - startX);
        drawArrowHead(ctx, endX, endY, angle, arrowSize, strokeColor);

        if (showLabels && i % (step * 2) === 0 && pt.t > 0) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            ctx.fillStyle = 'rgba(255, 220, 180, 0.9)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`t=${pt.t.toFixed(1)}`, midX, midY - 8);
        }
    }

    const integral = windingData.integral;
    const resultX = originX + integral.real * params.scale.x;
    const resultY = originY - integral.imag * params.scale.y;

    ctx.fillStyle = 'rgba(150, 255, 180, 1)';
    ctx.beginPath(); ctx.arc(resultX, resultY, 6, 0, 2 * Math.PI); ctx.fill();
}

function drawSpiral(ctx, data, params, { baseColor = {r: 150, g: 200, b: 255}, enhanced = true } = {}) {
    const points = data.points;
    if (points.length < 2) return;

    if (!enhanced) {
        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const x = params.origin.x + points[i].real * params.scale.x;
            const y = params.origin.y - points[i].imag * params.scale.y;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
    }

    const maxSegments = 20;
    const segmentSize = Math.max(1, Math.floor(points.length / maxSegments));

    for (let i = 0; i < points.length - 1; i += segmentSize) {
        const endIdx = Math.min(i + segmentSize, points.length - 1);
        const progress = i / points.length;
        const alpha = 0.6 + progress * 0.4;

        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.lineWidth = 2 + progress * 1;
        ctx.beginPath();
        for (let j = i; j <= endIdx; j++) {
            const x = params.origin.x + points[j].real * params.scale.x;
            const y = params.origin.y - points[j].imag * params.scale.y;
            if (j === i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function hslToRgb(h,s,l){let r,g,b;if(s==0){r=g=b=l;}else{const hue2rgb=function(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
