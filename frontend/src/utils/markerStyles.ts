import type { MapMarker } from "../types";

export const MARKER_ICONS = [
  "location",
  "city",
  "castle",
  "church",
  "farm",
  "forest",
  "map",
  "house",
] as const;
export type MarkerKind = "point" | "area" | "path";
export type MarkerAppearance = Pick<
  MapMarker,
  | "icon"
  | "icon_image"
  | "icon_size"
  | "fill_color"
  | "fill_opacity"
  | "hide_label"
>;
export type MarkerStyle = {
  id: string;
  name: string;
  kind: MarkerKind;
  appearance: MarkerAppearance;
};
export type MarkerStyleLibrary = {
  version: 1;
  styles: MarkerStyle[];
  favorites: string[];
};
export type MarkerPropertyPatch = MarkerAppearance &
  Pick<MapMarker, "visible" | "dm_only">;
export const EMPTY_STYLE_LIBRARY: MarkerStyleLibrary = {
  version: 1,
  styles: [],
  favorites: [],
};
export const BUILTIN_MARKER_STYLES: MarkerStyle[] = [
  {
    id: "builtin:capital",
    name: "Capital",
    kind: "point",
    appearance: { icon: "castle", fill_color: "#d9b86c", hide_label: false },
  },
  {
    id: "builtin:settlement",
    name: "Settlement",
    kind: "point",
    appearance: { icon: "city", fill_color: "#80b8d9", hide_label: false },
  },
  {
    id: "builtin:dungeon",
    name: "Dungeon entrance",
    kind: "point",
    appearance: { icon: "location", fill_color: "#c58bc9", hide_label: false },
  },
  {
    id: "builtin:quest",
    name: "Quest location",
    kind: "point",
    appearance: { icon: "map", fill_color: "#ed9e68", hide_label: false },
  },
  {
    id: "builtin:inn",
    name: "Inn",
    kind: "point",
    appearance: { icon: "house", fill_color: "#a6c58b", hide_label: false },
  },
  {
    id: "builtin:woodland",
    name: "Woodland",
    kind: "area",
    appearance: { fill_color: "#639b74", fill_opacity: 0.3, hide_label: false },
  },
  {
    id: "builtin:district",
    name: "District",
    kind: "area",
    appearance: {
      fill_color: "#b59dd4",
      fill_opacity: 0.25,
      hide_label: false,
    },
  },
  {
    id: "builtin:road",
    name: "Road",
    kind: "path",
    appearance: { fill_color: "#b79970", fill_opacity: 0.9 },
  },
  {
    id: "builtin:river",
    name: "River",
    kind: "path",
    appearance: { fill_color: "#68b0d5", fill_opacity: 0.85 },
  },
];
export const markerKind = (marker: Pick<MapMarker, "type">): MarkerKind =>
  marker.type ?? "point";

/** Allow only supported visual properties. Never copy identity, geometry or visibility. */
export function cleanAppearance(
  value: unknown,
  kind: MarkerKind,
): MarkerAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Style appearance must be an object.");
  const source = value as Record<string, unknown>,
    result: MarkerAppearance = {};
  if (source.fill_color != null) {
    if (
      typeof source.fill_color !== "string" ||
      !/^#[a-f\d]{6}$/i.test(source.fill_color)
    )
      throw new Error("Choose a six-digit hex color.");
    result.fill_color = source.fill_color;
  }
  if (source.hide_label != null) {
    if (typeof source.hide_label !== "boolean")
      throw new Error("Label visibility must be true or false.");
    result.hide_label = source.hide_label;
  }
  if (kind === "point") {
    if (source.icon != null) {
      if (!MARKER_ICONS.includes(source.icon as (typeof MARKER_ICONS)[number]))
        throw new Error("Unknown marker icon.");
      result.icon = source.icon as string;
    }
    if (source.icon_image != null && source.icon_image !== "") {
      if (
        typeof source.icon_image !== "string" ||
        !/^\/(?:map-assets|map-sprites)\/[\w.-]+\.png$/i.test(
          source.icon_image,
        ) ||
        source.icon_image.includes("..")
      )
        throw new Error("Styles can use uploaded building or sprite PNGs.");
      result.icon_image = source.icon_image;
    }
    if (source.icon_size != null) {
      if (
        !Number.isInteger(source.icon_size) ||
        Number(source.icon_size) < 24 ||
        Number(source.icon_size) > 256
      )
        throw new Error(
          "Stamp size must be a whole number from 24 to 256 map units.",
        );
      result.icon_size = source.icon_size as number;
    }
  } else if (source.fill_opacity != null) {
    if (
      typeof source.fill_opacity !== "number" ||
      !Number.isFinite(source.fill_opacity) ||
      source.fill_opacity < 0 ||
      source.fill_opacity > 1
    )
      throw new Error("Opacity must be between 0 and 1.");
    result.fill_opacity = source.fill_opacity;
  }
  return result;
}

