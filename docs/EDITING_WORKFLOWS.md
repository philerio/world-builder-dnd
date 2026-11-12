# Creating related records and recovering drafts

Kingdom and nation details offer **Create capital city** when no capital is
recorded. The creation form starts with that political territory selected.
**Create and set capital** creates the city and updates the parent record's
capital. It does not also change the capital of a parent kingdom or another
nation. Existing capitals remain editable through the ordinary entity form.

If city creation succeeds but linking fails, the form offers **Retry linking**
and reuses the created city. Closing after such a failure keeps the city in the
world; it can be selected as a capital through the ordinary edit form.

An unlinked map marker offers **Create a city or location**. When available,
the form starts with the political territory and region recorded on the map's
linked entity. Creating the place selects it in the marker inspector. Use
**Apply to map** to stage the marker's link, followed by **Save map**; Save map
also includes pending inspector properties. See [MAP_EDITING_WORKFLOW.md](MAP_EDITING_WORKFLOW.md)
for layers, placement, recovery and conflict handling. Discarding marker or
map changes does not delete the newly created place.

## Drafts

Entity creation and editing keep unfinished changes in browser-local storage.
Closing, cancelling, or going back while an edit is dirty offers **Keep editing**,
**Keep draft**, or **Discard**. Changing the type of an unfinished new entity
asks before discarding its current form.

Reopening the same creation context or choosing **Edit** on the same entity
recovers its draft. Successful saves and explicit discards clear that draft.
Drafts are separated by world ID, entity ID, and creation context. They stay in
the browser and origin where they were written; they do not synchronize between
the Steam Deck, a phone, and another computer. Clearing browser storage removes
them. When storage is unavailable or full, the form shows a warning and does
not offer to keep a draft.

Before saving an existing entity, the editor reloads its saved record. It applies
only fields changed in the draft, preserving unrelated newer fields. Conflicting
changes to the same field require an explicit choice before saving. Arrays such
as political offices are treated as a single field. This is a client-side check;
the API does not provide an atomic revision check against simultaneous writes.

Entity creation, entity editing, and marker editing keep their action buttons
outside their scrolling forms. On narrow or touch screens, their drawers follow
the visual viewport when the browser reports keyboard resizing or panning.

## Verification

From `frontend`, run `npm run test:editing` for storage, recovery, conflict
merging, and create/link retry checks. Run the normal frontend build and lint
checks and the repository's Python tests before release.

For the browser checks, install the test browser once with
`npx playwright install chromium --only-shell`. Start the frontend with
`npm run dev -- --host 127.0.0.1 --port 5191 --strictPort` in one terminal,
then run `npm run test:editing-ui` in another. `WORLD_BUILDER_TEST_URL` can
point the checks at another development-server URL.

The browser checks mock API requests and use a separate test world; no backend
is required, and no campaign data is written. They cover close/discard/recover,
failed linking, conflict confirmation, new records appearing in selectors, map
draft persistence, and narrow/short viewports including simulated visual viewport
changes. Screenshots are written to the operating system's temporary directory
under `world-builder-editing-checks`. A physical mobile-keyboard check remains
useful because browser viewport emulation cannot reproduce every keyboard.
