import { state, context, zPlaneParams as defaultZPlaneParams, wPlaneParams as defaultWPlaneParams, sphereViewParams } from '../store/state.js';
import {
    COLOR_CANVAS_BACKGROUND,
    COLOR_TEXT_ON_CANVAS,
    COLOR_CRITICAL_POINT_Z,
    COLOR_CRITICAL_VALUE_W,
    COLOR_PROBE_NEIGHBORHOOD,
    COLOR_FTA_C_MARKER,
    COLOR_W_ORIGIN_GLOW
} from '../constants/colors.js';
import { MAX_POLY_DEGREE, ZETA_REFLECTION_POINT_RE } from '../constants/numerical.js';
import { ORIGIN_GLOW_DURATION_MS } from '../constants/rendering.js';
import { mapToCanvasCoords } from '../utils/canvas-utils.js';
import {
    getChainedTransformFunction,
    getChainedStageTransformFunction
} from '../math-utils.js';
import {
    drawWithWebGLRaster,
    drawWithWebGLCapture,
    drawPlanarTransformedShapeHybrid,
    drawPlanarInputShapeHybrid
} from './webgl-planar.js';
import { drawWindingVisualization, drawTimeDomainSignal } from './draw-fourier-winding.js';
import { drawLaplaceWindingVisualization, drawLaplaceTimeDomain } from './draw-laplace-panels.js';
import { ThreeRiemannRenderer } from './three-riemann-renderer.js';
import { generateCurrentMappedInputShapePointSets, buildInputShapeGeometryConfig } from './shape-generators.js';
import { hideRiemannSurface, renderRiemannSurface } from './webgl-riemann-surface.js';
import { drawAxes, drawGridLines } from './canvas-primitives.js';
import {
    drawTaylorAxes,
    drawZerosAndPolesMarkers,
    drawCriticalPointMarker,
    drawGeneralPointsMarkers
} from './draw-primitives.js';
import {
    drawPlanarTransformedShape,
    drawPlanarProbe,
    drawPlanarTransformedProbe,
    drawStreamlinesOnZPlane,
    updateAndDrawParticles,
    drawPlanarInputOverlays,
    drawPlanarTaylorApproximation,
    drawZPlaneVectorField
} from './draw-planar.js';
import { drawNavigationLayer } from '../navigation-plane.js';
import { renderSphereDomainColoring, renderPlanarDomainColoring } from './domain-coloring.js';
import { drawRiemannSphereBase, drawSphereGridAndShape, drawSphereProbeAndNeighborhood } from './draw-sphere.js';
import { updateWindingNumberDisplay } from '../analysis/cauchy.js';
import {
    getDynamicPlottingCacheKey
} from '../analysis/dynamic-plotting.js';
import {
    drawDynamicSphere,
    drawDynamicWPlane,
    drawDynamicZPlane,
    getDynamicSphereSceneData
} from './draw-dynamic-plotting.js';
import { getStaleDomainData, getCurrentFuncSignature } from './domain-dynamics.js';

let zCanvas;
let wCanvas;
let zCtx;
let wCtx;
let zDomainColorCanvas;
let wDomainColorCanvas;
let zDomainColorCtx;
let wDomainColorCtx;
let wCanvasList;
let wCtxList;
let wPlaneParamsList;
let wPlanePlotlyContainersList;
let sphereViewWParamsList;
let wStaticThreeRenderer = null;

const { controls } = context;

let zPlaneParams = defaultZPlaneParams;
let wPlaneParams = defaultWPlaneParams;

let wPlanarTransformedLayerCache;
let wPlanarTransformedLayerCacheList = [];

const zPlanarInputLayerCache = createLayerCache();
const zFlowLayerCache = createLayerCache();

const GRID_INPUT_SHAPES = new Set([
    'grid_cartesian',
    'grid_polar',
    'grid_logpolar'
]);

// A renderer is a tiny fallback pipeline: prefer capture when requested, degrade to raster.
const WEBGL_PIPELINES = Object.freeze({
    raster: Object.freeze([drawWithWebGLRaster]),
    capture: Object.freeze([drawWithWebGLCapture, drawWithWebGLRaster])
});

const FACTOR_KEY_BUILDERS = Object.freeze({
    mobius: appendMobiusKey,
    polynomial: appendPolynomialKey,
    power: appendFractionalPowerKey
});

const FUNCTION_CACHE_KEY_BUILDERS = Object.freeze({
    mobius: appendMobiusKey,
    polynomial: appendPolynomialKey,
    power: appendFractionalPowerKey,
    algebraic_chaining: appendAlgebraicChainingKey
});

const PLANAR_CACHE_FIELDS = Object.freeze([
    ['f', () => state.currentFunction],
    ['shape', () => state.currentInputShape],
    ['grid', () => state.gridDensity],
    ['zetaC', () => state.zetaContinuationEnabled ? 1 : 0],
    ['a0', () => toCacheKeyNumber(state.a0)],
    ['b0', () => toCacheKeyNumber(state.b0)],
    ['circleR', () => toCacheKeyNumber(state.circleR)],
    ['ellipseA', () => toCacheKeyNumber(state.ellipseA)],
    ['ellipseB', () => toCacheKeyNumber(state.ellipseB)],
    ['hyperbolaA', () => toCacheKeyNumber(state.hyperbolaA)],
    ['hyperbolaB', () => toCacheKeyNumber(state.hyperbolaB)],
    ['stripY1', () => toCacheKeyNumber(state.stripY1)],
    ['stripY2', () => toCacheKeyNumber(state.stripY2)],
    ['sectorA1', () => toCacheKeyNumber(state.sectorAngle1)],
    ['sectorA2', () => toCacheKeyNumber(state.sectorAngle2)],
    ['sectorRMin', () => toCacheKeyNumber(state.sectorRMin)],
    ['sectorRMax', () => toCacheKeyNumber(state.sectorRMax)],
    ['theme', () => state.themeId],
    ['gridCol1', () => state.gridColor1 || ''],
    ['gridCol2', () => state.gridColor2 || ''],
    ['imgSize', () => toCacheKeyNumber(state.imageSize)],
    ['imgOpacity', () => toCacheKeyNumber(state.imageOpacity)],
    ['imgVer', () => state.imageContentVersion || 0],
    ['vidFps', () => state.videoProcessingFps || 0],
    ['vidSize', () => toCacheKeyNumber(state.videoSize)],
    ['vidOpacity', () => toCacheKeyNumber(state.videoOpacity)],
    ['vidVer', () => state.videoFrameVersion || 0],
    ['dynamic', () => getDynamicPlottingCacheKey()]
]);

