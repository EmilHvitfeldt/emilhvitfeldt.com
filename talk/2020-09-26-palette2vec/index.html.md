---
title: "palette2vec: A new way to explore color palettes"
date: "2020-09-26"
description: |
  This talk shows what happens when we take one step further into explorability. Using handcrafted color features, dimensionality reduction, and interactive tools will we create and explore a color palette embedding.
slides: https://palette2vec-whyr2020.netlify.app/
video: https://www.youtube.com/watch?v=ebHtp5nhn7w
toggle:
  slides: true
  github: false
  video: true
categories:
  - talk
image: "featured.webp"
---

::: {.content-hidden unless-meta="toggle.slides"}
```{=html}
<a href={{< meta slides >}} class="listing-slides btn-links">{{< fa door-open >}}Slides<a>
```
:::

::: {.content-hidden unless-meta="toggle.video"}
```{=html}
<a href={{< meta video >}} class="listing-video btn-links">{{< fa play-circle >}}Video<a>
```
:::

::: {.content-hidden unless-meta="toggle.github"}
```{=html}
<a href={{< meta github >}} class="listing-github btn-links">{{< fa brands github >}}Github<a>
```
:::

::: {.content-hidden unless-meta="toggle.slides"}
```{=html}
<iframe class="slide-deck" src={{< meta slides >}}></iframe>
```
:::


There are many palettes available in various R packages. Having a way to explore all of these palettes are already found within the https://github.com/EmilHvitfeldt/r-color-palettes repository and the {paletteer} package.

This talk shows what happens when we take one step further into explorability. Using handcrafted color features, dimensionality reduction, and interactive tools will we create and explore a color palette embedding. In this embedded space will we interactively be able to cluster palettes, find neighboring palettes, and even generate new palettes in a whole new way. The Package in question is: https://github.com/EmilHvitfeldt/palette2vec
