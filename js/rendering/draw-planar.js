import { state as appState, zPlaneParams } from '../store/state.js';
import {
    COLOR_PROBE_MARKER, COLOR_PROBE_NEIGHBORHOOD, COLOR_TEXT_ON_CANVAS,
    COLOR_Z_GRID_HORZ, COLOR_CAUCHY_CONTOUR_Z, COLOR_CAUCHY_CONTOUR_W,
    COLOR_PARTICLE, COLOR_FOCI,
    COLOR_PROBE_CONFORMAL_LINE_W_H, COLOR_PROBE_CONFORMAL_LINE_W_V,
    COLOR_PROBE_CONFORMAL_LINE_Z_H, COLOR_PROBE_CONFORMAL_LINE_Z_V,
    STREAMLINE_COLOR_MIN_MAG, STREAMLINE_COLOR_MAX_MAG
} from '../constants/colors.js';
import {
    TWO_PI, MIN_POINTS_ADAPTIVE, MAX_POINTS_ADAPTIVE_DEFAULT,
    ADAPTIVE_ANCHOR_DENSITY, DEFAULT_POINTS_PER_LINE, ZETA_POLE,
    ZETA_REFLECTION_POINT_RE, PROBE_CROSSHAIR_SIZE_FACTOR
} from '../constants/numerical.js';
import { LINE_WIDTH_NORMAL, PARTICLE_RADIUS } from '../constants/rendering.js';
import { mapToCanvasCoords } from '../utils/canvas-utils.js';
import {
    getMappedTransformProfile, evaluateMappedTransform, isNumericallyStable,
    complexMul, complexPow, complexLn, complexExp, complexReciprocal,
    createTaylorApproximationTransform, transformFunctions
} from '../math-utils.js';
import {
    calculateStreamline, getVectorForStreamline, getVectorFieldValueAtPoint,
    getStreamlineColorByMagnitude
} from '../analysis/streamline.js';
import { isRasterInputShape } from '../utils/raster-media.js';
import { drawImageWithWebGL, drawVectorFieldWithWebGL } from './draw-image-webgl.js';
import {
    generateCurrentInputShapePointSets,
    generateCurrentMappedInputShapePointSets,
    generateRadialDiscreteStepPointSets
} from './shape-generators.js';
import { hslToRgb } from './canvas-primitives.js';
import { drawTaylorAxes } from './draw-primitives.js';

const EPSILON = 1e-9;
const DEGENERATE_SEGMENT_EPSILON = 1e-12;
const STREAMLINE_COLOR_BUCKETS = 32;
const PROBE_NEIGHBORHOOD_SEGMENTS = 60;
const PROBE_MARKER_RADIUS = 5;
const CONSTANT_POINT_RADIUS = 7;
const FOCI_RADIUS = 4;
const ORBIT_NODE_RADIUS = 3.5;
const ORBIT_ARROW_SIZE = 6;
const ORBIT_COLOR = 'rgba(0, 255, 200, 0.9)';
const DEFAULT_VIEW_RANGE = Object.freeze([-1, 1]);
const INVALID_COMPLEX_POINT = Object.freeze({ re: NaN, im: NaN });

const LINEAR_SOURCE_POINT_SET_ROLES = new Set([
    'grid-horizontal',
    'grid-vertical',
    'polar-angular',
    'logpolar-angular',
    'strip-boundary',
    'sector-radial',
    'line-horizontal',
    'line-vertical'
]);

const TAYLOR_Y_AXIS_ROLES = new Set([
    'grid-horizontal',
    'polar-angular',
    'logpolar-angular',
    'strip-boundary',
    'line-horizontal',
    'sector-arc'
]);

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
    return isFiniteNumber(value) ? value : fallback;
}

function isUsableRange(range) {
    return Array.isArray(range) &&
        range.length >= 2 &&
        isFiniteNumber(range[0]) &&
        isFiniteNumber(range[1]);
}

function getPlaneRange(planeParams, currentKey, fallbackKey) {
    if (planeParams && isUsableRange(planeParams[currentKey])) {
        return planeParams[currentKey];
    }
    if (planeParams && isUsableRange(planeParams[fallbackKey])) {
        return planeParams[fallbackKey];
    }
    return DEFAULT_VIEW_RANGE;
}

function getPlaneXRanges(planeParams) {
    return getPlaneRange(planeParams, 'currentVisXRange', 'xRange');
}

function getPlaneYRanges(planeParams) {
    return getPlaneRange(planeParams, 'currentVisYRange', 'yRange');
}

