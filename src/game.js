/* =======================================================
   ▼ ゲーム定数・設定値
   ======================================================= */
  const game = document.getElementById("game");
  const player = document.getElementById("player");
  const hitbox = document.getElementById("hitbox");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const timeEl = document.getElementById("time");
  const levelEl = document.getElementById("level");
  const maxLevel = 7;
  const expEl = document.getElementById("exp");
  const normalParryRadius = 55;
  const PARRY_COOLDOWN = 380; // クールダウン時間 [ms]
  const ENABLE_RAINBOW_VISUAL = false; // 比較用：trueで虹色演出を戻す。ジャストの性能は変更しない。
  const gameClear = document.getElementById("gameClear");

  const timeRatingEl = document.getElementById("timeRating");
  const restartButton = document.getElementById("restartButton");
  const seParry = document.getElementById("seParry");
  const seBombL = document.getElementById("seBombL");
  const seBombS = document.getElementById("seBombS");
  const seDodge = document.getElementById("seDodge");
  const seItem = document.getElementById("seItem");
  const seJustParry = document.getElementById("seJustParry");
  const seScream = document.getElementById("seScream");
  const allObstacles = [];
  const btnLeft  = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  const btnParry = document.getElementById("btnParry");
  const titleScreen = document.getElementById("titleScreen");
  const availableChars = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.!*@#?<> "];
    // ▼ ハイスコア保存用ロジック（localStorage使用）
  const HIGH_SCORE_KEY = "yamamayu_high_scores";
  const defaultHighScores = [
    { name: "MOTH", score: 400000, rating: "SS" },
    { name: "LMNG", score: 350000, rating: "S" },
    { name: "KAIK", score: 300000, rating: "A" },
    { name: "YMMY", score: 250000, rating: "B" },
    { name: "OOMZ", score: 200000, rating: "C" }
  ];
  const bgm = {
     Stage1: document.getElementById("bgm_stage1"),
     Stage2: document.getElementById("bgm_stage2"),
     Stage3: document.getElementById("bgm_stage3"),
     Final:  document.getElementById("bgm_final"),
     Final2: document.getElementById("bgm_final2"),
     Result: document.getElementById("bgm_result")
   };

 /* =======================================================
    ▼ ゲーム進行状態（変化する値）
   ======================================================= */
  let score = 0;
  let lives = 3;
  let maxLives = 3;
  let gameOver = false;
  let invincible = false;
  let parryActive = false;
  let justParry = false;
  let playerX = 180;
  let playerSpeed = 3;
  let obstacleSpeed = 15;  // 障害物の速度
  let gameTime = 0;  // 経過時間（ミリ秒）

  let scoreUpdateInterval;
  let timeUpdateInterval;
  let lastScoreUpdateTime = 0;  // 最後にスコアを更新したミリ秒

  let justParryRadius = 40;  // Lv.1 初期値（最大52まで上昇）
  let parryGauge = 0;
  let level = 1;
  let exp = 0;
  let stage = 1;
  let lastParryTime   = 0;   // 前回パリィを打ったタイムスタンプ
  let firstInteraction = false;
  let currentBGM = null;
  let gameStarted = false;
  let baseInterval   = 800;  // ★ 現在の間隔（初期 800ms）

  let obstacleSpawnInterval = null;
  let itemFallTimers = []; // 💡 すべての落下アイテムの fall ID をここに記録
  let isPaused = false;

  let superInvincible = false;
  let orb1, orb2;
  let lastKey        = "";      // 直前の方向キー
  let lastKeyTime    = 0;       // 押下タイムスタンプ
  let isDodging      = false;   // 回避モーション中
  let speedBoost     = false;   // 回避後 0.3 s だけ 2 倍速
  let keyPressed = {};  // 押下中かどうか
  let lastExplosionTime = 0;
  let isTouchHolding = false;
  // ==== Combo System Globals ====
  let currentComboCount = 0;        // 今のヒット数（2以上から）
  let comboInProgress = false;      // コンボ中か
  let comboLastUpdateTime = 0;      // 最後のヒット時刻（ミリ秒）
  let comboReflectedCount = 0;      // 現在アクティブな反射弾の数
  let comboBonusGiven = false;      // ボーナスが既に表示されたか
  let comboWatcherStarted = false;  // ✅ ← これを忘れずに追加
  let comboEndTimeout = null;

  // ハイスコア取得
function loadHighScores() {
  try {
    const json = localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = json ? JSON.parse(json) : defaultHighScores;
    if (!Array.isArray(parsed)) throw new Error('Invalid high scores');
    const coefficients = { V: 4.4, SS: 4, S: 3.6, A: 3.2, B: 2.8, C: 2.4, D: 2, E: 1.6 };
    return parsed.filter(entry => entry && typeof entry.name === 'string' &&
      Number.isFinite(entry.score) && entry.score >= 0 && Object.hasOwn(coefficients, entry.rating))
      .map(entry => ({ name: entry.name.slice(0, 4), score: entry.score, rating: entry.rating }))
      .sort((a, b) => b.score * coefficients[b.rating] - a.score * coefficients[a.rating]).slice(0, 5);
  } catch (error) {
    console.warn('ハイスコアを読み込めません。初期値を使用します。', error);
    return defaultHighScores.map(entry => ({ ...entry }));
  }
}

  // ハイスコア保存
  function saveHighScores(highScores) {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
    } catch (error) {
      console.warn('ハイスコアを保存できません。このプレイ中の記録は保持します。', error);
    }
  }

  // 現在のハイスコア（5件以内）を保持
  let highScores = loadHighScores();
  let enteringName = false;
  let nameChars = ["A", "A", "A", "A"];
  let namePos = 0;

  const ratingCoefficients = {
    "V": 4.4,
    "SS": 4.0,
    "S": 3.6,
    "A": 3.2,
    "B": 2.8,
    "C": 2.4,
    "D": 2.0,
    "E": 1.6
  };

  const DOUBLE_TAP_MS = 200;    // 0.2 秒以内
  const STEP_PX       = 30;     // 1 ステップ距離


/* =======================================================
   ▼ ゲーム開始／再スタート処理（BGMフェードイン対応）
   ======================================================= */
/* =======================================================
   ▼ 背景スクロール速度
   ======================================================= */
let backgroundOffset = 0;
let scrollSpeed = 0.2; // ステージごとに変化する基本速度（初期値）

function scrollBackground(scale = 1) {
  // スコアに応じた加速処理
  let extraSpeed = 0;
  if (score >= 300000) {
    const steps = Math.floor((score - 300000) / 150000) + 1;
    extraSpeed = Math.min(steps, 7); // 最大加速は +7.0 まで
  }

  // 背景スクロール処理
  backgroundOffset = (backgroundOffset + (scrollSpeed + extraSpeed) * scale) % 100000;
  const bg = document.getElementById("background");
  if (bg) {
    bg.style.backgroundPositionY = `${backgroundOffset}px`;
  }


}

