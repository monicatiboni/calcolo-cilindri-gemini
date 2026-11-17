import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer,callGemini} from '../server.mjs';

test('different students use different keys simultaneously; no cross-request credential mixing',async()=>{
  const used=[];
  const extractor=async(message, known, {key})=>{
    await new Promise(r=>setTimeout(r, message==='studente A'?45:5));
    used.push([message,key]);
    return {updates:{mass:message==='studente A'?20:30},issues:[],usage:{promptTokens:5},notes:'ok'};
  };
  const server=createAppServer({extractor});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const keyA='AIzaStudentA000000000000000000000000000';
  const keyB='AIzaStudentB000000000000000000000000000';
  try {
    const send=(message,apiKey)=>fetch(base+'/api/assistant/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,known:{},apiKey})});
    const [a,b]=await Promise.all([send('studente A',keyA),send('studente B',keyB)]);
    assert.equal(a.status,200); assert.equal(b.status,200);
    const ra=await a.json(),rb=await b.json();
    assert.equal(ra.updates.mass,20); assert.equal(rb.updates.mass,30);
    assert.deepEqual(new Map(used).get('studente A'),keyA);
    assert.deepEqual(new Map(used).get('studente B'),keyB);
    assert.ok(!JSON.stringify(ra).includes(keyA) && !JSON.stringify(ra).includes(keyB));
    assert.ok(!JSON.stringify(rb).includes(keyB) && !JSON.stringify(rb).includes(keyA));
  } finally {await new Promise(r=>server.close(r));}
});

test('real Gemini REST request passes only the per-call key to Google, never server env',async()=>{
  const studentKey='AIzaPERSONAL123456789012345678901234567890';
  let outgoingHeader;
  const fetchImpl=async(_url,opts)=>{
    outgoingHeader=opts.headers['x-goog-api-key'];
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"fields":{"stroke":200}}'}]}}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:8,totalTokenCount:20}})};
  };
  process.env.GEMINI_API_KEY='should-never-be-used-1234567890';
  const result=await callGemini('corsa 200 mm',{}, {key:studentKey,model:'gemini-3-flash-preview',fetchImpl});
  assert.equal(outgoingHeader,studentKey);
  assert.equal(result.updates.stroke,200);
  assert.ok(!JSON.stringify(result).includes(studentKey));
  delete process.env.GEMINI_API_KEY;
});
