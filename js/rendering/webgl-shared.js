import { state } from '../store/state.js';
import { ZETA_REFLECTION_POINT_RE } from '../constants/numerical.js';
import {
    buildDynamicAggregateGLSL,
    isDynamicAggregateGLSLActive,
    compileCustomExpressionToGLSL,
    GLSL_EXPRESSION_HELPERS
} from '../math/expression/glsl.js';
/**
 * Shared WebGL utility functions and common GLSL shaders for complex arithmetic.
 */

export const GLSL_COMPLEX_MATH_LIBRARY_BASE = `
const float PI = 3.1415926535897932384626433832795;
const float TWO_PI = 6.283185307179586476925286766559;
const float LOG_TWO = 0.6931471805599453094172321214582;
const int ZETA_GPU_TERMS = 72;

float safeExp(float x) { return exp(clamp(x, -60.0, 60.0)); }
float coshCompat(float x) { return 0.5 * (safeExp(x) + safeExp(-x)); }
float sinhCompat(float x) { return 0.5 * (safeExp(x) - safeExp(-x)); }
bool isFiniteFloatCompat(float value) { return (value == value) && abs(value) < 1.0e30; }
bool isFiniteVec2Compat(vec2 value) { return isFiniteFloatCompat(value.x) && isFiniteFloatCompat(value.y); }
vec2 complexAdd(vec2 a, vec2 b) { return a + b; }
vec2 complexMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 complexDiv(vec2 num, vec2 den) { float denMagSq = max(dot(den, den), 1.0e-30); return vec2((num.x * den.x + num.y * den.y) / denMagSq, (num.y * den.x - num.x * den.y) / denMagSq); }
vec2 complexExp(vec2 z) { float e = safeExp(z.x); return vec2(e * cos(z.y), e * sin(z.y)); }
vec2 complexLn(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }
vec2 complexSin(vec2 z) { return vec2(sin(z.x) * coshCompat(z.y), cos(z.x) * sinhCompat(z.y)); }
vec2 complexCos(vec2 z) { return vec2(cos(z.x) * coshCompat(z.y), -sin(z.x) * sinhCompat(z.y)); }
vec2 evalPolynomial(vec2 z, int degree, vec2 coeffs[11]) { vec2 acc = vec2(0.0, 0.0); vec2 zPow = vec2(1.0, 0.0); for (int i = 0; i <= 10; i++) { if (i <= degree) { acc = complexAdd(acc, complexMul(coeffs[i], zPow)); } zPow = complexMul(zPow, z); } return acc; }
vec2 complexPowPositiveRealBase(float positiveBase, vec2 exponent) { float lnBase = log(max(positiveBase, 1.0e-30)); float magnitude = safeExp(exponent.x * lnBase); float angle = exponent.y * lnBase; return vec2(magnitude * cos(angle), magnitude * sin(angle)); }
bool evaluateZeta(vec2 s, float contEnabled, float reflBoundary, out vec2 value) { if (abs(s.x - 1.0) < 1.0e-6 && abs(s.y) < 1.0e-6) return false; if (contEnabled < 0.5 && s.x <= reflBoundary) return false; vec2 etaSum = vec2(0.0, 0.0); vec2 negS = vec2(-s.x, -s.y); for (int n = 1; n <= ZETA_GPU_TERMS; n++) { vec2 nPowNegS = complexPowPositiveRealBase(float(n), negS); float alternatingSign = (mod(float(n), 2.0) < 0.5) ? -1.0 : 1.0; etaSum += nPowNegS * alternatingSign; } vec2 oneMinusS = vec2(1.0 - s.x, -s.y); vec2 twoPowOneMinusS = complexPowPositiveRealBase(2.0, oneMinusS); vec2 denominator = vec2(1.0, 0.0) - twoPowOneMinusS; if (dot(denominator, denominator) < 1.0e-18) return false; value = complexDiv(etaSum, denominator); return isFiniteVec2Compat(value); }

vec2 complexSinh(vec2 z) { return vec2(sinhCompat(z.x) * cos(z.y), coshCompat(z.x) * sin(z.y)); }
vec2 complexCosh(vec2 z) { return vec2(coshCompat(z.x) * cos(z.y), sinhCompat(z.x) * sin(z.y)); }
vec2 complexTanh(vec2 z) { vec2 den = complexCosh(z); if (dot(den,den) < 1.0e-18) return vec2(0.0); return complexDiv(complexSinh(z), den); }

bool evaluateBasicFuncShared(float fId, vec2 z, vec2 mA, vec2 mB, vec2 mC, vec2 mD, int polyDeg, vec2 polyCoeffs[11], float zetaCont, float zetaRefl, float fracPower, out vec2 mapped) {
  if (abs(fId - 1.0) < 0.5) { mapped = complexCos(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 2.0) < 0.5) { mapped = complexSin(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 3.0) < 0.5) { vec2 denTan = complexCos(z); if (dot(denTan, denTan) < 1.0e-18) return false; mapped = complexDiv(complexSin(z), denTan); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 4.0) < 0.5) { vec2 denSec = complexCos(z); if (dot(denSec, denSec) < 1.0e-18) return false; mapped = complexDiv(vec2(1.0, 0.0), denSec); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 5.0) < 0.5) { mapped = complexExp(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 6.0) < 0.5) { if (dot(z, z) < 1.0e-20) return false; mapped = complexLn(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 7.0) < 0.5) { if (dot(z, z) < 1.0e-18) return false; mapped = complexDiv(vec2(1.0, 0.0), z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 8.0) < 0.5) { vec2 num = complexAdd(complexMul(mA, z), mB); vec2 den = complexAdd(complexMul(mC, z), mD); if (dot(den, den) < 1.0e-18) return false; mapped = complexDiv(num, den); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 9.0) < 0.5) { mapped = evalPolynomial(z, polyDeg, polyCoeffs); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 10.0) < 0.5) { if (z.y <= 1.0e-9) return false; float rootY = sqrt(max(z.y, 0.0)); if (!isFiniteFloatCompat(rootY) || rootY <= 1.0e-8) return false; mapped = vec2(z.x / rootY, rootY); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 11.0) < 0.5) { return evaluateZeta(z, zetaCont, zetaRefl, mapped); }
  if (abs(fId - 12.0) < 0.5) { mapped = complexSinh(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 13.0) < 0.5) { mapped = complexCosh(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 14.0) < 0.5) { mapped = complexTanh(z); return isFiniteVec2Compat(mapped); }
  if (abs(fId - 15.0) < 0.5) { if (dot(z,z) < 1.0e-20) { mapped = vec2(0.0); return true; } vec2 lnZ = complexLn(z); mapped = complexExp(vec2(fracPower * lnZ.x, fracPower * lnZ.y)); return isFiniteVec2Compat(mapped); }
  return false;
}
`;