// ステージごとの基本スクロール速度を設定（ゲーム開始・進行時に呼び出し）
function setStageBackgroundSpeed(stage) {
  if (stage === 1) scrollSpeed = 0.3;
  else if (stage === 2) scrollSpeed = 0.5;
  else if (stage === 3) scrollSpeed = 0.8;
  else if (stage === 4) scrollSpeed = 2.0;
  else if (stage === 5) scrollSpeed = 2.0; // ステージ4と同じ速度を維持
}

/* =======================================================
   ▼ 背景 クロスフェード付きステージ管理
   ======================================================= */

/** 背景‐BGM クロスフェードの所要時間（ms） */
const FADE_MS = 1500;          // ←BGM の crossfadeBGM() と揃えています

/**
 * 暗転 → 背景画像切替 → 明転
 * @param {number} nextStage 1〜5
 */
function crossfadeBackground(nextStage){
  const bg    = document.getElementById("background");
  const darken = document.getElementById("bgDarkenLayer");

  // 暗くする
  darken.style.opacity = 1;

  setGameTimeout(() => {
    // 背景画像切替（暗いまま切り替え）
    bg.style.backgroundImage = `url(assets/images/env_stage${nextStage}.webp)`;

    // 明るく戻す
    darken.style.opacity = 0;
  }, FADE_MS / 2);
}

/* =======================================================
   ▼ 背景情報更新
   ======================================================= */
function updateBackgroundInstant(stageNum) {
  const bg = document.getElementById("background");

  // 背景画像を即時切替
  bg.style.backgroundImage = `url(assets/images/env_stage${stageNum}.webp)`;

  // 必要な初期スタイル再設定（念のためリセット）
  bg.style.backgroundRepeat = "repeat-y";
  bg.style.backgroundSize = "100% auto";
  bg.style.backgroundPositionY = `${backgroundOffset}px`; // スクロール位置に合わせる
}
/* ──────────────────────────────────────────────
     ステージ判定 &  ビジュアル/BGM 同期クロスフェード
   ────────────────────────────────────────────── */
function checkStage() {
  const prevStage = stage;

  // スコアに応じたステージ更新
  stage =
    score >= 600000 ? 5 :
    score >= 250000 ? 4 :
    score >= 150000 ? 3 :
    score >=  75000 ? 2 : 1;

  if (stage !== prevStage) {
    crossfadeBackground(stage);
    setStageBackgroundSpeed(stage);

    const newBGM =
      stage === 5 ? bgm.Final2 :
      [bgm.Stage1, bgm.Stage2, bgm.Stage3, bgm.Final][stage - 1];

    const oldBGM = currentBGM; // ← 旧曲を一時保存

    // 曲が変わっていればクロスフェード、初回や同一なら fadeIn
    if (oldBGM && oldBGM !== newBGM && !oldBGM.paused && oldBGM.currentTime > 0) {
      crossfadeBGM(oldBGM, newBGM, FADE_MS);
    } else {
      fadeInBGM(newBGM, FADE_MS);
    }

    currentBGM = newBGM; // 最後に更新！

    const musicTitles = {
      1: "♪Starlight Vanguard",
      2: "♪Brave Ascent",
      3: "♪Voidborne Resolve",
      4: "♪Burn the Void",
      5: "♪Beyond the Edge"
    };
    showMusicTitle(musicTitles[stage]);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nameEntryScreen").style.display = "none";
  enteringName = false;
  window.newHighScore = null;

  displayTopHighScore();
});
/* =======================================================
   ▼ メインゲーム開始処理
   ======================================================= */
function startGame() {
  if (enteringName) return; // ← ハイスコア名入力中なら無効化
  if (!gameOver && firstInteraction) return;
  firstInteraction = true;
  window.removeEventListener("mousedown", startGame);
  window.removeEventListener("keydown", startGame);
  resetGameRuntime();
  clearAtlasEffects();
  cancelAudioFades();
  stopTouchHold();
  keyPressed = {};
  isPaused = false;


  justParryRadius = 40;
  playerX = Math.min(180, getPlayerMaxX());
  player.style.left = playerX + 'px';
  hitbox.style.left = (playerX + 4) + 'px';
  player.style.opacity = '1';
  player.classList.remove('dodging');
  player.querySelectorAll('.invincible-orb, .dodge-flare').forEach(el => el.remove());
  invincible = false;
  superInvincible = false;
  isDodging = false;
  resetMothAnimation();
  speedBoost = false;
  parryActive = false;
  justParry = false;
  lastParryTime = -PARRY_COOLDOWN;
  lastKey = '';
  lastKeyTime = -DOUBLE_TAP_MS;
  lastExplosionTime = -50;
  currentComboCount = 0;
  comboInProgress = false;
  comboReflectedCount = 0;
  comboBonusGiven = false;
  comboEndTimeout = null;
  comboWatcherStarted = false;
  itemFallTimers = [];
  invincibleTimer = null;
  superInvincibleTimer = null;
  invincibleUntil = 0;
  game.querySelectorAll('[data-transient], .heal, .feather, .afterimage, #gameOverText, #comboText').forEach(el => el.remove());
  timeRatingEl.classList.remove('void-rank');
  timeRatingEl.parentElement.querySelectorAll('.void-subtext').forEach(el => el.remove());
  pauseOverlay.style.display = 'none';
  resumeButton.style.display = 'none';
  enteringName = false;
  window.newHighScore = null;

  // タイトル画面非表示
  const titleScreen = document.getElementById("titleScreen");
  displayTopHighScore(); // ← 先に表示する（非表示にする前！）
  if (titleScreen) {
    titleScreen.style.display = "none";
    document.getElementById("moveInstruction").style.display = "none";
    document.getElementById("parryInstruction").style.display = "none";
  }

  [...allObstacles].forEach(removeObstacle);
  allObstacles.length = 0;


  /* ★★★★★ ここから音量プリセット ★★★★★ */
  const BGM_VOLUME = 0.8;
  const SE_VOLUME  = 0.8;

  [seParry, seDodge, seBombL, seBombS, seItem, seJustParry, seScream].forEach(se => se.volume = SE_VOLUME);

  [bgm.Stage1, bgm.Stage2, bgm.Stage3, bgm.Final, bgm.Final2, bgm.Result].forEach(bgm => {
    bgm.dataset.targetVolume = BGM_VOLUME;
  });
  /* ★★★★★ ここまで音量プリセット ★★★★★ */

  // スクロール速度とオフセット・レベル・経験値などを初期化
  level = 1;
  exp = 0;
  maxLives = 3;
  lives = maxLives;
  playerSpeed = 3;
  scrollSpeed = 0.3;
  backgroundOffset = 0;

  setStageBackgroundSpeed(1);
  updateBackgroundInstant(1);

  // 変数初期化
  gameOver = false;
  gameStarted = true;
  score = 0;

  lastScoreUpdateTime = 0;
  gameTime = 0;
  resetObstacleSpawn();

  // BGM 初期化と再生
  [bgm.Stage1, bgm.Stage2, bgm.Stage3, bgm.Final, bgm.Final2, bgm.Result].forEach(bgm => {
    bgm.pause();
    bgm.currentTime = 0;
    bgm.volume = 0;
  });

  stage = 0;
//currentBGM = null;
  checkStage();

  // UI 初期化
  gameClear.style.display = "none";
  restartButton.style.display = "none";
  //exitButton.style.display = "none"; // ← コメントアウト済みなら有効化してOK
  pauseButton.style.display = "inline";
  updateUI();

  // タイマー再設定

  clearGameTimer(scoreUpdateInterval);
  clearGameTimer(timeUpdateInterval);

  scoreUpdateInterval = setGameInterval(updateScore, 100);
  timeUpdateInterval = setGameInterval(updateTime, 100);
  setGameInterval(spawnPeriodicItems, 2500);

  // 🔁 ステップ⑤：コンボ監視ループ（1回だけ実行）
  if (!comboWatcherStarted) {
    comboWatcherStarted = true;
    setGameInterval(() => {
      if (!comboInProgress) return;

      const now = runtimeTime;
      if (comboReflectedCount <= 0 && now - comboLastUpdateTime > 300) {
        finishComboBonus();
      }
    }, 100);
  }
}

