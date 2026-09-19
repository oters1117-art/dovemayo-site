const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function solids(a){const g=a.g;return [...g.enemies.filter(p=>p.state!=='jump'&&!p.thrown&&!p.held),...g.food.filter(p=>!p.slide),...g.bombs.filter(p=>!p.thrown&&!p.held),...g.projectiles.filter(p=>!p.dead&&!g.isFlying(p)),...a.relics.filter(p=>!p.carried&&!p.attached),...(g.knife?[g.knife]:[])];}
export function radius(a,p){return a.g.enemies.includes(p)?a.g.enemyRadius(p):a.hands.includes(p)?13:p.type==='ball'?13:10;}
export function moveSolid(a,p,to,amount,ignore=null){const g=a.g,r=radius(a,p),others=solids(a),angle=Math.atan2(to.y-p.y,to.x-p.x);for(const off of [0,.5,-.5,1,-1,1.5,-1.5]){const q={x:p.x+Math.cos(angle+off)*amount,y:p.y+Math.sin(angle+off)*amount};if(g.blocked(q,r))continue;let good=true;for(const o of others){if(o===p||o===ignore||o===p.target&&p.state==='windup')continue;const minimum=r+radius(a,o)+1;if(dist(q,o)<minimum&&dist(q,o)<dist(p,o)-.01){good=false;break;}}if(good){p.x=q.x;p.y=q.y;return true;}}return false;}
export function brainRoam(a,e,dt){const g=a.g,h=g.enemyTarget(e),boxes=g.obstacles;const center=boxes.length?{x:boxes.reduce((v,b)=>v+b.x+b.w/2,0)/boxes.length,y:boxes.reduce((v,b)=>v+b.y+b.h/2,0)/boxes.length}:{x:g.width/2,y:g.height/2};
 if(!e.roam||g.age>=e.roamAt||dist(e,e.roam)<30){const angle=Math.atan2(center.y-h.y,center.x-h.x)+(g.random()-.5)*1.3;const r=Math.min(g.width,g.height)*(.25+g.random()*.13);e.roam={x:Math.max(42,Math.min(g.width-42,center.x+Math.cos(angle)*r)),y:Math.max(42,Math.min(g.height-42,center.y+Math.sin(angle)*r))};e.roamAt=g.age+1.8+g.random()*2;}
 g.moveEnemy(e,e.roam,58,dt);
}
export function hammer(a,e,angle){const g=a.g,r=120+g.random()*170,from={x:e.x,y:e.y},to={x:Math.max(12,Math.min(g.width-12,e.x+Math.cos(angle)*r)),y:Math.max(12,Math.min(g.height-12,e.y+Math.sin(angle)*r))};g.projectiles.push({type:'hammer',volley:g.age,...from,from,to,born:g.age,duration:.7+g.random()*.25,owner:e});g.events.push({type:'hammer'});}
export function tornado(a,h,dt){const g=a.g,list=solids(a).filter(p=>p!==h.owner&&!p.attached&&!p.held);if(g.age>=h.until){if(!h.released){h.released=true;for(const p of list){const angle=Math.atan2(p.y-h.y,p.x-h.x);p.gust={vx:Math.cos(angle)*280,vy:Math.sin(angle)*280,until:g.age+.8};}g.events.push({type:'air-pop',x:h.x,y:h.y,radius:85});}return;}
 // Every object is pulled, with tangential flow and collision-safe movement.
 for(const p of list){const d=dist(p,h);if(d<23)continue;const angle=Math.atan2(p.y-h.y,p.x-h.x),orbit={x:h.x+Math.cos(angle+.55)*Math.min(d*.42,70),y:h.y+Math.sin(angle+.55)*Math.min(d*.42,70)};moveSolid(a,p,orbit,Math.min(d-22,dt*(190+Math.min(230,d*.38))));if(p.type==='boomerang'){p.from.x=p.x;p.from.y=p.y;} }
 // Separate overlaps left by spawning/throwing before the attraction pass.
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const p=list[i],q=list[j],d=dist(p,q),min=radius(a,p)+radius(a,q)+1;if(d>=min)continue;const angle=d>.01?Math.atan2(q.y-p.y,q.x-p.x):i*2.4;const target={x:p.x-Math.cos(angle)*min,y:p.y-Math.sin(angle)*min};moveSolid(a,p,target,Math.min((min-d)/2+1,3),q);moveSolid(a,q,{x:q.x+Math.cos(angle)*min,y:q.y+Math.sin(angle)*min},Math.min((min-d)/2+1,3),p);}
 if(dist(g.body[0],h)<22&&!g.invincible)g.fail('토네이도에 휘말렸어요.');
}
export function gusts(a,dt){for(const p of solids(a)){if(!p.gust)continue;if(a.g.age>=p.gust.until){delete p.gust;continue;}const v=p.gust;moveSolid(a,p,{x:p.x+v.vx,y:p.y+v.vy},Math.hypot(v.vx,v.vy)*dt);v.vx*=Math.exp(-3*dt);v.vy*=Math.exp(-3*dt);}}
export function thrown(a,p){const g=a.g,f=p.thrown;if(!f)return;const t=Math.min(1,(g.age-f.born)/.8);p.x=f.from.x+(f.to.x-f.from.x)*t;p.y=f.from.y+(f.to.y-f.from.y)*t;p.lift=Math.sin(t*Math.PI)*75;if(t>=1){delete p.thrown;p.lift=0;p.born=g.age-.9;}}
function moveHand(a,hand,to,amount){const k=hand.king,r=a.g.enemyRadius(k)+16,d=dist(hand,k);if(d<r){const a=Math.atan2(hand.y-k.y,hand.x-k.x);hand.x=k.x+Math.cos(a)*r;hand.y=k.y+Math.sin(a)*r;}const angle=Math.atan2(to.y-hand.y,to.x-hand.x);for(const off of [0,.55,-.55,1.1,-1.1,1.65,-1.65,Math.PI]){const q={x:hand.x+Math.cos(angle+off)*amount,y:hand.y+Math.sin(angle+off)*amount};if(dist(q,k)<r&&dist(q,k)<=dist(hand,k))continue;hand.x=q.x;hand.y=q.y;return;}}
export function hands(a,dt){const g=a.g,age=g.age;
 for(const hand of [...a.hands]){const k=hand.king;if(!g.enemies.includes(k)){a.removeHand(hand);continue;}
  if(g.armed&&dist(g.blade(),hand)<24){a.removeHand(hand);g.consumeKnife();g.events.push({type:'defeat',...hand});continue;}
  const alive=p=>g.enemies.includes(p)||g.bombs.includes(p);let t=hand.target;
  if(t&&!alive(t)){hand.target=null;hand.state='return';t=null;}
  if(hand.state==='windup'&&t){const progress=Math.min(1,(age-hand.born)/.55),desired={x:hand.from.x-Math.cos(hand.angle)*23*progress,y:hand.from.y-Math.sin(hand.angle)*23*progress};moveHand(a,hand,desired,Math.min(dist(hand,desired),180*dt));t.x=hand.x;t.y=hand.y+24;
   if(age>=hand.until){t.held=false;t.thrown={from:{x:t.x,y:t.y},to:hand.aim,born:age};if(g.bombs.includes(t))t.armed=null;hand.state='return';hand.target=null;hand.until=age+2.4;g.events.push({type:'throw'});}continue;}
  if(hand.state==='reach'&&t){const desired=hand.side===-1?{x:t.x,y:t.y-24}:t;hand.angle=Math.atan2(t.y-hand.y,t.x-hand.x);moveHand(a,hand,desired,Math.min(dist(hand,desired),155*dt));
   if(dist(hand,desired)<(hand.side===-1?5:radius(a,t)+14)){if(hand.side===-1){t.held=true;hand.state='windup';hand.born=age;hand.until=age+.55;hand.from={x:hand.x,y:hand.y};hand.aim=g.randomAim();hand.angle=Math.atan2(hand.aim.y-hand.y,hand.aim.x-hand.x);}else{t.enhanced=true;hand.state='return';hand.pointUntil=age+.45;hand.target=null;hand.until=age+2.8;g.events.push({type:'enhance'});}}
   else if(age>=hand.reachUntil){hand.state='return';hand.target=null;hand.until=age+.8;}continue;}
  const home={x:Math.max(16,Math.min(g.width-16,k.x+hand.side*83)),y:Math.max(16,Math.min(g.height-16,k.y+Math.sin(age*1.4+hand.side)*15))};moveHand(a,hand,home,Math.min(dist(hand,home),130*dt));if(hand.state==='return'){if(dist(hand,home)<5)hand.state='idle';else continue;}
  if(age>=hand.until){let pool=g.enemies.filter(o=>(o.kind<6||o.kind===11)&&!o.held&&!o.thrown&&dist(o,k)<310);if(hand.side===-1)pool.push(...g.bombs.filter(b=>!b.held&&!b.thrown&&dist(b,k)<310));else{pool=pool.filter(e=>!e.enhanced);if(!pool.length)pool=g.bombs.filter(b=>!b.enhanced&&!b.held&&!b.thrown&&dist(b,k)<310);}
   pool.sort((p,q)=>{const priority=p.kind===11?1:0,other=q.kind===11?1:0;return priority-other||dist(p,hand)-dist(q,hand)});if(pool[0]){hand.target=pool[0];hand.state='reach';hand.reachUntil=age+3;}else hand.until=age+.7;}

 }
}
