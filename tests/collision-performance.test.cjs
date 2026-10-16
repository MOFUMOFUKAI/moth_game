const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('catch-up physics uses current positions without requesting layout after every movement', () => {
  const g = createGame();
  g.run(`startGame(); clearGameTimer(obstacleSpawnInterval); createObstacle();
    const enemy = allObstacles[0]; let reads = 0;
    const measure = enemy.getBoundingClientRect.bind(enemy);
    enemy.getBoundingClientRect = () => { reads++; return measure(); };
    const fall = gameTimers.get(enemy.fallInterval).callback;
    beginCollisionFrame(); reads = 0;
    const initialY = getCollisionRect(enemy).top;
    fall(); fall(); fall();
    const finalY = getCollisionRect(enemy).top;
    const layoutReads = reads;
    const actualY = measure().top;
    endCollisionFrame();`);
  assert.equal(g.run('layoutReads'), 0);
  assert.ok(g.run('finalY > initialY'));
  assert.equal(g.run('finalY'), g.run('actualY'));
  assert.equal(g.run('collisionFrame'), null);
});

test('moving player and hitbox are not frozen at their frame-start positions', () => {
  const g = createGame();
  g.run(`startGame(); createObstacle(); beginCollisionFrame();
    const before = getCollisionRect(player).left;
    stepMove('ArrowRight', 2);
    const during = getCollisionRect(player).left;
    const body = getCollisionRect(hitbox).left;
    endCollisionFrame();`);
  assert.equal(g.run('during-before'), 6);
  assert.equal(g.run('body'), g.run('playerX+4'));
});

test('a chain updates gameplay state immediately and writes the final HUD once per frame', () => {
  const g = createGame();
  g.run(`startGame(); let scoreWrites=0, heartWrites=0;
    let scoreText=scoreEl.textContent, heartText=livesEl.textContent;
    Object.defineProperty(scoreEl,'textContent',{get:()=>scoreText,set:value=>{scoreText=value;scoreWrites++;}});
    Object.defineProperty(livesEl,'textContent',{get:()=>heartText,set:value=>{heartText=value;heartWrites++;}});
    beginCollisionFrame();
    for(let i=0;i<20;i++){score+=500;addExp(5);updateUI();}
    const beforeFlush=scoreWrites;
    const immediateExp=exp;
    endCollisionFrame();`);
  assert.equal(g.run('beforeFlush'), 0);
  assert.equal(g.run('immediateExp'), 100);
  assert.equal(g.run('scoreWrites'), 1);
  assert.equal(g.run('heartWrites'), 0);
  assert.equal(g.elements.get('score').textContent, 'スコア: 10000');
});

test('parry boundary, first check delay, cooldown and invulnerability keep their existing rules', () => {
  for (const [distance, expected] of [[40,'just'],[40.01,'normal'],[55,'normal'],[55.01,'miss']]) {
    const g = createGame();
    g.run(`startGame(); clearGameTimer(obstacleSpawnInterval); createObstacle();
      const enemy=allObstacles[0]; clearGameTimer(enemy.fallInterval);
      const p=player.getBoundingClientRect(); const cx=(p.left+p.right)/2,cy=(p.top+p.bottom)/2;
      enemy.getBoundingClientRect=()=>({left:cx+${distance},right:cx+${distance}+60,
        top:cy-30,bottom:cy+30,width:60,height:60});
      activateParry(); const deadline=invincibleUntil;`);
    g.advance(15);
    assert.equal(g.run('enemy.dataset.type'), 'damage');
    g.advance(5);
    assert.equal(g.run('enemy.dataset.type'), expected === 'miss' ? 'damage' : 'reflected', String(distance));
    assert.equal(g.run('!!enemy.rainbowTracked'), expected === 'just');
    assert.equal(g.run('invincibleUntil'), g.run('deadline'));
    assert.equal(g.run('deadline'), 350);
    g.advance(330);
    assert.equal(g.run('invincible'), false);
    g.run('activateParry()');
    assert.equal(g.run('lastParryTime'), 0);
    g.advance(31); g.run('activateParry()');
    assert.equal(g.run('lastParryTime'), g.run('runtimeTime'));
  }
});
