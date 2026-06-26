import assert from 'node:assert/strict';

import { assertFiniteComplex, runBenchmark } from './utils.js';
import {
    CompensatedComplexSum,
    ScaledComplexProduct,
    reduceComplexTerms
} from '../../js/analysis/reducers.js';
import { complexSin } from '../../js/math-utils.js';

function complexMul(a, b) {
    return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    };
}

function makeSinTaylorTerms(z, count) {
    const terms = new Array(count);
    const zSquared = complexMul(z, z);
    let term = { ...z };

    for (let n = 0; n < count; n += 1) {
        terms[n] = { status: 'valid', termValue: term };
        const denominator = (2 * n + 2) * (2 * n + 3);
        term = complexMul(term, {
            re: -zSquared.re / denominator,
            im: -zSquared.im / denominator
        });
    }

    return terms;
}

export async function runNumericalReducersBenchmarks() {
    console.log('\n[Benchmark] Numerical reducers for series and products\n');

    await runBenchmark(
        'compensated summation of a complex sin(z) Taylor series',
        () => {
            const z = { re: 8, im: -3 };
            return {
                z,
                terms: makeSinTaylorTerms(z, 120),
                expected: complexSin(z)
            };
        },
        ({ terms }) => reduceComplexTerms(
            terms.map(sample => ({ status: sample.status, termValue: sample.termValue })),
            { kind: 'sum', invalidPolicy: 'stop' }
        ),
        {
            profiles: {
                smoke: { iterations: 5, warmup: 1 },
                standard: { iterations: 200, warmup: 25 },
                deep: { iterations: 1000, warmup: 100 }
            },
            verify: (result, { expected }) => {
                assertFiniteComplex(result.finalValue, 'Taylor sum');
                assert.ok(Math.hypot(
                    result.finalValue.re - expected.re,
                    result.finalValue.im - expected.im
                ) < 1e-10);
            }
        }
    );

    await runBenchmark(
        'scaled Weierstrass sine-product compounding',
        () => {
            const z = { re: 1.5, im: 0.5 };
            const zSquared = complexMul(z, z);
            const terms = new Array(5000);

            for (let n = 1; n <= terms.length; n += 1) {
                const denominator = n * n * Math.PI * Math.PI;
                terms[n - 1] = {
                    re: 1 - zSquared.re / denominator,
                    im: -zSquared.im / denominator
                };
            }

            return { terms };
        },
        ({ terms }) => {
            const product = new ScaledComplexProduct();
            for (const term of terms) product.multiply(term);
            return product.snapshot();
        },
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 120, warmup: 15 },
                deep: { iterations: 400, warmup: 40 }
            },
            verify: snapshot => {
                assert.equal(snapshot.finite, true);
                assert.ok(Number.isFinite(snapshot.logAbs));
                assert.ok(Math.abs(Math.hypot(snapshot.normalized.re, snapshot.normalized.im) - 1) < 1e-12);
            }
        }
    );

    await runBenchmark(
        'adversarial compensated cancellation sequence',
        () => Array.from({ length: 1000 }, () => [
            { re: 1e16, im: -1e16 },
            { re: 1, im: -1 },
            { re: -1e16, im: 1e16 }
        ]).flat(),
        terms => {
            const sum = new CompensatedComplexSum();
            for (const term of terms) sum.add(term);
            return sum.value();
        },
        {
            profiles: {
                smoke: { iterations: 5, warmup: 1 },
                standard: { iterations: 300, warmup: 30 },
                deep: { iterations: 1200, warmup: 100 }
            },
            verify: value => {
                assert.deepEqual(value, { re: 1000, im: -1000 });
            }
        }
    );
}

if (process.argv[1]?.endsWith('numerical-reducers.bench.js')) {
    runNumericalReducersBenchmarks().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
