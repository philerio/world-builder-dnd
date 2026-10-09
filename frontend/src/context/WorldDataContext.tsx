/* eslint-disable react-hooks/set-state-in-effect */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EntityData, EntitySummary, WorldData } from "../types";
import { sortEntitiesByName } from "../utils/entityTags";


type WorldDataContextValue = {
  worldData: WorldData | null;
  worldDataLoading: boolean;
  worldDataError: string | null;
  refreshWorldData: () => Promise<void>;
  entities: EntitySummary[];
  entitiesLoading: boolean;
  entitiesError: string | null;

  getEntity: (entityId: string) => EntityData | undefined;
  loadEntity: (entityId: string) => Promise<EntityData>;
  loadEntities: (entityIds: string[]) => Promise<EntityData[]>;
  loadCampaignReferences: (campaignId: string) => Promise<EntitySummary[]>;
  refreshEntities: () => Promise<void>;
  updateEntity: (
    entityId: string,
    entity: Record<string, unknown>,
  ) => Promise<EntityData>;
  deleteEntity: (entityId: string) => Promise<void>;
  createEntity: (
    entityType: string,
    entity: Record<string, unknown>,
  ) => Promise<EntityData>;
};

const WorldDataContext = createContext<WorldDataContextValue | undefined>(
  undefined,
);

const ENTITY_COLLECTIONS: Record<string, keyof WorldData> = {
  continent: "continents",
  kingdom: "kingdoms",
  region: "regions",
  city: "cities",
  location: "locations",
  npc: "npcs",
  player_character: "player_characters",
  campaign: "campaigns",
  world_event: "world_events",
  timeline_event: "timeline_events",
  lore: "lores",
  artifact: "artifacts",
  map: "maps",
  world_story: "world_stories",
  dm_scratchpad_entry: "dm_scratchpad_entries",
};

const SORTED_WORLD_COLLECTIONS = [...new Set([...Object.values(ENTITY_COLLECTIONS), "worlds" as const])];

function sortWorldEntitiesByName(data: WorldData): WorldData {
  const sorted = { ...data };
  for (const key of SORTED_WORLD_COLLECTIONS) {
    const collection = sorted[key] as unknown as { name: string }[] | undefined;
    if (collection) {
      (sorted as unknown as Record<string, unknown>)[key] = sortEntitiesByName(collection);
    }
  }
  return sorted;
}

function updateWorldEntity(
  worldData: WorldData | null,
  entityType: string,
  entityId: string,
  entity: Record<string, unknown>,
  remove = false,
): WorldData | null {
  if (!worldData) return worldData;
  if (entityType === "world") {
    return { ...worldData, world: remove ? undefined : entity as WorldData["world"] };
  }

  const collectionKey = ENTITY_COLLECTIONS[entityType];
  if (!collectionKey) return worldData;

  const collection = (worldData[collectionKey] ?? []) as unknown as Record<string, unknown>[];
  const nextCollection = remove
    ? collection.filter((item) => item.id !== entityId)
    : collection.some((item) => item.id === entityId)
      ? collection.map((item) => item.id === entityId ? entity : item)
      : [...collection, entity];

  return sortWorldEntitiesByName({ ...worldData, [collectionKey]: nextCollection });
}

function findWorldEntityData(worldData: WorldData | null, entityId: string): EntityData | undefined {
  if (!worldData) return undefined;
  if (worldData.world?.id === entityId) {
    return { id: entityId, entity_type: "world", entity: worldData.world as unknown as Record<string, unknown> };
  }

  for (const [entityType, collectionKey] of Object.entries(ENTITY_COLLECTIONS)) {
    const collection = worldData[collectionKey] as unknown as { id: string }[] | undefined;
    const entity = collection?.find((item) => item.id === entityId);
    if (entity) {
      return { id: entityId, entity_type: entityType, entity: entity as Record<string, unknown> };
    }
  }

  return undefined;
}

type WorldDataProviderProps = {
  children: ReactNode;
};

