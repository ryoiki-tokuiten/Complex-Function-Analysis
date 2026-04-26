/**
 * Shared WebGL utility functions and common GLSL shaders for complex arithmetic.
 */

const GLSL_COMPLEX_MATH_LIBRARY = `
const float PI = 3.1415926535897932384626433832795;
const float TWO_PI = 6.283185307179586476925286766559;
const float LOG_TWO = 0.6931471805599453094172321214582;
const int ZETA_GPU_TERMS = 72;

float safeExp(float x) { return exp(clamp(x, -60.0, 60.0)); }
float coshCompat(float x) { return 0.5 * (safeExp(x) + safeExp(-x)); }
float sinhCompat(float x) { return 0.5 * (safeExp(x) - safeExp(-x)); }
bool isFiniteFloatCompat(float value) { return (value == value) && abs(value) < 1.0e19; }
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

bool evaluateMappedValueBase(vec2 z, float isWPlane, float functionId, vec2 mA, vec2 mB, vec2 mC, vec2 mD, int polyDeg, vec2 polyCoeffs[11], float zetaCont, float zetaRefl, float fracPower, out vec2 mapped) {
  if (isWPlane > 0.5 || isWPlane < 0.0) { mapped = z; return isFiniteVec2Compat(mapped); }
  float fId = floor(functionId + 0.5);
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

const GLSL_COMPLEX_INVERSE_LIBRARY = `
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


function createWebGLShaderShared(gl, shaderType, source) {
    const shader = gl.createShader(shaderType);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('WebGL shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createWebGLProgramShared(gl, vertexSource, fragmentSource) {
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
        console.warn('WebGL program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function getWebGLBackendInfoShared(gl) {
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

function getWebGLDomainColorFunctionIdShared(functionName) {
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
        default: return 0;
    }
}
