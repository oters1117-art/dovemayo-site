import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,FOOD} from '../dist/snake-engine.mjs';
import {moveSolid} from '../dist/boss-dynamics.mjs';
function fresh(){const g=new SnakeGame({width:1400,height:1000,origin:{x:100,y:100},random:()=>.4});g.food=[];g.enemies=[];g.bombs=[];g.knives=[];g.debugInvincible=true;return g;}
const ball=()=>({type:'ball',x:700,y:700,vx:100,vy:0,born:0});
const stop=g=>{g.eatFood({kind:FOOD.TOMATO});g.eatFood({kind:FOOD.EGGPLANT});};
test('eggplant combo holds ball position and velocity, then resumes',()=>{const g=fresh(),b=ball();g.projectiles=[b];stop(g);g.updateHazards(.5);assert.equal(b.x,700);assert.equal(b.vx,100);assert.equal(moveSolid(g.arena,b,{x:800,y:700},30),false);assert.equal(b.x,700);g.age=g.buff.until;g.updateHazards(.5);assert.equal(b.x,750);});
test('ordinary eggplant does not freeze balls',()=>{const g=fresh(),b=ball();g.projectiles=[b];g.eatFood({kind:FOOD.EGGPLANT});g.updateHazards(.5);assert.equal(b.x,750);});
test('blue shots push balls and frozen balls retain that direction until resume',()=>{for(const frozen of [false,true]){const g=fresh(),b=ball();if(frozen)stop(g);const blue={type:'blue',x:700,y:700,vx:0,vy:-360,born:0};g.projectiles=[b,blue];g.updateHazards(0);assert(g.projectiles.includes(b));assert(!g.projectiles.includes(blue));assert(Math.abs(b.vx)<1e-8);assert.equal(b.vy,-280);g.updateHazards(.1);assert.equal(b.y,frozen?700:672);if(frozen){g.age=g.buff.until;g.updateHazards(.1);assert.equal(b.y,672);}}});
test('normal and enhanced bombs and dynamite remove balls inside explosion only',()=>{for(const kind of ['bomb','enhanced','dynamite']){const g=fresh(),b=ball(),far={...ball(),x:1100};g.projectiles=[b,far];if(kind==='dynamite')g.arena.area(b,150,'dynamite');else{const bomb={x:700,y:700,enhanced:kind==='enhanced'};g.bombs=[bomb];g.explode(bomb);}g.finalizeShots();assert.deepEqual(g.projectiles,[far]);assert.equal(g.events.filter(e=>e.type==='ball-break').length,1);}});
