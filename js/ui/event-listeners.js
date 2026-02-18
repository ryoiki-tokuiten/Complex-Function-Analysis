
window.setupEventListeners = function () {
    sliderParamKeys.forEach(key => {
        if (controls[`${key}Slider`]) {
            controls[`${key}Slider`].addEventListener('input', () => {
                try {
                    state[key] = parseFloat(controls[`${key}Slider`].value);
                    domainColoringDirty = true;
                    requestRedrawAll();
                } catch (error) {
                    console.error(`Error in ${key}Slider input listener:`, error);
                }
            });
            if (controls[`play_${key}Btn`] && controls[`speed_${key}Selector`]) {
                controls[`play_${key}Btn`].addEventListener('click', () => {
                    try {
                        toggleAnimation(
                            controls[`${key}Slider`],
                            (value) => { state[key] = value; },
                            controls[`play_${key}Btn`],
                            controls[`speed_${key}Selector`]
                        );
                    } catch (error) {
                        console.error(`Error in play_${key}Btn click listener:`, error);
                    }
                });
            }
        }
    });


    ['A', 'B', 'C', 'D'].forEach(param => {
        ['re', 'im'].forEach(part => {
            const sliderId = `mobius${param}_${part}_slider`;
            const playBtnId = `play_mobius${param}_${part}_btn`;
            const speedSelectorId = `speed_mobius${param}_${part}_selector`;


            if (controls[sliderId]) {
                controls[sliderId].addEventListener('input', () => {
                    try {

                        let baseParam = state[`mobius${param}`];
                        if (!baseParam) {
                            state[`mobius${param}`] = { re: 0, im: 0 };
                            baseParam = state[`mobius${param}`];
                        }
                        baseParam[part] = parseFloat(controls[sliderId].value);

                        domainColoringDirty = true;
                        requestRedrawAll();
                    } catch (error) {
                        console.error(`Error in ${sliderId} input listener:`, error);
                    }
                });

                if (controls[playBtnId] && controls[speedSelectorId]) {
                    controls[playBtnId].addEventListener('click', () => {
                        try {
                            toggleAnimation(
                                controls[sliderId],
                                (value) => {
                                    if (state[`mobius${param}`]) {
                                        state[`mobius${param}`][part] = value;
                                    } else {
                                        state[`mobius${param}`] = { re: 0, im: 0 };
                                        state[`mobius${param}`][part] = value;
                                    }
                                },
                                controls[playBtnId],
                                controls[speedSelectorId]
                            );
                        } catch (error) {
                            console.error(`Error in ${playBtnId} click listener:`, error);
                        }
                    });
                }
            }
        });
    });

    Object.keys(controls.funcButtons).forEach(key => {
        controls.funcButtons[key].addEventListener('click', () => {
            try {
                state.currentFunction = key;

                // Handle Fourier mode
                if (key === 'fourier') {
                    state.fourierModeEnabled = true;
                    if (controls.fourierSpecificControlsDiv) {
                        controls.fourierSpecificControlsDiv.classList.remove('hidden');
                    }
                    // Update Fourier transform on mode entry
                    updateFourierTransform();
                } else {
                    state.fourierModeEnabled = false;
                    if (controls.fourierSpecificControlsDiv) {
                        controls.fourierSpecificControlsDiv.classList.add('hidden');
                    }
                }

                // Handle Laplace mode
                if (key === 'laplace') {
                    state.laplaceModeEnabled = true;
                    // Reset per-panel viewports on mode entry so they auto-fit fresh data
                    state.laplaceTopVP = null;
                    state.lapaceBotVP = null;
                    if (controls.laplaceSpecificControlsDiv) {
                        controls.laplaceSpecificControlsDiv.classList.remove('hidden');
                    }
                    // Show sync button
                    const syncBtn = document.getElementById('laplace_winding_sync_btn');
                    if (syncBtn) syncBtn.style.display = 'block';
                    // Update Laplace transform on mode entry
                    updateLaplaceTransform();
                } else {
                    state.laplaceModeEnabled = false;
                    if (controls.laplaceSpecificControlsDiv) {
                        controls.laplaceSpecificControlsDiv.classList.add('hidden');
                    }
                    // Hide sync button
                    const syncBtn = document.getElementById('laplace_winding_sync_btn');
                    if (syncBtn) syncBtn.style.display = 'none';
                }

                Object.keys(controls.funcButtons).forEach(k => {
                    controls.funcButtons[k].classList.remove('active');
                });
                controls.funcButtons[key].classList.add('active');
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error(`Error in funcButtons[${key}] click listener:`, error);
            }
        });
    });

    controls.inputShapeSelector.addEventListener('change', (e) => {
        try {
            state.currentInputShape = e.target.value;
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in inputShapeSelector change listener:", error);
        }
    });

    if (controls.polynomialNSlider) {
        controls.polynomialNSlider.addEventListener('input', () => {
            try {
                const newN = parseInt(controls.polynomialNSlider.value);
                state.polynomialN = newN;
                initializePolynomialCoeffs(newN, true);
                generatePolynomialCoeffSliders();
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in polynomialNSlider input listener:", error);
            }
        });
    }

    if (controls.togglePlotlySphereGridCb) {
        controls.togglePlotlySphereGridCb.addEventListener('change', (e) => {
            try {
                state.showPlotlySphereGrid = e.target.checked;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in togglePlotlySphereGridCb change listener:", error);
            }
        });
    }

    if (controls.plotlyGridDensitySlider) {
        controls.plotlyGridDensitySlider.addEventListener('input', () => {
            try {
                state.plotlyGridDensity = parseInt(controls.plotlyGridDensitySlider.value, 10);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in plotlyGridDensitySlider input listener:", error);
            }
        });
    }

    if (controls.plotlySphereOpacitySlider) {
        controls.plotlySphereOpacitySlider.addEventListener('input', () => {
            try {
                state.plotlySphereOpacity = parseFloat(controls.plotlySphereOpacitySlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in plotlySphereOpacitySlider input listener:", error);
            }
        });
    }

    controls.enableDomainColoringCb.addEventListener('change', (e) => {
        try {
            state.domainColoringEnabled = e.target.checked;
            if (controls.domainColoringOptionsDiv) {
                controls.domainColoringOptionsDiv.classList.toggle('hidden', !state.domainColoringEnabled);
            }
            if (controls.domainColoringKeyDiv) {
                controls.domainColoringKeyDiv.classList.toggle('hidden', !state.domainColoringEnabled);
            }
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in enableDomainColoringCb change listener:", error);
        }
    });


    const domainControlSliderIds = ['domainBrightness', 'domainContrast', 'domainSaturation', 'domainLightnessCycles'];
    domainControlSliderIds.forEach(id => {
        const slider = controls[`${id}Slider`];
        if (slider) {
            slider.addEventListener('input', () => {
                try {
                    state[id.replace('domain', '').toLowerCase()] = parseFloat(slider.value);

                    if (id === 'domainBrightness') state.domainBrightness = parseFloat(slider.value);
                    else if (id === 'domainContrast') state.domainContrast = parseFloat(slider.value);
                    else if (id === 'domainSaturation') state.domainSaturation = parseFloat(slider.value);
                    else if (id === 'domainLightnessCycles') state.domainLightnessCycles = parseFloat(slider.value);

                    domainColoringDirty = true;
                    requestRedrawAll();
                } catch (error) {
                    console.error(`Error in ${id}Slider input listener:`, error);
                }
            });
        }
    });


    controls.gridDensitySlider.addEventListener('input', () => {
        try {
            state.gridDensity = parseInt(controls.gridDensitySlider.value);
            requestRedrawAll();
        } catch (error) {
            console.error("Error in gridDensitySlider input listener:", error);
        }
    });

    controls.showZerosPolesCb.addEventListener('change', (e) => {
        try {
            state.showZerosPoles = e.target.checked;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in showZerosPolesCb change listener:", error);
        }
    });
    controls.showCriticalPointsCb.addEventListener('change', (e) => {
        try {
            state.showCriticalPoints = e.target.checked;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in showCriticalPointsCb change listener:", error);
        }
    });

    if (controls.enableCauchyIntegralModeCb) {
        controls.enableCauchyIntegralModeCb.addEventListener('change', (e) => {
            try {
                state.cauchyIntegralModeEnabled = e.target.checked;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableCauchyIntegralModeCb change listener:", error);
            }
        });
    }
    if (controls.enableSplitViewCb) {
        controls.enableSplitViewCb.addEventListener('change', (e) => {
            try {
                state.splitViewEnabled = e.target.checked;
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableSplitViewCb change listener:", error);
            }
        });
    }


    controls.neighborhoodSizeSlider.addEventListener('input', () => {
        try {
            state.probeNeighborhoodSize = parseFloat(controls.neighborhoodSizeSlider.value);
            requestRedrawAll();
        } catch (error) {
            console.error("Error in neighborhoodSizeSlider input listener:", error);
        }
    });
    controls.zPlaneZoomSlider.addEventListener('input', () => {
        try {
            state.zPlaneZoom = parseFloat(controls.zPlaneZoomSlider.value);
            setupVisualParameters(true, false);
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in zPlaneZoomSlider input listener:", error);
        }
    });
    controls.wPlaneZoomSlider.addEventListener('input', () => {
        try {
            state.wPlaneZoom = parseFloat(controls.wPlaneZoomSlider.value);
            setupVisualParameters(false, true);
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in wPlaneZoomSlider input listener:", error);
        }
    });


    if (controls.stripY1Slider) controls.stripY1Slider.addEventListener('input', () => { try { state.stripY1 = parseFloat(controls.stripY1Slider.value); requestRedrawAll(); } catch (e) { console.error("Error in stripY1Slider listener", e); } });
    if (controls.stripY2Slider) controls.stripY2Slider.addEventListener('input', () => { try { state.stripY2 = parseFloat(controls.stripY2Slider.value); requestRedrawAll(); } catch (e) { console.error("Error in stripY2Slider listener", e); } });
    if (controls.sectorAngle1Slider) controls.sectorAngle1Slider.addEventListener('input', () => { try { state.sectorAngle1 = parseFloat(controls.sectorAngle1Slider.value); requestRedrawAll(); } catch (e) { console.error("Error in sectorAngle1Slider listener", e); } });
    if (controls.sectorAngle2Slider) controls.sectorAngle2Slider.addEventListener('input', () => { try { state.sectorAngle2 = parseFloat(controls.sectorAngle2Slider.value); requestRedrawAll(); } catch (e) { console.error("Error in sectorAngle2Slider listener", e); } });
    if (controls.sectorRMinSlider) controls.sectorRMinSlider.addEventListener('input', () => { try { state.sectorRMin = parseFloat(controls.sectorRMinSlider.value); requestRedrawAll(); } catch (e) { console.error("Error in sectorRMinSlider listener", e); } });
    if (controls.sectorRMaxSlider) controls.sectorRMaxSlider.addEventListener('input', () => { try { state.sectorRMax = parseFloat(controls.sectorRMaxSlider.value); requestRedrawAll(); } catch (e) { console.error("Error in sectorRMaxSlider listener", e); } });


    controls.enableVectorFieldCb.addEventListener('change', (e) => {
        try {
            state.vectorFieldEnabled = e.target.checked;
            controls.vectorFieldOptionsDiv.classList.toggle('hidden', !state.vectorFieldEnabled);
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in enableVectorFieldCb change listener:", error);
        }
    });
    controls.vectorFieldFunctionSelector.addEventListener('change', (e) => {
        try {
            state.vectorFieldFunction = e.target.value;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in vectorFieldFunctionSelector change listener:", error);
        }
    });
    controls.vectorFieldScaleSlider.addEventListener('input', () => {
        try {
            state.vectorFieldScale = parseFloat(controls.vectorFieldScaleSlider.value);
            requestRedrawAll();
        } catch (error) {
            console.error("Error in vectorFieldScaleSlider input listener:", error);
        }
    });
    if (controls.vectorArrowThicknessSlider) {
        controls.vectorArrowThicknessSlider.addEventListener('input', () => {
            try {
                state.vectorArrowThickness = parseFloat(controls.vectorArrowThicknessSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in vectorArrowThicknessSlider input listener:", error);
            }
        });
    }
    if (controls.vectorArrowHeadSizeSlider) {
        controls.vectorArrowHeadSizeSlider.addEventListener('input', () => {
            try {
                state.vectorArrowHeadSize = parseFloat(controls.vectorArrowHeadSizeSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in vectorArrowHeadSizeSlider input listener:", error);
            }
        });
    }

    const streamlineFlowCheckbox = controls.enableStreamlineFlowCb || document.getElementById('enable_streamline_flow_cb');
    if (streamlineFlowCheckbox) {
        streamlineFlowCheckbox.addEventListener('change', (event) => {
            try {
                state.streamlineFlowEnabled = event.target.checked;

                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableStreamlineFlowCb change listener:", error);
            }
        });
    }
    if (controls.streamlineStepSizeSlider) {
        controls.streamlineStepSizeSlider.addEventListener('input', () => {
            try {
                state.streamlineStepSize = parseFloat(controls.streamlineStepSizeSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in streamlineStepSizeSlider input listener:", error);
            }
        });
    }
    if (controls.streamlineMaxLengthSlider) {
        controls.streamlineMaxLengthSlider.addEventListener('input', () => {
            try {
                state.streamlineMaxLength = parseInt(controls.streamlineMaxLengthSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in streamlineMaxLengthSlider input listener:", error);
            }
        });
    }
    if (controls.streamlineThicknessSlider) {
        controls.streamlineThicknessSlider.addEventListener('input', () => {
            try {
                state.streamlineThickness = parseFloat(controls.streamlineThicknessSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in streamlineThicknessSlider input listener:", error);
            }
        });
    }
    if (controls.streamlineSeedDensityFactorSlider) {
        controls.streamlineSeedDensityFactorSlider.addEventListener('input', () => {
            try {
                state.streamlineSeedDensityFactor = parseFloat(controls.streamlineSeedDensityFactorSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in streamlineSeedDensityFactorSlider input listener:", error);
            }
        });
    }

    if (controls.enableRadialDiscreteStepsCb) {
        controls.enableRadialDiscreteStepsCb.addEventListener('change', (e) => {
            try {
                state.radialDiscreteStepsEnabled = e.target.checked;


                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableRadialDiscreteStepsCb change listener:", error);
            }
        });
    }

    if (controls.radialDiscreteStepsCountSlider) {
        controls.radialDiscreteStepsCountSlider.addEventListener('input', () => {
            try {
                state.radialDiscreteStepsCount = parseInt(controls.radialDiscreteStepsCountSlider.value, 10);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in radialDiscreteStepsCountSlider input listener:", error);
            }
        });
    }


    if (controls.enableRiemannSphereCb) {
        controls.enableRiemannSphereCb.addEventListener('change', (e) => {
            try {
                state.riemannSphereViewEnabled = e.target.checked;

                if (controls.riemannSphereOptionsDiv) {
                    controls.riemannSphereOptionsDiv.classList.toggle('hidden', !state.riemannSphereViewEnabled);
                }

                if (!state.riemannSphereViewEnabled && controls.plotly3DOptionsDiv) {
                    controls.plotly3DOptionsDiv.classList.add('hidden');
                }
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableRiemannSphereCb change listener:", error);
            }
        });
    }

    if (controls.enablePlotly3DCb) {
        controls.enablePlotly3DCb.addEventListener('change', (e) => {
            try {
                state.plotly3DEnabled = e.target.checked;

                if (controls.plotly3DOptionsDiv) {
                    controls.plotly3DOptionsDiv.classList.toggle('hidden', !state.plotly3DEnabled);
                }
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enablePlotly3DCb change listener:", error);
            }
        });
    }


    if (controls.enableTaylorSeriesCb) {
        controls.enableTaylorSeriesCb.addEventListener('change', (e) => {
            try {
                state.taylorSeriesEnabled = e.target.checked;
                if (controls.taylorSeriesOptionsDetailDiv) {
                    controls.taylorSeriesOptionsDetailDiv.classList.toggle('hidden', !state.taylorSeriesEnabled);
                }
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableTaylorSeriesCb change listener:", error);
            }
        });
    }

    if (controls.taylorSeriesOrderSlider) {
        controls.taylorSeriesOrderSlider.addEventListener('input', () => {
            try {
                state.taylorSeriesOrder = parseInt(controls.taylorSeriesOrderSlider.value, 10);

                requestRedrawAll();
            } catch (error) {
                console.error("Error in taylorSeriesOrderSlider input listener:", error);
            }
        });
    }

    if (controls.enableTaylorSeriesCustomCenterCb) {
        controls.enableTaylorSeriesCustomCenterCb.addEventListener('change', (e) => {
            try {
                state.taylorSeriesCustomCenterEnabled = e.target.checked;
                if (controls.taylorSeriesCustomCenterInputsDiv) {
                    controls.taylorSeriesCustomCenterInputsDiv.classList.toggle('hidden', !state.taylorSeriesCustomCenterEnabled);
                }
                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableTaylorSeriesCustomCenterCb change listener:", error);
            }
        });
    }

    if (controls.taylorSeriesCustomCenterReInput) {
        controls.taylorSeriesCustomCenterReInput.addEventListener('input', () => {
            try {
                state.taylorSeriesCustomCenter.re = parseFloat(controls.taylorSeriesCustomCenterReInput.value) || 0;

            } catch (error) {
                console.error("Error in taylorSeriesCustomCenterReInput input listener:", error);
            }
        });
        controls.taylorSeriesCustomCenterReInput.addEventListener('change', () => {
            try {
                state.taylorSeriesCustomCenter.re = parseFloat(controls.taylorSeriesCustomCenterReInput.value) || 0;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in taylorSeriesCustomCenterReInput change listener:", error);
            }
        });
    }
    if (controls.taylorSeriesCustomCenterImInput) {
        controls.taylorSeriesCustomCenterImInput.addEventListener('input', () => {
            try {
                state.taylorSeriesCustomCenter.im = parseFloat(controls.taylorSeriesCustomCenterImInput.value) || 0;

            } catch (error) {
                console.error("Error in taylorSeriesCustomCenterImInput input listener:", error);
            }
        });
        controls.taylorSeriesCustomCenterImInput.addEventListener('change', () => {
            try {
                state.taylorSeriesCustomCenter.im = parseFloat(controls.taylorSeriesCustomCenterImInput.value) || 0;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in taylorSeriesCustomCenterImInput change listener:", error);
            }
        });
    }



    controls.toggleZetaContinuationBtn.addEventListener('click', () => {
        try {
            state.zetaContinuationEnabled = !state.zetaContinuationEnabled;
            domainColoringDirty = true;
            requestRedrawAll();
        } catch (error) {
            console.error("Error in toggleZetaContinuationBtn click listener:", error);
        }
    });

    // Fourier Transform event listeners
    if (controls.fourierFunctionSelector) {
        controls.fourierFunctionSelector.addEventListener('change', (e) => {
            try {
                state.fourierFunction = e.target.value;
                updateFourierTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierFunctionSelector change listener:", error);
            }
        });
    }

    if (controls.fourierFrequencySlider) {
        controls.fourierFrequencySlider.addEventListener('input', () => {
            try {
                state.fourierFrequency = parseFloat(controls.fourierFrequencySlider.value);
                updateFourierTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierFrequencySlider input listener:", error);
            }
        });
    }

    if (controls.fourierAmplitudeSlider) {
        controls.fourierAmplitudeSlider.addEventListener('input', () => {
            try {
                state.fourierAmplitude = parseFloat(controls.fourierAmplitudeSlider.value);
                updateFourierTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierAmplitudeSlider input listener:", error);
            }
        });
    }

    if (controls.fourierTimeWindowSlider) {
        controls.fourierTimeWindowSlider.addEventListener('input', () => {
            try {
                state.fourierTimeWindow = parseFloat(controls.fourierTimeWindowSlider.value);
                updateFourierTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierTimeWindowSlider input listener:", error);
            }
        });
    }

    if (controls.fourierSamplesSlider) {
        controls.fourierSamplesSlider.addEventListener('input', () => {
            try {
                state.fourierSamples = parseInt(controls.fourierSamplesSlider.value);
                updateFourierTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierSamplesSlider input listener:", error);
            }
        });
    }

    if (controls.fourierWindingFrequencySlider) {
        controls.fourierWindingFrequencySlider.addEventListener('input', () => {
            try {
                state.fourierWindingFrequency = parseFloat(controls.fourierWindingFrequencySlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierWindingFrequencySlider input listener:", error);
            }
        });
    }

    if (controls.fourierWindingTimeSlider) {
        controls.fourierWindingTimeSlider.addEventListener('input', () => {
            try {
                state.fourierWindingTime = parseFloat(controls.fourierWindingTimeSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in fourierWindingTimeSlider input listener:", error);
            }
        });
    }

    // Laplace Transform event listeners
    if (controls.laplaceFunctionSelector) {
        controls.laplaceFunctionSelector.addEventListener('change', (e) => {
            try {
                state.laplaceFunction = e.target.value;
                updateLaplaceTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceFunctionSelector change listener:", error);
            }
        });
    }

    if (controls.laplaceFrequencySlider) {
        controls.laplaceFrequencySlider.addEventListener('input', () => {
            try {
                state.laplaceFrequency = parseFloat(controls.laplaceFrequencySlider.value);
                if (controls.laplaceFrequencyValueDisplay) {
                    controls.laplaceFrequencyValueDisplay.textContent = state.laplaceFrequency.toFixed(1);
                }
                updateLaplaceTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceFrequencySlider input listener:", error);
            }
        });
    }

    if (controls.laplaceDampingSlider) {
        controls.laplaceDampingSlider.addEventListener('input', () => {
            try {
                state.laplaceDamping = parseFloat(controls.laplaceDampingSlider.value);
                if (controls.laplaceDampingValueDisplay) {
                    controls.laplaceDampingValueDisplay.textContent = state.laplaceDamping.toFixed(1);
                }
                updateLaplaceTransform();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceDampingSlider input listener:", error);
            }
        });
    }

    if (controls.laplaceSigmaSlider) {
        controls.laplaceSigmaSlider.addEventListener('input', () => {
            try {
                state.laplaceSigma = parseFloat(controls.laplaceSigmaSlider.value);
                if (controls.laplaceSigmaValueDisplay) {
                    controls.laplaceSigmaValueDisplay.textContent = state.laplaceSigma.toFixed(1);
                }
                // Fast update - only recompute winding path and eval point, not 3D surface
                updateLaplaceEvaluationPoint();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceSigmaSlider input listener:", error);
            }
        });
    }

    if (controls.laplaceOmegaSlider) {
        controls.laplaceOmegaSlider.addEventListener('input', () => {
            try {
                state.laplaceOmega = parseFloat(controls.laplaceOmegaSlider.value);
                if (controls.laplaceOmegaValueDisplay) {
                    controls.laplaceOmegaValueDisplay.textContent = state.laplaceOmega.toFixed(1);
                }
                // Fast update - only recompute winding path and eval point, not 3D surface
                updateLaplaceEvaluationPoint();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceOmegaSlider input listener:", error);
            }
        });
    }

    if (controls.laplaceShowROCCb) {
        controls.laplaceShowROCCb.addEventListener('change', (e) => {
            try {
                state.laplaceShowROC = e.target.checked;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceShowROCCb change listener:", error);
            }
        });
    }

    if (controls.laplaceVizModeSelector) {
        controls.laplaceVizModeSelector.addEventListener('change', (e) => {
            try {
                state.laplaceVizMode = e.target.value;
                updateLaplace3DSurface();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceVizModeSelector change listener:", error);
            }
        });
    }

    if (controls.laplaceClipHeightSlider) {
        controls.laplaceClipHeightSlider.addEventListener('input', () => {
            try {
                state.laplaceClipHeight = parseFloat(controls.laplaceClipHeightSlider.value);
                if (controls.laplaceClipHeightValueDisplay) {
                    controls.laplaceClipHeightValueDisplay.textContent = state.laplaceClipHeight.toFixed(0);
                }
                updateLaplace3DSurface();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceClipHeightSlider input listener:", error);
            }
        });
    }

    // Animation controls
    const laplaceAnimSpeedSlider = document.getElementById('laplace_animation_speed_slider');
    const laplaceAnimSpeedDisplay = document.getElementById('laplace_animation_speed_display');
    const laplaceAnimLoopCb = document.getElementById('laplace_animation_loop_cb');
    const laplacePlayPauseBtn = document.getElementById('laplace_play_pause_btn');

    if (laplaceAnimSpeedSlider) {
        laplaceAnimSpeedSlider.addEventListener('input', () => {
            state.laplaceAnimationSpeed = parseFloat(laplaceAnimSpeedSlider.value);
            if (laplaceAnimSpeedDisplay) {
                laplaceAnimSpeedDisplay.textContent = state.laplaceAnimationSpeed.toFixed(1);
            }
        });
    }

    if (laplaceAnimLoopCb) {
        laplaceAnimLoopCb.addEventListener('change', () => {
            state.laplaceAnimationLoop = laplaceAnimLoopCb.checked;
        });
    }

    // Update play/pause button text and ensure animation starts when entering Laplace mode
    if (laplacePlayPauseBtn) {
        setInterval(() => {
            if (state.laplaceModeEnabled && laplacePlayPauseBtn) {
                laplacePlayPauseBtn.innerHTML = state.laplaceAnimationPlaying ? '⏸ Pause' : '▶ Play';
            }
        }, 100);
    }

    // Auto-start animation when Laplace mode is enabled
    const originalLaplaceBtn = document.getElementById('laplace_mode_btn');
    if (originalLaplaceBtn) {
        originalLaplaceBtn.addEventListener('click', () => {
            // Wait a frame for mode to be enabled
            setTimeout(() => {
                if (state.laplaceModeEnabled && typeof showFullLaplaceSpiral === 'function') {
                    showFullLaplaceSpiral(); // Start with full spiral visible
                }
            }, 100);
        });
    }

    if (controls.laplaceShowPolesZerosCb) {
        controls.laplaceShowPolesZerosCb.addEventListener('change', (e) => {
            try {
                state.laplaceShowPolesZeros = e.target.checked;
                updateLaplace3DSurface();
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceShowPolesZerosCb change listener:", error);
            }
        });
    }

    if (controls.laplaceFindPolesZerosBtn) {
        controls.laplaceFindPolesZerosBtn.addEventListener('click', () => {
            try {
                // Trigger pole-zero finding
                if (state.laplaceModeEnabled) {
                    const pz = findPolesZeros(state.laplaceFunction || 'damped_sine', {
                        frequency: state.laplaceFrequency || 2.0,
                        damping: state.laplaceDamping || 0.5,
                        amplitude: 1.0
                    });
                    state.laplacePoles = pz.poles;
                    state.laplaceZeros = pz.zeros;
                    requestRedrawAll();
                }
            } catch (error) {
                console.error("Error in laplaceFindPolesZerosBtn click listener:", error);
            }
        });
    }

    if (controls.laplaceStabilityAnalysisBtn) {
        controls.laplaceStabilityAnalysisBtn.addEventListener('click', () => {
            try {
                // Perform stability analysis
                if (state.laplaceModeEnabled && state.laplacePoles) {
                    const stability = analyzeStability(state.laplacePoles);
                    state.laplaceStability = stability;

                    // Update display
                    if (controls.laplaceStabilityDisplay) {
                        controls.laplaceStabilityDisplay.textContent = stability.message;
                        controls.laplaceStabilityDisplay.style.color = stability.color || 'rgba(200, 220, 255, 1)';
                    }
                }
            } catch (error) {
                console.error("Error in laplaceStabilityAnalysisBtn click listener:", error);
            }
        });
    }

    if (controls.laplaceShowFourierLineCb) {
        controls.laplaceShowFourierLineCb.addEventListener('change', (e) => {
            try {
                state.laplaceShowFourierLine = e.target.checked;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in laplaceShowFourierLineCb change listener:", error);
            }
        });
    }


    const sphereViewButtonActions = {
        'sphere_view_north_btn': { rotX: -Math.PI / 2 + 0.01, rotY: 0 },
        'sphere_view_south_btn': { rotX: Math.PI / 2 - 0.01, rotY: 0 },
        'sphere_view_east_btn': { rotX: 0, rotY: -Math.PI / 2 },
        'sphere_view_west_btn': { rotX: 0, rotY: Math.PI / 2 },
        'sphere_view_front_btn': { rotX: 0, rotY: 0 },
        'sphere_view_reset_btn': { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y }
    };
    Object.keys(sphereViewButtonActions).forEach(btnId => {
        if (controls[btnId]) {
            controls[btnId].addEventListener('click', () => {
                try {
                    const action = sphereViewButtonActions[btnId];
                    sphereViewParams.z.rotX = action.rotX;
                    sphereViewParams.z.rotY = action.rotY;
                    sphereViewParams.w.rotX = action.rotX;
                    sphereViewParams.w.rotY = action.rotY;
                    domainColoringDirty = true;
                    requestRedrawAll();
                } catch (error) {
                    console.error(`Error in ${btnId} click listener:`, error);
                }
            });
        }
    });


    [zCanvas, wCanvas].forEach(canvas => {
        const planeType = canvas === zCanvas ? 'z' : 'w';
        const planeParams = canvas === zCanvas ? zPlaneParams : wPlaneParams;
        const statePanInfo = canvas === zCanvas ? state.panStateZ : state.panStateW;
        const isZCanvas = planeType === 'z';

        canvas.addEventListener('mousemove', (e) => {
            try {
                const isSphereActive = (isZCanvas && (state.riemannSphereViewEnabled && !state.splitViewEnabled)) ||
                    (!isZCanvas && (state.riemannSphereViewEnabled || state.splitViewEnabled));
                if (isSphereActive) return;

                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // --- Laplace winding mode: per-panel panning ---
                if (!isZCanvas && state.laplaceModeEnabled && state.laplaceDragging) {
                    const drag = state.laplaceDragging;
                    const vp = drag.panel === 'top' ? state.laplaceTopVP : state.lapaceBotVP;
                    if (vp) {
                        const dx = mouseX - drag.startX;
                        const dy = mouseY - drag.startY;
                        vp.origin.x = drag.startOrigin.x + dx;
                        vp.origin.y = drag.startOrigin.y + dy;

                        // Update ranges for grid drawing
                        const originWorldX = -vp.origin.x / vp.scale.x;
                        const originWorldY = (vp.origin.y - vp.offsetY - vp.height / 2) / vp.scale.y;
                        vp.currentVisXRange = [originWorldX, originWorldX + vp.width / vp.scale.x];
                        vp.currentVisYRange = [originWorldY - vp.height / (2 * vp.scale.y), originWorldY + vp.height / (2 * vp.scale.y)];

                        requestRedrawAll();
                    }
                    return;
                }

                if (statePanInfo.isPanning) {
                    const dx = mouseX - statePanInfo.panStart.x;
                    const dy = mouseY - statePanInfo.panStart.y;
                    planeParams.origin.x = statePanInfo.panStartOrigin.x + dx;
                    planeParams.origin.y = statePanInfo.panStartOrigin.y + dy;
                    updatePlaneViewportRanges(planeParams);
                    domainColoringDirty = true;
                    requestRedrawAll();
                } else if (isZCanvas && !state.panStateZ.isPanning && !state.panStateW.isPanning) {
                    const worldCoords = mapCanvasToWorldCoords(mouseX, mouseY, planeParams);
                    state.probeZ = { re: worldCoords.x, im: worldCoords.y };
                    state.probeActive = true;
                    requestRedrawAll();
                } else if (!isZCanvas && state.laplaceModeEnabled && !state.laplaceDragging) {
                    // Hover effect or probe for Laplace if needed (optional)
                }
            } catch (error) {
                console.error(`Error in canvas (${planeType}) mousemove listener:`, error);
            }
        });
        canvas.addEventListener('mousedown', (e) => {
            try {
                const isSphereActive = (isZCanvas && (state.riemannSphereViewEnabled && !state.splitViewEnabled)) ||
                    (!isZCanvas && (state.riemannSphereViewEnabled || state.splitViewEnabled));
                if (isSphereActive) return;

                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // --- Laplace winding mode: per-panel panning start ---
                if (!isZCanvas && state.laplaceModeEnabled && state.laplaceTopVP && state.lapaceBotVP) {
                    if (e.button === 0) {
                        const topH = state.laplaceTopVP.height;
                        const isTop = mouseY < topH; // Simple hit test since panels are top/bottom
                        const vp = isTop ? state.laplaceTopVP : state.lapaceBotVP;

                        state.laplaceDragging = {
                            panel: isTop ? 'top' : 'bot',
                            startX: mouseX,
                            startY: mouseY,
                            startOrigin: { x: vp.origin.x, y: vp.origin.y }
                        };
                        canvas.style.cursor = 'grabbing';
                        return;
                    }
                }

                if (isZCanvas) {


                    if (e.button === 0 && state.streamlineFlowEnabled) {
                        const worldCoords = mapCanvasToWorldCoords(mouseX, mouseY, planeParams);
                        if (worldCoords) {
                            state.manualSeedPoints.push({ re: worldCoords.x, im: worldCoords.y });

                            requestRedrawAll();
                            e.stopPropagation();
                            return;
                        }
                    }
                }


                if (e.button === 0) {
                    statePanInfo.isPanning = true;
                    statePanInfo.panStart.x = mouseX;
                    statePanInfo.panStart.y = mouseY;
                    statePanInfo.panStartOrigin.x = planeParams.origin.x;
                    statePanInfo.panStartOrigin.y = planeParams.origin.y;
                    canvas.style.cursor = 'grabbing';
                    if (isZCanvas) state.probeActive = false;
                    requestRedrawAll();
                }
            } catch (error) {
                console.error(`Error in canvas (${planeType}) mousedown listener:`, error);
            }
        });
        canvas.addEventListener('mouseup', (e) => {
            try {
                const isSphereActive = (isZCanvas && (state.riemannSphereViewEnabled && !state.splitViewEnabled)) ||
                    (!isZCanvas && (state.riemannSphereViewEnabled || state.splitViewEnabled));
                if (isSphereActive) return;

                // --- Laplace winding mode: panning end ---
                if (!isZCanvas && state.laplaceDragging) {
                    state.laplaceDragging = null;
                    canvas.style.cursor = 'crosshair';
                    return;
                }

                if (e.button === 0 && statePanInfo.isPanning) {
                    statePanInfo.isPanning = false;
                    canvas.style.cursor = 'crosshair';
                    if (isZCanvas) {
                        const rect = canvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const mouseY = e.clientY - rect.top;
                        if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
                            const worldCoords = mapCanvasToWorldCoords(mouseX, mouseY, planeParams);
                            state.probeZ = { re: worldCoords.x, im: worldCoords.y };
                            state.probeActive = true;
                        } else {
                            state.probeActive = false;
                        }
                        requestRedrawAll();
                    }
                }
            } catch (error) {
                console.error(`Error in canvas (${planeType}) mouseup listener:`, error);
            }
        });
        canvas.addEventListener('mouseleave', () => {
            try {
                const isSphereActive = (isZCanvas && (state.riemannSphereViewEnabled && !state.splitViewEnabled)) ||
                    (!isZCanvas && (state.riemannSphereViewEnabled || state.splitViewEnabled));
                if (isSphereActive) return;

                // --- Laplace winding mode: panning end ---
                if (!isZCanvas && state.laplaceDragging) {
                    state.laplaceDragging = null;
                    canvas.style.cursor = 'crosshair';
                }

                if (statePanInfo.isPanning) {
                    statePanInfo.isPanning = false;
                    canvas.style.cursor = 'crosshair';
                    domainColoringDirty = true;

                }
                if (isZCanvas) {
                    state.probeActive = false;
                }
                requestRedrawAll();
            } catch (error) {
                console.error(`Error in canvas (${planeType}) mouseleave listener:`, error);
            }
        });
        canvas.addEventListener('wheel', (e) => {
            try {
                const isSphereActive = (isZCanvas && (state.riemannSphereViewEnabled && !state.splitViewEnabled)) ||
                    (!isZCanvas && (state.riemannSphereViewEnabled || state.splitViewEnabled));
                if (isSphereActive) return;

                e.preventDefault();

                // --- Laplace winding mode: per-panel zoom ---
                if (!isZCanvas && state.laplaceModeEnabled && state.laplaceTopVP && state.lapaceBotVP) {
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const zoomFactor = e.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;

                    const H = rect.height;
                    const gap = 4;
                    const topH = Math.floor((H - gap) / 2);
                    const inTop = mouseY < topH;

                    function zoomPanel(vp, mx, my) {
                        // Convert canvas coords to world coords before zoom
                        const worldX = (mx - vp.origin.x) / vp.scale.x;
                        const worldY = (vp.origin.y - my) / vp.scale.y;
                        vp.scale.x *= zoomFactor;
                        vp.scale.y *= zoomFactor;
                        // Keep world point under mouse
                        vp.origin.x = mx - worldX * vp.scale.x;
                        vp.origin.y = my + worldY * vp.scale.y;
                        // Update visible ranges
                        const halfW = vp.width / 2 / vp.scale.x;
                        const halfH = vp.height / 2 / vp.scale.y;
                        const cRe = (mx - vp.origin.x) / vp.scale.x - vp.width / 2 / vp.scale.x + halfW;
                        const cIm = (vp.origin.y - my) / vp.scale.y - vp.height / 2 / vp.scale.y + halfH;
                        // Simpler: derive from origin
                        const originWorldX = -vp.origin.x / vp.scale.x;
                        const originWorldY = (vp.origin.y - vp.offsetY - vp.height / 2) / vp.scale.y;
                        vp.currentVisXRange = [originWorldX, originWorldX + vp.width / vp.scale.x];
                        vp.currentVisYRange = [originWorldY - vp.height / (2 * vp.scale.y), originWorldY + vp.height / (2 * vp.scale.y)];
                    }

                    function zoomPanelCentered(vp, factor) {
                        // Zoom centered on panel center (for sync, no mouse-tracking)
                        const cx = vp.width / 2;
                        const cy = vp.offsetY + vp.height / 2;
                        const worldX = (cx - vp.origin.x) / vp.scale.x;
                        const worldY = (vp.origin.y - cy) / vp.scale.y;
                        vp.scale.x *= factor;
                        vp.scale.y *= factor;
                        vp.origin.x = cx - worldX * vp.scale.x;
                        vp.origin.y = cy + worldY * vp.scale.y;
                        vp.currentVisXRange = [worldX - vp.width / (2 * vp.scale.x), worldX + vp.width / (2 * vp.scale.x)];
                        vp.currentVisYRange = [worldY - vp.height / (2 * vp.scale.y), worldY + vp.height / (2 * vp.scale.y)];
                    }

                    const syncOn = state.laplaceWindingSyncZoom !== false; // default true

                    if (inTop) {
                        zoomPanel(state.laplaceTopVP, mouseX, mouseY);
                        if (syncOn) zoomPanelCentered(state.lapaceBotVP, zoomFactor);
                    } else {
                        zoomPanel(state.lapaceBotVP, mouseX, mouseY);
                        if (syncOn) zoomPanelCentered(state.laplaceTopVP, zoomFactor);
                    }

                    requestRedrawAll();
                    return;
                }

                // --- Generic zoom for all other modes ---
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const worldMouseBefore = mapCanvasToWorldCoords(mouseX, mouseY, planeParams);

                const zoomFactor = e.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
                const currentPlaneZoomStateKey = isZCanvas ? 'zPlaneZoom' : 'wPlaneZoom';

                let newEffectiveStateZoom = state[currentPlaneZoomStateKey] * zoomFactor;
                newEffectiveStateZoom = Math.max(MIN_STATE_ZOOM_LEVEL, Math.min(MAX_STATE_ZOOM_LEVEL, newEffectiveStateZoom));

                const actualZoomApplied = newEffectiveStateZoom / state[currentPlaneZoomStateKey];
                state[currentPlaneZoomStateKey] = newEffectiveStateZoom;

                planeParams.scale.x *= actualZoomApplied;
                planeParams.scale.y *= actualZoomApplied;

                planeParams.origin.x = mouseX - worldMouseBefore.x * planeParams.scale.x;
                planeParams.origin.y = mouseY + worldMouseBefore.y * planeParams.scale.y;

                updatePlaneViewportRanges(planeParams);
                domainColoringDirty = true;
                requestRedrawAll();
            } catch (error) {
                console.error(`Error in canvas (${planeType}) wheel listener:`, error);
            }
        });
    });


    zCanvas.addEventListener('mousedown', (e) => { try { handleSphereMouseDown(e, 'z'); } catch (err) { console.error("Error in zCanvas sphere mousedown:", err); } });
    zCanvas.addEventListener('mousemove', (e) => { try { handleSphereMouseMove(e, 'z'); } catch (err) { console.error("Error in zCanvas sphere mousemove:", err); } });
    zCanvas.addEventListener('mouseup', () => { try { handleSphereMouseUp('z'); } catch (err) { console.error("Error in zCanvas sphere mouseup:", err); } });
    zCanvas.addEventListener('mouseleave', () => { try { handleSphereMouseUp('z'); } catch (err) { console.error("Error in zCanvas sphere mouseleave:", err); } });

    wCanvas.addEventListener('mousedown', (e) => { try { handleSphereMouseDown(e, 'w'); } catch (err) { console.error("Error in wCanvas sphere mousedown:", err); } });
    wCanvas.addEventListener('mousemove', (e) => { try { handleSphereMouseMove(e, 'w'); } catch (err) { console.error("Error in wCanvas sphere mousemove:", err); } });
    wCanvas.addEventListener('mouseup', () => { try { handleSphereMouseUp('w'); } catch (err) { console.error("Error in wCanvas sphere mouseup:", err); } });
    wCanvas.addEventListener('mouseleave', () => { try { handleSphereMouseUp('w'); } catch (err) { console.error("Error in wCanvas sphere mouseleave:", err); } });

    controls.toggleFullscreenZBtn.addEventListener('click', () => { try { handleFullScreenToggle('z'); } catch (e) { console.error("Error in toggleFullscreenZBtn listener:", e); } });
    controls.toggleFullscreenWBtn.addEventListener('click', () => { try { handleFullScreenToggle('w'); } catch (e) { console.error("Error in toggleFullscreenWBtn listener:", e); } });

    // Laplace winding sync zoom button
    const laplaceWindingSyncBtn = document.getElementById('laplace_winding_sync_btn');
    if (laplaceWindingSyncBtn) {
        // Default: sync on
        state.laplaceWindingSyncZoom = true;
        laplaceWindingSyncBtn.addEventListener('click', () => {
            state.laplaceWindingSyncZoom = !state.laplaceWindingSyncZoom;
            laplaceWindingSyncBtn.textContent = state.laplaceWindingSyncZoom ? 'Sync Zoom: On' : 'Sync Zoom: Off';
            laplaceWindingSyncBtn.style.color = state.laplaceWindingSyncZoom
                ? 'rgba(150, 200, 255, 0.9)'
                : 'rgba(180, 180, 180, 0.6)';
            laplaceWindingSyncBtn.style.borderColor = state.laplaceWindingSyncZoom
                ? 'rgba(80, 120, 180, 0.5)'
                : 'rgba(80, 80, 80, 0.4)';
        });
    }

    // 3D surface fullscreen
    const laplace3dFsBtn = document.getElementById('toggle_fullscreen_laplace_3d_btn');
    if (laplace3dFsBtn) {
        laplace3dFsBtn.addEventListener('click', () => {
            try {
                const container3d = document.getElementById('laplace_3d_container');
                const column3d = document.getElementById('laplace_3d_column');
                if (!container3d) return;

                state.isLaplace3DFullScreen = !state.isLaplace3DFullScreen;
                const fullscreenContainer = controls.fullscreenContainer;

                if (state.isLaplace3DFullScreen) {
                    state.originalLaplace3DParent = container3d.parentElement;

                    fullscreenContainer.style.position = 'fixed';
                    fullscreenContainer.style.top = '0';
                    fullscreenContainer.style.left = '0';
                    fullscreenContainer.style.width = '100vw';
                    fullscreenContainer.style.height = '100vh';
                    fullscreenContainer.style.zIndex = '1000';
                    fullscreenContainer.style.backgroundColor = '#000';

                    controls.closeFullscreenBtn.onclick = () => { laplace3dFsBtn.click(); };
                    fullscreenContainer.appendChild(controls.closeFullscreenBtn);
                    controls.closeFullscreenBtn.classList.remove('hidden');

                    container3d.style.width = '100%';
                    container3d.style.height = '100%';
                    fullscreenContainer.appendChild(container3d);
                    document.body.appendChild(fullscreenContainer);
                    fullscreenContainer.classList.remove('hidden');
                    if (column3d) column3d.classList.add('hidden-visually');

                    laplace3dFsBtn.textContent = '✖ Exit';

                    // Resize Plotly after layout settles
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            try { Plotly.Plots.resize(container3d); } catch (e) { }
                        }, 150);
                    });
                } else {
                    const origParent = state.originalLaplace3DParent;
                    if (origParent) origParent.appendChild(container3d);
                    container3d.style.width = '100%';
                    container3d.style.height = '100%';

                    fullscreenContainer.classList.add('hidden');
                    if (fullscreenContainer.parentElement === document.body) {
                        document.body.removeChild(fullscreenContainer);
                    }
                    if (controls.closeFullscreenBtn.parentElement === fullscreenContainer) {
                        fullscreenContainer.removeChild(controls.closeFullscreenBtn);
                        controls.closeFullscreenBtn.classList.add('hidden');
                    }
                    if (column3d) column3d.classList.remove('hidden-visually');

                    fullscreenContainer.style.position = '';
                    fullscreenContainer.style.top = '';
                    fullscreenContainer.style.left = '';
                    fullscreenContainer.style.width = '';
                    fullscreenContainer.style.height = '';
                    fullscreenContainer.style.zIndex = '';
                    fullscreenContainer.style.backgroundColor = '';

                    laplace3dFsBtn.textContent = 'Fullscreen';

                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            try { Plotly.Plots.resize(container3d); } catch (e) { }
                        }, 100);
                    });
                }
            } catch (e) {
                console.error('Error in laplace 3D fullscreen toggle:', e);
            }
        });
    }


    if (controls.enableParticleAnimationCb) {
        controls.enableParticleAnimationCb.addEventListener('change', (e) => {
            try {
                state.particleAnimationEnabled = e.target.checked;
                if (controls.particleAnimationDetailsDiv) {
                    controls.particleAnimationDetailsDiv.classList.toggle('hidden', !state.particleAnimationEnabled);
                }
                if (!state.particleAnimationEnabled) {
                    state.particles = [];
                }

                requestRedrawAll();
            } catch (error) {
                console.error("Error in enableParticleAnimationCb change listener:", error);
            }
        });
    }
    if (controls.particleDensitySlider) {
        controls.particleDensitySlider.addEventListener('input', () => {
            try {
                state.particleDensity = parseInt(controls.particleDensitySlider.value);
                state.particles = [];
                requestRedrawAll();
            } catch (error) {
                console.error("Error in particleDensitySlider input listener:", error);
            }
        });
    }
    if (controls.particleSpeedSlider) {
        controls.particleSpeedSlider.addEventListener('input', () => {
            try {
                state.particleSpeed = parseFloat(controls.particleSpeedSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in particleSpeedSlider input listener:", error);
            }
        });
    }
    if (controls.particleMaxLifetimeSlider) {
        controls.particleMaxLifetimeSlider.addEventListener('input', () => {
            try {
                state.particleMaxLifetime = parseInt(controls.particleMaxLifetimeSlider.value);
                requestRedrawAll();
            } catch (error) {
                console.error("Error in particleMaxLifetimeSlider input listener:", error);
            }
        });
    }




    if (controls.clearManualSeedsBtn && !controls.clearManualSeedsBtn.dataset.listenerAttached) {
        controls.clearManualSeedsBtn.addEventListener('click', () => {
            try {
                state.manualSeedPoints = [];
                requestRedrawAll();
            } catch (error) {
                console.error("Error in clearManualSeedsBtn click listener:", error);
            }
        });
        controls.clearManualSeedsBtn.dataset.listenerAttached = 'true';
    }


    if (controls.showVectorFieldPanelCb && controls.vectorFlowOptionsContent) {
        controls.showVectorFieldPanelCb.addEventListener('change', (e) => {
            try {
                state.showVectorFieldPanelEnabled = e.target.checked;
                controls.vectorFlowOptionsContent.classList.toggle('hidden', !state.showVectorFieldPanelEnabled);
            } catch (error) {
                console.error("Error in showVectorFieldPanelCb change listener:", error);
            }
        });

    }




    document.addEventListener('keydown', (e) => {
        try {
            if (e.key === 'Escape') {
                if (state.isZFullScreen) handleFullScreenToggle('z');
                if (state.isWFullScreen) handleFullScreenToggle('w');
                if (state.isLaplace3DFullScreen) {
                    const btn = document.getElementById('toggle_fullscreen_laplace_3d_btn');
                    if (btn) btn.click();
                }
            }
        } catch (error) {
            console.error("Error in document keydown listener for Escape key:", error);
        }
    });

    if (controls.toggleSphereAxesGridCb) {
        controls.toggleSphereAxesGridCb.addEventListener('change', (e) => {
            try {
                state.showSphereAxesAndGrid = e.target.checked;
                requestRedrawAll();
            } catch (error) {
                console.error("Error in toggleSphereAxesGridCb change listener:", error);
            }
        });
    }
}


function attemptPlotlyResize(plotlyDiv, maxAttempts = 3, delay = 100, currentAttempt = 1) {
    if (!plotlyDiv) return;




    const width = plotlyDiv.offsetWidth;

    const height = plotlyDiv.offsetHeight;

    if (width > 0 && height > 0) {
        try {
            Plotly.Plots.resize(plotlyDiv);

        } catch (resizeError) {
            console.error(`Error during Plotly.Plots.resize (attempt ${currentAttempt}):`, resizeError);
        }
    } else {
        if (currentAttempt < maxAttempts) {

            setTimeout(() => {
                attemptPlotlyResize(plotlyDiv, maxAttempts, delay, currentAttempt + 1);
            }, delay);
        } else {
            console.warn(`Plotly container ${plotlyDiv.id} still has zero dimensions after ${maxAttempts} attempts. Resize failed. Dimensions: ${width}x${height}`);
        }
    }
}


function handleSphereMouseDown(e, planeType) {
    try {
        const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
        const isActiveSphere = (planeType === 'z' && state.riemannSphereViewEnabled && !state.splitViewEnabled) ||
            (planeType === 'w' && (state.riemannSphereViewEnabled || state.splitViewEnabled));
        if (!isActiveSphere) return;

        sphereParams.dragging = true;
        sphereParams.lastMouseX = e.clientX;
        sphereParams.lastMouseY = e.clientY;
        const canvas = planeType === 'z' ? zCanvas : wCanvas;
        canvas.style.cursor = 'grabbing';
    } catch (error) {
        console.error(`Error in handleSphereMouseDown (${planeType}):`, error);
    }
}
function handleSphereMouseMove(e, planeType) {
    try {
        const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
        const isActiveSphere = (planeType === 'z' && state.riemannSphereViewEnabled && !state.splitViewEnabled) ||
            (planeType === 'w' && (state.riemannSphereViewEnabled || state.splitViewEnabled));
        if (!isActiveSphere) return;

        if (sphereParams.dragging) {
            const dx = e.clientX - sphereParams.lastMouseX;
            const dy = e.clientY - sphereParams.lastMouseY;
            sphereParams.rotY += dx * SPHERE_SENSITIVITY;
            sphereParams.rotX += dy * SPHERE_SENSITIVITY;
            sphereParams.rotX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, sphereParams.rotX));
            sphereParams.lastMouseX = e.clientX;
            sphereParams.lastMouseY = e.clientY;
            domainColoringDirty = true;
            requestRedrawAll();
        }
    } catch (error) {
        console.error(`Error in handleSphereMouseMove (${planeType}):`, error);
    }
}
function handleSphereMouseUp(planeType) {
    try {
        const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
        const isActiveSphere = (planeType === 'z' && state.riemannSphereViewEnabled && !state.splitViewEnabled) ||
            (planeType === 'w' && (state.riemannSphereViewEnabled || state.splitViewEnabled));
        if (!isActiveSphere && !sphereParams.dragging) return;

        sphereParams.dragging = false;
        const canvas = planeType === 'z' ? zCanvas : wCanvas;
        canvas.style.cursor = 'crosshair';
    } catch (error) {
        console.error(`Error in handleSphereMouseUp (${planeType}):`, error);
    }
}


