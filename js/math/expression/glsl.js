import { generateDiscreteSource } from '../../analysis/discrete-sources.js';
import {
    generateSequenceBindingSeries,
    synchronizeSequenceBindings
} from '../../analysis/sequence-bindings.js';
import { parseExpression } from './parser.js';

const MAX_SHADER_CACHE_ENTRIES = 12;
const aggregateShaderCache = new Map();
const GPU_ARITY = Object.freeze({
    sin: [1, 1], cos: [1, 1], tan: [1, 1], sec: [1, 1],
    exp: [1, 1], ln: [1, 1], log: [1, 1],
    sinh: [1, 1], cosh: [1, 1], tanh: [1, 1],
    sqrt: [1, 1], reciprocal: [1, 1],
    abs: [1, 1], arg: [1, 1], re: [1, 1], im: [1, 1], conj: [1, 1],
    complex: [1, 2], floor: [1, 1], ceil: [1, 1], round: [1, 1],
    trunc: [1, 1], sign: [1, 1], min: [1, Infinity], max: [1, Infinity],
    mod: [2, 2], gcd: [2, 2], factorial: [1, 1], isPrime: [1, 1],
    pow: [2, 2], selected: [1, 1], selectedFunction: [1, 1], f: [1, 1]
});

function cacheShaderResult(key, result) {
    aggregateShaderCache.set(key, result);
    if (aggregateShaderCache.size > MAX_SHADER_CACHE_ENTRIES) {
        aggregateShaderCache.delete(aggregateShaderCache.keys().next().value);
    }
    return result;
}

function glslFloat(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0.0';
    if (Object.is(numeric, -0)) return '0.0';
    const rendered = Number(numeric.toPrecision(12)).toString();
    return rendered.includes('.') || /e/i.test(rendered) ? rendered : `${rendered}.0`;
}

function vec2(value) {
    return `vec2(${glslFloat(value?.re)}, ${glslFloat(value?.im)})`;
}

function assertGPUArity(node) {
    const [minimum, maximum] = GPU_ARITY[node.name] || [1, 1];
    if (node.args.length < minimum || node.args.length > maximum) {
        const expected = minimum === maximum
            ? String(minimum)
            : `${minimum} to ${maximum === Infinity ? 'many' : maximum}`;
        throw new Error(
            `Function "${node.name}" expects ${expected} argument(s), received ${node.args.length}`
        );
    }
}

function dynamicEnabled(appState) {
    const config = appState?.dynamicPlotting;
    return Boolean(
        config?.enabled &&
        config.mode === 'aggregate' &&
        (config.reduction?.kind === 'sum' || config.reduction?.kind === 'product')
    );
}

function parameterMap(appState) {
    return Object.fromEntries((appState?.dynamicPlotting?.parameters || [])
        .filter(parameter => /^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter?.name || ''))
        .map(parameter => [parameter.name, { re: Number(parameter.value) || 0, im: 0 }]));
}

