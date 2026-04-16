const DOMAIN_DIRTY_STATE_KEYS = new Set([
    'a0',
    'b0',
    'circleR',
    'ellipseA',
    'ellipseB',
    'hyperbolaA',
    'hyperbolaB',
    'stripY1',
    'stripY2',
    'sectorAngle1',
    'sectorAngle2',
    'sectorRMin',
    'sectorRMax',
    'imageSize',
    'imageOpacity',
    'videoSize',
    'videoOpacity',
    'vectorFieldScale',
    'zPlaneZoom',
    'wPlaneZoom'
]);

const BASIC_SLIDER_BINDINGS = [
    { controlKey: 'stripY1Slider', stateKey: 'stripY1', parser: parseFloat },
    { controlKey: 'stripY2Slider', stateKey: 'stripY2', parser: parseFloat },
    { controlKey: 'sectorAngle1Slider', stateKey: 'sectorAngle1', parser: parseFloat },
    { controlKey: 'sectorAngle2Slider', stateKey: 'sectorAngle2', parser: parseFloat },
    { controlKey: 'sectorRMinSlider', stateKey: 'sectorRMin', parser: parseFloat },
    { controlKey: 'sectorRMaxSlider', stateKey: 'sectorRMax', parser: parseFloat },
    { controlKey: 'gridDensitySlider', stateKey: 'gridDensity', parser: parseInteger },
    { controlKey: 'neighborhoodSizeSlider', stateKey: 'probeNeighborhoodSize', parser: parseFloat },
    { controlKey: 'vectorFieldScaleSlider', stateKey: 'vectorFieldScale', parser: parseFloat },
    { controlKey: 'vectorArrowThicknessSlider', stateKey: 'vectorArrowThickness', parser: parseFloat },
    { controlKey: 'vectorArrowHeadSizeSlider', stateKey: 'vectorArrowHeadSize', parser: parseFloat },
    { controlKey: 'streamlineStepSizeSlider', stateKey: 'streamlineStepSize', parser: parseFloat },
    { controlKey: 'streamlineMaxLengthSlider', stateKey: 'streamlineMaxLength', parser: parseInteger },
    { controlKey: 'streamlineThicknessSlider', stateKey: 'streamlineThickness', parser: parseFloat },
    { controlKey: 'streamlineSeedDensityFactorSlider', stateKey: 'streamlineSeedDensityFactor', parser: parseFloat },
    { controlKey: 'radialDiscreteStepsCountSlider', stateKey: 'radialDiscreteStepsCount', parser: parseInteger },
    { controlKey: 'plotlyGridDensitySlider', stateKey: 'plotlyGridDensity', parser: parseInteger },
    { controlKey: 'plotlySphereOpacitySlider', stateKey: 'plotlySphereOpacity', parser: parseFloat },
    { controlKey: 'taylorSeriesOrderSlider', stateKey: 'taylorSeriesOrder', parser: parseInteger },
    { controlKey: 'particleDensitySlider', stateKey: 'particleDensity', parser: parseInteger },
    { controlKey: 'particleSpeedSlider', stateKey: 'particleSpeed', parser: parseFloat },
    { controlKey: 'particleMaxLifetimeSlider', stateKey: 'particleMaxLifetime', parser: parseInteger },
    { controlKey: 'imageResolutionSlider', stateKey: 'imageResolution', parser: parseInteger },
    { controlKey: 'imageSizeSlider', stateKey: 'imageSize', parser: parseFloat },
    { controlKey: 'imageOpacitySlider', stateKey: 'imageOpacity', parser: parseFloat },
    { controlKey: 'videoResolutionSlider', stateKey: 'videoResolution', parser: parseInteger },
    { controlKey: 'videoFpsSlider', stateKey: 'videoProcessingFps', parser: parseInteger },
    { controlKey: 'videoSizeSlider', stateKey: 'videoSize', parser: parseFloat },
    { controlKey: 'videoOpacitySlider', stateKey: 'videoOpacity', parser: parseFloat },
    { controlKey: 'zPlaneZoomSlider', stateKey: 'zPlaneZoom', parser: parseFloat },
    { controlKey: 'wPlaneZoomSlider', stateKey: 'wPlaneZoom', parser: parseFloat },
    { controlKey: 'laplaceAnimationSpeedSlider', stateKey: 'laplaceAnimationSpeed', parser: parseFloat },
    { controlKey: 'fourierFrequencySlider', stateKey: 'fourierFrequency', parser: parseFloat },
    { controlKey: 'fourierAmplitudeSlider', stateKey: 'fourierAmplitude', parser: parseFloat },
    { controlKey: 'fourierTimeWindowSlider', stateKey: 'fourierTimeWindow', parser: parseFloat },
    { controlKey: 'fourierSamplesSlider', stateKey: 'fourierSamples', parser: parseInteger },
    { controlKey: 'fourierWindingFrequencySlider', stateKey: 'fourierWindingFrequency', parser: parseFloat },
    { controlKey: 'fourierWindingTimeSlider', stateKey: 'fourierWindingTime', parser: parseFloat },
    { controlKey: 'laplaceFrequencySlider', stateKey: 'laplaceFrequency', parser: parseFloat },
    { controlKey: 'laplaceDampingSlider', stateKey: 'laplaceDamping', parser: parseFloat },
    { controlKey: 'laplaceSigmaSlider', stateKey: 'laplaceSigma', parser: parseFloat },
    { controlKey: 'laplaceOmegaSlider', stateKey: 'laplaceOmega', parser: parseFloat },
    { controlKey: 'laplaceClipHeightSlider', stateKey: 'laplaceClipHeight', parser: parseFloat }
];

const BASIC_CHECKBOX_BINDINGS = [
    { controlKey: 'showZerosPolesCb', stateKey: 'showZerosPoles' },
    { controlKey: 'showCriticalPointsCb', stateKey: 'showCriticalPoints' },
    { controlKey: 'enableCauchyIntegralModeCb', stateKey: 'cauchyIntegralModeEnabled' },
    { controlKey: 'enableSplitViewCb', stateKey: 'splitViewEnabled' },
    { controlKey: 'enableVectorFieldCb', stateKey: 'vectorFieldEnabled' },
    { controlKey: 'enableStreamlineFlowCb', stateKey: 'streamlineFlowEnabled' },
    { controlKey: 'enableRadialDiscreteStepsCb', stateKey: 'radialDiscreteStepsEnabled' },
    { controlKey: 'enableRiemannSphereCb', stateKey: 'riemannSphereViewEnabled' },
    { controlKey: 'enablePlotly3DCb', stateKey: 'plotly3DEnabled' },
    { controlKey: 'toggleSphereAxesGridCb', stateKey: 'showSphereAxesAndGrid' },
    { controlKey: 'togglePlotlySphereGridCb', stateKey: 'showPlotlySphereGrid' },
    { controlKey: 'enableTaylorSeriesCb', stateKey: 'taylorSeriesEnabled' },
    { controlKey: 'enableTaylorSeriesCustomCenterCb', stateKey: 'taylorSeriesCustomCenterEnabled' },
    { controlKey: 'laplaceShowROCCb', stateKey: 'laplaceShowROC' },
    { controlKey: 'laplaceShowPolesZerosCb', stateKey: 'laplaceShowPolesZeros' },
    { controlKey: 'laplaceShowFourierLineCb', stateKey: 'laplaceShowFourierLine' },
    { controlKey: 'laplaceAnimationLoopCb', stateKey: 'laplaceAnimationLoop' },
    { controlKey: 'enableParticleAnimationCb', stateKey: 'particleAnimationEnabled' },
    { controlKey: 'showVectorFieldPanelCb', stateKey: 'showVectorFieldPanelEnabled' },
    { controlKey: 'enableDomainColoringCb', stateKey: 'domainColoringEnabled' }
];

