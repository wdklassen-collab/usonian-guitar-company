const SOURCE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/index.html";
const OM_CURVES = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/om-curves.js";
const CURVE_TUNING = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/curve-tuning.js";
const UPPER_CURVES = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/upper-curve-handles.js";
const PRESETS = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/presets.js";
const OM_DEFAULTS = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/defaults.js";
const PRINT_FIX = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/print-fix.js";
const DEVELOPED_SIDE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/developed-side.js";

export async function GET() {
  const [htmlResponse, curveResponse, tuningResponse, upperResponse, presetsResponse, defaultsResponse, printFixResponse, developedResponse] = await Promise.all([
    fetch(SOURCE, { cache: "no-store" }),
    fetch(OM_CURVES, { cache: "no-store" }),
    fetch(CURVE_TUNING, { cache: "no-store" }),
    fetch(UPPER_CURVES, { cache: "no-store" }),
    fetch(PRESETS, { cache: "no-store" }),
    fetch(OM_DEFAULTS, { cache: "no-store" }),
    fetch(PRINT_FIX, { cache: "no-store" }),
    fetch(DEVELOPED_SIDE, { cache: "no-store" }),
  ]);

  if (!htmlResponse.ok || !developedResponse.ok || !printFixResponse.ok) {
    return new Response("Side Template Generator is temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let html = await htmlResponse.text();
  const scripts: string[] = [];

  if (curveResponse.ok) scripts.push(await curveResponse.text());
  if (tuningResponse.ok) scripts.push(await tuningResponse.text());
  if (upperResponse.ok) scripts.push(await upperResponse.text());
  // Load presets before the legacy OM defaults so preset-aware Reset owns
  // the capture-phase click handler while initial startup still defaults to OM.
  if (presetsResponse.ok) scripts.push(await presetsResponse.text());
  if (defaultsResponse.ok) scripts.push(await defaultsResponse.text());
  // Geometry loads first. Printing has one owner and reads current geometry
  // at click time; it never competes with developed-side.js for this button.
  scripts.push(await developedResponse.text());
  scripts.push(await printFixResponse.text());

  const closingBody = html.lastIndexOf("</body>");
  if (closingBody !== -1 && scripts.length) {
    html =
      html.slice(0, closingBody) +
      scripts.map((script) => `<script>${script}</script>`).join("") +
      html.slice(closingBody);
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
