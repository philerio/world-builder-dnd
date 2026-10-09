import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

import type { Campaign } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import formatStatusLabel from "../utils/formatStatusLabel";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

type CampaignCardProps = {
  campaign: Campaign;
  onOpen: () => void;
  onOpenDashboard: () => void;
};

function CampaignsPage() {
  const navigate = useNavigate();
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const campaigns = sortEntitiesByName(worldData?.campaigns ?? []);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading campaigns…</Typography>;
  }

  if (worldDataError) {
    return (
      <Typography color="error">Could not load campaigns: {worldDataError}</Typography>
    );
  }

  const statuses = [...new Set(campaigns.map((campaign) => campaign.status).filter((status): status is string => Boolean(status)))].sort();
  const campaignFilters: DashboardFilter[] = [{
    key: "status",
    label: "Status",
    options: statuses.map((status) => ({ value: status, label: formatStatusLabel(status) })),
  }];
  const search = filters.search?.trim().toLowerCase() ?? "";
  const filteredCampaigns = campaigns.filter((campaign) => {
    const searchableText = [campaign.name, campaign.description, campaign.overview, campaign.outcome]
      .filter(Boolean).join(" ").toLowerCase();
    return (!search || searchableText.includes(search))
      && (!filters.status || campaign.status === filters.status)
      && matchesEntityTag(campaign, filters.tag);
  });

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
          Campaigns
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Campaigns and adventures in the world.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <DashboardFilters
          search={{ label: "Search campaigns", placeholder: "Name, overview, or outcome…" }}
          filters={campaignFilters}
          taggedEntities={campaigns}
          onChange={setFilters}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </Typography>
        {filteredCampaigns.length === 0 ? (
          <Typography color="text.secondary">
            {campaigns.length === 0 ? "No campaigns have been added yet." : "No campaigns match these filters."}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {filteredCampaigns.map((campaign) => (
              <Grid key={campaign.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <CampaignCard
                  campaign={campaign}
                  onOpen={() => openEntity(campaign.id)}
                  onOpenDashboard={() => navigate(`/campaigns/${campaign.id}`)}
                />
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

function CampaignCard({ campaign, onOpen, onOpenDashboard }: CampaignCardProps) {
  return (
    <Card>
      <CardContent sx={{ pb: 1 }}>
        <Stack spacing={1.5}>
          <CardActionArea onClick={onOpen} sx={{ borderRadius: 1 }}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="h2" sx={{ fontSize: "1.2rem" }}>
                {campaign.name}
              </Typography>

              {campaign.status && (
                <Chip size="small" label={formatStatusLabel(campaign.status)} />
              )}
            </Stack>
          </CardActionArea>

          <Button
            onClick={onOpenDashboard}
            variant="contained"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            Open Campaign Dashboard
          </Button>
        </Stack>
      </CardContent>

      <CardActionArea onClick={onOpen}>
        <CardContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            {campaign.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                {campaign.description}
              </Typography>
            )}

            {campaign.overview && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.6,
                }}
              >
                {campaign.overview}
              </Typography>
            )}

            <Stack
              direction="row"
              sx={{
                gap: 0.75,
                flexWrap: "wrap",
              }}
            >
              <Chip
                size="small"
                label={`${campaign.player_characters?.length ?? 0} PCs`}
              />

              <Chip size="small" label={`${campaign.npcs?.length ?? 0} NPCs`} />

              <Chip
                size="small"
                label={`${campaign.locations?.length ?? 0} locations`}
              />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CampaignsPage;
