import { state, context } from '../store/state.js';
import { renderDomainColoringWithWebGL } from './webgl-domain-coloring.js';
import {
    buildPlanarDomainDynamicsSnapshot,
    cancelPlanarDomainDynamics,
    renderPlanarDomainDynamics
} from './domain-dynamics.js';
import { hslToRgb } from './canvas-primitives.js';
import { domainPalettes } from '../ui/theme-manager.js';

const parsedPalettesCache = {};
const DOMAIN_LIGHTNESS_MIN = 0.34;
const DOMAIN_LIGHTNESS_MAX = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_BASE = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_SCALE = 0.28;

function magnitudeLightness(logMod, cycles) {
    if (!Number.isFinite(logMod)) return DOMAIN_LIGHTNESS_MAX;

    if (cycles <= 0.0001) return 0.5;

    const detail = Math.max(0.05, cycles);
    const tone = (2 / Math.PI) * Math.atan(
        logMod * (DOMAIN_LIGHTNESS_DETAIL_BASE + detail * DOMAIN_LIGHTNESS_DETAIL_SCALE)
    );

    return DOMAIN_LIGHTNESS_MIN + (DOMAIN_LIGHTNESS_MAX - DOMAIN_LIGHTNESS_MIN) * tone;
}

function getDomainColoringEvaluator(isWPC, map) {
    if (isWPC) {
        return (x, y) => ({ re: x, im: y });
    }
    return typeof map?.evaluate === 'function'
        ? map.evaluate
        : () => ({ re: NaN, im: NaN });
}

function cancelZPlaneDynamicsIfNeeded(isWPlaneColoring) {
    if (!isWPlaneColoring) cancelPlanarDomainDynamics();
}

function parsePaletteColors(colorsStr) {
    return colorsStr.split(/,\s*(?![^(]*\))/).map(s => {
        s = s.trim();
        if (s.startsWith('hsl')) {
            const match = s.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]) / 360;
                const sat = parseInt(match[2]) / 100;
                const l = parseInt(match[3]) / 100;
                let r, g, b;
                if (sat === 0) {
                    r = g = b = l;
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                return [r, g, b];
            }
            return [0, 0, 0];
        } else if (s.startsWith('rgb')) {
            const match = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return [
                    parseInt(match[1]) / 255,
                    parseInt(match[2]) / 255,
                    parseInt(match[3]) / 255
                ];
            }
            return [0, 0, 0];
        } else if (s.startsWith('#')) {
            const hex = s.substring(1);
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            return [r, g, b];
        }
        return [0, 0, 0];
    });
}

export function getDomainColorPlaneKey(targetCtx) {
    if (targetCtx === context.zDomainColorCtx) return 'z';
    if (targetCtx === context.wDomainColorCtx) return 'w';
    return 'z';
}

export function renderPlanarDomainColoring(tCtx, pP, isWPC, map) {
    const w = pP.width; const h = pP.height; if (w === 0 || h === 0) return;

    if (context.domainColoringDirty) {
        cancelPlanarDomainDynamics();
    }

    const dynamicsSnapshot = map?.presentation === 'derivative'
        ? null
        : buildPlanarDomainDynamicsSnapshot(state, pP, { isWPlaneColoring: !!isWPC });
    if (dynamicsSnapshot && renderPlanarDomainDynamics(tCtx, pP, dynamicsSnapshot)) {
        return;
    }

    const ok = renderDomainColoringWithWebGL(tCtx, pP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: null,
        map
    });
    if (ok) {
        cancelZPlaneDynamicsIfNeeded(isWPC);
        return;
    }

    cancelZPlaneDynamicsIfNeeded(isWPC);
    renderPlanarDomainColoringCPU(tCtx, pP, isWPC, map);
}

export function renderSphereDomainColoring(tCtx, cSP, cDOMP, isWPC, map) {
    const w = cDOMP.width; const h = cDOMP.height; if (w === 0 || h === 0) return;
    const ok = renderDomainColoringWithWebGL(tCtx, cDOMP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: cSP,
        map
    });
    if (!ok) {
        renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, map);
    }
}

export function inverseRotate3D(x, y, z, rotX, rotY) {
    const cY = Math.cos(-rotY);
    const sY = Math.sin(-rotY);
    const cX = Math.cos(-rotX);
    const sX = Math.sin(-rotX);
    const y1 = y * cX - z * sX;
    const z1 = y * sX + z * cX;
    const rx = x * cY + z1 * sY;
    const ry = y1;
    const rz = -x * sY + z1 * cY;
    return { x: rx, y: ry, z: rz };
}

export function getPaletteColor(paletteId, h) {
    if (paletteId === 'classic') {
        const rgb = hslToRgb(h, 1.0, 0.5);
        return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
    }

    const palette = domainPalettes.find(p => p.id === paletteId) || domainPalettes[0];
    if (!parsedPalettesCache[palette.id]) {
        parsedPalettesCache[palette.id] = parsePaletteColors(palette.colors);
    }
    const stops = parsedPalettesCache[palette.id];
    const n = stops.length;
    const val = h * (n - 1);
    const idx = Math.min(n - 2, Math.floor(val));
    const t = val - idx;
    
    const cA = stops[idx];
    const cB = stops[idx + 1];
    
    return [
        cA[0] * (1 - t) + cB[0] * t,
        cA[1] * (1 - t) + cB[1] * t,
        cA[2] * (1 - t) + cB[2] * t
    ];
}

