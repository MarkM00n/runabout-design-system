# Prototypes

Exploratory work — spikes, one-off explorations, things being tried out.
**Not part of the shipped design system.** See
`docs/design-system-rules.md` §9 for the full rule; short version:

- One flat `Name.tsx` per prototype, directly in this folder — no
  `ComponentName/` folder, no `index.ts`, no `Name.docs.ts`, no
  `Name.validation.json`. Those belong to `src/components/`'s contract,
  not this lane.
- Pair it with a `Name.stories.tsx` if you want it visible in Storybook.
  Give the story `title: 'Prototypes/Name'` — it'll show up under its own
  "Prototypes" section in the sidebar, with a banner marking it as
  exploratory.
- `npm run design-sync` runs the same token-compliance and
  accessibility/contrast checks against this folder as it does against
  `src/components/`, but only *reports* what it finds here — it never
  fails the build. Whatever shows up in that report is the checklist for
  what the prototype would need before it could graduate.
- To graduate a prototype, move it into a real `src/components/ComponentName/`
  folder and build out everything `docs/design-system-rules.md` requires
  (stories, docs, an `index.ts`, and a clean `design-sync` run). This
  folder is a place to work things out, not a place a component stays
  once it ships.
