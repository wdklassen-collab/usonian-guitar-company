const etsy = "https://www.etsy.com/shop/usonianguitarco";
const categories = [
  {title:"Neck & Bridge Centering Guides", description:"Alignment tools for locating the instrument centerline and positioning necks and bridges accurately.", query:"centering"},
  {title:"Headstock Templates", description:"Individual headstock patterns and precision layout templates. Each design is offered separately in the Etsy catalog.", query:"headstock"},
  {title:"Tuning Machine Locators", description:"Guides for repeatable tuner-hole positioning, including classical guitar applications.", query:"tuning"},
  {title:"Nut Spacing Guides", description:"Layout guides for consistent string spacing across guitar and other fretted instruments.", query:"nut"},
  {title:"Ukulele Building Tools", description:"Purpose-made alignment and layout aids for ukulele construction.", query:"ukulele"},
  {title:"Other Jigs & Templates", description:"Practical shop-developed tools and accessories for accurate, repeatable lutherie.", query:"jig"},
];
export default function ProductCatalog() {
  return <main>
    <header className="site-header">
      <a className="brand brand-logo" href="/" aria-label="Usonian Guitar Co. home"><img src="/usonian-wordmark.svg" alt="Usonian Guitar Co."/></a>
      <nav aria-label="Primary navigation"><a href="/">Home</a><a href="/products/">Products</a><a href="/products-services/">Products & Services</a><a href="/#tools">Tools</a><a href="/#contact">Contact</a></nav>
      <a className="header-shop" href={etsy} target="_blank" rel="noopener noreferrer">Shop Etsy</a>
    </header>
    <section className="section products products-services">
      <div className="section-heading">
        <p className="eyebrow">Usonian Guitar Co. · Workshop-made tooling</p>
        <h1>Tools for the thoughtful builder.</h1>
        <p>Precision jigs, guides and templates developed in our Colorado workshop. Explore the collection below; Etsy handles secure checkout and current availability.</p>
        <a className="button primary" href={etsy} target="_blank" rel="noopener noreferrer">Browse all products on Etsy</a>
      </div>
      <div className="product-grid">
        {categories.map((category,index)=><article className="product-card" key={category.title}>
          <span>{String(index+1).padStart(2,"0")}</span>
          <h2>{category.title}</h2>
          <p>{category.description}</p>
          <a className="text-link" href={etsy + "?search_query=" + encodeURIComponent(category.query)} target="_blank" rel="noopener noreferrer">Explore on Etsy →</a>
        </article>)}
      </div>
      <p style={{marginTop:"2rem",opacity:0.75}}>For current product photographs, dimensions, variants, prices, and availability, visit the linked Etsy listings.</p>
    </section>
    <section className="contact"><p className="eyebrow">Custom work</p><h2>Need a specialized jig?</h2><p>Send a sketch, dimensions or an idea. We design and manufacture custom tools for builders.</p><a className="button primary" href="mailto:usonianguitar@outlook.com?subject=Custom%20Tool%20Inquiry">Get in touch</a></section>
    <footer><a className="brand" href="/"><img className="brand-mark-image" src="/usonian-shield-diamond.svg" alt="Usonian Guitar Co. shield logo"/><span>Usonian Guitar Co.</span></a><p>Independent lutherie tools from Colorado.</p><div><a href={etsy} target="_blank" rel="noopener noreferrer">Etsy Store</a><a href="/products-services/">Products & Services</a><a href="/">Home</a></div><small>© {new Date().getFullYear()} Usonian Guitar Co., LLC</small></footer>
  </main>;
}
