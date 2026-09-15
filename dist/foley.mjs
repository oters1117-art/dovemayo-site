// Recorded CC0 foley, locally hosted. Sources and edits: /audio/CREDITS.txt.
export const SOUND_FILES=['ice-0','ice-1','ice-2','paper-0','paper-1','paper-2','cloth-0','cloth-1','soft'];
const profiles={
 eat:{bank:['ice-0','ice-1','ice-2'],gain:.95,rate:.94,gap:.035},
 defeat:{bank:['paper-0','paper-1','paper-2'],gain:.8,rate:1,gap:.055},
 throw:{bank:['cloth-0','cloth-1'],gain:.22,rate:1.25,gap:.13},
 impact:{bank:['paper-1','paper-2'],gain:.36,rate:1.12,gap:.09},
 splash:{bank:['ice-0','ice-2'],gain:.66,rate:.77,gap:.12},
 fail:{bank:['soft'],gain:1,rate:.62,gap:.2},
 blast:{bank:['soft'],gain:.8,rate:.77,gap:.12},
 penalty:{bank:['cloth-0','cloth-1'],gain:.75,rate:.75,gap:.1},
 start:{bank:['paper-1','paper-2'],gain:.5,rate:.94,gap:.1},
 texture:{bank:['ice-0','cloth-0','ice-1','cloth-1','ice-2'],gain:.18,rate:.76,gap:.5}
};
export class FoleySound{
 constructor(){this.context=null;this.buffers=new Map();this.voices=new Set();this.previous=new Map();this.last=new Map();this.loading=null;}
 unlock(){
  try{
   if(!this.context){
    const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;
    this.context=new C();const c=this.context;
    this.low=c.createBiquadFilter();this.low.type='lowpass';this.low.frequency.value=5800;this.low.Q.value=.5;
    this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-14;this.compressor.knee.value=18;this.compressor.ratio.value=4;this.compressor.attack.value=.006;this.compressor.release.value=.18;
    this.low.connect(this.compressor);this.compressor.connect(c.destination);
   }
   this.context.resume().catch(()=>{});this.load();
  }catch{}
 }
 load(){
  if(!this.context)return Promise.resolve();
  return this.loading ||= Promise.all(SOUND_FILES.map(async name=>{
   try{const r=await fetch('/audio/'+name+'.ogg',{signal:AbortSignal.timeout(5000)});if(!r.ok)return;const buffer=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(name,buffer);}catch{}
  }));
 }
 play(type='eat'){
  const c=this.context;if(!c||c.state!=='running')return;
  const p=profiles[type]||profiles.eat,now=c.currentTime;
  if(now-(this.last.get(type)??-100)<p.gap)return;
  if(this.voices.size>=10){if(type==='throw'||type==='texture'||type==='impact')return;this.stopVoice(this.voices.values().next().value);}
  const bank=p.bank.filter(n=>this.buffers.has(n));if(!bank.length)return;
  const options=bank.filter(n=>n!==this.previous.get(type)),pool=options.length?options:bank,name=pool[Math.floor(Math.random()*pool.length)];
  this.previous.set(type,name);this.last.set(type,now);
  const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=this.buffers.get(name);source.playbackRate.value=p.rate*(.96+Math.random()*.08);pan.pan.value=(Math.random()-.5)*.18;
  const length=source.buffer.duration/source.playbackRate.value,level=p.gain/Math.sqrt(1+this.voices.size*.3);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+.006);gain.gain.setValueAtTime(level,now+Math.max(.007,length-.04));gain.gain.linearRampToValueAtTime(0,now+length);
  source.connect(gain);gain.connect(pan);pan.connect(this.low);
  const voice={source,gain,pan,type};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();pan.disconnect();};source.start(now);
 }
 stopVoice(v){if(!v)return;try{const t=this.context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.012);v.source.stop(t+.05);}catch{}this.voices.delete(v);}
 stopTexture(){for(const v of this.voices)if(v.type==='texture')this.stopVoice(v);}
}
