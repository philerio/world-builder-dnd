import type { Map as WorldMap } from "../types";

export type MapConflictChoice = "mine" | "saved";
export type MapConflictChoices = Record<string, MapConflictChoice>;
export type MapDraftConflict = {
  id: string;
  label: string;
  mine: unknown;
  saved: unknown;
  kind: "field" | "item" | "order" | "layer";
  field?: string;
  note?: string;
};
export type MapConflictReview = {
  draft: WorldMap;
  latest: WorldMap;
  revision?: string;
  details: MapDraftConflict[];
  legacy: boolean;
  changed?: boolean;
};
export type MapConflictApproval = Pick<
  MapConflictReview,
  "draft" | "latest" | "revision"
> & { choices: MapConflictChoices };

export function mapFieldLabel(field: string): string {
  const names: Record<string, string> = {
    dm_only: "DM only",
    dm_notes: "DM notes",
    entity_id: "Linked record",
    linked_map: "Linked map",
    parent_map: "Parent map",
    layer_id: "Layer",
    x: "X position",
    y: "Y position",
    points: "Shape points",
    hide_label: "Hide label",
    icon_image: "Stamp artwork",
    icon_size: "Stamp size",
    fill_color: "Color",
    fill_opacity: "Opacity",
    player_view_mask: "Player View mask",
    fog_reveal: "Fog reveal",
    z_index: "Stacking order",
    canvas_width: "Canvas width",
    canvas_height: "Canvas height",
    image_path: "Background",
    fog_of_war: "Fog of war",
    mirror_x: "Mirror horizontally",
    mirror_y: "Mirror vertically",
  };
  return (
    names[field] ??
    field.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

/** Readable, lossless values: long text and complete geometry stay available for review. */
export function formatMapConflictValue(value: unknown): string {
  if (value === undefined) return "Removed / not present";
  if (value === null) return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value || "Empty";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return "Empty list";
    return value
      .map(
        (item, index) =>
          `${index + 1}. ${Array.isArray(item) ? item.join(", ") : formatMapConflictValue(item)}`,
      )
      .join("\n");
  }
  if (typeof value === "object")
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${mapFieldLabel(key)}: ${formatMapConflictValue(item)}`,
      )
      .join("\n");
  return String(value);
}
