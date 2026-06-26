import assert from 'node:assert/strict';

import { runBenchmark } from './utils.js';
import { calculateStreamline } from '../../js/analysis/streamline.js';
import { state } from '../../js/store/state.js';
import { getChainedTransformFunction } from '../../js/math-utils.js';

const BATCH_SEED_COUNTS = Object.freeze({
    smoke: 4,
    standard: 18,
    deep: 40
});

function algebraicFactor(func, overrides = {}) {
    return {
        func,
        chainedFunc: 'none',
        power: 1,
        reciprocal: false,
        log: false,
        exp: false,
        ...overrides
    };
}

function makeCircularSeeds(count, radius = 1.25) {
    return Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
        };
    });
}

export async function runStreamlineTracingBenchmarks() {
    console.log('\n[Benchmark] Streamline tracing\n');

    await runBenchmark(
        'Magnus-effect cylinder flow streamline',
        () => {
            const planeParams = {
                currentVisXRange: [-3, 3],
                currentVisYRange: [-3, 3]
            };
            const streamlineState = {
                streamlineStepSize: 0.01,
                streamlineMaxLength: 650
            };
            const R = 1;
            const U = 1;
            const gamma = 2;

            const evaluator = (re, im) => {
                const r2 = re * re + im * im;
                if (r2 < R * R) return { vx: 0, vy: 0 };

                const z2Re = re * re - im * im;
                const z2Im = 2 * re * im;
                const z2Mag2 = z2Re * z2Re + z2Im * z2Im;
                const term1Re = U * (1 - (R * R * z2Re) / z2Mag2);
                const term1Im = U * ((R * R * z2Im) / z2Mag2);
                const scale = gamma / (2 * Math.PI * r2);
                const term2Re = im * scale;
                const term2Im = re * scale;

                return {
                    vx: term1Re + term2Re,
                    vy: -(term1Im + term2Im)
                };
            };

            return { planeParams, streamlineState, evaluator };
        },
        ({ planeParams, streamlineState, evaluator }) =>
            calculateStreamline(-2.5, 0.5, evaluator, planeParams, streamlineState),
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 600, warmup: 60 },
                deep: { iterations: 2500, warmup: 200 }
            },
            verify: path => {
                assert.ok(path.length > 100);
                assert.ok(path.every(point =>
                    Number.isFinite(point.x) &&
                    Number.isFinite(point.y) &&
                    Number.isFinite(point.magnitude)
                ));
            }
        }
    );

    await runBenchmark(
        'batched algebraic output-chain vector streamlines',
        ({ profile }) => {
            Object.assign(state, {
                currentFunction: 'algebraic_chaining',
                algebraicChainingEnabled: true,
                algebraicChainingZExpr: 'z',
                polynomialN: 1,
                polynomialCoeffs: [
                    { re: 0, im: 0 },
                    { re: 1, im: 0 }
                ],
                algebraicChainingTerms: [
                    { coeff: { re: 2 / 3, im: 0 }, factors: [algebraicFactor('polynomial')] },
                    { coeff: { re: 1 / 3, im: 0 }, factors: [algebraicFactor('polynomial', { power: 2, reciprocal: true })] }
                ],
                chainingEnabled: true,
                chainingMode: 'recursion',
                chainCount: 8
            });

            const map = getChainedTransformFunction('algebraic_chaining');
            return {
                seeds: makeCircularSeeds(BATCH_SEED_COUNTS[profile]),
                planeParams: {
                    currentVisXRange: [-2, 2],
                    currentVisYRange: [-2, 2]
                },
                streamlineState: {
                    streamlineStepSize: 0.006,
                    streamlineMaxLength: 240
                },
                evaluator: (re, im) => {
                    const value = map(re, im);
                    return { vx: value.re, vy: value.im };
                }
            };
        },
        ({ seeds, planeParams, streamlineState, evaluator }) => {
            let totalPoints = 0;
            let checksum = 0;

            for (const seed of seeds) {
                const path = calculateStreamline(seed.x, seed.y, evaluator, planeParams, streamlineState);
                totalPoints += path.length;
                for (const point of path) checksum += point.x * 0.5 + point.y * 0.25;
            }

            return { totalPoints, checksum };
        },
        {
            profiles: {
                smoke: { iterations: 2, warmup: 1 },
                standard: { iterations: 120, warmup: 12 },
                deep: { iterations: 400, warmup: 40 }
            },
            verify: ({ totalPoints, checksum }, { seeds }) => {
                assert.ok(totalPoints > seeds.length * 20);
                assert.ok(Number.isFinite(checksum));
            }
        }
    );
}

if (process.argv[1]?.endsWith('streamline-tracing.bench.js')) {
    runStreamlineTracingBenchmarks().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
