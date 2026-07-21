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

A design must satisfy all four checks below to be ready to build from.

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

## 2. System colours, sizes, and spacing — no one-off values

Every fill, stroke, text color, gap, padding, and corner radius must trace
to a published Figma variable — not a raw, detached value that happens to
look right. An unbound value can't become a token; it can only become a
guess about which token was intended.

- **Check:** `get_variable_defs` on the node. Every visual property that
  should be systematized (color, spacing, radius) needs a variable name
  attached, not just a literal hex or pixel value with no binding.
- **Fail looks like:** a fill sitting at `#b91c2a` with no bound variable,
  one pixel off the real `state-error` token and indistinguishable from it
  by eye.

## 3. Clearly named variants and options

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

## 4. Behaviour notes in the component's description field

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

All four must pass. A single failing criterion is enough to block —
report which one, in plain language, before writing any code.

## How to report results

This check's audience is a designer, not an engineer — report every run in
this shape, every time:

1. **Verdict first, on its own line:** `READY` or `NOT READY`.
2. **All four checks, every run**, each with a status marker:
   - ✓ (green) — passes cleanly.
   - ! (amber) — passes, but something's worth flagging (e.g. correct today
     but fragile, or a borderline case).
   - ✗ (red) — fails.
3. **For every check that isn't ✓:** say what's wrong in plain words, name
   the specific variant or layer it's on, and link directly to that node in
   Figma (`https://www.figma.com/design/<fileKey>/<fileName>?node-id=<id>`,
   with the node's `:` swapped for a `-`) so the designer can open it with
   one click.
4. **Close with one line:** what needs to change, plus that re-running this
   check is the next step once it's done.

**No code syntax anywhere in this report** — no Tailwind classes, no CSS
variable references, no `bg-[var(--x,#y)]`-style strings. Translate to
plain language instead: "uses a one-off colour instead of the
state-warning variable," not the class or binding that produced it.
Technical detail (the exact token name, the raw hex, which tool call
surfaced it) is for when it's asked for directly — keep it out of the
default report.

Example — a run that fails check 2 on one variant, everything else clean:

```
Verdict: NOT READY

✓ Built from real design system components
✓ Clearly named variants and options
✓ Behaviour notes in the description field
✗ System colours, sizes, spacing — no one-off values
   The Warning/Medium badge uses a one-off colour instead of the
   state-warning variable every other variant uses. It happens to match
   today, but won't follow if state-warning changes again.
   → Warning / Medium: https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=248-431

What to change: rebind Warning/Medium's fill to the state-warning
variable, the same binding every other variant already has. Re-run this
check once that's done.
```
