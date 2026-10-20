// Development-only adapter. This file is NEVER included in the hosted Worker.
import http from 'node:http';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync,mkdirSync} from 'node:fs';import {randomUUID} from 'node:crypto';import path from 'node:path';import worker from '../dist/server/index.js';
const file=process.env.DB_PATH||'.local/hosted.sqlite';mkdirSync(path.dirname(file),{recursive:true});const sqlite=new DatabaseSync(file);sqlite.exec('PRAGMA foreign_keys=ON;CREATE TABLE IF NOT EXISTS _preview_migrations(name TEXT PRIMARY KEY)');
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){if(sqlite.prepare('SELECT name FROM _preview_migrations WHERE name=?').get(name))continue;sqlite.exec(readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO _preview_migrations VALUES(?)').run(name)}
export const DB = {
  prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return {results: sqlite.prepare(sql).all(...args)}; },
      async run() { const r = sqlite.prepare(sql).run(...args); return {success: true, meta: {changes: Number(r.changes)}}; }
    };
  }
};
const sessions=new Map();const server=http.createServer(async(req,res)=>{try{const host=req.headers.host;if(!['127.0.0.1','localhost','[::1]'].includes(new URL('http://'+host).hostname))throw new Error('Loopback only');const url='http://'+host+req.url;let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)throw new Error('Body too large')}
if(req.url==='/_preview/login'&&req.method==='POST'){const body=JSON.parse(raw);const key=randomUUID();sessions.set(key,{id:body.email,email:body.email,name:body.name});res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':`forge_preview=${key}; HttpOnly; SameSite=Lax; Path=/`});return res.end('{}')}
const h=new Headers();for(const [k,v] of Object.entries(req.headers)){if(!k.startsWith('oai-authenticated-user-')&&k!=='content-length'&&typeof v==='string')h.set(k,v)}const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('forge_preview='))?.split('=')[1];const user=sessions.get(token);if(user){h.set('oai-authenticated-user-id',user.id);h.set('oai-authenticated-user-email',user.email);h.set('oai-authenticated-user-full-name',encodeURIComponent(user.name));h.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8')}
const response=await worker.fetch(new Request(url,{method:req.method,headers:h,...(['GET','HEAD'].includes(req.method)?{}:{body:raw})}),{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Preview request failed')}});server.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Forge hosted preview on http://127.0.0.1:'+(process.env.PORT||3001)));
