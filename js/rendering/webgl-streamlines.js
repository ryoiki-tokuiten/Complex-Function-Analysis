// ── GPU Streamlines via Line Integral Convolution (LIC) ──────────────────
// Full-screen quad where the fragment shader performs per-pixel RK2 integration
// forward and backward along the flow field, sampling procedural noise along
// the path. This produces coherent flow textures at native GPU parallelism.
// Zero CPU function evaluations. Zero CPU RK4 integration.
let _licProgram = null, _licLocs = null;

const _LIC_FS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform vec4 u_viewBounds;',
    'uniform vec2 u_resolution;',
    'uniform float u_stepSize;',
    'uniform float u_thickness;',
    'uniform float u_vectorMode;',
    'uniform float u_functionId;',
    'uniform vec2 u_mobiusA, u_mobiusB, u_mobiusC, u_mobiusD;',
    'uniform int u_polyDegree;',
    'uniform vec2 u_polyCoeffs[11];',
    'uniform float u_zetaContinuationEnabled;',
    'uniform float u_zetaReflectionBoundary;',
    'uniform float u_fracPower;',
    'uniform float u_brightness;',
    '',
    GLSL_COMPLEX_MATH_LIBRARY,
    '',
    // Procedural hash noise for LIC kernel — standard GPU noise
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    '',
    // Get normalized vector field direction at a point
    'vec2 getFlowDir(vec2 z){',
    '  vec2 fz;',
    '  bool ok=evaluateMappedValueBase(z,0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fz);',
    '  if(!ok) return vec2(0.0);',
    // Apply vector mode: f(z), 1/f(z), or f'(z)
    '  if(u_vectorMode>0.5&&u_vectorMode<1.5){float m2=dot(fz,fz);if(m2<1e-12)return vec2(0.0);fz=vec2(fz.x/m2,-fz.y/m2);}',
    '  if(u_vectorMode>1.5){float h=1e-5;vec2 fr,fl;evaluateMappedValueBase(z+vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fr);evaluateMappedValueBase(z-vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fl);fz=(fr-fl)/(2.0*h);}',
    '  float m=length(fz);',
    '  if(m<1e-9) return vec2(0.0);',
    '  return fz/m;',
    '}',
    '',
    'vec3 hsl2rgb(float h,float s,float l){float c=(1.0-abs(2.0*l-1.0))*s;float x=c*(1.0-abs(mod(h*6.0,2.0)-1.0));float m=l-c*0.5;vec3 r;float hh=h*6.0;if(hh<1.0)r=vec3(c,x,0);else if(hh<2.0)r=vec3(x,c,0);else if(hh<3.0)r=vec3(0,c,x);else if(hh<4.0)r=vec3(0,x,c);else if(hh<5.0)r=vec3(x,0,c);else r=vec3(c,0,x);return r+m;}',
    '',
    'void main(){',
    '  vec2 z=vec2(mix(u_viewBounds.x,u_viewBounds.y,v_uv.x),mix(u_viewBounds.w,u_viewBounds.z,1.0-v_uv.y));',
    '',
    // Get field magnitude at this point for coloring
    '  vec2 fzBase;',
    '  bool okBase=evaluateMappedValueBase(z,0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fzBase);',
    '  if(!okBase) discard;',
    '',
    '  float baseMag=length(fzBase);',
    '  if(baseMag<1e-12) discard;',
    '',
    // LIC kernel: integrate forward and backward, sampling noise
    '  float viewSpan=max(u_viewBounds.y-u_viewBounds.x,u_viewBounds.w-u_viewBounds.z);',
    '  float dt=u_stepSize*viewSpan*0.003;',
    // Noise frequency scales with viewport so streamlines have consistent visual width
    '  float noiseFreq=u_resolution.x*0.15/viewSpan;',
    '',
    '  float intensity=0.0;',
    '  float weight=0.0;',
    '  vec2 p;',
    '',
    // Forward integration (32 steps)
    '  p=z;',
    '  for(int i=0;i<32;i++){',
    '    vec2 d=getFlowDir(p);',
    '    if(dot(d,d)<0.5) break;',
    '    p+=d*dt;',
    '    float w=1.0-float(i)/32.0;',
    '    intensity+=hash(floor(p*noiseFreq))*w;',
    '    weight+=w;',
    '  }',
    '',
    // Backward integration (32 steps)
    '  p=z;',
    '  for(int i=0;i<32;i++){',
    '    vec2 d=getFlowDir(p);',
    '    if(dot(d,d)<0.5) break;',
    '    p-=d*dt;',
    '    float w=1.0-float(i)/32.0;',
    '    intensity+=hash(floor(p*noiseFreq))*w;',
    '    weight+=w;',
    '  }',
    '',
    '  if(weight<0.5) discard;',
    '  intensity/=weight;',
    '',
    // Color by flow direction (phase-based hue) and magnitude (lightness)
    '  float phase=atan(fzBase.y,fzBase.x)/(2.0*PI);',
    '  if(phase<0.0) phase+=1.0;',
    '  float logMag=log(1.0+baseMag);',
    '  float lit=clamp(intensity*0.45+0.1+logMag*0.04*u_brightness,0.08,0.75);',
    '  vec3 col=hsl2rgb(phase,0.75,lit);',
    '',
    '  float alpha=clamp(u_thickness*0.7,0.3,0.95);',
    '  gl_FragColor=vec4(col*alpha,alpha);',
    '}',
].join('\n');

