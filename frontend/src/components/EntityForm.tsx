import { Stack } from "@mui/material";
import { useEntities } from "../hooks/useEntities";
import { ENTITY_FIELD_DEFINITIONS } from "../entityFieldDefinitions";
import EntityField from "./EntityField";

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
  const { entities } = useEntities();

  const fields = ENTITY_FIELD_DEFINITIONS[entityType] ?? [];

  const updateField = (name: string, value: unknown) => {
    onChange({
      ...formData,
      [name]: value,
    });
  };

  return (
    <Stack spacing={2.5}>
      {fields.map((field) => (
        <EntityField
          key={field.name}
          field={field}
          value={formData[field.name]}
          entities={entities}
          onChange={(value) => updateField(field.name, value)}
          disabled={disabled}
        />
      ))}
    </Stack>
  );
}

export default EntityForm;
