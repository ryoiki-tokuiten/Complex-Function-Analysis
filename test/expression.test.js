import test from 'node:test';
import assert from 'node:assert/strict';

import {
    EXPRESSION_LIMITS,
    ExpressionEvaluationError,
    ExpressionSyntaxError,
    compileExpression,
    parseExpression
} from '../js/math/expression/index.js';

function closeComplex(actual, expected, tolerance = 1e-10) {
    assert.ok(Math.abs(actual.re - expected.re) <= tolerance, `real ${actual.re} != ${expected.re}`);
    assert.ok(Math.abs(actual.im - expected.im) <= tolerance, `imag ${actual.im} != ${expected.im}`);
}

test('expression parser respects precedence, right-associative powers, and implicit multiplication', () => {
    const expression = compileExpression('2 + 3d^2^2', { allowedVariables: ['d'] });
    closeComplex(expression({ d: { re: 2, im: 0 } }), { re: 50, im: 0 });

    const negativePower = compileExpression('-2^2');
    closeComplex(negativePower({}), { re: -4, im: 0 });
});

test('complex literals, composition, and helpers evaluate without eval', () => {
    const expression = compileExpression('conj(2 + 3i) + complex(1, -2)');
    closeComplex(expression({}), { re: 3, im: -5 });

    const composed = compileExpression('exp(ln(z))', { allowedVariables: ['z'] });
    closeComplex(composed({ z: { re: 1.25, im: -0.4 } }), { re: 1.25, im: -0.4 }, 1e-9);
});

test('conditionals, predicates, factorial, gcd, and custom parameters work', () => {
    const expression = compileExpression(
        'isPrime(j) ? factorial(k) + gcd(j, 6) : 0',
        { allowedVariables: ['j', 'k'] }
    );
    closeComplex(expression({ j: { re: 5, im: 0 }, k: { re: 4, im: 0 } }), { re: 25, im: 0 });
    closeComplex(expression({ j: { re: 6, im: 0 }, k: { re: 4, im: 0 } }), { re: 0, im: 0 });
});

test('selected function calls are supplied by the evaluation environment', () => {
    const expression = compileExpression('selected(z) + f(z)', { allowedVariables: ['z'] });
    const selectedFunction = (re, im) => ({ re: re * 2, im: im * 2 });
    closeComplex(
        expression({ z: { re: 2, im: -1 }, selectedFunction }),
        { re: 8, im: -4 }
    );
});

test('expression validation reports syntax, variable, and domain errors', () => {
    assert.throws(() => parseExpression('1 + )'), ExpressionSyntaxError);
    assert.throws(
        () => compileExpression('secret + 1', { allowedVariables: ['z'] }),
        ExpressionEvaluationError
    );

    const factorial = compileExpression('2.5!');
    assert.throws(() => factorial({}), /must be an integer/);
});

test('expression boundaries reject unsafe formulas with specific errors', () => {
    assert.throws(() => compileExpression(''), /cannot be empty/);
    assert.throws(() => compileExpression('1e999'), /outside the supported range/);
    assert.throws(
        () => compileExpression('1'.repeat(EXPRESSION_LIMITS.sourceLength + 1)),
        /too long/
    );

    const division = compileExpression('1 / z', { allowedVariables: ['z'] });
    assert.throws(
        () => division({ z: { re: 0, im: 0 } }),
        /Division by zero/
    );

    const negativeFactorial = compileExpression('(-1)!');
    assert.throws(() => negativeFactorial({}), /non-negative/);

    const overflowingFactorial = compileExpression('171!');
    assert.throws(() => overflowingFactorial({}), /must not exceed 170/);
});
