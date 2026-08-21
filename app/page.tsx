const ebayStore = "https://www.ebay.com/str/usonianguitarco";
const toolsSite = "https://wdklassen-collab.github.io/usonian-web-tools/";

const products = [
  ["01", "Neck & Bridge Alignment", "Purpose-built jigs for establishing a dependable centerline and placing the bridge with confidence."],
  ["02", "Headstock Templates", "Modular drilling and slotting guides designed to make repeatable headstock work easier in a small shop."],
  ["03", "Rosette & Layout Tools", "Practical fixtures and marking aids for accurate, repeatable acoustic-guitar construction."],
];
const tools = [
  ["Fretboard Generator", "Lay out, save, print, and export custom fretboards.", "/tools/fretboard/index.html"],
  ["Radius Dish Creator", "Generate STL and CNC toolpaths for radius dishes.", `${toolsSite}radius-dish/`],
];
const nutGuides = [
  ["Steel-string guitar", "usonian_steel_string_guitar_nut_spacing_guide"],
  ["Classical / nylon guitar", "usonian_classical_nylon_guitar_nut_spacing_guide"],
  ["Ukulele", "usonian_ukulele_nut_spacing_guide"],
  ["Mandolin", "usonian_mandolin_nut_spacing_guide"],
  ["Five-string banjo", "usonian_banjo_5_string_nut_spacing_guide"],
];

export default function Home() {
  return <main>
    <header className="site-header">
      <a className="brand brand-logo" href="#top" aria-label="Usonian Guitar Co. home"><img src="/usonian-wordmark.svg" alt="Usonian Guitar Co."/></a>
      <nav aria-label="Primary navigation"><a href="#products">Products</a><a href="#tools">Tools</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
      <a className="header-shop" href={ebayStore} target="_blank" rel="noreferrer">Shop eBay</a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Independent lutherie tools · Colorado</p>
        <h1>Better tools for<br/><em>better guitars.</em></h1>
        <p className="hero-intro">Practical jigs, templates, and digital tools developed at the workbench for acoustic-guitar builders.</p>
        <div className="hero-actions"><a className="button primary" href={ebayStore} target="_blank" rel="noreferrer">Shop Usonian Tools</a><a className="button secondary" href="#tools">Explore Free Tools</a></div>
      </div>
      <div className="hero-art" aria-label="Prairie-style geometric guitar design">
        <div className="prairie-frame"/>
        <div className="prairie-block block-one"/>
        <div className="prairie-block block-two"/>
        <div className="prairie-block block-three"/>
        <div className="sun"/>
        <div className="soundhole"><span/></div>
        <div className="fretboard"/>
        <p>Designed by a builder.<br/>Made for builders.</p>
      </div>
    </section>

    <section className="statement"><p>Simple. Accurate. Useful.</p><h2>Shop-made solutions for the moments when precision matters.</h2></section>

    <section className="section products" id="products">
      <div className="section-heading"><p className="eyebrow">At the workbench</p><h2>Lutherie tools without the fuss.</h2><p>Each Usonian product begins with a real building problem and is refined for repeatable use.</p></div>
      <div className="product-grid">{products.map(([number,title,text])=><article className="product-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <a className="text-link" href={ebayStore} target="_blank" rel="noreferrer">View all available products on eBay <span>→</span></a>
    </section>

    <section className="tools-section" id="tools">
      <div className="section-heading light"><p className="eyebrow">Free builder resources</p><h2>Useful tools belong on the bench.</h2><p>Create accurate layouts and CNC-ready files directly in your browser. No account or installation required.</p></div>
      <div className="tool-list">
        {tools.map(([title,text,path],index)=><a className="tool-link" href={path} target="_blank" rel="noreferrer" key={title}><span className="tool-number">0{index+1}</span><span><strong>{title}</strong><small>{text}</small></span><b>↗</b></a>)}
        <details className="nut-dropdown">
          <summary><span className="tool-number">03</span><span><strong>Nut Spacing Guide</strong><small>Choose a printable instrument template.</small></span><b>⌄</b></summary>
          <div className="template-menu">{nutGuides.map(([title,file])=><a href={`/nut-spacing-guides/${file}.pdf`} download key={file}><span>{title}</span><b>PDF ↓</b></a>)}</div>
        </details>
      </div>
    </section>

    <section className="section about" id="about">
      <div className="about-mark"><span>UG</span></div>
      <div><p className="eyebrow">About Usonian</p><h2>Built from experience, not theory.</h2><p>Usonian Guitar Co. is an independent Colorado workshop creating practical tools for luthiers and guitar builders. Our products grow out of the same process they support: measure carefully, solve the real problem, and keep the design straightforward.</p><p>We believe good tools should make fine work more approachable—not more complicated.</p></div>
    </section>

    <section className="contact" id="contact"><p className="eyebrow">Questions or ideas?</p><h2>Let’s talk guitars.</h2><p>Questions about a Usonian tool, a current order, or an idea for something the lutherie community needs?</p><a className="button primary" href="mailto:usonianguitar@outlook.com">usonianguitar@outlook.com</a></section>

    <footer><a className="brand" href="#top"><span className="brand-mark">U</span><span>Usonian Guitar Co.</span></a><p>Independent lutherie tools from Colorado.</p><div><a href={ebayStore} target="_blank" rel="noreferrer">eBay Store</a><a href={toolsSite} target="_blank" rel="noreferrer">Web Tools</a></div><small>© {new Date().getFullYear()} Usonian Guitar Co., LLC</small></footer>
  </main>;
}
