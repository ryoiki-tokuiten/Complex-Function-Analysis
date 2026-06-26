import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { state, zPlaneParams } from '../store/state.js';
import { getChainedTransformFunction } from '../math-utils.js';
import { compileExpression } from '../math/expression/evaluator.js';
import { updatePlaneViewportRanges } from '../utils/canvas-utils.js';
import { setupVisualParameters } from '../utils/dom-utils.js';

const BACKGROUND = 0x0b0914;
const CAMERA_HOME = Object.freeze({ x: 6.0, y: 5.0, z: 8.0 });
const SURFACE_SIZE = 6.0;
const SURFACE_HEIGHT = 3.5;
const GRID_SEGMENTS = 40;
const GRID_STRIDE = GRID_SEGMENTS + 1;
const GRID_VERTEX_COUNT = GRID_STRIDE * GRID_STRIDE;
const GRID_INDEX_COUNT = GRID_SEGMENTS * GRID_SEGMENTS * 6;
const HALF_SURFACE = SURFACE_SIZE * 0.5;
const HALF_HEIGHT = SURFACE_HEIGHT * 0.5;
const CLAMP_LIMIT = 8.0;
const INV_TWO_PI = 1 / (2 * Math.PI);
const PALETTE_LUT_SIZE = 1024;
const PALETTE_LUT_MASK = PALETTE_LUT_SIZE - 1;

const INPUT_PRESET = Object.freeze({
    GENERIC: 0,
    X: 1,
    Y: 2,
    ZERO: 3,
    X_PLUS_Y: 4,
    X_MINUS_Y: 5,
    X_TIMES_Y: 6,
    TWO_X_PLUS_Y: 7,
    SIN_X_PLUS_COS_Y: 8,
    X2_MINUS_Y2: 9
});

const OUTPUT_COMPONENT = Object.freeze({
    REAL: 0,
    IMAG: 1,
    MAGNITUDE: 2
});

const PALETTE_HEX = Object.freeze({
    ocean: [0x004d40, 0x00acc1, 0x80cbc4],
    cyberpunk: [0x4a148c, 0xd81b60, 0x00e5ff],
    copper: [0x3e2723, 0xd84315, 0xffe0b2],
    forest: [0x0e3a14, 0x2e7d32, 0xa5d6a7, 0xfff9c4],
    viridis: [0x440154, 0x3b528b, 0x21908d, 0x5dc963, 0xfde725],
    sunset: [0x1a0b36, 0x880e4f, 0xff5722, 0xffeb3b]
});

let active3DRenderer = null;

function isFiniteNumber(value) {
    return typeof value === 'number' && value === value && value !== Infinity && value !== -Infinity;
}

function clamp01(value) {
    return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function hexChannel(hex, shift) {
    return ((hex >> shift) & 255) / 255;
}

function writeInterpolatedHex(target, offset, a, b, t) {
    const ar = hexChannel(a, 16);
    const ag = hexChannel(a, 8);
    const ab = hexChannel(a, 0);
    target[offset] = ar + (hexChannel(b, 16) - ar) * t;
    target[offset + 1] = ag + (hexChannel(b, 8) - ag) * t;
    target[offset + 2] = ab + (hexChannel(b, 0) - ab) * t;
}

function createPaletteLut(hexStops) {
    const lut = new Float32Array(PALETTE_LUT_SIZE * 3);
    if (!hexStops || hexStops.length === 0) return lut;
    if (hexStops.length === 1) {
        for (let i = 0; i < PALETTE_LUT_SIZE; i += 1) {
            writeInterpolatedHex(lut, i * 3, hexStops[0], hexStops[0], 0);
        }
        return lut;
    }

    const lastSegment = hexStops.length - 1;
    for (let i = 0; i < PALETTE_LUT_SIZE; i += 1) {
        const scaled = i / (PALETTE_LUT_SIZE - 1) * lastSegment;
        const segment = Math.min(lastSegment - 1, scaled | 0);
        writeInterpolatedHex(lut, i * 3, hexStops[segment], hexStops[segment + 1], scaled - segment);
    }
    return lut;
}

const PALETTE_LUTS = Object.freeze(Object.fromEntries(
    Object.entries(PALETTE_HEX).map(([name, stops]) => [name, createPaletteLut(stops)])
));

function paletteLutFor(name) {
    return PALETTE_LUTS[name] || PALETTE_LUTS.sunset;
}

function writePaletteColor(lut, ratio, colors, offset) {
    const lutOffset = ((clamp01(ratio) * PALETTE_LUT_MASK + 0.5) | 0) * 3;
    colors[offset] = lut[lutOffset];
    colors[offset + 1] = lut[lutOffset + 1];
    colors[offset + 2] = lut[lutOffset + 2];
}

function makeAxisLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.font = '600 42px "STIX Two Math", serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
    }));
    sprite.scale.set(1.2, 0.45, 1);
    return sprite;
}

