---
title: "Looking at stop words: why you shouldn't blindly trust model defaults"
date: "2020-09-26"
description: |
   This talk will focus on the importance of checking assumptions and defaults in the software you use.
slides: https://slcrug-stopwords.netlify.app/
video: https://www.youtube.com/watch?v=Q2ilhRqp1Vo
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



Invited talk at Salt Lake City R Users Group

Removing stop words is a fairly common step in natural language processing, and NLP packages often supply a default list. However, most documentation and tutorials don't explore the nuances of selecting an appropriate list. Defaults for machine learning and modeling can be helpful but may be misleading or wrong. This talk will focus on the importance of checking assumptions and defaults in the software you use.
