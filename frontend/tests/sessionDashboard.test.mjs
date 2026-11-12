import assert from "node:assert/strict";
import { test } from "node:test";
import { appendCapturedAction, campaignSessions, campaignWorkspaceUrl, dashboardAttention, selectDashboardCampaign, structuredCampaignStory } from "../src/utils/sessionDashboard.ts";
import { parseWorkspacePreferences, recordRecentEntity, rememberCampaign, workspaceKey, workspaceSnapshot } from "../src/utils/workspacePreferences.ts";

const empty = () => ({ beats: [], player_actions: [], world_clocks: [] });

test("dashboard selection honors the DM's last campaign and safely falls back when it is removed", () => {
  const campaigns = [{ id: "done", name: "A finished campaign", status: "completed" }, { id: "planned", name: "Next campaign", status: "planned" }, { id: "active", name: "Current campaign", status: "active" }];
  assert.equal(selectDashboardCampaign(campaigns)?.id, "active");
  assert.equal(selectDashboardCampaign(campaigns, "done")?.id, "done");
  assert.equal(selectDashboardCampaign(campaigns, "deleted")?.id, "active");
  assert.equal(selectDashboardCampaign([]), undefined);
  assert.equal(campaigns[0].id, "done");
});

test("prep and live session numbers follow existing action and recap history", () => {
  assert.deepEqual(campaignSessions(empty()), { next: 1, live: 1 });
  const story = { ...empty(), player_actions: [{ id: "a", description: "Unreviewed", session: 2 }, { id: "b", description: "Reviewed", session: 4, reviewed: true }], session_recaps: [{ session: 3 }], session_preps: [{ session: 20 }] };
  assert.deepEqual(campaignSessions(story), { next: 5, live: 2 });
  assert.deepEqual(campaignSessions({ ...story, player_actions: story.player_actions.map((action) => ({ ...action, reviewed: true })) }), { next: 5, live: 4 });
});

test("quick capture preserves existing story fields and adds an unreviewed action without advancing the story", () => {
  const campaign = { id: "campaign", name: "Campaign", overview: "Existing arc", story: { ...empty(), current_beat: "beat", beats: [{ id: "beat", name: "Scene", status: "planned" }], combat_results: [{ id: "result", notes: "Keep this" }], player_actions: [{ id: "old", description: "Earlier action", reviewed: true }] } };
  const original = structuredClone(campaign);
  const action = { id: "new", description: "The party negotiated", session: 2, story_beat: "beat", reviewed: false };
  const saved = appendCapturedAction(campaign, action);
  assert.deepEqual(saved.story.player_actions, [action, campaign.story.player_actions[0]]);
  assert.deepEqual(saved.story.combat_results, campaign.story.combat_results);
  assert.equal(saved.story.current_beat, "beat");
  assert.equal(saved.story.beats[0].status, "planned");
  assert.equal(saved.overview, "Existing arc");
  assert.deepEqual(campaign, original);
  assert.equal(appendCapturedAction(saved, action).story.player_actions.length, 2);
});

test("legacy story content is never converted or overwritten by quick capture", () => {
  const legacy = { nodes: [{ type: "text", text: "Keep the old story" }] };
  assert.equal(structuredCampaignStory(legacy), null);
  assert.throws(() => appendCapturedAction({ id: "old", name: "Old", story: legacy }, { id: "a", description: "Action" }), /older story content/);
  assert.equal(legacy.nodes[0].text, "Keep the old story");
  assert.deepEqual(structuredCampaignStory(undefined), empty());
});

test("a removed plot point blocks capture until the DM chooses to record without that link", () => {
  const campaign = { id: "c", name: "C", story: empty() };
  assert.throws(() => appendCapturedAction(campaign, { id: "a", description: "Action", story_beat: "removed" }), /no longer available/);
  assert.equal(appendCapturedAction(campaign, { id: "a", description: "Action" }).story.player_actions.length, 1);
});

test("attention includes active clocks, pending/active consequences, and unreviewed actions only", () => {
  const story = {
    ...empty(),
    player_actions: [{ id: "new", description: "New" }, { id: "old", description: "Old", reviewed: true }],
    world_clocks: [{ id: "slow", name: "Slow", current: 1, maximum: 4, status: "active" }, { id: "urgent", name: "Urgent", current: 3, maximum: 4, status: "active" }, { id: "paused", name: "Paused", current: 4, maximum: 4, status: "paused" }, { id: "done", name: "Done", current: 4, maximum: 4, status: "completed" }],
    beats: [{ id: "beat", name: "Scene", consequences: [{ id: "pending", description: "May happen", status: "pending" }, { id: "active", description: "Happening", status: "active" }, { id: "resolved", description: "Done", status: "resolved" }, { id: "prevented", description: "Avoided", status: "prevented" }] }],
  };
  const attention = dashboardAttention(story);
  assert.deepEqual(attention.actions.map((action) => action.id), ["new"]);
  assert.deepEqual(attention.clocks.map((clock) => clock.id), ["urgent", "slow"]);
  assert.deepEqual(attention.consequences.map(({ consequence }) => consequence.id), ["pending", "active"]);
  assert.equal(story.world_clocks[0].id, "slow");
});

test("workspace links encode campaign IDs and explicitly select the existing tools", () => {
  assert.equal(campaignWorkspaceUrl("c"), "/campaigns/c");
  assert.equal(campaignWorkspaceUrl("campaign / one", "prep", 3), "/campaigns/campaign%20%2F%20one?workspace=prep&session=3");
  assert.equal(campaignWorkspaceUrl("c", "dashboard", undefined, "actions"), "/campaigns/c?section=actions");
});

test("workspace preferences recover from malformed data and reject malformed IDs", () => {
  assert.deepEqual(parseWorkspacePreferences("bad json"), { recentEntityIds: [], locations: {} });
  const preferences = parseWorkspacePreferences(JSON.stringify({ recentEntityIds: ["npc", 2, "npc", "city"], locations: { campaign: "city", wrong: 2 }, lastCampaignId: false }));
  assert.deepEqual(preferences.recentEntityIds, ["npc", "city"]);
  assert.deepEqual(preferences.locations, { campaign: "city" });
  assert.equal(preferences.lastCampaignId, undefined);
  assert.notEqual(workspaceKey("one"), workspaceKey("two"));
});

test("recent records deduplicate, move to the front, stay bounded, and do not cross worlds", () => {
  for (let index = 0; index < 12; index++) recordRecentEntity("test-world-recents", `id-${index}`);
  recordRecentEntity("test-world-recents", "id-6");
  rememberCampaign("test-world-recents", "campaign");
  const preferences = parseWorkspacePreferences(workspaceSnapshot("test-world-recents"));
  assert.equal(preferences.recentEntityIds.length, 8);
  assert.equal(preferences.recentEntityIds[0], "id-6");
  assert.equal(new Set(preferences.recentEntityIds).size, 8);
  assert.equal(preferences.lastCampaignId, "campaign");
  assert.deepEqual(parseWorkspacePreferences(workspaceSnapshot("different-test-world")).recentEntityIds, []);
});
