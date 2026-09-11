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

    const xs=widthFn.sampleXs || Array.from({length:n+1},(_,i)=>p.bodyLength*i/n);
    for(const x of xs){
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