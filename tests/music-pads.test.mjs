import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicPads,PadMusicPlayer} from '../dist/music-pads.mjs';
import {SnakeGame,FOOD} from '../dist/snake-engine.mjs';
function fixture(){const pads=new MusicPads(80);pads.pads=[{kind:'play',x:100,y:100,contacts:new Set(),flashUntil:0}];pads.nextPlacement=100;const game={age:2,body:[{x:300,y:300}],enemies:[],events:[],random:()=>.4,enemyRadius:()=>10,freePoint:()=>null};return {pads,game,step:()=>pads.update(game)};}
test('play is a reusable player-only pad, toggles once per visit and chooses numbered track',()=>{
 const {pads,game,step}=fixture();game.enemies=[{x:100,y:100,born:0}];step();assert(!pads.active);
 game.body[0]={x:100,y:100};step();assert(pads.active);assert.equal(pads.track,3);assert.equal(game.events.length,1);step();assert.equal(game.events.length,1);
 game.body[0]={x:200,y:200};step();game.body[0]={x:100,y:100};step();assert(!pads.active);assert.equal(pads.pads.length,1);assert.equal(game.events.at(-1).type,'music-stop');
});
test('player and enemies adjust music by ten per entry; stop removes volume pads but keeps level',()=>{
 const {pads,game,step}=fixture();pads.active=true;pads.pads.push({kind:'plus',x:200,y:200,contacts:new Set(),flashUntil:0},{kind:'minus',x:250,y:250,contacts:new Set(),flashUntil:0});
 const enemy={x:200,y:200,born:0};game.enemies=[enemy];step();assert.equal(pads.volume,90);assert(pads.pads[1].flashUntil>game.age);step();assert.equal(pads.volume,90);
 enemy.x=400;step();enemy.x=200;step();assert.equal(pads.volume,100);game.body[0]={x:250,y:250};step();assert.equal(pads.volume,90);pads.stop();assert.equal(pads.volume,90);assert.deepEqual(pads.pads.map(p=>p.kind),['play']);
});
test('music streams on demand, preserves volume and finishes without advancing playlist',async()=>{
 const handlers={};let plays=0,stops=0;const audio={addEventListener(k,f){handlers[k]=f},pause(){},play(){plays++;return Promise.resolve()},removeAttribute(){this.src=''},load(){}};
 const player=new PadMusicPlayer({createAudio:()=>audio,onStop:()=>stops++});assert.equal(audio.volume,.5);assert.equal(audio.src,undefined);assert.equal(audio.preload,'none');
 await player.play(6);assert.equal(audio.src,'/music/6.mp3');player.setVolume(50);player.stop();await player.play(2);assert.equal(audio.volume,.5);assert.equal(audio.src,'/music/2.mp3');handlers.ended();assert.equal(stops,1);assert.equal(plays,2);assert.equal(audio.src,'');
 player.setVolume(110);assert.equal(audio.volume,1);player.setVolume(-10);assert.equal(audio.volume,0);
});
test('failed music playback resets pad state',async()=>{
 let stopped=false;const player=new PadMusicPlayer({createAudio:()=>({addEventListener(){},pause(){},play(){return Promise.reject(Error('blocked'))},removeAttribute(){},load(){}}),onStop:()=>stopped=true});await player.play(1);assert(stopped);
});
test('golden apple grows five normal food lengths and gives five points',()=>{
 const g=new SnakeGame({width:900,height:700,origin:{x:100,y:100}});g.spawnEnemy=()=>true;const length=g.goalLength;g.eatFood({kind:FOOD.GOLDEN_APPLE});assert.equal(g.goalLength-length,120);assert.equal(g.score,5);
});


test('track end hands off to next playback without stopping or resetting volume',async()=>{
 const handlers={};let plays=0,stops=0;const audio={addEventListener(k,f){handlers[k]=f},pause(){},play(){plays++;return Promise.resolve()},removeAttribute(){},load(){}};
 const player=new PadMusicPlayer({createAudio:()=>audio,onStop:()=>stops++,onEnded:()=>player.play(4)});
 player.setVolume(60);await player.play(1);handlers.ended();await Promise.resolve();assert.equal(plays,2);assert.equal(audio.src,'/music/4.mp3');assert.equal(audio.volume,.6);assert.equal(stops,0);
});


test('volume limit hides only the saturated pad and restores it after reverse adjustment',()=>{
 for(const [volume,hidden,other] of [[100,'plus','minus'],[0,'minus','plus']]){
  const {pads,game,step}=fixture();pads.active=true;pads.volume=volume;pads.pads.push({kind:hidden,x:200,y:200,contacts:new Set(),flashUntil:0},{kind:other,x:250,y:250,contacts:new Set(),flashUntil:0});step();assert(!pads.pads.some(p=>p.kind===hidden));
  game.body[0]={x:250,y:250};step();assert.equal(pads.volume,volume===100?90:10);game.freePoint=()=>({x:400,y:400});step();assert(pads.pads.some(p=>p.kind===hidden));assert(pads.pads.some(p=>p.kind===other));
 }
});


test('default volume is fifty and volume labels survive disappearing pads then expire',()=>{
 assert.equal(new MusicPads().volume,50);const {pads,game,step}=fixture();pads.active=true;pads.volume=90;pads.pads.push({kind:'plus',x:200,y:200,contacts:new Set(),flashUntil:0});game.body[0]={x:200,y:200};step();assert.equal(pads.labels[0].volume,100);assert.equal(pads.labels[0].color,'#71ad5e');assert(!pads.pads.some(p=>p.kind==='plus'));game.age+=1;step();assert.equal(pads.labels.length,0);
});
