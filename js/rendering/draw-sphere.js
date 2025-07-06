function drawRiemannSphereBase(ctx,cSP,cDOMP){const{centerX:cX,centerY:cY,radius:r}=cSP;ctx.save();ctx.strokeStyle=COLOR_SPHERE_OUTLINE;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cX,cY,r,0,2*Math.PI);ctx.stroke();ctx.restore();}

function drawMappedLineSetOnSphere(ctx, cSP, z_pts_src_arr, col, isWP, tf) {
    const { centerX: cX, centerY: cY, radius: r, rotX, rotY } = cSP;
    ctx.strokeStyle = col; 
    
    let baseLineWidth = isWP ? SPHERE_GRID_LINE_MAX_WIDTH_W : SPHERE_GRID_LINE_MAX_WIDTH_Z;
    if (!SPHERE_GRID_LINE_DEPTH_EFFECT) { 
        baseLineWidth = isWP ? 1.5 : 1.0;
    }
    ctx.lineWidth = baseLineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';


    z_pts_src_arr.forEach(z_pts_src => {
        if (!z_pts_src || z_pts_src.length === 0) return;
        ctx.beginPath();
        let firstVisiblePointInCurrentPath = true;
        let lastProjectedPoint = null; 

        for (const z_orig of z_pts_src) {
            if (!z_orig || z_orig.re === undefined || z_orig.im === undefined) { 
                if (lastProjectedPoint && lastProjectedPoint.isVisible && !firstVisiblePointInCurrentPath) {
                    ctx.stroke(); 
                }
                ctx.beginPath(); 
                firstVisiblePointInCurrentPath = true;
                lastProjectedPoint = null;
                continue;
            }

            let pointToTransform = z_orig;
            let transformedPoint;
            let skipDrawing = false;

            if (isWP) { 
                if (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled && pointToTransform.re <= ZETA_REFLECTION_POINT_RE) {
                    skipDrawing = true; 
                }
                 
                 
                transformedPoint = skipDrawing ? { re: NaN, im: NaN } : (tf ? tf(pointToTransform.re, pointToTransform.im) : pointToTransform);
            } else { 
                transformedPoint = pointToTransform; 
            }

            if (isNaN(transformedPoint.re) || isNaN(transformedPoint.im) || !isFinite(transformedPoint.re) || !isFinite(transformedPoint.im)) {
                if (lastProjectedPoint && lastProjectedPoint.isVisible && !firstVisiblePointInCurrentPath) {
                    ctx.stroke();
                }
                ctx.beginPath();
                firstVisiblePointInCurrentPath = true;
                lastProjectedPoint = null;
                continue;
            }

            const spherePoint = complexToSphere(transformedPoint.re, transformedPoint.im);
            const rotatedSpherePoint = rotate3D(spherePoint, rotX, rotY);
            const canvasPoint = projectSphereToCanvas2D(rotatedSpherePoint, cX, cY, r);
            
            const currentProjectedPoint = { ...canvasPoint, rotatedZ: rotatedSpherePoint.z };


            if (currentProjectedPoint.isVisible) {
                if (firstVisiblePointInCurrentPath || (lastProjectedPoint && !lastProjectedPoint.isVisible)) {
                    if (SPHERE_GRID_LINE_DEPTH_EFFECT) {
                        const depthFactor = Math.max(0, currentProjectedPoint.rotatedZ); 
                        const modulatedLineWidth = baseLineWidth * (0.4 + 0.6 * depthFactor); 
                        ctx.lineWidth = Math.max(0.5, modulatedLineWidth); 
                    } else {
                        ctx.lineWidth = baseLineWidth;
                    }
                    ctx.moveTo(currentProjectedPoint.x, currentProjectedPoint.y);
                    if (firstVisiblePointInCurrentPath) firstVisiblePointInCurrentPath = false;
                } else {
                    ctx.lineTo(currentProjectedPoint.x, currentProjectedPoint.y);
                }
            } else { 
                if (lastProjectedPoint && lastProjectedPoint.isVisible && !firstVisiblePointInCurrentPath) { 
                    
                    ctx.lineTo(currentProjectedPoint.x, currentProjectedPoint.y); 
                    ctx.stroke();
                    ctx.beginPath(); 
                    firstVisiblePointInCurrentPath = true;
                }
            }
            lastProjectedPoint = currentProjectedPoint;
        }
        if (lastProjectedPoint && lastProjectedPoint.isVisible && !firstVisiblePointInCurrentPath) {
            ctx.stroke(); 
        }
    });
}


