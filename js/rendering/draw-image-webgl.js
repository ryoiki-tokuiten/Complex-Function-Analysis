// WebGL-based image transformation renderer for high-resolution point clouds
const webglImageSupport = {
    available: false,
    reason: 'not-initialized',
    renderer: null
};

function createWebGLImageRenderer() {
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
        'attribute vec2 a_texCoord;',
        'varying vec2 v_uv;',
        '',
        'uniform vec2 u_imageSize;',
        'uniform vec2 u_center;',
        'uniform vec4 u_viewBounds;',
        'uniform float u_pointSize;',
        '',
        'uniform float u_isWPlane;',
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
        'const int ZETA_GPU_TERMS = 72;',
        '',
        'float safeExp(float x) { return exp(clamp(x, -60.0, 60.0)); }',
        'float coshCompat(float x) { return 0.5 * (safeExp(x) + safeExp(-x)); }',
        'float sinhCompat(float x) { return 0.5 * (safeExp(x) - safeExp(-x)); }',
        'bool isFiniteFloatCompat(float value) { return (value == value) && abs(value) < 1.0e19; }',
        'bool isFiniteVec2Compat(vec2 value) { return isFiniteFloatCompat(value.x) && isFiniteFloatCompat(value.y); }',
        'vec2 complexAdd(vec2 a, vec2 b) { return a + b; }',
        'vec2 complexMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }',
        'vec2 complexDiv(vec2 num, vec2 den) { float denMagSq = max(dot(den, den), 1.0e-30); return vec2((num.x * den.x + num.y * den.y) / denMagSq, (num.y * den.x - num.x * den.y) / denMagSq); }',
        'vec2 complexExp(vec2 z) { float e = safeExp(z.x); return vec2(e * cos(z.y), e * sin(z.y)); }',
        'vec2 complexLn(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }',
        'vec2 complexSin(vec2 z) { return vec2(sin(z.x) * coshCompat(z.y), cos(z.x) * sinhCompat(z.y)); }',
        'vec2 complexCos(vec2 z) { return vec2(cos(z.x) * coshCompat(z.y), -sin(z.x) * sinhCompat(z.y)); }',
        'vec2 evalPolynomial(vec2 z) { vec2 acc = vec2(0.0, 0.0); vec2 zPow = vec2(1.0, 0.0); for (int i = 0; i <= 10; i++) { if (i <= u_polyDegree) { acc = complexAdd(acc, complexMul(u_polyCoeffs[i], zPow)); } zPow = complexMul(zPow, z); } return acc; }',
        'vec2 complexPowPositiveRealBase(float positiveBase, vec2 exponent) { float lnBase = log(max(positiveBase, 1.0e-30)); float magnitude = safeExp(exponent.x * lnBase); float angle = exponent.y * lnBase; return vec2(magnitude * cos(angle), magnitude * sin(angle)); }',
        'bool evaluateZeta(vec2 s, out vec2 value) { if (abs(s.x - 1.0) < 1.0e-6 && abs(s.y) < 1.0e-6) return false; if (u_zetaContinuationEnabled < 0.5 && s.x <= u_zetaReflectionBoundary) return false; vec2 etaSum = vec2(0.0, 0.0); vec2 negS = vec2(-s.x, -s.y); for (int n = 1; n <= ZETA_GPU_TERMS; n++) { vec2 nPowNegS = complexPowPositiveRealBase(float(n), negS); float alternatingSign = (mod(float(n), 2.0) < 0.5) ? -1.0 : 1.0; etaSum += nPowNegS * alternatingSign; } vec2 oneMinusS = vec2(1.0 - s.x, -s.y); vec2 twoPowOneMinusS = complexPowPositiveRealBase(2.0, oneMinusS); vec2 denominator = vec2(1.0, 0.0) - twoPowOneMinusS; if (dot(denominator, denominator) < 1.0e-18) return false; value = complexDiv(etaSum, denominator); return isFiniteVec2Compat(value); }',
        '',
        'bool evaluateMappedValue(vec2 z, out vec2 mapped) {',
        '  if (u_isWPlane < 0.5) { mapped = z; return isFiniteVec2Compat(mapped); }',
        '  float functionId = floor(u_functionId + 0.5);',
        '  if (abs(functionId - 1.0) < 0.5) { mapped = complexCos(z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 2.0) < 0.5) { mapped = complexSin(z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 3.0) < 0.5) { vec2 denTan = complexCos(z); if (dot(denTan, denTan) < 1.0e-18) return false; mapped = complexDiv(complexSin(z), denTan); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 4.0) < 0.5) { vec2 denSec = complexCos(z); if (dot(denSec, denSec) < 1.0e-18) return false; mapped = complexDiv(vec2(1.0, 0.0), denSec); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 5.0) < 0.5) { mapped = complexExp(z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 6.0) < 0.5) { if (dot(z, z) < 1.0e-20) return false; mapped = complexLn(z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 7.0) < 0.5) { if (dot(z, z) < 1.0e-18) return false; mapped = complexDiv(vec2(1.0, 0.0), z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 8.0) < 0.5) { vec2 num = complexAdd(complexMul(u_mobiusA, z), u_mobiusB); vec2 den = complexAdd(complexMul(u_mobiusC, z), u_mobiusD); if (dot(den, den) < 1.0e-18) return false; mapped = complexDiv(num, den); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 9.0) < 0.5) { mapped = evalPolynomial(z); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 10.0) < 0.5) { if (z.y <= 1.0e-9) return false; float rootY = sqrt(max(z.y, 0.0)); if (!isFiniteFloatCompat(rootY) || rootY <= 1.0e-8) return false; mapped = vec2(z.x / rootY, rootY); return isFiniteVec2Compat(mapped); }',
        '  if (abs(functionId - 11.0) < 0.5) { return evaluateZeta(z, mapped); }',
        '  return false;',
        '}',
        '',
        'void main() {',
        '  v_uv = a_texCoord;',
        '  float nx = a_texCoord.x * 2.0 - 1.0;',
        '  float ny = -(a_texCoord.y * 2.0 - 1.0);', // texture image Y inverted naturally
        '  vec2 zInput = vec2(u_center.x + nx * (u_imageSize.x / 2.0), u_center.y + ny * (u_imageSize.y / 2.0));',
        '',
        '  vec2 mappedValue = zInput;',
        '  bool ok = evaluateMappedValue(zInput, mappedValue);',
        '  if (!ok || !isFiniteVec2Compat(mappedValue)) {',
        '    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);', // offscreen
        '    gl_PointSize = 0.0;',
        '    return;',
        '  }',
        '',
        '  float clipX = (mappedValue.x - u_viewBounds.x) / (u_viewBounds.y - u_viewBounds.x) * 2.0 - 1.0;',
        '  float clipY = (mappedValue.y - u_viewBounds.z) / (u_viewBounds.w - u_viewBounds.z) * 2.0 - 1.0;',
        '  gl_Position = vec4(clipX, clipY, 0.0, 1.0);',
        '  gl_PointSize = u_pointSize;',
        '}'
    ].join('\n');

    const fragmentSource = [
        'precision mediump float;',
        'varying vec2 v_uv;',
        'uniform sampler2D u_texture;',
        'uniform float u_opacity;',
        'void main() {',
        '  vec4 color = texture2D(u_texture, v_uv);',
        '  if (color.a < 0.05) discard;',
        '  gl_FragColor = vec4(color.rgb * color.a, color.a) * u_opacity;', // Pre-multiplied alpha
        '}'
    ].join('\n');

    const program = createWebGLProgram(gl, vertexSource, fragmentSource);
    if (!program) return null;

    const uvBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    
    // Fallback simple white 1x1 texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    const locations = {
        aTexCoord: gl.getAttribLocation(program, 'a_texCoord'),
        uImageSize: gl.getUniformLocation(program, 'u_imageSize'),
        uCenter: gl.getUniformLocation(program, 'u_center'),
        uViewBounds: gl.getUniformLocation(program, 'u_viewBounds'),
        uPointSize: gl.getUniformLocation(program, 'u_pointSize'),
        uIsWPlane: gl.getUniformLocation(program, 'u_isWPlane'),
        uFunctionId: gl.getUniformLocation(program, 'u_functionId'),
        uOpacity: gl.getUniformLocation(program, 'u_opacity'),
        uMobiusA: gl.getUniformLocation(program, 'u_mobiusA'),
        uMobiusB: gl.getUniformLocation(program, 'u_mobiusB'),
        uMobiusC: gl.getUniformLocation(program, 'u_mobiusC'),
        uMobiusD: gl.getUniformLocation(program, 'u_mobiusD'),
        uPolyDegree: gl.getUniformLocation(program, 'u_polyDegree'),
        uPolyCoeffs: [],
        uZetaContinuationEnabled: gl.getUniformLocation(program, 'u_zetaContinuationEnabled'),
        uZetaReflectionBoundary: gl.getUniformLocation(program, 'u_zetaReflectionBoundary'),
        uTexture: gl.getUniformLocation(program, 'u_texture')
    };

    for (let i = 0; i <= 10; i++) {
        locations.uPolyCoeffs.push(gl.getUniformLocation(program, `u_polyCoeffs[${i}]`));
    }

    return {
        canvas, gl, program, uvBuffer, texture, locations,
        uploadedImage: null,
        pointCount: 0,
        currentResolution: 0
    };
}

