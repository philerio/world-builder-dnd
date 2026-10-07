/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, Stack, Typography } from "@mui/material";
import type { MapMarker } from "../types";
import { useWorldData } from "../context/WorldDataContext";
import EntityField from "./EntityField";
import { ENTITY_FIELD_DEFINITIONS } from "../entityFieldDefinitions";

type MarkerDrawerProps = {
  open: boolean;
  marker: MapMarker | null;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (marker: MapMarker) => Promise<void>;
  onDelete?: (markerId: string) => Promise<void>;
  onStartDrawing?: (type: "area" | "path", marker?: MapMarker) => void;
  onEditShape?: (markerId: string) => void;
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
}: MarkerDrawerProps) {
  const [formData, setFormData] = useState<MapMarker | null>(marker);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { entities } = useWorldData();
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
      field.name === "fill_color" ||
      field.name === "fill_opacity"
    ) {
      return markerType === "area" || markerType === "path";
    }

    return true;
  });
  useEffect(() => {
    setFormData(marker);
    setError(null);
    setDiscardOpen(false);
    setDeleteOpen(false);
  }, [marker]);
  const isDirty = Boolean(marker && formData && JSON.stringify(marker) !== JSON.stringify(formData));
  const requestClose = () => {
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
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
    <Drawer anchor="right" open={open} onClose={requestClose}>
      <Box sx={{ width: { xs: "min(100vw, 440px)", sm: 460 }, p: 3, boxSizing: "border-box", minHeight: "100%" }}>
        <Typography variant="overline" color="text.secondary">
          {mode === "create" ? "CREATE" : "EDITING"}
        </Typography>

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
                Drag this marker on the map to move it; its position saves immediately.
              </Typography>
            )}
            {(markerType === "area" || markerType === "path") && mode === "create" && (
              <Typography variant="caption" color="text.secondary">
                Shape preview stays on the map until you save or discard it.
              </Typography>
            )}
            <Stack spacing={2}>
              {formData &&
                visibleMarkerFields.map((field) => (
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
            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
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
                {saving ? "Saving…" : "Save Details"}
              </Button>

              <Button variant="outlined" onClick={requestClose} disabled={saving || deleting}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
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
    </>
  );
}

export default MarkerDrawer;
