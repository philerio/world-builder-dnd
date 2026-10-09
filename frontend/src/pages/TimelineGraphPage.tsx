import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

import DashboardFilters, { type DashboardFilter } from "../components/filters/DashboardFilters";
import EntityDetailDrawer from "../components/EntityDetailDrawer";
import useEntityDrawer from "../hooks/useEntityDrawer";
import { useWorldData } from "../context/WorldDataContext";
import type { TimelineEvent, WorldEvent } from "../types";
import { matchesEntityTag } from "../utils/entityTags";

type EventNode = {
  id: string;
  name: string;
  description?: string;
  kind: "Timeline Event" | "World Event";
  group: string;
  dateLabel?: string;
  color: string;
  x: number;
  y: number;
};

type EventEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  related: boolean;
  provenance: boolean;
};

const NODE_WIDTH = 286;
const NODE_HEIGHT = 112;
const LANE_WIDTH = 350;
const ROW_HEIGHT = 145;
const EMPTY_TIMELINE_EVENTS: TimelineEvent[] = [];
const EMPTY_WORLD_EVENTS: WorldEvent[] = [];

function cardEdgePoint(from: EventNode, to: EventNode) {
  const fromCenter = { x: from.x + NODE_WIDTH / 2, y: from.y + NODE_HEIGHT / 2 };
  const toCenter = { x: to.x + NODE_WIDTH / 2, y: to.y + NODE_HEIGHT / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const scale = Math.min(
    (NODE_WIDTH / 2) / Math.max(Math.abs(dx), 0.001),
    (NODE_HEIGHT / 2) / Math.max(Math.abs(dy), 0.001),
  );
  return {
    from: { x: fromCenter.x + dx * scale, y: fromCenter.y + dy * scale },
    to: { x: toCenter.x - dx * scale, y: toCenter.y - dy * scale },
  };
}

function getEra(event: TimelineEvent) {
  return event.era?.trim() || "Era not set";
}

function dateKey(event: TimelineEvent) {
  if (event.date_start && event.date_precision === "unknown") return null;
  const value = event.date_start || event.date || "";
  const match = /^(-?\d{1,6})(?:-(\d{2})-(\d{2}))?$/.exec(value.trim());
  return match
    ? [Number(match[1]), Number(match[2] ?? 1), Number(match[3] ?? 1)]
    : null;
}

function compareTimelineEvents(left: TimelineEvent, right: TimelineEvent) {
  const leftDate = dateKey(left);
  const rightDate = dateKey(right);
  if (leftDate && rightDate) {
    for (let index = 0; index < 3; index += 1) {
      const difference = (leftDate[index] ?? 0) - (rightDate[index] ?? 0);
      if (difference !== 0) return difference;
    }
  } else if (leftDate) {
    return -1;
  } else if (rightDate) {
    return 1;
  }
  return (left.chronology_order ?? Number.MAX_SAFE_INTEGER) - (right.chronology_order ?? Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function eventDateLabel(event: TimelineEvent) {
  if (event.date_start && event.date_end) return `${event.date_start} – ${event.date_end}`;
  return event.date_start || event.date;
}

export default function TimelineGraphPage() {
  const { worldData, worldDataLoading, worldDataError } = useWorldData();
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } = useEntityDrawer();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const timelineEvents = worldData?.timeline_events ?? EMPTY_TIMELINE_EVENTS;
  const worldEvents = worldData?.world_events ?? EMPTY_WORLD_EVENTS;
  const allRecords = [...timelineEvents, ...worldEvents];
  const eraOptions = [...new Set(timelineEvents.map(getEra))]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
    .map((era) => ({ value: era, label: era }));
  const graphFilters: DashboardFilter[] = [
    { key: "era", label: "Era", options: eraOptions },
    {
      key: "recordType",
      label: "Record type",
      options: [
        { value: "timeline_event", label: "Timeline Event" },
        { value: "world_event", label: "World Event" },
      ],
    },
  ];

  const { nodes, edges, canvasWidth, canvasHeight } = useMemo(() => {
    const query = filters.search?.trim().toLocaleLowerCase() ?? "";
    const filteredTimeline = timelineEvents.filter((event) =>
      (!filters.era || getEra(event) === filters.era)
      && (!filters.recordType || filters.recordType === "timeline_event")
      && matchesEntityTag(event, filters.tag)
      && (!query || `${event.name} ${event.description ?? ""} ${event.era ?? ""} ${event.date ?? ""}`.toLocaleLowerCase().includes(query)),
    );
    const filteredWorld = worldEvents.filter((event) =>
      !filters.era
      && (!filters.recordType || filters.recordType === "world_event")
      && matchesEntityTag(event, filters.tag)
      && (!query || `${event.name} ${event.description ?? ""}`.toLocaleLowerCase().includes(query)),
    );
    const grouped = new Map<string, (TimelineEvent | WorldEvent)[]>();
    for (const event of filteredTimeline) {
      const era = getEra(event);
      grouped.set(era, [...(grouped.get(era) ?? []), event]);
    }
    if (filteredWorld.length) grouped.set("Current World Events", filteredWorld);

    const orderedGroups = [...grouped.entries()].sort(([left], [right]) => {
      if (left === "Current World Events") return 1;
      if (right === "Current World Events") return -1;
      if (left === "Era not set") return 1;
      if (right === "Era not set") return -1;
      return left.localeCompare(right, undefined, { sensitivity: "base" });
    });

    const positionedNodes: EventNode[] = [];
    orderedGroups.forEach(([group, records], groupIndex) => {
      const orderedRecords = [...records].sort((left, right) => {
        if ("chronology_order" in left && "chronology_order" in right) {
          return compareTimelineEvents(left, right);
        }
        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      });
      orderedRecords.forEach((record, rowIndex) => {
        const isTimeline = "era" in record;
        positionedNodes.push({
          id: record.id,
          name: record.name,
          description: record.description,
          kind: isTimeline ? "Timeline Event" : "World Event",
          group,
          dateLabel: isTimeline ? eventDateLabel(record) : undefined,
          color: isTimeline ? "primary.main" : "info.main",
          x: groupIndex * LANE_WIDTH + 28,
          y: rowIndex * ROW_HEIGHT + 72,
        });
      });
    });

    const includedIds = new Set(positionedNodes.map((node) => node.id));
    const edgeMap = new Map<string, EventEdge>();
    const addEdge = (from: string, to: string, label: string, related = false, provenance = false) => {
      if (!includedIds.has(from) || !includedIds.has(to) || from === to) return;
      if (related && from.localeCompare(to) > 0) [from, to] = [to, from];
      const id = `${from}:${to}:${label}`;
      if (!edgeMap.has(id)) edgeMap.set(id, { id, from, to, label, related, provenance });
    };

    for (const event of timelineEvents) {
      for (const link of event.event_links ?? []) {
        if (link.relationship === "caused_by") addEdge(link.event_id, event.id, "Caused by");
        if (link.relationship === "leads_to") addEdge(event.id, link.event_id, "Leads to");
        if (link.relationship === "related_to") addEdge(event.id, link.event_id, "Related", true);
      }
      if (event.source_world_event_id) addEdge(event.source_world_event_id, event.id, "Recorded as", false, true);
    }
    for (const event of worldEvents) {
      for (const causeId of event.caused_by ?? []) addEdge(causeId, event.id, "Caused by");
      for (const causeId of event.true_causes ?? []) addEdge(causeId, event.id, "True cause");
      for (const relatedId of event.hidden_connections ?? []) addEdge(event.id, relatedId, "Hidden connection", true);
      if (event.timeline_event_id) addEdge(event.id, event.timeline_event_id, "Recorded as", false, true);
    }

    // Ignore links whose target is not part of the filtered graph.
    const eventNodes = new Map(positionedNodes.map((node) => [node.id, node]));
    const validEdges = [...edgeMap.values()].filter((edge) => eventNodes.has(edge.from) && eventNodes.has(edge.to));
    const maxRows = Math.max(1, ...orderedGroups.map(([, records]) => records.length));
    return {
      nodes: positionedNodes,
      edges: validEdges,
      canvasWidth: Math.max(700, orderedGroups.length * LANE_WIDTH),
      canvasHeight: Math.max(310, maxRows * ROW_HEIGHT + 115),
    };
  }, [filters.era, filters.recordType, filters.search, filters.tag, timelineEvents, worldEvents]);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  if (worldDataLoading) return <Typography color="text.secondary">Loading timeline…</Typography>;
  if (worldDataError) return <Typography color="error">Could not load timeline: {worldDataError}</Typography>;

  return (
    <>
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, borderBottom: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <AccountTreeIcon color="primary" />
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>WORLD HISTORY</Typography>
              <Typography variant="h1">Timeline Graph</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>Explore recorded events and the connections you have documented between them.</Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 2, md: 4 } }}>
          <DashboardFilters
            search={{ label: "Search events", placeholder: "Name, description, or era…" }}
            filters={graphFilters}
            taggedEntities={allRecords}
            onChange={setFilters}
          />
          <Stack direction="row" spacing={1} sx={{ mt: -2, mb: 1.5, flexWrap: "wrap" }}>
            <Chip size="small" label={`${nodes.length} events`} />
            <Chip size="small" variant="outlined" label={`${edges.length} recorded connections`} />
            <Chip size="small" variant="outlined" label="Gold arrow: cause to outcome" />
            <Chip size="small" variant="outlined" label="Blue dotted: recorded as" />
            <Chip size="small" variant="outlined" label="Dashed: related" />
          </Stack>
          {edges.length === 0 && nodes.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Add Event Connections to a timeline event or use a world event’s existing “Caused By” links to draw relationships here.
            </Alert>
          )}
          {nodes.length === 0 ? (
            <Alert severity="info">No events match these filters.</Alert>
          ) : (
            <Box sx={{ overflow: "auto", border: 1, borderColor: "divider", borderRadius: 2, backgroundColor: "background.paper", maxHeight: "calc(100vh - 280px)" }}>
              <Box sx={{ position: "relative", width: canvasWidth, height: canvasHeight }}>
                <svg
                  width={canvasWidth}
                  height={canvasHeight}
                  aria-label="Timeline event connection graph"
                  style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                  <defs>
                    <marker id="timeline-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="#c5a45c" />
                    </marker>
                  </defs>
                  {edges.map((edge) => {
                    const from = nodeById.get(edge.from);
                    const to = nodeById.get(edge.to);
                    if (!from || !to) return null;
                    const points = cardEdgePoint(from, to);
                    const midX = (points.from.x + points.to.x) / 2;
                    return (
                      <g key={edge.id}>
                        <path
                          d={`M ${points.from.x} ${points.from.y} C ${midX} ${points.from.y}, ${midX} ${points.to.y}, ${points.to.x} ${points.to.y}`}
                          fill="none"
                          stroke={edge.related ? "#7b8492" : edge.provenance ? "#65a4c2" : "#c5a45c"}
                          strokeWidth="2"
                          strokeDasharray={edge.related ? "6 5" : edge.provenance ? "2 5" : undefined}
                          markerEnd={edge.related ? undefined : "url(#timeline-arrow)"}
                        />
                        <title>{edge.label}</title>
                      </g>
                    );
                  })}
                </svg>

                {[...new Set(nodes.map((node) => node.group))].map((group) => {
                  const groupNodes = nodes.filter((node) => node.group === group);
                  const x = Math.min(...groupNodes.map((node) => node.x));
                  return (
                    <Typography
                      key={group}
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ position: "absolute", left: x, top: 20, fontWeight: 700, letterSpacing: "0.04em" }}
                    >
                      {group}
                    </Typography>
                  );
                })}

                {nodes.map((node) => (
                  <Card
                    key={node.id}
                    variant="outlined"
                    sx={{ position: "absolute", left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, borderColor: node.color, zIndex: 1 }}
                  >
                    <CardActionArea onClick={() => openEntity(node.id)} sx={{ height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                            <Typography variant="caption" color={node.color}>{node.kind}</Typography>
                            {node.dateLabel && <Chip size="small" label={node.dateLabel} sx={{ maxWidth: 140 }} />}
                          </Stack>
                          <Typography variant="subtitle2" noWrap title={node.name} sx={{ fontWeight: 700 }}>{node.name}</Typography>
                          {node.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {node.description}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </Box>
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