function isFiniteCanvasPoint(point) {
    return !!point && isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function withSavedContext(ctx, draw) {
    ctx.save();
    try {
        return draw();
    } finally {
        ctx.restore();
    }
}

function configureRoundStroke(ctx, color, lineWidth) {
    if (color !== undefined) {
        ctx.strokeStyle = color;
    }
    if (lineWidth !== undefined) {
        ctx.lineWidth = lineWidth;
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
}

function setOptionalCanvasState(ctx, options) {
    if (options.lineDash && typeof ctx.setLineDash === 'function') {
        ctx.setLineDash(options.lineDash);
    }
    if (options.globalAlpha !== undefined) {
        ctx.globalAlpha = options.globalAlpha;
    }
}

function toCanvasPoint(point, planeParams) {
    return isRenderableComplexPoint(point)
        ? mapToCanvasCoords(point.re, point.im, planeParams)
        : null;
}

function drawCircleMarker(ctx, canvasPoint, radius, fillStyle, strokeStyle, lineWidth) {
    if (!isFiniteCanvasPoint(canvasPoint)) {
        return;
    }

    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, TWO_PI);

    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }

    if (strokeStyle && lineWidth) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

function strokeSegmentedCanvasPath(ctx, items, resolveCanvasPoint) {
    if (!items || typeof items[Symbol.iterator] !== 'function') {
        return;
    }

    ctx.beginPath();
    let segmentOpen = false;

    for (const item of items) {
        const canvasPoint = resolveCanvasPoint(item);

        if (!isFiniteCanvasPoint(canvasPoint)) {
            if (segmentOpen) {
                ctx.stroke();
                ctx.beginPath();
                segmentOpen = false;
            }
            continue;
        }

        if (segmentOpen) {
            ctx.lineTo(canvasPoint.x, canvasPoint.y);
        } else {
            ctx.moveTo(canvasPoint.x, canvasPoint.y);
            segmentOpen = true;
        }
    }

    if (segmentOpen) {
        ctx.stroke();
    }
}

function createCirclePoints(center, radius, segments) {
    const pointCount = Math.max(3, Math.floor(finiteOr(segments, PROBE_NEIGHBORHOOD_SEGMENTS)));
    const points = [];

    for (let i = 0; i <= pointCount; i++) {
        const angle = (i / pointCount) * TWO_PI;
        points.push({
            re: center.re + radius * Math.cos(angle),
            im: center.im + radius * Math.sin(angle)
        });
    }

    return points;
}

function drawWorldCircle(ctx, planeParams, center, radius, segments) {
    if (!isRenderableComplexPoint(center) || !isFiniteNumber(radius)) {
        return;
    }

    drawComplexLineSetOnPlane(ctx, planeParams, createCirclePoints(center, radius, segments));
}

function isStableRenderableComplexPoint(point) {
    return isRenderableComplexPoint(point) && isNumericallyStable(point);
}

function isWithinComplexLimit(point, limit) {
    return isRenderableComplexPoint(point) &&
        Math.abs(point.re) <= limit &&
        Math.abs(point.im) <= limit;
}

function isCanvasPointNearViewport(point, planeParams) {
    if (!isFiniteCanvasPoint(point)) {
        return false;
    }

    const width = finiteOr(planeParams.width, 0);
    const height = finiteOr(planeParams.height, 0);
    const margin = Math.max(width, height) * 2;

    return point.x > -margin &&
        point.x < width + margin &&
        point.y > -margin &&
        point.y < height + margin;
}

function evaluateProfilePoint(mappedTransform, re, im, evalContext = null) {
    return evaluateMappedTransform(
        mappedTransform,
        re,
        im,
        appState.currentFunction,
        evalContext
    ) || INVALID_COMPLEX_POINT;
}

function createProfileEvaluator(mappedTransform) {
    return (re, im) => evaluateProfilePoint(mappedTransform, re, im);
}

function getViewportJumpThresholdSq(planeParams) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];

    return (spanX * spanX + spanY * spanY) * 4;
}

function breakOpenPath(ctx, pathState) {
    if (pathState.open) {
        ctx.stroke();
    }
    ctx.beginPath();
    pathState.open = false;
}

function appendCanvasPointToPath(ctx, pathState, canvasPoint) {
    if (pathState.open) {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
    } else {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
        pathState.open = true;
    }
}

function getFirstVisibleColor(pointSets, colorResolver, fallback) {
    if (!Array.isArray(pointSets)) {
        return fallback;
    }

    const pointSet = pointSets.find(candidate => candidate && colorResolver(candidate));
    return pointSet ? colorResolver(pointSet) : fallback;
}

function createGridSeeds(planeParams, renderState) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);
    const densityValue = finiteOr(renderState.gridDensity * renderState.streamlineSeedDensityFactor, 0);
    const rows = Math.max(2, Math.floor(densityValue));
    const cols = rows;
    const seeds = [];

    for (let row = 0; row <= rows; row++) {
        const y = yRange[0] + (row / rows) * (yRange[1] - yRange[0]);

        for (let col = 0; col <= cols; col++) {
            const x = xRange[0] + (col / cols) * (xRange[1] - xRange[0]);
            seeds.push(x, y);
        }
    }

    if (Array.isArray(renderState.manualSeedPoints)) {
        for (const seed of renderState.manualSeedPoints) {
            if (isRenderableComplexPoint(seed)) {
                seeds.push(seed.re, seed.im);
            }
        }
    }

    return seeds;
}

function getBucketIndex(magnitude, minMagnitude, magnitudeRange) {
    const normalized = clamp((magnitude - minMagnitude) / magnitudeRange, 0, 1);
    return Math.round(normalized * STREAMLINE_COLOR_BUCKETS);
}

function getRandomPointInView(planeParams) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);

    return {
        x: xRange[0] + Math.random() * (xRange[1] - xRange[0]),
        y: yRange[0] + Math.random() * (yRange[1] - yRange[0]),
        lifetime: 0
    };
}

function syncParticlePool(renderState, planeParams) {
    if (!Array.isArray(renderState.particles)) {
        renderState.particles = [];
    }

    const targetDensity = Math.max(0, Math.floor(finiteOr(renderState.particleDensity, 0)));

    while (renderState.particles.length < targetDensity) {
        renderState.particles.push(initializeSingleParticle(planeParams));
    }

    while (renderState.particles.length > targetDensity) {
        renderState.particles.pop();
    }
}

function getNormalizedParticleVector(x, y, renderState) {
    const vector = getVectorForStreamline(
        x,
        y,
        renderState.currentFunction,
        renderState.vectorFieldFunction,
        renderState
    );

    if (!vector || !isFiniteNumber(vector.vx) || !isFiniteNumber(vector.vy)) {
        return null;
    }

    const magnitude = Math.hypot(vector.vx, vector.vy);
    if (magnitude < EPSILON || !Number.isFinite(magnitude)) {
        return null;
    }

    return {
        x: vector.vx / magnitude,
        y: vector.vy / magnitude
    };
}

