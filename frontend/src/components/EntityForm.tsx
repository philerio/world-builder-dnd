import { Stack } from "@mui/material";
import { ENTITY_FIELD_DEFINITIONS } from "../entityFieldDefinitions";
import { useWorldData } from "../context/WorldDataContext";
import EntityField from "./EntityField";
import PoliticalLeadershipEditor, { NEW_ENTITY_REFERENCE } from "./PoliticalLeadershipEditor";

type EntityFormProps = {
  entityType: string;
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  disabled?: boolean;
};

function EntityForm({
  entityType,
  formData,
  onChange,
  disabled = false,
}: EntityFormProps) {
  const { worldData, entities } = useWorldData();

  const fields = ENTITY_FIELD_DEFINITIONS[entityType] ?? [];

  const updateField = (name: string, value: unknown) => {
    onChange({
      ...formData,
      [name]: value,
      ...(name === "political_level" && value === "kingdom" ? { parent_kingdom: null } : {}),
    });
  };

  return (
    <Stack spacing={2.5}>
      {fields
        .filter((field) => field.name !== "parent_kingdom" || formData.political_level === "nation")
        .map((field) => {
          const fieldEntities = field.name === "parent_kingdom"
            ? entities.filter((entity) => worldData?.kingdoms.some(
              (kingdom) => kingdom.id === entity.id && (kingdom.political_level ?? "kingdom") === "kingdom",
            ))
            : entities;

          return (
            <EntityField
              key={field.name}
              field={field}
              value={field.name === "political_level" ? formData.political_level ?? "kingdom" : formData[field.name]}
              entities={fieldEntities}
              onChange={(value) => updateField(field.name, value)}
              disabled={disabled}
            />
          );
        })}
      {(entityType === "city" || entityType === "kingdom") && (
        <PoliticalLeadershipEditor
          entityType={entityType}
          formData={formData.id ? formData : { ...formData, id: NEW_ENTITY_REFERENCE }}
          entities={entities}
          onChange={onChange}
          disabled={disabled}
          kingdoms={worldData?.kingdoms ?? []}
          cities={worldData?.cities ?? []}
        />
      )}
    </Stack>
  );
}

export default EntityForm;