function getSphereSourcePoints(inputShape, zPlaneParams, sphereCenterRe, sphereCenterIm, sphereRadius) {
    const { currentVisXRange: zxR_cv, currentVisYRange: zyR_cv } = zPlaneParams;
    const zpgd = state.gridDensity;
    const pps_other_shapes = NUM_POINTS_CURVE / 2; 
    let point_sets = []; 

    if (inputShape === 'grid_cartesian') {
        const nL = SPHERE_GRID_LINES; 
        const range = Math.max(5, sphereRadius * 2.5); 

        for(let i=0; i<=nL; i++) {
            const yv = sphereCenterIm - range/2 + (i/nL)*range;
            let lps = []; for(let j=0; j<=pps_other_shapes; j++) lps.push({re: sphereCenterRe - range/2 + (j/pps_other_shapes)*range, im:yv});
            point_sets.push({points:lps, color: COLOR_Z_GRID_HORZ}); 
        }
        for(let i=0; i<=nL; i++) {
            const xv = sphereCenterRe - range/2 + (i/nL)*range;
            let lps = []; for(let j=0; j<=pps_other_shapes; j++) lps.push({re:xv, im: sphereCenterIm - range/2 + (j/pps_other_shapes)*range});
            point_sets.push({points:lps, color: COLOR_Z_GRID_VERT});
        }
    } else if (inputShape === 'grid_polar') {
        const maxR_input = Math.max(Math.abs(zxR_cv[0]), Math.abs(zxR_cv[1]), Math.abs(zyR_cv[0]), Math.abs(zyR_cv[1]), 0.1);
        const numRadial = zpgd; const numAngular = Math.max(4, zpgd);
        for (let i = 0; i < numAngular; i++) {const a = (i / numAngular) * 2 * Math.PI; let pts = []; for (let j = 0; j <= pps_other_shapes; j++) pts.push({ re: (j / pps_other_shapes) * maxR_input * Math.cos(a), im: (j / pps_other_shapes) * maxR_input * Math.sin(a) }); point_sets.push({ points: pts, color: COLOR_POLAR_ANGULAR });}
        for (let i = 1; i <= numRadial; i++) {const r = (i / numRadial) * maxR_input; let pts = []; for (let j = 0; j <= pps_other_shapes; j++) { const t = (j / pps_other_shapes) * 2 * Math.PI; pts.push({ re: r * Math.cos(t), im: r * Math.sin(t) }); } point_sets.push({ points: pts, color: COLOR_POLAR_RADIAL });}
    } else if (inputShape === 'grid_logpolar') {
        const maxR_input = Math.max(Math.abs(zxR_cv[0]), Math.abs(zxR_cv[1]), Math.abs(zyR_cv[0]), Math.abs(zyR_cv[1]), 0.1); const minR_input = 0.05; const maxLogR = Math.log(maxR_input); const minLogR = Math.log(minR_input); const numLogRadial = zpgd; const numAngular = Math.max(4, zpgd);
        for (let i = 0; i < numAngular; i++) {const a = (i / numAngular) * 2 * Math.PI; let pts = []; for (let j = 0; j <= pps_other_shapes; j++) { const lr = minLogR + (j/pps_other_shapes) * (maxLogR - minLogR); pts.push({ re: Math.exp(lr) * Math.cos(a), im: Math.exp(lr) * Math.sin(a) });} point_sets.push({ points: pts, color: COLOR_LOGPOLAR_ANGULAR });}
        for (let i = 0; i <= numLogRadial; i++) {const lr = minLogR + (i / numLogRadial) * (maxLogR - minLogR); const r = Math.exp(lr); let pts = []; for (let j = 0; j <= pps_other_shapes; j++) { const t = (j / pps_other_shapes) * 2 * Math.PI; pts.push({ re: r * Math.cos(t), im: r * Math.sin(t) }); } point_sets.push({ points: pts, color: COLOR_LOGPOLAR_EXP_R });}
    } else if (inputShape === 'empty_grid') { }
    else if (inputShape === 'strip_horizontal') {let p1 = [], p2 = []; for(let i=0; i<=pps_other_shapes; ++i) { const x = zxR_cv[0] + i * (zxR_cv[1] - zxR_cv[0]) / pps_other_shapes; p1.push({re: x, im: state.stripY1}); p2.push({re: x, im: state.stripY2});} point_sets.push({points: p1, color: COLOR_STRIP_LINES}); point_sets.push({points: p2, color: COLOR_STRIP_LINES});}
    else if (inputShape === 'sector_angular') {const a1 = state.sectorAngle1 * Math.PI / 180, a2 = state.sectorAngle2 * Math.PI / 180; const rMin = state.sectorRMin, rMax = state.sectorRMax; let rd1=[], rd2=[], acMin=[], acMax=[]; for(let i=0; i<=pps_other_shapes/2; ++i) { rd1.push({re: (rMin + i*(rMax-rMin)/(pps_other_shapes/2)) * Math.cos(a1), im: (rMin + i*(rMax-rMin)/(pps_other_shapes/2)) * Math.sin(a1)}); } for(let i=0; i<=pps_other_shapes/2; ++i) { rd2.push({re: (rMin + i*(rMax-rMin)/(pps_other_shapes/2)) * Math.cos(a2), im: (rMin + i*(rMax-rMin)/(pps_other_shapes/2)) * Math.sin(a2)}); } for(let i=0; i<=pps_other_shapes/2; ++i) { const ang = a1 + i*(a2-a1)/(pps_other_shapes/2); acMin.push({re: rMin * Math.cos(ang), im: rMin * Math.sin(ang)}); } for(let i=0; i<=pps_other_shapes/2; ++i) { const ang = a1 + i*(a2-a1)/(pps_other_shapes/2); acMax.push({re: rMax * Math.cos(ang), im: rMax * Math.sin(ang)}); } point_sets.push({points:rd1, color: COLOR_SECTOR_LINES}); point_sets.push({points:rd2, color: COLOR_SECTOR_LINES}); point_sets.push({points:acMin, color: COLOR_SECTOR_LINES}); point_sets.push({points:acMax, color: COLOR_SECTOR_LINES});}
    else if (inputShape === 'line') {let hzp=[];for(let i=0;i<=pps_other_shapes;++i)hzp.push({re:zxR_cv[0]+i*(zxR_cv[1]-zxR_cv[0])/pps_other_shapes,im:state.b0}); point_sets.push({points:hzp,color:COLOR_INPUT_SHAPE_Z}); let vzp=[];for(let i=0;i<=pps_other_shapes;++i)vzp.push({re:state.a0,im:zyR_cv[0]+i*(zyR_cv[1]-zyR_cv[0])/pps_other_shapes}); point_sets.push({points:vzp,color:COLOR_INPUT_LINE_IM_Z});}
    else { 
        let spm=[], col = COLOR_INPUT_SHAPE_Z;
        if(inputShape==='circle'){for(let i=0;i<=pps_other_shapes;++i){const t=(i/pps_other_shapes)*2*Math.PI;spm.push({re:state.a0+state.circleR*Math.cos(t),im:state.b0+state.circleR*Math.sin(t)});}}
        else if(inputShape==='ellipse'){for(let i=0;i<=pps_other_shapes;++i){const t=(i/pps_other_shapes)*2*Math.PI;spm.push({re:state.a0+state.ellipseA*Math.cos(t),im:state.b0+state.ellipseB*Math.sin(t)});}}
        else if(inputShape==='hyperbola'){const UM=2.5; for(let i=0;i<=pps_other_shapes/2;++i){const u=(i/(pps_other_shapes/2))*UM-UM/2;spm.push({re:state.a0+state.hyperbolaA*cosh(u),im:state.b0+state.hyperbolaB*sinh(u)});} spm.push(null); for(let i=0;i<=pps_other_shapes/2;++i){const u=(i/(pps_other_shapes/2))*UM-UM/2;spm.push({re:state.a0-state.hyperbolaA*cosh(u),im:state.b0+state.hyperbolaB*sinh(u)});}}
        point_sets.push({points:spm, color:col});
    }
    return point_sets;
}