function advanceParticleRK2(particle, speed, renderState) {
    const first = getNormalizedParticleVector(particle.x, particle.y, renderState);
    if (!first) {
        return false;
    }

    const midpointX = particle.x + first.x * speed * 0.5;
    const midpointY = particle.y + first.y * speed * 0.5;
    const second = getNormalizedParticleVector(midpointX, midpointY, renderState) || first;

    particle.x += second.x * speed;
    particle.y += second.y * speed;
    return true;
}

function shouldRespawnParticle(particle, planeParams, renderState) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);

    return particle.lifetime > renderState.particleMaxLifetime ||
        particle.x < xRange[0] ||
        particle.x > xRange[1] ||
        particle.y < yRange[0] ||
        particle.y > yRange[1] ||
        !Number.isFinite(particle.x) ||
        !Number.isFinite(particle.y);
}

function getParticleSpeed(planeParams, renderState) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);
    const viewSpan = Math.max(xRange[1] - xRange[0], yRange[1] - yRange[0]);

    return finiteOr(renderState.particleSpeed, 0) * viewSpan * 0.1;
}

function getProbeCrosshairEndpoints(center, radius) {
    return {
        horizontal: [
            { re: center.re - radius, im: center.im },
            { re: center.re + radius, im: center.im }
        ],
        vertical: [
            { re: center.re, im: center.im - radius },
            { re: center.re, im: center.im + radius }
        ]
    };
}

function transformProbeEndpoint(point, transformFunc, shouldTransform) {
    return shouldTransform ? transformFunc(point.re, point.im) : point;
}

function drawProbeSegment(ctx, planeParams, startWorld, endWorld, color, requireStability) {
    const startIsValid = requireStability
        ? isStableRenderableComplexPoint(startWorld)
        : isRenderableComplexPoint(startWorld);
    const endIsValid = requireStability
        ? isStableRenderableComplexPoint(endWorld)
        : isRenderableComplexPoint(endWorld);

    if (!startIsValid || !endIsValid) {
        return;
    }

    const startCanvas = mapToCanvasCoords(startWorld.re, startWorld.im, planeParams);
    const endCanvas = mapToCanvasCoords(endWorld.re, endWorld.im, planeParams);

    if (!isCanvasPointNearViewport(startCanvas, planeParams) ||
        !isCanvasPointNearViewport(endCanvas, planeParams)) {
        return;
    }

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(startCanvas.x, startCanvas.y);
    ctx.lineTo(endCanvas.x, endCanvas.y);
    ctx.stroke();
}

function getClosestPointOnInfiniteLine(startPoint, endPoint, targetPoint) {
    const vectorRe = endPoint.re - startPoint.re;
    const vectorIm = endPoint.im - startPoint.im;
    const pointToTargetRe = startPoint.re - targetPoint.re;
    const pointToTargetIm = startPoint.im - targetPoint.im;
    const lengthSq = vectorRe * vectorRe + vectorIm * vectorIm;

    if (Math.abs(lengthSq) < DEGENERATE_SEGMENT_EPSILON) {
        return startPoint;
    }

    const t = -(pointToTargetRe * vectorRe + pointToTargetIm * vectorIm) / lengthSq;
    return {
        re: startPoint.re + t * vectorRe,
        im: startPoint.im + t * vectorIm
    };
}

function isZetaDirectSeriesSegment(startPoint, endPoint, evalPoint) {
    return appState.currentFunction === 'zeta' &&
        !appState.zetaContinuationEnabled &&
        (
            (startPoint.re <= ZETA_REFLECTION_POINT_RE && endPoint.re <= ZETA_REFLECTION_POINT_RE) ||
            evalPoint.re <= ZETA_REFLECTION_POINT_RE
        );
}

function nudgeIfAtZetaPole(point) {
    const atPole = Math.abs(point.re - ZETA_POLE.re) < EPSILON &&
        Math.abs(point.im - ZETA_POLE.im) < EPSILON;

    return atPole
        ? { re: ZETA_POLE.re + 1e-7, im: ZETA_POLE.im + 1e-7 }
        : point;
}

function isInteractionActive() {
    return !!(
        (appState.panStateZ && appState.panStateZ.isPanning) ||
        (appState.panStateW && appState.panStateW.isPanning) ||
        appState.particleAnimationEnabled
    );
}

function getAdaptiveSamplingBounds() {
    if (isInteractionActive()) {
        return {
            minPoints: 240,
            maxPoints: 2200,
            anchorDensity: 220
        };
    }

    return {
        minPoints: Math.max(700, Math.floor(MIN_POINTS_ADAPTIVE * 0.58)),
        maxPoints: Math.max(3500, Math.floor(MAX_POINTS_ADAPTIVE_DEFAULT * 0.6)),
        anchorDensity: Math.max(360, Math.floor(ADAPTIVE_ANCHOR_DENSITY * 0.65))
    };
}

function getEffectiveProbeTransform(transformFunc) {
    let effectiveTransformFunc = transformFunc;

    if (appState.taylorSeriesEnabled && (!appState.riemannSphereViewEnabled || appState.splitViewEnabled)) {
        effectiveTransformFunc = createTaylorApproximationTransform(
            appState.currentFunction,
            appState.taylorSeriesCenter,
            appState.taylorSeriesOrder
        );
    }

    const profile = getMappedTransformProfile(appState.currentFunction, effectiveTransformFunc);

    return {
        transformFunc: effectiveTransformFunc,
        profile,
        evaluate: createProfileEvaluator(profile)
    };
}

function getChainedOrbitPoint(mode, previousPoint, seedPoint, baseProfile) {
    switch (mode) {
        case 'power':
            return complexMul(previousPoint, seedPoint);
        case 'sqrt':
            return complexPow(previousPoint, 0.5, 0);
        case 'ln':
            return complexLn(previousPoint);
        case 'exp':
            return complexExp(previousPoint);
        case 'reciprocal':
            return complexReciprocal(previousPoint);
        case 'zero_seed':
        case 'recursion':
        default:
            return evaluateProfilePoint(baseProfile, previousPoint.re, previousPoint.im, { c: seedPoint });
    }
}

