---
title: 'Announcing quarto-diagrams'
description: |
  quarto-diagrams is a new Quarto extension that adds a collection of circular and structured diagram styles.
date: '2026-06-03'
categories:
  - quarto
  - slidecraft 101
image: "featured.webp"
filters:
  - diagrams
---

```{=html}
<style>
.circle-flow, .pie, .process, .pyramid, .matrix,
.hierarchy, .funnel, .cycle, .venn, .stacked-venn {
  margin-bottom: 2.5rem;
}
</style>
```

I'm happy to announce [quarto-diagrams](https://emilhvitfeldt.github.io/quarto-diagrams/),
a Quarto extension for creating styled diagrams in HTML documents and RevealJS presentations.

## Installation

```bash
quarto add EmilHvitfeldt/quarto-diagrams
```

Then add the filter to your document YAML:

```yaml
filters:
  - diagrams
```

## Writing diagrams

Every style shares the same authoring model. 
You write a container div for the style you want,
then nest one `.item` div per entry.
Switching from one diagram to another is mostly a matter of changing the outer class.

<details>
<summary>Code</summary>

````markdown
::: {.circle-flow node-color="#41516C"}
::: item
Plan
:::
::: item
Build
:::
::: item
Ship
:::
:::
````

</details>

::: {.circle-flow node-color="#41516C"}
::: item
Plan
:::
::: item
Build
:::
::: item
Ship
:::
:::

## Styles

