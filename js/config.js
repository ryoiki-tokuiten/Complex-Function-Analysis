


const COLOR_CANVAS_BACKGROUND = '#0a0c10';
const COLOR_AXES = 'rgba(130, 130, 180, 0.8)';
const COLOR_GRID_LINES = 'rgba(128, 137, 255, 0.45)'; 
const COLOR_TEXT_ON_CANVAS = '#d0d7e2';
const COLOR_INPUT_SHAPE_Z = 'rgb(100,150,255)';
const COLOR_INPUT_LINE_IM_Z = 'rgb(100,255,150)';
const COLOR_FOCI = 'rgb(255,100,100)';
const COLOR_ZERO_MARKER = 'rgba(255, 60, 60, 0.9)';
const COLOR_POLE_MARKER = 'rgba(60, 160, 255, 0.9)';
const COLOR_PROBE_MARKER = 'rgba(255, 220, 0, 0.9)';
const COLOR_PROBE_NEIGHBORHOOD = 'rgba(255, 220, 0, 0.5)';
const COLOR_CRITICAL_POINT_Z = 'rgb(255, 0, 255)';
const COLOR_CRITICAL_VALUE_W = 'rgb(255, 0, 255)';
const COLOR_PROBE_CONFORMAL_LINE_Z_H = 'rgba(255, 255, 0, 0.9)';
const COLOR_PROBE_CONFORMAL_LINE_Z_V = 'rgba(255, 165, 0, 0.9)';
const COLOR_PROBE_CONFORMAL_LINE_W_H = 'rgba(255, 255, 0, 0.9)';
const COLOR_PROBE_CONFORMAL_LINE_W_V = 'rgba(255, 165, 0, 0.9)';
const COLOR_Z_GRID_HORZ = 'rgba(200, 150, 255, 0.7)';
const COLOR_Z_GRID_VERT = 'rgba(255, 150, 100, 0.7)';
const COLOR_Z_GRID_HORZ_FUNCTIONAL_EQ = 'rgba(128, 137, 255, 0.5)'; 
const COLOR_Z_GRID_VERT_FUNCTIONAL_EQ = 'rgba(128, 137, 255, 0.5)'; 
const COLOR_Z_GRID_ZETA_UNDEFINED_SUM_REGION = 'rgba(160, 168, 216, 0.25)'; 
const COLOR_POLAR_RADIAL = 'rgba(255, 150, 100, 0.7)';
const COLOR_POLAR_ANGULAR = 'rgba(200, 150, 255, 0.7)';
const COLOR_LOGPOLAR_EXP_R = 'rgba(255, 150, 100, 0.7)';
const COLOR_LOGPOLAR_ANGULAR = 'rgba(200, 150, 255, 0.7)';
const COLOR_STRIP_LINES = 'rgba(120,200,255,0.8)';
const COLOR_SECTOR_LINES = 'rgba(255,120,200,0.8)';
const COLOR_SPHERE_OUTLINE = 'rgba(150, 180, 220, 0.8)';
const COLOR_SPHERE_GRID = 'rgba(128, 137, 255, 0.45)'; 
const COLOR_FTA_C_MARKER = 'rgb(255, 165, 0)';
const COLOR_W_ORIGIN_GLOW = 'rgba(255, 255, 0, 0.7)';
const COLOR_CAUCHY_CONTOUR_Z = 'rgb(255, 160, 0)';
const COLOR_CAUCHY_CONTOUR_W = 'rgb(255, 160, 0)';
const COLOR_POLE_INSIDE_CONTOUR_MARKER = 'rgba(0, 255, 255, 1)';
const COLOR_STREAMLINE = 'rgba(200, 200, 255, 0.75)';


const STREAMLINE_COLOR_MIN_MAG = 0.0; 
const STREAMLINE_COLOR_MAX_MAG = 5.0; 
const STREAMLINE_COLOR_LOW_MAG = { r: 0, g: 0, b: 255 }; 
const STREAMLINE_COLOR_HIGH_MAG = { r: 255, g: 0, b: 0 }; 




const COLOR_PARTICLE = 'rgba(255, 255, 0, 0.9)'; 
const PARTICLE_RADIUS = 1.5;



const NUM_POINTS_CURVE = 1000;
const NUM_ZETA_TERMS_DIRECT_SUM = 100;
const NUM_ZETA_TERMS_ETA_SERIES = 500;
const NUM_ZETA_TERMS_FOR_FE = 500;
const MAX_POLY_DEGREE = 10;
const ZERO_POLE_EPSILON = 1e-4;
const ZERO_POLE_GRID_SIZE = 100;
const POLE_MAGNITUDE_THRESHOLD = 5e3;
const CRITICAL_POINT_FIND_GRID_SIZE = 60;
const CRITICAL_POINT_EPSILON = 1e-5;
const ZP_CP_CHECK_DISTANCE_FACTOR = 1.5;
const DEFAULT_CANVAS_WIDTH = 600;
const DEFAULT_CANVAS_HEIGHT = 450;
const DEFAULT_CANVAS_ASPECT_RATIO = DEFAULT_CANVAS_HEIGHT / DEFAULT_CANVAS_WIDTH;
const ORIGIN_GLOW_DURATION_MS = 500;
const MIN_POINTS_ADAPTIVE = 1200;
const MAX_POINTS_ADAPTIVE_DEFAULT = 10000;
const ADAPTIVE_ANCHOR_DENSITY = 800;
const DEFAULT_POINTS_PER_LINE = 1000;
const ZETA_POLE = { re: 1, im: 0 };
const ZETA_REFLECTION_POINT_RE = 1.0;
const ZOOM_IN_FACTOR = 1.15;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const MIN_STATE_ZOOM_LEVEL = 0.01;
const MAX_STATE_ZOOM_LEVEL = 100;
const NUM_INTEGRAL_STEPS = 250;
const RESIDUE_CALC_EPSILON_RADIUS = 0.02;
const NUM_RESIDUE_INTEGRAL_STEPS = 100;
const RESIDUE_BOUNDARY_CHECK_FACTOR = 1.5;
const PROBE_CROSSHAIR_SIZE_FACTOR = 3.5;
const RADIAL_STEPS_MIN = 0;
const RADIAL_STEPS_MAX = 800;
const DEFAULT_RADIAL_STEPS = 200;


const SPHERE_VIEW_RADIUS_FACTOR = 0.85;
const SPHERE_INITIAL_ROT_X = 0.4;
const SPHERE_INITIAL_ROT_Y = -0.6;
const SPHERE_GRID_LINES = 20; 
const SPHERE_SENSITIVITY = 0.01; 
const SPHERE_TEXTURE_AMBIENT_INTENSITY = 0.3;
const SPHERE_TEXTURE_DIFFUSE_INTENSITY = 0.7;
const SPHERE_TEXTURE_SPECULAR_INTENSITY = 0.6;
const SPHERE_TEXTURE_SHININESS_FACTOR = 32;
const SPHERE_BASE_SHADING_AMBIENT = 0.2;
const SPHERE_BASE_SHADING_DIFFUSE = 0.8;
const SPHERE_BASE_SHADING_COLOR = { r: 50, g: 60, b: 80 };
const SPHERE_LIGHT_DIRECTION_CAMERA = { x: 0.5, y: 0.5, z: 0.707 };
const SPHERE_GRID_LINE_MAX_WIDTH_W = 1.5;
const SPHERE_GRID_LINE_MAX_WIDTH_Z = 1.0;
const SPHERE_GRID_LINE_DEPTH_EFFECT = true;




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
    streamlineFlowEnabled: false,
    manualSeedPoints: [], 

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
