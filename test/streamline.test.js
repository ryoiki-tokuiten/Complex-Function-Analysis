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

test('normalized RK2 streamline tracing preserves circular flow geometry', () => {
    const stepSize = 0.001;
    const path = calculateStreamline(
        1, 0,
        (re, im) => ({ vx: -im, vy: re }),
        { currentVisXRange: [-2, 2], currentVisYRange: [-2, 2] },
        { streamlineStepSize: stepSize, streamlineMaxLength: 1000, chainingEnabled: false, chainCount: 1 }
    );

    assert.equal(path.length, 1000, 'Should reach max steps in bounded region');

    let maxDrift = 0;
    for (const pt of path) {
        const rSq = pt.x * pt.x + pt.y * pt.y;
        const drift = Math.abs(rSq - 1.0);
        if (drift > maxDrift) maxDrift = drift;
    }

    const viewSpan = 4;
    const effectiveStep = stepSize * viewSpan * 0.1;
    const last = path[path.length - 1];
    const tracedAngle = Math.atan2(last.y, last.x);
    const expectedAngle = (path.length - 1) * effectiveStep;

    assert.ok(maxDrift < 1e-9, `radius drift exceeded RK2 tolerance: ${maxDrift}`);
    assert.ok(Math.abs(tracedAngle - expectedAngle) < 1e-6, `${tracedAngle} ~= ${expectedAngle}`);
});