function initWebGLImageSupportIfNeeded() {
    if (webglImageSupport.renderer) return;
    const renderer = createWebGLImageRenderer();
    if (renderer) {
        webglImageSupport.renderer = renderer;
        webglImageSupport.available = true;
        webglImageSupport.reason = 'ready';
    } else {
        webglImageSupport.available = false;
        webglImageSupport.reason = 'failed_to_initialize';
    }
}

function updateImageWebGLTextureAndBuffer(renderer) {
    const gl = renderer.gl;
    const currentRes = state.imageResolution || 300;
    
    // Only upload texture if new image available or not uploaded yet
    if (state.uploadedImage && state.uploadedImage !== renderer.uploadedImage) {
        renderer.uploadedImage = state.uploadedImage;
        gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.uploadedImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    // Recreate buffer if resolution changed
    if (renderer.currentResolution !== currentRes) {
        renderer.currentResolution = currentRes;
        const resX = currentRes;
        const resY = currentRes;
        const uvs = new Float32Array(resX * resY * 2);
        let idx = 0;
        for (let y = 0; y < resY; y++) {
            for (let x = 0; x < resX; x++) {
                uvs[idx++] = (x + 0.5) / resX;
                uvs[idx++] = (y + 0.5) / resY;
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        renderer.pointCount = resX * resY;
    }
}

function drawImageWithWebGL(targetCtx, planeParams, isWP) {
    initWebGLImageSupportIfNeeded();
    if (!webglImageSupport.available || !state.uploadedImage) return false;
    
    const renderer = webglImageSupport.renderer;
    const gl = renderer.gl;
    const loc = renderer.locations;
    
    // Resize gl canvas
    const width = targetCtx.canvas.width;
    const height = targetCtx.canvas.height;
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width;
        renderer.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    
    // Update buffers
    updateImageWebGLTextureAndBuffer(renderer);
    if (!renderer.pointCount) return false;
    
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.uvBuffer);
    gl.enableVertexAttribArray(loc.aTexCoord);
    gl.vertexAttribPointer(loc.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    // Setup Uniforms
    const size = state.imageSize || 2.0;
    const cx = state.a0 || 0;
    const cy = state.b0 || 0;
    
    gl.uniform2f(loc.uImageSize, size, size); // Can make this respect aspect ratio if wanted
    gl.uniform2f(loc.uCenter, cx, cy);
    
    const xRange = planeParams.currentVisXRange || planeParams.xRange;
    const yRange = planeParams.currentVisYRange || planeParams.yRange;
    gl.uniform4f(loc.uViewBounds, xRange[0], xRange[1], yRange[0], yRange[1]);
    
    // Compute point size based on zoom and density.
    // If we map a domain of size W across N points, spacing is W/N.
    // Screen size is ViewportSize * (W/N) / xRangeSpan.
    const pointScreenSpacing = (width * (size / renderer.currentResolution)) / (xRange[1] - xRange[0]);
    // Add 1.5 to overlap points slightly to avoid gaps.
    gl.uniform1f(loc.uPointSize, Math.max(1.5, pointScreenSpacing * 1.5));
    
    gl.uniform1f(loc.uIsWPlane, isWP ? 1 : 0);
    gl.uniform1f(loc.uOpacity, typeof state.imageOpacity === 'number' ? state.imageOpacity : 1.0);
    
    if (isWP) {
        // Assume getWebGLDomainColorFunctionId exists in webgl-domain-coloring.js
        const funcId = (typeof getWebGLDomainColorFunctionId === 'function') ? getWebGLDomainColorFunctionId(state.currentFunction) : 0;
        gl.uniform1f(loc.uFunctionId, funcId);
        
        // Mobius
        const a = state.mobiusA || { re: 1, im: 0 };
        const b = state.mobiusB || { re: 0, im: 0 };
        const c = state.mobiusC || { re: 0, im: 0 };
        const d = state.mobiusD || { re: 1, im: 0 };
        gl.uniform2f(loc.uMobiusA, a.re || 0, a.im || 0);
        gl.uniform2f(loc.uMobiusB, b.re || 0, b.im || 0);
        gl.uniform2f(loc.uMobiusC, c.re || 0, c.im || 0);
        gl.uniform2f(loc.uMobiusD, d.re || 0, d.im || 0);
        
        // Polynomial
        const degree = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        gl.uniform1i(loc.uPolyDegree, degree);
        for (let i = 0; i <= 10; i++) {
            const coeff = (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null;
            gl.uniform2f(loc.uPolyCoeffs[i], coeff ? (coeff.re || 0) : 0, coeff ? (coeff.im || 0) : 0);
        }
        
        // Zeta
        gl.uniform1f(loc.uZetaContinuationEnabled, state.zetaContinuationEnabled ? 1 : 0);
        gl.uniform1f(loc.uZetaReflectionBoundary, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);
    }
    
    // Bind Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
    gl.uniform1i(loc.uTexture, 0);
    
    gl.drawArrays(gl.POINTS, 0, renderer.pointCount);
    
    // Copy result to target context
    targetCtx.save();
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.drawImage(renderer.canvas, 0, 0);
    targetCtx.restore();
    
    return true;
}
