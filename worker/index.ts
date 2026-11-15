/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  USONIAN_TEST_SITE?: string;
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    if (env.USONIAN_TEST_SITE !== "1") return response;
    const testResponse = new Response(response.body, response);
    testResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!testResponse.headers.get("content-type")?.includes("text/html")) return testResponse;
    return new HTMLRewriter().on("body", {
      element(element) {
        element.prepend('<style>@media print{.usonian-test-banner{display:none!important}}</style><aside class="usonian-test-banner" style="background:#6a291c;color:white;padding:12px;text-align:center;font:16px sans-serif;position:relative;z-index:9999">TEST SITE — Rust development · <a style="color:white;text-decoration:underline" href="/side-template/?engine=rust">Side / Top</a> · <a style="color:white;text-decoration:underline" href="/rust-fretboard/">Rust Fretboard</a> · <a style="color:white;text-decoration:underline" href="https://usonianguitar.com">Production website</a></aside>', { html: true });
      },
    }).transform(testResponse);
  },
};

export default worker;
