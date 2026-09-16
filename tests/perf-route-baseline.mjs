import {SnakeGame} from '../dist/snake-engine.mjs';
import {planRoute} from '../dist/navigation.mjs';
import {planSnapshotRoute} from '../dist/navigation-snapshot.mjs';
const g=new SnakeGame({width:1000,height:800,origin:{x:800,y:400},obstacles:[{x:490,y:0,w:20,h:800}]});g.food=[];g.body=Array.from({length:600},(_,i)=>({x:750+Math.sin(i/40)*20,y:100+i*.8}));const e={x:100,y:400,aim:{x:800,y:700},kind:4};g.enemies=[e];
let t=performance.now();const before=planRoute(e,e.aim,p=>g.enemyBlocked(e,p),1000,800);const oldMs=performance.now()-t;
t=performance.now();const after=planSnapshotRoute(g.routeSnapshot(e));const newMs=performance.now()-t;
console.log(JSON.stringify({case:'blocked route, 600 body samples',beforeMs:Math.round(oldMs),afterMs:Math.round(newMs),speedup:Math.round(oldMs/newMs),sameResult:before===null&&after===null}));
