/* Developed side geometry: unroll one body side using cumulative top-view arc length. */
(function(){
  function pathFromPoints(points){
    return points.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(3)+' '+pt[1].toFixed(3)).join(' ');
  }

  // Preserve the existing width/depth functions, but add cumulative distance
  // along one half of the body perimeter. This is the actual developed X
  // coordinate for a bent guitar side.
  window.sampleGeometry=function(p){
    const widthFn=window.makeWidthFunction(p);
    const depthFn=window.makeSideDepthFunction(p,widthFn);
    const n=480;
    const samples=[];
    let sideLength=0;
    let prevX=null;
    let prevY=null;

    for(let i=0;i<=n;i++){
      const x=p.bodyLength*i/n;
      const w=widthFn(x);
      const d=depthFn(x);
      const y=-w/2;

      if(prevX!==null){
        sideLength+=Math.hypot(x-prevX,y-prevY);
      }

      samples.push({x,w,d,s:sideLength});
      prevX=x;
      prevY=y;
    }

    return {widthFn,depthFn,samples,sideLength};
  };

  window.sideViewSVG=function(p,g,standalone=false){
    const pad=25;
    const sideL=g.sideLength;
    const x0=-p.neckExtension;
    const x1=sideL+p.tailExtension;
    const bodyPts=g.samples.map(sample=>[sample.s,sample.d]);
    const topY=0;

    const shape=[
      [x0,topY],
      [x1,topY],
      [x1,p.tailDepth],
      [sideL,p.tailDepth],
      ...[...bodyPts].reverse(),
      [0,p.neckDepth],
      [x0,p.neckDepth]
    ];

    const maxD=Math.max(...g.samples.map(sample=>sample.d),p.neckDepth,p.tailDepth);
    const vbX=x0-pad;
    const vbY=-pad;
    const vbW=(x1-x0)+2*pad;
    const vbH=maxD+2*pad+18;
    const profilePath=pathFromPoints(shape)+' Z';
    const backPath=pathFromPoints(bodyPts);

    const body=`
      <path d="${profilePath}" fill="none" stroke="#26221f" stroke-width="1.2"/>
      <path d="${backPath}" fill="none" stroke="#9b5f36" stroke-width="1.1"/>
      <line x1="0" y1="${topY}" x2="${sideL}" y2="${topY}" stroke="#b8b0a8" stroke-dasharray="4 4"/>
      <line x1="0" y1="${topY}" x2="0" y2="${p.neckDepth}" stroke="#9b5f36"/>
      <line x1="${sideL}" y1="${topY}" x2="${sideL}" y2="${p.tailDepth}" stroke="#9b5f36"/>
      <text x="3" y="${p.neckDepth-4}" font-size="8" fill="#6d655f">Neck ${p.neckDepth.toFixed(1)} mm</text>
      <text x="${Math.max(10,sideL-70)}" y="${p.tailDepth-4}" font-size="8" fill="#6d655f">Tail ${p.tailDepth.toFixed(1)} mm</text>
      <text x="${sideL/2}" y="${maxD+13}" text-anchor="middle" font-size="8" fill="#6d655f">Developed side length ${sideL.toFixed(1)} mm</text>`;

    if(standalone){
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}mm" height="${vbH}mm" viewBox="${vbX} ${vbY} ${vbW} ${vbH}"><rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="white"/>${body}</svg>`;
    }
    return `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" aria-label="Side template">${body}</svg>`;
  };

  window.combinedSVG=function(p,g,standalone=false){
    const maxW=Math.max(...g.samples.map(sample=>sample.w));
    const gap=45;
    const sideMax=Math.max(...g.samples.map(sample=>sample.d));
    const topHeight=maxW;
    const sideHeight=sideMax+70;
    const totalHeight=topHeight+gap+sideHeight;
    const pad=30;
    const width=Math.max(p.bodyLength+70,g.sideLength+p.neckExtension+p.tailExtension+70);
    const top=window.topViewSVG(p,g,true);
    const side=window.sideViewSVG(p,g,true);
    const topInner=top.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
    const sideInner=side.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
    const body=`<g transform="translate(${pad},${pad+maxW/2})">${topInner}</g><g transform="translate(${pad+p.neckExtension},${pad+topHeight+gap})">${sideInner}</g>`;

    if(standalone){
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${totalHeight+2*pad}mm" viewBox="0 0 ${width} ${totalHeight+2*pad}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
    }
    return `<svg viewBox="0 0 ${width} ${totalHeight+2*pad}">${body}</svg>`;
  };

  function developedPrintTiled(){
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

    function cross(x,y){
      return `<line x1="${x-3}" y1="${y}" x2="${x+3}" y2="${y}"/><line x1="${x}" y1="${y-3}" x2="${x}" y2="${y+3}"/>`;
    }

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        pageNum++;
        const ox=xMin+c*strideX;
        const oy=yMin+r*strideY;
        const label=`Row ${r+1} / ${rows} · Col ${c+1} / ${cols}`;
        pages+=`<div class="page"><svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}"><rect width="${pageW}" height="${pageH}" fill="white"/><defs><clipPath id="clip${pageNum}"><rect x="${margin}" y="${margin}" width="${usableW}" height="${usableH}"/></clipPath></defs><g clip-path="url(#clip${pageNum})" transform="translate(${margin-ox},${margin-oy})">${inner}</g><g stroke="#555" stroke-width="0.25">${cross(margin,margin)}${cross(pageW-margin,margin)}${cross(margin,pageH-margin)}${cross(pageW-margin,pageH-margin)}</g><rect x="${margin+3}" y="${pageH-margin-28}" width="25.4" height="25.4" fill="none" stroke="#222" stroke-width="0.35"/><text x="${margin+3}" y="${pageH-margin-30}" font-size="3.5">1 inch calibration square</text><text x="${pageW/2}" y="${pageH-3.5}" text-anchor="middle" font-size="3.5">${label} · Print at 100% / Actual Size</text></svg></div>`;
      }
    }

    const win=window.open('','_blank');
    if(!win) return;
    win.document.write(`<!doctype html><html><head><title>Usonian Tiled Side Template</title><style>@page{size:letter portrait;margin:0}html,body{margin:0;padding:0}.page{width:${pageW}mm;height:${pageH}mm;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}svg{display:block;width:${pageW}mm;height:${pageH}mm}</style></head><body>${pages}<script>window.onload=()=>setTimeout(()=>window.print(),150);<\/script></body></html>`);
    win.document.close();
  }

  // The base page already attached its old print handler. Capture phase lets
  // this corrected developed-length handler take ownership of the button.
  const printButton=document.getElementById('printTiles');
  if(printButton){
    printButton.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      developedPrintTiled();
    },true);
  }

  // Show developed side length in the existing status row and redraw using
  // the new geometry immediately after this override is injected.
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){
      baseRender();
      const p=window.readInputs();
      const g=window.sampleGeometry(p);
      const stat=document.getElementById('statDepth');
      if(stat) stat.textContent=`Depth: ${p.neckDepth.toFixed(1)} → ${p.tailDepth.toFixed(1)} mm · Side: ${g.sideLength.toFixed(1)} mm`;
    };
    window.render();
  }
})();