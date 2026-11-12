/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useEffectEvent, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, IconButton, Stack, TextField, Typography, MenuItem, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { MapMarker, MapLayer } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import EntityField from "./EntityField";
import { ENTITY_FIELD_DEFINITIONS } from "../entityFieldDefinitions";
import CreateEntityDrawer from "./CreateEntityDrawer";
import type { CreationContext } from "../utils/contextualCreation";
import useDrawerViewport from "../hooks/useDrawerViewport";
import type { MarkerStyles } from "../hooks/useMarkerStyles";
import { applyMarkerStyle, markerKind } from "../utils/markerStyles";
import { MarkerStylePicker, SaveMarkerStyleButton } from "./MarkerStyles";

type MarkerDrawerProps = {
  open: boolean;
  marker: MapMarker | null;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (marker: MapMarker) => Promise<void>;
  onDelete?: (markerId: string) => Promise<void>;
  onStartDrawing?: (type: "area" | "path", marker?: MapMarker) => void;
  onEditShape?: (markerId: string) => void;
  mapEntityId?: string | null;
  layers?: MapLayer[];
  unavailableLayers?: string[];
  onOpenEntity?: (id: string) => void;
  onOpenMap?: (id: string) => void;
  onDraftChange?: (marker: MapMarker | null) => void;
  styles?: MarkerStyles;
  fullScreen?: boolean;
};

