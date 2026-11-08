// Ported from the wtrclred source (ShellWatercolorFluidBrush.ts), with
// changes from the original:
//   1. `draw()` takes a plain {x, y, pressure} point in device pixels
//      instead of reading a PointerEvent, so the brush can be driven by
//      anything -- a line sweeping left to right, a pre-programmed drawing,
//      a recorded stroke -- instead of just the pointer.
//   2. The original only stepped the simulation while splats were arriving
//      (plus a short ~1.6s settle window after the last one), so drying
//      would freeze indefinitely if input paused for longer than that.
//      Here `draw()` only splats; the caller is expected to call
//      `advance(dt)` every animation frame regardless of input, so wet
//      pigment keeps drying against real elapsed time, not mouse movement.
//   3. The original injected a velocity-field "jet" at every splat point,
//      scaled up by drag speed, which (combined with vorticity) propelled
//      wet pigment forward along the stroke for several frames afterward --
//      it read as ink being shot from the cursor rather than a brush
//      leaving paint behind it. Real brush/watercolor references (Curtis et
//      al.'s shallow-water watercolor sim, bristle-level engines like
//      WetBrush, dab-based engines like MyPaint) don't drive pigment
//      transport from cursor drag speed at all. Here that forward force is
//      drastically weakened (see `splat()`), and `draw()` deposits pigment
//      at a lagging "contact point" that trails the raw input position
//      (see `lagX`/`lagY` below) instead of depositing exactly at the tip,
//      so the brush visibly drags paint behind it.
// The engine, shaders, and every other constant are otherwise unchanged.
// Classic script (see random.js for why); uses getShellViewportSize and
// brushColorForDraw, loaded earlier in index.html.

// Whole-painting look settings (see Project.settings): `maxPigment` caps how
// strong pigment can get (lower = never gets dark), `dryFade` is how much
// pigment is lost while wet (0 = none), `spread` scales how much wet pigment
// flows outward (1 = the original behavior, 0 = stays where it was laid).
const defaultLook = { maxPigment: 0.8, dryFade: 0, spread: 0.4 };
const simulationBaseSize = 560;
const pressureIterations = 8;

