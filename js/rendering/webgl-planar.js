function createWebGLShader(gl, shaderType, source) {
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

function createWebGLProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createWebGLShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createWebGLShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
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

function createWebGLLineRenderer() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    }) || canvas.getContext('webgl', {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    });

    if (!gl) return null;

    const vertexSource = [
        'attribute vec2 a_position;',
        'uniform vec2 u_resolution;',
        'uniform float u_scale;',
        'void main() {',
        '  vec2 scaledPosition = a_position * u_scale;',
        '  vec2 zeroToOne = scaledPosition / u_resolution;',
        '  vec2 clipSpace = zeroToOne * 2.0 - 1.0;',
        '  gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);',
        '}'
    ].join('\n');

    const fragmentSource = [
        'precision mediump float;',
        'uniform vec4 u_color;',
        'void main() {',
        '  gl_FragColor = u_color;',
        '}'
    ].join('\n');

    const program = createWebGLProgram(gl, vertexSource, fragmentSource);
    if (!program) return null;

    const texVertexSource = [
        'attribute vec2 a_pos;',
        'attribute vec2 a_uv;',
        'varying vec2 v_uv;',
        'void main() {',
        '  gl_Position = vec4(a_pos, 0.0, 1.0);',
        '  v_uv = a_uv;',
        '}'
    ].join('\n');
    const texFragmentSource = [
        'precision mediump float;',
        'uniform sampler2D u_texture;',
        'varying vec2 v_uv;',
        'void main() {',
        '  gl_FragColor = texture2D(u_texture, v_uv);',
        '}'
    ].join('\n');
    const textureProgram = createWebGLProgram(gl, texVertexSource, texFragmentSource);
    if (!textureProgram) {
        gl.deleteProgram(program);
        return null;
    }

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
        gl.deleteProgram(textureProgram);
        gl.deleteProgram(program);
        return null;
    }
    const textureQuadBuffer = gl.createBuffer();
    if (!textureQuadBuffer) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(textureProgram);
        gl.deleteProgram(program);
        return null;
    }

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const aTexPos = gl.getAttribLocation(textureProgram, 'a_pos');
    const aTexUv = gl.getAttribLocation(textureProgram, 'a_uv');
    const uTexture = gl.getUniformLocation(textureProgram, 'u_texture');

    if (aPosition < 0 || !uResolution || !uScale || !uColor || aTexPos < 0 || aTexUv < 0 || !uTexture) {
        gl.deleteBuffer(textureQuadBuffer);
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(textureProgram);
        gl.deleteProgram(program);
        return null;
    }

    const texture = gl.createTexture();
    if (!texture) {
        gl.deleteBuffer(textureQuadBuffer);
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(textureProgram);
        gl.deleteProgram(program);
        return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const quadData = new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

    return {
        canvas,
        gl,
        program,
        textureProgram,
        positionBuffer,
        textureQuadBuffer,
        texture,
        aPosition,
        aTexPos,
        aTexUv,
        uResolution,
        uScale,
        uColor,
        uTexture,
        colorCache: new Map(),
        renderScale: 1,
        viewWidth: 0,
        viewHeight: 0,
        rasterCanvas: document.createElement('canvas'),
        rasterCtx: null
    };
}

function getWebGLSupersampleScale() {
    const configured = (typeof WEBGL_SUPERSAMPLE_FACTOR === 'number' && Number.isFinite(WEBGL_SUPERSAMPLE_FACTOR))
        ? WEBGL_SUPERSAMPLE_FACTOR
        : 1.15;
    const baseScale = Math.max(1, Math.min(1.25, configured));
    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning) ||
        state.particleAnimationEnabled
    ));
    if (isInteracting) return 1;
    const qualityBoost = (state && (state.fourierModeEnabled || state.laplaceModeEnabled || state.streamlineFlowEnabled)) ? 1.06 : 1;
    const deviceScale = (typeof window !== 'undefined' && window.devicePixelRatio)
        ? Math.min(1.04, Math.max(1, window.devicePixelRatio))
        : 1;
    return Math.min(1.32, baseScale * qualityBoost * deviceScale);
}

