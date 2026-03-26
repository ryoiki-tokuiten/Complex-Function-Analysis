function drawPlaneLayer(ctx, planeParams, planeKey, drawCallback, mode = 'capture') {
    if (!ctx || !planeParams || typeof drawCallback !== 'function') return;

    if (mode === 'raster') {
        if (typeof drawWithWebGLRaster === 'function' && drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback)) {
            return;
        }
        drawCallback(ctx);
        return;
    }

    if (mode === 'auto') {
        if (typeof drawWithWebGLCapture === 'function' && drawWithWebGLCapture(ctx, planeParams, planeKey, drawCallback)) {
            return;
        }
        if (typeof drawWithWebGLRaster === 'function' && drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback)) {
            return;
        }
        drawCallback(ctx);
        return;
    }

    if (typeof drawWithWebGLCapture === 'function' && drawWithWebGLCapture(ctx, planeParams, planeKey, drawCallback)) return;
    if (typeof drawWithWebGLRaster === 'function' && drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback)) return;
    drawCallback(ctx);
}

const wPlanarTransformedLayerCache = {
    key: null,
    canvas: null,
    ctx: null
};
const zPlanarInputLayerCache = {
    key: null,
    canvas: null,
    ctx: null
};

function toCacheKeyNumber(value) {
    if (!Number.isFinite(value)) return `${value}`;
    return value.toFixed(6);
}

function appendPointToCacheKey(parts, prefix, point) {
    if (!point) {
        parts.push(`${prefix}:none`);
        return;
    }
    parts.push(`${prefix}r:${toCacheKeyNumber(point.re)}`);
    parts.push(`${prefix}i:${toCacheKeyNumber(point.im)}`);
}

