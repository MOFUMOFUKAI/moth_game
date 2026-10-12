const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./helpers.cjs');

test('moth atlas shows idle, left and right rows without changing movement or collision size', () => {
  const g = createGame(); g.run('startGame()');
  assert.equal(g.run('player.style.backgroundSize'), '192px 192px');
  assert.equal(g.run('player.mothRow'), 0);
  const initialX = g.run('playerX');
  g.run('keyPressed.ArrowLeft=true'); g.advance(1000/60);
  assert.equal(g.run('player.mothRow'), 1); assert.ok(Math.abs(g.run('playerX') - (initialX - 3)) < 0.001);
  g.run('keyPressed.ArrowLeft=false; keyPressed.ArrowRight=true'); g.advance(1000/60);
  assert.equal(g.run('player.mothRow'), 2); assert.ok(Math.abs(g.run('playerX') - initialX) < 0.001);
  g.run('keyPressed.ArrowRight=false'); g.advance(1000/60); assert.equal(g.run('player.mothRow'), 0);
  assert.equal(g.run('player.offsetWidth'), 48); assert.equal(g.run('hitbox.offsetWidth'), 35);
});

test('flutter uses all four columns and never enters the empty fourth row', () => {
  const g = createGame(); g.run('startGame()');
  const expected = [0,1,2,3,2,1,0];
  expected.forEach((col, index) => {
    g.run(`runtimeTime=${index * 100}; updateMothAnimation()`);
    assert.equal(g.run('player.mothCol'), col); assert.equal(g.run('player.mothRow'), 0);
  });
  g.run('keyPressed.ArrowLeft=true; keyPressed.ArrowRight=true; updateMothAnimation()');
  assert.equal(g.run('player.mothRow'), 0);
});

test('touch holds select movement rows; pause freezes the moth and replay resets it', () => {
  const g = createGame(); g.run('startGame(); startTouchHold("ArrowRight")'); g.advance(120);
  assert.equal(g.run('player.mothRow'), 2); const col = g.run('player.mothCol');
  g.run('pauseGame()'); g.advance(5000);
  assert.equal(g.run('player.mothRow'), 2); assert.equal(g.run('player.mothCol'), col);
  g.run('resumeGame()'); g.advance(20); assert.equal(g.run('player.mothRow'), 0);
  g.run('startTouchHold("ArrowLeft")'); g.advance(20); assert.equal(g.run('player.mothRow'), 1);
  g.run('endGame(); startGame()');
  assert.equal(g.run('player.mothRow'), 0); assert.equal(g.run('player.mothCol'), 0);
});

test('dodge and afterimages use new atlas with the correct direction, then return to idle', () => {
  for (const [direction, row] of [['ArrowLeft',1],['ArrowRight',2]]) {
    const g = createGame(); g.run(`startGame(); dodge('${direction}')`);
    assert.equal(g.run('player.mothRow'), row);
    const afterimages = g.elements.get('game').querySelectorAll('.afterimage');
    assert.equal(afterimages.length, 2);
    for (const image of afterimages) {
      assert.equal(image.style.backgroundImage, 'url(assets/images/chr_moym_animation.png)');
      assert.equal(image.style.backgroundSize, '160px 160px');
      assert.equal(image.style.backgroundPosition, `0px ${-row*40}px`);
    }
    const opposite = direction === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    g.run(`keyPressed.${opposite}=true`); g.advance(20);
    assert.equal(g.run('player.mothRow'), row === 1 ? 2 : 1);
    g.run(`keyPressed.${opposite}=false`);
    g.advance(320); assert.equal(g.run('player.mothRow'), 0);
    assert.equal(g.elements.get('game').querySelectorAll('.afterimage').length, 0);
  }
});
