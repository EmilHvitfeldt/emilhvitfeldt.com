// The editor: wires the left panel, the stage, the transport and the
// timeline to a Project (project.js) rendered by a Player (player.js).
// Classic script (see random.js for why): createFluidBrushLayer,
// renderPaperFallback, initializePaperShader, the viewport helpers, Project,
// Player, TraceOverlay, TimelineView and penColors all come
// from scripts loaded earlier in index.html.

const maxDpr = 1.25;
// Room after the last stroke to watch the pigment keep drying.
const MIN_LENGTH_MS = 4000;

const $ = (id) => document.getElementById(id);

const stage = $("stage");
const fallbackLayerElement = $("fallback-layer");
const fallbackCanvasElement = $("fallback-canvas");
const paperCanvasElement = $("paper-canvas");
const brushCanvasElement = $("brush-canvas");
const uiCanvas = $("ui-canvas");
const stageMessage = $("stage-message");

// Layers size themselves to the stage, not the window.
setShellViewportElement(stage);

const project = new Project();
const brushLayer = createFluidBrushLayer({
  canvas: () => brushCanvasElement,
  isDrawingEnabled: () => true,
  maxDpr,
});
const player = new Player({ project, brushLayer, canvas: brushCanvasElement });
const overlay = new TraceOverlay({
  image: $("trace-image"),
  stage,
  onChange: () => syncImageControls(),
});

// New strokes use these. They also follow the last brush edit, so picking a
// color for a selected stroke is the color you draw with next.
const defaults = { color: { ...penColors.find((c) => c.name === "Red 400") }, brush: "wash", size: 1, inkScale: 0.4 };

let tool = "draw";
let selectedId = null;
let playing = false;
let drawing = false;
let scrubbing = false;
let pendingSeek = null;
let rate = 1;
let loop = false;
let gesture = null;
let lastFrameTime = 0;
let messageTimer = 0;

const selected = () => (selectedId === null ? undefined : project.get(selectedId));
/** Every selected stroke: the primary one plus anything shift-clicked into the timeline group. */
const selectedStrokes = () => {
  if (selectedId === null) return [];
  const ids = new Set([selectedId, ...timeline.group]);
  return project.strokes.filter((stroke) => ids.has(stroke.id));
};
const lengthMs = () => Math.max(project.endMs + project.settings.tailMs, MIN_LENGTH_MS);
const playheadMs = () => pendingSeek ?? player.nowMs;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function showMessage(text, duration = 2600) {
  stageMessage.textContent = text;
  stageMessage.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    stageMessage.hidden = true;
  }, duration);
}

// -- Timeline ----------------------------------------------------------------

const timeline = new TimelineView({
  root: $("timeline"),
  project,
  getLengthMs: lengthMs,
  getPlayheadMs: playheadMs,
  getSelectedId: () => selectedId,
  onSelect: (id) => selectStroke(id),
  onScrub: (ms) => {
    scrubbing = true;
    pendingSeek = ms;
  },
  onScrubEnd: () => {
    scrubbing = false;
  },
});

// -- Selection, inspector ----------------------------------------------------

function selectStroke(id) {
  selectedId = id;
  refreshAll();
}

function refreshAll() {
  if (selectedId !== null && !project.get(selectedId)) selectedId = null;
  syncInspector();
  timeline.render();
  syncTimeScope();
  drawUi();
  $("undo").disabled = !project.canUndo;
  $("redo").disabled = !project.canRedo;
}

project.subscribe((kind) => {
  if (kind === "edit") player.invalidate();
  refreshAll();
});

const brushHeading = $("brush-heading");
const brushHint = $("brush-hint");
const paletteElement = $("palette");
const sizeSlider = $("size-slider");
const inkSlider = $("ink-slider");
const speedSlider = $("speed-slider");
const startInput = $("start-input");
const brushTypeButtons = document.querySelectorAll("#brush-types button");

function sameColor(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

function syncInspector() {
  const stroke = selected();
  const source = stroke ?? defaults;

  if (stroke) {
    const count = selectedStrokes().length;
    brushHeading.textContent = count > 1 ? `${count} strokes` : `Stroke ${project.strokes.indexOf(stroke) + 1}`;
    brushHint.textContent = count > 1 ? "Changes apply to every selected stroke." : "Changes apply to this stroke. Click empty canvas to deselect.";
  } else {
    brushHeading.textContent = "Brush";
    brushHint.textContent = "Applies to new strokes. Use Select to pick a stroke and edit it.";
  }

  for (const swatch of paletteElement.children) {
    const color = penColors[Number(swatch.dataset.index)];
    swatch.setAttribute("aria-pressed", String(sameColor(color, source.color)));
  }
  const brushType = source.brush ?? "watercolor";
  for (const button of brushTypeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.brush === brushType));
  }
  sizeSlider.value = String(source.size);
  $("size-output").textContent = source.size.toFixed(2);
  inkSlider.value = String(source.inkScale);
  $("ink-output").textContent = source.inkScale.toFixed(2);

  syncPaintSettings();
  $("stroke-extras").hidden = !stroke;
  const pointCount = selectedStrokes().reduce((sum, item) => sum + item.points.length, 0);
  $("show-points-label").textContent = `Show every point (${pointCount})`;
  if (stroke) {
    if (document.activeElement !== startInput) startInput.value = (stroke.start / 1000).toFixed(2);
    speedSlider.value = String(stroke.speed);
    $("speed-output").textContent = `${stroke.speed.toFixed(2)}x`;
  }
}

