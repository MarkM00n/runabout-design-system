# Ready for AI — Figma design intake check

A design that's ambiguous at the Figma layer doesn't become unambiguous by
being handed to a code generator — it just moves the guessing downstream,
into the component. Every rule in `docs/design-system-rules.md` assumes the
source Figma node already gives an honest, checkable answer to "what
variable is this," "what is this called," and "how does this behave." When
it doesn't, building anyway means silently inventing the missing answer —
which is exactly how a mismatched value or an undocumented behavior ships
without anyone deciding it should.

This check runs **before** any component code is generated from a Figma
design, not after. Catching a gap here costs a Figma edit; catching the
same gap once code exists costs a re-generation plus whatever already
consumed the wrong output.

A design must satisfy all seven checks below to be ready to build from.

## 1. Uses library components (not detached)

The design must use real library component instances wherever it needs
something the system already has — buttons, inputs, icons, other
already-built pieces — never a detached instance or a redrawn shape
standing in for one. Detaching breaks the connection to the source
component, so the design stops picking up anything that component changes
later, and it gives whoever builds from it nothing to trace back to.

- **Check:** inspect the node's descendant tree (`get_context_for_code_connect`
  or `get_metadata`) for `INSTANCE` nodes pointing at published components
  wherever the design visually reuses something the system already ships.
  An atomic, foundational design (nothing in the library to reuse yet) passes
  this check by default — there's nothing to have detached or redrawn instead.
- **Fail looks like:** a "button" that's actually a detached instance, or a
  plain frame with a fill and a text layer, sitting next to real `Button`
  instances elsewhere in the same file. If nothing suitable exists anywhere
  in the libraries actually added to this file, that's a different
  outcome — a system-level gap, not an instance fail — see "Before
  reporting a failure" below for how to tell the two apart.

## 2. Colours bound to variables

Every fill, stroke, and text colour must be bound to a published
variable — not a fixed colour applied directly that happens to look right.
A fixed colour doesn't carry the variable's identity with it; it's a guess
about which variable was intended, and it won't follow if that variable's
value ever changes.

- **Check:** the node's variable bindings (`get_variable_defs`) — every
  colour that should be systematized needs a variable bound to it, not
  just a fixed colour with nothing attached.
- **Fail looks like:** a fill with a fixed colour of `#b91c2a` applied
  directly, no variable bound — one shade off the real `state-error`
  variable and indistinguishable from it by eye.

## 3. Text styles applied

Every piece of text must have a published text style applied — not font,
size, and line-height set directly, even when the values currently match a
style. Matching values with no style applied is a coincidence, not a
connection, and it won't follow if that style changes.

- **Check:** the text node's applied style (`get_variable_defs` /
  `get_design_context`) — every text layer that should be systematized
  needs a named text style applied, not just matching values with nothing
  attached.
- **Fail looks like:** a label set to Manrope 13/1.45 directly, with no
  text style applied — it matches the Label style's values today, but a
  future change to Label won't reach it.

## 4. Spacing bound to variables

Every gap, padding, and margin must be bound to a published spacing
variable — not a fixed value applied directly.

- **Check:** the node's variable bindings (`get_variable_defs`) on its
  auto layout — gap and padding need a variable bound to them, not just a
  fixed value with nothing attached.
- **Fail looks like:** a badge padded at a fixed `15`, no variable bound,
  when the system's spacing scale only defines `8`/`16` steps.

## 5. Variant properties clearly named

Component property names and their value options must describe intent —
`variant: success`, `size: small` — not Figma's unedited defaults
(`Property 1`, `Variant 2`) or ambiguous shorthand that only makes sense to
whoever drew it. Whoever builds from these properties has to turn them
into a real set of options; an unclear name here becomes an unclear option
forever.

- **Check:** `get_context_for_code_connect`'s property definitions — every
  variant property and every value option should read as a real word
  describing what it does.
- **Fail looks like:** a component set with a property literally named
  `Property 1` and values `Option A` / `Option B` instead of, say,
  `variant: neutral | success | warning | error`.

## 6. Behaviour notes in the description

The component (or component set)'s description field must say something
about non-visual behaviour — interaction rules, truncation, when to use it
and when not to, anything that can't be inferred from looking at the
static frame. A blank description, or one that just restates the
component's name, leaves that judgment call to whoever builds it.

