import { state, zPlaneParams } from '../store/state.js';
import {
    computeTaylorSeriesCoefficients
} from '../math-utils.js';
import {
    GLSL_COMPLEX_MATH_LIBRARY_BASE,
    createWebGLProgramShared,
    getWebGLBackendInfoShared,
    getWebGLDomainColorFunctionIdShared,
    setComplexFunctionUniformsShared
} from './webgl-shared.js';
import {
    getBranchWindowLabel,
    getSurfaceComponentLabel,
    getVisibleBranchIndices,
    surfaceStageHasBranches
} from '../analysis/riemann-surface.js';

const rendererByBaseCanvas = new WeakMap();
const activeRenderers = new Set();
const DEFAULT_CAMERA = Object.freeze({ rotX: -0.82, rotY: 0.62, distance: 3.8 });

function glslNumber(value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return safeValue.toFixed(10);
}

function getChainModeId(mode) {
    switch (mode) {
        case 'power': return 2;
        case 'sqrt': return 3;
        case 'ln': return 4;
        case 'exp': return 5;
        case 'reciprocal': return 6;
        case 'recursion':
        default:
            return 1;
    }
}

function getSurfaceComponentId(component) {
    switch (component) {
        case 'real': return 1;
        case 'magnitude': return 3;
        case 'phase': return 4;
        case 'imaginary':
        default:
            return 2;
    }
}

function getPaletteId(palette) {
    if (palette === 'classic') return 1;
    if (palette === 'purple') return 2;
    if (palette === 'green') return 3;
    return 0;
}

function buildAlgebraicBranchBody(appState) {
    const terms = appState.algebraicChainingTerms || [];
    let source = '    vec2 sum = vec2(0.0);\n';

    terms.forEach((term, termIndex) => {
        const coefficient = term.coeff || { re: 0, im: 0 };
        source += `    {\n      vec2 termValue = vec2(${glslNumber(coefficient.re)}, ${glslNumber(coefficient.im)});\n`;
        (term.factors || []).forEach((factor, factorIndex) => {
            if (!factor || !factor.func || factor.func === 'none') return;
            const chainedId = getWebGLDomainColorFunctionIdShared(factor.chainedFunc);
            const functionId = getWebGLDomainColorFunctionIdShared(factor.func);
            const factorPower = Number.isFinite(factor.power) ? factor.power : 1;
            const branchPower = Math.abs(factorPower - Math.round(factorPower)) >= 1e-9;
            source += `      {\n        vec2 factorValue = z;\n        vec2 tempValue = vec2(0.0);\n`;
            if (chainedId) {
                source += `        if (!evaluateBasicOnSheet(float(${chainedId}), factorValue, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, tempValue)) return false;\n`;
                source += '        factorValue = tempValue;\n';
            }
            source += `        if (!evaluateBasicOnSheet(float(${functionId}), factorValue, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, tempValue)) return false;\n`;
            source += '        factorValue = tempValue;\n';

            if (factorPower !== 1) {
                const powerBranch = branchPower ? 'branchIndex' : '0.0';
                const powerCut = branchPower ? 'branchCutWidth' : '0.0';
                source += `        if (!complexPowRealOnSheet(factorValue, ${glslNumber(factorPower)}, ${powerBranch}, ${powerCut}, tempValue)) return false;\n`;
                source += '        factorValue = tempValue;\n';
            }
            if (factor.reciprocal) {
                source += '        if (dot(factorValue, factorValue) < 1.0e-20) return false;\n';
                source += '        factorValue = complexDiv(vec2(1.0, 0.0), factorValue);\n';
            }
            if (factor.log) {
                source += '        if (!complexLnOnSheet(factorValue, branchIndex, branchCutWidth, tempValue)) return false;\n';
                source += '        factorValue = tempValue;\n';
            }
            if (factor.exp) {
                source += '        factorValue = complexExp(factorValue);\n';
            }
            source += `        termValue = complexMul(termValue, factorValue);\n      }\n`;
        });
        source += `      sum = complexAdd(sum, termValue);\n    }\n`;
        source += `    // algebraic term ${termIndex + 1}\n`;
    });

    source += '    mapped = sum;\n    return isFiniteVec2Compat(mapped);\n';
    return source;
}

