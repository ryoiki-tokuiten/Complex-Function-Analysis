import { state, context, sliderParamKeys } from '../store/state.js';
import { getChainedTransformFunction, numericDerivative } from '../math-utils.js';
import { DEFAULT_TAYLOR_SERIES_CENTER, CRITICAL_POINT_EPSILON } from '../constants/numerical.js';
import { updatePolynomialCoeffDisplays } from './polynomial-ui.js';
import { syncLaplacePlayPauseButton, syncLaplaceWindingSyncButton } from './event-listeners.js';
import { syncVideoPlaybackUI } from '../utils/raster-media.js';
import { findTaylorCenterPreset, formatTaylorNumericValue, getChainingTitleHTML } from '../utils/dom-utils.js';
import { syncNavigationControls } from '../navigation-plane.js';
import {
    getBranchWindowLabel,
    getVisibleBranchIndices,
    surfaceStageHasBranches
} from '../analysis/riemann-surface.js';
import { renderDomainPalettesUI, domainPalettes } from './theme-manager.js';
import { startRiemannTransformationAnimation, stopRiemannTransformationAnimation, syncRiemannTransformationPlayPauseButton, initThreeJSRenderers, buildThreeJSMeshes, syncRiemannSliders, disposeThreeJSRenderers } from '../rendering/riemann-transformation-animation.js';
import { getDynamicFunctionFormulaHtml } from '../analysis/dynamic-plotting.js';

const { controls = {} } = context;

const HIDDEN_CLASS = 'hidden';
const VISUALLY_HIDDEN_CLASS = 'hidden-visually';
const EPS = 1e-9;

const TRANSFORM_MODE_PARAMETER_GROUPS = Object.freeze([
    'commonParamsSliders',
    'mobiusParamsSliders',
    'polynomialParamsSliders',
    'fractionalPowerParamsSliders',
    'shapeParamsSliders',
    'stripHorizontalParamsSliders',
    'sectorAngularParamsSliders'
]);

const TRANSFORM_MODE_VISUALIZATION_PANELS = Object.freeze([
    'visualizationOptionsPanel',
    'zetaSpecificControlsDiv',
    'riemannSphereOptionsDiv',
    'riemannSurfaceOptionsDiv',
    'sphereViewControlsDiv',
    'vectorFlowOptionsContent'
]);

const CENTER_LABELS = Object.freeze({
    line: [
        'Fixed Re(z) (<code>a<sub>0</sub></code>):',
        'Fixed Im(z) (<code>b<sub>0</sub></code>):'
    ],
    image: [
        'Image Center Re (<code>a<sub>0</sub></code>):',
        'Image Center Im (<code>b<sub>0</sub></code>):'
    ],
    video: [
        'Video Center Re (<code>a<sub>0</sub></code>):',
        'Video Center Im (<code>b<sub>0</sub></code>):'
    ],
    default: [
        'Center Re(z<sub>0</sub>) (<code>a<sub>0</sub></code>):',
        'Center Im(z<sub>0</sub>) (<code>b<sub>0</sub></code>):'
    ]
});

const INPUT_SHAPE_TITLE_SUFFIX = Object.freeze({
    line: ': Lines)',
    circle: ': Circle)',
    ellipse: ': Ellipse)',
    hyperbola: ': Hyperbola)',
    grid_cartesian: ': Cartesian Grid)',
    grid_polar: ': Polar Grid)',
    grid_logpolar: ': Log-Polar Grid)',
    strip_horizontal: ': Horiz. Strip)',
    sector_angular: ': Ang. Sector)',
    image: ': Image)',
    video: ': Video)',
    empty_grid: ': Empty)'
});

const SHAPE_SPECIFIC_GROUPS = Object.freeze({
    circle: 'circleRSliderGroup',
    ellipse: 'ellipseParamsSliderGroup',
    hyperbola: 'hyperbolaParamsSliderGroup'
});

const SIMPLE_FUNCTION_LABELS = Object.freeze({
    cos: 'cos',
    sin: 'sin',
    tan: 'tan',
    sec: 'sec',
    exp: 'exp',
    ln: 'ln',
    sinh: 'sinh',
    cosh: 'cosh',
    tanh: 'tanh'
});

const FUNCTION_ARGUMENT_HTML = Object.freeze({
    cos: 'cos(z)',
    sin: 'sin(z)',
    tan: 'tan(z)',
    sec: 'sec(z)',
    exp: 'e<sup>z</sup>',
    ln: 'ln(z)',
    sinh: 'sinh(z)',
    cosh: 'cosh(z)',
    tanh: 'tanh(z)',
    reciprocal: '1/z',
    mobius: 'Möbius(z)',
    zeta: 'ζ(z)',
    polynomial: 'P(z)',
    poincare: 'Poincare(z)'
});

const NORMAL_MODE_VALUE_BINDINGS = Object.freeze([
    { display: 'gridDensityValueDisplay', key: 'gridDensity' },
    { display: 'neighborhoodSizeValueDisplay', key: 'probeNeighborhoodSize', digits: 2 },
    { display: 'zPlaneZoomValueDisplay', key: 'zPlaneZoom', digits: 2 },
    { display: 'wPlaneZoomValueDisplay', key: 'wPlaneZoom', digits: 2 },
    { display: 'vectorFieldScaleValueDisplay', key: 'vectorFieldScale', digits: 2 },
    { display: 'vectorArrowThicknessValueDisplay', key: 'vectorArrowThickness', digits: 1, companion: 'vectorArrowThicknessSlider' },
    { display: 'vectorArrowHeadSizeValueDisplay', key: 'vectorArrowHeadSize', digits: 1, companion: 'vectorArrowHeadSizeSlider' },
    { display: 'domainBrightnessValueDisplay', key: 'domainBrightness', digits: 2 },
    { display: 'domainContrastValueDisplay', key: 'domainContrast', digits: 2 },
    { display: 'domainSaturationValueDisplay', key: 'domainSaturation', digits: 2 },
    { display: 'domainLightnessCyclesValueDisplay', key: 'domainLightnessCycles', digits: 2 },
    { display: 'imageResolutionValueDisplay', key: 'imageResolution' },
    { display: 'imageSizeValueDisplay', key: 'imageSize', digits: 1 },
    { display: 'imageOpacityValueDisplay', key: 'imageOpacity', digits: 2 },
    { display: 'videoResolutionValueDisplay', key: 'videoResolution' },
    { display: 'videoFpsValueDisplay', key: 'videoProcessingFps' },
    { display: 'videoSizeValueDisplay', key: 'videoSize', digits: 1 },
    { display: 'videoOpacityValueDisplay', key: 'videoOpacity', digits: 2 },
    {
        display: 'radialDiscreteStepsCountValueDisplay',
        key: 'radialDiscreteStepsCount',
        guard: () => typeof state.radialDiscreteStepsCount === 'number'
    },
    { display: 'taylorSeriesOrderValueDisplay', key: 'taylorSeriesOrder', companion: 'taylorSeriesOrderSlider' }
]);

