---
name: prototype-mode
description: Deliberate opt-in mode for building an exploratory, vibe-coded prototype in src/prototypes/ from existing design-system components and tokens, with no Figma source to build against. Only apply this when the user explicitly invokes /prototype-mode — do not infer it from casual language elsewhere in a request ("prototype", "mock up", "quick version"). Outside an explicit invocation, the normal Ready-for-AI check and design-system-rules.md gates stay on.
---

# Prototype mode

This is a deliberate switch, not an ambient default. It only applies when
the user explicitly runs `/prototype-mode` — a request that merely
*mentions* prototyping, mocking something up, or building something quick
does **not** put you here. Outside an explicit invocation, every normal
gate stays on: the Ready-for-AI check on Figma-to-code requests, and
`docs/design-system-rules.md`'s full rule set on anything under
`src/components/`. This skill exists so stepping out of those gates is
always a conscious choice, made once per prototype, not something inferred
from wording.

This is the recipe for building a prototype the way
`src/prototypes/VinesAndVinylSignUp.tsx` and
`src/prototypes/VinesAndVinylLandingWithSignUp.tsx` were built: no Figma
source, existing components and tokens only, gaps recorded instead of
silently patched. `docs/design-system-rules.md` §9 and
`src/prototypes/README.md` are the authoritative source for the prototype
lane's rules — this skill is the trigger that says "apply those now, for
this one thing, and skip the usual component workflow around them."

## Skip the Ready-for-AI check — for this prototype only

CLAUDE.md's standing rule to check every Figma-to-code request against
`docs/ready-for-ai.md` does not apply to what you build under this skill
— there is no Figma design to check against, by design. Don't look for
one, don't ask for one, don't block on its absence. Go straight to
building. This exception is scoped to the prototype being built right
now; it doesn't relax the check for anything else in the same
conversation.

## Where it goes

`src/prototypes/`, one flat `ComponentName.tsx` file, no
`ComponentName/` folder. No `docs.ts`, no `index.ts`, no
`validation.json` — those belong to `src/components/`'s contract, not
this lane. Pair it with `ComponentName.stories.tsx` (`title:
'Prototypes/Name'`, `parameters.layout: 'fullscreen'` if it's a full
page) so it's visible in Storybook and picks up the exploratory banner
and the inert-Mode-toolbar treatment automatically (`.storybook/preview.tsx`
already handles both by title match).

## Build with what exists — and flag what doesn't

Use existing components and semantic tokens first. When something the
system genuinely doesn't have is needed — a variant that was never built,
a token that doesn't exist, a treatment nothing has needed yet — **use it
anyway and make sure it shows up in `npm run design-sync`'s Prototypes
report**, rather than stopping or quietly hardcoding around it:

- A missing state/variant: invent the treatment in userland via the
  component's own `className` prop, using a real registered token in a
  role nothing has used it in yet (that's not a system gap, just a first
  usage — say so).
- A genuinely missing token (no semantic token covers the need at all):
  use a raw value, and leave a comment nearby explaining why — `design-sync`
  greps for a nearby comment on raw hex values and reports it either way,
  but an unexplained one reads worse in the report.

Never silently work around a gap in a way that leaves no trace in the
report. The report **is** the deliverable for what this prototype would
need before it could graduate to `src/components/`.

## Data-mode and brand

Set the right `data-mode` per surface, same as any component — see
`docs/design-system-rules.md` §7 for how modes resolve. If this
prototype is a full page with multiple sections (not a single
component), each section sets its own `data-mode` explicitly; don't rely
on the Storybook Mode toolbar for a full-page story, since it's inert on
`Prototypes/*` titles by design (`.storybook/preview.tsx`). The Brand
toolbar still applies everywhere — verify both brands resolve correctly,
by computed value, not just visual glance.

## Before reporting done

1. Run `npm run design-sync` and read the Prototypes section for this
   file — this is non-blocking (`Overall Status` won't fail because of
   it), but it's the checklist to report back, not something to silence.
2. Confirm it renders correctly in both brands (computed value, not just
   "looks fine") and in whatever modes are relevant.
3. Report the violation list plainly, in the same message as calling the
   build done — don't make the user go find it themselves.

## Everything else is normal

Standard git/PR workflow applies unchanged (branch, commit, push, draft
PR, `gh pr ready`, verify the deploy fired) — see CLAUDE.md's rules on
PR creation and deploy verification. Prototypes almost never touch
`src/components/`, so say plainly that the Slack PR notification won't
fire, per CLAUDE.md's "Say what Slack will and won't do" rule — don't
leave that unstated just because it's a prototype.
