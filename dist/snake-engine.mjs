export const FOOD=Object.freeze({CHILI:22,EGGPLANT:17,BLUEBERRY:5,TOMATO:44,BEER:3,GOLDEN_APPLE:46});
export const TAU=Math.PI*2;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function turnToward(angle,target,max){const d=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));return angle+Math.max(-max,Math.min(max,d));}
export function touches(p,r,b){const c=Math.min(b.radius||0,b.w/2,b.h/2),x=Math.max(Math.abs(p.x-b.x-b.w/2)-(b.w/2-c),0),y=Math.max(Math.abs(p.y-b.y-b.h/2)-(b.h/2-c),0);return Math.hypot(x,y)<c+r;}
export function headingFromKeys(keys,angle){const x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));return x||y?Math.atan2(y,x):angle;}
export function cardObstacle(b,gap=12,rowGap=18){const x=Math.max(0,(20.25-gap)/2),y=Math.max(0,(20.25-rowGap)/2);return{x:b.left+x,y:b.top+y,w:b.width-2*x,h:b.height-2*y,radius:Math.max(3,b.width*.21-Math.max(x,y))};}

export class SnakeGame{
  constructor({width,height,origin,angle=0,obstacles=[],random=Math.random}){
    Object.assign(this,{width,height,obstacles,random,angle,target:angle});
    this.body=[{...origin}];this.radius=4;this.length=1;this.goalLength=42;this.speed=125;
    this.age=0;this.score=0;this.kills=0;this.dead=false;this.events=[];
    this.food=[];this.enemies=[];this.projectiles=[];this.bombs=[];this.puddles=[];this.slowUntil=0;
    this.buff={kind:null,until:0};this.graceUntil=0;this.nextBlueShot=0;this.freezeUntil=0;this.nextEnemy=11+random()*5;this.spawnCount=0;this.nextBoss=90;
    this.knife=null;this.armed=false;this.nextKnife=0;this.specialIndex=0;this.refill();
  }
  get buffKind(){return this.buff.until>this.age?this.buff.kind:null;}
  get invincible(){return this.buffKind==='rainbow'||this.age<this.graceUntil;}
  get currentSpeed(){if(this.age<this.freezeUntil)return 0;return(this.speed+Math.min(Math.max(0,this.score)*1.2,32))*(this.buffKind==='red'?1.5:this.buffKind==='rainbow'?1.3:1)*(!this.invincible&&this.age<this.slowUntil?.55:1);}
  get hasBoss(){return this.enemies.some(e=>e.kind===6);}
  blocked(p,r){return p.x<r+2||p.y<r+2||p.x>this.width-r-2||p.y>this.height-r-2||this.obstacles.some(b=>touches(p,r,b));}
  enemyRadius(e){return e.kind===6?36:10;}
  enemyDiscs(e,p=e){return e.kind===4?[{x:p.x,y:p.y,r:10},{x:p.x-23,y:p.y+1,r:6}]:[{x:p.x,y:p.y,r:this.enemyRadius(e)}];}
  freePoint(minDistance=60,radius=16){
    for(let i=0;i<700;i++){
      const p={x:18+this.random()*(this.width-36),y:18+this.random()*(this.height-36)};
      if(!this.blocked(p,radius)&&distance(p,this.body[0])>minDistance&&!this.body.some(b=>distance(p,b)<radius+8)&&!this.food.some(b=>distance(p,b)<radius+18)&&!this.enemies.some(b=>this.enemyDiscs(b).some(d=>distance(p,d)<radius+d.r+8))&&!this.bombs.some(b=>distance(p,b)<radius+18)&&(!this.knife||distance(p,this.knife)>radius+18))return p;
    }return null;
  }
  refill(){while(this.food.length<Math.min(12,3+Math.floor(this.age/20))){const p=this.freePoint();if(!p)break;this.food.push({...p,kind:Math.floor(this.random()*47)});}}
  setBuff(kind,duration){if(this.buffKind==='rainbow'&&kind!=='rainbow')this.graceUntil=this.age+1.5;this.buff={kind,until:this.age+duration};if(kind==='rainbow')this.graceUntil=this.buff.until+1.5;this.slowUntil=0;}
  eatFood(p){
    this.score+=p.kind===FOOD.GOLDEN_APPLE?3:1;this.goalLength+=24;
    if(p.kind===FOOD.EGGPLANT){this.setBuff('purple',1.1);this.freezeUntil=this.age+1.1;this.events.push({type:'penalty',...p});return;}
    if(p.kind===FOOD.GOLDEN_APPLE)for(let i=0;i<10;i++)this.spawnEnemy(0,true);
    if(p.kind===FOOD.CHILI)this.setBuff('red',10);
    if(p.kind===FOOD.BLUEBERRY){this.setBuff('blue',8);this.nextBlueShot=this.age;}
    if(p.kind===FOOD.TOMATO)this.setBuff('rainbow',10);
    if(p.kind===FOOD.BEER)this.setBuff('orange',10);
    this.events.push({type:'eat',...p});
  }
  spawnSpecial(){
    if(this.food.length>=28)return false;
    const kinds=[FOOD.TOMATO,FOOD.CHILI,FOOD.BLUEBERRY,FOOD.EGGPLANT,FOOD.BEER,FOOD.GOLDEN_APPLE],p=this.nearPoint(this.body[0],50,100)||this.freePoint(40);
    if(!p)return false;this.food.push({...p,kind:kinds[this.specialIndex++%6]});return true;
  }
  nearPoint(center,min,max){
    for(let i=0;i<80;i++){const a=this.random()*TAU,r=min+this.random()*(max-min),p={x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r};if(!this.blocked(p,12)&&!this.food.some(o=>distance(p,o)<28)&&!this.enemies.some(o=>distance(p,o)<this.enemyRadius(o)+18)&&!this.bombs.some(o=>distance(p,o)<24))return p;}return null;
  }
  chooseEnemyKind(){return this.random()<.62?0:1+Math.floor(this.random()*5);}
  spawnEnemy(kind=this.chooseEnemyKind(),bonus=false){
    if(this.enemies.length>=(bonus?96:32))return false;
    const p=this.freePoint(150,kind===4?31:16);if(!p)return false;
    this.enemies.push({...p,kind,born:this.age,state:'idle',until:this.age+(kind===4?10+this.random()*12:0)});
    this.events.push({type:'enemy',...p});return true;
  }
  spawnBoss(){
    if(this.hasBoss)return false;
    const p=this.freePoint(170,46);if(!p)return false;
    this.enemies.push({...p,kind:6,born:this.age,state:'idle',until:this.age+1.5});this.nextKnife=this.age;this.nextBoss=this.age+120;
    this.events.push({type:'boss',...p});this.ensureKnife();return true;
  }
  ensureKnife(){if(this.hasBoss&&!this.armed&&!this.knife&&this.age>=this.nextKnife){const p=this.freePoint(45);if(p)this.knife={...p};}}
  blade(){const h=this.body[0];return{x:h.x+Math.cos(this.angle)*24,y:h.y+Math.sin(this.angle)*24};}
  consumeKnife(){this.armed=false;this.nextKnife=this.age+6;this.events.push({type:'blade'});}
  killEnemy(e,source='impact'){
    if(e.kind===6&&source!=='knife')return false;
    const i=this.enemies.indexOf(e);if(i<0)return false;
    this.enemies.splice(i,1);this.kills++;this.events.push({type:e.kind===6?'boss-defeat':'defeat',x:e.x,y:e.y});
    if(e.kind===6){this.knife=null;this.nextBoss=this.age+120;}
    return true;
  }
  fail(reason){if(this.dead)return;this.dead=true;this.events.push({type:'fail',reason});}
  step(dt){let left=Math.max(0,Number.isFinite(dt)?dt:0);while(left>0&&!this.dead){const s=Math.min(left,1/120);this.tick(s);left-=s;}}
  bodyHit(p,r){let trail=0;for(let i=1;i<this.body.length;i++){trail+=distance(this.body[i-1],this.body[i]);if(trail>21&&distance(p,this.body[i])<r)return true;}return false;}
  tick(dt){
    this.age+=dt;
    for(const p of this.puddles)if(!this.invincible&&p.until>this.age&&distance(this.body[0],p)<p.radius+this.radius)this.slowUntil=this.age+8;
    this.puddles=this.puddles.filter(p=>p.until>this.age);
    const wobble=this.buffKind==='orange'?Math.sin(this.age*4.2)*.5+Math.sin(this.age*7.1)*.12:0;
    this.angle=turnToward(this.angle,this.target+wobble,4.6*dt);
    const speed=this.currentSpeed;let head={x:this.body[0].x+Math.cos(this.angle)*speed*dt,y:this.body[0].y+Math.sin(this.angle)*speed*dt};
    if(this.invincible)head=this.deflect(head,speed*dt);
    else if(this.blocked(head,this.radius)){this.fail('벽이나 글자, 카드에 부딪혔어요.');return;}
    if(!this.invincible&&this.bodyHit(head,this.radius*1.65)){this.fail('자기 몸에 부딪혔어요.');return;}
    if(distance(head,this.body[0])>0)this.body.unshift(head);this.length=Math.min(this.goalLength,this.length+dt*82);
    let used=0;for(let i=1;i<this.body.length;i++){const d=distance(this.body[i-1],this.body[i]);if(used+d>this.length){const t=(this.length-used)/d;this.body[i]={x:this.body[i-1].x+(this.body[i].x-this.body[i-1].x)*t,y:this.body[i-1].y+(this.body[i].y-this.body[i-1].y)*t};this.body.length=i+1;break;}used+=d;}
    for(let i=this.food.length-1;i>=0;i--)if(distance(head,this.food[i])<15)this.eatFood(this.food.splice(i,1)[0]);
    if(this.knife&&distance(head,this.knife)<17){this.knife=null;this.armed=true;this.events.push({type:'knife'});}
    this.refill();
    if(this.age>=this.nextEnemy){this.nextEnemy=this.age+Math.max(1.7,10-this.age*.055)+this.random()*2;if(this.enemies.length<Math.min(24,3+Math.floor(this.age/15))){if(this.spawnEnemy(this.spawnCount===0?0:this.chooseEnemyKind()))this.spawnCount++;}}
    if(this.age>=this.nextBoss){if(!this.spawnBoss())this.nextBoss=this.age+5;}
    this.ensureKnife();this.updateBlade();
    for(const e of [...this.enemies]){
      if(!this.enemies.includes(e)||this.age-e.born<1)continue;
      this.updateEnemy(e,dt);if(this.dead)return;
      const hit=distance(e,head)<this.enemyRadius(e)+4;
      if(hit&&!this.invincible){this.fail('적에게 잡혔어요.');return;}
      if(e.kind!==6&&((this.invincible&&hit)||this.bodyHit(e,14)))this.killEnemy(e,'body');
    }
    if(this.buffKind==='blue'&&this.age>=this.nextBlueShot){
      this.nextBlueShot=this.age+.28;
      if(this.projectiles.length<96){const a=this.angle;this.projectiles.push({type:'blue',x:head.x+Math.cos(a)*14,y:head.y+Math.sin(a)*14,vx:Math.cos(a)*360,vy:Math.sin(a)*360,born:this.age});}
    }
    this.updateHazards(dt);
  }
  deflect(next,step){
    const solid=p=>this.blocked(p,this.radius);
    if(!solid(next))return next;
    const h=this.body[0];
    for(const delta of [Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI*3/4,-Math.PI*3/4,Math.PI]){
      const a=this.angle+delta,p={x:h.x+Math.cos(a)*step,y:h.y+Math.sin(a)*step};
      const ahead={x:h.x+Math.cos(a)*(step+5),y:h.y+Math.sin(a)*(step+5)};
      if(!solid(p)&&!solid(ahead)){this.angle=a;this.target=a;return p;}
    }
    this.angle+=Math.PI/2;this.target=this.angle;return {...h};
  }
  isFlying(p){return(p.type==='shoe'||p.type==='potion')&&this.age-p.born<p.duration;}
  enemyBlocked(e,p){
    return this.enemyDiscs(e,p).some(c=>this.blocked(c,c.r)||this.enemies.some(o=>o!==e&&this.enemyDiscs(o).some(d=>distance(c,d)<c.r+d.r+1))||this.food.some(f=>distance(c,f)<c.r+10)||this.bombs.some(b=>distance(c,b)<c.r+10)||(this.knife&&distance(c,this.knife)<c.r+10))||(e.kind===6&&this.bodyHit(p,40))||(e.kind===4&&this.enemyDiscs(e,p).some(c=>this.body.some(b=>distance(c,b)<c.r+7)));
  }
  moveEnemy(e,target,speed,dt,away=false){
    const steps=Math.max(1,Math.ceil(speed*dt/2)),stride=speed*dt/steps;let moved=false;
    for(let i=0;i<steps;i++){const a=Math.atan2(target.y-e.y,target.x-e.x)+(away?Math.PI:0);let accepted=false;for(const offset of [0,.4,-.4,.85,-.85,1.3,-1.3,1.65,-1.65]){const p={x:e.x+Math.cos(a+offset)*stride,y:e.y+Math.sin(a+offset)*stride};if(!this.enemyBlocked(e,p)){e.x=p.x;e.y=p.y;accepted=true;moved=true;break;}}if(!accepted)break;}return moved;
  }
  orbit(e,dt){e.orbitDirection??=this.random()<.5?-1:1;const h=this.body[0],a=Math.atan2(e.y-h.y,e.x-h.x)+e.orbitDirection*.38;this.moveEnemy(e,{x:h.x+Math.cos(a)*185,y:h.y+Math.sin(a)*185},72,dt);}
  randomAim(){const h=this.body[0];for(let i=0;i<60;i++){const a=this.random()*TAU,r=36+this.random()*100,p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};if(!this.blocked(p,8))return p;}return this.freePoint(30)||{x:h.x+36,y:h.y};}
  toss(e,type){
    if(this.projectiles.length>=96)return;
    const to=this.randomAim(),a=Math.atan2(to.y-e.y,to.x-e.x),from={x:e.x+Math.cos(a)*22,y:e.y+Math.sin(a)*22};
    this.projectiles.push({type,...from,from,to,born:this.age,duration:type==='boomerang'?1.6:type==='shoe'?.72:.88,owner:e});this.events.push({type:'throw',x:e.x,y:e.y});
  }
  dropBomb(e){if(this.bombs.length>=20)return;for(let i=0;i<12;i++){const a=i*TAU/12,p={x:e.x+Math.cos(a)*27,y:e.y+Math.sin(a)*27};if(!this.blocked(p,11)&&!this.enemies.some(o=>this.enemyDiscs(o).some(d=>distance(p,d)<11+d.r))&&!this.food.some(o=>distance(p,o)<22)&&!this.bombs.some(o=>distance(p,o)<24)){this.bombs.push({...p,born:this.age,armed:null});return;}}}
  updateEnemy(e,dt){
    const h=this.body[0],d=distance(e,h),age=this.age;e.state||='idle';e.until??=age;
    if(e.kind===0){this.moveEnemy(e,h,(this.speed+Math.min(Math.max(0,this.score)*1.2,32))*.94,dt);return;}
    if(e.kind===6){this.updateBoss(e,dt);return;}
    if(e.kind===4){
      if(e.state==='dash'){
        const aim={x:h.x+Math.cos(e.side)*43,y:h.y+Math.sin(e.side)*43};
        if(!this.enemyBlocked(e,aim))e.aim=aim;
        const moved=this.moveEnemy(e,e.aim,620,dt);
        e.stuck=moved?0:(e.stuck||0)+dt;
        if(distance(e,e.aim)<9||age>=e.until||e.stuck>.12){e.state='idle';e.until=age+10+this.random()*14;}
      }else if(age>=e.until){
        for(let i=0;i<40;i++){const a=this.random()*TAU,p={x:h.x+Math.cos(a)*43,y:h.y+Math.sin(a)*43};if(!this.enemyBlocked(e,p)){e.side=a;e.aim=p;e.state='dash';e.stuck=0;e.until=age+distance(e,p)/620+2;this.events.push({type:'nerd',x:e.x,y:e.y});break;}}
        if(e.state!=='dash')e.until=age+10;
      }return;
    }
    if(e.kind===5){if(!e.aim||distance(e,e.aim)<18||age>(e.roamUntil||0)){e.aim=this.freePoint(20)||{x:e.x,y:e.y};e.roamUntil=age+3;}this.moveEnemy(e,e.aim,56,dt);if(age>=e.until){this.dropBomb(e);e.until=age+3+this.random()*3;}return;}
    if(e.kind===3){this.orbit(e,dt);if(age>=e.until&&d<300){this.toss(e,'boomerang');e.state='recover';e.chargeAt=age;e.until=age+2.4;}return;}
    if(e.state==='flee'){this.moveEnemy(e,h,155,dt,true);if(age>=e.until)e.state='idle';return;}
    if(e.state==='recover'){if(d<175)this.moveEnemy(e,h,90,dt,true);if(age>=e.until)e.state='idle';return;}
    if(d>215){this.moveEnemy(e,h,e.kind===1?65:48,dt);return;}
    this.toss(e,e.kind===1?'shoe':'potion');e.state=e.kind===1?'flee':'recover';e.until=age+(e.kind===1?3.5:2.8)+this.random();
  }
  fireTooth(e,a,speed=205){
    if(this.projectiles.length>=96)return;
    const p={x:e.x+Math.cos(a)*47,y:e.y+Math.sin(a)*47};
    if(!this.blocked(p,7))this.projectiles.push({type:'tooth',...p,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,born:this.age,owner:e});
  }
  updateBoss(e,dt){
    const h=this.body[0],age=this.age;
    if(e.pattern===undefined){e.pattern=0;e.patternUntil=age+6;e.nextShot=e.until??age;}
    if(age>=e.patternUntil){e.pattern=(e.pattern+1)%3;e.patternUntil=age+6;e.nextShot=age;e.orbitAngle=Math.atan2(e.y-h.y,e.x-h.x);e.orbitCenter={...h};}
    if(e.pattern===1){
      e.orbitAngle+=TAU/6*dt;
      const c=e.orbitCenter;this.moveEnemy(e,{x:c.x+Math.cos(e.orbitAngle)*160,y:c.y+Math.sin(e.orbitAngle)*160},190,dt);
    }else this.moveEnemy(e,h,e.pattern===2?45:27,dt);
    if(age<e.nextShot)return;
    const aim=Math.atan2(h.y-e.y,h.x-e.x);
    if(e.pattern===0){const offset=this.random()*TAU;for(let i=0;i<14;i++)this.fireTooth(e,offset+i*TAU/14,175);e.nextShot=age+2;}
    if(e.pattern===1){this.fireTooth(e,aim,245);e.nextShot=age+.11;}
    if(e.pattern===2){for(let i=-2;i<=2;i++)this.fireTooth(e,aim+i*.18,230);e.nextShot=age+.7;}
    this.events.push({type:'throw',x:e.x,y:e.y});
  }
  updateBlade(){
    if(!this.armed)return;const p=this.blade();
    for(const e of this.enemies)if(distance(e,p)<this.enemyRadius(e)+10){this.killEnemy(e,'knife');this.consumeKnife();return;}
    for(const shot of this.projectiles)if(!shot.dead&&shot.type!=='blue'&&!this.isFlying(shot)&&distance(shot,p)<16){shot.dead=true;this.consumeKnife();return;}
    for(const b of this.bombs)if(distance(b,p)<17){this.bombs.splice(this.bombs.indexOf(b),1);this.consumeKnife();return;}
  }
  explode(b){
    const queue=[b],seen=new Set();
    while(queue.length){const x=queue.shift();if(seen.has(x))continue;seen.add(x);const i=this.bombs.indexOf(x);if(i>=0)this.bombs.splice(i,1);
      this.events.push({type:'blast',x:x.x,y:x.y,radius:72});
      for(const e of [...this.enemies])if(distance(e,x)<72+this.enemyRadius(e))this.killEnemy(e,'blast');
      for(const p of this.projectiles)if(!this.isFlying(p)&&distance(p,x)<80){p.dead=true;p.cancelSpill=true;}
      this.puddles=this.puddles.filter(p=>distance(p,x)>=72+p.radius);
      this.food=this.food.filter(p=>distance(p,x)>=82);
      if(this.knife&&distance(this.knife,x)<82){this.knife=null;this.nextKnife=this.age+6;}
      for(const other of this.bombs)if(distance(other,x)<82&&!seen.has(other))queue.push(other);
      if(!this.invincible&&distance(this.body[0],x)<76)this.fail('폭탄에 휘말렸어요.');
    }
  }
  finalizeShots(){
    for(const p of this.projectiles)if(p.dead&&p.type==='potion'&&!p.spilled&&!p.cancelSpill){
      p.spilled=true;if(this.puddles.length>=16)this.puddles.shift();
      this.puddles.push({x:p.x,y:p.y,radius:52,born:this.age,until:this.age+12});
      if(!this.invincible&&distance(this.body[0],p)<56)this.slowUntil=this.age+8;
      this.events.push({type:'splash',x:p.x,y:p.y});
    }
    this.projectiles=this.projectiles.filter(p=>!p.dead);
  }
  updateHazards(dt){
    const h=this.body[0];
    for(const p of this.projectiles){
      if(p.dead)continue;
      if(p.type==='tooth'||p.type==='blue'){p.x+=p.vx*dt;p.y+=p.vy*dt;}
      else{
        const t=(this.age-p.born)/p.duration;
        if(p.type==='boomerang'){
          if(t>=1){p.dead=true;continue;}
          if(t<.5){const k=Math.sin(t*Math.PI);p.x=p.from.x+(p.to.x-p.from.x)*k;p.y=p.from.y+(p.to.y-p.from.y)*k;}
          else{const k=(t-.5)*2,target=this.enemies.includes(p.owner)?p.owner:p.from;p.x=p.to.x+(target.x-p.to.x)*k;p.y=p.to.y+(target.y-p.to.y)*k;}
        }else{const k=Math.min(t,1);p.x=p.from.x+(p.to.x-p.from.x)*k;p.height=Math.sin(k*Math.PI)*85;p.y=p.from.y+(p.to.y-p.from.y)*k-p.height;p.airborne=p.height>12;if(t>=1)p.landed=true;}
      }
      if(this.isFlying(p))continue;
      const outside=p.x<9||p.y<9||p.x>this.width-9||p.y>this.height-9;
      if(outside||(!p.airborne&&this.blocked(p,7))){p.dead=true;p.cancelSpill=outside;this.events.push({type:'impact',x:p.x,y:p.y});}
    }
    // All moving attack objects cancel each other, including same-type shots.
    for(let i=0;i<this.projectiles.length;i++){const a=this.projectiles[i];if(a.dead||this.isFlying(a))continue;for(let j=i+1;j<this.projectiles.length;j++){const b=this.projectiles[j];if(!b.dead&&!this.isFlying(b)&&distance(a,b)<15){a.dead=b.dead=true;this.events.push({type:'impact',x:a.x,y:a.y});break;}}}
    for(const p of this.projectiles){
      if(p.dead||this.isFlying(p))continue;
      if(p.type!=='blue'&&this.armed&&distance(p,this.blade())<16){p.dead=true;this.consumeKnife();continue;}
      for(const e of [...this.enemies]){
        if(e===p.owner&&p.type==='boomerang')continue;
        if(e===p.owner&&!p.leftOwner){if(distance(p,e)>this.enemyRadius(e)+10)p.leftOwner=true;else continue;}
        if(distance(p,e)<this.enemyRadius(e)+7){p.dead=true;this.killEnemy(e,'projectile');break;}
      }
      if(p.dead)continue;
      const fi=p.type==='blue'?-1:this.food.findIndex(f=>distance(p,f)<17);if(fi>=0){this.food.splice(fi,1);p.dead=true;this.events.push({type:'impact',x:p.x,y:p.y});continue;}
      if(p.type!=='blue'&&this.knife&&distance(p,this.knife)<17){this.knife=null;this.nextKnife=this.age+6;p.dead=true;continue;}
      const bomb=this.bombs.find(b=>distance(p,b)<17);if(bomb){p.dead=true;this.explode(bomb);if(this.dead)return;continue;}
      if(p.type==='blue')continue;
      if(distance(p,h)<(p.landed?22:12)){
        p.dead=true;
        if(!this.invincible){if(p.type==='potion'){this.slowUntil=this.age+8;}else{this.fail('공격에 맞았어요.');return;}}
      }else if(this.bodyHit(p,12)){p.dead=true;this.events.push({type:'defeat',x:p.x,y:p.y});}
      if(p.landed){p.dead=true;if(p.type!=='potion')this.events.push({type:'impact',x:p.x,y:p.y});}
    }
    this.finalizeShots();
    for(const b of [...this.bombs]){
      if(!this.bombs.includes(b))continue;
      if(b.armed===null&&this.age-b.born>.5&&distance(h,b)<82)b.armed=this.age;
      if(b.armed!==null&&this.age-b.armed>=.95){this.explode(b);if(this.dead)return;}
      else if(this.age-b.born>30)this.bombs.splice(this.bombs.indexOf(b),1);
    }
    this.finalizeShots();
  }
}
