// HUD for SkyCourier: the flight instruments and the mission readouts.
// One job: draw everything the pilot reads — altitude, speed, heading, fuel,
// damage, throttle and the mission state — as lit instruments, not plain text.

function drawHud(ctx, w, h, time) {
  drawTopBar(ctx, w, time);
  drawInstrumentPanel(ctx, w, h, time);
  drawWarnings(ctx, w, h, time);
  if (Mission.message && time < Mission.messageUntil) {
    ctx.save();
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff3c4';
    ctx.fillText(Mission.message, w / 2, 118);
    ctx.restore();
  }
}

function _readoutBox(ctx, x, y, bw, label, value, unit) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 22, 34, 0.78)';
  ctx.strokeStyle = 'rgba(255, 217, 74, 0.55)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, bw, 52, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 10, y + 15);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(value, x + 10, y + 40);
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(unit, x + bw - 26, y + 40);
  ctx.restore();
}

function drawTopBar(ctx, w, time) {
  _readoutBox(ctx, 16, 14, 150, 'ALTITUDE', String(Math.round(planeFeet())), 'FT');
  _readoutBox(ctx, 176, 14, 150, 'AIRSPEED', String(Math.round(planeKnots())), 'KT');
  _readoutBox(ctx, 336, 14, 150, 'HEADING', String(planeHeadingDeg()).padStart(3, '0') + '°', 'DEG');
  // Mission + score, top right.
  ctx.save();
  ctx.fillStyle = 'rgba(8, 22, 34, 0.78)';
  ctx.strokeStyle = 'rgba(255, 217, 74, 0.55)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, w - 316, 14, 300, 52, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(Mission.def.name.toUpperCase(), w - 306, 29);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(missionGoalText(), w - 306, 50);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SCORE', w - 26, 29);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(String(Mission.score), w - 26, 50);
  ctx.restore();
  drawFuelDamage(ctx, w, time);
}

function drawFuelDamage(ctx, w, time) {
  ctx.save();
  const bw = 300;
  const x = w - 316;
  const y = 74;
  ctx.fillStyle = 'rgba(8, 22, 34, 0.78)';
  roundRect(ctx, x, y, bw, 34, 8);
  ctx.fill();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = PLANE.fuel < 22 ? '#ff6b5e' : '#9fc6e2';
  ctx.fillText('FUEL', x + 10, y + 14);
  ctx.fillStyle = '#1a2f42';
  ctx.fillRect(x + 52, y + 7, 120, 10);
  const fuelW = 120 * Math.max(0, PLANE.fuel / 100);
  ctx.fillStyle = PLANE.fuel < 22 ? '#ff6b5e' : '#4fc94f';
  ctx.fillRect(x + 52, y + 7, fuelW, 10);
  ctx.fillStyle = '#9fc6e2';
  ctx.fillText('DMG', x + 186, y + 14);
  ctx.fillStyle = '#1a2f42';
  ctx.fillRect(x + 226, y + 7, 64, 10);
  ctx.fillStyle = PLANE.damage > 60 ? '#ff6b5e' : '#ffb347';
  ctx.fillRect(x + 226, y + 7, 64 * Math.max(0, PLANE.damage / 100), 10);
  ctx.restore();
}

function roundRect(ctx, x, y, bw, bh, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + bw, y, x + bw, y + bh, r);
  ctx.arcTo(x + bw, y + bh, x, y + bh, r);
  ctx.arcTo(x, y + bh, x, y, r);
  ctx.arcTo(x, y, x + bw, y, r);
  ctx.closePath();
}

function _dial(ctx, cx, cy, r, label, drawNeedle) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#20384e');
  g.addColorStop(1, '#0a1826');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.lineTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
    ctx.stroke();
  }
  drawNeedle(cx, cy, r);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r - 12);
  ctx.restore();
}

