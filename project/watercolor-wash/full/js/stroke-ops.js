// Pure edits on a stroke's recorded data. Nothing here touches the project,
// the player or the DOM: each function takes a stroke (or its points) and
// returns new points or a patch for Project.update, or null when the edit
// would do nothing. The editor wraps them in checkpoint + update, so undo
// works and the player re-renders.
//
// Times: `ms` arguments are on the global timeline. A point's `t` is ms since
// its stroke began at speed 1, so timeline time = stroke.start + t / speed.
// Classic script (see random.js for why).

const StrokeOps = {
  round(value) {
    return Math.round(value * 10) / 10;
  },

  /** A point at local time `t`, interpolated between its neighbors. */
  pointAt(points, t) {
    const next = points.findIndex((point) => point.t >= t);
    if (next === -1) return { ...points[points.length - 1], t };
    if (next === 0) return { ...points[0], t };
    const a = points[next - 1];
    const b = points[next];
    const span = b.t - a.t;
    const f = span > 0 ? (t - a.t) / span : 0;
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      pressure: a.pressure + (b.pressure - a.pressure) * f,
      t,
    };
  },

  /** The part of the stroke between local times lo and hi, with interpolated ends, rebased so it starts at t = 0. */
  slice(points, lo, hi) {
    if (!(hi > lo)) return null;
    const inside = points.filter((point) => point.t > lo && point.t < hi);
    return [StrokeOps.pointAt(points, lo), ...inside, StrokeOps.pointAt(points, hi)].map((point) => ({
      ...point,
      t: StrokeOps.round(point.t - lo),
    }));
  },

  localTime(stroke, ms) {
    return (ms - stroke.start) * stroke.speed;
  },

  /**
   * Cuts a stroke in two at timeline time `ms`. Returns { first, second }:
   * `first` is a patch for the original stroke, `second` a new stroke (no id).
   * Both share the cut point, so there is no visible gap. Null if `ms` is not
   * strictly inside the stroke.
   */
  split(stroke, ms) {
    const last = stroke.points[stroke.points.length - 1].t;
    const cut = StrokeOps.localTime(stroke, ms);
    if (cut < 1 || cut > last - 1) return null;
    const second = structuredClone(stroke);
    second.id = undefined;
    second.start = ms;
    second.points = StrokeOps.slice(stroke.points, cut, last);
    return { first: { points: StrokeOps.slice(stroke.points, 0, cut) }, second };
  },

  /**
   * Keeps only the part between timeline times `fromMs` and `toMs` (either may
   * be omitted). The stroke stays where it was in time. Returns a patch, or
   * null if nothing would be removed.
   */
  trim(stroke, fromMs = -Infinity, toMs = Infinity) {
    const last = stroke.points[stroke.points.length - 1].t;
    const lo = Math.max(0, StrokeOps.localTime(stroke, fromMs));
    const hi = Math.min(last, StrokeOps.localTime(stroke, toMs));
    if (lo < 1 && hi > last - 1) return null;
    const points = StrokeOps.slice(stroke.points, lo, hi);
    if (!points) return null;
    return { start: stroke.start + lo / stroke.speed, points };
  },

  /** Multiplies the speed into the point times and resets speed to 1, so the numbers match what you see. */
  bakeSpeed(stroke) {
    if (stroke.speed === 1) return null;
    return {
      speed: 1,
      points: stroke.points.map((point) => ({ ...point, t: StrokeOps.round(point.t / stroke.speed) })),
    };
  },

  /** Moving-average smoothing of position and pressure. The two end points stay put. */
  smooth(points, passes = 1) {
    if (points.length < 3) return null;
    let current = points;
    for (let pass = 0; pass < passes; pass += 1) {
      current = current.map((point, index) => {
        if (index === 0 || index === current.length - 1) return { ...point };
        const a = current[index - 1];
        const b = current[index + 1];
        return {
          ...point,
          x: a.x * 0.25 + point.x * 0.5 + b.x * 0.25,
          y: a.y * 0.25 + point.y * 0.5 + b.y * 0.25,
          pressure: a.pressure * 0.25 + point.pressure * 0.5 + b.pressure * 0.25,
        };
      });
    }
    return current;
  },

  /**
   * Ramer-Douglas-Peucker on x/y, measured in pixels of a width x height
   * stage. Surviving points keep their own t, so timing is untouched.
   */
  simplify(points, tolerancePx, width, height) {
    if (points.length < 3) return null;
    const indices = StrokeOps.simplifyIndices(points, tolerancePx, width, height);
    return indices.length < points.length ? indices.map((index) => ({ ...points[index] })) : null;
  },

  /** The indices (ascending, always including the first and last) that Ramer-Douglas-Peucker keeps. */
  simplifyIndices(points, tolerancePx, width, height) {
    const keep = new Array(points.length).fill(false);
    keep[0] = true;
    keep[points.length - 1] = true;
    const stack = [[0, points.length - 1]];
    while (stack.length > 0) {
      const [from, to] = stack.pop();
      let worst = -1;
      let worstDistance = tolerancePx;
      const ax = points[from].x * width;
      const ay = points[from].y * height;
      const bx = points[to].x * width;
      const by = points[to].y * height;
      for (let index = from + 1; index < to; index += 1) {
        const distance = StrokeOps.distanceToSegment(points[index].x * width, points[index].y * height, ax, ay, bx, by);
        if (distance > worstDistance) {
          worst = index;
          worstDistance = distance;
        }
      }
      if (worst !== -1) {
        keep[worst] = true;
        stack.push([from, worst], [worst, to]);
      }
    }
    return keep.flatMap((kept, index) => (kept ? [index] : []));
  },

  distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const f = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
    return Math.hypot(px - (ax + f * dx), py - (ay + f * dy));
  },

  /** Center of the points' bounding box, in normalized coordinates. */
  center(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  },

  /**
   * Scales and rotates points around (cx, cy), all normalized. The turn is
   * done in pixel space (width x height) so a stage that isn't square does not
   * shear the stroke. Results are clamped to the stage.
   */
  transform(points, { cx, cy, scale = 1, degrees = 0, width, height }) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    return points.map((point) => {
      const dx = (point.x - cx) * width * scale;
      const dy = (point.y - cy) * height * scale;
      return {
        ...point,
        x: clamp01(cx + (dx * cos - dy * sin) / width),
        y: clamp01(cy + (dx * sin + dy * cos) / height),
      };
    });
  },

  /**
   * Remaps timing along the stroke, keeping the total duration. `amount` > 0
   * starts slow and ends fast (ease in), < 0 starts fast and ends slow, 0 is
   * no change. Monotonic, so point order and the t >= previous t rule hold.
   */
  ease(points, amount) {
    const last = points[points.length - 1].t;
    if (last <= 0 || amount === 0) return null;
    // A power below 1 pushes every point later (slow start), above 1 earlier (slow end).
    const power = amount > 0 ? 1 / (1 + amount * 2) : 1 + -amount * 2;
    return points.map((point) => ({ ...point, t: StrokeOps.round(last * Math.pow(point.t / last, power)) }));
  },

  /** Scales pressure, then pulls it toward its average by `flatten` (0 keeps it, 1 makes it constant). */
  pressure(points, { scale = 1, flatten = 0 }) {
    const average = points.reduce((sum, point) => sum + point.pressure, 0) / points.length;
    const clamp = (value) => Math.min(1, Math.max(0.02, value));
    return points.map((point) => ({
      ...point,
      pressure: clamp((point.pressure + (average - point.pressure) * flatten) * scale),
    }));
  },
};