function handleFullScreenToggle(planeType) {
    try {
        const isZPlane = planeType === 'z';
        let currentElement;
        let isPlotlyCase = false;
        const wPlotlyContainer = document.getElementById('w_plane_plotly_container');

        if (isZPlane) {
            currentElement = zCanvas;
        } else {
            if (state.plotly3DEnabled && state.riemannSphereViewEnabled && wPlotlyContainer) {
                currentElement = wPlotlyContainer;
                isPlotlyCase = true;
            } else {
                currentElement = wCanvas;
            }
        }

        if (!currentElement) {
            console.error("Fullscreen target element not found for plane:", planeType, "isPlotlyCase:", isPlotlyCase);
            return;
        }

        const canvasCard = isZPlane ? controls.zCanvasCard : controls.wCanvasCard;
        const fullscreenContainer = controls.fullscreenContainer;
        const toggleButton = isZPlane ? controls.toggleFullscreenZBtn : controls.toggleFullscreenWBtn;

        let isNowFullScreenGlobalState;
        if (isZPlane) {
            state.isZFullScreen = !state.isZFullScreen;
            isNowFullScreenGlobalState = state.isZFullScreen;
        } else {
            state.isWFullScreen = !state.isWFullScreen;
            isNowFullScreenGlobalState = state.isWFullScreen;
        }

        if (isNowFullScreenGlobalState) {

            if (isZPlane) {
                state.originalZParent = currentElement.parentElement;
                state.originalZStyle = { width: currentElement.style.width, height: currentElement.style.height };
            } else {
                state.originalWParent = currentElement.parentElement;
                state.originalWStyle = { width: currentElement.style.width, height: currentElement.style.height };
            }


            fullscreenContainer.style.position = 'fixed';
            fullscreenContainer.style.top = '0';
            fullscreenContainer.style.left = '0';
            fullscreenContainer.style.width = '100vw';
            fullscreenContainer.style.height = '100vh';
            fullscreenContainer.style.zIndex = '1000';
            fullscreenContainer.style.backgroundColor = 'var(--color-background-dark)';

            controls.closeFullscreenBtn.onclick = () => { try { handleFullScreenToggle(planeType); } catch (e) { console.error("Error in closeFullscreenBtn onclick handler:", e); } };
            fullscreenContainer.appendChild(controls.closeFullscreenBtn);
            controls.closeFullscreenBtn.classList.remove('hidden');

            fullscreenContainer.appendChild(currentElement);
            document.body.appendChild(fullscreenContainer);
            fullscreenContainer.classList.remove('hidden');

            if (canvasCard) canvasCard.classList.add('hidden-visually');

            if (isPlotlyCase) {
                if (wCanvas) wCanvas.classList.add('hidden');
                currentElement.classList.remove('hidden');

                currentElement.style.width = '100%';
                currentElement.style.height = '100%';
            } else {
                currentElement.style.width = '100%';
                currentElement.style.height = '100%';
            }

            // Move sync button if w-plane
            if (!isZPlane) {
                const syncBtn = document.getElementById('laplace_winding_sync_btn');
                if (syncBtn) {
                    fullscreenContainer.appendChild(syncBtn);
                    syncBtn.style.top = '50px'; // Move down a bit to avoid close button
                    syncBtn.style.right = '20px';
                }
            }

            toggleButton.textContent = "✖ Exit";

        } else {
            const originalParent = isZPlane ? state.originalZParent : state.originalWParent;
            const originalStyle = isZPlane ? state.originalZStyle : state.originalWStyle;

            if (originalParent) {
                originalParent.appendChild(currentElement);
                if (originalStyle) {
                    currentElement.style.width = originalStyle.width;
                    currentElement.style.height = originalStyle.height;
                } else {
                    currentElement.style.width = '';
                    currentElement.style.height = '';
                }
            } else {
                if (canvasCard && canvasCard.querySelector('div')) {
                    canvasCard.querySelector('div').appendChild(currentElement);
                }
                console.warn("Original parent for fullscreen element was not found, attempting fallback restoration.");
            }

            fullscreenContainer.classList.add('hidden');
            if (fullscreenContainer.parentElement === document.body) {
                document.body.removeChild(fullscreenContainer);
            }
            if (controls.closeFullscreenBtn.parentElement === fullscreenContainer) {
                fullscreenContainer.removeChild(controls.closeFullscreenBtn);
                controls.closeFullscreenBtn.classList.add('hidden');
            }
            if (canvasCard) canvasCard.classList.remove('hidden-visually');

            // Move sync button back if w-plane
            if (!isZPlane) {
                const syncBtn = document.getElementById('laplace_winding_sync_btn');
                // state.originalWParent should be the div wrapper where the button belongs
                if (syncBtn && state.originalWParent) {
                    state.originalWParent.appendChild(syncBtn);
                    syncBtn.style.top = '8px';
                    syncBtn.style.right = '8px';
                }
            }

            fullscreenContainer.style.position = '';
            fullscreenContainer.style.top = '';
            fullscreenContainer.style.left = '';
            fullscreenContainer.style.width = '';
            fullscreenContainer.style.height = '';
            fullscreenContainer.style.zIndex = '';
            fullscreenContainer.style.backgroundColor = '';

            toggleButton.textContent = "Fullscreen";
        }



        setupVisualParameters(true, true);

        if (isPlotlyCase) {
            const plotlyDivToResize = currentElement;


            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (isNowFullScreenGlobalState) {
                        plotlyDivToResize.classList.remove('hidden');

                        plotlyDivToResize.style.width = '100%';
                        plotlyDivToResize.style.height = '100%';
                        attemptPlotlyResize(plotlyDivToResize, 5, 150);
                    } else {

                        attemptPlotlyResize(plotlyDivToResize, 3, 100);
                    }
                }, isNowFullScreenGlobalState ? 100 : 50);
            });
        } else {


        }

        domainColoringDirty = true;
        requestRedrawAll();

    } catch (error) {
        console.error(`Error in handleFullScreenToggle (${planeType}):`, error);
    }
}
