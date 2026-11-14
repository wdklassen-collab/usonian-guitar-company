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
    const points=widthFn.samplePoints || xs.map(x=>({x,w:widthFn(x)}));
    for(const {x,w} of points){
      const d=depthFn(x);
      const y=-w/2;

      if(prevX!==null){
        sideLength+=Math.hypot(x-prevX,y-prevY);
      }

      samples.push({x,w,d,s:sideLength});
      prevX=x;
      prevY=y;
    }

    const ref=window.usonian00Reference;
    const traced=document.getElementById('profileSource')?.value==='trace00';
    if(traced&&ref){
      const originalLength=sideLength;
      const bodySamples=samples.slice();
      const offset=(p.topThickness??0)+(p.backThickness??0)-(p.trimAllowance??0);
      const interpolate=(a,x,xkey,ykey)=>{
        if(x<=a[0][xkey]) return a[0][ykey];
        for(let i=1;i<a.length;i++){
          if(x<=a[i][xkey]){
            const t=(x-a[i-1][xkey])/(a[i][xkey]-a[i-1][xkey]);
            return a[i-1][ykey]+t*(a[i][ykey]-a[i-1][ykey]);
          }
        }
        return a[a.length-1][ykey];
      };
      sideLength=ref.sideLength;
      samples.length=0;
      for(const [s,d] of ref.side){
        const originalS=s/sideLength*originalLength;
        if(d-offset<=0) throw new Error('Plate thickness exceeds the plan template depth.');
        samples.push({s,d:d-offset,x:interpolate(bodySamples,originalS,'s','x'),w:interpolate(bodySamples,originalS,'s','w')});
      }
      // Preserve the full top-view contour; tracing does not simplify it to
      // the reference's inch-spaced depth stations.
      return {widthFn,depthFn,samples,sideLength,topSamples:bodySamples,traced:true};
    }
    return {widthFn,depthFn,samples,sideLength};
  };

  const originalTop=window.topViewSVG;
  window.topViewSVG=function(p,g,standalone=false){
    return originalTop(p,g.topSamples?{...g,samples:g.topSamples}:g,standalone);
  };

  window.sideViewSVG=function(p,g,standalone=false){
    const pad=25;
    const sideL=g.sideLength;
    const x0=-p.neckExtension;
    const x1=sideL+p.tailExtension;
    const bodyPts=g.samples.map(sample=>[sample.s,sample.d]);
    const topY=0;
    const neckD=g.samples[0].d, tailD=g.samples[g.samples.length-1].d;
    const stationAt=x=>{
      let i=1;
      while(i<g.samples.length-1 && g.samples[i].x<x) i++;
      const a=g.samples[i-1],b=g.samples[i];
      const t=b.x===a.x?0:(x-a.x)/(b.x-a.x);
      return {s:a.s+t*(b.s-a.s),d:a.d+t*(b.d-a.d)};
    };
    const stations=[['Upper bout',p.upperBoutPos],['Waist',p.waistPos],['Lower bout',p.lowerBoutPos]];
    const markers=stations.filter(([,x])=>Number.isFinite(x)).map(([name,x])=>{
      const point=stationAt(x);
      return `<g data-station="${name}"><line x1="${point.s}" y1="0" x2="${point.s}" y2="${point.d}" stroke="#41679b" stroke-width="0.3"/><text x="${point.s+2}" y="12" font-size="3" fill="#41679b" transform="rotate(90 ${point.s+2} 12)">${name}</text></g>`;
    }).join('');
    let grid='';
    for(let inch=1;inch*25.4<sideL;inch++){
      const x=sideL-inch*25.4;
      grid+=`<g data-inch="${inch}"><line x1="${x}" y1="0" x2="${x}" y2="${Math.max(...g.samples.map(s=>s.d))}" stroke="#d8b18f" stroke-width="0.15"/><text x="${x}" y="-3" text-anchor="middle" font-size="3" fill="#6d655f">${inch}</text></g>`;
    }

    const shape=[
      [x0,topY],
      [x1,topY],
      [x1,tailD],
      [sideL,tailD],
      ...[...bodyPts].reverse(),
      [0,neckD],
      [x0,neckD]
    ];

    const maxD=Math.max(...g.samples.map(sample=>sample.d),p.neckDepth,p.tailDepth);
    const vbX=x0-pad;
    const vbY=-pad;
    const vbW=(x1-x0)+2*pad;
    const vbH=maxD+2*pad+18;
    const profilePath=pathFromPoints(shape)+' Z';
    const backPath=pathFromPoints(bodyPts);

    const body=`
      ${grid}
      <path d="${profilePath}" fill="none" stroke="#26221f" stroke-width="1.2"/>
      <path d="${backPath}" fill="none" stroke="#9b5f36" stroke-width="1.1"/>
      ${markers}
      <line x1="0" y1="${neckD}" x2="${sideL}" y2="${tailD}" stroke="#777" stroke-width="0.3" stroke-dasharray="3 2"/>
      <line x1="0" y1="${topY}" x2="${sideL}" y2="${topY}" stroke="#b8b0a8" stroke-dasharray="4 4"/>
      <line x1="0" y1="${topY}" x2="0" y2="${neckD}" stroke="#9b5f36"/>
      <line x1="${sideL}" y1="${topY}" x2="${sideL}" y2="${tailD}" stroke="#9b5f36"/>
      <text x="3" y="${neckD-4}" font-size="8" fill="#6d655f">Neck side ${neckD.toFixed(1)} mm</text>
      <text x="${Math.max(10,sideL-70)}" y="${tailD-4}" font-size="8" fill="#6d655f">Tail side ${tailD.toFixed(1)} mm</text>
      <text x="${sideL/2}" y="${maxD+13}" text-anchor="middle" font-size="4" fill="#6d655f">Body side length ${sideL.toFixed(1)} mm · with extensions ${(sideL+p.neckExtension+p.tailExtension).toFixed(1)} mm · inch stations from tail · ${g.traced?"literal plan trace":"calculated back"} · dashed = straight taper</text>`;

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

  // Existing input listeners retain the original render reference. That
  // renderer reads these overridden geometry/drawing functions dynamically.
  if(typeof window.render==='function') window.render();
})();
