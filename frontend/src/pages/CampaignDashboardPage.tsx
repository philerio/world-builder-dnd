import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Autocomplete,
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
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UndoIcon from "@mui/icons-material/Undo";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import LinkIcon from "@mui/icons-material/Link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EventIcon from "@mui/icons-material/Event";
import type {
  Campaign,
  CampaignStory,
  EntityResponse,
  StoryBeat,
  StoryBeatStatus,
  StoryConsequence,
  StoryContent,
  StoryContentNode,
  EntitySummary,
  WorldClock,
  WorldStory,
  WorldStoryThreadLink,
} from "../types";
import { useWorldData } from "../context/WorldDataContext";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import formatStatusLabel from "../utils/formatStatusLabel";

const EMPTY_STORY: CampaignStory = {
  beats: [],
  player_actions: [],
  world_clocks: [],
};

const BEAT_STATUSES: StoryBeatStatus[] = [
  "planned",
  "available",
  "in_progress",
  "completed",
  "failed",
  "skipped",
  "changed",
];

const CONSEQUENCE_STATUSES: StoryConsequence["status"][] = [
  "pending",
  "active",
  "resolved",
  "prevented",
];

type ClockProgressFilter = "all" | "not_started" | "started" | "finished";
type DeleteTarget = {
  kind: "plot point" | "consequence" | "clock" | "player action";
  id: string;
  label: string;
  parentBeatId?: string;
};

function getClockProgress(clock: WorldClock): Exclude<ClockProgressFilter, "all"> {
  if (clock.status === "completed" || clock.current >= clock.maximum) return "finished";
  return clock.current === 0 ? "not_started" : "started";
}

type BeatDraft = {
  name: string;
  description: string;
  description_content: StoryContent;
  events_content: StoryContent;
  triggers_content: StoryContent;
  possible_approaches_content: StoryContent;
  status: StoryBeatStatus;
  act: string;
  order: string;
  secrets: string;
  leads_to: string;
  locations: string;
  npcs: string;
  player_characters: string;
  world_events: string;
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
};

type ConsequenceDraft = {
  description: string;
  trigger: string;
  player_action: string;
  timing: string;
  status: StoryConsequence["status"];
  leads_to: string;
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
};

type ClockDraft = {
  name: string;
  description: string;
  current: string;
  maximum: string;
  stages: string;
  completion: string;
  status: WorldClock["status"];
};

type ActionDraft = {
  description: string;
  notes: string;
  session: string;
  story_beat: string;
  consequence_ids: string;
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
};

type CloseoutActionDraft = {
  session: string;
  consequence_ids: string[];
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
};

type WorldEventDraft = {
  name: string;
  description: string;
  status: string;
  locations: string[];
  characters: string[];
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
  dm_notes: string;
};

type WorldEventSourceDraft = {
  plotPointId?: string;
  consequenceIds: string[];
  consequenceDescriptions: string[];
  actionIds: string[];
  actionDescriptions: string[];
};

const listToText = (values?: string[]) => (values ?? []).join("\n");
const textToList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const optionalText = (value: string) => value.trim() || undefined;
const optionalInteger = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const withThreadStories = (storyIds: string[], links: WorldStoryThreadLink[]) =>
  [...new Set([...storyIds, ...links.map((link) => link.world_story_id)])];
const storyContentFromText = (text: string): StoryContent => ({ nodes: [{ type: "text", text }] });
const hasEntityLinks = (content: StoryContent) => content.nodes.some((node) => node.type === "entity_link");

function readStoryContent(element: HTMLElement): StoryContent {
  const nodes: StoryContentNode[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) nodes.push({ type: "text", text });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      nodes.push({ type: "text", text: "\n" });
      return;
    }
    const entityId = node.dataset.entityId;
    if (entityId) {
      nodes.push({ type: "entity_link", entity_id: entityId, text: node.textContent ?? "" });
      return;
    }
    const isLine = node.tagName === "DIV" || node.tagName === "P";
    if (isLine && nodes.length && nodes[nodes.length - 1]?.text !== "\n") {
      nodes.push({ type: "text", text: "\n" });
    }
    node.childNodes.forEach(visit);
  };
  element.childNodes.forEach(visit);
  const mergedNodes = nodes.reduce<StoryContentNode[]>((merged, node) => {
    const previous = merged[merged.length - 1];
    if (node.type === "text" && previous?.type === "text") previous.text += node.text;
    else if (node.text) merged.push(node);
    return merged;
  }, []);
  return { nodes: mergedNodes };
}

function storyContentText(content: StoryContent) {
  return content.nodes.map((node) => node.text).join("");
}

