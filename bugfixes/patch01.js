// ▶️ 1) When the player first jumps, mark that they’re in the “upward” phase
SystematicAPI.on("onPlayerJump", (player) => {
  player._jumpingUp = true;
});

// ▶️ 2) On every frame update, once vy ≥ 0 we know upward motion has ended
SystematicAPI.on("onUpdate", (player, keys) => {
  if (player.vy >= 0) {
    player._jumpingUp = false;
  }
});

// ▶️ 3) Prevent the engine’s ceiling‐snap only while we’re still moving upward
SystematicAPI.on("prePlayerTouchCeiling", (player, tx, ty, layer) => {
  // return true to *bypass* the default ceiling snap
  return player._jumpingUp;
});

// (Optional) ▶️ 4) Reset the flag on landing, just to be extra‐safe
SystematicAPI.on("onPlayerTouchGround", (player) => {
  player._jumpingUp = false;
});
