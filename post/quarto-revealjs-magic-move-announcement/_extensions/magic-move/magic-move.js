/**
 * Magic Move plugin for Reveal.js
 * Enables smooth animated transitions between code states
 *
 * Supports two modes:
 * 1. Div-based: Multiple code blocks in a ::: magic-move container (fragments)
 * 2. Slide-based: Consecutive slides with {.magic-move} class
 */
// `window` only exists in the browser; guarded so this file can also be `require()`d
// from `node --test` unit tests that exercise the DOM-free plan/schedule functions below.
if (typeof window !== 'undefined') {
  window.RevealMagicMove = window.RevealMagicMove || {
    id: 'magic-move',

    init: function(deck) {
      deck.on('ready', async function() {
        initDivBasedMagicMove(deck);
        initSlideBasedMagicMove(deck);
        await initSvgMagicMove(deck);
        await initDivBasedMathMagicMove(deck);
      });
    }
  };
}

// =============================================================================
// SLIDE-BASED MAGIC MOVE
// =============================================================================

function initSlideBasedMagicMove(deck) {
  // Find all slides (sections) with .magic-move class
  const magicSlides = Array.from(document.querySelectorAll('section.magic-move'));

  if (magicSlides.length === 0) return;

  // Group consecutive magic-move slides into sequences
  const sequences = groupConsecutiveSlides(magicSlides, deck);

  if (sequences.length === 0) return;

  // Pre-parse tokens for each slide in each sequence
  for (const sequence of sequences) {
    // Resolve once per sequence from the first slide's own attributes (e.g. a fenced
    // div-style `data-delay-enter` on the section) merged over the deck-wide default;
    // every transition within this sequence shares this one config, same granularity
    // as the div-based path.
    sequence.options = resolveMagicMoveOptions(deck, sequence.slides[0]);

    for (let i = 0; i < sequence.slides.length; i++) {
      const slide = sequence.slides[i];
      const codeBlock = slide.querySelector('pre code');

      if (codeBlock) {
        let step = parseTokensFromHTML(codeBlock, i);
        step = splitTokensOnDelimiters(step);
        slide._magicMoveStep = step;
        slide._magicMoveSequence = sequence;
        slide.dataset.magicSequence = sequences.indexOf(sequence);
        slide.dataset.magicStep = i;
      }
    }

    // Assign keys across the sequence
    const steps = sequence.slides
      .map(s => s._magicMoveStep)
      .filter(Boolean);

    if (steps.length > 1) {
      assignTokenKeys(steps);
    }
  }

  // Create overlay container for animations
  const overlay = document.createElement('div');
  overlay.className = 'magic-move-slide-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  `;
  document.body.appendChild(overlay);

  // Track animation state
  let isAnimating = false;

  // Listen for slide changes
  deck.on('slidechanged', function(event) {
    const fromSlide = event.previousSlide;
    const toSlide = event.currentSlide;

    if (!fromSlide || !toSlide || isAnimating) return;

    const fromStep = fromSlide._magicMoveStep;
    const toStep = toSlide._magicMoveStep;
    const fromSequence = fromSlide._magicMoveSequence;
    const toSequence = toSlide._magicMoveSequence;

    // Only animate if both slides are in the same sequence
    if (!fromStep || !toStep || fromSequence !== toSequence) return;

    // Reverse means navigating to an earlier step in the sequence, regardless of
    // which physical direction the user pressed (deck-level looping/jumps aside) -
    // used the same way as the div-based path's `reverse` option, to mirror the
    // scheduled timeline rather than just relabel enter/exit.
    const reverse = Number(toSlide.dataset.magicStep) < Number(fromSlide.dataset.magicStep);

    isAnimating = true;
    animateSlideMagicMove(fromSlide, toSlide, fromStep, toStep, overlay, deck, { ...fromSequence.options, reverse }, () => {
      isAnimating = false;
    });
  });
}

function groupConsecutiveSlides(magicSlides, deck) {
  // Get all slides in presentation order
  const allSlides = Array.from(deck.getSlides());
  const sequences = [];
  let currentSequence = null;

  for (let i = 0; i < allSlides.length; i++) {
    const slide = allSlides[i];
    const isMagic = magicSlides.includes(slide);

    if (isMagic) {
      // Check if this slide has a code block
      const hasCode = slide.querySelector('pre code') !== null;

      if (hasCode) {
        if (!currentSequence) {
          currentSequence = { slides: [], startIndex: i };
        }
        currentSequence.slides.push(slide);
      } else {
        // Magic slide without code - end current sequence
        if (currentSequence && currentSequence.slides.length > 1) {
          sequences.push(currentSequence);
        }
        currentSequence = null;
      }
    } else {
      // Non-magic slide - end current sequence
      if (currentSequence && currentSequence.slides.length > 1) {
        sequences.push(currentSequence);
      }
      currentSequence = null;
    }
  }

  // Don't forget the last sequence
  if (currentSequence && currentSequence.slides.length > 1) {
    sequences.push(currentSequence);
  }

  return sequences;
}

