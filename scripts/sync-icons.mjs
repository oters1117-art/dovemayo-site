// 메인 페이지(dist/index.html) 카드 아이콘을 icons/*.svg 에서 넣는다. 아이콘을 고치려면 icons/ 의 파일을 편집기로 고치고 이 스크립트를 돌린 뒤 배포한다.
// Usage: node scripts/sync-icons.mjs            (icons/*.svg → dist/index.html)
//        node scripts/sync-icons.mjs --extract  (dist/index.html → icons/*.svg, 처음 한 번 뽑을 때)
// 파일의 맨 바깥 <svg> 에 적힌 선 색·굵기는 편집기에서 보기 위한 것이고, 페이지에서는 카드의 CSS(글자색, 굵기 1.65 / 작업물 1.8)를 쓴다.
// 맨 바깥 stroke-width 를 기본과 다르게 바꾸면 그 굵기가 페이지에도 들어간다. 안쪽 도형에 직접 칠한 색·굵기는 그대로 나온다.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const pageUrl=new URL('dist/index.html',root),iconDir=new URL('icons/',root);
// 카드 class → 파일 이름
const ICONS={blog:'blog',instagram:'instagram',twitter:'x-twitter',youtube:'youtube',chzzk:'chzzk',gallery:'gallery',
  character:'character',names:'names','snake-start':'snake',reincarnation:'reborn',music:'music'};
const PROJECT=new Set(['character','names','snake-start','reincarnation','music']);
const width=(cls)=>PROJECT.has(cls)?'1.8':'1.65';
let page=readFileSync(pageUrl,'utf8');
const cardRe=/(<(a|button) [^>]*class="card ([^"]*)"[^>]*>)([\s\S]*?)(<\/\2>)/g;
const extract=process.argv.includes('--extract');
let n=0;
page=page.replace(cardRe,(all,open,tag,classes,inner,close)=>{
  const cls=classes.split(/\s+/).find((c)=>ICONS[c]);
  if(!cls) return all;
  const m=inner.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/);
  if(!m) return all;
  const file=new URL(ICONS[cls]+'.svg',iconDir);
  if(extract){
    writeFileSync(file,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" color="#242424" stroke="#242424" stroke-width="'+width(cls)+'" stroke-linecap="round" stroke-linejoin="round">\n'+m[1].replace(/></g,'>\n<')+'\n</svg>\n');
    n++;return all;
  }
  const src=readFileSync(file,'utf8');
  const s=src.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/);
  if(!s) throw new Error(ICONS[cls]+'.svg 에서 <svg> 를 찾지 못했습니다');
  const vb=(s[1].match(/viewBox="([^"]*)"/)||[,'0 0 32 32'])[1];
  const sw=(s[1].match(/stroke-width="([^"]*)"/)||[])[1];
  const style=sw&&sw!==width(cls)?' style="stroke-width:'+sw+'"':'';
  // 편집기가 붙인 id(클립·그라데이션 등)는 아이콘마다 앞에 이름을 붙여 페이지 안에서 겹치지 않게 한다
  const pre='icon-'+ICONS[cls]+'-';
  const body=s[2].trim().replace(/\s*\n\s*/g,'')
    .replace(/\bid="([^"]+)"/g,(_,id)=>'id="'+pre+id+'"')
    .replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+pre+id+')')
    .replace(/(xlink:href|href)="#([^"]+)"/g,(_,a,id)=>a+'="#'+pre+id+'"');
  n++;
  return open+inner.replace(m[0],()=>'<svg viewBox="'+vb+'" aria-hidden="true"'+style+'>'+body+'</svg>')+close;
});
if(!extract) writeFileSync(pageUrl,page);
const unused=readdirSync(iconDir).filter((f)=>f.endsWith('.svg')&&!Object.values(ICONS).includes(f.replace(/\.svg$/,'')));
console.log((extract?'뽑은':'넣은')+' 아이콘 '+n+'개'+(unused.length?' / 쓰지 않는 파일: '+unused.join(', '):''));
