// --- CORE SETTINGS ---
const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");

let tileSize = 30
const spriteDim = 10;         // your sprite is 10×10
const BASE_PIXEL_SIZE = 3;    // you want exactly 3px per sprite-pixel
const MIN_TILE = spriteDim * BASE_PIXEL_SIZE;
const MAX_TILE = 60;          // or whatever upper limit you like
const mapCols  = 60;
const mapRows  = 30;

// --- EDIT vs PLAY MODE ---
let mode = "edit"; // "edit" or "play"
let camX = 0, camY = 0;
    
const palettes = {
  "Forest": [
    "#1d1b2a", // shadow base (deep soil/dark tree root)
    "#3e3c5e", // transition shadow (stone or bark detail)
    "#67b26f", // mid foliage (leaves/grass)
    "#a3de83", // highlight foliage (top leaf, moss)
    "#6c567b", // wood accent (trunk, rock pattern)
    "#ffcc57", // flower/sunlight/fruit highlight
    "#87ceeb", // sky
    "rgba(0,0,0,0)"
  ],
  "Desert": [
    "#4a321a", // deep shadow (rock crevice/sand base)
    "#a86030", // base sand/rock
    "#d8a657", // midlight sand
    "#f0d9a3", // top sand surface
    "#8a5430", // accent (cracked stone, cliff edge)
    "#fff2c7", // sun reflection/highlight
    "#b4dfe5", // pale desert sky
    "rgba(0,0,0,0)"
  ],
    "Pale Desert": [
    "#8c6e56", // deep shadow (rock crevice/sand base)
    "#d99f70", // base sand/rock
    "#f2c98c", // midlight sand
    "#fbeecf", // top sand surface
    "#c48f6a", // accent (cracked stone, cliff edge)
    "#fff9e4", // sun reflection/highlight
    "#aad4db", // pale desert sky
    "rgba(0,0,0,0)"
  ],
  "Tundra": [
    "#2a3b4c", // cold rock/shadow
    "#466d8c", // frozen soil
    "#6faac3", // ice surface
    "#a8d0db", // light ice/snow
    "#e2f4f9", // snow highlight
    "#ffffff", // bright snow glare
    "#b0e0ff", // pale icy sky
    "rgba(0,0,0,0)"
  ],
  "Tropical": [
    "#2f1b0c", // wet soil
    "#4e3b24", // palm trunk
    "#2e8b57", // lush green
    "#8ed487", // leaf highlight
    "#ffe066", // sand
    "#ffd39f", // sunlit beach
    "#5ec6e8", // bright tropical sky
    "rgba(0,0,0,0)"
  ],
  "Swamp": [
    "#1e1b16", // murky shadow
    "#374227", // muddy green
    "#5d6d3a", // algae base
    "#7f9943", // plant growth
    "#aab95e", // slimy highlight
    "#dce27a", // glowing fungus/mist
    "#6a9e76", // sickly misty sky
    "rgba(0,0,0,0)"
  ],
  "Pale Swamp": [
    "#2b2d2f", // deep jungle shadow
    "#4a5c4e", // dense foliage
    "#6b7f6a", // leaf base
    "#7a9a6d", // mid foliage
    "#a8c8a0", // light foliage
    "#d1e3d5", // flower/sunlight/fruit highlight
    "#89c4b0", // sickly lighter misty sky
    "rgba(0,0,0,0)"
  ],
    "Mountain": [
    "#2c2c2c", // dark rock
    "#4b4b4b", // midstone
    "#6b6b6b", // light stone
    "#8a8f91", // worn edges
    "#c0c0c0", // high-altitude sunlit rock
    "#ede8d1", // snow cap or quartz
    "#a2bce0", // cool sky with altitude haze
    "rgba(0,0,0,0)"
  ],
  "Contrast Mountain": [
    "#1c1c1c", // deep cave shadow
    "#3b3b3b", // rock base
    "#5a5a5a", // midstone
    "#7a7a7a", // light stone
    "#9b9b9b", // worn edges
    "#c0c0c0", // high-altitude sunlit rock
    "#b6cff2", // lighter cool sky with altitude haze
    "rgba(0,0,0,0)"
  ],
    "Lavender": [
    "#6f4f85", // deep lavender (shadow)
    "#8b7f9a", // muted lavender (base)
    "#b0a1c7", // soft lavender (midlight)
    "#d2bcd6", // light lavender (highlight)
    "#4f704f", // greener sage (base)
    "#5e8c5b", // even greener sage (highlight)
    "#b0a1c7", // pale lavender sky
    "rgba(0,0,0,0)"
  ],
  "Contrast Lavender": [
    "#3a2e47",
    "#5a4b72",
    "#7c6ba5",
    "#b5a0d0",
    "#d3c1e5",
    "#e6d9f9",
    "#bfb8e0",
    "rgba(0,0,0,0)"
  ],
};

