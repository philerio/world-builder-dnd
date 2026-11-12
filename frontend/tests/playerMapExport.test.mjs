import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { afterEach, beforeEach, test } from "node:test";
import {
  flattenMapForPlayer,
  flattenMapPair,
  publishMapToCombat,
} from "../src/utils/playerMapExport.ts";

const originals = {
  document: globalThis.document,
  window: globalThis.window,
  Image: globalThis.Image,
  fetch: globalThis.fetch,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
};
let imageLoads;
let requests;
let failExport;
let spriteRequests;
let objectUrls;
let revokedUrls;
let failedSprite;
let failSpriteDecode;
class Canvas {
  width = 0;
  height = 0;
  operations = [];
  context = {
    fillStyle: "#000",
    globalCompositeOperation: "source-over",
    fillRect: () => this.operations.push({ fillRect: this.context.fillStyle }),
    fill: () =>
      this.operations.push({
        fill: this.context.fillStyle,
        composite: this.context.globalCompositeOperation,
      }),
    fillText: (text) => this.operations.push({ label: text }),
    drawImage: (source, ...bounds) =>
      this.operations.push(
        source instanceof Canvas
          ? { layer: source.record() }
          : { image: objectUrls.get(source.src) ?? source.src, bounds },
      ),
    measureText: (text) => ({ width: text.length * 10 }),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    roundRect() {},
    stroke: () => this.operations.push({ stroke: this.context.strokeStyle }),
    arc() {},
    save() {},
    restore() {},
    translate: (...values) => this.operations.push({ translate: values }),
    rotate: (value) => this.operations.push({ rotate: value }),
    scale: (...values) => this.operations.push({ scale: values }),
  };
  getContext() {
    return this.context;
  }
  record() {
    return {
      width: this.width,
      height: this.height,
      operations: this.operations,
    };
  }
  toBlob(callback, type) {
    callback(
      failExport ? null : new Blob([JSON.stringify(this.record())], { type }),
    );
  }
}
class SourceImage {
  naturalWidth = 4400;
  naturalHeight = 2200;
  set src(value) {
    this.url = value;
    imageLoads += 1;
    if (value.startsWith("blob:")) {
      this.naturalWidth = 200;
      this.naturalHeight = 100;
    }
    queueMicrotask(() =>
      failSpriteDecode && value.startsWith("blob:")
        ? this.onerror()
        : this.onload(),
    );
  }
  get src() {
    return this.url;
  }
}
const map = () => ({
  id: "dungeon-1",
  name: "Hidden Dungeon",
  image_path: "/dungeon.png",
  fog_of_war: { enabled: true, color: "#17191f" },
  markers: [
    {
      id: "public",
      type: "point",
      visible: true,
      label: "Entrance",
      x: 10,
      y: 10,
    },
    {
      id: "secret",
      type: "point",
      visible: true,
      dm_only: true,
      label: "Secret room",
      x: 80,
      y: 80,
    },
    {
      id: "hidden",
      type: "point",
      visible: false,
      label: "Disabled marker",
      x: 20,
      y: 20,
    },
    {
      id: "reveal",
      type: "area",
      visible: true,
      fog_reveal: true,
      points: [
        [0, 0],
        [20, 0],
        [20, 20],
      ],
    },
    {
      id: "mask",
      type: "area",
      visible: true,
      player_view_mask: true,
      points: [
        [5, 5],
        [10, 5],
        [10, 10],
      ],
    },
  ],
});
beforeEach(() => {
  imageLoads = 0;
  requests = [];
  failExport = false;
  spriteRequests = [];
  objectUrls = new Map();
  revokedUrls = [];
  failedSprite = undefined;
  failSpriteDecode = false;
  URL.createObjectURL = (blob) => {
    const url = `blob:test-${objectUrls.size}`;
    objectUrls.set(url, blob.sourceUrl);
    return url;
  };
  URL.revokeObjectURL = (url) => revokedUrls.push(url);
  globalThis.document = { createElement: () => new Canvas() };
  globalThis.window = { location: { origin: "http://localhost:5173" } };
  globalThis.Image = SourceImage;
  globalThis.fetch = async (url, options) => {
    if (options?.method !== "POST") {
      spriteRequests.push({ url, ...options });
      const blob = new Blob(["sprite"], { type: "image/png" });
      blob.sourceUrl = url;
      return {
        ok: !url.endsWith(failedSprite ?? "__none__"),
        status: 404,
        blob: async () => blob,
      };
    }
    requests.push({ url, ...options });
    return { ok: true };
  };
});
afterEach(() => {
  URL.createObjectURL = originals.createObjectURL;
  URL.revokeObjectURL = originals.revokeObjectURL;
  for (const key of ["document", "window", "Image", "fetch"]) {
    const value = originals[key];
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});
const labels = (image) =>
  image.operations.flatMap((operation) =>
    operation.label && !["•", "♜", "▦"].includes(operation.label)
      ? [operation.label]
      : [],
  );

test("paired exports use one source and identical bounds; only the player image contains fog and masks", async () => {
  const pair = await flattenMapPair(map());
  const player = JSON.parse(await pair.player.text());
  const dm = JSON.parse(await pair.dm.text());
  assert.equal(imageLoads, 1);
  assert.deepEqual([player.width, player.height], [4096, 2048]);
  assert.deepEqual([dm.width, dm.height], [player.width, player.height]);
  assert.deepEqual(labels(player), ["Entrance"]);
  assert.deepEqual(labels(dm), ["Entrance", "Secret room"]);
  assert.ok(
    player.operations.some((operation) =>
      operation.layer?.operations.some(
        (op) => op.composite === "destination-out",
      ),
    ),
  );
  assert.ok(
    player.operations.some((operation) => operation.fill === "#14161b"),
  );
  assert.equal(
    dm.operations.some(
      (operation) => operation.layer || operation.fill === "#14161b",
    ),
    false,
  );
});

test("point style colors survive both player and DM flattening", async () => {
  const source = map();
  source.fog_of_war.enabled = false;
  source.markers = [
    {
      id: "styled",
      type: "point",
      x: 50,
      y: 50,
      visible: true,
      icon: "castle",
      fill_color: "#80b8d9",
      hide_label: true,
    },
  ];
  const pair = await flattenMapPair(source);
  for (const blob of [pair.player, pair.dm]) {
    const image = JSON.parse(await blob.text());
    assert.ok(
      image.operations.some((operation) => operation.stroke === "#80b8d9"),
    );
  }
});

test("publishing sends the fogged and full images together with the stable map ID", async () => {
  await publishMapToCombat("http://localhost:3000", map());
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "http://localhost:3000/player/map/pair");
  assert.equal(requests[0].headers["X-Map-Id"], "dungeon-1");
  assert.equal(requests[0].headers["Content-Type"], "application/json");
  const body = JSON.parse(requests[0].body);
  const player = JSON.parse(Buffer.from(body.playerImage, "base64").toString());
  const dm = JSON.parse(Buffer.from(body.dmImage, "base64").toString());
  assert.deepEqual(labels(player), ["Entrance"]);
  assert.deepEqual(labels(dm), ["Entrance", "Secret room"]);
});

