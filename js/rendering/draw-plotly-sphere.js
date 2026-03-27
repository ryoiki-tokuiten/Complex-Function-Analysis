
function pushPlotlyLineTrace(traces, xCoords, yCoords, zCoords, options = {}) {
    if (xCoords.length < 2) {
        return;
    }

    traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: [...xCoords],
        y: [...yCoords],
        z: [...zCoords],
        text: options.text ? [...options.text] : undefined,
        name: options.name,
        line: {
            color: options.color || '#FFFFFF',
            width: options.width || 2,
            shape: options.shape || 'spline'
        },
        hoverinfo: options.hoverinfo || 'text'
    });
}

function appendMappedSphereLineTraces(traces, sourcePoints, transformPoint, options = {}) {
    const xCoords = [];
    const yCoords = [];
    const zCoords = [];
    const textCoords = [];

    const flush = () => {
        pushPlotlyLineTrace(traces, xCoords, yCoords, zCoords, {
            color: options.color,
            name: options.name,
            text: options.includeText ? textCoords : undefined,
            hoverinfo: options.hoverinfo,
            shape: options.shape
        });
        xCoords.length = 0;
        yCoords.length = 0;
        zCoords.length = 0;
        textCoords.length = 0;
    };

    sourcePoints.forEach(sourcePoint => {
        if (!sourcePoint || sourcePoint.re === undefined || sourcePoint.im === undefined) {
            flush();
            return;
        }

        const mappedPoint = transformPoint(sourcePoint);
        if (!mappedPoint || !Number.isFinite(mappedPoint.re) || !Number.isFinite(mappedPoint.im)) {
            flush();
            return;
        }

        const spherePoint = complexToSphere(mappedPoint.re, mappedPoint.im);
        xCoords.push(spherePoint.x);
        yCoords.push(spherePoint.y);
        zCoords.push(spherePoint.z);

        if (options.includeText) {
            textCoords.push(`w = ${mappedPoint.re.toFixed(3)} + ${mappedPoint.im.toFixed(3)}i`);
        }
    });

    flush();
}

function getPlotlyMappedData(transformFunc) {
    const traces = [];
    const sourcePointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
        currentFunction: state.currentFunction,
        zetaContinuationEnabled: state.zetaContinuationEnabled,
        curvePoints: NUM_POINTS_CURVE
    });

    sourcePointSets.forEach(set => {
        appendMappedSphereLineTraces(
            traces,
            set.points,
            sourcePoint => {
                if (state.currentFunction === 'zeta' && !state.zetaContinuationEnabled && sourcePoint.re <= ZETA_REFLECTION_POINT_RE) {
                    return null;
                }
                return transformFunc ? transformFunc(sourcePoint.re, sourcePoint.im) : sourcePoint;
            },
            {
                color: getSpherePointSetColor(set, true),
                includeText: true,
                hoverinfo: 'text',
                shape: 'spline'
            }
        );
    });

    
    if (state.probeActive && state.probeZ) {
        const sourceProbeZ = state.probeZ;
        const neighborhoodSize = state.probeNeighborhoodSize;

        
        const wProbeCenter = transformFunc(sourceProbeZ.re, sourceProbeZ.im);
        if (!isNaN(wProbeCenter.re) && !isNaN(wProbeCenter.im) && isFinite(wProbeCenter.re) && isFinite(wProbeCenter.im)) {
            const sphereProbeCenter = complexToSphere(wProbeCenter.re, wProbeCenter.im);
            traces.push({
                type: 'scatter3d', mode: 'markers',
                x: [sphereProbeCenter.x], y: [sphereProbeCenter.y], z: [sphereProbeCenter.z],
                marker: { color: COLOR_PROBE_MARKER, size: 8 },
                name: `Probe: w=f(${sourceProbeZ.re.toFixed(2)}+${sourceProbeZ.im.toFixed(2)}i)`
            });
        }

        
        const n_pts_circle = 30;
        const circlePoints = [];
        for (let i = 0; i <= n_pts_circle; i++) {
            const angle = (i / n_pts_circle) * 2 * Math.PI;
            circlePoints.push({
                re: sourceProbeZ.re + neighborhoodSize * Math.cos(angle),
                im: sourceProbeZ.im + neighborhoodSize * Math.sin(angle)
            });
        }
        appendMappedSphereLineTraces(traces, circlePoints, point => transformFunc(point.re, point.im), {
            color: COLOR_PROBE_NEIGHBORHOOD,
            name: 'Probe Neighborhood',
            hoverinfo: 'name'
        });

        const h_segment = neighborhoodSize / PROBE_CROSSHAIR_SIZE_FACTOR;
        const horizontalProbePoints = [];
        const verticalProbePoints = [];
        for (let i = -1; i <= 1; i += 0.1) {
            horizontalProbePoints.push({ re: sourceProbeZ.re + i * h_segment, im: sourceProbeZ.im });
            verticalProbePoints.push({ re: sourceProbeZ.re, im: sourceProbeZ.im + i * h_segment });
        }
        appendMappedSphereLineTraces(traces, horizontalProbePoints, point => transformFunc(point.re, point.im), {
            color: COLOR_PROBE_CONFORMAL_LINE_W_H,
            name: 'Probe Crosshair (Horizontal)',
            hoverinfo: 'name'
        });
        appendMappedSphereLineTraces(traces, verticalProbePoints, point => transformFunc(point.re, point.im), {
            color: COLOR_PROBE_CONFORMAL_LINE_W_V,
            name: 'Probe Crosshair (Vertical)',
            hoverinfo: 'name'
        });
    }


    return traces;
}


