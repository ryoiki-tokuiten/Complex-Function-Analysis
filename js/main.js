
function requestRedrawAll(){
    if(!redrawRequest){
        redrawRequest = requestAnimationFrame(() => {
            try {
                const zIsPlanar = !state.riemannSphereViewEnabled || state.splitViewEnabled;
                if(state.showZerosPoles && zIsPlanar && state.currentFunction !== 'poincare') findZerosAndPoles(); else { state.zeros = []; state.poles = [];}
                if(state.showCriticalPoints && zIsPlanar && state.currentFunction !== 'poincare') findCriticalPoints(); else { state.criticalPoints = []; state.criticalValues = [];}

                updateTaylorSeriesCenterAndRadius(); 
                performCauchyAnalysis();

                drawZPlaneContent();
                drawWPlaneContent();
                updateTitlesAndGlobalUI();
                
                if (controls.laplace3DColumn) {
                    controls.laplace3DColumn.classList.toggle('hidden', !state.laplaceModeEnabled);
                }
                if (state.laplaceModeEnabled && typeof drawLaplace3DSurface === 'function') {
                    drawLaplace3DSurface('laplace_3d_container');
                }

                domainColoringDirty = false;
                redrawRequest = null;

                
                if (state.particleAnimationEnabled || (state.webglGpuStressMode && state.domainColoringEnabled)) {
                    if (state.webglGpuStressMode && state.domainColoringEnabled) {
                        domainColoringDirty = true;
                    }
                    requestRedrawAll();
                }
            } catch (error) {
                console.error("Error during redraw (requestAnimationFrame):", error);
                redrawRequest = null; 
            }
        });
    }
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
        domainColoringDirty = true;
        initializeSectionAnimations();
        initializeTooltips();
        setupCanvasTooltipEvents(); 
        requestRedrawAll(); 
    } catch (error) {
        console.error("Error during setup:", error);
    }
}

function setupCanvasTooltipEvents() {
    if (!controls.zPlaneCanvas) return;

    controls.zPlaneCanvas.addEventListener('mousemove', (event) => {
        try {
            const rect = controls.zPlaneCanvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldCoords = mapCanvasToWorldCoords(mouseX, mouseY, zPlaneParams);
            const probeWorld = { re: worldCoords.x, im: worldCoords.y };

            let foundItem = null;
            const clickRadiusWorld = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
            const tolerance = (clickRadiusWorld / zPlaneParams.width) * 5; 

            
            if (state.poles && state.showZerosPoles) {
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

            
            if (!foundItem && state.zeros && state.showZerosPoles) {
                for (const zero of state.zeros) {
                    if (Math.abs(zero.re - probeWorld.re) < tolerance && Math.abs(zero.im - probeWorld.im) < tolerance) {
                        foundItem = `<b>Zero</b><br>z = ${zero.re.toFixed(3)} + ${zero.im.toFixed(3)}i`;
                        
                        break;
                    }
                }
            }

            
            if (!foundItem && state.criticalPoints && state.showCriticalPoints) {
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
            console.error("Error in zPlaneCanvas mousemove listener for tooltips:", error);
        }
    });

    controls.zPlaneCanvas.addEventListener('mouseout', () => {
        try {
            hideDynamicTooltip();
        } catch (error) {
            console.error("Error in zPlaneCanvas mouseout listener for tooltips:", error);
        }
    });
}


window.addEventListener('load', () => {
    setup(); 

    if (controls.preloader) {
        controls.preloader.style.opacity = '0';
        setTimeout(() => {
            controls.preloader.style.display = 'none';
        }, 500); 
    }
});
window.addEventListener('resize', () => {
    setupVisualParameters(false, false); 
    domainColoringDirty = true;
    requestRedrawAll();
});
