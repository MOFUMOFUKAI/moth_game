const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

function reflectedGame(just = true) {
  const g = createGame();
  g.run(`startGame(); clearGameTimer(obstacleSpawnInterval); clearGameTimer(scoreUpdateInterval); createObstacle();
    const shot=allObstacles[0]; shot.style.top='500px'; reflectObstacle(shot,${just});`);
  return g;
}

test('normal and just shots move every display frame at the original average speed', () => {
  for (const just of [false, true]) {
    const positions = [];
    for (const hz of [30, 60, 120]) {
      const g = reflectedGame(just);
      let previous = 500;
      for (let frame = 0; frame < hz / 2; frame++) {
        g.frame(1000 / hz);
        const y = g.run('getSpriteY(shot)');
        assert.ok(y < previous, `${hz}Hz has no stationary frame`);
        previous = y;
      }
      positions.push(previous);
      assert.equal(g.run('shot.classList.contains("rainbow")'), just);
    }
    for (const y of positions) assert.ok(Math.abs(y - (just ? 125 : 250)) < 0.00001);
  }
});

test('a delayed frame updates motion once without discarding elapsed distance', () => {
  const g = reflectedGame();
  g.run(`let moves=0; const motion=gameTimers.get(shot.moveInterval);
    const originalMove=motion.callback;
    motion.callback=(elapsed)=>{moves++;originalMove(elapsed);};`);
  g.frame(120);
  assert.equal(g.run('moves'), 1);
  assert.equal(g.run('getSpriteY(shot)'), 410);
  g.run('pauseGame()'); g.advance(5000);
  assert.equal(g.run('getSpriteY(shot)'), 410);
  g.run('resumeGame()'); g.frame(20);
  assert.equal(g.run('getSpriteY(shot)'), 395);
});

test('falling enemy and pickup motion preserve distance at 30, 60 and 120Hz', () => {
  const positions = [];
  for (const hz of [30, 60, 120]) {
    const g = createGame();
    g.run(`startGame(); clearGameTimer(obstacleSpawnInterval); createObstacle(); const enemy=allObstacles[0];
      lives=1; Math.random=()=>0; spawnFallingItem('heart'); const pickup=game.querySelector('.heal');`);
    g.advance(300, 1000 / hz);
    positions.push(g.run('getSpriteY(enemy)'));
    assert.ok(Math.abs(g.run('getSpriteY(pickup)') - 50) < 0.00001);
  }
  for (const y of positions) assert.ok(Math.abs(y - positions[0]) < 0.00001);
});

test('shots still hit crossed targets on a delayed frame, including later-created enemies', () => {
  const g = reflectedGame();
  g.run(`shot.style.left='0px'; createObstacle(); const target=allObstacles[1];
    clearGameTimer(target.fallInterval); target.style.left='0px'; target.style.top='350px';
    target.dataset.hp=1; target.dataset.size='small'; target.dataset.hitboxH=target.dataset.hitboxW=60;`);
  g.frame(240);
  assert.equal(g.run('target.parentElement'), null);
  assert.equal(g.run('score'), 1000);
  assert.equal(g.run('comboInProgress'), true);
  assert.equal(g.run('shot.parentElement===game'), true);
});

test('later-spawned falling targets update before shots regardless of registration order', () => {
  const g = reflectedGame();
  g.run(`let order=[]; const original=gameTimers.get(shot.moveInterval).callback;
    gameTimers.get(shot.moveInterval).callback=(elapsed)=>{order.push('shot'); original(elapsed);};
    createObstacle(); const newer=allObstacles[1];
    const falling=gameTimers.get(newer.fallInterval).callback;
    gameTimers.get(newer.fallInterval).callback=(elapsed)=>{order.push('enemy');falling(elapsed);};`);
  g.frame(16);
  assert.equal(g.run('order.join(",")'), 'enemy,shot');
});
