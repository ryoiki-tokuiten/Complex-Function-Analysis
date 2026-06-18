// js/store/state.js

import { eventBus } from './events.js';
import {
    DEFAULT_CANVAS_WIDTH,
    DEFAULT_CANVAS_HEIGHT,
    SPHERE_INITIAL_ROT_X,
    SPHERE_INITIAL_ROT_Y
} from '../constants/rendering.js';

export const zPlaneInitialRanges = { x: [-3.5, 3.5], y: [-3.0, 3.0] };
export const wPlaneInitialRanges = { x: [-6.5, 6.5], y: [-6.5, 6.5] };

export const zPlaneParams = {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    origin: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    currentVisXRange: [...zPlaneInitialRanges.x],
    currentVisYRange: [...zPlaneInitialRanges.y]
};

export const wPlaneParams = {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    origin: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    xRange: [...wPlaneInitialRanges.x],
    yRange: [...wPlaneInitialRanges.y]
};

export const sphereViewParams = {
    z: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y, dragging: false, lastMouseX: 0, lastMouseY: 0, radius: 0, centerX: 0, centerY: 0 },
    w: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y, dragging: false, lastMouseX: 0, lastMouseY: 0, radius: 0, centerX: 0, centerY: 0 }
};

export const sliderParamKeys = ['a0', 'b0', 'circleR', 'ellipseA', 'ellipseB', 'hyperbolaA', 'hyperbolaB', 'fractionalPowerN'];