test("the legacy player-only exporter still omits DM markers and keeps fog masks", async () => {
  const player = JSON.parse(await (await flattenMapForPlayer(map())).text());
  assert.deepEqual(labels(player), ["Entrance"]);
  assert.ok(
    player.operations.some((operation) => operation.fill === "#14161b"),
  );
});

test("an outdated combat API produces an upgrade message without falling back to a full-map upload", async () => {
  globalThis.fetch = async (url) => {
    requests.push({ url });
    return { ok: false, status: 404 };
  };
  await assert.rejects(
    publishMapToCombat("http://localhost:3000", map()),
    /Update and restart/,
  );
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.endsWith("/player/map/pair"));
});

test("failed canvas exports never publish a partial pair", async () => {
  failExport = true;
  await assert.rejects(
    publishMapToCombat("http://localhost:3000", map()),
    /Could not export/,
  );
  assert.equal(requests.length, 0);
});

function spriteMap() {
  const value = map();
  Object.assign(value.markers[0], {
    icon_image: "/map-sprites/crystal.png",
    icon_size: 100,
    rotation: 90,
    mirror_x: true,
    mirror_y: true,
  });
  value.markers[1].icon_image = "/map-assets/secret.png";
  value.markers[2].icon_image = "/map-sprites/disabled.png";
  return value;
}

test("sprite exports fetch fresh CORS blobs once per pair and preserve aspect ratio and transforms", async () => {
  const pair = await flattenMapPair(spriteMap());
  const player = JSON.parse(await pair.player.text());
  const dm = JSON.parse(await pair.dm.text());
  assert.equal(imageLoads, 3);
  assert.deepEqual(spriteRequests, [
    {
      url: "/map-sprites/crystal.png",
      mode: "cors",
      cache: "no-store",
    },
    {
      url: "/map-assets/secret.png",
      mode: "cors",
      cache: "no-store",
    },
  ]);
  const sprite = player.operations.find((op) =>
    op.image?.endsWith("/crystal.png"),
  );
  const size = (100 * 4096) / 4400;
  assert.deepEqual(sprite.bounds, [-size / 2, -size / 4, size, size / 2]);
  assert.ok(player.operations.some((op) => op.rotate === Math.PI / 2));
  assert.ok(
    player.operations.some((op) => JSON.stringify(op.scale) === "[-1,-1]"),
  );
  assert.ok(
    player.operations.some(
      (op) => JSON.stringify(op.translate) === "[409.6,204.8]",
    ),
  );
  assert.equal(
    player.operations.some((op) => op.image?.endsWith("/secret.png")),
    false,
  );
  assert.ok(dm.operations.some((op) => op.image?.endsWith("/secret.png")));
  assert.equal(
    player.operations.some((op) => op.label === "•"),
    false,
  );
  assert.equal(
    dm.operations.some((op) => op.label === "•"),
    false,
  );
  assert.deepEqual(revokedUrls.sort(), [...objectUrls.keys()].sort());
});

test("player-only exports never request hidden or DM-only sprites", async () => {
  const player = JSON.parse(
    await (await flattenMapForPlayer(spriteMap())).text(),
  );
  assert.equal(spriteRequests.length, 1);
  assert.ok(player.operations.some((op) => op.image?.endsWith("/crystal.png")));
  assert.deepEqual(labels(player), ["Entrance"]);
});

test("missing public or DM-only sprites stop publishing instead of silently becoming circles", async () => {
  for (const path of ["/crystal.png", "/secret.png"]) {
    failedSprite = path;
    await assert.rejects(
      publishMapToCombat("http://localhost:3000", spriteMap()),
      (error) =>
        error.message.includes(path) &&
        /Could not load map sprite/.test(error.message),
    );
    assert.equal(requests.length, 0);
  }
});

test("sprite decode failures revoke blob URLs and leave the published pair untouched", async () => {
  failSpriteDecode = true;
  await assert.rejects(
    publishMapToCombat("http://localhost:3000", spriteMap()),
    /Could not load map sprite/,
  );
  assert.equal(requests.length, 0);
  assert.deepEqual(revokedUrls.sort(), [...objectUrls.keys()].sort());
});