function drawCanvasArrowhead(ctx, fromPoint, toPoint, size) {
    const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);

    ctx.beginPath();
    ctx.moveTo(toPoint.x, toPoint.y);
    ctx.lineTo(
        toPoint.x - size * Math.cos(angle - Math.PI / 6),
        toPoint.y - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        toPoint.x - size * Math.cos(angle + Math.PI / 6),
        toPoint.y - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

function drawChainedOrbit(ctx, planeParams, startWorldPoint, startCanvasPoint, renderLimit, index) {
    if (index !== 0 || !appState.chainingEnabled || appState.chainCount <= 1) {
        return;
    }

    const baseFunc = transformFunctions[appState.currentFunction];
    const baseProfile = getMappedTransformProfile(appState.currentFunction, baseFunc);
    const limit = renderLimit * 3;

    const zeroSeed = appState.chainingMode === 'zero_seed';
    let previousWorldPoint = zeroSeed ? { re: 0, im: 0 } : startWorldPoint;
    let lastCanvasPoint = zeroSeed
        ? mapToCanvasCoords(0, 0, planeParams)
        : startCanvasPoint;

    ctx.strokeStyle = ORBIT_COLOR;
    ctx.fillStyle = ORBIT_COLOR;
    ctx.lineWidth = 1.5;

    for (let k = zeroSeed ? 0 : 1; k < appState.chainCount; k++) {
        const nextWorldPoint = getChainedOrbitPoint(
            appState.chainingMode,
            previousWorldPoint,
            startWorldPoint,
            baseProfile
        );

        if (!isWithinComplexLimit(nextWorldPoint, limit) || !isNumericallyStable(nextWorldPoint)) {
            break;
        }

        const currentCanvasPoint = mapToCanvasCoords(nextWorldPoint.re, nextWorldPoint.im, planeParams);

        ctx.beginPath();
        ctx.moveTo(lastCanvasPoint.x, lastCanvasPoint.y);
        ctx.lineTo(currentCanvasPoint.x, currentCanvasPoint.y);
        ctx.stroke();

        drawCanvasArrowhead(ctx, lastCanvasPoint, currentCanvasPoint, ORBIT_ARROW_SIZE);
        drawCircleMarker(ctx, currentCanvasPoint, ORBIT_NODE_RADIUS, ORBIT_COLOR);

        previousWorldPoint = nextWorldPoint;
        lastCanvasPoint = currentCanvasPoint;
    }
}

function drawMappedProbeNeighborhood(ctx, planeParams, center, radius, transformFunc, renderLimit) {
    if (!isRenderableComplexPoint(center) || !isFiniteNumber(radius)) {
        return;
    }

    ctx.beginPath();

    const pathState = { open: false };
    let pathWasBroken = false;
    const points = createCirclePoints(center, radius, PROBE_NEIGHBORHOOD_SEGMENTS);

    for (const zPoint of points) {
        const wPoint = transformFunc(zPoint.re, zPoint.im);

        if (!isWithinComplexLimit(wPoint, renderLimit)) {
            breakOpenPath(ctx, pathState);
            pathWasBroken = true;
            continue;
        }

        const canvasPoint = mapToCanvasCoords(wPoint.re, wPoint.im, planeParams);
        appendCanvasPointToPath(ctx, pathState, canvasPoint);
    }

    if (pathState.open) {
        if (!pathWasBroken) {
            ctx.closePath();
        }
        ctx.stroke();
    }
}

function getArrowColor(vector, brightness) {
    const phase = Math.atan2(vector.im, vector.re);
    let hue = ((phase + Math.PI) / TWO_PI) % 1.0;

    if (hue < 0) {
        hue += 1.0;
    }

    const magnitude = Math.hypot(vector.re, vector.im);
    const lightness = clamp(0.35 + Math.log(1.0 + magnitude) * 0.08 * brightness, 0.2, 0.85);
    const rgb = hslToRgb(hue, 0.85, lightness);

    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function drawVectorArrow(ctx, origin, direction, length, headSize) {
    const tipX = origin.x + direction.x * length;
    const tipY = origin.y - direction.y * length;
    const baseCenterX = tipX - direction.x * headSize * 2.5;
    const baseCenterY = tipY + direction.y * headSize * 2.5;
    const perpendicularX = -direction.y;
    const perpendicularY = -direction.x;

    const leftX = baseCenterX + perpendicularX * headSize;
    const leftY = baseCenterY - perpendicularY * headSize;
    const rightX = baseCenterX - perpendicularX * headSize;
    const rightY = baseCenterY + perpendicularY * headSize;

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
}

export function isRenderableComplexPoint(point) {
    return !!(
        point &&
        isFiniteNumber(point.re) &&
        isFiniteNumber(point.im)
    );
}

export function drawComplexLineSetOnPlane(ctx, planeParams, points) {
    strokeSegmentedCanvasPath(ctx, points, point => toCanvasPoint(point, planeParams));
}

export function drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, options = {}) {
    if (!Array.isArray(pointSets) || pointSets.length === 0) {
        return;
    }

    const colorResolver = options.colorResolver || (pointSet => pointSet.color);
    const lineWidthResolver = options.lineWidthResolver || (pointSet => pointSet.lineWidth || LINE_WIDTH_NORMAL);
    const preparePointSet = options.preparePointSet || (pointSet => pointSet);
    const transformFunc = options.transformFunc || null;
    const mappedTransform = options.transformProfile ||
        (transformFunc ? getMappedTransformProfile(appState.currentFunction, transformFunc) : null);

    withSavedContext(ctx, () => {
        configureRoundStroke(ctx);
        setOptionalCanvasState(ctx, options);

        if (mappedTransform && mappedTransform.isConstant) {
            const color = getFirstVisibleColor(
                pointSets,
                colorResolver,
                appState.gridColor1 || COLOR_Z_GRID_HORZ
            );
            drawConstantMappedPoint(ctx, planeParams, mappedTransform.constantValue, color);
            return;
        }

        for (const pointSet of pointSets) {
            const preparedPointSet = preparePointSet(pointSet, transformFunc);

            if (!preparedPointSet || !Array.isArray(preparedPointSet.points)) {
                continue;
            }

            const color = colorResolver(preparedPointSet);
            const lineWidth = lineWidthResolver(preparedPointSet);

            if (!color || !lineWidth) {
                continue;
            }

            ctx.lineWidth = lineWidth;

            if (mappedTransform) {
                drawPlanarTransformedLine(ctx, planeParams, mappedTransform, preparedPointSet.points, color);
            } else {
                ctx.strokeStyle = color;
                drawComplexLineSetOnPlane(ctx, planeParams, preparedPointSet.points);
            }
        }
    });
}

export function drawRadialDiscreteSteps(ctx, planeParams, currentFunctionKey, stepsCount) {
    const transformFunc = transformFunctions[currentFunctionKey];

    if (typeof transformFunc !== 'function') {
        return;
    }

    const radialPointSets = generateRadialDiscreteStepPointSets(currentFunctionKey, transformFunc, stepsCount)
        .filter(pointSet => {
            const radiusPoint = pointSet.points.find(Boolean);
            return radiusPoint && Math.abs(radiusPoint.re * planeParams.scale.x) >= 0.5;
        });

    drawPointSetCollectionOnPlane(ctx, planeParams, radialPointSets, {
        lineDash: [4, 4]
    });
}

export function drawStreamlinesOnZPlane(ctx, planeParams, state) {
    withSavedContext(ctx, () => {
        ctx.lineWidth = state.streamlineThickness;
        configureRoundStroke(ctx);

        const seeds = createGridSeeds(planeParams, state);
        const minMagnitude = STREAMLINE_COLOR_MIN_MAG;
        const magnitudeRange = Math.max(EPSILON, STREAMLINE_COLOR_MAX_MAG - minMagnitude);
        const buckets = Array.from(
            { length: STREAMLINE_COLOR_BUCKETS + 1 },
            () => []
        );

        for (let i = 0; i < seeds.length; i += 2) {
            const path = calculateStreamline(
                seeds[i],
                seeds[i + 1],
                getVectorForStreamline,
                planeParams,
                state
            );

            if (!Array.isArray(path) || path.length < 2) {
                continue;
            }

            for (let k = 0; k < path.length - 1; k++) {
                const start = mapToCanvasCoords(path[k].x, path[k].y, planeParams);
                const end = mapToCanvasCoords(path[k + 1].x, path[k + 1].y, planeParams);
                const bucketIndex = getBucketIndex(path[k].magnitude, minMagnitude, magnitudeRange);

                buckets[bucketIndex].push(start.x, start.y, end.x, end.y);
            }
        }

        for (let bucketIndex = 0; bucketIndex <= STREAMLINE_COLOR_BUCKETS; bucketIndex++) {
            const segments = buckets[bucketIndex];

            if (segments.length === 0) {
                continue;
            }

            ctx.strokeStyle = getStreamlineColorByMagnitude(
                minMagnitude + (bucketIndex / STREAMLINE_COLOR_BUCKETS) * magnitudeRange
            );
            ctx.beginPath();

            for (let i = 0; i < segments.length; i += 4) {
                ctx.moveTo(segments[i], segments[i + 1]);
                ctx.lineTo(segments[i + 2], segments[i + 3]);
            }

            ctx.stroke();
        }
    });
}

export function drawPlanarInputShape(ctx, planeParams) {
    const inputShape = appState.currentInputShape;

    if (isRasterInputShape(inputShape)) {
        drawImageWithWebGL(ctx, planeParams, false);
        return;
    }

    const pointSets = generateCurrentInputShapePointSets(planeParams, {
        currentFunction: appState.currentFunction,
        zetaContinuationEnabled: appState.zetaContinuationEnabled
    });
    const highlightContour = appState.cauchyIntegralModeEnabled &&
        (inputShape === 'circle' || inputShape === 'ellipse');

    drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, {
        colorResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
            ? COLOR_CAUCHY_CONTOUR_Z
            : pointSet.color,
        lineWidthResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
            ? 3.5
            : (pointSet.lineWidth || LINE_WIDTH_NORMAL)
    });
}