function compileCall(node, context) {
    assertGPUArity(node);
    const args = node.args.map(argument => compileNode(argument, context));
    const one = () => args[0] || 'vec2(0.0)';
    const foldReal = operation => {
        const values = args.map(argument => `dynamicReal(${argument})`);
        return values.slice(1).reduce(
            (left, right) => `${operation}(${left}, ${right})`,
            values[0] || '0.0'
        );
    };

    switch (node.name) {
        case 'sin': return `complexSin(${one()})`;
        case 'cos': return `complexCos(${one()})`;
        case 'tan': return `complexDiv(complexSin(${one()}), complexCos(${one()}))`;
        case 'sec': return `complexDiv(vec2(1.0, 0.0), complexCos(${one()}))`;
        case 'exp': return `complexExp(${one()})`;
        case 'ln':
        case 'log':
            return context.sheet
                ? `dynamicLnOnSheet(${one()}, branchIndex, branchCutWidth)`
                : `complexLn(${one()})`;
        case 'sinh': return `complexSinh(${one()})`;
        case 'cosh': return `complexCosh(${one()})`;
        case 'tanh': return `complexTanh(${one()})`;
        case 'sqrt':
            return context.sheet
                ? `dynamicComplexPowOnSheet(${one()}, vec2(0.5, 0.0), branchIndex, branchCutWidth)`
                : `dynamicComplexPow(${one()}, vec2(0.5, 0.0))`;
        case 'reciprocal': return `complexDiv(vec2(1.0, 0.0), ${one()})`;
        case 'abs': return `vec2(length(${one()}), 0.0)`;
        case 'arg': return `vec2(atan((${one()}).y, (${one()}).x), 0.0)`;
        case 're': return `vec2((${one()}).x, 0.0)`;
        case 'im': return `vec2((${one()}).y, 0.0)`;
        case 'conj': return `vec2((${one()}).x, -(${one()}).y)`;
        case 'complex': return `vec2(dynamicReal(${args[0]}), dynamicReal(${args[1] || 'vec2(0.0)'}))`;
        case 'floor': return `vec2(floor(dynamicReal(${one()})), 0.0)`;
        case 'ceil': return `vec2(ceil(dynamicReal(${one()})), 0.0)`;
        case 'round': return `vec2(floor(dynamicReal(${one()}) + 0.5), 0.0)`;
        case 'trunc': return `vec2(dynamicTrunc(dynamicReal(${one()})), 0.0)`;
        case 'sign': return `vec2(sign(dynamicReal(${one()})), 0.0)`;
        case 'min': return `vec2(${foldReal('min')}, 0.0)`;
        case 'max': return `vec2(${foldReal('max')}, 0.0)`;
        case 'mod': {
            const left = `dynamicReal(${args[0]})`;
            const right = `dynamicReal(${args[1]})`;
            return `vec2(${left} - ${right} * dynamicTrunc(${left} / ${right}), 0.0)`;
        }
        case 'gcd': return `vec2(dynamicGcd(dynamicReal(${args[0]}), dynamicReal(${args[1]})), 0.0)`;
        case 'factorial': return `vec2(dynamicFactorial(dynamicReal(${one()})), 0.0)`;
        case 'isPrime':
            throw new Error('isPrime() is evaluated by the exact CPU backend');
        case 'pow':
            return context.sheet
                ? `dynamicComplexPowOnSheet(${args[0]}, ${args[1]}, branchIndex, branchCutWidth)`
                : `dynamicComplexPow(${args[0]}, ${args[1]})`;
        case 'selected':
        case 'selectedFunction':
        case 'f':
            return context.sheet
                ? `dynamicEvaluateBasicOnSheet(${glslFloat(context.selectedFunctionId)}, ${one()}, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower)`
                : `dynamicEvaluateBasic(${glslFloat(context.selectedFunctionId)}, ${one()}, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower)`;
        default: {
            const functionId = context.getFunctionId(node.name);
            if (!functionId || functionId === 16 || functionId === 17) {
                throw new Error(`Function "${node.name}" is not supported by the GPU expression compiler`);
            }
            return context.sheet
                ? `dynamicEvaluateBasicOnSheet(${glslFloat(functionId)}, ${one()}, branchIndex, branchCutWidth, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower)`
                : `dynamicEvaluateBasic(${glslFloat(functionId)}, ${one()}, mA, mB, mC, mD, polyDeg, polyCoeffs, zetaCont, zetaRefl, fracPower)`;
        }
    }
}

function compileBoolean(node, context) {
    if (node.type === 'unary' && node.op === '!') {
        return `(!${compileBoolean(node.argument, context)})`;
    }
    if (node.type === 'binary') {
        if (node.op === '&&' || node.op === '||') {
            return `(${compileBoolean(node.left, context)} ${node.op} ${compileBoolean(node.right, context)})`;
        }

        const left = compileNode(node.left, context);
        const right = compileNode(node.right, context);
        if (node.op === '==') return `(distance(${left}, ${right}) < 1.0e-6)`;
        if (node.op === '!=') return `(distance(${left}, ${right}) >= 1.0e-6)`;
        if (['<', '<=', '>', '>='].includes(node.op)) {
            return `(dynamicReal(${left}) ${node.op} dynamicReal(${right}))`;
        }
    }

    if (node.type === 'call' && node.name === 'isPrime') {
        throw new Error('isPrime() is evaluated by the exact CPU backend');
    }

    return `dynamicTruthy(${compileNode(node, context)})`;
}

