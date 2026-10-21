# Design system audit kit

A starting point for auditing a design system in Figma and in code: what
exists, what's drifted, what to fix first, what to keep. Read-only by
design — it measures, it doesn't change anything.

Taken from a working Figma-to-code pipeline and stripped back to the parts
that travel. It's not a migration tool and it won't understand every stack;
expect to adjust the config and rules for each codebase.

## What's here

| Path | What it does |
|---|---|
| `scripts/audit-code.mjs` | Scans a codebase against its own tokens. Finds hardcoded colours, spacing, radius and type (and says whether each matches a token, nearly matches one, or matches nothing); undeclared tokens; tokens redeclared outside the token files; primitives used in product code; components defined in more than one place or shadowing the system's; how often each system component is imported; static accessibility smells. Writes `audit-summary.md` and `audit-report.json`. No dependencies. |
| `scripts/figma-audit.js` | Plugin API script for one Figma page or node. Counts detached instances, unbound colours/spacing/radius, text with no style, default property names, empty descriptions, interactive components with no focus state, mode pins on fill-less layers, instance paint overrides, and role mismatches (e.g. a stroke bound to a text variable). Inventories variable collections with a primitive/semantic guess, styles, and library vs local component use. |
| `scripts/contrast.mjs` | WCAG contrast for a pair of colours, or a list of token pairs resolved from a CSS file, including per-mode blocks. |
| `audit.config.example.json` | Config for `audit-code.mjs`. |
| `rules/design-system-rules.md` | The code-side rules, each with why it exists. |
| `rules/figma-readiness.md` | The seven design-side checks and how to report them to designers. |
| `tokens/` | Reference token architecture (primitive → semantic → optional component; brand and mode as separate axes) with example JSON and CSS. |
| `CLAUDE.md` | Instructions for Claude when it runs an audit: read-only, measured vs inferred, design vs code vs system. |
| `skills/ds-audit/SKILL.md` | A skill that runs the whole audit end to end. |
| `prompts/` | Copy-paste prompts: audit a codebase, audit a Figma library, validate one component, fix errors afterwards. |
| `ci/design-system-audit.yml` | Example GitHub Actions job: runs the code audit on every PR, report-only. |
| `AUDIT-REPORT-TEMPLATE.md` | The one-page report. |

## Running it against another codebase

The kit doesn't need to live inside the repo being audited. Node 18+.

1. **Copy the kit** somewhere on the machine doing the audit.
2. **Write a config.** Copy `audit.config.example.json` to
   `audit.config.json` and replace every `<placeholder>`:
   - `tokenFiles` — the CSS and/or JSON files that hold token values. Without
     them, every colour reads as off-system.
   - `componentDirs` and `designSystemPackages` — where the system's
     components live and how products import them (package name or path
     alias). Without them, there's no adoption or drift data.
   - `surfaces` — how findings are grouped (apps, squads, products).
   - `primitivePattern` — a regex that matches primitive token names, if
     they can be told apart by name.
3. **Run the code audit:**
   ```
   node audit-kit/scripts/audit-code.mjs --root <path/to/repo> --config audit.config.json --out audit-output
   ```
   Check the first line: if tokens loaded is 0, or the summary says no
   system imports were found, the config is wrong.
4. **Run the Figma audit.** In a Claude session with the Figma connector,
   paste `scripts/figma-audit.js` as a `use_figma` call (set
   `CONFIG.pageName` first), one page per call, pages in parallel. Or use
   `prompts/audit-figma.md`.
5. **Check contrast** for the pairs that matter:
   ```
   node audit-kit/scripts/contrast.mjs --pairs pairs.json --tokens <path/to/tokens.css>
   ```
6. **Verify, then report.** Open a few findings per check to confirm them,
   then fill in `AUDIT-REPORT-TEMPLATE.md`.

Or hand the whole thing to Claude: put `CLAUDE.md` in the workspace,
install `skills/ds-audit/` as a skill, and ask for an audit.

## Adapting it to a new stack

- **Token format.** CSS custom properties and JSON (plain or W3C
  `$value`) are read directly. For Sass variables, JS theme objects or
  platform files, export the tokens to JSON first, or add a reader in
  `loadTokens()`.
- **Utility CSS.** Tailwind arbitrary values (`p-[13px]`) are checked by
  default. `tailwind.flagDefaultScale` flags default-scale utilities — turn
  it on only if the system's spacing isn't the framework's scale.
- **CSS-in-JS.** Static style objects (`padding: 12`) are checked; values
  built at runtime (template literals, theme functions) aren't resolved.
  Expect undercounting there and say so in the report.
- **Other component frameworks.** Component inventory looks at PascalCase
  `.tsx/.jsx/.vue/.svelte` files. For anything else, adjust `include` and
  the inventory block at the end of `scanFile()`.
- **Native mobile.** The code scan won't help much; the Figma audit and the
  rules still apply.
- **Rules.** Keep the "why" line when you change a rule — it's what lets
  someone judge an edge case later. Delete rules that don't apply (e.g. §3
  modes) rather than leaving them to be ignored.
- **Figma naming.** Set `CONFIG.roleRules` and `interactivePattern` in
  `figma-audit.js` to the file's own naming before trusting those checks.

## Limits

- Both scans are static. They read source and bindings, not rendered
  output. Anything that depends on the cascade, layout or a real backdrop
  needs a render and a person looking at it.
- "Matches a token" findings are the cheapest fixes and the clearest signal.
  "Off-system" findings need the design file to decide; they're often the
  system's gaps, not the team's mistakes.
- Counts rank work. They don't measure people. Present them per surface,
  not per author.
