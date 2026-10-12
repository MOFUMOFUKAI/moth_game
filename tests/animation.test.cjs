const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('only big red enemy uses the 5x2 atlas; dimensions and collision data remain unchanged', () => {
  const g = createGame();
  g.run('startGame(); Math.random=()=>0.8; createObstacle(); const enemy=allObstacles[0]');
  assert.equal(g.run('enemy.dataset.animation'), 'BB_R');
  assert.equal(g.run('enemy.style.backgroundSize'), '460px 184px');
  assert.equal(g.run('enemy.style.backgroundPosition'), '0px 0px');
  assert.equal(g.run('enemy.style.width'), '92px');
  assert.equal(g.run('enemy.dataset.hitboxW'), 92);
  assert.equal(g.run('enemy.dataset.hp'), 2);
  g.run('Math.random=()=>0; createObstacle()');
  assert.equal(g.run('allObstacles[1].spriteAnimation'), undefined);
  g.run('stage=2; Math.random=()=>0.8; createObstacle()');
  assert.equal(g.run('allObstacles[2].spriteAnimation'), undefined);
});

test('all ten frames follow original GIF timing and wrap at 1640ms', () => {
  const g = createGame();
  const boundaries = [0,200,360,520,680,840,1040,1200,1360,1520];
  boundaries.forEach((time, frame) => {
    assert.equal(g.run(`enemyAnimationFrame(BB_R_ANIMATION, ${time})`), frame);
    assert.equal(g.run(`enemyAnimationFrame(BB_R_ANIMATION, ${time + 119})`), frame);
  });
  assert.equal(g.run('enemyAnimationFrame(BB_R_ANIMATION,1640)'), 0);
  assert.equal(g.run('enemyAnimationFrame(BB_R_ANIMATION,3280)'), 0);
});

test('atlas animation freezes during pause, survives reflection and restarts cleanly', () => {
  const g = createGame();
  g.run('startGame(); Math.random=()=>0.8; createObstacle(); const enemy=allObstacles[0];');
  g.advance(220); assert.equal(g.run('enemy.animationFrame'), 1);
  g.run('pauseGame()'); g.advance(5000); assert.equal(g.run('enemy.animationFrame'), 1);
  g.run('resumeGame(); enemy.style.top="300px"; reflectObstacle(enemy,true)'); g.advance(160);
  assert.equal(g.run('enemy.animationFrame'), 2);
  assert.equal(g.run('enemy.style.backgroundImage.includes("BB_R_animation.png")'), true);
  g.run('endGame(); startGame(); Math.random=()=>0.8; createObstacle()');
  assert.equal(g.run('allObstacles[0].animationFrame'), 0);
});
