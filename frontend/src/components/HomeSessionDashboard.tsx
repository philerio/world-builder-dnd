import { Box, Button, Card, CardContent, Chip, Divider, LinearProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useWorldData } from "../context/WorldDataContext";
import useWorkspacePreferences from "../hooks/useWorkspacePreferences";
import { rememberCampaign, updateWorkspace } from "../utils/workspacePreferences";
import { campaignSessions, campaignWorkspaceUrl, dashboardAttention, selectDashboardCampaign, structuredCampaignStory } from "../utils/sessionDashboard";
import formatStatusLabel from "../utils/formatStatusLabel";
import DashboardQuickCapture from "./DashboardQuickCapture";
import EntityBreadcrumbs from "./EntityBreadcrumbs";
import { entityTypeLabel } from "../utils/entityNavigation";
import type { WorldData } from "../types";

const EMPTY_STORY = { beats: [], player_actions: [], world_clocks: [] };
const preview = { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" } as const;

export default function HomeSessionDashboard({ data, onOpenEntity }: { data: WorldData; onOpenEntity: (id: string) => void }) {
  const { entities, getEntity } = useWorldData();
  const worldId = (data.world ?? data.worlds?.[0])?.id ?? "default";
  const preferences = useWorkspacePreferences(worldId);
  const campaign = selectDashboardCampaign(data.campaigns, preferences.lastCampaignId);
  const story = campaign ? structuredCampaignStory(campaign.story) : null;
  const sessions = campaignSessions(story ?? EMPTY_STORY);
  const attention = dashboardAttention(story ?? EMPTY_STORY);
  const currentBeat = story?.beats.find((beat) => beat.id === story.current_beat);
  const places = entities.filter((entity) => ["city", "location", "region", "kingdom"].includes(entity.entity_type));
  const storedLocation = campaign ? preferences.locations[campaign.id] : undefined;
  const manualLocation = places.find((place) => place.id === storedLocation);
  const location = manualLocation ?? places.find((place) => currentBeat?.locations?.includes(place.id));
  const locationRecord = location ? getEntity(location.id) : undefined;
  const locationData = location && [...data.cities, ...(data.locations ?? []), ...data.regions, ...data.kingdoms].find((place) => place.id === location.id);
  const notes = locationData as { description?: string; details?: string; dm_notes?: string } | undefined;
  const maps = location ? data.maps.filter((map) => map.entity_id === location.id || map.markers.some((marker) => marker.entity_id === location.id)) : [];
  const sceneNpcIds = location && currentBeat?.locations?.includes(location.id) ? currentBeat.npcs ?? [] : [];
  const npcs = location ? data.npcs.filter((npc) => sceneNpcIds.includes(npc.id) || [npc.city, npc.region, npc.kingdom].includes(location.id)) : [];
  const recents = preferences.recentEntityIds.flatMap((id) => {
    const entity = entities.find((item) => item.id === id);
    return entity ? [entity] : [];
  });
  const typeLabel = (id: string, type: string) => entityTypeLabel(type, getEntity(id)?.entity);

  return (
    <Stack spacing={3}>
      <Card component="section" aria-labelledby="resume-campaign-heading">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
            <Box>
              <Typography variant="overline" color="text.secondary">YOUR NEXT SESSION</Typography>
              <Typography id="resume-campaign-heading" variant="h2">{campaign ? "Pick up where you left off" : "Your campaign starts here"}</Typography>
            </Box>
            {campaign && <TextField select label="Dashboard campaign" size="small" value={campaign.id} sx={{ minWidth: { sm: 280 }, maxWidth: { md: 420 } }} onChange={(event) => rememberCampaign(worldId, event.target.value)}>
              {[...data.campaigns].sort((a, b) => a.name.localeCompare(b.name)).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
            </TextField>}
          </Stack>
          {campaign ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="h3">{campaign.name}</Typography>
                  {campaign.status && <Chip size="small" label={formatStatusLabel(campaign.status)} />}
                </Stack>
                {campaign.description && <Typography variant="body2" color="text.secondary" sx={{ ...preview, mt: 1 }}>{campaign.description}</Typography>}
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id)} variant="contained" startIcon={<PlayArrowIcon />}>Resume campaign</Button>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id, "prep", sessions.next)} variant="outlined">Prepare Session {sessions.next}</Button>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id, "session", sessions.live)} variant="outlined">During Session {sessions.live}</Button>
                <Button href="#quick-capture-heading">Quick capture</Button>
              </Stack>
              {currentBeat ? <Box>
                <Typography variant="caption" color="text.secondary">CURRENT PLOT POINT</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{currentBeat.name}</Typography>
                {currentBeat.description && <Typography variant="body2" color="text.secondary" sx={preview}>{currentBeat.description}</Typography>}
              </Box> : <Typography variant="body2" color="text.secondary">No current plot point selected. Open the campaign to choose one when you are ready.</Typography>}
            </Stack>
          ) : <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Add a campaign to organize session preparation, party actions, and consequences. You can capture world ideas below in the meantime.</Typography>
            <Button component={Link} to="/campaigns" variant="contained">Browse campaigns</Button>
          </Box>}
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
        <Card component="section" aria-labelledby="current-location-heading">
          <CardContent>
            <Typography id="current-location-heading" variant="h2" sx={{ mb: 2 }}>Current location</Typography>
            {campaign && <TextField select fullWidth size="small" label="Dashboard location" value={manualLocation?.id ?? ""} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }} onChange={(event) => updateWorkspace(worldId, (current) => ({ ...current, locations: { ...current.locations, [campaign.id]: event.target.value } }))} helperText="This dashboard choice stays in this browser; it does not change campaign canon.">
              <MenuItem value="">Use current plot point</MenuItem>
              {places.map((place) => <MenuItem key={place.id} value={place.id}>{place.name} · {typeLabel(place.id, place.entity_type)}</MenuItem>)}
            </TextField>}
            {location ? <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{manualLocation ? "CHOSEN FOR THIS DASHBOARD" : "LINKED TO THE CURRENT PLOT POINT"}</Typography>
                {locationRecord && <EntityBreadcrumbs record={locationRecord} onOpenEntity={onOpenEntity} />}
                <Typography variant="h3">{location.name}</Typography>
              </Box>
              {notes?.description && <Typography variant="body2" sx={preview}>{notes.description}</Typography>}
              {notes?.details && <Typography variant="body2" color="text.secondary" sx={preview}>{notes.details}</Typography>}
              {notes?.dm_notes && <Box><Typography variant="caption" color="text.secondary">DM NOTES</Typography><Typography variant="body2" sx={preview}>{notes.dm_notes}</Typography></Box>}
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={() => onOpenEntity(location.id)}>Open location details</Button>
                {maps.map((map) => <Button key={map.id} component={Link} to={`/maps?${new URLSearchParams({ map: map.id, focusEntity: location.id })}`} variant="outlined">Open {map.name}</Button>)}
              </Stack>
              {!maps.length && <Typography variant="caption" color="text.secondary">No map is linked to this location yet.</Typography>}
              <Typography variant="subtitle2">Related NPCs</Typography>
              {npcs.length ? <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>{npcs.map((npc) => <Chip key={npc.id} label={npc.name} onClick={() => onOpenEntity(npc.id)} />)}</Stack> : <Typography variant="body2" color="text.secondary">No NPCs recorded for this location.</Typography>}
            </Stack> : <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{campaign ? "No location is linked to the current plot point. Choose one above for quick access to its map and notes." : "Choose a campaign to keep a location and its references here."}</Typography>}
          </CardContent>
        </Card>

        <Card component="section" aria-labelledby="attention-heading">
          <CardContent>
            <Typography id="attention-heading" variant="h2" sx={{ mb: 2 }}>Needs attention</Typography>
            {campaign && story ? <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">{attention.actions.length} unreviewed party actions</Typography>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id, "dashboard", undefined, "actions")} disabled={!attention.actions.length}>Review actions</Button>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{attention.clocks.length} active clocks</Typography>
                <Stack spacing={1.5}>{attention.clocks.slice(0, 3).map((clock) => <Box key={clock.id}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}><Typography variant="body2">{clock.name}</Typography><Typography variant="caption">{clock.current}/{clock.maximum}</Typography></Stack>
                  <LinearProgress aria-label={clock.name} variant="determinate" value={Math.max(0, Math.min(100, clock.current / Math.max(1, clock.maximum) * 100))} sx={{ mt: 0.5 }} />
                </Box>)}</Stack>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id, "dashboard", undefined, "clocks")}>Open clocks</Button>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2">{attention.consequences.length} unresolved consequences</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>{attention.consequences.slice(0, 3).map(({ beat, consequence }) => <Box key={`${beat.id}:${consequence.id}`}><Typography variant="body2" sx={preview}>{consequence.description}</Typography><Typography variant="caption" color="text.secondary">{beat.name} · {formatStatusLabel(consequence.status)}</Typography></Box>)}</Stack>
                <Button component={Link} to={campaignWorkspaceUrl(campaign.id, "dashboard", undefined, "consequences")}>Review consequences</Button>
              </Box>
            </Stack> : <Typography variant="body2" color="text.secondary">{campaign ? "This campaign uses older story content. Open the campaign to review its existing notes." : "Campaign actions, clocks, and consequences will appear here."}</Typography>}
          </CardContent>
        </Card>

        <DashboardQuickCapture key={`${worldId}:${campaign?.id ?? "world"}`} worldId={worldId} campaign={campaign} />

        <Card component="section" aria-labelledby="recent-records-heading">
          <CardContent>
            <Typography id="recent-records-heading" variant="h2" sx={{ mb: 2 }}>Recently opened</Typography>
            {recents.length ? <Stack spacing={1}>
              {recents.map((entity) => <Box key={entity.id} sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}>
                {entity.entity_type === "campaign" ? <Button component={Link} to={campaignWorkspaceUrl(entity.id)} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", minHeight: 44 }}>{entity.name}</Button>
                  : entity.entity_type === "map" ? <Button component={Link} to={`/maps?map=${encodeURIComponent(entity.id)}`} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", minHeight: 44 }}>{entity.name}</Button>
                    : <Button onClick={() => onOpenEntity(entity.id)} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", minHeight: 44 }}>{entity.name}</Button>}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1 }}>{typeLabel(entity.id, entity.entity_type)}</Typography>
              </Box>)}
            </Stack> : <Typography variant="body2" color="text.secondary">Records you open will appear here. This list stays in this browser.</Typography>}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
