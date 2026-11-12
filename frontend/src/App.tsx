import { API_BASE_URL } from "./api";
import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
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
import StorefrontIcon from "@mui/icons-material/Storefront";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HomeSessionDashboard from "./components/HomeSessionDashboard";
import WorldSearchDialog from "./components/WorldSearchDialog";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import WifiIcon from "@mui/icons-material/Wifi";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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
import DataHealthPage from "./pages/DataHealthPage";
import DMScratchpadPage from "./pages/DMScratchpadPage";
import StorePage from "./pages/StorePage";

const drawerWidth = 240;
type SidebarProps = {
  onNewEntity: () => void;
  onSearch: () => void;
  onNetworkAccess: () => void;
  healthCounts: { errors: number; warnings: number } | null;
  mobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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
    path: "/store",
    label: "Store Prices",
    icon: <StorefrontIcon />,
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
    label: "Story Items & Artifacts",
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

function Sidebar({ onNewEntity, onSearch, onNetworkAccess, healthCounts, mobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  return (
    <Drawer
      data-app-chrome="navigation"
      variant={mobile ? "temporary" : "permanent"}
      open={mobile ? mobileOpen : undefined}
      onClose={onMobileClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: mobile ? 288 : drawerWidth,
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
        {mobile && (
          <IconButton aria-label="Close navigation" onClick={onMobileClose} sx={{ ml: "auto" }}>
            <CloseIcon />
          </IconButton>
        )}
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
            onClick={onMobileClose}
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
          startIcon={<WifiIcon />}
          onClick={() => {
            onNetworkAccess();
            onMobileClose?.();
          }}
          sx={{ justifyContent: "flex-start", color: "text.secondary", textTransform: "none", mb: 1 }}
        >
          Phone access
        </Button>
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

function getNetworkUrlKind(url: string): "Wi-Fi / LAN" | "VPN / CGNAT" | "Other network" {
  const octets = new URL(url).hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return "Other network";
  const [first, second] = octets;
  if (first === 100 && second >= 64 && second <= 127) return "VPN / CGNAT";
  if (first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31)) {
    return "Wi-Fi / LAN";
  }
  return "Other network";
}

function NetworkAccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [networkUrls, setNetworkUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/__world-builder/network")
      .then((response) => {
        if (!response.ok) throw new Error(`Dev server returned ${response.status}`);
        return response.json() as Promise<string[]>;
      })
      .then((urls) => {
        if (active) {
          setNetworkUrls(urls);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not detect network addresses.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyAddress = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAddress(url);
    } catch {
      setCopiedAddress(null);
    }
  };
  const hasLanAddress = networkUrls.some((url) => getNetworkUrlKind(url) === "Wi-Fi / LAN");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Connect from your phone</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            A Wi-Fi / LAN address works when both devices are on the same network. A VPN address works when your phone is connected to the same VPN, such as Tailscale.
          </Alert>
          <Typography variant="subtitle2">This computer</Typography>
          <Typography component="code" sx={{ overflowWrap: "anywhere" }}>{window.location.origin}</Typography>
          <Typography variant="subtitle2">Phone on your local network</Typography>
          {loading ? <Typography color="text.secondary">Finding network addresses…</Typography> : null}
          {error ? <Alert severity="warning">{error}</Alert> : null}
          {!loading && !error && networkUrls.length === 0 ? (
            <Typography color="text.secondary">No Wi-Fi address was detected. Make sure the computer is connected to your network.</Typography>
          ) : null}
          {networkUrls.map((url) => (
            <Box key={url}>
              <Typography variant="overline" color="text.secondary">{getNetworkUrlKind(url)}</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                <Typography component="code" sx={{ flex: 1, overflowWrap: "anywhere" }}>{url}</Typography>
                <IconButton aria-label={`Copy ${url}`} onClick={() => void copyAddress(url)} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          ))}
          {!loading && networkUrls.length > 0 && !hasLanAddress ? (
            <Alert severity="warning">
              No standard Wi-Fi / LAN address was detected. The listed 100.64–100.127 address is VPN/CGNAT; it will work only if the phone is connected to that same VPN.
            </Alert>
          ) : null}
          {copiedAddress ? <Typography variant="caption" color="success.main">Address copied.</Typography> : null}
          <Typography variant="caption" color="text.secondary">
            Only use this on a trusted private network. The development server can edit your world data.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
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

function Dashboard({ data, onOpenEntity }: { data: WorldData; onOpenEntity: (id: string) => void }) {
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
      count: data.kingdoms.filter((entity) => (entity.political_level ?? "kingdom") === "kingdom").length,
    },
    {
      name: "Nations",
      count: data.kingdoms.filter((entity) => entity.political_level === "nation").length,
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
      name: "Story Items & Artifacts",
      count: data.artifacts.length,
    },
    {
      name: "Store Price Items",
      count: data.price_lists?.reduce((total, list) => total + list.items.length, 0) ?? 0,
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
        <HomeSessionDashboard data={data} onOpenEntity={onOpenEntity} />
        <Accordion sx={{ mt: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h2">World overview</Typography></AccordionSummary>
          <AccordionDetails>

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
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}

function AppContent() {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileLayout = useMediaQuery("(max-width: 899px)");
  const [healthCounts, setHealthCounts] = useState<{ errors: number; warnings: number } | null>(null);
  const {
    entities,
    refreshEntities,
    refreshWorldData,
    loadEntity,
    worldData: data,
    worldDataLoading,
    worldDataError,
  } = useWorldData();
  const { entityId, isOpen, canGoBack, openEntity, goBack, closeEntity } = useEntityDrawer(new URLSearchParams(window.location.search).get("entity"));

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
    fetch(`${API_BASE_URL}/validation`)
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
        onNetworkAccess={() => setNetworkDialogOpen(true)}
        healthCounts={healthCounts}
        mobile={mobileLayout}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <CreateEntityDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onCreated={(createdId, keepOpen) => {
          if (!keepOpen) {
            setCreateDrawerOpen(false);
            openEntity(createdId);
          }
        }}
      />
      {searchOpen && <WorldSearchDialog open onClose={() => setSearchOpen(false)} onOpenEntity={openEntity} />}
      {networkDialogOpen ? <NetworkAccessDialog open onClose={() => setNetworkDialogOpen(false)} /> : null}
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
          p: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        {mobileLayout && (
          <AppBar data-app-chrome="header" position="sticky" color="default" elevation={1} sx={{ mb: 2, mx: -1.5, width: "calc(100% + 24px)" }}>
            <Toolbar variant="dense" sx={{ minHeight: 56, gap: 1 }}>
              <IconButton aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)} edge="start">
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, flex: 1 }}>
                World Builder
              </Typography>
              <IconButton aria-label="Search world" onClick={() => setSearchOpen(true)}>
                <SearchIcon />
              </IconButton>
              <IconButton aria-label="Phone access" onClick={() => setNetworkDialogOpen(true)}>
                <WifiIcon />
              </IconButton>
              <IconButton aria-label="Create entity" color="primary" onClick={() => setCreateDrawerOpen(true)}>
                <AddIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}
        <Routes>
          <Route path="/" element={<Dashboard data={data} onOpenEntity={openEntity} />} />
          <Route path="/world-map" element={<WorldMapPage />} />
          <Route path="/world" element={<WorldPage data={data} />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/characters" element={<CharactersPage data={data} />} />
          <Route path="/store" element={<StorePage />} />
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
