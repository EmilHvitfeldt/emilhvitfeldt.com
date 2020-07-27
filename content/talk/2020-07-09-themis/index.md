---
title: "themis: dealing with imbalanced data by using synthetic oversampling"
categories:
- talk
- useR2020
date: '2020-07-09T19:00:00Z'
draft: no
featured: no
lastmod: '2020-07-09'
links:
- icon: door-open
  icon_pack: fas
  name: slides
  url: https://user-themis.netlify.app
- icon: github
  icon_pack: fab
  name: materials
  url: https://github.com/EmilHvitfeldt/talks/tree/master/user2020-themis
- icon: play-circle
  icon_pack: fas
  name: video
  url: https://www.youtube.com/watch?v=kL5qWitjvNg
location: St. Louis, MO
publishdate: '2020-07-09'
all_day: no
---

Many classification tasks come with an unbalanced dataset. Examples range from disease prediction to fraud detection. Naively applying your model will lead to an ineffective predictor that only predicts the majority class.
The themis package implements various established algorithms that adjust this imbalance in the data by either removing cases from the majority classes or by synthetically adds cases to the minority classes until the desired ratio is met.
A walkthrough of the heart of the synthetic oversampling algorithms will be given in code and visualization along with talk about performance.
themis was created because of a lack of unity and speed in existing R packages.
