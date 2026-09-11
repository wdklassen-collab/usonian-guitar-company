/* Usonian side-template body presets. */
(function(){
  const presets={
    om14:{
      label:'OM',
      values:{
        bodyLength:485.8,backRadius:4572,neckDepth:79.3,tailDepth:104.5,
        neckExtension:15,tailExtension:15,neckBlockWidth:63.5,tailBlockWidth:63.5,
        upperBoutWidth:288.7,upperBoutPos:103.4,waistWidth:234.3,waistPos:204.5,
        lowerBoutWidth:381.1,lowerBoutPos:355.6,
        upperBoutNeckRadius:140,upperBoutWaistRadius:140,lowerBoutFrontRadius:140,lowerBoutRadius:140
      }
    },
    dread14:{
      label:'Dreadnought',
      values:{
        bodyLength:513.3,backRadius:4572,neckDepth:95.3,tailDepth:120.7,
        neckExtension:25,tailExtension:25,neckBlockWidth:63,tailBlockWidth:63,
        upperBoutWidth:292.6,upperBoutPos:90,waistWidth:273.8,waistPos:190,
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
      select.addEventListener('change',()=>{
        currentPreset=select.value;
        applyPreset(select.value);
      });
    }

    const reset=document.getElementById('resetBtn');
    if(reset){
      reset.textContent='Reset to Defaults';
      reset.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        const selected=document.getElementById('preset');
        const key=selected&&presets[selected.value]?selected.value:currentPreset;
        applyPreset(key);
      },true);
    }
  }

  window.usonianSidePresets=presets;
  window.applyUsonianSidePreset=applyPreset;
  install();
})();