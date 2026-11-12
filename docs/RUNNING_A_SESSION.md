# Running a session

Open a campaign and choose **During Session**. The session number in its toolbar
controls the party-action log, journal, history, and summary. Set it before
capturing events. Session Prep still holds the agenda, planned plot points,
scene scripts, NPC knowledge, and other preparation; the journal records what
actually happened or what the DM needs to revisit.

## During play

**Log player action** records what the party did. Its save keeps the session
number selected, and failed saves retain the text for retry. Linking World
Stories is optional; it does not make anything happen automatically.

**Session journal** captures other information without labeling it as a player
action:

- **DM note:** private reminders, rulings, mysteries, or observations.
- **NPC action / reaction:** what an NPC said or did, and how they reacted.
- **World change:** something in the setting or off screen that happened.
- **Follow-up:** something to prepare, decide, or check before the next game.

Each kind offers a short prompt and **Add writing prompts** can insert an editable
outline. Only a description is needed beyond the selected session. You may link
a plot point, NPCs, and an earlier party action or journal entry using **In
response to**. The NPC link is a reference; recording a reaction does not edit
the NPC's canonical record.

**Save journal entry** writes to campaign YAML. Unfinished journal text is also
recoverable in this browser, separated by world, campaign, and session. It is
not synchronized to other devices until saved. Storage failures are indicated;
server save failures leave the draft available for retry. **Edit entry** changes
a saved record; **Discard journal draft** leaves saved records unchanged. Search
the current journal by text or linked NPC name. Follow-ups can be marked done or
reopened without changing story outcomes.

## Turning events into next steps

Use **Create consequence** beside a recent party action or saved journal entry.
The dialog shows the source and asks:

1. What happens next?
2. Which plot point should hold the consequence?
3. When or under what condition might it happen?
4. Which existing plot points could follow?

Saving creates a **pending** consequence and links it back to its source. It does
not activate a scene, tick clocks, alter NPC records, or advance the current plot
point. Activate, resolve, or prevent consequences yourself during play. If there
is no suitable plot point yet, save a follow-up and add a rough plot point in the
planner when ready.

For example: record the party's lie, then a guard's reaction linked to that lie,
then a pending consequence that the captain may question the party at the next
watch change. This preserves the chain without predetermining how the players
respond.

## After play

**Session summary** in the live toolbar opens the existing recap editor for that
session. Write an account in your own words or choose **Add session log outline**:

- Party actions, NPC reactions, and world changes go into the summary outline.
- DM notes, linked consequences to review, and open follow-ups go into
  **Private DM notes / next session**.
- Existing authored text is retained; the outline is appended for editing.
- No prose is inferred beyond the recorded entries, and nothing is published to
  players automatically.

**Save recap** stores the summary and notes together. Save errors are shown
inside the editor and keep the text available. **Session history** displays
recaps, party actions, and journal entries, including sessions with only DM notes.
**Close out** reviews party actions and their World Story connections. Both
dialogs work directly from During Session as well as the dashboard.

## Before the first game

Prepare a small set of plot points and scene scripts, choose an initial current
plot point, and save a Session Prep agenda with useful NPC/location references.
Practice recording a note, a reaction, and a consequence in a test campaign, then
save and reopen a recap. Existing backup/YAML tools remain the way to copy world
data. Journal records and recaps live with the campaign; no separate journal
database or external service is required.

## Developer checks

- Backend: `.venv/bin/python -m pytest -q` from the repository root.
- Frontend helpers: `npm run test:session-journal` and `npm run test:dashboard`.
- With the frontend running on port 5191, use `npm run test:session-journal-ui`,
  `npm run test:dashboard-ui`, and `npm run test:scene-script-ui`. The browser
  checks intercept API calls and never write authored world files. Set
  `WORLD_BUILDER_TEST_URL` and `PLAYWRIGHT_BROWSERS_PATH` when needed.
- Lint/build: `npm run lint`, the test ESLint configuration, and `npm run build`.
