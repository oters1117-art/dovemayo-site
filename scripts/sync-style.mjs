import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../dist/',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const font=readFileSync(new URL('fonts/dovemayo-gothic-lowercase.woff2',root)).toString('base64');
const css=read('style.css').replace('/fonts/dovemayo-gothic-lowercase.woff2','data:font/woff2;base64,'+font);
writeFileSync(new URL('index.html',root),read('index.html').replace(/<!-- inline-style:start -->[\s\S]*?<!-- inline-style:end -->/,'<!-- inline-style:start -->\n<style>'+css+'</style>\n<!-- inline-style:end -->'));
