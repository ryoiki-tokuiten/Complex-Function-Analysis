import { state } from '../store/state.js';
import { getChainedStageTransformFunction } from '../math-utils.js';

export const MAP_PRESENTATION = Object.freeze({
    function: 'function',
    derivative: 'derivative'
});

const DERIVATIVE_STEP = 1e-6;
const INVALID = Object.freeze({ re: NaN, im: NaN });

function finiteComplex(value) {
    return !!value && Number.isFinite(value.re) && Number.isFinite(value.im);
}

function normalizeStageIndex(stageIndex) {
    return Math.max(0, Math.floor(Number.isFinite(stageIndex) ? stageIndex : 0));
}

function derivativeStep(re, im) {
    return DERIVATIVE_STEP * Math.max(1, Math.abs(re), Math.abs(im));
}

function sourceSignature() {
    return JSON.stringify({
        function: state.currentFunction,
        chaining: state.chainingEnabled,
        chainCount: state.chainCount,
        chainMode: state.chainingMode,
        algebraic: state.algebraicChainingTerms,
        mobius: [state.mobiusA, state.mobiusB, state.mobiusC, state.mobiusD],
        polynomial: [state.polynomialN, state.polynomialCoeffs],
        fractionalPower: state.fractionalPowerN,
        taylor: [state.taylorSeriesEnabled, state.taylorSeriesCenter, state.taylorSeriesOrder],
        dynamic: state.dynamicPlotting
    });
}

export function getFinalMapStageIndex(runtimeState = state) {
    if (!runtimeState?.chainingEnabled) return 0;
    return normalizeStageIndex((runtimeState.chainCount || 1) - 1);
}

export function createDerivativeTransform(transform) {
    return (re, im) => {
        if (typeof transform !== 'function' || !Number.isFinite(re) || !Number.isFinite(im)) {
            return INVALID;
        }

        const h = derivativeStep(re, im);
        const right = transform(re + h, im);
        const left = transform(re - h, im);

        if (!finiteComplex(right) || !finiteComplex(left)) return INVALID;

        return {
            re: (right.re - left.re) / (2 * h),
            im: (right.im - left.im) / (2 * h)
        };
    };
}

export function resolveActiveMap(stageIndex = getFinalMapStageIndex()) {
    const stage = normalizeStageIndex(stageIndex);
    const source = getChainedStageTransformFunction(state.currentFunction, stage);
    const derivative = createDerivativeTransform(source);
    const presentation = state.mapPresentation === MAP_PRESENTATION.derivative
        ? MAP_PRESENTATION.derivative
        : MAP_PRESENTATION.function;

    return Object.freeze({
        stage,
        presentation,
        source,
        derivative,
        evaluate: presentation === MAP_PRESENTATION.derivative ? derivative : source,
        signature: `${presentation}:${stage}:${sourceSignature()}`
    });
}

export function isDerivativePresentation(runtimeState = state) {
    return runtimeState?.mapPresentation === MAP_PRESENTATION.derivative;
}

export function getDerivativeStepForPoint(re, im) {
    return derivativeStep(re, im);
}
