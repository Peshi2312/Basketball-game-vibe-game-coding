const video = document.getElementById('webcam');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---------------------------
// Screens (match index.html)
// ---------------------------
const screenHome = document.getElementById('screenHome');
const screenMenu = document.getElementById('screenMenu');
const screenBalls = document.getElementById('screenBalls');
const screenHowToPlay = document.getElementById('screenHowToPlay');
const screenAbout = document.getElementById('screenAbout');
const screenGame = document.getElementById('screenGame');

function showScreen(el) {
  for (const s of [screenHome, screenMenu, screenBalls, screenHowToPlay, screenAbout, screenGame]) {
    if (s) s.classList.remove('screen-active');
  }
  el?.classList.add('screen-active');

  // Switch music based on the active screen
  updateMusicForScreen(el);
}

// ---------------------------
// Music
// ---------------------------
const bgMusic = document.getElementById('bgMusic');
const gameMusic = document.getElementById('gameMusic');

let audioUnlocked = false;
let desiredTrack = 'bg'; // 'bg' | 'game'

const BG_MUSIC_SRC =
  '../[No Copyright Background Music] Bouncy Dynamic Retro Electro Beat  Trespass by HiLau - Free To Use — royalty free music, no copyright (youtube).mp3';
const GAME_MUSIC_SRC = '../Techno - The OOOOOO song - juissi90 (youtube).mp3';

if (bgMusic) bgMusic.src = encodeURI(BG_MUSIC_SRC);
if (gameMusic) gameMusic.src = encodeURI(GAME_MUSIC_SRC);

function safePause(audio) {
  try {
    audio?.pause();
  } catch {
    // ignore
  }
}

async function safePlay(audio) {
  if (!audio) return false;
  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Try starting the background music first (usually allowed after user gesture)
  desiredTrack = desiredTrack || 'bg';
  if (desiredTrack === 'game') {
    safePause(bgMusic);
    await safePlay(gameMusic);
  } else {
    safePause(gameMusic);
    await safePlay(bgMusic);
  }
}

function updateMusicForScreen(activeEl) {
  // If audio is not unlocked yet, remember what we want.
  if (!audioUnlocked) {
    desiredTrack = activeEl === screenGame ? 'game' : 'bg';
    return;
  }

  if (activeEl === screenGame) {
    desiredTrack = 'game';
    safePause(bgMusic);
    safePlay(gameMusic);
  } else {
    desiredTrack = 'bg';
    safePause(gameMusic);
    safePlay(bgMusic);
  }
}

// Unlock audio on the first user interaction (browser autoplay policy)
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// Buttons
const btnHomeStart = document.getElementById('btnHomeStart');
const btnBallColor = document.getElementById('btnBallColor');
const btnHomeHowToPlay = document.getElementById('btnHomeHowToPlay');
const btnHomeAbout = document.getElementById('btnHomeAbout');
const btnMenuBack = document.getElementById('btnMenuBack');
const btnBallsBack = document.getElementById('btnBallsBack');
const btnBackFromHowToPlay = document.getElementById('btnBackFromHowToPlay');
const btnBackFromAbout = document.getElementById('btnBackFromAbout');
const btnLevelEasy = document.getElementById('btnLevelEasy');
const btnLevelHard = document.getElementById('btnLevelHard');
const btnLevelInsane = document.getElementById('btnLevelInsane');
const btnRestart = document.getElementById('btnRestart');
const btnHomeInGame = document.getElementById('btnHomeInGame');
const btnExit = document.getElementById('btnExit');

btnHomeStart?.addEventListener('click', () => showScreen(screenMenu));
btnBallColor?.addEventListener('click', () => showScreen(screenBalls));
btnHomeHowToPlay?.addEventListener('click', () => showScreen(screenHowToPlay));
btnHomeAbout?.addEventListener('click', () => showScreen(screenAbout));
btnMenuBack?.addEventListener('click', () => showScreen(screenHome));
btnBallsBack?.addEventListener('click', () => showScreen(screenHome));
btnBackFromHowToPlay?.addEventListener('click', () => showScreen(screenHome));
btnBackFromAbout?.addEventListener('click', () => showScreen(screenHome));
btnHomeInGame?.addEventListener('click', () => showScreen(screenHome));
btnExit?.addEventListener('click', () => showScreen(screenMenu));

// ---------------------------
// Assets
// ---------------------------
const bgImg = new Image();
bgImg.src = 'Game_Background.png';
let bgImgReady = false;
bgImg.onload = () => (bgImgReady = true);
bgImg.onerror = () => (bgImgReady = false);

const hoopImg = new Image();
hoopImg.src = 'Asset 2.png';
let hoopImgReady = false;
hoopImg.onload = () => (hoopImgReady = true);
hoopImg.onerror = () => (hoopImgReady = false);

// Score SFX (played when the ball scores)
const swishSfx = new Audio('Basketball Swish 1.mp3');
swishSfx.preload = 'auto';
swishSfx.volume = 0.9;
function playSwish() {
  try {
    swishSfx.currentTime = 0;
    // play() might be blocked until the first user gesture; we ignore failures.
    const p = swishSfx.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // ignore
  }
}

