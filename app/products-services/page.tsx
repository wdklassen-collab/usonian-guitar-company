const ebayStore = "https://www.ebay.com/str/usonianguitarco";

const offerings = [
  {
    title: "Lutherie Tools & Jigs",
    text: "Purpose-built tools designed to make guitar building more accurate, repeatable, and efficient.",
    items: ["Alignment and positioning tools", "Bridge and neck layout tools", "Drilling and routing guides", "Assembly and clamping fixtures", "Specialty lutherie tools", "Custom jigs for specific building operations"],
  },
  {
    title: "Custom Guitar Templates",
    text: "Precision templates manufactured from your dimensions, drawings, digital files, existing components, or design requirements.",
    items: ["Body, neck, headstock, and fretboard templates", "Bridge, bracing, and rosette templates", "Routing, pickup, electronics, and neck-joint templates", "Inlay and specialty templates", "Materials: acrylic, MDF, Baltic birch plywood, and other template materials depending on the application"],
  },
  {
    title: "Custom Router Templates",
    text: "CNC-machined router templates for guitar building, woodworking, and specialized fabrication.",
    items: ["Pickup and electronics cavities", "Neck pockets and neck joints", "Headstock features and truss rod channels", "Binding, purfling, and inlay work", "Bridge routing and custom cavities", "Repeat-production operations"],
  },
  {
    title: "Radius Dishes",
    text: "CNC-machined radius dishes for acoustic guitar construction.",
    items: ["Top and back radius dishes", "Standard or custom radii", "Custom diameters and dimensions", "MDF construction", "Bare dishes or with sandpaper applied and ready for use"],
  },
  {
    title: "Body Molds",
    text: "Precision body molds for acoustic guitar construction, including standard and custom body geometry.",
    items: ["OM, Dreadnought, 000, 00, Parlor, and Classical", "Custom body shapes", "Complete molds or replacement sections", "Custom dimensions", "Molds created from drawings or customer-supplied geometry"],
  },
  {
    title: "Side Bending Jigs",
    text: "Side bending jigs and components for acoustic guitar construction.",
    items: ["Complete side bending jigs", "Custom guitar body shapes", "Interchangeable bending forms", "Replacement bending forms", "Custom waist and bout geometry", "Forms created from customer drawings or specifications"],
  },
  {
    title: "Custom Jigs & Fixtures",
    text: "Purpose-built tooling for shop operations you want to make faster, safer, or more repeatable.",
    items: ["Drilling, routing, and assembly fixtures", "Clamping and positioning fixtures", "CNC workholding", "Repeat-production fixtures", "Guitar-specific shop tooling"],
  },
  {
    title: "3D Printing & Prototype Manufacturing",
    text: "Functional 3D printing for tools, prototypes, fixtures, components, shop accessories, and low-volume production.",
    items: ["PLA", "PETG", "PLA-CF", "PETG-CF", "ABS", "Nylon"],
  },
];

export default function ProductsServices() {
  return <main>
    <header className="site-header">
      <a className="brand brand-logo" href="/" aria-label="Usonian Guitar Co. home"><img src="/usonian-wordmark.svg" alt="Usonian Guitar Co."/></a>
      <nav aria-label="Primary navigation"><a href="/">Home</a><a href="/products-services/">Products & Services</a><a href="/#tools">Tools</a><a href="/#about">About</a><a href="/#contact">Contact</a></nav>
      <a className="header-shop" href={ebayStore} target="_blank" rel="noreferrer">Shop eBay</a>
    </header>

    <section className="section products products-services">
      <div className="section-heading">
        <p className="eyebrow">Lutherie tooling · fabrication · prototyping</p>
        <h1>Products & Services</h1>
        <p>Usonian Guitar Co. designs and manufactures precision tools, templates, jigs, fixtures, molds, and shop equipment for luthiers and guitar builders. Standard products and custom work are available.</p>
      </div>

      <div className="product-grid">
        {offerings.map((offering, index) => <article className="product-card" key={offering.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h2>{offering.title}</h2>
          <p>{offering.text}</p>
          <ul>{offering.items.map(item => <li key={item}>{item}</li>)}</ul>
        </article>)}
      </div>
    </section>

    <section className="section about">
      <div className="about-mark"><span>UG</span></div>
      <div>
        <p className="eyebrow">Custom design & prototyping</p>
        <h2>Have an idea? We can help turn it into a tool.</h2>
        <p>Usonian Guitar Co. provides custom design and prototyping services from concept through manufacturing, including CAD design, 2D template design, 3D modeling, CNC-ready file development, 3D-printed prototypes, functional prototypes, jig and fixture design, design-for-manufacturing assistance, CNC fabrication, and small-run production.</p>
        <p>You do not need a finished CAD file. We can work from a sketch, measurements, photographs, an existing component, a digital drawing, a CAD file, or simply an idea.</p>
      </div>
    </section>

    <section className="contact">
      <p className="eyebrow">Need something custom?</p>
      <h2>Request a Custom Tool</h2>
      <p>Send us your idea, drawing, measurements, photos, or existing part and we’ll help determine the best way to design and manufacture it.</p>
      <a className="button primary" href="mailto:usonianguitar@outlook.com?subject=Custom%20Tool%20Request">Start a Custom Project</a>
    </section>

    <footer><a className="brand" href="/"><span className="brand-mark">U</span><span>Usonian Guitar Co.</span></a><p>Independent lutherie tools from Colorado.</p><div><a href={ebayStore} target="_blank" rel="noreferrer">eBay Store</a><a href="/">Home</a></div><small>© {new Date().getFullYear()} Usonian Guitar Co., LLC</small></footer>
  </main>;
}
