const MAX_VECTOR_DISPLAY_LENGTH_CANVAS = 75; 

function drawRadialDiscreteSteps(ctx, planeParams, currentFunctionKey, stepsCount) {
    if (stepsCount < 2) return;

    const transformFunc = transformFunctions[currentFunctionKey];
    if (!transformFunc) return;

    let xMin, xMax;
    switch (currentFunctionKey) {
        case 'cos':
        case 'sin':
        case 'tan':
        case 'sec':
            xMin = 0; xMax = Math.PI / 2;
            break;
        case 'exp':
            xMin = -5; xMax = 5;
            break;
        case 'ln':
            xMin = 0.01; xMax = 10;
            break;
        case 'polynomial':
            xMin = 0; xMax = 5;
            break;
        case 'mobius':
        case 'reciprocal':
            xMin = -5; xMax = 5;
            break;
        case 'zeta':
            xMin = -10; xMax = 10;
            break;
        default:
            xMin = -5; xMax = 5;
    }

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; 
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const centerCanvas = mapToCanvasCoords(0, 0, planeParams); 

    for (let i = 0; i < stepsCount; i++) {
        const x = xMin + (i / (stepsCount - 1)) * (xMax - xMin);

        if (currentFunctionKey === 'zeta' && Math.abs(x - 1.0) < 1e-9) continue;
        if (currentFunctionKey === 'reciprocal' && Math.abs(x) < 1e-9) continue;
        if (currentFunctionKey === 'ln' && x <= 1e-9) continue;

        const w = transformFunc(x, 0);

        if (w && typeof w.re === 'number' && typeof w.im === 'number' &&
            isFinite(w.re) && isFinite(w.im)) {

            const radiusWorld = Math.sqrt(w.re * w.re + w.im * w.im);
            const radiusCanvas = radiusWorld * planeParams.scale.x; 

            if (radiusCanvas < 0.5) continue; 

            ctx.beginPath();
            ctx.arc(centerCanvas.x, centerCanvas.y, radiusCanvas, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
    ctx.restore();
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

function drawPlanarInputShape(ctx,planeParams){
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let scX=0,scY=0;if (state.currentInputShape === 'line' || state.currentInputShape === 'circle' || state.currentInputShape === 'ellipse' || state.currentInputShape === 'hyperbola') {scX = state.a0;scY = state.b0;}let inputShapeToDraw=state.currentInputShape;let radiusToUse=state.circleR;ctx.lineWidth = (state.cauchyIntegralModeEnabled && (inputShapeToDraw === 'circle' || inputShapeToDraw === 'ellipse')) ? 3.5 : 2.5;ctx.strokeStyle = (state.cauchyIntegralModeEnabled && (inputShapeToDraw === 'circle' || inputShapeToDraw === 'ellipse')) ? COLOR_CAUCHY_CONTOUR_Z : COLOR_INPUT_SHAPE_Z;if(inputShapeToDraw==='grid_cartesian'){
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const{currentVisXRange:xR,currentVisYRange:yR}=planeParams;const nL=state.gridDensity;for(let i=0;i<=nL;i++){const yv=yR[0]+(i/nL)*(yR[1]-yR[0]);ctx.strokeStyle=COLOR_Z_GRID_HORZ;ctx.beginPath();const ps=mapToCanvasCoords(xR[0],yv,planeParams),pe=mapToCanvasCoords(xR[1],yv,planeParams);ctx.moveTo(ps.x,ps.y);ctx.lineTo(pe.x,pe.y);ctx.stroke();}for(let i=0;i<=nL;i++){const xv=xR[0]+(i/nL)*(xR[1]-xR[0]);ctx.strokeStyle=(state.currentFunction==='zeta'&&!state.zetaContinuationEnabled&&xv<=ZETA_REFLECTION_POINT_RE)?COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION:COLOR_Z_GRID_VERT;ctx.beginPath();const ps=mapToCanvasCoords(xv,yR[0],planeParams),pe=mapToCanvasCoords(xv,yR[1],planeParams);ctx.moveTo(ps.x,ps.y);ctx.lineTo(pe.x,pe.y);ctx.stroke();}}else if (inputShapeToDraw === 'grid_polar') {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: xR, currentVisYRange: yR } = planeParams;const maxR = Math.max(Math.abs(xR[0]), Math.abs(xR[1]), Math.abs(yR[0]), Math.abs(yR[1]), 0.1);const numRadialLines = state.gridDensity;const numAngularLines = Math.max(4, state.gridDensity); ctx.strokeStyle = COLOR_POLAR_ANGULAR;for (let i = 0; i < numAngularLines; i++) {const angle = (i / numAngularLines) * 2 * Math.PI;ctx.beginPath();const start = mapToCanvasCoords(0, 0, planeParams); const end = mapToCanvasCoords(maxR * Math.cos(angle), maxR * Math.sin(angle), planeParams);ctx.moveTo(start.x, start.y);ctx.lineTo(end.x, end.y);ctx.stroke();}ctx.strokeStyle = COLOR_POLAR_RADIAL;for (let i = 1; i <= numRadialLines; i++) {const r_val = (i / numRadialLines) * maxR;ctx.beginPath();for (let j = 0; j <= NUM_POINTS_CURVE; j++) {const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;const p_canvas = mapToCanvasCoords(r_val * Math.cos(t), r_val * Math.sin(t), planeParams);if (j === 0) ctx.moveTo(p_canvas.x, p_canvas.y);else ctx.lineTo(p_canvas.x, p_canvas.y);}ctx.closePath();ctx.stroke();}} else if (inputShapeToDraw === 'grid_logpolar') {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: xR, currentVisYRange: yR } = planeParams;const maxRVis = Math.max(Math.abs(xR[0]), Math.abs(xR[1]), Math.abs(yR[0]), Math.abs(yR[1]), 0.1);const minRVis = 0.05; const maxLogR = Math.log(maxRVis);const minLogR = Math.log(minRVis);const numLogRadialSteps = state.gridDensity;const numAngularLines = Math.max(4, state.gridDensity);ctx.strokeStyle = COLOR_LOGPOLAR_ANGULAR;for (let i = 0; i < numAngularLines; i++) {const angle = (i / numAngularLines) * 2 * Math.PI;ctx.beginPath();const start = mapToCanvasCoords(minRVis * Math.cos(angle), minRVis * Math.sin(angle), planeParams);const end = mapToCanvasCoords(maxRVis * Math.cos(angle), maxRVis * Math.sin(angle), planeParams);ctx.moveTo(start.x, start.y);ctx.lineTo(end.x, end.y);ctx.stroke();}ctx.strokeStyle = COLOR_LOGPOLAR_EXP_R;for (let i = 0; i <= numLogRadialSteps; i++) {const logR = minLogR + (i / numLogRadialSteps) * (maxLogR - minLogR);const r_val = Math.exp(logR);if (r_val > maxRVis * 1.1) continue; ctx.beginPath();for (let j = 0; j <= NUM_POINTS_CURVE; j++) {const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;const p_canvas = mapToCanvasCoords(r_val * Math.cos(t), r_val * Math.sin(t), planeParams);if (j === 0) ctx.moveTo(p_canvas.x, p_canvas.y);else ctx.lineTo(p_canvas.x, p_canvas.y);}ctx.closePath();ctx.stroke();}} else if (inputShapeToDraw === 'empty_grid') {} else if (inputShapeToDraw === 'strip_horizontal') {
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLOR_STRIP_LINES;const { currentVisXRange: xR } = planeParams;const y1_c = mapToCanvasCoords(0, state.stripY1, planeParams).y;const y2_c = mapToCanvasCoords(0, state.stripY2, planeParams).y;const x_min_c = mapToCanvasCoords(xR[0], 0, planeParams).x;const x_max_c = mapToCanvasCoords(xR[1], 0, planeParams).x;ctx.beginPath(); ctx.moveTo(x_min_c, y1_c); ctx.lineTo(x_max_c, y1_c); ctx.stroke();ctx.beginPath(); ctx.moveTo(x_min_c, y2_c); ctx.lineTo(x_max_c, y2_c); ctx.stroke();} else if (inputShapeToDraw === 'sector_angular') {
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLOR_SECTOR_LINES;const angle1_rad = state.sectorAngle1 * Math.PI / 180;const angle2_rad = state.sectorAngle2 * Math.PI / 180;const rMin = state.sectorRMin;const rMax = state.sectorRMax;let p_c;ctx.beginPath();p_c = mapToCanvasCoords(rMin * Math.cos(angle1_rad), rMin * Math.sin(angle1_rad), planeParams);ctx.moveTo(p_c.x, p_c.y);p_c = mapToCanvasCoords(rMax * Math.cos(angle1_rad), rMax * Math.sin(angle1_rad), planeParams);ctx.lineTo(p_c.x, p_c.y);ctx.stroke();ctx.beginPath();p_c = mapToCanvasCoords(rMin * Math.cos(angle2_rad), rMin * Math.sin(angle2_rad), planeParams);ctx.moveTo(p_c.x, p_c.y);p_c = mapToCanvasCoords(rMax * Math.cos(angle2_rad), rMax * Math.sin(angle2_rad), planeParams);ctx.lineTo(p_c.x, p_c.y);ctx.stroke();const N_ARC_POINTS = Math.max(10, NUM_POINTS_CURVE / 8);ctx.beginPath();for (let i = 0; i <= N_ARC_POINTS; i++) { const angle = angle1_rad + (i / N_ARC_POINTS) * (angle2_rad - angle1_rad);p_c = mapToCanvasCoords(rMin * Math.cos(angle), rMin * Math.sin(angle), planeParams);if (i === 0) ctx.moveTo(p_c.x, p_c.y); else ctx.lineTo(p_c.x, p_c.y);}ctx.stroke();ctx.beginPath();for (let i = 0; i <= N_ARC_POINTS; i++) {const angle = angle1_rad + (i / N_ARC_POINTS) * (angle2_rad - angle1_rad);p_c = mapToCanvasCoords(rMax * Math.cos(angle), rMax * Math.sin(angle), planeParams);if (i === 0) ctx.moveTo(p_c.x, p_c.y); else ctx.lineTo(p_c.x, p_c.y);}ctx.stroke();} else if(inputShapeToDraw==='line'){
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle=COLOR_INPUT_SHAPE_Z; ctx.beginPath();const yb0c=mapToCanvasCoords(0,scY,planeParams).y,xminc=mapToCanvasCoords(planeParams.currentVisXRange[0],scY,planeParams).x,xmaxc=mapToCanvasCoords(planeParams.currentVisXRange[1],scY,planeParams).x;ctx.moveTo(xminc,yb0c);ctx.lineTo(xmaxc,yb0c);ctx.stroke();ctx.strokeStyle=COLOR_INPUT_LINE_IM_Z; ctx.beginPath();const xa0c=mapToCanvasCoords(scX,0,planeParams).x,yminc=mapToCanvasCoords(scX,planeParams.currentVisYRange[0],planeParams).y,ymaxc=mapToCanvasCoords(scX,planeParams.currentVisYRange[1],planeParams).y;ctx.moveTo(xa0c,yminc);ctx.lineTo(xa0c,ymaxc);ctx.stroke();} else{ ctx.beginPath();let fPt=true;const getPts=(s)=>{let p=[];if(s==='circle'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;p.push({x:scX+radiusToUse*Math.cos(t),y:scY+radiusToUse*Math.sin(t)});}}else if(s==='ellipse'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;p.push({x:scX+state.ellipseA*Math.cos(t),y:scY+state.ellipseB*Math.sin(t)});}}else if(s==='hyperbola'){const UM=2.5;for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;p.push({x:scX+state.hyperbolaA*cosh(u),y:scY+state.hyperbolaB*sinh(u)});}p.push(null);for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;p.push({x:scX-state.hyperbolaA*cosh(u),y:scY+state.hyperbolaB*sinh(u)});}}return p;};getPts(inputShapeToDraw).forEach(pt=>{if(!pt){ctx.stroke();ctx.beginPath();fPt=true;return;}const p_canvas=mapToCanvasCoords(pt.x,pt.y,planeParams);if(fPt){ctx.moveTo(p_canvas.x,p_canvas.y);fPt=false;}else{ctx.lineTo(p_canvas.x,p_canvas.y);}});ctx.stroke();}
    if (state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare') {
        drawRadialDiscreteSteps(ctx, planeParams, state.currentFunction, state.radialDiscreteStepsCount);
    }
