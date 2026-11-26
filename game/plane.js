// Plane for SkyCourier: flight physics and the mail plane itself.
// One job: move the aircraft believably (throttle, pitch, lift, stall, fuel,
// damage) and draw it as a built little single-prop mail plane.

const PLANE = {
  x: 900,
  y: 120,
  angle: 0,
  speed: 34,
  throttle: 0.55,
  fuel: 100,
  damage: 0,
  gearDown: false,
  onGround: false,
  crashed: false,
  landed: false,
  propAngle: 0,
  sinkRate: 0,
  smoothTime: 0,
};

const MAX_SPEED = 82;
const STALL_SPEED = 19;
const PITCH_RATE = 1.15;
const FUEL_BURN = 1.05;
const PLANE_LENGTH_M = 9;

function resetPlane(x, y, angle, speed, throttle) {
  PLANE.x = x;
  PLANE.y = y;
  PLANE.angle = angle;
  PLANE.speed = speed;
  PLANE.throttle = throttle;
  PLANE.fuel = 100;
  PLANE.damage = 0;
  PLANE.gearDown = false;
  PLANE.onGround = false;
  PLANE.crashed = false;
  PLANE.landed = false;
  PLANE.propAngle = 0;
  PLANE.sinkRate = 0;
  PLANE.smoothTime = 0;
}

// Pitch input: -1 is nose up, +1 is nose down (see input.js pitchInput).
function updatePlane(dt, pitch, terrain) {
  if (PLANE.crashed || PLANE.landed) {
    PLANE.speed = Math.max(0, PLANE.speed - 30 * dt);
    PLANE.propAngle += PLANE.speed * dt * 0.4;
    return;
  }
  // Throttle follows keys; holding the mouse button spools it up too.
  if (Input.throttleUp || Input.mouseDown) PLANE.throttle = Math.min(1, PLANE.throttle + 0.55 * dt);
  if (Input.throttleDown) PLANE.throttle = Math.max(0, PLANE.throttle - 0.55 * dt);
  if (PLANE.fuel <= 0) PLANE.throttle = 0;

  if (PLANE.onGround) {
    // Rolling on rough ground after a survivable bump: speed bleeds off,
    // and a firm pull-up with power lifts off again.
    PLANE.speed = Math.max(0, PLANE.speed - 14 * dt);
    PLANE.x += PLANE.speed * dt;
    PLANE.y = terrain.terrainHeight(PLANE.x) + 1.2;
    PLANE.propAngle += (4 + PLANE.throttle * 26) * dt;
    PLANE.fuel = Math.max(0, PLANE.fuel - PLANE.throttle * FUEL_BURN * dt);
    if (PLANE.speed > 26 && pitch < -0.4 && PLANE.throttle > 0.6) PLANE.onGround = false;
    if (PLANE.speed < 4 && isOverRunway(PLANE.x)) { PLANE.landed = true; }
    return;
  }

  // Pitch: responsive at every speed, gentler when slow; hard turns bleed speed.
  const authority = 0.45 + 0.55 * Math.min(1, PLANE.speed / 45);
  const pitchRate = pitch * PITCH_RATE * authority;
  PLANE.angle -= pitchRate * dt;
  PLANE.angle = Math.max(-1.1, Math.min(1.1, PLANE.angle));
  const turnBleed = Math.abs(pitchRate) * PLANE.speed * 0.045;
  if (Math.abs(pitch) > 0.25) PLANE.smoothTime = 0;
  else PLANE.smoothTime += dt;

  // Thrust, drag, gravity along the flight path.
  const thrust = PLANE.throttle * 24;
  const drag = 0.0038 * PLANE.speed * PLANE.speed + turnBleed;
  const gravityAlong = 9.8 * Math.sin(PLANE.angle) * 0.62;
  PLANE.speed += (thrust - drag - gravityAlong) * dt;
  PLANE.speed = Math.max(0, Math.min(MAX_SPEED, PLANE.speed));

  // Lift: below stall speed the wing quits and the plane sinks.
  const lift = Math.min(1, PLANE.speed / STALL_SPEED);
  PLANE.sinkRate = (1 - lift) * 13 + 0.4;
  const vx = Math.cos(PLANE.angle) * PLANE.speed;
  const vy = Math.sin(PLANE.angle) * PLANE.speed - PLANE.sinkRate;
  PLANE.x += vx * dt;
  PLANE.y += vy * dt;
  PLANE.propAngle += (4 + PLANE.throttle * 26) * dt;

  // Fuel burns with throttle; full throttle drinks faster.
  PLANE.fuel -= PLANE.throttle * FUEL_BURN * (0.7 + PLANE.throttle * 0.6) * dt;
  if (PLANE.fuel < 0) PLANE.fuel = 0;

  // World edges: soft walls turn the plane back over the island chain.
  if (PLANE.x < 150) { PLANE.x = 150; PLANE.angle = Math.abs(PLANE.angle) * 0.3; }
  if (PLANE.x > WORLD_WIDTH - 150) { PLANE.x = WORLD_WIDTH - 150; PLANE.angle = -Math.abs(PLANE.angle) * 0.3; }
  if (PLANE.y > 520) { PLANE.y = 520; PLANE.angle = Math.min(PLANE.angle, -0.05); }

  // Ground contact.
  const ground = terrain.terrainHeight(PLANE.x);
  if (PLANE.y <= ground + 1.2) {
    PLANE.y = ground + 1.2;
    handleGroundContact(ground, vy, vx);
  }
}

