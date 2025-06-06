---
title: Purrr - tips and tricks
description: |
  With the advent of purrrresolution on Twitter I'll throw my 2 cents in in form of my bag of tips and tricks.
date: '2018-01-08'
categories:
image: "featured.webp"
---

::: {.callout-note}
This code has been lightly revised to make sure it works as of 2018-12-16.
:::

## Purrr tips and tricks

If you like me started by only using `map()` and its cousins (`map_df`, `map_dbl`, etc) you are missing out on a lot of what `purrr` have to offer! With the advent of #purrrresolution on Twitter, I'll throw my 2 cents in in form of my bag of tips and tricks (which I'll update in the future).

First we load the packages:




```r
library(tidyverse)
library(repurrrsive) # datasets used in some of the examples.
```

### loading files

Multiple files can be read and combined at once using `map_df` and `read_cvs`.


```r
files <- c("2015.cvs", "2016.cvs", "2017.cvs")
map_df(files, read_csv)
```

Combine with `list.files` to create magic[^1].


```r
files <- list.files("../open-data/", pattern = "^2017", full.names = TRUE)
full <- map_df(files, read_csv)
```

### combine if you forget *_df the first time around.

If you like me sometimes forget to end my `map()` with my desired output. The last resort is to manually combine it in a second line if you don't want to replace `map()` with `map_df()` (which is properly the better advice, but can be handy in a pinch).


```r
X <- map(1:10000, ~ data.frame(x = .x))
X <- bind_rows(X)
```

### name shortcut in map

provide “TEXT” to extract the element named “TEXT”. Follow 3 lines are equivalent.


```r
map(got_chars, function(x) x[["name"]]) 
map(got_chars, ~ .x[["name"]])
map(got_chars, "name")
```

works the same with indexes.[^2]


```r
map(got_chars, function(x) x[[1]]) 
map(got_chars, ~ .x[[1]])
map(got_chars, 1)
```

### use {} inside map

If you don't know how to write the proper anonymous function or you want some counter in your `map()`, you can use `{}` to construct your anonymous function. 

Here is a simple toy example that shows that you can write multiple lines inside `map`.

```r
map(1:3, ~ {
  h <- .x + 2
  g <- .x - 2
  h + g
})
```


```r
map(1:3, ~ {
  Sys.sleep(10)
  cat(.x)
  .x
})
```

This can be very handy if you want to be a responsible (web scraping) pirate[^3].


```r
library(httr)
s_GET <- safely(GET)

pb <- progress_estimated(length(target_urls))
map(target_urls, ~{
  pb$tick()$print()
  Sys.sleep(5)
  s_GET(.x)
}) -> httr_raw_responses
```



### discard, keep and compact

`discard()` and `keep()` will provide very valuable since they help you filter your list/vector based on certain predictors.

They can be useful in cases of web scraping where certain lines are to be ignored.


```r
library(rvest)
url <- "http://www.imdb.com/chart/boxoffice"

read_html(url) %>%
  html_nodes('tr') %>%
  html_text() %>%
  str_replace_all("\n +", " ") %>%
  trimws() %>%
  keep(~ str_extract(.x, ".$") %in% 0:9) %>%
  discard(~ as.numeric(str_extract(.x, ".$")) > 5)
```

Where we here scrape Top Box Office (US) from IMDb.com and we use `keep()` to keeps all lines that end in an integer and `discards()` to discards all lines where the integer is more than 5.

`compact()` is a handy wrapper that removed all elements that are NULL.

### safely + compact

If you have a function that sometimes throws an error, warning, or for whatever reason isn't entirely stable, you can use the wonder of `safely()` and `compact()`. `safely()` is a function that takes a function `f()` and returns a function `safe_f()` that returns a list with the elements `result` and `error` where `result` is the output of `f()` if it is able to run, and `NULL` otherwise. This means that we can create a function that will always work!


```r
unstable_function <- function() {
  ...
}

safe_function <- safely(unstable_function)

map(data, ~ safe_function(.x)) %>%
  map("result") %>%
  compact()
```

combining this with `compact` which removes all `NULL` values thus returning only the successful calls.


### Reduce

`purrr` includes an little group of functions called `reduce()` (with its cousins `reduce_right()`, `reduce2()` and `reduce2_right()`) which iteratively combines from the left (right for `reduce_right()`) making


```r
reduce(list(x1, x2, x3), f)
f(f(x1, x2), x3)
```

equivalent. 

This example[^4] comes from Colin Fay shows how to use `reduce()`.


```r
regex_build <- function(list){
    reduce(list, ~ paste(.x, .y, sep = "|"))
}

regex_build(letters[1:5])
## [1] "a|b|c|d|e"
```

