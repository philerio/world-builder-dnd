import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PersonIcon from "@mui/icons-material/Person";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import { useWorldData } from "../context/WorldDataContext";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import formatStatusLabel from "../utils/formatStatusLabel";
import type { Campaign, CampaignStory, EntityData, EntitySummary, WorldClock, WorldEvent, WorldStory, WorldStoryContribution, WorldStoryThread } from "../types";

const THREAD_STATUSES = ["active", "planned", "paused", "resolved", "changed"];
const EMPTY_EVENTS: WorldEvent[] = [];
const EMPTY_CAMPAIGNS: Campaign[] = [];
type ClockProgressFilter = "all" | "not_started" | "started" | "finished";
type WorldClockDraft = {
  name: string;
  description: string;
  current: string;
  maximum: string;
  stages: string;
  completion: string;
  status: WorldClock["status"];
};

function getClockProgress(clock: WorldClock): Exclude<ClockProgressFilter, "all"> {
  if (clock.status === "completed" || clock.current >= clock.maximum) return "finished";
  return clock.current === 0 ? "not_started" : "started";
}

function linesToList(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export default function WorldStoryDashboardPage() {
  const { storyId = "" } = useParams();
  const navigate = useNavigate();
  const { entities, updateEntity, createEntity, worldData } = useWorldData();
  const [story, setStory] = useState<WorldStory | null>(null);
  const events = worldData?.world_events ?? EMPTY_EVENTS;
  const campaigns = worldData?.campaigns ?? EMPTY_CAMPAIGNS;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [threadName, setThreadName] = useState("");
  const [threadDescription, setThreadDescription] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedEventThreadId, setSelectedEventThreadId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventThreadId, setEventThreadId] = useState("");
  const [contributionCampaign, setContributionCampaign] = useState<EntitySummary | null>(null);
  const [contributionSource, setContributionSource] = useState<WorldStoryContribution["source_type"]>("campaign_outcome");
  const [contributionSummary, setContributionSummary] = useState("");
  const [contributionThreadIds, setContributionThreadIds] = useState<string[]>([]);
  const [clockProgressFilter, setClockProgressFilter] = useState<ClockProgressFilter>("all");
  const [clockDialogOpen, setClockDialogOpen] = useState(false);
  const [clockDraft, setClockDraft] = useState<WorldClockDraft | null>(null);
  const [editingClockId, setEditingClockId] = useState<string | null>(null);
  const [deleteClockTarget, setDeleteClockTarget] = useState<WorldClock | null>(null);
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } = useEntityDrawer();

  useEffect(() => {
    let active = true;
    fetch(`http://localhost:8000/entities/${storyId}`)
      .then(async (entityResponse) => {
        if (!entityResponse.ok) throw new Error(`Could not load story (${entityResponse.status}).`);
        return await entityResponse.json() as EntityData;
      })
      .then((entityData) => {
        if (!active) return;
        setError(null);
        if (entityData.entity_type !== "world_story") throw new Error("The selected entity is not a World Story.");
        setStory(entityData.entity as unknown as WorldStory);
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storyId]);

  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const linkedEvents = useMemo(() => {
    if (!story) return [];
    const manuallyLinked = new Set([
      ...story.world_events,
      ...story.threads.flatMap((thread) => thread.world_events),
    ]);
    return events.filter((event) => manuallyLinked.has(event.id) || event.world_stories.includes(story.id));
  }, [events, story]);
  const taggedContributions = useMemo(() => {
    if (!story) return [];
    return campaigns.flatMap((campaign) => {
      if (!isCampaignStory(campaign.story)) return [];
      const plotPointContributions = campaign.story.beats
        .filter((beat) => beat.world_stories?.includes(story.id) || beat.world_story_threads?.some((link) => link.world_story_id === story.id))
        .map((beat) => {
          const reviewed = story.contributions.find((item) =>
            item.campaign_id === campaign.id && item.source_type === "plot_point" && item.source_id === beat.id,
          );
          return {
            campaign_id: campaign.id,
            source_type: "plot_point" as const,
            source_id: beat.id,
            summary: beat.description ? `${beat.name}\n${beat.description}` : beat.name,
            connection_status: reviewed?.connection_status ?? "proposed" as const,
            dm_notes: reviewed?.dm_notes ?? "Tagged from Plot Point",
            thread_ids: [...new Set((beat.world_story_threads ?? []).filter((link) => link.world_story_id === story.id).map((link) => link.thread_id))],
          };
        });
      const consequenceContributions = campaign.story.beats.flatMap((beat) =>
        (beat.consequences ?? [])
          .filter((consequence) => consequence.world_stories?.includes(story.id) || consequence.world_story_threads?.some((link) => link.world_story_id === story.id))
          .map((consequence) => {
            const reviewed = story.contributions.find((item) =>
              item.campaign_id === campaign.id && item.source_type === "consequence" && item.source_id === consequence.id,
            );
            return {
              campaign_id: campaign.id,
              source_type: "consequence" as const,
              source_id: consequence.id,
              summary: consequence.description,
              connection_status: reviewed?.connection_status ?? "proposed" as const,
              dm_notes: reviewed?.dm_notes ?? `Tagged from Plot Point: ${beat.name}`,
              thread_ids: [...new Set((consequence.world_story_threads ?? []).filter((link) => link.world_story_id === story.id).map((link) => link.thread_id))],
            };
          }),
      );
      const actionContributions = campaign.story.player_actions
        .filter((action) => action.world_stories?.includes(story.id) || action.world_story_threads?.some((link) => link.world_story_id === story.id))
        .map((action) => {
          const reviewed = story.contributions.find((item) =>
            item.campaign_id === campaign.id && item.source_type === "player_action" && item.source_id === action.id,
          );
          return {
            campaign_id: campaign.id,
            source_type: "player_action" as const,
            source_id: action.id,
            summary: action.description,
            connection_status: reviewed?.connection_status ?? "proposed" as const,
            dm_notes: reviewed?.dm_notes ?? "Tagged from Player Action",
            thread_ids: [...new Set((action.world_story_threads ?? []).filter((link) => link.world_story_id === story.id).map((link) => link.thread_id))],
          };
        });
      return [...plotPointContributions, ...consequenceContributions, ...actionContributions];
    });
  }, [campaigns, story]);
  const taggedContributionKeys = new Set(taggedContributions.map((item) => `${item.campaign_id}:${item.source_type}:${item.source_id}`));
  const displayContributions = story
    ? [
        ...story.contributions.filter((item) => !item.source_id || !taggedContributionKeys.has(`${item.campaign_id}:${item.source_type}:${item.source_id}`)),
        ...taggedContributions,
      ]
    : [];
  const linkedCampaignIds = story
    ? [...new Set([
        ...story.campaigns,
        ...story.threads.flatMap((thread) => thread.campaigns),
        ...displayContributions.map((item) => item.campaign_id),
        ...linkedEvents.flatMap((event) => event.campaigns),
      ])]
    : [];
  const proposedCount = displayContributions.filter((item) => item.connection_status === "proposed").length;
  const activeThreads = story?.threads.filter((thread) => thread.status === "active").length ?? 0;
  const filteredClocks = story
    ? story.world_clocks.filter((clock) => clockProgressFilter === "all" || getClockProgress(clock) === clockProgressFilter)
    : [];

  const persist = async (nextStory: WorldStory) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateEntity(storyId, nextStory as unknown as Record<string, unknown>);
      setStory(result.entity as unknown as WorldStory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the World Story.");
    } finally {
      setSaving(false);
    }
  };

  const updateContribution = (contribution: WorldStoryContribution, connectionStatus: WorldStoryContribution["connection_status"]) => {
    if (!story) return;
    const exists = story.contributions.some((item) => item.campaign_id === contribution.campaign_id && item.source_type === contribution.source_type && item.source_id === contribution.source_id);
    const contributions = exists
      ? story.contributions.map((item) => item.campaign_id === contribution.campaign_id && item.source_type === contribution.source_type && item.source_id === contribution.source_id
        ? { ...item, ...contribution, connection_status: connectionStatus }
        : item)
      : [...story.contributions, { ...contribution, connection_status: connectionStatus }];
    void persist({ ...story, contributions });
  };

  const updateThreadStatus = (threadId: string, status: string) => {
    if (!story) return;
    void persist({
      ...story,
      threads: story.threads.map((thread) => thread.id === threadId ? { ...thread, status } : thread),
    });
  };

  const addThread = () => {
    if (!story || !threadName.trim()) return;
    const thread: WorldStoryThread = {
      id: crypto.randomUUID(),
      name: threadName.trim(),
      description: threadDescription.trim() || undefined,
      status: "active",
      campaigns: [],
      world_events: [],
    };
    void persist({ ...story, threads: [...story.threads, thread] });
    setThreadDialogOpen(false);
    setThreadName("");
    setThreadDescription("");
  };

  const openClockDialog = (clock?: WorldClock) => {
    setEditingClockId(clock?.id ?? null);
    setClockDraft({
      name: clock?.name ?? "",
      description: clock?.description ?? "",
      current: String(clock?.current ?? 0),
      maximum: String(clock?.maximum ?? 3),
      stages: (clock?.stages ?? []).join("\n"),
      completion: clock?.completion ?? "",
      status: clock?.status ?? "active",
    });
    setClockDialogOpen(true);
  };

  const saveClock = () => {
    if (!story || !clockDraft?.name.trim()) return;
    const maximum = Math.max(1, Number.parseInt(clockDraft.maximum, 10) || 1);
    const current = Math.min(maximum, Math.max(0, Number.parseInt(clockDraft.current, 10) || 0));
    const clock: WorldClock = {
      id: editingClockId ?? crypto.randomUUID(),
      name: clockDraft.name.trim(),
      description: clockDraft.description.trim() || undefined,
      current,
      maximum,
      stages: linesToList(clockDraft.stages),
      completion: clockDraft.completion.trim() || undefined,
      status: clockDraft.status,
    };
    const world_clocks = editingClockId
      ? story.world_clocks.map((item) => item.id === editingClockId ? clock : item)
      : [...story.world_clocks, clock];
    void persist({ ...story, world_clocks });
    setClockDialogOpen(false);
    setClockDraft(null);
  };

  const updateClock = (clockId: string, updater: (clock: WorldClock) => WorldClock) => {
    if (!story) return;
    void persist({
      ...story,
      world_clocks: story.world_clocks.map((clock) => clock.id === clockId ? updater(clock) : clock),
    });
  };

  const deleteClock = () => {
    if (!story || !deleteClockTarget) return;
    void persist({
      ...story,
      world_clocks: story.world_clocks.filter((clock) => clock.id !== deleteClockTarget.id),
    });
    setDeleteClockTarget(null);
  };

  const recordClockMilestone = (clock: WorldClock) => {
    const complete = clock.status === "completed" || clock.current >= clock.maximum;
    const milestone = complete
      ? clock.completion
      : clock.stages?.[clock.current - 1];
    setEventName(`${clock.name}: ${complete ? "Completion" : `Step ${clock.current}`}`);
    setEventDescription(milestone ?? `Milestone reached on the ${clock.name} clock.`);
    setCreateEventOpen(true);
  };

  const saveLinkedEvents = async () => {
    if (!story) return;
    setSaving(true);
    setError(null);
    try {
      const selected = new Set(selectedEventIds);
      const updates = events.filter((event) => selected.has(event.id) || story.world_events.includes(event.id) || event.world_stories.includes(story.id));
      await Promise.all(updates.map(async (event) => {
        const world_stories = selected.has(event.id)
          ? [...new Set([...event.world_stories, story.id])]
          : event.world_stories.filter((id) => id !== story.id);
        const storyLinks = event.world_story_threads.filter((link) => link.world_story_id === story.id);
        let world_story_threads = event.world_story_threads.filter((link) => link.world_story_id !== story.id);
        if (selected.has(event.id)) {
          world_story_threads = [...world_story_threads, ...(selectedEventThreadId
            ? [{ world_story_id: story.id, thread_id: selectedEventThreadId }]
            : storyLinks)];
        }
        if (JSON.stringify(world_stories) === JSON.stringify(event.world_stories)
          && JSON.stringify(world_story_threads) === JSON.stringify(event.world_story_threads)) return;
        await updateEntity(event.id, { ...event, world_stories, world_story_threads });
      }));
      const saved = await updateEntity(storyId, { ...story, world_events: selectedEventIds });
      setStory(saved.entity as unknown as WorldStory);
      setEventDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update linked background events.");
    } finally {
      setSaving(false);
    }
  };

  const createAndLinkEvent = async () => {
    if (!story || !eventName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createEntity("world_event", {
        name: eventName.trim(),
        description: eventDescription.trim() || undefined,
        type: "background",
        status: "ongoing",
        campaigns: story.campaigns,
        world_stories: [storyId],
        world_story_threads: eventThreadId ? [{ world_story_id: storyId, thread_id: eventThreadId }] : [],
        locations: [],
        characters: [],
      });
      setCreateEventOpen(false);
      setEventName("");
      setEventDescription("");
      setEventThreadId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create and link the event.");
    } finally {
      setSaving(false);
    }
  };

  const addContribution = async () => {
    if (!story || !contributionCampaign || !contributionSummary.trim()) return;
    const contribution: WorldStoryContribution = {
      campaign_id: contributionCampaign.id,
      source_type: contributionSource,
      summary: contributionSummary.trim(),
      connection_status: "proposed",
      thread_ids: contributionThreadIds,
    };
    const nextStory = {
      ...story,
      campaigns: story.campaigns.includes(contributionCampaign.id)
        ? story.campaigns
        : [...story.campaigns, contributionCampaign.id],
      contributions: [...story.contributions, contribution],
    };
    setSaving(true);
    setError(null);
    try {
      const saved = await updateEntity(storyId, nextStory as unknown as Record<string, unknown>);
      setStory(saved.entity as unknown as WorldStory);
      setConnectionDialogOpen(false);
      setContributionCampaign(null);
      setContributionSummary("");
      setContributionThreadIds([]);
      setContributionSource("campaign_outcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add campaign connection.");
    } finally {
      setSaving(false);
    }
  };

  const openEventDialog = () => {
    setSelectedEventIds(events.filter((event) => story?.world_events.includes(event.id) || event.world_stories.includes(storyId)).map((event) => event.id));
    setSelectedEventThreadId("");
    setEventDialogOpen(true);
  };

  if (loading || (story !== null && story.id !== storyId)) return <Typography color="text.secondary">Loading World Story…</Typography>;
  if (error && !story) return <Alert severity="error">{error}</Alert>;
  if (!story) return <Alert severity="warning">World Story not found.</Alert>;

  const characters = story.characters.flatMap((id) => {
    const character = entityById.get(id);
    return character ? [character] : [{ id, entity_type: "unknown", name: id }];
  });

  return (
    <>
      <Stack spacing={2.5}>
        <Card>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2.5}>
              <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/world-stories")} sx={{ alignSelf: "flex-start", ml: -1 }}>
                All World Stories
              </Button>
              <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" }, gap: 2 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <AutoAwesomeMotionIcon color="primary" />
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>WORLD STORY</Typography>
                    <Chip size="small" label={formatStatusLabel(story.status)} />
                  </Stack>
                  <Typography variant="h1">{story.name}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 900, whiteSpace: "pre-wrap" }}>
                    {story.overview || story.description || "Add an overview to describe the larger story."}
                  </Typography>
                </Box>
                <Tooltip title="Edit World Story details">
                  <IconButton aria-label="Edit World Story details" onClick={() => openEntity(story.id)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Divider />
              <Grid container spacing={1.5}>
                <Metric label="Active threads" value={activeThreads} />
                <Metric label="Proposed connections" value={proposedCount} />
                <Metric label="Background clocks" value={story.world_clocks.length} />
                <Metric label="Background events" value={linkedEvents.length} />
                <Metric label="Linked campaigns" value={linkedCampaignIds.length} />
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2.5} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, xl: 7 }}>
            <Stack spacing={2.5}>
              <Card>
                <CardContent>
                  <SectionHeader title="Story Threads" subtitle="Independent strands can advance, pause, or change as campaigns unfold." action={<Button startIcon={<AddIcon />} onClick={() => setThreadDialogOpen(true)}>Add thread</Button>} />
                  {story.threads.length === 0 ? (
                    <Typography color="text.secondary">No threads yet. Add a thread for a major part of this story.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {story.threads.map((thread) => (
                        <Box key={thread.id} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="h3" sx={{ fontSize: "1.05rem" }}>{thread.name}</Typography>
                              {thread.description && <Typography color="text.secondary" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>{thread.description}</Typography>}
                              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                                {thread.campaigns.map((id) => <EntityChip key={id} id={id} entities={entityById} onOpen={openEntity} />)}
                                {thread.world_events.map((id) => <EntityChip key={id} id={id} entities={entityById} onOpen={openEntity} />)}
                                {linkedEvents.filter((event) => event.world_story_threads?.some((link) => link.world_story_id === story.id && link.thread_id === thread.id)).map((event) => <EntityChip key={`event-${event.id}`} id={event.id} entities={entityById} onOpen={openEntity} />)}
                                {displayContributions.filter((item) => item.thread_ids?.includes(thread.id)).map((item) => (
                                  <Chip key={`${item.campaign_id}-${item.source_type}-${item.source_id ?? item.summary}`} size="small" clickable onClick={() => openEntity(item.campaign_id)} label={`${entityById.get(item.campaign_id)?.name ?? item.campaign_id} · ${formatStatusLabel(item.source_type.replaceAll("_", " "))}`} />
                                ))}
                              </Stack>
                            </Box>
                            <FormControl size="small" sx={{ minWidth: 138 }}>
                              <Select value={thread.status} aria-label={`Status for ${thread.name}`} onChange={(event) => updateThreadStatus(thread.id, event.target.value)} disabled={saving}>
                                {THREAD_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <SectionHeader
                    title="World Clocks"
                    subtitle="Track background activity across sessions and campaigns. Advance clocks when the world moves; record milestone events when useful."
                    action={(
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <FormControl size="small" sx={{ minWidth: 135 }}>
                          <Select aria-label="Filter world clocks by progress" value={clockProgressFilter} onChange={(event) => setClockProgressFilter(event.target.value as ClockProgressFilter)}>
                            <MenuItem value="all">All clocks</MenuItem>
                            <MenuItem value="not_started">Not started</MenuItem>
                            <MenuItem value="started">Started</MenuItem>
                            <MenuItem value="finished">Finished</MenuItem>
                          </Select>
                        </FormControl>
                        <Button startIcon={<AddIcon />} onClick={() => openClockDialog()}>Add clock</Button>
                      </Stack>
                    )}
                  />
                  {filteredClocks.length === 0 ? (
                    <Typography color="text.secondary">
                      {story.world_clocks.length ? "No clocks match this progress filter." : "No background clocks yet. Add one when you have a threat or plan that advances over time."}
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {filteredClocks.map((clock) => (
                        <Box key={clock.id} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="h3" sx={{ fontSize: "1.05rem" }}>{clock.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{clock.current} of {clock.maximum} · {formatStatusLabel(clock.status)}</Typography>
                              {clock.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{clock.description}</Typography>}
                            </Box>
                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title="Edit clock"><IconButton size="small" aria-label={`Edit ${clock.name}`} onClick={() => openClockDialog(clock)} disabled={saving}><EditIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete clock"><IconButton size="small" aria-label={`Delete ${clock.name}`} onClick={() => setDeleteClockTarget(clock)} disabled={saving}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center", mt: 0.5 }}>
                            {clock.status === "completed" && <Chip size="small" color="success" label="Complete" />}
                            <Tooltip title="Undo one step"><span><IconButton size="small" aria-label={`Undo one step on ${clock.name}`} onClick={() => updateClock(clock.id, (item) => ({ ...item, current: Math.max(0, item.current - 1), status: item.status === "completed" ? "active" : item.status }))} disabled={saving || clock.current <= 0}><UndoIcon /></IconButton></span></Tooltip>
                            <Tooltip title={clock.status === "paused" ? "Resume" : "Pause"}><span><IconButton size="small" aria-label={clock.status === "paused" ? `Resume ${clock.name}` : `Pause ${clock.name}`} onClick={() => updateClock(clock.id, (item) => ({ ...item, status: item.status === "paused" ? "active" : "paused" }))} disabled={saving || clock.status === "completed"}>{clock.status === "paused" ? <PlayArrowIcon /> : <PauseIcon />}</IconButton></span></Tooltip>
                            <Tooltip title="Advance one step"><span><IconButton size="small" aria-label={`Advance ${clock.name}`} onClick={() => updateClock(clock.id, (item) => ({ ...item, current: Math.min(item.maximum, item.current + 1) }))} disabled={saving || clock.status !== "active" || clock.current >= clock.maximum}><PlayArrowIcon /></IconButton></span></Tooltip>
                            <Tooltip title="Reset clock"><span><IconButton size="small" aria-label={`Reset ${clock.name}`} onClick={() => updateClock(clock.id, (item) => ({ ...item, current: 0, status: "active" }))} disabled={saving || (clock.current === 0 && clock.status === "active")}><RestartAltIcon /></IconButton></span></Tooltip>
                            <Tooltip title="Mark complete"><span><IconButton size="small" aria-label={`Complete ${clock.name}`} onClick={() => updateClock(clock.id, (item) => ({ ...item, status: "completed" }))} disabled={saving || clock.status === "completed"}><CheckIcon /></IconButton></span></Tooltip>
                          </Stack>
                          <LinearProgress variant="determinate" value={Math.min(100, (clock.current / Math.max(1, clock.maximum)) * 100)} sx={{ mt: 0.75 }} />
                          {clock.current > 0 && clock.stages?.[clock.current - 1] && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>{clock.stages[clock.current - 1]}</Typography>}
                          {clock.current >= clock.maximum && clock.completion && <Typography variant="body2" sx={{ mt: 0.75 }}>At completion: {clock.completion}</Typography>}
                          {(clock.current > 0 || clock.status === "completed") && <Button size="small" startIcon={<EventIcon />} onClick={() => recordClockMilestone(clock)} disabled={saving} sx={{ mt: 0.75 }}>Record milestone as event</Button>}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <SectionHeader title="Background Events" subtitle="Developments that continue outside a specific party's immediate view." action={<Stack direction="row" spacing={0.5}><Button startIcon={<AddIcon />} onClick={() => setCreateEventOpen(true)}>Create event</Button><Button onClick={openEventDialog}>Link existing</Button></Stack>} />
                  {linkedEvents.length === 0 ? (
                    <Typography color="text.secondary">No World Events are linked to this story yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {linkedEvents.map((event) => (
                        <Button key={event.id} onClick={() => openEntity(event.id)} sx={{ p: 1.5, justifyContent: "flex-start", textAlign: "left", border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", width: "100%" }}>
                            <EventIcon color="primary" sx={{ mt: 0.25 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1">{event.name}</Typography>
                              {event.description && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "normal" }}>{event.description}</Typography>}
                              {event.world_story_threads?.filter((link) => link.world_story_id === story.id).map((link) => {
                                const thread = story.threads.find((item) => item.id === link.thread_id);
                                return <Chip key={link.thread_id} size="small" label={thread?.name ?? link.thread_id} sx={{ mt: 0.75, mr: 0.5 }} />;
                              })}
                            </Box>
                            {event.status && <Chip size="small" label={formatStatusLabel(event.status)} sx={{ ml: "auto" }} />}
                          </Stack>
                        </Button>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, xl: 5 }}>
            <Stack spacing={2.5}>
              <Card>
                <CardContent>
                  <SectionHeader title="Campaign Connections" subtitle="Review what a campaign may have changed in the wider story." action={<Button size="small" startIcon={<AddIcon />} onClick={() => setConnectionDialogOpen(true)}>Add</Button>} />
                  {displayContributions.length === 0 ? (
                    <Typography color="text.secondary">No campaign outcomes or consequences are connected yet.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {displayContributions.map((contribution, index) => (
                        <ContributionCard key={`${contribution.campaign_id}-${contribution.source_type}-${contribution.source_id ?? index}`} contribution={contribution} entities={entityById} threads={story.threads} onOpen={openEntity} onSetStatus={updateContribution} saving={saving} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <SectionHeader title="Key Characters" subtitle="People and powers tied to this story." action={<Tooltip title="Edit linked characters"><IconButton aria-label="Edit linked characters" onClick={() => openEntity(story.id)}><EditIcon /></IconButton></Tooltip>} />
                  {characters.length === 0 ? <Typography color="text.secondary">No characters linked.</Typography> : (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                      {characters.map((character) => <Chip key={character.id} icon={<PersonIcon />} label={character.name} onClick={() => openEntity(character.id)} clickable />)}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <SectionHeader title="Campaigns" subtitle="Campaigns contributing to or encountering this story." />
                  {linkedCampaignIds.length === 0 ? <Typography color="text.secondary">No campaigns linked.</Typography> : (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                      {linkedCampaignIds.map((id) => <EntityChip key={id} id={id} entities={entityById} onOpen={openEntity} />)}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <Dialog open={threadDialogOpen} onClose={() => setThreadDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add story thread</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Thread name" value={threadName} onChange={(event) => setThreadName(event.target.value)} required />
            <TextField label="What is unfolding?" value={threadDescription} onChange={(event) => setThreadDescription(event.target.value)} multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThreadDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addThread} disabled={!threadName.trim() || saving}>Add thread</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={clockDialogOpen} onClose={() => !saving && setClockDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingClockId ? "Edit world clock" : "Add world clock"}</DialogTitle>
        <DialogContent>
          {clockDraft && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus label="Clock name" value={clockDraft.name} onChange={(event) => setClockDraft({ ...clockDraft, name: event.target.value })} required disabled={saving} />
              <TextField label="Description" value={clockDraft.description} onChange={(event) => setClockDraft({ ...clockDraft, description: event.target.value })} multiline minRows={2} disabled={saving} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField label="Current step" type="number" slotProps={{ htmlInput: { min: 0 } }} value={clockDraft.current} onChange={(event) => setClockDraft({ ...clockDraft, current: event.target.value })} disabled={saving} />
                <TextField label="Steps to completion" type="number" slotProps={{ htmlInput: { min: 1 } }} value={clockDraft.maximum} onChange={(event) => setClockDraft({ ...clockDraft, maximum: event.target.value })} disabled={saving} />
                <FormControl size="small" fullWidth>
                  <Select aria-label="Clock status" value={clockDraft.status} onChange={(event) => setClockDraft({ ...clockDraft, status: event.target.value as WorldClock["status"] })} disabled={saving}>
                    {(["active", "paused", "completed"] as const).map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField label="Milestones (one per step, one per line)" value={clockDraft.stages} onChange={(event) => setClockDraft({ ...clockDraft, stages: event.target.value })} multiline minRows={3} disabled={saving} />
              <TextField label="What happens at completion?" value={clockDraft.completion} onChange={(event) => setClockDraft({ ...clockDraft, completion: event.target.value })} multiline minRows={2} disabled={saving} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClockDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveClock} disabled={saving || !clockDraft?.name.trim()}>{saving ? "Saving…" : editingClockId ? "Save changes" : "Add clock"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteClockTarget)} onClose={() => !saving && setDeleteClockTarget(null)}>
        <DialogTitle>Delete world clock?</DialogTitle>
        <DialogContent>
          <Typography>Delete “{deleteClockTarget?.name}”? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteClockTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={deleteClock} disabled={saving}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Link background events</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={events}
            value={events.filter((event) => selectedEventIds.includes(event.id))}
            onChange={(_, selected) => setSelectedEventIds(selected.map((event) => event.id))}
            getOptionLabel={(event) => event.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ mt: 1 }}
            renderInput={(params) => <TextField {...params} label="World Events" placeholder="Select events" />}
          />
          <TextField select fullWidth label="Assign selected events to thread (optional)" value={selectedEventThreadId} onChange={(event) => setSelectedEventThreadId(event.target.value)} sx={{ mt: 2 }}>
            <MenuItem value="">Keep current thread links</MenuItem>
            {story.threads.map((thread) => <MenuItem key={thread.id} value={thread.id}>{thread.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveLinkedEvents} disabled={saving}>Save links</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createEventOpen} onClose={() => !saving && setCreateEventOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create background event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Event name" value={eventName} onChange={(event) => setEventName(event.target.value)} required />
            <TextField label="What is happening?" value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} multiline minRows={3} />
            <TextField select label="Story Thread (optional)" value={eventThreadId} onChange={(event) => setEventThreadId(event.target.value)}>
              <MenuItem value="">No specific thread</MenuItem>
              {story.threads.map((thread) => <MenuItem key={thread.id} value={thread.id}>{thread.name}</MenuItem>)}
            </TextField>
            <Typography variant="caption" color="text.secondary">This event will be linked to {story.name} and its currently linked campaigns.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEventOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void createAndLinkEvent()} disabled={saving || !eventName.trim()}>{saving ? "Creating…" : "Create event"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={connectionDialogOpen} onClose={() => !saving && setConnectionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add campaign connection</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              options={entities.filter((entity) => entity.entity_type === "campaign")}
              value={contributionCampaign}
              onChange={(_, selected) => setContributionCampaign(selected)}
              getOptionLabel={(entity) => entity.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Campaign" required />}
            />
            <TextField select label="Source" value={contributionSource} onChange={(event) => setContributionSource(event.target.value as WorldStoryContribution["source_type"])}>
              <MenuItem value="campaign_outcome">Campaign outcome</MenuItem>
              <MenuItem value="plot_point">Plot Point</MenuItem>
              <MenuItem value="consequence">Consequence</MenuItem>
              <MenuItem value="player_action">Player action</MenuItem>
            </TextField>
            <Autocomplete
              multiple
              options={story.threads}
              value={story.threads.filter((thread) => contributionThreadIds.includes(thread.id))}
              onChange={(_, selected) => setContributionThreadIds(selected.map((thread) => thread.id))}
              getOptionLabel={(thread) => thread.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Story threads (optional)" />}
            />
            <TextField label="What might this change in the larger story?" value={contributionSummary} onChange={(event) => setContributionSummary(event.target.value)} multiline minRows={3} required />
            <Alert severity="info">This starts as a proposed connection. You can confirm or dismiss it after reviewing the campaign context.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void addContribution()} disabled={saving || !contributionCampaign || !contributionSummary.trim()}>{saving ? "Saving…" : "Add proposed connection"}</Button>
        </DialogActions>
      </Dialog>

      <EntityDetailDrawer entityId={entityId} open={isOpen} onClose={closeEntity} onOpenEntity={openEntity} onBack={goBack} canGoBack={canGoBack} />
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}><Typography variant="h3">{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box></Grid>;
}

function isCampaignStory(value: Campaign["story"]): value is CampaignStory {
  return typeof value === "object" && value !== null && "beats" in value;
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2.25 }}><Box><Typography variant="h2" sx={{ fontSize: "1.2rem" }}>{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>{subtitle}</Typography></Box>{action}</Stack>;
}

function EntityChip({ id, entities, onOpen }: { id: string; entities: Map<string, EntitySummary>; onOpen: (id: string) => void }) {
  const entity = entities.get(id);
  return <Chip size="small" variant="outlined" label={entity?.name ?? id} onClick={() => onOpen(id)} clickable />;
}

function ContributionCard({
  contribution,
  entities,
  threads,
  onOpen,
  onSetStatus,
  saving,
}: {
  contribution: WorldStoryContribution;
  entities: Map<string, EntitySummary>;
  threads: WorldStoryThread[];
  onOpen: (id: string) => void;
  onSetStatus: (contribution: WorldStoryContribution, status: WorldStoryContribution["connection_status"]) => void;
  saving: boolean;
}) {
  const campaignName = entities.get(contribution.campaign_id)?.name ?? contribution.campaign_id;
  return (
    <Box sx={{ p: 1.75, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Button size="small" onClick={() => onOpen(contribution.campaign_id)} sx={{ px: 0, minWidth: 0 }}>{campaignName}</Button>
          <Chip size="small" color={contribution.connection_status === "confirmed" ? "success" : contribution.connection_status === "proposed" ? "warning" : "default"} label={formatStatusLabel(contribution.connection_status)} />
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{contribution.summary}</Typography>
        <Typography variant="caption" color="text.secondary">Source: {formatStatusLabel(contribution.source_type.replaceAll("_", " "))}</Typography>
        {!!contribution.thread_ids?.length && <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>{contribution.thread_ids.map((threadId) => <Chip key={threadId} size="small" label={threads.find((thread) => thread.id === threadId)?.name ?? threadId} />)}</Stack>}
        {contribution.dm_notes && <Typography variant="caption" color="text.secondary">{contribution.dm_notes}</Typography>}
        {contribution.connection_status === "proposed" && (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" color="success" startIcon={<CheckIcon />} onClick={() => onSetStatus(contribution, "confirmed")} disabled={saving}>Confirm connection</Button>
            <Button size="small" color="inherit" startIcon={<ThumbDownAltOutlinedIcon />} onClick={() => onSetStatus(contribution, "rejected")} disabled={saving}>Dismiss</Button>
          </Stack>
        )}
        {contribution.connection_status !== "proposed" && (
          <Button size="small" onClick={() => onSetStatus(contribution, "proposed")} disabled={saving} sx={{ alignSelf: "flex-start" }}>Reopen review</Button>
        )}
      </Stack>
    </Box>
  );
}
