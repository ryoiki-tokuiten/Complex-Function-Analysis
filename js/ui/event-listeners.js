import { state, context, zPlaneParams, wPlaneParams, wPlaneInitialRanges, sphereViewParams, sliderParamKeys } from '../store/state.js';
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
import { updateTitlesAndGlobalUI, syncTaylorSeriesCenterStatus, updateDomainColoringKey, syncParameterControlsPanelVisibility, syncRiemannTransformationUI, updateCustomFormulaPreview } from './ui-updates.js';
import { stopLaplaceAnimation, toggleLaplaceAnimation, resetLaplaceAnimation, showFullLaplaceSpiral } from '../rendering/laplace-animation.js';
import { toggleRiemannTransformationAnimationZ, toggleRiemannTransformationAnimationW, syncRiemannTransformationPlayPauseButton } from '../rendering/riemann-transformation-animation.js';
import { setNavigationModeEnabled, followNavigationViewports, resetNavigationVehicle, setNavigationKey, stopNavigationLoop, initializeNavigationStateFromControls } from '../navigation-plane.js';
import { toggleAnimation } from './animation.js';
import { initializePolynomialCoeffs, generatePolynomialCoeffSliders } from './polynomial-ui.js';
import { updateLaplace3DSurface, resizeLaplace3DSurface } from '../rendering/laplace-3d-surface.js';
import { getRiemannSurfaceCanvas, resetRiemannSurfaceViews } from '../rendering/webgl-riemann-surface.js';
import { applyTheme, renderThemesList, renderDomainPalettesUI, domainPalettes, renderRealPlotsPalettesUI, realPlotsPalettes } from './theme-manager.js';
import { applyFractalPreset, isFractalPresetKey } from '../analysis/fractal-presets.js';
import {
    initializeDynamicPlottingUI,
    syncDynamicPlottingUI
} from './dynamic-plotting-ui.js';
import { domainColorForValue } from '../rendering/domain-coloring.js';
import { resolveActiveMap } from '../math/active-map.js';
import {
    generateTissotIndicatrices,
    selectStableTissotIndicatrices,
    getTissotViewportBounds
} from '../analysis/tissot.js';
import { drawRealPlot, disposeRealPlotsRenderer } from '../rendering/real-plots-renderer.js';

const { controls = {} } = context;

let zCanvas;
let wCanvas;
let uiEventListenersBound = false;
let transformViewportSnapshot = null;

const COMPLEX_PARTS = ['re', 'im'];
const MOBIUS_PARAMS = ['A', 'B', 'C', 'D'];

