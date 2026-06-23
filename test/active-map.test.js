import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/store/state.js';
import { createDerivativeTransform, resolveActiveMap } from '../js/math/active-map.js';

test('central derivative wraps an arbitrary resolved complex map', () => {
    const square = (re, im) => ({
        re: re * re - im * im,
        im: 2 * re * im
    });
    const derivative = createDerivativeTransform(square);
    const value = derivative(2, -3);

    assert.ok(Math.abs(value.re - 4) < 1e-8);
    assert.ok(Math.abs(value.im + 6) < 1e-8);
});

test('invalid derivative samples remain invalid instead of substituting another map', () => {
    const derivative = createDerivativeTransform(() => ({ re: NaN, im: NaN }));
    const value = derivative(0, 0);

    assert.ok(Number.isNaN(value.re));
    assert.ok(Number.isNaN(value.im));
});

test('active derivative map differentiates the exact output-chain stage', () => {
    const previous = {
        currentFunction: state.currentFunction,
        chainingEnabled: state.chainingEnabled,
        chainingMode: state.chainingMode,
        chainCount: state.chainCount,
        mapPresentation: state.mapPresentation
    };

    try {
        Object.assign(state, {
            currentFunction: 'exp',
            chainingEnabled: true,
            chainingMode: 'recursion',
            chainCount: 2,
            mapPresentation: 'derivative'
        });

        const map = resolveActiveMap(1);
        const value = map.evaluate(0, 0);
        assert.ok(Math.abs(value.re - Math.E) < 1e-5);
        assert.ok(Math.abs(value.im) < 1e-8);
    } finally {
        Object.assign(state, previous);
    }
});