// 最初の入力で起動
window.addEventListener("mousedown", startGame, { once: true });
window.addEventListener("keydown",   startGame, { once: true });
restartButton.addEventListener('click', event => {
  event.stopPropagation();
  startGame();
});

// 再スタートボタン処理

// 再スタートボタン処理（スマホ対応）← 追加
restartButton.addEventListener("touchstart", (e) => {
  e.stopPropagation();
  e.preventDefault(); // iOSでのフォーカス・選択など防止
  startGame();
});

// タイトル画面：スマホ対応
titleScreen.addEventListener("touchstart", () => {
  if (!gameStarted && !enteringName) startGame();  // ← enteringName を追加
});
/* =======================================================
   ▼ ゲーム終了スマホ対応
   ======================================================= */

/* =======================================================
   ▼ ポーズ機能処理
   ======================================================= */
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const pauseOverlay = document.getElementById('pauseOverlay');

function pauseGame() {
  if (!gameStarted || gameOver || isPaused) return;
  isPaused = true;

  stopTouchHold();
  keyPressed = {};
  cancelAudioFades();
  Object.values(bgm).forEach(audio => audio.pause());
  pauseOverlay.style.display = 'block';
  pauseButton.style.display = 'none';
  resumeButton.style.display = 'inline';
}

function resumeGame() {
  if (!gameStarted || gameOver || !isPaused || document.hidden) return;

  isPaused = false;
  runtimePreviousTime = performance.now();
  if (currentBGM) {
    currentBGM.volume = Number(currentBGM.dataset.targetVolume || 0.8);
    currentBGM.play().catch(error => console.warn('BGM再開失敗:', error));
  }
  pauseOverlay.style.display = 'none';
  pauseButton.style.display = 'inline';
  resumeButton.style.display = 'none';
}

pauseButton.addEventListener('click', pauseGame);
resumeButton.addEventListener('click', resumeGame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});
window.addEventListener('blur', () => {
  stopTouchHold();
  keyPressed = {};
  pauseGame();
});

/* =======================================================
   ▼ スコアによる障害物発生増加
   ======================================================= */
function updateObstacleIntervalByScore(score) {
  const newInterval = Math.max(200, 800 - Math.floor(score / 220000) * 200);
  if (newInterval !== baseInterval) {

    baseInterval = newInterval;
    resetObstacleSpawn();
  }
}

/* =======================================================
   ▼ 障害物作成リセット処理
   ======================================================= */
function resetObstacleSpawn() {
  if (obstacleSpawnInterval !== null) {
    clearGameTimer(obstacleSpawnInterval);
  }

  obstacleSpawnInterval = setGameInterval(() => {
    if (gameStarted && !gameOver && !isPaused) createObstacle();
  }, baseInterval);
}

/* =======================================================
   ▼ 障害物作成処理
   ======================================================= */
const OBSTACLE_SIZES = Object.freeze({ small: 60, big: 92, huge: 172 });

function createObstacle() {
  if (!gameStarted || gameOver || isPaused) return;
  const item = document.createElement("div");
  item.classList.add("obstacle");

  let sizeOption;
  let colorClass = "";
  let fallSpeed;

  // speedScaleの計算
  let speedScale = 1.0;
  if (score >= 250000) {
    const additionalScale = Math.min(Math.floor(score / 150000) * 1.2, 7.0);
    speedScale += additionalScale;
  }
  speedScale = Math.min(speedScale, 8.0);

  // ステージ別内容
  if (stage === 1) {
    sizeOption = Math.random() < 0.6 ? "small" : "big";
    colorClass = "red";
    fallSpeed = sizeOption === "small" ? 4 * speedScale : 3 * speedScale;
  } else if (stage === 2) {
    sizeOption = Math.random() < 0.7 ? "small" : "big";
    colorClass = "blue";
    fallSpeed = sizeOption === "small" ? 4 * speedScale : 5 * speedScale;
  } else if (stage === 3) {
    sizeOption = Math.random() < 0.8 ? "big" : "huge";
    colorClass = "green";
    fallSpeed = sizeOption === "big" ? 5 * speedScale : 2 * speedScale;
  } else if (stage === 4 || stage === 5) {
    const randomChoice = Math.random();
    if (randomChoice < 0.3) {
      sizeOption = "huge";
      colorClass = "red";
      fallSpeed = 3 * speedScale;
    } else if (randomChoice < 0.4) {
      sizeOption = "huge";
      colorClass = "blue";
      fallSpeed = 2 * speedScale;
    } else {
      sizeOption = "small";
      colorClass = "green";
      fallSpeed = 6 * speedScale;
    }
    item.classList.add("stage4");
  }

  // 表示設定
  item.style.backgroundSize = "cover";
  item.style.backgroundRepeat = "no-repeat";
  item.style.backgroundPosition = "center";
  item.style.pointerEvents = "none";

  // サイズとヒットボックス
  const dimension = OBSTACLE_SIZES[sizeOption];
  item.style.width = dimension + "px";
  item.style.height = dimension + "px";
  if (!initializeEnemyAnimation(item, sizeOption, colorClass, dimension)) {
    throw new Error('Missing enemy animation: ' + sizeOption + ':' + colorClass);
  }
  item.dataset.hitboxW = dimension;
  item.dataset.hitboxH = dimension;

  item.style.backgroundColor = "transparent";
  item.dataset.hp = sizeOption === "small" ? 1 : sizeOption === "big" ? 2 : 3;
  item.dataset.type = "damage";
  item.dataset.stage = stage;
  item.dataset.size = sizeOption;
  item.dataset.color = colorClass;
  item.classList.add("obstacle");

  // 位置設定
  item.style.left = randomSpawnX(dimension) + "px";
  item.style.top = "0px";
  item.style.position = "absolute";

  game.appendChild(item);
  allObstacles.push(item);

  let y = 0;
  const fall = setGameInterval(() => {
    if (gameOver || !item.parentElement) return clearGameTimer(fall);
    if (isPaused) return;
    item.previousY = y;
    y += fallSpeed;
    item.style.top = y + "px";

    const playerRect = getCollisionRect(hitbox);
    const itemRect = getAdjustedRect(item);

    if (checkCollision(playerRect, itemRect)) {
      if (!invincible && !superInvincible) {
        const dmg = parseInt(item.dataset.hp);
        lives -= dmg;

        // 🎧 被弾SE再生
        if (seScream) {
          const s = seScream.cloneNode(true);
          s.volume = seScream.volume;
          s.play().catch(e => console.warn("SE再生失敗:", e));
        }

        if (lives <= 0) { endGame(); return; }
        setInvincible();
      }
      removeObstacle(item);
      updateUI();
      clearGameTimer(fall);
      return;
    }

    if (y > getGameHeight()) {
      removeObstacle(item);
      clearGameTimer(fall);
    }
  }, 30);

  // 🔄 落下用IDを保存（反射時に clear するため）
  item.fallInterval = fall;
}

