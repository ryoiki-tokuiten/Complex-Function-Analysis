import {
    complexAbs,
    complexAdd,
    complexArg,
    complexCos,
    complexCosh,
    complexDivide,
    complexExp,
    complexLn,
    complexMul,
    complexPow,
    complexReciprocal,
    complexRiemannZeta,
    complexSec,
    complexSin,
    complexSinh,
    complexSub,
    complexTan,
    complexTanh,
    factorial,
    transformFunctions
} from '../../math-utils.js';
import { collectExpressionDependencies, parseExpression } from './parser.js';

const EPSILON = 1e-12;
const MAX_FACTORIAL_ARGUMENT = 170;
const CONSTANTS = Object.freeze({
    i: Object.freeze({ re: 0, im: 1 }),
    pi: Object.freeze({ re: Math.PI, im: 0 }),
    e: Object.freeze({ re: Math.E, im: 0 }),
    true: true,
    false: false
});

function complex(re = 0, im = 0) {
    return { re, im };
}

function isComplex(value) {
    return value && typeof value === 'object' &&
        typeof value.re === 'number' && typeof value.im === 'number';
}

function toComplex(value) {
    if (isComplex(value)) return value;
    if (typeof value === 'boolean') return complex(value ? 1 : 0, 0);
    if (typeof value === 'number') return complex(value, 0);
    return complex(NaN, NaN);
}

function realValue(value, name = 'value') {
    const z = toComplex(value);
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im) || Math.abs(z.im) > EPSILON) {
        throw new ExpressionEvaluationError(`${name} must be real`);
    }
    return z.re;
}

function integerValue(value, name = 'value') {
    const result = realValue(value, name);
    if (!Number.isInteger(result)) {
        throw new ExpressionEvaluationError(`${name} must be an integer`);
    }
    if (!Number.isSafeInteger(result)) {
        throw new ExpressionEvaluationError(`${name} must be a safe integer`);
    }
    return result;
}

function isZero(value) {
    const z = toComplex(value);
    return Math.hypot(z.re, z.im) <= EPSILON;
}

function factorialValue(value) {
    const argument = integerValue(value, 'factorial argument');
    if (argument < 0) {
        throw new ExpressionEvaluationError('factorial argument must be non-negative');
    }
    if (argument > MAX_FACTORIAL_ARGUMENT) {
        throw new ExpressionEvaluationError(
            `factorial argument must not exceed ${MAX_FACTORIAL_ARGUMENT}`
        );
    }
    return complex(factorial(argument), 0);
}

function truthy(value) {
    if (typeof value === 'boolean') return value;
    const z = toComplex(value);
    return Number.isFinite(z.re) && Number.isFinite(z.im) &&
        (Math.abs(z.re) > EPSILON || Math.abs(z.im) > EPSILON);
}

function complexEquals(left, right) {
    const a = toComplex(left);
    const b = toComplex(right);
    return Math.abs(a.re - b.re) <= EPSILON && Math.abs(a.im - b.im) <= EPSILON;
}

export function isPrimeInteger(value) {
    if (!Number.isSafeInteger(value) || value < 2) return false;
    if (value === 2) return true;
    if (value % 2 === 0) return false;

    const limit = Math.floor(Math.sqrt(value));
    for (let divisor = 3; divisor <= limit; divisor += 2) {
        if (value % divisor === 0) return false;
    }
    return true;
}

function greatestCommonDivisor(a, b) {
    let left = Math.abs(integerValue(a, 'gcd argument'));
    let right = Math.abs(integerValue(b, 'gcd argument'));

    while (right !== 0) {
        const remainder = left % right;
        left = right;
        right = remainder;
    }
    return left;
}

function applyRealUnary(name, value, operation) {
    return complex(operation(realValue(value, `${name} argument`)), 0);
}

function applyRealBinary(name, left, right, operation) {
    return complex(operation(
        realValue(left, `${name} first argument`),
        realValue(right, `${name} second argument`)
    ), 0);
}

function callTransform(name, argument, environment) {
    if (name === 'selected' || name === 'selectedFunction' || name === 'f') {
        const selected = environment.selectedFunction;
        if (typeof selected !== 'function') {
            throw new ExpressionEvaluationError('No selected function is available');
        }
        const z = toComplex(argument);
        return selected(z.re, z.im);
    }

    const transform = transformFunctions[name];
    if (typeof transform === 'function') {
        const z = toComplex(argument);
        return transform(z.re, z.im);
    }

    return null;
}

