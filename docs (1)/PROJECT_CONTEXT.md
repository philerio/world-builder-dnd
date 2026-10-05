# Project Context

## Product vision

**Family-Friendly 5e Campaign / World Builder** is a DM-focused application for maintaining a living fantasy world and running campaigns inside it.

The developer's core problem is not simply storing D&D notes. He wants a system that can hold the messy creative process behind a campaign while remaining useful when the players do something unexpected.

A traditional Word document works well for the initial creative dump: he can throw all his thoughts onto the page and describe how he imagines the story progressing. The problem is that a Word document does not naturally adapt when the players make unexpected choices.

The desired application therefore combines:

- structured world data
- freeform campaign/lore writing
- entity links
- maps
- timelines/events
- campaign dashboards
- a living story graph
- actual player actions
- consequences
- world clocks

## Current conceptual architecture

### World database

The world is composed of identifiable entities. Known entity categories include:

- World
- Continent
- Region
- Kingdom
- City
- NPC
- Player Character
- Campaign
- World Event
- Timeline Event
- Lore
- Artifact
- Map

The Python backend uses Pydantic models and a `WorldRegistry` that maintains collections/maps of entities with globally unique IDs.

### Backend

Known backend areas include:

- `worldbuilder/models/`
- `worldbuilder/registry/`
- `worldbuilder/loaders/`
- `worldbuilder/services/`
- `worldbuilder/api/`
- configuration/entity directory definitions

The API includes entity GET/PUT behavior. World data is loaded from structured YAML directories.

Known code from the current project includes:

- `worldbuilder/models/campaign.py`
- `worldbuilder/models/story.py`
- `worldbuilder/registry/registry.py`
- `worldbuilder/loaders/world_loader.py`
- `worldbuilder/loaders/entity_loader.py`
- `worldbuilder/services/world_service.py`
- `worldbuilder/api/app.py`

### Frontend

The frontend uses React + TypeScript, MUI, Leaflet, and Leaflet-Geoman.

The frontend has a `WorldDataContext` with APIs such as:

- `useWorldData()`
- `getEntity()`
- `loadEntity()`
- `updateEntity()`

The map page has a `MapsPage.tsx` implementation and a `MapViewer`/marker/Geoman architecture.

## Story content model that already existed

Before Story Planner work, the project already had a structured story-content model:

- `StoryText`: ordinary story text
- `StoryEntityLink`: clickable reference to a world entity
- `StoryNode`: union of the above
- `StoryContent`: list of story nodes

These are used by existing campaign code and tests. They must remain intact while Story Planner functionality is added.

## Story Planner model proposed so far

The following models were proposed as an initial direction:

- `StoryBeat`
- `StoryConsequence`
- `PlayerAction`
- `WorldClock`
- `CampaignStory`

The initial conceptual fields are documented in `STORY_PLANNER.md`. Treat them as the current design proposal, not immutable implementation requirements.

## DM-facing workflow

The intended workflow is roughly:

1. Create campaign.
2. Dump rough ideas into campaign/story content.
3. Turn ideas into beats when useful.
4. Connect beats into a graph.
5. During a session, use Campaign Dashboard as the operational view.
6. Record meaningful player actions.
7. Activate/resolution consequences.
8. Advance independent world clocks.
9. Adjust beat statuses and future paths.
10. Preserve what actually happened as campaign history.

## Important design principle

The application should support both **planning** and **emergent play**.

A DM may have planned:

`Investigate Reqrun -> Travel North -> Green Hag -> Northern Lake`

but the players might:

- skip the Green Hag
- accuse the wrong NPC
- abandon the investigation
- return to town
- discover another clue first
- create a completely new problem

The application should make these changes easy to record without requiring the DM to rewrite the entire story.