function disposeObject(object) {
    if (!object) return;
    const geometries = new Set();
    const materials = new Set();
    object.traverse(child => {
        if (child.geometry) geometries.add(child.geometry);
        if (Array.isArray(child.material)) {
            child.material.forEach(material => materials.add(material));
        } else if (child.material) {
            materials.add(child.material);
        }
    });
    geometries.forEach(geometry => geometry.dispose?.());
    materials.forEach(material => {
        material.map?.dispose?.();
        material.dispose?.();
    });
}

function presetType(expr) {
    switch (expr) {
        case 'x': return INPUT_PRESET.X;
        case 'y': return INPUT_PRESET.Y;
        case '0': return INPUT_PRESET.ZERO;
        case 'x+y': return INPUT_PRESET.X_PLUS_Y;
        case 'x-y': return INPUT_PRESET.X_MINUS_Y;
        case 'x*y': return INPUT_PRESET.X_TIMES_Y;
        case '2x+y': return INPUT_PRESET.TWO_X_PLUS_Y;
        case 'sin(x)+cos(y)': return INPUT_PRESET.SIN_X_PLUS_COS_Y;
        case 'x*x-y*y': return INPUT_PRESET.X2_MINUS_Y2;
        default: return INPUT_PRESET.GENERIC;
    }
}

const compiledPresetCache = new Map();

function getCompiledPreset(preset) {
    if (!compiledPresetCache.has(preset)) {
        try {
            compiledPresetCache.set(preset, compileExpression(preset, { allowedVariables: ['x', 'y'] }));
        } catch (e) {
            compiledPresetCache.set(preset, null);
        }
    }
    return compiledPresetCache.get(preset);
}

class InputEvaluator {
    static #cache = new Map();

    static for(expression) {
        const key = expression || 'x';
        let evaluator = this.#cache.get(key);
        if (!evaluator) {
            evaluator = new InputEvaluator(key);
            this.#cache.set(key, evaluator);
        }
        return evaluator;
    }

    constructor(expression) {
        this.expression = expression || 'x';
        this.type = presetType(this.expression);
        this.compiled = this.type === INPUT_PRESET.GENERIC ? getCompiledPreset(this.expression) : null;
        this.scope = {
            x: { re: 0, im: 0 },
            y: { re: 0, im: 0 }
        };
    }

    write(x, y, out) {
        switch (this.type) {
            case INPUT_PRESET.X:
                out[0] = x; out[1] = 0; return;
            case INPUT_PRESET.Y:
                out[0] = y; out[1] = 0; return;
            case INPUT_PRESET.ZERO:
                out[0] = 0; out[1] = 0; return;
            case INPUT_PRESET.X_PLUS_Y:
                out[0] = x + y; out[1] = 0; return;
            case INPUT_PRESET.X_MINUS_Y:
                out[0] = x - y; out[1] = 0; return;
            case INPUT_PRESET.X_TIMES_Y:
                out[0] = x * y; out[1] = 0; return;
            case INPUT_PRESET.TWO_X_PLUS_Y:
                out[0] = 2 * x + y; out[1] = 0; return;
            case INPUT_PRESET.SIN_X_PLUS_COS_Y:
                out[0] = Math.sin(x) + Math.cos(y); out[1] = 0; return;
            case INPUT_PRESET.X2_MINUS_Y2:
                out[0] = x * x - y * y; out[1] = 0; return;
            default:
                this.writeCompiled(x, y, out);
        }
    }

