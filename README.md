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

## 🛠️ Extending the Editor

- **Add new tiles**:  
  1. Add your sprite to the `sprites` array  
  2. Include its ID in `makeBrushCategories()`  
  3. Define any custom fields in `tilePropertySchemas`  
  4. Extend `paintAt()` and `drawSingleTile()` as needed  

- **Custom physics**: Extend `isSolid()`, `isOneWayTile()`, etc., in the `update()` loop.  
- **UI tweaks**: All UI is plain HTML/CSS—feel free to restyle or reorganize.

---

## License & Attribution

Licensed under the **MIT License**.  
© 2025 lolo2345 — Attribution required.  
See [LICENSE](LICENSE) for full text.