function createFluidBrushLayer(options) {
  let engine;
  let triedEngine = false;
  // Per-stroke brush state (last input point, lagging contact point), keyed
  // by `point.strokeKey` so strokes that overlap in time (the editor lets
  // you drag them around a timeline) don't share lag/throttle state.
  const strokeStates = new Map();
  let sequence = 0;
  let look = { ...defaultLook };

  function resize() {
    const canvas = options.canvas();
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, options.maxDpr);
    const { width, height } = options.size?.() ?? getShellViewportSize();
    const bufferWidth = Math.max(1, Math.round(width * dpr));
    const bufferHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const activeEngine = ensureEngine();
    if (!activeEngine) return;

    activeEngine.resize(bufferWidth, bufferHeight);
    activeEngine.renderTo(canvas);
  }

  /**
   * point: { x, y } in device pixels (canvas backing-store space),
   * pressure in [0, 1], isTrusted mirrors the original's "step immediately"
   * behavior for real input -- true here too, since the line moves every frame.
   */
  function draw(point) {
    const canvas = options.canvas();
    if (!canvas || !options.isDrawingEnabled()) return;

    const activeEngine = ensureEngine();
    if (!activeEngine) return;

    // A non-move point starts a new stroke: forget the previous stroke's
    // position so it neither smears across from where the last one ended nor
    // inherits its lag.
    const strokeKey = point.strokeKey ?? 0;
    if (!point.isMove) strokeStates.delete(strokeKey);
    let state = strokeStates.get(strokeKey);
    if (!state) {
      state = { lastX: Number.NaN, lastY: Number.NaN, lastTime: 0, lagX: Number.NaN, lagY: Number.NaN };
      strokeStates.set(strokeKey, state);
    }

    const x = point.x;
    const y = point.y;
    const previousX = state.lastX;
    const previousY = state.lastY;
    const previousDrawTime = state.lastTime;
    const pressure = point.pressure > 0 ? point.pressure : 0.58;
    // `point.time` (ms) lets a caller supply a virtual clock, so replaying
    // the same strokes always lays down the same pigment.
    const now = point.time ?? performance.now();
    const deltaX = Number.isFinite(previousX) ? x - previousX : 0;
    const deltaY = Number.isFinite(previousY) ? y - previousY : 0;
    const distance = Math.hypot(deltaX, deltaY);
    const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);

    if (point.isMove && now - previousDrawTime < 14 && distance < 3 * dpr) {
      return;
    }

    const elapsedMs = previousDrawTime > 0 ? now - previousDrawTime : 0;

    state.lastX = x;
    state.lastY = y;
    state.lastTime = now;

    // Pigment deposits at a lagging "contact point" that eases toward the
    // raw input position over time, rather than exactly at it -- this is
    // what makes the brush drag paint behind its tip instead of depositing
    // right under it. A bigger brush drags more (bigger bristle contact
    // patch); a fresh stroke (no prior lag position) starts with zero lag,
    // same as a real brush touching down with no momentum yet.
    const sizeScale = point.size > 0 ? point.size : 1;
    const lagTauMs = 65 * sizeScale;
    if (!Number.isFinite(state.lagX)) {
      state.lagX = x;
      state.lagY = y;
    } else {
      const smoothing = 1 - Math.exp(-Math.max(0, elapsedMs) / lagTauMs);
      state.lagX += (x - state.lagX) * smoothing;
      state.lagY += (y - state.lagY) * smoothing;
    }

    const color = point.color ?? brushColorForDraw(sequence);
    if (!color) return;

    if (!point.color) sequence += 1;
    const fine = point.brush === "crispy";
    const base = {
      alpha: color.a,
      blue: color.b / 255,
      fine,
      green: color.g / 255,
      inkScale: point.inkScale > 0 ? point.inkScale : 1,
      pressure,
      red: color.r / 255,
      size: sizeScale,
    };

    if (point.brush === "wash" || point.brush === "bluntwash" || point.brush === "speedwash") {
      const blunt = point.brush === "bluntwash";
      // Round dabs along the path, sized only by what the brush has already
      // done (distance travelled, and for "speedwash" how fast it's moving),
      // never by where the stroke will end, so the live preview is exactly the
      // finished stroke.
      const startX = Number.isFinite(previousX) ? previousX : x;
      const startY = Number.isFinite(previousY) ? previousY : y;
      const arcStart = state.arc ?? 0;
      const segment = Math.hypot(x - startX, y - startY);
      state.arc = arcStart + segment;
      const heightPx = canvas.height;

      // Speed is measured in the stroke's own recorded time (point.t), so the
      // Speed slider and scrubbing don't change the shape. It's smoothed so
      // mouse timing noise doesn't make the width wobble.
      let factorStart = 1;
      let factorEnd = 1;
      if (point.brush === "speedwash") {
        const recorded = point.t ?? 0;
        const dtSeconds = Math.max(0.001, (recorded - (state.recordedT ?? recorded)) / 1000);
        state.recordedT = recorded;
        const instant = segment / heightPx / dtSeconds;
        const blend = 1 - Math.exp(-dtSeconds / 0.12);
        state.speed = Number.isFinite(state.speed) ? state.speed + (instant - state.speed) * blend : 0.4;
        factorStart = state.speedFactor ?? speedWidthFactor(state.speed);
        factorEnd = speedWidthFactor(state.speed);
        state.speedFactor = factorEnd;
      }

      const maxHalfWidthPx = washHalfWidth(0.3 * heightPx, 1, pressure, sizeScale, heightPx) * heightPx;
      const stepPx = Math.max(1, maxHalfWidthPx * 0.12);
      const dabs = Math.max(1, Math.ceil(segment / stepPx));
      for (let index = 1; index <= dabs; index += 1) {
        const t = index / dabs;
        const arc = arcStart + segment * t;
        activeEngine.splat({
          ...base,
          fade: 1 - 0.4 * Math.min(1, arc / (1.2 * heightPx)),
          halfWidth: washHalfWidth(arc, factorStart + (factorEnd - factorStart) * t, pressure, sizeScale, heightPx, blunt),
          wash: true,
          x: (startX + (x - startX) * t) / Math.max(1, canvas.width),
          y: 1 - (startY + (y - startY) * t) / Math.max(1, canvas.height),
        });
      }
      return;
    }

    if (!fine) {
      activeEngine.splat({
        ...base,
        deltaX: deltaX / Math.max(1, canvas.width),
        deltaY: -deltaY / Math.max(1, canvas.height),
        x: state.lagX / Math.max(1, canvas.width),
        y: 1 - state.lagY / Math.max(1, canvas.height),
      });
      return;
    }

    // Fine brush: same simulation (so it shares the watercolor's paper, glaze
    // and edge look), but it deposits at the raw tip with no lag, and fills
    // the gap since the last point with small dabs so the line is continuous.
    const radius = fineBrushRadius(pressure, sizeScale);
    const stepPx = Math.max(1, Math.sqrt(radius) * canvas.height * 0.5);
    const startX = Number.isFinite(previousX) ? previousX : x;
    const startY = Number.isFinite(previousY) ? previousY : y;
    const dabs = Math.max(1, Math.ceil(Math.hypot(x - startX, y - startY) / stepPx));
    for (let index = 1; index <= dabs; index += 1) {
      const t = index / dabs;
      activeEngine.splat({
        ...base,
        deltaX: 0,
        deltaY: 0,
        x: (startX + (x - startX) * t) / Math.max(1, canvas.width),
        y: 1 - (startY + (y - startY) * t) / Math.max(1, canvas.height),
      });
    }
  }

  /** Advances the simulation (advection, drying, pressure) by dt seconds and
   * redraws, regardless of whether anything just splatted. Call this every
   * animation frame so drying tracks real time. */
  function advance(dt, render = true) {
    const canvas = options.canvas();
    if (!canvas || !engine) return;

    engine.step(dt);
    if (render) engine.renderTo(canvas);
  }

  /** Draws the current simulation state to the canvas (after a batch of advance(dt, false)). */
  function present() {
    const canvas = options.canvas();
    if (canvas && engine) engine.renderTo(canvas);
  }

  function clear() {
    strokeStates.clear();
    const canvas = options.canvas();
    if (engine && canvas) {
      engine.clear();
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function ensureEngine() {
    if (engine || triedEngine) return engine;
    triedEngine = true;
    engine = FluidBrushEngine.create();
    if (engine) engine.look = look;
    return engine;
  }

  /** Sets the whole-painting look (see defaultLook). Call before replaying, since dryFade changes the simulation. */
  function configure(settings) {
    look = { ...defaultLook, ...settings };
    if (engine) engine.look = look;
  }

  /** Frees the WebGL context (browsers cap how many can be alive). The canvas keeps its last picture; a later resize() makes a fresh engine. */
  function dispose() {
    strokeStates.clear();
    engine?.gl.getExtension("WEBGL_lose_context")?.loseContext();
    engine = undefined;
    triedEngine = false;
  }

  return { advance, clear, configure, dispose, draw, present, resize };
}

class FluidBrushEngine {
  constructor(gl, programs) {
    this.gl = gl;
    this.look = { ...defaultLook };
    this.canvas = gl.canvas;
    this.programs = programs;
    this.textureFilter = gl.getExtension("OES_texture_float_linear") ? gl.LINEAR : gl.NEAREST;
    this.width = 1;
    this.height = 1;
    const vertexArray = gl.createVertexArray();
    if (!vertexArray) throw new Error("WebGL vertex array creation failed.");
    this.vertexArray = vertexArray;
    gl.bindVertexArray(vertexArray);
    this.velocity = this.createBuffer();
    this.wet = this.createBuffer();
    this.dry = this.createBuffer();
    this.pressure = this.createBuffer();
    const curlTarget = this.createTarget();
    this.curl = curlTarget.framebuffer;
    this.curlTexture = curlTarget.texture;
    const divergenceTarget = this.createTarget();
    this.divergence = divergenceTarget.framebuffer;
    this.divergenceTexture = divergenceTarget.texture;
    this.displayTexture = this.createTexture();
  }

  static create() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false,
    });

    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return undefined;

    try {
      return new FluidBrushEngine(gl, buildPrograms(gl));
    } catch (error) {
      console.warn("Watercolor fluid brush disabled:", error);
      return undefined;
    }
  }

  resize(canvasWidth, canvasHeight) {
    const aspect = canvasWidth / Math.max(1, canvasHeight);
    const simWidth = Math.max(96, Math.round(simulationBaseSize * Math.min(1.35, Math.max(1, aspect))));
    const simHeight = Math.max(96, Math.round(simWidth / Math.max(0.45, aspect)));

    if (this.width === simWidth && this.height === simHeight) return;

    this.width = simWidth;
    this.height = simHeight;
    this.canvas.width = simWidth;
    this.canvas.height = simHeight;
    this.resizeBuffer(this.velocity);
    this.resizeBuffer(this.wet);
    this.resizeBuffer(this.dry);
    this.resizeBuffer(this.pressure);
    this.resizeTarget(this.curlTexture, this.curl);
    this.resizeTarget(this.divergenceTexture, this.divergence);
    this.resizeTexture(this.displayTexture);
    this.clear();
  }

  splat(stroke) {
    if (stroke.wash) {
      // Wash brush: one broad flat dab across the stroke direction, with a
      // ragged edge from the shader's noise. No velocity, so it stays put.
      const opacity = Math.min(0.5, 0.2 + stroke.alpha * 3.8) * (stroke.inkScale > 0 ? stroke.inkScale : 1) * 5 * stroke.fade;
      // It goes straight into the dry layer: the wet layer's drying makes each
      // frame's batch of dabs dry differently, which shows as stripes across a
      // wide stroke.
      this.splatBuffer(
        this.dry,
        stroke.x,
        stroke.y,
        (1 - stroke.red) * opacity,
        (1 - stroke.green) * opacity,
        (1 - stroke.blue) * opacity,
        0,
        0,
        3,
        0,
        0,
        stroke.halfWidth,
      );
      return;
    }

    if (stroke.fine) {
      // Fine brush: one small flat-topped dab of pigment, and nothing else.
      // No velocity jet and no bloom ring, so nothing pushes the pigment
      // around and it stays where the tip put it.
      const opacity = Math.min(0.5, 0.2 + stroke.alpha * 3.8 + stroke.pressure * 0.05) * (stroke.inkScale > 0 ? stroke.inkScale : 1) * 0.6;
      this.splatBuffer(
        this.wet,
        stroke.x,
        stroke.y,
        (1 - stroke.red) * opacity,
        (1 - stroke.green) * opacity,
        (1 - stroke.blue) * opacity,
        opacity,
        fineBrushRadius(stroke.pressure, stroke.size),
        2,
        1,
        0,
      );
      return;
    }

    const speed = Math.hypot(stroke.deltaX, stroke.deltaY);
    const directionX = speed > 0.00001 ? stroke.deltaX / speed : 1;
    const directionY = speed > 0.00001 ? stroke.deltaY / speed : 0;
    const sizeScale = stroke.size > 0 ? stroke.size : 1;
    const radius = (0.00018 + stroke.pressure * 0.00034) * sizeScale * sizeScale;
    // Deliberately weak: this used to scale up to 46 with drag speed, which
    // (via advection + vorticity below) kept shoving already-deposited wet
    // pigment further along the stroke for several frames afterward -- it
    // read as ink being shot forward from the cursor rather than a brush
    // dragging paint behind it. A real brush doesn't work that way (see
    // fluid.js header comment), so this is now just a faint nudge.
    const spread = this.look.spread;
    const force = Math.min(10, 2 + speed * 420) * spread;
    // The 0.18 floor means every splat deposits fairly strong pigment
    // regardless of color alpha, by design (so one mouse stroke reads
    // clearly). inkScale is a separate multiplier for turning that down.
    const inkScale = stroke.inkScale > 0 ? stroke.inkScale : 1;
    const opacity = Math.min(0.42, 0.18 + stroke.alpha * 3.8 + stroke.pressure * 0.045) * inkScale;

    this.splatBuffer(this.velocity, stroke.x, stroke.y, directionX * force, directionY * force, 0, 1, radius * 1.05, 0, directionX, directionY);
    this.splatBuffer(
      this.wet,
      stroke.x,
      stroke.y,
      (1 - stroke.red) * opacity,
      (1 - stroke.green) * opacity,
      (1 - stroke.blue) * opacity,
      opacity,
      radius,
      speed > 0.0009 ? 1 : 0,
      directionX,
      directionY,
    );

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const offset = Math.sqrt(radius) * 0.42;
      const bloomX = clamp01(stroke.x + Math.cos(angle) * offset);
      const bloomY = clamp01(stroke.y + Math.sin(angle) * offset);
      this.splatBuffer(this.velocity, bloomX, bloomY, Math.cos(angle) * 12 * spread, Math.sin(angle) * 12 * spread, 0, 1, radius * 0.62, 0, Math.cos(angle), Math.sin(angle));
    }
  }

  step(dt) {
    this.run("curl", this.curl, { uVelocity: this.velocity.readTexture });
    this.run("vorticity", this.velocity.write, { dt, strength: 9 * this.look.spread, uCurl: this.curlTexture, uVelocity: this.velocity.readTexture });
    this.swap(this.velocity);

    this.run("advect", this.velocity.write, { dissipation: 1 - 0.014 * (2 - Math.min(1, this.look.spread)), dt, uSource: this.velocity.readTexture, uVelocity: this.velocity.readTexture });
    this.swap(this.velocity);
    this.applyBoundary(this.velocity, -1);

    // Wet pigment used to lose 0.2% per step (about 11% per second), so a
    // stroke could fade by half before it finished drying. `dryFade` (0..1)
    // scales that loss; 0 keeps all the pigment.
    this.run("advect", this.wet.write, { dissipation: 1 - 0.002 * this.look.dryFade, dt, uSource: this.wet.readTexture, uVelocity: this.velocity.readTexture });
    this.swap(this.wet);
    this.applyBoundary(this.wet, 0);

    this.run("dryAccum", this.dry.write, { dryCap: 1.65, dryRate: 0.34, dt, thicknessK: 7, uDry: this.dry.readTexture, uWet: this.wet.readTexture });
    this.swap(this.dry);
    this.run("dryWet", this.wet.write, { dryRate: 0.34, dt, thicknessK: 7, uWet: this.wet.readTexture });
    this.swap(this.wet);

    this.run("divergence", this.divergence, { uVelocity: this.velocity.readTexture });
    this.clearTarget(this.pressure.read);

    for (let index = 0; index < pressureIterations; index += 1) {
      this.run("pressure", this.pressure.write, { uDivergence: this.divergenceTexture, uPressure: this.pressure.readTexture });
      this.swap(this.pressure);
      this.applyBoundary(this.pressure, 1);
    }

    this.run("gradient", this.velocity.write, { uPressure: this.pressure.readTexture, uVelocity: this.velocity.readTexture });
    this.swap(this.velocity);
    this.applyBoundary(this.velocity, -1);
  }

  renderTo(canvas) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.use("display", { uDry: this.dry.readTexture, uMaxPigment: this.look.maxPigment, uWet: this.wet.readTexture });
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.canvas, 0, 0, canvas.width, canvas.height);
  }

  clear() {
    this.clearBuffer(this.velocity);
    this.clearBuffer(this.wet);
    this.clearBuffer(this.dry);
    this.clearBuffer(this.pressure);
    this.clearTarget(this.curl);
    this.clearTarget(this.divergence);
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  applyBoundary(buffer, scale) {
    this.run("boundary", buffer.write, { scale, uTarget: buffer.readTexture });
    this.swap(buffer);
  }

  clearBuffer(buffer) {
    this.clearTarget(buffer.read);
    this.clearTarget(buffer.write);
  }

  clearTarget(framebuffer) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  createBuffer() {
    const read = this.createTarget();
    const write = this.createTarget();
    return { read: read.framebuffer, readTexture: read.texture, write: write.framebuffer, writeTexture: write.texture };
  }

  createTarget() {
    const gl = this.gl;
    const texture = this.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error("WebGL framebuffer creation failed.");
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { framebuffer, texture };
  }

  createTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("WebGL texture creation failed.");

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.textureFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.textureFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  resizeBuffer(buffer) {
    this.resizeTarget(buffer.readTexture, buffer.read);
    this.resizeTarget(buffer.writeTexture, buffer.write);
  }

  resizeTarget(texture, framebuffer) {
    this.resizeTexture(texture);
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  resizeTexture(texture) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  }

  run(programName, framebuffer, uniforms) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    this.use(programName, uniforms);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  splatBuffer(buffer, x, y, red, green, blue, alpha, radius, shape, directionX, directionY, width = 0) {
    this.run("splat", buffer.write, {
      uWidth: width,
      uAspect: this.width / Math.max(1, this.height),
      uColorA: alpha,
      uColorB: blue,
      uColorG: green,
      uColorR: red,
      uDirX: directionX,
      uDirY: directionY,
      uPointX: x,
      uPointY: y,
      uRadius: radius,
      uShape: shape,
      uTarget: buffer.readTexture,
    });
    this.swap(buffer);
  }

  swap(buffer) {
    [buffer.read, buffer.write] = [buffer.write, buffer.read];
    [buffer.readTexture, buffer.writeTexture] = [buffer.writeTexture, buffer.readTexture];
  }

  use(programName, uniforms) {
    const gl = this.gl;
    const program = this.programs[programName];
    gl.useProgram(program);
    gl.bindVertexArray(this.vertexArray);
    gl.uniform2f(gl.getUniformLocation(program, "uTexelSize"), 1 / this.width, 1 / this.height);

    let textureUnit = 0;
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (!location) continue;

      if (typeof value === "number") {
        gl.uniform1f(location, value);
        continue;
      }

      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, value);
      gl.uniform1i(location, textureUnit);
      textureUnit += 1;
    }
  }
}

