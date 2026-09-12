/* Measured Dreadnought outside half-contour from Binder11.pdf, sheet 5.
 * Connected solid outline vertices, PDF points converted at 25.4/72 mm.
 * Longitudinal scale normalized to 513.3 mm; transverse dimensions retained.
 */
(function(){
  const referenceLength=513.3;
  const samples=[[0.0,27.26304165],[0.3711757,36.79405621],[1.04943131,46.30807075],[1.481803,53.5400818],[2.13026056,60.75509282],[2.994304,67.94710381],[4.07303338,75.11111475],[5.36564877,82.23912564],[6.57686949,87.36213347],[8.04067367,92.41814119],[9.75346155,97.3961488],[11.7112334,102.28215626],[13.90888954,107.06616357],[16.34113033,111.7341707],[19.00205615,116.27617764],[21.56358847,119.90318319],[24.37060473,123.34318844],[27.4096058,126.57999339],[30.66579265,129.598298],[34.12366631,132.38340225],[37.76642786,134.92180613],[41.57647845,137.20130961],[45.53561929,139.21091268],[49.62465163,140.94091533],[55.10009321,142.65211794],[60.65942931,144.0672201],[66.28626098,145.18222181],[71.9658892,145.99402305],[77.67951519,146.50002382],[83.41313988,146.69902412],[89.14876443,146.59032396],[94.8703899,146.17422332],[100.5610174,145.45202222],[109.51543125,144.2637204],[118.44984642,142.92351836],[127.35926322,141.43201608],[138.19755375,139.77801355],[149.07184194,138.37501141],[155.39942774,137.64201029],[161.75101197,137.16270955],[168.11659529,136.93780921],[174.48617834,136.96770926],[180.84876186,137.25250969],[186.89036638,138.09471098],[192.88897372,139.19781266],[198.83458453,140.55971474],[204.71519959,142.17781722],[210.52081956,144.04902007],[216.23944523,146.17002331],[221.86107724,148.53672693],[225.69982596,150.0863293],[233.83229362,153.51623454],[241.83077005,157.24624024],[248.83831134,160.55544529],[255.93484681,163.66955005],[261.58247713,166.11165378],[267.19510973,168.63365763],[274.64162229,171.90896264],[282.15813027,175.01726739],[289.7426338,177.95717188],[297.61911821,181.22027686],[305.5875966,184.25038149],[313.6430693,187.04468576],[321.77553696,189.60088967],[329.98099984,191.91669321],[338.25045853,193.99019637],[346.57691349,195.81949917],[354.72338023,196.91770085],[362.90284482,197.71750207],[371.10730776,198.21780283],[379.32476986,198.41810314],[385.00439808,198.40550312],[390.67502688,198.08010262],[396.31865746,197.44310165],[401.91929085,196.4962002],[407.45892823,195.24229829],[412.92157065,193.68529591],[419.03117072,191.56109266],[425.03177793,189.14818898],[430.91139306,186.45218486],[436.65601702,183.47908031],[442.25165074,180.23577536],[447.68729493,176.72957],[452.94895051,172.96836426],[458.02661813,168.96075813],[462.90629871,164.71575165],[467.57899284,160.24314482],[472.03370124,155.55303765],[476.25942463,150.65603017],[480.2471636,145.56332239],[483.98791873,140.28641433],[487.47269062,134.837206],[490.69447973,129.22819743],[493.64528657,123.47218864],[496.31811161,117.58217964],[498.70795518,111.57117046],[500.80781772,105.45316111],[502.61469945,99.24215162],[503.75162503,94.81614486],[505.41651604,87.76413408],[506.85042218,80.66212323],[508.05234351,73.51711232],[509.02128008,66.33710135],[509.7542321,59.12909034],[510.29019702,53.28708141],[511.49211834,39.9940611],[512.3940593,26.67804076],[512.99701983,13.34402039],[513.3,0.0]];
  const upper=samples.filter(p=>p[0]>30&&p[0]<130).reduce((a,b)=>a[1]>b[1]?a:b);
  const waist=samples.filter(p=>p[0]>130&&p[0]<250).reduce((a,b)=>a[1]<b[1]?a:b);
  const lower=samples.filter(p=>p[0]>250&&p[0]<450).reduce((a,b)=>a[1]>b[1]?a:b);
  const stations=[samples[0],upper,waist,lower,samples[samples.length-1]];
  window.usonianDreadnoughtReference={length:referenceLength,samples,stations};
  window.usonianUsesMeasuredDreadnought=()=>document.getElementById('preset')?.value==='dread14';
  function referenceWidth(x){
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid][0]<=x)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi];
    return 2*(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
  }
  const previousWidth=window.makeWidthFunction;
  window.makeWidthFunction=function(p){
    if(!window.usonianUsesMeasuredDreadnought()) return previousWidth(p);
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
    // Include the neck-face half-width in the developed path, matching the
    // plan's 771 mm centerline-to-centerline template. The contour itself
    // still starts at the outer neck corner; no joinery notch is traced.
    fn.samplePoints=[{x:0,w:0},...fn.sampleXs.map(x=>({x,w:fn(x)}))];
    return fn;
  };
  const render=window.render;
  window.render=function(){
    render();
    const measured=window.usonianUsesMeasuredDreadnought();
    if(measured){
      for(const id of ['lowerBoutFrontRadius','lowerBoutRadius','upperBoutNeckRadius','upperBoutWaistRadius']){
        const el=document.getElementById(id);
        if(el) el.parentElement.hidden=true;
      }
    }
    const note=document.getElementById('dreadContourNote');
    if(note) note.hidden=!measured;
  };
  window.render();
})();
