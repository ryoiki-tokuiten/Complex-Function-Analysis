function createWebGLDomainColorShader(gl, shaderType, source) {
    const shader = gl.createShader(shaderType);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('WebGL domain coloring shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createWebGLDomainColorProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createWebGLDomainColorShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createWebGLDomainColorShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
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
        console.warn('WebGL domain coloring program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function getWebGLDomainColorBackendInfo(gl) {
    if (!gl) return null;
    const info = {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: null, // Reserved for non-Firefox diagnostics; avoid deprecated WEBGL_debug_renderer_info.
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

function getWebGLDomainColorRenderScale() {
    const baseScale = Number.isFinite(WEBGL_DOMAIN_COLOR_SUPERSAMPLE)
        ? WEBGL_DOMAIN_COLOR_SUPERSAMPLE
        : 1.75;
    const interactionScale = Number.isFinite(WEBGL_DOMAIN_COLOR_INTERACTION_SCALE)
        ? WEBGL_DOMAIN_COLOR_INTERACTION_SCALE
        : 1.2;
    const stressScale = Number.isFinite(WEBGL_DOMAIN_COLOR_STRESS_SCALE)
        ? WEBGL_DOMAIN_COLOR_STRESS_SCALE
        : 2.5;

    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning) ||
        state.particleAnimationEnabled
    ));

    let scale = isInteracting ? interactionScale : baseScale;
    if (state && state.webglGpuStressMode) {
        scale = Math.max(scale, stressScale);
    }

    const dpr = (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio))
        ? window.devicePixelRatio
        : 1;
    const dprBoost = Math.min(1.35, Math.max(1, dpr * 0.92));
    return Math.max(1, Math.min(3, scale * dprBoost));
}

