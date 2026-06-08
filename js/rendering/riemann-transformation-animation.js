import { state, zPlaneParams } from '../store/state.js';
import { requestRedrawAll } from '../main.js';
import { ThreeRiemannRenderer } from './three-riemann-renderer.js';
import { generateCurrentInputShapePointSets, generateCurrentMappedInputShapePointSets } from './shape-generators.js';
import { getMappedTransformProfile } from '../math-utils.js';

let zRenderer = null;
let wRenderer = null;
let animationHandle = null;
let lastFrameTime = 0;

let directionZ = 1;
let directionW = 1;
let pauseTimerZ = 0;
let pauseTimerW = 0;

const ANIMATION_DURATION = 4.0; // 4 seconds

export function initThreeJSRenderers() {
    if (!zRenderer) {
        const zContainer = document.getElementById('z_plane_threejs_container');
        if (zContainer) zRenderer = new ThreeRiemannRenderer(zContainer, 'z');
    }
    if (!wRenderer) {
        const wContainer = document.getElementById('w_plane_threejs_container');
        if (wContainer) wRenderer = new ThreeRiemannRenderer(wContainer, 'w');
    }
}

export function buildThreeJSMeshes() {
    if (!zRenderer && !wRenderer) return;

    // Build Z Plane Grids
    if (zRenderer) {
        const zPointSets = generateCurrentInputShapePointSets(zPlaneParams, {
            currentFunction: state.currentFunction,
            zetaContinuationEnabled: state.zetaContinuationEnabled,
            curvePoints: 250 // Match LINE_RESOLUTION from reference HTML
        });
        zRenderer.buildGridFromPointSets(zPointSets);
    }

    // Build W Plane Grids
    if (wRenderer) {
        const wPointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
            currentFunction: state.currentFunction,
            zetaContinuationEnabled: state.zetaContinuationEnabled,
            curvePoints: 250
        });
        wRenderer.buildGridFromPointSets(wPointSets);
    }
}

function updateProbePositions() {
    if (state.probeActive && state.probeZ) {
        if (zRenderer) zRenderer.updateProbe(state.probeZ);
        if (wRenderer) {
            const tfProfile = getMappedTransformProfile(state.currentFunction);
            const wProbe = tfProfile.evaluate(state.probeZ.re, state.probeZ.im);
            wRenderer.updateProbe(wProbe);
        }
    } else {
        if (zRenderer) zRenderer.updateProbe(null);
        if (wRenderer) wRenderer.updateProbe(null);
    }
}

export function startRiemannTransformationAnimation() {
    if (animationHandle) return;
    lastFrameTime = performance.now();

    function animateFrame(timestamp) {
        if (!state.riemannTransformationEnabled) {
            animationHandle = null;
            return;
        }

        if (!state.riemannTransformationPlayingZ && !state.riemannTransformationPlayingW) {
            // Keep rendering to allow orbit controls if paused
            if (zRenderer) zRenderer.render();
            if (wRenderer) wRenderer.render();
            lastFrameTime = timestamp; // Prevent time jump on resume
            animationHandle = requestAnimationFrame(animateFrame);
            return;
        }

        const deltaTime = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;
        const deltaProgress = deltaTime / ANIMATION_DURATION;

        // Process Z Plane
        if (state.riemannTransformationPlayingZ) {
            if (pauseTimerZ > 0) {
                pauseTimerZ -= deltaTime;
            } else {
                let nextZ = state.riemannTransformationProgressZ + directionZ * deltaProgress;
                if (nextZ >= 1.0) { nextZ = 1.0; directionZ = -1; pauseTimerZ = 1.5; }
                else if (nextZ <= 0.0) { nextZ = 0.0; directionZ = 1; pauseTimerZ = 1.5; }
                state.riemannTransformationProgressZ = nextZ;
                syncRiemannSliders();
            }
        }

        // Process W Plane
        if (state.riemannTransformationPlayingW) {
            if (pauseTimerW > 0) {
                pauseTimerW -= deltaTime;
            } else {
                let nextW = state.riemannTransformationProgressW + directionW * deltaProgress;
                if (nextW >= 1.0) { nextW = 1.0; directionW = -1; pauseTimerW = 1.5; }
                else if (nextW <= 0.0) { nextW = 0.0; directionW = 1; pauseTimerW = 1.5; }
                state.riemannTransformationProgressW = nextW;
                syncRiemannSliders();
            }
        }

        if (zRenderer) {
            zRenderer.updateGeometry(state.riemannTransformationProgressZ);
            updateProbePositions();
            zRenderer.render();
        }
        if (wRenderer) {
            wRenderer.updateGeometry(state.riemannTransformationProgressW);
            wRenderer.render();
        }

        animationHandle = requestAnimationFrame(animateFrame);
    }
    animationHandle = requestAnimationFrame(animateFrame);
}