/* =======================================================
   ▼ アイテム生成と落下処理本体
   ======================================================= */
const FALLING_ITEMS = {
    heart: {
      emoji: "💗",
      speed: 5,
      condition: () => lives < maxLives && Math.random() < 0.10,
      onCollect: () => {
        lives = Math.min(lives + 1, maxLives);
        updateUI();
      }
    },
    goldHeart: {
      emoji: "💛",
      speed: 8,
      condition: () => lives <= 1 && Math.random() < 0.05,
      onCollect: () => {
        lives = maxLives;
        updateUI();
      }
    },
    lemon: {
      emoji: "🍋",
      speed: 5,
      condition: () => level < maxLevel && lives === maxLives && Math.random() < 0.05,
      onCollect: (x, y) => {
        const scoreAdd = 10000, expAdd = 300;
        createExplosion(x, y, scoreAdd, false, true, expAdd);
        score += scoreAdd;
        addExp(expAdd);
        updateUI();
      }
    },
    grape: {
      emoji: "🍇",
      speed: 5,
      condition: () => level >= maxLevel && Math.random() < 0.05,
      onCollect: (x, y) => {
        createExplosion(x, y, 15000, false, true);
        score += 15000;
        updateUI();
        setSuperInvincible(15000);
      }
    }
  };

function spawnFallingItem(type) {
  const itemData = FALLING_ITEMS[type];
  if (!itemData || !itemData.condition() || gameOver || isPaused) return;

  const el = document.createElement("div");
  el.classList.add("heal"); // 共通クラス名（削除時に一括指定可能）
  el.textContent = itemData.emoji;
  el.style.left = randomSpawnX(40) + "px";
  el.style.top = "0px";
  game.appendChild(el);

  let y = 0;

  const fall = setGameInterval(() => {
    if (gameOver || !el.parentElement) return clearFall();
    if (isPaused) return;

    y += itemData.speed;
    el.style.top = y + "px";

    const itemRect = getCollisionRect(el);
    const playerRect = getCollisionRect(hitbox);
    const gameRect = getCollisionRect(game);
    const centerX = itemRect.left + itemRect.width / 2 - gameRect.left;
    const centerY = itemRect.top + itemRect.height / 2 - gameRect.top;

    // プレイヤーと衝突
    if (checkCollision(itemRect, playerRect)) {
      el.remove();
      clearFall();
      if (seItem) {
        seItem.currentTime = 0;
        seItem.play().catch(e => console.warn("SE error:", e));
      }
      itemData.onCollect?.(centerX, centerY);
      return;
    }

    // 画面外に出たら削除
    if (y > getGameHeight()) {
      el.remove();
      clearFall();
    }
  }, 30);

  itemFallTimers.push(fall);

  // 安全にタイマー解除＋リストから削除
  function clearFall() {
    clearGameTimer(fall);
    itemFallTimers = itemFallTimers.filter(id => id !== fall);
  }
}
/* =======================================================
   ▼ ハート/レモン/グレープ生成の元コード置き換え
   ======================================================= */
function maybeSpawnHeart() {
  spawnFallingItem("goldHeart");
  spawnFallingItem("heart");
}
function maybeSpawnLemon() {
  spawnFallingItem("lemon");
}
function maybeSpawnGrape() {
  spawnFallingItem("grape");
}
/* =======================================================
   ▼ アイテム取得SE
   ======================================================= */


/* =======================================================
   ▼ ステージ進行
   ======================================================= */


/* =======================================================
   ▼ プレイヤー行動処理
   ======================================================= */
// 共通ヘルパー
/* ★★★★★★★★★★  入力ハンドラここまで  ★★★★★★★★★★ */

  // タイムの更新（ミリ秒単位）
  function updateTime() {
    if (isPaused) return;
    if (gameOver) return; // ゲームオーバー時にはタイム更新しない
    // The runtime advances gameTime only while gameplay is active.
    timeEl.textContent = `タイム: ${(gameTime / 1000).toFixed(3)}秒`;  // 小数点以下3桁で表示

      // 👇 ここにもログを追加
//console.log("🕒 タイム進行中 gameTime =", gameTime);
  }

// スコアの更新 ─ 100ms ごとに +10 加算し整数で表示 & ステージ/BGM 判定も実施
function updateScore() {
  if (isPaused) return;
  if (gameOver) return;                       // ゲームオーバー中は更新しない

  const elapsed = gameTime;     // 経過ミリ秒
  const tick    = Math.floor(elapsed / 100);  // 100ms 単位のカウンタ

  // 100ms 進んだらスコア加算
  if (tick > lastScoreUpdateTime) {
    score += (tick - lastScoreUpdateTime) * 10;
    lastScoreUpdateTime = tick;

    /* ▼ ここでステージ切り替え & BGM クロスフェードを判定 */
    if (typeof checkStage === "function") {
      checkStage();   // ← 事前に追加した checkStage() を呼ぶ
    }

    // UI 反映（小数点以下なし）
    scoreEl.textContent = "スコア: " + Math.floor(score);
    updateObstacleIntervalByScore(score);
  }
}

/* =======================================================
   ▼ パリィ/ジャストパリィ
   ======================================================= */
