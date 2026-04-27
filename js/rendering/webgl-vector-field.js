// ── GPU Vector Field via SDF arrows ───────────────────────────────────────
// Full-screen quad where the fragment shader evaluates f(z) at grid cell centers
// and draws arrows using signed distance fields. Zero CPU function evaluations.
let _vfProgram = null, _vfLocs = null;

const _VF_FS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform vec4 u_viewBounds;',
    'uniform float u_density;',
    'uniform float u_arrowScale;',
    'uniform float u_thickness;',
    'uniform float u_headSize;',
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
    'vec3 hsl2rgb(float h,float s,float l){float c=(1.0-abs(2.0*l-1.0))*s;float x=c*(1.0-abs(mod(h*6.0,2.0)-1.0));float m=l-c*0.5;vec3 r;float hh=h*6.0;if(hh<1.0)r=vec3(c,x,0);else if(hh<2.0)r=vec3(x,c,0);else if(hh<3.0)r=vec3(0,c,x);else if(hh<4.0)r=vec3(0,x,c);else if(hh<5.0)r=vec3(x,0,c);else r=vec3(c,0,x);return r+m;}',
    '',
    'float sdfSeg(vec2 p,vec2 a,vec2 b){vec2 ab=b-a,ap=p-a;float t=clamp(dot(ap,ab)/max(dot(ab,ab),1e-12),0.0,1.0);return length(ap-ab*t);}',
    '',
    'bool inTri(vec2 p,vec2 a,vec2 b,vec2 c){float d1=(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y);float d2=(p.x-c.x)*(b.y-c.y)-(b.x-c.x)*(p.y-c.y);float d3=(p.x-a.x)*(c.y-a.y)-(c.x-a.x)*(p.y-a.y);return(d1>=0.0&&d2>=0.0&&d3>=0.0)||(d1<=0.0&&d2<=0.0&&d3<=0.0);}',
    '',
    'void main(){',
    '  vec2 w=vec2(mix(u_viewBounds.x,u_viewBounds.y,v_uv.x),mix(u_viewBounds.w,u_viewBounds.z,1.0-v_uv.y));',
    '  float cellW=(u_viewBounds.y-u_viewBounds.x)/u_density;',
    '  float cellH=(u_viewBounds.w-u_viewBounds.z)/u_density;',
    '  float cell=min(cellW,cellH);',
    '  vec2 cc=vec2(floor(w.x/cellW+0.5)*cellW, floor(w.y/cellH+0.5)*cellH);',
    '',
    '  vec2 fz;',
    '  bool ok=evaluateMappedValueBase(cc,0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fz);',
    '  if(!ok) discard;',
    '',
    '  if(u_vectorMode>0.5&&u_vectorMode<1.5){float m2=dot(fz,fz);if(m2<1e-12) discard;fz=vec2(fz.x/m2,-fz.y/m2);}',
    '  if(u_vectorMode>1.5){float h=1e-5;vec2 fr,fl;evaluateMappedValueBase(cc+vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fr);evaluateMappedValueBase(cc-vec2(h,0),0.0,u_functionId,u_mobiusA,u_mobiusB,u_mobiusC,u_mobiusD,u_polyDegree,u_polyCoeffs,u_zetaContinuationEnabled,u_zetaReflectionBoundary,u_fracPower,fl);fz=(fr-fl)/(2.0*h);}',
    '',
    '  float mag=length(fz);',
    '  if(mag<1e-9) discard;',
    '  vec2 dir=fz/mag;',
    '  vec2 perp=vec2(-dir.y,dir.x);',
    '',
    '  float aLen=cell*0.38*u_arrowScale;',
    '  float aW=cell*u_thickness*0.015;',
    '  float hSz=cell*u_headSize*0.04;',
    '  vec2 tip=cc+dir*aLen;',
    '',
    '  float dShaft=sdfSeg(w,cc,tip-dir*hSz*1.5);',
    '  bool onHead=inTri(w,tip,tip-dir*hSz*2.5+perp*hSz,tip-dir*hSz*2.5-perp*hSz);',
    '',
    '  if(dShaft>aW&&!onHead) discard;',
    '',
    '  float phase=atan(fz.y,fz.x)/(2.0*PI);',
    '  if(phase<0.0)phase+=1.0;',
    '  float lm=log(1.0+mag);',
    '  float lit=clamp(0.35+lm*0.08*u_brightness,0.2,0.85);',
    '  vec3 col=hsl2rgb(phase,0.85,lit);',
    '  float aa=onHead?1.0:1.0-smoothstep(aW*0.6,aW,dShaft);',
    '  gl_FragColor=vec4(col*aa,aa);',
    '}'
].join('\n');

