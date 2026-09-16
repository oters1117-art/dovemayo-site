import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchSteering} from '../dist/touch-steering.mjs';
test('touch direction uses the initial press as a fixed anchor with a small dead zone',()=>{
 const s=new TouchSteering();assert(s.begin(1,100,100));assert.equal(s.move(1,103,102),null);assert.equal(s.move(1,140,100),0);assert.equal(s.move(1,100,140),Math.PI/2);assert.equal(s.move(1,60,60),-3*Math.PI/4);assert.deepEqual(s.origin,{x:100,y:100});
});
test('second fingers cannot steal steering and release permits a new anchor',()=>{
 const s=new TouchSteering();s.begin(1,100,100);assert(!s.begin(2,300,300));assert.equal(s.move(2,0,0),null);assert(!s.release(2));assert(s.release(1));assert.equal(s.origin,null);assert(s.begin(3,250,250));s.reset();assert.equal(s.id,null);
});
