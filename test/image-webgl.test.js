import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getImageRenderChainIndex,
    shouldUseInverseImagePath
} from '../js/rendering/draw-image-webgl.js';

function rasterSnapshot(overrides = {}) {
    return {
        currentFunction: 'sin',
        chainingMode: 'recursion',
        polynomialN: 2,
        navigationModeEnabled: false,
        ...overrides
    };
}

test('collapsed raster output uses the resolved map stage instead of display panel index', () => {
    assert.equal(getImageRenderChainIndex(0, { stage: 29 }), 29);
    assert.equal(getImageRenderChainIndex(4, { stage: 7 }), 7);
    assert.equal(getImageRenderChainIndex(4, null), 4);
});

test('deep chained raster outputs skip the bounded inverse shader path', () => {
    const snapshot = rasterSnapshot();

    assert.equal(shouldUseInverseImagePath(true, snapshot, 0), true);
    assert.equal(shouldUseInverseImagePath(true, snapshot, 15), true);
    assert.equal(shouldUseInverseImagePath(true, snapshot, 16), false);
    assert.equal(shouldUseInverseImagePath(false, snapshot, 100), true);
});