function handleGroundContact(ground, vy, vx) {
  const descent = -vy;
  const overRunway = isOverRunway(PLANE.x);
  const overWater = ground <= 0.5;
  if (overWater) {
    PLANE.crashed = true;
    PLANE.damage = 100;
    return;
  }
  if (overRunway && descent <= 3.2 && PLANE.speed <= 46 && Math.abs(PLANE.angle) < 0.22) {
    // A gentle runway touchdown: the sortie is over, wheels down or not.
    PLANE.landed = true;
    PLANE.onGround = true;
    if (!PLANE.gearDown) PLANE.damage = Math.min(100, PLANE.damage + 30);
    return;
  }
  if (descent > 7 || PLANE.speed > 58) {
    PLANE.crashed = true;
    PLANE.damage = 100;
    return;
  }
  // A rough but survivable bump: damage scales with how hard the hit was.
  const hit = Math.max(0, descent - 2.5) * 9 + Math.max(0, PLANE.speed - 46) * 1.2;
  PLANE.damage = Math.min(100, PLANE.damage + hit);
  PLANE.speed *= 0.55;
  PLANE.angle = 0;
  PLANE.onGround = true;
  PLANE.y = ground + 1.2;
  if (PLANE.damage >= 100) PLANE.crashed = true;
  if (PLANE.speed < 4 && overRunway) { PLANE.landed = true; PLANE.onGround = true; }
}

function planeKnots() { return PLANE.speed * 1.944; }
function planeFeet() { return PLANE.y * 3.281; }
function planeHeadingDeg() {
  // Side view: heading is the compass bearing of the flight direction.
  const deg = PLANE.angle * 57.2958;
  return Math.round(((90 - deg) % 360 + 360) % 360);
}

function drawPlane(ctx, sx, sy, scale, time) {
  const s = scale * 1.55;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-PLANE.angle);
  // Soft shadow on the ground below is drawn by the caller; here is the plane.
  // Propeller: blurred disc plus two blades spinning.
  ctx.save();
  ctx.translate(PLANE_LENGTH_M * 0.62 * s, 0);
  ctx.fillStyle = 'rgba(40, 40, 40, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 11 * s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(PLANE.propAngle);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-1.2 * s * 0.5, -11 * s * 0.55, 2.4 * s * 0.5, 22 * s * 0.55);
  ctx.restore();
  // Fuselage: a warm cream mail plane with a teal cheatline.
  ctx.fillStyle = '#f3e2b8';
  ctx.beginPath();
  ctx.moveTo(-PLANE_LENGTH_M * 0.55 * s, 0);
  ctx.quadraticCurveTo(-PLANE_LENGTH_M * 0.45 * s, -3.4 * s * 0.5, -PLANE_LENGTH_M * 0.1 * s, -3.6 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.5 * s, -2.4 * s * 0.5);
  ctx.quadraticCurveTo(PLANE_LENGTH_M * 0.62 * s, -1.2 * s * 0.5, PLANE_LENGTH_M * 0.6 * s, 0.4 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.42 * s, 2.6 * s * 0.5);
  ctx.lineTo(-PLANE_LENGTH_M * 0.35 * s, 2.8 * s * 0.5);
  ctx.quadraticCurveTo(-PLANE_LENGTH_M * 0.55 * s, 2.2 * s * 0.5, -PLANE_LENGTH_M * 0.55 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f7a6d';
  ctx.fillRect(-PLANE_LENGTH_M * 0.35 * s, -0.6 * s * 0.5, PLANE_LENGTH_M * 0.85 * s, 1.5 * s * 0.5);
  // Cockpit window, lit amber.
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.moveTo(PLANE_LENGTH_M * 0.08 * s, -3.4 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.3 * s, -3.2 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.28 * s, -1.2 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.08 * s, -1.2 * s * 0.5);
  ctx.closePath();
  ctx.fill();
  // Mail roundel on the fuselage.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.arc(-PLANE_LENGTH_M * 0.12 * s, 0.4 * s * 0.5, 2.6 * s * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.max(6, 3.4 * s * 0.5) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✉', -PLANE_LENGTH_M * 0.12 * s, 0.5 * s * 0.5);
  // Wing and tailplane.
  ctx.fillStyle = '#1f7a6d';
  ctx.beginPath();
  ctx.moveTo(-PLANE_LENGTH_M * 0.05 * s, -1 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.08 * s, -1 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.16 * s, -8 * s * 0.5);
  ctx.lineTo(PLANE_LENGTH_M * 0.02 * s, -8 * s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-PLANE_LENGTH_M * 0.55 * s, -0.5 * s * 0.5);
  ctx.lineTo(-PLANE_LENGTH_M * 0.42 * s, -0.5 * s * 0.5);
  ctx.lineTo(-PLANE_LENGTH_M * 0.4 * s, -6.5 * s * 0.5);
  ctx.lineTo(-PLANE_LENGTH_M * 0.5 * s, -6.5 * s * 0.5);
  ctx.closePath();
  ctx.fill();
  // Landing gear.
  if (PLANE.gearDown || PLANE.onGround) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(PLANE_LENGTH_M * 0.3 * s, 2.6 * s * 0.5);
    ctx.lineTo(PLANE_LENGTH_M * 0.3 * s, 6 * s * 0.5);
    ctx.moveTo(-PLANE_LENGTH_M * 0.25 * s, 2.8 * s * 0.5);
    ctx.lineTo(-PLANE_LENGTH_M * 0.25 * s, 6 * s * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(PLANE_LENGTH_M * 0.3 * s, 6.4 * s * 0.5, 2.2, 0, Math.PI * 2);
    ctx.arc(-PLANE_LENGTH_M * 0.25 * s, 6.4 * s * 0.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
