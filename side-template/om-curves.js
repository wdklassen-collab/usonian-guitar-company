/* OM outline override + draggable position and mirrored width handles. */
(function(){
  function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function segment(x,x0,x1,y0,y1,shape){
    if(x1<=x0) return y1;
    let t=(x-x0)/(x1-x0); t=Math.max(0,Math.min(1,t));
    let u;
    if(shape==='neck') u=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
    else if(shape==='tail') u=1-Math.sqrt(Math.max(0,1-t*t));
    else u=smoothstep(t);
    return y0+(y1-y0)*u;
  }

  window.makeWidthFunction=function(p){
    const x0=0;
    const x1=Math.max(x0+1,Math.min(p.bodyLength-3,p.upperBoutPos));
    const x2=Math.max(x1+1,Math.min(p.bodyLength-2,p.waistPos));
    const x3=Math.max(x2+1,Math.min(p.bodyLength-1,p.lowerBoutPos));
    const x4=p.bodyLength;
    const y0=p.neckBlockWidth,y1=p.upperBoutWidth,y2=p.waistWidth,y3=p.lowerBoutWidth,y4=p.tailBlockWidth;
    return function(x){
      x=Math.max(0,Math.min(p.bodyLength,x));
      if(x<=x1) return segment(x,x0,x1,y0,y1,'neck');
      if(x<=x2) return segment(x,x1,x2,y1,y2,'upper-waist');
      if(x<=x3) return segment(x,x2,x3,y2,y3,'waist-lower');
      return segment(x,x3,x4,y3,y4,'tail');
    };
  };

  const stations=[
    {key:'upper',pos:'upperBoutPos',width:'upperBoutWidth',label:'Upper bout'},
    {key:'waist',pos:'waistPos',width:'waistWidth',label:'Waist'},
    {key:'lower',pos:'lowerBoutPos',width:'lowerBoutWidth',label:'Lower bout'}
  ];
  const svgNS='http://www.w3.org/2000/svg';
  let active=null;

  const omDefaults={
    bodyLength:485.8,
    backRadius:4572,
    neckDepth:79.3,
    tailDepth:104.5,
    neckExtension:15,
    tailExtension:15,
    neckBlockWidth:18.9987,
    tailBlockWidth:0,
    upperBoutWidth:288.7096,
    upperBoutPos:81.0238,
    waistWidth:234.3475,
    waistPos:162.0503,
    lowerBoutWidth:381.1829,
    lowerBoutPos:349.5777
  };

  function params(){return typeof readInputs==='function'?readInputs():null;}
  function posBounds(key,p){
    const gap=20;
    if(key==='upper') return [gap,Math.max(gap,p.waistPos-gap)];
    if(key==='waist') return [p.upperBoutPos+gap,Math.max(p.upperBoutPos+gap,p.lowerBoutPos-gap)];
    return [p.waistPos+gap,Math.max(p.waistPos+gap,p.bodyLength-gap)];
  }
  function setInput(id,value){
    const el=document.getElementById(id); if(!el) return;
    el.value=value.toFixed(1);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function applyOmDefaults(){
    Object.entries(omDefaults).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.value=String(value);
    });
    if(typeof window.render==='function') window.render();
    decorate();
  }
  function setPos(def,value){
    const p=params(); if(!p) return;
    const b=posBounds(def.key,p);
    setInput(def.pos,Math.max(b[0],Math.min(b[1],value)));
  }
  function setWidth(def,value){
    const v=Math.max(40,Math.min(600,value));
    setInput(def.width,v);
  }
  function clientToSvg(svg,x,y){
    const ctm=svg.getScreenCTM(); if(!ctm) return null;
    const pt=svg.createSVGPoint(); pt.x=x; pt.y=y;
    return pt.matrixTransform(ctm.inverse());
  }

  function decorate(){
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg) return;
    svg.querySelectorAll('[data-usonian-handle]').forEach(n=>n.remove());
    const p=params(); if(!p) return;

    stations.forEach(def=>{
      const x=p[def.pos];
      const half=p[def.width]/2;
      const yTop=-half;

      const posGroup=document.createElementNS(svgNS,'g');
      posGroup.setAttribute('data-usonian-handle',def.key+'-pos');
      const posHalo=document.createElementNS(svgNS,'circle');
      posHalo.setAttribute('cx',x); posHalo.setAttribute('cy','0'); posHalo.setAttribute('r','13');
      posHalo.setAttribute('fill','transparent'); posHalo.style.touchAction='none'; posHalo.style.cursor='ew-resize';
      const posCircle=document.createElementNS(svgNS,'circle');
      posCircle.setAttribute('cx',x); posCircle.setAttribute('cy','0'); posCircle.setAttribute('r','6.5');
      posCircle.setAttribute('fill','#fff'); posCircle.setAttribute('stroke','#9b5f36'); posCircle.setAttribute('stroke-width','2');
      posCircle.style.pointerEvents='none';
      const posGrip=document.createElementNS(svgNS,'path');
      posGrip.setAttribute('d',`M ${x-3.2} -2.5 L ${x+3.2} -2.5 M ${x-3.2} 2.5 L ${x+3.2} 2.5`);
      posGrip.setAttribute('stroke','#9b5f36'); posGrip.setAttribute('stroke-width','1.2'); posGrip.setAttribute('fill','none'); posGrip.style.pointerEvents='none';
      posHalo.addEventListener('pointerdown',e=>{e.preventDefault();active={kind:'pos',def,pointerId:e.pointerId};});
      posGroup.append(posHalo,posCircle,posGrip); svg.appendChild(posGroup);

      const widthGroup=document.createElementNS(svgNS,'g');
      widthGroup.setAttribute('data-usonian-handle',def.key+'-width');

      const guide=document.createElementNS(svgNS,'line');
      guide.setAttribute('x1',x); guide.setAttribute('x2',x); guide.setAttribute('y1',yTop); guide.setAttribute('y2','0');
      guide.setAttribute('stroke','#2f6fb0'); guide.setAttribute('stroke-width','0.8'); guide.setAttribute('stroke-dasharray','3 3');
      guide.style.pointerEvents='none';

      const halo=document.createElementNS(svgNS,'circle');
      halo.setAttribute('cx',x); halo.setAttribute('cy',yTop); halo.setAttribute('r','13'); halo.setAttribute('fill','transparent');
      halo.style.touchAction='none'; halo.style.cursor='ns-resize';
      halo.addEventListener('pointerdown',e=>{e.preventDefault();active={kind:'width',def,pointerId:e.pointerId};});

      const c=document.createElementNS(svgNS,'circle');
      c.setAttribute('cx',x); c.setAttribute('cy',yTop); c.setAttribute('r','6.5'); c.setAttribute('fill','#fff');
      c.setAttribute('stroke','#2f6fb0'); c.setAttribute('stroke-width','2'); c.style.pointerEvents='none';

      widthGroup.append(guide,halo,c);
      svg.appendChild(widthGroup);
    });
  }

  window.addEventListener('pointermove',e=>{
    if(!active||e.pointerId!==active.pointerId) return;
    const svg=document.querySelector('svg[aria-label="Top view"]'); if(!svg) return;
    const pt=clientToSvg(svg,e.clientX,e.clientY); if(!pt) return;
    e.preventDefault();
    if(active.kind==='pos') setPos(active.def,pt.x);
    else setWidth(active.def,Math.abs(pt.y)*2);
  },{passive:false});
  window.addEventListener('pointerup',e=>{if(active&&e.pointerId===active.pointerId) active=null;});
  window.addEventListener('pointercancel',()=>{active=null;});

  const canvas=document.getElementById('canvas');
  if(canvas&&!canvas.__usonianHandleObserver){
    let scheduled=false;
    const observer=new MutationObserver(()=>{
      if(scheduled) return; scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;decorate();});
    });
    observer.observe(canvas,{childList:true,subtree:false});
    canvas.__usonianHandleObserver=observer;
  }

  const resetBtn=document.getElementById('resetBtn');
  if(resetBtn) resetBtn.addEventListener('click',()=>requestAnimationFrame(applyOmDefaults));

  applyOmDefaults();
  requestAnimationFrame(()=>requestAnimationFrame(applyOmDefaults));
})();
