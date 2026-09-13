#!/bin/sh
set -eu

page="$(dirname "$0")/index.html"
dog_image="$(dirname "$0")/assets/home-dog.gif"

grep -q 'class="profile"' "$page"
grep -q 'class="activity-gif"' "$page"
grep -q 'src="assets/home-dog.gif"' "$page"
grep -q 'alt="Close-up of a dog' "$page"
grep -q '<h1>Michael Sagar Vasandani</h1>' "$page"
grep -q '<title>Michael Sagar Vasandani — AI Engineer</title>' "$page"
grep -q '<header class="site-header">' "$page"
grep -q 'class="page-nav" aria-label="Portfolio pages"' "$page"
test -f "$dog_image"
file "$dog_image" | grep -q 'GIF image data'
grep -q 'class="highlight">AI Engineer</' "$page"
grep -q 'family=Kalam:wght@400;700' "$page"
grep -q 'class="page-nav"' "$page"
grep -q 'href="experience/index.html"' "$page"
grep -q 'href="projects/index.html"' "$page"
grep -q 'href="thoughts.html"' "$page"

if grep -q 'href="music.html"' "$page"; then
  echo "The landing page still links to Music" >&2
  exit 1
fi

activity_line=$(grep -n 'class="activity-gif"' "$page" | head -1 | cut -d: -f1)
copy_line=$(grep -n 'class="copy"' "$page" | head -1 | cut -d: -f1)
social_line=$(grep -n 'class="social"' "$page" | head -1 | cut -d: -f1)
nav_line=$(grep -n 'class="page-nav"' "$page" | head -1 | cut -d: -f1)
profile_line=$(grep -n 'class="profile"' "$page" | head -1 | cut -d: -f1)

test "$activity_line" -lt "$copy_line"
test "$nav_line" -lt "$profile_line"
test "$profile_line" -lt "$social_line"

if grep -q '<section id="experience"' "$page"; then
  echo "The landing page still contains the Experience section" >&2
  exit 1
fi

if grep -q 'activity-grid\|github-contributions-api\|activity-status' "$page"; then
  echo "The landing page still contains the GitHub activity diagram" >&2
  exit 1
fi

if grep -q 'home-cat.gif\|<h1>Michael Vasandani</h1>' "$page"; then
  echo "The landing page still uses the old name or opaque GIF" >&2
  exit 1
fi

echo "Landing page structure is correct"
