---
title: 'Textrecipes Version 0.4.0'
summary: |
  Announcement post for version 0.4.0 of textrecipes
date: '2020-11-13'
categories:
  - tidymodels
  - textrecipes
image: "featured.png"
---




I'm happy to announce that version 0.4.0 of [textrecipes](https://textrecipes.tidymodels.org/) got on CRAN a couple of days ago.
This will be a brief post going over the major additions and changes.

## Breaking changes 💣

I put this change at the top of this post to make sure it gets enough coverage.
The `step_lda()` function will no longer accepts character variables and instead takes [tokenlist](https://textrecipes.tidymodels.org/reference/tokenlist.html) variables. 
I don't expect this to affect too many people since it appears that the use of this step is fairly limited.

For a recipe where `step_lda()` is used on a variable `text_var`

```r
recipe(~ text_var, data = data) %>%
  step_lda(text_var)
```

can be made to work the same as before by including this `step_tokenize()` step before it.
It includes a custom tokenizer which was used inside the old version of `step_lda()`

```r

recipe(~ text_var, data = data) %>%
  step_tokenize(text_var, 
                custom_token = function(x) text2vec::word_tokenizer(tolower(x))) %>%
  step_lda(text_var)
```

This change was long overdue since it didn't follow the rest of the steps since it was doing tokenization internally.
This change provides more flexability when using `step_lda()` in its current state and allows me to consider [adding more engine to `step_lda()`](https://github.com/tidymodels/textrecipes/issues/112).

## Cleaning 🧼

If your data has weird characters and spaces in them messing up your model then the following steps will make you very happy.
`step_clean_levels()` and `step_clean_names()` works much like [janitor](https://garthtarr.github.io/meatR/janitor.html)'s `clean_names()` function.
Character variables and column names are changes such that they only contain alphanumeric characters and underscores.

Consider the `Smithsonian` data.frame.
The `name` variable contains entries with many character, cases, spaces, and punctuations.

```r
library(recipes)
library(textrecipes)
library(modeldata)

data(Smithsonian)
Smithsonian
## # A tibble: 20 x 3
##    name                                                    latitude longitude
##    <chr>                                                      <dbl>     <dbl>
##  1 Anacostia Community Museum                                  38.9     -77.0
##  2 Arthur M. Sackler Gallery                                   38.9     -77.0
##  3 Arts and Industries Building                                38.9     -77.0
##  4 Cooper Hewitt, Smithsonian Design Museum                    40.8     -74.0
##  5 Freer Gallery of Art                                        38.9     -77.0
##  6 Hirshhorn Museum and Sculpture Garden                       38.9     -77.0
##  7 National Air and Space Museum                               38.9     -77.0
##  8 Steven F. Udvar-Hazy Center                                 38.9     -77.4
##  9 National Museum of African American History and Culture     38.9     -77.0
## 10 National Museum of African Art                              38.9     -77.0
## 11 National Museum of American History                         38.9     -77.0
## 12 National Museum of the American Indian                      38.9     -77.0
## 13 George Gustav Heye Center                                   40.7     -74.0
## 14 National Museum of Natural History                          38.9     -77.0
## 15 National Portrait Gallery                                   38.9     -77.0
## 16 National Postal Museum                                      38.9     -77.0
## 17 Renwick Gallery                                             38.9     -77.0
## 18 Smithsonian American Art Museum                             38.9     -77.0
## 19 Smithsonian Institution Building                            38.9     -77.0
## 20 National Zoological Park                                    38.9     -77.1
```

When using `step_clean_levels()`


```r
recipe(~ name, data = Smithsonian) %>%
  step_clean_levels(name) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 20 x 1
##    name                                                   
##    <fct>                                                  
##  1 anacostia_community_museum                             
##  2 arthur_m_sackler_gallery                               
##  3 arts_and_industries_building                           
##  4 cooper_hewitt_smithsonian_design_museum                
##  5 freer_gallery_of_art                                   
##  6 hirshhorn_museum_and_sculpture_garden                  
##  7 national_air_and_space_museum                          
##  8 steven_f_udvar_hazy_center                             
##  9 national_museum_of_african_american_history_and_culture
## 10 national_museum_of_african_art                         
## 11 national_museum_of_american_history                    
## 12 national_museum_of_the_american_indian                 
## 13 george_gustav_heye_center                              
## 14 national_museum_of_natural_history                     
## 15 national_portrait_gallery                              
## 16 national_postal_museum                                 
## 17 renwick_gallery                                        
## 18 smithsonian_american_art_museum                        
## 19 smithsonian_institution_building                       
## 20 national_zoological_park
```

We see that everything has been cleaned to avoid potential confusion and errors.

the almost more important step is `step_clean_names()` as it allows you to clean the variables names that could trip up various modeling packages


```r
ugly_names <- tibble(
  `        Some      spaces     ` = 1,
  `BIGG and small case` = 2,
  `.period` = 3
)

recipe(~ ., data = ugly_names) %>%
  step_clean_names(all_predictors()) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 1 x 3
##   some_spaces bigg_and_small_case period
##         <dbl>               <dbl>  <dbl>
## 1           1                   2      3
```

## New tokenizers

There is two new `engine`s available in `step_tokenize()`.
the [tokenizers.bpe](https://github.com/bnosac/tokenizers.bpe) engine lets you perform [Byte Pair Encoding](https://en.wikipedia.org/wiki/Byte_pair_encoding) on you text as a mean of tokenization.


```r
data("okc_text")

recipe(~ essay6, data = okc_text) %>%
  step_tokenize(essay6, engine = "tokenizers.bpe") %>%
  step_tokenfilter(essay6, max_times = 100) %>%
  step_tf(essay6) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 750 x 100
##    `tf_essay6_:` `tf_essay6_!` `tf_essay6_?` `tf_essay6_?<br` tf_essay6_...
##            <dbl>         <dbl>         <dbl>            <dbl>         <dbl>
##  1             1             0             0                0             0
##  2             0             0             0                0             0
##  3             0             0             0                0             0
##  4             0             0             0                0             0
##  5             0             0             0                0             0
##  6             0             0             0                0             0
##  7             0             0             0                1             0
##  8             0             0             0                0             0
##  9             0             0             0                0             0
## 10             0             0             0                0             0
## # … with 740 more rows, and 95 more variables: `tf_essay6_'s` <dbl>,
## #   `tf_essay6_"` <dbl>, `tf_essay6_">` <dbl>, `tf_essay6_)` <dbl>,
## #   `tf_essay6_▁-` <dbl>, `tf_essay6_▁(` <dbl>, `tf_essay6_▁<a` <dbl>,
## #   `tf_essay6_▁all` <dbl>, `tf_essay6_▁also` <dbl>, `tf_essay6_▁always` <dbl>,
## #   `tf_essay6_▁am` <dbl>, `tf_essay6_▁an` <dbl>, `tf_essay6_▁as` <dbl>,
## #   `tf_essay6_▁at` <dbl>, `tf_essay6_▁being` <dbl>, `tf_essay6_▁better` <dbl>,
## #   `tf_essay6_▁but` <dbl>, `tf_essay6_▁class="ilink"` <dbl>,
## #   `tf_essay6_▁d` <dbl>, `tf_essay6_▁doing` <dbl>, `tf_essay6_▁friends` <dbl>,
## #   `tf_essay6_▁from` <dbl>, `tf_essay6_▁future` <dbl>, `tf_essay6_▁get` <dbl>,
## #   `tf_essay6_▁go` <dbl>, `tf_essay6_▁going` <dbl>, `tf_essay6_▁good` <dbl>,
## #   `tf_essay6_▁have` <dbl>, `tf_essay6_▁href=` <dbl>, `tf_essay6_▁i've` <dbl>,
## #   `tf_essay6_▁if` <dbl>, `tf_essay6_▁into` <dbl>, `tf_essay6_▁it's` <dbl>,
## #   `tf_essay6_▁just` <dbl>, `tf_essay6_▁know` <dbl>, `tf_essay6_▁life` <dbl>,
## #   `tf_essay6_▁life,` <dbl>, `tf_essay6_▁life.` <dbl>, `tf_essay6_▁lot` <dbl>,
## #   `tf_essay6_▁love` <dbl>, `tf_essay6_▁m` <dbl>, `tf_essay6_▁make` <dbl>,
## #   `tf_essay6_▁me` <dbl>, `tf_essay6_▁more` <dbl>, `tf_essay6_▁much` <dbl>,
## #   `tf_essay6_▁myself` <dbl>, `tf_essay6_▁new` <dbl>, `tf_essay6_▁not` <dbl>,
## #   `tf_essay6_▁one` <dbl>, `tf_essay6_▁other` <dbl>, `tf_essay6_▁our` <dbl>,
## #   `tf_essay6_▁out` <dbl>, `tf_essay6_▁p` <dbl>, `tf_essay6_▁people` <dbl>,
## #   `tf_essay6_▁really` <dbl>, `tf_essay6_▁right` <dbl>,
## #   `tf_essay6_▁should` <dbl>, `tf_essay6_▁so` <dbl>, `tf_essay6_▁some` <dbl>,
## #   `tf_essay6_▁spend` <dbl>, `tf_essay6_▁take` <dbl>, `tf_essay6_▁than` <dbl>,
## #   `tf_essay6_▁there` <dbl>, `tf_essay6_▁they` <dbl>,
## #   `tf_essay6_▁things` <dbl>, `tf_essay6_▁thinking` <dbl>,
## #   `tf_essay6_▁this` <dbl>, `tf_essay6_▁time` <dbl>,
## #   `tf_essay6_▁travel` <dbl>, `tf_essay6_▁up` <dbl>, `tf_essay6_▁want` <dbl>,
## #   `tf_essay6_▁way` <dbl>, `tf_essay6_▁we` <dbl>, `tf_essay6_▁what's` <dbl>,
## #   `tf_essay6_▁when` <dbl>, `tf_essay6_▁where` <dbl>,
## #   `tf_essay6_▁whether` <dbl>, `tf_essay6_▁who` <dbl>, `tf_essay6_▁why` <dbl>,
## #   `tf_essay6_▁will` <dbl>, `tf_essay6_▁work` <dbl>, `tf_essay6_▁world` <dbl>,
## #   `tf_essay6_▁would` <dbl>, `tf_essay6_▁you` <dbl>, tf_essay6_a <dbl>,
## #   tf_essay6_al <dbl>, tf_essay6_ed <dbl>, tf_essay6_er <dbl>,
## #   tf_essay6_es <dbl>, tf_essay6_ing <dbl>, `tf_essay6_ing,` <dbl>,
## #   tf_essay6_ly <dbl>, `tf_essay6_s,` <dbl>, tf_essay6_s. <dbl>,
## #   tf_essay6_y <dbl>
```

additional arguments can be passed to `tokenizers.bpe::bpe()` via the `training_options` argument.


```r
recipe(~ essay6, data = okc_text) %>%
  step_tokenize(essay6, 
                engine = "tokenizers.bpe",
                training_options = list(vocab_size = 100)) %>%
  step_tf(essay6) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 750 x 100
##    `tf_essay6_-` `tf_essay6_,` `tf_essay6_;` `tf_essay6_:` `tf_essay6_!`
##            <dbl>         <dbl>         <dbl>         <dbl>         <dbl>
##  1             0             1             1             2             0
##  2             0            13             1             0             0
##  3             0             1             0             0             1
##  4             0             0             0             0             0
##  5             0             0             0             0             1
##  6             0             1             0             0             0
##  7             0             4             0             1             0
##  8             2             0             0             0             0
##  9             0             0             0             0             0
## 10             0            10             0             0             0
## # … with 740 more rows, and 95 more variables: `tf_essay6_?` <dbl>,
## #   tf_essay6_. <dbl>, `tf_essay6_'` <dbl>, `tf_essay6_"` <dbl>,
## #   `tf_essay6_(` <dbl>, `tf_essay6_)` <dbl>, `tf_essay6_[` <dbl>,
## #   `tf_essay6_]` <dbl>, `tf_essay6_*` <dbl>, `tf_essay6_/` <dbl>,
## #   `tf_essay6_&` <dbl>, `tf_essay6_+` <dbl>, `tf_essay6_<` <dbl>,
## #   `tf_essay6_<BOS>` <dbl>, `tf_essay6_<br` <dbl>, `tf_essay6_<EOS>` <dbl>,
## #   `tf_essay6_<PAD>` <dbl>, `tf_essay6_<UNK>` <dbl>, `tf_essay6_=` <dbl>,
## #   `tf_essay6_>` <dbl>, `tf_essay6_~` <dbl>, `tf_essay6_▁` <dbl>,
## #   `tf_essay6_▁/` <dbl>, `tf_essay6_▁/>` <dbl>, `tf_essay6_▁a` <dbl>,
## #   `tf_essay6_▁and` <dbl>, `tf_essay6_▁b` <dbl>, `tf_essay6_▁c` <dbl>,
## #   `tf_essay6_▁d` <dbl>, `tf_essay6_▁f` <dbl>, `tf_essay6_▁g` <dbl>,
## #   `tf_essay6_▁h` <dbl>, `tf_essay6_▁i` <dbl>, `tf_essay6_▁l` <dbl>,
## #   `tf_essay6_▁m` <dbl>, `tf_essay6_▁o` <dbl>, `tf_essay6_▁p` <dbl>,
## #   `tf_essay6_▁s` <dbl>, `tf_essay6_▁t` <dbl>, `tf_essay6_▁th` <dbl>,
## #   `tf_essay6_▁the` <dbl>, `tf_essay6_▁to` <dbl>, `tf_essay6_▁w` <dbl>,
## #   `tf_essay6_▁wh` <dbl>, tf_essay6_0 <dbl>, tf_essay6_1 <dbl>,
## #   tf_essay6_2 <dbl>, tf_essay6_3 <dbl>, tf_essay6_4 <dbl>, tf_essay6_5 <dbl>,
## #   tf_essay6_6 <dbl>, tf_essay6_8 <dbl>, tf_essay6_9 <dbl>, tf_essay6_a <dbl>,
## #   tf_essay6_al <dbl>, tf_essay6_an <dbl>, tf_essay6_at <dbl>,
## #   tf_essay6_b <dbl>, tf_essay6_br <dbl>, tf_essay6_c <dbl>,
## #   tf_essay6_d <dbl>, tf_essay6_e <dbl>, tf_essay6_en <dbl>,
## #   tf_essay6_er <dbl>, tf_essay6_es <dbl>, tf_essay6_f <dbl>,
## #   tf_essay6_g <dbl>, tf_essay6_h <dbl>, tf_essay6_i <dbl>,
## #   tf_essay6_in <dbl>, tf_essay6_ing <dbl>, tf_essay6_it <dbl>,
## #   tf_essay6_j <dbl>, tf_essay6_k <dbl>, tf_essay6_l <dbl>, tf_essay6_m <dbl>,
## #   tf_essay6_n <dbl>, tf_essay6_nd <dbl>, tf_essay6_o <dbl>,
## #   tf_essay6_on <dbl>, tf_essay6_or <dbl>, tf_essay6_ou <dbl>,
## #   tf_essay6_ow <dbl>, tf_essay6_p <dbl>, tf_essay6_q <dbl>,
## #   tf_essay6_r <dbl>, tf_essay6_re <dbl>, tf_essay6_s <dbl>,
## #   tf_essay6_t <dbl>, tf_essay6_u <dbl>, tf_essay6_v <dbl>, tf_essay6_w <dbl>,
## #   tf_essay6_x <dbl>, tf_essay6_y <dbl>, tf_essay6_z <dbl>
```

The second engine is access to [udpipe](https://github.com/bnosac/udpipe).
To use this engine you must first download a udpipe model


```r
library(udpipe)
udmodel <- udpipe_download_model(language = "english")
udmodel
##      language
## 1 english-ewt
##                                                                                                                          file_model
## 1 /Users/emilhvitfeldthansen/Github/hvitfeldt.me/content/post/2020-11-13-textrecipes-0.4.0-release/english-ewt-ud-2.5-191206.udpipe
##                                                                                                                                  url
## 1 https://raw.githubusercontent.com/jwijffels/udpipe.models.ud.2.5/master/inst/udpipe-ud-2.5-191206/english-ewt-ud-2.5-191206.udpipe
##   download_failed download_message
## 1           FALSE               OK
```

And then you need to pass it into `training_options` under the name `model`.
This will then use the tokenizer


```r
recipe(~ essay6, data = okc_text) %>%
  step_tokenize(essay6, engine = "udpipe", 
                training_options = list(model = udmodel)) %>%
  step_tf(essay6) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 750 x 4,044
##    `tf_essay6_-` `tf_essay6_--` `tf_essay6_---` `tf_essay6_---<` `tf_essay6_--&`
##            <dbl>          <dbl>           <dbl>            <dbl>           <dbl>
##  1             0              0               0                0               0
##  2             0              0               0                0               0
##  3             0              0               0                0               0
##  4             0              0               0                0               0
##  5             0              0               0                0               0
##  6             0              0               0                0               0
##  7             0              0               0                0               0
##  8             2              0               0                0               0
##  9             0              0               0                0               0
## 10             0              0               0                0               0
## # … with 740 more rows, and 4,039 more variables: `tf_essay6_--ernesto` <dbl>,
## #   `tf_essay6_-apocalypse.<` <dbl>, `tf_essay6_-dominated` <dbl>,
## #   `tf_essay6_-friendly` <dbl>, `tf_essay6_-insane` <dbl>,
## #   `tf_essay6_-languages` <dbl>, `tf_essay6_-linear` <dbl>,
## #   `tf_essay6_-my` <dbl>, `tf_essay6_-numbingly` <dbl>,
## #   `tf_essay6_-voyeurism` <dbl>, `tf_essay6_,` <dbl>, `tf_essay6_,<` <dbl>,
## #   `tf_essay6_;` <dbl>, `tf_essay6_;-)` <dbl>, `tf_essay6_;)` <dbl>,
## #   `tf_essay6_:` <dbl>, `tf_essay6_:-)` <dbl>, `tf_essay6_:-d` <dbl>,
## #   `tf_essay6_:)` <dbl>, `tf_essay6_:<` <dbl>, `tf_essay6_:d` <dbl>,
## #   `tf_essay6_:p` <dbl>, `tf_essay6_!` <dbl>, `tf_essay6_!!` <dbl>,
## #   `tf_essay6_!!!` <dbl>, `tf_essay6_!)` <dbl>, `tf_essay6_!<` <dbl>,
## #   `tf_essay6_?` <dbl>, `tf_essay6_?!` <dbl>, `tf_essay6_?!?!` <dbl>,
## #   `tf_essay6_?!<` <dbl>, `tf_essay6_??` <dbl>, `tf_essay6_????` <dbl>,
## #   `tf_essay6_??<` <dbl>, `tf_essay6_?"` <dbl>, `tf_essay6_?<` <dbl>,
## #   tf_essay6_. <dbl>, tf_essay6_.. <dbl>, tf_essay6_... <dbl>,
## #   tf_essay6_.... <dbl>, `tf_essay6_....?` <dbl>, tf_essay6_..... <dbl>,
## #   tf_essay6_...... <dbl>, tf_essay6_....... <dbl>, tf_essay6_........ <dbl>,
## #   tf_essay6_.......... <dbl>, tf_essay6_........... <dbl>,
## #   tf_essay6_....fishing <dbl>, tf_essay6_...jk <dbl>,
## #   tf_essay6_...zombies <dbl>, `tf_essay6_.)` <dbl>, `tf_essay6_.<` <dbl>,
## #   tf_essay6_.erykah <dbl>, tf_essay6_.sex <dbl>, `tf_essay6_'` <dbl>,
## #   `tf_essay6_'.` <dbl>, `tf_essay6_'<` <dbl>, `tf_essay6_'d` <dbl>,
## #   `tf_essay6_'em` <dbl>, `tf_essay6_'ll` <dbl>, `tf_essay6_'m` <dbl>,
## #   `tf_essay6_'re` <dbl>, `tf_essay6_'s` <dbl>, `tf_essay6_'ve` <dbl>,
## #   `tf_essay6_"` <dbl>, `tf_essay6_">` <dbl>, `tf_essay6_">modest` <dbl>,
## #   `tf_essay6_(` <dbl>, `tf_essay6_(:` <dbl>, `tf_essay6_)` <dbl>,
## #   `tf_essay6_[` <dbl>, `tf_essay6_]` <dbl>, `tf_essay6_*` <dbl>,
## #   `tf_essay6_/` <dbl>, `tf_essay6_/>` <dbl>, `tf_essay6_/a` <dbl>,
## #   `tf_essay6_/interests?i=actuary` <dbl>,
## #   `tf_essay6_/interests?i=anything+frivolous` <dbl>,
## #   `tf_essay6_/interests?i=art` <dbl>, `tf_essay6_/interests?i=bdsm` <dbl>,
## #   `tf_essay6_/interests?i=bigender">` <dbl>,
## #   `tf_essay6_/interests?i=brunch` <dbl>,
## #   `tf_essay6_/interests?i=comfortable` <dbl>,
## #   `tf_essay6_/interests?i=communication` <dbl>,
## #   `tf_essay6_/interests?i=community` <dbl>,
## #   `tf_essay6_/interests?i=documentary` <dbl>,
## #   `tf_essay6_/interests?i=entp` <dbl>, `tf_essay6_/interests?i=field` <dbl>,
## #   `tf_essay6_/interests?i=film` <dbl>,
## #   `tf_essay6_/interests?i=filmmaking` <dbl>,
## #   `tf_essay6_/interests?i=gender-identity` <dbl>,
## #   `tf_essay6_/interests?i=gender">` <dbl>,
## #   `tf_essay6_/interests?i=honey%0abees` <dbl>,
## #   `tf_essay6_/interests?i=integrity` <dbl>,
## #   `tf_essay6_/interests?i=legos` <dbl>, `tf_essay6_/interests?i=life` <dbl>,
## #   `tf_essay6_/interests?i=love` <dbl>,
## #   `tf_essay6_/interests?i=masturbatory` <dbl>,
## #   `tf_essay6_/interests?i=modest+running+shorts+in+neutral+tones` <dbl>,
## #   `tf_essay6_/interests?i=muzak` <dbl>, …
```

But where it gets really interesting is that we are able to extract the lemmas


```r
recipe(~ essay6, data = okc_text) %>%
  step_tokenize(essay6, engine = "udpipe", 
                training_options = list(model = udmodel)) %>%
  step_lemma(essay6) %>%
  step_tf(essay6) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 750 x 3,546
##    `tf_essay6_-` `tf_essay6_--` `tf_essay6_---` `tf_essay6_---<` `tf_essay6_--&`
##            <dbl>          <dbl>           <dbl>            <dbl>           <dbl>
##  1             0              0               0                0               0
##  2             0              0               0                0               0
##  3             0              0               0                0               0
##  4             0              0               0                0               0
##  5             0              0               0                0               0
##  6             0              0               0                0               0
##  7             0              0               0                0               0
##  8             2              0               0                0               0
##  9             0              0               0                0               0
## 10             0              0               0                0               0
## # … with 740 more rows, and 3,541 more variables: `tf_essay6_--ernesto` <dbl>,
## #   `tf_essay6_-apocalypse.<` <dbl>, `tf_essay6_-dominated` <dbl>,
## #   `tf_essay6_-friendly` <dbl>, `tf_essay6_-insane` <dbl>,
## #   `tf_essay6_-language` <dbl>, `tf_essay6_-linear` <dbl>,
## #   `tf_essay6_-my` <dbl>, `tf_essay6_-numbingly` <dbl>,
## #   `tf_essay6_-voyeurism` <dbl>, `tf_essay6_,` <dbl>, `tf_essay6_,<` <dbl>,
## #   `tf_essay6_;` <dbl>, `tf_essay6_;-)` <dbl>, `tf_essay6_;)` <dbl>,
## #   `tf_essay6_:` <dbl>, `tf_essay6_:-)` <dbl>, `tf_essay6_:-d` <dbl>,
## #   `tf_essay6_:)` <dbl>, `tf_essay6_:<` <dbl>, `tf_essay6_:d` <dbl>,
## #   `tf_essay6_:p` <dbl>, `tf_essay6_!` <dbl>, `tf_essay6_!!` <dbl>,
## #   `tf_essay6_!!!` <dbl>, `tf_essay6_!)` <dbl>, `tf_essay6_!<` <dbl>,
## #   `tf_essay6_?` <dbl>, `tf_essay6_?!` <dbl>, `tf_essay6_?!?!` <dbl>,
## #   `tf_essay6_?!<` <dbl>, `tf_essay6_??` <dbl>, `tf_essay6_????` <dbl>,
## #   `tf_essay6_??<` <dbl>, `tf_essay6_?"` <dbl>, `tf_essay6_?<` <dbl>,
## #   tf_essay6_. <dbl>, tf_essay6_.. <dbl>, tf_essay6_... <dbl>,
## #   tf_essay6_.... <dbl>, `tf_essay6_....?` <dbl>, tf_essay6_..... <dbl>,
## #   tf_essay6_...... <dbl>, tf_essay6_....... <dbl>, tf_essay6_........ <dbl>,
## #   tf_essay6_.......... <dbl>, tf_essay6_........... <dbl>,
## #   tf_essay6_....fish <dbl>, tf_essay6_...jk <dbl>, tf_essay6_...zomby <dbl>,
## #   `tf_essay6_.)` <dbl>, `tf_essay6_.<` <dbl>, tf_essay6_.erykah <dbl>,
## #   tf_essay6_.sex <dbl>, `tf_essay6_'` <dbl>, `tf_essay6_'.` <dbl>,
## #   `tf_essay6_'<` <dbl>, `tf_essay6_'s` <dbl>, `tf_essay6_"` <dbl>,
## #   `tf_essay6_">` <dbl>, `tf_essay6_">modest` <dbl>, `tf_essay6_(` <dbl>,
## #   `tf_essay6_(:` <dbl>, `tf_essay6_)` <dbl>, `tf_essay6_[` <dbl>,
## #   `tf_essay6_]` <dbl>, `tf_essay6_*` <dbl>, `tf_essay6_/` <dbl>,
## #   `tf_essay6_/>` <dbl>, `tf_essay6_/a` <dbl>,
## #   `tf_essay6_/interests?i=actuary` <dbl>,
## #   `tf_essay6_/interests?i=anything+frivolous` <dbl>,
## #   `tf_essay6_/interests?i=art` <dbl>, `tf_essay6_/interests?i=bdsm` <dbl>,
## #   `tf_essay6_/interests?i=bigender">` <dbl>,
## #   `tf_essay6_/interests?i=brunch` <dbl>,
## #   `tf_essay6_/interests?i=comfortable` <dbl>,
## #   `tf_essay6_/interests?i=communication` <dbl>,
## #   `tf_essay6_/interests?i=community` <dbl>,
## #   `tf_essay6_/interests?i=documentary` <dbl>,
## #   `tf_essay6_/interests?i=entp` <dbl>, `tf_essay6_/interests?i=field` <dbl>,
## #   `tf_essay6_/interests?i=film` <dbl>,
## #   `tf_essay6_/interests?i=filmmaking` <dbl>,
## #   `tf_essay6_/interests?i=gender-identity` <dbl>,
## #   `tf_essay6_/interests?i=gender">` <dbl>,
## #   `tf_essay6_/interests?i=honey%0abee` <dbl>,
## #   `tf_essay6_/interests?i=integrity` <dbl>,
## #   `tf_essay6_/interests?i=lego` <dbl>, `tf_essay6_/interests?i=life` <dbl>,
## #   `tf_essay6_/interests?i=love` <dbl>,
## #   `tf_essay6_/interests?i=masturbatory` <dbl>,
## #   `tf_essay6_/interests?i=modest+running+shorts+in+neutral+tone` <dbl>,
## #   `tf_essay6_/interests?i=muzak` <dbl>, `tf_essay6_/interests?i=my` <dbl>,
## #   `tf_essay6_/interests?i=non-profit">non-profit</a` <dbl>,
## #   `tf_essay6_/interests?i=nvc">nvc</a` <dbl>,
## #   `tf_essay6_/interests?i=organize` <dbl>,
## #   `tf_essay6_/interests?i=politic` <dbl>,
## #   `tf_essay6_/interests?i=polyamory` <dbl>, …
```

or use the [part of speech tags](https://en.wikipedia.org/wiki/Part_of_speech) in later steps, such as below where we are filtering to only keep nouns.


```r
recipe(~ essay6, data = okc_text) %>%
  step_tokenize(essay6, engine = "udpipe", 
                training_options = list(model = udmodel)) %>%
  step_pos_filter(essay6, keep_tags = "NOUN") %>%
  step_tf(essay6) %>%
  prep() %>%
  bake(new_data = NULL)
## # A tibble: 750 x 1,970
##    `tf_essay6_--er… `tf_essay6_-lan… `tf_essay6_-voy… `tf_essay6_:d`
##               <dbl>            <dbl>            <dbl>          <dbl>
##  1                0                0                0              0
##  2                0                0                0              0
##  3                0                0                0              0
##  4                0                0                0              0
##  5                0                0                0              0
##  6                0                0                0              0
##  7                0                0                0              0
##  8                0                0                0              0
##  9                0                0                0              0
## 10                0                0                0              0
## # … with 740 more rows, and 1,966 more variables: `tf_essay6_:p` <dbl>,
## #   tf_essay6_...jk <dbl>, tf_essay6_...zombies <dbl>, `tf_essay6_'` <dbl>,
## #   `tf_essay6_/a` <dbl>, `tf_essay6_/interests?i=anything+frivolous` <dbl>,
## #   `tf_essay6_/interests?i=art` <dbl>, `tf_essay6_/interests?i=bdsm` <dbl>,
## #   `tf_essay6_/interests?i=brunch` <dbl>,
## #   `tf_essay6_/interests?i=communication` <dbl>,
## #   `tf_essay6_/interests?i=community` <dbl>,
## #   `tf_essay6_/interests?i=documentary` <dbl>,
## #   `tf_essay6_/interests?i=entp` <dbl>, `tf_essay6_/interests?i=film` <dbl>,
## #   `tf_essay6_/interests?i=filmmaking` <dbl>,
## #   `tf_essay6_/interests?i=gender-identity` <dbl>,
## #   `tf_essay6_/interests?i=honey%0abees` <dbl>,
## #   `tf_essay6_/interests?i=integrity` <dbl>,
## #   `tf_essay6_/interests?i=legos` <dbl>, `tf_essay6_/interests?i=life` <dbl>,
## #   `tf_essay6_/interests?i=love` <dbl>,
## #   `tf_essay6_/interests?i=masturbatory` <dbl>,
## #   `tf_essay6_/interests?i=modest+running+shorts+in+neutral+tones` <dbl>,
## #   `tf_essay6_/interests?i=muzak` <dbl>, `tf_essay6_/interests?i=my` <dbl>,
## #   `tf_essay6_/interests?i=politics` <dbl>,
## #   `tf_essay6_/interests?i=polyamory` <dbl>,
## #   `tf_essay6_/interests?i=production` <dbl>,
## #   `tf_essay6_/interests?i=science"` <dbl>,
## #   `tf_essay6_/interests?i=synesthesia` <dbl>,
## #   `tf_essay6_/interests?i=technology` <dbl>,
## #   `tf_essay6_/interests?i=tennis` <dbl>,
## #   `tf_essay6_/interests?i=truisms` <dbl>, `tf_essay6_+theory` <dbl>,
## #   `tf_essay6_<a` <dbl>, `tf_essay6_=p` <dbl>, `tf_essay6_>.` <dbl>,
## #   `tf_essay6_>communication` <dbl>, `tf_essay6_>my` <dbl>,
## #   `tf_essay6_>science</a` <dbl>, `tf_essay6_>truisms` <dbl>,
## #   `tf_essay6_>urban` <dbl>, tf_essay6_1st <dbl>, tf_essay6_a <dbl>,
## #   tf_essay6_abba <dbl>, tf_essay6_ability <dbl>, tf_essay6_absence <dbl>,
## #   tf_essay6_abstract <dbl>, tf_essay6_abundance <dbl>,
## #   tf_essay6_accents <dbl>, tf_essay6_acceptance <dbl>,
## #   tf_essay6_accident <dbl>, tf_essay6_action <dbl>, tf_essay6_actions <dbl>,
## #   tf_essay6_activities <dbl>, tf_essay6_activity <dbl>,
## #   tf_essay6_actors <dbl>, tf_essay6_acts <dbl>,
## #   tf_essay6_actualization <dbl>, tf_essay6_addition <dbl>,
## #   tf_essay6_adult <dbl>, tf_essay6_adventure <dbl>,
## #   tf_essay6_adventures <dbl>, tf_essay6_adversity <dbl>,
## #   tf_essay6_advocate <dbl>, tf_essay6_aeropress <dbl>,
## #   tf_essay6_affairs <dbl>, tf_essay6_afterlife <dbl>,
## #   tf_essay6_afternoon <dbl>, tf_essay6_age <dbl>, tf_essay6_agenda <dbl>,
## #   tf_essay6_agent <dbl>, tf_essay6_ages <dbl>, tf_essay6_aggregate <dbl>,
## #   tf_essay6_agriculture <dbl>, tf_essay6_ai <dbl>, tf_essay6_air <dbl>,
## #   tf_essay6_aka <dbl>, tf_essay6_alarm <dbl>, tf_essay6_alert <dbl>,
## #   tf_essay6_algorithms <dbl>, tf_essay6_alibi <dbl>, tf_essay6_aliens <dbl>,
## #   tf_essay6_aloha <dbl>, tf_essay6_alps <dbl>, tf_essay6_am <dbl>,
## #   tf_essay6_amnesia <dbl>, tf_essay6_amount <dbl>, tf_essay6_amp <dbl>,
## #   tf_essay6_anagrams <dbl>, tf_essay6_analyzing <dbl>,
## #   tf_essay6_anarchism <dbl>, tf_essay6_anarchists <dbl>,
## #   tf_essay6_anaximander <dbl>, tf_essay6_android <dbl>,
## #   tf_essay6_animal <dbl>, tf_essay6_animals <dbl>, tf_essay6_answer <dbl>,
## #   tf_essay6_answers <dbl>, tf_essay6_anxiety <dbl>, …
```

This is all for this release. I hope you found some of it useful. I would love to hear what you are using `textrecipes` with!