const DOMAIN_DIRTY_STATE_KEYS = new Set([
    'a0', 'b0', 'circleR', 'ellipseA', 'ellipseB', 'hyperbolaA', 'hyperbolaB',
    'stripY1', 'stripY2', 'sectorAngle1', 'sectorAngle2', 'sectorRMin', 'sectorRMax',
    'imageSize', 'imageOpacity', 'videoSize', 'videoOpacity', 'vectorFieldScale',
    'zPlaneZoom', 'wPlaneZoom', 'fractionalPowerN', 'threeSphereOpacity', 'sphereGridOpacity'
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
    ['threeSphereOpacitySlider', 'threeSphereOpacity'],
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
    ['enableThreeSphereCb', 'threeSphereEnabled'],
    ['enableRiemannTransformationCb', 'riemannTransformationEnabled'],
    ['enableTaylorSeriesCb', 'taylorSeriesEnabled'],
    ['enableTaylorSeriesCustomCenterCb', 'taylorSeriesCustomCenterEnabled'],
    ['laplaceShowROCCb', 'laplaceShowROC'],
    ['laplaceShowPolesZerosCb', 'laplaceShowPolesZeros'],
    ['laplaceShowFourierLineCb', 'laplaceShowFourierLine'],
    ['laplaceAnimationLoopCb', 'laplaceAnimationLoop'],
    ['enableParticleAnimationCb', 'particleAnimationEnabled'],
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
    'enableThreeSphereCb', 'enableTaylorSeriesCb', 'enableTaylorSeriesCustomCenterCb',
    'laplaceShowROCCb', 'laplaceShowPolesZerosCb',
    'laplaceShowFourierLineCb', 'laplaceAnimationLoopCb', 'enableParticleAnimationCb',
    'enableDomainColoringCb'
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
    bindDerivativeControls,
    bindConformalGridControls,
    bindDomainColoringControls,
    bindViewControls,
    bindNavigationControls,
    bindVectorFieldControls,
    bindTaylorControls,
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
    bindThemeControls,
    bindDomainPaletteCirclePanelListeners,
    bindRealPlotsPaletteCirclePanelListeners,
    bindRealPlotsControls
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

    // Also update domain coloring guide panel if open
    const panel = $('domain_palette_circle_panel');
    if (panel && !panel.classList.contains('hidden')) {
        if (typeof updateDomainPaletteCirclePanel === 'function') {
            updateDomainPaletteCirclePanel();
        }
    }
}

export function syncLaplacePlayPauseButton() {
    if (controls.laplacePlayPauseBtn) {
        controls.laplacePlayPauseBtn.innerHTML = state.laplaceAnimationPlaying ? '⏸ Pause' : '▶ Play';
    }
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
    syncLaplacePlayPauseButton();
}

function disableAlgebraicChaining() {
    if (!state.algebraicChainingEnabled) return;

    state.algebraicChainingEnabled = false;
    checked('enableAlgebraicChainingCb', false);
    display(controls.algebraicChainingControlsContainer, false);
}

function disableOutputChaining() {
    if (!state.chainingEnabled) return;

    state.chainingEnabled = false;
    checked('enableChainingCb', false);
    display(controls.chainingControlsContainer, false);
    call(updateChainingColumns, 1);
}

function disableRealPlots() {
    if (!state.realPlotsEnabled) return;
    state.realPlotsEnabled = false;
    checked('enableRealPlotsCb', false);
    hidden(controls.realPlotsControlsContainer, true);

    const dynamicParams = document.getElementById('dynamic_plotting_params');
    const algParams = document.getElementById('algebraic_chaining_params');
    const chainParams = document.getElementById('chaining_params');
    if (dynamicParams && algParams && chainParams) {
        dynamicParams.parentNode.insertBefore(chainParams, dynamicParams);
        dynamicParams.parentNode.insertBefore(algParams, dynamicParams);
    }

    if (controls.zCanvasCard) controls.zCanvasCard.classList.remove('hidden');
    if (controls.wCanvasCard) controls.wCanvasCard.classList.remove('hidden');
    const refreshPlanes = () => {
        setupVisualParameters(false, false);
        requestRedrawAll();
    };
    requestAnimationFrame(() => {
        refreshPlanes();
        setTimeout(refreshPlanes, 360);
    });
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
    const leavingTransform = state.fourierModeEnabled || state.laplaceModeEnabled;
    if (state.laplaceModeEnabled) call(stopLaplaceAnimation);

    const preset = applyFractalPreset(state, key);
    if (!preset) return false;

    if (leavingTransform) restoreNormalViewports();
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

function setPlaneViewport(planeParams, xRange, yRange) {
    const xSpan = Math.max(1e-6, xRange[1] - xRange[0]);
    const ySpan = Math.max(1e-6, yRange[1] - yRange[0]);
    const scale = Math.min(planeParams.width / xSpan, planeParams.height / ySpan);
    const centerX = (xRange[0] + xRange[1]) * 0.5;
    const centerY = (yRange[0] + yRange[1]) * 0.5;
    const targetXRange = planeParams.currentVisXRange || planeParams.xRange;
    const targetYRange = planeParams.currentVisYRange || planeParams.yRange;

    targetXRange[0] = xRange[0];
    targetXRange[1] = xRange[1];
    targetYRange[0] = yRange[0];
    targetYRange[1] = yRange[1];
    planeParams.scale.x = planeParams.scale.y = scale;
    planeParams.origin.x = planeParams.width * 0.5 - centerX * scale;
    planeParams.origin.y = planeParams.height * 0.5 + centerY * scale;
    updatePlaneViewportRanges(planeParams);
}

function copyRange(range) {
    return Array.isArray(range) ? [...range] : null;
}

function snapshotNormalViewports() {
    if (transformViewportSnapshot) return;

    transformViewportSnapshot = {
        z: {
            xRange: copyRange(zPlaneParams.currentVisXRange),
            yRange: copyRange(zPlaneParams.currentVisYRange)
        },
        w: {
            xRange: copyRange(wPlaneParams.xRange),
            yRange: copyRange(wPlaneParams.yRange)
        },
        zZoom: state.zPlaneZoom,
        wZoom: state.wPlaneZoom
    };
}

function restoreNormalViewports() {
    const snapshot = transformViewportSnapshot;
    transformViewportSnapshot = null;
    if (!snapshot) return;

    if (snapshot.z.xRange && snapshot.z.yRange) {
        zPlaneParams.currentVisXRange.splice(0, 2, ...snapshot.z.xRange);
        zPlaneParams.currentVisYRange.splice(0, 2, ...snapshot.z.yRange);
    }
    if (snapshot.w.xRange && snapshot.w.yRange) {
        wPlaneParams.xRange.splice(0, 2, ...snapshot.w.xRange);
        wPlaneParams.yRange.splice(0, 2, ...snapshot.w.yRange);
    }

    state.zPlaneZoom = snapshot.zZoom;
    state.wPlaneZoom = snapshot.wZoom;
    if (controls.zPlaneZoomSlider) controls.zPlaneZoomSlider.value = String(Math.log10(snapshot.zZoom || 1));
    if (controls.wPlaneZoomSlider) controls.wPlaneZoomSlider.value = String(Math.log10(snapshot.wZoom || 1));
}

function fitTransformViewports() {
    const signal = state.fourierModeEnabled
        ? state.fourierTimeDomainSignal
        : state.laplaceTimeDomainSignal;
    if (!signal?.length) return;

    setupVisualParameters(false, false);
    const timeWindow = Math.max(1, signal.at(-1)?.t || state.fourierTimeWindow || 5);
    const amplitude = Math.max(1, ...signal.map(point => Math.abs(point.value)));
    const timePadding = Math.max(0.25, timeWindow * 0.06);
    const amplitudePadding = Math.max(0.35, amplitude * 0.24);

    setPlaneViewport(
        zPlaneParams,
        [-timePadding, timeWindow + timePadding],
        [-amplitude - amplitudePadding, amplitude + amplitudePadding]
    );

    let windingRadius = amplitude * 1.35;
    if (state.laplaceModeEnabled) {
        const dt = signal.length > 1 ? signal[1].t - signal[0].t : 0.01;
        let sumRe = 0;
        let sumIm = 0;
        signal.forEach(point => {
            const weight = Math.exp(-(state.laplaceSigma || 0) * point.t);
            const angle = -(state.laplaceOmega || 1) * point.t;
            const re = point.value * weight * Math.cos(angle);
            const im = point.value * weight * Math.sin(angle);
            sumRe += re * dt;
            sumIm += im * dt;
            windingRadius = Math.max(windingRadius, Math.hypot(re, im), Math.hypot(sumRe, sumIm));
        });
    }
    windingRadius = Math.max(1, windingRadius * 1.35);
    setPlaneViewport(wPlaneParams, [-windingRadius, windingRadius], [-windingRadius, windingRadius]);

    state.zPlaneZoom = 1;
    state.wPlaneZoom = 1;
    if (controls.zPlaneZoomSlider) controls.zPlaneZoomSlider.value = '0';
    if (controls.wPlaneZoomSlider) controls.wPlaneZoomSlider.value = '0';
}

function activateFunctionMode(key) {
    disableRealPlots();
    if (isFractalPresetKey(key) && activateFractalPreset(key)) return;

    const enteringFourier = key === 'fourier';
    const enteringLaplace = key === 'laplace';
    const enteringTransform = enteringFourier || enteringLaplace;
    const leavingTransform = (state.fourierModeEnabled || state.laplaceModeEnabled) && !enteringTransform;

    if (state.laplaceModeEnabled && !enteringLaplace) call(stopLaplaceAnimation);
    if (enteringTransform && state.currentInputShape === 'video') call(pauseUploadedVideoPlayback);

    if (enteringTransform) snapshotNormalViewports();

    disableAlgebraicChaining();
    disableOutputChaining();

    state.currentFunction = key;
    state.currentFunctionPreset = null;
    state.fractalOrbitColoringEnabled = false;
    state.fourierModeEnabled = enteringFourier;
    state.laplaceModeEnabled = enteringLaplace;

    if (enteringTransform && state.navigationModeEnabled) call(setNavigationModeEnabled, false);
    if (enteringFourier) call(updateFourierTransform);

    if (enteringLaplace) {
        call(updateLaplaceTransform);
        call(showFullLaplaceSpiral);
    }

    if (enteringTransform) fitTransformViewports();
    else if (leavingTransform) restoreNormalViewports();

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

    // Also update domain coloring guide panel if open
    const panel = $('domain_palette_circle_panel');
    if (panel && !panel.classList.contains('hidden')) {
        if (typeof updateDomainPaletteCirclePanel === 'function') {
            updateDomainPaletteCirclePanel();
        }
    }
}

function bindDomainColoringControls() {
    bindCheckbox('enableDomainColoringCb', 'domainColoringEnabled', () => {
        if (state.domainColoringEnabled) {
            if (state.riemannTransformationEnabled) {
                state.riemannTransformationEnabled = false;
                checked('enableRiemannTransformationCb', false);
                call(syncRiemannTransformationUI);
            }
            if (state.currentInputShape !== 'empty_grid') {
                if (state.currentInputShape === 'video' && state.videoIsPlaying) {
                    call(pauseUploadedVideoPlayback);
                }
                state.currentInputShape = 'empty_grid';
                if (controls.inputShapeSelector) controls.inputShapeSelector.value = 'empty_grid';
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

function bindDerivativeControls() {
    if (controls.enableDerivativeCb) {
        controls.enableDerivativeCb.checked = state.mapPresentation === 'derivative';
    }

    bindElementListener(controls.enableDerivativeCb, 'change', event => {
        state.mapPresentation = event.target.checked ? 'derivative' : 'function';
        context.domainColoringDirty = true;
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestRedrawAll();
    });
}

function fitConformalGridOutputViewport() {
    const indicatrices = selectStableTissotIndicatrices(generateTissotIndicatrices(
        resolveActiveMap(),
        zPlaneParams.currentVisXRange,
        zPlaneParams.currentVisYRange,
        state.gridDensity,
        72
    ));
    const bounds = getTissotViewportBounds(indicatrices);
    if (!bounds) return;

    setPlaneViewport(wPlaneParams, bounds.xRange, bounds.yRange);

    const span = Math.max(
        bounds.xRange[1] - bounds.xRange[0],
        bounds.yRange[1] - bounds.yRange[0]
    );
    const initialSpan = Math.max(
        wPlaneInitialRanges.x[1] - wPlaneInitialRanges.x[0],
        wPlaneInitialRanges.y[1] - wPlaneInitialRanges.y[0]
    );
    state.wPlaneZoom = clamp(initialSpan / span, MIN_STATE_ZOOM_LEVEL, MAX_STATE_ZOOM_LEVEL);
    if (controls.wPlaneZoomSlider) {
        controls.wPlaneZoomSlider.value = String(Math.log10(state.wPlaneZoom));
    }
}

function bindConformalGridControls() {
    bindCheckbox('enableConformalGridCb', 'conformalGridEnabled', () => {
        if (state.conformalGridEnabled) {
            if (state.currentInputShape === 'video' && state.videoIsPlaying) {
                call(pauseUploadedVideoPlayback);
            }
            state.currentInputShape = 'empty_grid';
            if (controls.inputShapeSelector) controls.inputShapeSelector.value = 'empty_grid';
            fitConformalGridOutputViewport();
            call(updateTitlesAndGlobalUI);
        }
        requestRedrawAll();
    });
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
    ].forEach(([controlKey, stateKey, args]) => bindSlider(controlKey, stateKey, (val) => Math.pow(10, parseFloat(val)), () => {
        setupVisualParameters(...args);
        requestDomainRedraw(true);
    }));

    bindCheckbox('enableRiemannSphereCb', 'riemannSphereViewEnabled', () => {
        if (state.riemannSphereViewEnabled) {
            if (state.riemannSurfaceEnabled) disableRiemannSurface();
            
            if (!state.threeSphereEnabled) {
                state.threeSphereEnabled = true;
                checked('enableThreeSphereCb', true);
                hidden(controls.threeSphereOptionsDiv, false);
            }
            if (!state.splitViewEnabled) {
                state.splitViewEnabled = true;
                checked('enableSplitViewCb', true);
            }
        } else {
            state.riemannTransformationEnabled = false;
            checked('enableRiemannTransformationCb', false);
            hidden(controls.threeSphereOptionsDiv, true);
        }
        hidden(controls.riemannSphereOptionsDiv, !state.riemannSphereViewEnabled);
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    bindCheckbox('enableThreeSphereCb', 'threeSphereEnabled', () => {
        if (state.threeSphereEnabled) {
            if (state.riemannTransformationEnabled) {
                state.riemannTransformationEnabled = false;
                checked('enableRiemannTransformationCb', false);
                call(syncRiemannTransformationUI);
            }
        }
        hidden(controls.threeSphereOptionsDiv, !state.threeSphereEnabled);
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
            if (state.threeSphereEnabled) {
                state.threeSphereEnabled = false;
                checked('enableThreeSphereCb', false);
                hidden(controls.threeSphereOptionsDiv, true);
            }
        }
        call(syncRiemannTransformationUI);
        call(updateChainingTitles);
        requestDomainRedraw(true);
    });

    bindCheckbox('enableRiemannSurfaceCb', 'riemannSurfaceEnabled', () => {
        if (state.riemannSurfaceEnabled) {
            Object.assign(state, { riemannSphereViewEnabled: false, riemannTransformationEnabled: false, splitViewEnabled: false, threeSphereEnabled: false });
            ['enableRiemannSphereCb', 'enableRiemannTransformationCb', 'enableSplitViewCb', 'enableThreeSphereCb'].forEach(key => checked(key, false));
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

        const result = findPolesZeros(state.laplaceFunction || 'exponential', {
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

function handleCanvasDown(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

    const pos = mouse(ctx.canvas, event);
    if (event.button !== 0) return;
    startPan(ctx, pos);
}

function handleCanvasUp(ctx, event) {
    if (isSphereInteractionActive(ctx.isZ)) return;

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

    laterFrame(() => resizeLaplace3DSurface(container3d), state.isLaplace3DFullScreen ? 150 : 100);
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
    setTimeout(refresh, 50);
    setTimeout(refresh, 150);
    setTimeout(refresh, 280);
    setTimeout(refresh, 350);
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

    const verticalLayoutCb = $('enable_vertical_layout_cb');
    if (verticalLayoutCb) {
        if (state.verticalLayoutEnabled === undefined) {
            state.verticalLayoutEnabled = localStorage.getItem('complex_verticalLayoutEnabled') === 'true';
        }
        verticalLayoutCb.checked = state.verticalLayoutEnabled;
        document.body.classList.toggle('vertical-layout', state.verticalLayoutEnabled);

        const triggerResize = () => window.dispatchEvent(new Event('resize'));
        if (state.verticalLayoutEnabled) {
            setTimeout(triggerResize, 50);
            setTimeout(triggerResize, 150);
        }
        
        bindElementListener(verticalLayoutCb, 'change', event => {
            state.verticalLayoutEnabled = event.target.checked;
            localStorage.setItem('complex_verticalLayoutEnabled', state.verticalLayoutEnabled);
            document.body.classList.toggle('vertical-layout', state.verticalLayoutEnabled);
            
            triggerResize();
            setTimeout(triggerResize, 50);
            setTimeout(triggerResize, 150);
            setTimeout(triggerResize, 350);
        });
    }
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
            isThree: false,
            element: controls.zCanvasWrapper || zCanvas,
            card: controls.zCanvasCard
        };
    }

    const canvas = (context.wCanvasList && context.wCanvasList[index]) || wCanvas;
    const card = index === 0 ? controls.wCanvasCard : document.getElementById(`w_plane_column_${index}`);
    const threeContainer = (context.wPlaneThreeContainersList && context.wPlaneThreeContainersList[index]) || controls.wPlaneThreeContainer;
    const surface = state.riemannSurfaceEnabled ? getRiemannSurfaceCanvas(canvas) : null;
    const isThree = state.threeSphereEnabled && state.riemannSphereViewEnabled && threeContainer;

    let element = surface || (isThree ? threeContainer : canvas);
    if (!surface && !isThree) {
        if (index === 0 && controls.wCanvasWrapper) {
            element = controls.wCanvasWrapper;
        } else if (canvas && canvas.parentElement) {
            element = canvas.parentElement;
        }
    }

    return {
        isZ: false,
        isThree,
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

        if (target.isThree && target.canvas) target.canvas.classList.add('hidden');
    } else {
        restoreFullscreenOrigin(target.isZ, target.element, target.card, index);
        resetFullscreenShell(shell);
        if (target.card) target.card.classList.remove('hidden-visually');
        if (target.isThree && target.canvas) target.canvas.classList.remove('hidden');

    }

    setupVisualParameters(false, false);

    if (target.isThree) {
        laterFrame(() => {
            if (entering) {
                target.element.classList.remove('hidden');
                setStyles(target.element, { width: '100%', height: '100%' });
            }
            window.dispatchEvent(new Event('resize'));
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

    bindControlListener('algebraicChainingZInput', 'input', () => {
        const val = controls.algebraicChainingZInput?.value || 'z';
        state.algebraicChainingZExpr = val;
        updateCustomFormulaPreview(controls.algebraicChainingZInput, controls.algebraicChainingZMath);
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
    const inputVar = 'z';
    let text = factor.func === 'c'
        ? 'c'
        : factor.chainedFunc && factor.chainedFunc !== 'none'
            ? `${algebraicSymbol(factor.func)}(${algebraicSymbol(factor.chainedFunc)}(${inputVar}))`
            : `${algebraicSymbol(factor.func)}(${inputVar})`;

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

    if (controls.algebraicChainingZInput && state.algebraicChainingZExpr) {
        if (controls.algebraicChainingZInput.value !== state.algebraicChainingZExpr) {
            controls.algebraicChainingZInput.value = state.algebraicChainingZExpr;
            updateCustomFormulaPreview(controls.algebraicChainingZInput, controls.algebraicChainingZMath);
        }
    }

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

export function drawDomainPaletteCircle(canvas, paletteId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const rOuter = 130;
    const rInner = 95;

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Use current state settings for preview
    const tempState = {
        domainPalette: paletteId,
        domainBrightness: state.domainBrightness,
        domainContrast: state.domainContrast,
        domainSaturation: state.domainSaturation,
        domainLightnessCycles: state.domainLightnessCycles
    };

    for (let y = 0; y < h; y++) {
        const dy = -(y - cy);
        for (let x = 0; x < w; x++) {
            const dx = x - cx;
            const r = Math.hypot(dx, dy);

            const idx = (y * w + x) * 4;

            if (r > rOuter + 1.5 || r < rInner - 1.5) {
                continue;
            }

            // Antialiasing for outer boundary
            let alpha = 255;
            if (r > rOuter - 1.5) {
                alpha = Math.max(0, Math.min(255, Math.round((rOuter + 1.5 - r) * 85)));
            } else if (r < rInner + 1.5) {
                alpha = Math.min(alpha, Math.max(0, Math.min(255, Math.round((r - (rInner - 1.5)) * 85))));
            }

            const phase = Math.atan2(dy, dx);
            
            // Just map phase to color with a fixed standard modulus of 1.0 (no magnitude cycles/shading)
            const rgb = domainColorForValue(Math.cos(phase), Math.sin(phase), {
                ...tempState,
                domainLightnessCycles: 0 // Keep ring clean
            });

            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = alpha;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw grid/lines and labels
    ctx.save();
    
    // Dashed crosshairs
    const rootStyle = getComputedStyle(document.documentElement);
    const borderColor = rootStyle.getPropertyValue('--border-color') || 'rgba(255, 255, 255, 0.15)';
    const textColor = rootStyle.getPropertyValue('--text-color') || '#FAFAFA';

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    // Horizontal line
    ctx.moveTo(cx - rOuter, cy);
    ctx.lineTo(cx + rOuter, cy);
    // Vertical line
    ctx.moveTo(cx, cy - rOuter);
    ctx.lineTo(cx, cy + rOuter);
    ctx.stroke();

    // Solid borders for ring
    ctx.setLineDash([]);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, 2 * Math.PI);
    ctx.stroke();

    // Labels: 0, π/2, π, 3π/2
    ctx.fillStyle = textColor;
    ctx.font = '500 13px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 0 (on the right)
    ctx.fillText('0', cx + rOuter + 16, cy);
    // π/2 (on the top)
    ctx.fillText('π/2', cx, cy - rOuter - 16);
    // π (on the left)
    ctx.fillText('π', cx - rOuter - 16, cy);
    // 3π/2 (on the bottom)
    ctx.fillText('3π/2', cx, cy + rOuter + 16);

    ctx.restore();
}

export function drawAmplitudeStrip(canvas, paletteId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Use current state settings for preview
    const tempState = {
        domainPalette: paletteId,
        domainBrightness: state.domainBrightness,
        domainContrast: state.domainContrast,
        domainSaturation: state.domainSaturation,
        domainLightnessCycles: state.domainLightnessCycles
    };

    // Draw a horizontal gradient representing modulus logarithmically from 0 to 10^12
    // We use a fixed phase angle of 0 (positive real numbers)
    const maxLogMod = Math.log(1e12 + 1);
    for (let x = 0; x < w; x++) {
        const logMod = (x / w) * maxLogMod;
        const modVal = Math.expm1(logMod);
        
        // Re = modVal, Im = 0
        const rgb = domainColorForValue(modVal, 0.0, tempState);

        for (let y = 0; y < h; y++) {
            const idx = (y * w + x) * 4;
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw border
    ctx.save();
    const rootStyle = getComputedStyle(document.documentElement);
    const borderColor = rootStyle.getPropertyValue('--border-color') || 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
}

export function updateDomainPaletteCirclePanel() {
    const activePalette = domainPalettes.find(p => p.id === state.domainPalette) || domainPalettes[0];
    const title = $('domain_palette_circle_title');
    if (title) title.textContent = activePalette.name;

    const canvas = $('domain_palette_circle_canvas');
    drawDomainPaletteCircle(canvas, state.domainPalette);

    const stripCanvas = $('amplitude_strip_canvas');
    drawAmplitudeStrip(stripCanvas, state.domainPalette);
}

function bindDomainPaletteCirclePanelListeners() {
    const viewBtn = $('view_palette_circle_btn');
    const closeBtn = $('close_domain_palette_circle_btn');
    const panel = $('domain_palette_circle_panel');

    if (viewBtn) {
        bindElementListener(viewBtn, 'click', () => {
            if (panel) {
                panel.classList.remove('hidden');
                updateDomainPaletteCirclePanel();
            }
        });
    }

    if (closeBtn) {
        bindElementListener(closeBtn, 'click', () => {
            if (panel) panel.classList.add('hidden');
        });
    }
}

export function drawRealPlotsPaletteCircle(canvas, paletteId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const rOuter = 130;
    const rInner = 95;

    const palette = realPlotsPalettes.find(p => p.id === paletteId) || realPlotsPalettes.find(p => p.id === 'viridis');
    if (!palette) return;
    
    // CSS gradient colors string parsing
    const colors = palette.colors.split(',').map(c => c.trim());

    // Conic gradient: createConicGradient(angle, x, y).
    // angle 0 is straight UP (12 o'clock). 
    // In our 3D math, phase -PI is at 9 o'clock.
    // To match 9 o'clock, we use angle = -Math.PI/2
    const grad = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    
    colors.forEach((color, i) => {
        const ratio = i / (colors.length - 1);
        grad.addColorStop(ratio, color);
    });

    // Draw donut
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, rInner, Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw grid/lines and labels exactly like domain coloring
    ctx.save();
    
    const rootStyle = getComputedStyle(document.documentElement);
    const borderColor = rootStyle.getPropertyValue('--border-color') || 'rgba(255, 255, 255, 0.15)';
    const textColor = rootStyle.getPropertyValue('--text-color') || '#FAFAFA';

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(cx - rOuter, cy);
    ctx.lineTo(cx + rOuter, cy);
    ctx.moveTo(cx, cy - rOuter);
    ctx.lineTo(cx, cy + rOuter);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '500 13px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('0', cx + rOuter + 16, cy);
    ctx.fillText('π/2', cx, cy - rOuter - 16);
    ctx.fillText('π', cx - rOuter - 16, cy);
    ctx.fillText('3π/2', cx, cy + rOuter + 16);

    ctx.restore();
}

export function drawRealPlotsAmplitudeStrip(canvas, paletteId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const palette = realPlotsPalettes.find(p => p.id === paletteId) || realPlotsPalettes.find(p => p.id === 'viridis');
    if (!palette) return;

    const colors = palette.colors.split(',').map(c => c.trim());
    const grad = ctx.createLinearGradient(0, 0, w, 0);

    colors.forEach((color, i) => {
        const ratio = i / (colors.length - 1);
        grad.addColorStop(ratio, color);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

export function updateRealPlotsPaletteCirclePanel() {
    const activePalette = realPlotsPalettes.find(p => p.id === state.realPlotsPalette) || realPlotsPalettes.find(p => p.id === 'viridis');
    const title = $('real_plots_palette_circle_title');
    if (title && activePalette) title.textContent = activePalette.name;

    const canvas = $('real_plots_palette_circle_canvas');
    drawRealPlotsPaletteCircle(canvas, state.realPlotsPalette);

    const stripCanvas = $('real_plots_amplitude_strip_canvas');
    drawRealPlotsAmplitudeStrip(stripCanvas, state.realPlotsPalette);
}

function bindRealPlotsPaletteCirclePanelListeners() {
    const viewBtn = $('view_real_plots_palette_circle_btn');
    const closeBtn = $('close_real_plots_palette_circle_btn');
    const panel = $('real_plots_palette_circle_panel');

    if (viewBtn) {
        bindElementListener(viewBtn, 'click', () => {
            if (panel) {
                panel.classList.remove('hidden');
                updateRealPlotsPaletteCirclePanel();
            }
        });
    }

    if (closeBtn) {
        bindElementListener(closeBtn, 'click', () => {
            if (panel) panel.classList.add('hidden');
        });
    }
}

function bindRealPlotsControls() {
    bindCheckbox('enableRealPlotsCb', 'realPlotsEnabled', (event, val) => {
        state.realPlotsEnabled = val;
        hidden(controls.realPlotsControlsContainer, !val);
        
        if (val) {
            const rpContainer = controls.realPlotsControlsContainer;
            const algParams = document.getElementById('algebraic_chaining_params');
            const chainParams = document.getElementById('chaining_params');
            if (rpContainer && algParams && chainParams) {
                rpContainer.appendChild(algParams);
                rpContainer.appendChild(chainParams);
            }

            if (controls.zCanvasCard) controls.zCanvasCard.classList.add('hidden');
            if (controls.wCanvasCard) controls.wCanvasCard.classList.add('hidden');
        } else {
            const dynamicParams = document.getElementById('dynamic_plotting_params');
            const algParams = document.getElementById('algebraic_chaining_params');
            const chainParams = document.getElementById('chaining_params');
            if (dynamicParams && algParams && chainParams) {
                dynamicParams.parentNode.insertBefore(chainParams, dynamicParams);
                dynamicParams.parentNode.insertBefore(algParams, dynamicParams);
            }

            if (controls.zCanvasCard) controls.zCanvasCard.classList.remove('hidden');
            if (controls.wCanvasCard) controls.wCanvasCard.classList.remove('hidden');
            disposeRealPlotsRenderer();
        }
        
        const refreshPlanes = () => {
            setupVisualParameters(false, false);
            requestRedrawAll();
        };
        requestAnimationFrame(() => {
            refreshPlanes();
            setTimeout(refreshPlanes, 360);
        });
    });

    bindSelector('realPlotsInputPreset', 'realPlotsInputPreset', (event, val) => {
        if (val === 'custom') {
            state.realPlotsInputIsCustom = true;
            controls.realPlotsCustomInputContainer?.classList.remove('hidden');
            const customVal = controls.realPlotsCustomInput?.value || 'x';
            state.realPlotsInputExpr = customVal;
            updateCustomFormulaPreview(controls.realPlotsCustomInput, controls.realPlotsCustomInputMath);
        } else {
            state.realPlotsInputIsCustom = false;
            controls.realPlotsCustomInputContainer?.classList.add('hidden');
            state.realPlotsInputExpr = val;
        }
        requestRedrawAll();
    });

    bindControlListener('realPlotsCustomInput', 'input', () => {
        const val = controls.realPlotsCustomInput?.value || 'x';
        state.realPlotsInputExpr = val;
        state.realPlotsInputIsCustom = true;
        updateCustomFormulaPreview(controls.realPlotsCustomInput, controls.realPlotsCustomInputMath);
        requestRedrawAll();
    });

    bindSelector('realPlotsImagPreset', 'realPlotsImagPreset', (event, val) => {
        if (val === 'custom') {
            state.realPlotsImagIsCustom = true;
            controls.realPlotsCustomImagContainer?.classList.remove('hidden');
            const customVal = controls.realPlotsCustomImag?.value || '0';
            state.realPlotsImagExpr = customVal;
            updateCustomFormulaPreview(controls.realPlotsCustomImag, controls.realPlotsCustomImagMath);
        } else {
            state.realPlotsImagIsCustom = false;
            controls.realPlotsCustomImagContainer?.classList.add('hidden');
            state.realPlotsImagExpr = val;
        }
        requestRedrawAll();
    });

    bindControlListener('realPlotsCustomImag', 'input', () => {
        const val = controls.realPlotsCustomImag?.value || '0';
        state.realPlotsImagExpr = val;
        state.realPlotsImagIsCustom = true;
        updateCustomFormulaPreview(controls.realPlotsCustomImag, controls.realPlotsCustomImagMath);
        requestRedrawAll();
    });

    bindSelector('realPlotsOutputComponent', 'realPlotsOutputComponent', (event, val) => {
        state.realPlotsOutputComponent = val;
        requestRedrawAll();
    });

    const rpPaletteContainer = document.getElementById('real_plots_palette_circles');
    if (rpPaletteContainer) {
        renderRealPlotsPalettesUI(rpPaletteContainer);
        rpPaletteContainer.addEventListener('click', event => {
            const button = event.target.closest('.domain-palette-circle-btn');
            if (!button) return;
            state.realPlotsPalette = button.dataset.paletteId;
            renderRealPlotsPalettesUI(rpPaletteContainer);
            
            const panel = document.getElementById('real_plots_palette_circle_panel');
            if (panel && !panel.classList.contains('hidden')) {
                updateRealPlotsPaletteCirclePanel();
            }
            
            requestRedrawAll();
        });
    }

    bindSelector('realPlotsColorMode', 'realPlotsColorMode', (event, val) => {
        state.realPlotsColorMode = val;
        requestRedrawAll();
    });

    bindSlider('realPlotsHeightScaleSlider', 'realPlotsHeightScale', parseFloat, (val) => {
        if (controls.realPlotsHeightScaleValueDisplay) {
            controls.realPlotsHeightScaleValueDisplay.textContent = val.toFixed(2);
        }
        requestRedrawAll();
    });



    bindControlListener('toggleFullscreenRealPlotsBtn', 'click', toggleRealPlotsFullscreen);
}

function toggleRealPlotsFullscreen() {
    const container = controls.realPlotsContainer;
    const column = controls.realPlotsColumn;
    const shell = controls.fullscreenContainer;

    if (!container || !shell) return;

    state.isRealPlotsFullScreen = !state.isRealPlotsFullScreen;

    if (state.isRealPlotsFullScreen) {
        state.originalRealPlotsParent = container.parentElement;
        setStyles(shell, fullscreenStyles('#000'));
        attachCloseButton(shell, () => controls.toggleFullscreenRealPlotsBtn.click());
        setStyles(container, { width: '100%', height: '100%' });
        shell.appendChild(container);
        document.body.appendChild(shell);
        shell.classList.remove('hidden');
        if (column) column.classList.add('hidden-visually');
    } else {
        if (state.originalRealPlotsParent) state.originalRealPlotsParent.appendChild(container);
        setStyles(container, { width: '100%', height: '100%' });
        resetFullscreenShell(shell);
        if (column) column.classList.remove('hidden-visually');
    }

    laterFrame(() => {
        setupVisualParameters(false, false);
        requestRedrawAll();
    }, state.isRealPlotsFullScreen ? 150 : 100);
}

