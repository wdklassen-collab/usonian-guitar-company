const SOURCE = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/headstock-generator/index.html";
const THEME = "https://raw.githubusercontent.com/wdklassen-collab/usonian-guitar-company/main/headstock-generator/theme.css";

export async function GET() {
  const [htmlResponse, themeResponse] = await Promise.all([
    fetch(SOURCE, { cache: "no-store" }),
    fetch(THEME, { cache: "no-store" }),
  ]);

  if (!htmlResponse.ok) {
    return new Response("Headstock Generator is temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let html = await htmlResponse.text();

  if (themeResponse.ok) {
    const theme = await themeResponse.text();
    const closingHead = html.lastIndexOf("</head>");
    if (closingHead !== -1) {
      html = html.slice(0, closingHead) + `<style>${theme}</style>` + html.slice(closingHead);
    }
  }

  html = html
    .replace("Usonian Guitar Co. · Experimental Builder Tool", "Usonian Guitar Co. · Web Tools")
    .replace("3+3 Headstock Shape Generator", "Headstock Template Generator")
    .replace("Reset shape", "Reset to Defaults");

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}
