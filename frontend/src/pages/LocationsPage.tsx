import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

import type { Location } from "../types";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import formatStatusLabel from "../utils/formatStatusLabel";
import { useWorldData } from "../context/WorldDataContext";

type LocationCategory = "Continent" | "Kingdom" | "Region" | "City" | "Location";

type LocationEntry = {
  id: string;
  name: string;
  category: LocationCategory;
  description?: string;
  context?: string;
};

type LocationSectionProps = {
  title: string;
  locations: LocationEntry[];
  onOpen: (id: string) => void;
};

type LocationCardProps = {
  location: LocationEntry;
  onOpen: () => void;
};

function LocationsPage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const continents = worldData?.continents ?? [];
  const kingdoms = worldData?.kingdoms ?? [];
  const regions = worldData?.regions ?? [];
  const cities = worldData?.cities ?? [];
  const places: Location[] = worldData?.locations ?? [];
  const [filters, setFilters] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  const openMap = (mapId: string, entityId?: string, placeEntity = false) => {
    const params = new URLSearchParams({ map: mapId });
    if (entityId) params.set(placeEntity ? "placeEntity" : "focusEntity", entityId);
    navigate(`/maps?${params.toString()}`);
  };
  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading locations…</Typography>;
  }

  if (worldDataError) {
    return (
      <Typography color="error">Could not load locations: {worldDataError}</Typography>
    );
  }

  const nameById = new Map(
    [...continents, ...kingdoms, ...regions, ...cities, ...places].map(
      (entity) => [entity.id, entity.name] as const,
    ),
  );
  const nameOf = (id?: string) => (id ? nameById.get(id) ?? id : undefined);
  const allEntries: LocationEntry[] = [
    ...continents.map((continent) => ({
      id: continent.id,
      name: continent.name,
      category: "Continent" as const,
      description: continent.description,
      context: `${kingdoms.filter((kingdom) => kingdom.continent === continent.id).length} kingdoms · ${regions.filter((region) => region.continent === continent.id).length} regions`,
    })),
    ...kingdoms.map((kingdom) => ({
      id: kingdom.id,
      name: kingdom.name,
      category: "Kingdom" as const,
      description: kingdom.description,
      context: [
        kingdom.continent ? `Continent: ${nameOf(kingdom.continent)}` : undefined,
        kingdom.capital ? `Capital: ${nameOf(kingdom.capital)}` : undefined,
        `${cities.filter((city) => city.kingdom === kingdom.id).length} cities`,
      ].filter(Boolean).join(" · "),
    })),
    ...regions.map((region) => ({
      id: region.id,
      name: region.name,
      category: "Region" as const,
      description: region.description,
      context: [
        region.continent ? `Continent: ${nameOf(region.continent)}` : undefined,
        region.kingdom ? `Kingdom: ${nameOf(region.kingdom)}` : undefined,
        `${cities.filter((city) => city.region === region.id).length} cities`,
      ].filter(Boolean).join(" · "),
    })),
    ...cities.map((city) => ({
      id: city.id,
      name: city.name,
      category: "City" as const,
      description: city.description,
      context: [
        city.region ? `Region: ${nameOf(city.region)}` : undefined,
        city.kingdom ? `Kingdom: ${nameOf(city.kingdom)}` : undefined,
      ].filter(Boolean).join(" · "),
    })),
    ...places.map((place) => ({
      id: place.id,
      name: place.name,
      category: "Location" as const,
      description: place.description,
      context: [
        place.location_type ? formatStatusLabel(place.location_type) : undefined,
        place.region ? `Region: ${nameOf(place.region)}` : undefined,
        place.kingdom ? `Kingdom: ${nameOf(place.kingdom)}` : undefined,
        place.continent ? `Continent: ${nameOf(place.continent)}` : undefined,
      ].filter(Boolean).join(" · "),
    })),
  ];
  const categories: LocationCategory[] = ["Continent", "Kingdom", "Region", "City", "Location"];
  const sectionTitles: Record<LocationCategory, string> = {
    Continent: "Continents",
    Kingdom: "Kingdoms",
    Region: "Regions",
    City: "Cities",
    Location: "Points of Interest",
  };
  const locationFilters: DashboardFilter[] = [{
    key: "category",
    label: "Type",
    options: categories.map((category) => ({ value: category, label: sectionTitles[category] })),
  }];
  const search = filters.search?.toLowerCase() ?? "";
  const filteredEntries = allEntries.filter((entry) => {
    const matchesCategory = !filters.category || entry.category === filters.category;
    const matchesSearch = !search || `${entry.name} ${entry.description ?? ""} ${entry.context ?? ""}`.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });
  const hasActiveFilter = Boolean(search || filters.category);
  const visibleCategories = categories.filter(
    (category) => !hasActiveFilter || filteredEntries.some((entry) => entry.category === category),
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
          Locations
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Continents, kingdoms, regions, cities, and points of interest.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <DashboardFilters
          search={{ label: "Search locations", placeholder: "Name, region, kingdom…" }}
          filters={locationFilters}
          onChange={setFilters}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredEntries.length} of {allEntries.length} records
        </Typography>
        {filteredEntries.length === 0 && hasActiveFilter && (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            No locations match these filters.
          </Typography>
        )}
        {visibleCategories.map((category, index) => {
          const entries = filteredEntries.filter((entry) => entry.category === category);
          return (
            <Box key={category} sx={{ mb: index === visibleCategories.length - 1 ? 0 : 5 }}>
              {index > 0 && <Box sx={{ borderTop: 1, borderColor: "divider", mb: 4 }} />}
              <LocationSection title={sectionTitles[category]} locations={entries} onOpen={openEntity} />
            </Box>
          );
        })}
      </Box>

      <EntityDetailDrawer
        entityId={entityId}
        open={isOpen}
        onOpenMap={openMap}
        onClose={closeEntity}
        onOpenEntity={openEntity}
        onBack={goBack}
        canGoBack={canGoBack}
      />
    </Box>
  );
}

function LocationSection({ title, locations, onOpen }: LocationSectionProps) {
  return (
    <Stack spacing={2}>
      <Typography variant="h2">{title}</Typography>

      {locations.length === 0 ? (
        <Typography color="text.secondary">
          {title === "Points of Interest"
            ? "No points of interest have been added yet."
            : `No ${title.toLowerCase()} have been added yet.`}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {locations.map((location) => (
            <Grid
              key={location.id}
              size={{
                xs: 12,
                sm: 6,
                lg: 4,
              }}
            >
              <LocationCard location={location} onOpen={() => onOpen(location.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function LocationCard({ location, onOpen }: LocationCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea onClick={onOpen} sx={{ height: "100%" }}>
        <CardContent sx={{ p: 3, height: "100%" }}>
          <Stack spacing={1.5} sx={{ height: "100%" }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h2" sx={{ fontSize: "1.2rem", flex: 1 }}>
                {location.name}
              </Typography>
              <Chip size="small" label={location.category} />
            </Stack>

            {location.context && (
              <Typography variant="body2" color="text.secondary">
                {location.context}
              </Typography>
            )}

            {location.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {location.description}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default LocationsPage;
