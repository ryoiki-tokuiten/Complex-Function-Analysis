import { state, context } from '../js/store/state.js';
import { getGLSLComplexMathLibrary, createWebGLProgramShared } from '../js/rendering/webgl-shared.js';

// Setup mock
global.window = { devicePixelRatio: 1 };
global.document = { createElement: () => ({ getContext: () => null }) };

const start = Date.now();
state.algebraicChainingTerms = [{
  coeff: { re: 1, im: 0 },
  factors: [{ func: 'cos', chainedFunc: 'none', power: 1 }]
}];
state.currentFunction = 'algebraic_chaining';
state.webglDomainColoringEnabled = true;

const s1 = Date.now();
const shader1 = getGLSLComplexMathLibrary(state);
const s2 = Date.now();
console.log('Shader string generation:', s2 - s1, 'ms');

