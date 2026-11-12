# Current Project Handoff

**Updated:** 2026-11-12
**Purpose:** Durable starting point for a new developer or assistant session. This is a summary, not a replacement for the repository instructions, source code, or campaign files.

## Read these first

1. [`AGENTS.md`](../AGENTS.md) — authoritative project rules and important compatibility constraints.
2. This file — current product shape, architecture, and recent status.
3. Relevant source files and tests — implementation is the final source of truth.
4. [`docs/`](.) and [`docs (1)/`](<../docs%20(1)/>) — supplemental design and history notes. Some older notes are stale; compare them with code and recent user direction.

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

Recent work includes a DM scratchpad supporting multi-paragraph ideas and promotion into other content; a timeline graph; data-health and YAML editing improvements; event timeline filters/layout; plot-point checks and possible observations; entity tags and metadata; extensive map editor interaction/layout tools; and a separate combat-app launch connection. Plot points support scene-specific NPC knowledge entries, with optional reveal conditions and checks, shown in the During Session reference. World clocks can optionally be attached to a plot point as Plot Clocks; they have their own dashboard section and filters and appear in Session Prep and During Session for selected/current plot points. Deleting a plot point detaches its clocks so their progress is preserved as world clocks. The campaign Consequences section can be filtered by originating plot point, status, linked plot point/world event, or text search. The Store Price List has editable 2014 5e mundane equipment prices, an optional 2024 rarity-based magic-item price guide, and named magic-item price suggestions in YAML. NPCs have an optional `job` attribute, and 50 named reference NPCs are stored as world YAML entities tagged `Reference NPC`; they are not pre-linked to locations or campaigns. The Characters dashboard separates NPCs and player characters into tabs, with compact cards and race/alignment filters. The Store page is a DM lookup reference with search, category filters, price editing, and custom items; it is not a checkout, inventory, or currency transaction system. See current source, tests, and `git status` for exact scope.

Campaign dashboards now include an editable Campaign Arc section for the campaign description, overview, titled overarching plot sections, and linked World Stories. Existing paragraph-based plot text is displayed and edited as numbered sections until the DM gives each a title. The overarching plot is optional and should remain a flexible DM-facing summary; campaign-specific developments continue to live in Plot Points, Consequences, and Clocks.

On 2026-10-13, the full frontend ESLint and TypeScript checks passed after resolving the reported issues. After adding the magic-item guide and named price suggestions, targeted ESLint for `StorePage.tsx` and the frontend TypeScript check also passed. The current world registry loaded the 138-item price list, and `validate_registry` reported 0 errors and 0 warnings. The earlier full frontend commands exited successfully:

```bash
/home/patrick/.config/nvm/versions/node/v24.21.0/bin/node node_modules/eslint/bin/eslint.js .
/home/patrick/.config/nvm/versions/node/v24.21.0/bin/node node_modules/typescript/bin/tsc -b --pretty false
```

Node 24 was installed under NVM but was not necessarily on the interactive shell `PATH`; use the path above or load NVM. Frontend scripts are also available as `npm run lint` and `npm run build` once Node is available. Backend tests are run with `python -m pytest` from the repository root (or the project’s configured environment). Do not claim a check passed unless it was run in the current session.

## 2026-10-21: Paired dungeon maps and combat integration handoff

The user approved a full dungeon image for DM encounter placement alongside a fogged image for the player monitor. Implemented and verified in both repositories. The companion repository is `/home/patrick/GitRepos/DnDApp/DnDGameTool`. Both applications remain independently usable. No authored YAML, map IDs, campaign canon, or live game records were changed by this integration work.

