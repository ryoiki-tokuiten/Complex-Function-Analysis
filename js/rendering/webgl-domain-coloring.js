import { state, context } from '../store/state.js';
import { eventBus } from '../store/events.js';
import {
    createWebGLProgramShared,
    getWebGLDomainColorFunctionIdShared,
    getWebGLBackendInfoShared,
    setComplexFunctionUniformsShared,
    getGLSLComplexMathLibrary
} from './webgl-shared.js';
import {
    buildDynamicAggregateGLSL,
    dynamicAggregateGLSLSignature,
    isDynamicAggregateGLSLActive
} from '../math/expression/glsl.js';
import {
    WEBGL_DOMAIN_COLOR_SUPERSAMPLE,
    WEBGL_DOMAIN_COLOR_STRESS_SCALE,
    SPHERE_LIGHT_DIRECTION_CAMERA,
    SPHERE_TEXTURE_AMBIENT_INTENSITY,
    SPHERE_TEXTURE_DIFFUSE_INTENSITY,
    SPHERE_TEXTURE_SPECULAR_INTENSITY,
    SPHERE_TEXTURE_SHININESS_FACTOR
} from '../constants/rendering.js';

const { webglDomainColorSupport } = context;

const CFG = Object.freeze({
    defaultSupersample: 1.75,
    defaultStressScale: 2.5,
    maxRenderScale: 3,
    maxDprBoost: 1.35,
    dprScaleFactor: 0.92,
    polyCoeffCount: 11,
    maxChainStepsGlsl: 512,
    maxPerturbationOrbit: 513
});

const EMPTY_OPTIONS = Object.freeze({});
const PLANES = Object.freeze(['z', 'w']);
const PLANE_KEYS = new Set(PLANES);

const QUAD_VERTICES = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
]);

const WEBGL_CONTEXT_ATTRIBUTES = Object.freeze({
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
});

export const DOMAIN_PALETTE_IDS = Object.freeze({
    'analytic-base': 0,
    'ocean-depth': 1,
    'midnight-flare': 2,
    'forest-moss': 3,
    'arctic-frost': 4,
    'nordic-twilight': 5,
    'lavender-ash': 7,
    'monochrome-topo': 8,
    'rose-gold': 9,
    classic: 10,
    calming: 11,
    purple: 12,
    green: 13
});

export const CHAIN_MODE_IDS = Object.freeze({
    recursion: 1,
    power: 2,
    sqrt: 3,
    ln: 4,
    exp: 5,
    reciprocal: 6,
    zero_seed: 7
});

const DOMAIN_FLOAT_UNIFORMS = Object.freeze([
    ['uDomainBrightness', 'domainBrightness', 1],
    ['uDomainContrast', 'domainContrast', 1],
    ['uDomainSaturation', 'domainSaturation', 1],
    ['uDomainLightnessCycles', 'domainLightnessCycles', 0]
]);

const UNIFORM_ALIASES = Object.freeze({
    uResolution: 'u_resolution',
    uViewCenter: 'u_viewCenter',
    uViewSpan: 'u_viewSpan',
    uDomainBrightness: 'u_domainBrightness',
    uDomainContrast: 'u_domainContrast',
    uDomainSaturation: 'u_domainSaturation',
    uDomainLightnessCycles: 'u_domainLightnessCycles',
    uDomainPalette: 'u_domainPalette',
    uUseSphere: 'u_useSphere',
    uSphereCenter: 'u_sphereCenter',
    uSphereRadius: 'u_sphereRadius',
    uRotX: 'u_rotX',
    uRotY: 'u_rotY',
    uLightDir: 'u_lightDir',
    uSphereLighting: 'u_sphereLighting',
    uIsWPlaneColoring: 'u_isWPlaneColoring',
    uFunctionId: 'u_functionId',
    uMobiusA: 'u_mobiusA',
    uMobiusB: 'u_mobiusB',
    uMobiusC: 'u_mobiusC',
    uMobiusD: 'u_mobiusD',
    uPolyDegree: 'u_polyDegree',
    uZetaCont: 'u_zetaContinuationEnabled',
    uZetaRefl: 'u_zetaReflectionBoundary',
    uFracPower: 'u_fracPower',
    uChainCount: 'u_chainCount',
    uChainMode: 'u_chainMode',
    uUseOrbitColoring: 'u_useOrbitColoring',
    uUseDynamicsPerturbation: 'u_useDynamicsPerturbation',
    uPerturbationA1: 'u_perturbationA1',
    uPerturbationA2: 'u_perturbationA2',
    uPerturbationCScale: 'u_perturbationCScale',
    uPerturbationOrbit: 'u_perturbationOrbit[0]'
});

const PALETTES = Object.freeze([
    [0, [[0.68, 0.12, 0.12], [0.60, 0.60, 0.11], [0.11, 0.60, 0.11], [0.11, 0.60, 0.60], [0.135, 0.135, 0.765], [0.68, 0.12, 0.68], [0.68, 0.12, 0.12]]],
    [1, [[0.059, 0.090, 0.165], [0.012, 0.412, 0.631], [0.055, 0.647, 0.914], [0.220, 0.741, 0.973], [0.055, 0.647, 0.914], [0.012, 0.412, 0.631], [0.059, 0.090, 0.165]]],
    [2, [[0.118, 0.106, 0.294], [0.345, 0.110, 0.529], [0.576, 0.200, 0.918], [0.882, 0.114, 0.282], [0.576, 0.200, 0.918], [0.345, 0.110, 0.529], [0.118, 0.106, 0.294]]],
    [3, [[0.024, 0.306, 0.231], [0.016, 0.471, 0.341], [0.063, 0.725, 0.506], [0.204, 0.827, 0.600], [0.063, 0.725, 0.506], [0.016, 0.471, 0.341], [0.024, 0.306, 0.231]]],
    [4, [[0.059, 0.090, 0.165], [0.118, 0.161, 0.231], [0.231, 0.510, 0.965], [0.576, 0.773, 0.992], [0.231, 0.510, 0.965], [0.118, 0.161, 0.231], [0.059, 0.090, 0.165]]],
    [5, [[0.180, 0.204, 0.251], [0.298, 0.337, 0.416], [0.369, 0.506, 0.675], [0.706, 0.557, 0.678], [0.369, 0.506, 0.675], [0.298, 0.337, 0.416], [0.180, 0.204, 0.251]]],
    [6, [[0.157, 0.157, 0.157], [0.314, 0.286, 0.271], [0.843, 0.600, 0.129], [0.694, 0.384, 0.525], [0.843, 0.600, 0.129], [0.314, 0.286, 0.271], [0.157, 0.157, 0.157]]],
    [7, [[0.102, 0.063, 0.145], [0.180, 0.137, 0.235], [0.494, 0.341, 0.761], [0.702, 0.616, 0.859], [0.494, 0.341, 0.761], [0.180, 0.137, 0.235], [0.102, 0.063, 0.145]]],
    [8, [[0.039, 0.039, 0.039], [0.149, 0.149, 0.149], [0.322, 0.322, 0.322], [0.451, 0.451, 0.451], [0.322, 0.322, 0.322], [0.149, 0.149, 0.149], [0.039, 0.039, 0.039]]],
    [9, [[0.110, 0.098, 0.090], [0.471, 0.208, 0.059], [0.882, 0.114, 0.282], [0.996, 0.643, 0.686], [0.882, 0.114, 0.282], [0.471, 0.208, 0.059], [0.110, 0.098, 0.090]]],
    [11, [[0.851, 0.773, 0.757], [0.769, 0.545, 0.502], [0.792, 0.576, 0.522], [0.922, 0.863, 0.824], [0.608, 0.443, 0.412], [0.584, 0.416, 0.388], [0.851, 0.773, 0.757]]],
    [12, [[0.765, 0.710, 0.859], [0.541, 0.420, 0.784], [0.576, 0.443, 0.831], [0.863, 0.784, 1.0], [0.702, 0.600, 1.0], [0.667, 0.576, 0.953], [0.765, 0.710, 0.859]]],
    [13, [[0.608, 0.741, 0.655], [0.243, 0.561, 0.467], [0.302, 0.635, 0.537], [0.784, 0.961, 0.863], [0.718, 0.949, 0.314], [0.659, 0.875, 0.243], [0.608, 0.741, 0.655]]]
]);

