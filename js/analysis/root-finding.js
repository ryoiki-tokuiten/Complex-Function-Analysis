/**
 * Evaluates a polynomial P(z) = a_n z^n + ... + a_1 z + a_0 at a given complex point z.
 * @param {Complex[]} polyCoeffsComplex - Array of complex polynomial coefficients [a_n, ..., a_0].
 * @param {Complex} z - The complex point at which to evaluate the polynomial.
 * @returns {Complex} P(z).
 */
function evaluatePolynomial(polyCoeffsComplex, z) {
    let result = new Complex(0, 0);
    const n = polyCoeffsComplex.length - 1;
    for (let i = 0; i <= n; i++) {
        const termCoeff = polyCoeffsComplex[i];
        const powerOfZ = Complex.power(z, n - i);
        result = result.add(termCoeff.multiply(powerOfZ));
    }
    return result;
}

/**
 * Finds the roots of a polynomial using the Durand-Kerner method.
 * @param {number[]} inputCoeffs - Array of polynomial coefficients [a_n, a_{n-1}, ..., a_0].
 *                                Coefficients can be real numbers.
 * @returns {Complex[]} Array of complex roots.
 */
function findPolynomialRoots_DurandKerner(inputCoeffs) {
    if (!inputCoeffs || inputCoeffs.length === 0) {
        return [];
    }

    // Make a copy and handle leading zero coefficients
    let currentCoeffs = [...inputCoeffs];
    let firstNonZeroIndex = currentCoeffs.findIndex(c => c !== 0);

    if (firstNonZeroIndex === -1) {
        // All coefficients are zero, P(z) = 0. No specific roots or infinite roots.
        // Depending on interpretation, could return empty or error.
        return [];
    }

    if (firstNonZeroIndex > 0) {
        // Slice to remove leading zeros
        currentCoeffs = currentCoeffs.slice(firstNonZeroIndex);
    }

    if (currentCoeffs.length === 0) { // Should not happen if findIndex !== -1
        return [];
    }

    // Normalize: divide by the new leading coefficient to make it monic
    const normalizerValue = currentCoeffs[0];
    const normalizerComplex = new Complex(normalizerValue, 0);

    // Convert all coefficients to Complex and normalize them
    const polyCoeffsComplex = currentCoeffs.map(c => new Complex(c, 0).divide(normalizerComplex));

    let n = polyCoeffsComplex.length - 1;
    if (n < 1) { // Constant or empty polynomial
        return [];
    }

    let roots = [];
    // Initial guess for roots (e.g., (0.4 + 0.9i)^k)
    // A common starting point is to distribute them on a circle.
    // For simplicity, we use a fixed starting point method often cited.
    let p = new Complex(0.4, 0.9);
    for (let i = 0; i < n; i++) {
        roots.push(Complex.power(p, i));
    }

    const maxIterations = 1000; // Increased max iterations
    const tolerance = 1e-7;     // Stricter tolerance

    for (let iter = 0; iter < maxIterations; iter++) {
        let allRootsConverged = true;
        let newRoots = roots.map(r => r.clone()); // Operate on clones in each iteration

        for (let i = 0; i < n; i++) {
            let currentRoot = roots[i];
            let pVal = evaluatePolynomial(polyCoeffsComplex, currentRoot);

            let denominatorProduct = new Complex(1, 0);
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    denominatorProduct = denominatorProduct.multiply(currentRoot.subtract(roots[j]));
                }
            }

            if (denominatorProduct.abs() < 1e-20) { // Denominator is too small, root might be duplicate or an issue
                // This can happen if roots are very close.
                // A more robust implementation might add a small perturbation or use a different method.
                // For now, we'll skip updating this root in this iteration if denominator is zero.
                continue;
            }

            let correction = pVal.divide(denominatorProduct);
            newRoots[i] = currentRoot.subtract(correction);

            if (correction.abs() > tolerance) {
                allRootsConverged = false;
            }
        }
        roots = newRoots;

        if (allRootsConverged) {
            // console.log(`Converged in ${iter + 1} iterations.`);
            return roots;
        }
    }

    console.warn("Durand-Kerner did not converge within the maximum iterations.");
    return roots; // Return the best guess
}

