/* Usonian side-template body presets. */
(function(){
  const presets={
    om14:{
      label:'OM-14',
      values:{
        bodyLength:485.8,backRadius:4572,neckDepth:79.3,tailDepth:104.5,
        neckExtension:15,tailExtension:15,neckBlockWidth:63.5,tailBlockWidth:63.5,
        upperBoutWidth:288.7,upperBoutPos:103.4,waistWidth:234.3,waistPos:204.5,
        lowerBoutWidth:381.1,lowerBoutPos:355.6,
        upperBoutNeckRadius:140,upperBoutWaistRadius:140,lowerBoutFrontRadius:140,lowerBoutRadius:140
      }
    },
    dread14:{
      label:'Dreadnought-14',
      values:{
        bodyLength:508.0,backRadius:4572,neckDepth:100.0,tailDepth:123.8,
        neckExtension:15,tailExtension:15,neckBlockWidth:76.2,tailBlockWidth:76.2,
        upperBoutWidth:292.1,upperBoutPos:111.1,waistWidth:276.2,waistPos:228.6,
        lowerBoutWidth:396.9,lowerBoutPos:381.0,
        upperBoutNeckRadius:165,upperBoutWaistRadius:155,lowerBoutFrontRadius:165,lowerBoutRadius:175
      }
    }
  };

  let currentPreset='om14';

  function applyPreset(key){
    const preset=presets[key]||presets.om14;
    currentPreset=key in presets?key:'om14';
    Object.entries(preset.values).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.value=String(value);
    });
    const select=document.getElementById('preset');
    if(select&&select.value!==currentPreset) select.value=currentPreset;
    if(typeof window.render==='function') window.render();
  }

  function install(){
    const select=document.getElementById('preset');
    if(select){
      select.innerHTML='';
      Object.entries(presets).forEach(([key,preset])=>{
        const option=document.createElement('option');
        option.value=key;
        option.textContent=preset.label;
        select.appendChild(option);
      });
      select.value=currentPreset;
      select.addEventListener('change',()=>applyPreset(select.value));
    }

    const reset=document.getElementById('resetBtn');
    if(reset){
      reset.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        applyPreset(currentPreset);
      },true);
    }
  }

  window.usonianSidePresets=presets;
  window.applyUsonianSidePreset=applyPreset;
  install();
})();