const FALLBACK_PALETTE = Object.freeze([
    [0.110, 0.098, 0.090],
    [0.471, 0.208, 0.059],
    [0.882, 0.114, 0.282],
    [0.996, 0.643, 0.686],
    [0.882, 0.114, 0.282],
    [0.471, 0.208, 0.059],
    [0.110, 0.098, 0.090]
]);

const VERTEX_SOURCE = lines(
    'attribute vec2 a_position;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = (a_position + 1.0) * 0.5;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
);

const FRAGMENT_UNIFORMS = lines(
    'precision highp float;',
    'varying vec2 v_uv;',
    '',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_viewCenter;',
    'uniform vec2 u_viewSpan;',
    'uniform float u_domainBrightness;',
    'uniform float u_domainContrast;',
    'uniform float u_domainSaturation;',
    'uniform float u_domainLightnessCycles;',
    'uniform int u_domainPalette;',
    '',
    'uniform float u_useSphere;',
    'uniform vec2 u_sphereCenter;',
    'uniform float u_sphereRadius;',
    'uniform float u_rotX;',
    'uniform float u_rotY;',
    'uniform vec3 u_lightDir;',
    'uniform vec4 u_sphereLighting;',
    '',
    'uniform float u_isWPlaneColoring;',
    'uniform float u_functionId;',
    'uniform vec2 u_mobiusA;',
    'uniform vec2 u_mobiusB;',
    'uniform vec2 u_mobiusC;',
    'uniform vec2 u_mobiusD;',
    'uniform int u_polyDegree;',
    `uniform vec2 u_polyCoeffs[${CFG.polyCoeffCount}];`,
    'uniform float u_zetaContinuationEnabled;',
    'uniform float u_zetaReflectionBoundary;',
    'uniform float u_fracPower;',
    'uniform int u_chainCount;',
    'uniform int u_chainMode;',
    'uniform float u_useOrbitColoring;',
    'uniform float u_useDynamicsPerturbation;',
    'uniform vec2 u_perturbationA1;',
    'uniform vec2 u_perturbationA2;',
    'uniform vec2 u_perturbationCScale;',
    `uniform vec2 u_perturbationOrbit[${CFG.maxPerturbationOrbit}];`
);

const DYNAMICS_COLOR_HELPERS = `
vec4 dynamicsInteriorColor() {
  return vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 dynamicsEscapeColor(float smoothIteration, float brightnessFactor) {
  float count = max(float(u_chainCount), 1.0);
  float t = clamp(smoothIteration / count, 0.0, 1.0);
  vec3 baseColor = getPaletteColor(u_domainPalette, min(t, 0.9999));
  float lightnessBase = 0.22 + 0.58 * pow(t, 0.65);
  float lightnessContrasted = 0.5 + (lightnessBase - 0.5) * u_domainContrast;
  float lightnessFinal = clamp(lightnessContrasted * u_domainBrightness * brightnessFactor, 0.05, 0.95);
  return vec4(applyLightnessAndSaturation(baseColor, lightnessFinal, clamp(u_domainSaturation, 0.0, 1.0)), 1.0);
}

vec4 iteratedDynamicsColor(vec2 parameterValue, int chainMode, float brightnessFactor) {
  vec2 current = chainMode == 7 ? vec2(0.0) : parameterValue;
  float escapeRadius = 64.0;
  float escapeRadiusSq = escapeRadius * escapeRadius;
  float smoothIteration = float(u_chainCount);
  bool escaped = false;

  for (int i = 0; i < ${CFG.maxChainStepsGlsl}; i++) {
    if (i >= u_chainCount) break;

    vec2 nextValue = vec2(0.0);
    bool ok = mapDomainValue(current, parameterValue, nextValue);
    float magSq = dot(nextValue, nextValue);

    if (!ok || !isFiniteVec2Compat(nextValue) || magSq > escapeRadiusSq || shouldStopDomainChain(nextValue)) {
      float magnitude = sqrt(max(magSq, escapeRadius));
      smoothIteration = float(i) + 1.0;

      if (ok && isFiniteFloatCompat(magnitude) && magnitude > 1.0001) {
        float smoothAdjust = log(max(log(magnitude) / log(escapeRadius), 1.0e-6)) / LOG_TWO;
        smoothIteration = clamp(smoothIteration - smoothAdjust, 0.0, float(u_chainCount));
      }

      escaped = true;
      break;
    }

    current = nextValue;
  }

  return escaped
    ? dynamicsEscapeColor(smoothIteration, brightnessFactor)
    : dynamicsInteriorColor();
}
`;

const DYNAMICS_PERTURBATION_HELPERS = `
vec4 iteratedQuadraticPerturbationColor(vec2 parameterOffset, int chainMode, float brightnessFactor) {
  vec2 delta = chainMode == 7 ? vec2(0.0) : parameterOffset;
  float escapeRadius = 64.0;
  float escapeRadiusSq = escapeRadius * escapeRadius;
  float smoothIteration = float(u_chainCount);
  bool escaped = false;

  for (int i = 0; i < ${CFG.maxChainStepsGlsl}; i++) {
    if (i >= u_chainCount) break;

    vec2 reference = u_perturbationOrbit[i];
    vec2 nextReference = u_perturbationOrbit[i + 1];
    vec2 quadraticDelta = complexMul(
      u_perturbationA2,
      complexAdd(2.0 * complexMul(reference, delta), complexMul(delta, delta))
    );
    vec2 nextDelta = complexAdd(
      complexAdd(quadraticDelta, complexMul(u_perturbationA1, delta)),
      complexMul(u_perturbationCScale, parameterOffset)
    );
    vec2 nextValue = complexAdd(nextReference, nextDelta);
    float magSq = dot(nextValue, nextValue);

    if (!isFiniteVec2Compat(nextValue) || magSq > escapeRadiusSq || shouldStopDomainChain(nextValue)) {
      float magnitude = sqrt(max(magSq, escapeRadius));
      smoothIteration = float(i) + 1.0;

      if (isFiniteFloatCompat(magnitude) && magnitude > 1.0001) {
        float smoothAdjust = log(max(log(magnitude) / log(escapeRadius), 1.0e-6)) / LOG_TWO;
        smoothIteration = clamp(smoothIteration - smoothAdjust, 0.0, float(u_chainCount));
      }

      escaped = true;
      break;
    }

    delta = nextDelta;
  }

  return escaped
    ? dynamicsEscapeColor(smoothIteration, brightnessFactor)
    : dynamicsInteriorColor();
}
`;

