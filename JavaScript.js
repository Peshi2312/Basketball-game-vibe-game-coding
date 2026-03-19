const video = document.getElementById('webcam');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screens / navigation
const screenHome = document.getElementById('screenHome');
const screenMenu = document.getElementById('screenMenu');
const screenBalls = document.getElementById('screenBalls');
const screenHowToPlay = document.getElementById('screenHowToPlay');
const screenAbout = document.getElementById('screenAbout');
const screenGame = document.getElementById('screenGame');

const btnHomeStart = document.getElementById('btnHomeStart');
const btnBallColor = document.getElementById('btnBallColor');
const btnHomeHowToPlay = document.getElementById('btnHomeHowToPlay');
const btnHomeAbout = document.getElementById('btnHomeAbout');
const btnBackFromHowToPlay = document.getElementById('btnBackFromHowToPlay');
const btnBackFromAbout = document.getElementById('btnBackFromAbout');
const btnBallsBack = document.getElementById('btnBallsBack');

const btnLevelEasy = document.getElementById('btnLevelEasy');
const btnLevelHard = document.getElementById('btnLevelHard');
const btnLevelInsane = document.getElementById('btnLevelInsane');

const btnRestart = document.getElementById('btnRestart');
const btnExit = document.getElementById('btnExit');

// ball color buttons
const btnBallOrange = document.getElementById('btnBallOrange');
const btnBallBlue = document.getElementById('btnBallBlue');
const btnBallGreen = document.getElementById('btnBallGreen');
const btnBallRed = document.getElementById('btnBallRed');
const btnBallYellow = document.getElementById('btnBallYellow');
const btnBallPurple = document.getElementById('btnBallPurple');

let currentBallColor = '#f97316';

function setBallColor(color) {
  currentBallColor = color;
}

function adjustColor(col, amt) {
  col = col.replace('#','');
  let num = parseInt(col,16);
  let r = (num>>16) + amt;
  let g = ((num>>8)&0xff) + amt;
  let b = (num&0xff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}

// ---------------------------
// Constants
// ---------------------------
const RIM_WIDTH_EASY = 120;
const RIM_WIDTH_HARD = 100;
const RIM_WIDTH_INSANE = 80;
const RIM_HEIGHT = 8;
const FLOOR_Y = canvas.height - 40;

let ball = {
  x: canvas.width * 0.25,
  y: FLOOR_Y - 30,
  r: 22,
  vx: 0,
  vy: 0,
  scored: false,
};

let hoop = {
  x: canvas.width * 0.7,
  y: 170,
  w: 100,
  h: 8,
};

let score = 0;
let timeLeft = 60; // seconds
let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'

// Difficulty levels
const LEVELS = {
  easy: { id: 'easy', name: 'Easy', hoopMove: 'none', moveSpeed: 0 },
  hard: { id: 'hard', name: 'Hard', hoopMove: 'x', moveSpeed: 1.6 },
  insane: { id: 'insane', name: 'Insane', hoopMove: 'x', moveSpeed: 3.0 },
};
let currentLevel = LEVELS.easy;
let levelTime = 60;
let hoopBase = { x: hoop.x, y: hoop.y };
let hoopPhase = 0;

// Hand tracking state (normalized 0..1)
let handX = 0.5;
let handY = 0.5;
let handVisible = false;
let lastHandCanvasX = canvas.width / 2;
let lastHandCanvasY = canvas.height / 2;
let handSpeedX = 0;
let handSpeedY = 0;

// Pinch (thumb + index) state
let isPinching = false;
let wasPinching = false;

// Throwing / physics
let holdingBall = true;
const GRAVITY = 0.8;
const AIR_FRICTION = 0.99;

// Shot meter
let shotMeter = 0; // 0 to 1
let shotMeterActive = false;
let shotMeterStartTime = 0;
const SHOT_METER_DURATION = 1.0; // seconds
const SHOT_GREEN_START = 0.4;
const SHOT_GREEN_END = 0.6;

// UI messages
let message = '';
let messageTimer = 0;

// For frame timing
let lastFrameTime = null;

// ---------------------------
// MediaPipe Hands setup
// ---------------------------
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults((results) => {
  handVisible = false;
  wasPinching = isPinching;
  isPinching = false;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    handX = wrist.x;
    handY = wrist.y;
    handVisible = true;

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const pinchDist = Math.hypot(dx, dy);

    if (pinchDist < 0.06) {
      isPinching = true;
    }
  }
});

