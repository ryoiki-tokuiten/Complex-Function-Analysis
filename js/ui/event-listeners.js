import { state, context, zPlaneParams, wPlaneParams, sphereViewParams, sliderParamKeys } from '../store/state.js';
import { eventBus } from '../store/events.js';
import { setupVisualParameters, updateChainingColumns, updateChainingTitles } from '../utils/dom-utils.js';
import { processUploadedImageSource, loadUploadedVideoFile, toggleUploadedVideoPlayback, pauseUploadedVideoPlayback, startVideoProcessingLoop, syncVideoPlaybackUI, processUploadedVideoFrame } from '../utils/raster-media.js';
import { updatePlaneViewportRanges, mapCanvasToWorldCoords, inverseRotate3D, rotate3D, projectSphereToCanvas2D } from '../utils/canvas-utils.js';
import { requestRedrawAll } from '../main.js';
import { updateFourierTransform } from '../analysis/fourier-transform.js';
import { updateLaplaceTransform, updateLaplaceEvaluationPoint, analyzeStability, findPolesZeros } from '../analysis/laplace-transform.js';
import { ComplexPointsUI } from './complex-points-ui.js';
import { TAYLOR_CENTER_PRESET_GROUPS, ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR, MIN_STATE_ZOOM_LEVEL, MAX_STATE_ZOOM_LEVEL } from '../constants/numerical.js';
import { SPHERE_SENSITIVITY, SPHERE_INITIAL_ROT_X, SPHERE_INITIAL_ROT_Y } from '../constants/rendering.js';
import { updateTitlesAndGlobalUI, syncTaylorSeriesCenterStatus, updateDomainColoringKey, syncParameterControlsPanelVisibility, syncRiemannTransformationUI } from './ui-updates.js';
import { stopLaplaceAnimation, toggleLaplaceAnimation, resetLaplaceAnimation, showFullLaplaceSpiral } from '../rendering/laplace-animation.js';
import { toggleRiemannTransformationAnimationZ, toggleRiemannTransformationAnimationW, syncRiemannTransformationPlayPauseButton } from '../rendering/riemann-transformation-animation.js';
import { setNavigationModeEnabled, followNavigationViewports, resetNavigationVehicle, setNavigationKey, stopNavigationLoop, initializeNavigationStateFromControls } from '../navigation-plane.js';
import { toggleAnimation } from './animation.js';
import { initializePolynomialCoeffs, generatePolynomialCoeffSliders } from './polynomial-ui.js';
import { updateLaplace3DSurface } from '../rendering/laplace-3d-surface.js';
import { getRiemannSurfaceCanvas, resetRiemannSurfaceViews } from '../rendering/webgl-riemann-surface.js';
import { applyTheme, renderThemesList, renderDomainPalettesUI, domainPalettes } from './theme-manager.js';
import { applyFractalPreset, isFractalPresetKey } from '../analysis/fractal-presets.js';
import {
    initializeDynamicPlottingUI,
    syncDynamicPlottingUI
} from './dynamic-plotting-ui.js';

const { controls = {} } = context;

let zCanvas;
let wCanvas;
let uiEventListenersBound = false;

const COMPLEX_PARTS = ['re', 'im'];
const MOBIUS_PARAMS = ['A', 'B', 'C', 'D'];

const DOMAIN_DIRTY_STATE_KEYS = new Set([
    'a0', 'b0', 'circleR', 'ellipseA', 'ellipseB', 'hyperbolaA', 'hyperbolaB',
    'stripY1', 'stripY2', 'sectorAngle1', 'sectorAngle2', 'sectorRMin', 'sectorRMax',
    'imageSize', 'imageOpacity', 'videoSize', 'videoOpacity', 'vectorFieldScale',
    'zPlaneZoom', 'wPlaneZoom', 'fractionalPowerN', 'plotlySphereOpacity', 'sphereGridOpacity'
]);

const BASIC_SLIDER_BINDINGS = [
    ['stripY1Slider', 'stripY1'], ['stripY2Slider', 'stripY2'],
    ['sectorAngle1Slider', 'sectorAngle1'], ['sectorAngle2Slider', 'sectorAngle2'],
    ['sectorRMinSlider', 'sectorRMin'], ['sectorRMaxSlider', 'sectorRMax'],
    ['gridDensitySlider', 'gridDensity', parseInteger],
    ['neighborhoodSizeSlider', 'probeNeighborhoodSize'],
    ['vectorFieldScaleSlider', 'vectorFieldScale'],
    ['vectorArrowThicknessSlider', 'vectorArrowThickness'],
    ['vectorArrowHeadSizeSlider', 'vectorArrowHeadSize'],
    ['streamlineStepSizeSlider', 'streamlineStepSize'],
    ['streamlineMaxLengthSlider', 'streamlineMaxLength', parseInteger],
    ['streamlineThicknessSlider', 'streamlineThickness'],
    ['streamlineSeedDensityFactorSlider', 'streamlineSeedDensityFactor'],
    ['radialDiscreteStepsCountSlider', 'radialDiscreteStepsCount', parseInteger],
    ['plotlySphereOpacitySlider', 'plotlySphereOpacity'],
    ['sphereGridOpacitySlider', 'sphereGridOpacity'],
    ['taylorSeriesOrderSlider', 'taylorSeriesOrder', parseInteger],
    ['particleDensitySlider', 'particleDensity', parseInteger],
    ['particleSpeedSlider', 'particleSpeed'],
    ['particleMaxLifetimeSlider', 'particleMaxLifetime', parseInteger],
    ['imageResolutionSlider', 'imageResolution', parseInteger],
    ['imageSizeSlider', 'imageSize'],
    ['imageOpacitySlider', 'imageOpacity'],
    ['videoResolutionSlider', 'videoResolution', parseInteger],
    ['videoFpsSlider', 'videoProcessingFps', parseInteger],
    ['videoSizeSlider', 'videoSize'],
    ['videoOpacitySlider', 'videoOpacity'],
    ['zPlaneZoomSlider', 'zPlaneZoom'],
    ['wPlaneZoomSlider', 'wPlaneZoom'],
    ['laplaceAnimationSpeedSlider', 'laplaceAnimationSpeed'],
    ['fourierFrequencySlider', 'fourierFrequency'],
    ['fourierAmplitudeSlider', 'fourierAmplitude'],
    ['fourierTimeWindowSlider', 'fourierTimeWindow'],
    ['fourierSamplesSlider', 'fourierSamples', parseInteger],
    ['fourierWindingFrequencySlider', 'fourierWindingFrequency'],
    ['fourierWindingTimeSlider', 'fourierWindingTime'],
    ['laplaceFrequencySlider', 'laplaceFrequency'],
    ['laplaceDampingSlider', 'laplaceDamping'],
    ['laplaceSigmaSlider', 'laplaceSigma'],
    ['laplaceOmegaSlider', 'laplaceOmega'],
    ['laplaceClipHeightSlider', 'laplaceClipHeight'],
    ['riemannSurfaceSheetsSlider', 'riemannSurfaceSheets', parseInteger],
    ['riemannSurfaceBranchCenterSlider', 'riemannSurfaceBranchCenter', parseInteger],
    ['riemannSurfaceHeightScaleSlider', 'riemannSurfaceHeightScale'],
    ['riemannSurfaceHeightClipSlider', 'riemannSurfaceHeightClip']
].map(([controlKey, stateKey, parser = parseFloat]) => ({ controlKey, stateKey, parser }));

const BASIC_CHECKBOX_BINDINGS = [
    ['showZerosPolesCb', 'showZerosPoles'],
    ['showCriticalPointsCb', 'showCriticalPoints'],
    ['enableCauchyIntegralModeCb', 'cauchyIntegralModeEnabled'],
    ['enableSplitViewCb', 'splitViewEnabled'],
    ['enableVectorFieldCb', 'vectorFieldEnabled'],
    ['enableStreamlineFlowCb', 'streamlineFlowEnabled'],
    ['enableRadialDiscreteStepsCb', 'radialDiscreteStepsEnabled'],
    ['enableRiemannSphereCb', 'riemannSphereViewEnabled'],
    ['enablePlotly3DCb', 'plotly3DEnabled'],
    ['enableRiemannTransformationCb', 'riemannTransformationEnabled'],
    ['enableTaylorSeriesCb', 'taylorSeriesEnabled'],
    ['enableTaylorSeriesCustomCenterCb', 'taylorSeriesCustomCenterEnabled'],
    ['enableGeneralPointsCb', 'generalPointsEnabled'],
    ['laplaceShowROCCb', 'laplaceShowROC'],
    ['laplaceShowPolesZerosCb', 'laplaceShowPolesZeros'],
    ['laplaceShowFourierLineCb', 'laplaceShowFourierLine'],
    ['laplaceAnimationLoopCb', 'laplaceAnimationLoop'],
    ['enableParticleAnimationCb', 'particleAnimationEnabled'],
    ['showVectorFieldPanelCb', 'showVectorFieldPanelEnabled'],
    ['enableDomainColoringCb', 'domainColoringEnabled'],
    ['enableRiemannSurfaceCb', 'riemannSurfaceEnabled'],
    ['riemannSurfaceWireframeCb', 'riemannSurfaceWireframe']
].map(([controlKey, stateKey]) => ({ controlKey, stateKey }));

const BASIC_SELECTOR_BINDINGS = [
    ['inputShapeSelector', 'currentInputShape'],
    ['vectorFieldFunctionSelector', 'vectorFieldFunction'],
    ['fourierFunctionSelector', 'fourierFunction'],
    ['laplaceFunctionSelector', 'laplaceFunction'],
    ['laplaceVizModeSelector', 'laplaceVizMode'],
    ['riemannSurfaceComponentSelector', 'riemannSurfaceComponent']
].map(([controlKey, stateKey]) => ({ controlKey, stateKey }));

