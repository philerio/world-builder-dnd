import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import MapIcon from "@mui/icons-material/Map";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

import type { Map, WorldData } from "../types";

type MapCardProps = {
  map: Map;
  onOpen: () => void;
};

function MapsPage() {
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

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

  if (loading) {
    return <Typography color="text.secondary">Loading maps…</Typography>;
  }

  if (error) {
    return <Typography color="error">Could not load maps: {error}</Typography>;
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
                <MapCard map={map} onOpen={() => openEntity(map.id)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <EntityDetailDrawer
        entityId={entityId}
        open={isOpen}
        onClose={closeEntity}
        onOpenEntity={openEntity}
        onBack={goBack}
        canGoBack={canGoBack}
      />
    </Box>
  );
}

function MapCard({ map, onOpen }: MapCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea sx={{ height: "100%" }} onClick={onOpen}>
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

export default MapsPage;
