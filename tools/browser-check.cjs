const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const failures = [];
  const output = path.resolve(__dirname, '../test-results');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const [label, viewport, touch] of [
      ['desktop', { width: 1000, height: 900 }, false],
      ['mobile', { width: 390, height: 844 }, true],
      ['narrow', { width: 320, height: 740 }, true]
    ]) {
      const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(label + ': ' + error.message));
      page.on('response', response => { if (response.status() >= 400) failures.push(label + ': ' + response.status() + ' ' + response.url()); });
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173/');
      await page.screenshot({ path: path.join(output, label + '-title.png') });
      assert.equal(await page.locator('#nameEntryScreen').isVisible(), false);
      const logo = await page.locator('#titleLogo').boundingBox();
      assert.ok(logo.x >= 0 && logo.x + logo.width <= viewport.width + 1, 'title fits ' + label);
      if (touch) await page.locator('#pressToStart').tap(); else await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
      assert.equal(await page.evaluate(() => gameStarted && !gameOver), true);
      await page.evaluate(() => { setSuperInvincible(60000); });
      await page.screenshot({ path: path.join(output, label + '-playing.png') });
      await page.locator('#pauseButton').click();
      const paused = await page.evaluate(() => ({ time: gameTime, score, offset: backgroundOffset, positions: allObstacles.map(o => o.style.top) }));
      await page.waitForTimeout(350);
      const frozen = await page.evaluate(() => ({ time: gameTime, score, offset: backgroundOffset, positions: allObstacles.map(o => o.style.top) }));
      assert.deepEqual(frozen, paused);
      await page.locator('#resumeButton').click();
      await page.waitForFunction(time => gameTime > time, paused.time, { timeout: 5000 });
      // Exercise the real touch listener and release (the keyboard shares its movement loop).
      if (touch) {
        await page.locator('#btnLeft').dispatchEvent('touchstart');
        await page.waitForTimeout(100);
        await page.locator('#btnLeft').dispatchEvent('touchend');
      } else {
        await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100); await page.keyboard.up('ArrowLeft');
      }
      assert.ok(await page.evaluate(() => playerX < 180));
      for (const scoreValue of [75000, 150000, 250000, 600000]) {
        await page.evaluate(value => { score = value; checkStage(); }, scoreValue);
        await page.waitForTimeout(800);
      }
      await page.evaluate(() => { score = 400000; gameTime = 100000; endGame(); });
      await page.waitForTimeout(650);
      assert.equal(await page.locator('#nameEntryScreen').isVisible(), true);
      for (let n = 0; n < 4; n++) await page.locator('#confirmButton').click();
      assert.ok(await page.evaluate(() => localStorage.getItem(HIGH_SCORE_KEY).includes('AAAA')));
      await page.locator('#restartButton').click();
      assert.equal(await page.evaluate(() => justParryRadius), 40);
      assert.equal(await page.evaluate(() => superInvincible), false);
      for (let n = 0; n < 5; n++) { await page.evaluate(() => { score = 0; endGame(); }); await page.locator('#restartButton').click(); }
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => gameTime >= 0));
      for (const id of ['btnLeft', 'btnRight', 'btnParry']) {
        const bounds = await page.locator('#' + id).boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, 'controls fit ' + label + '/' + id);
      }
      await page.screenshot({ path: path.join(output, label + '-replay.png') });
      console.log(label + ': start/pause/resume/input/all stages/ranking/6 replays passed');
      await context.close();
    }
    assert.deepEqual(failures, []);
    console.log('No page errors or failed resource requests. Screenshots: ' + output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