function activateParry() {
  if (!gameStarted || gameOver || isPaused) return;
  if (parryActive || runtimeTime - lastParryTime < PARRY_COOLDOWN) return;
  lastParryTime = runtimeTime;

  seParry.currentTime = 0;
  seParry.play().catch(error => console.warn('SE再生失敗:', error));
  setInvincible(350); // 通常パリィでも一瞬無敵を付与

  parryActive = true;
  justParry = false;

  // 通常パリィエフェクト（半径55px, サイズ112×112）
  const effect = createAtlasEffect(PARRY_ANIMATION,
    player.offsetLeft + player.offsetWidth / 2 - 56,
    player.offsetTop + player.offsetHeight / 2 - 56, 112, 350);

  // 5フレーム分パリィ判定を持続
  let frameCount = 0;
  function checkParryFrame() {
    if (!gameStarted || gameOver || isPaused) return;
    frameCount++;
    const pRect = getCollisionRect(player);
    const pcx = (pRect.left + pRect.right) / 2;
    const pcy = (pRect.top + pRect.bottom) / 2;

    for (let i = 0; i < allObstacles.length; i++) {
      const obs = allObstacles[i];
      if (!obs || !obs.parentElement || obs.dataset.type !== "damage") continue;

      const oRect = getAdjustedRect(obs);
      const dx = Math.max(oRect.left - pcx, 0, pcx - oRect.right);
      const dy = Math.max(oRect.top - pcy, 0, pcy - oRect.bottom);
      const dist = Math.hypot(dx, dy);

      if (dist <= justParryRadius) {
        justParry = true;
        removeAtlasEffect(effect); // 通常パリィエフェクト削除
        reflectObstacle(obs, true); // 🌈ジャストパリィ反射
        setInvincible(200);         // 🌈無敵延長
        showJustParry();            // 🌈ジャスト演出（エフェクト＋SE）
        return;
      } else if (dist <= normalParryRadius) {
        reflectObstacle(obs, false); // 通常反射
        return;
      }
    }

    if (frameCount < 5) {
      setGameTimeout(checkParryFrame, 1000 / 60);
    }
  }
  setGameTimeout(checkParryFrame, 1000 / 60);

  setGameTimeout(() => {
    parryActive = false;
    justParry = false;
  }, PARRY_COOLDOWN);
}

/* =======================================================
   ▼ ジャストパリィエフェクト表示
   ======================================================= */
function showJustParry() {
  if (!gameStarted || gameOver || isPaused) return;
  createAtlasEffect(JUST_PARRY_ANIMATION,
    player.offsetLeft + player.offsetWidth / 2 - 30,
    player.offsetTop + player.offsetHeight / 2 - 30, 60, 580);

  if (seJustParry) {
    seJustParry.currentTime = 0;
    seJustParry.play().catch(e => console.warn("JustParry音再生失敗:", e));
  }

}

/* =======================================================
   ▼ 被ダメージ時の半透明処理
   ======================================================= */
let invincibleTimer = null;
let invincibleUntil = 0;
function setInvincible(duration = 1000) {
  invincibleUntil = Math.max(invincibleUntil, runtimeTime + duration);
  invincible = true;
  player.style.opacity = '0.5';
  clearGameTimer(invincibleTimer);
  invincibleTimer = setGameTimeout(() => {
    invincible = false;
    player.style.opacity = '1';
  }, invincibleUntil - runtimeTime);
}

/* =======================================================
   ▼ 無敵処理
   ======================================================= */
let superInvincibleTimer = null;
function setSuperInvincible(duration = 15000) {
  clearGameTimer(superInvincibleTimer);
  superInvincible = true;
  if (!orb1 || !orb1.parentElement) {
    orb1 = document.createElement('div');
    orb2 = document.createElement('div');
    orb1.className = 'invincible-orb orb1';
    orb2.className = 'invincible-orb orb2';
    player.appendChild(orb1);
    player.appendChild(orb2);
  }
  superInvincibleTimer = setGameTimeout(() => {
    superInvincible = false;
    orb1?.remove();
    orb2?.remove();
    orb1 = orb2 = null;
  }, duration);
}

/* =======================================================
   ▼ 爆発発生処理
   ======================================================= */
function createExplosion(x, y, scoreValue = 0, isJust = false, noExplosion = false, expValue = 0) {
  // ---------- 爆発エフェクト ----------
  if (!noExplosion) {
    const explosion = createAtlasEffect(BOMB_L_ANIMATION, x, y, 100, 400);
    explosion.style.transform = "translate(-50%, -50%)";
    explosion.style.zIndex = "10";
      // 🔊 爆発音を再生
  if (seBombL) {
    seBombL.currentTime = 0;
    playSound(seBombL);
  }

  }

  // ---------- スコア + 経験値表示 ----------
  if (scoreValue > 0) {
    const scoreText = document.createElement("div");
    scoreText.textContent = `+${scoreValue}${expValue > 0 ? `\nEXP+${expValue}` : ""}`;
    scoreText.style.position = "absolute";
    scoreText.style.left = x + "px";       // ← 余計な +20 削除
    scoreText.style.top  = (y - 10) + "px";
    scoreText.style.fontSize = "12px";     // ← 一段階小さく
    scoreText.style.fontWeight = "bold";
    scoreText.style.whiteSpace = "pre";    // 改行あり
    scoreText.style.color = isJust ? "yellow" : "white";
    scoreText.style.zIndex = "15";
    scoreText.style.pointerEvents = "none";
    scoreText.style.transform = "translate(-50%, 0px)";
    scoreText.dataset.transient = 'true';
  game.appendChild(scoreText);

    // 浮き上がって消えるアニメーション
    let offset = 0;
    const floatUp = setGameInterval(() => {
      offset += 1;
      scoreText.style.transform = `translate(-50%, -${offset}px)`;
      if (offset > 50) {  // ← 表示時間 約2秒（40ms × 50）
        clearGameTimer(floatUp);
        scoreText.remove();
      }
    }, 40);
  }
}
/* =======================================================
   ▼ 爆発発生処理軽量化
   ======================================================= */
function safeCreateExplosion(x, y, score, isJust, isBomb, exp) {
  const now = runtimeTime;
  if (now - lastExplosionTime < 50) return;  // 50ms以内ならスキップ
  lastExplosionTime = now;

  createExplosion(x, y, score, isJust, isBomb, exp);
}

/* =======================================================
   ▼ コンボ数表示の更新（画面右上に ○Hits!）
   ======================================================= */
function updateComboDisplay(currentComboCount) {
  if (currentComboCount < 2) return; // ✅ 1Hits! は表示しない

  const cappedCount = Math.min(currentComboCount, 50); // ✅ 上限50Hits!

  let comboText = document.getElementById("comboText");
  if (!comboText) {
    comboText = document.createElement("div");
    comboText.id = "comboText";
    game.appendChild(comboText);
  }

  // ✅ 毎回スタイルを上書き（CSS影響を受けない）
  comboText.style.position = "absolute";
  comboText.style.top = "450px";           // ← 表示位置を確実に反映
  comboText.style.right = "10px";
  comboText.style.fontSize = "24px";
  comboText.style.fontWeight = "bold";
  comboText.style.color = "cyan";
  comboText.style.zIndex = "100";
  comboText.style.pointerEvents = "none";
  comboText.style.textShadow = "1px 1px 2px black";

  comboText.style.display = "block";
  comboText.textContent = `${cappedCount} Hits!`; // ← 表示にも上限反映

  // ✅ コンボ終了タイマーの制御（600ms後にフィニッシュ処理）
  if (comboEndTimeout) clearGameTimer(comboEndTimeout);
  comboEndTimeout = setGameTimeout(() => {
    if (comboReflectedCount <= 0) finishComboBonus();
    comboEndTimeout = null;
  }, 600);
}

/* =======================================================
   ▼ コンボ数表示
   ======================================================= */


/* =======================================================
   ▼ フィニッシュコンボボーナス表記
   ======================================================= */
