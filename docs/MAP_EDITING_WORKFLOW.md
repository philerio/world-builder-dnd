# Editing maps

The 2026-10-27 map editing update implements the defects and workflow improvements
identified in [MAP_EDITING_REVIEW.md](MAP_EDITING_REVIEW.md).

## Tools and placement

Choose **Edit map**. The compact toolbar stays beside the canvas:

- **Pan** moves the view without dragging map items.
- **Select** opens marker properties and enables item dragging. A drag does not
  open the inspector when released.
- **Place point** shows a desktop cursor preview. On a touch screen, tap inside
  the map and choose **Place here** to confirm the position. **Repeat placement**
  keeps the tool active; otherwise the new point opens in the inspector.
- **Draw area**, or **Tools → Path**, starts drawing. Use **Finish drawing** or
  Enter to finish, and **Cancel tool** or Escape to cancel. Shift constrains line
  segments. The same visible controls work without a keyboard.

Tools include an existing-record picker for places, characters and map links,
building stamps, dungeon sprites, quick shapes, and templates. **Layers** opens
the layer panel. On smaller screens these panels appear as collapsible sheets
over the map instead of pushing the canvas below a long list of tools.

The toolbar shows the destination layer and snap setting. Grid spacing uses
square map units, including on rectangular canvases. The current image's pixel
dimensions, or the schematic canvas dimensions, define those units. Existing
stored marker coordinates remain percentages.

## Reusable marker styles

**Edit map → Styles** opens the style library. Built-in styles include Capital,
Settlement, Dungeon entrance, Quest location, Inn, Woodland, District, Road and
River. Search by name, filter by point/area/path, and star favorites. Choosing
**Place** starts point placement or the appropriate area/path drawing tool.
The toolbar identifies the active style; cancelling the tool clears it.

Marker properties include a compatible **Marker style** picker and **Save
appearance as style**. Custom styles can capture point icons, uploaded stamp
artwork and size, colors, shape opacity and label visibility. Ordinary point
colors are now respected in the editor and flattened exports. Styles preserve
marker IDs, names, links, coordinates, layers, audience, fog and masks. Applying a
symbol style replaces existing stamp artwork; applying an image style replaces
the symbol. Point styles do not turn shapes into points, or vice versa.

Styles copy appearance into each marker. Renaming or deleting a library style
does not alter previously placed items. Custom styles and favorites are scoped
to the world in this browser. **Export styles** downloads JSON; **Import styles**
merges a validated library without silently replacing name/ID conflicts. Import
errors leave the current library intact. Export does not bundle PNGs; image
styles reference uploaded assets on the server, which must also exist when
transferring to a different server. Browser storage failures show a warning and
allow exporting the styles held for the current visit.

## Bulk property editing

Select multiple items, then choose **Edit selected** on the toolbar or **Tools →
Edit selected properties**. Every property starts unchanged. Choose a style or
explicit icon, color, shape opacity, stamp size, label visibility, marker
visibility or audience overrides. The dialog reports mixed current values and
how many items match a style's kind. A style applies first, then explicit
overrides. Icon changes apply to points, opacity to shapes, and size to stamps
(24–256 map units). Choosing a point symbol replaces stamp artwork.

**Apply to selected** stages one undoable edit, preserving geometry, record links,
IDs, layers and properties that were left unchanged. Locked items are excluded
and permissions are checked again when applying. Apply or discard any pending
single-marker properties before using bulk edits. Audience changes are explicit;
styles themselves never change visibility or DM-only settings. Save map still
persists the resulting draft.

## Full-screen editing

The toolbar's **Full screen** button expands the editor to the browser viewport,
hides the map header and covers the application navigation. The toolbar retains
Save map, Done editing and an **Exit full screen** control. Escape cancels an
active editing tool first; with no tool active, Escape exits full-screen editing.

The existing Leaflet canvas stays mounted, preserving zoom, selection and editing
state. A resize observer updates the map when the available space changes.
Mobile controls and the collapsible inspector remain available. Creation forms,
linked-record drawers and dialogs open above the canvas. Application navigation
is excluded from keyboard focus while covered; normal scrolling and navigation
return on exit. Done editing retains the existing save/keep/discard choices.

## Properties, layers and visibility

The marker inspector stays beside the map on desktop and becomes a collapsible
bottom sheet on phones. It includes a **Layer** selector, including **Unassigned**.
You can also right-click an existing item and use **Move to layer**. For several
items, use **Select multiple**, then **Layers → Move selected**. The layer panel
lists its items and an Unassigned group. Creating a layer selects it as the
destination for new items; it does not relocate existing items automatically.

**Apply to map** puts property changes in the map draft. **Save map** saves the
whole map, including any pending inspector properties. Switching to another item
or drawing while properties are unapplied offers apply, discard, or keep editing.
Saving and keeping a map draft also preserve pending properties. Marker IDs stay
fixed while editing existing markers.

Locked items cannot be changed through the canvas, context menu, inspector,
explorer order controls or batch operations. Unlock a layer before deleting it.
Hidden/locked layers cannot be chosen as destinations for new assignments.

**Show hidden / DM-only items** makes these items visible as editor ghosts. It
does not change their saved visibility or reveal them to players. Temporary
layer hiding and locks remain separate from saved Visible/DM Only settings,
player masks and fog reveal geometry.

