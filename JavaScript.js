const video = document.getElementById('webcam');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---------------------------
// ASSETS
// ---------------------------
const hoopImg = new Image();
hoopImg.src = 'Asset 2.png';
let hoopImgReady = false;
hoopImg.onload = () => {
  hoopImgReady = true;
};
hoopImg.onerror = () => {
  hoopImgReady = false;
};

// ---------------------------
// SCREENS / NAVIGATION (matches index.html)
// ---------------------------
const screenMenu = document.getElementById('screenMenu');
const screenAbout = document.getElementById('screenAbout');
const screenGame = document.getElementById('screenGame');

const btnHome = document.getElementById('btnHome');
const btnAbout = document.getElementById('btnAbout');
const btnBackFromAbout = document.getElementById('btnBackFromAbout');
const btnLevelEasy = document.getElementById('btnLevelEasy');
const btnLevelHard = document.getElementById('btnLevelHard');
const btnLevelInsane = document.getElementById('btnLevelInsane');
const btnRestart = document.getElementById('btnRestart');
const btnExit = document.getElementById('btnExit');

function showScreen(el) {
  for (const s of [screenMenu, screenAbout, screenGame]) {
    if (s) s.classList.remove('screen-active');
  }
  el?.classList.add('screen-active');
}

function goMenu() {
  gameState = 'menu';
  showScreen(screenMenu);
}

function goAbout() {
  showScreen(screenAbout);
}

function goGame() {
  showScreen(screenGame);
}

btnHome?.addEventListener('click', goMenu);
btnAbout?.addEventListener('click', goAbout);
btnBackFromAbout?.addEventListener('click', goMenu);
btnExit?.addEventListener('click', goMenu);

// ---------------------------
// PERFORMANCE + FEEL
// ---------------------------
const SMOOTHING = 0.55;

// Throttle hand tracking so it doesn't lag
let lastHandProcess = 0;
let handsBusy = false;
const HAND_FPS = 24;
const HAND_INTERVAL_MS = 1000 / HAND_FPS;

// ---------------------------
// GAME STATE
// ---------------------------
const FLOOR_Y = canvas.height - 40;

let ball = {
  x: 200,
  y: FLOOR_Y - 30,
  r: 22,
  vx: 0,
  vy: 0,
};

let hoop = {
  x: 700,
  y: 200,
  w: 120,
  h: RIM_HEIGHT,
};

let score = 0;
let timeLeft = 60;
let gameRunning = false;
let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'
let holdingBall = true;
let ballScored = false;

const LEVELS = {
  easy: { speed: 0, width: 230 },
  hard: { speed: 1.6, width: 180 },
  insane: { speed: 3.0, width: 120 }
};

let currentLevel = LEVELS.easy;
let hoopPhase = 0;

// ---------------------------
// HAND TRACKING
// ---------------------------
let handX = 0.5, handY = 0.5, handVisible = false;
let lastX = canvas.width/2, lastY = canvas.height/2;
let speedX=0, speedY=0;
let pinch=false, prevPinch=false;

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands:1,
  modelComplexity:0,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});

hands.onResults(r=>{
  prevPinch = pinch;
  // Hysteresis: once pinching, require larger distance to unpinch
  let nextPinch = false;
  handVisible=false;

  if(r.multiHandLandmarks?.length){
    const lm = r.multiHandLandmarks[0];
    handX = lm[0].x;
    handY = lm[0].y;
    handVisible=true;

    const d = Math.hypot(
      lm[4].x - lm[8].x,
      lm[4].y - lm[8].y
    );
    const PINCH_CLOSE = 0.055;
    const PINCH_OPEN = 0.075;
    if (prevPinch) {
      nextPinch = d < PINCH_OPEN;
    } else {
      nextPinch = d < PINCH_CLOSE;
    }
  }
  pinch = nextPinch;
});

// ---------------------------
// CAMERA
// ---------------------------
async function startCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({
    video:{width:480,height:360}
  });
  video.srcObject = stream;

  const cam = new Camera(video,{
    onFrame: async ()=>{
      const now = performance.now();
      if (handsBusy) return;
      if(now-lastHandProcess>HAND_INTERVAL_MS){
        handsBusy = true;
        await hands.send({image:video});
        handsBusy = false;
        lastHandProcess = now;
      }
    }
  });
  cam.start();
}

// ---------------------------
// GAME
// ---------------------------
function startGame(level){
  currentLevel = LEVELS[level];
  hoop.w = currentLevel.width;
  score=0;
  timeLeft=60;
  gameRunning=true;
  gameState = 'playing';
  holdingBall = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.scored = false;
  holdingBall = true;
}

