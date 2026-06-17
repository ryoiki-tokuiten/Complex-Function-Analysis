import { state, context } from '../store/state.js';
import {
    getMappedTransformProfile,
    getEffectiveBaseTransformFunction,
    evaluateMappedTransform,
    evaluateDomainColoringMappedTransform
} from '../math-utils.js';
import { renderDomainColoringWithWebGL } from './webgl-domain-coloring.js';
import { hslToRgb } from './canvas-primitives.js';
import { domainPalettes } from '../ui/theme-manager.js';

const parsedPalettesCache = {};
const DOMAIN_LIGHTNESS_MIN = 0.34;
const DOMAIN_LIGHTNESS_MAX = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_BASE = 0.72;
const DOMAIN_LIGHTNESS_DETAIL_SCALE = 0.28;
const DYNAMICS_ESCAPE_RADIUS = 64;
const DYNAMICS_ESCAPE_RADIUS_SQ = DYNAMICS_ESCAPE_RADIUS * DYNAMICS_ESCAPE_RADIUS;
const DYNAMICS_CHAIN_LIMIT = 105;

function magnitudeLightness(logMod, cycles) {
    if (!Number.isFinite(logMod)) return DOMAIN_LIGHTNESS_MAX;

    if (cycles <= 0.0001) return 0.5;

    const detail = Math.max(0.05, cycles);
    const tone = (2 / Math.PI) * Math.atan(
        logMod * (DOMAIN_LIGHTNESS_DETAIL_BASE + detail * DOMAIN_LIGHTNESS_DETAIL_SCALE)
    );

    return DOMAIN_LIGHTNESS_MIN + (DOMAIN_LIGHTNESS_MAX - DOMAIN_LIGHTNESS_MIN) * tone;
}

function getDomainColoringEvaluator(isWPC, sourceProfile, sTF) {
    if (isWPC) {
        return (x, y) => ({ re: x, im: y });
    }
    if (sourceProfile) {
        return (x, y) => evaluateDomainColoringMappedTransform(sourceProfile, x, y, state.currentFunction) || { re: NaN, im: NaN };
    }
    if (typeof sTF === 'function') {
        return (x, y) => evaluateDomainColoringMappedTransform(sTF, x, y, state.currentFunction) || { re: NaN, im: NaN };
    }
    return (x, y) => ({ re: x, im: y });
}

function isFiniteComplex(value) {
    return !!value && Number.isFinite(value.re) && Number.isFinite(value.im);
}

function shouldUseIteratedDynamicsColoring(isWPC) {
    return !isWPC &&
        state.chainingEnabled &&
        state.chainCount > 1 &&
        (state.chainingMode === 'recursion' || state.chainingMode === 'zero_seed');
}

function evaluateDynamicsStep(value, parameter, sourceProfile, sTF) {
    try {
        if (sourceProfile) {
            return evaluateMappedTransform(
                sourceProfile,
                value.re,
                value.im,
                state.currentFunction,
                { c: parameter }
            );
        }

        if (typeof sTF === 'function') {
            return sTF(value.re, value.im);
        }
    } catch (_error) {
        return null;
    }

    return null;
}

function dynamicsEscapeColor(smoothIteration, count, runtimeState) {
    const t = Math.max(0, Math.min(1, smoothIteration / Math.max(1, count)));
    const paletteId = runtimeState?.domainPalette || 'analytic-base';
    const baseColor = getPaletteColor(paletteId, Math.min(t, 0.9999));
    const lightnessBase = 0.22 + 0.58 * Math.pow(t, 0.65);
    const contrast = Number.isFinite(runtimeState?.domainContrast) ? runtimeState.domainContrast : 1;
    const brightness = Number.isFinite(runtimeState?.domainBrightness) ? runtimeState.domainBrightness : 1;
    const saturation = Number.isFinite(runtimeState?.domainSaturation) ? runtimeState.domainSaturation : 1;
    const lightness = Math.min(0.95, Math.max(0.05, (0.5 + (lightnessBase - 0.5) * contrast) * brightness));

    return applyLightnessAndSaturation(baseColor, lightness, Math.min(1, Math.max(0, saturation)));
}

