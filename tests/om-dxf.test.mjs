import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const read=p=>readFile(p,'utf8');
const source=await read('side-template/om-dxf.js');
const developed=await read('side-template/developed-side.js');
const base=await read('side-template/index.html');
const presetsSource=await read('side-template/presets.js');
function setup(){
 const elements=new Map();
 for(const id of ['preset','resetBtn','lowerBoutFrontRadius','lowerBoutRadius','upperBoutNeckRadius','upperBoutWaistRadius','omContourNote'])elements.set(id,{value:'om14',parentElement:{},listeners:{},addEventListener(t,f){this.listeners[t]=f;},appendChild(){}});
 const c={document:{getElementById:id=>elements.get(id),createElement:()=>({})},render(){},makeWidthFunction:()=>()=>123};c.window=c;vm.createContext(c);
 vm.runInContext(presetsSource,c);
 for(const p of Object.values(c.usonianSidePresets))for(const id of Object.keys(p.values))if(!elements.has(id))elements.set(id,{value:0});
 c.readInputs=()=>Object.fromEntries([...elements].map(([id,e])=>[id,Number(e.value)]));
 vm.runInContext(source,c);
 vm.runInContext(base.slice(base.indexOf('function sagittaFromHalfWidth'),base.indexOf('function sampleGeometry')),c);
 vm.runInContext(base.slice(base.indexOf('function pathFrom('),base.indexOf('function sideViewSVG(')),c);
 vm.runInContext(developed,c);
 c.applyUsonianSidePreset('om14');return {c,e:elements};
}
test('DXF outside curve is preserved at 485.8 mm, with no neck-notch detour',()=>{
 const {c}=setup(),p=c.readInputs(),ref=c.usonianOMReference,g=c.sampleGeometry(p);
 assert.equal(p.bodyLength,485.8);assert.equal(ref.samples[0][0],0);assert.equal(ref.samples.at(-1)[0],485.8);
 assert.ok(ref.samples.length>2900);
 for(let i=1;i<ref.samples.length;i++)assert.ok(ref.samples[i][0]>ref.samples[i-1][0],'single-valued, ordered half-outline');
 for(const [x,y] of ref.samples)assert.ok(Math.abs(g.widthFn(x)/2-y)<0.002,'measured contour retained within 0.002 mm');
 // Full outer half between the neck opening and tail center, excluding all
 // CNC notch edges; dense arc sampling avoids losing near-vertical lengths.
 assert.ok(g.sideLength>738 && g.sideLength<740);
 assert.equal(g.samples.length,ref.samples.length);
 assert.equal(g.samples.at(-1).s,g.sideLength);
 assert.equal(g.samples.at(-1).w,0);
 const top=c.topViewSVG(p,g,true),side=c.sideViewSVG(p,g,true),combined=c.combinedSVG(p,g,true);
 for(const svg of [top,side,combined])assert.ok(!/NaN|Infinity/.test(svg));
 for(const s of g.samples.slice(1,10))assert.ok(top.includes((-s.w/2).toFixed(3))&&top.includes((s.w/2).toFixed(3)));
 assert.ok(side.includes(g.sideLength.toFixed(1)));
 console.log('OM developed length:',g.sideLength.toFixed(3),'mm; with default extensions:',(g.sideLength+30).toFixed(3),'mm');
});
test('OM edits and reset use the reference; Dreadnought uses the unchanged prior curve',()=>{
 const {c,e}=setup(),p=c.readInputs(),before=c.sampleGeometry(p).sideLength;
 e.get('waistWidth').value='220';assert.notEqual(c.sampleGeometry(c.readInputs()).sideLength,before);
 e.get('resetBtn').listeners.click({preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(c.sampleGeometry(c.readInputs()).sideLength,before);
 assert.equal(e.get('lowerBoutFrontRadius').parentElement.hidden,true);
 c.applyUsonianSidePreset('dread14');const d=c.readInputs();
 assert.equal(d.bodyLength,513.3);assert.equal(d.waistPos,190);assert.equal(d.neckBlockWidth,63);
 assert.equal(c.makeWidthFunction(d)(200),123,'delegates to original Dreadnought function');
 assert.equal(c.sampleGeometry(d).samples.length,481);
 assert.equal(e.get('lowerBoutFrontRadius').parentElement.hidden,false);
 c.applyUsonianSidePreset('om14');assert.equal(c.sampleGeometry(c.readInputs()).sideLength,before);
});
