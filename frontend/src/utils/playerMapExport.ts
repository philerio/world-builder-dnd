import type { Map as WorldMap, MapMarker } from "../types";

const MAX_DIMENSION = 4096;
const MAX_PIXELS = 16_000_000;

function imageUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith("/map-assets/") || path.startsWith("/map-sprites/"))
    return `http://localhost:8000${path}`;
  return new URL(path, window.location.origin).href;
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Could not load map image: ${path}`));
    image.src = imageUrl(path);
  });
}

async function loadSprite(path: string): Promise<HTMLImageElement> {
  let objectUrl: string | undefined;
  try {
    // Leaflet loads stamps without CORS. Bypass those cached image responses
    // and decode an explicitly fetched blob so the export canvas stays readable.
    const response = await fetch(imageUrl(path), {
      mode: "cors",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    objectUrl = URL.createObjectURL(await response.blob());
    return await loadImage(objectUrl);
  } catch (cause) {
    throw new Error(
      `Could not load map sprite "${path}". Check that the sprite is available in World Builder, then try publishing again.`,
      { cause }
    );
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function point(marker: MapMarker, width: number, height: number) {
  return { x: (marker.x / 100) * width, y: (marker.y / 100) * height };
}

function polygonPath(
  context: CanvasRenderingContext2D,
  marker: MapMarker,
  width: number,
  height: number
) {
  const points = marker.points ?? [];
  if (points.length < 2) return false;
  context.beginPath();
  context.moveTo((points[0][0] / 100) * width, (points[0][1] / 100) * height);
  points
    .slice(1)
    .forEach(([x, y]) => context.lineTo((x / 100) * width, (y / 100) * height));
  if (marker.type === "area") context.closePath();
  return true;
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  scale: number
) {
  const fontSize = Math.max(12, 17 * scale);
  context.font = `600 ${fontSize}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const paddingX = 7 * scale;
  const paddingY = 4 * scale;
  const width = context.measureText(label).width + paddingX * 2;
  const height = fontSize + paddingY * 2;
  context.fillStyle = "rgba(15, 17, 20, 0.92)";
  context.strokeStyle = "#c9a85b";
  context.lineWidth = Math.max(1, scale);
  context.beginPath();
  context.roundRect(x - width / 2, y - height / 2, width, height, 5 * scale);
  context.fill();
  context.stroke();
  context.fillStyle = "#fff";
  context.fillText(label, x, y);
}

