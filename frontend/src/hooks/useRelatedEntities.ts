import { API_BASE_URL } from "../api";
import { useEffect, useState } from "react";

import type { EntitySummary } from "../types";
import { useWorldData } from "../context/WorldDataContext";

function useRelatedEntities(entityId: string | null) {
    const { worldData } = useWorldData();
    const [result, setResult] = useState<{
        entityId: string;
        entities: EntitySummary[];
    } | null>(null);

    useEffect(() => {
        if (!entityId) {
            return;
        }

        let cancelled = false;

        fetch(`${API_BASE_URL}/entities/${entityId}/related`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                return response.json();
            })
            .then((relatedEntities: EntitySummary[]) => {
                if (!cancelled) {
                    setResult({ entityId, entities: relatedEntities });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResult({ entityId, entities: [] });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [entityId, worldData]);

    const isCurrentResult = entityId !== null && result?.entityId === entityId;

    return {
        entities: isCurrentResult ? result.entities : [],
        loading: entityId !== null && !isCurrentResult,
    };
}

export default useRelatedEntities;
