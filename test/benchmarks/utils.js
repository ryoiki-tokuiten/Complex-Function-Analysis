import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const PROFILE_DEFAULTS = Object.freeze({
    smoke: Object.freeze({ iterations: 3, warmup: 1 }),
    standard: Object.freeze({ iterations: 50, warmup: 10 }),
    deep: Object.freeze({ iterations: 200, warmup: 30 })
});

export const BENCH_PROFILE = PROFILE_DEFAULTS[process.env.BENCH_PROFILE]
    ? process.env.BENCH_PROFILE
    : 'standard';

let sink = 0;

function numberOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

function checksum(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (!value) return 0;
    if (typeof value.re === 'number' || typeof value.im === 'number') {
        return (Number.isFinite(value.re) ? value.re : 0) + (Number.isFinite(value.im) ? value.im : 0);
    }
    if (ArrayBuffer.isView(value)) {
        const step = Math.max(1, Math.floor(value.length / 32));
        let total = value.length;
        for (let index = 0; index < value.length; index += step) {
            total += Number.isFinite(value[index]) ? value[index] : 0;
        }
        return total;
    }
    if (Array.isArray(value)) {
        return value.length + checksum(value[0]) + checksum(value[value.length - 1]);
    }
    if (typeof value === 'object') {
        return checksum(value.checksum ?? value.value ?? value.finalValue ?? value.reduction ?? value.product ?? value.result);
    }
    return 0;
}

function consume(value) {
    sink = (sink + checksum(value)) % 1_000_000_007;
}

function resolveProfile(options) {
    const defaults = PROFILE_DEFAULTS[BENCH_PROFILE];
    const profileOptions = options.profiles?.[BENCH_PROFILE] || {};
    return {
        iterations: numberOr(process.env.BENCH_ITERATIONS, profileOptions.iterations ?? options.iterations ?? defaults.iterations),
        warmup: numberOr(process.env.BENCH_WARMUP, profileOptions.warmup ?? options.warmup ?? defaults.warmup)
    };
}

export function assertFiniteComplex(value, label = 'value') {
    assert.ok(value, `${label} should exist`);
    assert.ok(Number.isFinite(value.re), `${label}.re should be finite`);
    assert.ok(Number.isFinite(value.im), `${label}.im should be finite`);
}

export async function runBenchmark(name, setup, fn, options = {}) {
    const state = setup ? await setup({ profile: BENCH_PROFILE }) : null;
    const { iterations, warmup } = resolveProfile(options);

    if (options.verify) {
        options.verify(fn(state), state);
    }

    for (let index = 0; index < warmup; index += 1) {
        consume(fn(state));
    }

    if (global.gc) global.gc();
    const startHeap = process.memoryUsage().heapUsed;
    const times = new Float64Array(iterations);

    for (let index = 0; index < iterations; index += 1) {
        const started = performance.now();
        const result = fn(state);
        times[index] = performance.now() - started;
        consume(result);
    }

    if (global.gc) global.gc();
    const endHeap = process.memoryUsage().heapUsed;
    times.sort();

    const sum = times.reduce((acc, value) => acc + value, 0);
    const mean = sum / iterations;
    const median = times[Math.floor(iterations / 2)];
    const p95 = times[Math.min(iterations - 1, Math.floor(iterations * 0.95))];
    const min = times[0];
    const max = times[iterations - 1];
    const opsPerSec = mean > 0 ? 1000 / mean : Infinity;
    const heapDeltaKb = (endHeap - startHeap) / 1024;

    console.log(`\nBenchmark: ${name}`);
    console.log(`Profile: ${BENCH_PROFILE} | Iterations: ${iterations} | Warmup: ${warmup}`);
    console.log(`Ops/sec: ${opsPerSec.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`Mean/Median/P95: ${mean.toFixed(4)} / ${median.toFixed(4)} / ${p95.toFixed(4)} ms`);
    console.log(`Min/Max: ${min.toFixed(4)} / ${max.toFixed(4)} ms`);
    console.log(`Heap delta: ${heapDeltaKb.toFixed(1)} KB | Sink: ${sink.toFixed(3)}`);

    return { name, iterations, warmup, mean, median, p95, min, max, opsPerSec, heapDeltaKb };
}
