import { useEffect, useState } from "react";
import { removeEntityDraft, writeEntityDraft } from "../utils/entityDrafts";

type Options = {
  key: string;
  entityType: string;
  base: Record<string, unknown>;
  data: Record<string, unknown>;
  active: boolean;
  dirty: boolean;
};

export default function useDraftProtection({ key, entityType, base, data, active, dirty }: Options) {
  const [status, setStatus] = useState<"saved" | "unavailable" | null>(null);
  useEffect(() => {
    if (!active) return;
    if (!dirty) {
      removeEntityDraft(key);
      return;
    }
    const save = () => writeEntityDraft(key, { version: 1, entityType, base, data, savedAt: new Date().toISOString() });
    // The status reports whether synchronizing the draft to browser storage succeeded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(save() ? "saved" : "unavailable");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      save();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("beforeunload", beforeUnload); };
  }, [key, entityType, base, data, active, dirty]);
  return dirty ? status : null;
}
