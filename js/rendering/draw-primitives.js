import { state } from '../store/state.js';
import { COLOR_ZERO_MARKER, COLOR_POLE_MARKER, COLOR_POLE_INSIDE_CONTOUR_MARKER } from '../constants/colors.js';
import { TWO_PI } from '../constants/numerical.js';
import { LINE_WIDTH_THIN, LINE_WIDTH_NORMAL, LINE_WIDTH_THICK } from '../constants/rendering.js';
import { isPointInsideContour } from '../math-utils.js';
import { mapToCanvasCoords } from '../utils/canvas-utils.js';

export function drawZerosAndPolesMarkers(ctx, planeParams) {
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

export function drawCriticalPointMarker(ctx, canvasPoint, color) {
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


