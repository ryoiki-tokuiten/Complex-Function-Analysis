// Laplace Transform Animation Controller
// Smooth progressive animation of winding spiral

let laplaceAnimationHandle = null;
let laplaceLastFrameTime = 0;

/**
 * Start animating the Laplace winding visualization
 */
function startLaplaceAnimation() {
    if (laplaceAnimationHandle) {
        return; // Already running
    }
    
    state.laplaceAnimationPlaying = true;
    state.laplaceAnimationTime = 0; // Start from beginning
    laplaceLastFrameTime = performance.now();
    
    function animateFrame(timestamp) {
        if (!state.laplaceAnimationPlaying || !state.laplaceModeEnabled) {
            laplaceAnimationHandle = null;
            return;
        }
        
        // Calculate delta time
        const deltaTime = (timestamp - laplaceLastFrameTime) / 1000; // Convert to seconds
        laplaceLastFrameTime = timestamp;
        
        // Animation speed (0 to 1 over N seconds)
        const animationDuration = state.laplaceAnimationSpeed || 3.0; // seconds
        const increment = deltaTime / animationDuration;
        
        state.laplaceAnimationTime += increment;
        
        // Loop or stop at end
        if (state.laplaceAnimationTime >= 1.0) {
            if (state.laplaceAnimationLoop) {
                state.laplaceAnimationTime = 0; // Loop
            } else {
                state.laplaceAnimationTime = 1.0;
                stopLaplaceAnimation();
                return;
            }
        }
        
        // Trigger redraw
        if (typeof requestRedrawAll === 'function') {
            requestRedrawAll();
        } else if (typeof drawWPlaneContent === 'function') {
            drawWPlaneContent();
        }
        
        // Continue animation
        laplaceAnimationHandle = requestAnimationFrame(animateFrame);
    }
    
    laplaceAnimationHandle = requestAnimationFrame(animateFrame);
}

/**
 * Stop animating
 */
function stopLaplaceAnimation() {
    state.laplaceAnimationPlaying = false;
    if (laplaceAnimationHandle) {
        cancelAnimationFrame(laplaceAnimationHandle);
        laplaceAnimationHandle = null;
    }
}

/**
 * Toggle animation play/pause
 */
function toggleLaplaceAnimation() {
    if (state.laplaceAnimationPlaying) {
        stopLaplaceAnimation();
    } else {
        startLaplaceAnimation();
    }
}

/**
 * Reset animation to beginning
 */
function resetLaplaceAnimation() {
    stopLaplaceAnimation();
    state.laplaceAnimationTime = 0;
    requestRedrawAll();
}

/**
 * Set animation to show full spiral (default)
 */
function showFullLaplaceSpiral() {
    stopLaplaceAnimation();
    state.laplaceAnimationTime = 1.0;
    requestRedrawAll();
}
