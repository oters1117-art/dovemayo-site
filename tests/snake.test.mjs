import test from 'node:test';
import assert from 'node:assert/strict';
import {SnakeGame,turnToward,touches,headingFromKeys} from '../dist/snake-engine.mjs';
let seed=82;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const fresh=(extra={})=>new SnakeGame({width:900,height:700,origin:{x:440,y:200},random,...extra});
test('smooth steering is immediate, bounded, and reaches a quarter turn quickly',()=>{
 const g=fresh();g.target=Math.PI/2;g.step(1/60);assert(g.angle>0&&g.angle<Math.PI/2);
 for(let i=0;i<12;i++)g.step(1/60);assert(Math.abs(g.angle-Math.PI/2)<.001);assert(!g.dead);
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
 const a=fresh(),b=fresh();a.food=[];b.food=[];
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
test('food quantity and enemy spawn frequency scale with elapsed time',()=>{
 const g=fresh();g.age=100;g.refill();assert.equal(g.food.length,8);
 g.nextEnemy=0;g.step(.01);assert(g.nextEnemy-g.age<6.6);
});
test('cowboy marks, shakes, throws a shoe, then retreats',()=>{
 const g=fresh();g.age=2;const e={x:270,y:200,kind:1,born:0,state:'idle'};
 g.updateEnemy(e,.01);assert.equal(e.state,'mark');assert(e.aim);
 g.age=e.until+.01;g.updateEnemy(e,.01);assert.equal(e.state,'shake');
 g.age=e.until+.01;g.updateEnemy(e,.01);assert.equal(e.state,'recover');assert.equal(g.projectiles[0].type,'shoe');
 const x=e.x;g.updateEnemy(e,.1);assert(e.x<x);
});
test('shoe lands at its marked target and hits only on impact',()=>{
 const g=fresh();g.projectiles=[{type:'shoe',x:300,y:200,from:{x:300,y:200},to:{...g.body[0]},born:0,duration:.7}];
 g.age=.3;g.updateHazards(.01);assert(!g.dead);assert.equal(g.projectiles.length,1);
 g.age=.8;g.updateHazards(.01);assert(g.dead);assert(g.events.some(e=>e.type==='impact'));
});
test('scientist potion creates temporary slow ground and speed recovers',()=>{
 const g=fresh();g.projectiles=[{type:'potion',from:{x:300,y:200},to:{...g.body[0]},born:0,duration:.8}];
 g.age=1;g.updateHazards(.01);assert.equal(g.puddles.length,1);assert(g.slowUntil>g.age);assert(!g.dead);
 const before=g.body[0].x;g.step(.04);assert(Math.abs(g.body[0].x-before-125*.55*.04)<.01);
 g.age=10;g.updateHazards(.01);assert.equal(g.puddles.length,0);
 const x=g.body[0].x;g.step(.04);assert(Math.abs(g.body[0].x-x-125*.04)<.01);
});
test('angry enemy charges before throwing and boomerang returns',()=>{
 const g=fresh();g.age=2;const e={x:260,y:200,kind:3,born:0};g.enemies=[e];g.updateEnemy(e,.01);assert.equal(e.state,'charge');
 g.age=e.until+.01;g.updateEnemy(e,.01);assert.equal(g.projectiles[0].type,'boomerang');
 const p=g.projectiles[0];g.body=[{x:800,y:650}];g.age=p.born+p.duration*.5;g.updateHazards(.01);assert(Math.abs(p.x-p.to.x)<.01);
 g.age=p.born+p.duration*.9;g.updateHazards(.01);assert(Math.hypot(p.x-e.x,p.y-e.y)<60);
});
test('nerd contact is harmless and its burst is much faster than the snake',()=>{
 const g=fresh();g.age=3;const e={...g.body[0],kind:4,born:0,state:'idle',until:5};g.enemies=[e];g.step(.01);assert(!g.dead);
 e.state='dash';e.aim={x:e.x+100,y:e.y};e.until=4;const x=e.x;g.updateEnemy(e,.01);assert(Math.abs(e.x-x-4.8)<.01);
});
test('wink drops bombs; proximity arms, warns, then explodes',()=>{
 const g=fresh();g.age=3;const e={x:100,y:100,kind:5,born:0,until:0};g.updateEnemy(e,.01);assert.equal(g.bombs.length,1);
 const b=g.bombs[0];g.age=4;g.body=[{x:b.x+50,y:b.y}];g.updateHazards(.01);assert.equal(b.armed,4);assert(!g.dead);
 g.age=4.8;g.updateHazards(.01);assert(!g.dead);
 g.age=5;g.updateHazards(.01);assert(g.dead);assert(g.events.some(e=>e.type==='blast'));assert.equal(g.bombs.length,0);
});
