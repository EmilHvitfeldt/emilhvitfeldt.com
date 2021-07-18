---
title: 2017 World Press Freedom Index with emojis
date: '2017-04-26'
categories:
  - ggplot2
  - emoji
tags:
  - ggplot2
  - emoji
summary: A first (now outclassed) attempt at using emojis in ggplot2. This post combines the hadley/emo package and data from the 2017 World Press Freedom Index.
image:
  preview_only: true
---



<div class = "note">
Emojis are now fully supported in {ggplot2} thanks to the {ragg} package. Read more about it here: <a href="https://www.tidyverse.org/blog/2021/02/modern-text-features/">Modern Text Features in R</a>.
</div>

<div class = "note">
This code has been lightly revised to make sure it works as of 2018-12-16.
</div>

With [Reporters Without Borders](https://rsf.org/en) coming out with its [2017 World Press Freedom Index](https://rsf.org/en/ranking/2017) in the same week as Hadley Wickham coming out with the [emo(ji)](https://github.com/hadley/emo) package, I had no choice but to explore both of them at the same time.  

Disclaimer! This post is not an exercise in statistical inference but rather a proof of concept of how to use the emo(ji) package with ggplot2.   

### Loading packages


```r
library(hrbrthemes)
library(tidyverse)
library(stringr)
library(tibble)
# remotes::install_github('hadley/emo')
library(emo)
```

The [hrbrthemes](https://github.com/hrbrmstr/hrbrthemes) is not necessary for this project but it is one of my personal favorite ggplot2 themes.  

### Gathering data

Here we collect the data from Reporters Without Borders, emoji flags, and The World Bank (so we have something to plot against).  

#### 2017 World Press Freedom Index

We have the [2017 World Press Freedom Index](https://rsf.org/en/ranking/2017) [(direct download link)](https://rsf.org/sites/default/files/index_format_upload_2017-v2_1_0.csv) data which we load in as normal.  


```r
(freedom_index <- read_csv("https://rsf.org/sites/default/files/index_format_upload_2017-v2_1_0.csv"))
## # A tibble: 180 x 12
##    ISO    Rank FR_Country EN_country  ES_country   `Underlying situation score …
##    <chr> <dbl> <chr>      <chr>       <chr>                                <dbl>
##  1 NOR       1 Norvège    Norway      Noruega                                760
##  2 SWE       2 Suede      Sweden      Suecia                                 759
##  3 FIN       3 Finlande   Finland     Finlandia                              892
##  4 DNK       4 Danemark   Denmark     Dinamarca                             1036
##  5 NLD       5 Pays-Bas   Netherlands Países Bajos                           963
##  6 CRI       6 Costa Rica Costa Rica  Costa Rica                            1193
##  7 CHE       7 Suisse     Switzerland Suiza                                 1213
##  8 JAM       8 Jamaïque   Jamaica     Jamaica                               1273
##  9 BEL       9 Belgique   Belgium     Bélgica                               1247
## 10 ISL      10 Islande    Iceland     Islandia                              1303
## # … with 170 more rows, and 6 more variables: Abuse score 2016 <chr>,
## #   Overall Score 2016 <dbl>, Progression RANK <dbl>, Rank 2015 <dbl>,
## #   Score 2015 <dbl>, Zone <chr>
```

and we see that a total of 180 countries have a score (Overall Score 2016).  

#### GDP per capita

To have something somehow meaningful to compare the freedom index to. I've found some data about GDP per capita, mostly because I figured it would have data for quite a lot of the countries covered by the freedom index. So from [The World Bank](http://data.worldbank.org/indicator/NY.GDP.PCAP.CD) [(direct download link)](http://api.worldbank.org/v2/en/indicator/NY.GDP.PCAP.CD?downloadformat=csv)
which we load in as normal.  


```r
(gdp_pcap <- read_csv("API_NY.GDP.PCAP.CD_DS2_en_csv_v2.csv", skip = 3))
## # A tibble: 264 x 62
##    `Country Name` `Country Code` `Indicator Name` `Indicator Code` `1960` `1961`
##    <chr>          <chr>          <chr>            <chr>             <dbl>  <dbl>
##  1 Aruba          ABW            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  2 Afghanistan    AFG            GDP per capita … NY.GDP.PCAP.CD     59.8   59.9
##  3 Angola         AGO            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  4 Albania        ALB            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  5 Andorra        AND            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  6 Arab World     ARB            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  7 United Arab E… ARE            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  8 Argentina      ARG            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
##  9 Armenia        ARM            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
## 10 American Samoa ASM            GDP per capita … NY.GDP.PCAP.CD     NA     NA  
## # … with 254 more rows, and 56 more variables: 1962 <dbl>, 1963 <dbl>,
## #   1964 <dbl>, 1965 <dbl>, 1966 <dbl>, 1967 <dbl>, 1968 <dbl>, 1969 <dbl>,
## #   1970 <dbl>, 1971 <dbl>, 1972 <dbl>, 1973 <dbl>, 1974 <dbl>, 1975 <dbl>,
## #   1976 <dbl>, 1977 <dbl>, 1978 <dbl>, 1979 <dbl>, 1980 <dbl>, 1981 <dbl>,
## #   1982 <dbl>, 1983 <dbl>, 1984 <dbl>, 1985 <dbl>, 1986 <dbl>, 1987 <dbl>,
## #   1988 <dbl>, 1989 <dbl>, 1990 <dbl>, 1991 <dbl>, 1992 <dbl>, 1993 <dbl>,
## #   1994 <dbl>, 1995 <dbl>, 1996 <dbl>, 1997 <dbl>, 1998 <dbl>, 1999 <dbl>,
## #   2000 <dbl>, 2001 <dbl>, 2002 <dbl>, 2003 <dbl>, 2004 <dbl>, 2005 <dbl>,
## #   2006 <dbl>, 2007 <dbl>, 2008 <dbl>, 2009 <dbl>, 2010 <dbl>, 2011 <dbl>,
## #   2012 <dbl>, 2013 <dbl>, 2014 <dbl>, 2015 <dbl>, 2016 <dbl>, X62 <lgl>
```

which have quite a few variables but for now we will just focus on the 2015 variable as the 2016 appears empty. Now that we have two data sets that we would like to combine, a general question would be if the gdp_pcap data have information matching our 180 countries. So with the following bit of code, we join the two datasets together by the ICO ALPHA-3 Code available in both datasets and select the countries that don't have a value for the year 2015.  


```r
left_join(freedom_index, gdp_pcap, by = c("ISO" = "Country Code")) %>% 
  filter(is.na(`2015`)) %>% 
  select(EN_country)
## # A tibble: 12 x 1
##    EN_country                           
##    <chr>                                
##  1 Liechtenstein                        
##  2 Andorra                              
##  3 OECS                                 
##  4 Taiwan                               
##  5 Papua New Guinea                     
##  6 Cyprus North                         
##  7 Kosovo                               
##  8 Venezuela                            
##  9 Libya                                
## 10 Syrian Arab Republic                 
## 11 Eritrea                              
## 12 Democratic People's Republic of Korea
```

which leaves us with 166 countries. I could have looked for the data for these countries, but that is outside the reach of this post.  

#### Flag emoji

I would like to use the different flag emojis


```
## 🇦🇨🇦🇩🇦🇪🇦🇫🇦🇬🇦🇮🇦🇱🇦🇲🇦🇴🇦🇶🇦🇷🇦🇸🇦🇹🇦🇺🇦🇼🇦🇽🇦🇿🇧🇦🇧🇧🇧🇩🇧🇪🇧🇫🇧🇬🇧🇭🇧🇮🇧🇯🇧🇱🇧🇲🇧🇳🇧🇴🇧🇶🇧🇷🇧🇸🇧🇹🇧🇻🇧🇼🇧🇾🇧🇿🇨🇦🇨🇨🇨🇩🇨🇫🇨🇬🇨🇭🇨🇮🇨🇰🇨🇱🇨🇲🇨🇳🇨🇴🇨🇵🇨🇷🇨🇺🇨🇻🇨🇼🇨🇽🇨🇾🇨🇿🇩🇪🇩🇪🇩🇬🇩🇯🇩🇰🇩🇲🇩🇴🇩🇿🇪🇦🇪🇨🇪🇪🇪🇬🇪🇭🇪🇷🇪🇸🇪🇹🇪🇺🇫🇮🇫🇯🇫🇰🇫🇲🇫🇴🇫🇷🇬🇦🇬🇧🇬🇧🇬🇩🇬🇪🇬🇫🇬🇬🇬🇭🇬🇮🇬🇱🇬🇲🇬🇳🇬🇵🇬🇶🇬🇷🇬🇸🇬🇹🇬🇺🇬🇼🇬🇾🇭🇰🇭🇲🇭🇳🇭🇷🇭🇹🇭🇺🇮🇨🇮🇩🇮🇪🇮🇱🇮🇲🇮🇳🇮🇴🇮🇶🇮🇷🇮🇸🇮🇹🇯🇪🇯🇲🇯🇴🇯🇵🇰🇪🇰🇬🇰🇭🇰🇮🇰🇲🇰🇳🇰🇵🇰🇷🇰🇼🇰🇾🇰🇿🇱🇦🇱🇧🇱🇨🇱🇮🇱🇰🇱🇷🇱🇸🇱🇹🇱🇺🇱🇻🇱🇾🇲🇦🇲🇨🇲🇩🇲🇪🇲🇫🇲🇬🇲🇭🇲🇰🇲🇱🇲🇲🇲🇳🇲🇴🇲🇵🇲🇶🇲🇷🇲🇸🇲🇹🇲🇺🇲🇻🇲🇼🇲🇽🇲🇾🇲🇿🇳🇦🇳🇨🇳🇪🇳🇫🇳🇬🇳🇮🇳🇱🇳🇴🇳🇵🇳🇷🇳🇺🇳🇿🇴🇲🇵🇦🇵🇪🇵🇫🇵🇬🇵🇭🇵🇰🇵🇱🇵🇲🇵🇳🇵🇷🇵🇸🇵🇹🇵🇼🇵🇾🇶🇦🇷🇪🇷🇴🇷🇸🇷🇺🇷🇼🇸🇦🇸🇧🇸🇨🇸🇩🇸🇪🇸🇬🇸🇭🇸🇮🇸🇯🇸🇰🇸🇱🇸🇲🇸🇳🇸🇴🇸🇷🇸🇸🇸🇹🇸🇻🇸🇽🇸🇾🇸🇿🇹🇦🇹🇨🇹🇩🇹🇫🇹🇬🇹🇭🇹🇯🇹🇰🇹🇱🇹🇲🇹🇳🇹🇴🇹🇷🇹🇹🇹🇻🇹🇼🇹🇿🇺🇦🇺🇬🇺🇲🇺🇳🇺🇸🇺🇸🇺🇾🇺🇿🇻🇦🇻🇨🇻🇪🇻🇬🇻🇮🇻🇳🇻🇺🇼🇫🇼🇸🇽🇰🇾🇪🇾🇹🇿🇦🇿🇲🇿🇼🏴󠁧󠁢󠁥󠁮󠁧󠁿🏴󠁧󠁢󠁳󠁣󠁴󠁿🏴󠁧󠁢󠁷󠁬󠁳󠁿
```

which all can be found with the new emo(ji) package


```r
emo::ji_find("flag")
## # A tibble: 264 x 2
##    name                 emoji
##    <chr>                <chr>
##  1 Ascension_Island     🇦🇨   
##  2 andorra              🇦🇩   
##  3 united_arab_emirates 🇦🇪   
##  4 afghanistan          🇦🇫   
##  5 antigua_barbuda      🇦🇬   
##  6 anguilla             🇦🇮   
##  7 albania              🇦🇱   
##  8 armenia              🇦🇲   
##  9 angola               🇦🇴   
## 10 antarctica           🇦🇶   
## # … with 254 more rows
```

we first notice that the first two emojis are not country flags and that the name of the countries are not in the same format as what we have from earlier, so we replace the underscores with spaces and translate everything to lowercase before joining. This time by country name. Again we check for missed joints.  


```r
left_join(freedom_index, gdp_pcap, by = c("ISO" = "Country Code")) %>% 
  mutate(EN_country = tolower(EN_country)) %>% 
  left_join(emo::ji_find("flag") %>% 
              mutate(name = str_replace_all(name, "_", " ")) %>% 
              filter(name != "japan", name != "crossed flags"), 
            by = c("EN_country" = "name"))  %>% 
  filter(!is.na(`2015`)) %>% 
  filter(is.na(emoji)) %>% 
  select(EN_country)
## # A tibble: 22 x 1
##    EN_country            
##    <chr>                 
##  1 germany               
##  2 spain                 
##  3 trinidad and tobago   
##  4 france                
##  5 united kingdom        
##  6 united states         
##  7 italy                 
##  8 south korea           
##  9 bosnia and herzegovina
## 10 japan                 
## # … with 12 more rows
```

Which is quite a few. It turns out that the naming convention for the emoji names has not been that consistent, "de" used instead of "germany" etc. To clear up code later on we make a new emoji tibble with all the changes.  


```r
newemoji <- emo::ji_find("flag") %>% 
              mutate(name = str_replace_all(string = name,
                                            pattern = "_",
                                            replacement =  " ")) %>% 
  filter(name != "japan", name != "crossed flags") %>% 
  mutate(name = str_replace(name, "^de$", "germany"),
         name = str_replace(name, "^es$", "spain"),
         name = str_replace(name, "^trinidad tobago$", "trinidad and tobago"),
         name = str_replace(name, "^fr$", "france"),
         name = str_replace(name, "^uk$", "united kingdom"),
         name = str_replace(name, "^us$", "united states"),
         name = str_replace(name, "^it$", "italy"),
         name = str_replace(name, "^kr$", "south korea"),
         name = str_replace(name, "^bosnia herzegovina$", "bosnia and herzegovina"),
         name = str_replace(name, "^guinea bissau$", "guinea-bissau"),
         name = str_replace(name, "^cote divoire$", "ivory coast"),
         name = str_replace(name, "^timor leste$", "east timor"),
         name = str_replace(name, "^congo brazzaville$", "congo"),
         name = str_replace(name, "^palestinian territories$", "palestine"),
         name = str_replace(name, "^ru$", "russian federation"),
         name = str_replace(name, "^congo kinshasa$", "the democratic republic of the congo"),
         name = str_replace(name, "^tr$", "turkey"),
         name = str_replace(name, "^brunei$", "brunei darussalam"),
         name = str_replace(name, "^laos$", "lao people's democratic republic"),
         name = str_replace(name, "^cn$", "china"),
         name = str_replace(name, "^jp$", "japan"))
newemoji
## # A tibble: 264 x 2
##    name                 emoji
##    <chr>                <chr>
##  1 Ascension Island     🇦🇨   
##  2 andorra              🇦🇩   
##  3 united arab emirates 🇦🇪   
##  4 afghanistan          🇦🇫   
##  5 antigua barbuda      🇦🇬   
##  6 anguilla             🇦🇮   
##  7 albania              🇦🇱   
##  8 armenia              🇦🇲   
##  9 angola               🇦🇴   
## 10 antarctica           🇦🇶   
## # … with 254 more rows
```

### Plotting it all with ggplot2

Now with all the preparation done we do a naive first plot. 


```r
left_join(freedom_index, gdp_pcap, by = c("ISO" = "Country Code")) %>% 
  mutate(EN_country = tolower(EN_country)) %>% 
  left_join(newemoji, by = c("EN_country" = "name")) %>% 
  ggplot(aes(x = `2015`, y = `Overall Score 2016`)) +
  geom_text(aes(label = emoji))
## Warning: Removed 14 rows containing missing values (geom_text).
```

<img src="{{< blogdown/postref >}}index_files/figure-html/unnamed-chunk-9-1.png" width="700px" style="display: block; margin: auto;" />

But wait, we have a couple of problems:

- The emojis don't show up. 
- The freedom score is 100 times too much as the actual.
- The gdp_pcap is quite skewed.  

But these are not problems too great for us. It turns out that R's graphical devices don't support AppleColorEmoji font. We can alleviate that problem by saving the plot as a svg file. And we will do a simple log transformation of the gdp_pcap.  

Our final plot is thus the following:


```r
left_join(freedom_index, gdp_pcap, by = c("ISO" = "Country Code")) %>% 
  mutate(EN_country = tolower(EN_country),
         `Overall Score 2016` = `Overall Score 2016` / 100) %>% 
  left_join(newemoji, by = c("EN_country" = "name")) %>% 
  ggplot(aes(x = `2015`, y = `Overall Score 2016`)) +
  stat_smooth(method = "lm", color = "grey", se = FALSE) +
  geom_text(aes(label = emoji)) +
  scale_x_log10() +
  annotation_logticks(sides = "b")  +
  theme_ipsum() +
  labs(x = "GDP per capita (current US$)", y = "2017 World Press Freedom Index",
       title = "Countries with high GDP per capita\ntend to have low Freedom Index",
       subtitle = "Visualized with emojis")
```

<img src="final.svg" width="700px" style="display: block; margin: auto;" />

<details closed>
<summary> <span title='Click to Expand'> session information </span> </summary>

```r

─ Session info ───────────────────────────────────────────────────────────────
 setting  value                       
 version  R version 4.0.5 (2021-03-31)
 os       macOS Big Sur 10.16         
 system   x86_64, darwin17.0          
 ui       X11                         
 language (EN)                        
 collate  en_US.UTF-8                 
 ctype    en_US.UTF-8                 
 tz       Pacific/Honolulu            
 date     2021-07-02                  

─ Packages ───────────────────────────────────────────────────────────────────
 package     * version    date       lib source                            
 assertthat    0.2.1      2019-03-21 [1] CRAN (R 4.0.0)                    
 backports     1.2.1      2020-12-09 [1] CRAN (R 4.0.2)                    
 blogdown      1.3.2      2021-06-06 [1] Github (rstudio/blogdown@00a2090) 
 bookdown      0.22       2021-04-22 [1] CRAN (R 4.0.2)                    
 broom         0.7.6      2021-04-05 [1] CRAN (R 4.0.2)                    
 bslib         0.2.4.9003 2021-05-05 [1] Github (rstudio/bslib@ba6a80d)    
 cellranger    1.1.0      2016-07-27 [1] CRAN (R 4.0.0)                    
 cli           2.5.0      2021-04-26 [1] CRAN (R 4.0.2)                    
 clipr         0.7.1      2020-10-08 [1] CRAN (R 4.0.2)                    
 codetools     0.2-18     2020-11-04 [1] CRAN (R 4.0.5)                    
 colorspace    2.0-1      2021-05-04 [1] CRAN (R 4.0.2)                    
 crayon        1.4.1      2021-02-08 [1] CRAN (R 4.0.2)                    
 DBI           1.1.1      2021-01-15 [1] CRAN (R 4.0.2)                    
 dbplyr        2.1.1      2021-04-06 [1] CRAN (R 4.0.2)                    
 desc          1.3.0      2021-03-05 [1] CRAN (R 4.0.2)                    
 details     * 0.2.1      2020-01-12 [1] CRAN (R 4.0.0)                    
 digest        0.6.27     2020-10-24 [1] CRAN (R 4.0.2)                    
 dplyr       * 1.0.7      2021-06-18 [1] CRAN (R 4.0.2)                    
 ellipsis      0.3.2      2021-04-29 [1] CRAN (R 4.0.2)                    
 emo         * 0.0.0.9000 2020-05-12 [1] Github (hadley/emo@3f03b11)       
 evaluate      0.14       2019-05-28 [1] CRAN (R 4.0.0)                    
 extrafont     0.17       2014-12-08 [1] CRAN (R 4.0.0)                    
 extrafontdb   1.0        2012-06-11 [1] CRAN (R 4.0.0)                    
 fansi         0.5.0      2021-05-25 [1] CRAN (R 4.0.2)                    
 farver        2.1.0      2021-02-28 [1] CRAN (R 4.0.2)                    
 forcats     * 0.5.1      2021-01-27 [1] CRAN (R 4.0.2)                    
 fs            1.5.0      2020-07-31 [1] CRAN (R 4.0.2)                    
 gdtools       0.2.3      2021-01-06 [1] CRAN (R 4.0.2)                    
 generics      0.1.0      2020-10-31 [1] CRAN (R 4.0.2)                    
 ggplot2     * 3.3.3      2020-12-30 [1] CRAN (R 4.0.2)                    
 glue          1.4.2      2020-08-27 [1] CRAN (R 4.0.2)                    
 gtable        0.3.0      2019-03-25 [1] CRAN (R 4.0.0)                    
 haven         2.4.1      2021-04-23 [1] CRAN (R 4.0.2)                    
 highr         0.9        2021-04-16 [1] CRAN (R 4.0.2)                    
 hms           1.1.0      2021-05-17 [1] CRAN (R 4.0.2)                    
 hrbrthemes  * 0.8.0      2020-03-06 [1] CRAN (R 4.0.2)                    
 htmltools     0.5.1.1    2021-01-22 [1] CRAN (R 4.0.2)                    
 httr          1.4.2      2020-07-20 [1] CRAN (R 4.0.2)                    
 jquerylib     0.1.4      2021-04-26 [1] CRAN (R 4.0.2)                    
 jsonlite      1.7.2      2020-12-09 [1] CRAN (R 4.0.2)                    
 knitr       * 1.33       2021-04-24 [1] CRAN (R 4.0.2)                    
 labeling      0.4.2      2020-10-20 [1] CRAN (R 4.0.2)                    
 lifecycle     1.0.0      2021-02-15 [1] CRAN (R 4.0.2)                    
 lubridate     1.7.10     2021-02-26 [1] CRAN (R 4.0.2)                    
 magrittr      2.0.1      2020-11-17 [1] CRAN (R 4.0.2)                    
 modelr        0.1.8      2020-05-19 [1] CRAN (R 4.0.0)                    
 munsell       0.5.0      2018-06-12 [1] CRAN (R 4.0.0)                    
 pillar        1.6.1      2021-05-16 [1] CRAN (R 4.0.2)                    
 pkgconfig     2.0.3      2019-09-22 [1] CRAN (R 4.0.0)                    
 png           0.1-7      2013-12-03 [1] CRAN (R 4.0.0)                    
 purrr       * 0.3.4      2020-04-17 [1] CRAN (R 4.0.0)                    
 R6            2.5.0      2020-10-28 [1] CRAN (R 4.0.2)                    
 Rcpp          1.0.6      2021-01-15 [1] CRAN (R 4.0.2)                    
 readr       * 1.4.0      2020-10-05 [1] CRAN (R 4.0.2)                    
 readxl        1.3.1      2019-03-13 [1] CRAN (R 4.0.2)                    
 reprex        2.0.0      2021-04-02 [1] CRAN (R 4.0.2)                    
 rlang         0.4.11     2021-04-30 [1] CRAN (R 4.0.2)                    
 rmarkdown     2.8.6      2021-06-06 [1] Github (rstudio/rmarkdown@9dc5d97)
 rprojroot     2.0.2      2020-11-15 [1] CRAN (R 4.0.2)                    
 rstudioapi    0.13       2020-11-12 [1] CRAN (R 4.0.2)                    
 Rttf2pt1      1.3.8      2020-01-10 [1] CRAN (R 4.0.0)                    
 rvest         1.0.0      2021-03-09 [1] CRAN (R 4.0.2)                    
 sass          0.3.1.9003 2021-05-05 [1] Github (rstudio/sass@6166162)     
 scales        1.1.1      2020-05-11 [1] CRAN (R 4.0.0)                    
 sessioninfo   1.1.1      2018-11-05 [1] CRAN (R 4.0.0)                    
 stringi       1.6.2      2021-05-17 [1] CRAN (R 4.0.2)                    
 stringr     * 1.4.0      2019-02-10 [1] CRAN (R 4.0.0)                    
 systemfonts   1.0.1      2021-02-09 [1] CRAN (R 4.0.2)                    
 tibble      * 3.1.2      2021-05-16 [1] CRAN (R 4.0.2)                    
 tidyr       * 1.1.3      2021-03-03 [1] CRAN (R 4.0.2)                    
 tidyselect    1.1.1      2021-04-30 [1] CRAN (R 4.0.2)                    
 tidyverse   * 1.3.1      2021-04-15 [1] CRAN (R 4.0.2)                    
 utf8          1.2.1      2021-03-12 [1] CRAN (R 4.0.2)                    
 vctrs         0.3.8      2021-04-29 [1] CRAN (R 4.0.2)                    
 withr         2.4.2      2021-04-18 [1] CRAN (R 4.0.2)                    
 xfun          0.23       2021-05-15 [1] CRAN (R 4.0.2)                    
 xml2          1.3.2      2020-04-23 [1] CRAN (R 4.0.0)                    
 yaml          2.2.1      2020-02-01 [1] CRAN (R 4.0.0)                    

[1] /Library/Frameworks/R.framework/Versions/4.0/Resources/library

```

</details>
<br>