const CALLS = Object.freeze({
    sin: ([value]) => complexSin(toComplex(value)),
    cos: ([value]) => complexCos(toComplex(value)),
    tan: ([value]) => complexTan(toComplex(value)),
    sec: ([value]) => complexSec(toComplex(value)),
    exp: ([value]) => complexExp(toComplex(value)),
    ln: ([value]) => {
        if (isZero(value)) throw new ExpressionEvaluationError('ln(0) is undefined');
        return complexLn(toComplex(value));
    },
    log: ([value]) => {
        if (isZero(value)) throw new ExpressionEvaluationError('log(0) is undefined');
        return complexLn(toComplex(value));
    },
    sinh: ([value]) => complexSinh(toComplex(value)),
    cosh: ([value]) => complexCosh(toComplex(value)),
    tanh: ([value]) => complexTanh(toComplex(value)),
    sqrt: ([value]) => complexPow(toComplex(value), complex(0.5, 0)),
    reciprocal: ([value]) => {
        if (isZero(value)) throw new ExpressionEvaluationError('Division by zero');
        return complexReciprocal(toComplex(value));
    },
    zeta: ([value]) => complexRiemannZeta(toComplex(value)),
    abs: ([value]) => complex(complexAbs(toComplex(value)), 0),
    arg: ([value]) => complex(complexArg(toComplex(value)), 0),
    re: ([value]) => complex(toComplex(value).re, 0),
    im: ([value]) => complex(toComplex(value).im, 0),
    conj: ([value]) => {
        const z = toComplex(value);
        return complex(z.re, -z.im);
    },
    complex: ([re, im = complex(0, 0)]) => complex(
        realValue(re, 'real component'),
        realValue(im, 'imaginary component')
    ),
    floor: ([value]) => applyRealUnary('floor', value, Math.floor),
    ceil: ([value]) => applyRealUnary('ceil', value, Math.ceil),
    round: ([value]) => applyRealUnary('round', value, Math.round),
    trunc: ([value]) => applyRealUnary('trunc', value, Math.trunc),
    sign: ([value]) => applyRealUnary('sign', value, Math.sign),
    min: values => complex(Math.min(...values.map(value => realValue(value, 'min argument'))), 0),
    max: values => complex(Math.max(...values.map(value => realValue(value, 'max argument'))), 0),
    mod: ([left, right]) => {
        const divisor = realValue(right, 'mod second argument');
        if (Math.abs(divisor) <= EPSILON) {
            throw new ExpressionEvaluationError('mod divisor must not be zero');
        }
        return complex(realValue(left, 'mod first argument') % divisor, 0);
    },
    gcd: ([left, right]) => complex(greatestCommonDivisor(left, right), 0),
    factorial: ([value]) => factorialValue(value),
    isPrime: ([value]) => isPrimeInteger(integerValue(value, 'isPrime argument')),
    pow: ([base, exponent]) => complexPow(toComplex(base), toComplex(exponent))
});

const ARITY = Object.freeze({
    sin: [1, 1], cos: [1, 1], tan: [1, 1], sec: [1, 1],
    exp: [1, 1], ln: [1, 1], log: [1, 1],
    sinh: [1, 1], cosh: [1, 1], tanh: [1, 1],
    sqrt: [1, 1], reciprocal: [1, 1], zeta: [1, 1],
    abs: [1, 1], arg: [1, 1], re: [1, 1], im: [1, 1], conj: [1, 1],
    complex: [1, 2], floor: [1, 1], ceil: [1, 1], round: [1, 1],
    trunc: [1, 1], sign: [1, 1], min: [1, Infinity], max: [1, Infinity],
    mod: [2, 2], gcd: [2, 2], factorial: [1, 1], isPrime: [1, 1],
    pow: [2, 2], selected: [1, 1], selectedFunction: [1, 1], f: [1, 1],
    mobius: [1, 1], polynomial: [1, 1], poincare: [1, 1], power: [1, 1]
});

export class ExpressionEvaluationError extends Error {
    constructor(message, node = null) {
        super(message);
        this.name = 'ExpressionEvaluationError';
        this.node = node;
    }
}

function assertArity(name, args, node) {
    const range = ARITY[name];
    if (!range) {
        throw new ExpressionEvaluationError(`Unknown function "${name}"`, node);
    }

    if (args.length < range[0] || args.length > range[1]) {
        const expected = range[0] === range[1]
            ? `${range[0]}`
            : `${range[0]} to ${range[1] === Infinity ? 'many' : range[1]}`;
        throw new ExpressionEvaluationError(
            `Function "${name}" expects ${expected} argument(s), received ${args.length}`,
            node
        );
    }
}

