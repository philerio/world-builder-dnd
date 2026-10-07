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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { Campaign, TimelineEvent, WorldEvent } from "../types";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import { useWorldData } from "../context/WorldDataContext";
import useEntityDrawer from "../hooks/useEntityDrawer";
import formatStatusLabel from "../utils/formatStatusLabel";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";

type EventCardProps = {
  name: string;
  description?: string;
  chips: string[];
  onOpen: () => void;
  onCreateCampaign?: () => void;
  linkedCampaigns?: Campaign[];
  onOpenCampaign?: (campaignId: string) => void;
  onLinkExistingCampaign?: () => void;
};

function EventsPage() {
  const navigate = useNavigate();
  const { createEntity, updateEntity, worldData, worldDataLoading, worldDataError } = useWorldData();
  const worldEvents = worldData?.world_events ?? [];
  const timelineEvents = worldData?.timeline_events ?? [];
  const campaigns = worldData?.campaigns ?? [];
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
      key: "campaign",
      label: "Campaign",
      options: campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name })),
    },
  ];
  const search = filters.search?.trim().toLowerCase() ?? "";
  const filterEvent = (event: WorldEvent | TimelineEvent) => {
    const recordType = "potential_campaign" in event ? "world_event" : "timeline_event";
    const status = "status" in event ? event.status : undefined;
    const type = "type" in event ? event.type : undefined;
    const searchableText = [event.name, event.description, status, type, "era" in event ? event.era : undefined, "date" in event ? event.date : undefined]
      .filter(Boolean).join(" ").toLowerCase();
    return (!search || searchableText.includes(search))
      && (!filters.recordType || recordType === filters.recordType)
      && (!filters.status || status === filters.status)
      && (!filters.type || type === filters.type)
      && (!filters.campaign || event.campaigns.includes(filters.campaign));
  };
  const filteredWorldEvents = worldEvents.filter(filterEvent);
  const filteredTimelineEvents = timelineEvents.filter(filterEvent);

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
        />
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

function EventSection({
  title,
  events,
  emptyMessage,
  campaigns,
  onOpen,
  onCreateCampaign,
  onOpenCampaign,
  onLinkExistingCampaign,
}: {
  title: string;
  events: WorldEvent[] | TimelineEvent[];
  emptyMessage: string;
  campaigns: Campaign[];
  onOpen: (id: string) => void;
  onCreateCampaign?: (event: WorldEvent) => void;
  onOpenCampaign?: (campaignId: string) => void;
  onLinkExistingCampaign?: (event: WorldEvent) => void;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h2">{title}</Typography>

      {events.length === 0 ? (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      ) : (
        <Grid container spacing={2}>
          {events.map((event) => {
            const chips: string[] = [];

            if ("era" in event && event.era) {
              chips.push(event.era);
            }

            if ("date" in event && event.date) {
              chips.push(event.date);
            }

            if ("type" in event && event.type) {
              chips.push(event.type);
            }

            if ("status" in event && event.status) {
              chips.push(formatStatusLabel(event.status));
            }

            const isWorldEvent = "potential_campaign" in event;
            const linkedCampaigns = isWorldEvent
              ? campaigns.filter((campaign) =>
                  event.campaigns?.includes(campaign.id),
                )
              : [];

            return (
              <Grid
                key={event.id}
                size={{
                  xs: 12,
                  md: 6,
                  lg: 4,
                }}
              >
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
                />
              </Grid>
            );
          })}
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
        linkedCampaigns.length > 0) && (
        <CardActions
          sx={{
            px: 2,
            pt: 0,
            pb: 1.5,
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
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
