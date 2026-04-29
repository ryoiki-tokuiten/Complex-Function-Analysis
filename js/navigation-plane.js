const NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
let navigationAnimationFrame = null;

// ── Rocket image assets ────────────────────────────────────────────────────────
// Images are loaded from base64 data: URIs (defined in rocket-assets.js).
// data: URLs are always same-origin — gl.texImage2D accepts them on file:// too.
const NAVIGATION_ROCKET_IMAGES = {
    '+x': null,
    '-x': null,
    '+y': null,
    '-y': null,
};

(function preloadRocketImages() {
    Object.entries(ROCKET_DATA_URIS).forEach(([key, dataUri]) => {
        const img = new Image();
        img.onload = () => { NAVIGATION_ROCKET_IMAGES[key] = img; };
        img.src = dataUri;
    });
}());

/**
 * Given a heading angle (radians, from Math.atan2), pick the best directional
 * rocket image. The four images correspond to the four cardinal half-planes:
 *   +x  →  -π/4  .. +π/4
 *   +y  →  +π/4  .. +3π/4
 *   -x  →  +3π/4 .. π  |  -π .. -3π/4
 *   -y  →  -3π/4 .. -π/4
 */
function getRocketImageForHeading(heading) {
    const QUARTER = Math.PI / 4;
    const abs = Math.abs(heading);
    if (abs <= QUARTER) {
        return NAVIGATION_ROCKET_IMAGES['+x'];
    } else if (abs >= 3 * QUARTER) {
        return NAVIGATION_ROCKET_IMAGES['-x'];
    } else if (heading > 0) {
        return NAVIGATION_ROCKET_IMAGES['+y'];
    } else {
        return NAVIGATION_ROCKET_IMAGES['-y'];
    }
}

function isFiniteComplexPoint(point) {
    return point &&
        Number.isFinite(point.re) &&
        Number.isFinite(point.im);
}

function isNavigationFormTarget(target) {
    return !!(target && target.closest && target.closest('input, select, textarea, button, [contenteditable="true"]'));
}

function readNavigationControlValue(controlKey, fallback, parser = parseFloat) {
    const control = controls[controlKey];
    if (!control) return fallback;
    const value = parser(control.value);
    return Number.isNaN(value) ? fallback : value;
}

function initializeNavigationStateFromControls() {
    state.navigationSize = readNavigationControlValue('navigationSizeSlider', state.navigationSize);
    state.navigationOpacity = readNavigationControlValue('navigationOpacitySlider', state.navigationOpacity);
    state.navigationSpeed = readNavigationControlValue('navigationSpeedSlider', state.navigationSpeed);
    state.navigationTrailLength = readNavigationControlValue('navigationTrailLengthSlider', state.navigationTrailLength, value => parseInt(value, 10));
    state.navigationModeEnabled = controls.enableNavigationModeCb ? controls.enableNavigationModeCb.checked : state.navigationModeEnabled;
    syncNavigationControls();
}

function syncNavigationControls() {
    const inSpecialMode = state.fourierModeEnabled || state.laplaceModeEnabled;
    if (controls.navigationParamsBlock) {
        controls.navigationParamsBlock.classList.toggle('hidden', inSpecialMode);
    }
    if (controls.enableNavigationModeCb) {
        controls.enableNavigationModeCb.checked = state.navigationModeEnabled && !inSpecialMode;
        controls.enableNavigationModeCb.disabled = inSpecialMode;
    }
    if (controls.navigationControlsContainer) {
        controls.navigationControlsContainer.classList.toggle('hidden', !state.navigationModeEnabled || inSpecialMode);
    }
    const keyhintOverlay = document.getElementById('navigation_keyhint_overlay');
    if (keyhintOverlay) {
        keyhintOverlay.classList.toggle('hidden', !state.navigationModeEnabled || inSpecialMode);
    }
    if (controls.navigationSizeValueDisplay) controls.navigationSizeValueDisplay.textContent = state.navigationSize.toFixed(2);
    if (controls.navigationOpacityValueDisplay) controls.navigationOpacityValueDisplay.textContent = state.navigationOpacity.toFixed(2);
    if (controls.navigationSpeedValueDisplay) controls.navigationSpeedValueDisplay.textContent = state.navigationSpeed.toFixed(2);
    if (controls.navigationTrailLengthValueDisplay) controls.navigationTrailLengthValueDisplay.textContent = state.navigationTrailLength;
}