function finishComboBonus() {
  if (!gameStarted || gameOver || isPaused || comboBonusGiven || currentComboCount < 2) return;

  comboBonusGiven = true;

  const cappedCount = Math.min(currentComboCount, 50); // ✅ 最大50Hits扱い
  const bonusScore = cappedCount * 1000;
  const bonusExp = cappedCount * 10;
  score += bonusScore;
  addExp(bonusExp);

  const bonusDiv = document.createElement("div");
  bonusDiv.innerText = `+${bonusScore}\nEXP+${bonusExp}`;
  bonusDiv.style.position = "absolute";
  bonusDiv.style.right = "5%";
  bonusDiv.style.top = "100%";
  bonusDiv.style.transform = "translateY(350px)";
  bonusDiv.style.fontSize = "20px";
  bonusDiv.style.fontWeight = "bold";
  bonusDiv.style.whiteSpace = "pre";
  bonusDiv.style.color = "aqua";
  bonusDiv.style.textShadow = "2px 2px 4px black";
  bonusDiv.style.pointerEvents = "none";
  bonusDiv.style.zIndex = "100";

  bonusDiv.dataset.transient = 'true';
  game.appendChild(bonusDiv);

  // 浮き上がり＆フェードアウトアニメーション
  let offset = 0;
  let opacity = 1;
  const floatUp = setGameInterval(() => {
    offset += 2;
    opacity -= 0.03;
    bonusDiv.style.top = `${100 - offset}px`; // ← 上にずらす
    bonusDiv.style.opacity = opacity;
    if (offset > 50 || opacity <= 0) {
      clearGameTimer(floatUp);
      bonusDiv.remove();
    }
  }, 30);

  // ✅ コンボ情報リセット
  currentComboCount = 0;
  comboBonusGiven = false;
  comboInProgress = false;

  // ✅ コンボUIを非表示
  const comboText = document.getElementById("comboText");
  if (comboText) comboText.style.display = "none";

  // ✅ タイマーを明示的に解除
  if (comboEndTimeout) {
    clearGameTimer(comboEndTimeout);
    comboEndTimeout = null;
  }

  updateUI();
}

/* =======================================================
   ▼ UIの更新処理
   ======================================================= */
let uiDirty = false;

function updateUI() {
  uiDirty = true;
  // Gameplay state changes immediately; only its presentation is batched.
  if (!collisionFrame) flushUI();
}

function flushUI() {
  if (!uiDirty) return;
  uiDirty = false;
  const setText = (element, text) => {
    if (element.textContent !== text) element.textContent = text;
  };
  // ハートの数表示（負のrepeat対策あり）
  setText(livesEl,
    "❤️".repeat(Math.max(0, lives)) +
    "🖤".repeat(Math.max(0, maxLives - lives)));

  // レベル表示
  setText(levelEl, "Lv. " + level);

  // 経験値表示
  if (level < maxLevel) {
    setText(expEl, `EXP: ${exp} / ${level * 200}`);
  } else {
    setText(expEl, `EXP: MAX`);
  }

  // スコア表示
  setText(scoreEl, "スコア: " + score);
}

/* =======================================================
   ▼ 経験値追加
   ======================================================= */
function addExp(amount) {
  if (level >= maxLevel) return;

  exp += amount;
  let threshold = level * 200;

  let levelUps = 0;

  while (exp >= threshold && level < maxLevel) {
    exp -= threshold;
    level++;
    maxLives++;
    levelUps++;
    playerSpeed *= 1.05;
    threshold = level * 200;

    // ✅ レベルアップごとにジャストパリィ判定距離 +2
    justParryRadius = Math.min(justParryRadius + 2, 52); // Lv1:40 → Lv7:52
  }

  // ライフ回復は最後に1回だけまとめて処理
  if (levelUps > 0) {
    lives = Math.min(lives + levelUps, maxLives);
  }

  updateUI();
}

/* =======================================================
   ▼ 障害物ダメージ表現
   ======================================================= */
  function applyHitFlash(obstacle) {
  if (seBombS) {
  playSound(seBombS, true);
}

  obstacle.style.filter = "brightness(2)";
  setGameTimeout(() => {
    if (obstacle) obstacle.style.filter = "";
  }, 150);
}

/* =======================================================
   ▼ コリジョン判定
   ======================================================= */
  function checkCollision(r1, r2) {
    return !(r1.top > r2.bottom || r1.bottom < r2.top || r1.left > r2.right || r1.right < r2.left);
  }

/* =======================================================
   ▼ 障害物コリジョンサイズ変更（高さ）
   ======================================================= */
// Read layout together before any movement writes. Within this frame, translate
// those measured rectangles by the current CSS positions, including catch-up
// physics steps and movement occurring before the parry callbacks.
let collisionFrame = null;
let collisionGrid = null;

function measureCollisionGrid() {
  // Engines round CSS coordinates to different subpixel grids. Match that grid
  // so a target exactly on a parry boundary does not move across the boundary.
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = '0px';
  game.appendChild(probe);
  const widths = [1, 1.01, 1.02, 1.03].map(width => {
    probe.style.width = width + 'px';
    return probe.getBoundingClientRect().width;
  });
  probe.remove();
  const step = Math.min(...widths.slice(1).map((width, i) => width - widths[i]).filter(delta => delta > 0));
  const units = Math.round(1 / step);
  const round = Math.abs(widths[1] - Math.round(1.01 * units) / units) < 0.000001;
  collisionGrid = Number.isFinite(units) && units > 0 ? { units, round } : { units: 0 };
}

function collisionCoordinate(value) {
  const number = parseFloat(value) || 0;
  if (!collisionGrid?.units) return number;
  const scaled = number * collisionGrid.units;
  return (collisionGrid.round ? Math.round(scaled) : Math.trunc(scaled)) / collisionGrid.units;
}

function collisionPosition(elem) {
  return { x: collisionCoordinate(elem.style.left), y: collisionCoordinate(elem.style.top) };
}

function beginCollisionFrame() {
  const rects = new Map();
  const targets = allObstacles.filter(elem => elem.dataset.type === 'damage');
  targets.push(...game.querySelectorAll('.heal'));
  // Reflected shots use numeric swept collision already. With no targets left,
  // avoid forcing a style update just to measure unused rectangles.
  if (targets.length === 0) {
    collisionFrame = { rects, height: null };
    return;
  }
  if (!collisionGrid) measureCollisionGrid();
  for (const elem of [game, player, hitbox, ...targets]) {
    if (!elem.parentElement) continue;
    rects.set(elem, { rect: elem.getBoundingClientRect(), ...collisionPosition(elem) });
  }
  collisionFrame = { rects, height: game.clientHeight };
}

function endCollisionFrame() {
  collisionFrame = null;
  flushUI();
}

function getCollisionRect(elem) {
  const measured = collisionFrame?.rects.get(elem);
  // Newly spawned elements and input handlers outside the frame use live layout.
  if (!measured) return elem.getBoundingClientRect();
  const position = collisionPosition(elem);
  const dx = position.x - measured.x;
  const dy = position.y - measured.y;
  const rect = measured.rect;
  return { left: rect.left + dx, right: rect.right + dx,
    top: rect.top + dy, bottom: rect.bottom + dy,
    width: rect.width, height: rect.height };
}

