import { state, context, sliderParamKeys } from '../store/state.js';
import { getChainedTransformFunction, numericDerivative } from '../math-utils.js';
import { DEFAULT_TAYLOR_SERIES_CENTER, CRITICAL_POINT_EPSILON } from '../constants/numerical.js';
import { updatePolynomialCoeffDisplays } from './polynomial-ui.js';
import { syncLaplacePlayPauseButton, syncLaplaceWindingSyncButton } from './event-listeners.js';
import { syncVideoPlaybackUI } from '../utils/raster-media.js';
import { findTaylorCenterPreset, formatTaylorNumericValue } from '../utils/dom-utils.js';
import { syncNavigationControls } from '../navigation-plane.js';

const { controls } = context;

export function syncParameterControlsPanelVisibility() {
    if (!controls.parameterControlsPanel) {
        return;
    }

    const hasVisibleContent = Array.from(controls.parameterControlsPanel.children).some(child =>
        !child.classList.contains('hidden') && !child.classList.contains('hidden-visually')
    );

    controls.parameterControlsPanel.classList.toggle('hidden', !hasVisibleContent);
}

export function updateSliderLabelsAndDisplay() {
    try {
        const isFourierMode = state.fourierModeEnabled;
        const isLaplaceMode = state.laplaceModeEnabled;
        
        // If in Fourier or Laplace mode, hide all complex function-related controls
        if (isFourierMode || isLaplaceMode) {
            controls.commonParamsSliders.classList.add('hidden');
            controls.mobiusParamsSliders.classList.add('hidden');
            controls.polynomialParamsSliders.classList.add('hidden');
            if (controls.fractionalPowerParamsSliders) controls.fractionalPowerParamsSliders.classList.add('hidden');
            controls.shapeParamsSliders.classList.add('hidden');
            controls.stripHorizontalParamsSliders.classList.add('hidden');
            controls.sectorAngularParamsSliders.classList.add('hidden');
            // Don't return yet - we still need to update transform-specific displays
        } else {
            // Normal complex function mode
            const isLine = state.currentInputShape === 'line';
            const isCircle = state.currentInputShape === 'circle';
            const isEllipse = state.currentInputShape === 'ellipse';
            const isHyperbola = state.currentInputShape === 'hyperbola';
            let hasMobiusInChain = false;
            let hasPolyInChain = false;
            let hasPowerInChain = false;
            if (state.algebraicChainingEnabled && state.algebraicChainingTerms) {
                state.algebraicChainingTerms.forEach(t => {
                    if (t.factors) {
                        t.factors.forEach(f => {
                            if (f.func === 'mobius' || f.chainedFunc === 'mobius') hasMobiusInChain = true;
                            if (f.func === 'polynomial' || f.chainedFunc === 'polynomial') hasPolyInChain = true;
                            if (f.func === 'power' || f.chainedFunc === 'power') hasPowerInChain = true;
                        });
                    }
                });
            }

            const isMobiusFunc = (state.currentFunction === 'mobius') || hasMobiusInChain;
            const isPolyFunc = (state.currentFunction === 'polynomial') || hasPolyInChain;
            const isPowerFunc = (state.currentFunction === 'power') || hasPowerInChain;
            const isStripH = state.currentInputShape === 'strip_horizontal';
            const isSectorA = state.currentInputShape === 'sector_angular';
            const isImage = state.currentInputShape === 'image';
            const isVideo = state.currentInputShape === 'video';

            const showCommonParams = isLine || isCircle || isEllipse || isHyperbola;
            controls.commonParamsSliders.classList.toggle('hidden', !showCommonParams);
            controls.mobiusParamsSliders.classList.toggle('hidden', !isMobiusFunc);
            controls.polynomialParamsSliders.classList.toggle('hidden', !isPolyFunc);
            if (controls.fractionalPowerParamsSliders) controls.fractionalPowerParamsSliders.classList.toggle('hidden', !isPowerFunc);
            const showShapeSpecificSliders = isCircle || isEllipse || isHyperbola;
            controls.shapeParamsSliders.classList.toggle('hidden', !showShapeSpecificSliders);

            if (showShapeSpecificSliders) {
                controls.circleRSliderGroup.classList.toggle('hidden', !isCircle);
                controls.ellipseParamsSliderGroup.classList.toggle('hidden', !isEllipse);
                controls.hyperbolaParamsSliderGroup.classList.toggle('hidden', !isHyperbola);
            }
            controls.stripHorizontalParamsSliders.classList.toggle('hidden', !isStripH);
            controls.sectorAngularParamsSliders.classList.toggle('hidden', !isSectorA);
            
            if (controls.imageUploadControls) {
                controls.imageUploadControls.classList.toggle('hidden', !isImage);
            }
            if (controls.videoUploadControls) {
                controls.videoUploadControls.classList.toggle('hidden', !isVideo);
            }

            if (showCommonParams || isImage || isVideo) {
                if (isLine) {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Fixed Re(z) (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Fixed Im(z) (<code>b<sub>0</sub></code>):`;
                } else if (isImage) {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Image Center Re (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Image Center Im (<code>b<sub>0</sub></code>):`;
                } else if (isVideo) {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Video Center Re (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Video Center Im (<code>b<sub>0</sub></code>):`;
                } else {
                    if (controls.a0LabelDesc) controls.a0LabelDesc.innerHTML = `Center Re(z<sub>0</sub>) (<code>a<sub>0</sub></code>):`;
                    if (controls.b0LabelDesc) controls.b0LabelDesc.innerHTML = `Center Im(z<sub>0</sub>) (<code>b<sub>0</sub></code>):`;
                }
                
                // Ensure commonParamsSliders is visible for image
                controls.commonParamsSliders.classList.toggle('hidden', false);
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
            if (isPowerFunc && controls.fractionalPowerNValueDisplay) controls.fractionalPowerNValueDisplay.textContent = state.fractionalPowerN !== undefined ? state.fractionalPowerN.toFixed(2) : "0.50";
        } // End else block for normal complex function mode

    // Only update and show these controls if NOT in Fourier or Laplace mode
    if (!isFourierMode && !isLaplaceMode) {
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
        if (controls.imageResolutionValueDisplay) controls.imageResolutionValueDisplay.textContent = state.imageResolution;
        if (controls.imageSizeValueDisplay) controls.imageSizeValueDisplay.textContent = state.imageSize.toFixed(1);
        if (controls.imageOpacityValueDisplay) controls.imageOpacityValueDisplay.textContent = state.imageOpacity.toFixed(2);
        if (controls.videoResolutionValueDisplay) controls.videoResolutionValueDisplay.textContent = state.videoResolution;
        if (controls.videoFpsValueDisplay) controls.videoFpsValueDisplay.textContent = state.videoProcessingFps;
        if (controls.videoSizeValueDisplay) controls.videoSizeValueDisplay.textContent = state.videoSize.toFixed(1);
        if (controls.videoOpacityValueDisplay) controls.videoOpacityValueDisplay.textContent = state.videoOpacity.toFixed(2);

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
    syncTaylorSeriesCenterStatus();
    if (context.taylorCenterUI) {
        context.taylorCenterUI.setPoints([state.taylorSeriesCustomCenter], false);
    }

    if (controls.generalPointsControlsContainer && controls.enableGeneralPointsCb) {
        controls.generalPointsControlsContainer.classList.toggle('hidden', !state.generalPointsEnabled);
        controls.enableGeneralPointsCb.checked = state.generalPointsEnabled;
    }
    if (context.generalPointsUI) {
        context.generalPointsUI.setPoints(state.generalPointsList, false);
    }

    syncParameterControlsPanelVisibility();

    if (controls.enableStreamlineFlowCb) {
        controls.enableStreamlineFlowCb.checked = state.streamlineFlowEnabled;
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
    if (controls.fourierFrequencyValueDisplay && state.fourierFrequency !== undefined) {
        controls.fourierFrequencyValueDisplay.textContent = state.fourierFrequency.toFixed(1);
    }
    if (controls.fourierAmplitudeValueDisplay && state.fourierAmplitude !== undefined) {
        controls.fourierAmplitudeValueDisplay.textContent = state.fourierAmplitude.toFixed(1);
    }
    if (controls.fourierTimeWindowValueDisplay && state.fourierTimeWindow !== undefined) {
        controls.fourierTimeWindowValueDisplay.textContent = state.fourierTimeWindow.toFixed(1);
    }
    if (controls.fourierSamplesValueDisplay && state.fourierSamples !== undefined) {
        controls.fourierSamplesValueDisplay.textContent = state.fourierSamples;
    }
    if (controls.fourierWindingFrequencyValueDisplay && state.fourierWindingFrequency !== undefined) {
        controls.fourierWindingFrequencyValueDisplay.textContent = state.fourierWindingFrequency.toFixed(1);
    }
    if (controls.fourierWindingTimeValueDisplay && state.fourierWindingTime !== undefined) {
        controls.fourierWindingTimeValueDisplay.textContent = Math.round(state.fourierWindingTime * 100);
    }

    // Laplace Transform display updates
    if (controls.laplaceFrequencyValueDisplay && state.laplaceFrequency !== undefined) {
        controls.laplaceFrequencyValueDisplay.textContent = state.laplaceFrequency.toFixed(1);
    }
    if (controls.laplaceDampingValueDisplay && state.laplaceDamping !== undefined) {
        controls.laplaceDampingValueDisplay.textContent = state.laplaceDamping.toFixed(1);
    }
    if (controls.laplaceSigmaValueDisplay && state.laplaceSigma !== undefined) {
        controls.laplaceSigmaValueDisplay.textContent = state.laplaceSigma.toFixed(1);
    }
    if (controls.laplaceOmegaValueDisplay && state.laplaceOmega !== undefined) {
        controls.laplaceOmegaValueDisplay.textContent = state.laplaceOmega.toFixed(1);
    }
    if (controls.laplaceClipHeightValueDisplay && state.laplaceClipHeight !== undefined) {
        controls.laplaceClipHeightValueDisplay.textContent = state.laplaceClipHeight.toFixed(0);
    }
    if (controls.laplaceStabilityDisplay && state.laplaceStability) {
        controls.laplaceStabilityDisplay.textContent = state.laplaceStability.message || 'Analyzing...';
        if (state.laplaceStability.color) {
            controls.laplaceStabilityDisplay.style.color = state.laplaceStability.color;
        }
    }

    if (typeof syncLaplacePlayPauseButton === 'function') {
        syncLaplacePlayPauseButton();
    }
    if (typeof syncLaplaceWindingSyncButton === 'function') {
        syncLaplaceWindingSyncButton();
    }
    if (typeof syncVideoPlaybackUI === 'function') {
        syncVideoPlaybackUI();
    }
    if (typeof syncNavigationControls === 'function') {
        syncNavigationControls();
    }

    
    } catch (error) {
        console.error("Error in updateSliderLabelsAndDisplay:", error);
    }
}

export function getTaylorDisplayCenter() {
    return state.taylorSeriesCustomCenterEnabled
        ? state.taylorSeriesCustomCenter
        : DEFAULT_TAYLOR_SERIES_CENTER;
}

export function formatTaylorCenterStatusText(center) {
    const preset = findTaylorCenterPreset(center.re, center.im);
    if (preset) {
        return `z0 = ${preset.label}`;
    }

    const re = formatTaylorNumericValue(center.re);
    const imMagnitude = formatTaylorNumericValue(Math.abs(center.im));
    const sign = center.im >= 0 ? '+' : '-';
    return `z0 = ${re} ${sign} ${imMagnitude}i`;
}

export function syncTaylorSeriesCenterStatus() {
    if (!controls.taylorSeriesCenterStatus) {
        return;
    }

    controls.taylorSeriesCenterStatus.textContent = formatTaylorCenterStatusText(getTaylorDisplayCenter());
}

export function syncTaylorSeriesPresetSelection() {
    if (context.taylorCenterUI) {
        context.taylorCenterUI.setPoints([state.taylorSeriesCustomCenter], false);
    }
}

export function formatProbeValue(v) {
    if (v === 0) return '0';
    const absV = Math.abs(v);
    if (absV >= 0.001 && absV < 1e6) {
        return v.toFixed(3);
    }
    return v.toExponential(3);
}

export function formatProbeComplex(re, im) {
    const reStr = formatProbeValue(re);
    const imAbs = Math.abs(im);
    const imSign = im >= 0 ? '+' : '-';
    const imStr = formatProbeValue(imAbs);
    return `${reStr} ${imSign} ${imStr}i`;
}

export function updateProbeInfo(){
    try {
        const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
        if (state.navigationModeEnabled) {
            controls.zPlaneProbeInfo.classList.add('hidden');
            controls.wPlaneProbeInfo.classList.add('hidden');
            return;
        }
        
    if(state.probeActive && zIsPlanar && !state.panStateZ.isPanning && !state.panStateW.isPanning){
        // Skip probe info in Fourier or Laplace mode
        if (state.fourierModeEnabled || state.laplaceModeEnabled) {
            controls.zPlaneProbeInfo.classList.add('hidden');
            controls.wPlaneProbeInfo.classList.add('hidden');
            return;
        }
        
        const z_str = `z = ${formatProbeComplex(state.probeZ.re, state.probeZ.im)}`;
        controls.zPlaneProbeInfo.innerHTML = z_str; controls.zPlaneProbeInfo.classList.remove('hidden');
        const tf = getChainedTransformFunction(state.currentFunction); const pW = tf(state.probeZ.re, state.probeZ.im);
        let w_info = "";
        if(!isNaN(pW.re) && !isNaN(pW.im) && isFinite(pW.re) && isFinite(pW.im)){
            w_info += `w = ${formatProbeComplex(pW.re, pW.im)}<br>`;
            
            if (state.currentFunction === 'poincare') {
                w_info += "f'(z): N/A for Poincare map<br>";
                w_info += "Conformality: N/A<br>";
            } else {
                const deriv = numericDerivative(state.currentFunction, state.probeZ);
                if(!isNaN(deriv.re) && !isNaN(deriv.im) && isFinite(deriv.re) && isFinite(deriv.im)){
                    w_info += `f'(z) ≈ ${formatProbeComplex(deriv.re, deriv.im)}<br>`;
                    const mag_deriv_sq = deriv.re*deriv.re + deriv.im*deriv.im;
                    const isConformal = (mag_deriv_sq > CRITICAL_POINT_EPSILON * CRITICAL_POINT_EPSILON); 
                    w_info += isConformal ? "Conformal at z<br>" : "Not conformal (f'(z) ≈ 0)<br>";
                    const mag = Math.sqrt(mag_deriv_sq); const arg_r = Math.atan2(deriv.im, deriv.re); const arg_d = arg_r * 180 / Math.PI;
                    w_info += `|f'(z)| ≈ ${formatProbeValue(mag)} (mag.)<br>`;
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

export function updateTitlesAndGlobalUI() {
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
    
    // Handle Laplace Transform mode
    if (state.laplaceModeEnabled) {
        controls.zPlaneTitle.innerHTML = 'Time Domain (Signal)';
        controls.wPlaneTitle.innerHTML = 'Complex Frequency Domain (Winding)';
        controls.inputShapeSelector.disabled = true;
        
        // Update 3D panel title based on visualization mode
        if (controls.laplace3DTitleLabel) {
            const vizMode = state.laplaceVizMode || 'magnitude';
            if (vizMode === 'magnitude') {
                controls.laplace3DTitleLabel.innerHTML = '3D Surface: |F(s)| Magnitude';
            } else if (vizMode === 'phase') {
                controls.laplace3DTitleLabel.innerHTML = '3D Surface: ∠F(s) Phase';
            } else {
                controls.laplace3DTitleLabel.innerHTML = '3D Surface: Combined View';
            }
        }
        
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
    
    // If not in Fourier or Laplace mode, ensure visualization panel is visible
    if (controls.visualizationOptionsPanel) {
        controls.visualizationOptionsPanel.classList.remove('hidden');
    }
    
    function formatComplexCoeff(c) {
        if (Math.abs(c.im) < 1e-9) {
            if (Math.abs(c.re - 1) < 1e-9) return '';
            if (Math.abs(c.re + 1) < 1e-9) return '-';
            return `${Number(c.re.toFixed(2))}`;
        }
        const reStr = Math.abs(c.re) < 1e-9 ? '' : `${Number(c.re.toFixed(2))}`;
        const sign = c.im >= 0 ? '+' : '-';
        const imVal = Math.abs(c.im);
        const imStr = Math.abs(imVal - 1) < 1e-9 ? 'i' : `${Number(imVal.toFixed(2))}i`;
        if (reStr === '') {
            return c.im >= 0 ? imStr : `-${imStr}`;
        }
        return `(${reStr}${sign}${imStr})`;
    }

    function formatFuncForFormula(funcKey, termFactor = null) {
        if (!funcKey || funcKey === 'none') return '';
        
        let baseStr = '';
        switch (funcKey) {
            case 'cos': baseStr = 'cos'; break;
            case 'sin': baseStr = 'sin'; break;
            case 'tan': baseStr = 'tan'; break;
            case 'sec': baseStr = 'sec'; break;
            case 'exp': baseStr = 'exp'; break;
            case 'ln': baseStr = 'ln'; break;
            case 'sinh': baseStr = 'sinh'; break;
            case 'cosh': baseStr = 'cosh'; break;
            case 'tanh': baseStr = 'tanh'; break;
            case 'power': baseStr = `(·)<sup>${Number((state.fractionalPowerN || 0.5).toFixed(2))}</sup>`; break;
            case 'reciprocal': baseStr = 'reciprocal'; break;
            case 'mobius': baseStr = 'Möbius'; break;
            case 'zeta': baseStr = 'ζ'; break;
            case 'polynomial': baseStr = `P (deg ${state.polynomialN})`; break;
            case 'poincare': baseStr = 'Poincare'; break;
            default: baseStr = funcKey;
        }

        let innerArg = 'z';
        if (termFactor && termFactor.chainedFunc && termFactor.chainedFunc !== 'none') {
            let chainedStr = '';
            switch (termFactor.chainedFunc) {
                case 'cos': chainedStr = 'cos(z)'; break;
                case 'sin': chainedStr = 'sin(z)'; break;
                case 'tan': chainedStr = 'tan(z)'; break;
                case 'sec': chainedStr = 'sec(z)'; break;
                case 'exp': chainedStr = 'e<sup>z</sup>'; break;
                case 'ln': chainedStr = 'ln(z)'; break;
                case 'sinh': chainedStr = 'sinh(z)'; break;
                case 'cosh': chainedStr = 'cosh(z)'; break;
                case 'tanh': chainedStr = 'tanh(z)'; break;
                case 'power': chainedStr = `z<sup>${Number((state.fractionalPowerN || 0.5).toFixed(2))}</sup>`; break;
                case 'reciprocal': chainedStr = '1/z'; break;
                case 'mobius': chainedStr = 'Möbius(z)'; break;
                case 'zeta': chainedStr = 'ζ(z)'; break;
                case 'polynomial': chainedStr = 'P(z)'; break;
                case 'poincare': chainedStr = 'Poincare(z)'; break;
                default: chainedStr = `${termFactor.chainedFunc}(z)`;
            }
            innerArg = chainedStr;
        }

        let res = '';
        if (funcKey === 'power') {
            res = baseStr.replace('(·)', innerArg);
        } else if (funcKey === 'reciprocal') {
            res = `1/${innerArg}`;
        } else {
            res = `${baseStr}(${innerArg})`;
        }

        if (termFactor) {
            if (termFactor.power !== undefined && termFactor.power !== 1) {
                res = `(${res})<sup>${Number(termFactor.power.toFixed(2))}</sup>`;
            }
            if (termFactor.reciprocal) {
                res = `1/(${res})`;
            }
            if (termFactor.log) {
                res = `ln(${res})`;
            }
            if (termFactor.exp) {
                res = `e<sup>${res}</sup>`;
            }
        }

        return res;
    }

    function getChainedFormula(baseFormulaStr, chainingMode, chainCount) {
        if (!state.chainingEnabled || chainCount <= 1) {
            return baseFormulaStr;
        }
        let formula = baseFormulaStr;
        switch (chainingMode) {
            case 'power':
                formula = `(${baseFormulaStr})<sup>${chainCount}</sup>`;
                break;
            case 'sqrt':
                for (let i = 1; i < chainCount; i++) {
                    formula = `√(${formula})`;
                }
                break;
            case 'ln':
                for (let i = 1; i < chainCount; i++) {
                    formula = `ln(${formula})`;
                }
                break;
            case 'exp':
                for (let i = 1; i < chainCount; i++) {
                    formula = `e<sup>${formula}</sup>`;
                }
                break;
            case 'reciprocal':
                for (let i = 1; i < chainCount; i++) {
                    formula = `1/(${formula})`;
                }
                break;
            case 'recursion':
            default:
                if (chainCount > 3 || state.currentFunction === 'algebraic_chaining') {
                    if (state.currentFunction === 'algebraic_chaining') {
                        formula = `f<sup>${chainCount}</sup>(z) <span style="font-size:0.85em; opacity:0.8;">[where f(z) = ${baseFormulaStr}]</span>`;
                    } else {
                        let symbol = state.currentFunction;
                        if (symbol === 'polynomial') symbol = `P<sub>deg ${state.polynomialN}</sub>`;
                        else if (symbol === 'mobius') symbol = 'Möbius';
                        else if (symbol === 'zeta') symbol = 'ζ';
                        else if (symbol === 'power') symbol = `z<sup>${Number((state.fractionalPowerN || 0.5).toFixed(2))}</sup>`;
                        formula = `${symbol}<sup>${chainCount}</sup>(z)`;
                    }
                } else {
                    let symbol = state.currentFunction;
                    if (symbol === 'exp') symbol = 'e<sup>(·)</sup>';
                    else if (symbol === 'ln') symbol = 'ln(·)';
                    else if (symbol === 'reciprocal') symbol = '1/(·)';
                    else if (symbol === 'zeta') symbol = 'ζ(·)';
                    else if (symbol === 'polynomial') symbol = `P<sub>deg ${state.polynomialN}</sub>(·)`;
                    else if (symbol === 'mobius') symbol = 'Möbius(·)';
                    else if (symbol === 'power') symbol = `(·)<sup>${Number((state.fractionalPowerN || 0.5).toFixed(2))}</sup>`;
                    else if (symbol === 'poincare') symbol = 'Poincare(·)';
                    else if (symbol === 'sinh') symbol = 'sinh(·)';
                    else if (symbol === 'cosh') symbol = 'cosh(·)';
                    else if (symbol === 'tanh') symbol = 'tanh(·)';
                    else symbol = `${symbol}(·)`;

                    for (let i = 1; i < chainCount; i++) {
                        if (symbol.includes('(·)')) {
                            formula = symbol.replace('(·)', formula);
                        } else {
                            formula = `${symbol}(${formula})`;
                        }
                    }
                }
                break;
        }
        return formula;
    }

    let fND; 
    if (state.currentFunction === 'algebraic_chaining') {
        if (!state.algebraicChainingTerms || state.algebraicChainingTerms.length === 0) {
            fND = '0';
        } else {
            const parts = state.algebraicChainingTerms.map(term => {
                const activeFactors = (term.factors || []).filter(f => f.func && f.func !== 'none');
                
                let factorsStr = '';
                if (activeFactors.length === 0) {
                    factorsStr = '';
                } else {
                    factorsStr = activeFactors.map(f => formatFuncForFormula(f.func, f)).join('·');
                }
                
                const coeffStr = formatComplexCoeff(term.coeff);
                if (coeffStr === '') {
                    return factorsStr || '1';
                }
                if (coeffStr === '-') {
                    return `-${factorsStr || '1'}`;
                }
                if (factorsStr === '') {
                    return coeffStr;
                }
                return `${coeffStr}·${factorsStr}`;
            });
            fND = parts.join(' + ').replace(/\+ \-/g, '- ');
        }
    }
    else if (state.currentFunction === 'polynomial') fND = `P(z) (deg ${state.polynomialN})`;
    else if (state.currentFunction === 'exp') fND = 'e<sup>z</sup>';
    else if (state.currentFunction === 'ln') fND = 'ln(z)';
    else if (state.currentFunction === 'reciprocal') fND = '1/z';
    else if (state.currentFunction === 'mobius') fND = '(az+b)/(cz+d)';
    else if (state.currentFunction === 'zeta') fND = 'ζ(z)';
    else if (state.currentFunction === 'poincare') fND = 'Poincare Map';
    else if (state.currentFunction === 'power') fND = 'z<sup>n</sup>';
    else if (state.currentFunction === 'sinh') fND = 'sinh(z)';
    else if (state.currentFunction === 'cosh') fND = 'cosh(z)';
    else if (state.currentFunction === 'tanh') fND = 'tanh(z)';
    else fND = `${state.currentFunction}(z)`;

    if (state.chainingEnabled && state.chainCount > 1) {
        fND = getChainedFormula(fND, state.chainingMode, state.chainCount);
    }

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
    else if (state.currentInputShape === 'image') zPlaneTitleText += ": Image)";
    else if (state.currentInputShape === 'video') zPlaneTitleText += ": Video)";
    else if (state.currentInputShape === 'empty_grid') zPlaneTitleText += ": Empty)";
    else zPlaneTitleText += ")"; 
    const showRadialSteps = state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare';

    if (state.domainColoringEnabled) {
        const isSphere = state.riemannSphereViewEnabled && !state.splitViewEnabled;
        const prefix = isSphere ? 'z-sphere' : 'z-plane';
        zPlaneTitleText = `${prefix} (Output: Domain Coloring of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
        const typeStr = state.streamlineFlowEnabled ? 'Streamlines' : 'Vector Field';
        zPlaneTitleText = `z-plane (Output: ${typeStr} [${state.vectorFieldFunction}] of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (showRadialSteps) {
        zPlaneTitleText = `z-plane (Output: Radial Discrete Steps of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (state.navigationModeEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        zPlaneTitleText = 'z-plane (Navigation)';
    }

    if (state.splitViewEnabled) {
        if (state.domainColoringEnabled) {
            controls.zPlaneTitle.innerHTML = `z-plane (Output: Domain Coloring of <code id="z-plane-title-func">w = ${fND}</code>)`;
        } else if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
            const typeStr = state.streamlineFlowEnabled ? 'Streamlines' : 'Vector Field';
            controls.zPlaneTitle.innerHTML = `z-plane (Output: ${typeStr} [${state.vectorFieldFunction}] of <code id="z-plane-title-func">w = ${fND}</code>)`;
        } else if (showRadialSteps) {
            controls.zPlaneTitle.innerHTML = `z-plane (Output: Radial Discrete Steps of <code id="z-plane-title-func">w = ${fND}</code>)`;
        } else {
            controls.zPlaneTitle.innerHTML = `z-plane (Input Grid: ${state.currentInputShape.replace(/_/g, ' ')})`;
        }
        controls.wPlaneTitle.innerHTML = `w-sphere (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
        if(controls.cauchy_integral_results_info) controls.cauchy_integral_results_info.classList.add('hidden');
    } else if (state.riemannSphereViewEnabled) {
        if (state.domainColoringEnabled) {
            controls.zPlaneTitle.innerHTML = `z-sphere (Output: Domain Coloring of <code id="z-plane-title-func">w = ${fND}</code>)`;
        } else {
            controls.zPlaneTitle.innerHTML = 'z-sphere (Input)';
        }
        controls.wPlaneTitle.innerHTML = `w-sphere (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
        if(controls.cauchy_integral_results_info) controls.cauchy_integral_results_info.classList.add('hidden');
    } else {
        controls.zPlaneTitle.innerHTML = zPlaneTitleText;
        controls.wPlaneTitle.innerHTML = state.navigationModeEnabled
            ? `w-plane (Mapped Navigation: <code id="w-plane-title-func">w = ${fND}</code>)`
            : `w-plane (Output: <code id="w-plane-title-func">w = ${fND}</code>)`;
    }

    controls.inputShapeSelector.disabled = false;

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
    if (controls.domainPaletteSelect) {
        controls.domainPaletteSelect.value = state.domainPalette || 'calming';
    }
    if (controls.domainColoringKeyDiv) {
        controls.domainColoringKeyDiv.classList.toggle('hidden', !state.domainColoringEnabled);
        updateDomainColoringKey();
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

export function updateDomainColoringKey() {
    if (!controls.domainColoringKeyDiv) return;

    const palette = state.domainPalette || 'calming';
    let keyHtml = `<strong>Domain Coloring Key:</strong><br>`;

    if (palette === 'classic') {
        keyHtml += `
            <span style="display:inline-block; margin-bottom: 4px;">- Hue (Color) maps to Argument (Angle):</span><br>
            &nbsp;&nbsp;&nbsp;<span style="color:#00ffff; font-weight:bold;">Cyan</span>: Arg = 0° (Positive Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#3b82f6; font-weight:bold;">Blue</span>: Arg = 90° (Positive Imaginary)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#ef4444; font-weight:bold;">Red</span>: Arg = 180° (Negative Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#22c55e; font-weight:bold;">Green</span>: Arg = -90° (Negative Imaginary)<br>
        `;
    } else if (palette === 'calming') {
        keyHtml += `
            <span style="display:inline-block; margin-bottom: 4px;">- Color maps to Argument (Angle):</span><br>
            &nbsp;&nbsp;&nbsp;<span style="color:#ebdcd2; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Cream</span>: Arg = 0° (Positive Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#733c34; font-weight:bold;">Caramel</span>: Arg = 90° (Positive Imaginary)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#d9c5c1; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Mahogany</span>: Arg = 180° (Negative Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#b96e5f; font-weight:bold;">Copper</span>: Arg = -90° (Negative Imaginary)<br>
        `;
    } else if (palette === 'purple') {
        keyHtml += `
            <span style="display:inline-block; margin-bottom: 4px;">- Color maps to Argument (Angle):</span><br>
            &nbsp;&nbsp;&nbsp;<span style="color:#dcc8ff; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Lavender</span>: Arg = 0° (Positive Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#9e82ff; font-weight:bold;">Indigo</span>: Arg = 90° (Positive Imaginary)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#c3b5db; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Charcoal</span>: Arg = 180° (Negative Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#6e46be; font-weight:bold;">Violet</span>: Arg = -90° (Negative Imaginary)<br>
        `;
    } else if (palette === 'green') {
        keyHtml += `
            <span style="display:inline-block; margin-bottom: 4px;">- Color maps to Argument (Angle):</span><br>
            &nbsp;&nbsp;&nbsp;<span style="color:#c8f5dc; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Mint</span>: Arg = 0° (Positive Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#aff00a; font-weight:bold;">Lime</span>: Arg = 90° (Positive Imaginary)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#9bbda7; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">Forest</span>: Arg = 180° (Negative Real)<br>
            &nbsp;&nbsp;&nbsp;<span style="color:#0f785f; font-weight:bold;">Jade</span>: Arg = -90° (Negative Imaginary)<br>
        `;
    }

    keyHtml += `<span style="display:inline-block; margin-top: 4px;">- Lightness maps to Magnitude (Log-scaled, cyclic bands).</span>`;
    controls.domainColoringKeyDiv.innerHTML = keyHtml;
}
