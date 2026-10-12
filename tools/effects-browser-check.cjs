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
      await page.evaluate(() => {
        clearGameTimer(obstacleSpawnInterval);
        const random = Math.random; Math.random = () => 0; createObstacle(); Math.random = random;
        window.parryTarget = allObstacles[allObstacles.length - 1];
        clearGameTimer(window.parryTarget.fallInterval);
        window.parryTarget.style.left = player.offsetLeft + 'px';
        window.parryTarget.style.top = (player.offsetTop - 20) + 'px';
      });
      if (touch) await page.locator('#btnParry').tap(); else await page.keyboard.press('f');
      await page.waitForFunction(() => atlasEffects.size === 1);
      await page.evaluate(() => { window.testEffect = [...atlasEffects][0]; });
      assert.equal(await page.evaluate(() => window.parryTarget.rainbowTracked), true);
      assert.equal(await page.evaluate(() => window.testEffect.getBoundingClientRect().width), 60);
      assert.equal(await page.evaluate(() => window.testEffect.style.backgroundImage.includes('eff_just_parry_animation.png')), true);
      await page.waitForFunction(() => [3,4,6].includes(window.testEffect.animationFrame));
      await page.locator('#pauseButton').click();
      const frozen = await page.evaluate(() => window.testEffect.animationFrame);
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(() => window.testEffect.animationFrame), frozen);
      assert.equal(await page.evaluate(() => atlasEffects.size), 1);
      await page.screenshot({ path: path.join(output, 'just-parry-' + label + '.png') });
      await page.locator('#resumeButton').click();
      await page.waitForFunction(() => atlasEffects.size === 0);
      await page.evaluate(() => { showJustParry(); showJustParry(); });
      assert.equal(await page.evaluate(() => atlasEffects.size), 2);
      await page.waitForFunction(() => atlasEffects.size === 0);
      await page.evaluate(() => { showJustParry(); score = 0; endGame(); });
      assert.equal(await page.evaluate(() => atlasEffects.size), 0);
      await page.locator('#restartButton').click();
      assert.equal(await page.evaluate(() => atlasEffects.size), 0);
      assert.deepEqual(errors, []);
      console.log(label + ': real just-parry/size/pause/overlap/expiry/end/replay passed');
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
