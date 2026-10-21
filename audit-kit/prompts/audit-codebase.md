# Audit a codebase

Paste into a Claude session that has the target repo and this kit
available. Fill in the placeholders.

---

Audit the design system usage in `<repo-path>`. Read-only — don't change
anything in the repo. Write everything to `<audit-output>`.

Read `audit-kit/CLAUDE.md` and `audit-kit/rules/design-system-rules.md`
first.

1. **Inventory.** Find the token files, the design system's components,
   and every app or package that consumes them. Tell me how each consumes
   the system (package import, path alias, copied files). Don't guess —
   show the evidence (file paths, import lines).
2. **Configure.** Copy `audit-kit/audit.config.example.json` to
   `<audit-output>/audit.config.json` and fill it in from the inventory.
   Group surfaces as: `<how we split products — apps, squads, domains>`.
3. **Run** `node audit-kit/scripts/audit-code.mjs --root <repo-path> --config <audit-output>/audit.config.json --out <audit-output>`.
   If tokens loaded is 0 or no design-system imports are found, fix the
   config and re-run before going further.
4. **Verify.** For each of the five biggest checks, open three findings
   and tell me whether the script is right. Report the false-positive rate
   you saw.
5. **Contrast.** Write the key text/surface and boundary/surface pairs to
   `<audit-output>/pairs.json` and run `audit-kit/scripts/contrast.mjs`.
6. **Summarise** in `<audit-output>/code-findings.md`: what exists, what's
   broken (ranked), what's worth keeping, and what you couldn't check.

For every finding, say how it was found (script, render, read) and whether
the fault is in design, code or the system.