ctx.restore();}

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
function calculateDynamicPointsForSegment(p1_world, p2_world, tf) {const v_re = p2_world.re - p1_world.re;const v_im = p2_world.im - p1_world.im;const pole_to_p1_re = p1_world.re - ZETA_POLE.re;const pole_to_p1_im = p1_world.im - ZETA_POLE.im;let eval_point_for_tf;const dot_v_v = v_re * v_re + v_im * v_im;if (Math.abs(dot_v_v) < 1e-12) {eval_point_for_tf = p1_world;} else {const t_closest_line = -(pole_to_p1_re * v_re + pole_to_p1_im * v_im) / dot_v_v;eval_point_for_tf = {re: p1_world.re + t_closest_line * v_re,im: p1_world.im + t_closest_line * v_im};}if (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled &&((p1_world.re <= ZETA_REFLECTION_POINT_RE && p2_world.re <= ZETA_REFLECTION_POINT_RE) || eval_point_for_tf.re <= ZETA_REFLECTION_POINT_RE)) {return MIN_POINTS_ADAPTIVE;}if (Math.abs(eval_point_for_tf.re - ZETA_POLE.re) < 1e-9 && Math.abs(eval_point_for_tf.im - ZETA_POLE.im) < 1e-9) {eval_point_for_tf = { re: ZETA_POLE.re + 1e-7, im: ZETA_POLE.im + 1e-7 };}let w_at_eval_point = tf(eval_point_for_tf.re, eval_point_for_tf.im);if (isNaN(w_at_eval_point.re) || isNaN(w_at_eval_point.im) ||!isFinite(w_at_eval_point.re) || !isFinite(w_at_eval_point.im)) {return MAX_POINTS_ADAPTIVE_DEFAULT;}const diameter_estimate = Math.sqrt(w_at_eval_point.re * w_at_eval_point.re + w_at_eval_point.im * w_at_eval_point.im);let num_points = Math.round(ADAPTIVE_ANCHOR_DENSITY * diameter_estimate);num_points = Math.min(MAX_POINTS_ADAPTIVE_DEFAULT, Math.max(MIN_POINTS_ADAPTIVE, num_points));return num_points;}


