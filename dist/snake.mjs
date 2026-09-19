import {drawDynamite,drawExpansion,drawExpansionEnemy,drawExpansionShot,drawEnhancement,shockLift,comboPaper,comboInk} from './boss-view.mjs?v=1';
import {GameMetrics} from './metrics.mjs?v=1';
import {TouchSteering} from './touch-steering.mjs?v=2';
import {PadMusicPlayer} from './music-pads.mjs?v=5';
import {RoutePlanner} from './route-client.mjs?v=1';
import {FoleySound} from './foley.mjs?v=8';
import {SnakeGame,headingFromKeys,cardObstacle,FOOD} from './snake-engine.mjs?v=25';
// Twemoji © Twitter and contributors; CC BY 4.0. Local assets; tooth contrast outline added.
// https://github.com/jdecked/twemoji · https://creativecommons.org/licenses/by/4.0/
const dot=document.querySelector('.identity h1 > span');
const title=document.querySelector('.identity h1');
const subtitle=document.querySelector('.identity p');
const canvas=document.createElement('canvas');canvas.className='snake-canvas';canvas.setAttribute('aria-hidden','true');
const touchSurface=document.createElement('div');touchSurface.className='snake-touch';touchSurface.hidden=true;touchSurface.setAttribute('aria-hidden','true');
const stick=new TouchSteering();
const ctx=canvas.getContext('2d');
const score=document.createElement('div');score.className='snake-score';score.hidden=true;score.setAttribute('aria-label','점수와 생존 시간');
const live=document.createElement('div');live.className='snake-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
const escapeKey=document.createElement('button');escapeKey.className='snake-escape';escapeKey.textContent='enter';escapeKey.hidden=true;escapeKey.setAttribute('aria-label','게임 종료하고 처음으로');escapeKey.addEventListener('click',()=>{if(performance.now()>=deathReadyAt)end();});
const rings=new Map();
document.body.append(touchSurface,canvas,score,live,escapeKey);
let game=null,mode='idle',raf=0,last=0,muted=false,assets=null,images={food:[],enemies:[],props:[],boss:[],expansion:[]},particles=[],previousFocus=null,pending=false;
let backgroundTimer=0,flashAnimation=null,textureAt=0,deathReadyAt=0;
const sound=new FoleySound();
const metrics=new GameMetrics();
const routes=new RoutePlanner();
const music=new PadMusicPlayer({onStop:()=>{if(mode==='playing')game?.musicPads.stop();},onEnded:()=>{
  if(mode!=='playing'||!game?.musicPads.active)return;
  const pads=game.musicPads;pads.track=1+(pads.track+Math.floor(game.random()*5))%6;music.play(pads.track);
}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const directions={ArrowRight:0,ArrowDown:Math.PI/2,ArrowLeft:Math.PI,ArrowUp:-Math.PI/2};
const held=new Set();
function steer(){if(mode==='playing'&&game&&game.buffKind!=='purple')game.target=headingFromKeys(held,game.angle);}
const say=t=>{live.textContent=t;};
function pop(type='eat'){if(!muted)sound.play(type);}
function unlockAudio(){sound.unlock();}
function loadAssets(){
  return assets ||= fetch('/emoji/manifest.json?v=14').then(r=>{if(!r.ok)throw Error('assets');return r.json();}).then(async manifest=>{
    await Promise.all(['food','enemies','props','boss','expansion'].flatMap(type=>manifest[type].map((name,i)=>new Promise(resolve=>{
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
    const rect=range.getBoundingClientRect(),letter=node.textContent[i],box=ink(letter,rect,element);if(box.w&&box.h){box.parts=glyphParts(letter,box,element);boxes.push(box);}
  }
  return boxes;
}
function glyphParts(letter,box,element){
  const style=getComputedStyle(element),scale=parseFloat(document.querySelector('.page').style.getPropertyValue('--page-scale'))||1,size=parseFloat(style.fontSize)*scale;
  const c=document.createElement('canvas');c.width=Math.ceil(size*2+8);c.height=Math.ceil(size*2+8);const x=c.getContext('2d');x.font=style.fontWeight+' '+size+'px '+style.fontFamily;x.textBaseline='alphabetic';const m=x.measureText(letter),ox=3+m.actualBoundingBoxLeft,oy=3+m.actualBoundingBoxAscent;x.fillText(letter,ox,oy);
  const pixels=x.getImageData(0,0,c.width,c.height).data,parts=[];
  for(let y=3;y<3+box.h;y+=2){let left=c.width,right=-1;for(let row=y;row<Math.min(y+2,c.height);row++)for(let col=3;col<Math.min(3+box.w,c.width);col++)if(pixels[(row*c.width+col)*4+3]>95){left=Math.min(left,col);right=Math.max(right,col);}if(right>=left)parts.push({x:box.x+left-3,y:box.y+y-3,w:right-left+1,h:Math.min(2,3+box.h-y)});}
  return parts;
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
  try{await document.fonts.ready;}catch{}
  if(!pending)return;
  score.hidden=false;sizeCanvas();
  const options=layout();
  if(options.origin.y<6 || options.origin.y>innerHeight-6){score.hidden=true;pending=false;say('제목이 보이는 위치에서 시작해 주세요.');return;}
  positionScore();
  game=new SnakeGame({...options,angle,musicVolume:music.volume,routePlanner:s=>routes.request(s)});metrics.start();particles=[];mode='playing';pending=false;
  touchSurface.hidden=false;document.body.classList.add('snake-playing');dot.style.visibility='hidden';canvas.hidden=false;
  updateScore();steer();
  say('스네이크 시작. 방향키로 이동, Escape로 끝내기.');
  loadAssets();const startedGame=game;sound.loadOne('page-soft').then(()=>{if(game===startedGame&&mode==='playing')pop('start');});last=performance.now();cancelAnimationFrame(raf);clearInterval(backgroundTimer);backgroundTimer=setInterval(()=>{if(document.hidden&&mode==='playing')advance(performance.now());},100);raf=requestAnimationFrame(frame);
}
function positionEscape(){
  if(!game||escapeKey.hidden)return;
  const h=game.body[0];
  escapeKey.style.left=Math.max(8,Math.min(innerWidth-68,h.x+14))+'px';
  escapeKey.style.top=Math.max(8,Math.min(innerHeight-36,h.y-14))+'px';
}
function end(){
  if(game)metrics.end(game);
  routes.cancel();stopMusic();document.body.style.backgroundColor='#f1eeee';sound.stopMusicCue();music.stop();clearInterval(backgroundTimer);pending=false;
  touchSurface.hidden=true;stick.reset();mode='idle';game=null;held.clear();cancelAnimationFrame(raf);
  flashAnimation?.cancel();flashAnimation=null;
  for(const [ring,animation] of rings){animation.cancel();ring.remove();}rings.clear();
  particles=[];score.hidden=true;score.textContent='';escapeKey.hidden=true;
  ctx.clearRect(0,0,innerWidth,innerHeight);canvas.hidden=true;
  dot.style.visibility='';document.body.classList.remove('snake-playing');
  say('');
}
function failure(){
  if(mode!=='playing')return;metrics.end(game);
  touchSurface.hidden=true;stick.reset();mode='dead';deathReadyAt=performance.now()+800;sound.stopMusicCue();music.pause();pending=false;held.clear();routes.cancel();stopMusic();
  clearInterval(backgroundTimer);cancelAnimationFrame(raf);updateScore();
  for(const animation of rings.values())animation.pause();
  escapeKey.hidden=false;positionEscape();draw();
  pop('fail');say('게임 끝. Enter 또는 Escape를 누르면 처음 화면으로 돌아갑니다.');
  flashBackground(reduced?'#e7b9b9':'#ef6767',700);
}
function burst(p,color){if(reduced||particles.length>=280)return;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*34,vy:Math.sin(a)*34,life:.35,color});}}
function advance(now){
  if(mode!=='playing')return;
  const dt=Math.max(0,(now-last)/1000);last=now;metrics.tick(dt,!document.hidden,game);game.step(dt);updateScore();
  const events=game.events.splice(0);
  for(const e of events){
    if(e.type==='music-play')music.play(e.track,async isCurrent=>{await sound.loadOne('lp-start-pixabay');if(!isCurrent()||mode!=='playing'||!game?.musicPads.active)return;if(!muted){sound.play('music-on');await new Promise(resolve=>setTimeout(resolve,1000));}});
    if(e.type==='music-stop'){pop('music-off');music.stopAfter(150);}
    if(e.type==='music-volume')music.setVolume(e.volume);
    if(e.type==='eat'){pop(e.kind===FOOD.GOLDEN_APPLE?'apple':e.kind===FOOD.BEER?'beer':e.kind===FOOD.CHILI?'chili':Object.values(FOOD).includes(e.kind)?'special':'eat');if(e.kind===FOOD.GOLDEN_APPLE)flashBackground(reduced?'#eee0b1':'#f5d873',900);updateScore();burst(e,'#bdb39d');}
    if(e.type==='penalty'){pop('penalty');updateScore();burst(e,'#9e7cba');}
    if(e.type==='defeat'){if(!e.silent)pop('defeat');burst(e,'#e4c361');}
    if(e.type==='throw')pop(e.attack==='potion'?'potion':'throw');
    if(e.type==='tooth-shot')pop('tooth');
    if(e.type==='blue-shot')pop('blue');
    if(e.type==='shoe-land')pop('shoe');
    if(e.type==='impact'){if(!e.silent)pop('impact');burst(e,'#b88662');}
    if(e.type==='splash'){pop('splash');burst(e,'#56b886');}
    if(e.type==='blast'){pop('blast');explosion(e);}
    if(e.type==='dynamite-blast'){pop('dynamite');explosion(e);}
    if(e.type==='press'){pop('blast');explosion({...e,ellipse:true});}
    if(e.type==='firework'){pop('impact');explosion({...e,radius:25});}
    if(e.type==='royal-firework'){pop('blast');explosion({...e,radius:25});}
    if(e.type==='air-pop'){pop('air-pop');explosion({...e,radius:75});}
    if(e.type==='enemy')say('적이 나타났어요.');
    if(e.type==='boss'){say((e.name||'보스')+' 등장. 칼을 찾아보세요.');pop('fail');}
    if(e.type==='knife')pop('special');
    if(e.type==='blade')pop('defeat');
    if(e.type==='boss-defeat'){explosion({...e,radius:95});if(e.kind!==8)pop('blast');}
    if(e.type==='nerd')pop('throw');
    if(e.type==='combo'&&['purple','orange'].includes(e.kind))flashBackground(e.kind==='purple'?'#bdc3e9':'#f3c45f',650);
    if(e.type==='laser'){pop('chime');flashBackground(reduced?'#ead0c9':'#f1a092',320);}
    if(['roll','zap','phone','hammer','fuse','enhance','billiard','slime'].includes(e.type))pop(e.type);
    if(['shield-pickup','shield-break','amulet','egg','egg-hatch'].includes(e.type)){pop(e.type==='shield-break'?'splash':e.type==='egg-hatch'?'eat':e.type==='egg'?'slime':'special');burst(e,'#d59b55');}
    if(e.type==='celebration'){pop('chime');flashBackground('#fff2c8',950);for(let i=0;i<9;i++){const p={x:innerWidth*(.1+Math.random()*.8),y:innerHeight*(.1+Math.random()*.7)};explosion({...p,radius:45+Math.random()*55});burst(p,'#c2a3df');}}
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
    const animation=ring.animate([{width:'8px',height:'8px',borderWidth:'8px',opacity:1},{width:size+'px',height:(e.ellipse?size*.43:size)+'px',borderWidth:'.5px',opacity:0}],{duration:reduced?200:550,delay:i*28,easing:'cubic-bezier(.15,.65,.25,1)',fill:'both'});
    rings.set(ring,animation);animation.onfinish=()=>{rings.delete(ring);ring.remove();};
  }
}
function flashBackground(color,duration){
  flashAnimation?.cancel();const base=comboPaper(mode==='playing'?game:null);document.body.style.backgroundColor=base;flashAnimation=document.body.animate([{backgroundColor:base},{backgroundColor:color,offset:.04},{backgroundColor:base}],{duration,easing:'ease-out'});
}
function stopMusic(){sound.setUnderwater(false);sound.setLoop?.('wind',0);sound.setLoop?.('rolling',0);sound.setLoop?.('fuse',0);}
function updateMusic(){sound.setLoop?.('fuse',mode==='playing'&&!muted&&game.arena?.relics.some(r=>r.attached)?.28:0,'fuse-soft');const active=mode==='playing'&&!muted;sound.setUnderwater(active&&game?.buffKind==='rainbow');const wind=active&&!game.worldFrozen?game.arena?.hazards.find(h=>h.type==='tornado'&&h.until>game.age):null;const proximity=wind?Math.max(0,1-Math.hypot(wind.x-game.body[0].x,wind.y-game.body[0].y)/Math.hypot(innerWidth,innerHeight)):0;sound.setLoop?.('wind',wind?.12+proximity*.6:0,'wind-soft');sound.setLoop?.('rolling',active&&!game.worldFrozen&&game.projectiles.some(p=>p.type==='ball')?.34:0,'roll-soft');}
function emoji(type,kind,x,y,alpha=1,size=24){
  if(game&&(['food','enemies','props','boss'].includes(type)||(type==='expansion'&&[4,10].includes(kind))))y-=shockLift(game);
  const image=images[type][kind];ctx.globalAlpha=alpha;
  if(image?.complete && image.naturalWidth)ctx.drawImage(image,x-size/2,y-size/2,size,size);
  else {ctx.fillStyle=type==='food'?'#edb457':'#efcd54';ctx.beginPath();ctx.arc(x,y,size/3,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function disc(p,r,color,stroke){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function sparkle(x,y,alpha,size,white=false){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=white?'#fff000':'#dba51d';ctx.shadowColor=white?'#ffeb00':'#edbd3c';ctx.shadowBlur=3;
  ctx.beginPath();ctx.moveTo(x,y-size);ctx.quadraticCurveTo(x+.65,y-.65,x+size,y);ctx.quadraticCurveTo(x+.65,y+.65,x,y+size);ctx.quadraticCurveTo(x-.65,y+.65,x-size,y);ctx.quadraticCurveTo(x-.65,y-.65,x,y-size);ctx.fill();disc({x,y},.55,'#fff7cf');ctx.restore();
}
function drawHazards(){
  for(const p of game.puddles){ctx.globalAlpha=Math.min(1,p.until-game.age);disc(p,p.radius,'rgba(67,183,108,.19)','rgba(47,151,80,.32)');ctx.globalAlpha=1;}
  for(const b of game.bombs){
    if(b.thrown){ctx.fillStyle='rgba(30,25,35,.16)';ctx.beginPath();ctx.ellipse(b.x,b.y+10,10,3,0,0,Math.PI*2);ctx.fill();}
    const fuse=b.armed===null?0:Math.min(1,(game.age-b.armed)/.95);
    const shake=0;
    drawEnhancement(ctx,game,b);if(b.armed!==null)disc(b,b.enhanced?102:72,'rgba(232,79,55,'+(.07+fuse*.12)+')','rgba(214,67,44,.5)');
    emoji('props',3,b.x+shake,b.y-(b.lift||0));
    if(fuse){ctx.save();ctx.filter='brightness(0) saturate(100%) invert(26%) sepia(88%) saturate(3200%) hue-rotate(344deg)';emoji('props',3,b.x+shake,b.y-(b.lift||0),fuse);ctx.restore();}
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
      ctx.font='19px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♪',pads.active?-2.5:0,1);
      if(pads.active){ctx.font='9px Arial';ctx.fillText(String(pads.track),5.5,1);}
    }else{
      ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-4,-2);ctx.lineTo(0,-6);ctx.lineTo(0,6);ctx.lineTo(-4,2);ctx.lineTo(-7,2);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(8,0);if(p.kind==='plus'){ctx.moveTo(5.5,-2.5);ctx.lineTo(5.5,2.5);}ctx.stroke();
    }
    ctx.restore();
  }
}
function drawMusicLabels(){
  for(const p of game.musicPads?.labels||[]){
    const t=Math.min(1,(game.age-p.born)/.85);
    ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*2);ctx.fillStyle=p.color;
    ctx.font='11px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(p.volume+'%',p.x,p.y-16-(reduced?0:19*(1-(1-t)*(1-t))));ctx.restore();
  }
}
function draw(){
  document.body.style.backgroundColor=comboPaper(mode==='playing'?game:null);
  ctx.clearRect(0,0,innerWidth,innerHeight);if(!game)return;
  drawMusicPads();
  drawHazards();
  drawExpansion(ctx,game,emoji,reduced);
  for(const p of game.food){
    if(p.kind>=47){emoji('expansion',p.kind===47?4:10,p.x,p.y,1,27);continue;}
    if(p.kind!==FOOD.GOLDEN_APPLE){emoji('food',p.kind,p.x,p.y);continue;}
    emoji('food',p.kind,p.x,p.y,1,24);
    if(reduced){sparkle(p.x-15,p.y-10,.7,3);sparkle(p.x+15,p.y+7,.6,2.4);}
    else{
      p.sparkles??=[];
      if(game.age>=(p.nextSparkle||0)){const a=Math.random()*Math.PI*2,r=15+Math.random()*5;p.sparkles.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,born:game.age,duration:.13+Math.random()*.14,white:(p.sparkleIndex=(p.sparkleIndex||0)+1)%2===0,size:2.5+Math.random()*1.6});p.nextSparkle=game.age+.06+Math.random()*.12;}
      p.sparkles=p.sparkles.filter(s=>game.age-s.born<s.duration);
      for(const s of p.sparkles){const t=(game.age-s.born)/s.duration;sparkle(s.x,s.y,Math.sin(t*Math.PI),s.size,s.white);}
    }
  }
  for(const e of game.enemies){
    const t=Math.min(1,game.age-e.born),fade=t*t*(3-2*t),shaking=e.kind===3&&e.state==='charge';
    const dx=shaking&&!reduced?Math.sin(game.age*65)*.8:0,dy=shaking&&!reduced?Math.cos(game.age*59)*.6:0;
    drawEnhancement(ctx,game,e);
    if(drawExpansionEnemy(ctx,game,e,emoji,reduced))continue;
    if(e.kind===6){emoji('boss',0,e.x,e.y,fade,84);emoji('boss',1,e.x-17,e.y-4,fade,34);emoji('boss',1,e.x+17,e.y-4,fade,34);emoji('boss',2,e.x,e.y+23,fade,44);}else emoji('enemies',e.kind,e.x+dx,e.y+dy-(e.lift||0),fade);
    if(e.kind===4)emoji('props',5,e.x-23,e.y+1,fade);
    if(e.kind===3 && (e.state==='charge'||e.state==='recover')){const red=e.state==='charge'?Math.min(1,(game.age-e.chargeAt)/.65):Math.max(0,(e.until-game.age)/2.4);emoji('props',4,e.x+dx,e.y+dy,fade*red);}
  }
  for(const p of game.projectiles){
    if(drawExpansionShot(ctx,game,p,emoji))continue;
    if(p.type==='blue'){disc(p,3.5,'#529eff','#d9eeff');continue;}
    const t=['tooth','anger-ray'].includes(p.type)?0:Math.min(1,(game.age-p.born)/p.duration);
    if(p.type==='shoe'||p.type==='potion'){const y=p.from.y+(p.to.y-p.from.y)*t;ctx.fillStyle='rgba(36,36,36,.12)';ctx.beginPath();ctx.ellipse(p.x,y,6,2.5,0,0,Math.PI*2);ctx.fill();}
    if(p.type==='tooth'){ctx.fillStyle='rgba(39,35,49,.2)';ctx.beginPath();ctx.ellipse(p.x,p.y+9,9,3,0,0,Math.PI*2);ctx.fill();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.type==='tooth'?Math.atan2(p.vy,p.vx)+Math.PI/2:p.type==='boomerang'?t*20:t*4);
    if(p.type==='tooth')emoji('boss',3,0,0,1,20);else emoji('props',p.type==='shoe'?0:p.type==='potion'?1:2,0,0);ctx.restore();
  }
  if(game.knife)emoji('boss',4,game.knife.x,game.knife.y,1,27);
  if(game.armed){const blade=game.blade();ctx.save();ctx.translate(blade.x,blade.y);ctx.rotate(game.angle+Math.PI*5/4);emoji('boss',4,0,0,1,30);ctx.restore();}
  const snakeHead=game.body[0];if(game.shield&&mode!=='dead'){const pulse=reduced?.65:.45+.3*(Math.sin(game.age*3.5)+1)/2;ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle='#f2bf35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(snakeHead.x,snakeHead.y,13,0,Math.PI*2);ctx.stroke();ctx.restore();}
  const buff=mode==='dead'?null:game.buffKind;
  ctx.strokeStyle=buff==='red'?'#e74743':buff==='blue'?'#478de2':buff==='orange'?'#ec963a':buff==='purple'?'#9861bf':game.age<game.slowUntil?'#42aa70':game.selfPhase?'#4d4caa':'#242424';
  if(game.invincible&&buff!=='rainbow')ctx.strokeStyle=Math.sin(game.age*22)>0?'#b1aeb8':ctx.strokeStyle;
  if(buff==='rainbow'){const hue=game.age*(reduced?25:190),gradient=ctx.createLinearGradient(game.body[0].x-35,game.body[0].y-35,game.body[0].x+35,game.body[0].y+35);for(let i=0;i<=6;i++)gradient.addColorStop(i/6,'hsl('+((game.activeCombo==='purple'?260+i*7:game.activeCombo==='red'?350+i*6:game.activeCombo==='orange'?35+i*7:game.activeCombo==='blue'?180+i*17:hue+i*60)%360)+' 85% '+(game.activeCombo==='blue'?70:58)+'%)');ctx.strokeStyle=gradient;}
  if(buff==='rainbow'&&game.activeCombo)ctx.strokeStyle=comboInk(ctx,game,reduced)||ctx.strokeStyle;
  if(mode==='dead')ctx.strokeStyle='#929294';
  ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();game.body.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const h=game.body[0];ctx.beginPath();ctx.arc(h.x,h.y,4,0,Math.PI*2);ctx.fill();
  if(mode==='playing'&&game.activeCombo==='purple'){ctx.save();for(let i=0;i<8;i++){const p=game.body[Math.min(game.body.length-1,i*7)];if(!p)continue;ctx.globalAlpha=.3+.4*(Math.sin(game.age*.8+i)+1)/2;ctx.fillStyle='#e5dafa';ctx.fillRect(p.x-1,p.y-1,1.4,1.4);}ctx.restore();}
  if(game.age>.2){for(const s of [-1,1]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x+Math.cos(game.angle)*1.5+Math.sin(game.angle)*s*1.8,h.y+Math.sin(game.angle)*1.5-Math.cos(game.angle)*s*1.8,1,0,Math.PI*2);ctx.fill();}}
  for(const p of particles){ctx.globalAlpha=p.life/.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;

  drawMusicLabels();
  drawDynamite(ctx,game,emoji);
}
function toggleSound(){muted=!muted;if(muted)stopMusic();else{unlockAudio();pop();updateMusic();}}
touchSurface.addEventListener('pointerdown',e=>{
  if(mode!=='playing'||!stick.begin(e.pointerId,e.clientX,e.clientY))return;
  e.preventDefault();held.clear();game.touchTarget=stick.target;touchSurface.setPointerCapture(e.pointerId);
});
touchSurface.addEventListener('pointermove',e=>{
  if(mode==='playing'&&stick.move(e.pointerId,e.clientX,e.clientY))game.touchTarget=stick.target;
});
function releaseTouch(e){stick.release(e.pointerId);}
for(const type of ['pointerup','pointercancel','lostpointercapture'])touchSurface.addEventListener(type,releaseTouch);
document.addEventListener('click',e=>{if(mode!=='idle'&&e.target.closest('a,.snake-start')){e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('contextmenu',e=>{if(mode!=='idle'&&e.target.closest('a,.snake-touch'))e.preventDefault();});
document.querySelector('.snake-start')?.addEventListener('click',()=>{if(mode==='idle'&&!pending){held.clear();start(0);}});
window.addEventListener('keydown',e=>{
  if(mode==='dead'){if(['Enter','Escape'].includes(e.key)&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();if(!e.repeat&&performance.now()>=deathReadyAt)end();}return;}
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(mode==='idle'){
    if(['ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.repeat && !e.target.closest('a,button')){e.preventDefault();held.add(e.key);start(directions[e.key]);}return;
  }
  if(['1','2','3'].includes(e.key)&&!e.repeat&&['localhost','127.0.0.1'].includes(location.hostname)){e.preventDefault();if(e.key==='1')game.spawnBoss(true);if(e.key==='2')game.spawnSpecial();if(e.key==='3')game.spawnEnemy();return;}
  if(e.key==='Escape'){e.preventDefault();end();return;}
  if(e.key===' '){e.preventDefault();return;}
  if(e.key==='Tab'){e.preventDefault();return;}
  if(e.key.toLowerCase()==='m'){toggleSound();return;}
  if(e.key in directions){e.preventDefault();if(mode==='playing'){game.touchTarget=null;stick.reset();held.add(e.key);steer();}}
});
window.addEventListener('keyup',e=>{if(e.key in directions){held.delete(e.key);steer();}});
window.addEventListener('blur',()=>{stick.reset();held.clear();steer();});
document.addEventListener('visibilitychange',()=>{held.clear();steer();if(mode==='playing'){advance(performance.now());if(!document.hidden){cancelAnimationFrame(raf);if(mode==='playing')raf=requestAnimationFrame(frame);}}});
window.addEventListener('resize',()=>{if(mode==='playing')end();else if(mode==='dead'){sizeCanvas();draw();positionEscape();}positionScore();});
window.addEventListener('wheel',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('touchmove',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{if(mode==='playing')end();positionScore();},{passive:true});

function fitPage(){const p=document.querySelector('.page');const scale=Math.min(1,(innerHeight-40)/p.offsetHeight);p.style.setProperty('--page-scale',Math.max(.1,scale));}
fitPage();document.fonts.ready.then(fitPage);window.addEventListener('resize',fitPage);
document.addEventListener('dragstart',e=>e.preventDefault());
document.addEventListener('selectstart',e=>e.preventDefault());
canvas.hidden=true;
// Fetching only the small manifest/assets after activation keeps normal visits lightweight.
