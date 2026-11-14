import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initSync,generate} from '../pkg/usonian.js';
import {createApi,MAX_REQUEST_BYTES} from '../cloudflare/api.js';
import {proxy} from '../cloudflare/proxy.js';
import {legacy} from '../scripts/legacy.mjs';
initSync({module:new WebAssembly.Module(await readFile(new URL('../pkg/usonian_bg.wasm',import.meta.url)))});
const api=createApi(generate);
const request=(path,body,method=body===undefined?'GET':'POST')=>new Request('https://api.example/api/v1/'+path,{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)})});
test('health executes compiled Rust; all three presets match JS through Wasm/HTTP',async()=>{
  const health=await api(request('health'));
  assert.equal(health.status,200);assert.equal((await health.json()).engine,'rust-wasm');
  const {calculate}=await legacy();
  for(const preset of ['om14','dread14','plan00'])for(const parameters of [{},{waistWidth:220,backRadius:3657.6,topThickness:3}]){
    const response=await api(request('side-top',{preset,parameters}));assert.equal(response.status,200);
    const result=(await response.json()).data;const expected=calculate(preset,parameters).g;
    assert.ok(Math.abs(result.sideLength-expected.sideLength)<1e-7);
    for(let i=0;i<expected.samples.length;i++)for(const key of ['x','w','d','s'])assert.ok(Math.abs(result.samples[i][key]-expected.samples[i][key])<1e-7);
  }
});
test('HTTP contract: malformed, invalid, wrong method/type, unknown route, streamed limits',async()=>{
  const cases=[['side-top','{',400],['side-top',{parameters:{backRadius:0}},422],['side-top',undefined,405],['health','{}',405],['missing',undefined,404],['side-top',' '.repeat(MAX_REQUEST_BYTES+1),413]];
  for(const [path,body,status]of cases){const r=await api(request(path,body));assert.equal(r.status,status);assert.equal((await r.json()).ok,false);assert.equal(r.headers.get('cache-control'),'no-store');}
  const type=await api(new Request('https://api.example/api/v1/side-top',{method:'POST',body:'{}'}));assert.equal(type.status,415);
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_REQUEST_BYTES));c.enqueue(new Uint8Array(1));c.close();}});
  const streamed=await api(new Request('https://api.example/api/v1/side-top',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'}));assert.equal(streamed.status,413);
});
test('Wasm handles repeated calls and fretboard export without stale state',async()=>{
  for(let i=0;i<40;i++){
    const response=await api(request('fretboard',{scaleLength:650+i,fretCount:20,nutWidth:44,endWidth:58}));
    assert.equal(response.status,200);const data=(await response.json()).data;
    assert.equal(data.frets[11].x,(650+i)/2);assert.ok(!/NaN|Infinity/.test(data.svg));
  }
});
test('same-origin proxy reaches Wasm and has explicit configuration/failure errors',async()=>{
  const upstream=(url,init)=>api(new Request(url,init));
  const req=()=>request('side-top',{preset:'plan00'});
  const response=await proxy(req(),'https://api.example',upstream);
  assert.equal(response.status,200);assert.equal((await response.json()).data.units,'mm');
  for(const origin of [undefined,'http://untrusted.example','https://user:pass@api.example','https://api.example/nested'])assert.equal((await proxy(req(),origin,upstream)).status,503);
  assert.equal((await proxy(request('missing'),'https://api.example',upstream)).status,404);
  assert.equal((await proxy(req(),'https://api.example',()=>{throw new Error('offline');})).status,502);
  assert.equal((await proxy(req(),'https://api.example',()=>new Response('<html>oops</html>'))).status,502);
  assert.equal((await proxy(req(),'https://api.example',()=>new Response(null,{status:302,headers:{location:'https://other.example'}}))).status,502);
  const tooLarge=request('side-top',' '.repeat(MAX_REQUEST_BYTES+1));
  assert.equal((await proxy(tooLarge,'https://api.example',upstream)).status,413);
  assert.equal((await proxy(request('side-top',{parameters:{backRadius:0}}),'http://127.0.0.1:8787',upstream)).status,422);
});