export const GLSL_COMPLEX_INVERSE_LIBRARY = `
vec2 complexSqrt(vec2 z) {
  float r = length(z);
  if (r < 1.0e-20) return vec2(0.0);
  float angle = atan(z.y, z.x) * 0.5;
  float sr = sqrt(r);
  return vec2(sr * cos(angle), sr * sin(angle));
}
vec2 complexArcsin(vec2 w) {
  vec2 iw = vec2(-w.y, w.x);
  vec2 wSq = complexMul(w, w);
  vec2 s = complexSqrt(vec2(1.0 - wSq.x, -wSq.y));
  vec2 lv = complexLn(complexAdd(iw, s));
  return vec2(lv.y, -lv.x);
}
vec2 complexArccos(vec2 w) {
  vec2 wSq = complexMul(w, w);
  vec2 s = complexSqrt(vec2(1.0 - wSq.x, -wSq.y));
  vec2 lv = complexLn(complexAdd(w, vec2(-s.y, s.x)));
  return vec2(lv.y, -lv.x);
}
vec2 complexArctan(vec2 w) {
  vec2 num = vec2(-w.x, 1.0 - w.y);
  vec2 den = vec2(w.x, 1.0 + w.y);
  if (dot(den, den) < 1.0e-18) return vec2(0.0);
  vec2 lv = complexLn(complexDiv(num, den));
  return vec2(-lv.y * 0.5, lv.x * 0.5);
}
vec2 complexArcsinh(vec2 w) {
  vec2 wSq = complexMul(w, w);
  vec2 s = complexSqrt(complexAdd(wSq, vec2(1.0, 0.0)));
  return complexLn(complexAdd(w, s));
}
vec2 complexArccosh(vec2 w) {
  vec2 wSq = complexMul(w, w);
  vec2 s = complexSqrt(complexAdd(wSq, vec2(-1.0, 0.0)));
  return complexLn(complexAdd(w, s));
}
vec2 complexArctanh(vec2 w) {
  vec2 one = vec2(1.0, 0.0);
  vec2 num = complexAdd(one, w);
  vec2 den = complexAdd(one, -w);
  if (dot(den,den) < 1.0e-18) return vec2(0.0);
  return complexMul(vec2(0.5, 0.0), complexLn(complexDiv(num, den)));
}
bool evaluateInverseFunction(vec2 w, float functionId, vec2 mA, vec2 mB, vec2 mC, vec2 mD, int polyDeg, vec2 polyCoeffs[11], float fracPower, out vec2 z) {
  float fId = floor(functionId + 0.5);
  if (abs(fId - 1.0) < 0.5) { z = complexArccos(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 2.0) < 0.5) { z = complexArcsin(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 3.0) < 0.5) { z = complexArctan(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 4.0) < 0.5) { if (dot(w,w) < 1.0e-18) return false; z = complexArccos(complexDiv(vec2(1.0,0.0), w)); return isFiniteVec2Compat(z); }
  if (abs(fId - 5.0) < 0.5) { if (dot(w,w) < 1.0e-20) return false; z = complexLn(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 6.0) < 0.5) { z = complexExp(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 7.0) < 0.5) { if (dot(w,w) < 1.0e-18) return false; z = complexDiv(vec2(1.0,0.0), w); return isFiniteVec2Compat(z); }
  if (abs(fId - 8.0) < 0.5) { vec2 num = complexAdd(complexMul(mD, w), -mB); vec2 den = complexAdd(-complexMul(mC, w), mA); if (dot(den,den) < 1.0e-18) return false; z = complexDiv(num, den); return isFiniteVec2Compat(z); }
  if (abs(fId - 9.0) < 0.5) {
    if (polyDeg == 1) { vec2 den = polyCoeffs[1]; if (dot(den,den) < 1.0e-18) return false; z = complexDiv(w - polyCoeffs[0], den); return isFiniteVec2Compat(z); }
    if (polyDeg == 2) { vec2 a=polyCoeffs[2]; vec2 b=polyCoeffs[1]; vec2 c=polyCoeffs[0]-w; vec2 disc=complexMul(b,b)-4.0*complexMul(a,c); vec2 sd=complexSqrt(disc); vec2 den=2.0*a; if(dot(den,den)<1.0e-18) return false; z=complexDiv(-b+sd,den); return isFiniteVec2Compat(z); }
    return false;
  }
  if (abs(fId - 10.0) < 0.5) { float wY = w.y; if (wY == 0.0) return false; z = vec2(w.x * w.y, w.y * w.y); return isFiniteVec2Compat(z); }
  if (abs(fId - 12.0) < 0.5) { z = complexArcsinh(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 13.0) < 0.5) { z = complexArccosh(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 14.0) < 0.5) { z = complexArctanh(w); return isFiniteVec2Compat(z); }
  if (abs(fId - 15.0) < 0.5) { 
    if (abs(fracPower) < 1.0e-6) return false;
    if (dot(w,w) < 1.0e-20) { z = vec2(0.0); return true; }
    vec2 lnW = complexLn(w);
    float invPower = 1.0 / fracPower;
    z = complexExp(vec2(invPower * lnW.x, invPower * lnW.y));
    return isFiniteVec2Compat(z);
  }
  return false;
}
`;