export function buildRiemannSurfaceMathLibrary(appState) {
    const algebraicBody = buildAlgebraicBranchBody(appState);
    return `${GLSL_COMPLEX_MATH_LIBRARY_BASE}
bool complexLnOnSheet(vec2 z, float branchIndex, float branchCutWidth, out vec2 value) {
  float magnitude = length(z);
  if (magnitude < 1.0e-20) return false;
  if (branchCutWidth > 0.0 && z.x < 0.0 && abs(z.y) < branchCutWidth) return false;
  value = complexLn(z);
  value.y += branchIndex * TWO_PI;
  return isFiniteVec2Compat(value);
}

bool complexPowRealOnSheet(vec2 z, float exponent, float branchIndex, float branchCutWidth, out vec2 value) {
  if (dot(z, z) < 1.0e-20) {
    if (exponent > 0.0) { value = vec2(0.0); return true; }
    return false;
  }
  vec2 logarithm = vec2(0.0);
  if (!complexLnOnSheet(z, branchIndex, branchCutWidth, logarithm)) return false;
  value = complexExp(vec2(exponent * logarithm.x, exponent * logarithm.y));
  return isFiniteVec2Compat(value);
}

bool evaluateBasicOnSheet(
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
}

vec2 evaluateTaylorSurface(vec2 z, vec2 center, int order, vec2 coefficients[9]) {
  vec2 delta = z - center;
  vec2 power = vec2(1.0, 0.0);
  vec2 sum = vec2(0.0);
  for (int i = 0; i <= 8; i++) {
    if (i <= order) sum += complexMul(coefficients[i], power);
    power = complexMul(power, delta);
  }
  return sum;
}

bool evaluateSurfaceBase(
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
  if (abs(fId - 16.0) < 0.5) {
${algebraicBody}  }
  return evaluateBasicOnSheet(
    fId, z, branchIndex, branchCutWidth, mA, mB, mC, mD,
    polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped
  );
}

bool evaluateSurfaceStage(
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
}
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

vec3 hslToRgbSurface(float h, float s, float l) {
  h = fract(h);
  vec3 p = abs(fract(h + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
  vec3 rgb = clamp(p - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

vec3 surfacePaletteColor(int paletteId, float h) {
  if (paletteId == 1) return hslToRgbSurface(h, 1.0, 0.5);
  vec3 c0;
  vec3 c1;
  vec3 c2;
  vec3 c3;
  if (paletteId == 2) {
    c0 = vec3(0.039, 0.020, 0.078);
    c1 = vec3(0.431, 0.275, 0.745);
    c2 = vec3(0.863, 0.784, 1.0);
    c3 = vec3(0.157, 0.078, 0.353);
  } else if (paletteId == 3) {
    c0 = vec3(0.020, 0.059, 0.039);
    c1 = vec3(0.059, 0.471, 0.373);
    c2 = vec3(0.784, 0.961, 0.863);
    c3 = vec3(0.686, 0.941, 0.039);
  } else {
    c0 = vec3(0.137, 0.071, 0.071);
    c1 = vec3(0.725, 0.431, 0.373);
    c2 = vec3(0.922, 0.863, 0.824);
    c3 = vec3(0.451, 0.235, 0.204);
  }
  float segment = fract(h) * 4.0;
  if (segment < 1.0) return mix(c0, c1, segment);
  if (segment < 2.0) return mix(c1, c2, segment - 1.0);
  if (segment < 3.0) return mix(c2, c3, segment - 2.0);
  return mix(c3, c0, segment - 3.0);
}

float surfaceHeight(vec2 value) {
  if (u_surfaceComponent == 1) return value.x;
  if (u_surfaceComponent == 3) return length(value);
  if (u_surfaceComponent == 4) return atan(value.y, value.x);
  return value.y;
}

vec3 surfaceColor(vec2 value) {
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
}

bool mapSurfacePoint(vec2 z, out vec2 mapped, out float height) {
  bool ok = evaluateSurfaceStage(
    z, u_stage, u_chainMode, u_functionId, u_branchIndex, u_branchCutWidth,
    u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs,
    u_zetaContinuationEnabled, u_zetaReflectionBoundary, u_fracPower,
    u_useTaylor, u_taylorCenter, u_taylorOrder, u_taylorCoefficients, mapped
  );
  if (!ok) return false;
  height = clamp(surfaceHeight(mapped) / max(u_heightClip, 1.0e-4), -1.0, 1.0) * u_heightScale;
  return isFiniteFloatCompat(height);
}

void main() {
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
}
`;
}

