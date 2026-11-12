import { useSyncExternalStore, type ReactNode } from "react";
import type { EditorDraft } from "../hooks/useEditorDraft";

/** Subscribe only the active form; saves read the same, current snapshot. */
export default function DraftEditor<T>({
  draft,
  children,
}: {
  draft: EditorDraft<T>;
  children: (value: T, setValue: EditorDraft<T>["set"]) => ReactNode;
}) {
  const value = useSyncExternalStore(draft.subscribe, draft.getSnapshot);
  return children(value, draft.set);
}
