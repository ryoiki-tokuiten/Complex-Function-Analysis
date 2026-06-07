import { state } from '../store/state.js';
import {
    createWebGLProgramShared,
    getWebGLDomainColorFunctionIdShared,
    GLSL_COMPLEX_INVERSE_LIBRARY,
    setComplexFunctionUniformsShared,
    getGLSLComplexMathLibrary
} from './webgl-shared.js';
import {
    getRasterSourceForShape,
    getRasterVersionTokenForShape,
    getRasterAspectRatioForShape,
    getRasterDisplayDimensions,
    getRasterOpacityForShape,
    isRasterInputShape,
    getRasterResolutionForShape
} from '../utils/raster-media.js';
import { getChainedTransformFunction } from '../math-utils.js';
import { ZETA_REFLECTION_POINT_RE } from '../constants/numerical.js';

const MAX_POLY_DEGREE = 10;
const QUAD_VERTEX_COUNT = 4;
const DEFAULT_ALPHA_CUTOFF = 0.05;
const DEFAULT_INVALID_CLIP = 10.0;
const DEFAULT_RASTER_RESOLUTION = 300;
const UINT16_VERTEX_LIMIT = 65535;

const CHAIN_MODE = Object.freeze({
    recursion: 1,
    power: 2,
    sqrt: 3,
    ln: 4,
    exp: 5,
    reciprocal: 6
});

const VECTOR_MODE = Object.freeze({
    'f(z)': 0,
    '1/f(z)': 1,
    "f'(z)": 2
});

const webglImageSupport = {
    available: false,
    reason: 'not-initialized',
    renderer: null,
    lastAlgHash: '',
    lastVFAlgHash: ''
};

let _vfProgram = null;
let _vfLocs = null;
let _vfShaderHash = '';
let _vfGl = null;

const glsl = (...lines) => lines.join('\n');

function hasUniform(location) {
    return location !== null && location !== undefined;
}

function setUniform1fIfPresent(gl, location, value) {
    if (hasUniform(location)) gl.uniform1f(location, value);
}

function finiteOr(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function complexPart(value, key) {
    return finiteOr(value && value[key], 0);
}

function clonePlain(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;

    if (seen.has(value)) return seen.get(value);
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(value);
        } catch (_) {
            // Fall through for host objects or functions embedded in state.
        }
    }

    if (Array.isArray(value)) {
        const copy = [];
        seen.set(value, copy);
        for (const item of value) copy.push(clonePlain(item, seen));
        return copy;
    }

    const copy = {};
    seen.set(value, copy);
    for (const [key, item] of Object.entries(value)) {
        if (typeof item !== 'function') copy[key] = clonePlain(item, seen);
    }
    return copy;
}

function cloneComplex(value, fallback) {
    const source = value || fallback;
    return {
        re: finiteOr(source && source.re, fallback.re),
        im: finiteOr(source && source.im, fallback.im)
    };
}

function clonePolynomialCoeffs(coeffs) {
    const source = Array.isArray(coeffs) ? coeffs : [];
    return Array.from({ length: MAX_POLY_DEGREE + 1 }, (_, i) => cloneComplex(source[i], { re: 0, im: 0 }));
}

/*
 * The public API remains drop-in compatible. Internally, each render starts from
 * a detached state snapshot so the GPU pipeline never observes mid-frame object
 * mutations from UI controls.
 */
function readRenderState() {
    return {
        currentInputShape: state.currentInputShape,
        currentFunction: state.currentFunction,

        a0: finiteOr(state.a0, 0),
        b0: finiteOr(state.b0, 0),

        mobiusA: cloneComplex(state.mobiusA, { re: 1, im: 0 }),
        mobiusB: cloneComplex(state.mobiusB, { re: 0, im: 0 }),
        mobiusC: cloneComplex(state.mobiusC, { re: 0, im: 0 }),
        mobiusD: cloneComplex(state.mobiusD, { re: 1, im: 0 }),

        polynomialN: finiteOr(state.polynomialN, 0),
        polynomialCoeffs: clonePolynomialCoeffs(state.polynomialCoeffs),
        fractionalPowerN: state.fractionalPowerN !== undefined ? finiteOr(state.fractionalPowerN, 0.5) : 0.5,

        algebraicChainingTerms: clonePlain(state.algebraicChainingTerms || []),
        chainingEnabled: Boolean(state.chainingEnabled),
        chainCount: finiteOr(state.chainCount, 0),
        chainingMode: state.chainingMode,
        navigationModeEnabled: Boolean(state.navigationModeEnabled),

        zetaContinuationEnabled: Boolean(state.zetaContinuationEnabled),

        gridDensity: finiteOr(state.gridDensity, 10),
        vectorFieldScale: finiteOr(state.vectorFieldScale, 1),
        vectorArrowThickness: finiteOr(state.vectorArrowThickness, 1.5),
        vectorArrowHeadSize: finiteOr(state.vectorArrowHeadSize, 8),
        vectorFieldFunction: state.vectorFieldFunction,
        domainBrightness: finiteOr(state.domainBrightness, 1)
    };
}

function getAlgebraicHash(snapshot) {
    return JSON.stringify(snapshot.algebraicChainingTerms || []);
}

function markSupportUnavailable(reason) {
    webglImageSupport.available = false;
    webglImageSupport.reason = reason;
}

function clearVectorProgramState() {
    _vfProgram = null;
    _vfLocs = null;
    _vfShaderHash = '';
    _vfGl = null;
}

function invalidateImageRendererForDynamicAlgebra(snapshot) {
    if (snapshot.currentFunction !== 'algebraic_chaining') return;

    const hash = getAlgebraicHash(snapshot);
    if (webglImageSupport.lastAlgHash === hash) return;

    webglImageSupport.lastAlgHash = hash;
    disposeWebGLRenderer(webglImageSupport.renderer);
    webglImageSupport.renderer = null;
    markSupportUnavailable('algebraic_shader_invalidated');
}

function invalidateVectorProgramForDynamicAlgebra(snapshot) {
    if (snapshot.currentFunction !== 'algebraic_chaining') return;

    const hash = getAlgebraicHash(snapshot);
    if (webglImageSupport.lastVFAlgHash === hash) return;

    webglImageSupport.lastVFAlgHash = hash;
    clearVectorProgramState();
}

function createRenderCanvas() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    });

    return gl ? { canvas, gl } : null;
}

