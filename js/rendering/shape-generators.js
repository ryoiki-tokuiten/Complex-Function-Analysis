import { state } from '../store/state.js';
import { TWO_PI, NUM_POINTS_CURVE, ZETA_REFLECTION_POINT_RE } from '../constants/numerical.js';
import {
    COLOR_Z_GRID_HORZ, COLOR_Z_GRID_VERT, COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ, COLOR_Z_GRID_VERT_FUNCTIONAL_EQ,
    COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION,
    COLOR_INPUT_SHAPE_Z, COLOR_INPUT_LINE_IM_Z,
    COLOR_POLAR_RADIAL, COLOR_POLAR_ANGULAR,
    COLOR_LOGPOLAR_EXP_R, COLOR_LOGPOLAR_ANGULAR,
    COLOR_STRIP_LINES, COLOR_SECTOR_LINES
} from '../constants/colors.js';
import { LINE_WIDTH_THIN, LINE_WIDTH_NORMAL, LINE_WIDTH_MEDIUM, LINE_WIDTH_THICK } from '../constants/rendering.js';
import { calculateGridStep } from './canvas-primitives.js';

const EPSILON = 1e-9;
const DEG_TO_RAD = Math.PI / 180;
const HYPERBOLA_U_MAX = 2.5;
const MIN_VISIBLE_RADIUS = 0.1;
const MIN_LOGPOLAR_RADIUS = 0.05;
const RADIAL_DISCRETE_STEP_COLOR = 'rgba(255, 255, 0, 0.7)';

const RADIAL_STEP_DOMAIN_DEFAULT = Object.freeze({ min: -5, max: 5 });
const RADIAL_STEP_DOMAINS = Object.freeze({
    cos: Object.freeze({ min: 0, max: Math.PI / 2 }),
    sin: Object.freeze({ min: 0, max: Math.PI / 2 }),
    tan: Object.freeze({ min: 0, max: Math.PI / 2 }),
    sec: Object.freeze({ min: 0, max: Math.PI / 2 }),
    exp: Object.freeze({ min: -5, max: 5 }),
    ln: Object.freeze({ min: 0.01, max: 10 }),
    polynomial: Object.freeze({ min: 0, max: 5 }),
    mobius: Object.freeze({ min: -5, max: 5 }),
    reciprocal: Object.freeze({ min: -5, max: 5 }),
    zeta: Object.freeze({ min: -10, max: 10 })
});

const RADIAL_STEP_SINGULARITIES = Object.freeze({
    zeta: value => Math.abs(value - 1.0) < EPSILON,
    reciprocal: value => Math.abs(value) < EPSILON,
    ln: value => value <= EPSILON
});

const emptyPointSets = () => [];

const point = (re, im) => ({ re, im });
const degreesToRadians = degrees => degrees * DEG_TO_RAD;
const lerp = (start, end, t) => start + (end - start) * t;

function defaultRange() {
    return [-1, 1];
}

function isRangeLike(value) {
    return Array.isArray(value) && value.length >= 2;
}

function firstRange(...ranges) {
    return ranges.find(isRangeLike) ?? defaultRange();
}

function integerAtLeast(value, minimum) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
        ? Math.max(minimum, Math.floor(numericValue))
        : minimum;
}

/*
 * Inclusive sampling is the geometry contract for this module: public curve
 * generators include both endpoints, and every higher-level shape delegates to
 * this one boundary policy instead of hand-rolling loop arithmetic.
 */
function inclusiveSamples(segments, sampler) {
    const count = integerAtLeast(segments, 1);
    const points = new Array(count + 1);

    for (let index = 0; index <= count; index += 1) {
        points[index] = sampler(index / count, index, count);
    }

    return points;
}

/*
 * Conditional collection avoids map-null-filter churn for geometry paths where
 * invalid samples are expected around singularities or visibility boundaries.
 */
function collect(count, reducer) {
    const results = [];

    for (let index = 0; index < count; index += 1) {
        reducer(results, index);
    }

    return results;
}

