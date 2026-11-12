/* global window, document, requestAnimationFrame */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const campaign = {
  id: "typing-campaign",
  name: "Typing Test",
  status: "active",
  locations: [],
  npcs: [],
  player_characters: [],
  story: {
    current_beat: "beat-0",
    beats: Array.from({ length: 12 }, (_, i) => ({
      id: `beat-${i}`,
      name: `Plot ${i}`,
      status: i ? "planned" : "in_progress",
      description: "The guards question the party.",
      scene_script: [
        {
          id: `section-${i}`,
          kind: "narration",
          text: "The city gates stand open.",
        },
      ],
      consequences: [
        {
          id: `cause-${i}`,
          description: `The patrol may investigate ${i}`,
          status: "pending",
        },
      ],
    })),
    player_actions: Array.from({ length: 30 }, (_, i) => ({
      id: `action-${i}`,
      description: `The party spoke with guard ${i}`,
      session: 2,
      reviewed: false,
    })),
    session_entries: Array.from({ length: 20 }, (_, i) => ({
      id: `entry-${i}`,
      description: `Guard ${i} reports to the captain`,
      session: 2,
      kind: "npc_action",
      npc_ids: [],
    })),
    world_clocks: [],
    session_preps: [{ session: 2, plot_point_ids: ["beat-0"] }],
  },
};
const world = {
  world: { id: "typing-world", name: "Typing Test World" },
  campaigns: [campaign],
  continents: [],
  kingdoms: [],
  regions: [],
  cities: [],
  locations: [],
  npcs: [],
  player_characters: [],
  world_events: [],
  timeline_events: [],
  lores: [],
  artifacts: [],
  world_stories: [],
  maps: [],
  price_lists: [],
  dm_scratchpad_entries: [],
};
let writes = 0;
let failNextSave = false;
await context.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.slice(4);
  if (path === "/world") return route.fulfill({ json: world });
  if (path === "/entities")
    return route.fulfill({
      json: [{ id: campaign.id, name: campaign.name, entity_type: "campaign" }],
    });
  if (path === "/validation")
    return route.fulfill({ json: { valid: true, errors: [], warnings: [] } });
  if (path === "/entities/typing-campaign") {
    if (request.method() === "PUT") {
      if (failNextSave) {
        failNextSave = false;
        return route.fulfill({
          status: 503,
          json: { detail: "Typing test save interrupted" },
        });
      }
      writes += 1;
      Object.assign(campaign, request.postDataJSON());
    }
    return route.fulfill({
      json: { id: campaign.id, entity_type: "campaign", entity: campaign },
    });
  }
  return route.fulfill({ json: [] });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());
