# Pixel Platformer Editor

A web‐based **pixel platformer level editor** and playtester—fully in your browser. Create, edit, sprite, and play your own 2D platformer levels without writing a single line of engine code!

---

## 🚀 Features

- **Grid-based tile editor**  
  – Paint terrain, background, objects, spikes, bounce pads, one-way platforms, text tiles, and more.  
  – Click-and-drag painting; right-click custom properties.

- **Multi-level support**  
  – Create, rename, navigate, and delete levels.  
  – Save & load **all** levels as JSON.

- **Custom palettes**  
  – 10+ built-in palettes (Forest, Desert, Tundra, Swamp, …).  
  – Live preview & palette swatches in the sprite editor.

- **Layered editing**  
  – Background & terrain layers (expandable).  
  – Control visibility and paint order.

- **Playtest mode**  
  – Switch between **Edit** & **Play** to immediately try your level.  
  – Built-in physics: gravity, jump, dash, one-way platforms, bounce pads, and spike hazards.

- **Sprite editor**  
  – Draw new 10×10 pixel sprites.  
  – Assign palette indices and give each sprite a name.  
  – Load & merge external sprite JSON files.

- **Text Tiles**  
  – Place configurable text anywhere in the level.  
  – Auto-resize background box to fit long strings.  
  – Edit text later via right-click properties.

- **Custom tile properties**  
  – Bounce pads: adjustable jump strength.  
  – One-way platforms: toggle “allow drop” (press S).  
  – Extendable schema—add your own.

- **Open-source & attribution**  
  – Licensed under MIT—free to use, modify, and share with credit to the original author.

---

## 📦 Installation

1. Clone or download this repo  
2. Open `index.html` in any modern browser  
3. Start editing—no build step required!

---

## 🎮 Controls

### Editor Mode

- **Left-click & drag**: Paint current tile  
- **Right-click**: Open tile properties sidebar (if supported)  
- **Mouse wheel**: Zoom in/out  
- **Arrow keys / WASD**: Pan camera

### Toolbar

- **Tile Search**: Filter brushes by name or ID  
- **Category**: Quickly switch brush groups  
- **Palette**: Change colors for brushes & sprite editor  
- **Layer**: Select background or terrain layer  
- **🖌️**: Open sprite editor  
- **📂**: Load external sprites from JSON  

### Level Controls

- **← Prev / Next →**: Switch between levels  
- **+ Add Level**: Create a new blank level  
- **Save All Levels**: Export JSON to console  
- **Load All Levels**: Paste JSON to import levels  

### Playtest Mode

- **W / Arrow Up**: Jump  
- **A / Arrow Left**, **D / Arrow Right**: Move  
- **S / Arrow Down**: Drop through one-way platforms (if enabled)

---

## 🛠️ Extending the Editor

- **Add new tile types**:  
  1. Add a sprite bucket in `sprites` with your pixel data  
  2. Include its ID in your brush categories (in `makeBrushCategories()`)  
  3. Optionally define `tilePropertySchemas[ID]` for custom fields  
  4. Handle placement & rendering logic in `paintAt()` and `drawLevel()`

- **Custom physics**: Extend `isSolid()`, `isOneWayTile()`, `isBounceTile()`, etc., and hook into the `update()` loop.

- **UI tweaks**: The tile-brush grid, sidebar, and toolbar are built with plain HTML/CSS—feel free to restyle or reorganize.

---

## 📝 License & Attribution

This project is licensed under the **MIT License**.  
© 2025 Lolo — Attribution required.  

See [LICENSE](LICENSE) for full text.

---

_Ready to build your dream platformer? Dive in, get creative, and share your levels with the world!_ 🐾✨  
