function compileBuiltin(funcKey, outRe, outIm, inRe, inIm, cRe, cIm, snapshot) {
    if (funcKey === 'c') {
        return `let ${outRe} = ${cRe}; let ${outIm} = ${cIm};\n`;
    } else if (funcKey === 'cos') {
        return `
            let ${outRe} = Math.cos(${inRe}) * Math.cosh(${inIm});
            let ${outIm} = -Math.sin(${inRe}) * Math.sinh(${inIm});\n
        `;
    } else if (funcKey === 'sin') {
        return `
            let ${outRe} = Math.sin(${inRe}) * Math.cosh(${inIm});
            let ${outIm} = Math.cos(${inRe}) * Math.sinh(${inIm});\n
        `;
    } else if (funcKey === 'exp') {
        return `
            let __mag_exp = Math.exp(Math.min(700, Math.max(-745, ${inRe})));
            let ${outRe} = __mag_exp * Math.cos(${inIm});
            let ${outIm} = __mag_exp * Math.sin(${inIm});\n
        `;
    } else if (funcKey === 'ln') {
        return `
            let ${outRe} = Math.log(Math.hypot(${inRe}, ${inIm}));
            let ${outIm} = Math.atan2(${inIm}, ${inRe});\n
        `;
    } else if (funcKey === 'reciprocal') {
        return `
            let __d_recip = ${inRe} * ${inRe} + ${inIm} * ${inIm};
            let ${outRe} = __d_recip === 0 ? NaN : ${inRe} / __d_recip;
            let ${outIm} = __d_recip === 0 ? NaN : -${inIm} / __d_recip;\n
        `;
    } else if (funcKey === 'power') {
        const pN = snapshot.fractionalPowerN ?? 0.5;
        return `
            let __lnR_pow = Math.log(Math.hypot(${inRe}, ${inIm}));
            let __lnI_pow = Math.atan2(${inIm}, ${inRe});
            let __expR_pow = ${pN} * __lnR_pow;
            let __expI_pow = ${pN} * __lnI_pow;
            let __mag_pow = Math.exp(Math.min(700, Math.max(-745, __expR_pow)));
            let ${outRe} = (${inRe} === 0 && ${inIm} === 0) ? 0 : __mag_pow * Math.cos(__expI_pow);
            let ${outIm} = (${inRe} === 0 && ${inIm} === 0) ? 0 : __mag_pow * Math.sin(__expI_pow);\n
        `;
    } else if (funcKey === 'polynomial') {
        const degree = Math.max(0, Math.floor(Number(snapshot.polynomialN) || 0));
        let code = `let ${outRe} = ${snapshot.polynomialCoeffs[degree]?.re || 0}; let ${outIm} = ${snapshot.polynomialCoeffs[degree]?.im || 0};\n`;
        for (let k = degree - 1; k >= 0; k--) {
            code += `
                let __tr_poly = ${outRe} * ${inRe} - ${outIm} * ${inIm} + (${snapshot.polynomialCoeffs[k]?.re || 0});
                let __ti_poly = ${outRe} * ${inIm} + ${outIm} * ${inRe} + (${snapshot.polynomialCoeffs[k]?.im || 0});
                ${outRe} = __tr_poly;
                ${outIm} = __ti_poly;\n
            `;
        }
        return code;
    } else if (funcKey === 'mobius') {
        const mA = snapshot.mobiusA || {re:1,im:0};
        const mB = snapshot.mobiusB || {re:0,im:0};
        const mC = snapshot.mobiusC || {re:0,im:0};
        const mD = snapshot.mobiusD || {re:1,im:0};
        return `
            let __numR = ${mA.re} * ${inRe} - ${mA.im} * ${inIm} + ${mB.re};
            let __numI = ${mA.re} * ${inIm} + ${mA.im} * ${inRe} + ${mB.im};
            let __denR = ${mC.re} * ${inRe} - ${mC.im} * ${inIm} + ${mD.re};
            let __denI = ${mC.re} * ${inIm} + ${mC.im} * ${inRe} + ${mD.im};
            let __denSq = __denR * __denR + __denI * __denI;
            let ${outRe} = __denSq === 0 ? NaN : (__numR * __denR + __numI * __denI) / __denSq;
            let ${outIm} = __denSq === 0 ? NaN : (__numI * __denR - __numR * __denI) / __denSq;\n
        `;
    }
    // Fallback for others
    return `
        let __res_fb = evaluateBuiltin('${funcKey}', {re: ${inRe}, im: ${inIm}}, snapshot, {c: {re: ${cRe}, im: ${cIm}}});
        let ${outRe} = __res_fb.re;
        let ${outIm} = __res_fb.im;\n
    `;
}

