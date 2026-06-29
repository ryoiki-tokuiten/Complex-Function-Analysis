import { state } from '../js/store/state.js';
import { getGLSLComplexMathLibrary } from '../js/rendering/webgl-shared.js';

state.algebraicChainingTerms = [{
  coeff: { re: 1, im: 0 },
  factors: [{ func: 'cos', chainedFunc: 'none', power: 1 }]
}];
state.currentFunction = 'algebraic_chaining';
state.webglDomainColoringEnabled = true;

console.log('Math library length:', getGLSLComplexMathLibrary(state).length);
