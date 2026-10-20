import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const assets=Object.fromEntries([['/','index.html','text/html; charset=utf-8'],['/app.js','app.js','text/javascript; charset=utf-8'],['/style.css','style.css','text/css; charset=utf-8']].map(([url,file,type])=>[url,{type,body:readFileSync(path.join(root,'public',file),'utf8')}]));
const source=readFileSync(path.join(root,'worker/index.js'),'utf8').replace('/* FORGE_ASSETS */ {}',JSON.stringify(assets));
const out=path.join(root,'dist');rmSync(out,{recursive:true,force:true});mkdirSync(path.join(out,'server'),{recursive:true});mkdirSync(path.join(out,'.openai'),{recursive:true});writeFileSync(path.join(out,'server/index.js'),source);cpSync(path.join(root,'.openai/hosting.json'),path.join(out,'.openai/hosting.json'));cpSync(path.join(root,'drizzle'),path.join(out,'.openai/drizzle'),{recursive:true});console.log('Hosted Worker built in dist/');
