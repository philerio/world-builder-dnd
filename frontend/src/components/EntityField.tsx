import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CastleIcon from "@mui/icons-material/Castle";
import ChurchIcon from "@mui/icons-material/Church";
import ForestIcon from "@mui/icons-material/Forest";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import MapIcon from "@mui/icons-material/Map";
import PlaceIcon from "@mui/icons-material/Place";
import { type EntityFieldDefinition } from "../entityFieldDefinitions";
const ICON_OPTIONS = [
  { value: "location", label: "Location", icon: PlaceIcon },
  { value: "city", label: "City", icon: LocationCityIcon },
  { value: "castle", label: "Castle", icon: CastleIcon },
  { value: "church", label: "Church", icon: ChurchIcon },
  { value: "forest", label: "Forest", icon: ForestIcon },
  { value: "map", label: "Map", icon: MapIcon },
];
type EntityFieldProps = {
  field: EntityFieldDefinition;
  value: unknown;
  entities: {
    id: string;
    entity_type: string;
    name: string;
  }[];
  onChange: (value: unknown) => void;
  disabled: boolean;
};

function EntityField({
  field,
  value,
  entities,
  onChange,
  disabled,
}: EntityFieldProps) {
  switch (field.type) {
    case "text":
      return (
        <TextField
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          fullWidth
          disabled={disabled}
        />
      );

    case "textarea":
      return (
        <TextField
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          fullWidth
          multiline
          minRows={4}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <TextField
          label={field.label}
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => {
            const rawValue = event.target.value;

            onChange(rawValue === "" ? null : Number(rawValue));
          }}
          fullWidth
          disabled={disabled}
        />
      );

    case "boolean":
      return (
        <FormControlLabel
          control={
            <Switch
              checked={value === true}
              onChange={(event) => onChange(event.target.checked)}
              disabled={disabled}
            />
          }
          label={field.label}
        />
      );
    case "icon":
      return (
        <Autocomplete
          options={ICON_OPTIONS}
          value={ICON_OPTIONS.find((option) => option.value === value) ?? null}
          onChange={(_, selected) => onChange(selected?.value ?? null)}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, selected) =>
            option.value === selected.value
          }
          disabled={disabled}
          renderOption={(props, option) => {
            const Icon = option.icon;

            return (
              <Box component="li" {...props}>
                <Icon sx={{ mr: 1 }} />
                {option.label}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField {...params} label={field.label} />
          )}
        />
      );
    case "reference": {
      const matchingEntities = entities.filter(
        (entity) =>
          !field.referenceType || entity.entity_type === field.referenceType,
      );

      const selectedEntity =
        typeof value === "string"
          ? (matchingEntities.find((entity) => entity.id === value) ?? null)
          : null;

      return (
        <Autocomplete
          options={matchingEntities}
          value={selectedEntity}
          onChange={(_, selected) => onChange(selected?.id ?? null)}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField {...params} label={field.label} />
          )}
        />
      );
    }
    case "referenceArray": {
      const matchingEntities = entities.filter(
        (entity) =>
          !field.referenceType || entity.entity_type === field.referenceType,
      );

      const selectedEntities = Array.isArray(value)
        ? matchingEntities.filter((entity) => value.includes(entity.id))
        : [];

      return (
        <Autocomplete
          multiple
          options={matchingEntities}
          value={selectedEntities}
          onChange={(_, selected) =>
            onChange(selected.map((entity) => entity.id))
          }
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField {...params} label={field.label} />
          )}
        />
      );
    }
    case "objectArray": {
      const items = Array.isArray(value) ? value : [];
      const fields = field.fields ?? [];
      const useAccordion = field.accordion === true;
      const updateItem = (index: number, item: Record<string, unknown>) => {
        const updatedItems = [...items];

        updatedItems[index] = item;

        onChange(updatedItems);
      };

      const addItem = () => {
        const newItem: Record<string, unknown> = {};

        fields.forEach((childField) => {
          if (childField.generated) {
            newItem[childField.name] = crypto.randomUUID();
          } else if (childField.type === "boolean") {
            newItem[childField.name] = false;
          } else if (
            childField.type === "array" ||
            childField.type === "referenceArray"
          ) {
            newItem[childField.name] = [];
          } else {
            newItem[childField.name] = null;
          }
        });

        onChange([...items, newItem]);
      };

      const removeItem = (index: number) => {
        onChange(items.filter((_, itemIndex) => itemIndex !== index));
      };

      return (
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {field.label}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                {items.length} item{items.length === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Button
              startIcon={<AddIcon />}
              onClick={addItem}
              disabled={disabled}
              sx={{ ml: 1, whiteSpace: "nowrap" }}
            >
              Add
            </Button>
          </Stack>

          {items.map((item, index) => {
            const itemData =
              typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : {};

            if (!useAccordion) {
              return (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.5,
                  }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <TextField
                        label={`${field.label} ${index + 1}`}
                        value={`${index + 1}`}
                        slotProps={{
                          input: {
                            readOnly: true,
                          },
                        }}
                        sx={{ flex: 1 }}
                      />

                      <IconButton
                        color="error"
                        onClick={() => removeItem(index)}
                        disabled={disabled}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>

                    {fields.map((childField) => (
                      <EntityField
                        key={childField.name}
                        field={childField}
                        value={itemData[childField.name]}
                        entities={entities}
                        onChange={(newValue) =>
                          updateItem(index, {
                            ...itemData,
                            [childField.name]: newValue,
                          })
                        }
                        disabled={disabled}
                      />
                    ))}
                  </Stack>
                </Box>
              );
            }

            const entityId =
              typeof itemData.entity_id === "string"
                ? itemData.entity_id
                : null;

            const entity = entityId
              ? entities.find((candidate) => candidate.id === entityId)
              : null;

            const markerName =
              typeof itemData.label === "string" && itemData.label.trim()
                ? itemData.label
                : (entity?.name ?? "Unnamed Entity");

            return (
              <Accordion
                key={index}
                disableGutters
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  "&:before": {
                    display: "none",
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 52,
                    "& .MuiAccordionSummary-content": {
                      my: 1,
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {markerName}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {field.label} {index + 1}
                      </Typography>

                      <IconButton
                        color="error"
                        onClick={() => removeItem(index)}
                        disabled={disabled}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>

                    {fields
                      .filter((childField) => !childField.generated)
                      .map((childField) => (
                        <EntityField
                          key={childField.name}
                          field={childField}
                          value={itemData[childField.name]}
                          entities={entities}
                          onChange={(newValue) =>
                            updateItem(index, {
                              ...itemData,
                              [childField.name]: newValue,
                            })
                          }
                          disabled={disabled}
                        />
                      ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      );
    }
    case "array": {
      const arrayValue = Array.isArray(value) ? value : [];

      return (
        <TextField
          label={field.label}
          value={arrayValue.join("\n")}
          onChange={(event) =>
            onChange(
              event.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
          fullWidth
          multiline
          minRows={3}
          helperText="Enter one item per line."
          disabled={disabled}
        />
      );
    }

    default:
      return null;
  }
}

export default EntityField;