export function initializeSingleParticle(planeParams) {
    return getRandomPointInView(planeParams);
}

export function updateAndDrawParticles(ctx, planeParams, state) {
    if (!state.particleAnimationEnabled) {
        state.particles = [];
        return;
    }

    syncParticlePool(state, planeParams);

    withSavedContext(ctx, () => {
        ctx.fillStyle = COLOR_PARTICLE;
        ctx.beginPath();

        const speed = getParticleSpeed(planeParams, state);

        for (let i = 0; i < state.particles.length; i++) {
            let particle = state.particles[i];
            particle.lifetime++;

            if (!advanceParticleRK2(particle, speed, state)) {
                state.particles[i] = initializeSingleParticle(planeParams);
                particle = state.particles[i];
            }

            if (shouldRespawnParticle(particle, planeParams, state)) {
                state.particles[i] = initializeSingleParticle(planeParams);
                particle = state.particles[i];
            }

            const canvasPoint = mapToCanvasCoords(particle.x, particle.y, planeParams);
            if (
                canvasPoint.x >= 0 &&
                canvasPoint.x <= planeParams.width &&
                canvasPoint.y >= 0 &&
                canvasPoint.y <= planeParams.height
            ) {
                ctx.moveTo(canvasPoint.x + PARTICLE_RADIUS, canvasPoint.y);
                ctx.arc(canvasPoint.x, canvasPoint.y, PARTICLE_RADIUS, 0, TWO_PI);
            }
        }

        ctx.fill();
    });
}