- **Check:** the component description returned by `get_design_context` /
  `get_context_for_code_connect` (visible in Figma's own inspect panel as
  the component's description).
- **Fail looks like:** an empty description field, or one that just says
  "Badge component."

## 7. Accessibility basics

This check bundles four separate accessibility criteria under one name.
If more than one fails on the same design, give each its own "Needs
fixing" block rather than merging them — label each block with which of
the four it is (e.g. "Accessibility basics — Contrast").

**Contrast.** Every text layer must clear WCAG AA against the surface
directly behind it — 4.5:1 for normal text, 3:1 for large text (18pt/24px
regular, or 14pt/18.66px bold, and up).

- **Check:** resolve the text colour's and the surface colour's actual RGB
  values (via variable bindings or a live `use_figma` read), then compute
  the real contrast ratio using the WCAG relative-luminance formula —
  never eyeball it and never estimate. Report the exact computed ratio,
  e.g. `2.94:1`, not a rounded-off guess.
- **Fail looks like:** pale text on a mid-tone fill that measures `2.94:1`
  against a `4.5:1` requirement — close enough to pass at a glance,
  numerically short.

**Approved pairings.** The text token used must be one of the surface's
approved partners in the Surface pairings table (`docs/design-system-rules.md`
§7) — not just any combination that happens to clear contrast on its own.

- **Check:** identify the bound surface variable and the bound text
  variable, then look up that surface's row in §7's table. If the text
  token isn't listed for that surface, it fails this check even if its
  measured contrast would independently clear AA.
- **Fail looks like:** text bound to `text-highlight` sitting on
  `surface-secondary`, which might measure a passing ratio but isn't one
  of `surface-secondary`'s three approved partners (`text-inverse`,
  `text-link-inverse`, `text-button-inverse`) in the table.

**Touch targets.** Every interactive component's touch target must be at
least 44×44px, even when its visual size is smaller.

- **Check:** the component's real touch-target dimensions — an explicit
  hit-target frame if one exists, otherwise the component's own bounding
  box — against the 44px minimum in both directions.
- **Fail looks like:** a 32px-tall small control with no expanded
  touch-target frame around it — the same gap `Button/Close`'s own
  description already calls out ("Minimum 44x44px touch target regardless
  of visual size").

**Focus state.** Every interactive component's variant set must include a
state representing focus.

- **Check:** the component's state/variant property values
  (`get_metadata` / `get_context_for_code_connect`) for a value
  representing focus — `Focused`, or equivalent.
- **Fail looks like:** a component with `Default`/`Hover`/`Disabled`
  states defined but no `Focused` state anywhere in the set — nothing to
  build a focus-visible style against.

## Verdict

All seven must pass. A single failing check is enough to block — report
which one, in plain language, before writing any code.

## Before reporting a failure

Two things get verified before any "What" or "Fix" text gets written.
Getting either wrong doesn't just weaken the report — it sends someone
chasing a fix that doesn't exist, or blames a layer that was never at
fault.

- **Confirm the fix is actually possible in this file before instructing
  it.** "Use a library component" is only a valid fix if a suitable
  component is genuinely available here. Check `get_libraries` —
  specifically `libraries_added_to_file`, not `libraries_available_to_add`
  — before naming one as the fix. A broad `search_design_system` match
  isn't enough on its own: it can surface components from libraries the
  org has access to but this specific file has never added. If nothing
  suitable is added to the file, this isn't a fixable instance-level
  problem — it's a system-level gap. Report it as one and stop there,
  rather than inventing a fix that can't actually be carried out: "there
  is no icon library in this file — icons are raw vectors. This is a gap
  in the design system, not a fault in this component."
- **Verify the exact failing layer directly — never infer it from a
  neighbour.** Don't assume which layer failed from a sibling's generated
  code, from "colour usually means the text," or from a pattern that
  matched a different bug found earlier. Check the specific node's own
  bindings (`get_variable_defs`, or a live read via `use_figma`) before
  naming it in a report. Name the real Figma layer by its actual layer
  name and type — "the icon vector, not the label text" — never a
  plausible-looking layer nearby.

## How to report results

This check's audience is a designer, not an engineer, and the report is
often read over a screen-share — output it as **real, rendered markdown in
the chat response, never inside a single code fence.** A code fence forces
everything into flat monospace text and throws away every bit of the
hierarchy below; the fenced blocks in this doc are only there so the raw
markup is visible on the page, not a model for how to actually report.

Chat surfaces can't tint arbitrary text, so colour is carried by emoji,
which render in full colour everywhere: ✅ (green), ⚠️ (amber), ❌ (red),
🟢/🔴 for the verdict circle. Report every run in this exact shape:

1. **Verdict line, on its own line, bold, with a colour and a count:**
   🟢 for `READY`, 🔴 for `NOT READY` — e.g.
   `🔴 **NOT READY · 6 of 7 checks passed**`.
2. **A horizontal rule (`---`), then all seven checks as an indented,
   bulleted list** — a colour-coded status emoji and the check's name only,
   nothing else on the line:
   - ✅ — passes cleanly.
   - ⚠️ — passes, but something's worth flagging (e.g. correct today but
     fragile, or a borderline case).
   - ❌ — fails.