function createWebGLDomainColorRenderer() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    });
    if (!gl) return null;

    const vertexSource = [
        'attribute vec2 a_position;',
        'varying vec2 v_uv;',
        'void main() {',
        '  v_uv = (a_position + 1.0) * 0.5;',
        '  gl_Position = vec4(a_position, 0.0, 1.0);',
        '}'
    ].join('\n');

    const fragmentSource = [
        'precision highp float;',
        'varying vec2 v_uv;',
        '',
        'uniform vec2 u_resolution;',
        'uniform vec4 u_viewBounds;',
        'uniform float u_domainBrightness;',
        'uniform float u_domainContrast;',
        'uniform float u_domainSaturation;',
        'uniform float u_domainLightnessCycles;',
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
        'uniform vec2 u_polyCoeffs[11];',
        'uniform float u_zetaContinuationEnabled;',
        'uniform float u_zetaReflectionBoundary;',
        '',
        'const float PI = 3.1415926535897932384626433832795;',
        'const float TWO_PI = 6.283185307179586476925286766559;',
        'const float LOG_TWO = 0.6931471805599453094172321214582;',
        'const int ZETA_GPU_TERMS = 72;',
        '',
        'float safeExp(float x) {',
        '  return exp(clamp(x, -60.0, 60.0));',
        '}',
        '',
        'float coshCompat(float x) {',
        '  return 0.5 * (safeExp(x) + safeExp(-x));',
        '}',
        '',
        'float sinhCompat(float x) {',
        '  return 0.5 * (safeExp(x) - safeExp(-x));',
        '}',
        '',
        'bool isFiniteFloatCompat(float value) {',
        '  return (value == value) && abs(value) < 1.0e19;',
        '}',
        '',
        'bool isFiniteVec2Compat(vec2 value) {',
        '  return isFiniteFloatCompat(value.x) && isFiniteFloatCompat(value.y);',
        '}',
        '',
        'vec2 complexAdd(vec2 a, vec2 b) {',
        '  return a + b;',
        '}',
        '',
        'vec2 complexMul(vec2 a, vec2 b) {',
        '  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);',
        '}',
        '',
        'vec2 complexDiv(vec2 num, vec2 den) {',
        '  float denMagSq = max(dot(den, den), 1.0e-30);',
        '  return vec2((num.x * den.x + num.y * den.y) / denMagSq, (num.y * den.x - num.x * den.y) / denMagSq);',
        '}',
        '',
        'vec2 complexExp(vec2 z) {',
        '  float e = safeExp(z.x);',
        '  return vec2(e * cos(z.y), e * sin(z.y));',
        '}',
        '',
        'vec2 complexLn(vec2 z) {',
        '  return vec2(log(length(z)), atan(z.y, z.x));',
        '}',
        '',
        'vec2 complexSin(vec2 z) {',
        '  return vec2(sin(z.x) * coshCompat(z.y), cos(z.x) * sinhCompat(z.y));',
        '}',
        '',
        'vec2 complexCos(vec2 z) {',
        '  return vec2(cos(z.x) * coshCompat(z.y), -sin(z.x) * sinhCompat(z.y));',
        '}',
        '',
        'vec2 evalPolynomial(vec2 z) {',
        '  vec2 acc = vec2(0.0, 0.0);',
        '  vec2 zPow = vec2(1.0, 0.0);',
        '  for (int i = 0; i <= 10; i++) {',
        '    if (i <= u_polyDegree) {',
        '      acc = complexAdd(acc, complexMul(u_polyCoeffs[i], zPow));',
        '    }',
        '    zPow = complexMul(zPow, z);',
        '  }',
        '  return acc;',
        '}',
        '',
        'vec2 complexPowPositiveRealBase(float positiveBase, vec2 exponent) {',
        '  float lnBase = log(max(positiveBase, 1.0e-30));',
        '  float magnitude = safeExp(exponent.x * lnBase);',
        '  float angle = exponent.y * lnBase;',
        '  return vec2(magnitude * cos(angle), magnitude * sin(angle));',
        '}',
        '',
        'bool evaluateZeta(vec2 s, out vec2 value) {',
        '  if (abs(s.x - 1.0) < 1.0e-6 && abs(s.y) < 1.0e-6) return false;',
        '  if (u_zetaContinuationEnabled < 0.5 && s.x <= u_zetaReflectionBoundary) return false;',
        '',
        '  vec2 etaSum = vec2(0.0, 0.0);',
        '  vec2 negS = vec2(-s.x, -s.y);',
        '  for (int n = 1; n <= ZETA_GPU_TERMS; n++) {',
        '    vec2 nPowNegS = complexPowPositiveRealBase(float(n), negS);',
        '    float alternatingSign = (mod(float(n), 2.0) < 0.5) ? -1.0 : 1.0;',
        '    etaSum += nPowNegS * alternatingSign;',
        '  }',
        '',
        '  vec2 oneMinusS = vec2(1.0 - s.x, -s.y);',
        '  vec2 twoPowOneMinusS = complexPowPositiveRealBase(2.0, oneMinusS);',
        '  vec2 denominator = vec2(1.0, 0.0) - twoPowOneMinusS;',
        '  if (dot(denominator, denominator) < 1.0e-18) return false;',
        '',
        '  value = complexDiv(etaSum, denominator);',
        '  return isFiniteVec2Compat(value);',
        '}',
        '',
        'vec3 inverseRotate3DCompat(vec3 p, float rotX, float rotY) {',
        '  float cY = cos(-rotY);',
        '  float sY = sin(-rotY);',
        '  float cX = cos(-rotX);',
        '  float sX = sin(-rotX);',
        '  float x1 = p.x;',
        '  float y1 = p.y * cX - p.z * sX;',
        '  float z1 = p.y * sX + p.z * cX;',
        '  return vec3(x1 * cY + z1 * sY, y1, -x1 * sY + z1 * cY);',
        '}',
        '',
        'bool evaluateMappedValue(vec2 z, out vec2 mapped) {',
        '  if (u_isWPlaneColoring > 0.5) {',
        '    mapped = z;',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '',
        '  float functionId = floor(u_functionId + 0.5);',
        '',
        '  if (abs(functionId - 1.0) < 0.5) {',
        '    mapped = complexCos(z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 2.0) < 0.5) {',
        '    mapped = complexSin(z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 3.0) < 0.5) {',
        '    vec2 denTan = complexCos(z);',
        '    if (dot(denTan, denTan) < 1.0e-18) return false;',
        '    mapped = complexDiv(complexSin(z), denTan);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 4.0) < 0.5) {',
        '    vec2 denSec = complexCos(z);',
        '    if (dot(denSec, denSec) < 1.0e-18) return false;',
        '    mapped = complexDiv(vec2(1.0, 0.0), denSec);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 5.0) < 0.5) {',
        '    mapped = complexExp(z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 6.0) < 0.5) {',
        '    if (dot(z, z) < 1.0e-20) return false;',
        '    mapped = complexLn(z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 7.0) < 0.5) {',
        '    if (dot(z, z) < 1.0e-18) return false;',
        '    mapped = complexDiv(vec2(1.0, 0.0), z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 8.0) < 0.5) {',
        '    vec2 num = complexAdd(complexMul(u_mobiusA, z), u_mobiusB);',
        '    vec2 den = complexAdd(complexMul(u_mobiusC, z), u_mobiusD);',
        '    if (dot(den, den) < 1.0e-18) return false;',
        '    mapped = complexDiv(num, den);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 9.0) < 0.5) {',
        '    mapped = evalPolynomial(z);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 10.0) < 0.5) {',
        '    if (z.y <= 1.0e-9) return false;',
        '    float rootY = sqrt(max(z.y, 0.0));',
        '    if (!isFiniteFloatCompat(rootY) || rootY <= 1.0e-8) return false;',
        '    mapped = vec2(z.x / rootY, rootY);',
        '    return isFiniteVec2Compat(mapped);',
        '  }',
        '  if (abs(functionId - 11.0) < 0.5) {',
        '    return evaluateZeta(z, mapped);',
        '  }',
        '',
        '  return false;',
        '}',
        '',
        'vec3 hslToRgb(vec3 hsl) {',
        '  float h = fract(hsl.x);',
        '  float s = clamp(hsl.y, 0.0, 1.0);',
        '  float l = clamp(hsl.z, 0.0, 1.0);',
        '',
        '  float c = (1.0 - abs(2.0 * l - 1.0)) * s;',
        '  float hp = h * 6.0;',
        '  float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));',
        '  vec3 rgb1;',
        '',
        '  if (hp < 1.0) rgb1 = vec3(c, x, 0.0);',
        '  else if (hp < 2.0) rgb1 = vec3(x, c, 0.0);',
        '  else if (hp < 3.0) rgb1 = vec3(0.0, c, x);',
        '  else if (hp < 4.0) rgb1 = vec3(0.0, x, c);',
        '  else if (hp < 5.0) rgb1 = vec3(x, 0.0, c);',
        '  else rgb1 = vec3(c, 0.0, x);',
        '',
        '  float m = l - 0.5 * c;',
        '  return rgb1 + vec3(m);',
        '}',
        '',
        'vec4 domainColorForValue(vec2 value, float brightnessFactor) {',
        '  float phase = atan(value.y, value.x);',
        '  float modValue = length(value);',
        '  if (!isFiniteFloatCompat(modValue)) return vec4(0.0);',
        '',
        '  float logMod = log(1.0 + modValue);',
        '  float lightnessAngle = (logMod / LOG_TWO) * u_domainLightnessCycles * TWO_PI;',
        '  float lBase = 0.5 + sin(lightnessAngle) * 0.25;',
        '  if (logMod < -10.0) lBase = 0.0;',
        '',
        '  float lContrasted = 0.5 + (lBase - 0.5) * u_domainContrast;',
        '  float lFinal = clamp(lContrasted * u_domainBrightness * brightnessFactor, 0.05, 0.95);',
        '  float sFinal = clamp(u_domainSaturation, 0.0, 1.0);',
        '  float h = fract((phase + PI) / TWO_PI);',
        '',
        '  vec3 rgb = hslToRgb(vec3(h, sFinal, lFinal));',
        '  return vec4(rgb, 1.0);',
        '}',
        '',
        'void main() {',
        '  vec2 resolutionSafe = max(u_resolution, vec2(1.0, 1.0));',
        '  vec2 pixel = vec2(v_uv.x * resolutionSafe.x, (1.0 - v_uv.y) * resolutionSafe.y);',
        '',
        '  vec2 zInput;',
        '  float brightnessFactor = 1.0;',
        '',
        '  if (u_useSphere > 0.5) {',
        '    if (u_sphereRadius <= 0.0) {',
        '      gl_FragColor = vec4(0.0);',
        '      return;',
        '    }',
        '',
        '    float nx = (pixel.x - u_sphereCenter.x) / u_sphereRadius;',
        '    float ny = -(pixel.y - u_sphereCenter.y) / u_sphereRadius;',
        '    float radialSq = nx * nx + ny * ny;',
        '    if (radialSq > 1.0) {',
        '      gl_FragColor = vec4(0.0);',
        '      return;',
        '    }',
        '',
        '    float pz = sqrt(max(0.0, 1.0 - radialSq));',
        '    vec3 normalCam = vec3(nx, ny, pz);',
        '    vec3 pointOnSphere = inverseRotate3DCompat(normalCam, u_rotX, u_rotY);',
        '',
        '    float den = 1.0 - pointOnSphere.z;',
        '    if (abs(den) < 1.0e-6) {',
        '      gl_FragColor = vec4(0.0);',
        '      return;',
        '    }',
        '',
        '    zInput = vec2(pointOnSphere.x / den, pointOnSphere.y / den);',
        '',
        '    vec3 lightDir = normalize(u_lightDir);',
        '    float nDotL = dot(normalCam, lightDir);',
        '    float diffuseFactor = max(0.0, nDotL);',
        '    float specularFactor = 0.0;',
        '    if (nDotL > 0.0) {',
        '      vec3 reflected = 2.0 * nDotL * normalCam - lightDir;',
        '      specularFactor = pow(max(0.0, reflected.z), max(1.0, u_sphereLighting.w));',
        '    }',
        '',
        '    float lightIntensity = u_sphereLighting.x +',
        '      u_sphereLighting.y * diffuseFactor +',
        '      u_sphereLighting.z * specularFactor;',
        '    brightnessFactor = clamp(lightIntensity, 0.1, 1.75);',
        '  } else {',
        '    float unitX = pixel.x / resolutionSafe.x;',
        '    float unitY = pixel.y / resolutionSafe.y;',
        '    zInput = vec2(',
        '      mix(u_viewBounds.x, u_viewBounds.y, unitX),',
        '      mix(u_viewBounds.w, u_viewBounds.z, unitY)',
        '    );',
        '  }',
        '',
        '  vec2 mappedValue = vec2(0.0);',
        '  bool ok = evaluateMappedValue(zInput, mappedValue);',
        '  if (!ok || !isFiniteVec2Compat(mappedValue)) {',
        '    float invalidAlpha = (u_useSphere > 0.5) ? 0.0 : 1.0;',
        '    gl_FragColor = vec4(0.0, 0.0, 0.0, invalidAlpha);',
        '    return;',
        '  }',
        '',
        '  gl_FragColor = domainColorForValue(mappedValue, brightnessFactor);',
        '}'
    ].join('\n');

    const program = createWebGLDomainColorProgram(gl, vertexSource, fragmentSource);
    if (!program) return null;

    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) {
        gl.deleteProgram(program);
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
    ]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uViewBounds = gl.getUniformLocation(program, 'u_viewBounds');
    const uDomainBrightness = gl.getUniformLocation(program, 'u_domainBrightness');
    const uDomainContrast = gl.getUniformLocation(program, 'u_domainContrast');
    const uDomainSaturation = gl.getUniformLocation(program, 'u_domainSaturation');
    const uDomainLightnessCycles = gl.getUniformLocation(program, 'u_domainLightnessCycles');
    const uUseSphere = gl.getUniformLocation(program, 'u_useSphere');
    const uSphereCenter = gl.getUniformLocation(program, 'u_sphereCenter');
    const uSphereRadius = gl.getUniformLocation(program, 'u_sphereRadius');
    const uRotX = gl.getUniformLocation(program, 'u_rotX');
    const uRotY = gl.getUniformLocation(program, 'u_rotY');
    const uLightDir = gl.getUniformLocation(program, 'u_lightDir');
    const uSphereLighting = gl.getUniformLocation(program, 'u_sphereLighting');
    const uIsWPlaneColoring = gl.getUniformLocation(program, 'u_isWPlaneColoring');
    const uFunctionId = gl.getUniformLocation(program, 'u_functionId');
    const uMobiusA = gl.getUniformLocation(program, 'u_mobiusA');
    const uMobiusB = gl.getUniformLocation(program, 'u_mobiusB');
    const uMobiusC = gl.getUniformLocation(program, 'u_mobiusC');
    const uMobiusD = gl.getUniformLocation(program, 'u_mobiusD');
    const uPolyDegree = gl.getUniformLocation(program, 'u_polyDegree');
    const uZetaContinuationEnabled = gl.getUniformLocation(program, 'u_zetaContinuationEnabled');
    const uZetaReflectionBoundary = gl.getUniformLocation(program, 'u_zetaReflectionBoundary');

    if (
        aPosition < 0 ||
        !uResolution || !uViewBounds ||
        !uDomainBrightness || !uDomainContrast || !uDomainSaturation || !uDomainLightnessCycles ||
        !uUseSphere || !uSphereCenter || !uSphereRadius || !uRotX || !uRotY ||
        !uLightDir || !uSphereLighting || !uIsWPlaneColoring || !uFunctionId ||
        !uMobiusA || !uMobiusB || !uMobiusC || !uMobiusD || !uPolyDegree ||
        !uZetaContinuationEnabled || !uZetaReflectionBoundary
    ) {
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(program);
        return null;
    }

    const uPolyCoeffs = [];
    for (let i = 0; i <= 10; i++) {
        uPolyCoeffs.push(gl.getUniformLocation(program, `u_polyCoeffs[${i}]`));
    }

    return {
        canvas,
        gl,
        program,
        quadBuffer,
        aPosition,
        uResolution,
        uViewBounds,
        uDomainBrightness,
        uDomainContrast,
        uDomainSaturation,
        uDomainLightnessCycles,
        uUseSphere,
        uSphereCenter,
        uSphereRadius,
        uRotX,
        uRotY,
        uLightDir,
        uSphereLighting,
        uIsWPlaneColoring,
        uFunctionId,
        uMobiusA,
        uMobiusB,
        uMobiusC,
        uMobiusD,
        uPolyDegree,
        uPolyCoeffs,
        uZetaContinuationEnabled,
        uZetaReflectionBoundary
    };
}

