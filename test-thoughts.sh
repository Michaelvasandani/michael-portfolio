#!/bin/sh
set -eu

root="$(dirname "$0")"
thoughts="$root/thoughts.html"
image="$root/assets/thoughts-tony-stark.jpg"

test -f "$thoughts"
test -f "$image"

grep -q '<title>Thoughts — Michael Vasandani</title>' "$thoughts"
grep -q '<h1>/thoughts</h1>' "$thoughts"
grep -q 'aria-current="page">Thoughts</a>' "$thoughts"
grep -q 'src="assets/thoughts-tony-stark.jpg"' "$thoughts"
grep -q 'alt="Close-up of Tony Stark looking through a helmet display"' "$thoughts"
grep -q '>Empty right now\.<' "$thoughts"

for page in "$root/index.html" "$root/experience/index.html" "$root/projects/index.html" "$thoughts"; do
  if grep -qi '>Music</a>' "$page"; then
    echo "Music remains in the navigation: $page" >&2
    exit 1
  fi
done

echo "Thoughts page and navigation are correct"