function ensureWebGLRendererSize(renderer, width, height, renderScaleOverride = null) {
    if (!renderer || !renderer.canvas || width <= 0 || height <= 0) return;

    const renderScale = (typeof renderScaleOverride === 'number' && Number.isFinite(renderScaleOverride) && renderScaleOverride > 0)
        ? renderScaleOverride
        : getWebGLSupersampleScale();
    const internalWidth = Math.max(1, Math.round(width * renderScale));
    const internalHeight = Math.max(1, Math.round(height * renderScale));

    if (renderer.canvas.width !== internalWidth || renderer.canvas.height !== internalHeight) {
        renderer.canvas.width = internalWidth;
        renderer.canvas.height = internalHeight;
    }

    renderer.renderScale = internalWidth / width;
    renderer.viewWidth = width;
    renderer.viewHeight = height;
    renderer.gl.viewport(0, 0, internalWidth, internalHeight);
}

function clampToUnit(value) {
    return Math.min(1, Math.max(0, value));
}

function parseCssColorToRgba(colorString) {
    if (typeof colorString !== 'string') {
        return [1, 1, 1, 1];
    }

    const color = colorString.trim().toLowerCase();
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return [r / 255, g / 255, b / 255, 1];
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r / 255, g / 255, b / 255, 1];
        }
    }

    const rgbaMatch = color.match(/^rgba\(([^)]+)\)$/);
    if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',').map(part => parseFloat(part.trim()));
        if (parts.length === 4 && parts.every(v => Number.isFinite(v))) {
            return [
                clampToUnit(parts[0] / 255),
                clampToUnit(parts[1] / 255),
                clampToUnit(parts[2] / 255),
                clampToUnit(parts[3])
            ];
        }
    }

    const rgbMatch = color.match(/^rgb\(([^)]+)\)$/);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map(part => parseFloat(part.trim()));
        if (parts.length === 3 && parts.every(v => Number.isFinite(v))) {
            return [
                clampToUnit(parts[0] / 255),
                clampToUnit(parts[1] / 255),
                clampToUnit(parts[2] / 255),
                1
            ];
        }
    }

    if (!parseCssColorToRgba._scratchCtx) {
        const scratchCanvas = document.createElement('canvas');
        parseCssColorToRgba._scratchCtx = scratchCanvas.getContext('2d');
    }

    const scratchCtx = parseCssColorToRgba._scratchCtx;
    if (scratchCtx) {
        scratchCtx.fillStyle = '#000000';
        scratchCtx.fillStyle = colorString;
        const normalized = scratchCtx.fillStyle;
        if (normalized && normalized !== colorString) {
            return parseCssColorToRgba(normalized);
        }
    }

    return [1, 1, 1, 1];
}

function getCachedWebGLColor(renderer, colorString, alphaMultiplier) {
    const cacheKey = `${colorString}|${alphaMultiplier.toFixed(4)}`;
    if (!renderer || !renderer.colorCache) {
        const parsed = parseCssColorToRgba(colorString);
        parsed[3] = clampToUnit(parsed[3] * alphaMultiplier);
        return parsed;
    }
    if (renderer.colorCache.has(cacheKey)) return renderer.colorCache.get(cacheKey);
    const parsed = parseCssColorToRgba(colorString);
    parsed[3] = clampToUnit(parsed[3] * alphaMultiplier);
    renderer.colorCache.set(cacheKey, parsed);
    return parsed;
}

class PolylineCaptureContext {
    constructor() {
        this.strokeStyle = 'rgba(255, 255, 255, 1)';
        this.fillStyle = 'rgba(255, 255, 255, 1)';
        this.lineWidth = 1;
        this.lineJoin = 'miter';
        this.lineCap = 'butt';
        this.globalAlpha = 1;
        this.font = "10px sans-serif";
        this.textAlign = 'left';
        this.textBaseline = 'alphabetic';

        this._stateStack = [];
        this._subpaths = [];
        this._activeSubpath = null;
        this._batches = [];
    }

    _cloneState() {
        return {
            strokeStyle: this.strokeStyle,
            fillStyle: this.fillStyle,
            lineWidth: this.lineWidth,
            lineJoin: this.lineJoin,
            lineCap: this.lineCap,
            globalAlpha: this.globalAlpha,
            font: this.font,
            textAlign: this.textAlign,
            textBaseline: this.textBaseline
        };
    }

