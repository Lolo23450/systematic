# Systematic  
https://lolo23450.github.io/systematic/  
A web-based **pixel platformer level editor** and playtester—fully in your browser. Create, edit, sprite, and play your own 2D platformer levels without writing a single line of engine code!

---

## Features

- **Tile Palette & Tile Categories**  
  - 30+ tiles organized into categories  
  - Live‐expandable via UI  
  ![Palette UI](assets/readme-imgs/tilepalette.png)

- **Grid-based Editing**  
  - Paint terrain, background, objects, spikes, bounce pads, platforms, text tiles, and more  
  - Click-and-drag painting; right-click for per-tile properties  
  ![Grid](assets/readme-imgs/grid.png)

- **Multi-level Support**  
  - Create, navigate, rename, and delete levels  
  - All levels can be exported/imported as JSON  

- **Custom Color Palettes**  
  - 10+ built-in palettes (Forest, Desert, Tundra, Swamp, …)  
  - Live preview & swatch picker in sprite editor  
  ![Color Palettes](assets/readme-imgs/colorpalettes.png)

- **Layered Editing**  
  - Background & terrain layers (plus extensible object layer)  
  - Control visibility, paint order, and per-tile schemas  
  ![Layers](assets/readme-imgs/layers.png)

- **Playtest Mode**  
  - Switch between **Edit** & **Play** instantly  
  - Built-in physics: gravity, jump, one-way platforms, bounce pads, spikes  

- **Sprite Editor**  
  - Draw new 10×10 pixel sprites, assign palette indices, name them  
  - Import & merge external sprite JSON  
  ![Sprite Editor](assets/readme-imgs/spriteeditor.png)

- **Custom Tile Properties**  
  - Bounce pads: adjustable jump strength  
  - One-way platforms: toggle “allow drop” (press S)  
  - Extendable schema for new tile types  

- **Open-source & Attribution**  
  - Licensed under MIT—free to use, modify, share with credit  

---

## Level Persistence & Sharing

### Auto-Save in Browser  
- Edits (painting, adding/removing levels, property changes) are saved automatically to `localStorage`.  
- On page load, your last session is restored—no extra clicks needed.

### Export/Import JSON  
- **Save All Levels** downloads a `levels.json` file containing every level.  
- **Load All Levels** lets you pick a `.json` file to import—levels overwrite your current work and become your new auto-save.

### Shareable & Bookmarkable URLs  
- Your entire level set is compressed (via LZ-String) and encoded into the URL hash.  
- As you edit, the URL updates in real-time—copy/paste to share your exact levels!  
- Opening someone’s link decodes the hash and loads their levels instantly, no file download required.

### Online Levels
- You can publish levels and share them using an unique name.
- Once your level is published, you can share that name and other players with that name will be able to load it using the Load Shared Level Button.
- Or you can find it in the level browser.
  ![Level Browser](assets/readme-imgs/levelbrowser.png)

## Installation

1. Clone or download this repo  
2. Open `index.html` in any modern browser (no build step required)  

---

## Controls

### Editor Mode  
- **Left-click & drag**: paint current tile  
- **Right-click**: open tile properties sidebar  
- **Mouse wheel**: zoom in/out  
- **Arrow keys / WASD**: pan camera
- **Ctrl+Z / Ctrl+Y**: Undo / Redo

### Toolbar  
- **Tile Search**: filter brushes by name or ID  
- **Category**: switch brush groups  
- **Palette**: change colors  
- **Layer**: select edit layer  
- **🖌️**: open sprite editor  
- **📂**: import external sprites  

### Level Controls  
- **← Prev / Next →**: switch levels  
- **+ Add Level**: create a blank level  
- **Save All Levels**: download JSON & auto-save in browser  
- **Load All Levels**: import JSON from disk  
- **Restore Last Save**: reload from browser storage  
- **Upload Level**: uploads your level
- **Load Shared Level**: loads a level
### Playtest Mode  
- **W / ↑**: jump  
- **A / ←**, **D / →**: move  
- **S / ↓**: drop through one-ways  

---

## Modding Guide

### Overview

This game provides an API and a system of hooks that allow you to extend and customize gameplay behavior. Mods can respond to in-game events, modify player state, or add new mechanics without changing the core game code.

### Hooks

Hooks are functions that the game engine calls at specific points during gameplay. You can register your own functions to these hooks via the `SystematicAPI.on` method.

Common hooks include:

* **`onUpdate(player, keys)`**
  Called every frame during the game update. Provides access to the current player object and the state of input keys.

* **`onPreInput(player, keys)`**
  Fires before you even process movement input each frame. Perfect for mods that want to override or inject custom controls.

* **`onPostInput(player, keys)`**
  Fires after you player.vx & player.vy from input, but before physics. Great for mods that tweak velocities.
  
* **`onPostPhysicsCollision(player, keys)`**
  Fires after the physics and collision are handled, but before special tile collisions, and before setting the final player position. Great for correcting or tweaking the player's        final position before any custom tile physics / collisions

* **`onPostSpecialPhysicsCollision(player, keys)`**
  Fires after the collision and special tile collision are handled, but before setting the final player position. Great for correcting or tweaking the player's final final position 
  after custom tile physics / collisions
  
* **`onPlayerJump(player)`**
  Called when the player performs a jump, returns player attributes like x, y, vx, vy, height, width, etc
  
* **`onPlayerTouchGround(player)`**
  Called when the player lands on the ground, returns player attributes like x, y, vx, vy, height, width, etc