const FRAGMENT_HELPERS = `
vec2 domainComplexSqrt(vec2 z) {
  float r = length(z);
  if (r < 1.0e-20) return vec2(0.0);
  float angle = atan(z.y, z.x) * 0.5;
  float sr = sqrt(r);
  return vec2(sr * cos(angle), sr * sin(angle));
}

vec3 inverseRotate3DCompat(vec3 p, float rotX, float rotY) {
  float cY = cos(-rotY);
  float sY = sin(-rotY);
  float cX = cos(-rotX);
  float sX = sin(-rotX);
  float x1 = p.x;
  float y1 = p.y * cX - p.z * sX;
  float z1 = p.y * sX + p.z * cX;
  return vec3(x1 * cY + z1 * sY, y1, -x1 * sY + z1 * cY);
}

vec3 safeNormalize3(vec3 value, vec3 fallbackValue) {
  float mag = length(value);
  return mag > 1.0e-7 ? value / mag : fallbackValue;
}

vec3 hslToRgb(vec3 hsl) {
  float h = fract(hsl.x);
  float s = clamp(hsl.y, 0.0, 1.0);
  float l = clamp(hsl.z, 0.0, 1.0);
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + (rgb - 0.5) * c;
}

vec3 interpolate7(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5, vec3 c6, float h) {
  float val = fract(h) * 6.0;
  if (val < 1.0) return mix(c0, c1, val);
  if (val < 2.0) return mix(c1, c2, val - 1.0);
  if (val < 3.0) return mix(c2, c3, val - 2.0);
  if (val < 4.0) return mix(c3, c4, val - 3.0);
  if (val < 5.0) return mix(c4, c5, val - 4.0);
  return mix(c5, c6, val - 5.0);
}

vec3 getPaletteColor(int paletteId, float h) {
  if (paletteId == 10) return hslToRgb(vec3(h, 1.0, 0.5));

  vec3 c0;
  vec3 c1;
  vec3 c2;
  vec3 c3;
  vec3 c4;
  vec3 c5;
  vec3 c6;
  loadPalette(paletteId, c0, c1, c2, c3, c4, c5, c6);
  return interpolate7(c0, c1, c2, c3, c4, c5, c6, h);
}

vec3 applyLightnessAndSaturation(vec3 rgb, float lightness, float saturation) {
  vec3 lit = lightness < 0.5
    ? rgb * (lightness / 0.5)
    : mix(rgb, vec3(1.0), (lightness - 0.5) / 0.5);

  float gray = dot(lit, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), lit, saturation);
}

float magnitudeLightness(float logMod, float cycles) {
  if (cycles <= 0.0001) return 0.5;
  float detail = max(0.05, cycles);
  float tone = atan(logMod * (0.72 + detail * 0.28)) / 1.5707963267948966;
  return mix(0.34, 0.72, clamp(tone, 0.0, 1.0));
}

vec4 invalidDomainColor() {
  return vec4(0.0, 0.0, 0.0, u_useSphere > 0.5 ? 0.0 : 1.0);
}

bool shouldStopDomainChain(vec2 value) {
  return max(abs(value.x), abs(value.y)) >= 1.0e18;
}

bool mapDomainValue(vec2 inputValue, vec2 parameterValue, out vec2 outputValue) {
  return evaluateMappedValueBase(
    inputValue,
    parameterValue,
    u_isWPlaneColoring,
    u_functionId,
    u_mobiusA,
    u_mobiusB,
    u_mobiusC,
    u_mobiusD,
    u_polyDegree,
    u_polyCoeffs,
    u_zetaContinuationEnabled,
    u_zetaReflectionBoundary,
    u_fracPower,
    outputValue
  );
}

void projectPlanarPixel(vec2 pixel, vec2 resolutionSafe, out vec2 zInput) {
  vec2 unit = pixel / resolutionSafe - vec2(0.5);
  zInput = vec2(
    u_viewCenter.x + unit.x * u_viewSpan.x,
    u_viewCenter.y - unit.y * u_viewSpan.y
  );
}

vec2 projectPlanarParameterOffset(vec2 pixel, vec2 resolutionSafe) {
  vec2 unit = pixel / resolutionSafe - vec2(0.5);
  return vec2(unit.x * u_viewSpan.x, -unit.y * u_viewSpan.y);
}

bool projectSpherePixel(vec2 pixel, out vec2 zInput, out float brightnessFactor) {
  brightnessFactor = 1.0;
  if (u_sphereRadius <= 0.0) return false;

  float nx = (pixel.x - u_sphereCenter.x) / u_sphereRadius;
  float ny = -(pixel.y - u_sphereCenter.y) / u_sphereRadius;
  float radialSq = nx * nx + ny * ny;
  if (radialSq > 1.0) return false;

  float pz = sqrt(max(0.0, 1.0 - radialSq));
  vec3 normalCam = vec3(nx, ny, pz);
  vec3 pointOnSphere = inverseRotate3DCompat(normalCam, u_rotX, u_rotY);

  float den = 1.0 - pointOnSphere.z;
  if (abs(den) < 1.0e-6) return false;

  zInput = vec2(pointOnSphere.x / den, pointOnSphere.y / den);

  vec3 lightDir = safeNormalize3(u_lightDir, vec3(0.0, 0.0, 1.0));
  float nDotL = dot(normalCam, lightDir);
  float diffuseFactor = max(0.0, nDotL);
  float specularFactor = 0.0;

  if (nDotL > 0.0) {
    vec3 reflected = 2.0 * nDotL * normalCam - lightDir;
    specularFactor = pow(max(0.0, reflected.z), max(1.0, u_sphereLighting.w));
  }

  float lightIntensity =
    u_sphereLighting.x +
    u_sphereLighting.y * diffuseFactor +
    u_sphereLighting.z * specularFactor;

  brightnessFactor = clamp(lightIntensity, 0.1, 1.75);
  return true;
}

bool projectPixelToDomain(vec2 pixel, vec2 resolutionSafe, out vec2 zInput, out float brightnessFactor) {
  brightnessFactor = 1.0;
  if (u_useSphere > 0.5) return projectSpherePixel(pixel, zInput, brightnessFactor);
  projectPlanarPixel(pixel, resolutionSafe, zInput);
  return true;
}

bool applyChainStep(int chainMode, vec2 baseValue, vec2 parameterValue, inout vec2 mappedValue) {
  if (chainMode == 1) {
    vec2 nextValue = vec2(0.0);
    bool ok = mapDomainValue(mappedValue, parameterValue, nextValue);
    mappedValue = nextValue;
    return ok;
  }

  if (chainMode == 2) {
    mappedValue = complexMul(mappedValue, baseValue);
    return true;
  }

  if (chainMode == 3) {
    mappedValue = domainComplexSqrt(mappedValue);
    return true;
  }

  if (chainMode == 4) {
    mappedValue = complexLn(mappedValue);
    return true;
  }

  if (chainMode == 5) {
    mappedValue = complexExp(mappedValue);
    return true;
  }

  if (chainMode == 6) {
    mappedValue = dot(mappedValue, mappedValue) < 1.0e-20
      ? vec2(0.0)
      : complexDiv(vec2(1.0, 0.0), mappedValue);
    return true;
  }

  return true;
}

bool applyConfiguredChain(inout vec2 mappedValue, vec2 parameterValue) {
  if (u_isWPlaneColoring >= 0.5 || u_chainCount <= 1) return true;

  vec2 baseValue = mappedValue;
  if (shouldStopDomainChain(mappedValue)) return true;

  for (int i = 1; i < ${CFG.maxChainStepsGlsl}; i++) {
    if (i >= u_chainCount) break;

    vec2 nextValue = mappedValue;
    if (!applyChainStep(u_chainMode, baseValue, parameterValue, nextValue)) return true;
    if (!isFiniteVec2Compat(nextValue)) return true;

    mappedValue = nextValue;
    if (shouldStopDomainChain(mappedValue)) return true;
  }

  return true;
}

bool evaluateZeroSeedChain(vec2 parameterValue, out vec2 mappedValue) {
  vec2 current = vec2(0.0);

  for (int i = 0; i < ${CFG.maxChainStepsGlsl}; i++) {
    if (i >= u_chainCount) break;
    vec2 nextValue = vec2(0.0);
    if (!mapDomainValue(current, parameterValue, nextValue)) return false;
    if (!isFiniteVec2Compat(nextValue)) return false;

    current = nextValue;
    if (shouldStopDomainChain(current)) return false;
  }

  mappedValue = current;
  return true;
}

${DYNAMICS_COLOR_HELPERS}
${DYNAMICS_PERTURBATION_HELPERS}

vec4 domainColorForValue(vec2 value, float brightnessFactor) {
  float phase = atan(value.y, value.x);
  float modValue = length(value);
  if (!isFiniteFloatCompat(modValue)) return vec4(0.0);

  float logMod = log(1.0 + modValue);
  float lightnessBase = magnitudeLightness(logMod, u_domainLightnessCycles);
  float lightnessContrasted = 0.5 + (lightnessBase - 0.5) * u_domainContrast;
  float lightnessFinal = clamp(lightnessContrasted * u_domainBrightness * brightnessFactor, 0.05, 0.95);
  float saturationFinal = clamp(u_domainSaturation, 0.0, 1.0);
  float hue = fract((phase + PI) / TWO_PI);

  vec3 baseColor = getPaletteColor(u_domainPalette, hue);
  return vec4(applyLightnessAndSaturation(baseColor, lightnessFinal, saturationFinal), 1.0);
}
`;