    _startSubpath(x, y) {
        const subpath = {
            points: [x, y],
            closed: false
        };
        this._subpaths.push(subpath);
        this._activeSubpath = subpath;
        return subpath;
    }

    _ensureSubpath(x, y) {
        if (!this._activeSubpath) return this._startSubpath(x, y);
        return this._activeSubpath;
    }

    _pushBatch(mode, pointsArray, colorString, lineWidth = 1, alphaMultiplier = 1) {
        if (!Array.isArray(pointsArray) || pointsArray.length < 4) return;
        this._batches.push({
            mode,
            points: new Float32Array(pointsArray),
            color: colorString,
            lineWidth,
            alphaMultiplier
        });
    }

    save() {
        this._stateStack.push(this._cloneState());
    }

    restore() {
        if (this._stateStack.length === 0) return;
        const restored = this._stateStack.pop();
        this.strokeStyle = restored.strokeStyle;
        this.fillStyle = restored.fillStyle;
        this.lineWidth = restored.lineWidth;
        this.lineJoin = restored.lineJoin;
        this.lineCap = restored.lineCap;
        this.globalAlpha = restored.globalAlpha;
        this.font = restored.font;
        this.textAlign = restored.textAlign;
        this.textBaseline = restored.textBaseline;
    }

    beginPath() {
        this._subpaths = [];
        this._activeSubpath = null;
    }

    moveTo(x, y) {
        this._startSubpath(x, y);
    }

    lineTo(x, y) {
        const subpath = this._ensureSubpath(x, y);
        subpath.points.push(x, y);
    }

    closePath() {
        if (!this._activeSubpath || this._activeSubpath.points.length < 4) return;
        const pts = this._activeSubpath.points;
        const sx = pts[0];
        const sy = pts[1];
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        if (Math.abs(sx - lx) > 1e-6 || Math.abs(sy - ly) > 1e-6) {
            pts.push(sx, sy);
        }
        this._activeSubpath.closed = true;
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        if (!Number.isFinite(radius) || radius <= 0) return;

        const fullTurn = Math.PI * 2;
        let delta = endAngle - startAngle;
        if (!anticlockwise && delta < 0) delta += fullTurn;
        if (anticlockwise && delta > 0) delta -= fullTurn;
        if (Math.abs(delta) < 1e-9) delta = anticlockwise ? -fullTurn : fullTurn;

        const segmentCount = Math.max(
            12,
            Math.min(160, Math.ceil(Math.abs(delta) / (Math.PI / 18) * Math.sqrt(Math.max(1, radius / 8))))
        );

        for (let i = 0; i <= segmentCount; i++) {
            const t = i / segmentCount;
            const angle = startAngle + delta * t;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);
            if (i === 0) {
                if (!this._activeSubpath) this.moveTo(px, py);
                else this.lineTo(px, py);
            } else {
                this.lineTo(px, py);
            }
        }
    }

    stroke() {
        for (const subpath of this._subpaths) {
            if (!subpath || !Array.isArray(subpath.points) || subpath.points.length < 4) continue;
            this._pushBatch('line', subpath.points, this.strokeStyle, this.lineWidth, this.globalAlpha);
        }
    }

    fill() {
        for (const subpath of this._subpaths) {
            if (!subpath || !Array.isArray(subpath.points) || subpath.points.length < 6) continue;
            const points = subpath.points.slice();
            const sx = points[0];
            const sy = points[1];
            const lx = points[points.length - 2];
            const ly = points[points.length - 1];
            if (Math.abs(sx - lx) > 1e-6 || Math.abs(sy - ly) > 1e-6) {
                points.push(sx, sy);
            }
            this._pushBatch('fill', points, this.fillStyle, 1, this.globalAlpha);
        }
    }

    fillRect(x, y, width, height) {
        const pts = [
            x, y,
            x + width, y,
            x + width, y + height,
            x, y + height
        ];
        this._pushBatch('fill', pts, this.fillStyle, 1, this.globalAlpha);
    }

    strokeRect(x, y, width, height) {
        const pts = [
            x, y,
            x + width, y,
            x + width, y + height,
            x, y + height,
            x, y
        ];
        this._pushBatch('line', pts, this.strokeStyle, this.lineWidth, this.globalAlpha);
    }

    clearRect() {}
    drawImage() {}
    setLineDash() {}
    fillText() {}
    strokeText() {}
    clip() {}
    translate() {}
    rotate() {}
    scale() {}
    transform() {}
    setTransform() {}

    measureText(text) {
        const safeText = String(text || '');
        return { width: safeText.length * 7 };
    }

    getBatches() {
        return this._batches;
    }
}