    writeCompiled(x, y, out) {
        const compiled = this.compiled;
        if (!compiled) {
            out[0] = x;
            out[1] = 0;
            return;
        }

        const scope = this.scope;
        scope.x.re = x;
        scope.x.im = 0;
        scope.y.re = y;
        scope.y.im = 0;

        try {
            const result = compiled(scope);
            if (typeof result === 'number') {
                out[0] = isFiniteNumber(result) ? result : 0;
                out[1] = 0;
            } else if (result && typeof result === 'object') {
                const re = result.re;
                const im = result.im || 0;
                out[0] = isFiniteNumber(re) ? re : 0;
                out[1] = isFiniteNumber(im) ? im : 0;
            } else {
                out[0] = 0;
                out[1] = 0;
            }
        } catch (e) {
            out[0] = 0;
            out[1] = 0;
        }
    }
}

class StaticSurfaceTopology {
    constructor(segments = GRID_SEGMENTS) {
        this.segments = segments;
        this.stride = segments + 1;
        this.vertexCount = this.stride * this.stride;
        this.indices = new Uint16Array(segments * segments * 6);
        this.gridX = new Float32Array(this.vertexCount);
        this.gridZ = new Float32Array(this.vertexCount);
        this.#buildGrid();
        this.#buildIndices();
    }

    #buildGrid() {
        let index = 0;
        for (let j = 0; j <= this.segments; j += 1) {
            const z = (j / this.segments - 0.5) * SURFACE_SIZE;
            for (let i = 0; i <= this.segments; i += 1) {
                this.gridX[index] = (i / this.segments - 0.5) * SURFACE_SIZE;
                this.gridZ[index] = z;
                index += 1;
            }
        }
    }

    #buildIndices() {
        let write = 0;
        const stride = this.stride;
        for (let j = 0; j < this.segments; j += 1) {
            const row = j * stride;
            const next = row + stride;
            for (let i = 0; i < this.segments; i += 1) {
                const a = row + i;
                const b = a + 1;
                const c = next + i;
                const d = c + 1;
                this.indices[write++] = a;
                this.indices[write++] = c;
                this.indices[write++] = b;
                this.indices[write++] = b;
                this.indices[write++] = c;
                this.indices[write++] = d;
            }
        }
    }
}

const SURFACE_TOPOLOGY = new StaticSurfaceTopology();

class SurfaceMeshStore {
    constructor() {
        this.positions = new Float32Array(GRID_VERTEX_COUNT * 3);
        this.normals = new Float32Array(GRID_VERTEX_COUNT * 3);
        this.colors = new Float32Array(GRID_VERTEX_COUNT * 3);
        this.values = new Float64Array(GRID_VERTEX_COUNT);
        this.phases = new Float32Array(GRID_VERTEX_COUNT);
        this.u = new Float64Array(2);
        this.v = new Float64Array(2);
        this.geometry = this.#createGeometry();
        this.material = this.#createSurfaceMaterial();
        this.wireMaterial = this.#createWireMaterial();
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.wireframe = new THREE.Mesh(this.geometry, this.wireMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.wireframe.renderOrder = 2;
        this.lastBoundsKey = '';
    }

    #createGeometry() {
        const geometry = new THREE.BufferGeometry();
        const position = new THREE.BufferAttribute(this.positions, 3);
        const normal = new THREE.BufferAttribute(this.normals, 3);
        const color = new THREE.BufferAttribute(this.colors, 3);
        position.setUsage?.(THREE.DynamicDrawUsage);
        normal.setUsage?.(THREE.DynamicDrawUsage);
        color.setUsage?.(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', position);
        geometry.setAttribute('normal', normal);
        geometry.setAttribute('color', color);
        geometry.setIndex(new THREE.BufferAttribute(SURFACE_TOPOLOGY.indices, 1));
        return geometry;
    }

    #createSurfaceMaterial() {
        return new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.12,
            metalness: 0.08,
            clearcoat: 0.85,
            clearcoatRoughness: 0.08,
            transmission: 0.22,
            ior: 1.52,
            thickness: 0.85,
            specularIntensity: 0.9,
            transparent: true,
            opacity: 0.96
        });
    }

    #createWireMaterial() {
        const MaterialCtor = THREE.MeshBasicMaterial || THREE.LineBasicMaterial;
        return new MaterialCtor({
            color: 0xd8e7ff,
            transparent: true,
            opacity: 0.055,
            depthWrite: false,
            wireframe: true
        });
    }

    markDirty() {
        const geometry = this.geometry;
        geometry.getAttribute('position').needsUpdate = true;
        geometry.getAttribute('normal').needsUpdate = true;
        geometry.getAttribute('color').needsUpdate = true;
        geometry.computeBoundingSphere?.();
    }

    dispose() {
        this.geometry.dispose?.();
        this.material.dispose?.();
        this.wireMaterial.dispose?.();
    }
}

