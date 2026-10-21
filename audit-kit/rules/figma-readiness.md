# Figma readiness — the design-side checks

Seven checks that say whether a Figma component (or a whole file) gives an
honest, machine-readable answer to "what variable is this, what is it
called, how does it behave". In a build pipeline these gate code
generation. In an audit they measure how far the design file can be trusted
as a source of truth.

`scripts/figma-audit.js` runs checks 1–5, 7 and part of 6 across a page and
returns counts and node ids. The rest are read by hand.

Placeholders: `<file-key>` (the Figma file), `<node-id>`.

## How to read Figma

- **Use live Plugin API reads** (`use_figma`), not summaries. Merged
  "design context" output and aggregate variable lists blur variants
  together: a binding on one variant gets reported as if all had it.
- **Walk every variant individually.** One unbound variant fails the set;
  report it against that variant.
- **Confirm you've seen the whole file.** Metadata calls can under-report
  pages. Cross-check with `figma.root.children` before calling anything
  missing.
- **Read `paint.opacity`, not just `paint.color`.** A bound fill at 0%
  opacity is a deliberate ghost, not a solid colour.
- **Screenshots of a single node composite against a fake white matte.**
  Re-take with the real backdrop before calling anything "washed out".

## The seven checks

1. **Library components, not detached.** Anything the system already has
   (buttons, inputs, icons) is a real instance. *Detached = stops receiving
   changes.* If no suitable component exists in the libraries added to the
   file, that's a system gap, not an instance failure — report it as one.
2. **Colours bound to variables** (or styles) on every fill, stroke and
   text colour. Also:
   - *Role match:* the variable's namespace fits the property — a stroke
     bound to a text-colour variable passes "is it bound" and is still
     wrong.
   - *Mode pins on surfaces only:* a variable mode set on a layer with no
     fill recolours the ink, never the background, and code can't
     reproduce it.
   - *Instances stay instances:* an instance whose fills and labels are
     overridden is a component in name only.
3. **Text styles applied** to every text layer. Matching values with no
   style is a coincidence, not a connection.
4. **Spacing bound to variables** — padding always; gap only when there are
   two or more children.
5. **Variant properties clearly named.** `size: small`, not `Property 1` /
   `Option A`.
6. **Behaviour notes in the description.** When to use it, when not,
   truncation, interaction — anything a static frame can't show. Empty, or
   just the component's name, fails.
7. **Accessibility basics (WCAG 2.2 AA):**
   - Text contrast 4.5:1 / large 3:1 (SC 1.4.3) — computed from resolved
     values in the node's mode context.
   - Non-text contrast 3:1 for boundaries and focus (SC 1.4.11).
   - Touch target ≥ 24×24px (SC 2.5.8).
   - A focus state exists on every interactive component (SC 2.4.7).

## Reporting to designers

The audience is a designer. Use Figma's vocabulary, not code's:

- "**bound to a variable** / **not bound to a variable**" — never
  "hardcoded" or "one-off".
- "**library component** / **detached**" — never "redrawn".
- "**text style applied** / **no text style**".

Shape of a report:

```
🔴 NOT READY · 5 of 7 checks passed

- ✅ Uses library components
- ❌ Colours bound to variables
- ...

Needs fixing

Colours bound to variables → <Component> / <Variant>
> What: this variant's fill has a fixed colour, not a variable.
> Why it matters: it won't change when the variable does.
> Fix: bind the fill to <variable name>.
Figma link: https://www.figma.com/design/<file-key>/?node-id=<node-id with - for :>
```

Render it as real markdown, not inside a code block. One block per failing
check, each with a direct node link.
