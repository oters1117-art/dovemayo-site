import {spawnCloudScore,updateCloud} from './cloud-scores.mjs';
import {spawnCake,updateCake} from './cake-finale.mjs';
import {brainRoam,kingMove,hammer,tornado,gusts,hands,thrown} from './boss-dynamics.mjs?v=1';
// Boss mechanics use the simulation clock: death freezes every pose and telegraph.
const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BOSS_NAMES=['토마토','문어심장','뇌','왕 / 성'];
export const REWARD={PUMPKIN:47,NAZAR:48,CAKE:49};
export const attackRank=type=>type==='dynamite'?4:['blast','knife'].includes(type)?3:type==='blue'?1:2;
export class BossArena{
 removeHand(hand){if(hand.target)hand.target.held=false;const i=this.hands.indexOf(hand);if(i>=0)this.hands.splice(i,1);}
 constructor(g){this.g=g;this.order=[6,7,8,9];for(let i=3;i>0;i--){const j=Math.floor(g.random()*(i+1));[this.order[i],this.order[j]]=[this.order[j],this.order[i]];}
  this.spawned=0;this.defeated=new Set();this.hazards=[];this.hands=[];this.relics=[];this.cake=null;this.cakeClaimed=false;this.nextDynamite=0;this.fireworks=[];this.shockAt=-10;this.shockUntil=0;
 }
 spawn(debug=false,selected=null){const g=this.g;if(this.spawned>=4&&!debug)return false;const kind=selected??this.order[this.spawned%4],p=g.freePoint(160,kind===9?42:46);if(!p)return false;
  const serial=selected===null?this.spawned++:-1,e={...p,kind,serial,born:g.age,state:'idle',until:g.age+2,pattern:0};g.enemies.push(e);g.nextBoss=this.spawned<4?120+this.spawned*90:Infinity;g.nextKnife=g.age;g.ensureKnife();g.events.push({type:'boss',name:BOSS_NAMES[kind-6],...p});
  if(kind===8)this.spawnSatellites(e);
  if(kind===9){const c=g.freePoint(120,42)||g.nearPoint(e,95,170);if(c){g.enemies.push({...c,kind:10,serial,born:g.age,until:g.age+2,king:e});e.castleAlive=true;}
   for(const side of [-1,1])this.hands.push({x:clamp(e.x+side*83,16,g.width-16),y:e.y,king:e,side,state:'idle',until:g.age+2});this.ensureDynamite();}
  return true;
 }
 hit(e,source){const g=this.g;
  if(e.kind===8&&e.state==='egg')return source==='egg-wall';
  if(e.kind===7){if(source==='ball'){e.until=Math.min(e.until,g.age+.25);return false;}if(e.state==='jump'||g.age<(e.safeUntil||0))return false;}
  if(e.kind===10&&source!=='dynamite'&&source!=='celebration')return false;
  if(e.kind>=6&&e.kind<=9&&source!=='knife')return false;
  if(e.kind===8){e.state='egg';e.eggAt=g.age;e.until=g.age+12;delete e.gust;this.clearOwner(e);g.knife=null;g.events.push({type:'egg',x:e.x,y:e.y});g.events.push({type:'brain-defeat'});return false;}return true;
 }
 pushEgg(e,dt){const g=this.g,near=g.body.reduce((p,q)=>dist(q,e)<dist(p,e)?q:p,g.body[0]);if(dist(near,e)<28)g.pushObject(e,near,180);}
 completeBoss(e){if(e.clearCounted)return;e.clearCounted=true;this.g.bossKills++;if(e.serial>=0&&e.serial<4)this.defeated.add(e.serial);}
 defeatedBoss(e){const g=this.g;if(e.kind>=6&&e.kind<=8)this.completeBoss(e);if(e.kind===6)g.dropBossTomatoes(e);
  if(e.kind===7){for(let i=0,n=4+Math.floor(g.random()*5);i<n;i++)this.drop(Math.floor(g.random()*47),e);this.drop(REWARD.PUMPKIN,e);}
  if(e.kind===8){this.drop(REWARD.NAZAR,e);g.events.push({type:'egg-break',x:e.x,y:e.y});}
  if(e.kind===9){g.enemies.filter(o=>o.kind<6||o.kind===11).forEach((o,i)=>this.fireworks.push({target:o,at:g.age+i*.09}));this.hands=this.hands.filter(h=>h.king!==e);for(const p of [...g.projectiles,...g.bombs,...g.puddles])g.breakObject(p,p.type||'object');g.projectiles=[];g.bombs=[];g.puddles=[];}
  if(e.kind===10){this.drop(46,e);this.drop(46,e);if(e.king){e.king.castleAlive=false;if(!g.enemies.includes(e.king))this.completeBoss(e.king);}}
  this.clearOwner(e);
  if(e.kind===9&&!e.castleAlive)this.completeBoss(e);
  this.checkCake();
 }
 spawnCake(debug=false){return spawnCake(this,debug);}
 checkCake(){if(this.defeated.size!==4||this.cake||this.cakeClaimed||this.g.enemies.some(e=>e.kind===9||e.kind===10))return;if(this.cakeAt===undefined){this.cakeAt=this.g.age+30;this.g.events.push({type:'cake-prepare'});}if(this.g.age>=this.cakeAt)this.spawnCake();}
 spawnSatellites(owner){const g=this.g;for(let i=0;i<5;i++){const angle=i*TAU/5;let p;for(let n=0;n<30;n++){const a=angle+n*.21,q={x:owner.x+Math.cos(a)*76,y:owner.y+Math.sin(a)*76};if(!g.blocked(q,11)&&!g.enemies.some(o=>g.hitsEnemy(q,o,12))){p=q;break;}}p??=g.nearPoint(owner,60,115);if(p)g.enemies.push({...p,kind:12,owner,orbitPhase:angle,born:g.age,state:'orbit'});}}
 clearOwner(e){for(const child of [...this.g.enemies])if(child.kind===12&&child.owner===e)this.g.killEnemy(child,'owner');if(this.hazards.some(h=>h.owner===e&&h.type==='tornado'))this.g.attraction=null;this.hazards=this.hazards.filter(h=>h.owner!==e);}
 drop(kind,origin){const g=this.g,to=g.nearPoint(origin,45,115)||g.freePoint(25)||{x:clamp(origin.x,18,g.width-18),y:clamp(origin.y,18,g.height-18)};
  g.food.push({x:origin.x,y:origin.y,kind,slide:{from:{x:origin.x,y:origin.y},to,born:g.age,duration:.8}});}
 dropCarriedDynamite(){const g=this.g;for(const r of this.relics)if(r.carried){r.carried=false;Object.assign(r,{x:g.body[0].x,y:g.body[0].y,pickupAt:g.age+.8});}}
 ensureDynamite(){const g=this.g;if(g.enemies.some(e=>e.kind===10)&&!this.relics.some(r=>r.type==='dynamite')&&g.age>=this.nextDynamite){const p=g.freePoint(45);if(p)this.relics.push({...p,type:'dynamite',born:g.age});}}
 updateEnemy(e,dt){const g=this.g,h=g.enemyTarget(e),age=g.age;
  if(e.thrown){thrown(this,e);return;}
  if(e.kind===7){
   if(e.state==='jump'){const t=clamp((age-e.jumpAt)/(e.jumpDuration||1.65),0,1);e.x=e.from.x+(e.aim.x-e.from.x)*t;e.y=e.from.y+(e.aim.y-e.from.y)*t;e.lift=Math.sin(Math.pow(t,.8)*Math.PI)*250;if(e.retreat&&age>=(e.nextAirHammer||0)&&t<.9){hammer(this,e,g.random()*TAU);e.nextAirHammer=age+.09;}
    if(t===1){e.lift=0;e.state='land';e.landAt=age;e.until=age+.32;e.safeUntil=age+.48;this.area({x:e.x,y:e.y+40},108,'press',e,42);this.shockAt=age;this.shockUntil=age+.38;this.shockOwner=e;}return;}
   if(e.state==='hammer-charge'){if(age>=e.until){if(e.rapid){e.state='hammer-stream';e.left=30;e.nextHammer=age;}else{const offset=g.random()*TAU;for(let i=0;i<28;i++)hammer(this,e,offset+i*TAU/28);e.state='idle';e.until=age+.8;}}return;}
   if(e.state==='hammer-stream'){if(age>=e.nextHammer){hammer(this,e,g.random()*TAU);e.left--;e.nextHammer=age+.05;if(!e.left){e.state='idle';e.until=age+.7;}}return;}
   if(e.state==='land'&&age>=e.until){e.state='idle';e.until=age;}
   if(e.state==='idle'){this.keepDistance(e,180,105,dt);if(age>=e.until){const pattern=Math.floor(g.random()*6);if(pattern===0||pattern===5){e.retreat=pattern===5;e.aim=this.landingPoint(e,e.retreat);e.state='jump';e.jumpAt=age;e.from={x:e.x,y:e.y};e.jumpDuration=1.65;e.until=age+e.jumpDuration;g.events.push({type:'throw'});}else if(pattern===1||pattern===4){e.state='hammer-charge';e.chargeAt=age;e.rapid=pattern===4;e.until=age+.32;}else{const ground={x:e.x,y:e.y+40},angle=Math.atan2(h.y-ground.y,h.x-ground.x);let radius=15;while(radius<52&&g.hitsEnemy({x:ground.x+Math.cos(angle)*radius,y:ground.y+Math.sin(angle)*radius},e,12))radius++;g.projectiles.push({type:'ball',x:ground.x+Math.cos(angle)*radius,y:ground.y+Math.sin(angle)*radius,vx:Math.cos(angle)*205,vy:Math.sin(angle)*205,born:age,owner:e,leftOwner:true,hits:0});g.events.push({type:'roll'});e.until=age+.7;}}}return;
  }
  if(e.kind===8){
   if(e.state==='egg'){if(age>=e.until){e.state='idle';e.until=age+1;e.born=age-.7;delete e.gust;this.spawnSatellites(e);g.nextKnife=age;g.ensureKnife();g.events.push({type:'egg-hatch',x:e.x,y:e.y});}return;}
   if(!this.hazards.some(p=>p.owner===e&&p.type==='laser'&&age<p.until+.6))brainRoam(this,e,dt);if(age<e.until)return;
   const pattern=Math.floor(g.random()*3);e.until=age+9;
   if(pattern===0)spawnCloudScore(this,e);
   if(pattern===1){e.until=age+2.35;const a=Math.atan2(h.y-e.y,h.x-e.x);this.hazards.push({type:'laser',x:e.x,y:e.y,angle:a,born:age,until:age+1.6,lockAt:age+1.2,beeps:0,owner:e});}
   if(pattern===2&&!this.hazards.some(h=>h.type==='tornado'&&h.until>age)){for(let i=0;i<1;i++){const p=g.freePoint(85)||g.randomAim();this.hazards.push({...p,type:'tornado',born:age,activeAt:age+1.8,until:age+7.3,owner:e});}e.castAt=age;g.events.push({type:'brain-cast',x:e.x,y:e.y,pattern:'blackhole'});}return;
  }
  if(e.kind===12){if(!g.enemies.includes(e.owner)||e.owner.state==='egg'){g.killEnemy(e,'owner');return;}const count=g.enemies.filter(o=>o.kind===12&&o.owner===e.owner).length;if(count<3)e.orbitPhase+=dt*(count===1?4.4:2.5);const angle=e.orbitPhase;g.moveEnemy(e,{x:e.owner.x+Math.cos(angle)*76,y:e.owner.y+Math.sin(angle)*76},count===1?350:count===2?225:150,dt);return;}
  if(e.kind===9){kingMove(this,e,dt);return;}
  if(e.kind===10){if(age>=e.until){e.until=age+3.2;const before=g.enemies.length;g.spawnEnemy(g.random()<.45?11:g.chooseEnemyKind());const child=g.enemies[before];if(child){const p=g.nearPoint(e,55,85);if(p){child.x=p.x;child.y=p.y;}child.king=g.enemies.find(k=>k.kind===9&&k.serial===e.serial);child.castle=e;child.guardAnchor=g.random()<.5&&child.king?child.king:e;child.guardCheckAt=age+6;}}return;}
  if(e.kind===11){const anchors=g.enemies.filter(o=>o.kind===9||o.kind===10);if(!anchors.includes(e.guardAnchor)||age>=(e.guardCheckAt||0)){const near=anchors.sort((p,q)=>dist(p,e)-dist(q,e))[0];if(!e.guardAnchor||!anchors.includes(e.guardAnchor)||near&&dist(near,e)+75<dist(e.guardAnchor,e))e.guardAnchor=near;e.guardCheckAt=age+3;}const anchor=e.guardAnchor;if(anchor){e.orbitAngle=(e.orbitAngle??Math.atan2(e.y-anchor.y,e.x-anchor.x))+dt*.8;g.moveEnemy(e,{x:anchor.x+Math.cos(e.orbitAngle)*95,y:anchor.y+Math.sin(e.orbitAngle)*95},82,dt);}else g.moveEnemy(e,h,105,dt);}

 }
 landingPoint(e,retreat=false){const g=this.g,h=g.enemyTarget(e);if(retreat){const a=Math.atan2(e.y-h.y,e.x-h.x);for(let i=0;i<16;i++){const angle=a+(i%2?1:-1)*Math.ceil(i/2)*.3,p={x:e.x+Math.cos(angle)*180,y:e.y+Math.sin(angle)*180};if(g.enemyDiscs(e,p).every(c=>!g.blocked(c,c.r)))return p;}return {x:e.x,y:e.y};}for(let i=0;i<24;i++){const a=g.angle+(i===0?0:(i%2?1:-1)*Math.ceil(i/2)*.26),r=44+Math.floor(i/8)*22,p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};if(!g.blocked(p,35))return p;}return g.freePoint(45,36)||{x:e.x,y:e.y};}
 keepDistance(e,r,speed,dt){const g=this.g,h=g.enemyTarget(e),d=dist(e,h);if(Math.abs(d-r)>22)g.moveEnemy(e,h,speed,dt,d<r);}
 area(center,r,source,owner=null,ry=r){const g=this.g,inside=(p,margin=0)=>((p.x-center.x)/(r+margin))**2+((p.y-center.y)/(ry+margin))**2<1;
  g.events.push({type:source==='press'?'press':source==='dynamite'?'dynamite-blast':'blast',x:center.x,y:center.y,radius:r,radiusY:ry});
  for(const e of [...g.enemies])if(e!==owner&&g.enemyDiscs(e).some(d=>inside(d,d.r)))g.killEnemy(e,source);
  for(const p of g.projectiles)if(!g.isFlying(p)&&inside(p,8)){p.dead=true;p.cancelSpill=true;}
  g.food=g.food.filter(f=>{if(f.slide?.born===g.age||!inside(f,8))return true;g.breakObject(f,'food');return false;});g.puddles=g.puddles.filter(f=>{if(!inside(f,f.radius))return true;g.breakObject(f,'puddle');return false;});
  for(const b of [...g.bombs])if(g.bombs.includes(b)&&inside(b,10))g.explode(b);
  if(g.knife&&inside(g.knife)){g.breakObject(g.knife,'knife');g.knife=null;g.nextKnife=g.age+3;}
  if(inside(g.body[0],4)&&!g.invincible)g.fail('보스의 범위 공격에 맞았어요.');
 }
 update(dt){const g=this.g,age=g.age;this.ensureDynamite();this.checkCake();updateCake(this);
  hands(this,dt);gusts(this,dt);
  for(const f of this.fireworks)if(!f.done&&age>=f.at){f.done=true;const target=f.target;if(g.enemies.includes(target)){g.killEnemy(target,'royal');g.events.push({type:'royal-firework',x:target.x,y:target.y});}}this.fireworks=this.fireworks.filter(f=>!f.done);
  for(const b of g.bombs)if(b.thrown)thrown(this,b);
  for(const h of this.hazards){if(age<h.born)continue;
   if(h.type==='cloud')updateCloud(this,h,dt);
   if(h.type==='laser'){const t=age-h.born;if(!h.fired&&age<(h.lockAt??h.until-.5)){const target=g.enemyTarget(h.owner),desired=Math.atan2(target.y-h.owner.y,target.x-h.owner.x),delta=Math.atan2(Math.sin(desired-h.angle),Math.cos(desired-h.angle));h.angle+=clamp(delta,-dt*.6,dt*.6);h.x=h.owner.x+Math.cos(h.angle)*48;h.y=h.owner.y+Math.sin(h.angle)*48;}
    if(!h.fired&&h.beeps<4&&t>=h.beeps*.4){h.beeps++;g.events.push({type:'phone'});}if(age>=h.until&&!h.fired){h.fired=true;g.events.push({type:'laser'});}
    if(h.fired&&age<h.until+.18){const hit=p=>{const dx=p.x-h.x,dy=p.y-h.y;return dx*Math.cos(h.angle)+dy*Math.sin(h.angle)>=-8&&Math.abs(dx*Math.sin(h.angle)-dy*Math.cos(h.angle))<11;};
     if(hit(g.body[0])&&!g.invincible)g.fail('레이저에 맞았어요.');
     for(const e of [...g.enemies])if(e!==h.owner&&hit(e)&&g.killEnemy(e,'laser'))g.events.push({type:'firework',x:e.x,y:e.y});
     for(const p of [...g.food,...g.projectiles])if(hit(p)&&!p.laserHit){p.laserHit=true;p.dead=true;g.events.push({type:'firework',x:p.x,y:p.y});}g.food=g.food.filter(p=>!p.laserHit);
     for(const b of [...g.bombs])if(hit(b))g.explode(b);
     if(g.knife&&hit(g.knife)){g.events.push({type:'firework',...g.knife});g.knife=null;g.nextKnife=age+2;}
    }
   }
   if(h.type==='tornado')tornado(this,h,dt);
  }
  this.hazards=this.hazards.filter(h=>age<h.until+(h.type==='cloud'?.8:h.type==='laser'?.6:.05));
  for(const r of [...this.relics]){
   if(r.blackholeArmed){if(age-r.warnAt>=.8){this.relics.splice(this.relics.indexOf(r),1);this.nextDynamite=age+4;this.area(r,150,'dynamite');}continue;}
   if(r.carried){Object.assign(r,g.blade());const target=g.enemies.find(e=>e.state!=='jump'&&dist(r,e)<g.enemyRadius(e)+(e.kind===10?30:12))||g.bombs.find(b=>!b.thrown&&dist(r,b)<18)||g.projectiles.find(p=>!p.dead&&!g.isFlying(p)&&dist(r,p)<18);if(target){r.attached=target;r.carried=false;r.installed=age;r.fuse=age+2.4;g.events.push({type:'fuse'});}continue;}
   if(r.attached){const offset=r.attached.kind===10?18:r.attached.kind>=6&&r.attached.kind<=9?14:6;r.x=r.attached.x+offset;r.y=r.attached.y+offset;if(age>=r.fuse){r.warnAt??=age;if(age-r.warnAt>=.8){this.relics.splice(this.relics.indexOf(r),1);this.nextDynamite=age+4;this.area(r,150,'dynamite');}}continue;}
   if(age>=(r.pickupAt||0)&&dist(r,g.body[0])<18){if(g.armed){g.armed=false;g.knife={x:r.x,y:r.y,pickupAt:age+.8};}r.carried=true;continue;}
  }

 }
 pauseGroundEnemies(dt){for(const e of this.g.enemies)if(this.g.grounded(e))for(const key of ['until','nextShot','patternUntil','chargeAt','jumpAt','roamUntil','nextHammer'])if(typeof e[key]==='number')e[key]+=dt;}
 pauseEnemies(dt){for(const e of this.g.enemies)if(![8,12].includes(e.kind))for(const key of ['until','nextShot','patternUntil','chargeAt','jumpAt','roamUntil','nextHammer'])if(typeof e[key]==='number')e[key]+=dt;}
 pause(dt){const g=this.g;for(const f of this.fireworks)f.at+=dt;for(const o of [...g.enemies,...g.projectiles,...g.bombs,...g.puddles,...this.hazards,...this.hands,...this.relics])for(const k of ['born','until','armed','patternUntil','nextShot','chargeAt','jumpAt','landAt','eggAt','roamUntil','fuse','lockAt','pickupAt'])if(typeof o[k]==='number'&&!(this.g.age<this.shockUntil&&o===this.shockOwner))o[k]+=dt;}
}
