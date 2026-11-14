import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {setImmediate} from 'node:timers/promises';
const source=await readFile(new URL('../../side-template/rust-client.js',import.meta.url),'utf8');
function setup(search='') {
  const controls=new Map([['geometryEngine',{value:'browser'}],['geometryStatus',{}],['preset',{value:'om14'}],['profileSource',{value:'calculated'}]]);
  for(const value of controls.values())value.addEventListener=(t,cb)=>{value[t]=cb;};
  const timers=new Map(),requests=[],clicks=[];let next=0,browserCalls=0;
  const c={URLSearchParams,AbortController,console,location:{search},document:{getElementById:id=>controls.get(id),addEventListener:(type,cb)=>clicks.push(cb)},setTimeout:(cb,delay)=>{timers.set(++next,{cb,delay});return next;},clearTimeout:id=>timers.delete(id),p:{bodyLength:485.8},sampleGeometry:()=>{browserCalls++;return {browser:true};}};
  c.window=c;c.readInputs=()=>c.p;c.render=()=>{try{c.result=c.sampleGeometry(c.p);c.renderError=null;}catch(e){c.result=null;c.renderError=e.message;}};
  c.fetch=(url,init)=>new Promise(resolve=>requests.push({url,init,resolve}));
  vm.createContext(c);vm.runInContext(source,c);
  const queue=()=>{for(const [id,t]of timers)if(t.delay===120){timers.delete(id);t.cb();}};
  const respond=async(i,data,ok=true)=>{requests[i].resolve({ok,json:async()=>data});await setImmediate();};
  return {c,controls,requests,queue,respond,clicks,get browserCalls(){return browserCalls;}};
}
const geometry=n=>({ok:true,data:{apiVersion:'v1',units:'mm',samples:[{x:0,w:0,d:80,s:0},{x:n,w:0,d:100,s:n}],topSamples:[{x:0,w:0,d:80,s:0},{x:n,w:0,d:100,s:n}],sideLength:n}});
test('Rust mode waits for current response and never exports a stale design',async()=>{
  const h=setup('?engine=rust');assert.equal(h.browserCalls,0);assert.match(h.c.renderError,/Calculating/);
  h.queue();assert.equal(h.requests.length,1);assert.equal(h.requests[0].url,'/api/v1/side-top');
  let blocked=false;h.clicks[0]({target:{closest:()=>true},preventDefault(){blocked=true;},stopImmediatePropagation(){}});assert.ok(blocked);
  await h.respond(0,geometry(748.389));assert.equal(h.c.result.sideLength,748.389);
  h.c.render();h.queue();assert.equal(h.requests.length,1,'unchanged inputs reuse only the current response');
  h.c.p.bodyLength=500;h.c.render();h.queue();
  h.c.p.bodyLength=510;h.c.render();h.queue();assert.equal(h.requests.length,3);
  await h.respond(2,geometry(800));assert.equal(h.c.result.sideLength,800);
  await h.respond(1,geometry(770));assert.equal(h.c.result.sideLength,800,'out-of-order response cannot replace latest geometry');
  assert.equal(h.browserCalls,0);
  assert.equal(h.controls.get('geometryStatus').textContent,'Calculated by Rust · millimeters');
});
test('backend failure is visible, with explicit browser recovery and canceled requests ignored',async()=>{
  const h=setup();assert.equal(h.browserCalls,1);
  const engine=h.controls.get('geometryEngine');engine.value='rust';engine.change();h.queue();
  await h.respond(0,{ok:false,error:{message:'Preview is unavailable'}},false);
  assert.match(h.c.renderError,/unavailable/);assert.equal(h.browserCalls,1);
  engine.value='browser';engine.change();assert.equal(h.c.result.browser,true);
  engine.value='rust';engine.change();h.queue();
  engine.value='browser';engine.change();await h.respond(1,geometry(900));
  assert.equal(h.c.result.browser,true);assert.equal(h.controls.get('geometryStatus').textContent,'Calculated in this browser');
});