function drawInstrumentPanel(ctx, w, h, time) {
  const panelY = h - 108;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 22, 34, 0.82)';
  ctx.fillRect(0, panelY, w, 108);
  ctx.fillStyle = 'rgba(255, 217, 74, 0.35)';
  ctx.fillRect(0, panelY, w, 2);
  const cy = panelY + 54;
  // Airspeed dial: needle sweeps with knots.
  _dial(ctx, 90, cy, 40, 'AIRSPEED', (cx, cy2, r) => {
    const frac = Math.min(1, planeKnots() / 160);
    const a = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    _needle(ctx, cx, cy2, r, a, '#ff5e4d');
  });
  // Altimeter dial: needle sweeps with feet.
  _dial(ctx, 200, cy, 40, 'ALTITUDE', (cx, cy2, r) => {
    const frac = Math.min(1, planeFeet() / 5000);
    const a = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    _needle(ctx, cx, cy2, r, a, '#7fe3ff');
  });
  // Compass dial: a rotating card with N/E/S/W.
  _dial(ctx, 310, cy, 40, 'HEADING', (cx, cy2, r) => {
    const heading = planeHeadingDeg() * Math.PI / 180;
    ctx.save();
    ctx.translate(cx, cy2);
    ctx.rotate(-heading);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -r + 15);
    ctx.fillText('E', r - 15, 0);
    ctx.fillText('S', 0, r - 15);
    ctx.fillText('W', -r + 15, 0);
    ctx.restore();
    ctx.fillStyle = '#ff5e4d';
    ctx.beginPath();
    ctx.moveTo(cx, cy2 - r + 4);
    ctx.lineTo(cx - 4, cy2 - r + 12);
    ctx.lineTo(cx + 4, cy2 - r + 12);
    ctx.closePath();
    ctx.fill();
  });
  // Artificial horizon: a little ball that rolls with pitch.
  _dial(ctx, 420, cy, 40, 'HORIZON', (cx, cy2, r) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy2, r - 6, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy2);
    ctx.rotate(-PLANE.angle);
    ctx.fillStyle = '#7fb2d9';
    ctx.fillRect(-r, -r, r * 2, r);
    ctx.fillStyle = '#8a6b46';
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, -1, r * 2, 2);
    ctx.restore();
  });
  // Vertical speed: a tape that rises and falls with climb rate.
  _dial(ctx, 530, cy, 40, 'VERT SPD', (cx, cy2, r) => {
    const vs = Math.sin(PLANE.angle) * PLANE.speed - PLANE.sinkRate;
    const frac = Math.max(-1, Math.min(1, vs / 12));
    const a = -Math.PI * 0.75 + (frac * 0.5 + 0.5) * Math.PI * 1.5;
    _needle(ctx, cx, cy2, r, a, '#ffd94a');
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((vs >= 0 ? '+' : '') + vs.toFixed(1), cx, cy2 + 12);
  });
  // Throttle lever on the right of the panel.
  const tx = w - 190;
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', tx, panelY + 18);
  ctx.fillStyle = '#1a2f42';
  ctx.fillRect(tx, panelY + 26, 150, 12);
  ctx.fillStyle = PLANE.fuel <= 0 ? '#555555' : '#4fc94f';
  ctx.fillRect(tx, panelY + 26, 150 * PLANE.throttle, 12);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(Math.round(PLANE.throttle * 100) + '%', tx + 158, panelY + 37);
  ctx.fillStyle = '#9fc6e2';
  ctx.font = '10px sans-serif';
  ctx.fillText('GEAR ' + (PLANE.gearDown ? 'DOWN [G]' : 'UP [G]'), tx, panelY + 58);
  ctx.fillText('↑↓ pitch · ←→ throttle · mouse steers', tx, panelY + 76);
  ctx.fillText('SPACE drop · R restart · P pause', tx, panelY + 92);
  ctx.restore();
}

function _needle(ctx, cx, cy, r, angle, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 8), cy + Math.sin(angle) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWarnings(ctx, w, h, time) {
  const warnings = [];
  if (PLANE.fuel > 0 && PLANE.fuel < 22) warnings.push('LOW FUEL');
  if (PLANE.fuel <= 0) warnings.push('FUEL EMPTY — GLIDING');
  if (PLANE.speed < STALL_SPEED && PLANE.y > 30) warnings.push('STALL — NOSE DOWN, ADD POWER');
  if (PLANE.damage > 60) warnings.push('HEAVY DAMAGE');
  const ground = terrainHeight(PLANE.x);
  if (PLANE.y - ground < 45 && PLANE.y - ground > 2 && Math.sin(PLANE.angle) * PLANE.speed < -4) {
    warnings.push('PULL UP');
  }
  if (warnings.length === 0) return;
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  const blink = Math.floor(time * 3) % 2 === 0;
  ctx.fillStyle = blink ? '#ff5e4d' : '#ffb3ab';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 10;
  ctx.fillText(warnings.join('  ·  '), w / 2, 152);
  ctx.restore();
}

function drawTitle(ctx, w, h, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 18, 30, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 54px sans-serif';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 12;
  ctx.fillText('SKYCOURIER', w / 2, h * 0.28);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Island Air Mail — fly the Kestrel K-2 across the chain', w / 2, h * 0.28 + 38);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfe6f5';
  ctx.fillText('Deliver the mail, thread the rings, land her gentle. Fuel and damage are real.', w / 2, h * 0.28 + 66);
  for (let i = 0; i < MISSION_DEFS.length; i++) {
    const def = MISSION_DEFS[i];
    const y = h * 0.48 + i * 56;
    ctx.fillStyle = 'rgba(8, 22, 34, 0.8)';
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, w / 2 - 320, y - 24, 640, 44, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1) + ' — ' + def.name, w / 2 - 300, y - 2);
    ctx.fillStyle = '#cfe6f5';
    ctx.font = '15px sans-serif';
    ctx.fillText(def.blurb, w / 2 - 300, y + 16);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Press 1, 2 or 3 to fly — or click the game to start with Ring Run', w / 2, h * 0.48 + 3 * 56 + 22);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#cfe6f5';
  ctx.fillText('↑ / ↓ or W / S pitch · ← / → or A / D throttle · mouse steers · SPACE drops mail · G gear · R restart', w / 2, h * 0.48 + 3 * 56 + 48);
  ctx.restore();
}

function drawEndScreen(ctx, w, h, title, lines, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 18, 30, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 44px sans-serif';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.fillText(title, w / 2, h * 0.34);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, h * 0.34 + 44 + i * 32);
  }
  ctx.fillStyle = '#cfe6f5';
  ctx.font = '16px sans-serif';
  ctx.fillText('Press R to fly again · 1 / 2 / 3 to pick another sortie', w / 2, h * 0.34 + 44 + lines.length * 32 + 26);
  ctx.restore();
}
