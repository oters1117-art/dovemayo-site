import {planRoute} from '../dist/navigation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,turnToward,touches,headingFromKeys,FOOD,cardObstacle} from '../dist/snake-engine.mjs';
let seed=82;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const fresh=(extra={})=>new SnakeGame({width:900,height:700,origin:{x:440,y:200},random,...extra});
test('smooth steering takes a wider responsive curve',()=>{
 const g=fresh();g.target=Math.PI/2;g.step(1/60);assert(g.angle>0&&g.angle<Math.PI/2);
 for(let i=0;i<10;i++)g.step(1/60);assert(g.angle<Math.PI/2);for(let i=0;i<12;i++)g.step(1/60);assert(Math.abs(g.angle-Math.PI/2)<.001);assert(!g.dead);
 assert(Math.abs(turnToward(Math.PI-.05,-Math.PI+.05,.03)-(Math.PI-.02))<.0001);
});
test('right/up/down starts leave the title without hitting it',()=>{
 for(const angle of [0,-Math.PI/2,Math.PI/2]){
 const g=fresh({origin:{x:540,y:200},angle,obstacles:[{x:340,y:162,w:187,h:43},{x:410,y:230,w:60,h:16}]});
 for(let i=0;i<30;i++)g.step(1/60);assert(!g.dead);assert(g.length>38);}
});
test('food increases length and score, and is replaced in free space',()=>{
 const g=fresh();g.food=[{x:448,y:200,kind:0}];const length=g.goalLength;g.step(.02);
 assert.equal(g.score,1);assert.equal(g.goalLength,length+24);assert.equal(g.food.length,3);
 assert(g.food.every(p=>!g.blocked(p,16)));assert(g.events.some(e=>e.type==='eat'));
});
test('walls and rectangular text obstacles kill without tunneling',()=>{
 const wall=fresh({origin:{x:894,y:200}});wall.step(.08);assert(wall.dead);
 const text=fresh({obstacles:[{x:450,y:195,w:1,h:15}]});text.step(.08);assert(text.dead);
});
test('rounded cards use their rounded visible boundary',()=>{
 const b={x:100,y:100,w:100,h:100,radius:21};assert(!touches({x:101,y:101},4,b));assert(touches({x:150,y:99},4,b));
});
test('the head collides with its own older body',()=>{
 const g=fresh();g.body=[{x:440,y:200},{x:430,y:200},{x:430,y:220},{x:460,y:220},{x:442,y:200}];g.step(.01);assert(g.dead);
});
test('enemy contact with the head fails, contact with older body defeats enemy',()=>{
 const g=fresh();g.age=3;g.enemies=[{x:445,y:200,born:0,kind:0}];g.step(.01);assert(g.dead);
 const b=fresh();b.age=3;b.goalLength=120;b.length=120;b.body=[{x:440,y:200},{x:420,y:200},{x:400,y:200},{x:380,y:200}];b.enemies=[{x:400,y:210,born:0,kind:0}];b.step(.01);assert(!b.dead);assert.equal(b.kills,1);assert.equal(b.enemies.length,0);
});
test('enemy warns for one second and spawns away from player and obstacles',()=>{
 const g=fresh();g.nextEnemy=0;g.step(.01);assert.equal(g.enemies.length,1);const e={...g.enemies[0]};g.step(.08);assert.equal(g.enemies[0].x,e.x);assert.equal(g.enemies[0].y,e.y);assert(!g.blocked(e,11));
});
test('movement is independent of rendering frame rate',()=>{
 const a=fresh(),b=fresh();a.food=[];b.food=[];a.nextRefill=b.nextRefill=Infinity;
 for(let i=0;i<60;i++)a.step(1/60);for(let i=0;i<30;i++)b.step(1/30);
 assert(Math.abs(a.body[0].x-b.body[0].x)<.01);assert(Math.abs(a.length-b.length)<.01);
});

