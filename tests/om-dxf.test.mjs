import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const read=p=>readFile(p,'utf8');
const source=await read('side-template/om-dxf.js');
const developed=await read('side-template/developed-side.js');
const base=await read('side-template/index.html');
const presetsSource=await read('side-template/presets.js');
const planSource=await read('side-template/plan00-reference.js');
function setup(measured=false){
 const elements=new Map();
 for(const id of ['preset','resetBtn','topThickness','backThickness','trimAllowance','profileSource','lowerBoutFrontRadius','lowerBoutRadius','upperBoutNeckRadius','upperBoutWaistRadius','omContourNote'])elements.set(id,{value:'om14',parentElement:{},listeners:{},addEventListener(t,f){this.listeners[t]=f;},appendChild(){}});
 const c={document:{getElementById:id=>elements.get(id),querySelector:()=>null,createElement:()=>({})},render(){},makeWidthFunction:()=>()=>123};c.window=c;vm.createContext(c);
 vm.runInContext(presetsSource,c);
 for(const p of Object.values(c.usonianSidePresets))for(const id of Object.keys(p.values))if(!elements.has(id))elements.set(id,{value:0});
 c.readInputs=()=>Object.fromEntries([...elements].map(([id,e])=>[id,Number(e.value)]));
 vm.runInContext(source,c);
 vm.runInContext(base.slice(base.indexOf('function sagittaFromHalfWidth'),base.indexOf('function sampleGeometry')),c);
 vm.runInContext(base.slice(base.indexOf('function pathFrom('),base.indexOf('function sideViewSVG(')),c);
 if(measured) vm.runInContext(planSource,c);
 elements.get('profileSource').value='calculated';
 vm.runInContext(developed,c);
 c.applyUsonianSidePreset('om14');return {c,e:elements};
}
test('DXF outside curve is preserved at 485.8 mm, with no neck-notch detour',()=>{
 const {c}=setup(),p=c.readInputs(),ref=c.usonianOMReference,g=c.sampleGeometry(p);
 assert.equal(p.neckExtension,0);assert.equal(p.tailExtension,0);
 assert.equal(p.bodyLength,485.8);assert.equal(ref.samples[0][0],0);assert.equal(ref.samples.at(-1)[0],485.8);
 assert.ok(ref.samples.length>2900);
 for(let i=1;i<ref.samples.length;i++)assert.ok(ref.samples[i][0]>ref.samples[i-1][0],'single-valued, ordered half-outline');
 for(const [x,y] of ref.samples)assert.ok(Math.abs(g.widthFn(x)/2-y)<0.002,'measured contour retained within 0.002 mm');
 // Full outer half between neck centerline and tail center, excluding all
 // CNC notch edges; dense arc sampling avoids losing near-vertical lengths.
 assert.ok(g.sideLength>748 && g.sideLength<749);
 assert.equal(g.samples[0].w,0);
 assert.ok(Math.abs(g.samples[1].s-p.neckBlockWidth/2)<1e-8);
 assert.equal(g.samples.length,ref.samples.length+1);
 assert.equal(g.samples.at(-1).s,g.sideLength);
 assert.equal(g.samples.at(-1).w,0);
 const top=c.topViewSVG(p,g,true),side=c.sideViewSVG(p,g,true),combined=c.combinedSVG(p,g,true);
 for(const svg of [top,side,combined])assert.ok(!/NaN|Infinity/.test(svg));
 for(const s of g.samples.slice(1,10))assert.ok(top.includes((-s.w/2).toFixed(3))&&top.includes((s.w/2).toFixed(3)));
 assert.ok(side.includes('Body side length '+g.sideLength.toFixed(1)));
 console.log('OM developed length:',g.sideLength.toFixed(3),'mm; with default extensions:',(g.sideLength+50).toFixed(3),'mm');
});
test('OM edits and reset use the reference; Dreadnought uses the unchanged prior curve',()=>{
 const {c,e}=setup(),p=c.readInputs(),before=c.sampleGeometry(p).sideLength;
 e.get('waistWidth').value='220';assert.notEqual(c.sampleGeometry(c.readInputs()).sideLength,before);
 e.get('resetBtn').listeners.click({preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(c.sampleGeometry(c.readInputs()).sideLength,before);
 assert.equal(e.get('lowerBoutFrontRadius').parentElement.hidden,true);
 c.applyUsonianSidePreset('dread14');const d=c.readInputs();
 assert.equal(d.bodyLength,513.3);assert.equal(d.waistPos,168.11659529);assert.equal(d.neckBlockWidth,54.5260833);
 assert.equal(c.makeWidthFunction(d)(200),123,'delegates to original Dreadnought function');
 assert.equal(c.sampleGeometry(d).samples.length,481);
 assert.equal(e.get('lowerBoutFrontRadius').parentElement.hidden,false);
 c.applyUsonianSidePreset('om14');assert.equal(c.sampleGeometry(c.readInputs()).sideLength,before);
});

test('Back Radius remains editable and changes side depth without changing the body contour',()=>{
 const {c,e}=setup(),p=c.readInputs(),original=c.sampleGeometry(p);
 e.get('backRadius').value='3048';
 const changed=c.sampleGeometry(c.readInputs());
 assert.equal(changed.sideLength,original.sideLength);
 assert.deepEqual(changed.samples.map(s=>s.w),original.samples.map(s=>s.w));
 assert.ok(changed.samples.some((s,i)=>Math.abs(s.d-original.samples[i].d)>0.1));
 assert.notEqual(c.sideViewSVG(p,original,true),c.sideViewSVG(c.readInputs(),changed,true));
 assert.equal(changed.samples[0].d,p.neckDepth);
 assert.equal(changed.samples.at(-1).d,p.tailDepth);
 assert.match(base,/<input id="backRadius" type="number" step="1">/);
 assert.ok(base.includes("addEventListener('input',render)"));
});

test('Dreadnought plan contour matches 771 mm template and preserves OM on switching',async()=>{
 const {c,e}=setup(),omLength=c.sampleGeometry(c.readInputs()).sideLength;
 vm.runInContext(await read('side-template/dread-pdf.js'),c);
 c.applyUsonianSidePreset('dread14');const p=c.readInputs(),g=c.sampleGeometry(p),ref=c.usonianDreadnoughtReference;
 assert.equal(p.bodyLength,513.3);
 assert.ok(Math.abs(g.sideLength-771.09256)<0.002);
 assert.equal(g.samples[0].x,0);assert.equal(g.samples[0].w,0);
 assert.equal(g.samples[1].x,0);assert.ok(Math.abs(g.samples[1].s-p.neckBlockWidth/2)<1e-8);
 for(const [x,y] of ref.samples)assert.ok(Math.abs(g.widthFn(x)-2*y)<0.0001);
 assert.equal(e.get('lowerBoutFrontRadius').parentElement.hidden,true);
 assert.ok(Math.abs(g.sideLength+p.neckExtension+p.tailExtension-771.09256)<0.002);
 for(const svg of [c.topViewSVG(p,g,true),c.sideViewSVG(p,g,true),c.combinedSVG(p,g,true)])assert.ok(!/NaN|Infinity/.test(svg));
 e.get('backRadius').value='3048';const changed=c.sampleGeometry(c.readInputs());
 assert.equal(changed.sideLength,g.sideLength);assert.ok(changed.samples.some((s,i)=>Math.abs(s.d-g.samples[i].d)>0.1));
 e.get('waistWidth').value='260';assert.notEqual(c.sampleGeometry(c.readInputs()).sideLength,g.sideLength);
 e.get('resetBtn').listeners.click({preventDefault(){},stopImmediatePropagation(){}});assert.equal(c.sampleGeometry(c.readInputs()).sideLength,g.sideLength);
 c.applyUsonianSidePreset('om14');assert.equal(c.sampleGeometry(c.readInputs()).sideLength,omLength);
 console.log('Dreadnought developed length:',g.sideLength.toFixed(3),'mm; including extensions:',(g.sideLength+50).toFixed(3),'mm');
});

// These checks validate the physical sphere independently of the generator's
// unrolling and drawing, so a transverse-only sag correction cannot pass.
test('rim samples lie on one sphere, and equal end depths are deepest near the waist',()=>{
 const {c}=setup();
 c.applyUsonianSidePreset('plan00');
 const p={...c.readInputs(),neckDepth:100,tailDepth:100};
 const g=c.sampleGeometry(p),sphere=g.depthFn.sphere;
 for(const sample of g.samples){
  const r=Math.hypot(sample.x-sphere.cx,sample.w/2,sample.d-sphere.cz);
  assert.ok(Math.abs(r-p.backRadius)<1e-7,'every rim point lies on the same sphere');
 }
 assert.ok(g.depthFn(p.waistPos)>g.depthFn(p.lowerBoutPos)+2);
 assert.equal(g.depthFn(0),100);assert.equal(g.depthFn(500),100);
 const tapered=c.sampleGeometry(c.readInputs());
 for(const sample of tapered.samples){
  const s=tapered.depthFn.sphere;
  assert.ok(Math.abs(Math.hypot(sample.x-s.cx,sample.w/2,sample.d-s.cz)-p.backRadius)<1e-7);
 }
 console.log('00-14 comparison:',tapered.sideLength.toFixed(3),'mm; upper/waist/lower depths:',
   [p.upperBoutPos,p.waistPos,p.lowerBoutPos].map(x=>tapered.depthFn(x).toFixed(3)).join(' / '));
});

test('large radius approaches a straight body-axis taper; invalid geometry is rejected',()=>{
 const {c}=setup();c.applyUsonianSidePreset('plan00');const p=c.readInputs();
 const flat=c.sampleGeometry({...p,backRadius:1e8});
 for(const s of flat.samples) assert.ok(Math.abs(s.d-(p.neckDepth+(p.tailDepth-p.neckDepth)*s.x/p.bodyLength))<0.001);
 for(const changes of [{backRadius:0},{backRadius:200},{bodyLength:0},{waistPos:20},{topThickness:-1},{backThickness:200},{tailDepth:10000}]){
  assert.throws(()=>c.sampleGeometry({...p,...changes}));
 }
});

test('plate deductions and trim allowance apply once to profile, endpoints, and exported extensions',()=>{
 const {c}=setup(true);c.applyUsonianSidePreset('plan00');const p=c.readInputs(),g=c.sampleGeometry(p);
 const cutP={...p,topThickness:3,backThickness:2.5,trimAllowance:1,neckExtension:12,tailExtension:15};
 const cut=c.sampleGeometry(cutP);
 assert.equal(cut.sideLength,g.sideLength);
 for(let i=0;i<cut.samples.length;i++)assert.ok(Math.abs(cut.samples[i].d-g.samples[i].d+4.5)<1e-8);
 const svg=c.sideViewSVG(cutP,cut,true);
 assert.match(svg,/Neck side 82.9 mm/);assert.match(svg,/Tail side 97.9 mm/);
 assert.ok(svg.includes('L-12.000 '+(p.neckDepth-4.5).toFixed(3))); 
 assert.ok(svg.includes('L'+(cut.sideLength+15).toFixed(3)+' '+(p.tailDepth-4.5).toFixed(3))); 
 assert.match(svg,/data-station="Waist"/);assert.match(svg,/data-inch="1"/);
 assert.ok(!/NaN|Infinity/.test(svg));
});

test('the original input render handler reports cutting depths and developed length immediately',()=>{
 const {c,e}=setup(true);c.applyUsonianSidePreset('plan00');
 for(const id of ['statBody','statWidth','statRadius','statDepth','canvas'])e.set(id,{});
 c.currentView='side';
 vm.runInContext(base.slice(base.indexOf('function render(){'),base.indexOf('function download(')),c);
 const inputHandler=c.render;
 c.render=()=>{throw new Error('input handlers must work without a render wrapper');};
 e.get('topThickness').value='3';e.get('backThickness').value='2.5';e.get('trimAllowance').value='1';
 inputHandler();
 assert.match(e.get('statDepth').textContent,/Side depth: 82.9 → 97.9 mm · Side length: 729.5 mm/);
 assert.match(e.get('canvas').innerHTML,/Neck side 82.9 mm/);
 e.get('backRadius').value='0';inputHandler();
 assert.equal(e.get('statDepth').textContent,'Check dimensions');
 assert.match(e.get('canvas').textContent,/positive body dimensions/);
});

test('00 measured outline uses one spherical back radius',()=>{
 const {c}=setup(true);c.applyUsonianSidePreset('plan00');const p=c.readInputs(),g=c.sampleGeometry(p);
 assert.equal(p.backRadius,4572);
 assert.ok(!base.includes('id="longitudinalRadius"'));
 assert.ok(!('longitudinalRadius' in p));
 for(const sample of g.samples){
  const sphere=g.depthFn.sphere;
  assert.ok(Math.abs(Math.hypot(sample.x-sphere.cx,sample.w/2,sample.d-sphere.cz)-p.backRadius)<1e-7);
 }
 assert.ok(Math.abs(p.upperBoutWidth-251.1564)<0.001);
 assert.ok(Math.abs(p.waistWidth-211.8235)<0.001);
 assert.ok(Math.abs(p.lowerBoutWidth-357.4458)<0.001);
 assert.ok(g.sideLength>729 && g.sideLength<730);
 assert.ok(g.samples.every(s=>Number.isFinite(s.d)));
 console.log('Measured 00 perimeter:',g.sideLength.toFixed(4));
});

test('literal 00 trace exports the original polyline at physical PDF scale, with plate deductions only',()=>{
 const {c,e}=setup(true);c.applyUsonianSidePreset('plan00');e.get('profileSource').value='trace00';
 const p=c.readInputs(),g=c.sampleGeometry(p);
 assert.ok(Math.abs(g.sideLength-729.967545)<0.000001);
 assert.ok(Math.abs(g.samples[0].d-87.367336)<0.000001);
 assert.ok(Math.abs(g.samples.at(-1).d-102.400355)<0.000001);
 // Independently measured source station at the conspicuous waist kink.
 const kink=g.samples.find(s=>Math.abs(s.s-348.966942)<0.000001);
 assert.ok(kink);assert.ok(Math.abs(kink.d-100.200360)<0.000001);
 assert.equal(g.samples.length,28);
 assert.ok(g.topSamples.length>100,'the top outline retains the full PDF polyline');
 const svg=c.sideViewSVG(p,g,true);assert.ok(svg.includes('348.967 100.200'));assert.ok(svg.includes('literal plan trace'));
 for(const picture of [svg,c.topViewSVG(p,g,true),c.combinedSVG(p,g,true)])assert.ok(!/NaN|Infinity/.test(picture));
 const cut=c.sampleGeometry({...p,topThickness:3,backThickness:2.5,trimAllowance:1});
 assert.equal(cut.sideLength,g.sideLength);
 for(let i=0;i<g.samples.length;i++)assert.ok(Math.abs(g.samples[i].d-cut.samples[i].d-4.5)<1e-9);
 e.get('profileSource').value='calculated';assert.ok(!c.sampleGeometry(p).traced);
});

test('OM developed length includes exactly the half neck face, with no joinery detour',()=>{
 const {c}=setup(),p=c.readInputs(),g=c.sampleGeometry(p);
 let outerLength=0;
 const ref=c.usonianOMReference.samples;
 for(let i=1;i<ref.length;i++)outerLength+=Math.hypot(ref[i][0]-ref[i-1][0],ref[i][1]-ref[i-1][1]);
 assert.ok(Math.abs(g.sideLength-outerLength-p.neckBlockWidth/2)<0.002);
 assert.ok(Math.abs(g.sideLength-748.3894)<0.002);
 assert.ok(Math.abs(g.sideLength-749.0208)<0.7,'matches supplied PDF length within the outline difference');
});

test('the three named presets restore tested dimensions, one radius, and zero extensions',()=>{
 const {c,e}=setup(true);
 const expected={om14:['OM-14',485.8,79.3,104.5],dread14:['Dreadnought-14',513.3,95.3,120.7],plan00:['00-14',500,87.36733623080782,102.40035489400226]};
 for(const [key,[label,length,neck,tail]] of Object.entries(expected)){
  c.applyUsonianSidePreset(key);let p=c.readInputs();
  assert.equal(c.usonianSidePresets[key].label,label);
  assert.equal(p.bodyLength,length);assert.equal(p.neckDepth,neck);assert.equal(p.tailDepth,tail);
  assert.equal(p.backRadius,4572);assert.equal(p.neckExtension,0);assert.equal(p.tailExtension,0);
  e.get('bodyLength').value=600;e.get('backRadius').value=4500;e.get('topThickness').value=3;
  e.get('resetBtn').listeners.click({preventDefault(){},stopImmediatePropagation(){}});
  p=c.readInputs();assert.equal(p.bodyLength,length);assert.equal(p.backRadius,4572);assert.equal(p.topThickness,0);
 }
 e.get('profileSource').value='trace00';e.get('profileSource').listeners.change();
 assert.equal(e.get('bodyLength').disabled,true);
 assert.notEqual(e.get('preset').disabled,true);
 c.applyUsonianSidePreset('om14');
 assert.equal(e.get('profileSource').value,'calculated');
 assert.notEqual(e.get('preset').disabled,true,'preset selection remains available in trace mode');
});
