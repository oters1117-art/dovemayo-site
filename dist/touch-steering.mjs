export class TouchSteering {
  constructor(){this.reset();}
  reset(){this.id=null;this.origin=null;this.tip=null;}
  begin(id,x,y){if(this.id!==null)return false;this.id=id;this.origin={x,y};this.tip={x,y};return true;}
  move(id,x,y){if(id!==this.id)return null;this.tip={x,y};const dx=x-this.origin.x,dy=y-this.origin.y;return Math.hypot(dx,dy)<6?null:Math.atan2(dy,dx);}
  release(id){if(id!==this.id)return false;this.reset();return true;}
}
