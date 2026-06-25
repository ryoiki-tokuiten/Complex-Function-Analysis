import test from 'node:test';
import assert from 'node:assert/strict';

import { drawComplexLineSetOnPlane } from '../js/rendering/draw-planar.js';
import { PolylineCaptureContext } from '../js/rendering/webgl-planar.js';

test('Polyline capture stays active when Path2D is available', () => {
    const previousPath2D = globalThis.Path2D;

    globalThis.Path2D = class {
        moveTo() {}
        lineTo() {}
    };

    try {
        const ctx = new PolylineCaptureContext();
        const planeParams = {
            width: 320,
            height: 240,
            origin: { x: 160, y: 120 },
            scale: { x: 20, y: 20 }
        };
        const points = Array.from({ length: 72 }, (_, index) => ({
            re: index / 10,
            im: Math.sin(index / 10)
        }));

        drawComplexLineSetOnPlane(ctx, planeParams, points);

        assert.equal(ctx.isCaptureSupported(), true);
        assert.ok(ctx.getBatches().length > 0);
    } finally {
        if (previousPath2D === undefined) {
            delete globalThis.Path2D;
        } else {
            globalThis.Path2D = previousPath2D;
        }
    }
});
