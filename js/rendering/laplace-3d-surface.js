// Laplace Transform 3D Surface Visualization using Plotly.js
// Beautiful WebGL rendering of |F(s)| magnitude and phase surfaces

/**
 * Draw 3D surface plot of Laplace transform magnitude/phase
 * Uses Plotly for interactive 3D WebGL rendering
 */
function drawLaplace3DSurface(containerId) {
    if (!state.laplaceSurface || state.laplaceSurface.length === 0) {
        // Show placeholder
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(200, 220, 255, 0.8); font-family: SF Pro Text, sans-serif;">Computing surface...</div>';
            container.dataset.laplacePlotlyReady = '0';
        }
        return;
    }

    if (typeof Plotly === 'undefined') {
        return;
    }

    const vizMode = state.laplaceVizMode || 'magnitude';
    const clipHeight = state.laplaceClipHeight || 10;
    const showPolesZeros = state.laplaceShowPolesZeros !== false;

    // Organize surface data into grid
    const surfaceData = state.laplaceSurface;

    // Extract unique sigma and omega values
    const sigmaValues = [...new Set(surfaceData.map(pt => pt.sigma))].sort((a, b) => a - b);
    const omegaValues = [...new Set(surfaceData.map(pt => pt.omega))].sort((a, b) => a - b);

    // Build Z matrix
    const zMatrix = [];
    const sigmaLen = sigmaValues.length;
    const omegaLen = omegaValues.length;

    for (let j = 0; j < omegaLen; j++) {
        const row = [];
        for (let i = 0; i < sigmaLen; i++) {
            const sigma = sigmaValues[i];
            const omega = omegaValues[j];

            // Find matching point
            const point = surfaceData.find(pt =>
                Math.abs(pt.sigma - sigma) < 0.01 && Math.abs(pt.omega - omega) < 0.01
            );

            if (point) {
                let zValue;
                if (vizMode === 'magnitude') {
                    zValue = Math.min(point.magnitude, clipHeight);
                } else if (vizMode === 'phase') {
                    zValue = point.phase;
                } else { // combined
                    zValue = Math.min(point.magnitude, clipHeight);
                }
                row.push(zValue);
            } else {
                row.push(0);
            }
        }
        zMatrix.push(row);
    }

    // 3b1b-style rainbow HSL colorscale — height maps to hue
    let colorscale;

    if (vizMode === 'phase') {
        // Phase uses cyclic HSL wheel
        colorscale = [
            [0, 'hsl(0, 85%, 55%)'],
            [0.167, 'hsl(60, 85%, 55%)'],
            [0.333, 'hsl(120, 85%, 55%)'],
            [0.5, 'hsl(180, 85%, 55%)'],
            [0.667, 'hsl(240, 85%, 55%)'],
            [0.833, 'hsl(300, 85%, 55%)'],
            [1, 'hsl(360, 85%, 55%)']
        ];
    } else {
        // Magnitude/combined: rainbow spectrum with dark floor
        colorscale = [
            [0, 'hsl(240, 80%, 20%)'],     // Deep indigo (valley floor)
            [0.08, 'hsl(220, 85%, 40%)'],   // Blue
            [0.18, 'hsl(195, 90%, 50%)'],   // Cyan
            [0.30, 'hsl(160, 90%, 45%)'],   // Teal-green
            [0.42, 'hsl(120, 85%, 45%)'],   // Green
            [0.55, 'hsl(60, 95%, 55%)'],    // Yellow
            [0.70, 'hsl(35, 95%, 55%)'],    // Orange
            [0.85, 'hsl(10, 90%, 55%)'],    // Red-orange
            [1, 'hsl(340, 90%, 65%)']       // Hot pink (pole peaks)
        ];
    }

    // Surface trace — cinematic 3b1b quality
    const surfaceTrace = {
        type: 'surface',
        x: sigmaValues,
        y: omegaValues,
        z: zMatrix,
        colorscale: colorscale,
        showscale: false,  // No colorbar — clean look
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: 'rgba(255, 255, 255, 0.15)',
                project: { z: true },  // Rainbow grid on floor
                width: 1
            }
        },
        lighting: {
            ambient: 0.55,
            diffuse: 0.85,
            specular: 0.9,
            roughness: 0.15,
            fresnel: 0.7
        },
        lightposition: {
            x: 1000,
            y: 500,
            z: 2000
        },
        hidesurface: false,
        hovertemplate: '<b>σ</b>: %{x:.2f}<br><b>ω</b>: %{y:.2f}<br><b>Value</b>: %{z:.3f}<extra></extra>'
    };

    const traces = [surfaceTrace];

    // Layout — dark, cinematic, minimal
    const axisCommon = {
        tickfont: { family: 'SF Mono, monospace', size: 10, color: 'rgba(150, 150, 150, 0.5)' },
        gridcolor: 'rgba(60, 60, 100, 0.15)',
        zerolinecolor: 'rgba(120, 120, 180, 0.25)',
        backgroundcolor: 'rgba(0, 0, 0, 0)',
        showbackground: false,
        showspikes: false,
        showline: false,
        mirror: false
    };
    const layout = {
        scene: {
            xaxis: {
                ...axisCommon,
                title: { text: 'σ', font: { family: 'STIX Two Math, serif', size: 14, color: 'rgba(200, 200, 200, 0.7)' } }
            },
            yaxis: {
                ...axisCommon,
                title: { text: 'jω', font: { family: 'STIX Two Math, serif', size: 14, color: 'rgba(200, 200, 200, 0.7)' } }
            },
            zaxis: {
                ...axisCommon,
                title: { text: vizMode === 'phase' ? '∠F(s)' : '|F(s)|', font: { family: 'STIX Two Math, serif', size: 14, color: 'rgba(200, 200, 200, 0.7)' } }
            },
            camera: {
                eye: { x: 1.3, y: -1.8, z: 0.8 },
                center: { x: 0, y: 0, z: -0.1 }
            },
            bgcolor: 'rgba(0, 0, 0, 0)',
            aspectmode: 'cube'
        },
        paper_bgcolor: 'rgba(0, 0, 0, 1)',
        plot_bgcolor: 'rgba(0, 0, 0, 1)',
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        hovermode: 'closest'
    };

    // Config — minimal modebar
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
        modeBarButtonsToAdd: [{
            name: 'Reset Camera',
            icon: Plotly.Icons.home,
            click: function (gd) {
                Plotly.relayout(gd, {
                    'scene.camera.eye': { x: 1.3, y: -1.8, z: 0.8 },
                    'scene.camera.center': { x: 0, y: 0, z: -0.1 }
                });
            }
        }]
    };

    // Render the plot
    const container = document.getElementById(containerId);
    if (container) {
        const useReact = container.dataset.laplacePlotlyReady === '1';
        const plotPromise = useReact
            ? Plotly.react(container, traces, layout, config)
            : Plotly.newPlot(container, traces, layout, config);

        if (plotPromise && typeof plotPromise.then === 'function') {
            plotPromise
                .then(() => {
                    container.dataset.laplacePlotlyReady = '1';
                })
                .catch((error) => {
                    console.warn('Laplace 3D plot render failed:', error);
                    container.dataset.laplacePlotlyReady = '0';
                });
        } else {
            container.dataset.laplacePlotlyReady = '1';
        }
    }
}

