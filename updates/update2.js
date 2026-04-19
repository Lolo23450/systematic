// ============================================================
// UPDATE 2  —  Speed Pads, Slow Mud, Torch lights
// ============================================================

// Track torch lights by world position so they can be removed
const torchLights = {}; // key: "worldX,worldY" → light object

// ─── Sprites ────────────────────────────────────────────────

const speedPadSprite = [
  [1,0,0,1,4,4,1,0,0,1],
  [0,3,4,0,0,0,0,4,3,0],
  [0,4,1,0,2,2,0,1,4,0],
  [1,0,0,0,3,2,0,0,0,1],
  [4,0,2,2,3,3,3,2,0,4],
  [4,0,2,3,3,3,2,2,0,4],
  [1,0,0,0,2,3,0,0,0,1],
  [0,4,1,0,2,2,0,1,4,0],
  [0,3,4,0,0,0,0,4,3,0],
  [1,0,0,1,4,4,1,0,0,1]
];

const slowMudSprite = [
  [0,1,1,4,4,4,4,1,1,0],
  [1,1,0,0,0,0,0,0,1,1],
  [1,0,0,1,2,3,1,0,0,1],
  [4,0,1,3,2,2,3,1,0,4],
  [4,0,3,2,0,0,2,2,0,4],
  [4,0,2,2,0,0,2,3,0,4],
  [4,0,1,3,2,2,3,1,0,4],
  [1,0,0,1,3,2,1,0,0,1],
  [1,1,0,0,0,0,0,0,1,1],
  [0,1,1,4,4,4,4,1,1,0]
];

const torchSprite = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,2,2,2,2,2,2,1,0],
  [1,2,3,3,3,3,3,3,2,1],
  [1,2,3,4,4,4,4,3,2,1],
  [1,2,3,4,5,5,4,3,2,1],
  [1,2,3,4,5,5,4,3,2,1],
  [1,2,3,4,4,4,4,3,2,1],
  [1,2,3,3,3,3,3,3,2,1],
  [0,1,2,2,2,2,2,2,1,0],
  [0,0,1,1,1,1,1,1,0,0]
];

// ─── Register Tiles ─────────────────────────────────────────

SystematicAPI.registerTile({
  id: 101,
  name: "Speed Boost Pad",
  category: "Update 1",
  sprite: speedPadSprite,
  properties: { boost: 2.2, duration: 350 }
});

SystematicAPI.registerTile({
  id: 102,
  name: "Slowing Mud",
  category: "Update 1",
  sprite: slowMudSprite,
  properties: { slowFactor: 0.4, duration: 800 }
});

SystematicAPI.registerTile({
  id: 103,
  name: "Torch",
  category: "Update 1",
  sprite: torchSprite,
  properties: { TRANSPARENT: true }
});

// ─── Torch: place light ──────────────────────────────────────

SystematicAPI.on("onTilePlaced", (x, y, layer, newTile) => {
  if (newTile !== 103) return;
  const key = `${x},${y}`;
  // Remove any existing light at this position (e.g. re-placing a torch)
  if (torchLights[key]) {
    const idx = SystematicAPI.lights.indexOf(torchLights[key]);
    if (idx !== -1) SystematicAPI.lights.splice(idx, 1);
  }
  const light = SystematicAPI.addLight({
    x: x + 15,
    y: y + 10,
    radius: 200,
    color: "#ffcc57",
    intensity: 1
  });
  torchLights[key] = light;
});

// ─── Torch: remove light ─────────────────────────────────────

SystematicAPI.on("onTileRemoved", (x, y, layer, oldTile) => {
  if (oldTile !== 103) return;
  const key = `${x},${y}`;
  if (torchLights[key]) {
    const idx = SystematicAPI.lights.indexOf(torchLights[key]);
    if (idx !== -1) SystematicAPI.lights.splice(idx, 1);
    delete torchLights[key];
  }
});

// ─── Speed / Slow Pad: detect ground tile ────────────────────
// onPlayerTouchGround fires when the player lands; we look up
// the tile directly beneath the player's feet to find pad tiles.

SystematicAPI.on("onPlayerTouchGround", (player) => {
  // Tile directly below the player's feet (terrain layer = 1)
  const tx     = Math.floor((player.x + player.width / 2) / tileSize);
  const ty     = Math.floor((player.y + player.height)    / tileSize);
  const tileId = levels[currentLevel][ty]?.[tx]?.[1];
  if (!tileId) return;

  const def = SystematicAPI.getTileDef(tileId);
  if (!def) return;

  const now = performance.now();

  if (def.id === 101) {
    // Speed Boost Pad — grant a burst; keep refreshing while standing on it
    player._boostUntil = now + def.properties.duration;
    animateTileOnce(1, tx, ty, [101], 16);
  }

  if (def.id === 102) {
    // Slowing Mud — keep refreshing slow while standing on it
    player._slowUntil = now + def.properties.duration;
    animateTileOnce(1, tx, ty, [102], 16);
  }
});

// ─── Speed / Slow Pad: apply vx modifier BEFORE movement ─────
// onPostInput now fires before player.x += player.vx (fixed in core.js),
// so multiplying vx here takes effect on the current frame.

SystematicAPI.on("onPostInput", (player, keys) => {
  const now = performance.now();

  if (player._boostUntil > now) {
    const boost = SystematicAPI.getTileDef(101).properties.boost;
    if (player.vx !== 0) player.vx *= boost;
  }

  if (player._slowUntil > now) {
    const slow = SystematicAPI.getTileDef(102).properties.slowFactor;
    player.vx *= slow;
  }
});