## Selection and precision

**Tools → Select multiple** supports tapping/clicking items, Shift-clicking and
Shift-dragging a selection box on desktop. Drag a selected item to move the group.
Arrow keys nudge selected items by one map unit; Shift+arrow moves ten. Typing in
forms and menus does not trigger these shortcuts.

Duplication, alignment, rotation, mirroring and stamp resizing remain available.
Stamp bounds include their size and rotation. Group transformations use physical
map dimensions, so a 90° rotation preserves a shape's size on rectangular maps.
Transformed groups are shifted rigidly to fit; a transformation that cannot fit
is rejected rather than clipping individual vertices.

Undo/redo includes marker and layer changes, canvas size and its rescaled marker
positions, background changes, and fog settings. Uploaded asset files themselves
are retained independently of map undo.

## Save, discard and recovery

**Done editing** and internal navigation offer **Save map**, **Keep draft**,
**Discard changes**, or **Keep editing** when changes are pending. Reload/close
protection warns about pending edits. Browser history navigation can leave the
page; the saved browser draft remains available for recovery.

Map drafts are stored in local browser storage, scoped to world and map. They
include the original baseline, map edits and pending asset size settings, and
survive a tab closing. Returning to **Edit map** offers recovery or discarding
the stored draft. Older session-storage drafts are also offered for explicit
recovery; without an original baseline, they require review before replacing
saved fields. Drafts stay in that browser and do not synchronize across devices.
Storage failures show a warning and disable Keep draft.

Saving reloads the current record and merges changes by marker/layer ID and by
property. Unrelated newer work is preserved. Overlapping edits open **Resolve
conflicting map edits**, showing **Your draft** and **Saved map** for each field.
Choose **Use mine** or **Use saved** independently, or use the explicit all-mine /
all-saved shortcuts. **Save resolved map** stays disabled until every conflict has
a choice. **Keep editing** closes the comparison and retains your draft.

Deletion conflicts show **Deleted** rather than an empty value. Layer ordering
shows names in front-to-back order. Missing-layer choices explain whether an
assignment restores its layer or becomes Unassigned. Long text and complete
geometry remain readable in scrollable comparisons. On phones the two versions
stack vertically. Older drafts without a baseline require reviewing every
difference, rather than assuming that all old values should replace saved work.

The map API also checks the revision read before saving; a change arriving during
the request rejects that save and retains the draft. Retry Save map to merge the
latest record. Choices are tied to both the authored revision and the reviewed
draft. Generated timestamps on older maps do not repeat the prompt; further saved
or draft changes require a fresh review. If that change removes all overlaps, saving
stops with a notice to review the retained draft and save again; stale choices
never trigger a write. Unrelated edits are preserved regardless
of which side is chosen for conflicts.

The optional `_expected_revision` request field and `revision` response field do
not alter authored map YAML. The comparison runs under the existing API process
write lock. Older API clients remain compatible but do not gain revision
protection unless they send it. Multiple independent server processes and direct
filesystem writes are outside that process lock.

## Player preview and publishing

**Player View → Preview player map** renders the current map draft locally using
the actual export renderer. Player and DM previews share framing. Previewing does
not save the map or publish to the combat app. **Update Player View** remains an
explicit separate action.

Custom layer order and within-layer order now agree between editor and export.
Existing DM-only, fog, mask, sprite and paired-map publishing behavior is retained.

## Verification

From `frontend` on Node 24:

```sh
npm run test:map-editing
npm run test:map-export
npm run build
npm run lint
```

Start an isolated frontend on port 5191 and run `npm run test:map-editing-ui` for
browser regressions. `WORLD_BUILDER_TEST_URL` overrides the frontend URL and
`PLAYWRIGHT_BROWSERS_PATH` can select an existing test-browser installation.
The tests mock API traffic, including revision races, and never write a live
world or publish a live map. Screenshots go to the temporary directory under
`world-builder-map-editing-checks`.

Backend revision tests are in `tests/test_map_revisions.py`, including simultaneous
writers. Run the full Python suite with `uv run pytest -q`. A physical phone
keyboard/long-press check and live combat publish remain manual checks; browser
touch emulation and export pixel tests do not perform those actions.

Validation on 2026-10-27: 167 Python tests, 66 frontend unit tests, and all 25
map browser scenarios passed. The production build and frontend lint passed.
The browser suite also verifies conflict approval with changing generated
timestamps, touch placement, plain HTTP creation, and local export preview.

The marker-style expansion adds `tests/markerStyles.test.mjs` to the map editing
unit-test command. Browser coverage also includes style-library persistence and
transfer, point/shape placement, mixed bulk edits with one undo, and desktop/mobile
full-screen editing with nested drawers and draft navigation.

The existing entity-editing browser suite also passed after the drawer stacking
changes. Targeted Prettier checks and frontend/Node-test lint passed; desktop and
390px touch screenshots were reviewed for full-screen, style-library and bulk-edit
layout. Physical phone keyboard behavior and live publishing remain manual.

Conflict comparison is covered by `tests/mapConflicts.test.mjs` and six browser
scenarios for mixed field choices, revision changes during review, deletion,
legacy recovery and phone/full-screen layout.
