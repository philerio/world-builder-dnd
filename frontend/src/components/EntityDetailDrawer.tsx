/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import PublicIcon from "@mui/icons-material/Public";
import EntityForm from "./EntityForm";
import type { EntityResponse, EntitySummary } from "../types";
import useEntityIndex from "../hooks/useEntityIndex";
import useRelatedEntities from "../hooks/useRelatedEntities";
import { useWorldData } from "../context/WorldDataContext";

type EntityDetailDrawerProps = {
  entityId: string | null;
  open: boolean;
  onClose: () => void;
  onOpenEntity: (id: string) => void;
  onBack: () => void;
  canGoBack: boolean;
};

const drawerWidth = 440;

function EntityDetailDrawer({
  entityId,
  open,
  onClose,
  onOpenEntity,
  onBack,
  canGoBack,
}: EntityDetailDrawerProps) {
  const [data, setData] = useState<EntityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const { getEntity } = useEntityIndex();
  const {
    getEntity: getSharedEntity,
    loadEntity,
    updateEntity,
  } = useWorldData();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEditing(false);
  }, [entityId]);
  const sharedData = entityId ? getSharedEntity(entityId) : undefined;
  const currentData = sharedData ?? data;
  const handleEdit = () => {
    if (!currentData) {
      return;
    }

    setEditFormData({ ...currentData.entity });
    setIsEditing(true);
    setError(null);
  };
  const handleSave = async () => {
    if (!entityId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateEntity(entityId, editFormData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!entityId) {
      setData(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    loadEntity(entityId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, loadEntity]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: {
              xs: "100%",
              sm: drawerWidth,
            },
          },
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {canGoBack && (
                <IconButton onClick={onBack} aria-label="Go back" size="small">
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                {isEditing ? "EDITING" : "ENTITY"}
              </Typography>
              {!isEditing && currentData && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mb: 2,
                  }}
                >
                  <Button variant="outlined" onClick={handleEdit}>
                    Edit
                  </Button>
                </Box>
              )}
            </Box>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {!data && !error && (
          <Stack
            sx={{
              alignItems: "center",
              justifyContent: "center",
              py: 8,
            }}
          >
            <CircularProgress size={28} />
          </Stack>
        )}

        {error && (
          <Typography color="error">Could not load entity: {error}</Typography>
        )}

        {currentData &&
          (isEditing ? (
            <>
              <EntityForm
                entityType={currentData.entity_type}
                formData={editFormData}
                onChange={setEditFormData}
                disabled={saving}
              />

              <Box
                sx={{
                  position: "sticky",
                  bottom: 0,
                  mt: 3,
                  pt: 2,
                  pb: 2,
                  backgroundColor: "background.paper",
                  borderTop: 1,
                  borderColor: "divider",
                  zIndex: 1,
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "flex-end",
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </Stack>
              </Box>
            </>
          ) : (
            <EntityContent
              data={currentData}
              onOpenEntity={onOpenEntity}
              getEntity={getEntity}
            />
          ))}
      </Box>
    </Drawer>
  );
}

function EntityContent({
  data,
  onOpenEntity,
  getEntity,
}: {
  data: EntityResponse;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  const entity = data.entity;

  const name = typeof entity.name === "string" ? entity.name : data.id;

  const description =
    typeof entity.description === "string" ? entity.description : null;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant="caption"
          color="primary"
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {formatEntityType(data.entity_type)}
        </Typography>

        <Typography variant="h2" sx={{ mt: 0.5 }}>
          {name}
        </Typography>

        {description && (
          <Typography
            color="text.secondary"
            sx={{
              mt: 1.5,
              lineHeight: 1.7,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      <EntityDetails
        data={data}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      {typeof entity.dm_notes === "string" && entity.dm_notes.trim() !== "" && (
        <>
          <Divider />

          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "warning.main",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              DM Notes
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 1,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {entity.dm_notes}
            </Typography>
          </Box>
        </>
      )}

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">
          ID
        </Typography>

        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {data.id}
        </Typography>
      </Box>
    </Stack>
  );
}
type EntityReferenceListFieldProps = {
  label: string;
  entityIds: string[];
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function EntityReferenceListField({
  label,
  entityIds,
  onOpenEntity,
  getEntity,
}: EntityReferenceListFieldProps) {
  if (entityIds.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Stack
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 1,
          mt: 0.75,
        }}
      >
        {entityIds.map((entityId) => {
          const entity = getEntity(entityId);

          if (!entity) {
            return (
              <Chip
                key={entityId}
                label={entityId}
                size="small"
                sx={{
                  width: "fit-content",
                }}
              />
            );
          }

          return (
            <Chip
              key={entityId}
              label={entity.name}
              size="small"
              clickable={Boolean(onOpenEntity)}
              onClick={() => onOpenEntity?.(entityId)}
              sx={{
                width: "fit-content",
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
function EntityDetails({
  data,
  onOpenEntity,
  getEntity,
}: {
  data: EntityResponse;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  switch (data.entity_type) {
    case "continent":
      return (
        <ContinentDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "region":
      return (
        <RegionDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "kingdom":
      return (
        <KingdomDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "city":
      return (
        <CityDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "npc":
    case "player_character":
      return (
        <CharacterDetails
          entity={data.entity}
          getEntity={getEntity}
          onOpenEntity={onOpenEntity}
        />
      );

    case "campaign":
      return (
        <CampaignDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "world_event":
    case "timeline_event":
      return (
        <EventDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    case "artifact":
      return <ArtifactDetails entity={data.entity} />;

    case "map":
      return (
        <MapDetails
          entity={data.entity}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      );

    default:
      return null;
  }
}
type ContinentDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function ContinentDetails({
  entity,
  onOpenEntity,
  getEntity,
}: ContinentDetailsProps) {
  const { entities: relatedEntities } = useRelatedEntities(
    typeof entity.id === "string" ? entity.id : null,
  );

  const kingdoms = relatedEntities
    .filter((relatedEntity) => relatedEntity.entity_type === "kingdom")
    .map((relatedEntity) => relatedEntity.id);
  return (
    <DetailSection title="Continent" icon={<PublicIcon />}>
      <ReferenceField
        label="Description"
        value={entity.description ?? "No description available."}
      />

      <ReferenceField
        label="Details"
        value={entity.details ?? "No details available."}
      />

      <EntityReferenceListField
        label="Kingdoms"
        entityIds={kingdoms}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />
    </DetailSection>
  );
}

type RegionDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function RegionDetails({
  entity,
  onOpenEntity,
  getEntity,
}: RegionDetailsProps) {
  return (
    <DetailSection title="Location" icon={<PublicIcon />}>
      <EntityReferenceField
        label="Continent"
        value={entity.continent}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceField
        label="Kingdom"
        value={entity.kingdom}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />
    </DetailSection>
  );
}

type KingdomDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function KingdomDetails({
  entity,
  onOpenEntity,
  getEntity,
}: KingdomDetailsProps) {
  const { entities: relatedEntities, loading } = useRelatedEntities(
    typeof entity.id === "string" ? entity.id : null,
  );

  const cities = relatedEntities
    .filter((relatedEntity) => relatedEntity.entity_type === "city")
    .map((relatedEntity) => relatedEntity.id);

  return (
    <DetailSection title="Kingdom" icon={<PublicIcon />}>
      <TextField
        value={entity.description}
        fallback="No description available."
      />

      <Divider />

      <EntityReferenceField
        label="Continent"
        value={entity.continent}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceField
        label="Capital"
        value={entity.capital}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceField
        label="Ruler"
        value={entity.ruler}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading cities…
        </Typography>
      ) : (
        <EntityReferenceListField
          label="Cities"
          entityIds={cities}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      )}
    </DetailSection>
  );
}
type CityDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};
function CityDetails({ entity, onOpenEntity, getEntity }: CityDetailsProps) {
  return (
    <DetailSection title="Location" icon={<LocationCityIcon />}>
      <ReferenceField
        label="Population"
        value={
          typeof entity.population === "number"
            ? entity.population.toLocaleString()
            : entity.population
        }
      />
      <EntityReferenceField
        label="Region"
        value={entity.region}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />
      <EntityReferenceField
        label="Kingdom"
        value={entity.kingdom}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <TextField
        value={entity.details}
        fallback="No additional details available."
      />
    </DetailSection>
  );
}
function EntityReferenceLink({
  entityId,
  onOpenEntity,
  getEntity,
}: {
  entityId: string;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  const entity = getEntity(entityId);
  const name = entity?.name ?? "Loading…";

  return (
    <Typography
      component="button"
      type="button"
      variant="body2"
      onClick={() => onOpenEntity?.(entityId)}
      disabled={!entity || !onOpenEntity}
      sx={{
        display: "block",
        p: 0,
        border: 0,
        textDecoration: "underline",
        background: "none",
        color: "text.primary",
        font: "inherit",
        fontWeight: 600,
        textAlign: "left",
        cursor: entity && onOpenEntity ? "pointer" : "default",
        "&:hover":
          entity && onOpenEntity
            ? {
                color: "primary.main",
              }
            : undefined,
      }}
    >
      {name}
    </Typography>
  );
}
function CharacterRelationships({
  relationships,
  onOpenEntity,
  getEntity,
}: {
  relationships: unknown;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  if (!Array.isArray(relationships) || relationships.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Relationships
      </Typography>

      <Stack spacing={1} sx={{ mt: 1 }}>
        {relationships.map((relationship, index) => {
          if (typeof relationship !== "object" || relationship === null) {
            return null;
          }

          const item = relationship as Record<string, unknown>;

          const character =
            typeof item.character === "string" ? item.character : null;

          const relationshipType =
            typeof item.relationship === "string" ? item.relationship : null;

          const notes = typeof item.notes === "string" ? item.notes : null;

          if (!character) {
            return null;
          }

          return (
            <Box
              key={index}
              sx={{
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <EntityReferenceLink
                entityId={character}
                onOpenEntity={onOpenEntity}
                getEntity={getEntity}
              />

              {relationshipType && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  {relationshipType}
                </Typography>
              )}

              {notes && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.75 }}
                >
                  {notes}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
function CharacterEvents({ events }: { events: unknown }) {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Events
      </Typography>

      <Stack spacing={1} sx={{ mt: 1 }}>
        {events.map((event, index) => {
          if (typeof event === "string") {
            return (
              <Chip
                key={index}
                size="small"
                label={event}
                sx={{
                  width: "fit-content",
                }}
              />
            );
          }

          if (typeof event !== "object" || event === null) {
            return null;
          }

          const item = event as Record<string, unknown>;

          const description =
            typeof item.description === "string"
              ? item.description.trim()
              : null;

          const campaign =
            typeof item.campaign === "string" ? item.campaign : null;

          const location =
            typeof item.location === "string" ? item.location : null;

          return (
            <Box
              key={index}
              sx={{
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {description && (
                <Typography variant="body2">{description}</Typography>
              )}

              {(campaign || location) && (
                <Stack
                  direction="row"
                  sx={{
                    gap: 0.75,
                    mt: 1,
                    flexWrap: "wrap",
                  }}
                >
                  {campaign && <Chip size="small" label={campaign} />}

                  {location && <Chip size="small" label={location} />}
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
function CharacterDetails({
  entity,
  onOpenEntity,
  getEntity,
}: {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  return (
    <DetailSection title="Character" icon={<PeopleIcon />}>
      <ReferenceField label="Role" value={entity.role} />
      <TextListField label="Motives" value={entity.motives} />

      <TextListField label="Goals" value={entity.goals} />
      <TextListField label="Fears" value={entity.fears} />
      <TextListField label="Secrets" value={entity.secrets} />
      <TextListField label="Knowledge" value={entity.knowledge} />
      <EntityReferenceField
        label="City"
        value={entity.city}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceField
        label="Region"
        value={entity.region}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceField
        label="Kingdom"
        value={entity.kingdom}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <CharacterRelationships
        relationships={entity.relationships}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <CharacterEvents events={entity.events} />

      <TextField
        value={entity.details}
        fallback="No additional details available."
      />
    </DetailSection>
  );
}
type CampaignDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function CampaignDetails({
  entity,
  onOpenEntity,
  getEntity,
}: CampaignDetailsProps) {
  const locations = Array.isArray(entity.locations)
    ? entity.locations.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  const npcs = Array.isArray(entity.npcs)
    ? entity.npcs.filter((value): value is string => typeof value === "string")
    : [];

  const playerCharacters = Array.isArray(entity.player_characters)
    ? entity.player_characters.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return (
    <DetailSection title="Campaign" icon={<EventIcon />}>
      <ReferenceField label="Status" value={entity.status} />

      <TextField
        value={entity.overview}
        fallback="No campaign overview available."
      />

      <EntityReferenceListField
        label="Locations"
        entityIds={locations}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceListField
        label="NPCs"
        entityIds={npcs}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceListField
        label="Player Characters"
        entityIds={playerCharacters}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <TextField
        value={entity.consequences}
        fallback="No consequences recorded."
      />
    </DetailSection>
  );
}

type EventDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function EventDetails({ entity, onOpenEntity, getEntity }: EventDetailsProps) {
  const locations = getStringArray(entity.locations);
  const campaigns = getStringArray(entity.campaigns);
  const characters = getStringArray(entity.characters);
  const kingdoms = getStringArray(entity.kingdoms);

  return (
    <DetailSection title="Event" icon={<EventIcon />}>
      <ReferenceField label="Type" value={entity.type} />

      <ReferenceField label="Status" value={entity.status} />

      <EntityReferenceListField
        label="Locations"
        entityIds={locations}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceListField
        label="Campaigns"
        entityIds={campaigns}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceListField
        label="Characters"
        entityIds={characters}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <EntityReferenceListField
        label="Kingdoms"
        entityIds={kingdoms}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <TextField
        value={entity.consequences}
        fallback="No consequences recorded."
      />
    </DetailSection>
  );
}
function ArtifactDetails({ entity }: { entity: Record<string, unknown> }) {
  return (
    <DetailSection title="Artifact" icon={<PublicIcon />}>
      <TextField
        value={entity.details}
        fallback="No additional details available."
      />
    </DetailSection>
  );
}

type MapDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function MapDetails({ entity, onOpenEntity, getEntity }: MapDetailsProps) {
  return (
    <DetailSection title="Map" icon={<PublicIcon />}>
      <ReferenceField label="Map Type" value={entity.map_type} />

      <EntityReferenceField
        label="Parent Map"
        value={entity.parent_map}
        onOpenEntity={onOpenEntity}
        getEntity={getEntity}
      />

      <TextField
        value={entity.details}
        fallback="No additional details available."
      />
    </DetailSection>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          mb: 2,
        }}
      >
        {icon}

        <Typography variant="h3" sx={{ fontSize: "1rem" }}>
          {title}
        </Typography>
      </Stack>

      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}
function EntityReferenceField({
  label,
  value,
  onOpenEntity,
  getEntity,
}: {
  label: string;
  value: unknown;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const entity = getEntity(value);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      {entity ? (
        <EntityReferenceLink
          entityId={value}
          onOpenEntity={onOpenEntity}
          getEntity={getEntity}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}
function TextListField({ label, value }: { label: string; value: unknown }) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Stack spacing={1} sx={{ mt: 0.75 }}>
        {items.map((item, index) => (
          <Box
            key={index}
            sx={{
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                lineHeight: 1.6,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
            >
              {item}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
function ReferenceField({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }

    return (
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>

        <Stack
          direction="row"
          sx={{
            gap: 0.75,
            mt: 0.5,
            flexWrap: "wrap",
          }}
        >
          {value.map((item, index) => (
            <Chip key={index} size="small" label={formatValue(item)} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {formatValue(value)}
      </Typography>
    </Box>
  );
}

function TextField({ value, fallback }: { value: unknown; fallback: string }) {
  if (typeof value !== "string" || value.trim() === "") {
    return (
      <Typography variant="body2" color="text.secondary">
        {fallback}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
      {value}
    </Typography>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return "";
}

function formatEntityType(type: string): string {
  return type.replaceAll("_", " ");
}
function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export default EntityDetailDrawer;
