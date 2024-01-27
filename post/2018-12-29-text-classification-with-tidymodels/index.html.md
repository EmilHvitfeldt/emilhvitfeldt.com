---
title: Text Classification with Tidymodels
description: |
  An early attempt at using tidymodels to perform text classification.
date: '2018-12-29'
categories:
  - tidymodels
image: "featured.png"
---



::: {.callout-caution}
This post was written with early versions of tidymodels packages. And in some ways have not aged perfectly. The general idea about this post is still valid, but if you want more up-to-date code please refer to <https://www.tidymodels.org/>.
:::

## Introduction

I have previously used this blog to talk about text classification a couple of times. [tidymodels](https://github.com/tidymodels/tidymodels) have since then seen quite a bit of progress. I did in addition get the [textrecipes](https://github.com/tidymodels/textrecipes) package on CRAN, which provides extra steps to [recipes](https://github.com/tidymodels/recipes) package from tidymodels.  

Seeing the always wonderful post by Julia Silge on [text classification with tidy data principles](https://juliasilge.com/blog/tidy-text-classification/) encouraged me to show how the same workflow also can be accomplished in tidymodels.  

To give this post a little spice will only be using stop words. Yes, you read that right, we will only keep stopping words. Words you are often encouraged to exclude as they don't provide much information. We will challenge that assumption in this post! To have a baseline for our stop word model will I be using the same data as Julia used in her post.

## Data

The data we will be using is the text from *Pride and Prejudice* and the text from *The War of the Worlds*. These texts can be get from [Project Gutenberg](https://www.gutenberg.org/) using the [gutenbergr](https://github.com/ropensci/gutenbergr) package. Note that both works are in English^[[#benderrule](https://thegradient.pub/the-benderrule-on-naming-the-languages-we-study-and-why-it-matters/)].


```r
library(tidyverse)
library(gutenbergr)

titles <- c(
  "The War of the Worlds",
  "Pride and Prejudice"
)
books <- gutenberg_works(title %in% titles) %>%
  gutenberg_download(meta_fields = "title") %>%
  mutate(title = as.factor(title)) %>%
  select(-gutenberg_id)

books
```

(deviating from Julia, will we drop the `gutenberg_id` variable as it is redundant, remove the `document` variable as it isn't needed in the tidymodels framework, and set the `title` variable as a factor as it works better with tidymodels used later on.)

I'm going to quote Julia to explain the modeling problem we are facing;

> We have the text data now and let’s frame the kind of prediction problem we are going to work on. Imagine that we take each book and cut it up into lines, like strips of paper (✨ confetti ✨) with an individual line on each paper. Let’s train a model that can take an individual line and give us a probability that this book comes from Pride and Prejudice vs. from The War of the Worlds.

So that is a fairly straightforward task, we already have the data as we want in `books`. Before we go on let's investigate the class imbalance.


```r
books %>%
  ggplot(aes(title)) +
  geom_bar() +
  theme_minimal() +
  labs(x = NULL,
       y = "Count",
       title = "Number of Strips in 'Pride and Prejudice' and 'The War of the Worlds'")
```

It is a little uneven, but we will carry on.

## Stop words

Let's first have a talk about stop words. These are the words that are needed for the sentences to be structurally sound but don't add any information. however, such a concept as "non-informational" is quite abstract and is bound to be highly domain-specific. We will be using the English snowball stop word lists provided by the [stopwords](https://github.com/quanteda/stopwords) package (because that is what textrecipes naively uses).


```r
library(stopwords)
stopwords(language = "en", source = "snowball") %>% sort()
```

this list contains 175 words. Many of these words will at first glance pass the "non-informational" test. However, if you look at it more you will realize that many of these can have meaning in certain contexts. The word "i" for example will be used more in blog posts than legal documents. Secondly, there appear to be quite a lot of negation words, "wouldn't", "don't", "doesn't" and "mustn't" just to list a few. This is another reminder that constructing your own stop word list can be highly beneficial for your project as the default list might not work in your field.

While these words are assumed to have little information, the distribution of them and the relational information contained with how the stop word is used compared to each other might give us some information anyways. One author might use negations more often than another, maybe someone really likes to use the word "nor". These kinds of features can be extracted as the distributional information, or in other words "counts". We will count how often each stop word appears and hope that some of the words can divide the authors. Next, we have the order in which words appear in. This is related to writing style, some authors might write "... will you please..." while others might use "... you will handle...". The way each word combination is used might be worth a little bit of information. We will capture the relational information with ngrams.  

We will briefly showcase how this works with an example.


```r
sentence <- "This is an example sentence that is used to explain the concept of ngrams."
```

to extract the ngrams we will use the [tokenizers](https://github.com/ropensci/tokenizers) package (also default in textrecipes). Here we can get all the trigrams (ngrams of length 3).


```r
library(tokenizers)
tokenize_ngrams(sentence, n = 3)
```

however, we would also like to the singular word counts (unigrams) and bigrams (ngrams of length 2). This can easily be done by setting the `n_min` argument.


```r
tokenize_ngrams(sentence, n = 3, n_min = 1)
```

Now we get unigrams, bigrams, and trigrams in one. But wait, we wanted to limit our focus to stop words. Here is how the end result will look once we exclude all non-stop words and perform the ngram operation.


```r
tokenize_words(sentence) %>%
  unlist() %>%
  intersect(stopwords(language = "en", source = "snowball")) %>%
  paste(collapse = " ") %>%
  print() %>%
  tokenize_ngrams(n = 3, n_min = 1)
```

We have quite a reduction in ngrams than the full sentence, but hopefully there is some information within.

## Training & testing split

Before we start modeling we need to split our data into a testing and training set. This is easily done using the [rsample](https://github.com/tidymodels/rsample) package from tidymodels.


```r
library(tidymodels)
set.seed(1234) 

books_split <- initial_split(books, strata = "title", p = 0.75)
train_data <- training(books_split)
test_data <- testing(books_split)
```

## Preprocessing

The next step is to do the preprocessing. For this will we use the [recipes](https://github.com/tidymodels/recipes) from tidymodels. This allows us to specify a preprocessing design that can be train on the training data and applied to the training and testing data alike. I created textrecipes as recipes don't naively support text preprocessing. 

I'm are going to replicate Julia's preprocessing here to make comparisons easier for myself. Notice the `step_filter()` call, the original text have quite a lot of empty lines and these don't contain any textual information at all so we will filter away these observations. Note also that we could have used `all_predictors()` instead of `text` as it is the only predictor we have.


```r
library(textrecipes)
julia_rec <- recipe(title ~ ., data = train_data) %>%
  step_filter(text != "") %>%
  step_tokenize(text) %>%
  step_tokenfilter(text, min_times = 11) %>%
  step_tf(text) %>%
  prep(training = train_data)
julia_rec
```

This recipe will remove empty texts, tokenize to words (default in `step_tokenize()`), keeping words that appear 10 times or more in the training set, and then count how many times each word appears. The processed data looks like this


```r
julia_train_data <- juice(julia_rec)
julia_test_data  <- bake(julia_rec, test_data)

str(julia_train_data, list.len = 10)
```

The reason we get  features and Julia got 1652 is because she did her filtering on the full dataset where we only did the filtering on the training set and that Julia didn't explicitly remove empty observations.  

Back to stop words!! In this case, we need a slightly more complicated recipe


```r
stopword_rec <- recipe(title ~ ., data = train_data) %>%
  step_filter(text != "") %>%
  step_tokenize(text) %>%
  step_stopwords(text, keep = TRUE) %>%
  step_untokenize(text) %>%
  step_tokenize(text, token = "ngrams", options = list(n = 3, n_min = 1)) %>%
  step_tokenfilter(text, min_times = 10) %>%
  step_tf(text) %>%
  prep(training = train_data)
stopword_rec
```

First, we tokenize to words, remove all non-stop words, untokenize (which is basically just `paste()` with a fancy name), tokenize to ngrams, remove ngrams that appear less than 10 times, and lastly we count how often each ngram appear.


```r
# Processed data
stopword_train_data <- juice(stopword_rec)
stopword_test_data  <- bake(stopword_rec, test_data)

str(stopword_train_data, list.len = 10)
```

And we are left with  features.

## Modeling

For modeling, we will be using the [parsnip](https://github.com/tidymodels/parsnip) package from tidymodels. First, we start by defining a model specification. This defines the intent of our model, what we want to do, not what we want to do it on. Meaning we don't include the data yet, just the kind of model, its hyperparameters, and the engine (the package that will do the work). We will be using glmnet package here so we will specify a logistic regression model


```r
glmnet_model <- logistic_reg(mixture = 0, penalty = 0.1) %>%
  set_engine("glmnet")
glmnet_model
```

Here we will fit the models using both our training data, first using the stop words, then using the simple would count approach.


```r
stopword_model <- glmnet_model %>%
  fit(title ~ ., data = stopword_train_data)

julia_model <- glmnet_model %>%
  fit(title ~ ., data = julia_train_data)
```

This is the part of the workflow where one should do hyperparameter optimization and explore different models to find the best model for the task. For the interest of the length of this post will this step be excluded, possibly to be explored in a future post 😉.

## Evaluation

Now that we have fitted the data based on the training data we can evaluate based on the testing data set. Here we will use the parsnip functions `predict_class()` and `predict_classprob()` to give us the predicted class and predicted probabilities for the two models. Neatly collecting the whole thing in one tibble.


```r
eval_tibble <- stopword_test_data %>%
  select(title) %>%
  mutate(
    class_stopword = parsnip:::predict_class(stopword_model, stopword_test_data),
    class_julia    = parsnip:::predict_class(julia_model, julia_test_data),
    prop_stopword  = parsnip:::predict_classprob(stopword_model, stopword_test_data) %>% pull(`The War of the Worlds`),
    prop_julia     = parsnip:::predict_classprob(julia_model, julia_test_data) %>% pull(`The War of the Worlds`)
  )

eval_tibble
```

Tidymodels includes the [yardstick](https://github.com/tidymodels/yardstick) package which makes evaluation calculations much easier and tidy. It can allow us to calculate the accuracy by calling the `accuracy()` function


```r
accuracy(eval_tibble, truth = title, estimate = class_stopword)
accuracy(eval_tibble, truth = title, estimate = class_julia)
```

And we see that the stop words model beats the naive model (one that always picks the majority class) while lacking behind the word count model.


```r
test_data %>%
  filter(text != "") %>%
  summarise(mean(title == "Pride and Prejudice"))
```

We are also able to plot the ROC curve using `roc_curve()`(notice how we are using the predicted probabilities instead of class) and `autoplot()`  


```r
eval_tibble %>%
  roc_curve(title, prop_stopword) %>%
  autoplot()
```

To superimpose both ROC curve we are going to tidyr our data a little bit.


```r
eval_tibble %>%
  rename(`Word Count` = prop_julia, `Stopwords` = prop_stopword) %>%
  gather("Stopwords", "Word Count", key = "Model", value = "Prop") %>%
  group_by(Model) %>%
  roc_curve(title, Prop) %>%
  autoplot() +
  labs(title = "ROC curve for text classification using word count or stopwords",
       subtitle = "Predicting whether text was written by Jane Austen or H.G. Wells") +
  paletteer::scale_color_paletteer_d("ggsci::category10_d3")
```

## Conclusion

I'm not going to tell you that you should run an "all stop words only" model every time you want to do text classification. But I hope this exercise shows you that stop words which are assumed to have no information do indeed have some degree of information. Please always look at your stop word list, check if you even need to remove them, some studies [show that removal of stop words might not provide the benefit you thought](http://www.cs.cornell.edu/~xanda/stopwords2017.pdf).  

Furthermore, I hope to have shown the power of tidymodels. Tidymodels is still growing, so if you have any feedback/bug reports/suggests please go to the respective repositories, we would highly appreciate it!

## Comments

This plot was suggested in the comments, Thanks Isaiah!


```r
stopword_model$fit %>% 
  tidy() %>%
  mutate(term = str_replace(term, "tf_text_", "")) %>%
  group_by(estimate > 0) %>%
  top_n(10, abs(estimate)) %>%
  ungroup() %>%
  ggplot(aes(fct_reorder(term, estimate), estimate, fill = estimate > 0)) +
  geom_col(alpha = 0.8, show.legend = FALSE) +
  coord_flip() +
  theme_minimal() +
  labs(x = NULL,
  title = "Coefficients that increase/decrease probability the most",
  subtitle = "Stopwords only")
```

And Isaiah notes that

> Whereas Julia's analysis using nonstop words showed that Elizabeth is the opposite of a Martian, stop words show that Pride and Prejudice talks of men and women, and War of the Worlds makes declarations about existence.

Which I would like to say looks pretty spot on.


