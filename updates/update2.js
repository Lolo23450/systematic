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

SystematicAPI.registerTile({
  id: 101,
  name: "Speed Boost Pad",
  category: "Update 1",
  sprite: speedPadSprite,
  properties: {
    boost: 2,         // multiplier for horizontal speed
    duration: 300     // ms of boost effect
  }
});
SystematicAPI.registerTile({
  id: 102,
  name: "Slowing Pad",
  category: "Update 1",
  sprite: slowMudSprite,
  properties: {
    slowFactor: 0.5,  // horizontal speed multiplier
    duration: 1000    // ms of slow effect
  }
});

SystematicAPI.registerTile({
  id: 103,
  name: "Torch",
  category: "Update 1",
  sprite: [
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [1, 2, 3, 3, 3, 3, 3, 3, 2, 1],
    [1, 2, 3, 4, 4, 4, 4, 3, 2, 1],
    [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
    [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
    [1, 2, 3, 4, 4, 4, 4, 3, 2, 1],
    [1, 2, 3, 3, 3, 3, 3, 3, 2, 1],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0]
  ],
  properties: {
    TRANSPARENT: true // Custom property to indicate this tile doesn't block light
  }
})

SystematicAPI.on("onTilePlaced", (x, y, layer, newTile) => {
  if (newTile === 103) {
    // If a torch is placed, also place a light source on the same tile
    // light structure: { x, y, radius, color, intensity }
    SystematicAPI.addLight({
      x: x + 15,
      y: y + 10,
      radius: 200,
      color: "#ffcc57",
      intensity: 1
    });
  }
});

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
