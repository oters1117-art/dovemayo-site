import {PadMusicPlayer} from './music-pads.mjs?v=2';
import {RoutePlanner} from './route-client.mjs?v=1';
import {FoleySound} from './foley.mjs?v=6';
import {SnakeGame,headingFromKeys,cardObstacle,FOOD} from './snake-engine.mjs?v=18';
// Twemoji © Twitter and contributors; CC BY 4.0. Local assets; tooth contrast outline added.
// https://github.com/jdecked/twemoji · https://creativecommons.org/licenses/by/4.0/
const dot=document.querySelector('.identity h1 > span');
const title=document.querySelector('.identity h1');
const subtitle=document.querySelector('.identity p');
const canvas=document.createElement('canvas');canvas.className='snake-canvas';canvas.setAttribute('aria-hidden','true');
const ctx=canvas.getContext('2d');
const score=document.createElement('div');score.className='snake-score';score.hidden=true;score.setAttribute('aria-label','점수와 생존 시간');
const live=document.createElement('div');live.className='snake-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
const escapeKey=document.createElement('button');escapeKey.className='snake-escape';escapeKey.textContent='any key';escapeKey.hidden=true;escapeKey.setAttribute('aria-label','게임 종료하고 처음으로');escapeKey.addEventListener('click',()=>{if(performance.now()>=deathReadyAt)end();});
const rings=new Map();
document.body.append(canvas,score,live,escapeKey);
let game=null,mode='idle',raf=0,last=0,muted=false,assets=null,images={food:[],enemies:[],props:[],boss:[]},particles=[],previousFocus=null,pending=false;
let backgroundTimer=0,flashAnimation=null,textureAt=0,deathReadyAt=0;
const sound=new FoleySound();
const routes=new RoutePlanner();
const music=new PadMusicPlayer({onStop:()=>{if(mode==='playing')game?.musicPads.stop();},onEnded:()=>{
  if(mode!=='playing'||!game?.musicPads.active)return;
  const pads=game.musicPads;pads.track=1+(pads.track+Math.floor(game.random()*5))%6;music.play(pads.track);
}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const directions={ArrowRight:0,ArrowDown:Math.PI/2,ArrowLeft:Math.PI,ArrowUp:-Math.PI/2};
const held=new Set();
function steer(){if(mode==='playing'&&game)game.target=headingFromKeys(held,game.angle);}
const say=t=>{live.textContent=t;};
function pop(type='eat'){if(!muted)sound.play(type);}
function unlockAudio(){sound.unlock();}
function loadAssets(){
  return assets ||= fetch('/emoji/manifest.json?v=14').then(r=>{if(!r.ok)throw Error('assets');return r.json();}).then(async manifest=>{
    await Promise.all(['food','enemies','props','boss'].flatMap(type=>manifest[type].map((name,i)=>new Promise(resolve=>{
      const img=new Image();img.onload=()=>resolve();img.onerror=()=>resolve();img.src='/emoji/'+name+'.svg';images[type][i]=img;
    }))));
  }).catch(()=>{assets=null;});
}
// Measure the visible glyph ink, so the snake is born at the printed dot rather than its line box.
function ink(text,rect,element){
  const style=getComputedStyle(element),scale=parseFloat(document.querySelector('.page').style.getPropertyValue('--page-scale'))||1,size=parseFloat(style.fontSize)*scale,temp=document.createElement('canvas');
  temp.width=Math.ceil(rect.width+size*2);temp.height=Math.ceil(size*3);
  const c=temp.getContext('2d');c.font=style.fontWeight+' '+size+'px '+style.fontFamily;c.textBaseline='alphabetic';
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
  const d=textBox(title,dot),scale=parseFloat(document.querySelector('.page').style.getPropertyValue('--page-scale'))||1;
  const obstacles=[...glyphBoxes(title,title.firstChild),...glyphBoxes(subtitle,subtitle.firstChild),...[...document.querySelectorAll('.card')].map(el=>{const b=el.getBoundingClientRect();return cardObstacle(b,(parseFloat(getComputedStyle(el.parentElement).columnGap)||12)*scale,(parseFloat(getComputedStyle(el.parentElement).rowGap)||18)*scale);})];
  return {width:innerWidth,height:innerHeight,origin:{x:d.x+d.w/2,y:d.y+d.h/2},obstacles};
}
function updateScore(){if(game){const t=Math.floor(game.age);const text=game.score+'\n'+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');if(score.textContent!==text)score.textContent=text;}}
function positionScore(){
  if(score.hidden)return;const d=textBox(title,dot);score.style.left=Math.min(innerWidth-58,d.x+d.w+10)+'px';score.style.top=(d.y+d.h/2-30)+'px';
}
function sizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
async function start(angle=0){
  if(pending)return;pending=true;if(mode==='idle')previousFocus=document.activeElement;unlockAudio();
  // Wait for the title font to establish the actual dot position.
  try{await Promise.all([document.fonts.ready,sound.loadOne('page-soft')]);}catch{}
  if(!pending)return;
  score.hidden=false;sizeCanvas();
  const options=layout();
  if(options.origin.y<6 || options.origin.y>innerHeight-6){score.hidden=true;pending=false;say('제목이 보이는 위치에서 시작해 주세요.');return;}
  positionScore();
  game=new SnakeGame({...options,angle,musicVolume:music.volume,routePlanner:s=>routes.request(s)});particles=[];mode='playing';pending=false;
  document.body.classList.add('snake-playing');dot.style.visibility='hidden';canvas.hidden=false;
  updateScore();steer();
  say('스네이크 시작. 방향키로 이동, Escape로 끝내기.');
  loadAssets();pop('start');last=performance.now();cancelAnimationFrame(raf);clearInterval(backgroundTimer);backgroundTimer=setInterval(()=>{if(document.hidden&&mode==='playing')advance(performance.now());},100);raf=requestAnimationFrame(frame);
}
function positionEscape(){
  if(!game||escapeKey.hidden)return;
  const h=game.body[0];
  escapeKey.style.left=Math.max(8,Math.min(innerWidth-68,h.x+14))+'px';
  escapeKey.style.top=Math.max(8,Math.min(innerHeight-36,h.y-14))+'px';
}
function end(){
  routes.cancel();stopMusic();music.stop();clearInterval(backgroundTimer);pending=false;
  mode='idle';game=null;held.clear();cancelAnimationFrame(raf);
  flashAnimation?.cancel();flashAnimation=null;
  for(const [ring,animation] of rings){animation.cancel();ring.remove();}rings.clear();
  particles=[];score.hidden=true;score.textContent='';escapeKey.hidden=true;
  ctx.clearRect(0,0,innerWidth,innerHeight);canvas.hidden=true;
  dot.style.visibility='';document.body.classList.remove('snake-playing');
  say('');
}
function failure(){
  if(mode!=='playing')return;
  mode='dead';deathReadyAt=performance.now()+800;music.pause();pending=false;held.clear();routes.cancel();stopMusic();
  clearInterval(backgroundTimer);cancelAnimationFrame(raf);updateScore();
  for(const animation of rings.values())animation.pause();
  escapeKey.hidden=false;positionEscape();draw();
  pop('fail');say('게임 끝. 아무 키나 누르면 처음 화면으로 돌아갑니다.');
  flashBackground(reduced?'#e7b9b9':'#ef6767',700);
}
function burst(p,color){if(reduced||particles.length>=280)return;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*34,vy:Math.sin(a)*34,life:.35,color});}}
function advance(now){
  if(mode!=='playing')return;
  const dt=Math.max(0,(now-last)/1000);last=now;game.step(dt);updateScore();
  const events=game.events.splice(0);
  for(const e of events){
    if(e.type==='music-play')music.play(e.track);
    if(e.type==='music-stop')music.stop();
    if(e.type==='music-volume')music.setVolume(e.volume);
    if(e.type==='eat'){pop(e.kind===FOOD.GOLDEN_APPLE?'apple':e.kind===FOOD.BEER?'beer':e.kind===FOOD.CHILI?'chili':Object.values(FOOD).includes(e.kind)?'special':'eat');if(e.kind===FOOD.GOLDEN_APPLE)flashBackground(reduced?'#eee0b1':'#f5d873',900);updateScore();burst(e,'#bdb39d');}
    if(e.type==='penalty'){pop('penalty');flashBackground(reduced?'#d4c4df':'#9b74c5',1000);updateScore();burst(e,'#9e7cba');}
    if(e.type==='defeat'){if(!e.silent)pop('defeat');burst(e,'#e4c361');}
    if(e.type==='throw')pop(e.attack==='potion'?'potion':'throw');
    if(e.type==='tooth-shot')pop('tooth');
    if(e.type==='blue-shot')pop('blue');
    if(e.type==='shoe-land')pop('shoe');
    if(e.type==='impact'){if(!e.silent)pop('impact');burst(e,'#b88662');}
    if(e.type==='splash'){pop('splash');burst(e,'#56b886');}
    if(e.type==='blast'){pop('blast');explosion(e);}
    if(e.type==='enemy')say('적이 나타났어요.');
    if(e.type==='boss'){say('토마토 보스가 나타났어요. 칼을 찾아보세요.');pop('fail');}
    if(e.type==='knife')pop('special');
    if(e.type==='blade')pop('defeat');
    if(e.type==='boss-defeat'){explosion({...e,radius:95});pop('blast');}
    if(e.type==='nerd')pop('throw');
    if(e.type==='fail'){failure();return;}
  }
  updateMusic();
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
}
function frame(now){
  advance(now);if(mode!=='playing')return;draw();raf=requestAnimationFrame(frame);
}
function explosion(e){
  for(const [i,color] of ['#fff','#ffd44e','#f25448'].entries()){
    const ring=document.createElement('div');
    Object.assign(ring.style,{position:'fixed',left:e.x+'px',top:e.y+'px',width:'8px',height:'8px',border:'8px solid '+color,borderRadius:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:'21',boxSizing:'border-box'});
    document.body.append(ring);
    const size=(e.radius||72)*2*(1-i*.12);
    const animation=ring.animate([{width:'8px',height:'8px',borderWidth:'8px',opacity:1},{width:size+'px',height:size+'px',borderWidth:'.5px',opacity:0}],{duration:reduced?200:550,delay:i*28,easing:'cubic-bezier(.15,.65,.25,1)',fill:'both'});
    rings.set(ring,animation);animation.onfinish=()=>{rings.delete(ring);ring.remove();};
  }
}
function flashBackground(color,duration){
  flashAnimation?.cancel();flashAnimation=document.body.animate([{backgroundColor:'#f1eeee'},{backgroundColor:color,offset:.04},{backgroundColor:'#f1eeee'}],{duration,easing:'ease-out'});
}
function stopMusic(){sound.setUnderwater(false);}
function updateMusic(){sound.setUnderwater(mode==='playing'&&!muted&&game?.buffKind==='rainbow');}
function emoji(type,kind,x,y,alpha=1,size=24){
  const image=images[type][kind];ctx.globalAlpha=alpha;
  if(image?.complete && image.naturalWidth)ctx.drawImage(image,x-size/2,y-size/2,size,size);
  else {ctx.fillStyle=type==='food'?'#edb457':'#efcd54';ctx.beginPath();ctx.arc(x,y,size/3,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function disc(p,r,color,stroke){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function sparkle(x,y,alpha,size){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#e6b52e';ctx.shadowColor='#f7dc79';ctx.shadowBlur=3;
  ctx.beginPath();ctx.moveTo(x,y-size);ctx.quadraticCurveTo(x+.65,y-.65,x+size,y);ctx.quadraticCurveTo(x+.65,y+.65,x,y+size);ctx.quadraticCurveTo(x-.65,y+.65,x-size,y);ctx.quadraticCurveTo(x-.65,y-.65,x,y-size);ctx.fill();disc({x,y},.55,'#fff7cf');ctx.restore();
}
function drawHazards(){
  for(const p of game.puddles){ctx.globalAlpha=Math.min(1,p.until-game.age);disc(p,p.radius,'rgba(67,183,108,.19)','rgba(47,151,80,.32)');ctx.globalAlpha=1;}
  for(const b of game.bombs){
    const fuse=b.armed===null?0:Math.min(1,(game.age-b.armed)/.95);
    const shake=0;
    if(b.armed!==null)disc(b,72,'rgba(232,79,55,'+(.07+fuse*.12)+')','rgba(214,67,44,.5)');
    emoji('props',3,b.x+shake,b.y);
    if(fuse){ctx.save();ctx.filter='brightness(0) saturate(100%) invert(26%) sepia(88%) saturate(3200%) hue-rotate(344deg)';emoji('props',3,b.x+shake,b.y,fuse);ctx.restore();}
  }
}
function drawMusicPads(){
  const pads=game.musicPads;if(!pads)return;
  for(const p of pads.pads){
    const lit=p.kind==='play'?pads.active:game.age<p.flashUntil;
    const color=lit?(p.kind==='play'?'#6596dc':p.kind==='plus'?'#71ad5e':'#c97171'):'#686868';
    ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=p.kind==='play'?1.35:1.65;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.stroke();
    if(p.kind==='play'){
      ctx.font='19px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♪',pads.active?-4:0,1);
      if(pads.active){ctx.font='9px Arial';ctx.fillText(String(pads.track),5.5,1);}
    }else{
      ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-4,-2);ctx.lineTo(0,-6);ctx.lineTo(0,6);ctx.lineTo(-4,2);ctx.lineTo(-7,2);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(8,0);if(p.kind==='plus'){ctx.moveTo(5.5,-2.5);ctx.lineTo(5.5,2.5);}ctx.stroke();
    }
    ctx.restore();
  }
}
function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight);if(!game)return;
  drawMusicPads();
  drawHazards();
  for(const p of game.food){
    if(p.kind!==FOOD.GOLDEN_APPLE){emoji('food',p.kind,p.x,p.y);continue;}
    emoji('food',p.kind,p.x,p.y,1,24);
    if(reduced){sparkle(p.x-15,p.y-10,.7,3);sparkle(p.x+15,p.y+7,.6,2.4);}
    else{
      p.sparkles??=[];
      if(game.age>=(p.nextSparkle||0)){const a=Math.random()*Math.PI*2,r=15+Math.random()*5;p.sparkles.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,born:game.age,duration:.13+Math.random()*.14,size:2.5+Math.random()*1.6});p.nextSparkle=game.age+.06+Math.random()*.12;}
      p.sparkles=p.sparkles.filter(s=>game.age-s.born<s.duration);
      for(const s of p.sparkles){const t=(game.age-s.born)/s.duration;sparkle(s.x,s.y,Math.sin(t*Math.PI),s.size);}
    }
  }
  for(const e of game.enemies){
    const t=Math.min(1,game.age-e.born),fade=t*t*(3-2*t),shaking=e.kind===3&&e.state==='charge';
    const dx=shaking&&!reduced?Math.sin(game.age*65)*.8:0,dy=shaking&&!reduced?Math.cos(game.age*59)*.6:0;
    if(e.kind===6){emoji('boss',0,e.x,e.y,fade,84);emoji('boss',1,e.x-17,e.y-4,fade,34);emoji('boss',1,e.x+17,e.y-4,fade,34);emoji('boss',2,e.x,e.y+23,fade,44);}else emoji('enemies',e.kind,e.x+dx,e.y+dy,fade);
    if(e.kind===4)emoji('props',5,e.x-23,e.y+1,fade);
    if(e.kind===3 && (e.state==='charge'||e.state==='recover')){const red=e.state==='charge'?Math.min(1,(game.age-e.chargeAt)/.65):Math.max(0,(e.until-game.age)/2.4);emoji('props',4,e.x+dx,e.y+dy,fade*red);}
  }
  for(const p of game.projectiles){
    if(p.type==='blue'){disc(p,3.5,'#529eff','#d9eeff');continue;}
    const t=p.type==='tooth'?0:Math.min(1,(game.age-p.born)/p.duration);
    if(p.type==='shoe'||p.type==='potion'){const y=p.from.y+(p.to.y-p.from.y)*t;ctx.fillStyle='rgba(36,36,36,.12)';ctx.beginPath();ctx.ellipse(p.x,y,6,2.5,0,0,Math.PI*2);ctx.fill();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.type==='tooth'?Math.atan2(p.vy,p.vx)+Math.PI/2:p.type==='boomerang'?t*20:t*4);
    if(p.type==='tooth')emoji('boss',3,0,0,1,20);else emoji('props',p.type==='shoe'?0:p.type==='potion'?1:2,0,0);ctx.restore();
  }
  if(game.knife)emoji('boss',4,game.knife.x,game.knife.y,1,27);
  if(game.armed){const blade=game.blade();ctx.save();ctx.translate(blade.x,blade.y);ctx.rotate(game.angle+Math.PI*5/4);emoji('boss',4,0,0,1,30);ctx.restore();}
  const buff=mode==='dead'?null:game.buffKind;
  ctx.strokeStyle=buff==='red'?'#e74743':buff==='blue'?'#478de2':buff==='orange'?'#ec963a':buff==='purple'?'#9861bf':game.age<game.slowUntil?'#42aa70':'#242424';
  if(game.invincible&&buff!=='rainbow')ctx.strokeStyle=Math.sin(game.age*22)>0?'#b1aeb8':ctx.strokeStyle;
  if(buff==='rainbow'){const hue=game.age*(reduced?25:190),gradient=ctx.createLinearGradient(game.body[0].x-35,game.body[0].y-35,game.body[0].x+35,game.body[0].y+35);for(let i=0;i<=6;i++)gradient.addColorStop(i/6,'hsl('+((hue+i*60)%360)+' 85% 58%)');ctx.strokeStyle=gradient;}
  if(mode==='dead')ctx.strokeStyle='#929294';
  ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();game.body.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const h=game.body[0];ctx.beginPath();ctx.arc(h.x,h.y,4,0,Math.PI*2);ctx.fill();
  if(game.age>.2){for(const s of [-1,1]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x+Math.cos(game.angle)*1.5+Math.sin(game.angle)*s*1.8,h.y+Math.sin(game.angle)*1.5-Math.cos(game.angle)*s*1.8,1,0,Math.PI*2);ctx.fill();}}
  for(const p of particles){ctx.globalAlpha=p.life/.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function toggleSound(){muted=!muted;if(muted)stopMusic();else{unlockAudio();pop();updateMusic();}}
window.addEventListener('keydown',e=>{
  if(mode==='dead'){e.preventDefault();if(!e.repeat&&performance.now()>=deathReadyAt)end();return;}
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(mode==='idle'){
    if(['ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.repeat && !e.target.closest('a,button')){e.preventDefault();held.add(e.key);start(directions[e.key]);}return;
  }
  if(e.key==='Escape'){e.preventDefault();end();return;}
  if(e.key===' '){e.preventDefault();return;}
  if(e.key.toLowerCase()==='m'){toggleSound();return;}
  if(e.key in directions){e.preventDefault();if(mode==='playing'){held.add(e.key);steer();}}
});
window.addEventListener('keyup',e=>{if(e.key in directions){held.delete(e.key);steer();}});
window.addEventListener('blur',()=>{held.clear();steer();});
document.addEventListener('visibilitychange',()=>{held.clear();steer();if(mode==='playing'){advance(performance.now());if(!document.hidden){cancelAnimationFrame(raf);if(mode==='playing')raf=requestAnimationFrame(frame);}}});
window.addEventListener('resize',()=>{if(mode==='playing')end();else if(mode==='dead'){sizeCanvas();draw();positionEscape();}positionScore();});
window.addEventListener('wheel',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('touchmove',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{if(mode==='playing')end();positionScore();},{passive:true});

function fitPage(){const p=document.querySelector('.page');const scale=Math.min(1,(innerHeight-40)/p.offsetHeight);p.style.setProperty('--page-scale',Math.max(.1,scale));}
fitPage();document.fonts.ready.then(fitPage);window.addEventListener('resize',fitPage);
canvas.hidden=true;
// Fetching only the small manifest/assets after activation keeps normal visits lightweight.