function PlotPointDescriptionEditor({
  label,
  resetKey,
  content,
  entities,
  disabled,
  onChange,
}: {
  label: string;
  resetKey: string;
  content: StoryContent;
  entities: EntitySummary[];
  disabled: boolean;
  onChange: (content: StoryContent) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const initialContentRef = useRef(content);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntitySummary | null>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.replaceChildren();
    initialContentRef.current.nodes.forEach((node) => {
      if (node.type === "entity_link") {
        const link = document.createElement("span");
        link.dataset.entityId = node.entity_id;
        link.textContent = node.text;
        link.style.textDecoration = "underline";
        link.style.textDecorationColor = "#c5a15b";
        link.style.textUnderlineOffset = "3px";
        editor.append(link);
      } else {
        editor.append(document.createTextNode(node.text));
      }
    });
  }, [resetKey]);

  const captureSelection = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || selection.isCollapsed || !editor || !selection.rangeCount) {
      setSelectedText("");
      savedRangeRef.current = null;
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setSelectedText("");
      savedRangeRef.current = null;
      return;
    }
    savedRangeRef.current = range.cloneRange();
    setSelectedText(selection.toString());
  };

  const handleInput = () => {
    if (editorRef.current) onChange(readStoryContent(editorRef.current));
  };

  const applyEntityLink = () => {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range || !selectedEntity || !editor.contains(range.commonAncestorContainer)) return;
    const link = document.createElement("span");
    link.dataset.entityId = selectedEntity.id;
    link.textContent = range.toString();
    link.style.textDecoration = "underline";
    link.style.textDecorationColor = "#c5a15b";
    link.style.textUnderlineOffset = "3px";
    range.deleteContents();
    range.insertNode(link);
    range.setStartAfter(link);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    handleInput();
    setLinkDialogOpen(false);
    setSelectedEntity(null);
    setSelectedText("");
    savedRangeRef.current = null;
  };

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">{label} · select text to link it to a world entry</Typography>
      <Box
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Plot point description"
        aria-multiline="true"
        onInput={handleInput}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        sx={{
          minHeight: 88,
          maxHeight: 300,
          overflowY: "auto",
          p: 1.75,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          outline: "none",
          "&:focus": { borderColor: "primary.main" },
          "&[contenteditable='false']": { opacity: 0.7 },
        }}
      />
      <Box>
        <Button
          size="small"
          startIcon={<LinkIcon />}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            captureSelection();
            setSelectedEntity(null);
            setLinkDialogOpen(true);
          }}
          disabled={disabled || !selectedText.trim()}
        >
          Link selected text
        </Button>
      </Box>
      <Dialog open={linkDialogOpen} onClose={() => { setLinkDialogOpen(false); setSelectedEntity(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Link selected text</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            “{selectedText}” will open the selected entry in the details sidebar.
          </Typography>
          <Autocomplete
            options={entities}
            value={selectedEntity}
            onChange={(_, value) => setSelectedEntity(value)}
            getOptionLabel={(option) => option.name}
            groupBy={(option) => option.entity_type.replaceAll("_", " ")}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Search world entries" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLinkDialogOpen(false); setSelectedEntity(null); }}>Cancel</Button>
          <Button onClick={applyEntityLink} disabled={!selectedEntity}>Add link</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function StoryContentView({ content, onOpenEntity }: { content: StoryContent; onOpenEntity: (id: string) => void }) {
  return content.nodes.map((node, index) => node.type === "entity_link" ? (
    <Box
      component="button"
      key={`${node.entity_id}-${index}`}
      type="button"
      onClick={() => onOpenEntity(node.entity_id)}
      sx={{
        display: "inline",
        p: 0,
        border: 0,
        background: "none",
        color: "inherit",
        font: "inherit",
        textDecoration: "underline",
        textDecorationColor: "primary.main",
        textUnderlineOffset: "3px",
        cursor: "pointer",
      }}
    >{node.text}</Box>
  ) : <span key={index}>{node.text}</span>);
}

function splitStoryContentLines(content: StoryContent): StoryContent[] {
  const lines: StoryContentNode[][] = [[]];
  content.nodes.forEach((node) => {
    const parts = node.text.split("\n");
    parts.forEach((part, index) => {
      if (part) {
        lines[lines.length - 1].push(node.type === "entity_link"
          ? { ...node, text: part }
          : { type: "text", text: part });
      }
      if (index < parts.length - 1) lines.push([]);
    });
  });
  return lines.filter((line) => line.some((node) => node.text.trim())).map((nodes) => ({ nodes }));
}

function PlotPointDescription({ beat, onOpenEntity }: { beat: StoryBeat; onOpenEntity: (id: string) => void }) {
  if (beat.description_content?.nodes.length) {
    return <StoryContentView content={beat.description_content} onOpenEntity={onOpenEntity} />;
  }
  return beat.description;
}

function EntityIdMultiSelect({
  label,
  ids,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  ids: string[];
  options: EntitySummary[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const values = ids.map((id) => options.find((option) => option.id === id) ?? {
    id,
    entity_type: "unknown",
    name: id,
  });
  const allOptions = [...options, ...values.filter((value) => !options.some((option) => option.id === value.id))];

  return (
    <Autocomplete
      multiple
      options={allOptions}
      value={values}
      onChange={(_, selected) => onChange(selected.map((item) => item.id))}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack>
            <Typography variant="body2">{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">{option.entity_type.replaceAll("_", " ")}</Typography>
          </Stack>
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} placeholder="Search and select" />}
      disabled={disabled}
      noOptionsText="No matching entries"
    />
  );
}

function encodeThreadLink(link: WorldStoryThreadLink) {
  return JSON.stringify([link.world_story_id, link.thread_id]);
}

function decodeThreadLinks(values: string[]): WorldStoryThreadLink[] {
  return values.flatMap((value) => {
    try {
      const decoded: unknown = JSON.parse(value);
      if (Array.isArray(decoded) && decoded.length === 2 && decoded.every((part) => typeof part === "string")) {
        return [{ world_story_id: decoded[0], thread_id: decoded[1] }];
      }
    } catch {
      return [];
    }
    return [];
  });
}

function WorldStoryLinksEditor({
  worldStoryIds,
  threadLinks,
  worldStoryOptions,
  threadOptions,
  onChange,
  disabled,
}: {
  worldStoryIds: string[];
  threadLinks: WorldStoryThreadLink[];
  worldStoryOptions: EntitySummary[];
  threadOptions: EntitySummary[];
  onChange: (worldStoryIds: string[], threadLinks: WorldStoryThreadLink[]) => void;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={1}>
      <EntityIdMultiSelect
        label="Affects World Stories"
        ids={worldStoryIds}
        options={worldStoryOptions}
        onChange={(ids) => onChange(ids, threadLinks.filter((link) => ids.includes(link.world_story_id)))}
        disabled={disabled}
      />
      <EntityIdMultiSelect
        label="Story Threads"
        ids={threadLinks.map(encodeThreadLink)}
        options={threadOptions}
        onChange={(values) => {
          const links = decodeThreadLinks(values);
          onChange([...new Set([...worldStoryIds, ...links.map((link) => link.world_story_id)])], links);
        }}
        disabled={disabled}
      />
    </Stack>
  );
}

function WorldStoryReferenceChips({
  worldStoryIds,
  threadLinks,
  stories,
  onOpen,
}: {
  worldStoryIds: string[];
  threadLinks: WorldStoryThreadLink[];
  stories: WorldStory[];
  onOpen: (id: string) => void;
}) {
  const links = threadLinks.map((link) => ({
    key: encodeThreadLink(link),
    storyId: link.world_story_id,
    label: `${stories.find((story) => story.id === link.world_story_id)?.name ?? link.world_story_id} · ${stories.find((story) => story.id === link.world_story_id)?.threads.find((thread) => thread.id === link.thread_id)?.name ?? link.thread_id}`,
  }));
  const taggedStoryIds = new Set(threadLinks.map((link) => link.world_story_id));
  const allLinks = [
    ...worldStoryIds.filter((id) => !taggedStoryIds.has(id)).map((id) => ({
      key: id,
      storyId: id,
      label: stories.find((story) => story.id === id)?.name ?? id,
    })),
    ...links,
  ];
  if (!allLinks.length) return null;
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", mt: 0.75 }}>
      {allLinks.map((link) => <Chip key={link.key} size="small" label={link.label} variant="outlined" clickable onClick={() => onOpen(link.storyId)} />)}
    </Stack>
  );
}

function isCampaignStory(value: Campaign["story"]): value is CampaignStory {
  return typeof value === "object" && value !== null && "beats" in value;
}

function CampaignDashboardPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { loadEntity, updateEntity, createEntity, loadCampaignReferences, entities, getEntity } = useWorldData();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [worldStories, setWorldStories] = useState<WorldStory[]>([]);
  const [campaignLinkedRecords, setCampaignLinkedRecords] = useState<EntitySummary[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<EntitySummary[]>([]);
  const [linkingReference, setLinkingReference] = useState(false);
  const [loadedCampaignId, setLoadedCampaignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beatName, setBeatName] = useState("");
  const [beatDescription, setBeatDescription] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionSessionInput, setActionSessionInput] = useState("");
  const [actionWorldStories, setActionWorldStories] = useState<string[]>([]);
  const [actionWorldStoryThreads, setActionWorldStoryThreads] = useState<WorldStoryThreadLink[]>([]);
  const [beatStatusFilter, setBeatStatusFilter] = useState<StoryBeatStatus | "all">("all");
  const [clockProgressFilter, setClockProgressFilter] = useState<ClockProgressFilter>("all");
  const [clockName, setClockName] = useState("");
  const [clockMaximum, setClockMaximum] = useState("3");
  const [consequenceDescription, setConsequenceDescription] = useState("");
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [beatDraft, setBeatDraft] = useState<BeatDraft | null>(null);
  const [editingConsequenceId, setEditingConsequenceId] = useState<string | null>(null);
  const [consequenceDraft, setConsequenceDraft] = useState<ConsequenceDraft | null>(null);
  const [editingClockId, setEditingClockId] = useState<string | null>(null);
  const [clockDraft, setClockDraft] = useState<ClockDraft | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [worldEventDialogOpen, setWorldEventDialogOpen] = useState(false);
  const [worldEventDraft, setWorldEventDraft] = useState<WorldEventDraft | null>(null);
  const [worldEventSource, setWorldEventSource] = useState<WorldEventSourceDraft | null>(null);
  const [creatingWorldEvent, setCreatingWorldEvent] = useState(false);
  const [closeoutOpen, setCloseoutOpen] = useState(false);
  const [closeoutDrafts, setCloseoutDrafts] = useState<Record<string, CloseoutActionDraft>>({});
  const [closeoutSessionFilter, setCloseoutSessionFilter] = useState("all");
  const {
    entityId,
    isOpen,
    canGoBack,
    openEntity,
    goBack,
    closeEntity,
  } = useEntityDrawer();

  useEffect(() => {
    const storyIds = entities.filter((entity) => entity.entity_type === "world_story").map((entity) => entity.id);
    let cancelled = false;
    Promise.all(storyIds.map((id) => loadEntity(id)))
      .then((results) => {
        if (!cancelled) {
          setWorldStories(results
            .filter((result) => result.entity_type === "world_story")
            .map((result) => result.entity as unknown as WorldStory));
        }
      })
      .catch(() => { if (!cancelled) setWorldStories([]); });
    return () => { cancelled = true; };
  }, [entities, loadEntity]);

  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;

    loadEntity(campaignId)
      .then((result: EntityResponse) => {
        if (!cancelled) {
          if (result.entity_type !== "campaign") {
            setCampaign(null);
            setError("This entity is not a campaign.");
            setLoadedCampaignId(campaignId);
            return;
          }
          setCampaign(result.entity as unknown as Campaign);
          setError(null);
          setLoadedCampaignId(campaignId);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setCampaign(null);
          setError(loadError.message);
          setLoadedCampaignId(campaignId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, loadEntity]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    loadCampaignReferences(campaignId)
      .then((references) => {
        if (!cancelled) setCampaignLinkedRecords(references);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, loadCampaignReferences]);

  const story = campaign?.story;
  const legacyStory = Boolean(story && !isCampaignStory(story));
  const campaignStory = story && isCampaignStory(story) ? story : EMPTY_STORY;
  const beats = campaignStory.beats;
  const actions = campaignStory.player_actions;
  const unreviewedActions = actions.filter((action) => !action.reviewed);
  const closeoutSessions = [...new Set(actions.flatMap((action) => action.session === undefined ? [] : [String(action.session)]))].sort((a, b) => Number(a) - Number(b));
  const closeoutActions = unreviewedActions.filter((action) => closeoutSessionFilter === "all"
    || (closeoutSessionFilter === "unassigned" ? action.session === undefined : String(action.session) === closeoutSessionFilter));
  const clocks = campaignStory.world_clocks;
  const filteredBeats = beatStatusFilter === "all"
    ? beats
    : beats.filter((beat) => beat.status === beatStatusFilter);
  const filteredClocks = clockProgressFilter === "all"
    ? clocks
    : clocks.filter((clock) => getClockProgress(clock) === clockProgressFilter);
  const linkedEntityIds = [
    ...(campaign?.player_characters ?? []),
    ...(campaign?.npcs ?? []),
    ...(campaign?.locations ?? []),
  ];
  const linkableEntityTypes = new Set(["world_event", "timeline_event", "lore"]);
  const linkedReferenceIds = new Set(campaignLinkedRecords.map((reference) => reference.id));
  const availableReferences = entities.filter(
    (entity) => linkableEntityTypes.has(entity.entity_type) && !linkedReferenceIds.has(entity.id),
  );
  const plotPointOptions: EntitySummary[] = beats.map((beat) => ({
    id: beat.id,
    entity_type: "plot_point",
    name: beat.name,
  }));
  const locationOptions = entities.filter((entity) => ["city", "location", "region", "kingdom"].includes(entity.entity_type));
  const npcOptions = entities.filter((entity) => entity.entity_type === "npc");
  const playerCharacterOptions = entities.filter((entity) => entity.entity_type === "player_character");
  const worldEventOptions = entities.filter((entity) => entity.entity_type === "world_event");
  const worldStoryOptions = entities.filter((entity) => entity.entity_type === "world_story");
  const worldStoryThreadOptions: EntitySummary[] = worldStories.flatMap((worldStory) => worldStory.threads.map((thread) => ({
    id: encodeThreadLink({ world_story_id: worldStory.id, thread_id: thread.id }),
    entity_type: "world_story_thread",
    name: `${worldStory.name} — ${thread.name}`,
  })));
  const currentBeat = beats.find(
    (beat) => beat.id === campaignStory.current_beat,
  );
  const consequences = useMemo(
    () =>
      beats.flatMap((beat) =>
        (beat.consequences ?? []).map((consequence) => ({
          beat,
          consequence,
        })),
      ),
    [beats],
  );
  const consequenceOptions: EntitySummary[] = consequences.map(({ beat, consequence }) => ({
    id: consequence.id,
    entity_type: "consequence",
    name: `${beat.name}: ${consequence.description}`,
  }));

  const saveStory = async (nextStory: CampaignStory): Promise<boolean> => {
    if (!campaign || !campaignId) return false;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateEntity(campaignId, {
        ...campaign,
        story: nextStory,
      });
      setCampaign(saved.entity as unknown as Campaign);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save campaign.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSessionCloseout = () => {
    setCloseoutDrafts(Object.fromEntries(actions.map((action) => [action.id, {
      session: action.session === undefined ? "" : String(action.session),
      consequence_ids: action.consequence_ids ?? [],
      world_stories: action.world_stories ?? [],
      world_story_threads: action.world_story_threads ?? [],
    }])));
    setCloseoutSessionFilter("all");
    setCloseoutOpen(true);
  };

  const saveCloseoutAction = async (actionId: string, reviewed: boolean) => {
    const action = actions.find((item) => item.id === actionId);
    const draft = closeoutDrafts[actionId];
    if (!action || !draft) return null;
    const updatedAction = {
      ...action,
      session: optionalInteger(draft.session),
      consequence_ids: draft.consequence_ids,
      world_stories: withThreadStories(draft.world_stories, draft.world_story_threads),
      world_story_threads: draft.world_story_threads,
      reviewed,
    };
    const nextStory = {
      ...campaignStory,
      player_actions: campaignStory.player_actions.map((item) => item.id === actionId ? updatedAction : item),
    };
    return await saveStory(nextStory) ? updatedAction : null;
  };

  const updateStory = (updater: (current: CampaignStory) => CampaignStory) => {
    if (legacyStory) return;
    const current = story && isCampaignStory(story) ? story : EMPTY_STORY;
    void saveStory(updater(current));
  };

  const startWorldEventFromConsequence = (beat: StoryBeat, consequence: StoryConsequence) => {
    const sourceActions = actions.filter((action) => action.consequence_ids?.includes(consequence.id));
    const worldStories = [...new Set([
      ...(beat.world_stories ?? []),
      ...(consequence.world_stories ?? []),
      ...sourceActions.flatMap((action) => action.world_stories ?? []),
    ])];
    const worldStoryThreads = [...new Map([
      ...(beat.world_story_threads ?? []),
      ...(consequence.world_story_threads ?? []),
      ...sourceActions.flatMap((action) => action.world_story_threads ?? []),
    ].map((link) => [encodeThreadLink(link), link])).values()];
    const suggestedName = consequence.description.replace(/\s+/g, " ").trim();
    setWorldEventSource({
      plotPointId: beat.id,
      consequenceIds: [consequence.id],
      consequenceDescriptions: [consequence.description],
      actionIds: sourceActions.map((action) => action.id),
      actionDescriptions: sourceActions.map((action) => action.description),
    });
    setWorldEventDraft({
      name: suggestedName.length > 72 ? `${suggestedName.slice(0, 69)}…` : suggestedName,
      description: consequence.description,
      status: "ongoing",
      locations: [...(beat.locations ?? [])],
      characters: [...new Set([...(beat.npcs ?? []), ...(beat.player_characters ?? [])])],
      world_stories: worldStories,
      world_story_threads: worldStoryThreads,
      dm_notes: "",
    });
    setWorldEventDialogOpen(true);
  };

  const startWorldEventFromAction = (action: CampaignStory["player_actions"][number]) => {
    const sourceConsequences = consequences.filter(({ consequence }) => action.consequence_ids?.includes(consequence.id));
    const beat = beats.find((item) => item.id === action.story_beat);
    const worldStories = [...new Set([
      ...(beat?.world_stories ?? []),
      ...(action.world_stories ?? []),
      ...sourceConsequences.flatMap(({ consequence }) => consequence.world_stories ?? []),
    ])];
    const worldStoryThreads = [...new Map([
      ...(beat?.world_story_threads ?? []),
      ...(action.world_story_threads ?? []),
      ...sourceConsequences.flatMap(({ consequence }) => consequence.world_story_threads ?? []),
    ].map((link) => [encodeThreadLink(link), link])).values()];
    const suggestedName = action.description.replace(/\s+/g, " ").trim();
    setWorldEventSource({
      plotPointId: beat?.id,
      consequenceIds: sourceConsequences.map(({ consequence }) => consequence.id),
      consequenceDescriptions: sourceConsequences.map(({ consequence }) => consequence.description),
      actionIds: [action.id],
      actionDescriptions: [action.description],
    });
    setWorldEventDraft({
      name: suggestedName.length > 72 ? `${suggestedName.slice(0, 69)}…` : suggestedName,
      description: action.description,
      status: "ongoing",
      locations: [...(beat?.locations ?? [])],
      characters: [...new Set([...(beat?.npcs ?? []), ...(beat?.player_characters ?? [])])],
      world_stories: worldStories,
      world_story_threads: worldStoryThreads,
      dm_notes: "",
    });
    setWorldEventDialogOpen(true);
  };

  const saveWorldEventFromConsequence = async () => {
    if (!campaignId || !campaign || !worldEventDraft || !worldEventSource || !worldEventDraft.name.trim()) return;
    const beat = worldEventSource.plotPointId
      ? beats.find((item) => item.id === worldEventSource.plotPointId)
      : undefined;
    const sourceConsequences = worldEventSource.consequenceIds.map((id) => consequences.find((item) => item.consequence.id === id));
    const sourceActions = worldEventSource.actionIds.map((id) => actions.find((item) => item.id === id));
    if ((worldEventSource.plotPointId && !beat)
      || sourceConsequences.some((item) => !item)
      || sourceActions.some((item) => !item)) {
      setError("A source plot point, action, or consequence no longer exists.");
      return;
    }
    const resolvedConsequences = sourceConsequences.filter((item): item is (typeof consequences)[number] => Boolean(item));
    const resolvedActions = sourceActions.filter((item): item is CampaignStory["player_actions"][number] => Boolean(item));

    setCreatingWorldEvent(true);
    setError(null);
    try {
      const created = await createEntity("world_event", {
        name: worldEventDraft.name.trim(),
        description: optionalText(worldEventDraft.description),
        type: "campaign development",
        status: worldEventDraft.status,
        locations: worldEventDraft.locations,
        characters: worldEventDraft.characters,
        campaigns: [campaignId],
        world_stories: withThreadStories(worldEventDraft.world_stories, worldEventDraft.world_story_threads),
        world_story_threads: worldEventDraft.world_story_threads,
        story_sources: [{
          campaign_id: campaignId,
          plot_point_id: beat?.id,
          plot_point_name: beat?.name,
          consequence_ids: resolvedConsequences.map((item) => item.consequence.id),
          consequence_descriptions: resolvedConsequences.map((item) => item.consequence.description),
          player_action_ids: resolvedActions.map((item) => item.id),
          player_action_descriptions: resolvedActions.map((item) => item.description),
        }],
        caused_by: [],
        true_causes: [],
        hidden_connections: [],
        dm_notes: optionalText(worldEventDraft.dm_notes),
        consequences: [],
        potential_campaign: false,
      });
      setWorldEventDialogOpen(false);
      setWorldEventDraft(null);
      setWorldEventSource(null);
      try {
        setCampaignLinkedRecords(await loadCampaignReferences(campaignId));
      } catch {
        setError("World Event was created, but the campaign reference list could not be refreshed.");
      }

      const nextStory: CampaignStory = {
        ...campaignStory,
        beats: campaignStory.beats.map((item) => {
          const consequenceIdsForBeat = resolvedConsequences
            .filter((source) => source.beat.id === item.id)
            .map((source) => source.consequence.id);
          const shouldLinkEvent = item.id === beat?.id || consequenceIdsForBeat.length > 0;
          if (!shouldLinkEvent) return item;
          return {
          ...item,
          world_events: [...new Set([...(item.world_events ?? []), created.id])],
          consequences: (item.consequences ?? []).map((itemConsequence) => consequenceIdsForBeat.includes(itemConsequence.id)
            ? { ...itemConsequence, leads_to: [...new Set([...(itemConsequence.leads_to ?? []), created.id])] }
            : itemConsequence),
          };
        }),
      };
      const storySaved = await saveStory(nextStory);
      if (!storySaved) {
        setError(`World Event “${worldEventDraft.name.trim()}” was created, but its plot point link did not save. It remains linked to this campaign.`);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create this World Event.");
    } finally {
      setCreatingWorldEvent(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget || saving) return;
    if (deleteTarget.kind === "plot point") {
      const removedConsequences = beats
        .find((beat) => beat.id === deleteTarget.id)
        ?.consequences?.map((consequence) => consequence.id) ?? [];
      updateStory((current) => ({
        ...current,
        beats: current.beats
          .filter((beat) => beat.id !== deleteTarget.id)
          .map((beat) => ({
            ...beat,
            leads_to: (beat.leads_to ?? []).filter((id) => id !== deleteTarget.id),
            consequences: (beat.consequences ?? []).map((consequence) => ({
              ...consequence,
              leads_to: (consequence.leads_to ?? []).filter((id) => id !== deleteTarget.id),
            })),
          })),
        current_beat: current.current_beat === deleteTarget.id ? undefined : current.current_beat,
        player_actions: current.player_actions.map((action) => ({
          ...action,
          story_beat: action.story_beat === deleteTarget.id ? undefined : action.story_beat,
          consequence_ids: (action.consequence_ids ?? []).filter((id) => !removedConsequences.includes(id)),
        })),
      }));
      if (editingBeatId === deleteTarget.id) {
        setEditingBeatId(null);
        setBeatDraft(null);
      }
    } else if (deleteTarget.kind === "consequence") {
      updateStory((current) => ({
        ...current,
        beats: current.beats.map((beat) => beat.id === deleteTarget.parentBeatId
          ? { ...beat, consequences: (beat.consequences ?? []).filter((item) => item.id !== deleteTarget.id) }
          : beat),
        player_actions: current.player_actions.map((action) => ({
          ...action,
          consequence_ids: (action.consequence_ids ?? []).filter((id) => id !== deleteTarget.id),
        })),
      }));
      if (editingConsequenceId === deleteTarget.id) {
        setEditingConsequenceId(null);
        setConsequenceDraft(null);
      }
    } else if (deleteTarget.kind === "clock") {
      updateStory((current) => ({
        ...current,
        world_clocks: current.world_clocks.filter((clock) => clock.id !== deleteTarget.id),
      }));
      if (editingClockId === deleteTarget.id) {
        setEditingClockId(null);
        setClockDraft(null);
      }
    } else {
      updateStory((current) => ({
        ...current,
        player_actions: current.player_actions.filter((action) => action.id !== deleteTarget.id),
      }));
      if (editingActionId === deleteTarget.id) {
        setEditingActionId(null);
        setActionDraft(null);
      }
    }
    setDeleteTarget(null);
  };

  const addBeat = () => {
    const name = beatName.trim();
    if (!name) return;
    const beat: StoryBeat = {
      id: crypto.randomUUID(),
      name,
      description: beatDescription.trim() || undefined,
      status: "planned",
      order: beats.length,
    };
    updateStory((current) => ({
      ...current,
      beats: [...current.beats, beat],
    }));
    setBeatName("");
    setBeatDescription("");
  };

  const addAction = () => {
    const description = actionDescription.trim();
    if (!description) return;
    updateStory((current) => ({
      ...current,
      player_actions: [
        {
          id: crypto.randomUUID(),
          description,
          session: optionalInteger(actionSessionInput),
          story_beat: current.current_beat,
          world_stories: actionWorldStories,
          world_story_threads: actionWorldStoryThreads,
        },
        ...current.player_actions,
      ],
    }));
    setActionDescription("");
    setActionSessionInput("");
    setActionWorldStories([]);
    setActionWorldStoryThreads([]);
  };

  const addClock = () => {
    const name = clockName.trim();
    const maximum = Math.max(1, Number.parseInt(clockMaximum, 10) || 1);
    if (!name) return;
    const clock: WorldClock = {
      id: crypto.randomUUID(),
      name,
      current: 0,
      maximum,
      status: "active",
      stages: [],
    };
    updateStory((current) => ({
      ...current,
      world_clocks: [...current.world_clocks, clock],
    }));
    setClockName("");
    setClockMaximum("3");
  };

  const addConsequence = () => {
    const description = consequenceDescription.trim();
    if (!description || !campaignStory.current_beat) return;
    const consequence: StoryConsequence = {
      id: crypto.randomUUID(),
      description,
      status: "pending",
    };
    updateStory((current) => ({
      ...current,
      beats: current.beats.map((beat) =>
        beat.id === current.current_beat
          ? { ...beat, consequences: [...(beat.consequences ?? []), consequence] }
          : beat,
      ),
    }));
    setConsequenceDescription("");
  };

  const updateBeatStatus = (beatId: string, status: StoryBeatStatus) => {
    updateStory((current) => ({
      ...current,
      beats: current.beats.map((beat) =>
        beat.id === beatId ? { ...beat, status } : beat,
      ),
    }));
  };

  const setCurrentBeat = (beatId: string) => {
    updateStory((current) => ({ ...current, current_beat: beatId }));
  };

  const updateConsequenceStatus = (
    beatId: string,
    consequenceId: string,
    status: StoryConsequence["status"],
  ) => {
    updateStory((current) => ({
      ...current,
      beats: current.beats.map((beat) =>
        beat.id === beatId
          ? {
              ...beat,
              consequences: (beat.consequences ?? []).map((consequence) =>
                consequence.id === consequenceId
                  ? { ...consequence, status }
                  : consequence,
              ),
            }
          : beat,
      ),
    }));
  };

  const updateClock = (clockId: string, updater: (clock: WorldClock) => WorldClock) => {
    updateStory((current) => ({
      ...current,
      world_clocks: current.world_clocks.map((clock) =>
        clock.id === clockId ? updater(clock) : clock,
      ),
    }));
  };

  const startBeatEdit = (beat: StoryBeat) => {
    setEditingBeatId(beat.id);
    setBeatDraft({
      name: beat.name,
      description: beat.description ?? "",
      description_content: beat.description_content ?? storyContentFromText(beat.description ?? ""),
      events_content: beat.events_content ?? storyContentFromText(beat.events ?? ""),
      triggers_content: beat.triggers_content ?? storyContentFromText(listToText(beat.triggers)),
      possible_approaches_content: beat.possible_approaches_content ?? storyContentFromText(listToText(beat.possible_approaches)),
      status: beat.status,
      act: beat.act ?? "",
      order: beat.order === undefined ? "" : String(beat.order),
      secrets: listToText(beat.secrets),
      leads_to: listToText(beat.leads_to),
      locations: listToText(beat.locations),
      npcs: listToText(beat.npcs),
      player_characters: listToText(beat.player_characters),
      world_events: listToText(beat.world_events),
      world_stories: withThreadStories(beat.world_stories ?? [], beat.world_story_threads ?? []),
      world_story_threads: beat.world_story_threads ?? [],
    });
  };

  const saveBeatEdit = (beatId: string) => {
    if (!beatDraft?.name.trim()) return;
    updateStory((current) => ({
      ...current,
      beats: current.beats.map((beat) => beat.id === beatId ? {
        ...beat,
        name: beatDraft.name.trim(),
        description: optionalText(storyContentText(beatDraft.description_content)),
        description_content: hasEntityLinks(beatDraft.description_content)
          ? beatDraft.description_content
          : undefined,
        events: optionalText(storyContentText(beatDraft.events_content)),
        events_content: hasEntityLinks(beatDraft.events_content) ? beatDraft.events_content : undefined,
        status: beatDraft.status,
        act: optionalText(beatDraft.act),
        order: beatDraft.order.trim() ? Number(beatDraft.order) : undefined,
        triggers: textToList(storyContentText(beatDraft.triggers_content)),
        triggers_content: hasEntityLinks(beatDraft.triggers_content) ? beatDraft.triggers_content : undefined,
        secrets: textToList(beatDraft.secrets),
        possible_approaches: textToList(storyContentText(beatDraft.possible_approaches_content)),
        possible_approaches_content: hasEntityLinks(beatDraft.possible_approaches_content) ? beatDraft.possible_approaches_content : undefined,
        leads_to: textToList(beatDraft.leads_to),
        locations: textToList(beatDraft.locations),
        npcs: textToList(beatDraft.npcs),
        player_characters: textToList(beatDraft.player_characters),
        world_events: textToList(beatDraft.world_events),
        world_stories: withThreadStories(beatDraft.world_stories, beatDraft.world_story_threads),
        world_story_threads: beatDraft.world_story_threads,
      } : beat),
    }));
    setEditingBeatId(null);
    setBeatDraft(null);
  };

  const startConsequenceEdit = (consequence: StoryConsequence) => {
    setEditingConsequenceId(consequence.id);
    setConsequenceDraft({
      description: consequence.description,
      trigger: consequence.trigger ?? "",
      player_action: consequence.player_action ?? "",
      timing: consequence.timing ?? "",
      status: consequence.status,
      leads_to: listToText(consequence.leads_to),
      world_stories: consequence.world_stories ?? [],
      world_story_threads: consequence.world_story_threads ?? [],
    });
  };

  const saveConsequenceEdit = (beatId: string, consequenceId: string) => {
    if (!consequenceDraft?.description.trim()) return;
    updateStory((current) => ({
      ...current,
      beats: current.beats.map((beat) => beat.id === beatId ? {
        ...beat,
        consequences: (beat.consequences ?? []).map((consequence) => consequence.id === consequenceId ? {
          ...consequence,
          description: consequenceDraft.description.trim(),
          trigger: optionalText(consequenceDraft.trigger),
          player_action: optionalText(consequenceDraft.player_action),
          timing: optionalText(consequenceDraft.timing),
          status: consequenceDraft.status,
          leads_to: textToList(consequenceDraft.leads_to),
          world_stories: withThreadStories(consequenceDraft.world_stories, consequenceDraft.world_story_threads),
          world_story_threads: consequenceDraft.world_story_threads,
        } : consequence),
      } : beat),
    }));
    setEditingConsequenceId(null);
    setConsequenceDraft(null);
  };

  const startClockEdit = (clock: WorldClock) => {
    setEditingClockId(clock.id);
    setClockDraft({
      name: clock.name,
      description: clock.description ?? "",
      current: String(clock.current),
      maximum: String(clock.maximum),
      stages: listToText(clock.stages),
      completion: clock.completion ?? "",
      status: clock.status,
    });
  };

  const saveClockEdit = (clockId: string) => {
    if (!clockDraft?.name.trim()) return;
    const maximum = Math.max(1, Number.parseInt(clockDraft.maximum, 10) || 1);
    const current = Math.min(maximum, Math.max(0, Number.parseInt(clockDraft.current, 10) || 0));
    updateClock(clockId, (clock) => ({
      ...clock,
      name: clockDraft.name.trim(),
      description: optionalText(clockDraft.description),
      current,
      maximum,
      stages: textToList(clockDraft.stages),
      completion: optionalText(clockDraft.completion),
      status: clockDraft.status,
    }));
    setEditingClockId(null);
    setClockDraft(null);
  };

  const startActionEdit = (action: CampaignStory["player_actions"][number]) => {
    setEditingActionId(action.id);
    setActionDraft({
      description: action.description,
      notes: action.notes ?? "",
      session: action.session === undefined ? "" : String(action.session),
      story_beat: action.story_beat ?? "",
      consequence_ids: listToText(action.consequence_ids),
      world_stories: action.world_stories ?? [],
      world_story_threads: action.world_story_threads ?? [],
    });
  };

  const saveActionEdit = (actionId: string) => {
    if (!actionDraft?.description.trim()) return;
    updateStory((current) => ({
      ...current,
      player_actions: current.player_actions.map((action) => action.id === actionId ? {
        ...action,
        description: actionDraft.description.trim(),
        notes: optionalText(actionDraft.notes),
        session: actionDraft.session.trim() ? Number(actionDraft.session) : undefined,
        story_beat: optionalText(actionDraft.story_beat),
        consequence_ids: textToList(actionDraft.consequence_ids),
        world_stories: withThreadStories(actionDraft.world_stories, actionDraft.world_story_threads),
        world_story_threads: actionDraft.world_story_threads,
      } : action),
    }));
    setEditingActionId(null);
    setActionDraft(null);
  };

  const addCampaignReferences = async () => {
    if (!campaignId || selectedReferences.length === 0) return;
    setLinkingReference(true);
    setError(null);
    try {
      for (const reference of selectedReferences) {
        const loaded = await loadEntity(reference.id);
        const existingCampaigns = Array.isArray(loaded.entity.campaigns)
          ? loaded.entity.campaigns.filter((id): id is string => typeof id === "string")
          : [];
        if (!existingCampaigns.includes(campaignId)) {
          await updateEntity(reference.id, {
            ...loaded.entity,
            campaigns: [...existingCampaigns, campaignId],
          });
        }
      }
      setCampaignLinkedRecords(await loadCampaignReferences(campaignId));
      setSelectedReferences([]);
      setLinkDialogOpen(false);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not link this record.");
    } finally {
      setLinkingReference(false);
    }
  };

  const removeCampaignReference = async (reference: EntitySummary) => {
    if (!campaignId) return;
    setLinkingReference(true);
    setError(null);
    try {
      const loaded = await loadEntity(reference.id);
      const existingCampaigns = Array.isArray(loaded.entity.campaigns)
        ? loaded.entity.campaigns.filter((id): id is string => typeof id === "string")
        : [];
      await updateEntity(reference.id, {
        ...loaded.entity,
        campaigns: existingCampaigns.filter((id) => id !== campaignId),
      });
      setCampaignLinkedRecords((current) => current.filter((item) => item.id !== reference.id));
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Could not unlink this record.");
    } finally {
      setLinkingReference(false);
    }
  };

  if (!campaignId) {
    return <Alert severity="error">Campaign ID is missing.</Alert>;
  }

  if (loadedCampaignId !== campaignId) {
    return <Stack sx={{ alignItems: "center", py: 10 }}><CircularProgress /></Stack>;
  }

  if (error && !campaign) {
    return <Alert severity="error">Could not load campaign: {error}</Alert>;
  }

  if (!campaign) return null;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <IconButton aria-label="Back to campaigns" onClick={() => navigate("/campaigns")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="overline" color="text.secondary">CAMPAIGN DASHBOARD</Typography>
        {campaign.status && <Chip size="small" label={formatStatusLabel(campaign.status)} />}
        {saving && <Typography variant="caption" color="text.secondary">Saving…</Typography>}
      </Stack>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h1">{campaign.name}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 900 }}>
          {campaign.overview || campaign.description || "Campaign session workspace."}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {legacyStory && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This campaign has legacy linked story text. The Story Planner is read-only here so that content is not overwritten.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">IN PLAY</Typography>
                  <Typography variant="h2" sx={{ mt: 0.5 }}>Current Plot Point</Typography>
                </Box>
                {currentBeat && <Chip color="primary" label={formatStatusLabel(currentBeat.status)} />}
              </Stack>
              {currentBeat ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h3">{currentBeat.name}</Typography>
                  {(currentBeat.description || currentBeat.description_content?.nodes.length) && <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}><PlotPointDescription beat={currentBeat} onOpenEntity={openEntity} /></Typography>}
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Choose a plot point from the planner to set the session focus.
                </Typography>
              )}
              <Divider sx={{ my: 2.5 }} />
              <Accordion disableGutters elevation={0} sx={{ mt: 1, "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="subtitle2">Campaign references</Typography>
                    <Chip size="small" label={linkedEntityIds.length + campaignLinkedRecords.length} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mb: 1 }}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setLinkDialogOpen(true)} disabled={linkingReference}>
                      Add event or lore
                    </Button>
                  </Stack>
                  {linkedEntityIds.length || campaignLinkedRecords.length ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 0.75, width: "100%", minWidth: 0, boxSizing: "border-box", "& .MuiChip-root": { justifySelf: "start", maxWidth: "100%", minWidth: 0, height: "auto" }, "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere", py: 0.5 } }}>
                      {linkedEntityIds.map((id) => {
                        const cached = getEntity(id);
                        const entity = entities.find((item) => item.id === id);
                        const label = entity?.name ?? (typeof cached?.entity.name === "string" ? cached.entity.name : id);
                        return <Chip key={id} label={label} variant="outlined" clickable onClick={() => openEntity(id)} />;
                      })}
                      {campaignLinkedRecords.map((reference) => (
                        <Chip
                          key={reference.id}
                          label={reference.name}
                          title={reference.entity_type.replaceAll("_", " ")}
                          variant="outlined"
                          clickable
                          onClick={() => openEntity(reference.id)}
                          onDelete={() => void removeCampaignReference(reference)}
                          disabled={linkingReference}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No linked characters, locations, events, or lore yet.</Typography>
                  )}
                </AccordionDetails>
              </Accordion>
              <Dialog open={linkDialogOpen} onClose={() => !linkingReference && setLinkDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add a campaign reference</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Link an existing world event, timeline event, or lore record. The original record stays in the world database.
                  </Typography>
                  <Autocomplete
                    multiple
                    options={availableReferences}
                    value={selectedReferences}
                    onChange={(_, value) => setSelectedReferences(value)}
                    getOptionLabel={(option) => option.name}
                    groupBy={(option) => option.entity_type.replaceAll("_", " ")}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label="Search events and lore" />}
                    noOptionsText="No unlinked events or lore found"
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setLinkDialogOpen(false); setSelectedReferences([]); }} disabled={linkingReference}>Cancel</Button>
                  <Button onClick={() => void addCampaignReferences()} disabled={!selectedReferences.length || linkingReference}>
                    {linkingReference ? "Linking…" : `Add ${selectedReferences.length || ""} reference${selectedReferences.length === 1 ? "" : "s"}`}
                  </Button>
                </DialogActions>
              </Dialog>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">QUICK LOG</Typography>
              <Typography variant="h2" sx={{ mt: 0.5, mb: 2 }}>Player Action</Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="What did the party do?"
                  value={actionDescription}
                  onChange={(event) => setActionDescription(event.target.value)}
                  multiline
                  minRows={2}
                  disabled={saving || legacyStory}
                />
                <TextField label="Session (optional)" type="number" value={actionSessionInput} onChange={(event) => setActionSessionInput(event.target.value)} disabled={saving || legacyStory} />
                <WorldStoryLinksEditor
                  worldStoryIds={actionWorldStories}
                  threadLinks={actionWorldStoryThreads}
                  worldStoryOptions={worldStoryOptions}
                  threadOptions={worldStoryThreadOptions}
                  onChange={(worldStoryIds, threadLinks) => { setActionWorldStories(worldStoryIds); setActionWorldStoryThreads(threadLinks); }}
                  disabled={saving || legacyStory}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={addAction} disabled={!actionDescription.trim() || saving || legacyStory}>
                  Log Action
                </Button>
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1, gap: 1 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle2">Recent actions</Typography>
                  <Chip size="small" label={`${unreviewedActions.length} to review`} color={unreviewedActions.length ? "warning" : "default"} />
                </Stack>
                <Button size="small" onClick={openSessionCloseout} disabled={!actions.length || saving || legacyStory}>Session closeout</Button>
              </Stack>
              {actions.length ? (
                <Stack spacing={1.25} sx={{ maxHeight: 360, overflowY: "auto", pr: 0.5 }}>
                  {actions.map((action) => {
                    const linkedBeat = beats.find((beat) => beat.id === action.story_beat);
                    return <Box key={action.id}>
                      {editingActionId === action.id && actionDraft ? (
                        <Stack spacing={1}>
                          <TextField label="Player action" value={actionDraft.description} onChange={(event) => setActionDraft({ ...actionDraft, description: event.target.value })} multiline minRows={2} disabled={saving} />
                          <TextField label="Notes" value={actionDraft.notes} onChange={(event) => setActionDraft({ ...actionDraft, notes: event.target.value })} multiline minRows={2} disabled={saving} />
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField label="Session" type="number" value={actionDraft.session} onChange={(event) => setActionDraft({ ...actionDraft, session: event.target.value })} disabled={saving} />
                            <FormControl size="small" fullWidth>
                              <Select displayEmpty aria-label="Related plot point" value={actionDraft.story_beat} onChange={(event) => setActionDraft({ ...actionDraft, story_beat: event.target.value as string })} disabled={saving}>
                                <MenuItem value=""><em>No related plot point</em></MenuItem>
                                {beats.map((beat) => <MenuItem key={beat.id} value={beat.id}>{beat.name}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Stack>
                          <EntityIdMultiSelect label="Consequences" ids={textToList(actionDraft.consequence_ids)} options={consequenceOptions} onChange={(ids) => setActionDraft({ ...actionDraft, consequence_ids: listToText(ids) })} disabled={saving} />
                          <WorldStoryLinksEditor
                            worldStoryIds={actionDraft.world_stories}
                            threadLinks={actionDraft.world_story_threads}
                            worldStoryOptions={worldStoryOptions}
                            threadOptions={worldStoryThreadOptions}
                            onChange={(worldStoryIds, threadLinks) => setActionDraft({ ...actionDraft, world_stories: worldStoryIds, world_story_threads: threadLinks })}
                            disabled={saving}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button size="small" startIcon={<SaveIcon />} onClick={() => saveActionEdit(action.id)} disabled={saving || !actionDraft.description.trim()}>Save</Button>
                            <Button size="small" startIcon={<CloseIcon />} onClick={() => { setEditingActionId(null); setActionDraft(null); }} disabled={saving}>Cancel</Button>
                          </Stack>
                        </Stack>
                      ) : <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">{action.description}</Typography>
                          {linkedBeat && <Typography variant="caption" color="text.secondary">During {linkedBeat.name}</Typography>}
                          {action.reviewed && <Chip size="small" color="success" label="Reviewed" sx={{ mt: 0.5 }} />}
                          <WorldStoryReferenceChips worldStoryIds={action.world_stories ?? []} threadLinks={action.world_story_threads ?? []} stories={worldStories} onOpen={openEntity} />
                        </Box>
                        <Stack spacing={0} sx={{ alignItems: "flex-end", flex: "0 0 auto" }}>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton aria-label="Edit player action" title="Edit player action" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => startActionEdit(action)} disabled={saving || legacyStory || (editingActionId !== null && editingActionId !== action.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton aria-label={`Delete player action ${action.description}`} title="Delete player action" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => setDeleteTarget({ kind: "player action", id: action.id, label: action.description })} disabled={saving || legacyStory}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <IconButton
                            aria-label={`Create world event from player action: ${action.description}`}
                            title="Create world event"
                            size="small"
                            onClick={() => startWorldEventFromAction(action)}
                            disabled={saving || creatingWorldEvent || legacyStory}
                            sx={{ width: 36, height: 36, minWidth: 36, borderRadius: "50%", mr: 0.25 }}
                          >
                            <Box sx={{ position: "relative", display: "inline-flex", width: 20, height: 20 }}>
                              <EventIcon fontSize="small" />
                              <AddIcon sx={{ position: "absolute", right: -5, bottom: -3, width: 13, height: 13, borderRadius: "50%", bgcolor: "background.paper", color: "primary.main" }} />
                            </Box>
                          </IconButton>
                        </Stack>
                      </Stack>}
                    </Box>;
                  })}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No actions logged yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">PLANNING</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1, mt: 0.5 }}>
                  <Typography variant="h2">Plot Points</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Chip size="small" label={`${filteredBeats.length} / ${beats.length}`} />
                    <FormControl size="small" sx={{ minWidth: 145 }}>
                      <Select aria-label="Filter plot points by status" value={beatStatusFilter} onChange={(event) => setBeatStatusFilter(event.target.value as StoryBeatStatus | "all")}>
                        <MenuItem value="all">All statuses</MenuItem>
                        {BEAT_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              </Box>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {filteredBeats.length ? filteredBeats.map((beat) => (
                  <Box key={beat.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>{beat.name}</Typography>
                        {(beat.description || beat.description_content?.nodes.length) && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}><PlotPointDescription beat={beat} onOpenEntity={openEntity} /></Typography>}
                        <WorldStoryReferenceChips worldStoryIds={beat.world_stories ?? []} threadLinks={beat.world_story_threads ?? []} stories={worldStories} onOpen={openEntity} />
                      </Box>
                      <Stack direction="row" sx={{ gap: 0.5, alignItems: "center", justifyContent: { xs: "flex-end", sm: "flex-start" }, flexShrink: 0 }}>
                        {campaignStory.current_beat === beat.id ? (
                          <Chip size="small" color="primary" label="Current" sx={{ minWidth: 100, justifyContent: "center" }} />
                        ) : (
                          <Button size="small" onClick={() => setCurrentBeat(beat.id)} disabled={saving || legacyStory || editingBeatId === beat.id} sx={{ minWidth: 100, whiteSpace: "nowrap", px: 1 }}>Make current</Button>
                        )}
                        <FormControl size="small" sx={{ minWidth: 128 }}>
                          <Select value={beat.status} aria-label={`Status for plot point ${beat.name}`} onChange={(event) => updateBeatStatus(beat.id, event.target.value as StoryBeatStatus)} disabled={saving || legacyStory || editingBeatId === beat.id}>
                            {BEAT_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <IconButton aria-label={`Edit plot point ${beat.name}`} title="Edit plot point" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => startBeatEdit(beat)} disabled={saving || legacyStory || (editingBeatId !== null && editingBeatId !== beat.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton aria-label={`Delete plot point ${beat.name}`} title="Delete plot point" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => setDeleteTarget({ kind: "plot point", id: beat.id, label: beat.name })} disabled={saving || legacyStory}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    {editingBeatId === beat.id && beatDraft && (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField label="Plot point name" value={beatDraft.name} onChange={(event) => setBeatDraft({ ...beatDraft, name: event.target.value })} disabled={saving} />
                        <PlotPointDescriptionEditor
                          label="Description"
                          resetKey={beat.id}
                          content={beatDraft.description_content}
                          entities={entities}
                          disabled={saving}
                          onChange={(content) => setBeatDraft({
                            ...beatDraft,
                            description_content: content,
                            description: storyContentText(content),
                          })}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <FormControl size="small" fullWidth>
                            <Select aria-label="Plot point status" value={beatDraft.status} onChange={(event) => setBeatDraft({ ...beatDraft, status: event.target.value as StoryBeatStatus })} disabled={saving}>
                              {BEAT_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <TextField label="Act" value={beatDraft.act} onChange={(event) => setBeatDraft({ ...beatDraft, act: event.target.value })} disabled={saving} />
                          <TextField label="Order" type="number" value={beatDraft.order} onChange={(event) => setBeatDraft({ ...beatDraft, order: event.target.value })} disabled={saving} />
                        </Stack>
                        <PlotPointDescriptionEditor
                          label="Events / what may happen"
                          resetKey={`${beat.id}-events`}
                          content={beatDraft.events_content}
                          entities={entities}
                          disabled={saving}
                          onChange={(content) => setBeatDraft({ ...beatDraft, events_content: content })}
                        />
                        <PlotPointDescriptionEditor
                          label="Triggers (one per line)"
                          resetKey={`${beat.id}-triggers`}
                          content={beatDraft.triggers_content}
                          entities={entities}
                          disabled={saving}
                          onChange={(content) => setBeatDraft({ ...beatDraft, triggers_content: content })}
                        />
                        <PlotPointDescriptionEditor
                          label="Possible approaches (one per line)"
                          resetKey={`${beat.id}-approaches`}
                          content={beatDraft.possible_approaches_content}
                          entities={entities}
                          disabled={saving}
                          onChange={(content) => setBeatDraft({ ...beatDraft, possible_approaches_content: content })}
                        />
                        <TextField label="DM-only information (one per line)" value={beatDraft.secrets} onChange={(event) => setBeatDraft({ ...beatDraft, secrets: event.target.value })} multiline minRows={2} disabled={saving} />
                        <EntityIdMultiSelect label="Leads to plot points" ids={textToList(beatDraft.leads_to)} options={plotPointOptions} onChange={(ids) => setBeatDraft({ ...beatDraft, leads_to: listToText(ids) })} disabled={saving} />
                        <EntityIdMultiSelect label="Locations" ids={textToList(beatDraft.locations)} options={locationOptions} onChange={(ids) => setBeatDraft({ ...beatDraft, locations: listToText(ids) })} disabled={saving} />
                        <EntityIdMultiSelect label="NPCs" ids={textToList(beatDraft.npcs)} options={npcOptions} onChange={(ids) => setBeatDraft({ ...beatDraft, npcs: listToText(ids) })} disabled={saving} />
                        <EntityIdMultiSelect label="Player characters" ids={textToList(beatDraft.player_characters)} options={playerCharacterOptions} onChange={(ids) => setBeatDraft({ ...beatDraft, player_characters: listToText(ids) })} disabled={saving} />
                        <EntityIdMultiSelect label="World events" ids={textToList(beatDraft.world_events)} options={worldEventOptions} onChange={(ids) => setBeatDraft({ ...beatDraft, world_events: listToText(ids) })} disabled={saving} />
                        <WorldStoryLinksEditor
                          worldStoryIds={beatDraft.world_stories}
                          threadLinks={beatDraft.world_story_threads}
                          worldStoryOptions={worldStoryOptions}
                          threadOptions={worldStoryThreadOptions}
                          onChange={(worldStoryIds, threadLinks) => setBeatDraft({ ...beatDraft, world_stories: worldStoryIds, world_story_threads: threadLinks })}
                          disabled={saving}
                        />
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
                          <Button size="small" startIcon={<SaveIcon />} onClick={() => saveBeatEdit(beat.id)} disabled={saving || !beatDraft.name.trim()}>Save changes</Button>
                          <Button size="small" startIcon={<CloseIcon />} onClick={() => { setEditingBeatId(null); setBeatDraft(null); }} disabled={saving}>Cancel</Button>
                        </Stack>
                      </Stack>
                    )}
                    {editingBeatId !== beat.id && (beat.events || beat.events_content?.nodes.length || beat.triggers?.length || beat.triggers_content?.nodes.length || beat.possible_approaches?.length || beat.possible_approaches_content?.nodes.length || beat.secrets?.length) && (
                      <Accordion disableGutters elevation={0} sx={{ mt: 1, "&:before": { display: "none" } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 36, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
                          <Typography variant="caption" color="text.secondary">Preparation details</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0 }}>
                          <Stack spacing={1.5}>
                            {(beat.events || beat.events_content?.nodes.length) && <Box><Typography variant="caption" sx={{ fontWeight: 700 }}>What may happen</Typography><Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}><StoryContentView content={beat.events_content ?? storyContentFromText(beat.events ?? "")} onOpenEntity={openEntity} /></Typography></Box>}
                            {(beat.triggers?.length || beat.triggers_content?.nodes.length) ? <Box><Typography variant="caption" sx={{ fontWeight: 700 }}>Possible triggers</Typography><Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>{(beat.triggers_content ? splitStoryContentLines(beat.triggers_content) : (beat.triggers ?? []).map((trigger) => storyContentFromText(trigger))).map((content, index) => <li key={`${beat.id}-trigger-${index}`}><Typography variant="body2"><StoryContentView content={content} onOpenEntity={openEntity} /></Typography></li>)}</Box></Box> : null}
                            {(beat.possible_approaches?.length || beat.possible_approaches_content?.nodes.length) ? <Box><Typography variant="caption" sx={{ fontWeight: 700 }}>Possible approaches</Typography><Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>{(beat.possible_approaches_content ? splitStoryContentLines(beat.possible_approaches_content) : (beat.possible_approaches ?? []).map((approach) => storyContentFromText(approach))).map((content, index) => <li key={`${beat.id}-approach-${index}`}><Typography variant="body2"><StoryContentView content={content} onOpenEntity={openEntity} /></Typography></li>)}</Box></Box> : null}
                            {beat.secrets?.length ? <Box><Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>DM-only information</Typography><Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>{beat.secrets.map((secret) => <li key={secret}><Typography variant="body2">{secret}</Typography></li>)}</Box></Box> : null}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                )) : beats.length ? <Typography color="text.secondary">No plot points match this status.</Typography> : <Typography color="text.secondary">No plot points yet. Start with a name or a rough idea; you can add detail later.</Typography>}
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Add a plot point</Typography>
              <Stack spacing={1.25}>
                <TextField label="Plot point name" value={beatName} onChange={(event) => setBeatName(event.target.value)} disabled={saving || legacyStory} />
                <TextField label="Optional notes" value={beatDescription} onChange={(event) => setBeatDescription(event.target.value)} multiline minRows={2} disabled={saving || legacyStory} />
                <Box><Button variant="outlined" startIcon={<AddIcon />} onClick={addBeat} disabled={!beatName.trim() || saving || legacyStory}>Add Plot Point</Button></Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">THREATS &amp; TIMING</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1, mt: 0.5 }}>
                  <Typography variant="h2">World Clocks</Typography>
                  <FormControl size="small" sx={{ minWidth: 145 }}>
                    <Select aria-label="Filter world clocks by progress" value={clockProgressFilter} onChange={(event) => setClockProgressFilter(event.target.value as ClockProgressFilter)}>
                      <MenuItem value="all">All clocks</MenuItem>
                      <MenuItem value="not_started">Not started</MenuItem>
                      <MenuItem value="started">Started</MenuItem>
                      <MenuItem value="finished">Finished</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
              <Stack spacing={2}>
                {filteredClocks.length ? filteredClocks.map((clock) => (
                  <Box key={clock.id}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{clock.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{clock.current} of {clock.maximum} · {formatStatusLabel(clock.status)}</Typography>
                        {clock.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{clock.description}</Typography>}
                      </Box>
                      <IconButton aria-label={`Edit clock ${clock.name}`} title="Edit clock" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => startClockEdit(clock)} disabled={saving || legacyStory || (editingClockId !== null && editingClockId !== clock.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton aria-label={`Delete clock ${clock.name}`} title="Delete clock" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => setDeleteTarget({ kind: "clock", id: clock.id, label: clock.name })} disabled={saving || legacyStory}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center", mt: 0.5 }}>
                      {clock.status === "completed" && <Chip size="small" color="success" label="Complete" />}
                      <IconButton aria-label={`Undo one step on ${clock.name}`} title="Undo one step" size="small" onClick={() => updateClock(clock.id, (item) => ({ ...item, current: Math.max(0, item.current - 1), status: item.status === "completed" ? "active" : item.status }))} disabled={saving || legacyStory || editingClockId === clock.id || clock.current <= 0}>
                        <UndoIcon />
                      </IconButton>
                      <IconButton aria-label={clock.status === "paused" ? `Resume ${clock.name}` : `Pause ${clock.name}`} title={clock.status === "paused" ? "Resume" : "Pause"} size="small" onClick={() => updateClock(clock.id, (item) => ({ ...item, status: item.status === "paused" ? "active" : "paused" }))} disabled={saving || legacyStory || editingClockId === clock.id || clock.status === "completed"}>
                        {clock.status === "paused" ? <PlayArrowIcon /> : <PauseIcon />}
                      </IconButton>
                      <IconButton aria-label={`Advance ${clock.name}`} title="Advance one step" size="small" onClick={() => updateClock(clock.id, (item) => ({ ...item, current: Math.min(item.maximum, item.current + 1) }))} disabled={saving || legacyStory || editingClockId === clock.id || clock.status === "paused" || clock.status === "completed" || clock.current >= clock.maximum}>
                        <PlayArrowIcon />
                      </IconButton>
                      <IconButton aria-label={`Reset ${clock.name}`} title="Reset clock" size="small" onClick={() => updateClock(clock.id, (item) => ({ ...item, current: 0, status: "active" }))} disabled={saving || legacyStory || editingClockId === clock.id || (clock.current === 0 && clock.status === "active")}>
                        <RestartAltIcon />
                      </IconButton>
                      <IconButton aria-label={`Complete ${clock.name}`} title="Complete clock" size="small" onClick={() => updateClock(clock.id, (item) => ({ ...item, status: "completed" }))} disabled={saving || legacyStory || editingClockId === clock.id || clock.status === "completed"}>
                        <CheckIcon />
                      </IconButton>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, (clock.current / Math.max(1, clock.maximum)) * 100)} sx={{ mt: 1 }} />
                    {clock.current > 0 && clock.stages?.[clock.current - 1] && <Typography variant="caption" color="text.secondary">{clock.stages[clock.current - 1]}</Typography>}
                    {editingClockId === clock.id && clockDraft ? (
                      <Stack spacing={1} sx={{ mt: 1.25 }}>
                        <TextField label="Clock name" value={clockDraft.name} onChange={(event) => setClockDraft({ ...clockDraft, name: event.target.value })} disabled={saving} />
                        <TextField label="Description" value={clockDraft.description} onChange={(event) => setClockDraft({ ...clockDraft, description: event.target.value })} multiline minRows={2} disabled={saving} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField label="Current step" type="number" slotProps={{ htmlInput: { min: 0 } }} value={clockDraft.current} onChange={(event) => setClockDraft({ ...clockDraft, current: event.target.value })} disabled={saving} />
                          <TextField label="Steps to completion" type="number" slotProps={{ htmlInput: { min: 1 } }} value={clockDraft.maximum} onChange={(event) => setClockDraft({ ...clockDraft, maximum: event.target.value })} disabled={saving} />
                          <FormControl size="small" fullWidth>
                            <Select aria-label="Clock status" value={clockDraft.status} onChange={(event) => setClockDraft({ ...clockDraft, status: event.target.value as WorldClock["status"] })} disabled={saving}>
                              {["active", "paused", "completed"].map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Stack>
                        <TextField label="Stages (one per step, one per line)" value={clockDraft.stages} onChange={(event) => setClockDraft({ ...clockDraft, stages: event.target.value })} multiline minRows={2} disabled={saving} />
                        <TextField label="What happens at completion" value={clockDraft.completion} onChange={(event) => setClockDraft({ ...clockDraft, completion: event.target.value })} multiline minRows={2} disabled={saving} />
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
                          <Button size="small" startIcon={<SaveIcon />} onClick={() => saveClockEdit(clock.id)} disabled={saving || !clockDraft.name.trim()}>Save changes</Button>
                          <Button size="small" startIcon={<CloseIcon />} onClick={() => { setEditingClockId(null); setClockDraft(null); }} disabled={saving}>Cancel</Button>
                        </Stack>
                      </Stack>
                    ) : clock.completion && <Typography variant="caption" color="text.secondary">At the end: {clock.completion}</Typography>}
                  </Box>
                )) : clocks.length ? <Typography color="text.secondary">No clocks match this progress filter.</Typography> : <Typography color="text.secondary">No active clocks. Add one for a threat or event that advances over time.</Typography>}
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Stack spacing={1.25}>
                <TextField label="Clock name" value={clockName} onChange={(event) => setClockName(event.target.value)} disabled={saving || legacyStory} />
                <TextField label="Steps to completion" type="number" value={clockMaximum} slotProps={{ htmlInput: { min: 1 } }} onChange={(event) => setClockMaximum(event.target.value)} disabled={saving || legacyStory} />
                <Box><Button variant="outlined" startIcon={<AddIcon />} onClick={addClock} disabled={!clockName.trim() || saving || legacyStory}>Add Clock</Button></Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">FOLLOW THROUGH</Typography>
              <Typography variant="h2" sx={{ mt: 0.5 }}>Consequences</Typography>
              <Stack spacing={1.25} sx={{ mt: 2 }}>
                {consequences.length ? consequences.map(({ beat, consequence }) => (
                  <Stack key={consequence.id} direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 1, p: 1.25, border: 1, borderColor: "divider", borderRadius: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {editingConsequenceId === consequence.id && consequenceDraft ? (
                        <Stack spacing={1}>
                          <TextField label="Description" value={consequenceDraft.description} onChange={(event) => setConsequenceDraft({ ...consequenceDraft, description: event.target.value })} multiline minRows={2} disabled={saving} />
                          <TextField label="Trigger" value={consequenceDraft.trigger} onChange={(event) => setConsequenceDraft({ ...consequenceDraft, trigger: event.target.value })} disabled={saving} />
                          <TextField label="Player action" value={consequenceDraft.player_action} onChange={(event) => setConsequenceDraft({ ...consequenceDraft, player_action: event.target.value })} disabled={saving} />
                          <TextField label="Timing" value={consequenceDraft.timing} onChange={(event) => setConsequenceDraft({ ...consequenceDraft, timing: event.target.value })} disabled={saving} />
                          <FormControl size="small" fullWidth>
                            <Select aria-label="Consequence status" value={consequenceDraft.status} onChange={(event) => setConsequenceDraft({ ...consequenceDraft, status: event.target.value as StoryConsequence["status"] })} disabled={saving}>
                              {CONSEQUENCE_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <EntityIdMultiSelect label="Leads to plot points or world events" ids={textToList(consequenceDraft.leads_to)} options={[...plotPointOptions, ...worldEventOptions]} onChange={(ids) => setConsequenceDraft({ ...consequenceDraft, leads_to: listToText(ids) })} disabled={saving} />
                          <WorldStoryLinksEditor
                            worldStoryIds={consequenceDraft.world_stories}
                            threadLinks={consequenceDraft.world_story_threads}
                            worldStoryOptions={worldStoryOptions}
                            threadOptions={worldStoryThreadOptions}
                            onChange={(worldStoryIds, threadLinks) => setConsequenceDraft({ ...consequenceDraft, world_stories: worldStoryIds, world_story_threads: threadLinks })}
                            disabled={saving}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button size="small" startIcon={<SaveIcon />} onClick={() => saveConsequenceEdit(beat.id, consequence.id)} disabled={saving || !consequenceDraft.description.trim()}>Save</Button>
                            <Button size="small" startIcon={<CloseIcon />} onClick={() => { setEditingConsequenceId(null); setConsequenceDraft(null); }} disabled={saving}>Cancel</Button>
                          </Stack>
                        </Stack>
                      ) : <>
                        <Typography>{consequence.description}</Typography>
                        <Typography variant="caption" color="text.secondary">From {beat.name}{consequence.timing ? ` · ${consequence.timing}` : ""}</Typography>
                        <WorldStoryReferenceChips worldStoryIds={consequence.world_stories ?? []} threadLinks={consequence.world_story_threads ?? []} stories={worldStories} onOpen={openEntity} />
                        {consequence.leads_to?.map((id) => worldEventOptions.find((event) => event.id === id)).filter((event): event is EntitySummary => Boolean(event)).map((event) => (
                          <Chip key={event.id} size="small" label={event.name} variant="outlined" clickable onClick={() => openEntity(event.id)} sx={{ mt: 0.75, mr: 0.5 }} />
                        ))}
                      </>}
                    </Box>
                    {editingConsequenceId !== consequence.id && <>
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select value={consequence.status} aria-label={`Status for consequence ${consequence.description}`} onChange={(event) => updateConsequenceStatus(beat.id, consequence.id, event.target.value as StoryConsequence["status"])} disabled={saving || legacyStory}>
                          {CONSEQUENCE_STATUSES.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Stack spacing={0} sx={{ alignItems: "flex-end", flex: "0 0 auto" }}>
                        <Stack direction="row" spacing={0.25}>
                          <IconButton aria-label="Edit consequence" title="Edit consequence" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => startConsequenceEdit(consequence)} disabled={saving || legacyStory || (editingConsequenceId !== null && editingConsequenceId !== consequence.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton aria-label={`Delete consequence ${consequence.description}`} title="Delete consequence" size="small" sx={{ width: 36, height: 36, minWidth: 36, flex: "0 0 36px", borderRadius: "50%" }} onClick={() => setDeleteTarget({ kind: "consequence", id: consequence.id, parentBeatId: beat.id, label: consequence.description })} disabled={saving || legacyStory}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <IconButton
                          aria-label={`Create world event from consequence: ${consequence.description}`}
                          title="Create world event"
                          size="small"
                          onClick={() => startWorldEventFromConsequence(beat, consequence)}
                          disabled={saving || creatingWorldEvent || legacyStory}
                          sx={{ width: 36, height: 36, minWidth: 36, borderRadius: "50%", mr: 0.25 }}
                        >
                          <Box sx={{ position: "relative", display: "inline-flex", width: 20, height: 20 }}>
                            <EventIcon fontSize="small" />
                            <AddIcon sx={{ position: "absolute", right: -5, bottom: -3, width: 13, height: 13, borderRadius: "50%", bgcolor: "background.paper", color: "primary.main" }} />
                          </Box>
                        </IconButton>
                      </Stack>
                    </>}
                  </Stack>
                )) : <Typography color="text.secondary">No consequences recorded. Add one once an action has a possible follow-on effect.</Typography>}
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <TextField fullWidth label={currentBeat ? `New consequence for ${currentBeat.name}` : "Set a current beat to add a consequence"} value={consequenceDescription} onChange={(event) => setConsequenceDescription(event.target.value)} disabled={saving || legacyStory || !currentBeat} />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={addConsequence} disabled={!consequenceDescription.trim() || !currentBeat || saving || legacyStory} sx={{ whiteSpace: "nowrap" }}>Add Consequence</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={closeoutOpen} onClose={() => !saving && setCloseoutOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Session closeout</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" action={<Button size="small" onClick={() => { setCloseoutOpen(false); navigate("/world-stories"); }}>Review World Stories</Button>}>
              Review what the party did, connect relevant consequences, and decide whether an action should become a World Event. Nothing advances automatically.
            </Alert>
            {unreviewedActions.length > 0 && (
              <FormControl size="small" sx={{ maxWidth: 260 }}>
                <Select aria-label="Filter closeout actions by session" value={closeoutSessionFilter} onChange={(event) => setCloseoutSessionFilter(event.target.value)}>
                  <MenuItem value="all">All sessions</MenuItem>
                  <MenuItem value="unassigned">Session not set</MenuItem>
                  {closeoutSessions.map((session) => <MenuItem key={session} value={session}>Session {session}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {unreviewedActions.length === 0 ? (
              <Typography color="text.secondary">All logged actions have been reviewed.</Typography>
            ) : closeoutActions.length === 0 ? (
              <Typography color="text.secondary">No unreviewed actions match this session filter.</Typography>
            ) : closeoutActions.map((action) => {
              const draft = closeoutDrafts[action.id] ?? {
                session: action.session === undefined ? "" : String(action.session),
                consequence_ids: action.consequence_ids ?? [],
                world_stories: action.world_stories ?? [],
                world_story_threads: action.world_story_threads ?? [],
              };
              return (
                <Box key={action.id} sx={{ p: 1.75, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                  <Stack spacing={1.25}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{action.description}</Typography>
                      {beats.find((beat) => beat.id === action.story_beat) && <Typography variant="caption" color="text.secondary">During {beats.find((beat) => beat.id === action.story_beat)?.name}</Typography>}
                    </Box>
                    <TextField label="Session (optional)" type="number" value={draft.session} onChange={(event) => setCloseoutDrafts((current) => ({ ...current, [action.id]: { ...draft, session: event.target.value } }))} disabled={saving} />
                    <EntityIdMultiSelect
                      label="Consequences"
                      ids={draft.consequence_ids}
                      options={consequenceOptions}
                      onChange={(consequence_ids) => setCloseoutDrafts((current) => ({ ...current, [action.id]: { ...draft, consequence_ids } }))}
                      disabled={saving}
                    />
                    <WorldStoryLinksEditor
                      worldStoryIds={draft.world_stories}
                      threadLinks={draft.world_story_threads}
                      worldStoryOptions={worldStoryOptions}
                      threadOptions={worldStoryThreadOptions}
                      onChange={(world_stories, world_story_threads) => setCloseoutDrafts((current) => ({ ...current, [action.id]: { ...draft, world_stories, world_story_threads } }))}
                      disabled={saving}
                    />
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        startIcon={<EventIcon />}
                        onClick={async () => {
                          const updatedAction = await saveCloseoutAction(action.id, false);
                          if (updatedAction) {
                            setCloseoutOpen(false);
                            startWorldEventFromAction(updatedAction);
                          }
                        }}
                        disabled={saving || creatingWorldEvent}
                      >Create World Event</Button>
                      <Button size="small" variant="contained" startIcon={<CheckIcon />} onClick={() => void saveCloseoutAction(action.id, true)} disabled={saving}>
                        Mark reviewed
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseoutOpen(false)} disabled={saving}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={worldEventDialogOpen}
        onClose={() => !creatingWorldEvent && setWorldEventDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create World Event from Campaign Story</DialogTitle>
        <DialogContent>
          {worldEventDraft && worldEventSource && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="info">
                <Stack spacing={0.25}>
                  <Typography variant="body2">Created from {campaign?.name}</Typography>
                  {worldEventSource.plotPointId && <Typography variant="body2">Plot point: {beats.find((beat) => beat.id === worldEventSource.plotPointId)?.name}</Typography>}
                  {worldEventSource.actionDescriptions.map((description, index) => <Typography key={`${index}-${description}`} variant="body2">Player action: {description}</Typography>)}
                  {worldEventSource.consequenceDescriptions.map((description, index) => <Typography key={`${index}-${description}`} variant="body2">Consequence: {description}</Typography>)}
                </Stack>
              </Alert>
              <TextField label="Event name" value={worldEventDraft.name} onChange={(event) => setWorldEventDraft({ ...worldEventDraft, name: event.target.value })} disabled={creatingWorldEvent} required />
              <TextField label="What is happening?" value={worldEventDraft.description} onChange={(event) => setWorldEventDraft({ ...worldEventDraft, description: event.target.value })} multiline minRows={3} disabled={creatingWorldEvent} />
              <TextField select label="Status" value={worldEventDraft.status} onChange={(event) => setWorldEventDraft({ ...worldEventDraft, status: event.target.value })} disabled={creatingWorldEvent}>
                {["ongoing", "rumored", "resolved"].map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
              </TextField>
              <EntityIdMultiSelect
                label="Locations involved"
                ids={worldEventDraft.locations}
                options={locationOptions}
                onChange={(locations) => setWorldEventDraft({ ...worldEventDraft, locations })}
                disabled={creatingWorldEvent}
              />
              <EntityIdMultiSelect
                label="Characters involved"
                ids={worldEventDraft.characters}
                options={entities.filter((entity) => entity.entity_type === "npc" || entity.entity_type === "player_character")}
                onChange={(characters) => setWorldEventDraft({ ...worldEventDraft, characters })}
                disabled={creatingWorldEvent}
              />
              <WorldStoryLinksEditor
                worldStoryIds={worldEventDraft.world_stories}
                threadLinks={worldEventDraft.world_story_threads}
                worldStoryOptions={worldStoryOptions}
                threadOptions={worldStoryThreadOptions}
                onChange={(world_stories, world_story_threads) => setWorldEventDraft({ ...worldEventDraft, world_stories, world_story_threads })}
                disabled={creatingWorldEvent}
              />
              <TextField label="DM-only notes" value={worldEventDraft.dm_notes} onChange={(event) => setWorldEventDraft({ ...worldEventDraft, dm_notes: event.target.value })} multiline minRows={2} disabled={creatingWorldEvent} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setWorldEventDialogOpen(false); setWorldEventDraft(null); setWorldEventSource(null); }} disabled={creatingWorldEvent}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveWorldEventFromConsequence()} disabled={creatingWorldEvent || !worldEventDraft?.name.trim()}>
            {creatingWorldEvent ? "Creating…" : "Create World Event"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)}>
        <DialogTitle>Delete {deleteTarget?.kind}?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete “{deleteTarget?.label}”? This cannot be undone.
            {deleteTarget?.kind === "plot point" && " Links to this plot point and its consequences will be removed, and logged actions will be unlinked."}
            {deleteTarget?.kind === "consequence" && " Logged actions linked to this consequence will be unlinked."}
            {deleteTarget?.kind === "player action" && " This action will be removed from the campaign log."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={confirmDelete} disabled={saving}>
            {saving ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <EntityDetailDrawer
        entityId={entityId}
        open={isOpen}
        onClose={closeEntity}
        onOpenEntity={openEntity}
        onBack={goBack}
        canGoBack={canGoBack}
      />
    </Box>
  );
}

export default CampaignDashboardPage;