const FRAGMENT_MAIN = `
void main() {
  vec2 resolutionSafe = max(u_resolution, vec2(1.0, 1.0));
  vec2 pixel = vec2(v_uv.x * resolutionSafe.x, (1.0 - v_uv.y) * resolutionSafe.y);

  vec2 zInput = vec2(0.0);
  float brightnessFactor = 1.0;

  if (!projectPixelToDomain(pixel, resolutionSafe, zInput, brightnessFactor)) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 mappedValue = vec2(0.0);
  if (u_useOrbitColoring > 0.5 && u_isWPlaneColoring < 0.5 && u_chainCount > 1 && (u_chainMode == 1 || u_chainMode == 7)) {
    if (u_useDynamicsPerturbation > 0.5 && u_useSphere < 0.5) {
      gl_FragColor = iteratedQuadraticPerturbationColor(
        projectPlanarParameterOffset(pixel, resolutionSafe),
        u_chainMode,
        brightnessFactor
      );
    } else {
      gl_FragColor = iteratedDynamicsColor(zInput, u_chainMode, brightnessFactor);
    }
    return;
  }

  if (u_isWPlaneColoring < 0.5 && u_chainMode == 7) {
    if (!evaluateZeroSeedChain(zInput, mappedValue)) {
      gl_FragColor = invalidDomainColor();
      return;
    }
    gl_FragColor = domainColorForValue(mappedValue, brightnessFactor);
    return;
  }

  if (!mapDomainValue(zInput, zInput, mappedValue) || !isFiniteVec2Compat(mappedValue)) {
    gl_FragColor = invalidDomainColor();
    return;
  }

  if (!applyConfiguredChain(mappedValue, zInput)) {
    gl_FragColor = invalidDomainColor();
    return;
  }

  gl_FragColor = domainColorForValue(mappedValue, brightnessFactor);
}
`;

const SUPPORT_DEFAULTS = Object.freeze({
    available: false,
    reason: 'disabled-or-unavailable',
    warnedRuntimeFallback: false
});

const LIGHTING_UNIFORM_VALUES = Object.freeze([
    SPHERE_TEXTURE_AMBIENT_INTENSITY,
    SPHERE_TEXTURE_DIFFUSE_INTENSITY,
    SPHERE_TEXTURE_SPECULAR_INTENSITY,
    SPHERE_TEXTURE_SHININESS_FACTOR
]);

const HAS_OWN = Function.call.bind(Object.prototype.hasOwnProperty);
const ZERO_COMPLEX = Object.freeze({ re: 0, im: 0 });

function lines(...parts) {
    return parts.join('\n');
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function finiteComplex(value, fallback = ZERO_COMPLEX) {
    return {
        re: finiteNumber(value?.re, fallback.re),
        im: finiteNumber(value?.im, fallback.im)
    };
}

function isFiniteComplex(value) {
    return Number.isFinite(value?.re) && Number.isFinite(value?.im);
}

function complexAdd(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
}

function complexMul(a, b) {
    return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    };
}

function complexTermScale(value, scale) {
    return complexMul(value, scale);
}

function stateNumber(key, fallback) {
    return finite(state?.[key], fallback);
}

function enumId(table, key, fallback) {
    return HAS_OWN(table, key) ? table[key] : fallback;
}

function positivePixelSize(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.max(1, Math.round(number)) : 0;
}

function uniformInt(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function finiteRange(candidate) {
    if (!Array.isArray(candidate) || candidate.length < 2) return null;

    const start = Number(candidate[0]);
    const end = Number(candidate[1]);
    return Number.isFinite(start) && Number.isFinite(end) ? [start, end] : null;
}

function chooseRange(primary, fallback) {
    return finiteRange(primary) || finiteRange(fallback);
}

function activeTermFactor(term) {
    const factors = (term?.factors || []).filter(factor => factor && factor.func && factor.func !== 'none');
    if (factors.length !== 1) return null;

    const factor = factors[0];
    const plain =
        (!factor.chainedFunc || factor.chainedFunc === 'none') &&
        !factor.reciprocal &&
        !factor.log &&
        !factor.exp &&
        finiteNumber(factor.power ?? 1, 1) === 1;

    return plain ? factor : null;
}

function accumulateQuadraticDynamicsProfileTerm(profile, term) {
    const factor = activeTermFactor(term);
    if (!factor) return false;

    const scale = finiteComplex(term?.coeff, { re: 1, im: 0 });

    if (factor.func === 'c') {
        profile.cScale = complexAdd(profile.cScale, scale);
        profile.hasParameter = true;
        return true;
    }

    if (factor.func !== 'polynomial') return false;

    const degree = Math.max(0, Math.min(CFG.polyCoeffCount - 1, uniformInt(state?.polynomialN, 0)));
    if (degree > 2) return false;

    const coeffs = state?.polynomialCoeffs || [];
    profile.a0 = complexAdd(profile.a0, complexTermScale(finiteComplex(coeffs[0]), scale));
    profile.a1 = complexAdd(profile.a1, complexTermScale(finiteComplex(coeffs[1]), scale));
    profile.a2 = complexAdd(profile.a2, complexTermScale(finiteComplex(coeffs[2]), scale));
    profile.hasPolynomial = true;
    return true;
}

function getQuadraticDynamicsProfile() {
    if (state?.currentFunction !== 'algebraic_chaining' || !state?.algebraicChainingEnabled) return null;
    if (!Array.isArray(state.algebraicChainingTerms) || state.algebraicChainingTerms.length === 0) return null;

    const profile = {
        a0: { re: 0, im: 0 },
        a1: { re: 0, im: 0 },
        a2: { re: 0, im: 0 },
        cScale: { re: 0, im: 0 },
        hasParameter: false,
        hasPolynomial: false
    };

    for (const term of state.algebraicChainingTerms) {
        if (!accumulateQuadraticDynamicsProfileTerm(profile, term)) return null;
    }

    return profile.hasPolynomial && profile.hasParameter ? profile : null;
}

function evaluateQuadraticProfile(profile, z, c) {
    const zSq = complexMul(z, z);
    return complexAdd(
        complexAdd(
            complexAdd(complexTermScale(zSq, profile.a2), complexTermScale(z, profile.a1)),
            profile.a0
        ),
        complexTermScale(c, profile.cScale)
    );
}

function buildPerturbationOrbit(profile, center, chainMode, chainCount) {
    const orbit = new Float32Array(CFG.maxPerturbationOrbit * 2);
    const count = Math.max(1, Math.min(CFG.maxChainStepsGlsl, chainCount));
    let current = chainMode === 7 ? { re: 0, im: 0 } : center;

    for (let i = 0; i < CFG.maxPerturbationOrbit; i += 1) {
        if (!isFiniteComplex(current) || Math.max(Math.abs(current.re), Math.abs(current.im)) >= 1e18) {
            return null;
        }

        orbit[i * 2] = current.re;
        orbit[i * 2 + 1] = current.im;

        if (i < count) {
            current = evaluateQuadraticProfile(profile, current, center);
        }
    }

    return orbit;
}

function recordFromPlanes(factory) {
    return Object.fromEntries(PLANES.map((plane) => [plane, factory(plane)]));
}

function firstTruthyPlaneValue(record) {
    return PLANES.map((plane) => record?.[plane]).find(Boolean) || null;
}

function ensureRecord(owner, key) {
    if (!owner[key] || typeof owner[key] !== 'object') owner[key] = {};
    return owner[key];
}

function assignPlaneRecord(target, source) {
    for (const plane of PLANES) target[plane] = source?.[plane] || null;
    return target;
}

function glslFloat(value) {
    const number = Number.isFinite(value) ? value : 0;
    return Number.isInteger(number) ? `${number}.0` : String(number);
}

function glslVec3(rgb) {
    return `vec3(${rgb.map(glslFloat).join(', ')})`;
}

function glslPaletteWrites(stops, indent) {
    return stops.map((rgb, index) => `${indent}c${index} = ${glslVec3(rgb)};`).join('\n');
}

function glslPaletteBranch([paletteId, stops], index) {
    return lines(
        `  ${index ? 'else if' : 'if'} (paletteId == ${paletteId}) {`,
        glslPaletteWrites(stops, '    '),
        '    return;',
        '  }'
    );
}

function createPaletteLoaderSource() {
    return lines(
        'void loadPalette(int paletteId, out vec3 c0, out vec3 c1, out vec3 c2, out vec3 c3, out vec3 c4, out vec3 c5, out vec3 c6) {',
        PALETTES.map(glslPaletteBranch).join('\n'),
        glslPaletteWrites(FALLBACK_PALETTE, '  '),
        '}'
    );
}

function createFragmentSource() {
    return lines(
        FRAGMENT_UNIFORMS,
        '',
        getGLSLComplexMathLibrary(state),
        '',
        createPaletteLoaderSource(),
        '',
        FRAGMENT_HELPERS,
        '',
        FRAGMENT_MAIN
    );
}

function createCanvasAndWebGLContext() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', WEBGL_CONTEXT_ATTRIBUTES);
    return gl ? { canvas, gl } : null;
}

