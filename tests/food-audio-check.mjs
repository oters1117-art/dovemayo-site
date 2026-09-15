import {FoleySound,SOUND_FILES} from '../dist/foley.mjs';
import assert from 'node:assert/strict';
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
const node=()=>({connect(){},disconnect(){},gain:param(),pan:param(),playbackRate:param(),start(){},stop(){}});
const f=new FoleySound();f.context={state:'running',currentTime:1,createBufferSource:node,createGain:node,createStereoPanner:node};f.low=node();for(const n of SOUND_FILES)f.buffers.set(n,{duration:.4});
assert.equal(SOUND_FILES.filter(n=>n.startsWith('bubble-clear-')).length,6);
for(let i=0;i<20;i++){const old=f.previous.get('eat');f.context.currentTime+=.1;f.play('eat');assert.notEqual(f.previous.get('eat'),old);}
for(const [event,prefix] of [['potion','cloth-'],['splash','wine-clear'],['apple','apple-crunch'],['beer','beer-pour'],['penalty','bubble-deep'],['start','page-soft'],['chili','chili-flame'],['tooth','tooth-soft']]){f.context.currentTime+=1;f.play(event);assert(f.previous.get(event).startsWith(prefix));}
console.log('Food sounds, potion throw/landing separation, and six non-repeating bubble variants verified');
