// Color choices for freehand drawing. Distinct from brush-palette.js, which
// is the ambient sweep's auto-cycling background palette -- this is a
// deliberate, user-picked pigment for the pen tool.
// The full Flexoki palette (https://github.com/kepano/flexoki): base grays plus
// 8 hues, 13 shades each (50 to 950). Laid out as a grid, one row per shade and
// one column per hue (gray first), then black and paper on a final row.
// Classic script (see random.js for why).
const flexokiShades = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950];

const flexokiHues = [
  ["Gray", "F2F0E5 E6E4D9 DAD8CE CECDC3 B7B5AC 9F9D96 878580 6F6E69 575653 403E3C 343331 282726 1C1B1A"],
  ["Red", "FFE1D5 FFCABB FDB2A2 F89A8A E8705F D14D41 C03E35 AF3029 942822 6C201C 551B18 3E1715 261312"],
  ["Orange", "FFE7CE FED3AF FCC192 F9AE77 EC8B49 DA702C CB6120 BC5215 9D4310 71320D 59290D 40200D 27180E"],
  ["Yellow", "FAEEC6 F6E2A0 F1D67E ECCB60 DFB431 D0A215 BE9207 AD8301 8E6B01 664D01 503D02 3A2D04 241E08"],
  ["Green", "EDEECF DDE2B2 CDD597 BEC97E A0AF54 879A39 768D21 66800B 536907 3D4C07 313D07 252D09 1A1E0C"],
  ["Cyan", "DDF1E4 BFE8D9 A2DECE 87D3C3 5ABDAC 3AA99F 2F968D 24837B 1C6C66 164F4A 143F3C 122F2C 101F1D"],
  ["Blue", "E1ECEB C6DDE8 ABCFE2 92BFDB 66A0C8 4385BE 3171B2 205EA6 1A4F8C 163B66 133051 12253B 101A24"],
  ["Purple", "F0EAEC E2D9E9 D3CAE6 C4B9E0 A699D0 8B7EC8 735EB5 5E409D 4F3685 3C2A62 31234E 261C39 1A1623"],
  ["Magenta", "FEE4E5 FCCFDA F9B9CF F4A4C2 E47DA8 CE5D97 B74583 A02F6F 87285E 641F46 4F1B39 39172B 24131D"],
].map(([hue, hexes]) => [hue, hexes.split(" ")]);

function flexokiColor(name, hex, a = 0.06) {
  const value = parseInt(hex, 16);
  return { name, r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a };
}

const penColors = [
  ...flexokiShades.flatMap((shade, row) =>
    flexokiHues.map(([hue, hexes]) => flexokiColor(`${hue} ${shade}`, hexes[row])),
  ),
  flexokiColor("Black", "100F0F", 0.08),
  flexokiColor("Paper", "FFFCF0"),
];
