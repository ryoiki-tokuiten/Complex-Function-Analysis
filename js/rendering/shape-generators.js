function createLineSet(points, color, role, lineWidth) {
    return { points, color, role, lineWidth };
}

function getVisiblePlaneRanges(planeParams) {
    return {
        xRange: planeParams.currentVisXRange || planeParams.xRange || [-1, 1],
        yRange: planeParams.currentVisYRange || planeParams.yRange || [-1, 1]
    };
}

function buildInputShapeGeometryConfig(planeParams, options = {}) {
    const { xRange, yRange } = getVisiblePlaneRanges(planeParams);

    return {
        currentInputShape: options.currentInputShape ?? state.currentInputShape,
        currentFunction: options.currentFunction ?? state.currentFunction,
        zetaContinuationEnabled: options.zetaContinuationEnabled ?? state.zetaContinuationEnabled,
        xRange: options.xRange ?? xRange,
        yRange: options.yRange ?? yRange,
        gridDensity: Math.max(1, options.gridDensity ?? state.gridDensity),
        curvePoints: Math.max(8, Math.floor(options.curvePoints ?? NUM_POINTS_CURVE)),
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

function generateCirclePoints(cx, cy, radius, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        const t = (i / numPoints) * TWO_PI;
        points.push({ re: cx + radius * Math.cos(t), im: cy + radius * Math.sin(t) });
    }
    return points;
}

function generateEllipsePoints(cx, cy, a, b, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        const t = (i / numPoints) * TWO_PI;
        points.push({ re: cx + a * Math.cos(t), im: cy + b * Math.sin(t) });
    }
    return points;
}

function generateHyperbolaPoints(cx, cy, a, b, numPoints) {
    const points = [];
    const uMax = 2.5;
    const halfSteps = Math.max(2, Math.floor(numPoints / 2));

    for (let i = 0; i <= halfSteps; ++i) {
        const u = (i / halfSteps) * uMax - uMax / 2;
        points.push({ re: cx + a * Math.cosh(u), im: cy + b * Math.sinh(u) });
    }

    points.push(null);

    for (let i = 0; i <= halfSteps; ++i) {
        const u = (i / halfSteps) * uMax - uMax / 2;
        points.push({ re: cx - a * Math.cosh(u), im: cy + b * Math.sinh(u) });
    }

    return points;
}

function generateLinePoints(xMin, xMax, y, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        points.push({ re: xMin + i * (xMax - xMin) / numPoints, im: y });
    }
    return points;
}

function generateVerticalLinePoints(x, yMin, yMax, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        points.push({ re: x, im: yMin + i * (yMax - yMin) / numPoints });
    }
    return points;
}

function generateCartesianGridPointSets(config) {
    const sets = [];
    const sampleCount = Math.max(2, Math.floor(config.curvePoints / 2));

    for (let i = 0; i <= config.gridDensity; i++) {
        const y = config.yRange[0] + (i / config.gridDensity) * (config.yRange[1] - config.yRange[0]);
        sets.push(createLineSet(
            generateLinePoints(config.xRange[0], config.xRange[1], y, sampleCount),
            COLOR_Z_GRID_HORZ,
            'grid-horizontal',
            LINE_WIDTH_NORMAL
        ));
    }

    for (let i = 0; i <= config.gridDensity; i++) {
        const x = config.xRange[0] + (i / config.gridDensity) * (config.xRange[1] - config.xRange[0]);
        const color = (config.currentFunction === 'zeta' && !config.zetaContinuationEnabled && x <= ZETA_REFLECTION_POINT_RE)
            ? COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION
            : COLOR_Z_GRID_VERT;
        sets.push(createLineSet(
            generateVerticalLinePoints(x, config.yRange[0], config.yRange[1], sampleCount),
            color,
            'grid-vertical',
            LINE_WIDTH_NORMAL
        ));
    }

    return sets;
}

