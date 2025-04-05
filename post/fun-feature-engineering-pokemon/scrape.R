library(tidyverse)
library(rvest)
library(jsonlite)

# Sprites

main <- "https://pokemondb.net/sprites"

html <- read_html(main)

sprites <- html |>
  html_element(".infocard-list") |>
  html_elements("a source") |>
  html_attr("srcset")

sprites_path <- fs::path(
  "post/fun-feature-engineering-pokemon/sprites", 
  basename(sprites)
)

walk2(sprites, sprites_path, slowly(download.file))

# raw data

download_pokemon <- function(x) {
  url <- glue::glue("https://pokeapi.co/api/v2/pokemon/{x}/")
  path <- fs::path("post/fun-feature-engineering-pokemon/raw", x, ext = "json")
  slowly(download.file)(url, path)
}

purrr::walk(1:151, download_pokemon)

# stats

files <- fs::dir_ls("post/fun-feature-engineering-pokemon/raw/")

parse_stats <- function(data) {
  tibble(
    stat = janitor::make_clean_names(map_chr(data$stats, c("stat", "name"))),
    value = map_int(data$stats, "base_stat"),
    name = data$name
  )
}

map(files, read_json) |>
  map(parse_stats) |>
  bind_rows() |>
  pivot_wider(names_from = stat, values_from = value) |>
  write_csv("post/fun-feature-engineering-pokemon/stats.csv")

# Moves by pokemon

parse_moves <- function(data) {
  tibble(
    moves = janitor::make_clean_names(map_chr(data$moves, c("move", "name"))),
    name = data$name
  )
}

moves_tbl <- map(files, read_json) |>
  map(parse_moves) |>
  bind_rows()

moves_tbl |>
  mutate(value = 1) |>
  pivot_wider(names_from = moves, values_from = value, values_fill = 0) |>
  write_csv("post/fun-feature-engineering-pokemon/moves.csv")

# Moves informations

parse_moves <- function(data) {
  tibble(
    moves = map_chr(data$moves, c("move", "name")),
    url = map_chr(data$moves, c("move", "url"))
  )
}

moves_tbl <- map(files, read_json) |>
  map(parse_moves) |>
  bind_rows() |>
  distinct()

move_info <- moves_tbl$url[[1]] |>
  read_json() 

move_info |>
  glimpse()

extract_move_info <- function(url) {
  data <- slowly(read_json)(url)
  tibble(
    type = data$type$name,
    priority = data$priority,
    category = data$meta$category$name
  )
}

moves_meta_tbl <- map(moves_tbl$url, extract_move_info, .progress = TRUE) |>
  bind_rows()

moves_meta_tbl <- bind_cols(moves_tbl, moves_meta_tbl) |>
  select(-url) |>
   mutate(moves = janitor::make_clean_names(moves...1))
 
write_csv(moves_meta_tbl, "post/fun-feature-engineering-pokemon/moves-meta.csv")