function createQuadBuffer(gl) {
    const buffer = gl.createBuffer();
    if (!buffer) return null;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
    return buffer;
}

function deleteRenderer(renderer) {
    const gl = renderer?.gl;
    if (!gl) return;

    if (renderer.quadBuffer) gl.deleteBuffer(renderer.quadBuffer);
    if (renderer.program) gl.deleteProgram(renderer.program);
}

function deletePlaneRenderers(renderers) {
    for (const plane of PLANES) deleteRenderer(renderers?.[plane]);
}

function collectUniformLocations(gl, program) {
    const locations = {};

    for (const [publicName, shaderName] of Object.entries(UNIFORM_ALIASES)) {
        const location = gl.getUniformLocation(program, shaderName);
        if (location === null) return null;
        locations[publicName] = location;
    }

    locations.uPolyCoeffs = Array.from(
        { length: CFG.polyCoeffCount },
        (_unused, index) => gl.getUniformLocation(program, `u_polyCoeffs[${index}]`)
    );

    return locations;
}

function buildRenderer(canvas, gl, program, quadBuffer, aPosition, uniforms) {
    return {
        canvas,
        gl,
        program,
        quadBuffer,
        aPosition,
        ...uniforms
    };
}

function liveContext(gl) {
    return !!gl && (typeof gl.isContextLost !== 'function' || !gl.isContextLost());
}

function canvas2DTarget(targetCtx) {
    return !!targetCtx
        && typeof targetCtx.save === 'function'
        && typeof targetCtx.restore === 'function'
        && typeof targetCtx.setTransform === 'function'
        && typeof targetCtx.clearRect === 'function'
        && typeof targetCtx.drawImage === 'function';
}

function resetSupportObject(support) {
    const renderers = ensureRecord(support, 'renderers');

    deletePlaneRenderers(renderers);
    Object.assign(support, SUPPORT_DEFAULTS);

    assignPlaneRecord(renderers, null);
    assignPlaneRecord(ensureRecord(support, 'diagnostics'), null);

    if (support.warnedFunctionFallbacks?.clear) support.warnedFunctionFallbacks.clear();
}

function installSupportRenderers(support, renderers, diagnostics) {
    assignPlaneRecord(ensureRecord(support, 'renderers'), renderers);
    assignPlaneRecord(ensureRecord(support, 'diagnostics'), diagnostics);

    support.available = true;
    support.reason = renderers.z && renderers.w ? 'ready' : 'partial-ready';
}

function backendLabel(diagnostics) {
    const diag = firstTruthyPlaneValue(diagnostics);
    if (!diag) return null;

    return {
        software: !!diag.softwareBackend,
        vendor: diag.unmaskedVendor || diag.vendor || 'unknown vendor',
        renderer: diag.unmaskedRenderer || diag.renderer || 'unknown renderer'
    };
}

function announceBackend(diagnostics) {
    const label = backendLabel(diagnostics);

    if (!label) {
        console.info('GPU domain coloring enabled.');
        return;
    }

    const message = `GPU domain coloring ${label.software ? 'is running on a software WebGL backend' : 'enabled on'} ${label.vendor} | ${label.renderer}.`;
    (label.software ? console.warn : console.info)(message);
}

function createCacheStringifier() {
    const seen = new WeakSet();

    return (_key, value) => {
        if (typeof value === 'bigint') return `${value}n`;
        if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;

        if (value && typeof value === 'object') {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }

        return value;
    };
}

function serializeProgramMathForCache() {
    try {
        return JSON.stringify({
            algebraic: state?.algebraicChainingTerms || [],
            dynamic: dynamicAggregateGLSLSignature(state)
        }, createCacheStringifier());
    } catch (error) {
        return `unserializable:${error?.message || String(error)}`;
    }
}

let mathRendererHashCached = '';
let mathRendererHashDirty = true;

if (typeof eventBus !== 'undefined' && eventBus.on) {
    eventBus.on('state:change', () => {
        mathRendererHashDirty = true;
    });
}

function refreshMathRendererIfNeeded() {
    if (state?.currentFunction !== 'algebraic_chaining' && !isDynamicAggregateGLSLActive(state)) return true;
    if (!webglDomainColorSupport) return false;

    if (mathRendererHashDirty) {
        mathRendererHashCached = serializeProgramMathForCache();
        mathRendererHashDirty = false;
    }
    const hash = mathRendererHashCached;
    if (webglDomainColorSupport.lastAlgHash === hash) return true;

    initializeWebGLDomainColoringSupport();
    webglDomainColorSupport.lastAlgHash = hash;
    return !!webglDomainColorSupport.available;
}

function targetSize(planeParams) {
    const width = positivePixelSize(planeParams?.width);
    const height = positivePixelSize(planeParams?.height);
    return width && height ? { width, height } : null;
}

function viewBounds(planeParams) {
    const xRange = chooseRange(planeParams?.currentVisXRange, planeParams?.xRange);
    const yRange = chooseRange(planeParams?.currentVisYRange, planeParams?.yRange);
    return xRange && yRange ? { xRange, yRange } : null;
}

function renderOptions(options) {
    return options && typeof options === 'object' ? options : EMPTY_OPTIONS;
}

function resolveRenderJob(targetCtx, planeParams, options) {
    if (!canvas2DTarget(targetCtx)) return null;

    const opts = renderOptions(options);
    const planeKey = inferDomainColorPlaneKey(targetCtx, opts.planeKey);
    const renderer = getWebGLDomainColorRenderer(planeKey);
    if (!renderer || !liveContext(renderer.gl)) return null;

    const size = targetSize(planeParams);
    const bounds = viewBounds(planeParams);
    if (!size || !bounds) return null;

    return {
        targetCtx,
        renderer,
        targetWidth: size.width,
        targetHeight: size.height,
        origin: planeParams.origin || null,
        scale: planeParams.scale || null,
        xRange: bounds.xRange,
        yRange: bounds.yRange,
        isWPlaneColoring: !!opts.isWPlaneColoring,
        sphereParams: opts.sphereParams || null
    };
}

function renderMetrics(targetWidth, targetHeight) {
    const scale = getWebGLDomainColorRenderScale();
    const internalWidth = Math.max(1, Math.round(targetWidth * scale));
    const internalHeight = Math.max(1, Math.round(targetHeight * scale));
    const scaleX = internalWidth / targetWidth;
    const scaleY = internalHeight / targetHeight;

    return {
        internalWidth,
        internalHeight,
        scaleX,
        scaleY,
        uniformScale: Math.min(scaleX, scaleY)
    };
}

function bindPipeline(gl, renderer) {
    gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height);
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
    gl.enableVertexAttribArray(renderer.aPosition);
    gl.vertexAttribPointer(renderer.aPosition, 2, gl.FLOAT, false, 0, 0);
}

