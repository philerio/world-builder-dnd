import type {
  CampaignStory,
  PlayerAction,
  SessionEntry,
  SessionRecap,
  StoryConsequence,
} from "../types";

export const journalKinds: Record<
  SessionEntry["kind"],
  { label: string; prompt: string; starter: string }
> = {
  dm_note: {
    label: "DM note",
    prompt: "What do you need to remember? What remains uncertain?",
    starter: "Remember:\nQuestions to revisit:",
  },
  npc_action: {
    label: "NPC action / reaction",
    prompt:
      "Who reacted, what did they say or do, and how did their attitude change?",
    starter: "Reaction:\nReason:\nWhat they do next:",
  },
  world_change: {
    label: "World change",
    prompt:
      "What happened in the world or off screen? Who noticed, and what changes next?",
    starter: "What happened:\nWho is affected:\nWhat changes next:",
  },
  follow_up: {
    label: "Follow-up",
    prompt:
      "What needs preparation, a ruling, or an answer before the next session?",
    starter: "Follow up on:\nBefore next session:",
  },
};

export type ConsequenceSource = { kind: "action" | "entry"; id: string };

export function journalSource(story: CampaignStory, source: ConsequenceSource) {
  return source.kind === "action"
    ? story.player_actions.find((item) => item.id === source.id)
    : (story.session_entries ?? []).find((item) => item.id === source.id);
}

export function saveJournalEntry(
  story: CampaignStory,
  entry: SessionEntry
): CampaignStory {
  if (!entry.description.trim()) throw new Error("Write a note before saving.");
  if (!Number.isSafeInteger(entry.session) || entry.session < 1)
    throw new Error("Choose a positive whole session number.");
  if (
    entry.story_beat &&
    !story.beats.some((beat) => beat.id === entry.story_beat)
  )
    throw new Error(
      "This plot point is no longer available. Choose another or leave it unlinked."
    );
  if (
    entry.source_action_id &&
    !story.player_actions.some((action) => action.id === entry.source_action_id)
  )
    throw new Error("The source party action is no longer available.");
  if (
    entry.source_entry_id &&
    (entry.source_entry_id === entry.id ||
      !(story.session_entries ?? []).some(
        (item) => item.id === entry.source_entry_id
      ))
  )
    throw new Error("The source journal entry is no longer available.");
  const entries = story.session_entries ?? [];
  const existing = entries.find((item) => item.id === entry.id);
  const saved = {
    ...existing,
    ...entry,
    description: entry.description.trim(),
    consequence_ids: existing?.consequence_ids ?? entry.consequence_ids ?? [],
    recorded_at: existing?.recorded_at ?? entry.recorded_at,
  };
  return {
    ...story,
    session_entries: existing
      ? entries.map((item) => (item.id === entry.id ? saved : item))
      : [saved, ...entries],
  };
}

export function linkSessionConsequence(
  story: CampaignStory,
  source: ConsequenceSource,
  beatId: string,
  consequence: StoryConsequence
): CampaignStory {
  const record = journalSource(story, source);
  if (!record)
    throw new Error(
      "The source record is no longer available. Close this dialog and choose another source."
    );
  if (!story.beats.some((beat) => beat.id === beatId))
    throw new Error("Choose a plot point to hold this consequence.");
  if (!consequence.description.trim())
    throw new Error("Describe what might happen next.");
  if (
    story.beats.some((beat) =>
      beat.consequences?.some((item) => item.id === consequence.id)
    )
  )
    return story;
  const saved = {
    ...consequence,
    description: consequence.description.trim(),
    status: "pending" as const,
    trigger: record.description,
    player_action: source.kind === "action" ? source.id : undefined,
  };
  return {
    ...story,
    beats: story.beats.map((beat) =>
      beat.id === beatId
        ? { ...beat, consequences: [...(beat.consequences ?? []), saved] }
        : beat
    ),
    player_actions: story.player_actions.map((action) =>
      source.kind === "action" && action.id === source.id
        ? {
            ...action,
            consequence_ids: [
              ...new Set([...(action.consequence_ids ?? []), saved.id]),
            ],
          }
        : action
    ),
    session_entries: (story.session_entries ?? []).map((entry) =>
      source.kind === "entry" && entry.id === source.id
        ? {
            ...entry,
            consequence_ids: [
              ...new Set([...(entry.consequence_ids ?? []), saved.id]),
            ],
          }
        : entry
    ),
  };
}