/**
 * Finds roots of a general complex function f(z) using recursive subdivision
 * based on the Argument Principle (winding number).
 *
 * @param {function(Complex): Complex} func - The complex function f(z).
 * @param {{xMin: number, xMax: number, yMin: number, yMax: number}} bounds -
 *   The search rectangle { xMin, xMax, yMin, yMax }.
 * @param {number} N_initial_grid_search_points - Number of points for initial
 *   estimation of zero/pole count (currently unused in placeholder).
 * @returns {Complex[]} Array of complex numbers representing the found zeros.
 */
function findGeneralRoots_Subdivision(func, bounds, N_initial_grid_search_points) {
    const roots = [];
    const queue = [{ bounds: bounds, depth: 0 }]; // Queue for regions to process

    const MAX_DEPTH = state.currentFunction === 'zeta' ? 12 : 10; // Max recursion depth, more for zeta
    const MIN_SIZE_THRESHOLD = 1e-5; // Minimum size of a box to consider it a root
    const WINDING_NUM_THRESHOLD = 0.5; // Threshold to consider a region as containing roots
    // Use provided N_initial_grid_search_points if valid, else default
    const NUM_POINTS_PER_SIDE_SUBDIVISION = (typeof N_initial_grid_search_points === 'number' && N_initial_grid_search_points > 10) ? N_initial_grid_search_points : 40;


    let iterations = 0;
    const MAX_ITERATIONS = 2000; // Safeguard against infinite loops

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const current = queue.shift();
        const currentBounds = current.bounds;
        const depth = current.depth;

        const { xMin, xMax, yMin, yMax } = currentBounds;
        const width = xMax - xMin;
        const height = yMax - yMin;

        // Calculate winding number for the current region
        const windingNumber = calculateWindingNumber(func, currentBounds, NUM_POINTS_PER_SIDE_SUBDIVISION);

        if (Math.abs(windingNumber) > WINDING_NUM_THRESHOLD) {
            if ((width < MIN_SIZE_THRESHOLD && height < MIN_SIZE_THRESHOLD) || depth >= MAX_DEPTH) {
                const rootX = xMin + width / 2;
                const rootY = yMin + height / 2;
                const potentialRoot = new Complex(rootX, rootY);

                // Simple duplicate check using MIN_SIZE_THRESHOLD as tolerance
                if (!roots.some(r => r.subtract(potentialRoot).abs() < MIN_SIZE_THRESHOLD)) {
                    // Final check: ensure function value is actually close to zero at this potential root
                    const funcValAtRoot = func(potentialRoot);
                    if (funcValAtRoot.abs() < ZERO_POLE_EPSILON * 10) { // Multiply by 10 for a bit more tolerance after subdivision
                        roots.push(potentialRoot);
                    }
                }
            } else {
                // Subdivide into four quadrants and add to queue
                const xMid = xMin + width / 2;
                const yMid = yMin + height / 2;

                const quadrants = [
                    { bounds: { xMin: xMin, xMax: xMid, yMin: yMin, yMax: yMid }, depth: depth + 1 }, // Bottom-left
                    { bounds: { xMin: xMid, xMax: xMax, yMin: yMin, yMax: yMid }, depth: depth + 1 }, // Bottom-right
                    { bounds: { xMin: xMin, xMax: xMid, yMin: yMid, yMax: yMax }, depth: depth + 1 }, // Top-left
                    { bounds: { xMin: xMid, xMax: xMax, yMin: yMid, yMax: yMax }, depth: depth + 1 }  // Top-right
                ];
                quadrants.forEach(quad => queue.push(quad));
            }
        }
    }
    if (iterations >= MAX_ITERATIONS) {
        console.warn("findGeneralRoots_Subdivision reached max iterations.");
    }
    return roots;
}

