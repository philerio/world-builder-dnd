import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";

import formatStatusLabel from "../utils/formatStatusLabel";
import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import { useWorldData } from "../context/WorldDataContext";
import { matchesEntityTag, sortEntitiesByName } from "../utils/entityTags";

export default function WorldStoriesPage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const stories = sortEntitiesByName(worldData?.world_stories ?? []);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const statuses = [...new Set(stories.map((story) => story.status).filter(Boolean))].sort();
  const storyFilters: DashboardFilter[] = [{
    key: "status",
    label: "Status",
    options: statuses.map((status) => ({ value: status, label: formatStatusLabel(status) })),
  }];
  const search = filters.search?.trim().toLowerCase() ?? "";
  const filteredStories = stories.filter((story) =>
    (!search || [story.name, story.description, story.overview].filter(Boolean).join(" ").toLowerCase().includes(search))
    && (!filters.status || story.status === filters.status)
    && matchesEntityTag(story, filters.tag),
  );

  return (
    <>
      <Stack spacing={3}>
        <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 }, borderBottom: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.15em" }}>
            SETTING-WIDE NARRATIVE
          </Typography>
          <Typography variant="h1" sx={{ mt: 0.5 }}>World Story</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 800 }}>
            Track the larger stories unfolding across campaigns, their active threads, and campaign outcomes that may affect them.
          </Typography>
        </Box>

        <Box sx={{ px: { xs: 3, md: 5 }, pb: 5 }}>
          {worldDataLoading && <Typography color="text.secondary">Loading world stories…</Typography>}
          {worldDataError && <Alert severity="error">Could not load world stories: {worldDataError}</Alert>}
          {!worldDataLoading && !worldDataError && stories.length === 0 && (
            <Alert severity="info">
              No world stories yet. Use “New Entity” and choose “World Story” to start an overarching narrative.
            </Alert>
          )}
          {!worldDataLoading && !worldDataError && stories.length > 0 && (
            <>
              <DashboardFilters
                search={{ label: "Search world stories", placeholder: "Name or overview…" }}
                filters={storyFilters}
                taggedEntities={stories}
                onChange={setFilters}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Showing {filteredStories.length} of {stories.length} world stories
              </Typography>
            </>
          )}
          {!worldDataLoading && !worldDataError && stories.length > 0 && filteredStories.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>No world stories match these filters.</Alert>
          )}
          <Grid container spacing={2}>
            {filteredStories.map((story) => (
              <Grid key={story.id} size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/world-stories/${story.id}`)}>
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                          <AutoAwesomeMotionIcon color="primary" />
                          <Typography variant="h2" sx={{ flex: 1 }}>{story.name}</Typography>
                          <Chip size="small" label={formatStatusLabel(story.status)} />
                        </Stack>
                        <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                          {story.overview || story.description || "Add an overview as this story develops."}
                        </Typography>
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                          <Chip size="small" variant="outlined" label={`${story.threads.length} threads`} />
                          <Chip size="small" variant="outlined" label={`${story.contributions.length} campaign connections`} />
                          <Chip size="small" variant="outlined" label={`${story.world_events.length} world events`} />
                        </Stack>
                        {story.threads.length > 0 && (
                          <Stack spacing={0.75}>
                            <Typography variant="subtitle2">STORY THREADS</Typography>
                            {story.threads.map((thread) => (
                              <Typography key={thread.id} variant="body2" color="text.secondary">
                                {thread.name} · {formatStatusLabel(thread.status)}
                              </Typography>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </>
  );
}
