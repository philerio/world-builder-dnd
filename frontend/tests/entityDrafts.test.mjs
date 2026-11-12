import assert from "node:assert/strict";
import { test } from "node:test";
import { draftKey, draftValuesEqual, mergeEntityDraft, readEntityDraft, removeEntityDraft, writeEntityDraft } from "../src/utils/entityDrafts.ts";
import { createAndLinkEntity } from "../src/utils/contextualCreation.ts";

function storage() {
  const entries = new Map();
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: (key) => entries.delete(key) };
}

test("drafts survive recovery, stay isolated by world and purpose, and can be discarded", () => {
  const memory = storage();
  const key = draftKey("Elligaesia", "edit:scarif");
  const draft = { version: 1, entityType: "kingdom", base: { name: "Scarif" }, data: { name: "Scarif", description: "Unfinished notes" }, savedAt: "2026-10-26T12:00:00Z" };
  assert.equal(writeEntityDraft(key, draft, memory), true);
  assert.deepEqual(readEntityDraft(key, memory), draft);
  assert.equal(readEntityDraft(draftKey("Another world", "edit:scarif"), memory), null);
  assert.equal(readEntityDraft(draftKey("Elligaesia", "create:capital:scarif"), memory), null);
  removeEntityDraft(key, memory);
  assert.equal(readEntityDraft(key, memory), null);
});

test("corrupt or incompatible drafts and unavailable browser storage do not break editing", () => {
  const memory = storage();
  for (const invalid of ["{", "null", "[]", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, entityType: "city", savedAt: "today", base: {}, data: [] })]) {
    memory.setItem("draft", invalid);
    assert.equal(readEntityDraft("draft", memory), null);
  }
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(readEntityDraft("draft", blocked), null);
  assert.equal(writeEntityDraft("draft", {}, blocked), false);
  assert.doesNotThrow(() => removeEntityDraft("draft", blocked));
});

test("object key ordering does not create false unsaved changes; array order matters", () => {
  assert.equal(draftValuesEqual({ a: { x: 1, y: 2 }, b: 3 }, { b: 3, a: { y: 2, x: 1 } }), true);
  assert.equal(draftValuesEqual(["a", "b"], ["b", "a"]), false);
});

test("saving a draft preserves unrelated newer fields", () => {
  const base = { name: "Scarif", description: "Original", capital: null };
  const draft = { ...base, description: "My notes" };
  const latest = { ...base, capital: "citadel", updated: "new revision" };
  const result = mergeEntityDraft(base, draft, latest);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.entity, { ...latest, description: "My notes" });
  assert.equal(latest.description, "Original");
});

test("conflicting field and office changes are surfaced before saving", () => {
  const base = { description: "Original", leadership: [{ title: "Ruler", holders: ["old"] }] };
  const draft = { description: "Mine", leadership: [{ title: "Ruler", holders: ["mine"] }] };
  const latest = { description: "Theirs", leadership: [{ title: "Ruler", holders: ["theirs"] }] };
  const result = mergeEntityDraft(base, draft, latest);
  assert.deepEqual(result.conflicts, ["description", "leadership"]);
  assert.deepEqual(result.entity, draft);
  assert.deepEqual(mergeEntityDraft(base, draft, draft).conflicts, []);
});

test("explicitly removing fields is retained while unrelated additions survive", () => {
  const result = mergeEntityDraft({ ruler: "old", name: "Scarif" }, { name: "Scarif" }, { ruler: "old", name: "Scarif", extra: "new" });
  assert.equal(Object.hasOwn(result.entity, "ruler"), false);
  assert.equal(result.entity.extra, "new");
  assert.deepEqual(result.conflicts, []);
});

test("a failed capital link is retried without creating a second city", async () => {
  let remembered = null;
  let creates = 0;
  let links = 0;
  const options = {
    entityType: "city", data: { name: "Citadel City", kingdom: "scarif" },
    create: async (type, data) => { creates++; return { id: "citadel", entity_type: type, entity: data }; },
    rememberCreated: (entity) => { remembered = entity; },
    link: async () => { links++; if (links === 1) throw new Error("Parent save failed"); },
  };
  await assert.rejects(createAndLinkEntity({ ...options, existing: null }), /Parent save failed/);
  assert.equal(remembered.id, "citadel");
  const result = await createAndLinkEntity({ ...options, existing: remembered });
  assert.equal(result.id, "citadel");
  assert.equal(creates, 1);
  assert.equal(links, 2);
});

test("creation failure never attempts to attach an unsaved entity", async () => {
  let remembered = false;
  let linked = false;
  await assert.rejects(createAndLinkEntity({
    existing: null, entityType: "location", data: { name: "New place" },
    create: async () => { throw new Error("API unavailable"); },
    rememberCreated: () => { remembered = true; },
    link: async () => { linked = true; },
  }), /API unavailable/);
  assert.equal(remembered, false);
  assert.equal(linked, false);
});
