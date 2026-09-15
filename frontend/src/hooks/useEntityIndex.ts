import { useEffect, useState } from "react";
import type { EntitySummary } from "../types";

function useEntityIndex() {
    const [entities, setEntities] = useState<EntitySummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        fetch("http://localhost:8000/entities")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                return response.json();
            })
            .then((entityData: EntitySummary[]) => {
                if (!cancelled) {
                    setEntities(entityData);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const getEntity = (id: string): EntitySummary | undefined => {
        return entities.find((entity) => entity.id === id);
    };

    return {
        entities,
        loading,
        getEntity,
    };
}

export default useEntityIndex;