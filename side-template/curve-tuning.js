/* OM curve tuning + adjustable lower-bout radius control. */
(function(){
  const DEFAULT_LOWER_RADIUS=140;
  const MIN_LOWER_RADIUS=70;
  const MAX_LOWER_RADIUS=300;
  const svgNS='http://www.w3.org/2000/svg';

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function clamp01(t){return clamp(t,0,1);}
  function smoothstep(t){t=clamp01(t);return t*t*(3-2*t);}
  function bump(t){t=clamp01(t);return 16*t*t*(1-t)*(1-t);}

  function radiusValue(){
    const el=document.getElementById('lowerBoutRadius');
    const n=el?Number(el.value):DEFAULT_LOWER_RADIUS;
    return clamp(Number.isFinite(n)?n:DEFAULT_LOWER_RADIUS,MIN_LOWER_RADIUS,MAX_LOWER_RADIUS);
  }

  function tailExponent(){
    // 140 mm reproduces the previous tuned OM curve (exponent 2.2).
    // A larger value keeps the lower bout fuller for longer; a smaller
    // value turns toward the tail block sooner.
    return clamp(0.8+radiusValue()/100,1.5,3.8);
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
      u=smoothstep(t)+0.032*bump(t);
    }else if(shape==='tail'){
      u=1-Math.sqrt(Math.max(0,1-Math.pow(t,tailExponent())));
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

  function renderAll(){
    if(typeof window.render==='function') window.render();
  }

  function ensureRadiusInput(){
    if(document.getElementById('lowerBoutRadius')) return;
    const lowerPos=document.getElementById('lowerBoutPos');
    if(!lowerPos||!lowerPos.parentElement) return;

    const label=document.createElement('label');
    label.textContent='Lower Bout Radius (mm)';
    const input=document.createElement('input');
    input.id='lowerBoutRadius';
    input.type='number';
    input.step='1';
    input.min=String(MIN_LOWER_RADIUS);
    input.max=String(MAX_LOWER_RADIUS);
    input.value=String(DEFAULT_LOWER_RADIUS);
    input.setAttribute('aria-label','Lower bout curve radius in millimeters');
    label.appendChild(input);
    lowerPos.parentElement.parentElement.appendChild(label);

    input.addEventListener('input',()=>{
      const n=Number(input.value);
      if(Number.isFinite(n)) input.value=String(clamp(n,MIN_LOWER_RADIUS,MAX_LOWER_RADIUS));
      renderAll();
    });
  }

  function pointToSvg(svg,clientX,clientY){
    const ctm=svg.getScreenCTM();
    if(!ctm) return null;
    const pt=svg.createSVGPoint();
    pt.x=clientX; pt.y=clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  let radiusDrag=null;

  function decorateRadiusHandle(){
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg) return;
    svg.querySelectorAll('[data-lower-radius-handle]').forEach(n=>n.remove());
    if(typeof readInputs!=='function') return;

    const p=readInputs();
    const widthFn=window.makeWidthFunction(p);
    const xL=p.lowerBoutPos;
    const xT=p.bodyLength;
    const t=0.58;
    const x=xL+(xT-xL)*t;
    const y=-widthFn(x)/2;

    const g=document.createElementNS(svgNS,'g');
    g.setAttribute('data-lower-radius-handle','true');

    const guide=document.createElementNS(svgNS,'line');
    guide.setAttribute('x1',x);
    guide.setAttribute('x2',x);
    guide.setAttribute('y1',y);
    guide.setAttribute('y2','0');
    guide.setAttribute('stroke','#6f7f5f');
    guide.setAttribute('stroke-width','0.8');
    guide.setAttribute('stroke-dasharray','3 3');
    guide.style.pointerEvents='none';

    const halo=document.createElementNS(svgNS,'circle');
    halo.setAttribute('cx',x);
    halo.setAttribute('cy',y);
    halo.setAttribute('r','15');
    halo.setAttribute('fill','transparent');
    halo.style.touchAction='none';
    halo.style.cursor='ns-resize';
    halo.setAttribute('role','slider');
    halo.setAttribute('tabindex','0');
    halo.setAttribute('aria-label','Lower bout radius');
    halo.setAttribute('aria-valuemin',String(MIN_LOWER_RADIUS));
    halo.setAttribute('aria-valuemax',String(MAX_LOWER_RADIUS));
    halo.setAttribute('aria-valuenow',String(Math.round(radiusValue())));

    const circle=document.createElementNS(svgNS,'circle');
    circle.setAttribute('cx',x);
    circle.setAttribute('cy',y);
    circle.setAttribute('r','7');
    circle.setAttribute('fill','#fff');
    circle.setAttribute('stroke','#6f7f5f');
    circle.setAttribute('stroke-width','2');
    circle.style.pointerEvents='none';

    const text=document.createElementNS(svgNS,'text');
    text.setAttribute('x',x+10);
    text.setAttribute('y',y-8);
    text.setAttribute('font-size','7');
    text.setAttribute('fill','#6f7f5f');
    text.textContent='Radius';
    text.style.pointerEvents='none';

    halo.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const pt=pointToSvg(svg,e.clientX,e.clientY);
      if(!pt) return;
      radiusDrag={pointerId:e.pointerId,startY:pt.y,startRadius:radiusValue()};
    });

    halo.addEventListener('keydown',e=>{
      if(e.key!=='ArrowUp'&&e.key!=='ArrowDown') return;
      e.preventDefault();
      const step=e.shiftKey?10:2;
      setRadius(radiusValue()+(e.key==='ArrowUp'?step:-step));
    });

    g.append(guide,halo,circle,text);
    svg.appendChild(g);
  }

  function setRadius(value){
    const input=document.getElementById('lowerBoutRadius');
    if(!input) return;
    input.value=String(Math.round(clamp(value,MIN_LOWER_RADIUS,MAX_LOWER_RADIUS)));
    renderAll();
  }

  window.addEventListener('pointermove',e=>{
    if(!radiusDrag||e.pointerId!==radiusDrag.pointerId) return;
    const svg=document.querySelector('svg[aria-label="Top view"]');
    if(!svg) return;
    const pt=pointToSvg(svg,e.clientX,e.clientY);
    if(!pt) return;
    e.preventDefault();
    // Drag upward = larger/full-radius lower bout; downward = smaller/tighter.
    const delta=radiusDrag.startY-pt.y;
    setRadius(radiusDrag.startRadius+delta*1.35);
  },{passive:false});

  window.addEventListener('pointerup',e=>{
    if(radiusDrag&&e.pointerId===radiusDrag.pointerId) radiusDrag=null;
  });
  window.addEventListener('pointercancel',()=>{radiusDrag=null;});

  function resetRadius(){
    const input=document.getElementById('lowerBoutRadius');
    if(input) input.value=String(DEFAULT_LOWER_RADIUS);
    renderAll();
  }

  ensureRadiusInput();
  const reset=document.getElementById('resetBtn');
  if(reset) reset.addEventListener('click',()=>requestAnimationFrame(resetRadius));

  const canvas=document.getElementById('canvas');
  if(canvas&&!canvas.__lowerRadiusObserver){
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending) return;
      pending=true;
      requestAnimationFrame(()=>{
        pending=false;
        decorateRadiusHandle();
      });
    });
    observer.observe(canvas,{childList:true,subtree:false});
    canvas.__lowerRadiusObserver=observer;
  }

  renderAll();
  requestAnimationFrame(()=>requestAnimationFrame(decorateRadiusHandle));
})();
