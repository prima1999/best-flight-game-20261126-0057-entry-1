// Input state for SkyCourier: keyboard pitch and throttle, mouse steering.
// One job: collect raw device input into a single state object the plane reads.

const Input = {
  pitchUp: false,
  pitchDown: false,
  throttleUp: false,
  throttleDown: false,
  gearToggle: false,
  dropPressed: false,
  pausePressed: false,
  restartPressed: false,
  menuChoice: 0,
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  mouseSteer: false,
  anyGesture: false,
};

const _held = new Set();
let _dropEdge = false;
let _gearEdge = false;
let _pauseEdge = false;
let _restartEdge = false;

function initInput(canvas) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const code = event.code;
    _held.add(code);
    Input.anyGesture = true;
    if (code === 'ArrowUp' || code === 'KeyW') Input.pitchUp = true;
    if (code === 'ArrowDown' || code === 'KeyS') Input.pitchDown = true;
    if (code === 'ArrowRight' || code === 'KeyD') Input.throttleUp = true;
    if (code === 'ArrowLeft' || code === 'KeyA') Input.throttleDown = true;
    if (code === 'Space') { _dropEdge = true; event.preventDefault(); }
    if (code === 'KeyG') _gearEdge = true;
    if (code === 'KeyP' || code === 'Escape') _pauseEdge = true;
    if (code === 'KeyR') _restartEdge = true;
    if (code === 'Digit1') Input.menuChoice = 1;
    if (code === 'Digit2') Input.menuChoice = 2;
    if (code === 'Digit3') Input.menuChoice = 3;
    if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const code = event.code;
    _held.delete(code);
    if (code === 'ArrowUp' || code === 'KeyW') Input.pitchUp = false;
    if (code === 'ArrowDown' || code === 'KeyS') Input.pitchDown = false;
    if (code === 'ArrowRight' || code === 'KeyD') Input.throttleUp = false;
    if (code === 'ArrowLeft' || code === 'KeyA') Input.throttleDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    Input.mouseX = event.clientX - rect.left;
    Input.mouseY = event.clientY - rect.top;
    Input.mouseSteer = true;
    Input.anyGesture = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    Input.mouseDown = true;
    Input.anyGesture = true;
    event.preventDefault();
  });
  window.addEventListener('mouseup', () => { Input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

// Edge-triggered actions: read once per frame, then cleared by endFrameInput.
function consumeDrop() { const v = _dropEdge; _dropEdge = false; return v; }
function consumeGear() { const v = _gearEdge; _gearEdge = false; return v; }
function consumePause() { const v = _pauseEdge; _pauseEdge = false; return v; }
function consumeRestart() { const v = _restartEdge; _restartEdge = false; return v; }
function consumeMenuChoice() { const v = Input.menuChoice; Input.menuChoice = 0; return v; }

// Pitch input in [-1, 1]: keyboard wins, else the mouse steers toward its height.
function pitchInput(canvasHeight) {
  if (Input.pitchUp) return -1;
  if (Input.pitchDown) return 1;
  if (Input.mouseSteer) {
    const center = canvasHeight * 0.42;
    const delta = (Input.mouseY - center) / (canvasHeight * 0.30);
    return Math.max(-1, Math.min(1, delta));
  }
  return 0;
}