export function WorldDataProvider({ children }: WorldDataProviderProps) {
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [worldDataLoading, setWorldDataLoading] = useState(true);
  const [worldDataError, setWorldDataError] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [entityData, setEntityData] = useState<Record<string, EntityData>>({});
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);
  const refreshWorldData = useCallback(async () => {
    try {
      setWorldDataLoading(true);
      setWorldDataError(null);
      const response = await fetch("http://localhost:8000/world");
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result: WorldData = await response.json();
      setWorldData(sortWorldEntitiesByName(result));
    } catch (error) {
      setWorldDataError(error instanceof Error ? error.message : "Failed to load world data.");
    } finally {
      setWorldDataLoading(false);
    }
  }, []);
  const loadEntity = useCallback(async (entityId: string) => {
    const response = await fetch(`http://localhost:8000/entities/${entityId}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result: EntityData = await response.json();

    setEntityData((current) => ({
      ...current,
      [entityId]: result,
    }));

    return result;
  }, []);
  const loadEntities = useCallback(
    async (entityIds: string[]) => {
      const results = await Promise.all(
        entityIds.map((entityId) => loadEntity(entityId)),
      );

      return results;
    },
    [loadEntity],
  );
  const loadCampaignReferences = useCallback(async (campaignId: string) => {
    const response = await fetch(`http://localhost:8000/campaigns/${campaignId}/references`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json() as EntitySummary[];
  }, []);
  const refreshEntities = useCallback(async () => {
    try {
      setEntitiesLoading(true);
      setEntitiesError(null);

      const response = await fetch("http://localhost:8000/entities");

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: EntitySummary[] = await response.json();

      setEntities(sortEntitiesByName(data));
    } catch (error) {
      setEntitiesError(
        error instanceof Error ? error.message : "Failed to load entities.",
      );
    } finally {
      setEntitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEntities();
    void refreshWorldData();
  }, [refreshEntities, refreshWorldData]);

  const getEntity = useCallback(
    (entityId: string) => entityData[entityId] ?? findWorldEntityData(worldData, entityId),
    [entityData, worldData],
  );

  const updateEntity = useCallback(
    async (entityId: string, entity: Record<string, unknown>) => {
      const response = await fetch(
        `http://localhost:8000/entities/${entityId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entity),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message =
          typeof result.detail === "string"
            ? result.detail
            : "Failed to update entity.";

        throw new Error(message);
      }

      const updatedEntity = result as EntityData;

      setEntityData((current) => ({
        ...current,
        [entityId]: updatedEntity,
      }));

      setEntities((current) =>
        sortEntitiesByName(current.map((item) =>
          item.id === entityId
            ? {
                ...item,
                name:
                  typeof updatedEntity.entity.name === "string"
                    ? updatedEntity.entity.name
                    : item.name,
              }
          : item,
        )),
      );
      setWorldData((current) =>
        updateWorldEntity(current, updatedEntity.entity_type, entityId, updatedEntity.entity),
      );

      return updatedEntity;
    },
    [],
  );
  const deleteEntity = useCallback(async (entityId: string) => {
    const entityType = entities.find((item) => item.id === entityId)?.entity_type
      ?? entityData[entityId]?.entity_type;
    const response = await fetch(`http://localhost:8000/entities/${entityId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      const message =
        typeof result.detail === "string"
          ? result.detail
          : "Failed to delete entity.";
      throw new Error(message);
    }

    setEntityData((current) => {
      const next = { ...current };
      delete next[entityId];
      return next;
    });
    setEntities((current) => sortEntitiesByName(current.filter((item) => item.id !== entityId)));
    if (entityType) {
      setWorldData((current) => updateWorldEntity(current, entityType, entityId, {}, true));
    }
  }, [entities, entityData]);
  const createEntity = useCallback(
    async (entityType: string, entity: Record<string, unknown>) => {
      const response = await fetch("http://localhost:8000/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          typeof result.detail === "string"
            ? result.detail
            : "Failed to create entity.";

        throw new Error(message);
      }

      const createdEntity = result as EntityData;

      setEntityData((current) => ({
        ...current,
        [createdEntity.id]: createdEntity,
      }));

      setEntities((current) => sortEntitiesByName([
        ...current,
        {
          id: createdEntity.id,
          entity_type: createdEntity.entity_type,
          name:
            typeof createdEntity.entity.name === "string"
              ? createdEntity.entity.name
              : createdEntity.id,
        },
      ]));
      setWorldData((current) =>
        updateWorldEntity(current, createdEntity.entity_type, createdEntity.id, createdEntity.entity),
      );

      return createdEntity;
    },
    [],
  );
  const value = useMemo(
    () => ({
      worldData,
      worldDataLoading,
      worldDataError,
      refreshWorldData,
      entities,
      entitiesLoading,
      entitiesError,
      getEntity,
      loadEntity,
      loadEntities,
      loadCampaignReferences,
      refreshEntities,
      updateEntity,
      deleteEntity,
      createEntity,
    }),
    [
      worldData,
      worldDataLoading,
      worldDataError,
      refreshWorldData,
      entities,
      entitiesLoading,
      entitiesError,
      getEntity,
      loadEntity,
      loadEntities,
      loadCampaignReferences,
      refreshEntities,
      updateEntity,
      deleteEntity,
      createEntity,
    ],
  );

  return (
    <WorldDataContext.Provider value={value}>
      {children}
    </WorldDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorldData() {
  const context = useContext(WorldDataContext);

  if (!context) {
    throw new Error("useWorldData must be used inside WorldDataProvider");
  }

  return context;
}
