const SOURCE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-web-tools/main/fretboard/index.html";

export async function GET() {
  const response = await fetch(SOURCE, { cache: "no-store" });

  if (!response.ok) {
    return new Response("Fretboard Generator is temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(await response.text(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