test('diagonal holds and release preserve a non-cardinal heading',()=>{
 const g=fresh();g.target=headingFromKeys(new Set(['ArrowRight','ArrowDown']),g.angle);
 assert.equal(g.target,Math.PI/4);g.step(.04);const released=g.angle;
 assert(released>0&&released<Math.PI/4);
 g.target=headingFromKeys(new Set(),released);
 const before={...g.body[0]};g.step(.04);
 assert.equal(g.angle,released);
 assert(Math.abs((g.body[0].y-before.y)/(g.body[0].x-before.x)-Math.tan(released))<.000001);
 assert.equal(headingFromKeys(new Set(['ArrowUp','ArrowDown']),released),released);
});
test('background elapsed time continues all the way to death instead of freezing',()=>{
 const g=fresh();g.step(10);assert(g.dead);assert(g.age>1);assert(g.age<10);
});
test('food quantity scales with score while enemy frequency scales with time',()=>{
 const g=fresh();g.age=100;g.refill();assert.equal(g.food.length,3);g.score=25;g.refill();assert.equal(g.food.length,8);
 g.nextEnemy=0;g.step(.01);assert(g.nextEnemy-g.age<6.6);
});
test('cowboy throws immediately at a random nearby point then flees',()=>{
 const g=fresh();g.food=[];g.age=2;const e={x:270,y:200,kind:1,born:0,state:'idle'};
 g.updateEnemy(e,.01);assert.equal(e.state,'flee');assert.equal(g.projectiles[0].type,'shoe');
 const shot=g.projectiles[0];assert(Math.hypot(shot.to.x-g.body[0].x,shot.to.y-g.body[0].y)>=35.99);
 const x=e.x;g.updateEnemy(e,.1);assert(e.x<x);
});
test('shoe lands at its marked target and hits only on impact',()=>{
 const g=fresh();g.projectiles=[{type:'shoe',x:300,y:200,from:{x:300,y:200},to:{...g.body[0]},born:0,duration:.7}];
 g.age=.3;g.updateHazards(.01);assert(!g.dead);assert.equal(g.projectiles.length,1);
 g.age=.8;g.updateHazards(.01);assert(g.dead);assert(g.events.some(e=>e.type==='fail'));
});
test('scientist potion creates temporary slow ground and speed recovers',()=>{
 const g=fresh();g.projectiles=[{type:'potion',from:{x:300,y:200},to:{...g.body[0]},born:0,duration:.8}];
 g.age=1;g.updateHazards(.01);assert.equal(g.puddles.length,1);assert(g.slowUntil>g.age);assert(!g.dead);
 const before=g.body[0].x;g.step(.04);assert(Math.abs(g.body[0].x-before-125*.55*.04)<.01);
 g.age=22;g.step(.001);assert.equal(g.puddles.length,0);
 const x=g.body[0].x;g.step(.04);assert(Math.abs(g.body[0].x-x-125*.04)<.01);
});
test('angry enemy charges before firing and the boomerang returns',()=>{
 const g=fresh();g.food=[];g.age=2;const e={x:260,y:200,kind:3,born:0,until:0};g.enemies=[e];g.updateEnemy(e,.01);assert.equal(e.state,'charge');assert.equal(g.projectiles.length,0);g.age+=.66;g.updateEnemy(e,.01);assert.equal(g.projectiles[0].type,'boomerang');
 const p=g.projectiles[0];g.body=[{x:800,y:650}];g.age=p.born+p.duration*.5;g.updateHazards(.01);assert(Math.abs(p.x-p.to.x)<.01);
 g.age=p.born+p.duration*.9;g.updateHazards(.01);assert(Math.hypot(p.x-e.x,p.y-e.y)<60);
});
test('nerd head contact kills player and it runs quickly from far away',()=>{
 const g=fresh();g.food=[];g.age=3;const e={...g.body[0],kind:4,born:0,until:5};g.enemies=[e];g.step(.01);assert(g.dead);g.dead=false;g.enemies=[e];
 e.x=50;e.y=600;e.until=0;g.updateEnemy(e,.01);assert.equal(e.x,50);assert.equal(e.state,'dash');for(let i=0;i<300&&e.state==='dash';i++){const old={...e};g.age+=.01;g.updateEnemy(e,.01);assert(Math.hypot(e.x-old.x,e.y-old.y)<=6.201);assert(!g.enemyBlocked(e,e));}assert.equal(e.state,'idle');assert(Math.hypot(e.x-g.body[0].x,e.y-g.body[0].y)<65);
});
test('wink drops bombs; proximity arms, warns, then explodes',()=>{
 const g=fresh();g.age=3;const e={x:100,y:100,kind:5,born:0,until:0};g.updateEnemy(e,.01);assert.equal(g.bombs.length,1);
 const b=g.bombs[0];g.age=4;g.body=[{x:b.x+50,y:b.y}];g.updateHazards(.01);assert.equal(b.armed,4);assert(!g.dead);
 g.age=4.8;g.updateHazards(.01);assert(!g.dead);
 g.age=5;g.updateHazards(.01);assert(g.dead);assert(g.events.some(e=>e.type==='blast'));assert.equal(g.bombs.length,0);
});

