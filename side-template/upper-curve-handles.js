/* Add 2D curvature handles for neck->upper-bout and upper-bout->waist regions. */
(function(){
  const MIN_T=0.14, MAX_T=0.86, MIN_R=70, MAX_R=300, DEF_R=140;
  const svgNS='http://www.w3.org/2000/svg';
  let neckT=0.56, upperWaistT=0.48, drag=null;

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function smoothstep(t){t=clamp(t,0,1);return t*t*(3-2*t);}
  function bump(t){t=clamp(t,0,1);return 16*t*t*(1-t)*(1-t);}
  function val(id){const e=document.getElementById(id);const n=e?Number(e.value):DEF_R;return clamp(Number.isFinite(n)?n:DEF_R,MIN_R,MAX_R);}

  function addInput(id,label){
    if(document.getElementById(id)) return;
    const anchor=document.getElementById('lowerBoutPos');
    if(!anchor||!anchor.parentElement||!anchor.parentElement.parentElement) return;
    const l=document.createElement('label'); l.textContent=label+' (mm)';
    const i=document.createElement('input'); i.id=id; i.type='number'; i.step='1'; i.min=MIN_R; i.max=MAX_R; i.value=DEF_R;
    i.addEventListener('input',()=>{const n=Number(i.value);if(Number.isFinite(n))i.value=String(clamp(n,MIN_R,MAX_R)); if(typeof render==='function')render();});
    l.appendChild(i); anchor.parentElement.parentElement.appendChild(l);
  }
  addInput('upperBoutNeckRadius','Neck to Upper Bout Radius');
  addInput('upperBoutWaistRadius','Upper Bout to Waist Radius');

  const priorMakeWidth=window.makeWidthFunction;
  window.makeWidthFunction=function(p){
    const base=priorMakeWidth(p);
    const xU=p.upperBoutPos, xW=p.waistPos;
    const y0=p.neckBlockWidth, yU=p.upperBoutWidth, yW=p.waistWidth;
    return function(x){
      if(x<=xU){
        const t=clamp(x/Math.max(1,xU),0,1);
        const q=clamp(2+(val('upperBoutNeckRadius')-DEF_R)/90,1.2,3.8);
        let u=Math.pow(1-Math.pow(1-t,q),1/q);
        u+=clamp((neckT-0.56)*0.28,-0.12,0.12)*bump(t)*(2*t-1);
        u=clamp(u,0,1);
        return y0+(yU-y0)*u;
      }
      if(x<=xW){
        const t=clamp((x-xU)/Math.max(1,xW-xU),0,1);
        let u=smoothstep(t)+clamp((val('upperBoutWaistRadius')-DEF_R)*0.0005,-0.08,0.08)*bump(t);
        u+=clamp((upperWaistT-0.48)*0.38,-0.14,0.14)*bump(t)*(2*t-1);
        u=clamp(u,0,1);
        return yU+(yW-yU)*u;
      }
      return base(x);
    };
  };

  function pt(svg,cx,cy){const ctm=svg.getScreenCTM();if(!ctm)return null;const p=svg.createSVGPoint();p.x=cx;p.y=cy;return p.matrixTransform(ctm.inverse());}
  function makeHandle(svg,p,id,label,x0,x1,tRef,setT){
    const w=window.makeWidthFunction(p); const x=x0+(x1-x0)*tRef(); const y=-w(x)/2;
    const g=document.createElementNS(svgNS,'g');g.setAttribute('data-upper-curve-handle',id);
    const guide=document.createElementNS(svgNS,'line');guide.setAttribute('x1',x);guide.setAttribute('x2',x);guide.setAttribute('y1',y);guide.setAttribute('y2',0);guide.setAttribute('stroke','#6f7f5f');guide.setAttribute('stroke-dasharray','3 3');guide.style.pointerEvents='none';
    const halo=document.createElementNS(svgNS,'circle');halo.setAttribute('cx',x);halo.setAttribute('cy',y);halo.setAttribute('r',16);halo.setAttribute('fill','transparent');halo.style.touchAction='none';halo.style.cursor='move';
    const c=document.createElementNS(svgNS,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',7);c.setAttribute('fill','#fff');c.setAttribute('stroke','#6f7f5f');c.setAttribute('stroke-width',2);c.style.pointerEvents='none';
    const txt=document.createElementNS(svgNS,'text');txt.setAttribute('x',x+10);txt.setAttribute('y',y-8);txt.setAttribute('font-size',7);txt.setAttribute('fill','#6f7f5f');txt.textContent=label;txt.style.pointerEvents='none';
    halo.addEventListener('pointerdown',e=>{e.preventDefault();const q=pt(svg,e.clientX,e.clientY);if(!q)return;drag={pointerId:e.pointerId,startY:q.y,startR:val(id),id,x0,x1,setT};});
    g.append(guide,halo,c,txt);svg.appendChild(g);
  }
  function decorate(){
    if(window.usonianUsesMeasuredOM && window.usonianUsesMeasuredOM()) return;
    if(window.usonianUsesMeasuredDreadnought && window.usonianUsesMeasuredDreadnought()) return;
    const svg=document.querySelector('svg[aria-label="Top view"]'); if(!svg||typeof readInputs!=='function')return;
    svg.querySelectorAll('[data-upper-curve-handle]').forEach(n=>n.remove()); const p=readInputs();
    makeHandle(svg,p,'upperBoutNeckRadius','Neck Radius',0,p.upperBoutPos,()=>neckT,v=>neckT=v);
    makeHandle(svg,p,'upperBoutWaistRadius','Upper-Waist Radius',p.upperBoutPos,p.waistPos,()=>upperWaistT,v=>upperWaistT=v);
  }
  window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const svg=document.querySelector('svg[aria-label="Top view"]');if(!svg)return;const q=pt(svg,e.clientX,e.clientY);if(!q)return;e.preventDefault();const t=clamp((q.x-drag.x0)/Math.max(1,drag.x1-drag.x0),MIN_T,MAX_T);drag.setT(t);const input=document.getElementById(drag.id);if(input)input.value=String(Math.round(clamp(drag.startR+(drag.startY-q.y)*1.35,MIN_R,MAX_R)));if(typeof render==='function')render();},{passive:false});
  window.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.pointerId)drag=null;});
  window.addEventListener('pointercancel',()=>drag=null);
  const reset=document.getElementById('resetBtn');if(reset)reset.addEventListener('click',()=>{neckT=0.56;upperWaistT=0.48;},true);
  const canvas=document.getElementById('canvas');if(canvas&&!canvas.__upperCurveObs){let pending=false;const mo=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate();});});mo.observe(canvas,{childList:true,subtree:false});canvas.__upperCurveObs=mo;}
  if(typeof render==='function')render();requestAnimationFrame(()=>requestAnimationFrame(decorate));
})();