function formatCoord(value) {
    if (Math.abs(value) < 1e-10) return '0';
    if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) return value.toExponential(2);
    const text = value.toFixed(2);
    return text.endsWith('.00') ? text.slice(0, -3) : text;
}

function outputComponentMode(component) {
    if (component === 'imag') return OUTPUT_COMPONENT.IMAG;
    if (component === 'magnitude') return OUTPUT_COMPONENT.MAGNITUDE;
    return OUTPUT_COMPONENT.REAL;
}

function outputAxisLabel(component) {
    if (component === 'imag') return 'z = Im(f)';
    if (component === 'magnitude') return 'z = |f|';
    return 'z = Re(f)';
}

function isScalarInputType(type) {
    return type !== INPUT_PRESET.GENERIC;
}

function evalScalarInput(type, x, y) {
    switch (type) {
        case INPUT_PRESET.X: return x;
        case INPUT_PRESET.Y: return y;
        case INPUT_PRESET.ZERO: return 0;
        case INPUT_PRESET.X_PLUS_Y: return x + y;
        case INPUT_PRESET.X_MINUS_Y: return x - y;
        case INPUT_PRESET.X_TIMES_Y: return x * y;
        case INPUT_PRESET.TWO_X_PLUS_Y: return 2 * x + y;
        case INPUT_PRESET.SIN_X_PLUS_COS_Y: return Math.sin(x) + Math.cos(y);
        case INPUT_PRESET.X2_MINUS_Y2: return x * x - y * y;
        default: return x;
    }
}


function softClampHeight(value) {
    const abs = Math.abs(value);
    if (abs <= CLAMP_LIMIT) return value;
    return Math.sign(value) * (CLAMP_LIMIT + Math.tanh(abs - CLAMP_LIMIT));
}

function writeHeightfieldNormals(positions, normals, segments, gridStep) {
    const stride = segments + 1;
    const inverseCell = 1 / (2 * gridStep);
    for (let j = 0; j <= segments; j += 1) {
        const jPrev = j === 0 ? 0 : j - 1;
        const jNext = j === segments ? segments : j + 1;
        for (let i = 0; i <= segments; i += 1) {
            const iPrev = i === 0 ? 0 : i - 1;
            const iNext = i === segments ? segments : i + 1;
            const index = j * stride + i;
            const left = (j * stride + iPrev) * 3 + 1;
            const right = (j * stride + iNext) * 3 + 1;
            const down = (jPrev * stride + i) * 3 + 1;
            const up = (jNext * stride + i) * 3 + 1;
            let nx = -(positions[right] - positions[left]) * inverseCell;
            let ny = 1;
            let nz = -(positions[up] - positions[down]) * inverseCell;
            const invLen = 1 / Math.hypot(nx, ny, nz);
            const offset = index * 3;
            normals[offset] = nx * invLen;
            normals[offset + 1] = ny * invLen;
            normals[offset + 2] = nz * invLen;
        }
    }
}

