---
title: 'Slidecraft 101: Layout'
description: |
  Placement of the different elements on a slide can change everything
date: '2024-01-16'
categories:
  - slidecraft 101
  - quarto
image: "featured.webp"
---




Hello and welcome back to my multi-part series about what I like to call **slidecrafting**; The art of putting together slides that are functional and aesthetically pleasing. I will be using [quarto presentations](https://quarto.org/). This is the fifth post, you can find all other posts in the [slidecraft 101](../../project/slidecraft-101/index.qmd#blog-posts) project.

This post will go over the **layout** of your slides. Placing things in different places on a slide is a great way to elevate a slide deck and keep the focus of your viewers.

::: callout-note
All slide examples in this post are embedded and you can thus advance the slides.
:::

## Pulling things left and right

Using [multiple columns](https://quarto.org/docs/presentations/revealjs/#multiple-columns) is a nice way to split up the content of your slides. I use it so much that I have a [snippet](https://rstudio.github.io/rstudio-extensions/rstudio_snippets.html) to save time since I use it so much. It works great for side-by-side comparisons as well. This is done using the following syntax. We use the `width` attribute to determine the width of each of the columns.

```md
:::: {.columns}

::: {.column width="40%"}
Left column
:::

::: {.column width="60%"}
Right column
:::

::::
```

<iframe class="slide-deck" src="_left-right.html#/standard-columns">

</iframe>

but you can use it in quite a few ways beyond this! Firstly, each column is by itself a div, so you can style it directly. Such as making the right column have the right aligned text.

```md
:::: {.columns}

::: {.column width="50%"}
Left column
:::

::: {.column width="50%" style="text-align: right;"}
Right column
:::

::::
```

<iframe class="slide-deck" src="_left-right.html#/justified-columns">

</iframe>

The structure of columns doesn't require that we just use 2 columns. You can do as many columns as you want, but generally, you will have a hard time using more than 4.

```md
:::: {.columns}

::: {.column width="25%"}
1st column
:::

::: {.column width="25%"}
2nd column
:::

::: {.column width="25%"}
3rd column
:::

::: {.column width="25%"}
4th column
:::

::::
```

<iframe class="slide-deck" src="_left-right.html#/many-columns">

</iframe>

Another way I like to use columns is by keeping one of them empty. This way provides a fast and easy way to add space or put text in specific locations.

```md
:::: {.columns}

::: {.column width="30%"}
:::

::: {.column width="70%"}
Only right side
:::

::::
```

<iframe class="slide-deck" src="_left-right.html#/one-sided--column">

</iframe>

<a href="_left-right.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## r-fit-text

Another quick way to change the layout of your slide is to let the text take up the entire slide real estate. We can do this using the [r-fit-text](https://quarto.org/docs/presentations/revealjs/advanced.html#fit-text) class using the following syntax. This will make the text so big that it takes up all the horizontal space on the slide.

```md
::: r-fit-text
Big Text
:::
```

<iframe class="slide-deck" src="_r-fit-text.html#/section">

</iframe>

This works well combined with the [center](https://quarto.org/docs/presentations/revealjs/advanced.html#center) class, which makes sure the text appears in the center vertically on the slide.

```md
## {.center}

::: r-fit-text
This fits perfectly!
:::
```

<iframe class="slide-deck" src="_r-fit-text.html#/section-1">

</iframe>

One thing about using `r-fit-text` is that it applies the same text size to all the text inside it, so when you use it across multiple lines, you won't get the same effect.

```md
::: r-fit-text
This fits perfectly!

On two lines
:::
```

<iframe class="slide-deck" src="_r-fit-text.html#/section-2">

</iframe>

This can however be fixed, by using a `r-fit-text` for each line of text.

```md
::: r-fit-text
This fits perfectly!
:::

::: r-fit-text
On two lines
:::
```

<iframe class="slide-deck" src="_r-fit-text.html#/section-3">

</iframe>

<a href="_r-fit-text.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

## Using images

Using images for style is another thing you can do to change the layout. If you don't have much content on your slides. e.i. just a sentence or two. You could pair that with an image that relays some of the same information. These images will typically not contain content themselves but rather reinforce the content on the slides.

There are 3 main ways to include images. Using the [basics](https://quarto.org/docs/authoring/figures.html), using [absolute position](https://quarto.org/docs/presentations/revealjs/advanced.html#absolute-position) or as [background images](https://quarto.org/docs/presentations/revealjs/#image-backgrounds).

### Basic figures

The basic way of adding figures is using the following syntax

```md
![](holly-mandarich.jpg)
```

where `holly-mandarich.jpg` is the path to the image. We can change some options such as adding `{fig-align="right"}` to the end to change the alignment. But I end up not using this style that much because it is added as content, so it will push other content around, and it adheres to margins which I rarely want for tasks like this.

<iframe class="slide-deck" src="_image-basics.html">

</iframe>

Photo by <a href="https://unsplash.com/@hollymandarich?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Holly Mandarich</a> on <a href="https://unsplash.com/photos/person-carrying-yellow-and-black-backpack-walking-between-green-plants-UVyOfX3v0Ls?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

<a href="_image-basics.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

### Absolute position

Absolute is my favorite way of adding images. It gives me much more control over where the image is located and its size. 

You use the following syntax:

```md
![](noelle-rebekah.jpg){.absolute top=0 right=0 height="100%"}
```

Where you can use the following attributes:

| Attribute | Description                   |
|-----------|-------------------------------|
| `width`   | Width of element              |
| `height`  | Height of element             |
| `top`     | Distance from top of slide    |
| `left`    | Distance from left of slide   |
| `bottom`  | Distance from bottom of slide |
| `right`   | Distance from right of slide  |

you need one of `left` and `right` and one of `bottom` and `top` to give the correct location. I find that just using one of `width` or `height` is easier as it doesn't distort the image. All of these attributes accept all known CSS values, such as pixels, inches, and percentages. [All about CSS length](https://developer.mozilla.org/en-US/docs/Web/CSS/length) for more information.

<iframe class="slide-deck" src="_image-absolute.html">

</iframe>

All images in revealjs default to the following maximum sizes:

```css
max-width: 95%;
max-height: 95%;
```

No matter how large we set `width` or `height` we are overruled by `max-width` and `max-height`. We can make the image any size by overruling those. Specifically, we can unset them with `style="max-height: unset; max-width: unset;"`.

With some experimentation, we can size the image such that it is where we want it. Notice that we are using negative locations to make this happen as `0` is inside the slide.

```md
![](noelle-rebekah.jpg){.absolute top="-10%" right="-10%" height="120%" style="max-height: unset;"}
```

<iframe class="slide-deck" src="_image-absolute.html#/no-restrictions">

</iframe>

Photo by <a href="https://unsplash.com/@noellerebekah?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Noelle Rebekah</a> on <a href="https://unsplash.com/photos/woman-in-gray-jacket-leaning-on-white-car-during-daytime-H0KnTivRIXw?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>
  
<a href="_image-absolute.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

::: callout-warning
Since the way that positions are done in revealjs, it can be almost impossible to have the above effect for all aspect ratios. Make it work for the aspect ratio you use, and have peace.
:::

### Background image

The last way to add images, which I highly recommend is the use of background images. And in many ways, it is the simplest one.

you specify it on the slide level in the following way:

```md
## Slide Title {background-image="galen-crout.jpg"}
```

<iframe class="slide-deck" src="_image-background.html">

</iframe>

you can set other options such as [background-position](https://developer.mozilla.org/docs/Web/CSS/background-position) and [background-repeat](https://developer.mozilla.org/docs/Web/CSS/background-repeat) but I rarely end up using them.

I end up not setting a default title and use `.absolute` to place any content I want where I want it.

```md
## {background-image="galen-crout.jpg"}

[always explore]{.absolute left="50%" top="20%" style="rotate: -10deg;"}
```

<iframe class="slide-deck" src="_image-background.html#/section">

</iframe>

Photo by <a href="https://unsplash.com/@galen_crout?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Galen Crout</a> on <a href="https://unsplash.com/photos/person-on-top-of-mountain-during-daytime-fItRJ7AHak8?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

<a href="_image-background.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

As we see here, the text positioning can change how the slides are perceived. Both in style and emotion, try to think about how you can incorporate text positioning to maximize engagement.

## Overlayed Text Boxes

When using background images, it can be hard to place text on top of it, in a way that that keeps the text readable. This is often an issue with images that are more busy or have colors that match. A simple fix is to overlay a box, and we then add text on you. If we take the first slide here as an example.

```md
## {background-image="tim-marshall.jpg"}
```

<iframe class="slide-deck" src="_overlay-textbox.html">

</iframe>

First, we try to use `.absolute` to add some inspiring text. It adds text, but it is not easy to read at all!!

```md
## {background-image="tim-marshall.jpg"}

::: {.absolute left="55%" top="55%" style="font-size:1.8em;"}
Be Brave

Take Risks
:::
```

<iframe class="slide-deck" src="_overlay-textbox.html#/section-1">

</iframe>

But we can expand on this idea, adding a `background-color` to make it stand out. We also added some `padding`, otherwise the background would just be slightly bigger than the text itself.

## {background-image="tim-marshall.jpg"}

```md
::: {.absolute left="55%" top="55%" style="font-size:1.8em; padding: 0.5em 1em; background-color: rgba(255, 255, 255, .5);"}
Be Brave

Take Risks
:::
```

<iframe class="slide-deck" src="_overlay-textbox.html#/section-2">

</iframe>

it already looks quite good! We can make it pop just a little bit more, by adding a `backdrop-filter` to make it look a little glass-like, adding a `box-shadow` to make it look a little 3-dimensional, and adding a small `border-radius` to stop the sharp corners.

```md
## {background-image="tim-marshall.jpg"}

::: {.absolute left="55%" top="55%" style="font-size:1.8em; padding: 0.5em 1em; background-color: rgba(255, 255, 255, .5); backdrop-filter: blur(5px); box-shadow: 0 0 1rem 0 rgba(0, 0, 0, .5); border-radius: 5px;"}
Be Brave

Take Risks
:::
```

<iframe class="slide-deck" src="_overlay-textbox.html#/section-3">

</iframe>

Photo by <a href="https://unsplash.com/@timmarshall?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Tim Marshall</a> on <a href="https://unsplash.com/photos/ocean-tunnel-wave-uanoYn1AmPs?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>

<a href="_overlay-textbox.qmd" target="_blank" class="listing-slides btn-links">{{< fa file >}}qmd<a>

I think this turned out well. There are endless ways to use this. It is quite CSS-heavy work, but I think it is worth it. Note that you are always free to copy an example and modify it to your wants.

## Vary the type of slides

This post has shown a number of ways to place content on your slides. My final advice in this post is to use some of these tips to vary how the content is laid out. It doesn't have to be over the top, but slight variations can help a slide deck feel fresh.

## Roundup

I hope you learned a lot! I use all of these layouts and find them helpful. Please let me know of any layouts I have missed and you want me to cover!