export function drawConformalityProbeSegments(ctx, planeParams, center_world, tf, isWPlane) {
    if (!isRenderableComplexPoint(center_world)) {
        return;
    }

    if (isWPlane && typeof tf !== 'function') {
        return;
    }

    const segmentRadius = appState.probeNeighborhoodSize / PROBE_CROSSHAIR_SIZE_FACTOR;
    const endpoints = getProbeCrosshairEndpoints(center_world, segmentRadius);
    const horizontalColor = isWPlane
        ? COLOR_PROBE_CONFORMAL_LINE_W_H
        : COLOR_PROBE_CONFORMAL_LINE_Z_H;
    const verticalColor = isWPlane
        ? COLOR_PROBE_CONFORMAL_LINE_W_V
        : COLOR_PROBE_CONFORMAL_LINE_Z_V;

    withSavedContext(ctx, () => {
        configureRoundStroke(ctx, undefined, 2);

        const horizontalStart = transformProbeEndpoint(endpoints.horizontal[0], tf, isWPlane);
        const horizontalEnd = transformProbeEndpoint(endpoints.horizontal[1], tf, isWPlane);
        const verticalStart = transformProbeEndpoint(endpoints.vertical[0], tf, isWPlane);
        const verticalEnd = transformProbeEndpoint(endpoints.vertical[1], tf, isWPlane);

        drawProbeSegment(ctx, planeParams, horizontalStart, horizontalEnd, horizontalColor, isWPlane);
        drawProbeSegment(ctx, planeParams, verticalStart, verticalEnd, verticalColor, isWPlane);
    });
}

export function drawPlanarProbe(ctx, planeParams) {
    if (!isRenderableComplexPoint(appState.probeZ)) {
        return;
    }

    withSavedContext(ctx, () => {
        const probeCanvas = mapToCanvasCoords(appState.probeZ.re, appState.probeZ.im, planeParams);
        drawCircleMarker(ctx, probeCanvas, PROBE_MARKER_RADIUS, COLOR_PROBE_MARKER);

        configureRoundStroke(ctx, COLOR_PROBE_NEIGHBORHOOD, 1.5);
        drawWorldCircle(
            ctx,
            planeParams,
            appState.probeZ,
            appState.probeNeighborhoodSize,
            PROBE_NEIGHBORHOOD_SEGMENTS
        );

        drawConformalityProbeSegments(ctx, planeParams, appState.probeZ, null, false);
    });
}

export function getPlanarTransformRenderLimit(planeParams) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);

    return Math.max(
        1,
        Math.abs(xRange[0]),
        Math.abs(xRange[1]),
        Math.abs(yRange[0]),
        Math.abs(yRange[1])
    ) * 10;
}

export function drawConstantMappedPoint(ctx, planeParams, w, col) {
    if (!isRenderableComplexPoint(w)) {
        return;
    }

    withSavedContext(ctx, () => {
        const canvasPoint = mapToCanvasCoords(w.re, w.im, planeParams);
        drawCircleMarker(
            ctx,
            canvasPoint,
            CONSTANT_POINT_RADIUS,
            col,
            'rgba(255, 255, 255, 0.8)',
            2
        );
    });
}

export function drawPlanarTransformedLine(ctx, planeParams, mappedTransform, z_pts, col) {
    if (!z_pts || z_pts.length === 0 || !mappedTransform) {
        return;
    }

    const renderLimit = getPlanarTransformRenderLimit(planeParams);
    const jumpThresholdSq = getViewportJumpThresholdSq(planeParams);
    const pathState = { open: false };

    ctx.strokeStyle = col;
    configureRoundStroke(ctx);
    ctx.beginPath();

    let lastMappedPoint = null;

    for (const zPoint of z_pts) {
        if (!isRenderableComplexPoint(zPoint)) {
            breakOpenPath(ctx, pathState);
            lastMappedPoint = null;
            continue;
        }

        const mappedPoint = evaluateProfilePoint(mappedTransform, zPoint.re, zPoint.im);

        if (!isRenderableComplexPoint(mappedPoint)) {
            breakOpenPath(ctx, pathState);
            lastMappedPoint = null;
            continue;
        }

        if (lastMappedPoint) {
            const deltaRe = mappedPoint.re - lastMappedPoint.re;
            const deltaIm = mappedPoint.im - lastMappedPoint.im;

            if (deltaRe * deltaRe + deltaIm * deltaIm > jumpThresholdSq) {
                breakOpenPath(ctx, pathState);
            }
        }

        lastMappedPoint = mappedPoint;

        if (!isWithinComplexLimit(mappedPoint, renderLimit)) {
            breakOpenPath(ctx, pathState);
            continue;
        }

        appendCanvasPointToPath(
            ctx,
            pathState,
            mapToCanvasCoords(mappedPoint.re, mappedPoint.im, planeParams)
        );
    }

    if (pathState.open) {
        ctx.stroke();
    }
}