function resolveSphere(sphereParams, job, metrics) {
    if (!sphereParams) {
        return {
            enabled: false,
            centerX: metrics.internalWidth * 0.5,
            centerY: metrics.internalHeight * 0.5,
            radius: 0,
            rotX: 0,
            rotY: 0
        };
    }

    const centerX = finite(sphereParams.centerX, job.targetWidth * 0.5);
    const centerY = finite(sphereParams.centerY, job.targetHeight * 0.5);
    const radius = finite(sphereParams.radius, 0);

    return {
        enabled: true,
        centerX: centerX * metrics.scaleX,
        centerY: centerY * metrics.scaleY,
        radius: Math.max(0, radius) * metrics.uniformScale,
        rotX: finite(sphereParams.rotX, 0),
        rotY: finite(sphereParams.rotY, 0)
    };
}

function resolvePlanarView(job) {
    const scaleX = finiteNumber(job.scale?.x, 0);
    const scaleY = finiteNumber(job.scale?.y, 0);
    const originX = finiteNumber(job.origin?.x, NaN);
    const originY = finiteNumber(job.origin?.y, NaN);

    if (scaleX > 0 && scaleY > 0 && Number.isFinite(originX) && Number.isFinite(originY)) {
        return {
            centerX: (job.targetWidth * 0.5 - originX) / scaleX,
            centerY: (originY - job.targetHeight * 0.5) / scaleY,
            spanX: job.targetWidth / scaleX,
            spanY: job.targetHeight / scaleY
        };
    }

    return {
        centerX: (job.xRange[0] + job.xRange[1]) * 0.5,
        centerY: (job.yRange[0] + job.yRange[1]) * 0.5,
        spanX: job.xRange[1] - job.xRange[0],
        spanY: job.yRange[1] - job.yRange[0]
    };
}

function uploadFrameUniforms(gl, renderer, job) {
    const view = resolvePlanarView(job);

    gl.uniform2f(renderer.uResolution, renderer.canvas.width, renderer.canvas.height);
    gl.uniform2f(renderer.uViewCenter, view.centerX, view.centerY);
    gl.uniform2f(renderer.uViewSpan, view.spanX, view.spanY);
}

function uploadDomainStyleUniforms(gl, renderer) {
    for (const [uniformKey, stateKey, fallback] of DOMAIN_FLOAT_UNIFORMS) {
        gl.uniform1f(renderer[uniformKey], stateNumber(stateKey, fallback));
    }

    gl.uniform1i(renderer.uDomainPalette, enumId(DOMAIN_PALETTE_IDS, state?.domainPalette, 0));
}

function uploadSphereUniforms(gl, renderer, job, metrics) {
    const sphere = resolveSphere(job.sphereParams, job, metrics);

    gl.uniform1f(renderer.uUseSphere, sphere.enabled ? 1 : 0);
    gl.uniform2f(renderer.uSphereCenter, sphere.centerX, sphere.centerY);
    gl.uniform1f(renderer.uSphereRadius, sphere.radius);
    gl.uniform1f(renderer.uRotX, sphere.rotX);
    gl.uniform1f(renderer.uRotY, sphere.rotY);
}

function uploadLightingUniforms(gl, renderer) {
    const { x, y, z } = getNormalizedSphereLightDirection();

    gl.uniform3f(renderer.uLightDir, x, y, z);
    gl.uniform4f(
        renderer.uSphereLighting,
        finiteNumber(LIGHTING_UNIFORM_VALUES[0], 0),
        finiteNumber(LIGHTING_UNIFORM_VALUES[1], 0),
        finiteNumber(LIGHTING_UNIFORM_VALUES[2], 0),
        finiteNumber(LIGHTING_UNIFORM_VALUES[3], 1)
    );
}

function uploadChainingUniforms(gl, renderer) {
    const enabled = !!state?.chainingEnabled;
    const chainCount = enabled
        ? Math.max(1, Math.min(CFG.maxChainStepsGlsl, uniformInt(state.chainCount, 1)))
        : 1;
    const chainMode = enabled ? enumId(CHAIN_MODE_IDS, state.chainingMode, 1) : 0;

    gl.uniform1i(renderer.uChainCount, chainCount);
    gl.uniform1i(renderer.uChainMode, chainMode);
    gl.uniform1f(renderer.uUseOrbitColoring, state?.fractalOrbitColoringEnabled ? 1 : 0);
}

function uploadComplexUniform(gl, location, value) {
    gl.uniform2f(location, finiteNumber(value?.re, 0), finiteNumber(value?.im, 0));
}

function shouldUseQuadraticPerturbation(job, chainMode, chainCount) {
    return !job.isWPlaneColoring &&
        state?.fractalOrbitColoringEnabled &&
        !job.sphereParams &&
        chainCount > 1 &&
        (chainMode === CHAIN_MODE_IDS.recursion || chainMode === CHAIN_MODE_IDS.zero_seed);
}

function uploadDynamicsPerturbationUniforms(gl, renderer, job) {
    const enabled = !!state?.chainingEnabled;
    const chainCount = enabled ? Math.max(1, Math.min(CFG.maxChainStepsGlsl, uniformInt(state.chainCount, 1))) : 1;
    const chainMode = enabled ? enumId(CHAIN_MODE_IDS, state.chainingMode, 1) : 0;
    const profile = shouldUseQuadraticPerturbation(job, chainMode, chainCount)
        ? getQuadraticDynamicsProfile()
        : null;

    if (!profile) {
        gl.uniform1f(renderer.uUseDynamicsPerturbation, 0);
        return;
    }

    const view = resolvePlanarView(job);
    const center = { re: view.centerX, im: view.centerY };
    const orbit = buildPerturbationOrbit(profile, center, chainMode, chainCount);
    if (!orbit) {
        gl.uniform1f(renderer.uUseDynamicsPerturbation, 0);
        return;
    }

    uploadComplexUniform(gl, renderer.uPerturbationA1, profile.a1);
    uploadComplexUniform(gl, renderer.uPerturbationA2, profile.a2);
    uploadComplexUniform(gl, renderer.uPerturbationCScale, profile.cScale);
    gl.uniform2fv(renderer.uPerturbationOrbit, orbit);
    gl.uniform1f(renderer.uUseDynamicsPerturbation, 1);
}

function uploadRenderUniforms(gl, renderer, job, metrics) {
    uploadFrameUniforms(gl, renderer, job);
    uploadDomainStyleUniforms(gl, renderer);
    uploadSphereUniforms(gl, renderer, job, metrics);
    uploadLightingUniforms(gl, renderer);
    gl.uniform1f(renderer.uIsWPlaneColoring, job.isWPlaneColoring ? 1 : 0);
    setComplexFunctionUniformsShared(gl, renderer, state);
    uploadChainingUniforms(gl, renderer);
    uploadDynamicsPerturbationUniforms(gl, renderer, job);
}

function draw(gl) {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function copyToTarget(renderer, job) {
    const ctx = job.targetCtx;

    ctx.save();
    try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, job.targetWidth, job.targetHeight);
        ctx.drawImage(
            renderer.canvas,
            0, 0, renderer.canvas.width, renderer.canvas.height,
            0, 0, job.targetWidth, job.targetHeight
        );
    } finally {
        ctx.restore();
    }
}

function executeRenderJob(job) {
    const metrics = renderMetrics(job.targetWidth, job.targetHeight);
    const { renderer } = job;
    const { gl } = renderer;

    resizeWebGLDomainColorRenderer(renderer, metrics.internalWidth, metrics.internalHeight);
    bindPipeline(gl, renderer);
    uploadRenderUniforms(gl, renderer, job, metrics);
    draw(gl);
    copyToTarget(renderer, job);

    return true;
}

function domainRenderersAvailable(renderers) {
    return PLANES.some((plane) => !!renderers[plane]);
}

function currentFunctionSupported(functionName, isWPlaneColoring) {
    if (isWebGLDomainColoringFunctionSupported(functionName, isWPlaneColoring)) return true;

    warnWebGLDomainFunctionFallback(functionName);
    return false;
}

