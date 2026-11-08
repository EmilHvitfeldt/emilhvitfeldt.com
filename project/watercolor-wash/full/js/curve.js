// Bezier-style editing of a stroke's trajectory, like the pen/direct-select
// tools in Illustrator. Pure maths, no DOM (the editor draws and drags).
//
// A stroke is still stored as recorded points; the curve is a *view* of it.
// fit() builds a "session": a handful of anchors with in/out handles that
// follow the path, plus, for every recorded point, which segment it sits on
// and how far along that segment (by arc length). After the anchors or
// handles move, apply() puts each point back at the same place along the new
// curve. Each point's own t (timing) and pressure are never touched, so the
// stroke is redrawn along the new trajectory at the same rhythm. The small
// wobble the hand left (the point's offset from the smooth curve) is kept, so
// reshaping bends the stroke instead of ironing it flat. Use Smooth to remove it.
//
// All positions are normalized to the stage (0..1). Distances (arc length,
// handle mirroring) are measured in pixels, so pass the stage's size.
// Classic script (see random.js for why).

const CurveEdit = {
  MAX_ANCHORS: 16,
  SAMPLES: 32,

  lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  },

  /** The four Bezier control points of the segment from anchor k to k + 1. */
  segment(session, k) {
    const from = session.anchors[k];
    const to = session.anchors[k + 1];
    return [from, from.hout, to.hin, to];
  },

  bezier(p, t) {
    const a = CurveEdit.lerp(p[0], p[1], t);
    const b = CurveEdit.lerp(p[1], p[2], t);
    const c = CurveEdit.lerp(p[2], p[3], t);
    return CurveEdit.lerp(CurveEdit.lerp(a, b, t), CurveEdit.lerp(b, c, t), t);
  },

  /** A segment as a pixel-space polyline with cumulative length, remembering the Bezier t of each vertex. */
  polyline(session, k, width, height) {
    const control = CurveEdit.segment(session, k);
    const vertices = [];
    let length = 0;
    for (let index = 0; index <= CurveEdit.SAMPLES; index += 1) {
      const t = index / CurveEdit.SAMPLES;
      const q = CurveEdit.bezier(control, t);
      const x = q.x * width;
      const y = q.y * height;
      if (index > 0) length += Math.hypot(x - vertices[index - 1].x, y - vertices[index - 1].y);
      vertices.push({ x, y, t, length });
    }
    return { vertices, total: length };
  },

  /** The position (px) and Bezier t at fraction f (0..1) of a polyline's length. */
  atFraction(poly, f) {
    const target = Math.min(1, Math.max(0, f)) * poly.total;
    const { vertices } = poly;
    let index = 1;
    while (index < vertices.length - 1 && vertices[index].length < target) index += 1;
    const a = vertices[index - 1];
    const b = vertices[index];
    const span = b.length - a.length;
    const g = span > 0 ? (target - a.length) / span : 0;
    return { x: a.x + (b.x - a.x) * g, y: a.y + (b.y - a.y) * g, t: a.t + (b.t - a.t) * g };
  },

  polylines(session, width, height) {
    return session.anchors.slice(0, -1).map((_, k) => CurveEdit.polyline(session, k, width, height));
  },

  /** Where each recorded point sits on the current curve, normalized, without its leftover wobble. */
  positions(session, width, height) {
    const polys = CurveEdit.polylines(session, width, height);
    return session.assign.map(({ seg, f }) => {
      const at = CurveEdit.atFraction(polys[seg], f);
      return { x: at.x / width, y: at.y / height };
    });
  },

  /** Catmull-Rom handles: each anchor's tangent follows the line between its neighbors. */
  autoHandles(anchors) {
    anchors.forEach((anchor, index) => {
      const prev = anchors[index - 1];
      const next = anchors[index + 1];
      anchor.hin = null;
      anchor.hout = null;
      if (prev && next) {
        const tx = (next.x - prev.x) / 6;
        const ty = (next.y - prev.y) / 6;
        anchor.hin = { x: anchor.x - tx, y: anchor.y - ty };
        anchor.hout = { x: anchor.x + tx, y: anchor.y + ty };
      } else if (next) {
        anchor.hout = { x: anchor.x + (next.x - anchor.x) / 3, y: anchor.y + (next.y - anchor.y) / 3 };
      } else if (prev) {
        anchor.hin = { x: anchor.x - (anchor.x - prev.x) / 3, y: anchor.y - (anchor.y - prev.y) / 3 };
      }
    });
  },

  /** Builds a session for a stroke's points, or null if there is no path to edit (fewer than 2 points, or no movement). */
  fit(points, width, height) {
    if (points.length < 2) return null;
    const cumulative = [0];
    for (let index = 1; index < points.length; index += 1) {
      const step = Math.hypot((points[index].x - points[index - 1].x) * width, (points[index].y - points[index - 1].y) * height);
      cumulative.push(cumulative[index - 1] + step);
    }
    if (cumulative[cumulative.length - 1] < 2) return null;

    // Few enough anchors to be workable by hand: loosen the tolerance until they fit.
    let tolerance = 4;
    let indices = StrokeOps.simplifyIndices(points, tolerance, width, height);
    while (indices.length > CurveEdit.MAX_ANCHORS) {
      tolerance *= 1.5;
      indices = StrokeOps.simplifyIndices(points, tolerance, width, height);
    }

    const anchors = indices.map((index) => ({ x: points[index].x, y: points[index].y, hin: null, hout: null }));
    CurveEdit.autoHandles(anchors);

    // Pin every point to a segment and an arc-length fraction of it, so each anchor stays exactly on its own point.
    const assign = new Array(points.length);
    for (let k = 0; k < indices.length - 1; k += 1) {
      const arc = cumulative[indices[k + 1]] - cumulative[indices[k]];
      for (let index = indices[k]; index < indices[k + 1]; index += 1) {
        assign[index] = { seg: k, f: arc > 0 ? (cumulative[index] - cumulative[indices[k]]) / arc : 0 };
      }
    }
    assign[points.length - 1] = { seg: indices.length - 2, f: 1 };

    const session = { anchors, assign, residual: [], pointsRef: points };
    const placed = CurveEdit.positions(session, width, height);
    session.residual = points.map((point, index) => ({ x: point.x - placed[index].x, y: point.y - placed[index].y }));
    return session;
  },

  /** The stroke's points redrawn along the current curve (timing and pressure unchanged). */
  apply(session, points, width, height) {
    const placed = CurveEdit.positions(session, width, height);
    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    return points.map((point, index) => ({
      ...point,
      x: clamp01(placed[index].x + session.residual[index].x),
      y: clamp01(placed[index].y + session.residual[index].y),
    }));
  },

  /** What is under (px, py): an anchor, or one of its handles. Anchors win when they overlap a handle. */
  hit(session, px, py, width, height, radius = 14) {
    const near = (point) => Math.hypot(point.x * width - px, point.y * height - py);
    let best = null;
    let bestDistance = radius;
    session.anchors.forEach((anchor, index) => {
      const distance = near(anchor);
      if (distance <= bestDistance) {
        best = { kind: "anchor", index };
        bestDistance = distance;
      }
    });
    if (best) return best;
    session.anchors.forEach((anchor, index) => {
      for (const which of ["hin", "hout"]) {
        if (!anchor[which]) continue;
        const distance = near(anchor[which]);
        if (distance <= bestDistance) {
          best = { kind: which, index };
          bestDistance = distance;
        }
      }
    });
    return best;
  },

  /** Moves an anchor and both its handles together. `base` is the anchors as they were when the drag began. */
  moveAnchor(session, index, base, dx, dy) {
    const anchor = session.anchors[index];
    const start = base[index];
    anchor.x = start.x + dx;
    anchor.y = start.y + dy;
    for (const which of ["hin", "hout"]) {
      if (start[which]) anchor[which] = { x: start[which].x + dx, y: start[which].y + dy };
    }
  },

  /**
   * Moves one handle. Unless `independent` (Alt), the opposite handle keeps its
   * length but swings to stay in line, so the curve stays smooth at the anchor.
   */
  moveHandle(session, index, which, base, dx, dy, width, height, independent) {
    const anchor = session.anchors[index];
    const start = base[index];
    const moved = { x: start[which].x + dx, y: start[which].y + dy };
    anchor[which] = moved;

    const other = which === "hin" ? "hout" : "hin";
    if (independent || !start[other]) return;
    const vx = (anchor.x - moved.x) * width;
    const vy = (anchor.y - moved.y) * height;
    const length = Math.hypot(vx, vy);
    if (length < 0.001) return;
    const otherLength = Math.hypot((start[other].x - start.x) * width, (start[other].y - start.y) * height);
    anchor[other] = { x: anchor.x + ((vx / length) * otherLength) / width, y: anchor.y + ((vy / length) * otherLength) / height };
  },

  /** The closest spot on the curve to (px, py): { seg, t, s (arc fraction of that segment), distance }. */
  nearest(session, px, py, width, height) {
    const polys = CurveEdit.polylines(session, width, height);
    let best = null;
    polys.forEach((poly, seg) => {
      for (let index = 1; index < poly.vertices.length; index += 1) {
        const a = poly.vertices[index - 1];
        const b = poly.vertices[index];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        const g = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
        const distance = Math.hypot(px - (a.x + dx * g), py - (a.y + dy * g));
        if (!best || distance < best.distance) {
          best = {
            seg,
            t: a.t + (b.t - a.t) * g,
            s: poly.total > 0 ? (a.length + (b.length - a.length) * g) / poly.total : 0.5,
            distance,
          };
        }
      }
    });
    return best;
  },

  /** Adds an anchor on segment `seg` at Bezier parameter t, without changing the curve's shape. */
  insertAnchor(session, { seg, t, s }) {
    const [p0, p1, p2, p3] = CurveEdit.segment(session, seg);
    const a = CurveEdit.lerp(p0, p1, t);
    const b = CurveEdit.lerp(p1, p2, t);
    const c = CurveEdit.lerp(p2, p3, t);
    const d = CurveEdit.lerp(a, b, t);
    const e = CurveEdit.lerp(b, c, t);
    const f = CurveEdit.lerp(d, e, t);

    session.anchors[seg].hout = a;
    session.anchors[seg + 1].hin = c;
    session.anchors.splice(seg + 1, 0, { x: f.x, y: f.y, hin: d, hout: e });

    // Points before the new anchor stay on this segment, the rest move to the next.
    const split = Math.min(0.999, Math.max(0.001, s));
    for (const entry of session.assign) {
      if (entry.seg > seg) entry.seg += 1;
      else if (entry.seg === seg) {
        if (entry.f < split) entry.f /= split;
        else {
          entry.seg = seg + 1;
          entry.f = (entry.f - split) / (1 - split);
        }
      }
    }
  },

  /** Deletes an interior anchor; the two segments around it merge. Returns false for the end anchors. */
  removeAnchor(session, index, width, height) {
    if (index <= 0 || index >= session.anchors.length - 1) return false;
    const before = CurveEdit.polyline(session, index - 1, width, height).total;
    const after = CurveEdit.polyline(session, index, width, height).total;
    const sum = before + after > 0 ? before + after : 1;

    for (const entry of session.assign) {
      if (entry.seg === index - 1) entry.f = (entry.f * before) / sum;
      else if (entry.seg === index) {
        entry.seg = index - 1;
        entry.f = (before + entry.f * after) / sum;
      } else if (entry.seg > index) entry.seg -= 1;
    }
    session.anchors.splice(index, 1);
    return true;
  },
};
