/* Usonian side-template body presets. */
(function(){
  const presets={
    om14:{
      label:'OM',
      values:{
        bodyLength:485.8,backRadius:4572,neckDepth:79.3,tailDepth:104.5,
        neckExtension:25,tailExtension:25,neckBlockWidth:18.9987,tailBlockWidth:0,
        upperBoutWidth:288.7096,upperBoutPos:81.0238,waistWidth:234.3475,waistPos:162.0503,
        lowerBoutWidth:381.1829,lowerBoutPos:349.5777,
        upperBoutNeckRadius:140,upperBoutWaistRadius:140,lowerBoutFrontRadius:140,lowerBoutRadius:140
      }
    },
    dread14:{
      label:'Dreadnought',
      values:{
        bodyLength:513.3,backRadius:4572,neckDepth:95.3,tailDepth:120.7,
        neckExtension:25,tailExtension:25,neckBlockWidth:54.5260833,tailBlockWidth:0,
        upperBoutWidth:293.39804824,upperBoutPos:83.41313988,waistWidth:273.87561842,waistPos:168.11659529,
        lowerBoutWidth:396.83620628,lowerBoutPos:379.32476986,
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