const BASIC_SELECTOR_BINDINGS = [
    { controlKey: 'inputShapeSelector', stateKey: 'currentInputShape' },
    { controlKey: 'vectorFieldFunctionSelector', stateKey: 'vectorFieldFunction' },
    { controlKey: 'fourierFunctionSelector', stateKey: 'fourierFunction' },
    { controlKey: 'laplaceFunctionSelector', stateKey: 'laplaceFunction' },
    { controlKey: 'laplaceVizModeSelector', stateKey: 'laplaceVizMode' }
];

const SPHERE_VIEW_BUTTONS = {
    sphereViewNorthBtn: { rotX: -Math.PI / 2 + 0.01, rotY: 0 },
    sphereViewSouthBtn: { rotX: Math.PI / 2 - 0.01, rotY: 0 },
    sphereViewEastBtn: { rotX: 0, rotY: -Math.PI / 2 },
    sphereViewWestBtn: { rotX: 0, rotY: Math.PI / 2 },
    sphereViewFrontBtn: { rotX: 0, rotY: 0 },
    sphereViewResetBtn: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y }
};

let uiEventListenersBound = false;

function parseInteger(value) {
    return parseInt(value, 10);
}

function parseControlValue(control, parser = parseFloat, fallback = 0) {
    if (!control) {
        return fallback;
    }

    const parsed = parser(control.value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function readSliderState(controlKey, stateKey, parser = parseFloat) {
    const control = controls[controlKey];
    if (!control) {
        return state[stateKey];
    }

    state[stateKey] = parseControlValue(control, parser, state[stateKey]);
    return state[stateKey];
}

function readCheckboxState(controlKey, stateKey) {
    const control = controls[controlKey];
    if (!control) {
        return state[stateKey];
    }

    state[stateKey] = control.checked;
    return state[stateKey];
}

function readSelectorState(controlKey, stateKey) {
    const control = controls[controlKey];
    if (!control) {
        return state[stateKey];
    }

    state[stateKey] = control.value;
    return state[stateKey];
}

function shouldMarkDomainDirty(controlKey, stateKey) {
    return DOMAIN_DIRTY_STATE_KEYS.has(stateKey) ||
        controlKey.startsWith('mobius') ||
        controlKey.startsWith('domain');
}

function requestDomainRedraw(markDomainDirty = false) {
    if (markDomainDirty) {
        domainColoringDirty = true;
    }
    requestRedrawAll();
}

function bindElementListener(element, eventName, handler) {
    if (!element) {
        return;
    }

    element.addEventListener(eventName, event => {
        try {
            handler(event, element);
        } catch (error) {
            console.error(`Error in ${element.id || 'element'} ${eventName} listener:`, error);
        }
    });
}

function bindControlListener(controlKey, eventName, handler) {
    bindElementListener(controls[controlKey], eventName, handler);
}

function bindSlider(controlKey, stateKey, parser = parseFloat, customCallback = null) {
    bindControlListener(controlKey, 'input', (_event, slider) => {
        state[stateKey] = parseControlValue(slider, parser, state[stateKey]);

        if (customCallback) {
            customCallback(state[stateKey], slider);
            return;
        }

        requestDomainRedraw(shouldMarkDomainDirty(controlKey, stateKey));
    });
}

function bindCheckbox(controlKey, stateKey, customCallback = null) {
    bindControlListener(controlKey, 'change', (event, checkbox) => {
        state[stateKey] = checkbox.checked;

        if (customCallback) {
            customCallback(event, checkbox.checked, checkbox);
            return;
        }

        requestRedrawAll();
    });
}

function bindSelector(controlKey, stateKey, customCallback = null) {
    bindControlListener(controlKey, 'change', (event, selector) => {
        state[stateKey] = selector.value;

        if (customCallback) {
            customCallback(event, selector.value, selector);
            return;
        }

        requestDomainRedraw(true);
    });
}

function syncLaplacePlayPauseButton() {
    if (!controls.laplacePlayPauseBtn) {
        return;
    }

    controls.laplacePlayPauseBtn.innerHTML = state.laplaceAnimationPlaying ? '⏸ Pause' : '▶ Play';
}

function syncLaplaceWindingSyncButton() {
    if (!controls.laplaceWindingSyncBtn) {
        return;
    }

    controls.laplaceWindingSyncBtn.textContent = state.laplaceWindingSyncZoom ? 'Sync Zoom: On' : 'Sync Zoom: Off';
    controls.laplaceWindingSyncBtn.style.color = state.laplaceWindingSyncZoom
        ? 'rgba(150, 200, 255, 0.9)'
        : 'rgba(180, 180, 180, 0.6)';
    controls.laplaceWindingSyncBtn.style.borderColor = state.laplaceWindingSyncZoom
        ? 'rgba(80, 120, 180, 0.5)'
        : 'rgba(80, 80, 80, 0.4)';
}

function setActiveFunctionButton(activeKey) {
    Object.entries(controls.funcButtons).forEach(([key, button]) => {
        if (!button) {
            return;
        }

        const isActive = key === activeKey;
        button.classList.toggle('active', isActive);
        button.classList.toggle('btn-primary', isActive);
        button.classList.toggle('btn-outline-secondary', !isActive);
    });
}

function updateModePanels() {
    if (controls.fourierSpecificControlsDiv) {
        controls.fourierSpecificControlsDiv.classList.toggle('hidden', !state.fourierModeEnabled);
    }
    if (controls.laplaceSpecificControlsDiv) {
        controls.laplaceSpecificControlsDiv.classList.toggle('hidden', !state.laplaceModeEnabled);
    }
    if (controls.laplaceWindingSyncBtn) {
        controls.laplaceWindingSyncBtn.style.display = state.laplaceModeEnabled ? 'block' : 'none';
    }

    syncLaplacePlayPauseButton();
    syncLaplaceWindingSyncButton();
}

function activateFunctionMode(key) {
    const enteringFourier = key === 'fourier';
    const enteringLaplace = key === 'laplace';

    if (state.laplaceModeEnabled && !enteringLaplace && typeof stopLaplaceAnimation === 'function') {
        stopLaplaceAnimation();
    }
    if ((enteringFourier || enteringLaplace) && state.currentInputShape === 'video' && typeof pauseUploadedVideoPlayback === 'function') {
        pauseUploadedVideoPlayback();
    }

    state.currentFunction = key;
    state.fourierModeEnabled = enteringFourier;
    state.laplaceModeEnabled = enteringLaplace;

    if (enteringFourier && typeof updateFourierTransform === 'function') {
        updateFourierTransform();
    }

    if (enteringLaplace) {
        state.laplaceTopVP = null;
        state.lapaceBotVP = null;
        state.laplaceDragging = null;
        state.laplaceNeedViewportReset = true;

        if (typeof updateLaplaceTransform === 'function') {
            updateLaplaceTransform();
        }
        if (typeof showFullLaplaceSpiral === 'function') {
            showFullLaplaceSpiral();
        }
    }

    updateModePanels();
    setActiveFunctionButton(key);
    requestDomainRedraw(true);
}

function readImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = event => {
        const img = new Image();
        img.onload = () => callback(img);
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function processUploadedImage(img) {
    if (processUploadedImageSource(img)) {
        requestDomainRedraw(true);
    }
}

function reprocessUploadedImage() {
    if (state.uploadedImage) {
        processUploadedImage(state.uploadedImage);
    }
}

function reprocessUploadedVideo() {
    if (!state.uploadedVideo) {
        return;
    }

    processUploadedVideoFrame(true);
    requestDomainRedraw(true);
}

function initializeMobiusState() {
    ['A', 'B', 'C', 'D'].forEach(param => {
        const nextValue = state[`mobius${param}`] || { re: 0, im: 0 };
        ['re', 'im'].forEach(part => {
            const controlKey = `mobius${param}_${part}_slider`;
            const slider = controls[controlKey];
            if (slider) {
                nextValue[part] = parseControlValue(slider, parseFloat, nextValue[part]);
            }
        });
        state[`mobius${param}`] = nextValue;
    });
}

function initializeCustomTaylorCenter() {
    if (controls.taylorSeriesCustomCenterReInput) {
        const parsed = parseFloat(controls.taylorSeriesCustomCenterReInput.value);
        state.taylorSeriesCustomCenter.re = Number.isNaN(parsed) ? state.taylorSeriesCustomCenter.re : parsed;
    }
    if (controls.taylorSeriesCustomCenterImInput) {
        const parsed = parseFloat(controls.taylorSeriesCustomCenterImInput.value);
        state.taylorSeriesCustomCenter.im = Number.isNaN(parsed) ? state.taylorSeriesCustomCenter.im : parsed;
    }
}

function syncTaylorCustomCenterInputs() {
    if (controls.taylorSeriesCustomCenterReInput && document.activeElement !== controls.taylorSeriesCustomCenterReInput) {
        controls.taylorSeriesCustomCenterReInput.value = formatTaylorNumericValue(state.taylorSeriesCustomCenter.re);
    }
    if (controls.taylorSeriesCustomCenterImInput && document.activeElement !== controls.taylorSeriesCustomCenterImInput) {
        controls.taylorSeriesCustomCenterImInput.value = formatTaylorNumericValue(state.taylorSeriesCustomCenter.im);
    }
}

function setTaylorCustomCenter(re, im, shouldRedraw = true) {
    state.taylorSeriesCustomCenter.re = re;
    state.taylorSeriesCustomCenter.im = im;
    syncTaylorCustomCenterInputs();

    if (typeof syncTaylorSeriesCenterStatus === 'function') {
        syncTaylorSeriesCenterStatus();
    }
    if (typeof syncTaylorSeriesPresetSelection === 'function') {
        syncTaylorSeriesPresetSelection();
    }

    if (shouldRedraw) {
        requestRedrawAll();
    }
}

function initializeScalarBindings() {
    sliderParamKeys.forEach(key => {
        readSliderState(`${key}Slider`, key, parseFloat);
    });

    BASIC_SLIDER_BINDINGS.forEach(({ controlKey, stateKey, parser }) => {
        readSliderState(controlKey, stateKey, parser);
    });

    BASIC_CHECKBOX_BINDINGS.forEach(({ controlKey, stateKey }) => {
        readCheckboxState(controlKey, stateKey);
    });

    BASIC_SELECTOR_BINDINGS.forEach(({ controlKey, stateKey }) => {
        readSelectorState(controlKey, stateKey);
    });

    initializeMobiusState();
    initializeCustomTaylorCenter();
}

window.initializeStateFromControls = function () {
    initializeScalarBindings();
    updateModePanels();
    setActiveFunctionButton(state.currentFunction);
    if (typeof syncVideoPlaybackUI === 'function') {
        syncVideoPlaybackUI();
    }
};

function bindBaseParameterControls() {
    sliderParamKeys.forEach(key => {
        bindSlider(`${key}Slider`, key, parseFloat);

        const playButton = controls[`play_${key}Btn`];
        const speedSelector = controls[`speed_${key}Selector`];
        const slider = controls[`${key}Slider`];

        if (!slider || !playButton || !speedSelector) {
            return;
        }

        bindElementListener(playButton, 'click', () => {
            toggleAnimation(
                slider,
                value => {
                    state[key] = value;
                },
                playButton,
                speedSelector
            );
        });
    });
}

function bindMobiusControls() {
    ['A', 'B', 'C', 'D'].forEach(param => {
        ['re', 'im'].forEach(part => {
            const sliderKey = `mobius${param}_${part}_slider`;
            const playButtonKey = `play_mobius${param}_${part}_btn`;
            const speedSelectorKey = `speed_mobius${param}_${part}_selector`;

            bindControlListener(sliderKey, 'input', (_event, slider) => {
                const value = parseControlValue(slider, parseFloat, 0);
                if (!state[`mobius${param}`]) {
                    state[`mobius${param}`] = { re: 0, im: 0 };
                }

                state[`mobius${param}`][part] = value;
                requestDomainRedraw(true);
            });

            const slider = controls[sliderKey];
            const playButton = controls[playButtonKey];
            const speedSelector = controls[speedSelectorKey];

            if (!slider || !playButton || !speedSelector) {
                return;
            }

            bindElementListener(playButton, 'click', () => {
                toggleAnimation(
                    slider,
                    value => {
                        if (!state[`mobius${param}`]) {
                            state[`mobius${param}`] = { re: 0, im: 0 };
                        }

                        state[`mobius${param}`][part] = value;
                    },
                    playButton,
                    speedSelector
                );
            });
        });
    });
}

function bindFunctionButtons() {
    Object.entries(controls.funcButtons).forEach(([key, button]) => {
        bindElementListener(button, 'click', () => {
            activateFunctionMode(key);
        });
    });
}

function bindImageControls() {
    bindControlListener('imageUploadInput', 'change', event => {
        const [file] = event.target.files || [];
        if (!file) {
            return;
        }

        readImageFile(file, processUploadedImage);
    });

    bindSlider('imageResolutionSlider', 'imageResolution', parseInteger, () => {
        reprocessUploadedImage();
        requestRedrawAll();
    });

    bindSlider('imageSizeSlider', 'imageSize', parseFloat, () => {
        requestDomainRedraw(true);
    });

    bindSlider('imageOpacitySlider', 'imageOpacity', parseFloat, () => {
        requestDomainRedraw(true);
    });
}

function bindVideoControls() {
    bindControlListener('videoUploadInput', 'change', event => {
        const [file] = event.target.files || [];
        if (!file) {
            return;
        }

        loadUploadedVideoFile(file);
    });

    bindControlListener('videoPlayPauseBtn', 'click', () => {
        toggleUploadedVideoPlayback();
    });

    bindSlider('videoResolutionSlider', 'videoResolution', parseInteger, () => {
        reprocessUploadedVideo();
        requestRedrawAll();
    });

    bindSlider('videoFpsSlider', 'videoProcessingFps', parseInteger, () => {
        syncVideoPlaybackUI();
        if (state.videoIsPlaying && state.currentInputShape === 'video') {
            startVideoProcessingLoop();
        }
        requestRedrawAll();
    });

    bindSlider('videoSizeSlider', 'videoSize', parseFloat, () => {
        requestDomainRedraw(true);
    });

    bindSlider('videoOpacitySlider', 'videoOpacity', parseFloat, () => {
        requestDomainRedraw(true);
    });
}

function bindDomainColoringControls() {
    bindCheckbox('enableDomainColoringCb', 'domainColoringEnabled', () => {
        if (controls.domainColoringOptionsDiv) {
            controls.domainColoringOptionsDiv.classList.toggle('hidden', !state.domainColoringEnabled);
        }
        if (controls.domainColoringKeyDiv) {
            controls.domainColoringKeyDiv.classList.toggle('hidden', !state.domainColoringEnabled);
        }
        requestDomainRedraw(true);
    });

    ['domainBrightness', 'domainContrast', 'domainSaturation', 'domainLightnessCycles'].forEach(stateKey => {
        bindSlider(`${stateKey}Slider`, stateKey, parseFloat, () => {
            requestDomainRedraw(true);
        });
    });
}

function bindViewControls() {
    bindCheckbox('enableSplitViewCb', 'splitViewEnabled', () => {
        requestDomainRedraw(true);
    });

    bindSlider('zPlaneZoomSlider', 'zPlaneZoom', parseFloat, () => {
        setupVisualParameters(true, false);
        requestDomainRedraw(true);
    });

    bindSlider('wPlaneZoomSlider', 'wPlaneZoom', parseFloat, () => {
        setupVisualParameters(false, true);
        requestDomainRedraw(true);
    });

    bindCheckbox('enableRiemannSphereCb', 'riemannSphereViewEnabled', () => {
        if (controls.riemannSphereOptionsDiv) {
            controls.riemannSphereOptionsDiv.classList.toggle('hidden', !state.riemannSphereViewEnabled);
        }
        if (!state.riemannSphereViewEnabled && controls.plotly3DOptionsDiv) {
            controls.plotly3DOptionsDiv.classList.add('hidden');
        }
        requestDomainRedraw(true);
    });

    bindCheckbox('enablePlotly3DCb', 'plotly3DEnabled', () => {
        if (controls.plotly3DOptionsDiv) {
            controls.plotly3DOptionsDiv.classList.toggle('hidden', !state.plotly3DEnabled);
        }
        requestRedrawAll();
    });

    bindCheckbox('toggleSphereAxesGridCb', 'showSphereAxesAndGrid');
    bindCheckbox('togglePlotlySphereGridCb', 'showPlotlySphereGrid');

    Object.entries(SPHERE_VIEW_BUTTONS).forEach(([controlKey, rotation]) => {
        bindControlListener(controlKey, 'click', () => {
            sphereViewParams.z.rotX = rotation.rotX;
            sphereViewParams.z.rotY = rotation.rotY;
            sphereViewParams.w.rotX = rotation.rotX;
            sphereViewParams.w.rotY = rotation.rotY;
            requestDomainRedraw(true);
        });
    });
}

function bindVectorFieldControls() {
    bindCheckbox('enableVectorFieldCb', 'vectorFieldEnabled', () => {
        if (controls.vectorFieldOptionsDiv) {
            controls.vectorFieldOptionsDiv.classList.toggle('hidden', !state.vectorFieldEnabled);
        }
        requestDomainRedraw(true);
    });

    bindSelector('vectorFieldFunctionSelector', 'vectorFieldFunction', () => {
        requestRedrawAll();
    });

    [
        { controlKey: 'vectorFieldScaleSlider', stateKey: 'vectorFieldScale', parser: parseFloat },
        { controlKey: 'vectorArrowThicknessSlider', stateKey: 'vectorArrowThickness', parser: parseFloat },
        { controlKey: 'vectorArrowHeadSizeSlider', stateKey: 'vectorArrowHeadSize', parser: parseFloat },
        { controlKey: 'streamlineStepSizeSlider', stateKey: 'streamlineStepSize', parser: parseFloat },
        { controlKey: 'streamlineMaxLengthSlider', stateKey: 'streamlineMaxLength', parser: parseInteger },
        { controlKey: 'streamlineThicknessSlider', stateKey: 'streamlineThickness', parser: parseFloat },
        { controlKey: 'streamlineSeedDensityFactorSlider', stateKey: 'streamlineSeedDensityFactor', parser: parseFloat }
    ].forEach(({ controlKey, stateKey, parser }) => {
        bindSlider(controlKey, stateKey, parser);
    });

    bindCheckbox('enableStreamlineFlowCb', 'streamlineFlowEnabled');

    bindControlListener('clearManualSeedsBtn', 'click', () => {
        state.manualSeedPoints = [];
        requestRedrawAll();
    });

    bindCheckbox('showVectorFieldPanelCb', 'showVectorFieldPanelEnabled', () => {
        if (controls.vectorFlowOptionsContent) {
            controls.vectorFlowOptionsContent.classList.toggle('hidden', !state.showVectorFieldPanelEnabled);
        }
    });
}

function bindTaylorControls() {
    bindCheckbox('enableTaylorSeriesCb', 'taylorSeriesEnabled', () => {
        if (controls.taylorSeriesOptionsDetailDiv) {
            controls.taylorSeriesOptionsDetailDiv.classList.toggle('hidden', !state.taylorSeriesEnabled);
        }
        requestRedrawAll();
    });

    bindSlider('taylorSeriesOrderSlider', 'taylorSeriesOrder', parseInteger);

    bindCheckbox('enableTaylorSeriesCustomCenterCb', 'taylorSeriesCustomCenterEnabled', () => {
        if (controls.taylorSeriesCustomCenterInputsDiv) {
            controls.taylorSeriesCustomCenterInputsDiv.classList.toggle('hidden', !state.taylorSeriesCustomCenterEnabled);
        }
        if (typeof syncTaylorSeriesCenterStatus === 'function') {
            syncTaylorSeriesCenterStatus();
        }
        requestRedrawAll();
    });

    bindElementListener(controls.taylorSeriesPresetGroups, 'click', event => {
        const presetButton = event.target.closest('[data-taylor-preset-re][data-taylor-preset-im]');
        if (!presetButton) {
            return;
        }

        const presetRe = parseFloat(presetButton.dataset.taylorPresetRe);
        const presetIm = parseFloat(presetButton.dataset.taylorPresetIm);
        if (Number.isNaN(presetRe) || Number.isNaN(presetIm)) {
            return;
        }

        setTaylorCustomCenter(presetRe, presetIm);
    });

    bindControlListener('taylorSeriesCustomCenterReInput', 'input', (_event, input) => {
        const parsed = parseFloat(input.value);
        state.taylorSeriesCustomCenter.re = Number.isNaN(parsed) ? 0 : parsed;
        if (typeof syncTaylorSeriesPresetSelection === 'function') {
            syncTaylorSeriesPresetSelection();
        }
    });
    bindControlListener('taylorSeriesCustomCenterReInput', 'change', (_event, input) => {
        const parsed = parseFloat(input.value);
        setTaylorCustomCenter(Number.isNaN(parsed) ? 0 : parsed, state.taylorSeriesCustomCenter.im);
    });

    bindControlListener('taylorSeriesCustomCenterImInput', 'input', (_event, input) => {
        const parsed = parseFloat(input.value);
        state.taylorSeriesCustomCenter.im = Number.isNaN(parsed) ? 0 : parsed;
        if (typeof syncTaylorSeriesPresetSelection === 'function') {
            syncTaylorSeriesPresetSelection();
        }
    });
    bindControlListener('taylorSeriesCustomCenterImInput', 'change', (_event, input) => {
        const parsed = parseFloat(input.value);
        setTaylorCustomCenter(state.taylorSeriesCustomCenter.re, Number.isNaN(parsed) ? 0 : parsed);
    });
}

function bindPolynomialControls() {
    bindSlider('polynomialNSlider', 'polynomialN', parseInteger, value => {
        initializePolynomialCoeffs(value, true);
        generatePolynomialCoeffSliders();
        requestDomainRedraw(true);
    });
}

function bindRadialAndZetaControls() {
    bindCheckbox('enableRadialDiscreteStepsCb', 'radialDiscreteStepsEnabled');
    bindSlider('radialDiscreteStepsCountSlider', 'radialDiscreteStepsCount', parseInteger);

    bindControlListener('toggleZetaContinuationBtn', 'click', () => {
        state.zetaContinuationEnabled = !state.zetaContinuationEnabled;
        requestDomainRedraw(true);
    });
}

function bindParticleControls() {
    bindCheckbox('enableParticleAnimationCb', 'particleAnimationEnabled', () => {
        if (controls.particleAnimationDetailsDiv) {
            controls.particleAnimationDetailsDiv.classList.toggle('hidden', !state.particleAnimationEnabled);
        }
        if (!state.particleAnimationEnabled) {
            state.particles = [];
        }
        requestRedrawAll();
    });

    bindSlider('particleDensitySlider', 'particleDensity', parseInteger, () => {
        state.particles = [];
        requestRedrawAll();
    });

    bindSlider('particleSpeedSlider', 'particleSpeed', parseFloat);
    bindSlider('particleMaxLifetimeSlider', 'particleMaxLifetime', parseInteger);
}

function bindFourierControls() {
    bindSelector('fourierFunctionSelector', 'fourierFunction', () => {
        updateFourierTransform();
        requestRedrawAll();
    });

    ['fourierFrequency', 'fourierAmplitude', 'fourierTimeWindow', 'fourierSamples'].forEach(stateKey => {
        bindSlider(`${stateKey}Slider`, stateKey, stateKey === 'fourierSamples' ? parseInteger : parseFloat, () => {
            updateFourierTransform();
            requestRedrawAll();
        });
    });

    bindSlider('fourierWindingFrequencySlider', 'fourierWindingFrequency', parseFloat);
    bindSlider('fourierWindingTimeSlider', 'fourierWindingTime', parseFloat);
}

function bindLaplaceControls() {
    bindSelector('laplaceFunctionSelector', 'laplaceFunction', () => {
        updateLaplaceTransform();
        requestRedrawAll();
    });

    ['laplaceFrequency', 'laplaceDamping'].forEach(stateKey => {
        bindSlider(`${stateKey}Slider`, stateKey, parseFloat, () => {
            updateLaplaceTransform();
            requestRedrawAll();
        });
    });

    ['laplaceSigma', 'laplaceOmega'].forEach(stateKey => {
        bindSlider(`${stateKey}Slider`, stateKey, parseFloat, () => {
            updateLaplaceEvaluationPoint();
            requestRedrawAll();
        });
    });

    bindSelector('laplaceVizModeSelector', 'laplaceVizMode', () => {
        updateLaplace3DSurface();
        requestRedrawAll();
    });

    bindSlider('laplaceClipHeightSlider', 'laplaceClipHeight', parseFloat, () => {
        updateLaplace3DSurface();
        requestRedrawAll();
    });

    bindCheckbox('laplaceShowROCCb', 'laplaceShowROC');
    bindCheckbox('laplaceShowPolesZerosCb', 'laplaceShowPolesZeros');
    bindCheckbox('laplaceShowFourierLineCb', 'laplaceShowFourierLine');
    bindSlider('laplaceAnimationSpeedSlider', 'laplaceAnimationSpeed', parseFloat, () => {
        if (controls.laplaceAnimationSpeedDisplay) {
            controls.laplaceAnimationSpeedDisplay.textContent = state.laplaceAnimationSpeed.toFixed(1);
        }
        syncLaplacePlayPauseButton();
    });
    bindCheckbox('laplaceAnimationLoopCb', 'laplaceAnimationLoop');

    bindControlListener('laplacePlayPauseBtn', 'click', () => {
        if (typeof toggleLaplaceAnimation === 'function') {
            toggleLaplaceAnimation();
        }
        requestAnimationFrame(syncLaplacePlayPauseButton);
    });
    bindControlListener('laplaceResetBtn', 'click', () => {
        if (typeof resetLaplaceAnimation === 'function') {
            resetLaplaceAnimation();
        }
        requestAnimationFrame(syncLaplacePlayPauseButton);
    });
    bindControlListener('laplaceShowFullBtn', 'click', () => {
        if (typeof showFullLaplaceSpiral === 'function') {
            showFullLaplaceSpiral();
        }
        requestAnimationFrame(syncLaplacePlayPauseButton);
    });

    bindControlListener('laplaceFindPolesZerosBtn', 'click', () => {
        if (!state.laplaceModeEnabled) {
            return;
        }

        const result = findPolesZeros(state.laplaceFunction || 'damped_sine', {
            frequency: state.laplaceFrequency || 2.0,
            damping: state.laplaceDamping || 0.5,
            amplitude: state.laplaceAmplitude || 1.0
        });

        state.laplacePoles = result.poles;
        state.laplaceZeros = result.zeros;
        requestRedrawAll();
    });

    bindControlListener('laplaceStabilityAnalysisBtn', 'click', () => {
        if (!state.laplaceModeEnabled || !state.laplacePoles) {
            return;
        }

        state.laplaceStability = analyzeStability(state.laplacePoles);
        requestRedrawAll();
    });

    bindControlListener('laplaceWindingSyncBtn', 'click', () => {
        state.laplaceWindingSyncZoom = !state.laplaceWindingSyncZoom;
        syncLaplaceWindingSyncButton();
    });
}

function getCanvasInteractionContext(planeType) {
    return planeType === 'z'
        ? { canvas: zCanvas, planeParams: zPlaneParams, panState: state.panStateZ, isZCanvas: true }
        : { canvas: wCanvas, planeParams: wPlaneParams, panState: state.panStateW, isZCanvas: false };
}

function isSphereInteractionActive(isZCanvas) {
    return isZCanvas
        ? state.riemannSphereViewEnabled && !state.splitViewEnabled
        : state.riemannSphereViewEnabled || state.splitViewEnabled;
}

function getCanvasMousePosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
        rect,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function updateLaplaceViewportRanges(viewport) {
    const originWorldX = -viewport.origin.x / viewport.scale.x;
    const originWorldY = (viewport.origin.y - viewport.offsetY - viewport.height / 2) / viewport.scale.y;
    viewport.currentVisXRange = [originWorldX, originWorldX + viewport.width / viewport.scale.x];
    viewport.currentVisYRange = [
        originWorldY - viewport.height / (2 * viewport.scale.y),
        originWorldY + viewport.height / (2 * viewport.scale.y)
    ];
}

function getLaplaceViewportAtY(mouseY) {
    if (!state.laplaceTopVP || !state.lapaceBotVP) {
        return null;
    }

    const isTop = mouseY < state.laplaceTopVP.height;
    return {
        panel: isTop ? 'top' : 'bot',
        viewport: isTop ? state.laplaceTopVP : state.lapaceBotVP
    };
}

function zoomLaplaceViewport(viewport, mouseX, mouseY, factor, centered = false) {
    const anchorX = centered ? viewport.width / 2 : mouseX;
    const anchorY = centered ? viewport.offsetY + viewport.height / 2 : mouseY;

    const worldX = (anchorX - viewport.origin.x) / viewport.scale.x;
    const worldY = (viewport.origin.y - anchorY) / viewport.scale.y;

    viewport.scale.x *= factor;
    viewport.scale.y *= factor;
    viewport.origin.x = anchorX - worldX * viewport.scale.x;
    viewport.origin.y = anchorY + worldY * viewport.scale.y;

    updateLaplaceViewportRanges(viewport);
}

function bindCanvasInteractions() {
    ['z', 'w'].forEach(planeType => {
        const { canvas, planeParams, panState, isZCanvas } = getCanvasInteractionContext(planeType);

        bindElementListener(canvas, 'mousemove', event => {
            if (isSphereInteractionActive(isZCanvas)) {
                return;
            }

            const { x, y } = getCanvasMousePosition(canvas, event);

            if (!isZCanvas && state.laplaceModeEnabled && state.laplaceDragging) {
                const viewport = state.laplaceDragging.panel === 'top' ? state.laplaceTopVP : state.lapaceBotVP;
                if (viewport) {
                    viewport.origin.x = state.laplaceDragging.startOrigin.x + (x - state.laplaceDragging.startX);
                    viewport.origin.y = state.laplaceDragging.startOrigin.y + (y - state.laplaceDragging.startY);
                    updateLaplaceViewportRanges(viewport);
                    requestRedrawAll();
                }
                return;
            }

            if (panState.isPanning) {
                planeParams.origin.x = panState.panStartOrigin.x + (x - panState.panStart.x);
                planeParams.origin.y = panState.panStartOrigin.y + (y - panState.panStart.y);
                updatePlaneViewportRanges(planeParams);
                requestDomainRedraw(true);
                return;
            }

            if (isZCanvas && !state.panStateZ.isPanning && !state.panStateW.isPanning) {
                const worldCoords = mapCanvasToWorldCoords(x, y, planeParams);
                state.probeZ = { re: worldCoords.x, im: worldCoords.y };
                state.probeActive = true;
                requestRedrawAll();
            }
        });

        bindElementListener(canvas, 'mousedown', event => {
            if (isSphereInteractionActive(isZCanvas)) {
                return;
            }

            const { x, y } = getCanvasMousePosition(canvas, event);

            if (!isZCanvas && state.laplaceModeEnabled && state.laplaceTopVP && state.lapaceBotVP && event.button === 0) {
                const target = getLaplaceViewportAtY(y);
                if (target) {
                    state.laplaceDragging = {
                        panel: target.panel,
                        startX: x,
                        startY: y,
                        startOrigin: { x: target.viewport.origin.x, y: target.viewport.origin.y }
                    };
                    canvas.style.cursor = 'grabbing';
                    return;
                }
            }

            if (isZCanvas && event.button === 0 && state.streamlineFlowEnabled) {
                const worldCoords = mapCanvasToWorldCoords(x, y, planeParams);
                state.manualSeedPoints.push({ re: worldCoords.x, im: worldCoords.y });
                requestRedrawAll();
                event.stopPropagation();
                return;
            }

            if (event.button !== 0) {
                return;
            }

            panState.isPanning = true;
            panState.panStart.x = x;
            panState.panStart.y = y;
            panState.panStartOrigin.x = planeParams.origin.x;
            panState.panStartOrigin.y = planeParams.origin.y;
            canvas.style.cursor = 'grabbing';

            if (isZCanvas) {
                state.probeActive = false;
            }

            requestRedrawAll();
        });

        bindElementListener(canvas, 'mouseup', event => {
            if (isSphereInteractionActive(isZCanvas)) {
                return;
            }

            if (!isZCanvas && state.laplaceDragging) {
                state.laplaceDragging = null;
                canvas.style.cursor = 'crosshair';
                return;
            }

            if (event.button !== 0 || !panState.isPanning) {
                return;
            }

            panState.isPanning = false;
            canvas.style.cursor = 'crosshair';

            if (!isZCanvas) {
                return;
            }

            const { x, y } = getCanvasMousePosition(canvas, event);
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                const worldCoords = mapCanvasToWorldCoords(x, y, planeParams);
                state.probeZ = { re: worldCoords.x, im: worldCoords.y };
                state.probeActive = true;
            } else {
                state.probeActive = false;
            }

            requestRedrawAll();
        });

        bindElementListener(canvas, 'mouseleave', () => {
            if (isSphereInteractionActive(isZCanvas)) {
                return;
            }

            if (!isZCanvas && state.laplaceDragging) {
                state.laplaceDragging = null;
                canvas.style.cursor = 'crosshair';
            }

            if (panState.isPanning) {
                panState.isPanning = false;
                canvas.style.cursor = 'crosshair';
                domainColoringDirty = true;
            }

            if (isZCanvas) {
                state.probeActive = false;
            }

            requestRedrawAll();
        });

        bindElementListener(canvas, 'wheel', event => {
            if (isSphereInteractionActive(isZCanvas)) {
                return;
            }

            event.preventDefault();
            const { x, y } = getCanvasMousePosition(canvas, event);
            const zoomFactor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;

            if (!isZCanvas && state.laplaceModeEnabled && state.laplaceTopVP && state.lapaceBotVP) {
                const target = getLaplaceViewportAtY(y);
                if (!target) {
                    return;
                }

                zoomLaplaceViewport(target.viewport, x, y, zoomFactor, false);
                if (state.laplaceWindingSyncZoom) {
                    const otherViewport = target.panel === 'top' ? state.lapaceBotVP : state.laplaceTopVP;
                    zoomLaplaceViewport(otherViewport, x, y, zoomFactor, true);
                }

                requestRedrawAll();
                return;
            }

            const worldMouseBefore = mapCanvasToWorldCoords(x, y, planeParams);
            const zoomStateKey = isZCanvas ? 'zPlaneZoom' : 'wPlaneZoom';
            const unclampedZoom = state[zoomStateKey] * zoomFactor;
            const clampedZoom = Math.max(MIN_STATE_ZOOM_LEVEL, Math.min(MAX_STATE_ZOOM_LEVEL, unclampedZoom));
            const actualZoomApplied = clampedZoom / state[zoomStateKey];

            state[zoomStateKey] = clampedZoom;
            planeParams.scale.x *= actualZoomApplied;
            planeParams.scale.y *= actualZoomApplied;
            planeParams.origin.x = x - worldMouseBefore.x * planeParams.scale.x;
            planeParams.origin.y = y + worldMouseBefore.y * planeParams.scale.y;

            updatePlaneViewportRanges(planeParams);
            requestDomainRedraw(true);
        });
    });

    bindElementListener(zCanvas, 'mousedown', event => {
        handleSphereMouseDown(event, 'z');
    });
    bindElementListener(zCanvas, 'mousemove', event => {
        handleSphereMouseMove(event, 'z');
    });
    bindElementListener(zCanvas, 'mouseup', () => {
        handleSphereMouseUp('z');
    });
    bindElementListener(zCanvas, 'mouseleave', () => {
        handleSphereMouseUp('z');
    });

    bindElementListener(wCanvas, 'mousedown', event => {
        handleSphereMouseDown(event, 'w');
    });
    bindElementListener(wCanvas, 'mousemove', event => {
        handleSphereMouseMove(event, 'w');
    });
    bindElementListener(wCanvas, 'mouseup', () => {
        handleSphereMouseUp('w');
    });
    bindElementListener(wCanvas, 'mouseleave', () => {
        handleSphereMouseUp('w');
    });
}

function bindFullscreenControls() {
    bindControlListener('toggleFullscreenZBtn', 'click', () => {
        handleFullScreenToggle('z');
    });

    bindControlListener('toggleFullscreenWBtn', 'click', () => {
        handleFullScreenToggle('w');
    });

    bindControlListener('toggleFullscreenLaplace3DBtn', 'click', () => {
        const container3d = controls.laplace3DContainer;
        const column3d = controls.laplace3DColumn;
        const fullscreenContainer = controls.fullscreenContainer;

        if (!container3d || !fullscreenContainer) {
            return;
        }

        state.isLaplace3DFullScreen = !state.isLaplace3DFullScreen;

        if (state.isLaplace3DFullScreen) {
            state.originalLaplace3DParent = container3d.parentElement;

            fullscreenContainer.style.position = 'fixed';
            fullscreenContainer.style.top = '0';
            fullscreenContainer.style.left = '0';
            fullscreenContainer.style.width = '100vw';
            fullscreenContainer.style.height = '100vh';
            fullscreenContainer.style.zIndex = '1000';
            fullscreenContainer.style.backgroundColor = '#000';

            controls.closeFullscreenBtn.onclick = () => {
                controls.toggleFullscreenLaplace3DBtn.click();
            };
            fullscreenContainer.appendChild(controls.closeFullscreenBtn);
            controls.closeFullscreenBtn.classList.remove('hidden');

            container3d.style.width = '100%';
            container3d.style.height = '100%';
            fullscreenContainer.appendChild(container3d);
            document.body.appendChild(fullscreenContainer);
            fullscreenContainer.classList.remove('hidden');

            if (column3d) {
                column3d.classList.add('hidden-visually');
            }
        } else {
            if (state.originalLaplace3DParent) {
                state.originalLaplace3DParent.appendChild(container3d);
            }

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
            if (column3d) {
                column3d.classList.remove('hidden-visually');
            }

            fullscreenContainer.style.position = '';
            fullscreenContainer.style.top = '';
            fullscreenContainer.style.left = '';
            fullscreenContainer.style.width = '';
            fullscreenContainer.style.height = '';
            fullscreenContainer.style.zIndex = '';
            fullscreenContainer.style.backgroundColor = '';
        }

        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    Plotly.Plots.resize(container3d);
                } catch (error) {
                    console.error('Error resizing Laplace 3D Plotly surface:', error);
                }
            }, state.isLaplace3DFullScreen ? 150 : 100);
        });
    });

    bindElementListener(document, 'keydown', event => {
        if (event.key !== 'Escape') {
            return;
        }

        if (state.isZFullScreen) {
            handleFullScreenToggle('z');
        }
        if (state.isWFullScreen) {
            handleFullScreenToggle('w');
        }
        if (state.isLaplace3DFullScreen && controls.toggleFullscreenLaplace3DBtn) {
            controls.toggleFullscreenLaplace3DBtn.click();
        }
    });
}

