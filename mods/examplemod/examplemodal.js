// 1️⃣ State
const furnaceState = { fuel:null, input:null, output:null };
let lastFurnacePos = null;  // remember where we last showed

// 2️⃣ register the modal (same as before)
SystematicAPI.registerModal("furnace", {
  title: "Furnace",
  content: () => {
    furnaceState.output = null;
    const wrapper = document.createElement("div");
    wrapper.style.textAlign = "center";

    const slots = ["Fuel","Input","Output"].map(label => {
      const div = document.createElement("div");
      div.style.display = "inline-block";
      div.style.margin = "0 8px";
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = tileSize;
      canvas.style.border = "1px solid #666";
      div.appendChild(canvas);
      if (label!=="Output") {
        const btn = document.createElement("button");
        btn.textContent = `Set ${label}`;
        btn.style.display = "block";
        btn.style.marginTop = "4px";
        btn.onclick = () => {
          furnaceState[label==="Fuel"?"fuel":"input"] = currentTile;
          drawOnCanvas(canvas, sprites[currentTile][0].data);
          trySmelt();
        };
        div.appendChild(btn);
      }
      wrapper.appendChild(div);
      return { label, canvas };
    });

    function trySmelt() {
      if (furnaceState.fuel!=null && furnaceState.input!=null) {
        const inId = furnaceState.input;
        furnaceState.fuel = furnaceState.input = null;
        // clear first two canvases:
        slots[0].canvas.getContext("2d").clearRect(0,0,tileSize,tileSize);
        slots[1].canvas.getContext("2d").clearRect(0,0,tileSize,tileSize);
        setTimeout(() => {
          furnaceState.output = inId+1;
          drawOnCanvas(slots[2].canvas, sprites[furnaceState.output][0].data);
        }, 2000);
      }
    }

    return wrapper;
  },
  buttons: [
    { label: "Close", onClick: () => {} }
  ]
});

// 3️⃣ only show once per landing on a new furnace tile
SystematicAPI.on("onPlayerTouchGround", (player, tx, ty, layer) => {
  if (levels[currentLevel][ty]?.[tx]?.[layer] === 16) {
    const key = `${currentLevel}|${tx}|${ty}`;
    if (key !== lastFurnacePos) {
      lastFurnacePos = key;
      SystematicAPI.showModal("furnace");
    }
  } else {
    // reset when leaving furnace tiles
    lastFurnacePos = null;
  }
});

// 4️⃣ draw helper (same as before)
function drawOnCanvas(canvas, data) {
  const ctx = canvas.getContext("2d"), sz=canvas.width, n=data.length;
  const p=Math.floor(sz/n), o=Math.floor((sz-p*n)/2);
  ctx.clearRect(0,0,sz,sz);
  for (let y=0; y<n; y++) for (let x=0; x<n; x++){
    const ci = data[y][x];
    if (ci<0) continue;
    ctx.fillStyle = palette[ci]||"#000";
    ctx.fillRect(o+x*p, o+y*p, p, p);
  }
}