- World Builder: `frontend/src/utils/playerMapExport.ts` now exports `flattenMapPair` and `publishMapToCombat`; the existing `flattenMapForPlayer` remains compatible. The two images share one loaded background and the exact same export dimensions. DM rendering includes visible DM-only markers and omits fog/reveal/mask overlays. Player rendering retains the existing public-marker, fog, reveal and explicit-mask rules. Never independently crop the two variants: combat tokens use shared image coordinates.
- `PlayerMapPublishPanel` in `frontend/src/pages/MapsPage.tsx` saves the draft and sends the paired update. `POST /player/map/pair` on the combat API accepts JSON `{ playerImage, dmImage }` (raw base64 PNGs), plus URL-encoded `X-Map-Id` and `X-Map-Name`. Images must have identical dimensions, each at most 10 MB, 4096 pixels per side and 16 million pixels. A 404 produces an update/restart message; do not add a fallback that could publish the unmasked image to players.
- Combat stores one public `player-map-<identity>.png` per source map and destination campaign. The matching full DM PNG is in the hidden `.dm-maps` directory, outside image catalogs. Trusted settings have optional `playerMap.dmBackground` / `dmRevision`. The sanitized `/player/state` feed omits these fields and all hidden units. Public `/image/:name` stays fogged; `/dm-map/:name` serves the full variant for the trusted DM app. This preserves the existing local-DM trust model, not an authenticated remote hosting service.
- The combat DM sees the full dungeon, with unrevealed enemies faded using the existing **Show hidden tokens (DM only)** setting. **Preview player map** uses the public image, token filtering and shared `PlayerTokenDetails` cards without changing player settings or camera scope. Combat cameras/broadcasts remain keyed to the **public** background filename, even when rendering the DM variant. Keep the same image width/manual scale and token coordinates in both views.
- Map pushes preserve units, HP, positions, grid settings, reveal flags and camera. Fog reveals in World Builder do not automatically reveal combat tokens; the DM still uses token reveal controls. **Restore encounter background** / **Clear Player View** restores the prior background. Legacy single-PNG publishing still works, showing the same image on both screens until a paired map is sent. Older historical background copies remain saved.
- Related combat import behavior is already implemented: selected templates override imported stats even for explicitly linked units; the import preview names each stats source. Existing local units can be included even if omitted from the World Builder encounter. Other-campaign units get stable destination copies while originals remain intact. Combat backgrounds can be selected from either app, with thumbnails for local images. World Builder connection settings live in combat Admin.

Operational handoff: restart the combat API and refresh both frontends/player windows, then **Update Player View** once to populate the pair. The DM browser can hot-reload while the Node API still runs old code. A live read during the preceding fix found the old API returning zero tokens and a forced 1600px width while the DM width was 4400px; a browser refresh alone cannot correct that. The updated API respects the saved width and includes revealed tokens. The live API was not restarted and no map was pushed into a live campaign by this coding session.

Validation at completion: 54 focused combat API/DM/player regression tests passed. World Builder's 13 map/marker/upload/sprite tests passed before and after changes (six pre-existing `datetime.utcnow` deprecation warnings). Five new canvas/publishing tests passed and cover paired bounds, DM-only labels, public fog/masks, stable map ID payloads, old API errors and failed exports. Combat TypeScript and targeted lint passed. World Builder frontend TypeScript, targeted lint for map sources and Node test files/config, and focused formatting checks also passed. The large Maps page was formatted only within the publishing panel; unrelated map editor code was preserved. Commands: `npm run test:map-export` from `frontend` (Node 24); `node node_modules/eslint/bin/eslint.js --config tests/eslint.config.js tests/playerMapExport.test.mjs` for the Node test file; normal targeted frontend lint/type checks also apply. No new package dependency or Python backend schema change was required. See [COMBAT_CONNECTION.md](COMBAT_CONNECTION.md) for the current workflow and contract.

## 2026-10-21: Preserve sprite artwork in flattened combat maps

The user reported that World Builder's crystal/platform sprites became gold circle markers in combat exports. The exporter already drew `icon_image` sprites, but caught image-load errors and silently substituted generic markers. The user publishes from `http://localhost:5173`; a read-only live request confirmed the existing sprite endpoint returns PNG bytes with the matching CORS origin. Browser cache reuse of Leaflet's non-CORS image requests was a suspected failure path, not directly reproduced in a browser.

`frontend/src/utils/playerMapExport.ts` now fetches assigned sprites using `mode: "cors"` and `cache: "no-store"`, decodes local Blob URLs, and revokes those URLs after loading or failure. Sprite loads are shared across the DM/player pair. Draw operations match the editor's `object-fit: contain` proportions and preserve size, rotation and mirrors. Public exports retain all DM-only/visibility/fog/mask rules. Assigned sprite load or decode errors now stop publishing with an actionable sprite path; neither image is uploaded. Ordinary markers without sprites retain their symbol. No backend, combat app, authored YAML or saved campaign changes were needed.

Refresh the World Builder frontend and publish **Update Player View** again to replace a previously flattened circle-only map. Do not restart servers or push into a live campaign automatically. The combat background stays at the same identity and preserves combat state and camera using the existing paired-map contract.

