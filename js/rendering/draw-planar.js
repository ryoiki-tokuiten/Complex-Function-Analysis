const MAX_VECTOR_DISPLAY_LENGTH_CANVAS = 75;

function isRenderableComplexPoint(point) {
    return !!(
        point &&
        typeof point.re === 'number' &&
        typeof point.im === 'number' &&
        Number.isFinite(point.re) &&
        Number.isFinite(point.im)
    );
}

function drawComplexLineSetOnPlane(ctx, planeParams, points) {
    ctx.beginPath();
    let segmentOpen = false;

    points.forEach(point => {
        if (!isRenderableComplexPoint(point)) {
            if (segmentOpen) {
                ctx.stroke();
                ctx.beginPath();
                segmentOpen = false;
            }
            return;
        }

        const canvasPoint = mapToCanvasCoords(point.re, point.im, planeParams);
        if (!segmentOpen) {
            ctx.moveTo(canvasPoint.x, canvasPoint.y);
            segmentOpen = true;
        } else {
            ctx.lineTo(canvasPoint.x, canvasPoint.y);
        }
    });

    if (segmentOpen) {
        ctx.stroke();
    }
}

function drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, options = {}) {
    if (!pointSets || pointSets.length === 0) {
        return;
    }

    const colorResolver = options.colorResolver || (pointSet => pointSet.color);
    const lineWidthResolver = options.lineWidthResolver || (pointSet => pointSet.lineWidth || LINE_WIDTH_NORMAL);
    const preparePointSet = options.preparePointSet || (pointSet => pointSet);
    const transformFunc = options.transformFunc || null;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (options.lineDash) {
        ctx.setLineDash(options.lineDash);
    }
    if (options.globalAlpha !== undefined) {
        ctx.globalAlpha = options.globalAlpha;
    }

    pointSets.forEach(pointSet => {
        const preparedPointSet = preparePointSet(pointSet, transformFunc);
        const color = colorResolver(preparedPointSet);
        const lineWidth = lineWidthResolver(preparedPointSet);
        if (!color || !lineWidth) {
            return;
        }

        ctx.lineWidth = lineWidth;
        if (transformFunc) {
            drawPlanarTransformedLine(ctx, planeParams, transformFunc, preparedPointSet.points, color);
        } else {
            ctx.strokeStyle = color;
            drawComplexLineSetOnPlane(ctx, planeParams, preparedPointSet.points);
        }
    });

    ctx.restore();
}

