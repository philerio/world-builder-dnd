import { useMemo, useEffect, useState, useRef } from "react";
import type { MouseEvent } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import Tooltip from "@mui/material/Tooltip";
import MapIcon from "@mui/icons-material/Map";
import CastleIcon from "@mui/icons-material/Castle";
import ChurchIcon from "@mui/icons-material/Church";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import HouseIcon from "@mui/icons-material/House";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ForestIcon from "@mui/icons-material/Forest";
import PlaceIcon from "@mui/icons-material/Place";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import type { DrawingState, EntitySummary, Map, MapMarker } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import useEntityIndex from "../hooks/useEntityIndex";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorldData } from "../context/WorldDataContext";
import MarkerDrawer from "../components/MarkerDrawer";
import MarkerContextMenu from "../components/MarkerContextMenu";

type MapCardProps = {
  map: Map;
  onOpen: () => void;
};

type MapMarkerLayerProps = {
  map: Map;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onOpenMarkerMenu: (target: MarkerMenuTarget) => void;
  onMarkerMove: (marker: MapMarker) => void;
  drawingState: DrawingState | null;
  onAddDrawingPoint: (point: [number, number]) => void;
};
type MarkerMenuTarget = {
  event: MouseEvent;
  x?: number;
  y?: number;
  markerId?: string;
};

type MapViewerProps = {
  map: Map;
  maps: Map[];
  onBack: () => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onOpenMarkerMenu: (target: MarkerMenuTarget) => void;
  onMarkerMove: (marker: MapMarker) => void;
  drawingState: DrawingState | null;
  onCancelDrawing: () => void;
  onAddDrawingPoint: (point: [number, number]) => void;
  onFinishDrawing: () => void;
};
type MarkerDrawerState = {
  open: boolean;
  mode: "create" | "edit";
  marker: MapMarker | null;
};

function MarkerIcon({ icon }: { icon?: string }) {
  switch (icon) {
    case "city":
      return <LocationCityIcon fontSize="small" />;

    case "castle":
      return <CastleIcon fontSize="small" />;

    case "church":
      return <ChurchIcon fontSize="small" />;

    case "farm":
      return <AgricultureIcon fontSize="small" />;

    case "forest":
      return <ForestIcon fontSize="small" />;

    case "map":
      return <MapOutlinedIcon fontSize="small" />;

    case "house":
      return <HouseIcon fontSize="small" />;

    case "location":
    default:
      return <PlaceIcon fontSize="small" />;
  }
}
const isPointInPolygon = (
  point: [number, number],
  polygon: [number, number][],
) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const distanceToSegment = (
  point: [number, number],
  start: [number, number],
  end: [number, number],
) => {
  const [px, py] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)),
  );

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.hypot(px - closestX, py - closestY);
};

