import {planRoute} from './navigation.mjs?v=1';
// Immutable route snapshot with spatial buckets: query only nearby circles.
export function planSnapshotRoute(s){
 const size=64,cols=Math.ceil(s.width/size),rows=Math.ceil(s.height/size),buckets=new Map();
 for(const c of s.circles){for(let y=Math.max(0,Math.floor((c.y-c.r)/size));y<=Math.min(rows-1,Math.floor((c.y+c.r)/size));y++)for(let x=Math.max(0,Math.floor((c.x-c.r)/size));x<=Math.min(cols-1,Math.floor((c.x+c.r)/size));x++){const key=y*cols+x;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(c);}}
 const blocked=p=>{
  if(p.x<12||p.y<12||p.x>s.width-12||p.y>s.height-12)return true;
  for(const b of s.obstacles){const c=Math.min(b.radius||0,b.w/2,b.h/2),x=Math.max(Math.abs(p.x-b.x-b.w/2)-(b.w/2-c),0),y=Math.max(Math.abs(p.y-b.y-b.h/2)-(b.h/2-c),0);if(x*x+y*y<(c+10)**2)return true;}
  for(const c of buckets.get(Math.floor(p.y/size)*cols+Math.floor(p.x/size))||[]){const dx=p.x-c.x,dy=p.y-c.y;if(dx*dx+dy*dy<c.r*c.r)return true;}
  return false;
 };
 return planRoute(s.start,s.goal,blocked,s.width,s.height);
}
