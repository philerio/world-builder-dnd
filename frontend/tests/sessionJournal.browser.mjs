/* global window, document */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const base = process.env.WORLD_BUILDER_TEST_URL ?? "http://127.0.0.1:5191";
const screenshots = join(tmpdir(), "world-builder-session-journal-checks");
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const campaign = {
      id: "journal-campaign",
      name: "Journal Test Campaign",
      status: "active",
      npcs: ["guard"],
      locations: [],
      player_characters: [],
      story: {
        current_beat: "gate",
        beats: [
          {
            id: "gate",
            name: "At the gate",
            status: "in_progress",
            scene_script: [
              {
                id: "speech",
                kind: "dialogue",
                text: "Welcome",
                speaker: "Guard",
              },
            ],
            consequences: [],
          },
          {
            id: "captain",
            name: "Meet the captain",
            status: "planned",
            consequences: [],
          },
        ],
        player_actions: [
          {
            id: "party",
            description: "The party lies",
            session: 2,
            reviewed: false,
          },
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
        session_preps: [{ session: 2, plot_point_ids: ["gate"] }],
        session_recaps: [{ session: 1, summary: "Earlier session" }],
        combat_results: [{ id: "combat", summary: "Preserve combat history" }],
      },
    };
    const before = structuredClone(campaign);
    const guard = {
      id: "guard",
      name: "Test Guard",
      secrets: ["Keep canonical secret"],
      motives: [],
      goals: [],
      fears: [],
      knowledge: [],
      events: [],
      relationships: [],
    };
    const npcBefore = JSON.stringify(guard);
    const world = {
      world: {
        id: "journal-world",
        name: "Journal Test World",
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
    let failJournal = true;
    let failRecap = true;
    let writes = 0;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.slice(4);
      if (path === "/world") return route.fulfill({ json: world });
      if (path === "/validation")
        return route.fulfill({
          json: { valid: true, errors: [], warnings: [] },
        });
      if (path === "/entities")
        return route.fulfill({
          json: [
            { id: campaign.id, name: campaign.name, entity_type: "campaign" },
            { id: guard.id, name: guard.name, entity_type: "npc" },
          ],
        });
      if (path === "/entities/journal-campaign") {
        if (request.method() === "PUT") {
          const payload = request.postDataJSON();
          if (failJournal && payload.story.session_entries?.length) {
            failJournal = false;
            return route.fulfill({
              status: 503,
              json: { detail: "Temporary journal save failure" },
            });
          }
          if (
            failRecap &&
            payload.story.session_recaps?.some((recap) => recap.session === 2)
          ) {
            failRecap = false;
            return route.fulfill({
              status: 503,
              json: { detail: "Temporary recap save failure" },
            });
          }
          writes += 1;
          Object.assign(campaign, payload);
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
    page.on("dialog", (dialog) => dialog.accept());
    const journal = () =>
      page.getByRole("region", { name: "Session journal", exact: true });
    await page.goto(
      `${base}/campaigns/journal-campaign?workspace=session&session=2`
    );
    await journal().waitFor();
    const secret =
      "Private motive: the guard is afraid.\n\nRemember the hidden witness.";
    await journal()
      .getByLabel("What happened / DM note", { exact: true })
      .fill(secret);
    await page.reload();
    await journal().waitFor();
    assert.equal(
      await journal()
        .getByLabel("What happened / DM note", { exact: true })
        .inputValue(),
      secret
    );
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    await journal()
      .getByText(
        "Entry was not saved. Your draft is still here; retry when ready.",
        { exact: true }
      )
      .waitFor();
    assert.equal(
      await journal()
        .getByLabel("What happened / DM note", { exact: true })
        .inputValue(),
      secret
    );
    assert.equal(campaign.story.session_entries, undefined);
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    await journal()
      .getByRole("article", { name: `DM note: ${secret}`, exact: true })
      .waitFor();
    assert.equal(campaign.story.session_entries.length, 1);
    assert.equal(campaign.story.player_actions.length, 1);
    const pickKind = async (name) => {
      await journal().getByLabel("Journal entry type", { exact: true }).click();
      await page.getByRole("option", { name, exact: true }).click();
    };
    await pickKind("NPC action / reaction");
    await journal()
      .getByLabel("NPCs involved (optional)", { exact: true })
      .fill("Test");
    await page.getByRole("option", { name: "Test Guard", exact: true }).click();
    await page.keyboard.press("Escape");
    await journal()
      .getByLabel("In response to (optional)", { exact: true })
      .fill("Party:");
    await page
      .getByRole("option", { name: "Party: The party lies", exact: true })
      .click();
    const reaction = "The guard quietly sends for the captain.";
    await journal()
      .getByLabel("What happened / DM note", { exact: true })
      .fill(reaction);
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    const reactionCard = () =>
      journal().getByRole("article", {
        name: `NPC action / reaction: ${reaction}`,
        exact: true,
      });
    await reactionCard().waitFor();
    const npcEntry = campaign.story.session_entries.find(
      (entry) => entry.kind === "npc_action"
    );
    assert.deepEqual(npcEntry.npc_ids, ["guard"]);
    assert.equal(npcEntry.source_action_id, "party");
    await pickKind("Follow-up");
    await journal()
      .getByRole("button", { name: "Add writing prompts", exact: true })
      .click();
    assert.match(
      await journal()
        .getByLabel("What happened / DM note", { exact: true })
        .inputValue(),
      /Before next session/
    );
    await journal()
      .getByLabel("What happened / DM note", { exact: true })
      .fill("Prepare captain dialogue");
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    await journal()
      .getByRole("article", {
        name: "Follow-up: Prepare captain dialogue",
        exact: true,
      })
      .waitFor();
    await pickKind("World change");
    await journal()
      .getByLabel("What happened / DM note", { exact: true })
      .fill("The east bridge closes.");
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    await journal()
      .getByRole("article", {
        name: "World change: The east bridge closes.",
        exact: true,
      })
      .waitFor();
    await reactionCard()
      .getByRole("button", { name: "Create consequence", exact: true })
      .click();
    const consequence = page.getByRole("dialog", {
      name: "Create consequence",
      exact: true,
    });
    await consequence
      .getByLabel("What happens next?", { exact: true })
      .fill("The captain may question the party.");
    await consequence
      .getByLabel("When or under what condition?", { exact: true })
      .fill("At the next watch change");
    await consequence
      .getByLabel("Possible next plot points (optional)", { exact: true })
      .click();
    await page
      .getByRole("option", { name: "Meet the captain", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await consequence
      .getByRole("button", { name: "Save consequence", exact: true })
      .click();
    await consequence.waitFor({ state: "hidden" });
    const savedConsequence = campaign.story.beats[0].consequences[0];
    assert.equal(savedConsequence.status, "pending");
    assert.equal(savedConsequence.trigger, reaction);
    assert.deepEqual(savedConsequence.leads_to, ["captain"]);
    assert.deepEqual(
      campaign.story.session_entries.find((entry) => entry.id === npcEntry.id)
        .consequence_ids,
      [savedConsequence.id]
    );
    assert.equal(campaign.story.current_beat, "gate");
    assert.equal(campaign.story.beats[1].status, "planned");
    assert.equal(campaign.story.world_clocks[0].current, 1);
    await journal()
      .getByLabel("Search this session’s journal", { exact: true })
      .fill("captain");
    assert.equal(await journal().getByRole("article").count(), 2);
    await journal()
      .getByLabel("Search this session’s journal", { exact: true })
      .clear();
    await journal().screenshot({
      path: join(screenshots, `journal-${viewport.width}.png`),
    });
    await page
      .getByRole("button", { name: "Session summary", exact: true })
      .click();
    let recap = page.getByRole("dialog", {
      name: "Add session recap",
      exact: true,
    });
    await recap
      .getByLabel("Session summary", { exact: true })
      .fill("My authored opening.");
    await recap
      .getByRole("button", { name: "Add session log outline", exact: true })
      .click();
    const summary = await recap
      .getByLabel("Session summary", { exact: true })
      .inputValue();
    const privateNotes = await recap
      .getByLabel("Private DM notes / next session", { exact: true })
      .inputValue();
    assert(summary.startsWith("My authored opening."));
    assert(summary.includes(reaction));
    assert(summary.includes("The east bridge closes."));
    assert(!summary.includes("Private motive"));
    assert(!summary.includes("Prepare captain dialogue"));
    assert(privateNotes.includes(secret));
    assert(privateNotes.includes("Prepare captain dialogue"));
    await recap
      .getByRole("button", { name: "Save recap", exact: true })
      .click();
    await recap
      .getByText("Temporary recap save failure", { exact: true })
      .waitFor();
    assert.equal(
      await recap.getByLabel("Session summary", { exact: true }).inputValue(),
      summary
    );
    await recap.screenshot({
      path: join(screenshots, `summary-${viewport.width}.png`),
    });
    await recap
      .getByRole("button", { name: "Save recap", exact: true })
      .click();
    await recap.waitFor({ state: "hidden" });
    assert.equal(
      campaign.story.session_recaps.filter((item) => item.session === 2).length,
      1
    );
    await page
      .getByRole("button", { name: "Session history", exact: true })
      .click();
    const history = page.getByRole("dialog", {
      name: "Session history",
      exact: true,
    });
    await history.getByText("My authored opening.", { exact: false }).waitFor();
    await history
      .getByRole("article", {
        name: `NPC action / reaction: ${reaction}`,
        exact: true,
      })
      .waitFor();
    await history.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Close out", exact: true }).click();
    const closeout = page.getByRole("dialog", {
      name: "Session closeout",
      exact: true,
    });
    await closeout
      .getByRole("button", { name: "Mark reviewed", exact: true })
      .click();
    await closeout
      .getByText("All logged actions have been reviewed.", { exact: true })
      .waitFor();
    await closeout.getByRole("button", { name: "Done", exact: true }).click();
    await journal()
      .getByRole("button", { name: "Mark follow-up done", exact: true })
      .click();
    await journal()
      .getByRole("button", { name: "Reopen follow-up", exact: true })
      .waitFor();
    await page.reload();
    await journal().waitFor();
    assert.equal(await journal().getByRole("article").count(), 4);
    await page
      .getByRole("button", { name: "Session summary", exact: true })
      .click();
    recap = page.getByRole("dialog", {
      name: "Edit Session 2 recap",
      exact: true,
    });
    assert.equal(
      await recap.getByLabel("Session summary", { exact: true }).inputValue(),
      summary
    );
    await recap.getByRole("button", { name: "Cancel", exact: true }).click();
    // A session with only DM notes still has history and a writable recap.
    await page
      .getByRole("spinbutton", { name: "Session", exact: true })
      .fill("4");
    await journal()
      .getByLabel("What happened / DM note", { exact: true })
      .fill("A session-four private note.");
    await journal()
      .getByRole("button", { name: "Save journal entry", exact: true })
      .click();
    await journal()
      .getByRole("article", {
        name: "DM note: A session-four private note.",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Session summary", exact: true })
      .click();
    recap = page.getByRole("dialog", {
      name: "Add session recap",
      exact: true,
    });
    await recap.waitFor().catch(async (error) => {
      console.error({
        selectedSession: await page
          .getByRole("spinbutton", { name: "Session", exact: true })
          .inputValue(),
        sessions: campaign.story.session_entries.map((entry) => entry.session),
        recapSessions: campaign.story.session_recaps.map(
          (item) => item.session
        ),
        dialogText: await page.getByRole("dialog").allTextContents(),
      });
      throw error;
    });
    assert.equal(
      await recap
        .getByRole("spinbutton", { name: /^Session number/ })
        .inputValue(),
      "4"
    );
    await recap
      .getByRole("button", { name: "Add session log outline", exact: true })
      .click();
    assert.equal(
      await recap.getByLabel("Session summary", { exact: true }).inputValue(),
      ""
    );
    assert.match(
      await recap
        .getByLabel("Private DM notes / next session", { exact: true })
        .inputValue(),
      /session-four private note/
    );
    await recap
      .getByRole("button", { name: "Save recap", exact: true })
      .click();
    await recap.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Session history", exact: true })
      .click();
    await history
      .getByRole("heading", { name: "Session 4", exact: true })
      .waitFor();
    await history
      .getByRole("article", {
        name: "DM note: A session-four private note.",
        exact: true,
      })
      .waitFor();
    await history.getByRole("button", { name: "Close", exact: true }).click();
    assert.deepEqual(
      campaign.story.combat_results,
      before.story.combat_results
    );
    assert.deepEqual(campaign.story.session_preps, before.story.session_preps);
    assert.deepEqual(
      campaign.story.beats[0].scene_script,
      before.story.beats[0].scene_script
    );
    assert.equal(campaign.story.current_beat, "gate");
    assert.equal(JSON.stringify(guard), npcBefore);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      ),
      false
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${viewport.width}px: draft recovery, save retries, NPC causes, pending consequences, private recap outline, live history/closeout, reload (${writes} confirmed writes)`
    );
    await context.close();
  }
} finally {
  await browser.close();
}
