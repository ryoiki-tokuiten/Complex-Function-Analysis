function getDomainColorPlaneKey(targetCtx) {
    if (typeof zDomainColorCtx !== 'undefined' && targetCtx === zDomainColorCtx) return 'z';
    if (typeof wDomainColorCtx !== 'undefined' && targetCtx === wDomainColorCtx) return 'w';
    return 'z';
}

function renderPlanarDomainColoring(tCtx, pP, isWPC, sTF) {
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

function renderSphereDomainColoring(tCtx, cSP, cDOMP, isWPC, sTF) {
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

function inverseRotate3D(x, y, z, rotX, rotY) {
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

function domainColorForValue(re, im, runtimeState) {
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

    return hslToRgb(h, sFinal, lFinal);
}

function renderConstantPlanarDomainColoring(tCtx, pP, value) {
    const rgb = domainColorForValue(value.re, value.im, state);
    tCtx.save();
    tCtx.setTransform(1, 0, 0, 1, 0, 0);
    tCtx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    tCtx.fillRect(0, 0, pP.width, pP.height);
    tCtx.restore();
}

function renderPlanarDomainColoringCPU(tCtx, pP, isWPC, sTF, sourceProfile = null) {
    const targetW = pP.width;
    const targetH = pP.height;
    const ds = 4;
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

function renderSphereDomainColoringCPU(tCtx, cSP, cDOMP, isWPC, sTF, sourceProfile = null) {
    const targetW = cDOMP.width;
    const targetH = cDOMP.height;
    const ds = 4;
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