function startNewGame() {
  score = 0;
  timeLeft = levelTime;
  gameState = 'playing';
  message = '';
  messageTimer = 0;
  hoopPhase = 0;
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
  hoopBase = { x: canvas.width * 0.7, y: 200 };
  hoop.h = 8;
  hoop.x = hoopBase.x;
  hoop.y = hoopBase.y;
  if (level.id === 'easy') {
    hoop.w = RIM_WIDTH_EASY;
  } else if (level.id === 'hard') {
    hoop.w = RIM_WIDTH_HARD;
  } else {
    hoop.w = RIM_WIDTH_INSANE;
  }
  // Keep rim thickness consistent with collision checks
  hoop.h = RIM_HEIGHT;
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
btnMenuBack?.addEventListener('click', () => showScreen(screenHome));

btnLevelEasy?.addEventListener('click', () => { setLevel(LEVELS.easy); goGame(); startNewGame(); });
btnLevelHard?.addEventListener('click', () => { setLevel(LEVELS.hard); goGame(); startNewGame(); });
btnLevelInsane?.addEventListener('click', () => { setLevel(LEVELS.insane); goGame(); startNewGame(); });

btnRestart?.addEventListener('click', () => startNewGame());
btnExit?.addEventListener('click', () => goMenu());
btnHomeInGame?.addEventListener('click', () => showScreen(screenHome));

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
// UPDATE
// ---------------------------
function update(dt){
  if(!gameRunning) return;

  timeLeft -= dt;
  if(timeLeft<=0) gameRunning=false;

  hoopPhase+=dt;
  hoop.x = 700 + Math.sin(hoopPhase*currentLevel.speed)*100;

  // Hand follow (holding) + reliable pinch-shoot
  if(handVisible){
    const tx=(1-handX)*canvas.width; // inverted left-right
    const ty=handY*canvas.height;

    const prevLX = lastX;
    const prevLY = lastY;
    lastX += (tx-lastX)*SMOOTHING;
    lastY += (ty-lastY)*SMOOTHING;

    speedX = lastX - prevLX;
    speedY = lastY - prevLY;

    if (holdingBall) {
      ball.x += (tx-ball.x)*0.35;
      ball.y += (ty-ball.y)*0.55;

      const pinchJustStarted = pinch && !prevPinch;
      const speed = Math.hypot(speedX, speedY);

      // Shoot whenever pinch is detected (much less strict)
      if (pinchJustStarted && speed > 1.5) {
        holdingBall = false;
        ballScored = false;

        const maxSide = 18;
        const rawVx = speedX * 1.2;
        ball.vx = Math.max(-maxSide, Math.min(maxSide, rawVx));

        // Always shoot high in an arc (negative y is up)
        let rawVy = speedY * 2.0;
        if (rawVy > -12) rawVy = -18;
        ball.vy = Math.max(-30, Math.min(-12, rawVy));
      }
    }
  }

  // Flight physics only after shooting
  if (!holdingBall) {
    ball.vy += 0.8;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= AIR_FRICTION * 0.985;
    ball.vy *= AIR_FRICTION;

    if (!ball.scored) {
      // Check if ball goes in or hits rim
      const rimY = hoop.y;
      const rimX = hoop.x;
      const rimW = hoop.w;
      const rimH = hoop.h;
      // Ball center
      const bx = ball.x;
      const by = ball.y;
      // Ball goes in (center inside rim area, moving downward)
      const inRim = (by - ball.r < rimY && by + ball.r > rimY && bx > rimX && bx < rimX + rimW && ball.vy > 0);
      // Ball hits rim (edge overlaps rim area)
      const hitsRim = (
        by + ball.r > rimY - rimH/2 && by - ball.r < rimY + rimH/2 &&
        bx + ball.r > rimX && bx - ball.r < rimX + rimW && ball.vy > 0
      );
      // Ball hits backboard outside rim
      const backboardX = rimX + rimW/2 - 70;
      const backboardY = rimY - 60;
      const backboardW = 140;
      const backboardH = 80;
      const hitsBackboard = (
        bx > backboardX && bx < backboardX + backboardW &&
        by > backboardY && by < backboardY + backboardH &&
        !(bx > rimX && bx < rimX + rimW && by > rimY - rimH/2 && by < rimY + rimH/2)
      );
      if ((inRim || hitsRim) && !hitsBackboard) {
        ball.scored = true;
        score += 2;
        message = 'Nice shot!';
        messageTimer = 1.2;
      }
    }

  if(ball.y>FLOOR_Y){
    ball.y = FLOOR_Y;
    ball.vy *= -0.4;
    ball.vx *= 0.85;

    // Reset when it stops bouncing
    if (Math.abs(ball.vy) < 1 && Math.abs(ball.vx) < 0.8) {
      holdingBall = true;
      ball.vx = 0;
      ball.vy = 0;
    }
  }
}

// ---------------------------
// DRAW
// ---------------------------
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ball
  // Better looking ball (shaded + seams)
  const g = ctx.createRadialGradient(
    ball.x - ball.r * 0.35,
    ball.y - ball.r * 0.35,
    ball.r * 0.2,
    ball.x,
    ball.y,
    ball.r
  );
  g.addColorStop(0, '#ffd7b0');
  g.addColorStop(0.35, '#ff9f3a');
  g.addColorStop(1, '#c2410c');

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // outline
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // seams
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

  // hoop (image if loaded; fallback rectangle if not)
  if (hoopImgReady) {
    // Draw centered on hoop.x + hoop.w/2, using hoop.y as the rim line reference
    const cx = hoop.x + hoop.w / 2;
    const imgX = cx - HOOP_IMG_W / 2;
    const imgY = hoop.y - HOOP_RIM_Y_OFFSET;
    ctx.drawImage(hoopImg, imgX, imgY, HOOP_IMG_W, HOOP_IMG_H);
  } else {
    ctx.fillStyle="orange";
    ctx.fillRect(hoop.x,hoop.y,hoop.w,10);
  }

  ctx.fillStyle="white";
  ctx.font = "20px system-ui";
  ctx.fillText("Score: "+score,20,30);
  ctx.fillText("Time: "+Math.ceil(timeLeft),20,60);
}

// ---------------------------
let last=0;
function loop(t){
  const dt=(t-last)/1000;
  last=t;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// ---------------------------
startCamera();
requestAnimationFrame(loop);
showScreen(screenMenu);

btnLevelEasy?.addEventListener('click', () => startGame('easy'));
btnLevelHard?.addEventListener('click', () => startGame('hard'));
btnLevelInsane?.addEventListener('click', () => startGame('insane'));
btnRestart?.addEventListener('click', () => startGame(Object.keys(LEVELS).find(k => LEVELS[k] === currentLevel) || 'easy'));