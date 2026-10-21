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

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

import type { Artifact } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import DashboardFilters from "../components/filters/DashboardFilters";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

type ArtifactCardProps = {
  artifact: Artifact;
  onOpen: () => void;
};

function ArtifactsPage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const artifacts = sortEntitiesByName(worldData?.artifacts ?? []);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading artifacts…</Typography>;
  }

  if (worldDataError) {
    return (
      <Typography color="error">Could not load artifacts: {worldDataError}</Typography>
    );
  }

  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
  const filteredArtifacts = artifacts.filter((artifact) =>
    [artifact.name, artifact.description, artifact.details, artifact.player_text]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch)
      && matchesEntityTag(artifact, filters.tag)
      && (!filters.item_type || (artifact.item_type ?? "artifact") === filters.item_type),
  );

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
          Story Items & Artifacts
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Books, journals, letters, relics, and other objects that carry story
          details or world significance.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <DashboardFilters
          search={{ label: "Search story items", placeholder: "Name, details, or text…" }}
          filters={[{ key: "item_type", label: "Item type", options: [
            { value: "artifact", label: "Artifact" },
            { value: "book", label: "Book" },
            { value: "journal", label: "Journal" },
            { value: "letter", label: "Letter" },
            { value: "map", label: "Map" },
            { value: "relic", label: "Relic" },
            { value: "key", label: "Key" },
            { value: "other", label: "Other" },
          ]}]}
          taggedEntities={artifacts}
          onChange={setFilters}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredArtifacts.length} of {artifacts.length} story items
        </Typography>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1.5,
            mb: 0.5,
          }}
        >
          <AutoAwesomeIcon color="primary" />

          <Typography variant="h2">Story Items & Artifacts</Typography>
        </Stack>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Items can hold private DM notes alongside text intended to be shared with players.
        </Typography>

        {filteredArtifacts.length === 0 ? (
          <Typography color="text.secondary">
            {artifacts.length === 0 ? "No story items have been added yet." : "No story items match these filters."}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {filteredArtifacts.map((artifact) => (
              <Grid key={artifact.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ArtifactCard
                  artifact={artifact}
                  onOpen={() => openEntity(artifact.id)}
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

function ArtifactCard({ artifact, onOpen }: ArtifactCardProps) {
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
            {artifact.name}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textTransform: "capitalize" }}>
            {(artifact.item_type ?? "artifact").replaceAll("_", " ")}
          </Typography>

          {artifact.description && (
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
              {artifact.description}
            </Typography>
          )}

          {artifact.player_text && (
            <Typography
              variant="body2"
              sx={{
                mt: 1.25,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {artifact.player_text}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default ArtifactsPage;
