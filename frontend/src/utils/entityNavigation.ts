import type { EntityData } from "../types";

export type EntityLookup = (id: string) => EntityData | undefined;

export function entityTypeLabel(type: string, entity?: Record<string, unknown>): string {
  if (type === "kingdom") return entity?.political_level === "nation" ? "Nation" : "Kingdom";
  if (type === "npc") return "NPC";
  if (type === "dm_scratchpad_entry") return "DM Scratchpad Entry";
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Only saved containment/location links; never infer membership from names or capitals. */
export function locationBreadcrumbs(record: EntityData, lookup: EntityLookup): EntityData[] {
  const path: EntityData[] = [];
  const seen = new Set<string>();
  let current: EntityData | undefined = record;
  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    const data: Record<string, unknown> = current.entity;
    const reference = (field: string, types: string[]): EntityData | undefined => {
      const id = data[field];
      const parent = typeof id === "string" ? lookup(id) : undefined;
      return parent && types.includes(parent.entity_type) ? parent : undefined;
    };
    switch (current.entity_type) {
      case "kingdom":
        current = data.political_level === "nation"
          ? reference("parent_kingdom", ["kingdom"]) ?? reference("continent", ["continent"])
          : reference("continent", ["continent"]);
        break;
      case "city":
      case "location":
      case "npc":
      case "player_character": {
        const region = reference("region", ["region"]);
        const territory = reference("kingdom", ["kingdom"]);
        // A conflicting region must not imply that a city belongs to another territory.
        const compatibleRegion = region && (!territory || region.entity.kingdom === territory.id) ? region : undefined;
        current = (["npc", "player_character"].includes(current.entity_type) ? reference("city", ["city"]) : undefined)
          ?? compatibleRegion ?? territory ?? region ?? reference("continent", ["continent"]);
        break;
      }
      case "region":
        current = reference("kingdom", ["kingdom"]) ?? reference("continent", ["continent"]);
        break;
      case "map":
        current = reference("entity_id", ["continent", "kingdom", "region", "city", "location"]);
        break;
      default:
        current = undefined;
    }
  }
  return path;
}