const Z_FLOW_CACHE_FIELDS = Object.freeze([
    ['flow', () => state.vectorFieldEnabled || state.streamlineFlowEnabled ? 1 : 0],
    ['vfMode', () => state.vectorFieldFunction],
    ['stream', () => state.streamlineFlowEnabled ? 1 : 0],
    ['vfScale', () => toCacheKeyNumber(state.vectorFieldScale)],
    ['vfThick', () => toCacheKeyNumber(state.vectorArrowThickness)],
    ['vfHead', () => toCacheKeyNumber(state.vectorArrowHeadSize)],
    ['sStep', () => toCacheKeyNumber(state.streamlineStepSize)],
    ['sMax', () => state.streamlineMaxLength],
    ['sThick', () => toCacheKeyNumber(state.streamlineThickness)],
    ['sSeed', () => toCacheKeyNumber(state.streamlineSeedDensityFactor)]
]);

const Z_SIGNAL_RENDERERS = Object.freeze([
    {
        enabled: () => state.fourierModeEnabled,
        signal: () => state.fourierTimeDomainSignal,
        draw: drawTimeDomainSignal
    },
    {
        enabled: () => state.laplaceModeEnabled,
        signal: () => state.laplaceTimeDomainSignal,
        draw: drawLaplaceTimeDomain
    }
]);

const W_SIGNAL_RENDERERS = Object.freeze([
    {
        enabled: () => state.fourierModeEnabled,
        signal: () => state.fourierTimeDomainSignal,
        draw: drawWindingVisualization
    },
    {
        enabled: () => state.laplaceModeEnabled,
        signal: () => state.laplaceTimeDomainSignal,
        draw: drawLaplaceWindingVisualization
    }
]);

