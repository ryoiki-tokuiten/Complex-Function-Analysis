import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFractalPreset } from '../js/analysis/fractal-presets.js';
import { state } from '../js/store/state.js';
import {
    evaluateDomainColoringMappedTransform,
    getEffectiveBaseTransformFunction,
    getMappedTransformProfile
} from '../js/math-utils.js';
import {
    buildPlanarDomainDynamicsSnapshot,
    disposePlanarDomainDynamics,
    renderPlanarDomainDynamics,
    selectDomainDynamicsBackend
} from '../js/rendering/domain-dynamics.js';
import {
    evaluateDomainDynamicsValue,
    renderDomainDynamicsTile
} from '../js/rendering/domain-dynamics-core.js';

const STATE_KEYS = [
    'currentFunction',
    'currentFunctionPreset',
    'domainColoringEnabled',
    'domainBrightness',
    'domainContrast',
    'domainSaturation',
    'domainLightnessCycles',
    'domainPalette',
    'chainingEnabled',
    'chainingMode',
    'chainCount',
    'fractalOrbitColoringEnabled',
    'algebraicChainingEnabled',
    'algebraicChainingTerms',
    'algebraicChainingZExpr',
    'polynomialN',
    'polynomialCoeffs',
    'mobiusA',
    'mobiusB',
    'mobiusC',
    'mobiusD',
    'fractionalPowerN',
    'zetaContinuationEnabled',
    'taylorSeriesEnabled'
];

const PLANE = Object.freeze({
    width: 8,
    height: 6,
    currentVisXRange: [-2, 1],
    currentVisYRange: [-1, 1]
});

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function snapshotState() {
    return {
        ...Object.fromEntries(STATE_KEYS.map(key => [key, clone(state[key])])),
        dynamicPlottingEnabled: !!state.dynamicPlotting?.enabled
    };
}

function restoreState(snapshot) {
    for (const [key, value] of Object.entries(snapshot)) {
        if (key === 'dynamicPlottingEnabled') {
            if (state.dynamicPlotting) state.dynamicPlotting.enabled = value;
            continue;
        }
        state[key] = value;
    }
}

function configureDynamics(overrides = {}) {
    Object.assign(state, {
        currentFunction: 'sin',
        currentFunctionPreset: null,
        domainColoringEnabled: true,
        domainBrightness: 1,
        domainContrast: 1,
        domainSaturation: 1,
        domainLightnessCycles: 0,
        domainPalette: 'arctic-frost',
        chainingEnabled: true,
        chainingMode: 'recursion',
        chainCount: 4,
        fractalOrbitColoringEnabled: false,
        algebraicChainingEnabled: false,
        algebraicChainingTerms: [],
        algebraicChainingZExpr: 'z',
        polynomialN: 2,
        polynomialCoeffs: [
            { re: 0, im: 0 },
            { re: 0, im: 0 },
            { re: 1, im: 0 }
        ],
        mobiusA: { re: 1, im: 0 },
        mobiusB: { re: 0, im: 0 },
        mobiusC: { re: 0, im: 0 },
        mobiusD: { re: 1, im: 0 },
        fractionalPowerN: 0.5,
        zetaContinuationEnabled: false,
        taylorSeriesEnabled: false,
        ...overrides
    });
    if (state.dynamicPlotting) state.dynamicPlotting.enabled = false;
}

function approxComplex(actual, expected, epsilon = 1e-10) {
    assert.ok(actual, 'expected a finite complex value');
    assert.ok(Math.abs(actual.re - expected.re) < epsilon, `${actual.re} ~= ${expected.re}`);
    assert.ok(Math.abs(actual.im - expected.im) < epsilon, `${actual.im} ~= ${expected.im}`);
}

function makeFakeCanvasEnvironment(targetCtx) {
    const previousDocument = globalThis.document;
    const previousImageData = globalThis.ImageData;
    const previousWorker = globalThis.Worker;

    class FakeImageData {
        constructor(data, width, height) {
            this.data = data;
            this.width = width;
            this.height = height;
        }
    }

    function makeContext(canvas) {
        return {
            canvas,
            puts: [],
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'low',
            save() {},
            restore() {},
            setTransform() {},
            clearRect() {},
            putImageData(image, x, y) {
                this.puts.push({ image, x, y });
            },
            drawImage(source) {
                targetCtx.draws.push({ width: source.width, height: source.height });
            }
        };
    }

    globalThis.ImageData = FakeImageData;
    globalThis.Worker = undefined;
    globalThis.document = {
        createElement(type) {
            assert.equal(type, 'canvas');
            const canvas = {
                width: 0,
                height: 0,
                getContext(kind) {
                    assert.equal(kind, '2d');
                    if (!this.ctx) this.ctx = makeContext(this);
                    return this.ctx;
                }
            };
            return canvas;
        }
    };

    return () => {
        globalThis.document = previousDocument;
        globalThis.ImageData = previousImageData;
        globalThis.Worker = previousWorker;
    };
}

