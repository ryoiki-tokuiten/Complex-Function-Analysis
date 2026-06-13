import { state, zPlaneParams } from '../store/state.js';
import { computeTaylorSeriesCoefficients } from '../math-utils.js';
import {
  GLSL_COMPLEX_MATH_LIBRARY_BASE,
  createWebGLProgramShared,
  getWebGLBackendInfoShared,
  getWebGLDomainColorFunctionIdShared,
  setComplexFunctionUniformsShared
} from './webgl-shared.js';
import {
  buildDynamicAggregateGLSL,
  dynamicAggregateGLSLSignature,
  isDynamicAggregateGLSLActive
} from '../math/expression/glsl.js';
import {
  getBranchWindowLabel,
  getSurfaceComponentLabel,
  getVisibleBranchIndices,
  surfaceStageHasBranches
} from '../analysis/riemann-surface.js';

const DEFAULT_CAMERA = Object.freeze({ rotX: -0.82, rotY: 0.62, distance: 3.8 });

const LIMITS = Object.freeze({
  minStage: 1,
  maxStage: 25,
  minResolution: 42,
  maxResolution: 254,
  resolutionBase: 128,
  resolutionScale: 6,
  minDistance: 0.001,
  maxDistance: 100,
  maxPixelRatio: 4,
  branchCutPixels: 0.8,
  minBranchCutWidth: 1.0e-7,
  minHeightClip: 1.0e-7
});

const CHAIN_MODE_IDS = Object.freeze({
  recursion: 1,
  power: 2,
  sqrt: 3,
  ln: 4,
  exp: 5,
  reciprocal: 6
});

const SURFACE_COMPONENT_IDS = Object.freeze({
  real: 1,
  imaginary: 2,
  magnitude: 3,
  phase: 4
});

