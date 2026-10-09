# Current Project Handoff

**Updated:** 2026-10-09  
**Purpose:** Durable starting point for a new developer or assistant session. This is a summary, not a replacement for the repository instructions, source code, or campaign files.

## Read these first

1. [`AGENTS.md`](../AGENTS.md) — authoritative project rules and important compatibility constraints.
2. This file — current product shape, architecture, and recent status.
3. Relevant source files and tests — implementation is the final source of truth.
4. [`docs/`](.) and [`docs (1)/`](../docs%20(1)/) — supplemental design and history notes. Some older notes are stale; compare them with code and recent user direction.

Do not assume prior chat history is available. Do not assume the checkout is clean. The user has approved many cumulative changes, and existing uncommitted work must be preserved.

## What the application is

World Builder is Patrick’s family-friendly D&D 5e campaign and world manager, currently using the world of Elligaesia. YAML files are the persistent world-data source. The app provides a Python API and React UI for managing world entities and using campaign information during preparation and play.

The main product areas include:

- World entities: characters/NPCs, locations and kingdoms, lore, artifacts, events, campaigns, world stories, and maps.
- Campaign operation: plot points (the Story Planner), possible checks/notices, player actions, consequences, clocks, session history/closeout, and links to related entities.
- Maps: hierarchical maps, markers, shapes, drawing/editing tools, schematic city/building layouts, image stamps, grid and view controls, and campaign activity overlays.
- Timeline graph, data health/YAML tools, common lore, tags/filters, and a DM scratchpad for long-form ideas that can later be promoted into world or campaign content.

Treat campaign details as authored canon, not generic sample data. Never silently revise them. In particular, Bane’s existing world-specific lore must be preserved if touching god/entity records.

## Architecture

### Backend

- Python 3.13+ project using FastAPI, Pydantic, and PyYAML.
- `worldbuilder/models/` contains entity schemas. `worldbuilder/config/entity_directories.py` and `entity_types.py` map entity types to their data directories and types.
- YAML loading flows through `worldbuilder/loaders/`; `worldbuilder/registry/` builds/resolves the world registry; `worldbuilder/services/world_service.py` handles world data operations and persistence; `worldbuilder/api/app.py` exposes the API.
- Validation and relationship/reference rules live in `worldbuilder/validation/` and `worldbuilder/relationships.py`.
- Data health functionality is in `worldbuilder/services/data_health_service.py` and its UI is `frontend/src/pages/DataHealthPage.tsx`.
- `worldbuilder/models/story.py` also contains legacy story content types. Preserve `StoryText`, `StoryEntityLink`, and `StoryContent` when changing Story Planner models.

### Frontend

- React 19, TypeScript 6, Vite 8, MUI 9, and React Router 6.
- `frontend/src/contexts/WorldDataContext.tsx` is the shared world-data/API integration layer; `frontend/src/types.ts` and `frontend/src/utils/entityFieldDefinitions.ts` define shared frontend entity structures/fields.
- Feature dashboards are under `frontend/src/pages/`; shared drawers/components are under `frontend/src/components/`.
- Maps use Leaflet, React-Leaflet, and Leaflet-Geoman. Normal campaign markers and Geoman-managed shapes use different interaction systems. Keep `pmIgnore` on normal draggable markers unless the interaction conflict has been deliberately re-evaluated.

### Data

- Structured world and campaign data lives under `worlds/` as YAML, with map assets alongside map data.
- IDs are cross-referenced throughout YAML and must not be casually renamed.
- Distinguish DM-only secrets, player-known information, source-backed canon, and tentative ideas when editing data or UI.

## Product direction

- The Campaign Dashboard is the DM’s operational front door during play.
- The Story Planner is a flexible living outline/flow graph, not a deterministic quest engine. Plot points may be sparse ideas or detailed plans; players can bypass or change them.
- Player actions record what happened. Consequences capture outcomes or possible outcomes. World clocks represent threats/timing that can progress independently.
- Campaign data should connect to reusable world entities and world-story threads without duplicating canon unnecessarily.
- Current feature work has recently ranged across campaign workflow, map editing, timeline visualization, scratchpad, entity metadata, and dashboard usability. Follow the user’s latest request rather than assuming one older roadmap item is the next priority.

## Recent implementation and validation status

Recent work includes a DM scratchpad supporting multi-paragraph ideas and promotion into other content; a timeline graph; data-health and YAML editing improvements; event timeline filters/layout; plot-point checks and possible observations; entity tags and metadata; and extensive map editor interaction/layout tools. See current source, tests, and `git status` for exact scope.

On 2026-10-09, the full frontend ESLint and TypeScript checks passed after resolving the reported issues. The final commands exited successfully:

```bash
/home/patrick/.config/nvm/versions/node/v24.21.0/bin/node node_modules/eslint/bin/eslint.js .
/home/patrick/.config/nvm/versions/node/v24.21.0/bin/node node_modules/typescript/bin/tsc -b --pretty false
```

Node 24 was installed under NVM but was not necessarily on the interactive shell `PATH`; use the path above or load NVM. Frontend scripts are also available as `npm run lint` and `npm run build` once Node is available. Backend tests are run with `python -m pytest` from the repository root (or the project’s configured environment). Do not claim a check passed unless it was run in the current session.

## Worktree and change safety

At handoff creation, the repository contained a large set of modified, added, and deleted files across frontend, backend, tests, and `worlds/`, including user campaign data and map assets. These are cumulative approved work, not disposable generated output. Before any edits:

1. Run `git status --short` and inspect the relevant diff.
2. Do not reset, clean, checkout over, or remove files to make the tree look tidy.
3. Avoid broad formatting or unrelated cleanup that obscures the user’s existing changes.
4. Make focused additive changes, then run the checks relevant to the request.

## Historical notes that need verification

The older `docs/architecture.md`, `docs/roadmap.md`, and `docs (1)/` handoff bundle contain useful context but predate many features. In particular, `docs (1)/DEVELOPMENT_HISTORY.md` says map work was paused and `docs (1)/KNOWN_ISSUES.md` lists suspected issues; treat these as historical prompts to verify, not current status. The current `AGENTS.md` and the user’s latest direction take precedence.

## How to continue in a new chat

Start by reading `AGENTS.md` and this file, then inspect `git status --short`, the requested feature’s implementation, and its tests. Ask the user only when canon or product intent is genuinely ambiguous; otherwise continue from the concrete request and preserve existing work. This file should be updated when architecture, active priorities, or validation status materially changes.
