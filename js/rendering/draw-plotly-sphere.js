import { state, zPlaneParams } from '../store/state.js';
import {
    COLOR_SPHERE_GRID, COLOR_PROBE_MARKER, COLOR_PROBE_NEIGHBORHOOD,
    COLOR_PROBE_CONFORMAL_LINE_W_H, COLOR_PROBE_CONFORMAL_LINE_W_V
} from '../constants/colors.js';
import { NUM_POINTS_CURVE, PROBE_CROSSHAIR_SIZE_FACTOR } from '../constants/numerical.js';
import { evaluateMappedTransform, isNumericallyStable, getMappedTransformProfile } from '../math-utils.js';
import { complexToSphere } from '../utils/canvas-utils.js';
import { isRasterInputShape } from '../utils/raster-media.js';
import { generateCurrentMappedInputShapePointSets } from './shape-generators.js';
import { getSpherePointSetColor } from './draw-sphere.js';
import { domainColorForValue } from './domain-coloring.js';


export function pushPlotlyLineTrace(traces, xCoords, yCoords, zCoords, options = {}) {
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

export function appendMappedSphereLineTraces(traces, sourcePoints, transformPoint, options = {}) {
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

    let lastMappedPoint = null;
    const jumpThresholdSq = 1e8;

    sourcePoints.forEach(sourcePoint => {
        if (!sourcePoint || sourcePoint.re === undefined || sourcePoint.im === undefined) {
            flush();
            lastMappedPoint = null;
            return;
        }

        const mappedPoint = transformPoint(sourcePoint);
        if (!mappedPoint || !Number.isFinite(mappedPoint.re) || !Number.isFinite(mappedPoint.im)) {
            flush();
            lastMappedPoint = null;
            return;
        }

        // Jump detection
        if (lastMappedPoint !== null) {
            const distSq = (mappedPoint.re - lastMappedPoint.re) ** 2 + (mappedPoint.im - lastMappedPoint.im) ** 2;
            if (distSq > jumpThresholdSq) {
                flush();
            }
        }
        lastMappedPoint = mappedPoint;

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

export function pushPlotlyMappedPointTrace(traces, mappedPoint, options = {}) {
    if (!mappedPoint || !Number.isFinite(mappedPoint.re) || !Number.isFinite(mappedPoint.im)) return;
    const spherePoint = complexToSphere(mappedPoint.re, mappedPoint.im);
    traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: [spherePoint.x],
        y: [spherePoint.y],
        z: [spherePoint.z],
        marker: { color: options.color || COLOR_SPHERE_GRID, size: options.size || 8 },
        name: options.name || 'Constant mapped value',
        hoverinfo: options.hoverinfo || 'text',
        text: options.text || `w = ${mappedPoint.re.toFixed(3)} + ${mappedPoint.im.toFixed(3)}i`
    });
}



export function getPlotlyMappedData(transformFunc) {
    const traces = [];
    if (isRasterInputShape(state.currentInputShape)) {
        return traces; // CPU Image mapping removed. Plotly 3D Riemann sphere doesn't natively support video textures yet.
    }
    const transformProfile = typeof transformFunc === 'function'
        ? getMappedTransformProfile(state.currentFunction, transformFunc)
        : null;
    
    const sourcePointSets = generateCurrentMappedInputShapePointSets(zPlaneParams, {
            currentFunction: state.currentFunction,
            zetaContinuationEnabled: state.zetaContinuationEnabled,
            curvePoints: NUM_POINTS_CURVE
        });

    if (transformProfile && transformProfile.isConstant) {
        const firstColor = (sourcePointSets.find(set => set && set.color) || {}).color || COLOR_SPHERE_GRID;
        pushPlotlyMappedPointTrace(traces, transformProfile.constantValue, {
            color: firstColor,
            name: 'Constant mapped grid'
        });
        return traces;
    }

        sourcePointSets.forEach(set => {
            appendMappedSphereLineTraces(
                traces,
                set.points,
                sourcePoint => transformProfile
                    ? evaluateMappedTransform(transformProfile, sourcePoint.re, sourcePoint.im)
                    : sourcePoint,
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

        
        const wProbeCenter = transformProfile
            ? evaluateMappedTransform(transformProfile, sourceProbeZ.re, sourceProbeZ.im)
            : transformFunc(sourceProbeZ.re, sourceProbeZ.im);
        if (wProbeCenter && !isNaN(wProbeCenter.re) && !isNaN(wProbeCenter.im) && isFinite(wProbeCenter.re) && isFinite(wProbeCenter.im) && isNumericallyStable(wProbeCenter)) {
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
        appendMappedSphereLineTraces(traces, circlePoints, point => evaluateMappedTransform(transformProfile, point.re, point.im), {
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
        appendMappedSphereLineTraces(traces, horizontalProbePoints, point => evaluateMappedTransform(transformProfile, point.re, point.im), {
            color: COLOR_PROBE_CONFORMAL_LINE_W_H,
            name: 'Probe Crosshair (Horizontal)',
            hoverinfo: 'name'
        });
        appendMappedSphereLineTraces(traces, verticalProbePoints, point => evaluateMappedTransform(transformProfile, point.re, point.im), {
            color: COLOR_PROBE_CONFORMAL_LINE_W_V,
            name: 'Probe Crosshair (Vertical)',
            hoverinfo: 'name'
        });
    }


    return traces;
}


export function getPlotlySphereResolution(runtimeState = state) {
    const outputCount = runtimeState.chainingEnabled
        ? Math.max(1, Math.min(25, Math.floor(runtimeState.chainCount || 1)))
        : 1;
    if (outputCount <= 3) return 200;
    if (outputCount <= 8) return 168;
    return 128;
}

export function buildPlotlySphereMesh(
    runtimeState = state,
    resolution = getPlotlySphereResolution(runtimeState)
) {
    const n = Math.max(24, Math.min(240, Math.floor(resolution)));
    const x = [];
    const y = [];
    const z = [];
    const i = [];
    const j = [];
    const k = [];
    const vertexcolor = runtimeState.domainColoringEnabled ? [] : null;

    for (let lat = 0; lat <= n; lat++) {
        const phi = Math.PI * (-0.5 + lat / n);
        const cosPhi = Math.cos(phi);
        for (let lon = 0; lon <= n; lon++) {
            const theta = 2 * Math.PI * (-0.5 + lon / n);
            const sphereX = cosPhi * Math.cos(theta);
            const sphereY = cosPhi * Math.sin(theta);
            const sphereZ = Math.sin(phi);
            x.push(sphereX);
            y.push(sphereY);
            z.push(sphereZ);

            if (vertexcolor) {
                const denominator = 1 - sphereZ;
                const radius = denominator > 1e-8 ? 1 / denominator : 1e8;
                const wRe = denominator > 1e-8 ? sphereX * radius : Math.cos(theta) * radius;
                const wIm = denominator > 1e-8 ? sphereY * radius : Math.sin(theta) * radius;
                const rgb = domainColorForValue(wRe, wIm, runtimeState);
                vertexcolor.push(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
            }
        }
    }

    for (let lat = 0; lat < n; lat++) {
        for (let lon = 0; lon < n; lon++) {
            const first = lat * (n + 1) + lon;
            const second = first + (n + 1);
            i.push(first, first);
            j.push(second, first + 1);
            k.push(first + 1, second + 1);
        }
    }

    return { x, y, z, i, j, k, vertexcolor };
}

export function renderPlotlyRiemannSphere(transformFunc, targetContainer = null) {
    const plotlyContainer = targetContainer || document.getElementById('w_plane_plotly_container');

    if (!plotlyContainer) {
        console.error('Plotly sphere container not found.');
        return;
    }

    const sphereMesh = buildPlotlySphereMesh(state);
    const sphereTrace = {
        type: 'mesh3d',
        x: sphereMesh.x,
        y: sphereMesh.y,
        z: sphereMesh.z,
        i: sphereMesh.i,
        j: sphereMesh.j,
        k: sphereMesh.k,
        opacity: state.plotlySphereOpacity !== undefined ? state.plotlySphereOpacity : 0.10, 
        ...(sphereMesh.vertexcolor
            ? { vertexcolor: sphereMesh.vertexcolor }
            : { color: '#32325c' }),
        flatshading: false, 
        lighting: {
            ambient: 1,
            diffuse: 0,
            specular: 0,
            roughness: 1,
            fresnel: 0
        },
        lightposition: {x: 50, y: 200, z: 100}, 
        hoverinfo: 'none' 
    };

    const mappedTraces = getPlotlyMappedData(transformFunc);

    const layout = {
        
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 0, pad:0 },
        showlegend: false, 
        uirevision: plotlyContainer.id,
        scene: {
            camera: {
                eye: {x: 0.75, y: 0.75, z: 0.75},
                center: {x: 0, y: 0, z: 0}
            },
            xaxis: {
                title: 'Re(w)', 
                range: [-1.16, 1.16],
                autorange: false,
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
                range: [-1.16, 1.16],
                autorange: false,
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
                range: [-1.16, 1.16],
                autorange: false,
                visible: state.showSphereAxesAndGrid, 
                showgrid: true,
                zeroline: true,
                backgroundcolor: "rgba(10,12,16,0.9)",
                gridcolor: "rgba(100,100,150,0.3)",
                zerolinecolor: "rgba(150,150,200,0.5)",
                tickfont: { color: 'rgba(200,200,220,0.7)'},
                titlefont: { color: 'rgba(200,200,220,0.7)'}
            },
            aspectmode: 'manual',
            aspectratio: {x: 1, y: 1, z: 1},
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

    Plotly.react(plotlyContainer, plotData, layout, {responsive: true, displaylogo: false});
}


export function getPlotlyDynamicGridTraces() {
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
