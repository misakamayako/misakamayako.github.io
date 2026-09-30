/**
 * 主页背景：全屏四边形 + 片元着色器绘制的山脊 / 霞光。
 *
 * 移植自 auto-drive-manager/apps/login 的 utils/backgroundShader.worker.js，
 * 着色器源码与调色逻辑原样保留；这里改为在主线程渲染——本站首页几乎没有其他
 * 脚本，不需要为让出主线程而引入 OffscreenCanvas 的兼容成本。
 */

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
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
`;

// ---------------------------------------------------------------- 常量
const DEFAULT_BAND_INDEX = 1;
const TARGET_SPEED = 0;
const SPEED_THRESHOLD = 5e-4;
const MOUSE_THRESHOLD = 5e-4;
const DEFAULT_MOUSE: [number, number] = [0.5, 0.4];

// D65 白点 (CIE 标准光源)
const D65_WHITE_POINT = [0.95047, 1, 1.08883];

// XYZ → 线性 sRGB 转换矩阵
const XYZ_TO_LINEAR_RGB = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.969266, 1.8760108, 0.041556],
    [0.0556434, -0.2040259, 1.0572252],
];

// ---------------------------------------------------------------- 颜色空间
function linearToSRGB(channel: number) {
    return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

function labInverseTransform(value: number) {
    return value > 0.206893 ? value * value * value : (value - 16 / 116) / 7.787;
}

/** LCH(ab) → sRGB，返回 0-1 的 RGB 三元组 */
function lchToRGB(lightness: number, chroma: number, hue: number): [number, number, number] {
    const aStar = chroma * Math.cos(hue);
    const bStar = chroma * Math.sin(hue);

    const lNorm = (lightness + 16) / 116;
    const aNorm = aStar / 500 + lNorm;
    const bNorm = lNorm - bStar / 200;

    const xyz = [
        D65_WHITE_POINT[0] * labInverseTransform(aNorm),
        D65_WHITE_POINT[1] * labInverseTransform(lNorm),
        D65_WHITE_POINT[2] * labInverseTransform(bNorm),
    ];

    const linear = XYZ_TO_LINEAR_RGB.map((row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2]);

    return [
        Math.max(0, Math.min(1, linearToSRGB(linear[0]))),
        Math.max(0, Math.min(1, linearToSRGB(linear[1]))),
        Math.max(0, Math.min(1, linearToSRGB(linear[2]))),
    ];
}

/** 暗色主题的六色渐变带 */
function generateColorBands(): number[] {
    const lightness = 15;
    const chroma = 9;
    const lightnessRange = 7;
    const startHue = 5.2;
    const hueSweep = 3;

    const colors: number[] = [];
    for (let i = 0; i < 6; i++) {
        const t = i / 6;

        let hue = startHue + t * hueSweep;
        hue = hue % (2 * Math.PI);
        if (hue < 0) hue += 2 * Math.PI;

        const bandLightness = lightness + (t - 0.5) * lightnessRange;
        const rgb = lchToRGB(bandLightness, chroma, hue);
        colors.push(rgb[0], rgb[1], rgb[2]);
    }

    return colors;
}

// ---------------------------------------------------------------- 插值
/** 指数衰减平滑插值 (Zeno 插值) */
function zenoLerp(from: number, to: number, deltaTime: number, smoothness = 5) {
    const factor = 1 - Math.exp(-smoothness * deltaTime);
    return from + factor * (to - from);
}

function zenoLerp2(from: number[], to: number[], deltaTime: number, smoothness = 5) {
    const factor = 1 - Math.exp(-smoothness * deltaTime);
    return from.map((val, i) => val + factor * (to[i] - val));
}

// ---------------------------------------------------------------- WebGL
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

    console.error("[backgroundShader] compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

function linkProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

    console.error("[backgroundShader] link error:", gl.getProgramInfoLog(program));
    return null;
}

// ---------------------------------------------------------------- 入口
/**
 * 在给定 canvas 上启动背景渲染，返回清理函数。
 * WebGL 不可用时返回一个空操作，页面会退回到 CSS 背景。
 */
export function initShaderBackground(canvas: HTMLCanvasElement): () => void {
    const gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
    });

    if (!gl) {
        console.warn("[backgroundShader] WebGL 不可用，使用 CSS 背景兜底");
        return () => void 0;
    }

    // 用默认色带清屏，避免首帧闪白
    {
        const initColors = generateColorBands();
        const base = DEFAULT_BAND_INDEX * 3;
        gl.clearColor(initColors[base], initColors[base + 1], initColors[base + 2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertexShader || !fragmentShader) return () => void 0;

    const program = linkProgram(gl, vertexShader, fragmentShader);
    if (!program) return () => void 0;

    // 全屏四边形
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
    );

    const posAttribLoc = gl.getAttribLocation(program, "a_position");
    const timeUniformLoc = gl.getUniformLocation(program, "u_time");
    const resolutionUniformLoc = gl.getUniformLocation(program, "u_resolution");
    const mouseUniformLoc = gl.getUniformLocation(program, "u_mouse");

    // 按视口尺寸设置绘制缓冲；DPR 上限 1.5，移动端再用 0.35 缩放降填充率
    const applySize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const scale = window.innerWidth < 768 ? 0.35 : 0.75;
        canvas.width = Math.max(1, Math.round(window.innerWidth * dpr * scale));
        canvas.height = Math.max(1, Math.round(window.innerHeight * dpr * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
    };
    applySize();

    let totalTime = 0;
    let lastFrameTime = performance.now();
    let currentSpeed = 0.09;
    let isAnimating = true;
    let animationFrameId: number | null = null;
    let disposed = false;

    let targetMouse = [...DEFAULT_MOUSE];
    let currentMouse = [...DEFAULT_MOUSE];

    function renderLoop() {
        if (disposed) return;

        const now = performance.now();
        const elapsed = now - lastFrameTime;
        // 标签页切回时 elapsed 会很大，钳住避免时间跳变
        const dt = Math.min(elapsed, 100) / 1000;
        lastFrameTime = now;

        currentSpeed = zenoLerp(currentSpeed, TARGET_SPEED, dt, 0.5);
        currentMouse = zenoLerp2(currentMouse, targetMouse, dt, 20);

        totalTime += Math.min(elapsed, 100) * currentSpeed;

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(posAttribLoc);
        gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(timeUniformLoc, totalTime);
        gl.uniform2f(resolutionUniformLoc, canvas.width, canvas.height);
        gl.uniform2f(mouseUniformLoc, currentMouse[0], currentMouse[1]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 收敛检测：速度足够低且鼠标已稳定就停帧，鼠标移动时再唤醒
        if (currentSpeed < SPEED_THRESHOLD) {
            const mouseConverged =
                Math.abs(currentMouse[0] - targetMouse[0]) < MOUSE_THRESHOLD &&
                Math.abs(currentMouse[1] - targetMouse[1]) < MOUSE_THRESHOLD;

            if (mouseConverged) {
                currentSpeed = 0;
                isAnimating = false;
                animationFrameId = null;
                return;
            }
        }

        animationFrameId = requestAnimationFrame(renderLoop);
    }

    const ensureAnimating = () => {
        if (!isAnimating && !disposed) {
            isAnimating = true;
            lastFrameTime = performance.now();
            renderLoop();
        }
    };

    const bumpSpeed = (multiplier = 3) => {
        currentSpeed = 0.03 * multiplier;
        ensureAnimating();
    };

    const setMouse = (x: number, y: number) => {
        targetMouse = [x, y];
        ensureAnimating();
    };

    // 桌面端：鼠标位置驱动光源，同时加速动画
    const handleResize = () => {
        applySize();
        ensureAnimating();
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        setMouse(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
        bumpSpeed(35);
    };

    const handlePointerLeave = () => setMouse(...DEFAULT_MOUSE);

    const handleVisibility = () => {
        if (document.hidden) {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            isAnimating = false;
        } else {
            ensureAnimating();
        }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    renderLoop();

    return () => {
        disposed = true;
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("pointermove", handlePointerMove);
        document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
        document.removeEventListener("visibilitychange", handleVisibility);
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    };
}
