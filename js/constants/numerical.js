// js/constants/numerical.js

const TWO_PI = 2 * Math.PI;
const PI = TWO_PI / 2;

const NUM_POINTS_CURVE = 1000;
const NUM_ZETA_TERMS_DIRECT_SUM = 100;
const NUM_ZETA_TERMS_ETA_SERIES = 500;
const NUM_ZETA_TERMS_FOR_FE = 500;
const NUM_ZETA_HASSE_LEVELS = 32;
const MAX_POLY_DEGREE = 10;
const ZERO_POLE_EPSILON = 1e-4;
const ZERO_POLE_GRID_SIZE = 100;
const POLE_MAGNITUDE_THRESHOLD = 5e3;
const CRITICAL_POINT_FIND_GRID_SIZE = 60;
const CRITICAL_POINT_EPSILON = 1e-5;
const ZP_CP_CHECK_DISTANCE_FACTOR = 1.5;

const MIN_POINTS_ADAPTIVE = 1200;
const MAX_POINTS_ADAPTIVE_DEFAULT = 10000;
const ADAPTIVE_ANCHOR_DENSITY = 800;
const DEFAULT_POINTS_PER_LINE = 1000;

const ZETA_POLE = { re: 1, im: 0 };
const ZETA_REFLECTION_POINT_RE = 1.0;
const ZOOM_IN_FACTOR = 1.15;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const MIN_STATE_ZOOM_LEVEL = 1e-6;
const MAX_STATE_ZOOM_LEVEL = 1e6;
const NUM_INTEGRAL_STEPS = 250;
const RESIDUE_CALC_EPSILON_RADIUS = 0.02;
const NUM_RESIDUE_INTEGRAL_STEPS = 100;
const RESIDUE_BOUNDARY_CHECK_FACTOR = 1.5;
const PROBE_CROSSHAIR_SIZE_FACTOR = 3.5;
const RADIAL_STEPS_MIN = 0;
const RADIAL_STEPS_MAX = 800;
const DEFAULT_RADIAL_STEPS = 200;
const DEFAULT_TAYLOR_SERIES_CENTER = Object.freeze({ re: 0, im: 0 });
const TAYLOR_CENTER_PRESET_GROUPS = Object.freeze([
    Object.freeze({
        label: 'Real Axis',
        presets: Object.freeze([
            Object.freeze({ label: '0', re: 0, im: 0 }),
            Object.freeze({ label: '+1', re: 1, im: 0 }),
            Object.freeze({ label: '-1', re: -1, im: 0 }),
            Object.freeze({ label: 'pi/4', re: PI / 4, im: 0 }),
            Object.freeze({ label: '-pi/4', re: -PI / 4, im: 0 }),
            Object.freeze({ label: 'pi/2', re: PI / 2, im: 0 }),
            Object.freeze({ label: '-pi/2', re: -PI / 2, im: 0 }),
            Object.freeze({ label: '3pi/4', re: (3 * PI) / 4, im: 0 }),
            Object.freeze({ label: 'pi', re: PI, im: 0 }),
            Object.freeze({ label: '-pi', re: -PI, im: 0 }),
            Object.freeze({ label: '2pi', re: TWO_PI, im: 0 }),
            Object.freeze({ label: '-2pi', re: -TWO_PI, im: 0 }),
            Object.freeze({ label: '4pi', re: 2 * TWO_PI, im: 0 }),
            Object.freeze({ label: '-4pi', re: -2 * TWO_PI, im: 0 })
        ])
    }),
    Object.freeze({
        label: 'Imaginary Axis',
        presets: Object.freeze([
            Object.freeze({ label: 'i', re: 0, im: 1 }),
            Object.freeze({ label: '-i', re: 0, im: -1 }),
            Object.freeze({ label: 'pi*i', re: 0, im: PI }),
            Object.freeze({ label: '-pi*i', re: 0, im: -PI }),
            Object.freeze({ label: '2pi*i', re: 0, im: TWO_PI }),
            Object.freeze({ label: '-2pi*i', re: 0, im: -TWO_PI })
        ])
    })
]);
const TAYLOR_CENTER_PRESETS = Object.freeze(TAYLOR_CENTER_PRESET_GROUPS.flatMap(group => group.presets));
