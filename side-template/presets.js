/* Usonian side-template body presets. */
(function(){
  const presets={
    om14:{
      label:'OM-14',
      values:{
        bodyLength:485.8,backRadius:4572,neckDepth:79.3,tailDepth:104.5,
        neckExtension:0,tailExtension:0,neckBlockWidth:18.9987,tailBlockWidth:0,
        upperBoutWidth:288.7096,upperBoutPos:81.0238,waistWidth:234.3475,waistPos:162.0503,
        lowerBoutWidth:381.1829,lowerBoutPos:349.5777,
        upperBoutNeckRadius:140,upperBoutWaistRadius:140,lowerBoutFrontRadius:140,lowerBoutRadius:140
      }
    },
    plan00:{
      label:'00-14',
      values:{
        bodyLength:500,backRadius:4572,neckDepth:87.36733623080782,tailDepth:102.40035489400226,
        neckExtension:0,tailExtension:0,neckBlockWidth:0,tailBlockWidth:0,
        upperBoutWidth:251.15639665391708,upperBoutPos:88.54932948403555,waistWidth:211.82354770236543,waistPos:186.09009273891584,
        lowerBoutWidth:357.4457583533393,lowerBoutPos:363.4637815191076,
        upperBoutNeckRadius:140,upperBoutWaistRadius:140,lowerBoutFrontRadius:140,lowerBoutRadius:140
      }
    },
    dread14:{
      label:'Dreadnought-14',
      values:{
        bodyLength:513.3,backRadius:4572,neckDepth:95.3,tailDepth:120.7,
        neckExtension:0,tailExtension:0,neckBlockWidth:54.5260833,tailBlockWidth:0,
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
    const profile=document.getElementById('profileSource');
    if(profile&&currentPreset!=='plan00') profile.value='calculated';
    for(const id of ['topThickness','backThickness','trimAllowance']){
      const el=document.getElementById(id);
      if(el) el.value='0';
    }
    const note=document.getElementById('referenceNote');
    if(note) note.hidden=currentPreset!=='plan00';
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
      ['om14','dread14','plan00'].forEach(key=>{
        const preset=presets[key];
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
