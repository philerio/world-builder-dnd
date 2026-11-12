/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Alert,
  Button,
  CircularProgress,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import EntityForm from "./EntityForm";
import { useWorldData } from "../context/WorldDataContext";
import { ENTITY_TYPES } from "../types";
import type { EntityData } from "../types";
import CloseIcon from "@mui/icons-material/Close";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import useDraftProtection from "../hooks/useDraftProtection";
import { draftKey, draftValuesEqual, readEntityDraft, removeEntityDraft } from "../utils/entityDrafts";
import { createAndLinkEntity, type CreationContext } from "../utils/contextualCreation";
import useDrawerViewport from "../hooks/useDrawerViewport";

type CreateEntityDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (entityId: string, keepOpen: boolean) => void;
  context?: CreationContext;
  overlayZIndex?: number;
};

const drawerWidth = 440;

function CreateEntityDrawer({
  open,
  onClose,
  onCreated,
  context,
  overlayZIndex,
}: CreateEntityDrawerProps) {
  const { createEntity, worldData } = useWorldData();
  const viewport = useDrawerViewport();

  const [entityType, setEntityType] = useState("city");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseData, setBaseData] = useState<Record<string, unknown>>({});
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [createdEntity, setCreatedEntity] = useState<EntityData | null>(null);
  const [leaveAction, setLeaveAction] = useState<"close" | { entityType: string } | null>(null);
  const storageKey = draftKey(worldData?.world?.id ?? worldData?.worlds?.[0]?.id ?? "default", `create:${context?.key ?? "global"}`);
  useEffect(() => {
    if (!open) { setReadyKey(null); return; }
    const stored = readEntityDraft(storageKey);
    const draft = stored && (!context?.allowedTypes || context.allowedTypes.includes(stored.entityType)) ? stored : null;
    setEntityType(draft?.entityType ?? context?.entityType ?? "city");
    setBaseData(draft?.base ?? context?.initialData ?? {});
    setFormData(draft?.data ?? context?.initialData ?? {});
    setRecovered(Boolean(draft));
    setCreatedEntity(null);
    setCreateAnother(false);
    setLeaveAction(null);
    setError(null);
    setReadyKey(storageKey);
  }, [open, storageKey, context]);
  const isDirty = !draftValuesEqual(formData, baseData);
  const draftStatus = useDraftProtection({ key: storageKey, entityType, base: baseData, data: formData, active: open && readyKey === storageKey && !createdEntity, dirty: isDirty });
  const availableTypes = ENTITY_TYPES.filter((type) => !context?.allowedTypes || context.allowedTypes.includes(type.value));

  const selectedTypeLabel = useMemo(
    () =>
      ENTITY_TYPES.find((type) => type.value === entityType)?.label ?? "Entity",
    [entityType],
  );

  const handleEntityTypeChange = (newType: string) => {
    setEntityType(newType);
    const seed = { ...context?.initialData, ...(Array.isArray(formData.tags) ? { tags: formData.tags } : {}) };
    setFormData(seed);
    setBaseData(context?.initialData ?? {});
    setRecovered(false);
    removeEntityDraft(storageKey);
    setError(null);
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    if (isDirty && !createdEntity) { setLeaveAction("close"); return; }

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
      const result = await createAndLinkEntity({
        existing: createdEntity,
        entityType,
        data: { ...formData, name },
        create: createEntity,
        rememberCreated: (entity) => { setCreatedEntity(entity); removeEntityDraft(storageKey); },
        link: context?.link,
      });

      const retainedTags = Array.isArray(formData.tags) ? formData.tags : [];
      setFormData(createAnother && retainedTags.length ? { tags: retainedTags } : {});
      setBaseData({});
      setCreatedEntity(null);
      setRecovered(false);
      removeEntityDraft(storageKey);
      if (!createAnother) setEntityType("city");
      onCreated(result.id, createAnother && !context);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      sx={overlayZIndex ? { zIndex: overlayZIndex } : undefined}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            ...viewport,
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
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            p: 3,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.1em",
            }}
          >
            CREATE
          </Typography>
            <IconButton aria-label="Close creation form" onClick={handleClose} disabled={saving}><CloseIcon /></IconButton>
          </Stack>

          <Typography variant="h2" sx={{ mt: 0.5 }}>
            {context?.title ?? "New Entity"}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {context?.description ?? `Create a new ${selectedTypeLabel.toLowerCase()} in the world.`}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2.5}>
            {recovered && <Alert severity="info">Recovered your unfinished draft from this browser.</Alert>}
            {createdEntity && error && <Alert severity="warning">{String(createdEntity.entity.name)} was created, but its link could not be saved. Retry linking to finish. Closing keeps the created record in your world.</Alert>}
            {availableTypes.length > 1 && (
            <TextField
              select
              label="Entity Type"
              value={entityType}
              onChange={(event) => isDirty ? setLeaveAction({ entityType: event.target.value }) : handleEntityTypeChange(event.target.value)}
              fullWidth
              disabled={saving || Boolean(createdEntity)}
            >
              {availableTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
            )}

            <EntityForm
              entityType={entityType}
              formData={formData}
              onChange={setFormData}
              disabled={saving || Boolean(createdEntity)}
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
            flexShrink: 0,
          }}
        >
          {!context && <FormControlLabel
            control={
              <Checkbox
                checked={createAnother}
                onChange={(event) => setCreateAnother(event.target.checked)}
                disabled={saving}
              />
            }
            label="Create another"
            sx={{ mb: 1 }}
          />}
          {isDirty && !createdEntity && <Typography role="status" variant="caption" color={draftStatus === "unavailable" ? "warning.main" : "text.secondary"} sx={{ display: "block", mb: 1 }}>
            {draftStatus === "saved" ? "Draft kept in this browser. Not saved to your world yet." : draftStatus === "unavailable" ? "Browser draft storage is unavailable. Keep this form open until you save." : "Keeping your draft…"}
          </Typography>}
          <Stack
            direction="row"
            sx={{
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button variant="outlined" onClick={handleClose} disabled={saving}>
              {createdEntity ? "Close" : "Cancel"}
            </Button>

            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              {saving ? (createdEntity ? "Linking…" : "Creating…") : createdEntity ? "Retry linking" : context?.submitLabel ?? (createAnother ? "Create and add another" : "Create Entity")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
    <UnsavedChangesDialog
      open={leaveAction !== null}
      canKeepDraft={leaveAction === "close" && draftStatus === "saved"}
      onKeepEditing={() => setLeaveAction(null)}
      onKeepDraft={() => { setLeaveAction(null); onClose(); }}
      onDiscard={() => {
        removeEntityDraft(storageKey);
        const action = leaveAction;
        setLeaveAction(null);
        if (action && action !== "close") handleEntityTypeChange(action.entityType);
        else { setFormData({}); setBaseData({}); onClose(); }
      }}
    />
    </>
  );
}

export default CreateEntityDrawer;