3. **Another horizontal rule, then a bold "Needs fixing" heading, then one
   block per failing check** (skip this whole section, its rules, and the
   closing line when the verdict is `READY`). Each block:
   - **Heading, bold:** the failing check's name, then `→`, then which
     variant or layer it's on — e.g. **Colours bound to variables** →
     Warning / Medium.
   - An indented (blockquoted) group of three statements, one per line,
     each its own line with a blank line after it:
     - **What:** what's wrong, in plain words — describe what the designer
       would actually see in Figma (a fixed colour applied directly, a
       detached instance, an empty description field), not what the
       generated code would look like.
     - **Why it matters:** the concrete consequence of leaving it as-is.
     - **Fix:** the exact Figma-side change that resolves it.
   - **Figma link, on its own line, flush left — not indented, not inside
     the blockquote** — so the URL never wraps awkwardly under an indent:
     a direct link to that node
     (`https://www.figma.com/design/<fileKey>/<fileName>?node-id=<id>`,
     with the node's `:` swapped for a `-`) so it opens with one click.

   Separate one failure block from the next with **two** blank lines, so
   distinct failures are unmistakably distinct from each other, not just
   from the indented statements inside a single block.
4. **A final horizontal rule, then one line:** that re-running this check
   is the next step once the fix is made.

**Use Figma's own vocabulary, never CSS or code terms.** No Tailwind
classes, no CSS variable references, no `bg-[var(--x,#y)]`-style strings —
and no internal design-system shorthand either ("token," "one-off value").
Say what's true in Figma instead:

- A fill, stroke, or spacing value is either **bound to a variable** or
  **not bound to a variable** (never "one-off" or "hardcoded").
- A component instance is either a **library component** or **detached**
  (never "redrawn" or "a one-off shape").
- Text either has a **text style applied** or it doesn't (never "raw
  font settings").

So the failure text reads "this variant's fill isn't bound to a
variable — it has a fixed colour applied directly," never "uses a one-off
colour instead of the state-warning variable." The variable's own name
(`state-warning`) is fine to say — that's exactly what appears in Figma's
Variables panel, not a code term. What stays out of the default report is
implementation detail: raw hex values, Tailwind classes, CSS syntax, which
tool call surfaced the gap. That's for when it's asked for directly.

Example — the raw markdown source for a run that fails three checks,
everything else clean (shown fenced here only so the markup itself is
visible on this page; report it unfenced, letting it render):

````markdown
🔴 **NOT READY · 4 of 7 checks passed**

---

- ✅ Uses library components (not detached)
- ❌ Colours bound to variables
- ✅ Text styles applied
- ✅ Spacing bound to variables
- ✅ Variant properties clearly named
- ❌ Accessibility basics
- ❌ Behaviour notes in the description

---

**Needs fixing**

**Colours bound to variables** → Warning / Medium

> What: This variant's fill isn't bound to a variable — it has a fixed
> colour applied directly, unlike every other variant, which is bound to
> the state-warning variable.
>
> Why it matters: The fixed colour happens to match state-warning's
> current value, but it won't update if that variable's value ever
> changes.
>
> Fix: Select this variant, open its fill, and bind it to the
> state-warning variable instead of leaving a fixed colour applied.

Figma link: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-431


**Accessibility basics — Contrast** → Warning / Medium

> What: This variant's text measures 2.94:1 against its background.
> WCAG AA needs 4.5:1 for text this size.
>
> Why it matters: The text reads as low-contrast for a real share of
> users, even though it's legible enough to pass a casual glance.
>
> Fix: Swap the text colour to one that clears 4.5:1 against this
> background, or darken the background until the pairing clears it.

Figma link: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-431


**Behaviour notes in the description** → Badge (component set)

> What: The description field is empty.
>
> Why it matters: Without it, anyone building from this design has to
> guess at rules like "text truncates at one line" or "pair colour with
> text" instead of reading them.
>
> Fix: Add a short description covering when to use Badge and how it
> behaves, on the component set itself.

Figma link: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-437

---

Run the check again once that's done.
````