function evaluateBinary(node, environment) {
    if (node.op === '&&') {
        return truthy(evaluateNode(node.left, environment)) &&
            truthy(evaluateNode(node.right, environment));
    }
    if (node.op === '||') {
        return truthy(evaluateNode(node.left, environment)) ||
            truthy(evaluateNode(node.right, environment));
    }

    const left = evaluateNode(node.left, environment);
    const right = evaluateNode(node.right, environment);

    switch (node.op) {
        case '+': return complexAdd(toComplex(left), toComplex(right));
        case '-': return complexSub(toComplex(left), toComplex(right));
        case '*': return complexMul(toComplex(left), toComplex(right));
        case '/':
            if (isZero(right)) throw new ExpressionEvaluationError('Division by zero', node);
            return complexDivide(toComplex(left), toComplex(right));
        case '^': return complexPow(toComplex(left), toComplex(right));
        case '==': return complexEquals(left, right);
        case '!=': return !complexEquals(left, right);
        case '<': return realValue(left, 'left comparison operand') < realValue(right, 'right comparison operand');
        case '<=': return realValue(left, 'left comparison operand') <= realValue(right, 'right comparison operand');
        case '>': return realValue(left, 'left comparison operand') > realValue(right, 'right comparison operand');
        case '>=': return realValue(left, 'left comparison operand') >= realValue(right, 'right comparison operand');
        default:
            throw new ExpressionEvaluationError(`Unsupported operator "${node.op}"`, node);
    }
}

function evaluateCall(node, environment) {
    const args = node.args.map(argument => evaluateNode(argument, environment));
    assertArity(node.name, args, node);

    const builtIn = CALLS[node.name];
    if (builtIn) return builtIn(args, environment);

    const transformed = callTransform(node.name, args[0], environment);
    if (transformed !== null) return transformed;

    throw new ExpressionEvaluationError(`Unknown function "${node.name}"`, node);
}

function evaluateNode(node, environment) {
    try {
        switch (node.type) {
            case 'literal':
                return node.value;
            case 'variable': {
                if (Object.prototype.hasOwnProperty.call(environment, node.name)) {
                    return environment[node.name];
                }
                if (Object.prototype.hasOwnProperty.call(CONSTANTS, node.name)) {
                    return CONSTANTS[node.name];
                }
                throw new ExpressionEvaluationError(`Unknown variable "${node.name}"`, node);
            }
            case 'group':
                return evaluateNode(node.expression, environment);
            case 'unary': {
                const value = evaluateNode(node.argument, environment);
                if (node.op === '+') return toComplex(value);
                if (node.op === '-') {
                    const z = toComplex(value);
                    return complex(-z.re, -z.im);
                }
                if (node.op === '!') return !truthy(value);
                throw new ExpressionEvaluationError(`Unsupported unary operator "${node.op}"`, node);
            }
            case 'postfix':
                return factorialValue(evaluateNode(node.argument, environment));
            case 'binary':
                return evaluateBinary(node, environment);
            case 'conditional':
                return truthy(evaluateNode(node.test, environment))
                    ? evaluateNode(node.consequent, environment)
                    : evaluateNode(node.alternate, environment);
            case 'call':
                return evaluateCall(node, environment);
            default:
                throw new ExpressionEvaluationError(`Unknown expression node "${node.type}"`, node);
        }
    } catch (error) {
        if (error instanceof ExpressionEvaluationError) {
            if (!error.node) error.node = node;
            throw error;
        }
        throw new ExpressionEvaluationError(error?.message || String(error), node);
    }
}

export function evaluateExpression(ast, environment = {}) {
    const result = evaluateNode(ast, environment);
    if (isComplex(result) && (!Number.isFinite(result.re) || !Number.isFinite(result.im))) {
        throw new ExpressionEvaluationError(
            'Expression result is undefined or outside the supported numeric range',
            ast
        );
    }
    return result;
}

export function compileExpression(source, options = {}) {
    const ast = typeof source === 'string' ? parseExpression(source) : source;
    const dependencies = collectExpressionDependencies(ast);
    const allowedVariables = options.allowedVariables
        ? new Set(options.allowedVariables)
        : null;

    if (allowedVariables) {
        for (const variable of dependencies.variables) {
            if (!allowedVariables.has(variable) && !Object.prototype.hasOwnProperty.call(CONSTANTS, variable)) {
                throw new ExpressionEvaluationError(`Variable "${variable}" is not allowed`, ast);
            }
        }
    }

    for (const functionName of dependencies.functions) {
        if (!ARITY[functionName] && typeof transformFunctions[functionName] !== 'function') {
            throw new ExpressionEvaluationError(`Unknown function "${functionName}"`, ast);
        }
    }

    const evaluator = environment => evaluateExpression(ast, environment);
    evaluator.ast = ast;
    evaluator.source = typeof source === 'string' ? source : null;
    evaluator.dependencies = dependencies;
    return evaluator;
}

export function finiteComplex(value) {
    const z = toComplex(value);
    return Number.isFinite(z.re) && Number.isFinite(z.im);
}

export function asComplex(value) {
    return toComplex(value);
}

export function asBoolean(value) {
    return truthy(value);
}
