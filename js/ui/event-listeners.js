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
    'wPlaneZoom',
    'fractionalPowerN'
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
    { controlKey: 'enableGeneralPointsCb', stateKey: 'generalPointsEnabled' },
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
let taylorCenterUI = null;
let generalPointsUI = null;

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

let cpuHighQualityTimeout = null;

function requestDomainRedraw(markDomainDirty = false) {
    if (markDomainDirty) {
        domainColoringDirty = true;
    }

    if (cpuHighQualityTimeout) {
        clearTimeout(cpuHighQualityTimeout);
        cpuHighQualityTimeout = null;
    }

    if (state.domainColoringEnabled && !state.isHighQualityCpuRender) {
        cpuHighQualityTimeout = setTimeout(() => {
            state.isHighQualityCpuRender = true;
            domainColoringDirty = true;
            requestRedrawAll();
            requestAnimationFrame(() => {
                state.isHighQualityCpuRender = false;
            });
        }, 120);
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

    if (state.algebraicChainingEnabled) {
        state.algebraicChainingEnabled = false;
        if (controls.enableAlgebraicChainingCb) {
            controls.enableAlgebraicChainingCb.checked = false;
        }
        if (controls.algebraicChainingControlsContainer) {
            controls.algebraicChainingControlsContainer.style.display = 'none';
        }
    }

    state.currentFunction = key;
    state.fourierModeEnabled = enteringFourier;
    state.laplaceModeEnabled = enteringLaplace;

    if ((enteringFourier || enteringLaplace) && state.navigationModeEnabled && typeof setNavigationModeEnabled === 'function') {
        setNavigationModeEnabled(false);
    }

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
    if (taylorCenterUI) {
        taylorCenterUI.setPoints([state.taylorSeriesCustomCenter], false);
    }
}

function syncTaylorCustomCenterInputs() {
    if (taylorCenterUI) {
        taylorCenterUI.setPoints([state.taylorSeriesCustomCenter], false);
    }
}

function setTaylorCustomCenter(re, im, shouldRedraw = true) {
    state.taylorSeriesCustomCenter.re = re;
    state.taylorSeriesCustomCenter.im = im;
    syncTaylorCustomCenterInputs();

    if (typeof syncTaylorSeriesCenterStatus === 'function') {
        syncTaylorSeriesCenterStatus();
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
    if (typeof initializeNavigationStateFromControls === 'function') {
        initializeNavigationStateFromControls();
    }
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

    if (controls.domainPaletteSelect) {
        controls.domainPaletteSelect.addEventListener('change', (e) => {
            state.domainPalette = e.target.value;
            if (typeof updateDomainColoringKey === 'function') {
                updateDomainColoringKey();
            }
            requestDomainRedraw(true);
        });
    }

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

function bindNavigationControls() {
    bindControlListener('enableNavigationModeCb', 'change', (_event, checkbox) => {
        if (typeof setNavigationModeEnabled === 'function') {
            setNavigationModeEnabled(checkbox.checked);
        } else {
            state.navigationModeEnabled = checkbox.checked;
        }
        requestDomainRedraw(true);
    });

    bindSlider('navigationSizeSlider', 'navigationSize', parseFloat, () => {
        const viewportShifted = typeof followNavigationViewports === 'function' ? followNavigationViewports() : false;
        requestDomainRedraw(Boolean(viewportShifted && state.domainColoringEnabled));
    });
    bindSlider('navigationOpacitySlider', 'navigationOpacity', parseFloat, () => {
        requestDomainRedraw(false);
    });
    bindSlider('navigationSpeedSlider', 'navigationSpeed', parseFloat, () => {
        requestDomainRedraw(false);
    });
    bindSlider('navigationTrailLengthSlider', 'navigationTrailLength', parseInteger, () => {
        if (state.navigationTrail.length > state.navigationTrailLength) {
            state.navigationTrail.splice(0, state.navigationTrail.length - state.navigationTrailLength);
        }
        requestDomainRedraw(false);
    });

    bindControlListener('navigationResetBtn', 'click', () => {
        if (typeof resetNavigationVehicle === 'function') {
            resetNavigationVehicle();
        }
    });

    bindElementListener(document, 'keydown', event => {
        if (typeof setNavigationKey === 'function') {
            setNavigationKey(event, true);
        }
    });

    bindElementListener(document, 'keyup', event => {
        if (typeof setNavigationKey === 'function') {
            setNavigationKey(event, false);
        }
    });

    bindElementListener(window, 'blur', () => {
        state.navigationKeys = {};
        if (typeof stopNavigationLoop === 'function') {
            stopNavigationLoop();
        }
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

    if (controls.taylorComplexPointsUiContainer) {
        taylorCenterUI = new ComplexPointsUI(controls.taylorComplexPointsUiContainer, {
            multiple: false,
            presets: TAYLOR_CENTER_PRESET_GROUPS,
            initialPoints: [state.taylorSeriesCustomCenter],
            onChange: (points) => {
                const pt = points[0] || { re: 0, im: 0 };
                setTaylorCustomCenter(pt.re, pt.im, true);
            }
        });
    }
}

function bindGeneralPointsControls() {
    bindCheckbox('enableGeneralPointsCb', 'generalPointsEnabled', () => {
        if (controls.generalPointsControlsContainer) {
            controls.generalPointsControlsContainer.classList.toggle('hidden', !state.generalPointsEnabled);
        }
        requestRedrawAll();
    });

    if (controls.generalPointsRoot) {
        generalPointsUI = new ComplexPointsUI(controls.generalPointsRoot, {
            multiple: true,
            presets: TAYLOR_CENTER_PRESET_GROUPS,
            initialPoints: state.generalPointsList,
            onChange: (points) => {
                state.generalPointsList = points;
                requestRedrawAll();
            }
        });
    }
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

            if (isZCanvas && state.navigationModeEnabled) {
                state.probeActive = false;
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

            if (isZCanvas && event.button === 0 && event.shiftKey && state.streamlineFlowEnabled) {
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

            if (state.navigationModeEnabled) {
                state.probeActive = false;
                requestRedrawAll();
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
    bindAlgebraicChainingControls();
    bindMobiusControls();
    bindFunctionButtons();
    bindImageControls();
    bindVideoControls();
    bindPolynomialControls();
    bindDomainColoringControls();
    bindViewControls();
    bindNavigationControls();
    bindVectorFieldControls();
    bindTaylorControls();
    bindGeneralPointsControls();
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
            // Output and algebraic chaining can be active simultaneously
            if (controls.chainingControlsContainer) {
                controls.chainingControlsContainer.style.display = state.chainingEnabled ? 'block' : 'none';
            }
            if (typeof updateChainingColumns === 'function') {
                updateChainingColumns(state.chainingEnabled ? state.chainCount : 1);
            }
            updateTitlesAndGlobalUI();
            syncParameterControlsPanelVisibility();
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

    if (controls.gridViewBtn) {
        controls.gridViewBtn.addEventListener('click', () => {
            const row = document.querySelector('.canvas-row.two-column-layout');
            if (!row) return;
            const isActive = row.classList.toggle('chaining-grid-view');
            controls.gridViewBtn.textContent = isActive ? '⊟ Exit Grid View' : '⊞ Grid View';
            window.dispatchEvent(new Event('resize'));
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

function bindAlgebraicChainingControls() {
    if (controls.enableAlgebraicChainingCb) {
        controls.enableAlgebraicChainingCb.addEventListener('change', (e) => {
            state.algebraicChainingEnabled = e.target.checked;
            
            // Output and algebraic chaining can be active simultaneously
            
            if (controls.algebraicChainingControlsContainer) {
                controls.algebraicChainingControlsContainer.style.display = state.algebraicChainingEnabled ? 'block' : 'none';
            }
            if (state.algebraicChainingEnabled) {
                state.currentFunction = 'algebraic_chaining';
                if (typeof setActiveFunctionButton === 'function') {
                    setActiveFunctionButton('algebraic_chaining');
                }
                renderAlgebraicChainingTerms();
            } else {
                state.currentFunction = 'cos';
                if (typeof setActiveFunctionButton === 'function') {
                    setActiveFunctionButton('cos');
                }
            }
            updateTitlesAndGlobalUI();
            syncParameterControlsPanelVisibility();
            requestDomainRedraw(true);
        });
    }

    if (controls.addAlgebraicTermBtn) {
        controls.addAlgebraicTermBtn.addEventListener('click', () => {
            state.algebraicChainingTerms.push({
                coeff: { re: 1.0, im: 0.0 },
                factors: [
                    { func: 'cos', chainedFunc: 'none', power: 1.0, reciprocal: false, log: false, exp: false }
                ]
            });
            renderAlgebraicChainingTerms();
            updateTitlesAndGlobalUI();
            syncParameterControlsPanelVisibility();
            requestDomainRedraw(true);
        });
    }
}

function renderAlgebraicChainingTerms() {
    if (!controls.algebraicTermsList) return;
    
    controls.algebraicTermsList.innerHTML = '';
    
    function getTermPreview(term) {
        const re = term.coeff.re;
        const im = term.coeff.im;
        
        if (Math.abs(re) < 1e-9 && Math.abs(im) < 1e-9) {
            return '0';
        }
        
        let coeffStr = '';
        if (Math.abs(im) < 1e-9) {
            if (Math.abs(re - 1) < 1e-9 && (term.factors && term.factors.length > 0 && term.factors[0].func !== 'none')) {
                coeffStr = '';
            } else if (Math.abs(re + 1) < 1e-9 && (term.factors && term.factors.length > 0 && term.factors[0].func !== 'none')) {
                coeffStr = '-';
            } else {
                coeffStr = re.toFixed(1);
            }
        } else {
            const reStr = Math.abs(re) < 1e-9 ? '' : re.toFixed(1);
            const sign = im >= 0 ? '+' : '-';
            const imStr = Math.abs(Math.abs(im) - 1) < 1e-9 ? 'i' : `${Math.abs(im).toFixed(1)}i`;
            if (reStr === '') {
                coeffStr = im >= 0 ? imStr : `-${imStr}`;
            } else {
                coeffStr = `(${reStr}${sign}${imStr})`;
            }
        }

        const activeFactors = (term.factors || []).filter(f => f.func && f.func !== 'none');
        if (activeFactors.length === 0) {
            return coeffStr === '' ? '1' : coeffStr;
        }

        const factorsStr = activeFactors.map(f => {
            let base = f.func;
            if (base === 'power') base = 'z^n';
            if (base === 'zeta') base = 'ζ';
            if (base === 'polynomial') base = 'P';
            if (base === 'mobius') base = 'Möbius';
            if (base === 'poincare') base = 'Poincare';
            
            if (f.chainedFunc && f.chainedFunc !== 'none') {
                let inner = f.chainedFunc;
                if (inner === 'power') inner = 'z^n';
                if (inner === 'zeta') inner = 'ζ';
                if (inner === 'polynomial') inner = 'P';
                if (inner === 'mobius') inner = 'Möbius';
                if (inner === 'poincare') inner = 'Poincare';
                base = `${base}(${inner}(z))`;
            } else {
                base = `${base}(z)`;
            }
            if (f.power !== undefined && f.power !== 1) {
                base = `(${base})^${f.power.toFixed(1)}`;
            }
            if (f.reciprocal) base = `1/(${base})`;
            if (f.log) base = `ln(${base})`;
            if (f.exp) base = `e^(${base})`;
            return base;
        }).join('·');

        if (coeffStr === '') return factorsStr;
        if (coeffStr === '-') return `-${factorsStr}`;
        return `${coeffStr}·${factorsStr}`;
    }

    state.algebraicChainingTerms.forEach((term, tIdx) => {
        const termCard = document.createElement('div');
        termCard.className = 'algebraic-term-card';
        
        const header = document.createElement('div');
        header.className = 'algebraic-term-header';
        
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'algebraic-term-title-wrapper';
        
        const title = document.createElement('span');
        title.className = 'algebraic-term-title';
        title.textContent = `Term ${tIdx + 1}`;
        titleWrapper.appendChild(title);
        
        const formulaPreview = document.createElement('div');
        formulaPreview.className = 'algebraic-term-formula';
        formulaPreview.textContent = getTermPreview(term);
        titleWrapper.appendChild(formulaPreview);
        
        header.appendChild(titleWrapper);
        
        if (state.algebraicChainingTerms.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'algebraic-term-remove-btn';
            removeBtn.textContent = '✕ Remove';
            removeBtn.addEventListener('click', () => {
                state.algebraicChainingTerms.splice(tIdx, 1);
                renderAlgebraicChainingTerms();
                updateTitlesAndGlobalUI();
                syncParameterControlsPanelVisibility();
                requestDomainRedraw(true);
            });
            header.appendChild(removeBtn);
        }
        termCard.appendChild(header);
        
        const coeffGrid = document.createElement('div');
        coeffGrid.className = 'algebraic-coeff-grid';
        
        // Real Coefficient Slider
        const reDiv = document.createElement('div');
        reDiv.className = 'algebraic-slider-row';
        const reLabel = document.createElement('label');
        reLabel.className = 'algebraic-slider-label';
        reLabel.innerHTML = `Re coeff <span class="algebraic-slider-value">${term.coeff.re.toFixed(1)}</span>`;
        
        const reSliderContainer = document.createElement('div');
        reSliderContainer.className = 'algebraic-slider-container';
        
        const reSlider = document.createElement('input');
        reSlider.type = 'range';
        reSlider.min = '-5';
        reSlider.max = '5';
        reSlider.step = '0.1';
        reSlider.value = term.coeff.re;
        
        reSlider.addEventListener('input', (e) => {
            term.coeff.re = parseFloat(e.target.value);
            reLabel.querySelector('.algebraic-slider-value').textContent = term.coeff.re.toFixed(1);
            formulaPreview.textContent = getTermPreview(term);
            updateTitlesAndGlobalUI();
            requestDomainRedraw(true);
        });
        
        reSliderContainer.appendChild(reSlider);
        reDiv.appendChild(reLabel);
        reDiv.appendChild(reSliderContainer);
        coeffGrid.appendChild(reDiv);
        
        // Imaginary Coefficient Slider
        const imDiv = document.createElement('div');
        imDiv.className = 'algebraic-slider-row';
        const imLabel = document.createElement('label');
        imLabel.className = 'algebraic-slider-label';
        imLabel.innerHTML = `Im coeff <span class="algebraic-slider-value">${term.coeff.im.toFixed(1)}</span>`;
        
        const imSliderContainer = document.createElement('div');
        imSliderContainer.className = 'algebraic-slider-container';
        
        const imSlider = document.createElement('input');
        imSlider.type = 'range';
        imSlider.min = '-5';
        imSlider.max = '5';
        imSlider.step = '0.1';
        imSlider.value = term.coeff.im;
        
        imSlider.addEventListener('input', (e) => {
            term.coeff.im = parseFloat(e.target.value);
            imLabel.querySelector('.algebraic-slider-value').textContent = term.coeff.im.toFixed(1);
            formulaPreview.textContent = getTermPreview(term);
            updateTitlesAndGlobalUI();
            requestDomainRedraw(true);
        });
        
        imSliderContainer.appendChild(imSlider);
        imDiv.appendChild(imLabel);
        imDiv.appendChild(imSliderContainer);
        coeffGrid.appendChild(imDiv);
        
        termCard.appendChild(coeffGrid);
        
        const factorsContainer = document.createElement('div');
        factorsContainer.className = 'algebraic-factors-container';
        
        const factorsTitle = document.createElement('div');
        factorsTitle.className = 'algebraic-factors-title';
        factorsTitle.textContent = 'Factors';
        factorsContainer.appendChild(factorsTitle);
        
        const visibleFactors = [...term.factors];
        if (visibleFactors.length < 5 && (visibleFactors.length === 0 || visibleFactors[visibleFactors.length - 1].func !== 'none')) {
            visibleFactors.push({ func: 'none', chainedFunc: 'none', power: 1.0, reciprocal: false, log: false, exp: false });
        }
        
        const funcOptions = [
            { value: 'none', label: 'None' },
            { value: 'cos', label: 'cos(z)' },
            { value: 'sin', label: 'sin(z)' },
            { value: 'tan', label: 'tan(z)' },
            { value: 'sec', label: 'sec(z)' },
            { value: 'exp', label: 'e^z' },
            { value: 'ln', label: 'ln(z)' },
            { value: 'sinh', label: 'sinh(z)' },
            { value: 'cosh', label: 'cosh(z)' },
            { value: 'tanh', label: 'tanh(z)' },
            { value: 'power', label: 'z^n' },
            { value: 'reciprocal', label: '1/z' },
            { value: 'mobius', label: 'Möbius' },
            { value: 'zeta', label: 'ζ(z)' },
            { value: 'polynomial', label: 'Polynomial' },
            { value: 'poincare', label: 'Poincare Disk' }
        ];
        
        visibleFactors.forEach((factor, fIdx) => {
            const factorDiv = document.createElement('div');
            factorDiv.className = 'algebraic-factor-card';
            
            const row = document.createElement('div');
            row.className = 'algebraic-factor-main-row';
            
            const label = document.createElement('span');
            label.className = 'algebraic-factor-label';
            label.textContent = `Factor ${fIdx + 1}`;
            row.appendChild(label);
            
            const select = document.createElement('select');
            funcOptions.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (factor.func === opt.value) o.selected = true;
                select.appendChild(o);
            });
            
            select.addEventListener('change', (e) => {
                const val = e.target.value;
                if (fIdx < term.factors.length) {
                    term.factors[fIdx].func = val;
                } else {
                    term.factors.push({ func: val, chainedFunc: 'none', power: 1.0, reciprocal: false, log: false, exp: false });
                }
                
                let cleanedFactors = [];
                for (let f of term.factors) {
                    cleanedFactors.push(f);
                    if (f.func === 'none') {
                        break;
                    }
                }
                term.factors = cleanedFactors;
                
                renderAlgebraicChainingTerms();
                updateTitlesAndGlobalUI();
                syncParameterControlsPanelVisibility();
                requestDomainRedraw(true);
            });
            row.appendChild(select);
            factorDiv.appendChild(row);
            
            if (factor.func !== 'none') {
                const manipDiv = document.createElement('div');
                manipDiv.className = 'algebraic-factor-details';
                
                // Chain Select Row
                const chainRow = document.createElement('div');
                chainRow.className = 'algebraic-factor-detail-row';
                
                const chainLabel = document.createElement('span');
                chainLabel.className = 'algebraic-factor-label';
                chainLabel.textContent = 'Chain f(g(z))';
                chainRow.appendChild(chainLabel);
                
                const chainSelect = document.createElement('select');
                funcOptions.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.textContent = opt.label;
                    if (factor.chainedFunc === opt.value) o.selected = true;
                    chainSelect.appendChild(o);
                });
                
                chainSelect.addEventListener('change', (e) => {
                    factor.chainedFunc = e.target.value;
                    formulaPreview.textContent = getTermPreview(term);
                    updateTitlesAndGlobalUI();
                    syncParameterControlsPanelVisibility();
                    requestDomainRedraw(true);
                });
                chainRow.appendChild(chainSelect);
                manipDiv.appendChild(chainRow);
                
                // Power Slider Row
                const powerRow = document.createElement('div');
                powerRow.className = 'algebraic-slider-row';
                
                const powerLabel = document.createElement('label');
                powerLabel.className = 'algebraic-slider-label';
                powerLabel.innerHTML = `Power <span class="algebraic-slider-value">${(factor.power || 1.0).toFixed(1)}</span>`;
                
                const powerSliderContainer = document.createElement('div');
                powerSliderContainer.className = 'algebraic-slider-container';
                
                const powerSlider = document.createElement('input');
                powerSlider.type = 'range';
                powerSlider.min = '-5';
                powerSlider.max = '5';
                powerSlider.step = '0.1';
                powerSlider.value = factor.power !== undefined ? factor.power : 1.0;
                
                powerSlider.addEventListener('input', (e) => {
                    factor.power = parseFloat(e.target.value);
                    powerLabel.querySelector('.algebraic-slider-value').textContent = factor.power.toFixed(1);
                    formulaPreview.textContent = getTermPreview(term);
                    updateTitlesAndGlobalUI();
                    requestDomainRedraw(true);
                });
                
                powerSliderContainer.appendChild(powerSlider);
                powerRow.appendChild(powerLabel);
                powerRow.appendChild(powerSliderContainer);
                manipDiv.appendChild(powerRow);
                
                // Modifier Checkboxes
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'algebraic-checkbox-row';
                
                const addCheck = (key, labelText) => {
                    const cbLabel = document.createElement('label');
                    cbLabel.className = 'algebraic-checkbox-label';
                    
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = !!factor[key];
                    cb.addEventListener('change', (e) => {
                        factor[key] = e.target.checked;
                        formulaPreview.textContent = getTermPreview(term);
                        updateTitlesAndGlobalUI();
                        requestDomainRedraw(true);
                    });
                    
                    const customVisual = document.createElement('span');
                    customVisual.className = 'custom-checkbox-visual';
                    
                    cbLabel.appendChild(cb);
                    cbLabel.appendChild(customVisual);
                    cbLabel.appendChild(document.createTextNode(labelText));
                    checkboxContainer.appendChild(cbLabel);
                };
                
                addCheck('reciprocal', '1/f');
                addCheck('log', 'ln(f)');
                addCheck('exp', 'e^f');
                
                manipDiv.appendChild(checkboxContainer);
                factorDiv.appendChild(manipDiv);
            }
            
            factorsContainer.appendChild(factorDiv);
        });
        
        termCard.appendChild(factorsContainer);
        controls.algebraicTermsList.appendChild(termCard);
    });
}
