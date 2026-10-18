// One animation loop owns gameplay time and all gameplay timers.
// Audio fades use real-time timers and are cancelled at lifecycle boundaries.
let runtimeTime = 0;
let runtimePreviousTime = null;
let nextGameTimerId = 1;
const gameTimers = new Map();

function setGameTimeout(callback, delay = 0) {
  const id = nextGameTimerId++;
  gameTimers.set(id, { callback, due: runtimeTime + Math.max(0, delay), interval: 0 });
  return id;
}

function setGameInterval(callback, delay) {
  const id = nextGameTimerId++;
  const interval = Math.max(1, delay);
  gameTimers.set(id, { callback, due: runtimeTime + interval, interval });
  return id;
}

// Motion runs once per displayed frame, rather than replaying several stale
// positions after a stall. The callback receives elapsed gameplay milliseconds.
function setGameFrameUpdate(callback, phase = 0) {
  const id = nextGameTimerId++;
  gameTimers.set(id, { callback, frame: true, phase, previousTime: runtimeTime });
  return id;
}

function clearGameTimer(id) {
  gameTimers.delete(id);
}

function resetGameRuntime() {
  gameTimers.clear();
  runtimeTime = 0;
  runtimePreviousTime = performance.now();
}

function runGameTimers() {
  const timers = [...gameTimers];
  for (const [id, timer] of timers) {
    if (timer.frame) continue;
    if (!gameTimers.has(id) || timer.due > runtimeTime) continue;
    if (!timer.interval) {
      gameTimers.delete(id);
      timer.callback();
      continue;
    }
    // Bounded catch-up for non-motion periodic work (score, popups, etc.).
    let steps = 0;
    while (gameTimers.has(id) && timer.due <= runtimeTime && steps++ < 8) {
      timer.due += timer.interval;
      timer.callback();
    }
    if (gameTimers.has(id) && timer.due <= runtimeTime) {
      timer.due = runtimeTime + timer.interval;
    }
  }
  // Falling enemies (phase 0) must update before reflected shots (phase 1),
  // including enemies spawned after a shot was reflected.
  const motion = timers.filter(([, timer]) => timer.frame)
    .sort((a, b) => a[1].phase - b[1].phase);
  for (const [id, timer] of motion) {
    if (!gameTimers.has(id)) continue;
    const elapsed = runtimeTime - timer.previousTime;
    timer.previousTime = runtimeTime;
    if (elapsed > 0) timer.callback(elapsed);
  }
}

function runtimeFrame(now) {
  const elapsed = runtimePreviousTime === null ? 0 : Math.max(0, now - runtimePreviousTime);
  runtimePreviousTime = now;
  if (!isPaused) {
    runtimeTime += elapsed;
    const playing = gameStarted && !gameOver;
    if (playing) beginCollisionFrame();
    try {
      if (gameStarted && !gameOver) {
        gameTime += elapsed;
        const scale = Math.min(elapsed, 50) / (1000 / 60);
        continuousMoveLoop(scale);
        scrollBackground(scale);
      }
      runGameTimers();
      if (gameStarted && !gameOver) {
        updateEnemyAnimations();
        updateAtlasEffects();
        updateMothAnimation();
      }
    } finally {
      if (playing) endCollisionFrame();
    }
  }
  requestAnimationFrame(runtimeFrame);
}

requestAnimationFrame(runtimeFrame);
