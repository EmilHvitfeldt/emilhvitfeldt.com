---
title: 'Introducing quarto-revealjs-magic-move'
description: |
  A new Quarto revealjs extension for Magic Move-style animated transitions between code blocks, with configurable animation timing
date: '2026-09-19'
categories:
 - quarto
 - slidecraft 101
image: "featured.webp"
---

I'm happy to announce a new Quarto revealjs extension: [quarto-revealjs-magic-move](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move). It brings [Magic Move](https://slidevjs.com/features/magic-move.html)-style animated transitions to revealjs presentations. Instead of hard-cutting between two versions of a code block, the parts that are the same slide/move into their new position, and only the parts that actually changed fade in or out. It's built entirely on Quarto's native syntax highlighting, with no external JavaScript dependencies.

This is the first announcement post for the extension, so I'll cover everything: installation, both ways of authoring a sequence, how the matching works, and how to configure animation timing.

## Installing and basic usage

```bash
quarto add emilhvitfeldt/quarto-revealjs-magic-move
```

Then add `magic-move` to the `revealjs-plugins` field of your YAML.

```yaml
---
format: revealjs
revealjs-plugins:
  - magic-move
---
```

There are two ways to mark up a magic-move sequence.

### Div-based (fragments)

Wrap consecutive code blocks in a `magic-move` fenced div. Each block becomes a step, and pressing space/arrow keys steps through the animation as fragments on one slide.

````markdown
::: magic-move

```javascript
if (condition) a else b
```

```javascript
if (condition) {
  a
} else {
  b
}
```

```javascript
function example() {
  if (condition) {
    a
  } else {
    b
  }
}
```

:::
````

<iframe class="slide-deck" src="_code-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

### Slide-based

Add the `.magic-move` class to consecutive slide headers instead. Each slide is a full step, and the animation plays as you navigate from one slide to the next. A slide without `.magic-move` breaks the sequence, so you can freely mix animated and regular slides. Same three steps as above, just spread across slides instead of fragments on one slide:

`````markdown
## Step 1 {.magic-move}

```javascript
if (condition) a else b
```

## Step 2 {.magic-move}

```javascript
if (condition) {
  a
} else {
  b
}
```

## Step 3 {.magic-move}

```javascript
function example() {
  if (condition) {
    a
  } else {
    b
  }
}
```
`````

<iframe class="slide-deck" src="_slide-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

Any language Quarto highlights works, and unchanged pieces stay anchored in place rather than fading out and back in just because something nearby changed. Here's how that matching is actually done.

## How it works

The interesting part is figuring out which token in the old step corresponds to which token in the new step, so the right pieces slide instead of fading in/out for no reason. The whole pipeline runs once per step transition and never looks beyond the pair of steps it's currently animating between.

### Tokenizing

Quarto's syntax highlighter hands over tokens grouped by syntax class (an identifier, an operator, a string, ...), which is coarser than what you'd want to animate. A call like `mean(x)` arrives as a small handful of highlighter tokens, but `mean(x)` and `mean(x, na.rm = TRUE)` share the `mean(x` part exactly, and it would look wrong for all of it to fade out and a whole new `mean(x, na.rm = TRUE)` to fade in just because one argument was added. So before matching runs, every token is split further on delimiters, parentheses, brackets, commas, and whitespace, giving a finer stream like `mean`, `(`, `x`, `)` instead of one opaque chunk.

### Pass 1: whole-line matching

Each line in the new step is first compared, as a whole, against every line in the old step, using an exact signature of its content and syntax classes. If a match is found, every token in that line is bound directly to its counterpart in the old line, and the whole line is done, no further diffing needed.

This pass exists specifically to handle **reordering**. Say a step swaps two independent statements:

```r
# old step
x <- 1
y <- 2

# new step
y <- 2
x <- 1
```

Without a whole-line pass, a generic diff would treat `y <- 2` as "removed from line 2" and "added at line 1", i.e. two separate fade in/out events, even though it's really one line sliding up. Because `y <- 2` matches exactly (same text, same highlighting classes) against a line in the old step, every one of its tokens gets bound to their old counterparts up front, and it renders as one clean upward slide instead.

### Pass 2: token-level alignment (LCS)

Whatever lines *didn't* match wholesale in pass 1, because something on the line actually changed, get diffed at the token level, using the [longest common subsequence](https://en.wikipedia.org/wiki/Longest_common_subsequence) (LCS) between the old and new token lists for that line. LCS finds the largest set of tokens that can stay in the same relative order in both lists; those become **anchor points**. Take the argument-insertion example from above:

```
old tokens:  mean  (  x            )
new tokens:  mean  (  x  ,  na.rm  =  TRUE  )
```

The longest common subsequence here is `mean`, `(`, `x`, `)` — every one of those appears in both lists, in the same relative order, so each becomes an anchor bound directly to its old counterpart. That leaves a gap between the `x` anchor and the `)` anchor in the new list, `, na.rm = TRUE`, which has no counterpart in the old list at all, so it's marked new and fades in. Nothing has to be told "an argument was inserted"; that behavior falls out of the anchors leaving exactly one unmatched gap.

