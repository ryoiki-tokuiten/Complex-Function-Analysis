import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateStreamline,
    getVectorEvaluator
} from '../js/analysis/streamline.js';

const planeParams = Object.freeze({
    currentVisXRange: Object.freeze([-2, 2]),
    currentVisYRange: Object.freeze([-2, 2])
});

const streamlineState = Object.freeze({
    currentFunction: 'poincare',
    vectorFieldFunction: 'f(z)',
    streamlineStepSize: 0.02,
    streamlineMaxLength: 200,
    chainingEnabled: false,
    chainCount: 1
});

test('streamline tracing stops immediately on garbage vectors', () => {
    const path = calculateStreamline(
        0,
        0,
        () => ({ vx: NaN, vy: Infinity }),
        planeParams,
        streamlineState
    );

    assert.deepEqual(path, []);
});

test('vector evaluator sanitizes invalid map values', () => {
    const evaluate = getVectorEvaluator({
        evaluate: (_re, im) => im > 0 ? { re: 0, im: 1 } : { re: NaN, im: NaN }
    }, 'f(z)');

    assert.deepEqual(evaluate(0, -1), { vx: 0, vy: 0 });

    const upper = evaluate(0, 1);
    assert.ok(Number.isFinite(upper.vx));
    assert.ok(Number.isFinite(upper.vy));
});
