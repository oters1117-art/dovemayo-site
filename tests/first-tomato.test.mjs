import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,FOOD} from '../dist/snake-engine.mjs';
function fresh(){let seed=429;const g=new SnakeGame({width:1400,height:1000,origin:{x:100,y:100},random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});g.food=[];g.firstTomatoSpawned=false;g.nextRefill=0;return g;}
test('first tomato boost ends during the same refill as soon as one appears',()=>{
 const g=fresh();g.random=()=>.09;let x=500;g.freePoint=()=>({x:x+=50,y:400});g.refill();
 assert.equal(g.food.length,4);assert.deepEqual(g.food.map(f=>f.kind),[FOOD.TOMATO,4,4,4]);assert(g.firstTomatoSpawned);
 g.food=[];g.refill();assert(g.food.every(f=>f.kind===4));
});
test('the first-appearance weighting remains uniform for non-tomatoes and restores all 47 foods',()=>{
 const g=fresh();const counts=Array(47).fill(0);for(let i=0;i<4600;i++){g.random=()=>(i+.5)/4600;counts[g.nextFoodKind()]++;}
 assert.equal(counts[FOOD.TOMATO],460);assert(counts.every((n,i)=>i===FOOD.TOMATO||n===90));
 g.addFood({x:500,y:400,kind:FOOD.TOMATO});for(let i=0;i<47;i++){g.random=()=>(i+.5)/47;assert.equal(g.nextFoodKind(),i);}
});
test('elapsed time does not force a tomato or add a fifth food',()=>{
 const g=fresh();g.nextFoodKind=()=>0;g.refill();const previous=[...g.food];g.speed=0;g.debugInvincible=true;g.nextEnemy=g.nextBoss=g.nextKnife=Infinity;g.musicPads.nextPlacement=Infinity;g.arena.ensureDynamite=()=>{};
 g.age=54.9;g.step(.2);g.age=59.9;g.step(.2);g.age=119.9;g.step(.2);
 assert.deepEqual(g.food,previous);assert.equal(g.food.length,4);assert(!g.firstTomatoSpawned);
});
test('boss drops and special spawns also end the initial boost before collection',()=>{
 for(const spawn of [g=>g.dropBossTomatoes({x:650,y:500}),g=>g.arena.drop(FOOD.TOMATO,{x:650,y:500}),g=>g.spawnSpecial()]){
  const g=fresh();spawn(g);assert(g.firstTomatoSpawned);g.food=[];g.random=()=>.1;assert.equal(g.nextFoodKind(),4);assert.equal(g.food.length,0);
 }
});
