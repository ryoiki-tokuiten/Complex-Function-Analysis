function finiteComplex(value) {
    return !!value && Number.isFinite(value.re) && Number.isFinite(value.im);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createCircle(center, radius, segments) {
    const points = [];

    for (let index = 0; index <= segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2;
        points.push({
            re: center.re + radius * Math.cos(angle),
            im: center.im + radius * Math.sin(angle)
        });
    }

    return points;
}

const INDICATRIX_COLORS = Object.freeze([
    'rgba(80, 219, 255, 0.94)',
    'rgba(94, 239, 202, 0.94)',
    'rgba(143, 234, 122, 0.94)',
    'rgba(231, 226, 112, 0.94)',
    'rgba(255, 184, 105, 0.94)',
    'rgba(255, 137, 146, 0.94)',
    'rgba(255, 122, 199, 0.94)',
    'rgba(215, 145, 255, 0.94)',
    'rgba(164, 158, 255, 0.94)',
    'rgba(112, 174, 255, 0.94)',
    'rgba(92, 211, 255, 0.94)',
    'rgba(99, 232, 215, 0.94)'
]);
const INDICATRIX_MAX_COLUMNS = 10;
const INDICATRIX_SCALE_OUTLIER_FACTOR = 4;
const INDICATRIX_VIEWPORT_PADDING = 0.14;

function createArrowhead(start, end, radius) {
    const dx = end.re - start.re;
    const dy = end.im - start.im;
    const length = Math.hypot(dx, dy);
    if (length <= Number.EPSILON) return [];

    const headLength = Math.min(length * 0.38, radius * 1.2);
    const unitRe = dx / length;
    const unitIm = dy / length;
    const baseRe = end.re - unitRe * headLength;
    const baseIm = end.im - unitIm * headLength;
    const wing = headLength * 0.58;

    return [
        { re: baseRe - unitIm * wing, im: baseIm + unitRe * wing },
        end,
        { re: baseRe + unitIm * wing, im: baseIm - unitRe * wing }
    ];
}

export function generateTissotIndicatrices(map, xRange, yRange, density = 8, segments = 72) {
    if (typeof map?.evaluate !== 'function' || typeof map?.derivative !== 'function') return [];

    const columns = clamp(Math.round(density * 0.48), 4, INDICATRIX_MAX_COLUMNS);
    const rows = columns;
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];
    const radius = Math.min(Math.abs(spanX), Math.abs(spanY)) / (columns * 8);
    const indicatrices = [];

    for (let row = 1; row < rows; row += 1) {
        const im = yRange[0] + (row / rows) * spanY;
        for (let column = 1; column < columns; column += 1) {
            const re = xRange[0] + (column / columns) * spanX;
            const mappedCenter = map.evaluate(re, im);
            const derivative = map.derivative(re, im);
            if (!finiteComplex(mappedCenter) || !finiteComplex(derivative)) continue;

            const sourceCenter = { re, im };
            const mappedCircle = createCircle({ re: 0, im: 0 }, radius, segments).map(offset => ({
                re: mappedCenter.re + derivative.re * offset.re - derivative.im * offset.im,
                im: mappedCenter.im + derivative.re * offset.im + derivative.im * offset.re
            }));

            const sourceSpoke = [sourceCenter, { re: sourceCenter.re + radius, im: sourceCenter.im }];
            const mappedSpoke = [mappedCenter, {
                re: mappedCenter.re + derivative.re * radius,
                im: mappedCenter.im + derivative.im * radius
            }];

            indicatrices.push({
                sourceCenter,
                mappedCenter,
                color: INDICATRIX_COLORS[indicatrices.length % INDICATRIX_COLORS.length],
                inputRadius: radius,
                outputRadius: Math.hypot(derivative.re, derivative.im) * radius,
                sourceCircle: createCircle(sourceCenter, radius, segments),
                mappedCircle,
                sourceSpoke,
                mappedSpoke,
                sourceArrowhead: createArrowhead(sourceSpoke[0], sourceSpoke[1], radius),
                mappedArrowhead: createArrowhead(mappedSpoke[0], mappedSpoke[1], radius),
                isCritical: Math.hypot(derivative.re, derivative.im) <= 1e-8
            });
        }
    }

    return indicatrices;
}

function quantile(sortedValues, percentile) {
    if (!sortedValues.length) return NaN;
    const index = (sortedValues.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const blend = index - lower;
    return sortedValues[lower] * (1 - blend) + sortedValues[upper] * blend;
}

export function selectStableTissotIndicatrices(indicatrices) {
    if (!Array.isArray(indicatrices) || indicatrices.length === 0) return [];

    const radii = indicatrices
        .map(indicatrix => indicatrix.outputRadius)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    const referenceRadius = quantile(radii, 0.75);
    const maxRadius = Math.max(referenceRadius * INDICATRIX_SCALE_OUTLIER_FACTOR, 1e-9);

    return indicatrices.filter(indicatrix => indicatrix.outputRadius <= maxRadius);
}

export function getTissotViewportBounds(indicatrices) {
    if (!Array.isArray(indicatrices) || indicatrices.length === 0) return null;

    let minRe = Infinity;
    let maxRe = -Infinity;
    let minIm = Infinity;
    let maxIm = -Infinity;

    indicatrices.forEach(indicatrix => {
        indicatrix.mappedCircle.forEach(point => {
            minRe = Math.min(minRe, point.re);
            maxRe = Math.max(maxRe, point.re);
            minIm = Math.min(minIm, point.im);
            maxIm = Math.max(maxIm, point.im);
        });
    });

    if (![minRe, maxRe, minIm, maxIm].every(Number.isFinite)) return null;

    const span = Math.max(maxRe - minRe, maxIm - minIm, 0.5);
    const padding = span * INDICATRIX_VIEWPORT_PADDING;
    return {
        xRange: [minRe - padding, maxRe + padding],
        yRange: [minIm - padding, maxIm + padding]
    };
}
