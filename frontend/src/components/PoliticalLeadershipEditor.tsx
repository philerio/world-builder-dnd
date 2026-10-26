import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { EntitySummary, PoliticalOffice, PoliticalOfficeReference } from "../types";

const NEW_ENTITY_REFERENCE = "__self__";

type PoliticalEntityOption = {
  id: string;
  name: string;
  offices: PoliticalOffice[];
};

type OfficeReferenceOption = PoliticalOfficeReference & {
  entityName: string;
  officeTitle: string;
};

type PoliticalLeadershipEditorProps = {
  entityType: string;
  formData: Record<string, unknown>;
  entities: EntitySummary[];
  onChange: (data: Record<string, unknown>) => void;
  disabled: boolean;
  kingdoms: { id: string; name: string; leadership?: PoliticalOffice[] }[];
  cities: { id: string; name: string; leadership?: PoliticalOffice[] }[];
};

function asOffices(value: unknown): PoliticalOffice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PoliticalOffice =>
      typeof item === "object" && item !== null &&
      typeof (item as PoliticalOffice).id === "string" &&
      typeof (item as PoliticalOffice).title === "string",
  );
}

function asReferences(value: unknown): PoliticalOfficeReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PoliticalOfficeReference =>
      typeof item === "object" && item !== null &&
      typeof (item as PoliticalOfficeReference).entity_id === "string" &&
      typeof (item as PoliticalOfficeReference).office_id === "string",
  );
}

function referenceKey(reference: PoliticalOfficeReference) {
  return `${reference.entity_id}::${reference.office_id}`;
}