/**
 * Update 3D surface when parameters change
 */
function updateLaplace3DSurface() {
    if (!state.laplaceModeEnabled) return;

    // Redraw the surface
    drawLaplace3DSurface('laplace_3d_container');
}

/**
 * Draw 2D canvas-based preview for the right panel if 3D not available
 * Shows a simplified magnitude plot as fallback
 */
function drawLaplaceMagnitudePlot(ctx, planeParams) {
    if (!state.laplaceSurface || state.laplaceSurface.length === 0) {
        ctx.save();
        ctx.fillStyle = COLOR_TEXT_ON_CANVAS;
        ctx.font = '16px "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Computing...', planeParams.width / 2, planeParams.height / 2);
        ctx.restore();
        return;
    }

    ctx.save();

    // Clear canvas
    ctx.fillStyle = COLOR_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, planeParams.width, planeParams.height);

    // Draw axes
    drawAxes(ctx, planeParams, "σ (Real)", "|F(s)|");

    const clipHeight = state.laplaceClipHeight || 10;
    const omega = state.laplaceOmega || 1;

    // Draw magnitude slice at current ω
    const sliceData = state.laplaceSurface.filter(pt => Math.abs(pt.omega - omega) < 0.2);
    sliceData.sort((a, b) => a.sigma - b.sigma);

    if (sliceData.length > 0) {
        const xRange = planeParams.currentVisXRange || [-3, 2];
        const yRange = planeParams.currentVisYRange || [0, clipHeight];

        // Draw magnitude curve with gradient
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        for (let i = 0; i < sliceData.length; i++) {
            const pt = sliceData[i];
            const mag = Math.min(pt.magnitude, clipHeight);
            const canvasPos = mapToCanvasCoords(pt.sigma, mag, planeParams);

            // Gradient color based on magnitude
            const t = mag / clipHeight;
            const hue = 240 - t * 120; // Blue to red
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.9)`;

            if (i > 0) {
                ctx.lineTo(canvasPos.x, canvasPos.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(canvasPos.x, canvasPos.y);
            } else {
                ctx.moveTo(canvasPos.x, canvasPos.y);
            }
        }
    }

    // Info removed — clean rendering only

    ctx.restore();
}
