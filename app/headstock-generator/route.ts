const SOURCE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/headstock-generator/index.html";

export async function GET() {
  const response = await fetch(SOURCE, { cache: "no-store" });

  if (!response.ok) {
    return new Response("Headstock Generator is temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const html = await response.text();
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
