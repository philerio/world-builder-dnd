export type WorkspacePreferences = {
  lastCampaignId?: string;
  recentEntityIds: string[];
  locations: Record<string, string>;
};

const memory = new Map<string, string>();
export const WORKSPACE_EVENT = "world-builder-workspace-change";

export function workspaceKey(worldId: string): string {
  return `world-builder:workspace:v1:${encodeURIComponent(worldId)}`;
}

export function parseWorkspacePreferences(raw: string): WorkspacePreferences {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error("Invalid preferences");
    return {
      lastCampaignId: typeof value.lastCampaignId === "string" ? value.lastCampaignId : undefined,
      recentEntityIds: Array.isArray(value.recentEntityIds) ? [...new Set<string>(value.recentEntityIds.filter((id: unknown) => typeof id === "string"))].slice(0, 8) : [],
      locations: value.locations && typeof value.locations === "object" && !Array.isArray(value.locations)
        ? Object.fromEntries(Object.entries(value.locations).filter(([, id]) => typeof id === "string")) as Record<string, string>
        : {},
    };
  } catch { return { recentEntityIds: [], locations: {} }; }
}

export function workspaceSnapshot(worldId: string): string {
  const key = workspaceKey(worldId);
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key) ?? ""; } catch { return ""; }
}

export function updateWorkspace(worldId: string, update: (current: WorkspacePreferences) => WorkspacePreferences): void {
  const key = workspaceKey(worldId);
  const previous = workspaceSnapshot(worldId);
  const next = JSON.stringify(update(parseWorkspacePreferences(previous)));
  if (next === previous) return;
  memory.set(key, next);
  try { window.localStorage.setItem(key, next); } catch { /* Preferences still work for this visit. */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

export function recordRecentEntity(worldId: string, entityId: string): void {
  updateWorkspace(worldId, (current) => ({ ...current, recentEntityIds: [entityId, ...current.recentEntityIds.filter((id) => id !== entityId)].slice(0, 8) }));
}

export function rememberCampaign(worldId: string, campaignId: string): void {
  updateWorkspace(worldId, (current) => ({ ...current, lastCampaignId: campaignId }));
}

export function subscribeWorkspace(worldId: string, update: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === workspaceKey(worldId)) {
      memory.delete(workspaceKey(worldId));
      update();
    }
  };
  window.addEventListener(WORKSPACE_EVENT, update);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WORKSPACE_EVENT, update);
    window.removeEventListener("storage", onStorage);
  };
}
