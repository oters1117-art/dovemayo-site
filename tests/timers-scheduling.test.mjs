import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,FOOD} from '../dist/snake-engine.mjs';
import {updateCake} from '../dist/cake-finale.mjs';
function fresh(){let seed=429;const g=new SnakeGame({width:1400,height:1000,origin:{x:100,y:100},random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});g.food=[];g.nextRefill=g.nextEnemy=Infinity;g.musicPads.nextPlacement=Infinity;g.debugInvincible=true;g.speed=0;return g;}
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const stop=g=>{g.eatFood({kind:FOOD.TOMATO});g.eatFood({kind:FOOD.EGGPLANT});};
test('buffs last ten seconds, eggplant four and poison six',()=>{
 for(const [food,kind] of [[FOOD.CHILI,'red'],[FOOD.BLUEBERRY,'blue'],[FOOD.TOMATO,'rainbow'],[FOOD.BEER,'orange'],[FOOD.EGGPLANT,'purple']]){const g=fresh();g.age=20;g.eatFood({kind:food});assert.equal(g.buffKind,kind);const end=kind==='purple'?24:30;assert.equal(g.buff.until,end);g.age=end-.01;assert.equal(g.buffKind,kind);g.age=end;assert.equal(g.buffKind,null);}
 const g=fresh();g.age=3;g.puddles=[{...g.body[0],radius:52,until:20}];g.step(.1);assert.equal(g.buffKind,'green');close(g.buff.until-g.age,6);g.puddles=[];g.age=g.buff.until;assert.equal(g.buffKind,null);
});
test('all combos reset to ten seconds in either order',()=>{
 for(const food of [FOOD.CHILI,FOOD.BLUEBERRY,FOOD.BEER,FOOD.EGGPLANT])for(const reverse of [false,true]){const g=fresh();g.eatFood({kind:reverse?food:FOOD.TOMATO});g.age=2;g.eatFood({kind:reverse?FOOD.TOMATO:food});assert(g.activeCombo);assert.equal(g.buff.until,12);g.age=5;g.eatFood({kind:food});assert.equal(g.buff.until,15);g.age=15;assert.equal(g.activeCombo,null);}
});
test('bomb fuse resumes its remaining time after stop expires',()=>{
 const g=fresh();g.age=1;const b={x:700,y:700,born:0,armed:.6};g.bombs=[b];stop(g);g.step(9.8);assert(g.bombs.includes(b));close(g.age-b.armed,.4);g.step(.4);assert(g.bombs.includes(b));close(g.age-b.armed,.6);g.step(.36);assert(!g.bombs.includes(b));assert.equal(g.events.filter(e=>e.type==='blast').length,1);
});
test('contact blasts and chains wait for time stop with no duplicate explosions',()=>{
 const g=fresh(),a={x:600,y:600,born:0,armed:null},b={x:650,y:600,born:0,armed:null};g.bombs=[a,b];stop(g);g.explode(a);g.explode(a);g.step(9.9);assert.equal(g.bombs.length,2);assert(!g.events.some(e=>e.type==='blast'));g.step(.2);assert.equal(g.bombs.length,0);assert.equal(g.events.filter(e=>e.type==='blast').length,2);g.explode(a);assert.equal(g.events.filter(e=>e.type==='blast').length,2);
});
test('attached and black-hole dynamite pause fuse and warning progress',()=>{
 for(const warning of [false,true])for(const blackhole of [false,true]){if(blackhole&&!warning)continue;const g=fresh();g.age=1;stop(g);const r={type:'dynamite',x:850,y:750,attached:{x:844,y:744,kind:0},installed:0,fuse:warning?.5:2};if(warning)r.warnAt=.6;if(blackhole)r.blackholeArmed=true;g.arena.relics=[r];g.step(9.8);assert(g.arena.relics.includes(r));close(r.fuse,warning?10.3:11.8);if(warning)close(g.age-r.warnAt,.4);g.step(warning?.7:2.1);assert(!g.arena.relics.includes(r));assert.equal(g.events.filter(e=>e.type==='dynamite-blast').length,1);}
});
test('boss scan finds safe space even if random candidates repeatedly miss it',()=>{
 const g=fresh();g.random=()=>0;assert.equal(g.freePoint(160,46),null);const p=g.freePoint(160,46,true);assert(p);assert(!g.blocked(p,46));assert(g.spawnBoss(false,6));
});
test('failed castle placement rolls back king without consuming its boss slot',()=>{
 const g=fresh();g.arena.order=[9,6,7,8];const original=g.freePoint.bind(g);let calls=0;g.freePoint=()=>++calls===1?{x:800,y:700}:null;assert.equal(g.spawnBoss(),false);assert.equal(g.enemies.length,0);assert.equal(g.arena.spawned,0);assert.equal(g.nextBoss,60);assert.equal(g.events.length,0);g.freePoint=original;assert(g.spawnBoss());assert.equal(g.arena.spawned,1);assert(g.enemies.some(e=>e.kind===9));assert(g.enemies.some(e=>e.kind===10));
});
test('tick retries crowded boss spawns and preserves first and repeat-round schedules',()=>{
 const g=fresh();g.arena.order=[6,7,8,9];g.updateEnemy=()=>{};g.arena.updateEnemy=()=>{};const original=g.freePoint.bind(g);g.freePoint=()=>null;g.age=59.99;g.step(.02);assert.equal(g.arena.spawned,0);assert(g.nextBoss<60.51);g.freePoint=original;g.age=g.nextBoss-.01;g.step(.02);assert.equal(g.arena.spawned,1);assert.equal(g.nextBoss,150);
 for(const due of [150,240,330]){g.age=due-.01;const before=g.arena.spawned;g.step(.005);assert.equal(g.arena.spawned,before);g.step(.02);assert.equal(g.arena.spawned,before+1);}
 assert.equal(new Set(g.enemies.filter(e=>[6,7,8,9].includes(e.kind)).map(e=>e.kind)).size,4);assert.equal(g.nextBoss,Infinity);
 for(const e of [...g.enemies])if(e.kind>=6&&e.kind<=10){g.killEnemy(e,e.kind===10?'attached-dynamite':'knife');if(e.state==='egg')g.killEnemy(e,'egg-wall');}assert.equal(g.arena.defeated.size,4);const due=g.arena.cakeAt;g.age=due-.01;g.arena.checkCake();assert(!g.arena.cake);g.age=due;g.arena.checkCake();assert(g.arena.cake);
 const c=g.arena.cake;c.landed=true;c.collectAt=g.age;g.body=[{x:c.x,y:c.y+30}];updateCake(g.arena);const eaten=g.age;g.age+=4;updateCake(g.arena);assert.equal(g.nextBoss,eaten+60);assert.equal(g.arena.round,1);g.random=()=>.1;
 for(let i=1;i<=4;i++){g.age=eaten+i*60-.01;g.step(.02);assert.equal(g.arena.spawned,i);assert(g.enemies.some(e=>e.kind===6));}assert.equal(g.nextBoss,Infinity);
});
