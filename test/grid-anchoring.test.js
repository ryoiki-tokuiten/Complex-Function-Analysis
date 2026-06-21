import test from 'node:test';
import assert from 'node:assert/strict';

import {
    generateCartesianGridPointSets,
    generatePolarGridPointSets
} from '../js/rendering/shape-generators.js';

test('Cartesian grid lines are evenly distributed across the visible range', () => {
    const config = {
        xRange: [-2.2, 2.2],
        yRange: [-1.8, 1.8],
        gridDensity: 10,
        curvePoints: 100,
        currentFunction: 'identity',
        zetaContinuationEnabled: false
    };

    const pointSets = generateCartesianGridPointSets(config);
    
    // Check that we got line sets
    assert.ok(pointSets.length > 0);

    // Get the unique x coordinates of the vertical grid lines
    const xCoords = [];
    const yCoords = [];

    for (const set of pointSets) {
        if (set.role === 'grid-vertical') {
            // All points in a vertical line have the same x coordinate
            xCoords.push(set.points[0].re);
        } else if (set.role === 'grid-horizontal') {
            yCoords.push(set.points[0].im);
        }
    }

    assert.ok(xCoords.length > 0);
    assert.ok(yCoords.length > 0);

    // With linearlySampledRange, gridDensity=10 produces 11 points (inclusive of both endpoints)
    // spanning evenly from xRange[0] to xRange[1]
    assert.equal(xCoords.length, 11);
    assert.equal(yCoords.length, 11);

    // Verify evenly spaced: check that the step between consecutive x coords is constant
    xCoords.sort((a, b) => a - b);
    const stepX = (config.xRange[1] - config.xRange[0]) / config.gridDensity;
    for (let i = 0; i < xCoords.length; i++) {
        const expected = config.xRange[0] + i * stepX;
        assert.ok(Math.abs(xCoords[i] - expected) < 1e-9,
            `x[${i}] = ${xCoords[i]}, expected ${expected}`);
    }
});

test('Cartesian grid line count scales with gridDensity', () => {
    const config1 = {
        xRange: [-2.2, 2.2],
        yRange: [-1.8, 1.8],
        gridDensity: 5,
        curvePoints: 100,
        currentFunction: 'identity',
        zetaContinuationEnabled: false
    };

    const config2 = {
        xRange: [-2.2, 2.2],
        yRange: [-1.8, 1.8],
        gridDensity: 20,
        curvePoints: 100,
        currentFunction: 'identity',
        zetaContinuationEnabled: false
    };

    const sets1 = generateCartesianGridPointSets(config1);
    const sets2 = generateCartesianGridPointSets(config2);

    const xCount1 = sets1.filter(s => s.role === 'grid-vertical').length;
    const xCount2 = sets2.filter(s => s.role === 'grid-vertical').length;

    // gridDensity=5 -> 6 lines, gridDensity=20 -> 21 lines
    assert.equal(xCount1, 6);
    assert.equal(xCount2, 21);
});

test('Polar grid radial circles are evenly distributed up to max radius', () => {
    const config = {
        xRange: [-2.0, 2.0],
        yRange: [-2.0, 2.0],
        gridDensity: 10,
        curvePoints: 100
    };

    const pointSets = generatePolarGridPointSets(config);
    const radialCircles = pointSets.filter(s => s.role === 'polar-radial');

    assert.ok(radialCircles.length > 0);
    assert.equal(radialCircles.length, 10);

    // Compute the radius of each circle
    const radii = radialCircles.map(s => {
        const pt = s.points[0];
        return Math.sqrt(pt.re * pt.re + pt.im * pt.im);
    }).sort((a, b) => a - b);

    // Max visible radius is 2.0.
    // Radii should be evenly spaced: (1/10)*2, (2/10)*2, ..., (10/10)*2
    const maxRadius = 2.0;
    for (let i = 0; i < radii.length; i++) {
        const expected = ((i + 1) / config.gridDensity) * maxRadius;
        assert.ok(Math.abs(radii[i] - expected) < 1e-9,
            `radius[${i}] = ${radii[i]}, expected ${expected}`);
    }
});