export function getWebGLDomainColorRenderScale() {
    const baseScale = finite(WEBGL_DOMAIN_COLOR_SUPERSAMPLE, CFG.defaultSupersample);
    const stressScale = finite(WEBGL_DOMAIN_COLOR_STRESS_SCALE, CFG.defaultStressScale);
    const requestedScale = state?.webglGpuStressMode ? Math.max(baseScale, stressScale) : baseScale;
    const dpr = finite(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1);
    const dprBoost = clamp(dpr * CFG.dprScaleFactor, 1, CFG.maxDprBoost);

    return clamp(requestedScale * dprBoost, 1, CFG.maxRenderScale);
}

export function createWebGLDomainColorRenderer() {
    const contextBundle = createCanvasAndWebGLContext();
    if (!contextBundle) return null;

    const { canvas, gl } = contextBundle;
    const program = createWebGLProgramShared(gl, VERTEX_SOURCE, createFragmentSource());
    if (!program) return null;

    const quadBuffer = createQuadBuffer(gl);
    if (!quadBuffer) {
        gl.deleteProgram(program);
        return null;
    }

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uniforms = collectUniformLocations(gl, program);
    if (aPosition < 0 || !uniforms) {
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(program);
        return null;
    }

    return buildRenderer(canvas, gl, program, quadBuffer, aPosition, uniforms);
}

export function isWebGLDomainColoringFunctionSupported(functionName, isWPlaneColoring = false) {
    if (!isWPlaneColoring && isDynamicAggregateGLSLActive(state)) {
        const compiled = buildDynamicAggregateGLSL(
            state,
            name => getWebGLDomainColorFunctionIdShared(name, true)
        );
        return Boolean(compiled.source && !compiled.error);
    }
    return !!isWPlaneColoring || getWebGLDomainColorFunctionIdShared(functionName) !== 0;
}

export function resizeWebGLDomainColorRenderer(renderer, width, height) {
    if (!renderer?.canvas) return;

    const nextWidth = positivePixelSize(width);
    const nextHeight = positivePixelSize(height);
    if (!nextWidth || !nextHeight) return;

    if (renderer.canvas.width !== nextWidth || renderer.canvas.height !== nextHeight) {
        renderer.canvas.width = nextWidth;
        renderer.canvas.height = nextHeight;
    }
}

export function getNormalizedSphereLightDirection() {
    const lx = finiteNumber(SPHERE_LIGHT_DIRECTION_CAMERA?.x, 0);
    const ly = finiteNumber(SPHERE_LIGHT_DIRECTION_CAMERA?.y, 0);
    const lz = finiteNumber(SPHERE_LIGHT_DIRECTION_CAMERA?.z, 1);
    const magnitude = Math.hypot(lx, ly, lz);

    return Number.isFinite(magnitude) && magnitude >= 1e-9
        ? { x: lx / magnitude, y: ly / magnitude, z: lz / magnitude }
        : { x: 0, y: 0, z: 1 };
}

export function initializeWebGLDomainColoringSupport() {
    if (!webglDomainColorSupport) return;

    resetSupportObject(webglDomainColorSupport);

    if (!state?.webglDomainColoringEnabled) {
        webglDomainColorSupport.reason = 'disabled';
        return;
    }

    const renderers = recordFromPlanes(createWebGLDomainColorRenderer);
    if (!domainRenderersAvailable(renderers)) {
        webglDomainColorSupport.reason = 'context-or-program-init-failed';
        console.info('GPU domain coloring unavailable, using CPU fallback.');
        return;
    }

    const diagnostics = recordFromPlanes((plane) => (
        renderers[plane] ? getWebGLBackendInfoShared(renderers[plane].gl) : null
    ));

    installSupportRenderers(webglDomainColorSupport, renderers, diagnostics);
    announceBackend(diagnostics);
}

export function getWebGLDomainColorRenderer(planeKey) {
    return PLANE_KEYS.has(planeKey) ? webglDomainColorSupport?.renderers?.[planeKey] || null : null;
}

export function inferDomainColorPlaneKey(targetCtx, planeKeyHint) {
    if (planeKeyHint === 'z' || planeKeyHint === 'w') return planeKeyHint;
    if (targetCtx === context.zDomainColorCtx) return 'z';
    if (targetCtx === context.wDomainColorCtx) return 'w';
    return 'z';
}

export function warnWebGLDomainFunctionFallback(functionName) {
    const warned = webglDomainColorSupport?.warnedFunctionFallbacks;
    if (!warned?.has || !warned?.add || warned.has(functionName)) return;

    warned.add(functionName);
    console.info(`GPU domain coloring not available for "${functionName}", using CPU fallback.`);
}

export function renderDomainColoringWithWebGL(targetCtx, planeParams, options = null) {
    if (!targetCtx || !planeParams || !webglDomainColorSupport?.available) return false;
    if (!state?.webglDomainColoringEnabled) return false;
    if (!refreshMathRendererIfNeeded()) return false;

    const job = resolveRenderJob(targetCtx, planeParams, options);
    if (!job) return false;
    if (!currentFunctionSupported(state.currentFunction, job.isWPlaneColoring)) return false;

    return executeRenderJob(job);
}

export function getGPUBackendStatus() {
    const lineDiag = context.webglSupport || null;
    const domainDiag = context.webglDomainColorSupport || null;
    const currentFunctionName = state?.currentFunction || null;

    return {
        lineRendering: lineDiag ? {
            available: !!lineDiag.available,
            reason: lineDiag.reason,
            diagnostics: lineDiag.diagnostics || null
        } : null,
        domainColoring: domainDiag ? {
            available: !!domainDiag.available,
            reason: domainDiag.reason,
            diagnostics: domainDiag.diagnostics || null,
            currentFunction: currentFunctionName,
            currentFunctionSupported: currentFunctionName
                ? isWebGLDomainColoringFunctionSupported(currentFunctionName, false)
                : null,
            zetaContinuationEnabled: !!state?.zetaContinuationEnabled
        } : null
    };
}

if (typeof window !== 'undefined') {
    window.getGPUBackendStatus = getGPUBackendStatus;
}

