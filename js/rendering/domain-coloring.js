import { state, context } from '../store/state.js';
import { getMappedTransformProfile, evaluateMappedTransform } from '../math-utils.js';
import { renderDomainColoringWithWebGL } from './webgl-domain-coloring.js';
import { hslToRgb } from './canvas-primitives.js';

export function getDomainColorPlaneKey(targetCtx) {
    if (targetCtx === context.zDomainColorCtx) return 'z';
    if (targetCtx === context.wDomainColorCtx) return 'w';
    return 'z';
}

export function renderPlanarDomainColoring(tCtx, pP, isWPC, sTF) {
    const w = pP.width; const h = pP.height; if (w === 0 || h === 0) return;
    const sourceProfile = (!isWPC && typeof sTF === 'function')
        ? getMappedTransformProfile(state.currentFunction, sTF)
        : null;
    if (sourceProfile && sourceProfile.isConstant) {
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
    const sourceProfile = (!isWPC && typeof sTF === 'function')
        ? getMappedTransformProfile(state.currentFunction, sTF)
        : null;
    if (sourceProfile && sourceProfile.isConstant) {
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

    let c0, c1, c2, c3;
    if (paletteId === 'purple') {
        c0 = [0.039, 0.020, 0.078];
        c1 = [0.431, 0.275, 0.745];
        c2 = [0.863, 0.784, 1.0];
        c3 = [0.157, 0.078, 0.353];
    } else if (paletteId === 'green') {
        c0 = [0.020, 0.059, 0.039];
        c1 = [0.059, 0.471, 0.373];
        c2 = [0.784, 0.961, 0.863];
        c3 = [0.686, 0.941, 0.039];
    } else { // 'calming'
        c0 = [0.137, 0.071, 0.071];
        c1 = [0.725, 0.431, 0.373];
        c2 = [0.922, 0.863, 0.824];
        c3 = [0.451, 0.235, 0.204];
    }

    let r, g, b;
    if (h < 0.25) {
        const t = h / 0.25;
        r = c0[0] * (1 - t) + c1[0] * t;
        g = c0[1] * (1 - t) + c1[1] * t;
        b = c0[2] * (1 - t) + c1[2] * t;
    } else if (h < 0.5) {
        const t = (h - 0.25) / 0.25;
        r = c1[0] * (1 - t) + c2[0] * t;
        g = c1[1] * (1 - t) + c2[1] * t;
        b = c1[2] * (1 - t) + c2[2] * t;
    } else if (h < 0.75) {
        const t = (h - 0.5) / 0.25;
        r = c2[0] * (1 - t) + c3[0] * t;
        g = c2[1] * (1 - t) + c3[1] * t;
        b = c2[2] * (1 - t) + c3[2] * t;
    } else {
        const t = (h - 0.75) / 0.25;
        r = c3[0] * (1 - t) + c0[0] * t;
        g = c3[1] * (1 - t) + c0[1] * t;
        b = c3[2] * (1 - t) + c0[2] * t;
    }
    return [r, g, b];
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

    const LOG_TWO = 0.6931471805599453;
    const logMod = Math.log(1.0 + modValue);
    const cycles = (runtimeState && Number.isFinite(runtimeState.domainLightnessCycles)) ? runtimeState.domainLightnessCycles : 1;
    const lightnessAngle = (logMod / LOG_TWO) * cycles * 2.0 * Math.PI;
    let lBase = 0.5 + Math.sin(lightnessAngle) * 0.25;
    if (logMod < -10.0) lBase = 0.0;

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
    const isHighQuality = !!(state && state.isHighQualityCpuRender);
    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning)
    ));
    const ds = isHighQuality ? 1 : (isInteracting ? 3 : 2);
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

    for (let py = 0; py < h; py++) {
        const unitY = py / h;
        const imZ = yRange[1] - unitY * (yRange[1] - yRange[0]);
        for (let px = 0; px < w; px++) {
            const unitX = px / w;
            const reZ = xRange[0] + unitX * (xRange[1] - xRange[0]);

            let mapped;
            if (isWPC) {
                mapped = { re: reZ, im: imZ };
            } else if (sourceProfile) {
                mapped = evaluateMappedTransform(sourceProfile, reZ, imZ);
            } else {
                if (typeof sTF === 'function') {
                    mapped = sTF(reZ, imZ);
                } else {
                    mapped = { re: reZ, im: imZ };
                }
            }

            let rgb;
            if (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im)) {
                rgb = [0, 0, 0];
            } else {
                rgb = domainColorForValue(mapped.re, mapped.im, state);
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
    const isHighQuality = !!(state && state.isHighQualityCpuRender);
    const isInteracting = !!(state && (
        (state.panStateZ && state.panStateZ.isPanning) ||
        (state.panStateW && state.panStateW.isPanning)
    ));
    const ds = isHighQuality ? 1 : (isInteracting ? 3 : 2);
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

            let mapped;
            if (isWPC) {
                mapped = { re: reZ, im: imZ };
            } else if (sourceProfile) {
                mapped = evaluateMappedTransform(sourceProfile, reZ, imZ);
            } else {
                if (typeof sTF === 'function') {
                    mapped = sTF(reZ, imZ);
                } else {
                    mapped = { re: reZ, im: imZ };
                }
            }

            let rgb;
            if (!mapped || isNaN(mapped.re) || isNaN(mapped.im) || !isFinite(mapped.re) || !isFinite(mapped.im)) {
                rgb = [0, 0, 0];
            } else {
                rgb = domainColorForValue(mapped.re, mapped.im, state);
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
