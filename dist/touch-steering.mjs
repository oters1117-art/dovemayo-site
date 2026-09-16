export class TouchSteering {
  constructor(){this.reset();}
  reset(){this.id=null;this.target=null;}
  begin(id,x,y){if(this.id!==null)return false;this.id=id;this.target={x,y};return true;}
  move(id,x,y){if(id!==this.id)return false;this.target={x,y};return true;}
  release(id){if(id!==this.id)return false;this.id=null;return true;}
}