function createLayerCache() {
    return {
        key: null,
        pendingKey: null,
        canvas: null,
        ctx: null
    };
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function isFiniteComplex(value) {
    return Number.isFinite(value?.re) && Number.isFinite(value?.im);
}

function isPanning(panState) {
    return Boolean(panState?.isPanning);
}

function isGridInputShape(shape = state.currentInputShape) {
    return GRID_INPUT_SHAPES.has(shape);
}

function invalidateCache(cache) {
    if (cache) {
        cache.key = null;
        cache.pendingKey = null;
    }
}

function syncRenderContext() {
    zCanvas = context.zCanvas;
    wCanvas = context.wCanvas;
    zCtx = context.zCtx;
    wCtx = context.wCtx;

    zDomainColorCanvas = context.zDomainColorCanvas;
    wDomainColorCanvas = context.wDomainColorCanvas;
    zDomainColorCtx = context.zDomainColorCtx;
    wDomainColorCtx = context.wDomainColorCtx;

    wCanvasList = context.wCanvasList;
    wCtxList = context.wCtxList;
    wPlaneParamsList = context.wPlaneParamsList;
    wPlanePlotlyContainersList = context.wPlanePlotlyContainersList;
    sphereViewWParamsList = context.sphereViewWParamsList;

    if (Array.isArray(context.wPlanarTransformedLayerCacheList)) {
        wPlanarTransformedLayerCacheList = context.wPlanarTransformedLayerCacheList;
    } else {
        context.wPlanarTransformedLayerCacheList = wPlanarTransformedLayerCacheList;
    }
}

function drawPlaneLayer(ctx, planeParams, planeKey, drawCallback, mode = 'capture') {
    if (!ctx || !planeParams || typeof drawCallback !== 'function') {
        return false;
    }

    // Raster mode is always faster when drawn directly to the canvas 2D context,
    // avoiding texture uploads and copies.
    if (mode === 'raster' || !state.webglLineRenderingEnabled) {
        drawCallback(ctx);
        return true;
    }

    const pipeline = WEBGL_PIPELINES[mode] || WEBGL_PIPELINES.capture;
    let rendered = false;

    if (state.webglLineRenderingEnabled) {
        rendered = pipeline.some(renderer => {
            // Skip the slow WebGL raster fallback
            if (renderer === drawWithWebGLRaster) return false;
            return renderer(ctx, planeParams, planeKey, drawCallback);
        });
    }

    if (!rendered) {
        drawCallback(ctx);
        rendered = true;
    }

    return rendered;
}

function drawLayerWhen(condition, ctx, planeParams, planeKey, drawCallback, mode = 'capture') {
    return Boolean(condition) && drawPlaneLayer(ctx, planeParams, planeKey, drawCallback, mode);
}

function withCanvasState(ctx, draw) {
    if (!ctx || typeof draw !== 'function') {
        return;
    }

    ctx.save();

    try {
        draw();
    } finally {
        ctx.restore();
    }
}

function resetCanvasContext(ctx, canvas) {
    if (!ctx || !canvas) {
        return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function ensurePlanarLayerCacheCanvas(cache, width, height) {
    if (!cache || width <= 0 || height <= 0 || typeof document === 'undefined') {
        return null;
    }

    if (!cache.canvas) {
        cache.canvas = document.createElement('canvas');
        cache.ctx = cache.canvas.getContext('2d');

        if (!cache.ctx) {
            cache.canvas = null;
            return null;
        }
    }

    if (cache.canvas.width !== width || cache.canvas.height !== height) {
        cache.canvas.width = width;
        cache.canvas.height = height;
        cache.key = null;
        cache.pendingKey = null;
    }

    return cache.canvas;
}

function renderThroughCache({
    cache,
    targetCtx,
    planeParams,
    cacheKey,
    enabled,
    render,
    renderDirect = render
}) {
    if (!targetCtx || !planeParams || typeof render !== 'function') {
        return;
    }

    if (!enabled) {
        invalidateCache(cache);
        renderDirect(targetCtx, { cacheKey, fresh: true, direct: true });
        return;
    }

    const cacheCanvas = ensurePlanarLayerCacheCanvas(cache, planeParams.width, planeParams.height);
    const cacheCtx = cache?.ctx;

    if (!cacheCanvas || !cacheCtx) {
        renderDirect(targetCtx, { cacheKey, fresh: true, direct: true });
        return;
    }

    if (cache.key !== cacheKey) {
        const fresh = cache.pendingKey !== cacheKey;

        if (fresh) {
            resetCanvasContext(cacheCtx, cacheCanvas);
            cache.pendingKey = cacheKey;
        }

        const complete = render(cacheCtx, { cacheKey, fresh }) !== false;

        if (complete) {
            cache.key = cacheKey;
            cache.pendingKey = null;
        } else {
            cache.key = null;
        }
    }

    targetCtx.drawImage(cacheCanvas, 0, 0);
}

function toCacheKeyNumber(value) {
    if (!Number.isFinite(value)) return `${value}`;
    if (Object.is(value, -0)) return '0';
    return Number(value).toPrecision(15);
}

function appendKey(parts, name, value) {
    parts.push(`${name}:${value}`);
}

function appendKeyFields(parts, fields) {
    fields.forEach(([name, read]) => appendKey(parts, name, read()));
}

function appendPointToCacheKey(parts, prefix, point) {
    if (!point) {
        appendKey(parts, prefix, 'none');
        return;
    }

    appendKey(parts, `${prefix}r`, toCacheKeyNumber(point.re));
    appendKey(parts, `${prefix}i`, toCacheKeyNumber(point.im));
}

function normalizedPolynomialDegree() {
    const rawDegree = Number.isFinite(state.polynomialN) ? state.polynomialN : 0;

    return Math.max(0, Math.min(MAX_POLY_DEGREE, rawDegree));
}

function appendMobiusKey(parts, prefix = '') {
    appendPointToCacheKey(parts, `${prefix}mA`, state.mobiusA);
    appendPointToCacheKey(parts, `${prefix}mB`, state.mobiusB);
    appendPointToCacheKey(parts, `${prefix}mC`, state.mobiusC);
    appendPointToCacheKey(parts, `${prefix}mD`, state.mobiusD);
}

function appendPolynomialKey(parts, prefix = '') {
    const degree = normalizedPolynomialDegree();
    const coeffs = asArray(state.polynomialCoeffs);

    appendKey(parts, `${prefix}polyN`, degree);

    for (let index = 0; index <= degree; index += 1) {
        appendPointToCacheKey(parts, `${prefix}p${index}`, coeffs[index] || null);
    }
}

function appendFractionalPowerKey(parts, prefix = '') {
    appendKey(parts, `${prefix}fracN`, toCacheKeyNumber(state.fractionalPowerN ?? 0.5));
}

function appendFactorTransformSpecificKey(parts, factor, prefix) {
    const functionNames = new Set([factor.func, factor.chainedFunc]);

    functionNames.forEach(name => {
        FACTOR_KEY_BUILDERS[name]?.(parts, prefix);
    });
}

function appendAlgebraicFactorFunctionKey(parts, term, termIndex) {
    const factors = asArray(term?.factors);

    appendKey(parts, `t${termIndex}`, factors.map(factor => factor?.func).join(','));
    appendPointToCacheKey(parts, `t${termIndex}c`, term?.coeff);

    factors.forEach((factor, factorIndex) => {
        if (!factor || factor.func === 'none') {
            return;
        }

        const prefix = `t${termIndex}f${factorIndex}`;

        appendKey(parts, `${prefix}chain`, factor.chainedFunc);
        appendKey(parts, `${prefix}pow`, toCacheKeyNumber(factor.power));
        appendKey(parts, `${prefix}recip`, factor.reciprocal ? 1 : 0);
        appendKey(parts, `${prefix}log`, factor.log ? 1 : 0);
        appendKey(parts, `${prefix}exp`, factor.exp ? 1 : 0);
        appendFactorTransformSpecificKey(parts, factor, prefix);
    });
}

function appendAlgebraicChainingKey(parts) {
    const terms = asArray(state.algebraicChainingTerms);

    appendKey(parts, 'algTerms', terms.length);
    terms.forEach((term, index) => appendAlgebraicFactorFunctionKey(parts, term, index));
}

function appendCurrentFunctionStateToCacheKey(parts) {
    FUNCTION_CACHE_KEY_BUILDERS[state.currentFunction]?.(parts);
}

function appendManualSeedPointsToCacheKey(parts, seedPoints) {
    const points = asArray(seedPoints);

    appendKey(parts, 'manualSeeds', points.length);
    points.forEach((point, index) => appendPointToCacheKey(parts, `seed${index}`, point));
}

function appendPlaneViewportKey(parts, sourceParams, targetParams) {
    appendKey(parts, 'zX0', toCacheKeyNumber(sourceParams?.currentVisXRange?.[0]));
    appendKey(parts, 'zX1', toCacheKeyNumber(sourceParams?.currentVisXRange?.[1]));
    appendKey(parts, 'zY0', toCacheKeyNumber(sourceParams?.currentVisYRange?.[0]));
    appendKey(parts, 'zY1', toCacheKeyNumber(sourceParams?.currentVisYRange?.[1]));
    appendKey(parts, 'Ox', toCacheKeyNumber(targetParams?.origin?.x));
    appendKey(parts, 'Oy', toCacheKeyNumber(targetParams?.origin?.y));
    appendKey(parts, 'Sx', toCacheKeyNumber(targetParams?.scale?.x));
    appendKey(parts, 'Sy', toCacheKeyNumber(targetParams?.scale?.y));
    appendKey(parts, 'W', targetParams?.width);
    appendKey(parts, 'H', targetParams?.height);
}

function appendChainingCacheKey(parts) {
    appendKey(parts, 'chain', state.chainingEnabled ? 1 : 0);

    if (!state.chainingEnabled) {
        return;
    }

    appendKey(parts, 'cM', state.chainingMode);
    appendKey(parts, 'cC', state.chainCount);
    appendKey(parts, 'orbit', state.fractalOrbitColoringEnabled ? 1 : 0);
}

function appendTaylorCacheKey(parts, isWPlane) {
    appendKey(parts, 'taylor', isWPlane && state.taylorSeriesEnabled ? 1 : 0);

    if (!isWPlane || !state.taylorSeriesEnabled) {
        return;
    }

    appendPointToCacheKey(parts, 'tC', state.taylorSeriesCenter);
    appendKey(parts, 'tO', state.taylorSeriesOrder);
}

function buildPlanarLayerCacheKey(isWPlane) {
    const params = isWPlane ? wPlaneParams : zPlaneParams;
    const parts = [];

    appendTaylorCacheKey(parts, isWPlane);
    appendKeyFields(parts, PLANAR_CACHE_FIELDS);
    appendPlaneViewportKey(parts, zPlaneParams, params);
    appendCurrentFunctionStateToCacheKey(parts);
    appendChainingCacheKey(parts);

    return parts.join('|');
}

function buildZFlowLayerCacheKey() {
    const parts = [buildPlanarLayerCacheKey(false)];

    appendKeyFields(parts, Z_FLOW_CACHE_FIELDS);
    if (state.vectorFieldEnabled && !state.streamlineFlowEnabled) {
        appendKey(parts, 'vfDomB', toCacheKeyNumber(state.domainBrightness));
    }
    appendManualSeedPointsToCacheKey(parts, state.manualSeedPoints);

    return parts.join('|');
}

function shouldUseWPlanarTransformedLayerCache() {
    return !state.riemannSphereViewEnabled
        && !state.splitViewEnabled
        && !state.navigationModeEnabled
        && state.currentInputShape !== 'video'
        && !isPanning(state.panStateZ)
        && !isPanning(state.panStateW);
}

function shouldUseZPlanarInputLayerCache() {
    return !state.navigationModeEnabled
        && !state.vectorFieldEnabled
        && !(state.riemannSphereViewEnabled && !state.splitViewEnabled)
        && state.currentInputShape !== 'video'
        && !isPanning(state.panStateZ);
}

function shouldUseZFlowLayerCache() {
    return (state.vectorFieldEnabled || state.streamlineFlowEnabled)
        && !(state.riemannSphereViewEnabled && !state.splitViewEnabled)
        && !isPanning(state.panStateZ);
}

function fillCanvasBackground(ctx, planeParams) {
    if (!ctx || !planeParams) {
        return;
    }

    ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);
}

function drawDomainOrSolidBackground(ctx, domainCanvas, planeParams) {
    if (state.domainColoringEnabled && domainCanvas) {
        ctx.save();
        try {
            const isWPlane = !planeParams.currentVisXRange;
            const isProcessing = isWPlane ? state.isProcessingWDomainDynamics : state.isProcessingZDomainDynamics;
            if (isProcessing) {
                ctx.filter = 'blur(3px)';
            }

            const stale = getStaleDomainData(isWPlane);
            const curRanges = getPlaneRanges(planeParams);
            const curW = planeParams.width;
            const curH = planeParams.height;
            const curSig = getCurrentFuncSignature(isWPlane);
            const hasValidStale = !!(stale && stale.canvas && stale.viewport && stale.signature === curSig && curRanges);

            if (hasValidStale) {
                const oldVp = stale.viewport;
                const oldX0 = oldVp.xRange[0];
                const oldX1 = oldVp.xRange[1];
                const oldY0 = oldVp.yRange[0];
                const oldY1 = oldVp.yRange[1];

                const curX0 = curRanges.xMin;
                const curX1 = curRanges.xMax;
                const curY0 = curRanges.yMin;
                const curY1 = curRanges.yMax;

                if (Number.isFinite(oldX0) && Number.isFinite(curX0)) {
                    const destX = ((oldX0 - curX0) / (curX1 - curX0)) * curW;
                    const destY = ((curY1 - oldY1) / (curY1 - curY0)) * curH;
                    const destW = ((oldX1 - oldX0) / (curX1 - curX0)) * curW;
                    const destH = ((oldY1 - oldY0) / (curY1 - curY0)) * curH;

                    ctx.imageSmoothingEnabled = true;
                    if (ctx.imageSmoothingQuality !== undefined) {
                        ctx.imageSmoothingQuality = 'high';
                    }
                    ctx.drawImage(stale.canvas, destX, destY, destW, destH);
                }
            } else {
                ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
                ctx.fillRect(0, 0, curW, curH);
            }

            if (!isProcessing || !hasValidStale) {
                ctx.drawImage(domainCanvas, 0, 0);
            }
        } finally {
            ctx.restore();
        }
        return;
    }

    fillCanvasBackground(ctx, planeParams);
}

function getPlaneRanges(planeParams) {
    const [xMin, xMax] = planeParams?.currentVisXRange || planeParams?.xRange || [];
    const [yMin, yMax] = planeParams?.currentVisYRange || planeParams?.yRange || [];

    return { xMin, xMax, yMin, yMax };
}

function drawZetaUndefinedRegionOverlay(ctx, planeParams) {
    if (state.currentFunction !== 'zeta' || state.zetaContinuationEnabled) {
        return;
    }

    const { xMin, xMax, yMin, yMax } = getPlaneRanges(planeParams);

    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) {
        return;
    }

    const xBoundary = ZETA_REFLECTION_POINT_RE;
    const xMaxRect = Math.min(xBoundary, xMax);

    if (xMaxRect <= xMin) {
        return;
    }

    const topLeft = mapToCanvasCoords(xMin, yMax, planeParams);
    const bottomRight = mapToCanvasCoords(xMaxRect, yMin, planeParams);

    withCanvasState(ctx, () => {
        ctx.fillStyle = 'rgba(30,30,60,0.35)';
        ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        ctx.fillStyle = 'rgba(180,180,220,0.6)';
        ctx.font = "italic 11px 'SF Pro Text',sans-serif";
        ctx.textAlign = 'center';

        if (xMaxRect - xMin > 50 / planeParams.scale.x) {
            const textXWorld = (xMin + xMaxRect) / 2;
            const textYWorld = yMin + 0.2 * (yMax - yMin);
            const textCanvas = mapToCanvasCoords(textXWorld, textYWorld, planeParams);

            ctx.fillText(`Re(z) ≤ ${xBoundary.toFixed(1)} (Undefined by Sum)`, textCanvas.x, textCanvas.y);
        }
    });
}

function drawTaylorConvergenceOverlay(ctx, planeParams) {
    if (!state.taylorSeriesEnabled || !isFiniteComplex(state.taylorSeriesCenter)) {
        return;
    }

    const radius = state.taylorSeriesConvergenceRadius;
    const centerCanvas = mapToCanvasCoords(
        state.taylorSeriesCenter.re,
        state.taylorSeriesCenter.im,
        planeParams
    );

    if (Number.isFinite(radius) && radius > 1e-9) {
        const radiusCanvas = radius * planeParams.scale.x;

        if (radiusCanvas >= Math.max(planeParams.width, planeParams.height) * 2) {
            return;
        }

        withCanvasState(ctx, () => {
            ctx.fillStyle = state.taylorSeriesColorConvergenceDiskFill;
            ctx.strokeStyle = state.taylorSeriesColorConvergenceDiskStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerCanvas.x, centerCanvas.y, radiusCanvas, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });

        return;
    }

    if (radius === 0) {
        withCanvasState(ctx, () => {
            ctx.fillStyle = state.taylorSeriesColorConvergenceDiskStroke;
            ctx.beginPath();
            ctx.arc(centerCanvas.x, centerCanvas.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
}

function drawPolynomialOriginMarkerOverlay(ctx, planeParams) {
    if (
        state.currentFunction !== 'polynomial'
        || state.currentInputShape !== 'circle'
        || !state.polynomialCoeffs?.length
    ) {
        return;
    }

    const cValue = state.polynomialCoeffs[0];

    if (!isFiniteComplex(cValue)) {
        return;
    }

    const canvasPoint = mapToCanvasCoords(cValue.re, cValue.im, planeParams);

    withCanvasState(ctx, () => {
        ctx.fillStyle = COLOR_FTA_C_MARKER;
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = "10px 'SF Pro Text', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('P(0)', canvasPoint.x, canvasPoint.y - 10);
    });
}

function drawWOriginGlowOverlay(ctx, planeParams) {
    const startedAt = Number(state.wOriginGlowTime) || 0;

    if (startedAt <= 0) {
        return;
    }

    const elapsed = Date.now() - startedAt;

    if (elapsed >= ORIGIN_GLOW_DURATION_MS) {
        state.wOriginGlowTime = 0;
        return;
    }

    const glowAlpha = 1 - elapsed / ORIGIN_GLOW_DURATION_MS;
    const originCanvas = mapToCanvasCoords(0, 0, planeParams);

    withCanvasState(ctx, () => {
        ctx.fillStyle = COLOR_W_ORIGIN_GLOW.replace('0.7', (glowAlpha * 0.7).toFixed(2));
        ctx.beginPath();
        ctx.arc(originCanvas.x, originCanvas.y, 8 + (1 - glowAlpha) * 12, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function renderFirstSignalMode(renderers, ctx, planeParams, planeKey) {
    const renderer = renderers.find(candidate => candidate.enabled());

    if (!renderer) {
        return false;
    }

    drawPlaneLayer(ctx, planeParams, planeKey, layerCtx => {
        renderer.draw(layerCtx, renderer.signal(), planeParams);
    }, 'raster');

    return true;
}

function refreshZSphereDomainColoring(transform) {
    if (state.domainColoringEnabled && context.domainColoringDirty && zDomainColorCtx) {
        renderSphereDomainColoring(zDomainColorCtx, sphereViewParams.z, zPlaneParams, false, transform);
    }
}

function refreshZPlanarDomainColoring(transform) {
    if (state.domainColoringEnabled && context.domainColoringDirty && zDomainColorCtx) {
        renderPlanarDomainColoring(zDomainColorCtx, zPlaneParams, false, transform);
    }
}

function renderZSphere(transform) {
    const sphereParams = sphereViewParams.z;

    refreshZSphereDomainColoring(transform);

    drawPlaneLayer(zCtx, zPlaneParams, 'z', layerCtx => {
        drawDomainOrSolidBackground(layerCtx, zDomainColorCanvas, zPlaneParams);
    }, 'raster');

    drawPlaneLayer(zCtx, zPlaneParams, 'z', layerCtx => {
        drawRiemannSphereBase(layerCtx, sphereParams);
        drawSphereGridAndShape(layerCtx, sphereParams, false);
        drawDynamicSphere(layerCtx, sphereParams, { isWPlane: false });

        if (state.probeActive) {
            drawSphereProbeAndNeighborhood(
                layerCtx,
                sphereParams,
                state.probeZ,
                state.probeNeighborhoodSize,
                null
            );
        }
    }, 'capture');
}

function shouldDrawZReferenceGrid() {
    return !state.domainColoringEnabled
        && !state.navigationModeEnabled
        && !state.vectorFieldEnabled
        && !state.streamlineFlowEnabled
        && isGridInputShape();
}

function renderZPlanarBackground(transform) {
    refreshZPlanarDomainColoring(transform);

    drawPlaneLayer(zCtx, zPlaneParams, 'z', layerCtx => {
        drawDomainOrSolidBackground(layerCtx, zDomainColorCanvas, zPlaneParams);
        drawAxes(layerCtx, zPlaneParams, 'Re(z)', 'Im(z)');
        drawZetaUndefinedRegionOverlay(layerCtx, zPlaneParams);

        if (shouldDrawZReferenceGrid()) {
            drawGridLines(layerCtx, zPlaneParams);
        }
    }, 'raster');
}

function renderZPlaneFlowLayer(targetCtx, planeParams, cacheMeta = null) {
    if (state.streamlineFlowEnabled) {
        let complete = true;
        const streamOptions = {
            cacheKey: cacheMeta?.cacheKey || null,
            fresh: cacheMeta ? !!cacheMeta.fresh : true
        };
        const rendered = drawPlaneLayer(targetCtx, planeParams, 'z', layerCtx => {
            complete = drawStreamlinesOnZPlane(layerCtx, planeParams, state, streamOptions) !== false;
        }, 'capture');

        return rendered && complete;
    }

    drawZPlaneVectorField(targetCtx, planeParams, state.currentFunction, state.vectorFieldFunction);
    return true;
}

function renderZFlowContent() {
    invalidateCache(zPlanarInputLayerCache);

    renderThroughCache({
        cache: zFlowLayerCache,
        targetCtx: zCtx,
        planeParams: zPlaneParams,
        cacheKey: buildZFlowLayerCacheKey(),
        enabled: shouldUseZFlowLayerCache(),
        render: (cacheCtx, cacheMeta) => renderZPlaneFlowLayer(cacheCtx, zPlaneParams, cacheMeta),
        renderDirect: (targetCtx, cacheMeta) => renderZPlaneFlowLayer(targetCtx, zPlaneParams, cacheMeta)
    });
}

function renderZNavigationContent() {
    invalidateCache(zFlowLayerCache);
    invalidateCache(zPlanarInputLayerCache);
    drawNavigationLayer(zCtx, zPlaneParams, 'z');
}

function renderZPlanarInputShape() {
    invalidateCache(zFlowLayerCache);

    renderThroughCache({
        cache: zPlanarInputLayerCache,
        targetCtx: zCtx,
        planeParams: zPlaneParams,
        cacheKey: buildPlanarLayerCacheKey(false),
        enabled: shouldUseZPlanarInputLayerCache(),
        render: cacheCtx => drawPlanarInputShapeHybrid(cacheCtx, zPlaneParams, 'z')
    });
}

function renderZPlanarInputOverlays() {
    drawLayerWhen(
        state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare',
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawPlanarInputOverlays(layerCtx, zPlaneParams),
        'raster'
    );
}

function renderZPrimaryPlanarContent() {
    if (state.navigationModeEnabled) {
        renderZNavigationContent();
        return;
    }

    if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
        renderZFlowContent();
        return;
    }

    renderZPlanarInputShape();
    renderZPlanarInputOverlays();
}

function drawCriticalMarkers(ctx, planeParams, points, color) {
    asArray(points).forEach(point => {
        if (!isFiniteComplex(point)) {
            return;
        }

        const canvasPoint = mapToCanvasCoords(point.re, point.im, planeParams);
        drawCriticalPointMarker(ctx, canvasPoint, color);
    });
}

function renderZMarkers() {
    const canDrawMarkers = !state.navigationModeEnabled;

    drawLayerWhen(
        state.showZerosPoles && canDrawMarkers,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawZerosAndPolesMarkers(layerCtx, zPlaneParams),
        'capture'
    );

    drawLayerWhen(
        state.showCriticalPoints && canDrawMarkers && asArray(state.criticalPoints).length > 0,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawCriticalMarkers(layerCtx, zPlaneParams, state.criticalPoints, COLOR_CRITICAL_POINT_Z),
        'capture'
    );

    drawLayerWhen(
        state.generalPointsEnabled && canDrawMarkers,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawGeneralPointsMarkers(layerCtx, zPlaneParams),
        'raster'
    );
}

function renderZTaylorOverlay() {
    drawLayerWhen(
        state.taylorSeriesEnabled && !state.navigationModeEnabled,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawTaylorConvergenceOverlay(layerCtx, zPlaneParams),
        'raster'
    );
}

function renderZProbeOverlay() {
    drawLayerWhen(
        state.probeActive && !state.navigationModeEnabled && !isPanning(state.panStateZ),
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawPlanarProbe(layerCtx, zPlaneParams),
        'capture'
    );
}

function renderZParticles() {
    drawLayerWhen(
        state.particleAnimationEnabled && !state.navigationModeEnabled,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => updateAndDrawParticles(layerCtx, zPlaneParams, state),
        'raster'
    );
}

function renderZPlanar(transform) {
    renderZPlanarBackground(transform);
    renderZPrimaryPlanarContent();
    drawLayerWhen(
        state.dynamicPlotting?.enabled,
        zCtx,
        zPlaneParams,
        'z',
        layerCtx => drawDynamicZPlane(layerCtx, zPlaneParams),
        'raster'
    );
    renderZMarkers();
    renderZTaylorOverlay();
    renderZProbeOverlay();
    renderZParticles();
}

export function drawZPlaneContent() {
    syncRenderContext();

    if (renderFirstSignalMode(Z_SIGNAL_RENDERERS, zCtx, zPlaneParams, 'z')) {
        return;
    }

    const transform = getChainedTransformFunction(state.currentFunction);

    if (state.riemannSphereViewEnabled && !state.splitViewEnabled) {
        renderZSphere(transform);
        return;
    }

    renderZPlanar(transform);
}

function ensureWPlaneCache(index) {
    while (wPlanarTransformedLayerCacheList.length <= index) {
        wPlanarTransformedLayerCacheList.push(createLayerCache());
    }

    return wPlanarTransformedLayerCacheList[index];
}

// Multi-W-plane rendering temporarily rebinds legacy module variables; finally restores them.
function withWPlaneScope(index, render) {
    const previous = {
        canvas: wCanvas,
        ctx: wCtx,
        params: wPlaneParams,
        plotlyContainer: controls.wPlanePlotlyContainer,
        sphereParams: sphereViewParams.w,
        cache: wPlanarTransformedLayerCache
    };

    wCanvas = wCanvasList?.[index];
    wCtx = wCtxList?.[index];
    wPlaneParams = wPlaneParamsList?.[index];
    controls.wPlanePlotlyContainer = wPlanePlotlyContainersList?.[index];
    sphereViewParams.w = sphereViewWParamsList?.[index];
    wPlanarTransformedLayerCache = ensureWPlaneCache(index);

    try {
        return render();
    } finally {
        wCanvas = previous.canvas;
        wCtx = previous.ctx;
        wPlaneParams = previous.params;
        controls.wPlanePlotlyContainer = previous.plotlyContainer;
        sphereViewParams.w = previous.sphereParams;
        wPlanarTransformedLayerCache = previous.cache;
    }
}

function hasWPlaneTargets() {
    return [wCanvasList, wCtxList, wPlaneParamsList].every(Array.isArray)
        && wCanvasList.length > 0;
}

function setHidden(element, hidden) {
    if (element?.classList) {
        element.classList[hidden ? 'add' : 'remove']('hidden');
    }
}

function showCanvas(canvas) {
    setHidden(canvas, false);
}

function hideCanvas(canvas) {
    setHidden(canvas, true);
}

function showPlotlyContainer() {
    setHidden(controls.wPlanePlotlyContainer, false);
}

function hidePlotlyContainer() {
    setHidden(controls.wPlanePlotlyContainer, true);
    if (wStaticThreeRenderer) {
        wStaticThreeRenderer.stopAnimationLoop();
    }
}

function setPlotlyContainerSize() {
    const container = controls.wPlanePlotlyContainer;

    if (!container?.style || !wPlaneParams?.width || !wPlaneParams?.height) {
        return;
    }

    container.style.width = `${wPlaneParams.width}px`;
    container.style.height = `${wPlaneParams.height}px`;
}

function getWPlaneRenderCount() {
    if (!state.chainingEnabled) {
        return 1;
    }

    const available = wCanvasList?.length || 0;
    const requested = Number.isFinite(state.chainCount) ? state.chainCount : 0;

    return Math.max(0, Math.min(requested, available));
}

function* iterWPlaneTransforms() {
    const count = getWPlaneRenderCount();

    if (state.chainingEnabled && state.chainCount > 25) {
        yield [0, getChainedTransformFunction(state.currentFunction)];
        return;
    }

    for (let index = 0; index < count; index += 1) {
        yield [index, getChainedStageTransformFunction(state.currentFunction, index)];
    }
}

function renderSpecialWPlaneMode() {
    hideRiemannSurface(wCanvas);
    showCanvas(wCanvas);
    hidePlotlyContainer();
    renderFirstSignalMode(W_SIGNAL_RENDERERS, wCtx, wPlaneParams, 'w');
}

function renderRiemannSurfaceIfEnabled(index) {
    if (!state.riemannSurfaceEnabled) {
        hideRiemannSurface(wCanvas);
        return false;
    }

    hidePlotlyContainer();

    if (wCanvas && renderRiemannSurface(wCanvas, index + 1)) {
        hideCanvas(wCanvas);
        return true;
    }

    showCanvas(wCanvas);
    return false;
}

function renderPlotlyWPlane(transform, stageIndex) {
    const container = controls.wPlanePlotlyContainer;

    if (!container) {
        showCanvas(wCanvas);
        return;
    }

    hideCanvas(wCanvas);
    showPlotlyContainer();
    setPlotlyContainerSize();

    if (!wStaticThreeRenderer) {
        wStaticThreeRenderer = new ThreeRiemannRenderer(container, 'w');
    }

    const gridConfigObj = buildInputShapeGeometryConfig(zPlaneParams, {
        currentFunction: state.currentFunction,
        zetaContinuationEnabled: state.zetaContinuationEnabled,
        gridDensity: state.gridDensity
    });
    const gridConfigKey = JSON.stringify(gridConfigObj);

    if (wStaticThreeRenderer.lastGridConfigKey !== gridConfigKey) {
        // Skip rebuilding heavy 3D geometries continuously during 2D canvas drag-panning
        if (state.panStateZ.isPanning || state.panStateW.isPanning) {
            // We'll catch it on the pointerup event which triggers a redraw
        } else {
            wStaticThreeRenderer.lastGridConfigKey = gridConfigKey;

            const wPointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
                currentFunction: state.currentFunction,
                zetaContinuationEnabled: state.zetaContinuationEnabled,
                curvePoints: 250,
                gridDensity: state.gridDensity
            });

            wStaticThreeRenderer.buildGridFromPointSets(wPointSets, 1.0);
        }
    }

    wStaticThreeRenderer.updateGeometry(1.0);
    wStaticThreeRenderer.setDynamicOverlay(
        getDynamicSphereSceneData({ transform, stageIndex }),
        `${stageIndex}:${getDynamicPlottingCacheKey()}`
    );

    if (state.probeActive && state.probeZ) {
        const wProbe = transform(state.probeZ.re, state.probeZ.im);
        wStaticThreeRenderer.updateProbe(wProbe);
    } else {
        wStaticThreeRenderer.updateProbe(null);
    }

    wStaticThreeRenderer.startAnimationLoop();
}

function shouldDrawWReferenceGrid() {
    return !state.navigationModeEnabled
        && state.currentInputShape !== 'empty_grid'
        && isGridInputShape();
}

function renderWPlanarBackground() {
    drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
        fillCanvasBackground(layerCtx, wPlaneParams);

        if (state.taylorSeriesEnabled && !state.navigationModeEnabled) {
            return;
        }

        drawAxes(layerCtx, wPlaneParams, 'Re(w)', 'Im(w)');
        drawPolynomialOriginMarkerOverlay(layerCtx, wPlaneParams);
        drawWOriginGlowOverlay(layerCtx, wPlaneParams);

        if (shouldDrawWReferenceGrid()) {
            drawGridLines(layerCtx, wPlaneParams);
        }
    }, 'raster');
}

function drawTaylorApproximationLayer(ctx) {
    drawPlanarTaylorApproximation(
        ctx,
        wPlaneParams,
        state.currentFunction,
        state.taylorSeriesCenter,
        state.taylorSeriesOrder,
        state.taylorSeriesColorAxisX,
        state.taylorSeriesColorAxisY,
        { includeAxes: false }
    );
}

function renderWTaylorApproximation() {
    drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
        drawTaylorAxes(
            layerCtx,
            wPlaneParams,
            state.taylorSeriesColorAxisX,
            state.taylorSeriesColorAxisY,
            'Re(w_approx)',
            'Im(w_approx)'
        );
    }, 'raster');

    renderThroughCache({
        cache: wPlanarTransformedLayerCache,
        targetCtx: wCtx,
        planeParams: wPlaneParams,
        cacheKey: buildPlanarLayerCacheKey(true),
        enabled: shouldUseWPlanarTransformedLayerCache(),
        render: drawTaylorApproximationLayer,
        renderDirect: targetCtx => {
            drawPlaneLayer(targetCtx, wPlaneParams, 'w', drawTaylorApproximationLayer, 'capture');
        }
    });
}

function refreshWSphereDomainColoring() {
    if (state.domainColoringEnabled && context.domainColoringDirty && wDomainColorCtx) {
        renderSphereDomainColoring(wDomainColorCtx, sphereViewParams.w, wPlaneParams, true, null);
    }
}

function renderWCanvasRiemannSphere(transform, index) {
    const sphereParams = sphereViewParams.w;

    refreshWSphereDomainColoring();

    drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
        drawDomainOrSolidBackground(layerCtx, wDomainColorCanvas, wPlaneParams);
    }, 'raster');

    drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
        drawRiemannSphereBase(layerCtx, sphereParams);
        drawSphereGridAndShape(layerCtx, sphereParams, true, transform);
        drawDynamicSphere(layerCtx, sphereParams, {
            isWPlane: true,
            transform,
            stageIndex: index
        });
    }, 'capture');
}

