import { BENCH_PROFILE } from './utils.js';
import { runAlgebraicCompilerBenchmarks } from './algebraic-compiler.bench.js';
import { runNumericalReducersBenchmarks } from './numerical-reducers.bench.js';
import { runPlanarRenderingBenchmarks } from './planar-rendering.bench.js';
import { runSequenceGeneratorBenchmarks } from './sequence-generator.bench.js';
import { runStreamlineTracingBenchmarks } from './streamline-tracing.bench.js';

async function main() {
    console.log(`[Benchmark Suite] profile=${BENCH_PROFILE}`);
    await runAlgebraicCompilerBenchmarks();
    await runNumericalReducersBenchmarks();
    await runPlanarRenderingBenchmarks();
    await runSequenceGeneratorBenchmarks();
    await runStreamlineTracingBenchmarks();
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
