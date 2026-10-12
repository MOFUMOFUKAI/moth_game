// Timing and playback order are taken from the original GIFs.
function makeEnemyAnimation(file, columns, rows, cellSize, sequence, durations) {
  return Object.freeze({
    id: file.replace('_animation.png', ''),
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
  enemy.spriteAnimation = animation;
  enemy.animationStartedAt = runtimeTime;
  enemy.animationDimension = dimension;
  enemy.dataset.animation = animation.id;
  enemy.style.backgroundImage = 'url(' + animation.image + ')';
  enemy.style.backgroundSize = (dimension * animation.columns) + 'px ' + (dimension * animation.rows) + 'px';
  updateEnemyAnimation(enemy);
  return true;
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
