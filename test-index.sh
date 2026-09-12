#!/bin/sh
set -eu

page="$(dirname "$0")/index.html"

grep -q 'class="profile"' "$page"
grep -q 'class="activity-grid"' "$page"
grep -q 'aria-label="GitHub contribution activity"' "$page"
grep -q 'class="highlight">AI Engineer</' "$page"
grep -q 'family=Kalam:wght@400;700' "$page"
grep -q 'font-family:"Kalam",cursive' "$page"
grep -q 'class="page-nav"' "$page"
grep -q 'href="experience/index.html"' "$page"
grep -q 'href="recent-reads.html"' "$page"
grep -q 'href="thoughts.html"' "$page"
grep -q 'href="music.html"' "$page"
grep -q 'height:100dvh' "$page"
grep -q 'overflow:hidden' "$page"

if grep -q '<header' "$page"; then
  echo "The landing page still contains a header" >&2
  exit 1
fi

activity_line=$(grep -n 'class="activity"' "$page" | head -1 | cut -d: -f1)
copy_line=$(grep -n 'class="copy"' "$page" | head -1 | cut -d: -f1)
social_line=$(grep -n 'class="social"' "$page" | head -1 | cut -d: -f1)
nav_line=$(grep -n 'class="page-nav"' "$page" | head -1 | cut -d: -f1)

test "$activity_line" -lt "$copy_line"
test "$social_line" -lt "$nav_line"

if grep -q '<section id="experience"' "$page"; then
  echo "The landing page still contains the Experience section" >&2
  exit 1
fi

echo "Landing page structure is correct"