export function sampleRealPlotSurface(transformFunc, options = {}) {
    const segments = Math.max(1, Math.floor(Number(options.segments) || GRID_SEGMENTS));
    const topology = options.topology || (segments === GRID_SEGMENTS ? SURFACE_TOPOLOGY : new StaticSurfaceTopology(segments));
    const vertexCount = topology.vertexCount;
    const positions = options.positions || new Float32Array(vertexCount * 3);
    const normals = options.normals || new Float32Array(vertexCount * 3);
    const colors = options.colors || new Float32Array(vertexCount * 3);
    const values = options.values || new Float64Array(vertexCount);
    const phases = options.phases || new Float32Array(vertexCount);
    const u = options.u || new Float64Array(2);
    const v = options.v || new Float64Array(2);
    const xRange = options.xRange || zPlaneParams.currentVisXRange;
    const yRange = options.yRange || zPlaneParams.currentVisYRange;
    const xMin = xRange[0];
    const xMax = xRange[1];
    const yMin = yRange[0];
    const yMax = yRange[1];
    const xScale = (xMax - xMin) / segments;
    const yScale = (yMax - yMin) / segments;
    const inputU = InputEvaluator.for(options.inputExpr ?? state.realPlotsInputExpr);
    const inputV = InputEvaluator.for(options.imagExpr ?? state.realPlotsImagExpr);
    const inputUType = inputU.type;
    const inputVType = inputV.type;
    const scalarInputs = isScalarInputType(inputUType) && isScalarInputType(inputVType);
    const outputMode = outputComponentMode(options.outputComponent ?? state.realPlotsOutputComponent);
    const heightScale = options.heightScale !== undefined
        ? options.heightScale
        : state.realPlotsHeightScale !== undefined ? state.realPlotsHeightScale : 1.0;
    const usePhaseColor = (options.colorMode ?? state.realPlotsColorMode) === 'phase';
    const paletteLut = paletteLutFor(options.palette || state.realPlotsPalette || 'sunset');
    const heightFactor = (HALF_HEIGHT * heightScale) / CLAMP_LIMIT;
    const gridStep = SURFACE_SIZE / segments;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let finiteResultCount = 0;
    let vertex = 0;

    for (let j = 0; j <= segments; j += 1) {
        const yVal = yMin + j * yScale;
        for (let i = 0; i <= segments; i += 1) {
            const xVal = xMin + i * xScale;
            let zInRe;
            let zInIm;
            if (scalarInputs) {
                zInRe = evalScalarInput(inputUType, xVal, yVal);
                zInIm = evalScalarInput(inputVType, xVal, yVal);
            } else {
                inputU.write(xVal, yVal, u);
                inputV.write(xVal, yVal, v);
                zInRe = u[0] - v[1];
                zInIm = u[1] + v[0];
            }

            let rawValue = 0;
            let phase = 0.5;

            try {
                const result = transformFunc(zInRe, zInIm);
                if (result && isFiniteNumber(result.re) && isFiniteNumber(result.im)) {
                    finiteResultCount += 1;
                    if (outputMode === OUTPUT_COMPONENT.IMAG) {
                        rawValue = result.im;
                    } else if (outputMode === OUTPUT_COMPONENT.MAGNITUDE) {
                        rawValue = Math.hypot(result.re, result.im);
                    } else {
                        rawValue = result.re;
                    }
                    if (usePhaseColor) {
                        phase = (Math.atan2(result.im, result.re) + Math.PI) * INV_TWO_PI;
                    }
                }
            } catch (e) {
                rawValue = 0;
                phase = 0.5;
            }

            values[vertex] = rawValue;
            phases[vertex] = phase;
            if (rawValue < minZ) minZ = rawValue;
            if (rawValue > maxZ) maxZ = rawValue;
            vertex += 1;
        }
    }

    const spanZ = maxZ - minZ || 1.0;
    const inverseSpanZ = 1 / spanZ;
    for (let index = 0, offset = 0; index < vertexCount; index += 1, offset += 3) {
        const rawValue = values[index];
        positions[offset] = topology.gridX[index];
        positions[offset + 1] = softClampHeight(rawValue) * heightFactor;
        positions[offset + 2] = topology.gridZ[index];
        writePaletteColor(
            paletteLut,
            usePhaseColor ? phases[index] : (rawValue - minZ) * inverseSpanZ,
            colors,
            offset
        );
    }

    writeHeightfieldNormals(positions, normals, segments, gridStep);

    return {
        segments,
        vertexCount,
        positions,
        normals,
        colors,
        values,
        phases,
        minValue: minZ,
        maxValue: maxZ,
        finiteResultCount
    };
}