function createVertexArrayRegistry(gl) {
    const ext = gl.getExtension('OES_vertex_array_object');

    return {
        supported: Boolean(ext),
        create() {
            return ext ? ext.createVertexArrayOES() : null;
        },
        bind(vao) {
            if (ext) ext.bindVertexArrayOES(vao || null);
        },
        delete(vao) {
            if (ext && vao) ext.deleteVertexArrayOES(vao);
        }
    };
}

function deleteRendererVao(renderer, key) {
    if (!renderer || !renderer.vao || !renderer[key]) return;

    renderer.vao.delete(renderer[key]);
    renderer[key] = null;
}

function resetForwardVaos(renderer) {
    deleteRendererVao(renderer, 'forwardGpuVao');
    deleteRendererVao(renderer, 'forwardCpuVao');
}

function bindOrCreateVao(renderer, key, configure) {
    if (!renderer.vao.supported) return false;

    if (!renderer[key]) {
        const vao = renderer.vao.create();
        if (!vao) return false;

        renderer.vao.bind(vao);
        const configured = configure();
        renderer.vao.bind(null);

        if (!configured) {
            renderer.vao.delete(vao);
            return false;
        }

        renderer[key] = vao;
    }

    renderer.vao.bind(renderer[key]);
    return true;
}

function unbindVao(renderer) {
    if (renderer && renderer.vao && renderer.vao.supported) renderer.vao.bind(null);
}

function createTexture(gl) {
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
    );
    setTextureSampling(gl);
    return texture;
}

function setTextureSampling(gl) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function createStaticBuffer(gl, target, data) {
    const buffer = gl.createBuffer();
    if (!buffer) return null;

    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}

function createDynamicBuffer(gl) {
    return gl.createBuffer();
}

function createQuadBuffer(gl) {
    return createStaticBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
}

function attachContextLifecycle(renderer) {
    const canvas = renderer.canvas;

    renderer.onContextLost = event => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();

        markSupportUnavailable('context_lost');
        renderer.contextLost = true;
        clearVectorProgramState();
    };

    renderer.onContextRestored = () => {
        renderer.contextLost = false;

        if (webglImageSupport.renderer === renderer) {
            disposeWebGLRenderer(renderer);
            webglImageSupport.renderer = null;
            markSupportUnavailable('context_restored_reinitialization_required');
            initWebGLImageSupportIfNeeded();
        }
    };

    canvas.addEventListener('webglcontextlost', renderer.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', renderer.onContextRestored, false);
}

function isContextUsable(renderer) {
    if (!renderer || !renderer.gl || renderer.disposed || renderer.contextLost) return false;
    if (typeof renderer.gl.isContextLost === 'function' && renderer.gl.isContextLost()) {
        renderer.contextLost = true;
        markSupportUnavailable('context_lost');
        return false;
    }
    return true;
}

function resizeRendererCanvas(renderer, width, height) {
    if (!isContextUsable(renderer) || width <= 0 || height <= 0) return false;

    if (renderer.canvas.width !== width) renderer.canvas.width = width;
    if (renderer.canvas.height !== height) renderer.canvas.height = height;

    renderer.gl.viewport(0, 0, width, height);
    return true;
}

function getTargetSize(targetCtx, planeParams) {
    return {
        width: (targetCtx && targetCtx.canvas && targetCtx.canvas.width) || (planeParams && planeParams.width) || 0,
        height: (targetCtx && targetCtx.canvas && targetCtx.canvas.height) || (planeParams && planeParams.height) || 0
    };
}

function clearTransparent(gl) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function enablePremultipliedAlphaBlend(gl) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}

