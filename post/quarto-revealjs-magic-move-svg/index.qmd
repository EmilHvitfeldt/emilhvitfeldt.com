---
title: 'quarto-revealjs-magic-move now animates plots, not just code'
description: |
  quarto revealjs Magic Move now has plotting-library svg support! so ggplot2, matplotlib, and other plot output can morph between slides too
date: '2026-09-25'
categories:
 - quarto
 - slidecraft 101
---

Back in [my last post](/post/quarto-revealjs-magic-move-announcement/) I introduced [quarto-revealjs-magic-move](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move).
An extension to create Keynote-styled Magic Move transitions for code chunks.

This sparked an idea,
could we extend this to charts?
The answer is yes!

## Simple example

In this example we have two ggplots,
with the only difference being the slope set for `geom_abline()`.

To make this work for Magic Move we need 2 things.
First we need to make sure that the resulting chart is rendered as an svg.
We do this by setting `#| dev: svg` in the chunk.
The second thing we need is to give both the slides the `.magic-move` class.

````markdown
## Slope = 20 {.magic-move}

```{{r}}
#| dev: svg
library(ggplot2)
mtcars |>
  ggplot(aes(mpg, disp)) +
  geom_point(size = 5) +
  geom_abline(slope = 20, intercept = 0, linewidth = 5, color = "pink") +
  theme_minimal(base_size = 16) +
  lims(x = c(10, 35), y = c(100, 500))
```

## Slope = 10 {.magic-move}

```{{r}}
#| dev: svg
library(ggplot2)
mtcars |>
  ggplot(aes(mpg, disp)) +
  geom_abline(slope = 10, intercept = 0, linewidth = 5, color = "pink") +
  geom_point(size = 5) +
  theme_minimal(base_size = 16) +
  lims(x = c(10, 35), y = c(100, 500))
```
````

And now when you advance between the slides you will have smooth animation of the abline changing between the two charts.

<iframe class="slide-deck" src="_svg-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

## Bubbles moving through time

We can do more.
Let us try to reproduce Hans Rosling's famous Gapminder bubble chart.

````markdown
## 1952 {.magic-move}

```{{r}}
#| dev: svg
library(ggplot2)
library(gapminder)

gapminder |>
  dplyr::filter(year == 1952) |>
  dplyr::arrange(country) |>
  ggplot(aes(gdpPercap, lifeExp, size = pop, color = continent)) +
  geom_point(alpha = 0.7) +
  scale_x_log10(limits = c(200, 120000)) +
  scale_y_continuous(limits = c(20, 85)) +
  scale_size(range = c(1, 20), limits = c(60000, 1350000000), guide = "none") +
  theme_minimal(base_size = 16) +
  theme(legend.position = "none") +
  labs(x = "GDP per capita", y = "Life expectancy", color = NULL)
```

## 1982 {.magic-move}

```{{r}}
#| dev: svg
# same code, filtered to year == 1982
```

## 2007 {.magic-move}

```{{r}}
#| dev: svg
# same code, filtered to year == 2007
```
````

<iframe class="slide-deck" src="_svg-shape-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

There are a couple of things we will have to do to make the best of these effects.
One of them is to keep the axis limits and size scale fixed across all three plots.

## Is this perfect?

Not.

## Caveats

This extension works by matching elements in the produced svg.
But they often don't contain any metadata we can anchor on to, so we are relying mostly on shapes and positions.
This is why we didn't use a legend in the second example.
The circles in the legend confused the algorithm and it tried treating them as real data points,
moving them around in ways it shouldn't.

Another thing you can do to help is to make sure that the data is in the right order.
The extension cannot see which circle is which country,
just which one is first, second, and so on.
So if you are inconsistently ordering the rows of the data that is passed into your plotting library,
then you are getting incorrect matches.

## Supported libraries

This works with any plotting library whose SVG output uses plain,
literal shape elements with stable attributes across renders.
I've verified it against:

- **R**: ggplot2, grid, base R graphics, and lattice, all via R's `dev: svg` Cairo device
- **Python**: matplotlib, seaborn, and plotnine for bar/line/area marks (not scatter/point markers, see below), plus Altair with `alt.renderers.enable("svg")`
- **Julia**: CairoMakie, and Plots.jl with the GR backend (`Plots.gr(fmt = :svg)`)

You can find runnable examples for all of these in the [repo](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move).

## Feedback

As always, the extension is still young.
If you try it on a plotting library not listed above, 
or run into a chart that animates strangely, [open an issue](https://github.com/EmilHvitfeldt/quarto-revealjs-magic-move/issues).