// Example Usage (can be removed or commented out later)
// const polyCoeffs = [1, -3, 2]; // Represents z^2 - 3z + 2
// const polyRoots = findPolynomialRoots_DurandKerner(polyCoeffs);
// console.log("Polynomial Roots:", polyRoots);

// function exampleFunc(z) {
//     // Example: f(z) = z^2 - 1. Roots at z=1 and z=-1
//     // z^2 = (x+iy)^2 = x^2 - y^2 + 2ixy
//     // z^2 - 1 = (x^2 - y^2 - 1) + i(2xy)
//     return new Complex(z.real*z.real - z.imag*z.imag -1, 2*z.real*z.imag);
// }
// const searchBounds = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
// const generalRoots = findGeneralRoots_Subdivision(exampleFunc, searchBounds, 100);
// console.log("General Roots (Subdivision):", generalRoots);

/**
 * Calculates the winding number of a function f(z) around the origin
 * for a rectangular contour.
 * N = (1/2π) * Δarg(f(z))
 * This indicates N_zeros - N_poles inside the contour.
 *
 * @param {function(Complex): Complex} func - The complex function f(z).
 * @param {{xMin: number, xMax: number, yMin: number, yMax: number}} rectBounds - The rectangle.
 * @param {number} numIntegrationPointsPerSide - Number of points for numerical integration along each side.
 * @returns {number} The estimated winding number (should be close to an integer).
 */
function calculateWindingNumber(func, rectBounds, numIntegrationPointsPerSide) {
    const { xMin, xMax, yMin, yMax } = rectBounds;
    let totalArgChange = 0;
    let prevArg = 0;

    // Path segments:
    // 1. Bottom edge: (xMin, yMin) to (xMax, yMin)
    // 2. Right edge: (xMax, yMin) to (xMax, yMax)
    // 3. Top edge: (xMax, yMax) to (xMin, yMax)
    // 4. Left edge: (xMin, yMax) to (xMin, yMin)

    let currentPoint;
    let funcVal;

    // Initialize prevArg with the function value at the starting point (xMin, yMin)
    currentPoint = new Complex(xMin, yMin);
    funcVal = func(currentPoint);
    prevArg = funcVal.arg();

    // Integrate along each side
    const dx = (xMax - xMin) / numIntegrationPointsPerSide;
    const dy = (yMax - yMin) / numIntegrationPointsPerSide;

    // Side 1: Bottom (y = yMin, x from xMin to xMax)
    for (let i = 1; i <= numIntegrationPointsPerSide; i++) {
        currentPoint = new Complex(xMin + i * dx, yMin);
        funcVal = func(currentPoint);
        let currentArg = funcVal.arg();
        let deltaArg = currentArg - prevArg;
        // Adjust for crossing ±PI boundary
        if (deltaArg > Math.PI) deltaArg -= 2 * Math.PI;
        if (deltaArg < -Math.PI) deltaArg += 2 * Math.PI;
        totalArgChange += deltaArg;
        prevArg = currentArg;
    }

    // Side 2: Right (x = xMax, y from yMin to yMax)
    for (let i = 1; i <= numIntegrationPointsPerSide; i++) {
        currentPoint = new Complex(xMax, yMin + i * dy);
        funcVal = func(currentPoint);
        let currentArg = funcVal.arg();
        let deltaArg = currentArg - prevArg;
        if (deltaArg > Math.PI) deltaArg -= 2 * Math.PI;
        if (deltaArg < -Math.PI) deltaArg += 2 * Math.PI;
        totalArgChange += deltaArg;
        prevArg = currentArg;
    }

    // Side 3: Top (y = yMax, x from xMax to xMin)
    for (let i = 1; i <= numIntegrationPointsPerSide; i++) {
        currentPoint = new Complex(xMax - i * dx, yMax);
        funcVal = func(currentPoint);
        let currentArg = funcVal.arg();
        let deltaArg = currentArg - prevArg;
        if (deltaArg > Math.PI) deltaArg -= 2 * Math.PI;
        if (deltaArg < -Math.PI) deltaArg += 2 * Math.PI;
        totalArgChange += deltaArg;
        prevArg = currentArg;
    }

    // Side 4: Left (x = xMin, y from yMax to yMin)
    for (let i = 1; i <= numIntegrationPointsPerSide; i++) {
        currentPoint = new Complex(xMin, yMax - i * dy);
        funcVal = func(currentPoint);
        let currentArg = funcVal.arg();
        let deltaArg = currentArg - prevArg;
        if (deltaArg > Math.PI) deltaArg -= 2 * Math.PI;
        if (deltaArg < -Math.PI) deltaArg += 2 * Math.PI;
        totalArgChange += deltaArg;
        prevArg = currentArg;
    }

    return totalArgChange / (2 * Math.PI);
}


