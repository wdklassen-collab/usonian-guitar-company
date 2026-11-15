// Start both services in one local session. Never contacts or deploys production.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
const root=new URL('../../',import.meta.url).pathname;
const env={...process.env,NO_PROXY:'localhost,127.0.0.1,::1',no_proxy:'localhost,127.0.0.1,::1',CLOUDFLARE_CF_FETCH_ENABLED:'false',WRANGLER_SEND_METRICS:'false',RUST_API_URL:'http://127.0.0.1:8787'};
const children=[];let logs='';
function start(args){if(process.env.USONIAN_LOOPBACK_ONLY==='1')args=['--require',new URL('./loopback-only.cjs',import.meta.url).pathname,...args];const child=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});children.push(child);for(const s of [child.stdout,child.stderr])s.on('data',d=>logs+=d.toString());return child;}
async function ready(url){let last;for(let i=0;i<120;i++){if(children.some(c=>c.exitCode!==null))throw new Error('Local service exited early:\n'+logs);try{const r=await fetch(url);if(r.ok)return r;last=r.status+' '+await r.text();if(r.status===503||r.status===502)throw new Error('CONFIGURATION: '+last);}catch(e){if(e.message.startsWith('CONFIGURATION:'))throw new Error(e.message+'\n'+logs);last=e.cause?.message||e.message;}await delay(250);}throw new Error('Local service did not become ready: '+url+' '+last+'\n'+logs);}
let browser;
try {
  start(['node_modules/wrangler/bin/wrangler.js','dev','--config','backend/cloudflare/wrangler.jsonc','--local','--port','8787','--ip','127.0.0.1']);
  const health=await ready('http://127.0.0.1:8787/api/v1/health');assert.equal((await health.json()).engine,'rust-wasm');
  start(['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--var','RUST_API_URL:http://127.0.0.1:8787','--port','3000','--ip','127.0.0.1','--inspector-port','0']);
  const proxied=await ready('http://127.0.0.1:3000/api/v1/health');assert.equal((await proxied.json()).engine,'rust-wasm');
  for(const preset of ['om14','dread14','plan00']){
    const response=await fetch('http://127.0.0.1:3000/api/v1/side-top',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({preset})});
    assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);
    assert.equal(body.data.parameters.backRadius,4572);console.log(preset,body.data.sideLength.toFixed(6),'mm via website → local Worker → Rust');
  }
  for(const [input,status]of [
    [{preset:'om14',parameters:{bodyLength:520,waistWidth:220,backRadius:3657.6,topThickness:3}},200],
    [{preset:'plan00',profileSource:'trace00',parameters:{topThickness:3}},200],
    [{preset:'plan00',parameters:{backRadius:0}},422]
  ]) {
    const response=await fetch('http://127.0.0.1:3000/api/v1/side-top',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
    assert.equal(response.status,status);assert.equal((await response.json()).ok,status===200);
  }
  const html=await (await ready('http://127.0.0.1:3000/side-template/')).text();assert.ok(html.includes('rust-client')||html.includes('Calculated by Rust'));
  const fretHtml=await (await ready('http://127.0.0.1:3000/rust-fretboard/')).text();assert.ok(fretHtml.includes('Width at final fret'));
  if(process.env.USONIAN_BROWSER_SMOKE==='1'){
    const {chromium}=createRequire(import.meta.url)('playwright');
    browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1280,height:960}});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/side-template/?engine=rust');
    await page.getByText('Calculated by Rust · millimeters',{exact:true}).waitFor();
    assert.ok((await page.locator('#statDepth').innerText()).includes('748.4'));
    for(const [preset,length]of [['dread14','771.1'],['plan00','729.5'],['om14','748.4']]){
      await page.locator('#preset').selectOption(preset);
      await page.getByText('Calculated by Rust · millimeters',{exact:true}).waitFor();
      assert.ok((await page.locator('#statDepth').innerText()).includes(length));
    }
    await page.locator('#waistWidth').fill('220');
    await page.getByText('Calculated by Rust · millimeters',{exact:true}).waitFor();
    await page.locator('#printTiles').click();await page.locator('#sidePrintPreview').waitFor();
    assert.ok(await page.locator('.side-print-page').count()>1);await page.locator('#sidePrintClose').click();
    await page.locator('#preset').selectOption('plan00');await page.locator('#profileSource').selectOption('trace00');
    await page.getByText('Calculated by Rust · millimeters',{exact:true}).waitFor();
    assert.ok((await page.locator('#statDepth').innerText()).includes('730.0'));
    await page.screenshot({path:'/tmp/usonian-side-rust.png',fullPage:true});
    await page.goto('http://127.0.0.1:3000/rust-fretboard/');
    await page.getByRole('button',{name:'Generate template',exact:true}).click();
    await page.getByText('Generated by Rust.',{exact:false}).waitFor();
    assert.ok((await page.locator('tbody tr').nth(11).innerText()).includes('321.818'));
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG'}).click();assert.equal((await download).suggestedFilename(),'usonian-rust-fretboard.svg');
    await page.screenshot({path:'/tmp/usonian-fretboard-rust.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/usonian-fretboard-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);console.log('Browser: preset switching, custom dimensions, trace, print preview, fretboard and SVG download passed.');
  }
  console.log('Local integration smoke passed. No deployment performed.');
}finally{
  await browser?.close();
  for(const child of children)child.kill('SIGTERM');
}
