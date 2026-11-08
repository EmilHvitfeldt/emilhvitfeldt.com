// Ported from the wtrclred source (ShellWatercolorPaperFallback.ts).
// Classic script (see random.js for why); uses createOrganicPatchPath and
// mulberry32 from random.js and getShellViewportSize from viewport.js,
// loaded earlier in index.html.

let grainTileCache;

/** Paints the old paper texture fallback into a 2D canvas. */
function renderPaperFallback(canvas, maxDpr, size) {
  if (!canvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const { width, height } = size ?? getShellViewportSize();
  const bufferWidth = Math.max(1, Math.round(width * dpr));
  const bufferHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  const context = canvas.getContext("2d");
  if (!context) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, bufferWidth, bufferHeight);
  context.scale(dpr, dpr);
  drawPaperFallback(context, width, height);
}

function drawPaperFallback(context, width, height) {
  const areaScale = Math.max(0.82, Math.min(1.7, (width * height) / (1440 * 900)));
  const random = mulberry32(84221);

  context.save();
  context.fillStyle = "#f1eedf";
  context.fillRect(0, 0, width, height);
  drawRadialWash(context, width, height);

  context.globalCompositeOperation = "multiply";
  drawPaperPatches(context, width, height, random, Math.round(820 * areaScale), "shadow");

  context.globalCompositeOperation = "screen";
  drawPaperPatches(context, width, height, random, Math.round(520 * areaScale), "highlight");

  context.globalCompositeOperation = "source-over";
  drawPaperFibers(context, width, height, random, Math.round(260 * areaScale));

  const pattern = context.createPattern(getGrainTile(), "repeat");
  if (pattern) {
    context.globalCompositeOperation = "multiply";
    context.fillStyle = pattern;
    context.globalAlpha = 0.62;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
  }

  context.restore();
}

function drawRadialWash(context, width, height) {
  const warmth = context.createRadialGradient(width * 0.28, height * 0.16, 0, width * 0.28, height * 0.16, Math.max(width, height) * 0.8);
  warmth.addColorStop(0, "rgba(255, 251, 234, 0.42)");
  warmth.addColorStop(0.54, "rgba(255, 244, 212, 0.16)");
  warmth.addColorStop(1, "rgba(255, 244, 212, 0)");
  context.fillStyle = warmth;
  context.fillRect(0, 0, width, height);

  const cool = context.createRadialGradient(width * 0.78, height * 0.78, 0, width * 0.78, height * 0.78, Math.max(width, height) * 0.72);
  cool.addColorStop(0, "rgba(225, 232, 225, 0.22)");
  cool.addColorStop(1, "rgba(225, 232, 225, 0)");
  context.fillStyle = cool;
  context.fillRect(0, 0, width, height);
}

function drawPaperPatches(context, width, height, random, count, tone) {
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = tone === "shadow" ? 2.4 + random() * 10.2 : 2 + random() * 7;
    const path = createOrganicPatchPath(
      radius,
      radius * (tone === "shadow" ? 0.48 + random() * 0.94 : 0.5 + random()),
      random,
      tone === "shadow" ? 0.18 + random() * 0.12 : 0.2,
    );

    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.fillStyle = tone === "shadow" ? `rgba(162, 156, 125, ${0.01 + random() * 0.018})` : `rgba(255, 250, 232, ${0.01 + random() * 0.018})`;
    context.fill(path);
    context.restore();
  }
}

function drawPaperFibers(context, width, height, random, count) {
  context.lineCap = "round";
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const angle = (random() * Math.PI * 2 - Math.PI) * 0.8;
    const length = 8 + random() * 46;
    const bend = (random() - 0.5) * length * 0.4;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const controlX = x + Math.cos(angle) * length * 0.5 - Math.sin(angle) * bend;
    const controlY = y + Math.sin(angle) * length * 0.5 + Math.cos(angle) * bend;
    context.strokeStyle = `rgba(169, 162, 132, ${0.012 + random() * 0.02})`;
    context.lineWidth = 0.35 + random() * 1.2;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.stroke();
  }
}

function getGrainTile() {
  if (grainTileCache) return grainTileCache;

  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d");

  if (!context) {
    grainTileCache = canvas;
    return canvas;
  }

  const imageData = context.createImageData(canvas.width, canvas.height);
  const random = mulberry32(104729);

  for (let index = 0; index < canvas.width * canvas.height; index += 1) {
    const shade = 238 + Math.floor(random() * 10);
    const alpha = Math.floor(2 + random() * 5);
    const offset = index * 4;
    imageData.data[offset] = shade;
    imageData.data[offset + 1] = shade - 2;
    imageData.data[offset + 2] = shade - 5;
    imageData.data[offset + 3] = alpha;
  }

  context.putImageData(imageData, 0, 0);
  grainTileCache = canvas;
  return canvas;
}
