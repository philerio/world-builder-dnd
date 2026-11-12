import type { Map as WorldMap, MapMarker } from "../types";
import { draftValuesEqual, mergeEntityDraft } from "./entityDrafts.ts";
import { mapFieldLabel } from "./mapConflicts.ts";
import type { MapConflictChoices, MapDraftConflict } from "./mapConflicts.ts";

export type MapDimensions = { width: number; height: number };
export type MarkerBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
export function mapDimensions(map: WorldMap): MapDimensions {
  return { width: map.canvas_width ?? 1000, height: map.canvas_height ?? 700 };
}

export function markerBounds(
  marker: MapMarker,
  dimensions: MapDimensions = { width: 100, height: 100 },
): MarkerBounds {
  if (marker.points?.length)
    return {
      minX: Math.min(...marker.points.map(([x]) => x)),
      maxX: Math.max(...marker.points.map(([x]) => x)),
      minY: Math.min(...marker.points.map(([, y]) => y)),
      maxY: Math.max(...marker.points.map(([, y]) => y)),
    };
  const angle = ((marker.rotation ?? 0) * Math.PI) / 180;
  const size = marker.icon_image ? (marker.icon_size ?? 72) : 0;
  const span = size * (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)));
  const halfX = (span / dimensions.width) * 50;
  const halfY = (span / dimensions.height) * 50;
  return {
    minX: marker.x - halfX,
    maxX: marker.x + halfX,
    minY: marker.y - halfY,
    maxY: marker.y + halfY,
  };
}

export function sortMapMarkers(
  map: Pick<WorldMap, "markers" | "layers">,
): MapMarker[] {
  const layerOrder = new Map(
    (map.layers ?? []).map((layer, index, layers) => [
      layer.id,
      layers.length - index,
    ]),
  );
  return [...map.markers].sort(
    (a, b) =>
      (layerOrder.get(a.layer_id ?? "") ?? 0) -
        (layerOrder.get(b.layer_id ?? "") ?? 0) ||
      (a.z_index ?? 0) - (b.z_index ?? 0),
  );
}

export function transformMapSelection(
  markers: MapMarker[],
  ids: string[],
  transform:
    | "rotate-left"
    | "rotate-right"
    | "mirror-horizontal"
    | "mirror-vertical",
  dimensions: MapDimensions,
): MapMarker[] {
  const selected = markers.filter((marker) => ids.includes(marker.id));
  if (!selected.length) return markers;
  const bounds = selected.map((marker) => markerBounds(marker, dimensions));
  const centerX =
    ((Math.min(...bounds.map((bound) => bound.minX)) +
      Math.max(...bounds.map((bound) => bound.maxX))) /
      200) *
    dimensions.width;
  const centerY =
    ((Math.min(...bounds.map((bound) => bound.minY)) +
      Math.max(...bounds.map((bound) => bound.maxY))) /
      200) *
    dimensions.height;
  const point = ([x, y]: [number, number]): [number, number] => {
    const dx = (x / 100) * dimensions.width - centerX;
    const dy = (y / 100) * dimensions.height - centerY;
    const [nextX, nextY] =
      transform === "rotate-left"
        ? [dy, -dx]
        : transform === "rotate-right"
          ? [-dy, dx]
          : transform === "mirror-horizontal"
            ? [-dx, dy]
            : [dx, -dy];
    return [
      ((centerX + nextX) / dimensions.width) * 100,
      ((centerY + nextY) / dimensions.height) * 100,
    ];
  };
  const moved = selected.map((marker) => {
    const points = marker.points?.map(point);
    const [x, y] = points?.[0] ?? point([marker.x, marker.y]);
    const rotation = transform.startsWith("rotate")
      ? (marker.rotation ?? 0) + (transform === "rotate-left" ? -90 : 90)
      : -(marker.rotation ?? 0);
    return {
      ...marker,
      x,
      y,
      ...(points ? { points } : {}),
      ...(marker.icon_image
        ? {
            rotation: ((rotation % 360) + 360) % 360,
            mirror_x:
              transform === "mirror-horizontal"
                ? !marker.mirror_x
                : marker.mirror_x,
            mirror_y:
              transform === "mirror-vertical"
                ? !marker.mirror_y
                : marker.mirror_y,
          }
        : {}),
    };
  });
  const extents = moved.map((marker) => markerBounds(marker, dimensions));
  const minX = Math.min(...extents.map((bound) => bound.minX));
  const maxX = Math.max(...extents.map((bound) => bound.maxX));
  const minY = Math.min(...extents.map((bound) => bound.minY));
  const maxY = Math.max(...extents.map((bound) => bound.maxY));
  if (maxX - minX > 100 || maxY - minY > 100)
    throw new Error(
      "The transformed selection will not fit on this canvas. Expand the canvas first.",
    );
  const shiftX = minX < 0 ? -minX : maxX > 100 ? 100 - maxX : 0;
  const shiftY = minY < 0 ? -minY : maxY > 100 ? 100 - maxY : 0;
  const byId = new Map(
    moved.map((marker) => [
      marker.id,
      {
        ...marker,
        x: marker.x + shiftX,
        y: marker.y + shiftY,
        points: marker.points?.map(([x, y]): [number, number] => [
          x + shiftX,
          y + shiftY,
        ]),
      },
    ]),
  );
  return markers.map((marker) => byId.get(marker.id) ?? marker);
}