function getWebGLDomainColorFunctionId(functionName) {
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
        default: return 0;
    }
}

function isWebGLDomainColoringFunctionSupported(functionName, isWPlaneColoring = false) {
    if (isWPlaneColoring) return true;
    return getWebGLDomainColorFunctionId(functionName) !== 0;
}

function resizeWebGLDomainColorRenderer(renderer, width, height) {
    if (!renderer || !renderer.canvas || width <= 0 || height <= 0) return;
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width;
        renderer.canvas.height = height;
    }
}

function getNormalizedSphereLightDirection() {
    const lx = SPHERE_LIGHT_DIRECTION_CAMERA.x;
    const ly = SPHERE_LIGHT_DIRECTION_CAMERA.y;
    const lz = SPHERE_LIGHT_DIRECTION_CAMERA.z;
    const mag = Math.hypot(lx, ly, lz);
    if (!Number.isFinite(mag) || mag < 1e-9) {
        return { x: 0, y: 0, z: 1 };
    }
    return { x: lx / mag, y: ly / mag, z: lz / mag };
}

function setWebGLDomainColorMobiusUniforms(renderer) {
    const gl = renderer.gl;
    const a = state.mobiusA || { re: 1, im: 0 };
    const b = state.mobiusB || { re: 0, im: 0 };
    const c = state.mobiusC || { re: 0, im: 0 };
    const d = state.mobiusD || { re: 1, im: 0 };
    gl.uniform2f(renderer.uMobiusA, a.re || 0, a.im || 0);
    gl.uniform2f(renderer.uMobiusB, b.re || 0, b.im || 0);
    gl.uniform2f(renderer.uMobiusC, c.re || 0, c.im || 0);
    gl.uniform2f(renderer.uMobiusD, d.re || 0, d.im || 0);
}

