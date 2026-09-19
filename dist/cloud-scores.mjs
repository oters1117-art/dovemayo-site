// Public-domain melodies, original short MIDI-note arrangements for cloud lightning.
const arrange=(melody,beat,root)=>melody.map((note,i)=>({at:i*beat,notes:i%8===0?[note,root,root+7]:[note],duration:beat*.85}));
export const CLOUD_SCORES=[
 {name:'환희의 송가 · Beethoven',events:arrange([64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60,60],.29,48)},
 {name:'작은 별 · Mozart 변주곡 주제',events:arrange([60,60,67,67,69,69,67,67,65,65,64,64,62,62,60,60,67,67,65,65,64,64,62,62],.32,48)},
 {name:'그린슬리브스 · 전통곡',events:arrange([69,72,74,76,77,76,74,71,67,69,71,72,69,69,68,69,71,68,64,64,76,76,74,71,67,69,71,72,69,68,69,69],.3,45)}
];
export function spawnCloudScore(arena,owner){
 const g=arena.g,score=CLOUD_SCORES[Math.floor(g.random()*CLOUD_SCORES.length)],notes=score.events.flatMap(e=>e.notes.map(note=>({...e,note}))),cells=[];
 const spacing=54,margin=34;for(let y=75;y<g.height-margin;y+=spacing)for(let x=margin;x<g.width-margin;x+=spacing)cells.push({x,y});
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 // Shared drift preserves the spacing, including while clouds fade.
 const available=cells.filter(p=>!arena.hazards.some(h=>h.type==='cloud'&&Math.hypot(h.x-p.x,h.y-p.y)<spacing+16));
 for(let i=0;i<Math.min(notes.length,available.length);i++){const p=available[i],n=notes[i];arena.hazards.push({...p,baseX:p.x,type:'cloud',note:n.note,noteDuration:n.duration,born:g.age,until:g.age+1.25+n.at,owner});}
 owner.until=g.age+1.25+score.events.at(-1).at+1.2;
 g.events.push({type:'brain-cast',x:owner.x,y:owner.y,pattern:'cloud',song:score.name});
}
