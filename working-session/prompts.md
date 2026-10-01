# What Mark types, stage by stage

Copy these. Keep them short; the room is listening.

## Before they join (setup)

```
Read working-session/README.md and everything it points to. The board is called "<board name>". Start Storybook in the background and tell me the URL. Then confirm you can see the board.
```

## 1 · The data (after the file arrives)

Save the file into `working-session/data/` first (drag it into the folder), then:

```
Their data is working-session/data/<file>. Read it and put the findings on the board.
```

Then drop the same file onto the prototype page in Storybook, so version 1 uses it.

## 2 · Pick one → the build brief

```
Read the board back and write the build brief.
```

Claude writes the brief in this shape, puts it on the board, and reads it out:

```
For: <the user, in their words>
So they can: <the decision>
The screen leads with: <the one thing they see first>
Built from: <the findings we kept, short>
Left out for now: <what we chose not to build, and why>
```

If the room changes it: `Change the brief: <what>`. When they agree: `Brief agreed. Build version 1.`

## 3 · Build

| Say | Claude does |
|---|---|
| `Change: <what>` | Orange sticky under the current version → makes the change → sticky goes green → logs it |
| `New version` | Starts the next version slot. Mark screenshots the page (or Claude uploads it) |
| `Show me the rows for <finding>` | Lists the rows behind it, in the chat only |
| `Undo the last change` | Reverts it and notes that in the log |

## 4 · Review

```
Read the board and write the tickets.
```

Ticket format (3–5 of them, plain, ready for Jira):

```
<Title>: <what and for whom>. Why: <the finding or sticky behind it>.
```

Then: `Finish the feedback log.` It should end with three lists: what worked, what to change next, who to test with.