const rawState = {
    a0: 0.0, b0: 0.0,
    circleR: 1.0, ellipseA: 1.5, ellipseB: 0.7, hyperbolaA: 1.0, hyperbolaB: 0.5,
    mobiusA: { re: 1, im: 0 },
    mobiusB: { re: 0, im: 0 },
    mobiusC: { re: 0, im: 0 },
    mobiusD: { re: 1, im: 0 },
    polynomialN: 2,
    polynomialCoeffs: [], 
    fractionalPowerN: 0.5,
    currentFunction: 'cos', 
    currentInputShape: 'grid_cartesian',
    domainColoringEnabled: false,
    gridDensity: 15,
    showZerosPoles: false,
    showCriticalPoints: false,
    probeActive: false,
    probeZ: { re: 0, im: 0 },
    probeNeighborhoodSize: 0.2,
    riemannSphereViewEnabled: false,
    riemannTransformationEnabled: false,
    riemannTransformationProgressZ: 0.0,
    riemannTransformationPlayingZ: true,
    riemannTransformationProgressW: 0.0,
    riemannTransformationPlayingW: true,
    splitViewEnabled: false, 
    zPlaneZoom: 1.0,
    wPlaneZoom: 1.0,
    zeros: [],
    poles: [],
    criticalPoints: [],
    criticalValues: [],
    zetaContinuationEnabled: false,
    wOriginGlowTime: 0,
    previousWindingNumber: null,

    stripY1: -0.5, stripY2: 0.5,
    sectorAngle1: 0, sectorAngle2: 45, sectorRMin: 0.5, sectorRMax: 2.0,

    vectorFieldEnabled: false,
    vectorFieldFunction: 'f(z)',
    vectorFieldScale: 0.1,
    vectorArrowThickness: 1.5,
    vectorArrowHeadSize: 6,
    streamlineFlowEnabled: false,
    streamlineStepSize: 0.06,
    streamlineMaxLength: 400,
    streamlineThickness: 1.5,
    streamlineSeedDensityFactor: 0.8,

    imageResolution: 300,
    imageSize: 2.0,
    imageOpacity: 1.0,
    imageAspectRatio: 1.0,
    imageContentVersion: 0,
    uploadedImage: null,

    videoResolution: 300,
    videoProcessingFps: 60,
    videoSize: 2.0,
    videoOpacity: 1.0,
    videoAspectRatio: 1.0,
    videoFrameVersion: 0,
    uploadedVideo: null,
    uploadedVideoUrl: '',
    videoIsPlaying: false,
    videoStatusMessage: 'No video loaded.',
    videoProcessingLoopHandle: null,
    videoLastProcessedWallTime: 0,
    videoLastProcessedMediaTime: -1,

    panStateZ: { isPanning: false, panStart: { x: 0, y: 0 }, panStartOrigin: { x: 0, y: 0 } },
    panStateW: { isPanning: false, panStart: { x: 0, y: 0 }, panStartOrigin: { x: 0, y: 0 } },

    isZFullScreen: false,
    isWFullScreen: false,
    topControlsCollapsed: false,
    originalZParent: null,
    originalWParent: null,

    cauchyIntegralModeEnabled: false,

    domainBrightness: 1.0,
    domainContrast: 1.0,
    domainSaturation: 1.0,
    domainLightnessCycles: 1.0,
    domainPalette: 'arctic-frost',

    themeId: 'rose',
    gridColor1: '#FB923C',
    gridColor2: '#C084FC',
    radialDiscreteStepsEnabled: false,
    radialDiscreteStepsCount: 200, 

    taylorSeriesEnabled: false,
    taylorSeriesOrder: 3,
    taylorSeriesCenter: { re: 0, im: 0 }, 
    taylorSeriesConvergenceRadius: Infinity,
    taylorSeriesCustomCenterEnabled: false,
    taylorSeriesCustomCenter: { re: 0, im: 0 },
    taylorSeriesColorAxisX: 'rgba(200, 150, 255, 0.7)',
    taylorSeriesColorAxisY: 'rgba(255, 150, 100, 0.7)',
    taylorSeriesColorConvergenceDiskFill: 'rgba(150, 150, 150, 0.2)',
    taylorSeriesColorConvergenceDiskStroke: 'rgba(150, 150, 150, 0.5)',

    particleAnimationEnabled: false,
    particleDensity: 150,
    particleSpeed: 0.04,
    particleMaxLifetime: 300,
    particles: [], 

    vectorFlowOptionsEnabled: false, 
    globalViewOptionsEnabled: false,
    plotly3DEnabled: false,
    plotlySphereOpacity: 0.10,
    sphereGridOpacity: 0.0,
    riemannSurfaceEnabled: false,
    riemannSurfaceSheets: 5,
    riemannSurfaceBranchCenter: 0,
    riemannSurfaceComponent: 'imaginary',
    riemannSurfaceHeightScale: 1.0,
    riemannSurfaceHeightClip: 8.0,
    riemannSurfaceWireframe: true,
    webglLineRenderingEnabled: true,
    webglDomainColoringEnabled: true,
    webglGpuStressMode: false,

    fourierModeEnabled: false,
    fourierFunction: 'sine',
    fourierFrequency: 1.0,
    fourierAmplitude: 1.0,
    fourierTimeWindow: 4.0,
    fourierSamples: 128,
    fourierTimeDomainSignal: [],
    fourierDFTResult: [],
    fourierWindingFrequency: 1.0, 
    fourierWindingTime: 1.0, 

    laplaceModeEnabled: false,
    laplaceFunction: 'damped_sine',
    laplaceFrequency: 2.0,
    laplaceDamping: 0.5,
    laplaceSigma: 0.0,
    laplaceOmega: 1.0,
    laplaceAmplitude: 1.0,
    laplaceShowROC: true,
    laplaceVizMode: 'magnitude',
    laplaceClipHeight: 10,
    laplaceShowPolesZeros: true,
    laplaceShowFourierLine: true,
    laplaceAnimationTime: 1.0,
    laplaceAnimationPlaying: false,
    laplaceAnimationSpeed: 3.0,
    laplaceAnimationLoop: true,
    laplaceNeedViewportReset: true,
    laplaceWindingSyncZoom: true,
    laplaceTopVP: null,
    lapaceBotVP: null,
    laplaceDragging: null,
    laplaceTimeDomainSignal: [],
    laplaceSurface: [],
    laplacePoles: [],
    laplaceZeros: [],
    laplaceStability: null,
    isLaplace3DFullScreen: false,
    originalLaplace3DParent: null,
    chainingEnabled: false,
    chainingMode: 'recursion',
    chainCount: 1,
    currentFunctionPreset: null,
    fractalOrbitColoringEnabled: false,

    algebraicChainingEnabled: false,
    algebraicChainingTerms: [
        {
            coeff: { re: 1.0, im: 0.0 },
            factors: [
                { func: 'cos', chainedFunc: 'none', power: 1.0, reciprocal: false, log: false, exp: false }
            ]
        }
    ],

    dynamicPlotting: {
        enabled: false,
        mode: 'map',
        source: {
            kind: 'naturals',
            count: 50,
            start: 0,
            step: 1,
            ratio: 2,
            ordering: 'ascending',
            includeZero: false,
            includeNegative: false,
            min: 2,
            max: '',
            bound: 12,
            boundType: 'norm',
            associatePolicy: 'all',
            includeConjugates: true,
            points: [],
            pointsText: '0,0; 1,0; 0,1; -1,0; 0,-1',
            generatorExpression: 'j',
            filterExpression: ''
        },
        pointExpression: 'd',
        term: {
            kind: 'expression',
            expression: 'z',
            bindings: []
        },
        reduction: {
            kind: 'none',
            invalidPolicy: 'stop'
        },
        aggregateParameter: { re: 2, im: 0 },
        parameters: [
            { id: 'k', name: 'k', value: 1, min: -5, max: 5, step: 0.05 }
        ],
        playback: {
            visibleCount: 50,
            playing: false,
            speed: 12,
            loop: true,
            followResult: false
        },
        display: {
            showInputPoints: true,
            showInputPath: false,
            showTermPoints: true,
            showPartialPath: true,
            showVectors: true,
            showLabels: false,
            showInvalid: true,
            colorMode: 'semantic',
            productView: 'orbit',
            pointRadius: 3
        },
        selectedSampleId: null,
        preset: 'custom'
    },

    navigationModeEnabled: false,
    navigationPosition: { re: 0, im: 0 },
    navigationHeading: 0,
    navigationSize: 0.55,
    navigationOpacity: 0.9,
    navigationSpeed: 1.1,
    navigationTrailLength: 0,
    navigationKeys: {},
    navigationTrail: [],
    navigationLastTime: 0,
    isProcessingZDomainDynamics: false,
    isProcessingWDomainDynamics: false
};

