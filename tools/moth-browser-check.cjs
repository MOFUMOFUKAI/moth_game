const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const output = path.resolve(__dirname, '../test-results'); fs.mkdirSync(output, { recursive: true });
  for (const [label, width, touch] of [['desktop',1000,false],['mobile',390,true],['narrow',320,true]]) {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: touch, hasTouch: touch });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173/');
      if (touch) await page.locator('#pressToStart').tap(); else await page.keyboard.press('Enter');
      await page.waitForTimeout(850);
      await page.evaluate(() => { superInvincible = true; });
      assert.equal(await page.evaluate(() => player.getBoundingClientRect().width), 48);
      assert.equal(await page.evaluate(() => hitbox.getBoundingClientRect().width), 35);
      assert.equal(await page.evaluate(() => getComputedStyle(player).imageRendering), 'pixelated');
      assert.equal(await page.evaluate(() => getComputedStyle(player).backgroundImage.includes('chr_moym_animation.png')), true);
      await page.waitForFunction(() => player.mothCol > 0);
      if (touch) await page.locator('#btnLeft').dispatchEvent('touchstart'); else await page.keyboard.down('ArrowLeft');
      await page.waitForFunction(() => player.mothRow === 1);
      await page.screenshot({ path: path.join(output, 'moth-' + label + '-left.png') });
      if (touch) await page.locator('#btnLeft').dispatchEvent('touchend'); else await page.keyboard.up('ArrowLeft');
      await page.waitForFunction(() => player.mothRow === 0);
      if (touch) await page.locator('#btnRight').dispatchEvent('touchstart'); else await page.keyboard.down('ArrowRight');
      await page.waitForFunction(() => player.mothRow === 2);
      await page.locator('#pauseButton').click();
      const frame = await page.evaluate(() => [player.mothRow, player.mothCol]);
      await page.waitForTimeout(400);
      assert.deepEqual(await page.evaluate(() => [player.mothRow, player.mothCol]), frame);
      if (touch) await page.locator('#btnRight').dispatchEvent('touchend'); else await page.keyboard.up('ArrowRight');
      await page.locator('#resumeButton').click();
      await page.waitForFunction(() => player.mothRow === 0);
      await page.evaluate(() => { lastKey = ''; });
      if (touch) {
        await page.locator('#btnLeft').dispatchEvent('touchstart'); await page.locator('#btnLeft').dispatchEvent('touchend');
        await page.locator('#btnLeft').dispatchEvent('touchstart');
      } else { await page.keyboard.press('ArrowLeft'); await page.keyboard.down('ArrowLeft'); }
      assert.equal(await page.evaluate(() => isDodging), true);
      assert.equal(await page.evaluate(() => player.mothRow), 1);
      const ghosts = await page.evaluate(() => [...game.querySelectorAll('.afterimage')].map(el => el.style.backgroundImage));
      assert.equal(ghosts.length, 2); assert.ok(ghosts.every(image => image.includes('chr_moym_animation.png')));
      if (touch) await page.locator('#btnLeft').dispatchEvent('touchend'); else await page.keyboard.up('ArrowLeft');
      await page.waitForFunction(() => !isDodging && player.mothRow === 0);
      await page.evaluate(() => { score = 0; endGame(); });
      await page.locator('#restartButton').click();
      assert.equal(await page.evaluate(() => player.mothRow), 0);
      assert.equal(await page.evaluate(() => player.mothCol), 0);
      await page.screenshot({ path: path.join(output, 'moth-' + label + '-replay.png') });
      assert.deepEqual(errors, []);
      console.log(label + ': idle/left/right/pause/dodge/afterimage/replay passed');
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
