import assert from 'node:assert/strict';
import {FoleySound,SOUND_FILES} from '../dist/foley.mjs';
const originalFetch=globalThis.fetch;let active=0,max=0,calls=0;
globalThis.fetch=async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,1));active--;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
const s=new FoleySound();s.context={decodeAudioData:async()=>({duration:.1})};await Promise.all([s.load(),s.loadOne('page-soft')]);assert(max<=3);assert.equal(calls,SOUND_FILES.length);assert.equal(s.buffers.size,SOUND_FILES.length);assert.equal(s.inFlight.size,0);await s.load();assert.equal(calls,SOUND_FILES.length);globalThis.fetch=originalFetch;
console.log('Audio decode concurrency, shared startup request, cache reuse and pending cleanup verified');
