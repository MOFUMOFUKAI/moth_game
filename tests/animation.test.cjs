const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');
const metadata = require('../docs/enemy-atlas-timing.json');
const colorNames = { R: 'red', G: 'green', B: 'blue' };
const cases = [
  ['small_R',1,0.2,60,1], ['small_B',2,0.2,60,1], ['small_G',4,0.8,60,1],
  ['big_R',1,0.8,92,2], ['big_B',2,0.8,92,2], ['big_G',3,0.2,92,2],
  ['huge_R',4,0.2,172,3], ['huge_B',4,0.35,172,3], ['huge_G',3,0.9,172,3]
];

for (const [key, stage, random, dimension, hp] of cases) {
  const reference = metadata.find(item => item.key === key);
  test(key + ': correct atlas, display size, HP and original playback timeline', () => {
    const g = createGame();
    g.run('startGame(); stage=' + stage + '; Math.random=()=> ' + random + '; createObstacle(); const enemy=allObstacles[0];');
    assert.equal(g.run('enemy.style.backgroundImage'), 'url(assets/images/' + reference.name + ')');
    assert.equal(g.run('enemy.style.backgroundSize'), (dimension * reference.columns) + 'px ' + (dimension * reference.rows) + 'px');
    assert.equal(g.run('enemy.style.width'), dimension + 'px');
    assert.equal(g.run('enemy.dataset.hitboxW'), dimension);
    assert.equal(g.run('enemy.dataset.hp'), hp);
    const [size, color] = key.split('_');
    const config = 'ENEMY_ANIMATIONS[' + JSON.stringify(size + ':' + colorNames[color]) + ']';
    let elapsed = 0;
    reference.sequence.forEach((cell, index) => {
      assert.equal(g.run('enemyAnimationFrame(' + config + ',' + elapsed + ')'), cell);
      assert.equal(g.run('enemyAnimationFrame(' + config + ',' + (elapsed + reference.durations[index] - 1) + ')'), cell);
      elapsed += reference.durations[index];
    });
    assert.equal(g.run('enemyAnimationFrame(' + config + ',' + reference.loopDuration + ')'), 0);
    assert.ok(Math.max(...reference.sequence) < reference.columns * reference.rows);
    if (size === 'huge') assert.equal(reference.sequence.includes(7), false, 'empty eighth cell never shown');
  });

  test(key + ': pauses, resumes, reflects and resets without another animation timer', () => {
    const g = createGame();
    g.run('startGame(); stage=' + stage + '; Math.random=()=> ' + random + '; createObstacle(); const enemy=allObstacles[0];');
    g.advance(reference.durations[0] + 20);
    const timerCount = g.run('gameTimers.size');
    const frame = g.run('enemy.animationFrame');
    assert.equal(frame, 1);
    g.run('pauseGame()'); g.advance(5000);
    assert.equal(g.run('enemy.animationFrame'), frame);
    assert.equal(g.run('gameTimers.size'), timerCount);
    g.run('resumeGame(); enemy.style.top="300px"; reflectObstacle(enemy,true)');
    g.advance(reference.durations[1] + 20);
    assert.notEqual(g.run('enemy.animationFrame'), frame);
    assert.equal(g.run('enemy.style.backgroundImage'), 'url(assets/images/' + reference.name + ')');
    g.run('endGame(); startGame(); stage=' + stage + '; Math.random=()=> ' + random + '; createObstacle();');
    assert.equal(g.run('allObstacles[0].animationFrame'), 0);
  });
}
