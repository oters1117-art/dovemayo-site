// Copies the random name generator (X:/AI/이름생성기) into dist/name/.
// Usage: node scripts/sync-names.mjs [path to the generator]
import {copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const src=process.argv[2]||'X:/AI/이름생성기';
const dest=join(dirname(fileURLToPath(import.meta.url)),'..','dist','name');
if(!existsSync(join(src,'index.html'))){console.error('name generator not found at '+src);process.exit(1);}
mkdirSync(dest,{recursive:true});
for(const f of ['index.html','names-data.js'])copyFileSync(join(src,f),join(dest,f));
console.log('name: 2 files -> dist/name/');
