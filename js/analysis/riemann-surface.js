const MULTIVALUED_FUNCTIONS = new Set(['ln', 'power']);

function isIntegerLike(value) {
    return Number.isFinite(value) && Math.abs(value - Math.round(value)) < 1e-9;
}

export function isMultivaluedFunction(functionKey, runtimeState) {
    if (!MULTIVALUED_FUNCTIONS.has(functionKey)) return false;
    if (functionKey === 'power') {
        const exponent = runtimeState && Number.isFinite(runtimeState.fractionalPowerN)
            ? runtimeState.fractionalPowerN
            : 0.5;
        return !isIntegerLike(exponent);
    }
    return true;
}

export function algebraicExpressionHasBranches(terms, runtimeState) {
    return (terms || []).some(term =>
        (term.factors || []).some(factor => {
            if (!factor || factor.func === 'none') return false;
            if (isMultivaluedFunction(factor.func, runtimeState)) return true;
            if (isMultivaluedFunction(factor.chainedFunc, runtimeState)) return true;
            if (factor.log) return true;
            return Number.isFinite(factor.power) && !isIntegerLike(factor.power);
        })
    );
}

export function baseExpressionHasBranches(runtimeState) {
    if (!runtimeState) return false;
    if (runtimeState.taylorSeriesEnabled) return false;
    if (runtimeState.currentFunction === 'algebraic_chaining') {
        return algebraicExpressionHasBranches(runtimeState.algebraicChainingTerms, runtimeState);
    }
    return isMultivaluedFunction(runtimeState.currentFunction, runtimeState);
}

export function surfaceStageHasBranches(runtimeState, stage = 1) {
    const safeStage = Math.max(1, Math.floor(stage));
    const baseHasBranches = baseExpressionHasBranches(runtimeState);
    if (baseHasBranches) return true;
    if (!runtimeState || !runtimeState.chainingEnabled || safeStage <= 1) return false;
    return runtimeState.chainingMode === 'sqrt' || runtimeState.chainingMode === 'ln';
}

export function getVisibleBranchIndices(sheetCount, branchCenter = 0, hasBranches = true) {
    if (!hasBranches) return [0];
    const normalizedCount = Math.max(1, Math.min(9, Math.floor(sheetCount || 1)));
    const oddCount = normalizedCount % 2 === 0 ? normalizedCount - 1 : normalizedCount;
    const center = Math.round(Number.isFinite(branchCenter) ? branchCenter : 0);
    const radius = Math.floor(oddCount / 2);
    const indices = [];
    for (let k = center - radius; k <= center + radius; k++) {
        indices.push(k);
    }
    return indices;
}

export function getBranchWindowLabel(indices) {
    if (!Array.isArray(indices) || indices.length === 0) return 'principal sheet';
    if (indices.length === 1) {
        return indices[0] === 0 ? 'principal sheet (k = 0)' : `sheet k = ${indices[0]}`;
    }
    return `sheets k = ${indices[0]}...${indices[indices.length - 1]}`;
}

export function getSurfaceComponentLabel(component) {
    switch (component) {
        case 'real': return 'Re(w)';
        case 'magnitude': return '|w|';
        case 'phase': return 'arg(w)';
        case 'imaginary':
        default:
            return 'Im(w)';
    }
}