test('chili speeds up, blueberry replaces it without a speed effect, tomato replaces blue',()=>{
 const g=fresh();g.eatFood({kind:FOOD.CHILI});assert.equal(g.buffKind,'red');assert(g.currentSpeed>185);
 g.eatFood({kind:FOOD.BLUEBERRY});assert.equal(g.buffKind,'blue');assert(g.currentSpeed<130);assert(!g.invincible);
 g.eatFood({kind:FOOD.TOMATO});assert.equal(g.buffKind,'rainbow');assert(g.invincible);
 g.eatFood({kind:FOOD.BLUEBERRY});assert(g.invincible);assert.equal(g.buffKind,'rainbow');
 g.age=g.buff.until+.01;assert.equal(g.buffKind,null);
});
test('eggplant awards one point and briefly freezes purple without shrinking',()=>{
 const g=fresh();g.score=3;g.goalLength=120;g.length=120;g.eatFood({kind:FOOD.EGGPLANT});
 assert.equal(g.score,4);assert.equal(g.goalLength,144);assert.equal(g.length,120);assert.equal(g.buffKind,'purple');assert.equal(g.currentSpeed,0);
 const h={...g.body[0]};g.step(.5);assert.deepEqual(g.body[0],h);assert.equal(g.body.length,1);g.age=1.2;assert(g.currentSpeed>0);assert.equal(g.buffKind,null);
});
test('tomato turns away from cards and walls and defeats head-contact enemies',()=>{
 const g=fresh({obstacles:[{x:446,y:190,w:30,h:30}]});g.setBuff('rainbow',5);for(let i=0;i<30;i++){g.step(.01);assert(!g.dead);assert(!g.blocked(g.body[0],g.radius));}assert.notEqual(g.angle,0);
 const wall=fresh({origin:{x:893,y:200}});wall.setBuff('rainbow',5);wall.step(.04);assert(!wall.dead);assert(wall.body[0].x<=894);assert(!wall.blocked(wall.body[0],wall.radius));
 const e=fresh();e.age=3;e.setBuff('rainbow',5);e.enemies=[{x:443,y:200,kind:0,born:0}];e.step(.01);assert(!e.dead);assert.equal(e.kills,1);
});
test('tomato ignores shoes bombs boomerangs and potion slowdown',()=>{
 for(const type of ['shoe','potion','boomerang']){
   const g=fresh();g.setBuff('rainbow',5);const h={...g.body[0]};g.projectiles=[{type,x:h.x,y:h.y,from:h,to:h,born:0,duration:.8}];g.age=type==='boomerang'?.2:1;g.updateHazards(.01);assert(!g.dead);assert.equal(g.slowUntil,0);
 }
 const g=fresh();g.setBuff('rainbow',5);g.bombs=[{...g.body[0],born:0,armed:0}];g.age=1;g.updateHazards(.01);assert(!g.dead);assert(g.events.some(e=>e.type==='blast'));
});
test('shrunk cards leave a passable corridor and enemies cannot overlap each other or food',()=>{
 const a=cardObstacle({left:100,top:100,width:100,height:100}),b=cardObstacle({left:212,top:100,width:100,height:100});
 assert(a.w<100&&Math.abs(b.x-a.x-a.w-20.25)<.001);
 const g=fresh({obstacles:[a,b]});g.food=[];const e={x:206,y:80,kind:0};g.enemies=[e];
 for(let i=0;i<100;i++)g.moveEnemy(e,{x:206,y:250},90,.01);assert(e.y>165);
 const other={x:206,y:e.y+22,kind:0};g.enemies.push(other);
 for(let i=0;i<200;i++){g.moveEnemy(e,other,90,.01);assert(Math.hypot(e.x-other.x,e.y-other.y)>=20.99);}
 g.food=[{x:e.x+22,y:e.y,kind:1}];const food=g.food[0];for(let i=0;i<100;i++){g.moveEnemy(e,food,90,.01);assert(Math.hypot(e.x-food.x,e.y-food.y)>=19.99);}
});
test('nerd finger has no collider and visits remain infrequent',()=>{
 const g=fresh();g.food=[];g.age=4;const e={x:100,y:100,kind:4,until:0};g.enemies=[e];g.updateEnemy(e,.01);
 for(let i=0;i<400&&e.state==='dash';i++){g.age+=.01;g.updateEnemy(e,.01);}assert.equal(e.state,'idle');assert(e.until-g.age>=10);assert.equal(g.enemyDiscs(e).length,1);
});
test('angry enemy orbits and visibly winds up before random shots',()=>{
 const g=fresh();g.food=[];g.angle=Math.PI/2;const e={x:255,y:200,kind:3,until:0};g.enemies=[e];g.age=3;
 const y=e.y;g.updateEnemy(e,.05);assert(Math.abs(e.y-y)>1);assert.equal(e.state,'charge');assert.equal(g.projectiles.length,0);g.age+=.66;g.updateEnemy(e,.01);assert.equal(e.state,'recover');assert.equal(g.projectiles.length,1);
 const shot=g.projectiles[0];assert(Math.hypot(shot.to.x-g.body[0].x,shot.to.y-g.body[0].y)>=36);
});

