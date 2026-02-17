// --- CONFIGURATION ---
const CONFIG = {
  INITIAL_TILE_SIZE: 30,
  SPRITE_DIM: 10,
  BASE_PIXEL_SIZE: 3,
  MIN_TILE: 30,
  MAX_TILE: 60,
  MAP_COLS: 60,
  MAP_ROWS: 30,
  CAMERA_LERP: 0.12,
  GRAVITY_TILES: 0.007,
  JUMP_TILES: -0.20,
  MOVE_TILES: 0.1,
  MAX_HISTORY: 100,
  ANIM_FPS: 10,
  SPIKE_HOLD: 6,
  SAVED_KEY: "pixelPlatformerLevels",
  ENABLE_LIGHTING: true, // Toggle for the new lighting engine
  LIGHT_SCALE: 0.5, // 0.5 = Half resolution (Much faster), 1.0 = Full resolution
  AMBIENT_LIGHT: 0.3 // 0 = pitch black, 1 = full brightness (no shadows)
};

// --- CORE SETTINGS ---
const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");

// --- LIGHTING SETUP (NEW) ---
const lightCanvas = document.createElement('canvas');
const lightCtx = lightCanvas.getContext('2d');

function resizeLights() {
    lightCanvas.width = Math.ceil(canvas.width * CONFIG.LIGHT_SCALE);
    lightCanvas.height = Math.ceil(canvas.height * CONFIG.LIGHT_SCALE);
    // Ensure smooth upscaling for soft shadows
    lightCtx.imageSmoothingEnabled = true; 
}

window.addEventListener('resize', resizeLights);
// Initial size sync
setTimeout(resizeLights, 100);

let tileSize = CONFIG.INITIAL_TILE_SIZE;
const spriteDim = CONFIG.SPRITE_DIM;
const BASE_PIXEL_SIZE = CONFIG.BASE_PIXEL_SIZE;
const MIN_TILE = CONFIG.MIN_TILE;
const MAX_TILE = CONFIG.MAX_TILE;
const mapCols  = CONFIG.MAP_COLS;
const mapRows  = CONFIG.MAP_ROWS;

// --- EDIT vs PLAY MODE ---
let mode = "edit"; 
let camX = 0, camY = 0;

let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
});

const palsel = document.getElementById("paletteSelector");
window.palettes = {
  "Forest": ["#1d1b2a", "#3e3c5e", "#67b26f", "#a3de83", "#6c567b", "#ffcc57", "#4b5bab", "#87ceeb", "#ffffff", "rgba(0,0,0,0)"],
  "Desert": ["#4a321a", "#a86030", "#d8a657", "#f0d9a3", "#8a5430", "#fff2c7", "#804040", "#b4dfe5", "#6b8c42", "rgba(0,0,0,0)"],
  "Pale Desert": ["#8c6e56", "#d99f70", "#f2c98c", "#fbeecf", "#c48f6a", "#fff9e4", "#8c5e56", "#aad4db", "#787878", "rgba(0,0,0,0)"],
  "Tundra": ["#2a3b4c", "#466d8c", "#6faac3", "#a8d0db", "#e2f4f9", "#ffffff", "#2f3640", "#b0e0ff", "#2d4f3e", "rgba(0,0,0,0)"],
  "Tropical": ["#2f1b0c", "#4e3b24", "#2e8b57", "#8ed487", "#ffe066", "#ffb347", "#008080", "#3ec3d3", "#ff4040", "rgba(0,0,0,0)"],
  "Swamp": ["#1e1b16", "#374227", "#5d6d3a", "#7f9943", "#aab95e", "#dce27a", "#4b0082", "#6a9e76", "#4a5d43", "rgba(0,0,0,0)"],
  "Pale Swamp": ["#2b2d2f", "#4a5c4e", "#6b7f6a", "#7a9a6d", "#a8c8a0", "#d1e3d5", "#6b5b6b", "#89c4b0", "#d8b4b4", "rgba(0,0,0,0)"],
  "Mountain": ["#2c2c2c", "#4b4b4b", "#6b6b6b", "#8a8f91", "#c0c0c0", "#ede8d1", "#3b5323", "#a2bce0", "#755139", "rgba(0,0,0,0)"],
  "Lavender": ["#3a2e47", "#5a4b72", "#7c6ba5", "#b5a0d0", "#d3c1e5", "#e6d9f9", "#2c2c54", "#bfb8e0", "#5a3a60", "rgba(0,0,0,0)"],
  "Spectrum": ["#2e222f", "#e43b44", "#feae34", "#fee761", "#63c74d", "#0095e9", "#b55088", "#2ce8f5", "#ffffff", "rgba(0,0,0,0)"],
  "Harmonic Spectrum": ["#262b44", "#cc4250", "#ed9b45", "#ebd365", "#9bc763", "#4fa4b8", "#9471b5", "#9ee3f0", "#ffffff", "rgba(0,0,0,0)"],
};