/** Applies a brush change to the selected stroke if there is one, and always to the defaults. */
function setBrush(patch, key) {
  Object.assign(defaults, structuredClone(patch));
  const strokes = selectedStrokes();
  if (strokes.length > 0) {
    project.checkpoint(key);
    for (const stroke of strokes) project.update(stroke.id, structuredClone(patch), { silent: true });
    project.emit("edit");
  } else {
    syncInspector();
  }
}

penColors.forEach((color, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swatch";
  button.dataset.index = String(index);
  button.style.background = `rgb(${color.r}, ${color.g}, ${color.b})`;
  button.setAttribute("aria-label", color.name);
  button.title = color.name;
  button.addEventListener("click", () => setBrush({ color: { ...color } }, "color"));
  paletteElement.appendChild(button);
});

const maxPigmentSlider = $("max-pigment-slider");
const dryFadeSlider = $("dry-fade-slider");

function syncPaintSettings() {
  maxPigmentSlider.value = String(project.settings.maxPigment);
  $("max-pigment-output").textContent = project.settings.maxPigment.toFixed(2);
  dryFadeSlider.value = String(project.settings.dryFade);
  $("dry-fade-output").textContent = project.settings.dryFade.toFixed(2);
  $("spread-slider").value = String(project.settings.spread);
  $("spread-output").textContent = project.settings.spread.toFixed(2);
  $("tail-slider").value = String(project.settings.tailMs / 1000);
  $("tail-output").textContent = `${(project.settings.tailMs / 1000).toFixed(1)}s`;
}

/** These change the whole painting (dryFade even changes the simulation), so they re-render from the strokes. */
function setPaintSetting(patch) {
  Object.assign(project.settings, patch);
  syncPaintSettings();
  project.emit("edit");
}

maxPigmentSlider.addEventListener("input", () => setPaintSetting({ maxPigment: Number(maxPigmentSlider.value) }));
dryFadeSlider.addEventListener("input", () => setPaintSetting({ dryFade: Number(dryFadeSlider.value) }));
$("spread-slider").addEventListener("input", (event) => setPaintSetting({ spread: Number(event.target.value) }));

// Only the timeline length changes, not the painting, so no re-render.
$("tail-slider").addEventListener("input", (event) => {
  project.settings.tailMs = Number(event.target.value) * 1000;
  syncPaintSettings();
  project.emit("layout");
});
syncPaintSettings();

for (const button of brushTypeButtons) {
  button.addEventListener("click", () => setBrush({ brush: button.dataset.brush }, "brush"));
}

sizeSlider.addEventListener("input", () => setBrush({ size: Number(sizeSlider.value) }, "size"));
inkSlider.addEventListener("input", () => setBrush({ inkScale: Number(inkSlider.value) }, "ink"));

speedSlider.addEventListener("input", () => {
  const strokes = selectedStrokes();
  if (strokes.length === 0) return;
  project.checkpoint("speed");
  for (const stroke of strokes) project.update(stroke.id, { speed: Number(speedSlider.value) }, { silent: true });
  project.emit("edit");
});

startInput.addEventListener("change", () => {
  const stroke = selected();
  const seconds = Number(startInput.value);
  if (!stroke || !Number.isFinite(seconds)) return;
  project.checkpoint();
  project.update(stroke.id, { start: Math.max(0, seconds * 1000) });
});

$("duplicate-stroke").addEventListener("click", () => {
  const strokes = selectedStrokes();
  if (strokes.length === 0) return;
  // The copies land right after the originals, keeping their spacing.
  const offset = Math.max(...strokes.map((stroke) => Project.strokeEnd(stroke))) - Math.min(...strokes.map((stroke) => stroke.start));
  project.checkpoint();
  const copies = strokes.map((stroke) => {
    const copy = structuredClone(stroke);
    copy.id = undefined;
    copy.start = stroke.start + offset;
    return project.add(copy, { silent: true });
  });
  project.emit("edit");
  selectStroke(copies[0].id);
});

// -- Reshaping recorded strokes (the maths is in stroke-ops.js) --------------

/**
 * Runs `compute(stroke)` on every selected stroke and applies the patches it
 * returns as one undo step. A null patch means "nothing to change here".
 */
function editSelected(compute, key) {
  const edits = selectedStrokes()
    .map((stroke) => [stroke, compute(stroke)])
    .filter(([, patch]) => patch);
  if (edits.length === 0) return false;
  project.checkpoint(key);
  for (const [stroke, patch] of edits) project.update(stroke.id, patch, { silent: true });
  project.emit("edit");
  return true;
}

