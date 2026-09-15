import {SnakeGame} from './snake-engine.mjs';
// Twemoji © Twitter and contributors; CC BY 4.0. Unmodified local assets.
// https://github.com/jdecked/twemoji · https://creativecommons.org/licenses/by/4.0/
const dot=document.querySelector('.identity h1 > span');
const title=document.querySelector('.identity h1');
const subtitle=document.querySelector('.identity p');
const canvas=document.createElement('canvas');canvas.className='snake-canvas';canvas.setAttribute('aria-hidden','true');
const ctx=canvas.getContext('2d');
const hud=document.createElement('section');hud.className='snake-hud';hud.hidden=true;hud.setAttribute('aria-label','스네이크 게임');
hud.innerHTML='<span class="snake-score">음식 0</span><button type="button" data-action="pause">일시정지</button><button type="button" data-action="sound" aria-pressed="false">소리 켜짐</button><button type="button" data-action="exit">끝내기</button><small>방향키 · Space 일시정지 · Esc 끝내기</small>';
const panel=document.createElement('section');panel.className='snake-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','snake-message');
panel.innerHTML='<h2 id="snake-message"></h2><p></p><div><button type="button" data-action="retry">다시 하기</button><button type="button" data-action="exit">닫기</button></div>';
const live=document.createElement('div');live.className='snake-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
document.body.append(canvas,hud,panel,live);
let game=null,mode='idle',raf=0,last=0,muted=false,audio=null,assets=null,images={food:[],enemies:[]},particles=[],previousFocus=null,pending=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const directions={ArrowRight:0,ArrowDown:Math.PI/2,ArrowLeft:Math.PI,ArrowUp:-Math.PI/2};
const score=hud.querySelector('.snake-score');
const say=t=>{live.textContent=t;};
function pop(type='eat') {
  if(muted || !audio)return;
  try {
    if(audio.state==='suspended')audio.resume().catch(()=>{});
    const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='sine';const base=type==='fail'?240:type==='defeat'?520:660+Math.random()*90;
    osc.frequency.setValueAtTime(base,now);osc.frequency.exponentialRampToValueAtTime(base*.36,now+.095);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.032,now+.007);gain.gain.exponentialRampToValueAtTime(.0001,now+.15);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.17);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{/* Silent play remains available when audio is blocked. */}
}
function unlockAudio(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function loadAssets(){
  return assets ||= fetch('/emoji/manifest.json').then(r=>{if(!r.ok)throw Error('assets');return r.json();}).then(async manifest=>{
    await Promise.all(['food','enemies'].flatMap(type=>manifest[type].map((name,i)=>new Promise(resolve=>{
      const img=new Image();img.onload=()=>resolve();img.onerror=()=>resolve();img.src='/emoji/'+name+'.svg';images[type][i]=img;
    }))));
  }).catch(()=>{assets=null;});
}
// Measure the visible glyph ink, so the snake is born at the printed dot rather than its line box.
function ink(text,rect,element){
  const style=getComputedStyle(element),size=parseFloat(style.fontSize),temp=document.createElement('canvas');
  temp.width=Math.ceil(rect.width+size*2);temp.height=Math.ceil(size*3);
  const c=temp.getContext('2d');c.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;c.textBaseline='alphabetic';
  const m=c.measureText(text),ascent=m.fontBoundingBoxAscent??size*.8,descent=m.fontBoundingBoxDescent??size*.2;
  const baseline=rect.top+(rect.height-ascent-descent)/2+ascent;
  return {x:rect.left-m.actualBoundingBoxLeft,y:baseline-m.actualBoundingBoxAscent,w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
}
function glyphBoxes(element,node){
  const boxes=[];
  for(let i=0;i<node.textContent.length;i++){
    const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
    const box=ink(node.textContent[i],range.getBoundingClientRect(),element);if(box.w&&box.h)boxes.push(box);
  }
  return boxes;
}
function textBox(element,node){
  const range=document.createRange();range.selectNodeContents(node);return ink(node.textContent,range.getBoundingClientRect(),element);
}
function layout(){
  const d=textBox(title,dot);
  const obstacles=[...glyphBoxes(title,title.firstChild),...glyphBoxes(subtitle,subtitle.firstChild),...[...document.querySelectorAll('.card')].map(el=>{const b=el.getBoundingClientRect();return{x:b.left,y:b.top,w:b.width,h:b.height,radius:b.width*.21};})];
  const h=hud.getBoundingClientRect();obstacles.push({x:h.left,y:h.top,w:h.width,h:h.height,radius:12});
  return {width:innerWidth,height:innerHeight,origin:{x:d.x+d.w/2,y:d.y+d.h/2},obstacles};
}
function sizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
async function start(angle=0){
  if(pending)return;pending=true;if(mode==='idle')previousFocus=document.activeElement;unlockAudio();
  // Wait for the title font to establish the actual dot position.
  try{await document.fonts.ready;}catch{}
  if(!pending)return;
  hud.hidden=false;panel.hidden=true;sizeCanvas();
  const options=layout();
  if(options.origin.y<6 || options.origin.y>innerHeight-6){hud.hidden=true;pending=false;say('제목이 보이는 위치에서 시작해 주세요.');return;}
  game=new SnakeGame({...options,angle});particles=[];mode='playing';pending=false;
  document.body.classList.add('snake-playing');dot.style.visibility='hidden';canvas.hidden=false;
  score.textContent='음식 0';hud.querySelector('[data-action="pause"]').textContent='일시정지';
  say('스네이크 시작. 방향키로 이동, Space로 일시정지, Escape로 끝내기.');
  loadAssets();pop('start');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
}
function end(){pending=false;mode='idle';game=null;cancelAnimationFrame(raf);ctx.clearRect(0,0,innerWidth,innerHeight);hud.hidden=true;panel.hidden=true;canvas.hidden=true;dot.style.visibility='';document.body.classList.remove('snake-playing');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});say('게임을 끝냈어요.');}
function pause(){
  if(mode==='playing'){mode='paused';cancelAnimationFrame(raf);hud.querySelector('[data-action="pause"]').textContent='계속하기';say('일시정지');draw();}
  else if(mode==='paused'){mode='playing';hud.querySelector('[data-action="pause"]').textContent='일시정지';last=performance.now();raf=requestAnimationFrame(frame);say('계속합니다.');}
}
function failure(reason){
  mode='over';pop('fail');panel.hidden=false;panel.querySelector('h2').textContent='앗, 부딪혔다.';
  panel.querySelector('p').textContent=reason+' 음식 '+game.score+'개 · 표정 '+game.kills+'개';
  panel.querySelector('[data-action="retry"]').focus({preventScroll:true});say('게임 끝. 음식 '+game.score+'개. 다시 하거나 Escape로 닫을 수 있어요.');
}
function burst(p,color){if(reduced)return;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*34,vy:Math.sin(a)*34,life:.35,color});}}
function frame(now){
  if(mode!=='playing')return;
  const dt=Math.min((now-last)/1000,.045);last=now;game.step(dt);
  for(const e of game.events.splice(0)){
    if(e.type==='eat'){pop();score.textContent='음식 '+game.score;burst(e,'#bdb39d');}
    if(e.type==='defeat'){pop('defeat');burst(e,'#e4c361');}
    if(e.type==='enemy')say('표정 이모지가 나타났어요. 몸통으로 막으면 없앨 수 있어요.');
    if(e.type==='fail')failure(e.reason);
  }
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
  draw();if(mode==='playing')raf=requestAnimationFrame(frame);
}
function emoji(type,kind,x,y,alpha=1){
  const image=images[type][kind];ctx.globalAlpha=alpha;
  if(image?.complete && image.naturalWidth)ctx.drawImage(image,x-12,y-12,24,24);
  else {ctx.fillStyle=type==='food'?'#edb457':'#efcd54';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight);if(!game)return;
  ctx.strokeStyle='rgba(36,36,36,.12)';ctx.lineWidth=1;ctx.strokeRect(2.5,2.5,innerWidth-5,innerHeight-5);
  for(const p of game.food)emoji('food',p.kind,p.x,p.y);
  for(const e of game.enemies){const born=Math.min(1,(game.age-e.born));emoji('enemies',e.kind,e.x,e.y,.3+.7*born);if(born<1){ctx.strokeStyle='#cfb665';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,18,0,Math.PI*2*born);ctx.stroke();}}
  ctx.strokeStyle=mode==='over'?'#8e8585':'#242424';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();game.body.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const h=game.body[0];ctx.beginPath();ctx.arc(h.x,h.y,4,0,Math.PI*2);ctx.fill();
  if(game.age>.2){for(const s of [-1,1]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x+Math.cos(game.angle)*1.5+Math.sin(game.angle)*s*1.8,h.y+Math.sin(game.angle)*1.5-Math.cos(game.angle)*s*1.8,1,0,Math.PI*2);ctx.fill();}}
  for(const p of particles){ctx.globalAlpha=p.life/.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  if(mode==='paused'){ctx.fillStyle='rgba(241,238,238,.68)';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.font='14px Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle='#242424';ctx.fillText('잠깐 쉬는 중 · Space로 계속',innerWidth/2,innerHeight/2);}
}
function toggleSound(){muted=!muted;const b=hud.querySelector('[data-action="sound"]');b.textContent=muted?'소리 꺼짐':'소리 켜짐';b.setAttribute('aria-pressed',String(muted));if(!muted){unlockAudio();pop();}}
for(const el of [hud,panel])el.addEventListener('click',e=>{const action=e.target.closest('button')?.dataset.action;if(action==='exit')end();if(action==='retry')start();if(action==='pause')pause();if(action==='sound')toggleSound();});
window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(mode==='idle'){
    if(['ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.repeat && !e.target.closest('a,button')){e.preventDefault();start(directions[e.key]);}return;
  }
  if(e.key==='Escape'){e.preventDefault();end();return;}
  if(e.key===' ' && !e.target.closest('button')){e.preventDefault();pause();return;}
  if(e.key.toLowerCase()==='m'){toggleSound();return;}
  if(e.key in directions){e.preventDefault();if(mode==='playing')game.target=directions[e.key];}
});
window.addEventListener('blur',()=>{if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
window.addEventListener('resize',()=>{if(mode!=='idle')end();});
window.addEventListener('wheel',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('touchmove',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{if(mode!=='idle')end();},{passive:true});
document.addEventListener('click',e=>{if(mode==='playing'&&e.target.closest('a'))pause();});
canvas.hidden=true;
// Fetching only the small manifest/assets after activation keeps normal visits lightweight.
