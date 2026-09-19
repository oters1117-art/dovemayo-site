export class DebugKeys {
 constructor(){this.enabled=false;this.index=0;this.last=0;}
 press(key,now){if(now-this.last>1800)this.index=0;this.last=now;if(key==='iop'[this.index])this.index++;else this.index=key==='i'?1:0;if(this.index===3){this.enabled=true;this.index=0;return true;}return false;}
}
