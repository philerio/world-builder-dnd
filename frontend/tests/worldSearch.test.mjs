import assert from "node:assert/strict";
import test from "node:test";
import { entityTypeLabel, locationBreadcrumbs } from "../src/utils/entityNavigation.ts";
import { buildSearchIndex, searchWorld } from "../src/utils/worldSearch.ts";

const record = (id, type, entity = {}) => ({ id, entity_type: type, entity: { id, name: id, ...entity } });
const records = [
  record("north", "kingdom", { name: "Northern Elligaesia" }),
  record("scarif", "kingdom", { name: "Scarif", political_level: "nation", parent_kingdom: "north", government_notes: "Council members elect the High Ruler" }),
  record("citadel", "city", { name: "Citadel City", kingdom: "scarif", description: "A fortress by the coast", tags: ["Imperial archive"], dm_notes: "The emerald vault is sealed" }),
  record("guide", "npc", { name: "Élan", city: "citadel", knowledge: ["Knows the harbor"], secrets: ["Carries a cipher"] }),
  record("map", "map", { name: "Citadel Map", entity_id: "citadel", image_path: "/assets/technical.png", markers: [{ id: "technical-marker-id", label: "Secret passage", dm_only: true }] }),
  record("campaign", "campaign", { name: "Coastal Campaign", story: { beats: [{ id: "technical-beat-id", name: "The missing courier", secrets: ["A silver signal"], description_content: { nodes: [{ type: "text", text: "The tide has turned" }] } }] } }),
  record("event", "world_event", { name: "A crisis", true_causes: ["technical-cause-id"], hidden_connections: ["technical-connection-id"] }),
];
const lookup = (id) => records.find((item) => item.id === id);
const summaries = records.map(({ id, entity_type, entity }) => ({ id, entity_type, name: entity.name }));
const index = buildSearchIndex(summaries, lookup);

test("breadcrumbs follow saved political and geographic links through cities, NPCs, and maps", () => {
  assert.deepEqual(locationBreadcrumbs(lookup("citadel"), lookup).map((item) => item.id), ["north", "scarif", "citadel"]);
  assert.deepEqual(locationBreadcrumbs(lookup("guide"), lookup).map((item) => item.id), ["north", "scarif", "citadel", "guide"]);
  assert.deepEqual(locationBreadcrumbs(lookup("map"), lookup).map((item) => item.id), ["north", "scarif", "citadel", "map"]);
  assert.equal(entityTypeLabel("kingdom", lookup("scarif").entity), "Nation");
  assert.equal(entityTypeLabel("kingdom", {}), "Kingdom");
});

test("missing and mistyped references stop safely, and containment cycles never repeat records", () => {
  assert.deepEqual(locationBreadcrumbs(record("orphan", "city", { kingdom: "missing" }), lookup).map((item) => item.id), ["orphan"]);
  assert.deepEqual(locationBreadcrumbs(record("bad", "city", { kingdom: "guide" }), lookup).map((item) => item.id), ["bad"]);
  const cycle = [record("a", "kingdom", { political_level: "nation", parent_kingdom: "b" }), record("b", "kingdom", { political_level: "nation", parent_kingdom: "a" })];
  assert.deepEqual(locationBreadcrumbs(cycle[0], (id) => cycle.find((item) => item.id === id)).map((item) => item.id), ["b", "a"]);
});

test("a conflicting region never inserts an unrecorded political relationship", () => {
  const extra = [record("region", "region", { kingdom: "north" }), record("port", "city", { region: "region", kingdom: "scarif" })];
  const find = (id) => extra.find((item) => item.id === id) ?? lookup(id);
  assert.deepEqual(locationBreadcrumbs(extra[1], find).map((item) => item.id), ["north", "scarif", "port"]);
  extra[0].entity.kingdom = "scarif";
  assert.deepEqual(locationBreadcrumbs(extra[1], find).map((item) => item.id), ["north", "scarif", "region", "port"]);
});

test("search finds descriptions, tags, government notes, and saved location paths", () => {
  assert.equal(searchWorld(index, "fortress")[0].id, "citadel");
  assert.equal(searchWorld(index, "ARCHIVE")[0].snippet.label, "Tags");
  assert.equal(searchWorld(index, "High Ruler")[0].id, "scarif");
  assert.equal(searchWorld(index, "Scarif fortress")[0].id, "citadel");
  assert.equal(searchWorld(index, "elan")[0].id, "guide");
  assert.equal(searchWorld(index, "not recorded anywhere").length, 0);
});

test("search separates Kingdom and Nation filters and ranks exact names ahead of prose", () => {
  assert.deepEqual(searchWorld(index, "", "Nation").map((item) => item.id), ["scarif"]);
  assert.deepEqual(searchWorld(index, "", "Kingdom").map((item) => item.id), ["north"]);
  assert.equal(searchWorld(index, "Scarif")[0].id, "scarif");
  assert.equal(searchWorld(index, "  CITADEL   CITY  ")[0].id, "citadel");
});

test("DM notes, nested secrets, and hidden map labels retain their visibility context", () => {
  assert.equal(searchWorld(index, "emerald")[0].snippet.dmOnly, true);
  assert.equal(searchWorld(index, "silver signal")[0].snippet.dmOnly, true);
  assert.equal(searchWorld(index, "Secret passage")[0].snippet.dmOnly, true);
  assert.equal(searchWorld(index, "cipher")[0].snippet.dmOnly, true);
  assert.equal(searchWorld(index, "tide has turned")[0].id, "campaign");
  assert.equal(searchWorld(index, "").some((result) => result.snippet?.dmOnly), false);
});

test("search avoids technical IDs and asset paths, bounds snippets, and tolerates missing record data", () => {
  assert.equal(searchWorld(index, "technical").length, 0);
  const fallback = buildSearchIndex([{ id: "unloaded", name: "Unloaded Record", entity_type: "lore" }], () => undefined);
  assert.equal(searchWorld(fallback, "unloaded")[0].id, "unloaded");
  const long = record("long", "lore", { details: `${"before ".repeat(100)}needle${" after".repeat(100)}` });
  const result = searchWorld(buildSearchIndex([{ id: "long", name: "Long", entity_type: "lore" }], () => long), "needle")[0];
  assert.match(result.snippet.text, /needle/);
  assert.ok(result.snippet.text.length <= 182);
});
