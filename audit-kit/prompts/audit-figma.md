# Audit a Figma library

Paste into a Claude session with the Figma connector. Fill in the
placeholders.

---

Audit the Figma file `<file-key>` (and product file `<product-file-key>`,
if given). Read-only — make no changes in Figma. Load the `figma-use` skill
first and read `audit-kit/rules/figma-readiness.md`.

1. **List pages** in one read-only call. Tell me which pages hold the
   library (components, foundations) and which are working or archive
   pages. Ask me if it's unclear.
2. **Set the role rules.** Look at the variable names first and adjust
   `CONFIG.roleRules` in `audit-kit/scripts/figma-audit.js` to match this
   file's naming.
3. **Run the script** once per library page, all pages in parallel, with
   `CONFIG.pageName` set. Set `includeVariables: true` on one call only.
4. **Token structure.** From the `variables` output, describe the layers
   (primitive, semantic, component), modes and brands, and compare them
   with `audit-kit/tokens/token-architecture.md`.
5. **Verify.** Open three findings per check and confirm them. Note false
   positives.
6. **Component readiness.** For the five most-used components, run the
   seven checks in `figma-readiness.md` in full, variant by variant.
7. **Write** `<audit-output>/figma-findings.md`: counts per check per page,
   the ranked problems with node links, what's worth keeping, and what you
   couldn't check.

Use Figma's words: "bound to a variable", "detached", "text style applied".
