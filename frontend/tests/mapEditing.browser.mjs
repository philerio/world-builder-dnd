/* global window, document */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-map-editing-checks");
await mkdir(screenshots, { recursive: true });
const marker = (id, x, y, extra = {}) => ({
  id,
  x,
  y,
  label: id,
  entity_id: null,
  type: "point",
  visible: true,
  dm_only: false,
  hide_label: false,
  icon: "location",
  ...extra,
});
const draftKey = "world-builder:map-draft:v2:map-review:review-map";
function fixture() {
  return {
    world: {
      id: "map-review",
      name: "Review World",
      version: "1",
      author: "Test",
      continents: [],
    },
    continents: [],
    kingdoms: [],
    regions: [],
    cities: [
      { id: "archive", name: "Archive", description: "An existing city" },
    ],
    locations: [],
    npcs: [],
    player_characters: [],
    campaigns: [],
    world_events: [],
    timeline_events: [],
    lores: [],
    artifacts: [],
    world_stories: [],
    dm_scratchpad_entries: [],
    price_lists: [],
    maps: [
      {
        id: "review-map",
        name: "Review Map",
        canvas_width: 1000,
        canvas_height: 700,
        layers: [{ id: "places", name: "Places" }],
        markers: [
          marker("Beacon", 25, 45),
          marker("DM secret", 80, 20, { dm_only: true }),
          marker("Hidden beacon", 80, 80, { visible: false }),
          marker("Room", 55, 35, {
            type: "area",
            layer_id: "places",
            points: [
              [55, 35],
              [75, 35],
              [75, 65],
              [55, 65],
            ],
            fill_color: "#7b9b91",
            fill_opacity: 0.35,
          }),
        ],
      },
    ],
  };
}
const browser = await chromium.launch({ headless: true });
async function setup(options = {}) {
  const world = fixture(),
    writes = [],
    errors = [];
  let revision = 0,
    race = false,
    varyTimestamps = false,
    timestampCount = 0;
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: options.height ?? 1000 },
    hasTouch: options.touch ?? false,
  });
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.slice(4);
      if (path === "/world") return route.fulfill({ json: world });
      if (path === "/validation")
        return route.fulfill({
          json: { errors: [], warnings: [], valid: true },
        });
      if (path === "/entities")
        return route.fulfill({
          json: [
            ...world.maps.map((map) => ({
              id: map.id,
              entity_type: "map",
              name: map.name,
            })),
            ...world.cities.map((city) => ({
              id: city.id,
              entity_type: "city",
              name: city.name,
            })),
          ],
        });
      if (path === "/map-assets" || path === "/map-sprites")
        return route.fulfill({ json: { assets: [] } });
      if (path === "/entities/review-map") {
        if (request.method() === "PUT") {
          const body = request.postDataJSON();
          if (body._expected_revision !== `r${revision}`)
            return route.fulfill({
              status: 409,
              json: {
                detail:
                  "The map changed while saving. Retry to merge the latest version.",
              },
            });
          delete body._expected_revision;
          writes.push(structuredClone(body));
          world.maps[0] = body;
          revision++;
        }
        const response = {
          id: "review-map",
          entity_type: "map",
          entity: structuredClone(world.maps[0]),
          revision: `r${revision}`,
        };
        if (varyTimestamps && request.method() === "GET")
          response.entity.updated = new Date(
            Date.now() + ++timestampCount * 1000,
          ).toISOString();
        if (race && request.method() === "GET") {
          race = false;
          world.maps[0].details = "Arrived during the save";
          revision++;
        }
        return route.fulfill({ json: response });
      }
      if (path === "/entities/archive")
        return route.fulfill({
          json: { id: "archive", entity_type: "city", entity: world.cities[0] },
        });
      if (path.endsWith("/relationships"))
        return route.fulfill({ json: { incoming: [], outgoing: [] } });
      return route.fulfill({ json: [] });
    }
    if (url.hostname === "map-editing.test")
      return route.fulfill({
        response: await context.request.get(
          `${base}${url.pathname}${url.search}`,
        ),
      });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `${options.insecure ? "http://map-editing.test:5191" : base}/maps?map=review-map`,
  );
  await page.getByRole("button", { name: "Edit map", exact: true }).waitFor();
  return {
    page,
    context,
    world,
    writes,
    errors,
    remote: (change) => {
      change(world.maps[0]);
      revision++;
    },
    raceNextSave: () => {
      race = true;
    },
    varyMetadata: () => {
      varyTimestamps = true;
    },
  };
}
const draft = (page) =>
  page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "null")?.map,
    draftKey,
  );
const toolbar = (page) =>
  page.getByRole("region", { name: "Map tools", exact: true });
const inspector = (page) =>
  page.getByRole("region", { name: "Marker properties", exact: true });
const point = (page, name = "Beacon") =>
  page.locator(`.leaflet-marker-icon[title="${name}"]`);
