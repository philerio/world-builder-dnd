# Session-focused home dashboard

The home dashboard leads with the selected campaign, session shortcuts, the
current plot point, location references, items needing attention, quick capture,
and recently opened records. Entity counts remain in the collapsed **World
overview** section below these tools.

## Campaign and session shortcuts

The dashboard remembers the last selected or visited campaign for each world in
this browser. Without a valid remembered campaign, it prefers an active campaign,
then planned and paused campaigns, before completed campaigns. Selecting or
opening a campaign does not change its authored status.

**Resume campaign** opens the existing campaign dashboard. **Prepare Session N**
and **During Session N** deep-link into its existing workspaces. Session numbers
use the same shared rules as the campaign page: prep uses one greater than the
highest session recorded in actions, journal entries or recaps; live play uses the latest
unreviewed action's session, then the latest recorded session, then session one.
Saved preparation sheets are loaded for the requested session. No calendar dates
or automatic story progression are inferred.

The campaign's **During Session** view includes a separate Session journal for
DM notes, NPC actions/reactions, world changes and follow-ups, plus a direct
Session summary shortcut. Journal-only sessions also appear in history and
session numbering. See [Running a session](RUNNING_A_SESSION.md) for capture,
consequence creation and recap behavior.

**Needs attention** shows unreviewed party actions, active world/plot clocks, and
pending or active consequences. The links open the existing closeout dialog or
the relevant campaign sections. Clock previews do not advance clocks.

## Location and recent references

The location card uses a location linked to the current plot point unless the DM
chooses a dashboard location. That choice is a browser-local convenience; it
does not establish the party's canonical position. The card includes recorded
notes, explicitly linked maps, and NPCs linked to the location or its current
scene. DM notes retain their label.

Recently opened entity drawers, campaign workspaces, and maps are remembered for
each world, with the latest eight distinct IDs retained. Deleted records are
omitted when displayed. Preferences and recents do not synchronize between
devices. They remain usable for the current visit when browser storage is
unavailable.

## Quick capture

Party actions are saved to the selected campaign's existing story, optionally
with a session number and current plot point. They start unreviewed. Saving
reloads the campaign first and preserves its other fields and story state.
Capturing an action does not resolve beats, create consequences, or tick clocks.
Legacy `StoryContent` is protected: those campaigns can capture scratchpad ideas
but cannot add structured party actions from this card.

Ideas go to the existing DM Scratchpad with status `inbox`; the first line forms
the title and the entire text is retained. They are not promoted to canon.
Unfinished captures are recoverable browser-local drafts, separated by world,
campaign, and capture type. Switching types retains each draft. Clearing a draft
requires confirmation. Failed saves retain the text.

## Development checks

Run `npm run test:dashboard` from `frontend` for selection, session rules, story
preservation, attention filtering, and preference tests. For browser checks,
start the dev server on port 5191 and run `npm run test:dashboard-ui`. The same
Playwright installation described in [EDITING_WORKFLOWS.md](EDITING_WORKFLOWS.md)
is used. API data is mocked, so no campaign data is written. Screenshots go to
the temporary `world-builder-dashboard-checks` directory.