// --- LIGHTING MATH HELPERS (Ported from HTML) ---
function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(0,0,0,${alpha})`;
    if(hex.startsWith('rgba')) return hex;
    let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function getIntersection(ray, segment) {
    const r_px = ray.px, r_py = ray.py, r_dx = ray.dx, r_dy = ray.dy;
    const s_px = segment.p1.x, s_py = segment.p1.y;
    const s_dx = segment.p2.x - segment.p1.x, s_dy = segment.p2.y - segment.p1.y;
    const mag = Math.sqrt(s_dx*s_dx + s_dy*s_dy);
    if(mag===0) return null;
    const T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx);
    const T1 = (s_px+s_dx*T2-r_px)/r_dx;
    if(T1 > 0 && T2 >= 0 && T2 <= 1) return { x: r_px+r_dx*T1, y: r_py+r_dy*T1, param: T1 };
    return null;
}

function calculateVisibility(light, segments) {
    let points = [];
    const b = 1500; // Large bounds
    const bounds = [
        {p1: {x:light.x-b, y:light.y-b}, p2: {x:light.x+b, y:light.y-b}},
        {p1: {x:light.x+b, y:light.y-b}, p2: {x:light.x+b, y:light.y+b}},
        {p1: {x:light.x+b, y:light.y+b}, p2: {x:light.x-b, y:light.y+b}},
        {p1: {x:light.x-b, y:light.y+b}, p2: {x:light.x-b, y:light.y-b}}
    ];
    
    let allSegments = segments.concat(bounds);
    for(let s of allSegments) { points.push(s.p1, s.p2); }

    let uniqueAngles = [];
    for(let p of points) {
        let angle = Math.atan2(p.y - light.y, p.x - light.x);
        uniqueAngles.push(angle - 0.0001, angle, angle + 0.0001);
    }

    let intersects = [];
    for(let angle of uniqueAngles) {
        const ray = { px: light.x, py: light.y, dx: Math.cos(angle), dy: Math.sin(angle) };
        let closest = null, minT = Infinity;
        for(let seg of allSegments) {
            const hit = getIntersection(ray, seg);
            if(hit && hit.param < minT) { minT = hit.param; closest = hit; }
        }
        if(closest) { closest.angle = angle; intersects.push(closest); }
    }
    intersects.sort((a,b) => a.angle - b.angle);
    return intersects;
}

// Convert Grid Map to Segments for Raycasting
// Helper to check solidity without crashing on bounds
function isBlocking(x, y) {
    if (x < 0 || x >= mapCols || y < 0 || y >= mapRows) return false;
    let id = levels[currentLevel][y][x][1];

    // exclude modded tile ids with paremeter "TRANSPARENT" from list aswell
    for (let modId of SystematicAPI.customIds) {
      const def = SystematicAPI.getTileDef(modId);
      if (def && def.properties && def.properties.TRANSPARENT) {
        if (id === Number(modId)) return false;
      }
    }
    
    // filter springs and one way platforms from shadow casting (they still block player movement, just not light)
    return id !== 0 && ![23,24,25,26,27,29,30,31].includes(id);
}

// Convert Grid Map to Segments (Optimized: Only external edges)
function generateGeometryFromMap(camX, camY) {
    let segments = [];
    
    const buffer = 300; // Slightly larger buffer for long shadows
    const startCol = Math.max(0, Math.floor((camX - buffer) / tileSize));
    const endCol   = Math.min(mapCols, Math.ceil((camX + canvas.width + buffer) / tileSize));
    const startRow = Math.max(0, Math.floor((camY - buffer) / tileSize));
    const endRow   = Math.min(mapRows, Math.ceil((camY + canvas.height + buffer) / tileSize));

    for(let y = startRow; y < endRow; y++) {
        for(let x = startCol; x < endCol; x++) {
             if(isBlocking(x, y)) {
                 let wx = x * tileSize;
                 let wy = y * tileSize;
                 
                 // Only add segment if the neighbor is NOT blocking (Optimization)
                 
                 // Top Neighbor
                 if (!isBlocking(x, y - 1)) 
                    segments.push({p1:{x:wx, y:wy}, p2:{x:wx+tileSize, y:wy}});
                 
                 // Right Neighbor
                 if (!isBlocking(x + 1, y)) 
                    segments.push({p1:{x:wx+tileSize, y:wy}, p2:{x:wx+tileSize, y:wy+tileSize}});
                 
                 // Bottom Neighbor
                 if (!isBlocking(x, y + 1)) 
                    segments.push({p1:{x:wx+tileSize, y:wy+tileSize}, p2:{x:wx, y:wy+tileSize}});
                 
                 // Left Neighbor
                 if (!isBlocking(x - 1, y)) 
                    segments.push({p1:{x:wx, y:wy+tileSize}, p2:{x:wx, y:wy}});
             }
        }
    }
    return segments;
}

// MODDING API
window.SystematicAPI = (function(){
  const api = {};
  api.tiles        = {};       
  api.customIds    = []; 
  
  // LIGHTING API
  api.lights = []; 
  
  api.addLight = function(light) {
      // light structure: { x, y, radius, color, intensity }
      api.lights.push(light);
      return light;
  };
  
  api.clearLights = function() {
      api.lights = [];
  };

  // --- Tile Registration ---
  api.registerTile = function(def) {
    if (!def || typeof def !== "object") throw new Error("Tile definition must be an object");
    if (def.id == null) throw new Error("Tile needs an id");
    const sid = String(def.id);
    if (api.tiles[sid]) console.warn("Overwriting tile", sid);
    api.tiles[sid] = def;
    sprites[sid] = [{ data: def.sprite || [[-1]], name: def.name }];
    if (!api.customIds.includes(sid)) api.customIds.push(sid);
    buildTileCanvas(sid, 0, 0, "", tileCache);
    buildTileCanvas(sid, 0, 1, "", tileCache);
    addSpriteToCategory("All", def.id)
    addSpriteToCategory(def.category, def.id)
    updateCategorySelector();
    createTileBrushes();
  };

  api.getTileDef = function(id) {
    return api.tiles[String(id)] || null;
  };

  // --- Event System ---
  const listeners = {};
  api.on = (eventName, fn) => {
    if (typeof fn !== "function") throw new Error("Listener must be a function");
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(fn);
    return () => { listeners[eventName] = listeners[eventName].filter(f => f !== fn); };
  };
  api.off = (eventName, fn) => {
    if (!listeners[eventName]) return;
    listeners[eventName] = listeners[eventName].filter(f => f !== fn);
  };
  api.trigger = (eventName, ...args) => {
    (listeners[eventName] || []).forEach(fn => { try { fn(...args); } catch (err) { console.error(err); }});
  };
  api.triggerCancelable = function(eventName, ...args) {
    const fns = listeners[eventName] || [];
    for (const fn of fns) { if (fn(...args) === false) return false; }
    return true;
  };

  // --- Palette Registration ---
  api.registerColorPalette = function(name, colorArray) {
    window.palettes[name] = colorArray;
    updatePaletteSelector(palsel);
  };

  // --- Modal System ---
  const modals = {};
  api.registerModal = function(name, config) { modals[name] = config; };
  api.showModal = function(name) {
    const config = modals[name];
    if (!config) return;
    const backdrop = document.createElement("div");
    backdrop.className = "sysapi-modal-backdrop";
    backdrop.dataset.modal = name;
    const box = document.createElement("div");
    box.className = "sysapi-modal";
    const h1 = document.createElement("h2");
    h1.textContent = config.title || name;
    box.appendChild(h1);
    const body = document.createElement("div");
    body.className = "sysapi-modal-content";
    if (typeof config.content === "string") body.innerHTML = config.content;
    else if (config.content instanceof Node) body.appendChild(config.content);
    else if (typeof config.content === "function") body.appendChild(config.content());
    box.appendChild(body);
    const footer = document.createElement("div");
    footer.className = "sysapi-modal-footer";
    (config.buttons || []).forEach(btnCfg => {
      const btn = document.createElement("button");
      btn.textContent = btnCfg.label;
      btn.onclick = () => { try { btnCfg.onClick(); } catch(err){ console.error(err); } api.hideModal(name); };
      footer.appendChild(btn);
    });
    box.appendChild(footer);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  };
  api.hideModal = function(name) {
    let selector = typeof name === "string" ? `.sysapi-modal-backdrop[data-modal="${name}"]` : ".sysapi-modal-backdrop";
    const backdrop = document.querySelector(selector);
    if (backdrop) backdrop.remove();
  };

  // Modal Styling
  const style = document.createElement("style");
  style.textContent = `
    .sysapi-modal-backdrop { position:fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .sysapi-modal { background:#fff; border-radius:6px; padding:16px; max-width:80vw; max-height:80vh; overflow:auto; box-shadow:0 2px 10px rgba(0,0,0,0.3); }
    .sysapi-modal-content { margin:12px 0; }
    .sysapi-modal-footer { text-align:right; }
    .sysapi-modal-footer button { margin-left:8px; }
  `;
  document.head.appendChild(style);

  // === Property Schema ===
  let tilePropertySchemas = {
    23: [{ key: "jumpStrength", label: "Jump Strength", type: "number", min: 0.1, step: 0.1, default: 1.0 }],
    27: [{ key: "allowDrop", label: "Allow Drop (press S)", type: "checkbox", default: false }],
    31: [{ key: "text", label: "Text", type: "text", default: "" }]
  };

  function validateFieldDef(field) { return typeof field.key === 'string' && field.key.trim() !== ''; }

  api.registerTilePropertySchema = function(tileID, schemaArray) {
    tilePropertySchemas[tileID] = schemaArray.filter(f => validateFieldDef(f));
  };
  api.getTilePropertySchema = function(tileID) { return tilePropertySchemas[tileID] ? [...tilePropertySchemas[tileID]] : []; };
  api.removeTilePropertySchema = function(tileID) { delete tilePropertySchemas[tileID]; };

  // --- Particle System ---
  api._emitters = {};
  api._particles = [];
  api.registerParticleEmitter = function(name, config) { api._emitters[name] = config; };
  api.emitParticles = function(name, x, y) {
    const cfg = api._emitters[name];
    if (!cfg) return;
    for (let i = 0; i < (cfg.max||10); i++) {
      const life = randRange(cfg.lifetime[0], cfg.lifetime[1]);
      const vx   = randRange(cfg.velocity.x[0], cfg.velocity.x[1]);
      const vy   = randRange(cfg.velocity.y[0], cfg.velocity.y[1]);
      const col  = Array.isArray(cfg.color) ? cfg.color[Math.floor(Math.random()*cfg.color.length)] : cfg.color;
      const sz   = randRange(cfg.size[0], cfg.size[1]);
      api._particles.push({ x, y, vx, vy, life, age: 0, gravity: cfg.gravity||0, color: col, size: sz });
    }
  };
  api._updateParticles = function(dt) {
    const out = [];
    for (const p of api._particles) {
      p.age += dt;
      if (p.age < p.life) {
        p.vy += p.gravity * dt;
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        out.push(p);
      }
    }
    api._particles = out;
  };
  api._drawParticles = function(ctx, camX, camY, tileSize) {
    for (const p of api._particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, 2*Math.PI);
      ctx.fill();
    }
  };

  // --- Tile/Level Utilities ---
  api.getTileAt = function(x, y, layer = 1) { return levels[currentLevel][y]?.[x]?.[layer]; };
  api.setTileAt = function(x, y, layer, id) { if(levels[currentLevel][y]?.[x]) levels[currentLevel][y][x][layer] = id; return true; };
  api.getTileProperties = function(x, y, layer = 1) { return tilePropsData[`${currentLevel}-${x}-${y}-${layer}`] || {}; };
  api.setTileProperties = function(x, y, layer, props) { tilePropsData[`${currentLevel}-${x}-${y}-${layer}`] = { ...props }; };
  api.fillRect = function(x, y, w, h, layer, id) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        api.setTileAt(x + dx, y + dy, layer, id);
      }
    }
  };

  api.findTiles = function(id, layer = 1) {
    const found = [];
    for (let y = 0; y < mapRows; y++) {
      for (let x = 0; x < mapCols; x++) {
        if (levels[currentLevel][y][x][layer] === id) {
          found.push({ x, y });
        }
      }
    }
    return found;
  };

  api.getPlayerPosition = function() {
    return { x: player.x, y: player.y };
  };

  api.setPlayerPosition = function(x, y) {
    player.x = x;
    player.y = y;
  };

  api.getCurrentLevelIndex = function() {
    return currentLevel;
  };

  api.setCurrentLevel = function(index) {
    if (index >= 0 && index < levels.length) {
      currentLevel = index;
      level = levels[currentLevel];
      return true;
    }
    return false;
  };

  api.forEachTile = function(callback) {
    for (let layer = 0; layer < layerCount; layer++) {
      for (let y = 0; y < mapRows; y++) {
        for (let x = 0; x < mapCols; x++) {
          callback(x, y, layer, levels[currentLevel][y][x][layer]);
        }
      }
    }
  };

  api.reloadLevel = function() {
    loadAllLevelsFromStorage();
  };

  api.exportLevelAsJSON = function() {
    return JSON.stringify(levels[currentLevel]);
  };

  api.importLevelFromJSON = function(json) {
    try {
      const arr = JSON.parse(json);
      if (isValidLevelFormat(arr)) {
        levels[currentLevel] = arr;
        level = arr;
        refreshLevelLabel();
        return true;
      }
    } catch {}
    return false;
  };

  // --- Utility ---
  function randRange(a,b){ return a + Math.random()*(b-a); }

  // --- Expose listeners for debugging ---
  api._listeners = listeners;

  return api;
})();

const TEXT_TILE_ID = 31
const originalBuiltInCount = sprites.length;
const all = sprites.map((_, i) => i).filter(i => ![24,25,26,29,30].includes(i));
const painted = sprites.map((_, i) => i).filter(i => i >= originalBuiltInCount);

let builtinCategories = {
  "All":        all,
  "Terrain":    [0,1,2,3,4,35,38,37],
  "Cobblestone":[0,7,8,9,10,11,12,13,14],
  "Wood":       [0,21,22],
  "Ancient Stones":[5,6,15,16,17,18,19,20,32,33,34],
  "Other":      [0,23,27,28,31,36,39],
  "Painted":    painted
};

let brushCategories = {};
let currentCategory = "All";
let tileSearchQuery = "";
let palette = window.palettes["Forest"];
let currentTile = 2;
let layerCount = 2; 
let levels = [];
let currentLevel = 0;

function makeEmptyLevel() {
  return Array.from({ length: mapRows }, () => Array.from({ length: mapCols }, () => new Array(layerCount).fill(0)));
}
levels.push(makeEmptyLevel());        
let level = levels[currentLevel];     
const tilePropsData = {};

let player = {
  x: 100, y: 100, vx: 0, vy: 0, width: 22, height: 22, onGround: false,
  sprite: [[1,1,0,1,1,0,1,1],[1,0,0,0,0,0,0,1],[0,0,0,2,2,0,0,0],[1,0,2,3,3,2,0,1],[1,0,2,3,3,2,0,1],[0,0,0,2,2,0,0,0],[1,0,0,0,0,0,0,1],[1,1,0,1,1,0,1,1]],
  spriteDim: 8
};
const keys = {};

updatePaletteSelector(palsel);

function updatePaletteSelector(palsel) {
  if (!palsel) return;
  palsel.innerHTML = Object.keys(window.palettes).map(name => `<option value="${name}">${name}</option>`).join("");
}
palsel.onchange = e => { palette = window.palettes[e.target.value]; createTileBrushes(); onPaletteChangeForLayer(0,palette); onPaletteChangeForLayer(1,palette); };

const controlsPanel = document.getElementById('controls');
document.getElementById('toggleControls').addEventListener('click', () => {
  const isVisible = controlsPanel.style.display === 'flex';
  controlsPanel.style.display = isVisible ? 'none' : 'flex';
});
document.getElementById('playtestBtn').addEventListener('click', togglePlaytest);
document.getElementById("saveLevel").addEventListener("click", saveLevel);
document.getElementById("loadLevel").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file"; input.accept= ".json";
  input.onchange = e => { if (e.target.files[0]) loadAllLevelsFromFile(e.target.files[0]); };
  input.click();
});

const catSel = document.getElementById("categorySelector");
catSel.onchange = e => { currentCategory = e.target.value; createTileBrushes(); };
document.getElementById("layerSelector").onchange = e => { currentLayer = Number(e.target.value); };

const prevBtn = document.getElementById("prevLevel"), nextBtn = document.getElementById("nextLevel"), addBtn = document.getElementById("addLevel"), lbl = document.getElementById("levelLabel");
function refreshLevelLabel() { lbl.textContent = `Level ${currentLevel + 1} / ${levels.length}`; }
prevBtn.onclick = () => { if (currentLevel > 0) { currentLevel--; level = levels[currentLevel]; refreshLevelLabel(); }};
nextBtn.onclick = () => { if (currentLevel < levels.length - 1) { currentLevel++; level = levels[currentLevel]; refreshLevelLabel(); }};
addBtn.onclick = () => { levels.push(makeEmptyLevel()); currentLevel = levels.length - 1; level = levels[currentLevel]; refreshLevelLabel(); };
refreshLevelLabel();

document.getElementById("tileSearch").addEventListener("input", e => { tileSearchQuery = e.target.value.trim().toLowerCase(); createTileBrushes(); });

const canvasContainer = document.getElementById("canvasContainer"), tileProps = document.getElementById("tileProps"), propXY = document.getElementById("propXY"), customProps = document.getElementById("customProps"), btnApply = document.getElementById("propApply"), btnClose = document.getElementById("propClose");

canvas.addEventListener("contextmenu", e => {
  e.preventDefault();
  const tx = Math.floor((e.offsetX + camX) / tileSize);
  const ty = Math.floor((e.offsetY + camY) / tileSize);
  if (tx < 0 || ty < 0 || tx >= mapCols || ty >= mapRows) return;
  const layer = currentLayer;
  const id = levels[currentLevel][ty][tx][layer];
  const schema = SystematicAPI.getTilePropertySchema(id);
  if (!schema.length) return;
  lastTileX = tx; lastTileY = ty; lastLayer = layer;
  propXY.textContent = `${tx}, ${ty}`;
  customProps.innerHTML = "";
  const existing = tilePropsData[`${currentLevel}-${tx}-${ty}-${layer}`] || {};
  schema.forEach(field => {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.type = field.type === "checkbox" ? "checkbox" : field.type;
    input.id = `propField-${field.key}`;
    input.name = field.key;
    if (field.type === "checkbox") input.checked = existing[field.key] ?? field.default;
    else { if (field.min != null) input.min = field.min; if (field.step != null) input.step = field.step; input.value = existing[field.key] ?? field.default; }
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = field.label + ": ";
    wrapper.appendChild(label); wrapper.appendChild(input); customProps.appendChild(wrapper);
  });
  tileProps.classList.add("open"); canvasContainer.classList.add("shifted");
});

btnApply.onclick = () => {
  const key = `${currentLevel}-${lastTileX}-${lastTileY}-${lastLayer}`;
  const id = levels[currentLevel][lastTileY][lastTileX][lastLayer];
  const schema = SystematicAPI.getTilePropertySchema(id);
  const data = {};
  schema.forEach(field => {
    const inp = document.getElementById(`propField-${field.key}`);
    data[field.key] = field.type === "checkbox" ? inp.checked : (field.type === "number" ? parseFloat(inp.value) : inp.value);
  });
  const oldProps = {...tilePropsData[key]}; tilePropsData[key] = data;
  undoStack.push({ type:'prop', key, oldProps, data });
  if (undoStack.length>CONFIG.MAX_HISTORY) undoStack.shift(); redoStack.length = 0;
  tileProps.classList.remove("open"); canvasContainer.classList.remove("shifted");
};
btnClose.onclick = () => { tileProps.classList.remove("open"); canvasContainer.classList.remove("shifted"); };

let isPainting = false;
let currentLayer = 1;

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

    const viewDocsBtn = document.getElementById('viewDocsBtn');
    const docsModal   = document.getElementById('docsModal');
    const docsContent = document.getElementById('docsContent');
    const closeDocs   = document.getElementById('closeDocs');

    // raw URL for your README
    const README_URL = 'https://raw.githubusercontent.com/lolo23450/systematic/main/README.md';

    viewDocsBtn.addEventListener('click', async () => {
      docsModal.style.display = 'flex';
      docsContent.innerHTML  = 'Loading…';
      try {
        const res  = await fetch(README_URL);
        const md   = await res.text();
        // render markdown to HTML
        docsContent.innerHTML = marked.parse(md);
      } catch (err) {
        docsContent.innerHTML = `<p style="color:salmon">Failed to load docs:<br>${err}</p>`;
      }
    });

    closeDocs.addEventListener('click', () => {
      docsModal.style.display = 'none';
    });

canvas.addEventListener("mousedown", e => {
  if (mode !== "edit" || e.button !== 0) return;
  if (currentTile === TEXT_TILE_ID) placeTextTile(e);
  else { isPainting = true; paintAt(e); }
  const rect = canvas.getBoundingClientRect();
  SystematicAPI.trigger("onMouseDown", e.clientX - rect.left, e.clientY - rect.top, e.button);
});
canvas.addEventListener("mousemove", e => { if (isPainting) paintAt(e); });
window.addEventListener("mouseup", e => { isPainting = false; const rect = canvas.getBoundingClientRect(); SystematicAPI.trigger("onMouseUp", e.clientX - rect.left, e.clientY - rect.top, e.button); });
canvas.addEventListener("mouseleave", () => { isPainting = false; });
canvas.addEventListener("wheel", e => {
  if (mode !== "edit") return;
  e.preventDefault();
  const direction = e.deltaY < 0 ? 1 : -1;
  let newSize = Math.max(CONFIG.MIN_TILE, Math.min(CONFIG.MAX_TILE, tileSize + direction * spriteDim));
  if (newSize === tileSize) return;
  tileSize = newSize;
  camX = Math.max(0, Math.min(camX, mapCols * tileSize - canvas.width));
  camY = Math.max(0, Math.min(camY, mapRows * tileSize - canvas.height));
  tileCache = {}; animTileCache = {}; buildStaticTileCache(); buildAnimatedCache();
});

window.addEventListener("keydown", e => {
  keys[e.key] = true;
  SystematicAPI.trigger("onKeyDown", e.key, e);
  if ((e.ctrlKey||e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
});
window.addEventListener("keyup", e => { keys[e.key] = false; SystematicAPI.trigger("onKeyUp", e.key, e); });

function encodeLevels(levels) { return LZString.compressToEncodedURIComponent(JSON.stringify(levels)); }
function decodeLevels(hash) { try { return JSON.parse(LZString.decompressFromEncodedURIComponent(hash)); } catch { return null; }}
function updateURLState() { history.replaceState(null, "", "#" + encodeLevels(levels)); }

function deriveDark(palette) {
  return palette.map(color => {
    if (color.startsWith("rgba")) return color;
    const rgb = hexToRgb(color);
    return `rgb(${Math.floor(rgb.r * 0.5)},${Math.floor(rgb.g * 0.5)},${Math.floor(rgb.b * 0.5)})`;
  });
}
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  const bigint = parseInt(hex, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function placeTextTile(e) {
  const x = Math.floor((e.offsetX + camX) / tileSize), y = Math.floor((e.offsetY + camY) / tileSize);
  if (x < 0 || y < 0 || x >= mapCols || y >= mapRows) return;
  const txt = prompt(`Enter text at (${x},${y}):`, "");
  if (txt === null) return;
  levels[currentLevel][y][x][currentLayer] = TEXT_TILE_ID;
  tilePropsData[`${currentLevel}-${x}-${y}-${currentLayer}`] = { text: txt };
}

const undoStack = [], redoStack = [];
function paintAt(e) {
  const x = Math.floor((e.offsetX + camX) / tileSize), y = Math.floor((e.offsetY + camY) / tileSize);
  if (x<0||y<0||x>=mapCols||y>=mapRows) return;
  const layer = currentLayer, oldTile = level[y][x][layer], newTile = currentTile;
  if (oldTile===newTile) return;
  undoStack.push({ x,y,layer,oldTile,newTile });
  if (undoStack.length>CONFIG.MAX_HISTORY) undoStack.shift(); redoStack.length=0;
  level[y][x][layer] = newTile;
  
  SystematicAPI.trigger("onTilePlaced", x * 30, y * 30, layer, newTile);
  updateURLState();
}

function undo() {
  if (!undoStack.length) return;
  const action = undoStack.pop(); redoStack.push(action);
  if (action.type === 'prop') { tilePropsData[action.key] = action.oldProps; if(tileProps.classList.contains("open")) btnApply.click(); }
  else level[action.y][action.x][action.layer] = action.oldTile;
}
function redo() {
  if (!redoStack.length) return;
  const action = redoStack.pop(); undoStack.push(action);
  if (action.type === 'prop') { tilePropsData[action.key] = action.data; if(tileProps.classList.contains("open")) btnApply.click(); }
  else level[action.y][action.x][action.layer] = action.newTile;
}

const SPIKE_BASE_ID = 28, spikeFrames = [28, 29, 30, 29, 29], spikeHold = CONFIG.SPIKE_HOLD;
let globalTick = 0, darkPalette = deriveDark(palette);
let tileCache = {}, animTileCache = {}, lastCacheUpdate = 0;

function buildStaticTileCache() {
  for (let id in sprites) {
    if (!sprites[id]?.length || Number(id) === SPIKE_BASE_ID) continue;
    for (let layer = 0; layer < layerCount; layer++) buildTileCanvas(id, 0, layer, '', tileCache);
  }
}
function buildAnimatedCache() {
  animTileCache = {};
  for (let f = 0; f < spikeFrames.length; f++) buildTileCanvas(spikeFrames[f], f, 0, '', animTileCache);
  lastCacheUpdate = performance.now();
}
function onPaletteChangeForLayer(layerIndex, newArr) {
  if (layerIndex === 0) darkPalette = deriveDark(newArr); else palette = newArr;
  Object.keys(tileCache).forEach(key => { if (key.split(':')[2] == layerIndex) delete tileCache[key]; });
  Object.keys(animTileCache).forEach(key => { if (key.split(':')[2] == layerIndex) delete animTileCache[key]; });
  for (let id in sprites) buildTileCanvas(id, 0, layerIndex, "", tileCache);
  if (layerIndex === 0) buildAnimatedCache();
}
function buildTileCanvas(id, frame, layer, flags, cacheObj) {
  const keyId = String(id), sprArr = sprites[keyId];
  if (!sprArr) return;
  const entry = sprArr[frame >= sprArr.length ? 0 : frame];
  if (!entry?.data) return;
  const sprite = entry.data, pal = layer === 0 ? darkPalette : palette;
  const dim = sprite.length, pixelSize = Math.floor(tileSize / dim) || 1, offset = Math.floor((tileSize - dim*pixelSize)/2);
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = tileSize; const cx = cvs.getContext('2d');
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const ci = sprite[y][x];
      if (ci < 0) continue;
      const raw = pal[ci];
      if (!raw || raw === "rgba(0,0,0,0)") continue;
      cx.fillStyle = raw; cx.fillRect(offset + x*pixelSize, offset + y*pixelSize, pixelSize, pixelSize);
    }
  }
  cacheObj[`${keyId}:${frame}:${layer}:${flags}`] = cvs;
}
buildStaticTileCache(); buildAnimatedCache();

function renderLighting() {
    if(!CONFIG.ENABLE_LIGHTING) return;
    
    const scale = CONFIG.LIGHT_SCALE;

    // --- CUSTOMIZABLE SHADOW TRANSPARENCY ---
    // Instead of black, we calculate a gray based on AMBIENT_LIGHT
    lightCtx.globalCompositeOperation = 'source-over';
    const ambientIntensity = Math.floor(255 * CONFIG.AMBIENT_LIGHT);
    lightCtx.fillStyle = `rgb(${ambientIntensity}, ${ambientIntensity}, ${ambientIntensity})`;
    
    // Fill the lightmap with this "dim light" instead of darkness
    lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

    // Prepare active lights
    let activeLights = [...SystematicAPI.lights];

    // Sun (Customizable Sun Color)
    activeLights.push({ 
        x: camX + canvas.width/2, 
        y: camY - 1000, 
        radius: 2000, 
        color: '#aa9dfe', 
        intensity: 1.0 // Sun usually overpowers ambient
    });

    // Generate Geometry from Grid
    const geometry = generateGeometryFromMap(camX, camY);

    for(let light of activeLights) {
        // Culling
        const sx = light.x - camX;
        const sy = light.y - camY;
        if(sx + light.radius < 0 || sx - light.radius > canvas.width || 
           sy + light.radius < 0 || sy - light.radius > canvas.height) continue;
        
        const polygon = calculateVisibility(light, geometry);

        lightCtx.save();

        // Scale and Translate
        lightCtx.scale(scale, scale);
        lightCtx.translate(-camX, -camY);
        
        // Use 'screen' to ADD light to our ambient gray base
        lightCtx.globalCompositeOperation = 'screen'; 

        // 1. Clip to the Visible Area (The "Not Shadow" zone)
        lightCtx.save();
        lightCtx.beginPath();
        if(polygon.length > 0) { 
            lightCtx.moveTo(polygon[0].x, polygon[0].y); 
            for(let i = 1; i < polygon.length; i++) lightCtx.lineTo(polygon[i].x, polygon[i].y);
        }
        lightCtx.closePath();
        lightCtx.clip();

        // 2. Draw Light Gradient
        const g = lightCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        g.addColorStop(0, hexToRgba(light.color, light.intensity));
        g.addColorStop(1, hexToRgba(light.color, 0));
        lightCtx.fillStyle = g;
        
        // Draw the light
        lightCtx.fillRect(light.x - light.radius, light.y - light.radius, light.radius*2, light.radius*2);
        
        lightCtx.restore(); // End Clip
        lightCtx.restore(); // End Transform
    }

    // Composite Light Map onto Game
    ctx.save();

    // Enable smoothing to blur the low-res pixels slightly
    ctx.imageSmoothingEnabled = true;
    
    // SHADOW STRENGHT CONTROL:
    // MULTIPLY: 
    // White pixels (Light) * Game = Normal Game Brightness
    // Gray pixels (Ambient) * Game = Darkened Game (Visible Shadows)
    // Black pixels * Game = Invisible (Pitch Black)
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.2;
    ctx.drawImage(lightCanvas, 0, 0, canvas.width, canvas.height);
    
    // Additive Bloom/Glow Post Effect
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(lightCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawTileReflections(activeLights, camX, camY, scale);
}

function drawTileReflections(activeLights, camX, camY, scale) {
    const buffer = 1;
    const startCol = Math.max(0, Math.floor(camX / tileSize) - buffer);
    const endCol = Math.min(mapCols, Math.ceil((canvas.width / scale + camX) / tileSize) + buffer);
    const startRow = Math.max(0, Math.floor(camY / tileSize) - buffer);
    const endRow = Math.min(mapRows, Math.ceil((canvas.height / scale + camY) / tileSize) + buffer);

    lightCtx.save();
    lightCtx.globalCompositeOperation = 'lighter';
    // Use scale to match the low-res light map
    lightCtx.scale(scale, scale);
    lightCtx.translate(-camX, -camY);

    const edgeWidth = 2; // Thickness of the reflection line

    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            // 1. Is this tile solid?
            if (!isBlocking(x, y)) continue;

            // 2. Which edges are exposed to air?
            const top    = !isBlocking(x, y - 1);
            const bottom = !isBlocking(x, y + 1);
            const left   = !isBlocking(x - 1, y);
            const right  = !isBlocking(x + 1, y);

            // 3. Skip if it's an interior tile (no exposed edges)
            if (!(top || bottom || left || right)) continue;

            const tx = x * tileSize;
            const ty = y * tileSize;
            const centerX = tx + tileSize / 2;
            const centerY = ty + tileSize / 2;

            for (let light of activeLights) {
                // Distance check for performance
                const dx = light.x - centerX;
                const dy = light.y - centerY;
                const distSq = dx * dx + dy * dy;
                const radSq = light.radius * light.radius;

                if (distSq < radSq) {
                    const dist = Math.sqrt(distSq);
                    const intensity = (1 - dist / light.radius) * light.intensity * 0.5;
                    lightCtx.fillStyle = hexToRgba(light.color, intensity);

                    // 4. Only draw the specific edges that are exposed
                    // Top Edge
                    if (top && light.y < ty) {
                        lightCtx.fillRect(tx, ty, tileSize, edgeWidth);
                    }
                    // Bottom Edge
                    if (bottom && light.y > ty + tileSize) {
                        lightCtx.fillRect(tx, ty + tileSize - edgeWidth, tileSize, edgeWidth);
                    }
                    // Left Edge
                    if (left && light.x < tx) {
                        lightCtx.fillRect(tx, ty, edgeWidth, tileSize);
                    }
                    // Right Edge
                    if (right && light.x > tx + tileSize) {
                        lightCtx.fillRect(tx + tileSize - edgeWidth, ty, edgeWidth, tileSize);
                    }
                }
            }
        }
    }
    lightCtx.restore();
}

function drawLevel() {
  globalTick++;
  if (performance.now() - lastCacheUpdate >= 1000/CONFIG.ANIM_FPS) buildAnimatedCache();

  const frameIndex = Math.floor(globalTick / spikeHold) % spikeFrames.length;
  ctx.fillStyle = palette[7]; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camXi = Math.round(camX), camYi = Math.round(camY);
  const startCol = Math.max(0, Math.floor(camX / tileSize)), endCol = Math.min(mapCols, Math.ceil ((camX + canvas.width ) / tileSize));
  const startRow = Math.max(0, Math.floor(camY / tileSize)), endRow = Math.min(mapRows, Math.ceil ((camY + canvas.height) / tileSize));

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      for (let layer = 0; layer < layerCount; layer++) {
        let id = levels[currentLevel][y][x][layer];
        if (id === SPIKE_BASE_ID) id = spikeFrames[frameIndex];
        if (id === TEXT_TILE_ID) {
          const txt = tilePropsData[`${currentLevel}-${x}-${y}-${layer}`]?.text || "";
          const fontSize = Math.floor(tileSize / 3), textW = ctx.measureText(txt).width, extraW = Math.max(0, textW + 8 - tileSize);
          ctx.fillStyle = "#222"; ctx.fillRect(x*tileSize - camXi - extraW/2, y*tileSize - camYi, tileSize + extraW, tileSize);
          ctx.fillStyle = "#fff"; ctx.font = `${fontSize}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(txt, x*tileSize - camXi + tileSize/2, y*tileSize - camYi + tileSize/2);
          continue;
        }
        const tileImg = (id === SPIKE_BASE_ID ? animTileCache : tileCache)[`${id}:0:${layer}:`];
        if (tileImg) ctx.drawImage(tileImg, x * tileSize - camXi, y * tileSize - camYi, tileSize, tileSize);
      }
    }
  }
}

