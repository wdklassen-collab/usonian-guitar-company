export async function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Usonian Fret Spacing Calculator</title>
<style>
:root{--bg:#f5f2ec;--panel:#fff;--ink:#26221f;--muted:#6d655f;--line:#c8c0b7;--accent:#9b5f36;--soft:#fbfaf8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{padding:18px 22px 14px;background:#fff;border-bottom:1px solid var(--line)}header h1{margin:0;font-size:22px}header p{margin:5px 0 0;color:var(--muted);font-size:13px}
main{display:grid;grid-template-columns:340px minmax(0,1fr);min-height:calc(100vh - 76px)}aside{padding:18px;background:var(--soft);border-right:1px solid var(--line)}.workspace{padding:18px;min-width:0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px}.card h2{margin:0 0 10px;font-size:14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 10px}label{font-size:12px;color:var(--muted)}input,select,button{font:inherit}input,select{width:100%;margin-top:4px;padding:8px 9px;border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--ink)}button{padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);cursor:pointer}.primary{background:var(--accent);border-color:var(--accent);color:#fff}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.note{font-size:12px;color:var(--muted);line-height:1.45;margin:10px 0 0}
.summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.pill{background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:12px}
.table-wrap{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:auto}table{width:100%;border-collapse:collapse;min-width:520px}th,td{padding:9px 12px;border-bottom:1px solid #e7e1da;text-align:right;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:center}thead th{position:sticky;top:0;background:#fbfaf8;font-size:12px;color:var(--muted)}tbody tr:last-child td{border-bottom:0}
.formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#fff;border:1px solid var(--line);padding:9px;border-radius:7px;margin-top:10px;color:var(--muted)}
@media(max-width:850px){main{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--line)}.workspace{padding:12px}}@media print{header,aside,.summary{display:none!important}main{display:block}.workspace{padding:0}.table-wrap{border:0}thead th{position:static}}
</style>
</head>
<body>
<header><h1>Fret Spacing Calculator</h1><p>Equal-temperament fret positions for guitar, bass, ukulele, mandolin, and other fretted instruments.</p></header>
<main>
<aside>
  <div class="card"><h2>Scale</h2><div class="grid">
    <label>Scale length<input id="scale" type="number" min="100" step="0.01" value="25.4"></label>
    <label>Units<select id="unit"><option value="in" selected>Inches</option><option value="mm">Millimeters</option></select></label>
    <label>Number of frets<input id="frets" type="number" min="1" max="36" step="1" value="24"></label>
    <label>Decimals<select id="precision"><option>2</option><option selected>3</option><option>4</option></select></label>
  </div><div class="buttons"><button id="reset">Reset</button><button id="print" class="primary">Print Table</button></div><div class="buttons"><button id="csv" style="grid-column:1 / -1">Download CSV</button></div>
  <p class="note">Distances are measured from the nut to the fret centerline. “From previous” is the distance from the preceding fret centerline.</p>
  <div class="formula">dₙ = scale × (1 − 2<sup>−n/12</sup>)</div></div>
  <div class="card"><h2>Common scales</h2><div class="buttons"><button data-scale="25.4" data-unit="in">25.4 in</button><button data-scale="25.5" data-unit="in">25.5 in</button><button data-scale="24.75" data-unit="in">24.75 in</button><button data-scale="25" data-unit="in">25.0 in</button><button data-scale="650" data-unit="mm">650 mm</button><button data-scale="628" data-unit="mm">628 mm</button></div></div>
</aside>
<section class="workspace">
  <div class="summary"><div class="pill" id="summaryScale"></div><div class="pill" id="summary12"></div><div class="pill" id="summaryFrets"></div></div>
  <div class="table-wrap"><table><thead><tr><th>Fret</th><th id="nutHead">From nut</th><th id="prevHead">From previous</th></tr></thead><tbody id="rows"></tbody></table></div>
</section>
</main>
<script>
(()=>{
 const scale=document.getElementById('scale'),unit=document.getElementById('unit'),frets=document.getElementById('frets'),precision=document.getElementById('precision'),rows=document.getElementById('rows');
 function clean(){let s=Number(scale.value);if(!Number.isFinite(s)||s<=0)s=unit.value==='in'?25.4:645.16;let f=Math.round(Number(frets.value));if(!Number.isFinite(f)||f<1)f=24;f=Math.min(36,f);return {s,f,p:Number(precision.value)||3,u:unit.value};}
 function render(){const {s,f,p,u}=clean();const suffix=u==='in'?'in':'mm';document.getElementById('nutHead').textContent='From nut ('+suffix+')';document.getElementById('prevHead').textContent='From previous ('+suffix+')';let html='',prev=0;for(let n=1;n<=f;n++){const d=s*(1-Math.pow(2,-n/12));const gap=d-prev;html+='<tr><td>'+n+'</td><td>'+d.toFixed(p)+'</td><td>'+gap.toFixed(p)+'</td></tr>';prev=d;}rows.innerHTML=html;document.getElementById('summaryScale').textContent='Scale: '+s.toFixed(p)+' '+suffix;const d12=s*(1-Math.pow(2,-1));document.getElementById('summary12').textContent='12th fret: '+d12.toFixed(p)+' '+suffix;document.getElementById('summaryFrets').textContent=f+' frets';}
 function csv(){const {s,f,p,u}=clean();const suffix=u==='in'?'in':'mm';let out='Fret,From nut ('+suffix+'),From previous ('+suffix+')\n',prev=0;for(let n=1;n<=f;n++){const d=s*(1-Math.pow(2,-n/12));out+=n+','+d.toFixed(p)+','+(d-prev).toFixed(p)+'\n';prev=d;}const blob=new Blob([out],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='usonian-fret-spacing-'+String(s).replace('.','_')+'-'+suffix+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 [scale,unit,frets,precision].forEach(el=>el.addEventListener('input',render));document.getElementById('reset').addEventListener('click',()=>{scale.value='25.4';unit.value='in';frets.value='24';precision.value='3';render();});document.getElementById('print').addEventListener('click',()=>window.print());document.getElementById('csv').addEventListener('click',csv);document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>{scale.value=b.dataset.scale;unit.value=b.dataset.unit;render();}));render();
})();
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