function drawTransformedCartesianGrid(ctx, planeParams, tf) {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: zxR, currentVisYRange: zyR } = zPlaneParams; 
    const nL = state.gridDensity;

    if (state.currentFunction === 'zeta' && state.zetaContinuationEnabled) {
        for (let i = 0; i <= nL; ++i) {
            const y_val = zyR[0] + (i / nL) * (zyR[1] - zyR[0]);
            let zlp_direct = [], zlp_reflected = [];
            const directStartRe = ZETA_REFLECTION_POINT_RE; 
            const directEndRe = zxR[1];
            if (directStartRe < directEndRe) {
                let ptsCount = calculateDynamicPointsForSegment({re: directStartRe, im: y_val}, {re: directEndRe, im: y_val}, tf);
                for (let j = 0; j <= ptsCount; ++j) zlp_direct.push({ re: directStartRe + (j / ptsCount) * (directEndRe - directStartRe), im: y_val });
                drawPlanarTransformedLine(ctx, planeParams, tf, zlp_direct, COLOR_Z_GRID_HORZ);
            }
            const reflectedStartRe = zxR[0];
            const reflectedEndRe = ZETA_REFLECTION_POINT_RE;
             if (reflectedStartRe < reflectedEndRe) {
                let ptsCount = calculateDynamicPointsForSegment({re: reflectedStartRe, im: y_val}, {re: reflectedEndRe, im: y_val}, tf);
                for (let j = 0; j <= ptsCount; ++j) zlp_reflected.push({ re: reflectedStartRe + (j / ptsCount) * (reflectedEndRe - reflectedStartRe), im: y_val });
                drawPlanarTransformedLine(ctx, planeParams, tf, zlp_reflected, COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ);
            }
        }
        for (let i = 0; i <= nL; ++i) {
            const x_val = zxR[0] + (i / nL) * (zxR[1] - zxR[0]);
            let zlp = [];
            let ptsCount = calculateDynamicPointsForSegment({re: x_val, im: zyR[0]}, {re: x_val, im: zyR[1]}, tf);
            for (let j = 0; j <= ptsCount; ++j) zlp.push({ re: x_val, im: zyR[0] + (j / ptsCount) * (zyR[1] - zyR[0]) });
            const lineColor = (x_val < ZETA_REFLECTION_POINT_RE) ? COLOR_Z_GRID_VERT_FUNCTIONAL_EQ : COLOR_Z_GRID_VERT;
            drawPlanarTransformedLine(ctx, planeParams, tf, zlp, lineColor);
        }

    } else { 
        for (let i = 0; i <= nL; ++i) { 
            const yv = zyR[0] + (i / nL) * (zyR[1] - zyR[0]);
            let zlp = [];
            let pointsForThisLine = (state.currentFunction === 'zeta') ? calculateDynamicPointsForSegment({ re: zxR[0], im: yv }, { re: zxR[1], im: yv }, tf) : DEFAULT_POINTS_PER_LINE;
            for (let j = 0; j <= pointsForThisLine; ++j) zlp.push({ re: zxR[0] + (j / pointsForThisLine) * (zxR[1] - zxR[0]), im: yv });
            drawPlanarTransformedLine(ctx, planeParams, tf, zlp, COLOR_Z_GRID_HORZ);
        }
        for (let i = 0; i <= nL; ++i) { 
            const xv = zxR[0] + (i / nL) * (zxR[1] - zxR[0]);
            let zlp = [];
            let pointsForThisLine = (state.currentFunction === 'zeta') ? calculateDynamicPointsForSegment({ re: xv, im: zyR[0] }, { re: xv, im: zyR[1] }, tf) : DEFAULT_POINTS_PER_LINE;
            let vertLineColor = (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled && xv <= ZETA_REFLECTION_POINT_RE) ? COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION : COLOR_Z_GRID_VERT;
            for (let j = 0; j <= pointsForThisLine; ++j) zlp.push({ re: xv, im: zyR[0] + (j / pointsForThisLine) * (zyR[1] - zyR[0]) });
            drawPlanarTransformedLine(ctx, planeParams, tf, zlp, vertLineColor);
        }
    }
}

