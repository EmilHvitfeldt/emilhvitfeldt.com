---
title: Mind-Blowing Quarto Slide Extensions
date: "2026-07-23"
description: |
  A tour of revealjs slide crafting in Quarto and the extensions that make it more fun
video: https://www.youtube.com/watch?v=vQbhFORULJc
toggle:
  slides: false
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


This was a live session on [The Data Science Lab](https://pos.it/dslab), starting with the basics of building revealjs slides in Quarto before showing off chat bubbles, rough notation, flourish, themes, and the editable extension.
