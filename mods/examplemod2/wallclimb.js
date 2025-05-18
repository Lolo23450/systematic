!
SystematicAPI.on("onPlayerTouchWallRight", (player, tileX, tileY, layer) => {
    isTouchingWall = true;
});
SystematicAPI.on("onUpdate", (player, keys) => {
    if ((keys["w"] || keys["ArrowUp"])) {

    }
});