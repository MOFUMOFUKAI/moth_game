function isLeftKey(key) {
  return key === "ArrowLeft" || key === "a" || key === "A";
}
function isRightKey(key) {
  return key === "ArrowRight" || key === "d" || key === "D";
}

// 回避移動
function dodge(dir) {
  if (!gameStarted || gameOver || isPaused || isDodging) return;
  isDodging = true;
  speedBoost = true;
  playSound(seDodge);
  setInvincible(300);
  player.classList.add("dodging");

  const flare = document.createElement("div");
  flare.className = "dodge-flare";
  player.appendChild(flare);

  const startX = playerX;
  spawnAfterImage(startX);

  for (let i = 0; i < 2; i++) {
    const delta = dir === "ArrowLeft" ? -STEP_PX : STEP_PX;
    const newX = Math.max(0, Math.min(getPlayerMaxX(), playerX + delta));
    if (newX !== playerX) {
      playerX = newX;
      player.style.left = playerX + "px";
      hitbox.style.left = (playerX + 4) + "px";
    }
    if (i === 0) spawnAfterImage(playerX);
  }

  setGameTimeout(() => {
    speedBoost = false;
    isDodging = false;
    player.classList.remove("dodging");
    flare.remove();
  }, 300);
}

// 残像
function spawnAfterImage(xPos){
  const img = document.createElement("div");
  img.className = "afterimage";
  img.style.left = xPos + "px";
  img.style.bottom = "10px";
  img.style.backgroundImage = 'url("assets/images/chr_moth.gif")';
  img.style.backgroundSize = 'cover';
  game.appendChild(img);
  setGameTimeout(() => img.remove(), 100);
}

// 通常移動
function stepMove(dir, scale = 1){
  if (!gameStarted || gameOver || isPaused || enteringName) return;
  const delta = (speedBoost ? playerSpeed * 2 : playerSpeed) * scale;
  const prevX = playerX;

  if (dir === "ArrowLeft")  playerX = Math.max(0, playerX - delta);
  if (dir === "ArrowRight") playerX = Math.min(getPlayerMaxX(), playerX + delta);

  if (playerX !== prevX) {
    player.style.left = playerX + "px";
    hitbox.style.left = (playerX + 4) + "px";
  }
}

// PCキーボード操作
document.addEventListener("keydown", e => {
  if (!gameStarted || gameOver || isPaused || enteringName) return;

  const key = e.key;
  if (isLeftKey(key) || isRightKey(key) || key === "Enter" || key.toLowerCase() === "f") e.preventDefault();
  if (key === "f" || key === "F" || key === "Enter") {
    activateParry();
    return;
  }

  const isLeft  = isLeftKey(key);
  const isRight = isRightKey(key);
  if (!isLeft && !isRight) return;

  const dirKey = isLeft ? "ArrowLeft" : "ArrowRight";

  // 長押しでは dodge 発動しない
  if (!e.repeat) {
    const now = runtimeTime;
    if (lastKey === dirKey && now - lastKeyTime <= DOUBLE_TAP_MS) {
      dodge(dirKey);
      lastKey = "";
    } else {
      lastKey = dirKey;
      lastKeyTime = now;
    }
  }

  keyPressed[dirKey] = true;
});

document.addEventListener("keyup", e => {
  const key = e.key;
  if (isLeftKey(key))  keyPressed["ArrowLeft"] = false;
  if (isRightKey(key)) keyPressed["ArrowRight"] = false;
});

// 通常移動ループ
function getPlayerMaxX() {
  return Math.max(0, game.clientWidth - player.offsetWidth);
}

function continuousMoveLoop(scale = 1) {
  if (!gameStarted || isPaused || gameOver) return;
  if (keyPressed.ArrowLeft) stepMove('ArrowLeft', scale);
  if (keyPressed.ArrowRight) stepMove('ArrowRight', scale);
}

// クリック／タップでパリィ
game.addEventListener("mousedown", event => {
  if (event.target.closest("button")) return;
  if (gameStarted && !gameOver && !isPaused) activateParry();
});
game.addEventListener("touchstart", e => {
  if (e.target.closest("button")) return;
  e.preventDefault();
  if (!gameOver) activateParry();
}, { passive: false });

// タッチ長押しによる移動ループ（スマホ）
function startTouchHold(dirKey) {
  if (!gameStarted || gameOver || isPaused || enteringName) return;
  stopTouchHold();
  isTouchHolding = true;
  keyPressed[dirKey] = true;
}

function stopTouchHold() {
  isTouchHolding = false;
  keyPressed["ArrowLeft"] = false;
  keyPressed["ArrowRight"] = false;
}

// 🔁 ダブルタップ＆通常移動の兼用処理（スマホ用）
function handleTap(dirKey) {
  if (!gameStarted || gameOver || isPaused || enteringName) return;
  const now = runtimeTime;
  if (isTouchHolding) return; // 押しっぱ中はダブルタップ無視

  if (lastKey === dirKey && now - lastKeyTime <= DOUBLE_TAP_MS) {
    dodge(dirKey); // 2連打で回避移動
    lastKey = "";
  } else {
    lastKey = dirKey;
    lastKeyTime = now;
    stepMove(dirKey); // 通常移動1ステップ
  }
}

// 左ボタン（タッチ）
btnLeft.addEventListener("touchstart", e => {
  e.preventDefault();
  handleTap("ArrowLeft");
  startTouchHold("ArrowLeft");
}, { passive: false });

btnLeft.addEventListener("touchend", e => {
  e.preventDefault();
  stopTouchHold();
}, { passive: false });

btnLeft.addEventListener("touchcancel", stopTouchHold);

// 右ボタン（タッチ）
btnRight.addEventListener("touchstart", e => {
  e.preventDefault();
  handleTap("ArrowRight");
  startTouchHold("ArrowRight");
}, { passive: false });

btnRight.addEventListener("touchend", e => {
  e.preventDefault();
  stopTouchHold();
}, { passive: false });

btnRight.addEventListener("touchcancel", stopTouchHold);

// パリィボタン（タッチ）
btnParry.addEventListener("touchstart", e => {
  e.preventDefault();
  activateParry();
}, { passive: false });


window.addEventListener('resize', () => {
  playerX = Math.min(playerX, getPlayerMaxX());
  player.style.left = playerX + 'px';
  hitbox.style.left = (playerX + 4) + 'px';
});
