import { useState } from "react";

function useEntityDrawer() {
    const [entityId, setEntityId] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);

    const openEntity = (id: string) => {
        setEntityId((currentId) => {
            if (currentId && currentId !== id) {
                setHistory((currentHistory) => [
                    ...currentHistory,
                    currentId,
                ]);
            }

            return id;
        });
    };

    const goBack = () => {
        setHistory((currentHistory) => {
            if (currentHistory.length === 0) {
                return currentHistory;
            }

            const previousId =
                currentHistory[currentHistory.length - 1];

            setEntityId(previousId);

            return currentHistory.slice(0, -1);
        });
    };

    const closeEntity = () => {
        setEntityId(null);
        setHistory([]);
    };

    return {
        entityId,
        isOpen: entityId !== null,
        canGoBack: history.length > 0,
        openEntity,
        goBack,
        closeEntity,
    };
}

export default useEntityDrawer;