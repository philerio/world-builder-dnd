import { useMemo, useState, useSyncExternalStore } from "react";
import { createId } from "../utils/createId";
import {
  BUILTIN_MARKER_STYLES,
  EMPTY_STYLE_LIBRARY,
  mergeMarkerStyleLibraries,
  parseMarkerStyleLibrary,
  styleFromMarker,
} from "../utils/markerStyles";
import type { MarkerStyleLibrary } from "../utils/markerStyles";
import type { MapMarker } from "../types";

const EVENT = "world-builder-marker-styles";
const memory = new Map<string, string>();
const keyFor = (worldId: string) =>
  `world-builder:marker-styles:v1:${encodeURIComponent(worldId)}`;
function snapshot(key: string): string {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function subscribe(key: string, update: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      memory.delete(key);
      update();
    }
  };
  window.addEventListener(EVENT, update);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, update);
    window.removeEventListener("storage", storage);
  };
}
export default function useMarkerStyles(worldId: string) {
  const key = keyFor(worldId);
  const raw = useSyncExternalStore(
    (update) => subscribe(key, update),
    () => snapshot(key),
  );
  const [storageWarning, setStorageWarning] = useState("");
  const parsed = useMemo(() => {
    try {
      return { library: parseMarkerStyleLibrary(raw), error: "" };
    } catch {
      return {
        library: EMPTY_STYLE_LIBRARY,
        error:
          "The saved style library could not be read. Export or repair browser storage before replacing it.",
      };
    }
  }, [raw]);
  const update = (
    change: (current: MarkerStyleLibrary) => MarkerStyleLibrary,
  ) => {
    // Read again at mutation time so a second tab's recent edits are preserved.
    const next = JSON.stringify(change(parseMarkerStyleLibrary(snapshot(key))));
    try {
      window.localStorage.setItem(key, next);
      setStorageWarning("");
    } catch {
      setStorageWarning(
        "Style storage is unavailable. Your styles work for this visit; export them to keep a copy.",
      );
    }
    memory.set(key, next);
    window.dispatchEvent(new Event(EVENT));
  };
  return {
    styles: [...BUILTIN_MARKER_STYLES, ...parsed.library.styles],
    library: parsed.library,
    warning: storageWarning || parsed.error,
    save: (marker: MapMarker, name: string) => {
      const style = styleFromMarker(marker, createId(), name);
      update((current) =>
        mergeMarkerStyleLibraries(current, {
          version: 1,
          styles: [style],
          favorites: [],
        }),
      );
      return style;
    },
    rename: (id: string, name: string) =>
      update((current) =>
        parseMarkerStyleLibrary(
          JSON.stringify({
            ...current,
            styles: current.styles.map((style) =>
              style.id === id ? { ...style, name } : style,
            ),
          }),
        ),
      ),
    remove: (id: string) =>
      update((current) => ({
        ...current,
        styles: current.styles.filter((style) => style.id !== id),
        favorites: current.favorites.filter((favorite) => favorite !== id),
      })),
    favorite: (id: string) =>
      update((current) => ({
        ...current,
        favorites: current.favorites.includes(id)
          ? current.favorites.filter((favorite) => favorite !== id)
          : [...current.favorites, id],
      })),
    importLibrary: (text: string) =>
      update((current) =>
        mergeMarkerStyleLibraries(current, parseMarkerStyleLibrary(text)),
      ),
  };
}
export type MarkerStyles = ReturnType<typeof useMarkerStyles>;
