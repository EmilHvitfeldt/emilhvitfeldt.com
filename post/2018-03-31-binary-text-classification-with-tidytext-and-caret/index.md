---
title: Binary text classification with tidytext and caret
description: |
  One of my first attempts at text classification. This example uses tidytext and caret. There are mistakes here methodically and it should not be used as a guide.
date: '2018-03-31'
categories:
  - tidytext
image: "featured.png"
---

the scope of this blog post is to show how to do binary text classification using standard tools such as `tidytext` and `caret` packages. One of if not the most common binary text classification task is the spam detection (spam vs non-spam) that happens in most email services but has many other application such as language identification (English vs non-English).  

In this post I'll showcase 5 different classification methods to see how they compare with this data. The methods all land on the less complex side of the spectrum and thus does not include creating complex deep neural networks.  

An expansion of this subject is multiclass text classification which I might write about in the future.

## Packages

We load the packages we need for this project. `tidyverse` for general data science work, `tidytext` for text manipulation and `caret` for modeling.


```r
library(tidyverse)
library(tidytext)
library(caret)
```

## Data

The data we will be using for this demonstration will be some English^[[#benderrule](https://thegradient.pub/the-benderrule-on-naming-the-languages-we-study-and-why-it-matters/)] [social media disaster tweets](https://data.world/crowdflower/disasters-on-social-media) discussed in [this article](https://arxiv.org/pdf/1705.02009.pdf). 
It consist of a number of tweets regarding accidents mixed in with a selection control tweets (not about accidents). We start by loading in the data.


```r
data <- read_csv("https://raw.githubusercontent.com/EmilHvitfeldt/blog/750dc28aa8d514e2c0b8b418ade584df8f4a8c92/data/socialmedia-disaster-tweets-DFE.csv")
```

And for this exercise we will only look at the body of the text. Furthermore a handful of the tweets weren't classified, marked `"Can't Decide"` so we are removing those as well. Since we are working with tweet data we have the constraint that most of tweets don't actually have that much information in them as they are limited in characters and some only contain a couple of words.  

We will at this stage remove what appears to be urls using some regex and `str_replace_all`, and we will select the columns `id`, `disaster` and `text`.


```r
data_clean <- data %>%
  filter(choose_one != "Can't Decide") %>%
  mutate(id = `_unit_id`,
         disaster = choose_one == "Relevant",
         text = str_replace_all(text, " ?(f|ht)tp(s?)://(.*)[.][a-z]+", "")) %>%
  select(id, disaster, text)
```

First we take a quick look at the distribution of classes and we see if the classes are balanced


```r
data_clean %>%
  ggplot(aes(disaster)) +
  geom_bar()
```

And we see that is fairly balanced so we don't have to worry about sampling this time.  

The representation we will be using in this post will be the [bag-of-words](https://en.wikipedia.org/wiki/Bag-of-words_model) representation in which we just count how many times each word appears in each tweet disregarding grammar and even word order (mostly).  

We will construct a tf-idf vector model in which each unique word is represented as a column and each document (tweet in our case) is a row of the tf-idf values. This will create a very large matrix/data.frame (a column of each unique word in the total data set) which will overload a lot of the different models we can implement, furthermore will a lot of the words (or features in ML slang) not add considerably information. We have a trade off between information and computational speed.  

First we will remove all the stop words, this will insure that common words that usually don't carry meaning doesn't take up space (and time) in our model. Next will we only look at words that appear in 10 different tweets. Lastly we will be looking at both [unigrams and bigrams](https://en.wikipedia.org/wiki/N-gram) to hopefully get a better information extraction.  


```r
data_counts <- map_df(1:2,
                      ~ unnest_tokens(data_clean, word, text, 
                                      token = "ngrams", n = .x)) %>%
  anti_join(stop_words, by = "word") %>%
  count(id, word, sort = TRUE)
```

We will only look at words at appear in at least 10 different tweets.


```r
words_10 <- data_counts %>%
  group_by(word) %>%
  summarise(n = n()) %>% 
  filter(n >= 10) %>%
  select(word)
```

we will right-join this to our data.frame before we will calculate the tf_idf and cast it to a document term matrix.


```r
data_dtm <- data_counts %>%
  right_join(words_10, by = "word") %>%
  bind_tf_idf(word, id, n) %>%
  cast_dtm(id, word, tf_idf)
```

This leaves us with 2993 features. We create this meta data.frame which acts as a intermediate from our first data set since some tweets might have disappeared completely after the reduction.


```r
meta <- tibble(id = as.numeric(dimnames(data_dtm)[[1]])) %>%
  left_join(data_clean[!duplicated(data_clean$id), ], by = "id")
```

We also create the index (based on the `meta` data.frame) to separate the data into a training and test set.


```r
set.seed(1234)
trainIndex <- createDataPartition(meta$disaster, p = 0.8, list = FALSE, times = 1)
```

since a lot of the methods take data.frames as inputs we will take the time and create these here:


```r
data_df_train <- data_dtm[trainIndex, ] %>% as.matrix() %>% as.data.frame()
data_df_test <- data_dtm[-trainIndex, ] %>% as.matrix() %>% as.data.frame()

response_train <- meta$disaster[trainIndex]
```

Now each row in the data.frame is a document/tweet (yay tidy principles!!).  

## Missing tweets

In the feature selection earlier we decided to turn our focus towards certain words and word-pairs, with that we also turned our focus AWAY from certain words. Since the tweets are fairly short in length it wouldn't be surprising if a handful of the tweets completely skipped out focus as we noted earlier. Lets take a look at those tweets here.


```r
data_clean %>%
  anti_join(meta, by = "id") %>%
  head(25) %>%
  pull(text)
```

We see that a lot of them appears to be part of urls that our regex didn't detect, furthermore it appears that in those tweet the sole text was the url which wouldn't have helped us in this case anyways.

## Modeling

Now that we have the data all clean and tidy we will turn our heads towards modeling. We will be using the wonderful `caret` package which we will use to employ the following models

- [Support vector machine](https://en.wikipedia.org/wiki/Support_vector_machine)
- [Naive Bayes](https://en.wikipedia.org/wiki/Naive_Bayes_classifier)
- [LogitBoost](https://en.wikipedia.org/wiki/LogitBoost)
- [Random forest](https://en.wikipedia.org/wiki/Random_forest)
- [feed-forward neural networks](https://en.wikipedia.org/wiki/Artificial_neural_network)

These where chosen because of their frequent use ( [why SVM are good at text classification](http://www.cs.cornell.edu/people/tj/publications/joachims_98a.pdf) ) or because they are common in the classification field. They were also chosen because they where able to work with data with this number of variables in a reasonable time.

First time around we will not use a resampling method.


```r
trctrl <- trainControl(method = "none")
```

## SVM

The first model will be the `svmLinearWeights2` model from the [LiblineaR](https://cran.r-project.org/web/packages/LiblineaR/index.html) package. Where we specify default parameters.


```r
svm_mod <- train(x = data_df_train,
                 y = as.factor(response_train),
                 method = "svmLinearWeights2",
                 trControl = trctrl,
                 tuneGrid = data.frame(cost = 1, 
                                       Loss = 0, 
                                       weight = 1))
```

We predict on the test data set based on the fitted model.


```r
svm_pred <- predict(svm_mod,
                    newdata = data_df_test)
```

lastly we calculate the confusion matrix using the `confusionMatrix` function in the `caret` package. 


```r
svm_cm <- confusionMatrix(svm_pred, meta[-trainIndex, ]$disaster)
svm_cm
```

and we get an accuracy of 0.7461646.

## Naive-Bayes

The second model will be the `naive_bayes` model from the [naivebayes](https://cran.r-project.org/web/packages/naivebayes/index.html) package. Where we specify default parameters.


```r
nb_mod <- train(x = data_df_train,
                y = as.factor(response_train),
                method = "naive_bayes",
                trControl = trctrl,
                tuneGrid = data.frame(laplace = 0,
                                      usekernel = FALSE,
                                      adjust = FALSE))
```

We predict on the test data set based on the fitted model.


```r
nb_pred <- predict(nb_mod,
                   newdata = data_df_test)
```

calculate the confusion matrix


```r
nb_cm <- confusionMatrix(nb_pred, meta[-trainIndex, ]$disaster)
nb_cm
```

and we get an accuracy of 0.5564854.

## LogitBoost

The third model will be the `LogitBoost` model from the [caTools](https://cran.r-project.org/web/packages/caTools/index.html) package. We don't have to specify any parameters.


```r
logitboost_mod <- train(x = data_df_train,
                        y = as.factor(response_train),
                        method = "LogitBoost",
                        trControl = trctrl)
```

We predict on the test data set based on the fitted model.


```r
logitboost_pred <- predict(logitboost_mod,
                           newdata = data_df_test)
```

calculate the confusion matrix


```r
logitboost_cm <- confusionMatrix(logitboost_pred, meta[-trainIndex, ]$disaster)
logitboost_cm
```

and we get an accuracy of 0.632729.

## Random forest

The fourth model will be the `ranger` model from the [caTools](https://cran.r-project.org/web/packages/ranger/index.html) package. Where we specify default parameters.


```r
rf_mod <- train(x = data_df_train, 
                y = as.factor(response_train), 
                method = "ranger",
                trControl = trctrl,
                tuneGrid = data.frame(mtry = floor(sqrt(dim(data_df_train)[2])),
                                      splitrule = "gini",
                                      min.node.size = 1))
```

We predict on the test data set based on the fitted model.


```r
rf_pred <- predict(rf_mod,
                   newdata = data_df_test)
```

calculate the confusion matrix


```r
rf_cm <- confusionMatrix(rf_pred, meta[-trainIndex, ]$disaster)
rf_cm
```

and we get an accuracy of 0.7777778.

## nnet

The fifth and final model will be the `nnet` model from the [caTools](https://cran.r-project.org/web/packages/nnet/index.html) package. Where we specify default parameters. We will also specify `MaxNWts = 5000` such that it will work. It will need to be more then the number of columns multiplied the size.


```r
nnet_mod <- train(x = data_df_train,
                    y = as.factor(response_train),
                    method = "nnet",
                    trControl = trctrl,
                    tuneGrid = data.frame(size = 1,
                                          decay = 5e-4),
                    MaxNWts = 5000)
```

We predict on the test data set based on the fitted model.


```r
nnet_pred <- predict(nnet_mod,
                     newdata = data_df_test)
```

calculate the confusion matrix


```r
nnet_cm <- confusionMatrix(nnet_pred, meta[-trainIndex, ]$disaster)
nnet_cm
```

and we get an accuracy of 0.7173408.

## Comparing models

To see how the different models stack out we combine the metrics together in a `data.frame`.


```r
mod_results <- rbind(
  svm_cm$overall, 
  nb_cm$overall,
  logitboost_cm$overall,
  rf_cm$overall,
  nnet_cm$overall
  ) %>%
  as.data.frame() %>%
  mutate(model = c("SVM", "Naive-Bayes", "LogitBoost", "Random forest", "Neural network"))
```

visualizing the accuracy for the different models with the red line being the "No Information Rate" that is, having a model that just picks the model common class.


```r
mod_results %>%
  ggplot(aes(model, Accuracy)) +
  geom_point() +
  ylim(0, 1) +
  geom_hline(yintercept = mod_results$AccuracyNull[1],
             color = "red")
```

As you can see all but one approach does better then the "No Information Rate" on its first try before tuning the hyperparameters.

## Tuning hyperparameters

After trying out the different models we saw quite a spread in performance. But it important to remember that the results might be because of good/bad default hyperparameters. There are a few different ways to handle this problem. I'll show on of them here, grid search, on the SVM model so you get the idea. 

We will be using 10-fold [cross-validation](https://en.wikipedia.org/wiki/Cross-validation_(statistics)) and 3 repeats, which will slow down the procedure, but will try to limit and reduce overfitting. We will be using [grid search](https://en.wikipedia.org/wiki/Hyperparameter_optimization#Grid_search) approach to find optimal hyperparameters. For the sake of time have to fixed 2 of the hyperparameters and only let one vary. Remember that the time it takes to search though all combinations take a long time when then number of hyperparameters increase.


```r
fitControl <- trainControl(method = "repeatedcv",
                           number = 3,
                           repeats = 3,
                           search = "grid")
```

We have decided to limit the search around the `weight` parameter's default value 1.


```r
svm_mod <- train(x = data_df_train,
                 y = as.factor(response_train),
                 method = "svmLinearWeights2",
                 trControl = fitControl,
                 tuneGrid = data.frame(cost = 0.01, 
                                       Loss = 0, 
                                       weight = seq(0.5, 1.5, 0.1)))
```

and once it have finished running we can plot the train object to see which value is highest.


```r
plot(svm_mod)
```

And we see that it appear to be just around 1. It is important to search multiple parameters at the SAME TIME as it can not be assumed that the parameters are independent of each others. Only reason I didn't do that here was to same the time.  

I will leave to you the reader to find out which of the models have the highest accuracy after doing parameter tuning.  

I hope you have enjoyed this overview of binary text classification. 

<details closed>
<summary> <span title='Click to Expand'> session information </span> </summary>

```r

─ Session info ───────────────────────────────────────────────────────────────
 setting  value                       
 version  R version 4.1.0 (2021-05-18)
 os       macOS Big Sur 10.16         
 system   x86_64, darwin17.0          
 ui       X11                         
 language (EN)                        
 collate  en_US.UTF-8                 
 ctype    en_US.UTF-8                 
 tz       America/Los_Angeles         
 date     2021-07-13                  

─ Packages ───────────────────────────────────────────────────────────────────
 package     * version date       lib source                           
 blogdown      1.3.2   2021-06-09 [1] Github (rstudio/blogdown@00a2090)
 bookdown      0.22    2021-04-22 [1] CRAN (R 4.1.0)                   
 bslib         0.2.5.1 2021-05-18 [1] CRAN (R 4.1.0)                   
 cli           3.0.0   2021-06-30 [1] CRAN (R 4.1.0)                   
 clipr         0.7.1   2020-10-08 [1] CRAN (R 4.1.0)                   
 crayon        1.4.1   2021-02-08 [1] CRAN (R 4.1.0)                   
 desc          1.3.0   2021-03-05 [1] CRAN (R 4.1.0)                   
 details     * 0.2.1   2020-01-12 [1] CRAN (R 4.1.0)                   
 digest        0.6.27  2020-10-24 [1] CRAN (R 4.1.0)                   
 evaluate      0.14    2019-05-28 [1] CRAN (R 4.1.0)                   
 htmltools     0.5.1.1 2021-01-22 [1] CRAN (R 4.1.0)                   
 httr          1.4.2   2020-07-20 [1] CRAN (R 4.1.0)                   
 jquerylib     0.1.4   2021-04-26 [1] CRAN (R 4.1.0)                   
 jsonlite      1.7.2   2020-12-09 [1] CRAN (R 4.1.0)                   
 knitr       * 1.33    2021-04-24 [1] CRAN (R 4.1.0)                   
 magrittr      2.0.1   2020-11-17 [1] CRAN (R 4.1.0)                   
 png           0.1-7   2013-12-03 [1] CRAN (R 4.1.0)                   
 R6            2.5.0   2020-10-28 [1] CRAN (R 4.1.0)                   
 rlang         0.4.11  2021-04-30 [1] CRAN (R 4.1.0)                   
 rmarkdown     2.9     2021-06-15 [1] CRAN (R 4.1.0)                   
 rprojroot     2.0.2   2020-11-15 [1] CRAN (R 4.1.0)                   
 sass          0.4.0   2021-05-12 [1] CRAN (R 4.1.0)                   
 sessioninfo   1.1.1   2018-11-05 [1] CRAN (R 4.1.0)                   
 stringi       1.6.2   2021-05-17 [1] CRAN (R 4.1.0)                   
 stringr       1.4.0   2019-02-10 [1] CRAN (R 4.1.0)                   
 withr         2.4.2   2021-04-18 [1] CRAN (R 4.1.0)                   
 xfun          0.24    2021-06-15 [1] CRAN (R 4.1.0)                   
 xml2          1.3.2   2020-04-23 [1] CRAN (R 4.1.0)                   
 yaml          2.2.1   2020-02-01 [1] CRAN (R 4.1.0)                   

[1] /Library/Frameworks/R.framework/Versions/4.1/Resources/library

```

</details>
<br>