function getGameHeight() {
  return collisionFrame?.height ?? game.clientHeight;
}

function getAdjustedRect(elem) {
  const rect = getCollisionRect(elem);
  const newHeight = rect.height * 0.7;

  return {
    top: rect.bottom - newHeight,        // ← 下寄せに変更
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    width: rect.width,
    height: newHeight
  };
}
/* =======================================================
   ▼ 障害物同士のコリジョン判定
   ======================================================= */


/* =======================================================
   ▼ 反射処理（反射できる障害物に対して反射を行う）
   ======================================================= */
function reflectObstacle(obstacle, isRainbow) {
  // 🛑 元の落下処理を停止
  if (obstacle.fallInterval) {
    clearGameTimer(obstacle.fallInterval);
    obstacle.fallInterval = null;
  }

  let hp = parseInt(obstacle.dataset.hp);
  obstacle.dataset.type = "reflected";
  obstacle.dataset.hp = hp;

  let y = parseInt(obstacle.style.top);
  let vy = -obstacleSpeed * (isRainbow ? 1.5 : 1);

  if (isRainbow) {
    if (ENABLE_RAINBOW_VISUAL) obstacle.classList.add("rainbow");
    comboReflectedCount++;
    obstacle.rainbowTracked = true;
  }

  // 当たり判定拡大
  const originalW = parseFloat(obstacle.dataset.hitboxW);
  const originalH = parseFloat(obstacle.dataset.hitboxH);
  const expandedW = originalW * 1.2;
  const expandedH = originalH * 1.2;
  obstacle.dataset.hitboxW = expandedW;
  obstacle.dataset.hitboxH = expandedH;

  setGameTimeout(() => {
    if (obstacle && obstacle.parentElement) {
      obstacle.dataset.hitboxW = originalW;
      obstacle.dataset.hitboxH = originalH;
    }
  }, 500);

  let removed = false;

  obstacle.lifeTimer = setGameTimeout(() => {
    if (!removed && obstacle && obstacle.parentElement) {

      removeObstacle(obstacle);
      removed = true;
    }
  }, 2000);

  const move = setGameInterval(() => {
    if (gameOver || !obstacle.parentElement) return clearGameTimer(move);
    if (isPaused) return;
    const previousY = y;
    y += vy;
    obstacle.style.top = y + "px";


    const selfW = parseFloat(obstacle.dataset.hitboxW || originalW);
    const selfH = parseFloat(obstacle.dataset.hitboxH || originalH);
    const selfX = parseInt(obstacle.style.left);
    const selfY = y;

    for (let other of [...allObstacles]) {
      if (other === obstacle || !other.parentElement || other.dataset.type !== "damage") continue;

      const otherX = parseInt(other.style.left);
      const otherY = parseInt(other.style.top);
      const otherW = parseFloat(other.dataset.hitboxW || other.offsetWidth);
      const otherH = parseFloat(other.dataset.hitboxH || other.offsetHeight);

      // Relative motion prevents fast shots from jumping through falling enemies.
      const previousRelativeY = previousY - (other.previousY ?? otherY);
      const relativeY = selfY - otherY;
      const overlapX = selfX < otherX + otherW && selfX + selfW > otherX;
      const crossedY = Math.min(previousRelativeY, relativeY) < otherH &&
        Math.max(previousRelativeY, relativeY) + selfH > 0;
      if (!overlapX || !crossedY) continue;

      const hp1 = parseInt(obstacle.dataset.hp);
      const hp2 = parseInt(other.dataset.hp);
      const stageType = parseInt(other.dataset.stage || 1);
      const size = other.dataset.size;
      const color = other.dataset.color;

      let scoreAdd = 0;
      let expAdd = 0;
     //★スコア＆経験値
      if (stageType === 1 || stageType === 2) {
        scoreAdd = hp2 === 2 ? 1000 : 500;
        expAdd = hp2 === 2 ? 10 : 5;
      } else if (stageType === 3) {
        scoreAdd = hp2 === 3 ? 1500 : 1000;
        expAdd = hp2 === 3 ? 15 : 10;
      } else if (stageType === 4) {
        if (hp2 === 3 && size === "huge" && color === "blue") {
          scoreAdd = 5000;
          expAdd = 50;
        } else if (hp2 === 3) {
          scoreAdd = 3500;
          expAdd = 35;
        } else if (hp2 === 1) {
          scoreAdd = 1500;
          expAdd = 15;
        }
      } else if (stageType >= 5) {
        if (hp2 === 3 && size === "huge" && color === "blue") {
          scoreAdd = 6000;
          expAdd = 70;
        } else if (hp2 === 3) {
          scoreAdd = 4000;
          expAdd = 40;
        } else if (hp2 === 2) {
          scoreAdd = 2500;
          expAdd = 25;
        } else if (hp2 === 1) {
          scoreAdd = 2000;
          expAdd = 20;
        }
      }

      if (isRainbow) {
        score += scoreAdd * 2;
        addExp(expAdd);
        safeCreateExplosion(otherX, otherY, scoreAdd * 2, true, false, expAdd);
        removeObstacle(other);

        if (!comboInProgress && currentComboCount === 0) {
          currentComboCount = 2;
          comboBonusGiven = false;
        } else {
          currentComboCount++;
        }

        updateComboDisplay(currentComboCount);
        comboLastUpdateTime = runtimeTime;
        comboInProgress = true;

      } else {
        if (hp1 === hp2) {
          score += scoreAdd;
          addExp(expAdd);
          safeCreateExplosion(otherX, otherY, scoreAdd, false, false, expAdd);
          removeObstacle(obstacle);
          removeObstacle(other);
          clearGameTimer(move);
          removed = true;
        } else if (hp1 > hp2) {
          score += scoreAdd;
          addExp(expAdd);
          safeCreateExplosion(otherX, otherY, scoreAdd, false, false, expAdd);
          obstacle.dataset.hp = hp1 - 1;
          removeObstacle(other);
        } else {
          other.dataset.hp = hp2 - 1;
          applyHitFlash(other);  // ← ここを追加
          other.style.opacity = "0.4";
          setGameTimeout(() => {
            if (other) other.style.opacity = "1";
          }, 150);
          removeObstacle(obstacle);
          clearGameTimer(move);
          removed = true;
        }
      }

      updateUI();
      if (removed) break;
    }

    if (y < 0 && !removed) {

      removeObstacle(obstacle);
      removed = true;
      clearGameTimer(move);
    }
  }, 30);
  obstacle.moveInterval = move;
}

/* =======================================================
   ▼ ゲームクリア時のRANK判定
   ======================================================= */
function getRating(score, time, isMillis = false) {
  const timeInSeconds = isMillis ? time / 1000 : time;
  if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) return "E";
  const spt = score / timeInSeconds;

  if (spt >= 4400) return "V";
  if (spt >= 4000) return "SS";
  if (spt >= 3600) return "S";
  if (spt >= 3200) return "A";
  if (spt >= 2800) return "B";
  if (spt >= 2400) return "C";
  if (spt >= 2000) return "D";
  return "E";
}
/* =======================================================
   ▼ ゲームクリア処理
   ======================================================= */
