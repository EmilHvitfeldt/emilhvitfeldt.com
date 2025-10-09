---
title: 'Managing python for R package development'
description: |
  Some R packages use python, and setting up good practices makes the development easier.
date: '2024-02-19'
categories:
  - package development
image: "featured.webp"
---

My day-to-day job involved working with R packages. Some of these packages use Python code in various ways. For example, [parsnip uses Tensorflow](https://parsnip.tidymodels.org/reference/details_linear_reg_keras.html) as one of its engines. A good Python installation is required to properly develop these packages.

This is the background for the work described below. I have been dealing with this for a couple of years now, and my latest attempt at dealing with this felt good enough to blog about.

## Backup

Python installation still feels a little scary to me. So I try to work with the utmost caution. For this reason, I did a complete backup of my computer before moving on.

::: {.callout-caution}
I'm likely not going to be able to help you if your system gets messed up. Please back up accordingly, or trust me.
:::

This step is optional if you like living on the edge. 

## Burn it all down

The whole reason why this post exists is because I messed up my system so much that I had a hard time doing my job. I wanted to avoid the mistakes of my past. For this reason, I decided to remove as much Python from my machine as possible. Aside from my [newest book](https://feaz-book.com/) and package development, I haven't used Python much outside of package development from R's point of view.

I used `reticulate::conda_list()` to list all my conda environments. From this, I went and deleted all the folders that contained these. So if the folder was `/emil/stuff/installs/bin/python/` I would delete the `/emil/stuff/installs/` folder.

Next, I used `reticulate::virtualenv_list()` to list all the virtual environments that reticulate knew of. A quick way to deal with this is to run `reticulate::virtualenv_list() |> lapply(reticulate::virtualenv_remove)`.

For my use case, I knew that this should cover all the Python I wanted to delete.

This step is also optional. Making something new doesn't mean you have to clean up your old mess.

## Install Python

I will be using [pyenv](https://github.com/pyenv/pyenv) to handle python installation and virtual environments. I find it quite easy to use and it does exactly what I want it to do.

[Install it](https://github.com/pyenv/pyenv#installation) to your machine and we are ready to go. This is a command line tool, so you need to get your terminal out.

This tool is similar to [rig](https://github.com/r-lib/rig), in that we will use it to manage our Python installs. First, we call `pyenv install 3.11`. This makes pyenv install Python 3.11. At the type of writing, this is the most recent version of Python I can use across my projects as Tensorflow doesn't have 3.12 support yet. If you need multiple different pythons, you can use `pyenv install ***` for each version you want.

Next, I run `pyenv global 3.11`. This sets the global version for pyenv. So now pyenv will make `python` fetch Python 3.11.

## Create python virtual environments

Now that we have the Python version installed we wanna work with, we can set up some [virtual environments](https://virtualenv.pypa.io/en/stable/). These are self-contained Python installations. Ideally, we want to have one for each project we are working on. This way, we don't run into issues when we install something for project A, that then breaks the installs for project B.

There are ways of locating virtual environments. Either putting them in the project themselves or a different easy-to-find place. I will be doing the second option, as I work with other people on these R packages, and I don't want to leave a trace, as I would need to populate `.gitignore` using the first option. 

I will be using the `~/.virtualenvs/`folder as my easy-to-find place and the name is good and [reticulate](https://rstudio.github.io/reticulate/) knows about it.

First, we need to create the **v**irtual **env**ironment based on the Python version we set earlier. Below is how we do that. The last part of the command is the location of where we want the venv. In this case, it is for the R package [embed](https://embed.tidymodels.org/), so I named the venv accordingly.

```bash
python -m venv ~/.virtualenvs/rpkg-embed
```

Now that we have our venv we need to do something to it, as it is completely basic right now. It follows the `activate -> do stuff -> deactivate` pattern. I need to install Tensorflow, so I run the following commands:

```bash
source ~/.virtualenvs/rpkg-embed/bin/activate
python -m pip install tensorflow
python -m pip install tensorflow-metal
deactivate
```

The first line sources the `activate` script so we are activated in the venv. Next, we run a couple of `pip install`, and lastly we `deactivate` to step back out. 

This process is repeated for each venv I need, with different `pip install` for each venv depending on what they need.

::: {.callout-note}
I also create one basic venv that I don't do anything to, that I want to use as a fallback. 

`python -m venv ~/.virtualenvs/r-base`
:::

## Using virtual environments

I don't want to think about these venvs in my day-to-day work. But I also want it to just work, even if I switch back and forth between packages that require different Python things. So in an effort to avoid leaving a trace in the packages themselves, I added the following code to my `.Rprofile` (can be opened with `usethis::edit_r_profile()`).

```r
# Python reticulate setup
if (is.null(Sys.getenv("RETICULATE_PYTHON"))) {
  Sys.setenv(
    RETICULATE_PYTHON = switch(
      basename(getwd()),
      embed = "~/.virtualenvs/rpkg-embed/bin/python",
      parsnip = "~/.virtualenvs/rpkg-parsnip/bin/python",
      "~/.virtualenvs/r-base/bin/python" # Default
    )
  )
}
```

Using the basename of the working directory, it tries to figure out what package I’m in. Is it perfect? no! But it runs fairly fast (12µs) and hasn’t given me any false positives yet.

The `switch()` then takes that and finds the corresponding venv for each package. This is then used to set the environment variable `RETICULATE_PYTHON`. The last line in the `switch()` is my fallback venv. This way, I always have a working Python installation attached.

The outer `if` makes sure that if `RETICULATE_PYTHON` is set in `Renviron` then it is respected. This way I can use environment variables in other projects as I see fit.

If you instead want to do a per-project specification, you can use a project-specific `.Renviron`. To be opened with `usethis::edit_r_environ("project")`. Inside that file, you can put the following to set a specific venv.

```bash
RETICULATE_PYTHON = "~/your-env-name/bin/python"
```

## The end

Is this the best way of doing things? I don't know. But I'm happy with the results so far, and I hope that you do too.