Validation: all nine export/publishing tests passed, including four new cases for sprite HTTP loading and deduplication, image bounds/transforms, public/DM privacy, missing sprites and decode cleanup. The five existing Python sprite/upload API tests passed before and after changes. Frontend TypeScript, targeted source/test ESLint, and formatting checks on all four touched files passed. Browser pixel rendering was not exercised because a browser runner is unavailable in this environment.

## 2026-10-21: Save prepared combat scenes with World Builder map pairs

The user approved saving a dungeon with pre-positioned enemies before heroes are known. Implemented entirely in DnDGameTool; World Builder publishing endpoints and authored YAML stay unchanged. After restarting the combat API and refreshing the combat frontend, **Campaigns & scenes → Save current map as scene** also works while a pushed map is active. Scene cards display the World Builder map name and **Replace with current layout** remains available. Loading a saved scene restores its DM/player pair, grid, manual width, viewport, token positions/reveals and encounter selection. Returning to a campaign also restores its active saved scene map. Heroes created later start hidden/excluded on load; use Combat's include checkboxes, then reveal/place them on Map. HP/resources remain current across scenes.

Combat `SceneRecord` adds optional `playerMap`, validated using the existing map metadata rules. During ordinary `PUT /settings/:id` saves, `server/sceneMaps.ts` creates immutable content-derived `scene-map-<hash>.png` image copies. Fogged copies live in backgrounds; full DM copies remain in `.dm-maps`. Unchanged saved pairs reuse existing copies. Scene files stay out of background catalogs, and `/player/state` still exposes only public image metadata and revealed tokens. Later pushes use the existing single live map identity; they cannot overwrite inactive scene image copies. The active scene still autosaves edits, including a new push if the DM subsequently edits/replaces its layout. Scene loads are allowed to restore their pair while stale queued settings/camera writes cannot reactivate old images after a new push/clear. Same-source pushes preserve the camera even when transitioning from a saved snapshot back to the live map.

Missing source images stop the settings save before changing the record. Legacy single-image publishers and older scenes remain compatible. Deleting scenes retains shared image files. JSON backups/export include metadata only; copy backgrounds and hidden `.dm-maps` when transferring an installation. No server was restarted and no live scene/map was published during implementation.

Validation: 81 focused regression tests passed across the API, map workflows, encounter behavior and player camera suites. Root TypeScript and targeted ESLint passed; formatting checks passed on all touched combat source/tests/docs. All nine map-workflow tests passed again after the final explicit-clear behavior adjustment. No browser pixel rendering was exercised. Relevant files: combat `server/sceneMaps.ts`, `server/app.ts`, `server/encounterValidation.ts`, `server/images.ts`, `src/renderer/components/AppTypes.ts`, `CampaignHub.tsx`, `context/AppReducer.tsx`, `utils/scenes.ts`, and the existing server/map workflow regression suites. Workflow and storage details are in combat `docs/encounters.md` and `docs/world-builder.md`.

## 2026-10-21: Combat import allegiance and map reveal workflow

DnDGameTool now lets the DM choose Enemy, Ally or Party member for each optional world NPC and prepared encounter combatant before preview/import. The default keeps an existing unit's saved side, or the source role for a new unit. An explicit choice also applies to linked units and template imports. Source-based stable IDs are preserved across side changes; changing an NPC from enemy to ally does not create a duplicate. Party member quantities must be one; enemies/allies can have multiple copies. Without a selected template, HP/resources, positions and reveal flags stay intact. Selecting a template still intentionally replaces statistics and resets encounter resources. These overrides stay in the combat app; World Builder entities, encounters, API payloads and authored YAML are unchanged.

The combat Map toolbar's **Token visibility** button replaces the old bottom checkbox row. Its right sidebar stages multiple reveal/hide changes, keeps map pan/zoom/drag available, and **Apply** saves the choices together and closes it. Cancel/X/Escape discard changes; switching campaign or scene discards an open draft. Individual unit-card eye buttons still work immediately. When adding later-created heroes to a prepared scene, create/import them in the destination combat campaign, use Combat's include checkboxes if needed, then position/reveal them on Map. The active scene autosaves; wait for the save indicator. Use **Save current map as scene** with a new name first to keep an enemy-only original.

DnDGameTool also bundles offline 2014/2024 SRD spell references with stable edition-specific IDs (`srd-2014-fireball`, `srd-2024-fireball`). Built-ins stay in the app; settings save only custom definitions/overrides and characters save known/prepared IDs. This does not add a World Builder spell API or sync spell rules across apps. See combat `docs/spell-sources.md` and `docs/encounters.md` for catalog provenance and usage. No live map was published and no application server was restarted for this work.

