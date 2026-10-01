# Rehearsal and day-of checklist (for Mark)

## One-off setup (do once, before the first rehearsal)

- [ ] Python can read data: in the Code tab ask Claude to run `python3 -c "import pandas, openpyxl"`. If it fails: `pip3 install --user pandas openpyxl`.
- [ ] Figma is connected to Claude Code in the desktop app, and Claude can read the board file `tZci1rdqm67KWa55q9SLWk`.
- [ ] `npm install` has been run in the repo, and `npm run storybook` starts.

## Rehearsal (twice, timed, 45 minutes)

1. In FigJam, duplicate the "Working session" section and name the copy (e.g. "Rehearsal 1").
2. New Code tab session on the Runabout folder. Paste the setup prompt from `prompts.md`.
3. Put `working-session/rehearsal/mock-bookings.csv` into `working-session/data/`. Run the stages from `prompts.md` with a timer.
4. Play the PMs yourself: add a few stickies, **use the stamp tool (+1) for votes**, fill the pick-one cards, edit the problem sentence.
5. Write down where it was slow. After rehearsal 1, fix those. Rehearsal 2 should land inside 45.

**Check specifically in rehearsal 1**
- [ ] Stamps are counted as votes by `board.py read` (not testable without a real person stamping).
- [ ] Screenshot upload into a version slot works from your Mac. If not, paste by hand (Cmd+Ctrl+Shift+4, click the slot, Cmd+V).
- [ ] Version 1 is on screen within 3 minutes of "Brief agreed".

## On the day

**30 minutes before**
- [ ] Brief pasted into `brief.md`; anything Julia said added under Notes.
- [ ] Fresh board copy, named for the day. Board open in one browser tab, Storybook in another.
- [ ] `working-session/data/` empty; `feedback.md` reset from git.
- [ ] Setup prompt run; Claude has confirmed the board and Storybook.
- [ ] Notifications off. Share only the browser window and the Claude app.

**Opening line**
"Here's how this works. You'll give me the data, AI does the reading and the making, and you make every call: what matters, what we build, what changes. We'll leave with a prototype and the tickets for what's next."

**Closing line**
"That's 45 minutes from your data to something you can click, and every decision on it was yours. In a normal week this is where we'd put it in front of a building manager."

## After

- Delete their data from `working-session/data/` and check `git status` shows nothing from it.
- Keep the board; send them the link if they ask.
