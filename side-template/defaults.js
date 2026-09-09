(function(){
  const values={
    neckBlockWidth:63.5,
    tailBlockWidth:63.5,
    upperBoutWidth:288.7,
    upperBoutPos:80,
    waistWidth:234.3,
    waistPos:115,
    lowerBoutWidth:381.1,
    lowerBoutPos:195
  };

  function apply(){
    Object.entries(values).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.value=value;
    });
    if(typeof render==='function') render();
  }

  apply();
  const reset=document.getElementById('resetBtn');
  if(reset){
    reset.addEventListener('click',()=>requestAnimationFrame(apply));
  }
})();
