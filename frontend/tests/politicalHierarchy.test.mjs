import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPoliticalHierarchy } from "../src/utils/politicalHierarchy.ts";

test("nations belong to their explicit parent and legacy kingdoms remain roots", () => {
  const data = {
    kingdoms: [
      { id: "north", name: "Northern Elligaesia", capital: "citadel" },
      { id: "south", name: "Southern Kingdom", political_level: "kingdom" },
      { id: "scarif", name: "Scarif", political_level: "nation", parent_kingdom: "north", capital: "citadel" },
    ],
    cities: [
      { id: "citadel", name: "Citadel City", kingdom: "scarif" },
      { id: "direct", name: "Direct City", kingdom: "north" },
    ],
  };
  const { kingdoms } = buildPoliticalHierarchy(data);
  const north = kingdoms.find((branch) => branch.kingdom.id === "north");
  assert.deepEqual(north.nations.map(({ nation }) => nation.id), ["scarif"]);
  assert.deepEqual(north.nations[0].cities.map((city) => city.id), ["citadel"]);
  assert.deepEqual(north.cities.map((city) => city.id), ["direct"]);
  assert.equal(kingdoms.find((branch) => branch.kingdom.id === "south").nations.length, 0);
});

test("missing and invalid parents remain visible without inferred geography or cycles", () => {
  const data = {
    kingdoms: [
      { id: "north", name: "North", continent: "same" },
      { id: "unassigned", name: "Unassigned", political_level: "nation", continent: "same" },
      { id: "missing", name: "Missing", political_level: "nation", parent_kingdom: "deleted" },
      { id: "cycle", name: "Cycle", political_level: "nation", parent_kingdom: "cycle" },
    ], cities: [],
  };
  const result = buildPoliticalHierarchy(data);
  assert.equal(result.kingdoms[0].nations.length, 0);
  assert.deepEqual(result.unassignedNations.map(({ nation }) => nation.id), ["cycle", "missing", "unassigned"]);
});

test("branches sort by name without changing the world data", () => {
  const data = {
    kingdoms: [
      { id: "z", name: "Zed" },
      { id: "a", name: "Alpha" },
      { id: "nz", name: "Z Nation", political_level: "nation", parent_kingdom: "a" },
      { id: "na", name: "A Nation", political_level: "nation", parent_kingdom: "a" },
    ],
    cities: [{ id: "z-city", name: "Z City", kingdom: "na" }, { id: "a-city", name: "A City", kingdom: "na" }],
  };
  const original = structuredClone(data);
  const result = buildPoliticalHierarchy(data);
  assert.deepEqual(result.kingdoms.map(({ kingdom }) => kingdom.id), ["a", "z"]);
  assert.deepEqual(result.kingdoms[0].nations.map(({ nation }) => nation.id), ["na", "nz"]);
  assert.deepEqual(result.kingdoms[0].nations[0].cities.map((city) => city.id), ["a-city", "z-city"]);
  assert.deepEqual(data, original);
});
