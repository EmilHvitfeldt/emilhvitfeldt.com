---
title: Repetition in musicals with tidytext
description: |
  A project looking at repetition in song lyrics. Using {rvest} to perform web scraping (now outdated) to fetch lyrics from genius.com.
date: '2017-06-05'
categories:
  - tidytext
image: "featured.webp"
---




::: {.callout-warning}
This code does no longer works as the genius website has changed its format and the scraper described in this post no longer works. If you interesting in scraping song lyric I recommend the <a href="https://github.com/JosiahParry/genius">genius</a> package by <a href="https://twitter.com/JosiahParry">JosiahParry</a>.
:::

::: {.callout-note}
This code has been lightly revised to make sure it works as of 2018-12-16.
:::

Lately, I have been wondering how to quantify how repetitive a text is, specifically how repetitive are the lyrics to songs. I will specifically limit this post to English^[[#benderrule](https://thegradient.pub/the-benderrule-on-naming-the-languages-we-study-and-why-it-matters/)] lyrics. I'm by no means the first one, Colin Morris did a great piece on language compression with his [Are Pop Lyrics Getting More Repetitive?](https://pudding.cool/2017/05/song-repetition/) which I highly recommend you go read. Instead of looking at pop lyrics will we instead be focusing on some popular musicals to see if general patterns emerge within each show.

I plan to use the magic of the `tidyverse` with the inclusion of `tidytext` to find the percentage of repeated consecutive sequences of words() also called n-grams) of varying length and then compare the results. We will use `rvest` to extract the lyrics from the web. However, for larger data needs official APIs are recommended.

## Extracting song lyrics


```r
library(tidyverse)
library(tidytext)
library(rvest)
```

We will first take a peek at a specific song,


```r
the_stars_look_down <- "https://genius.com/Elton-john-the-stars-look-down-lyrics"

the_stars_look_down %>%
  read_lines() %>%
  head(20)
```

And we find a whole of lines of no interest of us, which is to be expected. After some digging, I manage to find that the lyrics are packed between *p* tags we can do this with `rvest`'s `html_nodes()`.


```r
the_stars_look_down_lyrics <- the_stars_look_down %>%
  read_html() %>%
  html_nodes("p") %>%
  html_text() %>%
  str_split("\n") %>%
  unlist() %>%
  tibble(text = .)

the_stars_look_down_lyrics
```

We noticed some of the rows are indications of who is talking, these are quickly dealt with by a `filter`. Now we employ our `tidytext` arsenal with `unnest_tokens` and we find all the bi-grams (pairs of consecutive words). (notice how they overlap)


```r
the_stars_look_down_lyrics %>%
  filter(!str_detect(text, "\\[")) %>%
  unnest_tokens(bigram, text, token = "ngrams", n = 2)
```

now from this we can summarize to find the number of unique bigrams and by extension the percentage of repeated bigrams.


```r
the_stars_look_down_lyrics %>%
  filter(!str_detect(text, "\\[")) %>%
  unnest_tokens(bigram, text, token = "ngrams", n = 2) %>%
  summarise(length = length(bigram),
            unique = length(unique(bigram))) %>%
  mutate(repetition = 1 - unique / length)
```

So we see that in this particular song around 38% of bigrams are present at least twice. We will expect this percentage to be strictly decreasing for `\(n\)` increasing, but what we are interested in both the rate it is decreasing but also the general level.  
Now we generalizing this procedure using some `purrr` to give us a nice data.frame out in the end. The range `1:5` was picked after some trial and error, and it seemed to me that most trends died out around the 5-6 mark rendering data points rather uninteresting. 


```r
songfun <- function(hyperlink, repnum = 1:5) {
  
  lyrics <- hyperlink %>%
  read_html() %>%
  html_nodes("p") %>%
  html_text() %>%
  str_split("\n") %>%
  unlist() %>%
  tibble(text = .)
  
  map_dfr(repnum, 
          ~ lyrics %>% 
            unnest_tokens(ngram, text, token = "ngrams", n = .x) %>%
            summarise(n = .x,
                      length = length(ngram),
                      unique = length(unique(ngram))) %>%
            mutate(repetition = 1 - unique / length,
                   name = hyperlink))
}
```

Now to try this out, we plug in the link again, and pipe the result into ggplot to give us a nice visualization


```r
songfun("https://genius.com/Elton-john-the-stars-look-down-lyrics") %>%
  ggplot(aes(n, repetition)) +
  geom_line() +
  coord_cartesian(ylim = 0:1)
```

from this plot alone we can see that roughly 3/4 of the words used in the song are used more than twice, while on the other end of the scale just shy of 25% of the 5-grams are used more than once. This plot by itself doesn't provide too much meaningful information by itself. So next step is to gather information for more songs to compare.  

This function takes a link to an album page, and uses similar techniques used earlier to detect the song in the album, find the lyrics with `songfun`, process it, and spits out a data.frame. 


```r
albumfun <- function(hlink, ...) { 
  song_links <- tibble(text = readLines(hlink)) %>%
    filter(str_detect(text, "          <a href=\"https://genius.com/")) %>%
    mutate(text = str_replace(text, "<a href=\"", "")) %>%
    mutate(text = str_replace(text, "\" class=\"u-display_block\">", "")) %>%
    mutate(text = str_replace(text, " *", "")) %>%
    mutate(song = str_replace(text, "https://genius.com/", ""))

  nsongs <- nrow(song_links)
  out <- tibble()
  for (i in 1:nsongs) {
    ting <- songfun(song_links$text[i], ...)
    out <- rbind(out, ting)
  }
  out %>%
    mutate(album = hlink)
}
```

## Analysis

We use our function to get the data for several different musicals.


```r
billyelliot <- albumfun(hlink = "https://genius.com/albums/Elton-john/Billy-elliot-the-musical-original-london-cast-recording")
thebookofmormon <- albumfun(hlink = "https://genius.com/albums/Book-of-mormon/The-book-of-mormon-original-broadway-recording")
lionking <- albumfun(hlink = "https://genius.com/albums/The-lion-king/The-lion-king-original-broadway-cast-recording")
avenueq <- albumfun(hlink = "https://genius.com/albums/Robert-lopez-and-jeff-marx/Avenue-q-original-broadway-cast-recording")
oklahoma <- albumfun(hlink = "https://genius.com/albums/Richard-rodgers/Oklahoma-original-motion-picture-soundtrack")
soundofmusic <- albumfun(hlink = "https://genius.com/albums/Richard-rodgers/The-sound-of-music-original-soundtrack-recording")
intheheights <- albumfun(hlink = "https://genius.com/albums/Lin-manuel-miranda/In-the-heights-original-broadway-cast-recording")
lemiserables <- albumfun(hlink = "https://genius.com/albums/Les-miserables-original-broadway-cast/Les-miserables-1987-original-broadway-cast")
phantomoftheopera <- albumfun(hlink = "https://genius.com/albums/Andrew-lloyd-webber/The-phantom-of-the-opera-original-london-cast-recording")
```

and a quick explorative plot tells us that it is working as intended, we see some variation in both slopes and offset, telling us that Billy Elliot has some range in its songs. 


```r
billyelliot %>%
  ggplot(aes(n, repetition)) +
  geom_line(aes(group = name)) +
  labs(title = "Billy Elliot") +
  coord_cartesian(ylim = 0:1)
```

to further compare we bind all the data.frames together for ease of handling


```r
musical_names <- c("The Phantom of the Opera", "The Book of Mormon", 
                   "Billy Elliot", "Les Miserables", "In the Heights", 
                   "Oklahoma", "The Sound of music", "Avenue Q", "Lion King")

rbind(billyelliot, thebookofmormon, lionking, avenueq, oklahoma,
      soundofmusic, intheheights, lemiserables, phantomoftheopera) %>%
  mutate(album = factor(album, label = musical_names)) %>%
  ggplot(aes(n, repetition)) +
  geom_line(aes(group = name), alpha = 0.5) +
  facet_wrap(~ album)
```

Wow, here we see some differences in lyrical styles for the different musicals, from the evenness of the soundtrack to "In the Heights" to the range of "Lion King". To try having them all in the same graph would be overwhelming. However, we could still plot the trend of each album in the same plot, fading out individual songs.


```r
rbind(billyelliot, thebookofmormon, lionking, avenueq, oklahoma,
      soundofmusic, intheheights, lemiserables, phantomoftheopera) %>%
  ggplot(aes(n, repetition)) +
  coord_cartesian(ylim = 0:1) +
  geom_line(aes(group = name), alpha = 0.05) +
  geom_smooth(aes(group = album, color = album), se = FALSE) +
  theme_bw() +
  labs(title = "Repetition in musicals") +
  scale_colour_brewer(palette = "Set1",
                      name = "Musical",
                      labels = c("The Phantom of the Opera", "The Book of Mormon", 
                                 "Billy Elliot", "Les Miserables",
                                 "In the Heights", "Oklahoma", 
                                 "The Sound of music", "Avenue Q", "Lion King"))
```


