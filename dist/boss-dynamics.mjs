import {planRoute} from './navigation.mjs?v=1';
const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function solids(a){const g=a.g;return [...g.enemies.filter(p=>p.state!=='jump'&&!p.thrown&&!p.held),...g.food.filter(p=>!p.slide),...g.bombs.filter(p=>!p.thrown&&!p.held),...g.projectiles.filter(p=>!p.dead),...a.relics.filter(p=>!p.carried&&!p.attached),...(g.knife?[g.knife]:[])];}
export function radius(a,p){return a.g.enemies.includes(p)?a.g.enemyRadius(p):a.hands.includes(p)?13:p.type==='ball'?13:10;}
export function moveSolid(a,p,to,amount,ignore=null){if(p.kind===10)return false;const g=a.g,r=radius(a,p),others=solids(a),angle=Math.atan2(to.y-p.y,to.x-p.x);for(const off of [0,.5,-.5,1,-1,1.5,-1.5]){const q={x:p.x+Math.cos(angle+off)*amount,y:p.y+Math.sin(angle+off)*amount};if(g.blocked(q,r))continue;let good=true;for(const o of others){if(o===p||o===ignore||o===p.target&&p.state==='windup')continue;const minimum=r+radius(a,o)+1;if(dist(q,o)<minimum&&dist(q,o)<dist(p,o)-.01){good=false;break;}}if(good){p.x=q.x;p.y=q.y;return true;}}return false;}
// Choose waypoints around the card cluster; route planning is bounded, never per frame.
export function brainRoam(a,e,dt){const g=a.g,cards=g.obstacles.filter(b=>b.radius&&!b.parts),left=cards.length?Math.min(...cards.map(b=>b.x)):g.width*.35,right=cards.length?Math.max(...cards.map(b=>b.x+b.w)):g.width*.65,top=cards.length?Math.min(...cards.map(b=>b.y)):g.height*.35,bottom=cards.length?Math.max(...cards.map(b=>b.y+b.h)):g.height*.65,cx=(left+right)/2,cy=(top+bottom)/2;
 if(!e.roamRoute?.length||g.age>=(e.roamAt||0)){
  const outward=e.roamStuck>.5||e.x<65||e.y<65||e.x>g.width-65||e.y>g.height-65;
  let angle=Math.atan2(e.y-cy,e.x-cx)+(outward?.4:.65);e.roamDirection??=g.random()<.5?-1:1;angle=Math.atan2(e.y-cy,e.x-cx)+e.roamDirection*(outward?.4:.65);
  const rx=(right-left)/2+80,ry=(bottom-top)/2+85,blocked=p=>g.blocked(p,37);e.roamRoute=null;
  for(let i=0;i<6;i++){const a=angle+i*e.roamDirection*.35,p={x:Math.max(48,Math.min(g.width-48,cx+Math.cos(a)*rx)),y:Math.max(48,Math.min(g.height-48,cy+Math.sin(a)*ry))};if(blocked(p))continue;const route=planRoute(e,p,blocked,g.width,g.height,{cell:20,maxVisits:2500});if(route?.length){e.roamRoute=route;e.roam=p;break;}}
  e.roamAt=g.age+2.5;e.roamStuck=0;
 }
 if(e.roamRoute?.length){const p=e.roamRoute[0];if(dist(e,p)<10)e.roamRoute.shift();else{const moved=g.moveEnemy(e,p,58,dt);e.roamStuck=moved?0:(e.roamStuck||0)+dt;if(e.roamStuck>.65)e.roamAt=g.age;}}
}
export function hammer(a,e,angle){const g=a.g,r=38+g.random()*252,from={x:e.x,y:e.y-(e.lift||0)},to={x:Math.max(12,Math.min(g.width-12,e.x+Math.cos(angle)*r)),y:Math.max(12,Math.min(g.height-12,e.y+Math.sin(angle)*r))};g.projectiles.push({type:'hammer',volley:g.age,...from,from,to,born:g.age,duration:.7+g.random()*.25,owner:e});g.events.push({type:'hammer'});}
export function tornado(a,h,dt){const g=a.g,list=solids(a).filter(p=>p!==h.owner&&p.kind!==10&&!p.attached&&!p.held),strength=d=>420/(1+(d/170)**1.35);
 if(g.age>=h.until){if(!h.released){h.released=true;for(const p of list){const d=dist(p,h),angle=Math.atan2(p.y-h.y,p.x-h.x),speed=850+Math.max(0,280-d*.25);p.gust={vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,until:g.age+1.6};if(g.bombs.includes(p))p.armed??=g.age;}const head=g.body[0],a=Math.atan2(head.y-h.y,head.x-h.x);g.attraction=null;g.knockback={vx:Math.cos(a)*360,vy:Math.sin(a)*360,until:g.age+.9};g.selfGraceUntil=Math.max(g.selfGraceUntil||0,g.age+1.7);g.events.push({type:'blackhole-burst',x:h.x,y:h.y,radius:260});}return;}
 for(const p of list){const d=dist(p,h);if(d<25)continue;const angle=Math.atan2(p.y-h.y,p.x-h.x),orbit={x:h.x+Math.cos(angle+.5)*Math.min(d*.25,45),y:h.y+Math.sin(angle+.5)*Math.min(d*.25,45)};const before={x:p.x,y:p.y};moveSolid(a,p,orbit,Math.min(d-24,dt*strength(d)));if(p.from){const dx=p.x-before.x,dy=p.y-before.y;p.from.x+=dx;p.from.y+=dy;if(p.to){p.to.x+=dx;p.to.y+=dy;}}}
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const p=list[i],q=list[j],d=dist(p,q),min=radius(a,p)+radius(a,q)+1;if(d>=min)continue;const angle=d>.01?Math.atan2(q.y-p.y,q.x-p.x):i*2.4;moveSolid(a,p,{x:p.x-Math.cos(angle)*min,y:p.y-Math.sin(angle)*min},Math.min((min-d)/2+1,3),q);moveSolid(a,q,{x:q.x+Math.cos(angle)*min,y:q.y+Math.sin(angle)*min},Math.min((min-d)/2+1,3),p);}
 const head=g.body[0],d=dist(head,h),angle=Math.atan2(h.y-head.y,h.x-head.x),power=strength(d)*.3;g.attraction={vx:Math.cos(angle)*power,vy:Math.sin(angle)*power};if(d<22&&!g.invincible)g.fail('블랙홀에 휘말렸어요.');
}
export function gusts(a,dt){for(const p of solids(a)){if(!p.gust)continue;if(a.g.age>=p.gust.until){delete p.gust;continue;}const v=p.gust,before={x:p.x,y:p.y};if(p.kind===8&&p.state==='egg'){const nx=p.x+v.vx*dt,ny=p.y+v.vy*dt;if(nx<=24||ny<=24||nx>=a.g.width-24||ny>=a.g.height-24){a.g.killEnemy(p,'egg-wall');continue;}}moveSolid(a,p,{x:p.x+v.vx,y:p.y+v.vy},Math.hypot(v.vx,v.vy)*dt);if(p.from){const dx=p.x-before.x,dy=p.y-before.y;p.from.x+=dx;p.from.y+=dy;if(p.to){p.to.x+=dx;p.to.y+=dy;}}v.vx*=Math.exp(-3*dt);v.vy*=Math.exp(-3*dt);}}
export function thrown(a,p){const g=a.g,f=p.thrown;if(!f)return;const t=Math.min(1,(g.age-f.born)/.8);p.x=f.from.x+(f.to.x-f.from.x)*t;p.y=f.from.y+(f.to.y-f.from.y)*t;p.lift=Math.sin(t*Math.PI)*75;if(t>=1){delete p.thrown;p.lift=0;p.born=g.age-.9;if(g.bombs.includes(p))p.armed=g.age;}}
function moveHand(a,hand,to,amount){const k=hand.king,r=a.g.enemyRadius(k)+16,d=dist(hand,k);if(d<r){const a=Math.atan2(hand.y-k.y,hand.x-k.x);hand.x=k.x+Math.cos(a)*r;hand.y=k.y+Math.sin(a)*r;}const angle=Math.atan2(to.y-hand.y,to.x-hand.x);for(const off of [0,.55,-.55,1.1,-1.1,1.65,-1.65,Math.PI]){const q={x:hand.x+Math.cos(angle+off)*amount,y:hand.y+Math.sin(angle+off)*amount};if((q.x-k.x)*hand.side<2)continue;if(dist(q,k)<r&&dist(q,k)<=dist(hand,k))continue;hand.x=q.x;hand.y=q.y;return;}}
export function hands(a,dt){const g=a.g,age=g.age;
 for(const hand of [...a.hands]){const k=hand.king;if(!g.enemies.includes(k)){a.removeHand(hand);continue;}
  if(g.armed&&dist(g.blade(),hand)<24){a.removeHand(hand);g.consumeKnife();g.events.push({type:'defeat',...hand});continue;}
  const alive=p=>g.enemies.includes(p)||g.bombs.includes(p);let t=hand.target;if((dist(hand,k)>175||(t&&(dist(t,k)>175||(t.x-k.x)*hand.side<0)))&&hand.state!=='return'){if(t)t.held=false;hand.target=null;hand.state='return';t=null;}
  if(t&&!alive(t)){hand.target=null;hand.state='return';t=null;}
  if(hand.state==='windup'&&t){const progress=Math.min(1,(age-hand.born)/.55),desired={x:hand.from.x-Math.cos(hand.angle)*23*progress,y:hand.from.y-Math.sin(hand.angle)*23*progress};moveHand(a,hand,desired,Math.min(dist(hand,desired),245*dt));t.x=hand.x;t.y=hand.y+24;
   if(age>=hand.until){t.held=false;t.thrown={from:{x:t.x,y:t.y},to:hand.aim,born:age};if(g.bombs.includes(t))t.armed=null;hand.state='return';hand.target=null;hand.until=age+2.4;g.events.push({type:'king-throw'});}continue;}
  if(hand.state==='reach'&&t){const desired=hand.side===-1?{x:t.x,y:t.y-24}:t;hand.angle=Math.atan2(t.y-hand.y,t.x-hand.x);moveHand(a,hand,desired,Math.min(dist(hand,desired),235*dt));
   if(dist(hand,desired)<(hand.side===-1?5:radius(a,t)+14)){if(hand.side===-1){t.held=true;g.events.push({type:'grab'});hand.state='windup';hand.born=age;hand.until=age+.55;hand.from={x:hand.x,y:hand.y};hand.aim=g.randomAim();hand.angle=Math.atan2(hand.aim.y-hand.y,hand.aim.x-hand.x);}else{t.enhanced=true;hand.state='return';hand.pointUntil=age+.45;hand.target=null;hand.until=age+2.8;g.events.push({type:'enhance'});}}
   else if(age>=hand.reachUntil){hand.state='return';hand.target=null;hand.until=age+.8;}continue;}
  const home={x:Math.max(16,Math.min(g.width-16,k.x+hand.side*65)),y:Math.max(16,Math.min(g.height-16,k.y+Math.sin(age*1.4+hand.side)*15))};moveHand(a,hand,home,Math.min(dist(hand,home),220*dt));if(hand.state==='return'){if(dist(hand,home)<5)hand.state='idle';else continue;}
  if(age>=hand.until){let pool=g.enemies.filter(o=>(o.kind<6||o.kind===11)&&!o.held&&!o.thrown&&dist(o,k)<165&&(o.x-k.x)*hand.side>=0);if(hand.side===-1)pool.push(...g.bombs.filter(b=>!b.held&&!b.thrown&&dist(b,k)<165&&(b.x-k.x)*hand.side>=0));else{pool=pool.filter(e=>!e.enhanced);if(!pool.length)pool=g.bombs.filter(b=>!b.enhanced&&!b.held&&!b.thrown&&dist(b,k)<165&&(b.x-k.x)*hand.side>=0);}
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
