---
title: Creating RStudio addin to modify selection
description: |
  Creating addins to be used in RStudio.
date: '2019-07-30'
categories:
image: "featured.webp"
---

# The problem

Lately, there has been some well-deserved buzz around addins in RStudio, [datapasta](https://github.com/milesmcbain/datapasta) being one and [hrbraddins](https://gitlab.com/hrbrmstr/hrbraddins) being another highly liked one. 

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I find datapasta helpful for creating little tibbles for teaching. I&#39;ll find some interesting data online and just copy and paste the table directly into the correct format. You can also set up keyboard shortcuts, because who doesn&#39;t love a keyboard shortcut. Thanks <a href="https://twitter.com/MilesMcBain?ref_src=twsrc%5Etfw">@MilesMcBain</a> <a href="https://t.co/deaZVVYYDu">pic.twitter.com/deaZVVYYDu</a></p>&mdash; We are R-Ladies (@WeAreRLadies) <a href="https://twitter.com/WeAreRLadies/status/1153284810191847425?ref_src=twsrc%5Etfw">July 22, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">My keyboard shortcut for this lil&#39; function gets quite the workout…<br>📺 &quot;hrbraddins::bare_combine()&quot; by <a href="https://twitter.com/hrbrmstr?ref_src=twsrc%5Etfw">@hrbrmstr</a> <a href="https://t.co/8dwqNEso0B">https://t.co/8dwqNEso0B</a> <a href="https://twitter.com/hashtag/rstats?src=hash&amp;ref_src=twsrc%5Etfw">#rstats</a> <a href="https://t.co/gyqz2mUE0Y">pic.twitter.com/gyqz2mUE0Y</a></p>&mdash; Mara Averick (@dataandme) <a href="https://twitter.com/dataandme/status/1155842512743030785?ref_src=twsrc%5Etfw">July 29, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

All of this is done with [RStudio Addins](https://www.rstudio.com/resources/webinars/understanding-add-ins/) using the [rstudioapi](https://github.com/rstudio/rstudioapi) r package.

A lot of the popular addins follows the same simple formula

- extract highlighted text
- modify extracted text
- replace highlighted text with modified text.

if your problem can be solved with the above steps, then this post is for you.

# The solution

Once you have found the name of your addin, go to your package directory, or [create a new package](https://www.hvitfeldt.me/blog/usethis-workflow-for-package-development/). Then we use [usethis](https://usethis.r-lib.org/) to create a .R file for the function and to create the necessary infrastructure to let RStudio know it is a Addin.


```r
use_r("name_of_your_addin")
use_addin("name_of_your_addin")
```

The `inst/rstudio/addins.dcf` file will be populated to make a binding between your function to the addins menu. From here you will in `Name` to change the text of the button in the drop-down menu and change the `description` to change the hover text.


```r
Name: New Addin Name
Description: New Addin Description
Binding: name_of_your_addin
Interactive: false
```

now you can go back to the .R to write your function. Below is the minimal code needed. Just replace `any_function` with a function that takes a string and returns a modified string. build the package and you are done!


```r
example <- function() {
  
  # Gets The active Documeent
  ctx <- rstudioapi::getActiveDocumentContext()

  # Checks that a document is active
  if (!is.null(ctx)) {
    
    # Extracts selection as a string
    selected_text <- ctx$selection[[1]]$text

    # modify string
    selected_text <- any_function(selected_text)
    
    # replaces selection with string
    rstudioapi::modifyRange(ctx$selection[[1]]$range, selected_text)
  }
}
```

# Examples - slugify

While I was writing this post I created an addin to turn the title of the blog post into a slug I could use. I replaced


```r
selected_text <- any_function(selected_text)
```

with 


```r
selected_text <- stringr::str_to_lower(selected_text)
selected_text <- stringr::str_replace_all(selected_text, " ", "-")
```

Which gave me this little gem of an addin! 

![](htrPc6d.gif)

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