function buildPrograms(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, fluidVertexShader);
  return {
    advect: createProgram(gl, vertexShader, advectShader),
    boundary: createProgram(gl, vertexShader, boundaryShader),
    curl: createProgram(gl, vertexShader, curlShader),
    display: createProgram(gl, vertexShader, displayShader),
    divergence: createProgram(gl, vertexShader, divergenceShader),
    dryAccum: createProgram(gl, vertexShader, dryAccumShader),
    dryWet: createProgram(gl, vertexShader, dryWetShader),
    gradient: createProgram(gl, vertexShader, gradientShader),
    pressure: createProgram(gl, vertexShader, pressureShader),
    splat: createProgram(gl, vertexShader, splatShader),
    vorticity: createProgram(gl, vertexShader, vorticityShader),
  };
}

function createProgram(gl, vertexShader, fragmentSource) {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL program creation failed.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "WebGL program link failed.");
  }

  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader creation failed.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "WebGL shader compile failed.");
  }

  return shader;
}

/** Dab radius (same units as the watercolor `radius` in splat()) for the fine brush: roughly a tenth of the watercolor's area. */
function fineBrushRadius(pressure, size) {
  return (0.00002 + pressure * 0.00004) * size;
}

/**
 * Half-width (in canvas-height fractions) of the wash brushes after `arc`
 * pixels of travel. It rises from a point to full width over a fixed distance
 * and thins slowly; `speedFactor` (1 for the plain wash) scales it.
 */