const STREAMLINE_VALUE_BINDINGS = Object.freeze([
    { display: 'streamlineStepSizeValueDisplay', key: 'streamlineStepSize', digits: 3, companion: 'streamlineStepSizeSlider' },
    { display: 'streamlineMaxLengthValueDisplay', key: 'streamlineMaxLength', companion: 'streamlineMaxLengthSlider' },
    { display: 'streamlineThicknessValueDisplay', key: 'streamlineThickness', digits: 1, companion: 'streamlineThicknessSlider' },
    { display: 'streamlineSeedDensityFactorValueDisplay', key: 'streamlineSeedDensityFactor', digits: 2, companion: 'streamlineSeedDensityFactorSlider' }
]);

const PARTICLE_VALUE_BINDINGS = Object.freeze([
    { display: 'particleDensityValueDisplay', key: 'particleDensity', companion: 'particleDensitySlider' },
    { display: 'particleSpeedValueDisplay', key: 'particleSpeed', digits: 3, companion: 'particleSpeedSlider' },
    { display: 'particleMaxLifetimeValueDisplay', key: 'particleMaxLifetime', companion: 'particleMaxLifetimeSlider' }
]);

const RIEMANN_VIEW_VALUE_BINDINGS = Object.freeze([
    { display: 'plotlySphereOpacityValueDisplay', key: 'plotlySphereOpacity', digits: 2, companion: 'plotlySphereOpacitySlider' },
    { display: 'sphereGridOpacityValueDisplay', key: 'sphereGridOpacity', digits: 2, companion: 'sphereGridOpacitySlider' },
    { display: 'taylorSeriesOrderValueDisplay', key: 'taylorSeriesOrder', companion: 'taylorSeriesOrderSlider' },
    { display: 'riemannSurfaceSheetsValueDisplay', key: 'riemannSurfaceSheets' },
    { display: 'riemannSurfaceBranchCenterValueDisplay', key: 'riemannSurfaceBranchCenter' },
    { display: 'riemannSurfaceHeightScaleValueDisplay', key: 'riemannSurfaceHeightScale', digits: 2 },
    { display: 'riemannSurfaceHeightClipValueDisplay', key: 'riemannSurfaceHeightClip', digits: 1 }
]);

const FOURIER_VALUE_BINDINGS = Object.freeze([
    { display: 'fourierFrequencyValueDisplay', key: 'fourierFrequency', digits: 1 },
    { display: 'fourierAmplitudeValueDisplay', key: 'fourierAmplitude', digits: 1 },
    { display: 'fourierTimeWindowValueDisplay', key: 'fourierTimeWindow', digits: 1 },
    { display: 'fourierSamplesValueDisplay', key: 'fourierSamples' },
    { display: 'fourierWindingFrequencyValueDisplay', key: 'fourierWindingFrequency', digits: 1 },
    { display: 'fourierWindingTimeValueDisplay', get: () => Math.round(state.fourierWindingTime * 100) }
]);

const LAPLACE_VALUE_BINDINGS = Object.freeze([
    { display: 'laplaceFrequencyValueDisplay', key: 'laplaceFrequency', digits: 1 },
    { display: 'laplaceDampingValueDisplay', key: 'laplaceDamping', digits: 1 },
    { display: 'laplaceSigmaValueDisplay', key: 'laplaceSigma', digits: 1 },
    { display: 'laplaceOmegaValueDisplay', key: 'laplaceOmega', digits: 1 },
    { display: 'laplaceClipHeightValueDisplay', key: 'laplaceClipHeight', digits: 0 }
]);

function control(key) {
    return controls?.[key] ?? null;
}

function resolveControl(target) {
    return typeof target === 'string' ? control(target) : target;
}

function runUiTransaction(name, action) {
    try {
        action();
    } catch (error) {
        console.error(`Error in ${name}:`, error);
    }
}

function setHidden(target, hidden = true) {
    const node = resolveControl(target);
    node?.classList?.toggle(HIDDEN_CLASS, Boolean(hidden));
}

function setActive(target, active = true) {
    const node = resolveControl(target);
    node?.classList?.toggle('active', Boolean(active));
}

function setText(key, value) {
    const node = control(key);
    if (node && value !== undefined && value !== null) {
        node.textContent = String(value);
    }
}

function setHtml(key, html) {
    const node = control(key);
    if (node) {
        node.innerHTML = html;
    }
}

function setChecked(key, checked) {
    const node = control(key);
    if (node && 'checked' in node) {
        node.checked = Boolean(checked);
    }
}

function setDisabled(key, disabled) {
    const node = control(key);
    if (node && 'disabled' in node) {
        node.disabled = Boolean(disabled);
    }
}

function setValue(key, value) {
    const node = control(key);
    if (node && value !== undefined && value !== null && 'value' in node) {
        node.value = value;
    }
}

function setStyleColor(key, color) {
    const node = control(key);
    if (node?.style && color) {
        node.style.color = color;
    }
}

function isFixedRenderable(value) {
    return typeof value === 'number' && !Number.isNaN(value);
}

