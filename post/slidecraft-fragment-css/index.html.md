---
title: 'Slidecraft 101: Fragments - CSS'
description: |
 Fragments are powerful tools in revealjs to allow for changes within slides
date: '2024-08-21'
categories:
  - slidecraft 101
  - quarto
image: "featured.webp"
---




Hello and welcome back to my multi-part series about what I like to call **slidecrafting**; The art of putting together slides that are functional and aesthetically pleasing. I will be using [quarto presentations](https://quarto.org/). This is the twelfth post, you can find all other posts in the [slidecraft 101](../../project/slidecraft-101/index.qmd#blog-posts) project.

This is the first of two blog posts talking about [fragments](https://quarto.org/docs/presentations/revealjs/advanced.html#fragments). They are used to incrementally make things appear on your slides, or as a way to do highlighting. If you are not already familiar with fragments, I recommend that you follow the link and read the section about them before moving on with this blog post.

## Fragments 101

At the most fundamental level, a fragment can be split into 3 stages

- before
- current
- after

determining which stage is handled completely by revealjs using the `fragment-index` attribute. The way we can make things happen is to apply a different style to each of the 3 stages.

the maximal fragment signature is as follows, with `fragment-name` being the name of the fragment in question. For them to work properly you have to list them in the following order. Which corresponds to `before`, `after`, and `current`.

```css
.reveal .slides section .fragment.fragment-name {
}

.reveal .slides section .fragment.fragment-name.visible {
}

.reveal .slides section .fragment.fragment-name.current-fragment {
}
```

:::: {.callout-important}
The reason why this ordering is important is because `.visible` and `.current-fragment` are triggered at the same time. And because I simplified the order a little too much. There isn't `before`, `current`, and `after`. Instead, we have `always`, `current`, and `not-before-current`. In essence, they do the same, as long as you order them in this order to make sure they cascade properly.
:::

Before we try to implement a fragment by ourselves, we need to note one thing real quick. Each of these stages is styled a [specific way by default](https://github.com/quarto-dev/quarto-cli/blob/39dc173c4869ebaf4d6bb087a972acb87533b64e/src/resources/formats/revealjs/reveal/css/reveal.scss#L51-L65). In practice, what this means is that the `before` style has the following attributes set to make the text invisible:

```css
opacity: 0;
visibility: hidden;
```

If you want the text to be visible before the fragment triggers, simply set these two attributes to `unset`.

Another note I would like to add is that while you are able to modify anything in a fragment, as it is just triggering CSS, you should be careful about position and size. While you might be able to make it work, it is likely to cause a lot of shifting and jittering as elements resize.

:::: {.callout-tip}
Looking at the [source code](https://github.com/quarto-dev/quarto-cli/blob/39dc173c4869ebaf4d6bb087a972acb87533b64e/src/resources/formats/revealjs/reveal/css/reveal.scss#L67-L207) for the default fragments gives us a good idea for how different styles of fragments work.
:::

## Example 1

This first example illustrates how the different phases work in a fragment. We have thus created an `rgb` fragment that assigns a different color to each of the 3 phases. We `unset` both `opacity` and `visibility` to have the text appear beforehand. This leaves us with the following fragment:

```scss
.reveal .slides section .fragment.rgb {
  opacity: unset;
  visibility: unset;
  color: red;
}

.reveal .slides section .fragment.rgb.visible {
  color: blue;
}

.reveal .slides section .fragment.rgb.current-fragment {
  color: green;
}
```

Advancing and de-advancing(?) the slides showcase how the different classes are applied for fragments.

<iframe class="slide-deck" src="_fragment-rgb.html">
</iframe>

<a href="_fragment-rgb.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_rgb.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

Worth noting that this single fragment could be rewritten as the following using SCSS nesting.

```scss
.reveal .slides section .fragment.rgb {
  opacity: unset;
  visibility: unset;
  color: red;

  &.visible {
    color: blue;
  }

  &.current-fragment {
    color: green;
  }
}
```

## Example 2

One custom fragment I use from time to time is the background highlighted style. And it is very simple, instead of changing the color of the text, it changes the background color. I find that it is a much stronger indication than changing the text itself.

This fragment gives us two things. I leave the text visible beforehand. Then it turns the background orange, and after it lightens the background color a little bit.

```scss
$theme-orange: #FFB81A;

.reveal .slides section .fragment.hl-orange {
  opacity: unset;
  visibility: unset;

  &.visible {
    background-color: $theme-orange;
  }

  &.current-fragment {
    background-color: darken($theme-orange, 10%);
  }
}
```

This once is nice and flexible because it is easy to extend.

```scss
$theme-orange: #FFB81A;
$theme-yellow: #FFD571;
$theme-brown: #E2AE86;
$theme-pink: #FED7E1;

.reveal .slides section .fragment {

  &.hl-orange,
  &.hl-yellow,
  &.hl-pink,
  &.hl-brown {
    opacity: 1;
    visibility: inherit
  }

  &.hl-brown.visible {
    background-color: $theme-brown;
  }

  &.hl-brown.current-fragment {
    background-color: darken($theme-brown, 10%);
  }

  &.hl-orange.visible {
    background-color: $theme-orange;
  }

  &.hl-orange.current-fragment {
    background-color: darken($theme-orange, 10%);
  }

  &.hl-yellow.visible {
    background-color: $theme-yellow;
  }

  &.hl-yellow.current-fragment {
    background-color: darken($theme-yellow, 10%);
  }

  &.hl-pink.visible {
    background-color: $theme-pink;
  }

  &.hl-pink.current-fragment {
    background-color: darken($theme-pink, 10%);
  }
}
```

And we are willing to tap into some scss we can condense it down quite a lot using [SCSS loops](../slidecraft-scss-loops/index.qmd).

```scss
$colors: (
  "orange": #FFB81A,
  "yellow": #FFD571,
  "brown": #E2AE86,
  "pink": #FED7E1
);

@each $name, $color in $colors {
  .reveal .slides section .fragment.hl-#{$name} {
    opacity: unset;
    visibility: unset;

    &.visible {
      background-color: lighten($color, 5%);
    }

    &.current-fragment {
      background-color: $color;
    }
  }
}
```

<iframe class="slide-deck" src="_fragment-highlighter.html">
</iframe>

<a href="_fragment-highlighter.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_highlighter.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

## Example 3

The last example included a bit of flair by having the current fragment element be a slightly different color and then changing it after. We can simplify it a bit by not specifying the `.current-fragment` class.

```scss
$theme-orange: #FFB81A;

.reveal .slides section .fragment.hl-orange {
  opacity: unset;
  visibility: unset;

  &.visible {
    background-color: $theme-orange;
  }
}
```

This fragment works more or less the same way as before but doesn't change color once it is applied. It will be a more appropriate fragment many times.

This leads us to our final piece of knowledge in this blog post. We don't have to fully specify a fragment. We just have to declare how we want it to behave differently, and then the default "stay hidden, then appear" fragment.

## Roundup

I hope you learned a lot, I sure have!
