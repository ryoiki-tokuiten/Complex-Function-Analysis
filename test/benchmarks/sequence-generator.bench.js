import assert from 'node:assert/strict';

import { runBenchmark } from './utils.js';
import { generateSequenceBindingSeries } from '../../js/analysis/sequence-bindings.js';

const COUNTS = Object.freeze({
    smoke: 64,
    standard: 1000,
    deep: 3000
});

export async function runSequenceGeneratorBenchmarks() {
    console.log('\n[Benchmark] Sequence binding generation\n');

    await runBenchmark(
        'synchronized prime and Gaussian-prime bindings',
        ({ profile }) => ({
            count: COUNTS[profile],
            bindings: [
                { symbol: 'p', kind: 'primes', min: 2 },
                {
                    symbol: 'g',
                    kind: 'gaussian_primes',
                    bound: 32,
                    boundType: 'norm',
                    associatePolicy: 'representatives',
                    includeConjugates: true
                }
            ]
        }),
        ({ bindings, count }) => generateSequenceBindingSeries(bindings, count),
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 80, warmup: 10 },
                deep: { iterations: 180, warmup: 20 }
            },
            verify: generated => {
                assert.equal(generated.series.p.length, generated.series.g.length);
                assert.equal(generated.environments.length, generated.series.p.length);
                assert.equal(generated.diagnostics.length, 0);
                assert.deepEqual(generated.series.p.slice(0, 5).map(value => value.re), [2, 3, 5, 7, 11]);
            }
        }
    );

    await runBenchmark(
        'filtered complex expression sequence with runtime parameter',
        ({ profile }) => ({
            count: COUNTS[profile],
            bindings: [{
                symbol: 'a',
                kind: 'expression',
                generatorExpression: 'exp(i * j * 0.031) / (j + 1)^s',
                filterExpression: 'abs(d) > 1e-8'
            }],
            runtime: {
                parameters: {
                    s: { re: 0.75, im: 0.2 }
                }
            }
        }),
        ({ bindings, count, runtime }) => generateSequenceBindingSeries(bindings, count, runtime),
        {
            profiles: {
                smoke: { iterations: 2, warmup: 1 },
                standard: { iterations: 60, warmup: 8 },
                deep: { iterations: 160, warmup: 20 }
            },
            verify: generated => {
                assert.ok(generated.series.a.length > 0);
                assert.equal(generated.environments.length, generated.series.a.length);
                assert.ok(generated.series.a.every(value => Number.isFinite(value.re) && Number.isFinite(value.im)));
            }
        }
    );
}

if (process.argv[1]?.endsWith('sequence-generator.bench.js')) {
    runSequenceGeneratorBenchmarks().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