function buildPlanarLayerCacheKey(isWPlane) {
    const params = isWPlane ? wPlaneParams : zPlaneParams;
    let keyParts = [
        `f:${state.currentFunction}`,
        `shape:${state.currentInputShape}`,
        `grid:${state.gridDensity}`,
        `zetaC:${state.zetaContinuationEnabled ? 1 : 0}`,
        `radialD:${state.radialDiscreteStepsEnabled ? 1 : 0}`,
        `radialN:${state.radialDiscreteStepsCount}`,
        `a0:${toCacheKeyNumber(state.a0)}`,
        `b0:${toCacheKeyNumber(state.b0)}`,
        `circleR:${toCacheKeyNumber(state.circleR)}`,
        `ellipseA:${toCacheKeyNumber(state.ellipseA)}`,
        `ellipseB:${toCacheKeyNumber(state.ellipseB)}`,
        `hyperbolaA:${toCacheKeyNumber(state.hyperbolaA)}`,
        `hyperbolaB:${toCacheKeyNumber(state.hyperbolaB)}`,
        `stripY1:${toCacheKeyNumber(state.stripY1)}`,
        `stripY2:${toCacheKeyNumber(state.stripY2)}`,
        `sectorA1:${toCacheKeyNumber(state.sectorAngle1)}`,
        `sectorA2:${toCacheKeyNumber(state.sectorAngle2)}`,
        `sectorRMin:${toCacheKeyNumber(state.sectorRMin)}`,
        `sectorRMax:${toCacheKeyNumber(state.sectorRMax)}`,
        `zX0:${toCacheKeyNumber(zPlaneParams.currentVisXRange[0])}`,
        `zX1:${toCacheKeyNumber(zPlaneParams.currentVisXRange[1])}`,
        `zY0:${toCacheKeyNumber(zPlaneParams.currentVisYRange[0])}`,
        `zY1:${toCacheKeyNumber(zPlaneParams.currentVisYRange[1])}`,
        `Ox:${toCacheKeyNumber(params.origin.x)}`,
        `Oy:${toCacheKeyNumber(params.origin.y)}`,
        `Sx:${toCacheKeyNumber(params.scale.x)}`,
        `Sy:${toCacheKeyNumber(params.scale.y)}`,
        `W:${params.width}`,
        `H:${params.height}`
    ];

    if (isWPlane) {
        appendPointToCacheKey(keyParts, 'mA', state.mobiusA);
        appendPointToCacheKey(keyParts, 'mB', state.mobiusB);
        appendPointToCacheKey(keyParts, 'mC', state.mobiusC);
        appendPointToCacheKey(keyParts, 'mD', state.mobiusD);
        const polyDegree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        keyParts.push(`polyN:${polyDegree}`);
        for (let i = 0; i <= polyDegree; i++) {
            appendPointToCacheKey(keyParts, `p${i}`, (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null);
        }
    }
    return keyParts.join('|');
}

function buildWPlanarTransformedLayerCacheKey() {
    return buildPlanarLayerCacheKey(true);
}

function buildZPlanarInputLayerCacheKey() {
    return buildPlanarLayerCacheKey(false);
}

function ensurePlanarLayerCacheCanvas(cacheObj, width, height) {
    if (width <= 0 || height <= 0) return null;
    if (!cacheObj.canvas) {
        cacheObj.canvas = document.createElement('canvas');
        cacheObj.ctx = cacheObj.canvas.getContext('2d');
        if (!cacheObj.ctx) {
            cacheObj.canvas = null;
            return null;
        }
    }
    if (cacheObj.canvas.width !== width || cacheObj.canvas.height !== height) {
        cacheObj.canvas.width = width;
        cacheObj.canvas.height = height;
        cacheObj.key = null;
    }
    return cacheObj.canvas;
}

function ensureWPlanarTransformedLayerCacheCanvas(width, height) {
    return ensurePlanarLayerCacheCanvas(wPlanarTransformedLayerCache, width, height);
}

function ensureZPlanarInputLayerCacheCanvas(width, height) {
    return ensurePlanarLayerCacheCanvas(zPlanarInputLayerCache, width, height);
}

function shouldUseWPlanarTransformedLayerCache() {
    if (state.taylorSeriesEnabled) return false;
    if (state.riemannSphereViewEnabled || state.splitViewEnabled) return false;
    if (state.panStateZ && state.panStateZ.isPanning) return false;
    if (state.panStateW && state.panStateW.isPanning) return false;
    return true;
}

function shouldUseZPlanarInputLayerCache() {
    if (state.vectorFieldEnabled) return false;
    if (state.riemannSphereViewEnabled && !state.splitViewEnabled) return false;
    if (state.panStateZ && state.panStateZ.isPanning) return false;
    return true;
}

function ensureZPlanarInputLayerCacheCanvas(width, height) {
    if (width <= 0 || height <= 0) return null;
    if (!zPlanarInputLayerCache.canvas) {
        zPlanarInputLayerCache.canvas = document.createElement('canvas');
        zPlanarInputLayerCache.ctx = zPlanarInputLayerCache.canvas.getContext('2d');
        if (!zPlanarInputLayerCache.ctx) {
            zPlanarInputLayerCache.canvas = null;
            return null;
        }
    }
    if (
        zPlanarInputLayerCache.canvas.width !== width ||
        zPlanarInputLayerCache.canvas.height !== height
    ) {
        zPlanarInputLayerCache.canvas.width = width;
        zPlanarInputLayerCache.canvas.height = height;
        zPlanarInputLayerCache.key = null;
    }
    return zPlanarInputLayerCache.canvas;
}

function drawZetaUndefinedRegionOverlay(ctx, planeParams) {
    if (!(state.currentFunction === 'zeta' && !state.zetaContinuationEnabled)) return;

    const xBoundary = ZETA_REFLECTION_POINT_RE;
    const xMinView = planeParams.currentVisXRange[0];
    const xMaxRect = Math.min(xBoundary, planeParams.currentVisXRange[1]);
    if (xMaxRect <= xMinView) return;

    const p1 = mapToCanvasCoords(xMinView, planeParams.currentVisYRange[1], planeParams);
    const p2 = mapToCanvasCoords(xMaxRect, planeParams.currentVisYRange[0], planeParams);

    ctx.save();
    ctx.fillStyle = 'rgba(30,30,60,0.35)';
    ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.fillStyle = 'rgba(180,180,220,0.6)';
    ctx.font = "italic 11px 'SF Pro Text',sans-serif";
    ctx.textAlign = 'center';

    if (xMaxRect - xMinView > 50 / planeParams.scale.x) {
        const textXWorld = (xMinView + xMaxRect) / 2;
        const textPosCanvas = mapToCanvasCoords(
            textXWorld,
            planeParams.currentVisYRange[0] + 0.2 * (planeParams.currentVisYRange[1] - planeParams.currentVisYRange[0]),
            planeParams
        );
        ctx.fillText(`Re(z) ≤ ${xBoundary.toFixed(1)} (Undefined by Sum)`, textPosCanvas.x, textPosCanvas.y);
    }
    ctx.restore();
}

function drawTaylorConvergenceOverlay(ctx, planeParams) {
    if (!state.taylorSeriesEnabled) return;

    if (isFinite(state.taylorSeriesConvergenceRadius) && state.taylorSeriesConvergenceRadius > 1e-9) {
        const centerCanvas = mapToCanvasCoords(state.taylorSeriesCenter.re, state.taylorSeriesCenter.im, planeParams);
        const radiusCanvas = state.taylorSeriesConvergenceRadius * planeParams.scale.x;

        if (radiusCanvas < Math.max(planeParams.width, planeParams.height) * 2) {
            ctx.save();
            ctx.fillStyle = state.taylorSeriesColorConvergenceDiskFill;
            ctx.strokeStyle = state.taylorSeriesColorConvergenceDiskStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerCanvas.x, centerCanvas.y, radiusCanvas, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        return;
    }

    if (state.taylorSeriesConvergenceRadius === 0) {
        const centerCanvas = mapToCanvasCoords(state.taylorSeriesCenter.re, state.taylorSeriesCenter.im, planeParams);
        ctx.save();
        ctx.fillStyle = state.taylorSeriesColorConvergenceDiskStroke;
        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

function drawPolynomialOriginMarkerOverlay(ctx, planeParams) {
    if (!(state.currentFunction === 'polynomial' && state.currentInputShape === 'circle' && state.polynomialCoeffs.length > 0 && state.polynomialCoeffs[0])) {
        return;
    }

    const cVal = state.polynomialCoeffs[0];
    if (!cVal || isNaN(cVal.re) || isNaN(cVal.im)) return;

    const cCanvas = mapToCanvasCoords(cVal.re, cVal.im, planeParams);
    ctx.save();
    ctx.fillStyle = COLOR_FTA_C_MARKER;
    ctx.beginPath();
    ctx.arc(cCanvas.x, cCanvas.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
    ctx.font = "10px 'SF Pro Text', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('P(0)', cCanvas.x, cCanvas.y - 10);
    ctx.restore();
}

function drawWOriginGlowOverlay(ctx, planeParams) {
    if (state.wOriginGlowTime <= 0) return;

    const elapsed = Date.now() - state.wOriginGlowTime;
    if (elapsed >= ORIGIN_GLOW_DURATION_MS) {
        state.wOriginGlowTime = 0;
        return;
    }

    const glowAlpha = 1.0 - (elapsed / ORIGIN_GLOW_DURATION_MS);
    const originWCanvas = mapToCanvasCoords(0, 0, planeParams);

    ctx.save();
    ctx.fillStyle = COLOR_W_ORIGIN_GLOW.replace('0.7', (glowAlpha * 0.7).toFixed(2));
    ctx.beginPath();
    ctx.arc(originWCanvas.x, originWCanvas.y, 8 + (1 - glowAlpha) * 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function drawZPlaneContent(){
    // Handle Fourier Transform mode
    if (state.fourierModeEnabled) {
        drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
            drawTimeDomainSignal(layerCtx, state.fourierTimeDomainSignal, zPlaneParams);
        }, 'raster');
        return;
    }
    
    // Handle Laplace Transform mode - LEFT panel (time domain)
    if (state.laplaceModeEnabled) {
        drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
            drawLaplaceTimeDomain(layerCtx, state.laplaceTimeDomainSignal, zPlaneParams);
        }, 'raster');
        return;
    }
    
    const curFunc=transformFunctions[state.currentFunction];
    const drawZAsSphere = state.riemannSphereViewEnabled && !state.splitViewEnabled;

    if(drawZAsSphere){
        const cSP=sphereViewParams.z;
        
        if(state.domainColoringEnabled && domainColoringDirty){renderSphereDomainColoring(zDomainColorCtx,cSP,zPlaneParams,false,curFunc);} 
        drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
            if (state.domainColoringEnabled) {
                layerCtx.drawImage(zDomainColorCanvas, 0, 0);
            } else {
                layerCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
                layerCtx.fillRect(0, 0, zPlaneParams.width, zPlaneParams.height);
            }
        }, 'raster');
        drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
            drawRiemannSphereBase(layerCtx, cSP, zPlaneParams);
            drawSphereGridAndShape(layerCtx, cSP, zPlaneParams, false);
            if (state.probeActive) {
                drawSphereProbeAndNeighborhood(layerCtx, cSP, state.probeZ, state.probeNeighborhoodSize, null);
            }
        }, 'raster');
    }else{ 
        
        if(state.domainColoringEnabled && domainColoringDirty){renderPlanarDomainColoring(zDomainColorCtx,zPlaneParams,false,curFunc);} 
        const drawReferenceGrid =
            !state.vectorFieldEnabled &&
            (state.currentInputShape === 'grid_cartesian' ||
            state.currentInputShape === 'grid_polar' ||
            state.currentInputShape === 'grid_logpolar');
        drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
            if (state.domainColoringEnabled) {
                layerCtx.drawImage(zDomainColorCanvas, 0, 0);
            } else {
                layerCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
                layerCtx.fillRect(0, 0, zPlaneParams.width, zPlaneParams.height);
            }
            drawAxes(layerCtx, zPlaneParams, 'Re(z)', 'Im(z)');
            drawZetaUndefinedRegionOverlay(layerCtx, zPlaneParams);
            if (drawReferenceGrid) {
                drawGridLines(layerCtx, zPlaneParams);
            }
        }, 'raster');
        if (state.vectorFieldEnabled) {
            zPlanarInputLayerCache.key = null;
            if (state.streamlineFlowEnabled) {
                drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                    drawStreamlinesOnZPlane(layerCtx, zPlaneParams, state);
                }, 'capture');
            } else {
                drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                    drawZPlaneVectorField(layerCtx, zPlaneParams, curFunc, state.vectorFieldFunction);
                }, 'capture');
            }
        } else {
            const useCachedInputLayer = shouldUseZPlanarInputLayerCache();
            if (useCachedInputLayer) {
                const cacheCanvas = ensureZPlanarInputLayerCacheCanvas(zPlaneParams.width, zPlaneParams.height);
                const cacheCtx = zPlanarInputLayerCache.ctx;
                const cacheKey = buildZPlanarInputLayerCacheKey();
                if (cacheCanvas && cacheCtx) {
                    if (zPlanarInputLayerCache.key !== cacheKey) {
                        cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                        cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                        const renderedInputByWebGL = (typeof drawPlanarInputShapeHybrid === 'function')
                            ? drawPlanarInputShapeHybrid(cacheCtx, zPlaneParams, 'z')
                            : false;
                        if (!renderedInputByWebGL) {
                            drawPlanarInputShape(cacheCtx, zPlaneParams);
                        }
                        zPlanarInputLayerCache.key = cacheKey;
                    }
                    zCtx.drawImage(cacheCanvas, 0, 0);
                } else {
                    const renderedInputByWebGL = (typeof drawPlanarInputShapeHybrid === 'function')
                        ? drawPlanarInputShapeHybrid(zCtx, zPlaneParams, 'z')
                        : false;
                    if (!renderedInputByWebGL) {
                        drawPlanarInputShape(zCtx, zPlaneParams);
                    }
                }
            } else {
                zPlanarInputLayerCache.key = null;
                const renderedInputByWebGL = (typeof drawPlanarInputShapeHybrid === 'function')
                    ? drawPlanarInputShapeHybrid(zCtx, zPlaneParams, 'z')
                    : false;
                if (!renderedInputByWebGL) {
                    drawPlanarInputShape(zCtx, zPlaneParams);
                }
            }
        }
        if (state.showZerosPoles) {
            drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                drawZerosAndPolesMarkers(layerCtx, zPlaneParams);
            }, 'capture');
        }
        if(state.showCriticalPoints && state.criticalPoints.length > 0) { 
            drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                state.criticalPoints.forEach(cp => {
                    const p_c = mapToCanvasCoords(cp.re, cp.im, zPlaneParams);
                    drawCriticalPointMarker(layerCtx, p_c, COLOR_CRITICAL_POINT_Z);
                });
            }, 'capture');
        }

        if (state.taylorSeriesEnabled && !drawZAsSphere) {
            drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                drawTaylorConvergenceOverlay(layerCtx, zPlaneParams);
            }, 'raster');
        }

        if (state.probeActive && !state.panStateZ.isPanning) {
            drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                drawPlanarProbe(layerCtx, zPlaneParams);
            }, 'capture');
        }
        
        if (state.particleAnimationEnabled) {
            drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                updateAndDrawParticles(layerCtx, zPlaneParams, state);
            }, 'raster');
        }
    }
}

