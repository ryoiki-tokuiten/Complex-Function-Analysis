import assert from 'node:assert/strict';

import { runBenchmark } from './utils.js';
import { generateCurrentMappedInputShapePointSets } from '../../js/rendering/shape-generators.js';
import { preparePointSetForMappedPlane } from '../../js/rendering/draw-planar.js';

const GRID_DENSITIES = Object.freeze({
    smoke: 12,
    standard: 48,
    deep: 96
});

function expTransform(re, im) {
    const magnitude = Math.exp(re);
    return {
        re: magnitude * Math.cos(im),
        im: magnitude * Math.sin(im)
    };
}

export async function runPlanarRenderingBenchmarks() {
    console.log('\n[Benchmark] Planar transformed-grid preparation and mapping\n');

    await runBenchmark(
        'prepare and map Cartesian grid through w = exp(z)',
        ({ profile }) => {
            const gridDensity = GRID_DENSITIES[profile];
            const planeParams = {
                currentVisXRange: [-Math.PI, Math.PI],
                currentVisYRange: [-Math.PI, Math.PI]
            };
            const pointSets = generateCurrentMappedInputShapePointSets(planeParams, {
                currentInputShape: 'grid_cartesian',
                currentFunction: 'exp',
                zetaContinuationEnabled: false,
                gridDensity,
                curvePoints: 96
            });

            return { pointSets, transform: expTransform };
        },
        ({ pointSets, transform }) => {
            let pointCount = 0;
            let checksum = 0;

            for (const pointSet of pointSets) {
                const prepared = preparePointSetForMappedPlane(pointSet, transform, {
                    sampleCountResolver: () => 192
                });

                for (const point of prepared.points) {
                    if (!point || !Number.isFinite(point.re) || !Number.isFinite(point.im)) continue;
                    const mapped = transform(point.re, point.im);
                    pointCount += 1;
                    checksum += mapped.re * 0.125 + mapped.im * 0.25;
                }
            }

            return { pointCount, checksum };
        },
        {
            profiles: {
                smoke: { iterations: 3, warmup: 1 },
                standard: { iterations: 80, warmup: 10 },
                deep: { iterations: 240, warmup: 30 }
            },
            verify: ({ pointCount, checksum }, { pointSets }) => {
                assert.ok(pointSets.length > 0);
                assert.ok(pointCount >= pointSets.length * 64);
                assert.ok(Number.isFinite(checksum));
            }
        }
    );
}

if (process.argv[1]?.endsWith('planar-rendering.bench.js')) {
    runPlanarRenderingBenchmarks().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