/**
 * Finds roots of a general complex function f(z) using recursive subdivision
 * based on the Argument Principle (winding number).
 *
 * @param {function(Complex): Complex} func - The complex function f(z).
 * @param {{xMin: number, xMax: number, yMin: number, yMax: number}} bounds -
 *   The search rectangle { xMin, xMax, yMin, yMax }.
 * @param {number} N_initial_grid_search_points - Number of points for initial
 *   estimation of zero/pole count (used by winding number calculation, e.g. 50-100 per side).
 * @returns {Complex[]} Array of complex numbers representing the found zeros.
 */
function findGeneralRoots_Subdivision(func, bounds, N_initial_grid_search_points) {
    const roots = [];
    const queue = [{ bounds: bounds, depth: 0 }];

    const MAX_DEPTH = state.currentFunction === 'zeta' ? 12 : 10;
    const MIN_SIZE_THRESHOLD = 1e-5;
    const WINDING_NUM_THRESHOLD = 0.5;
    const NUM_POINTS_PER_SIDE_SUBDIVISION = (typeof N_initial_grid_search_points === 'number' && N_initial_grid_search_points > 10) ? N_initial_grid_search_points : 40;


    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const current = queue.shift();
        const currentBounds = current.bounds;
        const depth = current.depth;

        const { xMin, xMax, yMin, yMax } = currentBounds;
        const width = xMax - xMin;
        const height = yMax - yMin;


        const windingNumber = calculateWindingNumber(func, currentBounds, NUM_POINTS_PER_SIDE_SUBDIVISION);

        if (Math.abs(windingNumber) > WINDING_NUM_THRESHOLD) {
            if ((width < MIN_SIZE_THRESHOLD && height < MIN_SIZE_THRESHOLD) || depth >= MAX_DEPTH) {
                const rootX = xMin + width / 2;
                const rootY = yMin + height / 2;
                const potentialRoot = new Complex(rootX, rootY);


                if (!roots.some(r => r.subtract(potentialRoot).abs() < MIN_SIZE_THRESHOLD)) {

                    const funcValAtRoot = func(potentialRoot);
                    if (funcValAtRoot.abs() < ZERO_POLE_EPSILON * 10) {
                        roots.push(potentialRoot);
                    }
                }
            } else {

                const xMid = xMin + width / 2;
                const yMid = yMin + height / 2;

                const quadrants = [
                    { bounds: { xMin: xMin, xMax: xMid, yMin: yMin, yMax: yMid }, depth: depth + 1 },
                    { bounds: { xMin: xMid, xMax: xMax, yMin: yMin, yMax: yMid }, depth: depth + 1 },
                    { bounds: { xMin: xMin, xMax: xMid, yMin: yMid, yMax: yMax }, depth: depth + 1 },
                    { bounds: { xMin: xMid, xMax: xMax, yMin: yMid, yMax: yMax }, depth: depth + 1 }
                ];
                quadrants.forEach(quad => queue.push(quad));
            }
        }
    }
    if (iterations >= MAX_ITERATIONS) {
        console.warn("findGeneralRoots_Subdivision reached max iterations.");
    }
    return roots;
}
