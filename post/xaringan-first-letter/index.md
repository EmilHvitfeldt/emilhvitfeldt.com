---
title: 'xaringan first-letter'
descriptin: |
  Small post showing how to use the css ::first-letter pseudo selector to create more interesting slides.
date: '2021-03-22'
categories:
  - xaringan
image: "featured.png"
---

I recently saw the use of the  [::first-letter](https://css-tricks.com/almanac/selectors/f/first-letter/) pseudo selector and I was hooked! and I was hooked! This selector allows you to style the first letter in a block, sometimes called a [drop cap](https://en.wikipedia.org/wiki/Initial), and can be used to add a little flair to your [xaringan](https://github.com/yihui/xaringan) slides. These selectors can just as well be used in any other Html output, they are not limited to xaringan.

You can either add the pseudo selector to an existing class, but I'm going to add a new CSS class so I can apply it whenever I want. Below is a class called `.drop-cap` that doesn't do anything by itself, but has a `::first-letter` pseudo selector that doubles the font-size of the first letter.


```css
.drop-cap::first-letter {
  font-size: 200%;
}
```


<style type="text/css">
.drop-cap::first-letter {
  font-size: 200%;
}
</style>

Next, we have the information we are putting in the slide

.drop-cap[
# Sample Header
]

.drop-cap[
> All the .drop-cap[statistics] in the world can't measure the warmth of a smile.
]

.drop-cap[
Duis vel viverra elit, eget hendrerit odio. Curabitur cursus elit nec diam vulputate, nec sollicitudin nunc ornare. Ut mi lectus, aliquet non ligula sed, lobortis vehicula erat. Morbi porttitor orci ut semper dapibus. Donec sodales tellus varius tortor varius, ornare commodo augue maximus. Vestibulum quis bibendum mi, sit amet lobortis leo. Morbi vulputate orci arcu, ac lobortis sapien gravida eget. Nulla non interdum orci, nec congue ligula.
]

And the result:

<div class="iframe-container iframe-slides"><iframe src="_first-letter.html" width="700px" height="525px" style="border:2px solid currentColor;" data-external=1></iframe></div>

and look, each of the first letters of the selected blocks has had their size doubled. Notice that while the word statistics had a `.drop-cap` around it, it remained unchanged, this is because `::first-letter` only works on blocks.

We can also get a little bit fancier with our styling to create nice-looking drop caps, next example is inspired by this [video](https://thegymnasium.com/take5/creating-beautiful-and-accessible-drop-caps) by Ethan Marcotte.


```css
.drop-cap::first-letter {
  color: #B22222;
  float: left;
  font-size: 75px;
  line-height: 60px;
  padding-top: 4px;
  padding-right: 8px;
  padding-left: 3px;
}
```


<style type="text/css">
.drop-cap::first-letter {
  color: #B22222;
  float: left;
  font-size: 75px;
  line-height: 60px;
  padding-top: 4px;
  padding-right: 8px;
  padding-left: 3px;
}
</style>

Here we get a nice drop cap that spans multiple lines.

<div class="iframe-container iframe-slides"><iframe src="_fancy-first-letter.html" width="700px" height="525px" style="border:2px solid currentColor;" data-external=1></iframe></div>

Lastly, there is also a related selector called [first-line](https://www.w3schools.com/cssref/sel_firstline.asp) that works in just the same way as `::first-letter` except that it applies the style to the entire first line.


```css
.super-line::first-line {
  color: #B22222;
  font-size: 120%;
  font-weight: bold;
}
```


<style type="text/css">
.super-line::first-line {
  color: #B22222;
  font-size: 120%;
  font-weight: bold;
}
</style>

<div class="iframe-container iframe-slides"><iframe src="_first-line.html" width="700px" height="525px" style="border:2px solid currentColor;" data-external=1></iframe></div>

I hope you can use these two selectors to add a little something special to your next set of xaringan slides!
