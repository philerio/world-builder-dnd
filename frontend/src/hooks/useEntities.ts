import { API_BASE_URL } from "../api";
import { useEffect, useState } from "react";

export type EntitySummary = {
  id: string;
  entity_type: string;
  name: string;
};

export function useEntities() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntities() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/entities`,
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: EntitySummary[] = await response.json();

        if (!cancelled) {
          setEntities(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load entities.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntities();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    entities,
    loading,
    error,
  };
}