function drawZPlaneContent(){
    zCtx.fillStyle=COLOR_CANVAS_BACKGROUND;
    zCtx.fillRect(0,0,zPlaneParams.width,zPlaneParams.height);
    const curFunc=transformFunctions[state.currentFunction];
    const drawZAsSphere = state.riemannSphereViewEnabled && !state.splitViewEnabled;

    if(drawZAsSphere){
        const cSP=sphereViewParams.z;
        
        if(state.domainColoringEnabled && domainColoringDirty){renderSphereDomainColoring(zDomainColorCtx,cSP,zPlaneParams,false,curFunc);} 
        if(state.domainColoringEnabled){zCtx.drawImage(zDomainColorCanvas,0,0);}
        else { 
            zCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
            zCtx.fillRect(0, 0, zPlaneParams.width, zPlaneParams.height);
        }
        drawRiemannSphereBase(zCtx,cSP,zPlaneParams);
        drawSphereGridAndShape(zCtx,cSP,zPlaneParams,false); 
        if (state.probeActive) {
            drawSphereProbeAndNeighborhood(zCtx, cSP, state.probeZ, state.probeNeighborhoodSize, null);
        }
    }else{ 
        
        if(state.domainColoringEnabled && domainColoringDirty){renderPlanarDomainColoring(zDomainColorCtx,zPlaneParams,false,curFunc);} 
        if(state.domainColoringEnabled){zCtx.drawImage(zDomainColorCanvas,0,0);}
        else { 
            zCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
            zCtx.fillRect(0, 0, zPlaneParams.width, zPlaneParams.height);
        }
        drawAxes(zCtx,zPlaneParams,"Re(z)","Im(z)");
        if (!(state.currentInputShape === 'empty_grid' || state.vectorFieldEnabled)) { 
            if (state.currentInputShape === 'grid_cartesian' || state.currentInputShape === 'grid_polar' || state.currentInputShape === 'grid_logpolar') {
                 drawGridLines(zCtx, zPlaneParams);
            }
        }
        if(state.currentFunction==='zeta'&&!state.zetaContinuationEnabled){
            const x_boundary=ZETA_REFLECTION_POINT_RE;
            const x_min_view=zPlaneParams.currentVisXRange[0];
            const x_max_rect=Math.min(x_boundary,zPlaneParams.currentVisXRange[1]);
            if(x_max_rect>x_min_view){
                const p1=mapToCanvasCoords(x_min_view,zPlaneParams.currentVisYRange[1],zPlaneParams);
                const p2=mapToCanvasCoords(x_max_rect,zPlaneParams.currentVisYRange[0],zPlaneParams);
                zCtx.save();zCtx.fillStyle='rgba(30,30,60,0.35)';zCtx.fillRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
                zCtx.fillStyle='rgba(180,180,220,0.6)';zCtx.font="italic 11px 'SF Pro Text',sans-serif";zCtx.textAlign='center';
                const text_x_world=(x_min_view+x_max_rect)/2;
                if(x_max_rect-x_min_view>50/zPlaneParams.scale.x){ 
                    const text_pos_canvas=mapToCanvasCoords(text_x_world,zPlaneParams.currentVisYRange[0]+0.2*(zPlaneParams.currentVisYRange[1]-zPlaneParams.currentVisYRange[0]),zPlaneParams);
                    zCtx.fillText(`Re(z) ≤ ${x_boundary.toFixed(1)} (Undefined by Sum)`,text_pos_canvas.x,text_pos_canvas.y);
                }
                zCtx.restore();
            }
        }
        if (state.vectorFieldEnabled) {
            if (state.streamlineFlowEnabled) {
                drawStreamlinesOnZPlane(zCtx, zPlaneParams, state);
            } else {
                drawZPlaneVectorField(zCtx, zPlaneParams, curFunc, state.vectorFieldFunction);
            }
        } else {
            drawPlanarInputShape(zCtx, zPlaneParams);
        }
        if(state.showZerosPoles) drawZerosAndPolesMarkers(zCtx,zPlaneParams);
        if(state.showCriticalPoints && state.criticalPoints.length > 0) { 
            state.criticalPoints.forEach(cp => { 
                const p_c = mapToCanvasCoords(cp.re, cp.im, zPlaneParams); 
                drawCriticalPointMarker(zCtx, p_c, COLOR_CRITICAL_POINT_Z); 
            });
        }

        if (state.taylorSeriesEnabled && !drawZAsSphere) {
            if (isFinite(state.taylorSeriesConvergenceRadius) && state.taylorSeriesConvergenceRadius > 1e-9) { 
                const centerCanvas = mapToCanvasCoords(state.taylorSeriesCenter.re, state.taylorSeriesCenter.im, zPlaneParams);
                const radiusCanvas = state.taylorSeriesConvergenceRadius * zPlaneParams.scale.x; 
                
                if (radiusCanvas < Math.max(zPlaneParams.width, zPlaneParams.height) * 2) {
                    zCtx.save();
                    zCtx.fillStyle = state.taylorSeriesColorConvergenceDiskFill;
                    zCtx.strokeStyle = state.taylorSeriesColorConvergenceDiskStroke;
                    zCtx.lineWidth = 1;
                    zCtx.beginPath();
                    zCtx.arc(centerCanvas.x, centerCanvas.y, radiusCanvas, 0, 2 * Math.PI);
                    zCtx.fill();
                    zCtx.stroke();
                    zCtx.restore();
                }
            } else if (state.taylorSeriesConvergenceRadius === 0) {
                const centerCanvas = mapToCanvasCoords(state.taylorSeriesCenter.re, state.taylorSeriesCenter.im, zPlaneParams);
                zCtx.save();
                zCtx.fillStyle = state.taylorSeriesColorConvergenceDiskStroke; 
                zCtx.beginPath();
                zCtx.arc(centerCanvas.x, centerCanvas.y, 2, 0, 2 * Math.PI); 
                zCtx.fill();
                zCtx.restore();
            }
        }

        if(state.probeActive && !state.panStateZ.isPanning) drawPlanarProbe(zCtx,zPlaneParams);
        
        if (state.particleAnimationEnabled) {
            updateAndDrawParticles(zCtx, zPlaneParams, state);
        }
    }
}

