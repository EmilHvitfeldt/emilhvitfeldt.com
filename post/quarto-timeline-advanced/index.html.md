---
title: 'Three advanced quarto-timeline examples'
description: |
  Pushing quarto-timeline past the basics with three worked examples: tessellated hex stickers, live plots rendered inside events, and mixed-media magazine cards.
date: '2026-06-03'
categories:
  - quarto
  - slidecraft 101
image: "featured.webp"
filters:
  - timeline
---

```{=html}
<style>
/* Example 1 — hex stickers */
.timeline .event img.hex {
  /* R hex stickers are pointy-top: PNG height is point-to-point,
     width is flat-edge to flat-edge (height / width == 2 / sqrt(3)). */
  height: 72px;
  width: auto;
  margin: 0;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}
.timeline .event .hexrow > p {
  display: flex;
  gap: 0;          /* vertical flat edges meet, so the row tessellates */
  margin: 0;
}
.timeline .event .hexrow + .hexrow {
  margin-top: -18px;   /* pull the next row up by 1/4 of the hex height */
}
.timeline .event .hexrow.offset > p {
  margin-left: 31px;   /* shift by half a hex width so points interlock */
}
/* Left-side events (.vertical-alt odd) hug the timeline: right-align the comb */
.timeline.vertical-alt .event:nth-child(odd) .hexrow > p {
  justify-content: flex-end;
}
.timeline.vertical-alt .event:nth-child(odd) .hexrow.offset > p {
  margin-left: 0;
  margin-right: 31px;
}

/* Example 2 — plots rendered inside events */
.analysis .event img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Example 3 — composite "magazine" cards */
.olympics .event .mag {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.olympics .event .mag > .quarto-figure {   /* the flag, wrapped by Quarto */
  margin: 0;
  flex: 0 0 auto;
}
.olympics .event .mag > .quarto-figure figure,
.olympics .event .mag > .quarto-figure p { margin: 0; }
.olympics .event img.flag {
  width: 160px;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  display: block;
}
.olympics .event .mag-body { flex: 1 1 auto; }
.olympics .event .mag-body h4 { margin: 0 0 0.15rem; }
.olympics .event .mag-body p { margin: 0.1rem 0; }
.olympics .event .mag-body .stat { font-size: 1.05rem; }
.olympics .event .mag-body img { max-width: 100%; }   /* the sparkline */
</style>
```

A little while back I [announced quarto-timeline](../quarto-timeline/),
a Quarto extension for styled timelines.
The announcement post walked through the layouts, modifiers, and CSS variables one at a time.
This post does the opposite. It works through three examples that each lean on the
same simple idea, that **an `.event` div can hold *anything***, and pushes it in a
different direction:

1. **Images that tessellate** — a decade of tidymodels packages as interlocking hex stickers.
2. **Live output** — a data analysis where each step shows the plot it produced.
3. **Mixed media** — Olympic Games as magazine-style cards combining a flag, a headline stat, and a sparkline.

## Example 1: A decade of tidymodels in hex stickers

