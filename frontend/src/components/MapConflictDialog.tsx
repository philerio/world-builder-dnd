import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { formatMapConflictValue } from "../utils/mapConflicts";
import type {
  MapConflictChoices,
  MapConflictReview,
  MapDraftConflict,
} from "../utils/mapConflicts";

export default function MapConflictDialog({
  review,
  onClose,
  onResolve,
  getEntityName,
}: {
  review: MapConflictReview;
  onClose: () => void;
  onResolve: (choices: MapConflictChoices) => Promise<void>;
  getEntityName: (id: string) => string | undefined;
}) {
  const [choices, setChoices] = useState<MapConflictChoices>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remaining = review.details.filter(
    (conflict) => !choices[conflict.id],
  ).length;
  const chooseAll = (value: "mine" | "saved") =>
    setChoices(
      Object.fromEntries(
        review.details.map((conflict) => [conflict.id, value]),
      ),
    );
  const display = (conflict: MapDraftConflict, side: "mine" | "saved") => {
    const value = conflict[side];
    if (conflict.kind === "item" && value === undefined) return "Deleted";
    if (conflict.field === "layer_id") {
      const map = side === "mine" ? review.draft : review.latest;
      return typeof value === "string"
        ? (map.layers?.find((layer) => layer.id === value)?.name ?? value)
        : "Unassigned";
    }
    if (
      typeof value === "string" &&
      ["entity_id", "linked_map", "parent_map"].includes(conflict.field ?? "")
    )
      return getEntityName(value) ?? value;
    return formatMapConflictValue(value);
  };
  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="map-conflict-title"
    >
      <DialogTitle id="map-conflict-title">
        Resolve conflicting map edits
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2">
            Compare your draft with the saved map and choose a value for each
            conflict. Unrelated changes from both versions will be kept.
          </Typography>
          {review.legacy && (
            <Alert severity="warning">
              This older draft has no original version to compare against.
              Review every difference before saving.
            </Alert>
          )}
          {review.changed && (
            <Alert severity="info">
              The saved map or your draft changed during review. These are the
              latest values; choose again before saving.
            </Alert>
          )}
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              size="small"
              disabled={busy}
              onClick={() => chooseAll("mine")}
            >
              Use all mine
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => chooseAll("saved")}
            >
              Use all saved
            </Button>
            <Typography
              role="status"
              variant="caption"
              sx={{ alignSelf: "center" }}
            >
              {remaining
                ? `${remaining} ${remaining === 1 ? "conflict needs" : "conflicts need"} a choice`
                : "All conflicts resolved"}
            </Typography>
          </Stack>
          {review.details.map((conflict) => (
            <Paper
              key={conflict.id}
              component="section"
              aria-label={conflict.label}
              variant="outlined"
              sx={{ p: 1.5, minWidth: 0 }}
            >
              <Typography
                component="h3"
                variant="subtitle2"
                sx={{ overflowWrap: "anywhere" }}
              >
                {conflict.label}
              </Typography>
              {conflict.note && (
                <Typography variant="caption" color="text.secondary">
                  {conflict.note}
                </Typography>
              )}
              <RadioGroup
                aria-label={conflict.label}
                value={choices[conflict.id] ?? ""}
                onChange={(_event, value) =>
                  setChoices((current) => ({
                    ...current,
                    [conflict.id]: value as "mine" | "saved",
                  }))
                }
                sx={{ mt: 1 }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {(["mine", "saved"] as const).map((side) => (
                    <Box
                      key={side}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        border: 1,
                        borderColor:
                          choices[conflict.id] === side
                            ? "primary.main"
                            : "divider",
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.5,
                      }}
                    >
                      <FormControlLabel
                        disabled={busy}
                        value={side}
                        control={<Radio size="small" />}
                        label={side === "mine" ? "Use mine" : "Use saved"}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {side === "mine" ? "Your draft" : "Saved map"}
                      </Typography>
                      <Typography
                        component="pre"
                        variant="body2"
                        sx={{
                          m: 0,
                          py: 1,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          maxHeight: 240,
                          overflowY: "auto",
                          fontFamily: "inherit",
                        }}
                      >
                        {display(conflict, side)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </Paper>
          ))}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button disabled={busy} onClick={onClose}>
          Keep editing
        </Button>
        <Button
          variant="contained"
          disabled={busy || remaining > 0}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onResolve(choices);
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Could not save these choices.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save resolved map"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