function syncTopControlsCollapseState() {
    if (!controls.controlsOptionsSection || !controls.toggleTopControlsBtn || !controls.toggleTopControlsCollapsedBtn || !controls.topControlsCollapsedBar) {
        return;
    }

    controls.controlsOptionsSection.classList.toggle('is-collapsed', state.topControlsCollapsed);

    const isCollapsed = state.topControlsCollapsed;
    const expandedTooltipText = 'Minimize top half panels';
    const collapsedTooltipText = 'Expand top half panels';

    controls.topControlsCollapsedBar.classList.toggle('hidden', !isCollapsed);

    controls.toggleTopControlsBtn.dataset.tooltip = expandedTooltipText;
    controls.toggleTopControlsBtn.title = expandedTooltipText;
    controls.toggleTopControlsBtn.setAttribute('aria-label', expandedTooltipText);

    controls.toggleTopControlsCollapsedBtn.dataset.tooltip = collapsedTooltipText;
    controls.toggleTopControlsCollapsedBtn.title = collapsedTooltipText;
    controls.toggleTopControlsCollapsedBtn.setAttribute('aria-label', collapsedTooltipText);
}

function refreshCanvasLayoutAfterTopControlsToggle() {
    const resizeAndRedraw = () => {
        setupVisualParameters(false, false);
        requestDomainRedraw(true);
    };

    requestAnimationFrame(resizeAndRedraw);
    setTimeout(resizeAndRedraw, 280);
}

