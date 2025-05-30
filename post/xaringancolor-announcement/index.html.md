---
title: 'xaringancolor announcement'
description: |
  Announcement post for the xaringancolor package.
date: '2021-02-04'
categories:
  - xaringan
image: "featured.webp"
---




I'm happy to announce a small new package of mine: [xaringancolor](https://github.com/EmilHvitfeldt/xaringancolor).
xaringancolor allows you to specify shared text colors in the text, equations and code sections of [xaringan](https://github.com/yihui/xaringan) slides.

It has already been possible to set the text colors with custom css classes and change the color of code with the [flair](https://github.com/r-for-educators/flair) package.
I haven't been able to see anyone else being able to extend this to work with the LaTeX equations in xaringan, let alone unifying the color specification across all 3.

# Setup

You start with using `setup_colors()` to specify the colors you want to use along with the name to want to reference them as

```r
library(xaringancolor)
setup_colors(
  yellow = "#ffcc29",
  orange = "#f58634",
  green = "#007965"
)
```

Calling this function (preferably in the console, you won't need to keep it) copies a section of text into your clipboard that you will have to include in the beginning of your xaringan document. 

And that is all the setup you need to do to have color support across your document.

# HTML

xaringancolor sets up a css class for each of the colors you specify with the sole purpose of changing the color. So In our example, writing `.orange[hello]` would produce a orange hello

<div class="iframe-container iframe-slides"><iframe src="_css-example.html" width="700px" height="500px" style="border:2px solid currentColor;" data-external=1></iframe></div>

[Source Code](https://gist.github.com/EmilHvitfeldt/7daa57156a6e844423942ed1daf0d175)

# Code highlighting 

Code highlighting using flair is done the same as you normally would, see [this article](https://education.rstudio.com/blog/2020/05/flair/) for more examples.

You now just use `color = green` in `flair()` instead of supplying a hex-color and it will match the color used in the css classes. Furthermore since we have the the `green` variable, you can use it to specify colors in charts as well for maximum effect! 

<div class="iframe-container iframe-slides"><iframe src="_flair-example.html" width="700px" height="500px" style="border:2px solid currentColor;" data-external=1></iframe></div>

[Source Code](https://gist.github.com/EmilHvitfeldt/ec081d53929da50f344c2a8ede0a7033)

# Equations

To use the colors in LaTeX equations you need to use LaTeX macros/functions. So you have a green X you would write `\green{X}`.

<div class="iframe-container iframe-slides"><iframe src="_latex-example.html" width="700px" height="500px" style="border:2px solid currentColor;" data-external=1></iframe></div>

[Source Code](https://gist.github.com/EmilHvitfeldt/1767bc72d7dd6400a75c55e8be8e7a90)

# Advanced Examples

Last example is a re-implementation of [Andrew Heiss](https://twitter.com/andrewheiss) absolutely amazing [colorful slide](https://twitter.com/andrewheiss/status/1250517766731423745)

<div class="iframe-container iframe-slides"><iframe src="_andrew-example.html" width="700px" height="500px" style="border:2px solid currentColor;" data-external=1></iframe></div>

[Source Code](https://gist.github.com/EmilHvitfeldt/858e388e06fca27aff9693b0262bad84)
