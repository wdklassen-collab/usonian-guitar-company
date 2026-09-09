/* OM outline override + draggable bout-position handles. */
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
      /* OM neck-block -> upper-bout shoulder: one convex quarter-ellipse. */
      u=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
    } else if(shape==='tail'){
      /* OM lower-bout -> tail-block transition: mirrored convex quarter-ellipse. */
      u=1-Math.sqrt(Math.max(0,1-t*t));
    } else {
      /* Keep bout and waist stations as true local extrema. */
      u=smoothstep(t);
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

  const handleDefs=[
    {key:'upper', input:'upperBoutPos', width:'upperBoutWidth', label:'Upper bout'},
    {key:'waist', input:'waistPos', width:'waistWidth', label:'Waist'},
    {key:'lower', input:'lowerBoutPos', width:'lowerBoutWidth', label:'Lower bout'}
  ];

  let activeHandle=null;
  const svgNS='http://www.w3.org/2000/svg';

  function currentParams(){
    return typeof readInputs==='function' ? readInputs() : null;
  }

  function positionBounds(key,p){
    const gap=20;
    if(key==='upper') return [gap, Math.max(gap,p.waistPos-gap)];
    if(key==='waist') return [p.upperBoutPos+gap, Math.max(p.upperBoutPos+gap,p.lowerBoutPos-gap)];
    return [p.waistPos+gap, Math.max(p.waistPos+gap,p.bodyLength-gap)];
  }

  function setPosition(def,value){
    const p=currentParams();
    if(!p) return;
    const bounds=positionBounds(def.key,p);
    value=Math.max(bounds[0],Math.min(bounds[1],value));
    const input=document.getElementById(def.input);
    if(!input) return;
    input.value=value.toFixed(1);
    if(typeof window.render==='function') window.render();
  }

  function clientXToSvgX(svg,clientX,clientY){
    const ctm=svg.getScreenCTM();
    if(!ctm) return null;
    const pt=svg.createSVGPoint();
    pt.x=clientX;
    pt.y=clientY;
    return pt.matrixTransform(ctm.inverse()).x;
  }

  function decorateTopView(){
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg || svg.querySelector('[data-bout-handle]')) return;

    const p=currentParams();
    if(!p) return;

    handleDefs.forEach(def=>{
      const x=p[def.input];
      const y=-p[def.width]/2;

      const g=document.createElementNS(svgNS,'g');
      g.setAttribute('data-bout-handle',def.key);

      const halo=document.createElementNS(svgNS,'circle');
      halo.setAttribute('cx',x);
      halo.setAttribute('cy',y);
      halo.setAttribute('r','11');
      halo.setAttribute('fill','transparent');
      halo.style.cursor='ew-resize';
      halo.style.touchAction='none';

      const circle=document.createElementNS(svgNS,'circle');
      circle.setAttribute('cx',x);
      circle.setAttribute('cy',y);
      circle.setAttribute('r','5.5');
      circle.setAttribute('fill','#ffffff');
      circle.setAttribute('stroke','#9b5f36');
      circle.setAttribute('stroke-width','2');
      circle.style.pointerEvents='none';

      const grip=document.createElementNS(svgNS,'line');
      grip.setAttribute('x1',x-2.5);
      grip.setAttribute('x2',x+2.5);
      grip.setAttribute('y1',y);
      grip.setAttribute('y2',y);
      grip.setAttribute('stroke','#9b5f36');
      grip.setAttribute('stroke-width','1.3');
      grip.style.pointerEvents='none';

      halo.setAttribute('role','slider');
      halo.setAttribute('tabindex','0');
      halo.setAttribute('aria-label',def.label+' position');
      halo.setAttribute('aria-valuenow',x.toFixed(1));
      halo.setAttribute('aria-valuemin',positionBounds(def.key,p)[0].toFixed(1));
      halo.setAttribute('aria-valuemax',positionBounds(def.key,p)[1].toFixed(1));

      halo.addEventListener('pointerdown',e=>{
        e.preventDefault();
        activeHandle={def,pointerId:e.pointerId};
      });

      halo.addEventListener('keydown',e=>{
        if(e.key!=='ArrowLeft' && e.key!=='ArrowRight') return;
        e.preventDefault();
        const step=e.shiftKey?5:1;
        const dir=e.key==='ArrowLeft'?-1:1;
        setPosition(def,p[def.input]+dir*step);
      });

      g.appendChild(halo);
      g.appendChild(circle);
      g.appendChild(grip);
      svg.appendChild(g);
    });
  }

  window.addEventListener('pointermove',e=>{
    if(!activeHandle || e.pointerId!==activeHandle.pointerId) return;
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg) return;
    const x=clientXToSvgX(svg,e.clientX,e.clientY);
    if(x==null) return;
    e.preventDefault();
    setPosition(activeHandle.def,x);
  },{passive:false});

  window.addEventListener('pointerup',e=>{
    if(activeHandle && e.pointerId===activeHandle.pointerId) activeHandle=null;
  });
  window.addEventListener('pointercancel',()=>{ activeHandle=null; });

  /* Wrap the app renderer once so handles are restored after every redraw. */
  if(typeof window.render==='function' && !window.render.__usonianHandles){
    const baseRender=window.render;
    const wrapped=function(){
      baseRender();
      decorateTopView();
    };
    wrapped.__usonianHandles=true;
    window.render=wrapped;
  }

  if(typeof window.render==='function') window.render();
})();
