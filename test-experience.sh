#!/bin/sh
set -eu

page="$(dirname "$0")/experience/index.html"

test -f "$page"
grep -q '<nav class="page-nav"' "$page"
grep -q 'aria-current="page">Experience</a>' "$page"
grep -q 'href="../index.html">About</a>' "$page"
grep -q 'class="experience-title">/experience</h1>' "$page"
grep -q 'src="../assets/experience-boxer.jpg"' "$page"
grep -q 'alt="Hand-drawn boxer' "$page"
grep -q 'class="journal"' "$page"
grep -q 'class="journal-entry"' "$page"
grep -q '\.intro {[^}]*text-align:center' "$page"
grep -q '\.art {[^}]*margin:\.75rem auto 0' "$page"
grep -q '\.page-nav {[^}]*justify-content:center' "$page"
grep -q '\.header-inner {[^}]*padding:\.9rem 0 \.75rem' "$page"
grep -q '\.layout {[^}]*padding:clamp(1\.5rem,3\.5vw,2\.5rem) 0 3rem' "$page"
grep -q '\.intro {[^}]*margin-bottom:clamp(2\.25rem,5vw,3\.5rem)' "$page"
grep -q '\.journal-entry { padding:0 0 2\.4rem; }' "$page"
grep -q '\.summary {[^}]*line-height:1\.55' "$page"

if grep -q 'Michael Vasandani' "$page"; then
  echo "Experience page still displays Michael Vasandani" >&2
  exit 1
fi

if grep -qi 'work that moved from prototype to practice' "$page"; then
  echo "Prototype introduction is still present" >&2
  exit 1
fi

if grep -qi 'in practice' "$page"; then
  echo "In-practice callouts are still present" >&2
  exit 1
fi

if grep -q 'prototype-switcher\|data-variant' "$page"; then
  echo "Prototype controls are still present" >&2
  exit 1
fi

if grep -q '\.journal::before\|\.journal-entry::before' "$page"; then
  echo "Timeline bars or markers are still present" >&2
  exit 1
fi

if grep -q 'grayscale' "$page"; then
  echo "Experience artwork is still forced to grayscale" >&2
  exit 1
fi

if grep -q '\.site-header {[^}]*border-bottom\|justify-content:flex-start' "$page"; then
  echo "Header is still divided or left-aligned" >&2
  exit 1
fi

title_line=$(grep -n 'class="experience-title"' "$page" | head -1 | cut -d: -f1)
image_line=$(grep -n 'src="../assets/experience-boxer.jpg"' "$page" | head -1 | cut -d: -f1)
journal_line=$(grep -n 'class="journal"' "$page" | head -1 | cut -d: -f1)

test "$title_line" -lt "$image_line"
test "$image_line" -lt "$journal_line"

echo "Experience page structure is correct"