function bindTopControlsToggle() {
    const toggleTopControls = () => {
        state.topControlsCollapsed = !state.topControlsCollapsed;
        syncTopControlsCollapseState();
        refreshCanvasLayoutAfterTopControlsToggle();
    };

    bindControlListener('toggleTopControlsBtn', 'click', toggleTopControls);
    bindControlListener('toggleTopControlsCollapsedBtn', 'click', toggleTopControls);
}

window.setupEventListeners = function () {
    if (uiEventListenersBound) {
        return;
    }

    uiEventListenersBound = true;

    bindBaseParameterControls();
    bindMobiusControls();
    bindFunctionButtons();
    bindImageControls();
    bindVideoControls();
    bindPolynomialControls();
    bindDomainColoringControls();
    bindViewControls();
    bindVectorFieldControls();
    bindTaylorControls();
    bindRadialAndZetaControls();
    bindParticleControls();
    bindFourierControls();
    bindLaplaceControls();

    bindSelector('inputShapeSelector', 'currentInputShape', (_event, value) => {
        if (value !== 'video' && state.videoIsPlaying && typeof pauseUploadedVideoPlayback === 'function') {
            pauseUploadedVideoPlayback();
        } else if (value === 'video' && state.uploadedVideo && state.videoIsPlaying && typeof startVideoProcessingLoop === 'function') {
            startVideoProcessingLoop();
        }
        requestDomainRedraw(true);
    });

    bindSlider('chainCountSlider', 'chainCount', parseInt, (val) => {
        if (controls.chainCountValueDisplay) controls.chainCountValueDisplay.textContent = val;
        if (typeof updateChainingColumns === 'function') {
            updateChainingColumns(state.chainingEnabled ? val : 1);
        }
        requestRedrawAll();
    });

    if (controls.enableChainingCb) {
        controls.enableChainingCb.addEventListener('change', (e) => {
            state.chainingEnabled = e.target.checked;
            if (controls.chainingControlsContainer) {
                controls.chainingControlsContainer.style.display = state.chainingEnabled ? 'block' : 'none';
            }
            if (typeof updateChainingColumns === 'function') {
                updateChainingColumns(state.chainingEnabled ? state.chainCount : 1);
            }
            requestRedrawAll();
        });
    }

    if (controls.chainModeSelector) {
        controls.chainModeSelector.addEventListener('change', (e) => {
            state.chainingMode = e.target.value;
            if (typeof updateChainingTitles === 'function') {
                updateChainingTitles();
            }
            requestRedrawAll();
        });
    }

    BASIC_SLIDER_BINDINGS
        .filter(({ controlKey }) => !new Set([
            'vectorFieldScaleSlider',
            'vectorArrowThicknessSlider',
            'vectorArrowHeadSizeSlider',
            'streamlineStepSizeSlider',
            'streamlineMaxLengthSlider',
            'streamlineThicknessSlider',
            'streamlineSeedDensityFactorSlider',
            'particleDensitySlider',
            'particleSpeedSlider',
            'particleMaxLifetimeSlider',
            'imageResolutionSlider',
            'imageSizeSlider',
            'imageOpacitySlider',
            'videoResolutionSlider',
            'videoFpsSlider',
            'videoSizeSlider',
            'videoOpacitySlider',
            'zPlaneZoomSlider',
            'wPlaneZoomSlider',
            'taylorSeriesOrderSlider',
            'radialDiscreteStepsCountSlider',
            'laplaceAnimationSpeedSlider',
            'fourierFrequencySlider',
            'fourierAmplitudeSlider',
            'fourierTimeWindowSlider',
            'fourierSamplesSlider',
            'fourierWindingFrequencySlider',
            'fourierWindingTimeSlider',
            'laplaceFrequencySlider',
            'laplaceDampingSlider',
            'laplaceSigmaSlider',
            'laplaceOmegaSlider',
            'laplaceClipHeightSlider'
        ]).has(controlKey))
        .forEach(({ controlKey, stateKey, parser }) => {
            bindSlider(controlKey, stateKey, parser);
        });

    BASIC_CHECKBOX_BINDINGS
        .filter(({ controlKey }) => !new Set([
            'enableSplitViewCb',
            'enableVectorFieldCb',
            'enableStreamlineFlowCb',
            'enableRadialDiscreteStepsCb',
            'enableRiemannSphereCb',
            'enablePlotly3DCb',
            'enableTaylorSeriesCb',
            'enableTaylorSeriesCustomCenterCb',
            'laplaceShowROCCb',
            'laplaceShowPolesZerosCb',
            'laplaceShowFourierLineCb',
            'laplaceAnimationLoopCb',
            'enableParticleAnimationCb',
            'showVectorFieldPanelCb',
            'enableDomainColoringCb',
            'toggleSphereAxesGridCb',
            'togglePlotlySphereGridCb'
        ]).has(controlKey))
        .forEach(({ controlKey, stateKey }) => {
            bindCheckbox(controlKey, stateKey);
        });

    BASIC_SELECTOR_BINDINGS
        .filter(({ controlKey }) => !new Set([
            'inputShapeSelector',
            'vectorFieldFunctionSelector',
            'fourierFunctionSelector',
            'laplaceFunctionSelector',
            'laplaceVizModeSelector'
        ]).has(controlKey))
        .forEach(({ controlKey, stateKey }) => {
            bindSelector(controlKey, stateKey);
        });

    bindCanvasInteractions();
    bindTopControlsToggle();
    bindFullscreenControls();
    syncTopControlsCollapseState();
    updateModePanels();
};

