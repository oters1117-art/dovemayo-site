import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,FOOD} from '../dist/snake-engine.mjs';
function fresh(){let seed=429;const g=new SnakeGame({width:1400,height:1000,origin:{x:100,y:100},random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});g.food=[];g.firstTomatoSpawned=false;g.nextFirstTomato=55;g.nextRefill=0;return g;}
test('first tomato boost ends during the same refill as soon as one appears',()=>{
 const g=fresh();g.random=()=>.1;let x=500;g.freePoint=()=>({x:x+=50,y:400});g.refill();
 assert.equal(g.food.length,4);assert.deepEqual(g.food.map(f=>f.kind),[FOOD.TOMATO,4,4,4]);assert(g.firstTomatoSpawned);
 g.food=[];g.refill();assert(g.food.every(f=>f.kind===4));
});
test('the first-appearance weighting remains uniform for non-tomatoes and restores all 47 foods',()=>{
 const g=fresh();const counts=Array(47).fill(0);for(let i=0;i<4600;i++){g.random=()=>(i+.5)/4600;counts[g.nextFoodKind()]++;}
 assert.equal(counts[FOOD.TOMATO],920);assert(counts.every((n,i)=>i===FOOD.TOMATO||n===80));
 g.addFood({x:500,y:400,kind:FOOD.TOMATO});for(let i=0;i<47;i++){g.random=()=>(i+.5)/47;assert.equal(g.nextFoodKind(),i);}
});
test('55-second safety spawn works even without eating and never replaces existing food',()=>{
 const g=fresh();g.nextFoodKind=()=>0;g.refill();const previous=[...g.food];assert(!g.firstTomatoSpawned);g.age=54.99;g.ensureFirstTomato();assert.equal(g.food.length,4);
 g.age=55;g.ensureFirstTomato();assert.equal(g.food.length,5);assert(previous.every(p=>g.food.includes(p)));const tomato=g.food.at(-1);assert.equal(tomato.kind,FOOD.TOMATO);assert(!g.blocked(tomato,16));
 g.food=[];g.age=110;g.ensureFirstTomato();assert.equal(g.food.length,0);
});
test('a crowded safety spawn retries without marking the tomato as appeared',()=>{
 const g=fresh();g.age=55;const original=g.freePoint.bind(g);let calls=0;g.freePoint=()=>{calls++;return null;};g.ensureFirstTomato();assert(!g.firstTomatoSpawned);g.age=55.25;g.ensureFirstTomato();assert.equal(calls,1);g.freePoint=original;g.age=55.5;g.ensureFirstTomato();assert(g.firstTomatoSpawned);
});
test('boss drops and special spawns also end the initial boost before collection',()=>{
 for(const spawn of [g=>g.dropBossTomatoes({x:650,y:500}),g=>g.arena.drop(FOOD.TOMATO,{x:650,y:500}),g=>g.spawnSpecial()]){
  const g=fresh();spawn(g);assert(g.firstTomatoSpawned);g.food=[];g.random=()=>.1;assert.equal(g.nextFoodKind(),4);g.age=55;g.ensureFirstTomato();assert.equal(g.food.length,0);
 }
});
