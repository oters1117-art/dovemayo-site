// Finale uses simulation timestamps; resetting or dying freezes/ends it normally.
export function spawnCake(a,debug=false){const g=a.g;if(a.cake||a.celebration)return false;if(a.cakeClaimed&&!debug)return false;const p=g.freePoint(65,35)||g.nearPoint(g.body[0],70,180);if(!p)return false;a.cake={...p,born:g.age,duration:8,nextSpawn:g.age};g.events.push({type:'cake-arrival',...p});return true;}
export function updateCake(a){const g=a.g,age=g.age,c=a.cake;
 if(c){const t=age-c.born;if(t<c.duration&&age>=c.nextSpawn){g.spawnEnemy();c.nextSpawn=age+.28;}
  if(t>=c.duration&&!c.landed){c.landed=true;g.events.push({type:'cake-land',x:c.x,y:c.y+30,radius:190});}
  if(c.landed&&Math.hypot(g.body[0].x-c.x,g.body[0].y-c.y)<34){const targets=[...g.enemies.filter(e=>e.kind<6||e.kind===11),...g.food,...g.projectiles,...g.bombs];a.celebration={until:age+3.8,queue:targets.map((target,i)=>({target,at:age+.15+i*3.2/Math.max(1,targets.length)}))};g.graceUntil=Math.max(g.graceUntil,age+4.6);g.events.push({type:'celebration',x:c.x,y:c.y});a.cake=null;a.cakeClaimed=true;}
 }
 const finale=a.celebration;if(!finale)return;
 for(const item of finale.queue){if(item.done||age<item.at)continue;item.done=true;const p=item.target;const scored=g.enemies.includes(p)||g.food.includes(p);let removed=false;if(g.enemies.includes(p))removed=g.killEnemy(p,'tooth');else for(const list of [g.food,g.projectiles,g.bombs]){const i=list.indexOf(p);if(i>=0){list.splice(i,1);removed=true;break;}}if(removed){if(scored){g.score++;g.goalLength+=24;}g.events.push({type:'cake-star',x:p.x,y:p.y});}}
 if(age>=finale.until){a.celebration=null;g.nextRefill=age;g.nextEnemy=age+2;g.events.push({type:'cake-resume'});}
}