function iteratedDynamicsColorForPoint(re, im, sourceProfile, sTF) {
    const count = Math.max(1, Math.min(DYNAMICS_CHAIN_LIMIT, Math.floor(Number(state.chainCount) || 1)));
    const parameter = { re, im };
    let current = state.chainingMode === 'zero_seed' ? { re: 0, im: 0 } : parameter;
    let smoothIteration = count;
    let escaped = false;

    for (let i = 0; i < count; i++) {
        const next = evaluateDynamicsStep(current, parameter, sourceProfile, sTF);
        const valid = isFiniteComplex(next);
        const magSq = valid ? next.re * next.re + next.im * next.im : DYNAMICS_ESCAPE_RADIUS_SQ;
        const tooLarge = valid && (
            magSq > DYNAMICS_ESCAPE_RADIUS_SQ ||
            Math.max(Math.abs(next.re), Math.abs(next.im)) >= 1e18
        );

        if (!valid || tooLarge) {
            const magnitude = Math.sqrt(Math.max(magSq, DYNAMICS_ESCAPE_RADIUS));
            smoothIteration = i + 1;

            if (valid && Number.isFinite(magnitude) && magnitude > 1.0001) {
                const smoothAdjust = Math.log(
                    Math.max(Math.log(magnitude) / Math.log(DYNAMICS_ESCAPE_RADIUS), 1e-6)
                ) / Math.LN2;
                smoothIteration = Math.max(0, Math.min(count, smoothIteration - smoothAdjust));
            }

            escaped = true;
            break;
        }

        current = next;
    }

    return escaped ? dynamicsEscapeColor(smoothIteration, count, state) : [0, 0, 0];
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

export function renderPlanarDomainColoring(tCtx, pP, isWPC, sTF) {
    const w = pP.width; const h = pP.height; if (w === 0 || h === 0) return;
    const profileTransform = state.chainingEnabled
        ? getEffectiveBaseTransformFunction(state.currentFunction)
        : sTF;
    const sourceProfile = (!isWPC && typeof profileTransform === 'function')
        ? getMappedTransformProfile(state.currentFunction, profileTransform)
        : null;
    if (sourceProfile && sourceProfile.isConstant && !state.chainingEnabled) {
        renderConstantPlanarDomainColoring(tCtx, pP, sourceProfile.constantValue);
        return;
    }
    const ok = renderDomainColoringWithWebGL(tCtx, pP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: null,
        sourceTransformFn: sTF
    });
    if (!ok) {
        renderPlanarDomainColoringCPU(tCtx, pP, isWPC, sTF, sourceProfile);
    }
}

export function renderSphereDomainColoring(tCtx, cSP, cDOMP, isWPC, sTF) {
    const w = cDOMP.width; const h = cDOMP.height; if (w === 0 || h === 0) return;
    const profileTransform = state.chainingEnabled
        ? getEffectiveBaseTransformFunction(state.currentFunction)
        : sTF;
    const sourceProfile = (!isWPC && typeof profileTransform === 'function')
        ? getMappedTransformProfile(state.currentFunction, profileTransform)
        : null;
    if (sourceProfile && sourceProfile.isConstant && !state.chainingEnabled) {
        renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, sTF, sourceProfile);
        return;
    }
    const ok = renderDomainColoringWithWebGL(tCtx, cDOMP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: cSP,
        sourceTransformFn: sTF
    });
    if (!ok) {
        renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, sTF, sourceProfile);
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
    const modValue = Math.sqrt(re * re + im * im);
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
    let h = ((phase + Math.PI) / (2.0 * Math.PI)) % 1.0;
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

export function renderPlanarDomainColoringCPU(tCtx, pP, isWPC, sTF, sourceProfile = null) {
    const targetW = pP.width;
    const targetH = pP.height;
    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning)
    ));
    const ds = isInteracting ? 3 : 2;
    const w = Math.max(1, Math.floor(targetW / ds));
    const h = Math.max(1, Math.floor(targetH / ds));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const imgData = tempCtx.createImageData(w, h);
    const data = imgData.data;

    const xRange = pP.currentVisXRange || pP.xRange;
    const yRange = pP.currentVisYRange || pP.yRange;

    const evalFunc = getDomainColoringEvaluator(isWPC, sourceProfile, sTF);
    const useDynamicsColoring = shouldUseIteratedDynamicsColoring(isWPC);

    for (let py = 0; py < h; py++) {
        const unitY = py / h;
        const imZ = yRange[1] - unitY * (yRange[1] - yRange[0]);
        for (let px = 0; px < w; px++) {
            const unitX = px / w;
            const reZ = xRange[0] + unitX * (xRange[1] - xRange[0]);

            let rgb;
            if (useDynamicsColoring) {
                rgb = iteratedDynamicsColorForPoint(reZ, imZ, sourceProfile, sTF);
            } else {
                const mapped = evalFunc(reZ, imZ);

                if (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im)) {
                    rgb = [0, 0, 0];
                } else {
                    rgb = domainColorForValue(mapped.re, mapped.im, state);
                }
            }

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

export function renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, sTF, sourceProfile = null) {
    const targetW = cDOMP.width;
    const targetH = cDOMP.height;
    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning)
    ));
    const ds = isInteracting ? 3 : 2;
    const w = Math.max(1, Math.floor(targetW / ds));
    const h = Math.max(1, Math.floor(targetH / ds));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const imgData = tempCtx.createImageData(w, h);
    const data = imgData.data;

    const sCenterX = cSP.centerX / ds;
    const sCenterY = cSP.centerY / ds;
    const sRadius = cSP.radius / ds;
    const rotX = cSP.rotX || 0;
    const rotY = cSP.rotY || 0;

    const evalFunc = getDomainColoringEvaluator(isWPC, sourceProfile, sTF);
    const useDynamicsColoring = shouldUseIteratedDynamicsColoring(isWPC);

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

            let rgb;
            if (useDynamicsColoring) {
                rgb = iteratedDynamicsColorForPoint(reZ, imZ, sourceProfile, sTF);
            } else {
                const mapped = evalFunc(reZ, imZ);

                if (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im)) {
                    rgb = [0, 0, 0];
                } else {
                    rgb = domainColorForValue(mapped.re, mapped.im, state);
                }
            }

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
