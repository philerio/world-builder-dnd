# Codex Instructions — world-builder-dnd

## What this repository is

This is Patrick's **Family-Friendly 5e Campaign / World Builder** application. It is intended to be a general-purpose campaign and world database for D&D-style campaigns, with particular emphasis on making the DM's world, story, NPCs, maps, lore, events, and campaign state easy to manage during preparation and play.

The current world used for development is **Elligaesia**. The application contains campaign/world data as structured entities and exposes them through a Python backend and React/TypeScript frontend.

## Critical working rules

1. **Inspect before editing.** Never replace an existing file wholesale merely because a new feature needs additional models or fields.
2. **Preserve existing behavior and tests.** The repository has existing tests. Run them before and after meaningful changes.
3. **Make additive changes when possible.** If an existing model/module already serves another feature, extend it instead of replacing it.
4. **Do not invent architecture.** Read the current code and documentation before deciding how a feature should be wired.
5. **Do not silently change campaign canon.** Distinguish source-backed canon, DM-only information, player knowledge, and design ideas.
6. **IDs matter.** Entity IDs are referenced throughout the world data. Do not casually rename IDs or break references.
7. **Keep the app usable for a DM.** The product should reduce preparation friction and make information actionable during a session.
8. **Story planning is intentionally flexible.** A story beat may begin as nothing more than an idea/name and gain detail over time. Do not force every field to be populated.
9. **The DM remains in control.** Player actions should influence the story planner, but the application should not behave like a deterministic video-game quest engine unless explicitly designed that way.
10. **When uncertain, stop and explain the ambiguity rather than guessing.** This project contains campaign-specific names and intentionally incomplete lore.

## Important previous mistake

A previous development pass replaced `worldbuilder/models/story.py` with only the new Story Planner models. That accidentally removed the pre-existing `StoryContent`, `StoryText`, and `StoryEntityLink` models and caused widespread pytest collection failures. **Do not repeat this.**

The existing story content models must remain compatible with code/tests that import:

- `StoryText`
- `StoryEntityLink`
- `StoryContent`

New Story Planner models should coexist with them.

## Current Story Planner direction

The intended architecture is:

- Campaign Dashboard = DM control panel / front door during a session.
- Story Planner = living flowchart/graph of story beats.
- Player Actions = what the party actually did.
- Consequences = what those actions cause or may cause.
- World Clocks = things that advance independently of player choices.

The planner is a living outline, not a rigid script. A player can bypass a planned beat, create a new direction, resolve something unexpectedly, or cause consequences that change which beats are relevant.

## Current map architecture notes

The map UI uses React, TypeScript, Leaflet, and Leaflet-Geoman.

There are two distinct interaction systems:

1. Normal point markers (`CampaignMarker`) use Leaflet draggable `Marker` objects.
2. Polygon/path shapes use Leaflet-Geoman drag/edit behavior.

A previous bug occurred because Geoman intercepted normal marker dragging and the sidebar opened when the marker was released. The successful fix was to add `pmIgnore` to normal campaign markers:

```tsx
<Marker
  position={position}
  icon={markerIcon(marker.icon)}
  draggable
  pmIgnore
  ref={(layer) => {
    if (layer) {
      setMapLayerMarkerId(layer, marker.id);
    }
  }}
/>
```

Do not remove this without understanding the interaction conflict.

A separate map issue was that the Geoman finish button sometimes needed to be clicked twice. The likely cause identified was Geoman controls/lifecycle being torn down and recreated when `mapData.markers` changed. A proposed fix was to separate one-time control initialization from shape event-handler lifecycle. This was a proposal, not a confirmed final implementation; inspect the current code before changing it.

## Current development priority

Map work was intentionally paused. The next major feature direction is the **Campaign Dashboard / Story Planner**, with Story Planner as the core data/UI concept and Campaign Dashboard as its operational front door.

Before implementing large new features:

1. Inspect current repository state.
2. Run tests.
3. Establish a clean baseline.
4. Repair any existing regression before layering on new architecture.

See `docs/` for detailed project context, architecture, campaign canon, Story Planner design, and development history.