export function stopRiemannTransformationAnimation() {
    state.riemannTransformationPlayingZ = false;
    state.riemannTransformationPlayingW = false;
    syncRiemannTransformationPlayPauseButton();
}

export function toggleRiemannTransformationAnimationZ() {
    state.riemannTransformationPlayingZ = !state.riemannTransformationPlayingZ;
    syncRiemannTransformationPlayPauseButton();
    if (state.riemannTransformationPlayingZ || state.riemannTransformationPlayingW) {
        startRiemannTransformationAnimation();
    }
}

export function toggleRiemannTransformationAnimationW() {
    state.riemannTransformationPlayingW = !state.riemannTransformationPlayingW;
    syncRiemannTransformationPlayPauseButton();
    if (state.riemannTransformationPlayingZ || state.riemannTransformationPlayingW) {
        startRiemannTransformationAnimation();
    }
}

export function resetRiemannTransformationAnimation() {
    stopRiemannTransformationAnimation();
    state.riemannTransformationProgressZ = 0.0;
    state.riemannTransformationProgressW = 0.0;
    directionZ = 1; directionW = 1;
    pauseTimerZ = 0; pauseTimerW = 0;
    syncRiemannSliders();
    syncRiemannTransformationPlayPauseButton();
    
    if (zRenderer) {
        zRenderer.updateGeometry(0);
        zRenderer.render();
    }
    if (wRenderer) {
        wRenderer.updateGeometry(0);
        wRenderer.render();
    }
}

export function syncRiemannSliders() {
    const sliderZ = document.getElementById('z_transformation_progress_slider');
    if (sliderZ && document.activeElement !== sliderZ) sliderZ.value = state.riemannTransformationProgressZ;
    
    const sliderW = document.getElementById('w_transformation_progress_slider');
    if (sliderW && document.activeElement !== sliderW) sliderW.value = state.riemannTransformationProgressW;
}

export function syncRiemannTransformationPlayPauseButton() {
    const btnZ = document.getElementById('z_transformation_play_pause_btn');
    if (btnZ) {
        if (state.riemannTransformationPlayingZ) {
            btnZ.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            btnZ.classList.add('playing');
        } else {
            btnZ.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>`;
            btnZ.classList.remove('playing');
        }
    }
    
    const btnW = document.getElementById('w_transformation_play_pause_btn');
    if (btnW) {
        if (state.riemannTransformationPlayingW) {
            btnW.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            btnW.classList.add('playing');
        } else {
            btnW.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>`;
            btnW.classList.remove('playing');
        }
    }
}

export function disposeThreeJSRenderers() {
    if (animationHandle) {
        cancelAnimationFrame(animationHandle);
        animationHandle = null;
    }
    if (zRenderer) { zRenderer.dispose(); zRenderer = null; }
    if (wRenderer) { wRenderer.dispose(); wRenderer = null; }
}

export function renderThreeJSFrame() {
    if (zRenderer) zRenderer.render();
    if (wRenderer) wRenderer.render();
}
