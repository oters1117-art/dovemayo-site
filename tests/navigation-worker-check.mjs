import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {SnakeGame} from '../dist/snake-engine.mjs';
import {RoutePlanner} from '../dist/route-client.mjs';
class FakeWorker{postMessage(m){this.messages??=[];this.messages.push(m);}terminate(){this.stopped=true;}}
globalThis.Worker=FakeWorker;
const p=new RoutePlanner(),pending=[];for(let i=0;i<4;i++)pending.push(p.request({}));assert.equal(p.pending.size,4);assert.equal(await p.request({}),null);const old=p.worker;p.cancel();assert(old.stopped);assert.equal(p.pending.size,0);assert((await Promise.all(pending)).every(r=>r===null));
const g=new SnakeGame({width:1000,height:800,origin:{x:800,y:400},obstacles:[{x:490,y:0,w:20,h:800}]});g.food=[];const e={x:100,y:400,aim:{x:800,y:700},kind:4};g.enemies=[e];
const workerUrl=new URL('../dist/route-worker.mjs',import.meta.url).href;
const worker=new NodeWorker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:r=>parentPort.postMessage(r)};import(${JSON.stringify(workerUrl)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
let ticks=0;const timer=setInterval(()=>ticks++,2);const result=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({id:1,snapshot:g.routeSnapshot(e)});});clearInterval(timer);await worker.terminate();assert.equal(result.id,1);assert.equal(result.route,null);assert(ticks>0);
console.log('Worker execution, responsive main thread, queue limit and cancellation verified');
