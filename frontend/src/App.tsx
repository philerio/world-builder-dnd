import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PublicIcon from "@mui/icons-material/Public";
import PlaceIcon from "@mui/icons-material/Place";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventIcon from "@mui/icons-material/Event";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DiamondIcon from "@mui/icons-material/Diamond";
import MapIcon from "@mui/icons-material/Map";
import StarsIcon from "@mui/icons-material/Stars";

import type { WorldData } from "./types";
import WorldPage from "./pages/WorldPage";
import LocationsPage from "./pages/LocationsPage";
import CharactersPage from "./pages/CharactersPage";
import CampaignsPage from "./pages/CampaignsPage";
import EventsPage from "./pages/EventsPage";
import LorePage from "./pages/LorePage";
import ArtifactsPage from "./pages/ArtifactsPage";
import MapsPage from "./pages/MapsPage";

const drawerWidth = 240;

const navigation = [
  {
    path: "/",
    label: "Dashboard",
    icon: <DashboardIcon />,
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
    path: "/events",
    label: "Events",
    icon: <EventIcon />,
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
];

function Sidebar() {
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
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: "auto", p: 2 }}>
        <Divider sx={{ mb: 2 }} />

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
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/world")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      })
      .then((worldData: WorldData) => {
        setData(worldData);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography variant="h2">Could not load world</Typography>

        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography color="text.secondary">Loading world...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

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
          <Route path="/world" element={<WorldPage data={data} />} />
          <Route path="/locations" element={<LocationsPage />} />

          <Route path="/characters" element={<CharactersPage data={data} />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/lore" element={<LorePage />} />
          <Route
            path="/artifacts"
            element={<ArtifactsPage />} />
          <Route path="/maps" element={<MapsPage />} />
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