This example by Jason Becker[^6] shows how to easier label data using `reduce_right`.


```r
# Load a directory of .csv files that has each of the lookup tables
lookups <- map(dir('data/lookups'), read.csv, stringsAsFactors = FALSE)
# Alternatively if you have a single lookup table with code_type as your
# data attribute you're looking up
# lookups <- split(lookups, code_type)
lookups$real_data <- read.csv('data/real_data.csv', 
                              stringsAsFactors = FALSE)
real_data <- reduce_right(lookups, left_join)
```


### pluck

I find that a subsetting list can be a hassle more often than not. But `pluck()` have really helped to alleviate those problems quite a bit.


```r
list(A = list("a1","a2"), 
     B = list("b1", "b2"),
     C = list("c1", "c2"),
     D = list("d1", "d2", "d3")) %>% 
  pluck(1)
```

### head_while, tail_while

`purrr` includes the twins `head_while` and `tail_while` which will give you all the elements that satisfy the condition until the first time it doesn't. 


```r
X <- sample(1:100)

# This
p <- function(X) !(X >= 10)
X[seq(Position(p, X) - 1)]

# is the same as this
head_while(X, ~ .x >= 10)
```


### rerun

if you need to do some simulation studies `rerun` could prove very useful. It takes 2 arguments. `.n` is the number of times to run, and `...` is the expression that has to be rerun.


```r
rerun(.n = 10, rnorm(10)) %>%
  map_df(~ tibble(mean = mean(.x),
                  sd = sd(.x),
                  median = median(.x)))
```


### compose

This little wonder of a function composes multiple functions to be applied in order from right to left. 

This toy examples show how it works:


```r
sample(x = 1:6, size =  50, replace = TRUE) %>%
  table %>% 
  sort %>%
  names

dice1 <- function(n) sample(size = n, x = 1:6, replace = TRUE)
dice_rank <- compose(names, sort, table, dice1)
dice_rank(50)
```

A more informative is found here[^5]:


```r
library(broom)
tidy_lm <- compose(tidy, lm)
tidy_lm(Sepal.Length ~ Species, data = iris)
## # A tibble: 3 x 5
##   term              estimate std.error statistic   p.value
##   <chr>                <dbl>     <dbl>     <dbl>     <dbl>
## 1 (Intercept)          5.01     0.0728     68.8  1.13e-113
## 2 Speciesversicolor    0.930    0.103       9.03 8.77e- 16
## 3 Speciesvirginica     1.58     0.103      15.4  2.21e- 32
```

### imap

`imap()` is a handy little wrapper that acts as the indexed `map()`. Thus making it shorthand for `map2(x, names(x), ...)` when x have named and `map2(x, seq_along(x), ...)` when it doesn't have names.


```r
imap_dbl(sample(10), ~ {
  cat("draw nr", .y, "is", .x, "\n")
  .x
  })
```

or it could be used in conjunction with `rerun()` to easily add an id to each sample.


```r
rerun(.n = 10, rnorm(10)) %>%
  imap_dfr(~ tibble(run = .y, 
                    mean = mean(.x),
                    sd = sd(.x),
                    median = median(.x)))
```



## Sources

http://ghement.ca/purrr.html

http://statwonk.com/purrr.html

https://maraaverick.rbind.io/2017/09/purrr-ty-posts/

http://serialmentor.com/blog/2016/6/13/reading-and-combining-many-tidy-data-files-in-R

http://colinfay.me/purrr-web-mining/  

http://colinfay.me/purrr-text-wrangling/  

http://colinfay.me/purrr-set-na/  

http://colinfay.me/purrr-mappers/  

http://colinfay.me/purrr-code-optim/  

http://colinfay.me/purrr-statistics/  

[^1]: [ColinFay/df a list](https://gist.github.com/ColinFay/d74d331825868b181860212cd1577b69)

[^2]: [jennybc.github.io - Introduction to map(): extract elements](https://jennybc.github.io/purrr-tutorial/ls01_map-name-position-shortcuts.html)

[^3]: [Pirating Web Content Responsibly With R](https://rud.is/b/2017/09/19/pirating-web-content-responsibly-with-r/)

[^4]: [A Crazy Little Thing Called {purrr} - Part 2 : Text Wrangling](http://colinfay.me/purrr-text-wrangling/)

[^5]: [A Crazy Little Thing Called {purrr} - Part 5: code optimization](http://colinfay.me/purrr-code-optim/)

[^6]: [Labeling Data with purrr](http://www.json.blog/2017/03/labeling-data-with-purrr/)