function drawTransformedPolarGrid(ctx, planeParams, tf) {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: zxR, currentVisYRange: zyR } = zPlaneParams;
    const maxR_input = Math.max(Math.abs(zxR[0]), Math.abs(zxR[1]), Math.abs(zyR[0]), Math.abs(zyR[1]), 0.1);
    const numRadialLines = state.gridDensity;
    const numAngularLines = Math.max(4, state.gridDensity);

    for (let i = 0; i < numAngularLines; i++) { 
        const angle = (i / numAngularLines) * 2 * Math.PI;
        let zlp = [];
        for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; j++) {
            const r_val = (j / DEFAULT_POINTS_PER_LINE) * maxR_input;
            zlp.push({ re: r_val * Math.cos(angle), im: r_val * Math.sin(angle) });
        }
        drawPlanarTransformedLine(ctx, planeParams, tf, zlp, COLOR_POLAR_ANGULAR);
    }
    for (let i = 1; i <= numRadialLines; i++) { 
        const r = (i / numRadialLines) * maxR_input;
        let zlp = [];
        for (let j = 0; j <= NUM_POINTS_CURVE; j++) {
            const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;
            zlp.push({ re: r * Math.cos(t), im: r * Math.sin(t) });
        }
        drawPlanarTransformedLine(ctx, planeParams, tf, zlp, COLOR_POLAR_RADIAL);
    }
}

