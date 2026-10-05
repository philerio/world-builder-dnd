import { useEffect, useState } from "react";
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

import type { WorldData, WorldStory } from "../types";
import formatStatusLabel from "../utils/formatStatusLabel";

export default function WorldStoriesPage() {
  const [stories, setStories] = useState<WorldStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json() as Promise<WorldData>;
      })
      .then((data) => setStories(data.world_stories ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          {loading && <Typography color="text.secondary">Loading world stories…</Typography>}
          {error && <Alert severity="error">Could not load world stories: {error}</Alert>}
          {!loading && !error && stories.length === 0 && (
            <Alert severity="info">
              No world stories yet. Use “New Entity” and choose “World Story” to start an overarching narrative.
            </Alert>
          )}
          <Grid container spacing={2}>
            {stories.map((story) => (
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