// ---------------------------
// Camera
// ---------------------------
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false,
  });

  video.srcObject = stream;

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

// ---------------------------
// Helpers
// ---------------------------
function resetBall() {
  ball.x = canvas.width * 0.25;
  ball.y = FLOOR_Y - 30;
  ball.vx = 0;
  ball.vy = 0;
  ball.scored = false;
  holdingBall = true;
  shotMeter = 0;
  shotMeterActive = false;
}

function startNewGame() {
  score = 0;
  timeLeft = levelTime;
  gameState = 'playing';
  message = '';
  messageTimer = 0;
  hoopPhase = 0;
  shotMeter = 0;
  shotMeterActive = false;
  resetBall();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (gameState === 'menu' || gameState === 'gameover') {
      startNewGame();
    }
  } else if (e.code === 'Escape') {
    // let player back out to main menu from anywhere
    goMenu();
  }
});

function showScreen(which) {
  const all = [screenHome, screenMenu, screenBalls, screenHowToPlay, screenAbout, screenGame];
  for (const el of all) {
    if (!el) continue;
    el.classList.remove('screen-active');
  }
  which?.classList.add('screen-active');
}

function goMenu() { gameState = 'menu'; showScreen(screenMenu); }
function goAbout() { showScreen(screenAbout); }
function goGame() { showScreen(screenGame); }

function setLevel(level) {
  currentLevel = level;
  levelTime = 60;
  hoopBase = { x: canvas.width * 0.7, y: 170 };
  hoop.w = 100;
  hoop.h = 8;
  hoop.x = hoopBase.x;
  hoop.y = hoopBase.y;
}
// make available for inline fallback
window.setLevel = setLevel;
window.startGame = () => { goGame(); startNewGame(); };

btnHomeStart?.addEventListener('click', () => showScreen(screenMenu));
btnBallColor?.addEventListener('click', () => showScreen(screenBalls));
btnHomeHowToPlay?.addEventListener('click', () => showScreen(screenHowToPlay));
btnHomeAbout?.addEventListener('click', () => showScreen(screenAbout));
btnBackFromHowToPlay?.addEventListener('click', () => showScreen(screenHome));
btnBackFromAbout?.addEventListener('click', () => showScreen(screenHome));
btnBallsBack?.addEventListener('click', () => showScreen(screenHome));

btnLevelEasy?.addEventListener('click', () => { setLevel(LEVELS.easy); goGame(); startNewGame(); });
btnLevelHard?.addEventListener('click', () => { setLevel(LEVELS.hard); goGame(); startNewGame(); });
btnLevelInsane?.addEventListener('click', () => { setLevel(LEVELS.insane); goGame(); startNewGame(); });

btnRestart?.addEventListener('click', () => startNewGame());
btnExit?.addEventListener('click', () => goMenu());

// color swatches
[  {btn: btnBallOrange, color:'#f97316'},
  {btn: btnBallBlue, color:'#3b82f6'},
  {btn: btnBallGreen, color:'#10b981'},
  {btn: btnBallRed, color:'#ef4444'},
  {btn: btnBallYellow, color:'#fbbf24'},
  {btn: btnBallPurple, color:'#8b5cf6'}
].forEach(({btn,color})=>{
  btn?.addEventListener('click', () => {
    setBallColor(color);
    // immediately start using current level (defaults to easy)
    goGame();
    startNewGame();
  });
});

