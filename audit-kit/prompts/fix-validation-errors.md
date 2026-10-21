# Fix validation errors

For after the audit, when someone asks for fixes. Input: a report from
`prompts/validate-component.md` or the code audit.

---

Read `rules/design-system-rules.md` §6 ("Where fixes belong") before
touching anything.

## Ground rules

- **Design faults are not fixed in code.** Report what to change in Figma
  and stop. A code workaround only on explicit request, labelled as one.
- **Fix the cause the rule names, not the symptom.** A size that's off by a
  constant ratio is a scale problem, not a number to nudge.
- **Don't invent a token.** If no token fits, check the design file; if
  nothing there fits, it's a system gap — record it.
- **One unrelated failure at a time**, so each fix can be traced.
- **Re-measure after every fix** with the same method that found it — a
  computed value, not a code read.
- **Check siblings.** A fix to one size or state can move another that
  shared the style.

## Process

1. Restate each failure as a checkable claim ("the small size renders at
   27px; the design says 24px").
2. Classify it: design, code or system.
3. Fix code faults; write up design and system faults for their owners.
4. Build and lint after each fix or batch of related fixes.
5. Re-run the check that caught it and record the new value.

## Output

Before → after → re-measured value, per fix. Anything not fixable in code
is listed as a follow-up with its owner, not dropped.