The [tidymodels](https://www.tidymodels.org/) ecosystem has grown a *lot* of packages over
the years, and it is easy to forget how many, or when each one arrived. So let's chart it.
Each year shows the hex stickers of the packages that had their first CRAN release that year.
The first-release dates come straight from CRAN (via the [crandb](https://crandb.r-pkg.org/) API),
and the stickers come from the [rstudio/hex-stickers](https://github.com/rstudio/hex-stickers) repo.

And since they're hexes, they ought to *tessellate*.

A naive row of images leaves rectangular gaps between the stickers, so to get a proper
honeycomb we lean on the geometry of the sticker itself. R hex stickers are *pointy-top*:
the PNG canvas is exactly as tall as the hexagon is point-to-point, and exactly as wide as
it is flat-edge to flat-edge, so the ratio is `2 / sqrt(3) ≈ 1.155`. The flat left and right
edges touch the canvas border, which means two stickers placed side by side with **no
horizontal gap** meet exactly along those edges. That alone tessellates a single row.

To stack rows into a honeycomb, the next row has to move **up** by a quarter of the hex
height so the points nestle into the notches above, and **sideways** by half a hex width so
it sits in the offset position. That is the whole CSS:

```html
<style>
.timeline .event .hexrow > p { display: flex; gap: 0; margin: 0; }
.timeline .event .hexrow + .hexrow { margin-top: -18px; }   /* 1/4 height up */
.timeline .event .hexrow.offset > p { margin-left: 31px; }  /* 1/2 width over */
</style>
```

Each year is then split into one or two `.hexrow` divs, with every second row getting an
`.offset` class:

```markdown
:::: {.event data-label="2018"}
::: {.hexrow}
![](hex/tidymodels.png){.hex}
![](hex/infer.png){.hex}
![](hex/tidypredict.png){.hex}
![](hex/parsnip.png){.hex}
:::
::: {.hexrow .offset}
![](hex/dials.png){.hex}
![](hex/embed.png){.hex}
![](hex/textrecipes.png){.hex}
![](hex/probably.png){.hex}
:::
::::
```

Put together, on a `.vertical-alt` layout with the `.tl-card` modifier and the CSS variables
overridden to a tidymodels orange. Hover any sticker to see the package name.

:::: {.timeline .vertical-alt .tl-card style="--tl-gap: 1rem; --tl-color-line: #CA562C; --tl-color-dot: #CA562C; --tl-color-label: #CA562C;"}
:::: {.event data-label="2014"}
::: {.hexrow}
![](hex/broom.png){.hex title="broom"}
:::
::::
:::: {.event data-label="2016"}
::: {.hexrow}
![](hex/corrr.png){.hex title="corrr"}
:::
::::
:::: {.event data-label="2017"}
::: {.hexrow}
![](hex/rsample.png){.hex title="rsample"}
![](hex/recipes.png){.hex title="recipes"}
![](hex/yardstick.png){.hex title="yardstick"}
![](hex/tidyposterior.png){.hex title="tidyposterior"}
:::
::::
:::: {.event data-label="2018"}
::: {.hexrow}
![](hex/tidymodels.png){.hex title="tidymodels"}
![](hex/infer.png){.hex title="infer"}
![](hex/tidypredict.png){.hex title="tidypredict"}
![](hex/parsnip.png){.hex title="parsnip"}
:::
::: {.hexrow .offset}
![](hex/dials.png){.hex title="dials"}
![](hex/embed.png){.hex title="embed"}
![](hex/textrecipes.png){.hex title="textrecipes"}
![](hex/probably.png){.hex title="probably"}
:::
::::
:::: {.event data-label="2019"}
::: {.hexrow}
![](hex/butcher.png){.hex title="butcher"}
![](hex/discrim.png){.hex title="discrim"}
![](hex/workflows.png){.hex title="workflows"}
![](hex/hardhat.png){.hex title="hardhat"}
:::
::::
:::: {.event data-label="2020"}
::: {.hexrow}
![](hex/themis.png){.hex title="themis"}
![](hex/tune.png){.hex title="tune"}
![](hex/poissonreg.png){.hex title="poissonreg"}
![](hex/baguette.png){.hex title="baguette"}
:::
::: {.hexrow .offset}
![](hex/rules.png){.hex title="rules"}
![](hex/applicable.png){.hex title="applicable"}
![](hex/finetune.png){.hex title="finetune"}
![](hex/stacks.png){.hex title="stacks"}
:::
::::
:::: {.event data-label="2021"}
::: {.hexrow}
![](hex/spatialsample.png){.hex title="spatialsample"}
:::
::::
:::: {.event data-label="2022"}
::: {.hexrow}
![](hex/multilevelmod.png){.hex title="multilevelmod"}
![](hex/agua.png){.hex title="agua"}
![](hex/censored.png){.hex title="censored"}
:::
::: {.hexrow .offset}
![](hex/bonsai.png){.hex title="bonsai"}
![](hex/tidyclust.png){.hex title="tidyclust"}
:::
::::
::::

`broom` and `corrr` are the quiet elders of the group, 2018 was the year the modeling core
landed (`parsnip`, `dials`, `tidymodels` itself), and 2020 was the busiest single year by a
wide margin.

## Example 2: Watching an analysis take shape

If an event can hold an image, it can hold a *generated* image just as easily. Here the
content of each event is a live `{r}` chunk, so the timeline narrates a small analysis of
the `penguins` data, one plot per step. Nothing is pre-rendered, the figures are produced
when the post is.



The pattern is just a code chunk dropped inside an `.event`:

````markdown
:::: {.event data-label="Model"}
```{{r}}
ggplot(clean, aes(flipper_len, body_mass, colour = species)) +
  geom_point(alpha = 0.6) +
  geom_smooth(method = "lm", se = FALSE)
```
::::
````

:::: {.timeline .vertical .tl-card .analysis style="--tl-color-line: #2c7fb8; --tl-color-dot: #2c7fb8; --tl-color-label: #2c7fb8;"}
:::: {.event data-label="Raw"}
**Load the raw data.** Straight from the source, missing values and all.


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-1-1.png){fig-alt='Penguins analysis step' width=422.4}
:::
:::

::::
:::: {.event data-label="Clean"}
**Drop the incomplete rows** so every point has both measurements.


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-2-1.png){fig-alt='Penguins analysis step' width=422.4}
:::
:::

::::
:::: {.event data-label="Explore"}
**Colour by species.** Three clusters separate out almost immediately.


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-3-1.png){fig-alt='Penguins analysis step' width=422.4}
:::
:::

::::
:::: {.event data-label="Model"}
**Fit a line per species.** Body mass scales with flipper length within each.


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-4-1.png){fig-alt='Penguins analysis step' width=422.4}
:::
:::

