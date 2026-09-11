/* Portrait tiled printing: one owner, same-page preview, no popup or delayed print. */
(function(){
  // Route injection may run again; never register competing listeners.
  if(window.usonianSidePrintInstalled) return;
  window.usonianSidePrintInstalled=true;

  function cross(x,y){
    return `<path d="M${x-3} ${y}h6 M${x} ${y-3}v6"/>`;
  }

  function tiledPrint(){
    if(document.getElementById('sidePrintPreview')) return;
    const p=window.readInputs();
    const g=window.sampleGeometry(p);
    if(!Number.isFinite(g.sideLength) || g.sideLength<=0 ||
       !g.samples.length || g.samples.some(sample=>!Number.isFinite(sample.d))){
      throw new Error('The side dimensions could not be calculated.');
    }
    const pageW=215.9,pageH=279.4;
    const margin=6.35,overlap=6.35;
    const usableW=pageW-2*margin,usableH=pageH-2*margin;
    const strideX=usableW-overlap,strideY=usableH-overlap;
    // Rotate the developed profile 90 degrees, with the neck at the top.
    // A small border retains the complete outline stroke at both ends.
    const border=2;
    const depth=Math.max(...g.samples.map(sample=>sample.d),p.neckDepth,p.tailDepth);
    const width=depth+22+2*border;
    const height=g.sideLength+p.neckExtension+p.tailExtension+2*border;
    if(!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0){
      throw new Error('Enter valid side dimensions before printing.');
    }
    const cols=Math.ceil(Math.max(0,width-usableW)/strideX)+1;
    const rows=Math.ceil(Math.max(0,height-usableH)/strideY)+1;
    if(rows*cols>100) throw new Error('These dimensions require more than 100 sheets. Check the input values.');
    const side=window.sideViewSVG(p,g,true);
    const inner=side.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
    let pages='';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const pageNum=r*cols+c+1;
        // Keep the clip in page coordinates; translate only its child artwork.
        // Previously the clip moved with the profile, blanking later tiles.
        pages+=`<div class="side-print-page"><svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}" aria-label="Tile ${pageNum}, row ${r+1}, column ${c+1}">
          <rect width="${pageW}" height="${pageH}" fill="white"/>
          <defs><clipPath id="side-tile-${pageNum}" clipPathUnits="userSpaceOnUse"><rect x="${margin}" y="${margin}" width="${usableW}" height="${usableH}"/></clipPath></defs>
          <g clip-path="url(#side-tile-${pageNum})"><g transform="translate(${margin-c*strideX+depth+22+border},${margin-r*strideY+p.neckExtension+border}) rotate(90)">${inner}</g></g>
          <g stroke="#555" stroke-width="0.25" fill="none">${cross(margin,margin)}${cross(pageW-margin,margin)}${cross(margin,pageH-margin)}${cross(pageW-margin,pageH-margin)}</g>
          <rect x="${pageW-margin-28}" y="${pageH-margin-28}" width="25.4" height="25.4" fill="none" stroke="#222" stroke-width="0.35"/>
          <text x="${pageW-margin-2.6}" y="${pageH-margin-30}" text-anchor="end" font-size="3">1 inch check</text>
          <text x="${pageW/2}" y="${pageH-2}" text-anchor="middle" font-size="3">${pageNum} / ${rows*cols} · Row ${r+1}/${rows} · Col ${c+1}/${cols} · 100% / Actual Size</text>
        </svg></div>`;
      }
    }

    // Stay in this document: Safari and embedded browsers can block new tabs.
    // The preview's Print button invokes print synchronously on a fresh tap.
    const preview=document.createElement('div');
    preview.id='sidePrintPreview';
    preview.setAttribute('role','dialog');
    preview.setAttribute('aria-modal','true');
    preview.setAttribute('aria-label','Tiled side template print preview');
    preview.innerHTML=`<style>
      #sidePrintPreview{position:fixed;inset:0;z-index:10000;overflow:auto;background:#eee;color:#26221f;font-family:system-ui,-apple-system,sans-serif;-webkit-overflow-scrolling:touch}
      #sidePrintPreview .side-print-toolbar{position:sticky;top:0;z-index:1;padding:12px;background:#fff;border-bottom:1px solid #bbb;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center}
      #sidePrintPreview button{font:inherit;font-size:17px;padding:12px 18px;touch-action:manipulation}
      #sidePrintPreview p{flex-basis:100%;margin:0;font-size:13px;text-align:center}
      #sidePrintPreview .side-print-page{width:215.9mm;max-width:100%;margin:12px auto;background:#fff;overflow:hidden}
      #sidePrintPreview .side-print-page>svg{display:block;width:100%;height:auto;max-width:none}
      @media print{
        @page{size:letter portrait;margin:0}
        html,body{margin:0!important;padding:0!important;overflow:visible!important;height:auto!important;background:white!important}
        body>:not(#sidePrintPreview){display:none!important}
        #sidePrintPreview{display:block!important;position:static!important;overflow:visible!important;height:auto!important;background:white!important}
        #sidePrintPreview .side-print-toolbar{display:none!important}
        #sidePrintPreview .side-print-page{width:215.9mm!important;height:279.4mm!important;max-width:none!important;margin:0!important;padding:0!important;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}
        #sidePrintPreview .side-print-page:last-child{break-after:auto;page-break-after:auto}
        #sidePrintPreview .side-print-page>svg{width:215.9mm!important;height:279.4mm!important}
      }
    </style><div class="side-print-toolbar"><button type="button" id="sidePrintNow">Print / Save PDF</button><button type="button" id="sidePrintClose">Back to template</button><p>${rows*cols} portrait Letter sheets · Join rows top to bottom with ¼ inch overlap. Print at 100% / Actual Size, with headers and footers off; verify the 1 inch square.</p><p id="sidePrintMessage" role="status"></p></div>${pages}`;
    const previousOverflow=document.body.style.overflow;
    const previousFocus=document.activeElement;
    function close(){
      preview.remove();
      document.body.style.overflow=previousOverflow;
      document.removeEventListener('keydown',onKey);
      if(previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    function onKey(event){
      if(event.key==='Escape') close();
      if(event.key==='Tab'){
        event.preventDefault();
        const print=preview.querySelector('#sidePrintNow');
        const back=preview.querySelector('#sidePrintClose');
        (document.activeElement===print?back:print).focus();
      }
    }
    document.body.appendChild(preview);
    document.body.style.overflow='hidden';
    preview.querySelector('#sidePrintNow').addEventListener('click',()=>{
      try{ window.print(); }
      catch(error){ preview.querySelector('#sidePrintMessage').textContent='Use your browser’s Share or File menu and choose Print.'; }
    });
    preview.querySelector('#sidePrintClose').addEventListener('click',close);
    document.addEventListener('keydown',onKey);
    preview.querySelector('#sidePrintNow').focus();
  }

  // Delegate on the document so this also works before the button exists and
  // blocks an old target-level handler during a rolling route deployment.
  document.addEventListener('click',function(event){
    if(!event.target.closest || !event.target.closest('#printTiles')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try{ tiledPrint(); }
    catch(error){ alert('Unable to prepare tiled print. '+error.message); }
  },true);
})();
