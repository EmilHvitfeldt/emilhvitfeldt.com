---
title: usethis workflow for package development
description: |
  A quick overview on how to get started with creating an R package with the help of usethis.
date: '2018-09-02'
categories:
  - package development
image: "featured.webp"
---




::: {.callout-note}
This code has been slightly revised to make sure it works as of 2018-12-16.
:::

There has been a lot of progress in the aid of package development in R in recent times. The classic blogpost by Hilary Parker [Writing an R Package From Scratch](https://hilaryparker.com/2014/04/29/writing-an-r-package-from-scratch/) and its younger sister [Writing an R package from scratch](https://r-mageddon.netlify.com/post/writing-an-r-package-from-scratch/) by Tomas Westlake are both great sources of information to create a package. For more general documentation on package development, you would be right to look at Hadley Wickham's book [R packages](http://r-pkgs.had.co.nz/). The **devtools** package has always been instrumental for good package development, but some of these features and additional ones are now to be found in the [usethis](https://github.com/r-lib/usethis) package. The **usethis** promises to

> ... it automates repetitive tasks that arise during project setup and development, both for R packages and non-package projects.

In this blog post, I'll outline the basic workflow you can acquire using the tools in **usethis**. More specifically I'll outline a workflow of an R package development. The course of any R package development can be broken down into these steps:

- Before creation
- Creating minimal functional package
- One time modifications
- Multiple time modifications
- Before every commit
- Before every release

Before we start, I assume that you will be using Rstudio for this tutorial.

## Before the creation

Before we get started we need to make sure we have the essential packages installed to create an R package development workflow


```r
#install.packages(c("devtools", "roxygen2", "usethis"))
library(devtools)
library(roxygen2)
library(usethis)
```

Side-note, if you are to create an R package, you need a name. It needs to be unique, especially if you plan on getting your package on CRAN. The **available** package can help you evaluate possible names to make sure they don't clash with other names and that they don't mean something rude. For this example I'm going to make a horrible name by shortening the phrases "**u**se**t**his **w**ork**f**low"


```r
library(available)
available("utwf")
```

<img src="Screen Shot 2018-09-02 at 19.34.04.png" width="700px" style="display: block; margin: auto;" />

the only acronym it finds is "Umauma Triple Water Falls" so we are good to go. Next, we need to make sure that you have set up **usethis**, for this section I'll refer to the original documentation [usethis setup](http://usethis.r-lib.org/articles/articles/usethis-setup.html) as it explains these steps better than I could.

## Creating minimal functional package

Now that you have followed the setup guide you are ready to create a minimal functional package.  

For creation we will use the `create_package()` function to create an R package. 


```r
create_package("~/Desktop/utwf")
use_git()
use_github()
```

<img src="Screen Shot 2018-09-02 at 16.39.18.png" width="700px" style="display: block; margin: auto;" />

<img src="Screen Shot 2018-09-02 at 16.41.05.png" width="700px" style="display: block; margin: auto;" />

<img src="Screen Shot 2018-09-02 at 16.42.53.png" width="700px" style="display: block; margin: auto;" />

And we are done! We now have a minimal R package, complete with a Github repository. With these files included:

<img src="Screen Shot 2018-09-02 at 16.56.20.png" width="700px" style="display: block; margin: auto;" />

Right now it doesn't have much, in fact, it doesn't even have a single function in it. We can check that the package works by pressing "Install and Restart" in the "Build" panel. Alternatively, you can use the keyboard shortcut Cmd+Shift+B (Ctrl+Shift+B for Windows). 

## One time modifications

Now that we are up and running there is a bunch of things we should do before we start writing code. Firstly we will go over all the actions that only have to be done once and get those out of the way.  

Firstly we will go into the **DESCRIPTION** file and make sure that the *Authors@R* is populated correctly and modify the *Title* and *Description* fields.  

Next, we will license the package. This can be done using one of the following functions (we will use MIT for this example)


```r
use_mit_license()
use_gpl3_license()
use_apl2_license()
use_cc0_license()
```

<img src="Screen Shot 2018-09-02 at 17.17.47.png" width="700px" style="display: block; margin: auto;" />

Choice of which license you need is beyond the scope of this post. Please refer to the [R Packages license section](http://r-pkgs.had.co.nz/description.html#license) or [https://choosealicense.com/](https://choosealicense.com/) for further assistance.  

Now we add the *readme* files, this is done using the 


```r
use_readme_rmd()
```

<img src="Screen Shot 2018-09-02 at 17.39.55.png" width="700px" style="display: block; margin: auto;" />

This will create a *readme.Rmd* file that you can edit and knit as you normally would.  

Next we will setup some continuous integration. I'll recommend trying to do all of the 3 following:


```r
use_travis()
use_appveyor()
use_coverage(type = c("codecov"))
```

<img src="Screen Shot 2018-09-02 at 17.34.04.png" width="700px" style="display: block; margin: auto;" />

These calls won't do all the work for you, so you would have to follow the directions (following red circles) and turn on the services on the Travis and AppVeyor websites respectively, copy badges to the readme (typically placed right under the main title "# utwf") and copy the code snippet to the *.travis.yml* file.  

You will most likely also want to include unit testing, this can be achieved using the [testthat](https://github.com/r-lib/testthat) package, to include the testing capacity of **testthat** in your package simply run the following 


```r
use_testthat()
```

<img src="Screen Shot 2018-09-02 at 17.29.02.png" width="700px" style="display: block; margin: auto;" />

you will need to add at least one test to avoid failed builds on Travis-ci and Appveyor. More information on how to do testing can be found at the [Testing](http://r-pkgs.had.co.nz/tests.html) chapter in the R packages book.  

Next, we will add spell checking to our workflow, this is done with


```r
use_spell_check()
```

<img src="Screen Shot 2018-09-02 at 17.22.40.png" width="700px" style="display: block; margin: auto;" />

Make sure that the **spelling** package is installed before running.  

If you are going to include data in your package, you would want to include a *data-raw* folder where the data is created/formatted. 


```r
use_data_raw()
```

<img src="Screen Shot 2018-09-02 at 17.27.12.png" width="700px" style="display: block; margin: auto;" />

Lastly, if you plan on doing a little larger project a *NEWS* file is very handy to keep track of what is happening in your package.


```r
use_news_md()
```

<img src="Screen Shot 2018-09-02 at 17.45.27.png" width="700px" style="display: block; margin: auto;" />

## Multiple time modifications

Now that we have set up all the basics, the general development can begin.

Your typical workflow will be repeating the following steps in the order that suits your flow

- Write some code
- Restart R Session Cmd+Shift+F10 (Ctrl+Shift+F10	for Windows)
- Build and Reload Cmd+Shift+B (Ctrl+Shift+B for Windows)
- Test Package Cmd+Shift+T (Ctrl+Shift+T for Windows)
- Check Package	Cmd+Shift+E (Ctrl+Shift+E	for Windows)
- Document Package Cmd+Shift+D (Ctrl+Shift+D for Windows)

Writing code most likely includes writing functions, this is helped by the `use_r()` function by adding and opening a .R file that you write your function in


```r
use_r("function_name")
```

<img src="Screen Shot 2018-09-02 at 17.57.38.png" width="700px" style="display: block; margin: auto;" />

This function is very important and you will using it a lot, not only will it create the files you save your functions in, but it will also open the files if they are already created, this makes navigating your R files much easier. Once you have created your function it is time to add some tests! This is done using the `use_test()` function, and it works much the same way as the `use_r()`.


```r
use_test("function_name")
```

<img src="Screen Shot 2018-09-02 at 18.04.35.png" width="700px" style="display: block; margin: auto;" />

In the creating of your functions, you might need to depend on another package, to add a function to the *imports* field in the *DESCRIPTION* file you can use the `use_package()` function


```r
use_package("dplyr") 
```

<img src="Screen Shot 2018-09-02 at 18.03.21.png" width="700px" style="display: block; margin: auto;" />

Special cases function includes `use_rcpp()`, `use_pipe()` and `use_tibble()`.

A vignette provides a nice piece of documentation once you have added a bunch of capabilities to your package. 


```r
use_vignette("How to do this cool analysis")
```

<img src="Screen Shot 2018-09-02 at 18.08.50.png" width="700px" style="display: block; margin: auto;" />

## Before every commit

Before you commit, run the following commands one more time to make sure you didn't break anything.

- Restart R Session Cmd+Shift+F10 (Ctrl+Shift+F10	for Windows)
- Document Package Cmd+Shift+D (Ctrl+Shift+D for Windows)
- Check Package	Cmd+Shift+E (Ctrl+Shift+E	for Windows)

## Before every release

You have worked and have created something wonderful. You want to showcase the work. First, go knit the *readme.Rmd* file and then run these commands again to check that everything is working.

- Restart R Session Cmd+Shift+F10 (Ctrl+Shift+F10	for Windows)
- Document Package Cmd+Shift+D (Ctrl+Shift+D for Windows)
- Check Package	Cmd+Shift+E (Ctrl+Shift+E	for Windows)

update the version number with the use of


```r
use_version()
```

<img src="Screen Shot 2018-09-02 at 19.16.46.png" width="700px" style="display: block; margin: auto;" />

And you are good to go!  

## Conclusion

This is the end of this post, and there are many more functions in **usethis** that I haven't covered here, both for development and otherwise. One set of functions I would like to highlight in particular is the [Helpers for tidyverse development](http://usethis.r-lib.org/reference/tidyverse.html) which helps you follow tidyverse conventions which are generally a little stricter than the defaults. If you have any questions or additions you would like to have added please don't refrain from contacting me!

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
 date     2021-07-15                  

─ Packages ───────────────────────────────────────────────────────────────────
 package     * version    date       lib source                           
 blogdown      1.3.2      2021-06-09 [1] Github (rstudio/blogdown@00a2090)
 bookdown      0.22       2021-04-22 [1] CRAN (R 4.1.0)                   
 bslib         0.2.5.1    2021-05-18 [1] CRAN (R 4.1.0)                   
 cachem        1.0.5      2021-05-15 [1] CRAN (R 4.1.0)                   
 callr         3.7.0      2021-04-20 [1] CRAN (R 4.1.0)                   
 cli           3.0.0      2021-06-30 [1] CRAN (R 4.1.0)                   
 clipr         0.7.1      2020-10-08 [1] CRAN (R 4.1.0)                   
 codetools     0.2-18     2020-11-04 [1] CRAN (R 4.1.0)                   
 crayon        1.4.1      2021-02-08 [1] CRAN (R 4.1.0)                   
 desc          1.3.0      2021-03-05 [1] CRAN (R 4.1.0)                   
 details     * 0.2.1      2020-01-12 [1] CRAN (R 4.1.0)                   
 devtools    * 2.4.1      2021-05-05 [1] CRAN (R 4.1.0)                   
 digest        0.6.27     2020-10-24 [1] CRAN (R 4.1.0)                   
 ellipsis      0.3.2      2021-04-29 [1] CRAN (R 4.1.0)                   
 evaluate      0.14       2019-05-28 [1] CRAN (R 4.1.0)                   
 fastmap       1.1.0      2021-01-25 [1] CRAN (R 4.1.0)                   
 fs            1.5.0      2020-07-31 [1] CRAN (R 4.1.0)                   
 glue          1.4.2      2020-08-27 [1] CRAN (R 4.1.0)                   
 highr         0.9        2021-04-16 [1] CRAN (R 4.1.0)                   
 htmltools     0.5.1.1    2021-01-22 [1] CRAN (R 4.1.0)                   
 httr          1.4.2      2020-07-20 [1] CRAN (R 4.1.0)                   
 jquerylib     0.1.4      2021-04-26 [1] CRAN (R 4.1.0)                   
 jsonlite      1.7.2      2020-12-09 [1] CRAN (R 4.1.0)                   
 knitr       * 1.33       2021-04-24 [1] CRAN (R 4.1.0)                   
 lifecycle     1.0.0      2021-02-15 [1] CRAN (R 4.1.0)                   
 magrittr      2.0.1      2020-11-17 [1] CRAN (R 4.1.0)                   
 memoise       2.0.0      2021-01-26 [1] CRAN (R 4.1.0)                   
 pkgbuild      1.2.0      2020-12-15 [1] CRAN (R 4.1.0)                   
 pkgload       1.2.1      2021-04-06 [1] CRAN (R 4.1.0)                   
 png           0.1-7      2013-12-03 [1] CRAN (R 4.1.0)                   
 prettyunits   1.1.1      2020-01-24 [1] CRAN (R 4.1.0)                   
 processx      3.5.2      2021-04-30 [1] CRAN (R 4.1.0)                   
 ps            1.6.0      2021-02-28 [1] CRAN (R 4.1.0)                   
 purrr         0.3.4      2020-04-17 [1] CRAN (R 4.1.0)                   
 R6            2.5.0      2020-10-28 [1] CRAN (R 4.1.0)                   
 remotes       2.4.0      2021-06-02 [1] CRAN (R 4.1.0)                   
 rlang         0.4.11     2021-04-30 [1] CRAN (R 4.1.0)                   
 rmarkdown     2.9        2021-06-15 [1] CRAN (R 4.1.0)                   
 roxygen2    * 7.1.1.9001 2021-06-08 [1] Github (r-lib/roxygen2@e8cd313)  
 rprojroot     2.0.2      2020-11-15 [1] CRAN (R 4.1.0)                   
 sass          0.4.0      2021-05-12 [1] CRAN (R 4.1.0)                   
 sessioninfo   1.1.1      2018-11-05 [1] CRAN (R 4.1.0)                   
 stringi       1.6.2      2021-05-17 [1] CRAN (R 4.1.0)                   
 stringr       1.4.0      2019-02-10 [1] CRAN (R 4.1.0)                   
 testthat      3.0.2      2021-02-14 [1] CRAN (R 4.1.0)                   
 usethis     * 2.0.1      2021-02-10 [1] CRAN (R 4.1.0)                   
 withr         2.4.2      2021-04-18 [1] CRAN (R 4.1.0)                   
 xfun          0.24       2021-06-15 [1] CRAN (R 4.1.0)                   
 xml2          1.3.2      2020-04-23 [1] CRAN (R 4.1.0)                   
 yaml          2.2.1      2020-02-01 [1] CRAN (R 4.1.0)                   

[1] /Library/Frameworks/R.framework/Versions/4.1/Resources/library

```

</details>
<br>
