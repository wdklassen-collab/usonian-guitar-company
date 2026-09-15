import { build } from "esbuild";
await build({
  entryPoints: ["cnc-template/browser.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "eof",
  outfile: "public/cnc-template-tool/app.js",
});
