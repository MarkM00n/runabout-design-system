# Ready for AI — Figma design intake check

A design that's ambiguous at the Figma layer doesn't become unambiguous by
being handed to a code generator — it just moves the guessing downstream,
into the component. Every rule in `docs/design-system-rules.md` assumes the
source Figma node already gives an honest, checkable answer to "what token
is this," "what is this called," and "how does this behave." When it
doesn't, building anyway means silently inventing the missing answer —
which is exactly how a mismatched value or an undocumented behavior ships
without anyone deciding it should.

This check runs **before** any component code is generated from a Figma
design, not after. Catching a gap here costs a Figma edit; catching the
same gap once code exists costs a re-generation plus whatever already
consumed the wrong output.

A design must satisfy all six checks below to be ready to build from.

## 1. Built from real design system components

The design must reuse existing library components (buttons, inputs, icons,
other already-built pieces) as real instances wherever it needs something
the system already has — not redrawn shapes that merely look the part. A
rectangle-plus-text standing in for a `Button` instance means the design
can drift from the real component without anyone noticing, and it gives a
code generator nothing to trace back to.

- **Check:** inspect the node's descendant tree (`get_context_for_code_connect`
  or `get_metadata`) for `INSTANCE` nodes pointing at published components
  wherever the design visually reuses something the system already ships.
  An atomic, foundational design (nothing in the library to reuse yet) passes
  this check by default — there's nothing to have redrawn instead.
- **Fail looks like:** a "button" that's actually a plain frame with a fill
  and a text layer, sitting next to real `Button` instances elsewhere in the
  same file.

## 2. Colours — no one-off values

Every fill, stroke, and text colour must trace to a published Figma
variable — not a raw, detached value that happens to look right. An
unbound colour can't become a token; it can only become a guess about
which token was intended.

- **Check:** `get_variable_defs` on the node — every colour that should be
  systematized needs a variable name attached, not just a literal hex value
  with no binding.
- **Fail looks like:** a fill sitting at `#b91c2a` with no bound variable,
  one pixel off the real `state-error` token and indistinguishable from it
  by eye.

## 3. Sizes — no one-off values

Every icon size, control height, or other dimension the system already has
a scale for must trace to a published variable — not a literal pixel value
picked by eye.

- **Check:** `get_variable_defs` on the node — sized dimensions that should
  be systematized need a variable name attached, not just a literal pixel
  value with no binding.
- **Fail looks like:** a control sized at a literal `34px` when the
  system's scale only defines `32px`/`40px` steps — an in-between value
  with no token behind it.

## 4. Spacing — no one-off values

Every gap, padding, and margin must trace to a published spacing
variable — not a literal pixel value.

- **Check:** `get_variable_defs` on the node — gap/padding values need a
  variable name attached, not just a literal pixel value with no binding.
- **Fail looks like:** a badge padded at a literal `15px` when the system's
  spacing scale only defines `8px`/`16px` steps.

## 5. Clearly named variants and options

Component property names and their value options must describe intent —
`variant: success`, `size: small` — not Figma's unedited defaults
(`Property 1`, `Variant 2`) or ambiguous shorthand that only makes sense to
whoever drew it. A generator (or a future engineer) has to turn these names
into a public API; an unclear name here becomes an unclear prop forever.

- **Check:** `get_context_for_code_connect`'s property definitions — every
  component property and every value in its variant options should read as
  a real word describing what it does.
- **Fail looks like:** a component set with a property literally named
  `Property 1` and values `Option A` / `Option B` instead of, say,
  `variant: neutral | success | warning | error`.

## 6. Behaviour notes in the component's description field

The component (or component set)'s description field must say something
about non-visual behavior — interaction rules, truncation, when to use it
and when not to, anything an engineer can't infer from looking at the
static frame. A blank description, or one that just restates the
component's name, leaves that judgment call to whoever builds it.

- **Check:** the component description returned by `get_design_context` /
  `get_context_for_code_connect` (visible in Figma's own inspect panel as
  the component's description).
- **Fail looks like:** an empty description field, or one that just says
  "Badge component."

## Verdict

All six must pass. A single failing check is enough to block — report
which one, in plain language, before writing any code.

## How to report results

This check's audience is a designer, not an engineer — report every run in
this exact shape:

1. **Verdict line, on its own line, with a count:**
   `READY · 6 of 6 checks passed` or, e.g.,
   `NOT READY · 5 of 6 checks passed`.
2. **All six checks, every run, as a clean list** — a status marker and the
   check's name only, nothing else on the line:
   - ✓ (green) — passes cleanly.
   - ! (amber) — passes, but something's worth flagging (e.g. correct today
     but fragile, or a borderline case).
   - ✗ (red) — fails.
3. **A "Needs fixing" section underneath, one block per failing check**
   (skip this section entirely when the verdict is `READY`). Each block:
   - **Heading:** the check's name and which variant or layer it's on.
   - **What:** what's wrong, in plain words.
   - **Why it matters:** the concrete consequence of leaving it as-is.
   - **Fix:** the exact Figma-side change that resolves it.
   - **Figma link:** a direct link to that node
     (`https://www.figma.com/design/<fileKey>/<fileName>?node-id=<id>`,
     with the node's `:` swapped for a `-`) so it opens with one click.

   Separate each block from the next with a blank line — when there's more
   than one failure, they must read as distinct blocks, never run together.
4. **Close with one line:** that re-running this check is the next step
   once the fix is made.

**No code syntax anywhere in this report** — no Tailwind classes, no CSS
variable references, no `bg-[var(--x,#y)]`-style strings. Translate to
plain language instead: "uses a one-off colour instead of the
state-warning variable," not the class or binding that produced it.
Technical detail (the exact token name, the raw hex, which tool call
surfaced it) is for when it's asked for directly — keep it out of the
default report.

Example — a run that fails two checks, everything else clean:

```
Verdict: NOT READY · 4 of 6 checks passed

✓ Built from real design system components
✗ Colours — no one-off values
✓ Sizes — no one-off values
✓ Spacing — no one-off values
✓ Clearly named variants and options
✗ Behaviour notes in the description field

Needs fixing

Colours — no one-off values → Warning / Medium
What: This variant uses a one-off colour instead of the state-warning
variable every other variant uses.
Why it matters: It happens to match today, but won't follow if
state-warning changes again.
Fix: Rebind Warning/Medium's fill to the state-warning variable, the
same binding every other variant already has.
Figma link: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-431

Behaviour notes in the description field → Badge (component set)
What: The description field is empty.
Why it matters: Without it, anyone building from this design has to
guess at rules like "text truncates at one line" or "pair colour with
text" instead of reading them.
Fix: Add a short description covering when to use Badge and how it
behaves, on the component set itself.
Figma link: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-437

Run the check again once that's done.
```
