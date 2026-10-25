import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {d1Adapter} from './d1-adapter.mjs';
import worker from '../dist/server/index.js';

test('MCP messaging: accepted participants can exchange messages; privacy and validation enforced',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
  const DB=d1Adapter(sqlite);
  async function request(path,method,body,actor='owner'){
    const headers={'Content-Type':'application/json'};
    if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@qa.example'}
    const response=await worker.fetch(new Request('https://forge.example'+path,{method,headers,...(method==='GET'?{}:{body:JSON.stringify(body)})}),{DB});
    return {status:response.status,data:await response.json()};
  }
  async function tool(name,args,actor='owner'){
    const r=await request('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},actor);
    assert.equal(r.status,200);
    return r.data.result;
  }
  function content(result){return JSON.parse(result.content[0].text)}
  try{
    const p=await request('/api/projects','POST',{title:'TEST — messaging QA',category:'Tech startup',location:'Toronto',stage:'Idea stage',arrangement:'Remote',description:'Isolated QA only',needs:'Co-founder'});
    await request('/api/projects/'+p.data.id+'/interest','POST',{},'partner');
    const interest=(await request('/api/interests','GET')).data.interests[0].id;
    for(const name of ['forge_get_messages','forge_send_message']){
      const args=name==='forge_get_messages'?{interest_id:interest}:{interest_id:interest,body:'Before acceptance'};
      assert.equal((await tool(name,args)).isError,true,'Pending matches must reject '+name);
    }
    await request('/api/interests/'+interest,'PATCH',{status:'accepted'});
    const receipt=await tool('forge_send_message',{interest_id:interest,body:'Hello from owner'});
    assert.equal(receipt.isError,false);
    assert.equal(content(receipt).interest_id,interest);
    assert.equal(content(receipt).sender,'owner');
    assert.ok(content(receipt).id);
    const readByPartner=await tool('forge_get_messages',{interest_id:interest},'partner');
    assert.equal(readByPartner.isError,false);
    assert.equal(content(readByPartner).messages[0].body,'Hello from owner');
    assert.equal(content(readByPartner).messages[0].id,content(receipt).id);
    const reply=await tool('forge_send_message',{interest_id:interest,body:'Reply from partner'},'partner');
    assert.equal(reply.isError,false);
    const readByOwner=await tool('forge_get_messages',{interest_id:interest});
    assert.deepEqual(content(readByOwner).messages.map(m=>m.body),['Hello from owner','Reply from partner']);
    for(const actor of [null,'stranger']){
      assert.equal((await tool('forge_get_messages',{interest_id:interest},actor)).isError,true);
      assert.equal((await tool('forge_send_message',{interest_id:interest,body:'Unauthorized'},actor)).isError,true);
    }
    for(const args of [{interest_id:interest,body:''},{interest_id:interest,body:'   '},{interest_id:interest,body:'x'.repeat(3001)},{interest_id:123,body:'Hi'},{interest_id:interest,body:'Hi',sender:'partner'},[],{body:'Missing match'}]){
      assert.equal((await tool('forge_send_message',args)).isError,true,'Reject invalid tool args');
    }
    assert.equal((await tool('forge_get_messages',{interest_id:'does-not-exist'})).isError,true);
    assert.equal(content(await tool('forge_get_messages',{interest_id:interest})).messages.length,2,'Rejected sends must not write messages');
  }finally{sqlite.close()}
});