function MarkerDrawer({
  open,
  marker,
  mode,
  onClose,
  onSave,
  onDelete,
  onStartDrawing,
  onEditShape,
  mapEntityId,
  layers = [],
  unavailableLayers = [],
  onOpenEntity,
  onOpenMap,
  onDraftChange,
  styles,
  fullScreen = false,
}: MarkerDrawerProps) {
  const viewport = useDrawerViewport();
  const mobile = useMediaQuery("(max-width: 899px)");
  const [collapsed, setCollapsed] = useState(false);
  const [formData, setFormData] = useState<MapMarker | null>(marker);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [creationContext, setCreationContext] = useState<CreationContext | undefined>();
  const [createdPlace, setCreatedPlace] = useState(false);
  const { entities, getEntity } = useWorldData();
  const markerDefinition = ENTITY_FIELD_DEFINITIONS.map.find(
    (field) => field.name === "markers",
  );
  const markerFields = markerDefinition?.fields ?? [];
  const markerType = formData?.type ?? "point";

  const visibleMarkerFields = markerFields.filter((field) => {
    if (field.hidden) return false;
    if (field.name === "type") return false;
    if (field.name === "icon") {
      return markerType === "point";
    }

    if (field.name === "x" || field.name === "y") {
      return markerType === "point";
    }

    if (
      field.name === "points" ||
      field.name === "fill_opacity"
    ) {
      return markerType === "area" || markerType === "path";
    }

    if (field.name === "player_view_mask") {
      return markerType === "area";
    }

    if (field.name === "fog_reveal") {
      return markerType === "area";
    }

    return true;
  });
  const markerForReset = useEffectEvent(() => marker);
  useEffect(() => {
    setFormData(markerForReset());
    setError(null);
    setDiscardOpen(false);
    setDeleteOpen(false);
    setCreationContext(undefined);
    setCreatedPlace(false);
    setCollapsed(false);
  }, [marker?.id]);
  // Live dragging updates geometry without wiping unapplied text/property changes.
  const currentX = marker?.x, currentY = marker?.y, currentPoints = marker?.points;
  useEffect(() => {
    if (currentX !== undefined && currentY !== undefined) setFormData((current) => current ? { ...current, x: currentX, y: currentY, points: currentPoints } : current);
  }, [currentX, currentY, currentPoints]);
  const isDirty = Boolean(marker && formData && JSON.stringify(marker) !== JSON.stringify(formData));
  useEffect(() => { onDraftChange?.(open && isDirty ? formData : null); }, [open, isDirty, formData, onDraftChange]);
  useEffect(() => () => onDraftChange?.(null), [onDraftChange]);
  useEffect(() => {
    if (!open || !isDirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [open, isDirty]);
  const requestClose = () => {
    if (saving || deleting) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };
  const createPlace = () => {
    if (!formData) return;
    const parent = mapEntityId ? getEntity(mapEntityId) : undefined;
    const defaults: Record<string, unknown> = {};
    if (parent?.entity_type === "kingdom") defaults.kingdom = parent.id;
    if (parent?.entity_type === "region") defaults.region = parent.id;
    if (typeof parent?.entity.kingdom === "string") defaults.kingdom = parent.entity.kingdom;
    if (typeof parent?.entity.region === "string") defaults.region = parent.entity.region;
    if (formData.label?.trim() && !["New marker", "New area", "New path"].includes(formData.label)) defaults.name = formData.label;
    setCreationContext({
      key: `marker:${formData.id}`,
      title: "Create a place for this marker",
      description: "Create a city or location and select it here. Apply to the map, then save the map to keep the link.",
      entityType: "location",
      allowedTypes: ["location", "city"],
      initialData: defaults,
      submitLabel: "Create and select",
      link: async (entity) => {
        setFormData((current) => current ? {
          ...current,
          entity_id: entity.id,
          label: !current.label?.trim() || ["New marker", "New area", "New path"].includes(current.label) ? String(entity.entity.name) : current.label,
        } : current);
        setCreatedPlace(true);
      },
    });
  };
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
    <>
    <Drawer variant="persistent" anchor={mobile ? "bottom" : "right"} open={open} onClose={requestClose} slotProps={{ paper: { role: "region", "aria-label": "Marker properties", sx: { ...viewport, top: (viewport.top ?? 0) + 80, height: Math.max(80, (viewport.height ?? window.innerHeight) - 80), zIndex: fullScreen ? 1290 : 1180, width: mobile ? "100%" : 400, ...(mobile ? { top: "auto", bottom: Math.max(0, window.innerHeight - ((viewport.top ?? 0) + (viewport.height ?? window.innerHeight))), height: collapsed ? 64 : Math.min(viewport.height ?? window.innerHeight, Math.max(220, (viewport.height ?? window.innerHeight) * 0.55), 520), maxHeight: "100%" } : {}) } } }}>
      <Box sx={{ px: 3, py: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2">Marker properties</Typography>
        <Stack direction="row">{mobile && <Button size="small" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Expand" : "Collapse"}</Button>}<IconButton aria-label="Close marker editor" onClick={requestClose} disabled={saving || deleting}><CloseIcon /></IconButton></Stack>
      </Box>
      {!collapsed && <><Box sx={{ p: 3, pt: 1, boxSizing: "border-box", flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="overline" color="text.secondary">
          {mode === "create" ? "CREATE" : "EDITING"}
        </Typography>
        </Stack>

        <Typography variant="h5" sx={{ mb: 3 }}>
          {markerType === "point" ? "Point Marker" : markerType === "area" ? "Area Marker" : "Path Marker"}
        </Typography>

        {marker && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Position: {typeof formData?.x === "number" ? formData.x.toFixed(1) : "—"}, {typeof formData?.y === "number" ? formData.y.toFixed(1) : "—"}
            </Typography>
            {markerType === "point" && mode === "edit" && (
              <Typography variant="caption" color="text.secondary">
                Drag this marker on the map to adjust its position. Apply property changes below, then save the map.
              </Typography>
            )}
            {(markerType === "area" || markerType === "path") && mode === "create" && (
              <Typography variant="caption" color="text.secondary">
                Shape preview stays on the map until you save or discard it.
              </Typography>
            )}
            <Stack spacing={2}>
              {styles && formData && <>
                <MarkerStylePicker styles={styles} kind={markerKind(formData)} disabled={saving || deleting} onSelect={(style) => setFormData((current) => current ? applyMarkerStyle(current, style) : current)} />
                <SaveMarkerStyleButton styles={styles} marker={formData} disabled={saving || deleting} />
                {styles.warning && <Alert severity="warning">{styles.warning}</Alert>}
              </>}
              <TextField select label="Layer" size="small" value={formData?.layer_id ?? ""} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }} disabled={saving || deleting} onChange={(event) => updateField("layer_id", event.target.value || null)}>
                <MenuItem value="">Unassigned</MenuItem>
                {layers.map((layer) => <MenuItem key={layer.id} value={layer.id} disabled={unavailableLayers.includes(layer.id) && layer.id !== marker?.layer_id}>{layer.name}</MenuItem>)}
              </TextField>
              {(formData?.entity_id || formData?.linked_map) && <Stack direction="row" spacing={1}>
                {formData.entity_id && <Button size="small" onClick={() => onOpenEntity?.(formData.entity_id!)}>Open linked record</Button>}
                {formData.linked_map && <Button size="small" onClick={() => onOpenMap?.(formData.linked_map!)}>Open linked map</Button>}
              </Stack>}
              {formData &&
                visibleMarkerFields.map((field) => (
                  <Box key={field.name}>
                  <EntityField
                    field={field}
                    value={formData[field.name as keyof MapMarker]}
                    onChange={(value) => {
                      updateField(field.name as keyof MapMarker, value);
                    }}
                    entities={entities}
                    disabled={saving || deleting || field.name === "id"}
                  />
                  {field.name === "entity_id" && !formData.entity_id && (
                    <Button size="small" variant="outlined" onClick={createPlace} disabled={saving || deleting} sx={{ mt: 1 }}>Create a city or location</Button>
                  )}
                  </Box>
                ))}
              {createdPlace && <Alert severity="success">Place created and selected. Apply to map, then save the map to keep the link. The place remains in your world if you discard this marker.</Alert>}
              {formData?.icon_image && markerType === "point" && (
                <TextField
                  label="Building footprint size (map units)"
                  type="number"
                  size="small"
                  value={formData.icon_size ?? 72}
                  slotProps={{ htmlInput: { min: 24, max: 256 } }}
                  onChange={(event) => updateField("icon_size", Math.max(24, Math.min(256, Number(event.target.value) || 24)))}
                  helperText="This size follows map zoom. Adjust this placed copy independently."
                />
              )}
            </Stack>
            {formData && mode === "create" && formData.type === "point" && (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    onStartDrawing?.("area", {
                      ...formData,
                      type: "area",
                    })
                  }
                >
                  Draw Area
                </Button>

                <Button
                  variant="outlined"
                  onClick={() =>
                    onStartDrawing?.("path", {
                      ...formData,
                      type: "path",
                    })
                  }
                >
                  Draw Path
                </Button>
              </Stack>
            )}

            {formData && mode === "edit" &&
              (formData.type === "area" || formData.type === "path") && (
                <Stack spacing={1}>
                  <Button variant="outlined" disabled={saving || deleting} onClick={async () => {
                    if (!formData || !onEditShape) return;
                    setError(null);
                    if (isDirty) {
                      setSaving(true);
                      try {
                        await onSave(formData);
                      } catch (saveError) {
                        setError(saveError instanceof Error ? saveError.message : "Could not save this marker.");
                        setSaving(false);
                        return;
                      }
                      setSaving(false);
                    }
                    onEditShape(formData.id);
                  }}>
                    Edit Shape on Map
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Finish reshaping on the map to save the geometry. Marker details save below.
                  </Typography>
                </Stack>
              )}
            {error && <Alert severity="error">{error}</Alert>}
            {mode === "edit" && onDelete && (
              <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)} disabled={saving || deleting}>
                Delete Marker
              </Button>
            )}
          </Stack>
        )}
      </Box>
      {marker && (
            <Stack direction="row" spacing={2} sx={{ px: 3, py: 2, flexShrink: 0, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
              <Button
                variant="contained"
                onClick={async () => {
                  if (!formData) return;
                  setSaving(true);
                  setError(null);
                  try {
                    await onSave(formData);
                  } catch (saveError) {
                    setError(saveError instanceof Error ? saveError.message : "Could not save this marker.");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={!formData || saving || deleting}
              >
                {saving ? "Applying…" : "Apply to map"}
              </Button>

              <Button variant="outlined" onClick={requestClose} disabled={saving || deleting}>
                Cancel
              </Button>
            </Stack>
      )}
      </>}
    </Drawer>
    <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)}>
      <DialogTitle>Discard marker changes?</DialogTitle>
      <DialogContent><Typography>Unsaved marker details will be lost.</Typography></DialogContent>
      <DialogActions>
        <Button onClick={() => setDiscardOpen(false)}>Keep Editing</Button>
        <Button color="error" onClick={() => { setDiscardOpen(false); onClose(); }}>Discard</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
      <DialogTitle>Delete this marker?</DialogTitle>
      <DialogContent><Typography>This removes the marker from this map. The linked entity stays in your world.</Typography></DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
        <Button color="error" onClick={async () => {
          if (!marker || !onDelete) return;
          setDeleting(true);
          setError(null);
          try {
            await onDelete(marker.id);
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Could not delete this marker.");
            setDeleteOpen(false);
          } finally {
            setDeleting(false);
          }
        }} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete Marker"}
        </Button>
      </DialogActions>
    </Dialog>
    <CreateEntityDrawer overlayZIndex={fullScreen ? 1295 : undefined} open={Boolean(creationContext)} context={creationContext} onClose={() => setCreationContext(undefined)} onCreated={() => setCreationContext(undefined)} />
    </>
  );
}

export default MarkerDrawer;
