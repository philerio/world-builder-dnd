import { useEffect, useState } from "react";
import { Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapMarker } from "../types";
import { markerBounds } from "../utils/mapEditing";

export default function MapSelectionBox({ enabled, markers, width, height, canSelect, onSelect }: {
  enabled: boolean; markers: MapMarker[]; width: number; height: number;
  canSelect: (id: string) => boolean; onSelect: (ids: string[], append: boolean) => void;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const container = map.getContainer();
    let start: L.LatLng | null = null;
    let append = false;
    let wasDragging = false;
    const down = (event: PointerEvent) => {
      if (!event.shiftKey || event.button !== 0 || (event.target as Element).closest(".leaflet-control, .leaflet-marker-icon, .leaflet-popup")) return;
      event.preventDefault(); event.stopPropagation();
      start = map.mouseEventToLatLng(event); append = true;
      wasDragging = map.dragging.enabled(); map.dragging.disable();
      container.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => { if (start) { event.preventDefault(); setBounds(L.latLngBounds(start, map.mouseEventToLatLng(event))); } };
    const finish = (event: PointerEvent) => {
      if (!start) return;
      const area = L.latLngBounds(start, map.mouseEventToLatLng(event));
      const ids = markers.filter((marker) => {
        if (!canSelect(marker.id)) return false;
        const bound = markerBounds(marker, { width, height });
        return area.intersects(L.latLngBounds([-bound.maxY / 100 * height, bound.minX / 100 * width], [-bound.minY / 100 * height, bound.maxX / 100 * width]));
      }).map((marker) => marker.id);
      start = null; setBounds(null); if (wasDragging) map.dragging.enable();
      if (event.type !== "pointercancel") onSelect(ids, append);
    };
    container.addEventListener("pointerdown", down, true);
    container.addEventListener("pointermove", move, true);
    container.addEventListener("pointerup", finish, true);
    container.addEventListener("pointercancel", finish, true);
    return () => {
      container.removeEventListener("pointerdown", down, true); container.removeEventListener("pointermove", move, true);
      container.removeEventListener("pointerup", finish, true); container.removeEventListener("pointercancel", finish, true);
      if (start && wasDragging) map.dragging.enable();
    };
  }, [enabled, map, markers, width, height, canSelect, onSelect]);
  return bounds ? <Rectangle bounds={bounds} pathOptions={{ color: "#ffd166", dashArray: "5", weight: 2, fillOpacity: 0.1 }} interactive={false} pmIgnore /> : null;
}
