import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polygon,
  Polyline,
  Popup,
  Rectangle,
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
  CardActions,
  CardActionArea,
  CardContent,
  Chip,
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
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
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import FlipIcon from "@mui/icons-material/Flip";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import type { EntityData, EntitySummary, Map, MapLayer, MapMarker, WorldStory } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import MarkerDrawer from "../components/MarkerDrawer";
import MarkerContextMenu from "../components/MarkerContextMenu";
import useEntityDrawer from "../hooks/useEntityDrawer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorldData } from "../context/WorldDataContext";
import DashboardFilters from "../components/filters/DashboardFilters";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

type MapCardProps = {
  map: Map;
  onOpen: () => void;
  onDelete: (map: Map) => Promise<void>;
};

type MapTemplate = "blank" | "village" | "town" | "building" | "tavern";
type QuickShapePreset = "room" | "building" | "street" | "corridor" | "building-l" | "building-t" | "building-u";
type MarkerAlignment = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";
type ResizeCorner = "north-west" | "north-east" | "south-west" | "south-east";
type MapLayerVisibility = { points: boolean; areas: boolean; paths: boolean };
type MapLayerLocks = { points: boolean; areas: boolean; paths: boolean };
type CustomLayerStates = Record<string, boolean>;
const DEFAULT_MAP_LAYER_VISIBILITY: MapLayerVisibility = { points: true, areas: true, paths: true };
const DEFAULT_MAP_LAYER_LOCKS: MapLayerLocks = { points: false, areas: false, paths: false };
function mapLayerKeyForMarker(marker: Pick<MapMarker, "type">): keyof MapLayerLocks {
  return marker.type === "area" ? "areas" : marker.type === "path" ? "paths" : "points";
}
function isMapMarkerLocked(marker: MapMarker, typeLocks: MapLayerLocks, customLocks: CustomLayerStates): boolean {
  return typeLocks[mapLayerKeyForMarker(marker)] || Boolean(marker.layer_id && customLocks[marker.layer_id]);
}
const QUICK_SHAPE_LABELS: Record<QuickShapePreset, string> = {
  room: "Room",
  building: "Rectangular building",
  street: "Street",
  corridor: "Corridor",
  "building-l": "L-shaped building",
  "building-t": "T-shaped building",
  "building-u": "U-shaped building",
};
type MapStampAsset = { name: string; image_path: string; default_size: number };
type PendingStampSize = { stamp: MapStampAsset; size: number; originalSize: number };
type StoredMapEditorDraft = { map: Map; stampSizes: [string, PendingStampSize][] };
type MapEditSnapshot = { markers: MapMarker[]; layers?: MapLayer[] };
type MarkerHistoryState = { undo: MapEditSnapshot[]; redo: MapEditSnapshot[] };
const EMPTY_MAP_LAYERS: MapLayer[] = [];

function mapDraftStorageKey(mapId: string) {
  return `world-builder-map-draft:${mapId}`;
}

