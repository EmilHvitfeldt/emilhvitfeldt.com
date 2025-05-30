---
title: 'Slidecraft 101: 7 Tips and Tricks'
description: |
  7 quick tips and tricks
date: '2023-10-14'
categories:
  - slidecraft 101
  - quarto
image: "featured.webp"
---




Hello and welcome back to my multi-part series about what I like to call **slidecrafting**; The art of putting together slides that are functional and aesthetically pleasing. I will be using [quarto presentations](https://quarto.org/). This is the fifth post, you can find all other posts in the [slidecraft 101](../../project/slidecraft-101/index.qmd#blog-posts) project.

Doing my personal slidecrafting sessions I sometimes find little ideas I share on social media. This post is a collection of 7 such nuggets in one place, with the hope that it will stop them from disappearing into the ether.

::: callout-note
All slide examples in this post are embedded and you can thus advance the slides.
:::

## Highlight incremental slides

The use of [incremental lists](https://quarto.org/docs/presentations/revealjs/#incremental-lists) is a great way to add a little something to a set of slides. It also avoids a wall of text, allowing the presenter to show one bullet at a time. All in all, this is helpful as it can be used to focus the viewers' attention. 

As a reminder, we create an incremental list using the following syntax:

```markdown
::: {.incremental}
- thing 1
- thing 2
:::
```

We can add another class to this div and use it to style it more. 

```markdown
::: {.incremental .highlight-last}
- thing 1
- thing 2
:::
```

then we use this to style our list. Below `.current-fragment` refers to the last shown item in the list. Setting the `color: grey` isn't necessary, but it is a way to downplay the "not-current" items

```scss
.highlight-last  {
  color: grey;
  .current-fragment {
    color: #5500ff;
  }
}
```

These together yield these slides:

<iframe class="slide-deck" src="_tip-1.html">

</iframe>

<a href="_tip-1.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_tip-1.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

::: callout-note
The ordering and selection do not reflect the author's song preferences.
:::

## Style menu button

The menu button you see in the lower left-hand side of the slide. Styling it can be done by setting the `$link-color` sass variable. If you want a different icon, or have it colored differently than `$link-color` you need to specify it directly as the color [is hardcoded into the svg](https://github.com/quarto-dev/quarto-cli/blob/13c916d041b2f83c20855fd24c7bd68d07720981/src/resources/formats/revealjs/quarto.scss#L505). The icon is specified as the background image of `.reveal .slide-menu-button .fa-bars::before`.

```scss
.reveal .slide-menu-button .fa-bars::before {
background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="rgb(42, 118, 221)" class="bi bi-list" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>') !important;
}
```

Tthe color is specified by the `fill="rgb(42, 118, 221)"` part of the svg. But since this is an image, we can use whatever image we want.

```scss
.reveal .slide-menu-button .fa-bars::before {
background-image: url('https://cdn-icons-png.flaticon.com/512/2163/2163350.png') !important;
}
```

<iframe class="slide-deck" src="_tip-2.html">

</iframe>

<a href="_tip-2.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>
<a href="_tip-2.scss" target="_blank" class="listing-video btn-links">{{< fa brands sass >}}scss<a>

## Hiding slides

changing the [slide visibility](https://quarto.org/docs/presentations/revealjs/advanced.html#slide-visibility) is as simple as setting `visibility="hidden"` attribute to the header of a slide

```markdown
## Slide Title {visibility="hidden"}
```

I find this useful when I have to give the same presentation multiple times, and I have a disclaimer or other seasonally important slides. Instead of removing and reinserting the information each time, I just change the attribute. 

<iframe class="slide-deck" src="_tip-3.html">

</iframe>

<a href="_tip-3.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## Hand-styled code chunks

With a little extra effort, you can create highlighted code chunks. This is different than the code highlighting that comes naturally. In this instance, we are creating an unstyled code chunk, and styling part of the code manually with css classes.

First, we write a new css class, I like to call it `.mono`. The important thing is that we set `font-family: monospace;`, but we can do other things, like setting the `font-size`.

```scss
.mono {
  font-family: monospace;
  font-size: 0.9em;
}
```

Next, we add our code in a fenced div, with the mono class. you need to use `\ ` to add leading spaces, and each line ends with 2 spaces to denote newlines

```markdown
::: mono
library(ggplot2)
mtcars |>  
\ \ ggplot(aes(mpg, disp)) +  
\ \ geom_point() +  
\ \ geom_smooth(method = "lm", formula = "y ~ x")
:::
```

Taking it to the next step, you can manually change the formatting of functions using css or css classes, `library([ggplot2]{style="color:purple;"})` would make `ggplot2` purple. This is also a great place to use [css classes](https://emilhvitfeldt.com/post/slidecraft-colors-fonts/#using-css-classes).

We can take it a step further and use [fragments](https://quarto.org/docs/presentations/revealjs/advanced.html#fragments) to have the code highlighted one bit at a time. Changing the last line to the following

```markdown
geom_smooth([method = "lm"]{.fragment .highlight-red}, [formula = "y ~ x"]{.fragment .highlight-blue})
```

seperately highlights the code `method = "lm"` then `formula = "y ~ x"` in red and blue.

<iframe class="slide-deck" src="_tip-4.html">

</iframe>

<a href="_tip-4.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## Absolute position everything

It took me too long to realize, but the [absolute](https://quarto.org/docs/presentations/revealjs/advanced.html#absolute-position) class can be used on anything!

You might have seen the following syntax to place an image anywhere

```markdown
![](image1.png){.absolute top=200 left=0 width="350" height="300"}
```

But you are not restricted in using it with images. The following results in the image you see attached:

I like to use it with text in the following way:

```markdown
[python is great]{.absolute bottom="45%" left="20%"}

[and so is R]{.absolute bottom="0%" right="0%"}
```

<iframe class="slide-deck" src="_tip-5.html">

</iframe>

<a href="_tip-5.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## Showing quarto code

This one isn't as much a slidecrafting tip, as it is a quarto tip! If you are showing how to do something in Quarto using Quarto you need this tip. In essence what we are working with are [unexcuted blocks](https://quarto.org/docs/computations/execution-options.html#unexecuted-blocks).

Adding a `markdown` cell around what you want to show. Important to use more ticks than any of the inside cells inside

using double curly brackets to indicate that the code block should not be executed. The following code when used in a quarto document will render as shown in the example

````` markdown
```` markdown
This is **Quarto** code

```{{{python}}}
1 + 1
```
````
`````

<iframe class="slide-deck" src="_tip-6.html">

</iframe>

<a href="_tip-6.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## Avoid duplication using Includes

This last tip doesn't come with an example, as it doesn't get useful before you start working with multiple files. We are talking about the [includes](https://quarto.org/docs/authoring/includes.html) short code.

Using the following short code; `{{< include _content.qmd >}}` includes the content of `_content.qmd` into the document in a "copy-paste" manner before the rendering of the document.

This has proved useful for me when I want the same slides to appear at the start or end of multiple decks. And you are not limited to .qmd files! you can embed html files or svg too.

## Roundup

I hope you learned a lot! I find myself using these types of themes more and more lately, and I hope that you found it useful!
