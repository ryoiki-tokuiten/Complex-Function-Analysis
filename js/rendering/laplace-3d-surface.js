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
        }
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
    
    // Create colorscale based on visualization mode
    let colorscale, colorbarTitle;
    
    if (vizMode === 'magnitude') {
        colorscale = [
            [0, 'rgb(20, 30, 80)'],      // Deep blue (low)
            [0.2, 'rgb(40, 120, 180)'],  // Blue
            [0.4, 'rgb(100, 200, 150)'], // Cyan-green
            [0.6, 'rgb(200, 220, 100)'], // Yellow-green
            [0.8, 'rgb(255, 180, 50)'],  // Orange
            [1, 'rgb(255, 100, 100)']    // Red (high)
        ];
        colorbarTitle = '|F(s)|';
    } else if (vizMode === 'phase') {
        // HSL-style colormap for phase
        colorscale = [
            [0, 'rgb(255, 0, 0)'],       // Red (-π)
            [0.25, 'rgb(255, 255, 0)'],  // Yellow
            [0.5, 'rgb(0, 255, 0)'],     // Green (0)
            [0.75, 'rgb(0, 255, 255)'],  // Cyan
            [1, 'rgb(255, 0, 255)']      // Magenta (+π)
        ];
        colorbarTitle = '∠F(s) (rad)';
    } else { // combined
        colorscale = [
            [0, 'rgb(50, 20, 80)'],
            [0.3, 'rgb(100, 50, 180)'],
            [0.5, 'rgb(180, 100, 220)'],
            [0.7, 'rgb(220, 150, 100)'],
            [1, 'rgb(255, 200, 100)']
        ];
        colorbarTitle = '|F(s)|';
    }
    
    // Create 3D surface trace
    const surfaceTrace = {
        type: 'surface',
        x: sigmaValues,
        y: omegaValues,
        z: zMatrix,
        colorscale: colorscale,
        colorbar: {
            title: colorbarTitle,
            titleside: 'right',
            titlefont: {
                family: 'SF Pro Display, sans-serif',
                size: 12,
                color: 'rgba(200, 220, 255, 0.9)'
            },
            tickfont: {
                family: 'SF Mono, monospace',
                size: 10,
                color: 'rgba(180, 200, 240, 0.8)'
            },
            bgcolor: 'rgba(20, 25, 35, 0.8)',
            bordercolor: 'rgba(100, 150, 255, 0.3)',
            borderwidth: 1,
            outlinecolor: 'rgba(100, 150, 255, 0.5)',
            outlinewidth: 1
        },
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: 'rgba(255, 255, 255, 0.4)',
                project: { z: true },
                width: 2
            }
        },
        lighting: {
            ambient: 0.75,      // Brighter ambient for clarity
            diffuse: 0.9,       // Strong diffuse for depth
            specular: 0.5,      // More specular highlights
            roughness: 0.3,     // Smoother surface
            fresnel: 0.4        // Better edge lighting
        },
        hidesurface: false,
        surfacecolor: null,     // Use colorscale
        hovertemplate: '<b>σ</b>: %{x:.2f}<br><b>ω</b>: %{y:.2f}<br><b>Value</b>: %{z:.3f}<extra></extra>'
    };
    
    // Clean 3D surface - no clutter, just the mathematical beauty
    const traces = [surfaceTrace];
    
    // Layout configuration - clean and professional
    const layout = {
        title: {
            text: '',  // Remove title, it's in the panel header
            font: {
                family: 'SF Pro Display, sans-serif',
                size: 14,
                color: 'rgba(200, 220, 255, 1)',
                weight: 700
            },
            x: 0.5,
            xanchor: 'center'
        },
        scene: {
            xaxis: {
                title: 'σ (Real)',
                titlefont: {
                    family: 'SF Pro Text, sans-serif',
                    size: 13,
                    color: 'rgba(255, 150, 180, 1)'
                },
                tickfont: {
                    family: 'SF Mono, monospace',
                    size: 10,
                    color: 'rgba(200, 220, 255, 0.8)'
                },
                gridcolor: 'rgba(100, 150, 255, 0.15)',
                zerolinecolor: 'rgba(255, 150, 180, 0.5)',
                backgroundcolor: 'rgba(10, 15, 25, 0.5)'
            },
            yaxis: {
                title: 'ω (Imaginary)',
                titlefont: {
                    family: 'SF Pro Text, sans-serif',
                    size: 13,
                    color: 'rgba(150, 255, 200, 1)'
                },
                tickfont: {
                    family: 'SF Mono, monospace',
                    size: 10,
                    color: 'rgba(200, 220, 255, 0.8)'
                },
                gridcolor: 'rgba(100, 200, 150, 0.15)',
                zerolinecolor: 'rgba(150, 255, 200, 0.5)',
                backgroundcolor: 'rgba(10, 15, 25, 0.5)'
            },
            zaxis: {
                title: vizMode === 'phase' ? '∠F(s)' : '|F(s)|',
                titlefont: {
                    family: 'SF Pro Text, sans-serif',
                    size: 13,
                    color: 'rgba(200, 150, 255, 1)'
                },
                tickfont: {
                    family: 'SF Mono, monospace',
                    size: 10,
                    color: 'rgba(200, 220, 255, 0.8)'
                },
                gridcolor: 'rgba(150, 100, 255, 0.15)',
                zerolinecolor: 'rgba(200, 150, 255, 0.5)',
                backgroundcolor: 'rgba(10, 15, 25, 0.5)'
            },
            camera: {
                eye: { x: 1.7, y: -1.4, z: 1.2 },  // 3b1b-style angle
                center: { x: 0, y: 0, z: 0 }
            },
            bgcolor: 'rgba(0, 0, 0, 0)',  // Transparent - no white floor!
            aspectmode: 'cube'
        },
        paper_bgcolor: 'rgba(8, 10, 18, 1)',
        plot_bgcolor: 'rgba(8, 10, 18, 1)',
        margin: { l: 0, r: 0, t: 10, b: 0 },
        showlegend: false,  // Clean look without legend clutter
        hovermode: 'closest'
    };
    
    // Config for interactivity
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage'],
        modeBarButtonsToAdd: [{
            name: 'Reset Camera',
            icon: Plotly.Icons.home,
            click: function(gd) {
                Plotly.relayout(gd, {
                    'scene.camera.eye': { x: 1.7, y: -1.4, z: 1.2 },
                    'scene.camera.center': { x: 0, y: 0, z: 0 }
                });
            }
        }],
        modeBarStyle: {
            bgcolor: 'rgba(20, 25, 35, 0.9)',
            color: 'rgba(200, 220, 255, 0.8)',
            activecolor: 'rgba(255, 200, 100, 1)'
        }
    };
    
    // Render the plot
    const container = document.getElementById(containerId);
    if (container) {
        Plotly.newPlot(container, traces, layout, config);
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
    
    // Info panel
    ctx.fillStyle = 'rgba(15, 20, 30, 0.95)';
    ctx.fillRect(15, 15, 320, 90);
    
    ctx.strokeStyle = 'rgba(150, 100, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 320, 90);
    
    ctx.fillStyle = 'rgba(200, 150, 255, 1)';
    ctx.font = 'bold 14px "SF Pro Display", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Magnitude |F(s)|', 27, 35);
    
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.font = '11px "SF Pro Text", sans-serif';
    ctx.fillText(`Cross-section at ω = ${omega.toFixed(2)}`, 27, 55);
    
    ctx.fillStyle = 'rgba(150, 180, 255, 0.7)';
    ctx.font = 'italic 10px "SF Pro Text", sans-serif';
    ctx.fillText('Use controls to explore the full 3D surface', 27, 75);
    ctx.fillText('Poles appear as peaks, zeros as valleys', 27, 90);
    
    ctx.restore();
}