function compileFunctionBlock(block, outRe, outIm, inRe, inIm, cRe, cIm, snapshot, uid) {
    let code = ``;
    let curRe = inRe;
    let curIm = inIm;
    
    if (block.chainedFunc && block.chainedFunc !== 'none') {
        code += compileBuiltin(block.chainedFunc, `__chR_${uid}`, `__chI_${uid}`, curRe, curIm, cRe, cIm, snapshot);
        curRe = `__chR_${uid}`;
        curIm = `__chI_${uid}`;
    }
    
    code += compileBuiltin(block.func, `__fnR_${uid}`, `__fnI_${uid}`, curRe, curIm, cRe, cIm, snapshot);
    curRe = `__fnR_${uid}`;
    curIm = `__fnI_${uid}`;
    
    if (block.power !== undefined && block.power !== 1) {
        code += `
            let __lnR_${uid} = Math.log(Math.hypot(${curRe}, ${curIm}));
            let __lnI_${uid} = Math.atan2(${curIm}, ${curRe});
            let __expR_${uid} = ${block.power} * __lnR_${uid};
            let __expI_${uid} = ${block.power} * __lnI_${uid};
            let __mag_${uid} = Math.exp(Math.min(700, Math.max(-745, __expR_${uid})));
            let __pwR_${uid} = (${curRe} === 0 && ${curIm} === 0) ? 0 : __mag_${uid} * Math.cos(__expI_${uid});
            let __pwI_${uid} = (${curRe} === 0 && ${curIm} === 0) ? 0 : __mag_${uid} * Math.sin(__expI_${uid});\n
        `;
        curRe = `__pwR_${uid}`;
        curIm = `__pwI_${uid}`;
    }
    if (block.reciprocal) {
        code += `
            let __d_${uid} = ${curRe} * ${curRe} + ${curIm} * ${curIm};
            let __rcR_${uid} = __d_${uid} === 0 ? NaN : ${curRe} / __d_${uid};
            let __rcI_${uid} = __d_${uid} === 0 ? NaN : -${curIm} / __d_${uid};\n
        `;
        curRe = `__rcR_${uid}`;
        curIm = `__rcI_${uid}`;
    }
    if (block.log) {
        code += `
            let __lgR_${uid} = Math.log(Math.hypot(${curRe}, ${curIm}));
            let __lgI_${uid} = Math.atan2(${curIm}, ${curRe});\n
        `;
        curRe = `__lgR_${uid}`;
        curIm = `__lgI_${uid}`;
    }
    if (block.exp) {
        code += `
            let __emag_${uid} = Math.exp(Math.min(700, Math.max(-745, ${curRe})));
            let __exR_${uid} = __emag_${uid} * Math.cos(${curIm});
            let __exI_${uid} = __emag_${uid} * Math.sin(${curIm});\n
        `;
        curRe = `__exR_${uid}`;
        curIm = `__exI_${uid}`;
    }
    
    code += `let ${outRe} = ${curRe}; let ${outIm} = ${curIm};\n`;
    return code;
}