test('boss spawns with a knife; body and weak projectiles cannot kill it',()=>{
 const g=fresh();g.arena.order=[6,7,8,9];g.food=[];assert(g.spawnBoss());assert(g.hasBoss);assert(g.knife);
 const boss=g.enemies.find(e=>e.kind===6);assert(!g.killEnemy(boss,'body'));assert(!g.killEnemy(boss,'projectile'));
 g.armed=true;const blade=g.blade();boss.x=blade.x;boss.y=blade.y;g.updateBlade();assert(!g.hasBoss);assert(!g.armed);
});
test('knife is one-use and regenerates while a boss remains',()=>{
 const g=fresh();g.food=[];g.spawnBoss();g.knife=null;g.armed=true;
 const victim={...g.blade(),kind:0,born:0};g.enemies.push(victim);g.updateBlade();assert(!g.armed);assert(!g.enemies.includes(victim));assert(g.hasBoss);
 g.age=5;g.ensureKnife();assert(!g.knife);g.age=7;g.ensureKnife();assert(g.knife);
});
test('boss is blocked by the old snake body and emits persistent teeth',()=>{
 const g=fresh();g.food=[];g.body=[{x:440,y:200},{x:410,y:200},{x:380,y:200}];
 const boss={x:360,y:280,kind:6,born:0,until:0};g.enemies=[boss];assert(g.enemyBlocked(boss,{x:380,y:215}));
 g.age=2;g.updateEnemy(boss,.01);assert.equal(g.projectiles.length,14);assert(g.projectiles.every(p=>p.type==='tooth'));
 const tooth={type:'tooth',x:50,y:50,vx:10,vy:0,born:0};g.projectiles=[tooth];g.age=100;g.updateHazards(.1);assert(g.projectiles.includes(tooth));assert.equal(tooth.x,51);
 tooth.x=895;g.updateHazards(.1);assert(!g.projectiles.includes(tooth));
});
test('bomb destroys ordinary enemies but cannot kill a boss',()=>{
 const g=fresh();g.body=[{x:800,y:650}];g.food=[{x:100,y:100,kind:0}];const boss={x:150,y:110,kind:6,born:0},mob={x:110,y:100,kind:0,born:0};g.enemies=[boss,mob];g.projectiles=[{type:'tooth',x:100,y:110,vx:1,vy:0,born:0}];
 const bomb={x:100,y:100,born:0,armed:0};g.bombs=[bomb,{x:160,y:100,born:0,armed:null}];g.explode(bomb);g.finalizeShots();
 assert(g.food.every(f=>f.kind===FOOD.TOMATO));assert.equal(g.projectiles.length,0);assert.equal(g.bombs.length,0);assert(!g.enemies.includes(mob));assert(g.enemies.includes(boss));assert(!g.dead);
});
test('shots cancel each other and destroy food or ordinary enemies on contact',()=>{
 for(const target of ['shot','food','enemy']){
 const g=fresh();g.food=[];g.body=[{x:800,y:650}];const p={type:'tooth',x:100,y:100,vx:0,vy:0,born:0};g.projectiles=[p];
 if(target==='shot')g.projectiles.push({...p});if(target==='food')g.food.push({x:100,y:100,kind:0});if(target==='enemy')g.enemies.push({x:100,y:100,kind:0,born:0});
 g.updateHazards(.01);assert.equal(g.projectiles.length,0);assert.equal(g.food.length,0);assert.equal(g.enemies.length,0);
 }
});
test('boomerang is blocked by cards, airborne shoe and potion pass over them',()=>{
 for(const type of ['boomerang','shoe','potion']){
 const g=fresh({obstacles:[{x:90,y:0,w:30,h:160}]});g.food=[];g.body=[{x:800,y:650}];
 const p={type,x:50,y:100,from:{x:50,y:100},to:{x:150,y:100},born:0,duration:1};g.projectiles=[p];g.age=type==='boomerang'?1/6:.5;g.updateHazards(.01);
 assert.equal(g.projectiles.length,type==='boomerang'?0:1);
 }
});
test('potion creates a larger longer pool only on impact',()=>{
 const g=fresh();g.food=[];g.body=[{x:800,y:650}];g.projectiles=[{type:'potion',from:{x:100,y:200},to:{x:200,y:200},born:0,duration:1}];
 g.age=.5;g.updateHazards(.01);assert.equal(g.puddles.length,0);g.age=1;g.updateHazards(.01);assert.equal(g.puddles[0].radius,52);assert.equal(g.puddles[0].until,13);
});
test('special-item test spawn cycles through the six special foods',()=>{
 const g=fresh();g.food=[];for(let i=0;i<6;i++)assert(g.spawnSpecial());assert.deepEqual(g.food.map(p=>p.kind),[FOOD.TOMATO,FOOD.CHILI,FOOD.BLUEBERRY,FOOD.EGGPLANT,FOOD.BEER,FOOD.GOLDEN_APPLE]);
});

