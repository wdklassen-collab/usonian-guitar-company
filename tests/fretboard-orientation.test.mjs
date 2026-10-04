import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = readFileSync('public/fretboard-generator/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function generator(values) {
  const context = vm.createContext({document: {getElementById: id => values[id]}});
  // Load the real generator functions without wiring browser event handlers.
  const source = script.slice(script.indexOf('const VERSION'), script.indexOf('$("generate").onclick'));
  vm.runInContext(source + '\nglobalThis.generate = {buildRadiusNC, buildSlotsNC, buildOutlineNC, parameters, geometry, buildFiles, getFiles:()=>files};', context);
  return context.generate;
}
function controls(units, frets) {
  const mm = {scale: 647.7, nutWidth: 44.45, width14: 53.975, extension: 6.35, overrun: 0, nutThickness: 3.175};
  const values = Object.fromEntries(Object.entries(mm).map(([id,value])=>[id,{value: units==='in'?value/25.4:value}]));
  for (const [id,value] of Object.entries({units,frets,ncDepth:2,outlineBit:6.35,radiusBit:6.35,ncCutter:0.6,ncRadius:15,outlineDepth:6})) values[id]={value};
  values.nutline={checked:true}; values.centerline={checked:true};
  return values;
}
function motion(text) {
  return text.split('\n').filter(line=>/^G[01] /.test(line)).map(line=>Object.fromEntries([...line.matchAll(/([XYZF])(-?\d+(?:\.\d+)?)/g)].map(([,axis,n])=>[axis,Number(n)])));
}
for (const [units,frets] of [['in',20],['mm',24],['mm',1]]) {
  test(`nut stays at top in all three NC exports (${units}, ${frets} frets)`,()=>{
    const gen = generator(controls(units,frets));
    const p=gen.parameters(),g=gen.geometry(p);
    const slots=gen.buildSlotsNC(),radius=gen.buildRadiusNC(),outline=gen.buildOutlineNC();
    for(const nc of [slots,radius,outline]) {
      assert.match(nc,/Y0=nut at top, fretboard extends toward negative Y/);
      assert.match(nc,/G0 X0\.000 Y0\.000\nM2/);
      assert.ok(motion(nc).some(m=>m.Z===3));
    }
    const slotY=motion(slots).filter(m=>'Y' in m && m.Y!==0).map(m=>m.Y);
    assert.ok(slotY.every(y=>y<0));
    assert.ok(Math.abs(Math.max(...slotY)+p.scale*(1-2**(-1/12)))<0.001);
    const radiusMoves=motion(radius).filter(m=>'Y' in m);
    assert.equal(Math.max(...radiusMoves.map(m=>m.Y)),0);
    assert.ok(Math.abs(Math.min(...radiusMoves.map(m=>m.Y))+g.length)<0.001);
    const outlineY=motion(outline).filter(m=>'Y' in m).map(m=>m.Y);
    assert.equal(Math.max(...outlineY),3.175);
    assert.ok(Math.abs(Math.min(...outlineY)+g.length+3.175)<0.001);
    gen.buildFiles(p);
    // SVG preview keeps the nut above the first fret in its downward-Y coordinates.
    const svg=gen.getFiles().combined;
    const nutY=Number(svg.match(/id="NUT_LINE"[^>]*y1="([\d.]+)"/)[1]);
    const fretY=Number(svg.match(/id="FRET_1"[^>]*y1="([\d.]+)"/)[1]);
    assert.ok(nutY<fretY);
  });
}
