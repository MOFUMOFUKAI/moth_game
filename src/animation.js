// Timing and playback order are taken from the original GIFs.
function makeEnemyAnimation(file, columns, rows, cellSize, sequence, durations) {
  return Object.freeze({
    id: file.replace(/_(?:animation|anim)\.png$/, ''),
    image: 'assets/images/' + file, columns, rows, cellSize,
    sequence: Object.freeze(sequence), durations: Object.freeze(durations),
    loopDuration: durations.reduce((sum, duration) => sum + duration, 0)
  });
}

const ENEMY_ANIMATIONS = Object.freeze({
  'big:red': makeEnemyAnimation('enm_big_R_animation.png', 5, 2, 128, [0,1,2,3,4,5,6,7,8,9], [200,160,160,160,160,200,160,160,160,120]),
  'big:green': makeEnemyAnimation('enm_big_G_animation.png', 5, 2, 128, [0,1,2,3,4,5,6,7,8,9], [200,160,160,160,160,200,160,160,160,120]),
  'big:blue': makeEnemyAnimation('enm_big_B_animation.png', 5, 2, 128, [0,1,2,3,4,5,6,7,8,9], [200,160,160,160,160,200,160,160,160,120]),
  'huge:red': makeEnemyAnimation('enm_Boss_R_animation.png', 4, 2, 256, [0,1,2,3,4,5,6], [200,120,120,160,120,160,160]),
  'huge:green': makeEnemyAnimation('enm_Boss_G_animation.png', 4, 2, 256, [0,1,2,3,4,5,6], [240,200,200,200,200,200,160]),
  'huge:blue': makeEnemyAnimation('enm_Boss_B_animation.png', 4, 2, 256, [0,1,2,3,4,5,6,5,4,3,2], [200,40,80,320,80,160,80,160,80,240,40]),
  'small:red': makeEnemyAnimation('enm_small_R_animation.png', 6, 2, 128, [0,1,2,3,4,5,6,7,8,9,10,11], [80,80,80,40,80,80,40,80,80,40,80,40]),
  'small:blue': makeEnemyAnimation('enm_small_B_animation.png', 6, 1, 80, [0,1,2,3,4,5], [160,120,160,120,120,120]),
  'small:green': makeEnemyAnimation('enm_small_G_animation.png', 4, 1, 80, [0,1,2,3,2,1], [160,120,160,120,120,120])
});

function initializeEnemyAnimation(enemy, size, color, dimension) {
  const animation = ENEMY_ANIMATIONS[size + ':' + color];
  if (!animation) return false;
  initializeAtlasElement(enemy, animation, dimension);
  return true;
}

function initializeAtlasElement(enemy, animation, dimension) {
  enemy.spriteAnimation = animation;
  enemy.animationStartedAt = runtimeTime;
  enemy.animationDimension = dimension;
  enemy.dataset.animation = animation.id;
  enemy.style.backgroundImage = 'url(' + animation.image + ')';
  enemy.style.backgroundSize = (dimension * animation.columns) + 'px ' + (dimension * animation.rows) + 'px';
  updateEnemyAnimation(enemy);
}

function enemyAnimationFrame(animation, elapsed) {
  let remaining = Math.max(0, elapsed) % animation.loopDuration;
  for (let frame = 0; frame < animation.durations.length; frame++) {
    if (remaining < animation.durations[frame]) return animation.sequence[frame];
    remaining -= animation.durations[frame];
  }
  return 0;
}

function updateEnemyAnimation(enemy) {
  const animation = enemy.spriteAnimation;
  if (!animation) return;
  const frame = enemyAnimationFrame(animation, runtimeTime - enemy.animationStartedAt);
  if (frame === enemy.animationFrame) return;
  enemy.animationFrame = frame;
  const column = frame % animation.columns;
  const row = Math.floor(frame / animation.columns);
  enemy.style.backgroundPosition = `${-column * enemy.animationDimension}px ${-row * enemy.animationDimension}px`;
}

function updateEnemyAnimations() {
  for (const enemy of allObstacles) updateEnemyAnimation(enemy);
}

// Keep the collision coordinate separate from presentation. Moving with a
// transform avoids relaying out the page on every frame.
function getSpriteY(element) {
  const anchor = parseFloat(element.style.top) || 0;
  return element.motionAnchor === anchor && Number.isFinite(element.motionY)
    ? element.motionY : anchor;
}

