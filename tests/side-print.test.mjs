import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const printSource=await readFile('side-template/print-fix.js','utf8');
const developedSource=await readFile('side-template/developed-side.js','utf8');

function harness(){
  const listeners=new Map();
  const controls=new Map();
  let preview;
  let printCalls=0;
  const previousFocus={isConnected:true,focus(){document.activeElement=this;}};
  const document={
    activeElement:previousFocus,
    body:{style:{overflow:'auto'},appendChild(node){preview=node;}},
    getElementById(){return preview;},
    addEventListener(type,handler){listeners.set(type,handler);},
    removeEventListener(type){listeners.delete(type);},
    createElement(){
      return {setAttribute(){},remove(){preview=undefined;},querySelector(id){
        if(!controls.has(id)) controls.set(id,{
          addEventListener(type,handler){this[type]=handler;},
          focus(){document.activeElement=this;},
        });
        return controls.get(id);
      }};
    },
  };
  const p={bodyLength:500,neckExtension:15,tailExtension:15,neckDepth:80,tailDepth:105};
  const context=vm.createContext({document,console,alert(message){throw new Error(message);}});
  context.window=context;
  context.readInputs=()=>p;
  context.makeWidthFunction=()=>x=>60+300*Math.sin(Math.PI*x/500);
  context.makeSideDepthFunction=()=>x=>80+25*x/500;
  context.print=()=>{printCalls++;};
  // No window.open: any popup-dependent implementation fails this test.
  const run=source=>vm.runInContext(source,context);
  const click=()=>{
    let stopped=false;
    listeners.get('click')({target:{closest:()=>true},preventDefault(){},stopImmediatePropagation(){stopped=true;}});
    assert.ok(stopped,'legacy target handlers must not run');
  };
  return {context,p,run,click,controls,document,listeners,get preview(){return preview;},get printCalls(){return printCalls;}};
}

for(const order of ['geometry-first','print-first']){
  test(`portrait tiles preserve developed geometry and work without popups (${order})`,()=>{
    const h=harness();
    if(order==='geometry-first'){h.run(developedSource);h.run(printSource);}
    else{h.run(printSource);h.run(developedSource);}
    const listener=h.listeners.get('click');
    h.run(printSource);
    assert.equal(h.listeners.get('click'),listener,'injection is idempotent');
    const g=h.context.sampleGeometry(h.p);
    assert.ok(g.sideLength>h.p.bodyLength);
    assert.equal(g.samples.length,481);
    assert.equal(g.samples.at(-1).s,g.sideLength);
    const originalSVG=h.context.sideViewSVG(h.p,g,true);
    h.click();
    assert.equal(h.printCalls,0,'preview never calls delayed print');
    const html=h.preview.innerHTML;
    assert.match(html,/portrait Letter sheets/);
    const expectedRows=Math.ceil((g.sideLength+34-266.7)/260.35)+1;
    assert.equal((html.match(/class="side-print-page"/g)||[]).length,expectedRows);
    assert.match(html,/width="25.4" height="25.4"/);
    assert.match(html,/@page\{size:letter portrait;margin:0\}/);
    const tiles=[...html.matchAll(/<g clip-path="url\(#side-tile-\d+\)"><g transform="translate\(([^,]+),([^\)]+)\) rotate\(90\)"/g)];
    assert.equal(tiles.length,expectedRows,'clip belongs to an untransformed parent');
    // Local developed x becomes paper y. Adjacent tiles cover the full
    // profile with precisely 6.35 mm overlap and without rescaling.
    for(let i=1;i<tiles.length;i++){
      assert.ok(Math.abs(Number(tiles[i-1][2])-Number(tiles[i][2])-260.35)<1e-9);
    }
    assert.equal(h.context.sideViewSVG(h.p,h.context.sampleGeometry(h.p),true),originalSVG);
    h.controls.get('#sidePrintNow').click();
    assert.equal(h.printCalls,1,'fresh click calls native print directly');
    h.controls.get('#sidePrintClose').click();
    assert.equal(h.preview,undefined);
    assert.equal(h.document.body.style.overflow,'auto');
    h.p.tailExtension=400;
    h.click();
    assert.ok((h.preview.innerHTML.match(/class="side-print-page"/g)||[]).length>expectedRows,'reopening uses latest dimensions');
  });
}

test('route bundles checkout sources in order and needs no runtime GitHub fetch',async()=>{
  const route=await readFile('app/side-template/route.ts','utf8');
  const bindings={Response};
  for(const match of route.matchAll(/import (\w+) from '([^']+)\?raw';/g)){
    bindings[match[1]]=await readFile(new URL('../app/side-template/'+match[2],import.meta.url),'utf8');
  }
  const source=route.replace(/^import .*;$/gm,'').replace('export async function GET','async function GET');
  const context=vm.createContext(bindings);
  vm.runInContext(source,context);
  const previousFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('No network fetch is allowed');};
  try{
    const response=await context.GET();
    assert.equal(response.status,200);
    const html=await response.text();
    assert.ok(html.indexOf(developedSource)<html.indexOf(printSource));
    assert.ok(html.includes('developed side contours'));
    assert.ok(!html.includes('raw.githubusercontent.com'));
    context.developed='';
    assert.equal((await context.GET()).status,502);
  }finally{globalThis.fetch=previousFetch;}
});
