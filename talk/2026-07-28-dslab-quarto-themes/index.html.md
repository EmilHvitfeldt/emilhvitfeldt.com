---
title: How do you create custom Revealjs themes in Quarto?
date: "2026-07-28"
description: |
  Making fun quarto slide themes
video: https://www.youtube.com/watch?v=ONAl7iD9h68
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


This was a live session on [The Data Science Lab](https://pos.it/dslab), talking about how to making custom quarto slide themes.
