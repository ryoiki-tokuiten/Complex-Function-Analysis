function drawPlaneLayer(ctx, planeParams, planeKey, drawCallback, mode = 'capture') {
    if (!ctx || !planeParams || typeof drawCallback !== 'function') return;

    if (mode === 'raster') {
        if (drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback)) return;
        console.error('WebGL raster rendering failed.');
        return;
    }

    // Default 'capture' mode
    if (drawWithWebGLCapture(ctx, planeParams, planeKey, drawCallback)) return;
    if (drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback)) return;
    console.error('WebGL capture/raster rendering failed.');
}

let wPlanarTransformedLayerCache;
const wPlanarTransformedLayerCacheList = [];
const zPlanarInputLayerCache = {
    key: null,
    canvas: null,
    ctx: null
};
const zFlowLayerCache = {
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

function appendCurrentFunctionStateToCacheKey(parts) {
    if (state.currentFunction === 'mobius') {
        appendPointToCacheKey(parts, 'mA', state.mobiusA);
        appendPointToCacheKey(parts, 'mB', state.mobiusB);
        appendPointToCacheKey(parts, 'mC', state.mobiusC);
        appendPointToCacheKey(parts, 'mD', state.mobiusD);
        return;
    }

    if (state.currentFunction === 'polynomial') {
        const polyDegree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        parts.push(`polyN:${polyDegree}`);
        for (let i = 0; i <= polyDegree; i++) {
            appendPointToCacheKey(parts, `p${i}`, (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null);
        }
    }
    
    if (state.currentFunction === 'power') {
        parts.push(`fracN:${toCacheKeyNumber(state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5)}`);
    }
}

function buildPlanarLayerCacheKey(isWPlane) {
    const params = isWPlane ? wPlaneParams : zPlaneParams;
    let keyParts = [
        `f:${state.currentFunction}`,
        `taylor:${isWPlane && state.taylorSeriesEnabled ? 1 : 0}`,
        `shape:${state.currentInputShape}`,
        `grid:${state.gridDensity}`,
        `zetaC:${state.zetaContinuationEnabled ? 1 : 0}`,
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

        `imgSize:${toCacheKeyNumber(state.imageSize)}`,
        `imgOpacity:${toCacheKeyNumber(state.imageOpacity)}`,
        `imgVer:${state.imageContentVersion || 0}`,

        `vidFps:${state.videoProcessingFps || 0}`,
        `vidSize:${toCacheKeyNumber(state.videoSize)}`,
        `vidOpacity:${toCacheKeyNumber(state.videoOpacity)}`,
        `vidVer:${state.videoFrameVersion || 0}`,
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

    appendCurrentFunctionStateToCacheKey(keyParts);

    if (isWPlane) {
        if (state.taylorSeriesEnabled) {
            appendPointToCacheKey(keyParts, 'tC', state.taylorSeriesCenter);
            keyParts.push(`tO:${state.taylorSeriesOrder}`);
        }
        if (state.chainingEnabled) {
            keyParts.push(`cM:${state.chainingMode}`);
        }
    }
    return keyParts.join('|');
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

function shouldUseWPlanarTransformedLayerCache() {
    if (state.riemannSphereViewEnabled || state.splitViewEnabled) return false;
    if (state.currentInputShape === 'video') return false;
    if (state.panStateZ && state.panStateZ.isPanning) return false;
    if (state.panStateW && state.panStateW.isPanning) return false;
    return true;
}

function shouldUseZPlanarInputLayerCache() {
    if (state.vectorFieldEnabled) return false;
    if (state.riemannSphereViewEnabled && !state.splitViewEnabled) return false;
    if (state.currentInputShape === 'video') return false;
    if (state.panStateZ && state.panStateZ.isPanning) return false;
    return true;
}

function appendManualSeedPointsToCacheKey(parts, seedPoints) {
    const points = Array.isArray(seedPoints) ? seedPoints : [];
    parts.push(`manualSeeds:${points.length}`);
    points.forEach((point, index) => appendPointToCacheKey(parts, `seed${index}`, point));
}

function buildZFlowLayerCacheKey() {
    const keyParts = [
        buildPlanarLayerCacheKey(false),
        `flow:${(state.vectorFieldEnabled || state.streamlineFlowEnabled) ? 1 : 0}`,
        `vfMode:${state.vectorFieldFunction}`,
        `stream:${state.streamlineFlowEnabled ? 1 : 0}`,
        `vfScale:${toCacheKeyNumber(state.vectorFieldScale)}`,
        `vfThick:${toCacheKeyNumber(state.vectorArrowThickness)}`,
        `vfHead:${toCacheKeyNumber(state.vectorArrowHeadSize)}`,
        `domB:${toCacheKeyNumber(state.domainBrightness)}`,
        `domC:${toCacheKeyNumber(state.domainContrast)}`,
        `domS:${toCacheKeyNumber(state.domainSaturation)}`,
        `domL:${toCacheKeyNumber(state.domainLightnessCycles)}`,
        `sStep:${toCacheKeyNumber(state.streamlineStepSize)}`,
        `sMax:${state.streamlineMaxLength}`,
        `sThick:${toCacheKeyNumber(state.streamlineThickness)}`,
        `sSeed:${toCacheKeyNumber(state.streamlineSeedDensityFactor)}`
    ];

    appendManualSeedPointsToCacheKey(keyParts, state.manualSeedPoints);
    return keyParts.join('|');
}

function shouldUseZFlowLayerCache() {
    if (!(state.vectorFieldEnabled || state.streamlineFlowEnabled)) return false;
    if (state.riemannSphereViewEnabled && !state.splitViewEnabled) return false;
    if (state.panStateZ && state.panStateZ.isPanning) return false;
    return true;
}

function renderZPlaneFlowLayer(targetCtx, planeParams) {
    if (state.streamlineFlowEnabled) {
        drawPlaneLayer(targetCtx, planeParams, 'z', layerCtx => {
            drawStreamlinesOnZPlane(layerCtx, planeParams, state);
        }, 'capture');
        return;
    }

    drawZPlaneVectorField(targetCtx, planeParams, state.currentFunction, state.vectorFieldFunction);
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
            drawRiemannSphereBase(layerCtx, cSP);
            drawSphereGridAndShape(layerCtx, cSP, false);
            if (state.probeActive) {
                drawSphereProbeAndNeighborhood(layerCtx, cSP, state.probeZ, state.probeNeighborhoodSize, null);
            }
        }, 'capture');
    }else{ 
        
        if(state.domainColoringEnabled && domainColoringDirty){renderPlanarDomainColoring(zDomainColorCtx,zPlaneParams,false,curFunc);} 
        const drawReferenceGrid =
            !state.vectorFieldEnabled &&
            !state.streamlineFlowEnabled &&
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
        if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
            zPlanarInputLayerCache.key = null;
            const useCachedFlowLayer = shouldUseZFlowLayerCache();
            if (useCachedFlowLayer) {
                const cacheCanvas = ensurePlanarLayerCacheCanvas(zFlowLayerCache, zPlaneParams.width, zPlaneParams.height);
                const cacheCtx = zFlowLayerCache.ctx;
                const cacheKey = buildZFlowLayerCacheKey();
                if (cacheCanvas && cacheCtx) {
                    if (zFlowLayerCache.key !== cacheKey) {
                        cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                        cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                        renderZPlaneFlowLayer(cacheCtx, zPlaneParams);
                        zFlowLayerCache.key = cacheKey;
                    }
                    zCtx.drawImage(cacheCanvas, 0, 0);
                } else {
                    renderZPlaneFlowLayer(zCtx, zPlaneParams);
                }
            } else {
                zFlowLayerCache.key = null;
                renderZPlaneFlowLayer(zCtx, zPlaneParams);
            }
        } else {
            zFlowLayerCache.key = null;
            const useCachedInputLayer = shouldUseZPlanarInputLayerCache();
            if (useCachedInputLayer) {
                const cacheCanvas = ensurePlanarLayerCacheCanvas(zPlanarInputLayerCache, zPlaneParams.width, zPlaneParams.height);
                const cacheCtx = zPlanarInputLayerCache.ctx;
                const cacheKey = buildPlanarLayerCacheKey(false);
                if (cacheCanvas && cacheCtx) {
                    if (zPlanarInputLayerCache.key !== cacheKey) {
                        cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                        cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                        drawPlanarInputShapeHybrid(cacheCtx, zPlaneParams, 'z');
                        zPlanarInputLayerCache.key = cacheKey;
                    }
                    zCtx.drawImage(cacheCanvas, 0, 0);
                } else {
                    drawPlanarInputShapeHybrid(zCtx, zPlaneParams, 'z');
                }
            } else {
                zPlanarInputLayerCache.key = null;
                drawPlanarInputShapeHybrid(zCtx, zPlaneParams, 'z');
            }

            if (state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare') {
                drawPlaneLayer(zCtx, zPlaneParams, 'z', (layerCtx) => {
                    drawPlanarInputOverlays(layerCtx, zPlaneParams);
                }, 'raster');
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
    const baseFunc = transformFunctions[state.currentFunction];
    if (state.fourierModeEnabled || state.laplaceModeEnabled) {
        // Ensure lists exist to prevent errors during early setup
        if (!wCanvasList || wCanvasList.length === 0) return;
        _renderSingleWPlaneMode(0, baseFunc, true);
        return;
    }
    
    if (!wCanvasList || wCanvasList.length === 0) return;
    
    let curFunc = baseFunc;
    const count = state.chainingEnabled ? state.chainCount : 1;
    for (let i = 0; i < count; i++) {
        if (i >= wCanvasList.length) break;
        _renderSingleWPlaneMode(i, curFunc, false);
        
        // Prepare composed function for next recursive iteration
        const prevFunc = curFunc;
        switch(state.chainingMode) {
            case 'power':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    const w0 = baseFunc(re, im);
                    return complexMul(temp, w0);
                };
                break;
            case 'sqrt':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexPow(temp.re, temp.im, 0.5, 0);
                };
                break;
            case 'ln':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexLn(temp.re, temp.im);
                };
                break;
            case 'exp':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexExp(temp.re, temp.im);
                };
                break;
            case 'reciprocal':
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return complexReciprocal(temp.re, temp.im);
                };
                break;
            case 'recursion':
            default:
                curFunc = (re, im) => {
                    const temp = prevFunc(re, im);
                    return baseFunc(temp.re, temp.im);
                };
                break;
        }
    }
}

