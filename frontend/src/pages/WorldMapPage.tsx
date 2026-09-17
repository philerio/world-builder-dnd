import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import type { Map, WorldData } from "../types";

type WorldMapMarkerProps = {
  marker: Map["markers"][number];
  onOpenMap: (mapId: string) => void;
};
type WorldMapMarkerAppearance = {
  icon: React.ReactNode;
  labelBackground: string;
};
function getWorldMapMarkerAppearance(): WorldMapMarkerAppearance {
  return {
    icon: <MapOutlinedIcon />,
    labelBackground: "rgba(17, 19, 24, 0.88)",
  };
}
function WorldMapMarker({ marker, onOpenMap }: WorldMapMarkerProps) {
  if (!marker.visible || marker.dm_only || !marker.linked_map) {
    return null;
  }
  const appearance = getWorldMapMarkerAppearance();
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpenMap(marker.linked_map!)}
      sx={{
        position: "absolute",
        left: `${marker.x}%`,
        top: `${marker.y}%`,
        transform: "translate(-50%, -100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: 0,
        background: "transparent",
        color: "text.primary",
        cursor: "pointer",
        p: 0,
        zIndex: 2,
        "&:hover .world-map-marker-icon": {
          transform: "scale(1.12)",
          backgroundColor: "primary.main",
          color: "background.paper",
        },
        "&:hover .world-map-marker-label": {
          color: "primary.main",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      <Box
        className="world-map-marker-icon"
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "background.paper",
          border: 2,
          borderColor: "primary.main",
          color: "primary.main",
          boxShadow: 3,
          transition: "transform 0.2s ease, background-color 0.2s ease",
        }}
      >
        {appearance.icon}
      </Box>

      {marker.label && (
        <Typography
          className="world-map-marker-label"
          variant="body2"
          sx={{
            mt: 0.75,
            px: 1,
            py: 0.35,
            borderRadius: 1,
            backgroundColor: appearance.labelBackground,
            color: "text.primary",
            fontWeight: 600,
            whiteSpace: "nowrap",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.8)",
            transition: "color 0.2s ease",
          }}
        >
          {marker.label}
        </Typography>
      )}
    </Box>
  );
}

function WorldMapPage() {
  const navigate = useNavigate();

  const [worldMap, setWorldMap] = useState<Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      })
      .then((data: WorldData) => {
        const map = data.maps.find(
          (candidate) => candidate.id === "elligaesia-world-map",
        );

        if (!map) {
          throw new Error("World map not found");
        }

        setWorldMap(map);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const openMap = (mapId: string) => {
    navigate(`/maps?map=${mapId}&from=world-map`);
  };

  if (loading) {
    return <Typography color="text.secondary">Loading world map…</Typography>;
  }

  if (error) {
    return (
      <Typography color="error">Could not load world map: {error}</Typography>
    );
  }

  if (!worldMap) {
    return (
      <Typography color="text.secondary">
        No world map has been configured.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: "0.15em" }}
        >
          WORLD BUILDER
        </Typography>

        <Typography variant="h1" sx={{ mt: 0.5 }}>
          World Map
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Explore the known world and navigate into its continents.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 1400,
            overflow: "hidden",
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <Box
            component="img"
            src={worldMap.image_path}
            alt={worldMap.name}
            sx={{
              display: "block",
              width: "100%",
              height: "auto",
            }}
          />

          {worldMap.markers.map((marker) => (
            <WorldMapMarker
              key={marker.id}
              marker={marker}
              onOpenMap={openMap}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default WorldMapPage;
