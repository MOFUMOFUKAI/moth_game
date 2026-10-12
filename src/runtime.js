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

function clearGameTimer(id) {
  gameTimers.delete(id);
}

function resetGameRuntime() {
  gameTimers.clear();
  runtimeTime = 0;
  runtimePreviousTime = performance.now();
}

function runGameTimers() {
  for (const [id, timer] of [...gameTimers]) {
    if (!gameTimers.has(id) || timer.due > runtimeTime) continue;
    if (!timer.interval) {
      gameTimers.delete(id);
      timer.callback();
      continue;
    }
    // Preserve the old 30ms physics cadence, with bounded catch-up after a stall.
    let steps = 0;
    while (gameTimers.has(id) && timer.due <= runtimeTime && steps++ < 8) {
      timer.due += timer.interval;
      timer.callback();
    }
    if (gameTimers.has(id) && timer.due <= runtimeTime) {
      timer.due = runtimeTime + timer.interval;
    }
  }
}

function runtimeFrame(now) {
  const elapsed = runtimePreviousTime === null ? 0 : Math.max(0, now - runtimePreviousTime);
  runtimePreviousTime = now;
  if (!isPaused) {
    runtimeTime += elapsed;
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
    }
  }
  requestAnimationFrame(runtimeFrame);
}

requestAnimationFrame(runtimeFrame);
