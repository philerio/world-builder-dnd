import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import { useWorldData } from "../context/WorldDataContext";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import type { CampaignStory, DMScratchpadEntry, StoryBeat, WorldStory } from "../types";
import formatStatusLabel from "../utils/formatStatusLabel";

type NoteDraft = { name: string; content: string; tags: string };
type PromotionTarget = "plot_point" | "world_story_thread" | "npc" | "player_character" | "location" | "city" | "region" | "kingdom" | "continent" | "map" | "world_event" | "timeline_event" | "lore" | "artifact" | "world_story";

const PROMOTION_TARGETS: { value: PromotionTarget; label: string }[] = [
  { value: "plot_point", label: "Plot Point in a Campaign" },
  { value: "world_story_thread", label: "Thread in a World Story" },
  { value: "npc", label: "NPC" },
  { value: "player_character", label: "Player Character" },
  { value: "location", label: "Location" },
  { value: "city", label: "City" },
  { value: "region", label: "Region" },
  { value: "kingdom", label: "Kingdom" },
  { value: "continent", label: "Continent" },
  { value: "map", label: "Map" },
  { value: "world_event", label: "World Event" },
  { value: "timeline_event", label: "Timeline Event" },
  { value: "lore", label: "Lore" },
  { value: "artifact", label: "Artifact" },
  { value: "world_story", label: "World Story" },
];

const blankDraft = (): NoteDraft => ({ name: "", content: "", tags: "" });
const slugPart = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 44) || "plot-point";

