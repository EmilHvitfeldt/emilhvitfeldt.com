// The track view under the canvas: one clip per stroke, a ruler you can
// scrub, and a playhead. Dragging a clip retimes the stroke; dragging its
// right edge stretches it (changes that stroke's speed).
// Classic script (see random.js for why).

const CLIP_HEIGHT = 20;
const LANE_GAP = 3;
const RULER_HEIGHT = 24;
const SNAP_PX = 6;
const TICK_STEPS_S = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120];

function formatTime(ms) {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

class TimelineView {
  constructor({ root, project, getLengthMs, getPlayheadMs, getSelectedId, onSelect, onScrub, onScrubEnd }) {
    this.project = project;
    this.getLengthMs = getLengthMs;
    this.getPlayheadMs = getPlayheadMs;
    this.getSelectedId = getSelectedId;
    this.onSelect = onSelect;
    this.onScrub = onScrub;
    this.onScrubEnd = onScrubEnd;
    this.pxPerSec = 80;
    this.clips = new Map();
    this.tickKey = "";
    // Every selected stroke id (the editor's single selection is always in it).
    // Shift/Ctrl/Cmd-click adds or removes clips; dragging one moves them all.
    this.group = new Set();
    this.lastPrimary = null;
    this.selecting = false;

    this.scroll = root.querySelector(".tl-scroll");
    this.inner = root.querySelector(".tl-inner");
    this.ruler = root.querySelector(".tl-ruler");
    this.lanes = root.querySelector(".tl-lanes");
    this.cueLayer = root.querySelector(".tl-cues");
    this.playhead = root.querySelector(".tl-playhead");
    this.zoom = root.querySelector(".tl-zoom");

    this.zoom.value = String(this.pxPerSec);
    this.zoom.addEventListener("input", () => {
      this.pxPerSec = Number(this.zoom.value);
      this.render();
    });

    this.ruler.addEventListener("pointerdown", (event) => this.startScrub(event));
    this.lanes.addEventListener("pointerdown", (event) => {
      if (event.target === this.lanes && event.button === 0) this.startMarquee(event);
    });
    new ResizeObserver(() => this.render()).observe(this.scroll);
  }

  /** Changes the editor's primary selection without losing the rest of the group. */
  select(id) {
    this.selecting = true;
    this.onSelect(id);
    this.selecting = false;
  }

  /** Reconciles the group with the editor's selection and the project's strokes. */
  syncGroup() {
    const primary = this.getSelectedId();
    // The editor changed the selection itself (canvas click, duplicate, ...): start over.
    if (primary !== this.lastPrimary && !this.selecting) this.group.clear();
    this.lastPrimary = primary;
    if (primary === null) this.group.clear();
    else this.group.add(primary);
    for (const id of this.group) {
      if (!this.project.get(id)) this.group.delete(id);
    }
  }

  msToPx(ms) {
    return (ms / 1000) * this.pxPerSec;
  }

  pxToMs(px) {
    return (px / this.pxPerSec) * 1000;
  }

  eventToMs(event) {
    const rect = this.inner.getBoundingClientRect();
    return this.pxToMs(event.clientX - rect.left);
  }

  startScrub(event) {
    this.ruler.setPointerCapture(event.pointerId);
    const move = (moveEvent) => this.onScrub(Math.max(0, Math.min(this.getLengthMs(), this.eventToMs(moveEvent))));
    const up = () => {
      this.ruler.removeEventListener("pointermove", move);
      this.ruler.removeEventListener("pointerup", up);
      this.ruler.removeEventListener("pointercancel", up);
      this.onScrubEnd();
    };
    this.ruler.addEventListener("pointermove", move);
    this.ruler.addEventListener("pointerup", up);
    this.ruler.addEventListener("pointercancel", up);
    move(event);
  }

  /** Drag on empty lane space to box-select clips. Shift/Ctrl/Cmd adds to the current selection; a plain click deselects. */
  startMarquee(event) {
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const base = additive ? new Set(this.group) : new Set();
    const origin = this.lanes.getBoundingClientRect();
    const startX = event.clientX - origin.left;
    const startY = event.clientY - origin.top;
    let moved = false;
    let hits = new Set(base);

    const box = document.createElement("div");
    box.className = "tl-marquee";
    this.lanes.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const x = moveEvent.clientX - origin.left;
      const y = moveEvent.clientY - origin.top;
      if (!moved && Math.hypot(x - startX, y - startY) < 3) return;
      if (!moved) {
        moved = true;
        this.lanes.appendChild(box);
      }
      const left = Math.min(x, startX);
      const top = Math.min(y, startY);
      const right = Math.max(x, startX);
      const bottom = Math.max(y, startY);
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${right - left}px`;
      box.style.height = `${bottom - top}px`;

      hits = new Set(base);
      for (const [id, clip] of this.clips) {
        const l = clip.offsetLeft;
        const t = clip.offsetTop;
        if (l < right && l + clip.offsetWidth > left && t < bottom && t + clip.offsetHeight > top) hits.add(id);
      }
      for (const [id, clip] of this.clips) clip.classList.toggle("selected", hits.has(id));
    };

    const up = () => {
      this.lanes.removeEventListener("pointermove", move);
      this.lanes.removeEventListener("pointerup", up);
      this.lanes.removeEventListener("pointercancel", up);
      box.remove();
      if (!moved && additive) return;
      this.group = hits;
      const primary = hits.values().next();
      this.select(primary.done ? null : primary.value);
      this.render();
    };
    this.lanes.addEventListener("pointermove", move);
    this.lanes.addEventListener("pointerup", up);
    this.lanes.addEventListener("pointercancel", up);
  }

  /** Greedy lane packing so overlapping strokes stack instead of hiding each other. */
  assignLanes() {
    const ordered = [...this.project.strokes].sort((a, b) => a.start - b.start);
    const laneEnds = [];
    const laneOf = new Map();
    for (const stroke of ordered) {
      let lane = laneEnds.findIndex((end) => end <= stroke.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = Project.strokeEnd(stroke);
      laneOf.set(stroke.id, lane);
    }
    return { laneOf, laneCount: Math.max(laneEnds.length, 2) };
  }

  render() {
    const lengthMs = this.getLengthMs();
    const width = Math.max(this.scroll.clientWidth, this.msToPx(lengthMs) + 40);
    this.inner.style.width = `${width}px`;

    this.renderTicks(width);

    const { laneOf, laneCount } = this.assignLanes();
    this.lanes.style.height = `${laneCount * (CLIP_HEIGHT + LANE_GAP) + LANE_GAP}px`;
    this.playhead.style.height = `${RULER_HEIGHT + laneCount * (CLIP_HEIGHT + LANE_GAP) + LANE_GAP}px`;

    this.syncGroup();
    const seen = new Set();
    this.project.strokes.forEach((stroke, index) => {
      seen.add(stroke.id);
      let clip = this.clips.get(stroke.id);
      if (!clip) {
        clip = this.createClip(stroke.id);
        this.clips.set(stroke.id, clip);
        this.lanes.appendChild(clip);
      }

      const end = Project.strokeEnd(stroke);
      const color = stroke.color;
      clip.style.left = `${this.msToPx(stroke.start)}px`;
      clip.style.width = `${Math.max(8, this.msToPx(end - stroke.start))}px`;
      clip.style.top = `${LANE_GAP + laneOf.get(stroke.id) * (CLIP_HEIGHT + LANE_GAP)}px`;
      clip.style.background = `rgb(${color.r}, ${color.g}, ${color.b})`;
      clip.classList.toggle("selected", this.group.has(stroke.id));
      clip.firstChild.textContent = String(index + 1);
      clip.title = `Stroke ${index + 1}: ${formatTime(stroke.start)} to ${formatTime(end)}`;
    });

    for (const [id, clip] of this.clips) {
      if (!seen.has(id)) {
        clip.remove();
        this.clips.delete(id);
      }
    }

    this.renderCues();
    this.updatePlayhead(false);
  }

  /** Slide cues: a flag on the ruler per cue. Click to jump there, double-click to delete. */
  renderCues() {
    const flags = this.project.cues.map((cue, index) => {
      const flag = document.createElement("div");
      flag.className = "tl-cue";
      flag.style.left = `${this.msToPx(cue.ms)}px`;
      flag.textContent = String(index + 1);
      flag.title = `Cue ${index + 1} at ${formatTime(cue.ms)}. Click to jump, double-click to delete.`;
      flag.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        this.onScrub(cue.ms);
        this.onScrubEnd();
      });
      flag.addEventListener("dblclick", () => this.project.removeCue(cue));
      return flag;
    });
    this.cueLayer.replaceChildren(...flags);
  }

  renderTicks(width) {
    // Only rebuild the ruler when something that changes it did.
    const key = `${Math.round(width)}:${this.pxPerSec}`;
    if (key === this.tickKey) return;
    this.tickKey = key;

    const stepS = TICK_STEPS_S.find((step) => step * this.pxPerSec >= 64) ?? 120;
    this.ruler.replaceChildren();
    for (let s = 0; s * this.pxPerSec <= width; s = Math.round((s + stepS) * 1000) / 1000) {
      const tick = document.createElement("div");
      tick.className = "tl-tick";
      tick.style.left = `${s * this.pxPerSec}px`;
      tick.textContent = formatTime(s * 1000);
      this.ruler.appendChild(tick);
    }
  }

  createClip(id) {
    const clip = document.createElement("div");
    clip.className = "tl-clip";
    clip.dataset.id = String(id);
    const label = document.createElement("span");
    label.className = "tl-clip-label";
    const handle = document.createElement("div");
    handle.className = "tl-handle";
    clip.append(label, handle);

    clip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const stretch = event.target === handle;

      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        // Toggle this clip in or out of the group; no drag.
        if (this.group.has(id)) {
          this.group.delete(id);
          const next = this.group.values().next();
          this.select(next.done ? null : next.value);
        } else {
          this.group.add(id);
          this.select(id);
        }
        return;
      }

      // Pressing a clip that is already in a group keeps the group, so it can
      // be dragged together. A click without a drag then narrows to this clip.
      const keepGroup = this.group.has(id) && this.group.size > 1 && !stretch;
      if (!keepGroup) this.group.clear();
      this.select(id);
      this.startClipDrag(event, id, stretch ? "stretch" : "move", keepGroup);
    });
    return clip;
  }

  startClipDrag(event, id, mode, moveGroup = false) {
    const stroke = this.project.get(id);
    if (!stroke) return;
    const clip = this.clips.get(id);
    clip.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const original = { start: stroke.start, speed: stroke.speed };
    const lastT = stroke.points[stroke.points.length - 1]?.t ?? 0;
    const originalEnd = Project.strokeEnd(stroke);
    let moved = false;

    // Every stroke that travels with this one, with where it started.
    const movers = moveGroup ? [...this.group].map((gid) => ({ id: gid, start: this.project.get(gid)?.start ?? 0 })) : [{ id, start: original.start }];
    const earliestStart = Math.min(...movers.map((mover) => mover.start));

    // Edges worth snapping to: time zero, the playhead, and the ends of strokes that are not moving.
    const snapTargets = [0, this.getPlayheadMs()];
    for (const other of this.project.strokes) {
      if (movers.some((mover) => mover.id === other.id)) continue;
      snapTargets.push(other.start, Project.strokeEnd(other));
    }
    const snap = (ms) => {
      const threshold = this.pxToMs(SNAP_PX);
      let best = ms;
      let bestDistance = threshold;
      for (const target of snapTargets) {
        const distance = Math.abs(target - ms);
        if (distance < bestDistance) {
          best = target;
          bestDistance = distance;
        }
      }
      return best;
    };

    const move = (moveEvent) => {
      const deltaMs = this.pxToMs(moveEvent.clientX - startX);
      if (!moved && Math.abs(moveEvent.clientX - startX) < 3) return;
      if (!moved) {
        moved = true;
        this.project.checkpoint();
      }

      if (mode === "move") {
        const duration = originalEnd - original.start;
        // Snap whichever edge (start or end) lands closer to a target.
        // The dragged stroke leads; the group keeps its spacing and stops at time zero.
        const rawStart = Math.max(0, original.start + deltaMs, original.start - earliestStart);
        const snappedStart = snap(rawStart);
        const snappedEnd = snap(rawStart + duration) - duration;
        const useStart = Math.abs(snappedStart - rawStart) <= Math.abs(snappedEnd - rawStart);
        const newStart = Math.max(0, original.start - earliestStart, useStart ? snappedStart : snappedEnd);
        const shift = newStart - original.start;
        for (const mover of movers) {
          this.project.update(mover.id, { start: Math.max(0, mover.start + shift) }, { silent: true });
        }
      } else if (lastT > 0) {
        const newEnd = Math.max(original.start + 50, snap(originalEnd + deltaMs));
        const speed = Math.min(10, Math.max(0.1, lastT / (newEnd - original.start)));
        this.project.update(id, { speed }, { silent: true });
      }
      this.render();
    };

    const up = () => {
      clip.removeEventListener("pointermove", move);
      clip.removeEventListener("pointerup", up);
      clip.removeEventListener("pointercancel", up);
      if (moved) this.project.emit("edit");
      else if (moveGroup) {
        // A plain click on a grouped clip narrows the selection to it.
        this.group.clear();
        this.select(id);
        this.render();
      }
    };
    clip.addEventListener("pointermove", move);
    clip.addEventListener("pointerup", up);
    clip.addEventListener("pointercancel", up);
  }

  /** Moves the playhead line; with `follow`, scrolls to keep it in view during playback. */
  updatePlayhead(follow) {
    const x = this.msToPx(this.getPlayheadMs());
    this.playhead.style.transform = `translateX(${x}px)`;

    if (follow) {
      const { scrollLeft, clientWidth } = this.scroll;
      if (x > scrollLeft + clientWidth - 24) this.scroll.scrollLeft = x - clientWidth + 80;
      else if (x < scrollLeft) this.scroll.scrollLeft = Math.max(0, x - 24);
    }
  }
}
