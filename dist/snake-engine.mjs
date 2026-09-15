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
    this.speed=125;this.age=0;this.score=0;this.kills=0;this.dead=false;
    this.food=[];this.enemies=[];this.events=[];this.nextEnemy=11+random()*5;
    this.projectiles=[];this.puddles=[];this.bombs=[];this.slowUntil=0;this.spawnCount=0;
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
    while(this.food.length<Math.min(12,3+Math.floor(this.age/20))) {
      const p=this.freePoint();if(!p)break;
      this.food.push({...p,kind:Math.floor(this.random()*50)});
    }
  }
  fail(reason) {this.dead=true;this.events.push({type:'fail',reason});}
  step(dt) {
    if(this.dead)return;
    // Small substeps keep high-refresh and low-refresh displays equally safe.
    let left=Math.max(0,Number.isFinite(dt)?dt:0);
    while(left>0 && !this.dead){const s=Math.min(left,1/120);this.tick(s);left-=s;}
  }
  tick(dt) {
    this.age+=dt;
    this.angle=turnToward(this.angle,this.target,9.5*dt);
    for(const p of this.puddles)if(p.until>this.age && distance(this.body[0],p)<p.radius+this.radius)this.slowUntil=this.age+1.2;
    const speed=(this.speed+Math.min(this.score*1.2,32))*(this.age<this.slowUntil?.55:1);
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
      this.nextEnemy=this.age+Math.max(1.7,10-this.age*.055)+this.random()*2;
      if(this.enemies.length<Math.min(24,3+Math.floor(this.age/15))){
        const p=this.freePoint(160);
        if(p){const kind=this.spawnCount<6?this.spawnCount:Math.floor(this.random()*6);this.spawnCount++;
          this.enemies.push({...p,kind,born:this.age,state:'idle',until:this.age+2});this.events.push({type:'enemy',...p});}
      }
    }
    for(let i=this.enemies.length-1;i>=0;i--) {
      const e=this.enemies[i];if(this.age-e.born<1)continue;
      this.updateEnemy(e,dt);
      if(e.kind!==4 && distance(e,head)<13){this.fail('표정 이모지에게 잡혔어요.');return;}
      if(this.bodyHit(e,14)){this.enemies.splice(i,1);this.kills++;this.events.push({type:'defeat',x:e.x,y:e.y});}
    }
    this.updateHazards(dt);

  }
  bodyHit(point,radius){
    let trail=0;
    for(let i=1;i<this.body.length;i++){
      trail+=distance(this.body[i-1],this.body[i]);
      if(trail>21 && distance(point,this.body[i])<radius)return true;
    }
    return false;
  }
  moveEnemy(e,target,speed,dt,away=false){
    const a=Math.atan2(target.y-e.y,target.x-e.x)+(away?Math.PI:0);
    for(const offset of [0,.55,-.55,1.1,-1.1,1.6,-1.6]){
      const p={x:e.x+Math.cos(a+offset)*speed*dt,y:e.y+Math.sin(a+offset)*speed*dt};
      if(!this.blocked(p,11)){e.x=p.x;e.y=p.y;return true;}
    }
    return false;
  }
  aim(){
    const h=this.body[0],p={x:Math.max(20,Math.min(this.width-20,h.x+Math.cos(this.angle)*32)),y:Math.max(20,Math.min(this.height-20,h.y+Math.sin(this.angle)*32))};
    return this.blocked(p,8)?{...h}:p;
  }
  toss(e,type){
    if(this.projectiles.length>=24)return;
    this.projectiles.push({type,x:e.x,y:e.y,from:{x:e.x,y:e.y},to:{...e.aim},born:this.age,duration:type==='shoe'?.72:.88,owner:e});
    this.events.push({type:'throw',x:e.x,y:e.y});
  }
  updateEnemy(e,dt){
    const h=this.body[0],d=distance(e,h),age=this.age;
    e.state ||= 'idle';e.until ??= age+2;
    if(e.kind===0){this.moveEnemy(e,h,37+Math.min(this.score,15),dt);return;}
    if(e.kind===4){
      // Harmless by design: it dashes to a nearby point, never attacks.
      if(e.state==='dash'){
        if(distance(e,e.aim)<12 || age>e.until){e.state='idle';e.until=age+1.6+this.random()*3;}
        else this.moveEnemy(e,e.aim,480,dt);
      }else if(age>e.until){
        const a=this.random()*TAU,p={x:h.x+Math.cos(a)*48,y:h.y+Math.sin(a)*48};
        e.aim=this.blocked(p,12)?{...e}:p;e.state='dash';e.until=age+.7;
      }
      return;
    }
    if(e.kind===5){
      if(!e.aim||distance(e,e.aim)<18||age>(e.roamUntil||0)){e.aim=this.freePoint(20)||{...e};e.roamUntil=age+3;}
      this.moveEnemy(e,e.aim,56,dt);
      if(age>e.until){if(this.bombs.length<20)this.bombs.push({x:e.x,y:e.y,born:age,armed:null});e.until=age+3+this.random()*3;}
      return;
    }
    if(e.state==='mark'){
      if(age>=e.until){e.state='shake';e.until=age+.42;}return;
    }
    if(e.state==='shake'){
      if(age>=e.until){this.toss(e,e.kind===1?'shoe':'potion');e.state='recover';e.until=age+2.8+this.random();}return;
    }
    if(e.state==='charge'){
      if(age>=e.until){
        const a=Math.atan2(h.y-e.y,h.x-e.x);
        if(this.projectiles.length<24)this.projectiles.push({type:'boomerang',x:e.x,y:e.y,from:{x:e.x,y:e.y},to:{x:e.x+Math.cos(a)*240,y:e.y+Math.sin(a)*240},born:age,duration:1.6,owner:e});
        this.events.push({type:'throw',x:e.x,y:e.y});e.state='recover';e.until=age+2.4;
      }return;
    }
    if(e.state==='recover'){
      if(d<175)this.moveEnemy(e,h,90,dt,true);
      if(age>=e.until)e.state='idle';return;
    }
    const range=e.kind===3?235:215;
    if(d>range){this.moveEnemy(e,h,e.kind===1?65:48,dt);return;}
    if(e.kind===3){e.state='charge';e.chargeAt=age;e.until=age+1.1;}
    else {e.aim=this.aim();e.state='mark';e.until=age+(e.kind===1?.65:.85);}
  }
  updateHazards(dt){
    const h=this.body[0];
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],t=(this.age-p.born)/p.duration;
      if(p.type==='boomerang'){
        if(t>=1){this.projectiles.splice(i,1);continue;}
        if(t<.5){const k=Math.sin(t*Math.PI);p.x=p.from.x+(p.to.x-p.from.x)*k;p.y=p.from.y+(p.to.y-p.from.y)*k;}
        else {const k=(t-.5)*2,target=this.enemies.includes(p.owner)?p.owner:p.from;p.x=p.to.x+(target.x-p.to.x)*k;p.y=p.to.y+(target.y-p.to.y)*k;}
        if(distance(p,h)<13){this.fail('빡침 부메랑에 맞았어요.');return;}
        if(this.bodyHit(p,13)){this.projectiles.splice(i,1);this.events.push({type:'defeat',x:p.x,y:p.y});}
      }else {
        p.x=p.from.x+(p.to.x-p.from.x)*Math.min(t,1);p.y=p.from.y+(p.to.y-p.from.y)*Math.min(t,1);
        if(t>=1){
          this.projectiles.splice(i,1);
          if(p.type==='potion'){
            if(this.puddles.length>=12)this.puddles.shift();
            this.puddles.push({x:p.to.x,y:p.to.y,radius:35,born:this.age,until:this.age+7});
            if(distance(h,p.to)<39)this.slowUntil=this.age+1.2;
            this.events.push({type:'splash',x:p.to.x,y:p.to.y});
          }else {this.events.push({type:'impact',x:p.to.x,y:p.to.y});if(distance(h,p.to)<24){this.fail('신발에 맞았어요.');return;}}
        }
      }
    }
    this.puddles=this.puddles.filter(p=>p.until>this.age);
    for(let i=this.bombs.length-1;i>=0;i--){
      const b=this.bombs[i];
      if(b.armed===null && this.age-b.born>.5 && distance(h,b)<82)b.armed=this.age;
      if(b.armed!==null && this.age-b.armed>=.95){
        this.bombs.splice(i,1);this.events.push({type:'blast',x:b.x,y:b.y,radius:72});
        if(distance(h,b)<72+this.radius){this.fail('폭탄에 휘말렸어요.');return;}
      }else if(this.age-b.born>30)this.bombs.splice(i,1);
    }
  }

}

export function headingFromKeys(keys,angle){
  const x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
  const y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
  return x||y?Math.atan2(y,x):angle;
}
