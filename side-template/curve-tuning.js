/* OM curve tuning + 2D lower-bout front and tail curve handles. */
(function(){
  const DEFAULT_RADIUS=140;
  const MIN_RADIUS=70;
  const MAX_RADIUS=300;
  const DEFAULT_FRONT_T=0.34;
  const DEFAULT_TAIL_T=0.58;
  const MIN_T=0.14;
  const MAX_T=0.86;
  const svgNS='http://www.w3.org/2000/svg';

  let tailHandleT=DEFAULT_TAIL_T;
  let drag=null;

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function clamp01(t){return clamp(t,0,1);}
  function smoothstep(t){t=clamp01(t);return t*t*(3-2*t);}
  function bump(t){t=clamp01(t);return 16*t*t*(1-t)*(1-t);}

  function valueOf(id){
    const el=document.getElementById(id);
    const n=el?Number(el.value):DEFAULT_RADIUS;
    return clamp(Number.isFinite(n)?n:DEFAULT_RADIUS,MIN_RADIUS,MAX_RADIUS);
  }

  function frontDefault(){
    const selected=document.getElementById('preset');
    const preset=window.usonianSidePresets && window.usonianSidePresets[selected && selected.value];
    return preset?preset.values.lowerBoutFrontRadius:DEFAULT_RADIUS;
  }
  function frontBias(){
    return clamp(0.032+(frontDefault()-DEFAULT_RADIUS)*0.00055,-0.035,0.115);
  }
  function neutralWidth(t,y0,y1){
    return y0+(y1-y0)*(smoothstep(t)+frontBias()*bump(t));
  }
  function controlOffset(id){
    return (valueOf(id)-(id==='lowerBoutFrontRadius'?frontDefault():DEFAULT_RADIUS))*0.5;
  }
  function influence(t,center){
    // Endpoint-flat and normalized: a control has equal authority anywhere
    // in its permitted range, rather than fading out near the lower anchor.
    return bump(t)/bump(center)*Math.exp(-Math.pow((t-center)/0.20,2));
  }

  function frontSkew(){
    return clamp((handleTFor('lowerBoutFrontRadius')-DEFAULT_FRONT_T)*0.42,-0.11,0.16);
  }

  function tailExponent(){
    return clamp(0.8+valueOf('lowerBoutRadius')/100,1.5,3.8);
  }

  function tailSkew(){
    return clamp((tailHandleT-DEFAULT_TAIL_T)*0.34,-0.15,0.10);
  }

  function blend(x,x0,x1,y0,y1,shape){
    if(x1<=x0) return y1;
    const t=clamp01((x-x0)/(x1-x0));
    let u;
    if(shape==='neck'){
      u=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
    }else if(shape==='upper-waist'){
      u=smoothstep(t)-0.022*bump(t);
    }else if(shape==='waist-lower'){
      const frontT=handleTFor('lowerBoutFrontRadius');
      const baseline=neutralWidth(t,y0,y1);
      const concentration=(y1-y0)*frontSkew()*bump(t)*(2*t-1);
      const displacement=1.4*controlOffset('lowerBoutFrontRadius')*influence(t,frontT);
      // Only protect the centerline; do not cap fullness at the lower-bout
      // width. Both anchors and their tangents remain fixed by the basis.
      return Math.max(2,baseline+concentration+displacement);
    }else if(shape==='tail'){
      const base=1-Math.sqrt(Math.max(0,1-Math.pow(t,tailExponent())));
      u=base+tailSkew()*bump(t)*(2*t-1);
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

  function renderAll(){if(typeof window.render==='function') window.render();}

  function addRadiusInput(id,labelText,afterId,positionDefault){
    if(document.getElementById(id)) return;
    const after=document.getElementById(afterId);
    if(!after||!after.parentElement||!after.parentElement.parentElement) return;
    const label=document.createElement('label');
    label.textContent=labelText;
    const input=document.createElement('input');
    input.id=id;
    input.type='number';
    input.step=positionDefault===undefined?'1':'0.1';
    input.min=positionDefault===undefined?String(MIN_RADIUS):'14';
    input.max=positionDefault===undefined?String(MAX_RADIUS):'86';
    input.value=String(positionDefault===undefined?DEFAULT_RADIUS:positionDefault);
    input.setAttribute('aria-label',labelText);
    label.appendChild(input);
    after.parentElement.parentElement.appendChild(label);
    input.addEventListener('input',()=>{
      if(input.value==='' || !Number.isFinite(Number(input.value))) return;
      if(positionDefault!==undefined) setHandleT('lowerBoutFrontRadius',Number(input.value)/100);
      renderAll();
    });
    input.addEventListener('change',()=>{
      if(positionDefault===undefined) setRadius(id,valueOf(id));
      else {setHandleT('lowerBoutFrontRadius',position(id,positionDefault/100));renderAll();}
    });
  }

  function ensureInputs(){
    addRadiusInput('lowerFrontPosition','Front Radius Position (% waist to lower)','lowerBoutPos',34);
    addRadiusInput('lowerBoutFrontRadius','Front Radius Fullness','lowerBoutPos');
    addRadiusInput('lowerBoutRadius','Lower Bout Tail Radius (mm)','lowerBoutPos');
  }

  function pointToSvg(svg,clientX,clientY){
    const ctm=svg.getScreenCTM();
    if(!ctm) return null;
    const pt=svg.createSVGPoint();
    pt.x=clientX; pt.y=clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  function setRadius(id,value,doRender=true){
    const input=document.getElementById(id);
    if(!input) return;
    input.value=String(Math.round(clamp(value,MIN_RADIUS,MAX_RADIUS)));
    if(doRender) renderAll();
  }

  function position(id,fallback){
    const input=document.getElementById(id);
    const value=input && input.value!==''?Number(input.value)/100:fallback;
    return Number.isFinite(value)?value:fallback;
  }
  function handleTFor(id){
    return id==='lowerBoutRadius'?tailHandleT:clamp(position('lowerFrontPosition',DEFAULT_FRONT_T),MIN_T,MAX_T);
  }
  function setHandleT(id,value){
    if(id==='lowerBoutRadius'){tailHandleT=clamp(value,MIN_T,MAX_T);return;}
    const input=document.getElementById('lowerFrontPosition');
    if(input) input.value=(100*clamp(value,MIN_T,MAX_T)).toFixed(1);
  }

  function appendRadiusHandle(svg,p,widthFn,opts){
    const t=handleTFor(opts.id);
    const x=opts.x0+(opts.x1-opts.x0)*t;
    const curveY=-widthFn(x)/2;
    const independent=opts.id!=='lowerBoutRadius';
    const neutralT=DEFAULT_FRONT_T;
    const y=independent?-neutralWidth(neutralT,p.waistWidth,p.lowerBoutWidth)/2-controlOffset(opts.id):curveY;
    const g=document.createElementNS(svgNS,'g');
    g.setAttribute('data-lower-radius-handle',opts.id);

    const guide=document.createElementNS(svgNS,'line');
    guide.setAttribute('x1',x); guide.setAttribute('x2',x);
    guide.setAttribute('y1',y); guide.setAttribute('y2',independent?curveY:'0');
    guide.setAttribute('stroke','#6f7f5f'); guide.setAttribute('stroke-width','0.8');
    guide.setAttribute('stroke-dasharray','3 3'); guide.style.pointerEvents='none';

    const halo=document.createElementNS(svgNS,'circle');
    halo.setAttribute('cx',x); halo.setAttribute('cy',y); halo.setAttribute('r','16');
    halo.setAttribute('fill','transparent'); halo.style.touchAction='none'; halo.style.cursor='move';
    halo.setAttribute('role','slider'); halo.setAttribute('tabindex','0');
    halo.setAttribute('aria-label',opts.label+' two dimensional curve control');
    halo.setAttribute('aria-valuemin',String(MIN_RADIUS));
    halo.setAttribute('aria-valuemax',String(MAX_RADIUS));
    halo.setAttribute('aria-valuenow',String(Math.round(valueOf(opts.id))));

    const circle=document.createElementNS(svgNS,'circle');
    circle.setAttribute('cx',x); circle.setAttribute('cy',y); circle.setAttribute('r','7');
    circle.setAttribute('fill','#fff'); circle.setAttribute('stroke','#6f7f5f'); circle.setAttribute('stroke-width','2');
    circle.style.pointerEvents='none';

    const cross=document.createElementNS(svgNS,'path');
    cross.setAttribute('d',`M ${x-3} ${y} L ${x+3} ${y} M ${x} ${y-3} L ${x} ${y+3}`);
    cross.setAttribute('stroke','#6f7f5f'); cross.setAttribute('stroke-width','1'); cross.style.pointerEvents='none';

    const text=document.createElementNS(svgNS,'text');
    text.setAttribute('x',x+10); text.setAttribute('y',y-8);
    text.setAttribute('font-size','7'); text.setAttribute('fill','#6f7f5f');
    text.textContent=opts.shortLabel; text.style.pointerEvents='none';

    halo.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const pt=pointToSvg(svg,e.clientX,e.clientY);
      if(!pt) return;
      const canvas=document.getElementById('canvas');
      if(canvas && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      drag={
        pointerId:e.pointerId,
        startY:pt.y,
        startX:pt.x,
        startT:t,
        startRadius:valueOf(opts.id),
        id:opts.id,
        x0:opts.x0,
        x1:opts.x1
      };
    });

    halo.addEventListener('keydown',e=>{
      const rStep=e.shiftKey?10:2;
      const tStep=e.shiftKey?0.04:0.015;
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){
        e.preventDefault();
        setRadius(opts.id,valueOf(opts.id)+(e.key==='ArrowUp'?rStep:-rStep));
      }else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();
        setHandleT(opts.id,handleTFor(opts.id)+(e.key==='ArrowRight'?tStep:-tStep));
        renderAll();
      }
    });

    g.append(guide,halo,circle,cross,text);
    svg.appendChild(g);
  }

  function decorateRadiusHandles(){
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg||typeof readInputs!=='function') return;
    svg.querySelectorAll('[data-lower-radius-handle]').forEach(n=>n.remove());

    const p=readInputs();
    const widthFn=window.makeWidthFunction(p);

    appendRadiusHandle(svg,p,widthFn,{
      id:'lowerBoutFrontRadius',
      x0:p.waistPos,
      x1:p.lowerBoutPos,
      label:'Lower bout front radius',
      shortLabel:'Front Radius'
    });
    appendRadiusHandle(svg,p,widthFn,{
      id:'lowerBoutRadius',
      x0:p.lowerBoutPos,
      x1:p.bodyLength,
      label:'Lower bout tail radius',
      shortLabel:'Tail Radius'
    });
  }

  window.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId) return;
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg) return;
    const pt=pointToSvg(svg,e.clientX,e.clientY);
    if(!pt) return;
    e.preventDefault();

    const span=Math.max(1,drag.x1-drag.x0);
    const newT=drag.startT+(pt.x-drag.startX)/span;
    const deltaY=drag.startY-pt.y;
    setHandleT(drag.id,newT);
    setRadius(drag.id,drag.startRadius+deltaY*(drag.id==='lowerBoutRadius'?1.35:2),false);
    renderAll();
  },{passive:false});

  window.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.pointerId) drag=null;});
  window.addEventListener('pointercancel',()=>{drag=null;});

  ensureInputs();

  const reset=document.getElementById('resetBtn');
  if(reset){
    reset.addEventListener('click',()=>{
      setHandleT('lowerBoutFrontRadius',DEFAULT_FRONT_T);
      tailHandleT=DEFAULT_TAIL_T;
    },true);
  }

  const canvas=document.getElementById('canvas');
  if(canvas&&!canvas.__lowerRadiusObserver){
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending) return;
      pending=true;
      requestAnimationFrame(()=>{pending=false;decorateRadiusHandles();});
    });
    observer.observe(canvas,{childList:true,subtree:false});
    canvas.__lowerRadiusObserver=observer;
  }

  renderAll();
  requestAnimationFrame(()=>requestAnimationFrame(decorateRadiusHandles));
})();