const begin = async (page) => {
  await page.getByRole("button", { name: "Edit map", exact: true }).click();
  await toolbar(page).waitFor();
};
const layers = async (page) => {
  const tab = page.getByRole("tab", { name: "Layers", exact: true });
  if (!(await tab.isVisible()))
    await toolbar(page)
      .getByRole("button", { name: "Layers", exact: true })
      .click();
  await tab.click();
};
const tools = async (page) => {
  const tab = page.getByRole("tab", { name: "Tools", exact: true });
  if (!(await tab.isVisible()))
    await toolbar(page)
      .getByRole("button", { name: "Map controls", exact: true })
      .click();
  await tab.click();
};
const save = async (page) => {
  await toolbar(page)
    .getByRole("button", { name: "Save map", exact: true })
    .click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[role="status"]')].some((node) =>
      node.textContent.includes("Map saved"),
    ),
  );
};
const choose = async (page, combo, option) => {
  await combo.click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await page
    .getByRole("option", { name: option, exact: true })
    .waitFor({ state: "hidden" });
};
const placedCounts = new WeakMap();
const place = async (page) => {
  const count = placedCounts.get(page) ?? 0;
  placedCounts.set(page, count + 1);
  await toolbar(page)
    .getByRole("button", { name: "Place point", exact: true })
    .click();
  await page
    .locator(".leaflet-container")
    .click({ position: { x: 100 + count * 50, y: 150 } });
  await inspector(page).waitFor();
};
async function check(name, action, options) {
  if (
    process.env.WORLD_BUILDER_MAP_TEST_FILTER &&
    !name.includes(process.env.WORLD_BUILDER_MAP_TEST_FILTER)
  )
    return;
  const session = await setup(options);
  try {
    await action(session);
    assert.deepEqual(session.errors, []);
    console.log(`PASS ${name}`);
  } catch (error) {
    console.log(
      "FAILED",
      name,
      "PAGE",
      await session.page.locator("body").innerText(),
      "ERRORS",
      session.errors,
    );
    await session.page.screenshot({
      path: join(screenshots, "failure.png"),
      fullPage: true,
    });
    throw error;
  } finally {
    await session.context.close();
  }
}

