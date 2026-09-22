import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame} from '../dist/snake-engine.mjs';
import {updateCake} from '../dist/cake-finale.mjs';
test('cake cycles repeat: first four are unique, later rolls can repeat, with 60-second spawn spacing',()=>{
 let seed=81;const g=new SnakeGame({width:1400,height:1000,origin:{x:100,y:100},random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});g.freePoint=()=>({x:900,y:700});g.arena.order=[6,7,8,9];g.random=()=>.1;let lastCakeAt;
 for(let round=0;round<3;round++){
  const kinds=[];
  for(let i=0;i<4;i++){
   assert.equal(g.nextBoss,round===0?90+i*90:lastCakeAt+(i+1)*60);g.age=g.nextBoss;assert(g.spawnBoss());const boss=g.enemies.find(e=>e.kind>=6&&e.kind<=9);kinds.push(boss.kind);g.killEnemy(boss,'knife');if(boss.kind===8)g.killEnemy(boss,'egg-wall');if(boss.kind===9){const castle=g.enemies.find(e=>e.kind===10);g.killEnemy(castle,'attached-dynamite');}assert.equal(g.arena.defeated.size,i+1);
  }
  assert.deepEqual(kinds,round===0?[6,7,8,9]:[6,6,6,6]);assert.equal(g.nextBoss,Infinity);g.age+=7;g.arena.checkCake();const c=g.arena.cake;assert(c);g.age=c.born+8.5;c.landed=true;c.collectAt=g.age;g.body=[{x:c.x,y:c.y+30}];updateCake(g.arena);lastCakeAt=g.age;assert.equal(g.cakesEaten,round+1);assert.equal(g.bossKills,(round+1)*4);g.age+=4;updateCake(g.arena);assert.equal(g.arena.round,round+1);assert.equal(g.arena.defeated.size,0);assert.equal(g.nextBoss,lastCakeAt+60);g.arena.checkCake();assert(!g.arena.cake);g.food=[];
 }
 assert.equal(g.bossKills,12);assert.equal(g.cakesEaten,3);
});