function compileNode(node, context) {
    switch (node.type) {
        case 'literal':
            return vec2(node.value);
        case 'variable':
            if (node.name === 'd' || node.name === 'z' || node.name === 's') return node.name;
            if (node.name === 'j') return 'vec2(float(idx), 0.0)';
            if (node.name === 'i') return 'vec2(0.0, 1.0)';
            if (node.name === 'pi') return 'vec2(PI, 0.0)';
            if (node.name === 'e') return 'vec2(2.718281828459045, 0.0)';
            if (node.name === 'true') return 'vec2(1.0, 0.0)';
            if (node.name === 'false') return 'vec2(0.0, 0.0)';
            if (context.variables?.[node.name]) return context.variables[node.name];
            if (context.parameters[node.name]) return vec2(context.parameters[node.name]);
            throw new Error(`Variable "${node.name}" is not supported by the GPU expression compiler`);
        case 'group':
            return `(${compileNode(node.expression, context)})`;
        case 'unary':
            if (node.op === '+') return compileNode(node.argument, context);
            if (node.op === '-') return `(-${compileNode(node.argument, context)})`;
            if (node.op === '!') return `dynamicBool(${compileBoolean(node, context)})`;
            throw new Error(`Unary operator "${node.op}" is not supported by the GPU expression compiler`);
        case 'postfix':
            return `vec2(dynamicFactorial(dynamicReal(${compileNode(node.argument, context)})), 0.0)`;
        case 'binary': {
            if (['&&', '||', '==', '!=', '<', '<=', '>', '>='].includes(node.op)) {
                return `dynamicBool(${compileBoolean(node, context)})`;
            }
            const left = compileNode(node.left, context);
            const right = compileNode(node.right, context);
            if (node.op === '+') return `complexAdd(${left}, ${right})`;
            if (node.op === '-') return `(${left} - ${right})`;
            if (node.op === '*') return `complexMul(${left}, ${right})`;
            if (node.op === '/') return `complexDiv(${left}, ${right})`;
            if (node.op === '^') {
                return context.sheet
                    ? `dynamicComplexPowOnSheet(${left}, ${right}, branchIndex, branchCutWidth)`
                    : `dynamicComplexPow(${left}, ${right})`;
            }
            throw new Error(`Operator "${node.op}" is not supported by the GPU expression compiler`);
        }
        case 'conditional':
            return `(${compileBoolean(node.test, context)} ? ${compileNode(node.consequent, context)} : ${compileNode(node.alternate, context)})`;
        case 'call':
            return compileCall(node, context);
        default:
            throw new Error(`Expression node "${node.type}" is not supported by the GPU expression compiler`);
    }
}