function enableStraightAlphaBlend(gl) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function bindTextureUnit0(gl, texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

function compositeRendererCanvas(targetCtx, renderer) {
    targetCtx.save();
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.drawImage(renderer.canvas, 0, 0);
    targetCtx.restore();
}

function hasDrawableTargetContext(ctx) {
    return Boolean(ctx && ctx.canvas && typeof ctx.drawImage === 'function');
}

function isVideoAwaitingFrame(shape, source) {
    return shape === 'video' && source && source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;
}

function getVisibleRanges(planeParams) {
    return {
        xRange: planeParams.currentVisXRange || planeParams.xRange,
        yRange: planeParams.currentVisYRange || planeParams.yRange
    };
}

function getViewBounds(planeParams) {
    const { xRange, yRange } = getVisibleRanges(planeParams);

    return {
        x0: xRange[0],
        x1: xRange[1],
        y0: yRange[0],
        y1: yRange[1],
        xSpan: xRange[1] - xRange[0],
        ySpan: yRange[1] - yRange[0]
    };
}

function hasUsableBounds(bounds) {
    return Number.isFinite(bounds.xSpan)
        && Number.isFinite(bounds.ySpan)
        && Math.abs(bounds.xSpan) > 0
        && Math.abs(bounds.ySpan) > 0;
}

function clampPolynomialDegree(value) {
    return Math.max(0, Math.min(MAX_POLY_DEGREE, Number.isFinite(value) ? value : 0));
}

function bindMobiusUniforms(gl, locs, snapshot) {
    gl.uniform2f(locs.uMobiusA, complexPart(snapshot.mobiusA, 're'), complexPart(snapshot.mobiusA, 'im'));
    gl.uniform2f(locs.uMobiusB, complexPart(snapshot.mobiusB, 're'), complexPart(snapshot.mobiusB, 'im'));
    gl.uniform2f(locs.uMobiusC, complexPart(snapshot.mobiusC, 're'), complexPart(snapshot.mobiusC, 'im'));
    gl.uniform2f(locs.uMobiusD, complexPart(snapshot.mobiusD, 're'), complexPart(snapshot.mobiusD, 'im'));
}

function bindPolynomialUniforms(gl, locs, snapshot) {
    gl.uniform1i(locs.uPolyDegree, clampPolynomialDegree(snapshot.polynomialN));

    for (let i = 0; i <= MAX_POLY_DEGREE; i++) {
        const coeff = snapshot.polynomialCoeffs[i];
        gl.uniform2f(locs.uPolyCoeffs[i], complexPart(coeff, 're'), complexPart(coeff, 'im'));
    }
}

function bindFractionalPowerUniform(gl, locs, snapshot) {
    setUniform1fIfPresent(gl, locs.uFracPower, snapshot.fractionalPowerN);
}

function bindImageGeometryUniforms(gl, locs, planeParams, currentShape, isWP, snapshot) {
    const media = getRasterDisplayDimensions(currentShape);
    const bounds = getViewBounds(planeParams);

    gl.uniform2f(locs.uImageSize, media.width, media.height);
    gl.uniform2f(locs.uCenter, snapshot.a0, snapshot.b0);
    gl.uniform4f(locs.uViewBounds, bounds.x0, bounds.x1, bounds.y0, bounds.y1);
    gl.uniform1f(locs.uIsWPlane, isWP ? 1 : 0);
    gl.uniform1f(locs.uOpacity, getRasterOpacityForShape(currentShape));
    setUniform1fIfPresent(gl, locs.uAlphaCutoff, DEFAULT_ALPHA_CUTOFF);
}

function bindComplexImageUniforms(gl, locs, snapshot) {
    gl.uniform1f(locs.uFunctionId, getWebGLDomainColorFunctionIdShared(snapshot.currentFunction));
    bindMobiusUniforms(gl, locs, snapshot);
    bindPolynomialUniforms(gl, locs, snapshot);
    bindFractionalPowerUniform(gl, locs, snapshot);
}

function getCommonImageLocs(gl, program) {
    const locs = {
        uImageSize: gl.getUniformLocation(program, 'u_imageSize'),
        uCenter: gl.getUniformLocation(program, 'u_center'),
        uViewBounds: gl.getUniformLocation(program, 'u_viewBounds'),
        uIsWPlane: gl.getUniformLocation(program, 'u_isWPlane'),
        uFunctionId: gl.getUniformLocation(program, 'u_functionId'),
        uOpacity: gl.getUniformLocation(program, 'u_opacity'),
        uAlphaCutoff: gl.getUniformLocation(program, 'u_alphaCutoff'),
        uMobiusA: gl.getUniformLocation(program, 'u_mobiusA'),
        uMobiusB: gl.getUniformLocation(program, 'u_mobiusB'),
        uMobiusC: gl.getUniformLocation(program, 'u_mobiusC'),
        uMobiusD: gl.getUniformLocation(program, 'u_mobiusD'),
        uPolyDegree: gl.getUniformLocation(program, 'u_polyDegree'),
        uPolyCoeffs: [],
        uTexture: gl.getUniformLocation(program, 'u_texture')
    };

    for (let i = 0; i <= MAX_POLY_DEGREE; i++) {
        locs.uPolyCoeffs.push(gl.getUniformLocation(program, `u_polyCoeffs[${i}]`));
    }

    return locs;
}

function getInverseLocs(gl, program) {
    if (!program) return null;

    return Object.assign(getCommonImageLocs(gl, program), {
        aPosition: gl.getAttribLocation(program, 'a_position'),
        uResolution: gl.getUniformLocation(program, 'u_resolution'),
        uChainIndex: gl.getUniformLocation(program, 'u_chainIndex'),
        uChainMode: gl.getUniformLocation(program, 'u_chainMode'),
        uFracPower: gl.getUniformLocation(program, 'u_fracPower')
    });
}

function getForwardLocs(gl, program) {
    if (!program) return null;

    return Object.assign(getCommonImageLocs(gl, program), {
        aTexCoord: gl.getAttribLocation(program, 'a_texCoord'),
        aMappedPos: gl.getAttribLocation(program, 'a_mappedPos'),
        uUseCpuEval: gl.getUniformLocation(program, 'u_useCpuEval'),
        uInvalidClip: gl.getUniformLocation(program, 'u_invalidClip'),
        uZetaContinuationEnabled: gl.getUniformLocation(program, 'u_zetaContinuationEnabled'),
        uZetaReflectionBoundary: gl.getUniformLocation(program, 'u_zetaReflectionBoundary'),
        uFracPower: gl.getUniformLocation(program, 'u_fracPower')
    });
}

function createInverseVertexShader() {
    return glsl(
        'attribute vec2 a_position;',
        'varying vec2 v_uv;',
        'void main() {',
        '  v_uv = (a_position + 1.0) * 0.5;',
        '  gl_Position = vec4(a_position, 0.0, 1.0);',
        '}'
    );
}

function createInverseFragmentShader(snapshot) {
    return glsl(
        'precision mediump float;',
        'varying vec2 v_uv;',
        'uniform sampler2D u_texture;',
        'uniform vec2 u_resolution;',
        'uniform vec4 u_viewBounds;',
        'uniform vec2 u_imageSize;',
        'uniform vec2 u_center;',
        'uniform float u_opacity;',
        'uniform float u_alphaCutoff;',
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
        getGLSLComplexMathLibrary(snapshot),
        GLSL_COMPLEX_INVERSE_LIBRARY,
        '',
        'vec2 complexPowReal(vec2 b, float e) {',
        '  vec2 l = complexLn(b);',
        '  return complexExp(vec2(l.x * e, l.y * e));',
        '}',
        '',
        'bool applyInverseChain(inout vec2 z) {',
        '  if (u_chainMode == 1) {',
        '    for (int i = 0; i < 16; i++) {',
        '      if (i > u_chainIndex) break;',
        '      vec2 p = z;',
        '      if (!evaluateInverseFunction(p, u_functionId, u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs, u_fracPower, z)) return false;',
        '    }',
        '    return true;',
        '  }',
        '',
        '  for (int i = 0; i < 16; i++) {',
        '    if (i >= u_chainIndex) break;',
        '    if (u_chainMode == 2) { z = complexPowReal(z, 1.0 / float(u_chainIndex + 1)); break; }',
        '    if (u_chainMode == 3) { z = complexPowReal(z, pow(2.0, float(u_chainIndex))); break; }',
        '    if (u_chainMode == 4) z = complexExp(z);',
        '    if (u_chainMode == 5) { if (dot(z, z) < 1e-20) return false; z = complexLn(z); }',
        '    if (u_chainMode == 6) { if (dot(z, z) < 1e-18) return false; z = complexDiv(vec2(1.0, 0.0), z); }',
        '  }',
        '',
        '  vec2 p = z;',
        '  return evaluateInverseFunction(p, u_functionId, u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs, u_fracPower, z);',
        '}',
        '',
        'void main() {',
        '  vec2 w = vec2(',
        '    mix(u_viewBounds.x, u_viewBounds.y, v_uv.x),',
        '    mix(u_viewBounds.w, u_viewBounds.z, 1.0 - v_uv.y)',
        '  );',
        '',
        '  vec2 z = w;',
        '  if (u_isWPlane > 0.5 && !applyInverseChain(z)) discard;',
        '',
        '  vec2 imgUV = vec2(',
        '    0.5 + (z.x - u_center.x) / u_imageSize.x,',
        '    0.5 - (z.y - u_center.y) / u_imageSize.y',
        '  );',
        '',
        '  if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) discard;',
        '',
        '  vec4 color = texture2D(u_texture, imgUV);',
        '  if (color.a < u_alphaCutoff) discard;',
        '  gl_FragColor = vec4(color.rgb * color.a, color.a) * u_opacity;',
        '}'
    );
}

function createForwardVertexShader(snapshot) {
    return glsl(
        'attribute vec2 a_texCoord;',
        'attribute vec2 a_mappedPos;',
        'varying vec2 v_uv;',
        'varying float v_valid;',
        '',
        'uniform vec2 u_imageSize;',
        'uniform vec2 u_center;',
        'uniform vec4 u_viewBounds;',
        'uniform float u_useCpuEval;',
        'uniform float u_invalidClip;',
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
        getGLSLComplexMathLibrary(snapshot),
        '',
        'void main() {',
        '  v_uv = a_texCoord;',
        '',
        '  if (u_useCpuEval > 0.5) {',
        '    v_valid = 1.0;',
        '    gl_Position = vec4(a_mappedPos, 0.0, 1.0);',
        '    return;',
        '  }',
        '',
        '  float nx = a_texCoord.x * 2.0 - 1.0;',
        '  float ny = -(a_texCoord.y * 2.0 - 1.0);',
        '  vec2 zInput = vec2(',
        '    u_center.x + nx * (u_imageSize.x / 2.0),',
        '    u_center.y + ny * (u_imageSize.y / 2.0)',
        '  );',
        '',
        '  vec2 mappedValue = vec2(0.0);',
        '  float isWP = (u_isWPlane > 0.5) ? 0.0 : 1.0;',
        '  bool ok = evaluateMappedValueBase(',
        '    zInput,',
        '    isWP,',
        '    u_functionId,',
        '    u_mobiusA,',
        '    u_mobiusB,',
        '    u_mobiusC,',
        '    u_mobiusD,',
        '    u_polyDegree,',
        '    u_polyCoeffs,',
        '    u_zetaContinuationEnabled,',
        '    u_zetaReflectionBoundary,',
        '    u_fracPower,',
        '    mappedValue',
        '  );',
        '',
        '  if (!ok || !isFiniteVec2Compat(mappedValue)) {',
        '    v_valid = 0.0;',
        '    gl_Position = vec4(u_invalidClip, u_invalidClip, u_invalidClip, 1.0);',
        '    return;',
        '  }',
        '',
        '  v_valid = 1.0;',
        '  float clipX = (mappedValue.x - u_viewBounds.x) / (u_viewBounds.y - u_viewBounds.x) * 2.0 - 1.0;',
        '  float clipY = (mappedValue.y - u_viewBounds.z) / (u_viewBounds.w - u_viewBounds.z) * 2.0 - 1.0;',
        '  gl_Position = vec4(clipX, clipY, 0.0, 1.0);',
        '}'
    );
}

function createForwardFragmentShader() {
    return glsl(
        'precision mediump float;',
        'varying vec2 v_uv;',
        'varying float v_valid;',
        'uniform sampler2D u_texture;',
        'uniform float u_opacity;',
        'uniform float u_alphaCutoff;',
        'void main() {',
        '  if (v_valid < 0.99) discard;',
        '  vec4 color = texture2D(u_texture, v_uv);',
        '  if (color.a < u_alphaCutoff) discard;',
        '  gl_FragColor = vec4(color.rgb * color.a, color.a) * u_opacity;',
        '}'
    );
}

function createImagePrograms(gl, snapshot) {
    return {
        inverseProgram: createWebGLProgramShared(gl, createInverseVertexShader(), createInverseFragmentShader(snapshot)),
        forwardProgram: createWebGLProgramShared(gl, createForwardVertexShader(snapshot), createForwardFragmentShader())
    };
}

function createRendererResources(gl) {
    const texture = createTexture(gl);
    const quadBuffer = createQuadBuffer(gl);
    const forwardVertexBuffer = createDynamicBuffer(gl);
    const forwardIndexBuffer = createDynamicBuffer(gl);
    const forwardMappedBuffer = createDynamicBuffer(gl);

    if (!texture || !quadBuffer || !forwardVertexBuffer || !forwardIndexBuffer || !forwardMappedBuffer) return null;

    return { texture, quadBuffer, forwardVertexBuffer, forwardIndexBuffer, forwardMappedBuffer };
}

function getMeshDimensions(currentRes, currentShape) {
    const aspect = getRasterAspectRatioForShape(currentShape) || 1.0;
    const resX = Math.max(2, aspect >= 1 ? currentRes : Math.round(currentRes * aspect));
    const resY = Math.max(2, aspect >= 1 ? Math.round(currentRes / aspect) : currentRes);

    return { aspect, resX, resY, vertexCount: resX * resY };
}

function getSafeMeshDimensions(gl, currentRes, currentShape) {
    const requested = getMeshDimensions(currentRes, currentShape);

    if (requested.vertexCount <= UINT16_VERTEX_LIMIT) return Object.assign(requested, { useUint32: false });
    if (gl.getExtension('OES_element_index_uint')) return Object.assign(requested, { useUint32: true });

    const scale = Math.sqrt(UINT16_VERTEX_LIMIT / requested.vertexCount);
    return Object.assign(getMeshDimensions(Math.max(2, Math.floor(currentRes * scale)), currentShape), {
        useUint32: false
    });
}

function getMeshKey(currentRes, currentShape) {
    const aspect = getRasterAspectRatioForShape(currentShape) || 1.0;
    return `${currentShape}:${currentRes}:${aspect.toPrecision(8)}`;
}

function buildMeshVertices(resX, resY) {
    const vertices = new Float32Array(resX * resY * 2);
    let offset = 0;

    for (let y = 0; y < resY; y++) {
        const ty = y / (resY - 1);

        for (let x = 0; x < resX; x++) {
            vertices[offset++] = x / (resX - 1);
            vertices[offset++] = ty;
        }
    }

    return vertices;
}

function buildMeshIndices(resX, resY, useUint32) {
    const cellCount = (resX - 1) * (resY - 1);
    const IndexArray = useUint32 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(cellCount * 6);
    let offset = 0;

    for (let y = 0; y < resY - 1; y++) {
        const row = y * resX;
        const nextRow = row + resX;

        for (let x = 0; x < resX - 1; x++) {
            const tl = row + x;
            const tr = tl + 1;
            const bl = nextRow + x;
            const br = bl + 1;

            indices[offset++] = tl;
            indices[offset++] = bl;
            indices[offset++] = tr;
            indices[offset++] = tr;
            indices[offset++] = bl;
            indices[offset++] = br;
        }
    }

    return indices;
}

function uploadForwardMesh(renderer, dimensions) {
    const gl = renderer.gl;

    resetForwardVaos(renderer);

    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.forwardVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buildMeshVertices(dimensions.resX, dimensions.resY), gl.STATIC_DRAW);

    const indices = buildMeshIndices(dimensions.resX, dimensions.resY, dimensions.useUint32);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.forwardIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    renderer.forwardIndexCount = indices.length;
    renderer.forwardIndexType = dimensions.useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    renderer.forwardMeshDimensions = dimensions;
}