function setSpriteY(element, y) {
  element.motionAnchor = parseFloat(element.style.top) || 0;
  element.motionY = y;
  // Stable subpixel positions avoid float-matrix drift at collision boundaries.
  // This rounds presentation only; elapsed-distance physics remains unrounded.
  element.motionOffset = Math.round((y - element.motionAnchor) * 64) / 64;
  element.style.transform = `translate3d(0, ${element.motionOffset}px, 0)`;
}

// Preserve the actual GIF playback order, including its second partial loop
// before the original 580ms display lifetime expires.
const JUST_PARRY_ANIMATION = makeEnemyAnimation(
  'eff_just_parry_animation.png', 4, 2, 128,
  [0, 1, 3, 4, 6, 2], [80, 80, 80, 40, 80, 80]
);
const PARRY_ANIMATION = makeEnemyAnimation(
  'eff_parry_anim.png', 3, 3, 128,
  [0,1,2,3,4,5,6,7,8], [120,120,80,120,80,120,80,120,40]
);
const BOMB_L_ANIMATION = makeEnemyAnimation(
  'eff_bomb_L_anim.png', 6, 2, 128,
  [0,1,2,3,4,5,6,7,8,9,10,11], [80,80,80,40,80,80,40,80,80,40,80,40]
);
const atlasEffects = new Set();

function createAtlasEffect(animation, x, y, dimension, duration) {
  const effect = document.createElement('div');
  effect.className = 'atlas-effect';
  effect.dataset.transient = 'true';
  Object.assign(effect.style, {
    position: 'absolute', left: x + 'px', top: y + 'px',
    width: dimension + 'px', height: dimension + 'px',
    pointerEvents: 'none', zIndex: '3', backgroundRepeat: 'no-repeat'
  });
  initializeAtlasElement(effect, animation, dimension);
  game.appendChild(effect);
  atlasEffects.add(effect);
  effect.removalTimer = setGameTimeout(() => removeAtlasEffect(effect), duration);
  return effect;
}

function removeAtlasEffect(effect) {
  clearGameTimer(effect.removalTimer);
  atlasEffects.delete(effect);
  effect.remove();
}

function clearAtlasEffects() {
  for (const effect of atlasEffects) removeAtlasEffect(effect);
}

function updateAtlasEffects() {
  for (const effect of atlasEffects) {
    if (!effect.parentElement) removeAtlasEffect(effect);
    else updateEnemyAnimation(effect);
  }
}

const MOTH_ANIMATION = Object.freeze({
  image: 'assets/images/chr_moym_animation.png', columns: 4, rows: 4,
  cellSize: 256, frameDuration: 100, sequence: Object.freeze([0,1,2,3,2,1])
});
let mothDodgeDirection = 0;

function mothAnimationFrame() {
  const holdingDirection = keyPressed.ArrowLeft || keyPressed.ArrowRight;
  const direction = holdingDirection ?
    Number(!!keyPressed.ArrowRight) - Number(!!keyPressed.ArrowLeft) :
    isDodging ? mothDodgeDirection : 0;
  return {
    row: direction < 0 ? 1 : direction > 0 ? 2 : 0,
    col: MOTH_ANIMATION.sequence[Math.floor(runtimeTime / MOTH_ANIMATION.frameDuration) % MOTH_ANIMATION.sequence.length]
  };
}

function applyMothFrame(element, dimension, row, col) {
  element.style.backgroundImage = 'url(' + MOTH_ANIMATION.image + ')';
  element.style.backgroundSize = `${dimension * MOTH_ANIMATION.columns}px ${dimension * MOTH_ANIMATION.rows}px`;
  element.style.backgroundPosition = `${-col * dimension}px ${-row * dimension}px`;
  element.style.backgroundRepeat = 'no-repeat';
}

function updateMothAnimation() {
  const { row, col } = mothAnimationFrame();
  if (player.mothRow === row && player.mothCol === col) return;
  player.mothRow = row;
  player.mothCol = col;
  player.dataset.animationRow = String(row);
  player.dataset.animationCol = String(col);
  applyMothFrame(player, 48, row, col);
}

function resetMothAnimation() {
  mothDodgeDirection = 0;
  player.mothRow = player.mothCol = undefined;
  updateMothAnimation();
}
