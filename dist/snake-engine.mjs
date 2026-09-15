export const FOOD = Object.freeze({"CHILI": 26, "EGGPLANT": 20, "BLUEBERRY": 6, "TOMATO": 48});
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
    this.projectiles=[];this.puddles=[];this.bombs=[];this.slowUntil=0;this.spawnCount=0;this.buff={kind:null,until:0};
    this.refill();
  }
  blocked(p,r) {
    return p.x<r+2 || p.y<r+2 || p.x>this.width-r-2 || p.y>this.height-r-2 || this.obstacles.some(b=>touches(p,r,b));
  }
  freePoint(minDistance=60,radius=16) {
    for(let i=0;i<700;i++) {
      const p={x:18+this.random()*(this.width-36),y:18+this.random()*(this.height-36)};
      if(!this.blocked(p,radius) && distance(p,this.body[0])>minDistance &&
        !this.body.some(b=>distance(p,b)<23) && !this.food.some(b=>distance(p,b)<36) &&
        !this.enemies.some(b=>distance(p,b)<48) && !this.bombs.some(b=>distance(p,b)<36)) return p;
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
    this.angle=turnToward(this.angle,this.target,4.6*dt);
    for(const p of this.puddles)if(!this.invincible && p.until>this.age && distance(this.body[0],p)<p.radius+this.radius)this.slowUntil=this.age+1.2;
    const speed=this.currentSpeed;
    const head={x:this.body[0].x+Math.cos(this.angle)*speed*dt,y:this.body[0].y+Math.sin(this.angle)*speed*dt};
    if(this.invincible){
      const r=this.radius+2;
      if(head.x<r||head.x>this.width-r){head.x=Math.max(r,Math.min(this.width-r,head.x));this.angle=Math.PI-this.angle;this.target=Math.PI-this.target;}
      if(head.y<r||head.y>this.height-r){head.y=Math.max(r,Math.min(this.height-r,head.y));this.angle=-this.angle;this.target=-this.target;}
    }else if(this.blocked(head,this.radius)){this.fail('벽이나 글자, 카드에 부딪혔어요.');return;}
    let behind=0;
    for(let i=1;i<this.body.length;i++) {
      behind+=distance(this.body[i-1],this.body[i]);
      if(!this.invincible && behind>22 && distance(head,this.body[i])<this.radius*1.65){this.fail('자기 몸에 부딪혔어요.');return;}
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
      this.eatFood(this.food.splice(i,1)[0]);
    }
    this.refill();
    if(this.age>=this.nextEnemy) {
      this.nextEnemy=this.age+Math.max(1.7,10-this.age*.055)+this.random()*2;
      if(this.enemies.length<Math.min(24,3+Math.floor(this.age/15))){
        const kind=this.spawnCount<6?this.spawnCount:Math.floor(this.random()*6);
        const p=this.freePoint(160,kind===4?24:16);
        if(p){this.spawnCount++;
          this.enemies.push({...p,kind,born:this.age,state:'idle',until:this.age+(kind===4?12+this.random()*12:2)});this.events.push({type:'enemy',...p});}
      }
    }
    for(let i=this.enemies.length-1;i>=0;i--) {
      const e=this.enemies[i];if(this.age-e.born<1)continue;
      this.updateEnemy(e,dt);
      if(!this.invincible && e.kind!==4 && distance(e,head)<13){this.fail('표정 이모지에게 잡혔어요.');return;}
      if((this.invincible && distance(e,head)<16)||this.bodyHit(e,14)){this.enemies.splice(i,1);this.kills++;this.events.push({type:'defeat',x:e.x,y:e.y});}
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
  get buffKind(){return this.buff.until>this.age?this.buff.kind:null;}
  get invincible(){return this.buffKind==='rainbow';}
  get currentSpeed(){return (this.speed+Math.min(Math.max(0,this.score)*1.2,32))*(this.buffKind==='red'?1.5:1)*(!this.invincible&&this.age<this.slowUntil?.55:1);}
  setBuff(kind,duration){this.buff={kind,until:this.age+duration};this.slowUntil=0;}
  eatFood(p){
    if(p.kind===FOOD.EGGPLANT){this.score-=5;this.goalLength=Math.max(18,this.goalLength-48);this.length=Math.min(this.length,this.goalLength);this.events.push({type:'penalty',...p});return;}
    this.score++;this.goalLength+=24;
    if(p.kind===FOOD.CHILI)this.setBuff('red',5);
    if(p.kind===FOOD.BLUEBERRY)this.setBuff('blue',3);
    if(p.kind===FOOD.TOMATO)this.setBuff('rainbow',5);
    this.events.push({type:'eat',...p});
  }
  enemyDiscs(e,p=e){return e.kind===4?[{x:p.x,y:p.y,r:10},{x:p.x-16,y:p.y+1,r:6}]:[{x:p.x,y:p.y,r:10}];}
  enemyBlocked(e,p){
    return this.enemyDiscs(e,p).some(c=>this.blocked(c,c.r)||
      this.enemies.some(other=>other!==e&&this.enemyDiscs(other).some(d=>distance(c,d)<c.r+d.r+1))||
      this.food.some(f=>distance(c,f)<c.r+10)||this.bombs.some(b=>distance(c,b)<c.r+10));
  }
  moveEnemy(e,target,speed,dt,away=false){
    const steps=Math.max(1,Math.ceil(speed*dt/2)),stride=speed*dt/steps;let moved=false;
    for(let i=0;i<steps;i++){
      const a=Math.atan2(target.y-e.y,target.x-e.x)+(away?Math.PI:0);let accepted=false;
      for(const offset of [0,.4,-.4,.85,-.85,1.3,-1.3,1.65,-1.65]){
        const p={x:e.x+Math.cos(a+offset)*stride,y:e.y+Math.sin(a+offset)*stride};
        if(!this.enemyBlocked(e,p)){e.x=p.x;e.y=p.y;accepted=true;moved=true;break;}
      }
      if(!accepted)break;
    }
    return moved;
  }
  orbit(e,dt){
    e.orbitDirection ??= this.random()<.5?-1:1;
    const h=this.body[0],a=Math.atan2(e.y-h.y,e.x-h.x)+e.orbitDirection*.38;
    this.moveEnemy(e,{x:h.x+Math.cos(a)*185,y:h.y+Math.sin(a)*185},72,dt);
  }
  predictiveAim(e){
    const h=this.body[0],vx=Math.cos(this.angle)*this.currentSpeed,vy=Math.sin(this.angle)*this.currentSpeed;
    let t=Math.min(1.1,distance(e,h)/300),p;
    for(let i=0;i<3;i++){p={x:h.x+vx*t,y:h.y+vy*t};t=Math.min(1.1,distance(e,p)/300);}
    return p;
  }
  dropBomb(e){
    if(this.bombs.length>=20)return;
    for(let i=0;i<12;i++){
      const a=i*TAU/12,p={x:e.x+Math.cos(a)*27,y:e.y+Math.sin(a)*27};
      if(!this.blocked(p,11)&&!this.enemies.some(o=>this.enemyDiscs(o).some(d=>distance(p,d)<11+d.r))&&!this.food.some(o=>distance(p,o)<22)&&!this.bombs.some(o=>distance(p,o)<24)){
        this.bombs.push({...p,born:this.age,armed:null});return;
      }
    }
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
    e.state ||= 'idle';e.until ??= age+(e.kind===4?12+this.random()*12:2);
    if(e.kind===0){this.moveEnemy(e,h,37+Math.min(this.score,15),dt);return;}
    if(e.kind===4){
      // Harmless by design: it dashes to a nearby point, never attacks.
      if(e.state==='dash'){
        if(distance(e,e.aim)<12 || age>e.until){e.state='idle';e.until=age+10+this.random()*14;}
        else this.moveEnemy(e,e.aim,480,dt);
      }else if(age>e.until){
        const a=this.random()*TAU,p={x:h.x+Math.cos(a)*48,y:h.y+Math.sin(a)*48};
        e.aim=this.enemyBlocked(e,p)?{x:e.x,y:e.y}:p;e.state='dash';e.until=age+Math.min(2,distance(e,e.aim)/480+.2);
      }
      return;
    }
    if(e.kind===5){
      if(!e.aim||distance(e,e.aim)<18||age>(e.roamUntil||0)){e.aim=this.freePoint(20)||{...e};e.roamUntil=age+3;}
      this.moveEnemy(e,e.aim,56,dt);
      if(age>e.until){this.dropBomb(e);e.until=age+3+this.random()*3;}
      return;
    }
    if(e.kind===3){
      this.orbit(e,dt);
      if(e.state==='charge'){
        if(age>=e.until){
          const predicted=this.predictiveAim(e),a=Math.atan2(predicted.y-e.y,predicted.x-e.x),range=Math.min(360,Math.max(180,distance(e,predicted)));
          if(this.projectiles.length<24)this.projectiles.push({type:'boomerang',x:e.x,y:e.y,from:{x:e.x,y:e.y},to:{x:e.x+Math.cos(a)*range,y:e.y+Math.sin(a)*range},born:age,duration:1.6,owner:e});
          this.events.push({type:'throw',x:e.x,y:e.y});e.state='recover';e.until=age+2.4;
        }
      }else if(age>=e.until&&d<300){e.state='charge';e.chargeAt=age;e.until=age+1.1;}
      return;
    }
    if(e.state==='flee'){this.moveEnemy(e,h,155,dt,true);if(age>=e.until)e.state='idle';return;}
    if(e.state==='mark'){
      if(age>=e.until){e.state='shake';e.until=age+.42;}return;
    }
    if(e.state==='shake'){
      if(age>=e.until){this.toss(e,e.kind===1?'shoe':'potion');e.state=e.kind===1?'flee':'recover';e.until=age+(e.kind===1?3.5:2.8)+this.random();}return;
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
        if(!this.invincible && distance(p,h)<13){this.fail('빡침 부메랑에 맞았어요.');return;}
        if((this.invincible && distance(p,h)<16)||this.bodyHit(p,13)){this.projectiles.splice(i,1);this.events.push({type:'defeat',x:p.x,y:p.y});}
      }else {
        p.x=p.from.x+(p.to.x-p.from.x)*Math.min(t,1);p.y=p.from.y+(p.to.y-p.from.y)*Math.min(t,1);
        if(t>=1){
          this.projectiles.splice(i,1);
          if(p.type==='potion'){
            if(this.puddles.length>=12)this.puddles.shift();
            this.puddles.push({x:p.to.x,y:p.to.y,radius:35,born:this.age,until:this.age+7});
            if(!this.invincible && distance(h,p.to)<39)this.slowUntil=this.age+1.2;
            this.events.push({type:'splash',x:p.to.x,y:p.to.y});
          }else {this.events.push({type:'impact',x:p.to.x,y:p.to.y});if(!this.invincible && distance(h,p.to)<24){this.fail('신발에 맞았어요.');return;}}
        }
      }
    }
    this.puddles=this.puddles.filter(p=>p.until>this.age);
    for(let i=this.bombs.length-1;i>=0;i--){
      const b=this.bombs[i];
      if(b.armed===null && this.age-b.born>.5 && distance(h,b)<82)b.armed=this.age;
      if(b.armed!==null && this.age-b.armed>=.95){
        this.bombs.splice(i,1);this.events.push({type:'blast',x:b.x,y:b.y,radius:72});
        if(!this.invincible && distance(h,b)<72+this.radius){this.fail('폭탄에 휘말렸어요.');return;}
      }else if(this.age-b.born>30)this.bombs.splice(i,1);
    }
  }

}

export function headingFromKeys(keys,angle){
  const x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
  const y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
  return x||y?Math.atan2(y,x):angle;
}

export function cardObstacle(b){
  const inset=Math.min(8,Math.max(5,b.width*.085));
  return {x:b.left+inset,y:b.top+inset,w:b.width-2*inset,h:b.height-2*inset,radius:Math.max(3,b.width*.21-inset)};
}