class RealPlots3DRenderer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(BACKGROUND, 0.04);

        this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        this.camera.position.set(CAMERA_HOME.x, CAMERA_HOME.y, CAMERA_HOME.z);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setClearColor(BACKGROUND);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.replaceChildren(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.zoomToCursor = true;
        this.controls.target.set(0, 0, 0);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 200;
        this.controls.update();
        this.controls.addEventListener('change', () => this.#syncMathCameraTarget());

        this.surfaceGroup = new THREE.Group();
        this.scene.add(this.surfaceGroup);
        this.surfaceStore = new SurfaceMeshStore();
        this.surfaceGroup.add(this.surfaceStore.mesh, this.surfaceStore.wireframe);

        this.zLabelText = '';
        this.coordBoundsKey = '';
        this.addReferenceFrame();
        this.renderer.domElement.addEventListener('dblclick', () => this.resetCamera());

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.animate = this.animate.bind(this);
        this.animateActive = true;
        requestAnimationFrame(this.animate);
    }

    #syncMathCameraTarget() {
        const target = this.controls.target;
        if (Math.abs(target.x) > 0.001 || Math.abs(target.z) > 0.001) {
            const xSpan = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
            const ySpan = zPlaneParams.currentVisYRange[1] - zPlaneParams.currentVisYRange[0];
            const mathOffsetX = (target.x / SURFACE_SIZE) * xSpan;
            const mathOffsetY = (target.z / SURFACE_SIZE) * ySpan;
            const zWorldCenterX = (zPlaneParams.currentVisXRange[0] + zPlaneParams.currentVisXRange[1]) * 0.5;
            const zWorldCenterY = (zPlaneParams.currentVisYRange[0] + zPlaneParams.currentVisYRange[1]) * 0.5;
            state.realPlotsCameraTargetMath = {
                x: zWorldCenterX + mathOffsetX,
                y: zWorldCenterY - mathOffsetY
            };
        } else {
            state.realPlotsCameraTargetMath = null;
        }
    }

    createCoordinateLabel(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        }));
        sprite.scale.set(2.0, 0.5, 1);

        return {
            sprite,
            canvas,
            context,
            texture,
            text: '',
            updateText(text) {
                if (text === this.text) return;
                this.text = text;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.font = '500 48px "STIX Two Math", serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = color;
                context.fillText(text, 256, 64);
                texture.needsUpdate = true;
            }
        };
    }

    addReferenceFrame() {
        const grid = new THREE.GridHelper(8, 16, 0x41436e, 0x22243d);
        grid.position.y = -HALF_HEIGHT - 0.01;
        this.scene.add(grid);

        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.25 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -HALF_HEIGHT - 0.02;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const xLabel = makeAxisLabel('x', 'rgba(216, 228, 255, 0.9)');
        xLabel.position.set(HALF_SURFACE + 0.4, -HALF_HEIGHT, 0);

        const yLabel = makeAxisLabel('y', 'rgba(216, 228, 255, 0.9)');
        yLabel.position.set(0, -HALF_HEIGHT, HALF_SURFACE + 0.4);

        this.zLabel = makeAxisLabel('z = Re(f)', 'rgba(216, 228, 255, 0.9)');
        this.zLabel.position.set(0, HALF_HEIGHT + 0.4, 0);
        this.zLabelText = 'z = Re(f)';
        this.scene.add(xLabel, yLabel, this.zLabel);

        this.coordLabels = {
            bottomLeft: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'),
            bottomRight: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'),
            topLeft: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'),
            topRight: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)')
        };

        const yLevel = -HALF_HEIGHT - 0.05;
        const offset = 0.5;
        this.coordLabels.bottomLeft.sprite.position.set(-HALF_SURFACE - offset, yLevel, -HALF_SURFACE - offset);
        this.coordLabels.bottomRight.sprite.position.set(HALF_SURFACE + offset, yLevel, -HALF_SURFACE - offset);
        this.coordLabels.topLeft.sprite.position.set(-HALF_SURFACE - offset, yLevel, HALF_SURFACE + offset);
        this.coordLabels.topRight.sprite.position.set(HALF_SURFACE + offset, yLevel, HALF_SURFACE + offset);
        this.scene.add(
            this.coordLabels.bottomLeft.sprite,
            this.coordLabels.bottomRight.sprite,
            this.coordLabels.topLeft.sprite,
            this.coordLabels.topRight.sprite
        );

        this.#addLights();
    }

    #addLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        this.scene.add(new THREE.HemisphereLight(0xa5b4fc, 0x090714, 1.4));

        const keyLight = new THREE.DirectionalLight(0xf4e8ff, 3.0);
        keyLight.position.set(6, 12, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 30;
        keyLight.shadow.camera.left = -6;
        keyLight.shadow.camera.right = 6;
        keyLight.shadow.camera.top = 6;
        keyLight.shadow.camera.bottom = -6;
        keyLight.shadow.bias = -0.0002;
        this.scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
        rimLight.position.set(-6, 4, -6);
        this.scene.add(rimLight);
    }

    resetCamera() {
        this.camera.position.set(CAMERA_HOME.x, CAMERA_HOME.y, CAMERA_HOME.z);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    animate() {
        if (!this.animateActive) return;
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    updateSurface(transformFunc) {
        if (state.realPlotsCameraNeedsReset) {
            this.camera.position.x -= this.controls.target.x;
            this.camera.position.z -= this.controls.target.z;
            this.controls.target.set(0, 0, 0);
            this.controls.update();
            state.realPlotsCameraNeedsReset = false;
        }

        this.#syncOutputLabel();
        this.#syncCoordinateLabels();
        this.#sampleSurface(transformFunc);
        this.surfaceStore.markDirty();
    }

    #syncOutputLabel() {
        const labelText = outputAxisLabel(state.realPlotsOutputComponent);
        if (labelText === this.zLabelText) return;
        this.scene.remove(this.zLabel);
        this.zLabel.material.map?.dispose?.();
        this.zLabel.material.dispose?.();
        this.zLabel = makeAxisLabel(labelText, 'rgba(216, 228, 255, 0.9)');
        this.zLabel.position.set(0, HALF_HEIGHT + 0.4, 0);
        this.zLabelText = labelText;
        this.scene.add(this.zLabel);
    }

    #syncCoordinateLabels() {
        const xMin = zPlaneParams.currentVisXRange[0];
        const xMax = zPlaneParams.currentVisXRange[1];
        const yMin = zPlaneParams.currentVisYRange[0];
        const yMax = zPlaneParams.currentVisYRange[1];
        const boundsKey = `${xMin}|${xMax}|${yMin}|${yMax}`;
        if (boundsKey === this.coordBoundsKey) return;
        this.coordBoundsKey = boundsKey;
        const fXMin = formatCoord(xMin);
        const fXMax = formatCoord(xMax);
        const fYMin = formatCoord(yMin);
        const fYMax = formatCoord(yMax);
        this.coordLabels.bottomLeft.updateText(`(${fXMin}, ${fYMin})`);
        this.coordLabels.bottomRight.updateText(`(${fXMax}, ${fYMin})`);
        this.coordLabels.topLeft.updateText(`(${fXMin}, ${fYMax})`);
        this.coordLabels.topRight.updateText(`(${fXMax}, ${fYMax})`);
    }

    #sampleSurface(transformFunc) {
        const store = this.surfaceStore;
        sampleRealPlotSurface(transformFunc, {
            topology: SURFACE_TOPOLOGY,
            positions: store.positions,
            normals: store.normals,
            colors: store.colors,
            values: store.values,
            phases: store.phases,
            u: store.u,
            v: store.v
        });
    }

    dispose() {
        this.animateActive = false;
        this.resizeObserver?.disconnect();
        this.controls.dispose();
        this.surfaceStore?.dispose();
        disposeObject(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}

export function drawRealPlot() {
    const container3d = document.getElementById('real_plots_3d_container');
    if (!active3DRenderer && container3d) {
        active3DRenderer = new RealPlots3DRenderer(container3d);
    }

    const transformFunc = getChainedTransformFunction(state.currentFunction);
    active3DRenderer?.updateSurface(transformFunc);
}

export function disposeRealPlotsRenderer() {
    if (active3DRenderer) {
        active3DRenderer.dispose();
        active3DRenderer = null;
    }
}
