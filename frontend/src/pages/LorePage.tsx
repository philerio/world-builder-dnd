import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import MenuBookIcon from "@mui/icons-material/MenuBook";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

import type { Lore } from "../types";

type LoreCardProps = {
  lore: Lore;
  onOpen: () => void;
};

type LoreSectionProps = {
  lore: Lore[];
  onOpen: (id: string) => void;
};

function LorePage() {
  const [lore, setLore] = useState<Lore[]>([]);
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
      .then((data) => {
        setLore(data.lores);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Typography color="text.secondary">Loading lore…</Typography>;
  }

  if (error) {
    return <Typography color="error">Could not load lore: {error}</Typography>;
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
          Lore
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Knowledge, history, traditions, and secrets of the world.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <LoreSection lore={lore} onOpen={openEntity} />
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

function LoreSection({ lore, onOpen }: LoreSectionProps) {
  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1.5,
          mb: 0.5,
        }}
      >
        <MenuBookIcon color="primary" />

        <Typography variant="h2">World Lore</Typography>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Information that helps define the world's history, cultures, and
        mysteries.
      </Typography>

      {lore.length === 0 ? (
        <Typography color="text.secondary">
          No lore has been added yet.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {lore.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <LoreCard lore={item} onOpen={() => onOpen(item.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

function LoreCard({ lore, onOpen }: LoreCardProps) {
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
            {lore.name}
          </Typography>

          {lore.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1.5,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {lore.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default LorePage;
