/* global window, document */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-dashboard-checks");
await mkdir(screenshots, { recursive: true });
const blankStory = () => ({ beats: [], player_actions: [], world_clocks: [], session_recaps: [], session_preps: [] });
const beat = {
  id: "harbor", name: "Arrival at the harbor", description: "Meet the guide.", status: "in_progress",
  locations: ["port"], npcs: ["guide"], player_characters: [], world_events: [], world_stories: [], world_story_threads: [], leads_to: [], triggers: [], secrets: [], possible_approaches: [],
  consequences: [{ id: "pending", description: "A patrol may arrive", status: "pending", leads_to: [] }, { id: "active", description: "The harbor is watched", status: "active", leads_to: [] }, { id: "resolved", description: "Resolved problem", status: "resolved", leads_to: [] }],
};
const active = {
  id: "active", name: "Test Active Campaign", status: "active", description: "An existing campaign.", locations: ["port"], npcs: ["guide"], player_characters: [],
  story: {
    ...blankStory(), current_beat: "harbor", beats: [beat], combat_results: [{ id: "keep-result", notes: "Preserve this" }],
    player_actions: [{ id: "first", description: "First session", session: 1, reviewed: true }, { id: "second", description: "Unreviewed session action", session: 2, reviewed: false }],
    session_recaps: [{ session: 1, summary: "Earlier recap" }],
    session_preps: [{ session: 3, agenda: "Harbor agenda", plot_point_ids: ["harbor"], reference_ids: ["port", "guide"] }],
    world_clocks: [{ id: "clock", name: "Patrol arrives", current: 2, maximum: 3, status: "active" }, { id: "plot-clock", name: "The tide turns", current: 1, maximum: 4, status: "active", plot_point_id: "harbor" }, { id: "paused", name: "Paused clock", current: 0, maximum: 2, status: "paused" }],
  },
};
const legacy = { id: "legacy", name: "Test Legacy Campaign", status: "completed", story: { nodes: [{ type: "text", text: "Keep this authored story intact" }] } };
const world = {
  world: { id: "dashboard-test-world", name: "Dashboard Test World", version: "1", author: "Test", continents: [] },
  continents: [], kingdoms: [], regions: [], locations: [], player_characters: [], world_events: [], timeline_events: [], lores: [], artifacts: [], world_stories: [], dm_scratchpad_entries: [], price_lists: [],
  campaigns: [active, { id: "other", name: "Test Other Campaign", status: "planned", story: blankStory() }, legacy],
  cities: [{ id: "port", name: "Test Harbor", description: "Harbor description", details: "Harbor location notes", dm_notes: "A hidden harbor fact" }, { id: "hill", name: "Test Hill", description: "A dashboard reference" }],
  npcs: [{ id: "guide", name: "Test Guide", city: "port", motives: [], goals: [], fears: [], secrets: [], knowledge: [], events: [], relationships: [] }],
  maps: [{ id: "harbor-map", name: "Harbor Map", entity_id: "port", map_type: "city", markers: [], canvas_width: 1000, canvas_height: 800 }],
};
const collections = { campaign: "campaigns", city: "cities", npc: "npcs", map: "maps", dm_scratchpad_entry: "dm_scratchpad_entries" };
const records = () => Object.entries(collections).flatMap(([type, collection]) => world[collection].map((entity) => ({ id: entity.id, entity_type: type, entity })));
let ideaCount = 0;
let failNextIdea = true;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.slice(4);
  if (path === "/world") return route.fulfill({ json: world });
  if (path === "/validation") return route.fulfill({ json: { errors: [], warnings: [], valid: true } });
  if (path === "/entities" && request.method() === "GET") return route.fulfill({ json: records().map(({ id, entity_type, entity }) => ({ id, entity_type, name: entity.name })) });
  if (path === "/entities" && request.method() === "POST") {
    const body = request.postDataJSON();
    assert.equal(body.entity_type, "dm_scratchpad_entry");
    if (failNextIdea) { failNextIdea = false; return route.fulfill({ status: 503, json: { detail: "Temporary idea save failure" } }); }
    const entity = { id: `idea-${++ideaCount}`, ...body.entity };
    world.dm_scratchpad_entries.push(entity);
    return route.fulfill({ json: { id: entity.id, entity_type: body.entity_type, entity } });
  }
  const match = path.match(/^\/entities\/([^/]+)$/);
  if (match) {
    const record = records().find((entity) => entity.id === match[1]);
    if (!record) return route.fulfill({ status: 404, json: { detail: "Not found" } });
    if (request.method() === "PUT") Object.assign(record.entity, request.postDataJSON());
    return route.fulfill({ json: record });
  }
  if (path.endsWith("/relationships")) return route.fulfill({ json: { outgoing: [], incoming: [] } });
  return route.fulfill({ json: [] });
});
const home = async () => { await page.getByRole("link", { name: "Dashboard", exact: true }).click(); await page.getByRole("heading", { name: "Pick up where you left off" }).waitFor(); };
const chooseCampaign = async (name) => { await page.getByRole("combobox", { name: "Dashboard campaign" }).click(); await page.getByRole("option", { name, exact: true }).click(); };

