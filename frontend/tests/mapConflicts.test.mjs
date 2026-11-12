import assert from "node:assert/strict";
import test from "node:test";
import { mergeMapDraft } from "../src/utils/mapEditing.ts";
import { formatMapConflictValue } from "../src/utils/mapConflicts.ts";

const marker = (id, extra = {}) => ({
  id,
  label: id,
  x: 20,
  y: 30,
  type: "point",
  visible: true,
  dm_only: false,
  ...extra,
});
const map = () => ({
  id: "map",
  name: "Map",
  markers: [marker("beacon", { layer_id: "places", fill_color: "#111111" })],
  layers: [{ id: "places", name: "Places" }],
});
const choicesFor = (review, choose) =>
  Object.fromEntries(
    review.conflictDetails.map((conflict) => [conflict.id, choose(conflict)]),
  );

test("field choices mix mine and saved while preserving unrelated newer and local edits", () => {
  const base = map(),
    mine = structuredClone(base),
    latest = structuredClone(base);
  mine.markers[0].label = "My label";
  mine.markers[0].fill_color = "#222222";
  mine.markers[0].x = 45;
  latest.markers[0].label = "Saved label";
  latest.markers[0].fill_color = "#333333";
  latest.markers[0].y = 65;
  latest.details = "Newer unrelated note";
  const original = structuredClone({ base, mine, latest });
  const review = mergeMapDraft(base, mine, latest);
  assert.equal(review.conflictDetails.length, 2);
  const label = review.conflictDetails.find(
    (conflict) => conflict.field === "label",
  );
  assert.equal(label.mine, "My label");
  assert.equal(label.saved, "Saved label");
  assert.ok(label.label.includes("My label"));
  const choices = choicesFor(review, (conflict) =>
    conflict.field === "label" ? "mine" : "saved",
  );
  const result = mergeMapDraft(base, mine, latest, { choices }).map;
  assert.equal(result.markers[0].label, "My label");
  assert.equal(result.markers[0].fill_color, "#333333");
  assert.equal(result.markers[0].x, 45);
  assert.equal(result.markers[0].y, 65);
  assert.equal(result.details, latest.details);
  assert.deepEqual({ base, mine, latest }, original);
});

test("choosing saved restores a removed property without reverting unrelated changes", () => {
  const base = map(),
    mine = structuredClone(base),
    latest = structuredClone(base);
  base.description = "Original";
  mine.description = undefined;
  mine.markers[0].x = 42;
  latest.description = "Newer description";
  const review = mergeMapDraft(base, mine, latest);
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "saved"),
    }).map.description,
    "Newer description",
  );
  const local = mergeMapDraft(base, mine, latest, {
    choices: choicesFor(review, () => "mine"),
  }).map;
  assert.equal(local.description, undefined);
  assert.equal(local.markers[0].x, 42);
});

test("whole-item choices handle saved deletions, local deletions and conflicting additions", () => {
  const base = map(),
    mine = structuredClone(base),
    latest = structuredClone(base);
  mine.markers[0].label = "Keep my edited marker";
  latest.markers = [];
  let review = mergeMapDraft(base, mine, latest);
  assert.equal(review.conflictDetails[0].saved, undefined);
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "saved"),
    }).map.markers.length,
    0,
  );
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "mine"),
    }).map.markers[0].id,
    "beacon",
  );
  mine.markers = [];
  latest.markers = [marker("beacon", { label: "Saved edit" })];
  review = mergeMapDraft(base, mine, latest);
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "saved"),
    }).map.markers[0].label,
    "Saved edit",
  );
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "mine"),
    }).map.markers.length,
    0,
  );
  mine.markers = [marker("new", { label: "My new marker" })];
  latest.markers = [marker("new", { label: "Saved new marker" })];
  base.markers = [];
  review = mergeMapDraft(base, mine, latest);
  assert.equal(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "saved"),
    }).map.markers[0].label,
    "Saved new marker",
  );
});

test("layer order choices retain additions from both versions", () => {
  const base = map();
  base.layers = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() }));
  base.markers = [];
  const mine = {
    ...base,
    layers: [
      base.layers[1],
      base.layers[0],
      base.layers[2],
      { id: "local", name: "Local" },
    ],
  };
  const latest = {
    ...base,
    layers: [
      base.layers[0],
      base.layers[2],
      base.layers[1],
      { id: "remote", name: "Remote" },
    ],
  };
  const review = mergeMapDraft(base, mine, latest);
  assert.deepEqual(review.conflictDetails[0].mine, ["B", "A", "C", "Local"]);
  assert.deepEqual(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "mine"),
    }).map.layers.map((layer) => layer.id),
    ["b", "a", "c", "local", "remote"],
  );
  assert.deepEqual(
    mergeMapDraft(base, mine, latest, {
      choices: choicesFor(review, () => "saved"),
    }).map.layers.map((layer) => layer.id),
    ["a", "c", "b", "remote", "local"],
  );
});

