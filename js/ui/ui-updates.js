function updateSliderLabelsAndDisplay() {
    try {
        const isFourierMode = state.fourierModeEnabled;
        
        // If in Fourier mode, hide all complex function-related controls
        if (isFourierMode) {
            controls.commonParamsSliders.classList.add('hidden');
            controls.mobiusParamsSliders.classList.add('hidden');
            controls.polynomialParamsSliders.classList.add('hidden');
            controls.shapeParamsSliders.classList.add('hidden');
            controls.stripHorizontalParamsSliders.classList.add('hidden');
            controls.sectorAngularParamsSliders.classList.add('hidden');
            // Don't return yet - we still need to update Fourier-specific displays
        } else {
            // Normal complex function mode
            const isLine = state.currentInputShape === 'line';
            const isCircle = state.currentInputShape === 'circle';
            const isEllipse = state.currentInputShape === 'ellipse';
            const isHyperbola = state.currentInputShape === 'hyperbola';
            const isMobiusFunc = state.currentFunction === 'mobius';
            const isPolyFunc = state.currentFunction === 'polynomial';
            const isStripH = state.currentInputShape === 'strip_horizontal';
            const isSectorA = state.currentInputShape === 'sector_angular';

            const showCommonParams = isLine || isCircle || isEllipse || isHyperbola;
            controls.commonParamsSliders.classList.toggle('hidden', !showCommonParams);
            controls.mobiusParamsSliders.classList.toggle('hidden', !isMobiusFunc);
            controls.polynomialParamsSliders.classList.toggle('hidden', !isPolyFunc);
            const showShapeSpecificSliders = isCircle || isEllipse || isHyperbola;
            controls.shapeParamsSliders.classList.toggle('hidden', !showShapeSpecificSliders);

            if (showShapeSpecificSliders) {
                controls.circleRSliderGroup.classList.toggle('hidden', !isCircle);
                controls.ellipseParamsSliderGroup.classList.toggle('hidden', !isEllipse);
                controls.hyperbolaParamsSliderGroup.classList.toggle('hidden', !isHyperbola);
            }
            controls.stripHorizontalParamsSliders.classList.toggle('hidden', !isStripH);
            controls.sectorAngularParamsSliders.classList.toggle('hidden', !isSectorA);

            if (showCommonParams) {
                if (isLine) {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Fixed Re(z) (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Fixed Im(z) (<code>b<sub>0</sub></code>):`;
                } else {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Center Re(z<sub>0</sub>) (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Center Im(z<sub>0</sub>) (<code>b<sub>0</sub></code>):`;
                }
            }

            sliderParamKeys.forEach(k => {
                if (controls[`${k}ValueDisplay`] && typeof state[k] === 'number' && !isNaN(state[k]) && controls[`${k}Slider`]) {
                    const v = state[k]; const s = controls[`${k}Slider`]; const st = parseFloat(s.step);
                    const p = st.toString().includes('.') ? st.toString().split('.')[1].length : 0;
                    controls[`${k}ValueDisplay`].textContent = v.toFixed(Math.max(p, (k === 'a0' || k === 'b0' || k === 'circleR' ? 2 : 1)));
                }
            });

            if (isMobiusFunc) {
                ['A', 'B', 'C', 'D'].forEach(param => {
                    if (state[`mobius${param}`]) {
                        if (controls[`mobius${param}_re_value_display`]) {
                            controls[`mobius${param}_re_value_display`].textContent = state[`mobius${param}`].re.toFixed(1);
                        }
                        if (controls[`mobius${param}_im_value_display`]) {
                            controls[`mobius${param}_im_value_display`].textContent = state[`mobius${param}`].im.toFixed(1);
                        }
                    }
                });
            }

            if (isStripH) { if (controls.stripY1ValueDisplay) controls.stripY1ValueDisplay.textContent = state.stripY1.toFixed(1); if (controls.stripY2ValueDisplay) controls.stripY2ValueDisplay.textContent = state.stripY2.toFixed(1); }
            if (isSectorA) { if (controls.sectorAngle1ValueDisplay) controls.sectorAngle1ValueDisplay.textContent = state.sectorAngle1.toFixed(0); if (controls.sectorAngle2ValueDisplay) controls.sectorAngle2ValueDisplay.textContent = state.sectorAngle2.toFixed(0); if (controls.sectorRMinValueDisplay) controls.sectorRMinValueDisplay.textContent = state.sectorRMin.toFixed(1); if (controls.sectorRMaxValueDisplay) controls.sectorRMaxValueDisplay.textContent = state.sectorRMax.toFixed(1); }
            if (isPolyFunc) { if (controls.polynomialNValueDisplay) controls.polynomialNValueDisplay.textContent = state.polynomialN; updatePolynomialCoeffDisplays(); }
        } // End else block for normal complex function mode

    // Only update and show these controls if NOT in Fourier mode
    if (!isFourierMode) {
        if (controls.gridDensityValueDisplay) controls.gridDensityValueDisplay.textContent = state.gridDensity;
        if (controls.neighborhoodSizeValueDisplay) controls.neighborhoodSizeValueDisplay.textContent = state.probeNeighborhoodSize.toFixed(2);
        if (controls.zPlaneZoomValueDisplay) controls.zPlaneZoomValueDisplay.textContent = state.zPlaneZoom.toFixed(2);
        if (controls.zPlaneZoomSlider) controls.zPlaneZoomSlider.value = state.zPlaneZoom;
        if (controls.wPlaneZoomValueDisplay) controls.wPlaneZoomValueDisplay.textContent = state.wPlaneZoom.toFixed(2);
        if (controls.wPlaneZoomSlider) controls.wPlaneZoomSlider.value = state.wPlaneZoom;
        if (controls.vectorFieldScaleValueDisplay) controls.vectorFieldScaleValueDisplay.textContent = state.vectorFieldScale.toFixed(2);
        if (controls.vectorArrowThicknessValueDisplay && controls.vectorArrowThicknessSlider) {
            controls.vectorArrowThicknessValueDisplay.textContent = state.vectorArrowThickness.toFixed(1);
        }
        if (controls.vectorArrowHeadSizeValueDisplay && controls.vectorArrowHeadSizeSlider) {
            controls.vectorArrowHeadSizeValueDisplay.textContent = state.vectorArrowHeadSize.toFixed(1);
        }

        
        if (controls.domainBrightnessValueDisplay) controls.domainBrightnessValueDisplay.textContent = state.domainBrightness.toFixed(2);
        if (controls.domainContrastValueDisplay) controls.domainContrastValueDisplay.textContent = state.domainContrast.toFixed(2);
        if (controls.domainSaturationValueDisplay) controls.domainSaturationValueDisplay.textContent = state.domainSaturation.toFixed(2);
        if (controls.domainLightnessCyclesValueDisplay) controls.domainLightnessCyclesValueDisplay.textContent = state.domainLightnessCycles.toFixed(2);

        if (controls.radialDiscreteStepsCountValueDisplay && typeof state.radialDiscreteStepsCount === 'number') {
            controls.radialDiscreteStepsCountValueDisplay.textContent = state.radialDiscreteStepsCount;
        }

        if (controls.taylorSeriesOrderValueDisplay && controls.taylorSeriesOrderSlider) {
            controls.taylorSeriesOrderValueDisplay.textContent = state.taylorSeriesOrder;
        }
    } // End if (!isFourierMode)

    if (controls.taylorSeriesOptionsDetailDiv && controls.enableTaylorSeriesCb) {
        controls.taylorSeriesOptionsDetailDiv.classList.toggle('hidden', !state.taylorSeriesEnabled);
        controls.enableTaylorSeriesCb.checked = state.taylorSeriesEnabled;
    }

    if (controls.taylorSeriesCustomCenterInputsDiv && controls.enableTaylorSeriesCustomCenterCb) {
        controls.taylorSeriesCustomCenterInputsDiv.classList.toggle('hidden', !state.taylorSeriesCustomCenterEnabled);
        controls.enableTaylorSeriesCustomCenterCb.checked = state.taylorSeriesCustomCenterEnabled;
    }
    if (controls.taylorSeriesCustomCenterReInput) {
        controls.taylorSeriesCustomCenterReInput.value = state.taylorSeriesCustomCenter.re.toFixed(1);
    }
    if (controls.taylorSeriesCustomCenterImInput) {
        controls.taylorSeriesCustomCenterImInput.value = state.taylorSeriesCustomCenter.im.toFixed(1);
    }

    const streamlineFlowCheckbox = controls.enableStreamlineFlowCb || document.getElementById('enable_streamline_flow_cb');
    if (streamlineFlowCheckbox) {
        streamlineFlowCheckbox.checked = state.streamlineFlowEnabled;
    }
    
    if (controls.streamlineOptionsDetailsDiv && controls.enableStreamlineFlowCb) {
        controls.streamlineOptionsDetailsDiv.classList.toggle('hidden', !state.streamlineFlowEnabled);
    }
    if (controls.streamlineStepSizeValueDisplay && controls.streamlineStepSizeSlider) {
        controls.streamlineStepSizeValueDisplay.textContent = state.streamlineStepSize.toFixed(3);
    }
    if (controls.streamlineMaxLengthValueDisplay && controls.streamlineMaxLengthSlider) {
        controls.streamlineMaxLengthValueDisplay.textContent = state.streamlineMaxLength;
    }
    if (controls.streamlineThicknessValueDisplay && controls.streamlineThicknessSlider) {
        controls.streamlineThicknessValueDisplay.textContent = state.streamlineThickness.toFixed(1);
    }
    if (controls.streamlineSeedDensityFactorValueDisplay && controls.streamlineSeedDensityFactorSlider) {
        controls.streamlineSeedDensityFactorValueDisplay.textContent = state.streamlineSeedDensityFactor.toFixed(2);
    }

    
    if (controls.particleDensityValueDisplay && controls.particleDensitySlider) {
        controls.particleDensityValueDisplay.textContent = state.particleDensity;
    }
    if (controls.particleSpeedValueDisplay && controls.particleSpeedSlider) {
        controls.particleSpeedValueDisplay.textContent = state.particleSpeed.toFixed(3);
    }
    if (controls.particleMaxLifetimeValueDisplay && controls.particleMaxLifetimeSlider) {
        controls.particleMaxLifetimeValueDisplay.textContent = state.particleMaxLifetime;
    }

    if (controls.enableParticleAnimationCb) {
        controls.enableParticleAnimationCb.checked = state.particleAnimationEnabled;
    }
    if (controls.particleAnimationDetailsDiv) {
        controls.particleAnimationDetailsDiv.classList.toggle('hidden', !state.particleAnimationEnabled);
    }

    
    if (controls.showVectorFieldPanelCb) { 
        controls.showVectorFieldPanelCb.checked = state.showVectorFieldPanelEnabled; 
    }
    if (controls.vectorFlowOptionsContent) {
        controls.vectorFlowOptionsContent.classList.toggle('hidden', !state.showVectorFieldPanelEnabled); 
    }

    if (controls.plotlySphereOpacityValueDisplay && controls.plotlySphereOpacitySlider) { // New
        controls.plotlySphereOpacityValueDisplay.textContent = state.plotlySphereOpacity.toFixed(2);
    }
    if (controls.plotlyGridDensityValueDisplay && controls.plotlyGridDensitySlider) { // New
        controls.plotlyGridDensityValueDisplay.textContent = state.plotlyGridDensity;
    }

    // Fourier Transform display updates
    if (controls.fourierFrequencyValueDisplay) {
        controls.fourierFrequencyValueDisplay.textContent = state.fourierFrequency.toFixed(2);
    }
    if (controls.fourierAmplitudeValueDisplay) {
        controls.fourierAmplitudeValueDisplay.textContent = state.fourierAmplitude.toFixed(2);
    }
    if (controls.fourierTimeWindowValueDisplay) {
        controls.fourierTimeWindowValueDisplay.textContent = state.fourierTimeWindow.toFixed(2);
    }
    if (controls.fourierSamplesValueDisplay) {
        controls.fourierSamplesValueDisplay.textContent = state.fourierSamples;
    }
    if (controls.fourierWindingFrequencyValueDisplay) {
        controls.fourierWindingFrequencyValueDisplay.textContent = state.fourierWindingFrequency.toFixed(1);
    }
    if (controls.fourierWindingTimeValueDisplay) {
        controls.fourierWindingTimeValueDisplay.textContent = Math.round(state.fourierWindingTime * 100);
    }

    
    } catch (error) {
        console.error("Error in updateSliderLabelsAndDisplay:", error);
    }
}

function updateProbeInfo(){
    try {
        const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
        
    if(state.probeActive && zIsPlanar && !state.panStateZ.isPanning && !state.panStateW.isPanning){
        // Skip probe info in Fourier mode
        if (state.fourierModeEnabled) {
            controls.zPlaneProbeInfo.classList.add('hidden');
            controls.wPlaneProbeInfo.classList.add('hidden');
            return;
        }
        
        const z_str = `z = ${state.probeZ.re.toFixed(3)} + ${state.probeZ.im.toFixed(3)}i`;
        controls.zPlaneProbeInfo.innerHTML = z_str; controls.zPlaneProbeInfo.classList.remove('hidden');
        const tf = transformFunctions[state.currentFunction]; const pW = tf(state.probeZ.re, state.probeZ.im);
        let w_info = "";
        if(!isNaN(pW.re) && !isNaN(pW.im) && isFinite(pW.re) && isFinite(pW.im)){
            w_info += `w = ${pW.re.toFixed(3)} + ${pW.im.toFixed(3)}i<br>`;
            
            if (state.currentFunction === 'poincare') {
                w_info += "f'(z): N/A for Poincare map<br>";
                w_info += "Conformality: N/A<br>";
            } else {
                const deriv = numericDerivative(state.currentFunction, state.probeZ);
                if(!isNaN(deriv.re) && !isNaN(deriv.im) && isFinite(deriv.re) && isFinite(deriv.im)){
                    w_info += `f'(z) ≈ ${deriv.re.toFixed(3)} + ${deriv.im.toFixed(3)}i<br>`;
                    const mag_deriv_sq = deriv.re*deriv.re + deriv.im*deriv.im;
                    const isConformal = (mag_deriv_sq > CRITICAL_POINT_EPSILON * CRITICAL_POINT_EPSILON); 
                    w_info += isConformal ? "Conformal at z<br>" : "Not conformal (f'(z) ≈ 0)<br>";
                    const mag = Math.sqrt(mag_deriv_sq); const arg_r = Math.atan2(deriv.im, deriv.re); const arg_d = arg_r * 180 / Math.PI;
                    w_info += `|f'(z)| ≈ ${mag.toFixed(3)} (mag.)<br>`;
                    w_info += `arg(f'(z)) ≈ ${arg_r.toFixed(3)}rad (${arg_d.toFixed(2)}°) (rot.)`;
                } else { w_info += `f'(z) calculation failed.<br>`; w_info += "Conformality: Unknown<br>"; }
            }
        } else { w_info = `w is undefined or infinite.<br>`; w_info += "Conformality: N/A<br>"; }
        controls.wPlaneProbeInfo.innerHTML = w_info; controls.wPlaneProbeInfo.classList.remove('hidden');
    } else { 
        controls.zPlaneProbeInfo.classList.add('hidden'); 
        controls.wPlaneProbeInfo.classList.add('hidden'); 
    }
    } catch (error) {
        console.error("Error in updateProbeInfo:", error);
    }
}

function updateTitlesAndGlobalUI() {
    try {
        updateSliderLabelsAndDisplay();
        updateProbeInfo(); 
    
    // Handle Fourier Transform mode
    if (state.fourierModeEnabled) {
        controls.zPlaneTitle.innerHTML = 'Time Domain (Signal)';
        controls.wPlaneTitle.innerHTML = 'Frequency Domain (Fourier Transform)';
        controls.inputShapeSelector.disabled = true;
        
        // Hide ALL visualization option panels/containers
        if (controls.visualizationOptionsPanel) {
            controls.visualizationOptionsPanel.classList.add('hidden');
        }
        if (controls.zetaSpecificControlsDiv) {
            controls.zetaSpecificControlsDiv.classList.add('hidden');
        }
        if (controls.riemannSphereOptionsDiv) {
            controls.riemannSphereOptionsDiv.classList.add('hidden');
        }
        if (controls.sphereViewControlsDiv) {
            controls.sphereViewControlsDiv.classList.add('hidden');
        }
        if (controls.vectorFlowOptionsContent) {
            controls.vectorFlowOptionsContent.classList.add('hidden');
        }
        
        return; // Skip rest of title updates
    }
    
    // If not in Fourier mode, ensure visualization panel is visible
    if (controls.visualizationOptionsPanel) {
        controls.visualizationOptionsPanel.classList.remove('hidden');
    }
    
    let fND; 
    if (state.currentFunction === 'polynomial') fND = `P(z) (deg ${state.polynomialN})`;
    else if (state.currentFunction === 'exp') fND = 'e<sup>z</sup>';
    else if (state.currentFunction === 'ln') fND = 'ln(z)';
    else if (state.currentFunction === 'reciprocal') fND = '1/z';
    else if (state.currentFunction === 'mobius') fND = '(az+b)/(cz+d)';
    else if (state.currentFunction === 'zeta') fND = 'ζ(z)';
    else if (state.currentFunction === 'poincare') fND = 'Poincare Map';
    else fND = `${state.currentFunction}(z)`;

    let zPlaneTitleText = "z-plane (Input";
    if (state.currentInputShape === 'line') zPlaneTitleText += ": Lines)";
    else if (state.currentInputShape === 'circle') zPlaneTitleText += ": Circle)";
    else if (state.currentInputShape === 'ellipse') zPlaneTitleText += ": Ellipse)";
    else if (state.currentInputShape === 'hyperbola') zPlaneTitleText += ": Hyperbola)";
    else if (state.currentInputShape === 'grid_cartesian') zPlaneTitleText += ": Cartesian Grid)";
    else if (state.currentInputShape === 'grid_polar') zPlaneTitleText += ": Polar Grid)";
    else if (state.currentInputShape === 'grid_logpolar') zPlaneTitleText += ": Log-Polar Grid)";
    else if (state.currentInputShape === 'strip_horizontal') zPlaneTitleText += ": Horiz. Strip)";
    else if (state.currentInputShape === 'sector_angular') zPlaneTitleText += ": Ang. Sector)";
    else if (state.currentInputShape === 'empty_grid') zPlaneTitleText += ": Empty)";
    else zPlaneTitleText += ")"; 
    if (state.vectorFieldEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) zPlaneTitleText = "z-plane (Vector Field: " + state.vectorFieldFunction + ")";


    if (state.splitViewEnabled) {
        controls.zPlaneTitle.innerHTML = `z-plane (Input Grid: ${state.currentInputShape.replace(/_/g, ' ')})`;
        controls.wPlaneTitle.innerHTML = `w-sphere (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
        if(controls.cauchy_integral_results_info) controls.cauchy_integral_results_info.classList.add('hidden');
    } else if (state.riemannSphereViewEnabled) {
        controls.zPlaneTitle.innerHTML = 'z-sphere (Input)';
        controls.wPlaneTitle.innerHTML = `w-sphere (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
        if(controls.cauchy_integral_results_info) controls.cauchy_integral_results_info.classList.add('hidden');
    } else {
        controls.zPlaneTitle.innerHTML = zPlaneTitleText;
        controls.wPlaneTitle.innerHTML = `w-plane (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
        
    }

    controls.inputShapeSelector.disabled = state.riemannSphereViewEnabled && !state.splitViewEnabled;

    // Handle visibility of the main Riemann sphere options container
    if (controls.riemannSphereOptionsDiv) {
        controls.riemannSphereOptionsDiv.classList.toggle('hidden', !state.riemannSphereViewEnabled);
    }

    // Handle visibility of Plotly 3D specific options (nested)
    if (controls.plotly3DOptionsDiv) {
        // Show only if main Riemann sphere is on AND Plotly 3D is on
        controls.plotly3DOptionsDiv.classList.toggle('hidden', !(state.riemannSphereViewEnabled && state.plotly3DEnabled));
    }

    // Handle visibility of general sphere view controls (like North/South buttons)
    const sphereControlsDiv = controls.sphereViewControlsDiv;
    if (sphereControlsDiv) {
        // Show if Riemann sphere is generally active OR if split view is active (which implies w-sphere)
        const showSphereControls = state.riemannSphereViewEnabled || state.splitViewEnabled;
        sphereControlsDiv.classList.toggle('hidden', !showSphereControls);
    }

    if (controls.domainColoringOptionsDiv) {
        controls.domainColoringOptionsDiv.classList.toggle('hidden', !state.domainColoringEnabled);
    }
    if (controls.domainColoringKeyDiv) {
        controls.domainColoringKeyDiv.classList.toggle('hidden', !state.domainColoringEnabled);
    }

    if (controls.radialDiscreteStepsOptionsDiv) {
        controls.radialDiscreteStepsOptionsDiv.classList.toggle('hidden', !state.radialDiscreteStepsEnabled);
    }

    if(controls.zetaSpecificControlsDiv){
        if(state.currentFunction==='zeta'){
            controls.zetaSpecificControlsDiv.classList.remove('hidden');
            controls.toggleZetaContinuationBtn.textContent = state.zetaContinuationEnabled ? 'Disable Analytic Continuation' : 'Enable Analytic Continuation';
            controls.toggleZetaContinuationBtn.classList.toggle('active', state.zetaContinuationEnabled);
        } else {
            controls.zetaSpecificControlsDiv.classList.add('hidden');
        }
    }
    const isPoincare = state.currentFunction === 'poincare';
    controls.showZerosPolesCb.disabled = isPoincare;
    controls.showCriticalPointsCb.disabled = isPoincare;
    if (isPoincare) {
        controls.showZerosPolesCb.checked = false; state.showZerosPoles = false;
        controls.showCriticalPointsCb.checked = false; state.showCriticalPoints = false;
    }
    controls.enableCauchyIntegralModeCb.disabled = isPoincare;
    if (isPoincare) {
        controls.enableCauchyIntegralModeCb.checked = false; state.cauchyIntegralModeEnabled = false;
    }

    if (controls.enableRadialDiscreteStepsCb) {
        controls.enableRadialDiscreteStepsCb.disabled = isPoincare;
        if (isPoincare) {
            controls.enableRadialDiscreteStepsCb.checked = false;
            if (controls.radialDiscreteStepsOptionsDiv) {
                controls.radialDiscreteStepsOptionsDiv.classList.add('hidden');
            }
        }
    }
    
    if (controls.enableTaylorSeriesCb) {
        controls.enableTaylorSeriesCb.disabled = isPoincare;
        if (isPoincare) {
            controls.enableTaylorSeriesCb.checked = false; state.taylorSeriesEnabled = false;
            if (controls.taylorSeriesOptionsDetailDiv) {
                controls.taylorSeriesOptionsDetailDiv.classList.add('hidden');
            }
        }
    }
    } catch (error) {
        console.error("Error in updateTitlesAndGlobalUI:", error);
    }
}