function shouldUseCpuForwardEvaluation(isWP, snapshot) {
    return Boolean(isWP && snapshot.chainingEnabled && snapshot.chainCount > 1);
}

function getForwardTransform(isWP) {
    return isWP ? getChainedTransformFunction() : (re, im) => ({ re, im });
}

function clipMappedPoint(value, bounds) {
    if (!value || !Number.isFinite(value.re) || !Number.isFinite(value.im)) {
        return [DEFAULT_INVALID_CLIP, DEFAULT_INVALID_CLIP];
    }

    return [
        ((value.re - bounds.x0) / bounds.xSpan) * 2.0 - 1.0,
        ((value.im - bounds.y0) / bounds.ySpan) * 2.0 - 1.0
    ];
}

function buildCpuMappedPositions(renderer, planeParams, currentShape, isWP, snapshot) {
    const dimensions = renderer.forwardMeshDimensions;
    if (!dimensions) return null;

    const bounds = getViewBounds(planeParams);
    if (!hasUsableBounds(bounds)) return null;

    const media = getRasterDisplayDimensions(currentShape);
    const transform = getForwardTransform(isWP);
    const mapped = new Float32Array(dimensions.resX * dimensions.resY * 2);
    let offset = 0;

    for (let y = 0; y < dimensions.resY; y++) {
        const ty = y / (dimensions.resY - 1);
        const im = snapshot.b0 - (ty * 2.0 - 1.0) * (media.height / 2.0);

        for (let x = 0; x < dimensions.resX; x++) {
            const tx = x / (dimensions.resX - 1);
            const re = snapshot.a0 + (tx * 2.0 - 1.0) * (media.width / 2.0);
            const [clipX, clipY] = clipMappedPoint(transform(re, im), bounds);

            mapped[offset++] = clipX;
            mapped[offset++] = clipY;
        }
    }

    return mapped;
}

