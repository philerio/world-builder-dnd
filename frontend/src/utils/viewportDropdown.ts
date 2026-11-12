import type { Modifier } from "@popperjs/core";

// Leave room for list margins and the gap between the field and the popup.
export function dropdownListHeight(
  reference: { top: number; bottom: number },
  viewport: { offsetTop: number; height: number },
): number {
  const above = reference.top - viewport.offsetTop;
  const below = viewport.offsetTop + viewport.height - reference.bottom;
  return Math.max(0, Math.min(320, viewport.height - 32, Math.max(above, below) - 32));
}

export const viewportDropdownModifier: Modifier<"visibleViewport", Record<string, never>> = {
  name: "visibleViewport",
  enabled: true,
  phase: "beforeRead",
  fn({ state }) {
    const popup = state.elements.popper;
    const view = popup.ownerDocument.defaultView;
    if (!view) return;

    if (view.innerWidth > 899 && !view.matchMedia("(pointer: coarse)").matches) {
      popup.style.removeProperty("--world-builder-options-height");
      state.rects.popper.height = popup.offsetHeight;
      return;
    }

    const viewport = view.visualViewport ?? { offsetTop: 0, height: view.innerHeight };
    const height = dropdownListHeight(state.elements.reference.getBoundingClientRect(), viewport);
    popup.style.setProperty("--world-builder-options-height", `${height}px`);
    // Popper measured before running modifiers. Refresh the constrained height
    // so its flip/overflow modifiers position the resized list correctly.
    state.rects.popper.height = popup.offsetHeight;
  },
  effect({ state, instance }) {
    const view = state.elements.popper.ownerDocument.defaultView;
    const viewport = view?.visualViewport;
    const update = () => { void instance.update(); };
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    view?.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      view?.removeEventListener("resize", update);
      state.elements.popper.style.removeProperty("--world-builder-options-height");
    };
  },
};
