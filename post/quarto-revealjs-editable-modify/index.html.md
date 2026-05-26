---
title: 'Introducing modify mode for quarto-revealjs-editable'
description: |
  The recent release of quarto-revealjs-editable is bringing even more features and QoL improvements
date: '2026-05-27'
categories:
 - quarto
 - slidecraft 101
image: "featured.webp"
---

I have a new release for [quarto-revealjs-editable](https://emilhvitfeldt.github.io/quarto-revealjs-editable/),
which is my quarto revealjs extension that allows you to modify elements of slides by interacting with the rendered HTML slides instead of through the .qmd file.
This latest release is properly the biggest one yet,
with a new mode (**modify**) that allows for even more customization with less hassle.

This blog post will first show how the extension used to work if you are not familiar with it.
Then move on to show the new mode.

## Installing

First, you execute the following code in your terminal.

```bash
quarto add emilhvitfeldt/quarto-revealjs-editable
```

Then you need to add `editable` to both the `filters` and `revealjs-plugins` fields of your YAML.

```markdown
---
title: "My Presentation"
format: revealjs
revealjs-plugins:
  - editable
filters:
  - editable
---
```

Then you are good to go.
When you are done using this extension, 
see [final instructions](https://emilhvitfeldt.github.io/quarto-revealjs-editable/getting-started.html#preparing-for-final-presentation) for how to proceed.

## Old usage

This extension allows you to specify that you want an image or text block to be moved around.
You would do this by adding the `.editable` class to any image:

```markdown
![](image.png){.editable}
```

Likewise, you could add the `.editable` class to a fenced div like so:

```markdown
::: {.editable}
some text here
:::
```

Then, when you render your slides, these elements become editable.
You can reposition or resize images.
Text fields can be moved, resized, and even modified inline to fix typos or add additional text highlighting.

Once you are done moving things around,
you can press the Save button, which will then prompt you to overwrite the file that you are working on.
If you select the right file, then the changes are updated in the Quarto document.

Visually, the workflow looks like this.

![](old-demo-text.mp4)

The core loop then becomes:

1. Mark one or more elements with `.editable`
2. render slides
3. modify `.editable` elements
4. press Save
5. render slides

The real bottleneck here is adding `.editable` before doing anything.
Not only do you need to do it on an item-by-item basis,
but there are also elements that can't easily be selected like this.
The slide headers are a prime example of this, 
as setting the class in the header corresponds to the whole slide,
not just the text.

## Modify mode

Modify mode was created to alleviate many of the issues seen with the old approach.
You no longer have to pre-specify any element for modification.
Press the Modify button, then click on an element you wish to modify.
Once clicked, you are then free to move and edit the element.

All modifiable elements should have a green rectangle around them when you click Modify.
This is done to indicate which elements can and can't be changed.

Not every single element can be changed,
But a good number of elements already have support as listed [in this table](https://emilhvitfeldt.github.io/quarto-revealjs-editable/features.html#modify-mode).
If you believe an element type is missing or unsupported, please [file an issue](https://github.com/EmilHvitfeldt/quarto-revealjs-editable/issues/new).

Visually, the workflow looks like this.

![](modify.mp4)

The core loop now becomes:

1. Click Modify and click on the element you want to modify
3. modify `.editable` elements
4. press Save
5. render slides

We are not only reducing the number of times you need to render the slides in this loop.
We actually took away the need to modify the Quarto document directly at all.

This work is still fairly new;
It is recommended that you use this tool with version control active.
If you see any bugs, please [file an issue](https://github.com/EmilHvitfeldt/quarto-revealjs-editable/issues/new).
