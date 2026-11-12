import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import CastleIcon from "@mui/icons-material/Castle";
import ChurchIcon from "@mui/icons-material/Church";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import ForestIcon from "@mui/icons-material/Forest";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import HouseIcon from "@mui/icons-material/House";
import PlaceIcon from "@mui/icons-material/Place";
import type { MapMarker } from "../types";
import type { MarkerStyles } from "../hooks/useMarkerStyles";
import type { MarkerKind, MarkerStyle } from "../utils/markerStyles";
import { API_BASE_URL } from "../api";

export function MarkerStyleSwatch({ style }: { style: MarkerStyle }) {
  const { appearance, kind } = style;
  const color = appearance.fill_color ?? "#c9a85b";
  const Icon =
    {
      city: LocationCityIcon,
      castle: CastleIcon,
      church: ChurchIcon,
      farm: AgricultureIcon,
      forest: ForestIcon,
      map: MapOutlinedIcon,
      house: HouseIcon,
      location: PlaceIcon,
    }[appearance.icon ?? "location"] ?? PlaceIcon;
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 44,
        height: 44,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        color,
      }}
    >
      {kind === "point" ? (
        appearance.icon_image ? (
          <Box
            component="img"
            src={`${API_BASE_URL}${appearance.icon_image}`}
            alt=""
            sx={{ width: 40, height: 40, objectFit: "contain" }}
          />
        ) : (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "3px solid",
              bgcolor: "#121212",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )
      ) : (
        <svg width="42" height="38" viewBox="0 0 42 38">
          {kind === "area" ? (
            <path
              d="M4 30 L9 5 L30 7 L38 26 Z"
              stroke={color}
              strokeWidth="2"
              fill={color}
              fillOpacity={appearance.fill_opacity ?? 0.2}
            />
          ) : (
            <path
              d="M4 30 L14 24 L24 9 L38 6"
              stroke={color}
              strokeWidth="4"
              strokeOpacity={appearance.fill_opacity ?? 0.85}
              fill="none"
            />
          )}
        </svg>
      )}
    </Box>
  );
}

export function MarkerStylePicker({
  styles,
  kind,
  onSelect,
  disabled,
}: {
  styles: MarkerStyles;
  kind: MarkerKind;
  onSelect: (style: MarkerStyle) => void;
  disabled?: boolean;
}) {
  const compatible = styles.styles
    .filter((style) => style.kind === kind)
    .sort(
      (a, b) =>
        Number(styles.library.favorites.includes(b.id)) -
        Number(styles.library.favorites.includes(a.id)),
    );
  return (
    <TextField
      select
      size="small"
      fullWidth
      label="Marker style"
      value=""
      disabled={disabled}
      slotProps={{
        select: { displayEmpty: true },
        inputLabel: { shrink: true },
      }}
      onChange={(event) => {
        const style = compatible.find((item) => item.id === event.target.value);
        if (style) onSelect(style);
      }}
    >
      <MenuItem value="" disabled>
        Choose a style
      </MenuItem>
      {compatible.map((style) => (
        <MenuItem key={style.id} value={style.id}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <MarkerStyleSwatch style={style} />
            {styles.library.favorites.includes(style.id) ? "★ " : ""}
            {style.name}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

export function SaveMarkerStyleButton({
  marker,
  styles,
  disabled,
}: {
  marker: MapMarker;
  styles: MarkerStyles;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const save = () => {
    try {
      styles.save(marker, name);
      setOpen(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save style.",
      );
    }
  };
  return (
    <>
      <Button
        size="small"
        disabled={disabled}
        onClick={() => {
          setName("");
          setError("");
          setOpen(true);
        }}
      >
        Save appearance as style
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Save marker style</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Copies appearance only. Names, links, position, layers, visibility
              and DM-only settings stay with each marker.
            </Typography>
            <TextField
              autoFocus
              label="Style name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) save();
              }}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!name.trim()} onClick={save}>
            Save style
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function MarkerStyleLibraryDialog({
  open,
  onClose,
  styles,
  onPlace,
}: {
  open: boolean;
  onClose: () => void;
  styles: MarkerStyles;
  onPlace: (style: MarkerStyle) => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState("");
  const [rename, setRename] = useState<MarkerStyle | null>(null),
    [name, setName] = useState("");
  const [remove, setRemove] = useState<MarkerStyle | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const filtered = styles.styles
    .filter(
      (style) =>
        style.name
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()) &&
        (filter === "all" || filter === "favorites"
          ? filter !== "favorites" ||
            styles.library.favorites.includes(style.id)
          : style.kind === filter),
    )
    .sort(
      (a, b) =>
        Number(styles.library.favorites.includes(b.id)) -
        Number(styles.library.favorites.includes(a.id)),
    );
  const exportLibrary = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(styles.library, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "marker-styles.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Marker style library</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Use a preset to place an item, or save a custom style from marker
              properties. Applying a style copies its appearance; editing the
              style library does not change existing markers.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Custom styles and favorites are saved in this browser for this
              world. Export/import transfers them between browsers. Image styles
              reference uploaded PNG assets.
            </Typography>
            {(error || styles.warning) && (
              <Alert severity="warning">{error || styles.warning}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Search styles"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <TextField
                select
                size="small"
                label="Style kind"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                sx={{ minWidth: 120 }}
              >
                {["all", "favorites", "point", "area", "path"].map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {kind[0].toUpperCase() + kind.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {filtered.length === 0 && (
              <Typography>No matching styles.</Typography>
            )}
            {filtered.map((style) => (
              <Box
                key={style.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <MarkerStyleSwatch style={style} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ overflowWrap: "anywhere" }}>
                      {style.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {style.kind} ·{" "}
                      {style.id.startsWith("builtin:") ? "Built-in" : "Custom"}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={`${styles.library.favorites.includes(style.id) ? "Unfavorite" : "Favorite"} ${style.name}`}
                    onClick={() => {
                      try {
                        styles.favorite(style.id);
                      } catch (error) {
                        setError(String(error));
                      }
                    }}
                  >
                    {styles.library.favorites.includes(style.id) ? (
                      <StarIcon />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </IconButton>
                </Stack>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      onPlace(style);
                      onClose();
                    }}
                  >
                    Place {style.name}
                  </Button>
                  {!style.id.startsWith("builtin:") && (
                    <>
                      <Button
                        size="small"
                        onClick={() => {
                          setRename(style);
                          setName(style.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setRemove(style)}
                      >
                        Delete style
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>
            ))}
            <input
              hidden
              ref={input}
              type="file"
              accept="application/json,.json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 1024 * 1024)
                    throw new Error("Style libraries must be 1 MB or smaller.");
                  styles.importLibrary(await file.text());
                  setError("");
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not import styles.",
                  );
                }
              }}
            />
            <Stack direction="row" spacing={1}>
              <Button onClick={exportLibrary}>Export styles</Button>
              <Button onClick={() => input.current?.click()}>
                Import styles
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close styles</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(rename)}
        onClose={() => setRename(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename style</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Style name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRename(null)}>Cancel</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              try {
                if (rename) styles.rename(rename.id, name);
                setRename(null);
                setError("");
              } catch (error) {
                setError(String(error));
              }
            }}
          >
            Rename style
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(remove)} onClose={() => setRemove(null)}>
        <DialogTitle>Delete {remove?.name} style?</DialogTitle>
        <DialogContent>Existing markers keep their appearance.</DialogContent>
        <DialogActions>
          <Button onClick={() => setRemove(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              try {
                if (remove) styles.remove(remove.id);
                setRemove(null);
              } catch (error) {
                setError(String(error));
              }
            }}
          >
            Delete style
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
