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

import type { Campaign, WorldData } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

type CampaignCardProps = {
  campaign: Campaign;
  onOpen: () => void;
};

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
        setCampaigns(data.campaigns);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Typography color="text.secondary">Loading campaigns…</Typography>;
  }

  if (error) {
    return (
      <Typography color="error">Could not load campaigns: {error}</Typography>
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
          Campaigns
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Campaigns and adventures in the world.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        {campaigns.length === 0 ? (
          <Typography color="text.secondary">
            No campaigns have been added yet.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {campaigns.map((campaign) => (
              <Grid key={campaign.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <CampaignCard
                  campaign={campaign}
                  onOpen={() => openEntity(campaign.id)}
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

function CampaignCard({ campaign, onOpen }: CampaignCardProps) {
  return (
    <Card>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction="row"
              sx={{
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="h2" sx={{ fontSize: "1.2rem" }}>
                {campaign.name}
              </Typography>

              {campaign.status && <Chip size="small" label={campaign.status} />}
            </Stack>

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
                label={`${campaign.player_characters.length} PCs`}
              />

              <Chip size="small" label={`${campaign.npcs.length} NPCs`} />

              <Chip
                size="small"
                label={`${campaign.locations.length} locations`}
              />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CampaignsPage;
