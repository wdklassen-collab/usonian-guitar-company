import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initSync,generate} from '../pkg/usonian.js';
import {createApi} from '../cloudflare/api.js';
import {proxy} from '../cloudflare/proxy.js';
initSync({module:new WebAssembly.Module(await readFile(new URL('../pkg/usonian_bg.wasm',import.meta.url)))});
const api=createApi(generate);
const line=(x,y)=>({kind:'line',x,y,c1x:x,c1y:y,c2x:x,c2y:y});
const curve=(x,y,c1x,c1y,c2x,c2y)=>({kind:'curve',x,y,c1x,c1y,c2x,c2y});
const base=()=>({length:180,nutWidth:44.45,shoulderWidth:62,shoulderHeight:28,crownWidth:70,crownHeight:18,leftBulge:0,rightBulge:0,transition:.55,symmetric:true,minimumWeb:3,crown:[curve(0,1,-.65,.8,-.25,1)],slots:{enabled:true,width:15,length:105,start:43,spacing:38,splay:0},tuners:{layout:'threePerSide',diameter:6,first:60,pitch:35,inset:10}});
const call=p=>JSON.parse(generate('headstock',JSON.stringify(p)));
const request=p=>new Request('https://website.example/api/v1/headstock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)});
test('all six crown families use the Rust/Wasm core and preserve exact physical SVG size',()=>{
  const variants=[{}, {crownHeight:16,crown:[curve(0,1,-.55,.05,-.2,.65)]}, {crownHeight:16,crown:[curve(-.45,1,-.72,0,-.55,.45),line(0,1)]}, {crownHeight:0,crown:[line(0,0)]}, {symmetric:false,crownHeight:20,crown:[curve(.15,1,-.6,0,-.1,.65),curve(1,0,.55,1,.8,.3)]}, {symmetric:false,crownHeight:20,crown:[line(-.5,.45),line(-.3,.3),line(.65,1),line(1,.8),line(1,0)]}];
  for(const variant of variants){const out=call({...base(),...variant});assert.equal(out.ok,true,JSON.stringify(out));const g=out.data;assert.equal(g.engine,'rust-wasm');assert.equal(g.units,'mm');assert.equal(g.bounds[3],200);assert.match(g.svg,/height="200.0000mm"/);assert.equal(g.slotOutlines.length,2);assert.equal(g.tunerAxes.length,6);assert.equal(g.holes.length,0);assert.ok(!g.cuttingSvg.includes('side-drill-axes'));assert.ok(!/NaN|Infinity/.test(g.svg));}
});
test('face bores support 3+3 and six-inline arrangements with clearance validation',()=>{
 for(const layout of ['threePerSide','sixLeft','sixRight']){const p=base();p.slots.enabled=false;p.tuners={layout,diameter:10,first:40,pitch:22,inset:10};const out=call(p);assert.equal(out.ok,true,JSON.stringify(out));assert.equal(out.data.holes.length,6);assert.equal(out.data.tunerAxes.length,0);assert.match(out.data.cuttingSvg,/<circle/);}
 const p=base();p.slots.enabled=false;p.tuners.diameter=10;p.tuners.inset=3;assert.equal(call(p).ok,false);
});
test('unsafe slots, crown handles, nonfinite data, and unsupported requests fail explicitly',()=>{
 const variants=[p=>{p.slots.spacing=70;},p=>{p.slots.spacing=15;},p=>{p.crown[0].c1x=.5;},p=>{p.crown[0].x=-.2;},p=>{p.slots.splay=60;},p=>{p.tuners.pitch=55;},p=>{p.length=null;},p=>{p.extra=true;}];
 for(const edit of variants){const p=base();edit(p);const out=call(p);assert.equal(out.ok,false);assert.ok(['invalid_dimensions','invalid_request'].includes(out.error.code));}
});
test('versioned headstock HTTP endpoint and same-origin proxy reach the actual Wasm core',async()=>{
 const direct=await api(request(base()));assert.equal(direct.status,200);assert.equal((await direct.json()).data.engine,'rust-wasm');
 const through=await proxy(request(base()),'https://api.example',(url,options)=>api(new Request(url,options)));assert.equal(through.status,200);assert.equal((await through.json()).data.slotOutlines.length,2);
 const p=base();p.slots.width=35;const bad=await api(request(p));assert.equal(bad.status,422);assert.equal((await bad.json()).ok,false);
 const health=await api(new Request('https://api.example/api/v1/health'));assert.ok((await health.json()).tools.includes('headstock'));
});
