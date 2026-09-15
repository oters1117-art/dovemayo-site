import {SnakeGame,headingFromKeys} from './snake-engine.mjs?v=2';
// Twemoji © Twitter and contributors; CC BY 4.0. Unmodified local assets.
// https://github.com/jdecked/twemoji · https://creativecommons.org/licenses/by/4.0/
const dot=document.querySelector('.identity h1 > span');
const title=document.querySelector('.identity h1');
const subtitle=document.querySelector('.identity p');
const canvas=document.createElement('canvas');canvas.className='snake-canvas';canvas.setAttribute('aria-hidden','true');
const ctx=canvas.getContext('2d');
const score=document.createElement('div');score.className='snake-score';score.hidden=true;score.setAttribute('aria-label','점수');
const live=document.createElement('div');live.className='snake-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
document.body.append(canvas,score,live);
let game=null,mode='idle',raf=0,last=0,muted=false,audio=null,assets=null,images={food:[],enemies:[]},particles=[],previousFocus=null,pending=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const directions={ArrowRight:0,ArrowDown:Math.PI/2,ArrowLeft:Math.PI,ArrowUp:-Math.PI/2};
const held=new Set();
function steer(){if(game)game.target=headingFromKeys(held,game.angle);}
const say=t=>{live.textContent=t;};
function pop(type='eat') {
  if(muted || !audio)return;
  try {
    if(audio.state==='suspended')audio.resume().catch(()=>{});
    const now=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);
    if(type==='defeat'){
      const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.16),audio.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.75;filter.frequency.setValueAtTime(5200,now);filter.frequency.exponentialRampToValueAtTime(1400,now+.14);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.22,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.15);
      source.connect(filter);filter.connect(gain);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
    }
    const osc=audio.createOscillator(),death=type==='fail',duration=death?.65:.17;
    osc.type='sine';const base=death?135:660+Math.random()*90;
    osc.frequency.setValueAtTime(base,now);osc.frequency.exponentialRampToValueAtTime(death?42:base*.36,now+(death?.5:.095));
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(death?.24:.105,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{}
}
function unlockAudio(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function loadAssets(){
  return assets ||= fetch('/emoji/manifest.json?v=2').then(r=>{if(!r.ok)throw Error('assets');return r.json();}).then(async manifest=>{
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
  return {width:innerWidth,height:innerHeight,origin:{x:d.x+d.w/2,y:d.y+d.h/2},obstacles};
}
function sizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
async function start(angle=0){
  if(pending)return;pending=true;if(mode==='idle')previousFocus=document.activeElement;unlockAudio();
  // Wait for the title font to establish the actual dot position.
  try{await document.fonts.ready;}catch{}
  if(!pending)return;
  score.hidden=false;sizeCanvas();
  const options=layout();
  if(options.origin.y<6 || options.origin.y>innerHeight-6){score.hidden=true;pending=false;say('제목이 보이는 위치에서 시작해 주세요.');return;}
  game=new SnakeGame({...options,angle});particles=[];mode='playing';pending=false;
  document.body.classList.add('snake-playing');dot.style.visibility='hidden';canvas.hidden=false;
  score.textContent='0';steer();
  say('스네이크 시작. 방향키로 이동, Space로 일시정지, Escape로 끝내기.');
  loadAssets();pop('start');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
}
function end(){pending=false;mode='idle';game=null;held.clear();cancelAnimationFrame(raf);ctx.clearRect(0,0,innerWidth,innerHeight);score.hidden=true;canvas.hidden=true;dot.style.visibility='';document.body.classList.remove('snake-playing');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
function pause(){
  held.clear();if(game)game.target=game.angle;
  if(mode==='playing'){mode='paused';cancelAnimationFrame(raf);say('일시정지');}
  else if(mode==='paused'){mode='playing';last=performance.now();raf=requestAnimationFrame(frame);say('계속합니다.');}
}
function failure(){
  pop('fail');end();say('게임 끝.');
  document.body.animate([{backgroundColor:'#f1eeee'},{backgroundColor:reduced?'#e7b9b9':'#ef6767',offset:.04},{backgroundColor:'#f1eeee'}],{duration:700,easing:'ease-out'});
}
function burst(p,color){if(reduced)return;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*34,vy:Math.sin(a)*34,life:.35,color});}}
function frame(now){
  if(mode!=='playing')return;
  const dt=Math.min((now-last)/1000,.045);last=now;game.step(dt);
  for(const e of game.events.splice(0)){
    if(e.type==='eat'){pop();score.textContent=String(game.score);burst(e,'#bdb39d');}
    if(e.type==='defeat'){pop('defeat');burst(e,'#e4c361');}
    if(e.type==='enemy')say('표정 이모지가 나타났어요. 몸통으로 막으면 없앨 수 있어요.');
    if(e.type==='fail'){failure();return;}
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
  for(const p of game.food)emoji('food',p.kind,p.x,p.y);
  for(const e of game.enemies){const t=Math.min(1,game.age-e.born);emoji('enemies',0,e.x,e.y,t*t*(3-2*t));}
  ctx.strokeStyle=mode==='over'?'#8e8585':'#242424';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();game.body.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const h=game.body[0];ctx.beginPath();ctx.arc(h.x,h.y,4,0,Math.PI*2);ctx.fill();
  if(game.age>.2){for(const s of [-1,1]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x+Math.cos(game.angle)*1.5+Math.sin(game.angle)*s*1.8,h.y+Math.sin(game.angle)*1.5-Math.cos(game.angle)*s*1.8,1,0,Math.PI*2);ctx.fill();}}
  for(const p of particles){ctx.globalAlpha=p.life/.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function toggleSound(){muted=!muted;if(!muted){unlockAudio();pop();}}
window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(mode==='idle'){
    if(['ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.repeat && !e.target.closest('a,button')){e.preventDefault();held.add(e.key);start(directions[e.key]);}return;
  }
  if(e.key==='Escape'){e.preventDefault();end();return;}
  if(e.key===' ' && !e.target.closest('button')){e.preventDefault();pause();return;}
  if(e.key.toLowerCase()==='m'){toggleSound();return;}
  if(e.key in directions){e.preventDefault();if(mode==='playing'){held.add(e.key);steer();}}
});
window.addEventListener('keyup',e=>{if(e.key in directions){held.delete(e.key);steer();}});
window.addEventListener('blur',()=>{if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
window.addEventListener('resize',()=>{if(mode!=='idle')end();});
window.addEventListener('wheel',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('touchmove',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{if(mode!=='idle')end();},{passive:true});
document.addEventListener('click',e=>{if(mode==='playing'&&e.target.closest('a'))pause();});
canvas.hidden=true;
// Fetching only the small manifest/assets after activation keeps normal visits lightweight.
