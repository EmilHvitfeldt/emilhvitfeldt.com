---
title: Watercolor Wash
date: "2026-11-06"
description: |
  Browser sketchpad for painting with a simulated watercolor wash brush
categories:
  - Miscellaneous
image: "featured.svg"
---

<div class="project-buttons">
<a href="app.html">
  {{< fa wand-magic-sparkles >}} launch simple app
</a>
<a href="full/index.html">
  {{< fa wand-magic-sparkles >}} launch full editor
</a>
</div>
<br>

Watercolor Wash is a small sketchpad with a single brush: a wet wash that blooms, blends and dries on textured paper. Pick a color from the palette, set the size, and paint. Strokes that overlap while the paint is still wet run into each other, just like the real thing.

There are two versions. The [simple app](app.html) is a single HTML file with just the wash brush. The [full editor](full/index.html) adds more brushes (watercolor, crispy liner, speed wash), a timeline with video-style transport, stroke selection and editing, curves, a tracing image, cues for slides, and undo/redo. Both run client-side and need a browser with WebGL2. Paintings export as a JSON project file that records every stroke.
