import { useState } from "react";
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

import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import DashboardFilters, {
  type DashboardFilter,
} from "../components/filters/DashboardFilters";
import type { Character, WorldData } from "../types";

type CharactersPageProps = {
  data: WorldData;
};

function CharactersPage({ data }: CharactersPageProps) {
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const allCharacters = [...data.player_characters, ...data.npcs];
  const getUniqueValues = (values: (string | undefined)[]): string[] => {
    return [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ].sort();
  };

  const characterFilters: DashboardFilter[] = [
    {
      key: "role",
      label: "Role",
      options: getUniqueValues(
        allCharacters.map((character) => character.role),
      ).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "kingdom",
      label: "Kingdom",
      options: getUniqueValues(
        allCharacters.map((character) => character.kingdom),
      ).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "region",
      label: "Region",
      options: getUniqueValues(
        allCharacters.map((character) => character.region),
      ).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "city",
      label: "City",
      options: getUniqueValues(
        allCharacters.map((character) => character.city),
      ).map((value) => ({
        value,
        label: value,
      })),
    },
  ];
  const filterCharacters = (characters: Character[]): Character[] => {
    return characters.filter((character) => {
      const search = filters.search?.toLowerCase() ?? "";

      const matchesSearch =
        !search ||
        character.name.toLowerCase().includes(search) ||
        (character.description?.toLowerCase().includes(search) ?? false);

      const matchesRole = !filters.role || character.role === filters.role;

      const matchesKingdom =
        !filters.kingdom || character.kingdom === filters.kingdom;

      const matchesRegion =
        !filters.region || character.region === filters.region;

      const matchesCity = !filters.city || character.city === filters.city;

      return (
        matchesSearch &&
        matchesRole &&
        matchesKingdom &&
        matchesRegion &&
        matchesCity
      );
    });
  };

  const filteredPlayerCharacters = filterCharacters(data.player_characters);

  const filteredNPCs = filterCharacters(data.npcs);

  const totalCharacters = allCharacters.length;
  const visibleCharacters =
    filteredPlayerCharacters.length + filteredNPCs.length;
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
          Characters
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          The people who inhabit the world and shape its stories.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <DashboardFilters
          search={{
            label: "Search characters",
            placeholder: "Search by name...",
          }}
          filters={characterFilters}
          onChange={setFilters}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {visibleCharacters} of {totalCharacters} characters
        </Typography>
        <CharacterSection
          title="Player Characters"
          description="The heroes whose stories are being played at the table."
          characters={filteredPlayerCharacters}
          icon={<GroupsIcon color="primary" />}
          onSelect={openEntity}
        />

        <Box sx={{ my: 5 }}>
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
            }}
          />
        </Box>

        <CharacterSection
          title="NPCs"
          description="The people, allies, enemies, and other characters encountered in the world."
          characters={filteredNPCs}
          icon={<PersonIcon color="primary" />}
          onSelect={openEntity}
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

function CharacterSection({
  title,
  description,
  characters,
  icon,
  onSelect,
}: {
  title: string;
  description: string;
  characters: Character[];
  icon: React.ReactNode;
  onSelect: (id: string) => void;
}) {
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
        {icon}

        <Typography variant="h2">{title}</Typography>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      <Grid container spacing={2}>
        {characters.map((character) => (
          <Grid key={character.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardActionArea
                sx={{ height: "100%" }}
                onClick={() => onSelect(character.id)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: "1.3rem",
                      fontWeight: 600,
                    }}
                  >
                    {character.name}
                  </Typography>

                  {character.role && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {character.role}
                    </Typography>
                  )}

                  <Stack
                    direction="row"
                    sx={{
                      gap: 1,
                      mt: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    {character.city && (
                      <Chip size="small" label={character.city} />
                    )}

                    {character.kingdom && (
                      <Chip size="small" label={character.kingdom} />
                    )}
                  </Stack>

                  {character.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 2,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {character.description}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {characters.length === 0 && (
        <Typography color="text.secondary">
          No characters have been added yet.
        </Typography>
      )}
    </Box>
  );
}

export default CharactersPage;
