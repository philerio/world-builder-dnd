import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import {
  Alert,
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PublicIcon from "@mui/icons-material/Public";
import PlaceIcon from "@mui/icons-material/Place";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventIcon from "@mui/icons-material/Event";
import TimelineIcon from "@mui/icons-material/Timeline";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DiamondIcon from "@mui/icons-material/Diamond";
import MapIcon from "@mui/icons-material/Map";
import WorldMapPage from "./pages/WorldMapPage";
import StarsIcon from "@mui/icons-material/Stars";
import SearchIcon from "@mui/icons-material/Search";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import NoteAltIcon from "@mui/icons-material/NoteAlt";

import type { WorldData } from "./types";
import WorldPage from "./pages/WorldPage";
import LocationsPage from "./pages/LocationsPage";
import CharactersPage from "./pages/CharactersPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignDashboardPage from "./pages/CampaignDashboardPage";
import EventsPage from "./pages/EventsPage";
import TimelineGraphPage from "./pages/TimelineGraphPage";
import LorePage from "./pages/LorePage";
import ArtifactsPage from "./pages/ArtifactsPage";
import MapsPage from "./pages/MapsPage";
import ExploreIcon from "@mui/icons-material/Explore";
import CreateEntityDrawer from "./components/CreateEntityDrawer";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import WorldStoriesPage from "./pages/WorldStoriesPage";
import WorldStoryDashboardPage from "./pages/WorldStoryDashboardPage";
import EntityDetailDrawer from "./components/EntityDetailDrawer";
import useEntityDrawer from "./hooks/useEntityDrawer";
import { useWorldData } from "./context/WorldDataContext";
import type { EntitySummary } from "./types";
import DataHealthPage from "./pages/DataHealthPage";
import DMScratchpadPage from "./pages/DMScratchpadPage";

const drawerWidth = 240;
type SidebarProps = {
  onNewEntity: () => void;
  onSearch: () => void;
  healthCounts: { errors: number; warnings: number } | null;
};
const navigation = [
  {
    path: "/",
    label: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    path: "/world-map",
    label: "World Map",
    icon: <ExploreIcon />,
  },
  {
    path: "/world",
    label: "World",
    icon: <PublicIcon />,
  },
  {
    path: "/locations",
    label: "Locations",
    icon: <PlaceIcon />,
  },
  {
    path: "/characters",
    label: "Characters",
    icon: <PeopleIcon />,
  },
  {
    path: "/campaigns",
    label: "Campaigns",
    icon: <MenuBookIcon />,
  },
  {
    path: "/scratchpad",
    label: "DM Scratchpad",
    icon: <NoteAltIcon />,
  },
  {
    path: "/events",
    label: "Events",
    icon: <EventIcon />,
  },
  {
    path: "/timeline",
    label: "Timeline Graph",
    icon: <TimelineIcon />,
  },
  {
    path: "/world-stories",
    label: "World Story",
    icon: <AutoAwesomeMotionIcon />,
  },
  {
    path: "/lore",
    label: "Lore",
    icon: <AutoStoriesIcon />,
  },
  {
    path: "/artifacts",
    label: "Artifacts",
    icon: <DiamondIcon />,
  },
  {
    path: "/maps",
    label: "Maps",
    icon: <MapIcon />,
  },
  {
    path: "/data-health",
    label: "Data Health",
    icon: <FactCheckIcon />,
  },
];

function Sidebar({ onNewEntity, onSearch, healthCounts }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar
        sx={{
          minHeight: "80px !important",
          px: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <StarsIcon color="primary" />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              World Builder
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              D&D Campaign Manager
            </Typography>
          </Box>
        </Stack>
      </Toolbar>

      <Divider />

      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Button
          fullWidth
          startIcon={<SearchIcon />}
          onClick={onSearch}
          sx={{ justifyContent: "flex-start", color: "text.secondary", textTransform: "none" }}
        >
          Search world
        </Button>
      </Box>

      <List sx={{ px: 1.5, py: 2 }}>
        {navigation.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.path === "/"}
            sx={{
              mb: 0.5,
              borderRadius: 1,
              color: "text.secondary",

              "& .MuiListItemIcon-root": {
                color: "inherit",
                minWidth: 40,
              },

              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary",
              },

              "&.active": {
                backgroundColor: "action.selected",
                color: "primary.main",

                "& .MuiListItemIcon-root": {
                  color: "primary.main",
                },
              },
            }}
          >
            <ListItemIcon>
              {item.path === "/data-health" && healthCounts && healthCounts.errors + healthCounts.warnings > 0 ? (
                <Badge
                  badgeContent={healthCounts.errors + healthCounts.warnings}
                  color={healthCounts.errors > 0 ? "error" : "warning"}
                  overlap="circular"
                  aria-label={`${healthCounts.errors} errors and ${healthCounts.warnings} warnings`}
                >
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: "auto", p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Button
          fullWidth
          onClick={onNewEntity}
          sx={{
            mt: 2,
            mb: 3,
            height: 40,
            justifyContent: "flex-start",
            px: 2,
            color: "text.secondary",
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            backgroundColor: "transparent",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            "&:hover": {
              color: "text.primary",
              borderColor: "primary.main",
              backgroundColor: "action.hover",
            },
          }}
        >
          + New Entity
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: "0.08em" }}
        >
          DM WORKSPACE
        </Typography>
      </Box>
    </Drawer>
  );
}

function PagePlaceholder({ title }: { title: string }) {
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: "0.15em" }}
      >
        WORLD BUILDER
      </Typography>

      <Typography variant="h1" sx={{ mt: 0.5 }}>
        {title}
      </Typography>

      <Typography color="text.secondary" sx={{ mt: 1 }}>
        This section is ready to be built.
      </Typography>
    </Box>
  );
}

