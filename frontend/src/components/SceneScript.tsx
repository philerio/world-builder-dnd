import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { alpha } from "@mui/material/styles";
import type { SceneScriptBlock, StoryBeat } from "../types";
import { createId } from "../utils/createId";

const labels: Record<SceneScriptBlock["kind"], string> = {
  narration: "Narration",
  dialogue: "Dialogue",
  dm_note: "DM note",
};

export function SceneScriptView({
  blocks,
  showDmNotes = true,
}: {
  blocks: SceneScriptBlock[];
  showDmNotes?: boolean;
}) {
  const visible = blocks.filter(
    (block) => showDmNotes || block.kind !== "dm_note"
  );
  return (
    <Stack
      component="section"
      aria-label="Scene script text"
      spacing={2.5}
      sx={{ minWidth: 0, fontSize: "0.9375rem", lineHeight: 1.7 }}
    >
      {!visible.length && (
        <Typography color="text.secondary">
          No scene text to display.
        </Typography>
      )}
      {visible.map((block) => (
        <Box
          key={block.id}
          component={block.kind === "dialogue" ? "blockquote" : "div"}
          sx={{
            m: 0,
            p: block.kind === "narration" ? 0 : 1.75,
            borderLeft: block.kind === "narration" ? 0 : 3,
            borderRadius: block.kind === "narration" ? 0 : 1,
            borderColor:
              block.kind === "dm_note" ? "warning.main" : "primary.main",
            bgcolor: (theme) =>
              block.kind === "narration"
                ? "transparent"
                : alpha(
                    block.kind === "dm_note"
                      ? theme.palette.warning.main
                      : theme.palette.primary.main,
                    0.06
                  ),
          }}
        >
          {block.kind !== "narration" && (
            <Typography
              variant="overline"
              color={block.kind === "dm_note" ? "warning.main" : "primary.main"}
              sx={{
                display: "block",
                mb: 0.75,
                fontSize: "0.6875rem",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {block.kind === "dialogue"
                ? block.speaker?.trim() || "Speaker"
                : "DM only"}
            </Typography>
          )}
          <Box sx={{ "& > p + p": { mt: 1.5 } }}>
            {(block.text || "No text yet.")
              .split(/\r?\n[\t ]*\r?\n/)
              .map((paragraph, index) => (
                <Typography
                  key={index}
                  component="p"
                  color={!block.text.trim() ? "text.secondary" : "text.primary"}
                  sx={{
                    m: 0,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: "inherit",
                    lineHeight: "inherit",
                  }}
                >
                  {paragraph}
                </Typography>
              ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function SceneScriptEditor({
  blocks,
  speakers,
  onChange,
  disabled,
}: {
  blocks: SceneScriptBlock[];
  speakers: string[];
  onChange: (blocks: SceneScriptBlock[]) => void;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const change = (id: string, values: Partial<SceneScriptBlock>) =>
    onChange(
      blocks.map((block) => (block.id === id ? { ...block, ...values } : block))
    );
  const move = (index: number, offset: number) => {
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(index + offset, 0, block);
    onChange(next);
  };
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Scene script editor"
      sx={{ p: 1.5, minWidth: 0 }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h3">Scene script</Typography>
          <Button
            size="small"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Continue writing" : "Preview scene script"}
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Write the scene in order: descriptions, spoken lines, and private
          reminders. Blank lines keep paragraph breaks. Nothing here advances
          the story automatically.
        </Typography>
        {preview ? (
          <SceneScriptView blocks={blocks} />
        ) : (
          <>
            {!blocks.length && (
              <Typography variant="body2" color="text.secondary">
                Add a paragraph to begin, or leave the script empty for now.
              </Typography>
            )}
            {blocks.map((block, index) => (
              <Box
                key={block.id}
                sx={{
                  p: 1.25,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  minWidth: 0,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    sx={{ alignItems: "center" }}
                  >
                    <TextField
                      select
                      size="small"
                      label={`Section ${index + 1} type`}
                      value={block.kind}
                      onChange={(event) =>
                        change(block.id, {
                          kind: event.target.value as SceneScriptBlock["kind"],
                        })
                      }
                      disabled={disabled}
                      sx={{ flex: 1, minWidth: 100 }}
                    >
                      {Object.entries(labels).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Tooltip title="Move up">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Move script section ${index + 1} up`}
                          disabled={disabled || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move down">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Move script section ${index + 1} down`}
                          disabled={disabled || index === blocks.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove section">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Remove script section ${index + 1}`}
                          disabled={disabled}
                          onClick={() =>
                            onChange(
                              blocks.filter((item) => item.id !== block.id)
                            )
                          }
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                  {block.kind === "dialogue" && (
                    <Autocomplete
                      freeSolo
                      options={speakers}
                      inputValue={block.speaker ?? ""}
                      onInputChange={(_, speaker, reason) => {
                        if (reason !== "reset") change(block.id, { speaker });
                      }}
                      onChange={(_, speaker) =>
                        change(block.id, { speaker: speaker ?? "" })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label={`Section ${index + 1} speaker`}
                          placeholder="Left guard, narrator, or an NPC name"
                        />
                      )}
                      disabled={disabled}
                    />
                  )}
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label={`Section ${index + 1} text`}
                    value={block.text}
                    placeholder={
                      block.kind === "dialogue"
                        ? "What does this character say?"
                        : block.kind === "dm_note"
                        ? "A private reminder or possible response…"
                        : "Describe what the characters see, hear, or experience…"
                    }
                    onChange={(event) =>
                      change(block.id, { text: event.target.value })
                    }
                    disabled={disabled}
                  />
                </Stack>
              </Box>
            ))}
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {(Object.keys(labels) as SceneScriptBlock["kind"][]).map(
                (kind) => (
                  <Button
                    key={kind}
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={disabled}
                    onClick={() =>
                      onChange([...blocks, { id: createId(), kind, text: "" }])
                    }
                  >
                    {kind === "narration"
                      ? "Add paragraph"
                      : kind === "dialogue"
                      ? "Add dialogue"
                      : "Add DM note"}
                  </Button>
                )
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export function SceneScriptReader({
  beats,
  initialBeatId,
  onClose,
}: {
  beats: StoryBeat[];
  initialBeatId: string;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(initialBeatId);
  const [showDmNotes, setShowDmNotes] = useState(true);
  const scenes = [...beats]
    .filter((beat) => beat.scene_script?.length)
    .sort(
      (left, right) => (left.order ?? Infinity) - (right.order ?? Infinity)
    );
  const index = Math.max(
    0,
    scenes.findIndex((beat) => beat.id === selectedId)
  );
  const scene = scenes[index];
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="scene-script-reader-title"
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            width: { xs: "calc(100% - 16px)", sm: "calc(100% - 48px)" },
            maxWidth: 960,
            height: {
              xs: "calc(100dvh - 16px)",
              sm: "min(900px, calc(100dvh - 48px))",
            },
            maxHeight: { xs: "calc(100dvh - 16px)", sm: "calc(100dvh - 48px)" },
            m: { xs: 1, sm: 3 },
            backgroundImage: "none",
            border: 1,
            borderColor: "divider",
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1,
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <DialogTitle
          id="scene-script-reader-title"
          sx={{ p: 0, fontSize: "1.125rem", fontWeight: 600 }}
        >
          Scene script
        </DialogTitle>
        <IconButton
          size="small"
          aria-label="Close scene script"
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          pb: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          useFlexGap
          sx={{ alignItems: { sm: "center" } }}
        >
          <TextField
            select
            fullWidth
            size="small"
            label="Reading scene"
            value={scene?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {scenes.map((beat) => (
              <MenuItem key={beat.id} value={beat.id}>
                {beat.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            sx={{
              flexShrink: 0,
              m: 0,
              "& .MuiFormControlLabel-label": { fontSize: "0.8125rem" },
            }}
            label="Show DM notes"
            control={
              <Checkbox
                size="small"
                checked={showDmNotes}
                onChange={(event) => setShowDmNotes(event.target.checked)}
              />
            }
          />
        </Stack>
      </Box>
      <DialogContent
        key={scene?.id}
        role="region"
        aria-label="Scene reading area"
        sx={{
          minHeight: 0,
          px: { xs: 2, sm: 3 },
          py: 2.5,
          overscrollBehavior: "contain",
          scrollbarGutter: "stable",
          scrollbarWidth: "thin",
        }}
      >
        <Box
          component="article"
          aria-labelledby="scene-script-scene-title"
          sx={{ maxWidth: "78ch", mx: "auto", pb: 1 }}
        >
          <Typography
            id="scene-script-scene-title"
            component="h3"
            variant="h3"
            sx={{ mb: 2.5, overflowWrap: "anywhere" }}
          >
            {scene?.name}
          </Typography>
          <SceneScriptView
            blocks={scene?.scene_script ?? []}
            showDmNotes={showDmNotes}
          />
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 1.25,
          gap: 1,
          borderTop: 1,
          borderColor: "divider",
          justifyContent: "space-between",
          "& > :not(style) ~ :not(style)": { ml: 0 },
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flexShrink: 0 }}
        >
          {scenes.length
            ? `Scene ${index + 1} of ${scenes.length}`
            : "No scenes"}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            aria-label="Previous scene"
            disabled={index === 0}
            onClick={() => setSelectedId(scenes[index - 1].id)}
            sx={{ minWidth: 32, gap: 0.25, px: 0.75 }}
          >
            <ChevronLeftIcon fontSize="small" />
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Previous
            </Box>
          </Button>
          <Button
            size="small"
            aria-label="Next scene"
            disabled={index >= scenes.length - 1}
            onClick={() => setSelectedId(scenes[index + 1].id)}
            sx={{ minWidth: 32, gap: 0.25, px: 0.75 }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Next
            </Box>
            <ChevronRightIcon fontSize="small" />
          </Button>
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