function splitSelected() {
  const ms = playheadMs();
  const cuts = selectedStrokes()
    .map((stroke) => [stroke, StrokeOps.split(stroke, ms)])
    .filter(([, cut]) => cut);
  if (cuts.length === 0) {
    showMessage("Move the playhead inside a selected stroke to split it.");
    return;
  }
  project.checkpoint();
  for (const [stroke, cut] of cuts) {
    project.update(stroke.id, cut.first, { silent: true });
    project.add(cut.second, { silent: true, after: stroke.id });
  }
  project.emit("edit");
}

function trimSelected(side) {
  const ms = playheadMs();
  const changed = editSelected((stroke) => (side === "start" ? StrokeOps.trim(stroke, ms) : StrokeOps.trim(stroke, -Infinity, ms)));
  if (!changed) showMessage("Move the playhead inside a selected stroke to trim it.");
}

$("split-stroke").addEventListener("click", splitSelected);
$("trim-start").addEventListener("click", () => trimSelected("start"));
$("trim-end").addEventListener("click", () => trimSelected("end"));

const notChanged = (changed) => {
  if (!changed) showMessage("Nothing to change.");
};
$("show-points").addEventListener("change", () => drawUi());
$("smooth-stroke").addEventListener("click", () =>
  notChanged(editSelected((stroke) => {
    const points = StrokeOps.smooth(stroke.points, 2);
    return points && { points };
  })),
);
$("flatten-pressure").addEventListener("click", () =>
  notChanged(editSelected((stroke) => ({ points: StrokeOps.pressure(stroke.points, { flatten: 1 }) }))),
);
$("bake-speed").addEventListener("click", () => notChanged(editSelected((stroke) => StrokeOps.bakeSpeed(stroke))));

/**
 * A slider that edits relative to where the stroke was when the drag began,
 * then springs back to neutral on release. That way every drag is one undo
 * step and the same slider can be used again on the result.
 */
function bindLiveEdit(id, neutral, format, apply) {
  const slider = $(id);
  const output = $(id.replace("-slider", "-output"));
  let base = null;
  output.textContent = format(neutral);

  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    output.textContent = format(value);
    if (!base) {
      const strokes = selectedStrokes();
      if (strokes.length === 0) return;
      base = {
        strokes: strokes.map((stroke) => ({ id: stroke.id, points: structuredClone(stroke.points) })),
        center: StrokeOps.center(strokes.flatMap((stroke) => stroke.points)),
      };
      project.checkpoint();
    }
    for (const { id: strokeId, points } of base.strokes) {
      project.update(strokeId, { points: apply(points, value, base.center) }, { silent: true });
    }
    project.emit("edit");
  });
  slider.addEventListener("change", () => {
    base = null;
    slider.value = String(neutral);
    output.textContent = format(neutral);
  });
}

const stageSize = () => ({ width: stage.clientWidth, height: stage.clientHeight });
bindLiveEdit("scale-slider", 1, (value) => `${value.toFixed(2)}x`, (points, value, center) =>
  StrokeOps.transform(points, { cx: center.x, cy: center.y, scale: value, ...stageSize() }),
);
bindLiveEdit("rotate-slider", 0, (value) => `${Math.round(value)}°`, (points, value, center) =>
  StrokeOps.transform(points, { cx: center.x, cy: center.y, degrees: value, ...stageSize() }),
);
// The value is a tolerance in px: points that stray less than that from the straight line between their neighbors are dropped.
bindLiveEdit("simplify-slider", 0, (value) => (value === 0 ? "Off" : `${value.toFixed(2)}px`), (points, value) =>
  value === 0 ? points : (StrokeOps.simplify(points, value, stage.clientWidth, stage.clientHeight) ?? points),
);
bindLiveEdit("ease-slider", 0, (value) => value.toFixed(2), (points, value) => StrokeOps.ease(points, value) ?? points);
bindLiveEdit("pressure-slider", 1, (value) => `${value.toFixed(2)}x`, (points, value) => StrokeOps.pressure(points, { scale: value }));

function deleteSelected() {
  const stroke = selected();
  if (!stroke) return;
  const ids = new Set([stroke.id, ...timeline.group]);
  project.checkpoint();
  selectedId = null;
  for (const id of ids) project.remove(id);
}

$("delete-stroke").addEventListener("click", deleteSelected);

// -- Selection overlay drawn on top of the canvas ----------------------------