function makeTargetCtx() {
    return {
        draws: [],
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        save() {},
        restore() {},
        setTransform() {},
        clearRect() {},
        drawImage(source) {
            this.draws.push({ width: source.width, height: source.height });
        }
    };
}

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

function iterateQuadraticZeroSeed(c, count, bailout = 1e8) {
    let z = { re: 0, im: 0 };

    for (let index = 0; index < count; index += 1) {
        z = {
            re: z.re * z.re - z.im * z.im + c.re,
            im: 2 * z.re * z.im + c.im
        };

        if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) break;
        if (Math.max(Math.abs(z.re), Math.abs(z.im)) >= bailout) break;
    }

    return z;
}

function makeAlgebraicDynamicsSnapshot(overrides = {}) {
    return {
        functionKey: 'algebraic_chaining',
        chainingEnabled: false,
        chainMode: 'recursion',
        chainCount: 1,
        fractalOrbitColoringEnabled: false,
        algebraicChainingEnabled: true,
        algebraicChainingZExpr: 'z',
        algebraicChainingTerms: [],
        polynomialN: 1,
        polynomialCoeffs: [
            { re: 0, im: 0 },
            { re: 1, im: 0 }
        ],
        mobiusA: { re: 1, im: 0 },
        mobiusB: { re: 0, im: 0 },
        mobiusC: { re: 0, im: 0 },
        mobiusD: { re: 1, im: 0 },
        fractionalPowerN: 0.5,
        zetaContinuationEnabled: false,
        style: {
            brightness: 1,
            contrast: 1,
            saturation: 1,
            lightnessCycles: 0
        },
        paletteStops: [[0, 0, 0], [1, 1, 1]],
        viewport: {
            width: 4,
            height: 4,
            xRange: [-2, 2],
            yRange: [-2, 2]
        },
        ...overrides
    };
}

async function waitFor(predicate, timeoutMs = 1000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('timed out waiting for async domain dynamics render');
}

test('dynamics snapshots represent Mandelbrot, Newton, and generic output chains', () => {
    const before = snapshotState();

    try {
        applyFractalPreset(state, 'mandelbrot');
        let snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });
        assert.equal(snapshot.functionKey, 'algebraic_chaining');
        assert.equal(snapshot.chainMode, 'zero_seed');
        assert.equal(snapshot.chainCount, 256);
        assert.equal(snapshot.fractalOrbitColoringEnabled, true);
        assert.equal(snapshot.paletteStops.length >= 2, true);

        applyFractalPreset(state, 'newton_fractal');
        snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });
        assert.equal(snapshot.functionKey, 'algebraic_chaining');
        assert.equal(snapshot.chainMode, 'recursion');
        assert.equal(snapshot.fractalOrbitColoringEnabled, false);
        assert.equal(snapshot.algebraicChainingTerms.length, 2);

        configureDynamics({ currentFunction: 'exp', chainingMode: 'power', chainCount: 7 });
        snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });
        assert.equal(snapshot.functionKey, 'exp');
        assert.equal(snapshot.chainMode, 'power');
        assert.equal(snapshot.chainCount, 7);
    } finally {
        restoreState(before);
    }
});

test('worker dynamics evaluator matches current mapped output-chain semantics', () => {
    const before = snapshotState();

    try {
        configureDynamics({ currentFunction: 'sin', chainingMode: 'recursion', chainCount: 5 });
        const snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });
        const base = getEffectiveBaseTransformFunction('sin');
        const profile = getMappedTransformProfile('sin', base);
        const expected = evaluateDomainColoringMappedTransform(profile, 0.2, -0.3, 'sin');
        const actual = evaluateDomainDynamicsValue(snapshot, 0.2, -0.3);

        approxComplex(actual, expected);
    } finally {
        restoreState(before);
    }
});

test('domain dynamics tile rendering produces opaque full tile data', () => {
    const before = snapshotState();

    try {
        configureDynamics({ currentFunction: 'cos', chainCount: 3 });
        const snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });
        const pixels = renderDomainDynamicsTile(snapshot, { x: 0, y: 0, width: 2, height: 2, scale: 1 });

        assert.equal(pixels.length, 16);
        assert.deepEqual([pixels[3], pixels[7], pixels[11], pixels[15]], [255, 255, 255, 255]);
    } finally {
        restoreState(before);
    }
});