function toFixedText(value, digits) {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(number) ? null : number.toFixed(digits);
}

function setFixedText(key, value, digits) {
    const rendered = toFixedText(value, digits);
    if (rendered !== null) {
        setText(key, rendered);
    }
}

function syncValueBindings(bindings) {
    for (const binding of bindings) {
        if (binding.guard && !binding.guard()) {
            continue;
        }

        if (binding.companion && !control(binding.companion)) {
            continue;
        }

        const value = typeof binding.get === 'function'
            ? binding.get()
            : state[binding.key];

        if (value === undefined || value === null) {
            continue;
        }

        if (binding.digits === undefined) {
            setText(binding.display, value);
            continue;
        }

        const rendered = toFixedText(value, binding.digits);
        if (rendered !== null) {
            setText(binding.display, rendered);
        }
    }
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function finiteComplex(value) {
    return Number.isFinite(value?.re) && Number.isFinite(value?.im);
}

function isPanning(panState) {
    return Boolean(panState?.isPanning);
}

function fractionalPowerExponent() {
    const n = typeof state.fractionalPowerN === 'number' ? state.fractionalPowerN : 0.5;
    return Number((n || 0.5).toFixed(2));
}

function hideControls(keys) {
    for (const key of keys) {
        setHidden(key, true);
    }
}

function syncDisclosure(checkboxKey, contentKey, enabled) {
    setChecked(checkboxKey, enabled);
    setHidden(contentKey, !enabled);
}

function syncPointEditor(editorKey, points) {
    const editor = context?.[editorKey];
    if (typeof editor?.setPoints === 'function') {
        editor.setPoints(points, false);
    }
}

function syncDelegates() {
    for (const delegate of [
        syncLaplacePlayPauseButton,
        syncLaplaceWindingSyncButton,
        syncVideoPlaybackUI,
        syncNavigationControls
    ]) {
        if (typeof delegate === 'function') {
            delegate();
        }
    }
}

export function syncParameterControlsPanelVisibility() {
    const panel = control('parameterControlsPanel');
    if (!panel?.children) {
        return;
    }

    const hasVisibleContent = Array.from(panel.children).some(child =>
        child?.classList
        && !child.classList.contains(HIDDEN_CLASS)
        && !child.classList.contains(VISUALLY_HIDDEN_CLASS)
    );

    setHidden(panel, !hasVisibleContent);
}

function collectActiveFunctionKeys() {
    const keys = new Set([state.currentFunction]);

    if (!state.algebraicChainingEnabled) {
        return keys;
    }

    for (const term of safeArray(state.algebraicChainingTerms)) {
        for (const factor of safeArray(term?.factors)) {
            if (factor?.func) {
                keys.add(factor.func);
            }
            if (factor?.chainedFunc) {
                keys.add(factor.chainedFunc);
            }
        }
    }

    return keys;
}

function syncShapeSpecificParameterGroups(currentShape, showShapeSpecificSliders) {
    setHidden('shapeParamsSliders', !showShapeSpecificSliders);

    if (!showShapeSpecificSliders) {
        return;
    }

    for (const [shape, groupKey] of Object.entries(SHAPE_SPECIFIC_GROUPS)) {
        setHidden(groupKey, currentShape !== shape);
    }
}

function syncCenterLabels(currentShape) {
    const labels = CENTER_LABELS[currentShape] ?? CENTER_LABELS.default;
    setHtml('a0LabelDesc', labels[0]);
    setHtml('b0LabelDesc', labels[1]);
}

function decimalPlacesFromStep(step) {
    const text = String(step ?? '');
    const decimalIndex = text.indexOf('.');

    if (decimalIndex < 0) {
        return 0;
    }

    return text.slice(decimalIndex + 1).length;
}

function syncSliderParamValueDisplays() {
    const highPrecisionKeys = new Set(['a0', 'b0', 'circleR']);

    for (const key of sliderParamKeys) {
        const display = control(`${key}ValueDisplay`);
        const slider = control(`${key}Slider`);
        const value = state[key];

        if (!display || !slider || typeof value !== 'number' || Number.isNaN(value)) {
            continue;
        }

        const stepPrecision = decimalPlacesFromStep(slider.step);
        const basePrecision = highPrecisionKeys.has(key) ? 2 : 1;
        display.textContent = value.toFixed(Math.max(stepPrecision, basePrecision));
    }
}

function syncMobiusDisplays() {
    for (const param of ['A', 'B', 'C', 'D']) {
        const value = state[`mobius${param}`];

        if (!value) {
            continue;
        }

        setFixedText(`mobius${param}_re_value_display`, value.re, 1);
        setFixedText(`mobius${param}_im_value_display`, value.im, 1);
    }
}

function syncStripDisplays() {
    setFixedText('stripY1ValueDisplay', state.stripY1, 1);
    setFixedText('stripY2ValueDisplay', state.stripY2, 1);
}

function syncSectorDisplays() {
    setFixedText('sectorAngle1ValueDisplay', state.sectorAngle1, 0);
    setFixedText('sectorAngle2ValueDisplay', state.sectorAngle2, 0);
    setFixedText('sectorRMinValueDisplay', state.sectorRMin, 1);
    setFixedText('sectorRMaxValueDisplay', state.sectorRMax, 1);
}

function syncPolynomialDisplays() {
    setText('polynomialNValueDisplay', state.polynomialN);
    updatePolynomialCoeffDisplays();
}

function syncFractionalPowerDisplays() {
    if (!control('fractionalPowerNValueDisplay')) {
        return;
    }

    const rendered = state.fractionalPowerN !== undefined
        ? toFixedText(state.fractionalPowerN, 2)
        : '0.50';

    setText('fractionalPowerNValueDisplay', rendered ?? '0.50');
}

function syncComplexParameterControls() {
    if (state.fourierModeEnabled || state.laplaceModeEnabled) {
        hideControls(TRANSFORM_MODE_PARAMETER_GROUPS);
        return;
    }

    const shape = state.currentInputShape;
    const activeFunctions = collectActiveFunctionKeys();
    const isLine = shape === 'line';
    const isCircle = shape === 'circle';
    const isEllipse = shape === 'ellipse';
    const isHyperbola = shape === 'hyperbola';
    const isImage = shape === 'image';
    const isVideo = shape === 'video';
    const showCommonParams = isLine || isCircle || isEllipse || isHyperbola;
    const showMediaCenterParams = isImage || isVideo;
    const showShapeSpecificSliders = isCircle || isEllipse || isHyperbola;
    const isMobiusFunc = activeFunctions.has('mobius');
    const isPolyFunc = activeFunctions.has('polynomial');
    const isPowerFunc = activeFunctions.has('power');
    const isStripH = shape === 'strip_horizontal';
    const isSectorA = shape === 'sector_angular';

    setHidden('commonParamsSliders', !(showCommonParams || showMediaCenterParams));
    setHidden('mobiusParamsSliders', !isMobiusFunc);
    setHidden('polynomialParamsSliders', !isPolyFunc);
    setHidden('fractionalPowerParamsSliders', !isPowerFunc);
    setHidden('stripHorizontalParamsSliders', !isStripH);
    setHidden('sectorAngularParamsSliders', !isSectorA);
    setHidden('imageUploadControls', !isImage);
    setHidden('videoUploadControls', !isVideo);

    syncShapeSpecificParameterGroups(shape, showShapeSpecificSliders);

    if (showCommonParams || showMediaCenterParams) {
        syncCenterLabels(shape);
    }

    syncSliderParamValueDisplays();

    if (isMobiusFunc) {
        syncMobiusDisplays();
    }

    if (isStripH) {
        syncStripDisplays();
    }

    if (isSectorA) {
        syncSectorDisplays();
    }

    if (isPolyFunc) {
        syncPolynomialDisplays();
    }

    if (isPowerFunc) {
        syncFractionalPowerDisplays();
    }
}

function syncNormalModeDisplays() {
    if (state.fourierModeEnabled || state.laplaceModeEnabled) {
        return;
    }

    syncValueBindings(NORMAL_MODE_VALUE_BINDINGS);
    setValue('zPlaneZoomSlider', state.zPlaneZoom);
    setValue('wPlaneZoomSlider', state.wPlaneZoom);
}

function syncTaylorControls() {
    syncDisclosure('enableTaylorSeriesCb', 'taylorSeriesOptionsDetailDiv', state.taylorSeriesEnabled);
    syncDisclosure(
        'enableTaylorSeriesCustomCenterCb',
        'taylorSeriesCustomCenterInputsDiv',
        state.taylorSeriesCustomCenterEnabled
    );

    syncTaylorSeriesCenterStatus();
    syncPointEditor('taylorCenterUI', [state.taylorSeriesCustomCenter]);
}

function syncGeneralPointControls() {
    syncDisclosure('enableGeneralPointsCb', 'generalPointsControlsContainer', state.generalPointsEnabled);
    syncPointEditor('generalPointsUI', state.generalPointsList);
}

function syncVectorFlowControls() {
    setChecked('enableStreamlineFlowCb', state.streamlineFlowEnabled);
    setHidden('streamlineOptionsDetailsDiv', !state.streamlineFlowEnabled);
    syncValueBindings(STREAMLINE_VALUE_BINDINGS);

    syncValueBindings(PARTICLE_VALUE_BINDINGS);
    setChecked('enableParticleAnimationCb', state.particleAnimationEnabled);
    setHidden('particleAnimationDetailsDiv', !state.particleAnimationEnabled);

    setChecked('showVectorFieldPanelCb', state.showVectorFieldPanelEnabled);
    setHidden('vectorFlowOptionsContent', !state.showVectorFieldPanelEnabled);
}

function syncRiemannAndTransformDisplays() {
    syncValueBindings(RIEMANN_VIEW_VALUE_BINDINGS);
    syncValueBindings(FOURIER_VALUE_BINDINGS);
    syncValueBindings(LAPLACE_VALUE_BINDINGS);

    const stability = state.laplaceStability;
    if (control('laplaceStabilityDisplay') && stability) {
        setText('laplaceStabilityDisplay', stability.message || 'Analyzing…');
        setStyleColor('laplaceStabilityDisplay', stability.color);
    }
}

export function updateSliderLabelsAndDisplay() {
    runUiTransaction('updateSliderLabelsAndDisplay', () => {
        syncComplexParameterControls();
        syncNormalModeDisplays();
        syncTaylorControls();
        syncGeneralPointControls();
        syncParameterControlsPanelVisibility();
        syncVectorFlowControls();
        syncRiemannAndTransformDisplays();
        syncDelegates();
    });
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
    if (!control('taylorSeriesCenterStatus')) {
        return;
    }

    setText('taylorSeriesCenterStatus', formatTaylorCenterStatusText(getTaylorDisplayCenter()));
}

export function syncTaylorSeriesPresetSelection() {
    syncPointEditor('taylorCenterUI', [state.taylorSeriesCustomCenter]);
}

export function formatProbeValue(v) {
    if (v === 0) {
        return '0';
    }

    if (typeof v !== 'number' || Number.isNaN(v)) {
        return 'NaN';
    }

    if (!Number.isFinite(v)) {
        return String(v);
    }

    const absV = Math.abs(v);
    return absV >= 0.001 && absV < 1e6
        ? v.toFixed(3)
        : v.toExponential(3);
}

export function formatProbeComplex(re, im) {
    const reStr = formatProbeValue(re);
    const imAbs = Math.abs(im);
    const imSign = im >= 0 ? '+' : '-';
    const imStr = formatProbeValue(imAbs);
    return `${reStr} ${imSign} ${imStr}i`;
}

function hideProbeInfo() {
    setHidden('zPlaneProbeInfo', true);
    setHidden('wPlaneProbeInfo', true);
}

function showProbeInfo(zHtml, wHtml) {
    setHtml('zPlaneProbeInfo', zHtml);
    setHidden('zPlaneProbeInfo', false);
    setHtml('wPlaneProbeInfo', wHtml);
    setHidden('wPlaneProbeInfo', false);
}

function derivativeProbeHtml() {
    if (state.currentFunction === 'poincare') {
        return [
            "f'(z): N/A for Poincare map",
            'Conformality: N/A'
        ].join('<br>') + '<br>';
    }

    const deriv = numericDerivative(state.currentFunction, state.probeZ);
    if (!finiteComplex(deriv)) {
        return "f'(z) calculation failed.<br>Conformality: Unknown<br>";
    }

    const magDerivSq = deriv.re * deriv.re + deriv.im * deriv.im;
    const isConformal = magDerivSq > CRITICAL_POINT_EPSILON * CRITICAL_POINT_EPSILON;
    const mag = Math.sqrt(magDerivSq);
    const argR = Math.atan2(deriv.im, deriv.re);
    const argD = argR * 180 / Math.PI;

    return [
        `f'(z) ≈ ${formatProbeComplex(deriv.re, deriv.im)}`,
        isConformal ? 'Conformal at z' : "Not conformal (f'(z) ≈ 0)",
        `|f'(z)| ≈ ${formatProbeValue(mag)} (mag.)`,
        `arg(f'(z)) ≈ ${argR.toFixed(3)}rad (${argD.toFixed(2)}°) (rot.)`
    ].join('<br>');
}

function transformedProbeHtml() {
    const transform = getChainedTransformFunction(state.currentFunction);
    const pW = typeof transform === 'function'
        ? transform(state.probeZ.re, state.probeZ.im)
        : null;

    if (!finiteComplex(pW)) {
        return 'w is undefined or infinite.<br>Conformality: N/A<br>';
    }

    return `w = ${formatProbeComplex(pW.re, pW.im)}<br>${derivativeProbeHtml()}`;
}

export function updateProbeInfo() {
    runUiTransaction('updateProbeInfo', () => {
        const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
        const probeCanRender = state.probeActive
            && zIsPlanar
            && !state.navigationModeEnabled
            && !state.fourierModeEnabled
            && !state.laplaceModeEnabled
            && !isPanning(state.panStateZ)
            && !isPanning(state.panStateW)
            && finiteComplex(state.probeZ);

        if (!probeCanRender) {
            hideProbeInfo();
            return;
        }

        showProbeInfo(
            `z = ${formatProbeComplex(state.probeZ.re, state.probeZ.im)}`,
            transformedProbeHtml()
        );
    });
}

function formatNumberForFormula(value, fallback = 0) {
    const number = typeof value === 'number' ? value : fallback;
    return Number(number.toFixed(2));
}

function normalizeComplex(c, fallbackRe = 1, fallbackIm = 0) {
    const re = typeof c?.re === 'number' && !Number.isNaN(c.re) ? c.re : fallbackRe;
    const im = typeof c?.im === 'number' && !Number.isNaN(c.im) ? c.im : fallbackIm;
    return { re, im };
}

function formatComplexCoeff(c) {
    const coeff = normalizeComplex(c);

    if (Math.abs(coeff.im) < EPS) {
        if (Math.abs(coeff.re - 1) < EPS) {
            return '';
        }
        if (Math.abs(coeff.re + 1) < EPS) {
            return '-';
        }
        return `${formatNumberForFormula(coeff.re)}`;
    }

    const reStr = Math.abs(coeff.re) < EPS ? '' : `${formatNumberForFormula(coeff.re)}`;
    const sign = coeff.im >= 0 ? '+' : '-';
    const imVal = Math.abs(coeff.im);
    const imStr = Math.abs(imVal - 1) < EPS ? 'i' : `${formatNumberForFormula(imVal)}i`;

    if (reStr === '') {
        return coeff.im >= 0 ? imStr : `-${imStr}`;
    }

    return `(${reStr}${sign}${imStr})`;
}

function baseFunctionHtml(funcKey) {
    if (SIMPLE_FUNCTION_LABELS[funcKey]) {
        return SIMPLE_FUNCTION_LABELS[funcKey];
    }

    switch (funcKey) {
        case 'c':
            return 'c';
        case 'power':
            return `(·)<sup>${fractionalPowerExponent()}</sup>`;
        case 'reciprocal':
            return 'reciprocal';
        case 'mobius':
            return 'Möbius';
        case 'zeta':
            return 'ζ';
        case 'polynomial':
            return `P (deg ${state.polynomialN})`;
        case 'poincare':
            return 'Poincare';
        default:
            return funcKey;
    }
}

function argumentFunctionHtml(funcKey) {
    if (funcKey === 'c') {
        return 'c';
    }

    if (funcKey === 'power') {
        return `z<sup>${fractionalPowerExponent()}</sup>`;
    }

    return FUNCTION_ARGUMENT_HTML[funcKey] ?? `${funcKey}(z)`;
}

function formatFuncForFormula(funcKey, termFactor = null) {
    if (!funcKey || funcKey === 'none') {
        return '';
    }

    const base = baseFunctionHtml(funcKey);
    const innerArg = termFactor?.chainedFunc && termFactor.chainedFunc !== 'none'
        ? argumentFunctionHtml(termFactor.chainedFunc)
        : 'z';

    let result = funcKey === 'c'
        ? 'c'
        : funcKey === 'power'
        ? base.replace('(·)', innerArg)
        : funcKey === 'reciprocal'
            ? `1/${innerArg}`
            : `${base}(${innerArg})`;

    if (!termFactor) {
        return result;
    }

    if (typeof termFactor.power === 'number' && termFactor.power !== 1) {
        result = `(${result})<sup>${formatNumberForFormula(termFactor.power)}</sup>`;
    }

    if (termFactor.reciprocal) {
        result = `1/(${result})`;
    }

    if (termFactor.log) {
        result = `ln(${result})`;
    }

    if (termFactor.exp) {
        result = `e<sup>${result}</sup>`;
    }

    return result;
}

function formatAlgebraicTerm(term) {
    const activeFactors = safeArray(term?.factors).filter(factor => factor?.func && factor.func !== 'none');
    const factorsStr = activeFactors.map(factor => formatFuncForFormula(factor.func, factor)).join('·');
    const coeffStr = formatComplexCoeff(term?.coeff);

    if (coeffStr === '') {
        return factorsStr || '1';
    }

    if (coeffStr === '-') {
        return `-${factorsStr || '1'}`;
    }

    return factorsStr ? `${coeffStr}·${factorsStr}` : coeffStr;
}

function currentFunctionFormulaHtml() {
    const dynamicFormula = getDynamicFunctionFormulaHtml();
    if (dynamicFormula) {
        return dynamicFormula;
    }

    if (state.currentFunction === 'algebraic_chaining') {
        const terms = safeArray(state.algebraicChainingTerms);
        return terms.length
            ? terms.map(formatAlgebraicTerm).join(' + ').replace(/\+ \-/g, '- ')
            : '0';
    }

    switch (state.currentFunction) {
        case 'polynomial':
            return `P(z) (deg ${state.polynomialN})`;
        case 'exp':
            return 'e<sup>z</sup>';
        case 'ln':
            return 'ln(z)';
        case 'reciprocal':
            return '1/z';
        case 'mobius':
            return '(az+b)/(cz+d)';
        case 'zeta':
            return 'ζ(z)';
        case 'poincare':
            return 'Poincare Map';
        case 'power':
            return 'z<sup>n</sup>';
        case 'sinh':
            return 'sinh(z)';
        case 'cosh':
            return 'cosh(z)';
        case 'tanh':
            return 'tanh(z)';
        default:
            return `${state.currentFunction}(z)`;
    }
}

function repeatedFormulaWrap(baseFormula, count, wrap) {
    let formula = baseFormula;
    for (let i = 1; i < count; i += 1) {
        formula = wrap(formula);
    }
    return formula;
}

function compactRecursionSymbol() {
    switch (state.currentFunction) {
        case 'polynomial':
            return `P<sub>deg ${state.polynomialN}</sub>`;
        case 'mobius':
            return 'Möbius';
        case 'zeta':
            return 'ζ';
        case 'power':
            return `z<sup>${fractionalPowerExponent()}</sup>`;
        default:
            return state.currentFunction;
    }
}

function compositionSymbol() {
    switch (state.currentFunction) {
        case 'exp':
            return 'e<sup>(·)</sup>';
        case 'ln':
            return 'ln(·)';
        case 'reciprocal':
            return '1/(·)';
        case 'zeta':
            return 'ζ(·)';
        case 'polynomial':
            return `P<sub>deg ${state.polynomialN}</sub>(·)`;
        case 'mobius':
            return 'Möbius(·)';
        case 'power':
            return `(·)<sup>${fractionalPowerExponent()}</sup>`;
        case 'poincare':
            return 'Poincare(·)';
        case 'sinh':
            return 'sinh(·)';
        case 'cosh':
            return 'cosh(·)';
        case 'tanh':
            return 'tanh(·)';
        default:
            return `${state.currentFunction}(·)`;
    }
}

function recursiveChainFormula(baseFormula, chainCount) {
    if (chainCount > 3 || state.currentFunction === 'algebraic_chaining') {
        return state.currentFunction === 'algebraic_chaining'
            ? `f<sup>${chainCount}</sup>(z) <span style="font-size:0.85em; opacity:0.8;">[where f(z) = ${baseFormula}]</span>`
            : `${compactRecursionSymbol()}<sup>${chainCount}</sup>(z)`;
    }

    const symbol = compositionSymbol();
    let formula = baseFormula;

    for (let i = 1; i < chainCount; i += 1) {
        formula = symbol.includes('(·)')
            ? symbol.replace('(·)', formula)
            : `${symbol}(${formula})`;
    }

    return formula;
}

function getChainedFormula(baseFormula, chainingMode, chainCount) {
    if (!state.chainingEnabled || chainCount <= 1) {
        return baseFormula;
    }

    switch (chainingMode) {
        case 'zero_seed':
            return state.currentFunction === 'algebraic_chaining'
                ? `f<sup>${chainCount}</sup>(0; c = z) <span style="font-size:0.85em; opacity:0.8;">[where f(z, c) = ${baseFormula}]</span>`
                : `${compactRecursionSymbol()}<sup>${chainCount}</sup>(0; c = z)`;
        case 'power':
            return `(${baseFormula})<sup>${chainCount}</sup>`;
        case 'sqrt':
            return repeatedFormulaWrap(baseFormula, chainCount, formula => `√(${formula})`);
        case 'ln':
            return repeatedFormulaWrap(baseFormula, chainCount, formula => `ln(${formula})`);
        case 'exp':
            return repeatedFormulaWrap(baseFormula, chainCount, formula => `e<sup>${formula}</sup>`);
        case 'reciprocal':
            return repeatedFormulaWrap(baseFormula, chainCount, formula => `1/(${formula})`);
        case 'recursion':
        default:
            return recursiveChainFormula(baseFormula, chainCount);
    }
}

function outputFormulaModel() {
    let fND = currentFunctionFormulaHtml();

    if (state.chainingEnabled && state.chainCount > 1) {
        fND = getChainedFormula(fND, state.chainingMode, state.chainCount);
    }

    const hasOutputChain = state.chainingEnabled && state.chainCount > 1;
    const wOutputFormula = hasOutputChain
        ? getChainingTitleHTML(0, state.chainingMode)
        : `w = ${fND}`;

    return {
        fND,
        hasOutputChain,
        wOutputFormula,
        wOutputDescriptor: `${hasOutputChain ? 'Chain 0' : 'Output'}: <code id="w-plane-title-func">${wOutputFormula}</code>`,
        mappedWOutputDescriptor: `${hasOutputChain ? 'mapped chain 0' : 'mapped output'}: <code id="w-plane-title-func">${wOutputFormula}</code>`
    };
}

function defaultZPlaneTitle(fND) {
    const suffix = INPUT_SHAPE_TITLE_SUFFIX[state.currentInputShape] ?? ')';
    let title = `z-plane (Input${suffix})`;
    const showRadialSteps = state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare';

    if (state.domainColoringEnabled) {
        const prefix = state.riemannSphereViewEnabled && !state.splitViewEnabled ? 'z-sphere' : 'z-plane';
        title = `${prefix} (Output: Domain Coloring of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
        const typeStr = state.streamlineFlowEnabled ? 'Streamlines' : 'Vector Field';
        title = `z-plane (Output: ${typeStr} [${state.vectorFieldFunction}] of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (showRadialSteps) {
        title = `z-plane (Output: Radial Discrete Steps of <code id="z-plane-title-func">w = ${fND}</code>)`;
    } else if (state.navigationModeEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled)) {
        title = 'z-plane (Navigation)';
    }

    return title;
}

function splitViewZPlaneTitle(fND) {
    const showRadialSteps = state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare';

    if (state.domainColoringEnabled) {
        return `z-plane (Output: Domain Coloring of <code id="z-plane-title-func">w = ${fND}</code>)`;
    }

    if (state.vectorFieldEnabled || state.streamlineFlowEnabled) {
        const typeStr = state.streamlineFlowEnabled ? 'Streamlines' : 'Vector Field';
        return `z-plane (Output: ${typeStr} [${state.vectorFieldFunction}] of <code id="z-plane-title-func">w = ${fND}</code>)`;
    }

    if (showRadialSteps) {
        return `z-plane (Output: Radial Discrete Steps of <code id="z-plane-title-func">w = ${fND}</code>)`;
    }

    return `z-plane (Input Grid: ${String(state.currentInputShape ?? '').replace(/_/g, ' ')})`;
}

function sphereWPlaneTitle(model) {
    const sphereLabel = state.plotly3DEnabled ? '3D w-sphere' : 'w-sphere';

    return state.domainColoringEnabled
        ? `${sphereLabel} (Codomain coloring; ${model.mappedWOutputDescriptor})`
        : `${sphereLabel} (${model.wOutputDescriptor})`;
}

function syncPrimaryPlaneTitles() {
    const model = outputFormulaModel();
    const zPlaneTitle = defaultZPlaneTitle(model.fND);

    if (state.riemannSurfaceEnabled) {
        setHtml('zPlaneTitle', zPlaneTitle);
        setHtml('wPlaneTitle', `Riemann surface (${model.wOutputDescriptor})`);
        setHidden('cauchy_integral_results_info', true);
        return;
    }

    if (state.splitViewEnabled) {
        setHtml('zPlaneTitle', splitViewZPlaneTitle(model.fND));
        setHtml('wPlaneTitle', sphereWPlaneTitle(model));
        setHidden('cauchy_integral_results_info', true);
        return;
    }

    if (state.riemannSphereViewEnabled && state.riemannTransformationEnabled && !state.splitViewEnabled) {
        setHtml('zPlaneTitle', 'z-sphere (Input: Transforming Flat Grid to Sphere)');
        setHtml('wPlaneTitle', 'w-sphere (Output: Transforming Mapped Grid to Sphere)');
        setHidden('cauchy_integral_results_info', true);
        return;
    }

    if (state.riemannSphereViewEnabled) {
        setHtml(
            'zPlaneTitle',
            state.domainColoringEnabled
                ? `z-sphere (Output: Domain Coloring of <code id="z-plane-title-func">w = ${model.fND}</code>)`
                : 'z-sphere (Input)'
        );
        setHtml('wPlaneTitle', sphereWPlaneTitle(model));
        setHidden('cauchy_integral_results_info', true);
        return;
    }

    setHtml('zPlaneTitle', zPlaneTitle);
    setHtml(
        'wPlaneTitle',
        state.navigationModeEnabled
            ? `w-plane (Mapped Navigation: <code id="w-plane-title-func">${model.wOutputFormula}</code>)`
            : `w-plane (${model.wOutputDescriptor})`
    );
}

function syncTransformModeTitles() {
    if (state.fourierModeEnabled) {
        setHtml('zPlaneTitle', 'Time Domain (Signal)');
        setHtml('wPlaneTitle', 'Frequency Domain (Fourier Transform)');
        setDisabled('inputShapeSelector', true);
        hideControls(TRANSFORM_MODE_VISUALIZATION_PANELS);
        return true;
    }

    if (!state.laplaceModeEnabled) {
        return false;
    }

    setHtml('zPlaneTitle', 'Time Domain (Signal)');
    setHtml('wPlaneTitle', 'Complex Frequency Domain (Winding)');
    setDisabled('inputShapeSelector', true);

    const laplace3DTitles = {
        magnitude: '3D Surface: |F(s)| Magnitude',
        phase: '3D Surface: ∠F(s) Phase',
        combined: '3D Surface: Combined View'
    };

    const vizMode = state.laplaceVizMode || 'magnitude';
    setHtml('laplace3DTitleLabel', laplace3DTitles[vizMode] ?? laplace3DTitles.combined);
    hideControls(TRANSFORM_MODE_VISUALIZATION_PANELS);
    return true;
}

function syncRiemannSurfaceControls() {
    setHidden(
        'riemannSphereOptionsDiv',
        !state.riemannSphereViewEnabled || state.riemannSurfaceEnabled
    );
    setHidden('riemannSurfaceOptionsDiv', !state.riemannSurfaceEnabled);
    setChecked('enableRiemannSurfaceCb', state.riemannSurfaceEnabled);
    setValue('riemannSurfaceComponentSelector', state.riemannSurfaceComponent);
    setChecked('riemannSurfaceWireframeCb', state.riemannSurfaceWireframe);

    if (control('riemannSurfaceStatus')) {
        const hasBranches = surfaceStageHasBranches(state, 1);
        const indices = getVisibleBranchIndices(
            state.riemannSurfaceSheets,
            state.riemannSurfaceBranchCenter,
            hasBranches
        );

        setText(
            'riemannSurfaceStatus',
            hasBranches
                ? `GPU branch window: ${getBranchWindowLabel(indices)}`
                : 'GPU surface: this output is single-valued'
        );
    }

    setHidden(
        'plotly3DOptionsDiv',
        !(state.riemannSphereViewEnabled && state.plotly3DEnabled)
    );
    setHidden(
        'sphereViewControlsDiv',
        !(state.riemannSphereViewEnabled || state.splitViewEnabled)
    );
}

function syncDomainColoringControls() {
    setHidden('domainColoringOptionsDiv', !state.domainColoringEnabled);
    setHidden('riemannSphereDomainColoringOptions', !state.domainColoringEnabled);

    const paletteCirclesContainer = typeof document !== 'undefined'
        ? document.getElementById('domain_palette_circles')
        : null;

    if (paletteCirclesContainer && typeof renderDomainPalettesUI === 'function') {
        renderDomainPalettesUI(paletteCirclesContainer);
    }

    for (const selector of [
        control('domainPaletteSelect'),
        control('riemannSurfacePaletteSelect'),
        control('riemannSpherePaletteSelect')
    ]) {
        if (selector) {
            selector.value = state.domainPalette || 'analytic-base';
        }
    }

    setHidden('domainColoringKeyDiv', !state.domainColoringEnabled);
    if (control('domainColoringKeyDiv')) {
        updateDomainColoringKey();
    }
}

function syncZetaControls() {
    const container = control('zetaSpecificControlsDiv');
    if (!container) {
        return;
    }

    const isZeta = state.currentFunction === 'zeta';
    setHidden(container, !isZeta);

    if (!isZeta) {
        return;
    }

    setText(
        'toggleZetaContinuationBtn',
        state.zetaContinuationEnabled
            ? 'Disable Analytic Continuation'
            : 'Enable Analytic Continuation'
    );
    setActive('toggleZetaContinuationBtn', state.zetaContinuationEnabled);
}

function syncPoincareRestrictions() {
    const isPoincare = state.currentFunction === 'poincare';

    setDisabled('showZerosPolesCb', isPoincare);
    setDisabled('showCriticalPointsCb', isPoincare);
    setDisabled('enableCauchyIntegralModeCb', isPoincare);

    if (isPoincare) {
        setChecked('showZerosPolesCb', false);
        setChecked('showCriticalPointsCb', false);
        setChecked('enableCauchyIntegralModeCb', false);
        state.showZerosPoles = false;
        state.showCriticalPoints = false;
        state.cauchyIntegralModeEnabled = false;
    }

    setDisabled('enableRadialDiscreteStepsCb', isPoincare);
    if (isPoincare && control('enableRadialDiscreteStepsCb')) {
        setChecked('enableRadialDiscreteStepsCb', false);
        setHidden('radialDiscreteStepsOptionsDiv', true);
    }

    setDisabled('enableTaylorSeriesCb', isPoincare);
    if (isPoincare && control('enableTaylorSeriesCb')) {
        setChecked('enableTaylorSeriesCb', false);
        state.taylorSeriesEnabled = false;
        setHidden('taylorSeriesOptionsDetailDiv', true);
    }
}

function syncVisualizationOptionControls() {
    setHidden('visualizationOptionsPanel', false);
    setDisabled('inputShapeSelector', false);
    syncRiemannSurfaceControls();
    syncDomainColoringControls();
    setHidden('radialDiscreteStepsOptionsDiv', !state.radialDiscreteStepsEnabled);
    syncZetaControls();
    syncPoincareRestrictions();
}

export function updateTitlesAndGlobalUI() {
    runUiTransaction('updateTitlesAndGlobalUI', () => {
        updateSliderLabelsAndDisplay();
        updateProbeInfo();

        if (syncTransformModeTitles()) {
            return;
        }

        syncPrimaryPlaneTitles();
        syncVisualizationOptionControls();
        syncRiemannTransformationUI();
    });
}

export function updateDomainColoringKey() {
    const keyDiv = control('domainColoringKeyDiv');
    if (!keyDiv) {
        return;
    }

    const paletteId = state.domainPalette || 'analytic-base';
    const paletteObj = domainPalettes.find(palette => palette.id === paletteId) || domainPalettes[0];
    const lines = ['<strong>Domain Coloring Key:</strong><br>'];

    if (paletteObj?.key) {
        lines.push('<span style="display:inline-block; margin-bottom: 4px;">- Color maps to Argument (Angle):</span><br>');

        for (const item of paletteObj.key) {
            lines.push(
                `&nbsp;&nbsp;&nbsp;<span style="color:${item.color}; font-weight:bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">${item.label}</span>: Arg = ${item.angle}<br>`
            );
        }
    }

    lines.push('<span style="display:inline-block; margin-top: 4px;">- Lightness maps to Magnitude (Log-scaled, cyclic bands).</span>');
    keyDiv.innerHTML = lines.join('');
}

export function syncRiemannTransformationUI() {
    const showOverlay = state.riemannSphereViewEnabled && state.riemannTransformationEnabled && !state.splitViewEnabled;
    
    // Z plane UI
    const overlayZ = document.getElementById('z_plane_transformation_overlay');
    const containerZ = document.getElementById('z_plane_threejs_container');
    if (overlayZ) overlayZ.classList.toggle('hidden', !showOverlay);
    if (containerZ) containerZ.classList.toggle('hidden', !showOverlay);

    // W plane UI
    const overlayW = document.getElementById('w_plane_transformation_overlay');
    const containerW = document.getElementById('w_plane_threejs_container');
    if (overlayW) overlayW.classList.toggle('hidden', !showOverlay);
    if (containerW) containerW.classList.toggle('hidden', !showOverlay);
    
    if (showOverlay) {
        initThreeJSRenderers();
        buildThreeJSMeshes();
        startRiemannTransformationAnimation();
        syncRiemannTransformationPlayPauseButton();
        syncRiemannSliders();
    } else {
        stopRiemannTransformationAnimation();
        disposeThreeJSRenderers();
    }
}
