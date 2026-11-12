import { useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip,
  FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select,
  Stack, Switch, Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import type { EntitySummary, Kingdom, WorldData } from "../types";
import { buildPoliticalHierarchy } from "../utils/politicalHierarchy";
import PoliticalLeadershipDetails from "./PoliticalLeadershipDetails";

type Props = { data: WorldData; onOpenEntity: (id: string) => void };

// Ordinary nested lists retain native keyboard navigation and reading order.
function Branches({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Box component="ul" aria-label={label} sx={{
      listStyle: "none", m: 0, ml: { xs: 1, sm: 2 }, pl: { xs: 2, sm: 3 },
      borderLeft: "2px solid", borderColor: "divider",
      "& > li": {
        position: "relative", pt: 2,
        "&::before": {
          content: '""', position: "absolute", top: 38,
          left: { xs: -16, sm: -24 }, width: { xs: 16, sm: 24 },
          borderTop: "2px solid", borderColor: "divider",
        },
      },
    }}>
      {children}
    </Box>
  );
}

export default function KingdomHierarchy({ data, onOpenEntity }: Props) {
  const [kingdomId, setKingdomId] = useState("");
  const [showCities, setShowCities] = useState(false);
  const hierarchy = buildPoliticalHierarchy(data);
  // A deleted kingdom must not leave the view trapped on an unavailable filter.
  const selectedId = hierarchy.kingdoms.some((branch) => branch.kingdom.id === kingdomId) ? kingdomId : "";
  const branches = hierarchy.kingdoms.filter((branch) => !selectedId || branch.kingdom.id === selectedId);
  const summaries = new Map<string, EntitySummary>([
    ...data.kingdoms.map((entity) => [entity.id, { id: entity.id, name: entity.name, entity_type: "kingdom" }] as const),
    ...data.cities.map((entity) => [entity.id, { id: entity.id, name: entity.name, entity_type: "city" }] as const),
    ...data.npcs.map((entity) => [entity.id, { id: entity.id, name: entity.name, entity_type: "npc" }] as const),
  ]);
  const getEntity = (id: string) => summaries.get(id);

  const entityLink = (id: string, label?: string) => (
    <Button size="small" onClick={() => onOpenEntity(id)} disabled={!getEntity(id)} sx={{
      minHeight: 44, minWidth: 0, px: 0.75, textTransform: "none", textAlign: "left",
      whiteSpace: "normal", overflowWrap: "anywhere", justifyContent: "flex-start", fontSize: "inherit",
    }}>
      {label ?? getEntity(id)?.name ?? id}
    </Button>
  );

  const polityNode = (entity: Kingdom) => {
    const offices = entity.leadership ?? [];
    return (
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderLeft: "3px solid", borderLeftColor: "primary.main", minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip size="small" variant="outlined" label={entity.political_level === "nation" ? "Nation" : "Kingdom"} />
          <Typography component="div" variant="h3" sx={{ minWidth: 0 }}>
            {entityLink(entity.id)}
          </Typography>
        </Stack>
        {entity.government_type && <Typography variant="body2" color="text.secondary">{entity.government_type}</Typography>}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">Capital:</Typography>
          {entity.capital ? entityLink(entity.capital) : <Typography variant="caption" color="text.secondary">Not recorded</Typography>}
        </Stack>
        {offices.map((office) => (
          <Stack key={office.id} direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">{office.title}:</Typography>
            {office.holders.length > 0
              ? office.holders.map((id) => <Box key={id}>{entityLink(id)}</Box>)
              : <Typography variant="caption">{office.status === "Vacant" ? "Vacant" : "See leadership details"}</Typography>}
          </Stack>
        ))}
        {offices.length === 0 && entity.ruler && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">Ruler:</Typography>
            {entityLink(entity.ruler)}
          </Stack>
        )}
      </Paper>
    );
  };

  const cityBranches = (cities: WorldData["cities"], capital?: string) => (
    <Branches label="Cities">
      {cities.map((city) => (
        <Box component="li" key={city.id}>
          <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <LocationCityIcon fontSize="small" color="action" />
              {entityLink(city.id)}
              {city.id === capital && <Chip size="small" label="Capital" />}
            </Stack>
          </Paper>
        </Box>
      ))}
    </Branches>
  );

  const nationNode = (nation: Kingdom, cities: WorldData["cities"]) => (
    <Box component="li" key={nation.id}>
      {polityNode(nation)}
      {showCities && cities.length > 0 && cityBranches(cities, nation.capital)}
      {showCities && cities.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>No cities recorded.</Typography>}
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <FormControl size="small" sx={{ minWidth: { sm: 260 } }}>
          <InputLabel id="kingdom-hierarchy-filter">Kingdom</InputLabel>
          <Select labelId="kingdom-hierarchy-filter" label="Kingdom" value={selectedId} onChange={(event) => setKingdomId(event.target.value)}>
            <MenuItem value="">All kingdoms</MenuItem>
            {hierarchy.kingdoms.map(({ kingdom }) => <MenuItem key={kingdom.id} value={kingdom.id}>{kingdom.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel control={<Switch checked={showCities} onChange={(_event, value) => setShowCities(value)} />} label="Show cities" />
      </Stack>

      {branches.map(({ kingdom, nations, cities }) => (
        <Box key={kingdom.id}>
          {polityNode(kingdom)}
          {(kingdom.leadership?.length || kingdom.government_notes) ? (
            <Accordion disableGutters sx={{ mt: 1, "&::before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <AccountTreeIcon fontSize="small" color="primary" />
                  <Typography variant="body2">Council and leadership · {kingdom.name}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <PoliticalLeadershipDetails entity={{ ...kingdom }} getEntity={getEntity} onOpenEntity={onOpenEntity} />
              </AccordionDetails>
            </Accordion>
          ) : null}
          {nations.length > 0 && <Branches label={`Nations of ${kingdom.name}`}>{nations.map(({ nation, cities: nationCities }) => nationNode(nation, nationCities))}</Branches>}
          {nations.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>No nations linked.</Typography>}
          {showCities && cities.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Cities linked directly to {kingdom.name}</Typography>
              {cityBranches(cities, kingdom.capital)}
            </Box>
          )}
        </Box>
      ))}

      {!selectedId && hierarchy.unassignedNations.length > 0 && (
        <Box>
          <Typography variant="h3" sx={{ mb: 1 }}>Nations without a linked kingdom</Typography>
          <Typography variant="body2" color="text.secondary">Their parent kingdom is missing or has not been assigned.</Typography>
          <Branches label="Nations without a linked kingdom">
            {hierarchy.unassignedNations.map(({ nation, cities }) => nationNode(nation, cities))}
          </Branches>
        </Box>
      )}
      {hierarchy.kingdoms.length === 0 && hierarchy.unassignedNations.length === 0 && <Typography color="text.secondary">No kingdoms or nations have been added yet.</Typography>}
    </Stack>
  );
}
