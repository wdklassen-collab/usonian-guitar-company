(function(){
  const values={
    bodyLength:485.8,
    backRadius:4572,
    neckDepth:79.3,
    tailDepth:104.5,
    neckExtension:15,
    tailExtension:15,
    neckBlockWidth:63.5,
    tailBlockWidth:63.5,
    upperBoutWidth:288.7,
    upperBoutPos:103.4,
    waistWidth:234.3,
    waistPos:204.5,
    lowerBoutWidth:381.1,
    lowerBoutPos:355.6,
    lowerBoutRadius:140
  };

  function apply(){
    Object.entries(values).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.value=String(value);
    });
    if(typeof window.render==='function') window.render();
  }

  // This is the authoritative OM reset. Use capture phase so it runs before
  // older reset listeners installed by the base page and geometry add-ons.
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