// remember how many built-in sprites there were
const originalBuiltInCount = sprites.length;

    // brush categories
    let brushCategories = {
      "All":              [0],
      "Terrain":          [0],
      "Cobblestone":      [0],
      "Wood":             [0],
      "Ancient Stones":   [0],
      "Other":            [0],
      "Painted":          [0]
    };
    let currentCategory = "All";
    let tileSearchQuery = "";

    // --- STATE ---
    let palette = palettes["Forest"];
    let currentTile = 2;

    // --- LEVEL AND LAYERS ---
    let layerCount = 2;  // for example: background, terrain

    // Initialize level as 2D grid of arrays:
    let levels = [];
    let currentLevel = 0;


    // initialize with one blank level:
    function makeEmptyLevel() {
      return Array.from({ length: mapRows }, () =>
        Array.from({ length: mapCols }, () =>
          new Array(layerCount).fill(0)
        )
      );
    }

    levels.push(makeEmptyLevel());        // start with level 0
    let level = levels[currentLevel];     // alias for convenience

    // keyed by: `${levelIndex}-${x}-${y}-${layer}`
    const tilePropsData = {};

    // --- PLAYER ---
    let player = {
      x: 100, y: 100,
      vx: 0, vy: 0,
      width: 22, height: 22,
      onGround: false,
      sprite:
      [
        [1,1,0,1,1,0,1,1],
        [1,0,0,0,0,0,0,1],
        [0,0,0,2,2,0,0,0],
        [1,0,2,3,3,2,0,1],
        [1,0,2,3,3,2,0,1],
        [0,0,0,2,2,0,0,0],
        [1,0,0,0,0,0,0,1],
        [1,1,0,1,1,0,1,1],
      ],
      spriteDim: 8
    };
    const gravityTiles   = 0.02;   // add 0.02 tiles of downward velocity per frame
    const jumpTiles      = -0.32;  // an instant -0.32 tiles/sec when you jump
    const moveTiles      = 0.15;   // move 0.15 tiles per frame horizontally
    const keys = {};

    // --- SETUP UI ---
    const TEXT_TILE_ID = 31

    // which tile IDs get a custom props panel, and which fields they have:
    const tilePropertySchemas = {
      23: [ // Bounce Tile
        { key: "jumpStrength", label: "Jump Strength", type: "number", min: 0.1, step: 0.1, default: 1.0 }
      ],
      27: [ // One-Way Platform
        { key: "allowDrop",    label: "Allow Drop (press S)", type: "checkbox", default: false }
      ],
      [TEXT_TILE_ID]: [
        { key: "text", label: "Text", type: "text", default: "" }
      ]
    };

    document.getElementById("paletteSelector").innerHTML = Object.keys(palettes)
      .map(name => `<option value="${name}">${name}</option>`).join("");
    document.getElementById("paletteSelector").onchange = e => {
      palette = palettes[e.target.value];
      createTileBrushes();
    };

    const controlsPanel = document.getElementById('controls');
    document.getElementById('toggleControls').addEventListener('click', () => {
      const isVisible = controlsPanel.style.display === 'flex';
      controlsPanel.style.display = isVisible ? 'none' : 'flex';
      document.getElementById('toggleControls').textContent = isVisible ? 'Show Controls' : 'Hide Controls';
    });

    document.getElementById('playtestBtn').addEventListener('click', () => {
      togglePlaytest();
    });

    document.getElementById("saveLevel").addEventListener("click", saveLevel);
    document.getElementById("loadLevel").addEventListener("click", loadLevel);

    // Populate category dropdown
    const catSel = document.getElementById("categorySelector");
    catSel.innerHTML = Object.keys(brushCategories)
        .map(name => `<option>${name}</option>`).join("");
    catSel.onchange = e => {
      currentCategory = e.target.value;
      createTileBrushes();
    };

    document.getElementById("layerSelector").onchange = e => {
      currentLayer = Number(e.target.value);
    };

    const prevBtn = document.getElementById("prevLevel");
    const nextBtn = document.getElementById("nextLevel");
    const addBtn  = document.getElementById("addLevel");
    const lbl     = document.getElementById("levelLabel");

    function refreshLevelLabel() {
      lbl.textContent = `Level ${currentLevel + 1} / ${levels.length}`;
    }

    // switch levels
    prevBtn.onclick = () => {
      if (currentLevel > 0) {
        currentLevel--;
        level = levels[currentLevel];
        refreshLevelLabel();
      }
    };
    nextBtn.onclick = () => {
      if (currentLevel < levels.length - 1) {
        currentLevel++;
        level = levels[currentLevel];
        refreshLevelLabel();
      }
    };
    // add new blank level
    addBtn.onclick = () => {
      levels.push(makeEmptyLevel());
      currentLevel = levels.length - 1;
      level = levels[currentLevel];
      refreshLevelLabel();
    };
    // init
    refreshLevelLabel();
    
    const tileSearchInput = document.getElementById("tileSearch");
    tileSearchInput.addEventListener("input", e => {
      tileSearchQuery = e.target.value.trim().toLowerCase();
      createTileBrushes();
    });

    // Grab once at top level
    const canvasContainer = document.getElementById("canvasContainer");
    const tileProps       = document.getElementById("tileProps");
    const propXY          = document.getElementById("propXY");
    const customProps     = document.getElementById("customProps");
    const btnApply        = document.getElementById("propApply");
    const btnClose        = document.getElementById("propClose");

    // Open sidebar on right‐click of a schema’d tile
    canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      const tx = Math.floor((e.offsetX + camX) / tileSize);
      const ty = Math.floor((e.offsetY + camY) / tileSize);
      if (tx < 0 || ty < 0 || tx >= mapCols || ty >= mapRows) return;

      const layer  = currentLayer;
      const id     = levels[currentLevel][ty][tx][layer];
      const schema = tilePropertySchemas[id];
      if (!schema) return;

      // remember for apply
      lastTileX = tx; lastTileY = ty; lastLayer = layer;
      propXY.textContent = `${tx}, ${ty}`;

      // build the custom form
      customProps.innerHTML = "";
      const key      = `${currentLevel}-${tx}-${ty}-${layer}`;
      const existing = tilePropsData[key] || {};

      schema.forEach(field => {
        const wrapper = document.createElement("div");

        // input
        const input = document.createElement("input");
        input.type    = field.type === "checkbox" ? "checkbox" : field.type;
        input.id      = `propField-${field.key}`;
        input.name    = field.key;
        if (field.type === "checkbox") {
          input.checked = existing[field.key] ?? field.default;
        } else {
          if (field.min  != null) input.min  = field.min;
          if (field.step != null) input.step = field.step;
          input.value   = existing[field.key] ?? field.default;
        }

        // label
        const label = document.createElement("label");
        label.htmlFor    = input.id;
        label.textContent = field.label + ": ";

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        customProps.appendChild(wrapper);
      });

      // slide in
      tileProps.classList.add("open");
      canvasContainer.classList.add("shifted");
    });


    // 2) Replace your btnApply.onclick with this version:
    btnApply.onclick = () => {
      const key    = `${currentLevel}-${lastTileX}-${lastTileY}-${lastLayer}`;
      const id     = levels[currentLevel][lastTileY][lastTileX][lastLayer];
      const schema = tilePropertySchemas[id];
      const data   = {};

      schema.forEach(field => {
        const inp = document.getElementById(`propField-${field.key}`);
        let val;
        if (field.type === "checkbox") {
          val = inp.checked;
        } else if (field.type === "number") {
          val = parseFloat(inp.value);
        } else {
          // for type === "text" (and any other), just take the string
          val = inp.value;
        }
        data[field.key] = val;
      });

      // save back
      tilePropsData[key] = data;

      // close sidebar
      tileProps.classList.remove("open");
      canvasContainer.classList.remove("shifted");
    };

    // Close: just slide out
    btnClose.onclick = () => {
      tileProps.classList.remove("open");
      canvasContainer.classList.remove("shifted");
    };

    let isPainting = false;
    let currentLayer = 1;  // 0 = background, 1 = terrain, 2 = objects

    // --- INPUT HANDLERS ---
    canvas.addEventListener("mousedown", e => {
      if (mode !== "edit" || e.button !== 0) return;

      if (currentTile === TEXT_TILE_ID) {
        // one-off text placement
        placeTextTile(e);
      } else {
        // normal click-and-drag painting
        isPainting = true;
        paintAt(e);
      }
    });

    canvas.addEventListener("mousemove", e => {
      if (isPainting) paintAt(e);
    });

    window.addEventListener("mouseup", () => {
      isPainting = false;
    });
    canvas.addEventListener("mouseleave", () => {
      isPainting = false;
    });

    canvas.addEventListener("wheel", e => {
      if (mode !== "edit") return;
      e.preventDefault();

      // wheel up (e.deltaY < 0) → zoom in; wheel down → zoom out
      const direction = e.deltaY < 0 ? 1 : -1;

      // step exactly one spriteDim each tick
      let newSize = tileSize + (direction * spriteDim);

      // clamp between your MIN_TILE and MAX_TILE
      newSize = Math.max(MIN_TILE, Math.min(MAX_TILE, newSize));

      // if unchanged, exit early
      if (newSize === tileSize) return;

      tileSize = newSize;

      // re-clamp camera so no gaps appear
      camX = Math.max(0, Math.min(camX, mapCols * tileSize - canvas.width));
      camY = Math.max(0, Math.min(camY, mapRows * tileSize - canvas.height));
    });

    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup",   e => { keys[e.key] = false; });

    // Only darken valid 6-digit hex colors; pass others through
    function darkenHex(col, factor) {
      // If it’s not a "#xxxxxx" string, return it unchanged
      if (typeof col !== "string" || !col.startsWith("#") || col.length !== 7) {
        return col;
      }
      const r = parseInt(col.slice(1,3), 16),
            g = parseInt(col.slice(3,5), 16),
            b = parseInt(col.slice(5,7), 16);
      const rr = Math.floor(r * factor),
            gg = Math.floor(g * factor),
            bb = Math.floor(b * factor);
      return "#" +
        rr.toString(16).padStart(2,"0") +
        gg.toString(16).padStart(2,"0") +
        bb.toString(16).padStart(2,"0");
    }

    function placeTextTile(e) {
      const x = Math.floor((e.offsetX + camX) / tileSize);
      const y = Math.floor((e.offsetY + camY) / tileSize);
      if (x < 0 || y < 0 || x >= mapCols || y >= mapRows) return;

      const txt = prompt(`Enter text to place at (${x},${y}):`, "");
      if (txt === null) return;  // user cancelled

      // set the tile
      levels[currentLevel][y][x][currentLayer] = TEXT_TILE_ID;

      // save its text
      tilePropsData[`${currentLevel}-${x}-${y}-${currentLayer}`] = { text: txt };
    }

    // tile brush
    function paintAt(e) {
      const x = Math.floor((e.offsetX + camX) / tileSize);
      const y = Math.floor((e.offsetY + camY) / tileSize);
      if (x < 0 || y < 0 || x >= mapCols || y >= mapRows) return;

      level[y][x][currentLayer] = currentTile;
    }

    const SPIKE_BASE_ID = 28;
    const spikeFrames   = [28, 29, 30, 29, 29,];
    const spikeHold     = 6;      // how many frames each anim step lasts

    let globalTick     = 0;       // increments every drawLevel call

    const darkPalette = palette.map(col => darkenHex(col, 0.5));

    // --- DRAW LEVEL ---
    function drawLevel() {
      // 1) advance global tick for animations
      globalTick++;

      // 2) which spike frame to show
      const frameIndex = Math.floor(globalTick / spikeHold) % spikeFrames.length;

      // 3) clear & background
      ctx.fillStyle = palette[6];
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4) compute integer camera offsets
      const camXi = Math.round(camX);
      const camYi = Math.round(camY);

      // 5) determine visible tile range
      const startCol = Math.floor(camX       / tileSize);
      const endCol   = Math.ceil ((camX + canvas.width ) / tileSize);
      const startRow = Math.floor(camY       / tileSize);
      const endRow   = Math.ceil ((camY + canvas.height) / tileSize);

      const minCol = Math.max(0, startCol);
      const maxCol = Math.min(mapCols, endCol);
      const minRow = Math.max(0, startRow);
      const maxRow = Math.min(mapRows, endRow);

      const TRANSPARENT_HEX  = "#00000000";
      const TRANSPARENT_RGBA = "rgba(0,0,0,0)";

      for (let y = minRow; y < maxRow; y++) {
        for (let x = minCol; x < maxCol; x++) {
          for (let layer = 0; layer < layerCount; layer++) {
            let id = levels[currentLevel][y][x][layer];
            if (id === SPIKE_BASE_ID) id = spikeFrames[frameIndex];
            const spr = sprites[id];
            if (id === TEXT_TILE_ID) {
              // fetch the text
              const key = `${currentLevel}-${x}-${y}-${layer}`;
              const txt = tilePropsData[key]?.text || "";

              // choose font and measure
              const fontSize = Math.floor(tileSize/3);
              ctx.font = `${fontSize}px sans-serif`;
              const metrics  = ctx.measureText(txt);
              const textW    = metrics.width;
              const padding  = 4;

              // compute how much wider than a tile this text is
              const extraW = Math.max(0, textW + padding*2 - tileSize);

              // background: extend half extra to left, half to right
              const bgX = x*tileSize - camXi - extraW/2;
              const bgW = tileSize + extraW;
              ctx.fillStyle = "#222";
              ctx.fillRect(bgX, y*tileSize - camYi, bgW, tileSize);

              // draw the text centered within that box
              ctx.fillStyle    = "#fff";
              ctx.textAlign    = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                txt,
                x*tileSize - camXi + (tileSize/2),
                y*tileSize - camYi + (tileSize/2)
              );

              continue;  // skip normal sprite drawing
            }
            if (!spr?.length) continue;

            const sprite    = spr[0].data;
            const dim       = sprite.length;
            const pixelSize = Math.floor(tileSize / dim) || 1;
            const offset    = Math.floor((tileSize - dim*pixelSize)/2);

            // pick dark vs normal
            let pal = layer === 0 ? darkPalette : palette;
            // special case: platform
            if (id === 27) {
              const key  = `${currentLevel}-${x}-${y}-${layer}`;
              const prop = tilePropsData[key];
              if (prop?.allowDrop) {
                // create a shallow copy so we don’t overwrite the global palette
                pal = pal.slice();
                // remap index 0 → index 2
                pal[0] = palette[2];
                pal[1] = palette[3];
              }
            }

            for (let row = 0; row < dim; row++) {
              for (let col = 0; col < dim; col++) {
                const ci = sprite[row][col];
                if (ci < 0) continue;

                // 1) get the raw color string
                const raw = pal[ci];
                if (!raw) continue;  // out of range, just skip

                // 2) if it’s fully transparent, skip it
                if (raw === TRANSPARENT_HEX || raw === TRANSPARENT_RGBA) continue;

                // 3) otherwise draw normally
                ctx.fillStyle = raw;
                ctx.fillRect(
                  x*tileSize - camXi + offset + col*pixelSize,
                  y*tileSize - camYi + offset + row*pixelSize,
                  pixelSize, pixelSize
                );
              }
            }
          }
        }
      }
    }

    // --- DRAW SPRITE UTILITY ---
    function drawSprite(data, x, y) {
      const spriteDim     = data.length;
      const pixelSize     = Math.floor(tileSize / spriteDim) || 1;
      const spritePixelSz = spriteDim * pixelSize;
      const offset        = Math.floor((tileSize - spritePixelSz) / 2);

      for (let row = 0; row < spriteDim; row++) {
        for (let col = 0; col < spriteDim; col++) {
          const ci = data[row][col];
          if (ci < 0) continue;
          ctx.fillStyle = palette[ci] || "#000";
          ctx.fillRect(
            x + offset + col * pixelSize,
            y + offset + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    function drawPlayer() {
      drawSprite(player.sprite, player.x - camX, player.y - camY);
    }

    // --- DRAW GRID ---
    function drawGrid() {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      for (let x = 0; x < mapCols + 25; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize - camX, 0);
        ctx.lineTo(x * tileSize - camX, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < mapRows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize - camY);
        ctx.lineTo(canvas.width, y * tileSize - camY);
        ctx.stroke();
      }
    }

    function moveCamera() {
      if (keys["ArrowLeft"] || keys["a"]) camX -= 10;
      if (keys["ArrowRight"] || keys["d"]) camX += 10;
      if (keys["ArrowUp"] || keys["w"]) camY -= 10;
      if (keys["ArrowDown"] || keys["s"]) camY += 10;

      // Snap after movement
      [camX, camY] = snapCamera(camX, camY);

      // Clamp camera
      camX = Math.max(0, Math.min(camX, mapCols * tileSize - canvas.width));
      camY = Math.max(0, Math.min(camY, mapRows * tileSize - canvas.height));
    }

    function snapCamera(x, y) {
      const snapSize = tileSize / 4;
      x = Math.round(x / snapSize) * snapSize;
      y = Math.round(y / snapSize) * snapSize;
      return [x, y];
    }

        // --- SAVE / LOAD & GENERATE ---
    function saveAllLevels() {
      const data = JSON.stringify(levels);
      console.log("All Levels JSON:", data);
      alert("All levels logged to console.");
    }

    function loadAllLevels() {
      const json = prompt("Paste levels JSON here:");
      try {
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) {
          levels = arr;
          currentLevel = 0;
          level = levels[0];
          refreshLevelLabel();
          alert("Levels loaded!");
        } else throw "Not an array";
      } catch (e) {
        alert("Invalid JSON.");
      }
    }

    document.getElementById("saveLevel").textContent = "Save All Levels";
    document.getElementById("saveLevel").onclick = saveAllLevels;
    document.getElementById("loadLevel").onclick = loadAllLevels;

    // Always read from the active level:
    function getCell(col, row, layer) {
      // bounds check
      if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return 0;
      return levels[currentLevel][row][col][layer];
    }

    // --- SOLID TILES (terrain layer = 1) ---
    function isSolid(px, py) {
      const col = Math.floor(px / tileSize);
      const row = Math.floor(py / tileSize);
      const id  = getCell(col, row, 1);  

      // 0 = empty, 27 = one-way platform → both non-solid
      if (id === 0 || id === 27) return false;
      return true;
    }

    // --- ONE-WAY PLATFORM (ID 27 on layer 1) ---
    function isOneWayTile(px, py) {
      const col = Math.floor(px / tileSize);
      const row = Math.floor(py / tileSize);
      return getCell(col, row, 1) === 27;
    }

    // --- BOUNCE TILE (ID 23 on layer 1) ---
    function isBounceTile(px, py) {
      const col = Math.floor(px / tileSize);
      const row = Math.floor(py / tileSize);
      return getCell(col, row, 1) === 23;
    }

    // --- SPIKE TILE ---
    function isSpikeTile(px, py) {
      const col = Math.floor(px / tileSize),
            row = Math.floor(py / tileSize);
      if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return false;
      return level[row][col][1 || 2] === 28;
    }

    // ANIMATIONS
    function animateTileOnce(layer, x, y, frames, fps) {
      // — default arguments —
      if (!Array.isArray(frames))   frames = [23, 24, 23];
      if (typeof fps === "undefined") fps = 4;

      // — init animation registry —
      if (!animateTileOnce.activeAnims) animateTileOnce.activeAnims = {};
      const key = x + "," + y;

      // — bounds & concurrency check —
      if (
        y < 0 || y >= level.length ||
        x < 0 || x >= level[0].length ||
        animateTileOnce.activeAnims[key]
      ) return;

      animateTileOnce.activeAnims[key] = true;
      const frameDuration = 1000 / fps;
      let idx = 0;

      function step() {
        // if we still have frames left, draw and schedule next…
        if (idx < frames.length) {
          level[y][x][layer] = frames[idx++];
          setTimeout(step, frameDuration);
        } else {
          // …otherwise clean up
          delete animateTileOnce.activeAnims[key];
        }
      }

      // kick it off
      step();
    }

    function animateTileLoop(layer, x, y, frames, fps) {
      const frameDuration = 1000 / fps;
      let idx = 0;
      const key = x + "," + y;

      function step() {
        // draw this frame
        level[y][x][layer] = frames[idx];
        idx = (idx + 1) % frames.length;
        // schedule next
        setTimeout(step, frameDuration);
      }

      // kick off
      step();
    }

    // --- MODE SWITCH ---
    function togglePlaytest() {
      if (mode === "edit") {
        // switch into play mode
        mode = "play";
        // reset player spawn
        player.x = 100; 
        player.y = 100;
        player.vx = player.vy = 0;
      } else {
        // back to edit mode
        mode = "edit";
      }
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gravity   = gravityTiles * tileSize;
      const jumpPower = jumpTiles  * tileSize;
      const moveSpeed = moveTiles  * tileSize;
      const N         = player.spriteDim;
      const pixelSize = tileSize / N;
      player.width    = N * pixelSize;
      player.height   = N * pixelSize;

      if (mode === "play") {
        // Horizontal
        if      (keys["a"] || keys["ArrowLeft"])  player.vx = -moveSpeed;
        else if (keys["d"] || keys["ArrowRight"]) player.vx =  moveSpeed;
        else                                      player.vx =  0;

        // Jump
        if ((keys["w"] || keys["ArrowUp"]) && player.onGround) {
          player.vy       = jumpPower;
          player.onGround = false;
        }

        player.x  += player.vx;
        // Tentative next horizontal position
        const nextX = player.x + player.vx;
        const topY   = player.y;
        const bottomY = player.y + player.height - 1;

        // Check horizontal collisions only if moving horizontally
        if (player.vx !== 0) {
          if (player.vx > 0) {
            // Moving right: check right edge
            const rightEdge = nextX + player.width;
            // check tiles along right edge from top to bottom
            for (let y = topY; y <= bottomY; y += tileSize / 2) {
              if (isSolid(rightEdge, y)) {
                // Snap player to left side of blocking tile
                const col = Math.floor(rightEdge / tileSize);
                player.x = col * tileSize - player.width;
                player.vx = 0;
                break;
              }
            }
          } else {
            // Moving left: check left edge
            const leftEdge = nextX;
            for (let y = topY; y <= bottomY; y += tileSize / 2) {
              if (isSolid(leftEdge, y)) {
                // Snap player to right side of blocking tile
                const col = Math.floor(leftEdge / tileSize);
                player.x = (col + 1) * tileSize;
                player.vx = 0;
                break;
              }
            }
          }
        } else {
          player.x = nextX;
        }

        // Gravity + Move
        player.vy += gravity;
        player.y  += player.vy;

        // Ceiling
        if (player.vy < 0) {
          const nextHeadY = player.y;
          if (isSolid(player.x, nextHeadY) ||
              isSolid(player.x + player.width, nextHeadY)) {
            const tileHY = Math.floor(nextHeadY / tileSize);
            player.vy   = 0;
            player.y    = (tileHY + 1) * tileSize;
          }
        }

        // ── GROUND & ONE‐WAY PLATFORM LOGIC ─────────
        const feetY     = player.y + player.height;
        const nextFeetY = feetY + player.vy;

        // inset the X’s so you’re sampling well inside the sprite
        const leftX     = player.x + 1;
        const rightX    = player.x + player.width - 1;

        // check tiles *at* nextFeetY
        const belowLeftSolid   = isSolid(leftX,  nextFeetY);
        const belowRightSolid  = isSolid(rightX, nextFeetY);
        const belowLeftOneWay  = isOneWayTile(leftX,  nextFeetY);
        const belowRightOneWay = isOneWayTile(rightX, nextFeetY);

        // grab the tile‐coordinates below your feet
        const tileRow = Math.floor(nextFeetY / tileSize);
        const tileLX  = Math.floor(leftX    / tileSize);
        const tileRX  = Math.floor(rightX   / tileSize);

        // are you holding down to drop?
        const dropIntent = keys["s"] || keys["ArrowDown"];

        // helper
        function platformAllowsDrop(col, row) {
          const key = `${currentLevel}-${col}-${row}-1`;
          return !!tilePropsData[key]?.allowDrop;
        }

        if (player.vy >= 0) {  // only when falling
          // only allow drop if you’re over a one‐way tile
          const dropL = belowLeftOneWay  && dropIntent && platformAllowsDrop(tileLX, tileRow);
          const dropR = belowRightOneWay && dropIntent && platformAllowsDrop(tileRX, tileRow);

          // if you’re not dropping, these collisions should block you
          const blockOneWay = (belowLeftOneWay  && !dropL)
                            || (belowRightOneWay && !dropR);

          if (belowLeftSolid || belowRightSolid || blockOneWay) {
            // Land: snap to the *top* of tileRow
            player.vy       = 0;
            player.onGround = true;
            player.y        = tileRow * tileSize - player.height;
          }
        }

        // Bounce
        const sampleX = player.x + player.width / 2;
        const sampleY = player.y + player.height + 1;
        if (isBounceTile(sampleX, sampleY)) {
          const bc  = Math.floor(sampleX / tileSize);
          const br  = Math.floor(sampleY / tileSize);
          const key = `${currentLevel}-${bc}-${br}-1`;
          const str = (tilePropsData[key]?.jumpStrength) ?? 1.2;
          player.vy       = jumpPower * str;
          player.onGround = false;
          animateTileOnce(1, bc, br, [25,24,23,26,26,23], 32);
        }

        // Camera & Draw
        camX = Math.max(0, Math.min(levels[0][0].length * tileSize - canvas.width,
                  player.x - canvas.width/2 + player.width/2));
        camY = Math.max(0, Math.min(mapRows * tileSize - canvas.height,
                  player.y - canvas.height/2 + player.height/2));

        drawLevel();
        drawPlayer();

      } else {
        moveCamera();
        drawLevel();
        drawGrid();
      }

      requestAnimationFrame(update);
    }

    // --- TILE BRUSH UI ---
    function createTileBrushes() {
      const container = document.getElementById("tileBrushes");
      container.innerHTML = "";

      // 1) Use CSS Grid instead of flex
      container.style.display = "grid";

      // 2) Define exactly 11 columns (you had 9, +2 more)
      //    Each slot is 64px for the canvas, plus 4px border, plus 4px total gap
      container.style.gridTemplateColumns = "repeat(11, 68px)";
      container.style.gridAutoRows        = "68px";
      container.style.gap                 = "4px";

      // 3) Set scrolling & padding (same as before)
      container.style.height     = "calc(100% - 40px)";
      container.style.overflowY  = "auto";
      container.style.padding    = "10px";
      container.style.boxSizing  = "border-box";

      // 1) Get all IDs for the current category
      let brushCategories = makeBrushCategories();
      let idsToShow = brushCategories[currentCategory] || [];

      // 2) If there’s a search query, further filter by name or ID
      if (tileSearchQuery) {
        idsToShow = idsToShow.filter(idx => {
          const spr = sprites[idx]?.[0];
          const nameMatch = spr?.name?.toLowerCase().includes(tileSearchQuery);
          const idMatch   = idx.toString().includes(tileSearchQuery);
          return nameMatch || idMatch;
        });
      }
      idsToShow.forEach(idx => {
        const spr = sprites[idx];
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        c.dataset.tile = idx;
        c.classList.add('brush');
        // if this is the currently selected brush, mark it
        if (idx === currentTile) c.classList.add('selected');
        c.addEventListener('click', () => {
          currentTile = idx;
          document.querySelectorAll("#tileBrushes canvas").forEach(canv => {
            canv.classList.remove("selected");
          });
          c.classList.add("selected");
          // …and any other logic you need (e.g. updating a preview)
        });
        c.onmouseover = () => {
          c.style.transform = "scale(1.1)";
          drawBrushHoverTooltips();
        };
        c.onmouseout = () => {
          c.style.transform = "scale(1)";
        };
        const bctx = c.getContext("2d");
        bctx.fillStyle = palette[6];
        bctx.fillRect(0,0,64,64);
        if (spr.length) {
          const sprite = spr[0].data;
          const pixelSize = 3, spriteSize = sprite.length * pixelSize;
          const offset = (64 - spriteSize) / 2;
          for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
              const ci = sprite[row][col];
              if (ci >= 0) {
                bctx.fillStyle = palette[ci] || "#000";
                bctx.fillRect(
                  offset + col * pixelSize,
                  offset + row * pixelSize,
                  pixelSize, pixelSize
                );
              }
            }
          }
        }
        container.appendChild(c);
      });
    }

    function drawBrushHoverTooltips() {
      // grab all canvases inside the brush container
      const tooltips = document.querySelectorAll("#tileBrushes canvas");

      tooltips.forEach(c => {
        const idx = parseInt(c.dataset.tile, 10);
        const sprite = sprites[idx]?.[0];

        if (idx === 0) {
          c.title = "Eraser";
        } else if (sprite && sprite.name) {
          // inside your tooltip updater
          if (sprite?.data) {
            // turn each row into a “[n,n,n,…],” string
            const rowLines = sprite.data.map(row =>
              `[${ row.join(',') }],`
            ).join('\n');

            c.title =
              `Name: ${sprite.name}\n` +
              `Tile ID: ${idx}\n` +
              `Sprite:\n${rowLines}`;
          }
        } else {
          c.title = `Tile ID: ${idx}`;
        }
      });
    }

    let activePaintIndex = 1;  // default paint color

    function renderEditorPaletteSwatch() {
      const swatch = document.getElementById('editorPaletteSwatch');
      swatch.innerHTML = '';
      palette.forEach((col, i) => {
        const box = document.createElement('div');
        Object.assign(box.style, {
          width: '36.65px', height: '36.65px',
          background: col,
          border: (i === activePaintIndex ? '2px solid #ff0' : '1px solid #333'),
          marginTop: '5px',
          cursor: 'pointer',
          display: 'inline-block'
        });
        box.title = `Paint index ${i}`;
        box.addEventListener('click', () => {
          activePaintIndex = i;
          renderEditorPaletteSwatch();
        });
        swatch.appendChild(box);
      });
    }

    const openBtn = document.getElementById('openSpriteEditor');
    const modal   = document.getElementById('spriteEditorModal');
    const grid    = document.getElementById('spriteGrid');
    const nameInp = document.getElementById('spriteEditorName');
    const saveBtn = document.getElementById('spriteEditorSave');
    const cancelB = document.getElementById('spriteEditorCancel');

    let editData = [];

    function initEditorGrid() {
      renderEditorPaletteSwatch();
      grid.innerHTML = '';
      editData = Array.from({ length: 10 }, () => Array(10).fill(0));
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const cell = document.createElement('div');
          cell.dataset.x = x;
          cell.dataset.y = y;
          Object.assign(cell.style, {
            width: '30px', height: '30px',
            border: '1px solid #666',
            background: palette[0] || 'rgba(0,0,0,0)',
            cursor: 'pointer'
          });
          cell.addEventListener('click', () => {
            editData[y][x] = activePaintIndex;
            cell.style.background = palette[activePaintIndex] || 'rgba(0,0,0,0)';
          });
          grid.appendChild(cell);
        }
      }
    }

    function repaintEditorGrid() {
      grid.querySelectorAll('div').forEach(cell => {
        const x = +cell.dataset.x, y = +cell.dataset.y;
        const idx = editData[y][x];
        cell.style.background = palette[idx] || 'rgba(0,0,0,0)';
      });
    }

    function makeBrushCategories() {
      const all       = sprites.map((_, i) => i).filter(i => ![24,25,26,29,30].includes(i));
      const painted   = sprites.map((_, i) => i)
                              .filter(i => i >= originalBuiltInCount);
      return {
        "All":        all,
        "Terrain":    [0,1,2,3,4,35],
        "Cobblestone":[0,7,8,9,10,11,12,13,14],
        "Wood":       [0,21,22],
        "Ancient Stones":[5,6,15,16,17,18,19,20,32,33,34],
        "Other":      [0,23,27,28,31],
        // now "Painted" only contains indices of sprites you added
        "Painted":    painted
      };
    }

    openBtn.addEventListener('click', () => {
      initEditorGrid();
      nameInp.value = '';
      modal.style.display = 'block';
    });
    cancelB.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    saveBtn.addEventListener('click', () => {
      const nm = nameInp.value.trim();
      if (!nm) return alert('Please give your sprite a name.');

      // 1) Add the sprite
      sprites.push([ { name: nm, data: editData } ]);
      createTileBrushes();

      // 2) Build a JS-snippet string
      let code = '// Auto-generated sprite definitions\n';
      code += 'const sprites = [\n';

      sprites.forEach((bucket, idx) => {
        bucket.forEach(sprite => {
          // header for this sprite
          code += `  {\n`;
          code += `    name: "${sprite.name}",\n`;
          code += `    data: [\n`;
          // each row as "[n,n,n,…],"
          const rowLines = sprite.data
            .map(row => `      [${row.join(',')}],`)
            .join('\n');
          code += rowLines + '\n';
          code += `    ]\n`;
          code += `  },\n`;
        });
      });

      code += '];\n';

      // 3) Trigger download of a .js file
      const blob = new Blob([code], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'sprites.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 4) Close
      modal.style.display = 'none';
    });

    // extend your existing paletteSelector handler:
    const sel = document.getElementById("paletteSelector");
    sel.onchange = e => {
      palette = palettes[e.target.value];
      createTileBrushes();
      if (modal.style.display === 'block') {
        repaintEditorGrid();
        renderEditorPaletteSwatch();
      }
    };

    const loader = document.getElementById('loadSpriteLoader');
    loader.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();

      reader.onload = () => {
        const text = reader.result;
        const match = text.match(/const\s+sprites\s*=\s*(\[[\s\S]*\]);?/);
        if (!match) {
          return alert('Invalid format: couldn’t find "const sprites = [ … ];"');
        }
        let importedArray;
        try {
          importedArray = (new Function(`"use strict"; return ${match[1]}`))();
        } catch (err) {
          return alert('Error parsing sprites array: ' + err.message);
        }
        if (!Array.isArray(importedArray)) {
          return alert('Parsed value is not an array.');
        }

        // Map flat objects to your bucket format
        const importedBuckets = importedArray
          .filter(obj => obj.name && Array.isArray(obj.data))
          .map(obj => [{ name: obj.name, data: obj.data }]);

        // Replace or append
        importedBuckets.forEach(newBucket => {
          const newName = newBucket[0].name;
          // find existing sprite by name
          const existingIndex = sprites.findIndex(
            bucket => bucket[0]?.name === newName
          );
          if (existingIndex >= 0) {
            // overwrite data
            sprites[existingIndex] = newBucket;
          } else {
            // brand new sprite
            sprites.push(newBucket);
          }
        });

        // Refresh the UI
        createTileBrushes();
        alert(`Imported ${importedBuckets.length} sprites (replaced ${importedBuckets.filter(b => 
          sprites.findIndex(sb => sb[0].name === b[0].name) >= 0
        ).length} existing, added ${importedBuckets.length - importedBuckets.filter(b => 
          sprites.findIndex(sb => sb[0].name === b[0].name) >= 0
        ).length} new).`);
      };

      reader.readAsText(file);
      e.target.value = '';
    });

    // --- STARTUP ---
    createTileBrushes();
    update();  // kick off main loop