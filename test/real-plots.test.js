import test from 'node:test';
import assert from 'node:assert/strict';

import { sampleRealPlotSurface } from '../js/rendering/real-plots-renderer.js';

function allFinite(values) {
    return values.every(Number.isFinite);
}

test('real 3D plot sampling produces finite heightfield buffers for singular functions', () => {
    const sampled = sampleRealPlotSurface(
        (re, im) => {
            const denom = re * re + im * im;
            if (denom === 0) return { re: NaN, im: NaN };
            return { re: re / denom, im: -im / denom };
        },
        {
            segments: 10,
            xRange: [-1, 1],
            yRange: [-1, 1],
            inputExpr: 'x',
            imagExpr: 'y',
            outputComponent: 'magnitude',
            heightScale: 1,
            colorMode: 'phase'
        }
    );

    assert.equal(sampled.vertexCount, 121);
    assert.equal(sampled.finiteResultCount, 120);
    assert.ok(allFinite(sampled.positions));
    assert.ok(allFinite(sampled.normals));
    assert.ok(allFinite(sampled.colors));
    assert.ok(Math.max(...sampled.positions.filter((_value, index) => index % 3 === 1)) <= 2);
});

test('real 3D plot sampling preserves the selected real component range', () => {
    const sampled = sampleRealPlotSurface(
        (re, im) => ({ re: re * re - im * im, im: 2 * re * im }),
        {
            segments: 12,
            xRange: [-1, 1],
            yRange: [-1, 1],
            inputExpr: 'x',
            imagExpr: 'y',
            outputComponent: 'real'
        }
    );

    assert.ok(Math.abs(sampled.minValue + 1) < 1e-12);
    assert.ok(Math.abs(sampled.maxValue - 1) < 1e-12);

    for (let offset = 0; offset < sampled.normals.length; offset += 3) {
        const length = Math.hypot(
            sampled.normals[offset],
            sampled.normals[offset + 1],
            sampled.normals[offset + 2]
        );
        assert.ok(Math.abs(length - 1) < 1e-5);
    }
});
