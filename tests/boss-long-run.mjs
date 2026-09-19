import {SnakeGame} from '../dist/snake-engine.mjs';
import assert from 'node:assert/strict';
let seed=18;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const g=new SnakeGame({width:1100,height:900,origin:{x:520,y:140},random,obstacles:[{x:350,y:350,w:90,h:90,radius:18},{x:455,y:350,w:90,h:90,radius:18},{x:560,y:350,w:90,h:90,radius:18}]});
g.graceUntil=1000;g.selfPhase=true;let maxEnemies=0,maxShots=0,bossKinds=new Set(),frameTimes=[];const start=performance.now();
for(let i=0;i<4200;i++){
 g.target=g.angle+.14;
 const began=performance.now();g.step(.1);frameTimes.push(performance.now()-began);
 for(const e of [...g.enemies])if(e.kind>=6&&e.kind<=10){bossKinds.add(e.kind);if(g.age-e.born>22)g.killEnemy(e,e.kind===10?'dynamite':e.state==='egg'?'egg-wall':'knife');}
 for(const p of [...g.enemies,...g.projectiles,...g.food,...g.body])assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert(!g.dead);maxEnemies=Math.max(maxEnemies,g.enemies.length);maxShots=Math.max(maxShots,g.projectiles.length);
}
frameTimes.sort((a,b)=>a-b);assert.equal(g.arena.spawned,4);assert.equal(g.arena.defeated.size,4);assert(g.arena.cake||g.arena.cakeClaimed);
console.log(JSON.stringify({simulatedSeconds:g.age,bossKinds:[...bossKinds],maxEnemies,maxShots,elapsedMs:Math.round(performance.now()-start),p95StepMs:frameTimes[Math.floor(frameTimes.length*.95)].toFixed(2)}));
