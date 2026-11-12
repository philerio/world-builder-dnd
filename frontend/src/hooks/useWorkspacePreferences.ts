import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseWorkspacePreferences, subscribeWorkspace, workspaceSnapshot } from "../utils/workspacePreferences";

export default function useWorkspacePreferences(worldId: string) {
  const subscribe = useCallback((update: () => void) => subscribeWorkspace(worldId, update), [worldId]);
  const snapshot = useCallback(() => workspaceSnapshot(worldId), [worldId]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => parseWorkspacePreferences(raw), [raw]);
}
