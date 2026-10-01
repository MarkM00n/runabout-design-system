# Working session — data to prototype

**Read this whole file before doing anything else in this session.** Then read
`brief.md`, `synthesis-rules.md`, `components.md` and `prompts.md`.

You are working with Mark in a live, 45-minute session with product managers.
They are watching. They hand over a piece of data; together we turn it into a
clickable prototype on the Runabout design system, and they decide at every step.
The point is to show a new way of working: AI does the making, people make the calls.

## Your rules for the day

- **Speed over polish, but never wrong.** Every number you show comes from the
  data. If you are not sure, say so on the board as a question, not as a finding.
- **Their data never leaves this laptop.** It lives in `working-session/data/`
  (git-ignored). The FigJam board gets findings only: counts, rates, row numbers.
  No names, emails or free-text comments on the board. Never commit or push their data.
- **Short replies.** Mark is talking to the room. Do the work, then say in one
  line what changed.
- **The board is the source of truth for decisions.** Before building, read it
  back (`board.py read`) and build from what the PMs put there, not from your
  own preferences.
- **Prototype rules:** `src/prototypes/WorkingSession.tsx` only. Runabout
  components and tokens, no raw hex, no new components. It is a prototype
  (see `docs/design-system-rules.md` §9), so design-sync only reports on it.

## The tools

| What | How |
|---|---|
| FigJam board | file key `tZci1rdqm67KWa55q9SLWk`. Template section "Working session". Mark duplicates it before the session and names the copy (that name is `<board>` below). |
| Board actions | `python3 working-session/scripts/board.py "<board>" <action> ...` prints a script; run it with the Figma `use_figma` tool on that file key. Actions: `findings`, `read`, `brief`, `shot`, `change`, `done`, `tickets`. |
| Data reading | `python3 working-session/scripts/read_data.py working-session/data/<file> --out working-session/out` |
| Prototype | Storybook → Prototypes / WorkingSession. Edit `CONFIG` at the top of `WorkingSession.tsx` first; change layout only when asked. Their CSV is dropped onto the page by Mark (kept in the browser only). |
| Feedback log | `working-session/feedback.md` — append every change, in order. |

## The 45 minutes

| Min | Stage | What you do |
|---|---|---|
| 0–3 | **1 Frame** | Nothing on the board. Listen. When Mark says so, note the three answers in `feedback.md` under "Frame". |
| 3–10 | **1 The data** | Run `read_data.py` on the file. Rewrite each finding title into plain English (see `synthesis-rules.md`), keep the best 6–9, edit `out/findings.json`, then run `board.py findings`. Say: "Findings are on the board." |
| 10–15 | **2 Pick one** | PMs vote and fill the cards. When Mark asks, run `board.py read`, then write the build brief (format in `prompts.md`) and run `board.py brief`. Read it out in one line each. **Do not build until Mark says the brief is agreed.** |
| 15–35 | **3 Build** | Set `CONFIG` from the brief. Tell Mark when version 1 is ready (aim: under 3 minutes). For each change Mark types (`Change: ...`): add the sticky (`board.py change <v> "..."`), make the change, mark it done (`board.py done <id>`), log it. New version every 2–3 changes. |
| 35–45 | **4 Review** | Run `board.py read`. Turn the changes and review stickies into 3–5 tickets (format in `prompts.md`), run `board.py tickets`, and finish `feedback.md`. |

## If something breaks

- **Figma tool fails:** carry on in the prototype; Mark adds stickies by hand. Retry once later.
- **read_data.py fails on their file:** read the file yourself (pandas in a scratch script), and write `out/findings.json` in the same shape by hand.
- **Votes read as 0:** the PMs used something other than stamps. Ask Mark which findings won.
- **Screenshot upload fails:** Mark pastes the screenshot onto the slot (Cmd+Ctrl+Shift+4, click the board, Cmd+V).
