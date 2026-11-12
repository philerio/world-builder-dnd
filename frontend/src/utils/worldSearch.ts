import type { EntitySummary } from "../types";
import { entityTypeLabel, locationBreadcrumbs, type EntityLookup } from "./entityNavigation.ts";

type SearchSegment = { label: string; text: string; dmOnly: boolean };
export type SearchRecord = EntitySummary & { typeLabel: string; path: string; segments: SearchSegment[] };
export type SearchResult = SearchRecord & { snippet?: SearchSegment; score: number };

const textFields = new Set([
  "name", "title", "description", "details", "notes", "dm_notes", "tags", "content", "text", "overview",
  "government_type", "government_notes", "role", "job", "race", "motives", "goals", "fears", "secrets",
  "knowledge", "common_knowledge", "player_text", "outcome", "summary", "agenda", "overarching_plot",
  "events", "triggers", "possible_approaches", "consequences", "authority", "information", "belief", "shares_if",
  "success", "failure", "trigger", "timing", "label", "tooltip",
]);
const privateFields = new Set(["dm_notes", "secrets", "true_causes", "hidden_connections", "npc_knowledge"]);
const fieldLabels: Record<string, string> = {
  dm_notes: "DM notes", npc_knowledge: "NPC knowledge", beats: "Plot points", player_actions: "Party actions",
  world_clocks: "Clocks", description_content: "Description", events_content: "Events", triggers_content: "Triggers",
  possible_approaches_content: "Possible approaches", nodes: "",
};
const label = (key: string) => fieldLabels[key] ?? key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/\s+/g, " ").trim();

function collectText(value: unknown, path: string[] = [], dmOnly = false): SearchSegment[] {
  if (typeof value === "string") {
    return value.trim() && textFields.has(path.at(-1) ?? "")
      ? [{ label: path.map(label).filter(Boolean).join(" · "), text: value.replace(/\s+/g, " ").trim(), dmOnly }]
      : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectText(item, path, dmOnly));
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const hidden = dmOnly || object.dm_only === true || object.visible === false;
  return Object.entries(object).flatMap(([key, child]) => collectText(child, [...path, key], hidden || privateFields.has(key)));
}

export function buildSearchIndex(entities: EntitySummary[], lookup: EntityLookup): SearchRecord[] {
  return entities.map((summary) => {
    const record = lookup(summary.id);
    const entity = record?.entity;
    return {
      ...summary,
      name: typeof entity?.name === "string" ? entity.name : summary.name,
      typeLabel: entityTypeLabel(summary.entity_type, entity),
      path: record ? locationBreadcrumbs(record, lookup).slice(0, -1).map((parent) => String(parent.entity.name ?? parent.id)).join(" → ") : "",
      segments: entity ? collectText(entity).filter((segment) => segment.label !== "Name") : [],
    };
  });
}

function excerpt(segment: SearchSegment, terms: string[]): SearchSegment {
  const index = terms.map((term) => normalize(segment.text).indexOf(term)).find((position) => position >= 0) ?? 0;
  const start = Math.max(0, index - 45);
  const text = segment.text.slice(start, start + 180);
  return { ...segment, text: `${start ? "…" : ""}${text}${start + 180 < segment.text.length ? "…" : ""}` };
}

export function searchWorld(index: SearchRecord[], query: string, typeLabel = ""): SearchResult[] {
  const normalized = normalize(query);
  const terms = normalized.split(" ").filter(Boolean);
  return index.flatMap((record): SearchResult[] => {
    if (typeLabel && record.typeLabel !== typeLabel) return [];
    const name = normalize(record.name);
    const text = normalize([record.name, record.typeLabel, record.path, ...record.segments.map((segment) => segment.text)].join(" "));
    if (!terms.every((term) => text.includes(term))) return [];
    const matchingSegments = record.segments.filter((segment) => terms.some((term) => normalize(segment.text).includes(term)));
    const snippet = matchingSegments.find((segment) => terms.every((term) => normalize(segment.text).includes(term)))
      ?? matchingSegments[0]
      ?? record.segments.find((segment) => segment.label === "Description" && !segment.dmOnly);
    const score = !terms.length ? 10 : name === normalized ? 0 : name.startsWith(normalized) ? 1 : name.includes(normalized) ? 2
      : terms.every((term) => name.includes(term)) ? 3 : matchingSegments.some((segment) => segment.label === "Tags") ? 4 : 5;
    return [{ ...record, score, snippet: snippet ? excerpt(snippet, terms) : undefined }];
  }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
