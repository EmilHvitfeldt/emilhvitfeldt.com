---
title: 'Claude Code: Setting up ast-grep with R support'
description: |
  If you are using a coding agent such as Claude Code, then you can get so much out of it by using CLI tools.
date: '2026-02-26'
categories:
 - AI
image: "featured.webp"
---

When coding or using coding agents,
one way to improve your workflow is by using CLI tools with a very clear focus.
This is especially useful since coding agents primarily ingest text.

One new amazing tool I found was [ast-grep](https://ast-grep.github.io/), which allows us to search code by its syntax instead of using regular expressions.
This lets us search for things that are otherwise really hard to get right in regex, like:

- "All if-else statements with an `return()` in one of the branches"
- "All functions with 5-6 arguments"
- "All used of `util_fun()` used with `debug` argument"

ast-grep doens't have native R support, but we are able to add it using [custom language support](https://ast-grep.github.io/advanced/custom-language.html).

## Installing things

First, you need to [install ast-grep](https://ast-grep.github.io/guide/quick-start.html#installation).
I used [brew](https://brew.sh/) with

```bash
brew install ast-grep
```

Next we need to [install tree-sitter-cli](https://crates.io/crates/tree-sitter-cli) which i did with [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/).

```bash
npm install -g tree-sitter-cli
```

Lastly, we need to add the R grammar that tree-sitter understands.

::: {.callout-note}
I'm on a Mac, and that is what I know to work with,
the general spirit of what to do should easily translate to other OS.
:::

First, we create a config directory for astp-grep.

```bash
mkdir -p ~/.config/ast-grep
```

Then we need to generate the dynamic library of tree-sitter-r such that ast-grep can use it.

```bash
# Clone and compile the R grammar
cd /tmp
git clone https://github.com/r-lib/tree-sitter-r.git
cd tree-sitter-r
tree-sitter build --output ~/.config/ast-grep/r.dylib
```

## Adding R config

Now that we have everything we need,
we can let ast-grep ingest and understand tree-sitter-r.
Start by creating `~/.config/ast-grep/sgconfig.yml` and add the following to it

```yaml
customLanguages:
  r:
    libraryPath: /Users/YOUR-USER-NAME-HERE/.config/ast-grep/r.dylib
    extensions: [r, R]
    expandoChar: _
```

And as a quality-of-life improvement, we also add an alias so we don't need to type out the config each time we use it.

Add to `~/.zshrc`:

```bash
alias sg='ast-grep run -c ~/.config/ast-grep/sgconfig.yml'
```

## Claude Code integration

I personally want Claude Code to know about this tool, no matter which project I'm on,
So I am adding the following to `~/.claude/CLAUDE.md` so future sessions know about this setup:

```markdown
## ast-grep with R support

R language support is configured globally via `~/.config/ast-grep/sgconfig.yml`.

Usage:
\```bash
sg -l r -p 'pattern' .
\```

Note: Use `_VAR` for named metavariables and `___` for wildcards (not `$VAR`) because R uses `$` for column access.
```

## Usage

We can also use the tool,
the documentation [has a wonderful guide](https://ast-grep.github.io/guide/introduction.html),
and the examples listed above can be done with:

```bash
# Find if-else statements with return() in a branch
sg -l r -p 'if (___) { return(___) } else ___' .
sg -l r -p 'if (___) ___ else { return(___) }' .

# Find functions with 5-6 arguments
sg -l r -p 'function(_A, _B, _C, _D, _E) _BODY' .
sg -l r -p 'function(_A, _B, _C, _D, _E, _F) _BODY' .

# Find uses of util_fun() with debug argument
sg -l r -p 'util_fun(debug = ___)' .
```