function configureAttribute(gl, location, size, buffer) {
    if (location < 0 || !buffer) return false;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    return true;
}

function disableAttribute(gl, location) {
    if (location >= 0) gl.disableVertexAttribArray(location);
}

function bindInverseGeometry(renderer, locs) {
    const gl = renderer.gl;

    const vaoBound = bindOrCreateVao(renderer, 'inverseVao', () => {
        return configureAttribute(gl, locs.aPosition, 2, renderer.quadBuffer);
    });

    return vaoBound || configureAttribute(gl, locs.aPosition, 2, renderer.quadBuffer);
}

function uploadCpuMappedPositions(renderer, planeParams, currentShape, isWP, snapshot) {
    const mappedPositions = buildCpuMappedPositions(renderer, planeParams, currentShape, isWP, snapshot);
    if (!mappedPositions) return false;

    const gl = renderer.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.forwardMappedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mappedPositions, gl.DYNAMIC_DRAW);
    return true;
}

function bindForwardGeometry(renderer, locs, useCpuEval) {
    const gl = renderer.gl;
    const vaoKey = useCpuEval ? 'forwardCpuVao' : 'forwardGpuVao';

    const vaoBound = bindOrCreateVao(renderer, vaoKey, () => {
        if (!configureAttribute(gl, locs.aTexCoord, 2, renderer.forwardVertexBuffer)) return false;

        if (useCpuEval) {
            if (!configureAttribute(gl, locs.aMappedPos, 2, renderer.forwardMappedBuffer)) return false;
        } else {
            disableAttribute(gl, locs.aMappedPos);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.forwardIndexBuffer);
        return true;
    });

    if (vaoBound) return true;
    if (!configureAttribute(gl, locs.aTexCoord, 2, renderer.forwardVertexBuffer)) return false;

    if (useCpuEval) {
        if (!configureAttribute(gl, locs.aMappedPos, 2, renderer.forwardMappedBuffer)) return false;
    } else {
        disableAttribute(gl, locs.aMappedPos);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.forwardIndexBuffer);
    return true;
}

function prepareForwardGeometry(renderer, locs, planeParams, currentShape, isWP, snapshot, useCpuEval) {
    const gl = renderer.gl;

    setUniform1fIfPresent(gl, locs.uUseCpuEval, useCpuEval ? 1.0 : 0.0);
    setUniform1fIfPresent(gl, locs.uInvalidClip, DEFAULT_INVALID_CLIP);

    if (useCpuEval && !uploadCpuMappedPositions(renderer, planeParams, currentShape, isWP, snapshot)) return false;

    return bindForwardGeometry(renderer, locs, useCpuEval);
}

function bindForwardSpecialUniforms(gl, locs, snapshot) {
    setUniform1fIfPresent(gl, locs.uZetaContinuationEnabled, snapshot.zetaContinuationEnabled ? 1 : 0);
    setUniform1fIfPresent(
        gl,
        locs.uZetaReflectionBoundary,
        typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5
    );
}

function getInverseChainMode(chainIndex, snapshot) {
    return chainIndex > 0 && snapshot.chainingEnabled
        ? CHAIN_MODE[snapshot.chainingMode] || CHAIN_MODE.recursion
        : 0;
}

function setImageUniformsForSnapshot(gl, locs, planeParams, isWP, currentShape, snapshot) {
    if (!gl || !locs || !planeParams) return;

    bindImageGeometryUniforms(gl, locs, planeParams, currentShape, isWP, snapshot);
    if (isWP) bindComplexImageUniforms(gl, locs, snapshot);
}

function drawInverseImagePath(renderer, planeParams, isWP, currentShape, chainIndex, width, height, snapshot) {
    if (!renderer.inverseProgram || !renderer.inverseLocs) return false;

    const gl = renderer.gl;
    const locs = renderer.inverseLocs;

    gl.useProgram(renderer.inverseProgram);
    if (!bindInverseGeometry(renderer, locs)) return false;

    gl.uniform2f(locs.uResolution, width, height);
    setImageUniformsForSnapshot(gl, locs, planeParams, isWP, currentShape, snapshot);

    if (hasUniform(locs.uTexture)) gl.uniform1i(locs.uTexture, 0);

    gl.uniform1i(locs.uChainIndex, chainIndex);
    gl.uniform1i(locs.uChainMode, getInverseChainMode(chainIndex, snapshot));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD_VERTEX_COUNT);
    unbindVao(renderer);
    return true;
}

