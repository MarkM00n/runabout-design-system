# Fix Validation Errors

Use this prompt after running `/prompts/validate-component.md` and getting
back a report with one or more failures. Provide that report (or a
description of the specific failures) as input.

---

You are fixing failures found by a design-system validation pass against
`/docs/design-system-rules.md`. Read that file if you haven't already — the
fix for each failure category should follow the pattern it documents, not
just make the specific symptom go away.

## Ground rules

- **Fix the cause the rule describes, not just the visible symptom.** If a
  dimension is off by exactly 12.5%, that's almost certainly the root
  `18px` font-size scaling a Tailwind rem-based utility — the fix is
  switching to an arbitrary px value or a px-based token, not nudging the
  number until it looks right.
- **One failure at a time when failures are unrelated.** If the report lists
  a token-compliance issue and an unrelated accessibility issue, fix and
  verify each independently rather than batching changes together — makes
  it possible to tell which fix addressed which failure if something goes
  wrong.
- **Don't introduce a new token or a new arbitrary value without checking
  Figma first.** A validation failure like "this hex isn't a token" should
  be resolved by finding out what it *should* be (inspect the real Figma
  binding), not by inventing a plausible-looking token name for whatever
  value happens to already be in the code.
- **Re-verify after every fix — don't assume the fix worked.** The same
  method the validation pass used to find the failure (computed-style check
  against a live render, not a code read) is what confirms it's actually
  fixed. A number that "should" be 24px now needs to actually measure 24px.

## Process

1. **Restate each failure** from the input report as a concrete, checkable
   claim ("Checkbox's large box renders at 27px, should be 24px" — not
   "Checkbox has a sizing issue").
2. **For each failure, apply the fix implied by its rule category:**
   - *Token compliance*: replace the raw/incorrect value with the correct
     token, or (if no token exists for a legitimately unbound Figma value)
     an arbitrary px value with a comment explaining why it's not tokenized.
   - *Accessibility*: fix the specific gap (missing `disabled` attribute,
     `:focus` instead of `:focus-visible`, a hidden-not-sr-only native
     input, missing `aria-hidden` on a decorative element, etc.) without
     changing unrelated styling.
   - *Storybook coverage*: add the missing story, barrel export, autodocs
     tag, or backdrop decorator — matching the pattern of existing stories
     in the same component's file rather than inventing a new structure.
   - *Design parity*: this is almost always a token-compliance fix in
     disguise (wrong token, wrong px, wrong arbitrary value) — trace it back
     to the actual cause rather than overriding the rendered output with a
     one-off style patch.
3. **Rebuild and lint** (`npm run build`, `npm run lint`) after each fix or
   batch of related fixes. Don't let errors accumulate silently.
4. **Re-run the specific computed-style check that originally caught the
   failure** (start/reuse a Storybook dev server, re-measure via Playwright
   or the Chrome extension) and confirm the number now matches. If it still
   doesn't match, don't move on — the fix was wrong or incomplete.
5. **Check for regressions in sibling states/sizes.** A fix scoped to one
   variant (e.g. `large`) can accidentally also be the one used by `small`
   if they were sharing a style object — re-check both after any fix, not
   just the one that originally failed.
6. **Clean up before finishing:** kill any Storybook dev server you started,
   remove temporary verification scripts, and don't leave `storybook-static`
   or other build output staged for commit.

## Output

Summarize what was fixed, using the same "before → after, re-verified"
format the rest of this system's commit history already follows: what was
wrong (with the specific wrong value), what changed, and the specific
re-measured value confirming it's correct now. If a failure from the input
report turned out not to be fixable in scope (e.g. it requires a Figma file
change, like binding a currently-raw value to a variable), say so explicitly
rather than silently dropping it — that becomes a follow-up, not a
resolved item.
