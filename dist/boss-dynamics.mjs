import {cloudClearOfBrains} from './cloud-scores.mjs';
import {planRoute} from './navigation.mjs?v=1';
const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function solids(a){const g=a.g;return [...g.enemies.filter(p=>p.state!=='jump'&&!p.thrown&&!p.held),...g.food.filter(p=>!p.slide),...g.bombs.filter(p=>!p.thrown&&!p.held),...g.projectiles.filter(p=>!p.dead),...a.relics.filter(p=>!p.carried&&!p.attached&&!p.held&&!p.thrown),...g.knives.filter(k=>!k.held&&!k.thrown)];}
export function radius(a,p){return a.g.enemies.includes(p)?a.g.enemyRadius(p):a.hands.includes(p)?13:p.type==='ball'?13:10;}
export function moveSolid(a,p,to,amount,ignore=null){if(p.kind===10||a.g.timeFrozen(p))return false;const g=a.g,r=radius(a,p),others=solids(a),angle=Math.atan2(to.y-p.y,to.x-p.x);for(const off of [0,.5,-.5,1,-1,1.5,-1.5]){const q={x:p.x+Math.cos(angle+off)*amount,y:p.y+Math.sin(angle+off)*amount};if(g.blocked(q,r)||g.cakeBlocks(q,r))continue;let good=true;for(const o of others){if(o===p||o===ignore||o===p.target&&p.state==='windup')continue;const minimum=r+radius(a,o)+1;if(dist(q,o)<minimum&&dist(q,o)<dist(p,o)-.01){good=false;break;}}if(good){p.x=q.x;p.y=q.y;return true;}}return false;}
// Choose waypoints around the card cluster; route planning is bounded, never per frame.
export function brainRoam(a,e,dt){const g=a.g,head=g.body[0],blocked=p=>g.blocked(p,37)||g.cakeBlocks(p,37);
 if(!e.roamRoute?.length||g.age>=(e.roamAt||0)){
  const away=Math.atan2(e.y-head.y,e.x-head.x),candidates=[];
  for(let i=0;i<16;i++){const angle=away+i*TAU/16,p={x:Math.max(75,Math.min(g.width-75,e.x+Math.cos(angle)*200)),y:Math.max(75,Math.min(g.height-75,e.y+Math.sin(angle)*200))};if(blocked(p)||dist(e,p)<30)continue;const edge=Math.min(p.x,p.y,g.width-p.x,g.height-p.y);candidates.push({...p,score:dist(p,head)+Math.min(edge,180)*.3-dist(e,p)*.1});}
  candidates.sort((p,q)=>q.score-p.score);e.roamRoute=null;
  for(const p of candidates){const route=planRoute(e,p,blocked,g.width,g.height,{cell:20,maxVisits:2500});if(route?.length){e.roamRoute=route;e.roam=p;break;}}
  e.roamAt=g.age+.8;e.roamStuck=0;
 }
 if(e.roamRoute?.length){const p=e.roamRoute[0];if(dist(e,p)<10)e.roamRoute.shift();else{const moved=g.moveEnemy(e,p,58,dt);e.roamStuck=moved?0:(e.roamStuck||0)+dt;if(e.roamStuck>.65)e.roamAt=g.age;}}
}
export function hammer(a,e,angle){const g=a.g,r=38+g.random()*252,from={x:e.x,y:e.y-(e.lift||0)},to={x:Math.max(12,Math.min(g.width-12,e.x+Math.cos(angle)*r)),y:Math.max(12,Math.min(g.height-12,e.y+Math.sin(angle)*r))};g.projectiles.push({type:'hammer',volley:g.age,...from,from,to,born:g.age,duration:.7+g.random()*.25,owner:e});g.events.push({type:'hammer'});}
export function tornado(a,h,dt){const g=a.g;if(h.activeAt!==undefined){if(!h.dialed){h.dialed=true;g.events.push({type:'blackhole-dial'});}if(g.age<h.activeAt)return;}const list=solids(a).filter(p=>p!==h.owner&&p.kind!==10&&!p.attached&&!p.held),strength=d=>420/(1+(d/170)**1.35);
 if(g.age>=h.until){if(!h.released){h.released=true;for(const p of list){const d=dist(p,h),angle=Math.atan2(p.y-h.y,p.x-h.x),speed=850+Math.max(0,280-d*.25);p.gust={vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,until:g.age+1.6};if(dist(p,h)<110){if(g.bombs.includes(p))p.armed??=g.age;else if(a.relics.includes(p)&&p.type==='dynamite'){p.fuse=g.age;p.warnAt=g.age;p.blackholeArmed=true;}}}const head=g.body[0],releaseAngle=Math.atan2(head.y-h.y,head.x-h.x);g.attraction=null;g.knockback={vx:Math.cos(releaseAngle)*360,vy:Math.sin(releaseAngle)*360,until:g.age+.9};g.selfGraceUntil=Math.max(g.selfGraceUntil||0,g.age+1.7);g.events.push({type:'blackhole-burst',x:h.x,y:h.y,radius:260});}return;}
 for(const cloud of a.hazards.filter(c=>c.type==='cloud')){const d=dist(cloud,h),step=Math.min(Math.max(0,d-30),dt*strength(d)*.8),angle=Math.atan2(h.y-cloud.y,h.x-cloud.x),q={x:cloud.x+Math.cos(angle)*step,y:cloud.y+Math.sin(angle)*step};if(cloudClearOfBrains(g,q)&&!a.hazards.some(c=>c!==cloud&&c.type==='cloud'&&dist(q,c)<54)){cloud.x=q.x;cloud.y=q.y;}}
 for(const p of list){const d=dist(p,h);if(d<25)continue;const angle=Math.atan2(p.y-h.y,p.x-h.x),orbit={x:h.x+Math.cos(angle+.5)*Math.min(d*.25,45),y:h.y+Math.sin(angle+.5)*Math.min(d*.25,45)};const before={x:p.x,y:p.y};moveSolid(a,p,orbit,Math.min(d-24,dt*strength(d)));if(p.from){const dx=p.x-before.x,dy=p.y-before.y;p.from.x+=dx;p.from.y+=dy;if(p.to){p.to.x+=dx;p.to.y+=dy;}}}
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const p=list[i],q=list[j],d=dist(p,q),min=radius(a,p)+radius(a,q)+1;if(d>=min)continue;const angle=d>.01?Math.atan2(q.y-p.y,q.x-p.x):i*2.4;moveSolid(a,p,{x:p.x-Math.cos(angle)*min,y:p.y-Math.sin(angle)*min},Math.min((min-d)/2+1,3),q);moveSolid(a,q,{x:q.x+Math.cos(angle)*min,y:q.y+Math.sin(angle)*min},Math.min((min-d)/2+1,3),p);}
 const head=g.body[0],d=dist(head,h),angle=Math.atan2(h.y-head.y,h.x-head.x),power=strength(d)*.3;g.attraction={vx:Math.cos(angle)*power,vy:Math.sin(angle)*power};
}
export function gusts(a,dt){for(const p of solids(a)){if(!p.gust||a.g.timeFrozen(p))continue;if(a.g.age>=p.gust.until){delete p.gust;continue;}const v=p.gust,before={x:p.x,y:p.y};if(p.kind===8&&p.state==='egg'){const nx=p.x+v.vx*dt,ny=p.y+v.vy*dt;if(nx<=24||ny<=24||nx>=a.g.width-24||ny>=a.g.height-24){a.g.killEnemy(p,'egg-wall');continue;}}moveSolid(a,p,{x:p.x+v.vx,y:p.y+v.vy},Math.hypot(v.vx,v.vy)*dt);if(p.from){const dx=p.x-before.x,dy=p.y-before.y;p.from.x+=dx;p.from.y+=dy;if(p.to){p.to.x+=dx;p.to.y+=dy;}}v.vx*=Math.exp(-3*dt);v.vy*=Math.exp(-3*dt);}}
export function thrown(a,p){const g=a.g,f=p.thrown;if(!f||g.timeFrozen(p))return;const t=Math.min(1,(g.age-f.born)/.8);p.x=f.from.x+(f.to.x-f.from.x)*t;p.y=f.from.y+(f.to.y-f.from.y)*t;p.lift=Math.sin(t*Math.PI)*75;if(t>=1){delete p.thrown;p.lift=0;p.born=g.age-.9;if(g.cakeBlocks(p,radius(a,p))){if(g.bombs.includes(p))g.explode(p);else if(g.knives.includes(p)){g.breakObject(p,'knife');g.removeKnife(p);}else if(a.relics.includes(p)){g.breakObject(p);a.relics.splice(a.relics.indexOf(p),1);}else g.killEnemy(p,'cake');}else if(g.bombs.includes(p))p.armed=g.age;}}
function moveHand(a,hand,to,amount){const k=hand.king,r=a.g.enemyRadius(k)+16,d=dist(hand,k);if(d<r){const a=Math.atan2(hand.y-k.y,hand.x-k.x);hand.x=k.x+Math.cos(a)*r;hand.y=k.y+Math.sin(a)*r;}const angle=Math.atan2(to.y-hand.y,to.x-hand.x);for(const off of [0,.55,-.55,1.1,-1.1,1.65,-1.65,Math.PI]){const q={x:hand.x+Math.cos(angle+off)*amount,y:hand.y+Math.sin(angle+off)*amount};if((q.x-k.x)*hand.side<2)continue;if(dist(q,k)<r&&dist(q,k)<=dist(hand,k))continue;hand.x=q.x;hand.y=q.y;return;}}
export function royalThrowAim(g,target,weapon=false){const head=g.body[0];if(weapon){let best=null,distance=-1;for(let i=0;i<24;i++){const angle=i*TAU/24,p={x:Math.max(22,Math.min(g.width-22,target.x+Math.cos(angle)*360)),y:Math.max(22,Math.min(g.height-22,target.y+Math.sin(angle)*360))};if(g.blocked(p,12)||g.cakeBlocks(p,12))continue;const d=dist(p,head);if(d>distance){best=p;distance=d;}}return best||g.freePoint(100)||{x:target.x,y:target.y};}const angle=g.angle+(g.random()-.5)*.5;for(const radius of [110,85,140,60]){const p={x:head.x+Math.cos(angle)*radius,y:head.y+Math.sin(angle)*radius};if(!g.blocked(p,12)&&!g.cakeBlocks(p,12))return p;}return g.randomAim();}
export function hands(a,dt){const g=a.g,age=g.age;
 for(const hand of [...a.hands]){const k=hand.king;if(!g.enemies.includes(k)){a.removeHand(hand);continue;}
  if(g.timeStopped){hand.defending=false;for(const key of ['born','until','reachUntil','pointUntil'])if(typeof hand[key]==='number')hand[key]+=dt;continue;}
  if(g.armed&&dist(g.blade(),hand)<24){a.removeHand(hand);g.consumeKnife();g.events.push({type:'defeat',...hand});continue;}
  hand.defending=(g.body[0].x-k.x)*hand.side>0&&dist(k,g.body[0])<190;
  if(hand.defending){if(hand.target)hand.target.held=false;hand.target=null;hand.state='block';const angle=Math.atan2(g.body[0].y-k.y,g.body[0].x-k.x);hand.angle=angle;const goal={x:k.x+Math.cos(angle)*67,y:k.y+Math.sin(angle)*67};moveHand(a,hand,goal,Math.min(dist(hand,goal),280*dt));if(dist(hand,g.body[0])<18&&!g.invincible)g.fail('왕의 손에 막혔어요.');continue;}if(hand.state==='block'){hand.state='return';hand.until=age+.4;}
  const weapon=p=>g.knives.includes(p)||a.relics.includes(p),alive=p=>g.enemies.includes(p)||g.bombs.includes(p)||weapon(p);let t=hand.target;if((dist(hand,k)>175||(t&&(dist(t,k)>175||(t.x-k.x)*hand.side<0)))&&hand.state!=='return'&&hand.state!=='windup'){if(t)t.held=false;hand.target=null;hand.state='return';t=null;}
  if(t&&!alive(t)){hand.target=null;hand.state='return';t=null;}
  if(hand.state==='windup'&&t){const progress=Math.min(1,(age-hand.born)/.55),desired={x:hand.from.x-Math.cos(hand.angle)*23*progress,y:hand.from.y-Math.sin(hand.angle)*23*progress};moveHand(a,hand,desired,Math.min(dist(hand,desired),245*dt));t.x=hand.x;t.y=hand.y+24;
   if(age>=hand.until){t.held=false;t.thrown={from:{x:t.x,y:t.y},to:hand.aim,born:age};if(g.bombs.includes(t))t.armed=null;hand.state='return';hand.target=null;hand.until=age+2.4;g.events.push({type:'king-throw'});}continue;}
  if(hand.state==='reach'&&t){const grabs=hand.side===-1,desired=grabs?{x:t.x,y:t.y-24}:t;hand.angle=Math.atan2(t.y-hand.y,t.x-hand.x);moveHand(a,hand,desired,Math.min(dist(hand,desired),235*dt));
   if(dist(hand,desired)<(grabs?5:radius(a,t)+14)){if(grabs){t.held=true;g.events.push({type:'grab'});hand.state='windup';hand.born=age;hand.until=age+.55;hand.from={x:hand.x,y:hand.y};hand.aim=royalThrowAim(g,t,weapon(t));hand.angle=Math.atan2(hand.aim.y-hand.y,hand.aim.x-hand.x);}else{t.enhanced=true;hand.state='return';hand.pointUntil=age+.45;hand.target=null;hand.until=age+2.8;g.events.push({type:'enhance'});}}
   else if(age>=hand.reachUntil){hand.state='return';hand.target=null;hand.until=age+.8;}continue;}
  const home={x:Math.max(16,Math.min(g.width-16,k.x+hand.side*65)),y:Math.max(16,Math.min(g.height-16,k.y+Math.sin(age*1.4+hand.side)*15))};moveHand(a,hand,home,Math.min(dist(hand,home),220*dt));if(hand.state==='return'){if(dist(hand,home)<5)hand.state='idle';else continue;}
  if(age>=hand.until){let pool=g.enemies.filter(o=>(o.kind<6||o.kind===11)&&!o.held&&!o.thrown&&dist(o,k)<165&&(o.x-k.x)*hand.side>=0);if(hand.side===-1){pool=pool.filter(o=>o.kind!==11);pool.push(...g.bombs.filter(b=>!b.held&&!b.thrown&&dist(b,k)<165&&(b.x-k.x)*hand.side>=0));}else{pool=pool.filter(e=>!e.enhanced);if(!pool.length)pool=g.bombs.filter(b=>!b.enhanced&&!b.held&&!b.thrown&&dist(b,k)<165&&(b.x-k.x)*hand.side>=0);}
   const weapons=[...g.knives,...a.relics].filter(p=>!p.held&&!p.thrown&&!p.carried&&!p.attached&&!p.blackholeArmed&&dist(p,k)<165&&(p.x-k.x)*hand.side>=0);if(hand.side===-1&&weapons.length)pool=weapons;
   if(hand.side===1)pool.sort((p,q)=>dist(p,hand)-dist(q,hand));const selected=pool[hand.side===-1?Math.floor(g.random()*pool.length):0];if(selected){hand.target=selected;hand.state='reach';hand.reachUntil=age+3;}else hand.until=age+.7;}

 }
}