function drawSphereGridAndShape(ctx, cSP, cDOMP, isWP, tf = null) {
    const sphereCenterRe = (zPlaneParams.currentVisXRange[0] + zPlaneParams.currentVisXRange[1]) / 2;
    const sphereCenterIm = (zPlaneParams.currentVisYRange[0] + zPlaneParams.currentVisYRange[1]) / 2;
    const sphereRadius = Math.max(zPlaneParams.currentVisXRange[1]-sphereCenterRe, zPlaneParams.currentVisYRange[1]-sphereCenterIm);

    const sourcePointSets = getSphereSourcePoints(state.currentInputShape, zPlaneParams, sphereCenterRe, sphereCenterIm, sphereRadius);

    sourcePointSets.forEach(set => {
        let colorToUse = set.color;
        if (!isWP) { 
            colorToUse = COLOR_SPHERE_GRID; 
        } else { 
            if (state.currentFunction === 'zeta') {
                const avgRe = set.points.reduce((acc, p) => acc + (p ? p.re : 0), 0) / (set.points.filter(p=>p).length || 1) ;
                if (state.zetaContinuationEnabled && avgRe < ZETA_REFLECTION_POINT_RE) {
                     if (colorToUse === COLOR_Z_GRID_HORZ) colorToUse = COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ;
                     if (colorToUse === COLOR_Z_GRID_VERT) colorToUse = COLOR_Z_GRID_VERT_FUNCTIONAL_EQ;
                } else if (!state.zetaContinuationEnabled && avgRe <= ZETA_REFLECTION_POINT_RE && colorToUse === COLOR_Z_GRID_VERT) {
                     colorToUse = COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION;
                }
            }
        }
        
        drawMappedLineSetOnSphere(ctx, cSP, [set.points], colorToUse, isWP, isWP ? tf : null);
    });
}