function drawTransformedLogPolarGrid(ctx, planeParams, tf) {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: zxR, currentVisYRange: zyR } = zPlaneParams;
    const maxR_input = Math.max(Math.abs(zxR[0]), Math.abs(zxR[1]), Math.abs(zyR[0]), Math.abs(zyR[1]), 0.1);
    const minR_input = 0.05; 
    const maxLogR_input = Math.log(maxR_input);
    const minLogR_input = Math.log(minR_input);
    const numLogRadialSteps = state.gridDensity;
    const numAngularLines = Math.max(4, state.gridDensity);

    for (let i = 0; i < numAngularLines; i++) { 
        const angle = (i / numAngularLines) * 2 * Math.PI;
        let zlp = [];
        for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; j++) {
             const logR_val = minLogR_input + (j/DEFAULT_POINTS_PER_LINE) * (maxLogR_input - minLogR_input);
             const r_val = Math.exp(logR_val);
             if (r_val > maxR_input * 1.1) continue; 
             zlp.push({ re: r_val * Math.cos(angle), im: r_val * Math.sin(angle) });
        }
        if (zlp.length === 0 && DEFAULT_POINTS_PER_LINE > 0) { 
            zlp.push({re: minR_input * Math.cos(angle), im: minR_input * Math.sin(angle)});
            zlp.push({re: maxR_input * Math.cos(angle), im: maxR_input * Math.sin(angle)});
        }
        drawPlanarTransformedLine(ctx, planeParams, tf, zlp, COLOR_LOGPOLAR_ANGULAR);
    }
    for (let i = 0; i <= numLogRadialSteps; i++) { 
        const logR = minLogR_input + (i / numLogRadialSteps) * (maxLogR_input - minLogR_input);
        const r = Math.exp(logR);
        if (r > maxR_input * 1.1) continue;
        let zlp = [];
        for (let j = 0; j <= NUM_POINTS_CURVE; j++) {
            const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;
            zlp.push({ re: r * Math.cos(t), im: r * Math.sin(t) });
        }
        drawPlanarTransformedLine(ctx, planeParams, tf, zlp, COLOR_LOGPOLAR_EXP_R);
    }
}

function drawTransformedStripHorizontal(ctx, planeParams, tf) {
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const { currentVisXRange: zxR } = zPlaneParams;
    let zlp1 = [], zlp2 = [];
    for(let i=0; i<=NUM_POINTS_CURVE; ++i) {
        const x_val = zxR[0] + i * (zxR[1] - zxR[0]) / NUM_POINTS_CURVE;
        zlp1.push({re: x_val, im: state.stripY1});
        zlp2.push({re: x_val, im: state.stripY2});
    }
    drawPlanarTransformedLine(ctx, planeParams, tf, zlp1, COLOR_STRIP_LINES);
    drawPlanarTransformedLine(ctx, planeParams, tf, zlp2, COLOR_STRIP_LINES);
}

function drawTransformedSectorAngular(ctx, planeParams, tf) {
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const angle1_rad = state.sectorAngle1 * Math.PI / 180;
    const angle2_rad = state.sectorAngle2 * Math.PI / 180;
    const rMin = state.sectorRMin;
    const rMax = state.sectorRMax;
    const N_LINE_POINTS = NUM_POINTS_CURVE / 2;
    const N_ARC_POINTS = NUM_POINTS_CURVE / 4;

    let zlp_rad1 = [], zlp_rad2 = [], zlp_arc_min = [], zlp_arc_max = [];
    for(let i=0; i<=N_LINE_POINTS; ++i) { const r = rMin + i * (rMax - rMin) / N_LINE_POINTS; zlp_rad1.push({re: r * Math.cos(angle1_rad), im: r * Math.sin(angle1_rad)}); }
    for(let i=0; i<=N_LINE_POINTS; ++i) { const r = rMin + i * (rMax - rMin) / N_LINE_POINTS; zlp_rad2.push({re: r * Math.cos(angle2_rad), im: r * Math.sin(angle2_rad)}); }
    for(let i=0; i<=N_ARC_POINTS; ++i) { const a = angle1_rad + i * (angle2_rad - angle1_rad) / N_ARC_POINTS; zlp_arc_min.push({re: rMin * Math.cos(a), im: rMin * Math.sin(a)}); }
    for(let i=0; i<=N_ARC_POINTS; ++i) { const a = angle1_rad + i * (angle2_rad - angle1_rad) / N_ARC_POINTS; zlp_arc_max.push({re: rMax * Math.cos(a), im: rMax * Math.sin(a)}); }

    drawPlanarTransformedLine(ctx, planeParams, tf, zlp_rad1, COLOR_SECTOR_LINES);
    drawPlanarTransformedLine(ctx, planeParams, tf, zlp_rad2, COLOR_SECTOR_LINES);
    drawPlanarTransformedLine(ctx, planeParams, tf, zlp_arc_min, COLOR_SECTOR_LINES);
    drawPlanarTransformedLine(ctx, planeParams, tf, zlp_arc_max, COLOR_SECTOR_LINES);
}

