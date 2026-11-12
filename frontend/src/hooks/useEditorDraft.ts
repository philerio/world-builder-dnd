import { useState, type Dispatch, type SetStateAction } from "react";

export type EditorDraft<T> = {
  getSnapshot: () => T;
  set: Dispatch<SetStateAction<T>>;
  subscribe: (listener: () => void) => () => void;
};

/** Keep a page's unfinished form across workspace changes without re-rendering the page per key. */
export default function useEditorDraft<T>(initialValue: T): EditorDraft<T> {
  const [draft] = useState<EditorDraft<T>>(() => {
    let value = initialValue;
    const listeners = new Set<() => void>();
    return {
      getSnapshot: () => value,
      set: (update) => {
        const next =
          typeof update === "function"
            ? (update as (previous: T) => T)(value)
            : update;
        if (Object.is(value, next)) return;
        value = next;
        listeners.forEach((listener) => listener());
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  });
  return draft;
}
