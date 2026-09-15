import {SnakeGame,headingFromKeys,cardObstacle} from './snake-engine.mjs?v=5';
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
let game=null,mode='idle',raf=0,last=0,muted=false,audio=null,assets=null,images={food:[],enemies:[],props:[],boss:[]},particles=[],previousFocus=null,pending=false;
let master=null,backgroundTimer=0,musicBus=null,musicTime=0,musicStep=0,flashAnimation=null;
const musicVoices=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const directions={ArrowRight:0,ArrowDown:Math.PI/2,ArrowLeft:Math.PI,ArrowUp:-Math.PI/2};
const held=new Set();
function steer(){if(game)game.target=headingFromKeys(held,game.angle);}
const say=t=>{live.textContent=t;};
function pop(type='eat') {
  if(muted || !audio)return;
  try {
    if(audio.state==='suspended')audio.resume().catch(()=>{});
    const now=audio.currentTime,gain=audio.createGain();gain.connect(master||audio.destination);
    if(type==='defeat'){
      const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.16),audio.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.75;filter.frequency.setValueAtTime(5200,now);filter.frequency.exponentialRampToValueAtTime(1400,now+.14);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.6,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.15);
      source.connect(filter);filter.connect(gain);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
    }
    const osc=audio.createOscillator(),death=type==='fail'||type==='blast',penalty=type==='penalty',duration=death?.65:penalty?.3:.17;
    osc.type='sine';const base=death?115:penalty?155:type==='throw'?400:660+Math.random()*90;
    osc.frequency.setValueAtTime(base,now);osc.frequency.exponentialRampToValueAtTime(death?42:base*.36,now+(death?.5:.095));
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(death?.55:type==='throw'?.16:type==='start'?.2:.3,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{}
}
function unlockAudio(){try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createDynamicsCompressor();master.threshold.value=-8;master.knee.value=12;master.ratio.value=4;master.attack.value=.003;master.release.value=.16;master.connect(audio.destination);}audio.resume().catch(()=>{});}catch{}}
function loadAssets(){
  return assets ||= fetch('/emoji/manifest.json?v=5').then(r=>{if(!r.ok)throw Error('assets');return r.json();}).then(async manifest=>{
    await Promise.all(['food','enemies','props','boss'].flatMap(type=>manifest[type].map((name,i)=>new Promise(resolve=>{
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
  const obstacles=[...glyphBoxes(title,title.firstChild),...glyphBoxes(subtitle,subtitle.firstChild),...[...document.querySelectorAll('.card')].map(el=>{const b=el.getBoundingClientRect();return cardObstacle(b,parseFloat(getComputedStyle(el.parentElement).columnGap)||12);})];
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
  score.style.left=options.origin.x+'px';score.style.top=options.origin.y+'px';
  game=new SnakeGame({...options,angle});particles=[];mode='playing';pending=false;
  document.body.classList.add('snake-playing');dot.style.visibility='hidden';canvas.hidden=false;
  score.textContent='0';steer();
  say('스네이크 시작. 방향키로 이동, Escape로 끝내기.');
  loadAssets();pop('start');last=performance.now();cancelAnimationFrame(raf);clearInterval(backgroundTimer);backgroundTimer=setInterval(()=>{if(document.hidden&&mode==='playing')advance(performance.now());},100);raf=requestAnimationFrame(frame);
}
function end(){stopMusic();clearInterval(backgroundTimer);pending=false;mode='idle';game=null;held.clear();cancelAnimationFrame(raf);ctx.clearRect(0,0,innerWidth,innerHeight);score.hidden=true;canvas.hidden=true;dot.style.visibility='';document.body.classList.remove('snake-playing');}
function failure(){
  pop('fail');end();say('게임 끝.');
  flashBackground(reduced?'#e7b9b9':'#ef6767',700);
}
function burst(p,color){if(reduced)return;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;particles.push({x:p.x,y:p.y,vx:Math.cos(a)*34,vy:Math.sin(a)*34,life:.35,color});}}
function advance(now){
  if(mode!=='playing')return;
  const dt=Math.max(0,(now-last)/1000);last=now;game.step(dt);
  const events=game.events.splice(0);
  for(const e of events){
    if(e.type==='eat'){pop();score.textContent=String(game.score);burst(e,'#bdb39d');}
    if(e.type==='penalty'){pop('penalty');flashBackground(reduced?'#d4c4df':'#9b74c5',1000);score.textContent=String(game.score);burst(e,'#9e7cba');}
    if(e.type==='defeat'){pop('defeat');burst(e,'#e4c361');}
    if(e.type==='throw')pop('throw');
    if(e.type==='impact'){pop('impact');burst(e,'#b88662');}
    if(e.type==='splash'){pop('splash');burst(e,'#56b886');}
    if(e.type==='blast'){pop('blast');explosion(e);}
    if(e.type==='enemy')say('적이 나타났어요.');
    if(e.type==='boss'){say('토마토 보스가 나타났어요. 칼을 찾아보세요.');pop('fail');}
    if(e.type==='knife')pop('eat');
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
    animation.onfinish=()=>ring.remove();
  }
}
function flashBackground(color,duration){
  flashAnimation?.cancel();flashAnimation=document.body.animate([{backgroundColor:'#f1eeee'},{backgroundColor:color,offset:.04},{backgroundColor:'#f1eeee'}],{duration,easing:'ease-out'});
}
// Original invincibility chiptune, composed for this site (not a recording or transcription).
const starMelody=[76,79,83,86,83,79,74,78,81,85,81,78,72,76,79,84];
function stopMusic(){
  for(const osc of musicVoices){try{osc.stop();}catch{}}musicVoices.clear();if(musicBus){musicBus.disconnect();musicBus=null;}
}
function updateMusic(){
  if(!audio||muted||!game?.invincible){stopMusic();return;}
  if(!musicBus){musicBus=audio.createGain();musicBus.gain.value=.2;musicBus.connect(master||audio.destination);musicTime=audio.currentTime;musicStep=0;}
  if(musicTime<audio.currentTime-.2)musicTime=audio.currentTime;
  while(musicTime<audio.currentTime+.15){
    const midi=starMelody[musicStep%starMelody.length],duration=.115;
    for(const [note,volume,wave] of [[midi,.38,'square'],[midi-24,.25,'triangle']]){
      const osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;osc.frequency.value=440*2**((note-69)/12);gain.gain.setValueAtTime(0,musicTime);gain.gain.linearRampToValueAtTime(volume,musicTime+.008);gain.gain.exponentialRampToValueAtTime(.0001,musicTime+duration);osc.connect(gain);gain.connect(musicBus);musicVoices.add(osc);osc.start(musicTime);osc.stop(musicTime+duration+.01);osc.onended=()=>{musicVoices.delete(osc);osc.disconnect();gain.disconnect();};
    }
    musicTime+=.125;musicStep++;
  }
}
function emoji(type,kind,x,y,alpha=1,size=24){
  const image=images[type][kind];ctx.globalAlpha=alpha;
  if(image?.complete && image.naturalWidth)ctx.drawImage(image,x-size/2,y-size/2,size,size);
  else {ctx.fillStyle=type==='food'?'#edb457':'#efcd54';ctx.beginPath();ctx.arc(x,y,size/3,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function disc(p,r,color,stroke){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function drawHazards(){
  for(const p of game.puddles){ctx.globalAlpha=Math.min(1,p.until-game.age);disc(p,p.radius,'rgba(67,183,108,.19)','rgba(47,151,80,.32)');disc({x:p.x-14,y:p.y+9},8,'rgba(91,213,128,.3)');disc({x:p.x+16,y:p.y-12},6,'rgba(91,213,128,.3)');ctx.globalAlpha=1;}
  for(const b of game.bombs){
    const fuse=b.armed===null?0:Math.min(1,(game.age-b.armed)/.95);
    const shake=0;
    emoji('props',3,b.x+shake,b.y);
    if(fuse){ctx.save();ctx.filter='brightness(0) saturate(100%) invert(26%) sepia(88%) saturate(3200%) hue-rotate(344deg)';emoji('props',3,b.x+shake,b.y,fuse);ctx.restore();}
  }
}
function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight);if(!game)return;
  drawHazards();
  for(const p of game.food)emoji('food',p.kind,p.x,p.y);
  for(const e of game.enemies){
    const t=Math.min(1,game.age-e.born),fade=t*t*(3-2*t),shaking=e.kind===3&&game.age-e.chargeAt<.22;
    const dx=shaking&&!reduced?Math.sin(game.age*65)*.8:0,dy=shaking&&!reduced?Math.cos(game.age*59)*.6:0;
    if(e.kind===6){emoji('boss',0,e.x,e.y,fade,84);emoji('boss',1,e.x,e.y-10,fade,46);emoji('boss',2,e.x,e.y+16,fade,44);}else emoji('enemies',e.kind,e.x+dx,e.y+dy,fade);
    if(e.kind===4)emoji('props',5,e.x-23,e.y+1,fade);
    if(e.kind===3 && (e.state==='charge'||e.state==='recover')){const red=e.state==='charge'?Math.min(1,(game.age-e.chargeAt)/1.1):Math.max(0,(e.until-game.age)/2.4);emoji('props',4,e.x+dx,e.y+dy,fade*red);}
  }
  for(const p of game.projectiles){
    const t=p.type==='tooth'?0:Math.min(1,(game.age-p.born)/p.duration);
    if(p.type==='shoe'||p.type==='potion'){const y=p.from.y+(p.to.y-p.from.y)*t;ctx.fillStyle='rgba(36,36,36,.12)';ctx.beginPath();ctx.ellipse(p.x,y,6,2.5,0,0,Math.PI*2);ctx.fill();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.type==='tooth'?Math.atan2(p.vy,p.vx)+Math.PI/2:p.type==='boomerang'?t*20:t*4);
    if(p.type==='tooth')emoji('boss',3,0,0,1,20);else emoji('props',p.type==='shoe'?0:p.type==='potion'?1:2,0,0);ctx.restore();
  }
  if(game.knife)emoji('boss',4,game.knife.x,game.knife.y,1,27);
  if(game.armed){const blade=game.blade();ctx.save();ctx.translate(blade.x,blade.y);ctx.rotate(game.angle+Math.PI/4);emoji('boss',4,0,0,1,30);ctx.restore();}
  const buff=game.buffKind;
  ctx.strokeStyle=buff==='red'?'#e74743':buff==='blue'?'#478de2':game.age<game.slowUntil?'#42aa70':'#242424';
  if(buff==='rainbow'){const hue=game.age*(reduced?25:190),gradient=ctx.createLinearGradient(game.body[0].x-35,game.body[0].y-35,game.body[0].x+35,game.body[0].y+35);for(let i=0;i<=6;i++)gradient.addColorStop(i/6,'hsl('+((hue+i*60)%360)+' 85% 58%)');ctx.strokeStyle=gradient;}
  ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();game.body.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const h=game.body[0];ctx.beginPath();ctx.arc(h.x,h.y,4,0,Math.PI*2);ctx.fill();
  if(game.age>.2){for(const s of [-1,1]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x+Math.cos(game.angle)*1.5+Math.sin(game.angle)*s*1.8,h.y+Math.sin(game.angle)*1.5-Math.cos(game.angle)*s*1.8,1,0,Math.PI*2);ctx.fill();}}
  for(const p of particles){ctx.globalAlpha=p.life/.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function toggleSound(){muted=!muted;if(muted)stopMusic();else{unlockAudio();pop();updateMusic();}}
window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const debug=e.key.toLowerCase();
  if(['q','w','e'].includes(debug)&&!e.repeat){e.preventDefault();const act=()=>{if(!game)return;if(debug==='q')game.spawnSpecial();if(debug==='w')game.spawnEnemy();if(debug==='e')game.spawnBoss();};if(mode==='idle')start(0).then(act);else act();return;}
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
window.addEventListener('resize',()=>{if(mode!=='idle')end();});
window.addEventListener('wheel',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('touchmove',e=>{if(mode!=='idle')e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{if(mode!=='idle')end();},{passive:true});

canvas.hidden=true;
// Fetching only the small manifest/assets after activation keeps normal visits lightweight.
