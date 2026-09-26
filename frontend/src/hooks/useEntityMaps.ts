/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";

type EntityMap = {
  id: string;
  name: string;
};

export function useEntityMaps(entityId: string | null) {
  const [maps, setMaps] = useState<EntityMap[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setMaps([]);
      return;
    }

    let cancelled = false;

    const loadMaps = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `http://localhost:8000/entities/${entityId}/maps`,
        );

        if (!response.ok) {
          throw new Error("Failed to load entity maps");
        }

        const result = (await response.json()) as EntityMap[];

        if (!cancelled) {
          setMaps(result);
        }
      } catch (error) {
        console.error("Failed to load entity maps:", error);

        if (!cancelled) {
          setMaps([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMaps();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return {
    maps,
    loading,
  };
}
