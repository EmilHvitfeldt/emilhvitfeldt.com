---
title: Similarity Measure in the Space of Color Palettes
date: "2018-09-25"
description: |
  Talk about designing a similarity measure to look at color palettes.
slides: https://ocrug-color-talk.netlify.app/assets/player/keynotedhtmlplayer
video: https://www.youtube.com/watch?v=xZ0-Sm4MSjM
github: https://github.com/EmilHvitfeldt/talks/tree/master/OCRUG-color-talk
toggle:
  slides: true
  github: true
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


Related to my project of creating a catalog of all available color palettes in R https://github.com/EmilHvitfeldt/r-color-palettes and its associated R package https://CRAN.R-project.org/package=paletteer I wanted to expand the project to support a higher degree of explorability. There is already quite a bit theory of color similarity and image similarity that will provide useful but unfortunately insufficient. For standard color similarity using some kind of space measure in a perceptual color space will likely give you what you need, but this approach will start to struggle when you need to compare groups of colors since ordering starts making a difference. Image similarity can likewise be done by comparing color histograms, this approach does still not capture the number of colors or other qualities such as classifying according to type (Sequential, Diverging or Qualitative). My goal is to use expert knowledge to calculate features that can be used to calculates similarities.