function drawWTransformedShape(index, transform, targetCtx) {
    if (index === 0) {
        drawPlanarTransformedShapeHybrid(targetCtx, wPlaneParams, transform, 'w');
        return;
    }

    drawPlanarTransformedShape(targetCtx, wPlaneParams, transform, { index });
}

function renderWPlanarTransformedShape(index, transform) {
    if (state.navigationModeEnabled) {
        invalidateCache(wPlanarTransformedLayerCache);
        drawNavigationLayer(wCtx, wPlaneParams, 'w', transform);
        return;
    }

    renderThroughCache({
        cache: wPlanarTransformedLayerCache,
        targetCtx: wCtx,
        planeParams: wPlaneParams,
        cacheKey: buildPlanarLayerCacheKey(true),
        enabled: shouldUseWPlanarTransformedLayerCache(),
        render: cacheCtx => drawWTransformedShape(index, transform, cacheCtx)
    });
}

function renderWPrimaryContent(index, transform, isRiemannW) {
    if (state.taylorSeriesEnabled && !isRiemannW && !state.navigationModeEnabled) {
        renderWTaylorApproximation();
        return;
    }

    if (isRiemannW) {
        renderWCanvasRiemannSphere(transform, index);
        return;
    }

    renderWPlanarTransformedShape(index, transform);
}