test('flying throws ignore enemies food attacks blades and explosions until landing',()=>{
 for(const type of ['shoe','potion'])for(const target of ['enemy','food','shot','blade','blast']){
  const g=fresh();g.food=[];g.body=[{x:800,y:650}];g.age=.5;
  const p={type,from:{x:100,y:200},to:{x:200,y:200},born:0,duration:1};g.projectiles=[p];g.updateHazards(.001);
  const at={x:p.x,y:p.y};
  if(target==='enemy')g.enemies=[{...at,kind:0,born:0}];
  if(target==='food')g.food=[{...at,kind:0}];
  if(target==='shot')g.projectiles.push({...at,type:'tooth',vx:0,vy:0,born:0});
  if(target==='blade'){g.body=[{x:at.x-24,y:at.y}];g.armed=true;g.updateBlade();assert(g.armed);}
  if(target==='blast')g.explode(at);
  g.updateHazards(.001);assert(g.projectiles.includes(p));assert(!g.dead);assert.equal(g.puddles.length,0);
  if(target==='enemy')assert.equal(g.enemies.length,1);
  if(target==='food')assert.equal(g.food.length,1);
  if(target==='shot')assert.equal(g.projectiles.length,2);
 }
});
test('returning boomerang never kills its owner',()=>{
 const g=fresh();g.food=[];g.body=[{x:800,y:650}];const e={x:100,y:100,kind:3,born:0};g.enemies=[e];
 g.projectiles=[{type:'boomerang',from:{x:122,y:100},to:{x:200,y:100},born:0,duration:1,owner:e,leftOwner:true}];g.age=.98;g.updateHazards(.001);assert(g.enemies.includes(e));assert.equal(g.projectiles.length,1);
});
test('beer replaces buffs with temporary orange steering wobble',()=>{
 const g=fresh();g.food=[];g.setBuff('red',10);g.eatFood({kind:FOOD.BEER});assert.equal(g.buffKind,'orange');assert(!g.invincible);g.step(.1);assert(Math.abs(g.angle)>.01);g.age=g.buff.until+.1;assert.equal(g.buffKind,null);
});
test('basic enemies move at 94 percent and dominate the spawn mix',()=>{
 const g=fresh();g.food=[];const e={x:100,y:200,kind:0};g.enemies=[e];g.updateEnemy(e,.1);assert(Math.abs(e.x-111.75)<.001);
 let basic=0;for(let i=0;i<1000;i++)if(g.chooseEnemyKind()===0)basic++;assert(basic>420&&basic<540);
});
test('nerd does not tunnel through the snake body while rushing',()=>{
 const g=fresh();g.food=[];g.body=[{x:440,y:200},...Array.from({length:80},(_,i)=>({x:300,y:40+i*8}))];
 const e={x:100,y:200,kind:4,state:'dash',side:0,aim:{x:483,y:200},until:20};g.enemies=[e];
 for(let i=0;i<180;i++){g.age+=.01;g.updateEnemy(e,.01);assert(!g.enemyBlocked(e,e));}
});

test('tomato speeds up, crosses its own body and gives 1.5 seconds of expiry protection',()=>{
 const g=fresh();g.setBuff('rainbow',10);assert.equal(g.currentSpeed,162.5);
 g.body=[{x:440,y:200},{x:420,y:200},{x:420,y:220},{x:460,y:220},{x:442,y:200}];g.step(.01);assert(!g.dead);assert(g.body[0].x>440);
 g.age=10.1;assert(g.invincible);assert.equal(g.currentSpeed,125);g.age=11.51;assert(!g.invincible);
});
test('golden apple gives five points and summons fifteen enemies',()=>{
 const g=fresh();g.food=[];g.eatFood({kind:FOOD.GOLDEN_APPLE});assert.equal(g.score,5);assert.equal(g.enemies.length,15);
});
test('blueberry periodically fires forward bullets that do not hurt the player',()=>{
 const g=fresh();g.food=[];g.eatFood({kind:FOOD.BLUEBERRY});g.step(.01);assert.equal(g.projectiles.length,1);assert.equal(g.projectiles[0].type,'blue');assert.equal(g.projectiles[0].vx,360);
 g.step(.3);assert.equal(g.projectiles.length,3);assert(!g.dead);
 g.projectiles=[{type:'blue',...g.body[0],vx:0,vy:0,born:g.age}];g.updateHazards(.01);assert(!g.dead);
 g.age=8.1;g.projectiles=[];g.step(.01);assert.equal(g.projectiles.length,0);
});
test('blue bullets defeat ordinary enemies but lose to attacks and cannot kill bosses',()=>{
 for(const target of ['enemy','shot','boss']){
 const g=fresh();g.food=[];g.projectiles=[{type:'blue',x:100,y:100,vx:0,vy:0,born:0}];
 if(target==='shot')g.projectiles.push({type:'tooth',x:100,y:100,vx:0,vy:0,born:0});
 else g.enemies=[{x:100,y:100,kind:target==='boss'?6:0,born:0}];
 g.updateHazards(.001);assert.equal(g.projectiles.length,target==='shot'?1:0);assert.equal(g.enemies.length,target==='boss'?1:0);
 }
});
test('boss randomly selects radial barrage, orbit machine gun and aimed fan',()=>{
 const g=fresh();g.food=[];const e={x:200,y:300,kind:6,until:0};g.enemies=[e];g.random=()=>.05;g.updateBoss(e,.01);assert.equal(e.pattern,0);assert.equal(g.projectiles.length,14);
 g.age=6.1;g.projectiles=[];g.random=()=>.4;g.updateBoss(e,.01);assert.equal(e.pattern,1);assert.equal(g.projectiles.length,1);const a=e.orbitAngle;g.age+=.2;g.updateBoss(e,.2);assert(e.orbitAngle>a);assert.equal(g.projectiles.length,2);
 g.age=12.2;g.projectiles=[];g.random=()=>.75;g.updateBoss(e,.01);assert.equal(e.pattern,2);assert.equal(g.projectiles.length,5);
});