function drawTransformedLinesFixedReIm(ctx, planeParams, tf) {
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const scX = state.a0, scY = state.b0;
    if((state.currentFunction==='cos'||state.currentFunction==='sin')){ctx.save();ctx.fillStyle=COLOR_FOCI;const f1c=mapToCanvasCoords(1,0,planeParams),f2c=mapToCanvasCoords(-1,0,planeParams);ctx.beginPath();ctx.arc(f1c.x,f1c.y,4,0,2*Math.PI);ctx.fill();ctx.beginPath();ctx.arc(f2c.x,f2c.y,4,0,2*Math.PI);ctx.fill();ctx.font="10px 'SF Pro Text',sans-serif";ctx.textAlign="center";ctx.fillStyle=COLOR_TEXT_ON_CANVAS;ctx.fillText("Foci: ±1",planeParams.origin.x,f1c.y+(f1c.y<20?15:-10));ctx.restore();}

    let hz_pts=[]; for(let i=0;i<=NUM_POINTS_CURVE;++i)hz_pts.push({re:zPlaneParams.currentVisXRange[0]+i*(zPlaneParams.currentVisXRange[1]-zPlaneParams.currentVisXRange[0])/NUM_POINTS_CURVE,im:scY});
    drawPlanarTransformedLine(ctx,planeParams,tf,hz_pts,COLOR_INPUT_SHAPE_Z);
    let vz_pts=[]; for(let i=0;i<=NUM_POINTS_CURVE;++i)vz_pts.push({re:scX,im:zPlaneParams.currentVisYRange[0]+i*(zPlaneParams.currentVisYRange[1]-zPlaneParams.currentVisYRange[0])/NUM_POINTS_CURVE});
    drawPlanarTransformedLine(ctx,planeParams,tf,vz_pts,COLOR_INPUT_LINE_IM_Z);
}

function drawTransformedGeometricShape(ctx, planeParams, tf, shapeType, baseColor) {
    const scX = state.a0, scY = state.b0;
    const radiusToUse = state.circleR;
    let z_pts=[];
    if(shapeType==='circle'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;z_pts.push({re:scX+radiusToUse*Math.cos(t),im:scY+radiusToUse*Math.sin(t)});}}
    else if(shapeType==='ellipse'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;z_pts.push({re:scX+state.ellipseA*Math.cos(t),im:scY+state.ellipseB*Math.sin(t)});}}
    else if(shapeType==='hyperbola'){const UM=2.5;for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;z_pts.push({re:scX+state.hyperbolaA*cosh(u),im:scY+state.hyperbolaB*sinh(u)});}z_pts.push(null); for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;z_pts.push({re:scX-state.hyperbolaA*cosh(u),im:scY+state.hyperbolaB*sinh(u)});}}
    drawPlanarTransformedLine(ctx,planeParams,tf,z_pts,baseColor);
}

function drawPlanarTransformedShape(ctx, planeParams, tf) {
    ctx.save();
    const inputShape = state.currentInputShape;
    ctx.lineWidth = (state.cauchyIntegralModeEnabled && (inputShape === 'circle' || inputShape === 'ellipse')) ? 3.5 : 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let baseColor = (state.cauchyIntegralModeEnabled && (inputShape === 'circle' || inputShape === 'ellipse')) ? COLOR_CAUCHY_CONTOUR_W : COLOR_INPUT_SHAPE_Z;

    if (inputShape === 'grid_cartesian') drawTransformedCartesianGrid(ctx, planeParams, tf);
    else if (inputShape === 'grid_polar') drawTransformedPolarGrid(ctx, planeParams, tf);
    else if (inputShape === 'grid_logpolar') drawTransformedLogPolarGrid(ctx, planeParams, tf);
    else if (inputShape === 'empty_grid') { }
    else if (inputShape === 'strip_horizontal') drawTransformedStripHorizontal(ctx, planeParams, tf);
    else if (inputShape === 'sector_angular') drawTransformedSectorAngular(ctx, planeParams, tf);
    else if (inputShape === 'line') drawTransformedLinesFixedReIm(ctx, planeParams, tf);
    else if (['circle', 'ellipse', 'hyperbola'].includes(inputShape)) {
        drawTransformedGeometricShape(ctx, planeParams, tf, inputShape, baseColor);
    }
    ctx.restore();
}

