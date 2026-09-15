import assert from 'node:assert/strict';
import {FoleySound,SOUND_FILES} from '../dist/foley.mjs';
import {readFileSync} from 'node:fs';
for(const name of SOUND_FILES)assert.equal(readFileSync(new URL('../dist/audio/'+name+'.ogg',import.meta.url)).subarray(0,4).toString(),'OggS');
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
const node=()=>({connect(){},disconnect(){},gain:param(),pan:param(),playbackRate:param(),start(){},stop(){}});
const f=new FoleySound();f.context={state:'running',currentTime:1,createBufferSource:node,createGain:node,createStereoPanner:node};f.low=node();
for(const n of SOUND_FILES)f.buffers.set(n,{duration:.4});
f.play('eat');assert.equal(f.voices.size,1);f.play('eat');assert.equal(f.voices.size,1);
f.play('special');const first=f.previous.get('special');f.context.currentTime+=.1;f.play('special');assert.notEqual(f.previous.get('special'),first);
for(let i=0;i<30;i++){f.context.currentTime+=.2;f.play('throw');}assert(f.voices.size<=10);
f.play('fail');assert(f.voices.size<=10);
console.log('Foley assets, variation, event throttle and voice limit verified');

f.setUnderwater(true);const ambient=f.ambience;assert(ambient.source.loop);f.setUnderwater(true);assert.equal(f.ambience,ambient);f.setUnderwater(false);assert.equal(f.ambience,null);
