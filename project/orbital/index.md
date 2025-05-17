---
title: orbital
date: "2024-07-28"
description: |
  Turning fitted workflows into SQL for easy predictions in databases
categories:
 - R package
image: "featured.svg"
---

<div class="project-buttons">
<a href="https://orbital.tidymodels.org/">
 {{< fa door-open >}} Website
</a>
<a href="https://github.com/tidymodels/orbital/">
 {{< fa brands github >}} github
</a>
<a href="https://cloud.r-project.org/web/packages/orbital/index.html">
 {{< fa brands r-project >}} CRAN
</a>
</div>
<br>

Orbital lets you take a fitted tidymodels workflow and convert it to the SQL that you can execute to generate predictions the same way as with `predict()` on the original workflow. This offers a few benefits. Firstly, it creates a much smaller and lower dependency object from which to perform predictions. Secondly, creating SQL (or any flavor) lets you supercharge your deployment by avoiding the need to set up an environment for predictions and instead handle it in the database directly.

Here is an example of [Running tidymodel prediction workflows inside databases with orbital and Snowflake](https://posit.co/blog/running-tidymodel-prediction-workflows-inside-databases/).

This project has spun off a Python library of the same name at <https://posit-dev.github.io/orbital/> written by [Alessandro Molina](https://github.com/amol-).