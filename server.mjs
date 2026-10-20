import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const dbfile=process.env.DB_PATH||path.join(root,'data/forge.sqlite');
mkdirSync(path.dirname(dbfile),{recursive:true});
const db=new DatabaseSync(dbfile);db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,location TEXT DEFAULT '',brings TEXT DEFAULT '',looking TEXT DEFAULT '',role TEXT DEFAULT 'Entrepreneur');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),title TEXT,category TEXT,location TEXT,stage TEXT,arrangement TEXT,description TEXT,needs TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS saved(user TEXT REFERENCES users(id),project TEXT REFERENCES projects(id) ON DELETE CASCADE,PRIMARY KEY(user,project));
CREATE TABLE IF NOT EXISTS interests(id TEXT PRIMARY KEY,user TEXT REFERENCES users(id),project TEXT REFERENCES projects(id) ON DELETE CASCADE,status TEXT DEFAULT 'pending',UNIQUE(user,project));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,interest TEXT REFERENCES interests(id) ON DELETE CASCADE,sender TEXT REFERENCES users(id),body TEXT,created TEXT);`);
function hash(p,s=randomBytes(16).toString('hex')){return s+':'+scryptSync(p,s,64).toString('hex')}
function verify(p,h){let [s,v]=h.split(':');return timingSafeEqual(Buffer.from(v,'hex'),scryptSync(p,s,64))}
function cleanUser(u){if(!u)return null;let {password,...rest}=u;return rest}
const stages=['Idea stage','Research & planning','Building','Operating'];
const arrangements=['Remote','Hybrid','On-site'];
function fail(status,message){throw Object.assign(new Error(message),{status})}
function text(v,max=5000){return typeof v==='string'?v.trim().slice(0,max):''}
const attempts=new Map();
function limit(ip){const now=Date.now();let x=attempts.get(ip);if(!x||now-x.at>600000){x={at:now,n:0};attempts.set(ip,x)}if(++x.n>30)fail(429,'Too many attempts. Try again later.');if(attempts.size>10000)attempts.clear()}
const server=http.createServer(async(req,res)=>{let status=200;const send=(s,v,headers={})=>{status=s;res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(v))};
try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
const url=new URL(req.url,'http://localhost');const p=url.pathname;const method=req.method;
if(!p.startsWith('/api/')){const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!files[p])return send(404,{error:'Not found'});res.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-cache'});return res.end(readFileSync(path.join(root,'public',files[p])))}
if(!['GET','HEAD'].includes(method)&&req.headers.origin){if(new URL(req.headers.origin).host!==req.headers.host)fail(403,'Cross-origin request rejected')}
let body={};if(['POST','PUT','PATCH','DELETE'].includes(method)){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)fail(413,'Request too large')}try{body=raw?JSON.parse(raw):{}}catch{fail(400,'Invalid JSON')}}
const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('forge_session='))?.split('=')[1];
const current=token?db.prepare('SELECT users.* FROM sessions JOIN users ON sessions.user=users.id WHERE token=? AND expires>?').get(token,Date.now()):null;
const cookie=(t,age=604800)=>`forge_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.COOKIE_SECURE==='1'?'; Secure':''}`;
if(p==='/api/health')return send(200,{ok:true});
if(p==='/api/auth/register'&&method==='POST'){limit(req.socket.remoteAddress);let email=text(body.email,254).toLowerCase(),name=text(body.name,100),pw=body.password;if(!/^\S+@\S+\.\S+$/.test(email)||!name||typeof pw!=='string'||pw.length<10||pw.length>128)fail(400,'Enter your name, a valid email and a password of 10–128 characters.');if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'This email is already registered.');const id=randomUUID();db.prepare('INSERT INTO users(id,email,password,name) VALUES(?,?,?,?)').run(id,email,hash(pw),name);const t=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(t,id,Date.now()+604800000);return send(201,{user:cleanUser(db.prepare('SELECT * FROM users WHERE id=?').get(id))},{'Set-Cookie':cookie(t)})}
if(p==='/api/auth/login'&&method==='POST'){limit(req.socket.remoteAddress);let u=db.prepare('SELECT * FROM users WHERE email=?').get(text(body.email).toLowerCase());if(!u||typeof body.password!=='string'||body.password.length>128||!verify(body.password,u.password))fail(401,'Incorrect email or password.');const t=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(t,u.id,Date.now()+604800000);return send(200,{user:cleanUser(u)},{'Set-Cookie':cookie(t)})}
if(p==='/api/me'&&method==='GET')return send(200,{user:cleanUser(current)});
if(!current)fail(401,'Sign in to continue.');
if(p==='/api/auth/logout'&&method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(token);return send(200,{ok:true},{'Set-Cookie':cookie('',0)})}
if(p==='/api/profile'&&method==='PUT'){const name=text(body.name,100),role=text(body.role);if(!name)fail(400,'Name is required.');if(!['Entrepreneur','Investor','Specialist'].includes(role))fail(400,'Choose a valid role.');db.prepare('UPDATE users SET name=?,location=?,brings=?,looking=?,role=? WHERE id=?').run(name,text(body.location,100),text(body.brings,2000),text(body.looking,2000),role,current.id);return send(200,{user:cleanUser(db.prepare('SELECT * FROM users WHERE id=?').get(current.id))})}
if(p==='/api/projects'&&method==='GET'){let rows=db.prepare(`SELECT p.*,u.name AS ownerName,EXISTS(SELECT 1 FROM saved WHERE user=? AND project=p.id) AS isSaved,(SELECT status FROM interests WHERE user=? AND project=p.id) AS interestStatus FROM projects p JOIN users u ON p.owner=u.id ORDER BY created DESC`).all(current.id,current.id);return send(200,{projects:rows})}
if(p==='/api/projects'&&method==='POST'){const fields=['title','category','location','stage','arrangement','description','needs'];const v=Object.fromEntries(fields.map(k=>[k,text(body[k],k==='description'?5000:300)]));if(fields.some(k=>!v[k]))fail(400,'Complete all project fields.');if(!stages.includes(v.stage)||!arrangements.includes(v.arrangement))fail(400,'Choose a valid stage and working arrangement.');let id=randomUUID();db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,current.id,...fields.map(k=>v[k]),new Date().toISOString());return send(201,{id})}
let m=p.match(/^\/api\/projects\/([^/]+)(?:\/(saved|interest))?$/);
if(m){let project=db.prepare('SELECT * FROM projects WHERE id=?').get(m[1]);if(!project)fail(404,'Project not found.');if(method==='DELETE'&&!m[2]){if(project.owner!==current.id)fail(403,'Only the owner can delete this project.');db.prepare('DELETE FROM projects WHERE id=?').run(project.id);return send(200,{ok:true})}if(m[2]==='saved'&&method==='POST'){let existing=db.prepare('SELECT 1 FROM saved WHERE user=? AND project=?').get(current.id,project.id);if(existing)db.prepare('DELETE FROM saved WHERE user=? AND project=?').run(current.id,project.id);else db.prepare('INSERT INTO saved VALUES(?,?)').run(current.id,project.id);return send(200,{saved:!existing})}if(m[2]==='interest'&&method==='POST'){if(project.owner===current.id)fail(400,'You cannot express interest in your own project.');db.prepare('INSERT OR IGNORE INTO interests(id,user,project) VALUES(?,?,?)').run(randomUUID(),current.id,project.id);return send(200,{ok:true})}}
if(p==='/api/interests'&&method==='GET'){return send(200,{interests:db.prepare(`SELECT i.*,p.title,p.owner,u.name AS applicantName,o.name AS ownerName FROM interests i JOIN projects p ON p.id=i.project JOIN users u ON u.id=i.user JOIN users o ON o.id=p.owner WHERE i.user=? OR p.owner=?`).all(current.id,current.id)})}
m=p.match(/^\/api\/interests\/([^/]+)(?:\/(messages))?$/);
if(m){const i=db.prepare('SELECT i.*,p.owner FROM interests i JOIN projects p ON p.id=i.project WHERE i.id=?').get(m[1]);if(!i)fail(404,'Request not found.');if(![i.user,i.owner].includes(current.id))fail(403,'You do not have access to this conversation.');if(!m[2]&&method==='PATCH'){if(i.owner!==current.id)fail(403,'Only the project owner can respond.');if(!['accepted','declined'].includes(body.status))fail(400,'Invalid response');if(i.status!=='pending')fail(409,'This request has already been answered.');db.prepare('UPDATE interests SET status=? WHERE id=?').run(body.status,i.id);return send(200,{ok:true})}if(m[2]){if(i.status!=='accepted')fail(403,'Messaging is available after a request is accepted.');if(method==='GET')return send(200,{messages:db.prepare('SELECT m.*,u.name AS senderName FROM messages m JOIN users u ON u.id=m.sender WHERE interest=? ORDER BY m.created,m.rowid').all(i.id)});if(method==='POST'){let msg=text(body.body,3000);if(!msg)fail(400,'Enter a message.');db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(randomUUID(),i.id,current.id,msg,new Date().toISOString());return send(201,{ok:true})}}}
send(404,{error:'Not found'});
}catch(e){send(e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'});if(!e.status)console.error(e)}});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Forge running at http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||3000}`));
