// BB_R trial: five columns, two rows, 128px cells, in row-major order.
// Timing retains the original GIF's 41 x 40ms loop (1.64 seconds).
const BB_R_ANIMATION = Object.freeze({
  image: 'assets/images/BB_R_animation.png',
  columns: 5,
  rows: 2,
  cellSize: 128,
  durations: Object.freeze([200, 160, 160, 160, 160, 200, 160, 160, 160, 120]),
  loopDuration: 1640
});

function initializeEnemyAnimation(enemy, size, color, dimension) {
  if (size !== 'big' || color !== 'red') return;
  enemy.spriteAnimation = BB_R_ANIMATION;
  enemy.animationStartedAt = runtimeTime;
  enemy.animationDimension = dimension;
  enemy.dataset.animation = 'BB_R';
  enemy.style.backgroundImage = `url(${BB_R_ANIMATION.image})`;
  enemy.style.backgroundSize = `${dimension * BB_R_ANIMATION.columns}px ${dimension * BB_R_ANIMATION.rows}px`;
  updateEnemyAnimation(enemy);
}

function enemyAnimationFrame(animation, elapsed) {
  let remaining = Math.max(0, elapsed) % animation.loopDuration;
  for (let frame = 0; frame < animation.durations.length; frame++) {
    if (remaining < animation.durations[frame]) return frame;
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
