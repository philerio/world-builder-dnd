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
import type { EntitySummary , EntityData} from "../types";


type WorldDataContextValue = {
  entities: EntitySummary[];
  entitiesLoading: boolean;
  entitiesError: string | null;

  getEntity: (entityId: string) => EntityData | undefined;
  loadEntity: (entityId: string) => Promise<EntityData>;
  loadEntities: (entityIds: string[]) => Promise<EntityData[]>;
  refreshEntities: () => Promise<void>;
  updateEntity: (
    entityId: string,
    entity: Record<string, unknown>,
  ) => Promise<EntityData>;
  createEntity: (
    entityType: string,
    entity: Record<string, unknown>,
  ) => Promise<EntityData>;
};

const WorldDataContext = createContext<WorldDataContextValue | undefined>(
  undefined,
);

type WorldDataProviderProps = {
  children: ReactNode;
};

export function WorldDataProvider({ children }: WorldDataProviderProps) {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [entityData, setEntityData] = useState<Record<string, EntityData>>({});
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);
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
  const refreshEntities = useCallback(async () => {
    try {
      setEntitiesLoading(true);
      setEntitiesError(null);

      const response = await fetch("http://localhost:8000/entities");

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: EntitySummary[] = await response.json();

      setEntities(data);
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
  }, [refreshEntities]);

  const getEntity = useCallback(
    (entityId: string) => entityData[entityId],
    [entityData],
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
        current.map((item) =>
          item.id === entityId
            ? {
                ...item,
                name:
                  typeof updatedEntity.entity.name === "string"
                    ? updatedEntity.entity.name
                    : item.name,
              }
            : item,
        ),
      );

      return updatedEntity;
    },
    [],
  );
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

      setEntities((current) => [
        ...current,
        {
          id: createdEntity.id,
          entity_type: createdEntity.entity_type,
          name:
            typeof createdEntity.entity.name === "string"
              ? createdEntity.entity.name
              : createdEntity.id,
        },
      ]);

      return createdEntity;
    },
    [],
  );
  const value = useMemo(
    () => ({
      entities,
      entitiesLoading,
      entitiesError,
      getEntity,
      loadEntity,
      loadEntities,
      refreshEntities,
      updateEntity,
      createEntity,
    }),
    [
      entities,
      entitiesLoading,
      entitiesError,
      getEntity,
      loadEntity,
      loadEntities,
      refreshEntities,
      updateEntity,
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