function linearlySampledRange(range, divisions) {
    const [start, end] = range;
    return inclusiveSamples(divisions, t => lerp(start, end, t));
}

function cartesianSegment(startRe, startIm, endRe, endIm, segments) {
    return inclusiveSamples(segments, t => point(
        lerp(startRe, endRe, t),
        lerp(startIm, endIm, t)
    ));
}

function radialSegment(angle, startRadius, endRadius, segments) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return inclusiveSamples(segments, t => {
        const radius = lerp(startRadius, endRadius, t);
        return point(radius * cos, radius * sin);
    });
}

function logarithmicRadialSegment(angle, minLogRadius, maxLogRadius, segments) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return inclusiveSamples(segments, t => {
        const radius = Math.exp(lerp(minLogRadius, maxLogRadius, t));
        return point(radius * cos, radius * sin);
    });
}

function arcPoints(radius, startAngle, endAngle, segments) {
    return inclusiveSamples(segments, t => {
        const angle = lerp(startAngle, endAngle, t);
        return point(radius * Math.cos(angle), radius * Math.sin(angle));
    });
}

function finitePoint(value) {
    return value && Number.isFinite(value.re) && Number.isFinite(value.im);
}

function maxVisibleRadius(config) {
    return Math.max(
        Math.abs(config.xRange[0]),
        Math.abs(config.xRange[1]),
        Math.abs(config.yRange[0]),
        Math.abs(config.yRange[1]),
        MIN_VISIBLE_RADIUS
    );
}

function currentGridPalette() {
    return {
        horizontal: state.gridColor1 || COLOR_Z_GRID_HORZ,
        vertical: state.gridColor2 || COLOR_Z_GRID_VERT,
        horizontalFunctionalEquation: state.gridColor1 || COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ,
        verticalFunctionalEquation: state.gridColor2 || COLOR_Z_GRID_VERT_FUNCTIONAL_EQ,
        zetaUndefinedSumRegion: COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION
    };
}

function isBoundaryCrossing(previousPoint, currentPoint, splitRe) {
    const previousDelta = previousPoint.re - splitRe;
    const currentDelta = currentPoint.re - splitRe;
    return previousDelta === 0 || currentDelta === 0 || previousDelta * currentDelta < 0;
}

function findFirstBoundaryCrossingIndex(points, splitRe) {
    return points.findIndex((currentPoint, index) => (
        index > 0 && isBoundaryCrossing(points[index - 1], currentPoint, splitRe)
    ));
}

function interpolateBoundaryPoint(previousPoint, currentPoint, splitRe) {
    if (currentPoint.re === previousPoint.re) {
        return point(splitRe, previousPoint.im);
    }

    const ratio = (splitRe - previousPoint.re) / (currentPoint.re - previousPoint.re);
    return point(splitRe, lerp(previousPoint.im, currentPoint.im, ratio));
}

function appendPointIfMissing(points, nextPoint) {
    const currentPoint = points.at(-1);

    if (!currentPoint || currentPoint.re !== nextPoint.re || currentPoint.im !== nextPoint.im) {
        points.push(nextPoint);
    }

    return points;
}

function prependPointIfMissing(points, nextPoint) {
    const currentPoint = points[0];

    if (!currentPoint || currentPoint.re !== nextPoint.re || currentPoint.im !== nextPoint.im) {
        points.unshift(nextPoint);
    }

    return points;
}

function zetaVerticalGridColor(pointSet, palette) {
    const referencePoint = pointSet.points.find(Boolean);

    return referencePoint && referencePoint.re < ZETA_REFLECTION_POINT_RE
        ? palette.verticalFunctionalEquation
        : palette.vertical;
}

function prepareZetaPointSet(pointSet, palette) {
    if (pointSet.role === 'grid-horizontal') {
        return splitPointSetAtRealBoundary(
            pointSet,
            ZETA_REFLECTION_POINT_RE,
            palette.horizontalFunctionalEquation,
            palette.horizontal
        );
    }

    if (pointSet.role === 'grid-vertical') {
        return [cloneLineSet(pointSet, { color: zetaVerticalGridColor(pointSet, palette) })];
    }

    return [pointSet];
}

