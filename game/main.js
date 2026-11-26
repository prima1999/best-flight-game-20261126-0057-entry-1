// Main loop for SkyCourier: canvas setup, camera, game states, rendering order.
// One job: run the game — read input, step the plane and the mission, draw the
// world, the plane and the instruments, sixty times a second.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const SCALE = 6;
const VIEW_W = 1280;
const VIEW_H = 720;

let gameState = 'title';
let camX = 500;
let camY = 0;
let simTime = 0;
let lastStamp = 0;
let paused = false;
let frozen = false;
let freezeAt = Infinity;
let endTitle = '';
let endLines = [];

// Screenshot staging: ?scene=cover|lowpass|ring|landing starts the game frozen
// on one composed frame so the shot is exactly the staged moment.
const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene') || '';

function applyScene() {
  if (!sceneName) return;
  frozen = true;
  if (sceneName === 'cover') {
    startMission(0, 0);
    PLANE.x = 3480;
    PLANE.y = 150;
    PLANE.angle = 0.03;
    PLANE.speed = 42;
    PLANE.throttle = 0.72;
    PLANE.fuel = 78;
    Mission.ringsHit = 1;
    Mission.nextRing = 1;
    Mission.rings[0].hit = true;
    Mission.score = 250;
    setMessage('Ring 1 cleared! +250', 0, 60);
    gameState = 'fly';
  } else if (sceneName === 'lowpass') {
    startMission(0, 0);
    PLANE.x = 1750;
    PLANE.y = 26;
    PLANE.angle = 0.01;
    PLANE.speed = 48;
    PLANE.throttle = 0.8;
    PLANE.fuel = 64;
    Mission.score = 250;
    Mission.ringsHit = 1;
    Mission.nextRing = 1;
    Mission.rings[0].hit = true;
    gameState = 'fly';
  } else if (sceneName === 'ring') {
    startMission(0, 0);
    PLANE.x = 3540;
    PLANE.y = 122;
    PLANE.angle = 0.02;
    PLANE.speed = 44;
    PLANE.throttle = 0.75;
    PLANE.fuel = 71;
    Mission.score = 500;
    Mission.ringsHit = 2;
    Mission.nextRing = 2;
    Mission.rings[0].hit = true;
    Mission.rings[1].hit = true;
    setMessage('Ring 2 cleared! +250', 0, 60);
    gameState = 'fly';
  } else if (sceneName === 'landing') {
    startMission(2, 0);
    PLANE.x = 8100;
    PLANE.y = 55;
    PLANE.angle = -0.09;
    PLANE.speed = 38;
    PLANE.throttle = 0.42;
    PLANE.gearDown = true;
    PLANE.fuel = 46;
    Mission.score = 400;
    setMessage('Final approach — gear down, hold her steady', 0, 60);
    gameState = 'fly';
  }
  camX = PLANE.x - 380;
  camY = Math.max(0, PLANE.y - 150);
  freezeAt = 0.9;
}

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
}

function startSortie(index) {
  startMission(index, simTime);
  camX = PLANE.x - 380;
  camY = Math.max(0, PLANE.y - 150);
  gameState = 'fly';
  paused = false;
  playClick();
}

function endSortie(title, lines) {
  endTitle = title;
  endLines = lines;
  gameState = 'end';
}

function step(dt) {
  const pitch = pitchInput(canvas.height);
  if (consumeGear()) {
    PLANE.gearDown = !PLANE.gearDown;
    playClick();
  }
  updatePlane(dt, pitch, { terrainHeight });
  updateMission(dt, simTime);
  updateEngineSound(PLANE.throttle, PLANE.speed, gameState === 'fly');
  if (PLANE.crashed) {
    playCrash();
    endSortie('CRASHED', [
      'The Kestrel is down near ' + islandNameAt(PLANE.x) + '.',
      'Damage 100% · Score ' + Mission.score + ' · Rings ' + Mission.ringsHit + ' · Parcels ' + Mission.delivered,
      'Watch the descent rate and keep her above stall speed.',
    ]);
  } else if (PLANE.landed && Mission.def.id !== 'land') {
    endSortie('LANDED', [
      'Down safe on Pelican Bay runway 09.',
      'Score ' + Mission.score + ' · Rings ' + Mission.ringsHit + ' · Parcels ' + Mission.delivered,
      'Fuel left ' + Math.round(PLANE.fuel) + '% · Damage ' + Math.round(PLANE.damage) + '%',
    ]);
  } else if (Mission.done && PLANE.landed) {
    endSortie('SORTIE COMPLETE', [
      Mission.doneText,
      'Final score ' + Mission.score + ' · Fuel left ' + Math.round(PLANE.fuel) + '%',
      'Fly another sortie to beat it.',
    ]);
  } else if (Mission.done && Mission.def.id !== 'land') {
    endSortie('SORTIE COMPLETE', [
      Mission.doneText,
      'Final score ' + Mission.score + ' · Fuel left ' + Math.round(PLANE.fuel) + '%',
      'Land on Pelican Bay to finish the day, or fly again.',
    ]);
  }
}

