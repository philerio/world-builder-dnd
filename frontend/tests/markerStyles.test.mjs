import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMarkerStyle,
  BUILTIN_MARKER_STYLES,
  cleanAppearance,
  mergeMarkerStyleLibraries,
  parseMarkerStyleLibrary,
  patchMarkerProperties,
  styleFromMarker,
} from "../src/utils/markerStyles.ts";

const marker = (extra = {}) => ({
  id: "beacon",
  type: "point",
  x: 15,
  y: 32,
  entity_id: "citadel",
  linked_map: "city-map",
  layer_id: "places",
  label: "Citadel",
  visible: false,
  dm_only: true,
  ...extra,
});
test("saved styles capture appearance while excluding canon, links, geometry and audience", () => {
  const source = marker({
    icon: "castle",
    fill_color: "#abcdef",
    tooltip: "Private note",
    player_view_mask: true,
    fog_reveal: true,
  });
  const style = styleFromMarker(source, "capital", "  Capital style  ");
  assert.equal(style.name, "Capital style");
  assert.deepEqual(style.appearance, {
    icon: "castle",
    fill_color: "#abcdef",
    hide_label: false,
  });
  const next = applyMarkerStyle(source, {
    ...style,
    appearance: { icon: "city", fill_color: "#112233" },
  });
  assert.deepEqual(next, { ...source, icon: "city", fill_color: "#112233" });
  assert.equal(source.icon, "castle");
});
test("styles preserve shape geometry and never convert incompatible kinds", () => {
  const area = marker({
    type: "area",
    points: [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    fill_opacity: 0.8,
  });
  assert.equal(applyMarkerStyle(area, BUILTIN_MARKER_STYLES[0]), area);
  const style = BUILTIN_MARKER_STYLES.find(
    (item) => item.id === "builtin:woodland",
  );
  assert.deepEqual(applyMarkerStyle(area, style).points, area.points);
  assert.equal(applyMarkerStyle(area, style).fill_opacity, 0.3);
  assert.equal(applyMarkerStyle(area, style).dm_only, true);
});
test("symbol and image styles replace each other's artwork without rotating existing placements", () => {
  const source = marker({
    icon_image: "/map-sprites/tree.png",
    rotation: 90,
    mirror_x: true,
  });
  const symbol = applyMarkerStyle(source, BUILTIN_MARKER_STYLES[0]);
  assert.equal(symbol.icon_image, undefined);
  assert.equal(symbol.rotation, 90);
  const style = styleFromMarker(source, "tree", "Tree");
  const image = applyMarkerStyle(symbol, style);
  assert.equal(image.icon_image, source.icon_image);
  assert.equal(image.icon, undefined);
  assert.equal(image.mirror_x, true);
});
test("bulk changes leave unspecified properties and incompatible marker properties alone", () => {
  const point = marker({ icon: "forest", fill_opacity: 0.2 });
  const area = marker({
    type: "area",
    icon: undefined,
    points: [
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    fill_opacity: 0.2,
  });
  const patch = {
    icon: "city",
    fill_color: "#334455",
    fill_opacity: 0.6,
    hide_label: true,
  };
  const nextPoint = patchMarkerProperties(point, patch),
    nextArea = patchMarkerProperties(area, patch);
  assert.equal(nextPoint.fill_opacity, 0.2);
  assert.equal(nextPoint.icon, "city");
  assert.equal(nextArea.icon, undefined);
  assert.equal(nextArea.fill_opacity, 0.6);
  for (const next of [nextPoint, nextArea]) {
    assert.equal(next.visible, false);
    assert.equal(next.dm_only, true);
    assert.equal(next.id, "beacon");
    assert.equal(next.entity_id, "citadel");
  }
  assert.equal(patchMarkerProperties(point, { dm_only: false }).dm_only, false);
  assert.equal(patchMarkerProperties(point, { visible: true }).visible, true);
});
test("import validates sizes, colors and asset paths and strips unrelated fields", () => {
  assert.throws(
    () =>
      cleanAppearance({ fill_color: "red;background:url(example)" }, "point"),
    /hex color/,
  );
  assert.throws(
    () =>
      cleanAppearance({ icon_image: "https://example.com/image.png" }, "point"),
    /uploaded/,
  );
  assert.throws(
    () => cleanAppearance({ icon_image: "/map-assets/../image.png" }, "point"),
    /uploaded/,
  );
  assert.throws(
    () => cleanAppearance({ icon_size: 257 }, "point"),
    /24 to 256/,
  );
  assert.throws(
    () => cleanAppearance({ fill_opacity: NaN }, "area"),
    /Opacity/,
  );
  assert.deepEqual(
    cleanAppearance(
      { id: "wrong", dm_only: false, x: 99, icon: "city" },
      "point",
    ),
    { icon: "city" },
  );
  assert.throws(() => parseMarkerStyleLibrary("{}"), /version 1/);
});
test("style imports merge without replacing existing presets and reject name or ID conflicts atomically", () => {
  const first = styleFromMarker(marker(), "first", "First"),
    second = styleFromMarker(marker(), "second", "Second");
  const current = {
    version: 1,
    styles: [first],
    favorites: ["builtin:capital"],
  };
  const incoming = { version: 1, styles: [second], favorites: ["second"] };
  assert.deepEqual(mergeMarkerStyleLibraries(current, incoming).styles, [
    first,
    second,
  ]);
  assert.deepEqual(mergeMarkerStyleLibraries(current, incoming).favorites, [
    "builtin:capital",
    "second",
  ]);
  assert.equal(mergeMarkerStyleLibraries(current, current).styles.length, 1);
  assert.throws(
    () =>
      mergeMarkerStyleLibraries(current, {
        ...incoming,
        styles: [{ ...second, name: "First" }],
      }),
    /conflicts/,
  );
  assert.throws(
    () =>
      parseMarkerStyleLibrary(
        JSON.stringify({
          ...current,
          styles: [first, { ...second, name: "FIRST" }],
        }),
      ),
    /already exists/,
  );
  assert.deepEqual(current.styles, [first]);
  assert.deepEqual(
    parseMarkerStyleLibrary(
      JSON.stringify({
        ...current,
        favorites: ["bogus", "builtin:capital", "builtin:capital"],
      }),
    ).favorites,
    ["builtin:capital"],
  );
});