// ---------------------------
// Levels + ball colors (exposed for index.html fallback script)
// ---------------------------
const Levels = {
  easy: { id: 'easy', name: 'Easy', rimSpeed: 0, rimWidth: 230 },
  hard: { id: 'hard', name: 'Hard', rimSpeed: 1.6, rimWidth: 180 },
  insane: { id: 'insane', name: 'Insane', rimSpeed: 3.0, rimWidth: 120 },
};

const BallColors = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#fbbf24',
  purple: '#8b5cf6',
};

window.Levels = Levels;
window.BallColors = BallColors;

let currentLevel = Levels.easy;
let currentBallColor = BallColors.orange;

window.setLevel = function setLevel(level) {
  currentLevel = level || Levels.easy;
  hoop.w = currentLevel.rimWidth;
};

window.setBallColor = function setBallColor(color) {
  currentBallColor = color || BallColors.orange;
};

// ---------------------------
// Performance / tracking
// ---------------------------
const SMOOTHING = 0.55;
let lastHandProcess = 0;
let handsBusy = false;
const HAND_FPS = 24;
const HAND_INTERVAL_MS = 1000 / HAND_FPS;

// ---------------------------
// Game state
// ---------------------------
const FLOOR_Y = canvas.height - 40;
const GRAVITY = 0.8;

let ball = { x: 200, y: FLOOR_Y - 30, r: 22, vx: 0, vy: 0 };
// Small offset left for the rim
const HOOP_BASE_X = 690;
let hoop = { x: HOOP_BASE_X, y: 200, w: currentLevel.rimWidth };

// Hoop image layout
const HOOP_IMG_SCALE = 0.55;
const HOOP_IMG_W = 474 * HOOP_IMG_SCALE;
const HOOP_IMG_H = 402 * HOOP_IMG_SCALE;
const HOOP_RIM_Y_OFFSET = 200 * HOOP_IMG_SCALE;

let score = 0;
let timeLeft = 60;
let gameRunning = false;
let holdingBall = true;
let ballScored = false;
let hoopPhase = 0;
let message = '';
let messageTimer = 0;

function resetBall() {
  ball.x = 200;
  ball.y = FLOOR_Y - 30;
  ball.vx = 0;
  ball.vy = 0;
  holdingBall = true;
  ballScored = false;
  message = '';
  messageTimer = 0;
}

// ---------------------------
// Hand tracking (MediaPipe)
// ---------------------------
let handX = 0.5, handY = 0.5, handVisible = false;
let lastX = canvas.width / 2, lastY = canvas.height / 2;
let speedX = 0, speedY = 0;
let pinch = false, prevPinch = false;

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults((r) => {
  prevPinch = pinch;
  let nextPinch = false;
  handVisible = false;

  if (r.multiHandLandmarks?.length) {
    const lm = r.multiHandLandmarks[0];
    handX = lm[0].x;
    handY = lm[0].y;
    handVisible = true;

    const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
    const PINCH_CLOSE = 0.055;
    const PINCH_OPEN = 0.075;
    nextPinch = prevPinch ? d < PINCH_OPEN : d < PINCH_CLOSE;
  }

  pinch = nextPinch;
});

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360 },
    audio: false,
  });
  video.srcObject = stream;

  const cam = new Camera(video, {
    onFrame: async () => {
      const now = performance.now();
      if (handsBusy) return;
      if (now - lastHandProcess > HAND_INTERVAL_MS) {
        handsBusy = true;
        await hands.send({ image: video });
        handsBusy = false;
        lastHandProcess = now;
      }
    },
  });

  cam.start();
}

// ---------------------------
// Game control
// ---------------------------
function startGame() {
  score = 0;
  timeLeft = 60;
  gameRunning = true;
  hoopPhase = 0;
  hoop.w = currentLevel.rimWidth;
  resetBall();
  showScreen(screenGame);
}

window.startGame = startGame;

btnLevelEasy?.addEventListener('click', () => { window.setLevel(Levels.easy); startGame(); });
btnLevelHard?.addEventListener('click', () => { window.setLevel(Levels.hard); startGame(); });
btnLevelInsane?.addEventListener('click', () => { window.setLevel(Levels.insane); startGame(); });
btnRestart?.addEventListener('click', () => startGame());

function bindBallButton(id, color) {
  const el = document.getElementById(id);
  el?.addEventListener('click', () => {
    window.setBallColor(color);
    startGame();
  });
}
bindBallButton('btnBallOrange', BallColors.orange);
bindBallButton('btnBallBlue', BallColors.blue);
bindBallButton('btnBallGreen', BallColors.green);
bindBallButton('btnBallRed', BallColors.red);
bindBallButton('btnBallYellow', BallColors.yellow);
bindBallButton('btnBallPurple', BallColors.purple);

