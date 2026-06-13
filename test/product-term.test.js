import test from 'node:test';
import assert from 'node:assert/strict';

import {
    compileExpression,
    composeProductExpression,
    decomposeProductExpression
} from '../js/math/expression/index.js';

test('product-term decomposition preserves powers, factorials, and denominator placement', () => {
    const source = 'x^n / n!';
    const factors = decomposeProductExpression(source);

    assert.equal(factors.length, 2);
    assert.deepEqual(
        factors.map(factor => ({
            base: factor.base,
            exponent: factor.exponent,
            wrapper: factor.wrapper,
            denominator: factor.denominator
        })),
        [
            { base: 'x', exponent: 'n', wrapper: 'none', denominator: false },
            { base: 'n', exponent: '', wrapper: 'factorial', denominator: true }
        ]
    );

    const rebuilt = compileExpression(composeProductExpression(factors), {
        allowedVariables: ['x', 'n']
    });
    const value = rebuilt({ x: { re: 3, im: 0 }, n: { re: 4, im: 0 } });
    assert.ok(Math.abs(value.re - 3.375) < 1e-12);
    assert.ok(Math.abs(value.im) < 1e-12);
});
