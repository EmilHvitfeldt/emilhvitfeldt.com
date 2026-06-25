library(tidyverse)
library(rvest)
library(jsonlite)

# Sprites

url <- "post/love-island-connections/data/12-uk.html"

extract_couples <- function(url) {
  html <- read_html(url)
  
  rows <- html |>
    html_element("tbody") |>
    html_elements("tr")
  
  rows <- rows[-c(1, 2, length(rows)-c(0, 1))]
  
  names <- rows |>
    html_elements("th") |>
    html_text() |>
    str_trim()
  
  extract_matches <- function(row) {
    row |>
      html_elements("td") |>
      html_text() |>
      str_trim()
  }
  
  map(rows, extract_matches) |>
    map2(names, ~ tibble(x = .y, y = .x)) |>
    list_rbind() |>
    filter(!str_detect(y, "\\(")) |>
    filter(!str_detect(y, "\\)")) |>
    filter(y != "N/A", y != "Not in Villa", y != "Single") 
}

fs::dir_ls("post/love-island-connections/data", glob = "*.html") |>
  map(extract_couples) |>
  list_rbind(names_to = "url") |>
  mutate(
    season = basename(url) |> str_extract("([0-9]+)") |> as.numeric(),
    country = basename(url) |> str_remove("([0-9]+)-") |> str_remove("\\.html"),
    x = if_else(x== "ChloÃ«", "Chloë", x),
    y = if_else(y== "ChloÃ«", "Chloë", y)
  ) |>
  select(-url) |>
  write_csv("post/love-island-connections/data/data.csv")
