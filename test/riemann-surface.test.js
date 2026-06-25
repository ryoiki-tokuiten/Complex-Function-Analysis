import test from 'node:test';
import assert from 'node:assert/strict';

import {
    algebraicExpressionHasBranches,
    dynamicExpressionHasBranches,
    getBranchWindowLabel,
    getVisibleBranchIndices,
    surfaceStageHasBranches
} from '../js/analysis/riemann-surface.js';
import { getRiemannSurfaceProgramSignature } from '../js/rendering/webgl-riemann-surface.js';

function makeState(overrides = {}) {
    return {
        currentFunction: 'cos',
        fractionalPowerN: 0.5,
        algebraicChainingTerms: [],
        taylorSeriesEnabled: false,
        chainingEnabled: false,
        chainingMode: 'recursion',
        ...overrides
    };
}

test('single-valued functions collapse to the principal sheet', () => {
    const runtimeState = makeState({ currentFunction: 'cos' });
    assert.equal(surfaceStageHasBranches(runtimeState, 1), false);
    assert.deepEqual(getVisibleBranchIndices(9, 12, false), [0]);
});

test('logarithm and non-integer powers expose branch sheets', () => {
    assert.equal(surfaceStageHasBranches(makeState({ currentFunction: 'ln' }), 1), true);
    assert.equal(surfaceStageHasBranches(makeState({
        currentFunction: 'power',
        fractionalPowerN: 0.5
    }), 1), true);
    assert.equal(surfaceStageHasBranches(makeState({
        currentFunction: 'power',
        fractionalPowerN: 3
    }), 1), false);
});

test('algebraic chaining detects branch-bearing functions and modifiers', () => {
    const terms = [{
        coeff: { re: 1, im: 0 },
        factors: [{
            func: 'sin',
            chainedFunc: 'cos',
            power: 0.5,
            reciprocal: false,
            log: false,
            exp: false
        }]
    }];
    assert.equal(algebraicExpressionHasBranches(terms, makeState()), true);

    terms[0].factors[0].power = 2;
    terms[0].factors[0].log = true;
    assert.equal(algebraicExpressionHasBranches(terms, makeState()), true);
});

test('Taylor surfaces are single-valued polynomial approximations', () => {
    const runtimeState = makeState({
        currentFunction: 'ln',
        taylorSeriesEnabled: true
    });
    assert.equal(surfaceStageHasBranches(runtimeState, 1), false);
});

test('output sqrt and log chaining introduce sheets at later stages', () => {
    const sqrtState = makeState({ chainingEnabled: true, chainingMode: 'sqrt' });
    assert.equal(surfaceStageHasBranches(sqrtState, 1), false);
    assert.equal(surfaceStageHasBranches(sqrtState, 2), true);

    const logState = makeState({ chainingEnabled: true, chainingMode: 'ln' });
    assert.equal(surfaceStageHasBranches(logState, 4), true);
});

test('branch windows remain odd, bounded, and centered', () => {
    assert.deepEqual(getVisibleBranchIndices(5, 0, true), [-2, -1, 0, 1, 2]);
    assert.deepEqual(getVisibleBranchIndices(8, 3, true), [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(getVisibleBranchIndices(99, -2, true), [-6, -5, -4, -3, -2, -1, 0, 1, 2]);
    assert.equal(getBranchWindowLabel([-2, -1, 0, 1, 2]), 'sheets k = -2...2');
});

test('dynamic aggregate expressions contribute branch metadata', () => {
    const runtimeState = makeState({
        dynamicPlotting: {
            enabled: true,
            mode: 'aggregate',
            pointExpression: 'd',
            term: { kind: 'expression', expression: 'sqrt(s) + d^(-s)' },
            reduction: { kind: 'sum' }
        }
    });
    assert.equal(dynamicExpressionHasBranches(runtimeState), true);
    assert.equal(surfaceStageHasBranches(runtimeState, 1), true);
});

test('Riemann program signatures notice in-place algebraic edits', () => {
    const runtimeState = makeState({
        currentFunction: 'algebraic_chaining',
        algebraicChainingZExpr: 'z',
        algebraicChainingTerms: [{
            coeff: { re: 1, im: 0 },
            factors: [{
                func: 'sin',
                chainedFunc: 'none',
                power: 1,
                reciprocal: false,
                log: false,
                exp: false
            }]
        }]
    });

    const before = getRiemannSurfaceProgramSignature(runtimeState);
    runtimeState.algebraicChainingTerms[0].factors[0].func = 'cos';
    const after = getRiemannSurfaceProgramSignature(runtimeState);

    assert.notEqual(after, before);
});