function attemptPlotlyResize(plotlyDiv, maxAttempts = 3, delay = 100, currentAttempt = 1) {
    if (!plotlyDiv) {
        return;
    }

    const width = plotlyDiv.offsetWidth;
    const height = plotlyDiv.offsetHeight;

    if (width > 0 && height > 0) {
        try {
            Plotly.Plots.resize(plotlyDiv);
        } catch (error) {
            console.error(`Error during Plotly.Plots.resize (attempt ${currentAttempt}):`, error);
        }
        return;
    }

    if (currentAttempt >= maxAttempts) {
        console.warn(`Plotly container ${plotlyDiv.id} still has zero dimensions after ${maxAttempts} attempts.`);
        return;
    }

    setTimeout(() => {
        attemptPlotlyResize(plotlyDiv, maxAttempts, delay, currentAttempt + 1);
    }, delay);
}

function handleSphereMouseDown(event, planeType) {
    const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
    const isActiveSphere = planeType === 'z'
        ? state.riemannSphereViewEnabled && !state.splitViewEnabled
        : state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (!isActiveSphere) {
        return;
    }

    sphereParams.dragging = true;
    sphereParams.lastMouseX = event.clientX;
    sphereParams.lastMouseY = event.clientY;
    (planeType === 'z' ? zCanvas : wCanvas).style.cursor = 'grabbing';
}

