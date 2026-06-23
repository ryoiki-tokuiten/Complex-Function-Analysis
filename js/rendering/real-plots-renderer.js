import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { state, zPlaneParams } from '../store/state.js';
import { getChainedTransformFunction } from '../math-utils.js';
import { compileExpression } from '../math/expression/evaluator.js';
import { updatePlaneViewportRanges } from '../utils/canvas-utils.js';
import { setupVisualParameters } from '../utils/dom-utils.js';
import { requestRedrawAll } from '../main.js';

const BACKGROUND = 0x0b0914;
const CAMERA_HOME = Object.freeze({ x: 6.0, y: 5.0, z: 8.0 });
const SURFACE_SIZE = 6.0;
const SURFACE_HEIGHT = 3.5;

let active3DRenderer = null;

function disposeObject(object) {
    if (!object) return;
    object.traverse(child => {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
        else child.material?.dispose();
    });
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

const compiledPresetCache = new Map();

function getCompiledPreset(preset) {
    if (!compiledPresetCache.has(preset)) {
        try {
            const compiled = compileExpression(preset, { allowedVariables: ['x', 'y'] });
            compiledPresetCache.set(preset, compiled);
        } catch (e) {
            compiledPresetCache.set(preset, null);
        }
    }
    return compiledPresetCache.get(preset);
}

function evaluateInputPreset(preset, x, y) {
    switch (preset) {
        case 'y':
            return { re: y, im: 0 };
        case '0':
            return { re: 0, im: 0 };
        case 'x+y':
            return { re: x + y, im: 0 };
        case 'x-y':
            return { re: x - y, im: 0 };
        case 'x*y':
            return { re: x * y, im: 0 };
        case '2x+y':
            return { re: 2 * x + y, im: 0 };
        case 'x':
            return { re: x, im: 0 };
        default: {
            const compiled = getCompiledPreset(preset);
            if (compiled) {
                try {
                    const result = compiled({
                        x: { re: x, im: 0 },
                        y: { re: y, im: 0 }
                    });
                    if (result !== null && result !== undefined) {
                        if (typeof result === 'number') {
                            return { re: result, im: 0 };
                        }
                        if (typeof result === 'object' && 're' in result) {
                            return { re: result.re, im: result.im || 0 };
                        }
                    }
                } catch (e) {
                    return { re: 0, im: 0 };
                }
            }
            return { re: x, im: 0 };
        }
    }
}

class RealPlots3DRenderer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(BACKGROUND, 0.04);
        
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        this.camera.position.set(CAMERA_HOME.x, CAMERA_HOME.y, CAMERA_HOME.z);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
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

        // Using standard professional 3D viewport controls.
        // Physical camera flying is decoupled from mathematical axis zooming.
        // We track the physical camera target to allow smart UI-slider math centering.
        this.controls.addEventListener('change', () => {
            const target = this.controls.target;
            if (Math.abs(target.x) > 0.001 || Math.abs(target.z) > 0.001) {
                const xSpan = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
                const ySpan = zPlaneParams.currentVisYRange[1] - zPlaneParams.currentVisYRange[0];
                const mathOffsetX = (target.x / SURFACE_SIZE) * xSpan;
                const mathOffsetY = (target.z / SURFACE_SIZE) * ySpan;
                const zWorldCenterX = (zPlaneParams.currentVisXRange[0] + zPlaneParams.currentVisXRange[1]) / 2;
                const zWorldCenterY = (zPlaneParams.currentVisYRange[0] + zPlaneParams.currentVisYRange[1]) / 2;
                state.realPlotsCameraTargetMath = {
                    x: zWorldCenterX + mathOffsetX,
                    y: zWorldCenterY - mathOffsetY
                };
            } else {
                state.realPlotsCameraTargetMath = null;
            }
        });

        this.surfaceGroup = new THREE.Group();
        this.scene.add(this.surfaceGroup);

        // Lighting
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

        this.addReferenceFrame();
        this.renderer.domElement.addEventListener('dblclick', () => this.resetCamera());
        
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
        
        this.animate = this.animate.bind(this);
        this.animateActive = true;
        requestAnimationFrame(this.animate);
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
        // Scale physically to match 4:1 aspect ratio of the 512x128 texture
        sprite.scale.set(2.0, 0.5, 1);
        
        return {
            sprite,
            canvas,
            context,
            texture,
            updateText(text) {
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
        // Grid helper at floor
        const grid = new THREE.GridHelper(8, 16, 0x41436e, 0x22243d);
        grid.position.y = -SURFACE_HEIGHT * 0.5 - 0.01;
        this.scene.add(grid);

        // Subtle floor to receive shadows
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.25 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -SURFACE_HEIGHT * 0.5 - 0.02;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Axes labels
        const xLabel = makeAxisLabel('x', 'rgba(216, 228, 255, 0.9)');
        xLabel.position.set(SURFACE_SIZE * 0.5 + 0.4, -SURFACE_HEIGHT * 0.5, 0);
        
        const yLabel = makeAxisLabel('y', 'rgba(216, 228, 255, 0.9)');
        yLabel.position.set(0, -SURFACE_HEIGHT * 0.5, SURFACE_SIZE * 0.5 + 0.4);
        
        this.zLabel = makeAxisLabel('z = Re(f)', 'rgba(216, 228, 255, 0.9)');
        this.zLabel.position.set(0, SURFACE_HEIGHT * 0.5 + 0.4, 0);

        this.scene.add(xLabel, yLabel, this.zLabel);

        // Dynamic coordinate bounds labels for the 4 corners of the surface
        this.coordLabels = {
            bottomLeft: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'),  // (xMin, yMin)
            bottomRight: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'), // (xMax, yMin)
            topLeft: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)'),     // (xMin, yMax)
            topRight: this.createCoordinateLabel('rgba(216, 228, 255, 0.6)')     // (xMax, yMax)
        };

        const yLevel = -SURFACE_HEIGHT * 0.5 - 0.05;
        const offset = 0.5; // push them slightly outside the grid corners
        
        // Mathematical Y corresponds to negative Z in Three.js when viewed from above
        this.coordLabels.bottomLeft.sprite.position.set(-SURFACE_SIZE * 0.5 - offset, yLevel, -SURFACE_SIZE * 0.5 - offset);
        this.coordLabels.bottomRight.sprite.position.set(SURFACE_SIZE * 0.5 + offset, yLevel, -SURFACE_SIZE * 0.5 - offset);
        this.coordLabels.topLeft.sprite.position.set(-SURFACE_SIZE * 0.5 - offset, yLevel, SURFACE_SIZE * 0.5 + offset);
        this.coordLabels.topRight.sprite.position.set(SURFACE_SIZE * 0.5 + offset, yLevel, SURFACE_SIZE * 0.5 + offset);

        this.scene.add(
            this.coordLabels.bottomLeft.sprite,
            this.coordLabels.bottomRight.sprite,
            this.coordLabels.topLeft.sprite,
            this.coordLabels.topRight.sprite
        );
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
            // The math bounds were just recentered on the user's focal point.
            // Teleport the physical camera to keep looking at that focal point!
            this.camera.position.x -= this.controls.target.x;
            this.camera.position.z -= this.controls.target.z;
            this.controls.target.set(0, 0, 0);
            this.controls.update();
            state.realPlotsCameraNeedsReset = false;
        }

        // Update Z axis label sprite dynamically
        if (this.zLabel) {
            this.scene.remove(this.zLabel);
            this.zLabel.material.map?.dispose();
            this.zLabel.material.dispose();

            let labelText = 'z = Re(f)';
            if (state.realPlotsOutputComponent === 'imag') labelText = 'z = Im(f)';
            else if (state.realPlotsOutputComponent === 'magnitude') labelText = 'z = |f|';

            this.zLabel = makeAxisLabel(labelText, 'rgba(216, 228, 255, 0.9)');
            this.zLabel.position.set(0, SURFACE_HEIGHT * 0.5 + 0.4, 0);
            this.scene.add(this.zLabel);
        }

        // Clear previous surface
        while (this.surfaceGroup.children.length > 0) {
            const child = this.surfaceGroup.children[0];
            this.surfaceGroup.remove(child);
            disposeObject(child);
        }

        const segments = 150;
        const vertexCount = (segments + 1) * (segments + 1);
        const positions = new Float32Array(vertexCount * 3);
        const colors = new Float32Array(vertexCount * 3);

        const xMin = zPlaneParams.currentVisXRange[0];
        const xMax = zPlaneParams.currentVisXRange[1];
        const yMin = zPlaneParams.currentVisYRange[0];
        const yMax = zPlaneParams.currentVisYRange[1];

        if (this.coordLabels) {
            const formatCoord = (val) => {
                if (Math.abs(val) < 1e-10) return '0';
                if (Math.abs(val) >= 1000 || Math.abs(val) < 0.01) return val.toExponential(2);
                const str = val.toFixed(2);
                return str.endsWith('.00') ? str.slice(0, -3) : str;
            };
            const fXMin = formatCoord(xMin);
            const fXMax = formatCoord(xMax);
            const fYMin = formatCoord(yMin);
            const fYMax = formatCoord(yMax);
            
            this.coordLabels.bottomLeft.updateText(`(${fXMin}, ${fYMin})`);
            this.coordLabels.bottomRight.updateText(`(${fXMax}, ${fYMin})`);
            this.coordLabels.topLeft.updateText(`(${fXMin}, ${fYMax})`);
            this.coordLabels.topRight.updateText(`(${fXMax}, ${fYMax})`);
        }

        let minZ = Infinity;
        let maxZ = -Infinity;

        // First pass to evaluate heights
        const heights = [];
        for (let j = 0; j <= segments; j++) {
            const yRatio = j / segments;
            const yVal = yMin + yRatio * (yMax - yMin);
            const zCoord = (yRatio - 0.5) * SURFACE_SIZE; // Z in Three.js corresponds to Y domain

            for (let i = 0; i <= segments; i++) {
                const xRatio = i / segments;
                const xVal = xMin + xRatio * (xMax - xMin);
                const xCoord = (xRatio - 0.5) * SURFACE_SIZE;

                const uVal = evaluateInputPreset(state.realPlotsInputExpr, xVal, yVal);
                const vVal = evaluateInputPreset(state.realPlotsImagExpr, xVal, yVal);

                // z_in = uVal + i * vVal
                // uVal = u_re + i * u_im
                // vVal = v_re + i * v_im
                // z_in = (u_re - v_im) + i * (u_im + v_re)
                const zInRe = uVal.re - vVal.im;
                const zInIm = uVal.im + vVal.re;

                let zVal = 0;
                let phaseRatio = 0.5;
                try {
                    const result = transformFunc(zInRe, zInIm);
                    if (result && typeof result.re === 'number' && Number.isFinite(result.re) && typeof result.im === 'number' && Number.isFinite(result.im)) {
                        if (state.realPlotsOutputComponent === 'imag') {
                            zVal = result.im;
                        } else if (state.realPlotsOutputComponent === 'magnitude') {
                            zVal = Math.hypot(result.re, result.im);
                        } else {
                            zVal = result.re;
                        }
                        const angle = Math.atan2(result.im, result.re);
                        phaseRatio = (angle + Math.PI) / (2 * Math.PI);
                    }
                } catch (e) {
                    zVal = 0;
                    phaseRatio = 0.5;
                }

                if (zVal < minZ) minZ = zVal;
                if (zVal > maxZ) maxZ = zVal;

                heights.push({ xCoord, zCoord, zVal, phaseRatio });
            }
        }

        // Clamp & normalize heights for displaying
        const spanZ = maxZ - minZ || 1.0;
        const clampLimit = 8.0;
        
        heights.forEach((h, index) => {
            // Apply soft sigmoid clamping to large values so poles don't stretch to infinity
            let displayHeight = h.zVal;
            if (Math.abs(displayHeight) > clampLimit) {
                displayHeight = Math.sign(displayHeight) * (clampLimit + Math.tanh(Math.abs(displayHeight) - clampLimit));
            }
            
            // Map to SURFACE_HEIGHT range and apply height scale
            const heightScale = state.realPlotsHeightScale !== undefined ? state.realPlotsHeightScale : 1.0;
            const mappedHeight = (displayHeight / clampLimit) * (SURFACE_HEIGHT * 0.5) * heightScale;

            positions[index * 3] = h.xCoord;
            positions[index * 3 + 1] = mappedHeight;
            positions[index * 3 + 2] = h.zCoord;

            // Gradient coloring based on chosen palette and mapping mode
            let colorRatio = 0;
            if (state.realPlotsColorMode === 'phase') {
                colorRatio = h.phaseRatio;
            } else {
                colorRatio = Math.max(0, Math.min(1, (h.zVal - minZ) / spanZ));
            }
            const color = getPaletteColor(state.realPlotsPalette || 'sunset', colorRatio);

            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;
        });

        // Generate indices
        const indices = [];
        for (let j = 0; j < segments; j++) {
            for (let i = 0; i < segments; i++) {
                const a = j * (segments + 1) + i;
                const b = a + 1;
                const c = (j + 1) * (segments + 1) + i;
                const d = c + 1;
                indices.push(a, c, b, b, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.15,
            metalness: 0.1,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            transmission: 0.3,
            ior: 1.5,
            thickness: 0.8,
            specularIntensity: 0.8,
            transparent: true,
            opacity: 0.95
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.surfaceGroup.add(mesh);

        // Subtle wireframe overlay
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0xd8e7ff, transparent: true, opacity: 0.05, depthWrite: false })
        );
        wireframe.renderOrder = 2;
        this.surfaceGroup.add(wireframe);
    }

    dispose() {
        this.animateActive = false;
        this.resizeObserver?.disconnect();
        this.controls.dispose();
        disposeObject(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}

// Main Draw Export
export function drawRealPlot() {
    const container3d = document.getElementById('real_plots_3d_container');
    if (!active3DRenderer && container3d) {
        active3DRenderer = new RealPlots3DRenderer(container3d);
    }

    // Resolve transform pipeline function
    const transformFunc = getChainedTransformFunction(state.currentFunction);
    active3DRenderer?.updateSurface(transformFunc);
}

export function disposeRealPlotsRenderer() {
    if (active3DRenderer) {
        active3DRenderer.dispose();
        active3DRenderer = null;
    }
}

function getPaletteColor(palette, ratio) {
    switch (palette) {
        case 'ocean':
            // Teal -> Turquoise -> Seafoam
            return interpolateGradient(ratio, [0x004d40, 0x00acc1, 0x80cbc4]);
        case 'cyberpunk':
            // Neon Violet -> Fuchsia -> Cyan
            return interpolateGradient(ratio, [0x4a148c, 0xd81b60, 0x00e5ff]);
        case 'copper':
            // Bronze -> Copper -> Pearl
            return interpolateGradient(ratio, [0x3e2723, 0xd84315, 0xffe0b2]);
        case 'forest':
            // Forest Green -> Mint -> Soft Pearl -> Soft Gold
            return interpolateGradient(ratio, [0x0e3a14, 0x2e7d32, 0xa5d6a7, 0xfff9c4]);
        case 'viridis':
            // Dark Purple -> Blue -> Green -> Yellow
            return interpolateGradient(ratio, [0x440154, 0x3b528b, 0x21908d, 0x5dc963, 0xfde725]);
        case 'sunset':
        default:
            // Deep Violet -> ruby Red -> Coral -> Gold
            return interpolateGradient(ratio, [0x1a0b36, 0x880e4f, 0xff5722, 0xffeb3b]);
    }
}

function interpolateGradient(ratio, hexColors) {
    const color = new THREE.Color();
    if (hexColors.length === 1) return color.setHex(hexColors[0]);
    const segment = 1 / (hexColors.length - 1);
    const index = Math.min(Math.floor(ratio / segment), hexColors.length - 2);
    const localRatio = (ratio - index * segment) / segment;
    const c1 = new THREE.Color(hexColors[index]);
    const c2 = new THREE.Color(hexColors[index + 1]);
    return color.lerpColors(c1, c2, localRatio);
}