// ---------------------------
// Game update
// ---------------------------
function update(dt) {
  if (gameState === 'playing') {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      gameState = 'gameover';
    }
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) { message = ''; messageTimer = 0; }
  }

  if (handVisible) {
    const targetX = (1 - handX) * canvas.width;
    const targetY = handY * canvas.height;
    handSpeedX = targetX - lastHandCanvasX;
    handSpeedY = targetY - lastHandCanvasY;
    lastHandCanvasX = targetX;
    lastHandCanvasY = targetY;
  } else { handSpeedX *= 0.9; handSpeedY *= 0.9; }

  if (gameState !== 'playing') return;

  hoopPhase += dt;
  if (currentLevel.hoopMove === 'x') {
    const amp = canvas.width * 0.12;
    hoop.x = hoopBase.x + Math.sin(hoopPhase * currentLevel.moveSpeed) * amp;
    hoop.y = hoopBase.y;
  } else { hoop.x = hoopBase.x; hoop.y = hoopBase.y; }

  if (holdingBall) {
    const targetX = (1 - handX) * canvas.width;
    const targetY = handY * canvas.height;
    ball.x += (targetX - ball.x) * 0.18;
    ball.y += (targetY - ball.y) * 0.35;

    const speed = Math.hypot(handSpeedX, handSpeedY);
    const upward = handSpeedY < -2.5;

    if (!shotMeterActive && upward && speed > 4) {
      // Start shot meter
      shotMeterActive = true;
      shotMeterStartTime = lastFrameTime / 1000;
      shotMeter = 0;
    }

    if (shotMeterActive) {
      const elapsed = (lastFrameTime / 1000) - shotMeterStartTime;
      shotMeter = Math.min(1, elapsed / SHOT_METER_DURATION);

      if (pinchJustStarted) {
        // Shoot!
        holdingBall = false;
        shotMeterActive = false;
        const inGreen = shotMeter >= SHOT_GREEN_START && shotMeter <= SHOT_GREEN_END;
        const basePower = 12;
        const power = inGreen ? basePower * 1.5 : basePower;
        const maxSide = 18;
        const rawVx = handSpeedX * 0.9;
        ball.vx = Math.max(-maxSide, Math.min(maxSide, rawVx));
        ball.vy = -power; // Always upward for shot
        message = inGreen ? 'Perfect timing!' : 'Good shot!';
        messageTimer = 1.2;
      }

      if (shotMeter >= 1) {
        // Meter full, auto shoot
        holdingBall = false;
        shotMeterActive = false;
        const basePower = 8;
        ball.vx = 0;
        ball.vy = -basePower;
        message = 'Too late!';
        messageTimer = 1.2;
      }
    }
  } else {
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= AIR_FRICTION * 0.985;
    ball.vy *= AIR_FRICTION;

    if (!ball.scored &&
        ball.y - ball.r < hoop.y &&
        ball.y + ball.r > hoop.y &&
        ball.x > hoop.x &&
        ball.x < hoop.x + hoop.w &&
        ball.vy > 0) {
      ball.scored = true;
      score += 2;
      message = 'Nice shot!';
      messageTimer = 1.2;
    }

    if (ball.y + ball.r > FLOOR_Y) {
      ball.y = FLOOR_Y - ball.r;
      ball.vy *= -0.4;
      ball.vx *= 0.8;
      if (Math.abs(ball.vy) < 1 && Math.abs(ball.vx) < 1) resetBall();
    }

    if (ball.x + ball.r < -50 || ball.x - ball.r > canvas.width + 50) resetBall();
  }
}

// ---------------------------
// Drawing
// ---------------------------
function drawCourtBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(0.6, '#020617');
  gradient.addColorStop(1, '#0b1120');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(canvas.width, FLOOR_Y);
  ctx.stroke();
}

function drawHoop() {
  const backboardWidth = 140;
  const backboardHeight = 80;
  const backboardX = hoop.x + hoop.w / 2 - backboardWidth / 2;
  const backboardY = hoop.y - backboardHeight / 2 - 20;
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(backboardX, backboardY, backboardWidth, backboardHeight);
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  ctx.strokeRect(backboardX + 40, backboardY + 25, backboardWidth - 80, backboardHeight - 50);
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(hoop.x + hoop.w / 2, hoop.y, hoop.w / 2, 0, Math.PI, false);
  ctx.stroke();
  const netTopY = hoop.y + 4;
  const netBottomY = hoop.y + 40;
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const x = hoop.x + t * hoop.w;
    const bottomX = hoop.x + hoop.w / 2 + (t - 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(x, netTopY);
    ctx.lineTo(bottomX, netBottomY);
    ctx.stroke();
  }
}