function drawSphereProbeAndNeighborhood(ctx, cSP, sourceProbeZ, neighborhoodSize, transformFuncIfWSphere) {
    const isWSphere = typeof transformFuncIfWSphere === 'function';
    const centerToDisplayOnSphere = isWSphere ? transformFuncIfWSphere(sourceProbeZ.re, sourceProbeZ.im) : sourceProbeZ;

    if (isNaN(centerToDisplayOnSphere.re) || isNaN(centerToDisplayOnSphere.im) || !isFinite(centerToDisplayOnSphere.re) || !isFinite(centerToDisplayOnSphere.im)) {
        return; 
    }

    
    const p3d_center = complexToSphere(centerToDisplayOnSphere.re, centerToDisplayOnSphere.im);
    const p3d_rot_center = rotate3D(p3d_center, cSP.rotX, cSP.rotY);
    const p2d_canvas_center = projectSphereToCanvas2D(p3d_rot_center, cSP.centerX, cSP.centerY, cSP.radius);

    if (p2d_canvas_center.isVisible) {
        ctx.save();
        ctx.fillStyle = COLOR_PROBE_MARKER;
        ctx.beginPath();
        ctx.arc(p2d_canvas_center.x, p2d_canvas_center.y, 4, 0, 2 * Math.PI); 
        ctx.fill();
        ctx.restore();
    }

    
    const n_pts_circle = 30;
    const src_circle_pts = [];
    for (let i = 0; i <= n_pts_circle; i++) {
        const angle = (i / n_pts_circle) * 2 * Math.PI;
        src_circle_pts.push({
            re: sourceProbeZ.re + neighborhoodSize * Math.cos(angle),
            im: sourceProbeZ.im + neighborhoodSize * Math.sin(angle)
        });
    }

    const h_segment = neighborhoodSize / PROBE_CROSSHAIR_SIZE_FACTOR;
    const src_horz_line_pts = [
        { re: sourceProbeZ.re - h_segment, im: sourceProbeZ.im },
        { re: sourceProbeZ.re + h_segment, im: sourceProbeZ.im }
    ];
    const src_vert_line_pts = [
        { re: sourceProbeZ.re, im: sourceProbeZ.im - h_segment },
        { re: sourceProbeZ.re, im: sourceProbeZ.im + h_segment }
    ];

    
    
    const tfForMapping = isWSphere ? transformFuncIfWSphere : null;
    
    drawMappedLineSetOnSphere(ctx, cSP, [src_circle_pts], COLOR_PROBE_NEIGHBORHOOD, isWSphere, tfForMapping);
    drawMappedLineSetOnSphere(ctx, cSP, [src_horz_line_pts], isWSphere ? COLOR_PROBE_CONFORMAL_LINE_W_H : COLOR_PROBE_CONFORMAL_LINE_Z_H, isWSphere, tfForMapping);
    drawMappedLineSetOnSphere(ctx, cSP, [src_vert_line_pts], isWSphere ? COLOR_PROBE_CONFORMAL_LINE_W_V : COLOR_PROBE_CONFORMAL_LINE_Z_V, isWSphere, tfForMapping);
}