export function createWebGLShaderShared(gl, shaderType, source) {
    if (gl.isContextLost?.()) return null;
    const shader = gl.createShader(shaderType);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        if (!gl.isContextLost?.()) {
            console.warn('WebGL shader compile error:', gl.getShaderInfoLog(shader));
        }
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createWebGLProgramShared(gl, vertexSource, fragmentSource) {
    if (gl.isContextLost?.()) return null;
    const vertexShader = createWebGLShaderShared(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createWebGLShaderShared(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        return null;
    }

    const program = gl.createProgram();
    if (!program) {
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        if (!gl.isContextLost?.()) {
            console.warn('WebGL program link error:', gl.getProgramInfoLog(program));
        }
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

export function getWebGLBackendInfoShared(gl) {
    if (!gl) return null;
    const info = {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: null,
        unmaskedRenderer: null,
        softwareBackend: false
    };

    const rendererString = `${info.renderer || ''}`.toLowerCase();
    info.softwareBackend =
        rendererString.includes('swiftshader') ||
        rendererString.includes('llvmpipe') ||
        rendererString.includes('softpipe') ||
        rendererString.includes('software');
    return info;
}

export function generateDirectEvaluationGLSL(funcName, valVar, outVar, isSheet = false) {
    if (!funcName || funcName === 'none') return '';

    switch (funcName) {
        case 'cos':
            return `        ${outVar} = complexCos(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'sin':
            return `        ${outVar} = complexSin(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'tan':
            return `        {\n` +
                `          vec2 den = complexCos(${valVar});\n` +
                `          if (dot(den, den) < 1.0e-18) return false;\n` +
                `          ${outVar} = complexDiv(complexSin(${valVar}), den);\n` +
                `          if (!isFiniteVec2Compat(${outVar})) return false;\n` +
                `        }\n`;
        case 'sec':
            return `        {\n` +
                `          vec2 den = complexCos(${valVar});\n` +
                `          if (dot(den, den) < 1.0e-18) return false;\n` +
                `          ${outVar} = complexDiv(vec2(1.0, 0.0), den);\n` +
                `          if (!isFiniteVec2Compat(${outVar})) return false;\n` +
                `        }\n`;
        case 'exp':
            return `        ${outVar} = complexExp(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'ln':
            if (isSheet) {
                return `        if (!complexLnOnSheet(${valVar}, branchIndex, branchCutWidth, ${outVar})) return false;\n`;
            } else {
                return `        if (dot(${valVar}, ${valVar}) < 1.0e-20) return false;\n` +
                    `        ${outVar} = complexLn(${valVar});\n` +
                    `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
            }
        case 'reciprocal':
            return `        if (dot(${valVar}, ${valVar}) < 1.0e-18) return false;\n` +
                `        ${outVar} = complexDiv(vec2(1.0, 0.0), ${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'mobius':
            return `        {\n` +
                `          vec2 num = complexAdd(complexMul(mA, ${valVar}), mB);\n` +
                `          vec2 den = complexAdd(complexMul(mC, ${valVar}), mD);\n` +
                `          if (dot(den, den) < 1.0e-18) return false;\n` +
                `          ${outVar} = complexDiv(num, den);\n` +
                `          if (!isFiniteVec2Compat(${outVar})) return false;\n` +
                `        }\n`;
        case 'polynomial':
            return `        ${outVar} = evalPolynomial(${valVar}, polyDeg, polyCoeffs);\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'poincare':
            return `        {\n` +
                `          if (${valVar}.y <= 1.0e-9) return false;\n` +
                `          float rootY = sqrt(max(${valVar}.y, 0.0));\n` +
                `          if (!isFiniteFloatCompat(rootY) || rootY <= 1.0e-8) return false;\n` +
                `          ${outVar} = vec2(${valVar}.x / rootY, rootY);\n` +
                `          if (!isFiniteVec2Compat(${outVar})) return false;\n` +
                `        }\n`;
        case 'zeta':
            return `        if (!evaluateZeta(${valVar}, zetaCont, zetaRefl, ${outVar})) return false;\n`;
        case 'sinh':
            return `        ${outVar} = complexSinh(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'cosh':
            return `        ${outVar} = complexCosh(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'tanh':
            return `        ${outVar} = complexTanh(${valVar});\n` +
                `        if (!isFiniteVec2Compat(${outVar})) return false;\n`;
        case 'power':
            if (isSheet) {
                return `        {\n` +
                    `          float nearestInteger = floor(fracPower + 0.5);\n` +
                    `          bool isIntegerPower = abs(fracPower - nearestInteger) < 1.0e-5;\n` +
                    `          if (!complexPowRealOnSheet(${valVar}, fracPower, isIntegerPower ? 0.0 : branchIndex, isIntegerPower ? 0.0 : branchCutWidth, ${outVar})) return false;\n` +
                    `        }\n`;
            } else {
                return `        {\n` +
                    `          if (dot(${valVar}, ${valVar}) < 1.0e-20) {\n` +
                    `            ${outVar} = vec2(0.0);\n` +
                    `          } else {\n` +
                    `            vec2 lnZ = complexLn(${valVar});\n` +
                    `            ${outVar} = complexExp(vec2(fracPower * lnZ.x, fracPower * lnZ.y));\n` +
                    `          }\n` +
                    `          if (!isFiniteVec2Compat(${outVar})) return false;\n` +
                    `        }\n`;
            }
        default:
            return '';
    }
}

export function getWebGLDomainColorFunctionIdShared(functionName, ignoreDynamic = false) {
    if (!ignoreDynamic && isDynamicAggregateGLSLActive(state)) return 17;
    switch (functionName) {
        case 'cos': return 1;
        case 'sin': return 2;
        case 'tan': return 3;
        case 'sec': return 4;
        case 'exp': return 5;
        case 'ln': return 6;
        case 'reciprocal': return 7;
        case 'mobius': return 8;
        case 'polynomial': return 9;
        case 'poincare': return 10;
        case 'zeta': return 11;
        case 'sinh': return 12;
        case 'cosh': return 13;
        case 'tanh': return 14;
        case 'power': return 15;
        case 'algebraic_chaining': return 16;
        case 'dynamic_aggregate': return 17;
        default: return 0;
    }
}

export function setComplexFunctionUniformsShared(gl, locs, state) {
    if (locs.uFunctionId !== undefined && locs.uFunctionId !== null) {
        gl.uniform1f(locs.uFunctionId, getWebGLDomainColorFunctionIdShared(state.currentFunction));
    }

    const a = state.mobiusA || { re: 1, im: 0 }, b = state.mobiusB || { re: 0, im: 0 };
    const c = state.mobiusC || { re: 0, im: 0 }, d = state.mobiusD || { re: 1, im: 0 };
    if (locs.uMobiusA !== undefined && locs.uMobiusA !== null) gl.uniform2f(locs.uMobiusA, a.re || 0, a.im || 0);
    if (locs.uMobiusB !== undefined && locs.uMobiusB !== null) gl.uniform2f(locs.uMobiusB, b.re || 0, b.im || 0);
    if (locs.uMobiusC !== undefined && locs.uMobiusC !== null) gl.uniform2f(locs.uMobiusC, c.re || 0, c.im || 0);
    if (locs.uMobiusD !== undefined && locs.uMobiusD !== null) gl.uniform2f(locs.uMobiusD, d.re || 0, d.im || 0);

    const deg = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
    if (locs.uPolyDegree !== undefined && locs.uPolyDegree !== null) gl.uniform1i(locs.uPolyDegree, deg);
    if (locs.uPolyCoeffs) {
        for (let i = 0; i <= 10; i++) {
            if (locs.uPolyCoeffs[i] !== undefined && locs.uPolyCoeffs[i] !== null) {
                const co = (state.polynomialCoeffs && state.polynomialCoeffs[i]) || null;
                gl.uniform2f(locs.uPolyCoeffs[i], co ? (co.re || 0) : 0, co ? (co.im || 0) : 0);
            }
        }
    }

    if (locs.uZetaCont !== undefined && locs.uZetaCont !== null) gl.uniform1f(locs.uZetaCont, state.zetaContinuationEnabled ? 1 : 0);
    if (locs.uZetaRefl !== undefined && locs.uZetaRefl !== null) gl.uniform1f(locs.uZetaRefl, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);
    if (locs.uFracPower !== undefined && locs.uFracPower !== null) gl.uniform1f(locs.uFracPower, state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5);

    if (locs.algebraicTerms) {
        const terms = state.algebraicChainingTerms || [];
        terms.forEach((term, termIndex) => {
            const tLoc = locs.algebraicTerms[termIndex];
            if (tLoc) {
                if (tLoc.coeff !== undefined && tLoc.coeff !== null) {
                    gl.uniform2f(tLoc.coeff, term.coeff?.re || 0, term.coeff?.im || 0);
                }
                const factors = term.factors || [];
                factors.forEach((f, factorIndex) => {
                    const fLoc = tLoc.factors?.[factorIndex];
                    if (fLoc && fLoc.power !== undefined && fLoc.power !== null) {
                        gl.uniform1f(fLoc.power, f.power !== undefined ? f.power : 1.0);
                    }
                });
            }
        });
    }
}

export function collectAlgebraicUniformLocationsShared(gl, program, appState, locs) {
    if (!appState) return;
    locs.algebraicTerms = (appState.algebraicChainingTerms || []).map((term, termIndex) => {
        return {
            coeff: gl.getUniformLocation(program, `u_algTermCoeff_${termIndex}`),
            factors: (term.factors || []).map((factor, factorIndex) => {
                return {
                    power: gl.getUniformLocation(program, `u_algFactorPower_${termIndex}_${factorIndex}`)
                };
            })
        };
    });
}


export function getAlgebraicStructureSignatureShared(terms) {
    const list = Array.isArray(terms) ? terms : [];
    return JSON.stringify(list.map(term => {
        const factors = Array.isArray(term && term.factors) ? term.factors : [];
        return {
            factors: factors.map(factor => (
                factor && factor.func && factor.func !== 'none'
                    ? {
                        func: factor.func,
                        chainedFunc: factor.chainedFunc,
                        reciprocal: !!factor.reciprocal,
                        log: !!factor.log,
                        exp: !!factor.exp
                    }
                    : { func: 'none' }
            ))
        };
    }));
}

const WEBGL_SHARED_LIBRARY_CACHE_LIMIT = 512;
const webglSharedLibraryCache = new Map();

function getGLSLComplexMathLibraryCacheKey(appState) {
    if (!appState) return '';
    try {
        const dynamicActive = isDynamicAggregateGLSLActive(appState);
        const dynamicSig = dynamicActive ? (appState.dynamicAggregateTerms || []).map(t => `${t.func}:${t.scale}`).join('|') : '';
        const algebraicSig = getAlgebraicStructureSignatureShared(appState.algebraicChainingTerms);
        const zExpr = appState.algebraicChainingZExpr || 'z';
        return `d:${dynamicActive ? 1 : 0}:${dynamicSig}|z:${zExpr}|a:${algebraicSig}`;
    } catch {
        return null;
    }
}

function buildGLSLComplexMathLibraryUncached(appState) {
    const dynamic = buildDynamicAggregateGLSL(
        appState,
        functionName => getWebGLDomainColorFunctionIdShared(functionName, true)
    );
    const hasCustomZExpr = !!(appState?.algebraicChainingZExpr && appState.algebraicChainingZExpr !== 'z');
    const zCustomExprGLSL = hasCustomZExpr
        ? compileCustomExpressionToGLSL(
            appState.algebraicChainingZExpr,
            functionName => getWebGLDomainColorFunctionIdShared(functionName, true)
        )
        : 'z';

    let uniformDecls = '';
    if (appState && appState.algebraicChainingTerms) {
        appState.algebraicChainingTerms.forEach((term, termIndex) => {
            uniformDecls += `uniform vec2 u_algTermCoeff_${termIndex};\n`;
            if (term.factors) {
                term.factors.forEach((f, factorIndex) => {
                    if (f.func && f.func !== 'none') {
                        uniformDecls += `uniform float u_algFactorPower_${termIndex}_${factorIndex};\n`;
                    }
                });
            }
        });
    }

    let algStr = uniformDecls + `bool evaluateMappedValueBase(vec2 z, vec2 c, float isWPlane, float functionId, vec2 mA, vec2 mB, vec2 mC, vec2 mD, int polyDeg, vec2 polyCoeffs[11], float zetaCont, float zetaRefl, float fracPower, out vec2 mapped) {\n`;
    algStr += `  if (isWPlane > 0.5 || isWPlane < 0.0) { mapped = z; return isFiniteVec2Compat(mapped); }\n`;
    algStr += `  float fId = floor(functionId + 0.5);\n`;
    if (dynamic.source && !dynamic.error) {
        algStr += `  if (abs(fId - 17.0) < 0.5) return evaluateDynamicAggregate(z, c, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped);\n`;
    }
    algStr += `  if (abs(fId - 16.0) < 0.5) {\n`;
    if (hasCustomZExpr && !zCustomExprGLSL) {
        algStr += `    mapped = vec2(0.0); return false;\n`;
    } else if (zCustomExprGLSL && zCustomExprGLSL !== 'z') {
        algStr += `    z = ${zCustomExprGLSL};\n`;
    }
    algStr += `    vec2 sum = vec2(0.0);\n`;

    if (appState && appState.algebraicChainingTerms && appState.algebraicChainingTerms.length > 0) {
        appState.algebraicChainingTerms.forEach((term, termIndex) => {
            algStr += `    {\n`;
            algStr += `      vec2 termVal = u_algTermCoeff_${termIndex};\n`;
            if (term.factors) {
                term.factors.forEach((f, factorIndex) => {
                    if (!f.func || f.func === 'none') return;
                    algStr += `      {\n`;
                    algStr += `        vec2 argZ = z;\n`;
                    algStr += `        vec2 temp = vec2(0.0);\n`;
                    if (f.chainedFunc && f.chainedFunc !== 'none') {
                        if (f.chainedFunc === 'c') {
                            algStr += `        argZ = c;\n`;
                        } else {
                            algStr += generateDirectEvaluationGLSL(f.chainedFunc, 'argZ', 'temp', false);
                            algStr += `        argZ = temp;\n`;
                        }
                    }
                    if (f.func === 'c') {
                        algStr += `        argZ = c;\n`;
                    } else {
                        algStr += generateDirectEvaluationGLSL(f.func, 'argZ', 'temp', false);
                        algStr += `        argZ = temp;\n`;
                    }

                    algStr += `        float fPower = u_algFactorPower_${termIndex}_${factorIndex};\n`;
                    algStr += `        if (abs(fPower - 1.0) >= 1.0e-9) {\n`;
                    algStr += `          if (dot(argZ, argZ) < 1.0e-20) {\n`;
                    algStr += `            argZ = vec2(0.0);\n`;
                    algStr += `          } else {\n`;
                    algStr += `            vec2 lnZ = complexLn(argZ);\n`;
                    algStr += `            argZ = complexExp(vec2(fPower * lnZ.x, fPower * lnZ.y));\n`;
                    algStr += `          }\n`;
                    algStr += `        }\n`;

                    if (f.reciprocal) {
                        algStr += `        if (dot(argZ, argZ) < 1.0e-18) return false;\n`;
                        algStr += `        argZ = complexDiv(vec2(1.0, 0.0), argZ);\n`;
                    }
                    if (f.log) {
                        algStr += `        if (dot(argZ, argZ) < 1.0e-20) return false;\n`;
                        algStr += `        argZ = complexLn(argZ);\n`;
                    }
                    if (f.exp) {
                        algStr += `        argZ = complexExp(argZ);\n`;
                    }
                    algStr += `        termVal = complexMul(termVal, argZ);\n`;
                    algStr += `      }\n`;
                });
            }
            algStr += `      sum = complexAdd(sum, termVal);\n`;
            algStr += `    }\n`;
        });
    }

    algStr += `    mapped = sum;\n`;
    algStr += `    return isFiniteVec2Compat(mapped);\n`;
    algStr += `  }\n`;
    algStr += `  return evaluateBasicFuncShared(fId, z, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower, mapped);\n`;
    algStr += `}\n`;

    return GLSL_COMPLEX_MATH_LIBRARY_BASE + GLSL_EXPRESSION_HELPERS + (dynamic.source || '') + algStr;
}

export function getGLSLComplexMathLibrary(appState) {
    const cacheKey = getGLSLComplexMathLibraryCacheKey(appState);
    if (cacheKey !== null && cacheKey !== '') {
        const cached = webglSharedLibraryCache.get(cacheKey);
        if (cached !== undefined) return cached;
    }
    const source = buildGLSLComplexMathLibraryUncached(appState);
    if (cacheKey !== null && cacheKey !== '') {
        if (webglSharedLibraryCache.size >= WEBGL_SHARED_LIBRARY_CACHE_LIMIT) {
            webglSharedLibraryCache.clear();
        }
        webglSharedLibraryCache.set(cacheKey, source);
    }
    return source;
}
