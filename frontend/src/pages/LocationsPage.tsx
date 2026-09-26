import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import type { City, Continent, Kingdom, Region, WorldData } from "../types";
import useEntityIndex from "../hooks/useEntityIndex";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

type LocationCardProps = {
  name: string;
  description?: string;
  secondaryText?: string;
  secondaryContent?: React.ReactNode;
  onOpen: () => void;
};

type LocationData = {
  id: string;
  name: string;
  description?: string;
  secondaryText?: string;
  secondaryContent?: React.ReactNode;
};

type LocationSectionProps = {
  title: string;
  locations: LocationData[];
  onOpen: (id: string) => void;
};

function LocationsPage() {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [kingdoms, setKingdoms] = useState<Kingdom[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getEntity } = useEntityIndex();
  const navigate = useNavigate();
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  const openMap = (mapId: string) => {
    navigate(`/maps?map=${mapId}`);
  };
  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      })
      .then((data: WorldData) => {
        setContinents(data.continents);
        setKingdoms(data.kingdoms);
        setRegions(data.regions);
        setCities(data.cities);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Typography color="text.secondary">Loading locations…</Typography>;
  }

  if (error) {
    return (
      <Typography color="error">Could not load locations: {error}</Typography>
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
          Locations
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Continents, kingdoms, and cities throughout the world.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <LocationSection
          title="Continents"
          locations={continents.map((continent) => ({
            id: continent.id,
            name: continent.name,
            description: continent.description,
            secondaryText: `${kingdoms.filter((kingdom) => kingdom.continent === continent.id).length} kingdoms`,
          }))}
          onOpen={openEntity}
        />

        <Box sx={{ my: 5 }}>
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
            }}
          />
        </Box>

        <LocationSection
          title="Kingdoms"
          locations={kingdoms.map((kingdom) => {
            const continent = kingdom.continent
              ? getEntity(kingdom.continent)
              : undefined;

            return {
              id: kingdom.id,
              name: kingdom.name,
              description: kingdom.description,
              secondaryText: kingdom.capital
                ? `Capital: ${kingdom.capital}`
                : undefined,
              secondaryContent: continent ? (
                <Typography
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEntity(continent.id);
                  }}
                  sx={{
                    p: 0,
                    border: 0,
                    background: "none",
                    color: "text.secondary",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                >
                  {`Continent: ${continent.name} | ${cities.filter((city) => city.kingdom === kingdom.id).length} cities`}
                </Typography>
              ) : undefined,
            };
          })}
          onOpen={openEntity}
        />

        <Box sx={{ my: 5 }}>
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
            }}
          />
        </Box>

        <LocationSection
          title="Cities"
          locations={cities.map((city) => ({
            id: city.id,
            name: city.name,
            description: city.description,
            secondaryText: city.region
              ? getEntityName(city.region, regions)
              : undefined,
          }))}
          onOpen={openEntity}
        />
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
          No locations have been added yet.
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
              <LocationCard
                name={location.name}
                description={location.description}
                secondaryText={location.secondaryText}
                secondaryContent={location.secondaryContent}
                onOpen={() => onOpen(location.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function LocationCard({
  name,
  description,
  secondaryText,
  secondaryContent,
  onOpen,
}: LocationCardProps) {
  return (
    <Card>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h2" sx={{ fontSize: "1.2rem" }}>
              {name}
            </Typography>

            {secondaryContent ??
              (secondaryText && (
                <Typography variant="body2" color="text.secondary">
                  {secondaryText}
                </Typography>
              ))}

            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                {description}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function getEntityName<T extends { id: string; name: string }>(
  id: string,
  entities: T[],
): string {
  return entities.find((entity) => entity.id === id)?.name ?? id;
}

export default LocationsPage;