function radialStepIsSingular(functionKey, value) {
    return Boolean(RADIAL_STEP_SINGULARITIES[functionKey]?.(value));
}

export function createLineSet(points, color, role, lineWidth) {
    return { points, color, role, lineWidth };
}

export function getVisiblePlaneRanges(planeParams) {
    const params = planeParams ?? {};

    return {
        xRange: firstRange(params.currentVisXRange, params.xRange),
        yRange: firstRange(params.currentVisYRange, params.yRange)
    };
}

export function buildInputShapeGeometryConfig(planeParams, options = {}) {
    const { xRange, yRange } = getVisiblePlaneRanges(planeParams);

    return {
        currentInputShape: options.currentInputShape ?? state.currentInputShape,
        currentFunction: options.currentFunction ?? state.currentFunction,
        zetaContinuationEnabled: options.zetaContinuationEnabled ?? state.zetaContinuationEnabled,
        xRange: options.xRange ?? xRange,
        yRange: options.yRange ?? yRange,
        gridDensity: integerAtLeast(options.gridDensity ?? state.gridDensity, 1),
        curvePoints: integerAtLeast(options.curvePoints ?? NUM_POINTS_CURVE, 8),
        a0: options.a0 ?? state.a0,
        b0: options.b0 ?? state.b0,
        circleR: options.circleR ?? state.circleR,
        ellipseA: options.ellipseA ?? state.ellipseA,
        ellipseB: options.ellipseB ?? state.ellipseB,
        hyperbolaA: options.hyperbolaA ?? state.hyperbolaA,
        hyperbolaB: options.hyperbolaB ?? state.hyperbolaB,
        stripY1: options.stripY1 ?? state.stripY1,
        stripY2: options.stripY2 ?? state.stripY2,
        sectorAngle1: options.sectorAngle1 ?? state.sectorAngle1,
        sectorAngle2: options.sectorAngle2 ?? state.sectorAngle2,
        sectorRMin: options.sectorRMin ?? state.sectorRMin,
        sectorRMax: options.sectorRMax ?? state.sectorRMax
    };
}

export function generateCirclePoints(cx, cy, radius, numPoints) {
    return inclusiveSamples(numPoints, t => {
        const angle = t * TWO_PI;
        return point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    });
}

export function generateEllipsePoints(cx, cy, a, b, numPoints) {
    return inclusiveSamples(numPoints, t => {
        const angle = t * TWO_PI;
        return point(cx + a * Math.cos(angle), cy + b * Math.sin(angle));
    });
}

export function generateHyperbolaPoints(cx, cy, a, b, numPoints) {
    const halfSteps = integerAtLeast(numPoints / 2, 2);

    const branch = sign => inclusiveSamples(halfSteps, t => {
        const u = t * HYPERBOLA_U_MAX - HYPERBOLA_U_MAX / 2;
        return point(cx + sign * a * Math.cosh(u), cy + b * Math.sinh(u));
    });

    return [...branch(1), null, ...branch(-1)];
}

export function generateLinePoints(xMin, xMax, y, numPoints) {
    return cartesianSegment(xMin, y, xMax, y, numPoints);
}

export function generateVerticalLinePoints(x, yMin, yMax, numPoints) {
    return cartesianSegment(x, yMin, x, yMax, numPoints);
}

