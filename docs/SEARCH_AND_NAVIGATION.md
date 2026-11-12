# World search and location navigation

Open **Search world** or press **Ctrl+K / ⌘K** outside a text field. Search matches names, descriptions, tags, notes, and nested story text. Results show a record's type, its saved location path when available, and a short matching excerpt. Exact names rank first; all words in a query must match somewhere in the record or its location path. Search ignores case and accents.

Use **Record type** to narrow results. Nations and kingdoms have separate labels and filters while retaining their existing shared backend entity type. Results are limited to 80 at a time; refine the query to see others. Closing search resets the query and filter for the next visit.

This is a DM tool. DM notes, secrets, NPC scene knowledge, and hidden/DM-only map labels carry a **DM only** excerpt label. Search results do not grant player knowledge, reveal map markers, or alter story/campaign state. Scratchpad ideas remain scratchpad entries. The index uses the loaded world data and updates when the shared entity state changes; it does not add a backend search service or index technical IDs and asset paths.

Clickable location breadcrumbs appear in entity details and the home dashboard's current location. They follow existing references such as **Northern Elligaesia → Scarif → Citadel City**, and can extend to an NPC or linked map. Opening an ancestor uses the existing detail drawer and back history.

Paths use saved containment/location references only. They do not infer a parent from a capital, name, or nearby map marker. Missing or mistyped parents stop the path; cycles stop before repeating a record. A city/location's explicit political territory takes precedence over a region linked to a different territory. A character's recorded city is its most specific location. Secondary location fields remain visible in the normal details even when they are not part of the breadcrumb path.

## Verification

From `frontend` with Node 24:

```sh
npm run test:search
npm run build
npm run lint
```

For browser checks, start a separate frontend with `npm run dev -- --host 127.0.0.1 --port 5191 --strictPort`, then run `npm run test:search-ui`. Use `WORLD_BUILDER_TEST_URL` for another frontend address and `PLAYWRIGHT_BROWSERS_PATH` if browser binaries are stored outside the default location. The browser test mocks all API traffic, rejects world writes, and covers text/secret/tag matching, filters, keyboard selection, breadcrumb back navigation, empty results, and a short mobile viewport. It does not exercise a physical phone keyboard. Screenshots are saved under the system temporary directory in `world-builder-search-checks`.