test('teeth and blue bullets are silent on terrain collisions',()=>{
 for(const type of ['tooth','blue']){const g=fresh({obstacles:[{x:100,y:90,w:20,h:30}]});g.food=[];g.projectiles=[{type,x:101,y:100,vx:0,vy:0,born:0}];g.updateHazards(.01);assert.equal(g.projectiles.length,0);assert(g.events.filter(e=>e.type==='impact').every(e=>e.silent));}
});
test('teeth destroy enemies silently while blue shots retain destruction audio',()=>{
 for(const type of ['tooth','blue']){const g=fresh();g.food=[];g.enemies=[{x:100,y:100,kind:0,born:0}];g.projectiles=[{type,x:100,y:100,vx:0,vy:0,born:0}];g.updateHazards(.01);assert.equal(g.enemies.length,0);assert.equal(g.events.find(e=>e.type==='defeat').silent,type==='tooth');}
});
test('blue and boss fire emit distinct firing cues; shoe emits one landing cue',()=>{
 const g=fresh();g.food=[];g.eatFood({kind:FOOD.BLUEBERRY});g.step(.01);assert(g.events.some(e=>e.type==='blue-shot'));
 const boss={x:100,y:100,kind:6,until:0};g.updateBoss(boss,.01);assert(g.events.some(e=>e.type==='tooth-shot'));
 g.projectiles=[{type:'shoe',from:{x:100,y:100},to:{x:200,y:100},born:0,duration:1}];g.age=1;g.updateHazards(.01);g.updateHazards(.01);assert.equal(g.events.filter(e=>e.type==='shoe-land').length,1);
});

test('natural enemy mix follows 50/10/10/10/10/10 weighting',()=>{
 const g=fresh(),counts=[0,0,0,0,0,0];for(let i=0;i<1000;i++){g.random=()=>(i+.5)/1000;counts[g.chooseEnemyKind()]++;}assert.deepEqual(counts,[500,100,100,100,100,100]);
});
test('potion throws expose a distinct glass cue',()=>{const g=fresh();g.food=[];g.toss({x:100,y:100},'potion');assert.equal(g.events.at(-1).attack,'potion');});

test('golden apple uses the ordinary weighted enemy chooser for all fifteen summons',()=>{
 const g=fresh();let chosen=0;const got=[];g.chooseEnemyKind=()=>chosen++%6;g.spawnEnemy=(kind,bonus)=>{got.push([kind,bonus]);return true;};g.eatFood({kind:FOOD.GOLDEN_APPLE});assert.equal(chosen,15);assert.deepEqual(got.map(v=>v[0]),Array.from({length:15},(_,i)=>i%6));assert(got.every(v=>v[1]));
});

test('all ordinary colored effects replace both color and mechanics',()=>{
 const kinds=['red','blue','orange','purple','green'];
 for(const from of kinds)for(const to of kinds){const g=fresh();g.setBuff(from,8);g.setBuff(to,8);assert.equal(g.buffKind,to);assert.equal(g.slowUntil>g.age,to==='green');assert.equal(g.freezeUntil>g.age,to==='purple');if(to!=='purple')assert(g.currentSpeed>0);}
});
test('rainbow combines with food colors, resets duration, and still rejects potion',()=>{
 const g=fresh();g.setBuff('rainbow',10);g.age=2;
 for(const kind of ['red','blue','orange','purple']){assert.equal(g.setBuff(kind,8),true);assert.equal(g.buffKind,'rainbow');assert.equal(g.buff.until,12);assert.equal(g.combo,kind);assert(g.currentSpeed>125);}
 assert.equal(g.setBuff('green',8),false);g.age=12.1;assert(g.invincible);g.setBuff('green',8);assert.equal(g.buffKind,'green');assert(g.invincible);
});