test('unknown algebraic functions are invalid instead of implicit identity', () => {
    const snapshot = makeAlgebraicDynamicsSnapshot({
        algebraicChainingTerms: [{
            coeff: { re: 1, im: 0 },
            factors: [algebraicFactor('not_registered')]
        }]
    });

    assert.equal(evaluateDomainDynamicsValue(snapshot, 0.25, -0.5), null);
});

test('generic polynomial-parameter orbit rendering defines pixel indices', () => {
    const snapshot = makeAlgebraicDynamicsSnapshot({
        chainingEnabled: true,
        chainMode: 'zero_seed',
        chainCount: 2,
        fractalOrbitColoringEnabled: true,
        polynomialN: 3,
        polynomialCoeffs: [
            { re: 0, im: 0 },
            { re: 0, im: 0 },
            { re: 0, im: 0 },
            { re: 1, im: 0 }
        ],
        algebraicChainingTerms: [
            { coeff: { re: 1, im: 0 }, factors: [algebraicFactor('polynomial')] },
            { coeff: { re: 1, im: 0 }, factors: [algebraicFactor('c')] }
        ]
    });

    const pixels = renderDomainDynamicsTile(snapshot, { x: 0, y: 0, width: 1, height: 1, scale: 1 });
    assert.equal(pixels.length, 4);
});

test('backend selection uses the worker dynamics backend', () => {
    const before = snapshotState();

    try {
        configureDynamics();
        const snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });

        assert.equal(selectDomainDynamicsBackend(snapshot).id, 'worker-cpu');
    } finally {
        restoreState(before);
    }
});

test('async renderer reaches final scale one without another redraw trigger', async () => {
    const before = snapshotState();
    const targetCtx = makeTargetCtx();
    const restoreGlobals = makeFakeCanvasEnvironment(targetCtx);

    try {
        disposePlanarDomainDynamics();
        configureDynamics({ currentFunction: 'sin', chainCount: 2 });
        const snapshot = buildPlanarDomainDynamicsSnapshot(state, PLANE, { isWPlaneColoring: false });

        assert.equal(renderPlanarDomainDynamics(targetCtx, PLANE, snapshot), true);
        await waitFor(() => targetCtx.draws.some(draw => draw.width === PLANE.width && draw.height === PLANE.height));
        assert.ok(targetCtx.draws.length <= 3);
    } finally {
        disposePlanarDomainDynamics();
        restoreGlobals();
        restoreState(before);
    }
});

test('async renderer ignores canceled old final tiles after viewport changes', async () => {
    const before = snapshotState();
    const targetCtx = makeTargetCtx();
    const restoreGlobals = makeFakeCanvasEnvironment(targetCtx);
    const oldPlane = { ...PLANE, width: 7 };
    const nextPlane = { ...PLANE, width: 11 };

    try {
        disposePlanarDomainDynamics();
        configureDynamics({ currentFunction: 'sin', chainCount: 2 });
        const oldSnapshot = buildPlanarDomainDynamicsSnapshot(state, oldPlane, { isWPlaneColoring: false });
        const nextSnapshot = buildPlanarDomainDynamicsSnapshot(state, nextPlane, { isWPlaneColoring: false });

        assert.equal(renderPlanarDomainDynamics(targetCtx, oldPlane, oldSnapshot), true);
        assert.equal(renderPlanarDomainDynamics(targetCtx, nextPlane, nextSnapshot), true);

        await waitFor(() => targetCtx.draws.some(draw => draw.width === nextPlane.width && draw.height === nextPlane.height));
        assert.equal(targetCtx.draws.some(draw => draw.width === oldPlane.width), false);
    } finally {
        disposePlanarDomainDynamics();
        restoreGlobals();
        restoreState(before);
    }
});

test('deep Mandelbrot zero-seed dynamics match an independent orbit recurrence', () => {
    const deepPlane = {
        width: 64,
        height: 64,
        currentVisXRange: [-0.745, -0.742],
        currentVisYRange: [0.130, 0.133]
    };
    const before = snapshotState();

    try {
        applyFractalPreset(state, 'mandelbrot');
        state.chainCount = 1000;

        const snapshot = buildPlanarDomainDynamicsSnapshot(state, deepPlane, { isWPlaneColoring: false });

        for (const c of [
            { re: 0, im: 0 },
            { re: 2, im: 2 },
            { re: -0.743643887037151, im: 0.13182590420533 },
            { re: -0.75, im: 0.1 }
        ]) {
            approxComplex(
                evaluateDomainDynamicsValue(snapshot, c.re, c.im),
                iterateQuadraticZeroSeed(c, snapshot.chainCount)
            );
        }
    } finally {
        restoreState(before);
    }
});