export function generateCartesianGridPointSets(config) {
    const palette = currentGridPalette();
    const sampleCount = integerAtLeast(config.curvePoints / 2, 2);
    const gridDensity = integerAtLeast(config.gridDensity, 1);

    const spanX = config.xRange[1] - config.xRange[0];
    const spanY = config.yRange[1] - config.yRange[0];

    const stepX = calculateGridStep(spanX, gridDensity);
    const stepY = calculateGridStep(spanY, gridDensity);

    const horizontalSets = [];
    if (stepY > 1e-9) {
        const yStart = Math.ceil(config.yRange[0] / stepY) * stepY;
        const yEnd = Math.floor(config.yRange[1] / stepY) * stepY;
        if ((yEnd - yStart) / stepY <= 200) {
            for (let y = yStart; y <= yEnd + 1e-6; y += stepY) {
                horizontalSets.push(createLineSet(
                    generateLinePoints(config.xRange[0], config.xRange[1], y, sampleCount),
                    palette.horizontal,
                    'grid-horizontal',
                    LINE_WIDTH_NORMAL
                ));
            }
        }
    }

    const verticalSets = [];
    if (stepX > 1e-9) {
        const xStart = Math.ceil(config.xRange[0] / stepX) * stepX;
        const xEnd = Math.floor(config.xRange[1] / stepX) * stepX;
        if ((xEnd - xStart) / stepX <= 200) {
            for (let x = xStart; x <= xEnd + 1e-6; x += stepX) {
                verticalSets.push(createLineSet(
                    generateVerticalLinePoints(x, config.yRange[0], config.yRange[1], sampleCount),
                    config.currentFunction === 'zeta' && !config.zetaContinuationEnabled && x <= ZETA_REFLECTION_POINT_RE
                        ? palette.zetaUndefinedSumRegion
                        : palette.vertical,
                    'grid-vertical',
                    LINE_WIDTH_NORMAL
                ));
            }
        }
    }

    return [...horizontalSets, ...verticalSets];
}

export function generatePolarGridPointSets(config) {
    const maxRadius = maxVisibleRadius(config);
    const angularLineCount = integerAtLeast(Math.max(4, config.gridDensity), 4);

    const angularSets = Array.from({ length: angularLineCount }, (_, index) => {
        const angle = (index / angularLineCount) * TWO_PI;

        return createLineSet(
            radialSegment(angle, 0, maxRadius, config.curvePoints),
            COLOR_POLAR_ANGULAR,
            'polar-angular',
            LINE_WIDTH_NORMAL
        );
    });

    const gridDensity = integerAtLeast(config.gridDensity, 1);
    const step = calculateGridStep(maxRadius, gridDensity);

    const radialSets = [];
    if (step > 1e-9 && (maxRadius / step) <= 200) {
        for (let radius = step; radius <= maxRadius + 1e-6; radius += step) {
            radialSets.push(createLineSet(
                generateCirclePoints(0, 0, radius, config.curvePoints),
                COLOR_POLAR_RADIAL,
                'polar-radial',
                LINE_WIDTH_NORMAL
            ));
        }
    }

    return [...angularSets, ...radialSets];
}

export function generateLogPolarGridPointSets(config) {
    const maxRadius = maxVisibleRadius(config);
    const minLogRadius = Math.log(MIN_LOGPOLAR_RADIUS);
    const maxLogRadius = Math.log(maxRadius);
    const angularLineCount = integerAtLeast(Math.max(4, config.gridDensity), 4);
    const gridDensity = integerAtLeast(config.gridDensity, 1);

    const angularSets = Array.from({ length: angularLineCount }, (_, index) => {
        const angle = (index / angularLineCount) * TWO_PI;

        return createLineSet(
            logarithmicRadialSegment(angle, minLogRadius, maxLogRadius, config.curvePoints),
            COLOR_LOGPOLAR_ANGULAR,
            'logpolar-angular',
            LINE_WIDTH_NORMAL
        );
    });

    const spanLog = maxLogRadius - minLogRadius;
    const logStep = calculateGridStep(spanLog, gridDensity);

    const radialSets = [];
    if (logStep > 1e-9 && (spanLog / logStep) <= 200) {
        const logStart = Math.ceil(minLogRadius / logStep) * logStep;
        const logEnd = Math.floor(maxLogRadius / logStep) * logStep;

        for (let logVal = logStart; logVal <= logEnd + 1e-6; logVal += logStep) {
            const radius = Math.exp(logVal);
            if (radius <= maxRadius * 1.1) {
                radialSets.push(createLineSet(
                    generateCirclePoints(0, 0, radius, config.curvePoints),
                    COLOR_LOGPOLAR_EXP_R,
                    'logpolar-radial',
                    LINE_WIDTH_NORMAL
                ));
            }
        }
    }

    return [...angularSets, ...radialSets];
}

