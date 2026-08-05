---
title: 'Theming and window chrome in quarto-revealjs-codewindow'
description: |
  Version 1.6.0 of quarto-revealjs-codewindow brings full color and geometry customization, Windows-style window buttons, and a pile of new file icons
date: '2026-08-05'
categories:
 - quarto
 - slidecraft 101
image: "featured.webp"
---

I have a new release for [quarto-revealjs-codewindow](https://github.com/EmilHvitfeldt/quarto-revealjs-codewindow),
which is my Quarto revealjs extension that wraps code chunks in a styled editor window.
It contains enough good new stuff that I thought a blog post was in order.

## Installing and Basic Usage

```bash
quarto add emilhvitfeldt/quarto-revealjs-codewindow
```

Then add `codewindow` to the `revealjs-plugins` field of your YAML.

```markdown
---
title: "My Presentation"
format: revealjs
revealjs-plugins:
  - codewindow
---
```

The basic usage is unchanged.
Wrap a code chunk in a `.codewindow` fenced div,
add a language class for the file icon,
and put the file name as plain text before the chunk like so:

````markdown
::: {.codewindow .r}
analysis.R
```r
mean(1:10)
```
:::
````

## More file icons

I added a lot of new icons this time around.

New in this release:

- Formats and tooling: `sql`, `markdown`, `yaml`, `json`, `git`, `bash`
- Statistical and scientific languages: `rmd` ([#3](https://github.com/EmilHvitfeldt/quarto-revealjs-codewindow/issues/3)), `stan` and `mplus` ([#11](https://github.com/EmilHvitfeldt/quarto-revealjs-codewindow/issues/11)), `sas`, `spss`, `stata`, `matlab`, `cpp`, `fortran`
- General-purpose languages: `typescript`, `rust`, `go`

Additionally the following aliases have been added as well:
`scss`, `md`, `yml`, `qmd`, `jl`, `f90`, `ts`, `javascript`, `golang`, `rmarkdown`, and `sh`/`zsh`/`shell`/`console` for `terminal`.

You can see some of these in use here:

<iframe class="slide-deck" src="_icons-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

## Window chrome

Before, you were forced to use the Mac-styled menu buttons.
With the `chrome` argument you can now switch it up a bit.

- `mac` (the default): three round buttons on the left
- `windows`: minimize, maximize and close on the right
- `none`: no buttons at all, so the file tabs start at the window edge

````markdown
::: {.codewindow .sass chrome="windows"}
styles.scss
```scss
.pink {
  color: pink;
}
```
:::
````

<iframe class="slide-deck" src="_chrome-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

## Colors

The longest coming change is also the most useful IMO.
We finally have some easier customization!
You used to be more or less locked into the design I have chosen,
not anymore!

Every color in the window can now be changed using code fence arguments.
These are: `bg`, `header-bg`, `tab-bg`, `tab-active-bg`, `color` and `shadow-color`.
You can set as many or as few as you would like in each codewindow.

````markdown
::: {.codewindow .sass bg="#fdf6e3" header-bg="#eee8d5" shadow-color="#93a1a1"}
styles.scss
```scss
.pink {
  color: pink;
}
```
:::
````

This can get tedious really fast,
so you can also set these globally by putting this in your CSS file:

```css
.reveal {
  --codewindow-bg: #fdf6e3;
  --codewindow-header-bg: #eee8d5;
  --codewindow-tab-bg: #d9d2ba;
  --codewindow-tab-active-bg: #fdf6e3;
  --codewindow-color: #073642;
  --codewindow-shadow-color: #93a1a1;
}
```

I also added one built-in darkmode theme,
which you can set with `.codewindow-dark`.

````markdown
::: {.codewindow .sass .codewindow-dark}
styles.scss
```scss
.pink {
  color: pink;
}
```
:::
````

All of this can be seen in the following slide example.

<iframe class="slide-deck" src="_colors-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

## Geometry

Much the same as color,
I have also made it so you can change some of the geometries of the codewindows.

- `--codewindow-radius`: the window corner radius (`10px`)
- `--codewindow-header-height`: the height of the header bar (`30px`)
- `--codewindow-header-pad`: the gap between the window edge and its contents (`16px`)
- `--codewindow-tab-radius`: the corner radius of a file tab (`10px 10px 0 0`)
- `--codewindow-tab-gap`: the space between file tabs (`8px`)
- `--codewindow-tab-padding`: the horizontal padding inside a file tab (`20px`)
- `--codewindow-tab-inactive-opacity`: how far back inactive tabs sit (`0.6`)

Squaring off the corners is a one-liner,
and so is tightening everything up for a denser look.

```css
.reveal {
  --codewindow-radius: 0px;
  --codewindow-tab-radius: 0px;
}
```

The deck below shows the default window,
a squared-off one,
and a compact one where the header and tabs are tightened up.

<iframe class="slide-deck" src="_geometry-example.html" style="width: 100%; aspect-ratio: 2 / 1;">
</iframe>