function tagsFromDraft(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export default function DMScratchpadPage() {
  const navigate = useNavigate();
  const entityDrawer = useEntityDrawer();
  const {
    worldData,
    worldDataLoading,
    worldDataError,
    createEntity,
    updateEntity,
    deleteEntity,
    loadEntity,
  } = useWorldData();
  const entries = worldData?.dm_scratchpad_entries ?? [];
  const [newDraft, setNewDraft] = useState<NoteDraft>(blankDraft);
  const [editingEntry, setEditingEntry] = useState<DMScratchpadEntry | null>(null);
  const [editingDraft, setEditingDraft] = useState<NoteDraft>(blankDraft());
  const [promotingEntry, setPromotingEntry] = useState<DMScratchpadEntry | null>(null);
  const [promotionTarget, setPromotionTarget] = useState<PromotionTarget>("plot_point");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DMScratchpadEntry | null>(null);

  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const filteredEntries = sortedEntries.filter((entry) => {
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    return !query || [entry.name, entry.content, ...(entry.tags ?? [])].some((value) => value.toLocaleLowerCase().includes(query));
  });
  const campaigns = worldData?.campaigns ?? [];
  const worldStories = worldData?.world_stories ?? [];
  const needsParent = promotionTarget === "plot_point" || promotionTarget === "world_story_thread";

  const createNote = async () => {
    if (!newDraft.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createEntity("dm_scratchpad_entry", {
        name: newDraft.name.trim(),
        content: newDraft.content,
        tags: tagsFromDraft(newDraft.tags),
      });
      setNewDraft(blankDraft());
      setSuccess("Idea added to the scratchpad.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this idea.");
    } finally {
      setSaving(false);
    }
  };

  const saveNoteEdit = async () => {
    if (!editingEntry || !editingDraft.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateEntity(editingEntry.id, {
        ...editingEntry,
        name: editingDraft.name.trim(),
        content: editingDraft.content,
        tags: tagsFromDraft(editingDraft.tags),
      });
      setEditingEntry(null);
      setSuccess("Scratchpad entry updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this idea.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (entry: DMScratchpadEntry, status: DMScratchpadEntry["status"]) => {
    setError(null);
    try {
      await updateEntity(entry.id, { ...entry, status });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this idea's status.");
    }
  };

  const beginPromotion = (entry: DMScratchpadEntry) => {
    setPromotingEntry(entry);
    setPromotionTarget("plot_point");
    setParentId(campaigns[0]?.id ?? "");
    setError(null);
  };

  const finishPromotion = async (entry: DMScratchpadEntry, promotedEntityId: string, promotedAs: string, promotedSubentityId?: string) => {
    await updateEntity(entry.id, {
      ...entry,
      status: "promoted",
      promoted_entity_id: promotedEntityId,
      promoted_as: promotedAs,
      promoted_subentity_id: promotedSubentityId,
    });
    setPromotingEntry(null);
    setSuccess(`“${entry.name}” was promoted to ${promotedAs.replaceAll("_", " ")}. The original note remains here.`);
  };

  const promote = async () => {
    if (!promotingEntry || saving) return;
    if (needsParent && !parentId) {
      setError(promotionTarget === "plot_point" ? "Choose a campaign first." : "Choose a World Story first.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const entry = promotingEntry;
    const body = entry.content.trim() || undefined;
    const tags = entry.tags ?? [];
    try {
      if (promotionTarget === "plot_point") {
        const campaignData = await loadEntity(parentId);
        const campaign = campaignData.entity;
        const existingStory = campaign.story as Record<string, unknown> | undefined;
        if (existingStory && !Array.isArray(existingStory.beats)) {
          throw new Error("This campaign uses the older story format. Open its dashboard and migrate the story planner before adding a Plot Point.");
        }
        const beats = (existingStory?.beats as StoryBeat[] | undefined) ?? [];
        const baseId = slugPart(entry.name);
        const ids = new Set(beats.map((beat) => String(beat.id)));
        let id = baseId;
        let suffix = 2;
        while (ids.has(id)) id = `${baseId}-${suffix++}`;
        const nextStory: CampaignStory = {
          ...(existingStory as unknown as CampaignStory | undefined),
          beats: [...beats, { id, name: entry.name, description: body, status: "planned" }],
          player_actions: (existingStory?.player_actions as CampaignStory["player_actions"] | undefined) ?? [],
          world_clocks: (existingStory?.world_clocks as CampaignStory["world_clocks"] | undefined) ?? [],
        };
        await updateEntity(parentId, { ...campaign, story: nextStory });
        await finishPromotion(entry, parentId, "plot_point", id);
        return;
      }

      if (promotionTarget === "world_story_thread") {
        const storyData = await loadEntity(parentId);
        const story = storyData.entity as unknown as WorldStory;
        const existingThreads = story.threads ?? [];
        const baseId = slugPart(entry.name);
        const ids = new Set(existingThreads.map((thread) => thread.id));
        let threadId = baseId;
        let suffix = 2;
        while (ids.has(threadId)) threadId = `${baseId}-${suffix++}`;
        await updateEntity(parentId, {
          ...story,
          threads: [...existingThreads, { id: threadId, name: entry.name, description: body, status: "active", campaigns: [], world_events: [] }],
        });
        await finishPromotion(entry, parentId, "world_story_thread", threadId);
        return;
      }

      const entityPayload: Record<string, unknown> = {
        name: entry.name,
        description: body,
        tags,
      };
      if (promotionTarget === "world_story") entityPayload.overview = body;
      if (promotionTarget === "lore") entityPayload.details = body;
      if (promotionTarget === "artifact") entityPayload.details = body;
      if (promotionTarget === "timeline_event") entityPayload.date_precision = "unknown";
      const created = await createEntity(promotionTarget, entityPayload);
      await finishPromotion(entry, created.id, promotionTarget);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not promote this idea.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteEntry || saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteEntity(deleteEntry.id);
      setDeleteEntry(null);
      setSuccess("Scratchpad entry deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this idea.");
    } finally {
      setSaving(false);
    }
  };

  const openPromotedItem = (entry: DMScratchpadEntry) => {
    if (!entry.promoted_entity_id) return;
    if (entry.promoted_as === "plot_point") navigate(`/campaigns/${entry.promoted_entity_id}`);
    else if (entry.promoted_as === "world_story_thread") navigate(`/world-stories/${entry.promoted_entity_id}`);
    else entityDrawer.openEntity(entry.promoted_entity_id);
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" color="text.secondary">DM TOOLS</Typography>
        <Typography variant="h2">DM Scratchpad</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Capture loose ideas now. Turn them into campaign and world material when they are ready.</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      {worldDataError && <Alert severity="error">{worldDataError}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 0.8fr) minmax(0, 1.6fr)" }, gap: 2, alignItems: "start" }}>
        <Card variant="outlined"><CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h3">Capture an idea</Typography>
            <TextField label="Working title" value={newDraft.name} onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })} disabled={saving} />
            <TextField
              label="Notes"
              placeholder={"Write freely. Paragraph breaks are preserved.\n\nFor example, add the idea, what it connects to, and questions to resolve later."}
              value={newDraft.content}
              onChange={(event) => setNewDraft({ ...newDraft, content: event.target.value })}
              disabled={saving}
              multiline
              minRows={7}
              maxRows={20}
            />
            <TextField label="Tags (comma separated)" value={newDraft.tags} onChange={(event) => setNewDraft({ ...newDraft, tags: event.target.value })} disabled={saving} />
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />} onClick={() => void createNote()} disabled={!newDraft.name.trim() || saving}>
              {saving ? "Saving…" : "Save idea"}
            </Button>
          </Stack>
        </CardContent></Card>

        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Box><Typography variant="h3">Ideas</Typography><Typography variant="body2" color="text.secondary">{filteredEntries.length} of {entries.length}</Typography></Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" label="Search ideas" value={search} onChange={(event) => setSearch(event.target.value)} />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select value={statusFilter} aria-label="Filter scratchpad by status" onChange={(event) => setStatusFilter(event.target.value)}>
                  <MenuItem value="all">All statuses</MenuItem>
                  {(["inbox", "developing", "promoted", "archived"] as const).map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {worldDataLoading ? <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box> : filteredEntries.length ? filteredEntries.map((entry) => (
            <Card key={entry.id} variant="outlined"><CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" sx={{ overflowWrap: "anywhere" }}>{entry.name}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                    {(entry.tags ?? []).map((tag) => <Chip size="small" variant="outlined" label={tag} key={tag} />)}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.25}>
                  <FormControl size="small" sx={{ minWidth: 125 }}>
                    <Select value={entry.status} aria-label={`Status for ${entry.name}`} onChange={(event) => void updateStatus(entry, event.target.value as DMScratchpadEntry["status"])} disabled={saving}>
                      {(["inbox", "developing", "promoted", "archived"] as const).map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {!entry.promoted_entity_id && <Button size="small" startIcon={<AutoAwesomeMotionIcon />} onClick={() => beginPromotion(entry)}>Promote</Button>}
                  <IconButton aria-label={`Edit ${entry.name}`} title="Edit idea" size="small" onClick={() => { setEditingEntry(entry); setEditingDraft({ name: entry.name, content: entry.content, tags: (entry.tags ?? []).join(", ") }); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton aria-label={`Delete ${entry.name}`} title="Delete idea" size="small" onClick={() => setDeleteEntry(entry)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
              </Stack>
              <Accordion disableGutters elevation={0} sx={{ mt: 1, "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 36, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
                  <Typography variant="body2" color="text.secondary">{entry.content ? "Read notes" : "No notes yet"}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.content || "This entry has no notes yet."}</Typography>
                </AccordionDetails>
              </Accordion>
              {entry.promoted_entity_id && <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Promoted as {entry.promoted_as?.replaceAll("_", " ")}{entry.promoted_subentity_id ? ` · ${entry.promoted_subentity_id}` : ""}</Typography>
                <Button size="small" onClick={() => openPromotedItem(entry)}>Open linked item</Button>
              </Stack>}
            </CardContent></Card>
          )) : <Card variant="outlined"><CardContent><Typography color="text.secondary">{entries.length ? "No ideas match these filters." : "Your scratchpad is empty. Add an idea here and develop it whenever you have time."}</Typography></CardContent></Card>}
        </Stack>
      </Box>

      <Dialog open={Boolean(editingEntry)} onClose={() => !saving && setEditingEntry(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit scratchpad entry</DialogTitle>
        <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField label="Working title" value={editingDraft.name} onChange={(event) => setEditingDraft({ ...editingDraft, name: event.target.value })} disabled={saving} />
          <TextField label="Notes" value={editingDraft.content} onChange={(event) => setEditingDraft({ ...editingDraft, content: event.target.value })} disabled={saving} multiline minRows={10} maxRows={24} helperText="Paragraphs and line breaks are kept as written." />
          <TextField label="Tags (comma separated)" value={editingDraft.tags} onChange={(event) => setEditingDraft({ ...editingDraft, tags: event.target.value })} disabled={saving} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setEditingEntry(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void saveNoteEdit()} disabled={!editingDraft.name.trim() || saving}>Save changes</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(promotingEntry)} onClose={() => !saving && setPromotingEntry(null)} fullWidth maxWidth="sm">
        <DialogTitle>Promote idea</DialogTitle>
        <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
          {promotingEntry && <Alert severity="info">The full multiline note will be copied into the new item. This scratchpad entry will remain unchanged and link to the result.</Alert>}
          <TextField select label="Create as" value={promotionTarget} onChange={(event) => { const target = event.target.value as PromotionTarget; setPromotionTarget(target); setParentId(target === "plot_point" ? campaigns[0]?.id ?? "" : target === "world_story_thread" ? worldStories[0]?.id ?? "" : ""); }} disabled={saving}>
            {PROMOTION_TARGETS.map((target) => <MenuItem key={target.value} value={target.value}>{target.label}</MenuItem>)}
          </TextField>
          {promotionTarget === "plot_point" && <TextField select label="Campaign" value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={saving}>
            {campaigns.map((campaign) => <MenuItem key={campaign.id} value={campaign.id}>{campaign.name}</MenuItem>)}
          </TextField>}
          {promotionTarget === "world_story_thread" && <TextField select label="World Story" value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={saving}>
            {worldStories.map((story) => <MenuItem key={story.id} value={story.id}>{story.name}</MenuItem>)}
          </TextField>}
          {promotingEntry && <Box sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="subtitle2">{promotingEntry.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{promotingEntry.content}</Typography>
          </Box>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setPromotingEntry(null)} disabled={saving}>Cancel</Button><Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeMotionIcon />} onClick={() => void promote()} disabled={saving || (needsParent && !parentId)}>{saving ? "Promoting…" : "Create from idea"}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteEntry)} onClose={() => !saving && setDeleteEntry(null)}>
        <DialogTitle>Delete scratchpad entry?</DialogTitle>
        <DialogContent><Typography>Delete “{deleteEntry?.name}” from the DM Scratchpad? This does not delete anything it was promoted into.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteEntry(null)} disabled={saving}>Cancel</Button><Button color="error" onClick={() => void confirmDelete()} disabled={saving}>Delete</Button></DialogActions>
      </Dialog>

      <EntityDetailDrawer
        entityId={entityDrawer.entityId}
        open={entityDrawer.isOpen}
        onClose={entityDrawer.closeEntity}
        onOpenEntity={entityDrawer.openEntity}
        onBack={entityDrawer.goBack}
        canGoBack={entityDrawer.canGoBack}
      />
    </Stack>
  );
}
