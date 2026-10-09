import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

import type { Campaign, TimelineEvent, WorldEvent } from "../types";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import { useWorldData } from "../context/WorldDataContext";
import useEntityDrawer from "../hooks/useEntityDrawer";
import formatStatusLabel from "../utils/formatStatusLabel";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

type EventCardProps = {
  name: string;
  description?: string;
  chips: string[];
  onOpen: () => void;
  onCreateCampaign?: () => void;
  linkedCampaigns?: Campaign[];
  onOpenCampaign?: (campaignId: string) => void;
  onLinkExistingCampaign?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  reorderingTimeline?: boolean;
};

function EventsPage() {
  const navigate = useNavigate();
  const { createEntity, updateEntity, refreshWorldData, worldData, worldDataLoading, worldDataError } = useWorldData();
  const worldEvents = sortEntitiesByName(worldData?.world_events ?? []);
  const timelineEvents = sortEntitiesByName(worldData?.timeline_events ?? []);
  const campaigns = sortEntitiesByName(worldData?.campaigns ?? []);
  const npcIds = new Set((worldData?.npcs ?? []).map((character) => character.id));
  const playerCharacterIds = new Set((worldData?.player_characters ?? []).map((character) => character.id));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [campaignSource, setCampaignSource] = useState<WorldEvent | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignOverview, setCampaignOverview] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("planned");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [eventToLink, setEventToLink] = useState<WorldEvent | null>(null);
  const [linkTargetCampaignId, setLinkTargetCampaignId] = useState("");
  const [linkingCampaign, setLinkingCampaign] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [reorderingTimeline, setReorderingTimeline] = useState(false);
  const [timelineOrderError, setTimelineOrderError] = useState<string | null>(null);

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  if (worldDataLoading) {
    return <Typography color="text.secondary">Loading events…</Typography>;
  }

  if (worldDataError) {
    return (
      <Typography color="error">Could not load events: {worldDataError}</Typography>
    );
  }

  const allEvents = [...worldEvents, ...timelineEvents];
  const places = sortEntitiesByName([
    ...(worldData?.cities ?? []).map((place) => ({ id: place.id, name: place.name })),
    ...(worldData?.locations ?? []).map((place) => ({ id: place.id, name: place.name })),
  ]);
  const characters = sortEntitiesByName([...(worldData?.npcs ?? []), ...(worldData?.player_characters ?? [])]);
  const worldStories = sortEntitiesByName(worldData?.world_stories ?? []);
  const uniqueValues = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  const eventFilters: DashboardFilter[] = [
    {
      key: "recordType",
      label: "Record type",
      options: [
        { value: "world_event", label: "World Event" },
        { value: "timeline_event", label: "Timeline Event" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: uniqueValues(allEvents.map((event) => "status" in event ? event.status : undefined))
        .map((status) => ({ value: status, label: formatStatusLabel(status) })),
    },
    {
      key: "type",
      label: "Event type",
      options: uniqueValues(worldEvents.map((event) => event.type))
        .map((type) => ({ value: type, label: formatStatusLabel(type) })),
    },
    {
      key: "era",
      label: "Era",
      options: uniqueValues(timelineEvents.map((event) => event.era))
        .map((era) => ({ value: era, label: era })),
    },
    {
      key: "datePrecision",
      label: "Date precision",
      options: uniqueValues(timelineEvents.map((event) => event.date_precision))
        .map((precision) => ({ value: precision, label: formatStatusLabel(precision) })),
    },
    {
      key: "campaign",
      label: "Campaign",
      options: campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name })),
    },
    {
      key: "location",
      label: "Location",
      options: places.map((place) => ({ value: place.id, label: place.name })),
    },
    {
      key: "character",
      label: "Character",
      options: characters.map((character) => ({ value: character.id, label: character.name })),
    },
    {
      key: "worldStory",
      label: "World Story",
      options: worldStories.map((story) => ({ value: story.id, label: story.name })),
    },
  ];
  const search = filters.search?.trim().toLowerCase() ?? "";
  const filterEvent = (event: WorldEvent | TimelineEvent) => {
    const recordType = "potential_campaign" in event ? "world_event" : "timeline_event";
    const status = "status" in event ? event.status : undefined;
    const type = "type" in event ? event.type : undefined;
    const searchableText = [event.name, event.description, status, type, "era" in event ? event.era : undefined, "date" in event ? event.date : undefined, "date_start" in event ? event.date_start : undefined, "date_end" in event ? event.date_end : undefined]
      .filter(Boolean).join(" ").toLowerCase();
    return (!search || searchableText.includes(search))
      && (!filters.recordType || recordType === filters.recordType)
      && (!filters.status || status === filters.status)
      && (!filters.type || type === filters.type)
      && (!filters.era || ("era" in event && event.era === filters.era))
      && (!filters.datePrecision || ("date_precision" in event && event.date_precision === filters.datePrecision))
      && (!filters.campaign || event.campaigns.includes(filters.campaign))
      && (!filters.location || event.locations.includes(filters.location))
      && (!filters.character || event.characters.includes(filters.character))
      && (!filters.worldStory || event.world_stories.includes(filters.worldStory))
      && matchesEntityTag(event, filters.tag);
  };
  const filteredWorldEvents = worldEvents.filter(filterEvent);
  const filteredTimelineEvents = timelineEvents.filter(filterEvent);

  async function moveTimelineEvent(eventId: string, direction: -1 | 1) {
    const event = timelineEvents.find((item) => item.id === eventId);
    if (!event || timelineDateKey(event) !== null || reorderingTimeline) return;
    const eraEvents = orderTimelineEvents(timelineEvents.filter(
      (item) => timelineEra(item) === timelineEra(event) && timelineDateKey(item) === null,
    ));
    const currentIndex = eraEvents.findIndex((item) => item.id === eventId);
    const adjacent = eraEvents[currentIndex + direction];
    if (!adjacent) return;

    const reorderedEvents = [...eraEvents];
    [reorderedEvents[currentIndex], reorderedEvents[currentIndex + direction]] = [
      reorderedEvents[currentIndex + direction],
      reorderedEvents[currentIndex],
    ];
    const needsInitialOrder = eraEvents.some(
      (item) => typeof item.chronology_order !== "number",
    );
    const updates = needsInitialOrder
      ? reorderedEvents.map((item, index) => ({
          ...item,
          chronology_order: index * 100,
        }))
      : (() => {
          const orderValues = getTimelineOrderValues(eraEvents);
          return [
            { ...event, chronology_order: orderValues.get(adjacent.id) },
            { ...adjacent, chronology_order: orderValues.get(event.id) },
          ];
        })();

    setReorderingTimeline(true);
    setTimelineOrderError(null);
    try {
      for (const update of updates) {
        await updateEntity(update.id, update);
      }
    } catch (error) {
      setTimelineOrderError(error instanceof Error ? error.message : "Could not reorder timeline events.");
      await refreshWorldData();
    } finally {
      setReorderingTimeline(false);
    }
  }

  return (
    <>
      <Stack spacing={4}>
        <Box
          sx={{
            px: { xs: 3, md: 5 },
            py: { xs: 4, md: 5 },
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: "0.15em" }}
          >
            WORLD
          </Typography>

          <Typography variant="h1" sx={{ mt: 0.5 }}>
            Events
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Historical events and major developments in the world.
          </Typography>
        </Box>

        <Box sx={{ px: { xs: 3, md: 5 } }}>
          <DashboardFilters
            search={{ label: "Search events", placeholder: "Name, description, date, or era…" }}
            filters={eventFilters}
            taggedEntities={allEvents}
            onChange={setFilters}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: -2, mb: 1 }}>
            Showing {filteredWorldEvents.length + filteredTimelineEvents.length} of {allEvents.length} events
          </Typography>
        </Box>
        <EventSection
          title="World Events"
          events={filteredWorldEvents}
          emptyMessage={worldEvents.length === 0 ? "No events have been added yet." : "No world events match these filters."}
          campaigns={campaigns}
          onOpen={openEntity}
          onCreateCampaign={openCampaignDialog}
          onOpenCampaign={(id) => navigate(`/campaigns/${id}`)}
          onLinkExistingCampaign={openLinkDialog}
        />

        <Box sx={{ my: 5 }}>
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
            }}
          />
        </Box>
        <EventSection
          title="Timeline"
          events={filteredTimelineEvents}
          emptyMessage={timelineEvents.length === 0 ? "No events have been added yet." : "No timeline events match these filters."}
          campaigns={campaigns}
          onOpen={openEntity}
          groupByEra
          allTimelineEvents={timelineEvents}
          onMoveTimelineEvent={(id, direction) => void moveTimelineEvent(id, direction)}
          reorderingTimeline={reorderingTimeline}
          timelineHelp="Events are grouped by era. Dated events sort by date; use the arrows to order undated events within their era."
        />
        {timelineOrderError && <Alert severity="error" sx={{ mx: { xs: 3, md: 5 } }}>{timelineOrderError}</Alert>}
      </Stack>

      <EntityDetailDrawer
        entityId={entityId}
        open={isOpen}
        onClose={closeEntity}
        onOpenEntity={openEntity}
        onBack={goBack}
        canGoBack={canGoBack}
      />

      <Dialog
        open={campaignSource !== null}
        onClose={closeCampaignDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create campaign from world event</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This creates a campaign with an opening Plot Point based on
            “{campaignSource?.name}”.
            The world event stays in the world and will link to the campaign.
          </DialogContentText>
          {conversionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {conversionError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label="Campaign name"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              disabled={creatingCampaign || createdCampaignId !== null}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Overview"
              value={campaignOverview}
              onChange={(event) => setCampaignOverview(event.target.value)}
              disabled={creatingCampaign || createdCampaignId !== null}
            />
            <FormControl fullWidth>
              <InputLabel id="new-campaign-status-label">Status</InputLabel>
              <Select
                labelId="new-campaign-status-label"
                label="Status"
                value={campaignStatus}
                onChange={(event) => setCampaignStatus(event.target.value)}
                disabled={creatingCampaign || createdCampaignId !== null}
              >
                {["planned", "active", "paused", "completed"].map((status) => (
                  <MenuItem key={status} value={status}>
                    {formatStatusLabel(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeCampaignDialog} disabled={creatingCampaign}>
            Cancel
          </Button>
          {createdCampaignId && (
            <Button onClick={() => navigate(`/campaigns/${createdCampaignId}`)}>
              Open campaign
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => void createCampaignFromEvent()}
            disabled={!campaignName.trim() || creatingCampaign}
            startIcon={creatingCampaign ? <CircularProgress size={16} /> : undefined}
          >
            {createdCampaignId ? "Retry event link" : "Create campaign"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={eventToLink !== null}
        onClose={closeLinkDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add world event to campaign</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            “{eventToLink?.name}” will remain a world event and appear in the
            selected campaign’s references.
          </DialogContentText>
          {linkError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {linkError}
            </Alert>
          )}
          {eventToLink && availableCampaignsForEvent(eventToLink).length > 0 ? (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="link-event-campaign-label">Campaign</InputLabel>
              <Select
                labelId="link-event-campaign-label"
                label="Campaign"
                value={linkTargetCampaignId}
                onChange={(event) => setLinkTargetCampaignId(event.target.value)}
                disabled={linkingCampaign}
              >
                {availableCampaignsForEvent(eventToLink).map((campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {`${campaign.name} (${formatStatusLabel(campaign.status ?? "planned")})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              This event is already linked to every campaign, or no campaigns exist yet.
              You can still create a new campaign from the event card.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeLinkDialog} disabled={linkingCampaign}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void linkEventToCampaign()}
            disabled={!linkTargetCampaignId || linkingCampaign}
            startIcon={linkingCampaign ? <CircularProgress size={16} /> : undefined}
          >
            Add to campaign
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  function openCampaignDialog(event: WorldEvent) {
    setCampaignSource(event);
    setCampaignName(event.name);
    setCampaignOverview(event.description ?? "");
    setCampaignStatus("planned");
    setConversionError(null);
    setCreatedCampaignId(null);
  }

  function closeCampaignDialog() {
    if (creatingCampaign) return;
    setCampaignSource(null);
    setConversionError(null);
    setCreatedCampaignId(null);
  }

  function availableCampaignsForEvent(event: WorldEvent) {
    const linkedIds = new Set(event.campaigns ?? []);
    return campaigns.filter((campaign) => !linkedIds.has(campaign.id));
  }

  function openLinkDialog(event: WorldEvent) {
    const availableCampaigns = availableCampaignsForEvent(event);
    setEventToLink(event);
    setLinkTargetCampaignId(availableCampaigns[0]?.id ?? "");
    setLinkError(null);
  }

  function closeLinkDialog() {
    if (linkingCampaign) return;
    setEventToLink(null);
    setLinkTargetCampaignId("");
    setLinkError(null);
  }

  async function linkEventToCampaign() {
    if (!eventToLink || !linkTargetCampaignId) return;
    setLinkingCampaign(true);
    setLinkError(null);
    const linkedCampaigns = [
      ...new Set([...(eventToLink.campaigns ?? []), linkTargetCampaignId]),
    ];
    try {
      await updateEntity(eventToLink.id, {
        ...eventToLink,
        campaigns: linkedCampaigns,
        potential_campaign: false,
      });
      setEventToLink(null);
      setLinkTargetCampaignId("");
    } catch (linkingError) {
      setLinkError(
        linkingError instanceof Error
          ? linkingError.message
          : "Could not add the event to the campaign.",
      );
    } finally {
      setLinkingCampaign(false);
    }
  }

  async function createCampaignFromEvent() {
    if (!campaignSource || !campaignName.trim()) return;

    setCreatingCampaign(true);
    setConversionError(null);
    let campaignWasCreated = createdCampaignId !== null;
    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const npcs = campaignSource.characters.filter((id) => npcIds.has(id));
        const playerCharacters = campaignSource.characters.filter((id) =>
          playerCharacterIds.has(id),
        );
        const openingBeatId = `opening-${campaignSource.id}`;
        const created = await createEntity("campaign", {
          name: campaignName.trim(),
          description: campaignOverview.trim() || undefined,
          overview: campaignOverview.trim() || undefined,
          status: campaignStatus,
          locations: campaignSource.locations,
          npcs,
          player_characters: playerCharacters,
          story: {
            beats: [
              {
                id: openingBeatId,
                name: campaignName.trim(),
                description: campaignSource.description,
                status: "planned",
                order: 0,
                locations: campaignSource.locations,
                npcs,
                player_characters: playerCharacters,
                world_events: [campaignSource.id],
                world_stories: campaignSource.world_stories,
                world_story_threads: campaignSource.world_story_threads,
              },
            ],
            current_beat: openingBeatId,
            player_actions: [],
            session_recaps: [],
            world_clocks: [],
          },
        });
        campaignId = created.id;
        campaignWasCreated = true;
        setCreatedCampaignId(campaignId);
      }

      const linkedCampaigns = [
        ...new Set([...(campaignSource.campaigns ?? []), campaignId]),
      ];
      await updateEntity(campaignSource.id, {
        ...campaignSource,
        campaigns: linkedCampaigns,
        potential_campaign: false,
      });
      navigate(`/campaigns/${campaignId}`);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Could not create the campaign.";
      setConversionError(
        campaignWasCreated
          ? `The campaign exists, but the world event could not be linked. ${message}`
          : message,
      );
    } finally {
      setCreatingCampaign(false);
    }
  }
}

function timelineEra(event: TimelineEvent) {
  return event.era?.trim() || "Era not set";
}

function timelineDateKey(event: TimelineEvent) {
  if (event.date_start && event.date_precision === "unknown") return null;
  const value = event.date_start || event.date || "";
  const match = /^(-?\d{1,6})(?:-(\d{2})-(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 1), Number(match[3] ?? 1)] as const;
}

function compareDateKeys(left: readonly number[], right: readonly number[]) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function timelineDateLabel(event: TimelineEvent) {
  if (event.date_start && event.date_end) return `${event.date_start} – ${event.date_end}`;
  return event.date_start || event.date;
}

function getTimelineOrderValues(events: TimelineEvent[]) {
  const alphabeticalEvents = [...events].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
  const defaultOrder = new Map(
    alphabeticalEvents.map((event, index) => [event.id, index * 100]),
  );

  return new Map(
    events.map((event) => [
      event.id,
      typeof event.chronology_order === "number"
        ? event.chronology_order
        : defaultOrder.get(event.id) ?? 0,
    ]),
  );
}

function orderTimelineEvents(events: TimelineEvent[]) {
  const orderValues = getTimelineOrderValues(events);
  const datedEvents = events.filter((event) => timelineDateKey(event) !== null).sort((left, right) => {
    const dateOrder = compareDateKeys(timelineDateKey(left)!, timelineDateKey(right)!);
    if (dateOrder !== 0) return dateOrder;
    const orderDifference = (orderValues.get(left.id) ?? 0) - (orderValues.get(right.id) ?? 0);
    return orderDifference || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
  const undatedEvents = events.filter((event) => timelineDateKey(event) === null).sort((left, right) => {
    const orderDifference = (orderValues.get(left.id) ?? 0) - (orderValues.get(right.id) ?? 0);
    return orderDifference || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
  return [...datedEvents, ...undatedEvents];
}

function groupTimelineEvents(events: TimelineEvent[]) {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const era = timelineEra(event);
    groups.set(era, [...(groups.get(era) ?? []), event]);
  }

  return [...groups.entries()]
    .map(([era, eraEvents]) => ({ era, events: orderTimelineEvents(eraEvents) }))
    .sort((left, right) => {
      if (left.era === "Era not set") return 1;
      if (right.era === "Era not set") return -1;
      return left.era.localeCompare(right.era, undefined, { sensitivity: "base" });
    });
}

function EventSection({
  title,
  events,
  emptyMessage,
  campaigns,
  onOpen,
  onCreateCampaign,
  onOpenCampaign,
  onLinkExistingCampaign,
  groupByEra = false,
  allTimelineEvents = [],
  onMoveTimelineEvent,
  reorderingTimeline = false,
  timelineHelp,
}: {
  title: string;
  events: WorldEvent[] | TimelineEvent[];
  emptyMessage: string;
  campaigns: Campaign[];
  onOpen: (id: string) => void;
  onCreateCampaign?: (event: WorldEvent) => void;
  onOpenCampaign?: (campaignId: string) => void;
  onLinkExistingCampaign?: (event: WorldEvent) => void;
  groupByEra?: boolean;
  allTimelineEvents?: TimelineEvent[];
  onMoveTimelineEvent?: (eventId: string, direction: -1 | 1) => void;
  reorderingTimeline?: boolean;
  timelineHelp?: string;
}) {
  const renderEventCard = (
    event: WorldEvent | TimelineEvent,
    movement?: { canMoveUp: boolean; canMoveDown: boolean },
  ) => {
    const chips: string[] = [];

    if ("era" in event && event.era) chips.push(event.era);
    if ("date" in event && event.date) chips.push(event.date);
    else if ("date_start" in event && timelineDateLabel(event)) chips.push(timelineDateLabel(event)!);
    if ("type" in event && event.type) chips.push(event.type);
    if ("status" in event && event.status) chips.push(formatStatusLabel(event.status));

    const isWorldEvent = "potential_campaign" in event;
    const linkedCampaigns = isWorldEvent
      ? campaigns.filter((campaign) => event.campaigns?.includes(campaign.id))
      : [];

    return (
      <Grid key={event.id} size={{ xs: 12, md: 6, lg: 4 }}>
        <EventCard
          name={event.name}
          description={event.description}
          chips={chips}
          onOpen={() => onOpen(event.id)}
          linkedCampaigns={linkedCampaigns}
          onOpenCampaign={onOpenCampaign}
          onCreateCampaign={
            isWorldEvent && onCreateCampaign
              ? () => onCreateCampaign(event)
              : undefined
          }
          onLinkExistingCampaign={
            isWorldEvent && onLinkExistingCampaign
              ? () => onLinkExistingCampaign(event)
              : undefined
          }
          onMoveUp={movement?.canMoveUp && onMoveTimelineEvent
            ? () => onMoveTimelineEvent(event.id, -1)
            : undefined}
          onMoveDown={movement?.canMoveDown && onMoveTimelineEvent
            ? () => onMoveTimelineEvent(event.id, 1)
            : undefined}
          reorderingTimeline={reorderingTimeline}
        />
      </Grid>
    );
  };

  const timelineGroups = groupByEra
    ? groupTimelineEvents(events as TimelineEvent[])
    : [];

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{title}</Typography>
      {timelineHelp && <Typography variant="body2" color="text.secondary">{timelineHelp}</Typography>}

      {events.length === 0 ? (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      ) : groupByEra ? (
        <Stack spacing={3}>
          {timelineGroups.map(({ era, events: eraEvents }) => {
            const fullEraEvents = orderTimelineEvents(
              allTimelineEvents.filter((event) => timelineEra(event) === era),
            );
            return (
              <Stack key={era} spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="h3">{era}</Typography>
                  <Chip size="small" label={eraEvents.length} />
                </Stack>
                <Grid container spacing={2}>
          {eraEvents.map((event) => {
                    const manuallyOrdered = fullEraEvents.filter((item) => timelineDateKey(item) === null);
                    const index = timelineDateKey(event) === null
                      ? manuallyOrdered.findIndex((item) => item.id === event.id)
                      : -1;
                    return renderEventCard(event, {
                      canMoveUp: index > 0,
                      canMoveDown: index >= 0 && index < manuallyOrdered.length - 1,
                    });
                  })}
                </Grid>
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {events.map((event) => renderEventCard(event))}
        </Grid>
      )}
    </Stack>
  );
}

function EventCard({
  name,
  description,
  chips,
  onOpen,
  onCreateCampaign,
  linkedCampaigns = [],
  onOpenCampaign,
  onLinkExistingCampaign,
  onMoveUp,
  onMoveDown,
  reorderingTimeline,
}: EventCardProps) {
  return (
    <Card>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h2" sx={{ fontSize: "1.2rem" }}>
              {name}
            </Typography>

            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                {description}
              </Typography>
            )}

            {chips.length > 0 && (
              <Stack
                direction="row"
                sx={{
                  gap: 0.75,
                  flexWrap: "wrap",
                }}
              >
                {chips.map((chip) => (
                  <Chip key={chip} size="small" label={chip} />
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
      {(onCreateCampaign ||
        onLinkExistingCampaign ||
        linkedCampaigns.length > 0 ||
        onMoveUp ||
        onMoveDown) && (
        <CardActions
          sx={{
            px: 2,
            pt: 0,
            pb: 1.5,
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
          {(onMoveUp || onMoveDown) && (
            <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
              <Tooltip title="Move earlier in this era">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Move ${name} earlier in its era`}
                    disabled={!onMoveUp || reorderingTimeline}
                    onClick={onMoveUp}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move later in this era">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Move ${name} later in its era`}
                    disabled={!onMoveDown || reorderingTimeline}
                    onClick={onMoveDown}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
          {linkedCampaigns.map((campaign) => (
            <Chip
              key={campaign.id}
              size="small"
              variant="outlined"
              label={campaign.name}
              clickable={Boolean(onOpenCampaign)}
              onClick={() => onOpenCampaign?.(campaign.id)}
            />
          ))}
          {onLinkExistingCampaign && (
            <Button size="small" onClick={onLinkExistingCampaign}>
              Add to campaign
            </Button>
          )}
          {onCreateCampaign && (
            <Button size="small" onClick={onCreateCampaign}>
              Create campaign
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}

export default EventsPage;
