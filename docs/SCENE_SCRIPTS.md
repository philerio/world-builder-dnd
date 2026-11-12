# Scene scripts

Open a campaign dashboard and find a Plot Point. **Write scene script** opens its
existing editor. For a plot point that already has a script, use the edit icon.
The script is optional and does not replace Description, What may happen, checks,
NPC knowledge, or consequences.

- **Add paragraph** writes narration or read-aloud descriptions. Blank lines keep
  paragraph breaks.
- **Add dialogue** writes a speaker's lines. Choose a suggested NPC name or type
  any name, such as “Left guard.” A named world NPC is not required.
- **Add DM note** writes private reminders or possible responses, labeled DM only
  in the reading view.

Use a section's up/down arrows to change its position or its remove button to
delete it from the draft. The type selector changes the section's presentation.
**Preview scene script** shows the current draft without saving; **Continue
writing** returns to editing. **Save changes** saves the plot point and its
script together. Cancel discards the draft. If saving fails, the editor and text
stay open for correction or retry.

**Read scene script** opens a focused reading dialog. It is available in the
planner, for selected plot points in Session Prep, and for the current plot point
During Session. Previous/Next scene moves through scripted plot points by their
existing Order, retaining saved list order for ties/unordered scenes. Reading
never changes the current plot point, its status, clocks, or player actions.

The reader uses a wider text column with spaced paragraphs, speaker-labeled
dialogue, and shaded private notes. Blank lines separate paragraphs; single line
breaks stay within a paragraph. The scene selector, close button, scene counter,
and navigation stay visible while the text scrolls. Switching scenes starts at
the top, and the dialog keeps a consistent height. On phones, navigation uses
compact arrow buttons to leave more room for reading.

**Show DM notes** controls reminders in the reading dialog only. This is a DM
reading aid, not a player publication or access-control mechanism. No text is
sent to the combat app or player display. Script text is rendered as text, not
executable HTML.

Scripts persist in campaign YAML under `story.beats[].scene_script`. Each block
has a stable ID, a kind (`narration`, `dialogue`, `dm_note`), text, and an optional
speaker name. Blank text and unnamed speakers are permitted for rough drafts;
block IDs must be nonempty and unique within a plot point. Older campaigns and
the original `StoryText`, `StoryEntityLink`, and `StoryContent` models remain
compatible.

Verification: run the Python tests with `.venv/bin/python -m pytest -q` from the
repository root. With the frontend running at `http://127.0.0.1:5191`, run
`npm run test:scene-script-ui` from `frontend` (set `WORLD_BUILDER_TEST_URL` for
another address and `PLAYWRIGHT_BROWSERS_PATH` for a custom browser install).
Browser tests intercept API requests and never edit authored campaign data.