export function sessionLogOutline(
  story: CampaignStory,
  session: number,
  names: Record<string, string> = {}
) {
  const actions = story.player_actions.filter(
    (action) => action.session === session
  );
  const entries = (story.session_entries ?? []).filter(
    (entry) => entry.session === session
  );
  const summary: string[] = [];
  const notes: string[] = [];
  const lines = (
    items: { description: string; story_beat?: string; npc_ids?: string[] }[]
  ) =>
    items
      .map((item) => {
        const beat = story.beats.find((beat) => beat.id === item.story_beat);
        const npcs = (item.npc_ids ?? []).map((id) => names[id] ?? id);
        return `- ${item.description}${
          npcs.length ? ` (${npcs.join(", ")})` : ""
        }${beat ? ` — ${beat.name}` : ""}`;
      })
      .join("\n");
  if (actions.length)
    summary.push(`Party actions:\n${lines([...actions].reverse())}`);
  for (const kind of ["npc_action", "world_change"] as const) {
    const matching = entries.filter((entry) => entry.kind === kind);
    if (matching.length)
      summary.push(
        `${
          kind === "npc_action" ? "NPC actions and reactions" : "World changes"
        }:\n${lines([...matching].reverse())}`
      );
  }
  const linkedIds = new Set(
    [...actions, ...entries].flatMap((item) => item.consequence_ids ?? [])
  );
  const consequences = story.beats.flatMap((beat) =>
    (beat.consequences ?? []).filter((item) => linkedIds.has(item.id))
  );
  if (consequences.length)
    notes.push(
      `Consequences to review:\n${consequences
        .map((item) => `- ${item.description} (${item.status})`)
        .join("\n")}`
    );
  const privateNotes = entries.filter((entry) => entry.kind === "dm_note");
  if (privateNotes.length)
    notes.push(`DM notes:\n${lines([...privateNotes].reverse())}`);
  const followUps = entries.filter(
    (entry) => entry.kind === "follow_up" && !entry.resolved
  );
  if (followUps.length)
    notes.push(`Before next session:\n${lines([...followUps].reverse())}`);
  return { summary: summary.join("\n\n"), notes: notes.join("\n\n") };
}

export function groupSessionHistory(story: CampaignStory, filter = "all") {
  type Group = {
    label: string;
    session: number | null;
    actions: PlayerAction[];
    entries: SessionEntry[];
    recap?: SessionRecap;
  };
  const groups = new Map<string, Group>();
  const group = (session?: number) => {
    const key = session === undefined ? "unassigned" : String(session);
    if (filter !== "all" && filter !== key) return undefined;
    if (!groups.has(key))
      groups.set(key, {
        label: session === undefined ? "Session not set" : `Session ${session}`,
        session: session ?? null,
        actions: [],
        entries: [],
      });
    return groups.get(key)!;
  };
  for (const recap of story.session_recaps ?? []) {
    const target = group(recap.session);
    if (target) target.recap = recap;
  }
  for (const action of story.player_actions)
    group(action.session)?.actions.push(action);
  for (const entry of story.session_entries ?? [])
    group(entry.session)?.entries.push(entry);
  return [...groups.entries()]
    .sort(([left], [right]) =>
      left === "unassigned"
        ? 1
        : right === "unassigned"
        ? -1
        : Number(right) - Number(left)
    )
    .map(([, value]) => value);
}