// The king keeps a navigable goal outside allies, never pursues their occupied center.
export function kingMove(a,e,dt){const g=a.g,h=g.body[0],margin=85,corner=e.x<margin||e.y<margin||e.x>g.width-margin||e.y>g.height-margin,close=dist(e,h)<145;
 if(g.age>=(e.thinkAt||0)||close&&e.behavior!=='retreat'||corner&&e.behavior!=='return'){
  e.thinkAt=g.age+1.3+g.random()*.5;let goal;const allies=g.enemies.filter(o=>o!==e&&(o.kind<6||o.kind===11)&&!o.held&&!o.thrown).sort((p,q)=>dist(e,p)-dist(e,q));
  if(corner||e.stuck>.45){e.behavior='return';goal={x:g.width/2,y:g.height/2};}
  else if(close){e.behavior='retreat';const angle=Math.atan2(e.y-h.y,e.x-h.x);goal={x:e.x+Math.cos(angle)*180,y:e.y+Math.sin(angle)*180};}
  else if(allies.length&&dist(e,allies[0])>135){e.behavior='follow';const ally=allies[0],angle=Math.atan2(e.y-ally.y,e.x-ally.x);goal={x:ally.x+Math.cos(angle)*110,y:ally.y+Math.sin(angle)*110};}
  else{e.behavior=allies.length?'guard':'wander';const center=allies[0]||{x:g.width/2,y:g.height/2},angle=g.random()*TAU;goal={x:center.x+Math.cos(angle)*150,y:center.y+Math.sin(angle)*150};}
  const blocked=p=>g.blocked(p,36);e.kingRoute=null;
  for(let i=0;i<10;i++){const angle=i*2.4,p={x:Math.max(margin,Math.min(g.width-margin,goal.x+Math.cos(angle)*i*25)),y:Math.max(margin,Math.min(g.height-margin,goal.y+Math.sin(angle)*i*25))};if(blocked(p))continue;const route=planRoute(e,p,blocked,g.width,g.height,{cell:20,maxVisits:2200});if(route?.length){e.kingRoute=route;break;}}
  e.stuck=0;
 }
 if(e.kingRoute?.length){const p=e.kingRoute[0];if(dist(e,p)<10)e.kingRoute.shift();else if(!g.moveEnemy(e,p,e.behavior==='retreat'?105:84,dt)){e.stuck=(e.stuck||0)+dt;if(e.stuck>.45)e.thinkAt=g.age;}else e.stuck=0;}
}
