// Missions for SkyCourier: three sorties with different goals.
// One job: hold the current mission, its rings and drop zones, detect success,
// and score the flight. Fuel and damage turn every sortie into a decision.

const MISSION_DEFS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread all 5 sky rings over the islands. Smooth flying pays.',
    start: { x: 900, y: 130, angle: 0.02, speed: 34 },
  },
  {
    id: 'mail',
    name: 'Mail Drop',
    blurb: 'Drop a parcel on each village pad. Low and slow over the pad, press SPACE.',
    start: { x: 900, y: 130, angle: 0.02, speed: 34 },
  },
  {
    id: 'land',
    name: 'Island Landing',
    blurb: 'Land the Kestrel on Pelican Bay runway 09. Gear down, gentle descent.',
    start: { x: 6600, y: 200, angle: -0.04, speed: 40 },
  },
];

const RING_SPOTS = [
  { x: 2100, y: 165 },
  { x: 3600, y: 120 },
  { x: 5200, y: 190 },
  { x: 6500, y: 110 },
  { x: 7600, y: 175 },
];

const DROP_SPOTS = [
  { x: 1650, label: 'Tern Village' },
  { x: 4950, label: 'Gull Rock' },
  { x: 8400, label: 'Pelican Bay' },
];

const Mission = {
  def: MISSION_DEFS[0],
  rings: [],
  drops: [],
  nextRing: 0,
  score: 0,
  delivered: 0,
  ringsHit: 0,
  done: false,
  doneText: '',
  message: '',
  messageUntil: 0,
};

function startMission(index, time) {
  Mission.def = MISSION_DEFS[index] || MISSION_DEFS[0];
  Mission.rings = RING_SPOTS.map((spot, i) => ({ x: spot.x, y: spot.y, hit: false, num: i + 1 }));
  Mission.drops = DROP_SPOTS.map((spot) => ({ x: spot.x, label: spot.label, done: false }));
  Mission.nextRing = 0;
  Mission.score = 0;
  Mission.delivered = 0;
  Mission.ringsHit = 0;
  Mission.done = false;
  Mission.doneText = '';
  const s = Mission.def.start;
  resetPlane(s.x, s.y, s.angle, s.speed, 0.55);
  setMessage(Mission.def.blurb, time, 6);
}

function setMessage(text, time, seconds) {
  Mission.message = text;
  Mission.messageUntil = time + (seconds || 4);
}

function missionGoalText() {
  if (Mission.def.id === 'rings') return 'Rings ' + Mission.ringsHit + ' / ' + Mission.rings.length;
  if (Mission.def.id === 'mail') return 'Parcels ' + Mission.delivered + ' / ' + Mission.drops.length;
  return 'Land on RWY 09';
}

function updateMission(dt, time) {
  if (Mission.done) return;
  if (Mission.def.id === 'rings') {
    const ring = Mission.rings[Mission.nextRing];
    if (ring) {
      const dx = PLANE.x - ring.x;
      const dy = PLANE.y - ring.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        ring.hit = true;
        Mission.ringsHit++;
        Mission.nextRing++;
        let pts = 250;
        if (PLANE.smoothTime > 4) { pts += 100; setMessage('Smooth flying! +100 bonus', time, 3); }
        else setMessage('Ring ' + Mission.ringsHit + ' cleared! +' + pts, time, 3);
        Mission.score += pts;
        playRingChime();
        if (Mission.nextRing >= Mission.rings.length) {
          Mission.done = true;
          Mission.score += Math.round(PLANE.fuel) * 4;
          Mission.doneText = 'Ring Run complete! Fuel bonus banked.';
          setMessage(Mission.doneText, time, 6);
          playDropChime();
        }
      }
    }
  }
  if (Mission.def.id === 'mail') {
    if (consumeDrop()) dropParcel(time);
  }
  if (Mission.def.id === 'land' && PLANE.landed) {
    Mission.done = true;
    const soft = Math.max(0, 100 - PLANE.damage * 2);
    const bonus = 300 + Math.round(soft) * 3 + Math.round(PLANE.fuel) * 3;
    Mission.score += bonus;
    Mission.doneText = 'Landed on Pelican Bay! +' + bonus + ' (softness + fuel).';
    setMessage(Mission.doneText, time, 6);
    playDropChime();
  }
}

function dropParcel(time) {
  const zone = Mission.drops.find((d) => !d.done && Math.abs(PLANE.x - d.x) < 70);
  if (!zone) {
    setMessage('No pad below — fly over a marked village pad first.', time, 3);
    return;
  }
  if (PLANE.y > 130) {
    setMessage('Too high to drop! Get below 400 ft over ' + zone.label + '.', time, 3);
    return;
  }
  if (PLANE.speed > 48) {
    setMessage('Too fast to drop! Slow below 95 knots over the pad.', time, 3);
    return;
  }
  zone.done = true;
  Mission.delivered++;
  Mission.score += 400;
  setMessage('Parcel delivered to ' + zone.label + '! +400', time, 3);
  playDropChime();
  if (Mission.delivered >= Mission.drops.length) {
    Mission.done = true;
    Mission.score += Math.round(PLANE.fuel) * 4;
    Mission.doneText = 'All parcels delivered! Fuel bonus banked.';
    setMessage(Mission.doneText, time, 6);
  }
}

function drawMissionLayer(ctx, camX, camY, w, h, scale, time) {
  if (Mission.def.id === 'rings') drawRings(ctx, camX, camY, w, h, scale, time);
  if (Mission.def.id === 'mail') drawDropZones(ctx, camX, camY, h, scale, time);
}

function drawRings(ctx, camX, camY, w, h, scale, time) {
  for (let i = 0; i < Mission.rings.length; i++) {
    const ring = Mission.rings[i];
    const p = worldToScreen(ring.x, ring.y, camX, camY, scale, h);
    if (p.x < -80 || p.x > w + 80 || p.y < -80 || p.y > h + 80) continue;
    const r = 20 * scale * 0.9;
    const isNext = i === Mission.nextRing && !Mission.done;
    const pulse = isNext ? 1 + Math.sin(time * 4) * 0.12 : 1;
    ctx.save();
    ctx.globalAlpha = ring.hit ? 0.25 : 1;
    ctx.lineWidth = isNext ? 7 : 5;
    ctx.strokeStyle = isNext ? '#ffd94a' : '#7fe3ff';
    ctx.shadowColor = isNext ? '#ffd94a' : '#7fe3ff';
    ctx.shadowBlur = isNext ? 22 : 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    if (!ring.hit) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ring.num), p.x, p.y - r * pulse - 18);
    }
    ctx.restore();
  }
}

function drawDropZones(ctx, camX, camY, h, scale, time) {
  for (let i = 0; i < Mission.drops.length; i++) {
    const zone = Mission.drops[i];
    const gy = terrainHeight(zone.x);
    const p = worldToScreen(zone.x, gy, camX, camY, scale, h);
    if (p.x < -90 || p.x > 1400) continue;
    const inRange = Math.abs(PLANE.x - zone.x) < 70;
    ctx.save();
    ctx.strokeStyle = zone.done ? '#7ddc7d' : (inRange ? '#ffd94a' : '#ffffff');
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -time * 24;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 2, 46, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = zone.done ? '#7ddc7d' : '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.done ? '✓ ' + zone.label : 'DROP · ' + zone.label, p.x, p.y - 22);
    ctx.restore();
  }
}
