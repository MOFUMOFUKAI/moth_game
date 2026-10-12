const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const metadata = require('../docs/enemy-atlas-timing.json');
const cases = [
  ['small_R',1,0.2,60], ['small_B',2,0.2,60], ['small_G',4,0.8,60],
  ['big_R',1,0.8,92], ['big_B',2,0.8,92], ['big_G',3,0.2,92],
  ['huge_R',4,0.2,172], ['huge_B',4,0.35,172], ['huge_G',3,0.9,172]
];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const out = path.resolve(__dirname, '../test-results'); fs.mkdirSync(out, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173/');
    await page.keyboard.press('Enter');
    for (const [key, stage, random, dimension] of cases) {
      const expected = metadata.find(item => item.key === key);
      await page.evaluate(({ stageValue, randomValue }) => {
        [...allObstacles].forEach(removeObstacle);
        stage = stageValue; score = [0,0,75000,150000,250000][stage];
        updateObstacleIntervalByScore(score); clearGameTimer(obstacleSpawnInterval);
        const previous = Math.random; Math.random = () => randomValue; createObstacle(); Math.random = previous;
        window.testEnemy = allObstacles[0]; clearGameTimer(window.testEnemy.fallInterval);
        window.testEnemy.style.left = ((game.clientWidth - window.testEnemy.offsetWidth)/2) + 'px';
        window.testEnemy.style.top = '180px';
      }, { stageValue: stage, randomValue: random });
      const decoded = await page.evaluate(src => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve([image.naturalWidth, image.naturalHeight]); image.onerror = reject; image.src = src;
      }), 'assets/images/' + expected.name);
      assert.deepEqual(decoded, [expected.columns * expected.cellSize, expected.rows * expected.cellSize]);
      await page.waitForTimeout(expected.durations[0] + 30);
      assert.equal(await page.evaluate(() => window.testEnemy.getBoundingClientRect().width), dimension);
      assert.equal(await page.evaluate(() => window.testEnemy.animationFrame >= 1), true);
      await page.locator('#pauseButton').click();
      const paused = await page.evaluate(() => window.testEnemy.style.backgroundPosition);
      await page.waitForTimeout(160);
      assert.equal(await page.evaluate(() => window.testEnemy.style.backgroundPosition), paused);
      await page.screenshot({ path: path.join(out, 'atlas-' + key + '.png') });
      await page.locator('#resumeButton').click();
      await page.evaluate(() => { reflectObstacle(window.testEnemy, true); });
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.testEnemy.dataset.type), 'reflected');
      assert.equal(await page.evaluate(() => window.testEnemy.style.backgroundImage), 'url("assets/images/' + expected.name + '")');
      console.log(key + ': decoded/size/animation/pause/reflection passed');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