function drawWPlaneContent() {
    const curFunc = transformFunctions[state.currentFunction];
    const isRiemannW = state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (state.plotly3DEnabled && isRiemannW) {
        if (wCanvas) wCanvas.classList.add('hidden'); // Use global wCanvas
        if (controls.wPlanePlotlyContainer) controls.wPlanePlotlyContainer.classList.remove('hidden');
        // Ensure plotly container has correct dimensions matching the canvas it replaces
        if (controls.wPlanePlotlyContainer && wPlaneParams.width && wPlaneParams.height) {
            controls.wPlanePlotlyContainer.style.width = `${wPlaneParams.width}px`;
            controls.wPlanePlotlyContainer.style.height = `${wPlaneParams.height}px`;
        }
        renderPlotlyRiemannSphere(curFunc);
    } else {
        if (wCanvas) wCanvas.classList.remove('hidden'); // Use global wCanvas
        if (controls.wPlanePlotlyContainer) controls.wPlanePlotlyContainer.classList.add('hidden');

        wCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
        wCtx.fillRect(0, 0, wPlaneParams.width, wPlaneParams.height);

        if (state.taylorSeriesEnabled && !isRiemannW) {
            drawPlanarTaylorApproximation(
                wCtx,
                wPlaneParams,
                state.currentFunction,
                state.taylorSeriesCenter,
                state.taylorSeriesOrder,
                state.taylorSeriesColorAxisX,
                state.taylorSeriesColorAxisY
            );
        } else { // This 'else' corresponds to !(state.taylorSeriesEnabled && !isRiemannW)
            if (isRiemannW) { // This is for the 2D canvas Riemann sphere
                 const cSP = sphereViewParams.w;
                 if (state.domainColoringEnabled && domainColoringDirty) {renderSphereDomainColoring(wDomainColorCtx, cSP, wPlaneParams, true, null);}
                 if (state.domainColoringEnabled) {wCtx.drawImage(wDomainColorCanvas, 0, 0);}
                 else {
                     wCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
                     wCtx.fillRect(0, 0, wPlaneParams.width, wPlaneParams.height);
                 }
                 drawRiemannSphereBase(wCtx, cSP, wPlaneParams);
                 drawSphereGridAndShape(wCtx, cSP, wPlaneParams, true, curFunc);
            } else { // Planar w-plane view
                drawAxes(wCtx, wPlaneParams, "Re(w)", "Im(w)");
                if (state.currentInputShape !== 'empty_grid') {
                    if (state.currentInputShape === 'grid_cartesian' ||
                        state.currentInputShape === 'grid_polar' ||
                        state.currentInputShape === 'grid_logpolar') {
                        drawGridLines(wCtx, wPlaneParams);
                    }
                }

                if (state.currentFunction === 'polynomial' && state.currentInputShape === 'circle' && state.polynomialCoeffs.length > 0 && state.polynomialCoeffs[0]) {
                    const c_val = state.polynomialCoeffs[0];
                    if (c_val && !isNaN(c_val.re) && !isNaN(c_val.im)) {
                        const c_canvas = mapToCanvasCoords(c_val.re, c_val.im, wPlaneParams);
                        wCtx.save();wCtx.fillStyle = COLOR_FTA_C_MARKER;wCtx.beginPath();wCtx.arc(c_canvas.x, c_canvas.y, 5, 0, 2 * Math.PI);wCtx.fill();
                        wCtx.fillStyle = COLOR_TEXT_ON_CANVAS;wCtx.font = "10px 'SF Pro Text', sans-serif";wCtx.textAlign = "center";wCtx.fillText(`P(0)`, c_canvas.x, c_canvas.y - 10); wCtx.restore();
                    }
                }
                if (state.wOriginGlowTime > 0) {
                    const elapsed = Date.now() - state.wOriginGlowTime;
                    if (elapsed < ORIGIN_GLOW_DURATION_MS) {
                        const glowAlpha = 1.0 - (elapsed / ORIGIN_GLOW_DURATION_MS);
                        wCtx.save();wCtx.fillStyle = COLOR_W_ORIGIN_GLOW.replace('0.7', (glowAlpha * 0.7).toFixed(2));
                        const origin_w_canvas = mapToCanvasCoords(0, 0, wPlaneParams);
                        wCtx.beginPath();wCtx.arc(origin_w_canvas.x, origin_w_canvas.y, 8 + (1 - glowAlpha) * 12, 0, 2 * Math.PI);wCtx.fill();wCtx.restore();
                    } else {state.wOriginGlowTime = 0;}
                }
                drawPlanarTransformedShape(wCtx, wPlaneParams, curFunc);
            }
        }
    }

    // Common elements like critical points and probe, if applicable to Plotly (handled within renderPlotlyRiemannSphere if so)
    // Or, if Plotly is not active, draw them on the canvas:
    if (!(state.plotly3DEnabled && isRiemannW)) {
        if(state.showCriticalPoints && state.criticalValues.length > 0 && !isRiemannW) {
            state.criticalValues.forEach(cv => {
                if (!isNaN(cv.re) && !isNaN(cv.im) && isFinite(cv.re) && isFinite(cv.im)) {
                    const p_c = mapToCanvasCoords(cv.re, cv.im, wPlaneParams);
                    drawCriticalPointMarker(wCtx, p_c, COLOR_CRITICAL_VALUE_W);
                }
            });
        }

        if (state.probeActive) {
            if (isRiemannW) { // 2D Canvas Sphere
                 const cSP = sphereViewParams.w;
                 drawSphereProbeAndNeighborhood(wCtx, cSP, state.probeZ, state.probeNeighborhoodSize, curFunc);
            } else { // Planar W-plane
                drawPlanarTransformedProbe(wCtx, wPlaneParams, curFunc);
            }
        }

        if (!isRiemannW) { // Only for planar w-plane
            updateWindingNumberDisplay(curFunc);
        }
    }
} // Closing brace for drawWPlaneContent