export function styleFromMarker(
  marker: MapMarker,
  id: string,
  name: string,
): MarkerStyle {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80)
    throw new Error("Style names must contain 1 to 80 characters.");
  const kind = markerKind(marker);
  const defaults =
    kind === "point"
      ? { icon: "location", fill_color: "#c9a85b", hide_label: false }
      : {
          fill_color: "#1976d2",
          fill_opacity: kind === "area" ? 0.2 : 0.85,
          hide_label: false,
        };
  return {
    id,
    name: trimmed,
    kind,
    appearance: cleanAppearance({ ...defaults, ...marker }, kind),
  };
}

export function applyMarkerStyle(
  marker: MapMarker,
  style: MarkerStyle,
): MapMarker {
  if (markerKind(marker) !== style.kind) return marker;
  const appearance = cleanAppearance(style.appearance, style.kind);
  const next = { ...marker, ...appearance };
  if (style.kind === "point") {
    // Choosing a symbol must replace an existing stamp, and vice versa.
    if (!appearance.icon_image) delete next.icon_image;
    if (appearance.icon_image) delete next.icon;
  }
  return next;
}

/** Apply only explicitly requested fields; incompatible fields leave other kinds alone. */
export function patchMarkerProperties(
  marker: MapMarker,
  value: Partial<MarkerPropertyPatch>,
): MapMarker {
  const kind = markerKind(marker);
  const appearance = cleanAppearance(value, kind);
  const next = { ...marker, ...appearance };
  if (kind === "point" && appearance.icon) delete next.icon_image;
  for (const field of ["visible", "dm_only"] as const) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== "boolean")
      throw new Error("Visibility must be true or false.");
    next[field] = value[field];
  }
  return next;
}

export function parseMarkerStyleLibrary(raw: string): MarkerStyleLibrary {
  if (!raw) return { ...EMPTY_STYLE_LIBRARY, styles: [], favorites: [] };
  const value = JSON.parse(raw);
  if (
    value?.version !== 1 ||
    !Array.isArray(value.styles) ||
    value.styles.length > 200 ||
    !Array.isArray(value.favorites)
  )
    throw new Error(
      "Choose a version 1 marker-style library with up to 200 custom styles.",
    );
  const ids = new Set<string>(),
    names = new Set<string>();
  const styles = value.styles.map((style: MarkerStyle): MarkerStyle => {
    if (
      !style ||
      typeof style.id !== "string" ||
      !style.id ||
      style.id.startsWith("builtin:") ||
      ids.has(style.id) ||
      typeof style.name !== "string" ||
      !style.name.trim() ||
      style.name.trim().length > 80 ||
      !["point", "area", "path"].includes(style.kind)
    )
      throw new Error("Invalid or duplicate custom style.");
    const name = style.name.trim(),
      nameKey = name.toLocaleLowerCase();
    if (names.has(nameKey))
      throw new Error(`A custom style named “${name}” already exists.`);
    ids.add(style.id);
    names.add(nameKey);
    return {
      id: style.id,
      name,
      kind: style.kind,
      appearance: cleanAppearance(style.appearance, style.kind),
    };
  });
  const validIds = new Set([
    ...ids,
    ...BUILTIN_MARKER_STYLES.map((style) => style.id),
  ]);
  return {
    version: 1,
    styles,
    favorites: [
      ...new Set<string>(
        value.favorites.filter(
          (id: unknown) => typeof id === "string" && validIds.has(id),
        ),
      ),
    ],
  };
}

export function mergeMarkerStyleLibraries(
  current: MarkerStyleLibrary,
  incoming: MarkerStyleLibrary,
): MarkerStyleLibrary {
  const styles = [...current.styles];
  for (const style of incoming.styles) {
    const existing = styles.find(
      (item) =>
        item.id === style.id ||
        item.name.toLocaleLowerCase() === style.name.toLocaleLowerCase(),
    );
    if (existing) {
      if (JSON.stringify(existing) === JSON.stringify(style)) continue;
      throw new Error(
        `“${style.name}” conflicts with an existing style. Rename or remove that style before importing.`,
      );
    }
    styles.push(style);
  }
  return parseMarkerStyleLibrary(
    JSON.stringify({
      version: 1,
      styles,
      favorites: [...new Set([...current.favorites, ...incoming.favorites])],
    }),
  );
}