function Dashboard({ data }: { data: WorldData }) {
  const world = data.world ?? data.worlds?.[0];

  if (!world) {
    return <PagePlaceholder title="No World Found" />;
  }

  const sections = [
    {
      name: "Continents",
      count: data.continents.length,
    },
    {
      name: "Kingdoms",
      count: data.kingdoms.length,
    },
    {
      name: "Regions",
      count: data.regions.length,
    },
    {
      name: "Cities",
      count: data.cities.length,
    },
    {
      name: "Points of Interest",
      count: data.locations?.length ?? 0,
    },
    {
      name: "NPCs",
      count: data.npcs.length,
    },
    {
      name: "Player Characters",
      count: data.player_characters.length,
    },
    {
      name: "Campaigns",
      count: data.campaigns.length,
    },
    {
      name: "World Events",
      count: data.world_events.length,
    },
    {
      name: "World Stories",
      count: data.world_stories.length,
    },
    {
      name: "Timeline Events",
      count: data.timeline_events.length,
    },
    {
      name: "Lore",
      count: data.lores.length,
    },
    {
      name: "Artifacts",
      count: data.artifacts.length,
    },
    {
      name: "Maps",
      count: data.maps.length,
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{ justifyContent: "space-between", gap: 3 }}
        >
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: "0.15em" }}
            >
              D&D WORLD BUILDER
            </Typography>

            <Typography variant="h1" sx={{ mt: 0.5 }}>
              {world.name}
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {world.description ?? "Campaign world dashboard"}
            </Typography>
          </Box>

          <Stack
            spacing={0.5}
            sx={{
              justifyContent: "center",
              alignItems: { xs: "flex-start", md: "flex-end" },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Version {world.version}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              By {world.author}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h2">World Overview</Typography>

        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          Your campaign world at a glance.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 2,
            maxWidth: 1200,
          }}
        >
          {sections.map((section) => (
            <Card key={section.name}>
              <CardContent>
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: "2.1rem",
                    fontWeight: 700,
                  }}
                >
                  {section.count}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 3 }}
                >
                  {section.name}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function AppContent() {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [healthCounts, setHealthCounts] = useState<{ errors: number; warnings: number } | null>(null);
  const {
    entities,
    entitiesLoading,
    refreshEntities,
    refreshWorldData,
    loadEntity,
    worldData: data,
    worldDataLoading,
    worldDataError,
  } = useWorldData();
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } = useEntityDrawer();

  const handleDataHealthSave = async (savedEntityId?: string) => {
    await Promise.all([refreshEntities(), refreshWorldData()]);
    if (savedEntityId && !worldDataError) {
      await loadEntity(savedEntityId);
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) {
          return;
        }
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("http://localhost:8000/validation")
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json() as Promise<{ errors?: string[]; warnings?: string[] }>;
      })
      .then((report) => {
        if (active) setHealthCounts({ errors: report.errors?.length ?? 0, warnings: report.warnings?.length ?? 0 });
      })
      .catch(() => {
        if (active) setHealthCounts(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (worldDataError) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h2" sx={{ mb: 1 }}>Could not load world</Typography>
          <Typography>{worldDataError}</Typography>
          <Typography sx={{ mt: 1 }}>Use Data Health below to repair a YAML file, then save and recheck.</Typography>
        </Alert>
        <DataHealthPage
          onOpenEntity={() => undefined}
          onValidationReport={setHealthCounts}
          onDataSaved={handleDataHealthSave}
          entities={entities}
        />
      </Box>
    );
  }

  if (worldDataLoading || !data) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography color="text.secondary">Loading world...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        onNewEntity={() => setCreateDrawerOpen(true)}
        onSearch={() => setSearchOpen(true)}
        healthCounts={healthCounts}
      />
      <CreateEntityDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onCreated={(_entityId, keepOpen) => {
          if (!keepOpen) setCreateDrawerOpen(false);
        }}
      />
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Search the world</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Autocomplete
            autoHighlight
            options={entities}
            groupBy={(entity) => entity.entity_type.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}
            getOptionLabel={(entity) => entity.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={entitiesLoading}
            noOptionsText={entitiesLoading ? "Loading world records…" : "No matching records"}
            onChange={(_event, selected: EntitySummary | null) => {
              if (!selected) return;
              setSearchOpen(false);
              openEntity(selected.id);
            }}
            renderOption={(props, entity) => {
              const { key, ...optionProps } = props;
              return (
                <Box component="li" key={key} {...optionProps}>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2">{entity.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entity.entity_type.replaceAll("_", " ")}
                    </Typography>
                  </Stack>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} autoFocus label="Find a record" placeholder="Search by name" />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Tip: press Ctrl+K or ⌘K from anywhere to open search.
          </Typography>
        </DialogContent>
      </Dialog>
      <EntityDetailDrawer
        entityId={entityId}
        open={isOpen}
        onClose={closeEntity}
        onOpenEntity={openEntity}
        onBack={goBack}
        canGoBack={canGoBack}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/world-map" element={<WorldMapPage />} />
          <Route path="/world" element={<WorldPage data={data} />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/characters" element={<CharactersPage data={data} />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/scratchpad" element={<DMScratchpadPage />} />
          <Route
            path="/campaigns/:campaignId"
            element={<CampaignDashboardPage />}
          />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/timeline" element={<TimelineGraphPage />} />
          <Route path="/world-stories" element={<WorldStoriesPage />} />
          <Route path="/world-stories/:storyId" element={<WorldStoryDashboardPage />} />
          <Route path="/lore" element={<LorePage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route
            path="/data-health"
            element={
              <DataHealthPage
                onOpenEntity={openEntity}
                onValidationReport={setHealthCounts}
                onDataSaved={handleDataHealthSave}
                entities={entities}
              />
            }
          />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
