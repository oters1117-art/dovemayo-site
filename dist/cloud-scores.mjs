// Short consonant chords; every note triggers its own moving lightning cloud.
const progression=chords=>chords.map((notes,i)=>({at:i*.16,notes,duration:.14}));
export const CLOUD_SCORES=[
 {name:'전기 화음 A',events:progression([[60,64,67],[62,65,69],[64,67,71],[65,69,72],[67,71,74],[65,69,72],[64,67,71],[62,65,69],[60,64,67],[64,67,72],[65,69,74],[67,72,76]])},
 {name:'전기 화음 B',events:progression([[57,60,64],[60,64,67],[62,65,69],[64,67,71],[65,69,72],[64,67,71],[62,65,69],[60,64,67],[57,60,64],[60,64,69],[62,65,71],[64,69,72]])},
 {name:'전기 화음 C',events:progression([[62,66,69],[64,67,71],[66,69,73],[67,71,74],[69,73,76],[67,71,74],[66,69,73],[64,67,71],[62,66,69],[66,69,74],[67,71,76],[69,74,78]])}
];
export function spawnCloudScore(arena,owner){
 const g=arena.g,score=CLOUD_SCORES[Math.floor(g.random()*CLOUD_SCORES.length)],notes=score.events.flatMap(e=>e.notes.map(note=>({...e,note}))),cells=[],spacing=60,margin=34;
 for(let y=76;y<g.height-margin;y+=spacing)for(let x=margin;x<g.width-margin;x+=spacing)if(!g.blocked({x,y},20))cells.push({x,y});
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 // Mix nearby pressure with map coverage, retaining at least one cloud-width spacing.
 const head=g.body[0],near=cells.filter(p=>Math.hypot(p.x-head.x,p.y-head.y)<260),far=cells.filter(p=>!near.includes(p));
 const ordered=[];while(near.length||far.length){if(near.length)ordered.push(near.pop());if(far.length)ordered.push(far.pop());}
 const available=ordered.filter(p=>!arena.hazards.some(h=>h.type==='cloud'&&Math.hypot(h.x-p.x,h.y-p.y)<spacing));
 for(let i=0;i<Math.min(notes.length,available.length);i++){const p=available[i],n=notes[i];arena.hazards.push({...p,type:'cloud',chase:Math.hypot(p.x-head.x,p.y-head.y)<260,note:n.note,noteDuration:n.duration,born:g.age,until:g.age+.7+n.at,owner});}
 owner.until=g.age+.7+score.events.at(-1).at+1.3;
 g.events.push({type:'brain-cast',x:owner.x,y:owner.y,pattern:'cloud'});
}
export function updateCloud(arena,h,dt){
 const g=arena.g,age=g.age,head=g.body[0],near=p=>((p.x-h.x)/31)**2+((p.y-h.y)/17)**2<1;
 if(!h.fired){const angle=h.chase?Math.atan2(head.y-h.y,head.x-h.x):0,step=(h.chase?95:9)*dt,p={x:h.x+Math.cos(angle)*step,y:h.y+Math.sin(angle)*step};
  if(p.x>30&&p.x<g.width-30&&p.y>66&&p.y<g.height-24&&!arena.hazards.some(c=>c!==h&&c.type==='cloud'&&Math.hypot(c.x-p.x,c.y-p.y)<54)){h.x=p.x;h.y=p.y;}
 }
 if(age>=h.until&&!h.fired){h.fired=true;g.events.push({type:'zap',note:h.note,duration:h.noteDuration});}
 if(!h.fired||age>h.until+.16)return;
 if(near(head)&&!g.invincible)g.fail('번개에 맞았어요.');
 for(const e of [...g.enemies])if(e!==h.owner&&g.enemyDiscs(e).some(d=>((d.x-h.x)/(28+d.r))**2+((d.y-h.y)/(14+d.r))**2<1)&&g.killEnemy(e,'lightning'))g.events.push({type:'firework',x:e.x,y:e.y});
 for(const p of [...g.food,...g.projectiles])if(!p.dead&&near(p)){p.dead=true;p.cancelSpill=true;g.events.push({type:'firework',x:p.x,y:p.y});}
 g.food=g.food.filter(p=>!p.dead);for(const b of [...g.bombs])if(near(b))g.explode(b);
}