function drawSprite(data, x, y) {
  const spriteDim = data.length, pixelSize = Math.floor(tileSize / spriteDim) || 1, offset = Math.floor((tileSize - spriteDim*pixelSize) / 2);
  for (let row = 0; row < spriteDim; row++) {
    for (let col = 0; col < spriteDim; col++) {
      const ci = data[row][col];
      if (ci < 0) continue;
      ctx.fillStyle = palette[ci] || "#000";
      ctx.fillRect(x + offset + col * pixelSize, y + offset + row * pixelSize, pixelSize, pixelSize);
    }
  }
}
function drawPlayer() { drawSprite(player.sprite, player.x - camX, player.y - camY); }

function drawGrid() {
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  for (let x = 0; x < mapCols + 25; x++) { ctx.beginPath(); ctx.moveTo(x * tileSize - camX, 0); ctx.lineTo(x * tileSize - camX, canvas.height); ctx.stroke(); }
  for (let y = 0; y < mapRows; y++) { ctx.beginPath(); ctx.moveTo(0, y * tileSize - camY); ctx.lineTo(canvas.width, y * tileSize - camY); ctx.stroke(); }
}

function moveCamera() {
  if (mode === "play") {
    let camTargetX = Math.max(0, Math.min(levels[0][0].length * tileSize - canvas.width, player.x - canvas.width/2 + player.width/2));
    let camTargetY = Math.max(0, Math.min(mapRows * tileSize - canvas.height, player.y - canvas.height/2 + player.height/2));

    // almost pixel perfect camera smoothing, each game pixel is 3 pixels on the canvas, so we round to nearest multiple of 3 for that satisfying crispness, use CONFIG.CAMERA_LERP to control the speed of the camera catching up to the player (0.1 = 10% of the distance per frame)
    camX = Math.round((camX + (camTargetX - camX) * CONFIG.CAMERA_LERP * 0.5) / 1.5) * 1.5; 
    camY = Math.round((camY + (camTargetY - camY) * CONFIG.CAMERA_LERP * 0.5) / 1.5) * 1.5;

  } else {
    if (keys["ArrowLeft"] || keys["a"]) camX -= 10;
    if (keys["ArrowRight"] || keys["d"]) camX += 10;
    if (keys["ArrowUp"] || keys["w"]) camY -= 10;
    if (keys["ArrowDown"] || keys["s"]) camY += 10;
    camX = Math.max(0, Math.min(camX, mapCols * tileSize - canvas.width));
    camY = Math.max(0, Math.min(camY, mapRows * tileSize - canvas.height));
  }
}

