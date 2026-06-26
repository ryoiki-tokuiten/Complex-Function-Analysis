import { state, context, zPlaneParams } from './store/state.js';
import { eventBus } from './store/events.js';
import { findZerosAndPoles, findCriticalPoints } from './analysis/feature-detection.js';
import { updateTaylorSeriesCenterAndRadius } from './math-utils.js';
import { performCauchyAnalysis } from './analysis/cauchy.js';
import { drawZPlaneContent, drawWPlaneContent } from './rendering/renderer.js';
import { updateTitlesAndGlobalUI } from './ui/ui-updates.js';
import { drawLaplace3DSurface } from './rendering/laplace-3d-surface.js';
import { drawRealPlot } from './rendering/real-plots-renderer.js';
import { setupDOMReferences, setupVisualParameters } from './utils/dom-utils.js';
import { initializePolynomialCoeffs, generatePolynomialCoeffSliders } from './ui/polynomial-ui.js';
import { setupEventListeners, setActiveFunctionButton, initializeStateFromControls, getCachedCanvasEventPosition } from './ui/event-listeners.js';
import { initializeSectionAnimations } from './ui/section-animations.js';
import { initializeTooltips, showDynamicTooltip, hideDynamicTooltip } from './ui/tooltip.js';
import { mapCanvasToWorldCoords } from './utils/canvas-utils.js';
import { initializeDynamicPlottingEngine } from './analysis/dynamic-plotting.js';
import {
    findNearestDynamicSample,
    formatDynamicSampleTooltip
} from './rendering/draw-dynamic-plotting.js';

const { controls } = context;

function syncLaplaceSurfaceColumn() {
    const column = controls.laplace3DColumn;
    if (!column) return;

    const shouldHide = !state.laplaceModeEnabled;
    const changed = column.classList.contains('hidden') !== shouldHide;
    if (!changed) return;
    column.classList.toggle('hidden', shouldHide);

    // The column count changes between two and three. Resize the bitmap-backed
    // planes after the browser has committed that layout, not during the old one.
    const refreshPlanes = () => {
        setupVisualParameters(false, false);
        requestRedrawAll();
    };
    requestAnimationFrame(() => {
        refreshPlanes();
        setTimeout(refreshPlanes, 360);
    });
}

function syncRealPlotsColumn() {
    const column = controls.realPlotsColumn;
    if (!column) return;

    const shouldHide = !state.realPlotsEnabled;
    const changed = column.classList.contains('hidden') !== shouldHide;
    if (!changed) return;
    column.classList.toggle('hidden', shouldHide);

    const refreshPlanes = () => {
        setupVisualParameters(false, false);
        requestRedrawAll();
    };
    requestAnimationFrame(() => {
        refreshPlanes();
        setTimeout(refreshPlanes, 360);
    });
}

export function requestRedrawAll() {
    if (context.redrawRequest) {
        context.redrawQueued = true;
        if (context.domainColoringDirty) {
            context.domainColoringDirtyQueued = true;
        }
        return;
    }

    context.redrawRequest = requestAnimationFrame(() => {
        context.redrawQueued = false;
        context.domainColoringDirtyQueued = false;

        try {
            const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
            if (state.showZerosPoles && !state.navigationModeEnabled && zIsPlanar && state.currentFunction !== 'poincare') {
                findZerosAndPoles();
            } else {
                state.zeros = [];
                state.poles = [];
            }
            if (state.showCriticalPoints && !state.navigationModeEnabled && zIsPlanar && state.currentFunction !== 'poincare') {
                findCriticalPoints();
            } else {
                state.criticalPoints = [];
                state.criticalValues = [];
            }

            updateTaylorSeriesCenterAndRadius();
            performCauchyAnalysis();

            drawZPlaneContent();
            drawWPlaneContent();
            updateTitlesAndGlobalUI();

            syncLaplaceSurfaceColumn();
            if (state.laplaceModeEnabled && typeof drawLaplace3DSurface === 'function') {
                drawLaplace3DSurface('laplace_3d_container');
            }

            syncRealPlotsColumn();
            if (state.realPlotsEnabled && typeof drawRealPlot === 'function') {
                drawRealPlot();
            }

            context.domainColoringDirty = context.domainColoringDirtyQueued;
            context.redrawRequest = null;

            if (state.webglGpuStressMode && state.domainColoringEnabled) {
                context.domainColoringDirty = true;
            }

            if (
                context.redrawQueued ||
                context.domainColoringDirty ||
                state.particleAnimationEnabled
            ) {
                requestRedrawAll();
            }
        } catch (error) {
            console.error("Error during redraw (requestAnimationFrame):", error);
            context.redrawRequest = null;
        }
    });
}

function initializeAnimationSpeedSelectors() {
    document.querySelectorAll('.animation-speed-selector').forEach(select => {
        const defaultOption = Array.from(select.options).find(option => option.value === '1') ||
            Array.from(select.options).find(option => option.defaultSelected) ||
            select.options[0];

        Array.from(select.options).forEach(option => {
            option.selected = option === defaultOption;
        });
    });
}