// ---------------------------
// Update + draw
// ---------------------------
function update(dt) {
  if (!gameRunning) return;

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) {
      messageTimer = 0;
      message = '';
    }
  }

  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    gameRunning = false;
  }

  hoopPhase += dt;
  hoop.x = HOOP_BASE_X + Math.sin(hoopPhase * currentLevel.rimSpeed) * 100;

  if (handVisible) {
    const tx = (1 - handX) * canvas.width; // inverted left-right
    const ty = handY * canvas.height;

    const prevLX = lastX;
    const prevLY = lastY;
    lastX += (tx - lastX) * SMOOTHING;
    lastY += (ty - lastY) * SMOOTHING;

    speedX = lastX - prevLX;
    speedY = lastY - prevLY;

    if (holdingBall) {
      ball.x += (tx - ball.x) * 0.35;
      ball.y += (ty - ball.y) * 0.55;

      const pinchJustStarted = pinch && !prevPinch;
      const speed = Math.hypot(speedX, speedY);

      if (pinchJustStarted && speed > 1.5) {
        holdingBall = false;
        ballScored = false;

        const maxSide = 18;
        const rawVx = speedX * 1.2;
        ball.vx = Math.max(-maxSide, Math.min(maxSide, rawVx));

        let rawVy = speedY * 2.0;
        if (rawVy > -12) rawVy = -18;
        ball.vy = Math.max(-30, Math.min(-12, rawVy));
      }
    }
  }

  if (!holdingBall) {
    const prevY = ball.y;
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (
      !ballScored &&
      ball.vy > 0 &&
      // Require the ball to cross the rim line (above -> below)
      prevY < hoop.y &&
      ball.y + ball.r >= hoop.y
    ) {
      // Tighten the scoring window to rim/hole area
      const rimXLeft = hoop.x + hoop.w * 0.08;
      const rimXRight = hoop.x + hoop.w * 0.92;
      const openingPad = hoop.w * 0.28; // smaller window for "go in"
      const openingLeft = hoop.x + openingPad;
      const openingRight = hoop.x + hoop.w - openingPad;

      const crossedXInRim = ball.x >= rimXLeft && ball.x <= rimXRight;
      const crossedXInOpening = ball.x >= openingLeft && ball.x <= openingRight;

      // Approx rim thickness band (since hoop is an image)
      const rimBandTop = hoop.y - 4;
      const rimBandBottom = hoop.y + 12;
      const overlapsRimBand =
        ball.y - ball.r <= rimBandBottom && ball.y + ball.r >= rimBandTop;

      if (overlapsRimBand && crossedXInRim) {
        score += 2;
        playSwish();
        // Gold feedback text on successful scoring
        message = "You've scored a point!";
        messageTimer = 1.3;
        ballScored = true;
      }
    }
  }

  if (ball.y > FLOOR_Y) {
    ball.y = FLOOR_Y;
    ball.vy *= -0.4;
    ball.vx *= 0.85;
    if (Math.abs(ball.vy) < 1 && Math.abs(ball.vx) < 0.8) {
      holdingBall = true;
      ball.vx = 0;
      ball.vy = 0;
    }
  }
}

function drawBall() {
  const g = ctx.createRadialGradient(
    ball.x - ball.r * 0.35,
    ball.y - ball.r * 0.35,
    ball.r * 0.2,
    ball.x,
    ball.y,
    ball.r
  );
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, currentBallColor);
  g.addColorStop(1, 'rgba(0,0,0,0.55)');

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(17, 24, 39, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.92, -Math.PI / 2.2, Math.PI / 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.92, Math.PI - Math.PI / 2.2, Math.PI + Math.PI / 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.92, 0, Math.PI);
  ctx.stroke();
}

function drawHoop() {
  if (hoopImgReady) {
    const cx = hoop.x + hoop.w / 2;
    const imgX = cx - HOOP_IMG_W / 2;
    const imgY = hoop.y - HOOP_RIM_Y_OFFSET;
    ctx.drawImage(hoopImg, imgX, imgY, HOOP_IMG_W, HOOP_IMG_H);
  } else {
    ctx.fillStyle = 'orange';
    ctx.fillRect(hoop.x, hoop.y, hoop.w, 10);
  }
}

function drawHUD() {
  ctx.fillStyle = 'white';
  ctx.font = '20px system-ui';
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Time: ${Math.ceil(timeLeft)}`, 20, 60);
  ctx.fillText(currentLevel.name, 20, 90);

  if (messageTimer > 0 && message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15'; // gold
    ctx.font = '34px system-ui';
    ctx.fillText(message, canvas.width / 2, 150);
    ctx.textAlign = 'left';
    ctx.font = '20px system-ui';
    ctx.fillStyle = 'white';
  }

  if (!gameRunning) {
    ctx.fillText('Time up! Press Restart.', 20, 120);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (bgImgReady) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  }

  drawHoop();
  drawBall();
  drawHUD();
}

let last = 0;
function loop(t) {
  const dt = (t - last) / 1000;
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Boot
startCamera().catch(console.error);
requestAnimationFrame(loop);
showScreen(screenHome);