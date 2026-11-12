import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupSessionHistory,
  linkSessionConsequence,
  saveJournalEntry,
  sessionLogOutline,
} from "../src/utils/sessionJournal.ts";
import { campaignSessions } from "../src/utils/sessionDashboard.ts";

const fixture = () => ({
  current_beat: "gate",
  beats: [
    {
      id: "gate",
      name: "At the gate",
      status: "in_progress",
      scene_script: [{ id: "script", text: "Keep the script" }],
      consequences: [],
    },
    { id: "captain", name: "Meet the captain", status: "planned" },
  ],
  player_actions: [{ id: "party", description: "The party lies", session: 2 }],
  session_entries: [],
  world_clocks: [
    { id: "clock", name: "Patrol", current: 1, maximum: 4, status: "active" },
  ],
  combat_results: [{ id: "result" }],
  session_preps: [{ session: 2 }],
});

test("journal capture stays separate from party actions and preserves existing campaign state", () => {
  const story = fixture(),
    before = structuredClone(story);
  const entry = {
    id: "reaction",
    kind: "npc_action",
    session: 2,
    description: "The guard leaves.\n\nHe sends for help.",
    story_beat: "gate",
    source_action_id: "party",
    npc_ids: ["guard"],
  };
  const next = saveJournalEntry(story, entry);
  assert.equal(next.session_entries[0].description, entry.description);
  for (const key of [
    "player_actions",
    "beats",
    "world_clocks",
    "current_beat",
    "combat_results",
    "session_preps",
  ])
    assert.deepEqual(next[key], before[key]);
  assert.deepEqual(story, before);
  assert.equal(saveJournalEntry(next, entry).session_entries.length, 1);
});

test("a consequence is explicitly attached to its source and starts pending without advancing play", () => {
  const story = saveJournalEntry(fixture(), {
    id: "reaction",
    kind: "npc_action",
    session: 2,
    description: "The guard leaves",
    story_beat: "gate",
  });
  const source = { kind: "entry", id: "reaction" };
  const next = linkSessionConsequence(story, source, "gate", {
    id: "alarm",
    description: "The captain may arrive",
    status: "active",
    timing: "After ten minutes",
    leads_to: ["captain"],
  });
  assert.deepEqual(next.session_entries[0].consequence_ids, ["alarm"]);
  assert.equal(next.beats[0].consequences[0].trigger, "The guard leaves");
  assert.equal(next.beats[0].consequences[0].status, "pending");
  assert.equal(next.beats[1].status, "planned");
  assert.equal(next.current_beat, "gate");
  assert.equal(next.world_clocks[0].current, 1);
  assert.equal(
    linkSessionConsequence(next, source, "gate", {
      id: "alarm",
      description: "Retry",
      status: "pending",
    }),
    next
  );
  const edited = saveJournalEntry(next, {
    ...story.session_entries[0],
    description: "Edited",
  });
  assert.deepEqual(edited.session_entries[0].consequence_ids, ["alarm"]);
});

test("party-sourced consequences use the existing party action relation", () => {
  const next = linkSessionConsequence(
    fixture(),
    { kind: "action", id: "party" },
    "gate",
    {
      id: "suspicion",
      description: "The guard becomes suspicious",
      status: "pending",
    }
  );
  assert.equal(next.beats[0].consequences[0].player_action, "party");
  assert.deepEqual(next.player_actions[0].consequence_ids, ["suspicion"]);
});

test("stale sources, absent plot points, and invalid session entries block changes", () => {
  const story = fixture();
  assert.throws(
    () =>
      linkSessionConsequence(story, { kind: "entry", id: "gone" }, "gate", {
        id: "x",
        description: "Test",
      }),
    /source record/
  );
  assert.throws(
    () =>
      linkSessionConsequence(story, { kind: "action", id: "party" }, "gone", {
        id: "x",
        description: "Test",
      }),
    /plot point/
  );
  for (const change of [
    { description: " " },
    { session: 0 },
    { session: 1.5 },
    { story_beat: "gone" },
    { source_action_id: "gone" },
    { source_entry_id: "note" },
  ])
    assert.throws(() =>
      saveJournalEntry(story, {
        id: "note",
        kind: "dm_note",
        description: "Keep",
        session: 2,
        ...change,
      })
    );
});

test("journal-only sessions appear in history and choose the right live/prep session", () => {
  const story = {
    ...fixture(),
    player_actions: [],
    session_entries: [
      {
        id: "note",
        kind: "dm_note",
        description: "A private note",
        session: 4,
      },
    ],
    session_recaps: [{ session: 2, summary: "Earlier" }],
  };
  assert.deepEqual(campaignSessions(story), { next: 5, live: 4 });
  assert.deepEqual(
    groupSessionHistory(story).map((group) => group.session),
    [4, 2]
  );
  assert.equal(groupSessionHistory(story, "4")[0].entries[0].id, "note");
  assert.equal(groupSessionHistory(story, "2")[0].recap.summary, "Earlier");
});

test("recap outlines separate NPC/world events from DM secrets and unresolved follow-ups", () => {
  let story = fixture();
  for (const entry of [
    {
      id: "npc",
      kind: "npc_action",
      description: "The guard calls the captain",
      npc_ids: ["guard"],
    },
    { id: "world", kind: "world_change", description: "The bridge closes" },
    { id: "private", kind: "dm_note", description: "Secret allegiance" },
    { id: "open", kind: "follow_up", description: "Prepare captain stats" },
    {
      id: "done",
      kind: "follow_up",
      description: "Completed task",
      resolved: true,
    },
  ])
    story = saveJournalEntry(story, { session: 2, ...entry });
  story = saveJournalEntry(story, {
    id: "other",
    session: 8,
    kind: "dm_note",
    description: "Different session",
  });
  const outline = sessionLogOutline(story, 2, { guard: "Test Guard" });
  assert.match(outline.summary, /The party lies/);
  assert.match(outline.summary, /Test Guard/);
  assert.match(outline.summary, /The bridge closes/);
  assert.doesNotMatch(
    outline.summary,
    /Secret allegiance|Prepare captain|Different session|Completed task/
  );
  assert.match(outline.notes, /Secret allegiance/);
  assert.match(outline.notes, /Prepare captain stats/);
  assert.doesNotMatch(outline.notes, /Completed task|Different session/);
});
