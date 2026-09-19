// Canvas-only boss presentation; all animation is driven by game.age and freezes on death.
const TAU=Math.PI*2;
export function drawExpansion(ctx,g,emoji,reduced=false){
 const age=g.age,a=g.arena;if(!a)return;
 const icon=(i,x,y,size=30,alpha=1)=>emoji('expansion',i,x,y,alpha,size);
 const ellipse=(x,y,rx,ry,alpha=.13)=>{ctx.fillStyle=`rgba(31,29,45,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();};
 const gauge=(p,r,t,color)=>{ctx.strokeStyle='#ded9d9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,t));ctx.stroke();};
 for(const e of g.enemies){if(e.kind===7&&['jump-warn','jump'].includes(e.state)){const t=e.state==='jump'?1:Math.min(1,1-(e.until-age)/.9);ellipse(e.aim.x,e.aim.y,48+t*36,15+t*11,.1+t*.16);}if(e.kind===8)ellipse(e.x,e.y+29,29,8,.12);}
 for(const h of a.hazards){const t=age-h.born;if(t<0)continue;
  if(h.type==='cloud'){const fade=h.fired?Math.max(0,1-(age-h.until)/.65):Math.min(1,t/.7),offset=h.fired?-(age-h.until)*12:Math.max(0,1-t/.8)*-27;ellipse(h.x,h.y+15,25,8,.12*fade);icon(6,h.x+offset,h.y-20,54,fade);if(h.fired&&age-h.until<.24)icon(7,h.x,h.y,49,Math.max(0,1-(age-h.until)/.24));}
  if(h.type==='laser'){ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);const extent=Math.hypot(g.width,g.height);if(!h.fired){ctx.strokeStyle='#db7774';ctx.lineWidth=1.5;ctx.setLineDash([5,6]);}else{ctx.strokeStyle=age-h.until<.08?'#fff':age-h.until<.2?'#ffda60':'#e66c52';ctx.lineWidth=Math.max(1,20*(1-(age-h.until)/.5));ctx.globalAlpha=Math.max(0,1-(age-h.until)/.5);}ctx.beginPath();ctx.moveTo(-extent,0);ctx.lineTo(extent,0);ctx.stroke();ctx.restore();}
  if(h.type==='tornado'){ellipse(h.x,h.y+18,26,7);ctx.save();ctx.translate(h.x,h.y);ctx.rotate(reduced?0:age*17);icon(8,0,0,62,Math.min(1,t/.5,(h.until-age)/.5));ctx.restore();}
 }
 for(const hand of a.hands){ellipse(hand.x,hand.y+14,13,4,.08);ctx.save();ctx.translate(hand.x,hand.y);if(hand.state==='windup')ctx.rotate(Math.sin((age-hand.born)*5)*.2);icon(hand.state==='windup'?13:hand.pointUntil>age?15:13,0,0,32);ctx.restore();}
 for(const r of a.relics){icon(18,r.x,r.y,27);if(r.attached){gauge(r,20,1-(r.fuse-age)/2.8,'#e38c48');const n=reduced?0:Math.sin(age*20)*2;icon(7,r.x+8,r.y-16+n,12);}}
 if(a.cake){const p=a.cake,t=Math.max(0,Math.min(1,(age-p.born)/1.7));ellipse(p.x,p.y+30,48*t,13*t,.1+t*.1);const y=p.y-(1-t)**2*200;icon(19,p.x,y,112,Math.min(1,t*3));for(let i=0;i<9;i++){const angle=i*TAU/9+age*.3,r=62+Math.sin(age*3+i)*4;ctx.globalAlpha=(Math.sin(age*5+i*3)+1)/2;ctx.fillStyle=i%2?'#fff':'#e7bc52';ctx.fillRect(p.x+Math.cos(angle)*r-1,y+Math.sin(angle)*r-1,3,3);}ctx.globalAlpha=1;}
}
export function drawExpansionEnemy(ctx,g,e,emoji,reduced=false){
 const age=g.age,fade=Math.max(0,Math.min(1,age-e.born)),icon=(i,x,y,size=30)=>emoji('expansion',i,x,y,fade,size);
 if(e.kind===7){let sx=1,sy=1;if(e.state==='land'){const t=age-e.landAt,v=Math.exp(-t*7)*Math.cos(t*16);sx=1+v*.19;sy=1-v*.24;}const shake=e.state==='hammer-charge'&&!reduced?Math.sin(age*58)*1.2:0;
  ctx.save();ctx.translate(e.x+shake,e.y-(e.lift||0));ctx.scale(sx,sy);icon(0,0,17,74);icon(1,0,-8,66);ctx.restore();return true;}
 if(e.kind===8){if(e.state==='egg'){icon(9,e.x,e.y,54);ctx.strokeStyle='#c7b8d8';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,e.y,32,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,(age-e.eggAt)/9));ctx.stroke();}else icon(5,e.x,e.y-(reduced?6:6+Math.sin(age*2)*4),72);return true;}
 if(e.kind===9){icon(12,e.x,e.y+6,62);icon(11,e.x,e.y-30,55);return true;}
 if(e.kind===10){icon(17,e.x,e.y,78);return true;}
 if(e.kind===11){icon(16,e.x,e.y,27);return true;}return false;
}
export function drawExpansionShot(ctx,g,p,emoji){if(!['hammer','ball'].includes(p.type))return false;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.type==='hammer'?(g.age-p.born)*7:(g.age-p.born)*4);emoji('expansion',p.type==='hammer'?2:3,0,0,1,p.type==='ball'?28:27);ctx.restore();return true;}
export function drawEnhancement(ctx,g,e){if(!e.enhanced)return;for(let i=0;i<3;i++){const a=g.age*2+i*TAU/3;ctx.fillStyle='#a8e8fa';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*17,e.y+Math.sin(a)*8,2,0,TAU);ctx.fill();}}
