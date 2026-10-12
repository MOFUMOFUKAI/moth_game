const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('replay keeps one animation loop and resets time, level radius and transient state', () => {
  const g = createGame(); g.run('startGame()'); g.advance(150);
  g.run('pauseGame()'); g.advance(5000); g.run('resumeGame(); justParryRadius=52; currentComboCount=4; endGame(); startGame(); updateTime()');
  assert.equal(g.run('gameTime'), 0); assert.equal(g.run('justParryRadius'), 40);
  assert.equal(g.run('currentComboCount'), 0); assert.equal(g.frames.length, 1);
  const count = g.run('gameTimers.size');
  for (let n = 0; n < 10; n++) g.run('endGame(); startGame()');
  assert.equal(g.run('gameTimers.size'), count); assert.equal(g.frames.length, 1);
});

test('automatic pause freezes enemies, reflected shots, invulnerability, score and time', () => {
  const g = createGame(); g.run('startGame(); createObstacle(); allObstacles[0].style.top="300px"; reflectObstacle(allObstacles[0], true); setSuperInvincible(1000)');
  const y = g.run('allObstacles[0].style.top');
  g.document.hidden = true; g.dispatch(g.document, 'visibilitychange'); g.advance(5000);
  assert.equal(g.run('isPaused'), true); assert.equal(g.run('gameTime'), 0);
  assert.equal(g.run('allObstacles[0].style.top'), y); assert.equal(g.run('superInvincible'), true);
  g.document.hidden = false; g.dispatch(g.document, 'visibilitychange');
  assert.equal(g.run('isPaused'), true); g.run('resumeGame()'); g.advance(100);
  assert.ok(Math.abs(g.run('gameTime') - 100) < 0.01); assert.notEqual(g.run('allObstacles[0].style.top'), y);
});

test('enemy disposal releases list, timers and rainbow count exactly once', () => {
  const g = createGame(); g.run('startGame(); createObstacle(); const shot=allObstacles[0]; reflectObstacle(shot,true); removeObstacle(shot); removeObstacle(shot)');
  assert.equal(g.run('allObstacles.length'), 0); assert.equal(g.run('comboReflectedCount'), 0);
  assert.equal(g.run('gameTimers.has(shot.moveInterval)'), false);
});

test('normal reflected shot cannot hit another target after being destroyed', () => {
  const g = createGame();
  g.run(`startGame(); createObstacle(); createObstacle(); createObstacle();
    allObstacles.forEach(o => { o.style.left='0px'; o.style.top='300px'; o.dataset.hp=1; });
    const shot=allObstacles[0]; reflectObstacle(shot,false);`);
  g.run('gameTimers.get(shot.moveInterval).callback()');
  assert.equal(g.run('allObstacles.length'), 1); assert.equal(g.run('score'), 500);
});

test('a fast reflected shot still hits when two enemies cross between updates', () => {
  const g = createGame();
  g.run(`startGame(); createObstacle(); createObstacle();
    const shot=allObstacles[0]; const target=allObstacles[1];
    shot.style.left=target.style.left='0px'; shot.style.top='300px';
    target.previousY=220; target.style.top='350px';
    shot.dataset.hp=target.dataset.hp=1; reflectObstacle(shot,false);
    gameTimers.get(shot.moveInterval).callback();`);
  assert.equal(g.run('allObstacles.length'), 0);
});

test('keyboard and touch holds share time-based movement at 60 and 120Hz', () => {
  const positions = [];
  for (const hz of [60, 120]) {
    const g = createGame(); g.run('startGame(); keyPressed.ArrowRight=true'); g.advance(500, 1000 / hz); positions.push(g.run('playerX'));
  }
  assert.ok(Math.abs(positions[0] - positions[1]) < 0.001);
  const g = createGame(); g.run('startGame(); startTouchHold("ArrowRight")'); g.advance(1000 / 60);
  assert.ok(Math.abs(g.run('playerX') - 183) < 0.001);
});

test('touch double tap dodges on press, not on long-hold release; movement fits narrow screen', () => {
  const g = createGame({ width: 320 }); g.run('startGame()');
  const left = g.elements.get('btnLeft');
  g.dispatch(left, 'touchstart'); g.dispatch(left, 'touchend'); g.advance(100);
  g.dispatch(left, 'touchstart'); assert.equal(g.run('isDodging'), true);
  g.dispatch(left, 'touchend'); g.advance(350);
  g.run('playerX=10000; stepMove("ArrowRight")'); assert.equal(g.run('playerX'), 272);
});

