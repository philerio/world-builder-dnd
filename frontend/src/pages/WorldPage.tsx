import type { ReactNode } from "react";
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Divider,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import useEntityDrawer from "../hooks/useEntityDrawer";
import PublicIcon from "@mui/icons-material/Public";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LandscapeIcon from "@mui/icons-material/Landscape";
import CastleIcon from "@mui/icons-material/Castle";
import PlaceIcon from "@mui/icons-material/Place";

import EntityDetailDrawer from "../components/EntityDetailDrawer";

import type { WorldData } from "../types";

type WorldPageProps = {
    data: WorldData;
};

function WorldPage({ data }: WorldPageProps) {
    const {
        entityId,
        isOpen,
        canGoBack,
        openEntity,
        goBack,
        closeEntity,
    } = useEntityDrawer();
    const world = data.world ?? data.worlds?.[0];

    if (!world) {
        return (
            <Box sx={{ p: { xs: 3, md: 5 } }}>
                <Typography variant="h1">World</Typography>

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    No world found.
                </Typography>
            </Box>
        );
    }

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
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: "0.15em" }}
                >
                    WORLD
                </Typography>

                <Typography variant="h1" sx={{ mt: 0.5 }}>
                    {world.name}
                </Typography>

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {world.description ?? "Explore the world."}
                </Typography>
            </Box>

            <Box sx={{ p: { xs: 3, md: 5 } }}>
                <WorldSection
                    title="Continents"
                    description="Major landmasses within the world."
                >
                    <Grid container spacing={2}>
                        {data.continents.map((continent) => {
                            const regionCount = data.regions.filter(
                                (region) => region.continent === continent.id,
                            ).length;

                            const cityCount = data.cities.filter(
                                (city) =>
                                    city.region &&
                                    data.regions.some(
                                        (region) =>
                                            region.id === city.region &&
                                            region.continent === continent.id,
                                    ),
                            ).length;

                            return (
                                <Grid
                                    key={continent.id}
                                    size={{ xs: 12, sm: 6, md: 4 }}
                                >
                                    <Card sx={{ height: "100%" }}>
                                        <CardActionArea
                                            sx={{ height: "100%" }}
                                            onClick={() =>
                                                openEntity(continent.id)
                                            }
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <PublicIcon
                                                    color="primary"
                                                    sx={{ fontSize: 32, mb: 2 }}
                                                />

                                                <Typography
                                                    variant="h3"
                                                    sx={{ fontSize: "1.35rem" }}
                                                >
                                                    {continent.name}
                                                </Typography>

                                                <Typography
                                                    color="text.secondary"
                                                    variant="body2"
                                                    sx={{
                                                        mt: 1,
                                                        minHeight: 42,
                                                    }}
                                                >
                                                    {continent.description ??
                                                        continent.details ??
                                                        "No description available."}
                                                </Typography>

                                                <Stack
                                                    direction="row"
                                                    sx={{
                                                        gap: 1,
                                                        mt: 3,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Chip
                                                        size="small"
                                                        icon={<LandscapeIcon />}
                                                        label={`${regionCount} regions`}
                                                    />

                                                    <Chip
                                                        size="small"
                                                        icon={<LocationCityIcon />}
                                                        label={`${cityCount} cities`}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </WorldSection>

                <Divider sx={{ my: 5 }} />

                <WorldSection
                    title="Kingdoms"
                    description="Nations and sovereign powers across the world."
                >
                    {data.kingdoms.length === 0 ? (
                        <Typography color="text.secondary">No kingdoms have been added yet.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {data.kingdoms.map((kingdom) => {
                                const continent = data.continents.find((item) => item.id === kingdom.continent);
                                const capital = data.cities.find((item) => item.id === kingdom.capital);
                                const ruler = data.npcs.find((item) => item.id === kingdom.ruler);
                                const cityCount = data.cities.filter((city) => city.kingdom === kingdom.id).length;
                                return (
                                    <Grid key={kingdom.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Card sx={{ height: "100%" }}>
                                            <CardActionArea sx={{ height: "100%" }} onClick={() => openEntity(kingdom.id)}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <CastleIcon color="primary" sx={{ fontSize: 30, mb: 2 }} />
                                                    <Typography variant="h3" sx={{ fontSize: "1.3rem" }}>{kingdom.name}</Typography>
                                                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                                        {continent?.name ?? "Continent not specified"}
                                                    </Typography>
                                                    {(capital || ruler) && (
                                                        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                                            {[capital && `Capital: ${capital.name}`, ruler && `Ruler: ${ruler.name}`].filter(Boolean).join(" · ")}
                                                        </Typography>
                                                    )}
                                                    <Chip size="small" label={`${cityCount} cities`} sx={{ mt: 2 }} />
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </WorldSection>

                <Divider sx={{ my: 5 }} />

                <WorldSection
                    title="Regions"
                    description="Regional divisions of the known continents."
                >
                    <Grid container spacing={2}>
                        {data.regions.map((region) => {
                            const continent = data.continents.find(
                                (item) => item.id === region.continent,
                            );

                            const cityCount = data.cities.filter(
                                (city) => city.region === region.id,
                            ).length;

                            return (
                                <Grid
                                    key={region.id}
                                    size={{ xs: 12, sm: 6, md: 4 }}
                                >
                                    <Card sx={{ height: "100%" }}>
                                        <CardActionArea
                                            sx={{ height: "100%" }}
                                            onClick={() =>
                                                openEntity(region.id)
                                            }
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <LandscapeIcon
                                                    color="primary"
                                                    sx={{ fontSize: 30, mb: 2 }}
                                                />

                                                <Typography
                                                    variant="h3"
                                                    sx={{ fontSize: "1.3rem" }}
                                                >
                                                    {region.name}
                                                </Typography>

                                                <Typography
                                                    color="text.secondary"
                                                    variant="body2"
                                                    sx={{ mt: 1 }}
                                                >
                                                    {continent
                                                        ? continent.name
                                                        : "Continent not specified"}
                                                </Typography>

                                                <Chip
                                                    size="small"
                                                    icon={<LocationCityIcon />}
                                                    label={`${cityCount} cities`}
                                                    sx={{ mt: 2 }}
                                                />
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </WorldSection>

                <Divider sx={{ my: 5 }} />

                <WorldSection
                    title="Cities"
                    description="Known cities and settlements."
                >
                    <Grid container spacing={2}>
                        {data.cities.map((city) => {
                            const region = data.regions.find(
                                (item) => item.id === city.region,
                            );

                            return (
                                <Grid
                                    key={city.id}
                                    size={{ xs: 12, sm: 6, md: 4 }}
                                >
                                    <Card sx={{ height: "100%" }}>
                                        <CardActionArea
                                            sx={{ height: "100%" }}
                                            onClick={() =>
                                                openEntity(city.id)
                                            }
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <LocationCityIcon
                                                    color="primary"
                                                    sx={{ fontSize: 30, mb: 2 }}
                                                />

                                                <Typography
                                                    variant="h3"
                                                    sx={{ fontSize: "1.3rem" }}
                                                >
                                                    {city.name}
                                                </Typography>

                                                {region && (
                                                    <Typography
                                                        color="text.secondary"
                                                        variant="body2"
                                                        sx={{ mt: 1 }}
                                                    >
                                                        {region.name}
                                                    </Typography>
                                                )}

                                                {city?.population && (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mt: 2 }}
                                                    >
                                                        Population:{" "}
                                                        {city.population.toLocaleString()}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </WorldSection>

                <Divider sx={{ my: 5 }} />

                <WorldSection
                    title="Points of Interest"
                    description="Places beyond the major settlements that matter to the world and its stories."
                >
                    {(data.locations ?? []).length === 0 ? (
                        <Typography color="text.secondary">No points of interest have been added yet.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {(data.locations ?? []).map((location) => {
                                const region = data.regions.find((item) => item.id === location.region);
                                const kingdom = data.kingdoms.find((item) => item.id === location.kingdom);
                                return (
                                    <Grid key={location.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Card sx={{ height: "100%" }}>
                                            <CardActionArea sx={{ height: "100%" }} onClick={() => openEntity(location.id)}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <PlaceIcon color="primary" sx={{ fontSize: 30, mb: 2 }} />
                                                    <Typography variant="h3" sx={{ fontSize: "1.3rem" }}>{location.name}</Typography>
                                                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                                        {[location.location_type, region?.name, kingdom?.name].filter(Boolean).join(" · ") || "Location"}
                                                    </Typography>
                                                    {location.description && (
                                                        <Typography color="text.secondary" variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>
                                                            {location.description}
                                                        </Typography>
                                                    )}
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </WorldSection>
            </Box>

            <EntityDetailDrawer
                entityId={entityId}
                open={isOpen}
                onClose={closeEntity}
                onOpenEntity={openEntity}
                onBack={goBack}
                canGoBack={canGoBack}
            />
        </Box>
    );
}

function WorldSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Box>
            <Typography variant="h2">{title}</Typography>

            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
                {description}
            </Typography>

            {children}
        </Box>
    );
}

export default WorldPage;
