---
title: "themis: dealing with imbalanced data by using synthetic oversampling"
date: "2020-07-09"
description: |
  A walkthrough of the heart of the synthetic oversampling algorithms will be given in code and visualization along with talk about performance.
slides: https://user-themis.netlify.app
video: https://www.youtube.com/watch?v=kL5qWitjvNg
github: https://github.com/EmilHvitfeldt/talks/tree/master/user2020-themis
categories:
  - talk
image: "featured.png"
---

<a href="https://user-themis.netlify.app" class="listing-slides btn-links">{{< fa door-open >}}Slides<a>
<a href="https://www.youtube.com/watch?v=kL5qWitjvNg" class="listing-video btn-links">{{< fa play-circle >}}Video<a>
<a href="https://github.com/EmilHvitfeldt/talks/tree/master/user2020-themis" class="listing-github btn-links">{{< fa brands github >}}Github<a>
      
<iframe class="slide-deck" src="https://user-themis.netlify.app"></iframe>

Many classification tasks come with an unbalanced dataset. Examples range from disease prediction to fraud detection. Naively applying your model will lead to an ineffective predictor that only predicts the majority class.

The themis package implements various established algorithms that adjust this imbalance in the data by either removing cases from the majority classes or by synthetically adds cases to the minority classes until the desired ratio is met.

A walkthrough of the heart of the synthetic oversampling algorithms will be given in code and visualization along with talk about performance.

themis was created because of a lack of unity and speed in existing R packages.