const isPointNearPath = (
  point: [number, number],
  path: [number, number][],
  tolerance = 1.5,
) => {
  for (let i = 1; i < path.length; i += 1) {
    if (distanceToSegment(point, path[i - 1], path[i]) <= tolerance) {
      return true;
    }
  }

  return false;
};
function MapsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    searchParams.get("map"),
  );
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [markerDrawer, setMarkerDrawer] = useState<MarkerDrawerState>({
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

  const startDrawing = (type: "area" | "path") => {
    if (!markerDrawer.marker) {
      return;
    }

    setDrawingState({
      markerId: markerDrawer.marker.id,
      type,
      points: [],
    });

    setMarkerDrawer({
      open: false,
      mode: markerDrawer.mode,
      marker: markerDrawer.marker,
    });
  };

  const cancelDrawing = () => {
    if (!markerDrawer.marker) {
      setDrawingState(null);
      return;
    }

    setDrawingState(null);

    setMarkerDrawer({
      open: true,
      mode: markerDrawer.mode,
      marker: markerDrawer.marker,
    });
  };
  const finishDrawing = () => {
    if (!drawingState) {
      return;
    }

    const marker = markerDrawer.marker;

    if (!marker) {
      return;
    }

    setMarkerDrawer({
      open: true,
      mode: markerDrawer.mode,
      marker: {
        ...marker,
        type: drawingState.type,
        points: drawingState.points,
      },
    });

    setDrawingState(null);
  };
  const addDrawingPoint = (point: [number, number]) => {
    setDrawingState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        points: [...current.points, point],
      };
    });
  };
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

  useEffect(() => {
    if (mapSummaries.length === 0) {
      return;
    }

    void loadEntities(mapSummaries.map((map) => map.id));
  }, [loadEntities, mapSummaries]);

  const maps = mapSummaries
    .map((summary) => getWorldEntity(summary.id)?.entity)
    .filter((entity): entity is Record<string, unknown> => Boolean(entity))
    .map((entity) => entity as unknown as Map);

  const openMap = (mapId: string) => {
    setSelectedMapId(mapId);
    setSearchParams({
      map: mapId,
      ...(searchParams.get("from") === "world-map"
        ? { from: "world-map" }
        : {}),
    });
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
    } catch (error) {
      console.error("Failed to move marker:", error);
    }
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

  const handleOpenMarkerMenu = ({
    event,
    x,
    y,
    markerId,
  }: MarkerMenuTarget) => {
    event.preventDefault();

    setMarkerContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      mapX: x ?? 0,
      mapY: y ?? 0,
      markerId: markerId ?? null,
    });
  };
  const handleCreateMarker = () => {
    if (!markerContextMenu) {
      return;
    }

    const marker: MapMarker = {
      id: crypto.randomUUID(),
      entity_id: "",
      x: markerContextMenu.mapX,
      y: markerContextMenu.mapY,
      visible: true,
      dm_only: false,
      hide_label: false,
      icon: "location",
    };

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

    const updatedMarkers = selectedMap.markers.filter(
      (marker) => marker.id !== markerContextMenu.markerId,
    );

    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: updatedMarkers,
      });

      setMarkerContextMenu(null);
    } catch (error) {
      console.error("Failed to delete marker:", error);
    }
  };
  const handleSaveMarker = async (marker: MapMarker) => {
    if (!selectedMap) {
      return;
    }

    const updatedMarkers = [
      ...selectedMap.markers.filter(
        (existingMarker) => existingMarker.id !== marker.id,
      ),
      marker,
    ];

    try {
      await updateEntity(selectedMap.id, {
        ...selectedMap,
        markers: updatedMarkers,
      });

      setMarkerDrawer({
        open: false,
        mode: "create",
        marker: null,
      });
    } catch (error) {
      console.error("Failed to save marker:", error);
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
  const selectedMap = maps.find((map) => map.id === selectedMapId);
  const handleBack = () => {
    if (searchParams.get("from") === "world-map") {
      navigate("/world-map");
      return;
    }

    setSelectedMapId(null);
    setSearchParams({});
  };
  if (selectedMap) {
    return (
      <>
        <MapViewer
          map={selectedMap}
          maps={maps}
          onBack={handleBack}
          onOpenEntity={openEntity}
          onOpenMap={openMap}
          getEntity={getEntity}
          onOpenMarkerMenu={handleOpenMarkerMenu}
          onMarkerMove={handleMarkerMove}
          drawingState={drawingState}
          onCancelDrawing={cancelDrawing}
          onAddDrawingPoint={addDrawingPoint}
          onFinishDrawing={finishDrawing}
        />

        <EntityDetailDrawer
          entityId={entityId}
          open={isOpen}
          onClose={closeEntity}
          onOpenEntity={openEntity}
          onBack={goBack}
          canGoBack={canGoBack}
        />
        <MarkerDrawer
          open={markerDrawer.open}
          marker={markerDrawer.marker}
          mode={markerDrawer.mode}
          onClose={() =>
            setMarkerDrawer({
              open: false,
              mode: "create",
              marker: null,
            })
          }
          onSave={handleSaveMarker}
          onStartDrawing={startDrawing}
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
  onBack,
  onOpenEntity,
  onOpenMap,
  getEntity,
  onOpenMarkerMenu,
  onMarkerMove,
  drawingState,
  onCancelDrawing,
  onAddDrawingPoint,
  onFinishDrawing,
}: MapViewerProps) {
  const entity = map.entity_id ? getEntity(map.entity_id) : undefined;
  const parentMap = map.parent_map
    ? maps.find((candidate) => candidate.id === map.parent_map)
    : undefined;
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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (parentMap?.map_type === "world") {
              onBack();
            } else if (parentMap) {
              onOpenMap(parentMap.id);
            } else {
              onBack();
            }
          }}
          sx={{
            mb: 3,
            px: 0,
            minWidth: 0,
            color: "primary.main",
            "&:hover": {
              backgroundColor: "transparent",
            },
          }}
        >
          {parentMap?.map_type === "world"
            ? "Back to World Map"
            : parentMap
              ? `Back to ${parentMap.name}`
              : "Back to Maps"}{" "}
        </Button>

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
      </Box>

      <Box
        sx={{
          p: { xs: 2, md: 4 },
          backgroundColor: "background.default",
        }}
      >
        {map.image_path ? (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              overflow: "auto",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <Box
                component="img"
                onContextMenu={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();

                  const x = ((event.clientX - rect.left) / rect.width) * 100;
                  const y = ((event.clientY - rect.top) / rect.height) * 100;

                  onOpenMarkerMenu({
                    event,
                    x,
                    y,
                  });
                }}
                src={map.image_path}
                alt={map.name}
                sx={{
                  display: "block",
                  width: "auto",
                  maxWidth: "100%",
                  height: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              />
              <MapMarkerLayer
                map={map}
                onOpenEntity={onOpenEntity}
                onOpenMap={onOpenMap}
                onOpenMarkerMenu={onOpenMarkerMenu}
                onMarkerMove={onMarkerMove}
                drawingState={drawingState}
                onAddDrawingPoint={onAddDrawingPoint}
              />
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary">
            No map image has been assigned.
          </Typography>
        )}
      </Box>
      {drawingState && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            backgroundColor: "background.paper",
            p: 1,
            borderRadius: 1,
            boxShadow: 3,
          }}
        >
          <Button
            variant="contained"
            onClick={onFinishDrawing}
            disabled={
              drawingState.type === "area"
                ? drawingState.points.length < 3
                : drawingState.points.length < 2
            }
          >
            Done
          </Button>

          <Button variant="outlined" onClick={onCancelDrawing}>
            Cancel
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function MapMarkerLayer({
  map,
  onOpenEntity,
  onOpenMap,
  onOpenMarkerMenu,
  onMarkerMove,
  drawingState,
  onAddDrawingPoint,
}: MapMarkerLayerProps) {
  const visibleMarkers = map.markers.filter(
    (marker) => marker.visible && !marker.dm_only,
  );
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<{
    marker: MapMarker;
    x: number;
    y: number;
  } | null>(null);
  const mapLayerRef = useRef<HTMLDivElement | null>(null);
  const draggedMarkerRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const getMarkerAtPosition = (x: number, y: number) => {
    const point: [number, number] = [x, y];
    const pointMarker = map.markers.find(
      (marker) =>
        marker.visible &&
        !marker.dm_only &&
        marker.type !== "area" &&
        marker.type !== "path" &&
        Math.hypot(x - marker.x, y - marker.y) <= 2,
    );
    if (pointMarker) return pointMarker;
    const path = map.markers.find((marker) => {
      if (
        !marker.visible ||
        marker.dm_only ||
        marker.type !== "path" ||
        !marker.points ||
        marker.points.length < 2
      ) {
        return false;
      }

      return isPointNearPath(point, marker.points);
    });

    if (path) {
      return path;
    }
    const area = map.markers.find((marker) => {
      if (
        !marker.visible ||
        marker.dm_only ||
        marker.type !== "area" ||
        !marker.points ||
        marker.points.length < 3
      ) {
        return false;
      }

      return isPointInPolygon(point, marker.points);
    });

    if (area) {
      return area;
    }
  };
  const getPointerPosition = (event: React.PointerEvent | React.MouseEvent) => {
    if (!mapLayerRef.current) {
      return null;
    }

    const rect = mapLayerRef.current.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handleMarkerPointerDown = (
    event: React.PointerEvent,
    marker: MapMarker,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    draggedMarkerRef.current = marker.id;
    didDragRef.current = false;

    setDraggingMarkerId(marker.id);
    setDragPosition({
      x: marker.x,
      y: marker.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMarkerPointerMove = (event: React.PointerEvent) => {
    const markerId = draggedMarkerRef.current;

    if (!markerId) {
      return;
    }

    const position = getPointerPosition(event);

    if (!position) {
      return;
    }

    const marker = map.markers.find(
      (currentMarker) => currentMarker.id === markerId,
    );

    if (!marker) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(position.x - marker.x, 2) + Math.pow(position.y - marker.y, 2),
    );

    if (distance > 0.5) {
      didDragRef.current = true;
      setDragPosition(position);
    }
  };

  const handleMarkerPointerUp = (event: React.PointerEvent) => {
    const markerId = draggedMarkerRef.current;

    if (!markerId) {
      return;
    }

    const position = getPointerPosition(event);

    const marker = map.markers.find(
      (currentMarker) => currentMarker.id === markerId,
    );

    if (position && marker && didDragRef.current) {
      onMarkerMove({
        ...marker,
        x: position.x,
        y: position.y,
      });
    }

    setDraggingMarkerId(null);
    setDragPosition(null);
    draggedMarkerRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (didDragRef.current) {
      requestAnimationFrame(() => {
        didDragRef.current = false;
      });
    }
  };
  return (
    <Box
      ref={mapLayerRef}
      onContextMenu={(event) => {
        event.preventDefault();

        if (drawingState) {
          return;
        }

        const position = getPointerPosition(event);

        if (!position) {
          return;
        }

        const marker = getMarkerAtPosition(position.x, position.y);

        onOpenMarkerMenu({
          event,
          x: position.x,
          y: position.y,
          markerId: marker?.id,
        });
      }}
      onPointerDown={(event) => {
        if (!drawingState) {
          return;
        }

        event.preventDefault();

        const position = getPointerPosition(event);

        if (!position) {
          return;
        }

        onAddDrawingPoint([position.x, position.y]);
      }}
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
      }}
      onPointerMove={(event) => {
        if (drawingState) {
          setHoveredMarker(null);
          return;
        }

        const position = getPointerPosition(event);

        if (!position) {
          setHoveredMarker(null);
          return;
        }

        const marker = getMarkerAtPosition(position.x, position.y);

        if (!marker?.tooltip) {
          setHoveredMarker(null);
          return;
        }

        setHoveredMarker({
          marker,
          x: position.x,
          y: position.y,
        });
      }}
      onPointerLeave={() => {
        setHoveredMarker(null);
      }}
      onClick={(event) => {
        if (drawingState || didDragRef.current) {
          return;
        }

        const position = getPointerPosition(event);

        if (!position) {
          return;
        }

        const marker = getMarkerAtPosition(position.x, position.y);
        if (!marker) {
          return;
        }

        if (marker.linked_map) {
          onOpenMap(marker.linked_map);
        } else if (marker.entity_id) {
          onOpenEntity(marker.entity_id);
        }
      }}
    >
      {hoveredMarker && (
        <Box
          sx={{
            position: "absolute",
            left: `${hoveredMarker.x}%`,
            top: `${hoveredMarker.y}%`,
            transform: "translate(12px, 12px)",
            zIndex: 150,
            maxWidth: 280,
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            backgroundColor: "grey.900",
            color: "common.white",
            fontSize: "0.8rem",
            lineHeight: 1.4,
            boxShadow: 3,
            pointerEvents: "none",
          }}
        >
          {hoveredMarker.marker.tooltip}
        </Box>
      )}
      {/* Area overlays */}
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
          zIndex: 10,
        }}
      >
        {visibleMarkers
          .filter(
            (marker) =>
              marker.type === "area" &&
              marker.points &&
              marker.points.length >= 3,
          )
          .map((marker) => (
            <polygon
              key={marker.id}
              points={marker.points?.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={marker.fill_color ?? "#1976d2"}
              fillOpacity={marker.fill_opacity ?? 0.2}
              stroke={marker.fill_color ?? "#1976d2"}
              strokeOpacity={0.8}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </Box>
      {visibleMarkers
        .filter(
          (marker) =>
            marker.type === "area" &&
            marker.points &&
            marker.points.length >= 3 &&
            marker.label &&
            !marker.hide_label,
        )
        .map((marker) => {
          const centerX =
            marker.points!.reduce((sum, [x]) => sum + x, 0) /
            marker.points!.length;

          const centerY =
            marker.points!.reduce((sum, [, y]) => sum + y, 0) /
            marker.points!.length;

          return (
            <Typography
              key={`area-label-${marker.id}`}
              variant="caption"
              sx={{
                position: "absolute",
                left: `${centerX}%`,
                top: `${centerY}%`,
                transform: "translate(-50%, -50%)",
                px: 0.75,
                py: 0.5,
                borderRadius: 0.75,
                backgroundColor: "background.paper",
                border: 1,
                borderColor: "divider",
                whiteSpace: "nowrap",
                boxShadow: 1,
                pointerEvents: "none",
              }}
            >
              {marker.label}
            </Typography>
          );
        })}
      {/* Path overlays */}
      {visibleMarkers
        .filter(
          (marker) =>
            marker.type === "path" &&
            marker.points &&
            marker.points.length >= 2 &&
            marker.label &&
            !marker.hide_label,
        )
        .map((marker) => {
          const middlePoint =
            marker.points![Math.floor(marker.points!.length / 2)];

          return (
            <Typography
              key={`path-label-${marker.id}`}
              variant="caption"
              sx={{
                position: "absolute",
                left: `${middlePoint[0]}%`,
                top: `${middlePoint[1]}%`,
                transform: "translate(-50%, -50%)",
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                backgroundColor: "background.paper",
                border: 1,
                borderColor: "divider",
                whiteSpace: "nowrap",
                boxShadow: 1,
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              {marker.label}
            </Typography>
          );
        })}
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
          zIndex: 20,
        }}
      >
        {visibleMarkers
          .filter(
            (marker) =>
              marker.type === "path" &&
              marker.points &&
              marker.points.length >= 2,
          )
          .map((marker) => (
            <polyline
              key={marker.id}
              points={marker.points?.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke={marker.fill_color ?? "#1976d2"}
              strokeOpacity={0.9}
              strokeWidth={6}
              pointerEvents="visiblePainted"
              vectorEffect="non-scaling-stroke"
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();

                onOpenMarkerMenu({
                  event,
                  markerId: marker.id,
                });
              }}
            >
              {marker.tooltip && <title>{marker.tooltip}</title>}
            </polyline>
          ))}
      </Box>
      {drawingState && drawingState.points.length > 0 && (
        <Box
          component="svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          {drawingState.type === "area" && drawingState.points.length >= 3 && (
            <polygon
              points={drawingState.points
                .map(([x, y]) => `${x},${y}`)
                .join(" ")}
              fill="#1976d2"
              fillOpacity={0.15}
              stroke="#1976d2"
              strokeWidth={.5}
              strokeOpacity={0.9}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {drawingState.type === "path" && drawingState.points.length >= 2 && (
            <polyline
              points={drawingState.points
                .map(([x, y]) => `${x},${y}`)
                .join(" ")}
              fill="none"
              stroke="#1976d2"
              strokeWidth={.5}
              strokeOpacity={0.9}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {drawingState.points.map(([x, y], index) => (
            <circle
              key={`${x}-${y}-${index}`}
              cx={x}
              cy={y}
              r=".6"
              fill="#1976d2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </Box>
      )}
      {/* Point markers */}
      {visibleMarkers
        .filter((marker) => marker.type !== "area" && marker.type !== "path")
        .map((marker) => {
          return (
            <Box
              key={marker.id}
              onContextMenu={(event) => {
                event.stopPropagation();

                onOpenMarkerMenu({
                  event,
                  markerId: marker.id,
                });
              }}
              sx={{
                position: "absolute",
                left: `${
                  draggingMarkerId === marker.id && dragPosition
                    ? dragPosition.x
                    : marker.x
                }%`,
                top: `${
                  draggingMarkerId === marker.id && dragPosition
                    ? dragPosition.y
                    : marker.y
                }%`,
                width: 0,
                height: 0,
                pointerEvents: "auto",
                zIndex: 1000,
                cursor: draggingMarkerId === marker.id ? "grabbing" : "grab",
              }}
              onPointerDown={(event) => handleMarkerPointerDown(event, marker)}
              onPointerMove={handleMarkerPointerMove}
              onPointerUp={handleMarkerPointerUp}
              onPointerCancel={handleMarkerPointerUp}
              onClick={() => {
                if (didDragRef.current) {
                  return;
                }

                if (marker.linked_map) {
                  onOpenMap(marker.linked_map);
                } else if (marker.entity_id) {
                  onOpenEntity(marker.entity_id);
                }
              }}
            >
              <Tooltip title={marker.tooltip ?? ""}>
                <IconButton
                  size="small"
                  aria-label={marker.label ?? "Map location"}
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "translate(-50%, -100%)",
                    pointerEvents: "auto",
                    color: "primary.main",
                    backgroundColor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    boxShadow: 2,
                    "&:hover": {
                      backgroundColor: "background.paper",
                    },
                  }}
                >
                  <MarkerIcon icon={marker.icon} />
                </IconButton>
              </Tooltip>

              {marker.label && !marker.hide_label && (
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    left: 0,
                    bottom: 32,
                    transform: "translateX(-50%)",
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    backgroundColor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    whiteSpace: "nowrap",
                    boxShadow: 1,
                    pointerEvents: "none",
                  }}
                >
                  {marker.label}
                </Typography>
              )}
            </Box>
          );
        })}
    </Box>
  );
}

export default MapsPage;