test('overlapping invulnerability does not expire early or duplicate orbs', () => {
  const g = createGame(); g.run('startGame(); setInvincible(1000)'); g.advance(100); g.run('setInvincible(200)'); g.advance(300);
  assert.equal(g.run('invincible'), true); g.advance(650); assert.equal(g.run('invincible'), false);
  g.run('setSuperInvincible(1000)'); g.advance(500); g.run('setSuperInvincible(1000)'); g.advance(550);
  assert.equal(g.run('superInvincible'), true); assert.equal(g.elements.get('player').querySelectorAll('.invincible-orb').length, 2);
  g.advance(500); assert.equal(g.run('superInvincible'), false); assert.equal(g.elements.get('player').querySelectorAll('.invincible-orb').length, 0);
});

test('replay restores periodic item spawning and BGM transitions have one owner', () => {
  const g = createGame(); g.run('startGame(); endGame(); startGame(); lives=1; Math.random=()=>0;'); g.advance(2501);
  assert.ok(g.run('itemFallTimers.length') > 0);
  g.run('score=75000; checkStage()'); assert.equal(g.run('currentBGM===bgm.Stage2'), true);
  g.run('score=150000; checkStage()'); assert.equal(g.run('currentBGM===bgm.Stage3'), true); assert.equal(g.audioTimers.size, 1);
});

test('game over freezes final score and replay clears pending name entry', () => {
  const g = createGame(); g.run('startGame(); gameTime=100000; score=400000; endGame()');
  const score = g.run('score'); g.advance(600); assert.equal(g.run('score'), score); assert.equal(g.run('enteringName'), true);
  g.run('confirmNameEntry(); confirmNameEntry(); confirmNameEntry(); confirmNameEntry(); startGame()');
  assert.equal(g.run('enteringName'), false); assert.equal(g.run('score'), 0);
});

test('corrupt or unavailable storage cannot prevent startup; names render as text', () => {
  for (const options of [{ storage: { yamamayu_high_scores: 'bad JSON' } }, { storageThrows: true }]) {
    const g = createGame(options); g.run('startGame(); saveHighScores(highScores)'); assert.equal(g.run('gameStarted'), true);
  }
  const g = createGame({ storage: { yamamayu_high_scores: JSON.stringify([{ name:'<img', score:400000, rating:'SS' }]) } });
  g.run('displayHighScores()'); assert.equal(g.elements.get('scoreList').children[1].textContent, '1. <img：400000（SS）');
  assert.equal(g.run('getRating(100,0)'), 'E');
});

test('all items survive normal and rainbow reflected shots and can still be collected', () => {
  for (const type of ['heart', 'goldHeart', 'lemon', 'grape']) {
    for (const rainbow of [false, true]) {
      const g = createGame();
      g.run(`startGame(); Math.random=()=>0; lives=1;
        ${type === 'lemon' ? 'lives=maxLives;' : ''}
        ${type === 'grape' ? 'level=maxLevel;' : ''}
        createObstacle(); reflectObstacle(allObstacles[0], ${rainbow});
        spawnFallingItem('${type}');
        const pickup=game.querySelector('.heal');
        const fallId=itemFallTimers[0];
        allObstacles[0].getBoundingClientRect=()=>pickup.getBoundingClientRect();
        gameTimers.get(fallId).callback();`);
      assert.equal(g.run('pickup.parentElement===game'), true, `${type}/${rainbow} survives`);
      assert.equal(g.run('gameTimers.has(fallId)'), true);
      g.run('pickup.getBoundingClientRect=()=>hitbox.getBoundingClientRect(); gameTimers.get(fallId).callback();');
      assert.equal(g.run('pickup.parentElement'), null, `${type}/${rainbow} collected`);
      assert.equal(g.run('gameTimers.has(fallId)'), false);
      if (type === 'heart') assert.equal(g.run('lives'), 2);
      if (type === 'goldHeart') assert.equal(g.run('lives'), g.run('maxLives'));
      if (type === 'lemon') assert.equal(g.run('score'), 10000);
      if (type === 'grape') { assert.equal(g.run('score'), 15000); assert.equal(g.run('superInvincible'), true); }
    }
  }
});