function compileStepCode(snapshot, outRe, outIm, inRe, inIm, cRe, cIm) {
    if (snapshot.functionKey === 'algebraic_chaining') {
        let code = `let __sumRe = 0; let __sumIm = 0;\n`;
        const terms = snapshot.algebraicChainingTerms;
        if (!Array.isArray(terms) || terms.length === 0) {
            return `let ${outRe} = 0; let ${outIm} = 0;\n`;
        }
        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            const coeffRe = term.coeff?.re ?? 1;
            const coeffIm = term.coeff?.im ?? 0;
            code += `let termRe_${i} = ${coeffRe}; let termIm_${i} = ${coeffIm};\n`;
            
            const factors = term.factors || [];
            for (let j = 0; j < factors.length; j++) {
                const factor = factors[j];
                if (!factor || factor.func === 'none') break;
                
                const uid = `${i}_${j}`;
                code += compileFunctionBlock(factor, `fRe_${uid}`, `fIm_${uid}`, inRe, inIm, cRe, cIm, snapshot, uid);
                code += `
                    let tmpRe_${uid} = termRe_${i} * fRe_${uid} - termIm_${i} * fIm_${uid};
                    let tmpIm_${uid} = termRe_${i} * fIm_${uid} + termIm_${i} * fRe_${uid};
                    termRe_${i} = tmpRe_${uid};
                    termIm_${i} = tmpIm_${uid};\n
                `;
            }
            code += `__sumRe += termRe_${i}; __sumIm += termIm_${i};\n`;
        }
        code += `let ${outRe} = __sumRe; let ${outIm} = __sumIm;\n`;
        return code;
    } else {
        return compileBuiltin(snapshot.functionKey, outRe, outIm, inRe, inIm, cRe, cIm, snapshot);
    }
}

