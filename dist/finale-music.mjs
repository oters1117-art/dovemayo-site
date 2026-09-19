export class FinaleMusic{
 constructor({createAudio=()=>new Audio(),onActive=()=>{}}={}){this.audio=createAudio();this.audio.preload='none';this.audio.volume=.5;this.onActive=onActive;this.active=false;this.prepared=false;this.generation=0;this.audio.addEventListener('ended',()=>this.stop());}
 prepare(){if(this.prepared)return;this.prepared=true;this.audio.preload='auto';this.audio.src='/music/still-alive.mp3';this.audio.load();}
 play(){this.stop();this.prepare();this.audio.currentTime=1;const generation=++this.generation;this.active=true;this.onActive(true);this.audio.play().catch(()=>{if(generation===this.generation)this.stop();});}
 pause(){this.generation++;this.audio.pause();}
 stop(){this.generation++;this.audio.pause();if(this.prepared)this.audio.currentTime=0;this.active=false;this.onActive(false);}
 setMuted(value){this.audio.muted=value;}
}
