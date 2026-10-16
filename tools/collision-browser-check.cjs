const assert = require('node:assert/strict');
const { chromium }=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
 for(const width of [320,390,1000]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173/');
  await page.locator('#pressToStart').click();
  const result=await page.evaluate(()=>{
   clearGameTimer(obstacleSpawnInterval);createObstacle();const enemy=allObstacles[0];clearGameTimer(enemy.fallInterval);
   let maxError=0,mismatches=0,total=0;
   for(const size of [60,92,172])for(const x of [-40.7,10,80.1,140.7])for(const y of [-100.3,30,100.3,250.9]) {
    enemy.style.width=enemy.style.height=size+'px';enemy.style.left=x+'px';enemy.style.top=y+'px';
    beginCollisionFrame();
    for(const dy of [0,2,5.1,5.7,22.5,45,90]) {
     enemy.style.top=(y+dy)+'px';player.style.left=(x+dy)+'px';hitbox.style.left=(x+dy+4)+'px';
     for(const el of [enemy,player,hitbox]) {
      const actual=el.getBoundingClientRect(),cached=getCollisionRect(el);
      for(const key of ['left','right','top','bottom','width','height'])maxError=Math.max(maxError,Math.abs(actual[key]-cached[key]));
     }
     const native=enemy.getBoundingClientRect(),cached=getAdjustedRect(enemy);
     for(const px of [native.left-55,native.left-40,native.left,native.right+40,native.right+55]) {
      const py=native.bottom;
      const distance=r=>Math.hypot(Math.max(r.left-px,0,px-r.right),Math.max(r.top-py,0,py-r.bottom));
      for(const radius of [40,52,55]){total++;if((distance(native)<=radius)!==(distance(cached)<=radius))mismatches++;}
     }
    }
    endCollisionFrame();
   }
   return {maxError,mismatches,total};
  });
  console.log(width,result);assert.ok(result.maxError<0.000001);assert.equal(result.mismatches,0);
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