const PALETTE_IDS = Object.freeze({
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

const PALETTE_STOPS = Object.freeze({
  0: [
    [0.68, 0.12, 0.12],
    [0.60, 0.60, 0.11],
    [0.11, 0.60, 0.11],
    [0.11, 0.60, 0.60],
    [0.135, 0.135, 0.765],
    [0.68, 0.12, 0.68],
    [0.68, 0.12, 0.12]
  ],
  1: [
    [0.059, 0.090, 0.165],
    [0.012, 0.412, 0.631],
    [0.055, 0.647, 0.914],
    [0.220, 0.741, 0.973],
    [0.055, 0.647, 0.914],
    [0.012, 0.412, 0.631],
    [0.059, 0.090, 0.165]
  ],
  2: [
    [0.118, 0.106, 0.294],
    [0.345, 0.110, 0.529],
    [0.576, 0.200, 0.918],
    [0.882, 0.114, 0.282],
    [0.576, 0.200, 0.918],
    [0.345, 0.110, 0.529],
    [0.118, 0.106, 0.294]
  ],
  3: [
    [0.024, 0.306, 0.231],
    [0.016, 0.471, 0.341],
    [0.063, 0.725, 0.506],
    [0.204, 0.827, 0.600],
    [0.063, 0.725, 0.506],
    [0.016, 0.471, 0.341],
    [0.024, 0.306, 0.231]
  ],
  4: [
    [0.059, 0.090, 0.165],
    [0.118, 0.161, 0.231],
    [0.231, 0.510, 0.965],
    [0.576, 0.773, 0.992],
    [0.231, 0.510, 0.965],
    [0.118, 0.161, 0.231],
    [0.059, 0.090, 0.165]
  ],
  5: [
    [0.180, 0.204, 0.251],
    [0.298, 0.337, 0.416],
    [0.369, 0.506, 0.675],
    [0.706, 0.557, 0.678],
    [0.369, 0.506, 0.675],
    [0.298, 0.337, 0.416],
    [0.180, 0.204, 0.251]
  ],
  6: [
    [0.157, 0.157, 0.157],
    [0.314, 0.286, 0.271],
    [0.843, 0.600, 0.129],
    [0.694, 0.384, 0.525],
    [0.843, 0.600, 0.129],
    [0.314, 0.286, 0.271],
    [0.157, 0.157, 0.157]
  ],
  7: [
    [0.102, 0.063, 0.145],
    [0.180, 0.137, 0.235],
    [0.494, 0.341, 0.761],
    [0.702, 0.616, 0.859],
    [0.494, 0.341, 0.761],
    [0.180, 0.137, 0.235],
    [0.102, 0.063, 0.145]
  ],
  8: [
    [0.039, 0.039, 0.039],
    [0.149, 0.149, 0.149],
    [0.322, 0.322, 0.322],
    [0.451, 0.451, 0.451],
    [0.322, 0.322, 0.322],
    [0.149, 0.149, 0.149],
    [0.039, 0.039, 0.039]
  ],
  9: [
    [0.110, 0.098, 0.090],
    [0.471, 0.208, 0.059],
    [0.882, 0.114, 0.282],
    [0.996, 0.643, 0.686],
    [0.882, 0.114, 0.282],
    [0.471, 0.208, 0.059],
    [0.110, 0.098, 0.090]
  ],
  11: [
    [0.851, 0.773, 0.757],
    [0.769, 0.545, 0.502],
    [0.792, 0.576, 0.522],
    [0.922, 0.863, 0.824],
    [0.608, 0.443, 0.412],
    [0.584, 0.416, 0.388],
    [0.851, 0.773, 0.757]
  ],
  12: [
    [0.765, 0.710, 0.859],
    [0.541, 0.420, 0.784],
    [0.576, 0.443, 0.831],
    [0.863, 0.784, 1.0],
    [0.702, 0.600, 1.0],
    [0.667, 0.576, 0.953],
    [0.765, 0.710, 0.859]
  ],
  13: [
    [0.608, 0.741, 0.655],
    [0.243, 0.561, 0.467],
    [0.302, 0.635, 0.537],
    [0.784, 0.961, 0.863],
    [0.718, 0.949, 0.314],
    [0.659, 0.875, 0.243],
    [0.608, 0.741, 0.655]
  ]
});

const FALLBACK_PALETTE_STOPS = PALETTE_STOPS[9];

const UNIFORM_NAMES = Object.freeze({
  uViewBounds: 'u_viewBounds',
  uModelView: 'u_modelView',
  uProjection: 'u_projection',
  uFunctionId: 'u_functionId',
  uMobiusA: 'u_mobiusA',
  uMobiusB: 'u_mobiusB',
  uMobiusC: 'u_mobiusC',
  uMobiusD: 'u_mobiusD',
  uPolyDegree: 'u_polyDegree',
  uZetaCont: 'u_zetaContinuationEnabled',
  uZetaRefl: 'u_zetaReflectionBoundary',
  uFracPower: 'u_fracPower',
  uStage: 'u_stage',
  uChainMode: 'u_chainMode',
  uBranchIndex: 'u_branchIndex',
  uBranchCutWidth: 'u_branchCutWidth',
  uSurfaceComponent: 'u_surfaceComponent',
  uHeightScale: 'u_heightScale',
  uHeightClip: 'u_heightClip',
  uDomainStep: 'u_domainStep',
  uNormalizedStep: 'u_normalizedStep',
  uSheetTint: 'u_sheetTint',
  uDomainBrightness: 'u_domainBrightness',
  uDomainContrast: 'u_domainContrast',
  uDomainSaturation: 'u_domainSaturation',
  uDomainLightnessCycles: 'u_domainLightnessCycles',
  uDomainPalette: 'u_domainPalette',
  uWirePass: 'u_wirePass',
  uUseTaylor: 'u_useTaylor',
  uTaylorCenter: 'u_taylorCenter',
  uTaylorOrder: 'u_taylorOrder'
});

const ARRAY_UNIFORMS = Object.freeze([
  { key: 'uPolyCoeffs', name: 'u_polyCoeffs', length: 11 },
  { key: 'uTaylorCoefficients', name: 'u_taylorCoefficients', length: 9 }
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function finiteInteger(value, fallback = 0) {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function tableValue(table, key, fallback) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : fallback;
}

function glslNumber(value) {
  return finiteNumber(value).toFixed(10);
}

function getChainModeId(mode) {
  return tableValue(CHAIN_MODE_IDS, mode, CHAIN_MODE_IDS.recursion);
}

function getSurfaceComponentId(component) {
  return tableValue(SURFACE_COMPONENT_IDS, component, SURFACE_COMPONENT_IDS.imaginary);
}

function getPaletteId(palette) {
  return tableValue(PALETTE_IDS, palette, PALETTE_IDS['analytic-base']);
}

function normalizeStage(stage) {
  return clamp(finiteInteger(stage, LIMITS.minStage), LIMITS.minStage, LIMITS.maxStage);
}

function normalizeResolution(gridDensity) {
  const requested = LIMITS.resolutionBase + finiteInteger(gridDensity, 15) * LIMITS.resolutionScale;
  return clamp(requested, LIMITS.minResolution, LIMITS.maxResolution);
}

function readRange(range, fallbackMin, fallbackMax) {
  return Array.isArray(range) && range.length >= 2
    ? [finiteNumber(range[0], fallbackMin), finiteNumber(range[1], fallbackMax)]
    : [fallbackMin, fallbackMax];
}

function complexOrZero(value) {
  return value && typeof value === 'object'
    ? { re: finiteNumber(value.re), im: finiteNumber(value.im) }
    : { re: 0, im: 0 };
}

function emitVec3(rgb) {
  return `vec3(${rgb.map(channel => Number(channel).toFixed(3)).join(', ')})`;
}

function emitPaletteAssignments(stops) {
  return stops.map((stop, index) => `    c${index} = ${emitVec3(stop)};`).join('\n');
}

function emitPaletteBranches() {
  const branches = Object.keys(PALETTE_STOPS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((paletteId, index) => {
      const prefix = index === 0 ? 'if' : 'else if';

      return `  ${prefix} (paletteId == ${paletteId}) {
${emitPaletteAssignments(PALETTE_STOPS[paletteId])}
  }`;
    });

  branches.push(`  else {
${emitPaletteAssignments(FALLBACK_PALETTE_STOPS)}
  }`);

  return branches.join(' ');
}

function emitAlgebraicFactor(factor) {
  if (!factor || !factor.func || factor.func === 'none') return '';

  const chainedId = getWebGLDomainColorFunctionIdShared(factor.chainedFunc);
  const functionId = getWebGLDomainColorFunctionIdShared(factor.func);
  const factorPower = finiteNumber(factor.power, 1);
  const usesBranchPower = Math.abs(factorPower - Math.round(factorPower)) >= 1e-9;
  const powerBranch = usesBranchPower ? 'branchIndex' : '0.0';
  const powerCut = usesBranchPower ? 'branchCutWidth' : '0.0';

  const steps = [
    '      {',
    '        vec2 factorValue = z;',
    '        vec2 tempValue = vec2(0.0);'
  ];

  if (chainedId) {
    steps.push(
      `        if (!evaluateBasicOnSheet(float(${chainedId}), factorValue, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, tempValue)) return false;`,
      '        factorValue = tempValue;'
    );
  }

  steps.push(
    `        if (!evaluateBasicOnSheet(float(${functionId}), factorValue, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, tempValue)) return false;`,
    '        factorValue = tempValue;'
  );

  if (factorPower !== 1) {
    steps.push(
      `        if (!complexPowRealOnSheet(factorValue, ${glslNumber(factorPower)}, ${powerBranch}, ${powerCut}, tempValue)) return false;`,
      '        factorValue = tempValue;'
    );
  }

  if (factor.reciprocal) {
    steps.push(
      '        if (dot(factorValue, factorValue) < 1.0e-20) return false;',
      '        factorValue = complexDiv(vec2(1.0, 0.0), factorValue);'
    );
  }

  if (factor.log) {
    steps.push(
      '        if (!complexLnOnSheet(factorValue, branchIndex, branchCutWidth, tempValue)) return false;',
      '        factorValue = tempValue;'
    );
  }

  if (factor.exp) {
    steps.push('        factorValue = complexExp(factorValue);');
  }

  steps.push('        termValue = complexMul(termValue, factorValue);', '      }');
  return steps.join('\n');
}

function emitAlgebraicTerm(term, termIndex) {
  const coefficient = complexOrZero(term && term.coeff);
  const factors = Array.isArray(term && term.factors) ? term.factors : [];
  const factorBody = factors.map(emitAlgebraicFactor).filter(Boolean).join('\n');

  return `    {
      vec2 termValue = vec2(${glslNumber(coefficient.re)}, ${glslNumber(coefficient.im)});
${factorBody}
      sum = complexAdd(sum, termValue);
    }
    // algebraic term ${termIndex + 1}`;
}

function buildAlgebraicBranchBody(appState) {
  const terms = Array.isArray(appState && appState.algebraicChainingTerms)
    ? appState.algebraicChainingTerms
    : [];

  return [
    '    vec2 sum = vec2(0.0);',
    ...terms.map(emitAlgebraicTerm),
    '    mapped = sum;',
    '    return isFiniteVec2Compat(mapped);'
  ].join('\n');
}

/**
 * Shader functions are authored as dependency-aware modules rather than opaque
 * slabs. This keeps GLSL ES 1.00 compatibility while making assembly auditable:
 * callers request entry points and receive the minimum topologically ordered set.
 */
function assembleGlslModules(modules, entries, context = {}) {
  const emitted = [];
  const visiting = new Set();
  const visited = new Set();

  const visit = name => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`cyclic GLSL dependency: ${name}`);
    }

    const module = modules[name];
    if (!module) {
      throw new Error(`unknown GLSL module: ${name}`);
    }

    visiting.add(name);

    const dependencies = typeof module.deps === 'function'
      ? module.deps(context)
      : module.deps || [];

    dependencies.forEach(visit);
    visiting.delete(name);
    visited.add(name);

    emitted.push(typeof module.source === 'function'
      ? module.source(context)
      : module.source);
  };

  entries.forEach(visit);
  return emitted.join('\n\n');
}

const SURFACE_MATH_GLSL = Object.freeze({
  complexLnOnSheet: {
    deps: [],
    source: `bool complexLnOnSheet(vec2 z, float branchIndex, float branchCutWidth, out vec2 value) {
  float magnitude = length(z);
  if (magnitude < 1.0e-20) return false;
  if (branchCutWidth > 0.0 && z.x < 0.0 && abs(z.y) < branchCutWidth) return false;
  value = complexLn(z);
  value.y += branchIndex * TWO_PI;
  return isFiniteVec2Compat(value);
}`
  },

  complexPowRealOnSheet: {
    deps: ['complexLnOnSheet'],
    source: `bool complexPowRealOnSheet(vec2 z, float exponent, float branchIndex, float branchCutWidth, out vec2 value) {
  if (dot(z, z) < 1.0e-20) {
    if (exponent > 0.0) { value = vec2(0.0); return true; }
    return false;
  }
  vec2 logarithm = vec2(0.0);
  if (!complexLnOnSheet(z, branchIndex, branchCutWidth, logarithm)) return false;
  value = complexExp(vec2(exponent * logarithm.x, exponent * logarithm.y));
  return isFiniteVec2Compat(value);
}`
  },

  evaluateBasicOnSheet: {
    deps: ['complexLnOnSheet', 'complexPowRealOnSheet'],
    source: `bool evaluateBasicOnSheet(
  float functionId,
  vec2 z,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  out vec2 mapped
) {
  float fId = floor(functionId + 0.5);
  if (abs(fId - 6.0) < 0.5) {
    return complexLnOnSheet(z, branchIndex, branchCutWidth, mapped);
  }
  if (abs(fId - 15.0) < 0.5) {
    float nearestInteger = floor(fracPower + 0.5);
    bool isIntegerPower = abs(fracPower - nearestInteger) < 1.0e-5;
    return complexPowRealOnSheet(
      z,
      fracPower,
      isIntegerPower ? 0.0 : branchIndex,
      isIntegerPower ? 0.0 : branchCutWidth,
      mapped
    );
  }
  return evaluateBasicFuncShared(
    fId, z, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped
  );
}`
  },

  evaluateTaylorSurface: {
    deps: [],
    source: `vec2 evaluateTaylorSurface(vec2 z, vec2 center, int order, vec2 coefficients[9]) {
  vec2 delta = z - center;
  vec2 power = vec2(1.0, 0.0);
  vec2 sum = vec2(0.0);
  for (int i = 0; i <= 8; i++) {
    if (i <= order) sum += complexMul(coefficients[i], power);
    power = complexMul(power, delta);
  }
  return sum;
}`
  },

  evaluateSurfaceBase: {
    deps: ['evaluateTaylorSurface', 'evaluateBasicOnSheet'],
    source: ({ appState }) => `bool evaluateSurfaceBase(
  vec2 z,
  float functionId,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  float useTaylor,
  vec2 taylorCenter,
  int taylorOrder,
  vec2 taylorCoefficients[9],
  out vec2 mapped
) {
  if (useTaylor > 0.5) {
    mapped = evaluateTaylorSurface(z, taylorCenter, taylorOrder, taylorCoefficients);
    return isFiniteVec2Compat(mapped);
  }
  float fId = floor(functionId + 0.5);
  if (abs(fId - 17.0) < 0.5) {
    return evaluateDynamicAggregateOnSheet(
      z, branchIndex, branchCutWidth, mA, mB, mC, mD,
      polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped
    );
  }
  if (abs(fId - 16.0) < 0.5) {
${buildAlgebraicBranchBody(appState)}
  }
  return evaluateBasicOnSheet(
    fId, z, branchIndex, branchCutWidth, mA, mB, mC, mD,
    polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped
  );
}`
  },

  evaluateSurfaceStage: {
    deps: ['evaluateSurfaceBase', 'complexPowRealOnSheet', 'complexLnOnSheet'],
    source: `bool evaluateSurfaceStage(
  vec2 z,
  int stage,
  int chainMode,
  float functionId,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  float useTaylor,
  vec2 taylorCenter,
  int taylorOrder,
  vec2 taylorCoefficients[9],
  out vec2 mapped
) {
  bool ok = evaluateSurfaceBase(
    z, functionId, branchIndex, branchCutWidth, mA, mB, mC, mD,
    polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower,
    useTaylor, taylorCenter, taylorOrder, taylorCoefficients, mapped
  );
  if (!ok) return false;
  vec2 baseValue = mapped;
  for (int i = 1; i < 25; i++) {
    if (i >= stage) break;
    if (chainMode == 1) {
      ok = evaluateSurfaceBase(
        mapped, functionId, branchIndex, branchCutWidth, mA, mB, mC, mD,
        polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower,
        useTaylor, taylorCenter, taylorOrder, taylorCoefficients, mapped
      );
    } else if (chainMode == 2) {
      mapped = complexMul(mapped, baseValue);
    } else if (chainMode == 3) {
      ok = complexPowRealOnSheet(mapped, 0.5, branchIndex, branchCutWidth, mapped);
    } else if (chainMode == 4) {
      ok = complexLnOnSheet(mapped, branchIndex, branchCutWidth, mapped);
    } else if (chainMode == 5) {
      mapped = complexExp(mapped);
    } else if (chainMode == 6) {
      if (dot(mapped, mapped) < 1.0e-20) return false;
      mapped = complexDiv(vec2(1.0, 0.0), mapped);
    }
    if (!ok || !isFiniteVec2Compat(mapped)) return false;
  }
  return isFiniteVec2Compat(mapped);
}`
  }
});

const VERTEX_SURFACE_GLSL = Object.freeze({
  hslToRgbSurface: {
    deps: [],
    source: `vec3 hslToRgbSurface(float h, float s, float l) {
  h = fract(h);
  vec3 p = abs(fract(h + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
  vec3 rgb = clamp(p - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}`
  },

  interpolate7: {
    deps: [],
    source: `vec3 interpolate7(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5, vec3 c6, float h) {
  float val = h * 6.0;
  if (val < 1.0) return mix(c0, c1, val);
  else if (val < 2.0) return mix(c1, c2, val - 1.0);
  else if (val < 3.0) return mix(c2, c3, val - 2.0);
  else if (val < 4.0) return mix(c3, c4, val - 3.0);
  else if (val < 5.0) return mix(c4, c5, val - 4.0);
  else return mix(c5, c6, val - 5.0);
}`
  },

  surfacePaletteColor: {
    deps: ['hslToRgbSurface', 'interpolate7'],
    source: () => `vec3 surfacePaletteColor(int paletteId, float h) {
  if (paletteId == 10) return hslToRgbSurface(h, 1.0, 0.5);
  vec3 c0, c1, c2, c3, c4, c5, c6;
${emitPaletteBranches()}
  return interpolate7(c0, c1, c2, c3, c4, c5, c6, fract(h));
}`
  },

  surfaceHeight: {
    deps: [],
    source: `float surfaceHeight(vec2 value) {
  if (u_surfaceComponent == 1) return value.x;
  if (u_surfaceComponent == 3) return length(value);
  if (u_surfaceComponent == 4) return atan(value.y, value.x);
  return value.y;
}`
  },

  surfaceColor: {
    deps: ['surfacePaletteColor'],
    source: `vec3 surfaceColor(vec2 value) {
  float phase = atan(value.y, value.x);
  float hue = fract((phase + PI) / TWO_PI + u_sheetTint);
  float logMagnitude = log(1.0 + length(value));
  float bands = 0.5 + 0.25 * sin((logMagnitude / LOG_TWO) * u_domainLightnessCycles * TWO_PI);
  float lightness = clamp(
    (0.5 + (bands - 0.5) * u_domainContrast) * u_domainBrightness,
    0.08,
    0.92
  );
  vec3 color = surfacePaletteColor(u_domainPalette, hue);
  if (lightness < 0.5) color *= lightness / 0.5;
  else color = mix(color, vec3(1.0), (lightness - 0.5) / 0.5);
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, clamp(u_domainSaturation, 0.0, 1.0));
}`
  },

  mapSurfacePoint: {
    deps: ['surfaceHeight'],
    source: `bool mapSurfacePoint(vec2 z, out vec2 mapped, out float height) {
  bool ok = evaluateSurfaceStage(
    z, u_stage, u_chainMode, u_functionId, u_branchIndex, u_branchCutWidth,
    u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs,
    u_zetaContinuationEnabled, u_zetaReflectionBoundary, u_fracPower,
    u_useTaylor, u_taylorCenter, u_taylorOrder, u_taylorCoefficients, mapped
  );
  if (!ok) return false;
  height = clamp(surfaceHeight(mapped) / max(u_heightClip, 1.0e-4), -1.0, 1.0) * u_heightScale;
  return isFiniteFloatCompat(height);
}`
  },

  main: {
    deps: ['mapSurfacePoint', 'surfaceColor'],
    source: `void main() {
  vec2 z = vec2(
    mix(u_viewBounds.x, u_viewBounds.y, a_grid.x),
    mix(u_viewBounds.z, u_viewBounds.w, a_grid.y)
  );
  vec2 mapped = vec2(0.0);
  float height = 0.0;
  bool ok = mapSurfacePoint(z, mapped, height);
  float nx = mix(-1.18, 1.18, a_grid.x);
  float nz = mix(-1.0, 1.0, a_grid.y);
  vec3 localPosition = vec3(nx, height, nz);

  vec2 mappedX = vec2(0.0);
  vec2 mappedY = vec2(0.0);
  float heightX = height;
  float heightY = height;
  bool okX = mapSurfacePoint(z + vec2(u_domainStep.x, 0.0), mappedX, heightX);
  bool okY = mapSurfacePoint(z + vec2(0.0, u_domainStep.y), mappedY, heightY);
  vec3 tangentX = vec3(u_normalizedStep.x, okX ? heightX - height : 0.0, 0.0);
  vec3 tangentY = vec3(0.0, okY ? heightY - height : 0.0, u_normalizedStep.y);
  vec3 localNormal = normalize(cross(tangentY, tangentX));

  vec4 viewPosition = u_modelView * vec4(localPosition, 1.0);
  v_viewPosition = viewPosition.xyz;
  v_normal = normalize(mat3(u_modelView) * localNormal);
  v_color = surfaceColor(mapped);
  v_valid = ok ? 1.0 : 0.0;
  gl_Position = u_projection * viewPosition;
}`
  }
});

const FRAGMENT_GLSL = Object.freeze({
  shadeSurface: {
    deps: [],
    source: `vec3 shadeSurface(vec3 color, vec3 normal, vec3 viewPosition) {
  vec3 lightDirection = normalize(vec3(0.45, 0.72, 0.9));
  vec3 viewDirection = normalize(-viewPosition);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 32.0);
  return color * (0.34 + 0.76 * diffuse) + vec3(0.45, 0.38, 0.72) * specular * 0.5;
}`
  },

  main: {
    deps: ['shadeSurface'],
    source: `void main() {
  if (v_valid < 0.995) discard;
  if (u_wirePass > 0.5) {
    gl_FragColor = vec4(mix(v_color, vec3(0.92, 0.88, 1.0), 0.7), 0.42);
    return;
  }
  gl_FragColor = vec4(shadeSurface(v_color, normalize(v_normal), v_viewPosition), 0.88);
}`
  }
});

export function buildRiemannSurfaceMathLibrary(appState) {
  const dynamic = buildDynamicAggregateGLSL(
    appState,
    functionName => getWebGLDomainColorFunctionIdShared(functionName, true)
  );
  const dynamicSource = dynamic.source || `bool evaluateDynamicAggregate(
  vec2 s,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  out vec2 mapped
) {
  mapped = vec2(0.0);
  return false;
}
bool evaluateDynamicAggregateOnSheet(
  vec2 s,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  out vec2 mapped
) {
  mapped = vec2(0.0);
  return false;
}`;
  return `${GLSL_COMPLEX_MATH_LIBRARY_BASE}
${dynamicSource}
${assembleGlslModules(SURFACE_MATH_GLSL, ['evaluateSurfaceStage'], { appState })}
`;
}

function buildVertexShader(appState) {
  return `
precision highp float;
attribute vec2 a_grid;
uniform vec4 u_viewBounds;
uniform mat4 u_modelView;
uniform mat4 u_projection;
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
uniform int u_stage;
uniform int u_chainMode;
uniform float u_branchIndex;
uniform float u_branchCutWidth;
uniform int u_surfaceComponent;
uniform float u_heightScale;
uniform float u_heightClip;
uniform vec2 u_domainStep;
uniform vec2 u_normalizedStep;
uniform float u_sheetTint;
uniform float u_domainBrightness;
uniform float u_domainContrast;
uniform float u_domainSaturation;
uniform float u_domainLightnessCycles;
uniform int u_domainPalette;
uniform float u_useTaylor;
uniform vec2 u_taylorCenter;
uniform int u_taylorOrder;
uniform vec2 u_taylorCoefficients[9];
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_viewPosition;
varying float v_valid;
${buildRiemannSurfaceMathLibrary(appState)}
${assembleGlslModules(VERTEX_SURFACE_GLSL, ['main'])}
`;
}

function buildFragmentShader() {
  return `
precision highp float;
uniform float u_wirePass;
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_viewPosition;
varying float v_valid;
${assembleGlslModules(FRAGMENT_GLSL, ['main'])}
`;
}

const FRAGMENT_SHADER = buildFragmentShader();

function matrix4(values) {
  return new Float32Array(values);
}

function identityMatrix() {
  return matrix4([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

function multiplyMatrices(a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
  const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
  const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
  const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

  return matrix4([
    a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
    a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
    a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
    a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03,

    a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
    a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
    a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
    a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13,

    a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
    a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
    a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
    a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23,

    a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
    a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
    a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
    a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33
  ]);
}

function translationMatrix(x, y, z) {
  const matrix = identityMatrix();
  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;
  return matrix;
}

function rotationXMatrix(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return matrix4([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]);
}

function rotationYMatrix(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return matrix4([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
}

function perspectiveMatrix(fovRadians, aspect, near, far) {
  const f = 1 / Math.tan(fovRadians / 2);
  const rangeInv = 1 / (near - far);

  return matrix4([
    f / Math.max(aspect, 1.0e-6), 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * 2 * rangeInv, 0
  ]);
}

function createGridVertices(resolution) {
  const side = resolution + 1;
  const vertices = new Float32Array(side * side * 2);
  let offset = 0;

  for (let y = 0; y <= resolution; y++) {
    const v = y / resolution;

    for (let x = 0; x <= resolution; x++) {
      vertices[offset++] = x / resolution;
      vertices[offset++] = v;
    }
  }

  return vertices;
}

function createGridTriangles(resolution) {
  const side = resolution + 1;
  const triangles = new Uint16Array(resolution * resolution * 6);
  let offset = 0;

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const topLeft = y * side + x;
      const bottomLeft = topLeft + side;

      triangles[offset++] = topLeft;
      triangles[offset++] = bottomLeft;
      triangles[offset++] = topLeft + 1;
      triangles[offset++] = topLeft + 1;
      triangles[offset++] = bottomLeft;
      triangles[offset++] = bottomLeft + 1;
    }
  }

  return triangles;
}

function createGridLines(resolution) {
  const side = resolution + 1;
  const stride = Math.max(1, Math.round(resolution / 18));
  const indices = [];

  for (let x = 0; x <= resolution; x += stride) {
    for (let y = 0; y < resolution; y++) {
      indices.push(y * side + x, (y + 1) * side + x);
    }
  }

  for (let y = 0; y <= resolution; y += stride) {
    for (let x = 0; x < resolution; x++) {
      indices.push(y * side + x, y * side + x + 1);
    }
  }

  return new Uint16Array(indices);
}

function uploadBuffer(gl, target, data) {
  const buffer = gl.createBuffer();

  if (!buffer) return null;

  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return buffer;
}

function createGridMesh(gl, resolution) {
  const vertices = createGridVertices(resolution);
  const triangles = createGridTriangles(resolution);
  const lines = createGridLines(resolution);

  const vertexBuffer = uploadBuffer(gl, gl.ARRAY_BUFFER, vertices);
  const triangleBuffer = uploadBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, triangles);
  const lineBuffer = uploadBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, lines);

  if (!vertexBuffer || !triangleBuffer || !lineBuffer) {
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(triangleBuffer);
    gl.deleteBuffer(lineBuffer);
    return null;
  }

  return {
    resolution,
    vertexBuffer,
    triangleBuffer,
    triangleCount: triangles.length,
    lineBuffer,
    lineCount: lines.length
  };
}

function disposeMesh(gl, mesh) {
  if (!mesh) return;

  gl.deleteBuffer(mesh.vertexBuffer);
  gl.deleteBuffer(mesh.triangleBuffer);
  gl.deleteBuffer(mesh.lineBuffer);
}

function getProgramSignature(appState) {
  return JSON.stringify({
    algebraic: (appState && appState.algebraicChainingTerms) || [],
    dynamic: dynamicAggregateGLSLSignature(appState)
  });
}

function collectArrayUniformLocations(gl, program, name, length) {
  return Array.from(
    { length },
    (_, index) => gl.getUniformLocation(program, `${name}[${index}]`)
  );
}

function collectUniformLocations(gl, program) {
  const locations = {
    aGrid: gl.getAttribLocation(program, 'a_grid')
  };

  for (const [key, uniformName] of Object.entries(UNIFORM_NAMES)) {
    locations[key] = gl.getUniformLocation(program, uniformName);
  }

  for (const descriptor of ARRAY_UNIFORMS) {
    locations[descriptor.key] = collectArrayUniformLocations(
      gl,
      program,
      descriptor.name,
      descriptor.length
    );
  }

  return locations;
}

function rebuildProgram(renderer) {
  const { gl } = renderer;
  const program = createWebGLProgramShared(gl, buildVertexShader(state), FRAGMENT_SHADER);

  if (!program) {
    renderer.failureReason = 'shader compilation failed';
    return false;
  }

  if (renderer.program) gl.deleteProgram(renderer.program);

  renderer.program = program;
  renderer.locations = collectUniformLocations(gl, program);
  renderer.programSignature = getProgramSignature(state);
  renderer.failureReason = '';
  return true;
}

function addDisposableListener(target, type, listener, options) {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

function installInteraction(renderer) {
  const { canvas } = renderer;
  const disposers = [];
  const redraw = () => drawRenderer(renderer);

  const endDrag = event => {
    renderer.dragging = false;
    canvas.classList.remove('is-dragging');

    if (event && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  disposers.push(
    addDisposableListener(canvas, 'pointerdown', event => {
      renderer.dragging = true;
      renderer.lastPointerX = event.clientX;
      renderer.lastPointerY = event.clientY;
      canvas.classList.add('is-dragging');

      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }
    }),
    addDisposableListener(canvas, 'pointermove', event => {
      if (!renderer.dragging) return;

      const dx = event.clientX - renderer.lastPointerX;
      const dy = event.clientY - renderer.lastPointerY;

      renderer.camera.rotY += dx * 0.008;
      renderer.camera.rotX += dy * 0.008;
      renderer.lastPointerX = event.clientX;
      renderer.lastPointerY = event.clientY;
      redraw();
    }),
    addDisposableListener(canvas, 'pointerup', endDrag),
    addDisposableListener(canvas, 'pointercancel', endDrag),
    addDisposableListener(canvas, 'wheel', event => {
      event.preventDefault();
      renderer.camera.distance = clamp(
        renderer.camera.distance * Math.exp(event.deltaY * 0.001),
        LIMITS.minDistance,
        LIMITS.maxDistance
      );
      redraw();
    }, { passive: false }),
    addDisposableListener(canvas, 'dblclick', () => {
      resetRendererCamera(renderer);
      redraw();
    })
  );

  renderer.disposeInteraction = () => {
    while (disposers.length) disposers.pop()();
  };
}

function createOverlayCanvas() {
  const canvas = document.createElement('canvas');
  canvas.className = 'riemann-surface-canvas hidden';
  canvas.setAttribute('aria-label', 'Interactive GPU Riemann surface');
  return canvas;
}

function createHud() {
  const hud = document.createElement('div');
  hud.className = 'riemann-surface-hud hidden';
  return hud;
}

function getWebGLContext(canvas) {
  return canvas.getContext('webgl', {
    antialias: true,
    alpha: false,
    depth: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  });
}

function resizeRenderer(renderer) {
  const parent = renderer.canvas.parentElement;
  if (!parent) return false;

  const cssWidth = Math.max(1, parent.clientWidth || renderer.baseCanvas.width || 1);
  const cssHeight = Math.max(1, parent.clientHeight || renderer.baseCanvas.height || 1);
  const dpr = clamp(window.devicePixelRatio || 1, 1, LIMITS.maxPixelRatio);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));

  if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
    renderer.canvas.width = width;
    renderer.canvas.height = height;
  }

  renderer.gl.viewport(0, 0, width, height);
  return true;
}

function getTaylorCoefficients(order) {
  if (!state.taylorSeriesEnabled || isDynamicAggregateGLSLActive(state)) return null;

  const coefficients = computeTaylorSeriesCoefficients(
    state.currentFunction,
    state.taylorSeriesCenter,
    order
  );

  return Array.isArray(coefficients) && coefficients.length > 0 ? coefficients : null;
}

function setTaylorUniforms(renderer) {
  const { gl, locations } = renderer;
  const order = clamp(finiteInteger(state.taylorSeriesOrder, 0), 0, 8);
  const coefficients = getTaylorCoefficients(order);
  const useTaylor = Boolean(coefficients);
  const center = complexOrZero(state.taylorSeriesCenter);

  gl.uniform1f(locations.uUseTaylor, useTaylor ? 1 : 0);
  gl.uniform2f(locations.uTaylorCenter, center.re, center.im);
  gl.uniform1i(locations.uTaylorOrder, order);

  for (let i = 0; i <= 8; i++) {
    const coefficient = complexOrZero(useTaylor && coefficients[i]);
    gl.uniform2f(locations.uTaylorCoefficients[i], coefficient.re, coefficient.im);
  }

  return useTaylor;
}

function buildModelViewMatrix(camera) {
  return multiplyMatrices(
    translationMatrix(0, -0.08, -camera.distance),
    multiplyMatrices(rotationXMatrix(camera.rotX), rotationYMatrix(camera.rotY))
  );
}

function buildProjectionMatrix(canvas) {
  return perspectiveMatrix(
    Math.PI / 4,
    canvas.width / Math.max(1, canvas.height),
    0.1,
    30
  );
}

function setCommonUniforms(renderer, options) {
  const { gl, locations, mesh } = renderer;
  const xRange = readRange(zPlaneParams.currentVisXRange, -2, 2);
  const yRange = readRange(zPlaneParams.currentVisYRange, -2, 2);
  const xSpan = xRange[1] - xRange[0];
  const ySpan = yRange[1] - yRange[0];

  gl.uniform4f(locations.uViewBounds, xRange[0], xRange[1], yRange[0], yRange[1]);
  gl.uniformMatrix4fv(locations.uModelView, false, buildModelViewMatrix(renderer.camera));
  gl.uniformMatrix4fv(locations.uProjection, false, buildProjectionMatrix(renderer.canvas));

  setComplexFunctionUniformsShared(gl, locations, state);

  gl.uniform1i(locations.uStage, options.stage);
  gl.uniform1i(locations.uChainMode, getChainModeId(state.chainingMode));
  gl.uniform1i(locations.uSurfaceComponent, getSurfaceComponentId(state.riemannSurfaceComponent));
  gl.uniform1f(locations.uHeightScale, finiteNumber(state.riemannSurfaceHeightScale, 1));
  gl.uniform1f(
    locations.uHeightClip,
    Math.max(LIMITS.minHeightClip, finiteNumber(state.riemannSurfaceHeightClip, 1))
  );
  gl.uniform2f(locations.uDomainStep, xSpan / mesh.resolution, ySpan / mesh.resolution);
  gl.uniform2f(locations.uNormalizedStep, 2.36 / mesh.resolution, 2 / mesh.resolution);
  gl.uniform1f(locations.uDomainBrightness, finiteNumber(state.domainBrightness, 1));
  gl.uniform1f(locations.uDomainContrast, finiteNumber(state.domainContrast, 1));
  gl.uniform1f(locations.uDomainSaturation, finiteNumber(state.domainSaturation, 1));
  gl.uniform1f(locations.uDomainLightnessCycles, finiteNumber(state.domainLightnessCycles, 1));
  gl.uniform1i(locations.uDomainPalette, getPaletteId(state.domainPalette));

  setTaylorUniforms(renderer);
}

function updateHud(renderer, branchIndices, hasBranches, stage) {
  const backend = renderer.backendInfo || {};
  const backendLabel = backend.unmaskedRenderer || backend.renderer || 'WebGL';
  const branchLabel = hasBranches ? getBranchWindowLabel(branchIndices) : 'single-valued sheet';
  const stageLabel = state.chainingEnabled ? `chain ${Math.max(0, stage - 1)}` : 'output';

  renderer.hud.textContent =
    `${stageLabel} | ${getSurfaceComponentLabel(state.riemannSurfaceComponent)} | ${branchLabel} | GPU: ${backendLabel}`;
}

function ensureCurrentProgram(renderer) {
  const signature = getProgramSignature(state);
  return renderer.programSignature === signature || rebuildProgram(renderer);
}

function ensureMesh(renderer) {
  const resolution = normalizeResolution(state.gridDensity);

  if (renderer.mesh && renderer.mesh.resolution === resolution) {
    return true;
  }

  disposeMesh(renderer.gl, renderer.mesh);
  renderer.mesh = createGridMesh(renderer.gl, resolution);
  return Boolean(renderer.mesh);
}

function configureDrawState(gl) {
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0.027, 0.031, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function bindGridAttribute(gl, locations, mesh) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.enableVertexAttribArray(locations.aGrid);
  gl.vertexAttribPointer(locations.aGrid, 2, gl.FLOAT, false, 0, 0);
}

function getBranchCutWidth(mesh, hasBranches) {
  if (!hasBranches) return 0;

  const xRange = readRange(zPlaneParams.currentVisXRange, -2, 2);
  const yRange = readRange(zPlaneParams.currentVisYRange, -2, 2);
  const xSpan = Math.abs(xRange[1] - xRange[0]);
  const ySpan = Math.abs(yRange[1] - yRange[0]);

  return Math.max(
    LIMITS.minBranchCutWidth,
    Math.min(xSpan, ySpan) / mesh.resolution * LIMITS.branchCutPixels
  );
}

function drawSurfaceSheet(renderer, branchIndex, sheetIndex, branchCount, cutWidth) {
  const { gl, locations, mesh } = renderer;

  gl.uniform1f(locations.uBranchIndex, branchIndex);
  gl.uniform1f(locations.uBranchCutWidth, cutWidth);
  gl.uniform1f(locations.uSheetTint, branchCount > 1 ? sheetIndex / branchCount * 0.12 : 0);
  gl.uniform1f(locations.uWirePass, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.triangleBuffer);
  gl.drawElements(gl.TRIANGLES, mesh.triangleCount, gl.UNSIGNED_SHORT, 0);

  if (!state.riemannSurfaceWireframe) return;

  gl.uniform1f(locations.uWirePass, 1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.lineBuffer);
  gl.drawElements(gl.LINES, mesh.lineCount, gl.UNSIGNED_SHORT, 0);
}

function prepareRendererFrame(renderer, options) {
  if (!renderer || !options || renderer.canvas.classList.contains('hidden')) return false;
  renderer.lastOptions = options;

  return resizeRenderer(renderer) && ensureCurrentProgram(renderer) && ensureMesh(renderer);
}

function drawRenderer(renderer, options = renderer.lastOptions) {
  if (!prepareRendererFrame(renderer, options)) return false;

  const { gl, program, locations, mesh } = renderer;

  gl.useProgram(program);
  configureDrawState(gl);
  bindGridAttribute(gl, locations, mesh);
  setCommonUniforms(renderer, options);

  const hasBranches = surfaceStageHasBranches(state, options.stage);
  const branchIndices = getVisibleBranchIndices(
    state.riemannSurfaceSheets,
    state.riemannSurfaceBranchCenter,
    hasBranches
  );
  const cutWidth = getBranchCutWidth(mesh, hasBranches);

  branchIndices.forEach((branchIndex, sheetIndex) => {
    drawSurfaceSheet(renderer, branchIndex, sheetIndex, branchIndices.length, cutWidth);
  });

  updateHud(renderer, branchIndices, hasBranches, options.stage);
  return true;
}

function showRenderer(renderer) {
  renderer.canvas.classList.remove('hidden');
  renderer.hud.classList.remove('hidden');
}

function hideRenderer(renderer) {
  renderer.canvas.classList.add('hidden');
  renderer.hud.classList.add('hidden');
}

function resetRendererCamera(renderer) {
  renderer.camera.rotX = DEFAULT_CAMERA.rotX;
  renderer.camera.rotY = DEFAULT_CAMERA.rotY;
  renderer.camera.distance = DEFAULT_CAMERA.distance;
}

/**
 * Owns renderer identity and lifetime. The exported API stays function-based,
 * but all mutable renderer registries live behind this private factory boundary.
 */
class RiemannSurfaceRendererFactory {
  #rendererByBaseCanvas = new WeakMap();
  #activeRenderers = new Set();

  render(baseCanvas, stage = 1) {
    if (!baseCanvas) return false;

    const renderer = this.#ensure(baseCanvas);
    if (!renderer) return false;

    showRenderer(renderer);
    renderer.lastOptions = { stage: normalizeStage(stage) };

    const rendered = drawRenderer(renderer);

    if (!rendered) {
      hideRenderer(renderer);
    }

    return rendered;
  }

  hide(baseCanvas) {
    const renderer = baseCanvas ? this.#rendererByBaseCanvas.get(baseCanvas) : null;
    if (!renderer) return;

    hideRenderer(renderer);
  }

  dispose(baseCanvas) {
    const renderer = baseCanvas ? this.#rendererByBaseCanvas.get(baseCanvas) : null;
    if (!renderer) return;

    const { gl } = renderer;

    if (renderer.disposeInteraction) {
      renderer.disposeInteraction();
    }

    disposeMesh(gl, renderer.mesh);

    if (renderer.program) {
      gl.deleteProgram(renderer.program);
    }

    renderer.canvas.remove();
    renderer.hud.remove();
    this.#activeRenderers.delete(renderer);
    this.#rendererByBaseCanvas.delete(baseCanvas);
  }

  canvasFor(baseCanvas) {
    const renderer = baseCanvas ? this.#rendererByBaseCanvas.get(baseCanvas) : null;
    return renderer ? renderer.canvas : null;
  }

  resetViews() {
    this.#activeRenderers.forEach(renderer => {
      resetRendererCamera(renderer);
      drawRenderer(renderer);
    });
  }

  #ensure(baseCanvas) {
    return this.#rendererByBaseCanvas.get(baseCanvas) || this.#create(baseCanvas);
  }

  #create(baseCanvas) {
    const parent = baseCanvas && baseCanvas.parentElement;
    if (!parent) return null;

    const canvas = createOverlayCanvas();
    const gl = getWebGLContext(canvas);
    if (!gl) return null;

    const hud = createHud();
    parent.appendChild(canvas);
    parent.appendChild(hud);

    const renderer = {
      baseCanvas,
      canvas,
      hud,
      gl,
      program: null,
      programSignature: null,
      locations: null,
      mesh: null,
      camera: { ...DEFAULT_CAMERA },
      dragging: false,
      lastPointerX: 0,
      lastPointerY: 0,
      lastOptions: null,
      backendInfo: getWebGLBackendInfoShared(gl),
      failureReason: '',
      disposeInteraction: null
    };

    installInteraction(renderer);

    if (!rebuildProgram(renderer)) {
      renderer.disposeInteraction();
      canvas.remove();
      hud.remove();
      return null;
    }

    this.#rendererByBaseCanvas.set(baseCanvas, renderer);
    this.#activeRenderers.add(renderer);
    return renderer;
  }
}

const rendererFactory = new RiemannSurfaceRendererFactory();

export function renderRiemannSurface(baseCanvas, stage = 1) {
  if (isDynamicAggregateGLSLActive(state)) {
    const dynamic = buildDynamicAggregateGLSL(
      state,
      functionName => getWebGLDomainColorFunctionIdShared(functionName, true)
    );
    if (!dynamic.source || dynamic.error) return false;
  }
  return rendererFactory.render(baseCanvas, stage);
}

export function hideRiemannSurface(baseCanvas) {
  rendererFactory.hide(baseCanvas);
}

export function disposeRiemannSurface(baseCanvas) {
  rendererFactory.dispose(baseCanvas);
}

export function getRiemannSurfaceCanvas(baseCanvas) {
  return rendererFactory.canvasFor(baseCanvas);
}

export function resetRiemannSurfaceViews() {
  rendererFactory.resetViews();
}
