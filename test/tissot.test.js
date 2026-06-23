import test from 'node:test';
import assert from 'node:assert/strict';

import { generateTissotIndicatrices } from '../js/analysis/tissot.js';

test('Tissot indicatrices use the source value and its derivative once', () => {
    const map = {
        source: (re, im) => ({ re, im }),
        derivative: () => ({ re: 2, im: 0 })
    };
    const circles = generateTissotIndicatrices(map, [-1, 1], [-1, 1], 8, 8);

    assert.ok(circles.length > 0);
    const circle = circles[0];
    const radius = Math.hypot(circle[0].re - circle[4].re, circle[0].im - circle[4].im) / 2;
    assert.ok(radius > 0);
});