try {
  await check(
    "single marker layer, Unassigned, batch assignment, and saved IDs",
    async ({ page, writes }) => {
      await begin(page);
      await layers(page);
      await page
        .getByRole("textbox", { name: "New layer name", exact: true })
        .fill("Settlements");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await choose(
        page,
        inspector(page).getByRole("combobox", { name: "Layer", exact: true }),
        "Settlements",
      );
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      const destination = (await draft(page)).layers.find(
        (layer) => layer.name === "Settlements",
      ).id;
      assert.equal((await draft(page)).markers[0].layer_id, destination);
      await point(page).click();
      await choose(
        page,
        inspector(page).getByRole("combobox", { name: "Layer", exact: true }),
        "Unassigned",
      );
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      assert.equal((await draft(page)).markers[0].layer_id, null);
      await tools(page);
      await page
        .getByRole("button", { name: "Select multiple", exact: true })
        .click();
      await point(page).click();
      await layers(page);
      await choose(
        page,
        page.getByRole("combobox", { name: "Move 1 selected", exact: true }),
        "Settlements",
      );
      await tools(page);
      await point(page).click();
      await layers(page);
      await choose(
        page,
        page.getByRole("combobox", { name: "Move 1 selected", exact: true }),
        "Unassigned",
      );
      assert.equal((await draft(page)).markers[0].layer_id, null);
      await save(page);
      assert.equal(writes.at(-1).markers[0].id, "Beacon");
      await page.screenshot({ path: join(screenshots, "desktop-layers.png") });
    },
  );
  await check(
    "locks reject context menus, explorer edits, and item mutation",
    async ({ page }) => {
      await begin(page);
      await layers(page);
      await page
        .getByRole("button", { name: "Lock Places", exact: true })
        .click();
      await page
        .locator("path.leaflet-interactive")
        .first()
        .click({ button: "right" });
      assert.equal(
        await page
          .getByRole("menuitem", { name: "Edit Marker", exact: true })
          .isVisible(),
        false,
      );
      await tools(page);
      await page
        .getByRole("button", { name: "Place entity", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Edit Room", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", {
            name: "Bring Room to front within its layer",
            exact: true,
          })
          .isDisabled(),
        true,
      );
    },
  );
  await check(
    "hidden and DM-only items are editable ghosts without changing saved visibility",
    async ({ page }) => {
      await begin(page);
      assert.equal(
        await page.locator(".leaflet-marker-icon.campaign-map-marker").count(),
        1,
      );
      await layers(page);
      await page
        .getByRole("switch", {
          name: "Show hidden / DM-only items",
          exact: true,
        })
        .check();
      assert.equal(
        await page.locator(".leaflet-marker-icon.campaign-map-marker").count(),
        3,
      );
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page, "DM secret (DM only)").click();
      assert.equal(
        await inspector(page)
          .getByRole("switch", { name: "DM Only", exact: true })
          .isChecked(),
        true,
      );
      await inspector(page)
        .getByRole("button", { name: "Close marker editor" })
        .click();
      await page
        .getByRole("button", { name: "Done editing", exact: true })
        .click();
      assert.equal(
        await page.locator(".leaflet-marker-icon.campaign-map-marker").count(),
        1,
      );
    },
  );
  await check(
    "drawing finishes by Enter and touch button, Escape cancels point placement",
    async ({ page }) => {
      await begin(page);
      await tools(page);
      await page.getByRole("button", { name: "Path", exact: true }).click();
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 100, y: 150 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 200, y: 200 } });
      await page.keyboard.press("Enter");
      assert.equal((await draft(page)).markers.at(-1).type, "path");
      await toolbar(page)
        .getByRole("button", { name: "Draw area", exact: true })
        .click();
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 100, y: 250 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 200, y: 250 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 150, y: 350 } });
      await toolbar(page)
        .getByRole("button", { name: "Finish drawing", exact: true })
        .click();
      assert.equal((await draft(page)).markers.at(-1).type, "area");
      await toolbar(page)
        .getByRole("button", { name: "Place point", exact: true })
        .click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .getByRole("button", { name: "Cancel point placement", exact: true })
          .isVisible(),
        false,
      );
    },
  );
  await check(
    "canvas and fog undo restore coherent map state, rotation uses physical units",
    async ({ page }) => {
      await begin(page);
      await choose(
        page,
        page.getByRole("combobox", { name: "Workspace", exact: true }),
        "Large city · 1600 × 1120",
      );
      assert.equal((await draft(page)).canvas_width, 1600);
      await toolbar(page)
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      assert.equal((await draft(page)).canvas_width, 1000);
      assert.equal((await draft(page)).markers[0].x, 25);
      await page.getByRole("tab", { name: "Player View", exact: true }).click();
      await page
        .getByRole("switch", { name: "Fog of war in Player View", exact: true })
        .check();
      assert.equal((await draft(page)).fog_of_war.enabled, true);
      await toolbar(page)
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      assert.equal((await draft(page)).fog_of_war?.enabled ?? false, false);
      await tools(page);
      await page
        .getByRole("button", { name: "Select multiple", exact: true })
        .click();
      await page.locator("path.leaflet-interactive").first().click();
      await page
        .getByRole("button", {
          name: "Rotate selected items clockwise",
          exact: true,
        })
        .click();
      const room = (await draft(page)).markers.find(
        (item) => item.id === "Room",
      );
      const width =
        (Math.max(...room.points.map(([x]) => x)) -
          Math.min(...room.points.map(([x]) => x))) *
        10;
      assert.ok(Math.abs(width - 210) < 0.00001);
    },
  );
  await check(
    "draft recovery preserves newer work and resolves overlapping edits explicitly",
    async ({ page, world, remote, writes, varyMetadata }) => {
      await begin(page);
      await place(page);
      await inspector(page)
        .getByRole("button", { name: "Close marker editor" })
        .click();
      remote((map) => {
        map.details = "Newer note from another device";
        map.markers[0].label = "Newer Beacon name";
      });
      await page.reload();
      await page.getByRole("button", { name: "Edit map", exact: true }).click();
      await page
        .getByRole("button", { name: "Recover draft", exact: true })
        .click();
      await save(page);
      assert.equal(writes.at(-1).details, "Newer note from another device");
      assert.equal(writes.at(-1).markers[0].label, "Newer Beacon name");
      assert.equal(writes.at(-1).markers.length, 5);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page, "Newer Beacon name").click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My label");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Another label";
      });
      varyMetadata();
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Resolve conflicting map edits" })
        .waitFor();
      assert.equal(world.maps[0].markers[0].label, "Another label");
      await page
        .getByRole("button", { name: "Use all mine", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Resolve conflicting map edits" })
        .waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(world.maps[0].markers[0].label, "My label");
    },
  );
  await check(
    "revision race retains the draft, retry preserves newer fields, keep/discard protects navigation",
    async ({ page, world, writes, raceNextSave }) => {
      await begin(page);
      await place(page);
      await inspector(page)
        .getByRole("button", { name: "Close marker editor" })
        .click();
      raceNextSave();
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      await page
        .getByText(
          "The map changed while saving. Retry to merge the latest version.",
        )
        .waitFor();
      assert.equal(writes.length, 0);
      await save(page);
      assert.equal(world.maps[0].details, "Arrived during the save");
      await place(page);
      await inspector(page)
        .getByRole("button", { name: "Close marker editor" })
        .click();
      await page
        .getByRole("button", { name: "Done editing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Keep draft", exact: true })
        .click();
      await page.getByRole("button", { name: "Edit map", exact: true }).click();
      await page
        .getByRole("button", { name: "Recover draft", exact: true })
        .click();
      await page.getByRole("link", { name: "Dashboard", exact: true }).click();
      await page
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Your campaign starts here" })
        .waitFor();
      assert.equal(world.maps[0].markers.length, 5);
      assert.equal(
        await page.evaluate(
          (key) => window.localStorage.getItem(key),
          draftKey,
        ),
        null,
      );
    },
  );
  await check(
    "Pan protects markers, dragging retains pmIgnore behavior, nudging and box selection work",
    async ({ page }) => {
      await begin(page);
      assert.equal(
        await point(page).evaluate((element) =>
          element.classList.contains("leaflet-marker-draggable"),
        ),
        false,
      );
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      const box = await point(page).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 30,
        box.y + box.height / 2 + 15,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.ok((await draft(page)).markers[0].x > 25);
      assert.equal(await inspector(page).isVisible(), false);
      await tools(page);
      await page
        .getByRole("button", { name: "Select multiple", exact: true })
        .click();
      await point(page).click();
      const before = (await draft(page)).markers[0].x;
      await page.keyboard.press("ArrowRight");
      assert.ok(
        Math.abs((await draft(page)).markers[0].x - before - 0.1) < 0.00001,
      );
      await page.getByRole("button", { name: "Clear", exact: true }).click();
      const canvas = await page.locator(".leaflet-container").boundingBox();
      await page.keyboard.down("Shift");
      await page.mouse.move(canvas.x + 70, canvas.y + 100);
      await page.mouse.down();
      await page.mouse.move(
        canvas.x + canvas.width - 40,
        canvas.y + canvas.height - 80,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.keyboard.up("Shift");
      await toolbar(page).getByText("2 selected", { exact: true }).waitFor();
    },
  );
  await check(
    "export uses the same front/back layer order as the editor",
    async ({ page, world }) => {
      const area = (id, layer_id, color, z_index) =>
        marker(id, 25, 25, {
          type: "area",
          points: [
            [25, 25],
            [75, 25],
            [75, 75],
            [25, 75],
          ],
          layer_id,
          z_index,
          fill_color: color,
          fill_opacity: 1,
          hide_label: true,
        });
      world.maps[0].layers = [
        { id: "front", name: "Front" },
        { id: "back", name: "Back" },
      ];
      world.maps[0].markers = [
        area("Red", "front", "#ff0000", 0),
        area("Blue", "back", "#0000ff", 99),
      ];
      await page.reload();
      await page
        .getByRole("button", { name: "Edit map", exact: true })
        .waitFor();
      const pixel = await page.evaluate(async (map) => {
        const { flattenMapPair } = await import(
          "/src/utils/playerMapExport.ts"
        );
        const { dm } = await flattenMapPair(map);
        const bitmap = await window.createImageBitmap(dm);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        return [...context.getImageData(500, 350, 1, 1).data];
      }, world.maps[0]);
      assert.deepEqual(pixel, [255, 0, 0, 255]);
    },
  );
  await check(
    "unapplied inspector fields survive switching, save, and keep-draft navigation",
    async ({ page, world }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("Unapplied beacon");
      await toolbar(page)
        .getByRole("button", { name: "Draw area", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Apply marker changes?" })
        .waitFor();
      await page
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      assert.equal(
        await inspector(page)
          .getByRole("textbox", { name: "Label", exact: true })
          .inputValue(),
        "Unapplied beacon",
      );
      await page.locator("path.leaflet-interactive").first().click();
      await page
        .getByRole("button", { name: "Apply and continue", exact: true })
        .click();
      assert.equal((await draft(page)).markers[0].label, "Unapplied beacon");
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("Unapplied room");
      await save(page);
      assert.equal(world.maps[0].markers[0].label, "Unapplied beacon");
      assert.equal(world.maps[0].markers[3].label, "Unapplied room");
      await point(page, "Unapplied beacon").click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("Keep these properties");
      await page
        .getByRole("button", { name: "Done editing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Keep draft", exact: true })
        .click();
      assert.equal(
        (await draft(page)).markers[0].label,
        "Keep these properties",
      );
      assert.equal(world.maps[0].markers[0].label, "Unapplied beacon");
    },
  );
  await check(
    "context menu moves existing markers directly between layers",
    async ({ page }) => {
      await begin(page);
      await point(page).click({ button: "right" });
      await choose(
        page,
        page.getByRole("combobox", { name: "Move to layer", exact: true }),
        "Places",
      );
      assert.equal((await draft(page)).markers[0].layer_id, "places");
      await point(page).click({ button: "right" });
      await choose(
        page,
        page.getByRole("combobox", { name: "Move to layer", exact: true }),
        "Unassigned",
      );
      assert.equal((await draft(page)).markers[0].layer_id, null);
    },
  );
  await check(
    "mobile canvas stays near tools, touch placement confirms, inspector collapses",
    async ({ page }) => {
      await begin(page);
      const canvas = await page.locator(".leaflet-container").boundingBox();
      assert.ok(canvas.y < 400);
      await toolbar(page)
        .getByRole("button", { name: "Place point", exact: true })
        .click();
      const placingCanvas = await page
        .locator(".leaflet-container")
        .boundingBox();
      await page.locator(".leaflet-container").tap({
        position: { x: placingCanvas.width / 2, y: placingCanvas.height / 2 },
      });
      assert.equal(await draft(page), undefined);
      await page
        .getByRole("button", { name: "Place here", exact: true })
        .click();
      await inspector(page).waitFor();
      assert.equal((await draft(page)).markers.length, 5);
      await inspector(page)
        .getByRole("button", { name: "Collapse", exact: true })
        .click();
      await inspector(page)
        .getByRole("button", { name: "Expand", exact: true })
        .waitFor();
      assert.ok((await inspector(page).boundingBox()).height <= 66);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await page.screenshot({ path: join(screenshots, "mobile-canvas.png") });
    },
    { width: 390, height: 844, touch: true },
  );
  await check(
    "HTTP LAN creation and local player preview work without publishing",
    async ({ page, writes }) => {
      assert.equal(await page.evaluate(() => window.isSecureContext), false);
      assert.equal(
        await page.evaluate(() => typeof window.crypto.randomUUID),
        "undefined",
      );
      await begin(page);
      await layers(page);
      await page
        .getByRole("textbox", { name: "New layer name", exact: true })
        .fill("LAN layer");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      assert.ok(
        (await draft(page)).layers.some((layer) => layer.name === "LAN layer"),
      );
      await page.getByRole("tab", { name: "Player View", exact: true }).click();
      await page
        .getByRole("button", { name: "Preview player map", exact: true })
        .click();
      await page
        .getByRole("img", { name: "Player map preview", exact: true })
        .waitFor();
      await page.waitForFunction(() => {
        const container = document.querySelector(".MuiDialog-container");
        const image = document.querySelector('img[alt="Player map preview"]');
        return (
          container &&
          window.getComputedStyle(container).opacity === "1" &&
          image?.complete &&
          image.naturalWidth > 0
        );
      });
      assert.equal(writes.length, 0);
      await page.screenshot({ path: join(screenshots, "player-preview.png") });
    },
    { insecure: true },
  );
  await check(
    "styles support placement, custom appearance, favorites and safe import/export",
    async ({ page, world }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      const library = page.getByRole("dialog", {
        name: "Marker style library",
        exact: true,
      });
      await library
        .getByRole("button", { name: "Favorite Capital", exact: true })
        .click();
      await choose(
        page,
        library.getByRole("combobox", { name: "Style kind", exact: true }),
        "Favorites",
      );
      assert.equal(
        await library
          .getByRole("button", { name: "Place Settlement", exact: true })
          .count(),
        0,
      );
      await library
        .getByRole("button", { name: "Place Capital", exact: true })
        .click();
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 130, y: 150 } });
      await inspector(page).waitFor();
      const placed = (await draft(page)).markers.at(-1);
      assert.equal(placed.icon, "castle");
      assert.equal(placed.fill_color, "#d9b86c");
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("Custom capital marker");
      await inspector(page)
        .getByRole("button", { name: "Save appearance as style", exact: true })
        .click();
      const saveStyle = page.getByRole("dialog", {
        name: "Save marker style",
        exact: true,
      });
      await saveStyle
        .getByRole("textbox", { name: "Style name", exact: true })
        .fill("My capital");
      await saveStyle
        .getByRole("button", { name: "Save style", exact: true })
        .click();
      await saveStyle.waitFor({ state: "hidden" });
      await choose(
        page,
        inspector(page).getByRole("combobox", {
          name: "Marker style",
          exact: true,
        }),
        "Settlement",
      );
      assert.equal(
        await inspector(page)
          .getByRole("textbox", { name: "Label", exact: true })
          .inputValue(),
        "Custom capital marker",
      );
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      assert.equal((await draft(page)).markers.at(-1).id, placed.id);
      assert.equal((await draft(page)).markers.at(-1).icon, "city");
      await save(page);
      await page.reload();
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      await library
        .getByRole("textbox", { name: "Search styles", exact: true })
        .fill("My capital");
      await library
        .getByRole("button", { name: "Rename", exact: true })
        .click();
      const rename = page.getByRole("dialog", {
        name: "Rename style",
        exact: true,
      });
      await rename
        .getByRole("textbox", { name: "Style name", exact: true })
        .fill("Citadel style");
      await rename
        .getByRole("button", { name: "Rename style", exact: true })
        .click();
      await rename.waitFor({ state: "hidden" });
      await library
        .getByRole("textbox", { name: "Search styles", exact: true })
        .fill("Citadel");
      const downloadPromise = page.waitForEvent("download");
      await library
        .getByRole("button", { name: "Export styles", exact: true })
        .click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "marker-styles.json");
      const text = await page.evaluate(() =>
        window.localStorage.getItem(
          "world-builder:marker-styles:v1:map-review",
        ),
      );
      assert.equal(JSON.parse(text).styles[0].name, "Citadel style");
      assert.equal(JSON.parse(text).styles[0].appearance.entity_id, undefined);
      await library.locator('input[type="file"]').setInputFiles({
        name: "import.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            version: 1,
            favorites: [],
            styles: [
              {
                id: "imported",
                name: "Imported road",
                kind: "path",
                appearance: { fill_color: "#112233", fill_opacity: 0.7 },
              },
            ],
          }),
        ),
      });
      await library
        .getByRole("textbox", { name: "Search styles", exact: true })
        .fill("Imported");
      await library
        .getByRole("button", { name: "Place Imported road", exact: true })
        .waitFor();
      assert.equal(world.maps[0].markers.at(-1).icon, "city");
      await library
        .getByRole("button", { name: "Close styles", exact: true })
        .click();
    },
  );
  await check(
    "shape styles place areas and paths with their chosen appearance",
    async ({ page }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Place Woodland", exact: true })
        .click();
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 100, y: 150 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 200, y: 150 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 150, y: 250 } });
      await toolbar(page)
        .getByRole("button", { name: "Finish drawing", exact: true })
        .click();
      const area = (await draft(page)).markers.at(-1);
      assert.equal(area.type, "area");
      assert.equal(area.fill_color, "#639b74");
      assert.equal(area.fill_opacity, 0.3);
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Place River", exact: true })
        .click();
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 100, y: 300 } });
      await page
        .locator(".leaflet-container")
        .click({ position: { x: 200, y: 350 } });
      await page.keyboard.press("Enter");
      const path = (await draft(page)).markers.at(-1);
      assert.equal(path.type, "path");
      assert.equal(path.fill_color, "#68b0d5");
      assert.equal(path.fill_opacity, 0.85);
    },
  );
  await check(
    "bulk properties handle mixed kinds, preserve identity and undo as one edit",
    async ({ page }) => {
      await begin(page);
      await tools(page);
      await page
        .getByRole("button", { name: "Select multiple", exact: true })
        .click();
      await point(page).click();
      await page.locator("path.leaflet-interactive").first().click();
      await toolbar(page)
        .getByRole("button", { name: "Edit selected", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Edit selected properties",
        exact: true,
      });
      await choose(
        page,
        dialog.getByRole("combobox", { name: "Selection style", exact: true }),
        "Capital · point (1 items)",
      );
      await dialog
        .getByRole("checkbox", { name: "Change color", exact: true })
        .check();
      await dialog.locator('input[type="color"]').fill("#223344");
      await dialog
        .getByRole("checkbox", { name: "Change opacity", exact: true })
        .check();
      await dialog
        .getByRole("spinbutton", { name: "Shape opacity", exact: true })
        .fill("0.6");
      await choose(
        page,
        dialog.getByRole("combobox", { name: "Label visibility", exact: true }),
        "Hide labels",
      );
      await dialog
        .getByRole("button", { name: "Apply to selected", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      const edited = await draft(page),
        beacon = edited.markers[0],
        room = edited.markers[3];
      assert.equal(beacon.icon, "castle");
      assert.equal(beacon.fill_color, "#223344");
      assert.equal(beacon.hide_label, true);
      assert.equal(beacon.id, "Beacon");
      assert.equal(beacon.x, 25);
      assert.equal(beacon.dm_only, false);
      assert.equal(room.fill_color, "#223344");
      assert.equal(room.fill_opacity, 0.6);
      assert.equal(room.hide_label, true);
      assert.equal(room.layer_id, "places");
      await toolbar(page)
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      const undone = await draft(page);
      assert.equal(undone.markers[0].icon, "location");
      assert.equal(undone.markers[3].fill_opacity, 0.35);
      await toolbar(page)
        .getByRole("button", { name: "Redo", exact: true })
        .click();
      assert.equal((await draft(page)).markers[3].fill_opacity, 0.6);
    },
  );
  await check(
    "desktop full-screen editing preserves the canvas, dialogs, properties and drafts",
    async ({ page, world }) => {
      world.maps[0].markers[0].entity_id = "archive";
      await page.reload();
      await begin(page);
      const canvas = page.locator(".leaflet-container"),
        original = await canvas.boundingBox();
      await canvas.evaluate((element) => {
        element.dataset.identityCheck = "same-canvas";
      });
      await toolbar(page)
        .getByRole("button", { name: "Full screen", exact: true })
        .click();
      await page
        .getByRole("region", { name: "Full-screen map editor", exact: true })
        .waitFor();
      assert.ok(
        await page.evaluate(() =>
          [...document.querySelectorAll("[data-app-chrome]")].every(
            (element) => element.inert,
          ),
        ),
      );
      const expanded = await canvas.boundingBox();
      assert.ok(expanded.height > Math.min(original.height, 1000 - original.y));
      assert.ok(expanded.y < original.y);
      assert.equal(
        await canvas.getAttribute("data-identity-check"),
        "same-canvas",
      );
      await place(page);
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("Fullscreen marker");
      await inspector(page)
        .getByRole("button", { name: "Create a city or location", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Create a place for this marker",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Close creation form", exact: true })
        .click();
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Marker style library", exact: true })
        .getByRole("button", { name: "Close styles", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("button", { name: "Open linked record", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Close entity details", exact: true })
        .click();
      await inspector(page)
        .getByRole("button", { name: "Close marker editor", exact: true })
        .click();
      await page.screenshot({
        path: join(screenshots, "desktop-fullscreen.png"),
      });
      await toolbar(page)
        .getByRole("button", { name: "Done editing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Keep draft", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("region", { name: "Full-screen map editor", exact: true })
          .count(),
        0,
      );
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      assert.ok(
        await page.evaluate(() =>
          [...document.querySelectorAll("[data-app-chrome]")].every(
            (element) => !element.inert,
          ),
        ),
      );
      assert.equal(
        (await draft(page)).markers.at(-1).label,
        "Fullscreen marker",
      );
    },
  );
  await check(
    "mobile full-screen editor expands canvas and keeps exit reachable with inspector",
    async ({ page }) => {
      await begin(page);
      const original = await page.locator(".leaflet-container").boundingBox();
      await toolbar(page)
        .getByRole("button", { name: "Full screen", exact: true })
        .click();
      const expanded = await page.locator(".leaflet-container").boundingBox();
      assert.ok(expanded.height > original.height + 100);
      assert.ok(expanded.y < 240);
      assert.ok(expanded.y + expanded.height <= 844);
      await toolbar(page)
        .getByRole("button", { name: "Place point", exact: true })
        .click();
      const box = await page.locator(".leaflet-container").boundingBox();
      await page
        .locator(".leaflet-container")
        .tap({ position: { x: box.width / 2, y: box.height / 2 } });
      await page
        .getByRole("button", { name: "Place here", exact: true })
        .click();
      await inspector(page)
        .getByRole("button", { name: "Collapse", exact: true })
        .click();
      await page.screenshot({
        path: join(screenshots, "mobile-fullscreen.png"),
      });
      await toolbar(page)
        .getByRole("button", { name: "Exit full screen", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("region", { name: "Full-screen map editor", exact: true })
          .count(),
        0,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
    },
    { width: 390, height: 844, touch: true },
  );
  await check(
    "mobile style library and bulk properties fit the viewport and remain actionable",
    async ({ page }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Styles", exact: true })
        .click();
      const library = page.getByRole("dialog", {
        name: "Marker style library",
        exact: true,
      });
      assert.ok(
        await library.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      );
      await page.waitForFunction(
        (element) =>
          window.getComputedStyle(element.closest(".MuiDialog-container"))
            .opacity === "1",
        await library.elementHandle(),
      );
      await page.screenshot({
        path: join(screenshots, "mobile-style-library.png"),
      });
      await library
        .getByRole("button", { name: "Close styles", exact: true })
        .click();
      await tools(page);
      await page
        .getByRole("button", { name: "Select multiple", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Close map controls", exact: true })
        .click();
      await point(page).click();
      await toolbar(page)
        .getByRole("button", { name: "Edit selected", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Edit selected properties",
        exact: true,
      });
      assert.ok(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      );
      await dialog
        .getByRole("checkbox", { name: "Change color", exact: true })
        .check();
      await dialog.locator('input[type="color"]').fill("#778899");
      await page.screenshot({
        path: join(screenshots, "mobile-bulk-properties.png"),
      });
      await dialog
        .getByRole("button", { name: "Apply to selected", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal((await draft(page)).markers[0].fill_color, "#778899");
    },
    { width: 390, height: 844, touch: true },
  );
  await check(
    "conflict comparison saves per-field choices and keeps unrelated edits",
    async ({ page, world, remote, writes }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My chosen label");
      await inspector(page)
        .getByRole("textbox", { name: "Color", exact: true })
        .fill("#112233");
      await inspector(page)
        .getByRole("textbox", { name: "Tooltip", exact: true })
        .fill("My unrelated tooltip");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Saved label";
        map.markers[0].fill_color = "#445566";
        map.details = "Newer unrelated note";
      });
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog.waitFor();
      assert.equal(writes.length, 0);
      assert.equal(
        await dialog
          .getByRole("button", { name: "Save resolved map", exact: true })
          .isDisabled(),
        true,
      );
      await dialog
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      assert.equal((await draft(page)).markers[0].label, "My chosen label");
      assert.equal(writes.length, 0);
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      await dialog.waitFor();
      const label = dialog.getByRole("region", {
        name: "Marker “My chosen label” · Label",
        exact: true,
      });
      await label.getByText("My chosen label", { exact: true }).waitFor();
      await label.getByText("Saved label", { exact: true }).waitFor();
      await label.getByRole("radio", { name: "Use mine", exact: true }).check();
      assert.equal(
        await dialog
          .getByRole("button", { name: "Save resolved map", exact: true })
          .isDisabled(),
        true,
      );
      await dialog
        .getByRole("region", {
          name: "Marker “My chosen label” · Color",
          exact: true,
        })
        .getByRole("radio", { name: "Use saved", exact: true })
        .check();
      await page.screenshot({
        path: join(screenshots, "desktop-conflicts.png"),
      });
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(world.maps[0].markers[0].label, "My chosen label");
      assert.equal(world.maps[0].markers[0].fill_color, "#445566");
      assert.equal(world.maps[0].markers[0].tooltip, "My unrelated tooltip");
      assert.equal(world.maps[0].details, "Newer unrelated note");
      assert.equal(world.maps[0].markers[0].id, "Beacon");
    },
  );
  await check(
    "conflict comparison requires fresh choices when a saved revision changes",
    async ({ page, world, remote, writes }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My label");
      await inspector(page)
        .getByRole("textbox", { name: "Tooltip", exact: true })
        .fill("Keep this unrelated local edit");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Saved first version";
      });
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog.waitFor();
      await dialog
        .getByRole("button", { name: "Use all mine", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Saved second version";
        map.details = "Arrived during review";
      });
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog
        .getByText(
          "The saved map or your draft changed during review. These are the latest values; choose again before saving.",
        )
        .waitFor();
      await dialog.getByText("Saved second version", { exact: true }).waitFor();
      assert.equal(writes.length, 0);
      assert.equal(
        await dialog
          .getByRole("button", { name: "Save resolved map", exact: true })
          .isDisabled(),
        true,
      );
      await dialog
        .getByRole("button", { name: "Use all saved", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(world.maps[0].markers[0].label, "Saved second version");
      assert.equal(world.maps[0].details, "Arrived during review");
      assert.equal(
        world.maps[0].markers[0].tooltip,
        "Keep this unrelated local edit",
      );
    },
  );
  await check(
    "conflict comparison can accept a saved marker deletion",
    async ({ page, world, remote }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My edited marker");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers = map.markers.filter((marker) => marker.id !== "Beacon");
      });
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog.getByText("Deleted", { exact: true }).waitFor();
      await dialog
        .getByRole("radio", { name: "Use saved", exact: true })
        .check();
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(
        world.maps[0].markers.some((marker) => marker.id === "Beacon"),
        false,
      );
    },
  );
  await check(
    "conflict comparison reviews older drafts without a baseline field by field",
    async ({ page, world }) => {
      const older = structuredClone(world.maps[0]);
      older.name = "Older map name";
      older.markers[0].label = "Older marker label";
      await page.evaluate(
        (map) =>
          window.sessionStorage.setItem(
            "world-builder-map-draft:review-map",
            JSON.stringify({ map, stampSizes: [] }),
          ),
        older,
      );
      await page.getByRole("button", { name: "Edit map", exact: true }).click();
      await page
        .getByRole("button", { name: "Recover draft", exact: true })
        .click();
      await toolbar(page).waitFor();
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog
        .getByText(
          "This older draft has no original version to compare against. Review every difference before saving.",
        )
        .waitFor();
      await dialog
        .getByRole("region", { name: "Map · Name", exact: true })
        .getByRole("radio", { name: "Use saved", exact: true })
        .check();
      await dialog
        .getByRole("region", {
          name: "Marker “Older marker label” · Label",
          exact: true,
        })
        .getByRole("radio", { name: "Use mine", exact: true })
        .check();
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(world.maps[0].name, "Review Map");
      assert.equal(world.maps[0].markers[0].label, "Older marker label");
    },
  );
  await check(
    "conflict comparison fits a mobile full-screen editor and saves explicit choices",
    async ({ page, world, remote }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Full screen", exact: true })
        .click();
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My mobile label");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Saved mobile label";
      });
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog.waitFor();
      await page.waitForFunction(
        (element) =>
          window.getComputedStyle(element.closest(".MuiDialog-container"))
            .opacity === "1",
        await dialog.elementHandle(),
      );
      assert.ok(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      );
      await dialog.getByText("My mobile label", { exact: true }).waitFor();
      await dialog.getByText("Saved mobile label", { exact: true }).waitFor();
      await page.screenshot({
        path: join(screenshots, "mobile-conflicts.png"),
      });
      await dialog
        .getByRole("radio", { name: "Use saved", exact: true })
        .check();
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some((node) =>
          node.textContent.includes("Map saved"),
        ),
      );
      assert.equal(world.maps[0].markers[0].label, "Saved mobile label");
    },
    { width: 390, height: 844, touch: true },
  );
  await check(
    "conflict comparison never saves stale choices after an overlap disappears",
    async ({ page, remote, writes }) => {
      await begin(page);
      await toolbar(page)
        .getByRole("button", { name: "Select", exact: true })
        .click();
      await point(page).click();
      await inspector(page)
        .getByRole("textbox", { name: "Label", exact: true })
        .fill("My label");
      await inspector(page)
        .getByRole("button", { name: "Apply to map", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Saved label";
      });
      await toolbar(page)
        .getByRole("button", { name: "Save map", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Resolve conflicting map edits",
        exact: true,
      });
      await dialog.waitFor();
      await dialog
        .getByRole("button", { name: "Use all saved", exact: true })
        .click();
      remote((map) => {
        map.markers[0].label = "Beacon";
      });
      await dialog
        .getByRole("button", { name: "Save resolved map", exact: true })
        .click();
      await page
        .getByText(
          "The map changed during conflict review. Your choices were not saved. Review your draft and save again.",
        )
        .waitFor();
      assert.equal(writes.length, 0);
      assert.equal((await draft(page)).markers[0].label, "My label");
    },
  );
} finally {
  await browser.close();
}
