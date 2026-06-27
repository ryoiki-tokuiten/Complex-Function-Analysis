const NONE_FACTOR_FLAGS = Object.freeze({
    chainedFunc: 'none',
    power: 1.0,
    reciprocal: false,
    log: false,
    exp: false
});

function complex(re, im = 0) {
    return { re, im };
}

function factor(func, options = null) {
    return { func, ...NONE_FACTOR_FLAGS, ...(options || {}) };
}

function term(coeff, factors) {
    return { coeff, factors };
}

function cloneComplexList(values) {
    return values.map(value => complex(value.re, value.im));
}

function cloneTerms(terms) {
    return terms.map(item => ({
        coeff: complex(item.coeff.re, item.coeff.im),
        factors: item.factors.map(entry => ({ ...entry }))
    }));
}

export const FRACTAL_PRESETS = Object.freeze({
    mandelbrot: Object.freeze({
        label: 'Mandelbrot',
        chainMode: 'zero_seed',
        chainCount: 256,
        fractalOrbitColoringEnabled: true,
        currentInputShape: 'empty_grid',
        domainPalette: 'arctic-frost',
        polynomialN: 2,
        polynomialCoeffs: Object.freeze([
            complex(0),
            complex(0),
            complex(1)
        ]),
        algebraicChainingTerms: Object.freeze([
            term(complex(1), [factor('polynomial')]),
            term(complex(1), [factor('c')])
        ])
    }),
    newton_fractal: Object.freeze({
        label: 'Newton Fractals',
        chainMode: 'recursion',
        chainCount: 64,
        fractalOrbitColoringEnabled: false,
        currentInputShape: 'empty_grid',
        domainPalette: 'arctic-frost',
        polynomialN: 1,
        polynomialCoeffs: Object.freeze([
            complex(0),
            complex(1)
        ]),
        algebraicChainingTerms: Object.freeze([
            term(complex(2 / 3), [factor('polynomial')]),
            term(complex(1 / 3), [factor('polynomial', { power: 2, reciprocal: true })])
        ])
    })
});

export function isFractalPresetKey(key) {
    return Object.prototype.hasOwnProperty.call(FRACTAL_PRESETS, key);
}

export function applyFractalPreset(runtimeState, key) {
    const preset = FRACTAL_PRESETS[key];
    if (!preset || !runtimeState) return null;

    Object.assign(runtimeState, {
        currentFunction: 'algebraic_chaining',
        currentFunctionPreset: key,
        fourierModeEnabled: false,
        laplaceModeEnabled: false,
        algebraicChainingEnabled: true,
        chainingEnabled: true,
        chainingMode: preset.chainMode,
        chainCount: preset.chainCount,
        fractalOrbitColoringEnabled: preset.fractalOrbitColoringEnabled,
        domainColoringEnabled: true,
        currentInputShape: preset.currentInputShape,
        domainPalette: preset.domainPalette,
        polynomialN: preset.polynomialN,
        polynomialCoeffs: cloneComplexList(preset.polynomialCoeffs),
        algebraicChainingTerms: cloneTerms(preset.algebraicChainingTerms)
    });

    return preset;
}