function saveLevel() {
  const json = JSON.stringify(levels);
  localStorage.setItem(CONFIG.SAVED_KEY, json);
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "levels.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  alert("Levels saved! ✅");
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

function getCell(col, row, layer) { if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return 0; return levels[currentLevel][row][col][layer]; }
function isSolid(px, py) { const id = getCell(Math.floor(px / tileSize), Math.floor(py / tileSize), 1); return id !== 0 && id !== 27; }
function isOneWayTile(px, py) { return getCell(Math.floor(px / tileSize), Math.floor(py / tileSize), 1) === 27; }
function isBounceTile(px, py) { return getCell(Math.floor(px / tileSize), Math.floor(py / tileSize), 1) === 23; }

function animateTileOnce(layer, x, y, frames, fps) {
  const key = x + "," + y;
  if (animateTileOnce[key]) return;
  animateTileOnce[key] = true;
  let idx = 0;
  function step() {
    if (idx < frames.length) { level[y][x][layer] = frames[idx++]; setTimeout(step, 1000/fps); }
    else delete animateTileOnce[key];
  }
  step();
}

function togglePlaytest() {
  if (mode === "edit") { mode = "play"; player.x = 100; player.y = 100; player.vx = player.vy = 0; }
  else mode = "edit";
}

let lastTime = performance.now();
function update(now = performance.now()) {
  let dt = (now - lastTime) / 1000; lastTime = now; dt = Math.min(dt, 1/60);
  
  SystematicAPI.trigger("onPreInput", player, keys);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  SystematicAPI._updateParticles(dt);
  
  const gravity = CONFIG.GRAVITY_TILES * tileSize, jumpPower = CONFIG.JUMP_TILES * tileSize, moveSpeed = CONFIG.MOVE_TILES * tileSize;
  const N = player.spriteDim, pixelSize = tileSize / N; player.width = N * pixelSize; player.height = N * pixelSize;

if (mode === "play") {
    // 1. Reset states for the frame
    const wasOnWallRight = player.onWallRight;
    const wasOnWallLeft = player.onWallLeft;
    player.onWallRight = false;
    player.onWallLeft = false;
    player.onGround = false;

    // Input
    if (keys["a"] || keys["ArrowLeft"]) player.vx = -moveSpeed; 
    else if (keys["d"] || keys["ArrowRight"]) player.vx = moveSpeed; 
    else player.vx = 0;

    // --- Horizontal Movement & Resolution ---
    player.x += player.vx;
    SystematicAPI.trigger("onPostInput", player, keys);

    // Only snap X if we are actually moving into a wall
    if (player.vx > 0) {
        if (isSolid(player.x + player.width, player.y + 2) || isSolid(player.x + player.width, player.y + player.height - 2)) {
            const tx = Math.floor((player.x + player.width) / tileSize);
            if (SystematicAPI.trigger("prePlayerTouchWallRight", player, tx, 0) !== true) {
                player.x = tx * tileSize - player.width;
                player.vx = 0;
            }
        }
    } else if (player.vx < 0) {
        if (isSolid(player.x - 1, player.y + 2) || isSolid(player.x - 1, player.y + player.height - 2)) {
            const tx = Math.floor((player.x - 1) / tileSize);
            if (SystematicAPI.trigger("prePlayerTouchWallLeft", player, tx, 0) !== true) {
                player.x = (tx + 1) * tileSize;
                player.vx = 0;
            }
        }
    }

    // --- Wall Proximity Detection (For the Mod) ---
    // We check 1 pixel away to set the flags WITHOUT snapping the player
    if (isSolid(player.x + player.width + 1, player.y + 2) || isSolid(player.x + player.width + 1, player.y + player.height - 2)) {
        player.onWallRight = true;
        SystematicAPI.trigger("onPlayerTouchWallRight", player);
    }
    if (isSolid(player.x - 1, player.y + 2) || isSolid(player.x - 1, player.y + player.height - 2)) {
        player.onWallLeft = true;
        SystematicAPI.trigger("onPlayerTouchWallLeft", player);
    }

    // Fire Stop Triggers
    if (wasOnWallRight && !player.onWallRight) SystematicAPI.trigger("onPlayerStopTouchWallRight", player);
    if (wasOnWallLeft && !player.onWallLeft) SystematicAPI.trigger("onPlayerStopTouchWallLeft", player);
    
    // --- Vertical Movement & Resolution ---
    player.vy += gravity; 
    player.y += player.vy;
    
    // Ceiling Collision
    if (player.vy < 0 && (isSolid(player.x + 2, player.y) || isSolid(player.x + player.width - 2, player.y))) {
        if (SystematicAPI.trigger("prePlayerTouchCeiling", player, 0, 0) !== false) {
            player.vy = 0; 
            player.y = (Math.floor(player.y / tileSize) + 1) * tileSize;
            SystematicAPI.trigger("onPlayerTouchCeiling", player);
        }
    }

    // Floor Detection & Resolution
    const feetY = player.y + player.height;
    if (isSolid(player.x + 2, feetY) || isSolid(player.x + player.width - 2, feetY) || 
       (isOneWayTile(player.x + 2, feetY) && !keys["s"])) {
        
        player.onGround = true;
        if (player.vy >= 0) { // Only snap if falling or stationary
            player.vy = 0; 
            player.y = Math.floor(feetY / tileSize) * tileSize - player.height;
            SystematicAPI.trigger("onPlayerTouchGround", player);
        }
    }

    // Engine Jump (Now placed after ground detection)
    if ((keys["w"] || keys["ArrowUp"]) && player.onGround) { 
        player.vy = jumpPower; 
        player.onGround = false;
        SystematicAPI.trigger('onPlayerJump', player); 
    }
    
    if (isBounceTile(player.x + player.width/2, player.y + player.height + 1)) {
       player.vy = CONFIG.JUMP_TILES * tileSize * 1.2; player.onGround = false;
       const tileX = Math.floor((player.x + player.width/2)/tileSize);
       const tileY = Math.floor((player.y + player.height + 1)/tileSize);
       SystematicAPI.trigger("onPlayerBounce", player, tileX, tileY);
       animateTileOnce(1, Math.floor((player.x + player.width/2)/tileSize), Math.floor((player.y + player.height + 1)/tileSize), [25,24,23,26,23], 32);
    }

    SystematicAPI.trigger("onPostSpecialPhysicsCollision", player, keys);

    CONFIG.ENABLE_LIGHTING = true;
    moveCamera();
    drawLevel();
    drawPlayer();
  } else {
    CONFIG.ENABLE_LIGHTING = false;
    moveCamera();
    drawLevel();
    drawGrid();
  }
  
  SystematicAPI._drawParticles(ctx, camX, camY, tileSize);
  
  // --- RENDER LIGHTING PASS ---
  renderLighting();
  
  SystematicAPI.trigger('onUpdate', player, keys);
  requestAnimationFrame(update);
}

function makeBrushCategories() {
  const cats = { ...builtinCategories };
  for (const [catName, ids] of Object.entries(brushCategories)) {
    if (!cats[catName]) cats[catName] = [];
    for (const id of ids) { if (!cats[catName].includes(id)) cats[catName].push(id); }
  }
  return cats;
}
function addSpriteToCategory(category, spriteid) {
  if (!brushCategories[category]) brushCategories[category] = [];
  if (!brushCategories[category].includes(spriteid)) brushCategories[category].push(spriteid);
}
function updateCategorySelector() {
  brushCategories = makeBrushCategories();
  if (!catSel) return;
  catSel.innerHTML = Object.keys(brushCategories).map(name => `<option value="${name}">${name}</option>`).join("");
}
function createTileBrushes() {
  const container = document.getElementById("tileBrushes");
  container.innerHTML = "";

  let cats = makeBrushCategories();
  let idsToShow = cats[currentCategory] || [];
  if (tileSearchQuery) idsToShow = idsToShow.filter(idx => String(idx).includes(tileSearchQuery) || (sprites[idx]?.[0]?.name||"").toLowerCase().includes(tileSearchQuery));

  idsToShow.forEach(idx => {
    const c = document.createElement("canvas"); c.width = c.height = 64; c.classList.add('brush');
    if (idx === currentTile) c.classList.add('selected');
    c.onclick = () => { currentTile = idx; document.querySelectorAll(".brush").forEach(b => b.classList.remove("selected")); c.classList.add('selected'); };
    const bctx = c.getContext("2d"); bctx.fillStyle = palette[7]; bctx.fillRect(0,0,64,64);
    const spr = sprites[idx]?.[0];
    if (spr?.data) {
      const ps = 3, sz = spr.data.length * ps, off = (64 - sz)/2;
      spr.data.forEach((row,y) => row.forEach((ci,x) => { if(ci<0)return; bctx.fillStyle = palette[ci] || "#000"; bctx.fillRect(off + x*ps, off + y*ps, ps, ps); }));
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

// --- SPRITE EDITOR UI ---
let activePaintIndex = 1;
function renderEditorPaletteSwatch() {
  const swatch = document.getElementById('editorPaletteSwatch'); swatch.innerHTML = '';
  palette.forEach((col, i) => {
    const box = document.createElement('div');
    Object.assign(box.style, { width: '30px', height: '30px', background: col, border: i === activePaintIndex ? '2px solid #fff' : '1px solid #333', display: 'inline-block', cursor: 'pointer' });
    box.onclick = () => { activePaintIndex = i; renderEditorPaletteSwatch(); };
    swatch.appendChild(box);
  });
}
const openBtn = document.getElementById('openSpriteEditor'), modal = document.getElementById('spriteEditorModal'), grid = document.getElementById('spriteGrid'), nameInp = document.getElementById('spriteEditorName'), saveBtn = document.getElementById('spriteEditorSave'), cancelB = document.getElementById('spriteEditorCancel');
let editData = [];
function initEditorGrid() {
  renderEditorPaletteSwatch(); grid.innerHTML = ''; editData = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const cell = document.createElement('div'); cell.dataset.x = x; cell.dataset.y = y;
      Object.assign(cell.style, { width: '30px', height: '30px', border: '1px solid #666', background: palette[0], cursor: 'pointer' });
      cell.onclick = () => { editData[y][x] = activePaintIndex; cell.style.background = palette[activePaintIndex]; };
      grid.appendChild(cell);
    }
  }
}
openBtn.onclick = () => { initEditorGrid(); nameInp.value = ''; modal.style.display = 'block'; };
cancelB.onclick = () => { modal.style.display = 'none'; };
saveBtn.onclick = () => {
  const nm = nameInp.value.trim(); if (!nm) return;
  const existingIds = Object.keys(sprites).map(k => parseInt(k)).filter(n => !isNaN(n));
  const nextId = Math.max(...existingIds, 39) + 1;
  SystematicAPI.registerTile({ id: nextId, name: nm, category: "Custom", sprite: editData.map(row => [...row]) });
  modal.style.display = 'none';
};

// Start
updateCategorySelector();
updatePaletteSelector(palsel);
createTileBrushes();

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

// Try to load from hash
if (location.hash.length > 1) {
  const imported = decodeLevels(location.hash.slice(1));
  if (Array.isArray(imported)) {
    levels = imported;
    currentLevel = 0;
    level = levels[0];
  }
}
update();