function drawPlanarTaylorApproximation(ctx, wPlaneParamsOriginal, originalFuncKey, taylorCenter, taylorOrder, axisColorX, axisColorY) {
    drawTaylorAxes(ctx, wPlaneParamsOriginal, axisColorX, axisColorY, "Re(w_approx)", "Im(w_approx)");

    const taylorApproxFunc = (re, im) => {
        const zInputComplex = new Complex(re, im);
        const z0Complex = new Complex(taylorCenter.re, taylorCenter.im);
        const result = calculateTaylorApproximation(originalFuncKey, zInputComplex, z0Complex, taylorOrder);
        return {re: result.real, im: result.imag}; 
    };

    ctx.save();
    ctx.lineWidth = 1.5; 
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const inputShape = state.currentInputShape;
    const { currentVisXRange: zxR_source, currentVisYRange: zyR_source } = zPlaneParams; 
    const nL_source = state.gridDensity;
    const scX_source = state.a0;
    const scY_source = state.b0;
    const radiusToUse_source = state.circleR;

    if (inputShape === 'grid_cartesian') {
        for (let i = 0; i <= nL_source; ++i) {
            const yv = zyR_source[0] + (i / nL_source) * (zyR_source[1] - zyR_source[0]);
            let z_points_horizontal = [];
            for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; ++j) z_points_horizontal.push({ re: zxR_source[0] + (j / DEFAULT_POINTS_PER_LINE) * (zxR_source[1] - zxR_source[0]), im: yv });
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, z_points_horizontal, axisColorY); 
        }
        for (let i = 0; i <= nL_source; ++i) {
            const xv = zxR_source[0] + (i / nL_source) * (zxR_source[1] - zxR_source[0]);
            let z_points_vertical = [];
            for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; ++j) z_points_vertical.push({ re: xv, im: zyR_source[0] + (j / DEFAULT_POINTS_PER_LINE) * (zyR_source[1] - zyR_source[0]) });
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, z_points_vertical, axisColorX); 
        }
    } else if (inputShape === 'grid_polar') {
        const maxR_input_source = Math.max(Math.abs(zxR_source[0]), Math.abs(zxR_source[1]), Math.abs(zyR_source[0]), Math.abs(zyR_source[1]), 0.1);
        const numRadialLines_source = nL_source;
        const numAngularLines_source = Math.max(4, nL_source);
        for (let i = 0; i < numAngularLines_source; i++) {
            const angle = (i / numAngularLines_source) * 2 * Math.PI;
            let zlp = [];
            for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; j++) {
                const r_val = (j / DEFAULT_POINTS_PER_LINE) * maxR_input_source;
                zlp.push({ re: r_val * Math.cos(angle), im: r_val * Math.sin(angle) });
            }
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp, axisColorY); 
        }
        for (let i = 1; i <= numRadialLines_source; i++) {
            const r = (i / numRadialLines_source) * maxR_input_source;
            let zlp = [];
            for (let j = 0; j <= NUM_POINTS_CURVE; j++) {
                const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;
                zlp.push({ re: r * Math.cos(t), im: r * Math.sin(t) });
            }
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp, axisColorX); 
        }
    } else if (inputShape === 'grid_logpolar') {
        const maxR_input_source = Math.max(Math.abs(zxR_source[0]), Math.abs(zxR_source[1]), Math.abs(zyR_source[0]), Math.abs(zyR_source[1]), 0.1);
        const minR_input_source = 0.05;
        const maxLogR_input_source = Math.log(maxR_input_source);
        const minLogR_input_source = Math.log(minR_input_source);
        const numLogRadialSteps_source = nL_source;
        const numAngularLines_source = Math.max(4, nL_source);
        for (let i = 0; i < numAngularLines_source; i++) {
            const angle = (i / numAngularLines_source) * 2 * Math.PI;
            let zlp = [];
            for (let j = 0; j <= DEFAULT_POINTS_PER_LINE; j++) {
                 const logR_val = minLogR_input_source + (j/DEFAULT_POINTS_PER_LINE) * (maxLogR_input_source - minLogR_input_source);
                 const r_val = Math.exp(logR_val);
                 if (r_val > maxR_input_source * 1.1) continue;
                 zlp.push({ re: r_val * Math.cos(angle), im: r_val * Math.sin(angle) });
            }
            if (zlp.length === 0 && DEFAULT_POINTS_PER_LINE > 0) { zlp.push({re: minR_input_source * Math.cos(angle), im: minR_input_source * Math.sin(angle)}); zlp.push({re: maxR_input_source * Math.cos(angle), im: maxR_input_source * Math.sin(angle)}); }
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp, axisColorY); 
        }
        for (let i = 0; i <= numLogRadialSteps_source; i++) {
            const logR = minLogR_input_source + (i / numLogRadialSteps_source) * (maxLogR_input_source - minLogR_input_source);
            const r = Math.exp(logR);
            if (r > maxR_input_source * 1.1) continue;
            let zlp = [];
            for (let j = 0; j <= NUM_POINTS_CURVE; j++) {
                const t = (j / NUM_POINTS_CURVE) * 2 * Math.PI;
                zlp.push({ re: r * Math.cos(t), im: r * Math.sin(t) });
            }
            drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp, axisColorX); 
        }
    } else if (inputShape === 'line') {
        let hz_pts=[]; for(let i=0;i<=NUM_POINTS_CURVE;++i)hz_pts.push({re:zxR_source[0]+i*(zxR_source[1]-zxR_source[0])/NUM_POINTS_CURVE,im:scY_source});
        drawPlanarTransformedLine(ctx,wPlaneParamsOriginal,taylorApproxFunc,hz_pts,axisColorY); 
        let vz_pts=[]; for(let i=0;i<=NUM_POINTS_CURVE;++i)vz_pts.push({re:scX_source,im:zyR_source[0]+i*(zyR_source[1]-zyR_source[0])/NUM_POINTS_CURVE});
        drawPlanarTransformedLine(ctx,wPlaneParamsOriginal,taylorApproxFunc,vz_pts,axisColorX); 
    } else if (['circle', 'ellipse', 'hyperbola'].includes(inputShape)) {
        let z_pts=[];
        if(inputShape==='circle'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;z_pts.push({re:scX_source+radiusToUse_source*Math.cos(t),im:scY_source+radiusToUse_source*Math.sin(t)});}}
        else if(inputShape==='ellipse'){for(let i=0;i<=NUM_POINTS_CURVE;++i){const t=(i/NUM_POINTS_CURVE)*2*Math.PI;z_pts.push({re:scX_source+state.ellipseA*Math.cos(t),im:scY_source+state.ellipseB*Math.sin(t)});}}
        else if(inputShape==='hyperbola'){const UM=2.5;for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;z_pts.push({re:scX_source+state.hyperbolaA*cosh(u),im:scY_source+state.hyperbolaB*sinh(u)});}z_pts.push(null); for(let i=0;i<=NUM_POINTS_CURVE/2;++i){const u=(i/(NUM_POINTS_CURVE/2))*UM-UM/2;z_pts.push({re:scX_source-state.hyperbolaA*cosh(u),im:scY_source+state.hyperbolaB*sinh(u)});}}
        drawPlanarTransformedLine(ctx,wPlaneParamsOriginal,taylorApproxFunc,z_pts, axisColorX); 
    } else if (inputShape === 'strip_horizontal') {
        let zlp1 = [], zlp2 = [];
        for(let i=0; i<=NUM_POINTS_CURVE; ++i) { const x_val = zxR_source[0] + i * (zxR_source[1] - zxR_source[0]) / NUM_POINTS_CURVE; zlp1.push({re: x_val, im: state.stripY1}); zlp2.push({re: x_val, im: state.stripY2});}
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp1, axisColorY);
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp2, axisColorY);
    } else if (inputShape === 'sector_angular') {
        const angle1_rad_source = state.sectorAngle1 * Math.PI / 180; const angle2_rad_source = state.sectorAngle2 * Math.PI / 180;
        const rMin_source = state.sectorRMin; const rMax_source = state.sectorRMax;
        const N_LINE_POINTS = NUM_POINTS_CURVE / 2; const N_ARC_POINTS = NUM_POINTS_CURVE / 4;
        let zlp_rad1 = [], zlp_rad2 = [], zlp_arc_min = [], zlp_arc_max = [];
        for(let i=0; i<=N_LINE_POINTS; ++i) { const r = rMin_source + i * (rMax_source - rMin_source) / N_LINE_POINTS; zlp_rad1.push({re: r * Math.cos(angle1_rad_source), im: r * Math.sin(angle1_rad_source)}); }
        for(let i=0; i<=N_LINE_POINTS; ++i) { const r = rMin_source + i * (rMax_source - rMin_source) / N_LINE_POINTS; zlp_rad2.push({re: r * Math.cos(angle2_rad_source), im: r * Math.sin(angle2_rad_source)}); }
        for(let i=0; i<=N_ARC_POINTS; ++i) { const a = angle1_rad_source + i * (angle2_rad_source - angle1_rad_source) / N_ARC_POINTS; zlp_arc_min.push({re: rMin_source * Math.cos(a), im: rMin_source * Math.sin(a)}); }
        for(let i=0; i<=N_ARC_POINTS; ++i) { const a = angle1_rad_source + i * (angle2_rad_source - angle1_rad_source) / N_ARC_POINTS; zlp_arc_max.push({re: rMax_source * Math.cos(a), im: rMax_source * Math.sin(a)}); }
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp_rad1, axisColorX); 
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp_rad2, axisColorX); 
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp_arc_min, axisColorY); 
        drawPlanarTransformedLine(ctx, wPlaneParamsOriginal, taylorApproxFunc, zlp_arc_max, axisColorY); 
    } else if (inputShape === 'empty_grid') {
        
    }
    ctx.restore();
}


