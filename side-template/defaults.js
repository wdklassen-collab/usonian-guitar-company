(function(){
  const values={
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
    lowerBoutPos:349.5777,
    upperBoutNeckRadius:140,
    upperBoutWaistRadius:140,
    lowerBoutFrontRadius:140,
    lowerBoutRadius:140
  };

  function apply(){
    Object.entries(values).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.value=String(value);
    });
    if(typeof window.render==='function') window.render();
  }

  const reset=document.getElementById('resetBtn');
  if(reset){
    reset.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      apply();
    },true);
  }

  apply();
  requestAnimationFrame(()=>requestAnimationFrame(apply));
})();