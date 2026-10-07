import { useState } from "react";
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
import { useWorldData } from "../context/WorldDataContext";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";

type LoreCardProps = {
  lore: Lore;
  onOpen: () => void;
};

type LoreSectionProps = {
  lore: Lore[];
  emptyMessage: string;
  onOpen: (id: string) => void;
};

function LorePage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const lore = worldData?.lores ?? [];
  const campaigns = worldData?.campaigns ?? [];
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading lore…</Typography>;
  }

  if (worldDataError) {
    return <Typography color="error">Could not load lore: {worldDataError}</Typography>;
  }

  const search = filters.search?.trim().toLowerCase() ?? "";
  const filteredLore = lore.filter((item) => {
    const searchableText = [item.name, item.description, item.details, item.player_knowledge]
      .filter(Boolean).join(" ").toLowerCase();
    return (!search || searchableText.includes(search))
      && (!filters.campaign || item.campaigns?.includes(filters.campaign));
  });
  const loreFilters: DashboardFilter[] = [{
    key: "campaign",
    label: "Campaign",
    options: campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name })),
  }];

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
        <DashboardFilters
          search={{ label: "Search lore", placeholder: "Name, details, or player knowledge…" }}
          filters={loreFilters}
          onChange={setFilters}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredLore.length} of {lore.length} lore records
        </Typography>
        <LoreSection
          lore={filteredLore}
          emptyMessage={lore.length === 0 ? "No lore has been added yet." : "No lore matches these filters."}
          onOpen={openEntity}
        />
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

function LoreSection({ lore, emptyMessage, onOpen }: LoreSectionProps) {
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
        <Typography color="text.secondary">{emptyMessage}</Typography>
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
