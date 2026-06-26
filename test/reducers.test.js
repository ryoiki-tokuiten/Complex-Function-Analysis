import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CompensatedComplexSum,
    ScaledComplexProduct,
    reduceComplexTerms
} from '../js/analysis/reducers.js';

test('compensated complex sums retain small terms after large cancellation', () => {
    const sum = new CompensatedComplexSum();
    sum.add({ re: 1e16, im: 1e16 });
    sum.add({ re: 1, im: -1 });
    sum.add({ re: -1e16, im: -1e16 });
    assert.deepEqual(sum.value(), { re: 1, im: -1 });
});

test('scaled products retain logarithmic magnitude and unwrapped argument', () => {
    const product = new ScaledComplexProduct();
    for (let index = 0; index < 400; index += 1) {
        product.multiply({ re: 10, im: 0 });
    }
    const snapshot = product.snapshot();
    assert.ok(snapshot.logAbs > 900);
    assert.ok(Number.isNaN(snapshot.value.re));
    assert.ok(Math.abs(snapshot.normalized.re - 1) < 1e-12);
});

test('product zero factors and invalid policies are explicit', () => {
    const zeroProduct = new ScaledComplexProduct();
    zeroProduct.multiply({ re: 2, im: 0 });
    const zeroSnapshot = zeroProduct.multiply({ re: 0, im: 0 });
    assert.equal(zeroSnapshot.zero, true);
    assert.deepEqual(zeroSnapshot.value, { re: 0, im: 0 });

    const stoppedSamples = [
        { status: 'valid', termValue: { re: 1, im: 0 } },
        { status: 'not-finite', termValue: { re: NaN, im: NaN } },
        { status: 'valid', termValue: { re: 2, im: 0 } }
    ];
    const stopped = reduceComplexTerms(stoppedSamples, { kind: 'sum', invalidPolicy: 'stop' });
    assert.equal(stopped.stopped, true);
    assert.equal(stoppedSamples[2].reductionStatus, 'not-evaluated');

    const skippedSamples = [
        { status: 'valid', termValue: { re: 1, im: 0 } },
        { status: 'not-finite', termValue: { re: NaN, im: NaN } },
        { status: 'valid', termValue: { re: 2, im: 0 } }
    ];
    const skipped = reduceComplexTerms(skippedSamples, { kind: 'sum', invalidPolicy: 'skip' });
    assert.equal(skipped.stopped, false);
    assert.deepEqual(skipped.finalValue, { re: 3, im: 0 });
});

test('compensated complex sums recover repeated low-order cancellation terms deterministically', () => {
    const sum = new CompensatedComplexSum();
    let naiveRe = 0;
    let naiveIm = 0;

    for (let index = 0; index < 1000; index += 1) {
        for (const term of [
            { re: 1e16, im: -1e16 },
            { re: 1, im: -1 },
            { re: -1e16, im: 1e16 }
        ]) {
            sum.add(term);
            naiveRe += term.re;
            naiveIm += term.im;
        }
    }

    assert.deepEqual(sum.value(), { re: 1000, im: -1000 });
    assert.notDeepEqual({ re: naiveRe, im: naiveIm }, sum.value());
});
