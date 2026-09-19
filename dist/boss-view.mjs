const TAU=Math.PI*2;
const ring=(ctx,p,r,t,color)=>{ctx.lineWidth=2;ctx.strokeStyle='#ded9d9';ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,t));ctx.stroke();};
export function shockLift(g){const t=(g.age-(g.arena?.shockAt??-10))/.38;return t>0&&t<1?Math.sin(t*Math.PI)*11:0;}
export function comboPaper(g){return g?.arena?.celebration?'#f8e7f0':g?.activeCombo==='purple'?'#e2e3f6':g?.activeCombo==='orange'?'#fff9d9':'#f1eeee';}
export function comboInk(ctx,g,reduced){const palettes={blue:['#95dedd','#bac4ed','#e0bee5','#a4e2ee'],orange:['#dab442','#fff0a3','#edc356','#ffe5a0'],purple:['#797ec7','#88c9d1','#ad94d9','#7fadde'],red:['#d95236','#ef8e42','#f8be67','#e8703a']};const palette=palettes[g.activeCombo];if(!palette)return null;const h=g.body[0],t=reduced?0:g.age*.45,span=180+Math.min(160,g.goalLength*.25),dx=Math.cos(t)*35,dy=Math.sin(t*.7)*30,gradient=ctx.createLinearGradient(h.x-span/2+dx,h.y-span/2+dy,h.x+span/2+dx,h.y+span/2+dy);palette.forEach((c,i)=>gradient.addColorStop(i/(palette.length-1),c));return gradient;}
export function drawExpansion(ctx,g,emoji,reduced=false){
 const age=g.age,a=g.arena;if(!a)return;
 const icon=(i,x,y,size=30,alpha=1)=>emoji('expansion',i,x,y,alpha,size);
 const ellipse=(x,y,rx,ry,alpha=.13)=>{ctx.fillStyle=`rgba(31,29,45,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();};
 for(const e of g.enemies){if(e.kind===7){const scale=1-(e.lift||0)/550;ellipse(e.x,e.y+40,36*scale,12*scale,.2);const after=Math.max(0,1-(age-(e.landAt??-10))/.25);if(after>0){ctx.fillStyle=`rgba(255,255,255,${after*.7})`;ctx.beginPath();ctx.ellipse(e.x,e.y+40,108,42,0,0,TAU);ctx.fill();}}if(e.kind===8)ellipse(e.x,e.y+29,29,8,.12);if(e.kind===9)ellipse(e.x,e.y+33,30,8,.18);if(e.thrown)ellipse(e.x,e.y+10,13,4,.16);}

 for(const h of a.hazards){const t=age-h.born;if(t<0)continue;
  if(h.type==='cloud'){const fade=h.fired?Math.max(0,1-(age-h.until)/.8):Math.min(1,t/.6);ellipse(h.x,h.y,28,14,.19*fade);if(h.fired&&age-h.until<.16){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(h.x,h.y,28,14,0,0,TAU);ctx.fill();}}
  if(h.type==='laser'){ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);const beamColor=age-h.until<.08?'#fff':age-h.until<.23?'#ffe671':age-h.until<.4?'#7cdcca':'#83b4ee';ctx.fillStyle=h.fired?beamColor:'#f1aea8';ctx.shadowBlur=0;ctx.beginPath();ctx.arc(0,0,h.fired?15:9+Math.sin(t*9),0,TAU);ctx.fill();const extent=Math.hypot(g.width,g.height);if(!h.fired){ctx.shadowBlur=0;ctx.strokeStyle='#d96861';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);}else{ctx.strokeStyle=beamColor;ctx.lineWidth=Math.max(1,14*(1-(age-h.until)/.6));}ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(extent,0);ctx.stroke();ctx.restore();}
  if(h.type==='tornado'){const fade=Math.min(1,t/.3,Math.max(0,(h.until-age)/.25));ctx.save();ctx.translate(h.x,h.y);ctx.rotate(reduced?0:age*23);icon(8,0,0,67,fade);ctx.restore();}
 }
 for(const hand of a.hands){ellipse(hand.x,hand.y+15,12,4,.07);ctx.save();ctx.translate(hand.x,hand.y-shockLift(g));let image=13;if(hand.state==='windup'||hand.side===-1&&hand.state==='reach'){image=20;ctx.rotate(Math.PI/2);ctx.translate(0,2);}else if(hand.side===1&&(hand.state==='reach'||hand.pointUntil>age)){image=14;ctx.rotate((hand.angle||0)+Math.PI);}else if(hand.side===1)ctx.scale(-1,1);icon(image,0,0,32);ctx.restore();}

}
export function drawExpansionEnemy(ctx,g,e,emoji,reduced=false){
 const age=g.age,fade=Math.max(0,Math.min(1,age-e.born)),icon=(i,x,y,size=30)=>emoji('expansion',i,x,y,fade,size),hop=e===g.arena?.shockOwner?0:shockLift(g);
 if(e.kind===7){let sx=1,sy=1;if(age-(e.landAt??-10)<.7){const t=age-e.landAt,v=Math.exp(-t*7)*Math.cos(t*16);sx=1+v*.2;sy=1-v*.24;}const shake=e.state==='hammer-charge'&&!reduced?Math.sin(age*58)*1.2:0;
  ctx.save();ctx.translate(e.x+shake,e.y-(e.lift||0)-hop);ctx.scale(sx,sy);icon(0,0,16,68);icon(1,0,-7,80);ctx.restore();return true;}
 if(e.kind===8){if(e.state==='egg'){icon(9,e.x,e.y-hop,54);ring(ctx,{x:e.x,y:e.y-hop},32,Math.max(0,1-(e.until-age)/12),'#ad91c6');}else{ctx.save();if(age-(e.castAt??-99)<.16)ctx.filter='brightness(0) invert(1)';icon(5,e.x,e.y-hop-(reduced?6:6+Math.sin(age*2)*4),72);ctx.restore();}return true;}
 if(e.kind===9){icon(12,e.x,e.y+6-hop,62);icon(11,e.x,e.y-34-hop,41);return true;}
 if(e.kind===10){icon(17,e.x,e.y-hop,78);return true;}
 if(e.kind===11){icon(16,e.x,e.y-(e.lift||0)-hop,27);return true;}return false;
}
export function drawExpansionShot(ctx,g,p,emoji){if(!['hammer','ball'].includes(p.type))return false;if(p.type==='hammer'){const t=Math.min(1,(g.age-p.born)/p.duration);ctx.fillStyle='rgba(31,29,45,.13)';ctx.beginPath();ctx.ellipse(p.x,p.from.y+(p.to.y-p.from.y)*t,7,3,0,0,TAU);ctx.fill();}ctx.save();ctx.translate(p.x,p.y-shockLift(g));ctx.rotate(p.type==='hammer'?(g.age-p.born)*7:(g.age-p.born)*13);emoji('expansion',p.type==='hammer'?2:3,0,0,1,p.type==='ball'?28:27);ctx.restore();return true;}
export function drawEnhancement(ctx,g,e){if(!e.enhanced)return;for(let i=0;i<3;i++){const a=g.age*2+i*TAU/3;ctx.fillStyle='#ef6f63';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*17,e.y+Math.sin(a)*8,2,0,TAU);ctx.fill();}}

export function drawDynamite(ctx,g,emoji){for(const r of g.arena?.relics||[]){ctx.save();ctx.translate(r.x,r.y);if(r.carried)ctx.rotate(g.angle+Math.PI/4);emoji('expansion',18,0,0,1,29);ctx.restore();if(r.attached){ring(ctx,r,20,Math.max(0,1-(r.fuse-g.age)/2.4),'#e38c48');if(r.warnAt!==undefined){ctx.fillStyle=`rgba(226,83,47,${.08+.07*(Math.sin(g.age*30)+1)})`;ctx.beginPath();ctx.arc(r.x,r.y,150,0,TAU);ctx.fill();}}}}

export function drawClouds(ctx,g,emoji){const clouds=(g.arena?.hazards||[]).filter(h=>h.type==='cloud'&&g.age>=h.born);
 for(const h of clouds)if(h.fired&&g.age-h.until<.22){ctx.save();ctx.translate(h.x,h.y-27);ctx.scale(.38,1.6);emoji('expansion',7,0,0,Math.max(0,1-(g.age-h.until)/.22),42);ctx.restore();}
 for(const h of clouds){const fade=h.fired?Math.max(0,1-(g.age-h.until)/.8):Math.min(1,(g.age-h.born)/.4);emoji('expansion',6,h.x,h.y-62,fade,44);}
}
export function drawCakeAtmosphere(ctx,g){const a=g.arena,c=a?.cake;if(c&&!c.landed){const t=Math.min(1,(g.age-c.born)/.4),x=c.x,y=c.y+30;ctx.fillStyle=`rgba(28,23,37,${.17*t})`;ctx.fillRect(0,0,g.width,g.height);ctx.fillStyle=`rgba(255,249,228,${.18*t})`;ctx.fillRect(x-58,0,116,y);ctx.beginPath();ctx.ellipse(x,y,58,19,0,0,TAU);ctx.fill();}
 if(a?.celebration){const t=g.age-a.celebration.born,fade=Math.min(1,t/.3,(a.celebration.until-g.age)/.6),shift=Math.sin(t*.6)*g.width*.2,gradient=ctx.createLinearGradient(shift,0,g.width+shift,g.height);for(const [i,c] of ['rgba(246,173,213,.28)','rgba(213,204,252,.35)','rgba(255,227,242,.48)','rgba(211,239,240,.3)','rgba(249,173,217,.3)'].entries())gradient.addColorStop(i/4,c);ctx.save();ctx.globalAlpha=Math.max(0,fade);ctx.fillStyle=gradient;ctx.fillRect(0,0,g.width,g.height);ctx.restore();}
}
export function drawCake(ctx,g,emoji,reduced=false){const c=g.arena?.cake;if(!c)return;const duration=c.duration||8,t=Math.max(0,Math.min(1,(g.age-c.born)/duration)),height=Math.min(g.height*.65,460),y=c.y-(1-t)*height;
 ctx.fillStyle='rgba(31,29,45,.2)';ctx.beginPath();ctx.ellipse(c.x,c.y+30,49,19,0,0,TAU);ctx.fill();
 // Fixed world positions remain behind the descending cake, fading like a star trail.
 const tick=Math.floor((g.age-c.born)/.09);for(let i=0;i<(reduced?5:20);i++){const n=tick-i,born=n*.09;if(n<0||born>duration)continue;const life=(g.age-c.born-born)/1.7;if(life>=1)continue;const phase=Math.sin(n*12.9898)*43758.5453,seed=phase-Math.floor(phase),sx=c.x+(seed-.5)*104,sy=c.y-(1-born/duration)*height-44,size=1.6+seed*2;ctx.save();ctx.translate(sx,sy);ctx.globalAlpha=(1-life)*Math.min(1,life*12);ctx.fillStyle=n%3?'#fff5ce':'#f8cae7';ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2?size*.25:size;j?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();}
 emoji('expansion',19,c.x,y,Math.min(1,t*8),112);
}