function setNavigationModeEnabled(enabled) {
    if (enabled && (state.fourierModeEnabled || state.laplaceModeEnabled)) {
        enabled = false;
    }

    state.navigationModeEnabled = enabled;
    state.probeActive = false;

    if (enabled) {
        state.riemannSphereViewEnabled = false;
        state.splitViewEnabled = false;
        state.plotly3DEnabled = false;
        if (controls.enableRiemannSphereCb) controls.enableRiemannSphereCb.checked = false;
        if (controls.enableSplitViewCb) controls.enableSplitViewCb.checked = false;
        if (controls.enablePlotly3DCb) controls.enablePlotly3DCb.checked = false;
        followNavigationViewports();
    } else {
        state.navigationKeys = {};
        stopNavigationLoop();
    }

    syncNavigationControls();
}

function resetNavigationVehicle() {
    state.navigationPosition = { re: 0, im: 0 };
    state.navigationHeading = 0;
    state.navigationTrail = [];
    setupVisualParameters(true, true);
    followNavigationViewports();
    requestDomainRedraw(true);
}

function getNavigationInputVector() {
    const keys = state.navigationKeys || {};
    let x = 0;
    let y = 0;
    if (keys.ArrowLeft) x -= 1;
    if (keys.ArrowRight) x += 1;
    if (keys.ArrowUp) y += 1;
    if (keys.ArrowDown) y -= 1;
    const mag = Math.hypot(x, y);
    return mag > 0 ? { x: x / mag, y: y / mag } : null;
}

function hasNavigationInput() {
    return !!getNavigationInputVector();
}

function setNavigationKey(event, pressed) {
    if (!state.navigationModeEnabled || !NAVIGATION_KEYS.has(event.key) || isNavigationFormTarget(event.target)) {
        return false;
    }

    event.preventDefault();
    state.navigationKeys[event.key] = pressed;

    // Visual feedback on the keyhint widget
    const keyToDirection = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = keyToDirection[event.key];
    if (dir) {
        const el = document.querySelector(`.keyhint-key [data-lucide="arrow-${dir}"]`);
        if (el && el.parentElement) {
            el.parentElement.classList.toggle('active', pressed);
        }
    }

    if (pressed) startNavigationLoop();
    return true;
}

function startNavigationLoop() {
    if (navigationAnimationFrame || !state.navigationModeEnabled) return;
    state.navigationLastTime = performance.now();
    navigationAnimationFrame = requestAnimationFrame(updateNavigationLoop);
}

function stopNavigationLoop() {
    if (navigationAnimationFrame) {
        cancelAnimationFrame(navigationAnimationFrame);
        navigationAnimationFrame = null;
    }
}

function updateNavigationLoop(now) {
    navigationAnimationFrame = null;
    if (!state.navigationModeEnabled || !hasNavigationInput()) return;

    const viewportShifted = updateNavigationVehicle(now);
    requestDomainRedraw(Boolean(viewportShifted && state.domainColoringEnabled));

    if (hasNavigationInput()) {
        navigationAnimationFrame = requestAnimationFrame(updateNavigationLoop);
    }
}

function updateNavigationVehicle(now) {
    const direction = getNavigationInputVector();
    if (!direction) return false;

    const dt = Math.min(0.05, Math.max(0.001, (now - (state.navigationLastTime || now)) / 1000));
    state.navigationLastTime = now;

    const xSpan = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
    const ySpan = zPlaneParams.currentVisYRange[1] - zPlaneParams.currentVisYRange[0];
    const speed = state.navigationSpeed * Math.max(xSpan, ySpan) * 0.12;

    state.navigationPosition.re += direction.x * speed * dt;
    state.navigationPosition.im += direction.y * speed * dt;
    state.navigationHeading = Math.atan2(direction.y, direction.x);

    state.navigationTrail.push({ re: state.navigationPosition.re, im: state.navigationPosition.im });
    const maxTrail = Math.max(0, Math.floor(state.navigationTrailLength));
    if (state.navigationTrail.length > maxTrail) {
        state.navigationTrail.splice(0, state.navigationTrail.length - maxTrail);
    }

    return followNavigationViewports();
}

function centerPlaneOnNavigationPoint(planeParams, point, panState) {
    if (!isFiniteComplexPoint(point) || (panState && panState.isPanning)) return false;

    const nextOriginX = planeParams.width / 2 - point.re * planeParams.scale.x;
    const nextOriginY = planeParams.height / 2 + point.im * planeParams.scale.y;
    const shifted = Math.abs(nextOriginX - planeParams.origin.x) > 0.01 ||
        Math.abs(nextOriginY - planeParams.origin.y) > 0.01;

    planeParams.origin.x = nextOriginX;
    planeParams.origin.y = nextOriginY;
    updatePlaneViewportRanges(planeParams);
    return shifted;
}