function renderWebGLPolylineBatches(renderer, width, height, batches) {
    if (!renderer || !renderer.gl || !Array.isArray(batches)) return false;

    const gl = renderer.gl;
    ensureWebGLRendererSize(renderer, width, height, 1);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(renderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.positionBuffer);
    gl.enableVertexAttribArray(renderer.aPosition);
    gl.vertexAttribPointer(renderer.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(renderer.uResolution, renderer.canvas.width, renderer.canvas.height);
    gl.uniform1f(renderer.uScale, renderer.renderScale);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let totalFloatCount = 0;
    for (const batch of batches) {
        if (!batch || !(batch.points instanceof Float32Array) || batch.points.length < 4) continue;

        const alphaMultiplier = Number.isFinite(batch.alphaMultiplier) ? batch.alphaMultiplier : 1;
        const rgba = getCachedWebGLColor(renderer, batch.color, alphaMultiplier);
        gl.uniform4f(renderer.uColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        if (batch.mode === 'fill') {
            totalFloatCount += batch.points.length;
            if (totalFloatCount > WEBGL_LINE_BATCH_LIMIT) {
                return false;
            }
            gl.bufferData(gl.ARRAY_BUFFER, batch.points, gl.STREAM_DRAW);
            if (batch.points.length >= 6) {
                gl.drawArrays(gl.TRIANGLE_FAN, 0, batch.points.length / 2);
            }
            continue;
        }

        const halfWidth = Math.max(0.5, ((batch.lineWidth || 1) * renderer.renderScale) * 0.5);
        const useFeather = halfWidth >= 1.0;
        const featherWidth = useFeather ? Math.max(0.2, renderer.renderScale * 0.18) : 0;
        const outerTriangles = useFeather ? buildPolylineTriangles(batch.points, halfWidth + featherWidth) : null;
        const innerTriangles = buildPolylineTriangles(batch.points, halfWidth);
        if ((!outerTriangles || outerTriangles.length < 6) && (!innerTriangles || innerTriangles.length < 6)) continue;

        if (outerTriangles && outerTriangles.length >= 6) {
            totalFloatCount += outerTriangles.length;
            if (totalFloatCount > WEBGL_LINE_BATCH_LIMIT) {
                return false;
            }
            gl.uniform4f(
                renderer.uColor,
                rgba[0],
                rgba[1],
                rgba[2],
                Math.max(0, Math.min(1, rgba[3] * 0.16))
            );
            gl.bufferData(gl.ARRAY_BUFFER, outerTriangles, gl.STREAM_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, outerTriangles.length / 2);
        }

        if (innerTriangles && innerTriangles.length >= 6) {
            totalFloatCount += innerTriangles.length;
            if (totalFloatCount > WEBGL_LINE_BATCH_LIMIT) {
                return false;
            }
            gl.uniform4f(renderer.uColor, rgba[0], rgba[1], rgba[2], rgba[3]);
            gl.bufferData(gl.ARRAY_BUFFER, innerTriangles, gl.STREAM_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, innerTriangles.length / 2);
        }
    }

    return true;
}

function buildPolylineTriangles(points, halfWidth) {
    if (!(points instanceof Float32Array) || points.length < 4 || !Number.isFinite(halfWidth) || halfWidth <= 0) {
        return null;
    }

    const data = [];
    const pointCount = points.length / 2;

    for (let i = 0; i < pointCount - 1; i++) {
        const idx = i * 2;
        const x0 = points[idx];
        const y0 = points[idx + 1];
        const x1 = points[idx + 2];
        const y1 = points[idx + 3];

        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) continue;

        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len < 1e-8) continue;

        const nx = -dy / len;
        const ny = dx / len;
        const ox = nx * halfWidth;
        const oy = ny * halfWidth;

        const p0Lx = x0 + ox;
        const p0Ly = y0 + oy;
        const p0Rx = x0 - ox;
        const p0Ry = y0 - oy;
        const p1Lx = x1 + ox;
        const p1Ly = y1 + oy;
        const p1Rx = x1 - ox;
        const p1Ry = y1 - oy;

        // Triangle 1
        data.push(p0Lx, p0Ly, p0Rx, p0Ry, p1Lx, p1Ly);
        // Triangle 2
        data.push(p1Lx, p1Ly, p0Rx, p0Ry, p1Rx, p1Ry);
    }

    if (data.length === 0) return null;
    return new Float32Array(data);
}