function drawForwardImagePath(renderer, planeParams, isWP, currentShape, snapshot) {
    if (!renderer.forwardProgram || !renderer.forwardLocs) return false;

    const currentRes = getRasterResolutionForShape(currentShape) || DEFAULT_RASTER_RESOLUTION;
    ensureForwardMesh(renderer, currentRes);
    if (!renderer.forwardIndexCount) return false;

    const gl = renderer.gl;
    const locs = renderer.forwardLocs;
    const useCpuEval = shouldUseCpuForwardEvaluation(isWP, snapshot);

    gl.useProgram(renderer.forwardProgram);
    if (!prepareForwardGeometry(renderer, locs, planeParams, currentShape, isWP, snapshot, useCpuEval)) {
        unbindVao(renderer);
        return false;
    }

    setImageUniformsForSnapshot(gl, locs, planeParams, isWP, currentShape, snapshot);

    if (hasUniform(locs.uTexture)) gl.uniform1i(locs.uTexture, 0);

    bindForwardSpecialUniforms(gl, locs, snapshot);
    gl.drawElements(gl.TRIANGLES, renderer.forwardIndexCount, renderer.forwardIndexType, 0);

    unbindVao(renderer);
    return true;
}

function isInverseImageRenderSupportedForSnapshot(snapshot) {
    const funcId = getWebGLDomainColorFunctionIdShared(snapshot.currentFunction);

    if (funcId === 11) return false;
    if (funcId === 9) return (snapshot.polynomialN || 0) <= 2;

    return funcId >= 1 && funcId <= 15;
}

function shouldUseInverseImagePath(isWP, snapshot) {
    return !isWP || (isWP && isInverseImageRenderSupportedForSnapshot(snapshot) && !snapshot.navigationModeEnabled);
}

function getDrawableRasterSource(snapshot) {
    const currentShape = snapshot.currentInputShape;
    const source = getRasterSourceForShape(currentShape);

    if (!isRasterInputShape(currentShape) || !source || isVideoAwaitingFrame(currentShape, source)) return null;

    return { currentShape, source };
}

function createVectorVertexShader() {
    return 'attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
}

function createVectorFragmentShader(snapshot) {
    return glsl(
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
        'uniform float u_fracPower;',
        'uniform float u_brightness;',
        '',
        getGLSLComplexMathLibrary(snapshot),
        '',
        'vec3 hsl2rgb(float h, float s, float l) {',
        '  float c = (1.0 - abs(2.0 * l - 1.0)) * s;',
        '  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));',
        '  float m = l - c * 0.5;',
        '  vec3 r;',
        '  float hh = h * 6.0;',
        '  if (hh < 1.0) r = vec3(c, x, 0);',
        '  else if (hh < 2.0) r = vec3(x, c, 0);',
        '  else if (hh < 3.0) r = vec3(0, c, x);',
        '  else if (hh < 4.0) r = vec3(0, x, c);',
        '  else if (hh < 5.0) r = vec3(x, 0, c);',
        '  else r = vec3(c, 0, x);',
        '  return r + m;',
        '}',
        '',
        'float sdfSeg(vec2 p, vec2 a, vec2 b) {',
        '  vec2 ab = b - a;',
        '  vec2 ap = p - a;',
        '  float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0);',
        '  return length(ap - ab * t);',
        '}',
        '',
        'bool inTri(vec2 p, vec2 a, vec2 b, vec2 c) {',
        '  float d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);',
        '  float d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);',
        '  float d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);',
        '  return (d1 >= 0.0 && d2 >= 0.0 && d3 >= 0.0) || (d1 <= 0.0 && d2 <= 0.0 && d3 <= 0.0);',
        '}',
        '',
        'bool evaluateVector(vec2 cc, out vec2 fz) {',
        '  bool ok = evaluateMappedValueBase(',
        '    cc,',
        '    0.0,',
        '    u_functionId,',
        '    u_mobiusA,',
        '    u_mobiusB,',
        '    u_mobiusC,',
        '    u_mobiusD,',
        '    u_polyDegree,',
        '    u_polyCoeffs,',
        '    u_zetaContinuationEnabled,',
        '    u_zetaReflectionBoundary,',
        '    u_fracPower,',
        '    fz',
        '  );',
        '',
        '  if (!ok) return false;',
        '',
        '  if (u_vectorMode > 0.5 && u_vectorMode < 1.5) {',
        '    float m2 = dot(fz, fz);',
        '    if (m2 < 1e-12) return false;',
        '    fz = vec2(fz.x / m2, -fz.y / m2);',
        '  }',
        '',
        '  if (u_vectorMode > 1.5) {',
        '    float h = 1e-5;',
        '    vec2 fr;',
        '    vec2 fl;',
        '    evaluateMappedValueBase(cc + vec2(h, 0), 0.0, u_functionId, u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs, u_zetaContinuationEnabled, u_zetaReflectionBoundary, u_fracPower, fr);',
        '    evaluateMappedValueBase(cc - vec2(h, 0), 0.0, u_functionId, u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD, u_polyDegree, u_polyCoeffs, u_zetaContinuationEnabled, u_zetaReflectionBoundary, u_fracPower, fl);',
        '    fz = (fr - fl) / (2.0 * h);',
        '  }',
        '',
        '  return true;',
        '}',
        '',
        'void main() {',
        '  vec2 w = vec2(',
        '    mix(u_viewBounds.x, u_viewBounds.y, v_uv.x),',
        '    mix(u_viewBounds.w, u_viewBounds.z, 1.0 - v_uv.y)',
        '  );',
        '',
        '  float cellW = (u_viewBounds.y - u_viewBounds.x) / u_density;',
        '  float cellH = (u_viewBounds.w - u_viewBounds.z) / u_density;',
        '  float cell = min(cellW, cellH);',
        '  vec2 cc = vec2(floor(w.x / cellW + 0.5) * cellW, floor(w.y / cellH + 0.5) * cellH);',
        '',
        '  vec2 fz;',
        '  if (!evaluateVector(cc, fz)) discard;',
        '',
        '  float mag = length(fz);',
        '  if (mag < 1e-9) discard;',
        '',
        '  vec2 dir = fz / mag;',
        '  vec2 perp = vec2(-dir.y, dir.x);',
        '  float aLen = cell * 0.38 * u_arrowScale;',
        '  float aW = cell * u_thickness * 0.015;',
        '  float hSz = cell * u_headSize * 0.04;',
        '  vec2 tip = cc + dir * aLen;',
        '',
        '  float dShaft = sdfSeg(w, cc, tip - dir * hSz * 1.5);',
        '  bool onHead = inTri(w, tip, tip - dir * hSz * 2.5 + perp * hSz, tip - dir * hSz * 2.5 - perp * hSz);',
        '  if (dShaft > aW && !onHead) discard;',
        '',
        '  float phase = atan(fz.y, fz.x) / (2.0 * PI);',
        '  if (phase < 0.0) phase += 1.0;',
        '',
        '  float lm = log(1.0 + mag);',
        '  float lit = clamp(0.35 + lm * 0.08 * u_brightness, 0.2, 0.85);',
        '  vec3 col = hsl2rgb(phase, 0.85, lit);',
        '  float aa = onHead ? 1.0 : 1.0 - smoothstep(aW * 0.6, aW, dShaft);',
        '  gl_FragColor = vec4(col * aa, aa);',
        '}'
    );
}

