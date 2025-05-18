// 1. define the sprite
const heavySpringSprite = [
  [7,7,7,7,7,7,7,7,7,7],
  [7,7,7,7,7,7,7,7,7,7],
  [7,7,7,7,7,7,7,7,7,7],
  [7,2,2,2,2,2,2,2,2,7],
  [7,2,3,3,3,3,3,3,2,7],
  [7,7,7,1,1,0,7,7,7,7],
  [7,7,7,7,0,1,1,7,7,7],
  [7,7,7,1,1,0,7,7,7,7],
  [7,0,0,0,0,0,0,0,0,7],
  [7,0,1,1,1,1,1,1,0,7],
];

// 2. register the tile normally
SystematicAPI.registerTile({
  id: 99,
  name: "Heavy Spring",
  sprite: heavySpringSprite,
  properties: { bounce: 20 }
});

// 3. hook into the event separately
SystematicAPI.on("onPlayerTouchGround", (player, tx, ty, layer) => {
  const def = SystematicAPI.getTileDef(levels[currentLevel][ty]?.[tx]?.[layer]);
  if (def?.id === 99) {
    player.vy = -def.properties.bounce;
    animateTileOnce(layer, tx, ty, [25,24,23,26,26,99], 32);
  }
});