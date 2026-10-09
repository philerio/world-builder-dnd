import { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import MenuBookIcon from "@mui/icons-material/MenuBook";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

import type { Lore } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

type LoreCardProps = {
  lore: Lore;
  onOpen: () => void;
};

type LoreSectionProps = {
  title: string;
  subtitle: string;
  lore: Lore[];
  emptyMessage: string;
  placeNames: Map<string, string>;
  places: { id: string; name: string; type: string }[];
  selectedPlace?: string;
  onPlaceChange?: (placeId: string) => void;
  onOpen: (id: string) => void;
};

function LorePage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const lore = sortEntitiesByName(worldData?.lores ?? []);
  const campaigns = sortEntitiesByName(worldData?.campaigns ?? []);
  const places = sortEntitiesByName([
    ...(worldData?.continents ?? []).map((place) => ({ ...place, type: "Continent" })),
    ...(worldData?.kingdoms ?? []).map((place) => ({ ...place, type: "Kingdom" })),
    ...(worldData?.regions ?? []).map((place) => ({ ...place, type: "Region" })),
    ...(worldData?.cities ?? []).map((place) => ({ ...place, type: "City" })),
    ...(worldData?.locations ?? []).map((place) => ({ ...place, type: place.location_type || "Location" })),
  ]);
  const placeNames = new Map(places.map((place) => [place.id, place.name]));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [commonPlace, setCommonPlace] = useState("");

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
    const searchableText = [item.name, item.description, item.details, item.player_knowledge, item.common_knowledge]
      .filter(Boolean).join(" ").toLowerCase();
    return (!search || searchableText.includes(search))
      && (!filters.campaign || item.campaigns?.includes(filters.campaign))
      && matchesEntityTag(item, filters.tag);
  });
  const loreFilters: DashboardFilter[] = [{
    key: "campaign",
    label: "Campaign",
    options: campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name })),
  }];
  const commonLore = filteredLore
    .filter((item) => Boolean(item.common_knowledge?.trim()))
    .filter((item) => !commonPlace || !item.common_knowledge_locations?.length || item.common_knowledge_locations.includes(commonPlace));
  const worldLore = filteredLore.filter((item) => !item.common_knowledge?.trim());

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
          taggedEntities={lore}
          onChange={setFilters}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredLore.length} of {lore.length} lore records
        </Typography>
        <Stack spacing={5}>
          <LoreSection
            title="Common Knowledge"
            subtitle="Information ordinary people know. Add locations to limit where it is commonly known; leave the location list empty for knowledge that is widespread."
            lore={commonLore}
            emptyMessage={lore.length === 0 ? "No lore has been added yet." : "No common knowledge matches these filters. Edit a lore entry to add common knowledge."}
            placeNames={placeNames}
            places={places}
            selectedPlace={commonPlace}
            onPlaceChange={setCommonPlace}
            onOpen={openEntity}
          />
          <LoreSection
            title="World Lore"
            subtitle="History, culture, mysteries, and other setting information that is not marked as common knowledge."
            lore={worldLore}
            emptyMessage={lore.length === 0 ? "No lore has been added yet." : "No other lore matches these filters."}
            placeNames={placeNames}
            places={places}
            onOpen={openEntity}
          />
        </Stack>
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

function LoreSection({ title, subtitle, lore, emptyMessage, placeNames, places, selectedPlace, onPlaceChange, onOpen }: LoreSectionProps) {
  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          mb: 0.5,
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
          <MenuBookIcon color="primary" />
          <Typography variant="h2">{title}</Typography>
        </Stack>
        {onPlaceChange && (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="common-knowledge-location-label">Location</InputLabel>
            <Select
              labelId="common-knowledge-location-label"
              label="Location"
              value={selectedPlace ?? ""}
              onChange={(event) => onPlaceChange(event.target.value)}
            >
              <MenuItem value="">All locations</MenuItem>
              {places.map((place) => <MenuItem key={place.id} value={place.id}>{place.name} · {place.type}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {subtitle}
      </Typography>

      {lore.length === 0 ? (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      ) : (
        <Grid container spacing={2}>
          {lore.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <LoreCard lore={item} placeNames={placeNames} onOpen={() => onOpen(item.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

function LoreCard({ lore, placeNames, onOpen }: LoreCardProps & { placeNames: Map<string, string> }) {
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
          {lore.common_knowledge?.trim() && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>Common knowledge</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {lore.common_knowledge}
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                {lore.common_knowledge_locations?.length
                  ? lore.common_knowledge_locations.map((locationId) => (
                    <Chip key={locationId} size="small" variant="outlined" label={placeNames.get(locationId) ?? locationId} />
                  ))
                  : <Chip size="small" label="Widespread" />}
              </Stack>
            </>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default LorePage;
