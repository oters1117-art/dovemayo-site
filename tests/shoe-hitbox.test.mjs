import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame} from '../dist/snake-engine.mjs';
import {shoeTouches,shoeAngle} from '../dist/shoe-hitbox.mjs';
const shoe=()=>({type:'shoe',x:400,y:300,from:{x:400,y:300},to:{x:400,y:300},born:0,duration:1});
const world=(p,x,y,age=1)=>{const a=shoeAngle(p,age);return{x:p.x+x*Math.cos(a)-y*Math.sin(a),y:p.y+x*Math.sin(a)+y*Math.cos(a)};};
function fresh(head){let seed=13;const g=new SnakeGame({width:900,height:700,origin:head,random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});g.food=[];g.enemies=[];g.events=[];return g;}
test('shoe silhouette follows drawing rotation and excludes transparent corners',()=>{
 const p=shoe();for(const age of [0,.25,.5,1,2]){
  for(const [x,y] of [[-6,-4],[2,3],[10,10]])assert(shoeTouches(p,world(p,x,y,age),age,0));
  for(const [x,y] of [[10,-10],[-10,10],[0,-11]])assert(!shoeTouches(p,world(p,x,y,age),age,0));
 }
});
test('landing near the shoe in the old 22px radius is safe; touching toe or heel hits',()=>{
 for(const [x,y,hit] of [[10,-10,false],[-10,10,false],[18,0,false],[10,10,true],[-9,-3,true]]){
  const p=shoe(),g=fresh(world(p,x,y));g.projectiles=[p];g.age=1;g.updateHazards(0);assert.equal(g.dead,hit,`${x},${y}`);
  assert.equal(g.events.filter(e=>e.type==='shoe-land').length,1);
 }
});
test('airborne shoes still pass over the head; invincibility still protects it on landing',()=>{
 const p=shoe(),g=fresh(world(p,2,3));g.projectiles=[p];g.age=.5;g.updateHazards(0);assert(!g.dead);assert(g.projectiles.includes(p));
 g.setBuff('rainbow');g.age=1;g.updateHazards(0);assert(!g.dead);assert(!g.projectiles.includes(p));
});
test('old snake body uses the same shoe silhouette, excluding transparent space',()=>{
 for(const [x,y,hit] of [[10,-10,false],[-10,10,false],[10,10,true],[-9,-3,true]]){
  const p=shoe(),g=fresh({x:100,y:100});g.age=1;g.body=[{x:100,y:100},{x:130,y:100},world(p,x,y)];assert.equal(g.shoeBodyHit(p),hit);
 }
});