## 2026-10-27: World search and location breadcrumbs

Global search now indexes names, descriptions, tags, notes, and nested story text from shared world data. Results include a labeled matching excerpt and saved location path, with distinct Kingdom/Nation filters. Private text keeps its DM-only context; searching never reveals a marker or changes player knowledge. Technical IDs and asset paths are excluded. Clickable breadcrumbs in entity details and the home dashboard follow explicit location/political references and retain the drawer's existing back history. See [SEARCH_AND_NAVIGATION.md](SEARCH_AND_NAVIGATION.md) for behavior, limits, and verification commands.

Related cumulative frontend work is documented in [SESSION_DASHBOARD.md](SESSION_DASHBOARD.md) and [EDITING_WORKFLOWS.md](EDITING_WORKFLOWS.md). These additions reuse existing backend models and shared world state; preserve the existing story content types and map interaction safeguards.

## 2026-10-27: Map editing

Map editing now includes optional API map revisions, baseline-aware browser
drafts with per-marker merging/conflict choices, complete map-setting undo,
HTTP-safe IDs, shared editor/export layer ordering, rigid map-unit transforms,
direct layer assignment, explicit drawing completion, a nonmodal inspector,
hidden-item ghosts, mobile tool sheets, selection/nudging, and local export
preview. See [MAP_EDITING_WORKFLOW.md](MAP_EDITING_WORKFLOW.md). Preserve normal
marker `pmIgnore` and the stable Geoman control initialization when extending it.

The next map update adds a per-world browser style library with built-in/custom
point, area, path and image appearances, favorites, rename/delete and validated
JSON import/export. Styles copy visuals without changing canon, identity,
geometry, links or visibility. Bulk property editing stages one undoable operation
and honors locks and marker kinds. Full-screen editing preserves the Leaflet
instance and includes mobile controls, nested drawer stacking, keyboard focus
exclusion for covered app chrome, and scroll restoration. See the map workflow
for storage scope and transfer limits. Keep optional `overlayZIndex` propagation
when opening nested entity/creation drawers over the full-screen map.

Map conflict resolution now shows draft and saved values with a required choice
for each conflicting field, item deletion, layer order or invalid assignment.
`mergeMapDraft` retains its conflict strings for compatibility and adds structured
`conflictDetails` plus optional choices/legacy-review inputs. `MapConflictDialog`
provides responsive comparisons and explicit all-mine/all-saved shortcuts.
Saving rechecks both authored revision and reviewed draft before honoring choices;
unrelated local/remote edits remain merged. Legacy drafts review all differences.

## 2026-11-04: Optional scene scripts for campaign plot points

Plot points now have an optional ordered `scene_script` containing narration,
dialogue (with an optional free-text/NPC-name speaker), and DM notes. The existing
plot-point editor offers Write scene script, paragraph/dialogue/note creation,
reordering, removal, and draft preview. Save changes persists the script with the
plot point and keeps the editor/draft open on failure. Existing summaries, inline
entity links, checks, NPC knowledge, consequences, and campaign history remain in
their existing fields. Legacy `StoryText`, `StoryEntityLink`, and `StoryContent`
models are preserved; older beats default to an empty script.

Read scene script opens a responsive reading dialog from the planner, selected
Session Prep plot points, and the current During Session reference. Its scene
selector and Previous/Next controls follow plot-point Order without changing the
current beat, status, clocks, or actions. Show DM notes affects this DM reading
dialog only; this does not publish text to players or the combat app. Text remains
plain text with preserved paragraph breaks and is never executed as HTML.

Implementation: `worldbuilder/models/story.py`, frontend `types.ts`, the additive
`components/SceneScript.tsx`, and campaign dashboard integration. No dependencies
were added and no authored campaign YAML was changed. See
[SCENE_SCRIPTS.md](SCENE_SCRIPTS.md) for workflow and storage details.

Validation: 174 Python tests passed (167 baseline), including YAML/API persistence,
legacy story compatibility and invalid block rejection. All 17 existing dashboard
and editing unit tests and the existing dashboard browser workflows passed. New
`npm run test:scene-script-ui` checks desktop/phone authoring, paragraph retention,
speaker entry, reorder/removal, cancel, failed-save retry, reload, reading order,
DM-note visibility and session workspace access using intercepted API fixtures.
Source/test lint, Python lint/formatting, TypeScript and production build passed;
the production build retains its large-bundle warning.

## 2026-11-10: Live-session journal and accessible post-game summaries

