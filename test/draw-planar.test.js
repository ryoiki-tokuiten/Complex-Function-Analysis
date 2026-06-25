import test from 'node:test';
import assert from 'node:assert/strict';

import {
    generateLinearSegmentPoints,
    getPointSetEndpoints
} from '../js/rendering/draw-planar.js';

test('linear segment generation returns fresh mutable point arrays', () => {
    const start = { re: 0, im: 0 };
    const end = { re: 1, im: 1 };

    const first = generateLinearSegmentPoints(start, end, 4);
    first[1].re = 999;

    const second = generateLinearSegmentPoints(start, end, 4);

    assert.notEqual(second, first);
    assert.notEqual(second[1], first[1]);
    assert.equal(second[1].re, 0.25);
    assert.equal(second[1].im, 0.25);
});

test('point-set endpoints reflect interior point mutations', () => {
    const replacementStart = { re: 3, im: 4 };
    const replacementEnd = { re: 5, im: 6 };
    const pointSet = {
        points: [
            null,
            { re: 1, im: 0 },
            { re: 2, im: 0 },
            null
        ]
    };

    const initial = getPointSetEndpoints(pointSet);
    assert.equal(initial.start.re, 1);
    assert.equal(initial.end.re, 2);

    pointSet.points[1] = replacementStart;
    pointSet.points[2] = replacementEnd;

    const updated = getPointSetEndpoints(pointSet);
    assert.equal(updated.start, replacementStart);
    assert.equal(updated.end, replacementEnd);
});
