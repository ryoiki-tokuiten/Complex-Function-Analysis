import test from 'node:test';
import assert from 'node:assert/strict';

import {
    generateCartesianGridPointSets,
    generatePolarGridPointSets
} from '../js/rendering/shape-generators.js';

test('Cartesian grid lines are anchored to multiples of the calculated step', () => {
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

    // Verify step size (with density 10 and span 4.4, step should be 0.5)
    // -2.2 to 2.2 spans 4.4. 4.4 / 10 = 0.44 -> calculateGridStep selects 0.5.
    // Multiples of 0.5 in [-2.2, 2.2] are: -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0.
    const expectedXCoords = [-2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0];
    
    // Sort and compare
    xCoords.sort((a, b) => a - b);
    assert.equal(xCoords.length, expectedXCoords.length);
    for (let i = 0; i < xCoords.length; i++) {
        assert.ok(Math.abs(xCoords[i] - expectedXCoords[i]) < 1e-9);
    }
});

test('Cartesian grid lines do not drift when panning', () => {
    const config1 = {
        xRange: [-2.2, 2.2],
        yRange: [-1.8, 1.8],
        gridDensity: 10,
        curvePoints: 100,
        currentFunction: 'identity',
        zetaContinuationEnabled: false
    };

    // Pan right by 0.1
    const config2 = {
        xRange: [-2.1, 2.3],
        yRange: [-1.8, 1.8],
        gridDensity: 10,
        curvePoints: 100,
        currentFunction: 'identity',
        zetaContinuationEnabled: false
    };

    const pointSets1 = generateCartesianGridPointSets(config1);
    const pointSets2 = generateCartesianGridPointSets(config2);

    const xCoords1 = pointSets1.filter(s => s.role === 'grid-vertical').map(s => s.points[0].re).sort((a, b) => a - b);
    const xCoords2 = pointSets2.filter(s => s.role === 'grid-vertical').map(s => s.points[0].re).sort((a, b) => a - b);

    // In config2 [-2.1, 2.3], multiples of 0.5 are: -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0.
    // They should be identical!
    assert.deepEqual(xCoords1, xCoords2);
});

test('Polar grid radial circles are anchored to multiples of the calculated step', () => {
    const config = {
        // max visible radius will be sqrt(2^2 + 2^2) = 2.828...
        xRange: [-2.0, 2.0],
        yRange: [-2.0, 2.0],
        gridDensity: 10,
        curvePoints: 100
    };

    const pointSets = generatePolarGridPointSets(config);
    const radialCircles = pointSets.filter(s => s.role === 'polar-radial');

    assert.ok(radialCircles.length > 0);

    // First point of a circle at (0, 0) with radius R has re = R, im = 0 (or similar)
    // Let's verify by computing the radius of each circle: sqrt(re^2 + im^2)
    const radii = radialCircles.map(s => {
        const pt = s.points[0];
        return Math.sqrt(pt.re * pt.re + pt.im * pt.im);
    }).sort((a, b) => a - b);

    // Max visible radius is 2.0.
    // calculateGridStep with span 2.0 and target 10 selects 0.2.
    // The expected radii should be: 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0.
    const expectedRadii = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.2);

    assert.equal(radii.length, expectedRadii.length);
    for (let i = 0; i < radii.length; i++) {
        assert.ok(Math.abs(radii[i] - expectedRadii[i]) < 1e-9);
    }
});
