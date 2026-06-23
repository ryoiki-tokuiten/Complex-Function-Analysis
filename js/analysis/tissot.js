function finiteComplex(value) {
    return !!value && Number.isFinite(value.re) && Number.isFinite(value.im);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function generateTissotIndicatrices(map, xRange, yRange, density = 8, segments = 32) {
    if (typeof map?.source !== 'function' || typeof map?.derivative !== 'function') return [];

    const columns = clamp(Math.floor(density * 0.45), 3, 12);
    const rows = columns;
    const spanX = xRange[1] - xRange[0];
    const spanY = yRange[1] - yRange[0];
    const radius = Math.min(Math.abs(spanX), Math.abs(spanY)) / (columns * 8);
    const circles = [];

    for (let row = 1; row < rows; row += 1) {
        const im = yRange[0] + (row / rows) * spanY;
        for (let column = 1; column < columns; column += 1) {
            const re = xRange[0] + (column / columns) * spanX;
            const center = map.source(re, im);
            const derivative = map.derivative(re, im);
            if (!finiteComplex(center) || !finiteComplex(derivative)) continue;

            const points = [];
            for (let index = 0; index <= segments; index += 1) {
                const angle = (index / segments) * Math.PI * 2;
                const offsetRe = radius * Math.cos(angle);
                const offsetIm = radius * Math.sin(angle);
                points.push({
                    re: center.re + derivative.re * offsetRe - derivative.im * offsetIm,
                    im: center.im + derivative.re * offsetIm + derivative.im * offsetRe
                });
            }
            circles.push(points);
        }
    }

    return circles;
}
