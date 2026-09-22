export const cakeFootprint=(p,c,margin=0)=>((p.x-c.x)/(49+margin))**2+((p.y-c.y-30)/(19+margin))**2<1;
const finaleLists=a=>[a.g.food,a.g.projectiles,a.g.bombs,a.g.puddles,a.g.knives,a.relics,a.hazards];
const finaleTargets=a=>[...a.g.enemies.filter(e=>e.kind<6||e.kind===11||e.kind===12),...finaleLists(a).flat().filter(p=>!p.carried)];
function clearFinaleTarget(a,p){const g=a.g,scored=g.enemies.includes(p)||g.food.includes(p);let removed=false;if(g.enemies.includes(p))removed=g.killEnemy(p,'celebration');else for(const list of finaleLists(a)){const i=list.indexOf(p);if(i>=0){list.splice(i,1);removed=true;break;}}if(removed){if(scored){g.score++;g.goalLength+=24;}if(p.type==='tornado')g.attraction=null;g.events.push({type:'cake-star',x:p.x,y:p.y});}}
// Finale uses simulation timestamps; resetting or dying freezes/ends it normally.
export function spawnCake(a,debug=false){const g=a.g;if(a.cake||a.celebration)return false;if(a.cakeClaimed&&!debug)return false;const p=g.freePoint(65,35)||g.nearPoint(g.body[0],70,180);if(!p)return false;a.cake={...p,born:g.age,duration:8,nextSpawn:g.age};g.events.push({type:'cake-arrival',...p});return true;}
export function updateCake(a){const g=a.g,age=g.age,c=a.cake;
 if(c){const t=age-c.born;if(t<c.duration&&age>=c.nextSpawn){g.spawnEnemy();c.nextSpawn=age+.28;}
  if(t>=c.duration&&!c.landed){c.landed=true;c.landAt=age;c.collectAt=age+.4;g.events.push({type:'cake-land',x:c.x,y:c.y+30,radius:190});
   for(const e of [...g.enemies])if(g.enemyDiscs(e).some(d=>cakeFootprint(d,c,d.r)))g.killEnemy(e,'cake');
   for(const p of [...g.food,...g.projectiles])if(cakeFootprint(p,c,9)){g.breakObject(p,p.type||'food');p.dead=true;p.cancelSpill=true;}g.food=g.food.filter(p=>!p.dead);g.finalizeShots();
   for(const b of [...g.bombs])if(cakeFootprint(b,c,10))g.explode(b);
   for(const list of [a.relics,a.hazards,g.puddles])for(let i=list.length-1;i>=0;i--)if(!list[i].carried&&cakeFootprint(list[i],c,10)){g.breakObject(list[i],list[i].type||'object');list.splice(i,1);}
   for(const k of [...g.knives])if(cakeFootprint(k,c,10)){g.breakObject(k,'knife');g.removeKnife(k);g.nextKnife=age+3;}
   if(g.body.some(p=>cakeFootprint(p,c,4)))g.fail('케이크에 깔렸어요.');
   if(g.dead)return;
  }
  if(c.landed&&age>=(c.collectAt||0)&&cakeFootprint(g.body[0],c,12)){const targets=finaleTargets(a);a.celebration={born:age,until:age+3.8,seen:new Set(targets),queue:targets.map((target,i)=>({target,at:age+.15+i*3.2/Math.max(1,targets.length)}))};g.graceUntil=Math.max(g.graceUntil,age+4.6);g.events.push({type:'celebration',x:c.x,y:c.y});a.cake=null;a.cakeClaimed=true;g.cakesEaten=(g.cakesEaten||0)+1;}
 }
 const finale=a.celebration;if(!finale)return;
 // Bombers and airborne shots can create new objects after the initial snapshot.
 finale.seen??=new Set(finale.queue.map(i=>i.target));
 for(const p of finaleTargets(a))if(!finale.seen.has(p)){finale.seen.add(p);finale.queue.push({target:p,at:Math.min(finale.until,age+.12)});}
 for(const item of finale.queue){if(item.done||age<item.at)continue;item.done=true;clearFinaleTarget(a,item.target);}
 if(age>=finale.until){for(const p of finaleTargets(a))clearFinaleTarget(a,p);a.celebration=null;a.beginNextRound(finale.born);g.nextRefill=age;g.nextEnemy=age+2;g.events.push({type:'cake-resume'});}

}