test('potion pools cancel blue fire and eggplant freezing',()=>{
 for(const kind of ['blue','purple','red','orange']){const g=fresh();g.food=[];g.setBuff(kind,8);g.puddles=[{...g.body[0],radius:52,until:12}];g.step(.01);assert.equal(g.buffKind,'green');assert.equal(g.freezeUntil,0);assert.equal(g.projectiles.length,0);assert(g.currentSpeed>0&&g.currentSpeed<100);}
});
test('nerd chooses and updates targets in the rear half plane',()=>{
 const g=fresh();g.food=[];const e={x:100,y:500,kind:4};g.enemies=[e];
 for(const angle of [0,.6,Math.PI/2,Math.PI,-Math.PI/2]){g.angle=angle;assert(g.nerdAim(e,true));const h=g.body[0];assert((e.aim.x-h.x)*Math.cos(angle)+(e.aim.y-h.y)*Math.sin(angle)<=.000001);assert(!g.enemyBlocked(e,e.aim));}
});
test('nerd face contact kills it but the raised finger is decoration only',()=>{
 for(const finger of [false,true]){const g=fresh();g.food=[];g.age=3;g.length=g.goalLength=200;g.body=Array.from({length:81},(_,i)=>({x:440-i*2,y:200}));const e={x:350,y:finger?225:210,kind:4,born:0,until:30};g.enemies=[e];g.step(.001);assert(!g.dead);assert.equal(g.enemies.includes(e),finger);assert.equal(g.kills,finger?0:1);}
});

test('one-shot route goes around a wall without crossing it',()=>{
 const obstacle={x:250,y:100,w:80,h:400};const blocked=p=>touches(p,10,obstacle)||p.x<12||p.y<12||p.x>888||p.y>688;
 const route=planRoute({x:100,y:350},{x:600,y:350},blocked,900,700);assert(route&&route.length>1);
 let prev={x:100,y:350};for(const p of route){const n=Math.ceil(Math.hypot(p.x-prev.x,p.y-prev.y));for(let i=1;i<=n;i++)assert(!blocked({x:prev.x+(p.x-prev.x)*i/n,y:prev.y+(p.y-prev.y)*i/n}));prev=p;}
 assert.deepEqual(route.at(-1),{x:600,y:350});
});
test('nerd keeps its original destination and path when the player turns or moves',()=>{
 const g=fresh();g.food=[];g.age=4;const e={x:50,y:600,kind:4,until:0,born:0};g.enemies=[e];g.updateEnemy(e,.01);assert.equal(e.state,'dash');const aim={...e.aim},path=JSON.stringify(e.route);
 g.body=[{x:700,y:100}];g.angle=Math.PI;g.age+=.001;g.updateEnemy(e,.001);assert.deepEqual(e.aim,aim);assert.equal(JSON.stringify(e.route),path);
});
test('nerd stops instead of sliding around a new obstacle or continuing a chase',()=>{
 const g=fresh();g.food=[];g.body=[{x:800,y:600}];g.obstacles=[{x:130,y:70,w:50,h:60}];const e={x:100,y:100,kind:4,state:'dash',route:[{x:300,y:100}],aim:{x:300,y:100},until:20};g.enemies=[e];g.updateEnemy(e,.1);assert.equal(e.state,'idle');assert.equal(e.y,100);const x=e.x;g.updateEnemy(e,.2);assert.equal(e.x,x);
});
test('nerd brakes near the player and dies when the body moves into it',()=>{
 const g=fresh();g.food=[];g.body=[{x:200,y:100}];const e={x:100,y:100,kind:4,born:0,state:'dash',route:[{x:250,y:100}],until:20};g.enemies=[e];g.updateEnemy(e,.2);assert.equal(e.state,'idle');assert(e.x<=150);assert(!g.dead);
 g.age=3;g.body=[{x:500,y:500},{x:e.x-20,y:e.y},{x:e.x+20,y:e.y}];g.length=g.goalLength=1000;g.step(.001);assert(!g.dead);assert(!g.enemies.includes(e));
});

test('nerd coming from the front plans around the player to its rear',()=>{
 const g=fresh();g.food=[];g.body=[{x:440,y:300}];g.angle=0;g.age=3;g.random=()=>.5;const e={x:650,y:300,kind:4,born:0,until:0};g.enemies=[e];g.updateEnemy(e,.01);assert.equal(e.state,'dash');assert(e.aim.x<440);
 for(let i=0;i<300&&e.state==='dash';i++){g.age+=.005;g.updateEnemy(e,.005);assert(Math.hypot(e.x-440,e.y-300)>50);}
 assert.equal(e.state,'idle');assert(e.x<440);assert(!g.dead);
});

