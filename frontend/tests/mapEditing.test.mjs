import assert from "node:assert/strict";
import test from "node:test";
import { markerBounds, sortMapMarkers, transformMapSelection, mergeMapDraft } from "../src/utils/mapEditing.ts";
import { createId } from "../src/utils/createId.ts";
import { mapDraftKey, readMapDraft, writeMapDraft, removeMapDraft } from "../src/utils/mapDrafts.ts";

const marker = (id, extra = {}) => ({ id, x: 40, y: 40, type: "point", visible: true, dm_only: false, ...extra });
const map = () => ({ id: "map", name: "Map", markers: [marker("first"), marker("second")], layers: [{ id: "places", name: "Places" }] });

test("map merging preserves unrelated fields, different markers, and independent fields on one marker", () => {
  const base = map(), mine = structuredClone(base), latest = structuredClone(base);
  mine.markers[0].x = 42;
  latest.markers[0].label = "Newer label";
  latest.markers[1].y = 80;
  latest.details = "Other device's notes";
  const merged = mergeMapDraft(base, mine, latest);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.map.markers[0].x, 42);
  assert.equal(merged.map.markers[0].label, "Newer label");
  assert.equal(merged.map.markers[1].y, 80);
  assert.equal(merged.map.details, latest.details);
  assert.equal(base.markers[0].x, 40);
});

test("map conflicts include edits versus deletion, same-field changes, and incompatible layer removal", () => {
  const base = map(), mine = structuredClone(base), latest = structuredClone(base);
  mine.markers[0].x = 43; latest.markers[0].x = 44;
  mine.markers.splice(1); latest.markers[1].label = "Keep newer work";
  mine.layers = []; latest.markers.push(marker("new", { layer_id: "places" }));
  const merged = mergeMapDraft(base, mine, latest);
  assert.ok(merged.conflicts.some((field) => field.includes("first · x")));
  assert.ok(merged.conflicts.some((field) => field.includes("second")));
  assert.ok(merged.conflicts.some((field) => field.includes("Layer removed")));
  assert.equal(merged.map.markers.find((item) => item.id === "new").layer_id, null);
});

test("local additions and deletions merge without deleting newer remote additions", () => {
  const base = map(), mine = structuredClone(base), latest = structuredClone(base);
  mine.markers = [mine.markers[0], marker("local")];
  latest.markers.push(marker("remote"));
  assert.deepEqual(mergeMapDraft(base, mine, latest).map.markers.map((item) => item.id), ["first", "remote", "local"]);
});

test("layer ordering takes precedence over per-layer z order and does not mutate input", () => {
  const source = { layers: [{ id: "front", name: "Front" }, { id: "back", name: "Back" }], markers: [marker("red", { layer_id: "front", z_index: 0 }), marker("blue", { layer_id: "back", z_index: 99 }), marker("unassigned", { z_index: 1000 })] };
  assert.deepEqual(sortMapMarkers(source).map((item) => item.id), ["unassigned", "blue", "red"]);
  assert.equal(source.markers[0].id, "red");
});

test("rotation uses map units and preserves shape size, identity and links on nonsquare maps", () => {
  const area = marker("room", { type: "area", entity_id: "city", points: [[55, 35], [75, 35], [75, 65], [55, 65]] });
  const rotated = transformMapSelection([area], [area.id], "rotate-right", { width: 1000, height: 700 })[0];
  const bounds = markerBounds(rotated);
  assert.ok(Math.abs((bounds.maxX - bounds.minX) * 10 - 210) < 0.000001);
  assert.ok(Math.abs((bounds.maxY - bounds.minY) * 7 - 200) < 0.000001);
  assert.equal(rotated.id, "room"); assert.equal(rotated.entity_id, "city");
  assert.deepEqual(area.points[0], [55, 35]);
});

test("rotating near a boundary translates rigidly instead of clipping individual corners", () => {
  const room = marker("room", { type: "area", points: [[1, 30], [11, 30], [11, 80], [1, 80]] });
  const rotated = transformMapSelection([room], [room.id], "rotate-left", { width: 1000, height: 700 })[0];
  const bound = markerBounds(rotated);
  assert.ok(Math.abs(bound.minX) < 0.000001);
  assert.ok(Math.abs((bound.maxX - bound.minX) * 10 - 350) < 0.000001);
  const huge = marker("huge", { type: "area", points: [[0, 0], [100, 0], [100, 100], [0, 100]] });
  assert.throws(() => transformMapSelection([huge], [huge.id], "rotate-right", { width: 1000, height: 700 }), /will not fit/);
});

test("stamp bounds include footprint and rotation instead of the center alone", () => {
  const bound = markerBounds(marker("stamp", { icon_image: "stamp.png", icon_size: 100, rotation: 0 }), { width: 1000, height: 500 });
  assert.deepEqual(bound, { minX: 35, maxX: 45, minY: 30, maxY: 50 });
  assert.ok(markerBounds(marker("stamp", { icon_image: "stamp.png", icon_size: 100, rotation: 45 }), { width: 1000, height: 500 }).maxX > 45);
});

test("ID generation also produces unique UUIDs when randomUUID is unavailable", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const crypto = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { getRandomValues: (bytes) => crypto.getRandomValues(bytes) } });
  try {
    const ids = Array.from({ length: 40 }, () => createId());
    assert.equal(new Set(ids).size, 40);
    assert.ok(ids.every((id) => /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(id)));
  } finally { Object.defineProperty(globalThis, "crypto", original); }
});

test("map drafts keep their baseline, stay isolated by world, reject corruption, and report storage failures", () => {
  const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };
  const previous = globalThis.window;
  globalThis.window = { localStorage: storage(), sessionStorage: storage() };
  try {
    const base = map(); const draft = { version: 2, worldId: "one", base, map: { ...base, details: "Draft notes" }, stampSizes: [], savedAt: "now" };
    assert.equal(writeMapDraft(draft), true);
    assert.equal(readMapDraft("one", "map").base.details, undefined);
    assert.equal(readMapDraft("two", "map"), null);
    globalThis.window.localStorage.setItem(mapDraftKey("one", "map"), "broken JSON");
    assert.equal(readMapDraft("one", "map"), null);
    removeMapDraft("one", "map");
    globalThis.window.localStorage.setItem = () => { throw new Error("Quota"); };
    assert.equal(writeMapDraft(draft), false);
  } finally { globalThis.window = previous; }
});
