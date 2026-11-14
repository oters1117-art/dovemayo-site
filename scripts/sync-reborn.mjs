// Copies the random reincarnation page (X:/AI/rand_rein) into dist/reborn/.
// Usage: node scripts/sync-reborn.mjs [path to the page's repository]
import {copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const src=process.argv[2]||'X:/AI/rand_rein';
const dest=join(dirname(fileURLToPath(import.meta.url)),'..','dist','reborn');
if(!existsSync(join(src,'index.html'))){console.error('reincarnation page not found at '+src);process.exit(1);}
mkdirSync(dest,{recursive:true});
copyFileSync(join(src,'index.html'),join(dest,'index.html'));
console.log('reborn: 1 file -> dist/reborn/');
