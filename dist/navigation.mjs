// One-shot navigation. Every edge is swept, including diagonals and shortcuts.
export function planRoute(start,goal,blocked,width,height){
 const clear=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(d/2));for(let i=1;i<=n;i++)if(blocked({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;};
 if(blocked(goal))return null;if(clear(start,goal))return [{...goal}];
 const cell=8,cols=Math.ceil(width/cell),rows=Math.ceil(height/cell),heap=[],best=new Map(),seen=new Set(),cache=new Map();
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const n=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return n;};
 const h=p=>Math.hypot(p.x-goal.x,p.y-goal.y);
 const first={...start,key:-1,g:0,f:h(start),parent:null};push(first);best.set(-1,0);
 let visits=0;
 while(heap.length&&visits++<50000){
  const n=pop();if(seen.has(n.key))continue;seen.add(n.key);
  if(h(n)<=cell*2&&clear(n,goal)){
   const path=[{...goal}];for(let a=n;a.parent;a=a.parent)path.push({x:a.x,y:a.y});path.reverse();
   const route=[];let anchor=start,i=0;while(i<path.length){let j=path.length-1;while(j>i&&!clear(anchor,path[j]))j--;route.push(path[j]);anchor=path[j];i=j+1;}return route;
  }
  const cx=Math.round(n.x/cell),cy=Math.round(n.y/cell);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy&&n.key!==-1)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=cols||y>=rows)continue;
   const key=y*cols+x;if(seen.has(key))continue;const p={x:x*cell,y:y*cell};
   if(!cache.has(key))cache.set(key,blocked(p));if(cache.get(key)||!clear(n,p))continue;
   const g=n.g+Math.hypot(p.x-n.x,p.y-n.y);if(g>=(best.get(key)??Infinity))continue;best.set(key,g);push({...p,key,g,f:g+h(p),parent:n});
  }
 }return null;
}
