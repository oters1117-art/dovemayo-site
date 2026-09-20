// Recorded foley, locally hosted; CC0 and Pixabay Content License. Sources and edits: /audio/CREDITS.txt.
export const SOUND_FILES=['blackhole-dial','church-short','cake-heavy','phase-soft','phone-key-0','phone-key-1','phone-key-2','phone-key-3','phone-key-4','phone-key-5','phone-key-6','phone-key-7','phone-key-8','phone-key-9','phone-key-10','phone-key-11','chime-user','church-user','blackhole-hum','church-bell','firework-soft','fuse-soft','zap-note-0','zap-note-1','zap-note-2','zap-note-3','zap-note-4','roll-soft','zap-soft','phone-soft','phone-soft-0','phone-soft-1','phone-soft-2','billiard-soft','slime-soft','air-soft','chime-soft','wind-soft','ice-0','ice-1','ice-2','paper-0','paper-1','paper-2','cloth-0','cloth-1','soft','bubble-clear-0','bubble-clear-1','bubble-clear-2','bubble-clear-3','bubble-clear-4','bubble-clear-5','apple-crunch','chili-flame','beer-pour','bubble-deep','page-soft','wine-clear','tooth-soft','shoe','underwater-clear','lp-start-pixabay','lp-end-pixabay'];
const profiles={
 'cake-land':{bank:['cake-heavy'],gain:.85,rate:1,gap:.3},
 'tooth-break':{bank:['paper-0','paper-1'],gain:.20,rate:1.1,gap:.12},
 'object-break':{bank:['paper-1','shoe'],gain:.38,rate:1.12,gap:.055},
 'brain-cast':{bank:['air-soft','bubble-deep'],gain:.46,rate:1.2,gap:.2},
 grab:{bank:['bubble-clear-1','bubble-clear-3'],gain:.55,rate:1.16,gap:.15},
 'king-throw':{bank:['cloth-1'],gain:.55,rate:1.2,gap:.15},
 cloak:{bank:['cloth-0','cloth-1'],gain:.8,rate:.78,gap:.15},
 'egg-break':{bank:['ice-0','ice-2'],gain:.85,rate:.78,gap:.1},
 'hammer-break':{bank:['shoe'],gain:.5,rate:1.3,gap:.08},
 'ball-break':{bank:['billiard-soft'],gain:.8,rate:1.2,gap:.04},
 dynamite:{bank:['firework-soft'],gain:1,rate:.88,gap:.1},
 roll:{bank:['roll-soft'],gain:.55,rate:1,gap:.4},
 zap:{bank:['zap-note-0','zap-note-1','zap-note-2','zap-note-3','zap-note-4'],gain:.36,rate:1,gap:.07},
 'blackhole-dial':{bank:['blackhole-dial'],gain:.28,rate:1,gap:1},
 phone:{bank:['phone-key-0','phone-key-1','phone-key-2','phone-key-3','phone-key-4','phone-key-5','phone-key-6','phone-key-7','phone-key-8','phone-key-9','phone-key-10','phone-key-11'],gain:.38,rate:1,gap:.2},
 chime:{bank:['chime-user'],gain:.85,rate:1,gap:.3},
 wind:{bank:['wind-soft'],gain:.3,rate:1,gap:.8},
 hammer:{bank:['cloth-0','cloth-1'],gain:.5,rate:.8,gap:.3},
 fuse:{bank:['fuse-soft'],gain:.35,rate:.8,gap:.3},
 enhance:{bank:['church-short'],gain:.52,rate:1,gap:.3},
 billiard:{bank:['billiard-soft'],gain:.7,rate:1,gap:.08},
 slime:{bank:['slime-soft'],gain:.7,rate:1,gap:.1},
 'air-pop':{bank:['air-soft'],gain:.65,rate:1,gap:.2},
 'music-on':{bank:['lp-start-pixabay'],gain:.95,rate:1,gap:0},
 'music-off':{bank:['lp-end-pixabay'],gain:.9,rate:1,gap:0},
 eat:{bank:['bubble-clear-0','bubble-clear-1','bubble-clear-2','bubble-clear-3','bubble-clear-4','bubble-clear-5'],gain:.85,rate:1,gap:.035},
 special:{bank:['ice-0','ice-1','ice-2'],gain:.88,rate:.94,gap:.05},
 blue:{bank:['bubble-clear-0','bubble-clear-1','bubble-clear-2','bubble-clear-3','bubble-clear-4','bubble-clear-5'],gain:.42,rate:1.12,gap:.09},
 tooth:{bank:['billiard-soft'],gain:.23,rate:1.35,gap:.09},
 shoe:{bank:['shoe'],gain:.8,rate:.84,gap:.08},
 defeat:{bank:['paper-0','paper-1','paper-2'],gain:.8,rate:1,gap:.055},
 potion:{bank:['cloth-0','cloth-1'],gain:.3,rate:1.25,gap:.12},
 apple:{bank:['apple-crunch'],gain:.88,rate:1,gap:.07},
 chili:{bank:['chili-flame'],gain:.7,rate:1,gap:.12},
 beer:{bank:['beer-pour'],gain:.8,rate:1,gap:.15},
 throw:{bank:['cloth-0','cloth-1'],gain:.22,rate:1.25,gap:.13},
 impact:{bank:['paper-1','paper-2'],gain:.36,rate:1.12,gap:.09},
 splash:{bank:['wine-clear'],gain:.82,rate:1,gap:.12},
 fail:{bank:['soft'],gain:1,rate:.62,gap:.2},
 blast:{bank:['soft'],gain:1.0,rate:.77,gap:.12},
 penalty:{bank:['bubble-deep'],gain:.9,rate:1,gap:.1},
 start:{bank:['page-soft'],gain:.5,rate:1,gap:.1},
 texture:{bank:['cloth-0'],gain:.1,rate:.76,gap:.5}
};
export class FoleySound{
 constructor(){this.context=null;this.buffers=new Map();this.voices=new Set();this.previous=new Map();this.last=new Map();this.loading=null;this.ambience=null;this.inFlight=new Map();}
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
 loadOne(name){
  if(!this.context||this.buffers.has(name))return Promise.resolve();
  if(this.inFlight.has(name))return this.inFlight.get(name);
  const work=(async()=>{try{const r=await fetch('/audio/'+name+'.ogg',{signal:AbortSignal.timeout(5000)});if(!r.ok)return;const buffer=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(name,buffer);}catch{}})();
  this.inFlight.set(name,work);work.finally(()=>this.inFlight.delete(name));return work;
 }
 load(){
  if(!this.context)return Promise.resolve();
  if(!this.loading){const first=['page-soft','lp-start-pixabay','lp-end-pixabay'],files=[...first,...SOUND_FILES.filter(n=>!first.includes(n))];let next=0;this.loading=Promise.all(Array.from({length:3},async()=>{while(next<files.length)await this.loadOne(files[next++]);}));}return this.loading;
 }
 play(type='eat'){
  const c=this.context;if(!c||c.state!=='running')return;
  if(type==='music-on'||type==='music-off')this.stopMusicCue();
  const p=profiles[type]||profiles.eat,now=c.currentTime;
  if(now-(this.last.get(type)??-100)<p.gap)return;
  if(this.voices.size>=10){if(type==='throw'||type==='texture'||type==='impact')return;this.stopVoice(this.voices.values().next().value);}
  const bank=p.bank.filter(n=>this.buffers.has(n));if(!bank.length)return;
  const options=bank.filter(n=>n!==this.previous.get(type)),pool=options.length?options:bank,name=pool[Math.floor(Math.random()*pool.length)];
  this.previous.set(type,name);this.last.set(type,now);
  const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=this.buffers.get(name);source.playbackRate.value=p.rate*((type.startsWith('music-')||['zap','phone','chime','enhance'].includes(type))?1:.96+Math.random()*.08);pan.pan.value=(Math.random()-.5)*.18;
  const length=source.buffer.duration/source.playbackRate.value,level=p.gain/Math.sqrt(1+this.voices.size*.3);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+.006);gain.gain.setValueAtTime(level,now+Math.max(.007,length-.04));gain.gain.linearRampToValueAtTime(0,now+length);
  source.connect(gain);gain.connect(pan);pan.connect(['chime','enhance'].includes(type)?this.compressor:this.low);
  const voice={source,gain,pan,type};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();pan.disconnect();};source.start(now);return length;
 }
 playMidi(note,duration=.25){const c=this.context;if(!c||c.state!=='running'||!Number.isFinite(note))return;const source=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner(),t=c.currentTime,life=Math.max(.12,Math.min(.7,duration));if(c.createPeriodicWave){const real=new Float32Array(13),imag=new Float32Array([0,1,.62,.42,.31,.24,.19,.15,.12,.09,.07,.05,.035]);source.setPeriodicWave(c.createPeriodicWave(real,imag));}else source.type='sawtooth';source.frequency.value=440*2**((note-69)/12);pan.pan.value=(note-64)/60;gain.gain.setValueAtTime(0,t);const level=.115/Math.sqrt(1+this.voices.size*.2);gain.gain.linearRampToValueAtTime(level,t+.008);for(let at=.014;at<life*.65;at+=.014){gain.gain.linearRampToValueAtTime(level*.48,t+at);gain.gain.linearRampToValueAtTime(level,t+at+.006);}gain.gain.exponentialRampToValueAtTime(.0001,t+life);source.connect(gain);gain.connect(pan);pan.connect(this.low);const voice={source,gain,pan,type:'midi'};if(this.voices.size>=14)this.stopVoice(this.voices.values().next().value);this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();pan.disconnect();};source.start(t);source.stop(t+life+.01);}
 stopMusicCue(){for(const v of [...this.voices])if(v.type==='music-on'||v.type==='music-off')this.stopVoice(v);}
 stopVoice(v){if(!v)return;try{const t=this.context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.012);v.source.stop(t+.05);}catch{}this.voices.delete(v);}
 setUnderwater(active){
  const c=this.context;
  if(!active){if(this.ambience){const v=this.ambience;this.ambience=null;const t=c.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.08);v.source.stop(t+.4);}return;}
  if(this.ambience||!c||c.state!=='running'||!this.buffers.has('underwater-clear'))return;
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers.get('underwater-clear');source.loop=true;
  const t=c.currentTime;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.42,t+.45);source.connect(gain);gain.connect(this.low);
  const voice={source,gain};this.ambience=voice;source.onended=()=>{source.disconnect();gain.disconnect();if(this.ambience===voice)this.ambience=null;};source.start(t);
 }
 setLoop(name,level,bank){
  this.loops??=new Map();const c=this.context;if(!c)return;const existing=this.loops.get(name),t=c.currentTime;
  if(!level){if(existing){this.loops.delete(name);existing.gain.gain.setTargetAtTime(0,t,.08);existing.source.stop(t+.4);}return;}
  if(existing){existing.gain.gain.setTargetAtTime(level,t,.12);return;}
  if(c.state!=='running'||!this.buffers.has(bank))return;
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers.get(bank);source.loop=true;gain.gain.setValueAtTime(0,t);gain.gain.setTargetAtTime(level,t,.1);source.connect(gain);gain.connect(this.low);this.loops.set(name,{source,gain});source.onended=()=>{source.disconnect();gain.disconnect();};source.start(t);
 }
 stopTexture(){this.setUnderwater(false);}

}