function animateSlideMagicMove(fromSlide, toSlide, fromStep, toStep, overlay, deck, options, onComplete) {
  const fromCodeBlock = fromSlide.querySelector('pre code');
  const toCodeBlock = toSlide.querySelector('pre code');

  if (!fromCodeBlock || !toCodeBlock) {
    onComplete();
    return;
  }

  const fromPre = fromCodeBlock.closest('pre');
  const toPre = toCodeBlock.closest('pre');

  // Temporarily show fromSlide to measure positions
  const fromSlideOriginalDisplay = fromSlide.style.display;
  const fromSlideOriginalVisibility = fromSlide.style.visibility;
  const fromSlideOriginalOpacity = fromSlide.style.opacity;

  fromSlide.style.display = 'block';
  fromSlide.style.visibility = 'visible';
  fromSlide.style.opacity = '0';

  // Capture the height of the from code block's sourceCode div
  const fromSourceCodeDiv = fromPre.closest('.sourceCode') || fromPre.parentElement;
  const fromHeight = fromSourceCodeDiv.getBoundingClientRect().height;

  // Get all tokens from the "from" code block and record their positions
  const fromTokens = getCodeTokens(fromCodeBlock);
  const fromTokenData = [];
  for (const token of fromTokens) {
    const rect = getTokenRect(token);
    const computedStyle = token.type === 'span'
      ? window.getComputedStyle(token.node)
      : window.getComputedStyle(token.node.parentElement);
    fromTokenData.push({
      content: token.content,
      classes: token.classes,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      computedStyle: computedStyle
    });
  }

  // Restore fromSlide
  fromSlide.style.display = fromSlideOriginalDisplay;
  fromSlide.style.visibility = fromSlideOriginalVisibility;
  fromSlide.style.opacity = fromSlideOriginalOpacity;

  // Get all tokens from the "to" code block
  const toTokens = getCodeTokens(toCodeBlock);
  const toSpanData = [];
  for (const token of toTokens) {
    const rect = getTokenRect(token);
    const computed = token.type === 'span'
      ? window.getComputedStyle(token.node)
      : window.getComputedStyle(token.node.parentElement);
    // Capture style VALUES (not live reference) since we'll modify styles later
    toSpanData.push({
      node: token.node,
      content: token.content,
      classes: token.classes,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      styles: {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        color: computed.color,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle
      }
    });
  }

  // Match "to" tokens with "from" tokens using minimal edit distance (LCS) so that
  // unchanged runs stay anchored in order and duplicate content (e.g. a repeated
  // identifier) resolves to its nearest occurrence instead of the first unused one.
  const exactKey = (t) => `${t.content}\u0000${JSON.stringify(t.classes)}`;
  const looseKey = (t) => t.content;
  const matchFromIndex = computeTokenAlignment(fromTokenData, toSpanData, exactKey, looseKey);
  for (let j = 0; j < toSpanData.length; j++) {
    const i = matchFromIndex[j];
    if (i !== -1) {
      toSpanData[j].matchedFrom = fromTokenData[i];
    }
  }

  // Capture the natural height of the to code block's sourceCode div
  const toSourceCodeDiv = toPre.closest('.sourceCode') || toPre.parentElement;
  const toHeightMeasured = toSourceCodeDiv.getBoundingClientRect().height;

  // Get reveal.js scale factor - measurements are in screen pixels but CSS needs unscaled values
  const scale = getRevealScale();

  // Convert screen pixels to CSS pixels by dividing by scale
  const fromHeightCSS = fromHeight / scale;
  const toHeightCSS = toHeightMeasured / scale;

  // `delayContainer` defaults to 0.5 here (unlike the div-based path's 0) so that, with
  // every other option left at its default, token clones start moving/fading exactly
  // 250ms (0.5 * the 500ms default duration) after the height transition begins —
  // reproducing this path's original hardcoded `heightAnimationDelay = 250ms` lead-in
  // bit-for-bit. An explicit `delayContainer` in options still overrides this.
  const resolvedOptions = { delayContainer: 0.5, ...options };
  const { duration = 500, easing = 'ease-in-out' } = resolvedOptions;

  // Animate height using the sourceCode div. The container animation is the timing
  // reference point (`delayContainer` delays *token* ops relative to it, not itself),
  // so it always starts immediately and runs for `duration`.
  toSourceCodeDiv.style.height = `${fromHeightCSS}px`;
  toSourceCodeDiv.style.overflow = 'hidden';
  toSourceCodeDiv.style.transition = `height ${duration}ms ${easing}`;

  // Use requestAnimationFrame to ensure layout is complete before animating
  requestAnimationFrame(() => {
    toSourceCodeDiv.style.height = `${toHeightCSS}px`;
  });

  // Make the code text transparent (but keep structure for line numbers)
  toCodeBlock.style.color = 'transparent';
  // Also hide any syntax-highlighted spans
  const codeSpans = toCodeBlock.querySelectorAll('span');
  for (const span of codeSpans) {
    span.style.color = 'transparent';
  }

  // Build the match result into a plan (exit/move/enter) and schedule (per-token start
  // times), same primitives as the div-based path. This token model is flat (one token
  // list per step, no line grouping data structure), so it's fed to buildAnimationPlan
  // as a single pseudo-line — batching still groups contiguous exit/enter runs, just
  // without the "never cross a line boundary" restriction the div-based path has.
  const usedFromIndices = new Set(matchFromIndex.filter(i => i !== -1));
  const fromStepForPlan = {
    tokens: fromTokenData.map((_, i) => ({ key: `f${i}` })),
  };
  fromStepForPlan.lines = [fromStepForPlan.tokens];
  const toStepForPlan = {
    tokens: toSpanData.map((_, j) => ({
      key: matchFromIndex[j] !== -1 ? `f${matchFromIndex[j]}` : `n${j}`,
    })),
  };
  toStepForPlan.lines = [toStepForPlan.tokens];

  const plan = buildAnimationPlan(fromStepForPlan, toStepForPlan);
  const scheduled = scheduleAnimationPlan(plan, resolvedOptions);
  const scheduleByKey = new Map(scheduled.map(entry => [entry.key, entry]));
  const defaultSchedule = { startMs: resolvedOptions.delayContainer * duration, durationMs: duration, easing };

  function transitionFor(sched) {
    const props = ['left', 'top', 'opacity'];
    return props.map(prop => `${prop} ${sched.durationMs}ms ${sched.easing} ${sched.startMs}ms`).join(', ');
  }

  // Create animated clones in the overlay for every "to" span (matched or new)...
  const clones = [];

  for (let j = 0; j < toSpanData.length; j++) {
    const toData = toSpanData[j];
    const hasMatch = !!toData.matchedFrom;
    const fromData = toData.matchedFrom;
    const key = hasMatch ? `f${matchFromIndex[j]}` : `n${j}`;
    const sched = scheduleByKey.get(key) || defaultSchedule;

    const clone = document.createElement('span');
    clone.textContent = toData.content;

    // Use captured style values (not live reference)
    const styles = toData.styles;

    // Starting position: from position if matched, to position if new
    const startX = hasMatch ? fromData.x : toData.x;
    const startY = hasMatch ? fromData.y : toData.y;
    const startOpacity = hasMatch ? 1 : 0;

    // Scale font size to match visual rendering (reveal.js uses CSS transforms)
    const fontSize = parseFloat(styles.fontSize) * scale;
    const lineHeight = parseFloat(styles.lineHeight) * scale;

    clone.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      font-family: ${styles.fontFamily};
      font-size: ${fontSize}px;
      line-height: ${isNaN(lineHeight) ? 'normal' : lineHeight + 'px'};
      letter-spacing: ${styles.letterSpacing};
      color: ${styles.color};
      font-weight: ${styles.fontWeight};
      font-style: ${styles.fontStyle};
      white-space: pre;
      pointer-events: none;
      opacity: ${startOpacity};
    `;

    overlay.appendChild(clone);
    clones.push({ clone, toData, hasMatch, sched });
  }

  // ...and, for the first time, a clone for every "from" token that has no match in
  // "to" either — these previously got no clone at all and just vanished the instant
  // toSlide's own real (transparent-during-transition) content took over. They fade
  // out from their original position instead.
  const exitClones = [];
  fromTokenData.forEach((fromData, i) => {
    if (usedFromIndices.has(i)) return;
    const sched = scheduleByKey.get(`f${i}`) || defaultSchedule;

    const clone = document.createElement('span');
    clone.textContent = fromData.content;
    const style = fromData.computedStyle;
    const fontSize = parseFloat(style.fontSize) * scale;
    const lineHeight = parseFloat(style.lineHeight) * scale;

    clone.style.cssText = `
      position: fixed;
      left: ${fromData.x}px;
      top: ${fromData.y}px;
      font-family: ${style.fontFamily};
      font-size: ${fontSize}px;
      line-height: ${isNaN(lineHeight) ? 'normal' : lineHeight + 'px'};
      letter-spacing: ${style.letterSpacing};
      color: ${style.color};
      font-weight: ${style.fontWeight};
      font-style: ${style.fontStyle};
      white-space: pre;
      pointer-events: none;
      opacity: 1;
    `;

    overlay.appendChild(clone);
    exitClones.push({ clone, fromData, sched });
  });

  // Force reflow before assigning transitions, so the starting values above are
  // actually painted first rather than being coalesced with what follows.
  overlay.offsetHeight;

  // Each clone gets its own transition-delay from its schedule entry instead of a
  // single global setTimeout gating everyone at once — this is what makes per-op
  // delay/stagger configurable instead of a hardcoded two-stage dance.
  for (const { clone, sched } of clones) {
    clone.style.transition = transitionFor(sched);
  }
  for (const { clone, sched } of exitClones) {
    clone.style.transition = transitionFor(sched);
  }

  overlay.offsetHeight;

  for (const { clone, toData, hasMatch } of clones) {
    clone.style.left = `${toData.x}px`;
    clone.style.top = `${toData.y}px`;
    if (!hasMatch) {
      clone.style.opacity = '1';
    }
  }
  for (const { clone } of exitClones) {
    clone.style.opacity = '0';
  }

  // Clean up once every clone (and the height transition) has actually finished,
  // rather than a hardcoded total.
  const allEndTimes = scheduled.map(entry => entry.startMs + entry.durationMs);
  allEndTimes.push(resolvedOptions.delayContainer * duration + duration); // container/default reference
  allEndTimes.push(duration); // height transition itself
  const cleanupDelay = Math.max(...allEndTimes) + 50; // small buffer, matches original's +50ms

  setTimeout(() => {
    // Restore code text colors
    toCodeBlock.style.color = '';
    for (const span of codeSpans) {
      span.style.color = '';
    }

    // Remove clones
    for (const { clone } of clones) {
      clone.remove();
    }
    for (const { clone } of exitClones) {
      clone.remove();
    }

    // Reset sourceCodeDiv styles
    toSourceCodeDiv.style.height = '';
    toSourceCodeDiv.style.overflow = '';
    toSourceCodeDiv.style.transition = '';

    onComplete();
  }, cleanupDelay);
}

// Get bounding rect for a token (handles partial text nodes)
function getTokenRect(token) {
  if (token.type === 'text') {
    const range = document.createRange();
    range.setStart(token.node, token.offset);
    range.setEnd(token.node, token.offset + token.length);
    return range.getBoundingClientRect();
  } else {
    return token.node.getBoundingClientRect();
  }
}

// Get all text content from a code block - both spans and text nodes
// Split text nodes into finer tokens for better matching
function getCodeTokens(codeElement) {
  const tokens = [];

  // Get line wrapper spans (they have id like "cb1-1", "cb2-3", etc.)
  const lineSpans = codeElement.querySelectorAll('span[id]');

  for (const lineSpan of lineSpans) {
    // Iterate through all child nodes of the line
    for (const node of lineSpan.childNodes) {
      // Skip anchor elements (line number links)
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
        continue;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        // Plain text node - split into smaller tokens
        const text = node.textContent;
        if (text) {
          // Split on delimiters but keep them as separate tokens
          // Each delimiter becomes its own token
          const parts = text.split(/([()[\]{},]|\s+)/);
          let offset = 0;

          for (const part of parts) {
            if (part === '') continue;

            tokens.push({
              type: 'text',
              node: node,
              content: part,
              classes: '',
              offset: offset,
              length: part.length
            });
            offset += part.length;
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        // Span element
        tokens.push({
          type: 'span',
          node: node,
          content: node.textContent,
          classes: Array.from(node.classList).join(','),
          offset: 0,
          length: node.textContent.length
        });
      }
    }
  }

  return tokens;
}

// =============================================================================
// SVG MAGIC MOVE
// =============================================================================

async function initSvgMagicMove(deck) {
  // Find all slides with .magic-move class that contain SVGs (or will contain SVGs)
  const magicSlides = Array.from(document.querySelectorAll('section.magic-move'));

  if (magicSlides.length === 0) return;

  // Check which slides have SVGs (either already inlined or as img tags)
  // Note: Reveal.js uses data-src for lazy-loaded images
  for (const slide of magicSlides) {
    const hasSvg = slide.querySelector('svg') !== null;
    const hasSvgImg = slide.querySelector('img[src$=".svg"], img[data-src$=".svg"]') !== null;
    slide._hasSvgContent = hasSvg || hasSvgImg;
  }

  // Pre-inline ALL SVGs at initialization to avoid layout shifts later
  for (const slide of magicSlides) {
    if (slide._hasSvgContent) {
      await inlineSvgImages(slide);
    }
  }

  // Group consecutive magic-move slides that have SVG content
  const sequences = groupConsecutiveSvgSlides(magicSlides, deck);

  if (sequences.length === 0) return;

  // Track animation state
  let isAnimating = false;

  // Listen for slide changes
  deck.on('slidechanged', async function(event) {
    const fromSlide = event.previousSlide;
    const toSlide = event.currentSlide;

    if (!fromSlide || !toSlide || isAnimating) return;

    // Check if both slides are in the same SVG sequence
    const fromSeq = fromSlide._svgMagicSequence;
    const toSeq = toSlide._svgMagicSequence;

    if (!fromSeq || !toSeq || fromSeq !== toSeq) return;

    const fromSvg = fromSlide.querySelector('svg');
    const toSvg = toSlide.querySelector('svg');

    if (!fromSvg || !toSvg) return;

    isAnimating = true;
    animateSvgMagicMove(fromSlide, toSlide, fromSvg, toSvg, deck, () => {
      isAnimating = false;
    });
  });
}

async function inlineSvgImages(slide) {
  // Handle both src and data-src (Reveal.js lazy loading)
  const svgImages = slide.querySelectorAll('img[src$=".svg"], img[data-src$=".svg"]');

  for (const img of svgImages) {
    try {
      // Use src if available, otherwise data-src (for lazy-loaded images)
      const svgUrl = img.src || img.getAttribute('data-src');
      if (!svgUrl || !svgUrl.endsWith('.svg')) continue;

      // Capture computed dimensions BEFORE replacing
      const computedStyle = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();

      const response = await fetch(svgUrl);
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      // Copy classes from img (important for r-stretch)
      if (img.className) svgElement.setAttribute('class', img.className);

      // Copy inline styles from img
      if (img.style.cssText) {
        svgElement.style.cssText = img.style.cssText;
      }

      // Ensure SVG has a viewBox for proper scaling with r-stretch
      if (!svgElement.getAttribute('viewBox')) {
        const svgWidth = svgElement.getAttribute('width') || rect.width;
        const svgHeight = svgElement.getAttribute('height') || rect.height;
        if (svgWidth && svgHeight) {
          svgElement.setAttribute('viewBox', `0 0 ${parseFloat(svgWidth)} ${parseFloat(svgHeight)}`);
        }
      }

      // For r-stretch to work properly, remove fixed width/height and let CSS control sizing
      // But preserve aspect ratio via viewBox
      if (img.classList.contains('r-stretch')) {
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
      } else {
        // Preserve explicit dimensions if set
        if (rect.width > 0) svgElement.setAttribute('width', rect.width);
        if (rect.height > 0) svgElement.setAttribute('height', rect.height);
      }

      // Ensure SVG displays as block to avoid baseline alignment issues
      // (inline SVGs can cause extra spacing due to text baseline)
      svgElement.style.display = 'block';

      // Mark as inlined for identification
      svgElement.dataset.inlined = 'true';
      svgElement.dataset.originalSrc = svgUrl;

      img.replaceWith(svgElement);
    } catch (e) {
      console.warn('Failed to inline SVG:', svgUrl, e);
    }
  }
}

function groupConsecutiveSvgSlides(magicSlides, deck) {
  const allSlides = Array.from(deck.getSlides());
  const sequences = [];
  let currentSequence = null;

  for (let i = 0; i < allSlides.length; i++) {
    const slide = allSlides[i];
    const isMagic = magicSlides.includes(slide);

    if (isMagic) {
      // Use the pre-computed flag that checks for both svg and img[src$=".svg"]
      const hasSvg = slide._hasSvgContent === true;

      if (hasSvg) {
        if (!currentSequence) {
          currentSequence = { slides: [], startIndex: i };
        }
        currentSequence.slides.push(slide);
        slide._svgMagicSequence = currentSequence;
        slide.dataset.svgMagicStep = currentSequence.slides.length - 1;
      } else {
        if (currentSequence && currentSequence.slides.length > 1) {
          sequences.push(currentSequence);
        }
        currentSequence = null;
      }
    } else {
      if (currentSequence && currentSequence.slides.length > 1) {
        sequences.push(currentSequence);
      }
      currentSequence = null;
    }
  }

  if (currentSequence && currentSequence.slides.length > 1) {
    sequences.push(currentSequence);
  }

  return sequences;
}

function animateSvgMagicMove(fromSlide, toSlide, fromSvg, toSvg, deck, onComplete) {
  // Parse all element types from both SVGs
  const fromPaths = parseSvgPaths(fromSvg);
  const toPaths = parseSvgPaths(toSvg);
  const fromRects = parseSvgRects(fromSvg);
  const toRects = parseSvgRects(toSvg);
  const fromCircles = parseSvgCircles(fromSvg);
  const toCircles = parseSvgCircles(toSvg);
  const fromLines = parseSvgLines(fromSvg);
  const toLines = parseSvgLines(toSvg);
  const fromPolylines = parseSvgPolylines(fromSvg);
  const toPolylines = parseSvgPolylines(toSvg);
  const fromPolygons = parseSvgPolygons(fromSvg);
  const toPolygons = parseSvgPolygons(toSvg);
  const fromEllipses = parseSvgEllipses(fromSvg);
  const toEllipses = parseSvgEllipses(toSvg);
  const fromTexts = parseSvgTexts(fromSvg);
  const toTexts = parseSvgTexts(toSvg);

  // Match elements between SVGs
  const pathMatches = matchSvgPaths(fromPaths, toPaths);
  const rectMatches = matchSvgRects(fromRects, toRects);
  const circleMatches = matchSvgCircles(fromCircles, toCircles);
  const lineMatches = matchSvgLines(fromLines, toLines);
  const polylineMatches = matchSvgPolylines(fromPolylines, toPolylines);
  const polygonMatches = matchSvgPolygons(fromPolygons, toPolygons);
  const ellipseMatches = matchSvgEllipses(fromEllipses, toEllipses);
  const textMatches = matchSvgTexts(fromTexts, toTexts);

  if (pathMatches.length === 0 && rectMatches.length === 0 &&
      circleMatches.length === 0 && lineMatches.length === 0 &&
      polylineMatches.length === 0 && polygonMatches.length === 0 &&
      ellipseMatches.length === 0 && textMatches.length === 0) {
    onComplete();
    return;
  }

  // Temporarily show fromSlide to get positions
  const fromSlideOriginalDisplay = fromSlide.style.display;
  const fromSlideOriginalVisibility = fromSlide.style.visibility;
  const fromSlideOriginalOpacity = fromSlide.style.opacity;

  fromSlide.style.display = 'block';
  fromSlide.style.visibility = 'visible';
  fromSlide.style.opacity = '0';

  // Capture "from" path data
  for (const match of pathMatches) {
    match.fromD = match.fromPath.getAttribute('d');
  }

  // Capture "from" rect data
  for (const match of rectMatches) {
    match.fromX = parseFloat(match.fromRect.getAttribute('x'));
    match.fromY = parseFloat(match.fromRect.getAttribute('y'));
    match.fromWidth = parseFloat(match.fromRect.getAttribute('width'));
    match.fromHeight = parseFloat(match.fromRect.getAttribute('height'));
  }

  // Capture "from" circle data
  for (const match of circleMatches) {
    match.fromCx = parseFloat(match.fromCircle.getAttribute('cx'));
    match.fromCy = parseFloat(match.fromCircle.getAttribute('cy'));
    match.fromR = parseFloat(match.fromCircle.getAttribute('r'));
  }

  // Capture "from" line data
  for (const match of lineMatches) {
    match.fromX1 = parseFloat(match.fromLine.getAttribute('x1'));
    match.fromY1 = parseFloat(match.fromLine.getAttribute('y1'));
    match.fromX2 = parseFloat(match.fromLine.getAttribute('x2'));
    match.fromY2 = parseFloat(match.fromLine.getAttribute('y2'));
  }

  // Capture "from" polyline data
  for (const match of polylineMatches) {
    match.fromPoints = match.fromPolyline.getAttribute('points');
  }

  // Capture "from" polygon data
  for (const match of polygonMatches) {
    match.fromPoints = match.fromPolygon.getAttribute('points');
  }

  // Capture "from" ellipse data
  for (const match of ellipseMatches) {
    match.fromCx = parseFloat(match.fromEllipse.getAttribute('cx'));
    match.fromCy = parseFloat(match.fromEllipse.getAttribute('cy'));
    match.fromRx = parseFloat(match.fromEllipse.getAttribute('rx'));
    match.fromRy = parseFloat(match.fromEllipse.getAttribute('ry'));
  }

  // Text data is already captured in the match objects from parseSvgTexts
  // (match.fromText and match.toText contain all needed data)

  // Restore fromSlide
  fromSlide.style.display = fromSlideOriginalDisplay;
  fromSlide.style.visibility = fromSlideOriginalVisibility;
  fromSlide.style.opacity = fromSlideOriginalOpacity;

  // Capture "to" path data and set up animation
  for (const match of pathMatches) {
    match.toD = match.toPath.getAttribute('d');

    // Set the "to" path to start at the "from" position
    match.toPath.setAttribute('d', match.fromD);
    match.toPath.style.transition = 'none';
  }

  // Capture "to" rect data and set up animation
  for (const match of rectMatches) {
    match.toX = parseFloat(match.toRect.getAttribute('x'));
    match.toY = parseFloat(match.toRect.getAttribute('y'));
    match.toWidth = parseFloat(match.toRect.getAttribute('width'));
    match.toHeight = parseFloat(match.toRect.getAttribute('height'));

    // Set the "to" rect to start at the "from" position
    match.toRect.setAttribute('x', match.fromX);
    match.toRect.setAttribute('y', match.fromY);
    match.toRect.setAttribute('width', match.fromWidth);
    match.toRect.setAttribute('height', match.fromHeight);
  }

  // Capture "to" circle data and set up animation
  for (const match of circleMatches) {
    match.toCx = parseFloat(match.toCircle.getAttribute('cx'));
    match.toCy = parseFloat(match.toCircle.getAttribute('cy'));
    match.toR = parseFloat(match.toCircle.getAttribute('r'));

    // Set the "to" circle to start at the "from" position
    match.toCircle.setAttribute('cx', match.fromCx);
    match.toCircle.setAttribute('cy', match.fromCy);
    match.toCircle.setAttribute('r', match.fromR);
  }

  // Capture "to" line data and set up animation
  for (const match of lineMatches) {
    match.toX1 = parseFloat(match.toLine.getAttribute('x1'));
    match.toY1 = parseFloat(match.toLine.getAttribute('y1'));
    match.toX2 = parseFloat(match.toLine.getAttribute('x2'));
    match.toY2 = parseFloat(match.toLine.getAttribute('y2'));

    // Set the "to" line to start at the "from" position
    match.toLine.setAttribute('x1', match.fromX1);
    match.toLine.setAttribute('y1', match.fromY1);
    match.toLine.setAttribute('x2', match.fromX2);
    match.toLine.setAttribute('y2', match.fromY2);
  }

  // Capture "to" polyline data and set up animation
  for (const match of polylineMatches) {
    match.toPoints = match.toPolyline.getAttribute('points');

    // Set the "to" polyline to start at the "from" position
    match.toPolyline.setAttribute('points', match.fromPoints);
  }

  // Capture "to" polygon data and set up animation
  for (const match of polygonMatches) {
    match.toPoints = match.toPolygon.getAttribute('points');

    // Set the "to" polygon to start at the "from" position
    match.toPolygon.setAttribute('points', match.fromPoints);
  }

  // Capture "to" ellipse data and set up animation
  for (const match of ellipseMatches) {
    match.toCx = parseFloat(match.toEllipse.getAttribute('cx'));
    match.toCy = parseFloat(match.toEllipse.getAttribute('cy'));
    match.toRx = parseFloat(match.toEllipse.getAttribute('rx'));
    match.toRy = parseFloat(match.toEllipse.getAttribute('ry'));

    // Set the "to" ellipse to start at the "from" position
    match.toEllipse.setAttribute('cx', match.fromCx);
    match.toEllipse.setAttribute('cy', match.fromCy);
    match.toEllipse.setAttribute('rx', match.fromRx);
    match.toEllipse.setAttribute('ry', match.fromRy);
  }

  // Text animation setup is handled in animateText function
  // since it needs to work with groups of <use> elements

  // Force reflow
  toSvg.getBoundingClientRect();

  // Animate to final positions
  requestAnimationFrame(() => {
    for (const match of pathMatches) {
      animatePath(match.toPath, match.fromD, match.toD, 500);
    }
    for (const match of rectMatches) {
      animateRect(match.toRect, match, 500);
    }
    for (const match of circleMatches) {
      animateCircle(match.toCircle, match, 500);
    }
    for (const match of lineMatches) {
      animateLine(match.toLine, match, 500);
    }
    for (const match of polylineMatches) {
      animatePolyline(match.toPolyline, match.fromPoints, match.toPoints, 500);
    }
    for (const match of polygonMatches) {
      animatePolygon(match.toPolygon, match.fromPoints, match.toPoints, 500);
    }
    for (const match of ellipseMatches) {
      animateEllipse(match.toEllipse, match, 500);
    }
    for (const match of textMatches) {
      animateText(match.toText.element, match, 500);
    }
  });

  // Clean up after animation
  setTimeout(() => {
    onComplete();
  }, 550);
}

function parseSvgPaths(svg) {
  const paths = [];

  // Find all path elements
  const pathElements = svg.querySelectorAll('path');

  for (const path of pathElements) {
    const d = path.getAttribute('d');
    if (!d) continue;

    // Get parent clip-path for identification
    const parent = path.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = path.getAttribute('stroke') ||
                   window.getComputedStyle(path).stroke;
    const fill = path.getAttribute('fill') ||
                 window.getComputedStyle(path).fill;
    const strokeWidth = path.getAttribute('stroke-width') ||
                        window.getComputedStyle(path).strokeWidth;

    paths.push({
      element: path,
      d: d,
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      // Parse path type (M, L, C, etc.)
      pathType: getPathType(d),
      elementType: 'path'
    });
  }

  return paths;
}

function parseSvgRects(svg) {
  const rects = [];

  // Find all rect elements (used by ggplot2 for bars, histograms, etc.)
  const rectElements = svg.querySelectorAll('rect');

  for (const rect of rectElements) {
    const x = rect.getAttribute('x');
    const y = rect.getAttribute('y');
    const width = rect.getAttribute('width');
    const height = rect.getAttribute('height');

    // Skip background rects (usually full-size white backgrounds)
    if (!x || !y || !width || !height) continue;

    // Get parent clip-path for identification
    const parent = rect.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = rect.getAttribute('stroke') ||
                   window.getComputedStyle(rect).stroke;
    const fill = rect.getAttribute('fill') ||
                 window.getComputedStyle(rect).fill;
    const strokeWidth = rect.getAttribute('stroke-width') ||
                        window.getComputedStyle(rect).strokeWidth;

    rects.push({
      element: rect,
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      elementType: 'rect'
    });
  }

  return rects;
}

function getPathType(d) {
  // Simple classification of path type
  const commands = d.match(/[MLHVCSQTAZ]/gi) || [];
  return commands.join('');
}

function matchSvgPaths(fromPaths, toPaths) {
  const matches = [];
  const usedTo = new Set();

  // First pass: match clipped paths by clip-path + pathType (original logic)
  // This handles ablines and other clipped elements
  for (const fromPath of fromPaths) {
    if (!fromPath.clipPath) continue;  // Skip unclipped paths for now

    for (let i = 0; i < toPaths.length; i++) {
      if (usedTo.has(i)) continue;

      const toPath = toPaths[i];

      const sameClip = fromPath.clipPath === toPath.clipPath;
      const sameType = fromPath.pathType === toPath.pathType;
      const differentD = fromPath.d !== toPath.d;

      if (sameClip && sameType && differentD) {
        matches.push({
          fromPath: fromPath.element,
          toPath: toPath.element
        });
        usedTo.add(i);
        break;
      }
    }
  }

  // Second pass: match unclipped paths by visual signature (for circles, etc.)
  const unclippedFrom = fromPaths.filter(p => !p.clipPath);
  const unclippedTo = toPaths.filter((p, i) => !p.clipPath && !usedTo.has(i));

  const fromByType = groupPathsByType(unclippedFrom);
  const toByType = groupPathsByType(unclippedTo);

  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromPath = fromGroup[i];
      const toPath = toGroup[i];

      if (fromPath.d !== toPath.d) {
        matches.push({
          fromPath: fromPath.element,
          toPath: toPath.element
        });
        usedTo.add(toPaths.indexOf(toPath));
      }
    }
  }

  // Third pass: match remaining paths by fill color only (for shape morphing like bar->pie)
  // This allows morphing between paths with different structures
  const remainingFrom = fromPaths.filter(p =>
    !matches.some(m => m.fromPath === p.element)
  );

  for (const fromPath of remainingFrom) {
    // Skip paths without a meaningful fill
    if (!fromPath.fill || fromPath.fill === 'none') continue;

    for (let i = 0; i < toPaths.length; i++) {
      if (usedTo.has(i)) continue;

      const toPath = toPaths[i];

      // Match by fill color (normalized comparison)
      const sameFill = normalizeColor(fromPath.fill) === normalizeColor(toPath.fill);
      const differentD = fromPath.d !== toPath.d;

      if (sameFill && differentD) {
        matches.push({
          fromPath: fromPath.element,
          toPath: toPath.element,
          needsNormalization: fromPath.pathType !== toPath.pathType
        });
        usedTo.add(i);
        break;
      }
    }
  }

  return matches;
}

function normalizeColor(color) {
  // Normalize color strings for comparison
  if (!color) return '';
  // Remove spaces and convert to lowercase
  return color.replace(/\s+/g, '').toLowerCase();
}

function groupPathsByType(paths) {
  const groups = {};

  for (const path of paths) {
    // Create a signature based on visual properties (not position)
    const signature = createPathSignature(path);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(path);
  }

  return groups;
}

function createPathSignature(path) {
  // Create a signature that identifies "same kind" of path
  // Based on: clipPath, fill, stroke, stroke-width, path structure (commands used)
  const parts = [
    path.clipPath || 'none',  // Important: paths in different clip regions shouldn't match
    path.fill || 'none',
    path.stroke || 'none',
    path.strokeWidth || '0',
    path.pathType // e.g., "MCCC" for circles
  ];
  return parts.join('|');
}

function matchSvgRects(fromRects, toRects) {
  const matches = [];

  // Group rects by their visual characteristics
  const fromByType = groupRectsByType(fromRects);
  const toByType = groupRectsByType(toRects);

  // Match rects within each type group by x-position order (left to right)
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by x position to match bars left-to-right
    fromGroup.sort((a, b) => a.x - b.x);
    toGroup.sort((a, b) => a.x - b.x);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromRect = fromGroup[i];
      const toRect = toGroup[i];

      // Only animate if something differs
      const differs = fromRect.x !== toRect.x ||
                      fromRect.y !== toRect.y ||
                      fromRect.width !== toRect.width ||
                      fromRect.height !== toRect.height;

      if (differs) {
        matches.push({
          fromRect: fromRect.element,
          toRect: toRect.element
        });
      }
    }
  }

  return matches;
}

function groupRectsByType(rects) {
  const groups = {};

  for (const rect of rects) {
    // Create a signature based on visual properties
    const signature = createRectSignature(rect);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(rect);
  }

  return groups;
}

function createRectSignature(rect) {
  // Create a signature that identifies "same kind" of rect
  const parts = [
    rect.clipPath || 'none',  // Rects in different clip regions shouldn't match
    rect.fill || 'none',
    rect.stroke || 'none',
    rect.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animateRect(rectElement, match, duration) {
  const startTime = performance.now();

  const fromX = match.fromX;
  const fromY = match.fromY;
  const fromWidth = match.fromWidth;
  const fromHeight = match.fromHeight;
  const toX = match.toX;
  const toY = match.toY;
  const toWidth = match.toWidth;
  const toHeight = match.toHeight;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate attributes
    const x = fromX + (toX - fromX) * eased;
    const y = fromY + (toY - fromY) * eased;
    const width = fromWidth + (toWidth - fromWidth) * eased;
    const height = fromHeight + (toHeight - fromHeight) * eased;

    rectElement.setAttribute('x', x);
    rectElement.setAttribute('y', y);
    rectElement.setAttribute('width', width);
    rectElement.setAttribute('height', height);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// CIRCLE SUPPORT
// =============================================================================

function parseSvgCircles(svg) {
  const circles = [];

  const circleElements = svg.querySelectorAll('circle');

  for (const circle of circleElements) {
    const cx = circle.getAttribute('cx');
    const cy = circle.getAttribute('cy');
    const r = circle.getAttribute('r');

    if (!cx || !cy || !r) continue;

    // Get parent clip-path for identification
    const parent = circle.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = circle.getAttribute('stroke') ||
                   window.getComputedStyle(circle).stroke;
    const fill = circle.getAttribute('fill') ||
                 window.getComputedStyle(circle).fill;
    const strokeWidth = circle.getAttribute('stroke-width') ||
                        window.getComputedStyle(circle).strokeWidth;

    circles.push({
      element: circle,
      cx: parseFloat(cx),
      cy: parseFloat(cy),
      r: parseFloat(r),
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      elementType: 'circle'
    });
  }

  return circles;
}

function matchSvgCircles(fromCircles, toCircles) {
  const matches = [];

  // Group circles by their visual characteristics
  const fromByType = groupCirclesByType(fromCircles);
  const toByType = groupCirclesByType(toCircles);

  // Match circles within each type group by position (left to right, top to bottom)
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by position (x first, then y)
    fromGroup.sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    toGroup.sort((a, b) => a.cx - b.cx || a.cy - b.cy);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromCircle = fromGroup[i];
      const toCircle = toGroup[i];

      // Only animate if something differs
      const differs = fromCircle.cx !== toCircle.cx ||
                      fromCircle.cy !== toCircle.cy ||
                      fromCircle.r !== toCircle.r;

      if (differs) {
        matches.push({
          fromCircle: fromCircle.element,
          toCircle: toCircle.element
        });
      }
    }
  }

  return matches;
}

function groupCirclesByType(circles) {
  const groups = {};

  for (const circle of circles) {
    const signature = createCircleSignature(circle);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(circle);
  }

  return groups;
}

function createCircleSignature(circle) {
  const parts = [
    circle.clipPath || 'none',
    circle.fill || 'none',
    circle.stroke || 'none',
    circle.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animateCircle(circleElement, match, duration) {
  const startTime = performance.now();

  const fromCx = match.fromCx;
  const fromCy = match.fromCy;
  const fromR = match.fromR;
  const toCx = match.toCx;
  const toCy = match.toCy;
  const toR = match.toR;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate attributes
    const cx = fromCx + (toCx - fromCx) * eased;
    const cy = fromCy + (toCy - fromCy) * eased;
    const r = fromR + (toR - fromR) * eased;

    circleElement.setAttribute('cx', cx);
    circleElement.setAttribute('cy', cy);
    circleElement.setAttribute('r', r);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// LINE SUPPORT
// =============================================================================

function parseSvgLines(svg) {
  const lines = [];

  const lineElements = svg.querySelectorAll('line');

  for (const line of lineElements) {
    const x1 = line.getAttribute('x1');
    const y1 = line.getAttribute('y1');
    const x2 = line.getAttribute('x2');
    const y2 = line.getAttribute('y2');

    if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

    // Get parent clip-path for identification
    const parent = line.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke properties for matching
    const stroke = line.getAttribute('stroke') ||
                   window.getComputedStyle(line).stroke;
    const strokeWidth = line.getAttribute('stroke-width') ||
                        window.getComputedStyle(line).strokeWidth;

    lines.push({
      element: line,
      x1: parseFloat(x1),
      y1: parseFloat(y1),
      x2: parseFloat(x2),
      y2: parseFloat(y2),
      clipPath: clipPath,
      stroke: stroke,
      strokeWidth: strokeWidth,
      elementType: 'line'
    });
  }

  return lines;
}

function matchSvgLines(fromLines, toLines) {
  const matches = [];

  // Group lines by their visual characteristics
  const fromByType = groupLinesByType(fromLines);
  const toByType = groupLinesByType(toLines);

  // Match lines within each type group
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by starting position (x1 first, then y1)
    fromGroup.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1);
    toGroup.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromLine = fromGroup[i];
      const toLine = toGroup[i];

      // Only animate if something differs
      const differs = fromLine.x1 !== toLine.x1 ||
                      fromLine.y1 !== toLine.y1 ||
                      fromLine.x2 !== toLine.x2 ||
                      fromLine.y2 !== toLine.y2;

      if (differs) {
        matches.push({
          fromLine: fromLine.element,
          toLine: toLine.element
        });
      }
    }
  }

  return matches;
}

function groupLinesByType(lines) {
  const groups = {};

  for (const line of lines) {
    const signature = createLineSignature(line);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(line);
  }

  return groups;
}

function createLineSignature(line) {
  const parts = [
    line.clipPath || 'none',
    line.stroke || 'none',
    line.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animateLine(lineElement, match, duration) {
  const startTime = performance.now();

  const fromX1 = match.fromX1;
  const fromY1 = match.fromY1;
  const fromX2 = match.fromX2;
  const fromY2 = match.fromY2;
  const toX1 = match.toX1;
  const toY1 = match.toY1;
  const toX2 = match.toX2;
  const toY2 = match.toY2;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate attributes
    const x1 = fromX1 + (toX1 - fromX1) * eased;
    const y1 = fromY1 + (toY1 - fromY1) * eased;
    const x2 = fromX2 + (toX2 - fromX2) * eased;
    const y2 = fromY2 + (toY2 - fromY2) * eased;

    lineElement.setAttribute('x1', x1);
    lineElement.setAttribute('y1', y1);
    lineElement.setAttribute('x2', x2);
    lineElement.setAttribute('y2', y2);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// POLYLINE SUPPORT
// =============================================================================

function parseSvgPolylines(svg) {
  const polylines = [];

  const polylineElements = svg.querySelectorAll('polyline');

  for (const polyline of polylineElements) {
    const points = polyline.getAttribute('points');
    if (!points) continue;

    // Get parent clip-path for identification
    const parent = polyline.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = polyline.getAttribute('stroke') ||
                   window.getComputedStyle(polyline).stroke;
    const fill = polyline.getAttribute('fill') ||
                 window.getComputedStyle(polyline).fill;
    const strokeWidth = polyline.getAttribute('stroke-width') ||
                        window.getComputedStyle(polyline).strokeWidth;

    // Parse points to get centroid for matching
    const parsedPoints = parsePointsAttribute(points);
    const centroid = computeCentroid(parsedPoints);

    polylines.push({
      element: polyline,
      points: points,
      parsedPoints: parsedPoints,
      centroid: centroid,
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      elementType: 'polyline'
    });
  }

  return polylines;
}

function matchSvgPolylines(fromPolylines, toPolylines) {
  const matches = [];

  // Group polylines by their visual characteristics
  const fromByType = groupPolylinesByType(fromPolylines);
  const toByType = groupPolylinesByType(toPolylines);

  // Match polylines within each type group by centroid position
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by centroid position
    fromGroup.sort((a, b) => a.centroid.x - b.centroid.x || a.centroid.y - b.centroid.y);
    toGroup.sort((a, b) => a.centroid.x - b.centroid.x || a.centroid.y - b.centroid.y);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromPolyline = fromGroup[i];
      const toPolyline = toGroup[i];

      // Only animate if points differ
      if (fromPolyline.points !== toPolyline.points) {
        matches.push({
          fromPolyline: fromPolyline.element,
          toPolyline: toPolyline.element
        });
      }
    }
  }

  return matches;
}

function groupPolylinesByType(polylines) {
  const groups = {};

  for (const polyline of polylines) {
    const signature = createPolylineSignature(polyline);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(polyline);
  }

  return groups;
}

function createPolylineSignature(polyline) {
  const parts = [
    polyline.clipPath || 'none',
    polyline.fill || 'none',
    polyline.stroke || 'none',
    polyline.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animatePolyline(polylineElement, fromPoints, toPoints, duration) {
  const fromParsed = parsePointsAttribute(fromPoints);
  const toParsed = parsePointsAttribute(toPoints);

  // If point counts differ, we need to interpolate
  const fromInterpolated = normalizePointCount(fromParsed, toParsed.length);
  const toInterpolated = normalizePointCount(toParsed, fromParsed.length);

  // Use the longer array length
  const targetLength = Math.max(fromParsed.length, toParsed.length);
  const fromNormalized = normalizePointCount(fromParsed, targetLength);
  const toNormalized = normalizePointCount(toParsed, targetLength);

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate points
    const interpolated = interpolatePoints(fromNormalized, toNormalized, eased);
    const pointsStr = pointsToString(interpolated);

    polylineElement.setAttribute('points', pointsStr);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// POLYGON SUPPORT
// =============================================================================

function parseSvgPolygons(svg) {
  const polygons = [];

  const polygonElements = svg.querySelectorAll('polygon');

  for (const polygon of polygonElements) {
    const points = polygon.getAttribute('points');
    if (!points) continue;

    // Get parent clip-path for identification
    const parent = polygon.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = polygon.getAttribute('stroke') ||
                   window.getComputedStyle(polygon).stroke;
    const fill = polygon.getAttribute('fill') ||
                 window.getComputedStyle(polygon).fill;
    const strokeWidth = polygon.getAttribute('stroke-width') ||
                        window.getComputedStyle(polygon).strokeWidth;

    // Parse points to get centroid for matching
    const parsedPoints = parsePointsAttribute(points);
    const centroid = computeCentroid(parsedPoints);

    polygons.push({
      element: polygon,
      points: points,
      parsedPoints: parsedPoints,
      centroid: centroid,
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      elementType: 'polygon'
    });
  }

  return polygons;
}

function matchSvgPolygons(fromPolygons, toPolygons) {
  const matches = [];

  // Group polygons by their visual characteristics
  const fromByType = groupPolygonsByType(fromPolygons);
  const toByType = groupPolygonsByType(toPolygons);

  // Match polygons within each type group by centroid position
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by centroid position
    fromGroup.sort((a, b) => a.centroid.x - b.centroid.x || a.centroid.y - b.centroid.y);
    toGroup.sort((a, b) => a.centroid.x - b.centroid.x || a.centroid.y - b.centroid.y);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromPolygon = fromGroup[i];
      const toPolygon = toGroup[i];

      // Only animate if points differ
      if (fromPolygon.points !== toPolygon.points) {
        matches.push({
          fromPolygon: fromPolygon.element,
          toPolygon: toPolygon.element
        });
      }
    }
  }

  return matches;
}

function groupPolygonsByType(polygons) {
  const groups = {};

  for (const polygon of polygons) {
    const signature = createPolygonSignature(polygon);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(polygon);
  }

  return groups;
}

function createPolygonSignature(polygon) {
  const parts = [
    polygon.clipPath || 'none',
    polygon.fill || 'none',
    polygon.stroke || 'none',
    polygon.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animatePolygon(polygonElement, fromPoints, toPoints, duration) {
  const fromParsed = parsePointsAttribute(fromPoints);
  const toParsed = parsePointsAttribute(toPoints);

  // Use the longer array length
  const targetLength = Math.max(fromParsed.length, toParsed.length);
  const fromNormalized = normalizePointCount(fromParsed, targetLength);
  const toNormalized = normalizePointCount(toParsed, targetLength);

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate points
    const interpolated = interpolatePoints(fromNormalized, toNormalized, eased);
    const pointsStr = pointsToString(interpolated);

    polygonElement.setAttribute('points', pointsStr);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// ELLIPSE SUPPORT
// =============================================================================

function parseSvgEllipses(svg) {
  const ellipses = [];

  const ellipseElements = svg.querySelectorAll('ellipse');

  for (const ellipse of ellipseElements) {
    const cx = ellipse.getAttribute('cx');
    const cy = ellipse.getAttribute('cy');
    const rx = ellipse.getAttribute('rx');
    const ry = ellipse.getAttribute('ry');

    if (!cx || !cy || !rx || !ry) continue;

    // Get parent clip-path for identification
    const parent = ellipse.closest('g[clip-path]');
    const clipPath = parent ? parent.getAttribute('clip-path') : null;

    // Get stroke/fill properties for matching
    const stroke = ellipse.getAttribute('stroke') ||
                   window.getComputedStyle(ellipse).stroke;
    const fill = ellipse.getAttribute('fill') ||
                 window.getComputedStyle(ellipse).fill;
    const strokeWidth = ellipse.getAttribute('stroke-width') ||
                        window.getComputedStyle(ellipse).strokeWidth;

    ellipses.push({
      element: ellipse,
      cx: parseFloat(cx),
      cy: parseFloat(cy),
      rx: parseFloat(rx),
      ry: parseFloat(ry),
      clipPath: clipPath,
      stroke: stroke,
      fill: fill,
      strokeWidth: strokeWidth,
      elementType: 'ellipse'
    });
  }

  return ellipses;
}

function matchSvgEllipses(fromEllipses, toEllipses) {
  const matches = [];

  // Group ellipses by their visual characteristics
  const fromByType = groupEllipsesByType(fromEllipses);
  const toByType = groupEllipsesByType(toEllipses);

  // Match ellipses within each type group by position
  for (const type of Object.keys(fromByType)) {
    const fromGroup = fromByType[type] || [];
    const toGroup = toByType[type] || [];

    // Sort by position (cx first, then cy)
    fromGroup.sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    toGroup.sort((a, b) => a.cx - b.cx || a.cy - b.cy);

    // Match by position in sorted group
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromEllipse = fromGroup[i];
      const toEllipse = toGroup[i];

      // Only animate if something differs
      const differs = fromEllipse.cx !== toEllipse.cx ||
                      fromEllipse.cy !== toEllipse.cy ||
                      fromEllipse.rx !== toEllipse.rx ||
                      fromEllipse.ry !== toEllipse.ry;

      if (differs) {
        matches.push({
          fromEllipse: fromEllipse.element,
          toEllipse: toEllipse.element
        });
      }
    }
  }

  return matches;
}

function groupEllipsesByType(ellipses) {
  const groups = {};

  for (const ellipse of ellipses) {
    const signature = createEllipseSignature(ellipse);

    if (!groups[signature]) {
      groups[signature] = [];
    }
    groups[signature].push(ellipse);
  }

  return groups;
}

function createEllipseSignature(ellipse) {
  const parts = [
    ellipse.clipPath || 'none',
    ellipse.fill || 'none',
    ellipse.stroke || 'none',
    ellipse.strokeWidth || '0'
  ];
  return parts.join('|');
}

function animateEllipse(ellipseElement, match, duration) {
  const startTime = performance.now();

  const fromCx = match.fromCx;
  const fromCy = match.fromCy;
  const fromRx = match.fromRx;
  const fromRy = match.fromRy;
  const toCx = match.toCx;
  const toCy = match.toCy;
  const toRx = match.toRx;
  const toRy = match.toRy;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate attributes
    const cx = fromCx + (toCx - fromCx) * eased;
    const cy = fromCy + (toCy - fromCy) * eased;
    const rx = fromRx + (toRx - fromRx) * eased;
    const ry = fromRy + (toRy - fromRy) * eased;

    ellipseElement.setAttribute('cx', cx);
    ellipseElement.setAttribute('cy', cy);
    ellipseElement.setAttribute('rx', rx);
    ellipseElement.setAttribute('ry', ry);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// TEXT SUPPORT (handles <use> elements - R's SVG text rendering)
// =============================================================================

function parseSvgTexts(svg) {
  const texts = [];

  // R's SVG device renders text as <use> elements inside <g> groups
  // Each <g> contains <use> elements for each character
  // We'll treat each <g> with <use> children as a text group

  const useGroups = svg.querySelectorAll('g[fill]');

  for (const group of useGroups) {
    const useElements = group.querySelectorAll('use');
    if (useElements.length === 0) continue;

    // Get the first use element's position as the group position
    const firstUse = useElements[0];
    const x = parseFloat(firstUse.getAttribute('x')) || 0;
    const y = parseFloat(firstUse.getAttribute('y')) || 0;

    // Get fill from the group
    const fill = group.getAttribute('fill') || '';

    // Create a signature from the glyph references (to match same text)
    const glyphSignature = Array.from(useElements)
      .map(u => u.getAttribute('xlink:href') || u.getAttribute('href') || '')
      .join(',');

    // Get parent clip-path for identification
    const clipParent = group.closest('g[clip-path]');
    const clipPath = clipParent ? clipParent.getAttribute('clip-path') : null;

    texts.push({
      element: group,
      useElements: Array.from(useElements),
      x: x,
      y: y,
      glyphSignature: glyphSignature,
      clipPath: clipPath,
      fill: fill,
      elementType: 'textGroup'
    });
  }

  return texts;
}

function matchSvgTexts(fromTexts, toTexts) {
  const matches = [];
  const usedTo = new Set();

  // First pass: match by glyph signature (same text content) and fill color
  for (const fromText of fromTexts) {
    for (let i = 0; i < toTexts.length; i++) {
      if (usedTo.has(i)) continue;

      const toText = toTexts[i];

      // Match by glyph signature (same characters) and fill color
      if (fromText.glyphSignature === toText.glyphSignature &&
          fromText.fill === toText.fill) {
        // Only animate if position differs
        const differs = fromText.x !== toText.x || fromText.y !== toText.y;

        if (differs) {
          matches.push({
            fromText: fromText,
            toText: toText
          });
        }
        usedTo.add(i);
        break;
      }
    }
  }

  // Second pass: match by fill color and position proximity (different text)
  for (const fromText of fromTexts) {
    if (matches.some(m => m.fromText === fromText)) continue;

    let bestMatch = null;
    let bestDistance = Infinity;

    for (let i = 0; i < toTexts.length; i++) {
      if (usedTo.has(i)) continue;

      const toText = toTexts[i];

      // Must have same fill color
      if (fromText.fill !== toText.fill) continue;

      // Calculate position distance
      const dx = fromText.x - toText.x;
      const dy = fromText.y - toText.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Allow matching if reasonably close
      if (distance < 200 && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = { text: toText, index: i };
      }
    }

    if (bestMatch) {
      matches.push({
        fromText: fromText,
        toText: bestMatch.text
      });
      usedTo.add(bestMatch.index);
    }
  }

  return matches;
}

function animateText(toTextGroup, match, duration) {
  // For R's SVG text (groups of <use> elements), we animate by
  // adjusting the x/y positions of each <use> element

  const fromUseElements = match.fromText.useElements;
  const toUseElements = match.toText.useElements;

  if (!fromUseElements || !toUseElements) return;

  // Calculate the delta to apply to each use element
  const deltaX = match.fromText.x - match.toText.x;
  const deltaY = match.fromText.y - match.toText.y;

  // Store original positions of "to" use elements
  const originalPositions = toUseElements.map(use => ({
    x: parseFloat(use.getAttribute('x')) || 0,
    y: parseFloat(use.getAttribute('y')) || 0
  }));

  // Set initial positions (from positions)
  for (let i = 0; i < toUseElements.length; i++) {
    toUseElements[i].setAttribute('x', originalPositions[i].x + deltaX);
    toUseElements[i].setAttribute('y', originalPositions[i].y + deltaY);
  }

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate each use element's position
    for (let i = 0; i < toUseElements.length; i++) {
      const x = originalPositions[i].x + deltaX * (1 - eased);
      const y = originalPositions[i].y + deltaY * (1 - eased);
      toUseElements[i].setAttribute('x', x);
      toUseElements[i].setAttribute('y', y);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// SHARED POINT UTILITIES (for polyline/polygon)
// =============================================================================

function parsePointsAttribute(pointsStr) {
  // Parse SVG points attribute: "x1,y1 x2,y2 x3,y3" or "x1 y1 x2 y2 x3 y3"
  const points = [];
  const parts = pointsStr.trim().split(/[\s,]+/);

  for (let i = 0; i < parts.length - 1; i += 2) {
    points.push({
      x: parseFloat(parts[i]),
      y: parseFloat(parts[i + 1])
    });
  }

  return points;
}

function pointsToString(points) {
  return points.map(p => `${p.x},${p.y}`).join(' ');
}

function computeCentroid(points) {
  if (points.length === 0) return { x: 0, y: 0 };

  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }

  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

function normalizePointCount(points, targetLength) {
  if (points.length === targetLength) return points;

  if (points.length === 0) {
    // Return array of zeros
    return Array(targetLength).fill({ x: 0, y: 0 });
  }

  if (points.length > targetLength) {
    // Downsample: pick evenly spaced points
    const result = [];
    for (let i = 0; i < targetLength; i++) {
      const idx = Math.floor(i * (points.length - 1) / (targetLength - 1));
      result.push(points[idx]);
    }
    return result;
  }

  // Upsample: interpolate additional points along the path
  const result = [];
  const ratio = (points.length - 1) / (targetLength - 1);

  for (let i = 0; i < targetLength; i++) {
    const srcIdx = i * ratio;
    const idx1 = Math.floor(srcIdx);
    const idx2 = Math.min(idx1 + 1, points.length - 1);
    const t = srcIdx - idx1;

    result.push({
      x: points[idx1].x + (points[idx2].x - points[idx1].x) * t,
      y: points[idx1].y + (points[idx2].y - points[idx1].y) * t
    });
  }

  return result;
}

function interpolatePoints(from, to, t) {
  const result = [];
  const len = Math.min(from.length, to.length);

  for (let i = 0; i < len; i++) {
    result.push({
      x: from[i].x + (to[i].x - from[i].x) * t,
      y: from[i].y + (to[i].y - from[i].y) * t
    });
  }

  return result;
}

function animatePath(pathElement, fromD, toD, duration) {
  // Parse the path commands
  const fromCoords = parsePathCoordinates(fromD);
  const toCoords = parsePathCoordinates(toD);

  // Check if paths have compatible structure
  const compatible = fromCoords && toCoords &&
    fromCoords.length === toCoords.length &&
    fromCoords.every((cmd, i) => cmd.command.toUpperCase() === toCoords[i].command.toUpperCase() &&
                                  cmd.coords.length === toCoords[i].coords.length);

  if (compatible) {
    // Standard animation for compatible paths
    animateCompatiblePaths(pathElement, fromCoords, toCoords, duration);
  } else {
    // For incompatible paths (like bar->pie), sample to points and morph
    animateIncompatiblePaths(pathElement, fromD, toD, duration);
  }
}

function animateCompatiblePaths(pathElement, fromCoords, toCoords, duration) {
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate coordinates
    const interpolated = interpolateCoordinates(fromCoords, toCoords, eased);

    // Reconstruct path
    const newD = reconstructPath(interpolated);
    pathElement.setAttribute('d', newD);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function animateIncompatiblePaths(pathElement, fromD, toD, duration) {
  // Convert paths to point arrays by sampling
  const numSamples = 100;
  const fromPoints = samplePathToPoints(fromD, numSamples);
  const toPoints = samplePathToPoints(toD, numSamples);

  if (!fromPoints || !toPoints) {
    // Fallback: just set final value
    pathElement.setAttribute('d', toD);
    return;
  }

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing: ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate points
    const interpolated = [];
    for (let i = 0; i < fromPoints.length; i++) {
      interpolated.push({
        x: fromPoints[i].x + (toPoints[i].x - fromPoints[i].x) * eased,
        y: fromPoints[i].y + (toPoints[i].y - fromPoints[i].y) * eased
      });
    }

    // Convert points back to path
    const newD = pointsToPath(interpolated);
    pathElement.setAttribute('d', newD);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function samplePathToPoints(d, numSamples) {
  // Create a temporary SVG path to sample points
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);

  const points = [];
  try {
    const totalLength = path.getTotalLength();
    if (totalLength === 0) return null;

    for (let i = 0; i < numSamples; i++) {
      const distance = (i / (numSamples - 1)) * totalLength;
      const point = path.getPointAtLength(distance);
      points.push({ x: point.x, y: point.y });
    }
  } finally {
    document.body.removeChild(svg);
  }

  return points;
}

function pointsToPath(points) {
  if (points.length === 0) return '';

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  d += ' Z';

  return d;
}

function parsePathCoordinates(d) {
  // Parse a simple path like "M x1 y1 L x2 y2"
  const result = [];

  // Match command letters and their following numbers
  const regex = /([MLHVCSQTAZ])\s*([-\d.\s,]*)/gi;
  let match;

  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const coordString = match[2].trim();
    const coords = coordString.split(/[\s,]+/).filter(s => s).map(Number);

    result.push({ command, coords });
  }

  return result;
}

function interpolateCoordinates(from, to, t) {
  const result = [];

  for (let i = 0; i < from.length; i++) {
    const fromCmd = from[i];
    const toCmd = to[i];

    const interpolatedCoords = fromCmd.coords.map((val, j) => {
      return val + (toCmd.coords[j] - val) * t;
    });

    result.push({ command: fromCmd.command, coords: interpolatedCoords });
  }

  return result;
}

function reconstructPath(parsed) {
  return parsed.map(p => {
    return p.command + ' ' + p.coords.join(' ');
  }).join(' ');
}

// =============================================================================
// DIV-BASED MAGIC MOVE (existing implementation)
// =============================================================================

// Merge deck-wide defaults, set via `format: revealjs: magic-move: {...}` in the document's
// YAML (forwarded into `deck.getConfig().magicMove` because `_extension.yml` declares
// `magicMove` as a config key of the RevealMagicMove plugin), with a per-container override
// read from the fenced div's own attributes (e.g. `{.magic-move delay-enter="0.3"}`, exposed
// on `container.dataset.delayEnter`). Per-container wins. One merged config applies to every
// step transition inside that container — no per-step override.
function resolveMagicMoveOptions(deck, container) {
  // Quarto's YAML metadata pipeline passes nested keys through verbatim (no kebab/camel
  // normalization for arbitrary plugin config), so `delay-exit: 0.2` under a deck-wide
  // `format: revealjs: magic-move:` block would otherwise land as a `delay-exit` property
  // and be silently ignored by the `delayExit` read below. Normalize so both casings work,
  // matching the kebab-case attribute syntax the per-container override already accepts.
  const deckOptions = normalizeMagicMoveKeys(deck.getConfig().magicMove || {});
  const containerOptions = {};
  const numericKeys = ['duration', 'delayExit', 'delayMove', 'delayEnter', 'stagger'];

  for (const key of numericKeys) {
    if (container.dataset[key] !== undefined) {
      containerOptions[key] = Number(container.dataset[key]);
    }
  }
  if (container.dataset.easing !== undefined) {
    containerOptions.easing = container.dataset.easing;
  }

  return { ...deckOptions, ...containerOptions };
}

function normalizeMagicMoveKeys(options) {
  const normalized = {};
  for (const key of Object.keys(options)) {
    const camelKey = key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    normalized[camelKey] = options[key];
  }
  return normalized;
}

function initDivBasedMagicMove(deck) {
  const containers = document.querySelectorAll('.magic-move:not(section)');

  for (const container of containers) {
    const codeBlocks = container.querySelectorAll('pre code');
    if (codeBlocks.length < 2) continue;

    // Auto-generate fragment markers between code blocks
    const pres = container.querySelectorAll('pre');
    for (let i = 0; i < pres.length - 1; i++) {
      // Check if there's already a fragment after this pre
      let nextSibling = pres[i].nextElementSibling;
      while (nextSibling && nextSibling.tagName === 'DIV' && nextSibling.classList.contains('sourceCode')) {
        // Skip sourceCode wrapper divs
        nextSibling = nextSibling.nextElementSibling;
      }

      const hasFragment = nextSibling?.querySelector?.('.magic-move-step') ||
                          nextSibling?.classList?.contains('magic-move-step');

      if (!hasFragment) {
        // Insert a fragment marker
        const fragment = document.createElement('span');
        fragment.className = 'fragment magic-move-step';
        fragment.dataset.fragmentIndex = i;

        // Insert after the pre (or its wrapper)
        const insertAfter = pres[i].closest('.sourceCode') || pres[i];
        insertAfter.parentNode.insertBefore(fragment, insertAfter.nextSibling);
      }
    }

    // Re-sync reveal.js to recognize new fragments
    deck.sync();

    // Parse tokens from each highlighted code block
    let steps = Array.from(codeBlocks).map((block, stepIndex) => {
      return parseTokensFromHTML(block, stepIndex);
    });

    // Post-process: split tokens on delimiters (parens, brackets, commas) for better animations
    steps = steps.map(step => splitTokensOnDelimiters(step));

    // Assign keys to tokens for matching across steps
    assignTokenKeys(steps);

    // Create render container - replicate Quarto's structure:
    // <div class="sourceCode"><pre class="sourceCode r"><code class="sourceCode r">
    const firstPre = container.querySelector('pre');
    const originalCode = container.querySelector('pre code');
    // Detect language from original code block classes (e.g., "sourceCode r" -> "r")
    const langClass = originalCode ? [...originalCode.classList].find(c => c !== 'sourceCode') : null;
    const lang = langClass || container.dataset.lang || 'r';

    // Outer div with sourceCode class
    const outerDiv = document.createElement('div');
    outerDiv.className = 'sourceCode magic-move-wrapper-outer';

    // Preserve Quarto/pandoc's line-numbering classes so numbered code blocks
    // still show line numbers once rendered into the synthetic wrapper below;
    // renderStep() adds the matching per-line <a> that the numberSource CSS
    // counter keys off of.
    const numbered = firstPre.classList.contains('numberSource');

    const wrapper = document.createElement('pre');
    wrapper.className = `sourceCode ${lang} magic-move-wrapper`;
    if (numbered) wrapper.classList.add('numberSource', 'number-lines');

    const computedStyle = window.getComputedStyle(firstPre);
    wrapper.style.background = computedStyle.backgroundColor || '#24292e';
    wrapper.style.color = computedStyle.color || '#e1e4e8';

    const renderTarget = document.createElement('code');
    renderTarget.className = `sourceCode ${lang} magic-move-render`;
    renderTarget.dataset.numbered = numbered ? 'true' : 'false';
    wrapper.appendChild(renderTarget);
    outerDiv.appendChild(wrapper);

    // Hide original code blocks. Hiding just the <pre> leaves pandoc's wrapping
    // `<div class="sourceCode">` in the DOM with its syntax-theme background and
    // border-bottom still showing (margins collapse around the hidden pre, but the
    // div itself doesn't), so hide that wrapper div too when there is one.
    container.querySelectorAll('pre').forEach(pre => {
      (pre.closest('div.sourceCode') || pre).style.display = 'none';
    });
    container.querySelectorAll('p').forEach(p => {
      if (p.querySelector('.magic-move-step')) p.style.display = 'none';
    });
    container.insertBefore(outerDiv, container.firstChild);

    // Render first step
    let currentStep = 0;
    renderStep(renderTarget, steps[0]);

    const slide = container.closest('section');
    const magicMoveOptions = resolveMagicMoveOptions(deck, container);

    // Handle fragment navigation
    deck.on('fragmentshown', (event) => {
      if (slide.contains(event.fragment) && event.fragment.classList.contains('magic-move-step')) {
        currentStep++;
        if (currentStep < steps.length) {
          animateToStep(renderTarget, steps[currentStep - 1], steps[currentStep], magicMoveOptions);
        }
      }
    });

    deck.on('fragmenthidden', (event) => {
      if (slide.contains(event.fragment) && event.fragment.classList.contains('magic-move-step')) {
        currentStep--;
        if (currentStep >= 0) {
          animateToStep(renderTarget, steps[currentStep + 1], steps[currentStep], { ...magicMoveOptions, reverse: true });
        }
      }
    });
  }
}

// =============================================================================
// SHARED UTILITIES
// =============================================================================

// reveal.js scales the whole .slides container via a CSS transform to fit the
// viewport. getBoundingClientRect() reports already-scaled screen pixels, so any
// measurement-derived transform we apply to a slide descendant needs to be
// divided by this factor first, or it gets scaled a second time by the ancestor.
function getRevealScale() {
  const slidesContainer = document.querySelector('.reveal .slides');
  if (!slidesContainer) return 1;
  const slidesTransform = window.getComputedStyle(slidesContainer).transform;
  if (!slidesTransform || slidesTransform === 'none') return 1;
  return new DOMMatrix(slidesTransform).a;
}

// Post-process tokens: split on delimiters for finer-grained matching
function splitTokensOnDelimiters(step) {
  const delimiters = /([()[\]{},]|\s+)/;

  const newLines = [];
  const newTokens = [];
  let tokenIndex = 0;

  for (const line of step.lines) {
    const newLine = [];

    for (const token of line) {
      // Split the content on delimiters, keeping the delimiters
      const parts = token.content.split(delimiters).filter(p => p !== '');

      if (parts.length === 1) {
        // No split needed
        const newToken = { ...token, tokenIndex: tokenIndex++ };
        newLine.push(newToken);
        newTokens.push(newToken);
      } else {
        // Create a token for each part
        for (const part of parts) {
          const newToken = {
            content: part,
            classes: [...token.classes],
            stepIndex: token.stepIndex,
            tokenIndex: tokenIndex++
          };
          newLine.push(newToken);
          newTokens.push(newToken);
        }
      }
    }

    newLines.push(newLine);
  }

  return { lines: newLines, tokens: newTokens };
}

// Parse tokens from Quarto's syntax highlighting output
function parseTokensFromHTML(codeElement, stepIndex) {
  const lines = [];
  const allTokens = [];
  let tokenIndex = 0;

  // Get line spans (they have id like "cb1-1", "cb1-2", etc.)
  const lineSpans = codeElement.querySelectorAll(':scope > span[id]');

  if (lineSpans.length === 0) {
    // Fallback: no line spans, parse directly
    const lineTokens = [];
    for (const node of codeElement.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          const token = {
            content: text,
            classes: [],
            stepIndex,
            tokenIndex: tokenIndex++
          };
          lineTokens.push(token);
          allTokens.push(token);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        const classes = Array.from(node.classList);
        const text = node.textContent;
        if (text) {
          const token = {
            content: text,
            classes: classes,
            stepIndex,
            tokenIndex: tokenIndex++
          };
          lineTokens.push(token);
          allTokens.push(token);
        }
      }
    }
    lines.push(lineTokens);
  } else {
    for (const lineSpan of lineSpans) {
      const lineTokens = [];

      for (const node of lineSpan.childNodes) {
        // Skip anchor elements
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
          continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text) {
            const token = {
              content: text,
              classes: [],
              stepIndex,
              tokenIndex: tokenIndex++
            };
            lineTokens.push(token);
            allTokens.push(token);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
          const classes = Array.from(node.classList);
          const text = node.textContent;
          if (text) {
            const token = {
              content: text,
              classes: classes,
              stepIndex,
              tokenIndex: tokenIndex++
            };
            lineTokens.push(token);
            allTokens.push(token);
          }
        }
      }

      lines.push(lineTokens);
    }
  }

  return { lines, tokens: allTokens };
}

// Assign keys to tokens for matching
function assignTokenKeys(steps) {
  let keyCounter = 0;

  // First pass: assign unique keys to first step
  for (const token of steps[0].tokens) {
    token.key = `token-${keyCounter++}`;
  }

  // For subsequent steps, try to match with previous step
  for (let stepIdx = 1; stepIdx < steps.length; stepIdx++) {
    const prevStep = steps[stepIdx - 1];
    const currStep = steps[stepIdx];

    // Match tokens globally
    matchSteps(prevStep, currStep);

    // Assign new keys to unmatched tokens
    for (const token of currStep.tokens) {
      if (!token.key) {
        token.key = `token-${keyCounter++}`;
      }
    }
  }
}

function matchSteps(prevStep, currStep) {
  const exactKey = (t) => `${t.content}\u0000${JSON.stringify(t.classes)}`;
  const looseKey = (t) => t.content;
  const lineSignature = (line) => line.map(exactKey).join('\u0001');

  // Pass 0: exact whole-line moves. A pure LCS match (below) can only bind
  // tokens that stay in the same relative order, so a swapped/reordered line
  // — same tokens, different position — can never come out of it as a
  // match; most of its tokens end up "new"/"removed" and fade instead of
  // sliding. Bind such lines directly by content signature first, nearest
  // line-index preferred to keep the pairing stable when a signature repeats.
  const prevSigs = prevStep.lines.map(lineSignature);
  const currSigs = currStep.lines.map(lineSignature);
  const prevLineUsed = new Array(prevStep.lines.length).fill(false);
  const currLineMatched = new Array(currStep.lines.length).fill(false);

  for (let ci = 0; ci < currStep.lines.length; ci++) {
    const currLine = currStep.lines[ci];
    if (currLine.length === 0) continue;

    let bestPi = -1;
    let bestDist = Infinity;
    for (let pi = 0; pi < prevStep.lines.length; pi++) {
      if (prevLineUsed[pi] || prevSigs[pi] !== currSigs[ci]) continue;
      const dist = Math.abs(pi - ci);
      if (dist < bestDist) {
        bestDist = dist;
        bestPi = pi;
      }
    }

    if (bestPi !== -1) {
      prevLineUsed[bestPi] = true;
      currLineMatched[ci] = true;
      const prevLine = prevStep.lines[bestPi];
      for (let k = 0; k < currLine.length; k++) {
        currLine[k].key = prevLine[k].key;
      }
    }
  }

  // Pass 1: token-level LCS alignment for whatever pass 0 didn't resolve,
  // restricted to the unmatched lines so a moved line's tokens can't also
  // get pulled into the diff of the genuinely edited ones.
  const prevRemainingTokens = [];
  for (let pi = 0; pi < prevStep.lines.length; pi++) {
    if (!prevLineUsed[pi]) prevRemainingTokens.push(...prevStep.lines[pi]);
  }
  const currRemainingTokens = [];
  for (let ci = 0; ci < currStep.lines.length; ci++) {
    if (!currLineMatched[ci]) currRemainingTokens.push(...currStep.lines[ci]);
  }

  const matchFromIndex = computeTokenAlignment(prevRemainingTokens, currRemainingTokens, exactKey, looseKey);

  for (let j = 0; j < currRemainingTokens.length; j++) {
    const i = matchFromIndex[j];
    if (i !== -1) {
      currRemainingTokens[j].key = prevRemainingTokens[i].key;
    }
  }
}

// Align "to" tokens with "from" tokens using minimal edit distance (LCS) rather than
// greedy first-fit, so that unchanged runs keep their relative order/position and
// duplicate content (e.g. a repeated identifier) resolves to its nearest plausible
// match instead of the first available one anywhere in the array.
//
// Returns an array parallel to `toTokens` where each entry is the matched index into
// `fromTokens`, or -1 if the token is new/unmatched. `exactKeyFn` should capture full
// token identity (content + classes); `looseKeyFn` is used only as a fallback within
// the gaps between exact matches (content-only, e.g. for tokens whose classes changed).
function computeTokenAlignment(fromTokens, toTokens, exactKeyFn, looseKeyFn) {
  const anchors = computeLCSAnchors(fromTokens, toTokens, exactKeyFn);
  const matchFromIndex = new Array(toTokens.length).fill(-1);
  for (const [i, j] of anchors) {
    matchFromIndex[j] = i;
  }

  // Fill in the gaps before/between/after the anchors with a local (content-only)
  // nearest-match pass, so duplicate tokens don't bind to a far-away occurrence.
  let prevFromEnd = 0;
  let prevToEnd = 0;
  const boundaries = anchors.concat([[fromTokens.length, toTokens.length]]);
  for (const [fromAnchor, toAnchor] of boundaries) {
    matchGap(prevFromEnd, fromAnchor, prevToEnd, toAnchor);
    prevFromEnd = fromAnchor + 1;
    prevToEnd = toAnchor + 1;
  }

  function matchGap(fromStart, fromEnd, toStart, toEnd) {
    const usedFrom = new Set();
    for (let tj = toStart; tj < toEnd; tj++) {
      const toKey = looseKeyFn(toTokens[tj]);
      let bestFromIndex = -1;
      let bestDistance = Infinity;
      for (let fi = fromStart; fi < fromEnd; fi++) {
        if (usedFrom.has(fi)) continue;
        if (looseKeyFn(fromTokens[fi]) !== toKey) continue;
        const distance = Math.abs((fi - fromStart) - (tj - toStart));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestFromIndex = fi;
        }
      }
      if (bestFromIndex !== -1) {
        matchFromIndex[tj] = bestFromIndex;
        usedFrom.add(bestFromIndex);
      }
    }
  }

  return matchFromIndex;
}

// Longest common subsequence of tokens (by key) between fromTokens and toTokens.
// Returns an ordered list of [fromIndex, toIndex] pairs. Small O(n*m) DP table is
// fine here: these arrays are per-line/per-step token lists (tens to low hundreds
// of entries), not whole-document diffs.
function computeLCSAnchors(fromTokens, toTokens, keyFn) {
  const n = fromTokens.length;
  const m = toTokens.length;
  const fromKeys = fromTokens.map(keyFn);
  const toKeys = toTokens.map(keyFn);

  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1);

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = fromKeys[i] === toKeys[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const anchors = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (fromKeys[i] === toKeys[j]) {
      anchors.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  return anchors;
}

// Turn a match result (fromStep/toStep tokens already keyed by matchSteps) into an
// ordered list of typed operations describing *what* happens, decoupled from *when*.
// Pure data transformation: no DOM access, so this is unit-testable in isolation.
//
//   { type: 'exit', keys: string[] }   — contiguous run (within one old line) of removed tokens
//   { type: 'move', key: string }      — one matched token, FLIP translate
//   { type: 'enter', keys: string[] }  — contiguous run (within one new line) of new tokens
//
// Batching never spans two lines, even if the runs are adjacent in overall render order,
// so a run stays tied to the line it visually belongs to.
function buildAnimationPlan(fromStep, toStep) {
  const toKeys = new Set(toStep.tokens.map(t => t.key));
  const fromKeys = new Set(fromStep.tokens.map(t => t.key));
  const plan = [];

  for (const line of fromStep.lines) {
    let run = [];
    for (const token of line) {
      if (!toKeys.has(token.key)) {
        run.push(token.key);
      } else if (run.length) {
        plan.push({ type: 'exit', keys: run });
        run = [];
      }
    }
    if (run.length) plan.push({ type: 'exit', keys: run });
  }

  for (const line of toStep.lines) {
    let run = [];
    for (const token of line) {
      if (!fromKeys.has(token.key)) {
        run.push(token.key);
        continue;
      }
      if (run.length) {
        plan.push({ type: 'enter', keys: run });
        run = [];
      }
      plan.push({ type: 'move', key: token.key });
    }
    if (run.length) plan.push({ type: 'enter', keys: run });
  }

  return plan;
}

// Resolve an animation plan into per-token timing: an ordered ("op", "key", "startMs",
// "durationMs", "easing") list. Pure data/math, no DOM. `delayExit`/`delayMove`/`delayEnter`
// are ratios of `duration` (consistent with shiki's magic-move convention), so e.g.
// `delayEnter: 0.3` starts entering tokens 30% of the duration after exits/moves begin.
// `stagger` cascades *groups* (ratio of duration per exit/enter op encountered, exit and
// enter counted separately) — every key within one group still shares that group's single
// start time, since a group is already a deliberate visual unit (typically "this whole
// line is being removed/added"), not something that should itself dissolve into a
// token-by-token trickle. So with `stagger: 0.3`, the first removed line starts exiting
// immediately, the second removed line 0.3*duration later, etc. — "remove line 2, then
// remove line 3, then move" rather than each individual token in line 2 fading in its own
// staggered turn.
// `delayContainer` is a uniform base added to every op's start (ratio of duration) — for
// subsystems with a separate container-level animation (e.g. the slide-based path's
// height transition) that all token ops should wait on by default; the div-based path
// has no such container animation, hence its default of 0.
// `reverse` mirrors the whole computed timeline (see below) — pass `true` when this plan
// is for a backward-navigation transition, so the choreography plays out time-reversed
// instead of just relabeling which ops are enter vs. exit.
//
// With every option at its default (0), every token gets startMs 0 and the same
// duration/easing — i.e. everything plays back simultaneously, matching the pre-plan
// behavior exactly for moves/enters. Exits are a deliberate exception: they previously
// had no animation at all (removed tokens vanished instantly), so scheduling them here
// is what gives them a real fade for the first time.
function scheduleAnimationPlan(plan, options = {}) {
  const {
    duration = 500,
    easing = 'ease-in-out',
    delayContainer = 0,
    delayExit = 0,
    delayMove = 0,
    delayEnter = 0,
    stagger = 0,
    reverse = false,
  } = options;

  const groupBaseDelay = { exit: delayExit, enter: delayEnter };
  const groupIndex = { exit: 0, enter: 0 };
  const scheduled = [];

  for (const op of plan) {
    if (op.type === 'move') {
      scheduled.push({
        type: 'move',
        key: op.key,
        startMs: (delayContainer + delayMove) * duration,
        durationMs: duration,
        easing,
      });
      continue;
    }

    const index = groupIndex[op.type]++;
    const startMs = (delayContainer + groupBaseDelay[op.type] + index * stagger) * duration;
    for (const key of op.keys) {
      scheduled.push({ type: op.type, key, startMs, durationMs: duration, easing });
    }
  }

  if (!reverse || scheduled.length === 0) return scheduled;

  // `fromStep`/`toStep` always mean "currently on screen" / "becoming visible" (see
  // buildAnimationPlan's caller sites), so enter/exit/move are already the right *kind*
  // of op regardless of navigation direction. But the choreography's *order* still needs
  // reversing: forward, "line 2 exits, then line 3 exits, then line 4 moves" should play
  // backward as "line 4 moves, then line 3 re-enters, then line 2 re-enters" - the moves
  // that happened last should happen first, and re-entries should replay in reverse order.
  // Reflecting every start time around the end of the timeline achieves exactly that
  // (mirror image in time) without needing separate reverse-specific ordering logic.
  const timelineEnd = Math.max(...scheduled.map(entry => entry.startMs + entry.durationMs));
  return scheduled.map(entry => ({
    ...entry,
    startMs: timelineEnd - (entry.startMs + entry.durationMs),
  }));
}

function renderStep(container, step) {
  container.innerHTML = '';
  const numbered = container.dataset.numbered === 'true';

  for (let lineIdx = 0; lineIdx < step.lines.length; lineIdx++) {
    const line = step.lines[lineIdx];

    // Create line wrapper span (like Quarto's <span id="cb1-1">)
    const lineSpan = document.createElement('span');
    lineSpan.id = `mm-${container.closest('.magic-move')?.dataset.lang || 'code'}-${lineIdx + 1}`;

    if (numbered) {
      // Quarto's numberSource CSS renders the line number from a counter that
      // increments on each direct <span> child of <code> and reads off the
      // first-child <a>'s ::before content, so the anchor must be present and
      // first for the number to show up.
      lineSpan.appendChild(document.createElement('a'));
    }

    for (const token of line) {
      const span = document.createElement('span');
      span.className = token.classes.join(' ');
      span.textContent = token.content;
      span.dataset.key = token.key;
      lineSpan.appendChild(span);
    }

    container.appendChild(lineSpan);

    // Add newline between lines (except after last line)
    if (lineIdx < step.lines.length - 1) {
      container.appendChild(document.createTextNode('\n'));
    }
  }
}

function animateToStep(container, fromStep, toStep, options = {}) {
  // reveal.js scales the whole .slides container to fit the viewport via a CSS
  // transform. getBoundingClientRect() returns already-scaled screen coordinates,
  // but a transform we apply to a token (a descendant of that scaled container)
  // gets scaled again on top of that. Dividing the measured delta by this scale
  // factor cancels that out, so the token travels the correct on-screen distance
  // instead of only `scale` of it (which otherwise makes the animation look like
  // it "jumps" most of the way instantly whenever the deck isn't at 1:1 scale).
  const scale = getRevealScale();
  const wrapper = container.closest('.magic-move-wrapper') || container.parentElement;

  // Container height animation: measure the wrapper's current ("from") height before
  // anything changes, so it can be animated to the new step's natural height below —
  // same FLIP-style measure-before/measure-after as the token positions, and anchored
  // to the same startMs 0 / `duration` timeline as token moves by default, so the box
  // and its contents visibly resize together rather than one lagging the other.
  const { duration = 500, easing = 'ease-in-out' } = options;
  const fromWrapperHeight = wrapper.getBoundingClientRect().height;

  // FLIP: First - record current positions (and keep the live span around, since
  // exit clones need to copy its rendered content before it's wiped below).
  const oldPositions = new Map();
  const currentSpans = container.querySelectorAll('span > span[data-key]');
  for (const span of currentSpans) {
    oldPositions.set(span.dataset.key, { rect: span.getBoundingClientRect(), span });
  }

  // Plan: what happens (exit/move/enter), independent of the DOM.
  // Schedule: when each of those happens, from the (possibly per-container) timing config.
  const plan = buildAnimationPlan(fromStep, toStep);
  const scheduleByKey = new Map(
    scheduleAnimationPlan(plan, options).map(entry => [entry.key, entry])
  );
  const defaultSchedule = { startMs: 0, durationMs: 500, easing: 'ease-in-out' };

  // Removed tokens are about to be wiped by the DOM swap below, so clone them onto an
  // absolutely-positioned overlay layer *before* the swap and let the clones fade out
  // independently. This is what gives exits a real animation instead of vanishing
  // instantly: the new layout below already reflects the closed gap, and the exiting
  // clone is a decoupled ghost fading on top of it.
  const wrapperRect = wrapper.getBoundingClientRect();
  const cloneAnimations = [];
  for (const op of plan) {
    if (op.type !== 'exit') continue;
    for (const key of op.keys) {
      const old = oldPositions.get(key);
      if (!old) continue;
      const sched = scheduleByKey.get(key) || defaultSchedule;

      const clone = old.span.cloneNode(true);
      clone.removeAttribute('data-key');
      clone.style.position = 'absolute';
      clone.style.margin = '0';
      clone.style.pointerEvents = 'none';
      clone.style.left = `${(old.rect.left - wrapperRect.left) / scale}px`;
      clone.style.top = `${(old.rect.top - wrapperRect.top) / scale}px`;
      wrapper.appendChild(clone);

      const anim = clone.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: sched.durationMs, delay: sched.startMs, easing: sched.easing, fill: 'backwards' }
      );
      const cleanup = () => clone.remove();
      anim.finished.then(cleanup).catch(cleanup);
      cloneAnimations.push(anim.finished.catch(() => {}));
    }
  }

  // Render new state (Last)
  renderStep(container, toStep);

  // Animate the wrapper's own height between its pre-render ("from") and just-laid-out
  // ("to") natural sizes — the container-level counterpart of the token FLIP dance
  // below. Using the same base `duration`/`easing` and no start delay means it runs on
  // exactly the same startMs-0 timeline as (default, undelayed) token moves, so the box
  // and its contents resize in lockstep rather than one lagging the other.
  const toWrapperHeight = wrapper.getBoundingClientRect().height;
  let heightAnimFinished = Promise.resolve();
  if (Math.abs(fromWrapperHeight - toWrapperHeight) > 0.5) {
    const fromHeightCSS = fromWrapperHeight / scale;
    const toHeightCSS = toWrapperHeight / scale;
    // The wrapper has a permanent `overflow: hidden` (magic-move.css) that used to
    // never actually clip anything, because the wrapper was always pre-sized to fit
    // the tallest step. Now that its height animates, a shrinking box would otherwise
    // clip an exit clone (appended into this same `wrapper` above) still fading out
    // below the new, smaller height — so overflow is relaxed for the duration of this
    // transition and restored once every clone and the height animation have settled.
    wrapper.style.overflow = 'visible';
    const heightAnim = wrapper.animate(
      [{ height: `${fromHeightCSS}px` }, { height: `${toHeightCSS}px` }],
      { duration, easing, fill: 'backwards' }
    );
    heightAnimFinished = heightAnim.finished.catch(() => {});
  }
  Promise.allSettled([...cloneAnimations, heightAnimFinished]).then(() => {
    wrapper.style.overflow = '';
  });

  // Invert & Play
  const newSpans = container.querySelectorAll('span > span[data-key]');
  for (const span of newSpans) {
    const key = span.dataset.key;
    const sched = scheduleByKey.get(key) || defaultSchedule;

    if (oldPositions.has(key)) {
      // FLIP: Invert - calculate delta and apply transform
      const oldPos = oldPositions.get(key).rect;
      const newRect = span.getBoundingClientRect();
      const deltaX = (oldPos.left - newRect.left) / scale;
      const deltaY = (oldPos.top - newRect.top) / scale;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        // Play - animate from the inverted (old) position to the final position.
        // Using the Web Animations API instead of a CSS transition avoids the FLIP
        // "invert + force reflow + flip transition on" dance, which depends on the
        // browser painting the pre-transition state before the transition is
        // switched on; that timing isn't guaranteed across browsers and can make
        // the animation appear to jump partway before smoothing out.
        span.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' }
          ],
          { duration: sched.durationMs, delay: sched.startMs, easing: sched.easing, fill: 'backwards' }
        );
      }
    } else {
      // New token - fade in. Driven by WAAPI (not the CSS `magic-enter` keyframes)
      // so its start time can be scheduled/staggered like everything else; `animation:
      // none` stops the CSS rule for `[data-entering]` from also firing and double-animating.
      span.dataset.entering = 'true';
      span.style.animation = 'none';
      span.animate(
        [
          { opacity: 0, transform: 'translateY(-10px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: sched.durationMs, delay: sched.startMs, easing: sched.easing, fill: 'backwards' }
      );
    }
  }
}

// =============================================================================
// DIV-BASED MATH MAGIC MOVE
// =============================================================================

async function initDivBasedMathMagicMove(deck) {
  const containers = document.querySelectorAll('.magic-move:not(section)');
  const mathContainers = [];

  for (const container of containers) {
    if (container.querySelector('pre code')) continue;

    // Detect math paragraphs by .math spans — present before MathJax renders
    const mathParagraphs = Array.from(container.querySelectorAll(':scope > p')).filter(p =>
      p.querySelector('.math')
    );

    if (mathParagraphs.length < 2) continue;

    // Hide non-first paragraphs IMMEDIATELY so they don't flash before MathJax runs
    for (let i = 1; i < mathParagraphs.length; i++) {
      mathParagraphs[i].style.display = 'none';
    }

    // Insert fragment markers between math steps
    for (let i = 0; i < mathParagraphs.length - 1; i++) {
      const fragment = document.createElement('span');
      fragment.className = 'fragment magic-move-step';
      fragment.dataset.fragmentIndex = i;
      mathParagraphs[i].parentNode.insertBefore(fragment, mathParagraphs[i].nextSibling);
    }

    mathContainers.push({ container, mathParagraphs });
  }

  if (mathContainers.length === 0) return;

  deck.sync();

  // Wait for MathJax to finish rendering (handles both MathJax 2 and 3)
  await waitForMathJax();

  for (const { container, mathParagraphs } of mathContainers) {
    let currentStep = 0;
    const slide = container.closest('section');

    deck.on('fragmentshown', (event) => {
      if (slide.contains(event.fragment) && event.fragment.classList.contains('magic-move-step')) {
        const nextStep = currentStep + 1;
        if (nextStep < mathParagraphs.length) {
          animateMathStep(mathParagraphs[currentStep], mathParagraphs[nextStep]);
          currentStep = nextStep;
        }
      }
    });

    deck.on('fragmenthidden', (event) => {
      if (slide.contains(event.fragment) && event.fragment.classList.contains('magic-move-step')) {
        const prevStep = currentStep - 1;
        if (prevStep >= 0) {
          animateMathStep(mathParagraphs[currentStep], mathParagraphs[prevStep]);
          currentStep = prevStep;
        }
      }
    });
  }
}

function waitForMathJax() {
  return new Promise(resolve => {
    if (window.MathJax?.startup?.promise) {
      // MathJax 3
      window.MathJax.startup.promise.then(resolve);
    } else if (window.MathJax?.Hub) {
      // MathJax 2
      window.MathJax.Hub.Queue(resolve);
    } else {
      resolve();
    }
  });
}

// MathJax 2's HTML-CSS output stacks things like fractions and scripts using
// ancestor spans with an inline `clip: rect(...)` sized exactly to their
// settled (final) layout — that's how it hides the parts of an internal
// positioning box that shouldn't paint. Our FLIP animation deliberately
// translates leaf glyphs away from that settled position, so any clip-rect
// ancestor between a glyph and toMath truncates the glyph mid-flight (looks
// like stray fragments/dots instead of the glyph sliding smoothly). Neutralize
// those clips for the duration of the animation; restore() puts them back
// once it's done. Layout is untouched (`clip` only affects painting).
function suppressMathClipping(root) {
  const clipped = [];
  let node = root;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  node = walker.nextNode();
  while (node) {
    if (node.style && node.style.clip) {
      clipped.push({ element: node, clip: node.style.clip });
      node.style.clip = 'auto';
    }
    node = walker.nextNode();
  }
  return () => {
    for (const { element, clip } of clipped) {
      element.style.clip = clip;
    }
  };
}

// Extract leaf elements (direct text, no element children) from a rendered math container
function getMathLeafElements(root) {
  const leaves = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      // MathJax 2 renders a visually-hidden screen-reader-only duplicate of
      // the whole equation (.MJX_Assistive_MathML, using the classic
      // position:absolute + clip:rect(1px,1px,1px,1px) trick) alongside the
      // visible glyphs. It carries the same text content as the real glyphs
      // (e.g. "y", "x") but sits at unrelated screen coordinates, so if a
      // leaf came from here, text-based matching could pair a visible glyph
      // with this duplicate's position instead of its real prior spot,
      // producing a bogus FLIP delta. Reject the whole subtree so it's never
      // collected as a leaf.
      if (node.classList?.contains('MJX_Assistive_MathML') || node.classList?.contains('MathJax_Preview')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    const children = Array.from(node.childNodes);
    const hasDirectText = children.some(
      c => c.nodeType === Node.TEXT_NODE && c.textContent.trim().length > 0
    );
    const hasElementChild = children.some(c => c.nodeType === Node.ELEMENT_NODE);
    if (hasDirectText && !hasElementChild) {
      leaves.push({ element: node, text: node.textContent.trim() });
    }
    node = walker.nextNode();
  }
  return leaves;
}

function animateMathStep(fromPara, toPara) {
  // Support both MathJax 2 (.MathJax_Display) and MathJax 3 (mjx-container)
  const fromMath = fromPara.querySelector('.MathJax_Display, .MathJax, mjx-container');
  const toMath = toPara.querySelector('.MathJax_Display, .MathJax, mjx-container');

  if (!fromMath || !toMath) {
    fromPara.style.display = 'none';
    toPara.style.display = '';
    return;
  }

  // First: record positions of all leaf elements in the visible (from) step
  const fromLeaves = getMathLeafElements(fromMath);
  const fromPositions = new Map();
  for (const leaf of fromLeaves) {
    fromPositions.set(leaf, leaf.element.getBoundingClientRect());
  }

  // Make toStep temporarily visible but off-screen to measure positions
  toPara.style.display = '';
  toPara.style.visibility = 'hidden';
  toPara.style.position = 'absolute';
  toPara.style.top = '0';
  toPara.style.left = '0';

  const toLeaves = getMathLeafElements(toMath);
  const toPositions = new Map();
  for (const leaf of toLeaves) {
    toPositions.set(leaf, leaf.element.getBoundingClientRect());
  }

  // Match by text content, pairing within each same-text group by index
  const fromByText = new Map();
  for (const leaf of fromLeaves) {
    if (!fromByText.has(leaf.text)) fromByText.set(leaf.text, []);
    fromByText.get(leaf.text).push(leaf);
  }
  const toByText = new Map();
  for (const leaf of toLeaves) {
    if (!toByText.has(leaf.text)) toByText.set(leaf.text, []);
    toByText.get(leaf.text).push(leaf);
  }

  const flips = [];
  const matchedToElements = new Set();

  for (const [text, fromGroup] of fromByText) {
    const toGroup = toByText.get(text) || [];
    const count = Math.min(fromGroup.length, toGroup.length);
    for (let i = 0; i < count; i++) {
      const fromPos = fromPositions.get(fromGroup[i]);
      const toPos = toPositions.get(toGroup[i]);
      if (fromPos && toPos) {
        flips.push({
          element: toGroup[i].element,
          deltaX: fromPos.left - toPos.left,
          deltaY: fromPos.top - toPos.top
        });
        matchedToElements.add(toGroup[i].element);
      }
    }
  }

  // Switch: hide from, restore to to normal flow
  fromPara.style.display = 'none';
  toPara.style.visibility = '';
  toPara.style.position = '';
  toPara.style.top = '';
  toPara.style.left = '';

  const restoreMathClipping = suppressMathClipping(toMath);

  // Invert: shift matched elements back to their old screen positions
  for (const flip of flips) {
    if (Math.abs(flip.deltaX) > 0.5 || Math.abs(flip.deltaY) > 0.5) {
      flip.element.style.display = 'inline-block';
      flip.element.style.transform = `translate(${flip.deltaX}px, ${flip.deltaY}px)`;
      flip.element.style.transition = 'none';
    }
  }
  // Fade in unmatched (new) elements
  for (const leaf of toLeaves) {
    if (!matchedToElements.has(leaf.element)) {
      leaf.element.style.display = 'inline-block';
      leaf.element.style.opacity = '0';
    }
  }

  toPara.offsetHeight; // force reflow

  // Play: animate to final positions
  for (const flip of flips) {
    if (Math.abs(flip.deltaX) > 0.5 || Math.abs(flip.deltaY) > 0.5) {
      flip.element.style.transition = 'transform 0.5s ease-in-out';
      flip.element.style.transform = '';
    }
  }
  for (const leaf of toLeaves) {
    if (!matchedToElements.has(leaf.element)) {
      leaf.element.style.transition = 'opacity 0.5s ease-in-out';
      leaf.element.style.opacity = '';
    }
  }

  setTimeout(() => {
    for (const leaf of toLeaves) {
      leaf.element.style.transform = '';
      leaf.element.style.transition = '';
      leaf.element.style.opacity = '';
      leaf.element.style.display = '';
    }
    restoreMathClipping();
  }, 600);
}

// Expose the pure (DOM-free) plan/schedule functions to `node --test` unit tests.
// Harmless in the browser: `module` is undefined there, so this branch never runs.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildAnimationPlan, scheduleAnimationPlan, matchSteps, computeTokenAlignment, normalizeMagicMoveKeys };
}