export function createJitTileRenderer(snapshot, writeDynamicsEscapeColor, writeBlack, writeDomainColor, evaluateBuiltin) {
    const isOrbit = snapshot.fractalOrbitColoringEnabled;
    const chainEnabled = snapshot.chainingEnabled;
    const count = Math.max(1, Math.floor(Number(snapshot.chainCount) || 1));
    const mode = snapshot.chainMode || 'recursion';
    const zeroSeed = mode === 'zero_seed';

    let code = `
        const data = new Uint8ClampedArray(tile.width * tile.height * 4);
        const xRange = snapshot.viewport.xRange;
        const yRange = snapshot.viewport.yRange;
        const spanX = xRange[1] - xRange[0];
        const spanY = yRange[1] - yRange[0];
        const xStep = tile.scale * spanX / snapshot.viewport.width;
        const yStep = -tile.scale * spanY / snapshot.viewport.height;
        const xStart = xRange[0] + (tile.x + 0.5) * tile.scale * spanX / snapshot.viewport.width;
        const yStart = yRange[1] - (tile.y + 0.5) * tile.scale * spanY / snapshot.viewport.height;
        const count = ${count};
        const maxIter = ${chainEnabled || zeroSeed ? count : 1};
        
        for (let y = 0; y < tile.height; y += 1) {
            const ci = yStart + y * yStep;
            for (let x = 0; x < tile.width; x += 1) {
                const cr = xStart + x * xStep;
                let zr = ${zeroSeed ? 0 : 'cr'};
                let zi = ${zeroSeed ? 0 : 'ci'};
                let smoothIteration = count;
                let escaped = false;
                let lastRe = NaN;
                let lastIm = NaN;
                
                let baseRe = NaN;
                let baseIm = NaN;
    `;

    if (mode === 'recursion' || zeroSeed) {
        code += `
            for (let i = 0; i < maxIter; i += 1) {
                ${compileStepCode(snapshot, 'nr', 'ni', 'zr', 'zi', 'cr', 'ci')}
                
                if (!Number.isFinite(nr) || !Number.isFinite(ni)) {
                    escaped = true;
                    smoothIteration = i + 1;
                    break;
                }
                const magSq = nr * nr + ni * ni;
                if (magSq > DYNAMICS_ESCAPE_RADIUS_SQ || Math.max(Math.abs(nr), Math.abs(ni)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE) {
                    const magnitude = Math.sqrt(Math.max(magSq, DYNAMICS_ESCAPE_RADIUS));
                    smoothIteration = i + 1;
                    if (Number.isFinite(magnitude) && magnitude > 1.0001) {
                        const smoothAdjust = Math.log(
                            Math.max(Math.log(magnitude) / Math.log(DYNAMICS_ESCAPE_RADIUS), 1e-6)
                        ) / Math.LN2;
                        smoothIteration = Math.max(0, Math.min(count, smoothIteration - smoothAdjust));
                    }
                    escaped = true;
                    break;
                }
                zr = nr;
                zi = ni;
                lastRe = nr;
                lastIm = ni;
            }
        `;
    } else {
        code += `
            ${compileStepCode(snapshot, 'baseRe', 'baseIm', 'cr', 'ci', 'cr', 'ci')}
            zr = baseRe;
            zi = baseIm;
            lastRe = baseRe;
            lastIm = baseIm;
            
            if (!Number.isFinite(baseRe) || !Number.isFinite(baseIm)) {
                escaped = true;
                smoothIteration = 1;
            } else {
                const baseMagSq = baseRe * baseRe + baseIm * baseIm;
                if (baseMagSq > DYNAMICS_ESCAPE_RADIUS_SQ || Math.max(Math.abs(baseRe), Math.abs(baseIm)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE) {
                    escaped = true;
                    smoothIteration = 1;
                }
            }
            
            if (!escaped) {
                for (let i = 1; i < maxIter; i += 1) {
                    let nr = zr, ni = zi;
        `;
        
        if (mode === 'power') {
            code += `
                    let tmpR = zr * baseRe - zi * baseIm;
                    let tmpI = zr * baseIm + zi * baseRe;
                    nr = tmpR; ni = tmpI;
            `;
        } else if (mode === 'sqrt') {
            code += `
                    let __mag = Math.pow(Math.hypot(zr, zi), 0.5);
                    let __ang = Math.atan2(zi, zr) * 0.5;
                    nr = __mag * Math.cos(__ang);
                    ni = __mag * Math.sin(__ang);
            `;
        } else if (mode === 'ln') {
            code += `
                    nr = Math.log(Math.hypot(zr, zi));
                    ni = Math.atan2(zi, zr);
            `;
        } else if (mode === 'exp') {
            code += `
                    let __mag = Math.exp(Math.min(700, Math.max(-745, zr)));
                    nr = __mag * Math.cos(zi);
                    ni = __mag * Math.sin(zi);
            `;
        } else if (mode === 'reciprocal') {
            code += `
                    let __d = zr * zr + zi * zi;
                    nr = __d === 0 ? NaN : zr / __d;
                    ni = __d === 0 ? NaN : -zi / __d;
            `;
        }
        
        code += `
                    if (!Number.isFinite(nr) || !Number.isFinite(ni)) {
                        escaped = true;
                        smoothIteration = i + 1;
                        break;
                    }
                    const magSq = nr * nr + ni * ni;
                    if (magSq > DYNAMICS_ESCAPE_RADIUS_SQ || Math.max(Math.abs(nr), Math.abs(ni)) >= DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE) {
                        const magnitude = Math.sqrt(Math.max(magSq, DYNAMICS_ESCAPE_RADIUS));
                        smoothIteration = i + 1;
                        if (Number.isFinite(magnitude) && magnitude > 1.0001) {
                            const smoothAdjust = Math.log(
                                Math.max(Math.log(magnitude) / Math.log(DYNAMICS_ESCAPE_RADIUS), 1e-6)
                            ) / Math.LN2;
                            smoothIteration = Math.max(0, Math.min(count, smoothIteration - smoothAdjust));
                        }
                        escaped = true;
                        break;
                    }
                    zr = nr;
                    zi = ni;
                    lastRe = nr;
                    lastIm = ni;
                }
            }
        `;
    }

    code += `
                const idx = (y * tile.width + x) * 4;
    `;
    
    if (isOrbit) {
        code += `
                if (escaped) {
                    writeDynamicsEscapeColor(data, idx, smoothIteration, count, snapshot);
                } else {
                    writeBlack(data, idx);
                }
        `;
    } else {
        code += `
                writeDomainColor(data, idx, lastRe, lastIm, snapshot);
        `;
    }

    code += `
            }
        }
        return data;
    `;

    try {
        const renderFunc = new Function(
            'snapshot', 'tile', 'DYNAMICS_ESCAPE_RADIUS_SQ', 'DOMAIN_COLOR_CHAIN_BAILOUT_MAGNITUDE',
            'DYNAMICS_ESCAPE_RADIUS', 'writeDynamicsEscapeColor', 'writeBlack', 'writeDomainColor',
            'evaluateBuiltin', code
        );
        return {
            type: 'jit',
            renderTile: function(tile, D_ESC_SQ, D_BAILOUT, D_ESC, writeE, writeB, writeD) {
                return renderFunc(snapshot, tile, D_ESC_SQ, D_BAILOUT, D_ESC, writeE, writeB, writeD, evaluateBuiltin);
            }
        };
    } catch (e) {
        console.error("JIT compilation failed", e);
        return null;
    }
}
