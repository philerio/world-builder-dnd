/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import type { EntityData } from "../types";

export function useEntityRelated(entityId: string | null) {
  const [related, setRelated] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setRelated([]);
      return;
    }

    let cancelled = false;

    const loadRelated = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `http://localhost:8000/entities/${entityId}/related`,
        );

        if (!response.ok) {
          throw new Error("Failed to load related entities");
        }

        const result = (await response.json()) as EntityData[];

        if (!cancelled) {
          setRelated(result);
        }
      } catch (error) {
        console.error("Failed to load related entities:", error);

        if (!cancelled) {
          setRelated([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return {
    related,
    loading,
  };
}