function drawMarker(
  context: CanvasRenderingContext2D,
  marker: MapMarker,
  width: number,
  height: number,
  scale: number,
  stamps: Map<string, HTMLImageElement>
) {
  if (marker.player_view_mask || marker.fog_reveal) return;
  const fill = marker.fill_color || "#c9a85b";
  if (marker.type === "area" || marker.type === "path") {
    if (!polygonPath(context, marker, width, height)) return;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = fill;
    context.lineWidth =
      marker.type === "area" ? Math.max(2, 3 * scale) : Math.max(3, 6 * scale);
    context.globalAlpha =
      marker.fill_opacity ?? (marker.type === "area" ? 0.2 : 0.85);
    if (marker.type === "area") {
      context.fillStyle = fill;
      context.fill();
    }
    context.stroke();
    context.globalAlpha = 1;
    if (marker.type === "area" && marker.label && !marker.hide_label) {
      const center = (marker.points ?? []).reduce(
        (sum, [x, y]) => ({
          x: sum.x + x / (marker.points?.length ?? 1),
          y: sum.y + y / (marker.points?.length ?? 1),
        }),
        { x: 0, y: 0 }
      );
      drawLabel(
        context,
        marker.label,
        (center.x * width) / 100,
        (center.y * height) / 100,
        scale
      );
    }
    return;
  }

  const { x, y } = point(marker, width, height);
  const stamp = marker.icon_image ? stamps.get(marker.icon_image) : undefined;
  if (stamp) {
    const size = Math.min(8192, Math.max(1, marker.icon_size ?? 72)) * scale;
    // Match the editor's object-fit: contain rather than stretching rectangles.
    const fit = size / Math.max(stamp.naturalWidth, stamp.naturalHeight);
    const stampWidth = stamp.naturalWidth * fit;
    const stampHeight = stamp.naturalHeight * fit;
    context.save();
    context.translate(x, y);
    context.rotate(((marker.rotation ?? 0) * Math.PI) / 180);
    context.scale(marker.mirror_x ? -1 : 1, marker.mirror_y ? -1 : 1);
    context.drawImage(
      stamp,
      -stampWidth / 2,
      -stampHeight / 2,
      stampWidth,
      stampHeight
    );
    context.restore();
  } else {
    const radius = Math.max(9, 14 * scale);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(18, 18, 18, 0.94)";
    context.fill();
    context.strokeStyle = "#c9a85b";
    context.lineWidth = Math.max(2, 3 * scale);
    context.stroke();
    context.fillStyle = "#e0bd69";
    context.font = `bold ${Math.max(10, 15 * scale)}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      marker.icon === "castle" ? "♜" : marker.icon === "city" ? "▦" : "•",
      x,
      y
    );
  }
  if (marker.label && !marker.hide_label) {
    drawLabel(
      context,
      marker.label,
      x,
      y +
        (marker.icon_image
          ? ((marker.icon_size ?? 72) * scale) / 2 + 13 * scale
          : 24 * scale),
      scale
    );
  }
}

async function loadMapSource(map: WorldMap) {
  const source = map.image_path ? await loadImage(map.image_path) : undefined;
  const sourceWidth = source?.naturalWidth || map.canvas_width || 1000;
  const sourceHeight = source?.naturalHeight || map.canvas_height || 700;
  const scale = Math.min(
    1,
    MAX_DIMENSION / sourceWidth,
    MAX_DIMENSION / sourceHeight,
    Math.sqrt(MAX_PIXELS / (sourceWidth * sourceHeight))
  );
  const width = Math.max(1, Math.floor(sourceWidth * scale));
  const height = Math.max(1, Math.floor(sourceHeight * scale));
  return { source, width, height, scale };
}

async function flattenMap(
  map: WorldMap,
  image: Awaited<ReturnType<typeof loadMapSource>>,
  audience: "player" | "dm",
  spriteCache = new globalThis.Map<string, Promise<HTMLImageElement>>()
): Promise<Blob> {
  const { source, width, height, scale } = image;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a map image renderer.");
  context.fillStyle = "#e8e1d0";
  context.fillRect(0, 0, width, height);
  if (source) context.drawImage(source, 0, 0, width, height);

  const visibleMarkers = [...map.markers]
    .filter(
      (marker) =>
        marker.visible &&
        (audience === "dm" || !marker.dm_only) &&
        !marker.player_view_mask &&
        !marker.fog_reveal
    )
    .sort((left, right) => (left.z_index ?? 0) - (right.z_index ?? 0));
  const maskMarkers = map.markers.filter(
    (marker) =>
      marker.visible && marker.type === "area" && marker.player_view_mask
  );
  const revealMarkers = map.markers.filter(
    (marker) => marker.visible && marker.type === "area" && marker.fog_reveal
  );
  const stamps = new globalThis.Map<string, HTMLImageElement>();
  const stampPaths = [
    ...new Set(
      visibleMarkers.flatMap((marker) =>
        marker.icon_image ? [marker.icon_image] : []
      )
    ),
  ];
  await Promise.all(
    stampPaths.map(async (path) => {
      let sprite = spriteCache.get(path);
      if (!sprite) {
        sprite = loadSprite(path);
        spriteCache.set(path, sprite);
      }
      // Assigned sprites must render successfully before either image is sent.
      stamps.set(path, await sprite);
    })
  );

  visibleMarkers.forEach((marker) =>
    drawMarker(context, marker, width, height, scale, stamps)
  );

  if (audience === "player" && map.fog_of_war?.enabled) {
    const fogCanvas = document.createElement("canvas");
    fogCanvas.width = width;
    fogCanvas.height = height;
    const fogContext = fogCanvas.getContext("2d");
    if (!fogContext) throw new Error("Could not create the fog of war layer.");
    fogContext.fillStyle = map.fog_of_war.color || "#17191f";
    fogContext.fillRect(0, 0, width, height);
    fogContext.globalCompositeOperation = "destination-out";
    revealMarkers.forEach((marker) => {
      if (polygonPath(fogContext, marker, width, height)) fogContext.fill();
    });
    fogContext.globalCompositeOperation = "source-over";
    context.drawImage(fogCanvas, 0, 0);
  }

  // Explicit mask areas stay hidden even inside a revealed region.
  if (audience === "player")
    maskMarkers.forEach((marker) => {
      if (!polygonPath(context, marker, width, height)) return;
      context.fillStyle = "#14161b";
      context.fill();
      context.strokeStyle = "#454a54";
      context.lineWidth = Math.max(1, 2 * scale);
      context.stroke();
    });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Could not export the flattened map image.")),
      "image/png"
    );
  });
}

export async function flattenMapForPlayer(map: WorldMap): Promise<Blob> {
  return flattenMap(map, await loadMapSource(map), "player");
}

export async function flattenMapPair(
  map: WorldMap
): Promise<{ player: Blob; dm: Blob }> {
  const source = await loadMapSource(map);
  const spriteCache = new globalThis.Map<string, Promise<HTMLImageElement>>();
  const [player, dm] = await Promise.all([
    flattenMap(map, source, "player", spriteCache),
    flattenMap(map, source, "dm", spriteCache),
  ]);
  return { player, dm };
}

async function imageBase64(image: Blob): Promise<string> {
  if (image.size > 10 * 1024 * 1024)
    throw new Error("Each exported map image must be 10 MB or smaller.");
  const bytes = new Uint8Array(await image.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function publishMapToCombat(
  apiUrl: string,
  map: WorldMap
): Promise<void> {
  const images = await flattenMapPair(map);
  const [playerImage, dmImage] = await Promise.all([
    imageBase64(images.player),
    imageBase64(images.dm),
  ]);
  const response = await fetch(`${apiUrl}/player/map/pair`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Map-Name": encodeURIComponent(map.name),
      "X-Map-Id": encodeURIComponent(map.id),
    },
    body: JSON.stringify({ playerImage, dmImage }),
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "Update and restart the DnDGameTool API to publish paired DM/player maps."
      );
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(
      body.error ?? body.message ?? `DnDGameTool returned ${response.status}.`
    );
  }
}
