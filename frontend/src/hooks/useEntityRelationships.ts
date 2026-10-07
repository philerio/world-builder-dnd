import { useEffect, useState } from "react";

import type { EntitySummary } from "../types";

type EntityRelationships = {
  outgoing: EntitySummary[];
  incoming: EntitySummary[];
};

function useEntityRelationships(entityId: string | null) {
  const [result, setResult] = useState<{
    entityId: string;
    relationships: EntityRelationships;
  } | null>(null);

  useEffect(() => {
    if (!entityId) return;

    let cancelled = false;

    fetch(`http://localhost:8000/entities/${entityId}/relationships`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json() as Promise<EntityRelationships>;
      })
      .then((relationships) => {
        if (!cancelled) setResult({ entityId, relationships });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ entityId, relationships: { outgoing: [], incoming: [] } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  const isCurrentResult = entityId !== null && result?.entityId === entityId;

  return {
    outgoing: isCurrentResult ? result.relationships.outgoing : [],
    incoming: isCurrentResult ? result.relationships.incoming : [],
    loading: entityId !== null && !isCurrentResult,
  };
}

export default useEntityRelationships;