function createDeepProxy(obj, path = []) {
    return new Proxy(obj, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            const isElement = typeof Element !== 'undefined' && value instanceof Element;
            const isImage = typeof Image !== 'undefined' && value instanceof Image;
            const isVideo = typeof HTMLVideoElement !== 'undefined' && value instanceof HTMLVideoElement;
            if (value && typeof value === 'object' && !Array.isArray(value) && !isElement && !isImage && !isVideo) {
                return createDeepProxy(value, [...path, prop]);
            }
            return value;
        },
        set(target, prop, value, receiver) {
            const oldValue = target[prop];
            if (oldValue === value) return true;
            
            const success = Reflect.set(target, prop, value, receiver);
            if (success) {
                const fullPath = [...path, prop].join('.');
                eventBus.emit(`state:${fullPath}`, { value, oldValue });
                eventBus.emit('state:change', { path: fullPath, value, oldValue });
            }
            return success;
        }
    });
}

export const state = createDeepProxy(rawState);

export const context = {
    zCanvas: null,
    wCanvas: null,
    zCtx: null,
    wCtx: null,
    zDomainColorCanvas: null,
    wDomainColorCanvas: null,
    zDomainColorCtx: null,
    wDomainColorCtx: null,

    wCanvasList: [],
    wCtxList: [],
    wPlaneParamsList: [],
    wPlanePlotlyContainersList: [],
    sphereViewWParamsList: [],
    wPlanarTransformedLayerCacheList: [],

    redrawRequest: null,
    redrawQueued: false,
    animationStates: {},
    domainColoringDirty: true,
    domainColoringDirtyQueued: false,

    controls: {},
    polynomialCoeffUIElements: [],

    webglSupport: {
        available: false,
        reason: 'not-initialized',
        renderers: { z: null, w: null },
        diagnostics: { z: null, w: null }
    },

    webglDomainColorSupport: {
        available: false,
        reason: 'not-initialized',
        renderers: { z: null, w: null },
        diagnostics: { z: null, w: null },
        warnedFunctionFallbacks: new Set(),
        warnedRuntimeFallback: false
    }
};
