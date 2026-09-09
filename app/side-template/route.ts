const SOURCE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/index.html";
const OM_CURVES = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/side-template/om-curves.js";

export async function GET() {
  const [htmlResponse, curveResponse] = await Promise.all([
    fetch(SOURCE, { cache: "no-store" }),
    fetch(OM_CURVES, { cache: "no-store" }),
  ]);

  if (!htmlResponse.ok) {
    return new Response("Side Template Generator is temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let html = await htmlResponse.text();

  if (curveResponse.ok) {
    const curves = await curveResponse.text();
    html = html.replace("</body>", `<script>${curves}</script></body>`);
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
