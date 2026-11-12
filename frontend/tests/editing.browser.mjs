/* global window, document */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-editing-checks");
await mkdir(screenshots, { recursive: true });
const world = {
  world: { id: "isolated-ui-test-world", name: "UI Test World", version: "1", author: "Test", continents: ["continent"] },
  continents: [{ id: "continent", name: "Test Continent" }],
  kingdoms: [
    { id: "north", name: "Test Northern Kingdom", political_level: "kingdom", continent: "continent", leadership: [], capital: null },
    { id: "scarif", name: "Test Scarif", political_level: "nation", parent_kingdom: "north", continent: "continent", leadership: [], capital: null, description: "Original description" },
  ],
  cities: [], locations: [], regions: [], npcs: [], player_characters: [], campaigns: [], world_events: [], timeline_events: [], lores: [], artifacts: [], world_stories: [], dm_scratchpad_entries: [], price_lists: [],
  maps: [{ id: "test-map", name: "Test Map", entity_id: "scarif", map_type: "region", canvas_width: 1000, canvas_height: 800, markers: [{ id: "marker", x: 50, y: 50, label: "New marker", type: "point", entity_id: null, visible: true, dm_only: false, icon: "location" }] }],
};
const collections = { continent: "continents", kingdom: "kingdoms", city: "cities", location: "locations", region: "regions", npc: "npcs", player_character: "player_characters", campaign: "campaigns", world_event: "world_events", timeline_event: "timeline_events", lore: "lores", artifact: "artifacts", world_story: "world_stories", dm_scratchpad_entry: "dm_scratchpad_entries", price_list: "price_lists", map: "maps" };
let creations = 0;
let failNextCapitalLink = true;
const records = () => Object.entries(collections).flatMap(([type, collection]) => world[collection].map((entity) => ({ id: entity.id, entity_type: type, entity })));
const summary = () => records().map(({ id, entity_type, entity }) => ({ id, entity_type, name: entity.name }));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.slice(4);
  if (path === "/world") return route.fulfill({ json: world });
  if (path === "/validation") return route.fulfill({ json: { errors: [], warnings: [], valid: true } });
  if (path === "/entities" && request.method() === "GET") return route.fulfill({ json: summary() });
  if (path === "/entities" && request.method() === "POST") {
    const body = request.postDataJSON();
    const entity = { id: `created-${++creations}`, tags: [], leadership: [], ...body.entity };
    world[collections[body.entity_type]].push(entity);
    return route.fulfill({ json: { id: entity.id, entity_type: body.entity_type, entity } });
  }
  const match = path.match(/^\/entities\/([^/]+)$/);
  if (match) {
    const record = records().find((entity) => entity.id === match[1]);
    if (!record) return route.fulfill({ status: 404, json: { detail: "Not found" } });
    if (request.method() === "PUT") {
      if (record.id === "scarif" && failNextCapitalLink && request.postDataJSON().capital) {
        failNextCapitalLink = false;
        return route.fulfill({ status: 503, json: { detail: "Temporary save failure" } });
      }
      Object.assign(record.entity, request.postDataJSON());
    }
    return route.fulfill({ json: record });
  }
  if (path.endsWith("/relationships")) return route.fulfill({ json: { outgoing: [], incoming: [] } });
  return route.fulfill({ json: [] });
});