function compositeWebGLToCanvas(ctx, renderer, width, height) {
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality !== undefined) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(renderer.canvas, 0, 0, renderer.canvas.width, renderer.canvas.height, 0, 0, width, height);
    ctx.restore();
}

function compositeRasterToCanvas(ctx, sourceCanvas, width, height) {
    if (!ctx || !sourceCanvas) return;
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality !== undefined) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, width, height);
    ctx.restore();
}

function ensureRasterCanvasSize(renderer, width, height) {
    if (!renderer || !renderer.rasterCanvas) return null;
    if (!renderer.rasterCtx) {
        renderer.rasterCtx = renderer.rasterCanvas.getContext('2d');
        if (!renderer.rasterCtx) return null;
    }
    if (renderer.rasterCanvas.width !== width || renderer.rasterCanvas.height !== height) {
        renderer.rasterCanvas.width = width;
        renderer.rasterCanvas.height = height;
    }
    renderer.rasterCtx.imageSmoothingEnabled = true;
    if (renderer.rasterCtx.imageSmoothingQuality !== undefined) {
        renderer.rasterCtx.imageSmoothingQuality = 'high';
    }
    return renderer.rasterCtx;
}

function replayCapturedBatches(ctx, batches) {
    if (!ctx || !Array.isArray(batches) || batches.length === 0) return false;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const batch of batches) {
        if (!batch || !(batch.points instanceof Float32Array) || batch.points.length < 4) continue;

        const alphaMultiplier = Number.isFinite(batch.alphaMultiplier) ? clampToUnit(batch.alphaMultiplier) : 1;
        ctx.globalAlpha = alphaMultiplier;

        if (batch.mode === 'fill') {
            if (batch.points.length < 6) continue;
            ctx.fillStyle = batch.color || '#ffffff';
            ctx.beginPath();
            ctx.moveTo(batch.points[0], batch.points[1]);
            for (let i = 2; i < batch.points.length; i += 2) {
                ctx.lineTo(batch.points[i], batch.points[i + 1]);
            }
            ctx.closePath();
            ctx.fill();
            continue;
        }

        ctx.strokeStyle = batch.color || '#ffffff';
        ctx.lineWidth = Number.isFinite(batch.lineWidth) ? batch.lineWidth : 1;
        ctx.beginPath();
        ctx.moveTo(batch.points[0], batch.points[1]);
        for (let i = 2; i < batch.points.length; i += 2) {
            ctx.lineTo(batch.points[i], batch.points[i + 1]);
        }
        ctx.stroke();
    }

    return true;
}

function renderCapturedBatchesToCanvas(ctx, batches) {
    if (!ctx || !Array.isArray(batches)) return false;
    if (batches.length === 0) return true;
    ctx.save();
    const rendered = replayCapturedBatches(ctx, batches);
    ctx.restore();
    return rendered;
}

function renderCapturedBatchesViaWebGLRaster(renderer, targetCtx, width, height, batches) {
    if (!renderer || !targetCtx || !Array.isArray(batches)) return false;

    ensureWebGLRendererSize(renderer, width, height, 1);
    const rasterCtx = ensureRasterCanvasSize(renderer, renderer.canvas.width, renderer.canvas.height);
    if (!rasterCtx) return false;

    rasterCtx.setTransform(1, 0, 0, 1, 0, 0);
    rasterCtx.clearRect(0, 0, renderer.rasterCanvas.width, renderer.rasterCanvas.height);
    rasterCtx.globalAlpha = 1;
    rasterCtx.globalCompositeOperation = 'source-over';
    rasterCtx.setTransform(renderer.renderScale, 0, 0, renderer.renderScale, 0, 0);

    replayCapturedBatches(rasterCtx, batches);

    if (renderer.renderScale <= 1.001) {
        compositeRasterToCanvas(targetCtx, renderer.rasterCanvas, width, height);
        return true;
    }

    const textured = renderCanvasTextureToWebGL(renderer, renderer.rasterCanvas, width, height);
    if (textured) {
        compositeWebGLToCanvas(targetCtx, renderer, width, height);
    } else {
        compositeRasterToCanvas(targetCtx, renderer.rasterCanvas, width, height);
    }
    return true;
}

