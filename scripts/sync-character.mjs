// Copies the random character generator (a separate repo) into dist/character/.
// Usage: node scripts/sync-character.mjs [path to the generator]   (default X:\AI\캐릭터생성기)
// Only the page itself is copied: index.html, css/style.css and the four scripts.
// The generator's local-server tools (build button, item editor, file buttons) stay off
// on the site because app.js turns them on for localhost only.
import {copyFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const src=process.argv[2]||'X:\\AI\\캐릭터생성기';
const dest=join(dirname(fileURLToPath(import.meta.url)),'..','dist','character');
const files=['index.html','css/style.css','js/core.js','js/palettes.js','js/parts-data.js','js/app.js','js/prompt.js','fonts/dovemayo-gothic-latin.woff2'];

if(!existsSync(join(src,'index.html'))){console.error('generator not found at '+src);process.exit(1);}
let bytes=0;
for(const f of files){
  const to=join(dest,f);
  mkdirSync(dirname(to),{recursive:true});
  copyFileSync(join(src,f),to);
  bytes+=statSync(to).size;
}
console.log('character: '+files.length+' files, '+Math.round(bytes/1024)+' KB -> dist/character/');