function getVectorLocs(gl, program) {
    const locs = {
        aPos: gl.getAttribLocation(program, 'a_position'),
        uViewBounds: gl.getUniformLocation(program, 'u_viewBounds'),
        uDensity: gl.getUniformLocation(program, 'u_density'),
        uArrowScale: gl.getUniformLocation(program, 'u_arrowScale'),
        uThickness: gl.getUniformLocation(program, 'u_thickness'),
        uHeadSize: gl.getUniformLocation(program, 'u_headSize'),
        uVectorMode: gl.getUniformLocation(program, 'u_vectorMode'),
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
        uBrightness: gl.getUniformLocation(program, 'u_brightness')
    };

    for (let i = 0; i <= MAX_POLY_DEGREE; i++) {
        locs.uPolyCoeffs.push(gl.getUniformLocation(program, `u_polyCoeffs[${i}]`));
    }

    return locs;
}

function getVectorShaderHash(snapshot) {
    return snapshot.currentFunction === 'algebraic_chaining'
        ? `algebraic:${getAlgebraicHash(snapshot)}`
        : String(snapshot.currentFunction);
}

function ensureVectorProgram(renderer, snapshot) {
    if (!isContextUsable(renderer)) return false;

    const gl = renderer.gl;
    const shaderHash = getVectorShaderHash(snapshot);

    if (_vfProgram && _vfLocs && _vfGl === gl && _vfShaderHash === shaderHash) return true;

    deleteRendererVao(renderer, 'vectorVao');

    const program = createWebGLProgramShared(gl, createVectorVertexShader(), createVectorFragmentShader(snapshot));

    if (!program) {
        clearVectorProgramState();
        return false;
    }

    _vfProgram = program;
    _vfLocs = getVectorLocs(gl, program);
    _vfShaderHash = shaderHash;
    _vfGl = gl;
    return true;
}

function bindVectorGeometry(renderer) {
    const gl = renderer.gl;

    const vaoBound = bindOrCreateVao(renderer, 'vectorVao', () => {
        return configureAttribute(gl, _vfLocs.aPos, 2, renderer.quadBuffer);
    });

    return vaoBound || configureAttribute(gl, _vfLocs.aPos, 2, renderer.quadBuffer);
}

function bindVectorFieldUniforms(gl, locs, planeParams, snapshot) {
    const bounds = getViewBounds(planeParams);
    const density = Math.max(5, Math.min(25, Math.floor(snapshot.gridDensity * 0.75)));

    gl.uniform4f(locs.uViewBounds, bounds.x0, bounds.x1, bounds.y0, bounds.y1);
    gl.uniform1f(locs.uDensity, density);
    gl.uniform1f(locs.uArrowScale, snapshot.vectorFieldScale);
    gl.uniform1f(locs.uThickness, snapshot.vectorArrowThickness);
    gl.uniform1f(locs.uHeadSize, snapshot.vectorArrowHeadSize);
    gl.uniform1f(locs.uBrightness, snapshot.domainBrightness);
    gl.uniform1f(locs.uVectorMode, VECTOR_MODE[snapshot.vectorFieldFunction] || 0);

    setComplexFunctionUniformsShared(gl, locs, snapshot);
}

export function isInverseImageRenderSupported() {
    return isInverseImageRenderSupportedForSnapshot(readRenderState());
}

export function createWebGLImageRenderer() {
    const snapshot = readRenderState();
    const context = createRenderCanvas();

    if (!context) return null;

    const gl = context.gl;
    const programs = createImagePrograms(gl, snapshot);
    const resources = createRendererResources(gl);

    if ((!programs.inverseProgram && !programs.forwardProgram) || !resources) return null;

    const renderer = {
        canvas: context.canvas,
        gl,
        vao: createVertexArrayRegistry(gl),

        texture: resources.texture,
        quadBuffer: resources.quadBuffer,

        inverseProgram: programs.inverseProgram,
        inverseLocs: getInverseLocs(gl, programs.inverseProgram),
        inverseVao: null,

        forwardProgram: programs.forwardProgram,
        forwardLocs: getForwardLocs(gl, programs.forwardProgram),
        forwardVertexBuffer: resources.forwardVertexBuffer,
        forwardIndexBuffer: resources.forwardIndexBuffer,
        forwardMappedBuffer: resources.forwardMappedBuffer,
        forwardGpuVao: null,
        forwardCpuVao: null,

        vectorVao: null,

        uploadedSource: null,
        uploadedSourceToken: -1,

        forwardIndexCount: 0,
        forwardIndexType: gl.UNSIGNED_SHORT,
        forwardResolution: 0,
        forwardMeshKey: '',
        forwardMeshDimensions: null,

        contextLost: false,
        disposed: false,
        onContextLost: null,
        onContextRestored: null
    };

    attachContextLifecycle(renderer);
    return renderer;
}

