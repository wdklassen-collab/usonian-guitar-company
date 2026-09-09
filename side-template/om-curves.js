/* OM outline override: preserve flat neck/tail block ends and use separate smooth OM curves between body stations. */
(function(){
  function smoothstep(t){
    t=Math.max(0,Math.min(1,t));
    return t*t*(3-2*t);
  }

  function segment(x,x0,x1,y0,y1,shape){
    if(x1<=x0) return y1;
    let t=(x-x0)/(x1-x0);
    t=Math.max(0,Math.min(1,t));

    let u;

    if(shape==='neck'){
      /* OM neck-block -> upper-bout shoulder.
         Use a quarter-ellipse style progression instead of smoothstep.
         This leaves the vertical neck-block end with a near-vertical tangent,
         bows outward continuously with no inflection/S-curve, and arrives
         horizontal at the upper-bout maximum. */
      u=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
    } else {
      /* Zero-slope cubic transitions keep the upper/lower bout and waist
         stations as true local extrema. */
      u=smoothstep(t);
      if(shape==='tail'){
        /* Hold lower-bout fullness slightly longer before turning into the
           flat tail-block section. */
        u=1-Math.pow(1-u,1.16);
      }
    }

    return y0+(y1-y0)*u;
  }

  window.makeWidthFunction=function(p){
    const x0=0;
    const x1=Math.max(x0+1,Math.min(p.bodyLength-3,p.upperBoutPos));
    const x2=Math.max(x1+1,Math.min(p.bodyLength-2,p.waistPos));
    const x3=Math.max(x2+1,Math.min(p.bodyLength-1,p.lowerBoutPos));
    const x4=p.bodyLength;

    const y0=p.neckBlockWidth;
    const y1=p.upperBoutWidth;
    const y2=p.waistWidth;
    const y3=p.lowerBoutWidth;
    const y4=p.tailBlockWidth;

    return function(x){
      x=Math.max(0,Math.min(p.bodyLength,x));
      if(x<=x1) return segment(x,x0,x1,y0,y1,'neck');
      if(x<=x2) return segment(x,x1,x2,y1,y2,'upper-waist');
      if(x<=x3) return segment(x,x2,x3,y2,y3,'waist-lower');
      return segment(x,x3,x4,y3,y4,'tail');
    };
  };

  /* Re-render after replacing the width function. */
  if(typeof render==='function') render();
})();