export function findIntersectionWithViewport(p1, p2, planeParams) {
    if (!isFiniteCanvasPoint(p1) || !isFiniteCanvasPoint(p2)) {
        return null;
    }

    const xmin = 0;
    const xmax = planeParams.width;
    const ymin = 0;
    const ymax = planeParams.height;
    let t = Infinity;

    if (p2.y < ymin && p1.y >= ymin) {
        t = Math.min(t, (ymin - p1.y) / (p2.y - p1.y));
    }
    if (p2.y > ymax && p1.y <= ymax) {
        t = Math.min(t, (ymax - p1.y) / (p2.y - p1.y));
    }
    if (p2.x < xmin && p1.x >= xmin) {
        t = Math.min(t, (xmin - p1.x) / (p2.x - p1.x));
    }
    if (p2.x > xmax && p1.x <= xmax) {
        t = Math.min(t, (xmax - p1.x) / (p2.x - p1.x));
    }

    if (Number.isFinite(t) && t >= 0 && t <= 1) {
        return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
        };
    }

    return null;
}

export function calculateDynamicPointsForSegment(p1_world, p2_world, tf) {
    if (!isRenderableComplexPoint(p1_world) ||
        !isRenderableComplexPoint(p2_world) ||
        typeof tf !== 'function') {
        return DEFAULT_POINTS_PER_LINE;
    }

    let evalPoint = getClosestPointOnInfiniteLine(p1_world, p2_world, ZETA_POLE);

    if (isZetaDirectSeriesSegment(p1_world, p2_world, evalPoint)) {
        return Math.max(240, Math.floor(MIN_POINTS_ADAPTIVE * 0.5));
    }

    evalPoint = nudgeIfAtZetaPole(evalPoint);

    const mappedEvalPoint = tf(evalPoint.re, evalPoint.im);
    if (!isStableRenderableComplexPoint(mappedEvalPoint)) {
        return Math.max(1800, Math.floor(MAX_POINTS_ADAPTIVE_DEFAULT * 0.6));
    }

    const bounds = getAdaptiveSamplingBounds();
    const diameterEstimate = Math.hypot(mappedEvalPoint.re, mappedEvalPoint.im);
    const sampleCount = Math.round(bounds.anchorDensity * diameterEstimate);

    return clamp(sampleCount, bounds.minPoints, bounds.maxPoints);
}

export function generateLinearSegmentPoints(startPoint, endPoint, sampleCount) {
    const steps = Math.max(1, Math.floor(finiteOr(sampleCount, 1)));
    const points = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push({
            re: startPoint.re + t * (endPoint.re - startPoint.re),
            im: startPoint.im + t * (endPoint.im - startPoint.im)
        });
    }

    return points;
}

export function getPointSetEndpoints(pointSet) {
    const validPoints = pointSet && Array.isArray(pointSet.points)
        ? pointSet.points.filter(Boolean)
        : [];

    if (validPoints.length < 2) {
        return null;
    }

    return {
        start: validPoints[0],
        end: validPoints[validPoints.length - 1]
    };
}

export function preparePointSetForMappedPlane(pointSet, transformFunc, options = {}) {
    if (!pointSet || !LINEAR_SOURCE_POINT_SET_ROLES.has(pointSet.role)) {
        return pointSet;
    }

    const endpoints = getPointSetEndpoints(pointSet);
    if (!endpoints) {
        return pointSet;
    }

    const sampleCount = options.sampleCountResolver
        ? options.sampleCountResolver(pointSet, endpoints, transformFunc)
        : DEFAULT_POINTS_PER_LINE;

    return Object.assign({}, pointSet, {
        points: generateLinearSegmentPoints(
            endpoints.start,
            endpoints.end,
            Math.max(2, sampleCount)
        )
    });
}

export function drawFunctionFociOverlay(ctx, planeParams) {
    if (appState.currentFunction !== 'cos' && appState.currentFunction !== 'sin') {
        return;
    }

    withSavedContext(ctx, () => {
        const focus1Canvas = mapToCanvasCoords(1, 0, planeParams);
        const focus2Canvas = mapToCanvasCoords(-1, 0, planeParams);

        drawCircleMarker(ctx, focus1Canvas, FOCI_RADIUS, COLOR_FOCI);
        drawCircleMarker(ctx, focus2Canvas, FOCI_RADIUS, COLOR_FOCI);

        ctx.font = "10px 'SF Pro Text',sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.fillText(
            'Foci: ±1',
            planeParams.origin.x,
            focus1Canvas.y + (focus1Canvas.y < 20 ? 15 : -10)
        );
    });
}

export function shouldDrawPlanarFunctionFociOverlay() {
    return appState.currentInputShape === 'line' &&
        (appState.currentFunction === 'cos' || appState.currentFunction === 'sin');
}

export function shouldDrawPlanarInputRadialOverlay() {
    return appState.radialDiscreteStepsEnabled && appState.currentFunction !== 'poincare';
}

export function drawPlanarInputOverlays(ctx, planeParams) {
    if (shouldDrawPlanarInputRadialOverlay()) {
        drawRadialDiscreteSteps(
            ctx,
            planeParams,
            appState.currentFunction,
            appState.radialDiscreteStepsCount
        );
    }
}

export function drawPlanarTransformedShape(ctx, planeParams, tf, options = {}) {
    const includeGeometry = options.includeGeometry !== false;
    const includeOverlays = options.includeOverlays !== false;
    const inputShape = appState.currentInputShape;
    const highlightContour = appState.cauchyIntegralModeEnabled &&
        (inputShape === 'circle' || inputShape === 'ellipse');

    if (includeGeometry) {
        if (isRasterInputShape(inputShape)) {
            drawImageWithWebGL(ctx, planeParams, true, options.index || 0);
        } else {
            const pointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
                currentFunction: appState.currentFunction,
                zetaContinuationEnabled: appState.zetaContinuationEnabled
            });
            const transformProfile = getMappedTransformProfile(appState.currentFunction, tf);

            drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, {
                transformFunc: tf,
                transformProfile,
                colorResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
                    ? COLOR_CAUCHY_CONTOUR_W
                    : pointSet.color,
                lineWidthResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
                    ? 3.5
                    : (pointSet.lineWidth || LINE_WIDTH_NORMAL),
                preparePointSet: pointSet => preparePointSetForMappedPlane(pointSet, tf, {
                    sampleCountResolver: (currentPointSet, endpoints, transformFunc) => appState.currentFunction === 'zeta'
                        ? calculateDynamicPointsForSegment(endpoints.start, endpoints.end, transformFunc)
                        : DEFAULT_POINTS_PER_LINE
                })
            });
        }
    }

    if (includeOverlays && shouldDrawPlanarFunctionFociOverlay()) {
        drawFunctionFociOverlay(ctx, planeParams);
    }
}

