---
title: "themis: dealing with imbalanced data by using synthetic oversampling"
date: "2020-07-09"
description: |
  A walkthrough of the heart of the synthetic oversampling algorithms will be given in code and visualization along with talk about performance.
slides: https://user-themis.netlify.app
video: https://www.youtube.com/watch?v=kL5qWitjvNg
github: https://github.com/EmilHvitfeldt/talks/tree/master/user2020-themis
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


Many classification tasks come with an unbalanced dataset. Examples range from disease prediction to fraud detection. Naively applying your model will lead to an ineffective predictor that only predicts the majority class.

The themis package implements various established algorithms that adjust this imbalance in the data by either removing cases from the majority classes or by synthetically adds cases to the minority classes until the desired ratio is met.

A walkthrough of the heart of the synthetic oversampling algorithms will be given in code and visualization along with talk about performance.

themis was created because of a lack of unity and speed in existing R packages.