const HELPERS = `
float dynamicReal(vec2 value) { return value.x; }
bool dynamicTruthy(vec2 value) { return dot(value, value) > 1.0e-20; }
vec2 dynamicBool(bool value) { return value ? vec2(1.0, 0.0) : vec2(0.0); }
float dynamicTrunc(float value) { return value < 0.0 ? ceil(value) : floor(value); }
vec2 dynamicComplexPow(vec2 base, vec2 exponent) {
  if (dot(base, base) < 1.0e-20) {
    return exponent.x > 0.0 ? vec2(0.0) : vec2(1.0e20);
  }
  return complexExp(complexMul(exponent, complexLn(base)));
}
vec2 dynamicLnOnSheet(vec2 value, float branchIndex, float branchCutWidth) {
  if (dot(value, value) < 1.0e-20) return vec2(1.0e20);
  if (branchCutWidth > 0.0 && value.x < 0.0 && abs(value.y) < branchCutWidth) return vec2(1.0e20);
  vec2 logarithm = complexLn(value);
  logarithm.y += branchIndex * TWO_PI;
  return logarithm;
}
vec2 dynamicComplexPowOnSheet(
  vec2 base,
  vec2 exponent,
  float branchIndex,
  float branchCutWidth
) {
  if (dot(base, base) < 1.0e-20) {
    return exponent.x > 0.0 ? vec2(0.0) : vec2(1.0e20);
  }
  return complexExp(complexMul(
    exponent,
    dynamicLnOnSheet(base, branchIndex, branchCutWidth)
  ));
}
float dynamicFactorial(float value) {
  float rounded = floor(value + 0.5);
  if (value < 0.0 || abs(value - rounded) > 1.0e-5 || rounded > 170.0) return 1.0e20;
  float result = 1.0;
  for (int i = 2; i <= 170; i++) {
    if (float(i) > rounded) break;
    result *= float(i);
  }
  return result;
}
float dynamicGcd(float leftValue, float rightValue) {
  float left = abs(floor(leftValue + 0.5));
  float right = abs(floor(rightValue + 0.5));
  for (int i = 0; i < 64; i++) {
    if (right < 0.5) break;
    float remainder = mod(left, right);
    left = right;
    right = remainder;
  }
  return left;
}
vec2 dynamicEvaluateBasic(
  float functionId,
  vec2 value,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower
) {
  vec2 mapped = vec2(0.0);
  bool ok = evaluateBasicFuncShared(
    functionId, value, mA, mB, mC, mD, polyDeg, polyCoeffs,
    zetaCont, zetaRefl, fracPower, mapped
  );
  return ok ? mapped : vec2(1.0e20);
}
vec2 dynamicEvaluateBasicOnSheet(
  float functionId,
  vec2 value,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower
) {
  float fId = floor(functionId + 0.5);
  if (abs(fId - 6.0) < 0.5) {
    return dynamicLnOnSheet(value, branchIndex, branchCutWidth);
  }
  if (abs(fId - 15.0) < 0.5) {
    float nearestInteger = floor(fracPower + 0.5);
    float sheet = abs(fracPower - nearestInteger) < 1.0e-5 ? 0.0 : branchIndex;
    float cut = abs(fracPower - nearestInteger) < 1.0e-5 ? 0.0 : branchCutWidth;
    return dynamicComplexPowOnSheet(value, vec2(fracPower, 0.0), sheet, cut);
  }
  return dynamicEvaluateBasic(
    fId, value, mA, mB, mC, mD, polyDeg, polyCoeffs,
    zetaCont, zetaRefl, fracPower
  );
}
`;

function sourceRecords(appState) {
    const sourceConfig = JSON.parse(JSON.stringify(appState.dynamicPlotting.source || {}));
    if (sourceConfig.kind === 'custom_points') {
        sourceConfig.points = sourceConfig.points || [];
    }
    const parameters = parameterMap(appState);
    const source = generateDiscreteSource(sourceConfig, { parameters });
    const visibleCount = Math.max(
        0,
        Math.min(
            source.records.length,
            Math.floor(Number(appState.dynamicPlotting.playback?.visibleCount) || 0)
        )
    );
    return source.records.slice(0, visibleCount);
}

function domainValueFunction(records) {
    const branches = records.map((record, index) =>
        `  if (idx == ${index}) return ${vec2(record.domainValue)};`
    ).join('\n');

    return `vec2 dynamicDomainValue(int idx) {
${branches}
  return vec2(0.0);
}`;
}

function bindingValueFunctions(bindingResult, bindings) {
    return bindings
        .filter(binding => binding.kind !== 'parameter' && binding.kind !== 'parameter_real')
        .map(binding => {
            const values = bindingResult.series[binding.symbol] || [];
            const branches = values.map((value, index) =>
                `  if (idx == ${index}) return ${vec2(value)};`
            ).join('\n');
            return `vec2 dynamicBinding_${binding.symbol}(int idx) {
${branches}
  return vec2(0.0);
}`;
        })
        .join('\n');
}