function renderCanvasTextureToWebGL(renderer, sourceCanvas, width, height) {
    if (!renderer || !renderer.gl || !renderer.textureProgram || !sourceCanvas) return false;

    const gl = renderer.gl;
    ensureWebGLRendererSize(renderer, width, height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(renderer.textureProgram);

    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
    const textureFilter = renderer.renderScale > 1.001 ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.textureQuadBuffer);
    gl.enableVertexAttribArray(renderer.aTexPos);
    gl.vertexAttribPointer(renderer.aTexPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(renderer.aTexUv);
    gl.vertexAttribPointer(renderer.aTexUv, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
    gl.uniform1i(renderer.uTexture, 0);

    // Preserve raster luminance/alpha exactly for full-screen texture compositing.
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
}

function initializeWebGLLineSupport() {
    webglSupport.available = false;
    webglSupport.reason = 'disabled-or-unavailable';
    webglSupport.renderers.z = null;
    webglSupport.renderers.w = null;

    if (!state || !state.webglLineRenderingEnabled) {
        webglSupport.reason = 'disabled';
        return;
    }

    const rendererZ = createWebGLLineRenderer();
    const rendererW = createWebGLLineRenderer();
    if (!rendererZ || !rendererW) {
        webglSupport.reason = 'context-or-program-init-failed';
        console.info('WebGL line rendering unavailable, using 2D canvas fallback.');
        return;
    }

    webglSupport.renderers.z = rendererZ;
    webglSupport.renderers.w = rendererW;
    webglSupport.available = true;
    webglSupport.reason = 'ready';
    console.info('WebGL line rendering enabled.');
}

function getWebGLRendererForPlane(planeKey) {
    if (!webglSupport || !webglSupport.renderers) return null;
    return planeKey === 'z' ? webglSupport.renderers.z : webglSupport.renderers.w;
}

function drawWithWebGLCapture(ctx, planeParams, planeKey, drawCallback) {
    if (!state.webglLineRenderingEnabled || !webglSupport.available) return false;
    if (!ctx || !planeParams || typeof drawCallback !== 'function') return false;

    const renderer = getWebGLRendererForPlane(planeKey);
    if (!renderer) return false;

    let batches = null;
    try {
        const captureCtx = new PolylineCaptureContext();
        drawCallback(captureCtx);
        batches = captureCtx.getBatches();
        if (!batches || batches.length === 0) return true;

        const rendered = renderWebGLPolylineBatches(renderer, planeParams.width, planeParams.height, batches);
        if (!rendered) {
            if (renderCapturedBatchesViaWebGLRaster(renderer, ctx, planeParams.width, planeParams.height, batches)) {
                return true;
            }
            return renderCapturedBatchesToCanvas(ctx, batches);
        }

        compositeWebGLToCanvas(ctx, renderer, planeParams.width, planeParams.height);
        return true;
    } catch (error) {
        console.warn('WebGL capture path failed; falling back to 2D canvas:', error);
        if (batches && batches.length > 0) {
            if (renderCapturedBatchesViaWebGLRaster(renderer, ctx, planeParams.width, planeParams.height, batches)) {
                return true;
            }
            return renderCapturedBatchesToCanvas(ctx, batches);
        }
        return false;
    }
}

function drawWithWebGLRaster(ctx, planeParams, planeKey, drawCallback, options = null) {
    if (!state.webglLineRenderingEnabled || !webglSupport.available) return false;
    if (!ctx || !planeParams || typeof drawCallback !== 'function') return false;

    const renderer = getWebGLRendererForPlane(planeKey);
    if (!renderer) return false;

    let rasterCtx = null;
    let callbackDrawn = false;
    try {
        const renderScaleOverride = (options && typeof options === 'object' && Number.isFinite(options.renderScaleOverride))
            ? options.renderScaleOverride
            : null;
        const requestedRenderScale = (typeof renderScaleOverride === 'number' && renderScaleOverride > 0)
            ? renderScaleOverride
            : getWebGLSupersampleScale();
        const directDrawIfNativeScale = !(options && typeof options === 'object' && options.directDrawIfNativeScale === false);
        if (directDrawIfNativeScale && requestedRenderScale <= 1.001) {
            drawCallback(ctx);
            return true;
        }
        ensureWebGLRendererSize(renderer, planeParams.width, planeParams.height, requestedRenderScale);

        rasterCtx = ensureRasterCanvasSize(renderer, renderer.canvas.width, renderer.canvas.height);
        if (!rasterCtx) return false;

        rasterCtx.setTransform(1, 0, 0, 1, 0, 0);
        rasterCtx.clearRect(0, 0, renderer.rasterCanvas.width, renderer.rasterCanvas.height);
        rasterCtx.globalAlpha = 1;
        rasterCtx.globalCompositeOperation = 'source-over';
        rasterCtx.setTransform(renderer.renderScale, 0, 0, renderer.renderScale, 0, 0);

        drawCallback(rasterCtx);
        callbackDrawn = true;

        const rendered = renderCanvasTextureToWebGL(renderer, renderer.rasterCanvas, planeParams.width, planeParams.height);
        if (!rendered) {
            compositeRasterToCanvas(ctx, renderer.rasterCanvas, planeParams.width, planeParams.height);
            return true;
        }

        compositeWebGLToCanvas(ctx, renderer, planeParams.width, planeParams.height);
        return true;
    } catch (error) {
        console.warn('WebGL raster path failed; falling back to 2D canvas:', error);
        if (callbackDrawn && rasterCtx && renderer.rasterCanvas) {
            rasterCtx.setTransform(1, 0, 0, 1, 0, 0);
            compositeRasterToCanvas(ctx, renderer.rasterCanvas, planeParams.width, planeParams.height);
            return true;
        }
        return false;
    }
}

function canUseWebGLForPlanarInputShape() {
    if (state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare') {
        return false;
    }
    return true;
}

function drawPlanarTransformedShapeHybrid(ctx, planeParams, tf, planeKey) {
    if (planeKey === 'w') {
        const renderedByNativeRaster = drawWithWebGLRaster(ctx, planeParams, planeKey, (rasterCtx) => {
            drawPlanarTransformedShape(rasterCtx, planeParams, tf);
        }, { renderScaleOverride: 1 });
        if (renderedByNativeRaster) return true;
    }

    const captureDisabledByRadialSteps = state.radialDiscreteStepsEnabled && state.currentFunction !== 'poincare';
    const captureDisabledByLineMode = state.currentInputShape === 'line' && (state.currentFunction === 'cos' || state.currentFunction === 'sin');
    const canUseCapture = !captureDisabledByRadialSteps && !captureDisabledByLineMode;

    if (canUseCapture) {
        const renderedByCapture = drawWithWebGLCapture(ctx, planeParams, planeKey, (captureCtx) => {
            drawPlanarTransformedShape(captureCtx, planeParams, tf);
        });
        if (renderedByCapture) return true;
    }

    return drawWithWebGLRaster(ctx, planeParams, planeKey, (rasterCtx) => {
        drawPlanarTransformedShape(rasterCtx, planeParams, tf);
    }, { renderScaleOverride: 1 });
}

function drawPlanarInputShapeHybrid(ctx, planeParams, planeKey) {
    if (canUseWebGLForPlanarInputShape()) {
        const renderedByCapture = drawWithWebGLCapture(ctx, planeParams, planeKey, (captureCtx) => {
            drawPlanarInputShape(captureCtx, planeParams);
        });
        if (renderedByCapture) return true;
    }

    return drawWithWebGLRaster(ctx, planeParams, planeKey, (rasterCtx) => {
        drawPlanarInputShape(rasterCtx, planeParams);
    }, { renderScaleOverride: 1 });
}