export function generateStripPointSets(config) {
    const sampleCount = integerAtLeast(config.curvePoints, 2);

    return [config.stripY1, config.stripY2].map(y => createLineSet(
        generateLinePoints(config.xRange[0], config.xRange[1], y, sampleCount),
        COLOR_STRIP_LINES,
        'strip-boundary',
        LINE_WIDTH_MEDIUM
    ));
}

export function generateSectorPointSets(config) {
    const angle1 = degreesToRadians(config.sectorAngle1);
    const angle2 = degreesToRadians(config.sectorAngle2);
    const linePointCount = integerAtLeast(config.curvePoints / 2, 8);
    const arcPointCount = integerAtLeast(config.curvePoints / 4, 8);

    return [
        createLineSet(
            radialSegment(angle1, config.sectorRMin, config.sectorRMax, linePointCount),
            COLOR_SECTOR_LINES,
            'sector-radial',
            LINE_WIDTH_MEDIUM
        ),
        createLineSet(
            radialSegment(angle2, config.sectorRMin, config.sectorRMax, linePointCount),
            COLOR_SECTOR_LINES,
            'sector-radial',
            LINE_WIDTH_MEDIUM
        ),
        createLineSet(
            arcPoints(config.sectorRMin, angle1, angle2, arcPointCount),
            COLOR_SECTOR_LINES,
            'sector-arc',
            LINE_WIDTH_MEDIUM
        ),
        createLineSet(
            arcPoints(config.sectorRMax, angle1, angle2, arcPointCount),
            COLOR_SECTOR_LINES,
            'sector-arc',
            LINE_WIDTH_MEDIUM
        )
    ];
}

export function generateLineShapePointSets(config) {
    const sampleCount = integerAtLeast(config.curvePoints, 2);

    return [
        createLineSet(
            generateLinePoints(config.xRange[0], config.xRange[1], config.b0, sampleCount),
            COLOR_INPUT_SHAPE_Z,
            'line-horizontal',
            LINE_WIDTH_THICK
        ),
        createLineSet(
            generateVerticalLinePoints(config.a0, config.yRange[0], config.yRange[1], sampleCount),
            COLOR_INPUT_LINE_IM_Z,
            'line-vertical',
            LINE_WIDTH_THICK
        )
    ];
}

const GEOMETRIC_POINT_FACTORIES = Object.freeze({
    circle: config => generateCirclePoints(config.a0, config.b0, config.circleR, config.curvePoints),
    ellipse: config => generateEllipsePoints(config.a0, config.b0, config.ellipseA, config.ellipseB, config.curvePoints),
    hyperbola: config => generateHyperbolaPoints(config.a0, config.b0, config.hyperbolaA, config.hyperbolaB, config.curvePoints)
});

export function generateGeometricShapePointSets(config) {
    const buildPoints = GEOMETRIC_POINT_FACTORIES[config.currentInputShape];

    return buildPoints
        ? [createLineSet(buildPoints(config), COLOR_INPUT_SHAPE_Z, 'shape-curve', LINE_WIDTH_THICK)]
        : [];
}

const INPUT_SHAPE_GENERATORS = Object.freeze({
    grid_cartesian: generateCartesianGridPointSets,
    grid_polar: generatePolarGridPointSets,
    grid_logpolar: generateLogPolarGridPointSets,
    strip_horizontal: generateStripPointSets,
    sector_angular: generateSectorPointSets,
    line: generateLineShapePointSets,
    circle: generateGeometricShapePointSets,
    ellipse: generateGeometricShapePointSets,
    hyperbola: generateGeometricShapePointSets,
    empty_grid: emptyPointSets,
    image: emptyPointSets,
    video: emptyPointSets
});

