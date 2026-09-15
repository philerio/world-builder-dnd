import { useEffect, useState } from "react";

import type { EntitySummary } from "../types";

function useRelatedEntities(entityId: string | null) {
    const [entities, setEntities] = useState<EntitySummary[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!entityId) {
            setEntities([]);
            return;
        }

        let cancelled = false;

        setLoading(true);

        fetch(`http://localhost:8000/entities/${entityId}/related`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                return response.json();
            })
            .then((relatedEntities: EntitySummary[]) => {
                if (!cancelled) {
                    setEntities(relatedEntities);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setEntities([]);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [entityId]);

    return {
        entities,
        loading,
    };
}

export default useRelatedEntities;