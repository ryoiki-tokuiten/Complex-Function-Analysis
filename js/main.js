
function requestRedrawAll(){
    if(!redrawRequest){
        redrawRequest = requestAnimationFrame(() => {
            try {
                const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
                if(state.showZerosPoles && zIsPlanar && state.currentFunction !== 'poincare') findZerosAndPoles(); else { state.zeros = []; state.poles = [];}
                if(state.showCriticalPoints && zIsPlanar && state.currentFunction !== 'poincare') findCriticalPoints(); else { state.criticalPoints = []; state.criticalValues = [];}

                updateTaylorSeriesCenterAndRadius(); 
                performCauchyAnalysis();

                drawZPlaneContent();
                drawWPlaneContent();
                updateTitlesAndGlobalUI();
                
                // Handle Laplace 3D surface rendering
                if (state.laplaceModeEnabled) {
                    const laplace3DColumn = document.getElementById('laplace_3d_column');
                    if (laplace3DColumn) {
                        laplace3DColumn.classList.remove('hidden');
                        // Trigger 3D surface render
                        if (typeof drawLaplace3DSurface === 'function') {
                            drawLaplace3DSurface('laplace_3d_container');
                        }
                    }
                } else {
                    const laplace3DColumn = document.getElementById('laplace_3d_column');
                    if (laplace3DColumn) {
                        laplace3DColumn.classList.add('hidden');
                    }
                }

                domainColoringDirty = false;
                redrawRequest = null;

                
                if (state.particleAnimationEnabled) {
                    requestRedrawAll();
                }
            } catch (error) {
                console.error("Error during redraw (requestAnimationFrame):", error);
                redrawRequest = null; 
            }
        });
    }
}

function redrawAll(){
    try {
        const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
        if(state.showZerosPoles && zIsPlanar && state.currentFunction !== 'poincare') findZerosAndPoles(); else { state.zeros = []; state.poles = [];}
        if(state.showCriticalPoints && zIsPlanar && state.currentFunction !== 'poincare') findCriticalPoints(); else { state.criticalPoints = []; state.criticalValues = [];}

        updateTaylorSeriesCenterAndRadius(); 
        performCauchyAnalysis();
        drawZPlaneContent();
        drawWPlaneContent();
        updateTitlesAndGlobalUI();
        
        // Handle Laplace 3D surface rendering
        if (state.laplaceModeEnabled) {
            const laplace3DColumn = document.getElementById('laplace_3d_column');
            if (laplace3DColumn) {
                laplace3DColumn.classList.remove('hidden');
                if (typeof drawLaplace3DSurface === 'function') {
                    drawLaplace3DSurface('laplace_3d_container');
                }
            }
        } else {
            const laplace3DColumn = document.getElementById('laplace_3d_column');
            if (laplace3DColumn) {
                laplace3DColumn.classList.add('hidden');
            }
        }
        
        domainColoringDirty = false;
    } catch (error) {
        console.error("Error during redraw (direct call):", error);
    }
}


