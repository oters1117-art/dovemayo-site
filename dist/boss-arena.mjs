import {brainRoam,hammer,tornado,gusts,hands,thrown} from './boss-dynamics.mjs?v=1';
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
 spawn(debug=false){const g=this.g;if(this.spawned>=4&&!debug)return false;const kind=this.order[this.spawned%4],p=g.freePoint(160,kind===9?42:46);if(!p)return false;
  const serial=this.spawned++,e={...p,kind,serial,born:g.age,state:'idle',until:g.age+2,pattern:0};g.enemies.push(e);g.nextBoss=this.spawned<4?120+this.spawned*90:Infinity;g.nextKnife=g.age;g.ensureKnife();g.events.push({type:'boss',name:BOSS_NAMES[kind-6],...p});
  if(kind===9){const c=g.freePoint(120,42)||g.nearPoint(e,95,170);if(c){g.enemies.push({...c,kind:10,serial,born:g.age,until:g.age+2,king:e});e.castleAlive=true;}
   for(const side of [-1,1])this.hands.push({x:clamp(e.x+side*83,16,g.width-16),y:e.y,king:e,side,state:'idle',until:g.age+2});this.ensureDynamite();}
  return true;
 }
 hit(e,source){const g=this.g;if(e.kind===7&&(e.state==='jump'||g.age<(e.safeUntil||0))&&source==='knife')return false;if(e.kind===10&&source!=='dynamite'&&source!=='celebration')return false;
  if(e.kind>=6&&e.kind<=9&&!['knife','blast','dynamite','celebration'].includes(source))return false;
  if(e.kind===8&&e.state!=='egg'&&source!=='celebration'){e.state='egg';e.eggAt=g.age;e.until=g.age+9;this.clearOwner(e);g.nextKnife=g.age;g.knife=null;g.knifeAnchor={x:e.x,y:e.y};g.immediateKnife=!!g.armed;if(!g.armed)g.ensureKnife();g.events.push({type:'egg',...e});return false;}return true;
 }
 defeatedBoss(e){const g=this.g;if(e.kind===6)g.dropBossTomatoes(e);
  if(e.kind===7){for(let i=0,n=4+Math.floor(g.random()*5);i<n;i++)this.drop(Math.floor(g.random()*47),e);this.drop(REWARD.PUMPKIN,e);}
  if(e.kind===8){this.drop(REWARD.NAZAR,e);g.events.push({type:'slime',x:e.x,y:e.y});}
  if(e.kind===9){g.enemies.filter(o=>o.kind<6||o.kind===11).forEach((o,i)=>this.fireworks.push({x:o.x,y:o.y,at:g.age+i*.055}));this.hands=this.hands.filter(h=>h.king!==e);g.enemies=g.enemies.filter(o=>o.kind>=6&&o.kind<=10);g.projectiles=[];g.bombs=[];g.puddles=[];}
  if(e.kind===10){this.drop(46,e);this.drop(46,e);if(e.king)e.king.castleAlive=false;}
  this.clearOwner(e);
  if(e.kind>=6&&e.kind<=9&&e.serial>=0&&e.serial<4)this.defeated.add(e.serial);
  this.checkCake();
 }
 checkCake(){if(this.defeated.size===4&&!this.cake&&!this.cakeClaimed&&!this.g.enemies.some(e=>e.kind===10)){const p=this.g.freePoint(65,30)||this.g.nearPoint(this.g.body[0],70,180);if(p)this.cake={...p,born:this.g.age};}}
 clearOwner(e){this.hazards=this.hazards.filter(h=>h.owner!==e);}
 drop(kind,origin){const g=this.g,to=g.nearPoint(origin,45,115)||g.freePoint(25)||{x:clamp(origin.x,18,g.width-18),y:clamp(origin.y,18,g.height-18)};
  g.food.push({x:origin.x,y:origin.y,kind,slide:{from:{x:origin.x,y:origin.y},to,born:g.age,duration:.8}});}
 ensureDynamite(){const g=this.g;if(g.enemies.some(e=>e.kind===10)&&!this.relics.some(r=>r.type==='dynamite')&&g.age>=this.nextDynamite){const p=g.freePoint(45);if(p)this.relics.push({...p,type:'dynamite',born:g.age});}}
 updateEnemy(e,dt){const g=this.g,h=g.enemyTarget(e),age=g.age;
  if(e.thrown){thrown(this,e);return;}
  if(e.kind===7){
   if(e.state==='jump'){const t=clamp((age-e.jumpAt)/.85,0,1);e.x=e.from.x+(e.aim.x-e.from.x)*t;e.y=e.from.y+(e.aim.y-e.from.y)*t;e.lift=Math.sin(t*Math.PI)*220;
    if(t===1){e.lift=0;e.state='land';e.landAt=age;e.until=age+.32;e.safeUntil=age+.48;this.area(e,108,'press',e);this.shockAt=age;this.shockUntil=age+.38;this.shockOwner=e;}return;}
   if(e.state==='hammer-charge'){if(age>=e.until){if(e.rapid){e.state='hammer-stream';e.left=18;e.nextHammer=age;}else{const offset=g.random()*TAU;for(let i=0;i<18;i++)hammer(this,e,offset+i*TAU/18);e.state='idle';e.until=age+1.25;}}return;}
   if(e.state==='hammer-stream'){if(age>=e.nextHammer){hammer(this,e,g.random()*TAU);e.left--;e.nextHammer=age+.075;if(!e.left){e.state='idle';e.until=age+1.1;}}return;}
   if(e.state==='land'&&age>=e.until){e.state='hammer-charge';e.chargeAt=age;e.rapid=g.random()<.5;e.until=age+.38;return;}
   if(e.state==='idle'){this.keepDistance(e,180,105,dt);if(age>=e.until){const pattern=e.pattern++%4;if(pattern===0){e.aim=this.landingPoint(e);e.state='jump';e.jumpAt=age;e.from={x:e.x,y:e.y};e.until=age+.85;g.events.push({type:'throw'});}else if(pattern===1||pattern===3){e.state='hammer-charge';e.chargeAt=age;e.rapid=pattern===3;e.until=age+.65;}else{const angle=Math.atan2(h.y-e.y,h.x-e.x);g.projectiles.push({type:'ball',x:e.x+Math.cos(angle)*48,y:e.y+Math.sin(angle)*48,vx:Math.cos(angle)*205,vy:Math.sin(angle)*205,born:age,owner:e,hits:0});g.events.push({type:'roll'});e.until=age+1.7;}}}return;
  }
  if(e.kind===8){
   if(e.state==='egg'){if(age>=e.until){e.state='idle';e.until=age+2;g.events.push({type:'egg-hatch'});}return;}
   brainRoam(this,e,dt);if(age<e.until)return;
   const pattern=e.pattern++%3;e.until=age+6.2;
   if(pattern===0){for(let i=0;i<64;i++){const p={x:25+g.random()*(g.width-50),y:25+g.random()*(g.height-50)};this.hazards.push({...p,type:'cloud',vx:g.random()<.5?-22:22,born:age+i*.008,until:age+.62+i*.008,owner:e});}}
   if(pattern===1){const a=Math.atan2(h.y-e.y,h.x-e.x);this.hazards.push({type:'laser',x:e.x,y:e.y,angle:a,born:age,until:age+.85,beeps:0,owner:e});}
   if(pattern===2){for(let i=0;i<1;i++){const p=g.freePoint(85)||g.randomAim();this.hazards.push({...p,type:'tornado',born:age,until:age+5.5,owner:e});}g.events.push({type:'wind'});}return;
  }
  if(e.kind===9){const other=g.enemies.filter(o=>o.kind<6&&!o.thrown).sort((a,b)=>dist(a,e)-dist(b,e))[0];this.keepDistance(e,200,other?0:65,dt);if(other)g.moveEnemy(e,other,72,dt);return;}
  if(e.kind===10){if(age>=e.until){e.until=age+3.2;const before=g.enemies.length;g.spawnEnemy(g.random()<.45?11:g.chooseEnemyKind());const child=g.enemies[before];if(child){const p=g.nearPoint(e,55,85);if(p){child.x=p.x;child.y=p.y;}child.king=g.enemies.find(k=>k.kind===9&&k.serial===e.serial);}}return;}
  if(e.kind===11){if(e.king&&g.enemies.includes(e.king)){e.orbitAngle=(e.orbitAngle||0)+dt*.9;g.moveEnemy(e,{x:e.king.x+Math.cos(e.orbitAngle)*100,y:e.king.y+Math.sin(e.orbitAngle)*100},82,dt);}else g.moveEnemy(e,h,105,dt);}
 }
 landingPoint(e){const g=this.g,h=g.enemyTarget(e);for(let i=0;i<24;i++){const a=g.angle+(i===0?0:(i%2?1:-1)*Math.ceil(i/2)*.26),r=44+Math.floor(i/8)*22,p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};if(!g.blocked(p,35))return p;}return g.freePoint(45,36)||{x:e.x,y:e.y};}
 keepDistance(e,r,speed,dt){const g=this.g,h=g.enemyTarget(e),d=dist(e,h);if(Math.abs(d-r)>22)g.moveEnemy(e,h,speed,dt,d<r);}
 area(center,r,source,owner=null){const g=this.g;g.events.push({type:source==='press'?'press':'blast',x:center.x,y:center.y,radius:r});
  for(const hand of [...this.hands])if(dist(hand,center)<r+16)this.removeHand(hand);
  for(const e of [...g.enemies])if(e!==owner&&dist(e,center)<r+g.enemyRadius(e))g.killEnemy(e,source);
  for(const p of g.projectiles)if(!g.isFlying(p)&&dist(p,center)<r+8){p.dead=true;p.cancelSpill=true;}
  g.food=g.food.filter(f=>f.slide?.born===g.age||dist(f,center)>r+8);g.puddles=g.puddles.filter(f=>dist(f,center)>r+f.radius);
  for(const b of [...g.bombs])if(g.bombs.includes(b)&&dist(b,center)<r+10)g.explode(b);
  if(g.knife&&dist(g.knife,center)<r){g.knife=null;g.nextKnife=g.age+3;}
  if(dist(g.body[0],center)<r+4&&!g.invincible)g.fail('보스의 범위 공격에 맞았어요.');
 }
 update(dt){const g=this.g,age=g.age;this.ensureDynamite();this.checkCake();
  hands(this,dt);gusts(this,dt);
  for(const f of this.fireworks)if(!f.done&&age>=f.at){f.done=true;g.events.push({type:'firework',...f});}this.fireworks=this.fireworks.filter(f=>!f.done);
  for(const b of g.bombs)if(b.thrown)thrown(this,b);
  for(const h of this.hazards){if(age<h.born)continue;
   if(h.type==='cloud')h.x+=h.vx*dt;
   if(h.type==='cloud'&&age>=h.until&&!h.fired){h.fired=true;g.events.push({type:'zap'});if(dist(g.body[0],h)<28&&!g.invincible)g.fail('번개에 맞았어요.');for(const e of [...g.enemies])if(e!==h.owner&&dist(e,h)<28+g.enemyRadius(e))g.killEnemy(e,'lightning');}
   if(h.type==='laser'){const t=age-h.born;if(!h.fired){const target=g.enemyTarget(h.owner);h.angle=Math.atan2(target.y-h.owner.y,target.x-h.owner.x);h.x=h.owner.x+Math.cos(h.angle)*48;h.y=h.owner.y+Math.sin(h.angle)*48;}
    if(!h.fired&&h.beeps<3&&t>=h.beeps*.24){h.beeps++;g.events.push({type:'phone'});}if(age>=h.until&&!h.fired){h.fired=true;g.events.push({type:'laser'});}
    if(h.fired&&age<h.until+.18){const hit=p=>{const dx=p.x-h.x,dy=p.y-h.y;return dx*Math.cos(h.angle)+dy*Math.sin(h.angle)>=-8&&Math.abs(dx*Math.sin(h.angle)-dy*Math.cos(h.angle))<16;};
     if(hit(g.body[0])&&!g.invincible)g.fail('레이저에 맞았어요.');
     for(const e of [...g.enemies])if(e!==h.owner&&hit(e)&&g.killEnemy(e,'laser'))g.events.push({type:'firework',x:e.x,y:e.y});
     for(const p of [...g.food,...g.projectiles])if(hit(p)&&!p.laserHit){p.laserHit=true;p.dead=true;g.events.push({type:'firework',x:p.x,y:p.y});}g.food=g.food.filter(p=>!p.laserHit);
     for(const b of [...g.bombs])if(hit(b))g.explode(b);
     if(g.knife&&hit(g.knife)){g.events.push({type:'firework',...g.knife});g.knife=null;g.nextKnife=age+2;}
    }
   }
   if(h.type==='tornado')tornado(this,h,dt);
  }
  this.hazards=this.hazards.filter(h=>age<h.until+(h.type==='cloud'?.23:h.type==='laser'?.3:.05));
  for(const r of [...this.relics]){
   if(r.carried){r.x=g.body[0].x;r.y=g.body[0].y;const target=g.enemies.find(e=>dist(r,e)<g.enemyRadius(e)+23),wall=g.obstacles.some(b=>r.x>b.x-12&&r.x<b.x+b.w+12&&r.y>b.y-12&&r.y<b.y+b.h+12);if(target||wall){r.attached=target||{x:r.x,y:r.y};r.carried=false;r.installed=age;r.fuse=age+2.4;g.events.push({type:'fuse'});}continue;}
   if(r.attached){r.x=r.attached.x;r.y=r.attached.y;if(age>=r.fuse){r.warnAt??=age;if(age-r.warnAt>=.8){this.relics.splice(this.relics.indexOf(r),1);this.nextDynamite=age+4;this.area(r,150,'dynamite');}}continue;}
   if(dist(r,g.body[0])<18){r.carried=true;continue;}
   const target=g.enemies.find(e=>dist(r,e)<g.enemyRadius(e)+12)||g.projectiles.find(p=>!p.dead&&!g.isFlying(p)&&dist(r,p)<18)||g.bombs.find(b=>!b.thrown&&dist(r,b)<18);
   if(target){r.attached=target;r.installed=age;r.fuse=age+2.4;g.events.push({type:'fuse'});}
  }
  if(this.cake&&age-this.cake.born>1.7&&dist(g.body[0],this.cake)<34){g.score+=100;g.goalLength+=240;g.enemies=[];g.projectiles=[];g.bombs=[];g.puddles=[];this.hands=[];this.hazards=[];this.relics=[];g.events.push({type:'celebration',...this.cake});this.cake=null;this.cakeClaimed=true;}
 }
 pause(dt){const g=this.g;for(const o of [...g.enemies,...g.projectiles,...g.bombs,...g.puddles,...this.hazards,...this.hands,...this.relics])for(const k of ['born','until','armed','patternUntil','nextShot','chargeAt','jumpAt','landAt','eggAt','roamUntil','fuse'])if(typeof o[k]==='number'&&!(this.g.age<this.shockUntil&&o===this.shockOwner))o[k]+=dt;}
}