export function disposeWebGLRenderer(renderer) {
    if (!renderer || renderer.disposed) return;

    const gl = renderer.gl;

    if (renderer.canvas) {
        if (renderer.onContextLost) {
            renderer.canvas.removeEventListener('webglcontextlost', renderer.onContextLost, false);
        }
        if (renderer.onContextRestored) {
            renderer.canvas.removeEventListener('webglcontextrestored', renderer.onContextRestored, false);
        }
    }

    if (gl && !(typeof gl.isContextLost === 'function' && gl.isContextLost())) {
        unbindVao(renderer);

        deleteRendererVao(renderer, 'inverseVao');
        deleteRendererVao(renderer, 'forwardGpuVao');
        deleteRendererVao(renderer, 'forwardCpuVao');
        deleteRendererVao(renderer, 'vectorVao');

        if (renderer.texture) gl.deleteTexture(renderer.texture);
        if (renderer.quadBuffer) gl.deleteBuffer(renderer.quadBuffer);
        if (renderer.forwardVertexBuffer) gl.deleteBuffer(renderer.forwardVertexBuffer);
        if (renderer.forwardIndexBuffer) gl.deleteBuffer(renderer.forwardIndexBuffer);
        if (renderer.forwardMappedBuffer) gl.deleteBuffer(renderer.forwardMappedBuffer);
        if (renderer.inverseProgram) gl.deleteProgram(renderer.inverseProgram);
        if (renderer.forwardProgram) gl.deleteProgram(renderer.forwardProgram);
        if (_vfGl === gl && _vfProgram) gl.deleteProgram(_vfProgram);
    }

    if (_vfGl === gl) clearVectorProgramState();

    renderer.texture = null;
    renderer.quadBuffer = null;
    renderer.forwardVertexBuffer = null;
    renderer.forwardIndexBuffer = null;
    renderer.forwardMappedBuffer = null;
    renderer.inverseProgram = null;
    renderer.forwardProgram = null;
    renderer.inverseLocs = null;
    renderer.forwardLocs = null;
    renderer.uploadedSource = null;
    renderer.uploadedSourceToken = -1;
    renderer.forwardIndexCount = 0;
    renderer.forwardMeshDimensions = null;
    renderer.disposed = true;

    if (webglImageSupport.renderer === renderer) {
        webglImageSupport.renderer = null;
        markSupportUnavailable('disposed');
    }
}

export function initWebGLImageSupportIfNeeded() {
    if (webglImageSupport.renderer && isContextUsable(webglImageSupport.renderer)) return;

    if (webglImageSupport.renderer) {
        disposeWebGLRenderer(webglImageSupport.renderer);
        webglImageSupport.renderer = null;
    }

    const renderer = createWebGLImageRenderer();

    webglImageSupport.renderer = renderer;
    webglImageSupport.available = Boolean(renderer);
    webglImageSupport.reason = renderer ? 'ready' : 'failed_to_initialize';
}

export function updateImageTexture(renderer) {
    if (!isContextUsable(renderer) || !renderer.texture) return false;

    const snapshot = readRenderState();
    const gl = renderer.gl;
    const currentShape = snapshot.currentInputShape;
    const source = getRasterSourceForShape(currentShape);
    const sourceToken = getRasterVersionTokenForShape(currentShape);

    if (!source) {
        renderer.uploadedSource = null;
        renderer.uploadedSourceToken = -1;
        return false;
    }

    if (isVideoAwaitingFrame(currentShape, source)) return false;

    if (renderer.uploadedSource === source && renderer.uploadedSourceToken === sourceToken) return true;

    renderer.uploadedSource = source;
    renderer.uploadedSourceToken = sourceToken;

    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    setTextureSampling(gl);
    return true;
}

export function ensureForwardMesh(renderer, currentRes) {
    if (!isContextUsable(renderer)) return;

    const snapshot = readRenderState();
    const gl = renderer.gl;
    const currentShape = snapshot.currentInputShape;
    const meshKey = getMeshKey(currentRes, currentShape);

    if (renderer.forwardMeshKey === meshKey && renderer.forwardResolution === currentRes) return;

    const dimensions = getSafeMeshDimensions(gl, currentRes, currentShape);

    renderer.forwardResolution = currentRes;
    renderer.forwardMeshKey = meshKey;
    uploadForwardMesh(renderer, dimensions);
}

export function setImageUniforms(gl, locs, planeParams, isWP, currentShape) {
    setImageUniformsForSnapshot(gl, locs, planeParams, isWP, currentShape, readRenderState());
}

export function drawImageWithWebGL(targetCtx, planeParams, isWP, chainIndex) {
    const snapshot = readRenderState();

    invalidateImageRendererForDynamicAlgebra(snapshot);
    initWebGLImageSupportIfNeeded();

    const raster = getDrawableRasterSource(snapshot);
    if (!webglImageSupport.available || !raster || !hasDrawableTargetContext(targetCtx)) return false;

    const renderer = webglImageSupport.renderer;
    if (!isContextUsable(renderer)) return false;

    const gl = renderer.gl;
    const size = getTargetSize(targetCtx, planeParams);

    if (!resizeRendererCanvas(renderer, size.width, size.height)) return false;
    if (!updateImageTexture(renderer)) return false;

    clearTransparent(gl);
    enablePremultipliedAlphaBlend(gl);
    bindTextureUnit0(gl, renderer.texture);

    const rendered = shouldUseInverseImagePath(isWP, snapshot)
        ? drawInverseImagePath(
            renderer,
            planeParams,
            isWP,
            raster.currentShape,
            chainIndex || 0,
            size.width,
            size.height,
            snapshot
        )
        : drawForwardImagePath(renderer, planeParams, isWP, raster.currentShape, snapshot);

    if (!rendered) return false;

    compositeRendererCanvas(targetCtx, renderer);
    return true;
}

export function drawVectorFieldWithWebGL(ctx, planeParams) {
    const snapshot = readRenderState();

    if (snapshot.chainingEnabled && snapshot.chainCount > 1) return false;

    invalidateVectorProgramForDynamicAlgebra(snapshot);

    const funcId = getWebGLDomainColorFunctionIdShared(snapshot.currentFunction);
    if (funcId === 0) return false;

    initWebGLImageSupportIfNeeded();
    if (!webglImageSupport.available || !hasDrawableTargetContext(ctx)) return false;

    const renderer = webglImageSupport.renderer;
    if (!isContextUsable(renderer) || !ensureVectorProgram(renderer, snapshot)) return false;

    const gl = renderer.gl;

    if (!resizeRendererCanvas(renderer, ctx.canvas.width, ctx.canvas.height)) return false;

    clearTransparent(gl);
    enableStraightAlphaBlend(gl);

    gl.useProgram(_vfProgram);
    if (!bindVectorGeometry(renderer)) return false;

    bindVectorFieldUniforms(gl, _vfLocs, planeParams, snapshot);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD_VERTEX_COUNT);

    unbindVao(renderer);
    compositeRendererCanvas(ctx, renderer);
    return true;
}