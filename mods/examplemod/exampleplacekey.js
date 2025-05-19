const BUILD_KEY    = "b";
const BUILD_LAYER  = 1;
const BUILD_TILE_ID = 36;

let prevBuildKey = false;

SystematicAPI.on("onUpdate", (player, keys) => {
  const down = !!keys[BUILD_KEY];
  // detect *just pressed* (down now, up last frame)
  if (down && !prevBuildKey) {
    const tx = Math.floor((player.x + player.width/2)  / tileSize);
    const ty = Math.floor((player.y + player.height+1) / tileSize);

    levels[currentLevel][ty][tx][BUILD_LAYER] = BUILD_TILE_ID;
    animateTileOnce(BUILD_LAYER, tx, ty, [BUILD_TILE_ID], 1);
  }
  prevBuildKey = down;
});
