---
title: "Similarity Measure in the Space of Color Palettes"
draft: false
event: 'OC RUG'
event_url: https://www.meetup.com/OC-RUG/events/253818054/
location: Irvine, CA
abstract: ""
summary: "Develop a measure of distance between color palettes"

# Talk start and end times.
#   End time can optionally be hidden by prefixing the line with `#`.
date: "2018-09-25"
date_end: "2018-09-25"
all_day: false
publishdate: "2018-09-25"

categories:
  - talk
tags:
  - color palettes
featured: no
projects: []
links:
- icon: door-open
  icon_pack: fas
  name: slides
  url: https://ocrug-color-talk.netlify.app/assets/player/keynotedhtmlplayer
- icon: github
  icon_pack: fab
  name: materials
  url: https://github.com/EmilHvitfeldt/talks/tree/master/OCRUG-color-talk
---

Related to my project of creating a catalog of all available color palettes in R https://github.com/EmilHvitfeldt/r-color-palettes and its associated R package https://CRAN.R-project.org/package=paletteer I wanted to expand the project to support a higher degree of explorability. There is already quite a bit theory of color similarity and image similarity that will provide useful but unfortunately insufficient. For standard color similarity using some kind of space measure in a perceptual color space will likely give you what you need, but this approach will start to struggle when you need to compare groups of colors since ordering starts making a difference. Image similarity can likewise be done by comparing color histograms, this approach does still not capture the number of colors or other qualities such as classifying according to type (Sequential, Diverging or Qualitative). My goal is to use expert knowledge to calculate features that can be used to calculates similarities.