A line can have more than one gap, and a gap can appear on either side. Anything left over after the anchors, on the old side, is marked removed and fades out; on the new side, marked new and fades in. Whichever tokens *did* get matched, whether by the whole-line pass or an LCS anchor, animate a move: a classic [FLIP](https://aerotwist.com/blog/flip-your-animations/) transition that measures the old position, renders the new layout, and animates the delta between them.

One more worked example, this time a deletion spanning whole lines:

```r
# old step
a <- 1
b <- 2
c <- 3
d <- 4

# new step
a <- 1
d <- 4
```

`a <- 1` and `d <- 4` both match whole lines in pass 1 (`d <- 4` slides up rather than being treated as "a new `d <- 4` appearing" at the bottom). `b <- 2` and `c <- 3` have no counterpart anywhere in the new step, so every one of their tokens ends up unmatched and marked removed. This is the exact example used for the staggered-exit demo further down: two independent removed lines, and nothing in the matching step decides *when* they fade, only *that* they're the ones fading.

That last point matters: matching only decides *what* corresponds to what. It doesn't decide *when* each animation plays; that's a separate step, described next.

## Configurable animation timing

By default, everything above plays back the same way: whatever moved, appeared, or disappeared between two steps animates all at once, over 500ms. That's a fine default, but sometimes you want more control over the choreography, for example fading out a deleted block *before* the following lines slide up to fill the gap, instead of everything happening at the same time.

Both div-based and slide-based support a small timing configuration surface, set as plain attributes on the `.magic-move` container (or on a `{.magic-move}` slide header):

- `duration` — animation length in ms
- `easing` — any CSS easing function
- `delay-exit`, `delay-move`, `delay-enter` — ratios of `duration` that offset when each kind of change starts
- `stagger` — ratio of `duration` to cascade successive same-type groups, so, e.g., each deleted line fades out one after another instead of all at once

Values can be unquoted as long as they don't contain whitespace, so `stagger=0.3` and `stagger="0.3"` are equivalent.

Here's the same insertion/deletion sequence played three ways: the default (everything at once), a staggered exit where each deleted line fades out on its own before the remaining code slides up, and a delayed entrance where new code waits until the move has mostly settled before fading in.

````markdown
::: {.magic-move delay-exit=0 stagger=0.3 delay-move=1.3}

```r
a <- 1
b <- 2
c <- 3
d <- 4
```

```r
a <- 1
d <- 4
```

:::
````

The same options work as slide-header attributes for the slide-based syntax too:

`````markdown
## Step 1 {.magic-move delay-exit=0 stagger=0.3 delay-move=1.3}

```r
a <- 1
b <- 2
c <- 3
d <- 4
```

## Step 2 {.magic-move delay-exit=0 stagger=0.3 delay-move=1.3}

```r
a <- 1
d <- 4
```
`````

<iframe class="slide-deck" src="_timing-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

The deck above has both versions back to back, so you can step through and compare. Step backward through either staggered-exit sequence and the choreography properly time-reverses too: the move happens first, then the two deleted lines reappear in reverse order, rather than replaying forward in the same order.

Deleted code fades out too, rather than vanishing the instant the next step renders: both the div-based and slide-based paths clone exiting tokens onto an overlay and fade them out, whether or not you configure any custom timing.

## Limitations

- Token matching is content-based; significantly different code may fade in/out instead of animating smoothly.
- Coarse tokenization from Quarto's syntax highlighter means very fine-grained punctuation animation isn't always perfect.
- This post only covers code. The extension can also morph MathJax equations and SVG output (e.g. `dev: svg` ggplot2/grid graphics) between steps, but neither of those paths (including the timing options above, which are code-only) is polished enough yet to cover here. If you want to experiment anyway, the code and examples are in the [repo](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move), but expect rough edges.
- Div-based and slide-based share the same token matching and timing model, but aren't pixel-identical yet: div-based detects a line that moved without changing and slides it as one block, while slide-based doesn't have that pass yet and may fragment the same reorder into smaller per-token moves. Slide-based also animates its container's height between steps (since it's bridging two differently-sized slides), which div-based doesn't need to do. Tracked in [issue #3](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move/issues/3).
- Only the per-container attribute syntax shown above actually works. A deck-wide default set through the document's YAML doesn't currently reach the browser, since Quarto's revealjs format only forwards recognized reveal.js options into its config. Tracked in [issue #4](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move/issues/4).

## Feedback

The extension is still young, so if you run into a diff that animates weirdly, or have ideas for what else the timing configuration should support, [open an issue](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move/issues). You can see more runnable examples in the [repo](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move) and on the [example site](https://emilhvitfeldt.github.io/quarto-revealjs-magic-move/).