function drawVectorFieldWithWebGL(ctx, planeParams) {
    initWebGLImageSupportIfNeeded();
    if (!webglImageSupport.available) return false;
    const renderer = webglImageSupport.renderer;
    const gl = renderer.gl;

    // Lazy-create vector field shader program
    if (!_vfProgram) {
        const vs = 'attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
        _vfProgram = createWebGLProgramShared(gl, vs, _VF_FS);
        if (!_vfProgram) return false;
        _vfLocs = {
            aPos: gl.getAttribLocation(_vfProgram, 'a_position'),
            uViewBounds: gl.getUniformLocation(_vfProgram, 'u_viewBounds'),
            uDensity: gl.getUniformLocation(_vfProgram, 'u_density'),
            uArrowScale: gl.getUniformLocation(_vfProgram, 'u_arrowScale'),
            uThickness: gl.getUniformLocation(_vfProgram, 'u_thickness'),
            uHeadSize: gl.getUniformLocation(_vfProgram, 'u_headSize'),
            uVectorMode: gl.getUniformLocation(_vfProgram, 'u_vectorMode'),
            uFunctionId: gl.getUniformLocation(_vfProgram, 'u_functionId'),
            uMobiusA: gl.getUniformLocation(_vfProgram, 'u_mobiusA'),
            uMobiusB: gl.getUniformLocation(_vfProgram, 'u_mobiusB'),
            uMobiusC: gl.getUniformLocation(_vfProgram, 'u_mobiusC'),
            uMobiusD: gl.getUniformLocation(_vfProgram, 'u_mobiusD'),
            uPolyDegree: gl.getUniformLocation(_vfProgram, 'u_polyDegree'),
            uPolyCoeffs: [],
            uZetaCont: gl.getUniformLocation(_vfProgram, 'u_zetaContinuationEnabled'),
            uZetaRefl: gl.getUniformLocation(_vfProgram, 'u_zetaReflectionBoundary'),
            uFracPower: gl.getUniformLocation(_vfProgram, 'u_fracPower'),
            uBrightness: gl.getUniformLocation(_vfProgram, 'u_brightness'),
        };
        for (let i = 0; i <= 10; i++) _vfLocs.uPolyCoeffs.push(gl.getUniformLocation(_vfProgram, `u_polyCoeffs[${i}]`));
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

    gl.useProgram(_vfProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer);
    gl.enableVertexAttribArray(_vfLocs.aPos);
    gl.vertexAttribPointer(_vfLocs.aPos, 2, gl.FLOAT, false, 0, 0);

    const xR = planeParams.currentVisXRange || planeParams.xRange;
    const yR = planeParams.currentVisYRange || planeParams.yRange;
    gl.uniform4f(_vfLocs.uViewBounds, xR[0], xR[1], yR[0], yR[1]);

    const density = Math.max(5, Math.min(25, Math.floor(state.gridDensity * 0.75)));
    gl.uniform1f(_vfLocs.uDensity, density);
    gl.uniform1f(_vfLocs.uArrowScale, state.vectorFieldScale || 1);
    gl.uniform1f(_vfLocs.uThickness, state.vectorArrowThickness || 1.5);
    gl.uniform1f(_vfLocs.uHeadSize, state.vectorArrowHeadSize || 8);
    gl.uniform1f(_vfLocs.uBrightness, state.domainBrightness || 1);

    const modeMap = { 'f(z)': 0, '1/f(z)': 1, "f'(z)": 2 };
    gl.uniform1f(_vfLocs.uVectorMode, modeMap[state.vectorFieldFunction] || 0);

    const funcId = getWebGLDomainColorFunctionIdShared(state.currentFunction);
    gl.uniform1f(_vfLocs.uFunctionId, funcId);

    const a = state.mobiusA || {re:1,im:0}, b = state.mobiusB || {re:0,im:0};
    const c = state.mobiusC || {re:0,im:0}, d = state.mobiusD || {re:1,im:0};
    gl.uniform2f(_vfLocs.uMobiusA, a.re||0, a.im||0);
    gl.uniform2f(_vfLocs.uMobiusB, b.re||0, b.im||0);
    gl.uniform2f(_vfLocs.uMobiusC, c.re||0, c.im||0);
    gl.uniform2f(_vfLocs.uMobiusD, d.re||0, d.im||0);

    const deg = Math.max(0, Math.min(10, Number.isFinite(state.polynomialN) ? state.polynomialN : 0));
    gl.uniform1i(_vfLocs.uPolyDegree, deg);
    for (let i = 0; i <= 10; i++) {
        const co = (state.polynomialCoeffs && state.polynomialCoeffs[i]) || null;
        gl.uniform2f(_vfLocs.uPolyCoeffs[i], co ? (co.re||0) : 0, co ? (co.im||0) : 0);
    }
    gl.uniform1f(_vfLocs.uZetaCont, state.zetaContinuationEnabled ? 1 : 0);
    gl.uniform1f(_vfLocs.uZetaRefl, typeof ZETA_REFLECTION_POINT_RE !== 'undefined' ? ZETA_REFLECTION_POINT_RE : 0.5);
    gl.uniform1f(_vfLocs.uFracPower, state.fractionalPowerN !== undefined ? state.fractionalPowerN : 0.5);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(renderer.canvas, 0, 0);
    ctx.restore();
    return true;
}