function generatePolarGridPointSets(config) {
    const sets = [];
    const maxRadius = Math.max(
        Math.abs(config.xRange[0]),
        Math.abs(config.xRange[1]),
        Math.abs(config.yRange[0]),
        Math.abs(config.yRange[1]),
        0.1
    );
    const angularLineCount = Math.max(4, config.gridDensity);

    for (let i = 0; i < angularLineCount; i++) {
        const angle = (i / angularLineCount) * TWO_PI;
        const points = [];
        for (let j = 0; j <= config.curvePoints; j++) {
            const radius = (j / config.curvePoints) * maxRadius;
            points.push({ re: radius * Math.cos(angle), im: radius * Math.sin(angle) });
        }
        sets.push(createLineSet(points, COLOR_POLAR_ANGULAR, 'polar-angular', LINE_WIDTH_NORMAL));
    }

    for (let i = 1; i <= config.gridDensity; i++) {
        const radius = (i / config.gridDensity) * maxRadius;
        sets.push(createLineSet(
            generateCirclePoints(0, 0, radius, config.curvePoints),
            COLOR_POLAR_RADIAL,
            'polar-radial',
            LINE_WIDTH_NORMAL
        ));
    }

    return sets;
}

function generateLogPolarGridPointSets(config) {
    const sets = [];
    const maxRadius = Math.max(
        Math.abs(config.xRange[0]),
        Math.abs(config.xRange[1]),
        Math.abs(config.yRange[0]),
        Math.abs(config.yRange[1]),
        0.1
    );
    const minRadius = 0.05;
    const minLogRadius = Math.log(minRadius);
    const maxLogRadius = Math.log(maxRadius);
    const angularLineCount = Math.max(4, config.gridDensity);

    for (let i = 0; i < angularLineCount; i++) {
        const angle = (i / angularLineCount) * TWO_PI;
        const points = [];
        for (let j = 0; j <= config.curvePoints; j++) {
            const logRadius = minLogRadius + (j / config.curvePoints) * (maxLogRadius - minLogRadius);
            const radius = Math.exp(logRadius);
            points.push({ re: radius * Math.cos(angle), im: radius * Math.sin(angle) });
        }
        sets.push(createLineSet(points, COLOR_LOGPOLAR_ANGULAR, 'logpolar-angular', LINE_WIDTH_NORMAL));
    }

    for (let i = 0; i <= config.gridDensity; i++) {
        const logRadius = minLogRadius + (i / config.gridDensity) * (maxLogRadius - minLogRadius);
        const radius = Math.exp(logRadius);
        if (radius > maxRadius * 1.1) {
            continue;
        }
        sets.push(createLineSet(
            generateCirclePoints(0, 0, radius, config.curvePoints),
            COLOR_LOGPOLAR_EXP_R,
            'logpolar-radial',
            LINE_WIDTH_NORMAL
        ));
    }

    return sets;
}

function generateStripPointSets(config) {
    const sampleCount = Math.max(2, config.curvePoints);
    return [
        createLineSet(
            generateLinePoints(config.xRange[0], config.xRange[1], config.stripY1, sampleCount),
            COLOR_STRIP_LINES,
            'strip-boundary',
            LINE_WIDTH_MEDIUM
        ),
        createLineSet(
            generateLinePoints(config.xRange[0], config.xRange[1], config.stripY2, sampleCount),
            COLOR_STRIP_LINES,
            'strip-boundary',
            LINE_WIDTH_MEDIUM
        )
    ];
}

function generateSectorPointSets(config) {
    const angle1 = config.sectorAngle1 * Math.PI / 180;
    const angle2 = config.sectorAngle2 * Math.PI / 180;
    const linePointCount = Math.max(8, Math.floor(config.curvePoints / 2));
    const arcPointCount = Math.max(8, Math.floor(config.curvePoints / 4));

    const radial1 = [];
    const radial2 = [];
    const innerArc = [];
    const outerArc = [];

    for (let i = 0; i <= linePointCount; i++) {
        const radius = config.sectorRMin + (i / linePointCount) * (config.sectorRMax - config.sectorRMin);
        radial1.push({ re: radius * Math.cos(angle1), im: radius * Math.sin(angle1) });
        radial2.push({ re: radius * Math.cos(angle2), im: radius * Math.sin(angle2) });
    }

    for (let i = 0; i <= arcPointCount; i++) {
        const angle = angle1 + (i / arcPointCount) * (angle2 - angle1);
        innerArc.push({ re: config.sectorRMin * Math.cos(angle), im: config.sectorRMin * Math.sin(angle) });
        outerArc.push({ re: config.sectorRMax * Math.cos(angle), im: config.sectorRMax * Math.sin(angle) });
    }

    return [
        createLineSet(radial1, COLOR_SECTOR_LINES, 'sector-radial', LINE_WIDTH_MEDIUM),
        createLineSet(radial2, COLOR_SECTOR_LINES, 'sector-radial', LINE_WIDTH_MEDIUM),
        createLineSet(innerArc, COLOR_SECTOR_LINES, 'sector-arc', LINE_WIDTH_MEDIUM),
        createLineSet(outerArc, COLOR_SECTOR_LINES, 'sector-arc', LINE_WIDTH_MEDIUM)
    ];
}