function drawBall() {
  const shadowScale = 1.2;
  const shadowY = FLOOR_Y + 4;
  const heightFactor = Math.max(0, Math.min(1, (FLOOR_Y - ball.y) / (FLOOR_Y - 80)));
  const shadowRadius = ball.r * shadowScale * (1 - 0.5 * heightFactor);
  ctx.beginPath();
  ctx.ellipse(ball.x, shadowY, shadowRadius, shadowRadius * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fill();
  const gradient = ctx.createRadialGradient(ball.x - ball.r * 0.4, ball.y - ball.r * 0.4, ball.r * 0.3, ball.x, ball.y, ball.r);
  gradient.addColorStop(0, adjustColor(currentBallColor, 80));
  gradient.addColorStop(0.4, adjustColor(currentBallColor, 40));
  gradient.addColorStop(1, currentBallColor);
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.9, -Math.PI / 2.5, Math.PI / 2.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.9, (Math.PI / 2) * 0.8, (Math.PI / 2) * 3.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.9, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.9, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function drawHUD() {
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Score: ${score}`, 24, 20);
  ctx.textAlign = 'right';
  const seconds = Math.ceil(timeLeft);
  ctx.fillText(`Time: ${seconds}s`, canvas.width - 24, 20);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '18px system-ui';
  ctx.fillText(currentLevel.name, canvas.width / 2, 22);
<<<<<<< HEAD

  // Draw shot meter
  if (shotMeterActive) {
    const meterWidth = 200;
    const meterHeight = 20;
    const meterX = canvas.width / 2 - meterWidth / 2;
    const meterY = canvas.height - 60;
    ctx.fillStyle = '#374151';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(meterX, meterY, meterWidth * shotMeter, meterHeight);
    ctx.fillStyle = '#10b981';
    const greenStart = meterX + meterWidth * SHOT_GREEN_START;
    const greenWidth = meterWidth * (SHOT_GREEN_END - SHOT_GREEN_START);
    ctx.fillRect(greenStart, meterY, greenWidth, meterHeight);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px system-ui';
    ctx.fillText('TIMING', canvas.width / 2, meterY - 25);
  }

=======
  if (gameState === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = '16px system-ui';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(
      'Move your hand to control the ball. Flick your hand upwards to shoot!',
      canvas.width / 2,
      canvas.height - 70
    );
  }
>>>>>>> 1f69c7ea5b0a4090c4ee2794f016978dc13387aa
  if (message) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '32px system-ui';
    ctx.fillStyle = '#facc15';
    ctx.fillText(message, canvas.width / 2, 90);
  }
}

function drawOverlays() {
  if (gameState === 'menu') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '40px system-ui';
    ctx.fillText('Camera Basketball', canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = '22px system-ui';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Allow camera access, then move your hand in front of the camera.', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press SPACE to start. Flick your hand upwards to shoot.', canvas.width / 2, canvas.height / 2 + 40);
  } else if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '38px system-ui';
    ctx.fillText('Time Up!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '28px system-ui';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 5);
    ctx.font = '20px system-ui';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Press Restart (or SPACE) to play again', canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText('Press ESC or click "Exit to menu" to go back', canvas.width / 2, canvas.height / 2 + 80);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCourtBackground();
  drawHoop();
  drawBall();
  drawHUD();
  drawOverlays();
}

// ---------------------------
// Main loop
// ---------------------------
function loop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// make sure first screen matches markup
showScreen(screenHome);
startCamera().catch(console.error);
<<<<<<< HEAD

// Load background images
gameBackgroundImg.src = './Game_Background.png';
asset2Img.src = './Asset 2.png';

// Expose for fallback script
window.Levels = LEVELS;
window.BallColors = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#fbbf24',
  purple: '#8b5cf6'
};

=======
>>>>>>> 1f69c7ea5b0a4090c4ee2794f016978dc13387aa
requestAnimationFrame(loop);