function washHalfWidth(arc, speedFactor, pressure, size, heightPx, blunt = false) {
  // A blunt start skips the rise, so the stroke begins at full width.
  const rise = blunt ? 1 : Math.pow(Math.min(1, arc / (0.2 * heightPx)), 0.85);
  const decay = 1 - 0.15 * Math.min(1, arc / (0.8 * heightPx));
  return 0.07 * size * (0.8 + pressure * 0.35) * rise * decay * speedFactor;
}

/** Width multiplier for the speed wash: slow is wide, a fast flick thins toward a point. `speed` is in canvas heights per second. */
function speedWidthFactor(speed) {
  return Math.min(1.15, 1.3 / (1 + Math.pow(speed / 0.8, 1.8)));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const fluidVertexShader = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fluidHeader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uTexelSize;
vec4 sampleLeft(sampler2D tex) { return texture(tex, vUv - vec2(uTexelSize.x, 0.0)); }
vec4 sampleRight(sampler2D tex) { return texture(tex, vUv + vec2(uTexelSize.x, 0.0)); }
vec4 sampleBottom(sampler2D tex) { return texture(tex, vUv - vec2(0.0, uTexelSize.y)); }
vec4 sampleTop(sampler2D tex) { return texture(tex, vUv + vec2(0.0, uTexelSize.y)); }
`;

const advectShader = `${fluidHeader}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float dt;
uniform float dissipation;
void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 coord = vUv - dt * vel * uTexelSize;
  outColor = dissipation * texture(uSource, coord);
}
`;

const divergenceShader = `${fluidHeader}
uniform sampler2D uVelocity;
void main() {
  vec4 left = sampleLeft(uVelocity);
  vec4 right = sampleRight(uVelocity);
  vec4 bottom = sampleBottom(uVelocity);
  vec4 top = sampleTop(uVelocity);
  outColor = vec4(0.5 * (right.x - left.x + top.y - bottom.y), 0.0, 0.0, 1.0);
}
`;

const pressureShader = `${fluidHeader}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  vec4 left = sampleLeft(uPressure);
  vec4 right = sampleRight(uPressure);
  vec4 bottom = sampleBottom(uPressure);
  vec4 top = sampleTop(uPressure);
  float div = texture(uDivergence, vUv).x;
  outColor = vec4((left.x + right.x + bottom.x + top.x - div) * 0.25, 0.0, 0.0, 1.0);
}
`;

const gradientShader = `${fluidHeader}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  vec4 left = sampleLeft(uPressure);
  vec4 right = sampleRight(uPressure);
  vec4 bottom = sampleBottom(uPressure);
  vec4 top = sampleTop(uPressure);
  vec2 vel = texture(uVelocity, vUv).xy;
  outColor = vec4(vel - 0.5 * vec2(right.x - left.x, top.x - bottom.x), 0.0, 1.0);
}
`;

const curlShader = `${fluidHeader}
uniform sampler2D uVelocity;
void main() {
  vec4 left = sampleLeft(uVelocity);
  vec4 right = sampleRight(uVelocity);
  vec4 bottom = sampleBottom(uVelocity);
  vec4 top = sampleTop(uVelocity);
  outColor = vec4(0.5 * (right.y - left.y - (top.x - bottom.x)), 0.0, 0.0, 1.0);
}
`;

const vorticityShader = `${fluidHeader}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float dt;
uniform float strength;
void main() {
  vec4 left = sampleLeft(uCurl);
  vec4 right = sampleRight(uCurl);
  vec4 bottom = sampleBottom(uCurl);
  vec4 top = sampleTop(uCurl);
  float center = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top.x) - abs(bottom.x), abs(right.x) - abs(left.x));
  force /= length(force) + 0.0001;
  force *= strength * center * vec2(1.0, -1.0);
  vec2 vel = texture(uVelocity, vUv).xy;
  outColor = vec4(vel + force * dt, 0.0, 1.0);
}
`;

const boundaryShader = `${fluidHeader}
uniform sampler2D uTarget;
uniform float scale;
void main() {
  vec2 uv = vUv;
  vec4 data = texture(uTarget, uv);
  if (uv.x < uTexelSize.x) data = scale * texture(uTarget, uv + vec2(uTexelSize.x, 0.0));
  if (uv.x > 1.0 - uTexelSize.x) data = scale * texture(uTarget, uv - vec2(uTexelSize.x, 0.0));
  if (uv.y < uTexelSize.y) data = scale * texture(uTarget, uv + vec2(0.0, uTexelSize.y));
  if (uv.y > 1.0 - uTexelSize.y) data = scale * texture(uTarget, uv - vec2(0.0, uTexelSize.y));
  outColor = data;
}
`;

const splatShader = `${fluidHeader}
uniform sampler2D uTarget;
uniform float uAspect;
uniform float uColorA;
uniform float uColorB;
uniform float uColorG;
uniform float uColorR;
uniform float uDirX;
uniform float uDirY;
uniform float uPointX;
uniform float uPointY;
uniform float uRadius;
uniform float uShape;
uniform float uWidth;
float hash21(vec2 q) {
  return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453);
}
float valueNoise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 p = vUv - vec2(uPointX, uPointY);
  p.x *= uAspect;
  if (uShape > 2.5) {
    // Wash dab: a round disc of radius uWidth with a torn edge. Blended over
    // the existing pigment rather than added, so overlapping dabs can't build
    // up stripes.
    float dist = length(p) / max(uWidth, 0.00001);
    // Noise keyed to the pixel's place on the canvas, so overlapping dabs
    // agree on where the torn edge is.
    vec2 q = vUv * vec2(uAspect, 1.0);
    float rough = valueNoise(q * 60.0) * 0.6 + valueNoise(q * 170.0) * 0.4 - 0.5;
    float body = 1.0 - smoothstep(0.82, 1.0, dist + rough * 0.4);
    // Soft mottling inside the wash, as pigment settles unevenly.
    float mottle = 0.85 + 0.3 * valueNoise(q * 14.0 + 7.0);
    // Newer paint replaces what is underneath (weighted by the dab's body), so
    // a later, lighter dab covers an earlier, darker one instead of hiding
    // under it. The mottle and edge noise are keyed to canvas position, so
    // overlapping dabs of one stroke agree and don't build up stripes.
    outColor = mix(texture(uTarget, vUv), mottle * vec4(uColorR, uColorG, uColorB, uColorA), body);
    return;
  }
  if (uShape > 0.5 && uShape < 1.5) {
    vec2 d = normalize(vec2(uDirX, uDirY) + vec2(0.0001));
    vec2 perp = vec2(-d.y, d.x);
    float along = dot(p, d);
    float across = dot(p, perp);
    p = vec2(along * 0.48, across * 1.42);
  }
  float m = exp(-dot(p, p) / uRadius);
  // Shape 2 is the fine brush's flat-topped dab: full strength across most of
  // its width, then a quick falloff, so lines have a defined edge.
  if (uShape > 1.5) m = exp(-pow(dot(p, p) / uRadius, 2.0));
  vec4 base = texture(uTarget, vUv);
  outColor = base + m * vec4(uColorR, uColorG, uColorB, uColorA);
}
`;

const dryWetShader = `${fluidHeader}
uniform sampler2D uWet;
uniform float dryRate;
uniform float dt;
uniform float thicknessK;
void main() {
  vec4 w = texture(uWet, vUv);
  float wet0 = clamp(w.a, 0.0, 1.0);
  float density = max(max(w.r, w.g), w.b);
  float thicknessFactor = 1.0 / (1.0 + density * thicknessK);
  float wet1 = max(wet0 - dryRate * thicknessFactor * dt, 0.0);
  float keep = wet0 > 0.0001 ? wet1 / wet0 : 0.0;
  outColor = vec4(w.rgb * keep, wet1);
}
`;

const dryAccumShader = `${fluidHeader}
uniform sampler2D uWet;
uniform sampler2D uDry;
uniform float dryRate;
uniform float dt;
uniform float thicknessK;
uniform float dryCap;
void main() {
  vec4 w = texture(uWet, vUv);
  vec4 d = texture(uDry, vUv);
  float wet0 = clamp(w.a, 0.0, 1.0);
  float density = max(max(w.r, w.g), w.b);
  float thicknessFactor = 1.0 / (1.0 + density * thicknessK);
  float dried = min(dryRate * thicknessFactor * dt, wet0);
  float frac = wet0 > 0.0001 ? dried / wet0 : 0.0;
  vec3 transfer = w.rgb * frac * 1.015;
  float coverage = 1.0 - exp(-density * 1.8);
  vec3 headroom = max(vec3(dryCap) - d.rgb, vec3(0.0));
  vec3 added = d.rgb + min(transfer, headroom);
  vec3 replaced = mix(d.rgb, w.rgb, frac);
  outColor = vec4(mix(added, replaced, coverage), min(d.a + dried, 4.0));
}
`;

const displayShader = `${fluidHeader}
uniform sampler2D uWet;
uniform sampler2D uDry;
uniform float uMaxPigment;
// Soft ceiling on the strongest channel's pigment density, applied to all
// three channels by the same factor so the hue is kept. Without it, pigment
// that piles up where the brush lingers darkens every channel toward black;
// with it, it just stops getting stronger at a saturated version of the color.
vec3 capPigment(vec3 d) {
  float m = max(max(d.r, d.g), d.b);
  if (m < 0.00001) return d;
  float capped = m / pow(1.0 + pow(m / uMaxPigment, 4.0), 0.25);
  return d * (capped / m);
}
void main() {
  vec4 wet = texture(uWet, vUv);
  vec4 dry = texture(uDry, vUv);
  vec3 wetPigment = capPigment(wet.rgb);
  vec3 dryPigment = capPigment(dry.rgb);
  vec3 paper = vec3(0.96, 0.945, 0.92);
  vec3 afterDry = paper * exp(-dryPigment * 2.2);
  vec3 wetColor = paper * exp(-wetPigment * 2.2);
  vec3 glazed = afterDry * exp(-wetPigment * 2.2);
  float wetDensity = max(max(wet.r, wet.g), wet.b);
  float dryDensity = max(max(dry.r, dry.g), dry.b);
  float coverage = 1.0 - exp(-wetDensity * 1.8);
  vec3 color = mix(glazed, wetColor, coverage);
  float wetAmt = clamp(wet.a, 0.0, 1.0);
  color *= mix(vec3(1.0), vec3(0.96, 0.98, 1.04), wetAmt);
  float grain = fract(sin(dot(vUv * 800.0, vec2(12.9898, 78.233))) * 43758.5453);
  float tooth = fract(sin(dot(vUv * 1150.0, vec2(29.171, 43.813))) * 24634.6345);
  color *= 0.975 + 0.045 * grain;
  float density = max(wetDensity, dryDensity);
  float edge = smoothstep(0.002, 0.018, length(vec2(dFdx(density), dFdy(density))));
  color *= 1.0 - edge * (0.1 + tooth * 0.09);
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = clamp(mix(vec3(luminance), color, 1.36), vec3(0.0), vec3(1.0));
  float alpha = clamp(density * 1.15 + wetAmt * 0.18 + edge * 0.12, 0.0, 0.62);
  outColor = vec4(color, alpha);
}
`;