try {
  await page.goto(`${base}/?entity=scarif`);
  await page.getByRole("button", { name: "Create capital city", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Test Citadel City");
  assert.equal(await page.getByRole("combobox", { name: "Political territory" }).inputValue(), "Test Scarif");
  await page.getByRole("button", { name: "Create and set capital" }).click();
  await page.getByText(/was created, but its link could not be saved/).waitFor();
  assert.equal(creations, 1);
  await page.getByRole("button", { name: "Retry linking" }).click();
  await page.getByText("Capital city created and linked.").waitFor();
  assert.equal(creations, 1);
  assert.equal(world.kingdoms[1].capital, "created-1");
  assert.equal(world.cities[0].kingdom, "scarif");
  console.log("PASS capital creation, default parent, failed-link retry, immediate detail refresh");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Description", exact: true }).fill("Recovered notes");
  await page.getByRole("button", { name: "Close entity details" }).click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(await page.getByRole("textbox", { name: "Description", exact: true }).inputValue(), "Recovered notes");
  await page.getByRole("button", { name: "Close entity details" }).click();
  await page.getByRole("button", { name: "Keep draft", exact: true }).click();
  await page.goto(`${base}/?entity=scarif`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByText(/Recovered your unfinished draft. Saving/).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Description", exact: true }).inputValue(), "Recovered notes");
  world.kingdoms[1].government_notes = "Unrelated newer server change";
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Changes saved.", { exact: true }).waitFor();
  assert.equal(world.kingdoms[1].description, "Recovered notes");
  assert.equal(world.kingdoms[1].government_notes, "Unrelated newer server change");
  console.log("PASS close protection, recovered draft after reload, unrelated newer changes preserved");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Description", exact: true }).fill("My new notes");
  world.kingdoms[1].description = "Other saved notes";
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("heading", { name: "This record has newer changes" }).waitFor();
  assert.equal(world.kingdoms[1].description, "Other saved notes");
  await page.getByRole("button", { name: "Apply my changes" }).click();
  await page.getByRole("heading", { name: "This record has newer changes" }).waitFor({ state: "hidden" });
  assert.equal(world.kingdoms[1].description, "My new notes");
  console.log("PASS conflicting edits require explicit confirmation");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Description", exact: true }).fill("Discard this");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.getByRole("textbox", { name: "Description", exact: true }).inputValue(), "My new notes");
  await page.getByRole("button", { name: "Close entity details" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole("button", { name: "Create entity", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Mobile draft city");
  await page.getByRole("button", { name: "Close creation form" }).click();
  await page.getByRole("button", { name: "Keep draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Create entity", exact: true }).click();
  await page.getByText("Recovered your unfinished draft from this browser.").waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Name", exact: true }).inputValue(), "Mobile draft city");
  await page.setViewportSize({ width: 390, height: 400 });
  const footer = await page.getByRole("button", { name: "Create Entity", exact: true }).boundingBox();
  assert.ok(footer.y + footer.height <= 400);
  assert.ok(footer.y >= 0);
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 260 });
    Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 40 });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(() => [...document.querySelectorAll(".MuiDrawer-paper")].some((element) => Math.abs(element.getBoundingClientRect().height - 260) < 1));
  const keyboardFooter = await page.getByRole("button", { name: "Create Entity", exact: true }).boundingBox();
  assert.ok(keyboardFooter.y + keyboardFooter.height <= 300);
  assert.ok(keyboardFooter.y >= 40);
  await page.evaluate(() => {
    delete window.visualViewport.height;
    delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.screenshot({ path: join(screenshots, "mobile-draft.png") });
  await page.getByRole("button", { name: "Close creation form" }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  console.log("PASS discard, mobile draft recovery, save controls inside a short viewport");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/maps?map=test-map`);
  await page.getByRole("button", { name: "Edit map", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit map", exact: true }).click();
  const editMarker = page.getByRole("button", { name: "Edit markers", exact: true });
  if (!(await editMarker.isVisible())) await page.getByRole("button", { name: "Map controls", exact: true }).click();
  await editMarker.click();
  await page.locator(".leaflet-marker-icon:not(.campaign-map-label-icon)").first().click();
  await page.getByRole("button", { name: "Create a city or location", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Test Marker Place");
  assert.equal(await page.getByRole("combobox", { name: "Political territory", exact: true }).inputValue(), "Test Scarif");
  await page.getByRole("button", { name: "Create and select", exact: true }).click();
  await page.getByText(/Place created and selected/).waitFor();
  assert.equal(await page.getByRole("combobox", { name: "Entity", exact: true }).inputValue(), "Test Marker Place");
  await page.getByRole("button", { name: "Apply to map", exact: true }).click();
  await page.getByRole("button", { name: "Apply to map", exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Save map", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((node) => node.textContent.includes("Map saved")));
  assert.equal(world.maps[0].markers[0].entity_id, world.locations[0].id);
  assert.equal(world.locations[0].kingdom, "scarif");
  console.log("PASS marker creation, place defaults, immediate selector refresh, saved marker link");
  await page.screenshot({ path: join(screenshots, "map-controls.png") });
  assert.deepEqual(errors, []);
  console.log("PASS no uncaught browser exceptions");
} catch (error) {
  console.log("PAGE", await page.locator("body").innerText());
  console.log("VISIBLE BUTTONS", await page.getByRole("button").evaluateAll((buttons) => buttons.map((button) => ({ text: button.textContent, label: button.getAttribute("aria-label") }))));
  console.log("BROWSER ERRORS", errors);
  await page.screenshot({ path: join(screenshots, "failure.png"), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
