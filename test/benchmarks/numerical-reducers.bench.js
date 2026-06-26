import assert from 'node:assert/strict';

import { assertFiniteComplex, runBenchmark } from './utils.js';
import {
    applyDynamicPlottingPreset,
    getDynamicPlotResult,
    invalidateDynamicPlotting
} from '../../js/analysis/dynamic-plotting.js';
import { state } from '../../js/store/state.js';

const EXP_SERIES_COUNTS = Object.freeze({
    smoke: 24,
    standard: 80,
    deep: 160
});

const EULER_PRODUCT_COUNTS = Object.freeze({
    smoke: 24,
    standard: 80,
    deep: 160
});

const CANCELLATION_COUNTS = Object.freeze({
    smoke: 300,
    standard: 3000,
    deep: 9000
});

export async function runNumericalReducersBenchmarks() {
    console.log('\n[Benchmark] Dynamic aggregate reducers for series and products\n');

    await runBenchmark(
        'dynamic exponential-series aggregate reduction',
        ({ profile }) => {
            applyDynamicPlottingPreset('exponential_series');
            state.dynamicPlotting.enabled = true;
            state.dynamicPlotting.source.count = EXP_SERIES_COUNTS[profile];
            state.dynamicPlotting.playback = {
                visibleCount: EXP_SERIES_COUNTS[profile],
                playing: false,
                speed: 10,
                loop: false
            };
            invalidateDynamicPlotting();
            return { expected: Math.E, nextStageIndex: 0 };
        },
        run => getDynamicPlotResult({
            aggregateParameter: { re: 1, im: 0 },
            stageIndex: run.nextStageIndex++
        }),
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 80, warmup: 10 },
                deep: { iterations: 240, warmup: 24 }
            },
            verify: (result, { expected }) => {
                assert.equal(result.diagnostics.length, 0);
                assertFiniteComplex(result.reduction.finalValue, 'dynamic exponential sum');
                assert.ok(Math.abs(result.reduction.finalValue.re - expected) < 1e-12);
                assert.ok(Math.abs(result.reduction.finalValue.im) < 1e-12);
            }
        }
    );

    await runBenchmark(
        'dynamic Euler-product aggregate reduction',
        ({ profile }) => {
            applyDynamicPlottingPreset('euler_product');
            state.dynamicPlotting.enabled = true;
            state.dynamicPlotting.source.count = EULER_PRODUCT_COUNTS[profile];
            state.dynamicPlotting.playback = {
                visibleCount: EULER_PRODUCT_COUNTS[profile],
                playing: false,
                speed: 10,
                loop: false
            };
            invalidateDynamicPlotting();
            return { nextStageIndex: 0 };
        },
        run => getDynamicPlotResult({
            aggregateParameter: { re: 2, im: 0 },
            stageIndex: run.nextStageIndex++
        }),
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 80, warmup: 10 },
                deep: { iterations: 200, warmup: 20 }
            },
            verify: result => {
                assert.equal(result.diagnostics.length, 0);
                assertFiniteComplex(result.reduction.finalValue, 'dynamic Euler product');
                assert.equal(result.reduction.product.finite, true);
                assert.ok(Number.isFinite(result.reduction.product.logAbs));
                assert.ok(result.reduction.finalValue.re > 1);
                assert.ok(result.reduction.finalValue.re < 2);
            }
        }
    );

    await runBenchmark(
        'dynamic adversarial cancellation aggregate reduction',
        ({ profile }) => {
            const count = CANCELLATION_COUNTS[profile];
            Object.assign(state.dynamicPlotting, {
                enabled: true,
                mode: 'aggregate',
                source: { kind: 'naturals', count, start: 0, step: 1, ordering: 'ascending' },
                pointExpression: 'd',
                term: {
                    kind: 'expression',
                    expression: 'mod(d, 3) == 0 ? 1e16 - 1e16*i : (mod(d, 3) == 1 ? 1 - i : -1e16 + 1e16*i)',
                    bindings: []
                },
                reduction: { kind: 'sum', invalidPolicy: 'stop' },
                aggregateParameter: { re: 0, im: 0 },
                playback: {
                    visibleCount: count,
                    playing: false,
                    speed: 10,
                    loop: false
                },
                display: {}
            });
            invalidateDynamicPlotting();
            return { expected: count / 3, nextStageIndex: 0 };
        },
        run => getDynamicPlotResult({ stageIndex: run.nextStageIndex++ }),
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 60, warmup: 6 },
                deep: { iterations: 180, warmup: 18 }
            },
            verify: (result, { expected }) => {
                assert.equal(result.diagnostics.length, 0);
                assert.deepEqual(result.reduction.finalValue, { re: expected, im: -expected });
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
