var e=5e-4,t=[.5,.4],n=[.95047,1,1.08883],r=[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]];function i(e){return e<=.0031308?12.92*e:1.055*e**(1/2.4)-.055}function a(e){return e>.206893?e*e*e:(e-16/116)/7.787}function o(e,t,o){let s=t*Math.cos(o),c=t*Math.sin(o),l=(e+16)/116,u=s/500+l,d=l-c/200,f=[n[0]*a(u),n[1]*a(l),n[2]*a(d)],p=r.map(e=>e[0]*f[0]+e[1]*f[1]+e[2]*f[2]);return[Math.max(0,Math.min(1,i(p[0]))),Math.max(0,Math.min(1,i(p[1]))),Math.max(0,Math.min(1,i(p[2])))]}function s(){let e=[];for(let t=0;t<6;t++){let n=t/6,r=5.2+n*3;r%=2*Math.PI,r<0&&(r+=2*Math.PI);let i=o(15+(n-.5)*7,9,r);e.push(i[0],i[1],i[2])}return e}function c(e,t,n,r=5){return e+(1-Math.exp(-r*n))*(t-e)}function l(e,t,n,r=5){let i=1-Math.exp(-r*n);return e.map((e,n)=>e+i*(t[n]-e))}function u(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`[backgroundShader] compile error:`,e.getShaderInfoLog(r)),e.deleteShader(r),null)):null}function d(e,t,n){let r=e.createProgram();return r?(e.attachShader(r,t),e.attachShader(r,n),e.linkProgram(r),e.getProgramParameter(r,e.LINK_STATUS)?r:(console.error(`[backgroundShader] link error:`,e.getProgramInfoLog(r)),null)):null}function f(n){let r=n.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:`low-power`});if(!r)return console.warn(`[backgroundShader] WebGL 不可用，使用 CSS 背景兜底`),()=>void 0;{let e=s();r.clearColor(e[3],e[4],e[5],1),r.clear(r.COLOR_BUFFER_BIT)}let i=u(r,r.VERTEX_SHADER,`
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`),a=u(r,r.FRAGMENT_SHADER,`
precision mediump float;

varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse; // Normalized mouse position (0..1), drives the sun anchor

#define PI 3.14159265359
#define TAU 6.28318530718

// A shared slow wave that all layers ride on, creating coherent large-scale
// swells. Two sines at different low frequencies, moving in opposite directions.
float sharedWave(float x, float t) {
  return 0.07 * sin(x * 8.8 + t * 0.12)
       + 0.05 * sin(x * 4.8 - t * 0.08);
}

// Multi-octave sine ridge: three octaves with decreasing amplitude and
// staggered phases so crests don't align into a pure sine.
float layerHeight(float x, float baseY, float amp, float freq, float phase) {
  float h = 0.0;
  h += 1.00 * sin(x * freq        + phase);
  h += 0.50 * sin(x * freq * 2.17 + phase * 1.7 + 1.3);
  h += 0.25 * sin(x * freq * 4.31 + phase * 2.3 + 2.9);
  h /= (1.00 + 0.50 + 0.25);
  return baseY + amp * h;
}

// Map a 0..1 point into the same aspect-corrected space used by uvAspect,
// so distances are measured on a common coordinate system regardless of
// orientation. Keep everything that feeds into lightDist/facing going
// through this helper.
vec2 toAspect(vec2 p, float aspect) {
  return aspect > 1.0 ? vec2(p.x * aspect, p.y) : vec2(p.x, p.y / aspect);
}

// Deterministic pseudo-random in [0, 1) from a 2D coordinate.
float hash21(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

// Smooth value noise: bilinear interpolation of hash values on a grid,
// with smoothstep-eased interpolation weights.
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian motion: 4 octaves of value noise at halving amplitude
// and doubling frequency — smoothly varying low-frequency noise.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uvAspect = toAspect(uv, aspect);

  float t = u_time;
  // u_time accumulates in ms-scale via the render loop's speed factor;
  // convert to a seconds-ish scale for the per-layer drift.
  float iTime = t * 0.001;

  vec3 baseCol = vec3(34.0, 21.0, 40.0) / 255.0;
  vec3 haloCol = vec3(168.0, 77.0, 74.0) / 255.0;
  vec3 hotCol  = vec3(248.0, 150.0, 112.0) / 255.0;
  vec3 lineCol = vec3(228.0, 119.0, 91.0) / 255.0;

  vec2 lightAnchor = toAspect(u_mouse, aspect);
  float lightDist = distance(uvAspect, lightAnchor);
  float haloRadius = 1.3;
  float coreRadius = 0.4;
  float lightInfluence = 1.0 - smoothstep(0.0, haloRadius, lightDist);
  lightInfluence = lightInfluence * lightInfluence;

  float lightCore = 1.0 - smoothstep(0.0, coreRadius, lightDist);
  lightCore = lightCore * lightCore * lightCore;

  vec3 col = baseCol * 0.35;

  float baseY[5];  float amp[5];  float freq[5];  float phase[5];
  float speed[5]; float rimDepth[5]; float rimBoost[5];

  speed[0] =  0.07; speed[1] = -0.11; speed[2] =  0.13; speed[3] = -0.05; speed[4] =  0.17;

  // Layer 0 is the "mega-mountain" that sweeps across the upper half.
  baseY[0] = 0.75; amp[0] = 0.25; freq[0] = 1.4; phase[0] = 0.3 + iTime * speed[0];
  baseY[1] = 0.42; amp[1] = 0.09; freq[1] = 4.0; phase[1] = 1.7 + iTime * speed[1];
  baseY[2] = 0.34; amp[2] = 0.07; freq[2] = 5.5; phase[2] = 2.9 + iTime * speed[2];
  baseY[3] = 0.26; amp[3] = 0.10; freq[3] = 3.5; phase[3] = 0.9 + iTime * speed[3];
  baseY[4] = 0.18; amp[4] = 0.06; freq[4] = 6.0; phase[4] = 4.2 + iTime * speed[4];

  rimDepth[0] = 0.20; rimDepth[1] = 0.09; rimDepth[2] = 0.08; rimDepth[3] = 0.10; rimDepth[4] = 0.07;
  rimBoost[0] = 0.30; rimBoost[1] = 0.12; rimBoost[2] = 0.14; rimBoost[3] = 0.16; rimBoost[4] = 0.18;

  for (int i = 0; i < 5; i++) {
    float h = layerHeight(uv.x, baseY[i], amp[i], freq[i], phase[i]) + sharedWave(uv.x, iTime);

    // Numerical slope of the full ridge (all fBm octaves + shared wave).
    float eps = 0.001;
    float hLeft  = layerHeight(uv.x - eps, baseY[i], amp[i], freq[i], phase[i]) + sharedWave(uv.x - eps, iTime);
    float hRight = layerHeight(uv.x + eps, baseY[i], amp[i], freq[i], phase[i]) + sharedWave(uv.x + eps, iTime);
    float dhdx = (hRight - hLeft) / (2.0 * eps);
    vec2 normal = normalize(vec2(-dhdx, 1.0));

    // Direction from the ridge point toward the light (aspect-corrected).
    vec2 ridgePoint = toAspect(vec2(uv.x, h), aspect);
    vec2 toLight = normalize(lightAnchor - ridgePoint);
    float facing = max(dot(normal, toLight), 0.0);

    // Halo: brighten pixels just above the ridge, modulated by light and facing.
    if (uv.y >= h && uv.y < h + rimDepth[i]) {
      float ht = 1.0 - clamp((uv.y - h) / rimDepth[i], 0.0, 1.0);
      ht = ht * ht * ht * ht;
      float haloFactor = 0.05 + 2.0 * lightInfluence * facing;
      vec3 localHaloCol = mix(haloCol, hotCol, lightCore);
      col += localHaloCol * (rimBoost[i] * ht * haloFactor);
    }

    // Body: fill below the ridge with a depth-weighted warm lift.
    if (uv.y < h) {
      float depth = float(i) / 4.0;
      float depthWeight = 0.3 + 0.9 * depth;
      float gradDepth = clamp((h - uv.y) / 0.25, 0.0, 1.0);
      float gradMul = 0.7 + 0.3 * gradDepth;

      vec3 body = baseCol * gradMul;
      body += haloCol * lightInfluence * 0.35 * depthWeight;
      body += hotCol * lightCore * 0.2 * depthWeight;
      col = body;
    }

    // Crisp ridge line — only on slopes facing the light.
    float lineFalloff = lightInfluence * facing;
    lineFalloff = lineFalloff * lineFalloff;
    float lineWidth = (0.1 + 0.6 * lineFalloff) / u_resolution.y;
    float lineSoftEdge = 6.0 / u_resolution.y;
    float dist = abs(uv.y - h);
    float lineMask = 1.0 - smoothstep(lineWidth, lineWidth + lineSoftEdge, dist);
    col = mix(col, lineCol, lineMask * lineFalloff * 0.8);
  }

  // Atmospheric haze.
  float haze = fbm(uv * 3.0 + vec2(iTime * 0.02, 0.0));
  vec3 hazeTint = mix(baseCol * 0.6, haloCol * 0.5, lightInfluence * 0.6);
  col += hazeTint * haze * 0.15;

  gl_FragColor = vec4(col, 1.0);
}
`);if(!i||!a)return()=>void 0;let o=d(r,i,a);if(!o)return()=>void 0;let f=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,f),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),r.STATIC_DRAW);let p=r.getAttribLocation(o,`a_position`),m=r.getUniformLocation(o,`u_time`),h=r.getUniformLocation(o,`u_resolution`),g=r.getUniformLocation(o,`u_mouse`),_=()=>{let e=Math.min(window.devicePixelRatio||1,1.5),t=window.innerWidth<768?.35:.75;n.width=Math.max(1,Math.round(window.innerWidth*e*t)),n.height=Math.max(1,Math.round(window.innerHeight*e*t)),r.viewport(0,0,n.width,n.height)};_();let v=0,y=performance.now(),b=.09,x=!0,S=null,C=!1,w=[...t],T=[...t];function E(){if(C)return;let t=performance.now(),i=t-y,a=Math.min(i,100)/1e3;y=t,b=c(b,0,a,.5),T=l(T,w,a,20),v+=Math.min(i,100)*b,r.useProgram(o),r.bindBuffer(r.ARRAY_BUFFER,f),r.enableVertexAttribArray(p),r.vertexAttribPointer(p,2,r.FLOAT,!1,0,0),r.uniform1f(m,v),r.uniform2f(h,n.width,n.height),r.uniform2f(g,T[0],T[1]),r.drawArrays(r.TRIANGLES,0,6),b<5e-4&&Math.abs(T[0]-w[0])<e&&Math.abs(T[1]-w[1])<e?(b=0,x=!1,S=null):S=requestAnimationFrame(E)}let D=()=>{!x&&!C&&(x=!0,y=performance.now(),E())},O=(e=3)=>{b=.03*e,D()},k=(e,t)=>{w=[e,t],D()},A=()=>{_(),D()},j=e=>{e.pointerType===`mouse`&&(k(e.clientX/window.innerWidth,1-e.clientY/window.innerHeight),O(35))},M=()=>k(...t),N=()=>{document.hidden?(S!==null&&cancelAnimationFrame(S),S=null,x=!1):D()};return window.addEventListener(`resize`,A),window.addEventListener(`pointermove`,j),document.documentElement.addEventListener(`pointerleave`,M),document.addEventListener(`visibilitychange`,N),E(),()=>{C=!0,S!==null&&cancelAnimationFrame(S),window.removeEventListener(`resize`,A),window.removeEventListener(`pointermove`,j),document.documentElement.removeEventListener(`pointerleave`,M),document.removeEventListener(`visibilitychange`,N),r.deleteBuffer(f),r.deleteProgram(o),r.deleteShader(i),r.deleteShader(a)}}var p=document.getElementById(`bg-canvas`);p instanceof HTMLCanvasElement&&f(p);