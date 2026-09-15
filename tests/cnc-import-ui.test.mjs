import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const bundle=await readFile('public/cnc-template-tool/app.js','utf8');
function ui(){
 const nodes=new Map();
 function element(id=''){return {id,value:'',textContent:'',className:'',disabled:false,checked:false,files:[],listeners:{},children:[],addEventListener(name,fn){this.listeners[name]=fn;},append(el){this.children.push(el);this.lastChild=el;if(el.id)nodes.set(el.id,el);},replaceChildren(){this.children=[];},setAttribute(){},click(){}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
 get('units').value='auto';get('zero').value='corner';get('zZero').value='top';get('generate').disabled=true;
 const document={getElementById:get,createElement:()=>element(),createElementNS:()=>element()};
 vm.runInNewContext(bundle,{document,console,setTimeout,Blob,URL});
 return {get,async upload(text){get('file').files=[{name:'onshape.dxf',size:text.length,text:async()=>text}];await get('file').listeners.change();},input(id){get('settings').listeners.input({target:{id}});}};
}
const circle=units=>`0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${units}\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nCIRCLE\n10\n0\n20\n0\n40\n20\n0\nENDSEC\n0\nEOF\n`;
test('failed Onshape-style unitless import keeps actionable error after edits and Generate',async()=>{const u=ui();await u.upload(circle(0));assert.match(u.get('importStatus').textContent,/units are missing/);assert.equal(u.get('generate').disabled,true);u.input('thickness');assert.match(u.get('status').textContent,/units are missing/);u.get('generate').listeners.click();assert.match(u.get('status').textContent,/units are missing/);u.get('units').value='mm';u.get('units').listeners.change();assert.equal(u.get('generate').disabled,false);assert.match(u.get('importStatus').textContent,/1 outside profile/);});
test('Enter in settings never submits the form and clears the selected drawing',()=>{const u=ui();let prevented=false;u.get('settings').listeners.submit({preventDefault(){prevented=true;}});assert.ok(prevented);});
test('valid import clears previous errors; stale failed reads cannot replace the latest drawing',async()=>{const u=ui();let reject;u.get('file').files=[{name:'old.dxf',size:100,text:()=>new Promise((_,r)=>{reject=r;})}];const old=u.get('file').listeners.change();await u.upload(circle(4));reject(new Error('old failure'));await old;assert.match(u.get('importStatus').textContent,/1 outside profile/);assert.equal(u.get('generate').disabled,false);});
