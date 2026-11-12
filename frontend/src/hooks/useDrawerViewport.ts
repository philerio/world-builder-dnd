import { useSyncExternalStore } from "react";

function snapshot(): string {
  if (typeof window === "undefined") return "";
  const viewport = window.visualViewport;
  return [window.innerWidth, viewport?.height ?? window.innerHeight, viewport?.offsetTop ?? 0, window.matchMedia("(pointer: coarse)").matches ? 1 : 0].join(",");
}

function subscribe(update: () => void) {
  const viewport = window.visualViewport;
  window.addEventListener("resize", update);
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  return () => {
    window.removeEventListener("resize", update);
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
  };
}

export default function useDrawerViewport() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  const [width, height, top, touch] = value.split(",").map(Number);
  return value && (width <= 899 || touch)
    ? { top, height, bottom: "auto" }
    : {};
}
