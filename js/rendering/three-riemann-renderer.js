import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { state } from '../store/state.js';
import { requestRedrawAll } from '../main.js';
import { getChainedTransformFunction } from '../math-utils.js';
import {
    CHAIN_MODE_IDS,
    DOMAIN_PALETTE_IDS,
    getThreeSphereShaderConfig,
    isWebGLDomainColoringFunctionSupported
} from './webgl-domain-coloring.js';
import { getWebGLDomainColorFunctionIdShared } from './webgl-shared.js';

const COLOR_BACKGROUND = 0x0b0914;
const SPHERE_RADIUS = 5.0;

function getSphereCoordinate(u, v, radius = SPHERE_RADIUS) {
    const r2 = u * u + v * v;
    const R2 = radius * radius;
    const denom = r2 + 4 * R2 + 1e-10; 
    
    const x = (4 * R2 * u) / denom;
    const y = (2 * radius * r2) / denom;
    const z = (4 * R2 * v) / denom;
    
    return { x, y, z };
}

export class ThreeRiemannRenderer {
    constructor(containerElement, planeType = 'z') {
        this.container = containerElement;
        this.planeType = planeType;
        this.scale = 2 * SPHERE_RADIUS;
        this.isDragging = false;
        this.probePoint = null;
        this.animationHandle = null;
        this.transformFunction = null;
        this.chainCount = 1;

        this.initScene();
        this.initInteraction();
        this.container.__threeRiemannRenderer = this;
    }

    initScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(COLOR_BACKGROUND, 0.012);

        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(25, 20, 35);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(COLOR_BACKGROUND);
        