export function buildDynamicAggregateGLSL(appState, getFunctionId) {
    if (!dynamicEnabled(appState)) return { enabled: false, source: '', termCount: 0 };

    const cacheKey = dynamicAggregateGLSLSignature(appState);
    const cached = aggregateShaderCache.get(cacheKey);
    if (cached) return cached;

    try {
        const config = appState.dynamicPlotting;
        const records = sourceRecords(appState);
        const parameters = parameterMap(appState);
        const bindings = config.term?.kind === 'expression'
            ? synchronizeSequenceBindings(
                String(config.term?.expression ?? ''),
                config.term?.bindings || []
            )
            : [];
        const bindingResult = generateSequenceBindingSeries(bindings, records.length, {
            aggregateParameter: config.aggregateParameter,
            parameters
        });
        const variables = Object.fromEntries(bindings.map(binding => [
            binding.symbol,
            binding.kind === 'parameter'
                ? 's'
                : binding.kind === 'parameter_real'
                    ? 'vec2(s.x, 0.0)'
                    : `dynamicBinding_${binding.symbol}(idx)`
        ]));
        variables.c = 'c';
        const selectedFunctionId = getFunctionId(config.selectedFunction || appState.currentFunction, true);
        if (!selectedFunctionId || selectedFunctionId === 16 || selectedFunctionId === 17) {
            throw new Error('The selected function is not available in the GPU expression backend');
        }

        const context = {
            parameters,
            variables,
            selectedFunctionId,
            sheet: false,
            getFunctionId: name => getFunctionId(name, true)
        };
        const sheetContext = { ...context, sheet: true };
        const pointAst = parseExpression(String(config.pointExpression ?? 'd'));
        const termAst = config.term?.kind === 'selected-function'
            ? parseExpression('selected(z)')
            : parseExpression(String(config.term?.expression ?? ''));
        const pointCode = compileNode(pointAst, context);
        const termCode = compileNode(termAst, context);
        const pointCodeOnSheet = compileNode(pointAst, sheetContext);
        const termCodeOnSheet = compileNode(termAst, sheetContext);
        const reduction = config.reduction?.kind;
        const initial = reduction === 'product' ? 'vec2(1.0, 0.0)' : 'vec2(0.0)';
        const combine = reduction === 'product'
            ? 'accumulator = complexMul(accumulator, termValue);'
            : 'accumulator = complexAdd(accumulator, termValue);';
        const invalid = config.reduction?.invalidPolicy === 'skip'
            ? 'if (!isFiniteVec2Compat(z) || !isFiniteVec2Compat(termValue)) continue;'
            : 'if (!isFiniteVec2Compat(z) || !isFiniteVec2Compat(termValue)) return false;';

        const source = `
${HELPERS}
${domainValueFunction(records)}
${bindingValueFunctions(bindingResult, bindings)}
bool evaluateDynamicAggregate(
  vec2 s,
  vec2 c,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  out vec2 mapped
) {
  vec2 accumulator = ${initial};
  for (int idx = 0; idx < ${records.length}; idx++) {
    vec2 d = dynamicDomainValue(idx);
    vec2 z = ${pointCode};
    vec2 termValue = ${termCode};
    ${invalid}
    ${combine}
  }
  mapped = accumulator;
  return isFiniteVec2Compat(mapped);
}
bool evaluateDynamicAggregateOnSheet(
  vec2 s,
  vec2 c,
  float branchIndex,
  float branchCutWidth,
  vec2 mA,
  vec2 mB,
  vec2 mC,
  vec2 mD,
  int polyDeg,
  vec2 polyCoeffs[11],
  float zetaCont,
  float zetaRefl,
  float fracPower,
  out vec2 mapped
) {
  vec2 accumulator = ${initial};
  for (int idx = 0; idx < ${records.length}; idx++) {
    vec2 d = dynamicDomainValue(idx);
    vec2 z = ${pointCodeOnSheet};
    vec2 termValue = ${termCodeOnSheet};
    ${invalid}
    ${combine}
  }
  mapped = accumulator;
  return isFiniteVec2Compat(mapped);
}
`;

        return cacheShaderResult(cacheKey, {
            enabled: true,
            source,
            termCount: records.length,
            truncated: false,
            error: null
        });
    } catch (error) {
        return cacheShaderResult(cacheKey, {
            enabled: true,
            source: '',
            termCount: 0,
            truncated: false,
            error: error?.message || String(error)
        });
    }
}

export function dynamicAggregateGLSLSignature(appState) {
    if (!dynamicEnabled(appState)) return 'off';
    return JSON.stringify({
        currentFunction: appState.currentFunction,
        source: appState.dynamicPlotting.source,
        pointExpression: appState.dynamicPlotting.pointExpression,
        term: appState.dynamicPlotting.term,
        reduction: appState.dynamicPlotting.reduction,
        parameters: appState.dynamicPlotting.parameters,
        visibleCount: appState.dynamicPlotting.playback?.visibleCount
    });
}

export function isDynamicAggregateGLSLActive(appState) {
    return dynamicEnabled(appState);
}
