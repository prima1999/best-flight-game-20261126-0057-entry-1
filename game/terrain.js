// Terrain for SkyCourier: a chain of islands over open sea, drawn procedurally.
// One job: answer ground height anywhere, and paint sky, sea, islands, the
// runway, the lighthouse and the villages in one consistent dawn style.

const WORLD_WIDTH = 14000;
const SEA_LEVEL = 0;
const RUNWAY_X0 = 8200;
const RUNWAY_X1 = 8800;
const RUNWAY_HEIGHT = 26;

// Island bumps: centre x, half-width, peak height, name, village flag.
const ISLANDS = [
  { cx: 1700, half: 950, peak: 58, name: 'Tern Island', village: true },
  { cx: 5000, half: 800, peak: 92, name: 'Gull Rock', village: false },
  { cx: 8500, half: 1400, peak: 74, name: 'Pelican Bay', village: true },
  { cx: 12300, half: 1300, peak: 48, name: 'Heron Field', village: true },
];

function _smooth(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function _bump(x, island) {
  const d = (x - island.cx) / island.half;
  if (d <= -1 || d >= 1) return 0;
  return island.peak * _smooth(1 - d * d);
}

// Deterministic hash: the same index always gives the same value.
function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Ground height in metres at world x. The runway plateau is flattened.
function terrainHeight(x) {
  let h = 0;
  for (let i = 0; i < ISLANDS.length; i++) h += _bump(x, ISLANDS[i]);
  const land = Math.max(0, Math.min(1, h / 18));
  h += land * (2.2 * Math.sin(x * 0.011) + 1.4 * Math.sin(x * 0.027 + 1.7));
  if (x > RUNWAY_X0 - 160 && x < RUNWAY_X1 + 160) {
    const edge = Math.min(
      _smooth((x - (RUNWAY_X0 - 160)) / 160),
      _smooth(((RUNWAY_X1 + 160) - x) / 160),
    );
    h = h * (1 - edge) + RUNWAY_HEIGHT * edge;
  }
  return Math.max(0, h);
}

function isOverRunway(x) {
  return x >= RUNWAY_X0 && x <= RUNWAY_X1;
}

function isOverWater(x) {
  return terrainHeight(x) <= 0.5;
}

function islandNameAt(x) {
  let best = null;
  let bestH = 0;
  for (let i = 0; i < ISLANDS.length; i++) {
    const h = _bump(x, ISLANDS[i]);
    if (h > bestH) { bestH = h; best = ISLANDS[i]; }
  }
  return best ? best.name : 'open sea';
}

// ---------------------------------------------------------------- drawing

const CLOUDS = [];
for (let i = 0; i < 16; i++) {
  CLOUDS.push({
    x: hash01(i * 3 + 1) * WORLD_WIDTH,
    y: 260 + hash01(i * 5 + 2) * 170,
    s: 0.7 + hash01(i * 7 + 3) * 1.1,
    drift: 2 + hash01(i * 11 + 4) * 4,
  });
}

const BIRDS = [];
for (let i = 0; i < 9; i++) {
  BIRDS.push({
    x: 600 + hash01(i * 13 + 5) * 12000,
    y: 150 + hash01(i * 17 + 6) * 130,
    speed: 6 + hash01(i * 19 + 7) * 8,
    phase: hash01(i * 23 + 8) * 6.28,
  });
}

function drawSky(ctx, w, h, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a5a8f');
  g.addColorStop(0.45, '#7fb2d9');
  g.addColorStop(0.72, '#f6c98a');
  g.addColorStop(1, '#f2a35e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Low dawn sun with a warm glow.
  const sunX = w * 0.78;
  const sunY = h * 0.30;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 205, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 205, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, camX, w, h, scale, time) {
  ctx.save();
  for (let i = 0; i < CLOUDS.length; i++) {
    const c = CLOUDS[i];
    const worldX = (c.x + time * c.drift) % WORLD_WIDTH;
    const sx = (worldX - camX * 0.45) * scale * 0.35 + w * 0.1;
    const sy = h - c.y * scale * 0.55;
    if (sx < -260 || sx > w + 260) continue;
    ctx.fillStyle = 'rgba(255, 250, 240, 0.82)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 78 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 52 * c.s, sy + 7 * c.s, 46 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 54 * c.s, sy + 6 * c.s, 50 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSea(ctx, camX, camY, w, h, scale, time) {
  const seaTop = h - (SEA_LEVEL - camY) * scale;
  if (seaTop >= h) return;
  const g = ctx.createLinearGradient(0, seaTop, 0, h);
  g.addColorStop(0, '#3f8fb5');
  g.addColorStop(0.5, '#1d5f86');
  g.addColorStop(1, '#0d3a58');
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, seaTop), w, h - Math.max(0, seaTop));
  // Sun glitter on the water.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffd98a';
  for (let i = 0; i < 26; i++) {
    const wx = ((i * 397 + time * 12) % (WORLD_WIDTH + 400)) - 200;
    const sx = (wx - camX) * scale;
    if (sx < -40 || sx > w + 40) continue;
    const wy = -2 - hash01(i * 31) * 6;
    const sy = h - (wy - camY) * scale;
    ctx.fillRect(sx, sy, 26 + hash01(i * 7) * 30, 2);
  }
  ctx.restore();
}

// Convert world (metres) to screen pixels.
function worldToScreen(x, y, camX, camY, scale, h) {
  return { x: (x - camX) * scale, y: h - (y - camY) * scale };
}

function drawIslandChain(ctx, camX, camY, w, h, scale, time) {
  const step = 6;
  const x0 = Math.max(0, camX - 40);
  const x1 = Math.min(WORLD_WIDTH, camX + w / scale + 40);
  ctx.beginPath();
  let started = false;
  for (let x = x0; x <= x1; x += step) {
    const gy = terrainHeight(x);
    const p = worldToScreen(x, gy, camX, camY, scale, h);
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  const pEnd = worldToScreen(x1, -30, camX, camY, scale, h);
  const pStart = worldToScreen(x0, -30, camX, camY, scale, h);
  ctx.lineTo(pEnd.x, pEnd.y);
  ctx.lineTo(pStart.x, pStart.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, h * 0.25, 0, h);
  g.addColorStop(0, '#5d9b4a');
  g.addColorStop(0.55, '#3e7a35');
  g.addColorStop(1, '#2c5a28');
  ctx.fillStyle = g;
  ctx.fill();

  // Sandy beach fringe where the ground meets the sea.
  ctx.beginPath();
  started = false;
  for (let x = x0; x <= x1; x += step) {
    const gy = terrainHeight(x);
    if (gy > 7) continue;
    const p = worldToScreen(x, Math.max(gy, 0.4), camX, camY, scale, h);
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  if (started) {
    ctx.strokeStyle = '#e8d29a';
    ctx.lineWidth = Math.max(2, 5 * scale * 0.4);
    ctx.stroke();
  }
  drawTreesAndHouses(ctx, camX, camY, w, h, scale, x0, x1);
  drawLighthouse(ctx, camX, camY, h, scale, time);
  drawRunway(ctx, camX, camY, h, scale, time);
}

function drawTreesAndHouses(ctx, camX, camY, w, h, scale, x0, x1) {
  for (let x = Math.floor(x0 / 26) * 26; x <= x1; x += 26) {
    const gy = terrainHeight(x);
    if (gy < 3 || isOverRunway(x)) continue;
    const r = hash01(Math.floor(x / 26));
    const p = worldToScreen(x, gy, camX, camY, scale, h);
    if (p.x < -30 || p.x > w + 30) continue;
    if (r < 0.42) {
      // Palm tree: leaning trunk, five fronds.
      const lean = (r - 0.2) * 14;
      const topX = p.x + lean;
      const topY = p.y - 26 * (scale / 6);
      ctx.strokeStyle = '#7a5230';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + lean * 0.4, p.y - 14 * (scale / 6), topX, topY);
      ctx.stroke();
      ctx.strokeStyle = '#2f7d33';
      ctx.lineWidth = 2.5;
      for (let f = 0; f < 5; f++) {
        const a = -Math.PI * (0.08 + f * 0.19);
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.cos(a) * 16, topY + Math.sin(a) * 10 + 6,
          topX + Math.cos(a) * 24, topY + Math.sin(a) * 16 + 10,
        );
        ctx.stroke();
      }
    } else if (r < 0.52) {
      // Small house: white walls, red roof, warm window.
      const hw = 15;
      const hh = 11;
      ctx.fillStyle = '#f4ead6';
      ctx.fillRect(p.x - hw / 2, p.y - hh, hw, hh);
      ctx.fillStyle = '#b4452f';
      ctx.beginPath();
      ctx.moveTo(p.x - hw / 2 - 2, p.y - hh);
      ctx.lineTo(p.x, p.y - hh - 8);
      ctx.lineTo(p.x + hw / 2 + 2, p.y - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd97a';
      ctx.fillRect(p.x - 2, p.y - 7, 4, 5);
    }
  }
}

function drawLighthouse(ctx, camX, camY, h, scale, time) {
  const lx = 5100;
  const gy = terrainHeight(lx);
  const base = worldToScreen(lx, gy, camX, camY, scale, h);
  if (base.x < -120 || base.x > 1400) return;
  const towerH = 46 * (scale / 6);
  ctx.fillStyle = '#f2ede2';
  ctx.beginPath();
  ctx.moveTo(base.x - 7, base.y);
  ctx.lineTo(base.x - 4, base.y - towerH);
  ctx.lineTo(base.x + 4, base.y - towerH);
  ctx.lineTo(base.x + 7, base.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.fillRect(base.x - 5.5, base.y - towerH * 0.62, 11, towerH * 0.14);
  ctx.fillRect(base.x - 5, base.y - towerH * 0.3, 10, towerH * 0.12);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(base.x - 6, base.y - towerH - 8, 12, 8);
  // Rotating beam.
  const beamAngle = (time * 0.5) % (Math.PI * 2);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#fff2b0';
  ctx.translate(base.x, base.y - towerH - 4);
  ctx.rotate(beamAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, -16);
  ctx.lineTo(150, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff6c0';
  ctx.beginPath();
  ctx.arc(base.x, base.y - towerH - 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawRunway(ctx, camX, camY, h, scale, time) {
  const p0 = worldToScreen(RUNWAY_X0, RUNWAY_HEIGHT, camX, camY, scale, h);
  const p1 = worldToScreen(RUNWAY_X1, RUNWAY_HEIGHT, camX, camY, scale, h);
  if (p1.x < -40 || p0.x > 1400) return;
  const stripH = 7 * (scale / 6);
  ctx.fillStyle = '#3a3f45';
  ctx.fillRect(p0.x, p0.y - stripH, p1.x - p0.x, stripH);
  ctx.fillStyle = '#f5f5f0';
  // Centre dashes.
  const dashLen = 26 * scale * 0.5;
  for (let x = p0.x + 12; x < p1.x - 12; x += dashLen * 2) {
    ctx.fillRect(x, p0.y - stripH / 2 - 1, dashLen, 2);
  }
  // Threshold bars at both ends.
  ctx.fillRect(p0.x + 6, p0.y - stripH + 1, 14, stripH - 2);
  ctx.fillRect(p1.x - 20, p0.y - stripH + 1, 14, stripH - 2);
  // Edge lights, alternating amber.
  for (let x = p0.x + 4; x <= p1.x; x += 34) {
    const on = Math.floor(time * 2 + x) % 2 === 0;
    ctx.fillStyle = on ? '#ffb347' : '#e08a1e';
    ctx.beginPath();
    ctx.arc(x, p0.y - stripH - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Windsock on a pole beside the runway.
  const sock = worldToScreen(RUNWAY_X0 - 60, terrainHeight(RUNWAY_X0 - 60), camX, camY, scale, h);
  if (sock.x > -20 && sock.x < 1400) {
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x, sock.y - 26);
    ctx.stroke();
    ctx.fillStyle = '#ff7f2a';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y - 26);
    ctx.lineTo(sock.x + 18 + Math.sin(time * 2) * 3, sock.y - 23);
    ctx.lineTo(sock.x, sock.y - 19);
    ctx.closePath();
    ctx.fill();
  }
  // Runway label on the ground.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  const mid = worldToScreen((RUNWAY_X0 + RUNWAY_X1) / 2, RUNWAY_HEIGHT, camX, camY, scale, h);
  ctx.fillText('PELICAN BAY · RWY 09', mid.x, mid.y + 18);
}

function drawBirds(ctx, camX, camY, w, h, scale, time) {
  ctx.save();
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  for (let i = 0; i < BIRDS.length; i++) {
    const b = BIRDS[i];
    const wx = (b.x + time * b.speed) % WORLD_WIDTH;
    const p = worldToScreen(wx, b.y + Math.sin(time + b.phase) * 8, camX, camY, scale, h);
    if (p.x < -20 || p.x > w + 20) continue;
    const flap = Math.sin(time * 6 + b.phase) * 4;
    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y - flap);
    ctx.quadraticCurveTo(p.x, p.y + 2, p.x + 7, p.y - flap);
    ctx.stroke();
  }
  ctx.restore();
}