function followNavigationViewports() {
    let shifted = centerPlaneOnNavigationPoint(zPlaneParams, state.navigationPosition, state.panStateZ);

    const transformFunc = transformFunctions[state.currentFunction];
    if (typeof transformFunc !== 'function') return shifted;

    // Center w-plane on the mapped point of the vehicle position
    const mappedCenter = transformFunc(state.navigationPosition.re, state.navigationPosition.im);
    shifted = centerPlaneOnNavigationPoint(wPlaneParams, mappedCenter, state.panStateW) || shifted;
    return shifted;
}

// ── Image state injection for the existing pipeline ────────────────────────────
//
// Instead of custom drawing, we temporarily set the rocket PNG as the active
// image (state.uploadedImage, state.currentInputShape='image', etc.) so that the
// existing drawPlanarInputShape / drawPlanarTransformedShape / drawImageWithWebGL
// pipeline processes it exactly like a user-uploaded image.
//
// applyNavigationImageState()  → swaps state in
// restoreNavigationImageState() → restores the previous state
//
// These are called by the renderer AROUND the normal shape-drawing calls.

let _navImageStateSaved = null;

function applyNavigationImageState() {
    const img = getRocketImageForHeading(state.navigationHeading);
    if (!img || !(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth === 0) {
        return false;
    }

    // Save existing state
    _navImageStateSaved = {
        currentInputShape:   state.currentInputShape,
        uploadedImage:       state.uploadedImage,
        imageAspectRatio:    state.imageAspectRatio,
        imageSize:           state.imageSize,
        imageOpacity:        state.imageOpacity,
        a0:                  state.a0,
        b0:                  state.b0,
        imageContentVersion: state.imageContentVersion,
    };

    // Inject the rocket image as the active raster source
    state.currentInputShape  = 'image';
    state.uploadedImage      = img;
    state.imageAspectRatio   = img.naturalWidth / Math.max(1, img.naturalHeight);
    state.imageSize          = state.navigationSize * 2;
    state.imageOpacity       = state.navigationOpacity;
    state.a0                 = state.navigationPosition.re;
    state.b0                 = state.navigationPosition.im;
    state.imageContentVersion = _navImageStateSaved.imageContentVersion + 1;

    return true;
}

function restoreNavigationImageState() {
    if (!_navImageStateSaved) return;

    state.currentInputShape   = _navImageStateSaved.currentInputShape;
    state.uploadedImage       = _navImageStateSaved.uploadedImage;
    state.imageAspectRatio    = _navImageStateSaved.imageAspectRatio;
    state.imageSize           = _navImageStateSaved.imageSize;
    state.imageOpacity        = _navImageStateSaved.imageOpacity;
    state.a0                  = _navImageStateSaved.a0;
    state.b0                  = _navImageStateSaved.b0;
    state.imageContentVersion = _navImageStateSaved.imageContentVersion;

    _navImageStateSaved = null;
}

function drawNavigationTrail(ctx, planeParams, transformFunc) {
    if (!state.navigationTrail || state.navigationTrail.length < 2 || state.navigationTrailLength <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.min(0.34, state.navigationOpacity * 0.45);
    ctx.strokeStyle = 'rgba(126, 228, 255, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (transformFunc) {
        drawPlanarTransformedLine(ctx, planeParams, transformFunc, state.navigationTrail, 'rgba(126, 228, 255, 0.55)');
    } else {
        drawComplexLineSetOnPlane(ctx, planeParams, state.navigationTrail);
    }
    ctx.restore();
}

/**
 * drawNavigationLayer — called by renderer.js for both z-plane and w-plane.
 *
 * This function injects the rocket image into the global state, then calls the
 * SAME pipeline that the regular image-upload feature uses:
 *   - Z-plane: drawImageWithWebGL(ctx, planeParams, false)
 *   - W-plane: drawImageWithWebGL(ctx, planeParams, true, 0)
 *
 * The pipeline reads state.uploadedImage, state.a0/b0, state.imageSize, etc.
 * to position and transform the image. We just set those to match the rocket.
 */
function drawNavigationLayer(ctx, planeParams, planeKey, transformFunc = null) {
    if (!state.navigationModeEnabled) return;

    const isWPlane = !!transformFunc;

    // Draw trail
    drawNavigationTrail(ctx, planeParams, transformFunc);

    // Inject the rocket image into state, then use the normal pipeline
    if (!applyNavigationImageState()) return;

    try {
        if (typeof drawImageWithWebGL === 'function') {
            drawImageWithWebGL(ctx, planeParams, isWPlane, 0);
        }
    } finally {
        restoreNavigationImageState();
    }
}

// Alias kept for any renderer.js call sites that use this name directly.
function drawNavigationVehicle(ctx, planeParams, transformFunc = null) {
    drawNavigationLayer(ctx, planeParams, null, transformFunc);
}
