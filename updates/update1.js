// ── CONFIG ────────────────────────────────────────────────
const CLIMB_SPEED = -2.5; // Negative is UP in this engine

// ── STATE TRACKING ─────────────────────────────────────────
SystematicAPI.on("onPlayerTouchWallRight", player => { player._isOnWall = true; });
SystematicAPI.on("onPlayerTouchWallLeft", player => { player._isOnWall = true; });

SystematicAPI.on("onPlayerStopTouchWallRight", player => { player._isOnWall = false; });
SystematicAPI.on("onPlayerStopTouchWallLeft", player => { player._isOnWall = false; });

// ── PRE-HOOKS ──────────────────────────────────────────────
SystematicAPI.on("prePlayerTouchWallRight", (player) => {
  // Allow the player to keep horizontal momentum if they are jumping/climbing
  return (keys["w"] || keys["ArrowUp"]);
});

SystematicAPI.on("prePlayerTouchWallLeft", (player) => {
  return (keys["w"] || keys["ArrowUp"]);
});

SystematicAPI.on("prePlayerTouchCeiling", (player) => {
  // Allow passing through the "bottom" of a tile corner while climbing
  if (player._isOnWall && (keys["w"] || keys["ArrowUp"])) {
    return false; 
  }
});

// ── UPDATE LOGIC ───────────────────────────────────────────
SystematicAPI.on("onUpdate", (player, keys) => {
  const isPressingUp = keys["w"] || keys["ArrowUp"];

  // FIX: Only apply climb speed if we are NOT on the ground.
  // This allows the Engine's jump (-10) to work normally.
  if (player._isOnWall && isPressingUp && !player.onGround) {
    
    // Optional: Only apply if we aren't already moving up faster (like from a jump)
    // This makes the transition from jump to climb smooth.
    if (player.vy > CLIMB_SPEED) {
        player.vy = CLIMB_SPEED;
    }
  }
});