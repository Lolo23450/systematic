// === 0) YOUR SPRITE DATA ===
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

// === 1) REGISTER THE TILE ===
const SPRING_TILE_ID = 99;
const FRICTIONLESS_FRAMES = 15;  // adjust for how long the boost lasts

SystematicAPI.registerTile({
  id: SPRING_TILE_ID,
  name: "Heavy Spring",
  sprite: heavySpringSprite,
  properties: { springVX: 50.0, springVY: 5.0 },
  category: "Physics"
});

SystematicAPI.registerTilePropertySchema(SPRING_TILE_ID, [
  { key: "springVX", label: "Launch Velocity X", type: "number", step: 0.1, default: 10.0, min: -50, max: 50 },
  { key: "springVY", label: "Launch Velocity Y", type: "number", step: 0.1, default: 10.0,  min:  0, max: 100 }
]);

// 2) On landing, stash vx, vy AND reset a friction timer
SystematicAPI.on("onPlayerTouchGround", (player, tx, ty, layer) => {
  const id = levels[currentLevel][ty]?.[tx]?.[layer];
  if (id !== SPRING_TILE_ID) return;

  // read values
  const schema = SystematicAPI.getTilePropertySchema(id);
  let vx = schema.find(f=>f.key==="springVX").default;
  let vy = schema.find(f=>f.key==="springVY").default;
  if (typeof SystematicAPI.getTileProperty==="function") {
    const oVX = SystematicAPI.getTileProperty(layer, tx, ty, "springVX");
    const oVY = SystematicAPI.getTileProperty(layer, tx, ty, "springVY");
    if (typeof oVX==="number") vx = oVX;
    if (typeof oVY==="number") vy = oVY;
  }

  // attach directly to player
  player._springLaunch = { vx, vy, frames: FRICTIONLESS_FRAMES };
});

// 3) After input, apply launch velocities and clear default vx/vy
SystematicAPI.on("onPostInput", (player, keys) => {
  if (!player._springLaunch) return;

  player.vx = player._springLaunch.vx;
  player.vy = -Math.abs(player._springLaunch.vy);
  // no delete here—keep for friction control
});

// 4) During update, if in spring window, zero friction and count down
SystematicAPI.on("onUpdate", (player, keys) => {
  const s = player._springLaunch;
  if (!s) return;

  // override friction so vx doesn’t drop
  player.friction = 0;
  s.frames--;

  // when done, remove the spring launch state
  if (s.frames <= 0) {
    delete player._springLaunch;
    // restore default friction (engine should have defaultGravity/friction internally)
    player.friction = undefined;
  }
});
