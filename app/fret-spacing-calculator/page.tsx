'use client';

import {useMemo,useState} from 'react';
import styles from './page.module.css';

type Unit='in'|'mm';

export default function FretSpacingCalculator(){
  const [scale,setScale]=useState(25.4);
  const [unit,setUnit]=useState<Unit>('in');
  const [frets,setFrets]=useState(24);
  const [precision,setPrecision]=useState(3);

  const safeScale=Number.isFinite(scale)&&scale>0?scale:(unit==='in'?25.4:645.16);
  const safeFrets=Math.min(36,Math.max(1,Math.round(Number.isFinite(frets)?frets:24)));
  const suffix=unit==='in'?'in':'mm';

  const rows=useMemo(()=>{
    const out:{fret:number;fromNut:number;fromPrevious:number}[]=[];
    let previous=0;
    for(let n=1;n<=safeFrets;n++){
      const fromNut=safeScale*(1-Math.pow(2,-n/12));
      out.push({fret:n,fromNut,fromPrevious:fromNut-previous});
      previous=fromNut;
    }
    return out;
  },[safeScale,safeFrets]);

  function reset(){setScale(25.4);setUnit('in');setFrets(24);setPrecision(3);}
  function applyPreset(value:number,presetUnit:Unit){setScale(value);setUnit(presetUnit);}
  function downloadCsv(){
    let csv=`Fret,From nut (${suffix}),From previous (${suffix})\n`;
    rows.forEach(r=>{csv+=`${r.fret},${r.fromNut.toFixed(precision)},${r.fromPrevious.toFixed(precision)}\n`;});
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`usonian-fret-spacing-${String(safeScale).replace('.','_')}-${suffix}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <div className={styles.page}>
    <header className={styles.header}><h1>Fret Spacing Calculator</h1><p>Equal-temperament fret positions for guitar, bass, ukulele, mandolin, and other fretted instruments.</p></header>
    <main className={styles.main}>
      <aside className={styles.aside}>
        <div className={styles.card}>
          <h2>Scale</h2>
          <div className={styles.grid}>
            <label className={styles.label}>Scale length<input className={styles.input} type="number" min="0.01" step="0.01" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label>
            <label className={styles.label}>Units<select className={styles.select} value={unit} onChange={e=>setUnit(e.target.value as Unit)}><option value="in">Inches</option><option value="mm">Millimeters</option></select></label>
            <label className={styles.label}>Number of frets<input className={styles.input} type="number" min="1" max="36" step="1" value={frets} onChange={e=>setFrets(Number(e.target.value))}/></label>
            <label className={styles.label}>Decimals<select className={styles.select} value={precision} onChange={e=>setPrecision(Number(e.target.value))}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>
          </div>
          <div className={styles.buttons}><button className={styles.button} type="button" onClick={reset}>Reset</button><button className={`${styles.button} ${styles.primary}`} type="button" onClick={()=>window.print()}>Print Table</button></div>
          <div className={styles.buttons}><button className={`${styles.button} ${styles.wide}`} type="button" onClick={downloadCsv}>Download CSV</button></div>
          <p className={styles.note}>Distances are measured from the nut to the fret centerline. “From previous” is the distance from the preceding fret centerline.</p>
          <div className={styles.formula}>dₙ = scale × (1 − 2<sup>−n/12</sup>)</div>
        </div>
        <div className={styles.card}>
          <h2>Common scales</h2>
          <div className={styles.buttons}>
            <button className={styles.button} type="button" onClick={()=>applyPreset(25.4,'in')}>25.4 in</button>
            <button className={styles.button} type="button" onClick={()=>applyPreset(25.5,'in')}>25.5 in</button>
            <button className={styles.button} type="button" onClick={()=>applyPreset(24.75,'in')}>24.75 in</button>
            <button className={styles.button} type="button" onClick={()=>applyPreset(25,'in')}>25.0 in</button>
            <button className={styles.button} type="button" onClick={()=>applyPreset(650,'mm')}>650 mm</button>
            <button className={styles.button} type="button" onClick={()=>applyPreset(628,'mm')}>628 mm</button>
          </div>
        </div>
      </aside>
      <section className={styles.workspace}>
        <div className={styles.summary}>
          <div className={styles.pill}>Scale: {safeScale.toFixed(precision)} {suffix}</div>
          <div className={styles.pill}>12th fret: {(safeScale/2).toFixed(precision)} {suffix}</div>
          <div className={styles.pill}>{safeFrets} frets</div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Fret</th><th>From nut ({suffix})</th><th>From previous ({suffix})</th></tr></thead>
            <tbody>{rows.map(r=><tr key={r.fret}><td>{r.fret}</td><td>{r.fromNut.toFixed(precision)}</td><td>{r.fromPrevious.toFixed(precision)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  </div>;
}
