function drawTaylorAxes(ctx, params, colorX, colorY, labelX, labelY) {
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.lineWidth = LINE_WIDTH_THIN;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const origin = mapToCanvasCoords(0, 0, params);
    const currentXRange = params.currentVisXRange || params.xRange;
    const currentYRange = params.currentVisYRange || params.yRange;

    ctx.strokeStyle = colorY;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, params.height);
    ctx.stroke();

    ctx.strokeStyle = colorX;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(params.width, origin.y);
    ctx.stroke();

    ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
    ctx.font = "11px 'SF Pro Text', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labelY, origin.x + 5, 5);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(labelX, params.width - 5, origin.y - 5);

    ctx.font = "10px 'SF Pro Text', sans-serif";

    ctx.strokeStyle = colorX;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStart = Math.ceil(currentXRange[0]);
    const xEnd = Math.floor(currentXRange[1]);
    for (let x = xStart; x <= xEnd + 1e-6; x++) {
        const tick = mapToCanvasCoords(x, 0, params);
        const label = Math.abs(x) < 1e-3 ? '0' : x.toFixed(0);
        ctx.fillText(label, tick.x, tick.y + 5);
        ctx.beginPath();
        ctx.moveTo(tick.x, tick.y - 3);
        ctx.lineTo(tick.x, tick.y + 3);
        ctx.stroke();
    }

    ctx.strokeStyle = colorY;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yStart = Math.ceil(currentYRange[0]);
    const yEnd = Math.floor(currentYRange[1]);
    for (let y = yStart; y <= yEnd + 1e-6; y++) {
        const tick = mapToCanvasCoords(0, y, params);
        const label = Math.abs(y) < 1e-3 ? '0' : y.toFixed(0);
        ctx.fillText(label, tick.x - 5, tick.y);
        ctx.beginPath();
        ctx.moveTo(tick.x - 3, tick.y);
        ctx.lineTo(tick.x + 3, tick.y);
        ctx.stroke();
    }

    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.restore();
}

function drawZerosAndPolesMarkers(ctx, planeParams) {
    let contourParams = null;
    if (
        state.cauchyIntegralModeEnabled &&
        (!state.riemannSphereViewEnabled || state.splitViewEnabled) &&
        (state.currentInputShape === 'circle' || state.currentInputShape === 'ellipse')
    ) {
        contourParams = state.currentInputShape === 'circle'
            ? { type: 'circle', cx: state.a0, cy: state.b0, r: state.circleR }
            : { type: 'ellipse', cx: state.a0, cy: state.b0, a: state.ellipseA, b: state.ellipseB };
    }

    state.zeros.forEach(zero => {
        const point = mapToCanvasCoords(zero.re, zero.im, planeParams);
        ctx.fillStyle = COLOR_ZERO_MARKER;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, TWO_PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 0, 0, 0.8)';
        ctx.lineWidth = LINE_WIDTH_THIN;
        ctx.stroke();
    });

    state.poles.forEach(pole => {
        const point = mapToCanvasCoords(pole.re, pole.im, planeParams);
        const insideContour = contourParams && isPointInsideContour(pole, contourParams.type, contourParams);
        const color = insideContour ? COLOR_POLE_INSIDE_CONTOUR_MARKER : COLOR_POLE_MARKER;
        const radius = insideContour ? 5 : 4;

        ctx.strokeStyle = color;
        ctx.lineWidth = insideContour ? LINE_WIDTH_THICK : 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(point.x - radius, point.y - radius);
        ctx.lineTo(point.x + radius, point.y + radius);
        ctx.moveTo(point.x + radius, point.y - radius);
        ctx.lineTo(point.x - radius, point.y + radius);
        ctx.stroke();
    });
}

function drawCriticalPointMarker(ctx, canvasPoint, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.85)';
    ctx.lineWidth = LINE_WIDTH_NORMAL;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(canvasPoint.x, canvasPoint.y - 5);
    ctx.lineTo(canvasPoint.x + 4, canvasPoint.y);
    ctx.lineTo(canvasPoint.x, canvasPoint.y + 5);
    ctx.lineTo(canvasPoint.x - 4, canvasPoint.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