test('failed food and knife placement retries are throttled',()=>{
 const g=fresh();g.food=[];let attempts=0;g.freePoint=()=>{attempts++;return null;};g.refill();for(let i=0;i<100;i++)g.refill();assert.equal(attempts,1);g.age=.51;g.refill();assert.equal(attempts,2);
 g.enemies=[{kind:6,x:100,y:100}];g.ensureKnife();const n=attempts;for(let i=0;i<100;i++)g.ensureKnife();assert.equal(attempts,n);
});
test('pending nerd route uses one snapshot and ignores a result after the nerd dies',async()=>{
 let resolve,calls=0;const g=fresh({routePlanner:()=>{calls++;return new Promise(r=>resolve=r);}});g.food=[];g.age=3;const e={x:50,y:600,kind:4,born:0,until:0};g.enemies=[e];g.updateEnemy(e,.01);assert.equal(e.state,'planning');const aim={...e.aim};g.angle=Math.PI;for(let i=0;i<10;i++)g.updateEnemy(e,.01);assert.equal(calls,1);assert.deepEqual(e.aim,aim);g.killEnemy(e,'body');resolve([aim]);await Promise.resolve();assert(!g.enemies.includes(e));assert.notEqual(e.state,'dash');
});


test('untriggered bombs persist beyond the previous lifetime',()=>{
 const g=fresh();g.age=300;const bomb={x:50,y:650,born:0,armed:null};g.bombs=[bomb];g.updateHazards(.01);assert.equal(g.bombs[0],bomb);assert.equal(bomb.armed,null);
});
test('enemy spawning has no population ceiling for regular or bonus waves',()=>{
 const g=fresh();g.freePoint=()=>({x:50,y:600});
 for(let i=0;i<150;i++)assert(g.spawnEnemy(0,i%2===0));assert.equal(g.enemies.length,150);
 g.updateEnemy=()=>{};g.age=500;g.nextEnemy=0;g.nextBoss=Infinity;g.nextRefill=Infinity;g.musicPads.nextPlacement=Infinity;g.step(.01);assert.equal(g.enemies.length,151);
});


test('boss starts at two minutes and death does not postpone the next ninety-second slot',()=>{
 const g=fresh();g.arena.order=[6,7,8,9];assert.equal(g.nextBoss,120);g.age=120;assert(g.spawnBoss());assert.equal(g.nextBoss,210);g.age=160;g.killEnemy(g.enemies.find(e=>e.kind===6),'knife');assert.equal(g.nextBoss,210);
});
test('boss drops three tomatoes that slide apart, slow down and stop outside cards',()=>{
 const g=fresh();g.food=[];g.obstacles=[{x:440,y:180,w:20,h:40}];const boss={x:400,y:200,kind:6};g.enemies=[boss];assert(g.killEnemy(boss,'knife'));assert.equal(g.food.length,3);assert(g.food.every(p=>p.kind===FOOD.TOMATO&&p.slide));
 g.age+=.2;g.slideFood();const first=g.food.map(p=>Math.hypot(p.x-400,p.y-200));assert(first.every(d=>d>0));g.age+=.2;g.slideFood();g.food.forEach((p,i)=>assert(Math.hypot(p.x-400,p.y-200)-first[i]<first[i]));
 g.age+=1;g.slideFood();assert(g.food.every(p=>!p.slide&&!g.blocked(p,12)));assert.equal(new Set(g.food.map(p=>p.x+','+p.y)).size,3);
});

test('nerd finger cannot kill the head and rainbow still protects head contact',()=>{
 const g=fresh();g.age=3;g.enemies=[{x:g.body[0].x+23,y:g.body[0].y-1,kind:4,born:0,until:30}];g.step(.001);assert(!g.dead);
 const h=fresh();h.age=3;h.setBuff('rainbow',10);h.enemies=[{...h.body[0],kind:4,born:0,until:30}];h.step(.001);assert(!h.dead);assert.equal(h.enemies.length,0);
});


test('eggplant locks heading and resumes along its original direction without queued turns',()=>{
 const g=fresh();g.food=[];g.nextRefill=Infinity;g.nextEnemy=Infinity;g.angle=g.target=.37;g.setBuff('purple',1.1);const origin={...g.body[0]};
 for(let i=0;i<100;i++){g.target=2;g.step(.01);assert.equal(g.angle,.37);}assert.deepEqual(g.body[0],origin);
 g.step(.12);assert.equal(g.angle,.37);assert.equal(g.target,.37);assert(g.body[0].x>origin.x);
 g.target=1;g.step(.03);assert(g.angle>.37);
});