There are a number of different diagram styles to choose from.
Each is documented on its own page in the [docs](https://emilhvitfeldt.github.io/quarto-diagrams/).

A `pie` renders items as equal-sized wedges of a circle.

<details>
<summary>Code</summary>

````markdown
::: pie
::: {.item color="#41516C"}
Alice
:::
::: {.item color="#4CADAD"}
Bob
:::
::: {.item color="#E24A68"}
Carol
:::
::: {.item color="#FBCA3E"}
David
:::
::: {.item color="#EE8434"}
Eve
:::
:::
````

</details>

::: pie
::: {.item color="#41516C"}
Alice
:::
::: {.item color="#4CADAD"}
Bob
:::
::: {.item color="#E24A68"}
Carol
:::
::: {.item color="#FBCA3E"}
David
:::
::: {.item color="#EE8434"}
Eve
:::
:::

A `process` lays out a linear flow of steps connected by arrows.

<details>
<summary>Code</summary>

````markdown
::: {.process node-color="#4CADAD"}
::: item
Draft
:::
::: item
Review
:::
::: item
Publish
:::
:::
````

</details>

::: {.process node-color="#4CADAD"}
::: item
Draft
:::
::: item
Review
:::
::: item
Publish
:::
:::

Adding the `.chevron` modifier renders each step as an interlocking arrow tile,
with no separate connectors.

<details>
<summary>Code</summary>

````markdown
::: {.process .chevron node-color="#4CADAD"}
::: item
Draft
:::
::: item
Review
:::
::: item
Publish
:::
:::
````

</details>

::: {.process .chevron node-color="#4CADAD"}
::: item
Draft
:::
::: item
Review
:::
::: item
Publish
:::
:::

A `pyramid` stacks bands that narrow toward the top.

<details>
<summary>Code</summary>

````markdown
::: pyramid
::: {.item color="#41516C"}
Vision
:::
::: {.item color="#4CADAD"}
Strategy
:::
::: {.item color="#E24A68"}
Tactics
:::
::: {.item color="#FBCA3E"}
Operations
:::
:::
````

</details>

::: pyramid
::: {.item color="#41516C"}
Vision
:::
::: {.item color="#4CADAD"}
Strategy
:::
::: {.item color="#E24A68"}
Tactics
:::
::: {.item color="#FBCA3E"}
Operations
:::
:::

A `matrix` arranges items into a 2×2 grid along two labeled axes.

<details>
<summary>Code</summary>

````markdown
::: {.matrix x-axis="Market Share" y-axis="Growth" x-low="Low" x-high="High" y-low="Low" y-high="High" node-color="#41516C"}
::: item
Question Marks
:::
::: item
Stars
:::
::: item
Dogs
:::
::: item
Cash Cows
:::
:::
````

</details>

::: {.matrix x-axis="Market Share" y-axis="Growth" x-low="Low" x-high="High" y-low="Low" y-high="High" node-color="#41516C"}
::: item
Question Marks
:::
::: item
Stars
:::
::: item
Dogs
:::
::: item
Cash Cows
:::
:::

A `hierarchy` builds an org chart or tree from nested items.

<details>
<summary>Code</summary>

````markdown
::::: {.hierarchy node-color="#41516C"}
:::: item
CEO

::: item
CTO
:::

::: item
CFO
:::

::: item
COO
:::
::::
:::::
````

</details>

::::: {.hierarchy node-color="#41516C"}
:::: item
CEO

::: item
CTO
:::

::: item
CFO
:::

::: item
COO
:::
::::
:::::

A `funnel` shows narrowing stages, 
optionally sized by a `value` attribute.

<details>
<summary>Code</summary>

````markdown
::: funnel
::: {.item value="1000" color="#41516C"}
Visitors
:::
::: {.item value="600" color="#4CADAD"}
Leads
:::
::: {.item value="250" color="#E24A68"}
Qualified
:::
::: {.item value="80" color="#FBCA3E"}
Customers
:::
:::
````

</details>

::: funnel
::: {.item value="1000" color="#41516C"}
Visitors
:::
::: {.item value="600" color="#4CADAD"}
Leads
:::
::: {.item value="250" color="#E24A68"}
Qualified
:::
::: {.item value="80" color="#FBCA3E"}
Customers
:::
:::

A `cycle` draws a repeating loop of stages as arc arrows.

<details>
<summary>Code</summary>

````markdown
::: {.cycle node-color="#4CADAD"}
::: item
Plan
:::
::: item
Do
:::
::: item
Check
:::
::: item
Act
:::
:::
````

</details>

::: {.cycle node-color="#4CADAD"}
::: item
Plan
:::
::: item
Do
:::
::: item
Check
:::
::: item
Act
:::
:::

There are more styles than shown here, 
including [Venn](https://emilhvitfeldt.github.io/quarto-diagrams/venn.html) and [Stacked Venn](https://emilhvitfeldt.github.io/quarto-diagrams/stacked-venn.html) diagrams.

## Shared concepts

Because all the styles share one authoring model,
they also share a set of modifiers that work across diagrams.
The colors you've seen throughout are set with the `node-color` attribute on the
container or a `color` attribute on individual items, as covered on the
[colors page](https://emilhvitfeldt.github.io/quarto-diagrams/colors.html).

You can change the [node shapes](https://emilhvitfeldt.github.io/quarto-diagrams/node-shapes.html) with classes like `.node-box` and `.node-none`.

<details>
<summary>Code</summary>

````markdown
::: {.circle-flow .node-box node-color="#41516C"}
::: item
Alice
:::
::: item
Bob
:::
::: item
Carol
:::
::: item
Dave
:::
:::
````

</details>

::: {.circle-flow .node-box node-color="#41516C"}
::: item
Alice
:::
::: item
Bob
:::
::: item
Carol
:::
::: item
Dave
:::
:::

The [arrow types](https://emilhvitfeldt.github.io/quarto-diagrams/arrow-types.html) can be swapped with classes such as `.arrow-curved`, `.arrow-thin`, and `.arrow-double`.

<details>
<summary>Code</summary>

````markdown
::: {.circle-flow .node-box .arrow-curved node-color="#41516C"}
::: item
Alice
:::
::: item
Bob
:::
::: item
Carol
:::
::: item
Dave
:::
:::
````

</details>

::: {.circle-flow .node-box .arrow-curved node-color="#41516C"}
::: item
Alice
:::
::: item
Bob
:::
::: item
Carol
:::
::: item
Dave
:::
:::

## Docs

The full documentation lives at <https://emilhvitfeldt.github.io/quarto-diagrams/>, 
with a dedicated page for each style and shared concept showing what's possible with the built-in classes and attributes.