test("removed layer review explicitly restores saved assignments or moves them to Unassigned", () => {
  const base = map(),
    mine = structuredClone(base),
    latest = structuredClone(base);
  mine.layers = [];
  mine.markers[0].layer_id = null;
  latest.markers.push(marker("new", { layer_id: "places" }));
  const review = mergeMapDraft(base, mine, latest);
  assert.equal(review.conflictDetails[0].kind, "layer");
  const local = mergeMapDraft(base, mine, latest, {
    choices: choicesFor(review, () => "mine"),
  }).map;
  assert.deepEqual(local.layers, []);
  assert.equal(local.markers[1].layer_id, null);
  const saved = mergeMapDraft(base, mine, latest, {
    choices: choicesFor(review, () => "saved"),
  }).map;
  assert.equal(saved.layers[0].id, "places");
  assert.equal(saved.markers[1].layer_id, "places");
  assert.equal(saved.markers[0].layer_id, null);
});

test("local new markers can restore their layer after a saved layer deletion", () => {
  const base = map(),
    mine = structuredClone(base),
    latest = structuredClone(base);
  mine.markers.push(marker("local", { layer_id: "places" }));
  latest.layers = [];
  latest.markers[0].layer_id = null;
  const review = mergeMapDraft(base, mine, latest);
  const local = mergeMapDraft(base, mine, latest, {
    choices: choicesFor(review, () => "mine"),
  }).map;
  assert.equal(local.layers[0].id, "places");
  assert.equal(local.markers[1].layer_id, "places");
  const saved = mergeMapDraft(base, mine, latest, {
    choices: choicesFor(review, () => "saved"),
  }).map;
  assert.equal(saved.markers[1].layer_id, null);
  assert.deepEqual(saved.layers, []);
});

test("older drafts without a baseline require review for every difference", () => {
  const latest = map(),
    mine = structuredClone(latest);
  mine.name = "Older name";
  mine.markers[0].label = "Older marker";
  mine.markers.push(marker("new"));
  const review = mergeMapDraft(mine, mine, latest, { legacy: true });
  assert.equal(review.conflictDetails.length, 3);
  assert.deepEqual(
    mergeMapDraft(mine, mine, latest, {
      legacy: true,
      choices: choicesFor(review, () => "saved"),
    }).map,
    latest,
  );
  assert.equal(
    mergeMapDraft(mine, mine, latest, {
      legacy: true,
      choices: choicesFor(review, () => "mine"),
    }).map.markers.length,
    2,
  );
});

test("comparison values distinguish absence, empty text and false without truncating content", () => {
  assert.equal(formatMapConflictValue(undefined), "Removed / not present");
  assert.equal(formatMapConflictValue(null), "Not set");
  assert.equal(formatMapConflictValue(""), "Empty");
  assert.equal(formatMapConflictValue(false), "No");
  const text = "Long note\n".repeat(200);
  assert.equal(formatMapConflictValue(text), text);
  assert.equal(
    formatMapConflictValue([
      [1, 2],
      [3, 4],
    ]),
    "1. 1, 2\n2. 3, 4",
  );
});

test("layer IDs cannot collide with the separate layer-order choice", () => {
  const base = map();
  base.markers = [];
  base.layers = ["order", "a", "b", "c"].map((id) => ({ id, name: id }));
  const mine = {
    ...base,
    layers: [base.layers[2], base.layers[1], base.layers[3]],
  };
  const latest = {
    ...base,
    layers: [
      { ...base.layers[0], name: "Saved name" },
      base.layers[1],
      base.layers[3],
      base.layers[2],
    ],
  };
  const review = mergeMapDraft(base, mine, latest);
  assert.equal(review.conflictDetails.length, 2);
  assert.equal(
    new Set(review.conflictDetails.map((conflict) => conflict.id)).size,
    2,
  );
  const choices = choicesFor(review, (conflict) =>
    conflict.kind === "order" ? "mine" : "saved",
  );
  const saved = mergeMapDraft(base, mine, latest, { choices }).map;
  assert.deepEqual(
    saved.layers.map((layer) => layer.id),
    ["b", "a", "c", "order"],
  );
  assert.equal(saved.layers.at(-1).name, "Saved name");
});