export function getThreeSphereShaderConfig(planeType) {
    const isWPlane = planeType === 'w';

    const uniformsDecl = `
        precision highp float;
        varying vec3 vLocalPosition;

        uniform float u_domainBrightness;
        uniform float u_domainContrast;
        uniform float u_domainSaturation;
        uniform float u_domainLightnessCycles;
        uniform int u_domainPalette;

        uniform float u_isWPlaneColoring;
        uniform float u_functionId;
        uniform vec2 u_mobiusA;
        uniform vec2 u_mobiusB;
        uniform vec2 u_mobiusC;
        uniform vec2 u_mobiusD;
        uniform int u_polyDegree;
        uniform vec2 u_polyCoeffs[11];
        uniform float u_zetaContinuationEnabled;
        uniform float u_zetaReflectionBoundary;
        uniform float u_fracPower;
        uniform int u_chainCount;
        uniform int u_chainMode;
        uniform float u_useOrbitColoring;
    `;

    const fragmentHelpers = `
        vec2 domainComplexSqrt(vec2 z) {
          float r = length(z);
          if (r < 1.0e-20) return vec2(0.0);
          float angle = atan(z.y, z.x) * 0.5;
          float sr = sqrt(r);
          return vec2(sr * cos(angle), sr * sin(angle));
        }

        vec3 hslToRgb(vec3 hsl) {
          float h = fract(hsl.x);
          float s = clamp(hsl.y, 0.0, 1.0);
          float l = clamp(hsl.z, 0.0, 1.0);
          float c = (1.0 - abs(2.0 * l - 1.0)) * s;
          vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return l + (rgb - 0.5) * c;
        }

        vec3 interpolate7(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5, vec3 c6, float h) {
          float val = fract(h) * 6.0;
          if (val < 1.0) return mix(c0, c1, val);
          if (val < 2.0) return mix(c1, c2, val - 1.0);
          if (val < 3.0) return mix(c2, c3, val - 2.0);
          if (val < 4.0) return mix(c3, c4, val - 3.0);
          if (val < 5.0) return mix(c4, c5, val - 4.0);
          return mix(c5, c6, val - 5.0);
        }

        vec3 getPaletteColor(int paletteId, float h) {
          if (paletteId == 10) return hslToRgb(vec3(h, 1.0, 0.5));
          vec3 c0; vec3 c1; vec3 c2; vec3 c3; vec3 c4; vec3 c5; vec3 c6;
          loadPalette(paletteId, c0, c1, c2, c3, c4, c5, c6);
          return interpolate7(c0, c1, c2, c3, c4, c5, c6, h);
        }

        vec3 applyLightnessAndSaturation(vec3 rgb, float lightness, float saturation) {
          vec3 lit = lightness < 0.5
            ? rgb * (lightness / 0.5)
            : mix(rgb, vec3(1.0), (lightness - 0.5) / 0.5);
          float gray = dot(lit, vec3(0.299, 0.587, 0.114));
          return mix(vec3(gray), lit, saturation);
        }

        float magnitudeLightness(float logMod, float cycles) {
          if (cycles <= 0.0001) return 0.5;
          float detail = max(0.05, cycles);
          float tone = atan(logMod * (0.72 + detail * 0.28)) / 1.5707963267948966;
          return mix(0.34, 0.72, clamp(tone, 0.0, 1.0));
        }

        bool mapDomainValue(vec2 inputValue, vec2 parameterValue, out vec2 outputValue) {
          return evaluateMappedValueBase(
            inputValue,
            parameterValue,
            u_isWPlaneColoring,
            u_functionId,
            u_mobiusA,
            u_mobiusB,
            u_mobiusC,
            u_mobiusD,
            u_polyDegree,
            u_polyCoeffs,
            u_zetaContinuationEnabled,
            u_zetaReflectionBoundary,
            u_fracPower,
            outputValue
          );
        }

        bool shouldStopDomainChain(vec2 value) {
          return max(abs(value.x), abs(value.y)) >= 1.0e18;
        }

        bool applyChainStep(int chainMode, vec2 baseValue, vec2 parameterValue, inout vec2 mappedValue) {
          if (chainMode == 1) {
            vec2 nextValue = vec2(0.0);
            bool ok = mapDomainValue(mappedValue, parameterValue, nextValue);
            mappedValue = nextValue;
            return ok;
          }
          if (chainMode == 2) { mappedValue = complexMul(mappedValue, baseValue); return true; }
          if (chainMode == 3) { mappedValue = domainComplexSqrt(mappedValue); return true; }
          if (chainMode == 4) { mappedValue = complexLn(mappedValue); return true; }
          if (chainMode == 5) { mappedValue = complexExp(mappedValue); return true; }
          if (chainMode == 6) {
            mappedValue = dot(mappedValue, mappedValue) < 1.0e-20
              ? vec2(0.0)
              : complexDiv(vec2(1.0, 0.0), mappedValue);
            return true;
          }
          return true;
        }

        bool applyConfiguredChain(inout vec2 mappedValue, vec2 parameterValue) {
          if (u_isWPlaneColoring >= 0.5 || u_chainCount <= 1) return true;
          vec2 baseValue = mappedValue;
          if (shouldStopDomainChain(mappedValue)) return true;

          for (int i = 1; i < ${CFG.maxChainStepsGlsl}; i++) {
            if (i >= u_chainCount) break;
            vec2 nextValue = mappedValue;
            if (!applyChainStep(u_chainMode, baseValue, parameterValue, nextValue)) return true;
            if (!isFiniteVec2Compat(nextValue)) return true;

            mappedValue = nextValue;
            if (shouldStopDomainChain(mappedValue)) return true;
          }
          return true;
        }

        bool evaluateZeroSeedChain(vec2 parameterValue, out vec2 mappedValue) {
          vec2 current = vec2(0.0);

          for (int i = 0; i < ${CFG.maxChainStepsGlsl}; i++) {
            if (i >= u_chainCount) break;
            vec2 nextValue = vec2(0.0);
            if (!mapDomainValue(current, parameterValue, nextValue)) return false;
            if (!isFiniteVec2Compat(nextValue)) return false;

            current = nextValue;
            if (shouldStopDomainChain(current)) return false;
          }
          mappedValue = current;
          return true;
        }

        ${DYNAMICS_COLOR_HELPERS}

        vec4 domainColorForValue(vec2 value, float brightnessFactor) {
          float phase = atan(value.y, value.x);
          float modValue = length(value);
          if (!isFiniteFloatCompat(modValue)) return vec4(0.0, 0.0, 0.0, 1.0);

          float logMod = log(1.0 + modValue);
          float lightnessBase = magnitudeLightness(logMod, u_domainLightnessCycles);
          float lightnessContrasted = 0.5 + (lightnessBase - 0.5) * u_domainContrast;
          float lightnessFinal = clamp(lightnessContrasted * u_domainBrightness * brightnessFactor, 0.05, 0.95);
          float saturationFinal = clamp(u_domainSaturation, 0.0, 1.0);
          float hue = fract((phase + 3.141592653589793) / 6.283185307179586);

          vec3 baseColor = getPaletteColor(u_domainPalette, hue);
          return vec4(applyLightnessAndSaturation(baseColor, lightnessFinal, saturationFinal), 1.0);
        }
    `;

    const mainSource = `
        void main() {
            float R = 5.0;
            float den = 2.0 * R - vLocalPosition.y;
            if (abs(den) < 1e-6) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            
            vec2 zInput = vec2(vLocalPosition.x / den, vLocalPosition.z / den);
            
            vec2 mappedValue = vec2(0.0);
            if (u_useOrbitColoring > 0.5 && u_isWPlaneColoring < 0.5 && u_chainCount > 1 && (u_chainMode == 1 || u_chainMode == 7)) {
                gl_FragColor = iteratedDynamicsColor(zInput, u_chainMode, 1.0);
                return;
            }

            if (u_isWPlaneColoring < 0.5 && u_chainMode == 7) {
                if (!evaluateZeroSeedChain(zInput, mappedValue)) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                gl_FragColor = domainColorForValue(mappedValue, 1.0);
                return;
            }

            if (!mapDomainValue(zInput, zInput, mappedValue) || !isFiniteVec2Compat(mappedValue)) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            
            if (!applyConfiguredChain(mappedValue, zInput)) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            
            gl_FragColor = domainColorForValue(mappedValue, 1.0);
        }
    `;

    const fragmentShader = lines(
        uniformsDecl,
        '',
        getGLSLComplexMathLibrary(state),
        '',
        createPaletteLoaderSource(),
        '',
        fragmentHelpers,
        '',
        mainSource
    );

    const vertexShader = `
        varying vec3 vLocalPosition;
        void main() {
            vLocalPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const uniforms = {
        u_domainBrightness: { value: 1.0 },
        u_domainContrast: { value: 1.0 },
        u_domainSaturation: { value: 1.0 },
        u_domainLightnessCycles: { value: 0.0 },
        u_domainPalette: { value: 0 },
        u_isWPlaneColoring: { value: isWPlane ? 1.0 : 0.0 },
        u_functionId: { value: 0.0 },
        u_mobiusA: { value: [1.0, 0.0] },
        u_mobiusB: { value: [0.0, 0.0] },
        u_mobiusC: { value: [0.0, 0.0] },
        u_mobiusD: { value: [1.0, 0.0] },
        u_polyDegree: { value: 0 },
        u_polyCoeffs: { value: Array.from({ length: 11 }, () => [0.0, 0.0]) },
        u_zetaContinuationEnabled: { value: 0.0 },
        u_zetaReflectionBoundary: { value: 0.5 },
        u_fracPower: { value: 0.5 },
        u_chainCount: { value: 1 },
        u_chainMode: { value: 1 },
        u_useOrbitColoring: { value: 0.0 }
    };

    return {
        uniforms,
        vertexShader,
        fragmentShader
    };
}
