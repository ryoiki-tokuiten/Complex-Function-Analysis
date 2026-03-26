


const sliderParamKeys = ['a0', 'b0', 'circleR', 'ellipseA', 'ellipseB', 'hyperbolaA', 'hyperbolaB'];


let state = {
    a0: 0.0, b0: 0.0,
    circleR: 1.0, ellipseA: 1.5, ellipseB: 0.7, hyperbolaA: 1.0, hyperbolaB: 0.5,
    mobiusA: { re: 1, im: 0 },
    mobiusB: { re: 0, im: 0 },
    mobiusC: { re: 0, im: 0 },
    mobiusD: { re: 1, im: 0 },
    polynomialN: 2,
    polynomialCoeffs: [], 
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
    manualSeedPoints: [], 

    imagePoints: [],
    imageResolution: 300,
    imageSize: 2.0,
    imageOpacity: 1.0,
    uploadedImage: null,

    panStateZ: { isPanning: false, panStart: { x: 0, y: 0 }, panStartOrigin: { x: 0, y: 0 } },
    panStateW: { isPanning: false, panStart: { x: 0, y: 0 }, panStartOrigin: { x: 0, y: 0 } },

    isZFullScreen: false,
    isWFullScreen: false,
    originalZParent: null,
    originalWParent: null,

    cauchyIntegralModeEnabled: false,

    domainBrightness: 1.0,
    domainContrast: 1.0,
    domainSaturation: 1.0,
    domainLightnessCycles: 1.0,
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
    particleDensity: 50, 
    particleSpeed: 0.01, 
    particleMaxLifetime: 200, 
    particles: [], 

    vectorFlowOptionsEnabled: false, 
    globalViewOptionsEnabled: false,
    plotly3DEnabled: false,
    showSphereAxesAndGrid: false, // Default to hidden
    webglLineRenderingEnabled: true,
    webglDomainColoringEnabled: true,
    webglGpuStressMode: false,

    // Fourier Transform state
    fourierModeEnabled: false,
    fourierFunction: 'sine',
    fourierFrequency: 1.0,
    fourierAmplitude: 1.0,
    fourierTimeWindow: 4.0,
    fourierSamples: 128,
    fourierTimeDomainSignal: [],
    fourierDFTResult: [],
    fourierWindingFrequency: 1.0, // The frequency we're testing (KEY CONTROL!)
    fourierWindingTime: 1.0, // How far along in time (0 to 1, for animation)
};


const zPlaneInitialRanges = { x: [-3.5, 3.5], y: [-3.0, 3.0] };
const wPlaneInitialRanges = { x: [-6.5, 6.5], y: [-6.5, 6.5] };

const zPlaneParams = {
    width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT,
    origin: {x:0, y:0}, scale: {x:1, y:1},
    currentVisXRange: [...zPlaneInitialRanges.x], currentVisYRange: [...zPlaneInitialRanges.y]
};
const wPlaneParams = {
    width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT,
    origin: {x:0, y:0}, scale: {x:1, y:1},
    xRange: [...wPlaneInitialRanges.x], yRange: [...wPlaneInitialRanges.y]
};
let sphereViewParams = {
    z: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y, dragging: false, lastMouseX: 0, lastMouseY: 0, radius: 0, centerX: 0, centerY: 0 },
    w: { rotX: SPHERE_INITIAL_ROT_X, rotY: SPHERE_INITIAL_ROT_Y, dragging: false, lastMouseX: 0, lastMouseY: 0, radius: 0, centerX: 0, centerY: 0 }
};


let redrawRequest = null;
let animationStates = {};
let domainColoringDirty = true;


const controls = {}; 
const polynomialCoeffUIElements = [];
let zCtx, wCtx, zDomainColorCtx, wDomainColorCtx;
let zCanvas, wCanvas, zDomainColorCanvas, wDomainColorCanvas;
let webglSupport = {
    available: false,
    reason: 'not-initialized',
    renderers: { z: null, w: null },
    diagnostics: { z: null, w: null }
};
let webglDomainColorSupport = {
    available: false,
    reason: 'not-initialized',
    renderers: { z: null, w: null },
    diagnostics: { z: null, w: null },
    warnedFunctionFallbacks: new Set(),
    warnedRuntimeFallback: false
};

function getStreamlineColorByMagnitude(magnitude) {
    
    let t = (magnitude - STREAMLINE_COLOR_MIN_MAG) / (STREAMLINE_COLOR_MAX_MAG - STREAMLINE_COLOR_MIN_MAG);
    t = Math.max(0, Math.min(1, t)); 

    
    const r = Math.round(STREAMLINE_COLOR_LOW_MAG.r * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.r * t);
    const g = Math.round(STREAMLINE_COLOR_LOW_MAG.g * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.g * t);
    const b = Math.round(STREAMLINE_COLOR_LOW_MAG.b * (1 - t) + STREAMLINE_COLOR_HIGH_MAG.b * t);

    
    let alpha = 0.75; 
    try {
        const parts = COLOR_STREAMLINE.substring(COLOR_STREAMLINE.indexOf('(') + 1, COLOR_STREAMLINE.lastIndexOf(')')).split(/,\s*/);
        if (parts.length === 4) {
            alpha = parseFloat(parts[3]);
        }
    } catch (e) {
        
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