const SPECIAL_SLIDERS = new Set([
    'vectorFieldScaleSlider', 'vectorArrowThicknessSlider', 'vectorArrowHeadSizeSlider',
    'streamlineStepSizeSlider', 'streamlineMaxLengthSlider', 'streamlineThicknessSlider',
    'streamlineSeedDensityFactorSlider', 'particleDensitySlider', 'particleSpeedSlider',
    'particleMaxLifetimeSlider', 'imageResolutionSlider', 'imageSizeSlider', 'imageOpacitySlider',
    'videoResolutionSlider', 'videoFpsSlider', 'videoSizeSlider', 'videoOpacitySlider',
    'zPlaneZoomSlider', 'wPlaneZoomSlider', 'taylorSeriesOrderSlider',
    'radialDiscreteStepsCountSlider', 'laplaceAnimationSpeedSlider',
    'fourierFrequencySlider', 'fourierAmplitudeSlider', 'fourierTimeWindowSlider',
    'fourierSamplesSlider', 'fourierWindingFrequencySlider', 'fourierWindingTimeSlider',
    'laplaceFrequencySlider', 'laplaceDampingSlider', 'laplaceSigmaSlider',
    'laplaceOmegaSlider', 'laplaceClipHeightSlider'
]);

const SPECIAL_CHECKBOXES = new Set([
    'enableSplitViewCb', 'enableVectorFieldCb', 'enableStreamlineFlowCb',
    'enableRadialDiscreteStepsCb', 'enableRiemannSphereCb', 'enableRiemannSurfaceCb',
    'enablePlotly3DCb', 'enableTaylorSeriesCb', 'enableTaylorSeriesCustomCenterCb',
    'enableGeneralPointsCb', 'laplaceShowROCCb', 'laplaceShowPolesZerosCb',
    'laplaceShowFourierLineCb', 'laplaceAnimationLoopCb', 'enableParticleAnimationCb',
    'showVectorFieldPanelCb', 'enableDomainColoringCb'
]);

const SPECIAL_SELECTORS = new Set([
    'inputShapeSelector',
    'vectorFieldFunctionSelector',
    'fourierFunctionSelector',
    'laplaceFunctionSelector',
    'laplaceVizModeSelector'
]);

const SPHERE_VIEW_BUTTONS = {
    sphereViewNorthBtn: { rotX: -Math.PI / 2 + 0.01, rotY: 0 },
    sphereViewSouthBtn: { rotX: Math.PI / 2 - 0.01, rotY: 0 },
    sphereViewEastBtn: { rotX: 0, rotY: -Math.PI / 2 },
    sphereViewWestBtn: { rotX: 0, rotY: Math.PI / 2 },
    sphereViewFrontBtn: { rotX: 0, rotY: 0 },
    sphereViewResetBtn: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y }
};

const ALGEBRAIC_FUNCTION_OPTIONS = [
    ['none', 'None'], ['c', 'c'], ['cos', 'cos(z)'], ['sin', 'sin(z)'], ['tan', 'tan(z)'],
    ['sec', 'sec(z)'], ['exp', 'e^z'], ['ln', 'ln(z)'], ['sinh', 'sinh(z)'],
    ['cosh', 'cosh(z)'], ['tanh', 'tanh(z)'], ['power', 'z^n'], ['reciprocal', '1/z'],
    ['mobius', 'Möbius'], ['zeta', 'ζ(z)'], ['polynomial', 'Polynomial'],
    ['poincare', 'Poincare Disk']
].map(([value, label]) => ({ value, label }));

const ALGEBRAIC_SYMBOLS = new Map([
    ['c', 'c'],
    ['power', 'z^n'],
    ['zeta', 'ζ'],
    ['polynomial', 'P'],
    ['mobius', 'Möbius'],
    ['poincare', 'Poincare']
]);

const BINDERS = [
    bindBaseParameterControls,
    bindAlgebraicChainingControls,
    bindDynamicPlottingControls,
    bindMobiusControls,
    bindFunctionButtons,
    bindImageControls,
    bindVideoControls,
    bindPolynomialControls,
    bindDomainColoringControls,
    bindViewControls,
    bindNavigationControls,
    bindVectorFieldControls,
    bindTaylorControls,
    bindGeneralPointsControls,
    bindRadialAndZetaControls,
    bindParticleControls,
    bindFourierControls,
    bindLaplaceControls,
    bindCollapseControls,
    bindChainingControls,
    bindSimpleControlRemainder,
    bindCanvasInteractions,
    bindTopControlsToggle,
    bindFullscreenControls,
    bindThemeControls
];

function bindDynamicPlottingControls() {
    initializeDynamicPlottingUI({
        requestRedraw: markDomainDirty => requestDomainRedraw(markDomainDirty)
    });
}

function parseInteger(value) {
    return parseInt(value, 10);
}

function call(fn, ...args) {
    return typeof fn === 'function' ? fn(...args) : undefined;
}