function updateCamera(dt) {
  const targetX = PLANE.x - 380;
  const targetY = Math.max(0, PLANE.y - 150);
  camX += (targetX - camX) * Math.min(1, dt * 3.2);
  camY += (targetY - camY) * Math.min(1, dt * 2.2);
  if (camX < 0) camX = 0;
  if (camX > WORLD_WIDTH - VIEW_W / SCALE) camX = WORLD_WIDTH - VIEW_W / SCALE;
  if (camY < 0) camY = 0;
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h, simTime);
  drawClouds(ctx, camX, w, h, SCALE, simTime);
  drawSea(ctx, camX, camY, w, h, SCALE, simTime);
  drawIslandChain(ctx, camX, camY, w, h, SCALE, simTime);
  drawMissionLayer(ctx, camX, camY, w, h, SCALE, simTime);
  drawBirds(ctx, camX, camY, w, h, SCALE, simTime);
  // The plane sits at its world position; the camera puts it in frame.
  const planeScreen = worldToScreen(PLANE.x, PLANE.y, camX, camY, SCALE, h);
  drawPlane(ctx, planeScreen.x, planeScreen.y, SCALE, simTime);
  if (gameState === 'title') {
    drawTitle(ctx, w, h, simTime);
  } else if (gameState === 'end') {
    drawHud(ctx, w, h, simTime);
    drawEndScreen(ctx, w, h, endTitle, endLines, simTime);
  } else {
    drawHud(ctx, w, h, simTime);
  }
}

function frame(stamp) {
  const dt = Math.min(0.05, Math.max(0.001, (stamp - lastStamp) / 1000 || 0.016));
  lastStamp = stamp;
  if (!frozen || simTime < freezeAt) simTime += dt;
  if (gameState === 'title') {
    const choice = consumeMenuChoice();
    if (choice >= 1 && choice <= 3) startSortie(choice - 1);
    else if (Input.mouseDown) startSortie(0);
    if (Input.anyGesture) { initAudio(); resumeAudio(); }
    // Idle drift behind the title: the Kestrel circles the home island.
    PLANE.x = 1700 + Math.sin(simTime * 0.05) * 500;
    PLANE.y = 150 + Math.sin(simTime * 0.11) * 12;
    PLANE.angle = Math.cos(simTime * 0.05) * 0.08;
    PLANE.speed = 34;
    PLANE.throttle = 0.5;
    camX = PLANE.x - 380;
    camY = Math.max(0, PLANE.y - 150);
  } else if (gameState === 'fly' && !paused && (!frozen || simTime < freezeAt)) {
    if (consumePause()) { paused = true; }
    else step(dt);
    updateCamera(dt);
  } else if (gameState === 'fly' && paused) {
    if (consumePause()) paused = false;
  } else if (gameState === 'end') {
    if (consumeRestart()) startSortie(MISSION_DEFS.indexOf(Mission.def));
    const choice = consumeMenuChoice();
    if (choice >= 1 && choice <= 3) startSortie(choice - 1);
  }
  if (Input.anyGesture) { initAudio(); resumeAudio(); }
  render();
  window.requestAnimationFrame(frame);
}

function boot() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  initInput(canvas);
  if (sceneName) applyScene();
  else startMission(0, 0);
  window.requestAnimationFrame(frame);
}

boot();
