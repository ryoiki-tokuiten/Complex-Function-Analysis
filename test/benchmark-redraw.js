import { state, context } from '../js/store/state.js';
import { updateTitlesAndGlobalUI } from '../js/ui/ui-updates.js';

global.window = { devicePixelRatio: 1 };
global.document = { createElement: () => ({ getContext: () => null }) };
global.Image = class {};

state.algebraicChainingTerms = [{
  coeff: { re: 1, im: 0 },
  factors: [{ func: 'cos', chainedFunc: 'none', power: 1 }]
}];
state.currentFunction = 'algebraic_chaining';
state.webglDomainColoringEnabled = true;

const s1 = Date.now();
updateTitlesAndGlobalUI();
const s2 = Date.now();
console.log('UI update:', s2 - s1, 'ms');