function $(id) {
    return document.getElementById(id);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function frame(callback) {
    return typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(callback)
        : setTimeout(callback, 0);
}

function laterFrame(callback, delay = 0) {
    frame(() => setTimeout(callback, delay));
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function setStyles(element, styles) {
    if (element) Object.assign(element.style, styles);
}

function clearStyles(element, keys) {
    if (!element) return;
    keys.forEach(key => {
        element.style[key] = '';
    });
}

function hidden(element, shouldHide) {
    if (element) element.classList.toggle('hidden', Boolean(shouldHide));
}

function display(element, visible, value = 'block') {
    if (element) element.style.display = visible ? value : 'none';
}

function checked(controlKey, value) {
    if (controls[controlKey]) controls[controlKey].checked = Boolean(value);
}

function closest(target, selector) {
    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

function h(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    const { className, text, type, attrs, dataset } = props;

    if (className) node.className = className;
    if (type) node.type = type;
    if (text !== undefined) node.textContent = text;

    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    Object.entries(dataset || {}).forEach(([key, value]) => {
        node.dataset[key] = value;
    });

    toArray(children).forEach(child => {
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });

    return node;
}

function select(options, value, onChange) {
    const node = h('select');

    options.forEach(option => {
        const item = h('option', { text: option.label });
        item.value = option.value;
        item.selected = option.value === value;
        node.appendChild(item);
    });

    node.addEventListener('change', onChange);
    return node;
}

function parseControlValue(control, parser = parseFloat, fallback = 0) {
    if (!control) return fallback;
    const value = parser(control.value);
    return typeof value === 'number' && Number.isNaN(value) ? fallback : value;
}

function bindElementListener(element, eventName, handler, options) {
    if (!element) return;

    element.addEventListener(eventName, event => {
        try {
            handler(event, element);
        } catch (error) {
            console.error(`Error in ${element.id || element.nodeName || 'element'} ${eventName} listener:`, error);
        }
    }, options);
}

function bindControlListener(controlKey, eventName, handler, options) {
    bindElementListener(controls[controlKey], eventName, handler, options);
}

function readSliderState(controlKey, stateKey, parser = parseFloat) {
    const control = controls[controlKey];
    if (control) state[stateKey] = parseControlValue(control, parser, state[stateKey]);
    return state[stateKey];
}

function readCheckboxState(controlKey, stateKey) {
    const control = controls[controlKey];
    if (control) state[stateKey] = control.checked;
    return state[stateKey];
}

function readSelectorState(controlKey, stateKey) {
    const control = controls[controlKey];
    if (control) state[stateKey] = control.value;
    return state[stateKey];
}

function shouldMarkDomainDirty(controlKey, stateKey) {
    return DOMAIN_DIRTY_STATE_KEYS.has(stateKey) ||
        controlKey.startsWith('mobius') ||
        controlKey.startsWith('domain');
}

function bindSlider(controlKey, stateKey, parser = parseFloat, customCallback = null) {
    bindControlListener(controlKey, 'input', (event, slider) => {
        state[stateKey] = parseControlValue(slider, parser, state[stateKey]);

        if (customCallback) {
            customCallback(state[stateKey], slider, event);
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

function bindSimpleControlRemainder() {
    BASIC_SLIDER_BINDINGS
        .filter(({ controlKey }) => !SPECIAL_SLIDERS.has(controlKey))
        .forEach(({ controlKey, stateKey, parser }) => bindSlider(controlKey, stateKey, parser));

    BASIC_CHECKBOX_BINDINGS
        .filter(({ controlKey }) => !SPECIAL_CHECKBOXES.has(controlKey))
        .forEach(({ controlKey, stateKey }) => bindCheckbox(controlKey, stateKey));

    BASIC_SELECTOR_BINDINGS
        .filter(({ controlKey }) => !SPECIAL_SELECTORS.has(controlKey))
        .forEach(({ controlKey, stateKey }) => bindSelector(controlKey, stateKey));
}

export function requestDomainRedraw(markDomainDirty = false) {
    if (markDomainDirty) context.domainColoringDirty = true;
    requestRedrawAll();
}

export function syncLaplacePlayPauseButton() {
    if (controls.laplacePlayPauseBtn) {
        controls.laplacePlayPauseBtn.innerHTML = state.laplaceAnimationPlaying ? '⏸ Pause' : '▶ Play';
    }
}

export function syncLaplaceWindingSyncButton() {
    const button = controls.laplaceWindingSyncBtn;
    if (!button) return;

    const enabled = Boolean(state.laplaceWindingSyncZoom);
    button.textContent = enabled ? 'Sync Zoom: On' : 'Sync Zoom: Off';
    button.style.color = enabled ? 'rgba(150, 200, 255, 0.9)' : 'rgba(180, 180, 180, 0.6)';
    button.style.borderColor = enabled ? 'rgba(80, 120, 180, 0.5)' : 'rgba(80, 80, 80, 0.4)';
}

export function setActiveFunctionButton(activeKey) {
    Object.entries(controls.funcButtons || {}).forEach(([key, button]) => {
        if (!button) return;
        const active = key === activeKey;
        button.classList.toggle('active', active);
        button.classList.toggle('btn-primary', active);
        button.classList.toggle('btn-outline-secondary', !active);
    });
}

function updateModePanels() {
    hidden(controls.fourierSpecificControlsDiv, !state.fourierModeEnabled);
    hidden(controls.laplaceSpecificControlsDiv, !state.laplaceModeEnabled);
    display(controls.laplaceWindingSyncBtn, state.laplaceModeEnabled);
    syncLaplacePlayPauseButton();
    syncLaplaceWindingSyncButton();
}

function disableAlgebraicChaining() {
    if (!state.algebraicChainingEnabled) return;

    state.algebraicChainingEnabled = false;
    checked('enableAlgebraicChainingCb', false);
    display(controls.algebraicChainingControlsContainer, false);
}

function syncChainingControlsFromState() {
    checked('enableChainingCb', state.chainingEnabled);
    display(controls.chainingControlsContainer, state.chainingEnabled);
    if (controls.chainModeSelector) controls.chainModeSelector.value = state.chainingMode;
    if (controls.chainCountSlider) controls.chainCountSlider.value = state.chainCount;
    if (controls.chainCountValueDisplay) controls.chainCountValueDisplay.textContent = state.chainCount;
    call(updateChainingColumns, state.chainingEnabled ? state.chainCount : 1);
    call(updateChainingTitles);
}

function syncAlgebraicControlsFromState() {
    checked('enableAlgebraicChainingCb', state.algebraicChainingEnabled);
    display(controls.algebraicChainingControlsContainer, state.algebraicChainingEnabled);
    if (state.algebraicChainingEnabled) renderAlgebraicChainingTerms();
}

function syncDomainControlsFromState() {
    checked('enableDomainColoringCb', state.domainColoringEnabled);
    hidden(controls.domainColoringOptionsDiv, !state.domainColoringEnabled);
    hidden(controls.domainColoringKeyDiv, !state.domainColoringEnabled);
    hidden(controls.riemannSphereDomainColoringOptions, !state.domainColoringEnabled);
    if (controls.domainPaletteSelect) controls.domainPaletteSelect.value = state.domainPalette;
    call(renderDomainPalettesUI, $('domain_palette_circles'));
    call(updateDomainColoringKey);
}

function syncInputShapeControlFromState() {
    if (controls.inputShapeSelector) controls.inputShapeSelector.value = state.currentInputShape;
}

function activateFractalPreset(key) {
    const preset = applyFractalPreset(state, key);
    if (!preset) return false;

    if (state.laplaceModeEnabled) call(stopLaplaceAnimation);
    syncChainingControlsFromState();
    syncAlgebraicControlsFromState();
    syncDomainControlsFromState();
    syncInputShapeControlFromState();
    updateModePanels();
    generatePolynomialCoeffSliders();
    setActiveFunctionButton(key);
    updateTitlesAndGlobalUI();
    syncParameterControlsPanelVisibility();
    if (state.dynamicPlotting?.enabled) syncDynamicPlottingUI();
    requestDomainRedraw(true);
    return true;
}

function activateFunctionMode(key) {
    if (isFractalPresetKey(key) && activateFractalPreset(key)) return;

    const enteringFourier = key === 'fourier';
    const enteringLaplace = key === 'laplace';

    if (state.laplaceModeEnabled && !enteringLaplace) call(stopLaplaceAnimation);
    if ((enteringFourier || enteringLaplace) && state.currentInputShape === 'video') call(pauseUploadedVideoPlayback);

    disableAlgebraicChaining();

    state.currentFunction = key;
    state.currentFunctionPreset = null;
    state.fractalOrbitColoringEnabled = false;
    state.fourierModeEnabled = enteringFourier;
    state.laplaceModeEnabled = enteringLaplace;

    if ((enteringFourier || enteringLaplace) && state.navigationModeEnabled) call(setNavigationModeEnabled, false);
    if (enteringFourier) call(updateFourierTransform);

    if (enteringLaplace) {
        Object.assign(state, {
            laplaceTopVP: null,
            lapaceBotVP: null,
            laplaceDragging: null,
            laplaceNeedViewportReset: true
        });
        call(updateLaplaceTransform);
        call(showFullLaplaceSpiral);
    }

    updateModePanels();
    setActiveFunctionButton(key);
    if (state.dynamicPlotting?.enabled) syncDynamicPlottingUI();
    requestDomainRedraw(true);
}

function readImageFile(file, callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
        const img = new Image();
        img.onload = () => callback(img);
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function processUploadedImage(img) {
    if (processUploadedImageSource(img)) requestDomainRedraw(true);
}

function reprocessUploadedImage() {
    if (state.uploadedImage) processUploadedImage(state.uploadedImage);
}

function reprocessUploadedVideo() {
    if (!state.uploadedVideo) return;
    processUploadedVideoFrame(true);
    requestDomainRedraw(true);
}

function complexState(key) {
    return state[key] || (state[key] = { re: 0, im: 0 });
}

function initializeMobiusState() {
    MOBIUS_PARAMS.forEach(param => {
        const value = complexState(`mobius${param}`);
        COMPLEX_PARTS.forEach(part => {
            const slider = controls[`mobius${param}_${part}_slider`];
            if (slider) value[part] = parseControlValue(slider, parseFloat, value[part]);
        });
    });
}

function syncTaylorCustomCenterInputs() {
    if (context.taylorCenterUI) context.taylorCenterUI.setPoints([state.taylorSeriesCustomCenter], false);
}

function setTaylorCustomCenter(re, im, shouldRedraw = true) {
    Object.assign(state.taylorSeriesCustomCenter, { re, im });
    syncTaylorCustomCenterInputs();
    call(syncTaylorSeriesCenterStatus);
    if (shouldRedraw) requestRedrawAll();
}

function initializeScalarBindings() {
    sliderParamKeys.forEach(key => readSliderState(`${key}Slider`, key));
    BASIC_SLIDER_BINDINGS.forEach(({ controlKey, stateKey, parser }) => readSliderState(controlKey, stateKey, parser));
    BASIC_CHECKBOX_BINDINGS.forEach(({ controlKey, stateKey }) => readCheckboxState(controlKey, stateKey));
    BASIC_SELECTOR_BINDINGS.forEach(({ controlKey, stateKey }) => readSelectorState(controlKey, stateKey));
    initializeMobiusState();
    syncTaylorCustomCenterInputs();
    call(initializeNavigationStateFromControls);
}

export function initializeStateFromControls() {
    initializeScalarBindings();
    updateModePanels();
    setActiveFunctionButton(state.currentFunction);
    call(syncVideoPlaybackUI);
}

function bindAnimatedSlider(slider, updateState, playButton, speedSelector) {
    if (!slider || !playButton || !speedSelector) return;
    bindElementListener(playButton, 'click', () => toggleAnimation(slider, updateState, playButton, speedSelector));
}

function bindBaseParameterControls() {
    sliderParamKeys.forEach(key => {
        bindSlider(`${key}Slider`, key);
        bindAnimatedSlider(
            controls[`${key}Slider`],
            value => {
                state[key] = value;
            },
            controls[`play_${key}Btn`],
            controls[`speed_${key}Selector`]
        );
    });
}

function bindMobiusControls() {
    MOBIUS_PARAMS.forEach(param => COMPLEX_PARTS.forEach(part => {
        const stateKey = `mobius${param}`;
        const sliderKey = `mobius${param}_${part}_slider`;

        bindControlListener(sliderKey, 'input', (_event, slider) => {
            complexState(stateKey)[part] = parseControlValue(slider, parseFloat, 0);
            requestDomainRedraw(true);
        });

        bindAnimatedSlider(
            controls[sliderKey],
            value => {
                complexState(stateKey)[part] = value;
            },
            controls[`play_mobius${param}_${part}_btn`],
            controls[`speed_mobius${param}_${part}_selector`]
        );
    }));
}

function bindFunctionButtons() {
    Object.entries(controls.funcButtons || {}).forEach(([key, button]) => {
        bindElementListener(button, 'click', () => activateFunctionMode(key));
    });
}

function firstFile(event) {
    return event.target.files && event.target.files[0];
}

function bindImageControls() {
    bindControlListener('imageUploadInput', 'change', event => {
        const file = firstFile(event);
        if (file) readImageFile(file, processUploadedImage);
    });

    bindSlider('imageResolutionSlider', 'imageResolution', parseInteger, () => {
        reprocessUploadedImage();
        requestRedrawAll();
    });
    bindSlider('imageSizeSlider', 'imageSize', parseFloat, () => requestDomainRedraw(true));
    bindSlider('imageOpacitySlider', 'imageOpacity', parseFloat, () => requestDomainRedraw(true));
}

function bindVideoControls() {
    bindControlListener('videoUploadInput', 'change', event => {
        const file = firstFile(event);
        if (file) loadUploadedVideoFile(file);
    });

    bindControlListener('videoPlayPauseBtn', 'click', () => toggleUploadedVideoPlayback());

    bindSlider('videoResolutionSlider', 'videoResolution', parseInteger, () => {
        reprocessUploadedVideo();
        requestRedrawAll();
    });
    bindSlider('videoFpsSlider', 'videoProcessingFps', parseInteger, () => {
        syncVideoPlaybackUI();
        if (state.videoIsPlaying && state.currentInputShape === 'video') startVideoProcessingLoop();
        requestRedrawAll();
    });
    bindSlider('videoSizeSlider', 'videoSize', parseFloat, () => requestDomainRedraw(true));
    bindSlider('videoOpacitySlider', 'videoOpacity', parseFloat, () => requestDomainRedraw(true));
}

function syncPalette(selectors, container) {
    selectors.forEach(selector => {
        selector.value = state.domainPalette;
    });
    renderDomainPalettesUI(container);
    call(updateDomainColoringKey);
    requestDomainRedraw(true);
}

function bindDomainColoringControls() {
    bindCheckbox('enableDomainColoringCb', 'domainColoringEnabled', () => {
        if (state.domainColoringEnabled) {
            if (state.riemannTransformationEnabled) {
                state.riemannTransformationEnabled = false;
                checked('enableRiemannTransformationCb', false);
                call(syncRiemannTransformationUI);
            }
        }
        hidden(controls.domainColoringOptionsDiv, !state.domainColoringEnabled);
        hidden(controls.domainColoringKeyDiv, !state.domainColoringEnabled);
        hidden(controls.riemannSphereDomainColoringOptions, !state.domainColoringEnabled);
        requestDomainRedraw(true);
    });

    const selectors = [controls.riemannSurfacePaletteSelect, controls.riemannSpherePaletteSelect].filter(Boolean);
    const paletteContainer = $('domain_palette_circles');

    selectors.forEach(selector => {
        selector.innerHTML = '';
        domainPalettes.forEach(palette => {
            const option = h('option', { text: palette.name });
            option.value = palette.id;
            selector.appendChild(option);
        });
        selector.value = state.domainPalette;
        bindElementListener(selector, 'change', event => {
            state.domainPalette = event.target.value;
            syncPalette(selectors, paletteContainer);
        });
    });

    renderDomainPalettesUI(paletteContainer);
    bindElementListener(paletteContainer, 'click', event => {
        const button = closest(event.target, '.domain-palette-circle-btn');
        if (!button) return;
        state.domainPalette = button.dataset.paletteId;
        syncPalette(selectors, paletteContainer);
    });

    [
        ['grid_color_1_input', 'grid_color_1_picker_wrapper', 'gridColor1'],
        ['grid_color_2_input', 'grid_color_2_picker_wrapper', 'gridColor2']
    ].forEach(([inputId, wrapperId, stateKey]) => {
        bindElementListener($(inputId), 'input', event => {
            state[stateKey] = event.target.value;
            setStyles($(wrapperId), { backgroundColor: state[stateKey] });
            requestRedrawAll();
        });
    });

    ['domainBrightness', 'domainContrast', 'domainSaturation', 'domainLightnessCycles']
        .forEach(key => bindSlider(`${key}Slider`, key, parseFloat, () => requestDomainRedraw(true)));
}

function disableRiemannSurface() {
    state.riemannSurfaceEnabled = false;
    checked('enableRiemannSurfaceCb', false);
    hidden(controls.riemannSurfaceOptionsDiv, true);
}

function bindViewControls() {
    bindCheckbox('enableSplitViewCb', 'splitViewEnabled', () => {
        if (state.splitViewEnabled) {
            if (state.riemannSurfaceEnabled) disableRiemannSurface();
            if (state.riemannTransformationEnabled) {
                state.riemannTransformationEnabled = false;
                checked('enableRiemannTransformationCb', false);
            }
        }
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    [
        ['zPlaneZoomSlider', 'zPlaneZoom', [true, false]],
        ['wPlaneZoomSlider', 'wPlaneZoom', [false, true]]
    ].forEach(([controlKey, stateKey, args]) => bindSlider(controlKey, stateKey, parseFloat, () => {
        setupVisualParameters(...args);
        requestDomainRedraw(true);
    }));

    bindCheckbox('enableRiemannSphereCb', 'riemannSphereViewEnabled', () => {
        if (state.riemannSphereViewEnabled) {
            if (state.riemannSurfaceEnabled) disableRiemannSurface();
            
            if (!state.plotly3DEnabled) {
                state.plotly3DEnabled = true;
                checked('enablePlotly3DCb', true);
                hidden(controls.plotly3DOptionsDiv, false);
            }
            if (!state.splitViewEnabled) {
                state.splitViewEnabled = true;
                checked('enableSplitViewCb', true);
            }
        } else {
            state.riemannTransformationEnabled = false;
            checked('enableRiemannTransformationCb', false);
            hidden(controls.plotly3DOptionsDiv, true);
        }
        hidden(controls.riemannSphereOptionsDiv, !state.riemannSphereViewEnabled);
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    bindCheckbox('enablePlotly3DCb', 'plotly3DEnabled', () => {
        if (state.plotly3DEnabled) {
            if (state.riemannTransformationEnabled) {
                state.riemannTransformationEnabled = false;
                checked('enableRiemannTransformationCb', false);
                call(syncRiemannTransformationUI);
            }
        }
        hidden(controls.plotly3DOptionsDiv, !state.plotly3DEnabled);
        call(updateChainingTitles);
        requestRedrawAll();
    });

    bindCheckbox('enableRiemannTransformationCb', 'riemannTransformationEnabled', () => {
        if (state.riemannTransformationEnabled) {
            if (!state.riemannSphereViewEnabled) {
                state.riemannSphereViewEnabled = true;
                checked('enableRiemannSphereCb', true);
                hidden(controls.riemannSphereOptionsDiv, false);
            }
            if (state.riemannSurfaceEnabled) {
                disableRiemannSurface();
            }
            if (state.domainColoringEnabled) {
                state.domainColoringEnabled = false;
                checked('enableDomainColoringCb', false);
                hidden(controls.domainColoringOptionsDiv, true);
                hidden(controls.domainColoringKeyDiv, true);
                hidden(controls.riemannSphereDomainColoringOptions, true);
            }
            if (state.splitViewEnabled) {
                state.splitViewEnabled = false;
                checked('enableSplitViewCb', false);
            }
            if (state.plotly3DEnabled) {
                state.plotly3DEnabled = false;
                checked('enablePlotly3DCb', false);
                hidden(controls.plotly3DOptionsDiv, true);
            }
        }
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    bindCheckbox('enableRiemannSurfaceCb', 'riemannSurfaceEnabled', () => {
        if (state.riemannSurfaceEnabled) {
            Object.assign(state, { riemannSphereViewEnabled: false, riemannTransformationEnabled: false, splitViewEnabled: false, plotly3DEnabled: false });
            ['enableRiemannSphereCb', 'enableRiemannTransformationCb', 'enableSplitViewCb', 'enablePlotly3DCb'].forEach(key => checked(key, false));
            if (state.navigationModeEnabled) call(setNavigationModeEnabled, false);
        }

        hidden(controls.riemannSurfaceOptionsDiv, !state.riemannSurfaceEnabled);
        hidden(controls.riemannSphereOptionsDiv, true);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    const transSliderZ = document.getElementById('z_transformation_progress_slider');
    if (transSliderZ) {
        bindElementListener(transSliderZ, 'input', event => {
            state.riemannTransformationPlayingZ = false;
            state.riemannTransformationProgressZ = parseFloat(event.target.value);
            call(syncRiemannTransformationPlayPauseButton);
            requestDomainRedraw(true);
        });
    }

    const transPlayPauseBtnZ = document.getElementById('z_transformation_play_pause_btn');
    if (transPlayPauseBtnZ) {
        bindElementListener(transPlayPauseBtnZ, 'click', () => {
            toggleRiemannTransformationAnimationZ();
        });
    }

    const transSliderW = document.getElementById('w_transformation_progress_slider');
    if (transSliderW) {
        bindElementListener(transSliderW, 'input', event => {
            state.riemannTransformationPlayingW = false;
            state.riemannTransformationProgressW = parseFloat(event.target.value);
            call(syncRiemannTransformationPlayPauseButton);
            requestDomainRedraw(true);
        });
    }

    const transPlayPauseBtnW = document.getElementById('w_transformation_play_pause_btn');
    if (transPlayPauseBtnW) {
        bindElementListener(transPlayPauseBtnW, 'click', () => {
            toggleRiemannTransformationAnimationW();
        });
    }

    bindControlListener('riemannSurfaceResetViewBtn', 'click', () => resetRiemannSurfaceViews());

    Object.entries(SPHERE_VIEW_BUTTONS).forEach(([controlKey, rotation]) => {
        bindControlListener(controlKey, 'click', () => {
            [sphereViewParams.z, sphereViewParams.w].forEach(params => Object.assign(params, rotation));
            requestDomainRedraw(true);
        });
    });
}

function bindNavigationControls() {
    bindControlListener('enableNavigationModeCb', 'change', (_event, checkbox) => {
        if (typeof setNavigationModeEnabled === 'function') setNavigationModeEnabled(checkbox.checked);
        else state.navigationModeEnabled = checkbox.checked;
        requestDomainRedraw(true);
    });

    bindSlider('navigationSizeSlider', 'navigationSize', parseFloat, () => {
        const shifted = typeof followNavigationViewports === 'function' ? followNavigationViewports() : false;
        requestDomainRedraw(Boolean(shifted && state.domainColoringEnabled));
    });
    bindSlider('navigationOpacitySlider', 'navigationOpacity', parseFloat, () => requestDomainRedraw(false));
    bindSlider('navigationSpeedSlider', 'navigationSpeed', parseFloat, () => requestDomainRedraw(false));
    bindSlider('navigationTrailLengthSlider', 'navigationTrailLength', parseInteger, () => {
        if (state.navigationTrail.length > state.navigationTrailLength) {
            state.navigationTrail.splice(0, state.navigationTrail.length - state.navigationTrailLength);
        }
        requestDomainRedraw(false);
    });

    bindControlListener('navigationResetBtn', 'click', () => call(resetNavigationVehicle));
    bindElementListener(document, 'keydown', event => call(setNavigationKey, event, true));
    bindElementListener(document, 'keyup', event => call(setNavigationKey, event, false));
    bindElementListener(window, 'blur', () => {
        state.navigationKeys = {};
        call(stopNavigationLoop);
    });
}

function bindVectorFieldControls() {
    bindCheckbox('enableVectorFieldCb', 'vectorFieldEnabled', () => {
        hidden(controls.vectorFieldOptionsDiv, !state.vectorFieldEnabled);
        requestDomainRedraw(true);
    });

    bindSelector('vectorFieldFunctionSelector', 'vectorFieldFunction', () => requestRedrawAll());

    [
        ['vectorFieldScaleSlider', 'vectorFieldScale'],
        ['vectorArrowThicknessSlider', 'vectorArrowThickness'],
        ['vectorArrowHeadSizeSlider', 'vectorArrowHeadSize'],
        ['streamlineStepSizeSlider', 'streamlineStepSize'],
        ['streamlineMaxLengthSlider', 'streamlineMaxLength', parseInteger],
        ['streamlineThicknessSlider', 'streamlineThickness'],
        ['streamlineSeedDensityFactorSlider', 'streamlineSeedDensityFactor']
    ].forEach(([controlKey, stateKey, parser = parseFloat]) => bindSlider(controlKey, stateKey, parser));

    bindCheckbox('enableStreamlineFlowCb', 'streamlineFlowEnabled');
    bindControlListener('clearManualSeedsBtn', 'click', () => {
        state.manualSeedPoints = [];
        requestRedrawAll();
    });
    bindCheckbox('showVectorFieldPanelCb', 'showVectorFieldPanelEnabled', () => {
        hidden(controls.vectorFlowOptionsContent, !state.showVectorFieldPanelEnabled);
    });
}

function bindTaylorControls() {
    bindCheckbox('enableTaylorSeriesCb', 'taylorSeriesEnabled', () => {
        hidden(controls.taylorSeriesOptionsDetailDiv, !state.taylorSeriesEnabled);
        requestRedrawAll();
    });

    bindSlider('taylorSeriesOrderSlider', 'taylorSeriesOrder', parseInteger);

    bindCheckbox('enableTaylorSeriesCustomCenterCb', 'taylorSeriesCustomCenterEnabled', () => {
        hidden(controls.taylorSeriesCustomCenterInputsDiv, !state.taylorSeriesCustomCenterEnabled);
        call(syncTaylorSeriesCenterStatus);
        requestRedrawAll();
    });

    if (controls.taylorComplexPointsUiContainer) {
        context.taylorCenterUI = new ComplexPointsUI(controls.taylorComplexPointsUiContainer, {
            multiple: false,
            presets: TAYLOR_CENTER_PRESET_GROUPS,
            initialPoints: [state.taylorSeriesCustomCenter],
            onChange: points => {
                const point = points[0] || { re: 0, im: 0 };
                setTaylorCustomCenter(point.re, point.im, true);
            }
        });
    }
}

function bindGeneralPointsControls() {
    bindCheckbox('enableGeneralPointsCb', 'generalPointsEnabled', () => {
        hidden(controls.generalPointsControlsContainer, !state.generalPointsEnabled);
        requestRedrawAll();
    });

    if (controls.generalPointsRoot) {
        context.generalPointsUI = new ComplexPointsUI(controls.generalPointsRoot, {
            multiple: true,
            presets: TAYLOR_CENTER_PRESET_GROUPS,
            initialPoints: state.generalPointsList,
            onChange: points => {
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
        hidden(controls.particleAnimationDetailsDiv, !state.particleAnimationEnabled);
        if (!state.particleAnimationEnabled) state.particles = [];
        requestRedrawAll();
    });

    bindSlider('particleDensitySlider', 'particleDensity', parseInteger, () => {
        state.particles = [];
        requestRedrawAll();
    });
    bindSlider('particleSpeedSlider', 'particleSpeed');
    bindSlider('particleMaxLifetimeSlider', 'particleMaxLifetime', parseInteger);
}

function bindFourierControls() {
    bindSelector('fourierFunctionSelector', 'fourierFunction', () => {
        updateFourierTransform();
        requestRedrawAll();
    });

    [
        ['fourierFrequency', parseFloat],
        ['fourierAmplitude', parseFloat],
        ['fourierTimeWindow', parseFloat],
        ['fourierSamples', parseInteger]
    ].forEach(([key, parser]) => bindSlider(`${key}Slider`, key, parser, () => {
        updateFourierTransform();
        requestRedrawAll();
    }));

    bindSlider('fourierWindingFrequencySlider', 'fourierWindingFrequency');
    bindSlider('fourierWindingTimeSlider', 'fourierWindingTime');
}

function bindLaplaceControls() {
    bindSelector('laplaceFunctionSelector', 'laplaceFunction', () => {
        updateLaplaceTransform();
        requestRedrawAll();
    });

    ['laplaceFrequency', 'laplaceDamping'].forEach(key => bindSlider(`${key}Slider`, key, parseFloat, () => {
        updateLaplaceTransform();
        requestRedrawAll();
    }));

    ['laplaceSigma', 'laplaceOmega'].forEach(key => bindSlider(`${key}Slider`, key, parseFloat, () => {
        updateLaplaceEvaluationPoint();
        requestRedrawAll();
    }));

    bindSelector('laplaceVizModeSelector', 'laplaceVizMode', () => {
        updateLaplace3DSurface();
        requestRedrawAll();
    });
    bindSlider('laplaceClipHeightSlider', 'laplaceClipHeight', parseFloat, () => {
        updateLaplace3DSurface();
        requestRedrawAll();
    });

    [
        ['laplaceShowROCCb', 'laplaceShowROC'],
        ['laplaceShowPolesZerosCb', 'laplaceShowPolesZeros'],
        ['laplaceShowFourierLineCb', 'laplaceShowFourierLine'],
        ['laplaceAnimationLoopCb', 'laplaceAnimationLoop']
    ].forEach(([controlKey, stateKey]) => bindCheckbox(controlKey, stateKey));

    bindSlider('laplaceAnimationSpeedSlider', 'laplaceAnimationSpeed', parseFloat, () => {
        if (controls.laplaceAnimationSpeedDisplay) {
            controls.laplaceAnimationSpeedDisplay.textContent = state.laplaceAnimationSpeed.toFixed(1);
        }
        syncLaplacePlayPauseButton();
    });

    [
        ['laplacePlayPauseBtn', toggleLaplaceAnimation],
        ['laplaceResetBtn', resetLaplaceAnimation],
        ['laplaceShowFullBtn', showFullLaplaceSpiral]
    ].forEach(([controlKey, fn]) => bindControlListener(controlKey, 'click', () => {
        call(fn);
        frame(syncLaplacePlayPauseButton);
    }));

    bindControlListener('laplaceFindPolesZerosBtn', 'click', () => {
        if (!state.laplaceModeEnabled) return;

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
        if (!state.laplaceModeEnabled || !state.laplacePoles) return;
        state.laplaceStability = analyzeStability(state.laplacePoles);
        requestRedrawAll();
    });

    bindControlListener('laplaceWindingSyncBtn', 'click', () => {
        state.laplaceWindingSyncZoom = !state.laplaceWindingSyncZoom;
        syncLaplaceWindingSyncButton();
    });
}

function canvasContext(planeType) {
    return planeType === 'z'
        ? { planeType, canvas: zCanvas, params: zPlaneParams, pan: state.panStateZ, isZ: true }
        : { planeType, canvas: wCanvas, params: wPlaneParams, pan: state.panStateW, isZ: false };
}

function isSphereInteractionActive(isZCanvas) {
    return isZCanvas
        ? state.riemannSphereViewEnabled && !state.splitViewEnabled
        : state.riemannSphereViewEnabled || state.splitViewEnabled;
}

function mouse(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
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
    if (!state.laplaceTopVP || !state.lapaceBotVP) return null;
    const top = mouseY < state.laplaceTopVP.height;
    return { panel: top ? 'top' : 'bot', viewport: top ? state.laplaceTopVP : state.lapaceBotVP };
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

function panPlane(ctx, pos) {
    ctx.params.origin.x = ctx.pan.panStartOrigin.x + (pos.x - ctx.pan.panStart.x);
    ctx.params.origin.y = ctx.pan.panStartOrigin.y + (pos.y - ctx.pan.panStart.y);
    updatePlaneViewportRanges(ctx.params);
    requestDomainRedraw(true);
}

function updateProbe(ctx, pos, active = true) {
    if (!ctx.isZ) return;
    if (!active) {
        state.probeActive = false;
        return;
    }

    const world = mapCanvasToWorldCoords(pos.x, pos.y, ctx.params);
    state.probeZ = { re: world.x, im: world.y };
    state.probeActive = true;
}

function startPan(ctx, pos) {
    ctx.pan.isPanning = true;
    ctx.pan.panStart.x = pos.x;
    ctx.pan.panStart.y = pos.y;
    ctx.pan.panStartOrigin.x = ctx.params.origin.x;
    ctx.pan.panStartOrigin.y = ctx.params.origin.y;
    ctx.canvas.style.cursor = 'grabbing';
    updateProbe(ctx, pos, false);
    requestRedrawAll();
}

function handleCanvasMove(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    const pos = mouse(ctx.canvas, event);

    if (!ctx.isZ && state.laplaceModeEnabled && state.laplaceDragging) {
        const viewport = state.laplaceDragging.panel === 'top' ? state.laplaceTopVP : state.lapaceBotVP;
        if (!viewport) return;

        viewport.origin.x = state.laplaceDragging.startOrigin.x + (pos.x - state.laplaceDragging.startX);
        viewport.origin.y = state.laplaceDragging.startOrigin.y + (pos.y - state.laplaceDragging.startY);
        updateLaplaceViewportRanges(viewport);
        requestRedrawAll();
        return;
    }

    if (ctx.pan.isPanning) {
        panPlane(ctx, pos);
        return;
    }

    if (ctx.isZ && state.navigationModeEnabled) {
        state.probeActive = false;
        return;
    }

    if (ctx.isZ && !state.panStateZ.isPanning && !state.panStateW.isPanning) {
        updateProbe(ctx, pos, true);
        requestRedrawAll();
    }
}

function tryStartLaplaceDrag(ctx, pos) {
    if (ctx.isZ || !state.laplaceModeEnabled || !state.laplaceTopVP || !state.lapaceBotVP) return false;

    const target = getLaplaceViewportAtY(pos.y);
    if (!target) return false;

    state.laplaceDragging = {
        panel: target.panel,
        startX: pos.x,
        startY: pos.y,
        startOrigin: { x: target.viewport.origin.x, y: target.viewport.origin.y }
    };
    ctx.canvas.style.cursor = 'grabbing';
    return true;
}

function tryAddManualSeed(ctx, event, pos) {
    if (!ctx.isZ || event.button !== 0 || !event.shiftKey || !state.streamlineFlowEnabled) return false;

    const world = mapCanvasToWorldCoords(pos.x, pos.y, ctx.params);
    state.manualSeedPoints.push({ re: world.x, im: world.y });
    requestRedrawAll();
    event.stopPropagation();
    return true;
}

function handleCanvasDown(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    const pos = mouse(ctx.canvas, event);
    if (event.button === 0 && tryStartLaplaceDrag(ctx, pos)) return;
    if (tryAddManualSeed(ctx, event, pos) || event.button !== 0) return;
    startPan(ctx, pos);
}

function handleCanvasUp(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    if (!ctx.isZ && state.laplaceDragging) {
        state.laplaceDragging = null;
        ctx.canvas.style.cursor = 'crosshair';
        return;
    }

    if (event.button !== 0 || !ctx.pan.isPanning) return;

    ctx.pan.isPanning = false;
    ctx.canvas.style.cursor = 'crosshair';

    if (!ctx.isZ) return;

    if (state.navigationModeEnabled) {
        updateProbe(ctx, null, false);
        requestRedrawAll();
        return;
    }

    const pos = mouse(ctx.canvas, event);
    updateProbe(ctx, pos, pos.x >= 0 && pos.x <= ctx.canvas.width && pos.y >= 0 && pos.y <= ctx.canvas.height);
    requestRedrawAll();
}

function handleCanvasLeave(ctx) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    if (!ctx.isZ && state.laplaceDragging) {
        state.laplaceDragging = null;
        ctx.canvas.style.cursor = 'crosshair';
    }

    if (ctx.pan.isPanning) {
        ctx.pan.isPanning = false;
        ctx.canvas.style.cursor = 'crosshair';
        context.domainColoringDirty = true;
    }

    updateProbe(ctx, null, false);
    requestRedrawAll();
}

function zoomPlaneAt(ctx, pos, factor) {
    const zoomKey = ctx.isZ ? 'zPlaneZoom' : 'wPlaneZoom';
    const oldZoom = state[zoomKey] || 1;
    const nextZoom = clamp(oldZoom * factor, MIN_STATE_ZOOM_LEVEL, MAX_STATE_ZOOM_LEVEL);
    const applied = nextZoom / oldZoom;
    const world = mapCanvasToWorldCoords(pos.x, pos.y, ctx.params);

    state[zoomKey] = nextZoom;
    ctx.params.scale.x *= applied;
    ctx.params.scale.y *= applied;
    ctx.params.origin.x = pos.x - world.x * ctx.params.scale.x;
    ctx.params.origin.y = pos.y + world.y * ctx.params.scale.y;

    updatePlaneViewportRanges(ctx.params);
    requestDomainRedraw(true);
}

function handleCanvasWheel(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    event.preventDefault();
    const pos = mouse(ctx.canvas, event);
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;

    if (!ctx.isZ && state.laplaceModeEnabled && state.laplaceTopVP && state.lapaceBotVP) {
        const target = getLaplaceViewportAtY(pos.y);
        if (!target) return;

        zoomLaplaceViewport(target.viewport, pos.x, pos.y, factor, false);

        if (state.laplaceWindingSyncZoom) {
            zoomLaplaceViewport(target.panel === 'top' ? state.lapaceBotVP : state.laplaceTopVP, pos.x, pos.y, factor, true);
        }

        requestRedrawAll();
        return;
    }

    zoomPlaneAt(ctx, pos, factor);
}

function bindCanvasInteractions() {
    ['z', 'w'].map(canvasContext).forEach(ctx => {
        [
            ['mousemove', event => handleCanvasMove(ctx, event)],
            ['mousedown', event => handleCanvasDown(ctx, event)],
            ['mouseup', event => handleCanvasUp(ctx, event)],
            ['mouseleave', () => handleCanvasLeave(ctx)],
            ['wheel', event => handleCanvasWheel(ctx, event)]
        ].forEach(([eventName, handler]) => bindElementListener(ctx.canvas, eventName, handler));

        [
            ['mousedown', event => handleSphereMouseDown(event, ctx.planeType)],
            ['mousemove', event => handleSphereMouseMove(event, ctx.planeType)],
            ['mouseup', () => handleSphereMouseUp(ctx.planeType)],
            ['mouseleave', () => handleSphereMouseUp(ctx.planeType)]
        ].forEach(([eventName, handler]) => bindElementListener(ctx.canvas, eventName, handler));
    });
}

function fullscreenStyles(backgroundColor) {
    return {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '1000',
        backgroundColor
    };
}

function attachCloseButton(container, handler) {
    if (!controls.closeFullscreenBtn || !container) return;
    controls.closeFullscreenBtn.onclick = handler;
    container.appendChild(controls.closeFullscreenBtn);
    controls.closeFullscreenBtn.classList.remove('hidden');
}

function detachCloseButton(container) {
    if (!controls.closeFullscreenBtn) return;
    if (controls.closeFullscreenBtn.parentElement === container) container.removeChild(controls.closeFullscreenBtn);
    controls.closeFullscreenBtn.classList.add('hidden');
}

function removeFromBody(element) {
    if (element && element.parentElement === document.body) document.body.removeChild(element);
}

function resetFullscreenShell(container) {
    if (!container) return;
    container.classList.add('hidden');
    removeFromBody(container);
    detachCloseButton(container);
    clearStyles(container, ['position', 'top', 'left', 'width', 'height', 'zIndex', 'backgroundColor']);
}

function bindFullscreenControls() {
    bindControlListener('toggleFullscreenZBtn', 'click', () => handleFullScreenToggle('z'));
    bindControlListener('toggleFullscreenWBtn', 'click', () => handleFullScreenToggle('w', 0));
    bindControlListener('toggleFullscreenLaplace3DBtn', 'click', toggleLaplace3DFullscreen);

    // Event delegation for dynamic chained w-plane fullscreen buttons
    bindElementListener(document, 'click', event => {
        const btn = event.target.closest('[id^="toggle_fullscreen_w_btn_"]');
        if (btn) {
            const index = parseInt(btn.id.replace('toggle_fullscreen_w_btn_', ''), 10);
            if (!isNaN(index)) {
                handleFullScreenToggle('w', index);
            }
        }
    });

    bindElementListener(document, 'keydown', event => {
        if (event.key !== 'Escape') return;
        if (state.isZFullScreen) handleFullScreenToggle('z');
        if (state.isWFullScreen) handleFullScreenToggle('w', state.fullscreenWIndex || 0);
        if (state.isLaplace3DFullScreen && controls.toggleFullscreenLaplace3DBtn) {
            controls.toggleFullscreenLaplace3DBtn.click();
        }
    });
}

function toggleLaplace3DFullscreen() {
    const container3d = controls.laplace3DContainer;
    const column3d = controls.laplace3DColumn;
    const shell = controls.fullscreenContainer;

    if (!container3d || !shell) return;

    state.isLaplace3DFullScreen = !state.isLaplace3DFullScreen;

    if (state.isLaplace3DFullScreen) {
        state.originalLaplace3DParent = container3d.parentElement;
        setStyles(shell, fullscreenStyles('#000'));
        attachCloseButton(shell, () => controls.toggleFullscreenLaplace3DBtn.click());
        setStyles(container3d, { width: '100%', height: '100%' });
        shell.appendChild(container3d);
        document.body.appendChild(shell);
        shell.classList.remove('hidden');
        if (column3d) column3d.classList.add('hidden-visually');
    } else {
        if (state.originalLaplace3DParent) state.originalLaplace3DParent.appendChild(container3d);
        setStyles(container3d, { width: '100%', height: '100%' });
        resetFullscreenShell(shell);
        if (column3d) column3d.classList.remove('hidden-visually');
    }

    laterFrame(() => resizePlotly(container3d, 'Laplace 3D Plotly surface'), state.isLaplace3DFullScreen ? 150 : 100);
}

function syncTopControlsCollapseState() {
    if (!controls.controlsOptionsSection || !controls.toggleTopControlsBtn || !controls.toggleTopControlsCollapsedBtn || !controls.topControlsCollapsedBar) {
        return;
    }

    const collapsed = Boolean(state.topControlsCollapsed);
    const expandedText = 'Minimize top half panels';
    const collapsedText = 'Expand top half panels';

    controls.controlsOptionsSection.classList.toggle('is-collapsed', collapsed);
    controls.topControlsCollapsedBar.classList.toggle('hidden', !collapsed);

    [
        [controls.toggleTopControlsBtn, expandedText],
        [controls.toggleTopControlsCollapsedBtn, collapsedText]
    ].forEach(([button, text]) => {
        button.dataset.tooltip = text;
        button.title = text;
        button.setAttribute('aria-label', text);
    });
}

function refreshCanvasLayoutAfterTopControlsToggle() {
    const refresh = () => {
        setupVisualParameters(false, false);
        requestDomainRedraw(true);
    };
    frame(refresh);
    setTimeout(refresh, 280);
}

function bindTopControlsToggle() {
    const toggle = () => {
        state.topControlsCollapsed = !state.topControlsCollapsed;
        syncTopControlsCollapseState();
        refreshCanvasLayoutAfterTopControlsToggle();
    };

    bindControlListener('toggleTopControlsBtn', 'click', toggle);
    bindControlListener('toggleTopControlsCollapsedBtn', 'click', toggle);
}

function triggerPlaneLayoutRefresh() {
    const refresh = () => {
        setupVisualParameters(false, false);
        requestDomainRedraw(true);
    };
    refresh();
    setTimeout(refresh, 340);
}

function bindCollapseControls() {
    [
        ['collapseZBtn', 'expandZBtn', controls.zCanvasCard],
        ['collapseWBtn', 'expandWBtn', controls.wCanvasCard]
    ].forEach(([collapseKey, expandKey, column]) => {
        bindControlListener(collapseKey, 'click', () => {
            if (!column) return;
            column.classList.add('plane-collapsed');
            triggerPlaneLayoutRefresh();
        });
        bindControlListener(expandKey, 'click', () => {
            if (!column) return;
            column.classList.remove('plane-collapsed');
            triggerPlaneLayoutRefresh();
        });
    });
}

export function setupEventListeners() {
    zCanvas = context.zCanvas;
    wCanvas = context.wCanvas;

    if (uiEventListenersBound) return;
    uiEventListenersBound = true;

    eventBus.on('state:laplaceAnimationPlaying', () => syncLaplacePlayPauseButton());
    BINDERS.forEach(fn => fn());

    syncTopControlsCollapseState();
    updateModePanels();
}

function bindChainingControls() {
    bindSelector('inputShapeSelector', 'currentInputShape', (_event, value) => {
        if (value !== 'video' && state.videoIsPlaying) {
            call(pauseUploadedVideoPlayback);
        } else if (value === 'video' && state.uploadedVideo && state.videoIsPlaying) {
            call(startVideoProcessingLoop);
        }
        requestDomainRedraw(true);
    });

    bindSlider('chainCountSlider', 'chainCount', parseInteger, value => {
        if (controls.chainCountValueDisplay) controls.chainCountValueDisplay.textContent = value;
        call(updateChainingColumns, state.chainingEnabled ? value : 1);
        requestRedrawAll();
    });

    bindElementListener(controls.enableChainingCb, 'change', event => {
        state.chainingEnabled = event.target.checked;
        state.fractalOrbitColoringEnabled = false;
        state.currentFunctionPreset = null;
        display(controls.chainingControlsContainer, state.chainingEnabled);
        call(updateChainingColumns, state.chainingEnabled ? state.chainCount : 1);
        updateTitlesAndGlobalUI();
        syncParameterControlsPanelVisibility();
        requestRedrawAll();
    });

    bindElementListener(controls.chainModeSelector, 'change', event => {
        state.chainingMode = event.target.value;
        state.fractalOrbitColoringEnabled = false;
        state.currentFunctionPreset = null;
        call(updateChainingTitles);
        requestRedrawAll();
    });

    bindElementListener(controls.gridViewBtn, 'click', () => {
        const row = document.querySelector('.canvas-row.two-column-layout');
        if (!row) return;
        const active = row.classList.toggle('chaining-grid-view');
        controls.gridViewBtn.textContent = active ? '⊟ Exit Grid View' : '⊞ Grid View';
        window.dispatchEvent(new Event('resize'));
    });
}

function bindThemeControls() {
    const themeBtn = $('theme_selector_btn');
    const themeModal = $('theme_modal');
    const themeModalBackdrop = $('theme_modal_backdrop');
    const closeThemeModalBtn = $('close_theme_modal_btn');
    const themeListContainer = $('theme_list_container');
    const close = () => hidden(themeModal, true);

    applyTheme(state.themeId);

    bindElementListener(themeBtn, 'click', () => {
        renderThemesList(themeListContainer);
        hidden(themeModal, false);
    });
    bindElementListener(themeModalBackdrop, 'click', close);
    bindElementListener(closeThemeModalBtn, 'click', close);
    bindElementListener(themeListContainer, 'click', event => {
        const card = closest(event.target, '.theme-card');
        if (!card) return;
        state.themeId = card.dataset.themeId;
        applyTheme(state.themeId);
        renderThemesList(themeListContainer);
        requestDomainRedraw(true);
    });
}

function resizePlotly(plotlyDiv, label = 'Plotly surface') {
    if (!plotlyDiv || !globalThis.Plotly?.Plots?.resize) return false;

    try {
        globalThis.Plotly.Plots.resize(plotlyDiv);
        return true;
    } catch (error) {
        console.error(`Error resizing ${label}:`, error);
        return false;
    }
}

function attemptPlotlyResize(plotlyDiv, maxAttempts = 3, delay = 100, currentAttempt = 1) {
    if (!plotlyDiv) return;

    if (plotlyDiv.offsetWidth > 0 && plotlyDiv.offsetHeight > 0) {
        resizePlotly(plotlyDiv, `Plotly container ${plotlyDiv.id || ''}`);
        return;
    }

    if (currentAttempt >= maxAttempts) {
        console.warn(`Plotly container ${plotlyDiv.id} still has zero dimensions after ${maxAttempts} attempts.`);
        return;
    }

    setTimeout(() => attemptPlotlyResize(plotlyDiv, maxAttempts, delay, currentAttempt + 1), delay);
}

function sphereParams(planeType) {
    return planeType === 'z' ? sphereViewParams.z : sphereViewParams.w;
}

function canvasFor(planeType) {
    return planeType === 'z' ? zCanvas : wCanvas;
}

function mapSphereCanvasToWorldCoords(cX, cY, cSP) {
    const rotX = cSP.rotX;
    const rotY = cSP.rotY;
    const sCX = cSP.centerX;
    const sCY = cSP.centerY;
    const sR = cSP.radius;
    if (sR === 0) return { re: NaN, im: NaN };
    
    const x1 = (cX - sCX) / sR;
    const y1 = (sCY - cY) / sR;
    
    const cY_cos = Math.cos(rotY), sY_sin = Math.sin(rotY);
    const cX_cos = Math.cos(rotX), sX_sin = Math.sin(rotX);
    
    const denom = cX_cos * cY_cos;
    if (Math.abs(denom) < 1e-5) {
        return { re: NaN, im: NaN };
    }
    
    const t = (x1 * sY_sin - y1 * sX_sin * cY_cos) / denom;
    
    const p3D_rot = { x: x1, y: y1, z: t };
    const p3D_world = inverseRotate3D(p3D_rot, rotX, rotY);
    
    return { re: p3D_world.x, im: p3D_world.y };
}

function handleSphereMouseDown(event, planeType) {
    const params = sphereParams(planeType);
    if (!isSphereInteractionActive(planeType === 'z')) return;

    const canvas = canvasFor(planeType);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cX = event.clientX - rect.left;
    const cY = event.clientY - rect.top;

    params.dragging = true;
    params.lastMouseX = event.clientX;
    params.lastMouseY = event.clientY;
    canvas.style.cursor = 'grabbing';
}

function handleSphereMouseMove(event, planeType) {
    const params = sphereParams(planeType);
    if (!isSphereInteractionActive(planeType === 'z')) return;

    const canvas = canvasFor(planeType);
    if (!canvas) return;

    if (params.dragging) {
        params.rotY += (event.clientX - params.lastMouseX) * SPHERE_SENSITIVITY;
        params.rotX += (event.clientY - params.lastMouseY) * SPHERE_SENSITIVITY;
        params.lastMouseX = event.clientX;
        params.lastMouseY = event.clientY;
        requestDomainRedraw(true);
        return;
    }
}

function handleSphereMouseUp(planeType) {
    const params = sphereParams(planeType);
    
    if (planeType === 'z') {
        context.draggingProbeOnSphere = false;
    }
    
    if (!isSphereInteractionActive(planeType === 'z') && !params.dragging) return;

    params.dragging = false;
    const canvas = canvasFor(planeType);
    if (canvas) {
        canvas.style.cursor = 'crosshair';
    }
}

function fullscreenTarget(planeType, index = 0) {
    const isZ = planeType === 'z';
    if (isZ) {
        return {
            isZ: true,
            isPlotly: false,
            element: controls.zCanvasWrapper || zCanvas,
            card: controls.zCanvasCard
        };
    }

    const canvas = (context.wCanvasList && context.wCanvasList[index]) || wCanvas;
    const card = index === 0 ? controls.wCanvasCard : document.getElementById(`w_plane_column_${index}`);
    const plotly = (context.wPlanePlotlyContainersList && context.wPlanePlotlyContainersList[index]) || controls.wPlanePlotlyContainer;
    const surface = state.riemannSurfaceEnabled ? getRiemannSurfaceCanvas(canvas) : null;
    const isPlotly = state.plotly3DEnabled && state.riemannSphereViewEnabled && plotly;

    let element = surface || (isPlotly ? plotly : canvas);
    if (!surface && !isPlotly) {
        if (index === 0 && controls.wCanvasWrapper) {
            element = controls.wCanvasWrapper;
        } else if (canvas && canvas.parentElement) {
            element = canvas.parentElement;
        }
    }

    return {
        isZ: false,
        isPlotly,
        element,
        card,
        canvas
    };
}

function saveFullscreenOrigin(isZ, element, index = 0) {
    const prefix = isZ ? 'Z' : `W_${index}`;
    state[`original${prefix}Parent`] = element.parentElement;
    state[`original${prefix}Style`] = { width: element.style.width, height: element.style.height };
}

function restoreFullscreenOrigin(isZ, element, card, index = 0) {
    const prefix = isZ ? 'Z' : `W_${index}`;
    const parent = state[`original${prefix}Parent`];
    const style = state[`original${prefix}Style`];

    if (parent) {
        parent.appendChild(element);
        element.style.width = style?.width || '';
        element.style.height = style?.height || '';
        return;
    }

    const fallback = card && card.querySelector('div');
    if (fallback) fallback.appendChild(element);
}

function setPlaneFullscreen(isZ, value, index = 0) {
    if (isZ) {
        state.isZFullScreen = value;
    } else {
        state.isWFullScreen = value;
        state.fullscreenWIndex = value ? index : 0;
    }
}

function isPlaneFullscreen(isZ) {
    return isZ ? state.isZFullScreen : state.isWFullScreen;
}

function handleFullScreenToggle(planeType, index = 0) {
    const target = fullscreenTarget(planeType, index);
    const shell = controls.fullscreenContainer;

    if (!target.element || !shell) {
        console.error('Fullscreen target element not found for plane:', planeType, 'index:', index);
        return;
    }

    setPlaneFullscreen(target.isZ, !isPlaneFullscreen(target.isZ), index);
    const entering = isPlaneFullscreen(target.isZ);

    if (entering) {
        saveFullscreenOrigin(target.isZ, target.element, index);
        setStyles(shell, fullscreenStyles('var(--color-background-dark)'));
        attachCloseButton(shell, () => handleFullScreenToggle(planeType, index));
        shell.appendChild(target.element);
        document.body.appendChild(shell);
        shell.classList.remove('hidden');
        if (target.card) target.card.classList.add('hidden-visually');
        setStyles(target.element, { width: '100%', height: '100%' });

        if (target.isPlotly && target.canvas) target.canvas.classList.add('hidden');
        if (!target.isZ && controls.laplaceWindingSyncBtn && index === 0) {
            shell.appendChild(controls.laplaceWindingSyncBtn);
            setStyles(controls.laplaceWindingSyncBtn, { top: '50px', right: '20px' });
        }
    } else {
        restoreFullscreenOrigin(target.isZ, target.element, target.card, index);
        resetFullscreenShell(shell);
        if (target.card) target.card.classList.remove('hidden-visually');
        if (target.isPlotly && target.canvas) target.canvas.classList.remove('hidden');

        if (!target.isZ && controls.laplaceWindingSyncBtn && state.originalWParent && index === 0) {
            state.originalWParent.appendChild(controls.laplaceWindingSyncBtn);
            setStyles(controls.laplaceWindingSyncBtn, { top: '8px', right: '8px' });
        }
    }

    setupVisualParameters(true, true);

    if (target.isPlotly) {
        laterFrame(() => {
            if (entering) {
                target.element.classList.remove('hidden');
                setStyles(target.element, { width: '100%', height: '100%' });
                attemptPlotlyResize(target.element, 5, 150);
            } else {
                attemptPlotlyResize(target.element, 3, 100);
            }
        }, entering ? 100 : 50);
    }

    requestDomainRedraw(true);
}

function bindAlgebraicChainingControls() {
    bindElementListener(controls.enableAlgebraicChainingCb, 'change', event => {
        state.algebraicChainingEnabled = event.target.checked;
        state.fractalOrbitColoringEnabled = false;
        state.currentFunctionPreset = null;
        display(controls.algebraicChainingControlsContainer, state.algebraicChainingEnabled);

        state.currentFunction = state.algebraicChainingEnabled ? 'algebraic_chaining' : 'cos';
        setActiveFunctionButton(state.currentFunction);

        if (state.algebraicChainingEnabled) renderAlgebraicChainingTerms();

        updateTitlesAndGlobalUI();
        syncParameterControlsPanelVisibility();
        requestDomainRedraw(true);
    });

    bindElementListener(controls.addAlgebraicTermBtn, 'click', () => {
        algebraicTerms().push(createAlgebraicTerm());
        renderAlgebraicChainingTerms();
        updateTitlesAndGlobalUI();
        syncParameterControlsPanelVisibility();
        requestDomainRedraw(true);
    });
}

function createAlgebraicFactor(func = 'cos') {
    return { func, chainedFunc: 'none', power: 1.0, reciprocal: false, log: false, exp: false };
}

function createAlgebraicTerm() {
    return { coeff: { re: 1.0, im: 0.0 }, factors: [createAlgebraicFactor()] };
}

function normalizeAlgebraicFactor(factor) {
    const normalized = factor && typeof factor === 'object' ? factor : createAlgebraicFactor();
    normalized.func ??= 'cos';
    normalized.chainedFunc ??= 'none';
    normalized.power ??= 1.0;
    normalized.reciprocal = Boolean(normalized.reciprocal);
    normalized.log = Boolean(normalized.log);
    normalized.exp = Boolean(normalized.exp);
    return normalized;
}

function normalizeAlgebraicTerm(term) {
    const normalized = term && typeof term === 'object' ? term : createAlgebraicTerm();
    normalized.coeff ||= { re: 1.0, im: 0.0 };
    normalized.coeff.re = Number(normalized.coeff.re) || 0;
    normalized.coeff.im = Number(normalized.coeff.im) || 0;
    normalized.factors = toArray(normalized.factors).map(normalizeAlgebraicFactor);
    if (normalized.factors.length === 0) normalized.factors = [createAlgebraicFactor()];
    return normalized;
}

function algebraicTerms() {
    if (!Array.isArray(state.algebraicChainingTerms) || state.algebraicChainingTerms.length === 0) {
        state.algebraicChainingTerms = [createAlgebraicTerm()];
    }

    state.algebraicChainingTerms = state.algebraicChainingTerms.map(normalizeAlgebraicTerm);
    return state.algebraicChainingTerms;
}

function nearZero(value) {
    return Math.abs(value) < 1e-9;
}

function coefficientText(term) {
    const re = Number(term.coeff.re) || 0;
    const im = Number(term.coeff.im) || 0;
    const hasFactors = toArray(term.factors).some(factor => factor.func && factor.func !== 'none');

    if (nearZero(re) && nearZero(im)) return '0';
    if (nearZero(im)) {
        if (hasFactors && nearZero(re - 1)) return '';
        if (hasFactors && nearZero(re + 1)) return '-';
        return re.toFixed(1);
    }

    const reText = nearZero(re) ? '' : re.toFixed(1);
    const sign = im >= 0 ? '+' : '-';
    const imMagnitude = Math.abs(im);
    const imText = nearZero(imMagnitude - 1) ? 'i' : `${imMagnitude.toFixed(1)}i`;

    return reText === '' ? (im >= 0 ? imText : `-${imText}`) : `(${reText}${sign}${imText})`;
}

function algebraicSymbol(func) {
    return ALGEBRAIC_SYMBOLS.get(func) || func;
}

function factorText(factor) {
    let text = factor.func === 'c'
        ? 'c'
        : factor.chainedFunc && factor.chainedFunc !== 'none'
            ? `${algebraicSymbol(factor.func)}(${algebraicSymbol(factor.chainedFunc)}(z))`
            : `${algebraicSymbol(factor.func)}(z)`;

    if (factor.power !== undefined && factor.power !== 1) text = `(${text})^${Number(factor.power).toFixed(1)}`;
    if (factor.reciprocal) text = `1/(${text})`;
    if (factor.log) text = `ln(${text})`;
    if (factor.exp) text = `e^(${text})`;
    return text;
}

function termPreview(term) {
    const coeff = coefficientText(term);
    if (coeff === '0') return '0';

    const factors = toArray(term.factors)
        .filter(factor => factor.func && factor.func !== 'none')
        .map(factorText);

    if (factors.length === 0) return coeff === '' ? '1' : coeff;

    const product = factors.join('·');
    if (coeff === '') return product;
    if (coeff === '-') return `-${product}`;
    return `${coeff}·${product}`;
}

function algebraicRange(label, value, onInput) {
    const valueNode = h('span', { className: 'algebraic-slider-value', text: Number(value).toFixed(1) });
    const slider = h('input', { type: 'range' });

    Object.assign(slider, { min: '-5', max: '5', step: '0.1', value });
    slider.addEventListener('input', event => {
        const next = parseFloat(event.target.value);
        valueNode.textContent = next.toFixed(1);
        onInput(next);
    });

    return h('div', { className: 'algebraic-slider-row' }, [
        h('label', { className: 'algebraic-slider-label' }, [label, valueNode]),
        h('div', { className: 'algebraic-slider-container' }, [slider])
    ]);
}

function refreshAlgebraicFormula(preview, term) {
    if (preview) preview.textContent = termPreview(term);
    updateTitlesAndGlobalUI();
    requestDomainRedraw(true);
}

function trimFactors(factors) {
    const stop = factors.findIndex(factor => factor.func === 'none');
    return stop < 0 ? factors : factors.slice(0, stop + 1);
}

function setFactorFunction(term, index, func) {
    if (index < term.factors.length) term.factors[index].func = func;
    else term.factors.push(createAlgebraicFactor(func));
    if (func === 'c') term.factors[index].chainedFunc = 'none';

    term.factors = trimFactors(term.factors);
}

function renderAlgebraicHeader(term, termIndex) {
    const header = h('div', { className: 'algebraic-term-header' }, [
        h('div', { className: 'algebraic-term-title-wrapper' }, [
            h('span', { className: 'algebraic-term-title', text: `Term ${termIndex + 1}` }),
            h('div', { className: 'algebraic-term-formula', text: termPreview(term) })
        ])
    ]);

    if (algebraicTerms().length > 1) {
        const remove = h('button', { type: 'button', className: 'algebraic-term-remove-btn', text: '✕ Remove' });
        remove.addEventListener('click', () => {
            state.algebraicChainingTerms.splice(termIndex, 1);
            renderAlgebraicChainingTerms();
            updateTitlesAndGlobalUI();
            syncParameterControlsPanelVisibility();
            requestDomainRedraw(true);
        });
        header.appendChild(remove);
    }

    return header;
}

function renderCoefficientControls(term, preview) {
    return h('div', { className: 'algebraic-coeff-grid' }, [
        algebraicRange('Re coeff ', term.coeff.re, value => {
            term.coeff.re = value;
            refreshAlgebraicFormula(preview, term);
        }),
        algebraicRange('Im coeff ', term.coeff.im, value => {
            term.coeff.im = value;
            refreshAlgebraicFormula(preview, term);
        })
    ]);
}

function visibleFactors(term) {
    const factors = term.factors.slice();
    if (factors.length < 5 && (factors.length === 0 || factors.at(-1).func !== 'none')) {
        factors.push(createAlgebraicFactor('none'));
    }
    return factors;
}

function modifierCheckbox(factor, key, label, onChange) {
    const checkbox = h('input', { type: 'checkbox' });
    checkbox.checked = Boolean(factor[key]);
    checkbox.addEventListener('change', event => {
        factor[key] = event.target.checked;
        onChange();
    });

    return h('label', { className: 'algebraic-checkbox-label' }, [
        checkbox,
        h('span', { className: 'custom-checkbox-visual' }),
        label
    ]);
}

function renderFactorDetails(term, factor, preview) {
    const rows = [];

    if (factor.func !== 'c') {
        rows.push(h('div', { className: 'algebraic-factor-detail-row' }, [
            h('span', { className: 'algebraic-factor-label', text: 'Chain f(g(z))' }),
            select(ALGEBRAIC_FUNCTION_OPTIONS, factor.chainedFunc, event => {
                factor.chainedFunc = event.target.value;
                refreshAlgebraicFormula(preview, term);
                syncParameterControlsPanelVisibility();
            })
        ]));
    }

    rows.push(
        algebraicRange('Power ', factor.power === undefined ? 1.0 : factor.power, value => {
            factor.power = value;
            refreshAlgebraicFormula(preview, term);
        }),
        h('div', { className: 'algebraic-checkbox-row' }, [
            modifierCheckbox(factor, 'reciprocal', '1/f', () => refreshAlgebraicFormula(preview, term)),
            modifierCheckbox(factor, 'log', 'ln(f)', () => refreshAlgebraicFormula(preview, term)),
            modifierCheckbox(factor, 'exp', 'e^f', () => refreshAlgebraicFormula(preview, term))
        ])
    );

    return h('div', { className: 'algebraic-factor-details' }, rows);
}

function renderFactor(term, factor, index, preview) {
    const card = h('div', { className: 'algebraic-factor-card' }, [
        h('div', { className: 'algebraic-factor-main-row' }, [
            h('span', { className: 'algebraic-factor-label', text: `Factor ${index + 1}` }),
            select(ALGEBRAIC_FUNCTION_OPTIONS, factor.func, event => {
                setFactorFunction(term, index, event.target.value);
                renderAlgebraicChainingTerms();
                updateTitlesAndGlobalUI();
                syncParameterControlsPanelVisibility();
                requestDomainRedraw(true);
            })
        ])
    ]);

    if (factor.func !== 'none') card.appendChild(renderFactorDetails(term, factor, preview));
    return card;
}

function renderFactors(term, preview) {
    return h('div', { className: 'algebraic-factors-container' }, [
        h('div', { className: 'algebraic-factors-title', text: 'Factors' }),
        ...visibleFactors(term).map((factor, index) => renderFactor(term, factor, index, preview))
    ]);
}

function renderAlgebraicChainingTerms() {
    if (!controls.algebraicTermsList) return;

    controls.algebraicTermsList.innerHTML = '';
    algebraicTerms().forEach((term, index) => {
        const header = renderAlgebraicHeader(term, index);
        const preview = header.querySelector('.algebraic-term-formula');

        controls.algebraicTermsList.appendChild(h('div', { className: 'algebraic-term-card' }, [
            header,
            renderCoefficientControls(term, preview),
            renderFactors(term, preview)
        ]));
    });
}
