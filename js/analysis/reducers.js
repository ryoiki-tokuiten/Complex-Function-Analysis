import { complexAbs, complexArg, complexMul } from '../math-utils.js';

function finiteComplex(value) {
    return Number.isFinite(value?.re) && Number.isFinite(value?.im);
}

export class CompensatedComplexSum {
    constructor() {
        this.sum = { re: 0, im: 0 };
        this.compensation = { re: 0, im: 0 };
    }

    add(value) {
        this.#addPart('re', value.re);
        this.#addPart('im', value.im);
        return this.value();
    }

    #addPart(part, value) {
        const current = this.sum[part];
        const next = current + value;
        this.compensation[part] += Math.abs(current) >= Math.abs(value)
            ? current - next + value
            : value - next + current;
        this.sum[part] = next;
    }

    value() {
        return {
            re: this.sum.re + this.compensation.re,
            im: this.sum.im + this.compensation.im
        };
    }
}

export class ScaledComplexProduct {
    constructor() {
        this.valueComplex = { re: 1, im: 0 };
        this.logAbs = 0;
        this.argument = 0;
        this.zero = false;
        this.finite = true;
    }

    multiply(value) {
        const magnitude = complexAbs(value);
        if (magnitude === 0) {
            this.zero = true;
            this.valueComplex = { re: 0, im: 0 };
            this.logAbs = -Infinity;
            return this.snapshot();
        }

        if (!finiteComplex(value) || !Number.isFinite(magnitude)) {
            this.finite = false;
            this.valueComplex = { re: NaN, im: NaN };
            return this.snapshot();
        }

        this.logAbs += Math.log(magnitude);
        this.argument += complexArg(value);

        if (finiteComplex(this.valueComplex)) {
            const direct = complexMul(this.valueComplex, value);
            this.valueComplex = finiteComplex(direct) ? direct : { re: NaN, im: NaN };
        }

        return this.snapshot();
    }

    snapshot() {
        const normalized = this.zero || !this.finite
            ? { ...this.valueComplex }
            : { re: Math.cos(this.argument), im: Math.sin(this.argument) };

        return {
            value: { ...this.valueComplex },
            normalized,
            logAbs: this.logAbs,
            argument: this.argument,
            zero: this.zero,
            finite: this.finite
        };
    }
}

function invalidPartial(kind) {
    return kind === 'product'
        ? {
            value: { re: NaN, im: NaN },
            normalized: { re: NaN, im: NaN },
            logAbs: NaN,
            argument: NaN,
            finite: false
        }
        : { value: { re: NaN, im: NaN } };
}

export function reduceComplexTerms(samples, options = {}) {
    const kind = options.kind || 'none';
    const invalidPolicy = options.invalidPolicy || 'stop';
    const sum = kind === 'sum' ? new CompensatedComplexSum() : null;
    const product = kind === 'product' ? new ScaledComplexProduct() : null;
    let stopped = false;
    let finalValue = kind === 'sum'
        ? { re: 0, im: 0 }
        : kind === 'product'
            ? { re: 1, im: 0 }
            : null;

    for (const sample of samples) {
        if (stopped) {
            sample.reductionStatus = 'not-evaluated';
            sample.partial = invalidPartial(kind);
            continue;
        }

        if (sample.status !== 'valid' || !finiteComplex(sample.termValue)) {
            sample.reductionStatus = invalidPolicy === 'skip' ? 'skipped' : 'stopped';
            sample.partial = invalidPartial(kind);
            if (invalidPolicy !== 'skip') stopped = true;
            continue;
        }

        sample.reductionStatus = 'included';
        if (kind === 'sum') {
            sample.partial = { value: sum.add(sample.termValue) };
            finalValue = sample.partial.value;
        } else if (kind === 'product') {
            sample.partial = product.multiply(sample.termValue);
            finalValue = sample.partial.value;
        } else {
            sample.partial = null;
            finalValue = sample.termValue;
        }
    }

    return {
        kind,
        stopped,
        finalValue,
        product: product?.snapshot() || null
    };
}
