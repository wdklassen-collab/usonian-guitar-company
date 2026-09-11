import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source=await readFile('side-template/curve-tuning.js','utf8');
const presets=await readFile('side-template/presets.js','utf8');
const developed=await readFile('side-template/developed-side.js','utf8');
const base=await readFile('side-template/index.html','utf8');
function setup(){
  const elements=new Map(),events=new Map(),frames=[],observers=[];
  class Element{
    constructor(){this.children=[];this.attrs={};this.style={};this.listeners={};this.value='';}
    set id(id){this._id=id;elements.set(id,this);} get id(){return this._id;}
    setAttribute(k,v){this.attrs[k]=String(v);}
    appendChild(child){child.parentElement=this;this.children.push(child);return child;}
    append(...children){children.forEach(c=>this.appendChild(c));}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    fire(type,event={}){for(const fn of this.listeners[type]??[])fn({preventDefault(){},stopImmediatePropagation(){},...event});}
    querySelectorAll(){return this.children.filter(c=>c.attrs['data-lower-radius-handle']);}
    remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
    getScreenCTM(){return {inverse(){return {};}};}
    createSVGPoint(){return {matrixTransform(){return {x:this.x,y:this.y};}};}
    setPointerCapture(id){this.captured=id;}
  }
  const parent=new Element(),svg=new Element();
  for(const id of ['lowerBoutPos','resetBtn','preset','canvas']){const label=new Element(),input=new Element();input.id=id;parent.appendChild(label).appendChild(input);}
  const document={getElementById:id=>elements.get(id),createElement:()=>new Element(),createElementNS:()=>new Element(),querySelector:()=>svg};
  const c=vm.createContext({document,Math,Number,console,MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},requestAnimationFrame:fn=>frames.push(fn)});
  c.window=c;c.addEventListener=(type,fn)=>{(events.get(type)??events.set(type,[]).get(type)).push(fn);};
  c.render=()=>{};
  const run=s=>vm.runInContext(s,c);
  run(source);run(presets);
  for(const preset of Object.values(c.usonianSidePresets))for(const id of Object.keys(preset.values))if(!elements.has(id)){const input=new Element();input.id=id;}
  c.readInputs=()=>Object.fromEntries([...elements].map(([id,e])=>[id,Number(e.value)]));
  run(base.slice(base.indexOf('function sagittaFromHalfWidth'),base.indexOf('function sampleGeometry')));
  run(base.slice(base.indexOf('function pathFrom('),base.indexOf('function sideViewSVG(')));
  run(developed);
  function flush(){while(frames.length)frames.shift()();}
  function edit(id,value){elements.get(id).value=String(value);elements.get(id).fire('input');}
  function handle(id){return svg.children.find(e=>e.attrs['data-lower-radius-handle']===id).children[1];}
  // Trigger decoration after renders, as the real MutationObserver does.
  c.render=()=>{observers.forEach(fn=>fn());};
  return {c,e:elements,svg,events,flush,edit,handle};
}
for(const key of ['om14','dread14']){
  test(`${key}: neutral shape, 2D controls, ordering, reset, developed lengths and exports`,()=>{
    const h=setup();h.c.applyUsonianSidePreset(key);h.flush();
    let p=h.c.readInputs(),width=h.c.makeWidthFunction(p);
    // Exact pre-change waist-to-lower formula for each preset.
    for(let i=0;i<=100;i++){
      const t=i/100,b=16*t*t*(1-t)*(1-t);
      const expected=p.waistWidth+(p.lowerBoutWidth-p.waistWidth)*(t*t*(3-2*t)+(0.032+(p.lowerBoutFrontRadius-140)*0.00055)*b);
      assert.ok(Math.abs(width(p.waistPos+(p.lowerBoutPos-p.waistPos)*t)-expected)<1e-9);
    }
    const baseline=h.c.sampleGeometry(p);
    const anchors=[p.waistPos,p.lowerBoutPos];
    const original=anchors.map(width);
    for(const [position,fullness] of [['lowerFrontPosition','lowerBoutFrontRadius']]){
      const x=p.waistPos+(p.lowerBoutPos-p.waistPos)*0.63;
      const old=width(x);
      h.edit(position,Number(h.e.get(position).value)+4);
      assert.notEqual(width(x),old,'horizontal control changes concentration');
      const moved=width(x);h.edit(fullness,200);
      assert.notEqual(width(x),moved,'vertical control changes fullness');
      assert.deepEqual(anchors.map(width),original,'anchors stay fixed');
    }
    h.edit('lowerFrontPosition',99);
    assert.equal(Number(h.e.get('lowerFrontPosition').value),86);
    assert.ok(!h.e.has('lowerApproachFullness'));
    assert.ok(!h.e.has('lowerApproachPosition'));
    h.c.applyUsonianSidePreset(key);
    h.flush();
    for(const [id,pos] of [['lowerBoutFrontRadius','lowerFrontPosition']]){
      const oldY=Number(h.handle(id).attrs.cy);
      const oldT=Number(h.e.get(pos).value);
      h.edit(pos,oldT+3);h.flush();
      assert.equal(Number(h.handle(id).attrs.cy),oldY,'horizontal movement does not slide vertically along the outline');
      const x=p.waistPos+(p.lowerBoutPos-p.waistPos)*(oldT+3)/100;
      const before=h.c.makeWidthFunction(p)(x);
      h.edit(id,Number(h.e.get(id).value)+40);h.flush();
      assert.ok(Math.abs(Number(h.handle(id).attrs.cy)-(oldY-20))<1e-9,'20 mm independent control movement');
      assert.ok(Math.abs((h.c.makeWidthFunction(p)(x)-before)/2-14)<1e-9,'strong 14 mm curve response');
      h.c.applyUsonianSidePreset(key);h.flush();
    }
    // Actual pointer event handlers, with nonzero horizontal and vertical motion.
    for(const [id,pos] of [['lowerBoutFrontRadius','lowerFrontPosition']]){
      const halo=h.handle(id),oldT=Number(h.e.get(pos).value),oldR=Number(h.e.get(id).value);
      halo.fire('pointerdown',{pointerId:7,clientX:Number(halo.attrs.cx),clientY:Number(halo.attrs.cy)});
      assert.equal(h.e.get('canvas').captured,7);
      for(const fn of h.events.get('pointermove'))fn({pointerId:7,clientX:p.waistPos+(p.lowerBoutPos-p.waistPos)*(oldT+3)/100,clientY:Number(halo.attrs.cy)-15,preventDefault(){}});
      assert.ok(Math.abs(Number(h.e.get(pos).value)-(oldT+3))<0.01);
      assert.ok(Number(h.e.get(id).value)>oldR);
      for(const fn of h.events.get('pointerup'))fn({pointerId:7});
    }
    const changed=h.c.sampleGeometry(h.c.readInputs());
    assert.notEqual(changed.sideLength,baseline.sideLength);
    assert.ok(Number.isFinite(changed.sideLength)&&changed.sideLength>p.bodyLength);
    const top=h.c.topViewSVG(p,changed,true),side=h.c.sideViewSVG(p,changed,true),combined=h.c.combinedSVG(p,changed,true);
    for(const svg of [top,side,combined]){assert.match(svg,/<svg/);assert.ok(!/NaN|Infinity/.test(svg));assert.ok(!svg.includes('data-lower-radius-handle'));}
    for(const sample of changed.samples.slice(1,10)){
      assert.ok(top.includes((-sample.w/2).toFixed(3))&&top.includes((sample.w/2).toFixed(3)),'outline mirrors sampled widths');
    }
    assert.match(side,new RegExp(changed.sideLength.toFixed(1)));
    h.e.get('resetBtn').fire('click');
    p=h.c.readInputs();
    assert.equal(p.lowerFrontPosition,34);
    assert.equal(h.c.sampleGeometry(p).sideLength,baseline.sideLength);
  });
}
