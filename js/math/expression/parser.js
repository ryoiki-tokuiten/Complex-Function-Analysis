const TOKEN = Object.freeze({
    NUMBER: 'number',
    IDENTIFIER: 'identifier',
    OPERATOR: 'operator',
    PUNCTUATION: 'punctuation',
    EOF: 'eof'
});

const TWO_CHAR_OPERATORS = new Set(['<=', '>=', '==', '!=', '&&', '||']);
const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '^', '!', '<', '>', '?', ':']);
const PUNCTUATION = new Set(['(', ')', ',']);

export const EXPRESSION_LIMITS = Object.freeze({
    sourceLength: 2048,
    tokenCount: 768,
    nodeCount: 512,
    depth: 64,
    identifierLength: 64,
    functionArguments: 32
});

export class ExpressionSyntaxError extends Error {
    constructor(message, position, source) {
        super(`${message} at column ${position + 1}`);
        this.name = 'ExpressionSyntaxError';
        this.position = position;
        this.source = source;
    }
}

function isDigit(char) {
    return char >= '0' && char <= '9';
}

function isIdentifierStart(char) {
    return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char) {
    return /[A-Za-z0-9_]/.test(char);
}

function readNumber(source, start) {
    let index = start;
    let sawDigit = false;

    while (isDigit(source[index])) {
        sawDigit = true;
        index += 1;
    }

    if (source[index] === '.') {
        index += 1;
        while (isDigit(source[index])) {
            sawDigit = true;
            index += 1;
        }
    }

    if (!sawDigit) {
        throw new ExpressionSyntaxError('Invalid numeric literal', start, source);
    }

    if (source[index] === 'e' || source[index] === 'E') {
        const exponentStart = index;
        index += 1;
        if (source[index] === '+' || source[index] === '-') index += 1;

        const digitStart = index;
        while (isDigit(source[index])) index += 1;
        if (digitStart === index) {
            throw new ExpressionSyntaxError('Invalid exponent', exponentStart, source);
        }
    }

    const value = Number(source.slice(start, index));
    if (!Number.isFinite(value)) {
        throw new ExpressionSyntaxError('Numeric literal is outside the supported range', start, source);
    }

    return {
        token: {
            type: TOKEN.NUMBER,
            value,
            start,
            end: index
        },
        next: index
    };
}

function readIdentifier(source, start) {
    let index = start + 1;
    while (index < source.length && isIdentifierPart(source[index])) index += 1;

    const raw = source.slice(start, index);
    if (raw.length > EXPRESSION_LIMITS.identifierLength) {
        throw new ExpressionSyntaxError(
            `Identifiers may contain at most ${EXPRESSION_LIMITS.identifierLength} characters`,
            start,
            source
        );
    }
    const keyword = raw.toLowerCase();
    const value = keyword === 'and'
        ? '&&'
        : keyword === 'or'
            ? '||'
            : keyword === 'not'
                ? '!'
                : raw;

    return {
        token: {
            type: value === raw ? TOKEN.IDENTIFIER : TOKEN.OPERATOR,
            value,
            start,
            end: index
        },
        next: index
    };
}