function renderWCriticalValueMarkers(isRiemannW) {
    drawLayerWhen(
        state.showCriticalPoints
            && !state.navigationModeEnabled
            && !isRiemannW
            && asArray(state.criticalValues).length > 0,
        wCtx,
        wPlaneParams,
        'w',
        layerCtx => drawCriticalMarkers(layerCtx, wPlaneParams, state.criticalValues, COLOR_CRITICAL_VALUE_W),
        'capture'
    );
}

function renderWProbe(transform, index, isRiemannW) {
    if (!state.probeActive || state.navigationModeEnabled) {
        return;
    }

    if (isRiemannW) {
        drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
            drawSphereProbeAndNeighborhood(
                layerCtx,
                sphereViewParams.w,
                state.probeZ,
                state.probeNeighborhoodSize,
                transform
            );
        }, 'capture');

        return;
    }

    drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
        drawPlanarTransformedProbe(layerCtx, wPlaneParams, transform);
    }, 'capture');
}

function renderWCommonOverlays(index, transform, isRiemannW) {
    if (!isRiemannW && state.dynamicPlotting?.enabled) {
        drawPlaneLayer(wCtx, wPlaneParams, 'w', layerCtx => {
            drawDynamicWPlane(layerCtx, wPlaneParams, transform, index);
        }, 'raster');
    }

    renderWCriticalValueMarkers(isRiemannW);
    renderWProbe(transform, index, isRiemannW);

    if (!isRiemannW && index === 0) {
        updateWindingNumberDisplay(transform);
    }
}