function renderPlotlyRiemannSphere(transformFunc) {
    const containerId = 'w_plane_plotly_container';
    const plotlyContainer = document.getElementById(containerId);

    if (!plotlyContainer) {
        console.error('Plotly container not found:', containerId);
        return;
    }

    
    const n = 300; 
    const xSphere = [], ySphere = [], zSphere = [];
    const iSphere = [], jSphere = [], kSphere = [];

    for (let lat = 0; lat <= n; lat++) {
        const phi = Math.PI * (-0.5 + lat / n); 
        const cosPhi = Math.cos(phi);
        for (let lon = 0; lon <= n; lon++) {
            const theta = 2 * Math.PI * (-0.5 + lon / n); 
            xSphere.push(cosPhi * Math.cos(theta));
            ySphere.push(cosPhi * Math.sin(theta));
            zSphere.push(Math.sin(phi));
        }
    }

    for (let lat = 0; lat < n; lat++) {
        for (let lon = 0; lon < n; lon++) {
            const first = lat * (n + 1) + lon;
            const second = first + (n + 1);
            iSphere.push(first, first);
            jSphere.push(second, first + 1);
            kSphere.push(first + 1, second + 1);
        }
    }

    const sphereTrace = {
        type: 'mesh3d',
        x: xSphere,
        y: ySphere,
        z: zSphere,
        i: iSphere,
        j: jSphere,
        k: kSphere,
        opacity: state.plotlySphereOpacity !== undefined ? state.plotlySphereOpacity : 0.10, 
        color: '#32325c',
        flatshading: false, 
        lighting: {
            ambient: 0.5,    
            diffuse: 1.0,    
            specular: 0.7,   
            roughness: 0.3,  
            fresnel: 0.8     
        },
        lightposition: {x: 50, y: 200, z: 100}, 
        hoverinfo: 'none' 
    };

    const mappedTraces = getPlotlyMappedData(transformFunc);

    const layout = {
        
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 0, pad:0 },
        showlegend: false, 
        scene: {
            camera: {
                eye: {x: 1.25, y: 1.25, z: 1.25}
            },
            xaxis: {
                title: 'Re(w)', 
                visible: state.showSphereAxesAndGrid, 
                showgrid: true, 
                zeroline: true,
                backgroundcolor: "rgba(10,12,16,0.9)",
                gridcolor: "rgba(100,100,150,0.3)",
                zerolinecolor: "rgba(150,150,200,0.5)",
                tickfont: { color: 'rgba(200,200,220,0.7)'},
                titlefont: { color: 'rgba(200,200,220,0.7)'}
            },
            yaxis: {
                title: 'Im(w)', 
                visible: state.showSphereAxesAndGrid, 
                showgrid: true,
                zeroline: true,
                backgroundcolor: "rgba(10,12,16,0.9)",
                gridcolor: "rgba(100,100,150,0.3)",
                zerolinecolor: "rgba(150,150,200,0.5)",
                tickfont: { color: 'rgba(200,200,220,0.7)'},
                titlefont: { color: 'rgba(200,200,220,0.7)'}
            },
            zaxis: {
                title: 'Z (Sphere axis)', 
                visible: state.showSphereAxesAndGrid, 
                showgrid: true,
                zeroline: true,
                backgroundcolor: "rgba(10,12,16,0.9)",
                gridcolor: "rgba(100,100,150,0.3)",
                zerolinecolor: "rgba(150,150,200,0.5)",
                tickfont: { color: 'rgba(200,200,220,0.7)'},
                titlefont: { color: 'rgba(200,200,220,0.7)'}
            },
            aspectmode: 'cube', 
            bgcolor: "rgba(10,12,16,1.0)" 
        },
        paper_bgcolor: 'rgba(0,0,0,0)', 
        plot_bgcolor: 'rgba(0,0,0,0)'   
    };

    let dynamicGridTraces = [];
    
    const showGrid = state.showPlotlySphereGrid === undefined ? true : state.showPlotlySphereGrid;
    if (showGrid) {
        dynamicGridTraces = getPlotlyDynamicGridTraces();
    }
    const plotData = [sphereTrace, ...mappedTraces, ...dynamicGridTraces];

    Plotly.react(containerId, plotData, layout, {responsive: true, displaylogo: false});
}


