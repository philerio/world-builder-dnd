import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { MapMarker } from "../types";
import type { MarkerStyles } from "../hooks/useMarkerStyles";
import { MARKER_ICONS, markerKind } from "../utils/markerStyles";
import type { MarkerPropertyPatch, MarkerStyle } from "../utils/markerStyles";

const KEEP = "__keep__";
export default function BulkMarkerProperties({
  markers,
  skipped,
  styles,
  onClose,
  onApply,
}: {
  markers: MapMarker[];
  skipped: number;
  styles: MarkerStyles;
  onClose: () => void;
  onApply: (
    style: MarkerStyle | null,
    patch: Partial<MarkerPropertyPatch>,
  ) => Promise<void>;
}) {
  const [styleId, setStyleId] = useState(KEEP),
    [icon, setIcon] = useState(KEEP),
    [labels, setLabels] = useState(KEEP),
    [visible, setVisible] = useState(KEEP),
    [dmOnly, setDmOnly] = useState(KEEP);
  const [colorEnabled, setColorEnabled] = useState(false),
    [color, setColor] = useState("#c9a85b");
  const [opacityEnabled, setOpacityEnabled] = useState(false),
    [opacity, setOpacity] = useState("0.3");
  const [sizeEnabled, setSizeEnabled] = useState(false),
    [size, setSize] = useState("72");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const kinds = new Set(markers.map(markerKind));
  const compatible = styles.styles.filter((style) => kinds.has(style.kind));
  const pointCount = markers.filter(
    (marker) => markerKind(marker) === "point",
  ).length;
  const shapeCount = markers.length - pointCount;
  const stampCount = markers.filter((marker) => marker.icon_image).length;
  const changes =
    styleId !== KEEP ||
    icon !== KEEP ||
    labels !== KEEP ||
    visible !== KEEP ||
    dmOnly !== KEEP ||
    colorEnabled ||
    opacityEnabled ||
    sizeEnabled;
  const current = (field: keyof MapMarker) => {
    const values = new Set(
      markers.map((marker) =>
        field === "hide_label" ? (marker[field] ?? false) : marker[field],
      ),
    );
    if (values.size > 1) return "Current: mixed";
    const value = [...values][0];
    const label =
      field === "hide_label"
        ? value
          ? "Labels hidden"
          : "Labels shown"
        : field === "visible"
          ? value
            ? "Visible"
            : "Hidden"
          : field === "dm_only"
            ? value
              ? "DM only"
              : "Allowed in Player View"
            : String(value ?? "default");
    return `Current: ${label}`;
  };
  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const patch: Partial<MarkerPropertyPatch> = {};
      if (icon !== KEEP) patch.icon = icon;
      if (labels !== KEEP) patch.hide_label = labels === "hide";
      if (visible !== KEEP) patch.visible = visible === "show";
      if (dmOnly !== KEEP) patch.dm_only = dmOnly === "dm";
      if (colorEnabled) patch.fill_color = color;
      if (opacityEnabled) patch.fill_opacity = Number(opacity);
      if (sizeEnabled) {
        if (
          !size.trim() ||
          !Number.isInteger(Number(size)) ||
          Number(size) < 24 ||
          Number(size) > 256
        )
          throw new Error(
            "Stamp size must be a whole number from 24 to 256 map units.",
          );
        patch.icon_size = Number(size);
      }
      if (
        opacityEnabled &&
        (!opacity.trim() ||
          !Number.isFinite(Number(opacity)) ||
          Number(opacity) < 0 ||
          Number(opacity) > 1)
      )
        throw new Error("Opacity must be between 0 and 1.");
      await onApply(
        compatible.find((style) => style.id === styleId) ?? null,
        patch,
      );
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update selected items.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit selected properties</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            {markers.length} unlocked items · {pointCount} points · {shapeCount}{" "}
            shapes{skipped ? ` · ${skipped} locked items skipped` : ""}
          </Typography>
          <Typography variant="body2">
            Only chosen properties change. A style applies to items of its kind;
            overrides below apply afterward. This stages one undoable map edit.
          </Typography>
          <TextField
            select
            label="Selection style"
            value={styleId}
            disabled={busy}
            onChange={(event) => setStyleId(event.target.value)}
          >
            <MenuItem value={KEEP}>Keep current styles</MenuItem>
            {compatible.map((style) => (
              <MenuItem key={style.id} value={style.id}>
                {style.name} · {style.kind} (
                {
                  markers.filter((marker) => markerKind(marker) === style.kind)
                    .length
                }{" "}
                items)
              </MenuItem>
            ))}
          </TextField>
          {pointCount > 0 && (
            <TextField
              select
              label="Point icon"
              value={icon}
              disabled={busy}
              helperText="Choosing a symbol replaces stamp artwork on selected points."
              onChange={(event) => setIcon(event.target.value)}
            >
              <MenuItem value={KEEP}>Keep current icons</MenuItem>
              {MARKER_ICONS.map((item) => (
                <MenuItem key={item} value={item}>
                  {item[0].toUpperCase() + item.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={colorEnabled}
                  disabled={busy}
                  onChange={(_event, checked) => setColorEnabled(checked)}
                />
              }
              label="Change color"
            />
            <TextField
              label="Selection color"
              type="color"
              value={color}
              disabled={busy || !colorEnabled}
              onChange={(event) => setColor(event.target.value)}
              sx={{ width: 140 }}
              helperText={current("fill_color")}
            />
          </Stack>
          {shapeCount > 0 && (
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={opacityEnabled}
                    disabled={busy}
                    onChange={(_event, checked) => setOpacityEnabled(checked)}
                  />
                }
                label="Change opacity"
              />
              <TextField
                label="Shape opacity"
                type="number"
                value={opacity}
                disabled={busy || !opacityEnabled}
                onChange={(event) => setOpacity(event.target.value)}
                slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
                sx={{ width: 140 }}
              />
            </Stack>
          )}
          {stampCount > 0 && (
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sizeEnabled}
                    disabled={busy}
                    onChange={(_event, checked) => setSizeEnabled(checked)}
                  />
                }
                label="Change stamp size"
              />
              <TextField
                label="Stamp size"
                type="number"
                value={size}
                disabled={busy || !sizeEnabled}
                onChange={(event) => setSize(event.target.value)}
                slotProps={{ htmlInput: { min: 24, max: 256, step: 1 } }}
                sx={{ width: 140 }}
                helperText={`${stampCount} stamps · map units`}
              />
            </Stack>
          )}
          <TextField
            select
            label="Label visibility"
            value={labels}
            disabled={busy}
            helperText={current("hide_label")}
            onChange={(event) => setLabels(event.target.value)}
          >
            <MenuItem value={KEEP}>Keep current labels</MenuItem>
            <MenuItem value="show">Show labels</MenuItem>
            <MenuItem value="hide">Hide labels</MenuItem>
          </TextField>
          <TextField
            select
            label="Marker visibility"
            value={visible}
            disabled={busy}
            helperText={current("visible")}
            onChange={(event) => setVisible(event.target.value)}
          >
            <MenuItem value={KEEP}>Keep current visibility</MenuItem>
            <MenuItem value="show">Visible</MenuItem>
            <MenuItem value="hide">Hidden</MenuItem>
          </TextField>
          <TextField
            select
            label="Audience"
            value={dmOnly}
            disabled={busy}
            helperText={current("dm_only")}
            onChange={(event) => setDmOnly(event.target.value)}
          >
            <MenuItem value={KEEP}>Keep current audience</MenuItem>
            <MenuItem value="dm">DM only</MenuItem>
            <MenuItem value="public">Allow in Player View</MenuItem>
          </TextField>
          {dmOnly === "public" && (
            <Alert severity="info">
              Selected visible items may appear in Player View. Fog and masks
              still apply. Publishing remains a separate action.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={busy || !changes || !markers.length}
          variant="contained"
          onClick={() => void apply()}
        >
          {busy ? "Applying…" : "Apply to selected"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
