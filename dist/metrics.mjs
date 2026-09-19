function sourceSite(){try{return new URL(document.referrer).origin;}catch{return '';}}
// Optional same-origin collector. No third-party request, and no production tracking until enabled.
export class GameMetrics{
 constructor(){this.enabled=typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname);this.queue=Promise.resolve();this.id=null;this.active=0;this.elapsed=0;this.next=15;this.latest=null;if(this.enabled)this.send('visit',{pageId:crypto.randomUUID(),referrer:sourceSite()});if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{if(this.id&&this.latest)this.end(this.latest);});}
 send(action,data){if(!this.enabled)return;this.queue=this.queue.then(()=>fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true})).catch(()=>{});}
 start(){this.id=crypto.randomUUID();this.active=0;this.elapsed=0;this.next=15;this.send('play',{id:this.id});}
 tick(dt,visible,g){if(!this.id)return;this.elapsed+=dt;if(visible)this.active+=Math.min(dt,1);if(g)this.latest=g;if(this.elapsed>=this.next){this.next=this.elapsed+15;this.send('progress',{id:this.id,score:g?.score||0,seconds:g?.age||this.elapsed,active:this.active});}}
 end(g){if(!this.id)return;this.send('end',{id:this.id,score:g.score,seconds:g.age,active:this.active});this.id=null;this.latest=null;}
}
