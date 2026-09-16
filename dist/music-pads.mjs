export class MusicPads {
  constructor(volume=80){this.volume=volume;this.active=false;this.track=0;this.pads=[];this.nextPlacement=0;}
  place(game,kind){
    for(let i=0;i<8;i++){const p=game.freePoint(55,17);if(p&&this.pads.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>44)){this.pads.push({...p,kind,contacts:new Set(),flashUntil:0});return;}}
  }
  stop(){this.active=false;this.track=0;this.pads=this.pads.filter(p=>p.kind==='play');}
  update(game){
    if(game.age>=this.nextPlacement){
      for(const kind of this.active?['play','plus','minus']:['play'])if(!this.pads.some(p=>p.kind===kind))this.place(game,kind);
      this.nextPlacement=game.age+1;
    }
    for(const pad of [...this.pads]){
      const actors=[['player',game.body[0],4],...(pad.kind==='play'?[]:game.enemies.filter(e=>game.age-e.born>=1).map(e=>[e,e,game.enemyRadius(e)]))];
      const contacts=new Set();
      for(const [id,p,r] of actors){
        if(Math.hypot(p.x-pad.x,p.y-pad.y)>11+r)continue;
        contacts.add(id);if(pad.contacts.has(id))continue;
        if(pad.kind==='play'){
          if(this.active){this.stop();game.events.push({type:'music-stop'});}
          else {this.active=true;this.track=1+Math.floor(game.random()*6);this.nextPlacement=0;game.events.push({type:'music-play',track:this.track});}
        }else if(this.active){
          this.volume=Math.max(0,Math.min(100,this.volume+(pad.kind==='plus'?10:-10)));
          pad.flashUntil=game.age+.3;game.events.push({type:'music-volume',volume:this.volume});
        }
      }
      pad.contacts=contacts;
    }
  }
}

// One streaming element, independent from effect volume. No music downloads before stepping on play.
export class PadMusicPlayer {
  constructor({createAudio=()=>new Audio(),onStop=()=>{},volume=80}={}){
    this.audio=createAudio();this.audio.preload='none';this.audio.loop=false;this.volume=volume;this.onStop=onStop;this.generation=0;
    this.audio.addEventListener('ended',()=>this.finish());this.audio.addEventListener('error',()=>this.finish());
    this.setVolume(volume);
  }
  setVolume(value){this.volume=Math.max(0,Math.min(100,value));this.audio.volume=this.volume/100;}
  async play(track){
    const generation=++this.generation;this.audio.pause();this.audio.src='/music/'+track+'.mp3';
    try{await this.audio.play();}catch{if(generation===this.generation)this.finish();}
  }
  pause(){this.audio.pause();}
  stop(){this.generation++;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}
  finish(){this.stop();this.onStop();}
}
