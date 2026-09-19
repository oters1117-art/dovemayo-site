import test from 'node:test';import assert from 'node:assert/strict';
import {GameMetrics} from '../dist/metrics.mjs';
test('metrics serialize visit before play and keep a single play id through end',async()=>{
 const previous={location:globalThis.location,window:globalThis.window,fetch:globalThis.fetch};const calls=[];globalThis.location={hostname:'127.0.0.1'};globalThis.window={addEventListener(){}};globalThis.fetch=async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return {ok:true}};
 try{const m=new GameMetrics();m.start();m.tick(1,true,{age:1,score:2});m.tick(15,false,{age:16,score:3});m.end({age:17,score:4});m.end({age:18,score:5});await m.queue;assert.deepEqual(calls.map(c=>c[0]),['/api/visit','/api/play','/api/progress','/api/end']);assert.equal(calls[1][1].id,calls[3][1].id);assert.equal(calls[3][1].active,1);assert.equal(calls[3][1].score,4);}finally{Object.assign(globalThis,previous);}
});
test('preview collector stays disabled on the public website',async()=>{const previous={location:globalThis.location,window:globalThis.window,fetch:globalThis.fetch};let called=false;globalThis.location={hostname:'dovemayo.com'};globalThis.window={addEventListener(){}};globalThis.fetch=async()=>{called=true};try{const m=new GameMetrics();m.start();m.end({score:9,age:100});await m.queue;assert(!called);}finally{Object.assign(globalThis,previous);}});