function PoliticalLeadershipEditor({
  entityType,
  formData,
  entities,
  onChange,
  disabled,
  kingdoms,
  cities,
}: PoliticalLeadershipEditorProps) {
  const currentEntityId = typeof formData.id === "string" ? formData.id : NEW_ENTITY_REFERENCE;
  const currentName = typeof formData.name === "string" && formData.name.trim()
    ? formData.name
    : entityType === "kingdom"
      ? formData.political_level === "nation" ? "New nation" : "New kingdom"
      : "New city";
  const offices = asOffices(formData.leadership);
  const leadership = offices;

  const politicalEntities: PoliticalEntityOption[] = [
    ...kingdoms.map((entity) => ({ id: entity.id, name: entity.name, offices: entity.leadership ?? [] })),
    ...cities.map((entity) => ({ id: entity.id, name: entity.name, offices: entity.leadership ?? [] })),
  ];
  const currentIndex = politicalEntities.findIndex((entity) => entity.id === currentEntityId);
  const currentEntity: PoliticalEntityOption = {
    id: currentEntityId,
    name: currentName,
    offices: leadership,
  };
  if (currentIndex >= 0) politicalEntities[currentIndex] = currentEntity;
  else politicalEntities.push(currentEntity);

  const officeOptions: OfficeReferenceOption[] = politicalEntities.flatMap((entity) =>
    entity.offices.map((office) => ({
      entity_id: entity.id,
      office_id: office.id,
      entityName: entity.name,
      officeTitle: office.title,
    })),
  );
  const characterOptions = entities.filter((entity) =>
    entity.entity_type === "npc" || entity.entity_type === "player_character",
  );
  const getSelectedCharacters = (holderIds: string[]) => {
    const byId = new Map(characterOptions.map((entity) => [entity.id, entity]));
    return holderIds.map((id) => byId.get(id) ?? {
      id,
      name: "Unavailable character",
      entity_type: "unknown",
    });
  };

  const updateField = (field: string, value: unknown) => onChange({ ...formData, [field]: value });
  const updateOffice = (index: number, office: PoliticalOffice) => {
    updateField("leadership", leadership.map((current, itemIndex) => itemIndex === index ? office : current));
  };
  const addOffice = () => {
    updateField("leadership", [...leadership, {
      id: crypto.randomUUID(),
      title: "New office",
      holders: [],
      reports_to: [],
    }]);
  };
  const removeOffice = (officeId: string) => {
    updateField("leadership", leadership
      .filter((office) => office.id !== officeId)
      .map((office) => ({
        ...office,
        reports_to: asReferences(office.reports_to).filter((reference) =>
          reference.entity_id !== currentEntityId || reference.office_id !== officeId,
        ),
      })));
  };

  return (
    <Accordion defaultExpanded={leadership.length > 0} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <AccountTreeIcon color="primary" fontSize="small" />
          <Typography sx={{ fontWeight: 600 }}>Political leadership</Typography>
          <Chip size="small" label={`${leadership.length} office${leadership.length === 1 ? "" : "s"}`} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label="Government type"
            placeholder="Monarchy, council, elected assembly…"
            value={typeof formData.government_type === "string" ? formData.government_type : ""}
            onChange={(event) => updateField("government_type", event.target.value)}
            disabled={disabled}
            fullWidth
          />
          <TextField
            label="Government notes"
            placeholder="Succession rules, shared authority, or other context"
            value={typeof formData.government_notes === "string" ? formData.government_notes : ""}
            onChange={(event) => updateField("government_notes", event.target.value)}
            disabled={disabled}
            multiline
            minRows={2}
            fullWidth
          />
          {leadership.map((office, index) => {
            const holders = Array.isArray(office.holders) ? office.holders : [];
            const reportsTo = asReferences(office.reports_to);
            const currentOptionKey = `${currentEntityId}::${office.id}`;
            const selectableOfficeOptions = officeOptions.filter((option) =>
              referenceKey(option) !== currentOptionKey,
            );
            const selectedReports = reportsTo.map((reference) =>
              selectableOfficeOptions.find((option) => referenceKey(option) === referenceKey(reference)) ?? {
                ...reference,
                entityName: "Unavailable location",
                officeTitle: "Unavailable office",
              },
            );
            const selectedHolders = getSelectedCharacters(holders);
            const holderOptions = [
              ...characterOptions,
              ...selectedHolders.filter((selected) =>
                !characterOptions.some((option) => option.id === selected.id),
              ),
            ];
            const reportOptions = [
              ...selectableOfficeOptions,
              ...selectedReports.filter((selected) =>
                !selectableOfficeOptions.some((option) => referenceKey(option) === referenceKey(selected)),
              ),
            ];

            return (
              <Accordion key={office.id} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>{office.title || `Office ${index + 1}`}</Typography>
                    {holders.length > 1 && <Chip size="small" label={`${holders.length} co-holders`} />}
                  </Stack>
                  <IconButton
                    aria-label={`Remove ${office.title || "office"}`}
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeOffice(office.id);
                    }}
                    disabled={disabled}
                    sx={{ mr: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      label="Office or governing body"
                      value={office.title}
                      onChange={(event) => updateOffice(index, { ...office, title: event.target.value })}
                      disabled={disabled}
                      fullWidth
                    />
                    <Autocomplete
                      multiple
                      options={holderOptions}
                      value={selectedHolders}
                      onChange={(_, selected) => updateOffice(index, { ...office, holders: selected.map((item) => item.id) })}
                      getOptionLabel={(option) => option.name}
                      isOptionEqualToValue={(option, selected) => option.id === selected.id}
                      filterSelectedOptions
                      disableCloseOnSelect
                      disabled={disabled}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          {option.name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {option.entity_type === "player_character" ? "Player character" : option.entity_type === "npc" ? "NPC" : "Missing reference"}
                          </Typography>
                        </Box>
                      )}
                      renderInput={(params) => <TextField {...params} label="Office holders" placeholder="Select one or more characters" />}
                    />
                    <Autocomplete
                      multiple
                      options={reportOptions}
                      value={selectedReports}
                      onChange={(_, selected) => updateOffice(index, {
                        ...office,
                        reports_to: selected.map(({ entity_id, office_id }) => ({ entity_id, office_id })),
                      })}
                      getOptionLabel={(option) => `${option.officeTitle} · ${option.entityName}`}
                      isOptionEqualToValue={(option, selected) => referenceKey(option) === referenceKey(selected)}
                      filterSelectedOptions
                      disableCloseOnSelect
                      disabled={disabled}
                      renderInput={(params) => <TextField {...params} label="Reports to" placeholder="Select offices or governing bodies" />}
                    />
                    <TextField
                      label="Authority"
                      placeholder="What decisions this office controls"
                      value={office.authority ?? ""}
                      onChange={(event) => updateOffice(index, { ...office, authority: event.target.value })}
                      disabled={disabled}
                      fullWidth
                    />
                    <TextField
                      label="Status"
                      placeholder="Current, acting, vacant…"
                      value={office.status ?? ""}
                      onChange={(event) => updateOffice(index, { ...office, status: event.target.value })}
                      disabled={disabled}
                      fullWidth
                    />
                    <TextField
                      label="Notes"
                      value={office.notes ?? ""}
                      onChange={(event) => updateOffice(index, { ...office, notes: event.target.value })}
                      disabled={disabled}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Button startIcon={<AddIcon />} onClick={addOffice} disabled={disabled}>
              Add office
            </Button>
          </Paper>
          {leadership.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Add offices, councils, or co-rulers. Reporting links can point to a different city or nation.
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export { NEW_ENTITY_REFERENCE };
export default PoliticalLeadershipEditor;