function setWebGLDomainColorPolynomialUniforms(renderer) {
    const gl = renderer.gl;
    const degree = Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
    gl.uniform1i(renderer.uPolyDegree, degree);
    for (let i = 0; i <= 10; i++) {
        const location = renderer.uPolyCoeffs[i];
        if (!location) continue;
        const coeff = (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null;
        const re = coeff && Number.isFinite(coeff.re) ? coeff.re : 0;
        const im = coeff && Number.isFinite(coeff.im) ? coeff.im : 0;
        gl.uniform2f(location, re, im);
    }
}

function initializeWebGLDomainColoringSupport() {
    webglDomainColorSupport.available = false;
    webglDomainColorSupport.reason = 'disabled-or-unavailable';
    webglDomainColorSupport.renderers.z = null;
    webglDomainColorSupport.renderers.w = null;
    webglDomainColorSupport.diagnostics.z = null;
    webglDomainColorSupport.diagnostics.w = null;
    webglDomainColorSupport.warnedRuntimeFallback = false;
    if (webglDomainColorSupport.warnedFunctionFallbacks && webglDomainColorSupport.warnedFunctionFallbacks.clear) {
        webglDomainColorSupport.warnedFunctionFallbacks.clear();
    }

    if (!state || !state.webglDomainColoringEnabled) {
        webglDomainColorSupport.reason = 'disabled';
        return;
    }

    const rendererZ = createWebGLDomainColorRenderer();
    const rendererW = createWebGLDomainColorRenderer();
    if (!rendererZ && !rendererW) {
        webglDomainColorSupport.reason = 'context-or-program-init-failed';
        console.info('GPU domain coloring unavailable, using CPU fallback.');
        return;
    }

    webglDomainColorSupport.diagnostics.z = rendererZ ? getWebGLDomainColorBackendInfo(rendererZ.gl) : null;
    webglDomainColorSupport.diagnostics.w = rendererW ? getWebGLDomainColorBackendInfo(rendererW.gl) : null;

    webglDomainColorSupport.renderers.z = rendererZ;
    webglDomainColorSupport.renderers.w = rendererW;
    webglDomainColorSupport.available = true;
    webglDomainColorSupport.reason = (!rendererZ || !rendererW) ? 'partial-ready' : 'ready';
    const diag = webglDomainColorSupport.diagnostics.z || webglDomainColorSupport.diagnostics.w;
    if (diag) {
        const rendererLabel = diag.unmaskedRenderer || diag.renderer || 'unknown renderer';
        const vendorLabel = diag.unmaskedVendor || diag.vendor || 'unknown vendor';
        if (diag.softwareBackend) {
            console.warn(`GPU domain coloring is running on a software WebGL backend (${vendorLabel} | ${rendererLabel}).`);
        } else {
            console.info(`GPU domain coloring enabled on ${vendorLabel} | ${rendererLabel}.`);
        }
    } else {
        console.info('GPU domain coloring enabled.');
    }
}

function getWebGLDomainColorRenderer(planeKey) {
    if (!webglDomainColorSupport || !webglDomainColorSupport.renderers) return null;
    if (planeKey === 'z') return webglDomainColorSupport.renderers.z;
    if (planeKey === 'w') return webglDomainColorSupport.renderers.w;
    return null;
}

function inferDomainColorPlaneKey(targetCtx, planeKeyHint) {
    if (planeKeyHint === 'z' || planeKeyHint === 'w') return planeKeyHint;
    if (typeof zDomainColorCtx !== 'undefined' && targetCtx === zDomainColorCtx) return 'z';
    if (typeof wDomainColorCtx !== 'undefined' && targetCtx === wDomainColorCtx) return 'w';
    return 'z';
}

function warnWebGLDomainFunctionFallback(functionName) {
    if (!webglDomainColorSupport || !webglDomainColorSupport.warnedFunctionFallbacks) return;
    if (webglDomainColorSupport.warnedFunctionFallbacks.has(functionName)) return;
    webglDomainColorSupport.warnedFunctionFallbacks.add(functionName);
    console.info(`GPU domain coloring not available for "${functionName}", using CPU fallback.`);
}

function renderDomainColoringWithWebGL(targetCtx, planeParams, options = null) {
    if (!targetCtx || !planeParams || !webglDomainColorSupport || !webglDomainColorSupport.available) return false;
    if (!state || !state.webglDomainColoringEnabled) return false;

    const opts = options && typeof options === 'object' ? options : {};
    const planeKey = inferDomainColorPlaneKey(targetCtx, opts.planeKey);
    const renderer = getWebGLDomainColorRenderer(planeKey);
    if (!renderer || !renderer.gl) return false;

    const isWPlaneColoring = !!opts.isWPlaneColoring;
    const functionName = state.currentFunction;
    if (!isWebGLDomainColoringFunctionSupported(functionName, isWPlaneColoring)) {
        warnWebGLDomainFunctionFallback(functionName);
        return false;
    }

    const targetWidth = Math.max(1, Math.round(planeParams.width || 0));
    const targetHeight = Math.max(1, Math.round(planeParams.height || 0));
    if (targetWidth <= 0 || targetHeight <= 0) return false;

    const xRange = planeParams.currentVisXRange || planeParams.xRange;
    const yRange = planeParams.currentVisYRange || planeParams.yRange;
    if (!Array.isArray(xRange) || !Array.isArray(yRange) || xRange.length < 2 || yRange.length < 2) {
        return false;
    }

    const sphereParams = opts.sphereParams || null;
    const renderScale = getWebGLDomainColorRenderScale();
    const internalWidth = Math.max(1, Math.round(targetWidth * renderScale));
    const internalHeight = Math.max(1, Math.round(targetHeight * renderScale));
    const scaleX = internalWidth / targetWidth;
    const scaleY = internalHeight / targetHeight;
    const uniformScale = Math.min(scaleX, scaleY);

    resizeWebGLDomainColorRenderer(renderer, internalWidth, internalHeight);
    const gl = renderer.gl;

    try {
        gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height);
        gl.useProgram(renderer.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
        gl.enableVertexAttribArray(renderer.aPosition);
        gl.vertexAttribPointer(renderer.aPosition, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(renderer.uResolution, renderer.canvas.width, renderer.canvas.height);
        gl.uniform4f(renderer.uViewBounds, xRange[0], xRange[1], yRange[0], yRange[1]);

        const brightness = Number.isFinite(state.domainBrightness) ? state.domainBrightness : 1;
        const contrast = Number.isFinite(state.domainContrast) ? state.domainContrast : 1;
        const saturation = Number.isFinite(state.domainSaturation) ? state.domainSaturation : 1;
        const lightnessCycles = Number.isFinite(state.domainLightnessCycles) ? state.domainLightnessCycles : 1;
        gl.uniform1f(renderer.uDomainBrightness, brightness);
        gl.uniform1f(renderer.uDomainContrast, contrast);
        gl.uniform1f(renderer.uDomainSaturation, saturation);
        gl.uniform1f(renderer.uDomainLightnessCycles, lightnessCycles);

        const useSphere = !!sphereParams;
        gl.uniform1f(renderer.uUseSphere, useSphere ? 1 : 0);
        if (useSphere) {
            const sphereCenterXBase = Number.isFinite(sphereParams.centerX) ? sphereParams.centerX : (targetWidth * 0.5);
            const sphereCenterYBase = Number.isFinite(sphereParams.centerY) ? sphereParams.centerY : (targetHeight * 0.5);
            const sphereRadiusBase = Number.isFinite(sphereParams.radius) ? Math.max(0, sphereParams.radius) : 0;
            const sphereCenterX = sphereCenterXBase * scaleX;
            const sphereCenterY = sphereCenterYBase * scaleY;
            const sphereRadius = sphereRadiusBase * uniformScale;
            const rotX = Number.isFinite(sphereParams.rotX) ? sphereParams.rotX : 0;
            const rotY = Number.isFinite(sphereParams.rotY) ? sphereParams.rotY : 0;
            gl.uniform2f(renderer.uSphereCenter, sphereCenterX, sphereCenterY);
            gl.uniform1f(renderer.uSphereRadius, sphereRadius);
            gl.uniform1f(renderer.uRotX, rotX);
            gl.uniform1f(renderer.uRotY, rotY);
        } else {
            gl.uniform2f(renderer.uSphereCenter, internalWidth * 0.5, internalHeight * 0.5);
            gl.uniform1f(renderer.uSphereRadius, 0);
            gl.uniform1f(renderer.uRotX, 0);
            gl.uniform1f(renderer.uRotY, 0);
        }

        const lightDir = getNormalizedSphereLightDirection();
        gl.uniform3f(renderer.uLightDir, lightDir.x, lightDir.y, lightDir.z);
        gl.uniform4f(
            renderer.uSphereLighting,
            SPHERE_TEXTURE_AMBIENT_INTENSITY,
            SPHERE_TEXTURE_DIFFUSE_INTENSITY,
            SPHERE_TEXTURE_SPECULAR_INTENSITY,
            SPHERE_TEXTURE_SHININESS_FACTOR
        );

        gl.uniform1f(renderer.uIsWPlaneColoring, isWPlaneColoring ? 1 : 0);
        gl.uniform1f(renderer.uFunctionId, isWPlaneColoring ? 0 : getWebGLDomainColorFunctionId(functionName));
        gl.uniform1f(renderer.uZetaContinuationEnabled, state.zetaContinuationEnabled ? 1 : 0);
        gl.uniform1f(renderer.uZetaReflectionBoundary, ZETA_REFLECTION_POINT_RE);

        setWebGLDomainColorMobiusUniforms(renderer);
        setWebGLDomainColorPolynomialUniforms(renderer);

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        targetCtx.save();
        targetCtx.setTransform(1, 0, 0, 1, 0, 0);
        targetCtx.clearRect(0, 0, targetWidth, targetHeight);
        targetCtx.drawImage(
            renderer.canvas,
            0, 0, renderer.canvas.width, renderer.canvas.height,
            0, 0, targetWidth, targetHeight
        );
        targetCtx.restore();

        return true;
    } catch (error) {
        if (!webglDomainColorSupport.warnedRuntimeFallback) {
            console.warn('GPU domain coloring runtime failure, using CPU fallback:', error);
            webglDomainColorSupport.warnedRuntimeFallback = true;
        }
        return false;
    }
}

function getGPUBackendStatus() {
    const lineDiag = (typeof webglSupport !== 'undefined') ? webglSupport : null;
    const domainDiag = (typeof webglDomainColorSupport !== 'undefined') ? webglDomainColorSupport : null;
    const currentFunctionName = (typeof state !== 'undefined' && state && state.currentFunction)
        ? state.currentFunction
        : null;
    const currentFunctionGpuDomainSupported = currentFunctionName
        ? isWebGLDomainColoringFunctionSupported(currentFunctionName, false)
        : null;
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
            currentFunctionSupported: currentFunctionGpuDomainSupported,
            zetaContinuationEnabled: !!(state && state.zetaContinuationEnabled)
        } : null
    };
}

if (typeof window !== 'undefined') {
    window.getGPUBackendStatus = getGPUBackendStatus;
}
