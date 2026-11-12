/* global window, getComputedStyle */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-scene-script-checks");
await mkdir(screenshots, { recursive: true });
const paragraph =
  "Two guards stand at the gates.\nTheir boots scrape the cobbles.\n\nTheir crossbows are loaded.";
const dialogue = "Hold there. What brings you to the city?";
const note =
  "Private: the guard is nervous. <script>window.scriptExecuted = true</script>";
const briefing = Array.from(
  { length: 18 },
  (_, index) =>
    `Briefing paragraph ${
      index + 1
    }. The captain explains what the patrol saw along the northern road. The party has time to ask questions before deciding where to go next.`
);
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const campaign = {
      id: "script-campaign",
      name: "Script test campaign",
      status: "active",
      locations: [],
      npcs: ["guard"],
      player_characters: [],
      story: {
        current_beat: "gates",
        beats: [
          {
            id: "market",
            name: "The market",
            status: "planned",
            order: 2,
            scene_script: [
              {
                id: "market-text",
                kind: "narration",
                text: "The market bustles with life.",
              },
            ],
          },
          {
            id: "gates",
            name: "At the city gates",
            status: "in_progress",
            order: 1,
            description: "Keep this summary.",
            events: "Keep the possible events.",
            description_content: {
              nodes: [
                { type: "text", text: "Meet " },
                { type: "entity_link", text: "the guard", entity_id: "guard" },
              ],
            },
            consequences: [
              {
                id: "alarm",
                description: "The alarm could sound",
                status: "pending",
              },
            ],
          },
          {
            id: "briefing",
            name: "The captain’s briefing",
            status: "planned",
            order: 3,
            scene_script: [
              {
                id: "briefing-text",
                kind: "narration",
                text: briefing.join("\n\n"),
              },
            ],
          },
        ],
        player_actions: [
          { id: "earlier", description: "Arrived at the city", session: 1 },
        ],
        world_clocks: [
          {
            id: "patrol",
            name: "Patrol",
            current: 1,
            maximum: 4,
            status: "active",
          },
        ],
        session_preps: [{ session: 2, plot_point_ids: ["gates"] }],
        combat_results: [
          { id: "existing-result", notes: "Preserve combat history" },
        ],
      },
    };
    const before = structuredClone(campaign);
    const guard = {
      id: "guard",
      name: "Test Guard",
      motives: [],
      goals: [],
      fears: [],
      secrets: [],
      knowledge: [],
      events: [],
      relationships: [],
    };
    const world = {
      world: {
        id: "script-world",
        name: "Script Test World",
        version: "1",
        author: "Test",
        continents: [],
      },
      campaigns: [campaign],
      npcs: [guard],
      continents: [],
      kingdoms: [],
      regions: [],
      cities: [],
      locations: [],
      player_characters: [],
      world_events: [],
      timeline_events: [],
      lores: [],
      artifacts: [],
      world_stories: [],
      dm_scratchpad_entries: [],
      maps: [],
      price_lists: [],
    };
    let writes = 0;
    let failNext = true;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.slice(4);
      if (path === "/world") return route.fulfill({ json: world });
      if (path === "/validation")
        return route.fulfill({
          json: { errors: [], warnings: [], valid: true },
        });
      if (path === "/entities")
        return route.fulfill({
          json: [
            { id: campaign.id, name: campaign.name, entity_type: "campaign" },
            { id: guard.id, name: guard.name, entity_type: "npc" },
          ],
        });
      if (path === "/entities/script-campaign") {
        if (request.method() === "PUT") {
          if (failNext) {
            failNext = false;
            return route.fulfill({
              status: 503,
              json: { detail: "Script save interrupted" },
            });
          }
          writes += 1;
          Object.assign(campaign, request.postDataJSON());
        }
        return route.fulfill({
          json: { id: campaign.id, entity_type: "campaign", entity: campaign },
        });
      }
      if (path === "/entities/guard")
        return route.fulfill({
          json: { id: guard.id, entity_type: "npc", entity: guard },
        });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const write = () =>
      page.getByRole("button", {
        name: "Write scene script for At the city gates",
        exact: true,
      });
    await page.goto(`${base}/campaigns/script-campaign`);
    await write()
      .click()
      .catch(async (error) => {
        console.error(errors, await page.locator("body").innerText());
        await page.screenshot({
          path: join(screenshots, `failure-${viewport.width}.png`),
        });
        throw error;
      });
    let editor = page.getByRole("region", {
      name: "Scene script editor",
      exact: true,
    });
    await editor
      .getByRole("button", { name: "Add paragraph", exact: true })
      .click();
    await editor
      .getByLabel("Section 1 text", { exact: true })
      .fill("Discard this draft");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(writes, 0);
    assert.equal(campaign.story.beats[1].scene_script, undefined);
    await write().click();
    editor = page.getByRole("region", {
      name: "Scene script editor",
      exact: true,
    });
    await editor
      .getByRole("button", { name: "Add paragraph", exact: true })
      .click();
    await editor.getByLabel("Section 1 text", { exact: true }).fill(paragraph);
    await editor
      .getByRole("button", { name: "Add dialogue", exact: true })
      .click();
    await editor
      .getByLabel("Section 2 speaker", { exact: true })
      .fill("Left guard");
    await editor.getByLabel("Section 2 text", { exact: true }).fill(dialogue);
    await editor
      .getByRole("button", { name: "Add DM note", exact: true })
      .click();
    await editor.getByLabel("Section 3 text", { exact: true }).fill(note);
    await editor
      .getByRole("button", { name: "Move script section 3 up", exact: true })
      .click();
    assert.equal(
      await editor.getByLabel("Section 2 text", { exact: true }).inputValue(),
      note
    );
    await editor
      .getByRole("button", { name: "Move script section 2 down", exact: true })
      .click();
    assert.equal(
      await editor
        .getByLabel("Section 2 speaker", { exact: true })
        .inputValue(),
      "Left guard"
    );
    await editor
      .getByRole("button", { name: "Add paragraph", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Remove script section 4", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Preview scene script", exact: true })
      .click();
    assert.deepEqual(
      (
        await editor
          .getByRole("region", { name: "Scene script text", exact: true })
          .locator("p")
          .allTextContents()
      ).slice(0, 2),
      paragraph.split("\n\n")
    );
    await editor.getByText("Left guard", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.scriptExecuted), undefined);
    await editor
      .getByRole("button", { name: "Continue writing", exact: true })
      .click();
    await editor.screenshot({
      path: join(screenshots, `editor-${viewport.width}.png`),
    });
    const failed = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && response.status() === 503
    );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await failed;
    await page.getByText("Script save interrupted", { exact: true }).waitFor();
    assert.equal(
      await editor.getByLabel("Section 1 text", { exact: true }).inputValue(),
      paragraph
    );
    assert.equal(writes, 0);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    const read = () =>
      page.getByRole("button", {
        name: "Read scene script for At the city gates",
        exact: true,
      });
    await read().waitFor();
    assert.equal(writes, 1);
    const saved = campaign.story.beats.find((beat) => beat.id === "gates");
    assert.deepEqual(
      saved.scene_script.map(({ kind, text }) => ({ kind, text })),
      [
        { kind: "narration", text: paragraph },
        { kind: "dialogue", text: dialogue },
        { kind: "dm_note", text: note },
      ]
    );
    assert.equal(saved.scene_script[1].speaker, "Left guard");
    assert.equal(new Set(saved.scene_script.map((block) => block.id)).size, 3);
    assert.deepEqual(
      saved.description_content,
      before.story.beats[1].description_content
    );
    assert.deepEqual(saved.consequences, before.story.beats[1].consequences);
    for (const field of [
      "player_actions",
      "world_clocks",
      "session_preps",
      "combat_results",
      "current_beat",
    ])
      assert.deepEqual(campaign.story[field], before.story[field]);
    await read().click();
    let reader = page.getByRole("dialog", {
      name: "Scene script",
      exact: true,
    });
    await reader.getByText(dialogue, { exact: true }).waitFor();
    assert.deepEqual(
      (
        await reader
          .getByRole("region", { name: "Scene script text", exact: true })
          .locator("p")
          .allTextContents()
      ).slice(0, 2),
      paragraph.split("\n\n")
    );
    assert.equal(
      await reader
        .getByText(paragraph.split("\n\n")[0], { exact: true })
        .evaluate((el) => getComputedStyle(el).whiteSpace),
      "pre-wrap"
    );
    await reader
      .getByRole("checkbox", { name: "Show DM notes", exact: true })
      .uncheck();
    assert.equal(await reader.getByText(note, { exact: true }).count(), 0);
    const height = (await reader.boundingBox()).height;
    await reader
      .getByRole("button", { name: "Next scene", exact: true })
      .click();
    await reader
      .getByText("The market bustles with life.", { exact: true })
      .waitFor();
    assert.equal((await reader.boundingBox()).height, height);
    assert.equal(campaign.story.current_beat, "gates");
    await reader
      .getByRole("button", { name: "Previous scene", exact: true })
      .click();
    await reader
      .getByRole("checkbox", { name: "Show DM notes", exact: true })
      .check();
    await reader.screenshot({
      path: join(screenshots, `reader-${viewport.width}.png`),
    });
    assert.equal(
      await reader.evaluate((el) => el.scrollWidth > el.clientWidth),
      false
    );
    assert.equal(await page.evaluate(() => window.scriptExecuted), undefined);
    // The reading area alone scrolls, even on a short screen. Headers and controls
    // stay in place, the last paragraph remains reachable, and changing scenes
    // starts reading at the top without changing campaign state.
    await page.setViewportSize({ width: viewport.width, height: 520 });
    await reader.getByLabel("Reading scene", { exact: true }).click();
    await page
      .getByRole("option", { name: "The captain’s briefing", exact: true })
      .click();
    const readingArea = () =>
      reader.getByRole("region", { name: "Scene reading area", exact: true });
    const close = reader.getByRole("button", { name: "Close", exact: true });
    await reader.getByText("Scene 3 of 3", { exact: true }).waitFor();
    assert.equal(await readingArea().evaluate((el) => el.scrollTop), 0);
    assert.ok(
      await readingArea().evaluate((el) => el.scrollHeight > el.clientHeight)
    );
    const closeBefore = await close.boundingBox();
    await readingArea().evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const last = await reader
      .getByText(briefing.at(-1), { exact: true })
      .boundingBox();
    const area = await readingArea().boundingBox();
    assert.ok(
      last.y >= area.y && last.y + last.height <= area.y + area.height + 1,
      "The final paragraph must be readable above the footer"
    );
    assert.deepEqual(
      await close.boundingBox(),
      closeBefore,
      "Navigation must not scroll with the prose"
    );
    assert.ok(
      closeBefore.y + closeBefore.height <= 520,
      "Close must fit the viewport"
    );
    assert.equal(
      await reader.evaluate((el) => el.scrollWidth > el.clientWidth),
      false
    );
    await reader.screenshot({
      path: join(screenshots, `reader-long-${viewport.width}.png`),
    });
    await reader
      .getByRole("button", { name: "Previous scene", exact: true })
      .click();
    await reader
      .getByText("The market bustles with life.", { exact: true })
      .waitFor();
    assert.equal(await readingArea().evaluate((el) => el.scrollTop), 0);
    assert.equal(campaign.story.current_beat, "gates");
    await page.setViewportSize(viewport);
    await reader.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "During Session", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Read scene script", exact: true })
      .click();
    reader = page.getByRole("dialog", { name: "Scene script", exact: true });
    await reader.getByText(dialogue, { exact: true }).waitFor();
    await reader.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Session Prep", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Read scene script for At the city gates",
        exact: true,
      })
      .click();
    reader = page.getByRole("dialog", { name: "Scene script", exact: true });
    await reader
      .getByText(paragraph.split("\n\n")[0], { exact: true })
      .waitFor();
    await reader.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await read().click();
    await page
      .getByRole("dialog", { name: "Scene script", exact: true })
      .getByText(dialogue, { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Close scene script", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("dialog", { name: "Scene script", exact: true })
        .count(),
      0
    );
    assert.deepEqual(errors, []);
    assert.equal(writes, 1);
    console.log(
      `PASS ${viewport.width}px: author, reorder, preview, cancel, retry, reload, paragraph breaks, reading order, private-note toggle, long-scene scrolling, fixed controls, scroll reset, session prep/live access`
    );
    await context.close();
  }
} finally {
  await browser.close();
}
