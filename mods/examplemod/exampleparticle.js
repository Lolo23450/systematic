SystematicAPI.registerParticleEmitter("spark", {
  max: 12,
  lifetime: [0.1, 0.3],
  velocity: { x: [-100, 100], y: [-100, 100] },
  gravity: 0,
  color: ["#ff0", "#f80", "#fc0"],
  size: [1, 2]
});

SystematicAPI.on("onPlayerTouchGround", (player) => {
  const px = player.x + player.width / 2;
  const py = player.y + player.height;
  SystematicAPI.emitParticles("spark", px, py);
});