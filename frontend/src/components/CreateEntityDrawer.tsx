import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import EntityForm from "./EntityForm";
import { useWorldData } from "../context/WorldDataContext";
import { ENTITY_TYPES } from "../types";

type CreateEntityDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (entityId: string) => void;
};

const drawerWidth = 440;

function CreateEntityDrawer({
  open,
  onClose,
  onCreated,
}: CreateEntityDrawerProps) {
  const { createEntity } = useWorldData();

  const [entityType, setEntityType] = useState("city");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTypeLabel = useMemo(
    () =>
      ENTITY_TYPES.find((type) => type.value === entityType)?.label ?? "Entity",
    [entityType],
  );

  const handleEntityTypeChange = (newType: string) => {
    setEntityType(newType);
    setFormData({});
    setError(null);
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    setError(null);
    onClose();
  };

  const handleCreate = async () => {
    const name = typeof formData.name === "string" ? formData.name.trim() : "";

    if (!name) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdEntity = await createEntity(entityType, {
        ...formData,
        name,
      });

      setFormData({});
      setEntityType("city");

      onCreated(createdEntity.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            width: {
              xs: "100%",
              sm: drawerWidth,
            },
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Box
          sx={{
            p: 3,
            flex: 1,
            overflowY: "auto",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.1em",
            }}
          >
            CREATE
          </Typography>

          <Typography variant="h2" sx={{ mt: 0.5 }}>
            New Entity
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Create a new {selectedTypeLabel.toLowerCase()} in the world.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2.5}>
            <TextField
              select
              label="Entity Type"
              value={entityType}
              onChange={(event) => handleEntityTypeChange(event.target.value)}
              fullWidth
              disabled={saving}
            >
              {ENTITY_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <EntityForm
              entityType={entityType}
              formData={formData}
              onChange={setFormData}
              disabled={saving}
            />

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            px: 3,
            pt: 2,
            pb: 3,
            backgroundColor: "background.paper",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button variant="outlined" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              {saving ? "Creating…" : "Create Entity"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}

export default CreateEntityDrawer;
