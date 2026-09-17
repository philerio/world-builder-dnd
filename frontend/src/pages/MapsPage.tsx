import { useEffect, useState } from "react";

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
import Tooltip from "@mui/material/Tooltip";
import MapIcon from "@mui/icons-material/Map";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import type { EntitySummary, Map, WorldData } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import useEntityIndex from "../hooks/useEntityIndex";
import { useNavigate, useSearchParams } from "react-router-dom";

type MapCardProps = {
  map: Map;
  onOpen: () => void;
};
type MapMarkerLayerProps = {
  map: Map;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
};
type MapViewerProps = {
  map: Map;
  maps: Map[];
  onBack: () => void;
  fromWorldMap: boolean;
  onOpenEntity: (entityId: string) => void;
  onOpenMap: (mapId: string) => void;
  getEntity: (entityId: string) => EntitySummary | undefined;
};

function MapsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [maps, setMaps] = useState<Map[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    searchParams.get("map"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  const { getEntity } = useEntityIndex();

  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      })
      .then((data: WorldData) => {
        setMaps(data.maps);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  const openMap = (mapId: string) => {
    setSelectedMapId(mapId);
    setSearchParams({
      map: mapId,
      ...(searchParams.get("from") === "world-map"
        ? { from: "world-map" }
        : {}),
    });
  };
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [selectedMapId]);
  if (loading) {
    return <Typography color="text.secondary">Loading maps…</Typography>;
  }

  if (error) {
    return <Typography color="error">Could not load maps: {error}</Typography>;
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
          fromWorldMap={searchParams.get("from") === "world-map"}
          onOpenEntity={openEntity}
          onOpenMap={openMap}
          getEntity={getEntity}
        />

        <EntityDetailDrawer
          entityId={entityId}
          open={isOpen}
          onClose={closeEntity}
          onOpenEntity={openEntity}
          onBack={goBack}
          canGoBack={canGoBack}
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
  fromWorldMap,
  onOpenEntity,
  onOpenMap,
  getEntity,
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

function MapMarkerLayer({ map, onOpenEntity, onOpenMap }: MapMarkerLayerProps) {
  const visibleMarkers = map.markers.filter(
    (marker) => marker.visible && !marker.dm_only,
  );

  return (
    <Box
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
            sx={{
              position: "absolute",
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              width: 0,
              height: 0,
              pointerEvents: "auto",
              zIndex: 100,
            }}
          >
            <Tooltip title={marker.tooltip ?? ""}>
              <IconButton
                size="small"
                aria-label={marker.label ?? "Map location"}
                onClick={() => {
                  if (marker.linked_map) {
                    onOpenMap(marker.linked_map);
                  } else {
                    onOpenEntity(marker.entity_id);
                  }
                }}
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
                {isMapMarker ? (
                  <MapOutlinedIcon fontSize="small" />
                ) : (
                  <LocationOnIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            {marker.label && (
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