During Session now includes a separate Session journal for DM notes, NPC
reactions, world changes and follow-ups. Entries persist under
`CampaignStory.session_entries`; they keep session, optional plot point/NPCs,
source action/entry IDs, and linked consequences. They never become party actions
or edit NPC canon. Browser drafts are separated by world/campaign/session and
survive refresh; failed saves retain text. Follow-ups can be marked done/reopened.

Create consequence from a journal entry or recent party action opens a reviewable
draft with its cause, owning plot point, optional timing, and possible next plot
points. Saving adds a pending consequence and source link in the same campaign
save. No clocks, scene statuses, or current-beat changes happen automatically.
Deleting a plot point, consequence or party action cleans the corresponding new
journal links while retaining entries. Data Health reports missing journal
references; duplicate IDs and invalid session values are rejected by the model.

Session summary is now directly accessible from the live toolbar. Its existing
recap editor can append an outline from the whole session log while retaining
authored prose. Party/NPC/world facts go in the summary; DM notes, linked
consequences and open follow-ups go in private notes. Journal-only sessions appear
in session history and session-number calculations. Party action saves keep the
selected session and retain the draft on failure.

The campaign page's shared dialogs are now rendered in both the dashboard and
prep/live workspaces. Previously the Session history and Close out buttons could
set their open state during play without rendering their dialogs. The shared
render path also preserves scene-script readers and event/timeline actions.

See [RUNNING_A_SESSION.md](RUNNING_A_SESSION.md) for preparation, capture,
consequence and recap workflows. New source modules are `SessionJournal.tsx`,
`SessionConsequenceDialog.tsx` and `utils/sessionJournal.ts`; the existing story
models remain intact. No dependencies were added and no authored world data was
changed. Backend baseline: 174 tests; after changes: 183 tests. Frontend helper
checks cover journal, dashboard and editing behavior (23 tests). Desktop/phone
browser checks exercise recovery, retries, NPC causes, consequence links, summary
privacy, live history/closeout and notes-only sessions; existing dashboard and
scene-script workflows also passed. Lint, formatting, TypeScript and production
build pass; the pre-existing large-bundle warning remains.

## 2026-11-10: Campaign typing performance

Campaign text drafts previously lived in `CampaignDashboardPage` state. Each
character re-rendered unrelated plot points, actions, controls and dialogs. In a
mocked campaign with 12 plot points, the 21-character plot-name test took about
8.5 seconds and party capture took 7.5 seconds in development Chromium.

`useEditorDraft` now owns each form's synchronous draft snapshot for the lifetime
of the campaign page. `DraftEditor` subscribes just the form with
`useSyncExternalStore`. Save handlers read the current snapshot directly, so an
immediate click includes the final character. Workspace changes retain unfinished
captures; failed saves keep drafts. This covers plot/script editors, campaign arcs,
recaps, prep prose, event drafts, action/consequence/clock editors and creation
forms. Journal history and response options are memoized separately from capture;
its recovery draft still writes synchronously to browser storage.

The same typing probe dropped to approximately 1.7 seconds for plot editing and
0.9 seconds for party capture. These are local development measurements, not
production performance guarantees. `npm run test:dashboard-typing-ui` uses mocked
API data and React commit observations to assert that typing does not re-render
the whole page or saved journal entries, rather than relying on timing thresholds.
It also checks rich-text/script saves, draft retention, retry, prep, recap, arc,
plot creation, clock, consequence and action editing. Existing desktop/phone
dashboard, script and journal browser suites pass, alongside 183 Python and 23
frontend helper tests. Lint, changed-block formatting and production build pass;
the existing bundle-size warning remains. No campaign YAML was edited.

## 2026-11-12: Scene reader layout

`SceneScript.tsx` now uses a wider reading column, compact header/footer, a
top-right close button and scene position counter. Paragraphs separated by blank
lines render as spaced paragraphs; single newlines still wrap as authored.
Dialogue and private notes have labeled, shaded blocks. The same presentation is
used in script previews. The text region scrolls independently, and changing
scenes resets that region to the top while keeping the dialog height stable.
Phone navigation uses labeled arrow buttons. No authored script text is changed.

The scene-script browser suite checks desktop and phone authoring, preview,
save/retry, privacy, reader navigation, short-screen scrolling to the final
paragraph, fixed controls, scroll reset and both close buttons using mocked data.
The seven scene-script Python tests, source/test lint, formatting and production
build also pass. See [SCENE_SCRIPTS.md](SCENE_SCRIPTS.md).

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
