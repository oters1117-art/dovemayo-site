import {BossArena,REWARD,attackRank} from './boss-arena.mjs?v=1';
import {MusicPads} from './music-pads.mjs?v=5';
import {planSnapshotRoute} from './navigation-snapshot.mjs?v=1';
export const FOOD=Object.freeze({CHILI:22,EGGPLANT:17,BLUEBERRY:5,TOMATO:44,BEER:3,GOLDEN_APPLE:46});
export const TAU=Math.PI*2;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function turnToward(angle,target,max){const d=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));return angle+Math.max(-max,Math.min(max,d));}
export function touches(p,r,b){if(b.parts){if(p.x+r<b.x||p.y+r<b.y||p.x-r>b.x+b.w||p.y-r>b.y+b.h)return false;return b.parts.some(part=>touches(p,r,part));}const c=Math.min(b.radius||0,b.w/2,b.h/2),x=Math.max(Math.abs(p.x-b.x-b.w/2)-(b.w/2-c),0),y=Math.max(Math.abs(p.y-b.y-b.h/2)-(b.h/2-c),0);return Math.hypot(x,y)<c+r;}
export function headingFromKeys(keys,angle){const x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));return x||y?Math.atan2(y,x):angle;}
export function cardObstacle(b,gap=12,rowGap=18){const x=Math.max(0,(20.25-gap)/2),y=Math.max(0,(20.25-rowGap)/2);return{x:b.left+x,y:b.top+y,w:b.width-2*x,h:b.height-2*y,radius:Math.max(3,b.width*.21-Math.max(x,y))};}

