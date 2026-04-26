// WebGL-based raster media transformation renderer
// Two rendering paths:
//   1. Inverse full-screen quad (O(1) geometry, pixel-perfect) for analytically invertible functions
//   2. Forward indexed mesh for non-invertible functions (zeta, polynomial deg > 2)

const webglImageSupport = {
    available: false,
    reason: 'not-initialized',
    renderer: null
};

// Returns true if the current function supports the O(1) inverse rendering path.
// Newton-Raphson numerical inversion exists in the shader for zeta/poly>2 but is
// not viable for image rendering: multi-valued functions converge to wrong branches
// from an arbitrary initial guess. These fall back to the forward indexed mesh.
function isInverseImageRenderSupported() {
    const funcId = (typeof getWebGLDomainColorFunctionIdShared === 'function')
        ? getWebGLDomainColorFunctionIdShared(state.currentFunction) : 0;
    if (funcId === 11) return false; // zeta — no stable inverse
    if (funcId === 9) return (state.polynomialN || 0) <= 2; // poly — analytic only for deg ≤ 2
    return funcId >= 1 && funcId <= 15;
}

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

    // ── Path 1: Inverse full-screen quad ──────────────────────────────────
    const inverseVS = [
        'attribute vec2 a_position;',
        'varying vec2 v_uv;',
        'void main() {',
        '  v_uv = (a_position + 1.0) * 0.5;',
        '  gl_Position = vec4(a_position, 0.0, 1.0);',
        '}'
    ].join('\n');

    const inverseFS = [
        'precision mediump float;',
        'varying vec2 v_uv;',
        'uniform sampler2D u_texture;',
        'uniform vec2 u_resolution;',
        'uniform vec4 u_viewBounds;',
        'uniform vec2 u_imageSize;',
        'uniform vec2 u_center;',
        'uniform float u_opacity;',
        'uniform float u_isWPlane;',
        'uniform float u_functionId;',
        'uniform vec2 u_mobiusA;',
        'uniform vec2 u_mobiusB;',
        'uniform vec2 u_mobiusC;',
        'uniform vec2 u_mobiusD;',
        'uniform int u_polyDegree;',
        'uniform vec2 u_polyCoeffs[11];',
        'uniform int u_chainIndex;',
        'uniform int u_chainMode;',
        'uniform float u_fracPower;',
        '',
        GLSL_COMPLEX_MATH_LIBRARY,
        GLSL_COMPLEX_INVERSE_LIBRARY,
        '',
        'vec2 complexPowReal(vec2 b, float e) { vec2 l=complexLn(b); return complexExp(vec2(l.x*e,l.y*e)); }',
        '',
        'void main() {',
        '  vec2 w = vec2(',
        '    mix(u_viewBounds.x, u_viewBounds.y, v_uv.x),',
        '    mix(u_viewBounds.w, u_viewBounds.z, 1.0-v_uv.y)',
        '  );',
        '',
        '  vec2 z = w;',
        '  if (u_isWPlane > 0.5) {',
        '    if (u_chainMode == 1) {',
        '      for (int i=0;i<16;i++) { if(i>u_chainIndex) break; vec2 p=z; if(!evaluateInverseFunction(p,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_fracPower,z)) discard; }',
        '    } else {',
        '      for (int i=0;i<16;i++) { if(i>=u_chainIndex) break;',
        '        if(u_chainMode==2) { z=complexPowReal(z,1.0/float(u_chainIndex+1)); break; }',
        '        if(u_chainMode==3) { z=complexPowReal(z,pow(2.0,float(u_chainIndex))); break; }',
        '        if(u_chainMode==4) z=complexExp(z);',
        '        if(u_chainMode==5) { if(dot(z,z)<1e-20) discard; z=complexLn(z); }',
        '        if(u_chainMode==6) { if(dot(z,z)<1e-18) discard; z=complexDiv(vec2(1.0,0.0),z); }',
        '      }',
        '      vec2 p=z; if(!evaluateInverseFunction(p,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_fracPower,z)) discard;',
        '    }',
        '  }',
        '',
        '  vec2 imgUV = vec2(0.5+(z.x-u_center.x)/u_imageSize.x, 0.5-(z.y-u_center.y)/u_imageSize.y);',
        '  if (imgUV.x<0.0||imgUV.x>1.0||imgUV.y<0.0||imgUV.y>1.0) discard;',
        '  vec4 color = texture2D(u_texture, imgUV);',
        '  if (color.a<0.05) discard;',
        '  gl_FragColor = vec4(color.rgb*color.a, color.a)*u_opacity;',
        '}'
    ].join('\n');

    const inverseProgram = createWebGLProgramShared(gl, inverseVS, inverseFS);

    // ── Path 2: Forward indexed mesh ──────────────────────────────────────
    const forwardVS = [
        'attribute vec2 a_texCoord;',
        'varying vec2 v_uv;',
        'varying float v_valid;',
        '',
        'uniform vec2 u_imageSize;',
        'uniform vec2 u_center;',
        'uniform vec4 u_viewBounds;',
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
        'uniform float u_fracPower;',
        '',
        GLSL_COMPLEX_MATH_LIBRARY,
        '',
        'void main() {',
        '  v_uv = a_texCoord;',
        '  float nx = a_texCoord.x * 2.0 - 1.0;',
        '  float ny = -(a_texCoord.y * 2.0 - 1.0);',
        '  vec2 zInput = vec2(u_center.x + nx * (u_imageSize.x / 2.0), u_center.y + ny * (u_imageSize.y / 2.0));',
        '',
        '  vec2 mappedValue = vec2(0.0);',
        '  float isWP = (u_isWPlane > 0.5) ? 0.0 : 1.0;',
        '  bool ok = evaluateMappedValueBase(zInput, isWP, u_functionId, u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs, u_zetaContinuationEnabled, u_zetaReflectionBoundary, u_fracPower, mappedValue);',
        '  if (!ok || !isFiniteVec2Compat(mappedValue)) {',
        '    v_valid = 0.0;',
        '    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);',
        '    return;',
        '  }',
        '',
        '  v_valid = 1.0;',
        '  float clipX = (mappedValue.x - u_viewBounds.x) / (u_viewBounds.y - u_viewBounds.x) * 2.0 - 1.0;',
        '  float clipY = (mappedValue.y - u_viewBounds.z) / (u_viewBounds.w - u_viewBounds.z) * 2.0 - 1.0;',
        '  gl_Position = vec4(clipX, clipY, 0.0, 1.0);',
        '}'
    ].join('\n');

    const forwardFS = [
        'precision mediump float;',
        'varying vec2 v_uv;',
        'varying float v_valid;',
        'uniform sampler2D u_texture;',
        'uniform float u_opacity;',
        'void main() {',
        '  if (v_valid < 0.99) discard;',
        '  vec4 color = texture2D(u_texture, v_uv);',
        '  if (color.a < 0.05) discard;',
        '  gl_FragColor = vec4(color.rgb * color.a, color.a) * u_opacity;',
        '}'
    ].join('\n');

    const forwardProgram = createWebGLProgramShared(gl, forwardVS, forwardFS);
    if (!inverseProgram && !forwardProgram) return null;

    // Shared resources
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    // Full-screen quad for inverse path (4 vertices, always)
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    // Forward path buffers (indexed)
    const forwardVertexBuffer = gl.createBuffer();
    const forwardIndexBuffer = gl.createBuffer();

    // Cache uniform locations for both programs
    function getLocs(prog, extras) {
        if (!prog) return null;
        const locs = {
            uImageSize: gl.getUniformLocation(prog, 'u_imageSize'),
            uCenter: gl.getUniformLocation(prog, 'u_center'),
            uViewBounds: gl.getUniformLocation(prog, 'u_viewBounds'),
            uIsWPlane: gl.getUniformLocation(prog, 'u_isWPlane'),
            uFunctionId: gl.getUniformLocation(prog, 'u_functionId'),
            uOpacity: gl.getUniformLocation(prog, 'u_opacity'),
            uMobiusA: gl.getUniformLocation(prog, 'u_mobiusA'),
            uMobiusB: gl.getUniformLocation(prog, 'u_mobiusB'),
            uMobiusC: gl.getUniformLocation(prog, 'u_mobiusC'),
            uMobiusD: gl.getUniformLocation(prog, 'u_mobiusD'),
            uPolyDegree: gl.getUniformLocation(prog, 'u_polyDegree'),
            uPolyCoeffs: [],
            uTexture: gl.getUniformLocation(prog, 'u_texture')
        };
        for (let i = 0; i <= 10; i++) locs.uPolyCoeffs.push(gl.getUniformLocation(prog, `u_polyCoeffs[${i}]`));
        if (extras) Object.assign(locs, extras);
        return locs;
    }

    const inverseLocs = getLocs(inverseProgram, {
        aPosition: inverseProgram ? gl.getAttribLocation(inverseProgram, 'a_position') : -1,
        uResolution: inverseProgram ? gl.getUniformLocation(inverseProgram, 'u_resolution') : null,
        uChainIndex: inverseProgram ? gl.getUniformLocation(inverseProgram, 'u_chainIndex') : null,
        uChainMode: inverseProgram ? gl.getUniformLocation(inverseProgram, 'u_chainMode') : null,
        uFracPower: inverseProgram ? gl.getUniformLocation(inverseProgram, 'u_fracPower') : null,
    });

    const forwardLocs = getLocs(forwardProgram, {
        aTexCoord: forwardProgram ? gl.getAttribLocation(forwardProgram, 'a_texCoord') : -1,
        uZetaContinuationEnabled: forwardProgram ? gl.getUniformLocation(forwardProgram, 'u_zetaContinuationEnabled') : null,
        uZetaReflectionBoundary: forwardProgram ? gl.getUniformLocation(forwardProgram, 'u_zetaReflectionBoundary') : null,
        uFracPower: forwardProgram ? gl.getUniformLocation(forwardProgram, 'u_fracPower') : null,
    });

    return {
        canvas, gl, texture, quadBuffer,
        inverseProgram, inverseLocs,
        forwardProgram, forwardLocs,
        forwardVertexBuffer, forwardIndexBuffer,
        uploadedSource: null,
        uploadedSourceToken: -1,
        forwardIndexCount: 0,
        forwardResolution: 0
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

function updateImageTexture(renderer) {
    const gl = renderer.gl;
    const currentShape = state.currentInputShape;
    const source = getRasterSourceForShape(currentShape);
    const sourceToken = getRasterVersionTokenForShape(currentShape);
    if (!source) { renderer.uploadedSource = null; renderer.uploadedSourceToken = -1; return false; }
    if (currentShape === 'video' && source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

    if (renderer.uploadedSource !== source || renderer.uploadedSourceToken !== sourceToken) {
        renderer.uploadedSource = source;
        renderer.uploadedSourceToken = sourceToken;
        gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    return true;
}

// Build indexed mesh for forward path. Uses Uint16/Uint32 index buffer to avoid
// duplicating shared vertices — 3x less data than the old 6-verts-per-quad approach.
function ensureForwardMesh(renderer, currentRes) {
    if (renderer.forwardResolution === currentRes) return;
    renderer.forwardResolution = currentRes;
    const gl = renderer.gl;

    const currentShape = state.currentInputShape;
    const aspect = getRasterAspectRatioForShape(currentShape) || 1.0;
    const resX = Math.max(2, aspect >= 1 ? currentRes : Math.round(currentRes * aspect));
    const resY = Math.max(2, aspect >= 1 ? Math.round(currentRes / aspect) : currentRes);

    // Vertex buffer: resX * resY unique UV pairs
    const vertCount = resX * resY;
    const verts = new Float32Array(vertCount * 2);
    let vi = 0;
    for (let y = 0; y < resY; y++) {
        for (let x = 0; x < resX; x++) {
            verts[vi++] = x / (resX - 1);
            verts[vi++] = y / (resY - 1);
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.forwardVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    // Index buffer: 6 indices per quad cell
    const cellCount = (resX - 1) * (resY - 1);
    const useUint32 = vertCount > 65535;
    const IndexArray = useUint32 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(cellCount * 6);
    let ii = 0;
    for (let y = 0; y < resY - 1; y++) {
        for (let x = 0; x < resX - 1; x++) {
            const tl = y * resX + x;
            const tr = tl + 1;
            const bl = tl + resX;
            const br = bl + 1;
            indices[ii++] = tl; indices[ii++] = bl; indices[ii++] = tr;
            indices[ii++] = tr; indices[ii++] = bl; indices[ii++] = br;
        }
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.forwardIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    renderer.forwardIndexCount = cellCount * 6;
    renderer.forwardIndexType = useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    // Enable OES_element_index_uint if needed
    if (useUint32) gl.getExtension('OES_element_index_uint');
}

// Set common uniforms shared by both paths
function setImageUniforms(gl, locs, planeParams, isWP, currentShape) {
    const { width: mediaWidth, height: mediaHeight } = getRasterDisplayDimensions(currentShape);
    const cx = state.a0 || 0;
    const cy = state.b0 || 0;
    gl.uniform2f(locs.uImageSize, mediaWidth, mediaHeight);
    gl.uniform2f(locs.uCenter, cx, cy);

    const xRange = planeParams.currentVisXRange || planeParams.xRange;
    const yRange = planeParams.currentVisYRange || planeParams.yRange;
    gl.uniform4f(locs.uViewBounds, xRange[0], xRange[1], yRange[0], yRange[1]);

    gl.uniform1f(locs.uIsWPlane, isWP ? 1 : 0);
    gl.uniform1f(locs.uOpacity, getRasterOpacityForShape(currentShape));

    if (isWP) {
        const funcId = (typeof getWebGLDomainColorFunctionIdShared === 'function') ? getWebGLDomainColorFunctionIdShared(state.currentFunction) : 0;
        gl.uniform1f(locs.uFunctionId, funcId);

        const a = state.mobiusA || { re: 1, im: 0 }, b = state.mobiusB || { re: 0, im: 0 };
        const c = state.mobiusC || { re: 0, im: 0 }, d = state.mobiusD || { re: 1, im: 0 };
        gl.uniform2f(locs.uMobiusA, a.re || 0, a.im || 0);
        gl.uniform2f(locs.uMobiusB, b.re || 0, b.im || 0);
        gl.uniform2f(locs.uMobiusC, c.re || 0, c.im || 0);
        gl.uniform2f(locs.uMobiusD, d.re || 0, d.im || 0);

        const degree = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        gl.uniform1i(locs.uPolyDegree, degree);
        for (let i = 0; i <= 10; i++) {
            const coeff = (state.polynomialCoeffs && state.polynomialCoeffs[i]) ? state.polynomialCoeffs[i] : null;
            gl.uniform2f(locs.uPolyCoeffs[i], coeff ? (coeff.re || 0) : 0, coeff ? (coeff.im || 0) : 0);
        }
        if (locs.uFracPower !== undefined && locs.uFracPower !== null) {
            gl.uniform1f(locs.uFracPower, state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5);
        }
    }
}

function drawImageWithWebGL(targetCtx, planeParams, isWP, chainIndex) {
    initWebGLImageSupportIfNeeded();
    const currentShape = state.currentInputShape;
    const source = getRasterSourceForShape(currentShape);
    if (!webglImageSupport.available || !isRasterInputShape(currentShape) || !source) return false;
    if (currentShape === 'video' && source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

    const renderer = webglImageSupport.renderer;
    const gl = renderer.gl;
    const ci = chainIndex || 0;

    if (!targetCtx || typeof targetCtx.drawImage !== 'function') return false;

    // Resize canvas
    const width = (targetCtx.canvas && targetCtx.canvas.width) || planeParams.width;
    const height = (targetCtx.canvas && targetCtx.canvas.height) || planeParams.height;
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width;
        renderer.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);

    if (!updateImageTexture(renderer)) return false;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);

    // Choose rendering path
    const useInverse = !isWP || (isWP && isInverseImageRenderSupported());

    if (useInverse && renderer.inverseProgram) {
        const locs = renderer.inverseLocs;
        gl.useProgram(renderer.inverseProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
        gl.enableVertexAttribArray(locs.aPosition);
        gl.vertexAttribPointer(locs.aPosition, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(locs.uResolution, width, height);
        setImageUniforms(gl, locs, planeParams, isWP, currentShape);
        gl.uniform1i(locs.uTexture, 0);
        // Chain mode: 0=none,1=recursion,2=power,3=sqrt,4=ln,5=exp,6=reciprocal
        const chainModeMap = {recursion:1,power:2,sqrt:3,ln:4,exp:5,reciprocal:6};
        gl.uniform1i(locs.uChainIndex, ci);
        gl.uniform1i(locs.uChainMode, (ci > 0 && state.chainingEnabled) ? (chainModeMap[state.chainingMode] || 1) : 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (renderer.forwardProgram) {
        // ── Path 2: Forward indexed mesh ──────────────────────────────────
        const currentRes = getRasterResolutionForShape(currentShape) || 300;
        ensureForwardMesh(renderer, currentRes);
        if (!renderer.forwardIndexCount) return false;

        const locs = renderer.forwardLocs;
        gl.useProgram(renderer.forwardProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.forwardVertexBuffer);
        gl.enableVertexAttribArray(locs.aTexCoord);
        gl.vertexAttribPointer(locs.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.forwardIndexBuffer);
        setImageUniforms(gl, locs, planeParams, isWP, currentShape);
        gl.uniform1i(locs.uTexture, 0);

        if (locs.uZetaContinuationEnabled) gl.uniform1f(locs.uZetaContinuationEnabled, state.zetaContinuationEnabled ? 1 : 0);
        if (locs.uZetaReflectionBoundary) gl.uniform1f(locs.uZetaReflectionBoundary, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);

        gl.drawElements(gl.TRIANGLES, renderer.forwardIndexCount, renderer.forwardIndexType, 0);
    } else {
        return false;
    }

    // Composite to target 2D context
    targetCtx.save();
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.drawImage(renderer.canvas, 0, 0);
    targetCtx.restore();
    return true;
}

// ── GPU Vector Field via SDF arrows ───────────────────────────────────────
// Full-screen quad where the fragment shader evaluates f(z) at grid cell centers
// and draws arrows using signed distance fields. Zero CPU function evaluations.
let _vfProgram = null, _vfLocs = null;

const _VF_FS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform vec4 u_viewBounds;',
    'uniform float u_density;',
    'uniform float u_arrowScale;',
    'uniform float u_thickness;',
    'uniform float u_headSize;',
    'uniform float u_vectorMode;',
    'uniform float u_functionId;',
    'uniform vec2 u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD;',
    'uniform int u_polyDegree;',
    'uniform vec2 u_polyCoeffs[11];',
    'uniform float u_zetaContinuationEnabled;',
    'uniform float u_zetaReflectionBoundary;',
    'uniform float u_brightness;',
    '',
    GLSL_COMPLEX_MATH_LIBRARY,
    '',
    'vec3 hsl2rgb(float h,float s,float l){float c=(1.0-abs(2.0*l-1.0))*s;float x=c*(1.0-abs(mod(h*6.0,2.0)-1.0));float m=l-c*0.5;vec3 r;float hh=h*6.0;if(hh<1.0)r=vec3(c,x,0);else if(hh<2.0)r=vec3(x,c,0);else if(hh<3.0)r=vec3(0,c,x);else if(hh<4.0)r=vec3(0,x,c);else if(hh<5.0)r=vec3(x,0,c);else r=vec3(c,0,x);return r+m;}',
    '',
    'float sdfSeg(vec2 p,vec2 a,vec2 b){vec2 ab=b-a,ap=p-a;float t=clamp(dot(ap,ab)/max(dot(ab,ab),1e-12),0.0,1.0);return length(ap-ab*t);}',
    '',
    'bool inTri(vec2 p,vec2 a,vec2 b,vec2 c){float d1=(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y);float d2=(p.x-c.x)*(b.y-c.y)-(b.x-c.x)*(p.y-c.y);float d3=(p.x-a.x)*(c.y-a.y)-(c.x-a.x)*(p.y-a.y);return(d1>=0.0&&d2>=0.0&&d3>=0.0)||(d1<=0.0&&d2<=0.0&&d3<=0.0);}',
    '',
    'void main(){',
    '  vec2 w=vec2(mix(u_viewBounds.x,u_viewBounds.y,v_uv.x),mix(u_viewBounds.w,u_viewBounds.z,1.0-v_uv.y));',
    '  float cellW=(u_viewBounds.y-u_viewBounds.x)/u_density;',
    '  float cellH=(u_viewBounds.w-u_viewBounds.z)/u_density;',
    '  float cell=min(cellW,cellH);',
    '  vec2 cc=vec2(floor(w.x/cellW+0.5)*cellW, floor(w.y/cellH+0.5)*cellH);',
    '',
    '  vec2 fz;',
    '  bool ok=evaluateMappedValueBase(cc,0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,fz);',
    '  if(!ok) discard;',
    '',
    '  if(u_vectorMode>0.5&&u_vectorMode<1.5){float m2=dot(fz,fz);if(m2<1e-12) discard;fz=vec2(fz.x/m2,-fz.y/m2);}',
    '  if(u_vectorMode>1.5){float h=1e-5;vec2 fr,fl;evaluateMappedValueBase(cc+vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,fr);evaluateMappedValueBase(cc-vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,fl);fz=(fr-fl)/(2.0*h);}',
    '',
    '  float mag=length(fz);',
    '  if(mag<1e-9) discard;',
    '  vec2 dir=fz/mag;',
    '  vec2 perp=vec2(-dir.y,dir.x);',
    '',
    '  float aLen=cell*0.38*u_arrowScale;',
    '  float aW=cell*u_thickness*0.015;',
    '  float hSz=cell*u_headSize*0.04;',
    '  vec2 tip=cc+dir*aLen;',
    '',
    '  float dShaft=sdfSeg(w,cc,tip-dir*hSz*1.5);',
    '  bool onHead=inTri(w,tip,tip-dir*hSz*2.5+perp*hSz,tip-dir*hSz*2.5-perp*hSz);',
    '',
    '  if(dShaft>aW&&!onHead) discard;',
    '',
    '  float phase=atan(fz.y,fz.x)/(2.0*PI);',
    '  if(phase<0.0)phase+=1.0;',
    '  float lm=log(1.0+mag);',
    '  float lit=clamp(0.35+lm*0.08*u_brightness,0.2,0.85);',
    '  vec3 col=hsl2rgb(phase,0.85,lit);',
    '  float aa=onHead?1.0:1.0-smoothstep(aW*0.6,aW,dShaft);',
    '  gl_FragColor=vec4(col*aa,aa);',
    '}'
].join('\n');

function drawVectorFieldWithWebGL(ctx, planeParams) {
    initWebGLImageSupportIfNeeded();
    if (!webglImageSupport.available) return false;
    const renderer = webglImageSupport.renderer;
    const gl = renderer.gl;

    // Lazy-create vector field shader program
    if (!_vfProgram) {
        const vs = 'attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
        _vfProgram = createWebGLProgramShared(gl, vs, _VF_FS);
        if (!_vfProgram) return false;
        _vfLocs = {
            aPos: gl.getAttribLocation(_vfProgram, 'a_position'),
            uViewBounds: gl.getUniformLocation(_vfProgram, 'u_viewBounds'),
            uDensity: gl.getUniformLocation(_vfProgram, 'u_density'),
            uArrowScale: gl.getUniformLocation(_vfProgram, 'u_arrowScale'),
            uThickness: gl.getUniformLocation(_vfProgram, 'u_thickness'),
            uHeadSize: gl.getUniformLocation(_vfProgram, 'u_headSize'),
            uVectorMode: gl.getUniformLocation(_vfProgram, 'u_vectorMode'),
            uFunctionId: gl.getUniformLocation(_vfProgram, 'u_functionId'),
            uMobiusA: gl.getUniformLocation(_vfProgram, 'u_mobiusA'),
            uMobiusB: gl.getUniformLocation(_vfProgram, 'u_mobiusB'),
            uMobiusC: gl.getUniformLocation(_vfProgram, 'u_mobiusC'),
            uMobiusD: gl.getUniformLocation(_vfProgram, 'u_mobiusD'),
            uPolyDegree: gl.getUniformLocation(_vfProgram, 'u_polyDegree'),
            uPolyCoeffs: [],
            uZetaCont: gl.getUniformLocation(_vfProgram, 'u_zetaContinuationEnabled'),
            uZetaRefl: gl.getUniformLocation(_vfProgram, 'u_zetaReflectionBoundary'),
            uBrightness: gl.getUniformLocation(_vfProgram, 'u_brightness'),
        };
        for (let i = 0; i <= 10; i++) _vfLocs.uPolyCoeffs.push(gl.getUniformLocation(_vfProgram, `u_polyCoeffs[${i}]`));
    }

    const width = ctx.canvas.width, height = ctx.canvas.height;
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width; renderer.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(_vfProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
    gl.enableVertexAttribArray(_vfLocs.aPos);
    gl.vertexAttribPointer(_vfLocs.aPos, 2, gl.FLOAT, false, 0, 0);

    const xR = planeParams.currentVisXRange || planeParams.xRange;
    const yR = planeParams.currentVisYRange || planeParams.yRange;
    gl.uniform4f(_vfLocs.uViewBounds, xR[0], xR[1], yR[0], yR[1]);

    const density = Math.max(5, Math.min(25, Math.floor(state.gridDensity * 0.75)));
    gl.uniform1f(_vfLocs.uDensity, density);
    gl.uniform1f(_vfLocs.uArrowScale, state.vectorFieldScale || 1);
    gl.uniform1f(_vfLocs.uThickness, state.vectorArrowThickness || 1.5);
    gl.uniform1f(_vfLocs.uHeadSize, state.vectorArrowHeadSize || 8);
    gl.uniform1f(_vfLocs.uBrightness, state.domainBrightness || 1);

    const modeMap = { 'f(z)': 0, '1/f(z)': 1, "f'(z)": 2 };
    gl.uniform1f(_vfLocs.uVectorMode, modeMap[state.vectorFieldFunction] || 0);

    const funcId = (typeof getWebGLDomainColorFunctionIdShared === 'function') ? getWebGLDomainColorFunctionIdShared(state.currentFunction) : 0;
    gl.uniform1f(_vfLocs.uFunctionId, funcId);

    const a = state.mobiusA || {re:1,im:0}, b = state.mobiusB || {re:0,im:0};
    const c = state.mobiusC || {re:0,im:0}, d = state.mobiusD || {re:1,im:0};
    gl.uniform2f(_vfLocs.uMobiusA, a.re||0, a.im||0);
    gl.uniform2f(_vfLocs.uMobiusB, b.re||0, b.im||0);
    gl.uniform2f(_vfLocs.uMobiusC, c.re||0, c.im||0);
    gl.uniform2f(_vfLocs.uMobiusD, d.re||0, d.im||0);

    const deg = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
    gl.uniform1i(_vfLocs.uPolyDegree, deg);
    for (let i = 0; i <= 10; i++) {
        const co = (state.polynomialCoeffs && state.polynomialCoeffs[i]) || null;
        gl.uniform2f(_vfLocs.uPolyCoeffs[i], co ? (co.re||0) : 0, co ? (co.im||0) : 0);
    }
    gl.uniform1f(_vfLocs.uZetaCont, state.zetaContinuationEnabled ? 1 : 0);
    gl.uniform1f(_vfLocs.uZetaRefl, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(renderer.canvas, 0, 0);
    ctx.restore();
    return true;
}
