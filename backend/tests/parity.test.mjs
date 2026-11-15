import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {legacy} from '../scripts/legacy.mjs';
const {calculate}=await legacy();
function rust(request, tool='side-top') {
  const run=spawnSync(new URL('../target/debug/generate',import.meta.url).pathname,[tool],{input:JSON.stringify(request)+'\n',encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(run.status,0,run.stderr);
  return JSON.parse(run.stdout);
}
const cases=[];
for(const preset of ['om14','dread14','plan00']) {
  cases.push({preset});
  cases.push({preset,parameters:{bodyLength:520,upperBoutPos:90,waistPos:190,lowerBoutPos:375,upperBoutWidth:280,waistWidth:225,lowerBoutWidth:390,neckDepth:90,tailDepth:115,backRadius:3657.6,topThickness:3,backThickness:2.5,trimAllowance:1,neckExtension:12,tailExtension:15}});
  cases.push({preset,parameters:{backRadius:1e8,neckDepth:100,tailDepth:100}});
}
cases.push({preset:'plan00',profileSource:'trace00',parameters:{topThickness:3,backThickness:2.5,trimAllowance:1,neckExtension:12,tailExtension:15}});
for(const request of cases) test(`JS/Rust parity: ${JSON.stringify(request)}`,()=>{
  const {p,g}=calculate(request.preset,request.parameters,request.profileSource);
  const response=rust(request);assert.equal(response.ok,true,JSON.stringify(response));const result=response.data;
  assert.ok(Math.abs(result.sideLength-g.sideLength)<1e-7);
  assert.equal(result.samples.length,g.samples.length);
  for(let i=0;i<g.samples.length;i++)for(const key of ['x','w','s','d'])assert.ok(Math.abs(result.samples[i][key]-g.samples[i][key])<1e-6,`sample ${i} ${key}: ${result.samples[i][key]} vs ${g.samples[i][key]}`);
  const top=g.topSamples||g.samples;
  assert.equal(result.topSamples.length,top.length);
  for(let i=0;i<top.length;i++)assert.ok(Math.abs(result.topSamples[i].w-top[i].w)<1e-7);
  assert.equal(result.units,'mm');
  for(const svg of Object.values(result.svg)) {
    assert.match(svg,/<svg.*width="[\d.eE+-]+mm".*viewBox=/);
    assert.ok(!/NaN|Infinity/.test(svg));
  }
  if(!result.traced && p.backRadius<1e7)for(const s of result.samples.slice(1)) {
    const sphere=result.sphere;
    const finished=s.d+p.topThickness+p.backThickness-p.trimAllowance;
    assert.ok(Math.abs(Math.hypot(s.x-sphere.cx,s.w/2,finished-sphere.cz)-p.backRadius)<1e-7);
  }
});
for(const parameters of [{backRadius:0},{backRadius:200},{bodyLength:0},{waistPos:20},{topThickness:-1},{backThickness:200},{tailDepth:10000}])test(`JS/Rust reject invalid dimensions: ${JSON.stringify(parameters)}`,()=>{
  assert.throws(()=>calculate('plan00',parameters));
  const result=rust({preset:'plan00',parameters});
  assert.equal(result.ok,false);assert.equal(result.error.code,'invalid_dimensions');
});
test('strict schema and fixed trace prevent silent changes',()=>{
  for(const request of [{preset:'missing'},{surprise:1},{parameters:{longitudinalRadius:123}},{parameters:{backRadius:null}},{preset:'om14',profileSource:'trace00'},{preset:'plan00',profileSource:'trace00',parameters:{bodyLength:600}}])assert.equal(rust(request).ok,false);
});
test('fretboard preserves existing equal-temperament formula and real mm',()=>{
  const response=rust({scaleLength:643.636,fretCount:20,nutWidth:44.45,endWidth:58},'fretboard');
  assert.equal(response.ok,true);
  for(const f of response.data.frets)assert.ok(Math.abs(f.x-643.636*(1-Math.pow(2,-f.number/12)))<1e-10);
  assert.equal(response.data.frets.at(-1).width,58);
  for(const patch of [{fretCount:0},{fretCount:37},{fretCount:2.5},{scaleLength:-1},{endWidth:null}])assert.equal(rust({scaleLength:643.636,fretCount:20,nutWidth:44.45,endWidth:58,...patch},'fretboard').ok,false);
});
