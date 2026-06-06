import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildPlotlySphereMesh,
    getPlotlySphereResolution
} from '../js/rendering/draw-plotly-sphere.js';

function makeColorState(overrides = {}) {
    return {
        domainColoringEnabled: true,
        domainPalette: 'calming',
        domainBrightness: 1,
        domainContrast: 1,
        domainSaturation: 1,
        domainLightnessCycles: 1,
        ...overrides
    };
}

test('Plotly sphere mesh includes one domain color per vertex when enabled', () => {
    const mesh = buildPlotlySphereMesh(makeColorState(), 24);

    assert.equal(mesh.x.length, 25 * 25);
    assert.equal(mesh.vertexcolor.length, mesh.x.length);
    assert.equal(mesh.i.length, 24 * 24 * 2);
    assert.ok(new Set(mesh.vertexcolor).size > 100);
});

test('Plotly sphere mesh omits vertex colors when domain coloring is disabled', () => {
    const mesh = buildPlotlySphereMesh(makeColorState({
        domainColoringEnabled: false
    }), 24);

    assert.equal(mesh.vertexcolor, null);
});

test('Plotly sphere colors use the shared domain palette', () => {
    const calming = buildPlotlySphereMesh(makeColorState(), 24);
    const classic = buildPlotlySphereMesh(makeColorState({
        domainPalette: 'classic'
    }), 24);

    assert.notDeepEqual(calming.vertexcolor, classic.vertexcolor);
});

test('Plotly sphere keeps high detail for normal chains and scales for extreme depth', () => {
    assert.equal(getPlotlySphereResolution({
        chainingEnabled: false,
        chainCount: 1
    }), 200);
    assert.equal(getPlotlySphereResolution({
        chainingEnabled: true,
        chainCount: 3
    }), 200);
    assert.equal(getPlotlySphereResolution({
        chainingEnabled: true,
        chainCount: 12
    }), 128);
});