::::
:::: {.event data-label="Report"}
**Polish for the audience** with labels, a clear palette, and a title.


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-5-1.png){fig-alt='Penguins analysis step' width=422.4}
:::
:::

::::
::::

Because the timeline only cares about the rendered output, the same approach works for
tables, leaflet maps, htmlwidgets, anything Quarto can put on the page.

## Example 3: The Summer Games, by the numbers

A single event can hold more than one *kind* of content at once. Here each marker is a little
magazine card that combines three things: the host country's flag, a headline stat, and a
sparkline showing where that edition sits in the long-run trend of athlete numbers. The flags
are static images, the sparklines are generated on the fly, and a flexbox lays them side by
side, all inside one `.event`.



The card is a `.mag` flexbox wrapping the flag and a `.mag-body`, and the sparkline is just an
`{r}` chunk that highlights the current Games:

````markdown
:::: {.event data-label="2008"}
::: {.mag}
![](flags/cn.png){.flag}
::: {.mag-body}
#### Beijing
[204]{.stat} nations · [10,942]{.stat} athletes
```{{r}}
spark(2008)
```
:::
:::
::::
````

:::::: {.timeline .vertical .tl-card .olympics style="--tl-color-line: #b8860b; --tl-color-dot: #b8860b; --tl-color-label: #b8860b;"}

::::: {.event data-label="2000"}

:::: {.mag}

![](flags/au.png){.flag title="Australia"}

::: {.mag-body}

#### Sydney

[199]{.stat} nations · [10,651]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-6-1.png){fig-alt='Athletes per Summer Games, Sydney 2000 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2004"}

:::: {.mag}

![](flags/gr.png){.flag title="Greece"}

::: {.mag-body}

#### Athens

[201]{.stat} nations · [10,625]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-7-1.png){fig-alt='Athletes per Summer Games, Athens 2004 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2008"}

:::: {.mag}

![](flags/cn.png){.flag title="China"}

::: {.mag-body}

#### Beijing

[204]{.stat} nations · [10,942]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-8-1.png){fig-alt='Athletes per Summer Games, Beijing 2008 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2012"}

:::: {.mag}

![](flags/gb.png){.flag title="Great Britain"}

::: {.mag-body}

#### London

[204]{.stat} nations · [10,768]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-9-1.png){fig-alt='Athletes per Summer Games, London 2012 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2016"}

:::: {.mag}

![](flags/br.png){.flag title="Brazil"}

::: {.mag-body}

#### Rio de Janeiro

[207]{.stat} nations · [11,238]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-10-1.png){fig-alt='Athletes per Summer Games, Rio de Janeiro 2016 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2020"}

:::: {.mag}

![](flags/jp.png){.flag title="Japan"}

::: {.mag-body}

#### Tokyo

[205]{.stat} nations · [11,420]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-11-1.png){fig-alt='Athletes per Summer Games, Tokyo 2020 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::: {.event data-label="2024"}

:::: {.mag}

![](flags/fr.png){.flag title="France"}

::: {.mag-body}

#### Paris

[204]{.stat} nations · [11,110]{.stat} athletes


::: {.cell}
::: {.cell-output-display}
![](index_files/figure-html/unnamed-chunk-12-1.png){fig-alt='Athletes per Summer Games, Paris 2024 highlighted' width=249.6}
:::
:::


:::

::::

:::::

::::::

The flag anchors the card, the stat gives the headline, and the sparkline gives context, three
content types the timeline never has to know about. (Figures are approximate, drawn from
Wikipedia's per-Games articles.)

## Wrapping up

Three examples, one idea: treat the `.event` as a normal block of content and the timeline
handles the arrangement. Whether that content is a tessellated honeycomb of hex stickers, a
freshly rendered plot, or a flag and a sparkline side by side, the markup stays the same
handful of nested divs.

The full documentation, including the gallery, lives at
<https://emilhvitfeldt.github.io/quarto-timeline/>.