function drawRadialDiscreteSteps(ctx, planeParams, currentFunctionKey, stepsCount) {
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

function drawStreamlinesOnZPlane(ctx, planeParams, state) {
    ctx.save();
    
    ctx.lineWidth = state.streamlineThickness; 
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const { currentVisXRange: xR, currentVisYRange: yR } = planeParams;
    const numSeedRows = Math.max(2, Math.floor(state.gridDensity * state.streamlineSeedDensityFactor));
    const numSeedCols = Math.max(2, Math.floor(state.gridDensity * state.streamlineSeedDensityFactor));

    
    

    if (state.manualSeedPoints && state.manualSeedPoints.length > 0) {
        
        for (const seed of state.manualSeedPoints) {
            const startX = seed.re;
            const startY = seed.im;

            const streamlinePath = calculateStreamline( 
                startX, startY,
                getVectorForStreamline,
                planeParams,
                
                
                state
            );

            if (streamlinePath && streamlinePath.length > 1) {
                for (let k = 0; k < streamlinePath.length - 1; k++) {
                    const p1 = streamlinePath[k];
                    const p2 = streamlinePath[k+1];

                    const canvasP1 = mapToCanvasCoords(p1.x, p1.y, planeParams);
                    const canvasP2 = mapToCanvasCoords(p2.x, p2.y, planeParams);

                    const segmentColor = getStreamlineColorByMagnitude(p1.magnitude);

                    ctx.beginPath();
                    ctx.strokeStyle = segmentColor;
                    ctx.moveTo(canvasP1.x, canvasP1.y);
                    ctx.lineTo(canvasP2.x, canvasP2.y);
                    ctx.stroke();
                }
            }
        }
    } else {
        
        for (let i = 0; i <= numSeedRows; i++) {
            for (let j = 0; j <= numSeedCols; j++) {
                const startX = xR[0] + (j / numSeedCols) * (xR[1] - xR[0]);
                const startY = yR[0] + (i / numSeedRows) * (yR[1] - yR[0]);

                const streamlinePath = calculateStreamline( 
                    startX, startY,
                    getVectorForStreamline,
                    planeParams,
                    
                    
                    state
                );

                if (streamlinePath && streamlinePath.length > 1) {
                    for (let k = 0; k < streamlinePath.length - 1; k++) {
                        const p1 = streamlinePath[k];
                        const p2 = streamlinePath[k+1];

                        const canvasP1 = mapToCanvasCoords(p1.x, p1.y, planeParams);
                        const canvasP2 = mapToCanvasCoords(p2.x, p2.y, planeParams);

                        const segmentColor = getStreamlineColorByMagnitude(p1.magnitude);

                        ctx.beginPath();
                        ctx.strokeStyle = segmentColor;
                        ctx.moveTo(canvasP1.x, canvasP1.y);
                        ctx.lineTo(canvasP2.x, canvasP2.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }
    ctx.restore();
}

function drawPlanarInputShape(ctx, planeParams) {
    const inputShape = state.currentInputShape;

    if (inputShape === 'image') {
        if (typeof drawImageWithWebGL === 'function' && drawImageWithWebGL(ctx, planeParams, false)) {
            return;
        }

        if (state.imagePoints && state.imagePoints.length > 0) {
            ctx.save();
            ctx.globalAlpha = state.imageOpacity || 1.0;
            const size = state.imageSize || 2.0;
            const cx = state.a0 || 0;
            const cy = state.b0 || 0;

            for (let i = 0; i < state.imagePoints.length; i++) {
                const point = state.imagePoints[i];
                const re = cx + point.nx * (size / 2);
                const im = cy + point.ny * (size / 2);
                const canvasPoint = mapToCanvasCoords(re, im, planeParams);
                ctx.fillStyle = point.color;
                ctx.fillRect(canvasPoint.x - 1, canvasPoint.y - 1, 2, 2);
            }

            ctx.restore();
        }
        return;
    }

    const pointSets = generateCurrentInputShapePointSets(planeParams, {
        currentFunction: state.currentFunction,
        zetaContinuationEnabled: state.zetaContinuationEnabled
    });
    const highlightContour = state.cauchyIntegralModeEnabled && (inputShape === 'circle' || inputShape === 'ellipse');

    drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, {
        colorResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
            ? COLOR_CAUCHY_CONTOUR_Z
            : pointSet.color,
        lineWidthResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
            ? 3.5
            : (pointSet.lineWidth || LINE_WIDTH_NORMAL)
    });
}

function initializeSingleParticle(planeParams) {
    
    const xMin = planeParams.currentVisXRange[0];
    const xMax = planeParams.currentVisXRange[1];
    const yMin = planeParams.currentVisYRange[0];
    const yMax = planeParams.currentVisYRange[1];

    return {
        x: xMin + Math.random() * (xMax - xMin),
        y: yMin + Math.random() * (yMax - yMin),
        lifetime: 0
    };
}

function updateAndDrawParticles(ctx, planeParams, state) {
    if (!state.particleAnimationEnabled) {
        state.particles = []; 
        return;
    }

    
    while (state.particles.length < state.particleDensity) {
        state.particles.push(initializeSingleParticle(planeParams));
    }
    
    while (state.particles.length > state.particleDensity && state.particles.length > 0) { 
        state.particles.pop();
    }

    ctx.save();
    ctx.fillStyle = COLOR_PARTICLE; 

    const xMin = planeParams.currentVisXRange[0];
    const xMax = planeParams.currentVisXRange[1];
    const yMin = planeParams.currentVisYRange[0];
    const yMax = planeParams.currentVisYRange[1];

    for (let i = 0; i < state.particles.length; i++) {
        let p = state.particles[i];
        p.lifetime++;

        
        
        const vector = getVectorForStreamline(p.x, p.y, state.currentFunction, state.vectorFieldFunction, state);

        
        p.x += vector.vx * state.particleSpeed;
        p.y += vector.vy * state.particleSpeed;

        
        if (p.lifetime > state.particleMaxLifetime ||
            p.x < xMin || p.x > xMax ||
            p.y < yMin || p.y > yMax ||
            isNaN(p.x) || isNaN(p.y) || !isFinite(p.x) || !isFinite(p.y) ||
            isNaN(vector.vx) || isNaN(vector.vy) || !isFinite(vector.vx) || !isFinite(vector.vy) ) { 
            state.particles[i] = initializeSingleParticle(planeParams);
            p = state.particles[i]; 
        }

        
        const canvasP = mapToCanvasCoords(p.x, p.y, planeParams);
        
        if (canvasP.x >= 0 && canvasP.x <= planeParams.width && canvasP.y >= 0 && canvasP.y <= planeParams.height) {
             ctx.beginPath();
             ctx.arc(canvasP.x, canvasP.y, PARTICLE_RADIUS, 0, 2 * Math.PI); 
             ctx.fill();
        }
    }
    ctx.restore();
}
function drawConformalityProbeSegments(ctx, planeParams, center_world, tf, isWPlane) {const h_segment = state.probeNeighborhoodSize / PROBE_CROSSHAIR_SIZE_FACTOR; const z_c = center_world;const z_h_plus  = { re: z_c.re + h_segment, im: z_c.im };const z_h_minus = { re: z_c.re - h_segment, im: z_c.im };const z_v_plus  = { re: z_c.re, im: z_c.im + h_segment };const z_v_minus = { re: z_c.re, im: z_c.im - h_segment };let p1_h_world, p2_h_world, p1_v_world, p2_v_world;let color_h, color_v;if (isWPlane) {p1_h_world = tf(z_h_minus.re, z_h_minus.im);p2_h_world = tf(z_h_plus.re, z_h_plus.im);p1_v_world = tf(z_v_minus.re, z_v_minus.im);p2_v_world = tf(z_v_plus.re, z_v_plus.im);color_h = COLOR_PROBE_CONFORMAL_LINE_W_H;color_v = COLOR_PROBE_CONFORMAL_LINE_W_V;} else {p1_h_world = z_h_minus;p2_h_world = z_h_plus;p1_v_world = z_v_minus;p2_v_world = z_v_plus;color_h = COLOR_PROBE_CONFORMAL_LINE_Z_H;color_v = COLOR_PROBE_CONFORMAL_LINE_Z_V;}const drawSegmentIfValid = (p1w, p2w, color) => {if (!isNaN(p1w.re) && !isNaN(p1w.im) && !isNaN(p2w.re) && !isNaN(p2w.im) &&isFinite(p1w.re) && isFinite(p1w.im) && isFinite(p2w.re) && isFinite(p2w.im)) {const p1_canvas = mapToCanvasCoords(p1w.re, p1w.im, planeParams);const p2_canvas = mapToCanvasCoords(p2w.re, p2w.im, planeParams);const canvasWidth = planeParams.width;const canvasHeight = planeParams.height;const margin = Math.max(canvasWidth, canvasHeight) * 2; if (p1_canvas.x > -margin && p1_canvas.x < canvasWidth + margin &&p1_canvas.y > -margin && p1_canvas.y < canvasHeight + margin &&p2_canvas.x > -margin && p2_canvas.x < canvasWidth + margin &&p2_canvas.y > -margin && p2_canvas.y < canvasHeight + margin) {ctx.save();ctx.strokeStyle = color;ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();ctx.moveTo(p1_canvas.x, p1_canvas.y);ctx.lineTo(p2_canvas.x, p2_canvas.y);ctx.stroke();ctx.restore();}}};drawSegmentIfValid(p1_h_world, p2_h_world, color_h);drawSegmentIfValid(p1_v_world, p2_v_world, color_v);}
function drawPlanarProbe(ctx,planeParams){const p_p_c=mapToCanvasCoords(state.probeZ.re,state.probeZ.im,planeParams);ctx.fillStyle=COLOR_PROBE_MARKER;ctx.beginPath();ctx.arc(p_p_c.x,p_p_c.y,5,0,2*Math.PI);ctx.fill();ctx.strokeStyle=COLOR_PROBE_NEIGHBORHOOD;ctx.lineWidth=1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();const r_l=state.probeNeighborhoodSize;for(let i=0;i<=60;++i){const a=(i/60)*2*Math.PI;const z_b={re:state.probeZ.re+r_l*Math.cos(a),im:state.probeZ.im+r_l*Math.sin(a)};const p_c=mapToCanvasCoords(z_b.re,z_b.im,planeParams);if(i===0)ctx.moveTo(p_c.x,p_c.y);else ctx.lineTo(p_c.x,p_c.y);}ctx.closePath();ctx.stroke();drawConformalityProbeSegments(ctx, planeParams, state.probeZ, null, false);}

function drawPlanarTransformedLine(ctx, planeParams, tf, z_pts, col) {
    ctx.strokeStyle = col;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();let fV = true; let lastValidCanvasPoint = null;for (const z_pt of z_pts) {if (!z_pt || z_pt.re === undefined || z_pt.im === undefined) { if (!fV && lastValidCanvasPoint) ctx.stroke(); ctx.beginPath(); fV = true; lastValidCanvasPoint = null; continue;}let w;if (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled && z_pt.re <= ZETA_REFLECTION_POINT_RE) {w = { re: NaN, im: NaN };} else {w = tf(z_pt.re, z_pt.im);}if (isNaN(w.re) || isNaN(w.im) || !isFinite(w.re) || !isFinite(w.im) ||Math.abs(w.re) > planeParams.xRange[1] * 10 || Math.abs(w.im) > planeParams.yRange[1] * 10) { if (!fV && lastValidCanvasPoint) {const edgePoint = findIntersectionWithViewport(lastValidCanvasPoint, {x: planeParams.origin.x + w.re * planeParams.scale.x, y: planeParams.origin.y - w.im * planeParams.scale.y}, planeParams);if (edgePoint) ctx.lineTo(edgePoint.x, edgePoint.y);ctx.stroke();}ctx.beginPath();fV = true;lastValidCanvasPoint = null;continue;}const p_c = mapToCanvasCoords(w.re, w.im, planeParams);if (fV) {ctx.moveTo(p_c.x, p_c.y);fV = false;} else {ctx.lineTo(p_c.x, p_c.y);}lastValidCanvasPoint = p_c;}if (!fV && lastValidCanvasPoint) {ctx.stroke();}}
function findIntersectionWithViewport(p1, p2, planeParams) {const xmin = 0, xmax = planeParams.width;const ymin = 0, ymax = planeParams.height;let t = Infinity;if (p2.y < ymin && p1.y >= ymin) { t = Math.min(t, (ymin - p1.y) / (p2.y - p1.y)); }if (p2.y > ymax && p1.y <= ymax) { t = Math.min(t, (ymax - p1.y) / (p2.y - p1.y)); }if (p2.x < xmin && p1.x >= xmin) { t = Math.min(t, (xmin - p1.x) / (p2.x - p1.x)); }if (p2.x > xmax && p1.x <= xmax) { t = Math.min(t, (xmax - p1.x) / (p2.x - p1.x)); }if (isFinite(t) && t >= 0 && t <= 1) {return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };}return null;}
function calculateDynamicPointsForSegment(p1_world, p2_world, tf) {
    const v_re = p2_world.re - p1_world.re;
    const v_im = p2_world.im - p1_world.im;
    const pole_to_p1_re = p1_world.re - ZETA_POLE.re;
    const pole_to_p1_im = p1_world.im - ZETA_POLE.im;
    let eval_point_for_tf;
    const dot_v_v = v_re * v_re + v_im * v_im;

    if (Math.abs(dot_v_v) < 1e-12) {
        eval_point_for_tf = p1_world;
    } else {
        const t_closest_line = -(pole_to_p1_re * v_re + pole_to_p1_im * v_im) / dot_v_v;
        eval_point_for_tf = {
            re: p1_world.re + t_closest_line * v_re,
            im: p1_world.im + t_closest_line * v_im
        };
    }

    const isLeftOfDirectSeriesBoundary = (
        (p1_world.re <= ZETA_REFLECTION_POINT_RE && p2_world.re <= ZETA_REFLECTION_POINT_RE) ||
        eval_point_for_tf.re <= ZETA_REFLECTION_POINT_RE
    );
    if (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled && isLeftOfDirectSeriesBoundary) {
        return Math.max(240, Math.floor(MIN_POINTS_ADAPTIVE * 0.5));
    }

    if (Math.abs(eval_point_for_tf.re - ZETA_POLE.re) < 1e-9 && Math.abs(eval_point_for_tf.im - ZETA_POLE.im) < 1e-9) {
        eval_point_for_tf = { re: ZETA_POLE.re + 1e-7, im: ZETA_POLE.im + 1e-7 };
    }

    const w_at_eval_point = tf(eval_point_for_tf.re, eval_point_for_tf.im);
    if (isNaN(w_at_eval_point.re) || isNaN(w_at_eval_point.im) || !isFinite(w_at_eval_point.re) || !isFinite(w_at_eval_point.im)) {
        return Math.max(1800, Math.floor(MAX_POINTS_ADAPTIVE_DEFAULT * 0.6));
    }

    const isInteracting = !!(
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning) ||
        state.particleAnimationEnabled
    );
    const baseMinPoints = Math.max(700, Math.floor(MIN_POINTS_ADAPTIVE * 0.58));
    const baseMaxPoints = Math.max(3500, Math.floor(MAX_POINTS_ADAPTIVE_DEFAULT * 0.6));
    const baseAnchorDensity = Math.max(360, Math.floor(ADAPTIVE_ANCHOR_DENSITY * 0.65));
    const minPoints = isInteracting ? 240 : baseMinPoints;
    const maxPoints = isInteracting ? 2200 : baseMaxPoints;
    const anchorDensity = isInteracting ? 220 : baseAnchorDensity;

    const diameter_estimate = Math.sqrt(w_at_eval_point.re * w_at_eval_point.re + w_at_eval_point.im * w_at_eval_point.im);
    let num_points = Math.round(anchorDensity * diameter_estimate);
    num_points = Math.min(maxPoints, Math.max(minPoints, num_points));
    return num_points;
}

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

function generateLinearSegmentPoints(startPoint, endPoint, sampleCount) {
    const points = [];
    for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        points.push({
            re: startPoint.re + t * (endPoint.re - startPoint.re),
            im: startPoint.im + t * (endPoint.im - startPoint.im)
        });
    }
    return points;
}

function getPointSetEndpoints(pointSet) {
    const validPoints = pointSet.points.filter(Boolean);
    if (validPoints.length < 2) {
        return null;
    }
    return {
        start: validPoints[0],
        end: validPoints[validPoints.length - 1]
    };
}

function preparePointSetForMappedPlane(pointSet, transformFunc, options = {}) {
    if (!LINEAR_SOURCE_POINT_SET_ROLES.has(pointSet.role)) {
        return pointSet;
    }

    const endpoints = getPointSetEndpoints(pointSet);
    if (!endpoints) {
        return pointSet;
    }

    const sampleCount = options.sampleCountResolver
        ? options.sampleCountResolver(pointSet, endpoints, transformFunc)
        : DEFAULT_POINTS_PER_LINE;

    return {
        ...pointSet,
        points: generateLinearSegmentPoints(endpoints.start, endpoints.end, Math.max(2, sampleCount))
    };
}

function drawFunctionFociOverlay(ctx, planeParams) {
    if (state.currentFunction !== 'cos' && state.currentFunction !== 'sin') {
        return;
    }

    ctx.save();
    ctx.fillStyle = COLOR_FOCI;
    const focus1Canvas = mapToCanvasCoords(1, 0, planeParams);
    const focus2Canvas = mapToCanvasCoords(-1, 0, planeParams);
    ctx.beginPath();
    ctx.arc(focus1Canvas.x, focus1Canvas.y, 4, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(focus2Canvas.x, focus2Canvas.y, 4, 0, TWO_PI);
    ctx.fill();
    ctx.font = "10px 'SF Pro Text',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
    ctx.fillText('Foci: ±1', planeParams.origin.x, focus1Canvas.y + (focus1Canvas.y < 20 ? 15 : -10));
    ctx.restore();
}

function shouldDrawPlanarFunctionFociOverlay() {
    return state.currentInputShape === 'line' && (state.currentFunction === 'cos' || state.currentFunction === 'sin');
}

function shouldDrawPlanarInputRadialOverlay() {
    return state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare';
}

function isWithinTaylorConvergenceRegion(zInputComplex, z0Complex) {
    const radius = state.taylorSeriesConvergenceRadius;
    if (!Number.isFinite(radius)) {
        return true;
    }

    const dx = zInputComplex.re - z0Complex.re;
    const dy = zInputComplex.im - z0Complex.im;
    return dx * dx + dy * dy <= (radius * radius * 1.000001);
}

function drawPlanarInputOverlays(ctx, planeParams) {
    if (shouldDrawPlanarInputRadialOverlay()) {
        drawRadialDiscreteSteps(ctx, planeParams, state.currentFunction, state.radialDiscreteStepsCount);
    }
}

function drawPlanarTransformedShape(ctx, planeParams, tf, options = {}) {
    const includeGeometry = options.includeGeometry !== false;
    const includeOverlays = options.includeOverlays !== false;
    const inputShape = state.currentInputShape;
    const highlightContour = state.cauchyIntegralModeEnabled && (inputShape === 'circle' || inputShape === 'ellipse');

    if (includeGeometry) {
        if (inputShape === 'image') {
            if (typeof drawImageWithWebGL === 'function' && drawImageWithWebGL(ctx, planeParams, true)) {
                return;
            }

            if (state.imagePoints && state.imagePoints.length > 0) {
                ctx.save();
                ctx.globalAlpha = state.imageOpacity || 1.0;
                const size = state.imageSize || 2.0;
                const cx = state.a0 || 0;
                const cy = state.b0 || 0;

                for (let i = 0; i < state.imagePoints.length; i++) {
                    const point = state.imagePoints[i];
                    const re = cx + point.nx * (size / 2);
                    const im = cy + point.ny * (size / 2);
                    const w = tf(re, im);
                    if (isRenderableComplexPoint(w)) {
                        const canvasPoint = mapToCanvasCoords(w.re, w.im, planeParams);
                        ctx.fillStyle = point.color;
                        ctx.fillRect(canvasPoint.x - 1, canvasPoint.y - 1, 2, 2);
                    }
                }
                ctx.restore();
            }

        } else {
            const pointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
                currentFunction: state.currentFunction,
                zetaContinuationEnabled: state.zetaContinuationEnabled
            });
            drawPointSetCollectionOnPlane(ctx, planeParams, pointSets, {
                transformFunc: tf,
                colorResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
                    ? COLOR_CAUCHY_CONTOUR_W
                    : pointSet.color,
                lineWidthResolver: pointSet => highlightContour && pointSet.role === 'shape-curve'
                    ? 3.5
                    : (pointSet.lineWidth || LINE_WIDTH_NORMAL),
                preparePointSet: pointSet => preparePointSetForMappedPlane(pointSet, tf, {
                    sampleCountResolver: (currentPointSet, endpoints, transformFunc) => state.currentFunction === 'zeta'
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

function createTaylorApproximationTransform(functionKey, taylorCenter, taylorOrder) {
    const z0Complex = new Complex(taylorCenter.re, taylorCenter.im);
    const coefficients = computeTaylorSeriesCoefficients(functionKey, z0Complex, taylorOrder);

    return (re, im) => {
        if (!coefficients) {
            return { re: NaN, im: NaN };
        }

        const zInputComplex = new Complex(re, im);
        if (!isWithinTaylorConvergenceRegion(zInputComplex, z0Complex)) {
            return { re: NaN, im: NaN };
        }
        const result = evaluateTaylorSeries(coefficients, zInputComplex, z0Complex);
        return { re: result.re, im: result.im };
    };
}

function getTaylorPointSetColor(pointSet, axisColorX, axisColorY) {
    switch (pointSet.role) {
        case 'grid-horizontal':
        case 'polar-angular':
        case 'logpolar-angular':
        case 'strip-boundary':
        case 'line-horizontal':
        case 'sector-arc':
            return axisColorY;
        default:
            return axisColorX;
    }
}

function drawPlanarTaylorApproximation(ctx, wPlaneParamsOriginal, originalFuncKey, taylorCenter, taylorOrder, axisColorX, axisColorY, options = {}) {
    if (options.includeAxes !== false) {
        drawTaylorAxes(ctx, wPlaneParamsOriginal, axisColorX, axisColorY, 'Re(w_approx)', 'Im(w_approx)');
    }

    const taylorApproxFunc = createTaylorApproximationTransform(originalFuncKey, taylorCenter, taylorOrder);
    const pointSets = generateCurrentInputShapePointSets(zPlaneParams, {
        currentFunction: state.currentFunction,
        zetaContinuationEnabled: state.zetaContinuationEnabled
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


function drawPlanarTransformedProbe(ctx,planeParams,tf){
    let effectiveTransformFunc = tf;
    if (state.taylorSeriesEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        effectiveTransformFunc = createTaylorApproximationTransform(
            state.currentFunction,
            state.taylorSeriesCenter,
            state.taylorSeriesOrder
        );
    }

    const pW=effectiveTransformFunc(state.probeZ.re,state.probeZ.im);
    if(!isNaN(pW.re)&&!isNaN(pW.im)&&isFinite(pW.re)&&isFinite(pW.im)){
        const p_p_c=mapToCanvasCoords(pW.re,pW.im,planeParams);
        ctx.fillStyle=COLOR_PROBE_MARKER;
        ctx.beginPath();
        ctx.arc(p_p_c.x,p_p_c.y,5,0,2*Math.PI);
        ctx.fill();
    }

    ctx.strokeStyle=COLOR_PROBE_NEIGHBORHOOD;
    ctx.lineWidth=1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const r_l=state.probeNeighborhoodSize;
    let fPt=true;
    for(let i=0;i<=60;++i){
        const a=(i/60)*2*Math.PI;
        const z_b={re:state.probeZ.re+r_l*Math.cos(a),im:state.probeZ.im+r_l*Math.sin(a)};
        const w_b=effectiveTransformFunc(z_b.re,z_b.im); 
        if(isNaN(w_b.re)||isNaN(w_b.im)||!isFinite(w_b.re)||!isFinite(w_b.im)||Math.abs(w_b.re)>planeParams.xRange[1]*10||Math.abs(w_b.im)>planeParams.yRange[1]*10){
            if(!fPt)ctx.stroke();
            ctx.beginPath();
            fPt=true;
            continue;
        }
        const p_c=mapToCanvasCoords(w_b.re,w_b.im,planeParams);
        if(fPt){ctx.moveTo(p_c.x,p_c.y);fPt=false;}
        else{ctx.lineTo(p_c.x,p_c.y);}
    }
    if(!fPt){ctx.closePath();ctx.stroke();}
    drawConformalityProbeSegments(ctx, planeParams, state.probeZ, effectiveTransformFunc, true); 
}

function drawZPlaneVectorField(ctx, planeParams, currentFunctionStr, vectorFuncType) {
    const { currentVisXRange: xR, currentVisYRange: yR } = planeParams;
    const density = Math.max(5, Math.min(25, Math.floor(state.gridDensity * 0.75)));
    const dx = (xR[1] - xR[0]) / density;
    const dy = (yR[1] - yR[0]) / density;
    

    for (let i = 0; i <= density; i++) {
        const z_re = xR[0] + i * dx;
        for (let j = 0; j <= density; j++) {
            const z_im = yR[0] + j * dy;
            const z = { re: z_re, im: z_im };
            const vectorVal = getVectorFieldValueAtPoint(z.re, z.im, currentFunctionStr, vectorFuncType, state);

            if (isNaN(vectorVal.re) || isNaN(vectorVal.im) || !isFinite(vectorVal.re) || !isFinite(vectorVal.im)) {
                continue;
            }

            const z_canvas = mapToCanvasCoords(z.re, z.im, planeParams);

            
            const vx_world_scaled = vectorVal.re * state.vectorFieldScale;
            const vy_world_scaled = vectorVal.im * state.vectorFieldScale;

            
            const z_plus_v_re = z.re + vx_world_scaled;
            const z_plus_v_im = z.im + vy_world_scaled;
            const z_plus_v_canvas = mapToCanvasCoords(z_plus_v_re, z_plus_v_im, planeParams);

            
            const true_phase = Math.atan2(vectorVal.im, vectorVal.re); 
            const true_color_mag_norm = Math.log(1 + Math.sqrt(vectorVal.re**2 + vectorVal.im**2)); 
            const arrowColor = getHSLColor(true_phase, true_color_mag_norm, 1, state.domainBrightness, state.domainContrast, state.domainLightnessCycles, state.domainSaturation);

            
            
            if (Math.abs(z_canvas.x - z_plus_v_canvas.x) < 0.5 && Math.abs(z_canvas.y - z_plus_v_canvas.y) < 0.5) {
                ctx.fillStyle = arrowColor;
                ctx.beginPath();
                ctx.arc(z_canvas.x, z_canvas.y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
                continue;
            }

            
            let endX = z_plus_v_canvas.x;
            let endY = z_plus_v_canvas.y;

            const dx_canvas = endX - z_canvas.x;
            const dy_canvas = endY - z_canvas.y;
            const current_display_length_sq = dx_canvas * dx_canvas + dy_canvas * dy_canvas;

            if (current_display_length_sq > 0 && current_display_length_sq > (MAX_VECTOR_DISPLAY_LENGTH_CANVAS * MAX_VECTOR_DISPLAY_LENGTH_CANVAS)) {
                const current_display_length = Math.sqrt(current_display_length_sq);
                const scale_factor = MAX_VECTOR_DISPLAY_LENGTH_CANVAS / current_display_length;
                endX = z_canvas.x + dx_canvas * scale_factor;
                endY = z_canvas.y + dy_canvas * scale_factor;
            }

            drawArrow(
                ctx,
                z_canvas.x,
                z_canvas.y,
                endX,
                endY,
                arrowColor,
                state.vectorArrowHeadSize,
                state.vectorArrowThickness
            );
        }
    }
}
