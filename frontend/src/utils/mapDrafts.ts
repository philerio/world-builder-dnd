import type { Map as WorldMap } from "../types";

export type MapStampAsset = { name: string; image_path: string; default_size: number; category?: "building" | "sprite" };
export type PendingStampSize = { stamp: MapStampAsset; size: number; originalSize: number };
export type StoredMapDraft = { version: 2; worldId: string; map: WorldMap; base: WorldMap; stampSizes: [string, PendingStampSize][]; savedAt: string; legacy?: boolean };
export const mapDraftKey = (worldId: string, mapId: string) => `world-builder:map-draft:v2:${encodeURIComponent(worldId)}:${encodeURIComponent(mapId)}`;

function validMap(value: unknown, id: string): value is WorldMap {
  if (!value || typeof value !== "object") return false;
  const map = value as WorldMap;
  return map.id === id && typeof map.name === "string" && Array.isArray(map.markers)
    && map.markers.every((marker) => marker && typeof marker.id === "string" && typeof marker.x === "number" && typeof marker.y === "number")
    && (map.layers === undefined || Array.isArray(map.layers) && map.layers.every((layer) => layer && typeof layer.id === "string" && typeof layer.name === "string"));
}

export function readMapDraft(worldId: string, mapId: string): StoredMapDraft | null {
  try {
    const draft = JSON.parse(window.localStorage.getItem(mapDraftKey(worldId, mapId)) ?? "null") as StoredMapDraft | null;
    if (draft?.version === 2 && draft.worldId === worldId && validMap(draft.map, mapId) && validMap(draft.base, mapId) && Array.isArray(draft.stampSizes)) return draft;
    // Older drafts have no baseline and require an explicit review before saving.
    const legacy = JSON.parse(window.sessionStorage.getItem(`world-builder-map-draft:${mapId}`) ?? "null");
    if (legacy && validMap(legacy.map, mapId) && Array.isArray(legacy.stampSizes)) return {
      version: 2, worldId, map: legacy.map, base: legacy.map, stampSizes: legacy.stampSizes, savedAt: "", legacy: true,
    };
  } catch { /* A malformed or blocked draft cannot prevent opening a map. */ }
  return null;
}

export function writeMapDraft(draft: StoredMapDraft): boolean {
  try { window.localStorage.setItem(mapDraftKey(draft.worldId, draft.map.id), JSON.stringify(draft)); return true; }
  catch { return false; }
}

export function removeMapDraft(worldId: string, mapId: string): void {
  try { window.localStorage.removeItem(mapDraftKey(worldId, mapId)); } catch { /* Keep the editor usable. */ }
  try { window.sessionStorage.removeItem(`world-builder-map-draft:${mapId}`); } catch { /* Legacy storage may be blocked. */ }
}