* **`onPlayerTouchWallRight(player, tileX, tileY, layer)`**
  Called when the player touches a wall on the right, returns player attributes like x, y, vx, vy, height, width, etc, and where the event happened (tx,ty,layer).

* **`onPlayerTouchWallLeft(player, tileX, tileY, layer)`**
  Called when the player touches a wall on the left, returns player attributes like x, y, vx, vy, height, width, etc, and where the event happened (tx,ty,layer).

* **`onPlayerBounce(player, tileX, tileY, layer)`**
  Called when the player bounces on a spring, returns player attributes like x, y, vx, vy, height, width, etc, and where the event happened (tx,ty,layer).

* **`onKeyDown(key)`**
  Called when a key is pressed, returns the key pressed.


### Player Object

The player object includes properties such as:

* `x`, `y`: Position coordinates.
* `vx`, `vy`: Velocity components.
* `width`, `height`: Size dimensions.
* `onGround`: Boolean indicating whether the player is on the ground.
* Custom properties can be added as needed for your mod.

### Example: Adding Double Jump

Below is a simplified example of adding double jump functionality using hooks:

```js
const DOUBLE_JUMP_DELAY = 250;
const jumpPower = -10

// Reset jump count & record time on first jump
SystematicAPI.on("onPlayerJump", (player) => {
  player._jumpCount      = 1;                    // used one jump
  player._lastJumpTime   = performance.now();    // record when it happened
});

// Reset on landing
SystematicAPI.on("onPlayerTouchGround", (player) => {
  player._jumpCount      = 0;
  player._lastJumpTime   = 0;
  player._doubleJumpKeyDown = false;
});

// Watch every frame for the double‐jump key, but enforce delay
SystematicAPI.on("onUpdate", (player, keys) => {
  const now = performance.now();
  const canDoubleJump =
    !player.onGround &&                               // in air
    (player._jumpCount || 0) === 1 &&                 // used exactly one jump
    (now - (player._lastJumpTime || 0)) >= DOUBLE_JUMP_DELAY;

  if ((keys["w"] || keys["ArrowUp"])  &&               // jump key
      canDoubleJump &&                                 // delay passed
      !player._doubleJumpKeyDown) {                    // debounce
    // PERFORM DOUBLE JUMP:
    player.vy               = jumpPower;
    player._jumpCount      += 1;
    player._lastJumpTime    = now;                     // update time
    player._doubleJumpKeyDown = true;

    // Optional double‐jump hook & effects
    SystematicAPI.trigger("onPlayerDoubleJump", player);
  }

  // Reset debounce when key is released
  if (!(keys["w"] || keys["ArrowUp"])) {
    player._doubleJumpKeyDown = false;
  }
});
```

### Triggering Custom Events

You can also trigger your own events using:

```js
SystematicAPI.trigger('eventName', ...args);
```

For example, trigger a custom event when the player performs a double jump:

```js
SystematicAPI.trigger('onPlayerDoubleJump', player);
```

---

### Register Functions

There are two register functions:
```js
SystematicAPI.registerTile({
```
```js
SystematicAPI.registerColorPalette({
```

### Register Tile

Register Tile is used to define new tiles that you can use in the editor, they must have these 5 attributes:

* `id`: Tile id used by the editor.
* `name`: Name of the tile used by the editor
* `category`: The name of the category in which the tile will be added to, if a category doesnt exist, it will create a new one
* `sprite`: Sprite of the tile, same array format used by the editor
* `properties`: Custom properties of the tile
 
Example Attributes for Register Tile:
```js
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

// 2. register the tile with its attributes
SystematicAPI.registerTile({
  id: 99,
  name: "Heavy Spring",
  category: "Example Mod",
  sprite: heavySpringSprite,
  properties: { bounce: 20 }
});
```
---
### Add hooks to registered tiles
To add hooks to register tiles, you can attach the hooks into the definition like this:
```js
// 3. add hooks
SystematicAPI.on("onPlayerTouchGround", (player, tx, ty, layer) => {
  const def = SystematicAPI.getTileDef(levels[currentLevel][ty]?.[tx]?.[layer]); // leave this like it is most of the time
  if (def?.id === 99) { // your tile id
    player.vy = -def.properties.bounce; // use the registered tile's properties
    animateTileOnce(layer, tx, ty, [25,24,23,26,26,99], 32); // animate the tile
  }
});
```

### Register Color Palette
Register Color Palette is used to define new plattes that you can use in the editor, they must follor this format:
```js
SystematicAPI.registerColorPalette("Mossy Grove", [
  "#3b4a2f", // deep moss shadow (dark forest floor)
  "#66794b", // moss base (soft leafy green)
  "#8ca16c", // fresh moss highlight (brighter green)
  "#b6c396", // sunlit moss (light leafy patches)
  "#a48a6d", // damp soil (earthy brown)
  "#d6c9b1", // fallen leaves (soft beige)
  "#c2d8b0", // light misty sky (pale green-gray)
  "rgba(0,0,0,0)" // transparent
]);
```

### Built in Functions
There are some built in functions to help with development. There arent that many, so i will include the most useful one:

* **`animateTileOnce(layer, x, y, frames, fps)`**
  Places different tiles in a sequence to simulate an animation, can also be used to place tiles

Usage Example: animateTileOnce(1, tx, ty, [25,24,23,26,26,23], 32);

---

This structure allows modders to add new gameplay mechanics, input handling, and interactions by registering functions to hooks and using the API to modify the player state or trigger events.

---

## License & Attribution

Licensed under the **MIT License**.  
© 2025 lolo2345 — Attribution required.  
See [LICENSE](LICENSE) for full text.
