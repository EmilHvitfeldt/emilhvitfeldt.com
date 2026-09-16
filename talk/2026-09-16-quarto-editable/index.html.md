---
title: "Slideware Is Dead: Long Live Quarto"
date: "2026-09-16"
description: |
  Making the case for editable, code-generated slides with Quarto over LaTeX and drag-and-drop slideware
slides: https://emilhvitfeldt.github.io/talk-quarto-editable/#/section
github: https://github.com/EmilHvitfeldt/talk-quarto-editable
toggle:
  slides: true
  github: true
  video: false
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


Accepted Talk at [posit::conf(2026)](https://conf.posit.co/2026/)

A talk making the case for Quarto as the sweet spot between LaTeX, Canva, and code-generated plots, for slides that are both editable and reproducible.