function handleSphereMouseMove(event, planeType) {
    const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
    const isActiveSphere = planeType === 'z'
        ? state.riemannSphereViewEnabled && !state.splitViewEnabled
        : state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (!isActiveSphere || !sphereParams.dragging) {
        return;
    }

    const dx = event.clientX - sphereParams.lastMouseX;
    const dy = event.clientY - sphereParams.lastMouseY;

    sphereParams.rotY += dx * SPHERE_SENSITIVITY;
    sphereParams.rotX += dy * SPHERE_SENSITIVITY;
    sphereParams.rotX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, sphereParams.rotX));
    sphereParams.lastMouseX = event.clientX;
    sphereParams.lastMouseY = event.clientY;

    requestDomainRedraw(true);
}

function handleSphereMouseUp(planeType) {
    const sphereParams = planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
    const isActiveSphere = planeType === 'z'
        ? state.riemannSphereViewEnabled && !state.splitViewEnabled
        : state.riemannSphereViewEnabled || state.splitViewEnabled;

    if (!isActiveSphere && !sphereParams.dragging) {
        return;
    }

    sphereParams.dragging = false;
    (planeType === 'z' ? zCanvas : wCanvas).style.cursor = 'crosshair';
}

function handleFullScreenToggle(planeType) {
    const isZPlane = planeType === 'z';
    const plotlyContainer = controls.wPlanePlotlyContainer;
    const isPlotlyCase = !isZPlane && state.plotly3DEnabled && state.riemannSphereViewEnabled && plotlyContainer;
    const currentElement = isZPlane ? zCanvas : (isPlotlyCase ? plotlyContainer : wCanvas);

    if (!currentElement) {
        console.error('Fullscreen target element not found for plane:', planeType);
        return;
    }

    const canvasCard = isZPlane ? controls.zCanvasCard : controls.wCanvasCard;
    const fullscreenContainer = controls.fullscreenContainer;

    if (isZPlane) {
        state.isZFullScreen = !state.isZFullScreen;
    } else {
        state.isWFullScreen = !state.isWFullScreen;
    }

    const isNowFullScreen = isZPlane ? state.isZFullScreen : state.isWFullScreen;

    if (isNowFullScreen) {
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

        controls.closeFullscreenBtn.onclick = () => {
            handleFullScreenToggle(planeType);
        };
        fullscreenContainer.appendChild(controls.closeFullscreenBtn);
        controls.closeFullscreenBtn.classList.remove('hidden');

        fullscreenContainer.appendChild(currentElement);
        document.body.appendChild(fullscreenContainer);
        fullscreenContainer.classList.remove('hidden');

        if (canvasCard) {
            canvasCard.classList.add('hidden-visually');
        }

        currentElement.style.width = '100%';
        currentElement.style.height = '100%';

        if (isPlotlyCase && wCanvas) {
            wCanvas.classList.add('hidden');
        }

        if (!isZPlane && controls.laplaceWindingSyncBtn) {
            fullscreenContainer.appendChild(controls.laplaceWindingSyncBtn);
            controls.laplaceWindingSyncBtn.style.top = '50px';
            controls.laplaceWindingSyncBtn.style.right = '20px';
        }
    } else {
        const originalParent = isZPlane ? state.originalZParent : state.originalWParent;
        const originalStyle = isZPlane ? state.originalZStyle : state.originalWStyle;

        if (originalParent) {
            originalParent.appendChild(currentElement);
            currentElement.style.width = originalStyle && originalStyle.width ? originalStyle.width : '';
            currentElement.style.height = originalStyle && originalStyle.height ? originalStyle.height : '';
        } else if (canvasCard && canvasCard.querySelector('div')) {
            canvasCard.querySelector('div').appendChild(currentElement);
        }

        fullscreenContainer.classList.add('hidden');
        if (fullscreenContainer.parentElement === document.body) {
            document.body.removeChild(fullscreenContainer);
        }
        if (controls.closeFullscreenBtn.parentElement === fullscreenContainer) {
            fullscreenContainer.removeChild(controls.closeFullscreenBtn);
            controls.closeFullscreenBtn.classList.add('hidden');
        }
        if (canvasCard) {
            canvasCard.classList.remove('hidden-visually');
        }

        if (!isZPlane && controls.laplaceWindingSyncBtn && state.originalWParent) {
            state.originalWParent.appendChild(controls.laplaceWindingSyncBtn);
            controls.laplaceWindingSyncBtn.style.top = '8px';
            controls.laplaceWindingSyncBtn.style.right = '8px';
        }

        fullscreenContainer.style.position = '';
        fullscreenContainer.style.top = '';
        fullscreenContainer.style.left = '';
        fullscreenContainer.style.width = '';
        fullscreenContainer.style.height = '';
        fullscreenContainer.style.zIndex = '';
        fullscreenContainer.style.backgroundColor = '';
    }

    setupVisualParameters(true, true);

    if (isPlotlyCase) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (isNowFullScreen) {
                    currentElement.classList.remove('hidden');
                    currentElement.style.width = '100%';
                    currentElement.style.height = '100%';
                    attemptPlotlyResize(currentElement, 5, 150);
                } else {
                    attemptPlotlyResize(currentElement, 3, 100);
                }
            }, isNowFullScreen ? 100 : 50);
        });
    }

    requestDomainRedraw(true);
}
