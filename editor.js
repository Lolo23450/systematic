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

const palsel = document.getElementById("paletteSelector");
window.palettes = {
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

// MODDING API

// CORE
window.SystematicAPI = (function(){
  const api = {};
  api.tiles        = {};        // store definitions by string-ID
  api.customIds    = [];        // keep track of non-built-in IDs

  /**
   * def.id         = unique number or string tile ID
   * def.name       = display name for tooltips
   * def.sprite     = 2D array of palette‐indices (same format as sprites[…].data)
   * def.properties = arbitrary object
   * def.onPlace?   = function(x,y,layer){…}
   * def.onPlayerLand? = function(player,x,y,layer){…}
   */
  api.registerTile = function(def) {
    if (def.id == null) throw new Error("Tile needs an id");
    const sid = String(def.id);
    if (api.tiles[sid]) console.warn("Overwriting tile", sid);
    api.tiles[sid] = def;

    // 1) inject into sprites[] for rendering caches
    sprites[sid] = [{ data: def.sprite || [[-1]], name: def.name }];
    // 2) track as “custom”
    api.customIds.push(sid);
    // 3) bake into caches immediately
    buildTileCanvas(sid, 0, /*layer=*/0, "", tileCache);
    buildTileCanvas(sid, 0, /*layer=*/1, "", tileCache);
    // 4) rebuild brushes UI
    addSpriteToCategory("All", def.id)
    addSpriteToCategory(def.category, def.id)
    updateCategorySelector();
    createTileBrushes();
    console.log("Registered custom tile:", sid, def.name);
    };

  api.getTileDef = function(id) {
    return api.tiles[String(id)] || null;
  };

  const listeners = {};

  api.on = (eventName, fn) => {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(fn);
  };

  api.trigger = (eventName, ...args) => {
    (listeners[eventName] || []).forEach(fn => {
      try { fn(...args); }
      catch (err) { console.error(`hook ${eventName} threw`, err); }
    });
  };

  api.triggerCancelable = function(eventName, ...args) {
    const fns = listeners[eventName] || [];
    for (const fn of fns) {
      try {
        // if a listener explicitly returns false, we cancel
        if (fn(...args) === false) return false;
      } catch (err) {
        console.error(`hook ${eventName} threw`, err);
      }
    }
    return true;
  };

  api.registerColorPalette = function(name, colorArray) {
  if (typeof name !== "string" || !Array.isArray(colorArray)) {
    throw new Error("registerColorPalette(name: string, colorArray: string[])");
  }
  // Optional: validate each entry is a CSS color string
  colorArray.forEach((c, i) => {
    if (typeof c !== "string") {
      console.warn(`Palette "${name}" index ${i} is not a string:`, c);
    }
  });

  // Store into the global palettes object
  window.palettes[name] = colorArray;

  // Update any UI you have for palette selection!
  updatePaletteSelector(palsel);
  };
  
  // 0) storage for registered modals
  const modals = {};

  // 1) registerModal: store the config
  api.registerModal = function(name, config) {
    if (typeof name !== "string" || typeof config !== "object") {
      throw new Error("registerModal(name: string, config: object)");
    }
    // config: { title, content, buttons: [ { label, onClick, className? } ] }
    modals[name] = config;
  };

  // 2) showModal: build and display the modal
  api.showModal = function(name) {
    const config = modals[name];
    if (!config) {
      console.error("No modal registered under", name);
      return;
    }

    // Create backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "sysapi-modal-backdrop";
    backdrop.dataset.modal = name;              // tag with name

    // modal container
    const box = document.createElement("div");
    box.className = "sysapi-modal";

    // title
    const h1 = document.createElement("h2");
    h1.textContent = config.title || name;
    box.appendChild(h1);

    // content
    const body = document.createElement("div");
    body.className = "sysapi-modal-content";
    if (typeof config.content === "string") {
      body.innerHTML = config.content;
    } else if (config.content instanceof Node) {
      body.appendChild(config.content);
    } else if (typeof config.content === "function") {
      body.appendChild(config.content());
    }
    box.appendChild(body);

    // buttons
    const footer = document.createElement("div");
    footer.className = "sysapi-modal-footer";
    (config.buttons || []).forEach(btnCfg => {
      const btn = document.createElement("button");
      btn.textContent = btnCfg.label;
      if (btnCfg.className) btn.classList.add(btnCfg.className);
      btn.onclick = () => {
        try { btnCfg.onClick(); }
        catch(err){ console.error(err); }
        api.hideModal(name);                   // hide this modal
      };
      footer.appendChild(btn);
    });
    box.appendChild(footer);

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  };

  // 3) hideModal: remove either the named modal or the top‐most one
  api.hideModal = function(name) {
    let selector;
    if (typeof name === "string") {
      selector = `.sysapi-modal-backdrop[data-modal="${name}"]`;
    } else {
      // no name = close the first/backmost modal
      selector = ".sysapi-modal-backdrop";
    }
    const backdrop = document.querySelector(selector);
    if (backdrop) backdrop.remove();
  };

  // 4) optional styling
  const style = document.createElement("style");
  style.textContent = `
    .sysapi-modal-backdrop {
      position:fixed; top:0; left:0; right:0; bottom:0;
      background: rgba(0,0,0,0.5);
      display:flex; align-items:center; justify-content:center;
      z-index:1000;
    }
    .sysapi-modal {
      background:#fff; border-radius:6px; padding:16px;
      max-width:80vw; max-height:80vh; overflow:auto;
      box-shadow:0 2px 10px rgba(0,0,0,0.3);
    }
    .sysapi-modal-content { margin:12px 0; }
    .sysapi-modal-footer { text-align:right; }
    .sysapi-modal-footer button { margin-left:8px; }
  `;
  document.head.appendChild(style);

  // === Impoved Global Store ===
  let tilePropertySchemas = {
    23: [ // Bounce Tile
      { key: "jumpStrength", label: "Jump Strength", type: "number", min: 0.1, step: 0.1, default: 1.0 }
    ],
    27: [ // One-Way Platform
      { key: "allowDrop",    label: "Allow Drop (press S)", type: "checkbox", default: false }
    ],
    31: [
      { key: "text", label: "Text", type: "text", default: "" }
    ]
  };

  // === 1. FIELD-DEFINITION VALIDATOR ===
  function validateFieldDef(field) {
    const { key, label, type, default: def } = field;
    if (typeof key !== 'string' || key.trim() === '') {
      console.error(`Field key must be a non-empty string`, field);
      return false;
    }
    if (typeof label !== 'string') {
      console.error(`Field label must be a string`, field);
      return false;
    }
    if (!['number','text','checkbox','select','color'].includes(type)) {
      console.error(`Unsupported field type "${type}"`, field);
      return false;
    }
    // default exists?
    if (def === undefined) {
      console.warn(`No default provided for "${key}", setting to null`);
      field.default = null;
    }
    return true;
  }

  // === 2. REGISTER (OVERWRITE) WITH VALIDATION ===
  api.registerTilePropertySchema = function(tileID, schemaArray) {
    if (!Array.isArray(schemaArray)) {
      console.warn(`Schema for tile ${tileID} must be an array.`);
      return;
    }
    // Validate each field
    const goodFields = schemaArray.filter(f => validateFieldDef(f));
    if (goodFields.length !== schemaArray.length) {
      console.warn(`Some invalid fields were dropped for tile ${tileID}.`);
    }
    if (tilePropertySchemas[tileID]) {
      console.warn(`Overriding existing schema for tile ${tileID}`);
    }
    tilePropertySchemas[tileID] = goodFields;
  };

  // === 3. EXTEND (APPEND) INSTEAD OF OVERRIDE ===
  api.extendTilePropertySchema = function(tileID, extraFields) {
    if (!Array.isArray(extraFields)) {
      console.warn(`extraFields for tile ${tileID} must be an array.`);
      return;
    }
    const validExtras = extraFields.filter(f => validateFieldDef(f));
    tilePropertySchemas[tileID] = (tilePropertySchemas[tileID] || []).concat(validExtras);
  };

  // === 4. ACCESSOR & REMOVER ===
  api.getTilePropertySchema = function(tileID) {
    return tilePropertySchemas[tileID] ? [...tilePropertySchemas[tileID]] : [];
  };

  api.removeTilePropertySchema = function(tileID) {
    if (tilePropertySchemas[tileID]) {
      delete tilePropertySchemas[tileID];
      console.log(`Removed schema for tile ${tileID}`);
    }
  };

  return api;
})();

const TEXT_TILE_ID = 31

// remember how many built-in sprites there were
const originalBuiltInCount = sprites.length;

    // brush categories
    const all       = sprites.map((_, i) => i).filter(i => ![24,25,26,29,30].includes(i));
    const painted   = sprites.map((_, i) => i)
                            .filter(i => i >= originalBuiltInCount);
    let builtinCategories = {
      "All":        all,
      "Terrain":    [0,1,2,3,4,35,38,37],
      "Cobblestone":[0,7,8,9,10,11,12,13,14],
      "Wood":       [0,21,22],
      "Ancient Stones":[5,6,15,16,17,18,19,20,32,33,34],
      "Other":      [0,23,27,28,31,36],
      "Painted":    painted
    };

    let brushCategories = {};

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

    updatePaletteSelector(palsel);

    function updatePaletteSelector(palsel) {
      if (!palsel) return;
      palsel.innerHTML = Object.keys(window.palettes)
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");
    }

    palsel.onchange = e => {  // use palsel directly, no getElementById here
      palette = window.palettes[e.target.value];
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

    // wire the file‐input
    document.getElementById("loadLevel").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "file";
      input.accept= ".json";
      input.onchange = e => {
        const f = e.target.files[0];
        if (f) loadAllLevelsFromFile(f);
      };
      input.click();
    });

    // (optional) add a “Restore Last Save” button:
    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "Restore Last Save";
    restoreBtn.onclick   = loadAllLevelsFromStorage;
    document.getElementById("levelControls").appendChild(restoreBtn);

    const catSel = document.getElementById("categorySelector");
    // Populate category dropdown
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

    // === 1) CONTEXTMENU: OPEN THE PROPS SIDEBAR ===
    canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      const tx = Math.floor((e.offsetX + camX) / tileSize);
      const ty = Math.floor((e.offsetY + camY) / tileSize);
      if (tx < 0 || ty < 0 || tx >= mapCols || ty >= mapRows) return;

      const layer = currentLayer;
      const id    = levels[currentLevel][ty][tx][layer];
      // USE THE API ACCESSOR
      const schema = SystematicAPI.getTilePropertySchema(id);
      if (!schema.length) return;

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
        input.type = field.type === "checkbox" ? "checkbox" : field.type;
        input.id   = `propField-${field.key}`;
        input.name = field.key;

        if (field.type === "checkbox") {
          input.checked = existing[field.key] ?? field.default;
        } else {
          if (field.min  != null) input.min  = field.min;
          if (field.step != null) input.step = field.step;
          input.value = existing[field.key] ?? field.default;
        }

        // label
        const label = document.createElement("label");
        label.htmlFor    = input.id;
        label.textContent = field.label + ": ";

        wrapper.append(label, input);
        customProps.appendChild(wrapper);
      });

      // slide in
      tileProps.classList.add("open");
      canvasContainer.classList.add("shifted");
    });

    // === 2) APPLY BUTTON: SAVE & UNDO-STACK ===
    btnApply.onclick = () => {
      const key = `${currentLevel}-${lastTileX}-${lastTileY}-${lastLayer}`;
      const id  = levels[currentLevel][lastTileY][lastTileX][lastLayer];
      // API accessor again
      const schema = api.getTilePropertySchema(id);
      const newProps = {};

      // read inputs
      schema.forEach(field => {
        const inp = document.getElementById(`propField-${field.key}`);
        let val;
        if (field.type === "checkbox") {
          val = inp.checked;
        } else if (field.type === "number") {
          val = parseFloat(inp.value);
        } else { // text, select, color, etc.
          val = inp.value;
        }
        newProps[field.key] = val;
      });

      // get old props
      const oldProps = { ...(tilePropsData[key] || {}) };
      // save back
      tilePropsData[key] = newProps;

      // record as a special action
      undoStack.push({ type:'prop', key, oldProps, newProps });
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack.length = 0;

      // close sidebar
      tileProps.classList.remove("open");
      canvasContainer.classList.remove("shifted");
    };

    // Close: just slide out
    btnClose.onclick = () => {
      tileProps.classList.remove("open");
      canvasContainer.classList.remove("shifted");
    };

    // ◾️ After `const db = firebase.database();`
    const browseBtn   = document.getElementById('browseShared');
    const sharedModalBackdrop = document.getElementById('sharedModalBackdrop');
    const sharedList  = document.getElementById('sharedList');
    const closeBtn    = document.getElementById('closeShared');

    // helper: convert Firebase shape to editor shape
    function normalizeLevelData(raw) {
      // raw is [ [ [id0,id1], ... ], ... ] for each row
      return raw.map(row =>
        row.map(cell => {
          if (Array.isArray(cell) && cell.length >= 2) {
            // interpret [layer0, layer1] 
            return [ cell[0], cell[1] ];
          } else {
            // fallback: empty cell
            return [0, 0];
          }
        })
      );
    }

    // helper: draw a mini‐preview into a canvas
    function makePreviewCanvas(levelGrid, cols, rows) {
      const preview = document.createElement('canvas');
      preview.width = cols;
      preview.height= rows;
      const pctx = preview.getContext('2d');
      const tileW = 2, tileH = 2; // each tile = 2×2 px
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const [bg, fg] = levelGrid[y][x];
          const color = palette[ fg ] || darkPalette[ bg ] || '#000';
          pctx.fillStyle = color;
          pctx.fillRect(x*tileW, y*tileH, tileW, tileH);
        }
      }
      preview.style.border = '1px solid #555';
      preview.style.marginRight = '8px';
      return preview;
    }

    browseBtn.addEventListener('click', async () => {
      sharedList.innerHTML = '<li>Loading…</li>';
        sharedModalBackdrop.style.display = 'flex';

      try {
        const snapshot = await db.ref('levels')
                                .orderByKey()
                                .limitToLast(20)
                                .once('value');
        const data = snapshot.val() || {};
        sharedList.innerHTML = '';

        const entries = Object.entries(data).reverse();
        if (!entries.length) {
          sharedList.innerHTML = '<li>No shared levels yet.</li>';
          return;
        }

        entries.forEach(([key, raw]) => {
          // raw is an array[row][col] of [id0,id1]
          const norm = normalizeLevelData(raw);
          const rows = norm.length;
          const cols = norm[0]?.length || 0;

          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          li.style.padding = '0.5em 0';
          li.style.borderBottom = '1px solid #444';
          li.style.cursor = 'pointer';

          // preview thumbnail
          const thumb = makePreviewCanvas(norm, cols, rows);
          li.appendChild(thumb);

          // label
          const lbl = document.createElement('span');
          lbl.textContent = key;
          li.appendChild(lbl);

          li.addEventListener('click', () => {
            // overwrite entire levels array with a single‐level pack
            levels = [ norm ];
            currentLevel = 0;
            level = levels[0];
            refreshLevelLabel();
            updateURLState();
            sharedModalBackdrop.style.display = "none"
          });

          sharedList.appendChild(li);
        });
      } catch (err) {
        sharedList.innerHTML = `<li style="color:red">Error: ${err.message}</li>`;
      }
    });

    closeBtn.addEventListener('click', () => {
      sharedModalBackdrop.style.display = 'none';
    });

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
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      SystematicAPI.trigger("onMouseDown", x, y, e.button);
    });

    canvas.addEventListener("mousemove", e => {
      if (isPainting) paintAt(e);
    });

    window.addEventListener("mouseup", e => {
      isPainting = false;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      SystematicAPI.trigger("onMouseUp", x, y, e.button);
    });
    canvas.addEventListener("mouseleave", () => {
      isPainting = false;
    });

    canvas.addEventListener("wheel", e => {
      if (mode !== "edit") return;
      e.preventDefault();

      // Compute the new tileSize
      const direction = e.deltaY < 0 ? 1 : -1;
      let newSize = tileSize + direction * spriteDim;
      newSize = Math.max(MIN_TILE, Math.min(MAX_TILE, newSize));
      if (newSize === tileSize) return;

      // Apply it
      tileSize = newSize;

      // Re‐clamp camera so no gaps appear
      camX = Math.max(0, Math.min(camX, mapCols * tileSize - canvas.width));
      camY = Math.max(0, Math.min(camY, mapRows * tileSize - canvas.height));

      // **NEW: Clear & rebuild both caches at the new tileSize**
      tileCache     = {};
      animTileCache = {};
      buildStaticTileCache();
      buildAnimatedCache();
    });

    window.addEventListener("keydown", e => {
      // 1) mark it pressed for movement
      keys[e.key] = true;
      SystematicAPI.trigger("onKeyDown", e.key, e);


      // 2) then your shortcuts
      if ((e.ctrlKey||e.metaKey) && e.key === 'z') {
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey||e.metaKey) && e.key === 'y') {
        e.preventDefault(); redo();
      }
    });
    window.addEventListener("keyup",   e => {;
      keys[e.key] = false;
      SystematicAPI.trigger("onKeyUp", e.key, e);
    });

    function encodeLevels(levels) {
      const json = JSON.stringify(levels);
      return LZString.compressToEncodedURIComponent(json);
    }

    // decompress from the URL back into a JS array (or null on failure)
    function decodeLevels(hash) {
      try {
        const json = LZString.decompressFromEncodedURIComponent(hash);
        return JSON.parse(json);
      } catch {
        return null;
      }
    }

    function updateURLState() {
      const hash = encodeLevels(levels);
      history.replaceState(null, "", "#" + hash);
    }

    // Only darken valid 6-digit hex colors; pass others through
    function deriveDark(palette) {
      return palette.map(color => {
        if (color.startsWith("rgba")) return color; // keep transparency as-is
        const rgb = hexToRgb(color);
        const darkened = {
          r: Math.floor(rgb.r * 0.5),
          g: Math.floor(rgb.g * 0.5),
          b: Math.floor(rgb.b * 0.5)
        };
        return `rgb(${darkened.r},${darkened.g},${darkened.b})`;
      });
    }

    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      const bigint = parseInt(hex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
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

    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 100;  // cap to save memory

    function paintAt(e) {
      const x = Math.floor((e.offsetX + camX) / tileSize);
      const y = Math.floor((e.offsetY + camY) / tileSize);
      if (x<0||y<0||x>=mapCols||y>=mapRows) return;
      const layer   = currentLayer;
      const oldTile = level[y][x][layer];
      const newTile = currentTile;
      if (oldTile===newTile) return;

      undoStack.push({ x,y,layer,oldTile,newTile });
      if (undoStack.length>MAX_HISTORY) undoStack.shift();
      redoStack.length=0;

      // apply
      level[y][x][layer] = newTile;
      updateURLState();
    }

    function undo() {
      if (!undoStack.length) return;
      const action = undoStack.pop();
      redoStack.push(action);

      if (action.type === 'prop') {
        tilePropsData[action.key] = action.oldProps;
        redrawTilePropsUIIfOpen();  // optional
      } else {
        const {x,y,layer, oldTile} = action;
        level[y][x][layer] = oldTile;
      }
    }

    function redo() {
      if (!redoStack.length) return;
      const action = redoStack.pop();
      undoStack.push(action);

      if (action.type === 'prop') {
        tilePropsData[action.key] = action.newProps;
        redrawTilePropsUIIfOpen();
      } else {
        const {x,y,layer, newTile} = action;
        level[y][x][layer] = newTile;
      }
    }

    const SPIKE_BASE_ID = 28;
    const spikeFrames   = [28, 29, 30, 29, 29,];
    const spikeHold     = 6;      // how many frames each anim step lasts

    let globalTick     = 0;       // increments every drawLevel call

    let darkPalette = deriveDark(palette);

    let tileCache       = {};      // holds *all* non-animated, static tile images
    let animTileCache   = {};      // holds only animated frames for animated IDs
    let lastCacheUpdate   = 0;       // timestamp of last anim-cache rebuild
    const ANIM_FPS         = 10;
    const ANIM_INTERVAL   = 1000 / ANIM_FPS;  // 50 ms

    // 1) Build your static cache once at startup:
    function buildStaticTileCache() {
      for (let id in sprites) {
        const sprArr = sprites[id];
        if (!sprArr?.length) continue;

        // skip animated-base IDs (e.g. SPIKE_BASE_ID)
        if (Number(id) === SPIKE_BASE_ID) continue;
        for (let layer = 0; layer < layerCount; layer++) {
          // flags can stay empty string if none
          buildTileCanvas(id, 0, layer, '', tileCache);
        }
      }
    }

    // 2) Build or rebuild your animated frames at up to 20 FPS:
    function buildAnimatedCache() {
      animTileCache = {};  // reset
      
      // rebuild only the spike frames (or any other animated IDs)
      for (let f = 0; f < spikeFrames.length; f++) {
        const id = spikeFrames[f];
        buildTileCanvas(id, /*frame*/f, /*layer*/0, /*flags*/'', animTileCache);
      }
      
      lastCacheUpdate = performance.now();
    }

    // track versions per layer
    let paletteVersions = [0, 0];  // index 0 for layer0, index1 for layer1

    // assume you have two palette arrays, e.g.:
    // layer 0 uses darkPalette, layer 1 uses palette
    function onPaletteChangeForLayer(layerIndex, newArr) {
      if (layerIndex === 0) {
        darkPalette = deriveDark(newArr);
      } else if (layerIndex === 1) {
        palette = newArr;
      } else {
        console.warn("unexpected layer", layerIndex);
        return;
      }

      // bump only that layer’s version
      paletteVersions[layerIndex]++;

      // throw away only the canvases for that layer
      // filter out any keys matching `:<layerIndex>:`  
      Object.keys(tileCache).forEach(key => {
        if (key.split(':')[2] == layerIndex) {
          delete tileCache[key];
        }
      });
      Object.keys(animTileCache).forEach(key => {
        if (key.split(':')[2] == layerIndex) {
          delete animTileCache[key];
        }
      });

      // rebuild *just* that layer’s canvases
      rebuildLayerInStaticCache(layerIndex);
      rebuildLayerInAnimCache(layerIndex);
    }

    function rebuildLayerInStaticCache(layerIndex) {
      for (let id in sprites) {
        // skip animated bases if needed
        for (let frame = 0; frame < sprites[id].length; frame++) {
          buildTileCanvas(id, frame, layerIndex, /*flags*/"", tileCache);
          // if you only ever use frame 0 in static cache, drop the frame loop
        }
      }
    }

    function rebuildLayerInAnimCache(layerIndex) {
      // same idea, but only for your animatable IDs on that layer
      // e.g. if only spikes animate on layer0:
      if (layerIndex === 0) {
        animTileCache = {};    // or just delete layer-0 entries as above
        buildAnimatedCache();  // which will re-bake layer0’s frames
      }
    }

    // 3) A helper to bake *one* tile into your chosen cache:

    // (1) Helper to bake *one* tile into a cache object:
    function buildTileCanvas(id, frame, layer, flags, cacheObj) {
      // ensure id is a string key
      const keyId = String(id);
      const sprArr = sprites[keyId];
      if (!sprArr) {
        console.warn(`buildTileCanvas: no sprites[${keyId}]`);
        return;
      }
      // clamp frame
      if (frame >= sprArr.length || frame < 0) {
        console.warn(`buildTileCanvas: sprites[${keyId}] has no frame ${frame}, using frame 0`);
        frame = 0;
      }
      const entry = sprArr[frame];
      if (!entry || !entry.data) {
        console.warn(`buildTileCanvas: sprites[${keyId}][${frame}].data is missing`);
        return;
      }

      const sprite    = entry.data;
      // pick the correct palette for this layer
      const pal       = layer === 0 ? darkPalette : palette;
      const dim       = sprite.length;
      const pixelSize = Math.floor(tileSize / dim) || 1;
      const offset    = Math.floor((tileSize - dim*pixelSize)/2);

      // create an offscreen canvas
      const cvs = document.createElement('canvas');
      cvs.width  = cvs.height = tileSize;
      const cx   = cvs.getContext('2d');

      for (let y = 0; y < dim; y++) {
        for (let x = 0; x < dim; x++) {
          const ci  = sprite[y][x];
          if (ci < 0) continue;
          const raw = pal[ci];
          if (!raw || raw === "#00000000" || raw === "rgba(0,0,0,0)") continue;
          cx.fillStyle = raw;
          cx.fillRect(
            offset + x*pixelSize,
            offset + y*pixelSize,
            pixelSize, pixelSize
          );
        }
      }

      const cacheKey = `${keyId}:${frame}:${layer}:${flags}`;
      cacheObj[cacheKey] = cvs;
    }

    // 4) Kick it all off:
    buildStaticTileCache();
    buildAnimatedCache();  // initial build

    // 5) In your game loop (drawLevel), before drawing, check if it’s time to rebuild anim frames:
    function maybeUpdateAnimatedCache() {
      const now = performance.now();
      if (now - lastCacheUpdate >= ANIM_INTERVAL) {
        buildAnimatedCache();
      }
    }

    function drawLevel() {
      globalTick++;
      maybeUpdateAnimatedCache();

      const frameIndex = Math.floor(globalTick / spikeHold) % spikeFrames.length;
      ctx.fillStyle = palette[6];
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const camXi = Math.round(camX), camYi = Math.round(camY);

      const startCol = Math.floor(camX / tileSize),
            endCol   = Math.ceil ((camX + canvas.width ) / tileSize),
            startRow = Math.floor(camY / tileSize),
            endRow   = Math.ceil ((camY + canvas.height) / tileSize);

      const minCol = Math.max(0, startCol),
            maxCol = Math.min(mapCols, endCol),
            minRow = Math.max(0, startRow),
            maxRow = Math.min(mapRows, endRow);

      for (let y = minRow; y < maxRow; y++) {
        for (let x = minCol; x < maxCol; x++) {
          for (let layer = 0; layer < layerCount; layer++) {
            let id = levels[currentLevel][y][x][layer];
            // animated-spike substitution
            if (id === SPIKE_BASE_ID) id = spikeFrames[frameIndex];

            // 1) TEXT-TILE HANDLING
            if (id === TEXT_TILE_ID) {
              // build the props-lookup key
              const propKey = `${currentLevel}-${x}-${y}-${layer}`;
              const txt     = tilePropsData[propKey]?.text || "";

              // measure & draw background
              const fontSize = Math.floor(tileSize / 3),
                    padding  = 4;
              ctx.font      = `${fontSize}px sans-serif`;
              const textW   = ctx.measureText(txt).width;
              const extraW  = Math.max(0, textW + padding*2 - tileSize);
              const bgX     = x*tileSize - camXi - extraW/2,
                    bgW     = tileSize + extraW;
              ctx.fillStyle = "#222";
              ctx.fillRect(bgX, y*tileSize - camYi, bgW, tileSize);

              // draw centered text
              ctx.fillStyle    = "#fff";
              ctx.textAlign    = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                txt,
                x*tileSize - camXi + tileSize/2,
                y*tileSize - camYi + tileSize/2
              );
              continue;  // skip sprite cache drawing
            }

            // 2) SPRITE TILES (cached)
            const frame = 0;      // only spikes animate, others use frame 0
            const flags = "";     // no special flags here
            const cacheKey = `${id}:${frame}:${layer}:${flags}`;
            const tileImg  = (id === SPIKE_BASE_ID ? animTileCache : tileCache)[cacheKey];

            if (tileImg) {
              ctx.drawImage(
                tileImg,
                x * tileSize - camXi,
                y * tileSize - camYi,
                tileSize, tileSize
              );
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
      const json = JSON.stringify(levels);
      // 1) persist in browser
      localStorage.setItem(SAVED_KEY, json);

      // 2) trigger download
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "levels.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Levels saved! ✅");
    }

    function loadAllLevelsFromStorage() {
      const stored = localStorage.getItem(SAVED_KEY);
      if (!stored) return alert("No saved levels in browser!");
      try {
        const arr = JSON.parse(stored);
        if (!Array.isArray(arr)) throw "Bad format";
        levels = arr;
        currentLevel = 0;
        level = levels[0];
        refreshLevelLabel();
        updateURLState();
        alert("Levels loaded from browser storage!");
      } catch (e) {
        alert("Failed to load saved levels: " + e);
      }
    }

    // file‐input loader (optional, for importing shared .json files)
    function loadAllLevelsFromFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = JSON.parse(reader.result);
          if (!Array.isArray(arr)) throw "Not an array";
          levels = arr;
          currentLevel = 0;
          level = levels[0];
          refreshLevelLabel();
          updateURLState();
          alert(`Imported ${arr.length} levels from file! 📂`);
          // also auto-save into localStorage:
          localStorage.setItem(SAVED_KEY, reader.result);
        } catch (err) {
          alert("Invalid level file: " + err);
        }
      };
      reader.readAsText(file);
    }

    document.getElementById("saveLevel").textContent = "Save All Levels";
    document.getElementById("saveLevel").onclick = saveAllLevels;

    function isValidLevelFormat(level) {
      // Must be a non‐empty array
      if (!Array.isArray(level) || level.length === 0) return false;
      const rowLength = level[0].length;
      // Every row must be an array of equal length
      if (!level.every(row => Array.isArray(row) && row.length === rowLength)) return false;
      // Every cell must be an array of two numbers
      return level.every(row =>
        row.every(cell =>
          Array.isArray(cell) &&
          cell.length === 2 &&
          typeof cell[0] === 'number' &&
          typeof cell[1] === 'number'
        )
      );
    }

    function uploadCurrentLevel() {
      const levelData = levels[currentLevel];

      if (!isValidLevelFormat(levelData)) {
        return alert("Level data is invalid — must be a 2D array of [number,number].");
      }

      const name = prompt("Enter a unique name for this level:");
      if (!name) return;

      db.ref("levels/" + name).set(levelData, err => {
        if (err) {
          alert("Upload failed: " + err.message);
        } else {
          alert("Level uploaded as: " + name);
        }
      });
    }

    function loadLevelFromFirebase() {
      const name = prompt("Enter level name to load:");
      if (!name) return;

      db.ref("levels/" + name).once("value", snapshot => {
        const data = snapshot.val();
        if (!data) {
          return alert("No level found with name: " + name);
        }
        if (!isValidLevelFormat(data)) {
          return alert("Loaded data is malformed. Aborting load.");
        }

        // Replace current level
        levels[currentLevel] = data;
        level = data;
        refreshLevelLabel();
        alert("Level loaded!");
      });
    }

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
      SystematicAPI.trigger("onPreInput", player, keys);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gravity   = gravityTiles * tileSize;
      const jumpPower = jumpTiles  * tileSize;
      const moveSpeed = moveTiles  * tileSize;
      const N         = player.spriteDim;
      const pixelSize = tileSize / N;
      player.width    = N * pixelSize;
      player.height   = N * pixelSize;

      if (mode === "play") {
        player._touchingRightPrev = player._touchingRightPrev || false;
        player._touchingLeftPrev  = player._touchingLeftPrev  || false;

        let touchingRight = false;
        let touchingLeft  = false;
        // Horizontal
        if      (keys["a"] || keys["ArrowLeft"])  player.vx = -moveSpeed;
        else if (keys["d"] || keys["ArrowRight"]) player.vx =  moveSpeed;
        else                                      player.vx =  0;

        // Jump
        if ((keys["w"] || keys["ArrowUp"]) && player.onGround) {
          player.vy       = jumpPower;
          player.onGround = false;
          SystematicAPI.trigger('onPlayerJump', player);
        }

        SystematicAPI.trigger("onPostInput", player, keys);

        player.x  += player.vx;
        const nextX = player.x + player.vx;
        const topY   = player.y;
        const bottomY = player.y + player.height - 1;

        // Check horizontal collisions only if moving horizontally
        if (player.vx !== 0) {
          if (player.vx > 0) {
            // Moving right: check right edge
            const rightEdge = nextX + player.width;
            for (let y = topY; y <= bottomY; y += tileSize/2) {
              if (isSolid(rightEdge, y)) {
                const col = Math.floor(rightEdge / tileSize);
                player.x = col * tileSize - player.width;
                const tx = Math.floor((player.x + player.width/2) / tileSize);
                const ty = Math.floor((player.y + player.height + 1) / tileSize);
                // use triggerCancelable instead of peeking at listeners
                const keepVx = SystematicAPI.triggerCancelable(
                  "prePlayerTouchWallRight",
                  player, tx, ty, /*layer=*/1
                );
                if (!keepVx) {
                  player.vx = 0;
                }

                // now fire the normal touch hook
                SystematicAPI.trigger("onPlayerTouchWallRight", player, tx, ty, 1);
                touchingRight = true;
                break;
              }
            }
          } else {
            // Moving left: check left edge
            const leftEdge = nextX;
            for (let y = topY; y <= bottomY; y += tileSize/2) {
              if (isSolid(leftEdge, y)) {
                const col = Math.floor(leftEdge / tileSize);
                player.x = (col + 1) * tileSize;
                const tx = Math.floor((player.x + player.width/2) / tileSize);
                const ty = Math.floor((player.y + player.height + 1) / tileSize);
                // use triggerCancelable for the left wall too
                const keepVx = SystematicAPI.triggerCancelable(
                  "prePlayerTouchWallLeft",
                  player, tx, ty, /*layer=*/1
                );
                if (!keepVx) {
                  player.vx = 0;
                }

                // then fire the normal touch hook
                SystematicAPI.trigger("onPlayerTouchWallLeft", player, tx, ty, 1);
                touchingLeft = true;
                break;
              }
            }
          }
        } else {
          player.x = nextX;
        }

        // now fire the “stop touching” events
        if (!touchingRight && player._touchingRightPrev) {
          const tx = Math.floor((player.x + player.width/2) / tileSize);
          const ty = Math.floor((player.y + player.height + 1) / tileSize);
          SystematicAPI.trigger("onPlayerStopTouchWallRight", player, tx, ty, 1);
        }
        if (!touchingLeft && player._touchingLeftPrev) {
          const tx = Math.floor((player.x + player.width/2) / tileSize);
          const ty = Math.floor((player.y + player.height + 1) / tileSize);
          SystematicAPI.trigger("onPlayerStopTouchWallLeft", player, tx, ty, 1);
        }

        // save for next frame
        player._touchingRightPrev = touchingRight;
        player._touchingLeftPrev  = touchingLeft;

        // Gravity
        player.vy += gravity;
        player.y  += player.vy;

        // Ceiling
        if (player.vy < 0) {
          const nextHeadY = player.y;
          if (isSolid(player.x, nextHeadY) || isSolid(player.x + player.width, nextHeadY)) {
            // determine which ceiling tile you’d be hitting
            const tileHY = Math.floor(nextHeadY / tileSize);
            const tx     = Math.floor((player.x + player.width/2) / tileSize);
            const ty     = tileHY;

            // — pre-hook: if any listener returns true, skip snapping
            const keepGoing = SystematicAPI.triggerCancelable(
              "prePlayerTouchCeiling",
              player, tx, ty, /*layer=*/1
            );

            if (keepGoing) {
              // NORMAL behavior
              player.vy = 0;
              player.y  = (tileHY + 1) * tileSize;
              SystematicAPI.trigger("onPlayerTouchCeiling", player, tx, ty, /*layer=*/1);
            }

            // if keepGoing===false, we do nothing here: vy stays as-is
          }
        }

        SystematicAPI.trigger("onPostPhysicsCollision", player, keys);

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

            SystematicAPI.trigger('onPlayerTouchGround', player, tileLX, tileRow, 1);
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

          const tx = Math.floor((player.x + player.width/2) / tileSize);
          const ty = Math.floor((player.y + player.height + 1) / tileSize);
          SystematicAPI.trigger('onPlayerBounce', player, tx, ty, /*layer=*/1);
        }

        SystematicAPI.trigger("onPostSpecialPhysicsCollision", player, keys);

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

      SystematicAPI.trigger('onUpdate', player, keys);
      requestAnimationFrame(update);
    }

    // 3) unify them every time you build the UI
    function makeBrushCategories() {
      // start with a shallow copy of the built-ins
      const cats = { ...builtinCategories };

      // merge in any mod-defined categories/sprites
      for (const [catName, ids] of Object.entries(brushCategories)) {
        if (!cats[catName]) cats[catName] = [];
        for (const id of ids) {
          if (!cats[catName].includes(id)) cats[catName].push(id);
        }
      }

      return cats;
    }

    function addSpriteToCategory(category, spriteid) {
      // If the category doesn't exist, create it as an empty array
      if (!brushCategories[category]) {
        brushCategories[category] = [];
      }

      // Add the sprite id if it's not already in the category
      if (!brushCategories[category].includes(spriteid)) {
        brushCategories[category].push(spriteid);
      }
    }

    function updateCategorySelector() {
      brushCategories = makeBrushCategories(); // <-- get fresh categories
      if (!catSel) {
        console.error("categorySelector element not found!");
        return;
      }

      catSel.innerHTML = Object.keys(brushCategories)
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");
    }

    // --- TILE BRUSH UI ---
    function createTileBrushes() {
      const container = document.getElementById("tileBrushes");
      container.innerHTML = "";
      container.style.display           = "grid";
      container.style.gridTemplateColumns = "repeat(11, 68px)";
      container.style.gridAutoRows      = "68px";
      container.style.gap               = "4px";
      container.style.height            = "calc(100% - 40px)";
      container.style.overflowY         = "auto";
      container.style.padding           = "10px";
      container.style.boxSizing         = "border-box";

      // 1) get built-in IDs for this category + search
      let brushCategories = makeBrushCategories();
      let idsToShow = brushCategories[currentCategory] || [];
      if (tileSearchQuery) {
        idsToShow = idsToShow.filter(idx => {
          const spr = sprites[idx]?.[0];
          return String(idx).includes(tileSearchQuery)
              || (spr?.name||"").toLowerCase().includes(tileSearchQuery);
        });
      }

      // 3) render buttons/canvases as before
      idsToShow.forEach(idx => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        c.dataset.tile    = idx;
        c.classList.add('brush');
        if (idx === currentTile) c.classList.add('selected');
        c.onclick = () => {
          currentTile = idx;
          document.querySelectorAll("#tileBrushes .brush")
                  .forEach(canv => canv.classList.remove("selected"));
          c.classList.add('selected');
        };
        c.onmouseover = () => {
          c.style.transform = "scale(1.1)";
          drawBrushHoverTooltips();
        };
        c.onmouseout = () => {
          c.style.transform = "scale(1)";
        };
        // draw existing sprite data
        const bctx = c.getContext("2d");
        bctx.fillStyle = palette[6];
        bctx.fillRect(0,0,64,64);
        const spr = sprites[idx]?.[0];
        if (spr?.data) {
          const pixelSize   = 3;
          const spriteSize  = spr.data.length * pixelSize;
          const offset      = (64 - spriteSize)/2;
          spr.data.forEach((row,y) =>
            row.forEach((ci,x) => {
              if (ci<0) return;
              bctx.fillStyle = palette[ci] || "#000";
              bctx.fillRect(
                offset + x*pixelSize,
                offset + y*pixelSize,
                pixelSize, pixelSize
              );
            })
          );
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
      const newPalette = palettes[e.target.value];
      palette = newPalette;

      // rebuild tile caches
      tileCache     = {};
      animTileCache = {};

      // update both layers
      onPaletteChangeForLayer(0, newPalette);
      onPaletteChangeForLayer(1, newPalette);

      buildStaticTileCache();
      buildAnimatedCache();

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

    // === Auto-load from localStorage ===
    const SAVED_KEY = "pixelPlatformerLevels";
    const stored = localStorage.getItem(SAVED_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          levels = arr;
          currentLevel = 0;
          level = levels[0];
        }
      } catch (e) {
        console.warn("Could not parse saved levels:", e);
      }
    }
    refreshLevelLabel();

    // Try to load from hash
    if (location.hash.length > 1) {
      const imported = decodeLevels(location.hash.slice(1));
      if (Array.isArray(imported)) {
        levels = imported;
        currentLevel = 0;
        level = levels[0];
      }
    }
    // Update UI & caches
    refreshLevelLabel();
    createTileBrushes();

    // Watch for manual hash changes (e.g. user pastes a link)
    window.addEventListener("hashchange", () => {
      const imported = decodeLevels(location.hash.slice(1));
      if (Array.isArray(imported)) {
        levels = imported;
        currentLevel = 0;
        level = levels[0];
        refreshLevelLabel();
        dirtyTiles.clear();
      }
    });

    // --- STARTUP ---
    updateCategorySelector();
    updatePaletteSelector(palsel);
    createTileBrushes();
    update();  // kick off main loop