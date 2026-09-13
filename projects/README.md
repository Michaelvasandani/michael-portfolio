# Projects page

Static page at `/projects/`, sharing `assets/site.css` with About and Experience.
The six project entries follow Michaelvasandani's pinned GitHub repositories,
checked September 11, 2026. Descriptions are based on the repository documentation.
Update the entries in `index.html` when pins change; they remain available without JavaScript.

## Contribution calendar

Compared [github-calendar](https://github.com/Bloggify/github-calendar) and
[react-github-calendar](https://github.com/grubersjoe/react-github-calendar).
The former embeds GitHub's rolling-year HTML; the latter requires React.
To keep this static site lightweight and support explicit calendar years,
`assets/projects.mjs` renders an SVG using the same public
[github-contributions-api](https://github.com/grubersjoe/github-contributions-api)
that powers react-github-calendar. There are no runtime packages or tokens.

Data loads on page entry and year selection. The external service caches results
for one hour; totals reflect publicly available data and can differ from the
signed-in GitHub view. Requests time out after 15 seconds, errors offer a retry,
and outdated responses cannot overwrite a more recently selected year.
The graph supports daily labels, arrow-key navigation, and horizontal scrolling
on small screens. Future dates appear as faded placeholders.

## Local checks

From the repository root:

```sh
node --test test-projects.mjs
sh test-index.sh
sh test-experience.sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `/projects/` and check year selection, daily focus labels, and mobile scrolling.

## Count comparison

On September 11, 2026, both GitHub's unauthenticated contributions endpoint
(`/users/Michaelvasandani/contributions?from=2026-01-01&to=2026-12-31`) and
a cache-bypassed API request returned 421 for 2026, versus 805 in the owner's
screenshot. This is not a renderer or year-range discrepancy. Private contribution
visibility is the likely difference; enabling anonymized private counts on the
GitHub profile lets the public data source include them after its cache refreshes.
Never replace the live total with a hardcoded screenshot value.

Year selection uses a vertical button list on desktop and a horizontal list on
mobile. The total sits above the bordered graph, with the legend and contribution
help link inside the border. Daily details appear on hover or keyboard focus
without adding a persistent empty row.
