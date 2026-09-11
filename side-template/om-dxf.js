/* Measured OM outside half-contour; original DXF is inches (INSUNITS=1).
 * Non-cutaway Cutout entity 146, vertices 1..19. CNC neck notch excluded.
 * Circular bulge segments are sampled before longitudinal scaling to 485.8 mm.
 */
(function(){
  const vertices=[[0.0,9.4993496933,-0.0076205067795197],[0.482690088,38.6756336185,-0.0621202153774444],[6.543059082,86.5417379196,-0.1373182945193822],[31.5734801251,127.9112845182,-0.1578179486875345],[69.4940975523,143.5049945456,-0.1044558102511758],[102.6011695684,141.4329771039,-0.0566645955904848],[130.5497969976,128.1113576803,0.0703674738354035],[151.5163362934,118.4794871884,0.0727562853599796],[164.5077591134,117.2284475088,0.0854364633383323],[190.1181889482,123.2264997623,0.0601483400324406],[229.1597173712,147.101805062,-0.0443697475081118],[271.4046065279,173.5470764065,-0.0678062814618382],[313.1471029052,187.2510080151,-0.0536417410161247],[357.0938440289,190.4723368957,-0.0898469056031525],[401.7309440025,181.1182013839,-0.180801382604979],[465.8005608119,123.9128357577,-0.0576280979777832],[477.3524559268,91.1689215758,-0.0348798396474537],[483.0368777577,54.916310099,-0.0317925522234648],[486.5125895526,0.0,-0.0317925522234817]];
  const referenceLength=485.8;
  const scaleX=referenceLength/vertices[vertices.length-1][0];
  const samples=[];
  for(let i=0;i<vertices.length-1;i++){
    const [x,y,b]=vertices[i], [x1,y1]=vertices[i+1];
    const dx=x1-x,dy=y1-y;
    if(Math.abs(b)<1e-12){samples.push([x*scaleX,y]);continue;}
    const cx=(x+x1)/2-dy*(1-b*b)/(4*b);
    const cy=(y+y1)/2+dx*(1-b*b)/(4*b);
    const radius=Math.hypot(x-cx,y-cy);
    const start=Math.atan2(y-cy,x-cx),sweep=4*Math.atan(b);
    const count=Math.max(2,Math.ceil(radius*Math.abs(sweep)/0.25));
    const fractions=Array.from({length:count},(_,j)=>j/count);
    // Include exact cardinal extrema for accurate bout widths and stations.
    for(let k=-8;k<=8;k++){
      const t=(k*Math.PI/2-start)/sweep;
      if(t>0&&t<1) fractions.push(t);
    }
    fractions.sort((a,b)=>a-b);
    for(const t of fractions){
      const angle=start+sweep*t;
      samples.push([(cx+radius*Math.cos(angle))*scaleX,cy+radius*Math.sin(angle)]);
    }
  }
  // The DXF tail arc extends 0.00003 mm past its centerline endpoint.
  // Remove that numerical-scale overhang to keep width(x) single-valued.
  while(samples.length && samples[samples.length-1][0]>=referenceLength) samples.pop();
  samples.push([referenceLength,0]);
  samples[0]=[0,vertices[0][1]];
  const upper=samples.filter(p=>p[0]>30&&p[0]<130).reduce((a,b)=>a[1]>b[1]?a:b);
  const waist=samples.filter(p=>p[0]>130&&p[0]<250).reduce((a,b)=>a[1]<b[1]?a:b);
  const lower=samples.filter(p=>p[0]>250&&p[0]<450).reduce((a,b)=>a[1]>b[1]?a:b);
  const stations=[samples[0],upper,waist,lower,samples[samples.length-1]];
  window.usonianOMReference={length:referenceLength,samples,stations};
  window.usonianUsesMeasuredOM=()=>document.getElementById('preset')?.value!=='dread14';
  function referenceWidth(x){
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid][0]<=x)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi];
    return 2*(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
  }
  const previousWidth=window.makeWidthFunction;
  window.makeWidthFunction=function(p){
    if(!window.usonianUsesMeasuredOM()) return previousWidth(p);
    const length=Math.max(4,p.bodyLength);
    const targetX=[0,
      Math.max(1,Math.min(length-3,p.upperBoutPos)),0,0,length];
    targetX[2]=Math.max(targetX[1]+1,Math.min(length-2,p.waistPos));
    targetX[3]=Math.max(targetX[2]+1,Math.min(length-1,p.lowerBoutPos));
    const targetW=[p.neckBlockWidth,p.upperBoutWidth,p.waistWidth,p.lowerBoutWidth,p.tailBlockWidth];
    function segment(x,xs){let i=0;while(i<3&&x>xs[i+1])i++;return i;}
    const sourceX=stations.map(s=>s[0]);
    const fn=function(x){
      x=Math.max(0,Math.min(length,x));
      const i=segment(x,targetX),t=(x-targetX[i])/(targetX[i+1]-targetX[i]);
      const rx=sourceX[i]+t*(sourceX[i+1]-sourceX[i]);
      const u=(referenceWidth(rx)-2*stations[i][1])/(2*(stations[i+1][1]-stations[i][1]));
      return Math.max(0,targetW[i]+u*(targetW[i+1]-targetW[i]));
    };
    // Arc-spaced samples retain near-vertical shoulders and tail curvature;
    // uniform body-X sampling alone underestimates their developed length.
    fn.sampleXs=samples.map(s=>{
      const i=segment(s[0],sourceX),t=(s[0]-sourceX[i])/(sourceX[i+1]-sourceX[i]);
      return targetX[i]+t*(targetX[i+1]-targetX[i]);
    });
    return fn;
  };
  const render=window.render;
  window.render=function(){
    const measured=window.usonianUsesMeasuredOM();
    for(const id of ['lowerBoutFrontRadius','lowerBoutRadius','upperBoutNeckRadius','upperBoutWaistRadius']){
      const el=document.getElementById(id);
      if(el) el.parentElement.hidden=measured;
    }
    const note=document.getElementById('omContourNote');
    if(note) note.hidden=!measured;
    render();
  };
  window.render();
})();
