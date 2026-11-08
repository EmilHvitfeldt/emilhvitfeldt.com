// Renders a Project onto the fluid brush layer, and moves through time.
//
// The simulation only runs forward, so "scrub to 3.2s" means: wipe it, then
// replay every stroke from zero in fixed 1/60s steps up to that moment.
// Playback uses the same fixed steps, and every dab is stamped with its own
// scheduled time rather than the wall clock, so a given project always
// produces the same picture whether it was played, scrubbed to, or just edited.
// Classic script (see random.js for why).

const SIM_STEP_MS = 1000 / 60;
// If the page stalls, replay at most this many steps per frame and let
// playback run slow rather than freezing while it catches up.
const MAX_STEPS_PER_FRAME = 8;

class Player {
  constructor({ project, brushLayer, canvas }) {
    this.project = project;
    this.brushLayer = brushLayer;
    this.canvas = canvas;
    this.simMs = 0;
    // Sub-step remainder, so the playhead can sit between two fixed steps.
    this.carryMs = 0;
    // Index of the next unplayed point, per stroke id.
    this.cursors = new Map();
    this.dirty = true;
  }

  /** Where the playhead is on the timeline, in ms. */
  get nowMs() {
    return this.simMs + this.carryMs;
  }

  /** The strokes changed (or the canvas was resized): the next advance/seek replays from zero. */
  invalidate() {
    this.dirty = true;
  }

  reset() {
    this.brushLayer.configure(this.project.settings);
    this.brushLayer.clear();
    this.simMs = 0;
    this.carryMs = 0;
    this.cursors.clear();
    this.dirty = false;
  }

  /** Jumps to `ms`. Going forward continues the simulation; going back (or after an edit) replays from zero. */
  seek(ms) {
    const target = Math.max(0, ms);
    if (this.dirty || target < this.simMs) this.reset();
    while (this.simMs + SIM_STEP_MS <= target) this.stepOnce();
    this.carryMs = target - this.simMs;
    this.brushLayer.present();
  }

  /** Plays forward by `dtMs` of timeline time. */
  advance(dtMs) {
    if (this.dirty) this.seek(this.nowMs);

    this.carryMs += dtMs;
    let steps = 0;
    while (this.carryMs >= SIM_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.carryMs -= SIM_STEP_MS;
      this.stepOnce();
      steps += 1;
    }
    this.carryMs = Math.min(this.carryMs, SIM_STEP_MS);
    if (steps > 0) this.brushLayer.present();
  }

  stepOnce() {
    this.simMs += SIM_STEP_MS;
    this.emitDue();
    this.brushLayer.advance(SIM_STEP_MS / 1000, false);
  }

  emitDue() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (const stroke of this.project.strokes) {
      if (stroke.start > this.simMs) continue;

      let index = this.cursors.get(stroke.id) ?? 0;
      while (index < stroke.points.length) {
        const point = stroke.points[index];
        const time = stroke.start + point.t / stroke.speed;
        if (time > this.simMs) break;

        this.brushLayer.draw({
          x: point.x * width,
          y: point.y * height,
          pressure: point.pressure,
          size: stroke.size,
          brush: stroke.brush,
          color: stroke.color,
          inkScale: stroke.inkScale,
          isMove: index > 0,
          t: point.t,
          time,
          strokeKey: stroke.id,
        });
        index += 1;
      }
      this.cursors.set(stroke.id, index);
    }
  }
}