function setup() {
    try {
        initializeDynamicPlottingEngine();
        setupDOMReferences();
        setupVisualParameters(true, true);
        initializeStateFromControls();

        initializePolynomialCoeffs(state.polynomialN, false); 
        generatePolynomialCoeffSliders(); 

        if (!controls.funcButtons[state.currentFunction]) {
            state.currentFunction = 'cos';
            setActiveFunctionButton('cos');
        }
        if (controls.inputShapeSelector) {
            controls.inputShapeSelector.value = state.currentInputShape;
        }

        initializeAnimationSpeedSelectors();

        setupEventListeners();
        context.domainColoringDirty = true;
        initializeSectionAnimations();
        initializeTooltips();
        setupCanvasTooltipEvents(); 
        requestRedrawAll(); 
    } catch (error) {
        console.error("Error during setup:", error);
    }
}

function setupCanvasTooltipEvents() {
    const bindPlaneTooltip = (canvas, plane, planeParams) => {
        if (!canvas || !planeParams) return;
        const tooltipPos = { x: 0, y: 0 };
        const probeWorld = { re: 0, im: 0 };

        canvas.addEventListener('mousemove', (event) => {
            try {
                const pos = getCachedCanvasEventPosition(canvas, event, tooltipPos);
                if (!pos) return;

                const worldCoords = mapCanvasToWorldCoords(pos.x, pos.y, planeParams);
                probeWorld.re = worldCoords.x;
                probeWorld.im = worldCoords.y;

                let foundItem = null;
                const xRange = planeParams.currentVisXRange || planeParams.xRange;
                const clickRadiusWorld = xRange[1] - xRange[0];
                const tolerance = (clickRadiusWorld / planeParams.width) * 5;

                const dynamicSample = findNearestDynamicSample(probeWorld, plane, {
                    worldSpan: clickRadiusWorld,
                    pixelWidth: planeParams.width,
                    tolerance: tolerance * 2
                });
                if (dynamicSample) {
                    foundItem = formatDynamicSampleTooltip(dynamicSample);
                }

                if (!foundItem && plane === 'z' && state.poles && state.showZerosPoles) {
                    for (const pole of state.poles) {
                        if (Math.abs(pole.re - probeWorld.re) < tolerance && Math.abs(pole.im - probeWorld.im) < tolerance) {
                            let content = `<b>Singularity</b><br>z = ${pole.re.toFixed(3)} + ${pole.im.toFixed(3)}i`;
                            content += `<br>Type: ${pole.type || 'Unknown'}`;
                            if (pole.type === 'pole' && pole.order) {
                                content += `<br>Order: ${pole.order}`;
                            }
                            if (pole.residue && typeof pole.residue.re === 'number' && typeof pole.residue.im === 'number' &&
                                isFinite(pole.residue.re) && isFinite(pole.residue.im)) {
                                content += `<br>Residue: ${pole.residue.re.toFixed(3)} + ${pole.residue.im.toFixed(3)}i`;
                            }
                            foundItem = content;
                            break;
                        }
                    }
                }

                if (!foundItem && plane === 'z' && state.zeros && state.showZerosPoles) {
                    for (const zero of state.zeros) {
                        if (Math.abs(zero.re - probeWorld.re) < tolerance && Math.abs(zero.im - probeWorld.im) < tolerance) {
                            foundItem = `<b>Zero</b><br>z = ${zero.re.toFixed(3)} + ${zero.im.toFixed(3)}i`;
                            break;
                        }
                    }
                }

                if (!foundItem && plane === 'z' && state.criticalPoints && state.showCriticalPoints) {
                    for (const cp of state.criticalPoints) {
                        if (Math.abs(cp.re - probeWorld.re) < tolerance && Math.abs(cp.im - probeWorld.im) < tolerance) {
                            foundItem = `<b>Critical Point</b><br>z = ${cp.re.toFixed(3)} + ${cp.im.toFixed(3)}i`;
                            break;
                        }
                    }
                }

                if (foundItem) {
                    showDynamicTooltip(foundItem, event.pageX, event.pageY);
                } else {
                    hideDynamicTooltip();
                }
            } catch (error) {
                console.error(`Error in ${plane}-plane mousemove listener for tooltips:`, error);
            }
        }, { passive: true });

        canvas.addEventListener('mouseout', () => {
            try {
                hideDynamicTooltip();
            } catch (error) {
                console.error(`Error in ${plane}-plane mouseout listener for tooltips:`, error);
            }
        });
    };

    bindPlaneTooltip(controls.zPlaneCanvas, 'z', zPlaneParams);
    bindPlaneTooltip(controls.wPlaneCanvas, 'w', context.wPlaneParamsList?.[0]);
}

// Event bus subscriptions for asynchronous redraw events from raster-media
eventBus.on('redraw:all', () => {
    requestRedrawAll();
});

eventBus.on('redraw:domain', (markDirty) => {
    if (markDirty !== false) {
        context.domainColoringDirty = true;
    }
    requestRedrawAll();
});

if (document.readyState === 'complete') {
    setup();
    hidePreloader();
} else {
    window.addEventListener('load', () => {
        setup();
        hidePreloader();
    });
}

function hidePreloader() {
    if (controls.preloader) {
        controls.preloader.style.opacity = '0';
        setTimeout(() => {
            controls.preloader.style.display = 'none';
        }, 500); 
    }
}

window.addEventListener('resize', () => {
    setupVisualParameters(false, false); 
    context.domainColoringDirty = true;
    requestRedrawAll();
});
