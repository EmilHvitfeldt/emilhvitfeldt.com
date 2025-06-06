---
title: Authorship classification with tidymodels and textrecipes
description: |
  An early attempt at using tidymodels to perform text classification.
date: '2019-08-09'
categories:
  - tidymodels
  - textrecipes
image: "featured.webp"
---




::: {.callout-caution}
This post was written with early versions of tidymodels packages. And in some ways have not aged perfectly. The general idea about this post is still valid, but if you want more up-to-date code please refer to <https://www.tidymodels.org/>.
:::

In this post, we will revisit one of my earlier [blogposts](https://www.hvitfeldt.me/blog/predicting-authorship-in-the-federalist-papers-with-tidytext/) where I tried to use tidytext and glmnet to predict the authorship of the anonymous Federalist Papers. If you want more information regarding the data, please read the old post. In the post, we will try to achieve the same goal but use the [tidymodels](https://www.tidyverse.org/articles/2018/08/tidymodels-0-0-1/) framework.

## Loading Packages


```r
library(tidymodels) # Modeling framework
library(textrecipes) # extension to preprocessing engine to handle text
library(stringr) # String modification
library(gutenbergr) # Portal to download the Federalist Papers
library(tokenizers) # Tokenization engine
library(furrr) # to be able to fit the models in parallel
```

## Fetching the Data

The text is provided from the [Gutenberg Project](https://www.gutenberg.org/wiki/Main_Page). A simple search reveals that the Federalist Papers have the id of 1404. Note that the text is in English^[[#benderrule](https://thegradient.pub/the-benderrule-on-naming-the-languages-we-study-and-why-it-matters/)].


```r
papers <- gutenberg_download(1404)
papers
```

## shaping data

This is the first we will deviate from the original post in that we will divide the text into paragraphs instead of sentences as we did in the last post. Hopefully, this will strike a good balance between the size of each observation and the number of observations.

In the following pipe we:
- `pull()` out the text vector
- paste together the strings with `\n` to denote line-breaks
- tokenize into paragraphs
- put it in a tibble
- create a variable `no` to denote which paper the paragraph is in
- add `author` variable to denote the author
- remove preamble text


```r
# attribution numbers
hamilton <- c(1, 6:9, 11:13, 15:17, 21:36, 59:61, 65:85)
madison <- c(10, 14, 18:20, 37:48)
jay <- c(2:5, 64)
unknown <- c(49:58, 62:63)

papers_paragraphs <- papers %>%
  pull(text) %>%
  str_c(collapse = "\n") %>%
  tokenize_paragraphs() %>%
  unlist() %>%
  tibble(text = .) %>%
  mutate(no = cumsum(str_detect(text, regex("FEDERALIST No",
                                            ignore_case = TRUE)))) %>%
  mutate(author = case_when(no %in% hamilton ~ "hamilton",
                            no %in% madison ~ "madison",
                            no %in% jay ~ "jay",
                            no %in% unknown ~ "unknown")) %>%
  filter(no > 0)
```

## Class Balance

There is quite a bit of imbalance between the classes. For the remainder of the analysis will we exclude all the papers written by `Jay`, partly because it is a small class, but more importantly because he isn't suspected to be the mystery author.


```r
papers_paragraphs %>%
  count(author) %>%
  ggplot(aes(author, n)) +
  geom_col()
```

It is worth remembering that we don't have the true answer, much more like in real-world problems.

## Splitting the Data

Here we will use the `rsample` package to split the data into testing, validation, and training data sets. We will let the testing dataset be all the paragraphs where `author == "unknown"` and the training and validation datasets being the paragraphs written by Hamilton and Madison. `intial_split()` will insure that each dataset has the same proportions with respect to the `author` column.


```r
data_split <- papers_paragraphs %>%
  filter(author %in% c("hamilton", "madison")) %>%
  initial_split(strata = author)

training_data <- training(data_split)

validation_data <- testing(data_split)

testing_data <- papers_paragraphs %>%
  filter(author == "unknown")
```

## specifying data preprocessing

We will go with a rather simple preprocessing. start by specifying a recipe where `author` is to be predicted, and we only want to use the `text` data. Here we make sure to use the training dataset. We then

- tokenize according to (n-grams)[https://www.tidytextmining.com/ngrams.html]
- only keep the 250 most frequent tokens
- calculate the (term frequency-inverse document frequency)[https://en.wikipedia.org/wiki/Tf%E2%80%93idf]
- up-sample the observation to achieve class balance

and finally prep the recipe.


```r
rec <- recipe(author ~ text, data = training_data) %>%
  step_tokenize(text, token = "ngrams", options = list(n = 3)) %>%
  step_tokenfilter(text, max_tokens = 250) %>%
  step_tfidf(text) %>%
  step_upsample(author) %>%
  prep()
```

## Apply Preprocessing

Now we apply the prepped recipe to get back the processed datasets. Note that I have used shorter names for processed datasets (`train_data` vs `training_data`).


```r
train_data <- juice(rec)
val_data <- bake(rec, new_data = validation_data)
test_data <- bake(rec, new_data = testing_data)
```

## Fitting the Models

This time I'm going to try to run some (random forests)[https://en.wikipedia.org/wiki/Random_forest]. And that would be fairly easy to use. First, we specify the model type (`rand_forest`) the type (`classification`), and the engine (`randomForest`). Next, we fit the model to the training dataset, predict it on the validation datasets, add the true value and calculate the accuracy


```r
rand_forest("classification") %>%
  set_engine("randomForest") %>%
  fit(author ~ ., data = train_data) %>%
  predict(new_data = val_data) %>%
  mutate(truth = val_data$author) %>%
  accuracy(truth, .pred_class)
```

However, we want to try some different hyperparameter values to make sure we are using the best we can. The `dials` allow us to do hyper-parameter searching in a fairly easy way. First, we will create a parameter_grid, where we will vary the number of trees in our forest (`trees()`) and the number of predictors to be randomly sampled. We give it some reasonable ranges and say that we want 5 levels for each parameter, resulting in `5 * 5 = 25` parameter pairs.


```r
param_grid <- grid_regular(range_set(trees(), c(50, 250)), 
                           range_set(mtry(), c(1, 15)), levels = 5)
```

Next, we create a model specification where we use `varying()` to denote that these parameters are to be varying. 
Then we `merge()` the model specification into the parameter grid such that we have a tibble of model specifications


```r
rf_spec <- rand_forest("classification", mtry = varying(), trees = varying()) %>%
  set_engine("randomForest")

param_grid <- param_grid %>%
  mutate(specs = merge(., rf_spec))

param_grid
```

Next, we want to iterate through the model specification. We will here create a function that will take a model specification, fit it to the training data, predict according to the validation data, calculate the accuracy and return it as a single number. Create this function makes so we can use `map()` over all the model specifications. 


```r
fit_one_spec <- function(model) {
  model %>%
    fit(author ~ ., data = train_data) %>%
    predict(new_data = val_data) %>%
    mutate(truth = val_data$author) %>%
    accuracy(truth, .pred_class) %>%
    pull(.estimate)
}
```

While this is a fairly small dataset, I'll showcase how we can parallelize the calculations. Since we have a framework where are we `map()`'ing over the specification it is an obvious case for the `furrr` package. (if you don't want or isn't able to to run your models on multiple cores, simply delete `plan(multicore)` and turn `future_map_dbl()` to `map_dbl()`). 


```r
plan(multicore)
final <- param_grid %>%
  mutate(accuracy = future_map_dbl(specs, fit_one_spec))
```

Now we can try to visualize the optimal hyper-parameters


```r
final %>%
  mutate_at(vars(trees:mtry), factor) %>%
  ggplot(aes(mtry, trees, fill = accuracy)) +
  geom_tile() +
  scale_fill_viridis_c()
```

and we see that only having 1 predictor to split with it is sub-optimal, but otherwise having a low number of predictors are to be preferred. We can use `arrange()` to look at the top parameter pairs


```r
arrange(final, desc(accuracy)) %>%
  slice(1:5)
```

and we pick `trees == 100` and `mtry == 4` as our hyper-parameters. And we use these to fit our final model


```r
final_model <- rf_spec %>%
  update(trees = 100, mtry = 4) %>%
  fit(author ~ ., data = train_data)
```

## Predicting the unknown papers

Lastly, we predict on the unknown papers.


```r
final_predict <- testing_data %>% 
  bind_cols(predict(final_model, new_data = test_data)) 
```

We can't calculate accuracy or any other metric, as we don't know the true value. However, we can see how the different paragraphs have been classified within each paper.


```r
final_predict %>%
  count(no, .pred_class) %>%
  mutate(no = factor(no)) %>%
  group_by(no) %>%
  mutate(highest = n == max(n))
```

Now we can visualize the results, and it looks like from this limited analysis that Hamilton is the author of mysterious papers.


```r
final_predict %>%
  count(no, .pred_class) %>%
  mutate(no = factor(no),
         .pred_class = factor(.pred_class, 
                              levels = c("hamilton", "madison"), 
                              labels = c("Hamilton", "Madison"))) %>%
  group_by(no) %>%
  mutate(highest = n == max(n)) %>%
  ggplot(aes(no, n, fill = .pred_class, alpha = highest)) +
  scale_alpha_ordinal(range = c(0.5, 1)) +
  geom_col(position = "dodge", color = "black") +
  theme_minimal() +
  scale_fill_manual(values = c("#304890", "#6A7E50")) +
  guides(alpha = "none") +
  theme(legend.position = "top") +
  labs(x = "Federalist Paper Number",
       y = "Number of paragraphs",
       fill = "Author",
       title = "Hamilton were predicted more often to be the author then\nMadison in all but 1 Paper")
    
```

## Conclusion

In this post we have touched on a lot of different topics; tidymodels, text preprocessing, parallel computing, etc. Since we have covered so many topics have left each section not covered in a lot of detail. In a more proper analysis, you would want to try some different models and different ways to do the preprocessing.