function _renderSingleWPlaneMode(index, curFunc, isSpecialMode) {
    while (wPlanarTransformedLayerCacheList.length <= index) {
        wPlanarTransformedLayerCacheList.push({ key: null, canvas: null, ctx: null });
    }
    const origWPlanarTransformedLayerCache = wPlanarTransformedLayerCache;
    wPlanarTransformedLayerCache = wPlanarTransformedLayerCacheList[index];

    const origWCanvas = wCanvas;
    const origWCtx = wCtx;
    const origWPlaneParams = wPlaneParams;
    const origWPlotlyContainer = controls.wPlanePlotlyContainer;
    const origSphereParamsW = sphereViewParams.w;

    wCanvas = wCanvasList[index];
    wCtx = wCtxList[index];
    wPlaneParams = wPlaneParamsList[index];
    controls.wPlanePlotlyContainer = wPlanePlotlyContainersList[index];
    sphereViewParams.w = sphereViewWParamsList[index];

    try {
        if (isSpecialMode) {
            if (state.fourierModeEnabled) {
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawWindingVisualization(layerCtx, state.fourierTimeDomainSignal, wPlaneParams);
                }, 'raster');
            } else if (state.laplaceModeEnabled) {
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawLaplaceWindingVisualization(layerCtx, state.laplaceTimeDomainSignal, wPlaneParams);
                }, 'raster');
            }
            return;
        }
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
                drawTaylorAxes(
                    layerCtx,
                    wPlaneParams,
                    state.taylorSeriesColorAxisX,
                    state.taylorSeriesColorAxisY,
                    'Re(w_approx)',
                    'Im(w_approx)'
                );
            }, 'raster');
            const useCachedTaylorLayer = shouldUseWPlanarTransformedLayerCache();
            if (useCachedTaylorLayer) {
                const cacheCanvas = ensurePlanarLayerCacheCanvas(wPlanarTransformedLayerCache, wPlaneParams.width, wPlaneParams.height);
                const cacheCtx = wPlanarTransformedLayerCache.ctx;
                const cacheKey = buildPlanarLayerCacheKey(true);

                if (cacheCanvas && cacheCtx) {
                    if (wPlanarTransformedLayerCache.key !== cacheKey) {
                        cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                        cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                        drawPlanarTaylorApproximation(
                            cacheCtx,
                            wPlaneParams,
                            state.currentFunction,
                            state.taylorSeriesCenter,
                            state.taylorSeriesOrder,
                            state.taylorSeriesColorAxisX,
                            state.taylorSeriesColorAxisY,
                            { includeAxes: false }
                        );
                        wPlanarTransformedLayerCache.key = cacheKey;
                    }
                    wCtx.drawImage(cacheCanvas, 0, 0);
                } else {
                    drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                        drawPlanarTaylorApproximation(
                            layerCtx,
                            wPlaneParams,
                            state.currentFunction,
                            state.taylorSeriesCenter,
                            state.taylorSeriesOrder,
                            state.taylorSeriesColorAxisX,
                            state.taylorSeriesColorAxisY,
                            { includeAxes: false }
                        );
                    }, 'capture');
                }
            } else {
                wPlanarTransformedLayerCache.key = null;
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawPlanarTaylorApproximation(
                        layerCtx,
                        wPlaneParams,
                        state.currentFunction,
                        state.taylorSeriesCenter,
                        state.taylorSeriesOrder,
                        state.taylorSeriesColorAxisX,
                        state.taylorSeriesColorAxisY,
                        { includeAxes: false }
                    );
                }, 'capture');
            }
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
                    drawRiemannSphereBase(layerCtx, cSP);
                    drawSphereGridAndShape(layerCtx, cSP, true, curFunc);
                }, 'capture');
            } else { // Planar w-plane view
                const useCachedLayer = shouldUseWPlanarTransformedLayerCache();
                if (useCachedLayer) {
                    const cacheCanvas = ensurePlanarLayerCacheCanvas(wPlanarTransformedLayerCache, wPlaneParams.width, wPlaneParams.height);
                    const cacheCtx = wPlanarTransformedLayerCache.ctx;
                    const cacheKey = buildPlanarLayerCacheKey(true);
                    if (cacheCanvas && cacheCtx) {
                        if (wPlanarTransformedLayerCache.key !== cacheKey) {
                            cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
                            cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
                            if (index === 0) {
                                drawPlanarTransformedShapeHybrid(cacheCtx, wPlaneParams, curFunc, 'w');
                            } else {
                                drawPlanarTransformedShape(cacheCtx, wPlaneParams, curFunc, { index });
                            }
                            wPlanarTransformedLayerCache.key = cacheKey;
                        }
                        wCtx.drawImage(cacheCanvas, 0, 0);
                    } else {
                        if (index === 0) {
                            drawPlanarTransformedShapeHybrid(wCtx, wPlaneParams, curFunc, 'w');
                        } else {
                            drawPlanarTransformedShape(wCtx, wPlaneParams, curFunc, { index });
                        }
                    }
                } else {
                    wPlanarTransformedLayerCache.key = null;
                    if (index === 0) {
                        drawPlanarTransformedShapeHybrid(wCtx, wPlaneParams, curFunc, 'w');
                    } else {
                        drawPlanarTransformedShape(wCtx, wPlaneParams, curFunc, { index });
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
                }, 'capture');
            } else { // Planar W-plane
                drawPlaneLayer(wCtx, wPlaneParams, 'w', (layerCtx) => {
                    drawPlanarTransformedProbe(layerCtx, wPlaneParams, curFunc, index);
                }, 'capture');
            }
        }

        if (!isRiemannW) { // Only for planar w-plane
            if (index === 0) updateWindingNumberDisplay(curFunc);
        }
    }
    } finally {
        wCanvas = origWCanvas;
        wCtx = origWCtx;
        wPlaneParams = origWPlaneParams;
        controls.wPlanePlotlyContainer = origWPlotlyContainer;
        sphereViewParams.w = origSphereParamsW;
        wPlanarTransformedLayerCache = origWPlanarTransformedLayerCache;
    }
} // Closing brace for _renderSingleWPlaneMode