function drawWPlaneContent() {
    // Handle Fourier Transform mode - use WINDING visualization!
    if (state.fourierModeEnabled) {
        drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
            drawWindingVisualization(layerCtx, state.fourierTimeDomainSignal, wPlaneParams);
        }, 'raster');
        return;
    }
    
    // Handle Laplace Transform mode - MIDDLE panel uses winding visualization
    if (state.laplaceModeEnabled) {
        // Use the same beautiful winding function as Fourier!
        drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
            drawLaplaceWindingVisualization(layerCtx, state.laplaceTimeDomainSignal, wPlaneParams);
        }, 'raster');
        return;
    }
    
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

        if (!isRiemannW) {
            const drawReferenceGrid =
                state.currentInputShape !== 'empty_grid' &&
                (state.currentInputShape === 'grid_cartesian' ||
                state.currentInputShape === 'grid_polar' ||
                state.currentInputShape === 'grid_logpolar');
            drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                layerCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
                layerCtx.fillRect(0, 0, wPlaneParams.width, wPlaneParams.height);
                if (!state.taylorSeriesEnabled) {
                    drawAxes(layerCtx, wPlaneParams, 'Re(w)', 'Im(w)');
                    drawPolynomialOriginMarkerOverlay(layerCtx, wPlaneParams);
                    drawWOriginGlowOverlay(layerCtx, wPlaneParams);
                    if (drawReferenceGrid) {
                        drawGridLines(layerCtx, wPlaneParams);
                    }
                }
            }, 'raster');
        }

        if (state.taylorSeriesEnabled && !isRiemannW) {
            drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                drawPlanarTaylorApproximation(
                    layerCtx,
                    wPlaneParams,
                    state.currentFunction,
                    state.taylorSeriesCenter,
                    state.taylorSeriesOrder,
                    state.taylorSeriesColorAxisX,
                    state.taylorSeriesColorAxisY
                );
            }, 'raster');
        } else { // This 'else' corresponds to !(state.taylorSeriesEnabled && !isRiemannW)
            if (isRiemannW) { // This is for the 2D canvas Riemann sphere
                 const cSP = sphereViewParams.w;
                 if (state.domainColoringEnabled && domainColoringDirty) {renderSphereDomainColoring(wDomainColorCtx, cSP, wPlaneParams, true, null);}
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    if (state.domainColoringEnabled) {
                        layerCtx.drawImage(wDomainColorCanvas, 0, 0);
                    } else {
                        layerCtx.fillStyle = COLOR_CANVAS_BACKGROUND;
                        layerCtx.fillRect(0, 0, wPlaneParams.width, wPlaneParams.height);
                    }
                }, 'raster');
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawRiemannSphereBase(layerCtx, cSP, wPlaneParams);
                    drawSphereGridAndShape(layerCtx, cSP, wPlaneParams, true, curFunc);
                }, 'raster');
            } else { // Planar w-plane view
                const useCachedLayer = shouldUseWPlanarTransformedLayerCache();
                if (useCachedLayer) {
                    const cacheCanvas = ensureWPlanarTransformedLayerCacheCanvas(wPlaneParams.width, wPlaneParams.height);
                    const cacheCtx = wPlanarTransformedLayerCache.ctx;
                    const cacheKey = buildWPlanarTransformedLayerCacheKey();
                    if (cacheCanvas && cacheCtx) {
                        if (wPlanarTransformedLayerCache.key !== cacheKey) {
                            cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                            cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                            const renderedByWebGL = (typeof drawPlanarTransformedShapeHybrid === 'function')
                                ? drawPlanarTransformedShapeHybrid(cacheCtx, wPlaneParams, curFunc, 'w')
                                : false;
                            if (!renderedByWebGL) {
                                drawPlanarTransformedShape(cacheCtx, wPlaneParams, curFunc);
                            }
                            wPlanarTransformedLayerCache.key = cacheKey;
                        }
                        wCtx.drawImage(cacheCanvas, 0, 0);
                    } else {
                        const renderedByWebGL = (typeof drawPlanarTransformedShapeHybrid === 'function')
                            ? drawPlanarTransformedShapeHybrid(wCtx, wPlaneParams, curFunc, 'w')
                            : false;
                        if (!renderedByWebGL) {
                            drawPlanarTransformedShape(wCtx, wPlaneParams, curFunc);
                        }
                    }
                } else {
                    wPlanarTransformedLayerCache.key = null;
                    const renderedByWebGL = (typeof drawPlanarTransformedShapeHybrid === 'function')
                        ? drawPlanarTransformedShapeHybrid(wCtx, wPlaneParams, curFunc, 'w')
                        : false;
                    if (!renderedByWebGL) {
                        drawPlanarTransformedShape(wCtx, wPlaneParams, curFunc);
                    }
                }
            }
        }
    }

    // Common elements like critical points and probe, if applicable to Plotly (handled within renderPlotlyRiemannSphere if so)
    // Or, if Plotly is not active, draw them on the canvas:
    if (!(state.plotly3DEnabled && isRiemannW)) {
        if(state.showCriticalPoints && state.criticalValues.length > 0 && !isRiemannW) {
            drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                state.criticalValues.forEach(cv => {
                    if (!isNaN(cv.re) && !isNaN(cv.im) && isFinite(cv.re) && isFinite(cv.im)) {
                        const p_c = mapToCanvasCoords(cv.re, cv.im, wPlaneParams);
                        drawCriticalPointMarker(layerCtx, p_c, COLOR_CRITICAL_VALUE_W);
                    }
                });
            }, 'capture');
        }

        if (state.probeActive) {
            if (isRiemannW) { // 2D Canvas Sphere
                const cSP = sphereViewParams.w;
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawSphereProbeAndNeighborhood(layerCtx, cSP, state.probeZ, state.probeNeighborhoodSize, curFunc);
                }, 'raster');
            } else { // Planar W-plane
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawPlanarTransformedProbe(layerCtx, wPlaneParams, curFunc);
                }, 'capture');
            }
        }

        if (!isRiemannW) { // Only for planar w-plane
            updateWindingNumberDisplay(curFunc);
        }
    }
} // Closing brace for drawWPlaneContent