/** Three-way merge by ID. Choices only affect conflicts; unrelated newer edits survive. */
export function mergeMapDraft(
  base: WorldMap,
  draft: WorldMap,
  latest: WorldMap,
  options: { choices?: MapConflictChoices; legacy?: boolean } = {},
): { map: WorldMap; conflicts: string[]; conflictDetails: MapDraftConflict[] } {
  const before = options.legacy ? latest : base;
  const { entity } = mergeEntityDraft(before, draft, latest);
  const result = entity as WorldMap;
  const conflicts: string[] = [];
  const conflictDetails: MapDraftConflict[] = [];
  const choice = (
    path: string[],
    text: string,
    detail: Omit<MapDraftConflict, "id">,
  ) => {
    const id = JSON.stringify(path);
    conflicts.push(text);
    conflictDetails.push({ id, ...detail });
    return options.choices?.[id];
  };
  const isConflict = (original: unknown, mine: unknown, saved: unknown) =>
    !draftValuesEqual(mine, saved) &&
    (options.legacy || !draftValuesEqual(original, saved));
  const put = (
    target: Record<string, unknown>,
    field: string,
    source: object,
  ) => {
    if (Object.hasOwn(source, field))
      target[field] = (source as Record<string, unknown>)[field];
    else delete target[field];
  };
  for (const key of new Set([...Object.keys(before), ...Object.keys(draft)])) {
    if (key === "markers" || key === "layers") continue;
    if (
      draftValuesEqual(
        before[key as keyof WorldMap],
        draft[key as keyof WorldMap],
      )
    )
      continue;
    const mine = draft[key as keyof WorldMap],
      saved = latest[key as keyof WorldMap];
    if (!isConflict(before[key as keyof WorldMap], mine, saved)) continue;
    if (
      choice([key], key, {
        label: `Map · ${mapFieldLabel(key)}`,
        mine,
        saved,
        kind: "field",
        field: key,
      }) === "saved"
    )
      put(result, key, latest);
  }
  const mergeItems = <T extends { id: string; name?: string; label?: string }>(
    key: "markers" | "layers",
    originals: T[],
    local: T[],
    remote: T[],
  ): T[] => {
    const localById = new Map(local.map((item) => [item.id, item]));
    const remoteById = new Map(remote.map((item) => [item.id, item]));
    const baseById = new Map(originals.map((item) => [item.id, item]));
    const merged = new Map(remoteById);
    for (const id of new Set([...baseById.keys(), ...localById.keys()])) {
      const original = baseById.get(id),
        mine = localById.get(id),
        saved = remoteById.get(id);
      if (draftValuesEqual(original, mine)) continue;
      const title = `${key === "markers" ? "Marker" : "Layer"} “${mine?.label ?? mine?.name ?? saved?.label ?? saved?.name ?? original?.label ?? original?.name ?? id}”`;
      if (!mine || !original || !saved) {
        let selected = mine;
        if (isConflict(original, mine, saved)) {
          const resolution = choice(
            [key, id],
            `${key}: ${id} (added/deleted/edited)`,
            {
              label: title,
              mine,
              saved,
              kind: "item",
              note: "One version adds, removes or replaces this item. Choose which version to keep.",
            },
          );
          if (resolution === "saved") selected = saved;
        }
        if (selected) merged.set(id, selected);
        else merged.delete(id);
      } else {
        const item = mergeEntityDraft(original, mine, saved).entity;
        for (const field of new Set([
          ...Object.keys(original),
          ...Object.keys(mine),
        ])) {
          const oldValue = (original as Record<string, unknown>)[field],
            mineValue = (mine as Record<string, unknown>)[field],
            savedValue = (saved as Record<string, unknown>)[field];
          if (
            draftValuesEqual(oldValue, mineValue) ||
            !isConflict(oldValue, mineValue, savedValue)
          )
            continue;
          if (
            choice([key, id, field], `${key}: ${id} · ${field}`, {
              label: `${title} · ${mapFieldLabel(field)}`,
              mine: mineValue,
              saved: savedValue,
              kind: "field",
              field,
            }) === "saved"
          )
            put(item, field, saved);
        }
        merged.set(id, item as T);
      }
    }
    if (key === "layers") {
      const commonOrder = (items: T[]) =>
        items
          .filter(
            (item) =>
              baseById.has(item.id) &&
              localById.has(item.id) &&
              remoteById.has(item.id),
          )
          .map((item) => item.id);
      const localChanged = !draftValuesEqual(
        commonOrder(originals),
        commonOrder(local),
      );
      const remoteChanged = !draftValuesEqual(
        commonOrder(originals),
        commonOrder(remote),
      );
      let preferred = remote;
      if (localChanged) {
        preferred = local;
        if (
          (options.legacy || remoteChanged) &&
          !draftValuesEqual(commonOrder(local), commonOrder(remote))
        ) {
          const resolution = choice(["order", "layers"], "Layer order", {
            label: "Layer order · front to back",
            mine: local.map((item) => item.name ?? item.id),
            saved: remote.map((item) => item.name ?? item.id),
            kind: "order",
          });
          if (resolution === "saved") preferred = remote;
        }
      }
      const ordered = new Map(
        preferred
          .filter((item) => merged.has(item.id))
          .map((item) => [item.id, merged.get(item.id)!]),
      );
      for (const [id, item] of merged)
        if (!ordered.has(id)) ordered.set(id, item);
      return [...ordered.values()];
    }
    return [...merged.values()];
  };
  result.markers = mergeItems(
    "markers",
    before.markers,
    draft.markers,
    latest.markers,
  );
  result.layers = mergeItems(
    "layers",
    before.layers ?? [],
    draft.layers ?? [],
    latest.layers ?? [],
  );
  // Resolve assignments against the chosen layer set, restoring a layer only by explicit choice.
  result.markers = result.markers.map((marker) => {
    if (
      !marker.layer_id ||
      result.layers?.some((layer) => layer.id === marker.layer_id)
    )
      return marker;
    const localMarker = draft.markers.find((item) => item.id === marker.id);
    const savedMarker = latest.markers.find((item) => item.id === marker.id);
    const mineLayer = draft.layers?.find(
      (layer) => layer.id === localMarker?.layer_id,
    );
    const savedLayer = latest.layers?.find(
      (layer) => layer.id === savedMarker?.layer_id,
    );
    const value = (layer: typeof mineLayer) =>
      layer
        ? {
            layer: layer.name,
            action: "Keep assignment; restore the layer if needed",
          }
        : { layer: "Unassigned" };
    const resolution = choice(
      ["markers", marker.id, "missing-layer"],
      `Layer removed but marker still uses it: ${marker.label ?? marker.id}`,
      {
        label: `Marker “${marker.label ?? marker.id}” · Layer assignment`,
        mine: value(mineLayer),
        saved: value(savedLayer),
        kind: "layer",
        note: "This assignment uses a removed layer. Keeping an assignment also keeps its layer; otherwise the marker becomes Unassigned.",
      },
    );
    const selected =
      resolution === "mine"
        ? mineLayer
        : resolution === "saved"
          ? savedLayer
          : undefined;
    if (selected && !result.layers!.some((layer) => layer.id === selected.id))
      result.layers!.push({ ...selected });
    return { ...marker, layer_id: selected?.id ?? null };
  });
  return { map: result, conflicts: [...new Set(conflicts)], conflictDetails };
}
