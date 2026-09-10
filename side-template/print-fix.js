/* iOS-safe tiled print preview for developed side template. */
(function(){
  function cross(x,y){
    return `<line x1="${x-3}" y1="${y}" x2="${x+3}" y2="${y}"/><line x1="${x}" y1="${y-3}" x2="${x}" y2="${y+3}"/>`;
  }

  function tiledPrint(){
    // Open immediately while the click still has user activation. This is
    // important on iPhone/iPad Safari, which may block delayed popups/print().
    const win=window.open('','_blank');
    if(!win){
      alert('Safari blocked the print preview. Allow pop-ups for usonianguitar.com and try again.');
      return;
    }

    const p=window.readInputs();
    const g=window.sampleGeometry(p);
    const pageW=215.9,pageH=279.4;
    const margin=6.35,overlap=6.35;
    const usableW=pageW-2*margin;
    const usableH=pageH-2*margin;
    const strideX=usableW-overlap;
    const strideY=usableH-overlap;
    const xMin=-p.neckExtension;
    const xMax=g.sideLength+p.tailExtension;
    const yMin=0;
    const yMax=Math.max(...g.samples.map(sample=>sample.d),p.tailDepth)+22;
    const cols=Math.ceil(Math.max(0,xMax-xMin-usableW)/strideX)+1;
    const rows=Math.ceil(Math.max(0,yMax-yMin-usableH)/strideY)+1;
    const side=window.sideViewSVG(p,g,true);
    const inner=side.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
    let pages='';
    let pageNum=0;

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        pageNum++;
        const ox=xMin+c*strideX;
        const oy=yMin+r*strideY;
        const label=`Row ${r+1} / ${rows} · Col ${c+1} / ${cols}`;
        pages+=`<div class="page"><svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}"><rect width="${pageW}" height="${pageH}" fill="white"/><defs><clipPath id="clip${pageNum}"><rect x="${margin}" y="${margin}" width="${usableW}" height="${usableH}"/></clipPath></defs><g clip-path="url(#clip${pageNum})" transform="translate(${margin-ox},${margin-oy})">${inner}</g><g stroke="#555" stroke-width="0.25">${cross(margin,margin)}${cross(pageW-margin,margin)}${cross(margin,pageH-margin)}${cross(pageW-margin,pageH-margin)}</g><rect x="${margin+3}" y="${pageH-margin-28}" width="25.4" height="25.4" fill="none" stroke="#222" stroke-width="0.35"/><text x="${margin+3}" y="${pageH-margin-30}" font-size="3.5">1 inch calibration square</text><text x="${pageW/2}" y="${pageH-3.5}" text-anchor="middle" font-size="3.5">${label} · Print at 100% / Actual Size</text></svg></div>`;
      }
    }

    win.document.open();
    win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Usonian Tiled Side Template</title><style>@page{size:letter portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#eee;font-family:system-ui,-apple-system,sans-serif}.toolbar{position:sticky;top:0;z-index:10;padding:12px;background:#fff;border-bottom:1px solid #bbb;display:flex;gap:10px;align-items:center;justify-content:center}.toolbar button{font:inherit;font-size:17px;padding:12px 18px;border-radius:10px;border:1px solid #9b5f36;background:#9b5f36;color:#fff}.toolbar span{font-size:13px;color:#555}.page{width:${pageW}mm;height:${pageH}mm;margin:12px auto;background:#fff;overflow:hidden;page-break-after:always}.page:last-child{page-break-after:auto}.page svg{display:block;width:${pageW}mm;height:${pageH}mm}@media print{html,body{background:#fff}.toolbar{display:none!important}.page{margin:0}}</style></head><body><div class="toolbar"><button id="printNow" type="button">Print / Save PDF</button><span>${pageNum} letter-size tile${pageNum===1?'':'s'} · use 100% / Actual Size</span></div>${pages}<script>document.getElementById('printNow').addEventListener('click',function(){window.print();});<\/script></body></html>`);
    win.document.close();
  }

  const button=document.getElementById('printTiles');
  if(button){
    button.addEventListener('click',function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      tiledPrint();
    },true);
  }
})();
