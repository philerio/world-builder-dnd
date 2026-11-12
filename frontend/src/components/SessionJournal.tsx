import { memo, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CampaignStory, EntitySummary, SessionEntry } from "../types";
import {
  journalKinds,
  saveJournalEntry,
  type ConsequenceSource,
} from "../utils/sessionJournal";
import { createId } from "../utils/createId";
import {
  draftKey,
  readEntityDraft,
  removeEntityDraft,
} from "../utils/entityDrafts";
import useDraftProtection from "../hooks/useDraftProtection";

export const SessionEntryList = memo(function SessionEntryList({
  story,
  entries,
  npcs,
  onOpenEntity,
  onEdit,
  onConsequence,
  onResolve,
  disabled = false,
}: {
  story: CampaignStory;
  entries: SessionEntry[];
  npcs: EntitySummary[];
  onOpenEntity: (id: string) => void;
  onEdit?: (entry: SessionEntry) => void;
  onConsequence?: (source: ConsequenceSource) => void;
  onResolve?: (entry: SessionEntry) => void;
  disabled?: boolean;
}) {
  return (
    <Stack component="section" aria-label="Session journal entries" spacing={1}>
      {entries.map((entry) => {
        const beat = story.beats.find((item) => item.id === entry.story_beat);
        const cause = entry.source_action_id
          ? story.player_actions.find(
              (item) => item.id === entry.source_action_id
            )
          : (story.session_entries ?? []).find(
              (item) => item.id === entry.source_entry_id
            );
        const consequences = story.beats
          .flatMap((item) => item.consequences ?? [])
          .filter((item) => entry.consequence_ids?.includes(item.id));
        return (
          <Box
            key={entry.id}
            component="article"
            aria-label={`${journalKinds[entry.kind].label}: ${
              entry.description
            }`}
            sx={{
              p: 1.25,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              minWidth: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "center", mb: 0.75 }}
            >
              <Chip size="small" label={journalKinds[entry.kind].label} />
              {entry.kind === "dm_note" && (
                <Typography variant="caption" color="warning.main">
                  DM only
                </Typography>
              )}
              {entry.kind === "follow_up" && (
                <Typography
                  variant="caption"
                  color={entry.resolved ? "text.secondary" : "warning.main"}
                >
                  {entry.resolved ? "Done" : "Open"}
                </Typography>
              )}
              {beat && (
                <Typography variant="caption" color="text.secondary">
                  {beat.name}
                </Typography>
              )}
            </Stack>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {entry.description}
            </Typography>
            {(entry.npc_ids ?? []).map((id) => (
              <Button key={id} size="small" onClick={() => onOpenEntity(id)}>
                {npcs.find((npc) => npc.id === id)?.name ?? id}
              </Button>
            ))}
            {cause && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75, overflowWrap: "anywhere" }}
              >
                In response to: {cause.description}
              </Typography>
            )}
            {consequences.map((item) => (
              <Typography
                key={item.id}
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Consequence: {item.description} · {item.status}
              </Typography>
            ))}
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{ flexWrap: "wrap", mt: 0.75 }}
            >
              {onEdit && (
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={() => onEdit(entry)}
                >
                  Edit entry
                </Button>
              )}
              {onConsequence && (
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={() => onConsequence({ kind: "entry", id: entry.id })}
                >
                  Create consequence
                </Button>
              )}
              {entry.kind === "follow_up" && onResolve && (
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={() => onResolve(entry)}
                >
                  {entry.resolved ? "Reopen follow-up" : "Mark follow-up done"}
                </Button>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
});

const EMPTY_DRAFT_BASE = {};

export default function SessionJournal({
  story,
  worldId,
  campaignId,
  session,
  npcs,
  disabled,
  onSave,
  onOpenEntity,
  onConsequence,
}: {
  story: CampaignStory;
  worldId: string;
  campaignId: string;
  session: number;
  npcs: EntitySummary[];
  disabled: boolean;
  onSave: (story: CampaignStory) => Promise<boolean>;
  onOpenEntity: (id: string) => void;
  onConsequence: (source: ConsequenceSource) => void;
}) {
  const storageKey = draftKey(
    worldId,
    `session-journal:${campaignId}:${session}`
  );
  const blank = (kind: SessionEntry["kind"] = "dm_note"): SessionEntry => ({
    id: createId(),
    kind,
    description: "",
    session,
    story_beat: story.current_beat,
    npc_ids: [],
    consequence_ids: [],
    recorded_at: new Date().toISOString(),
  });
  const [entry, setEntry] = useState<SessionEntry>(() => {
    const saved = readEntityDraft(storageKey)?.data;
    return saved &&
      typeof saved.id === "string" &&
      typeof saved.description === "string" &&
      typeof saved.kind === "string" &&
      Object.hasOwn(journalKinds, saved.kind) &&
      saved.session === session
      ? (saved as unknown as SessionEntry)
      : blank();
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const data = useMemo(() => ({ ...entry }), [entry]);
  const draftStatus = useDraftProtection({
    key: storageKey,
    entityType: "session_entry",
    base: EMPTY_DRAFT_BASE,
    data,
    active: true,
    dirty: Boolean(entry.description),
  });
  const entries = useMemo(
    () =>
      (story.session_entries ?? []).filter((item) => item.session === session),
    [story.session_entries, session]
  );
  const causes = useMemo(
    () => [
      ...story.player_actions
        .filter((item) => item.session === session)
        .map((item) => ({
          key: `action:${item.id}`,
          name: `Party: ${item.description}`,
        })),
      ...entries
        .filter((item) => item.id !== entry.id)
        .map((item) => ({
          key: `entry:${item.id}`,
          name: `${journalKinds[item.kind].label}: ${item.description}`,
        })),
    ],
    [story.player_actions, entries, session, entry.id]
  );
  const visibleEntries = useMemo(
    () =>
      entries.filter((item) =>
        `${item.description} ${(item.npc_ids ?? [])
          .map((id) => npcs.find((npc) => npc.id === id)?.name ?? id)
          .join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [entries, npcs, search]
  );
  const sourceKey = entry.source_action_id
    ? `action:${entry.source_action_id}`
    : entry.source_entry_id
    ? `entry:${entry.source_entry_id}`
    : "";
  const change = (values: Partial<SessionEntry>) => {
    setEntry((current) => ({ ...current, ...values }));
    setMessage(null);
  };
  const save = async () => {
    if (disabled) return;
    setError(null);
    try {
      const next = saveJournalEntry(story, entry);
      if (!(await onSave(next)))
        throw new Error(
          "Entry was not saved. Your draft is still here; retry when ready."
        );
      removeEntityDraft(storageKey);
      setEntry(blank(entry.kind));
      setMessage(`Saved to Session ${session}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this entry."
      );
    }
  };
  const hasDraft = Boolean(entry.description);
  const edit = useCallback(
    (item: SessionEntry) => {
      if (
        hasDraft &&
        !window.confirm("Replace the unfinished journal draft with this entry?")
      )
        return;
      setEntry(structuredClone(item));
      setError(null);
      setMessage(null);
    },
    [hasDraft]
  );
  const resolve = useCallback(
    async (item: SessionEntry) => {
      setError(null);
      if (
        !(await onSave(
          saveJournalEntry(story, { ...item, resolved: !item.resolved })
        ))
      )
        setError("The follow-up change did not save. Try again.");
    },
    [story, onSave]
  );
  return (
    <Card variant="outlined" component="section" aria-label="Session journal">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h3">Session journal</Typography>
          <Typography variant="body2" color="text.secondary">
            Capture what the DM, NPCs, and world do. Party actions remain in
            their own log. These notes stay with this campaign and session.
          </Typography>
          <TextField
            select
            size="small"
            label="Journal entry type"
            value={entry.kind}
            disabled={disabled}
            onChange={(event) =>
              change({ kind: event.target.value as SessionEntry["kind"] })
            }
          >
            {Object.entries(journalKinds).map(([kind, info]) => (
              <MenuItem key={kind} value={kind}>
                {info.label}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            {journalKinds[entry.kind].prompt}
          </Typography>
          <TextField
            label="What happened / DM note"
            value={entry.description}
            onChange={(event) => change({ description: event.target.value })}
            disabled={disabled}
            multiline
            minRows={3}
          />
          <Button
            size="small"
            disabled={disabled}
            sx={{ alignSelf: "flex-start" }}
            onClick={() =>
              change({
                description: [
                  entry.description,
                  journalKinds[entry.kind].starter,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              })
            }
          >
            Add writing prompts
          </Button>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              fullWidth
              size="small"
              label="Journal plot point (optional)"
              value={entry.story_beat ?? ""}
              disabled={disabled}
              onChange={(event) =>
                change({ story_beat: event.target.value || undefined })
              }
            >
              <MenuItem value="">No plot point</MenuItem>
              {story.beats.map((beat) => (
                <MenuItem key={beat.id} value={beat.id}>
                  {beat.name}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              multiple
              fullWidth
              size="small"
              options={npcs}
              value={npcs.filter((npc) => entry.npc_ids?.includes(npc.id))}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(npc) => npc.name}
              onChange={(_, values) =>
                change({ npc_ids: values.map((npc) => npc.id) })
              }
              disabled={disabled}
              renderInput={(params) => (
                <TextField {...params} label="NPCs involved (optional)" />
              )}
            />
          </Stack>
          <Autocomplete
            size="small"
            options={causes}
            value={causes.find((cause) => cause.key === sourceKey) ?? null}
            getOptionLabel={(cause) => cause.name}
            isOptionEqualToValue={(a, b) => a.key === b.key}
            onChange={(_, cause) =>
              change({
                source_action_id: cause?.key.startsWith("action:")
                  ? cause.key.slice(7)
                  : undefined,
                source_entry_id: cause?.key.startsWith("entry:")
                  ? cause.key.slice(6)
                  : undefined,
              })
            }
            disabled={disabled}
            renderInput={(params) => (
              <TextField {...params} label="In response to (optional)" />
            )}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {entry.description && (
            <Typography
              variant="caption"
              color={
                draftStatus === "unavailable"
                  ? "warning.main"
                  : "text.secondary"
              }
            >
              {draftStatus === "unavailable"
                ? "Browser draft storage is unavailable. Save before leaving."
                : "Unfinished notes are recoverable in this browser after a refresh."}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            {entry.description && (
              <Button
                disabled={disabled}
                onClick={() => {
                  if (
                    window.confirm(
                      "Discard this unfinished journal draft? Saved entries stay unchanged."
                    )
                  ) {
                    removeEntityDraft(storageKey);
                    setEntry(blank(entry.kind));
                    setError(null);
                  }
                }}
              >
                Discard journal draft
              </Button>
            )}
            <Button
              variant="contained"
              disabled={disabled || !entry.description.trim()}
              onClick={() => void save()}
            >
              {disabled ? "Saving…" : "Save journal entry"}
            </Button>
          </Stack>
          <TextField
            size="small"
            label="Search this session’s journal"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Box
            sx={{
              maxHeight: 480,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <SessionEntryList
              story={story}
              entries={visibleEntries}
              npcs={npcs}
              onOpenEntity={onOpenEntity}
              onEdit={edit}
              onConsequence={onConsequence}
              onResolve={resolve}
              disabled={disabled}
            />
            {!entries.length && (
              <Typography color="text.secondary">
                No journal entries for this session yet.
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
