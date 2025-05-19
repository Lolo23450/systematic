// 1️⃣ Define two new sprites (10×10 palettes indices)
const speedPadSprite = [
[
  1,
  0,
  0,
  1,
  4,
  4,
  1,
  0,
  0,
  1
],
[
  0,
  3,
  4,
  0,
  0,
  0,
  0,
  4,
  3,
  0
],
[
  0,
  4,
  1,
  0,
  2,
  2,
  0,
  1,
  4,
  0
],
[
  1,
  0,
  0,
  0,
  3,
  2,
  0,
  0,
  0,
  1
],
[
  4,
  0,
  2,
  2,
  3,
  3,
  3,
  2,
  0,
  4
],
[
  4,
  0,
  2,
  3,
  3,
  3,
  2,
  2,
  0,
  4
],
[
  1,
  0,
  0,
  0,
  2,
  3,
  0,
  0,
  0,
  1
],
[
  0,
  4,
  1,
  0,
  2,
  2,
  0,
  1,
  4,
  0
],
[
  0,
  3,
  4,
  0,
  0,
  0,
  0,
  4,
  3,
  0
],
[
  1,
  0,
  0,
  1,
  4,
  4,
  1,
  0,
  0,
  1
]
];

const slowMudSprite = [
[
  0,
  1,
  1,
  4,
  4,
  4,
  4,
  1,
  1,
  0
],
[
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1
],
[
  1,
  0,
  0,
  1,
  2,
  3,
  1,
  0,
  0,
  1
],
[
  4,
  0,
  1,
  3,
  2,
  2,
  3,
  1,
  0,
  4
],
[
  4,
  0,
  3,
  2,
  0,
  0,
  2,
  2,
  0,
  4
],
[
  4,
  0,
  2,
  2,
  0,
  0,
  2,
  3,
  0,
  4
],
[
  4,
  0,
  1,
  3,
  2,
  2,
  3,
  1,
  0,
  4
],
[
  1,
  0,
  0,
  1,
  3,
  2,
  1,
  0,
  0,
  1
],
[
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1
],
[
  0,
  1,
  1,
  4,
  4,
  4,
  4,
  1,
  1,
  0
]
];

// 2️⃣ Register the tiles
SystematicAPI.registerTile({
  id: 101,
  name: "Speed Boost Pad",
  category: "Example Mod",
  sprite: speedPadSprite,
  properties: {
    boost: 2,         // multiplier for horizontal speed
    duration: 300     // ms of boost effect
  }
});
SystematicAPI.registerTile({
  id: 102,
  name: "Slowing Pad",
  category: "Example Mod",
  sprite: slowMudSprite,
  properties: {
    slowFactor: 0.5,  // horizontal speed multiplier
    duration: 1000    // ms of slow effect
  }
});

// 3️⃣ Hooks for stepping on those tiles
SystematicAPI.on("onPlayerTouchGround", (player, tx, ty, layer) => {
  const def = SystematicAPI.getTileDef(
    levels[currentLevel][ty]?.[tx]?.[layer]
  );
  if (!def) return;

  const now = performance.now();

  if (def.id === 101) {
    // Speed Boost Pad: give a one-time speed burst
    player._boostUntil = now + def.properties.duration;
    animateTileOnce(layer, tx, ty, [101], 16);
  }

  if (def.id === 102) {
    // Slowing Mud: apply slow for a duration
    player._slowUntil = now + def.properties.duration;
    animateTileOnce(layer, tx, ty, [102], 16);
  }
});

// 4️⃣ Apply those effects when computing velocity
SystematicAPI.on("onPostInput", (player, keys) => {
  const now = performance.now();

  // If boost is active, multiply vx
  if (player._boostUntil > now) {
    player.vx *= SystematicAPI.getTileDef(101).properties.boost;
  }

  // If slow is active, multiply vx
  if (player._slowUntil > now) {
    player.vx *= SystematicAPI.getTileDef(102).properties.slowFactor;
  }
});
