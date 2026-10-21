# Token architecture — reference

What a healthy token structure looks like, so an audit has something to
compare the target system against. Example files sit next to this one:
`token-structure.example.json` (the design-side record) and
`tokens.example.css` (what code consumes).

## Three layers

| Layer | Holds | Named by | Who uses it | Example |
|---|---|---|---|---|
| **Primitive** | Raw values: every palette step, the spacing scale, radii | Ramp and step (`<family>/<step>`) | Only the semantic layer | `brand/700 = <#hex>` |
| **Semantic** | Roles, pointing at primitives | Purpose (`text/primary`, `surface/page`, `border/default`) | Designers and product code | `text/primary → neutral/900` |
| **Component** *(optional)* | Per-component decisions, pointing at semantic tokens | Component and part (`button/primary/fill`) | One component | `button/primary/fill → action/primary` |

Rules that make the layers work:

- **Primitives are hidden from designers' pickers and never used in product
  code.** In Figma: a separate collection, hidden from publishing.
- **Name primitives by role, not appearance.** `brand`, `accent`, `ink` —
  not `coral`, `amber`, `olive`. Appearance names stop being true the
  moment a second brand exists.
- **Semantic tokens never end in a number**, so a script can tell the two
  layers apart by name.
- **Add a component layer only when it earns its keep** — when one component
  genuinely needs to diverge from the shared role, or when a team needs to
  retheme one component on its own. Two layers (primitive → semantic, with
  components binding semantic tokens directly) is a valid, simpler system.
  An audit should report which one the target has, not penalise two.
- **Status colours (error, success, warning) don't theme.** They mean the
  same thing everywhere.

## Two axes: brand and mode

If the system supports more than one brand or more than one surface
treatment (light/dark, inverse sections), keep them independent:

- **Brand = which primitive values.** A brand is a mode on the primitive
  collection. Same token names, different values.
- **Mode = which surface the content sits on.** A mode on the semantic
  collection: the same `text/primary` resolves differently on a light and a
  dark surface.
- In code: one attribute picks the brand, another picks the mode
  (`<brand-attribute>`, `<mode-attribute>`). The default brand and default
  mode set no attribute.
- **Name modes by role** ("on light", "on inverse", "on brand"), not by the
  colour they happen to be.

## Generated, not typed

- **Code values are generated from a design export**, never transcribed by
  hand. A checksum recorded at export time catches copy errors.
- **CI fails if the generated files drift** from the export.
- **Notes stay human-written.** A new token needs a sentence saying what
  it's for; the generator fills in the value.

## What an audit should record about the target

1. How many layers exist, in Figma and in code — and whether they match.
   (`figma-audit.js` guesses each collection's layer from how many of its
   variables alias others.)
2. Whether primitives are reachable from designers' pickers or product code.
3. Naming: by role or by appearance; whether semantic and primitive names
   can be told apart mechanically.
4. Brands and modes: how many, how they're expressed in code, and whether
   the same token names serve all of them.
5. Source of truth: is code generated from design, design traced from
   code, or are they maintained twice by hand?
6. Gaps: categories with no tokens at all (type is the usual one).