export function generateInputShapePointSets(config) {
    return (INPUT_SHAPE_GENERATORS[config?.currentInputShape] ?? emptyPointSets)(config);
}

export function generateCurrentInputShapePointSets(planeParams, options = {}) {
    return generateInputShapePointSets(buildInputShapeGeometryConfig(planeParams, options));
}

export function generateCurrentMappedInputShapePointSets(planeParams, options = {}) {
    return prepareInputShapePointSetsForMapping(
        generateCurrentInputShapePointSets(planeParams, options),
        options
    );
}

export function cloneLineSet(pointSet, overrides = {}) {
    return {
        points: pointSet.points,
        color: pointSet.color,
        role: pointSet.role,
        lineWidth: pointSet.lineWidth,
        ...overrides
    };
}

export function splitPointSetAtRealBoundary(pointSet, splitRe, leftColor, rightColor) {
    const sourcePoints = (pointSet.points ?? []).filter(Boolean);

    if (sourcePoints.length < 2) {
        return [];
    }

    const crossingIndex = findFirstBoundaryCrossingIndex(sourcePoints, splitRe);

    if (crossingIndex === -1) {
        const isLeft = sourcePoints.every(sourcePoint => sourcePoint.re <= splitRe);
        return [cloneLineSet(pointSet, { color: isLeft ? leftColor : rightColor })];
    }

    const previousPoint = sourcePoints[crossingIndex - 1];
    const currentPoint = sourcePoints[crossingIndex];
    const boundaryPoint = interpolateBoundaryPoint(previousPoint, currentPoint, splitRe);

    const leftPoints = appendPointIfMissing(sourcePoints.slice(0, crossingIndex), boundaryPoint);
    const rightPoints = prependPointIfMissing(sourcePoints.slice(crossingIndex), boundaryPoint);

    return [
        cloneLineSet(pointSet, { points: leftPoints, color: leftColor }),
        cloneLineSet(pointSet, { points: rightPoints, color: rightColor })
    ].filter(set => set.points.length > 1);
}

export function prepareInputShapePointSetsForMapping(pointSets, options = {}) {
    const currentFunction = options.currentFunction ?? state.currentFunction;
    const zetaContinuationEnabled = options.zetaContinuationEnabled ?? state.zetaContinuationEnabled;

    if (currentFunction !== 'zeta' || !zetaContinuationEnabled) {
        return pointSets;
    }

    const palette = currentGridPalette();
    const preparedSets = [];

    for (const pointSet of pointSets) {
        preparedSets.push(...prepareZetaPointSet(pointSet, palette));
    }

    return preparedSets;
}

export function getRadialDiscreteStepDomain(functionKey) {
    return { ...(RADIAL_STEP_DOMAINS[functionKey] ?? RADIAL_STEP_DOMAIN_DEFAULT) };
}

export function generateRadialDiscreteStepPointSets(functionKey, transformFunc, stepsCount, options = {}) {
    const steps = integerAtLeast(stepsCount, 0);

    if (steps < 2 || typeof transformFunc !== 'function') {
        return [];
    }

    const domain = getRadialDiscreteStepDomain(functionKey);
    const circlePointCount = integerAtLeast(options.curvePoints ?? NUM_POINTS_CURVE / 2, 24);

    return collect(steps, (sets, index) => {
        const x = lerp(domain.min, domain.max, index / (steps - 1));

        if (radialStepIsSingular(functionKey, x)) {
            return;
        }

        const transformedPoint = transformFunc(x, 0);

        if (!finitePoint(transformedPoint)) {
            return;
        }

        const radius = Math.hypot(transformedPoint.re, transformedPoint.im);

        if (radius > 0) {
            sets.push(createLineSet(
                generateCirclePoints(0, 0, radius, circlePointCount),
                RADIAL_DISCRETE_STEP_COLOR,
                'radial-discrete-step',
                LINE_WIDTH_THIN
            ));
        }
    });
}