function endGame() {
  if (gameOver) return;
  // Settle an earned combo before freezing the score used for ranking.
  finishComboBonus();
  gameOver = true;
  isPaused = false;
  gameTimers.clear();
  clearAtlasEffects();
  comboWatcherStarted = false;
  stopTouchHold();
  keyPressed = {};
  cancelAudioFades();
  [...allObstacles].forEach(removeObstacle);
  game.querySelectorAll('[data-transient], .afterimage').forEach(el => el.remove());
  resumeButton.style.display = 'none';
  pauseOverlay.style.display = 'none';

  // BGM停止
  bgm.Stage1.pause();
  bgm.Stage2.pause();
  bgm.Stage3.pause();
  bgm.Final.pause();
  if (bgm.Final2) bgm.Final2.pause(); // ✅ 追加

  // 既に追加されたGame Overテキストがあれば削除
  const existingOver = document.getElementById("gameOverText");
  if (existingOver) existingOver.remove();


  // ▼▼▼ アイテム落下タイマーをすべて停止 ▼▼▼
  if (typeof itemFallTimers !== "undefined") {
    itemFallTimers.forEach(id => clearGameTimer(id));
    itemFallTimers = [];
  }

  // ▼▼▼ アイテムをすべて削除（.heal クラスを共通指定） ▼▼▼
  document.querySelectorAll(".heal").forEach(item => item.remove());

  // ゲームオーバー処理
  if (score < 250000) {
    const gameOverText = document.createElement("h2");
    gameOverText.id = "gameOverText";
    gameOverText.textContent = "Game Over!";
    gameOverText.style.color = "yellow";
    gameOverText.style.marginTop = "200px";
    game.appendChild(gameOverText);

    gameClear.style.display = "none";
    restartButton.style.display = "block";
    restartButton.style.pointerEvents = "auto";

    pauseButton.style.display = "none";
  } else {
    // ▼▼▼ 障害物削除処理 ▼▼▼
    [...allObstacles].forEach(removeObstacle);
    allObstacles.length = 0;

    // ゲームクリア処理

    const rating = getRating(score, gameTime, true); // ミリ秒なので true を指定


    timeRatingEl.textContent = `RANK: ${rating}`;

    // ✅ ▼▼▼ Vランク演出 ▼▼▼
    if (rating.trim().toUpperCase() === "V") {
      timeRatingEl.classList.add("void-rank");

      const existingSubtext = timeRatingEl.parentElement.querySelector(".void-subtext");
      if (existingSubtext) existingSubtext.remove();

      const subtext = document.createElement("div");
      subtext.textContent = "V - VOID RANK";
      subtext.className = "void-subtext";
      timeRatingEl.parentElement.appendChild(subtext);

      triggerVoidFeathers();
    }
    // ✅ ▲▲▲ Vランクここまで ▲▲▲

    showMusicTitle("♪Twilight Flutter");

    gameClear.style.display = "flex";
    restartButton.style.display = "block";
    document.getElementById("thankYouText").style.display = "block";

    // ✅ 表示用ランキングを更新
    displayHighScores();

    // ✅ UI表示が終わってからハイスコアチェックを呼ぶ
    setGameTimeout(() => {
      checkAndRegisterHighScore(score, rating);
    }, 500);
  }

  // ✅ クリアBGM再生
  bgm.Result.currentTime = 0;
  bgm.Result.volume = 0.8;
  bgm.Result.play().catch(error => console.warn('結果BGM再生失敗:', error));

  pauseButton.style.display = "none";

  updateUI();
}


function spawnPeriodicItems() {
  if (gameStarted && !gameOver && !isPaused) {
    maybeSpawnHeart(); // ハート生成
    maybeSpawnLemon(); // レモン生成
    maybeSpawnGrape(); // ← ここに追加！
    checkStage();
  }
}

/* =======================================================
   ▼Vランクの特殊羽根演出（新規追加関数）
   ======================================================= */
function triggerVoidFeathers() {
  const container = document.getElementById("voidFeathers");
  const game = document.getElementById("game");
  if (!container || !game) return;

  container.innerHTML = "";
  container.style.display = "block";

  const featherCount = 20;
  const maxSpread = 240;
  const gravityY = 30;

  const gameRect = game.getBoundingClientRect();
  const centerX = gameRect.width / 2;
  const centerY = gameRect.height / 3;

  for (let i = 0; i < featherCount; i++) {
    const feather = document.createElement("div");
    feather.className = "feather";

    const angle = Math.PI + Math.random() * Math.PI;
    const radius = Math.random() * maxSpread;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius + 180;

    const flyTimeSec = (5.0 + Math.random()).toFixed(2);
    const rotateSpeedSec = (8.0 + Math.random() * 2).toFixed(2);

    const startAngle = Math.floor(Math.random() * 360);
    const midAngle = startAngle + (Math.random() * 60 - 30);
    const endAngle = midAngle + (Math.random() * 60 - 30);

    feather.style.setProperty("--dx", dx);
    feather.style.setProperty("--dy", dy);
    feather.style.setProperty("--flyTime", `${flyTimeSec}s`);
    feather.style.setProperty("--rotateSpeed", `${rotateSpeedSec}s`);
    feather.style.setProperty("--startAngle", `${startAngle}deg`);
    feather.style.setProperty("--midAngle", `${midAngle}deg`);
    feather.style.setProperty("--endAngle", `${endAngle}deg`);

    feather.style.left = `${centerX}px`;
    feather.style.top = `${centerY}px`;

    // ✅ 正しい場所に追加（これが重要！）
    game.appendChild(feather);

    // アニメ後削除
    setGameTimeout(() => {
      feather.remove();
    }, parseFloat(flyTimeSec) * 1000 - 400);
  }
}

/* =======================================================
   ▼ ハイスコア名前入力
   ======================================================= */
/* =======================================================
   ▼ スマホ自動拡大表示
   ======================================================= */
window.addEventListener("load", function () {
  setGameTimeout(function () {
    window.scrollTo(0, 1);
  }, 100);
});
/* =======================================================
   ▼ visibilitychange イベントを追加
   ======================================================= */

/* =======================================================
   ▼デバッグ用コリジョン表示
   ======================================================= */


function randomSpawnX(width) {
  const max = Math.max(0, game.clientWidth - width);
  const columns = Math.floor(Math.min(320, max) / 40) + 1;
  return Math.floor(Math.random() * columns) * 40;
}

function removeObstacle(obstacle) {
  clearGameTimer(obstacle.fallInterval);
  clearGameTimer(obstacle.moveInterval);
  clearGameTimer(obstacle.lifeTimer);
  if (obstacle.rainbowTracked) {
    obstacle.rainbowTracked = false;
    comboReflectedCount = Math.max(0, comboReflectedCount - 1);
    comboLastUpdateTime = runtimeTime;
  }
  const index = allObstacles.indexOf(obstacle);
  if (index >= 0) allObstacles.splice(index, 1);
  obstacle.remove();
}
