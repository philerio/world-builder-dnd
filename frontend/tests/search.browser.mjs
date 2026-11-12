/* global document */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-search-checks");
await mkdir(screenshots, { recursive: true });
const world = {
  world: { id: "search-test", name: "Search Test World", version: "1", author: "Test", continents: [] },
  continents: [], regions: [], locations: [], player_characters: [], world_events: [], timeline_events: [], lores: [], artifacts: [], world_stories: [], dm_scratchpad_entries: [], price_lists: [],
  kingdoms: [{ id: "north", name: "Northern Elligaesia", political_level: "kingdom" }, { id: "scarif", name: "Scarif", political_level: "nation", parent_kingdom: "north" }],
  cities: [{ id: "citadel", name: "Citadel City", kingdom: "scarif", description: "A fortress by the coast", tags: ["Imperial archive"], dm_notes: "The emerald vault is sealed" }],
  npcs: [{ id: "guide", name: "Elan", city: "citadel", motives: [], goals: [], fears: [], secrets: ["Carries a cipher"], knowledge: [], events: [], relationships: [] }],
  campaigns: [{ id: "campaign", name: "Coastal Campaign", status: "active", story: { current_beat: "arrival", beats: [{ id: "arrival", name: "Arrival", locations: ["citadel"], secrets: ["The silver signal"], npcs: [], consequences: [] }], player_actions: [], world_clocks: [] } }],
  maps: [],
};
const collections = { kingdom: "kingdoms", city: "cities", npc: "npcs", campaign: "campaigns" };
const records = () => Object.entries(collections).flatMap(([type, collection]) => world[collection].map((entity) => ({ id: entity.id, entity_type: type, entity })));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/**", async (route) => {
  assert.equal(route.request().method(), "GET", "Search and breadcrumbs must never write world data");
  const path = new URL(route.request().url()).pathname.slice(4);
  if (path === "/world") return route.fulfill({ json: world });
  if (path === "/validation") return route.fulfill({ json: { errors: [], warnings: [], valid: true } });
  if (path === "/entities") return route.fulfill({ json: records().map(({ id, entity_type, entity }) => ({ id, entity_type, name: entity.name })) });
  const match = path.match(/^\/entities\/([^/]+)$/);
  if (match) return route.fulfill({ json: records().find((record) => record.id === match[1]) });
  if (path.endsWith("/relationships")) return route.fulfill({ json: { incoming: [], outgoing: [] } });
  return route.fulfill({ json: [] });
});
const dialog = page.getByRole("dialog", { name: "Search the world" });
const search = page.getByRole("combobox", { name: "Find a record" });
const openSearch = async () => { await page.locator("body").click({ position: { x: 1250, y: 20 } }); await page.keyboard.press("Control+k"); await dialog.waitFor(); };

try {
  await page.goto(base);
  await page.getByRole("heading", { name: "Pick up where you left off" }).waitFor();
  const homeTrail = page.getByRole("navigation", { name: "Location hierarchy" });
  assert.match(await homeTrail.innerText(), /Northern Elligaesia[\s\S]*Scarif[\s\S]*Citadel City/);
  await openSearch();
  await search.fill("fortress");
  await page.getByRole("option", { name: /Citadel City/ }).waitFor();
  assert.match(await page.getByRole("option").innerText(), /Description: A fortress/);
  assert.match(await page.getByRole("option").innerText(), /Northern Elligaesia → Scarif/);
  await search.fill("emerald");
  assert.match(await page.getByRole("option").innerText(), /DM notes \(DM only\): The emerald vault/);
  await search.fill("silver signal");
  assert.match(await page.getByRole("option").innerText(), /Secrets \(DM only\)/);
  await search.fill("archive");
  assert.match(await page.getByRole("option").innerText(), /Tags: Imperial archive/);
  await page.screenshot({ path: join(screenshots, "search-desktop.png") });
  await search.press("Escape");
  await dialog.getByRole("combobox", { name: "Record type" }).click();
  await page.getByRole("option", { name: "Nation", exact: true }).click();
  await page.getByRole("option", { name: "Nation", exact: true }).waitFor({ state: "hidden" });
  await search.fill("Scarif");
  assert.match(await page.getByRole("option", { name: /^Scarif/ }).innerText(), /^Scarif\s+Nation/);
  await page.getByRole("option", { name: /^Scarif/ }).click();
  await page.getByRole("heading", { name: "Scarif", exact: true }).waitFor();
  await page.getByRole("button", { name: "Close entity details" }).click();
  console.log("PASS search by prose, tags, DM notes, nested secrets, and separate Nation filter");

  await openSearch();
  assert.equal(await search.inputValue(), "");
  await search.fill("Citadel City");
  await page.getByRole("option", { name: /^Citadel City/ }).waitFor();
  await search.press("Enter");
  await page.getByRole("heading", { name: "Citadel City", exact: true }).waitFor();
  const detailTrail = page.locator(".MuiDrawer-paper").getByRole("navigation", { name: "Location hierarchy" });
  await detailTrail.getByRole("button", { name: "Scarif", exact: true }).click();
  await page.getByRole("heading", { name: "Scarif", exact: true }).waitFor();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await page.getByRole("heading", { name: "Citadel City", exact: true }).waitFor();
  await page.getByRole("button", { name: "Close entity details" }).click();
  console.log("PASS result keyboard selection, clickable breadcrumbs, and existing drawer back history");

  await page.setViewportSize({ width: 390, height: 640 });
  await page.getByRole("button", { name: "Search world", exact: true }).click();
  await search.fill("fortress");
  await page.setViewportSize({ width: 390, height: 420 });
  const option = page.getByRole("option", { name: /Citadel City/ });
  await option.waitFor();
  await page.waitForFunction(() => {
    const list = document.querySelector('[role="listbox"]')?.getBoundingClientRect();
    return list && list.top >= 0 && list.bottom <= 420;
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390));
  await page.screenshot({ path: join(screenshots, "search-mobile-short-viewport.png") });
  await option.click();
  await page.getByRole("heading", { name: "Citadel City", exact: true }).waitFor();
  await page.waitForFunction(() => {
    const drawer = document.querySelector('[aria-label="Close entity details"]')?.closest(".MuiDrawer-paper")?.getBoundingClientRect();
    return drawer && drawer.left >= -0.5 && drawer.right <= 390.5;
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390));
  await page.screenshot({ path: join(screenshots, "breadcrumbs-mobile.png") });
  await page.getByRole("button", { name: "Close entity details" }).click();
  await page.getByRole("button", { name: "Search world", exact: true }).click();
  await search.fill("Nothing matches this phrase");
  await page.getByText("No matching records", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Close search" }).click();
  console.log("PASS short mobile viewport, selectable search results, empty state, and drawer width");
  assert.deepEqual(errors, []);
  console.log("PASS no uncaught browser exceptions or world writes");
} catch (error) {
  console.log("PAGE", await page.locator("body").innerText());
  console.log("BROWSER ERRORS", errors);
  await page.screenshot({ path: join(screenshots, "failure.png"), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
