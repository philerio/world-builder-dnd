export type EntityDraft = {
  version: 1;
  entityType: string;
  base: Record<string, unknown>;
  data: Record<string, unknown>;
  savedAt: string;
};

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, ordered(item)]));
  }
  return value;
}

export function draftValuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
}

export function draftKey(worldId: string, purpose: string): string {
  return `world-builder:draft:v1:${encodeURIComponent(worldId)}:${purpose}`;
}

function browserStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.localStorage; }
  catch { return undefined; }
}

export function readEntityDraft(key: string, storage = browserStorage()): EntityDraft | null {
  try {
    const draft: unknown = JSON.parse(storage?.getItem(key) ?? "null");
    if (!draft || typeof draft !== "object") return null;
    const value = draft as Partial<EntityDraft>;
    if (value.version !== 1 || typeof value.entityType !== "string" || typeof value.savedAt !== "string" ||
      !value.base || typeof value.base !== "object" || Array.isArray(value.base) ||
      !value.data || typeof value.data !== "object" || Array.isArray(value.data)) return null;
    return value as EntityDraft;
  } catch { return null; }
}

export function writeEntityDraft(key: string, draft: EntityDraft, storage = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(draft));
    return true;
  } catch { return false; }
}

export function removeEntityDraft(key: string, storage = browserStorage()): void {
  try { storage?.removeItem(key); } catch { /* Editing still works when browser storage is unavailable. */ }
}

// Apply only the fields the DM changed; unrelated newer edits remain intact.
export function mergeEntityDraft(base: Record<string, unknown>, draft: Record<string, unknown>, latest: Record<string, unknown>): {
  entity: Record<string, unknown>;
  conflicts: string[];
} {
  const entity = { ...latest };
  const conflicts: string[] = [];
  for (const key of new Set([...Object.keys(base), ...Object.keys(draft)])) {
    if (draftValuesEqual(base[key], draft[key])) continue;
    if (!draftValuesEqual(base[key], latest[key]) && !draftValuesEqual(draft[key], latest[key])) conflicts.push(key);
    if (Object.hasOwn(draft, key)) entity[key] = draft[key];
    else delete entity[key];
  }
  return { entity, conflicts };
}
