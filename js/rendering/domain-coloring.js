function getDomainColorPlaneKey(targetCtx) {
    if (typeof zDomainColorCtx !== 'undefined' && targetCtx === zDomainColorCtx) return 'z';
    if (typeof wDomainColorCtx !== 'undefined' && targetCtx === wDomainColorCtx) return 'w';
    return 'z';
}

function renderPlanarDomainColoring(tCtx, pP, isWPC, sTF) {
    const w = pP.width; const h = pP.height; if (w === 0 || h === 0) return;
    renderDomainColoringWithWebGL(tCtx, pP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: null,
        sourceTransformFn: sTF
    });
}

function renderSphereDomainColoring(tCtx, cSP, cDOMP, isWPC, sTF) {
    const w = cDOMP.width; const h = cDOMP.height; if (w === 0 || h === 0) return;
    renderDomainColoringWithWebGL(tCtx, cDOMP, {
        planeKey: getDomainColorPlaneKey(tCtx),
        isWPlaneColoring: !!isWPC,
        sphereParams: cSP,
        sourceTransformFn: sTF
    });
}