function renderNormalWPlane(index, transform) {
    if (renderRiemannSurfaceIfEnabled(index)) {
        return;
    }

    const isRiemannW = state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (state.plotly3DEnabled && isRiemannW) {
        renderPlotlyWPlane(transform, index);
        return;
    }

    showCanvas(wCanvas);
    hidePlotlyContainer();

    if (!isRiemannW) {
        renderWPlanarBackground();
    }

    renderWPrimaryContent(index, transform, isRiemannW);
    renderWCommonOverlays(index, transform, isRiemannW);
}

function _renderSingleWPlaneMode(index, curFunc, isSpecialMode) {
    withWPlaneScope(index, () => {
        if (!wCtx || !wPlaneParams) {
            return;
        }

        if (isSpecialMode) {
            renderSpecialWPlaneMode();
            return;
        }

        renderNormalWPlane(index, curFunc);
    });
}

export function drawWPlaneContent() {
    syncRenderContext();

    if (!hasWPlaneTargets()) {
        return;
    }

    if (state.fourierModeEnabled || state.laplaceModeEnabled) {
        _renderSingleWPlaneMode(0, null, true);
        return;
    }

    for (const [index, transform] of iterWPlaneTransforms()) {
        _renderSingleWPlaneMode(index, transform, false);
    }
}
