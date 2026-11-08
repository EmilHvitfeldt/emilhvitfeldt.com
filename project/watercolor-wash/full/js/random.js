// Ported from the wtrclred source (ShellWatercolorRandom.ts).
// Classic script (no ES modules) so the page works when opened directly
// via file://, where modules are blocked by CORS. All these scripts share
// one global scope, loaded in dependency order by index.html.

/** Creates a deterministic random source for stable paper and brush textures. */
function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = Math.imul(state ^ (state >>> 15), state | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds the irregular blob path used by the paper wash and brush marks. */
function createOrganicPatchPath(radiusX, radiusY, random, irregularity = 0.22) {
  const path = new Path2D();
  const points = [];
  const steps = 24;
  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;
  const phaseC = random() * Math.PI * 2;

  for (let index = 0; index < steps; index += 1) {
    const t = index / steps;
    const angle = t * Math.PI * 2;
    const ripple =
      Math.sin(angle * 2 + phaseA) * irregularity * 0.54 +
      Math.sin(angle * 3 + phaseB) * irregularity * 0.34 +
      Math.sin(angle * 5 + phaseC) * irregularity * 0.18;
    const jitter = (random() - 0.5) * irregularity * 0.28;
    const scale = Math.max(0.58, 1 + ripple + jitter);
    const x = Math.cos(angle) * radiusX * scale;
    const y = Math.sin(angle) * radiusY * (1 + ripple * 0.72 + jitter * 0.34);
    points.push({ x, y });
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return path;

  path.moveTo((first.x + last.x) * 0.5, (first.y + last.y) * 0.5);

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const nextPoint = points[(index + 1) % points.length];
    if (!point || !nextPoint) continue;
    path.quadraticCurveTo(point.x, point.y, (point.x + nextPoint.x) * 0.5, (point.y + nextPoint.y) * 0.5);
  }

  path.closePath();
  return path;
}