        // Clear old children if any
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, SPHERE_RADIUS * 0.5, 0);

        // Static Grid
        this.staticGrid = new THREE.GridHelper(60, 40, 0x222233, 0x1a1a25);
        this.staticGrid.position.y = -0.1;
        this.scene.add(this.staticGrid);

        this.ghostSphere = new THREE.Mesh(
            new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64).translate(0, SPHERE_RADIUS, 0),
            new THREE.MeshBasicMaterial({ 
                color: 0x2a254a, 
                transparent: true, 
                opacity: 0.0, 
                depthWrite: false, 
                blending: THREE.AdditiveBlending 
            })
        );
        this.scene.add(this.ghostSphere);

        // Intrinsic Sphere Latitude/Longitude Grid
        const gridDensity = state.gridDensity !== undefined ? state.gridDensity : 12;
        const widthSegments = Math.max(8, gridDensity * 2);
        const heightSegments = Math.max(8, gridDensity);
        
        const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, widthSegments, heightSegments).translate(0, SPHERE_RADIUS, 0);
        const wireframeGeo = new THREE.WireframeGeometry(sphereGeo);
        
        this.wireframeSphere = new THREE.LineSegments(
            wireframeGeo,
            new THREE.LineBasicMaterial({
                color: 0x8888aa,
                transparent: true,
                opacity: 0.15,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        this.wireframeSphere.userData = { widthSegments, heightSegments };
        this.scene.add(this.wireframeSphere);

        // North Pole indicator
        this.northPole = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        this.northPole.position.set(0, SPHERE_RADIUS * 2, 0);
        this.scene.add(this.northPole);

        // Groups
        this.linesGroup = new THREE.Group();
        this.scene.add(this.linesGroup);

        this.dynamicOverlayGroup = new THREE.Group();
        this.dynamicOverlayGroup.renderOrder = 20;
        this.scene.add(this.dynamicOverlayGroup);

        this.markersGroup = new THREE.Group();
        this.scene.add(this.markersGroup);

        // Interactive markers
        this.activeMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xf43f5e }) // Pink
        );
        this.sphereMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0x22d3ee }) // Cyan
        );

        const rayMaterial = new THREE.LineDashedMaterial({
            color: 0xfcd34d, dashSize: 0.5, gapSize: 0.3, linewidth: 2, transparent: true, opacity: 0.8
        });
        const rayGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, SPHERE_RADIUS * 2, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        this.projectionRay = new THREE.Line(rayGeo, rayMaterial);
        this.projectionRay.computeLineDistances();

        this.markersGroup.add(this.activeMarker);
        this.markersGroup.add(this.sphereMarker);
        this.markersGroup.add(this.projectionRay);
        this.markersGroup.visible = false;

        // Auto-resizing using ResizeObserver
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
    }

    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Invisible plane for raycasting
        const dragPlaneGeo = new THREE.PlaneGeometry(1000, 1000);
        dragPlaneGeo.rotateX(-Math.PI / 2);
        this.dragPlane = new THREE.Mesh(dragPlaneGeo, new THREE.MeshBasicMaterial({ visible: false }));
        this.scene.add(this.dragPlane);

        if (this.planeType === 'z') {
            this.renderer.domElement.addEventListener('pointerdown', (e) => {
                if (!state.probeActive) return;

                const rect = this.renderer.domElement.getBoundingClientRect();
                this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.dragPlane);
                if (intersects.length > 0) {
                    this.isDragging = true;
                    this.controls.enabled = false;
                    const u = intersects[0].point.x / this.scale;
                    const v = intersects[0].point.z / this.scale;
                    state.probeZ = { re: u, im: v };
                    requestRedrawAll();
                }
            });

            this.renderer.domElement.addEventListener('pointermove', (e) => {
                if (!this.isDragging || !state.probeActive) return;

                const rect = this.renderer.domElement.getBoundingClientRect();
                this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.dragPlane);
                if (intersects.length > 0) {
                    const u = intersects[0].point.x / this.scale;
                    const v = intersects[0].point.z / this.scale;
                    state.probeZ = { re: u, im: v };
                    requestRedrawAll();
                }
            });

            const onPointerUp = () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.controls.enabled = true;
                }
            };
            window.addEventListener('pointerup', onPointerUp);
            this.onPointerUpClean = onPointerUp;
        }
    }

    setTransform(transformFunction, chainCount = 1) {
        this.transformFunction = typeof transformFunction === 'function' ? transformFunction : null;
        this.chainCount = Math.max(1, Math.min(512, Math.floor(chainCount) || 1));
    }

    buildGridFromPointSets(pointSets, progressOverride = undefined) {
        this.resize();

        // Clear lines
        while(this.linesGroup.children.length > 0) {
            const child = this.linesGroup.children[0];
            child.geometry.dispose();
            child.material.dispose();
            this.linesGroup.remove(child);
        }

        // Constant mathematical scale factor where unit circle projects to equator
        this.scale = 2 * SPHERE_RADIUS;

        const transformFunc = this.planeType === 'w'
            ? (this.transformFunction || getChainedTransformFunction())
            : null;

        for (const pointSet of pointSets) {
            if (!pointSet || !pointSet.points || pointSet.points.length < 2) continue;
            
            const pts = pointSet.points;
            const count = pts.length;

            let colorHex = 0xa78bfa;
            if (pointSet.color) {
                try {
                    colorHex = new THREE.Color(pointSet.color);
                } catch(e) {}
            }

            const material = new THREE.LineBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const startPositions = new Float32Array(count * 3);
            const targetPositions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const pt = pts[i];
                const mappedPt = transformFunc && pt && Number.isFinite(pt.re) && Number.isFinite(pt.im) 
                    ? transformFunc(pt.re, pt.im) 
                    : pt;

                let u = NaN;
                let v = NaN;
                let tx = NaN;
                let ty = NaN;
                let tz = NaN;

                if (mappedPt && Number.isFinite(mappedPt.re) && Number.isFinite(mappedPt.im)) {
                    u = mappedPt.re * this.scale;
                    v = mappedPt.im * this.scale;
                    const target = getSphereCoordinate(u, v, SPHERE_RADIUS);
                    tx = target.x;
                    ty = target.y;
                    tz = target.z;
                }

                startPositions[i * 3] = Number.isFinite(u) ? u : NaN;
                startPositions[i * 3 + 1] = 0;
                startPositions[i * 3 + 2] = Number.isFinite(v) ? v : NaN;

                targetPositions[i * 3] = Number.isFinite(tx) ? tx : NaN;
                targetPositions[i * 3 + 1] = Number.isFinite(ty) ? ty : NaN;
                targetPositions[i * 3 + 2] = Number.isFinite(tz) ? tz : NaN;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.userData = { start: startPositions, target: targetPositions };
            
            const line = new THREE.Line(geometry, material);
            this.linesGroup.add(line);
        }

        // Apply geometry snapping
        const progress = progressOverride !== undefined 
            ? progressOverride 
            : (this.planeType === 'z' ? state.riemannTransformationProgressZ : state.riemannTransformationProgressW);
        this.updateGeometry(progress);
        this.render();
    }

    clearDynamicOverlay() {
        if (!this.dynamicOverlayGroup) return;

        while (this.dynamicOverlayGroup.children.length > 0) {
            const child = this.dynamicOverlayGroup.children[0];
            this.dynamicOverlayGroup.remove(child);
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material?.dispose();
            }
        }
    }

    setDynamicOverlay(data, cacheKey = null) {
        if (cacheKey !== null && this.dynamicOverlayCacheKey === cacheKey) return;
        this.clearDynamicOverlay();
        this.dynamicOverlayCacheKey = cacheKey;
        if (!data) return;

        const spherePositions = values => {
            const positions = [];
            for (const value of values || []) {
                if (!Number.isFinite(value?.re) || !Number.isFinite(value?.im)) continue;
                const projected = getSphereCoordinate(
                    value.re * this.scale,
                    value.im * this.scale,
                    SPHERE_RADIUS
                );
                positions.push(projected.x, projected.y, projected.z);
            }
            return positions;
        };

        const pointPositions = spherePositions(data.points);
        if (pointPositions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(pointPositions, 3)
            );
            const material = new THREE.PointsMaterial({
                color: 0xd8dee9,
                size: Math.max(0.1, Math.min(0.28, Number(data.pointSize) * 0.038)),
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.86,
                depthWrite: false
            });
            this.dynamicOverlayGroup.add(new THREE.Points(geometry, material));
        }

        const pathPositions = spherePositions(data.path);
        if (pathPositions.length >= 6) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(pathPositions, 3)
            );
            const material = new THREE.LineBasicMaterial({
                color: 0xa78bfa,
                transparent: true,
                opacity: 0.56,
                depthWrite: false
            });
            this.dynamicOverlayGroup.add(new THREE.Line(geometry, material));
        }

        const finalPositions = spherePositions(data.finalPoint ? [data.finalPoint] : []);
        if (finalPositions.length === 3) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(finalPositions, 3)
            );
            const material = new THREE.PointsMaterial({
                color: 0x5fc7a0,
                size: 0.3,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.96,
                depthWrite: false
            });
            this.dynamicOverlayGroup.add(new THREE.Points(geometry, material));
        }
    }

    updateProbe(probePoint) {
        if (!probePoint || !Number.isFinite(probePoint.re) || !Number.isFinite(probePoint.im)) {
            this.markersGroup.visible = false;
            this.probePoint = null;
            return;
        }

        this.markersGroup.visible = true;
        this.probePoint = probePoint;
        this.updateProbeGeometry();
    }

    updateProbeGeometry() {
        if (!this.probePoint) return;
        
        const u = this.probePoint.re * this.scale;
        const v = this.probePoint.im * this.scale;

        const flatPos = new THREE.Vector3(u, 0, v);
        const sphereTarget = getSphereCoordinate(u, v, SPHERE_RADIUS);
        const spherePos = new THREE.Vector3(sphereTarget.x, sphereTarget.y, sphereTarget.z);

        const progress = this.planeType === 'z' ? state.riemannTransformationProgressZ : state.riemannTransformationProgressW;
        const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;

        this.activeMarker.position.lerpVectors(flatPos, spherePos, easedProgress);
        this.sphereMarker.position.copy(spherePos);

        const positions = this.projectionRay.geometry.attributes.position.array;
        positions[0] = 0; positions[1] = SPHERE_RADIUS * 2; positions[2] = 0;
        positions[3] = u; positions[4] = 0; positions[5] = v;
        
        this.projectionRay.geometry.attributes.position.needsUpdate = true;
        this.projectionRay.computeLineDistances();
    }

    updateGeometry(progress) {
        const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;

        this.linesGroup.children.forEach(line => {
            const positions = line.geometry.attributes.position.array;
            const start = line.geometry.userData.start;
            const target = line.geometry.userData.target;

            for (let i = 0; i < positions.length; i++) {
                positions[i] = start[i] + (target[i] - start[i]) * easedProgress;
            }
            line.geometry.attributes.position.needsUpdate = true;
        });

        this.updateSphereMaterial();

        if (this.isDomainColoringActive()) {
            if (this.ghostSphere.material) {
                this.ghostSphere.material.opacity = Math.pow(easedProgress, 2);
            }
        } else {
            if (this.ghostSphere.material) {
                const maxOpacity = state.threeSphereOpacity !== undefined ? state.threeSphereOpacity : 0.15;
                this.ghostSphere.material.opacity = Math.pow(easedProgress, 2) * maxOpacity;
            }
        }

        if (this.wireframeSphere) {
            this.wireframeSphere.visible = true;
            const density = state.gridDensity !== undefined ? state.gridDensity : 12;
            const widthSegments = Math.max(8, density * 2);
            const heightSegments = Math.max(8, density);
            
            if (this.wireframeSphere.userData.widthSegments !== widthSegments || 
                this.wireframeSphere.userData.heightSegments !== heightSegments) {
                
                this.wireframeSphere.geometry.dispose();
                
                const newSphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, widthSegments, heightSegments).translate(0, SPHERE_RADIUS, 0);
                this.wireframeSphere.geometry = new THREE.WireframeGeometry(newSphereGeo);
                
                this.wireframeSphere.userData = { widthSegments, heightSegments };
            }

            const gridOpacity = state.sphereGridOpacity !== undefined ? state.sphereGridOpacity : 0.0;
            this.wireframeSphere.material.opacity = Math.pow(easedProgress, 2) * gridOpacity;
        }

        this.updateProbeGeometry();
    }

    isDomainColoringActive() {
        return state.domainColoringEnabled &&
            isWebGLDomainColoringFunctionSupported(
                state.currentFunction,
                this.planeType === 'w'
            );
    }

    updateSphereMaterial() {
        if (!this.ghostSphere) return;

        const showDomainColoring = this.isDomainColoringActive();

        if (showDomainColoring) {
            if (!(this.ghostSphere.material instanceof THREE.ShaderMaterial)) {
                if (this.ghostSphere.material) this.ghostSphere.material.dispose();
                const shaderConfig = getThreeSphereShaderConfig(this.planeType);
                const uniforms = {
                    u_domainBrightness: { value: 1.0 },
                    u_domainContrast: { value: 1.0 },
                    u_domainSaturation: { value: 1.0 },
                    u_domainLightnessCycles: { value: 0.0 },
                    u_domainPalette: { value: 0 },
                    u_isWPlaneColoring: { value: this.planeType === 'w' ? 1.0 : 0.0 },
                    u_functionId: { value: 0.0 },
                    u_mobiusA: { value: new THREE.Vector2(1.0, 0.0) },
                    u_mobiusB: { value: new THREE.Vector2(0.0, 0.0) },
                    u_mobiusC: { value: new THREE.Vector2(0.0, 0.0) },
                    u_mobiusD: { value: new THREE.Vector2(1.0, 0.0) },
                    u_polyDegree: { value: 0 },
                    u_polyCoeffs: { value: Array.from({ length: 11 }, () => new THREE.Vector2(0.0, 0.0)) },
                    u_zetaContinuationEnabled: { value: 0.0 },
                    u_zetaReflectionBoundary: { value: 0.5 },
                    u_fracPower: { value: 0.5 },
                    u_chainCount: { value: 1 },
                    u_chainMode: { value: 1 },
                    u_derivativeMode: { value: 0.0 },
                    u_useOrbitColoring: { value: 0.0 }
                };
                this.ghostSphere.material = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: shaderConfig.vertexShader,
                    fragmentShader: shaderConfig.fragmentShader,
                    depthWrite: true,
                    transparent: true
                });
            }
            this.updateShaderUniforms();
        } else {
            if (this.ghostSphere.material instanceof THREE.ShaderMaterial) {
                this.ghostSphere.material.dispose();
                this.ghostSphere.material = null;
            }
            if (!this.ghostSphere.material || this.ghostSphere.material.type !== 'MeshBasicMaterial') {
                this.ghostSphere.material = new THREE.MeshBasicMaterial({ 
                    color: 0x2a254a, 
                    transparent: true, 
                    depthWrite: false, 
                    blending: THREE.AdditiveBlending 
                });
            }
        }
    }

    updateShaderUniforms() {
        if (!this.ghostSphere || !(this.ghostSphere.material instanceof THREE.ShaderMaterial)) return;
        const uniforms = this.ghostSphere.material.uniforms;

        uniforms.u_domainBrightness.value = state.domainBrightness !== undefined ? state.domainBrightness : 1.0;
        uniforms.u_domainContrast.value = state.domainContrast !== undefined ? state.domainContrast : 1.0;
        uniforms.u_domainSaturation.value = state.domainSaturation !== undefined ? state.domainSaturation : 1.0;
        uniforms.u_domainLightnessCycles.value = state.domainLightnessCycles !== undefined ? state.domainLightnessCycles : 0.0;
        
        const paletteVal = DOMAIN_PALETTE_IDS[state.domainPalette];
        uniforms.u_domainPalette.value = paletteVal !== undefined ? paletteVal : 0;

        uniforms.u_isWPlaneColoring.value = this.planeType === 'w' ? 1.0 : 0.0;
        uniforms.u_functionId.value = getWebGLDomainColorFunctionIdShared(state.currentFunction);

        const a = state.mobiusA || {re: 1, im: 0}, b = state.mobiusB || {re: 0, im: 0};
        const c = state.mobiusC || {re: 0, im: 0}, d = state.mobiusD || {re: 1, im: 0};
        uniforms.u_mobiusA.value.set(a.re !== undefined ? a.re : 1.0, a.im !== undefined ? a.im : 0.0);
        uniforms.u_mobiusB.value.set(b.re !== undefined ? b.re : 0.0, b.im !== undefined ? b.im : 0.0);
        uniforms.u_mobiusC.value.set(c.re !== undefined ? c.re : 0.0, c.im !== undefined ? c.im : 0.0);
        uniforms.u_mobiusD.value.set(d.re !== undefined ? d.re : 1.0, d.im !== undefined ? d.im : 0.0);

        uniforms.u_polyDegree.value = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
        if (state.polynomialCoeffs) {
            for (let i = 0; i <= 10; i++) {
                const co = state.polynomialCoeffs[i];
                if (co) {
                    uniforms.u_polyCoeffs.value[i].set(co.re !== undefined ? co.re : 0.0, co.im !== undefined ? co.im : 0.0);
                } else {
                    uniforms.u_polyCoeffs.value[i].set(0.0, 0.0);
                }
            }
        } else {
            for (let i = 0; i <= 10; i++) {
                uniforms.u_polyCoeffs.value[i].set(0.0, 0.0);
            }
        }

        uniforms.u_zetaContinuationEnabled.value = state.zetaContinuationEnabled ? 1.0 : 0.0;
        uniforms.u_zetaReflectionBoundary.value = 0.5;
        uniforms.u_fracPower.value = state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5;
        uniforms.u_chainCount.value = state.chainingEnabled
            ? (this.planeType === 'w' ? this.chainCount : Math.max(1, Math.min(512, state.chainCount || 1)))
            : 1;
        
        const chainModeVal = CHAIN_MODE_IDS[state.chainingMode];
        uniforms.u_chainMode.value = chainModeVal !== undefined ? chainModeVal : 1;
        uniforms.u_derivativeMode.value = state.mapPresentation === 'derivative' ? 1.0 : 0.0;
        uniforms.u_useOrbitColoring.value = state.fractalOrbitColoringEnabled ? 1.0 : 0.0;
    }

    startAnimationLoop() {
        if (this.animationHandle) return;
        const animate = () => {
            this.render();
            this.animationHandle = requestAnimationFrame(animate);
        };
        this.animationHandle = requestAnimationFrame(animate);
    }

    stopAnimationLoop() {
        if (this.animationHandle) {
            cancelAnimationFrame(this.animationHandle);
            this.animationHandle = null;
        }
    }

    resize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.updateSphereMaterial();

        if (this.isDomainColoringActive()) {
            if (this.ghostSphere.material) {
                this.ghostSphere.material.opacity = 1.0;
            }
        } else {
            if (this.ghostSphere.material) {
                const maxOpacity = state.threeSphereOpacity !== undefined ? state.threeSphereOpacity : 0.15;
                this.ghostSphere.material.opacity = maxOpacity;
            }
        }

        if (this.wireframeSphere) {
            this.wireframeSphere.visible = true;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.stopAnimationLoop();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.onPointerUpClean) {
            window.removeEventListener('pointerup', this.onPointerUpClean);
        }
        if (this.controls) {
            this.controls.dispose();
        }
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.container?.__threeRiemannRenderer === this) {
            delete this.container.__threeRiemannRenderer;
        }
    }
}