function generateLineShapePointSets(config) {
    const sampleCount = Math.max(2, config.curvePoints);
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

function generateGeometricShapePointSets(config) {
    const shape = config.currentInputShape;
    if (shape === 'circle') {
        return [createLineSet(
            generateCirclePoints(config.a0, config.b0, config.circleR, config.curvePoints),
            COLOR_INPUT_SHAPE_Z,
            'shape-curve',
            LINE_WIDTH_THICK
        )];
    }
    if (shape === 'ellipse') {
        return [createLineSet(
            generateEllipsePoints(config.a0, config.b0, config.ellipseA, config.ellipseB, config.curvePoints),
            COLOR_INPUT_SHAPE_Z,
            'shape-curve',
            LINE_WIDTH_THICK
        )];
    }
    if (shape === 'hyperbola') {
        return [createLineSet(
            generateHyperbolaPoints(config.a0, config.b0, config.hyperbolaA, config.hyperbolaB, config.curvePoints),
            COLOR_INPUT_SHAPE_Z,
            'shape-curve',
            LINE_WIDTH_THICK
        )];
    }
    return [];
}

function generateInputShapePointSets(config) {
    switch (config.currentInputShape) {
        case 'grid_cartesian':
            return generateCartesianGridPointSets(config);
        case 'grid_polar':
            return generatePolarGridPointSets(config);
        case 'grid_logpolar':
            return generateLogPolarGridPointSets(config);
        case 'strip_horizontal':
            return generateStripPointSets(config);
        case 'sector_angular':
            return generateSectorPointSets(config);
        case 'line':
            return generateLineShapePointSets(config);
        case 'circle':
        case 'ellipse':
        case 'hyperbola':
            return generateGeometricShapePointSets(config);
        case 'empty_grid':
        case 'image':
        case 'video':
        default:
            return [];
    }
}

function generateCurrentInputShapePointSets(planeParams, options = {}) {
    return generateInputShapePointSets(buildInputShapeGeometryConfig(planeParams, options));
}

function generateCurrentMappedInputShapePointSets(planeParams, options = {}) {
    const pointSets = generateCurrentInputShapePointSets(planeParams, options);
    return prepareInputShapePointSetsForMapping(pointSets, options);
}

function cloneLineSet(pointSet, overrides = {}) {
    return {
        points: pointSet.points,
        color: pointSet.color,
        role: pointSet.role,
        lineWidth: pointSet.lineWidth,
        ...overrides
    };
}

function splitPointSetAtRealBoundary(pointSet, splitRe, leftColor, rightColor) {
    const sourcePoints = pointSet.points.filter(Boolean);
    if (sourcePoints.length < 2) {
        return [];
    }

    let crossingIndex = -1;
    for (let i = 1; i < sourcePoints.length; i++) {
        const previousPoint = sourcePoints[i - 1];
        const currentPoint = sourcePoints[i];
        const previousDelta = previousPoint.re - splitRe;
        const currentDelta = currentPoint.re - splitRe;

        if (previousDelta === 0 || currentDelta === 0 || previousDelta * currentDelta < 0) {
            crossingIndex = i;
            break;
        }
    }

    if (crossingIndex === -1) {
        const isLeft = sourcePoints.every(point => point.re <= splitRe);
        return [cloneLineSet(pointSet, { color: isLeft ? leftColor : rightColor })];
    }

    const previousPoint = sourcePoints[crossingIndex - 1];
    const currentPoint = sourcePoints[crossingIndex];
    let boundaryPoint = { re: splitRe, im: previousPoint.im };

    if (currentPoint.re !== previousPoint.re) {
        const ratio = (splitRe - previousPoint.re) / (currentPoint.re - previousPoint.re);
        boundaryPoint = {
            re: splitRe,
            im: previousPoint.im + ratio * (currentPoint.im - previousPoint.im)
        };
    }

    const leftPoints = sourcePoints.slice(0, crossingIndex);
    const rightPoints = sourcePoints.slice(crossingIndex);

    if (
        leftPoints.length === 0 ||
        leftPoints[leftPoints.length - 1].re !== boundaryPoint.re ||
        leftPoints[leftPoints.length - 1].im !== boundaryPoint.im
    ) {
        leftPoints.push(boundaryPoint);
    }
    if (
        rightPoints.length === 0 ||
        rightPoints[0].re !== boundaryPoint.re ||
        rightPoints[0].im !== boundaryPoint.im
    ) {
        rightPoints.unshift(boundaryPoint);
    }

    return [
        cloneLineSet(pointSet, { points: leftPoints, color: leftColor }),
        cloneLineSet(pointSet, { points: rightPoints, color: rightColor })
    ].filter(set => set.points.length > 1);
}

function prepareInputShapePointSetsForMapping(pointSets, options = {}) {
    const currentFunction = options.currentFunction ?? state.currentFunction;
    const zetaContinuationEnabled = options.zetaContinuationEnabled ?? state.zetaContinuationEnabled;

    if (currentFunction !== 'zeta' || !zetaContinuationEnabled) {
        return pointSets;
    }

    const preparedSets = [];

    pointSets.forEach(pointSet => {
        if (pointSet.role === 'grid-horizontal') {
            preparedSets.push(...splitPointSetAtRealBoundary(
                pointSet,
                ZETA_REFLECTION_POINT_RE,
                COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ,
                COLOR_Z_GRID_HORZ
            ));
            return;
        }

        if (pointSet.role === 'grid-vertical') {
            const referencePoint = pointSet.points.find(Boolean);
            const color = referencePoint && referencePoint.re < ZETA_REFLECTION_POINT_RE
                ? COLOR_Z_GRID_VERT_FUNCTIONAL_EQ
                : COLOR_Z_GRID_VERT;
            preparedSets.push(cloneLineSet(pointSet, { color }));
            return;
        }

        preparedSets.push(pointSet);
    });

    return preparedSets;
}

function getRadialDiscreteStepDomain(functionKey) {
    switch (functionKey) {
        case 'cos':
        case 'sin':
        case 'tan':
        case 'sec':
            return { min: 0, max: Math.PI / 2 };
        case 'exp':
            return { min: -5, max: 5 };
        case 'ln':
            return { min: 0.01, max: 10 };
        case 'polynomial':
            return { min: 0, max: 5 };
        case 'mobius':
        case 'reciprocal':
            return { min: -5, max: 5 };
        case 'zeta':
            return { min: -10, max: 10 };
        default:
            return { min: -5, max: 5 };
    }
}

function generateRadialDiscreteStepPointSets(functionKey, transformFunc, stepsCount, options = {}) {
    if (stepsCount < 2 || typeof transformFunc !== 'function') {
        return [];
    }

    const domain = getRadialDiscreteStepDomain(functionKey);
    const circlePointCount = Math.max(24, Math.floor(options.curvePoints ?? NUM_POINTS_CURVE / 2));
    const sets = [];

    for (let i = 0; i < stepsCount; i++) {
        const x = domain.min + (i / (stepsCount - 1)) * (domain.max - domain.min);

        if (functionKey === 'zeta' && Math.abs(x - 1.0) < 1e-9) continue;
        if (functionKey === 'reciprocal' && Math.abs(x) < 1e-9) continue;
        if (functionKey === 'ln' && x <= 1e-9) continue;

        const w = transformFunc(x, 0);
        if (!w || !Number.isFinite(w.re) || !Number.isFinite(w.im)) {
            continue;
        }

        const radius = Math.sqrt(w.re * w.re + w.im * w.im);
        if (radius <= 0) {
            continue;
        }

        sets.push(createLineSet(
            generateCirclePoints(0, 0, radius, circlePointCount),
            'rgba(255, 255, 0, 0.7)',
            'radial-discrete-step',
            LINE_WIDTH_THIN
        ));
    }

    return sets;
}
