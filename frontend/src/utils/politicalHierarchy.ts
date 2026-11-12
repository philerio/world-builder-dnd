import type { City, Kingdom, WorldData } from "../types";

export type NationBranch = { nation: Kingdom; cities: City[] };
export type KingdomBranch = { kingdom: Kingdom; nations: NationBranch[]; cities: City[] };

export function buildPoliticalHierarchy(data: Pick<WorldData, "kingdoms" | "cities">): {
  kingdoms: KingdomBranch[];
  unassignedNations: NationBranch[];
} {
  const byName = <T extends { name: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.name.localeCompare(b.name));
  const kingdoms = byName(data.kingdoms.filter((entity) => entity.political_level !== "nation"));
  const kingdomIds = new Set(kingdoms.map((entity) => entity.id));
  const nations = byName(data.kingdoms.filter((entity) => entity.political_level === "nation"));
  const citiesFor = (id: string) => byName(data.cities.filter((city) => city.kingdom === id));
  const nationBranch = (nation: Kingdom): NationBranch => ({ nation, cities: citiesFor(nation.id) });

  return {
    kingdoms: kingdoms.map((kingdom) => ({
      kingdom,
      nations: nations.filter((nation) => nation.parent_kingdom === kingdom.id).map(nationBranch),
      cities: citiesFor(kingdom.id),
    })),
    // Never infer political membership from geography or silently hide broken links.
    unassignedNations: nations
      .filter((nation) => !nation.parent_kingdom || !kingdomIds.has(nation.parent_kingdom))
      .map(nationBranch),
  };
}
