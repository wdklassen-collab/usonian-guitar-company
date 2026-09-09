/* Subtle OM curve tuning: tighter waist, fuller lower bout. */
(function(){
  function clamp01(t){return Math.max(0,Math.min(1,t));}
  function smoothstep(t){t=clamp01(t);return t*t*(3-2*t);}
  function bump(t){t=clamp01(t);return 16*t*t*(1-t)*(1-t);}
  function blend(x,x0,x1,y0,y1,shape){
    if(x1<=x0) return y1;
    const t=clamp01((x-x0)/(x1-x0));
    let u;
    if(shape==='neck'){
      u=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
    }else if(shape==='upper-waist'){
      u=smoothstep(t)-0.022*bump(t);
    }else if(shape==='waist-lower'){
      u=smoothstep(t)+0.032*bump(t);
    }else if(shape==='tail'){
      u=1-Math.sqrt(Math.max(0,1-Math.pow(t,2.2)));
    }else{
      u=smoothstep(t);
    }
    u=clamp01(u);
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
      if(x<=x1) return blend(x,x0,x1,y0,y1,'neck');
      if(x<=x2) return blend(x,x1,x2,y1,y2,'upper-waist');
      if(x<=x3) return blend(x,x2,x3,y2,y3,'waist-lower');
      return blend(x,x3,x4,y3,y4,'tail');
    };
  };
})();