export function applyLightnessAndSaturation(rgb, L, S) {
    let r = rgb[0];
    let g = rgb[1];
    let b = rgb[2];

    // Apply lightness L
    if (L < 0.5) {
        const t = L / 0.5;
        r *= t;
        g *= t;
        b *= t;
    } else {
        const t = (L - 0.5) / 0.5;
        r = r * (1 - t) + t;
        g = g * (1 - t) + t;
        b = b * (1 - t) + t;
    }

    // Apply saturation S
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray * (1 - S) + r * S;
    g = gray * (1 - S) + g * S;
    b = gray * (1 - S) + b * S;

    return [
        Math.min(255, Math.max(0, Math.round(r * 255))),
        Math.min(255, Math.max(0, Math.round(g * 255))),
        Math.min(255, Math.max(0, Math.round(b * 255)))
    ];
}

export function domainColorForValue(re, im, runtimeState) {
    const phase = Math.atan2(im, re);
    const modValue = Math.hypot(re, im);
    if (!Number.isFinite(modValue)) return [0, 0, 0];

    const logMod = Math.log1p(modValue);
    const cycles = (runtimeState && Number.isFinite(runtimeState.domainLightnessCycles)) ? runtimeState.domainLightnessCycles : 0;
    const lBase = magnitudeLightness(logMod, cycles);

    const contrast = (runtimeState && Number.isFinite(runtimeState.domainContrast)) ? runtimeState.domainContrast : 1;
    const brightness = (runtimeState && Number.isFinite(runtimeState.domainBrightness)) ? runtimeState.domainBrightness : 1;
    const saturation = (runtimeState && Number.isFinite(runtimeState.domainSaturation)) ? runtimeState.domainSaturation : 1;

    const lContrasted = 0.5 + (lBase - 0.5) * contrast;
    const lFinal = Math.min(0.95, Math.max(0.05, lContrasted * brightness));
    const sFinal = Math.min(1.0, Math.max(0.0, saturation));
    let h = (phase / (2.0 * Math.PI)) % 1.0;
    if (h < 0) h += 1.0;

    const paletteId = (runtimeState && runtimeState.domainPalette) ? runtimeState.domainPalette : 'calming';
    const baseColor = getPaletteColor(paletteId, h);
    return applyLightnessAndSaturation(baseColor, lFinal, sFinal);
}

export function renderConstantPlanarDomainColoring(tCtx, pP, value) {
    const rgb = domainColorForValue(value.re, value.im, state);
    tCtx.save();
    tCtx.setTransform(1, 0, 0, 1, 0, 0);
    tCtx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    tCtx.fillRect(0, 0, pP.width, pP.height);
    tCtx.restore();
}

export function renderPlanarDomainColoringCPU(tCtx, pP, isWPC, map) {
    const targetW = pP.width;
    const targetH = pP.height;
    const w = Math.max(1, Math.floor(targetW));
    const h = Math.max(1, Math.floor(targetH));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const imgData = tempCtx.createImageData(w, h);
    const data = imgData.data;

    const xRange = pP.currentVisXRange || pP.xRange;
    const yRange = pP.currentVisYRange || pP.yRange;

    const evalFunc = getDomainColoringEvaluator(isWPC, map);

    for (let py = 0; py < h; py++) {
        const unitY = py / h;
        const imZ = yRange[1] - unitY * (yRange[1] - yRange[0]);
        for (let px = 0; px < w; px++) {
            const unitX = px / w;
            const reZ = xRange[0] + unitX * (xRange[1] - xRange[0]);

            const mapped = evalFunc(reZ, imZ);
            const rgb = (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im))
                ? [0, 0, 0]
                : domainColorForValue(mapped.re, mapped.im, state);

            const idx = (py * w + px) * 4;
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }
    tempCtx.putImageData(imgData, 0, 0);

    tCtx.save();
    tCtx.setTransform(1, 0, 0, 1, 0, 0);
    tCtx.clearRect(0, 0, targetW, targetH);
    tCtx.imageSmoothingEnabled = true;
    tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, targetW, targetH);
    tCtx.restore();
}

export function renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, map) {
    const targetW = cDOMP.width;
    const targetH = cDOMP.height;
    const w = Math.max(1, Math.floor(targetW));
    const h = Math.max(1, Math.floor(targetH));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const imgData = tempCtx.createImageData(w, h);
    const data = imgData.data;

    const sCenterX = cSP.centerX;
    const sCenterY = cSP.centerY;
    const sRadius = cSP.radius;
    const rotX = cSP.rotX || 0;
    const rotY = cSP.rotY || 0;

    const evalFunc = getDomainColoringEvaluator(isWPC, map);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const nx = (px - sCenterX) / sRadius;
            const ny = -(py - sCenterY) / sRadius;
            const radialSq = nx * nx + ny * ny;

            const idx = (py * w + px) * 4;
            if (radialSq > 1.0 || sRadius <= 0) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
                data[idx + 3] = 0;
                continue;
            }

            const pz = Math.sqrt(Math.max(0.0, 1.0 - radialSq));
            const pt = inverseRotate3D(nx, ny, pz, rotX, rotY);
            const den = 1.0 - pt.z;

            let reZ, imZ;
            if (Math.abs(den) < 1e-6) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
                data[idx + 3] = 0;
                continue;
            } else {
                reZ = pt.x / den;
                imZ = pt.y / den;
            }

            const mapped = evalFunc(reZ, imZ);
            const rgb = (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im))
                ? [0, 0, 0]
                : domainColorForValue(mapped.re, mapped.im, state);

            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }
    tempCtx.putImageData(imgData, 0, 0);

    tCtx.save();
    tCtx.setTransform(1, 0, 0, 1, 0, 0);
    tCtx.clearRect(0, 0, targetW, targetH);
    tCtx.imageSmoothingEnabled = true;
    tCtx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, targetW, targetH);
    tCtx.restore();
}
