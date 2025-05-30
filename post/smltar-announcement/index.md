---
title: 'Supervised Machine Learning for Text Analysis in R'
description: |
  Announcement post for Supervised Machine Learning for Text Analysis in R book.
date: '2020-07-27'
categories:
  - smltar
  - book
image: "featured.webp"
---

I have been waiting a long time to finally be able to craft this blog post.
Last Friday [Julia Silge](https://twitter.com/juliasilge) and I led a [userR! 2020 online tutorial](https://user2020.r-project.org/program/tutorials/) on "predictive modeling with text using tidy data principles". The tutorial was host by [R-Ladies en Argentina](https://github.com/RLadiesEnArgentina/user2020tutorial) and I could not be more grateful for all the work the organizers put into this making this event happen.

![](https://i.giphy.com/media/gFQQCpr7aXoIzudfdZ/giphy.webp)

Materials for this tutorial are available on [GitHub](https://github.com/EmilHvitfeldt/useR2020-text-modeling-tutorial), with two main resources in the repo:

- Slides, which you can [see rendered here](https://emilhvitfeldt.github.io/useR2020-text-modeling-tutorial/) and the [source for here](https://github.com/EmilHvitfeldt/useR2020-text-modeling-tutorial/blob/master/index.Rmd)

<iframe src="https://emilhvitfeldt.github.io/useR2020-text-modeling-tutorial/#1" width="700px" height="400px"></iframe>

- An [R Markdown file to work through](https://github.com/EmilHvitfeldt/useR2020-text-modeling-tutorial/blob/master/text_modeling.Rmd)

If you get stuck, you can [post a question as an issue on this repo](https://github.com/EmilHvitfeldt/useR2020-text-modeling-tutorial/issues) or [post on RStudio Community](https://rstd.io/tidymodels-community)

During the tutorial, I was excited and proud to publicly announce the book Julia and I are working on!
The book is called "Supervised Machine Learning for Text Analysis in R" to be published in the Chapman & Hall/CRC Data Science Series! An online version is and will continue to be available at [smltar.com](https://smltar.com/). This [year long](https://github.com/EmilHvitfeldt/smltar/commit/b3f870e82d3270b54bedb36fe0f4e04b5e1fc0a7) project have been an exciting time of my life and I have been learning about, not just about the subject matter at hand, but about publishing, polishing and reviewing.

The book has been divided into [3 main sections](https://smltar.com/preface.html#outline):

- **Natural language features**: This section covers the considerations and methods one can use to turn text into a numerical representation we can feed into our model. We are writing about but not limited to; tokenization, stemming and stop words (yes! you read that right! we have a whole chapter about stop words! And it was needed). This section is in really good shape.

- **Machine learning methods**: We investigate the power of some of the simpler and more lightweight models in our toolbox. We are doing full walkthroughs of classification and regression with commentary and considers  We drew from these chapters in our useR tutorial.

- **Deep learning methods**: Given more time and resources, we see what is possible once we turn to neural networks. This section is still to come.

I already have a lot of people to thank for making this possible!

- Julia for seeing the promising in this book idea and taking on the big task with me
- our Chapman & Hall editor John Kimmel
- The helpful technical reviewers
- [Desirée De Leon](https://desiree.rbind.io/) for the site beautiful design of the book’s website
- [Max Kuhn](https://twitter.com/topepos) and [Davis Vaughan](https://twitter.com/dvaughan32) for the amazing work on [tidymodels](https://www.tidymodels.org/) which we using in the second section of the book
- My wife for her continued support and her faint attempts to feign interest when I talk for about the book ❤️
- [Alberto Cairo](https://twitter.com/AlbertoCairo) for lending an ear and encouragements to this idea
