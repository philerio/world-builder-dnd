# Map editing review

**Implementation update, 2026-10-27:** the reviewed defects and editing workflow
have been addressed. See [MAP_EDITING_WORKFLOW.md](MAP_EDITING_WORKFLOW.md) for the
current behavior. The findings below preserve the original review and its
reproduction evidence.

Reviewed 2026-10-27. Scope: marker placement and properties, layers, selection,
dragging, shapes, snapping, geometry, undo, map drafts, mobile layout, backgrounds,
and flattened DM/player publishing. This is a review, not an implementation pass.
Application code and authored world/map data were left unchanged.

## Moving an existing marker to another layer today

1. Open the map and choose **Edit map**.
2. In the Map controls panel, open **Layers**. Add a layer using **New layer name**
   and **Add** if necessary. Creating a layer makes it the destination for new items;
   it does not move existing items.
3. Open **Tools → Select multiple**. Click the existing marker. A single selected
   marker is sufficient; shapes can also be selected.
4. Return to **Layers → Move 1 selected** and choose the destination layer.
5. Choose **Save changes**, or **Done editing**, which also saves.

The destination must be visible and unlocked. Browser verification confirmed that
assigning an existing point to a newly created layer persists after saving.
The current **Unassigned** choice is broken; see finding 3.

## Confirmed defects

These were reproduced with Playwright against mocked API responses. No real map
was saved and no map was published into the combat app.

### 1. Saving a recovered map draft can overwrite newer work — high priority

Create an unsaved local map edit, change the saved map's notes from another
client, reload, enter editing again, and save the recovered draft. The outgoing
PUT contains the old full-map snapshot and omits the newer notes. The API
validates and replaces the full entity rather than merging omitted fields.
The same lack of a revision check also affects concurrent edits during an open
editing session.

Sources: `MapsPage.tsx` around lines 140, 1921 and 2068;
`worldbuilder/api/app.py` around line 710.

Recommended change: store the draft's original baseline and world/map identity;
show a recovery choice and merge against a freshly loaded map before saving.
Merge marker changes by marker ID and surface conflicting changes/deletions.
A server revision check is needed to close the race between reading and writing.

### 2. Creation fails on plain HTTP LAN connections — high priority for mobile

An isolated non-localhost HTTP origin reported `isSecureContext: false` and
`typeof crypto.randomUUID: "undefined"`. Pressing **Add** for a new layer raised
`crypto.randomUUID is not a function` and created no draft. Point creation,
templates, shape creation, duplication and fog-reveal actions also call this
function directly.

Source: `MapsPage.tsx`, including lines 308, 384, 2253 and 2597.

Recommended change: use one ID helper that works in the application's supported
connection environments. Preserve all existing IDs. The HTTP-origin test used
the real frontend with mocked API traffic, rather than disabling the method on
localhost.

### 3. A marker cannot be moved back to Unassigned

After assigning a marker to a named layer, select it and choose **Unassigned** in
the move selector. Its layer remains unchanged. The selector always has
`value=""`, and Unassigned also has value `""`, so this selection does not trigger
the assignment callback.

Source: `MapsPage.tsx` around line 4329.

Recommended change: give the action selector a distinct placeholder value, or use
an explicit **Move** action. Add a single-marker layer field in the inspector and
context menu, including an explicit Unassigned option.

### 4. Layer locks can be bypassed by the shape context menu

Lock a custom layer containing an area and right-click that area. **Edit Marker**
and other mutation actions still appear. The area's own handler checks its lock,
but the map's context-menu fallback finds the same shape without checking locks.
Explorer order buttons also receive no lock state.

Sources: `MapsPage.tsx` around lines 1247, 5015 and 5296; Map Explorer around 1074.

Recommended change: check editing permission in shared mutation handlers as well
as in canvas handlers, and consistently disable mutation actions in menus and
the explorer. Locks should protect against accidental edits through every entry
point.

### 5. Exported layer stacking can differ from the editor

A red foreground area on the front custom layer covered a blue background area
in the editor. The exported DM image's center pixel was blue. Editor panes honor
custom layer order, while the flattening renderer sorts only by `z_index`.
Both DM and player flattening use that renderer.

