import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TouchSteering} from '../dist/touch-steering.mjs';
import assert from 'node:assert/strict';
const listeners={},animations=[],strokes=[];
const ctx=new Proxy({stroke(){strokes.push(this.strokeStyle)}},{get(t,k){return k in t?t[k]:(()=>{});}});
function element(){return {style:{getPropertyValue:()=>1,setProperty(){}},classList:{add(){},remove(){}},offsetHeight:800,hidden:false,textContent:'',setAttribute(){},listeners:{},addEventListener(k,f){this.listeners[k]=f},setPointerCapture(){},getContext:()=>ctx,animate(){const a={paused:false,cancelled:false,pause(){this.paused=true},cancel(){this.cancelled=true}};animations.push(a);return a;},append(){},remove(){this.removed=true}}}
const elements=new Map(),body=element();
const document={body,fonts:{ready:Promise.resolve()},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},createElement:element,addEventListener(k,f){listeners[k]=f}};
let stopped=0,now=100;
const sandbox={comboPaper:()=> '#f1eeee',shockLift:()=>0,comboInk:()=>null,GameMetrics:class{end(){}},drawClouds(){},drawDynamite(){},FinaleMusic:class{pause(){}stop(){}setMuted(){}},drawExpansion(){},drawExpansionEnemy(){return false},drawExpansionShot(){return false},drawEnhancement(){},TouchSteering,document,window:{addEventListener(k,f){listeners[k]=f}},innerWidth:1000,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false}),PadMusicPlayer:class{pause(){}stop(){}},FoleySound:class{stopMusicCue(){}setUnderwater(x){this.underwater=x}play(){}unlock(){}},RoutePlanner:class{cancel(){stopped++}},clearInterval(){},cancelAnimationFrame(){},headingFromKeys:()=>99,performance:{now:()=>now},console};
vm.createContext(sandbox);
const source=readFileSync(new URL('../dist/snake.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
vm.runInContext(source+`;globalThis.test={set(g){game=g;mode='playing';score.hidden=false;dot.style.visibility='hidden';canvas.hidden=false},failure,end,advance,explosion,updateMusic,get(){return {game,mode,score,escapeKey,canvas,dot,sound,touchSurface,stick}}};`,sandbox);
const t=sandbox.test;
const game={age:65,score:9,body:[{x:200,y:200},{x:190,y:200}],angle:0,food:[],enemies:[],projectiles:[],puddles:[],bombs:[],buffKind:'rainbow',invincible:true,step(){throw Error('Dead game advanced')}};
t.set(game);t.explosion({x:100,y:100});t.failure();
let state=t.get();assert.equal(state.mode,'dead');assert.equal(state.game,game);assert.equal(state.score.textContent,'9\n01:05');assert.equal(state.escapeKey.hidden,false);assert.equal(state.canvas.hidden,false);assert.equal(state.dot.style.visibility,'hidden');assert.equal(strokes.at(-1),'#929294');assert.ok(animations.slice(0,3).every(a=>a.paused));assert.equal(animations.at(-1).paused,false);
t.advance(2000);listeners.visibilitychange();listeners.blur();t.updateMusic();assert.equal(state.sound.underwater,false);assert.equal(game.target,undefined);
listeners.keydown({key:'ArrowRight',repeat:true,target:{closest:()=>false},preventDefault(){}});assert.equal(t.get().mode,'dead');
listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(t.get().mode,'dead');now+=800;
listeners.keydown({key:'Enter',target:{closest:()=>false},preventDefault(){}});state=t.get();assert.equal(state.mode,'idle');assert.equal(state.game,null);assert.equal(state.score.hidden,true);assert.equal(state.score.textContent,'');assert.equal(state.escapeKey.hidden,true);assert.equal(state.canvas.hidden,true);assert.equal(state.dot.style.visibility,'');assert.ok(animations.every(a=>a.cancelled));assert.equal(stopped,2);
console.log('Death scene freezes, gray snake, paused effects, no background resume, Enter fully resets: passed');

for(const key of ['ArrowRight',' ','Shift','m','PrintScreen','Meta','s']){t.set(game);t.failure();now+=800;listeners.keydown({key,target:{closest:()=>false},preventDefault(){throw Error('Capture keys must remain available')}});assert.equal(t.get().mode,'dead');assert.equal(t.get().score.textContent,'9\n01:05');}
listeners.keydown({key:'Enter',ctrlKey:true,preventDefault(){throw Error('Modified Enter should not reset')}});assert.equal(t.get().mode,'dead');
listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(t.get().mode,'idle');

t.set(game);const touch=t.get().touchSurface;
touch.listeners.pointerdown({pointerId:1,clientX:100,clientY:100,preventDefault(){}});touch.listeners.pointermove({pointerId:1,clientX:100,clientY:150});assert.equal(game.touchTarget.x,100);assert.equal(game.touchTarget.y,150);
touch.listeners.pointerup({pointerId:1});assert.equal(game.touchTarget.y,150);assert.equal(t.get().stick.id,null);
let prevented=false;listeners.click({target:{closest:()=>true},preventDefault(){prevented=true},stopPropagation(){}});assert(prevented);t.end();prevented=false;listeners.click({target:{closest:()=>true},preventDefault(){prevented=true},stopPropagation(){}});assert(!prevented);
console.log('Touch gestures drive heading and gameplay blocks link clicks: passed');

t.set(game);t.failure();now+=800;listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(t.get().mode,'idle');