await page.addInitScript(() => {
  // Inspect committed renders in the dev server, without adding instrumentation to the app.
  window.typing = { start: 0, renders: {}, latencies: [], commits: 0 };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      this.renderers.set(1, renderer);
      return 1;
    },
    onCommitFiberRoot(_id, root) {
      window.typing.commits += 1;
      const visit = (fiber) => {
        if (!fiber) return;
        const name = fiber.type?.name;
        if (
          name &&
          fiber.flags & 1 &&
          fiber.actualStartTime >= window.typing.start
        ) {
          window.typing.renders[name] = (window.typing.renders[name] ?? 0) + 1;
        }
        visit(fiber.child);
        visit(fiber.sibling);
      };
      visit(root.current);
    },
    onCommitFiberUnmount() {},
  };
  document.addEventListener(
    "input",
    () => {
      const start = performance.now();
      requestAnimationFrame(() =>
        window.typing.latencies.push(performance.now() - start)
      );
    },
    true
  );
});
async function typeLocally(input, text, { journal = false } = {}) {
  await input.click();
  // Let focus and autocomplete state settle before counting text edits.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );
  await page.evaluate(() => {
    window.typing = {
      start: performance.now(),
      renders: {},
      latencies: [],
      commits: 0,
    };
  });
  await input.pressSequentially(text);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const result = await page.evaluate(() => window.typing);
  assert.ok(result.commits > 0, "The render probe must observe typing");
  assert.equal(
    result.renders.CampaignDashboardPage ?? 0,
    0,
    "Typing must not re-render the whole dashboard"
  );
  if (journal)
    assert.equal(
      result.renders.SessionEntryList ?? 0,
      0,
      "Typing must not re-render saved journal entries"
    );
  const sorted = result.latencies.toSorted((a, b) => a - b);
  console.log(
    `Typing (${
      (await input.getAttribute("aria-label")) ??
      (await input.getAttribute("id"))
    }): ${Math.round(
      sorted[Math.floor(sorted.length / 2)] ?? 0
    )}ms median input-to-frame`
  );
}
const button = (name) => page.getByRole("button", { name, exact: true });
try {
  await page.goto(`${base}/campaigns/${campaign.id}`);
  await button("Edit plot point Plot 0").click();
  assert.ok((await page.evaluate(() => window.typing.commits)) > 0);
  const name = page.getByLabel("Plot point name", { exact: true }).first();
  await typeLocally(name, " at the gate");
  const script = page.getByLabel("Section 1 text", { exact: true });
  await typeLocally(script, "\n\nThe captain watches.");
  const description = page
    .getByRole("textbox", { name: "Plot point description", exact: true })
    .first();
  await description.press("End");
  await typeLocally(description, " The guard smiles.");
  await button("Save changes").click();
  await page.getByText("Plot 0 at the gate", { exact: true }).first().waitFor();
  assert.equal(writes, 1);
  assert.equal(campaign.story.beats[0].name, "Plot 0 at the gate");
  assert.equal(
    campaign.story.beats[0].scene_script[0].text,
    "The city gates stand open.\n\nThe captain watches."
  );
  assert.match(campaign.story.beats[0].description, /The guard smiles\./);

  const party = page.getByLabel("What did the party do?", { exact: true });
  const action = "The party hands over the letter.";
  await typeLocally(party, action);
  await button("During Session").click();
  assert.equal(
    await party.inputValue(),
    action,
    "Switching workspace must retain the unfinished capture"
  );
  await button("Dashboard").click();
  assert.equal(await party.inputValue(), action);
  failNextSave = true;
  await button("Log Action").click();
  await page
    .getByText(
      /Could not save campaign|API returned 503|Typing test save interrupted/
    )
    .first()
    .waitFor();
  assert.equal(
    await party.inputValue(),
    action,
    "Failed saves must retain the latest text"
  );
  await button("Log Action").click();
  await page.waitForFunction(
    () => document.querySelector("textarea")?.value === ""
  );
  assert.equal(campaign.story.player_actions[0].description, action);

  await button("Session Prep").click();
  const agenda = page.getByLabel("Session agenda", { exact: true });
  await typeLocally(agenda, "Introduce the missing captain.");
  await typeLocally(
    page.getByLabel("Private prep notes", { exact: true }),
    "Remember the hidden witness."
  );
  await button("Save prep").click();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].some((item) =>
        item.textContent.includes("Saving")
      )
  );
  assert.ok(
    campaign.story.session_preps.some(
      (item) =>
        item.agenda === "Introduce the missing captain." &&
        item.dm_notes === "Remember the hidden witness."
    )
  );

  await button("During Session").click();
  const journal = page.getByLabel("What happened / DM note", { exact: true });
  await journal.fill("Private: ");
  await typeLocally(journal, "The guard knows the truth.", { journal: true });
  await button("Save journal entry").click();
  await page
    .getByRole("article", {
      name: "DM note: Private: The guard knows the truth.",
      exact: true,
    })
    .waitFor();
  await button("Session summary").click();
  const recap = page.getByRole("dialog");
  await typeLocally(
    recap.getByLabel("Session summary", { exact: true }),
    "The party reached the city."
  );
  await typeLocally(
    recap.getByLabel("Private DM notes / next session", { exact: true }),
    "Prepare the captain's response."
  );
  await button("Save recap").click();
  await recap.waitFor({ state: "hidden" });
  assert.ok(
    campaign.story.session_recaps.some(
      (item) =>
        item.summary === "The party reached the city." &&
        item.notes === "Prepare the captain's response."
    )
  );
  await button("Dashboard").click();
  await button("Edit campaign description and arc").click();
  const arc = page.getByRole("dialog", {
    name: "Edit campaign arc",
    exact: true,
  });
  await typeLocally(
    arc.getByLabel("Campaign overview", { exact: true }),
    "A city on the brink."
  );
  await arc.getByRole("button", { name: "Save", exact: true }).click();
  await arc.waitFor({ state: "hidden" });
  assert.equal(campaign.overview, "A city on the brink.");

  const newPlot = page.getByLabel("Plot point name", { exact: true });
  await typeLocally(newPlot, "Meet the captain");
  await button("Add Plot Point").click();
  await page.getByText("Meet the captain", { exact: true }).first().waitFor();
  assert.ok(
    campaign.story.beats.some((beat) => beat.name === "Meet the captain")
  );

  const clocks = page.locator("#campaign-clocks");
  await typeLocally(
    clocks.getByLabel("Clock name", { exact: true }),
    "Patrol arrives"
  );
  await button("Add Clock").click();
  await button("Edit clock Patrol arrives").click();
  await typeLocally(
    clocks.getByLabel("Clock name", { exact: true }).first(),
    " soon"
  );
  await clocks
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await button("Edit clock Patrol arrives soon").waitFor();
  assert.equal(campaign.story.world_clocks[0].name, "Patrol arrives soon");

  await button("Edit consequence").first().click();
  const consequences = page.locator("#campaign-consequences");
  await typeLocally(
    consequences.getByLabel("Description", { exact: true }),
    " after sunset"
  );
  await consequences.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByText("The patrol may investigate 0 after sunset", { exact: true })
    .waitFor();
  assert.equal(
    campaign.story.beats[0].consequences[0].description,
    "The patrol may investigate 0 after sunset"
  );

  await button("Edit player action").first().click();
  await typeLocally(
    page.getByLabel("Notes", { exact: true }),
    "The guard keeps the letter."
  );
  await button("Save").click();
  await button("Edit player action").first().waitFor();
  assert.equal(
    campaign.story.player_actions[0].notes,
    "The guard keeps the letter."
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: isolated typing, rich text and scripts, immediate saves, workspace draft retention, save retry, prep, journal, and recap"
  );
} finally {
  await browser.close();
}
