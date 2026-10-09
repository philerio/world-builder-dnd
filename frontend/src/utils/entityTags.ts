export function matchesEntityTag(entity: { tags?: string[] }, selectedTag?: string): boolean {
  return !selectedTag || Boolean(entity.tags?.some((tag) => tag.localeCompare(selectedTag, undefined, { sensitivity: "base" }) === 0));
}

export function sortEntitiesByName<T extends { name: string }>(entities: readonly T[]): T[] {
  return [...entities].sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: "base" }));
}