const FRAGMENT_SHADER = `
precision highp float;
uniform float u_wirePass;
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_viewPosition;
varying float v_valid;

void main() {
  if (v_valid < 0.995) discard;
  if (u_wirePass > 0.5) {
    gl_FragColor = vec4(mix(v_color, vec3(0.92, 0.88, 1.0), 0.7), 0.42);
    return;
  }
  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(vec3(0.45, 0.72, 0.9));
  vec3 viewDirection = normalize(-v_viewPosition);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 32.0);
  vec3 color = v_color * (0.34 + 0.76 * diffuse) + vec3(0.45, 0.38, 0.72) * specular * 0.5;
  gl_FragColor = vec4(color, 0.88);
}
`;

function identityMatrix() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
            result[column * 4 + row] =
                a[0 * 4 + row] * b[column * 4 + 0] +
                a[1 * 4 + row] * b[column * 4 + 1] +
                a[2 * 4 + row] * b[column * 4 + 2] +
                a[3 * 4 + row] * b[column * 4 + 3];
        }
    }
    return result;
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
    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}

function rotationYMatrix(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

function perspectiveMatrix(fovRadians, aspect, near, far) {
    const f = 1 / Math.tan(fovRadians / 2);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * 2 * rangeInv, 0
    ]);
}

function createGridMesh(gl, resolution) {
    const vertexCount = (resolution + 1) * (resolution + 1);
    const vertices = new Float32Array(vertexCount * 2);
    let vertexOffset = 0;
    for (let y = 0; y <= resolution; y++) {
        for (let x = 0; x <= resolution; x++) {
            vertices[vertexOffset++] = x / resolution;
            vertices[vertexOffset++] = y / resolution;
        }
    }

    const triangles = new Uint16Array(resolution * resolution * 6);
    let triangleOffset = 0;
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const topLeft = y * (resolution + 1) + x;
            const bottomLeft = topLeft + resolution + 1;
            triangles[triangleOffset++] = topLeft;
            triangles[triangleOffset++] = bottomLeft;
            triangles[triangleOffset++] = topLeft + 1;
            triangles[triangleOffset++] = topLeft + 1;
            triangles[triangleOffset++] = bottomLeft;
            triangles[triangleOffset++] = bottomLeft + 1;
        }
    }

    const gridStride = Math.max(1, Math.round(resolution / 18));
    const lineIndices = [];
    for (let x = 0; x <= resolution; x += gridStride) {
        for (let y = 0; y < resolution; y++) {
            lineIndices.push(y * (resolution + 1) + x, (y + 1) * (resolution + 1) + x);
        }
    }
    for (let y = 0; y <= resolution; y += gridStride) {
        for (let x = 0; x < resolution; x++) {
            lineIndices.push(y * (resolution + 1) + x, y * (resolution + 1) + x + 1);
        }
    }

    const vertexBuffer = gl.createBuffer();
    const triangleBuffer = gl.createBuffer();
    const lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndices), gl.STATIC_DRAW);

    return {
        resolution,
        vertexBuffer,
        triangleBuffer,
        triangleCount: triangles.length,
        lineBuffer,
        lineCount: lineIndices.length
    };
}

function disposeMesh(gl, mesh) {
    if (!mesh) return;
    gl.deleteBuffer(mesh.vertexBuffer);
    gl.deleteBuffer(mesh.triangleBuffer);
    gl.deleteBuffer(mesh.lineBuffer);
}

function getProgramSignature(appState) {
    return JSON.stringify(appState.algebraicChainingTerms || []);
}

