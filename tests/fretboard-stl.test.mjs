import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const html=readFileSync('public/fretboard-generator/index.html','utf8'),s=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function model(overrides={}){
 const values={units:'mm',scale:647.7,nutWidth:44.45,width14:53.975,frets:20,extension:6.35,overrun:0,nutThickness:3.175,ncDepth:2,outlineBit:6.35,radiusBit:6.35,ncCutter:.6,ncRadius:15,outlineDepth:6,...overrides};
 const c=vm.createContext({TextEncoder,document:{getElementById:id=>({value:values[id],checked:id==='stlSlots'?overrides.slots!==false:true})}});
 vm.runInContext(s.slice(s.indexOf('const VERSION'),s.indexOf('$("generate").onclick'))+';globalThis.make=buildSTL;',c);return c.make();
}
function validate(buffer){
 const v=new DataView(buffer),count=v.getUint32(80,true),edges=new Map(),bounds=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];let volume=0;const top=[];
 assert.equal(buffer.byteLength,84+50*count);
 for(let t=0;t<count;t++){
  const o=84+50*t,p=[];
  for(let j=0;j<3;j++){const a=[0,1,2].map(k=>v.getFloat32(o+12+12*j+4*k,true));p.push(a);for(let k=0;k<3;k++){assert.ok(Number.isFinite(a[k]));bounds[k][0]=Math.min(bounds[k][0],a[k]);bounds[k][1]=Math.max(bounds[k][1],a[k])}top.push(a);}
  const [a,b,c]=p,u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
  assert.ok(Math.hypot(...n)>0,'nonzero triangle area');
  assert.ok(n.reduce((sum,x,k)=>sum+x*v.getFloat32(o+4*k,true),0)>0,'normal agrees with winding');
  volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  for(let j=0;j<3;j++){const a=p[j].join(','),b=p[(j+1)%3].join(','),key=a<b?a+'|'+b:b+'|'+a;const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}
 }
 for(const e of edges.values()){assert.equal(e[0],2,'watertight edge');assert.equal(e[1],0,'consistent winding')}
 assert.ok(volume>0);bounds.forEach(b=>assert.ok(b[0]>=0));return{bounds,top};
}
for(const slots of [true,false])test(`closed positive-coordinate STL, slots=${slots}`,()=>{
 const b=model({slots}),{bounds,top}=validate(b),length=647.7*(1-2**(-20/12))+6.35;
 assert.ok(Math.abs(bounds[1][1]-length)<.001);assert.equal(bounds[2][1],6);
 const nut=top.filter(p=>Math.abs(p[1]-length)<.001);assert.ok(Math.abs(Math.max(...nut.map(p=>p[0]))-Math.min(...nut.map(p=>p[0]))-44.45)<.001);
 if(slots)writeFileSync('/private/tmp/Usonian_Fretboard_Easel.stl',Buffer.from(b));
});
test('rejects slots cutting through the board',()=>assert.throws(()=>model({outlineDepth:2}),/cut through/));
test('rejects overlapping slots',()=>assert.throws(()=>model({ncCutter:30}),/overlap/));
test('saved inset designs can export a surface-only solid',()=>validate(model({overrun:-2,slots:false})));
