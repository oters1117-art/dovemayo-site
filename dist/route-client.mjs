export class RoutePlanner{
 constructor(){this.worker=null;this.pending=new Map();this.nextId=0;}
 request(snapshot){
  if(this.pending.size>=4)return Promise.resolve(null);
  try{
   if(!this.worker){this.worker=new Worker(new URL('./route-worker.mjs?v=1',import.meta.url),{type:'module'});this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);p.resolve(data.route);};this.worker.onerror=()=>this.cancel();}
   return new Promise(resolve=>{const id=++this.nextId,timer=setTimeout(()=>this.cancel(),4000);this.pending.set(id,{resolve,timer});this.worker.postMessage({id,snapshot});});
  }catch{this.cancel();return Promise.resolve(null);}
 }
 cancel(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.resolve(null);}this.pending.clear();}
}
