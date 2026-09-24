/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Box, Button, Drawer, Stack, Typography } from "@mui/material";
import type { MapMarker } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import EntityField from "./EntityField";
import { ENTITY_FIELD_DEFINITIONS } from "../entityFieldDefinitions";

type MarkerDrawerProps = {
  open: boolean;
  marker: MapMarker | null;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (marker: MapMarker) => void;
};

function MarkerDrawer({
  open,
  marker,
  mode,
  onClose,
  onSave,
}: MarkerDrawerProps) {
  const [formData, setFormData] = useState<MapMarker | null>(marker);
  const { entities } = useWorldData();
  const markerDefinition = ENTITY_FIELD_DEFINITIONS.map.find(
    (field) => field.name === "markers",
  );
  const markerFields = markerDefinition?.fields ?? [];

  useEffect(() => {
    setFormData(marker);
  }, [marker]);
  const updateField = (fieldName: string, value: unknown) => {
    setFormData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [fieldName]: value,
      };
    });
  };
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }}>
        <Typography variant="overline" color="text.secondary">
          {mode === "create" ? "CREATE" : "EDITING"}
        </Typography>

        <Typography variant="h5" sx={{ mb: 3 }}>
          Marker
        </Typography>

        {marker && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Position: {marker.x.toFixed(1)}, {marker.y.toFixed(1)}
            </Typography>
            <Stack spacing={2}>
              {formData &&
                markerFields.map((field) => (
                  <EntityField
                    key={field.name}
                    field={field}
                    value={formData[field.name as keyof MapMarker]}
                    onChange={(value) => {
                      updateField(field.name as keyof MapMarker, value);
                    }}
                    entities={entities}
                    disabled={false}
                  />
                ))}
            </Stack>

            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  if (formData) {
                    onSave(formData);
                  }
                }}
                disabled={!formData}
              >
                Save
              </Button>

              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}

export default MarkerDrawer;
