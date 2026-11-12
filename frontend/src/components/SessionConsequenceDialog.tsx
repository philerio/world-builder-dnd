import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CampaignStory } from "../types";
import {
  journalSource,
  linkSessionConsequence,
  type ConsequenceSource,
} from "../utils/sessionJournal";
import { createId } from "../utils/createId";

export default function SessionConsequenceDialog({
  story,
  source,
  disabled,
  onSave,
  onClose,
}: {
  story: CampaignStory;
  source: ConsequenceSource;
  disabled: boolean;
  onSave: (story: CampaignStory) => Promise<boolean>;
  onClose: () => void;
}) {
  const record = journalSource(story, source);
  const [id] = useState(createId);
  const [beatId, setBeatId] = useState(
    record?.story_beat ?? story.current_beat ?? ""
  );
  const [description, setDescription] = useState("");
  const [timing, setTiming] = useState("");
  const [nextIds, setNextIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (disabled) return;
    setError(null);
    try {
      const next = linkSessionConsequence(story, source, beatId, {
        id,
        description,
        timing: timing.trim() || undefined,
        status: "pending",
        leads_to: nextIds,
      });
      if (!(await onSave(next)))
        throw new Error(
          "The consequence did not save. Your draft is still here."
        );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create this consequence."
      );
    }
  };
  return (
    <Dialog
      open
      onClose={() => !disabled && onClose()}
      fullWidth
      maxWidth="sm"
      aria-labelledby="session-consequence-title"
    >
      <DialogTitle id="session-consequence-title">
        Create consequence
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            Because: {record?.description ?? "Source no longer available"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            What might happen because of this? Who reacts, what changes, or
            which scene could follow? This creates a pending consequence for you
            to review.
          </Typography>
          <TextField
            label="What happens next?"
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={disabled}
          />
          <TextField
            select
            label="Attach consequence to plot point"
            value={beatId}
            onChange={(event) => setBeatId(event.target.value)}
            disabled={disabled}
          >
            <MenuItem value="">Choose a plot point</MenuItem>
            {story.beats.map((beat) => (
              <MenuItem key={beat.id} value={beat.id}>
                {beat.name}
              </MenuItem>
            ))}
          </TextField>
          {!story.beats.length && (
            <Alert severity="info">
              Add a plot point in the planner first. You can record a follow-up
              in the session journal while deciding where this belongs.
            </Alert>
          )}
          <TextField
            label="When or under what condition?"
            value={timing}
            onChange={(event) => setTiming(event.target.value)}
            disabled={disabled}
          />
          <TextField
            select
            label="Possible next plot points (optional)"
            value={nextIds}
            slotProps={{ select: { multiple: true } }}
            onChange={(event) =>
              setNextIds(
                typeof event.target.value === "string"
                  ? event.target.value.split(",")
                  : event.target.value
              )
            }
            disabled={disabled}
          >
            {story.beats.map((beat) => (
              <MenuItem key={beat.id} value={beat.id}>
                {beat.name}
              </MenuItem>
            ))}
          </TextField>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void save()}
          disabled={disabled || !record || !description.trim() || !beatId}
        >
          {disabled ? "Saving…" : "Save consequence"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