function drawPlanarTransformedProbe(ctx,planeParams,tf){
    let effectiveTransformFunc = tf;
    if (state.taylorSeriesEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        effectiveTransformFunc = (re, im) => {
            const zInputComplex = new Complex(re, im);
            const z0Complex = new Complex(state.taylorSeriesCenter.re, state.taylorSeriesCenter.im);
            const result = calculateTaylorApproximation(state.currentFunction, zInputComplex, z0Complex, state.taylorSeriesOrder);
            return {re: result.real, im: result.imag }; 
        };
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

function drawZPlaneVectorField(ctx, planeParams, baseFunc, vectorFuncType) {
    const { currentVisXRange: xR, currentVisYRange: yR } = planeParams;
    const density = Math.max(5, Math.min(25, Math.floor(state.gridDensity * 0.75)));
    const dx = (xR[1] - xR[0]) / density;
    const dy = (yR[1] - yR[0]) / density;
    

    for (let i = 0; i <= density; i++) {
        const z_re = xR[0] + i * dx;
        for (let j = 0; j <= density; j++) {
            const z_im = yR[0] + j * dy;
            const z = { re: z_re, im: z_im };
            let vectorVal;

            if (vectorFuncType === 'f(z)') {
                vectorVal = baseFunc(z.re, z.im, state); 
            } else if (vectorFuncType === '1/f(z)') {
                const f_of_z = baseFunc(z.re, z.im, state); 
                if (Math.abs(f_of_z.re) < 1e-9 && Math.abs(f_of_z.im) < 1e-9) {
                    vectorVal = { re: Infinity, im: Infinity }; 
                } else {
                    vectorVal = complexReciprocal(f_of_z.re, f_of_z.im);
                }
            } else if (vectorFuncType === "f'(z)") {
                vectorVal = numericDerivative(state.currentFunction, z, state); 
            } else {
                vectorVal = { re: 0, im: 0 };
            }

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
