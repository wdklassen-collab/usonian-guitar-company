/* Optional remote geometry; existing SVG annotations, exports and tiling stay local. */
(function(){
  const engine=document.getElementById('geometryEngine');
  const status=document.getElementById('geometryStatus');
  if(!engine||!status)return;
  const browserGeometry=window.sampleGeometry;
  const fields=['bodyLength','backRadius','neckDepth','tailDepth','neckExtension','tailExtension','neckBlockWidth','tailBlockWidth','upperBoutWidth','upperBoutPos','waistWidth','waistPos','lowerBoutWidth','lowerBoutPos','topThickness','backThickness','trimAllowance'];
  let epoch=0,desired=null,completed=null,failure=null,controller=null,timer=null;
  const remote=()=>engine.value==='rust';
  const report=message=>{status.textContent=message;};
  function reset(){epoch++;desired=null;completed=null;failure=null;clearTimeout(timer);controller?.abort();}
  function requestFor(p){
    return {preset:document.getElementById('preset').value,profileSource:document.getElementById('profileSource').value,parameters:Object.fromEntries(fields.map(k=>[k,p[k]]))};
  }
  function queue(key,request){
    if(desired===key)return;
    reset();desired=key;const token=epoch;
    report('Calculating with Rust…');
    timer=setTimeout(async()=>{
      controller=new AbortController();const active=controller;
      const timeout=setTimeout(()=>active.abort(),10000);
      try{
        const response=await fetch('/api/v1/side-top',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request),signal:active.signal});
        const result=await response.json();
        if(!response.ok||!result.ok)throw new Error(result.error?.message||'Rust calculation failed.');
        const g=result.data;
        if(g.apiVersion!=='v1'||g.units!=='mm'||!g.samples?.length||!g.topSamples?.length||!Number.isFinite(g.sideLength)||g.samples.some(s=>!['x','w','d','s'].every(k=>Number.isFinite(s[k]))))throw new Error('Unexpected Rust response.');
        if(epoch!==token||!remote())return;
        completed={key,data:g};report('Calculated by Rust · millimeters');
      }catch(error){
        if(epoch!==token||!remote())return;
        failure=error.name==='AbortError'?'Rust calculation timed out. Change a dimension or reselect Rust to retry.':error.message;
        report(failure);
      }finally{
        clearTimeout(timeout);
        if(epoch===token&&remote())window.render();
      }
    },120);
  }
  window.sampleGeometry=function(p){
    if(!remote())return browserGeometry(p);
    const request=requestFor(p),key=JSON.stringify(request);
    queue(key,request);
    if(completed?.key===key)return completed.data;
    if(failure)throw new Error(failure);
    throw new Error('Calculating with Rust…');
  };
  engine.addEventListener('change',()=>{reset();report(remote()?'Calculating with Rust…':'Calculated in this browser');window.render();});
  // Never export or print a previous response while new dimensions are pending.
  document.addEventListener('click',event=>{
    if(!remote()||!event.target.closest?.('#exportTop, #exportSide, #exportCombined, #printTiles'))return;
    try{window.sampleGeometry(window.readInputs());}catch(error){event.preventDefault();event.stopImmediatePropagation();report(error.message);}
  },true);
  if(new URLSearchParams(window.location.search).get('engine')==='rust')engine.value='rust';
  report(remote()?'Calculating with Rust…':'Calculated in this browser');
  window.render();
})();
