// Ported from the wtrclred source (ShellWatercolorBrushPalette.ts).
// Classic script (see random.js for why).

const brushColors = [
  { r: 180, g: 210, b: 245, a: 0.05 },
  { r: 160, g: 195, b: 235, a: 0.05 },
  { r: 135, g: 180, b: 220, a: 0.05 },
  { r: 170, g: 200, b: 230, a: 0.05 },
  { r: 150, g: 190, b: 240, a: 0.05 },
  { r: 175, g: 215, b: 255, a: 0.045 },
  { r: 245, g: 200, b: 215, a: 0.045 },
  { r: 250, g: 210, b: 210, a: 0.045 },
  { r: 255, g: 190, b: 200, a: 0.045 },
  { r: 240, g: 180, b: 190, a: 0.045 },
  { r: 255, g: 200, b: 190, a: 0.045 },
  { r: 250, g: 195, b: 205, a: 0.045 },
  { r: 250, g: 220, b: 190, a: 0.045 },
  { r: 255, g: 210, b: 170, a: 0.045 },
  { r: 255, g: 200, b: 160, a: 0.045 },
  { r: 250, g: 225, b: 200, a: 0.045 },
  { r: 255, g: 215, b: 180, a: 0.045 },
  { r: 245, g: 205, b: 175, a: 0.045 },
  { r: 255, g: 240, b: 200, a: 0.045 },
  { r: 255, g: 235, b: 180, a: 0.045 },
  { r: 250, g: 230, b: 170, a: 0.045 },
  { r: 255, g: 225, b: 160, a: 0.045 },
  { r: 245, g: 235, b: 190, a: 0.045 },
  { r: 255, g: 245, b: 210, a: 0.04 },
  { r: 200, g: 235, b: 215, a: 0.045 },
  { r: 185, g: 225, b: 200, a: 0.045 },
  { r: 190, g: 230, b: 190, a: 0.045 },
  { r: 175, g: 220, b: 185, a: 0.045 },
  { r: 195, g: 235, b: 205, a: 0.045 },
  { r: 180, g: 215, b: 195, a: 0.045 },
  { r: 220, g: 205, b: 240, a: 0.045 },
  { r: 210, g: 195, b: 235, a: 0.045 },
  { r: 200, g: 190, b: 225, a: 0.045 },
  { r: 225, g: 210, b: 230, a: 0.045 },
  { r: 230, g: 225, b: 220, a: 0.04 },
  { r: 220, g: 225, b: 230, a: 0.04 },
];

const brushColorHoldDraws = 36;

/** Keeps translucent pigment stable long enough to read as one watercolor stroke. */
function brushColorForDraw(sequence) {
  const colorIndex = Math.floor(sequence / brushColorHoldDraws) % brushColors.length;
  return brushColors[colorIndex];
}
