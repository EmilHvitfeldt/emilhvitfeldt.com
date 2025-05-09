---
title: Recreate - Sankey flow chart
description: |
  This entry in the recreate series explores how gganimate can be used to create Sankey flow charts.
date: '2018-03-21'
categories:
  - ggplot2
image: "featured.webp"
---

::: {.callout-warning}
This blogpost uses the old api for gganimate and will not work with current version. No update of this blogpost is planned for this moment.
:::

Hello again! I this mini-series (of in-determined length) will I try as best as I can to recreate great visualizations in tidyverse. The recreation may be exact in terms of data, or using data of a similar style. 

## The goal - A flowing sankey chart from nytimes

In this excellent article [Extensive Data Shows Punishing
Reach of Racism for Black Boys](  
https://www.nytimes.com/interactive/2018/03/19/upshot/race-class-white-and-black-men.html) by NYTimes includes a lot of very nice charts, both in motion and still. The chart that got biggest reception is the following:

<img src="nytimes.png" width="100%" style="display: block; margin: auto;" />

(see article for moving picture) We see a animated flow chart that follow the style of the classical Sankey chart. This chart will be the goal in this blog post, with 2 changes for brevity. firstly will I use randomly simulated data for my visualization and secondly will I not include the counters on the right-hand side of the chart and only show the creation of the counter on the left-hand as they are created in much the same fashion. 

## R packages

First we need some packages, but very few of those. Simply using `tidyverse` and `gganimate` for animation.


```r
library(tidyverse)
library(gganimate)
```

## Single point

We will start with animating a single point first. The path of each point closely resembles a sigmoid curve. I have used those in past visualizations, namely [Visualizing trigrams with the Tidyverse ](https://www.hvitfeldt.me/2018/01/visualizing-trigrams-with-the-tidyverse/). 

and we steal the function I created in that post


```r
sigmoid <- function(x_from, x_to, y_from, y_to, scale = 5, n = 100) {
  x <- seq(-scale, scale, length = n)
  y <- exp(x) / (exp(x) + 1)
  tibble(x = (x + scale) / (scale * 2) * (x_to - x_from) + x_from,
         y = y * (y_to - y_from) + y_from)
}
```

And to get along with that we will have out data


```r
n_points <- 400
data <- tibble(from = rep(4, n_points),
               to = sample(1:4, n_points, TRUE),
               color = sample(c("A", "B"), n_points, TRUE)) 
```

here the data is fairly clean and tidy, with numerical values for `from` and `to` but this endpoint should be able to be achieved in most any other appropriate type of data.  

To simulate the path of a single data point we will use the custom `sigmoid` on the data for a single row. This gives us this smooth curve of points that resembles the path taken by the points in the original visualization.


```r
sigmoid(0, 1, as.numeric(data[2, 1]), as.numeric(data[2, 2]), 
        n = 100, scale = 10) %>%
  ggplot(aes(x, y)) +
  geom_point()
```

<img src="01-old.png" width="700px" style="display: block; margin: auto;" />

To set this in motion we will employ `gganimate`, for this we will add a `time` column to act as the frame.


```r
p <- sigmoid(0, 1, as.numeric(data[2, 1]), as.numeric(data[2, 2]),
             n = 100, scale = 10) %>%
  mutate(time = row_number()) %>%
  ggplot(aes(x, y, frame = time)) +
  geom_point()

gganimate(p)
```

<img src="02-old.gif" width="700px" style="display: block; margin: auto;" />

Which looks very nice so far. Next step is to have multiple points flowing towards different locations.

## multiple points

To account for the multiple points we will wrap everything from last section inside a `map_df` to iterate over the rows. To avoid over plotting we introduce some uniform noise to each point. 


```r
p <- map_df(seq_len(nrow(data)), 
    ~ sigmoid(0, 1, as.numeric(data[.x, 1]), as.numeric(data[.x, 2])) %>%
      mutate(time = row_number() + .x,
             y = y + runif(1, -0.25, 0.25))) %>%
  ggplot(aes(x, y, frame = time)) +
  geom_point() 

gganimate(p)
```

<img src="03-old.gif" width="700px" style="display: block; margin: auto;" />

Everything looks good so far, however the points all look the same, so we will do a little bit of beautification now rather then later. In addition to that will we save the data for the different components in different objects.  

the following `point_data` have the modification with `bind_cols` that binds the information from the `data` data.frame to the final object. We include the color and removing all themes and guides.


```r
point_data <- map_df(seq_len(nrow(data)), 
    ~ sigmoid(0, 1, as.numeric(data[.x, 1]), as.numeric(data[.x, 2])) %>%
      mutate(time = row_number() + .x,
             y = y + runif(1, -0.25, 0.25),
             id = .x) %>%
      bind_cols(bind_rows(replicate(100, data[.x, -(1:2)], simplify = FALSE))))

p <- ggplot(point_data, aes(x, y, color = color, frame = time)) +
  geom_point(shape = 15) +
  theme_void() +
  guides(color = "none")

gganimate(p, title_frame = FALSE)
```

<img src="04-old.gif" width="700px" style="display: block; margin: auto;" />

Which already looks way better. Next up to include animated counter on the left hand side that indicates how many points that have been introduced in the animation. This is simply done by counting how many have started their paths and afterwards padding to fill the length of the animation.  


```r
start_data_no_end <- point_data %>%
  group_by(id) %>%
  summarize(time = min(time)) %>%
  count(time) %>%
  arrange(time) %>%
  mutate(n = cumsum(n),
         x = 0.125, 
         y = 2,
         n = str_c("Follow the lives of ", n, " squares"))
  


# duplicating last number to fill gif
start_data <- start_data_no_end %>%
  bind_rows(
    map_df(unique(point_data$time[point_data$time > max(start_data_no_end$time)]),
          ~ slice(start_data_no_end, nrow(start_data_no_end)) %>%
              mutate(time = .x))
  )
```

This is added to our plot by the use of `geom_text` with a new data argument. We did some `stringr` magic to have a little annotation appear instead of the number itself. Important to have the `hjust = 0` such that the annotation doesn't move around too much. 


```r
p <- ggplot(point_data, aes(x, y, color = color, frame = time)) +
  geom_point(shape = 15) +
  geom_text(data = start_data, hjust = 0,
            aes(label = n, frame = time, x = x, y = y), color = "black") +
  theme_void() +
  guides(color = "none")

gganimate(p, title_frame = FALSE)
```

<img src="05-old.gif" width="700px" style="display: block; margin: auto;" />

## Ending boxes

Like the original illustration there are some boxes where the points "land" in. these are very easily replicated. This will be done a little more programmatic such that it adapts to multiple outputs. 


```r
ending_box <- data %>%
  pull(to) %>%
  unique() %>%
  map_df(~ data.frame(x = c(1.01, 1.01, 1.1, 1.1, 1.01),
                      y = c(-0.3, 0.3, 0.3, -0.3, -0.3) + .x,
                      id = .x))
```

We will add this in the same way as before, this time we will use `geom_path` to draw the box and `frame = min(point_data$time)` and `cumulative = TRUE` to have the boxes appear at the first frame and stay there forever. 


```r
p <- ggplot(point_data, aes(x, y, color = color, frame = time)) +
  geom_point() +
  geom_text(data = start_data, 
            aes(label = n, frame = time, x = x, y = y), color = "black") +
  geom_path(data = ending_box,
            aes(x, y, group = id, frame = min(point_data$time),
                cumulative = TRUE), color = "grey70") +
  theme_void() +
  coord_cartesian(xlim = c(-0.05, 1.15)) +
  guides(color = "none")

gganimate(p, title_frame = FALSE)
```

<img src="06-old.gif" width="700px" style="display: block; margin: auto;" />

## Filling the box

Lastly do we want to fill the boxes as the points approach them. This is done by first figuring out when they appear at the end of their paths, and them drawing boxes at those points, this is done by the `end_points` and `end_lines` respectively.  


```r
end_points <- point_data %>% 
  group_by(id) %>%
  filter(time == max(time)) %>%
  ungroup()

end_lines <- map_df(end_points$id,
    ~ data.frame(x = c(1.01, 1.01, 1.1, 1.1, 1.01),
                 y = c(-0.01, 0.01, 0.01, -0.01, -0.01) + as.numeric(end_points[.x, 2]),
                 id = .x) %>%
      bind_cols(bind_rows(replicate(5, end_points[.x, -(1:2)], simplify = FALSE)))
    )
```

Like before we add the data in a new `geom_`, with `cumulative = TRUE` to let the "points" stay.


```r
p <- ggplot(point_data, aes(x, y, color = color, frame = time)) +
  geom_point() +
  geom_text(data = start_data, 
            aes(label = n, frame = time, x = x, y = y), color = "black") +
  geom_path(data = ending_box,
            aes(x, y, group = id, frame = min(point_data$time),
                cumulative = TRUE), color = "grey70") +
  geom_polygon(data = end_lines,
               aes(x, y, fill = color, frame = time, group = id,
                   cumulative = TRUE, color = color)) +
  theme_void() +
  coord_cartesian(xlim = c(-0.05, 1.15)) +
  guides(color = "none",
         fill = "none")

gganimate(p, title_frame = FALSE)
```

<img src="07-old.gif" width="700px" style="display: block; margin: auto;" />

And this is what I have for you for now. Counters on the right hand side could be done in much the same way as we have seen here, but wouldn't add much value to showcase that here.

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
 codetools     0.2-18  2020-11-04 [1] CRAN (R 4.1.0)                   
 crayon        1.4.1   2021-02-08 [1] CRAN (R 4.1.0)                   
 desc          1.3.0   2021-03-05 [1] CRAN (R 4.1.0)                   
 details     * 0.2.1   2020-01-12 [1] CRAN (R 4.1.0)                   
 digest        0.6.27  2020-10-24 [1] CRAN (R 4.1.0)                   
 evaluate      0.14    2019-05-28 [1] CRAN (R 4.1.0)                   
 highr         0.9     2021-04-16 [1] CRAN (R 4.1.0)                   
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
