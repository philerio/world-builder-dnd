import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polygon,
  Polyline,
  Popup,
  Tooltip as LeafletTooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Alert,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  ListItemButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import MapIcon from "@mui/icons-material/Map";
import CastleIcon from "@mui/icons-material/Castle";
import ChurchIcon from "@mui/icons-material/Church";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import HouseIcon from "@mui/icons-material/House";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ForestIcon from "@mui/icons-material/Forest";
import PlaceIcon from "@mui/icons-material/Place";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import type { EntityData, EntitySummary, Map, MapMarker, WorldStory } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import MarkerDrawer from "../components/MarkerDrawer";
import MarkerContextMenu from "../components/MarkerContextMenu";
import useEntityDrawer from "../hooks/useEntityDrawer";
import useEntityIndex from "../hooks/useEntityIndex";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorldData } from "../context/WorldDataContext";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

type MapCardProps = {
  map: Map;
  onOpen: () => void;
};

type MapViewerProps = {
  map: Map;
  maps: Map[];
  focusEntityId: string | null;
  fromWorldMap: boolean;
  locations: EntitySummary[];
  pendingMapEntityName: string | null;
  worldStories: WorldStory[];
  campaignActivity: MapCampaignActivity[];
  activityLayerEnabled: boolean;
  selectedWorldStoryId: string;
  selectedThreadId: string;
  onActivityLayerEnabledChange: (enabled: boolean) => void;
  onWorldStoryChange: (worldStoryId: string) => void;
  onThreadChange: (threadId: string) => void;
  markerEditMode: boolean;
  pointPlacementMode: boolean;
  shapeEditActive: boolean;
  mapError: string | null;
  onMarkerEditModeChange: (enabled: boolean) => void;
  onPointPlacementModeChange: (enabled: boolean) => void;
  onFinishShapeEdit: () => void;
  onBack: () => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onPlacePointMarker: (x: number, y: number) => void;
  onPlaceMapEntity: (entity: EntitySummary) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  shapeEditId: string | null;
  drawShape: "area" | "path" | null;
  onDrawShapeHandled: () => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type LeafletMapProps = {
  map: Map;
  maps: Map[];
  locations: EntitySummary[];
  campaignActivity: MapCampaignActivity[];
  focusedMarkerId: string | null;
  mapExplorerOpen: boolean;
  onCloseMapExplorer: () => void;
  onFocusMarker: (markerId: string) => void;
  markerEditMode: boolean;
  pointPlacementMode: boolean;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onPlacePointMarker: (x: number, y: number) => void;
  onPlaceMapEntity: (entity: EntitySummary) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  shapeEditId: string | null;
  drawShape: "area" | "path" | null;
  onDrawShapeHandled: () => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapContextMenuProps = {
  imageWidth: number;
  imageHeight: number;
  pointPlacementMode: boolean;
  onPlacePointMarker: (x: number, y: number) => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
};

type GeomanControllerProps = {
  mapData: Map;
  imageWidth: number;
  imageHeight: number;
  shapeEditId: string | null;
  drawShape: "area" | "path" | null;
  onDrawShapeHandled: () => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapMarkersProps = {
  map: Map;
  campaignActivity: MapCampaignActivity[];
  focusedMarkerId: string | null;
  markerEditMode: boolean;
  imageWidth: number;
  imageHeight: number;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onOpenMarkerEditor: (markerId: string) => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
};

type CampaignMarkerProps = {
  marker: MapMarker;
  campaignActivity: MapCampaignActivity[];
  highlighted: boolean;
  markerEditMode: boolean;
  imageWidth: number;
  imageHeight: number;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onOpenMarkerEditor: (markerId: string) => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
};

type MapStoryTag = {
  storyId: string;
  storyName: string;
  threadId?: string;
  threadName?: string;
};

type MapCampaignActivity = {
  locationId: string;
  sourceEntityId: string;
  sourceEntityType: "campaign" | "world_event" | "timeline_event";
  title: string;
  description?: string;
  storyTags: MapStoryTag[];
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function mapStoryTags(source: Record<string, unknown>, stories: WorldStory[]): MapStoryTag[] {
  const taggedStoryIds = new Set(asStringArray(source.world_stories));
  const threadIdsByStory = new Map<string, Set<string>>();

  for (const link of asRecords(source.world_story_threads)) {
    if (typeof link.world_story_id !== "string" || typeof link.thread_id !== "string") continue;
    taggedStoryIds.add(link.world_story_id);
    const threadIds = threadIdsByStory.get(link.world_story_id) ?? new Set<string>();
    threadIds.add(link.thread_id);
    threadIdsByStory.set(link.world_story_id, threadIds);
  }

  return [...taggedStoryIds].flatMap((storyId) => {
    const story = stories.find((item) => item.id === storyId);
    if (!story) return [];
    const threadIds = threadIdsByStory.get(storyId);
    if (!threadIds?.size) return [{ storyId, storyName: story.name }];
    return [...threadIds].map((threadId) => ({
      storyId,
      storyName: story.name,
      threadId,
      threadName: (story.threads ?? []).find((thread) => thread.id === threadId)?.name ?? threadId,
    }));
  });
}

function buildMapCampaignActivity(
  summaries: EntitySummary[],
  entityData: Record<string, EntityData>,
  stories: WorldStory[],
): MapCampaignActivity[] {
  const activity: MapCampaignActivity[] = [];
  const addActivity = (
    locationIds: string[],
    sourceEntityId: string,
    sourceEntityType: MapCampaignActivity["sourceEntityType"],
    title: string,
    description: unknown,
    storyTags: MapStoryTag[],
  ) => {
    for (const locationId of new Set(locationIds)) {
      activity.push({
        locationId,
        sourceEntityId,
        sourceEntityType,
        title,
        description: typeof description === "string" ? description : undefined,
        storyTags,
      });
    }
  };

  for (const summary of summaries) {
    const data = entityData[summary.id]?.entity;
    if (!data) continue;

    if (summary.entity_type === "campaign") {
      const campaignTags = mapStoryTags(data, stories);
      addActivity(asStringArray(data.locations), summary.id, "campaign", `${summary.name} · Campaign`, data.description, campaignTags);

      const story = typeof data.story === "object" && data.story !== null
        ? data.story as Record<string, unknown>
        : {};
      const beats = asRecords(story.beats);
      const beatsById = new Map(beats.map((beat) => [String(beat.id ?? ""), beat]));

      for (const beat of beats) {
        const beatName = typeof beat.name === "string" ? beat.name : "Untitled Plot Point";
        const tags = mapStoryTags(beat, stories);
        const beatLocations = asStringArray(beat.locations);
        addActivity(beatLocations, summary.id, "campaign", `${summary.name} · ${beatName}`, beat.description, tags);

        for (const consequence of asRecords(beat.consequences)) {
          const consequenceName = typeof consequence.description === "string" ? consequence.description : "Consequence";
          addActivity(
            beatLocations,
            summary.id,
            "campaign",
            `${summary.name} · ${consequenceName}`,
            consequence.timing ?? consequence.trigger,
            mapStoryTags(consequence, stories).length ? mapStoryTags(consequence, stories) : tags,
          );
        }
      }

      for (const action of asRecords(story.player_actions)) {
        const relatedBeat = typeof action.story_beat === "string" ? beatsById.get(action.story_beat) : undefined;
        if (!relatedBeat) continue;
        addActivity(
          asStringArray(relatedBeat.locations),
          summary.id,
          "campaign",
          `${summary.name} · Player Action`,
          action.description,
          mapStoryTags(action, stories).length ? mapStoryTags(action, stories) : mapStoryTags(relatedBeat, stories),
        );
      }
      continue;
    }

    if (summary.entity_type === "world_event" || summary.entity_type === "timeline_event") {
      const entityType = summary.entity_type;
      addActivity(
        asStringArray(data.locations),
        summary.id,
        entityType,
        `${summary.name} · ${entityType === "world_event" ? "World Event" : "Timeline Event"}`,
        data.description,
        mapStoryTags(data, stories),
      );
    }
  }

  return activity;
}

type MarkerExplorerFilter = "all" | "locations" | "characters" | "areas" | "paths" | "dm-only";

function isPlaceEntityType(entityType: string): boolean {
  return ["location", "city", "region", "kingdom", "continent", "settlement"].includes(entityType);
}

function getMapAncestry(map: Map, maps: Map[]): Map[] {
  const ancestors: Map[] = [];
  const visited = new Set([map.id]);
  let parentId = map.parent_map;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = maps.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    ancestors.push(parent);
    parentId = parent.parent_map;
  }

  return ancestors.reverse();
}

function getMarkerExplorerFilter(
  marker: MapMarker,
  getEntity: (entityId: string) => EntitySummary | undefined,
): MarkerExplorerFilter | "other" {
  if (marker.dm_only) return "dm-only";
  if (marker.type === "area") return "areas";
  if (marker.type === "path") return "paths";

  const entityType = marker.entity_id ? getEntity(marker.entity_id)?.entity_type : undefined;
  if (isPlaceEntityType(entityType ?? "")) {
    return "locations";
  }
  if (["npc", "player_character", "character"].includes(entityType ?? "")) {
    return "characters";
  }
  return "other";
}

type MapExplorerProps = {
  markers: MapMarker[];
  maps: Map[];
  locations: EntitySummary[];
  getEntity: (entityId: string) => EntitySummary | undefined;
  focusedMarkerId: string | null;
  onFocusMarker: (markerId: string) => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  onPlaceEntity: (entity: EntitySummary) => void;
  onClose: () => void;
};

function MapExplorer({
  markers,
  maps,
  locations,
  getEntity,
  focusedMarkerId,
  onFocusMarker,
  onOpenEntity,
  onOpenMap,
  onOpenMarkerEditor,
  onPlaceEntity,
  onClose,
}: MapExplorerProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MarkerExplorerFilter>("all");
  const [view, setView] = useState<"markers" | "unmapped">("markers");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const mappedEntityIds = new Set(markers.map((marker) => marker.entity_id).filter((id): id is string => Boolean(id)));
  const allUnmappedLocations = locations.filter((location) => !mappedEntityIds.has(location.id));
  const unmappedLocations = allUnmappedLocations.filter((location) => (
    !normalizedSearch || location.name.toLocaleLowerCase().includes(normalizedSearch)
  ));
  const filteredMarkers = markers.filter((marker) => {
    const entity = marker.entity_id ? getEntity(marker.entity_id) : undefined;
    const linkedMap = marker.linked_map ? maps.find((candidate) => candidate.id === marker.linked_map) : undefined;
    const category = getMarkerExplorerFilter(marker, getEntity);
    const searchableText = [
      entity?.name,
      marker.label,
      marker.tooltip,
      linkedMap?.name,
      marker.id,
    ].filter(Boolean).join(" ").toLocaleLowerCase();

    return (filter === "all" || category === filter)
      && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        zIndex: 1000,
        top: 12,
        right: 12,
        width: { xs: "calc(100% - 24px)", sm: 340 },
        maxHeight: "calc(100% - 24px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, pt: 1.25 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Map Explorer</Typography>
          <Typography variant="caption" color="text.secondary">
            {view === "markers" ? `${filteredMarkers.length} of ${markers.length} markers` : `${unmappedLocations.length} of ${allUnmappedLocations.length} unmapped locations`}
          </Typography>
        </Box>
        <Tooltip title="Close map explorer">
          <IconButton size="small" aria-label="Close map explorer" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Tabs value={view} onChange={(_event, value: "markers" | "unmapped") => setView(value)} variant="fullWidth">
        <Tab value="markers" label="On this map" />
        <Tab value="unmapped" label={`Unmapped (${allUnmappedLocations.length})`} />
      </Tabs>
      <Stack spacing={1} sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={view === "markers" ? "Search markers" : "Search locations"}
          aria-label={view === "markers" ? "Search map markers" : "Search unmapped locations"}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {view === "markers" && <FormControl size="small" fullWidth>
          <InputLabel id="map-explorer-filter-label">Show</InputLabel>
          <Select
            labelId="map-explorer-filter-label"
            label="Show"
            value={filter}
            onChange={(event) => setFilter(event.target.value as MarkerExplorerFilter)}
          >
            <MenuItem value="all">All markers</MenuItem>
            <MenuItem value="locations">Locations</MenuItem>
            <MenuItem value="characters">Characters</MenuItem>
            <MenuItem value="areas">Areas</MenuItem>
            <MenuItem value="paths">Paths</MenuItem>
            <MenuItem value="dm-only">DM only</MenuItem>
          </Select>
        </FormControl>}
      </Stack>
      <Box sx={{ overflowY: "auto", minHeight: 0, px: 1, pb: 1 }}>
        {view === "markers" ? filteredMarkers.length ? filteredMarkers.map((marker) => {
          const entity = marker.entity_id ? getEntity(marker.entity_id) : undefined;
          const linkedMap = marker.linked_map ? maps.find((candidate) => candidate.id === marker.linked_map) : undefined;
          const title = entity?.name ?? marker.label ?? linkedMap?.name ?? "Unlinked marker";
          const subtitle = [
            marker.type === "area" ? "Area" : marker.type === "path" ? "Path" : entity?.entity_type ?? "Point",
            marker.dm_only ? "DM only" : null,
            marker.visible ? null : "Hidden",
          ].filter(Boolean).join(" · ");

          return (
            <Stack key={marker.id} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <ListItemButton
                selected={focusedMarkerId === marker.id}
                onClick={() => onFocusMarker(marker.id)}
                sx={{ minWidth: 0, borderRadius: 1, py: 0.75 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{title}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
                </Box>
              </ListItemButton>
              <Tooltip title={entity ? "Open linked entity" : linkedMap ? "Open linked map" : "Edit marker"}>
                <IconButton
                  size="small"
                  aria-label={entity ? `Open ${entity.name}` : linkedMap ? `Open ${linkedMap.name}` : `Edit ${title}`}
                  onClick={() => {
                    if (entity) onOpenEntity(entity.id);
                    else if (linkedMap) onOpenMap(linkedMap.id);
                    else onOpenMarkerEditor(marker.id);
                  }}
                >
                  {entity || linkedMap ? <MapOutlinedIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          );
        }) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
            No markers match this search.
          </Typography>
        ) : unmappedLocations.length ? unmappedLocations.map((location) => (
          <Stack key={location.id} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <ListItemButton onClick={() => onPlaceEntity(location)} sx={{ minWidth: 0, borderRadius: 1, py: 0.75 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{location.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{location.entity_type}</Typography>
              </Box>
            </ListItemButton>
            <Tooltip title={`Place ${location.name} on this map`}>
              <IconButton size="small" aria-label={`Place ${location.name} on this map`} onClick={() => onPlaceEntity(location)}>
                <AddLocationAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
            {normalizedSearch
              ? "No unmapped locations match this search."
              : locations.length === 0
                ? "No locations found in the world data."
                : "All known locations have markers on this map."}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

type GeomanLayer = L.Layer & {
  options: L.LayerOptions & {
    markerId?: string;
  };
};

type GeomanCreateEvent = {
  layer: GeomanLayer;
};

type GeomanEditEvent = {
  layer: GeomanLayer;
};

type ImageDimensions = {
  width: number;
  height: number;
};

type MapLayerOptions = L.LayerOptions & {
  markerId?: string;
};

function getMapLayerMarkerId(layer: L.Layer): string | undefined {
  return (layer.options as MapLayerOptions | undefined)?.markerId;
}

function setMapLayerMarkerId(layer: L.Layer, markerId: string) {
  (layer.options as MapLayerOptions).markerId = markerId;
}

function getPolylineLatLngs(layer: L.Polyline): L.LatLng[] {
  const latLngs = layer.getLatLngs();

  if (latLngs.length === 0 || Array.isArray(latLngs[0])) {
    return [];
  }

  return latLngs as L.LatLng[];
}

function isPointInPolygon(point: L.LatLng, polygon: L.LatLng[]) {
  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];

    const intersects =
      currentPoint.lng > point.lng !== previousPoint.lng > point.lng &&
      point.lat <
        ((previousPoint.lat - currentPoint.lat) *
          (point.lng - currentPoint.lng)) /
          (previousPoint.lng - currentPoint.lng) +
          currentPoint.lat;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToSegmentSquared(
  point: L.Point,
  start: L.Point,
  end: L.Point,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return point.distanceTo(start) ** 2;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const projection = L.point(start.x + t * dx, start.y + t * dy);
  return point.distanceTo(projection) ** 2;
}

function findShapeMarkerIdAtPoint(
  map: L.Map,
  latLng: L.LatLng,
): string | undefined {
  const point = map.latLngToLayerPoint(latLng);
  let areaMarkerId: string | undefined;
  let pathMarkerId: string | undefined;

  map.eachLayer((layer) => {
    if (areaMarkerId || pathMarkerId) {
      return;
    }

    const markerId = getMapLayerMarkerId(layer);
    if (!markerId) {
      return;
    }

    if (layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs();
      if (latLngs.length > 0 && Array.isArray(latLngs[0])) {
        const polygon = latLngs[0] as L.LatLng[];
        if (isPointInPolygon(latLng, polygon)) {
          areaMarkerId = markerId;
        }
      }
      return;
    }

    if (layer instanceof L.Polyline) {
      const latLngs = getPolylineLatLngs(layer);
      for (let index = 1; index < latLngs.length; index += 1) {
        const start = map.latLngToLayerPoint(latLngs[index - 1]);
        const end = map.latLngToLayerPoint(latLngs[index]);
        if (distanceToSegmentSquared(point, start, end) <= 12 ** 2) {
          pathMarkerId = markerId;
          break;
        }
      }
    }
  });

  return areaMarkerId ?? pathMarkerId;
}

function markerIcon(icon?: string, highlighted = false) {
  const iconComponents = {
    city: LocationCityIcon,
    castle: CastleIcon,
    church: ChurchIcon,
    farm: AgricultureIcon,
    forest: ForestIcon,
    map: MapOutlinedIcon,
    house: HouseIcon,
    location: PlaceIcon,
  };

  const IconComponent =
    iconComponents[icon as keyof typeof iconComponents] ?? PlaceIcon;

  const iconMarkup = renderToStaticMarkup(
    createElement(IconComponent, {
      fontSize: "small",
    }),
  ).replace(
    "<svg ",
    '<svg style="width:20px;height:20px;display:block;overflow:visible;color:inherit;fill:currentColor;" ',
  );

  return L.divIcon({
    className: "campaign-map-marker",
    html: `
      <div
        style="
          width: 34px;
          height: 34px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(18, 18, 18, 0.94);
          border: 3px solid ${highlighted ? "#64b5f6" : "#c9a85b"};
          color: ${highlighted ? "#90caf9" : "#d9b86c"};
          box-shadow: ${highlighted ? "0 0 0 4px rgba(100,181,246,0.3), " : ""}0 2px 6px rgba(0,0,0,0.65);
          overflow: visible;
        "
      >
        ${iconMarkup}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function markerLabelIcon(label: string) {
  const escapedLabel = label
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  return L.divIcon({
    className: "campaign-map-label-icon",
    html: `<div class="campaign-map-label-content">${escapedLabel}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function getLabelWorldPoint(points: [number, number][]): [number, number] {
  const totals = points.reduce(
    (sum, [x, y]) => [sum[0] + x, sum[1] + y] as [number, number],
    [0, 0] as [number, number],
  );

  return [totals[0] / points.length, totals[1] / points.length];
}

function worldToLeaflet(
  [x, y]: [number, number],
  imageWidth: number,
  imageHeight: number,
): [number, number] {
  return [-(y / 100) * imageHeight, (x / 100) * imageWidth];
}

function leafletToWorld(
  latitude: number,
  longitude: number,
  imageWidth: number,
  imageHeight: number,
): [number, number] {
  return [(longitude / imageWidth) * 100, (-latitude / imageHeight) * 100];
}

function useImageDimensions(imageUrl: string) {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);

  useEffect(() => {
    const image = new Image();

    image.onload = () => {
      setDimensions({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      setDimensions(null);
    };

    image.src = imageUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl]);

  return dimensions;
}

function getImageBounds(dimensions: ImageDimensions): L.LatLngBoundsExpression {
  return [
    [-dimensions.height, 0],
    [0, dimensions.width],
  ];
}

function MapImage({
  imageUrl,
  bounds,
}: {
  imageUrl: string;
  bounds: L.LatLngBoundsExpression;
}) {
  return <ImageOverlay url={imageUrl} bounds={bounds} zIndex={1} />;
}

function getMapView(map: L.Map, imageWidth: number, imageHeight: number) {
  const viewportHeight = map.getContainer().clientHeight;

  if (viewportHeight <= 0) {
    return null;
  }

  const zoom = Math.log2(viewportHeight / imageHeight);

  return {
    center: [-imageHeight / 2, imageWidth / 2] as [number, number],
    zoom,
  };
}

function resetMapView(
  map: L.Map,
  imageWidth: number,
  imageHeight: number,
  animate = true,
) {
  const view = getMapView(map, imageWidth, imageHeight);

  if (!view) {
    return;
  }

  map.setView(view.center, view.zoom, {
    animate,
  });
}

function MapResetButton({
  imageWidth,
  imageHeight,
}: {
  imageWidth: number;
  imageHeight: number;
}) {
  const map = useMap();

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 60,
        zIndex: 1000,
      }}
    >
      <Button
        variant="contained"
        size="small"
        onClick={() => resetMapView(map, imageWidth, imageHeight)}
        sx={{
          minWidth: 0,
          textTransform: "none",
          backgroundColor: "background.paper",
          color: "text.primary",
          border: 1,
          borderColor: "divider",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        Reset View
      </Button>
    </Box>
  );
}

function MapInitialView({
  imageWidth,
  imageHeight,
}: {
  imageWidth: number;
  imageHeight: number;
}) {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      resetMapView(map, imageWidth, imageHeight, false);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [imageWidth, imageHeight, map]);

  return null;
}

function MapFocusMarker({
  marker,
  imageWidth,
  imageHeight,
}: {
  marker: MapMarker | null;
  imageWidth: number;
  imageHeight: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!marker) return;
    const center = marker.points?.length
      ? getLabelWorldPoint(marker.points)
      : [marker.x, marker.y] as [number, number];
    map.setView(
      worldToLeaflet(center, imageWidth, imageHeight),
      Math.max(map.getZoom(), 1),
      { animate: true },
    );
  }, [imageHeight, imageWidth, map, marker]);

  return null;
}

function layerToPoints(
  layer: L.Layer,
  imageWidth: number,
  imageHeight: number,
): [number, number][] | null {
  if (layer instanceof L.Polygon) {
    const latLngs = layer.getLatLngs();

    if (
      !Array.isArray(latLngs) ||
      latLngs.length === 0 ||
      !Array.isArray(latLngs[0])
    ) {
      return null;
    }

    const firstRing = latLngs[0] as L.LatLng[];

    return firstRing.map((latLng) =>
      leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight),
    );
  }

  if (layer instanceof L.Polyline) {
    const latLngs = layer.getLatLngs();

    if (
      !Array.isArray(latLngs) ||
      latLngs.length === 0 ||
      Array.isArray(latLngs[0])
    ) {
      return null;
    }

    return (latLngs as L.LatLng[]).map((latLng) =>
      leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight),
    );
  }

  return null;
}

function MapsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    searchParams.get("map"),
  );
  const loadedMapIds = useRef<string | null>(null);
  const loadedActivityIds = useRef<string | null>(null);
  const [activityLayerEnabled, setActivityLayerEnabled] = useState(false);
  const [selectedWorldStoryId, setSelectedWorldStoryId] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [markerEditMode, setMarkerEditMode] = useState(false);
  const [pointPlacementMode, setPointPlacementMode] = useState(false);
  const [pendingMapEntitySelection, setPendingMapEntitySelection] = useState<EntitySummary | null>(null);
  const [shapeEditId, setShapeEditId] = useState<string | null>(null);
  const [drawShape, setDrawShape] = useState<"area" | "path" | null>(null);
  const [shapeDraft, setShapeDraft] = useState<MapMarker | null>(null);
  const [draftShapeLayer, setDraftShapeLayer] = useState<L.Layer | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const [markerDrawer, setMarkerDrawer] = useState<{
    open: boolean;
    mode: "create" | "edit";
    marker: MapMarker | null;
  }>({
    open: false,
    mode: "create",
    marker: null,
  });

  const [markerContextMenu, setMarkerContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    mapX: number;
    mapY: number;
    markerId: string | null;
  } | null>(null);

  const {
    entities,
    getEntity: getWorldEntity,
    loadEntities,
    updateEntity,
    entitiesLoading,
    entitiesError,
  } = useWorldData();

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  const { getEntity } = useEntityIndex();

  const mapSummaries = useMemo(
    () => entities.filter((entity) => entity.entity_type === "map"),
    [entities],
  );
  const mapSummaryIds = JSON.stringify(mapSummaries.map((map) => map.id));

  const activitySummaries = useMemo(
    () => entities.filter((entity) => ["campaign", "world_story", "world_event", "timeline_event"].includes(entity.entity_type)),
    [entities],
  );
  const placeableLocations = useMemo(
    () => entities.filter((entity) => isPlaceEntityType(entity.entity_type)),
    [entities],
  );
  const activitySummaryIds = JSON.stringify(activitySummaries.map((item) => item.id));

  useEffect(() => {
    const mapIds = JSON.parse(mapSummaryIds) as string[];
    if (mapIds.length === 0 || loadedMapIds.current === mapSummaryIds) {
      return;
    }

    loadedMapIds.current = mapSummaryIds;
    void loadEntities(mapIds).catch((error: unknown) => {
      loadedMapIds.current = null;
      console.error("Failed to load maps:", error);
    });
  }, [loadEntities, mapSummaryIds]);

  useEffect(() => {
    const activityIds = JSON.parse(activitySummaryIds) as string[];
    if (
      !selectedMapId
      || activityIds.length === 0
      || loadedActivityIds.current === activitySummaryIds
    ) return;
    loadedActivityIds.current = activitySummaryIds;
    void loadEntities(activityIds).catch((error: unknown) => {
      loadedActivityIds.current = null;
      console.error("Failed to load campaign map activity:", error);
    });
  }, [activitySummaryIds, loadEntities, selectedMapId]);

  const worldStories = useMemo(
    () => activitySummaries
      .filter((summary) => summary.entity_type === "world_story")
      .map((summary) => {
        const story = getWorldEntity(summary.id)?.entity;
        return story ? { ...story, id: summary.id, name: summary.name } as unknown as WorldStory : undefined;
      })
      .filter((story): story is WorldStory => Boolean(story)),
    [activitySummaries, getWorldEntity],
  );

  const campaignActivity = useMemo(() => {
    const allActivity = buildMapCampaignActivity(
      activitySummaries,
      Object.fromEntries(activitySummaries.flatMap((summary) => {
        const data = getWorldEntity(summary.id);
        return data ? [[summary.id, data]] : [];
      })),
      worldStories,
    );
    if (!selectedWorldStoryId && !selectedThreadId) return allActivity;
    const [threadStoryId, threadId] = selectedThreadId.split("::", 2);
    return allActivity.filter((item) => item.storyTags.some((tag) =>
      (!selectedWorldStoryId || tag.storyId === selectedWorldStoryId)
      && (!selectedThreadId || (tag.storyId === threadStoryId && tag.threadId === threadId)),
    ));
  }, [activitySummaries, getWorldEntity, selectedThreadId, selectedWorldStoryId, worldStories]);

  const maps = mapSummaries
    .map((summary) => getWorldEntity(summary.id)?.entity)
    .filter((entity): entity is Record<string, unknown> => Boolean(entity))
    .map((entity) => entity as unknown as Map);

  const openMap = (mapId: string, entityId?: string, placeEntity = false) => {
    setSelectedMapId(mapId);

    setSearchParams({
      map: mapId,
      ...(entityId ? { [placeEntity ? "placeEntity" : "focusEntity"]: entityId } : {}),
      ...(searchParams.get("from") === "world-map"
        ? { from: "world-map" }
        : {}),
    });
  };

  const selectedMap = maps.find((map) => map.id === selectedMapId);
  const routePlaceEntityId = searchParams.get("placeEntity");
  const pendingMapEntity = pendingMapEntitySelection
    ?? entities.find((entity) => entity.id === routePlaceEntityId)
    ?? null;
  const isPointPlacementActive = pointPlacementMode || Boolean(selectedMap && pendingMapEntity);

  const clearPendingMapEntity = () => {
    setPendingMapEntitySelection(null);
    if (searchParams.has("placeEntity")) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("placeEntity");
        return next;
      }, { replace: true });
    }
  };

  const handleBack = () => {
    if (searchParams.get("from") === "world-map") {
      navigate("/world-map");
      return;
    }

    setSelectedMapId(null);
    setSearchParams({});
  };

  const handleMarkerMove = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const updatedMarkers = selectedMap.markers.map((currentMarker) =>
      currentMarker.id === marker.id ? marker : currentMarker,
    );

    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: updatedMarkers,
      });
      setMapError(null);
    } catch (error) {
      console.error("Failed to move marker:", error);
      setMapError(error instanceof Error ? error.message : "Could not save the marker position.");
    }
  };

  const handleShapeCreated = (marker: MapMarker, layer: L.Layer) => {
    setMapError(null);
    const markerDraft = shapeDraft
      ? {
          ...shapeDraft,
          id: shapeDraft.id,
          type: marker.type,
          x: marker.x,
          y: marker.y,
          points: marker.points,
          fill_color: shapeDraft.fill_color ?? marker.fill_color,
          fill_opacity: shapeDraft.fill_opacity ?? marker.fill_opacity,
        }
      : marker;
    draftShapeLayer?.remove();
    setMapLayerMarkerId(layer, markerDraft.id);
    setDraftShapeLayer(layer);
    setShapeDraft(null);
    setPointPlacementMode(false);
    setDrawShape(null);
    setShapeEditId(null);
    setMarkerDrawer({
      open: true,
      mode: "create",
      marker: markerDraft,
    });
  };

  const handlePlacePointMarker = (x: number, y: number) => {
    setMapError(null);
    const marker: MapMarker = {
      id: crypto.randomUUID(),
      entity_id: pendingMapEntity?.id ?? null,
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
      label: pendingMapEntity?.name,
      visible: true,
      dm_only: false,
      hide_label: false,
      icon: "location",
      type: "point",
    };
    draftShapeLayer?.remove();
    setDraftShapeLayer(null);
    setShapeDraft(null);
    setPointPlacementMode(false);
    clearPendingMapEntity();
    setMarkerDrawer({ open: true, mode: "create", marker });
  };

  const handlePlaceMapEntity = (entity: EntitySummary) => {
    setMapError(null);
    setPendingMapEntitySelection(entity);
    setPointPlacementMode(true);
    setMarkerEditMode(false);
    setShapeEditId(null);
    setDrawShape(null);
  };

  const handleStartDrawing = (type: "area" | "path", draft?: MapMarker) => {
    clearPendingMapEntity();
    setPointPlacementMode(false);
    setMarkerEditMode(false);
    setShapeEditId(null);
    setMarkerDrawer({ open: false, mode: "create", marker: null });
    setShapeDraft(draft ? { ...draft, type } : null);
    setDrawShape(type);
  };

  const handleStartShapeEdit = (markerId: string) => {
    clearPendingMapEntity();
    setPointPlacementMode(false);
    setMarkerEditMode(true);
    setMarkerDrawer({ open: false, mode: "edit", marker: null });
    setShapeEditId(markerId);
  };

  const handleDrawShapeHandled = useCallback(() => {
    setDrawShape(null);
  }, []);

  const handleOpenMarkerEditor = (markerId: string) => {
    if (!selectedMap) return;
    const marker = selectedMap.markers.find((item) => item.id === markerId);
    if (!marker) return;
    setMapError(null);
    clearPendingMapEntity();
    setShapeDraft(null);
    setPointPlacementMode(false);
    setMarkerDrawer({ open: true, mode: "edit", marker });
  };

  const handleShapeEdited = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const updatedMarkers = selectedMap.markers.map((currentMarker) =>
      currentMarker.id === marker.id ? marker : currentMarker,
    );

    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: updatedMarkers,
      });
      setMapError(null);
    } catch (error) {
      console.error("Failed to save edited shape:", error);
      setMapError(error instanceof Error ? error.message : "Could not save the shape.");
    }
  };

  const handleOpenMarkerMenu = (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => {
    event.preventDefault();

    setMarkerContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      mapX: x,
      mapY: y,
      markerId: markerId ?? null,
    });
  };

  const handleEditMarker = () => {
    if (!markerContextMenu?.markerId || !selectedMap) {
      return;
    }

    const marker = selectedMap.markers.find(
      (existingMarker) => existingMarker.id === markerContextMenu.markerId,
    );

    if (!marker) {
      return;
    }

    setMarkerDrawer({
      open: true,
      mode: "edit",
      marker,
    });

    setMarkerContextMenu(null);
  };

  const handleCreateMarker = () => {
    if (!markerContextMenu) {
      return;
    }

    const marker: MapMarker = {
      id: crypto.randomUUID(),
      entity_id: null,
      x: Math.min(100, Math.max(0, markerContextMenu.mapX)),
      y: Math.min(100, Math.max(0, markerContextMenu.mapY)),
      visible: true,
      dm_only: false,
      hide_label: false,
      icon: "location",
      type: "point",
    };

    setShapeDraft(null);
    setPointPlacementMode(false);
    clearPendingMapEntity();
    setMarkerDrawer({
      open: true,
      mode: "create",
      marker,
    });

    setMarkerContextMenu(null);
  };

  const handleDeleteMarker = async () => {
    if (!markerContextMenu?.markerId || !selectedMap) {
      return;
    }
    try {
      await handleDeleteMarkerById(markerContextMenu.markerId);
    } catch {
      // The map editor displays the error from the shared delete handler.
    }
  };

  const handleDeleteMarkerById = async (markerId: string) => {
    if (!selectedMap) return;
    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: selectedMap.markers.filter((marker) => marker.id !== markerId),
      });
      draftShapeLayer?.remove();
      setDraftShapeLayer(null);
      setMarkerDrawer({ open: false, mode: "create", marker: null });
      setMarkerContextMenu(null);
      setShapeDraft(null);
      setMapError(null);
      if (shapeEditId === markerId) setShapeEditId(null);
    } catch (error) {
      console.error("Failed to delete marker:", error);
      setMapError(error instanceof Error ? error.message : "Could not delete this marker.");
      throw error;
    }
  };

  const handleSaveMarker = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const markerExists = selectedMap.markers.some((item) => item.id === marker.id);
    const updatedMarkers = markerExists
      ? selectedMap.markers.map((item) => item.id === marker.id ? marker : item)
      : [...selectedMap.markers, marker];

    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: updatedMarkers,
      });

      draftShapeLayer?.remove();
      setDraftShapeLayer(null);
      setShapeDraft(null);
      setMapError(null);
      setMarkerDrawer({
        open: false,
        mode: "create",
        marker: null,
      });
    } catch (error) {
      console.error("Failed to save marker:", error);
      setMapError(error instanceof Error ? error.message : "Could not save this marker.");
      throw error;
    }
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [selectedMapId]);

  if (entitiesLoading && mapSummaries.length === 0) {
    return <Typography color="text.secondary">Loading maps…</Typography>;
  }

  if (entitiesError) {
    return (
      <Typography color="error">
        Could not load maps: {entitiesError}
      </Typography>
    );
  }

  if (selectedMap) {
    return (
      <>
        <MapViewer
          map={selectedMap}
          maps={maps}
          focusEntityId={searchParams.get("focusEntity")}
          fromWorldMap={searchParams.get("from") === "world-map"}
          locations={placeableLocations}
          pendingMapEntityName={pendingMapEntity?.name ?? null}
          worldStories={worldStories}
          campaignActivity={campaignActivity}
          activityLayerEnabled={activityLayerEnabled}
          selectedWorldStoryId={selectedWorldStoryId}
          selectedThreadId={selectedThreadId}
          markerEditMode={markerEditMode}
          pointPlacementMode={isPointPlacementActive}
          shapeEditActive={shapeEditId !== null}
          onActivityLayerEnabledChange={setActivityLayerEnabled}
          onWorldStoryChange={(storyId) => {
            setSelectedWorldStoryId(storyId);
            setSelectedThreadId("");
          }}
          onThreadChange={setSelectedThreadId}
          onMarkerEditModeChange={(enabled) => {
            setMarkerEditMode(enabled);
            setPointPlacementMode(false);
            clearPendingMapEntity();
            if (!enabled) setShapeEditId(null);
          }}
          onPointPlacementModeChange={(enabled) => {
            setPointPlacementMode(enabled);
            if (!enabled) clearPendingMapEntity();
            if (enabled) {
              setMarkerEditMode(false);
              setShapeEditId(null);
            }
          }}
          onFinishShapeEdit={() => setShapeEditId(null)}
          mapError={mapError}
          onPlacePointMarker={handlePlacePointMarker}
          onPlaceMapEntity={handlePlaceMapEntity}
          onOpenMarkerEditor={handleOpenMarkerEditor}
          shapeEditId={shapeEditId}
          drawShape={drawShape}
          onDrawShapeHandled={handleDrawShapeHandled}
          onBack={handleBack}
          onOpenEntity={openEntity}
          onOpenMap={openMap}
          getEntity={getEntity}
          onOpenMarkerMenu={handleOpenMarkerMenu}
          onMarkerMove={handleMarkerMove}
          onShapeCreated={handleShapeCreated}
          onShapeEdited={handleShapeEdited}
        />

        <EntityDetailDrawer
          entityId={entityId}
          open={isOpen}
          onClose={closeEntity}
          onOpenEntity={openEntity}
          onOpenMap={(mapId, targetEntityId, placeEntity) => {
            closeEntity();
            openMap(mapId, targetEntityId, placeEntity);
          }}
          onBack={goBack}
          canGoBack={canGoBack}
        />

        <MarkerDrawer
          key={`${markerDrawer.mode}-${markerDrawer.marker?.id ?? "closed"}-${markerDrawer.marker?.type ?? "none"}`}
          open={markerDrawer.open}
          marker={markerDrawer.marker}
          mode={markerDrawer.mode}
          onClose={() => {
            draftShapeLayer?.remove();
            setDraftShapeLayer(null);
            setShapeDraft(null);
            setMarkerDrawer({
              open: false,
              mode: "create",
              marker: null,
            });
          }}
          onSave={handleSaveMarker}
          onDelete={handleDeleteMarkerById}
          onStartDrawing={handleStartDrawing}
          onEditShape={handleStartShapeEdit}
        />

        <MarkerContextMenu
          open={Boolean(markerContextMenu)}
          position={
            markerContextMenu
              ? {
                  mouseX: markerContextMenu.mouseX,
                  mouseY: markerContextMenu.mouseY,
                }
              : null
          }
          markerId={markerContextMenu?.markerId ?? null}
          onCreate={handleCreateMarker}
          onEdit={handleEditMarker}
          onDelete={handleDeleteMarker}
          onClose={() => setMarkerContextMenu(null)}
        />
      </>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: "0.15em" }}
        >
          WORLD
        </Typography>

        <Typography variant="h1" sx={{ mt: 0.5 }}>
          Maps
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Maps and geographic references for the world.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1.5,
            mb: 0.5,
          }}
        >
          <MapIcon color="primary" />

          <Typography variant="h2">Maps</Typography>
        </Stack>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Geographic views and maps used to navigate the world.
        </Typography>

        {maps.length === 0 ? (
          <Typography color="text.secondary">
            No maps have been added yet.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {maps.map((map) => (
              <Grid key={map.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <MapCard map={map} onOpen={() => setSelectedMapId(map.id)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

function MapCard({ map, onOpen }: MapCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea sx={{ height: "100%" }} onClick={onOpen}>
        {map.image_path && (
          <Box
            component="img"
            src={map.image_path}
            alt={map.name}
            sx={{
              display: "block",
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              borderBottom: 1,
              borderColor: "divider",
            }}
          />
        )}

        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: "1.3rem",
              fontWeight: 600,
            }}
          >
            {map.name}
          </Typography>

          {map.map_type && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {map.map_type}
            </Typography>
          )}

          <Stack
            direction="row"
            sx={{
              gap: 0.75,
              mt: 2,
              flexWrap: "wrap",
            }}
          >
            <Chip size="small" label={`${map.markers.length} markers`} />

            {map.parent_map && <Chip size="small" label="Nested map" />}

            {map.image_path && <Chip size="small" label="Image" />}
          </Stack>

          {map.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 2,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {map.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function MapViewer({
  map,
  maps,
  focusEntityId,
  fromWorldMap,
  locations,
  pendingMapEntityName,
  worldStories,
  campaignActivity,
  activityLayerEnabled,
  selectedWorldStoryId,
  selectedThreadId,
  markerEditMode,
  pointPlacementMode,
  shapeEditActive,
  mapError,
  onActivityLayerEnabledChange,
  onWorldStoryChange,
  onThreadChange,
  onMarkerEditModeChange,
  onPointPlacementModeChange,
  onFinishShapeEdit,
  onBack,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onPlacePointMarker,
  onPlaceMapEntity,
  onOpenMarkerEditor,
  shapeEditId,
  drawShape,
  onDrawShapeHandled,
  onOpenMarkerMenu,
  onMarkerMove,
  onShapeCreated,
  onShapeEdited,
}: MapViewerProps) {
  const [mapExplorerOpen, setMapExplorerOpen] = useState(false);
  const [manualFocus, setManualFocus] = useState<{ mapId: string; markerId: string } | null>(null);
  const focusedMarkerId = manualFocus?.mapId === map.id
    ? manualFocus.markerId
    : focusEntityId
      ? map.markers.find((marker) => marker.entity_id === focusEntityId)?.id ?? null
      : null;
  const entity = map.entity_id ? getEntity(map.entity_id) : undefined;

  const ancestry = getMapAncestry(map, maps);
  const visibleAncestors = fromWorldMap && ancestry[0]?.map_type === "world"
    ? ancestry.slice(1)
    : ancestry;
  const childMapIds = new Set(maps.filter((candidate) => candidate.parent_map === map.id).map((candidate) => candidate.id));
  const markerLinkedMapIds = new Set(
    map.markers
      .filter((marker) => marker.visible && !marker.dm_only && marker.linked_map)
      .map((marker) => marker.linked_map as string),
  );
  const connectedMaps = maps
    .filter((candidate) => candidate.id !== map.id && (childMapIds.has(candidate.id) || markerLinkedMapIds.has(candidate.id)))
    .map((candidate) => ({
      map: candidate,
      relationship: childMapIds.has(candidate.id) ? "Child map" : "Marker link",
    }));
  const availableThreads = worldStories
    .filter((story) => !selectedWorldStoryId || story.id === selectedWorldStoryId)
    .flatMap((story) => (story.threads ?? []).map((thread) => ({
      id: thread.id,
      storyId: story.id,
      label: selectedWorldStoryId ? thread.name : `${story.name} · ${thread.name}`,
    })));
  const mappedLocationIds = new Set(
    map.markers
      .filter((marker) => marker.visible && !marker.dm_only && marker.type !== "area" && marker.type !== "path")
      .map((marker) => marker.entity_id),
  );
  const mappedActivityLocationCount = new Set(
    campaignActivity
      .filter((item) => mappedLocationIds.has(item.locationId))
      .map((item) => item.locationId),
  ).size;

  return (
    <Box>
      <Box
        sx={{
          px: { xs: 3, md: 5 },
          py: { xs: 3, md: 4 },
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Breadcrumbs aria-label="Map hierarchy" sx={{ mb: 3 }}>
          <Link
            component="button"
            type="button"
            underline="hover"
            color="inherit"
            onClick={onBack}
          >
            {fromWorldMap ? "World Map" : "All Maps"}
          </Link>
          {visibleAncestors.map((ancestor) => (
            <Link
              key={ancestor.id}
              component="button"
              type="button"
              underline="hover"
              color="inherit"
              onClick={() => {
                if (fromWorldMap && ancestor.map_type === "world") onBack();
                else onOpenMap(ancestor.id);
              }}
            >
              {ancestor.name}
            </Link>
          ))}
          <Typography color="text.primary" aria-current="page">{map.name}</Typography>
        </Breadcrumbs>

        <Stack
          direction="row"
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: "block",
                letterSpacing: "0.15em",
                lineHeight: 1.2,
              }}
            >
              {entity?.entity_type ?? map.map_type ?? "MAP"}
            </Typography>

            <Typography
              variant="h1"
              component="button"
              onClick={() => {
                if (map.entity_id) {
                  onOpenEntity(map.entity_id);
                }
              }}
              sx={{
                mt: 0.75,
                p: 0,
                border: 0,
                background: "none",
                color: "text.primary",
                font: "inherit",
                fontSize: { xs: "1.5rem", md: "2rem" },
                fontWeight: 600,
                lineHeight: 1.1,
                textAlign: "left",
                textDecoration: map.entity_id ? "underline" : "none",
                cursor: map.entity_id ? "pointer" : "default",
                "&:hover": map.entity_id
                  ? {
                      color: "primary.main",
                    }
                  : undefined,
              }}
            >
              {entity?.name ?? map.name}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => onOpenEntity(map.id)}
            sx={{
              flexShrink: 0,
            }}
          >
            Edit Map
          </Button>
        </Stack>
        {connectedMaps.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: "0.08em" }}>
              CONNECTED MAPS
            </Typography>
            <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
              {connectedMaps.map(({ map: connectedMap, relationship }) => (
                <Button
                  key={connectedMap.id}
                  variant="outlined"
                  size="small"
                  startIcon={<MapOutlinedIcon />}
                  onClick={() => onOpenMap(connectedMap.id)}
                  sx={{ textTransform: "none", gap: 0.75 }}
                >
                  {connectedMap.name}
                  <Chip size="small" label={relationship} />
                </Button>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          p: { xs: 2, md: 4 },
          backgroundColor: "background.default",
        }}
      >
        {mapError && <Alert severity="error" sx={{ mb: 2 }}>{mapError}</Alert>}
        {map.image_path ? (
          <>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              useFlexGap
              sx={{ mb: 2, alignItems: { xs: "stretch", md: "center" }, flexWrap: "wrap" }}
            >
              <Button
                variant={pointPlacementMode ? "contained" : "outlined"}
                onClick={() => onPointPlacementModeChange(!pointPlacementMode)}
                sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}
              >
                {pointPlacementMode ? "Cancel Point Placement" : "Add Point Marker"}
              </Button>
              <Button
                variant={markerEditMode ? "contained" : "outlined"}
                onClick={() => onMarkerEditModeChange(!markerEditMode)}
                sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}
              >
                {markerEditMode ? "Done Editing Markers" : "Edit Markers"}
              </Button>
              <Button
                variant={mapExplorerOpen ? "contained" : "outlined"}
                startIcon={<MapOutlinedIcon />}
                onClick={() => setMapExplorerOpen((open) => !open)}
                sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}
              >
                {mapExplorerOpen ? "Hide Map Explorer" : "Explore Markers"}
              </Button>
              {shapeEditActive && (
                <Button color="warning" variant="contained" onClick={onFinishShapeEdit} sx={{ textTransform: "none" }}>
                  Finish Shape Edit
                </Button>
              )}
              <Button
                variant={activityLayerEnabled ? "contained" : "outlined"}
                onClick={() => onActivityLayerEnabledChange(!activityLayerEnabled)}
                sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}
              >
                {activityLayerEnabled ? "Hide campaign activity" : "Show campaign activity"}
              </Button>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
                <InputLabel id="map-world-story-filter-label">World Story</InputLabel>
                <Select
                  labelId="map-world-story-filter-label"
                  label="World Story"
                  value={selectedWorldStoryId}
                  onChange={(event) => onWorldStoryChange(event.target.value)}
                >
                  <MenuItem value="">All World Stories</MenuItem>
                  {worldStories.map((story) => <MenuItem key={story.id} value={story.id}>{story.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 240 } }}>
                <InputLabel id="map-story-thread-filter-label">Story Thread</InputLabel>
                <Select
                  labelId="map-story-thread-filter-label"
                  label="Story Thread"
                  value={selectedThreadId}
                  onChange={(event) => onThreadChange(event.target.value)}
                >
                  <MenuItem value="">All Threads</MenuItem>
                  {availableThreads.map((thread) => <MenuItem key={`${thread.storyId}-${thread.id}`} value={`${thread.storyId}::${thread.id}`}>{thread.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Chip
                size="small"
                label={`${mappedActivityLocationCount} mapped locations`}
                color={activityLayerEnabled ? "primary" : "default"}
              />
              {pointPlacementMode && (
                <Typography variant="caption" color="text.secondary">
                  {pendingMapEntityName
                    ? `Click an open spot on the map to place ${pendingMapEntityName}.`
                    : "Click an open spot on the map to place the marker."}
                </Typography>
              )}
              {activityLayerEnabled && (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #64b5f6", boxShadow: "0 0 0 3px rgba(100,181,246,0.25)" }} />
                  <Typography variant="caption" color="text.secondary">Location has linked activity</Typography>
                </Stack>
              )}
            </Stack>
            <LeafletMap
              map={map}
              maps={maps}
              locations={locations}
              campaignActivity={activityLayerEnabled ? campaignActivity : []}
              focusedMarkerId={focusedMarkerId}
              markerEditMode={markerEditMode}
              pointPlacementMode={pointPlacementMode}
              onOpenEntity={onOpenEntity}
              onOpenMap={onOpenMap}
              getEntity={getEntity}
              onPlacePointMarker={onPlacePointMarker}
              onPlaceMapEntity={onPlaceMapEntity}
              onOpenMarkerEditor={onOpenMarkerEditor}
              shapeEditId={shapeEditId}
              drawShape={drawShape}
              onDrawShapeHandled={onDrawShapeHandled}
              onOpenMarkerMenu={onOpenMarkerMenu}
              onMarkerMove={onMarkerMove}
              onShapeCreated={onShapeCreated}
              onShapeEdited={onShapeEdited}
              mapExplorerOpen={mapExplorerOpen}
              onCloseMapExplorer={() => setMapExplorerOpen(false)}
              onFocusMarker={(markerId) => setManualFocus({ mapId: map.id, markerId })}
            />
          </>
        ) : (
          <Typography color="text.secondary">
            No map image has been assigned.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
function LeafletMap({
  map,
  maps,
  locations,
  campaignActivity,
  focusedMarkerId,
  mapExplorerOpen,
  onCloseMapExplorer,
  onFocusMarker,
  markerEditMode,
  pointPlacementMode,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onPlacePointMarker,
  onPlaceMapEntity,
  onOpenMarkerEditor,
  shapeEditId,
  drawShape,
  onDrawShapeHandled,
  onOpenMarkerMenu,
  onMarkerMove,
  onShapeCreated,
  onShapeEdited,
}: LeafletMapProps) {
  const imageDimensions = useImageDimensions(map.image_path!);

  const imageBounds = imageDimensions ? getImageBounds(imageDimensions) : null;

  return (
    <Box
      sx={{
        width: "100%",
        height: "min(70vh, 1000px)",
        minHeight: 600,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.default",
        position: "relative",
        "& .leaflet-control-zoom a, & .leaflet-pm-toolbar .leaflet-buttons-control-button":
          {
            backgroundColor: "background.paper",
            color: "text.primary",
            borderColor: "divider",
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          },
        "& .leaflet-control-zoom a:hover, & .leaflet-pm-toolbar .leaflet-buttons-control-button:hover":
          {
            backgroundColor: "action.hover",
          },
        "& .leaflet-control-zoom": {
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        },
        "& .leaflet-pm-toolbar": {
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        },
        "& .campaign-map-marker": {
          background: "transparent !important",
          border: "0 !important",
          width: "34px !important",
          height: "34px !important",
          margin: "-17px 0 0 -17px !important",
        },
        "& .campaign-map-label-icon": {
          background: "transparent !important",
          border: "0 !important",
          width: "1px !important",
          height: "1px !important",
          overflow: "visible !important",
          pointerEvents: "none",
        },
        "& .campaign-map-label-content": {
          position: "absolute",
          left: "0",
          top: "18px",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(18, 18, 18, 0.94)",
          border: "1px solid rgba(201, 168, 91, 0.75)",
          borderRadius: "5px",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 600,
          lineHeight: 1.2,
          padding: "3px 7px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.55)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        },
      }}
    >
      <MapContainer
        crs={L.CRS.Simple}
        center={[-50, 50]}
        zoom={0}
        minZoom={-5}
        maxZoom={5}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
      >
        {imageDimensions && imageBounds && (
          <>
            <MapInitialView
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
            />

            <MapFocusMarker
              marker={map.markers.find((item) => item.id === focusedMarkerId) ?? null}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
            />

            <MapImage imageUrl={map.image_path!} bounds={imageBounds} />

            <MapResetButton
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
            />

            <MapContextMenu
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              pointPlacementMode={pointPlacementMode}
              onPlacePointMarker={onPlacePointMarker}
              onOpenMarkerMenu={onOpenMarkerMenu}
            />

            <MapMarkers
              map={map}
              campaignActivity={campaignActivity}
              focusedMarkerId={focusedMarkerId}
              markerEditMode={markerEditMode}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              onOpenEntity={onOpenEntity}
              onOpenMap={onOpenMap}
              getEntity={getEntity}
              onOpenMarkerEditor={onOpenMarkerEditor}
              onOpenMarkerMenu={onOpenMarkerMenu}
              onMarkerMove={onMarkerMove}
            />

            <GeomanController
              mapData={map}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              onShapeCreated={onShapeCreated}
              onShapeEdited={onShapeEdited}
              shapeEditId={shapeEditId}
              drawShape={drawShape}
              onDrawShapeHandled={onDrawShapeHandled}
            />
          </>
        )}
      </MapContainer>
      {mapExplorerOpen && (
        <MapExplorer
          markers={map.markers}
          maps={maps}
          locations={locations}
          getEntity={getEntity}
          focusedMarkerId={focusedMarkerId}
          onFocusMarker={onFocusMarker}
          onOpenEntity={onOpenEntity}
          onOpenMap={onOpenMap}
          onOpenMarkerEditor={onOpenMarkerEditor}
          onPlaceEntity={onPlaceMapEntity}
          onClose={onCloseMapExplorer}
        />
      )}
    </Box>
  );
}

function MapContextMenu({
  imageWidth,
  imageHeight,
  pointPlacementMode,
  onPlacePointMarker,
  onOpenMarkerMenu,
}: MapContextMenuProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      if (!pointPlacementMode) return;
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest(".leaflet-marker-icon, .leaflet-interactive, .leaflet-popup")) {
        return;
      }
      const [x, y] = leafletToWorld(event.latlng.lat, event.latlng.lng, imageWidth, imageHeight);
      onPlacePointMarker(x, y);
    },
    contextmenu(event) {
      const [x, y] = leafletToWorld(
        event.latlng.lat,
        event.latlng.lng,
        imageWidth,
        imageHeight,
      );

      const sourceMarkerId = getMapLayerMarkerId(event.sourceTarget as L.Layer);
      const shapeMarkerId = sourceMarkerId
        ? undefined
        : findShapeMarkerIdAtPoint(map, event.latlng);

      const syntheticEvent = {
        preventDefault: () => undefined,
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      } as React.MouseEvent;

      onOpenMarkerMenu(syntheticEvent, x, y, sourceMarkerId ?? shapeMarkerId);
    },
  });

  return null;
}
function MapMarkers({
  map,
  campaignActivity,
  focusedMarkerId,
  markerEditMode,
  imageWidth,
  imageHeight,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onOpenMarkerEditor,
  onOpenMarkerMenu,
  onMarkerMove,
}: MapMarkersProps) {
  const visibleMarkers = map.markers.filter(
    (marker) => marker.visible && !marker.dm_only,
  );

  return (
    <>
      {visibleMarkers
        .filter(
          (marker) =>
            marker.type === "area" &&
            marker.points &&
            marker.points.length >= 3,
        )
        .map((marker) => (
          <Polygon
            key={marker.id}
            positions={marker.points!.map((point) =>
              worldToLeaflet(point, imageWidth, imageHeight),
            )}
            pathOptions={{
              color: focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              fillColor: focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              fillOpacity: focusedMarkerId === marker.id ? Math.max(marker.fill_opacity ?? 0.2, 0.35) : marker.fill_opacity ?? 0.2,
              weight: focusedMarkerId === marker.id ? 4 : 2,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
              }
            }}
            eventHandlers={{
              click: () => {
                if (markerEditMode) {
                  onOpenMarkerEditor(marker.id);
                } else if (marker.linked_map) {
                  onOpenMap(marker.linked_map);
                } else if (marker.entity_id) {
                  onOpenEntity(marker.entity_id);
                }
              },
              contextmenu: (event) => {
                const [x, y] = leafletToWorld(
                  event.latlng.lat,
                  event.latlng.lng,
                  imageWidth,
                  imageHeight,
                );
                const syntheticEvent = {
                  preventDefault: () => undefined,
                  clientX: event.originalEvent.clientX,
                  clientY: event.originalEvent.clientY,
                } as React.MouseEvent;
                onOpenMarkerMenu(syntheticEvent, x, y, marker.id);
              },
            }}
          >
            {(marker.tooltip || marker.label) && (
              <LeafletTooltip>{marker.tooltip || marker.label}</LeafletTooltip>
            )}
          </Polygon>
        ))}

      {visibleMarkers
        .filter(
          (marker) =>
            marker.type === "path" &&
            marker.points &&
            marker.points.length >= 2,
        )
        .map((marker) => (
          <Polyline
            key={marker.id}
            positions={marker.points!.map((point) =>
              worldToLeaflet(point, imageWidth, imageHeight),
            )}
            pathOptions={{
              color: focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              weight: focusedMarkerId === marker.id ? 7 : 4,
              opacity: focusedMarkerId === marker.id ? 1 : 0.9,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
              }
            }}
            eventHandlers={{
              click: () => {
                if (markerEditMode) {
                  onOpenMarkerEditor(marker.id);
                } else if (marker.linked_map) {
                  onOpenMap(marker.linked_map);
                } else if (marker.entity_id) {
                  onOpenEntity(marker.entity_id);
                }
              },
              contextmenu: (event) => {
                const [x, y] = leafletToWorld(
                  event.latlng.lat,
                  event.latlng.lng,
                  imageWidth,
                  imageHeight,
                );
                const syntheticEvent = {
                  preventDefault: () => undefined,
                  clientX: event.originalEvent.clientX,
                  clientY: event.originalEvent.clientY,
                } as React.MouseEvent;
                onOpenMarkerMenu(syntheticEvent, x, y, marker.id);
              },
            }}
          >
            {(marker.tooltip || marker.label) && (
              <LeafletTooltip>{marker.tooltip || marker.label}</LeafletTooltip>
            )}
          </Polyline>
        ))}

      {visibleMarkers
        .filter((marker) => marker.type !== "area" && marker.type !== "path")
        .map((marker) => (
          // Story-linked activity is attached to existing location markers, so
          // the overlay remains aligned when a DM moves a marker.
          <CampaignMarker
            key={marker.id}
            marker={marker}
            campaignActivity={markerEditMode ? [] : campaignActivity.filter((item) => item.locationId === marker.entity_id)}
            highlighted={focusedMarkerId === marker.id}
            markerEditMode={markerEditMode}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onOpenEntity={onOpenEntity}
            onOpenMap={onOpenMap}
            getEntity={getEntity}
            onOpenMarkerEditor={onOpenMarkerEditor}
            onOpenMarkerMenu={onOpenMarkerMenu}
            onMarkerMove={onMarkerMove}
          />
        ))}

      {visibleMarkers
        .filter(
          (marker) =>
            marker.label &&
            !marker.hide_label &&
            ((marker.type === "area" &&
              marker.points &&
              marker.points.length >= 3) ||
              (marker.type === "path" &&
                marker.points &&
                marker.points.length >= 2)),
        )
        .map((marker) => (
          <Marker
            key={`${marker.id}-label`}
            position={worldToLeaflet(
              getLabelWorldPoint(marker.points!),
              imageWidth,
              imageHeight,
            )}
            icon={markerLabelIcon(marker.label!)}
            interactive={false}
            keyboard={false}
          />
        ))}
    </>
  );
}

function CampaignMarker({
  marker,
  campaignActivity,
  highlighted,
  markerEditMode,
  imageWidth,
  imageHeight,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onOpenMarkerEditor,
  onOpenMarkerMenu,
  onMarkerMove,
}: CampaignMarkerProps) {
  const position = worldToLeaflet(
    [marker.x, marker.y],
    imageWidth,
    imageHeight,
  );

  return (
    <>
      <Marker
        position={position}
        icon={markerIcon(marker.icon, campaignActivity.length > 0 || highlighted)}
        draggable
        pmIgnore
        ref={(layer) => {
          if (layer) {
            setMapLayerMarkerId(layer, marker.id);
          }
        }}
        eventHandlers={{
          dragend: (event) => {
            const leafletMarker = event.target as L.Marker;
            const latLng = leafletMarker.getLatLng();
            const [x, y] = leafletToWorld(
              latLng.lat,
              latLng.lng,
              imageWidth,
              imageHeight,
            );
            onMarkerMove({
              ...marker,
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y)),
            });
          },
          click: () => {
            if (markerEditMode) {
              onOpenMarkerEditor(marker.id);
            } else if (campaignActivity.length === 0) {
              if (marker.linked_map) {
                onOpenMap(marker.linked_map);
              } else if (marker.entity_id) {
                onOpenEntity(marker.entity_id);
              }
            }
          },
          contextmenu: (event) => {
            const [x, y] = leafletToWorld(
              event.latlng.lat,
              event.latlng.lng,
              imageWidth,
              imageHeight,
            );
            const syntheticEvent = {
              preventDefault: () => undefined,
              clientX: event.originalEvent.clientX,
              clientY: event.originalEvent.clientY,
            } as React.MouseEvent;
            onOpenMarkerMenu(syntheticEvent, x, y, marker.id);
          },
        }}
      >
        {(marker.tooltip || marker.label) && (
          <LeafletTooltip>{marker.tooltip || marker.label}</LeafletTooltip>
        )}
        {campaignActivity.length > 0 && (
          <Popup className="campaign-activity-popup" minWidth={260} maxWidth={340}>
            <Box sx={{ minWidth: 230, maxWidth: 310, color: "text.primary" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Activity at {(marker.entity_id ? getEntity(marker.entity_id)?.name : undefined) ?? marker.label ?? "this location"}
              </Typography>
              <Stack spacing={0.75}>
                {campaignActivity.map((item, index) => (
                  <Box key={`${item.sourceEntityId}-${item.title}-${index}`} sx={{ borderTop: 1, borderColor: "divider", pt: 0.75 }}>
                    <Button
                      size="small"
                      onClick={() => onOpenEntity(item.sourceEntityId)}
                      sx={{ px: 0, minWidth: 0, textAlign: "left", justifyContent: "flex-start", textTransform: "none" }}
                    >
                      {item.title}
                    </Button>
                    {item.description && <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">{item.description}</Typography>}
                    {item.storyTags.length > 0 && (
                      <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.5, flexWrap: "wrap" }}>
                        {item.storyTags.map((tag) => (
                          <Chip
                            key={`${tag.storyId}-${tag.threadId ?? "story"}`}
                            size="small"
                            clickable
                            label={tag.threadName ? `${tag.storyName} · ${tag.threadName}` : tag.storyName}
                            onClick={() => onOpenEntity(tag.storyId)}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
              {marker.entity_id && (
                <Button size="small" fullWidth sx={{ mt: 1 }} onClick={() => onOpenEntity(marker.entity_id!)}>
                  Open location details
                </Button>
              )}
              {marker.linked_map && (
                <Button size="small" fullWidth sx={{ mt: 1 }} onClick={() => onOpenMap(marker.linked_map!)}>
                  Open linked map
                </Button>
              )}
            </Box>
          </Popup>
        )}
      </Marker>
      {marker.label && !marker.hide_label && (
        <Marker
          position={position}
          icon={markerLabelIcon(marker.label)}
          interactive={false}
          keyboard={false}
        />
      )}
    </>
  );
}

function GeomanController({
  mapData,
  imageWidth,
  imageHeight,
  shapeEditId,
  drawShape,
  onDrawShapeHandled,
  onShapeCreated,
  onShapeEdited,
}: GeomanControllerProps) {
  const map = useMap();

  // ---------------------------------------------------------
  // Geoman controls: initialize ONCE for this map
  // ---------------------------------------------------------
  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawCircle: false,
      drawRectangle: false,
      drawText: false,
      drawPolyline: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });

    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  useEffect(() => {
    if (!drawShape) return;
    map.pm.enableDraw(drawShape === "area" ? "Polygon" : "Line", {
      finishOnEnter: true,
    });
    onDrawShapeHandled();
  }, [drawShape, map, onDrawShapeHandled]);

  useEffect(() => {
    if (!shapeEditId) return;
    let selectedLayer: (L.Polygon | L.Polyline) | undefined;
    map.eachLayer((layer) => {
      if (
        !selectedLayer
        && (layer instanceof L.Polygon || layer instanceof L.Polyline)
        && getMapLayerMarkerId(layer) === shapeEditId
      ) {
        selectedLayer = layer;
      }
    });
    selectedLayer?.pm.enable({ allowSelfIntersection: false });
    return () => selectedLayer?.pm.disable();
  }, [map, shapeEditId]);

  // ---------------------------------------------------------
  // Shape creation
  // ---------------------------------------------------------
  useEffect(() => {
    const handleCreate = (event: GeomanCreateEvent) => {
      const points = layerToPoints(event.layer, imageWidth, imageHeight);

      if (!points || points.length === 0) {
        return;
      }

      const type =
        event.layer instanceof L.Polygon
          ? "area"
          : event.layer instanceof L.Polyline
            ? "path"
            : null;

      if (!type) {
        event.layer.removeFrom(map);
        return;
      }

      const marker: MapMarker = {
        id: crypto.randomUUID(),
        entity_id: null,
        type,
        x: points[0][0],
        y: points[0][1],
        points,
        visible: true,
        dm_only: false,
        hide_label: false,
        fill_color: "#1976d2",
        fill_opacity: 0.2,
      };

      setMapLayerMarkerId(event.layer, marker.id);
      onShapeCreated(marker, event.layer);
    };

    map.on("pm:create", handleCreate as L.LeafletEventHandlerFn);

    return () => {
      map.off("pm:create", handleCreate as L.LeafletEventHandlerFn);
    };
  }, [map, imageWidth, imageHeight, onShapeCreated]);

  // ---------------------------------------------------------
  // Existing shape editing / dragging
  // ---------------------------------------------------------
  useEffect(() => {
    const handleDragEnd = (event: GeomanEditEvent) => {
      const markerId = getMapLayerMarkerId(event.layer);

      if (!markerId) {
        return;
      }

      const points = layerToPoints(event.layer, imageWidth, imageHeight);

      if (!points) {
        return;
      }

      const existingMarker = mapData.markers.find(
        (marker) => marker.id === markerId,
      );

      if (!existingMarker) {
        return;
      }

      const updatedMarker: MapMarker = {
        ...existingMarker,
        points,
        x: points[0]?.[0] ?? existingMarker.x,
        y: points[0]?.[1] ?? existingMarker.y,
      };

      onShapeEdited(updatedMarker);
    };

    const handleEdit = (event: GeomanEditEvent) => {
      const markerId = getMapLayerMarkerId(event.layer);

      if (!markerId) {
        return;
      }

      const points = layerToPoints(event.layer, imageWidth, imageHeight);

      if (!points) {
        return;
      }

      const existingMarker = mapData.markers.find(
        (marker) => marker.id === markerId,
      );

      if (!existingMarker) {
        return;
      }

      const updatedMarker: MapMarker = {
        ...existingMarker,
        points,
        x: points[0]?.[0] ?? existingMarker.x,
        y: points[0]?.[1] ?? existingMarker.y,
      };

      onShapeEdited(updatedMarker);
    };

    const shapeLayers: L.Layer[] = [];

    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        const markerId = getMapLayerMarkerId(layer);

        if (markerId) {
          layer.on("pm:update", handleEdit as L.LeafletEventHandlerFn);

          layer.on("pm:dragend", handleDragEnd as L.LeafletEventHandlerFn);

          shapeLayers.push(layer);
        }
      }
    });

    return () => {
      shapeLayers.forEach((layer) => {
        layer.off("pm:update", handleEdit as L.LeafletEventHandlerFn);

        layer.off("pm:dragend", handleDragEnd as L.LeafletEventHandlerFn);
      });
    };
  }, [map, mapData.markers, imageWidth, imageHeight, onShapeEdited]);

  // ---------------------------------------------------------
  // Make sure rendered shape layers have their marker IDs
  // ---------------------------------------------------------
  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        const marker = mapData.markers.find((candidate) => {
          if (candidate.type !== "area" && candidate.type !== "path") {
            return false;
          }

          if (!candidate.points || candidate.points.length === 0) {
            return false;
          }

          return getMapLayerMarkerId(layer) === candidate.id;
        });

        if (marker) {
          setMapLayerMarkerId(layer, marker.id);
        }
      }
    });
  }, [map, mapData.markers]);

  return null;
}

export default MapsPage;
