import assert from "node:assert/strict";
import { test } from "node:test";
import { dropdownListHeight, viewportDropdownModifier } from "../src/utils/viewportDropdown.ts";

test("keyboard shrinking the viewport limits the list to space above the field", () => {
  assert.equal(dropdownListHeight({ top: 200, bottom: 246 }, { offsetTop: 0, height: 300 }), 168);
});

test("viewport panning uses the visible top rather than the layout top", () => {
  assert.equal(dropdownListHeight({ top: 400, bottom: 446 }, { offsetTop: 300, height: 300 }), 122);
});

test("large screens cap the list and offscreen fields cannot exceed visible height", () => {
  assert.equal(dropdownListHeight({ top: 80, bottom: 126 }, { offsetTop: 0, height: 800 }), 320);
  assert.equal(dropdownListHeight({ top: 700, bottom: 746 }, { offsetTop: 0, height: 300 }), 268);
  assert.equal(dropdownListHeight({ top: 5, bottom: 51 }, { offsetTop: 0, height: 20 }), 0);
});

test("keyboard resize and pan update popup positioning, and listeners are cleaned up", () => {
  const viewport = new EventTarget();
  const view = new EventTarget();
  view.visualViewport = viewport;
  let updates = 0;
  let cleared = false;
  const cleanup = viewportDropdownModifier.effect({
    state: { elements: { popper: {
      ownerDocument: { defaultView: view },
      style: { removeProperty: () => { cleared = true; } },
    } } },
    instance: { update: () => { updates++; } },
  });
  viewport.dispatchEvent(new Event("resize"));
  viewport.dispatchEvent(new Event("scroll"));
  view.dispatchEvent(new Event("resize"));
  assert.equal(updates, 3);
  cleanup();
  viewport.dispatchEvent(new Event("resize"));
  viewport.dispatchEvent(new Event("scroll"));
  view.dispatchEvent(new Event("resize"));
  assert.equal(updates, 3);
  assert.equal(cleared, true);
});

test("sizing runs before placement and restores desktop sizing", () => {
  let height;
  const view = { innerWidth: 390, visualViewport: { offsetTop: 0, height: 300 }, matchMedia: () => ({ matches: false }) };
  const state = {
    elements: {
      reference: { getBoundingClientRect: () => ({ top: 200, bottom: 246 }) },
      popper: {
        ownerDocument: { defaultView: view },
        style: {
          setProperty: (_key, value) => { height = value; },
          removeProperty: () => { height = undefined; },
        },
        get offsetHeight() { return height ? Number.parseFloat(height) : 400; },
      },
    },
    rects: { popper: { height: 400 } },
  };
  viewportDropdownModifier.fn({ state });
  assert.equal(height, "168px");
  assert.equal(state.rects.popper.height, 168);
  view.innerWidth = 1200;
  viewportDropdownModifier.fn({ state });
  assert.equal(height, undefined);
  assert.equal(state.rects.popper.height, 400);
});
