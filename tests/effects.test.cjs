const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('just-parry atlas keeps original position, size, GIF frame order and 580ms lifetime', () => {
  const g = createGame(); g.run('startGame(); showJustParry(); const effect=[...atlasEffects][0]');
  assert.equal(g.run('effect.style.width'), '60px');
  assert.equal(g.run('effect.style.height'), '60px');
  assert.equal(g.run('effect.style.left'), '174px');
  assert.equal(g.run('effect.style.top'), '536px');
  assert.equal(g.run('effect.style.backgroundSize'), '240px 120px');
  assert.equal(g.run('effect.dataset.animation'), 'eff_just_parry');
  const boundaries = [0,80,160,240,280,360,440,520];
  const frames = [0,1,3,4,6,2,0,1];
  boundaries.forEach((time, index) => assert.equal(g.run(`enemyAnimationFrame(JUST_PARRY_ANIMATION,${time})`), frames[index]));
  g.advance(570); assert.equal(g.run('atlasEffects.size'), 1);
  g.advance(20); assert.equal(g.run('atlasEffects.size'), 0); assert.equal(g.run('effect.parentElement'), null);
});

test('just-parry atlas and its expiry freeze during pause and continue on resume', () => {
  const g = createGame(); g.run('startGame(); showJustParry(); const effect=[...atlasEffects][0]');
  g.advance(90); assert.equal(g.run('effect.animationFrame'), 1);
  g.run('pauseGame()'); g.advance(5000);
  assert.equal(g.run('effect.animationFrame'), 1); assert.equal(g.run('atlasEffects.size'), 1);
  g.run('resumeGame()'); g.advance(80); assert.equal(g.run('effect.animationFrame'), 3);
  g.advance(420); assert.equal(g.run('atlasEffects.size'), 0);
});

test('overlapping just-parries own independent clocks and leave no replay references', () => {
  const g = createGame(); g.run('startGame(); showJustParry(); const first=[...atlasEffects][0]');
  g.advance(100); g.run('showJustParry(); const second=[...atlasEffects][1]');
  assert.equal(g.run('first.animationFrame'), 1); assert.equal(g.run('second.animationFrame'), 0);
  g.advance(490); assert.equal(g.run('first.parentElement'), null); assert.equal(g.run('atlasEffects.size'), 1);
  g.run('endGame(); startGame()'); assert.equal(g.run('atlasEffects.size'), 0); assert.equal(g.run('second.parentElement'), null);
  g.run('const effectTimerIds=[]; superInvincible=true');
  for (let i = 0; i < 10; i++) {
    g.run('showJustParry(); effectTimerIds.push([...atlasEffects][0].removalTimer)');
    g.advance(600);
  }
  assert.equal(g.run('atlasEffects.size'), 0);
  // Remove naturally spawned enemies before comparing active gameplay timers.
  g.run('[...allObstacles].forEach(removeObstacle)');
  assert.equal(g.run('effectTimerIds.every(id=>!gameTimers.has(id))'), true);
});

test('successful parry triggers the atlas through the actual collision path', () => {
  const g = createGame();
  g.run(`startGame(); createObstacle(); const enemy=allObstacles[0];
    enemy.getBoundingClientRect=()=>player.getBoundingClientRect(); activateParry();`);
  g.advance(20);
  assert.equal(g.run('enemy.dataset.type'), 'reflected');
  assert.equal(g.run('enemy.rainbowTracked'), true);
  assert.equal(g.run('atlasEffects.size'), 1);
});

test('normal parry and explosion keep position, size, layering and paused lifetime', () => {
  const g = createGame();
  g.run('startGame(); activateParry(); createExplosion(160,200,500,false,false,10); const [parry,bomb]=[...atlasEffects]');
  assert.equal(g.run('parry.dataset.animation'), 'eff_parry');
  assert.equal(g.run('parry.style.width'), '112px');
  assert.equal(g.run('parry.style.backgroundSize'), '336px 336px');
  assert.equal(g.run('bomb.dataset.animation'), 'eff_bomb_L');
  assert.equal(g.run('bomb.style.width'), '100px');
  assert.equal(g.run('bomb.style.left'), '160px');
  assert.equal(g.run('bomb.style.top'), '200px');
  assert.equal(g.run('bomb.style.zIndex'), '10');
  assert.equal(g.run('bomb.style.transform'), 'translate(-50%, -50%)');
  assert.equal(g.run('game.querySelectorAll("[data-transient]").some(el=>el.textContent==="+500\\nEXP+10")'), true);
  g.advance(130); assert.equal(g.run('parry.animationFrame'), 1); assert.equal(g.run('bomb.animationFrame'), 1);
  g.run('pauseGame()'); g.advance(3000);
  assert.equal(g.run('atlasEffects.size'), 2); assert.equal(g.run('parry.animationFrame'), 1);
  g.run('resumeGame()'); g.advance(230);
  assert.equal(g.run('parry.parentElement'), null); assert.equal(g.run('atlasEffects.size'), 1);
  g.advance(50); assert.equal(g.run('atlasEffects.size'), 0);
});

test('both atlas timelines retain all GIF frame durations and hidden explosions stay hidden', () => {
  const g = createGame();
  for (const [config,durations] of [
    ['PARRY_ANIMATION',[120,120,80,120,80,120,80,120,40]],
    ['BOMB_L_ANIMATION',[80,80,80,40,80,80,40,80,80,40,80,40]]
  ]) {
    let elapsed=0;
    durations.forEach((duration,frame) => {
      assert.equal(g.run(`enemyAnimationFrame(${config},${elapsed})`), frame);
      assert.equal(g.run(`enemyAnimationFrame(${config},${elapsed+duration-1})`), frame);
      elapsed += duration;
    });
    assert.equal(g.run(`enemyAnimationFrame(${config},${elapsed})`), 0);
  }
  g.run('startGame(); createExplosion(100,100,100,false,true)');
  assert.equal(g.run('atlasEffects.size'), 0);
  g.run('activateParry(); createExplosion(100,100); endGame(); startGame()');
  assert.equal(g.run('atlasEffects.size'), 0);
});