function readStoredMapEditorDraft(mapId: string): StoredMapEditorDraft | null {
  try {
    const stored = window.sessionStorage.getItem(mapDraftStorageKey(mapId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StoredMapEditorDraft;
    if (parsed.map?.id !== mapId || !Array.isArray(parsed.map.markers) || !Array.isArray(parsed.stampSizes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeMapEditorDraft(map: Map, stampSizes: globalThis.Map<string, PendingStampSize>) {
  try {
    window.sessionStorage.setItem(mapDraftStorageKey(map.id), JSON.stringify({ map, stampSizes: [...stampSizes] } satisfies StoredMapEditorDraft));
  } catch {
    // Keep editing available when the browser blocks session storage.
  }
}

function clearStoredMapEditorDraft(mapId: string) {
  try {
    window.sessionStorage.removeItem(mapDraftStorageKey(mapId));
  } catch {
    // Nothing else is required if the browser blocks session storage.
  }
}

function copyMarkers(markers: MapMarker[]): MapMarker[] {
  return markers.map((marker) => ({
    ...marker,
    points: marker.points?.map(([x, y]) => [x, y]),
  }));
}

function copyMapEditSnapshot(snapshot: MapEditSnapshot): MapEditSnapshot {
  return {
    markers: copyMarkers(snapshot.markers),
    ...(snapshot.layers ? { layers: snapshot.layers.map((layer) => ({ ...layer })) } : {}),
  };
}

function mapLayerPaneName(layerId: string | null | undefined): string {
  return layerId
    ? `campaign-layer-assigned-${layerId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
    : "campaign-layer-unassigned";
}

function copyMapForEditing(map: Map): Map {
  return { ...map, layers: map.layers?.map((layer) => ({ ...layer })), markers: copyMarkers(map.markers) };
}

function offsetMapMarker(marker: MapMarker, deltaX: number, deltaY: number): MapMarker {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  return {
    ...marker,
    x: clamp(marker.x + deltaX),
    y: clamp(marker.y + deltaY),
    points: marker.points?.map(([x, y]): [number, number] => [clamp(x + deltaX), clamp(y + deltaY)]),
  };
}

function getMarkerBounds(marker: MapMarker) {
  const points = marker.points?.length ? marker.points : [[marker.x, marker.y] as [number, number]];
  return points.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function getGroupTranslation(markers: MapMarker[], deltaX: number, deltaY: number): [number, number] {
  if (markers.length === 0) return [deltaX, deltaY];
  const bounds = markers.map(getMarkerBounds).reduce((group, item) => ({
    minX: Math.min(group.minX, item.minX),
    minY: Math.min(group.minY, item.minY),
    maxX: Math.max(group.maxX, item.maxX),
    maxY: Math.max(group.maxY, item.maxY),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  return [
    Math.max(-bounds.minX, Math.min(100 - bounds.maxX, deltaX)),
    Math.max(-bounds.minY, Math.min(100 - bounds.maxY, deltaY)),
  ];
}

function getDuplicateTranslation(markers: MapMarker[]): [number, number] {
  const chooseOffset = (min: number, max: number) => {
    const preferredOffset = 6;
    const positiveSpace = Math.max(0, 100 - max);
    const negativeSpace = Math.max(0, min);
    if (positiveSpace >= preferredOffset) return preferredOffset;
    if (negativeSpace >= preferredOffset) return -preferredOffset;
    return positiveSpace >= negativeSpace ? positiveSpace : -negativeSpace;
  };
  const bounds = markers.map(getMarkerBounds).reduce((group, item) => ({
    minX: Math.min(group.minX, item.minX),
    minY: Math.min(group.minY, item.minY),
    maxX: Math.max(group.maxX, item.maxX),
    maxY: Math.max(group.maxY, item.maxY),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  return [chooseOffset(bounds.minX, bounds.maxX), chooseOffset(bounds.minY, bounds.maxY)];
}

function resizeAreaFromCorner(
  marker: MapMarker,
  dragPoint: [number, number],
  corner: ResizeCorner,
): MapMarker | null {
  const points = marker.points;
  if (!points || points.length < 3) return null;
  const bounds = getMarkerBounds(marker);
  const anchors: Record<ResizeCorner, [number, number]> = {
    "north-west": [bounds.maxX, bounds.maxY],
    "north-east": [bounds.minX, bounds.maxY],
    "south-west": [bounds.maxX, bounds.minY],
    "south-east": [bounds.minX, bounds.minY],
  };
  const anchor = anchors[corner];
  const originalCorner: [number, number] = [
    corner.endsWith("west") ? bounds.minX : bounds.maxX,
    corner.startsWith("north") ? bounds.minY : bounds.maxY,
  ];
  const vectorX = originalCorner[0] - anchor[0];
  const vectorY = originalCorner[1] - anchor[1];
  const denominator = vectorX * vectorX + vectorY * vectorY;
  if (denominator <= 0) return null;

  const projectedScale = (
    (dragPoint[0] - anchor[0]) * vectorX +
    (dragPoint[1] - anchor[1]) * vectorY
  ) / denominator;
  let maxScale = Infinity;
  for (const [x, y] of points) {
    const deltaX = x - anchor[0];
    const deltaY = y - anchor[1];
    if (deltaX > 0) maxScale = Math.min(maxScale, (100 - anchor[0]) / deltaX);
    if (deltaX < 0) maxScale = Math.min(maxScale, anchor[0] / -deltaX);
    if (deltaY > 0) maxScale = Math.min(maxScale, (100 - anchor[1]) / deltaY);
    if (deltaY < 0) maxScale = Math.min(maxScale, anchor[1] / -deltaY);
  }

  const scale = Math.min(maxScale, Math.max(0.05, projectedScale));
  const resizedPoints = points.map(([x, y]): [number, number] => [
    anchor[0] + (x - anchor[0]) * scale,
    anchor[1] + (y - anchor[1]) * scale,
  ]);
  return { ...marker, x: resizedPoints[0][0], y: resizedPoints[0][1], points: resizedPoints };
}

type MapCreationDialogProps = {
  open: boolean;
  maps: Map[];
  locations: EntitySummary[];
  initialParentMapId?: string;
  onClose: () => void;
  onCreate: (name: string, template: MapTemplate, parentMapId: string, entityId: string) => Promise<void>;
};

function createTemplateMarkers(template: MapTemplate): MapMarker[] {
  const makeArea = (
    label: string,
    points: [number, number][],
    fillColor: string,
  ): MapMarker => ({
    id: crypto.randomUUID(),
    entity_id: null,
    x: 0,
    y: 0,
    label,
    visible: true,
    dm_only: false,
    hide_label: false,
    type: "area",
    points,
    fill_color: fillColor,
    fill_opacity: 0.48,
  });
  const makePath = (label: string, points: [number, number][]): MapMarker => ({
    id: crypto.randomUUID(),
    entity_id: null,
    x: 0,
    y: 0,
    label,
    visible: true,
    dm_only: false,
    hide_label: false,
    type: "path",
    points,
    fill_color: "#80643f",
    fill_opacity: 0.85,
  });

  if (template === "town") {
    return [
      makeArea("Town center", [[34, 32], [66, 32], [66, 66], [34, 66]], "#c99d52"),
      makeArea("North district", [[20, 12], [80, 12], [80, 29], [20, 29]], "#73916b"),
      makeArea("South district", [[20, 70], [80, 70], [80, 88], [20, 88]], "#8a9ca5"),
      makePath("Main street", [[8, 50], [92, 50]]),
      makePath("Cross street", [[50, 8], [50, 92]]),
    ];
  }

  if (template === "village") {
    return [
      makeArea("Village green", [[39, 38], [61, 38], [61, 62], [39, 62]], "#73916b"),
      makeArea("West homes", [[16, 24], [34, 24], [34, 42], [16, 42]], "#c99d52"),
      makeArea("East homes", [[66, 24], [84, 24], [84, 42], [66, 42]], "#c99d52"),
      makeArea("South farms", [[27, 70], [73, 70], [73, 86], [27, 86]], "#8a9c68"),
      makePath("Main road", [[8, 50], [92, 50]]),
      makePath("South lane", [[50, 62], [50, 94]]),
    ];
  }

  if (template === "building") {
    return [
      makeArea("Main hall", [[12, 20], [62, 20], [62, 78], [12, 78]], "#b68b56"),
      makeArea("East room", [[66, 20], [88, 20], [88, 43], [66, 43]], "#7b9b91"),
      makeArea("Study", [[66, 49], [88, 49], [88, 78], [66, 78]], "#7789a3"),
      makePath("Entrance corridor", [[4, 50], [12, 50], [25, 50], [25, 70]]),
    ];
  }

  if (template === "tavern") {
    return [
      makeArea("Common room", [[12, 18], [66, 18], [66, 82], [12, 82]], "#c99d52"),
      makeArea("Kitchen", [[70, 18], [90, 18], [90, 48], [70, 48]], "#7b9b91"),
      makeArea("Private room", [[70, 54], [90, 54], [90, 82], [70, 82]], "#7789a3"),
      makePath("Entry hall", [[2, 52], [12, 52], [28, 52]]),
    ];
  }

  return [];
}

function createQuickShapeMarker(preset: QuickShapePreset, x: number, y: number): MapMarker {
  const definitions: Record<QuickShapePreset, { label: string; type: "area" | "path"; color: string; radius: number; outline?: [number, number][] }> = {
    room: { label: "New room", type: "area", color: "#7b9b91", radius: 5 },
    building: { label: "New building", type: "area", color: "#c99d52", radius: 10 },
    street: { label: "New street", type: "path", color: "#80643f", radius: 15 },
    corridor: { label: "New corridor", type: "path", color: "#80643f", radius: 10 },
    "building-l": { label: "New L-shaped building", type: "area", color: "#c99d52", radius: 9, outline: [[-1, -1], [1, -1], [1, 0], [0, 0], [0, 1], [-1, 1]] },
    "building-t": { label: "New T-shaped building", type: "area", color: "#c99d52", radius: 9, outline: [[-0.35, -1], [0.35, -1], [0.35, -0.35], [1, -0.35], [1, 0.35], [0.35, 0.35], [0.35, 1], [-0.35, 1], [-0.35, 0.35], [-1, 0.35], [-1, -0.35], [-0.35, -0.35]] },
    "building-u": { label: "New U-shaped building", type: "area", color: "#c99d52", radius: 9, outline: [[-1, -1], [-0.4, -1], [-0.4, 0.4], [0.4, 0.4], [0.4, -1], [1, -1], [1, 1], [-1, 1]] },
  };
  const definition = definitions[preset];
  const clamp = (value: number, padding = 0) => Math.min(100 - padding, Math.max(padding, value));
  const centerX = definition.type === "area" || preset === "street" ? clamp(x, definition.radius) : x;
  const centerY = definition.type === "area" || preset === "corridor" ? clamp(y, definition.radius) : y;
  const points: [number, number][] = definition.type === "area"
    ? (definition.outline ?? [[-1, -1], [1, -1], [1, 1], [-1, 1]]).map(([offsetX, offsetY]) => [centerX + offsetX * definition.radius, centerY + offsetY * definition.radius])
    : preset === "street"
      ? [[centerX - definition.radius, centerY], [centerX + definition.radius, centerY]]
      : [[centerX, centerY - definition.radius], [centerX, centerY + definition.radius]];

  return {
    id: crypto.randomUUID(),
    entity_id: null,
    x: points[0][0],
    y: points[0][1],
    type: definition.type,
    points,
    label: definition.label,
    visible: true,
    dm_only: false,
    hide_label: false,
    fill_color: definition.color,
    fill_opacity: definition.type === "area" ? 0.35 : 0.85,
  };
}

function MapCreationDialog({
  open,
  maps,
  locations,
  initialParentMapId,
  onClose,
  onCreate,
}: MapCreationDialogProps) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<MapTemplate>(initialParentMapId ? "building" : "town");
  const [parentMapId, setParentMapId] = useState(initialParentMapId ?? "");
  const [entityId, setEntityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Enter a name for the map.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), template, parentMapId, entityId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the map.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create a quick map</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus fullWidth label="Map name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField select fullWidth label="Starting layout" value={template} onChange={(event) => setTemplate(event.target.value as MapTemplate)}>
            <MenuItem value="town">Town layout</MenuItem>
            <MenuItem value="village">Village layout</MenuItem>
            <MenuItem value="building">Building layout</MenuItem>
            <MenuItem value="tavern">Tavern interior</MenuItem>
            <MenuItem value="blank">Blank schematic</MenuItem>
          </TextField>
          <TextField select fullWidth label="Parent map (optional)" value={parentMapId} onChange={(event) => setParentMapId(event.target.value)}>
            <MenuItem value="">No parent map</MenuItem>
            {maps.map((map) => <MenuItem key={map.id} value={map.id}>{map.name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Link to a place (optional)" value={entityId} onChange={(event) => setEntityId(event.target.value)}>
            <MenuItem value="">No linked place</MenuItem>
            {locations.map((location) => <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>)}
          </TextField>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            This creates an editable schematic canvas. You can add an image background later.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
          Create map
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type MapViewerProps = {
  map: Map;
  maps: Map[];
  editMode: boolean;
  hasUnsavedChanges: boolean;
  onSaveChanges: () => void;
  onEditModeChange: (enabled: boolean) => void;
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
  shapePlacementPreset: QuickShapePreset | null;
  snapToGrid: boolean;
  snapGridSize: number;
  showGrid: boolean;
  shapeEditActive: boolean;
  mapError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  markerHistoryBusy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectionMode: boolean;
  selectedMarkerIds: string[];
  onSelectionModeChange: (enabled: boolean) => void;
  onToggleMarkerSelection: (markerId: string) => void;
  onClearMarkerSelection: () => void;
  onDuplicateSelectedMarkers: () => void;
  onMarkerEditModeChange: (enabled: boolean) => void;
  onPointPlacementModeChange: (enabled: boolean) => void;
  onShapePresetChange: (preset: QuickShapePreset | null) => void;
  onSelectMode: () => void;
  onStartDrawing: (type: "area" | "path") => void;
  onFinishShapeEdit: () => void;
  onBack: () => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onCreateChildMap: () => void;
  onDeleteMap: (map: Map) => Promise<void>;
  onCanvasSizeChange: (width: number, height: number) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onPlacePointMarker: (x: number, y: number) => void;
  onPlaceQuickShape: (marker: MapMarker, layer: L.Layer) => void;
  onSnapToGridChange: (enabled: boolean) => void;
  onSnapGridSizeChange: (size: number) => void;
  onShowGridChange: (enabled: boolean) => void;
  onAlignSelectedMarkers: (alignment: MarkerAlignment) => void;
  onTransformSelectedMarkers: (transform: "rotate-left" | "rotate-right" | "mirror-horizontal" | "mirror-vertical") => void;
  layerVisibility: MapLayerVisibility;
  onLayerVisibilityChange: (layer: keyof MapLayerVisibility, visible: boolean) => void;
  layerLocks: MapLayerLocks;
  onLayerLockChange: (layer: keyof MapLayerLocks, locked: boolean) => void;
  customLayerVisibility: CustomLayerStates;
  customLayerLocks: CustomLayerStates;
  activeLayerId: string | null;
  onActiveLayerChange: (layerId: string | null) => void;
  onCustomLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onCustomLayerLockChange: (layerId: string, locked: boolean) => void;
  onCreateMapLayer: (name: string) => void;
  onRenameMapLayer: (layerId: string, name: string) => void;
  onMoveMapLayer: (layerId: string, direction: "up" | "down") => void;
  onDeleteMapLayer: (layerId: string) => void;
  onAssignSelectedMarkersToLayer: (layerId: string | null) => void;
  buildingStamps: MapStampAsset[];
  showStampLabelsByDefault: boolean;
  onShowStampLabelsByDefaultChange: (enabled: boolean) => void;
  selectedStampPath: string | null;
  stampUploadBusy: boolean;
  stampUploadError: string | null;
  onUploadBuildingStamp: (file: File) => Promise<void>;
  onStageBuildingStampSize: (stamp: MapStampAsset, size: number) => Promise<void>;
  onSelectBuildingStamp: (stamp: MapStampAsset | null) => void;
  savingMap: boolean;
  onPlaceMapEntity: (entity: EntitySummary) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  onChangeMarkerOrder: (markerId: string, direction: "front" | "back") => void;
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
  onResizeShape: (marker: MapMarker) => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type LeafletMapProps = {
  map: Map;
  maps: Map[];
  editMode: boolean;
  locations: EntitySummary[];
  campaignActivity: MapCampaignActivity[];
  focusedMarkerId: string | null;
  mapExplorerOpen: boolean;
  onCloseMapExplorer: () => void;
  onFocusMarker: (markerId: string) => void;
  markerEditMode: boolean;
  pointPlacementMode: boolean;
  shapePlacementPreset: QuickShapePreset | null;
  snapToGrid: boolean;
  snapGridSize: number;
  showGrid: boolean;
  selectionMode: boolean;
  selectedMarkerIds: string[];
  layerVisibility: MapLayerVisibility;
  layerLocks: MapLayerLocks;
  customLayerVisibility: CustomLayerStates;
  customLayerLocks: CustomLayerStates;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onPlacePointMarker: (x: number, y: number) => void;
  onPlaceQuickShape: (marker: MapMarker, layer: L.Layer) => void;
  onPlaceMapEntity: (entity: EntitySummary) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  onChangeMarkerOrder: (markerId: string, direction: "front" | "back") => void;
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
  onResizeShape: (marker: MapMarker) => void;
  onToggleMarkerSelection: (markerId: string) => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapContextMenuProps = {
  imageWidth: number;
  imageHeight: number;
  editingEnabled: boolean;
  pointPlacementMode: boolean;
  shapePlacementPreset: QuickShapePreset | null;
  snapToGrid: boolean;
  snapGridSize: number;
  onPlacePointMarker: (x: number, y: number) => void;
  onPlaceQuickShape: (marker: MapMarker, layer: L.Layer) => void;
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
  editMode: boolean;
  layerLocks: MapLayerLocks;
  customLayerLocks: CustomLayerStates;
  snapToGrid: boolean;
  snapGridSize: number;
  shapeEditId: string | null;
  drawShape: "area" | "path" | null;
  onDrawShapeHandled: () => void;
  onShapeCreated: (marker: MapMarker, layer: L.Layer) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapMarkersProps = {
  map: Map;
  editMode: boolean;
  campaignActivity: MapCampaignActivity[];
  focusedMarkerId: string | null;
  markerEditMode: boolean;
  imageWidth: number;
  imageHeight: number;
  snapToGrid: boolean;
  snapGridSize: number;
  selectionMode: boolean;
  selectedMarkerIds: string[];
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
  onResizeShape: (marker: MapMarker) => void;
  onToggleMarkerSelection: (markerId: string) => void;
  layerVisibility: MapLayerVisibility;
  layerLocks: MapLayerLocks;
  customLayerVisibility: CustomLayerStates;
  customLayerLocks: CustomLayerStates;
};

type CampaignMarkerProps = {
  marker: MapMarker;
  pane: string;
  editMode: boolean;
  locked: boolean;
  campaignActivity: MapCampaignActivity[];
  highlighted: boolean;
  markerEditMode: boolean;
  imageWidth: number;
  imageHeight: number;
  snapToGrid: boolean;
  snapGridSize: number;
  selectionMode: boolean;
  selected: boolean;
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
  onMarkerDragStart: (markerId: string) => void;
  onMarkerDrag: (markerId: string, x: number, y: number) => void;
  onMarkerDragEnd: (markerId: string) => void;
  onToggleMarkerSelection: (markerId: string) => void;
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
  layers: MapLayer[];
  editMode: boolean;
  maps: Map[];
  locations: EntitySummary[];
  getEntity: (entityId: string) => EntitySummary | undefined;
  focusedMarkerId: string | null;
  onFocusMarker: (markerId: string) => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onOpenMarkerEditor: (markerId: string) => void;
  onChangeMarkerOrder: (markerId: string, direction: "front" | "back") => void;
  onPlaceEntity: (entity: EntitySummary) => void;
  onClose: () => void;
};

function MapExplorer({
  markers,
  layers,
  editMode,
  maps,
  locations,
  getEntity,
  focusedMarkerId,
  onFocusMarker,
  onOpenEntity,
  onOpenMap,
  onOpenMarkerEditor,
  onChangeMarkerOrder,
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
            marker.layer_id ? layers.find((layer) => layer.id === marker.layer_id)?.name : "Unassigned",
            marker.dm_only ? "DM only" : null,
            marker.visible ? null : "Hidden",
          ].filter(Boolean).join(" · ");

          return (
            <Stack key={marker.id} direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
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
              {editMode && <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                <Tooltip title="Bring to front within this layer">
                  <IconButton
                    size="small"
                    aria-label={`Bring ${title} to front within its layer`}
                    onClick={() => onChangeMarkerOrder(marker.id, "front")}
                    sx={{ p: 0.35 }}
                  >
                    <VerticalAlignTopIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Send to back within this layer">
                  <IconButton
                    size="small"
                    aria-label={`Send ${title} to back within its layer`}
                    onClick={() => onChangeMarkerOrder(marker.id, "back")}
                    sx={{ p: 0.35 }}
                  >
                    <VerticalAlignBottomIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Stack>}
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
  pmIgnore?: boolean;
};

type OrderedShapeLayer = L.Polygon | L.Polyline;

function getMapLayerMarkerId(layer: L.Layer): string | undefined {
  return (layer.options as MapLayerOptions | undefined)?.markerId;
}

function setMapLayerMarkerId(layer: L.Layer, markerId: string) {
  (layer.options as MapLayerOptions).markerId = markerId;
}

function setMapLayerLocked(layer: L.Layer, locked: boolean) {
  (layer.options as MapLayerOptions).pmIgnore = locked;
  const geomanLayer = layer as L.Layer & {
    pm?: { setOptions: (options: { allowEditing: boolean }) => void; disable: () => void };
  };
  geomanLayer.pm?.setOptions({ allowEditing: !locked });
  if (locked) geomanLayer.pm?.disable();
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

function mapStampImageUrl(imagePath: string) {
  return imagePath.startsWith("http://") || imagePath.startsWith("https://")
    ? imagePath
    : `http://localhost:8000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function markerIcon(
  icon?: string,
  highlighted = false,
  imagePath?: string,
  imageSize = 72,
  rotation = 0,
  mirrorX = false,
  mirrorY = false,
) {
  if (imagePath) {
    const size = Math.max(1, Math.min(8192, imageSize));
    const src = mapStampImageUrl(imagePath)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;");
    return L.divIcon({
      className: "campaign-map-marker campaign-map-stamp",
      html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${highlighted ? "filter:drop-shadow(0 0 5px #64b5f6);" : "filter:drop-shadow(0 2px 3px rgba(0,0,0,.65));"}"><img src="${src}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;transform:rotate(${rotation}deg) scale(${mirrorX ? -1 : 1},${mirrorY ? -1 : 1})" /></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

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

function shapeResizeHandleIcon() {
  return L.divIcon({
    className: "map-shape-resize-handle",
    html: '<div title="Drag to resize proportionally" style="width:18px;height:18px;border:2px solid #fff;border-radius:4px;background:#c9a85b;box-shadow:0 1px 5px rgba(0,0,0,.7);cursor:nwse-resize"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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
  snapToGrid = false,
  snapGridSize = 5,
): [number, number] {
  const snap = (value: number) => snapToGrid ? Math.round(value / snapGridSize) * snapGridSize : value;
  return [snap((longitude / imageWidth) * 100), snap((-latitude / imageHeight) * 100)];
}

function useImageDimensions(imageUrl: string | undefined) {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

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
  return <ImageOverlay url={imageUrl} bounds={bounds} zIndex={1} pmIgnore />;
}

function getMapView(map: L.Map, imageWidth: number, imageHeight: number) {
  const viewportWidth = map.getContainer().clientWidth;
  const viewportHeight = map.getContainer().clientHeight;

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const zoom = Math.log2(Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight));

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
  snapToGrid = false,
  snapGridSize = 5,
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
      leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight, snapToGrid, snapGridSize),
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
      leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight, snapToGrid, snapGridSize),
    );
  }

  return null;
}

function MapsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedMapId = searchParams.get("map");
  const [mapCreation, setMapCreation] = useState<{ open: boolean; parentMapId?: string }>({ open: false });
  const [mapFilters, setMapFilters] = useState<Record<string, string>>({});
  const [activityLayerEnabled, setActivityLayerEnabled] = useState(false);
  const [selectedWorldStoryId, setSelectedWorldStoryId] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [mapEditMode, setMapEditMode] = useState(false);
  const [mapDraft, setMapDraft] = useState<Map | null>(null);
  const [mapDraftDirty, setMapDraftDirty] = useState(false);
  const [mapDraftSaving, setMapDraftSaving] = useState(false);
  const [buildingStamps, setBuildingStamps] = useState<MapStampAsset[]>([]);
  const [selectedBuildingStamp, setSelectedBuildingStamp] = useState<MapStampAsset | null>(null);
  const [showStampLabelsByDefault, setShowStampLabelsByDefault] = useState(() => {
    try {
      return window.localStorage.getItem("world-builder-map-stamp-labels") === "true";
    } catch {
      return false;
    }
  });
  const [stampUploadBusy, setStampUploadBusy] = useState(false);
  const [stampUploadError, setStampUploadError] = useState<string | null>(null);
  const [layerVisibilityByMap, setLayerVisibilityByMap] = useState<globalThis.Map<string, MapLayerVisibility>>(() => new globalThis.Map());
  const [layerLocksByMap, setLayerLocksByMap] = useState<globalThis.Map<string, MapLayerLocks>>(() => new globalThis.Map());
  const [customLayerVisibilityByMap, setCustomLayerVisibilityByMap] = useState<globalThis.Map<string, CustomLayerStates>>(() => new globalThis.Map());
  const [customLayerLocksByMap, setCustomLayerLocksByMap] = useState<globalThis.Map<string, CustomLayerStates>>(() => new globalThis.Map());
  const [activeLayerByMap, setActiveLayerByMap] = useState<globalThis.Map<string, string | null>>(() => new globalThis.Map());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>([]);
  const [markerEditMode, setMarkerEditMode] = useState(false);
  const [pointPlacementMode, setPointPlacementMode] = useState(false);
  const [shapePlacementPreset, setShapePlacementPreset] = useState<QuickShapePreset | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapGridSize, setSnapGridSize] = useState(5);
  const [showGrid, setShowGrid] = useState(false);
  const [pendingMapEntitySelection, setPendingMapEntitySelection] = useState<EntitySummary | null>(null);
  const [shapeEditId, setShapeEditId] = useState<string | null>(null);
  const [drawShape, setDrawShape] = useState<"area" | "path" | null>(null);
  const [shapeDraft, setShapeDraft] = useState<MapMarker | null>(null);
  const [draftShapeLayer, setDraftShapeLayer] = useState<L.Layer | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapDraftRef = useRef<Map | null>(null);
  const mapBaselineRef = useRef<Map | null>(null);
  const pendingStampSizesRef = useRef(new globalThis.Map<string, PendingStampSize>());
  const markerHistoryRef = useRef(new Map<string, MarkerHistoryState>());
  const markerHistoryActionInProgress = useRef(false);
  const [markerHistoryByMap, setMarkerHistoryByMap] = useState<globalThis.Map<string, MarkerHistoryState>>(() => new globalThis.Map());
  const [markerHistoryActionBusy, setMarkerHistoryActionBusy] = useState(false);

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
    updateEntity,
    deleteEntity,
    createEntity,
    worldData,
    worldDataLoading,
    entitiesError,
  } = useWorldData();

  useEffect(() => {
    let active = true;
    void fetch("http://localhost:8000/map-assets")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load building images (${response.status}).`);
        const result = await response.json() as { assets: MapStampAsset[] };
        if (active) {
          const stagedStamps = new globalThis.Map<string, MapStampAsset>(
            [...pendingStampSizesRef.current.values()].map((pendingSize): [string, MapStampAsset] => [pendingSize.stamp.image_path, pendingSize.stamp]),
          );
          setBuildingStamps(result.assets.map((stamp) => stagedStamps.get(stamp.image_path) ?? stamp));
        }
      })
      .catch((error: unknown) => {
        if (active) setStampUploadError(error instanceof Error ? error.message : "Could not load building images.");
      });
    return () => { active = false; };
  }, []);

  const handleUploadBuildingStamp = async (file: File) => {
    setStampUploadError(null);
    if (file.type !== "image/png") {
      setStampUploadError("Choose a PNG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStampUploadError("PNG files must be 5 MB or smaller.");
      return;
    }

    setStampUploadBusy(true);
    try {
      const response = await fetch(`http://localhost:8000/map-assets?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: file,
      });
      const result = await response.json() as MapStampAsset & { detail?: string };
      if (!response.ok) throw new Error(result.detail ?? `Could not upload PNG (${response.status}).`);
      const uploadedStamp = { name: result.name, image_path: result.image_path, default_size: result.default_size };
      setBuildingStamps((current) => [...current, uploadedStamp]);
      setSelectedBuildingStamp(uploadedStamp);
      setStampUploadError(null);
      setPointPlacementMode(true);
      setShapePlacementPreset(null);
      setMarkerEditMode(false);
      setSelectionMode(false);
      setSelectedMarkerIds([]);
      clearPendingMapEntity();
    } catch (error) {
      setStampUploadError(error instanceof Error ? error.message : "Could not upload this PNG.");
    } finally {
      setStampUploadBusy(false);
    }
  };

  const handleStageBuildingStampSize = (stamp: MapStampAsset, size: number): Promise<void> => {
    setStampUploadError(null);
    const filename = stamp.image_path.split("/").pop();
    if (!filename) throw new Error("Could not identify this building stamp.");
    const previous = pendingStampSizesRef.current.get(filename);
    const originalSize = previous?.originalSize ?? stamp.default_size;
    const updatedStamp = { ...stamp, default_size: size };
    if (size === originalSize) {
      pendingStampSizesRef.current.delete(filename);
    } else {
      pendingStampSizesRef.current.set(filename, { stamp: updatedStamp, size, originalSize });
    }
    setBuildingStamps((current) => current.map((asset) => asset.image_path === stamp.image_path ? updatedStamp : asset));
    setSelectedBuildingStamp((current) => current?.image_path === stamp.image_path ? updatedStamp : current);
    const draft = mapDraftRef.current;
    const baseline = mapBaselineRef.current;
    setMapDraftDirty(pendingStampSizesRef.current.size > 0 || Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline)));
    if (draft) storeMapEditorDraft(draft, pendingStampSizesRef.current);
    return Promise.resolve();
  };

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  const getEntity = useCallback(
    (entityId: string) => entities.find((entity) => entity.id === entityId),
    [entities],
  );

  const activitySummaries = useMemo(
    () => entities.filter((entity) => ["campaign", "world_story", "world_event", "timeline_event"].includes(entity.entity_type)),
    [entities],
  );
  const placeableLocations = useMemo(
    () => entities.filter((entity) => isPlaceEntityType(entity.entity_type)),
    [entities],
  );

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

  const maps = sortEntitiesByName(worldData?.maps ?? []);
  const mapSearch = mapFilters.search?.trim().toLowerCase() ?? "";
  const filteredMaps = maps.filter((map) =>
    (!mapSearch || map.name.toLowerCase().includes(mapSearch))
    && matchesEntityTag(map, mapFilters.tag),
  );

  const hasPendingEditorChanges = () => {
    const draft = mapDraftRef.current;
    const baseline = mapBaselineRef.current;
    return pendingStampSizesRef.current.size > 0
      || Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline));
  };

  const beginMapEdit = (map: Map) => {
    const storedDraft = readStoredMapEditorDraft(map.id);
    const snapshot = copyMapForEditing(storedDraft?.map ?? map);
    mapDraftRef.current = snapshot;
    mapBaselineRef.current = copyMapForEditing(map);
    pendingStampSizesRef.current.clear();
    for (const [filename, pendingSize] of storedDraft?.stampSizes ?? []) {
      if (typeof filename === "string" && Number.isInteger(pendingSize?.size) && Number.isInteger(pendingSize?.originalSize)) {
        pendingStampSizesRef.current.set(filename, pendingSize);
      }
    }
    if (pendingStampSizesRef.current.size > 0) {
      const stagedStamps = new globalThis.Map<string, MapStampAsset>(
        [...pendingStampSizesRef.current.values()].map((pendingSize): [string, MapStampAsset] => [pendingSize.stamp.image_path, pendingSize.stamp]),
      );
      setBuildingStamps((current) => current.map((stamp) => stagedStamps.get(stamp.image_path) ?? stamp));
    }
    setMapDraft(snapshot);
    setMapDraftDirty(JSON.stringify(snapshot) !== JSON.stringify(map) || pendingStampSizesRef.current.size > 0);
    setMapError(null);
    setMapEditMode(true);
    setShowGrid(true);
  };

  const handleCreateMap = async (name: string, template: MapTemplate, parentMapId: string, entityId: string) => {
    const typeLabels: Record<MapTemplate, string> = {
      blank: "Schematic",
      village: "Village schematic",
      town: "Town schematic",
      building: "Building schematic",
      tavern: "Tavern interior",
    };
    const created = await createEntity("map", {
      name,
      map_type: typeLabels[template],
      parent_map: parentMapId || undefined,
      entity_id: entityId || undefined,
      description: template === "blank" ? "An image-free schematic map." : `An editable ${template} map layout.`,
      markers: createTemplateMarkers(template),
    });
    setMapCreation({ open: false });
    openMap(created.id);
  };

  const openMap = async (mapId: string, entityId?: string, placeEntity = false) => {
    if (hasPendingEditorChanges() && !(await saveMapDraft())) return;
    const targetMap = maps.find((map) => map.id === mapId);
    if (placeEntity && targetMap) {
      if (mapDraftRef.current?.id !== mapId || !mapDraftDirty) beginMapEdit(targetMap);
    } else {
      setMapEditMode(false);
      setMapDraft(null);
      if (mapDraftRef.current) clearStoredMapEditorDraft(mapDraftRef.current.id);
      mapDraftRef.current = null;
      mapBaselineRef.current = null;
      setMapDraftDirty(false);
      pendingStampSizesRef.current.clear();
    }
    setSelectionMode(false);
    setSelectedMarkerIds([]);
    setMarkerEditMode(false);
    setPointPlacementMode(false);
    setShapePlacementPreset(null);
    setDrawShape(null);
    setShapeEditId(null);
    setSearchParams({
      map: mapId,
      ...(entityId ? { [placeEntity ? "placeEntity" : "focusEntity"]: entityId } : {}),
      ...(searchParams.get("from") === "world-map"
        ? { from: "world-map" }
        : {}),
    });
  };

  const selectedMap = maps.find((map) => map.id === selectedMapId);
  const handleDeleteMap = async (map: Map) => {
    await deleteEntity(map.id);
    clearStoredMapEditorDraft(map.id);
    if (mapDraftRef.current?.id === map.id) {
      mapDraftRef.current = null;
      mapBaselineRef.current = null;
      pendingStampSizesRef.current.clear();
      setMapDraft(null);
      setMapDraftDirty(false);
      setMapEditMode(false);
      setSelectionMode(false);
      setSelectedMarkerIds([]);
      draftShapeLayer?.remove();
      setDraftShapeLayer(null);
      setShapeDraft(null);
      setMapError(null);
      setMarkerDrawer({ open: false, mode: "create", marker: null });
    }
    if (selectedMapId === map.id) {
      if (searchParams.get("from") === "world-map") navigate("/world-map");
      else setSearchParams({});
    }
  };
  const stageMapDraft = useCallback((nextMap: Map) => {
    const snapshot = copyMapForEditing(nextMap);
    mapDraftRef.current = snapshot;
    setMapDraft(snapshot);
    setMapDraftDirty(JSON.stringify(snapshot) !== JSON.stringify(mapBaselineRef.current) || pendingStampSizesRef.current.size > 0);
    storeMapEditorDraft(snapshot, pendingStampSizesRef.current);
  }, []);
  const editableMap = selectedMap && mapDraft?.id === selectedMap.id ? mapDraft : selectedMap;

  const saveMapDraft = async (): Promise<boolean> => {
    if (mapDraftSaving) return false;
    if (!hasPendingEditorChanges()) {
      setMapDraftDirty(false);
      return true;
    }

    setMapDraftSaving(true);
    try {
      while (hasPendingEditorChanges()) {
        const draft = mapDraftRef.current;
        const baseline = mapBaselineRef.current;
        if (draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline)) {
          await updateEntity(draft.id, { ...draft });
          mapBaselineRef.current = copyMapForEditing(draft);
          continue;
        }

        const pendingEntry = pendingStampSizesRef.current.entries().next().value as [string, { stamp: MapStampAsset; size: number; originalSize: number }] | undefined;
        if (!pendingEntry) break;
        const [filename, pendingSize] = pendingEntry;
        const response = await fetch(`http://localhost:8000/map-assets/${encodeURIComponent(filename)}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ default_size: pendingSize.size }),
        });
        const result = await response.json() as { default_size: number; detail?: string };
        if (!response.ok) throw new Error(result.detail ?? `Could not save ${pendingSize.stamp.name} stamp size.`);
        if (pendingStampSizesRef.current.get(filename) === pendingSize) {
          pendingStampSizesRef.current.delete(filename);
          const updatedStamp = { ...pendingSize.stamp, default_size: result.default_size };
          setBuildingStamps((current) => current.map((stamp) => stamp.image_path === updatedStamp.image_path ? updatedStamp : stamp));
          setSelectedBuildingStamp((current) => current?.image_path === updatedStamp.image_path ? updatedStamp : current);
        }
      }

      if (mapDraftRef.current) stageMapDraft(mapDraftRef.current);
      setMapDraftDirty(hasPendingEditorChanges());
      if (mapDraftRef.current) clearStoredMapEditorDraft(mapDraftRef.current.id);
      setMapError(null);
      return true;
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Could not save map changes.");
      return false;
    } finally {
      setMapDraftSaving(false);
    }
  };

  const exitMapEditMode = async (): Promise<boolean> => {
    if (!(await saveMapDraft())) return false;
    setMapEditMode(false);
    setMapDraft(null);
    if (mapDraftRef.current) clearStoredMapEditorDraft(mapDraftRef.current.id);
    mapDraftRef.current = null;
    mapBaselineRef.current = null;
    pendingStampSizesRef.current.clear();
    setMapDraftDirty(false);
    setSelectionMode(false);
    setSelectedMarkerIds([]);
    setMarkerEditMode(false);
    setPointPlacementMode(false);
    setSelectedBuildingStamp(null);
    setShapePlacementPreset(null);
    setDrawShape(null);
    setShapeEditId(null);
    setSnapToGrid(false);
    setShowGrid(false);
    setMarkerContextMenu(null);
    clearPendingMapEntity();
    return true;
  };

  const handleMapEditModeChange = (enabled: boolean) => {
    if (enabled) {
      if (selectedMap) beginMapEdit(selectedMap);
      return;
    }
    void exitMapEditMode();
  };

  const layerVisibility = selectedMap
    ? layerVisibilityByMap.get(selectedMap.id) ?? DEFAULT_MAP_LAYER_VISIBILITY
    : DEFAULT_MAP_LAYER_VISIBILITY;
  const handleLayerVisibilityChange = (layer: keyof MapLayerVisibility, visible: boolean) => {
    if (!selectedMap) return;
    setLayerVisibilityByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(selectedMap.id, {
        ...(current.get(selectedMap.id) ?? DEFAULT_MAP_LAYER_VISIBILITY),
        [layer]: visible,
      });
      return next;
    });
  };
  const layerLocks = selectedMap
    ? layerLocksByMap.get(selectedMap.id) ?? DEFAULT_MAP_LAYER_LOCKS
    : DEFAULT_MAP_LAYER_LOCKS;
  const customLayerVisibility = Object.fromEntries(
    (editableMap?.layers ?? []).map((layer) => [layer.id, customLayerVisibilityByMap.get(selectedMap?.id ?? "")?.[layer.id] ?? true]),
  ) as CustomLayerStates;
  const customLayerLocks = Object.fromEntries(
    (editableMap?.layers ?? []).map((layer) => [layer.id, customLayerLocksByMap.get(selectedMap?.id ?? "")?.[layer.id] ?? false]),
  ) as CustomLayerStates;
  const storedActiveLayerId = selectedMap ? activeLayerByMap.get(selectedMap.id) ?? null : null;
  const storedActiveLayer = editableMap?.layers?.find((layer) => layer.id === storedActiveLayerId);
  const activeLayerId = storedActiveLayer
    && customLayerVisibility[storedActiveLayer.id]
    && !customLayerLocks[storedActiveLayer.id]
    ? storedActiveLayer.id
    : null;
  const handleActiveLayerChange = (layerId: string | null) => {
    if (!selectedMap) return;
    const layer = (editableMap?.layers ?? []).find((candidate) => candidate.id === layerId);
    setActiveLayerByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(selectedMap.id, layer && customLayerVisibility[layer.id] && !customLayerLocks[layer.id] ? layer.id : null);
      return next;
    });
  };
  const handleLayerLockChange = (layer: keyof MapLayerLocks, locked: boolean) => {
    if (!selectedMap) return;
    setLayerLocksByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(selectedMap.id, {
        ...(current.get(selectedMap.id) ?? DEFAULT_MAP_LAYER_LOCKS),
        [layer]: locked,
      });
      return next;
    });
    if (locked) {
      const currentMap = mapDraftRef.current?.id === selectedMap.id ? mapDraftRef.current : selectedMap;
      const lockedMarkerIds = new Set(currentMap.markers.filter((marker) => mapLayerKeyForMarker(marker) === layer).map((marker) => marker.id));
      setSelectedMarkerIds((current) => current.filter((id) => !lockedMarkerIds.has(id)));
      setMarkerDrawer((current) => current.marker && lockedMarkerIds.has(current.marker.id) ? { ...current, open: false } : current);
      setMarkerContextMenu((current) => current?.markerId && lockedMarkerIds.has(current.markerId) ? null : current);
      if (shapeEditId && lockedMarkerIds.has(shapeEditId)) setShapeEditId(null);
    }
  };
  const handleCustomLayerVisibilityChange = (layerId: string, visible: boolean) => {
    if (!selectedMap) return;
    setCustomLayerVisibilityByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(selectedMap.id, { ...(current.get(selectedMap.id) ?? {}), [layerId]: visible });
      return next;
    });
    if (!visible && activeLayerByMap.get(selectedMap.id) === layerId) {
      setActiveLayerByMap((current) => {
        const next = new globalThis.Map(current);
        next.set(selectedMap.id, null);
        return next;
      });
    }
    if (!visible) {
      const currentMap = mapDraftRef.current?.id === selectedMap.id ? mapDraftRef.current : selectedMap;
      const hiddenIds = new Set(currentMap.markers.filter((marker) => marker.layer_id === layerId).map((marker) => marker.id));
      setSelectedMarkerIds((current) => current.filter((id) => !hiddenIds.has(id)));
      if (shapeEditId && hiddenIds.has(shapeEditId)) setShapeEditId(null);
    }
  };
  const handleCustomLayerLockChange = (layerId: string, locked: boolean) => {
    if (!selectedMap) return;
    setCustomLayerLocksByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(selectedMap.id, { ...(current.get(selectedMap.id) ?? {}), [layerId]: locked });
      return next;
    });
    if (locked && activeLayerByMap.get(selectedMap.id) === layerId) {
      setActiveLayerByMap((current) => {
        const next = new globalThis.Map(current);
        next.set(selectedMap.id, null);
        return next;
      });
    }
    if (locked) {
      const currentMap = mapDraftRef.current?.id === selectedMap.id ? mapDraftRef.current : selectedMap;
      const lockedIds = new Set(currentMap.markers.filter((marker) => marker.layer_id === layerId).map((marker) => marker.id));
      setSelectedMarkerIds((current) => current.filter((id) => !lockedIds.has(id)));
      setMarkerDrawer((current) => current.marker && lockedIds.has(current.marker.id) ? { ...current, open: false } : current);
      setMarkerContextMenu((current) => current?.markerId && lockedIds.has(current.markerId) ? null : current);
      if (shapeEditId && lockedIds.has(shapeEditId)) setShapeEditId(null);
    }
  };
  const handleCreateMapLayer = (name: string) => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if ((currentMap.layers ?? []).some((layer) => layer.name.toLowerCase() === trimmedName.toLowerCase())) {
      setMapError(`A map layer named “${trimmedName}” already exists.`);
      return;
    }
    const layer = { id: crypto.randomUUID(), name: trimmedName };
    const nextMap = { ...currentMap, layers: [layer, ...(currentMap.layers ?? [])] };
    recordMapEdit(currentMap.id, currentMap, nextMap);
    stageMapDraft(nextMap);
    setActiveLayerByMap((current) => new globalThis.Map(current).set(currentMap.id, layer.id));
    setMapError(null);
  };
  const handleRenameMapLayer = (layerId: string, name: string) => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if ((currentMap.layers ?? []).some((layer) => layer.id !== layerId && layer.name.toLowerCase() === trimmedName.toLowerCase())) {
      setMapError(`A map layer named “${trimmedName}” already exists.`);
      return;
    }
    const nextMap = {
      ...currentMap,
      layers: (currentMap.layers ?? []).map((layer) => layer.id === layerId ? { ...layer, name: trimmedName } : layer),
    };
    recordMapEdit(currentMap.id, currentMap, nextMap);
    stageMapDraft(nextMap);
    setMapError(null);
  };
  const handleMoveMapLayer = (layerId: string, direction: "up" | "down") => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap) return;
    const layers = [...(currentMap.layers ?? [])];
    const index = layers.findIndex((layer) => layer.id === layerId);
    const nextIndex = index + (direction === "up" ? -1 : 1);
    if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) return;
    [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
    const nextMap = { ...currentMap, layers };
    recordMapEdit(currentMap.id, currentMap, nextMap);
    stageMapDraft(nextMap);
  };
  const handleDeleteMapLayer = (layerId: string) => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap) return;
    const markers = currentMap.markers.map((marker) => marker.layer_id === layerId ? { ...marker, layer_id: null } : marker);
    const nextMap = {
      ...currentMap,
      layers: (currentMap.layers ?? []).filter((layer) => layer.id !== layerId),
      markers,
    };
    recordMapEdit(currentMap.id, currentMap, nextMap);
    stageMapDraft(nextMap);
    if (activeLayerByMap.get(currentMap.id) === layerId) {
      setActiveLayerByMap((current) => new globalThis.Map(current).set(currentMap.id, null));
    }
    setCustomLayerVisibilityByMap((current) => {
      const next = new globalThis.Map(current);
      const state = { ...(next.get(currentMap.id) ?? {}) };
      delete state[layerId];
      next.set(currentMap.id, state);
      return next;
    });
    setCustomLayerLocksByMap((current) => {
      const next = new globalThis.Map(current);
      const state = { ...(next.get(currentMap.id) ?? {}) };
      delete state[layerId];
      next.set(currentMap.id, state);
      return next;
    });
  };
  const handleAssignSelectedMarkersToLayer = (layerId: string | null) => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap || selectedMarkerIds.length === 0) return;
    const before = copyMarkers(currentMap.markers);
    const selectedIds = new Set(selectedMarkerIds);
    const markers = before.map((marker) => selectedIds.has(marker.id) ? { ...marker, layer_id: layerId } : marker);
    if (JSON.stringify(before) === JSON.stringify(markers)) return;
    recordMarkerChange(currentMap.id, before, markers);
    stageMapDraft({ ...currentMap, markers });
  };
  const handleCanvasSizeChange = (width: number, height: number) => {
    if (!editableMap || editableMap.image_path) return;
    const previousWidth = editableMap.canvas_width ?? 1000;
    const previousHeight = editableMap.canvas_height ?? 700;
    if (width === previousWidth && height === previousHeight) return;
    const scaleX = previousWidth / width;
    const scaleY = previousHeight / height;
    const resizedMarkers = editableMap.markers.map((marker) => ({
      ...marker,
      x: marker.x * scaleX,
      y: marker.y * scaleY,
      points: marker.points?.map(([x, y]): [number, number] => [x * scaleX, y * scaleY]),
    }));
    const outOfBounds = resizedMarkers.some((marker) =>
      marker.x > 100 || marker.y > 100 || marker.points?.some(([x, y]) => x > 100 || y > 100),
    );
    if (outOfBounds) {
      setMapError("That canvas size would cut off map items. Move them inward or choose a larger canvas.");
      return;
    }
    setMapError(null);
    stageMapDraft({ ...editableMap, canvas_width: width, canvas_height: height, markers: resizedMarkers });
  };
  const routePlaceEntityId = searchParams.get("placeEntity");
  const pendingMapEntity = pendingMapEntitySelection
    ?? entities.find((entity) => entity.id === routePlaceEntityId)
    ?? null;
  const isPointPlacementActive = pointPlacementMode || Boolean(selectedMap && pendingMapEntity);

  const getMarkerHistory = useCallback((mapId: string) => {
    let history = markerHistoryRef.current.get(mapId);
    if (!history) {
      history = { undo: [], redo: [] };
      markerHistoryRef.current.set(mapId, history);
    }
    return history;
  }, []);

  const publishMarkerHistory = useCallback((mapId: string, history: MarkerHistoryState) => {
    setMarkerHistoryByMap((current) => {
      const next = new globalThis.Map(current);
      next.set(mapId, {
        undo: history.undo.map(copyMapEditSnapshot),
        redo: history.redo.map(copyMapEditSnapshot),
      });
      return next;
    });
  }, []);

  const recordMapEdit = useCallback((mapId: string, before: Pick<Map, "markers" | "layers">, after: Pick<Map, "markers" | "layers">) => {
    const beforeSnapshot = copyMapEditSnapshot({ markers: before.markers, layers: before.layers });
    const afterSnapshot = copyMapEditSnapshot({ markers: after.markers, layers: after.layers });
    if (JSON.stringify(beforeSnapshot) === JSON.stringify(afterSnapshot)) return;
    const history = getMarkerHistory(mapId);
    history.undo.push(beforeSnapshot);
    if (history.undo.length > 100) history.undo.shift();
    history.redo = [];
    publishMarkerHistory(mapId, history);
  }, [getMarkerHistory, publishMarkerHistory]);

  const recordMarkerChange = useCallback((mapId: string, before: MapMarker[], after: MapMarker[]) => {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const currentMap = mapDraftRef.current?.id === mapId
      ? mapDraftRef.current
      : selectedMap?.id === mapId ? selectedMap : null;
    const layers = currentMap?.layers;
    recordMapEdit(mapId, { markers: before, layers }, { markers: after, layers });
  }, [recordMapEdit, selectedMap]);

  const queueMarkerSave = useCallback((
    map: Map,
    markers: MapMarker[],
    trackHistory = true,
    onPersisted?: () => void,
  ) => {
    const currentMap = mapDraftRef.current?.id === map.id ? mapDraftRef.current : map;
    const markerSnapshot = copyMarkers(markers);
    const nextMap = { ...currentMap, markers: markerSnapshot };
    if (JSON.stringify(currentMap.markers) !== JSON.stringify(markerSnapshot)) {
      stageMapDraft(nextMap);
      if (trackHistory) recordMapEdit(map.id, currentMap, nextMap);
    }
    onPersisted?.();
    setMapError(null);
    return Promise.resolve();
  }, [recordMapEdit, stageMapDraft]);

  const latestMarkersFor = useCallback((map: Map) =>
    copyMarkers(mapDraftRef.current?.id === map.id ? mapDraftRef.current.markers : map.markers), []);

  const undoMapEdit = useCallback(async () => {
    if (!selectedMap || markerHistoryActionInProgress.current) return;
    const history = getMarkerHistory(selectedMap.id);
    const previous = history.undo[history.undo.length - 1];
    if (!previous) return;

    markerHistoryActionInProgress.current = true;
    setMarkerHistoryActionBusy(true);
    const current = mapDraftRef.current?.id === selectedMap.id ? mapDraftRef.current : selectedMap;
    try {
      const restoredMap = { ...current, markers: copyMarkers(previous.markers), ...(previous.layers ? { layers: previous.layers.map((layer) => ({ ...layer })) } : { layers: undefined }) };
      stageMapDraft(restoredMap);
      history.undo.pop();
      history.redo.push(copyMapEditSnapshot({ markers: current.markers, layers: current.layers }));
      publishMarkerHistory(selectedMap.id, history);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Could not undo the map change.");
    } finally {
      markerHistoryActionInProgress.current = false;
      setMarkerHistoryActionBusy(false);
    }
  }, [getMarkerHistory, publishMarkerHistory, selectedMap, stageMapDraft]);

  const redoMapEdit = useCallback(async () => {
    if (!selectedMap || markerHistoryActionInProgress.current) return;
    const history = getMarkerHistory(selectedMap.id);
    const next = history.redo[history.redo.length - 1];
    if (!next) return;

    markerHistoryActionInProgress.current = true;
    setMarkerHistoryActionBusy(true);
    const current = mapDraftRef.current?.id === selectedMap.id ? mapDraftRef.current : selectedMap;
    try {
      const restoredMap = { ...current, markers: copyMarkers(next.markers), ...(next.layers ? { layers: next.layers.map((layer) => ({ ...layer })) } : { layers: undefined }) };
      stageMapDraft(restoredMap);
      history.redo.pop();
      history.undo.push(copyMapEditSnapshot({ markers: current.markers, layers: current.layers }));
      publishMarkerHistory(selectedMap.id, history);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Could not redo the map change.");
    } finally {
      markerHistoryActionInProgress.current = false;
      setMarkerHistoryActionBusy(false);
    }
  }, [getMarkerHistory, publishMarkerHistory, selectedMap, stageMapDraft]);

  const selectedMapHistory = selectedMap ? markerHistoryByMap.get(selectedMap.id) : undefined;
  const canUndoMapEdit = Boolean(selectedMapHistory?.undo.length);
  const canRedoMapEdit = Boolean(selectedMapHistory?.redo.length);
  const markerHistoryBusy = mapDraftSaving || markerHistoryActionBusy;

  useEffect(() => {
    if (!mapEditMode) return;
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu']")) return;
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) void redoMapEdit();
        else void undoMapEdit();
      } else if (key === "y") {
        event.preventDefault();
        void redoMapEdit();
      }
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [mapEditMode, redoMapEdit, undoMapEdit]);

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

  const handleBack = async () => {
    if (mapEditMode && !(await exitMapEditMode())) return;
    setMarkerEditMode(false);
    setPointPlacementMode(false);
    setShapePlacementPreset(null);
    setDrawShape(null);
    setShapeEditId(null);
    if (searchParams.get("from") === "world-map") {
      setSelectionMode(false);
      setSelectedMarkerIds([]);
      navigate("/world-map");
      return;
    }

    setSelectionMode(false);
    setSelectedMarkerIds([]);
    setSearchParams({});
  };

  const handleMarkerMove = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const currentMarkers = latestMarkersFor(selectedMap);
    const previous = currentMarkers.find((item) => item.id === marker.id);
    if (!previous) return;
    const moveTogether = selectionMode && selectedMarkerIds.includes(marker.id);
    const movingIds = new Set(moveTogether ? selectedMarkerIds : [marker.id]);
    const deltaX = marker.x - previous.x;
    const deltaY = marker.y - previous.y;
    const [groupDeltaX, groupDeltaY] = moveTogether
      ? getGroupTranslation(currentMarkers.filter((item) => movingIds.has(item.id)), deltaX, deltaY)
      : [deltaX, deltaY];
    const updatedMarkers = currentMarkers.map((item) => {
      if (!movingIds.has(item.id)) return item;
      if (item.id === marker.id) {
        return moveTogether
          ? offsetMapMarker(marker, groupDeltaX - deltaX, groupDeltaY - deltaY)
          : marker;
      }
      return offsetMapMarker(item, groupDeltaX, groupDeltaY);
    });

    try {
      await queueMarkerSave(selectedMap, updatedMarkers);
    } catch (error) {
      console.error("Failed to move marker:", error);
      setMapError(error instanceof Error ? error.message : "Could not save the marker position.");
    }
  };

  const savePlacedMarker = async (marker: MapMarker) => {
    if (!selectedMap) return;
    const markerInActiveLayer = { ...marker, layer_id: activeLayerId };
    await queueMarkerSave(selectedMap, [...latestMarkersFor(selectedMap), markerInActiveLayer]);
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
    const markerToSave = {
      ...markerDraft,
      label: markerDraft.label?.trim() || (markerDraft.type === "area" ? "New area" : "New path"),
    };
    setMapLayerMarkerId(layer, markerToSave.id);
    setShapeDraft(null);
    setPointPlacementMode(false);
    setDrawShape(null);
    setShapeEditId(null);
    void savePlacedMarker(markerToSave).then(
      () => layer.remove(),
      () => layer.remove(),
    );
  };

  const handlePlacePointMarker = (x: number, y: number) => {
    setMapError(null);
    const marker: MapMarker = {
      id: crypto.randomUUID(),
      entity_id: pendingMapEntity?.id ?? null,
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
      label: pendingMapEntity?.name ?? (selectedBuildingStamp ? `New ${selectedBuildingStamp.name}` : "New marker"),
      visible: true,
      dm_only: false,
      hide_label: Boolean(selectedBuildingStamp) && !showStampLabelsByDefault,
      icon: selectedBuildingStamp ? undefined : "location",
      icon_image: selectedBuildingStamp?.image_path,
      icon_size: selectedBuildingStamp?.default_size ?? undefined,
      type: "point",
    };
    draftShapeLayer?.remove();
    setDraftShapeLayer(null);
    setShapeDraft(null);
    if (pendingMapEntity) {
      setPointPlacementMode(false);
      clearPendingMapEntity();
    }
    void savePlacedMarker(marker).catch(() => undefined);
  };

  const handlePlaceQuickShape = (marker: MapMarker, layer: L.Layer) => {
    setMapError(null);
    if (shapePlacementPreset?.startsWith("building-")) setShapePlacementPreset(null);
    draftShapeLayer?.remove();
    setMapLayerMarkerId(layer, marker.id);
    setShapeDraft(null);
    setShapeEditId(null);
    setDrawShape(null);
    void savePlacedMarker(marker).then(
      () => layer.remove(),
      () => layer.remove(),
    );
  };

  const handlePlaceMapEntity = (entity: EntitySummary) => {
    setMapError(null);
    setSelectionMode(false);
    setSelectedMarkerIds([]);
    setSelectedBuildingStamp(null);
    setPendingMapEntitySelection(entity);
    setPointPlacementMode(true);
    setMarkerEditMode(false);
    setShapeEditId(null);
    setDrawShape(null);
  };

  const handleStartDrawing = (type: "area" | "path", draft?: MapMarker) => {
    setSelectionMode(false);
    setSelectedMarkerIds([]);
    setSelectedBuildingStamp(null);
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
    const marker = latestMarkersFor(selectedMap).find((item) => item.id === markerId);
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

    const currentMarkers = latestMarkersFor(selectedMap);
    const previous = currentMarkers.find((item) => item.id === marker.id);
    if (!previous) return;
    const moveTogether = selectionMode && selectedMarkerIds.includes(marker.id);
    const movingIds = new Set(moveTogether ? selectedMarkerIds : [marker.id]);
    const deltaX = (marker.points?.[0]?.[0] ?? marker.x) - (previous.points?.[0]?.[0] ?? previous.x);
    const deltaY = (marker.points?.[0]?.[1] ?? marker.y) - (previous.points?.[0]?.[1] ?? previous.y);
    const [groupDeltaX, groupDeltaY] = moveTogether
      ? getGroupTranslation(currentMarkers.filter((item) => movingIds.has(item.id)), deltaX, deltaY)
      : [deltaX, deltaY];
    const updatedMarkers = currentMarkers.map((item) => {
      if (!movingIds.has(item.id)) return item;
      if (item.id === marker.id) {
        return moveTogether
          ? offsetMapMarker(marker, groupDeltaX - deltaX, groupDeltaY - deltaY)
          : marker;
      }
      return offsetMapMarker(item, groupDeltaX, groupDeltaY);
    });

    try {
      await queueMarkerSave(selectedMap, updatedMarkers);
    } catch (error) {
      console.error("Failed to save edited shape:", error);
      setMapError(error instanceof Error ? error.message : "Could not save the shape.");
    }
  };

  const handleResizeShape = async (marker: MapMarker) => {
    if (!selectedMap) return;
    const currentMarkers = latestMarkersFor(selectedMap);
    if (!currentMarkers.some((item) => item.id === marker.id)) return;

    try {
      await queueMarkerSave(
        selectedMap,
        currentMarkers.map((item) => item.id === marker.id ? marker : item),
      );
    } catch (error) {
      console.error("Failed to resize map shape:", error);
      setMapError(error instanceof Error ? error.message : "Could not resize the shape.");
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

  const handleChangeMarkerOrder = (markerId: string, direction: "front" | "back") => {
    const currentMap = mapDraftRef.current?.id === selectedMap?.id ? mapDraftRef.current : editableMap;
    if (!currentMap) return;
    const selectedIds = new Set(
      selectedMarkerIds.includes(markerId) ? selectedMarkerIds : [markerId],
    );
    const targetMarkers = currentMap.markers.filter((marker) => selectedIds.has(marker.id));
    if (targetMarkers.length === 0) return;

    const layerKeys = new Set(targetMarkers.map((marker) => marker.layer_id ?? ""));
    const reordered = [...currentMap.markers];
    let changed = false;
    for (const layerKey of layerKeys) {
      const layerMarkers = currentMap.markers
        .filter((marker) => (marker.layer_id ?? "") === layerKey)
        .sort((left, right) => (left.z_index ?? 0) - (right.z_index ?? 0));
      const moving = layerMarkers.filter((marker) => selectedIds.has(marker.id));
      const staying = layerMarkers.filter((marker) => !selectedIds.has(marker.id));
      const nextOrder = direction === "front" ? [...staying, ...moving] : [...moving, ...staying];
      const alreadyExplicitlyOrdered = layerMarkers.every(
        (marker, index) => marker.id === nextOrder[index]?.id && marker.z_index === index,
      );
      if (alreadyExplicitlyOrdered) continue;
      changed = true;
      nextOrder.forEach((marker, index) => {
        const mapIndex = reordered.findIndex((item) => item.id === marker.id);
        if (mapIndex >= 0) reordered[mapIndex] = { ...marker, z_index: index };
      });
    }

    if (!changed) return;
    const nextMap = { ...currentMap, markers: reordered };
    recordMapEdit(currentMap.id, currentMap, nextMap);
    stageMapDraft(nextMap);
  };

  const handleEditMarker = () => {
    if (!markerContextMenu?.markerId || !selectedMap) {
      return;
    }

    const marker = latestMarkersFor(selectedMap).find(
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

  const handleDeleteMarkerById = async (markerId: string) => {
    if (!selectedMap) return;
    try {
      await queueMarkerSave(
        selectedMap,
        latestMarkersFor(selectedMap).filter((marker) => marker.id !== markerId),
      );
      setSelectedMarkerIds((current) => current.filter((id) => id !== markerId));
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

  const handleDuplicateMarkers = async (markerIds: string[]) => {
    if (!selectedMap) return;
    const markers = latestMarkersFor(selectedMap);
    const sources = markers.filter((marker) => markerIds.includes(marker.id));
    if (sources.length === 0) return;
    const [offsetX, offsetY] = getDuplicateTranslation(sources);
    const duplicates = sources.map((source): MapMarker => {
      const duplicate = offsetMapMarker(source, offsetX, offsetY);
      const points = duplicate.points;
      return {
        ...duplicate,
        id: crypto.randomUUID(),
        entity_id: null,
        linked_map: undefined,
        label: source.label ? `${source.label} copy` : "New marker copy",
        x: points?.[0]?.[0] ?? duplicate.x,
        y: points?.[0]?.[1] ?? duplicate.y,
      };
    });

    try {
      const stageDuplicates = queueMarkerSave(selectedMap, [...markers, ...duplicates]);
      setSelectedMarkerIds(duplicates.map((marker) => marker.id));
      setSelectionMode(true);
      await stageDuplicates;
    } catch (error) {
      console.error("Failed to duplicate map items:", error);
      setMapError(error instanceof Error ? error.message : "Could not duplicate these map items.");
    }
  };

  const handleDuplicateMarker = (markerId: string) => {
    void handleDuplicateMarkers([markerId]);
  };

  const handleToggleMarkerSelection = (markerId: string) => {
    setSelectedMarkerIds((current) => current.includes(markerId)
      ? current.filter((selectedId) => selectedId !== markerId)
      : [...current, markerId]);
  };

  const handleAlignSelectedMarkers = async (alignment: MarkerAlignment) => {
    if (!selectedMap || selectedMarkerIds.length < 2) return;
    const currentMarkers = latestMarkersFor(selectedMap);
    const selectedMarkers = currentMarkers.filter((marker) => selectedMarkerIds.includes(marker.id));
    if (selectedMarkers.length < 2) return;

    const bounds = selectedMarkers.map((marker) => ({ marker, bounds: getMarkerBounds(marker) }));
    const group = bounds.reduce((result, item) => ({
      minX: Math.min(result.minX, item.bounds.minX),
      minY: Math.min(result.minY, item.bounds.minY),
      maxX: Math.max(result.maxX, item.bounds.maxX),
      maxY: Math.max(result.maxY, item.bounds.maxY),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const centerX = (group.minX + group.maxX) / 2;
    const centerY = (group.minY + group.maxY) / 2;
    const deltas = new Map<string, [number, number]>();

    for (const item of bounds) {
      const itemCenterX = (item.bounds.minX + item.bounds.maxX) / 2;
      const itemCenterY = (item.bounds.minY + item.bounds.maxY) / 2;
      const delta: [number, number] = [
        alignment === "left" ? group.minX - item.bounds.minX
          : alignment === "center-x" ? centerX - itemCenterX
            : alignment === "right" ? group.maxX - item.bounds.maxX : 0,
        alignment === "top" ? group.minY - item.bounds.minY
          : alignment === "center-y" ? centerY - itemCenterY
            : alignment === "bottom" ? group.maxY - item.bounds.maxY : 0,
      ];
      deltas.set(item.marker.id, delta);
    }

    const alignedMarkers = currentMarkers.map((marker) => {
      const delta = deltas.get(marker.id);
      return delta ? offsetMapMarker(marker, delta[0], delta[1]) : marker;
    });
    try {
      await queueMarkerSave(selectedMap, alignedMarkers);
    } catch (error) {
      console.error("Failed to align map items:", error);
      setMapError(error instanceof Error ? error.message : "Could not align the selected map items.");
    }
  };

  const handleTransformSelectedMarkers = async (transform: "rotate-left" | "rotate-right" | "mirror-horizontal" | "mirror-vertical") => {
    if (!selectedMap || selectedMarkerIds.length === 0) return;
    const currentMarkers = latestMarkersFor(selectedMap);
    const selectedMarkers = currentMarkers.filter((marker) => selectedMarkerIds.includes(marker.id));
    if (selectedMarkers.length === 0) return;
    const selectedBounds = selectedMarkers.map(getMarkerBounds);
    const group = selectedBounds.reduce((result, item) => ({
      minX: Math.min(result.minX, item.minX),
      minY: Math.min(result.minY, item.minY),
      maxX: Math.max(result.maxX, item.maxX),
      maxY: Math.max(result.maxY, item.maxY),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const centerX = (group.minX + group.maxX) / 2;
    const centerY = (group.minY + group.maxY) / 2;
    const angle = transform === "rotate-left" ? -Math.PI / 2 : Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const transformPoint = ([x, y]: [number, number]): [number, number] => {
      if (transform === "mirror-horizontal") return [2 * centerX - x, y];
      if (transform === "mirror-vertical") return [x, 2 * centerY - y];
      const dx = x - centerX;
      const dy = y - centerY;
      return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos];
    };
    const selectedIds = new Set(selectedMarkerIds);
    const transformedMarkers = currentMarkers.map((marker) => {
      if (!selectedIds.has(marker.id)) return marker;
      const points = marker.points?.map(transformPoint);
      const position = transformPoint([marker.x, marker.y]);
      const nextRotation = marker.icon_image && (transform === "rotate-left" || transform === "rotate-right")
        ? (((marker.rotation ?? 0) + (transform === "rotate-left" ? -90 : 90)) % 360 + 360) % 360
        : marker.icon_image && (transform === "mirror-horizontal" || transform === "mirror-vertical")
          ? (((-(marker.rotation ?? 0)) % 360) + 360) % 360
          : marker.rotation;
      return {
        ...marker,
        x: Math.min(100, Math.max(0, points?.[0]?.[0] ?? position[0])),
        y: Math.min(100, Math.max(0, points?.[0]?.[1] ?? position[1])),
        ...(points ? { points: points.map(([x, y]): [number, number] => [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))]) } : {}),
        ...(nextRotation === undefined ? {} : { rotation: nextRotation }),
        ...(transform === "mirror-horizontal" && marker.icon_image ? { mirror_x: !marker.mirror_x } : {}),
        ...(transform === "mirror-vertical" && marker.icon_image ? { mirror_y: !marker.mirror_y } : {}),
      };
    });
    try {
      await queueMarkerSave(selectedMap, transformedMarkers);
    } catch (error) {
      console.error("Failed to transform selected map items:", error);
      setMapError(error instanceof Error ? error.message : "Could not transform the selected map items.");
    }
  };

  const handleSelectionModeChange = (enabled: boolean) => {
    setSelectionMode(enabled);
    if (!enabled) {
      setSelectedMarkerIds([]);
      return;
    }
    setMarkerEditMode(false);
    setPointPlacementMode(false);
    setShapePlacementPreset(null);
    setDrawShape(null);
    setShapeEditId(null);
    clearPendingMapEntity();
  };

  const handleSaveMarker = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const currentMarkers = latestMarkersFor(selectedMap);
    const existingMarker = currentMarkers.find((item) => item.id === marker.id);
    const updatedMarkers = existingMarker
      ? currentMarkers.map((item) => item.id === marker.id ? { ...marker, layer_id: marker.layer_id ?? existingMarker.layer_id ?? null } : item)
      : [...currentMarkers, { ...marker, layer_id: marker.layer_id ?? activeLayerId }];

    try {
      await queueMarkerSave(selectedMap, updatedMarkers);

      draftShapeLayer?.remove();
      setDraftShapeLayer(null);
      setShapeDraft(null);
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

  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading maps…</Typography>;
  }

  if (entitiesError && !selectedMap) {
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
          key={selectedMap.id}
          map={mapEditMode && editableMap ? editableMap : selectedMap}
          maps={maps}
          editMode={mapEditMode}
          hasUnsavedChanges={mapDraftDirty}
          onSaveChanges={() => void saveMapDraft()}
          onEditModeChange={handleMapEditModeChange}
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
          shapePlacementPreset={shapePlacementPreset}
          snapToGrid={snapToGrid}
          snapGridSize={snapGridSize}
          showGrid={showGrid}
          shapeEditActive={shapeEditId !== null}
          onActivityLayerEnabledChange={setActivityLayerEnabled}
          onWorldStoryChange={(storyId) => {
            setSelectedWorldStoryId(storyId);
            setSelectedThreadId("");
            setActivityLayerEnabled(true);
          }}
          onThreadChange={(threadId) => {
            setSelectedThreadId(threadId);
            setActivityLayerEnabled(true);
          }}
          onMarkerEditModeChange={(enabled) => {
            setSelectionMode(false);
            setSelectedMarkerIds([]);
            setMarkerEditMode(enabled);
            setPointPlacementMode(false);
            setSelectedBuildingStamp(null);
            setShapePlacementPreset(null);
            setDrawShape(null);
            clearPendingMapEntity();
            setShapeEditId(null);
          }}
          onPointPlacementModeChange={(enabled) => {
            setSelectionMode(false);
            setSelectedMarkerIds([]);
            setPointPlacementMode(enabled);
            setSelectedBuildingStamp(null);
            setShapePlacementPreset(null);
            if (!enabled) clearPendingMapEntity();
            if (enabled) {
              setMarkerEditMode(false);
              setShapeEditId(null);
              setDrawShape(null);
            }
          }}
          onShapePresetChange={(preset) => {
            if (preset) {
              setSelectionMode(false);
              setSelectedMarkerIds([]);
              setPointPlacementMode(false);
              setSelectedBuildingStamp(null);
              setMarkerEditMode(false);
              setShapeEditId(null);
              setDrawShape(null);
              clearPendingMapEntity();
            }
            setShapePlacementPreset(preset);
          }}
          onSelectMode={() => {
            setSelectionMode(false);
            setSelectedMarkerIds([]);
            setMarkerEditMode(false);
            setPointPlacementMode(false);
            setSelectedBuildingStamp(null);
            setShapePlacementPreset(null);
            setShapeEditId(null);
            setDrawShape(null);
            clearPendingMapEntity();
          }}
          onStartDrawing={handleStartDrawing}
          onFinishShapeEdit={() => setShapeEditId(null)}
          mapError={mapError}
          canUndo={canUndoMapEdit}
          canRedo={canRedoMapEdit}
          markerHistoryBusy={markerHistoryBusy}
          onUndo={() => void undoMapEdit()}
          onRedo={() => void redoMapEdit()}
          selectionMode={selectionMode}
          selectedMarkerIds={selectedMarkerIds}
          onSelectionModeChange={handleSelectionModeChange}
          onToggleMarkerSelection={handleToggleMarkerSelection}
          onClearMarkerSelection={() => setSelectedMarkerIds([])}
          onDuplicateSelectedMarkers={() => void handleDuplicateMarkers(selectedMarkerIds)}
          onPlacePointMarker={handlePlacePointMarker}
          onPlaceQuickShape={handlePlaceQuickShape}
          onSnapToGridChange={setSnapToGrid}
          onSnapGridSizeChange={setSnapGridSize}
          onShowGridChange={setShowGrid}
          onAlignSelectedMarkers={handleAlignSelectedMarkers}
          onTransformSelectedMarkers={(transform) => void handleTransformSelectedMarkers(transform)}
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={handleLayerVisibilityChange}
          layerLocks={layerLocks}
          onLayerLockChange={handleLayerLockChange}
          customLayerVisibility={customLayerVisibility}
          customLayerLocks={customLayerLocks}
          activeLayerId={activeLayerId}
          onActiveLayerChange={handleActiveLayerChange}
          onCustomLayerVisibilityChange={handleCustomLayerVisibilityChange}
          onCustomLayerLockChange={handleCustomLayerLockChange}
          onCreateMapLayer={handleCreateMapLayer}
          onRenameMapLayer={handleRenameMapLayer}
          onMoveMapLayer={handleMoveMapLayer}
          onDeleteMapLayer={handleDeleteMapLayer}
          onAssignSelectedMarkersToLayer={handleAssignSelectedMarkersToLayer}
          buildingStamps={buildingStamps}
          showStampLabelsByDefault={showStampLabelsByDefault}
          onShowStampLabelsByDefaultChange={(enabled) => {
            setShowStampLabelsByDefault(enabled);
            try {
              window.localStorage.setItem("world-builder-map-stamp-labels", String(enabled));
            } catch {
              // Keep the in-session preference if storage is unavailable.
            }
          }}
          selectedStampPath={selectedBuildingStamp?.image_path ?? null}
          stampUploadBusy={stampUploadBusy}
          stampUploadError={stampUploadError}
          onUploadBuildingStamp={handleUploadBuildingStamp}
          onStageBuildingStampSize={handleStageBuildingStampSize}
          onSelectBuildingStamp={(stamp) => {
            setSelectedBuildingStamp(stamp);
            setPointPlacementMode(Boolean(stamp));
            if (stamp) {
              setSelectionMode(false);
              setSelectedMarkerIds([]);
              setPointPlacementMode(true);
              setShapePlacementPreset(null);
              setMarkerEditMode(false);
              setShapeEditId(null);
              setDrawShape(null);
              clearPendingMapEntity();
            }
          }}
          savingMap={markerHistoryBusy}
          onPlaceMapEntity={handlePlaceMapEntity}
          onOpenMarkerEditor={handleOpenMarkerEditor}
          onChangeMarkerOrder={handleChangeMarkerOrder}
          shapeEditId={shapeEditId}
          drawShape={drawShape}
          onDrawShapeHandled={handleDrawShapeHandled}
          onBack={handleBack}
          onOpenEntity={openEntity}
          onOpenMap={openMap}
          onCreateChildMap={() => setMapCreation({ open: true, parentMapId: selectedMap.id })}
          onDeleteMap={handleDeleteMap}
          onCanvasSizeChange={handleCanvasSizeChange}
          getEntity={getEntity}
          onOpenMarkerMenu={handleOpenMarkerMenu}
          onMarkerMove={handleMarkerMove}
          onResizeShape={handleResizeShape}
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
          onDuplicate={(markerId) => void handleDuplicateMarker(markerId)}
          onChangeOrder={handleChangeMarkerOrder}
          onDelete={handleDeleteMarkerById}
          onClose={() => setMarkerContextMenu(null)}
        />

        {mapCreation.open && <MapCreationDialog
          open
          maps={maps}
          locations={placeableLocations}
          initialParentMapId={mapCreation.parentMapId}
          onClose={() => setMapCreation({ open: false })}
          onCreate={handleCreateMap}
        />}
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
        <DashboardFilters
          search={{ label: "Search maps", placeholder: "Map name…" }}
          taggedEntities={maps}
          onChange={setMapFilters}
        />
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

        <Button variant="contained" startIcon={<AddLocationAltIcon />} onClick={() => setMapCreation({ open: true })} sx={{ mb: 3 }}>
          Create quick map
        </Button>

        {maps.length === 0 ? (
          <Typography color="text.secondary">
            No maps have been added yet. Create a quick map to start sketching a town or building.
          </Typography>
        ) : filteredMaps.length === 0 ? (
          <Typography color="text.secondary">No maps match these filters.</Typography>
        ) : (
          <Grid container spacing={2}>
            {filteredMaps.map((map) => (
              <Grid key={map.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <MapCard map={map} onOpen={() => openMap(map.id)} onDelete={handleDeleteMap} />
              </Grid>
            ))}
          </Grid>
        )}
        {mapCreation.open && <MapCreationDialog
          open
          maps={maps}
          locations={placeableLocations}
          initialParentMapId={mapCreation.parentMapId}
          onClose={() => setMapCreation({ open: false })}
          onCreate={handleCreateMap}
        />}
      </Box>
    </Box>
  );
}

function MapCard({ map, onOpen, onDelete }: MapCardProps) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea sx={{ flex: 1 }} onClick={onOpen}>
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
        {!map.image_path && (
          <Box
            aria-label="Schematic map preview"
            sx={{
              aspectRatio: "16 / 9",
              borderBottom: 1,
              borderColor: "divider",
              display: "grid",
              placeItems: "center",
              color: "text.secondary",
              backgroundColor: "background.paper",
              backgroundImage: "linear-gradient(rgba(244, 244, 245, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 244, 245, 0.035) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <MapOutlinedIcon sx={{ fontSize: 48, opacity: 0.75 }} />
          </Box>
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
            {!map.image_path && <Chip size="small" label="Schematic canvas" />}
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
      <CardActions sx={{ justifyContent: "flex-end", py: 0.5, px: 1 }}>
        <DeleteMapControl map={map} onDelete={onDelete} iconOnly />
      </CardActions>
    </Card>
  );
}

function DeleteMapControl({ map, onDelete, iconOnly = false }: { map: Map; onDelete: (map: Map) => Promise<void>; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(map);
      setOpen(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this map.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={`Delete ${map.name}`}>
          <IconButton aria-label={`Delete map ${map.name}`} size="small" color="error" onClick={() => { setError(null); setOpen(true); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { setError(null); setOpen(true); }}>
          Delete map
        </Button>
      )}
      <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {map.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently deletes the map and its markers. Any unsaved map edits will be discarded. Child maps or other linked records must be removed or unlinked first.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()} disabled={busy}>
            {busy ? "Deleting…" : "Delete map"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function MapStampOption({
  stamp,
  selected,
  onSelect,
  onSaveSize,
}: {
  stamp: MapStampAsset;
  selected: boolean;
  onSelect: () => void;
  onSaveSize: (size: number) => Promise<void>;
}) {
  const [sizeDraft, setSizeDraft] = useState(String(stamp.default_size));
  const [saving, setSaving] = useState(false);

  const saveSize = async () => {
    const parsedSize = Number(sizeDraft);
    const size = Math.max(24, Math.min(256, Number.isFinite(parsedSize) ? Math.round(parsedSize) : stamp.default_size));
    setSizeDraft(String(size));
    if (size === stamp.default_size) return;

    setSaving(true);
    try {
      await onSaveSize(size);
    } catch {
      setSizeDraft(String(stamp.default_size));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Button
        size="small"
        fullWidth
        variant={selected ? "contained" : "outlined"}
        aria-pressed={selected}
        onClick={onSelect}
        sx={{ justifyContent: "flex-start", gap: 1, textTransform: "none", textAlign: "left", minWidth: 0 }}
      >
        <Box component="img" src={mapStampImageUrl(stamp.image_path)} alt="" sx={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stamp.name}</Box>
      </Button>
      <Tooltip title="Saved default placement size in map units">
        <TextField
          label="Size"
          type="number"
          size="small"
          value={sizeDraft}
          disabled={saving}
          onChange={(event) => setSizeDraft(event.target.value)}
          onBlur={() => void saveSize()}
          slotProps={{
            htmlInput: { min: 24, max: 256, "aria-label": `Default size for ${stamp.name}` },
            input: { endAdornment: saving ? <InputAdornment position="end"><CircularProgress size={14} /></InputAdornment> : undefined },
          }}
          sx={{ width: 92, flexShrink: 0 }}
        />
      </Tooltip>
    </Stack>
  );
}

function MapViewer({
  map,
  maps,
  editMode,
  hasUnsavedChanges,
  onSaveChanges,
  onEditModeChange,
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
  shapePlacementPreset,
  snapToGrid,
  snapGridSize,
  showGrid,
  shapeEditActive,
  mapError,
  canUndo,
  canRedo,
  markerHistoryBusy,
  onUndo,
  onRedo,
  selectionMode,
  selectedMarkerIds,
  onSelectionModeChange,
  onToggleMarkerSelection,
  onClearMarkerSelection,
  onDuplicateSelectedMarkers,
  onActivityLayerEnabledChange,
  onWorldStoryChange,
  onThreadChange,
  onMarkerEditModeChange,
  onPointPlacementModeChange,
  onShapePresetChange,
  onSelectMode,
  onStartDrawing,
  onFinishShapeEdit,
  onBack,
  onOpenEntity,
  onOpenMap,
  onCreateChildMap,
  onDeleteMap,
  onCanvasSizeChange,
  getEntity,
  onPlacePointMarker,
  onPlaceQuickShape,
  onSnapToGridChange,
  onPlaceMapEntity,
  onOpenMarkerEditor,
  onChangeMarkerOrder,
  shapeEditId,
  drawShape,
  onDrawShapeHandled,
  onOpenMarkerMenu,
  onMarkerMove,
  onResizeShape,
  onSnapGridSizeChange,
  onShowGridChange,
  onAlignSelectedMarkers,
  onTransformSelectedMarkers,
  layerVisibility,
  onLayerVisibilityChange,
  layerLocks,
  onLayerLockChange,
  customLayerVisibility,
  customLayerLocks,
  activeLayerId,
  onActiveLayerChange,
  onCustomLayerVisibilityChange,
  onCustomLayerLockChange,
  onCreateMapLayer,
  onRenameMapLayer,
  onMoveMapLayer,
  onDeleteMapLayer,
  onAssignSelectedMarkersToLayer,
  buildingStamps,
  showStampLabelsByDefault,
  onShowStampLabelsByDefaultChange,
  selectedStampPath,
  stampUploadBusy,
  stampUploadError,
  onUploadBuildingStamp,
  onStageBuildingStampSize,
  onSelectBuildingStamp,
  savingMap,
  onShapeCreated,
  onShapeEdited,
}: MapViewerProps) {
  const [newMapLayerName, setNewMapLayerName] = useState("");
  const [mapExplorerOpen, setMapExplorerOpen] = useState(false);
  const [manualFocus, setManualFocus] = useState<{ mapId: string; markerId: string } | null>(null);
  const stampFileInput = useRef<HTMLInputElement>(null);
  const mapLayers: MapLayer[] = map.layers ?? [];
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
          px: { xs: 1.25, md: 2 },
          py: { xs: 0.75, md: 1 },
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 0.75, md: 2 }}
          sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              useFlexGap
              sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1.25, rowGap: 0.25 }}
            >
              <Breadcrumbs aria-label="Map hierarchy" sx={{ fontSize: "0.8rem" }}>
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
              </Breadcrumbs>
              <Typography component="span" aria-hidden="true" color="text.disabled" sx={{ mx: -0.75 }}>
                /
              </Typography>
              <Typography
                variant="h1"
                component="button"
                onClick={() => {
                  if (map.entity_id) onOpenEntity(map.entity_id);
                }}
                sx={{
                  p: 0,
                  border: 0,
                  background: "none",
                  color: "text.primary",
                  font: "inherit",
                  fontSize: { xs: "1.2rem", md: "1.45rem" },
                  fontWeight: 650,
                  lineHeight: 1.15,
                  textAlign: "left",
                  textDecoration: map.entity_id ? "underline" : "none",
                  cursor: map.entity_id ? "pointer" : "default",
                  "&:hover": map.entity_id ? { color: "primary.main" } : undefined,
                }}
              >
                {entity?.name ?? map.name}
              </Typography>
              <Chip
                size="small"
                label={(entity?.entity_type ?? map.map_type ?? "MAP").replaceAll("_", " ")}
                sx={{ height: 22, fontSize: "0.68rem", textTransform: "uppercase" }}
              />
            </Stack>

            {connectedMaps.length > 0 && (
              <Stack
                direction="row"
                useFlexGap
                sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
                  MAPS
                </Typography>
                {connectedMaps.map(({ map: connectedMap, relationship }) => (
                  <Tooltip key={connectedMap.id} title={relationship}>
                    <Chip
                      clickable
                      size="small"
                      variant="outlined"
                      icon={<MapOutlinedIcon />}
                      label={connectedMap.name}
                      onClick={() => onOpenMap(connectedMap.id)}
                    />
                  </Tooltip>
                ))}
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {editMode && hasUnsavedChanges && (
              <Button variant="outlined" size="small" disabled={savingMap} onClick={onSaveChanges}>
                Save changes
              </Button>
            )}
            <Button
              variant={editMode ? "contained" : "outlined"}
              size="small"
              startIcon={<EditIcon />}
              disabled={savingMap}
              aria-pressed={editMode}
              onClick={() => {
                if (editMode) setMapExplorerOpen(false);
                onEditModeChange(!editMode);
              }}
            >
              {editMode ? "Done editing" : "Edit map"}
            </Button>
            <DeleteMapControl map={map} onDelete={onDeleteMap} />
            {editMode && (
              <Button variant="outlined" size="small" startIcon={<AddLocationAltIcon />} onClick={onCreateChildMap}>
                Add child map
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: { xs: 0.75, md: 1 },
          pb: { xs: 1, md: 1.25 },
          backgroundColor: "background.default",
        }}
      >
        {mapError && <Alert severity="error" sx={{ mb: 2 }}>{mapError}</Alert>}
        <>
          <Stack direction={{ xs: "column-reverse", lg: "row" }} spacing={1.5} sx={{ alignItems: "stretch" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <LeafletMap
                map={map}
                maps={maps}
                editMode={editMode}
                locations={locations}
                campaignActivity={activityLayerEnabled ? campaignActivity : []}
                focusedMarkerId={focusedMarkerId}
                markerEditMode={markerEditMode}
                pointPlacementMode={pointPlacementMode}
                shapePlacementPreset={shapePlacementPreset}
                snapToGrid={snapToGrid}
                snapGridSize={snapGridSize}
                showGrid={showGrid}
                selectionMode={selectionMode}
                selectedMarkerIds={selectedMarkerIds}
                layerVisibility={layerVisibility}
                layerLocks={layerLocks}
                customLayerVisibility={customLayerVisibility}
                customLayerLocks={customLayerLocks}
                onOpenEntity={onOpenEntity}
                onOpenMap={onOpenMap}
                getEntity={getEntity}
                onPlacePointMarker={onPlacePointMarker}
                onPlaceQuickShape={onPlaceQuickShape}
                onPlaceMapEntity={onPlaceMapEntity}
                onOpenMarkerEditor={onOpenMarkerEditor}
                onChangeMarkerOrder={onChangeMarkerOrder}
                shapeEditId={shapeEditId}
                drawShape={drawShape}
                onDrawShapeHandled={onDrawShapeHandled}
                onOpenMarkerMenu={onOpenMarkerMenu}
                onMarkerMove={onMarkerMove}
                onResizeShape={onResizeShape}
                onToggleMarkerSelection={onToggleMarkerSelection}
                onShapeCreated={onShapeCreated}
                onShapeEdited={onShapeEdited}
                mapExplorerOpen={mapExplorerOpen}
                onCloseMapExplorer={() => setMapExplorerOpen(false)}
                onFocusMarker={(markerId) => setManualFocus({ mapId: map.id, markerId })}
              />
            </Box>
            <Paper
                component="aside"
                variant="outlined"
                aria-label="Map controls"
                sx={{
                  p: 1.5,
                  width: { xs: "100%", lg: 264 },
                  flexShrink: 0,
                  alignSelf: "flex-start",
                  position: { lg: "sticky" },
                  top: { lg: 16 },
                  ...(editMode ? {
                    height: { lg: "calc(100dvh - 110px)" },
                    maxHeight: { lg: "calc(100dvh - 110px)" },
                    overflowY: { lg: "auto" },
                  } : {}),
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="text.secondary">CAMPAIGN ACTIVITY</Typography>
                  <Button size="small" fullWidth variant={activityLayerEnabled ? "contained" : "outlined"} onClick={() => onActivityLayerEnabledChange(!activityLayerEnabled)}>
                    {activityLayerEnabled ? "Hide campaign activity" : "Show campaign activity"}
                  </Button>
                  <FormControl size="small" fullWidth>
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
                  <FormControl size="small" fullWidth>
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
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Chip size="small" label={`${mappedActivityLocationCount} mapped locations`} color={activityLayerEnabled ? "primary" : "default"} />
                    {activityLayerEnabled && <Typography variant="caption" color="text.secondary">Outlined locations have linked activity.</Typography>}
                  </Stack>

                  <Divider />
                  <Box>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                      <Typography variant="overline" color="text.secondary">MAP LAYERS</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Show all map item types">
                          <Button size="small" onClick={() => {
                            onLayerVisibilityChange("points", true);
                            onLayerVisibilityChange("areas", true);
                            onLayerVisibilityChange("paths", true);
                          }}>Show all</Button>
                        </Tooltip>
                        {editMode && <Tooltip title="Unlock all item types">
                          <Button size="small" onClick={() => {
                            onLayerLockChange("points", false);
                            onLayerLockChange("areas", false);
                            onLayerLockChange("paths", false);
                          }}>Unlock all</Button>
                        </Tooltip>}
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      Visibility and locks are temporary. Locks protect existing items of that type from accidental edits.
                    </Typography>
                    <Stack spacing={0.25}>
                      {([
                        ["points", "Markers"],
                        ["areas", "Areas"],
                        ["paths", "Paths"],
                      ] as const).map(([layer, label]) => (
                        <Stack key={layer} direction="row" sx={{ alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
                          <FormControlLabel
                            sx={{ mr: 0 }}
                            control={<Checkbox size="small" checked={layerVisibility[layer]} onChange={(_event, checked) => onLayerVisibilityChange(layer, checked)} />}
                            label={<Typography variant="caption">{label}</Typography>}
                          />
                          {editMode && <Tooltip title={layerLocks[layer] ? `Unlock ${label.toLowerCase()}` : `Lock ${label.toLowerCase()}`}>
                            <IconButton
                              size="small"
                              aria-label={layerLocks[layer] ? `Unlock ${label.toLowerCase()}` : `Lock ${label.toLowerCase()}`}
                              aria-pressed={layerLocks[layer]}
                              color={layerLocks[layer] ? "primary" : "default"}
                              onClick={() => onLayerLockChange(layer, !layerLocks[layer])}
                            >
                              {layerLocks[layer] ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>}
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  {(editMode || mapLayers.length > 0) && <Divider />}
                  {(editMode || mapLayers.length > 0) && <Box>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="overline" color="text.secondary">CUSTOM LAYERS · {mapLayers.length}</Typography>
                    </Stack>
                    {editMode && mapLayers.length > 0 && <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                      <InputLabel id="new-map-item-layer-label">New items go to</InputLabel>
                      <Select
                        labelId="new-map-item-layer-label"
                        label="New items go to"
                        value={activeLayerId ?? ""}
                        onChange={(event) => onActiveLayerChange(String(event.target.value) || null)}
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {mapLayers.map((layer) => <MenuItem key={layer.id} value={layer.id} disabled={customLayerLocks[layer.id] || !customLayerVisibility[layer.id]}>{layer.name}</MenuItem>)}
                      </Select>
                    </FormControl>}
                    {editMode && selectedMarkerIds.length > 0 && <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                      <InputLabel id="assign-selected-map-layer-label">Move {selectedMarkerIds.length} selected</InputLabel>
                      <Select
                        labelId="assign-selected-map-layer-label"
                        label={`Move ${selectedMarkerIds.length} selected`}
                        value=""
                        onChange={(event) => {
                          const layerId = String(event.target.value);
                          onAssignSelectedMarkersToLayer(layerId || null);
                          onClearMarkerSelection();
                        }}
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {mapLayers.map((layer) => <MenuItem key={layer.id} value={layer.id} disabled={customLayerLocks[layer.id] || !customLayerVisibility[layer.id]}>{layer.name}</MenuItem>)}
                      </Select>
                    </FormControl>}
                    {mapLayers.length > 0 && <Stack spacing={0.5} sx={{ mb: 1 }}>
                      {mapLayers.map((layer, index) => {
                        const itemCount = map.markers.filter((marker) => marker.layer_id === layer.id).length;
                        return <Stack key={layer.id} direction="row" spacing={0.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          {editMode && <Stack spacing={0} sx={{ flexShrink: 0 }}>
                            <Tooltip title="Move layer forward">
                              <span><IconButton
                                size="small"
                                aria-label={`Move ${layer.name} layer forward`}
                                disabled={index === 0}
                                onClick={() => onMoveMapLayer(layer.id, "up")}
                                sx={{ p: 0.25 }}
                              ><ArrowUpwardIcon sx={{ fontSize: 16 }} /></IconButton></span>
                            </Tooltip>
                            <Tooltip title="Move layer backward">
                              <span><IconButton
                                size="small"
                                aria-label={`Move ${layer.name} layer backward`}
                                disabled={index === mapLayers.length - 1}
                                onClick={() => onMoveMapLayer(layer.id, "down")}
                                sx={{ p: 0.25 }}
                              ><ArrowDownwardIcon sx={{ fontSize: 16 }} /></IconButton></span>
                            </Tooltip>
                          </Stack>}
                          <Checkbox
                            size="small"
                            checked={customLayerVisibility[layer.id] ?? true}
                            onChange={(_event, checked) => onCustomLayerVisibilityChange(layer.id, checked)}
                            slotProps={{ input: { "aria-label": `Show ${layer.name} layer` } }}
                          />
                          {editMode ? <TextField
                              key={`${layer.id}:${layer.name}`}
                              defaultValue={layer.name}
                              variant="standard"
                              size="small"
                              fullWidth
                              slotProps={{ htmlInput: { "aria-label": `Name for ${layer.name} layer`, maxLength: 80 } }}
                              onBlur={(event) => onRenameMapLayer(layer.id, event.currentTarget.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                              }}
                            /> : <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{layer.name}</Typography>}
                          <Chip size="small" label={itemCount} sx={{ flexShrink: 0 }} />
                          {editMode && <Tooltip title={customLayerLocks[layer.id] ? `Unlock ${layer.name}` : `Lock ${layer.name}`}>
                            <IconButton
                              size="small"
                              aria-label={customLayerLocks[layer.id] ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                              aria-pressed={customLayerLocks[layer.id] ?? false}
                              color={customLayerLocks[layer.id] ? "primary" : "default"}
                              onClick={() => onCustomLayerLockChange(layer.id, !customLayerLocks[layer.id])}
                            >
                              {customLayerLocks[layer.id] ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>}
                          {editMode && <Tooltip title={`Delete ${layer.name}; its items become unassigned`}>
                            <IconButton size="small" aria-label={`Delete ${layer.name} layer`} onClick={() => onDeleteMapLayer(layer.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>}
                        </Stack>;
                      })}
                    </Stack>}
                    {editMode && <Stack direction="row" spacing={0.5}>
                      <TextField
                        size="small"
                        fullWidth
                        label="New layer name"
                        value={newMapLayerName}
                        onChange={(event) => setNewMapLayerName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && newMapLayerName.trim()) {
                            onCreateMapLayer(newMapLayerName);
                            setNewMapLayerName("");
                          }
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!newMapLayerName.trim()}
                        onClick={() => {
                          onCreateMapLayer(newMapLayerName);
                          setNewMapLayerName("");
                        }}
                      >Add</Button>
                    </Stack>}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Layers are ordered front to back; higher layers appear above lower layers. Layer order and assignments save with the map.
                    </Typography>
                  </Box>}

                  {editMode && <Divider />}
                  {editMode && (
                    <Typography variant="caption" color="text.secondary">
                      Map edits stay local until you save changes or finish editing.
                    </Typography>
                  )}

                  {editMode && (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="subtitle2" color="text.secondary">MAP EDITOR</Typography>
                      <Chip
                        size="small"
                        label={savingMap ? "Saving" : hasUnsavedChanges ? "Unsaved changes" : mapError ? "Save issue" : "Saved"}
                        color={savingMap ? "info" : hasUnsavedChanges ? "warning" : mapError ? "error" : "success"}
                        sx={{ height: 22 }}
                      />
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Undo map edit (Ctrl/Cmd+Z)">
                          <span>
                            <IconButton aria-label="Undo map edit" size="small" disabled={!canUndo || markerHistoryBusy} onClick={onUndo}>
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Redo map edit (Ctrl/Cmd+Shift+Z)">
                          <span>
                            <IconButton aria-label="Redo map edit" size="small" disabled={!canRedo || markerHistoryBusy} onClick={onRedo}>
                              <RedoIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  )}
                  {!map.image_path && (
                    editMode && <Typography variant="caption" color="text.secondary">
                      Schematic map: use areas for rooms or districts and paths for streets or corridors.
                    </Typography>
                  )}

                  {editMode && !map.image_path && <Box>
                    <Typography variant="overline" color="text.secondary">CANVAS SIZE</Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="map-canvas-size-label">Workspace</InputLabel>
                      <Select
                        labelId="map-canvas-size-label"
                        label="Workspace"
                        value={`${map.canvas_width ?? 1000}x${map.canvas_height ?? 700}`}
                        onChange={(event) => {
                          const [width, height] = event.target.value.split("x").map(Number);
                          if (width && height) void onCanvasSizeChange(width, height);
                        }}
                      >
                        {!(["1000x700", "1600x1120", "2400x1680", "3200x2240"].includes(`${map.canvas_width ?? 1000}x${map.canvas_height ?? 700}`)) && (
                          <MenuItem value={`${map.canvas_width ?? 1000}x${map.canvas_height ?? 700}`}>
                            Current custom size · {map.canvas_width ?? 1000} × {map.canvas_height ?? 700}
                          </MenuItem>
                        )}
                        <MenuItem value="1000x700">Standard · 1000 × 700</MenuItem>
                        <MenuItem value="1600x1120">Large city · 1600 × 1120</MenuItem>
                        <MenuItem value="2400x1680">Metropolis · 2400 × 1680</MenuItem>
                        <MenuItem value="3200x2240">Expansive · 3200 × 2240</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Expanding preserves the layout’s physical scale and adds workspace. Reset View fits the full canvas.
                    </Typography>
                  </Box>}

                  {editMode && <Box>
                    <Typography variant="overline" color="text.secondary">SELECT</Typography>
                    <Stack spacing={0.75}>
                      <Button size="small" fullWidth variant={!markerEditMode && !pointPlacementMode && !shapePlacementPreset && !drawShape && !shapeEditActive ? "contained" : "outlined"} onClick={() => { onSelectMode(); onSelectBuildingStamp(null); setMapExplorerOpen(false); }}>Browse</Button>
                      <Button size="small" fullWidth variant={markerEditMode ? "contained" : "outlined"} onClick={() => onMarkerEditModeChange(!markerEditMode)}>{markerEditMode ? "Done editing markers" : "Edit markers"}</Button>
                      <Button size="small" fullWidth variant={selectionMode ? "contained" : "outlined"} aria-pressed={selectionMode} onClick={() => onSelectionModeChange(!selectionMode)}>{selectionMode ? "Done selecting" : "Select multiple"}</Button>
                      {shapeEditActive && <Button size="small" fullWidth color="warning" variant="contained" onClick={onFinishShapeEdit}>Finish shape edit</Button>}
                      {selectionMode && (
                        <Stack spacing={0.75}>
                          <Typography variant="caption" color="text.secondary">Click items to add or remove them. Drag any selected item to move the group.</Typography>
                          {selectedMarkerIds.length === 1 && map.markers.some((marker) => marker.id === selectedMarkerIds[0] && marker.type === "area") && (
                            <Typography variant="caption" color="text.secondary">Drag a gold corner handle to resize proportionally around the opposite corner.</Typography>
                          )}
                          {selectedMarkerIds.length === 1 && map.markers.some((marker) => marker.id === selectedMarkerIds[0] && marker.type !== "area" && marker.type !== "path" && Boolean(marker.icon_image)) && (
                            <Typography variant="caption" color="text.secondary">Drag a gold corner handle to resize the stamp proportionally around its center.</Typography>
                          )}
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                            <Chip size="small" label={`${selectedMarkerIds.length} selected`} />
                            <Button size="small" disabled={selectedMarkerIds.length === 0} onClick={onDuplicateSelectedMarkers}>Duplicate selected</Button>
                            <Button size="small" disabled={selectedMarkerIds.length === 0} onClick={onClearMarkerSelection}>Clear</Button>
                          </Stack>
                          {selectedMarkerIds.length > 1 && (
                            <Stack spacing={0.25}>
                              <Typography variant="caption" color="text.secondary">Align selected</Typography>
                              <Stack direction="row" spacing={0.25}>
                                <Tooltip title="Align left edges"><IconButton size="small" aria-label="Align selected items left" onClick={() => onAlignSelectedMarkers("left")}><FormatAlignLeftIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Align horizontal centers"><IconButton size="small" aria-label="Align selected items horizontally centered" onClick={() => onAlignSelectedMarkers("center-x")}><FormatAlignCenterIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Align right edges"><IconButton size="small" aria-label="Align selected items right" onClick={() => onAlignSelectedMarkers("right")}><FormatAlignRightIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Align top edges"><IconButton size="small" aria-label="Align selected items to top" onClick={() => onAlignSelectedMarkers("top")}><VerticalAlignTopIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Align vertical centers"><IconButton size="small" aria-label="Align selected items vertically centered" onClick={() => onAlignSelectedMarkers("center-y")}><VerticalAlignCenterIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Align bottom edges"><IconButton size="small" aria-label="Align selected items to bottom" onClick={() => onAlignSelectedMarkers("bottom")}><VerticalAlignBottomIcon fontSize="small" /></IconButton></Tooltip>
                              </Stack>
                            </Stack>
                          )}
                          {selectedMarkerIds.length > 0 && (
                            <Stack spacing={0.25}>
                              <Typography variant="caption" color="text.secondary">Rotate or mirror around selection center</Typography>
                              <Stack direction="row" spacing={0.25}>
                                <Tooltip title="Rotate selection 90° counterclockwise"><IconButton size="small" aria-label="Rotate selected items counterclockwise" onClick={() => onTransformSelectedMarkers("rotate-left")}><RotateLeftIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Rotate selection 90° clockwise"><IconButton size="small" aria-label="Rotate selected items clockwise" onClick={() => onTransformSelectedMarkers("rotate-right")}><RotateRightIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Mirror selection horizontally"><IconButton size="small" aria-label="Mirror selected items horizontally" onClick={() => onTransformSelectedMarkers("mirror-horizontal")}><FlipIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Mirror selection vertically"><IconButton size="small" aria-label="Mirror selected items vertically" onClick={() => onTransformSelectedMarkers("mirror-vertical")}><FlipIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} /></IconButton></Tooltip>
                              </Stack>
                            </Stack>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Box>}

                  {editMode && <Box>
                    <Typography variant="overline" color="text.secondary">PLACE</Typography>
                    <Stack spacing={0.75}>
                      <Button size="small" fullWidth variant={pointPlacementMode ? "contained" : "outlined"} onClick={() => onPointPlacementModeChange(!pointPlacementMode)}>{pointPlacementMode ? (selectedStampPath ? "Cancel stamp placement" : "Cancel point placement") : "Point marker"}</Button>
                      {(["room", "building", "street", "corridor"] as const).map((preset) => (
                        <Button key={preset} size="small" fullWidth variant={shapePlacementPreset === preset ? "contained" : "outlined"} aria-pressed={shapePlacementPreset === preset} onClick={() => { onPointPlacementModeChange(false); onShapePresetChange(shapePlacementPreset === preset ? null : preset); }}>
                          {preset[0].toUpperCase() + preset.slice(1)}
                        </Button>
                      ))}
                      <Button size="small" fullWidth variant={mapExplorerOpen ? "contained" : "outlined"} startIcon={<MapOutlinedIcon />} onClick={() => { if (!mapExplorerOpen) onSelectMode(); setMapExplorerOpen((open) => !open); }}>{mapExplorerOpen ? "Close entity list" : "Place entity"}</Button>
                    </Stack>
                  </Box>}

                  {editMode && <Accordion disableGutters elevation={0} defaultExpanded={buildingStamps.length > 0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 42, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
                      <Typography variant="overline" color="text.secondary">BUILDING STAMPS · {buildingStamps.length}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={0.75}>
                        <input
                          ref={stampFileInput}
                          hidden
                          type="file"
                          accept="image/png,.png"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void onUploadBuildingStamp(file);
                            event.currentTarget.value = "";
                          }}
                        />
                        <Button size="small" fullWidth variant="outlined" startIcon={stampUploadBusy ? <CircularProgress size={15} /> : <FileUploadIcon />}
                          disabled={stampUploadBusy} onClick={() => stampFileInput.current?.click()}>
                          {stampUploadBusy ? "Uploading PNG…" : "Upload building PNG"}
                        </Button>
                        <Typography variant="caption" color="text.secondary">Choose a stamp and set its saved default size. Each placed copy can still be resized independently.</Typography>
                        <FormControlLabel
                          control={<Switch
                            size="small"
                            checked={showStampLabelsByDefault}
                            onChange={(event) => onShowStampLabelsByDefaultChange(event.target.checked)}
                          />}
                          label="Show labels on new stamps by default"
                          sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: "0.8rem" } }}
                        />
                        {stampUploadError && <Alert severity="error" sx={{ py: 0 }}>{stampUploadError}</Alert>}
                        {buildingStamps.length === 0 && !stampUploadBusy && (
                          <Typography variant="caption" color="text.secondary">No saved PNG stamps yet.</Typography>
                        )}
                        {buildingStamps.map((stamp) => (
                          <MapStampOption
                            key={`${stamp.image_path}:${stamp.default_size}`}
                            stamp={stamp}
                            selected={selectedStampPath === stamp.image_path}
                            onSelect={() => onSelectBuildingStamp(selectedStampPath === stamp.image_path ? null : stamp)}
                            onSaveSize={(size) => onStageBuildingStampSize(stamp, size)}
                          />
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>}

                  {editMode && <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 42, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
                      <Typography variant="overline" color="text.secondary">COMPLEX BUILDING FOOTPRINTS</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={0.75}>
                        <Typography variant="caption" color="text.secondary">
                          Place a starter outline, then edit its vertices to fit the building. Grid snap helps keep edges tidy.
                        </Typography>
                        {(["building-l", "building-t", "building-u"] as const).map((preset) => (
                          <Button
                            key={preset}
                            size="small"
                            fullWidth
                            variant={shapePlacementPreset === preset ? "contained" : "outlined"}
                            aria-pressed={shapePlacementPreset === preset}
                            onClick={() => {
                              onPointPlacementModeChange(false);
                              onShapePresetChange(shapePlacementPreset === preset ? null : preset);
                            }}
                          >
                            {QUICK_SHAPE_LABELS[preset]}
                          </Button>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>}

                  {editMode && <Box>
                    <Typography variant="overline" color="text.secondary">DRAW</Typography>
                    <Stack spacing={0.75}>
                      <Button size="small" fullWidth variant={drawShape === "area" ? "contained" : "outlined"} onClick={() => { onPointPlacementModeChange(false); onMarkerEditModeChange(false); onStartDrawing("area"); }}>Area</Button>
                      <Button size="small" fullWidth variant={drawShape === "path" ? "contained" : "outlined"} onClick={() => { onPointPlacementModeChange(false); onMarkerEditModeChange(false); onStartDrawing("path"); }}>Path</Button>
                      <Button size="small" fullWidth variant={showGrid ? "contained" : "outlined"} aria-pressed={showGrid} onClick={() => onShowGridChange(!showGrid)}>{showGrid ? "Hide grid" : "Show grid"}</Button>
                      <Button size="small" fullWidth variant={snapToGrid ? "contained" : "outlined"} aria-pressed={snapToGrid} onClick={() => onSnapToGridChange(!snapToGrid)}>{snapToGrid ? "Grid snap on" : "Grid snap off"}</Button>
                      {(showGrid || snapToGrid) && <FormControl size="small" fullWidth>
                        <InputLabel id="map-grid-spacing-label">Grid spacing</InputLabel>
                        <Select
                          labelId="map-grid-spacing-label"
                          label="Grid spacing"
                          value={snapGridSize}
                          onChange={(event) => onSnapGridSizeChange(Number(event.target.value))}
                        >
                          <MenuItem value={2.5}>Fine · 2.5%</MenuItem>
                          <MenuItem value={5}>Standard · 5%</MenuItem>
                          <MenuItem value={10}>Coarse · 10%</MenuItem>
                          <MenuItem value={20}>Very coarse · 20%</MenuItem>
                        </Select>
                      </FormControl>}
                    </Stack>
                  </Box>}

                  {editMode && (pointPlacementMode || shapePlacementPreset || drawShape) && (
                    <Alert severity="info" sx={{ py: 0 }}>
                      {shapePlacementPreset
                        ? `Click the map to place a ${QUICK_SHAPE_LABELS[shapePlacementPreset].toLowerCase()}.`
                        : pointPlacementMode
                          ? pendingMapEntityName ? `Click the map to place ${pendingMapEntityName}.` : "Click the map to place a point marker."
                          : `Draw ${drawShape === "area" ? "an area" : "a path"} on the map.`}
                    </Alert>
                  )}
                </Stack>
              </Paper>
          </Stack>
        </>
      </Box>
    </Box>
  );
}
function LeafletMap({
  map,
  maps,
  editMode,
  locations,
  campaignActivity,
  focusedMarkerId,
  mapExplorerOpen,
  onCloseMapExplorer,
  onFocusMarker,
  markerEditMode,
  pointPlacementMode,
  shapePlacementPreset,
  snapToGrid,
  snapGridSize,
  showGrid,
  selectionMode,
  selectedMarkerIds,
  layerVisibility,
  layerLocks,
  customLayerVisibility,
  customLayerLocks,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onPlacePointMarker,
  onPlaceQuickShape,
  onPlaceMapEntity,
  onOpenMarkerEditor,
  onChangeMarkerOrder,
  shapeEditId,
  drawShape,
  onDrawShapeHandled,
  onOpenMarkerMenu,
  onMarkerMove,
  onResizeShape,
  onToggleMarkerSelection,
  onShapeCreated,
  onShapeEdited,
}: LeafletMapProps) {
  const imageDimensions = useImageDimensions(map.image_path);
  const mapDimensions = map.image_path
    ? imageDimensions
    : { width: map.canvas_width ?? 1000, height: map.canvas_height ?? 700 };
  const imageBounds = mapDimensions ? getImageBounds(mapDimensions) : null;

  return (
    <Box
      sx={{
        width: "100%",
        height: { xs: "58vh", lg: "calc(100dvh - 110px)" },
        minHeight: { xs: 420, lg: 480 },
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.default",
        position: "relative",
        "& .leaflet-container.schematic-map": {
          backgroundColor: "#17191f !important",
          backgroundImage: "linear-gradient(rgba(244, 244, 245, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 244, 245, 0.035) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        },
        "& .leaflet-container.map-placement-mode": {
          cursor: "crosshair !important",
        },
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
        "& .campaign-map-marker:not(.campaign-map-stamp)": {
          background: "transparent !important",
          border: "0 !important",
          width: "34px !important",
          height: "34px !important",
          margin: "-17px 0 0 -17px !important",
        },
        "& .campaign-map-stamp": {
          background: "transparent !important",
          border: "0 !important",
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
        className={[
          !map.image_path ? "schematic-map" : "",
          pointPlacementMode || shapePlacementPreset ? "map-placement-mode" : "",
        ].filter(Boolean).join(" ")}
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
        {mapDimensions && imageBounds && (
          <>
            <MapInitialView
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
            />

            <MapFocusMarker
              marker={map.markers.find((item) => item.id === focusedMarkerId) ?? null}
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
            />

            {!map.image_path && (
              <Rectangle
                bounds={imageBounds}
                pathOptions={{ color: "#3b3e47", weight: 1, fillColor: "#17191f", fillOpacity: 1 }}
                interactive={false}
                pmIgnore
              />
            )}
            {map.image_path && <MapImage imageUrl={map.image_path} bounds={imageBounds} />}
            {editMode && showGrid && <SnapGrid imageWidth={mapDimensions.width} imageHeight={mapDimensions.height} gridSize={snapGridSize} />}

            <MapResetButton
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
            />

            <MapContextMenu
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
              editingEnabled={editMode}
              pointPlacementMode={pointPlacementMode}
              shapePlacementPreset={shapePlacementPreset}
              snapToGrid={snapToGrid}
              snapGridSize={snapGridSize}
              onPlacePointMarker={onPlacePointMarker}
              onPlaceQuickShape={onPlaceQuickShape}
              onOpenMarkerMenu={onOpenMarkerMenu}
            />

            <MapMarkers
              map={map}
              editMode={editMode}
              campaignActivity={campaignActivity}
              focusedMarkerId={focusedMarkerId}
              markerEditMode={markerEditMode}
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
              snapToGrid={snapToGrid}
              snapGridSize={snapGridSize}
              selectionMode={selectionMode}
              selectedMarkerIds={selectedMarkerIds}
              layerVisibility={layerVisibility}
              layerLocks={layerLocks}
              customLayerVisibility={customLayerVisibility}
              customLayerLocks={customLayerLocks}
              onOpenEntity={onOpenEntity}
              onOpenMap={onOpenMap}
              getEntity={getEntity}
              onOpenMarkerEditor={onOpenMarkerEditor}
              onOpenMarkerMenu={onOpenMarkerMenu}
              onMarkerMove={onMarkerMove}
              onResizeShape={onResizeShape}
              onToggleMarkerSelection={onToggleMarkerSelection}
            />

            <GeomanController
              mapData={map}
              imageWidth={mapDimensions.width}
              imageHeight={mapDimensions.height}
              editMode={editMode}
              layerLocks={layerLocks}
              customLayerLocks={customLayerLocks}
              snapToGrid={snapToGrid}
              snapGridSize={snapGridSize}
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
          layers={map.layers ?? []}
          editMode={editMode}
          maps={maps}
          locations={locations}
          getEntity={getEntity}
          focusedMarkerId={focusedMarkerId}
          onFocusMarker={onFocusMarker}
          onOpenEntity={onOpenEntity}
          onOpenMap={onOpenMap}
          onOpenMarkerEditor={onOpenMarkerEditor}
          onChangeMarkerOrder={onChangeMarkerOrder}
          onPlaceEntity={onPlaceMapEntity}
          onClose={onCloseMapExplorer}
        />
      )}
    </Box>
  );
}

function SnapGrid({ imageWidth, imageHeight, gridSize }: { imageWidth: number; imageHeight: number; gridSize: number }) {
  const lines = Array.from({ length: Math.floor(100 / gridSize) + 1 }, (_, index) => index * gridSize);
  return (
    <>
      {lines.map((value) => (
          <Polyline
            key={`grid-x-${value}`}
          positions={[
            worldToLeaflet([value, 0], imageWidth, imageHeight),
            worldToLeaflet([value, 100], imageWidth, imageHeight),
          ]}
          pathOptions={{ color: "#736a58", weight: 1, opacity: 0.28, dashArray: "2 5" }}
            interactive={false}
            pmIgnore
        />
      ))}
      {lines.map((value) => (
        <Polyline
          key={`grid-y-${value}`}
          positions={[
            worldToLeaflet([0, value], imageWidth, imageHeight),
            worldToLeaflet([100, value], imageWidth, imageHeight),
          ]}
          pathOptions={{ color: "#736a58", weight: 1, opacity: 0.28, dashArray: "2 5" }}
            interactive={false}
            pmIgnore
        />
      ))}
    </>
  );
}

function MapContextMenu({
  imageWidth,
  imageHeight,
  editingEnabled,
  pointPlacementMode,
  shapePlacementPreset,
  snapToGrid,
  snapGridSize,
  onPlacePointMarker,
  onPlaceQuickShape,
  onOpenMarkerMenu,
}: MapContextMenuProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      if (!pointPlacementMode && !shapePlacementPreset) return;
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest(".leaflet-marker-icon, .leaflet-interactive, .leaflet-popup")) {
        return;
      }
      const [x, y] = leafletToWorld(event.latlng.lat, event.latlng.lng, imageWidth, imageHeight, snapToGrid, snapGridSize);
      if (shapePlacementPreset) {
        const marker = createQuickShapeMarker(shapePlacementPreset, x, y);
        const points = marker.points!.map((point) => worldToLeaflet(point, imageWidth, imageHeight));
        const layer = marker.type === "area"
          ? L.polygon(points, { color: marker.fill_color, fillColor: marker.fill_color, fillOpacity: marker.fill_opacity, weight: 2 })
          : L.polyline(points, { color: marker.fill_color, opacity: marker.fill_opacity, weight: 4 });
        setMapLayerMarkerId(layer, marker.id);
        layer.addTo(map);
        onPlaceQuickShape(marker, layer);
      } else {
        onPlacePointMarker(x, y);
      }
    },
    contextmenu(event) {
      if (!editingEnabled) return;
      const [x, y] = leafletToWorld(
        event.latlng.lat,
        event.latlng.lng,
        imageWidth,
        imageHeight,
        snapToGrid,
        snapGridSize,
      );

      const layerMarkerId = getMapLayerMarkerId(event.sourceTarget as L.Layer);
      const sourceMarkerId = layerMarkerId?.endsWith("::label")
        ? layerMarkerId.slice(0, -"::label".length)
        : layerMarkerId;
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
  editMode,
  campaignActivity,
  focusedMarkerId,
  markerEditMode,
  imageWidth,
  imageHeight,
  snapToGrid,
  snapGridSize,
  selectionMode,
  selectedMarkerIds,
  layerVisibility,
  layerLocks,
  customLayerVisibility,
  customLayerLocks,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onOpenMarkerEditor,
  onOpenMarkerMenu,
  onMarkerMove,
  onResizeShape,
  onToggleMarkerSelection,
}: MapMarkersProps) {
  const leafletMap = useMap();
  const groupDragOrigin = useRef<{ anchorId: string; x: number; y: number; markers: MapMarker[] } | null>(null);
  const mapLayers = map.layers ?? EMPTY_MAP_LAYERS;
  const paneNameByLayerId = new globalThis.Map<string, string>(mapLayers.map((layer) => [layer.id, mapLayerPaneName(layer.id)] as const));
  const unassignedPaneName = mapLayerPaneName(null);
  // Leaflet layers are constructed while child components render, so the panes must exist first.
  const unassignedPane = leafletMap.getPane(unassignedPaneName) ?? leafletMap.createPane(unassignedPaneName);
  unassignedPane.style.zIndex = "400";
  mapLayers.forEach((layer, index) => {
    const paneName = paneNameByLayerId.get(layer.id)!;
    const pane = leafletMap.getPane(paneName) ?? leafletMap.createPane(paneName);
    pane.style.zIndex = String(410 + mapLayers.length - index);
  });
  const paneForMarker = (marker: MapMarker) => marker.layer_id
    ? paneNameByLayerId.get(marker.layer_id) ?? unassignedPaneName
    : unassignedPaneName;
  const visibleMarkers = useMemo(() => map.markers.filter(
    (marker) => marker.visible && !marker.dm_only && (
      marker.type === "area" ? layerVisibility.areas
        : marker.type === "path" ? layerVisibility.paths
          : layerVisibility.points
    ) && (!marker.layer_id || customLayerVisibility[marker.layer_id] !== false),
  ), [customLayerVisibility, layerVisibility, map.markers]);
  const orderedMarkers = useMemo(
    () => [...visibleMarkers].sort((left, right) => (left.z_index ?? 0) - (right.z_index ?? 0)),
    [visibleMarkers],
  );

  useEffect(() => {
    const shapesById = new globalThis.Map<string, OrderedShapeLayer>();
    leafletMap.eachLayer((layer) => {
      if (!(layer instanceof L.Polygon || layer instanceof L.Polyline)) return;
      const markerId = getMapLayerMarkerId(layer);
      if (markerId) shapesById.set(markerId, layer);
    });

    orderedMarkers
      .filter((marker) => marker.type === "area" || marker.type === "path")
      .forEach((marker) => shapesById.get(marker.id)?.bringToFront());
  }, [leafletMap, orderedMarkers]);
  const beginGroupDrag = useCallback((markerId: string, x: number, y: number) => {
    if (!selectionMode || !selectedMarkerIds.includes(markerId)) {
      groupDragOrigin.current = null;
      return;
    }
    const markers = visibleMarkers.filter((marker) => selectedMarkerIds.includes(marker.id) && !isMapMarkerLocked(marker, layerLocks, customLayerLocks));
    if (markers.length < 2) {
      groupDragOrigin.current = null;
      return;
    }
    groupDragOrigin.current = { anchorId: markerId, x, y, markers: copyMarkers(markers) };
  }, [customLayerLocks, layerLocks, selectedMarkerIds, selectionMode, visibleMarkers]);
  const previewGroupDrag = useCallback((markerId: string, x: number, y: number) => {
    const origin = groupDragOrigin.current;
    if (!origin || origin.anchorId !== markerId) return;
    const [deltaX, deltaY] = getGroupTranslation(origin.markers, x - origin.x, y - origin.y);
    const markerById = new globalThis.Map<string, MapMarker>(origin.markers.map((marker): [string, MapMarker] => [marker.id, marker]));

    leafletMap.eachLayer((layer) => {
      const layerMarkerId = getMapLayerMarkerId(layer);
      if (!layerMarkerId) return;
      const isShapeLabel = layerMarkerId.endsWith("::label");
      const sourceMarkerId = isShapeLabel ? layerMarkerId.slice(0, -"::label".length) : layerMarkerId;
      if (sourceMarkerId === markerId) return;
      const source = markerById.get(sourceMarkerId);
      if (!source) return;
      const moved = offsetMapMarker(source, deltaX, deltaY);
      if (isShapeLabel && layer instanceof L.Marker && source.points) {
        const [labelX, labelY] = getLabelWorldPoint(source.points);
        layer.setLatLng(worldToLeaflet([labelX + deltaX, labelY + deltaY], imageWidth, imageHeight));
      } else if (layer instanceof L.Marker) {
        layer.setLatLng(worldToLeaflet([moved.x, moved.y], imageWidth, imageHeight));
      } else if ((layer instanceof L.Polygon || layer instanceof L.Polyline) && moved.points) {
        layer.setLatLngs(moved.points.map((point) => worldToLeaflet(point, imageWidth, imageHeight)));
        layer.redraw();
      }
    });
  }, [imageHeight, imageWidth, leafletMap]);
  const endGroupDrag = useCallback((markerId: string) => {
    if (groupDragOrigin.current?.anchorId === markerId) groupDragOrigin.current = null;
  }, []);

  useEffect(() => {
    if (!editMode || !selectionMode || selectedMarkerIds.length < 2) return;
    const handleShapeDragStart = (event: L.LeafletEvent) => {
      const layer = event.target as L.Layer;
      const markerId = getMapLayerMarkerId(layer);
      const marker = visibleMarkers.find((item) => item.id === markerId);
      const firstPoint = marker?.points?.[0];
      if (!markerId || !firstPoint) return;
      beginGroupDrag(markerId, firstPoint[0], firstPoint[1]);
    };
    const handleShapeDrag = (event: L.LeafletEvent) => {
      const layer = event.target as L.Layer;
      const markerId = getMapLayerMarkerId(layer);
      if (!markerId || groupDragOrigin.current?.anchorId !== markerId) return;
      const points = layerToPoints(layer, imageWidth, imageHeight);
      const firstPoint = points?.[0];
      if (firstPoint) previewGroupDrag(markerId, firstPoint[0], firstPoint[1]);
    };
    const handleShapeDragEnd = (event: L.LeafletEvent) => {
      const markerId = getMapLayerMarkerId(event.target as L.Layer);
      if (markerId) endGroupDrag(markerId);
    };
    const shapeLayers: L.Layer[] = [];
    leafletMap.eachLayer((layer) => {
      if (!(layer instanceof L.Polygon || layer instanceof L.Polyline)) return;
      const markerId = getMapLayerMarkerId(layer);
      const marker = map.markers.find((item) => item.id === markerId);
      if (!markerId || !selectedMarkerIds.includes(markerId) || !marker || isMapMarkerLocked(marker, layerLocks, customLayerLocks)) return;
      layer.on("pm:dragstart", handleShapeDragStart);
      layer.on("pm:drag", handleShapeDrag);
      layer.on("pm:dragend", handleShapeDragEnd);
      shapeLayers.push(layer);
    });
    return () => {
      shapeLayers.forEach((layer) => {
        layer.off("pm:dragstart", handleShapeDragStart);
        layer.off("pm:drag", handleShapeDrag);
        layer.off("pm:dragend", handleShapeDragEnd);
      });
    };
  }, [beginGroupDrag, customLayerLocks, editMode, endGroupDrag, imageHeight, imageWidth, layerLocks, leafletMap, map.markers, previewGroupDrag, selectedMarkerIds, selectionMode, visibleMarkers]);

  const resizeTarget = editMode && selectionMode && selectedMarkerIds.length === 1
    ? visibleMarkers.find((marker) => marker.id === selectedMarkerIds[0] && marker.type === "area" && !isMapMarkerLocked(marker, layerLocks, customLayerLocks) && (marker.points?.length ?? 0) >= 3)
    : undefined;
  const stampResizeTarget = editMode && selectionMode && selectedMarkerIds.length === 1
    ? visibleMarkers.find((marker) => marker.id === selectedMarkerIds[0] && marker.type !== "area" && marker.type !== "path" && !isMapMarkerLocked(marker, layerLocks, customLayerLocks) && marker.icon_image)
    : undefined;
  const stampSize = stampResizeTarget?.icon_size ?? 72;
  const stampHalfWidth = (stampSize / 2 / imageWidth) * 100;
  const stampHalfHeight = (stampSize / 2 / imageHeight) * 100;
  const stampResizeCorners = stampResizeTarget ? ([
    { corner: "north-west", x: stampResizeTarget.x - stampHalfWidth, y: stampResizeTarget.y - stampHalfHeight },
    { corner: "north-east", x: stampResizeTarget.x + stampHalfWidth, y: stampResizeTarget.y - stampHalfHeight },
    { corner: "south-west", x: stampResizeTarget.x - stampHalfWidth, y: stampResizeTarget.y + stampHalfHeight },
    { corner: "south-east", x: stampResizeTarget.x + stampHalfWidth, y: stampResizeTarget.y + stampHalfHeight },
  ] as const) : [];
  const resizePoints = resizeTarget?.points;
  const resizeBounds = resizePoints?.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  return (
    <>
      {orderedMarkers
        .filter(
          (marker) =>
            marker.type === "area" &&
            marker.points &&
            marker.points.length >= 3,
        )
        .map((marker) => (
          <Polygon
            key={`${marker.id}:${paneForMarker(marker)}`}
            pane={paneForMarker(marker)}
            positions={marker.points!.map((point) =>
              worldToLeaflet(point, imageWidth, imageHeight),
            )}
            pathOptions={{
              color: selectedMarkerIds.includes(marker.id) ? "#ffd166" : focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              fillColor: selectedMarkerIds.includes(marker.id) ? "#ffd166" : focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              fillOpacity: selectedMarkerIds.includes(marker.id) || focusedMarkerId === marker.id ? Math.max(marker.fill_opacity ?? 0.2, 0.4) : marker.fill_opacity ?? 0.2,
              weight: selectedMarkerIds.includes(marker.id) || focusedMarkerId === marker.id ? 4 : 2,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
                setMapLayerLocked(layer, isMapMarkerLocked(marker, layerLocks, customLayerLocks));
              }
            }}
            eventHandlers={{
              click: () => {
                if (selectionMode) {
                  if (!isMapMarkerLocked(marker, layerLocks, customLayerLocks)) onToggleMarkerSelection(marker.id);
                } else if (markerEditMode) {
                  if (!isMapMarkerLocked(marker, layerLocks, customLayerLocks)) onOpenMarkerEditor(marker.id);
                } else if (marker.linked_map) {
                  onOpenMap(marker.linked_map);
                } else if (marker.entity_id) {
                  onOpenEntity(marker.entity_id);
                }
              },
              contextmenu: (event) => {
                if (!editMode || isMapMarkerLocked(marker, layerLocks, customLayerLocks)) return;
                const [x, y] = leafletToWorld(
                  event.latlng.lat,
                  event.latlng.lng,
                  imageWidth,
                  imageHeight,
                  snapToGrid,
                  snapGridSize,
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

      {resizeTarget && resizeBounds && ([
        { corner: "north-west" as const, point: [resizeBounds.minX, resizeBounds.minY] as [number, number] },
        { corner: "north-east" as const, point: [resizeBounds.maxX, resizeBounds.minY] as [number, number] },
        { corner: "south-west" as const, point: [resizeBounds.minX, resizeBounds.maxY] as [number, number] },
        { corner: "south-east" as const, point: [resizeBounds.maxX, resizeBounds.maxY] as [number, number] },
      ].map(({ corner, point }) => (
        <Marker
          key={`${resizeTarget.id}-resize-${corner}`}
          position={worldToLeaflet(point, imageWidth, imageHeight)}
          icon={shapeResizeHandleIcon()}
          draggable
          pmIgnore
          keyboard={false}
          zIndexOffset={1000}
          eventHandlers={{
            click: (event) => event.originalEvent.stopPropagation(),
            dragend: (event) => {
              const latLng = (event.target as L.Marker).getLatLng();
              const dragPoint = leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight);
              const updatedMarker = resizeAreaFromCorner(resizeTarget, dragPoint, corner);
              if (updatedMarker) onResizeShape(updatedMarker);
            },
          }}
        />
      )))}

      {stampResizeTarget && stampResizeCorners.map(({ corner, x, y }) => (
        <Marker
          key={`${stampResizeTarget.id}-stamp-resize-${corner}`}
          position={worldToLeaflet([x, y], imageWidth, imageHeight)}
          icon={shapeResizeHandleIcon()}
          draggable
          pmIgnore
          keyboard={false}
          zIndexOffset={1000}
          eventHandlers={{
            click: (event) => event.originalEvent.stopPropagation(),
            dragend: (event) => {
              const latLng = (event.target as L.Marker).getLatLng();
              const [dragX, dragY] = leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight);
              const deltaX = ((dragX - stampResizeTarget.x) / 100) * imageWidth;
              const deltaY = ((dragY - stampResizeTarget.y) / 100) * imageHeight;
              const nextSize = Math.max(24, Math.min(256, Math.round(Math.hypot(deltaX, deltaY) * Math.SQRT2)));
              onResizeShape({ ...stampResizeTarget, icon_size: nextSize });
            },
          }}
        />
      ))}

      {orderedMarkers
        .filter(
          (marker) =>
            marker.type === "path" &&
            marker.points &&
            marker.points.length >= 2,
        )
        .map((marker) => (
          <Polyline
            key={`${marker.id}:${paneForMarker(marker)}`}
            pane={paneForMarker(marker)}
            positions={marker.points!.map((point) =>
              worldToLeaflet(point, imageWidth, imageHeight),
            )}
            pathOptions={{
              color: selectedMarkerIds.includes(marker.id) ? "#ffd166" : focusedMarkerId === marker.id ? "#64b5f6" : marker.fill_color ?? "#1976d2",
              weight: selectedMarkerIds.includes(marker.id) || focusedMarkerId === marker.id ? 7 : 4,
              opacity: selectedMarkerIds.includes(marker.id) || focusedMarkerId === marker.id ? 1 : 0.9,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
                setMapLayerLocked(layer, isMapMarkerLocked(marker, layerLocks, customLayerLocks));
              }
            }}
            eventHandlers={{
              click: () => {
                if (selectionMode) {
                  if (!isMapMarkerLocked(marker, layerLocks, customLayerLocks)) onToggleMarkerSelection(marker.id);
                } else if (markerEditMode) {
                  if (!isMapMarkerLocked(marker, layerLocks, customLayerLocks)) onOpenMarkerEditor(marker.id);
                } else if (marker.linked_map) {
                  onOpenMap(marker.linked_map);
                } else if (marker.entity_id) {
                  onOpenEntity(marker.entity_id);
                }
              },
              contextmenu: (event) => {
                if (!editMode || isMapMarkerLocked(marker, layerLocks, customLayerLocks)) return;
                const [x, y] = leafletToWorld(
                  event.latlng.lat,
                  event.latlng.lng,
                  imageWidth,
                  imageHeight,
                  snapToGrid,
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

      {orderedMarkers
        .filter((marker) => marker.type !== "area" && marker.type !== "path")
        .map((marker) => (
          // Story-linked activity is attached to existing location markers, so
          // the overlay remains aligned when a DM moves a marker.
          <CampaignMarker
            key={`${marker.id}:${paneForMarker(marker)}`}
            marker={marker}
            pane={paneForMarker(marker)}
            editMode={editMode}
            locked={isMapMarkerLocked(marker, layerLocks, customLayerLocks)}
            campaignActivity={markerEditMode ? [] : campaignActivity.filter((item) => item.locationId === marker.entity_id)}
            highlighted={focusedMarkerId === marker.id}
            markerEditMode={markerEditMode}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            snapToGrid={snapToGrid}
            snapGridSize={snapGridSize}
            selectionMode={selectionMode}
            selected={selectedMarkerIds.includes(marker.id)}
            onOpenEntity={onOpenEntity}
            onOpenMap={onOpenMap}
            getEntity={getEntity}
            onOpenMarkerEditor={onOpenMarkerEditor}
            onOpenMarkerMenu={onOpenMarkerMenu}
            onMarkerMove={onMarkerMove}
            onMarkerDragStart={(markerId) => beginGroupDrag(markerId, marker.x, marker.y)}
            onMarkerDrag={(markerId, x, y) => previewGroupDrag(markerId, x, y)}
            onMarkerDragEnd={endGroupDrag}
            onToggleMarkerSelection={onToggleMarkerSelection}
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
            key={`${marker.id}-label:${paneForMarker(marker)}`}
          pane={paneForMarker(marker)}
          position={worldToLeaflet(
            getLabelWorldPoint(marker.points!),
            imageWidth,
            imageHeight,
          )}
          icon={markerLabelIcon(marker.label!)}
          ref={(layer) => {
            if (layer) setMapLayerMarkerId(layer, `${marker.id}::label`);
          }}
          interactive={false}
            keyboard={false}
            pmIgnore
          />
        ))}
    </>
  );
}

function CampaignMarker({
  marker,
  pane,
  editMode,
  locked,
  campaignActivity,
  highlighted,
  markerEditMode,
  imageWidth,
  imageHeight,
  snapToGrid,
  snapGridSize,
  selectionMode,
  selected,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onOpenMarkerEditor,
  onOpenMarkerMenu,
  onMarkerMove,
  onMarkerDragStart,
  onMarkerDrag,
  onMarkerDragEnd,
  onToggleMarkerSelection,
}: CampaignMarkerProps) {
  const leafletMap = useMap();
  const [stampZoom, setStampZoom] = useState(leafletMap.getZoom());
  useEffect(() => {
    if (!marker.icon_image) return;
    const updateZoom = () => setStampZoom(leafletMap.getZoom());
    leafletMap.on("zoomend", updateZoom);
    return () => {
      leafletMap.off("zoomend", updateZoom);
    };
  }, [leafletMap, marker.icon_image]);

  const position = worldToLeaflet(
    [marker.x, marker.y],
    imageWidth,
    imageHeight,
  );
  const stampDisplaySize = marker.icon_image
    ? Math.max(1, (marker.icon_size ?? 72) * leafletMap.getZoomScale(stampZoom, 0))
    : undefined;
  // At maxZoom 5 Leaflet's vertical position z-index can span roughly
  // imageHeight * 32 pixels. One order step must exceed that span so an
  // explicit stack order takes precedence over the default geographic sort.
  const zIndexOffset = Math.min(marker.z_index ?? 0, 6_000) * (imageHeight * 32 + 1);

  return (
    <>
      <Marker
        position={position}
        pane={pane}
        zIndexOffset={zIndexOffset}
        icon={markerIcon(marker.icon, campaignActivity.length > 0 || highlighted || selected, marker.icon_image, stampDisplaySize, marker.rotation, marker.mirror_x, marker.mirror_y)}
        draggable={editMode && !locked}
        pmIgnore
        ref={(layer) => {
          if (layer) {
            setMapLayerMarkerId(layer, marker.id);
          }
        }}
        eventHandlers={{
          dragstart: () => onMarkerDragStart(marker.id),
          drag: (event) => {
            const latLng = (event.target as L.Marker).getLatLng();
            const [x, y] = leafletToWorld(latLng.lat, latLng.lng, imageWidth, imageHeight);
            onMarkerDrag(marker.id, x, y);
          },
          dragend: (event) => {
            const leafletMarker = event.target as L.Marker;
            const latLng = leafletMarker.getLatLng();
            const [x, y] = leafletToWorld(
              latLng.lat,
              latLng.lng,
              imageWidth,
              imageHeight,
              snapToGrid,
              snapGridSize,
            );
            onMarkerMove({
              ...marker,
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y)),
            });
            onMarkerDragEnd(marker.id);
          },
          click: () => {
            if (selectionMode) {
              if (!locked) onToggleMarkerSelection(marker.id);
            } else if (markerEditMode) {
              if (!locked) onOpenMarkerEditor(marker.id);
            } else if (campaignActivity.length === 0) {
              if (marker.linked_map) {
                onOpenMap(marker.linked_map);
              } else if (marker.entity_id) {
                onOpenEntity(marker.entity_id);
              }
            }
          },
          contextmenu: (event) => {
            if (!editMode || locked) return;
            const [x, y] = leafletToWorld(
              event.latlng.lat,
              event.latlng.lng,
              imageWidth,
              imageHeight,
              snapToGrid,
              snapGridSize,
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
        {(marker.tooltip || (!marker.hide_label && marker.label)) && (
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
          pmIgnore
        />
      )}
    </>
  );
}

function GeomanController({
  mapData,
  imageWidth,
  imageHeight,
  editMode,
  layerLocks,
  customLayerLocks,
  snapToGrid,
  snapGridSize,
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
    if (!editMode) {
      if (map.pm.globalDragModeEnabled()) {
        map.pm.disableGlobalDragMode();
      }
      map.pm.removeControls();
      return;
    }

    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawCircle: false,
      drawRectangle: false,
      drawText: false,
      drawPolyline: false,
      drawPolygon: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });
    map.pm.enableGlobalDragMode();

    return () => {
      if (map.pm.globalDragModeEnabled()) {
        map.pm.disableGlobalDragMode();
      }
      map.pm.removeControls();
    };
  }, [editMode, map]);

  useEffect(() => {
    if (!editMode || !drawShape) return;
    const shape = drawShape === "area" ? "Polygon" : "Line";
    map.pm.enableDraw(shape, {
      finishOnEnter: true,
    });
    return () => map.pm.disableDraw(shape);
  }, [drawShape, editMode, map]);

  useEffect(() => {
    map.eachLayer((layer) => {
      if (!(layer instanceof L.Polygon || layer instanceof L.Polyline)) return;
      const markerId = getMapLayerMarkerId(layer);
      const marker = mapData.markers.find((item) => item.id === markerId);
      if (marker) setMapLayerLocked(layer, isMapMarkerLocked(marker, layerLocks, customLayerLocks));
    });
  }, [customLayerLocks, layerLocks, map, mapData.markers]);

  useEffect(() => {
    const handleDrawEnd = () => onDrawShapeHandled();
    map.on("pm:drawend", handleDrawEnd);
    return () => {
      map.off("pm:drawend", handleDrawEnd);
    };
  }, [map, onDrawShapeHandled]);

  useEffect(() => {
    if (!editMode || !shapeEditId) return;
    const editedMarker = mapData.markers.find((marker) => marker.id === shapeEditId);
    if (!editedMarker || isMapMarkerLocked(editedMarker, layerLocks, customLayerLocks)) return;
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
  }, [customLayerLocks, editMode, layerLocks, map, mapData.markers, shapeEditId]);

  // ---------------------------------------------------------
  // Shape creation
  // ---------------------------------------------------------
  useEffect(() => {
    if (!editMode) return;
    const handleCreate = (event: GeomanCreateEvent) => {
      const points = layerToPoints(event.layer, imageWidth, imageHeight, snapToGrid, snapGridSize);

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
  }, [editMode, map, imageWidth, imageHeight, snapToGrid, snapGridSize, onShapeCreated]);

  // ---------------------------------------------------------
  // Existing shape editing / dragging
  // ---------------------------------------------------------
  useEffect(() => {
    const handleDragEnd = (event: GeomanEditEvent) => {
      const markerId = getMapLayerMarkerId(event.layer);

      if (!markerId) {
        return;
      }

      const points = layerToPoints(event.layer, imageWidth, imageHeight, snapToGrid, snapGridSize);

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

      const points = layerToPoints(event.layer, imageWidth, imageHeight, snapToGrid, snapGridSize);

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
  }, [map, mapData.markers, imageWidth, imageHeight, snapToGrid, snapGridSize, onShapeEdited]);

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
