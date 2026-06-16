import {
    collectExpressionDependencies,
    parseExpression
} from '../math/expression/index.js';
import { generateDiscreteSource } from './discrete-sources.js';

const BUILT_IN_VARIABLES = new Set([
    'c', 'd', 'j', 'z', 's', 'i', 'pi', 'e', 'true', 'false'
]);

export const SEQUENCE_BINDING_KINDS = Object.freeze([
    Object.freeze({ id: 'parameter', label: 'Free complex parameter' }),
    Object.freeze({ id: 'parameter_real', label: 'Free real parameter' }),
    Object.freeze({ id: 'constant', label: 'Fixed complex value' }),
    Object.freeze({ id: 'naturals', label: 'Natural numbers' }),
    Object.freeze({ id: 'integers', label: 'Integers' }),
    Object.freeze({ id: 'primes', label: 'Prime numbers' }),
    Object.freeze({ id: 'gaussian_integers', label: 'Gaussian integers' }),
    Object.freeze({ id: 'gaussian_primes', label: 'Gaussian primes' }),
    Object.freeze({ id: 'arithmetic', label: 'Arithmetic progression' }),
    Object.freeze({ id: 'geometric', label: 'Geometric progression' }),
    Object.freeze({ id: 'harmonic', label: 'Harmonic progression' }),
    Object.freeze({ id: 'expression', label: 'Custom rule in j' }),
    Object.freeze({ id: 'custom_points', label: 'Explicit value list' })
]);

function finiteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function complexValue(value, fallback = { re: 1, im: 0 }) {
    return {
        re: finiteNumber(value?.re, fallback.re),
        im: finiteNumber(value?.im, fallback.im)
    };
}

export function createDefaultSequenceBinding(symbol) {
    const normalized = String(symbol || '').trim();
    const indexLike = /^(n|k|m|r)$/i.test(normalized);
    return {
        id: `binding-${normalized || 'value'}`,
        symbol: normalized,
        kind: normalized.toLowerCase() === 'x'
            ? 'parameter'
            : indexLike
                ? 'naturals'
                : 'constant',
        value: { re: 1, im: 0 },
        start: indexLike ? 0 : 1,
        step: 1,
        ratio: 2,
        ordering: 'ascending',
        includeZero: false,
        includeNegative: false,
        min: 2,
        max: '',
        bound: 12,
        boundType: 'norm',
        associatePolicy: 'all',
        includeConjugates: true,
        generatorExpression: 'j + 1',
        pointsText: '1; 2; 3'
    };
}

export function normalizeSequenceBinding(binding, symbol = binding?.symbol) {
    const defaults = createDefaultSequenceBinding(symbol);
    const normalized = {
        ...defaults,
        ...(binding && typeof binding === 'object' ? binding : {})
    };
    normalized.symbol = String(symbol || normalized.symbol || '').trim();
    normalized.id = String(normalized.id || `binding-${normalized.symbol}`);
    normalized.value = complexValue(normalized.value);
    normalized.start = finiteNumber(normalized.start, 1);
    normalized.step = finiteNumber(normalized.step, 1);
    normalized.ratio = finiteNumber(normalized.ratio, 2);
    normalized.bound = Math.max(1, Math.floor(finiteNumber(normalized.bound, 12)));
    normalized.min = Math.max(2, Math.floor(finiteNumber(normalized.min, 2)));
    normalized.includeZero = Boolean(normalized.includeZero);
    normalized.includeNegative = Boolean(normalized.includeNegative);
    normalized.includeConjugates = Boolean(normalized.includeConjugates);
    return normalized;
}

export function getBindableExpressionSymbols(source, parameterNames = []) {
    const ast = parseExpression(source);
    const dependencies = collectExpressionDependencies(ast);
    const excluded = new Set([
        ...BUILT_IN_VARIABLES,
        ...parameterNames.map(name => String(name || '').trim()).filter(Boolean)
    ]);
    return [...dependencies.variables]
        .filter(name => !excluded.has(name))
        .sort((left, right) => left.localeCompare(right));
}

export function synchronizeSequenceBindings(source, bindings = [], parameterNames = []) {
    const symbols = getBindableExpressionSymbols(source, parameterNames);
    const existing = new Map((bindings || []).map(binding => [binding?.symbol, binding]));
    return symbols.map(symbol => normalizeSequenceBinding(existing.get(symbol), symbol));
}

function repeated(value, count) {
    return Array.from({ length: count }, () => ({ ...value }));
}

function sourceConfig(binding, count) {
    return {
        kind: binding.kind,
        count,
        start: binding.start,
        step: binding.step,
        ratio: binding.ratio,
        ordering: binding.ordering,
        includeZero: binding.includeZero,
        includeNegative: binding.includeNegative,
        min: binding.min,
        max: binding.max,
        bound: binding.bound,
        boundType: binding.boundType,
        associatePolicy: binding.associatePolicy,
        includeConjugates: binding.includeConjugates,
        generatorExpression: binding.generatorExpression,
        pointsText: binding.pointsText,
        points: []
    };
}

export function generateSequenceBindingSeries(bindings, count, runtime = {}) {
    const normalizedCount = Math.max(0, Math.floor(finiteNumber(count, 0)));
    const aggregateParameter = complexValue(runtime.aggregateParameter, { re: 0, im: 0 });
    const series = {};
    const diagnostics = [];

    for (const rawBinding of bindings || []) {
        const binding = normalizeSequenceBinding(rawBinding);
        if (!binding.symbol) continue;

        if (binding.kind === 'parameter') {
            series[binding.symbol] = repeated(aggregateParameter, normalizedCount);
            continue;
        }
        if (binding.kind === 'parameter_real') {
            series[binding.symbol] = repeated({ re: aggregateParameter.re, im: 0 }, normalizedCount);
            continue;
        }
        if (binding.kind === 'constant') {
            series[binding.symbol] = repeated(binding.value, normalizedCount);
            continue;
        }

        const generated = generateDiscreteSource(sourceConfig(binding, normalizedCount), {
            parameters: runtime.parameters || {}
        });
        series[binding.symbol] = generated.records.map(record => record.domainValue);
        diagnostics.push(...generated.diagnostics.map(message => `${binding.symbol}: ${message}`));
    }

    const environments = Array.from({ length: normalizedCount }, (_, index) =>
        Object.fromEntries(Object.entries(series).map(([symbol, values]) => [
            symbol,
            values[index] || { re: NaN, im: NaN }
        ]))
    );

    return { series, environments, diagnostics };
}

export function freeParameterSymbols(source, bindings = []) {
    const symbols = [];
    try {
        const dependencies = collectExpressionDependencies(parseExpression(source));
        if (dependencies.variables.has('s')) symbols.push('s');
    } catch {
        // Formula diagnostics are handled by the expression compiler.
    }
    for (const binding of bindings || []) {
        if (
            (binding?.kind === 'parameter' || binding?.kind === 'parameter_real') &&
            binding.symbol &&
            !symbols.includes(binding.symbol)
        ) {
            symbols.push(binding.symbol);
        }
    }
    return symbols;
}
