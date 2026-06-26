import test from 'node:test';
import assert from 'node:assert/strict';

import {
    complexToSphere,
    rotate3D,
    sphereToComplex
} from '../js/utils/canvas-utils.js';

function approx(actual, expected, epsilon = 1e-12) {
    assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ~= ${expected}`);
}

test('Riemann sphere stereographic projection round-trips finite complex points', () => {
    for (const point of [
        { re: 0, im: 0 },
        { re: 1, im: -1 },
        { re: -2.5, im: 0.75 },
        { re: 100, im: -200 }
    ]) {
        const sphere = complexToSphere(point.re, point.im);
        const roundTrip = sphereToComplex(sphere);

        approx(roundTrip.re, point.re, Math.max(1e-12, Math.abs(point.re) * 1e-10));
        approx(roundTrip.im, point.im, Math.max(1e-12, Math.abs(point.im) * 1e-10));
        approx(Math.hypot(sphere.x, sphere.y, sphere.z), 1, 1e-12);
    }
});

test('Riemann sphere rotations preserve unit-sphere radius', () => {
    const sphere = complexToSphere(0.75, -1.25);
    const rotated = rotate3D(sphere, -0.8, 0.35);

    approx(Math.hypot(rotated.x, rotated.y, rotated.z), 1, 1e-12);
});