function drawUi(dragOffset = { x: 0, y: 0 }) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (uiCanvas.width !== Math.round(width * dpr) || uiCanvas.height !== Math.round(height * dpr)) {
    uiCanvas.width = Math.round(width * dpr);
    uiCanvas.height = Math.round(height * dpr);
  }

  const context = uiCanvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const strokes = selectedStrokes();
  if (strokes.length === 0) return;
  context.lineJoin = "round";
  context.lineCap = "round";
  for (const stroke of strokes) {
    const offset = dragOffset;
    const trace = () => {
      context.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * width + offset.x;
        const y = point.y * height + offset.y;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
    };

    // Light halo under a dashed line so it reads over both paper and pigment.
    trace();
    context.setLineDash([]);
    context.strokeStyle = "rgba(255, 255, 255, 0.85)";
    context.lineWidth = 4;
    context.stroke();
    trace();
    context.setLineDash([6, 5]);
    context.strokeStyle = "#3f6fa8";
    context.lineWidth = 1.5;
    context.stroke();

    const first = stroke.points[0];
    context.setLineDash([]);
    context.fillStyle = "#3f6fa8";
    context.beginPath();
    context.arc(first.x * width + offset.x, first.y * height + offset.y, 4, 0, Math.PI * 2);
    context.fill();
  }

  // Every recorded point, sized by pressure. Where they bunch up the hand moved slowly.
  if ($("show-points").checked) {
    for (const stroke of strokes) {
      const offset = dragOffset;
      for (const point of stroke.points) {
        context.beginPath();
        context.arc(point.x * width + offset.x, point.y * height + offset.y, 1.5 + point.pressure * 2.5, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 0.9)";
        context.fill();
        context.beginPath();
        context.arc(point.x * width + offset.x, point.y * height + offset.y, 1 + point.pressure * 1.5, 0, Math.PI * 2);
        context.fillStyle = "#c2410c";
        context.fill();
      }
    }
  }

  // The curve's anchors and handles, for reshaping a single stroke.
  if (strokes.length === 1 && tool === "curve") drawCurveHandles(context, width, height);
}

// -- Curve tool: anchors and handles over the selected stroke ----------------

// One editing session per stroke (see curve.js). It is rebuilt whenever the
// stroke's points were replaced by something other than this tool (undo,
// smooth, trim, ...), which is detected by the points array changing.
let curveEdit = null;

function curveSession() {
  const stroke = selected();
  if (!stroke || selectedStrokes().length !== 1) return null;
  if (curveEdit?.id === stroke.id && curveEdit.session?.pointsRef === stroke.points) return curveEdit.session;
  curveEdit = { id: stroke.id, session: CurveEdit.fit(stroke.points, stage.clientWidth, stage.clientHeight) };
  return curveEdit.session;
}

/** Redraws the selected stroke's points along the session's curve. Silent: the caller emits "edit" when the edit is finished. */
function applyCurve(session) {
  const stroke = selected();
  const points = CurveEdit.apply(session, stroke.points, stage.clientWidth, stage.clientHeight);
  project.update(stroke.id, { points }, { silent: true });
  session.pointsRef = points;
}