try {
  await page.goto(base);
  await page.getByRole("link", { name: "Prepare Session 3", exact: true }).waitFor();
  await page.getByText("1 unreviewed party actions", { exact: true }).waitFor();
  await page.getByText("2 active clocks", { exact: true }).waitFor();
  await page.getByText("2 unresolved consequences", { exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Open Harbor Map" }).getAttribute("href"), "/maps?map=harbor-map&focusEntity=port");
  await page.getByRole("button", { name: "Test Guide", exact: true }).waitFor();
  console.log("PASS session summary, current location, linked map/NPCs, and attention counts");

  await page.getByRole("link", { name: "Prepare Session 3", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Session number", exact: true }).waitFor();
  assert.equal(await page.getByRole("spinbutton", { name: "Session number", exact: true }).inputValue(), "3");
  assert.ok((await page.locator("textarea").evaluateAll((elements) => elements.map((element) => element.value))).includes("Harbor agenda"));
  await home();
  await page.getByRole("link", { name: "During Session 2", exact: true }).click();
  await page.getByRole("heading", { name: "Session 2", exact: true }).waitFor();
  await home();
  await page.getByRole("link", { name: "Review actions", exact: true }).click();
  await page.getByRole("heading", { name: "Session closeout", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await home();
  await page.getByRole("link", { name: "Review consequences", exact: true }).click();
  await page.locator("#campaign-consequences").waitFor();
  await home();
  await page.getByRole("link", { name: "Open clocks", exact: true }).click();
  await page.locator("#campaign-clocks").waitFor();
  await home();
  console.log("PASS shortcuts open session prep, live play, closeout, clocks, and consequences");

  await page.getByRole("button", { name: "Open location details", exact: true }).click();
  await page.getByRole("button", { name: "Close entity details" }).click();
  await page.getByRole("region", { name: "Recently opened" }).getByRole("button", { name: "Test Harbor", exact: true }).waitFor();
  await chooseCampaign("Test Other Campaign");
  await page.reload();
  assert.equal(await page.getByRole("combobox", { name: "Dashboard campaign" }).innerText(), "Test Other Campaign");
  await chooseCampaign("Test Active Campaign");
  await page.getByRole("combobox", { name: "Dashboard location", exact: true }).click();
  await page.getByRole("option", { name: /Test Hill/ }).click();
  await page.reload();
  await page.getByRole("heading", { name: "Test Hill", exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Dashboard location", exact: true }).click();
  await page.getByRole("option", { name: "Use current plot point", exact: true }).click();
  await page.getByRole("heading", { name: "Test Harbor", exact: true }).waitFor();
  console.log("PASS recent references and remembered campaign/location choices");

  active.overview = "A newer server change";
  await page.getByRole("textbox", { name: "What did the party do?", exact: true }).fill("The party negotiated with the guide.");
  await page.getByRole("button", { name: "Record party action", exact: true }).click();
  await page.getByText("Party action recorded for Session 2.", { exact: true }).waitFor();
  assert.equal(active.story.player_actions[0].description, "The party negotiated with the guide.");
  assert.equal(active.story.player_actions[0].reviewed, false);
  assert.equal(active.story.player_actions[0].story_beat, "harbor");
  assert.equal(active.overview, "A newer server change");
  assert.equal(active.story.beats[0].status, "in_progress");
  assert.equal(active.story.combat_results[0].id, "keep-result");
  await page.getByText("2 unreviewed party actions", { exact: true }).waitFor();
  const capture = page.getByRole("region", { name: "Quick capture" });
  await capture.getByRole("combobox", { name: "Capture type" }).click();
  await page.getByRole("option", { name: "Idea for the scratchpad" }).click();
  await capture.getByRole("textbox", { name: "Capture an idea" }).fill("A hidden route\nThrough the abandoned docks.");
  await capture.getByRole("button", { name: "Save idea" }).click();
  await capture.getByText("Temporary idea save failure").waitFor();
  assert.equal(await capture.getByRole("textbox", { name: "Capture an idea" }).inputValue(), "A hidden route\nThrough the abandoned docks.");
  await capture.getByRole("button", { name: "Save idea" }).click();
  await capture.getByText("Idea saved to the DM Scratchpad.").waitFor();
  assert.equal(world.dm_scratchpad_entries[0].content, "A hidden route\nThrough the abandoned docks.");
  assert.equal(world.dm_scratchpad_entries[0].status, "inbox");
  console.log("PASS quick capture preserves newer fields, story state, and failed-save text");

  await capture.getByRole("combobox", { name: "Capture type" }).click();
  await page.getByRole("option", { name: "Party action", exact: true }).click();
  await capture.getByRole("textbox", { name: "What did the party do?" }).fill("An unfinished action");
  await page.getByRole("link", { name: "Locations", exact: true }).click();
  await home();
  await page.getByText("Recovered your unfinished capture from this browser.").waitFor();
  assert.equal(await page.getByRole("textbox", { name: "What did the party do?" }).inputValue(), "An unfinished action");
  await page.getByRole("button", { name: "Clear draft" }).click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(await page.getByRole("textbox", { name: "What did the party do?" }).inputValue(), "An unfinished action");
  await page.getByRole("button", { name: "Clear draft" }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.screenshot({ path: join(screenshots, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: join(screenshots, "mobile.png"), fullPage: true });
  console.log("PASS recoverable captures, discard protection, and mobile width");

  world.campaigns = [legacy];
  await page.reload();
  await page.getByRole("textbox", { name: "Capture an idea" }).waitFor();
  assert.equal(legacy.story.nodes[0].text, "Keep this authored story intact");
  await page.getByRole("region", { name: "Quick capture" }).getByRole("combobox", { name: "Capture type" }).click();
  assert.equal(await page.getByRole("option", { name: "Party action", exact: true }).getAttribute("aria-disabled"), "true");
  await page.keyboard.press("Escape");
  world.campaigns = [];
  await page.reload();
  await page.getByRole("heading", { name: "Your campaign starts here", exact: true }).waitFor();
  await page.getByRole("textbox", { name: "Capture an idea" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS legacy and empty campaigns without uncaught browser exceptions");
} catch (error) {
  console.error("PAGE", await page.locator("body").innerText());
  console.error("BROWSER ERRORS", errors);
  await page.screenshot({ path: join(screenshots, "failure.png"), fullPage: true });
  throw error;
} finally { await browser.close(); }
