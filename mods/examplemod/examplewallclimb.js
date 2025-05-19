// ── CONFIG ────────────────────────────────────────────────
const CLIMB_SPEED = 1.5; // pixels per frame upward while climbing
const JUMP_VY = -10;

// ── STATE TRACKING ─────────────────────────────────────────
// Track if player is on a wall (left or right)
SystematicAPI.on("onPlayerTouchWallRight", player => {
  player._isOnWall = true;
});
SystematicAPI.on("onPlayerTouchWallLeft", player => {
  player._isOnWall = true;
});
SystematicAPI.on("onPlayerStopTouchWallRight", player => {
  player._isOnWall = false;
});
SystematicAPI.on("onPlayerStopTouchWallLeft", player => {
  player._isOnWall = false;
});

// ── PRE-HOOK TO KEEP VX WHEN JUMPING OFF WALLS ─────────────
SystematicAPI.on("prePlayerTouchWallRight", player => {
  // Cancel zeroing vx if jump key pressed
  return !!(keys["w"] || keys["ArrowUp"]);
});
SystematicAPI.on("prePlayerTouchWallLeft", player => {
  return !!(keys["w"] || keys["ArrowUp"]);
});

// ── WALL CLIMB LOGIC ON UPDATE ─────────────────────────────
SystematicAPI.on("onUpdate", (player, keys) => {
  if (player._isOnWall && (keys["w"] || keys["ArrowUp"])) {
    player.vy = -CLIMB_SPEED; // climb up the wall
  }
});

// ── PRE-HOOK TO CANCEL CEILING COLLISION WHILE CLIMBING ────
SystematicAPI.on("prePlayerTouchCeiling", (player) => {
  // Prevent the engine from zeroing vy when climbing up (holding W)
  return !(keys["w"] || keys["ArrowUp"]);
});
