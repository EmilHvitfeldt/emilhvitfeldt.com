---
title: 'Introducing quarto-revealjs-magic-move'
description: |
  A new Quarto revealjs extension for Magic Move-style animated transitions between code blocks
date: '2026-09-22'
categories:
 - quarto
 - slidecraft 101
image: "featured.webp"
---

I'm happy to announce a new Quarto revealjs extension: [quarto-revealjs-magic-move](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move).
It brings Keynote-styled Magic Move animated transitions to revealjs presentations.
This allows for a smoother animation of changes to code chunks.
Code will be rearranged in a visually pleasing way instead of just fading in and out.

This is the first public announcement,
I'm sure there are many bugs and edge-cases I haven't found yet.
please contact me with any and all that you find!

## Installing

To install make the following call in your terminal.

```bash
quarto add emilhvitfeldt/quarto-revealjs-magic-move
```

Then add `magic-move` to the `revealjs-plugins` field of your YAML of the .qmd file.

```yaml
---
format: revealjs
revealjs-plugins:
  - magic-move
---
```

## Usage and syntax

Beyond the functionality,
the main priority of this extension was to make the syntax as easy as possible.
There are two main ways to create a magic-move sequence.
Slide based and div-based.

### Div-based

Within a single slide,
Wrap consecutive code blocks in a `magic-move` fenced div.

Advancing within that slide will then animate between each code chunk.

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

Alternatively, you can add the `.magic-move` class to consecutive slide headers instead.
The below syntax will produce the same animation sequence as before,
but will be counted as multiple separate slides between animated between.
This syntax follows many of the same principles as the one for [auto-animate](https://quarto.org/docs/presentations/revealjs/advanced.html#auto-animate).


::: {.callout-note}

Yes, I tried making this work natively through auto-animate.
I couldn't get it to work.

:::


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

## Configurable animation timing

By default, 
every change between two steps plays back the same way.
All elements will be moved, appeared, or disappeared,
all at once over 500ms.

We can modify this a little bit to change up how the animation is happening.
The following arguments can be set as attributes when you add `.magic-move`.

- `duration`: animation length in ms
- `easing`: any CSS easing function
- `delay-exit`, `delay-move`, `delay-enter`: ratios of `duration` that offset when each kind of change starts
- `stagger`: ratio of `duration` to cascade successive same-type groups, so, e.g., each deleted line fades out one after another instead of all at once

Values can be unquoted as long as they don't contain whitespace, 
so `stagger=0.3` and `stagger="0.3"` are equivalent.

In the following example we have the following sequence of events happening,
one after another.

- line 2 disappears
- line 3 disappears
- line 4 is moved up to fill the empty room

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

## Feedback

The extension is still young, so if you run into a diff that animates weirdly, or have ideas for what else the timing configuration should support, [open an issue](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move/issues).
You can see more runnable examples in the [repo](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move) and on the [example site](https://emilhvitfeldt.github.io/quarto-revealjs-magic-move/).

## How it works

For the rest of this post I'll run down how we made this possible.
You don't need to read any of this to be able to use the extension,
this is just for fun and curiosity.

The interesting part is figuring out which token in the before state corresponds to which token in the after state, 
so the right pieces slide instead of fading in/out for no reason.
The whole pipeline runs once per step transition and never looks beyond the pair of states it's currently animating between.

### Phase 0: Tokenizing

Quarto's syntax highlighter hands over tokens grouped by syntax class (an identifier, an operator, a string, ...), which is coarser than what you'd want to animate.
This is a problem,
because it means that `mean(x)` and `mean(x, na.rm = TRUE)` share the `mean(x` part exactly, and it would look wrong for all of it to fade out and a whole new `mean(x, na.rm = TRUE)` to fade in just because one argument was added.
So before matching runs, every token is split further on delimiters, parentheses, brackets, commas, and whitespace, giving a finer stream like `mean`, `(`, `x`, `)` instead of one opaque chunk.

### Pass 1: whole-line matching

Each line in the after state is first compared,
against every line in the before state, 
using an exact signature of its content and syntax classes.
If a match is found, 
every token in that line is bound directly to its counterpart in the before line,
and the whole line is done, no further diffing needed.

This pass exists specifically to handle **reordering**.
To make sure that these will be treated correctly.

```r
# before
x <- 1
y <- 2

# after
y <- 2
x <- 1
```

### Pass 2: token-level alignment (LCS)

Whatever lines *didn't* match wholesale in pass 1,
because something on the line actually changed,
get diffed at the token level,
using the [longest common subsequence](https://en.wikipedia.org/wiki/Longest_common_subsequence) (LCS) between the before and after token lists for that line.
LCS finds the largest set of tokens that can stay in the same relative order in both lists.
Those become **anchor points**.
Take the argument-insertion example from above:

```
before tokens:  mean  (  x            )
after tokens:   mean  (  x  ,  na.rm  =  TRUE  )
```

The longest common subsequence here is `mean`, `(`, `x`, `)`.
Every one of those appears in both lists, in the same relative order, 
so each becomes an anchor bound directly to its before counterpart.
That leaves a gap between the `x` anchor and the `)` anchor in the after list, `, na.rm = TRUE`, 
which has no counterpart in the before list at all, so it's marked new and fades in.
Nothing has to be told "an argument was inserted".
That behavior falls out of the anchors leaving exactly one unmatched gap.

A line can have more than one gap, and a gap can appear on either side.
Anything left over after the anchors,
on the before side, 
is marked removed and fades out. On the after side, marked new and fades in.
Whichever tokens *did* get matched, whether by the whole-line pass or an LCS anchor, animate a move.
A classic [FLIP](https://aerotwist.com/blog/flip-your-animations/) transition that measures the before position, renders the after layout, and animates the delta between them.
