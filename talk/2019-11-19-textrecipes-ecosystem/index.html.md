---
title: Building a package that fits into an evolving ecosystem
date: "2019-11-19"
description: |
  This talk tells the tale of the package textrecipes; starting with the Github issue that sparked the idea for the package, go over the trials and challenges associated with building a package that heavily integrates with other packages all the way to the release on CRAN.
slides: https://ecosystem-ocrug2019.netlify.app/
github: https://github.com/EmilHvitfeldt/talks/tree/master/textrecipes-ecosystem
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


With an ever-increasing amount of textual data is available to us, having a well-thought-out toolchain for modelling is crucial. tidymodels is a recent effort to create a modelling framework that shares the underlying design philosophy, grammar, and data structures of the tidyverse. textrecipes joined the roster a year ago and provided an exciting bridge to text preprocessing. This talk tells the tale of the package textrecipes; starting with the Github issue that sparked the idea for the package, go over the trials and challenges associated with building a package that heavily integrates with other packages all the way to the release on CRAN.