function collectUniformLocations(gl, program) {
    const locations = {
        aGrid: gl.getAttribLocation(program, 'a_grid'),
        uViewBounds: gl.getUniformLocation(program, 'u_viewBounds'),
        uModelView: gl.getUniformLocation(program, 'u_modelView'),
        uProjection: gl.getUniformLocation(program, 'u_projection'),
        uFunctionId: gl.getUniformLocation(program, 'u_functionId'),
        uMobiusA: gl.getUniformLocation(program, 'u_mobiusA'),
        uMobiusB: gl.getUniformLocation(program, 'u_mobiusB'),
        uMobiusC: gl.getUniformLocation(program, 'u_mobiusC'),
        uMobiusD: gl.getUniformLocation(program, 'u_mobiusD'),
        uPolyDegree: gl.getUniformLocation(program, 'u_polyDegree'),
        uPolyCoeffs: [],
        uZetaCont: gl.getUniformLocation(program, 'u_zetaContinuationEnabled'),
        uZetaRefl: gl.getUniformLocation(program, 'u_zetaReflectionBoundary'),
        uFracPower: gl.getUniformLocation(program, 'u_fracPower'),
        uStage: gl.getUniformLocation(program, 'u_stage'),
        uChainMode: gl.getUniformLocation(program, 'u_chainMode'),
        uBranchIndex: gl.getUniformLocation(program, 'u_branchIndex'),
        uBranchCutWidth: gl.getUniformLocation(program, 'u_branchCutWidth'),
        uSurfaceComponent: gl.getUniformLocation(program, 'u_surfaceComponent'),
        uHeightScale: gl.getUniformLocation(program, 'u_heightScale'),
        uHeightClip: gl.getUniformLocation(program, 'u_heightClip'),
        uDomainStep: gl.getUniformLocation(program, 'u_domainStep'),
        uNormalizedStep: gl.getUniformLocation(program, 'u_normalizedStep'),
        uSheetTint: gl.getUniformLocation(program, 'u_sheetTint'),
        uDomainBrightness: gl.getUniformLocation(program, 'u_domainBrightness'),
        uDomainContrast: gl.getUniformLocation(program, 'u_domainContrast'),
        uDomainSaturation: gl.getUniformLocation(program, 'u_domainSaturation'),
        uDomainLightnessCycles: gl.getUniformLocation(program, 'u_domainLightnessCycles'),
        uDomainPalette: gl.getUniformLocation(program, 'u_domainPalette'),
        uWirePass: gl.getUniformLocation(program, 'u_wirePass'),
        uUseTaylor: gl.getUniformLocation(program, 'u_useTaylor'),
        uTaylorCenter: gl.getUniformLocation(program, 'u_taylorCenter'),
        uTaylorOrder: gl.getUniformLocation(program, 'u_taylorOrder'),
        uTaylorCoefficients: []
    };
    for (let i = 0; i <= 10; i++) {
        locations.uPolyCoeffs.push(gl.getUniformLocation(program, `u_polyCoeffs[${i}]`));
    }
    for (let i = 0; i <= 8; i++) {
        locations.uTaylorCoefficients.push(gl.getUniformLocation(program, `u_taylorCoefficients[${i}]`));
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

function installInteraction(renderer) {
    const canvas = renderer.canvas;
    canvas.addEventListener('pointerdown', event => {
        renderer.dragging = true;
        renderer.lastPointerX = event.clientX;
        renderer.lastPointerY = event.clientY;
        canvas.classList.add('is-dragging');
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        if (!renderer.dragging) return;
        const dx = event.clientX - renderer.lastPointerX;
        const dy = event.clientY - renderer.lastPointerY;
        renderer.camera.rotY += dx * 0.008;
        renderer.camera.rotX = Math.max(-1.52, Math.min(1.52, renderer.camera.rotX + dy * 0.008));
        renderer.lastPointerX = event.clientX;
        renderer.lastPointerY = event.clientY;
        drawRenderer(renderer);
    });
    const endDrag = event => {
        renderer.dragging = false;
        canvas.classList.remove('is-dragging');
        if (event && canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        renderer.camera.distance = Math.max(
            1.8,
            Math.min(8, renderer.camera.distance * Math.exp(event.deltaY * 0.001))
        );
        drawRenderer(renderer);
    }, { passive: false });
    canvas.addEventListener('dblclick', () => {
        resetRendererCamera(renderer);
        drawRenderer(renderer);
    });
}

function createRenderer(baseCanvas) {
    const canvas = document.createElement('canvas');
    canvas.className = 'riemann-surface-canvas hidden';
    canvas.setAttribute('aria-label', 'Interactive GPU Riemann surface');
    const gl = canvas.getContext('webgl', {
        antialias: true,
        alpha: false,
        depth: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance'
    });
    if (!gl) return null;

    const hud = document.createElement('div');
    hud.className = 'riemann-surface-hud hidden';
    baseCanvas.parentElement.appendChild(canvas);
    baseCanvas.parentElement.appendChild(hud);

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
        lastOptions: null,
        backendInfo: getWebGLBackendInfoShared(gl),
        failureReason: ''
    };
    installInteraction(renderer);
    if (!rebuildProgram(renderer)) {
        canvas.remove();
        hud.remove();
        return null;
    }
    rendererByBaseCanvas.set(baseCanvas, renderer);
    activeRenderers.add(renderer);
    return renderer;
}

function ensureRenderer(baseCanvas) {
    return rendererByBaseCanvas.get(baseCanvas) || createRenderer(baseCanvas);
}

function resizeRenderer(renderer) {
    const parent = renderer.canvas.parentElement;
    if (!parent) return false;
    const cssWidth = Math.max(1, parent.clientWidth || renderer.baseCanvas.width || 1);
    const cssHeight = Math.max(1, parent.clientHeight || renderer.baseCanvas.height || 1);
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width;
        renderer.canvas.height = height;
    }
    renderer.gl.viewport(0, 0, width, height);
    return true;
}

