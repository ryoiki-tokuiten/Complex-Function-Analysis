function drawRiemannSphereBase(ctx,cSP){const{centerX:cX,centerY:cY,radius:r}=cSP;ctx.save();ctx.strokeStyle=COLOR_SPHERE_OUTLINE;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cX,cY,r,0,2*Math.PI);ctx.stroke();ctx.restore();}

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

function getSpherePointSetColor(pointSet, isWP) {
    if (!isWP) {
        return COLOR_SPHERE_GRID;
    }
    return pointSet.color || COLOR_SPHERE_GRID;
}

function drawSphereGridAndShape(ctx, cSP, isWP, tf = null) {
    if (state.currentInputShape === 'image' && state.imagePoints && state.imagePoints.length > 0) {
        const size = state.imageSize || 2.0;
        const cx = state.a0 || 0;
        const cy = state.b0 || 0;
        ctx.globalAlpha = state.imageOpacity || 1.0;
        for (let i = 0; i < state.imagePoints.length; i++) {
            const pt = state.imagePoints[i];
            const re = cx + pt.nx * (size / 2);
            const im = cy + pt.ny * (size / 2);
            let w = isWP ? (tf ? tf(re, im) : {re, im}) : {re, im};
            if (!w || isNaN(w.re) || isNaN(w.im) || !isFinite(w.re) || !isFinite(w.im)) continue;

            const spherePoint = complexToSphere(w.re, w.im);
            const rotatedSpherePoint = rotate3D(spherePoint, cSP.rotX, cSP.rotY);
            const p2d = projectSphereToCanvas2D(rotatedSpherePoint, cSP.centerX, cSP.centerY, cSP.radius);
            if (p2d.isVisible) {
                ctx.fillStyle = pt.color;
                ctx.fillRect(p2d.x - 1, p2d.y - 1, 2, 2);
            }
        }
        ctx.globalAlpha = 1.0;
        return;
    }

    const sourcePointSets = isWP
        ? generateCurrentMappedInputShapePointSets(zPlaneParams, {
            currentFunction: state.currentFunction,
            zetaContinuationEnabled: state.zetaContinuationEnabled,
            curvePoints: NUM_POINTS_CURVE
        })
        : generateCurrentInputShapePointSets(zPlaneParams, {
            currentFunction: state.currentFunction,
            zetaContinuationEnabled: state.zetaContinuationEnabled,
            curvePoints: NUM_POINTS_CURVE
        });

    sourcePointSets.forEach(set => {
        drawMappedLineSetOnSphere(
            ctx,
            cSP,
            [set.points],
            getSpherePointSetColor(set, isWP),
            isWP,
            isWP ? tf : null
        );
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
