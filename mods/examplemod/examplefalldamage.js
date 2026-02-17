// == Systematic Example Mod ==
// Adds simple fall damage to the player.

(function() {
  // --- Configurable threshold and damage ---
  const FALL_DAMAGE_THRESHOLD = 10; // velocity (the higher, the more forgiving)
  const DAMAGE_PER_UNIT = 1;        // hearts per velocity unit above threshold

  // Add a simple health bar UI
  let health = 10;
  function renderHealth() {
    let bar = document.getElementById("falldamage-health");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "falldamage-health";
      bar.style.position = "fixed";
      bar.style.top = "10px";
      bar.style.left = "10px";
      bar.style.background = "#222c";
      bar.style.color = "#fff";
      bar.style.padding = "6px 12px";
      bar.style.borderRadius = "8px";
      bar.style.zIndex = 9999;
      bar.style.fontFamily = "monospace";
      document.body.appendChild(bar);
    }
    let hearts = "";
    for (let i = 0; i < 10; ++i) {
      hearts += i < health ? "❤️" : "🖤";
    }
    bar.innerHTML = `<b>Health:</b> ${hearts}`;
  }

  // Listen for landing events
  let lastVy = 0;
  SystematicAPI.on("onUpdate", (player) => {
    lastVy = player.vy;
  });

  SystematicAPI.on("onPlayerTouchGround", (player) => {
    // Only apply if falling fast enough
    if (lastVy > FALL_DAMAGE_THRESHOLD) {
      const damage = Math.ceil((lastVy - FALL_DAMAGE_THRESHOLD) * DAMAGE_PER_UNIT);
      health -= damage;
      if (health < 0) health = 0;
      renderHealth();
      // Optional: knock player upward a bit
      player.vy = -4;
    }
    // Reset health if dead
    if (health <= 0) {
      health = 10;
      renderHealth();
      // Respawn at start
      SystematicAPI.setPlayerPosition(2 * tileSize, 2 * tileSize);
    }
  });

  // Show health on load
  renderHealth();
})();