function setTaylorUniforms(renderer) {
    const { gl, locations } = renderer;
    const order = Math.max(0, Math.min(8, Math.floor(state.taylorSeriesOrder || 0)));
    let coefficients = null;
    if (state.taylorSeriesEnabled) {
        coefficients = computeTaylorSeriesCoefficients(
            state.currentFunction,
            state.taylorSeriesCenter,
            order
        );
    }
    const useTaylor = Array.isArray(coefficients) && coefficients.length > 0;
    gl.uniform1f(locations.uUseTaylor, useTaylor ? 1 : 0);
    gl.uniform2f(
        locations.uTaylorCenter,
        state.taylorSeriesCenter ? state.taylorSeriesCenter.re : 0,
        state.taylorSeriesCenter ? state.taylorSeriesCenter.im : 0
    );
    gl.uniform1i(locations.uTaylorOrder, order);
    for (let i = 0; i <= 8; i++) {
        const coefficient = useTaylor && coefficients[i] ? coefficients[i] : { re: 0, im: 0 };
        gl.uniform2f(locations.uTaylorCoefficients[i], coefficient.re || 0, coefficient.im || 0);
    }
    return useTaylor;
}

function setCommonUniforms(renderer, options) {
    const { gl, locations, mesh } = renderer;
    const xRange = zPlaneParams.currentVisXRange;
    const yRange = zPlaneParams.currentVisYRange;
    const xSpan = xRange[1] - xRange[0];
    const ySpan = yRange[1] - yRange[0];
    const modelView = multiplyMatrices(
        translationMatrix(0, -0.08, -renderer.camera.distance),
        multiplyMatrices(
            rotationXMatrix(renderer.camera.rotX),
            rotationYMatrix(renderer.camera.rotY)
        )
    );
    const projection = perspectiveMatrix(
        Math.PI / 4,
        renderer.canvas.width / Math.max(1, renderer.canvas.height),
        0.1,
        30
    );

    gl.uniform4f(locations.uViewBounds, xRange[0], xRange[1], yRange[0], yRange[1]);
    gl.uniformMatrix4fv(locations.uModelView, false, modelView);
    gl.uniformMatrix4fv(locations.uProjection, false, projection);
    setComplexFunctionUniformsShared(gl, locations, state);
    gl.uniform1i(locations.uStage, options.stage);
    gl.uniform1i(locations.uChainMode, getChainModeId(state.chainingMode));
    gl.uniform1i(locations.uSurfaceComponent, getSurfaceComponentId(state.riemannSurfaceComponent));
    gl.uniform1f(locations.uHeightScale, state.riemannSurfaceHeightScale);
    gl.uniform1f(locations.uHeightClip, state.riemannSurfaceHeightClip);
    gl.uniform2f(locations.uDomainStep, xSpan / mesh.resolution, ySpan / mesh.resolution);
    gl.uniform2f(locations.uNormalizedStep, 2.36 / mesh.resolution, 2 / mesh.resolution);
    gl.uniform1f(locations.uDomainBrightness, state.domainBrightness);
    gl.uniform1f(locations.uDomainContrast, state.domainContrast);
    gl.uniform1f(locations.uDomainSaturation, state.domainSaturation);
    gl.uniform1f(locations.uDomainLightnessCycles, state.domainLightnessCycles);
    gl.uniform1i(locations.uDomainPalette, getPaletteId(state.domainPalette));
    setTaylorUniforms(renderer);
}

function updateHud(renderer, branchIndices, hasBranches) {
    const backend = renderer.backendInfo || {};
    const backendLabel = backend.unmaskedRenderer || backend.renderer || 'WebGL';
    const branchLabel = hasBranches ? getBranchWindowLabel(branchIndices) : 'single-valued sheet';
    renderer.hud.textContent =
        `${getSurfaceComponentLabel(state.riemannSurfaceComponent)} | ${branchLabel} | GPU: ${backendLabel}`;
}

