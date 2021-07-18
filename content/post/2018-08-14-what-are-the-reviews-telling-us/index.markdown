---
title: What are the reviews telling us?
date: '2018-08-17'
categories:
  - data visualization
tags:
  - tidytext
  - rvest
  - web scraping
summary: We will scrape and analyze IMDb reviews. We will try using log odds to tell good and bad reviews apart.
image:
  preview_only: true
---



<div class = "warning">
The data set for this blog post got lost and the code no longer runs.
</div>

<div class = "note">
This code has been slightly revised to make sure it works as of 2018-12-16.
</div>

In this post, we will look at a handful of English^[[#benderrule](https://thegradient.pub/the-benderrule-on-naming-the-languages-we-study-and-why-it-matters/)] movies reviews from [imdb](https://www.imdb.com/) which I have scraped and placed in this repository [movie reviews](https://github.com/EmilHvitfeldt/movie-reviews). I took a look at the best and worst rated movies with their best and worst reviews respectively. From that, we will try to see if we can see how positive reviews on good movies are different than positive reviews on bad movies and so on.

We will use fairly standard packages with the inclusion of **paletteer** for the sole reason of self-promotion. (yay!!!)


```r
library(tidyverse)
library(tidytext)
library(plotly)
library(paletteer)
```

we will read in the data using **readr**


```r
reviews_raw <- read_csv("https://raw.githubusercontent.com/EmilHvitfeldt/movie-reviews/master/reviews_v1.csv")
```

Let's take a look at the data I prepared for us:


```r
glimpse(reviews_raw)
```

It includes 7 different variables. There is some redundancy, the `url` variable contains the URL of the movie, and `id` and `title` are just the extracts from the `url` variable. The `rating` variable is the average rating of the movie and will not be used in this analysis. Lastly, we have the `review_rating` and `movie_rating` which will denote if the review is positive or negative and if the movie being reviewed is good or bad respectively.  

Let's start by unnesting the words and get the counts. We also don't want to look at all the stopwords and words that contain numbers, this is likely not a great number of words but we will exclude them for now anyway.


```r
counted_words <- unnest_tokens(reviews_raw, word, text) %>%
  count(word, movie_rating, review_rating) %>%
  anti_join(stop_words, by = "word") %>%
  filter(!str_detect(word, "\\d"))
```

And lets have a quick looks at the result:


```r
counted_words %>% arrange(desc(n)) %>% head(n = 15)
```

And we notice that the word *movie* has been used quite a lot more in reviews of bad movies than in good movies.

## Log odds

We have a bunch of counts here and we would like to find a worthwhile transformation of them. Since we have the number of reviews for good movies and bad movies we would be able to find the percentage of words appearing in good movies. This would give us a number between 0 and 1, where the interesting words would be when the percentage is close to 0 and 1 as it would show that the word is being used more in one than another.  

By doing this transformation to both the review scores and movie scores will give us the following plot:


```r
counted_words %>%
  mutate(rating = str_c(movie_rating, "_", review_rating)) %>%
  select(-movie_rating, -review_rating) %>%
  spread(rating, n) %>%
  drop_na() %>%
  mutate(review_lo = (bad_good + good_good) / (bad_bad + good_bad + bad_good + good_good),
         movie_lo = (good_bad + good_good) / (bad_bad + bad_good + good_bad + good_good)) %>%
  ggplot() +
  aes(movie_lo, review_lo) +
  geom_text(aes(label = word))
```

Another way to do this is to take the log of the odds of one event happening over the other event. We will create this little helper function for us.


```r
log_odds <- function(x, y) {
  total <- x + y
  p <- x / total
  log(p / (1 - p))
}
```

applying this transformation instead expands the limit from 0 to 1 to the whole number range where the midpoint is 0, this has some nice properties from a visualization perspective, it will also compact the center points a little more allowing outliers to be more prominent. 


```r
plot_data <- counted_words %>%
  mutate(rating = str_c(movie_rating, "_", review_rating)) %>%
  select(-movie_rating, -review_rating) %>%
  spread(rating, n) %>%
  drop_na() %>%
  mutate(review_lo = log_odds(bad_good + good_good, bad_bad + good_bad),
         movie_lo = log_odds(good_bad + good_good, bad_bad + bad_good))
```


```r
plot_data %>%
  ggplot() +
  aes(movie_lo, review_lo, label = word) +
  geom_text()
```

We have a good degree of overplotting in this plot, but part of that might be because of the text, a quick look at the scatterplot still reveals a good deal of overplotting. We will try to counter that later on.


```r
plot_data %>%
  ggplot() +
  aes(movie_lo, review_lo) +
  geom_point(alpha = 0.5)
```

Let us stay in the scatterplot. Lets tighten up the theme and include guidelines at y = 0 and x = 0. We will also find the range of the data to make sure we include all the points.


```r
plot_data %>% 
  select(movie_lo, review_lo) %>%
  range()
```


```r
plot_data %>%
  ggplot() +
  aes(movie_lo, review_lo) +
  geom_vline(xintercept = 0, color = "grey") +
  geom_hline(yintercept = 0, color = "grey") +
  geom_point(alpha = 0.5) +
  theme_minimal() +
  coord_cartesian(ylim = c(-4.6, 4.6),
                  xlim = c(-4.6, 4.6)) +
  labs(x = "← Bad Movies - Good Movies →", y = "← Bad Reviews - Good Reviews →")
```

We still have quite a bit of overplotting, I'm going to sample the points based on importance. The importance matrix I'm going to work with is the distance from the middle. In addition, we are going to display the number of times a word is used by the size of the points. 


```r
set.seed(13)
plot_data_v2 <- plot_data %>%
  mutate(distance = review_lo ^ 2 + movie_lo ^ 2,
         n = bad_bad + bad_good + good_bad + good_good) %>%
  sample_frac(0.1, weight = distance)

plot_data_v2 %>%  
  ggplot() +
  aes(movie_lo, review_lo, size = n) +
  geom_vline(xintercept = 0, color = "grey") +
  geom_hline(yintercept = 0, color = "grey") +
  geom_point(alpha = 0.5) +
  theme_minimal() +
  coord_cartesian(ylim = c(-4.6, 4.6),
                  xlim = c(-4.6, 4.6)) +
  labs(x = "← Bad Movies - Good Movies →", y = "← Bad Reviews - Good Reviews →")
```

Lastly, we will make the whole thing interactive with **plotly** to allow hover text. We include some colors to indicate the distance to the center. 


```r
p <- plot_data_v2 %>%  
  ggplot() +
  aes(movie_lo, review_lo, size = n, color = distance, text = word) +
  geom_vline(xintercept = 0, color = "grey") +
  geom_hline(yintercept = 0, color = "grey") +
  geom_point(alpha = 0.5) +
  theme_minimal() +
  coord_cartesian(ylim = c(-4.6, 4.6),
                  xlim = c(-4.6, 4.6)) +
  labs(x = "← Bad Movies - Good Movies →", 
       y = "← Bad Reviews - Good Reviews →",
       title = "What are people saying about the best and worst movies on IMDB?") +
  scale_color_paletteer_c("viridis::viridis") +
  guides(color = "none", size = "none")

ggplotly(p, width = 700, height = 700, displayModeBar = FALSE,
         tooltip = "text") %>% 
  config(displayModeBar = F)
```

And we are done and it looks amazing! With this dataviz, we can see that the word *overrated* is mainly used in negative reviews about good movies. Likewise *unfunny* is used in bad reviews about bad movies. There are many more examples that I'll let you explore by yourself.

Thanks for tagging along!

## References
- [The Words Men and Women Use When They Write About Love](https://www.nytimes.com/interactive/2017/11/07/upshot/modern-love-what-we-write-when-we-write-about-love.html)


