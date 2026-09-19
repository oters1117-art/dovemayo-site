export class FinaleMusic{
 constructor({createAudio=()=>new Audio(),onActive=()=>{}}={}){this.audio=createAudio();this.audio.preload='none';this.audio.volume=.5;this.onActive=onActive;this.active=false;this.generation=0;this.audio.addEventListener('ended',()=>this.stop());}
 play(){this.stop();const generation=++this.generation;this.active=true;this.onActive(true);this.audio.src='/music/still-alive.mp3';this.audio.play().catch(()=>{if(generation===this.generation)this.stop();});}
 pause(){this.generation++;this.audio.pause();}
 stop(){this.generation++;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.active=false;this.onActive(false);}
 setMuted(value){this.audio.muted=value;}
}