function drawCurveHandles(context, width, height) {
  const session = curveSession();
  if (!session) return;
  const blue = "#3f6fa8";
  context.setLineDash([]);
  context.lineWidth = 1;
  context.strokeStyle = blue;

  for (const anchor of session.anchors) {
    for (const handle of [anchor.hin, anchor.hout]) {
      if (!handle) continue;
      context.beginPath();
      context.moveTo(anchor.x * width, anchor.y * height);
      context.lineTo(handle.x * width, handle.y * height);
      context.stroke();
    }
  }
  context.fillStyle = "#ffffff";
  for (const anchor of session.anchors) {
    for (const handle of [anchor.hin, anchor.hout]) {
      if (!handle) continue;
      context.beginPath();
      context.arc(handle.x * width, handle.y * height, 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }
  context.fillStyle = blue;
  for (const anchor of session.anchors) {
    context.fillRect(anchor.x * width - 6, anchor.y * height - 6, 12, 12);
  }
}

// -- Stage pointer tools -----------------------------------------------------

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The stroke under a point (CSS px), among strokes that have started by the playhead. Later strokes win ties. */
function hitTest(px, py) {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const now = player.nowMs;
  let best = null;
  let bestDistance = Infinity;

  for (const stroke of project.strokes) {
    if (stroke.start > now) continue;
    const reach = 8 + stroke.size * 10;
    const points = stroke.points;
    let distance = Math.hypot(points[0].x * width - px, points[0].y * height - py);
    for (let index = 1; index < points.length; index += 1) {
      distance = Math.min(
        distance,
        distanceToSegment(px, py, points[index - 1].x * width, points[index - 1].y * height, points[index].x * width, points[index].y * height),
      );
    }
    if (distance <= reach && distance <= bestDistance) {
      best = stroke.id;
      bestDistance = distance;
    }
  }
  return best;
}

/** Ids of the strokes (started by the playhead) with a point inside the box, in project order. Box corners are CSS px. */
function strokesInBox(x1, y1, x2, y2) {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  const now = player.nowMs;
  return project.strokes
    .filter((stroke) => stroke.start <= now)
    .filter((stroke) =>
      stroke.points.some((point) => {
        const x = point.x * width;
        const y = point.y * height;
        return x >= left && x <= right && y >= top && y <= bottom;
      }),
    )
    .map((stroke) => stroke.id);
}

/** Selects exactly these strokes (the first becomes the primary one). */
function setSelection(ids) {
  timeline.group = new Set(ids);
  timeline.select(ids.length > 0 ? ids[0] : null);
}

function drawMarquee({ startX, startY, x, y }) {
  const context = uiCanvas.getContext("2d");
  context.setLineDash([4, 3]);
  context.fillStyle = "rgba(63, 111, 168, 0.12)";
  context.strokeStyle = "#3f6fa8";
  context.lineWidth = 1;
  context.fillRect(Math.min(startX, x), Math.min(startY, y), Math.abs(x - startX), Math.abs(y - startY));
  context.strokeRect(Math.min(startX, x), Math.min(startY, y), Math.abs(x - startX), Math.abs(y - startY));
  context.setLineDash([]);
}

function stageXY(event) {
  const rect = stage.getBoundingClientRect();
  return { px: event.clientX - rect.left, py: event.clientY - rect.top, width: rect.width, height: rect.height };
}

function addPoints(stroke, event) {
  const events = event.getCoalescedEvents?.();
  const list = events && events.length > 0 ? events : [event];
  const rect = stage.getBoundingClientRect();

  for (const sample of list) {
    // Coalesced samples arrive together, so spread them over the time they
    // actually happened instead of stamping them all "now".
    const ageMs = Math.max(0, performance.now() - sample.timeStamp) * rate;
    const lastT = stroke.points[stroke.points.length - 1]?.t ?? 0;
    const t = stroke.points.length === 0 ? 0 : Math.max(lastT, player.nowMs - ageMs - stroke.start);
    stroke.points.push({
      x: clamp((sample.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((sample.clientY - rect.top) / rect.height, 0, 1),
      pressure: sample.pressure > 0 ? sample.pressure : 0.58,
      t: Math.round(t * 10) / 10,
    });
  }
}

function beginDraw(event) {
  selectedId = null;
  const stroke = {
    id: undefined,
    start: player.nowMs,
    speed: 1,
    color: { ...defaults.color },
    brush: defaults.brush,
    size: defaults.size,
    inkScale: defaults.inkScale,
    points: [],
  };
  project.checkpoint();
  // Silent: the stroke is still growing, and the live simulation already
  // matches what a replay would produce, so no re-render is needed.
  project.add(stroke, { silent: true });
  setPlaying(false);
  drawing = true;
  gesture = { type: "draw", stroke };
  addPoints(stroke, event);
  refreshAll();
}

stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || gesture) return;
  stage.setPointerCapture(event.pointerId);
  const { px, py } = stageXY(event);

  if (tool === "draw") {
    beginDraw(event);
  } else if (tool === "select") {
    const id = hitTest(px, py);
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const current = selectedStrokes().map((stroke) => stroke.id);
    if (id === null) {
      // Empty space: drag a box to select, a plain click deselects.
      gesture = { type: "marquee", startX: px, startY: py, x: px, y: py, moved: false, base: additive ? current : [], ids: current };
      if (!additive) setSelection([]);
    } else if (additive) {
      // Shift/Ctrl/Cmd-click toggles one stroke in the selection.
      setSelection(current.includes(id) ? current.filter((other) => other !== id) : [...current, id]);
    } else {
      // Grabbing a stroke that is already selected keeps the group, so the whole group moves.
      if (!current.includes(id)) setSelection([id]);
      gesture = { type: "move-stroke", ids: selectedStrokes().map((stroke) => stroke.id), startX: px, startY: py, moved: false, dx: 0, dy: 0 };
    }
  } else if (tool === "curve") {
    const session = curveSession();
    const target = session ? CurveEdit.hit(session, px, py, stage.clientWidth, stage.clientHeight) : null;
    if (target) {
      gesture = { type: "curve", id: selectedId, target, base: structuredClone(session.anchors), startX: px, startY: py, moved: false };
    } else {
      selectStroke(hitTest(px, py));
    }
  } else if (tool === "image" && overlay.loaded) {
    gesture = { type: "image", startX: event.clientX, startY: event.clientY, cx: overlay.cx, cy: overlay.cy };
    stage.style.cursor = "grabbing";
  }
});

stage.addEventListener("pointermove", (event) => {
  if (!gesture) return;

  if (gesture.type === "draw") {
    addPoints(gesture.stroke, event);
  } else if (gesture.type === "move-stroke") {
    const { px, py } = stageXY(event);
    gesture.dx = px - gesture.startX;
    gesture.dy = py - gesture.startY;
    if (Math.hypot(gesture.dx, gesture.dy) > 3) gesture.moved = true;
    if (gesture.moved) drawUi({ x: gesture.dx, y: gesture.dy });
  } else if (gesture.type === "marquee") {
    const { px, py } = stageXY(event);
    gesture.x = px;
    gesture.y = py;
    if (!gesture.moved && Math.hypot(px - gesture.startX, py - gesture.startY) < 3) return;
    gesture.moved = true;
    const hits = strokesInBox(gesture.startX, gesture.startY, px, py);
    const ids = [...new Set([...gesture.base, ...hits])];
    if (ids.length !== gesture.ids.length || ids.some((id, index) => id !== gesture.ids[index])) {
      gesture.ids = ids;
      setSelection(ids);
    }
    drawUi();
    drawMarquee(gesture);
  } else if (gesture.type === "curve") {
    const { px, py } = stageXY(event);
    if (!gesture.moved && Math.hypot(px - gesture.startX, py - gesture.startY) < 3) return;
    const session = curveSession();
    if (!session) return;
    if (!gesture.moved) {
      gesture.moved = true;
      project.checkpoint();
    }
    const { width, height } = stageSize();
    const dx = (px - gesture.startX) / width;
    const dy = (py - gesture.startY) / height;
    const { kind, index } = gesture.target;
    if (kind === "anchor") CurveEdit.moveAnchor(session, index, gesture.base, dx, dy);
    else CurveEdit.moveHandle(session, index, kind, gesture.base, dx, dy, width, height, event.altKey);
    applyCurve(session);
    drawUi();
  } else if (gesture.type === "image") {
    overlay.cx = gesture.cx + (event.clientX - gesture.startX) / stage.clientWidth;
    overlay.cy = gesture.cy + (event.clientY - gesture.startY) / stage.clientHeight;
    overlay.render();
  }
});

function endGesture() {
  if (!gesture) return;
  const finished = gesture;
  gesture = null;
  stage.style.cursor = "";

  if (finished.type === "draw") {
    drawing = false;
    project.emit("layout");
  } else if (finished.type === "curve") {
    if (finished.moved) project.emit("edit");
  } else if (finished.type === "move-stroke") {
    if (finished.moved) {
      const dx = finished.dx / stage.clientWidth;
      const dy = finished.dy / stage.clientHeight;
      project.checkpoint();
      for (const id of finished.ids) {
        const stroke = project.get(id);
        project.update(
          id,
          { points: stroke.points.map((point) => ({ ...point, x: clamp(point.x + dx, 0, 1), y: clamp(point.y + dy, 0, 1) })) },
          { silent: true },
        );
      }
      project.emit("edit");
    } else {
      drawUi();
    }
  } else if (finished.type === "marquee") {
    drawUi();
  }
}

// Curve tool, like a pen tool: double-click the path to add an anchor, an anchor to remove it.
stage.addEventListener("dblclick", (event) => {
  if (tool !== "curve") return;
  const session = curveSession();
  if (!session) return;
  const { px, py, width, height } = stageXY(event);
  const target = CurveEdit.hit(session, px, py, width, height);

  if (target) {
    if (target.kind !== "anchor") return;
    if (target.index === 0 || target.index === session.anchors.length - 1) {
      showMessage("The end anchors can't be removed. Trim the stroke to shorten it.");
      return;
    }
    project.checkpoint();
    CurveEdit.removeAnchor(session, target.index, width, height);
    applyCurve(session);
    project.emit("edit");
  } else {
    const spot = CurveEdit.nearest(session, px, py, width, height);
    if (spot && spot.distance <= 10) {
      // Adding an anchor leaves the shape alone, so there is nothing to undo or re-render.
      CurveEdit.insertAnchor(session, spot);
      drawUi();
    }
  }
});

stage.addEventListener("pointerup", endGesture);
stage.addEventListener("pointercancel", endGesture);

stage.addEventListener(
  "wheel",
  (event) => {
    if (tool !== "image" || !overlay.loaded) return;
    event.preventDefault();
    overlay.scale = clamp(overlay.scale * Math.exp(-event.deltaY * 0.0015), 0.1, 4);
    overlay.render();
    syncImageControls();
  },
  { passive: false },
);

const toolButtons = document.querySelectorAll("#tools button");

function setTool(next) {
  if (next === "image" && !overlay.loaded) return;
  tool = next;
  stage.dataset.tool = next;
  for (const button of toolButtons) button.setAttribute("aria-pressed", String(button.dataset.tool === next));
  drawUi();
}

for (const button of toolButtons) button.addEventListener("click", () => setTool(button.dataset.tool));
stage.dataset.tool = tool;

// -- Tracing image -----------------------------------------------------------

const imageFile = $("image-file");

async function loadImageFile(file) {
  try {
    await overlay.load(file);
    showMessage("Tracing image loaded. Switch to the Image tool to move it.");
  } catch (error) {
    showMessage(error.message);
  }
}

function bindImageSlider(id, key, format) {
  const slider = $(id);
  slider.addEventListener("input", () => {
    overlay[key] = Number(slider.value);
    overlay.render();
    $(`${id}-output`).textContent = format(overlay[key]);
  });
}

bindImageSlider("image-opacity", "opacity", (value) => `${Math.round(value * 100)}%`);
bindImageSlider("image-scale", "scale", (value) => `${Math.round(value * 100)}%`);
bindImageSlider("image-rotation", "rotation", (value) => `${Math.round(value)}°`);

function syncImageControls() {
  const loaded = overlay.loaded;
  $("image-controls").hidden = !loaded;
  $("image-remove").disabled = !loaded;
  document.querySelector('#tools [data-tool="image"]').disabled = !loaded;
  if (!loaded && tool === "image") setTool("draw");

  $("image-visible").checked = overlay.visible;
  $("image-opacity").value = String(overlay.opacity);
  $("image-opacity-output").textContent = `${Math.round(overlay.opacity * 100)}%`;
  $("image-scale").value = String(overlay.scale);
  $("image-scale-output").textContent = `${Math.round(overlay.scale * 100)}%`;
  $("image-rotation").value = String(overlay.rotation);
  $("image-rotation-output").textContent = `${Math.round(overlay.rotation)}°`;
  $("image-layer").value = overlay.above ? "above" : "below";
  $("image-grayscale").checked = overlay.grayscale;
  $("image-invert").checked = overlay.invert;
}

$("image-load").addEventListener("click", () => imageFile.click());
imageFile.addEventListener("change", () => {
  const file = imageFile.files[0];
  imageFile.value = "";
  if (file) void loadImageFile(file);
});
$("image-remove").addEventListener("click", () => overlay.remove());
$("image-reset").addEventListener("click", () => {
  overlay.resetPlacement();
  overlay.render();
  syncImageControls();
});
$("image-visible").addEventListener("change", (event) => {
  overlay.visible = event.target.checked;
  overlay.render();
});
$("image-layer").addEventListener("change", (event) => {
  overlay.above = event.target.value === "above";
  overlay.render();
});
$("image-grayscale").addEventListener("change", (event) => {
  overlay.grayscale = event.target.checked;
  overlay.render();
});
$("image-invert").addEventListener("change", (event) => {
  overlay.invert = event.target.checked;
  overlay.render();
});

// Drop an image (or a saved project) on the canvas, or paste an image.
stage.addEventListener("dragover", (event) => {
  event.preventDefault();
  stage.classList.add("dragging-over");
});
stage.addEventListener("dragleave", () => stage.classList.remove("dragging-over"));
stage.addEventListener("drop", (event) => {
  event.preventDefault();
  stage.classList.remove("dragging-over");
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  if (file.type.startsWith("image/")) void loadImageFile(file);
  else if (file.name.endsWith(".json")) void openProjectFile(file);
});
window.addEventListener("paste", (event) => {
  const file = [...(event.clipboardData?.files ?? [])].find((candidate) => candidate.type.startsWith("image/"));
  if (file) void loadImageFile(file);
});

// -- Project: undo, save/open -----------------------------------------

$("undo").addEventListener("click", () => project.undo());
$("redo").addEventListener("click", () => project.redo());

$("clear-all").addEventListener("click", () => {
  if (project.strokes.length === 0) return;
  project.checkpoint();
  selectedId = null;
  project.clear();
});

function applyTimeFactor(factor) {
  if (!(factor > 0) || factor === 1 || project.strokes.length === 0) return;
  const strokes = selectedStrokes();
  project.checkpoint();
  project.scaleTime(factor, strokes.length > 0 ? strokes : null);
}

function syncTimeScope() {
  const count = selectedStrokes().length;
  $("time-scope").textContent = count > 0 ? `Applies to the ${count} selected stroke${count === 1 ? "" : "s"}.` : "Nothing selected: applies to the whole animation.";
}

$("time-apply").addEventListener("click", () => applyTimeFactor(Number($("time-factor").value)));
for (const button of document.querySelectorAll(".time-preset")) {
  button.addEventListener("click", () => applyTimeFactor(Number(button.dataset.factor)));
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const projectName = $("project-name");

function projectFilename() {
  const base = projectName.value
    .trim()
    .replace(/\.json$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-");
  return `${base || "watercolor-project"}.json`;
}

// Asks where to save the file where the browser can (Chrome, Edge), and falls
// back to a plain download in the others (Firefox, Safari).
async function saveProject() {
  const text = JSON.stringify(project.toJSON());
  if (!window.showSaveFilePicker) {
    download(projectFilename(), text);
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: projectFilename(),
      types: [{ description: "Watercolor project", accept: { "application/json": [".json"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    projectName.value = handle.name.replace(/\.json$/i, "");
  } catch (error) {
    if (error.name === "AbortError") return; // closed the dialog
    showMessage(`Could not save the file: ${error.message}`);
  }
}

$("save-project").addEventListener("click", saveProject);
projectName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveProject();
  event.stopPropagation();
});

async function openProjectFile(file) {
  try {
    project.load(JSON.parse(await file.text()));
    projectName.value = file.name.replace(/\.json$/i, "");
    selectedId = null;
    seekTo(0);
    refreshAll();
  } catch (error) {
    showMessage(`Could not open that file: ${error.message}`);
  }
}

const projectFile = $("project-file");
$("open-project").addEventListener("click", () => projectFile.click());
projectFile.addEventListener("change", () => {
  const file = projectFile.files[0];
  projectFile.value = "";
  if (file) void openProjectFile(file);
});

// -- Transport ---------------------------------------------------------------

const playButton = $("play");
const scrub = $("scrub");
const timeLabel = $("time");

function setPlaying(next) {
  playing = next;
  playButton.innerHTML = next ? "&#10074;&#10074;" : "&#9654;";
  playButton.setAttribute("aria-label", next ? "Pause" : "Play");
}

function seekTo(ms) {
  pendingSeek = clamp(ms, 0, lengthMs());
}

function togglePlay() {
  if (!playing && player.nowMs >= lengthMs() - 1) seekTo(0);
  setPlaying(!playing);
}

playButton.addEventListener("click", togglePlay);
$("to-start").addEventListener("click", () => seekTo(0));
$("to-end").addEventListener("click", () => {
  setPlaying(false);
  seekTo(project.endMs);
});
function addCue() {
  if (!project.addCue(playheadMs())) showMessage("Move the playhead off time zero and off an existing cue to add one.");
}
$("add-cue").addEventListener("click", addCue);
$("loop").addEventListener("change", (event) => {
  loop = event.target.checked;
});
$("rate").addEventListener("change", (event) => {
  rate = Number(event.target.value);
});

scrub.addEventListener("pointerdown", () => {
  scrubbing = true;
  // On the window, so releasing outside the slider still ends the scrub.
  window.addEventListener("pointerup", () => (scrubbing = false), { once: true });
});
scrub.addEventListener("input", () => seekTo(Number(scrub.value)));

// -- Keyboard ----------------------------------------------------------------

// A mouse click leaves a button focused, and Space would then "press" it
// again alongside play/pause. Only mouse clicks are blurred, so keyboard
// users keep their focus.
document.addEventListener("mouseup", (event) => {
  event.target.closest?.("button")?.blur();
});

const focusButton = document.getElementById("focus-toggle");

function toggleFocus() {
  const on = document.querySelector(".app").classList.toggle("focus");
  focusButton.setAttribute("aria-pressed", String(on));
}
focusButton.addEventListener("click", toggleFocus);

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const typing = target instanceof HTMLInputElement && ["text", "number"].includes(target.type);
  if (typing || target instanceof HTMLSelectElement) return;

  const mod = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  // Sliders use the arrow keys themselves.
  if (key.startsWith("arrow") && target instanceof HTMLInputElement) return;

  if (mod && key === "z") {
    event.preventDefault();
    if (event.shiftKey) project.redo();
    else project.undo();
  } else if (mod && key === "y") {
    event.preventDefault();
    project.redo();
  } else if (mod || event.altKey) {
    return;
  } else if (key === " ") {
    event.preventDefault();
    togglePlay();
  } else if (key === "home") {
    seekTo(0);
  } else if (key === "end") {
    seekTo(project.endMs);
  } else if (key === "arrowleft" || key === "arrowright") {
    event.preventDefault();
    const step = event.shiftKey ? 1000 : SIM_STEP_MS;
    seekTo(playheadMs() + (key === "arrowleft" ? -step : step));
  } else if (key === "delete" || key === "backspace") {
    event.preventDefault();
    deleteSelected();
  } else if (key === "escape") {
    selectStroke(null);
  } else if (key === "s") {
    splitSelected();
  } else if (key === "k") {
    addCue();
  } else if (key === "f") {
    toggleFocus();
  } else if (key === "d") {
    setTool("draw");
  } else if (key === "v") {
    setTool("select");
  } else if (key === "c") {
    setTool("curve");
  } else if (key === "m") {
    setTool("image");
  }
});

// -- Frame loop --------------------------------------------------------------

function frame(time) {
  requestAnimationFrame(frame);
  const dtMs = lastFrameTime ? Math.min(time - lastFrameTime, 100) : 1000 / 60;
  lastFrameTime = time;

  if (pendingSeek !== null && !drawing) {
    player.seek(pendingSeek);
    pendingSeek = null;
  } else if (player.dirty && !drawing && !(playing && !scrubbing)) {
    player.seek(player.nowMs);
  }

  if (drawing || (playing && !scrubbing)) {
    player.advance(dtMs * rate);

    if (playing && !drawing && player.nowMs >= lengthMs()) {
      if (loop) player.seek(0);
      else setPlaying(false);
    }
  }

  if (drawing) timeline.render();

  const length = lengthMs();
  const now = Math.min(playheadMs(), length);
  scrub.max = String(Math.round(length));
  scrub.value = String(Math.round(now));
  timeLabel.textContent = `${formatTime(now)} / ${formatTime(length)}`;
  timeline.updatePlayhead(playing && !scrubbing);
}

// -- Setup -------------------------------------------------------------------

let resizeFrame = 0;
function queueResize() {
  if (resizeFrame !== 0) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    renderPaperFallback(fallbackCanvasElement, maxDpr);
    brushLayer.resize();
    overlay.render();
    // Resizing wipes the simulation, so draw it again from the strokes.
    player.invalidate();
    drawUi();
    timeline.render();
  });
}

function init() {
  if (!document.createElement("canvas").getContext("webgl2")) {
    showMessage("This browser has no WebGL2, so the watercolor brush can't run.", 10000);
  }

  renderPaperFallback(fallbackCanvasElement, maxDpr);
  brushLayer.resize();
  addShellViewportListeners(queueResize);

  void initializePaperShader({
    fallbackCanvas: fallbackCanvasElement,
    fallbackLayer: fallbackLayerElement,
    maxDpr,
    paperCanvas: paperCanvasElement,
  })
    .then((cleanup) => {
      window.addEventListener("beforeunload", () => cleanup?.());
    })
    .catch((error) => {
      console.error("Site paper WebGPU init error:", error);
    });

  setPlaying(false);
  syncImageControls();
  refreshAll();
  requestAnimationFrame(frame);
}

init();
