import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer,parseFields} from '../server.mjs';

const baseFields={bore:80,rod:25,stroke:600,pressure:6,frequency:12,temperature:30,dailyHours:16,annualDays:230,mass:100,elasticModulus:210000,lengthFactor:2,safetyFactor:5,loadMode:'theoretical',velocityMode:'calculated'};

test('rejects hallucinated or out of range fields',()=>{
  const result=parseFields({fields:{...baseFields,bore:27,temperature:-300,unknown:5000,mass:25,loadMode:'guess'}});
  assert.ok(!Object.hasOwn(result.updates,'unknown'));
  assert.ok(!Object.hasOwn(result.updates,'bore'));
  assert.ok(!Object.hasOwn(result.updates,'temperature'));
  assert.equal(result.updates.mass,25);
  assert.ok(result.issues.length>=3);
});

test('server loads original calculator, requires personal key and does not expose it',async()=>{
  const key='AIza1234567890examplePersonalStudentKey123';
  const server=createAppServer({extractor:async(_message,_known,{key:k})=>({updates:{mass:25,stroke:200},issues:[],usage:{},success:k===key})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try {
    const home=await fetch(url);
    assert.equal(home.status,200);
    const html=await home.text();
    assert.match(html,/Assistente AI/);
    assert.match(html,/ai-api-key/);
    assert.ok(!html.includes(key));
    const status=await (await fetch(url+'/api/assistant/status')).json();
    assert.equal(status.available,true);
    assert.equal(status.requiresPersonalKey,true);
    assert.equal(status.configured,undefined);
    assert.equal((await fetch(url+'/healthz')).status,200);
    const noKey=await fetch(url+'/api/assistant/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'corsa 200 mm',known:{}})});
    assert.equal(noKey.status,400);
    assert.equal((await noKey.json()).error,'PERSONAL_KEY_MISSING');
    const req=await fetch(url+'/api/assistant/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'corsa 200 mm e massa 25 kg',known:{},apiKey:key})});
    assert.equal(req.status,200);
    const body=await req.json();
    assert.equal(body.updates.mass,25);
    assert.equal(body.updates.stroke,200);
    assert.equal(body.success,true);
    assert.ok(!JSON.stringify(body).includes(key));
    const forbidden=await fetch(url+'/server.mjs');
    assert.equal(forbidden.status,404);
    const malicious=await fetch(url+'/api/assistant/extract',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://evil.example'},body:JSON.stringify({message:'Hello',known:{},apiKey:key})});
    assert.equal(malicious.status,403);
    const secretLeak=await fetch(url+'/.env.example');
    assert.equal(secretLeak.status,404);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
