import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/store/state.js';
import {
    evaluateDomainColoringMappedTransform,
    evaluateAlgebraicChaining,
    getEffectiveBaseTransformFunction,
    getMappedTransformProfile,
    getChainedTransformFunction
} from '../js/math-utils.js';

function snapshotState(keys) {
    return Object.fromEntries(keys.map(key => [key, state[key]]));
}

function restoreState(snapshot) {
    Object.assign(state, snapshot);
}

test('algebraic chaining can hold original input as c during recursion', () => {
    const keys = [
        'currentFunction',
        'algebraicChainingEnabled',
        'algebraicChainingTerms',
        'polynomialN',
        'polynomialCoeffs',
        'chainingEnabled',
        'chainingMode',
        'chainCount'
    ];
    const before = snapshotState(keys);

    try {
        Object.assign(state, {
            currentFunction: 'algebraic_chaining',
            algebraicChainingEnabled: true,
            polynomialN: 2,
            polynomialCoeffs: [
                { re: 0, im: 0 },
                { re: 0, im: 0 },
                { re: 1, im: 0 }
            ],
            algebraicChainingTerms: [
                {
                    coeff: { re: 1, im: 0 },
                    factors: [{ func: 'polynomial', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                },
                {
                    coeff: { re: 1, im: 0 },
                    factors: [{ func: 'c', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                }
            ],
            chainingEnabled: true,
            chainingMode: 'recursion',
            chainCount: 2
        });

        assert.deepEqual(
            evaluateAlgebraicChaining({ re: 3, im: 0 }, undefined, { c: { re: 2, im: 0 } }),
            { re: 11, im: 0 }
        );

        const chained = getChainedTransformFunction('algebraic_chaining');
        assert.deepEqual(chained(2, 0), { re: 38, im: 0 });

        state.chainingMode = 'zero_seed';
        state.chainCount = 2;
        const zeroSeed = getChainedTransformFunction('algebraic_chaining');
        assert.deepEqual(zeroSeed(2, 0), { re: 6, im: 0 });
    } finally {
        restoreState(before);
    }
});

test('explicit c context bypasses mapped constant shortcuts during chaining', () => {
    const keys = [
        'currentFunction',
        'algebraicChainingEnabled',
        'algebraicChainingTerms',
        'polynomialN',
        'polynomialCoeffs',
        'chainingEnabled',
        'chainingMode',
        'chainCount'
    ];
    const before = snapshotState(keys);

    try {
        Object.assign(state, {
            currentFunction: 'algebraic_chaining',
            algebraicChainingEnabled: true,
            polynomialN: 1,
            polynomialCoeffs: [
                { re: 0, im: 0 },
                { re: 1, im: 0 }
            ],
            algebraicChainingTerms: [
                {
                    coeff: { re: 1, im: 0 },
                    factors: [{ func: 'polynomial', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                },
                {
                    coeff: { re: -1, im: 0 },
                    factors: [{ func: 'c', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                }
            ],
            chainingEnabled: true,
            chainingMode: 'zero_seed',
            chainCount: 2
        });

        const zeroSeed = getChainedTransformFunction('algebraic_chaining');
        assert.deepEqual(zeroSeed(2, 0), { re: -4, im: 0 });
    } finally {
        restoreState(before);
    }
});

test('deep escaped recursion still provides a finite domain-coloring value', () => {
    const keys = [
        'currentFunction',
        'algebraicChainingEnabled',
        'algebraicChainingTerms',
        'polynomialN',
        'polynomialCoeffs',
        'chainingEnabled',
        'chainingMode',
        'chainCount'
    ];
    const before = snapshotState(keys);

    try {
        Object.assign(state, {
            currentFunction: 'algebraic_chaining',
            algebraicChainingEnabled: true,
            polynomialN: 2,
            polynomialCoeffs: [
                { re: 0, im: 0 },
                { re: 0, im: 0 },
                { re: 1, im: 0 }
            ],
            algebraicChainingTerms: [
                {
                    coeff: { re: 1, im: 0 },
                    factors: [{ func: 'polynomial', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                },
                {
                    coeff: { re: 1, im: 0 },
                    factors: [{ func: 'c', chainedFunc: 'none', power: 1, reciprocal: false, log: false, exp: false }]
                }
            ],
            chainingEnabled: true,
            chainingMode: 'recursion',
            chainCount: 25
        });

        const baseProfile = getMappedTransformProfile(
            'algebraic_chaining',
            getEffectiveBaseTransformFunction('algebraic_chaining')
        );
        const mapped = evaluateDomainColoringMappedTransform(baseProfile, 2, 0, 'algebraic_chaining');

        assert.ok(Number.isFinite(mapped.re));
        assert.ok(Number.isFinite(mapped.im));
    } finally {
        restoreState(before);
    }
});
