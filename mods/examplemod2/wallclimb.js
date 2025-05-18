SystematicAPI.on("onPlayerTouchWallRight", (player, tileX, tileY, layer) => {
    isTouchingWall = true;
});
SystematicAPI.on("onPlayerStopTouchWallRight", (player, tileX, tileY, layer) => {
    isTouchingWall = false;
});
SystematicAPI.on("onUpdate", (player, keys) => {
    if ((keys["w"] || keys["ArrowUp"]) && isTouchingWall) {
        player.vy               = jumpPower;
        player._jumpCount      += 1;
        player._lastJumpTime    = now;
    }
});