function generateCirclePoints(cx, cy, radius, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        const t = (i / numPoints) * 2 * Math.PI;
        points.push({ re: cx + radius * Math.cos(t), im: cy + radius * Math.sin(t) });
    }
    return points;
}

function generateEllipsePoints(cx, cy, a, b, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        const t = (i / numPoints) * 2 * Math.PI;
        points.push({ re: cx + a * Math.cos(t), im: cy + b * Math.sin(t) });
    }
    return points;
}

function generateHyperbolaPoints(cx, cy, a, b, numPoints) {
    const points = [];
    const UM = 2.5;
    for (let i = 0; i <= numPoints / 2; ++i) {
        const u = (i / (numPoints / 2)) * UM - UM / 2;
        points.push({ re: cx + a * Math.cosh(u), im: cy + b * Math.sinh(u) });
    }
    points.push(null); // break point
    for (let i = 0; i <= numPoints / 2; ++i) {
        const u = (i / (numPoints / 2)) * UM - UM / 2;
        points.push({ re: cx - a * Math.cosh(u), im: cy + b * Math.sinh(u) });
    }
    return points;
}

function generateLinePoints(xMin, xMax, y, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        points.push({ re: xMin + i * (xMax - xMin) / numPoints, im: y });
    }
    return points;
}

function generateVerticalLinePoints(x, yMin, yMax, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; ++i) {
        points.push({ re: x, im: yMin + i * (yMax - yMin) / numPoints });
    }
    return points;
}