function setup() {
    setupDOMReferences(); // Call this first to initialize zCanvas, wCanvas, and other essential controls.

    // These specific controls are still fine to get here if not covered by setupDOMReferences,
    // or if setupDOMReferences is more generic.
    // However, zCanvas and wCanvas MUST be set by setupDOMReferences before setupVisualParameters.
    controls.enablePlotly3DCb = document.getElementById('enable_plotly_3d_cb');
    controls.wPlanePlotlyContainer = document.getElementById('w_plane_plotly_container');
    controls.plotly3DOptionsDiv = document.getElementById('plotly_3d_options_div');
    controls.toggleSphereAxesGridCb = document.getElementById('toggle_sphere_axes_grid_cb');
    controls.riemannSphereOptionsDiv = document.getElementById('riemann_sphere_options_div'); // New
    controls.plotlySphereOpacitySlider = document.getElementById('plotly_sphere_opacity_slider'); // New
    controls.plotlySphereOpacityValueDisplay = document.getElementById('plotly_sphere_opacity_value_display'); // New
    controls.plotlyGridDensitySlider = document.getElementById('plotly_grid_density_slider'); // New
    controls.plotlyGridDensityValueDisplay = document.getElementById('plotly_grid_density_value_display'); // New
    controls.togglePlotlySphereGridCb = document.getElementById('toggle_plotly_sphere_grid_cb'); // New

    try {
        setupVisualParameters(true, true); // Now zCanvas and wCanvas should be defined.

        
    state.plotlySphereOpacity = 0.10; // Updated default opacity
    state.plotlyGridDensity = 12; // New: Default for Plotly sphere grid density
    state.showPlotlySphereGrid = true; // New: Default for showing sphere surface grid
    state.mobiusA = { re: 1, im: 0 };
    state.mobiusB = { re: 0, im: 0 };
    state.mobiusC = { re: 0, im: 0 };
    state.mobiusD = { re: 1, im: 0 };

    
    sliderParamKeys.forEach(k => {
        if (controls[`${k}Slider`]) {
            state[k] = parseFloat(controls[`${k}Slider`].value);
        }
    });

    
    
    
    

    if(controls.stripY1Slider) state.stripY1 = parseFloat(controls.stripY1Slider.value);
    if(controls.stripY2Slider) state.stripY2 = parseFloat(controls.stripY2Slider.value);
    if(controls.sectorAngle1Slider) state.sectorAngle1 = parseFloat(controls.sectorAngle1Slider.value);
    if(controls.sectorAngle2Slider) state.sectorAngle2 = parseFloat(controls.sectorAngle2Slider.value);
    if(controls.sectorRMinSlider) state.sectorRMin = parseFloat(controls.sectorRMinSlider.value);
    if(controls.sectorRMaxSlider) state.sectorRMax = parseFloat(controls.sectorRMaxSlider.value);

    if(controls.enableVectorFieldCb) state.vectorFieldEnabled = controls.enableVectorFieldCb.checked;
    if(controls.vectorFieldOptionsDiv) controls.vectorFieldOptionsDiv.classList.toggle('hidden', !state.vectorFieldEnabled);
    if(controls.vectorFieldFunctionSelector) state.vectorFieldFunction = controls.vectorFieldFunctionSelector.value;
    if(controls.vectorFieldScaleSlider) state.vectorFieldScale = parseFloat(controls.vectorFieldScaleSlider.value);
    if(controls.vectorArrowThicknessSlider) state.vectorArrowThickness = parseFloat(controls.vectorArrowThicknessSlider.value) || 1.5;
    if(controls.vectorArrowHeadSizeSlider) state.vectorArrowHeadSize = parseFloat(controls.vectorArrowHeadSizeSlider.value) || 6;
    if(controls.streamlineStepSizeSlider) state.streamlineStepSize = parseFloat(controls.streamlineStepSizeSlider.value) || 0.02;
    if(controls.streamlineMaxLengthSlider) state.streamlineMaxLength = parseInt(controls.streamlineMaxLengthSlider.value) || 100;
    if(controls.streamlineThicknessSlider) state.streamlineThickness = parseFloat(controls.streamlineThicknessSlider.value) || 1.0;
    if(controls.streamlineSeedDensityFactorSlider) state.streamlineSeedDensityFactor = parseFloat(controls.streamlineSeedDensityFactorSlider.value) || 0.5;

    
    if (controls.showVectorFieldPanelCb) {
        state.showVectorFieldPanelEnabled = controls.showVectorFieldPanelCb.checked;
    } else {
        state.showVectorFieldPanelEnabled = false; 
    }
    
    

    state.gridDensity = parseInt(controls.gridDensitySlider.value);
    if (controls.radialDiscreteStepsCountSlider) {
        state.radialDiscreteStepsCount = parseInt(controls.radialDiscreteStepsCountSlider.value, 10);
    } else {
        state.radialDiscreteStepsCount = DEFAULT_RADIAL_STEPS;
    }
    state.probeNeighborhoodSize = parseFloat(controls.neighborhoodSizeSlider.value);
    state.domainColoringEnabled = controls.enableDomainColoringCb.checked;
    if (controls.domainColoringOptionsDiv) { 
        controls.domainColoringOptionsDiv.classList.toggle('hidden', !state.domainColoringEnabled);
    }
    if (controls.domainColoringKeyDiv) { 
        controls.domainColoringKeyDiv.classList.toggle('hidden', !state.domainColoringEnabled);
    }
    
    if (controls.domainBrightnessSlider) state.domainBrightness = parseFloat(controls.domainBrightnessSlider.value);
    if (controls.domainContrastSlider) state.domainContrast = parseFloat(controls.domainContrastSlider.value);
    if (controls.domainSaturationSlider) state.domainSaturation = parseFloat(controls.domainSaturationSlider.value);
    if (controls.domainLightnessCyclesSlider) state.domainLightnessCycles = parseFloat(controls.domainLightnessCyclesSlider.value);


    state.showZerosPoles = controls.showZerosPolesCb.checked;
    state.showCriticalPoints = controls.showCriticalPointsCb.checked;
    if (controls.enableCauchyIntegralModeCb) state.cauchyIntegralModeEnabled = controls.enableCauchyIntegralModeCb.checked;
    if (controls.enableSplitViewCb) state.splitViewEnabled = controls.enableSplitViewCb.checked;
    if (controls.enableRiemannSphereCb) {
        state.riemannSphereViewEnabled = controls.enableRiemannSphereCb.checked;
        if (controls.riemannSphereOptionsDiv) { // New parent div
            controls.riemannSphereOptionsDiv.classList.toggle('hidden', !state.riemannSphereViewEnabled);
        }
    }
    if (controls.enablePlotly3DCb) {
        state.plotly3DEnabled = controls.enablePlotly3DCb.checked;
        if (controls.plotly3DOptionsDiv) { // This is the sub-options for Plotly 3D
            controls.plotly3DOptionsDiv.classList.toggle('hidden', !state.plotly3DEnabled);
        }
    }
    // controls.wPlanePlotlyContainer is already assigned above

    if (controls.toggleSphereAxesGridCb) { // This is inside plotly3DOptionsDiv
        state.showSphereAxesAndGrid = controls.toggleSphereAxesGridCb.checked;
    }
    // Note: enableSplitViewCb's state is read and handled in its event listener and updateTitlesAndGlobalUI

    if (controls.plotlySphereOpacitySlider) { // New
        state.plotlySphereOpacity = parseFloat(controls.plotlySphereOpacitySlider.value);
    }
    if (controls.plotlyGridDensitySlider) { // New
        state.plotlyGridDensity = parseInt(controls.plotlyGridDensitySlider.value, 10);
    }
    if (controls.togglePlotlySphereGridCb) { // New
        state.showPlotlySphereGrid = controls.togglePlotlySphereGridCb.checked;
    }

    if (controls.enableRadialDiscreteStepsCb) {
        state.radialDiscreteStepsEnabled = controls.enableRadialDiscreteStepsCb.checked;
    } else {
        state.radialDiscreteStepsEnabled = false;
    }

    // Initialize Fourier Transform state
    if (controls.fourierFrequencySlider) state.fourierFrequency = parseFloat(controls.fourierFrequencySlider.value);
    if (controls.fourierAmplitudeSlider) state.fourierAmplitude = parseFloat(controls.fourierAmplitudeSlider.value);
    if (controls.fourierTimeWindowSlider) state.fourierTimeWindow = parseFloat(controls.fourierTimeWindowSlider.value);
    if (controls.fourierSamplesSlider) state.fourierSamples = parseInt(controls.fourierSamplesSlider.value);
    if (controls.fourierFunctionSelector) state.fourierFunction = controls.fourierFunctionSelector.value;
    if (controls.fourierWindingFrequencySlider) state.fourierWindingFrequency = parseFloat(controls.fourierWindingFrequencySlider.value);
    if (controls.fourierWindingTimeSlider) state.fourierWindingTime = parseFloat(controls.fourierWindingTimeSlider.value);

    // Initialize Laplace Transform state
    if (controls.laplaceFrequencySlider) state.laplaceFrequency = parseFloat(controls.laplaceFrequencySlider.value);
    if (controls.laplaceDampingSlider) state.laplaceDamping = parseFloat(controls.laplaceDampingSlider.value);
    if (controls.laplaceSigmaSlider) state.laplaceSigma = parseFloat(controls.laplaceSigmaSlider.value);
    if (controls.laplaceOmegaSlider) state.laplaceOmega = parseFloat(controls.laplaceOmegaSlider.value);
    if (controls.laplaceFunctionSelector) state.laplaceFunction = controls.laplaceFunctionSelector.value;
    if (controls.laplaceShowROCCb) state.laplaceShowROC = controls.laplaceShowROCCb.checked;
    if (controls.laplaceVizModeSelector) state.laplaceVizMode = controls.laplaceVizModeSelector.value;
    if (controls.laplaceClipHeightSlider) state.laplaceClipHeight = parseFloat(controls.laplaceClipHeightSlider.value);
    if (controls.laplaceShowPolesZerosCb) state.laplaceShowPolesZeros = controls.laplaceShowPolesZerosCb.checked;
    if (controls.laplaceShowFourierLineCb) state.laplaceShowFourierLine = controls.laplaceShowFourierLineCb.checked;
    state.laplaceAmplitude = 1.0;
    state.laplaceModeEnabled = false;
    state.laplaceTimeDomainSignal = [];
    state.laplaceSurface = [];
    state.laplacePoles = [];
    state.laplaceZeros = [];

    state.polynomialN = parseInt(controls.polynomialNSlider.value);
    initializePolynomialCoeffs(state.polynomialN, false); 
    generatePolynomialCoeffSliders(); 

    Object.keys(controls.funcButtons).forEach(k => {
        controls.funcButtons[k].classList.remove('active', 'btn-primary');
        controls.funcButtons[k].classList.add('btn-outline-secondary');
    });
    if (controls.funcButtons[state.currentFunction]) {
        controls.funcButtons[state.currentFunction].classList.add('active', 'btn-primary');
        controls.funcButtons[state.currentFunction].classList.remove('btn-outline-secondary');
    } else { 
        state.currentFunction = 'cos'; 
        controls.funcButtons['cos'].classList.add('active', 'btn-primary');
        controls.funcButtons['cos'].classList.remove('btn-outline-secondary');
    }
    controls.inputShapeSelector.value = state.currentInputShape;

    document.querySelectorAll('.animation-speed-selector').forEach(select => {
        let hasSelected1x = false;
        Array.from(select.options).forEach(opt => {
            if (opt.value === "1") {
                opt.selected = true;
                hasSelected1x = true;
            } else {
                opt.selected = false;
            }
        });
        if (!hasSelected1x && select.options.length > 0) {
            const defaultOpt = Array.from(select.options).find(opt => opt.defaultSelected);
            if (defaultOpt) defaultOpt.selected = true;
            else select.options[0].selected = true; 
        }
    });

    setupEventListeners();
    domainColoringDirty = true;
    initializeSectionAnimations();
    initializeTooltips();
    setupCanvasTooltipEvents(); 
    requestRedrawAll(); 
    } catch (error) {
        console.error("Error during setup:", error);
    }
}