export function getTaylorPointSetColor(pointSet, axisColorX, axisColorY) {
    return TAYLOR_Y_AXIS_ROLES.has(pointSet.role) ? axisColorY : axisColorX;
}

export function drawPlanarTaylorApproximation(
    ctx,
    wPlaneParamsOriginal,
    originalFuncKey,
    taylorCenter,
    taylorOrder,
    axisColorX,
    axisColorY,
    options = {}
) {
    if (options.includeAxes !== false) {
        drawTaylorAxes(
            ctx,
            wPlaneParamsOriginal,
            axisColorX,
            axisColorY,
            'Re(w_approx)',
            'Im(w_approx)'
        );
    }

    const taylorApproxFunc = createTaylorApproximationTransform(
        originalFuncKey,
        taylorCenter,
        taylorOrder
    );
    const pointSets = generateCurrentInputShapePointSets(zPlaneParams, {
        currentFunction: appState.currentFunction,
        zetaContinuationEnabled: appState.zetaContinuationEnabled
    });

    drawPointSetCollectionOnPlane(ctx, wPlaneParamsOriginal, pointSets, {
        transformFunc: taylorApproxFunc,
        colorResolver: pointSet => getTaylorPointSetColor(pointSet, axisColorX, axisColorY),
        lineWidthResolver: pointSet => pointSet.lineWidth || LINE_WIDTH_NORMAL,
        preparePointSet: pointSet => preparePointSetForMappedPlane(pointSet, taylorApproxFunc, {
            sampleCountResolver: () => DEFAULT_POINTS_PER_LINE
        })
    });
}

export function drawPlanarTransformedProbe(ctx, planeParams, tf, index) {
    withSavedContext(ctx, () => {
        const renderLimit = getPlanarTransformRenderLimit(planeParams);
        const effectiveTransform = getEffectiveProbeTransform(tf);
        const probeWorldPoint = effectiveTransform.evaluate(appState.probeZ.re, appState.probeZ.im);

        if (isStableRenderableComplexPoint(probeWorldPoint)) {
            const probeCanvasPoint = mapToCanvasCoords(probeWorldPoint.re, probeWorldPoint.im, planeParams);
            drawCircleMarker(ctx, probeCanvasPoint, PROBE_MARKER_RADIUS, COLOR_PROBE_MARKER);
            drawChainedOrbit(ctx, planeParams, probeWorldPoint, probeCanvasPoint, renderLimit, index);
        }

        configureRoundStroke(ctx, COLOR_PROBE_NEIGHBORHOOD, 1.5);
        drawMappedProbeNeighborhood(
            ctx,
            planeParams,
            appState.probeZ,
            appState.probeNeighborhoodSize,
            effectiveTransform.evaluate,
            renderLimit
        );
        drawConformalityProbeSegments(
            ctx,
            planeParams,
            appState.probeZ,
            effectiveTransform.evaluate,
            true
        );
    });
}

export function drawZPlaneVectorField(ctx, planeParams, currentFunctionStr, vectorFuncType) {
    const rendered = drawVectorFieldWithWebGL(ctx, planeParams);

    if (!rendered) {
        drawVectorFieldCPU(ctx, planeParams, currentFunctionStr, vectorFuncType);
    }
}

export function drawVectorFieldCPU(ctx, planeParams, currentFunctionStr, vectorFuncType) {
    const xRange = getPlaneXRanges(planeParams);
    const yRange = getPlaneYRanges(planeParams);
    const density = clamp(Math.floor(finiteOr(appState.gridDensity, 0) * 0.75), 5, 25);
    const dx = (xRange[1] - xRange[0]) / density;
    const dy = (yRange[1] - yRange[0]) / density;
    const arrowScale = appState.vectorFieldScale || 1;
    const thickness = appState.vectorArrowThickness || 1.5;
    const headSize = appState.vectorArrowHeadSize || 8;
    const brightness = appState.domainBrightness || 1;
    const transformProfile = getMappedTransformProfile(currentFunctionStr);
    const cellPixels = Math.min(planeParams.width / density, planeParams.height / density);
    const arrowLength = cellPixels * 0.38 * arrowScale;
    const arrowHeadSize = cellPixels * headSize * 0.04;

    withSavedContext(ctx, () => {
        configureRoundStroke(ctx, undefined, thickness);

        for (let i = 0; i <= density; i++) {
            const x = xRange[0] + i * dx;

            for (let j = 0; j <= density; j++) {
                const y = yRange[0] + j * dy;
                const vector = getVectorFieldValueAtPoint(
                    x,
                    y,
                    currentFunctionStr,
                    vectorFuncType,
                    appState,
                    transformProfile
                );

                if (!vector) {
                    continue;
                }

                const magnitude = Math.hypot(vector.re, vector.im);
                if (magnitude < EPSILON || !Number.isFinite(magnitude)) {
                    continue;
                }

                const color = getArrowColor(vector, brightness);
                const origin = mapToCanvasCoords(x, y, planeParams);

                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.lineWidth = thickness;

                drawVectorArrow(
                    ctx,
                    origin,
                    {
                        x: vector.re / magnitude,
                        y: vector.im / magnitude
                    },
                    arrowLength,
                    arrowHeadSize
                );
            }
        }
    });
}
