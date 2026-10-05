import { createElement, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polygon,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
import type { EntitySummary, Map, MapMarker } from "../types";
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
  onBack: () => void;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
  onShapeCreated: (marker: MapMarker) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type LeafletMapProps = {
  map: Map;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
  onShapeCreated: (marker: MapMarker) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapContextMenuProps = {
  imageWidth: number;
  imageHeight: number;
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
  onShapeCreated: (marker: MapMarker) => void;
  onShapeEdited: (marker: MapMarker) => void;
};

type MapMarkersProps = {
  map: Map;
  imageWidth: number;
  imageHeight: number;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
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
  imageWidth: number;
  imageHeight: number;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  onOpenMarkerMenu: (
    event: React.MouseEvent,
    x: number,
    y: number,
    markerId?: string,
  ) => void;
  onMarkerMove: (marker: MapMarker) => void;
};

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

function markerIcon(icon?: string) {
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
          border: 2px solid #c9a85b;
          color: #d9b86c;
          box-shadow: 0 2px 6px rgba(0,0,0,0.65);
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

  const selectedMap = maps.find((map) => map.id === selectedMapId);

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
    } catch (error) {
      console.error("Failed to move marker:", error);
    }
  };

  const handleShapeCreated = (marker: MapMarker) => {
    setMarkerDrawer({
      open: true,
      mode: "create",
      marker,
    });
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
    } catch (error) {
      console.error("Failed to save edited shape:", error);
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
      entity_id: "",
      x: markerContextMenu.mapX,
      y: markerContextMenu.mapY,
      visible: true,
      dm_only: false,
      hide_label: false,
      icon: "location",
      type: "point",
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
          onShapeCreated={handleShapeCreated}
          onShapeEdited={handleShapeEdited}
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
  onShapeCreated,
  onShapeEdited,
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
              : "Back to Maps"}
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
          <LeafletMap
            map={map}
            onOpenEntity={onOpenEntity}
            onOpenMap={onOpenMap}
            onOpenMarkerMenu={onOpenMarkerMenu}
            onMarkerMove={onMarkerMove}
            onShapeCreated={onShapeCreated}
            onShapeEdited={onShapeEdited}
          />
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
  onOpenEntity,
  onOpenMap,
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

            <MapImage imageUrl={map.image_path!} bounds={imageBounds} />

            <MapResetButton
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
            />

            <MapContextMenu
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              onOpenMarkerMenu={onOpenMarkerMenu}
            />

            <MapMarkers
              map={map}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              onOpenEntity={onOpenEntity}
              onOpenMap={onOpenMap}
              onOpenMarkerMenu={onOpenMarkerMenu}
              onMarkerMove={onMarkerMove}
            />

            <GeomanController
              mapData={map}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              onShapeCreated={onShapeCreated}
              onShapeEdited={onShapeEdited}
            />
          </>
        )}
      </MapContainer>
    </Box>
  );
}

function MapContextMenu({
  imageWidth,
  imageHeight,
  onOpenMarkerMenu,
}: MapContextMenuProps) {
  const map = useMap();

  useMapEvents({
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
  imageWidth,
  imageHeight,
  onOpenEntity,
  onOpenMap,
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
              color: marker.fill_color ?? "#1976d2",
              fillColor: marker.fill_color ?? "#1976d2",
              fillOpacity: marker.fill_opacity ?? 0.2,
              weight: 2,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
              }
            }}
            eventHandlers={{
              click: () => {
                if (marker.linked_map) {
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
              color: marker.fill_color ?? "#1976d2",
              weight: 4,
              opacity: 0.9,
            }}
            ref={(layer) => {
              if (layer) {
                setMapLayerMarkerId(layer, marker.id);
              }
            }}
            eventHandlers={{
              click: () => {
                if (marker.linked_map) {
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
          <CampaignMarker
            key={marker.id}
            marker={marker}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onOpenEntity={onOpenEntity}
            onOpenMap={onOpenMap}
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
  imageWidth,
  imageHeight,
  onOpenEntity,
  onOpenMap,
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
        icon={markerIcon(marker.icon)}
        draggable
        pmIgnore
        ref={(layer) => {
          if (layer) {
            setMapLayerMarkerId(layer, marker.id);
          }
        }}
        eventHandlers={{
          dragend: (event) => {
            console.log("dragend!");

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
              x,
              y,
            });
          },
          click: (e) => {
            console.log("click!", e);
            if (marker.linked_map) {
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
        entity_id: "",
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

      event.layer.removeFrom(map);
      onShapeCreated(marker);
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
      console.log("[Geoman] dragend fired", event);

      const markerId = getMapLayerMarkerId(event.layer);
      console.log("[Geoman] dragged marker ID:", markerId);

      if (!markerId) {
        console.log("[Geoman] dragged layer has no marker ID");
        return;
      }

      const points = layerToPoints(event.layer, imageWidth, imageHeight);

      console.log("[Geoman] dragged layer points:", points);

      if (!points) {
        return;
      }

      const existingMarker = mapData.markers.find(
        (marker) => marker.id === markerId,
      );

      if (!existingMarker) {
        console.log("[Geoman] dragged marker not found");
        return;
      }

      const updatedMarker: MapMarker = {
        ...existingMarker,
        points,
        x: points[0]?.[0] ?? existingMarker.x,
        y: points[0]?.[1] ?? existingMarker.y,
      };

      console.log("[Geoman] saving dragged layer:", updatedMarker);

      onShapeEdited(updatedMarker);
    };

    const handleEdit = (event: GeomanEditEvent) => {
      console.log("[Geoman] edit event fired", event);

      const markerId = getMapLayerMarkerId(event.layer);
      console.log("[Geoman] marker ID:", markerId);

      if (!markerId) {
        console.log("[Geoman] no marker ID found");
        return;
      }

      const points = layerToPoints(event.layer, imageWidth, imageHeight);

      console.log("[Geoman] converted points:", points);

      if (!points) {
        console.log("[Geoman] could not convert layer to points");
        return;
      }

      const existingMarker = mapData.markers.find(
        (marker) => marker.id === markerId,
      );

      console.log("[Geoman] existing marker:", existingMarker);

      if (!existingMarker) {
        console.log("[Geoman] marker not found in mapData");
        return;
      }

      const updatedMarker: MapMarker = {
        ...existingMarker,
        points,
        x: points[0]?.[0] ?? existingMarker.x,
        y: points[0]?.[1] ?? existingMarker.y,
      };

      console.log("[Geoman] calling onShapeEdited:", updatedMarker);

      onShapeEdited(updatedMarker);
    };

    const shapeLayers: L.Layer[] = [];

    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        const markerId = getMapLayerMarkerId(layer);

        if (markerId) {
          console.log("[Geoman] attaching handlers to:", markerId);

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