function setupCanvasTooltipEvents() {
    if (!controls.zPlaneCanvas) return;

    controls.zPlaneCanvas.addEventListener('mousemove', (event) => {
        try {
            const rect = controls.zPlaneCanvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldCoords = mapCanvasToWorldCoords(mouseX, mouseY, zPlaneParams);

            let foundItem = null;
            const clickRadiusWorld = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
            const tolerance = (clickRadiusWorld / zPlaneParams.width) * 5; 

            
            if (state.poles && state.showZerosPoles) {
                for (const pole of state.poles) {
                    if (Math.abs(pole.re - worldCoords.re) < tolerance && Math.abs(pole.im - worldCoords.im) < tolerance) {
                        let content = `<b>Singularity</b><br>z = ${pole.re.toFixed(3)} + ${pole.im.toFixed(3)}i`;
                        content += `<br>Type: ${pole.type || 'Unknown'}`;
                        if (pole.type === 'pole' && pole.order) {
                            content += `<br>Order: ${pole.order}`;
                        }
                        if (pole.residue && typeof pole.residue.re === 'number' && typeof pole.residue.im === 'number' &&
                            isFinite(pole.residue.re) && isFinite(pole.residue.im)) {
                            content += `<br>Residue: ${pole.residue.re.toFixed(3)} + ${pole.residue.im.toFixed(3)}i`;
                        }
                        foundItem = content;
                        break;
                    }
                }
            }

            
            if (!foundItem && state.zeros && state.showZerosPoles) {
                for (const zero of state.zeros) {
                    if (Math.abs(zero.re - worldCoords.re) < tolerance && Math.abs(zero.im - worldCoords.im) < tolerance) {
                        foundItem = `<b>Zero</b><br>z = ${zero.re.toFixed(3)} + ${zero.im.toFixed(3)}i`;
                        
                        break;
                    }
                }
            }

            
            if (!foundItem && state.criticalPoints && state.showCriticalPoints) {
                for (const cp of state.criticalPoints) {
                    if (Math.abs(cp.re - worldCoords.re) < tolerance && Math.abs(cp.im - worldCoords.im) < tolerance) {
                        foundItem = `<b>Critical Point</b><br>z = ${cp.re.toFixed(3)} + ${cp.im.toFixed(3)}i`;
                        
                        break;
                    }
                }
            }

            if (foundItem) {
                showDynamicTooltip(foundItem, event.pageX, event.pageY);
            } else {
                hideDynamicTooltip();
            }
        } catch (error) {
            console.error("Error in zPlaneCanvas mousemove listener for tooltips:", error);
        }
    });

    controls.zPlaneCanvas.addEventListener('mouseout', () => {
        try {
            hideDynamicTooltip();
        } catch (error) {
            console.error("Error in zPlaneCanvas mouseout listener for tooltips:", error);
        }
    });
}


window.addEventListener('load', () => {
    setup(); 

    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500); 
    }
});
window.addEventListener('resize', () => {
    setupVisualParameters(false, false); 
    domainColoringDirty = true;
    requestRedrawAll();
});
