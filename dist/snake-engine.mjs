/** Continuous snake simulation. Coordinates are CSS pixels; no DOM dependency. */
export const TAU = Math.PI * 2;
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function turnToward(angle, target, max) {
  const delta = Math.atan2(Math.sin(target-angle), Math.cos(target-angle));
  return angle + Math.max(-max,Math.min(max,delta));
}
export function touches(p,r,b) {
  const corner = Math.min(b.radius || 0, b.w/2, b.h/2);
  const dx = Math.max(Math.abs(p.x-(b.x+b.w/2))-(b.w/2-corner),0);
  const dy = Math.max(Math.abs(p.y-(b.y+b.h/2))-(b.h/2-corner),0);
  return Math.hypot(dx,dy) < corner+r;
}
export class SnakeGame {
  constructor({width,height,origin,angle=0,obstacles=[],random=Math.random}) {
    Object.assign(this,{width,height,obstacles,random,angle,target:angle});
    this.body=[{...origin}];this.radius=4;this.length=1;this.goalLength=42;
    this.speed=105;this.age=0;this.score=0;this.kills=0;this.dead=false;
    this.food=[];this.enemies=[];this.events=[];this.nextEnemy=11+random()*5;
    this.refill();
  }
  blocked(p,r) {
    return p.x<r+2 || p.y<r+2 || p.x>this.width-r-2 || p.y>this.height-r-2 || this.obstacles.some(b=>touches(p,r,b));
  }
  freePoint(minDistance=60) {
    for(let i=0;i<700;i++) {
      const p={x:18+this.random()*(this.width-36),y:18+this.random()*(this.height-36)};
      if(!this.blocked(p,16) && distance(p,this.body[0])>minDistance &&
        !this.body.some(b=>distance(p,b)<23) && !this.food.some(b=>distance(p,b)<36) &&
        !this.enemies.some(b=>distance(p,b)<42)) return p;
    }
    return null;
  }
  refill() {
    while(this.food.length<3) {
      const p=this.freePoint();if(!p)break;
      this.food.push({...p,kind:Math.floor(this.random()*50)});
    }
  }
  fail(reason) {this.dead=true;this.events.push({type:'fail',reason});}
  step(dt) {
    if(this.dead)return;
    // Small substeps keep high-refresh and low-refresh displays equally safe.
    let left=Math.min(dt,.08);
    while(left>0 && !this.dead){const s=Math.min(left,1/120);this.tick(s);left-=s;}
  }
  tick(dt) {
    this.age+=dt;
    this.angle=turnToward(this.angle,this.target,9.5*dt);
    const speed=this.speed+Math.min(this.score*1.2,32);
    const head={x:this.body[0].x+Math.cos(this.angle)*speed*dt,y:this.body[0].y+Math.sin(this.angle)*speed*dt};
    if(this.blocked(head,this.radius)){this.fail('벽이나 글자, 카드에 부딪혔어요.');return;}
    let behind=0;
    for(let i=1;i<this.body.length;i++) {
      behind+=distance(this.body[i-1],this.body[i]);
      if(behind>22 && distance(head,this.body[i])<this.radius*1.65){this.fail('자기 몸에 부딪혔어요.');return;}
    }
    this.body.unshift(head);
    this.length=Math.min(this.goalLength,this.length+dt*82);
    let used=0;
    for(let i=1;i<this.body.length;i++) {
      const d=distance(this.body[i-1],this.body[i]);
      if(used+d>this.length){const t=(this.length-used)/d;this.body[i]={x:this.body[i-1].x+(this.body[i].x-this.body[i-1].x)*t,y:this.body[i-1].y+(this.body[i].y-this.body[i-1].y)*t};this.body.length=i+1;break;}
      used+=d;
    }
    for(let i=this.food.length-1;i>=0;i--)if(distance(head,this.food[i])<15){
      const p=this.food.splice(i,1)[0];this.goalLength+=24;this.score++;this.events.push({type:'eat',...p});
    }
    this.refill();
    if(this.age>=this.nextEnemy) {
      this.nextEnemy=this.age+12+this.random()*8;
      if(this.enemies.length<3){const p=this.freePoint(160);if(p){this.enemies.push({...p,kind:Math.floor(this.random()*3),born:this.age});this.events.push({type:'enemy',...p});}}
    }
    for(let i=this.enemies.length-1;i>=0;i--) {
      const e=this.enemies[i];if(this.age-e.born<1)continue;
      const a=Math.atan2(head.y-e.y,head.x-e.x),v=(37+Math.min(this.score,15))*dt;
      // Try small detours around cards instead of passing through them.
      for(const offset of [0,.55,-.55,1.1,-1.1,1.6,-1.6]){
        const p={x:e.x+Math.cos(a+offset)*v,y:e.y+Math.sin(a+offset)*v};
        if(!this.blocked(p,11)){e.x=p.x;e.y=p.y;break;}
      }
      if(distance(e,head)<13){this.fail('표정 이모지에게 잡혔어요.');return;}
      let trail=0,hit=false;
      for(let j=1;j<this.body.length;j++){
        trail+=distance(this.body[j-1],this.body[j]);
        if(trail>21 && distance(e,this.body[j])<14){hit=true;break;}
      }
      if(hit){this.enemies.splice(i,1);this.kills++;this.events.push({type:'defeat',x:e.x,y:e.y});}
    }
  }
}