Sources: `MapsPage.tsx` around line 5109;
`utils/playerMapExport.ts` around line 222.

Recommended change: share layer/order rules between editor and exporter. Order
items within their layer before ordering layers. Keep the existing audience,
mask, fog and paired-map framing rules intact. Temporary editor layer hiding
should remain distinct from player visibility.

### 6. Enter does not finish a path as instructed

Draw two path vertices and press Enter: the preview remains unfinished. Clicking
its endpoint completes the path. The installed Geoman implementation reads
`finishOnEnter` from global options; the app passes it only to `enableDraw`.
Escape also leaves point placement active, although free drawing has its own
Escape handler.

Source: `MapsPage.tsx` around lines 5729–5782 and the installed Geoman keyboard
handler. No app call to `setGlobalOptions` was found.

Recommended change: wire finishing to the installed library's actual contract,
provide visible **Finish**/**Cancel** actions for touch users, and make Escape
consistently cancel the active editing tool. Avoid intercepting typing in forms.

### 7. Rotation distorts shapes on rectangular maps

On a 1000 × 700 canvas, a 200 × 210 map-unit area became 300 × 140 after a 90°
rotation. It should become 210 × 200. The transform rotates percentages as though
both axes have the same physical scale, then clamps vertices individually.

Source: `MapsPage.tsx` around line 2945.

Recommended change: transform in map units, then convert back to stored
percentages. Keep boundary adjustments rigid rather than clipping each vertex
independently. Preserve marker IDs, links and non-geometric properties.

### 8. Undo does not cover all map changes

Changing Workspace from 1000 × 700 to 1600 × 1120 changed both canvas dimensions
and marker coordinates, but **Undo map edit** stayed disabled. History snapshots
only contain markers and layers, and canvas resizing does not record an entry.
Background and fog changes also stage drafts without recording their prior state.

Sources: `MapsPage.tsx` around lines 136, 2035, 2059, 2337 and 2386.

Recommended change: include every map setting affected by an undoable action in
history. Record canvas dimensions and rescaled positions together so they restore
as one coherent edit. Uploaded asset files can remain separate from map undo.

## Workflow improvements

### Marker placement and selection

- Make **Pan**, **Select**, **Place**, and **Draw** clear, mutually exclusive tools.
  Currently markers are draggable throughout edit mode, including **Browse**,
  and shapes also use Geoman's global drag mode. A user trying to pan can move
  an item. Keep navigation into linked maps/entities as an explicit action while
  editing.
- Show a placement preview and a compact status on the canvas: selected item,
  destination layer, snap setting, and whether placement repeats. Regular point
  placement repeats until cancelled; entity placement is one-shot; some shape
  presets repeat and others stop. These differences should be explicit.
- After placement, offer a compact inspector for label, entity, layer, appearance,
  and visibility. The current modal marker drawer covers the map while telling
  the user to drag the marker on the map. Use a side inspector on large screens
  and a collapsible bottom sheet on phones.
- Keep **Place entity**, but expose a clear existing-record picker rather than
  making users discover the explorer's Unmapped tab. Consider NPCs and map links
  alongside geographic entities. Reuse the shared Kingdom/Nation labels.
- Add marquee selection, Shift-click selection, keyboard nudging, and named
  marker accessibility labels. Increase small control and handle targets for
  touch. These are enhancements, not confirmed regressions.

### Layers and visibility

- Put **Layer** in marker properties and **Move to layer** in the context menu;
  retain the existing batch operation.
- Show layer children and an explicit Unassigned group in the layer panel. Keep
  the active destination visible on the canvas so switching panels does not hide
  where new items will go.
- Add an editor-only **Show hidden / DM-only items** toggle using ghosted styling.
  Current edit rendering filters both out entirely; the audit showed only one
  rendered point when the map held three points. Hidden items remain in the
  explorer, but linked ones open entity details rather than marker properties.
  This toggle must not change player visibility or publishing rules.
- Clarify that hiding a layer is a temporary editor aid. **Visible**, **DM only**,
  fog reveals and masks control different saved/player-facing behavior.

### Mobile layout

At 390 × 844, the open Tools panel was about 1122px tall. The map began below it;
even after scrolling the Point marker button into view, the map's top was still
about 1334px below the viewport top. There was no horizontal overflow. This is a
vertical workflow problem rather than a width bug.

Use a compact toolbar attached to the map, with Layers, Assets and Properties in
collapsible sheets. Keep tool, Save and Cancel controls near the canvas. Avoid
requiring a scroll through all tools every time an item is placed or adjusted.

### Saving and recovery

- Rename marker **Save Details** to **Apply to map**, and explain that **Save map**
  persists the map draft. The current caption says dragging "saves immediately",
  but it only stages the change. It should state the actual behavior.
- Add explicit map-level **Discard changes** and **Keep draft** choices. Today
  **Done editing**, map back navigation and linked-map switches save changes.
- Show recovery status and storage failures. Map drafts use `sessionStorage`,
  automatically restore when Edit map is entered, and silently ignore storage
  errors. They have less protection than the newer entity drafts, with no map
  before-unload guard or world-scoped storage key.
- Provide a local preview of the actual exported player image before publishing.
  Do not publish automatically while editing. Preserve the current paired map,
  token, camera and fog contracts with the combat app.

### Precision and maintainability

`getMarkerBounds` treats point stamps as their center alone. Alignment and group
bounds therefore ignore stamp size/rotation. Align visible footprints and perform
transforms in map units. A square grid in map units would be more useful for
dungeons than separate equal percentages of unequal canvas axes.

The roughly 6000-line Maps page combines state, geometry, persistence, rendering
and controls. Extract small shared geometry/order helpers and editing-state
helpers while fixing defects; avoid replacing the editor wholesale. Add focused
behavior tests for these verified gaps rather than only model/export tests.

## Existing behavior to preserve

- Existing-marker assignment to a new layer works and saves correctly.
- Normal point markers retain `pmIgnore`, separating Leaflet marker dragging
  from Geoman shape dragging.
- Geoman control initialization already depends on `editMode` and `map`, rather
  than the marker list. The previously proposed separation is present; do not
  reintroduce marker-dependent control teardown.
- Existing duplication, group movement, alignment controls, layer ordering,
  temporary locks, templates, image/sprite uploads, saved marker links, and
  individual property discard/delete protections provide useful foundations.
- Placement inside an unlinked area worked in the browser audit. A blanket claim
  that areas prevent all point placement would be incorrect.
- A suspected explorer edit path in view mode was not exposed by normal controls;
  exiting editing closed the explorer. It is not listed as a confirmed defect.

## Recommended implementation order

1. Repair the verified defects: draft concurrency/recovery, HTTP-compatible ID
   generation, Unassigned, lock enforcement, export order, drawing completion,
   coordinate transforms and coherent undo.
2. Improve the daily placement loop: clear tools, direct layer assignment,
   placement preview, inspector, accurate save feedback and hidden-item editing.
3. Adapt those controls for mobile sheets and touch, then add advanced selection,
   footprint-aware precision tools and export preview.

The first user-visible batch should include the direct marker Layer selector,
Unassigned fix, consistent Finish/Cancel actions, and accurate save labels,
alongside the underlying reliability fixes. Keep each batch independently
reviewable and preserve all authored map data.

## Verification and limits

- Existing Python map/model/image/sprite suite: **13 passed**.
- Existing map export suite: **9 passed**.
- Existing editing browser suite: passed, including map marker/entity creation
  and persistence through the map draft.
- Frontend TypeScript compilation: passed.
- Additional temporary browser audit: reproduced the defects above, checked
  actual exported pixels, and measured narrow-screen layout. Mock API writes
  remained in memory. Screenshots and observations were saved under
  `/tmp/world-builder-map-review` for this session.

Passing baseline tests do not cover the newly identified defects. Physical phone
keyboard/long-press behavior, large-map frame rates, and a live combat publish
were not tested. Those should be verified after the relevant implementation
batch; they were not assumed to fail during this review.
