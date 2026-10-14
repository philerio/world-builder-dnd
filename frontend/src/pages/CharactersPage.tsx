import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tab,
  Tabs,
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
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

type CharacterGroup = "npcs" | "player_characters";

type CharactersPageProps = {
  data: WorldData;
};

function CharactersPage({ data }: CharactersPageProps) {
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<CharacterGroup>("npcs");
  const playerCharacters = sortEntitiesByName(data.player_characters);
  const npcs = sortEntitiesByName(data.npcs);
  const characters = activeGroup === "npcs" ? npcs : playerCharacters;

  const entityNameById = new Map(
    [
      ...data.continents,
      ...data.kingdoms,
      ...data.regions,
      ...data.cities,
      ...(data.locations ?? []),
      ...data.player_characters,
      ...data.npcs,
    ].map((entity) => [entity.id, entity.name] as const),
  );
  const getEntityName = (id: string) => entityNameById.get(id) ?? id;
  const getUniqueValues = (values: (string | undefined)[]): string[] =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort(
      (first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }),
    );

  const characterFilters: DashboardFilter[] = [
    ...(activeGroup === "npcs"
      ? [{
          key: "job",
          label: "Job",
          options: getUniqueValues(npcs.map((character) => character.job)).map(
            (value) => ({ value, label: value }),
          ),
        }]
      : []),
    {
      key: "race",
      label: "Race",
      options: getUniqueValues(characters.map((character) => character.race)).map(
        (value) => ({ value, label: value }),
      ),
    },
    {
      key: "alignment",
      label: "Alignment",
      options: getUniqueValues(
        characters.map((character) => character.alignment),
      ).map((value) => ({ value, label: value })),
    },
    {
      key: "role",
      label: "Role",
      options: getUniqueValues(characters.map((character) => character.role)).map(
        (value) => ({ value, label: getEntityName(value) }),
      ),
    },
    {
      key: "kingdom",
      label: "Kingdom",
      options: getUniqueValues(
        characters.map((character) => character.kingdom),
      ).map((value) => ({ value, label: getEntityName(value) })),
    },
    {
      key: "region",
      label: "Region",
      options: getUniqueValues(characters.map((character) => character.region)).map(
        (value) => ({ value, label: getEntityName(value) }),
      ),
    },
    {
      key: "city",
      label: "City",
      options: getUniqueValues(characters.map((character) => character.city)).map(
        (value) => ({ value, label: getEntityName(value) }),
      ),
    },
  ].filter((filter) => filter.options.length > 0);

  const filteredCharacters = useMemo(
    () =>
      characters.filter((character) => {
        const search = filters.search?.trim().toLocaleLowerCase() ?? "";
        const searchableText = [
          character.name,
          character.job,
          character.role,
          character.race,
          character.alignment,
          character.description,
          ...(character.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

        return (
          (!search || searchableText.includes(search)) &&
          (!filters.job || character.job === filters.job) &&
          (!filters.race || character.race === filters.race) &&
          (!filters.alignment || character.alignment === filters.alignment) &&
          (!filters.role || character.role === filters.role) &&
          (!filters.kingdom || character.kingdom === filters.kingdom) &&
          (!filters.region || character.region === filters.region) &&
          (!filters.city || character.city === filters.city) &&
          matchesEntityTag(character, filters.tag)
        );
      }),
    [characters, filters],
  );

  return (
    <Box>
      <Box
        sx={{
          px: { xs: 3, md: 5 },
          py: { xs: 3, md: 4 },
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

        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Browse the people who inhabit the world and shape its stories.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Tabs
            value={activeGroup}
            onChange={(_event, value: CharacterGroup) => {
              setFilters({});
              setActiveGroup(value);
            }}
            aria-label="Choose character group"
            sx={{ minHeight: 44 }}
          >
            <Tab
              value="npcs"
              icon={<PersonIcon fontSize="small" />}
              iconPosition="start"
              label={`NPCs · ${npcs.length}`}
              sx={{ minHeight: 44 }}
            />
            <Tab
              value="player_characters"
              icon={<GroupsIcon fontSize="small" />}
              iconPosition="start"
              label={`Player Characters · ${playerCharacters.length}`}
              sx={{ minHeight: 44 }}
            />
          </Tabs>

          <Typography variant="body2" color="text.secondary">
            Showing {filteredCharacters.length} of {characters.length}
          </Typography>
        </Box>

        <DashboardFilters
          key={activeGroup}
          search={{
            label: activeGroup === "npcs" ? "Search NPCs" : "Search characters",
            placeholder: "Name, job, race, alignment, or tag...",
          }}
          filters={characterFilters}
          taggedEntities={characters}
          onChange={setFilters}
        />

        <Grid container spacing={1.5}>
          {filteredCharacters.map((character) => (
            <Grid key={character.id} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
              <CharacterCard
                character={character}
                getEntityName={getEntityName}
                onSelect={openEntity}
              />
            </Grid>
          ))}
        </Grid>

        {filteredCharacters.length === 0 && (
          <Box
            sx={{
              py: 8,
              textAlign: "center",
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography variant="h3" sx={{ mb: 1 }}>
              No {activeGroup === "npcs" ? "NPCs" : "player characters"} found
            </Typography>
            <Typography color="text.secondary">
              Try changing the search or clearing a filter.
            </Typography>
          </Box>
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

function CharacterCard({
  character,
  getEntityName,
  onSelect,
}: {
  character: Character;
  getEntityName: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  const initials = character.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
  const occupation = character.job ?? character.role;
  const location = character.city ?? character.region ?? character.kingdom;

  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        onClick={() => onSelect(character.id)}
        sx={{ height: "100%", alignItems: "stretch" }}
      >
        <CardContent sx={{ p: 2, height: "100%" }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "flex-start" }}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h3"
                sx={{ fontSize: "1.05rem", lineHeight: 1.3, fontWeight: 650 }}
                title={character.name}
              >
                {character.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                {[occupation, character.race].filter(Boolean).join(" · ") ||
                  "Character"}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ mt: 1.5, flexWrap: "wrap" }}
          >
            {character.alignment && (
              <Chip size="small" variant="outlined" label={character.alignment} />
            )}
            {location && (
              <Chip size="small" label={getEntityName(location)} />
            )}
            {(character.tags ?? []).slice(0, 1).map((tag) => (
              <Chip
                key={tag}
                size="small"
                variant="outlined"
                color={tag.toLocaleLowerCase() === "reference npc" ? "primary" : "default"}
                label={tag}
              />
            ))}
          </Stack>

          {character.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1.25,
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: "2.9em",
              }}
            >
              {character.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CharactersPage;