test('worker algebraic output chains match the main domain-coloring pipeline across modes', () => {
    const before = snapshotState();
    const plane = {
        width: 9,
        height: 7,
        currentVisXRange: [-1, 1],
        currentVisYRange: [-1, 1]
    };
    const algebraicTerms = [
        { coeff: { re: 0.7, im: -0.2 }, factors: [algebraicFactor('polynomial')] },
        { coeff: { re: 0.25, im: 0.1 }, factors: [algebraicFactor('sin')] },
        { coeff: { re: 0.08, im: -0.04 }, factors: [algebraicFactor('c')] },
        { coeff: { re: 0.05, im: 0 }, factors: [algebraicFactor('cosh', { reciprocal: true })] }
    ];
    const points = [
        { re: -0.4, im: 0.2 },
        { re: 0.35, im: -0.45 },
        { re: 0.05, im: 0.6 }
    ];

    try {
        for (const mode of ['recursion', 'power', 'sqrt', 'ln', 'exp', 'reciprocal']) {
            configureDynamics({
                currentFunction: 'algebraic_chaining',
                algebraicChainingEnabled: true,
                algebraicChainingZExpr: 'z',
                algebraicChainingTerms: algebraicTerms,
                polynomialN: 2,
                polynomialCoeffs: [
                    { re: 0.1, im: -0.05 },
                    { re: 0.4, im: 0.15 },
                    { re: -0.2, im: 0.05 }
                ],
                chainingEnabled: true,
                chainingMode: mode,
                chainCount: mode === 'exp' ? 2 : 4
            });

            const snapshot = buildPlanarDomainDynamicsSnapshot(state, plane, { isWPlaneColoring: false });
            const profile = getMappedTransformProfile(
                'algebraic_chaining',
                getEffectiveBaseTransformFunction('algebraic_chaining')
            );

            for (const point of points) {
                approxComplex(
                    evaluateDomainDynamicsValue(snapshot, point.re, point.im),
                    evaluateDomainColoringMappedTransform(profile, point.re, point.im, 'algebraic_chaining'),
                    1e-10
                );
            }
        }
    } finally {
        restoreState(before);
    }
});

test('worker zeta continuation chains match the main mapped transform in the critical strip', () => {
    const before = snapshotState();
    const plane = {
        width: 8,
        height: 8,
        currentVisXRange: [-3, 3],
        currentVisYRange: [-15, 15]
    };

    try {
        configureDynamics({
            currentFunction: 'zeta',
            zetaContinuationEnabled: true,
            chainingEnabled: true,
            chainingMode: 'recursion',
            chainCount: 2
        });

        const snapshot = buildPlanarDomainDynamicsSnapshot(state, plane, { isWPlaneColoring: false });
        const profile = getMappedTransformProfile('zeta', getEffectiveBaseTransformFunction('zeta'));

        for (const point of [
            { re: 2, im: 0 },
            { re: 0.5, im: 2 },
            { re: 0.5, im: 14.134725141734693 },
            { re: -2, im: 0 }
        ]) {
            approxComplex(
                evaluateDomainDynamicsValue(snapshot, point.re, point.im),
                evaluateDomainColoringMappedTransform(profile, point.re, point.im, 'zeta'),
                1e-10
            );
        }
    } finally {
        restoreState(before);
    }
});

test('collapsed sub-ulp viewport ranges render deterministically uniform tiles', () => {
    const before = snapshotState();
    const center = { re: 0.3, im: -0.2 };
    const delta = 1e-50;
    const plane = {
        width: 8,
        height: 8,
        currentVisXRange: [center.re, center.re + delta],
        currentVisYRange: [center.im, center.im + delta]
    };

    try {
        configureDynamics({
            currentFunction: 'exp',
            chainingEnabled: true,
            chainingMode: 'recursion',
            chainCount: 2
        });

        assert.equal(plane.currentVisXRange[0], plane.currentVisXRange[1]);
        assert.equal(plane.currentVisYRange[0], plane.currentVisYRange[1]);

        const snapshot = buildPlanarDomainDynamicsSnapshot(state, plane, { isWPlaneColoring: false });
        const pixels = renderDomainDynamicsTile(snapshot, { x: 0, y: 0, width: plane.width, height: plane.height, scale: 1 });
        const firstPixel = Array.from(pixels.slice(0, 4));

        for (let offset = 0; offset < pixels.length; offset += 4) {
            assert.deepEqual(Array.from(pixels.slice(offset, offset + 4)), firstPixel);
        }
    } finally {
        restoreState(before);
    }
});
