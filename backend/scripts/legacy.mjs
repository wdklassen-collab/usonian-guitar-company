// Read the exact checkout's measured sources, without DOM geometry reimplementation.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../../', import.meta.url);
export const read = p => readFile(new URL(p, root), 'utf8');
export const fields = ['bodyLength','backRadius','neckDepth','tailDepth','neckExtension','tailExtension','neckBlockWidth','tailBlockWidth','upperBoutWidth','upperBoutPos','waistWidth','waistPos','lowerBoutWidth','lowerBoutPos','topThickness','backThickness','trimAllowance'];
export async function legacy() {
  const elements = new Map();
  const element = () => ({value:'',parentElement:{},addEventListener(){},appendChild(){}});
  for(const id of [...fields,'preset','resetBtn','profileSource']) elements.set(id,element());
  const c = {document:{getElementById:id=>elements.get(id),querySelector:()=>null,createElement:element},render(){},makeWidthFunction:()=>()=>0};
  c.window=c; vm.createContext(c);
  const base = await read('side-template/index.html');
  vm.runInContext(base.slice(base.indexOf('function sagittaFromHalfWidth'),base.indexOf('function sampleGeometry')),c);
  for(const path of ['presets.js','om-dxf.js','dread-pdf.js','plan00-reference.js','developed-side.js']) vm.runInContext(await read('side-template/'+path),c);
  return {c, calculate(preset, changes={}, profileSource='calculated') {
    c.applyUsonianSidePreset(preset);
    elements.get('profileSource').value=profileSource;
    const p = Object.fromEntries(fields.map(k=>[k,Number(elements.get(k).value)]));
    Object.assign(p,changes);
    return {p,g:c.sampleGeometry(p)};
  }};
}
export async function references() {
  const {c}=await legacy();
  const result={};
  for(const [key,ref] of [['om14',c.usonianOMReference],['dread14',c.usonianDreadnoughtReference],['plan00',{samples:c.usonian00Reference.body}]]) {
    const samples=ref.samples;
    // These are the same reference stations as the measured source scripts.
    const ranges=key==='plan00'?[[20,140],[140,250],[250,450]]:[[30,130],[130,250],[250,450]];
    const extrema=ranges.map(([lo,hi],i)=>samples.filter(p=>p[0]>lo&&p[0]<hi).reduce((a,b)=>(i===1?a[1]<b[1]:a[1]>b[1])?a:b));
    const defaults=Object.fromEntries(fields.map(k=>[k,c.usonianSidePresets[key].values[k]??0]));
    result[key]={samples,stations:[samples[0],...extrema,samples.at(-1)],defaults};
  }
  result.trace00=c.usonian00Reference.side;
  return JSON.parse(JSON.stringify(result));
}