function getPlotlyDynamicGridTraces() {
    const traces = [];
    const numPointsPerLine = 250; 
    const gridColor = 'rgba(150, 150, 180, 0.4)';
    const gridLineWidth = 1;

    const baseGridDensity = state.plotlyGridDensity !== undefined ? state.plotlyGridDensity : 12;

    
    let dynamicFactor = 1.0;
    if (zPlaneParams && zPlaneParams.currentVisXRange && zPlaneParams.currentVisYRange) {
        const currentWidth = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
        
        const referenceWidth = 4.0;
        if (currentWidth > 0 && referenceWidth > 0) {
            
            
            dynamicFactor = referenceWidth / currentWidth;
        }
    }

    
    
    
    
    if (dynamicFactor < 0) dynamicFactor = 1; 
    let scaledDynamicFactor = Math.sqrt(dynamicFactor);

    
    const minEffectiveDensity = 4;  
    const maxEffectiveDensity = 40; 

    let effectiveGridDensity = Math.round(baseGridDensity * scaledDynamicFactor);
    effectiveGridDensity = Math.max(minEffectiveDensity, Math.min(maxEffectiveDensity, effectiveGridDensity));

    
    
    const numParallels = Math.max(2, Math.floor(effectiveGridDensity / 2)); 
    for (let k = 1; k <= numParallels; k++) {
        const R = Math.tan((k / (numParallels + 1)) * (Math.PI / 2));
        if (R > 100) continue; 

        const xCoords = [], yCoords = [], zCoords = [];
        for (let i = 0; i <= numPointsPerLine; i++) {
            const theta = (i / numPointsPerLine) * 2 * Math.PI;
            const w_re = R * Math.cos(theta);
            const w_im = R * Math.sin(theta);
            const spherePoint = complexToSphere(w_re, w_im);
            xCoords.push(spherePoint.x);
            yCoords.push(spherePoint.y);
            zCoords.push(spherePoint.z);
        }
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: xCoords, y: yCoords, z: zCoords,
            line: { color: gridColor, width: gridLineWidth },
            hoverinfo: 'none',
            name: `Grid |w|=${R.toFixed(2)}`
        });
    }

    
    const numMeridians = Math.max(4, effectiveGridDensity); 
    const maxMeridianRadius = 20; 
    for (let j = 0; j < numMeridians; j++) {
        const alpha = (j / numMeridians) * 2 * Math.PI;
        const xCoords = [], yCoords = [], zCoords = [];
        for (let i = 0; i <= numPointsPerLine; i++) {
            const r = (i / numPointsPerLine) * maxMeridianRadius;
            const w_re = r * Math.cos(alpha);
            const w_im = r * Math.sin(alpha);
            const spherePoint = complexToSphere(w_re, w_im);
            xCoords.push(spherePoint.x);
            yCoords.push(spherePoint.y);
            zCoords.push(spherePoint.z);
        }
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: xCoords, y: yCoords, z: zCoords,
            line: { color: gridColor, width: gridLineWidth },
            hoverinfo: 'none',
            name: `Grid arg(w)=${(alpha * 180 / Math.PI).toFixed(0)}deg`
        });
    }
    return traces;
}