export function tokenizeExpression(source) {
    const input = String(source ?? '');
    if (input.length > EXPRESSION_LIMITS.sourceLength) {
        throw new ExpressionSyntaxError(
            `Expression is too long; use at most ${EXPRESSION_LIMITS.sourceLength} characters`,
            EXPRESSION_LIMITS.sourceLength,
            input
        );
    }
    const tokens = [];
    let index = 0;

    while (index < input.length) {
        const char = input[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (isDigit(char) || (char === '.' && isDigit(input[index + 1]))) {
            const result = readNumber(input, index);
            tokens.push(result.token);
            index = result.next;
            continue;
        }

        if (isIdentifierStart(char)) {
            const result = readIdentifier(input, index);
            tokens.push(result.token);
            index = result.next;
            continue;
        }

        const pair = input.slice(index, index + 2);
        if (TWO_CHAR_OPERATORS.has(pair)) {
            tokens.push({ type: TOKEN.OPERATOR, value: pair, start: index, end: index + 2 });
            index += 2;
            continue;
        }

        if (ONE_CHAR_OPERATORS.has(char)) {
            tokens.push({ type: TOKEN.OPERATOR, value: char, start: index, end: index + 1 });
            index += 1;
            continue;
        }

        if (PUNCTUATION.has(char)) {
            tokens.push({ type: TOKEN.PUNCTUATION, value: char, start: index, end: index + 1 });
            index += 1;
            continue;
        }

        throw new ExpressionSyntaxError(`Unexpected character "${char}"`, index, input);
    }

    tokens.push({ type: TOKEN.EOF, value: '', start: input.length, end: input.length });
    if (tokens.length - 1 > EXPRESSION_LIMITS.tokenCount) {
        throw new ExpressionSyntaxError(
            `Expression has too many tokens; use at most ${EXPRESSION_LIMITS.tokenCount}`,
            input.length,
            input
        );
    }
    return tokens;
}

function span(startNode, endNode) {
    return {
        start: startNode?.start ?? 0,
        end: endNode?.end ?? startNode?.end ?? 0
    };
}

function startsImplicitFactor(token) {
    return token.type === TOKEN.NUMBER ||
        token.type === TOKEN.IDENTIFIER ||
        (token.type === TOKEN.PUNCTUATION && token.value === '(');
}

class Parser {
    constructor(source) {
        this.source = String(source ?? '');
        this.tokens = tokenizeExpression(this.source);
        this.index = 0;
    }

    current() {
        return this.tokens[this.index];
    }

    previous() {
        return this.tokens[Math.max(0, this.index - 1)];
    }

    advance() {
        const token = this.current();
        if (token.type !== TOKEN.EOF) this.index += 1;
        return token;
    }

    match(value) {
        if (this.current().value !== value) return false;
        this.advance();
        return true;
    }

    expect(value, message = `Expected "${value}"`) {
        if (!this.match(value)) {
            throw new ExpressionSyntaxError(message, this.current().start, this.source);
        }
        return this.previous();
    }

    parse() {
        if (this.current().type === TOKEN.EOF) {
            throw new ExpressionSyntaxError('Expression cannot be empty', 0, this.source);
        }

        const expression = this.parseConditional();
        if (this.current().type !== TOKEN.EOF) {
            throw new ExpressionSyntaxError(
                `Unexpected token "${this.current().value}"`,
                this.current().start,
                this.source
            );
        }
        return expression;
    }

    parseConditional() {
        const test = this.parseLogicalOr();
        if (!this.match('?')) return test;

        const consequent = this.parseConditional();
        this.expect(':', 'Expected ":" in conditional expression');
        const alternate = this.parseConditional();

        return {
            type: 'conditional',
            test,
            consequent,
            alternate,
            ...span(test, alternate)
        };
    }

    parseLogicalOr() {
        return this.parseLeftAssociative(() => this.parseLogicalAnd(), new Set(['||']));
    }

    parseLogicalAnd() {
        return this.parseLeftAssociative(() => this.parseEquality(), new Set(['&&']));
    }

    parseEquality() {
        return this.parseLeftAssociative(() => this.parseComparison(), new Set(['==', '!=']));
    }

    parseComparison() {
        return this.parseLeftAssociative(
            () => this.parseAdditive(),
            new Set(['<', '<=', '>', '>='])
        );
    }

    parseAdditive() {
        return this.parseLeftAssociative(
            () => this.parseMultiplicative(),
            new Set(['+', '-'])
        );
    }

    parseLeftAssociative(readOperand, operators) {
        let expression = readOperand();

        while (operators.has(this.current().value)) {
            const operator = this.advance();
            const right = readOperand();
            expression = {
                type: 'binary',
                op: operator.value,
                left: expression,
                right,
                ...span(expression, right)
            };
        }

        return expression;
    }

    parseMultiplicative() {
        let expression = this.parseUnary();

        while (true) {
            if (this.current().value === '*' || this.current().value === '/') {
                const operator = this.advance();
                const right = this.parseUnary();
                expression = {
                    type: 'binary',
                    op: operator.value,
                    left: expression,
                    right,
                    implicit: false,
                    ...span(expression, right)
                };
                continue;
            }

            if (startsImplicitFactor(this.current())) {
                const right = this.parseUnary();
                expression = {
                    type: 'binary',
                    op: '*',
                    left: expression,
                    right,
                    implicit: true,
                    ...span(expression, right)
                };
                continue;
            }

            return expression;
        }
    }

    parseUnary() {
        if (this.current().value === '+' || this.current().value === '-' || this.current().value === '!') {
            const operator = this.advance();
            const argument = this.parseUnary();
            return {
                type: 'unary',
                op: operator.value,
                argument,
                start: operator.start,
                end: argument.end
            };
        }

        return this.parsePower();
    }

    parsePower() {
        let expression = this.parsePostfix();

        if (this.match('^')) {
            const right = this.parseUnary();
            expression = {
                type: 'binary',
                op: '^',
                left: expression,
                right,
                ...span(expression, right)
            };
        }

        return expression;
    }

    parsePostfix() {
        let expression = this.parsePrimary();

        while (this.match('!')) {
            expression = {
                type: 'postfix',
                op: '!',
                argument: expression,
                start: expression.start,
                end: this.previous().end
            };
        }

        return expression;
    }

    parsePrimary() {
        const token = this.current();

        if (token.type === TOKEN.NUMBER) {
            this.advance();
            return {
                type: 'literal',
                value: { re: token.value, im: 0 },
                start: token.start,
                end: token.end
            };
        }

        if (token.type === TOKEN.IDENTIFIER) {
            this.advance();
            if (!this.match('(')) {
                return {
                    type: 'variable',
                    name: token.value,
                    start: token.start,
                    end: token.end
                };
            }

            const args = [];
            if (!this.match(')')) {
                do {
                    args.push(this.parseConditional());
                    if (args.length > EXPRESSION_LIMITS.functionArguments) {
                        throw new ExpressionSyntaxError(
                            `Functions may receive at most ${EXPRESSION_LIMITS.functionArguments} arguments`,
                            this.current().start,
                            this.source
                        );
                    }
                } while (this.match(','));
                this.expect(')', 'Expected ")" after function arguments');
            }

            return {
                type: 'call',
                name: token.value,
                args,
                start: token.start,
                end: this.previous().end
            };
        }

        if (this.match('(')) {
            const opening = this.previous();
            const expression = this.parseConditional();
            const closing = this.expect(')', 'Expected ")" after expression');
            return {
                type: 'group',
                expression,
                start: opening.start,
                end: closing.end
            };
        }

        throw new ExpressionSyntaxError(
            `Expected a value, found "${token.value || 'end of expression'}"`,
            token.start,
            this.source
        );
    }
}

function expressionChildren(node) {
    switch (node?.type) {
        case 'group':
            return [node.expression];
        case 'unary':
        case 'postfix':
            return [node.argument];
        case 'binary':
            return [node.left, node.right];
        case 'conditional':
            return [node.test, node.consequent, node.alternate];
        case 'call':
            return node.args;
        default:
            return [];
    }
}

function validateExpressionComplexity(ast, source) {
    const stack = [{ node: ast, depth: 1 }];
    let nodeCount = 0;

    while (stack.length) {
        const { node, depth } = stack.pop();
        nodeCount += 1;
        if (nodeCount > EXPRESSION_LIMITS.nodeCount) {
            throw new ExpressionSyntaxError(
                `Expression is too complex; use at most ${EXPRESSION_LIMITS.nodeCount} operations and values`,
                node?.start || 0,
                source
            );
        }
        if (depth > EXPRESSION_LIMITS.depth) {
            throw new ExpressionSyntaxError(
                `Expression nesting is too deep; use at most ${EXPRESSION_LIMITS.depth} levels`,
                node?.start || 0,
                source
            );
        }
        for (const child of expressionChildren(node)) {
            if (child) stack.push({ node: child, depth: depth + 1 });
        }
    }
}

export function parseExpression(source) {
    const input = String(source ?? '');
    const ast = new Parser(input).parse();
    validateExpressionComplexity(ast, input);
    return ast;
}

export function walkExpression(node, visitor) {
    if (!node || typeof visitor !== 'function') return;
    visitor(node);

    switch (node.type) {
        case 'group':
            walkExpression(node.expression, visitor);
            break;
        case 'unary':
        case 'postfix':
            walkExpression(node.argument, visitor);
            break;
        case 'binary':
            walkExpression(node.left, visitor);
            walkExpression(node.right, visitor);
            break;
        case 'conditional':
            walkExpression(node.test, visitor);
            walkExpression(node.consequent, visitor);
            walkExpression(node.alternate, visitor);
            break;
        case 'call':
            node.args.forEach(argument => walkExpression(argument, visitor));
            break;
        default:
            break;
    }
}

export function collectExpressionDependencies(ast) {
    const variables = new Set();
    const functions = new Set();

    walkExpression(ast, node => {
        if (node.type === 'variable') variables.add(node.name);
        if (node.type === 'call') functions.add(node.name);
    });

    return { variables, functions };
}