function drawStreamlinesWithWebGL(ctx, planeParams) {
    initWebGLImageSupportIfNeeded();
    if (!webglImageSupport.available) return false;
    const renderer = webglImageSupport.renderer;
    const gl = renderer.gl;

    // Lazy-create LIC shader program
    if (!_licProgram) {
        const vs = 'attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
        _licProgram = createWebGLProgramShared(gl, vs, _LIC_FS);
        if (!_licProgram) return false;
        _licLocs = {
            aPos: gl.getAttribLocation(_licProgram, 'a_position'),
            uViewBounds: gl.getUniformLocation(_licProgram, 'u_viewBounds'),
            uResolution: gl.getUniformLocation(_licProgram, 'u_resolution'),
            uStepSize: gl.getUniformLocation(_licProgram, 'u_stepSize'),
            uThickness: gl.getUniformLocation(_licProgram, 'u_thickness'),
            uVectorMode: gl.getUniformLocation(_licProgram, 'u_vectorMode'),
            uFunctionId: gl.getUniformLocation(_licProgram, 'u_functionId'),
            uMobiusA: gl.getUniformLocation(_licProgram, 'u_mobiusA'),
            uMobiusB: gl.getUniformLocation(_licProgram, 'u_mobiusB'),
            uMobiusC: gl.getUniformLocation(_licProgram, 'u_mobiusC'),
            uMobiusD: gl.getUniformLocation(_licProgram, 'u_mobiusD'),
            uPolyDegree: gl.getUniformLocation(_licProgram, 'u_polyDegree'),
            uPolyCoeffs: [],
            uZetaCont: gl.getUniformLocation(_licProgram, 'u_zetaContinuationEnabled'),
            uZetaRefl: gl.getUniformLocation(_licProgram, 'u_zetaReflectionBoundary'),
            uFracPower: gl.getUniformLocation(_licProgram, 'u_fracPower'),
            uBrightness: gl.getUniformLocation(_licProgram, 'u_brightness'),
        };
        for (let i = 0; i <= 10; i++) _licLocs.uPolyCoeffs.push(gl.getUniformLocation(_licProgram, `u_polyCoeffs[${i}]`));
    }

    const width = ctx.canvas.width, height = ctx.canvas.height;
    if (renderer.canvas.width !== width || renderer.canvas.height !== height) {
        renderer.canvas.width = width; renderer.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(_licProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
    gl.enableVertexAttribArray(_licLocs.aPos);
    gl.vertexAttribPointer(_licLocs.aPos, 2, gl.FLOAT, false, 0, 0);

    const xR = planeParams.currentVisXRange || planeParams.xRange;
    const yR = planeParams.currentVisYRange || planeParams.yRange;
    gl.uniform4f(_licLocs.uViewBounds, xR[0], xR[1], yR[0], yR[1]);
    gl.uniform2f(_licLocs.uResolution, width, height);

    gl.uniform1f(_licLocs.uStepSize, state.streamlineStepSize || 0.02);
    gl.uniform1f(_licLocs.uThickness, state.streamlineThickness || 1.5);
    gl.uniform1f(_licLocs.uBrightness, state.domainBrightness || 1);

    const modeMap = { 'f(z)': 0, '1/f(z)': 1, "f'(z)": 2 };
    gl.uniform1f(_licLocs.uVectorMode, modeMap[state.vectorFieldFunction] || 0);

    const funcId = getWebGLDomainColorFunctionIdShared(state.currentFunction);
    gl.uniform1f(_licLocs.uFunctionId, funcId);

    const a = state.mobiusA || {re:1,im:0}, b = state.mobiusB || {re:0,im:0};
    const c = state.mobiusC || {re:0,im:0}, d = state.mobiusD || {re:1,im:0};
    gl.uniform2f(_licLocs.uMobiusA, a.re||0, a.im||0);
    gl.uniform2f(_licLocs.uMobiusB, b.re||0, b.im||0);
    gl.uniform2f(_licLocs.uMobiusC, c.re||0, c.im||0);
    gl.uniform2f(_licLocs.uMobiusD, d.re||0, d.im||0);

    const deg = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
    gl.uniform1i(_licLocs.uPolyDegree, deg);
    for (let i = 0; i <= 10; i++) {
        const co = (state.polynomialCoeffs && state.polynomialCoeffs[i]) || null;
        gl.uniform2f(_licLocs.uPolyCoeffs[i], co ? (co.re||0) : 0, co ? (co.im||0) : 0);
    }
    gl.uniform1f(_licLocs.uZetaCont, state.zetaContinuationEnabled ? 1 : 0);
    gl.uniform1f(_licLocs.uZetaRefl, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);
    gl.uniform1f(_licLocs.uFracPower, state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(renderer.canvas, 0, 0);
    ctx.restore();
    return true;
}
