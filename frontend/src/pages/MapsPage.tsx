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
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ForestIcon from "@mui/icons-material/Forest";
import PlaceIcon from "@mui/icons-material/Place";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import type { EntitySummary, Map, MapMarker } from "../types";
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

    case "forest":
      return <ForestIcon fontSize="small" />;

    case "map":
      return <MapOutlinedIcon fontSize="small" />;

    case "location":
    default:
      return <PlaceIcon fontSize="small" />;
  }
}

function MapsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    searchParams.get("map"),
  );
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
              />
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary">
            No map image has been assigned.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function MapMarkerLayer({
  map,
  onOpenEntity,
  onOpenMap,
  onOpenMarkerMenu,
  onMarkerMove,
}: MapMarkerLayerProps) {
  const visibleMarkers = map.markers.filter(
    (marker) => marker.visible && !marker.dm_only,
  );
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const mapLayerRef = useRef<HTMLDivElement | null>(null);
  const draggedMarkerRef = useRef<string | null>(null);
  const didDragRef = useRef(false);

  const getPointerPosition = (event: React.PointerEvent) => {
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
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {visibleMarkers.map((marker) => {
        const isMapMarker = Boolean(marker.linked_map);

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
              zIndex: 100,
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
              } else {
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
