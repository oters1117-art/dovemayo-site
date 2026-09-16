import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchSteering} from '../dist/touch-steering.mjs';
import {SnakeGame} from '../dist/snake-engine.mjs';
test('tap targets screen position, drag updates it, release preserves destination',()=>{
 const s=new TouchSteering();assert(s.begin(1,100,100));assert.deepEqual(s.target,{x:100,y:100});assert(!s.begin(2,300,300));assert(!s.move(2,0,0));s.move(1,200,250);assert.deepEqual(s.target,{x:200,y:250});assert(s.release(1));assert.deepEqual(s.target,{x:200,y:250});assert(s.begin(2,400,500));
});
test('snake continuously aims from its head toward finger and keeps smooth rotation',()=>{
 const g=new SnakeGame({width:900,height:700,origin:{x:440,y:200}});g.food=[];g.nextRefill=Infinity;g.nextEnemy=Infinity;g.touchTarget={x:440,y:500};g.step(.01);assert(g.angle>0&&g.angle<.1);g.step(.1);const h=g.body[0];assert(Math.abs(g.target-Math.atan2(500-h.y,440-h.x))<.01);
 g.touchTarget={...g.body[0]};g.step(.001);assert.equal(g.touchTarget,null);
});
