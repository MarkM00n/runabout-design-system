# What the prototype can show

`src/prototypes/WorkingSession.tsx` — one page, Runabout components and tokens only.
Start every build by editing `CONFIG`; only change the layout when the room asks.

## CONFIG (top of the file)

| Key | What it does |
|---|---|
| `title`, `lede` | Page heading (Recoleta) and one-line intro. Write them from the build brief, in the PMs' words. |
| `groupBy` | Column for the main chart ("by building"). |
| `outcome` | `{ column, value }` to track as a rate, e.g. `status = No-show`. Remove it to show counts instead. |
| `filters` | Up to three columns offered as dropdowns. |
| `tableRows` | Rows shown in "The rows behind it". |

## Building blocks already on the page

- **Filters** — Runabout `Select` (small), one per filter column, "All" first.
- **Tiles** — `Tile`: label (overline), big value, short note. Up to three in a row. `tone="warning"` for a value that needs attention.
- **Bars** — `Bars`: label, bar, value. Bars at twice the overall rate or more turn `state-warning`. Used for "by group" and "by day of week".
- **Table** — the rows behind it, date / group / outcome first, outcome as a Runabout `Badge` (warning for the tracked value, neutral otherwise).

## Changes that are quick (under a minute)

- Reorder, add or remove tiles, charts, filters.
- Sort a chart differently, highlight one bar, show top N.
- Add a comparison (this period vs last) as a second value in tiles or bars.
- Rename anything to the room's words.

## Changes to push back on in the room

- New components or new colours: say "in a real build that goes through the system; for today, here's the closest thing".
- Anything that needs data we do not have: add it to "Questions the data raises" instead.

## Tokens to use

Surfaces `bg-surface-section` (page, `data-mode="cream"`), `bg-surface-card` (cards). Text `text-text-primary`, `text-text-secondary`, `text-text-link`. Status `text-state-warning`, `bg-state-warning`, `text-state-success`. Bars track `bg-alpha-ink-10`, fill `bg-action-primary`. Spacing `gap-01…gap-07`, `p-05`, radius `rounded-2xl`. Type `font-recoleta text-h3` for the page title, otherwise `font-manrope` with `text-h6`, `text-label`, `text-caption`, `text-overline`.
