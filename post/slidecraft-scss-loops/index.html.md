---
title: 'Slidecraft 101: Creative uses of SASS loops'
description: |
  Using nested for loops in SASS to create many CSS classes
date: '2024-07-07'
categories:
  - slidecraft 101
  - quarto
image: "featured.webp"
---




Hello and welcome back to my multi-part series about what I like to call **slidecrafting**; The art of putting together slides that are functional and aesthetically pleasing. I will be using [quarto presentations](https://quarto.org/). This is the ninth post, you can find all other posts in the [slidecraft 101](../../project/slidecraft-101/index.qmd#blog-posts) project.

In [Slidecraft 101: Better SCSS files](../slidecraft-scss-uses/index.qmd) I first started using SASS to its fullest, and this blog post will explore one additional use-case I left out from that blog post.

## Using nested loops to create classes

We saw in [Slidecraft 101: Better SCSS files - using each](../slidecraft-scss-uses/index.qmd#using-each-to-automatically-create-classes) how we could `loop` over a map of colors to create a number of CSS classes. And we don't have to stop there, we could just as well nest the loops to create any number of combinations

In our first example, I want a fun gradient shadow/highlight effect for text. We can get that effect using something like following

```css
background-image: linear-gradient(90deg, yellow, blue);
background-size: 100% 42%;
background-repeat: no-repeat;
background-position: 0 85%;
width: fit-content;
```

I want it to work on both inline text and as a way to handle the header, the selectors for that would be `span.my-class` and `.my-class > h2` respectively.


```css
span.my-class, .my-class > h2 {
  background-image: linear-gradient(90deg, yellow, blue);
  background-size: 100% 42%;
  background-repeat: no-repeat;
  background-position: 0 85%;
  width: fit-content;
}
```

And them we fill in the rest, using the [@each](https://sass-lang.com/documentation/at-rules/control/each/#with-maps) command twice nestedly over a map of colors.

```scss
/*-- scss:defaults --*/

$colors: (
  "red": #FFADAD, 
"orange": #FFD6A5, 
  "yellow": #FDFFB6, 
  "blue": #aad2e7, 
  "purple":#b4addd
);

/*-- scss:rules --*/

@each $name1, $col1 in $colors {
  @each $name2, $col2 in $colors {
    span.hl-#{$name1}-#{$name2}, .hl-#{$name1}-#{$name2} > h2 {
      background-image: linear-gradient(90deg, $col1, $col2);
      background-size: 100% 42%;
      background-repeat: no-repeat;
      background-position: 0 85%;
      width: fit-content;
    }
  }
}
```

I know we are creating some non-interesting classes such as `.hl-yellow-yellow` but for what we are doing, the tradeoff between avoiding them and how little it impacts us to have them. I think it is a worthwhile tradeoff.

::: {.callout-important}
The slides in this post are interactive, advance them to see the other classes.
:::

<iframe class="slide-deck" src="_tip-1.html">

</iframe>

<a href="_tip-1.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_tip-1.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

::: {.callout-note}
You don't need these compound classes for everything. For example, the class `.hl-green-bold` isn't going to be useful as you could just as easily create `.hl-green` and `.bold` separately. This trick works best when two elements are used together in a tightly coupled way, such as in gradients. 
:::

For our second example, we are continuing with the gradients, but instead trying to apply them to the background. My goal was to add a gradient line to the right side of the slide. 

I was able to create that effect, by layering 2 gradients on top of each other. The first gradient contained the two colors I was interested in, and the names of the class. The second layer, which I placed on top, goes from white to transparent. I set up the transition between those two colors to be super sharp, resulting in the effect you see below

<iframe class="slide-deck" src="_tip-2.html">

</iframe>

<a href="_tip-2.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_tip-2.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

since we are doing something interesting, we could also have used a separate `$colors` map just for this effect to not interfere with what else we are doing.

## Roundup

Is this the most useful thing I have shown so far? properly not, but I find it interesting and it is a quick way to spice up these slides.
