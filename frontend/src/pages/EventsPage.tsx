import { useEffect, useState } from "react";
import {
    Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import type { TimelineEvent, WorldData, WorldEvent } from "../types";

import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";

type EventCardProps = {
  name: string;
  description?: string;
  chips: string[];
  onOpen: () => void;
};

function EventsPage() {
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } =
    useEntityDrawer();

  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      })
      .then((data: WorldData) => {
        setWorldEvents(data.world_events);
        setTimelineEvents(data.timeline_events);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Typography color="text.secondary">Loading events…</Typography>;
  }

  if (error) {
    return (
      <Typography color="error">Could not load events: {error}</Typography>
    );
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

        <EventSection
          title="World Events"
          events={worldEvents}
          onOpen={openEntity}
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
          events={timelineEvents}
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
    </>
  );
}

function EventSection({
  title,
  events,
  onOpen,
}: {
  title: string;
  events: WorldEvent[] | TimelineEvent[];
  onOpen: (id: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h2">{title}</Typography>

      {events.length === 0 ? (
        <Typography color="text.secondary">
          No events have been added yet.
        </Typography>
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
              chips.push(event.status);
            }

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
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}

function EventCard({ name, description, chips, onOpen }: EventCardProps) {
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
    </Card>
  );
}

export default EventsPage;