export class SnakeGame{
  constructor({width,height,origin,angle=0,obstacles=[],random=Math.random,routePlanner=null,musicVolume=50}){
    Object.assign(this,{width,height,obstacles,random,routePlanner,angle,target:angle});
    this.body=[{...origin}];this.radius=4;this.length=1;this.goalLength=42;this.speed=125;
    this.age=0;this.score=0;this.kills=0;this.bossKills=0;this.dead=false;this.events=[];
    this.food=[];this.enemies=[];this.projectiles=[];this.bombs=[];this.puddles=[];
    this.buff={kind:null,until:0};this.graceUntil=0;this.nextBlueShot=0;this.nextEnemy=11+random()*5;this.spawnCount=0;this.nextBoss=120;
    this.nextRefill=0;this.knife=null;this.armed=false;this.nextKnife=0;this.specialIndex=0;this.musicPads=new MusicPads(musicVolume);this.arena=new BossArena(this);this.shield=0;this.selfPhase=false;this.combo=null;this.refill();
  }
  get buffKind(){return this.buff.until>this.age?this.buff.kind:null;}
  get invincible(){return !!this.debugInvincible||this.buffKind==='rainbow'||this.age<this.graceUntil;}
  get timeStopped(){return this.buffKind==='rainbow'&&this.combo==='purple';}
  get worldFrozen(){return this.age<this.arena.shockUntil;}
  get activeCombo(){return this.buffKind==='rainbow'?this.combo:null;}
  get slowUntil(){return this.buffKind==='green'?this.buff.until:0;}
  get freezeUntil(){return this.buffKind==='purple'?this.buff.until:0;}
  get currentSpeed(){if(this.buffKind==='purple')return 0;return(this.arena.celebration?.1:1)*(this.speed+Math.min(Math.max(0,this.score)*1.2,32))*(this.buffKind==='red'?1.5:this.buffKind==='rainbow'?(this.combo==='red'?2.1:1.3):this.buffKind==='green'?.55:1);}
  get hasBoss(){return this.enemies.some(e=>e.kind>=6&&e.kind<=10);}
  blocked(p,r){return p.x<r+2||p.y<r+2||p.x>this.width-r-2||p.y>this.height-r-2||this.obstacles.some(b=>touches(p,r,b));}
  enemyRadius(e){return e.kind===6?42:e.kind===10?31:e.kind>=6&&e.kind<=9?(e.state==='egg'?22:34):10;}
  enemyDiscs(e,p=e){return e.kind===7?[-24,-12,0,12,24].map(x=>({x:p.x+x,y:p.y+40,r:12})):[{x:p.x,y:p.y,r:this.enemyRadius(e)}];}
  hitsEnemy(p,e,r=0){return this.enemyDiscs(e).some(d=>distance(p,d)<d.r+r);}
  freePoint(minDistance=60,radius=16){
    for(let i=0;i<700;i++){
      const p={x:18+this.random()*(this.width-36),y:18+this.random()*(this.height-36)};
      if(!this.musicPads?.pads.some(o=>distance(p,o)<radius+18)&&!this.blocked(p,radius)&&distance(p,this.body[0])>minDistance&&!this.body.some(b=>distance(p,b)<radius+8)&&!this.food.some(b=>distance(p,b)<radius+18)&&!this.enemies.some(b=>this.enemyDiscs(b).some(d=>distance(p,d)<radius+d.r+8))&&!this.bombs.some(b=>distance(p,b)<radius+18)&&(!this.knife||distance(p,this.knife)>radius+18))return p;
    }return null;
  }
  refill(){if(this.age<this.nextRefill)return;while(this.food.length<3+Math.floor(this.score/5)){const p=this.freePoint();if(!p){this.nextRefill=this.age+.5;break;}this.food.push({...p,kind:Math.floor(this.random()*47)});}}
  setBuff(kind,duration){
    const current=this.buffKind,colors=['purple','red','blue','orange'];
    if(current==='rainbow'&&kind!=='rainbow'){
      if(!colors.includes(kind))return false;
      this.combo=kind;this.buff.until=this.age+10;this.graceUntil=this.buff.until+1.5;
      if(kind==='blue')this.nextBlueShot=this.age;this.events.push({type:'combo',kind});return true;
    }
    this.combo=kind==='rainbow'?(current==='rainbow'?this.combo:colors.includes(current)?current:null):null;
    this.buff={kind,until:this.age+duration};
    if(kind==='rainbow'){this.graceUntil=this.buff.until+1.5;if(this.combo==='blue')this.nextBlueShot=this.age;if(this.combo)this.events.push({type:'combo',kind:this.combo});}
    return true;
  }
  eatFood(p){
    if(p.kind===REWARD.PUMPKIN){this.shield=1;this.events.push({type:'shield-pickup',...p});return;}
    if(p.kind===REWARD.NAZAR){this.selfPhase=true;this.amuletAt=this.age;this.events.push({type:'amulet',...p});return;}
    this.score+=p.kind===FOOD.GOLDEN_APPLE?5:1;this.goalLength+=p.kind===FOOD.GOLDEN_APPLE?120:24;
    if(p.kind===FOOD.EGGPLANT){this.setBuff('purple',1.1);this.events.push({type:'penalty',...p});return;}
    if(p.kind===FOOD.GOLDEN_APPLE)for(let i=0;i<15;i++)this.spawnEnemy(this.chooseEnemyKind(),true);
    if(p.kind===FOOD.CHILI)this.setBuff('red',10);
    if(p.kind===FOOD.BLUEBERRY){this.setBuff('blue',8);this.nextBlueShot=this.age;}
    if(p.kind===FOOD.TOMATO)this.setBuff('rainbow',10);
    if(p.kind===FOOD.BEER)this.setBuff('orange',10);
    this.events.push({type:'eat',...p});
  }
  spawnSpecial(){

    const kinds=[FOOD.TOMATO,FOOD.CHILI,FOOD.BLUEBERRY,FOOD.EGGPLANT,FOOD.BEER,FOOD.GOLDEN_APPLE],p=this.nearPoint(this.body[0],50,100)||this.freePoint(40);
    if(!p)return false;this.food.push({...p,kind:kinds[this.specialIndex++%6]});return true;
  }
  nearPoint(center,min,max){
    for(let i=0;i<80;i++){const a=this.random()*TAU,r=min+this.random()*(max-min),p={x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r};if(!this.blocked(p,12)&&!this.food.some(o=>distance(p,o)<28)&&!this.enemies.some(o=>distance(p,o)<this.enemyRadius(o)+18)&&!this.bombs.some(o=>distance(p,o)<24))return p;}return null;
  }
  chooseEnemyKind(){const r=this.random();return r<.5?0:r<.6?1:r<.7?2:r<.8?3:r<.9?4:5;}
  spawnEnemy(kind=this.chooseEnemyKind(),bonus=false){
    const p=this.freePoint(150,kind===4?31:16);if(!p)return false;
    this.enemies.push({...p,kind,born:this.age,state:'idle',until:this.age+(kind===4?10+this.random()*12:0)});
    this.events.push({type:'enemy',...p});return true;
  }
  spawnBoss(debug=false,kind=null){return this.arena.spawn(debug,kind);}
  ensureKnife(){if(this.enemies.some(e=>[6,7,8,9].includes(e.kind)&&e.state!=='egg')&&!this.armed&&!this.knife&&this.age>=this.nextKnife){const p=(this.knifeAnchor?this.nearPoint(this.knifeAnchor,45,80):null)||this.freePoint(45);if(p){this.knife={...p};this.knifeAnchor=null;}else this.nextKnife=this.age+.5;}}
  blade(){const h=this.body[0];return{x:h.x+Math.cos(this.angle)*24,y:h.y+Math.sin(this.angle)*24};}
  consumeKnife(){this.armed=false;this.nextKnife=this.immediateKnife?this.age:this.age+6;this.immediateKnife=false;this.events.push({type:'blade',...this.blade()});this.ensureKnife();}
  killEnemy(e,source='impact'){
    const i=this.enemies.indexOf(e);if(i<0)return false;
    if(!this.arena.hit(e,source))return false;
    this.enemies.splice(i,1);this.kills++;this.events.push({type:e.kind>=6&&e.kind<=10?'boss-defeat':'defeat',kind:e.kind,silent:source==='celebration'||source==='royal',x:e.x,y:e.y});
    if(e.kind>=6&&e.kind<=10)this.arena.defeatedBoss(e);
    return true;
  }
  dropBossTomatoes(origin){
    const rotation=this.random()*TAU;
    for(let i=0;i<3;i++){
      const angle=rotation+i*TAU/3;let to={x:origin.x,y:origin.y};
      for(let r=2;r<=80;r+=2){const p={x:origin.x+Math.cos(angle)*r,y:origin.y+Math.sin(angle)*r};if(this.blocked(p,12))break;to=p;}
      this.food.push({x:origin.x,y:origin.y,kind:FOOD.TOMATO,slide:{from:{x:origin.x,y:origin.y},to,born:this.age,duration:.7}});
    }
  }
  slideFood(){
    for(const p of this.food){if(!p.slide)continue;const s=p.slide,t=Math.min(1,(this.age-s.born)/s.duration),ease=1-(1-t)**3;
      p.x=s.from.x+(s.to.x-s.from.x)*ease;p.y=s.from.y+(s.to.y-s.from.y)*ease;if(t>=1)delete p.slide;
    }
  }
  fail(reason){if(this.dead||this.invincible)return;if(this.shield){this.shield=0;this.graceUntil=this.age+1.6;this.events.push({type:'shield-break',...this.body[0]});return;}this.dead=true;this.events.push({type:'fail',reason});}
  step(dt){let left=Math.max(0,Number.isFinite(dt)?dt:0);while(left>0&&!this.dead){const s=Math.min(left,1/120);this.tick(s);left-=s;}}
  bodyHit(p,r){let trail=0;for(let i=1;i<this.body.length;i++){trail+=distance(this.body[i-1],this.body[i]);if(trail>21&&distance(p,this.body[i])<r)return true;}return false;}
  tick(dt){
    const frozen=this.buffKind==='purple';
    this.age+=dt;if(this.worldFrozen){for(const p of this.food)if(p.slide)p.slide.born+=dt;if(this.arena.cake)this.arena.cake.born+=dt;}else this.slideFood();
    for(const p of this.puddles)if(p.until>this.age&&distance(this.body[0],p)<p.radius+this.radius)this.setBuff('green',8);
    this.puddles=this.puddles.filter(p=>p.until>this.age);
    const wobble=this.buffKind==='orange'?Math.sin(this.age*4.2)*.5+Math.sin(this.age*7.1)*.12:0;
    if(this.touchTarget&&!frozen&&this.buffKind!=='purple'){const h=this.body[0],p=this.touchTarget;if(distance(h,p)>8)this.target=Math.atan2(p.y-h.y,p.x-h.x);else {this.touchTarget=null;this.target=this.angle;}}
    if(frozen||this.buffKind==='purple')this.target=this.angle;
    else this.angle=turnToward(this.angle,this.target+wobble,4.6*dt);
    const speed=this.currentSpeed;let head={x:this.body[0].x+Math.cos(this.angle)*speed*dt,y:this.body[0].y+Math.sin(this.angle)*speed*dt};
    for(const force of [this.attraction,this.knockback])if(force){head.x+=force.vx*dt;head.y+=force.vy*dt;}if(this.knockback){this.knockback.vx*=Math.exp(-3*dt);this.knockback.vy*=Math.exp(-3*dt);if(this.age>=this.knockback.until)this.knockback=null;}
    if(this.invincible)head=this.deflect(head,speed*dt);
    else if(this.blocked(head,this.radius)){this.fail('벽이나 글자, 카드에 부딪혔어요.');if(this.dead)return;head=this.deflect(head,speed*dt);}
    if(!this.invincible&&!this.selfPhase&&this.age>=(this.selfGraceUntil||0)&&this.bodyHit(head,this.radius*1.65)){this.fail('자기 몸에 부딪혔어요.');return;}
    if(distance(head,this.body[0])>0)this.body.unshift(head);this.length=Math.min(this.goalLength,this.length+dt*82);
    let used=0;for(let i=1;i<this.body.length;i++){const d=distance(this.body[i-1],this.body[i]);if(used+d>this.length){const t=(this.length-used)/d;this.body[i]={x:this.body[i-1].x+(this.body[i].x-this.body[i-1].x)*t,y:this.body[i-1].y+(this.body[i].y-this.body[i-1].y)*t};this.body.length=i+1;break;}used+=d;}
    for(let i=this.food.length-1;i>=0;i--)if(!this.arena.celebration&&!this.food[i].slide&&distance(head,this.food[i])<15)this.eatFood(this.food.splice(i,1)[0]);
    if(this.knife&&this.age>=(this.knife.pickupAt||0)&&distance(head,this.knife)<17){this.arena.dropCarriedDynamite();this.knife=null;this.armed=true;this.events.push({type:'knife'});}
    if(!this.arena.celebration)this.refill();
    if(!this.worldFrozen&&!this.arena.celebration&&this.age>=this.nextEnemy){this.nextEnemy=this.age+Math.max(1.7,10-this.age*.055)+this.random()*2;if(this.spawnEnemy(this.spawnCount===0?0:this.chooseEnemyKind()))this.spawnCount++;}
    if(this.age>=this.nextBoss){if(!this.spawnBoss())this.nextBoss=this.age+5;}
    this.ensureKnife();this.updateBlade();
    if(this.worldFrozen)this.arena.pause(dt);else if(this.timeStopped)this.arena.pauseEnemies(dt);
    for(const e of [...this.enemies]){
      if(!this.enemies.includes(e)||this.age-e.born<1||e.held)continue;
      if(e.kind===8&&e.state==='egg'){if(!this.worldFrozen){this.arena.updateEnemy(e,dt);if(e.state==='egg')this.arena.pushEgg(e,dt);}continue;}
      if(this.worldFrozen||(this.timeStopped&&e.kind!==8&&!e.thrown)){if(this.hitsEnemy(head,e,4)){if(this.invincible&&e.kind<6)this.killEnemy(e,'body');else if(!this.invincible)this.fail('적에게 부딪혔어요.');}continue;}
      if(e.thrown){this.arena.updateEnemy(e,dt);continue;}
      if(e.state==='jump'){this.updateEnemy(e,dt*(this.arena.celebration?.08:1));continue;}
      if(e.kind===4&&distance(e,head)<this.enemyRadius(e)+this.radius&&!this.invincible){this.fail('너드에게 부딪혔어요.');return;}
      if(e.kind===4){if(this.nerdBodyHit(e)){this.killEnemy(e,'body');continue;}this.updateEnemy(e,dt*(this.arena.celebration?.08:1));if(this.nerdBodyHit(e))this.killEnemy(e,'body');continue;}
      this.updateEnemy(e,dt*(this.arena.celebration?.08:1));if(this.dead)return;
      const hit=this.enemyDiscs(e).some(c=>distance(c,head)<c.r+4);
      if(hit&&!this.invincible){this.fail('적에게 잡혔어요.');return;}
      if((e.kind<6||e.kind===11)&&((this.invincible&&hit)||(e.kind===4?this.nerdBodyHit(e):this.bodyHit(e,14))))this.killEnemy(e,'body');
    }
    if((this.buffKind==='blue'||this.activeCombo==='blue')&&this.age>=this.nextBlueShot){
      this.nextBlueShot=this.age+.14;
      if(this.projectiles.length<180){for(const offset of this.activeCombo==='blue'?[-.15,0,.15]:[0]){const a=this.angle+offset;this.projectiles.push({type:'blue',volley:this.age,x:head.x+Math.cos(a)*14,y:head.y+Math.sin(a)*14,vx:Math.cos(a)*360,vy:Math.sin(a)*360,born:this.age});}this.events.push({type:'blue-shot'});}
    }
    if(!this.worldFrozen){this.updateHazards(dt);if(!this.dead)this.arena.update(dt);}else this.updateFrozenBlue(dt);
    if(!this.dead)this.musicPads.update(this);
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
  isFlying(p){return['shoe','potion','hammer'].includes(p.type)&&this.age-p.born<p.duration;}
  enemyBlocked(e,p){
    return this.enemyDiscs(e,p).some(c=>this.blocked(c,c.r)||this.enemies.some(o=>o!==e&&this.enemyDiscs(o).some(d=>distance(c,d)<c.r+d.r+1))||this.food.some(f=>distance(c,f)<c.r+10)||this.bombs.some(b=>!b.held&&!b.thrown&&distance(c,b)<c.r+10)||(this.knife&&distance(c,this.knife)<c.r+10))||(e.kind>=6&&e.kind<=10&&this.enemyDiscs(e,p).some(c=>this.bodyHit(c,c.r+4)))||(e.kind===4&&this.enemyDiscs(e,p).some(c=>this.body.some(b=>distance(c,b)<c.r+7)));
  }
  moveEnemy(e,target,speed,dt,away=false){
    if(e.enhanced&&(e.kind===0||e.kind===11))speed*=1.4;
    const steps=Math.max(1,Math.ceil(speed*dt/2)),stride=speed*dt/steps;let moved=false;
    for(let i=0;i<steps;i++){const a=Math.atan2(target.y-e.y,target.x-e.x)+(away?Math.PI:0);let accepted=false;for(const offset of [0,.4,-.4,.85,-.85,1.3,-1.3,1.65,-1.65]){const p={x:e.x+Math.cos(a+offset)*stride,y:e.y+Math.sin(a+offset)*stride};if(!this.enemyBlocked(e,p)){e.x=p.x;e.y=p.y;accepted=true;moved=true;break;}}if(!accepted)break;}return moved;
  }
  orbit(e,dt){e.orbitDirection??=this.random()<.5?-1:1;const h=this.enemyTarget(e),a=Math.atan2(e.y-h.y,e.x-h.x)+e.orbitDirection*.38;this.moveEnemy(e,{x:h.x+Math.cos(a)*185,y:h.y+Math.sin(a)*185},72,dt);}
  randomAim(center=this.body[0]){const h=center;for(let i=0;i<60;i++){const a=this.random()*TAU,r=36+this.random()*100,p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};if(!this.blocked(p,8))return p;}return this.freePoint(30)||{x:h.x+36,y:h.y};}
  toss(e,type){
    if(this.projectiles.length>=96)return;
    const to=this.randomAim(this.enemyTarget(e)),a=Math.atan2(to.y-e.y,to.x-e.x),from={x:e.x+Math.cos(a)*22,y:e.y+Math.sin(a)*22};
    this.projectiles.push({type,...from,from,to,born:this.age,duration:type==='boomerang'?1.6:type==='shoe'?.72:.88,owner:e,enhanced:e.enhanced});this.events.push({type:'throw',attack:type,x:e.x,y:e.y});
  }
  dropBomb(e){for(let i=0;i<12;i++){const a=i*TAU/12,p={x:e.x+Math.cos(a)*27,y:e.y+Math.sin(a)*27};if(!this.blocked(p,11)&&!this.enemies.some(o=>this.enemyDiscs(o).some(d=>distance(p,d)<11+d.r))&&!this.food.some(o=>distance(p,o)<22)&&!this.bombs.some(o=>distance(p,o)<24)){this.bombs.push({...p,born:this.age,armed:null});return;}}}
  nerdBodyHit(e){
    if(distance(e,this.body[0])<14)return true;
    for(let i=1;i<this.body.length;i++){const a=this.body[i-1],b=this.body[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((e.x-a.x)*dx+(e.y-a.y)*dy)/(dx*dx+dy*dy||1)));if(distance(e,{x:a.x+t*dx,y:a.y+t*dy})<14)return true;}return false;
  }
  nerdAim(e){
    const h=this.enemyTarget(e);
    for(let i=0;i<40;i++){
      const a=this.angle+Math.PI/2+this.random()*Math.PI,p={x:h.x+Math.cos(a)*60,y:h.y+Math.sin(a)*60};
      if(!this.enemyBlocked(e,p)){e.aim=p;return true;}
    }return false;
  }
  routeSnapshot(e){
    const circles=[{...this.body[0],r:56},...this.body.map(p=>({x:p.x,y:p.y,r:17})),...this.enemies.filter(o=>o!==e).map(o=>({x:o.x,y:o.y,r:this.enemyRadius(o)+11})),...this.food.map(p=>({x:p.x,y:p.y,r:20})),...this.bombs.map(p=>({x:p.x,y:p.y,r:20}))];
    if(this.knife)circles.push({...this.knife,r:20});
    return {width:this.width,height:this.height,start:{x:e.x,y:e.y},goal:{...e.aim},obstacles:this.obstacles.map(b=>({...b})),circles};
  }
  acceptNerdRoute(e,route){
    if(this.dead||!this.enemies.includes(e)||e.state!=='planning')return;
    if(!route){this.stopNerd(e);return;}e.route=route;
    let length=0,previous=e;for(const point of route){length+=distance(previous,point);previous=point;}
    e.state='dash';e.until=this.age+length/620+1;this.events.push({type:'nerd',x:e.x,y:e.y});
  }
  stopNerd(e){e.state='idle';e.route=null;e.until=this.age+(e.enhanced?1.5:10)+this.random()*(e.enhanced?2:14);}
  rushNerd(e,dt){
    if(!e.route?.length||this.age>=e.until){this.stopNerd(e);return;}
    let left=620*dt;
    while(left>0&&e.route.length){
      if(this.nerdBodyHit(e)){this.killEnemy(e,'body');return;}
      if(distance(e,this.body[0])<=50){this.stopNerd(e);return;}
      const to=e.route[0],d=distance(e,to),step=Math.min(2,left,d);
      if(d<.01){e.route.shift();continue;}
      const p={x:e.x+(to.x-e.x)*step/d,y:e.y+(to.y-e.y)*step/d};
      if(this.nerdBodyHit(p)){this.killEnemy(e,'body');return;}
      if(distance(p,this.body[0])<=50||this.enemyBlocked(e,p)){this.stopNerd(e);return;}
      e.x=p.x;e.y=p.y;left-=step;if(step>=d-.001)e.route.shift();
    }
    if(!e.route.length)this.stopNerd(e);
  }
  updateEnemy(e,dt){
    const h=this.enemyTarget(e),d=distance(e,h),age=this.age;e.state||='idle';e.until??=age;
    if(e.kind===0){if(h!==this.body[0]&&distance(e,h)<this.enemyRadius(h)+15){this.killEnemy(h,'mob');return;}this.moveEnemy(e,h,(this.speed+Math.min(Math.max(0,this.score)*1.2,32))*.94,dt);return;}
    if(e.kind===6){this.updateBoss(e,dt);return;}
    if(e.kind>=7){this.arena.updateEnemy(e,dt);return;}
    if(e.kind===4){
      if(e.state==='planning')return;
      if(e.state==='dash'){this.rushNerd(e,dt);return;}
      if(age>=e.until){
        if(d<=50||!this.nerdAim(e)){this.stopNerd(e);return;}
        const snapshot=this.routeSnapshot(e);e.state='planning';
        if(this.routePlanner)this.routePlanner(snapshot).then(route=>this.acceptNerdRoute(e,route)).catch(()=>this.acceptNerdRoute(e,null));
        else this.acceptNerdRoute(e,planSnapshotRoute(snapshot));
      }return;
    }
    if(e.kind===5){if(!e.aim||distance(e,e.aim)<18||age>(e.roamUntil||0)){e.aim=this.freePoint(20)||{x:e.x,y:e.y};e.roamUntil=age+3;}this.moveEnemy(e,e.aim,56,dt);if(age>=e.until){this.dropBomb(e);e.until=age+(e.enhanced?1:3)+this.random()*(e.enhanced?1:3);}return;}
    if(e.kind===3&&e.enhanced){const a=Math.atan2(h.y-e.y,h.x-e.x),n=Math.ceil(d/10);let clear=true;for(let i=2;i<n;i++)if(this.blocked({x:e.x+(h.x-e.x)*i/n,y:e.y+(h.y-e.y)*i/n},6)){clear=false;break;}
      if(!clear){this.orbit(e,dt);e.state='idle';return;}
      if(e.state==='charge'&&age>=e.until){this.projectiles.push({type:'anger-ray',x:e.x+Math.cos(a)*23,y:e.y+Math.sin(a)*23,vx:Math.cos(a)*360,vy:Math.sin(a)*360,born:age,owner:e});e.state='recover';e.until=age+1.6;this.events.push({type:'throw'});}else if(e.state!=='charge'&&age>=e.until){e.state='charge';e.chargeAt=age;e.until=age+.45;}return;
    }
    if(e.kind===3){this.orbit(e,dt);if(e.state==='charge'){if(age>=e.until){this.toss(e,'boomerang');e.state='recover';e.until=age+2.4;}}else if(age>=e.until&&d<(e.enhanced?480:300)){e.state='charge';e.chargeAt=age;e.until=age+.65;}return;}
    if(e.state==='flee'){this.moveEnemy(e,h,155,dt,true);if(age>=e.until)e.state='idle';return;}
    if(e.state==='recover'){if(d<175)this.moveEnemy(e,h,90,dt,true);if(age>=e.until)e.state='idle';return;}
    if(d>215){this.moveEnemy(e,h,e.kind===1?65:48,dt);return;}
    for(let i=0;i<(e.enhanced&&e.kind===1?3:1);i++)this.toss(e,e.kind===1?'shoe':'potion');e.state=e.kind===1?'flee':'recover';e.until=age+(e.kind===1?3.5:2.8)+this.random();
  }
  fireTooth(e,a,speed=205){
    if(this.projectiles.length>=96)return;
    const p={x:e.x+Math.cos(a)*58,y:e.y+Math.sin(a)*58};
    if(!this.blocked(p,7))this.projectiles.push({type:'tooth',volley:this.age,...p,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,born:this.age,owner:e});
  }
  updateBoss(e,dt){
    const h=this.enemyTarget(e),age=this.age;
    if(e.patternUntil===undefined||age>=e.patternUntil){e.pattern=Math.floor(this.random()*3);e.patternUntil=age+6;e.nextShot=age;e.orbitAngle=Math.atan2(e.y-h.y,e.x-h.x);e.orbitCenter={...h};}
    if(e.pattern===1){
      e.orbitAngle+=TAU/6*dt;
      const c=e.orbitCenter;this.moveEnemy(e,{x:c.x+Math.cos(e.orbitAngle)*160,y:c.y+Math.sin(e.orbitAngle)*160},190,dt);
    }else this.moveEnemy(e,h,e.pattern===2?45:27,dt);
    if(age<e.nextShot)return;
    const aim=Math.atan2(h.y-e.y,h.x-e.x);
    if(e.pattern===0){const offset=this.random()*TAU;for(let i=0;i<14;i++)this.fireTooth(e,offset+i*TAU/14,175);e.nextShot=age+2;}
    if(e.pattern===1){this.fireTooth(e,aim,245);e.nextShot=age+.11;}
    if(e.pattern===2){for(let i=-2;i<=2;i++)this.fireTooth(e,aim+i*.18,230);e.nextShot=age+.7;}
    this.events.push({type:'tooth-shot',x:e.x,y:e.y});
  }
  updateBlade(){
    if(!this.armed)return;const p=this.blade();
    for(const e of this.enemies)if(e.state!=='egg'&&e.state!=='jump'&&this.age>=(e.safeUntil||0)&&this.hitsEnemy(p,e,10)){this.killEnemy(e,'knife');this.consumeKnife();return;}
    for(const shot of this.projectiles)if(!shot.dead&&shot.type!=='blue'&&!this.isFlying(shot)&&distance(shot,p)<16){shot.dead=true;this.consumeKnife();return;}
    for(const b of this.bombs)if(distance(b,p)<17){this.consumeKnife();this.explode(b);return;}
  }
  explode(b){
    const queue=[b],seen=new Set();
    while(queue.length){const x=queue.shift();if(seen.has(x))continue;seen.add(x);const i=this.bombs.indexOf(x);if(i>=0)this.bombs.splice(i,1);
      const radius=x.enhanced?102:72;this.events.push({type:'blast',x:x.x,y:x.y,radius});

      for(const e of [...this.enemies])if(distance(e,x)<radius+this.enemyRadius(e))this.killEnemy(e,'blast');
      for(const p of this.projectiles)if(!this.isFlying(p)&&distance(p,x)<radius+8){p.dead=true;p.cancelSpill=true;}
      this.puddles=this.puddles.filter(p=>{if(distance(p,x)>=radius+p.radius)return true;this.breakObject(p,'puddle');return false;});
      this.food=this.food.filter(p=>{if(p.slide?.born===this.age||distance(p,x)>=radius+10)return true;this.breakObject(p,'food');return false;});
      if(this.knife&&distance(this.knife,x)<radius+10){this.breakObject(this.knife,'knife');this.knife=null;this.nextKnife=this.age+6;}
      for(const other of this.bombs)if(distance(other,x)<radius+10&&!seen.has(other))queue.push(other);
      if(!this.invincible&&distance(this.body[0],x)<radius+4)this.fail('폭탄에 휘말렸어요.');
    }
  }
  breakObject(p,kind=p?.type||'object'){if(!p||p.breakEmitted)return;p.breakEmitted=true;this.events.push({type:kind==='ball'?'ball-break':kind==='hammer'?'hammer-break':'object-break',kind,x:p.x,y:p.y});}
  shotImpact(p,other=null,terrain=false){
    const blue=p.type==='blue'||other?.type==='blue';
    const silent=terrain||(!blue&&['tooth','shoe','potion'].includes(p.type));
    if(p.dead&&!(p.type==='blue'&&terrain))this.breakObject(p);if(other?.dead)this.breakObject(other);this.events.push({type:'impact',silent,handled:true,x:p.x,y:p.y});
  }
  finalizeShots(){
    for(const p of this.projectiles)if(p.dead){if(p.type==='blue'&&p.terrain)p.breakEmitted=true;else this.breakObject(p);}
    for(const p of this.projectiles)if(p.dead&&p.type==='potion'&&!p.spilled&&!p.cancelSpill){
      p.spilled=true;if(this.puddles.length>=16)this.puddles.shift();
      this.puddles.push({x:p.x,y:p.y,radius:p.enhanced?80:52,born:this.age,until:this.age+12});
      if(distance(this.body[0],p)<(p.enhanced?84:56))this.setBuff('green',8);
      this.events.push({type:'splash',x:p.x,y:p.y});
    }
    this.projectiles=this.projectiles.filter(p=>!p.dead);
  }
  updateHazards(dt){
    const h=this.body[0];
    for(const p of this.projectiles){
      if(p.dead)continue;
      p.previous={x:p.x,y:p.y};
      if(['tooth','blue','anger-ray','ball'].includes(p.type)){p.x+=p.vx*dt;p.y+=p.vy*dt;}
      else{
        const t=(this.age-p.born)/p.duration;
        if(p.type==='boomerang'){
          if(t>=1){p.dead=true;continue;}
          if(t<.5){const k=Math.sin(t*Math.PI);p.x=p.from.x+(p.to.x-p.from.x)*k;p.y=p.from.y+(p.to.y-p.from.y)*k;}
          else{const k=(t-.5)*2,target=this.enemies.includes(p.owner)?p.owner:p.from;p.x=p.to.x+(target.x-p.to.x)*k;p.y=p.to.y+(target.y-p.to.y)*k;}
        }else{const k=Math.min(t,1);p.x=p.from.x+(p.to.x-p.from.x)*k;p.height=Math.sin(k*Math.PI)*85;p.y=p.from.y+(p.to.y-p.from.y)*k-p.height;p.airborne=p.height>12;if(t>=1&&!p.landed){p.landed=true;if(p.type==='shoe')this.events.push({type:'shoe-land',x:p.x,y:p.y});}}
      }
      if(this.isFlying(p))continue;
      const outside=p.x<9||p.y<9||p.x>this.width-9||p.y>this.height-9;
      if(p.type!=='ball'&&(outside||(!p.airborne&&this.blocked(p,7)))){p.dead=true;p.terrain=true;p.cancelSpill=outside;this.shotImpact(p,null,true);}
    }
    this.updateBalls();
    // Stronger attacks survive weaker ones; equal ranks cancel each other.
    for(let i=0;i<this.projectiles.length;i++){const a=this.projectiles[i];if(a.dead||a.type==='ball'||this.isFlying(a))continue;for(let j=i+1;j<this.projectiles.length;j++){const b=this.projectiles[j];if(!b.dead&&b.type!=='ball'&&!this.isFlying(b)&&distance(a,b)<15){if(a.volley!==undefined&&a.volley===b.volley&&this.age-a.born<.3)continue;if(a.type==='tooth'&&b.type==='tooth'&&a.owner===b.owner&&a.owner&&(distance(a,a.owner)<90||distance(b,b.owner)<90))continue;if(a.type==='blue'&&b.type==='blue')continue;if(a.type==='blue'||b.type==='blue'){const blue=a.type==='blue'?a:b,other=blue===a?b:a;this.pushObject(other,blue,230);blue.dead=true;if(a.dead)break;continue;}const ar=attackRank(a.type),br=attackRank(b.type);if(ar<=br)a.dead=true;if(br<=ar)b.dead=true;this.shotImpact(a,b);if(a.dead)break;}}}
    for(const p of this.projectiles){
      if(p.dead||this.isFlying(p)||p.type==='ball')continue;
      if(p.type!=='blue'&&this.armed&&distance(p,this.blade())<16){p.dead=true;this.consumeKnife();continue;}
      for(const e of [...this.enemies]){
        if(e.state==='jump'||e.thrown||e.held)continue;
        if(e===p.owner&&p.type==='boomerang')continue;
        if(e===p.owner&&!p.leftOwner){if(distance(p,e)>this.enemyRadius(e)+10)p.leftOwner=true;else continue;}
        if(this.hitsEnemy(p,e,7)){p.dead=true;if(p.type==='blue'&&e.kind===8&&e.state==='egg')this.pushObject(e,p,230);else this.killEnemy(e,p.type);break;}
      }
      if(p.dead)continue;
      if(p.type!=='blue'){const fi=this.food.findIndex(f=>distance(p,f)<17);if(fi>=0){this.breakObject(this.food[fi],'food');this.food.splice(fi,1);this.shotImpact(p);p.dead=true;continue;}
        if(this.knife&&distance(p,this.knife)<17){this.breakObject(this.knife,'knife');this.knife=null;this.nextKnife=this.age+6;p.dead=true;continue;}}
      const bomb=this.bombs.find(b=>!b.held&&!b.thrown&&distance(p,b)<17);if(bomb){p.dead=true;if(p.type==='blue')this.pushObject(bomb,p,240);else this.explode(bomb);if(this.dead)return;continue;}
      if(p.type==='blue')continue;
      if(distance(p,h)<(p.landed?22:12)){
        p.dead=true;this.breakObject(p);
        if(p.type==='potion')this.setBuff('green',8);else if(!this.invincible){this.fail('공격에 맞았어요.');return;}
      }else if(this.bodyHit(p,12)){p.dead=true;this.shotImpact(p);}
      if(p.landed)p.dead=true;
    }
    this.finalizeShots();
    for(const b of [...this.bombs]){
      if(!this.bombs.includes(b)||b.held||b.thrown)continue;
      if(distance(h,b)<18||this.bodyHit(b,14)){const near=this.body.reduce((p,q)=>distance(q,b)<distance(p,b)?q:p,this.body[0]);this.pushObject(b,near,220);}
      if(this.enemies.some(e=>!e.thrown&&e.state!=='jump'&&this.hitsEnemy(b,e,10))||this.food.some(f=>distance(f,b)<17)||(this.knife&&distance(this.knife,b)<17)){this.explode(b);if(this.dead)return;continue;}
      if(b.armed===null&&this.age-b.born>.5&&distance(h,b)<82)b.armed=this.age;
      if(b.armed!==null&&this.age-b.armed>=.95){this.explode(b);if(this.dead)return;}
    }
    this.finalizeShots();
  }
  enemyTarget(e){if(this.activeCombo!=='orange')return this.body[0];let target=this.body[0],best=distance(e,target);for(const o of this.enemies)if(o!==e&&distance(e,o)<best){target=o;best=distance(e,o);}return target;}
  updateFrozenBlue(dt){for(const p of this.projectiles)if(p.type==='blue'&&!p.dead){p.x+=p.vx*dt;p.y+=p.vy*dt;if(this.blocked(p,4))p.dead=true;for(const e of [...this.enemies])if(this.hitsEnemy(p,e,4)){if(e.kind===8&&e.state==='egg')this.pushObject(e,p,230);else this.killEnemy(e,'blue');p.dead=true;break;}}this.finalizeShots();}
  pushObject(p,from,power=220){if(p.slide)delete p.slide;const angle=from.vx!==undefined?Math.atan2(from.vy,from.vx):Math.atan2(p.y-from.y,p.x-from.x);if(this.bombs.includes(p))p.armed??=this.age;if(p.type==='ball'){p.vx=Math.cos(angle)*power;p.vy=Math.sin(angle)*power;p.leftOwner=true;}else p.gust={vx:Math.cos(angle)*power,vy:Math.sin(angle)*power,until:this.age+.7};}
  updateBalls(){for(const p of this.projectiles){if(p.type!=='ball'||p.dead)continue;if(p.owner&&distance(p,p.owner)>this.enemyRadius(p.owner)+13)p.leftOwner=true;
    if(this.armed&&distance(p,this.blade())<20){p.dead=true;this.consumeKnife();continue;}
    const bomb=this.bombs.find(b=>!b.held&&!b.thrown&&distance(p,b)<21);if(bomb){p.dead=true;this.explode(bomb);continue;}
    let hit=null,normal=null,key=null;
    if(p.x<12||p.x>this.width-12){key='wall-x';normal={x:p.x<12?1:-1,y:0};p.x=Math.max(12,Math.min(this.width-12,p.x));}
    else if(p.y<12||p.y>this.height-12){key='wall-y';normal={x:0,y:p.y<12?1:-1};p.y=Math.max(12,Math.min(this.height-12,p.y));}
    else{const card=this.obstacles.find(b=>touches(p,11,b));if(card){key=card;normal={x:p.x-(card.x+card.w/2),y:p.y-(card.y+card.h/2)};}}
    if(!key){hit=this.enemies.find(e=>(e!==p.owner||p.leftOwner)&&!e.held&&!e.thrown&&e.state!=='jump'&&this.hitsEnemy(p,e,11));if(hit){key=hit;this.killEnemy(hit,'ball');p.dead=true;this.breakObject(p,'ball');}}
    if(!key){hit=this.food.find(f=>distance(p,f)<21);if(hit){key=hit;this.food.splice(this.food.indexOf(hit),1);this.breakObject(hit,'food');}}
    if(!key){hit=this.projectiles.find(o=>o!==p&&!o.dead&&!this.isFlying(o)&&distance(p,o)<18);if(hit){key=hit;if(hit.type==='blue'){this.pushObject(p,hit,280);hit.dead=true;p.contact=null;continue;}hit.dead=true;}}
    if(!key&&this.bodyHit(p,15)){key='body';hit=this.body.reduce((best,b)=>distance(p,b)<distance(p,best)?b:best,this.body[0]);}
    if(distance(p,this.body[0])<16){p.dead=true;this.breakObject(p);if(!this.invincible)this.fail('당구공에 맞았어요.');key='head';hit=this.body[0];}
    if(key&&key!==p.contact){normal??={x:p.x-hit.x,y:p.y-hit.y};let n=Math.hypot(normal.x,normal.y)||1,nx=normal.x/n,ny=normal.y/n;if(!normal.x&&!normal.y){nx=-p.vx/Math.hypot(p.vx,p.vy);ny=-p.vy/Math.hypot(p.vx,p.vy);}const dot=p.vx*nx+p.vy*ny;p.vx-=2*dot*nx;p.vy-=2*dot*ny;if(p.previous&&key!=='wall-x'&&key!=='wall-y'){p.x=p.previous.x;p.y=p.previous.y;}p.x+=nx*2;p.y+=ny*2;p.hits=(p.hits||0)+1;this.events.push({type:'billiard',x:p.x,y:p.y});}
    p.contact=key;
  }}
}
