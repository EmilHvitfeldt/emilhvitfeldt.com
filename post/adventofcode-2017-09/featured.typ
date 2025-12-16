#set page(
  width: 9in,
  height: 6in,
  footer: none,
  fill: rgb("#0F0F23")
)
#set align(center)
#set align(horizon)
#set text(
  50pt, 
  font: "DejaVu Sans Mono",
  fill: rgb("#00cc00")
)

Advent of Code

2017 Day 9

#for c in (top+left, top+right, bottom+left, bottom+right) {
  place(c)[#text(fill: rgb("#ffff66"))[\*\*]]
}