function drawRenderer(renderer, options = renderer.lastOptions) {
    if (!renderer || !options || renderer.canvas.classList.contains('hidden')) return false;
    renderer.lastOptions = options;
    if (!resizeRenderer(renderer)) return false;

    const signature = getProgramSignature(state);
    if (renderer.programSignature !== signature && !rebuildProgram(renderer)) {
        return false;
    }

    const resolution = Math.max(42, Math.min(140, 42 + Math.floor(state.gridDensity || 15) * 2));
    if (!renderer.mesh || renderer.mesh.resolution !== resolution) {
        disposeMesh(renderer.gl, renderer.mesh);
        renderer.mesh = createGridMesh(renderer.gl, resolution);
    }

    const { gl, program, locations, mesh } = renderer;
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.027, 0.031, 0.063, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.enableVertexAttribArray(locations.aGrid);
    gl.vertexAttribPointer(locations.aGrid, 2, gl.FLOAT, false, 0, 0);
    setCommonUniforms(renderer, options);

    const hasBranches = surfaceStageHasBranches(state, options.stage);
    const branchIndices = getVisibleBranchIndices(
        state.riemannSurfaceSheets,
        state.riemannSurfaceBranchCenter,
        hasBranches
    );
    const xSpan = Math.abs(zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0]);
    const ySpan = Math.abs(zPlaneParams.currentVisYRange[1] - zPlaneParams.currentVisYRange[0]);
    const cutWidth = hasBranches ? Math.max(0.002, Math.min(xSpan, ySpan) / mesh.resolution * 0.8) : 0;

    branchIndices.forEach((branchIndex, sheetIndex) => {
        gl.uniform1f(locations.uBranchIndex, branchIndex);
        gl.uniform1f(locations.uBranchCutWidth, cutWidth);
        gl.uniform1f(locations.uSheetTint, branchIndices.length > 1 ? sheetIndex / branchIndices.length * 0.12 : 0);
        gl.uniform1f(locations.uWirePass, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.triangleBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.triangleCount, gl.UNSIGNED_SHORT, 0);

        if (state.riemannSurfaceWireframe) {
            gl.uniform1f(locations.uWirePass, 1);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.lineBuffer);
            gl.drawElements(gl.LINES, mesh.lineCount, gl.UNSIGNED_SHORT, 0);
        }
    });

    updateHud(renderer, branchIndices, hasBranches);
    return true;
}

export function renderRiemannSurface(baseCanvas, stage = 1) {
    if (!baseCanvas) return false;
    const renderer = ensureRenderer(baseCanvas);
    if (!renderer) return false;
    renderer.canvas.classList.remove('hidden');
    renderer.hud.classList.remove('hidden');
    renderer.lastOptions = { stage: Math.max(1, Math.min(25, Math.floor(stage))) };
    const rendered = drawRenderer(renderer);
    if (!rendered) {
        renderer.canvas.classList.add('hidden');
        renderer.hud.classList.add('hidden');
    }
    return rendered;
}

export function hideRiemannSurface(baseCanvas) {
    const renderer = baseCanvas ? rendererByBaseCanvas.get(baseCanvas) : null;
    if (!renderer) return;
    renderer.canvas.classList.add('hidden');
    renderer.hud.classList.add('hidden');
}

export function disposeRiemannSurface(baseCanvas) {
    const renderer = baseCanvas ? rendererByBaseCanvas.get(baseCanvas) : null;
    if (!renderer) return;
    const { gl } = renderer;
    disposeMesh(gl, renderer.mesh);
    if (renderer.program) gl.deleteProgram(renderer.program);
    renderer.canvas.remove();
    renderer.hud.remove();
    activeRenderers.delete(renderer);
    rendererByBaseCanvas.delete(baseCanvas);
}

export function getRiemannSurfaceCanvas(baseCanvas) {
    const renderer = baseCanvas ? rendererByBaseCanvas.get(baseCanvas) : null;
    return renderer ? renderer.canvas : null;
}

function resetRendererCamera(renderer) {
    renderer.camera.rotX = DEFAULT_CAMERA.rotX;
    renderer.camera.rotY = DEFAULT_CAMERA.rotY;
    renderer.camera.distance = DEFAULT_CAMERA.distance;
}

export function resetRiemannSurfaceViews() {
    activeRenderers.forEach(renderer => {
        resetRendererCamera(renderer);
        drawRenderer(renderer);
    });
}
