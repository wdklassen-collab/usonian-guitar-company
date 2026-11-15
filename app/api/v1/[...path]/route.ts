import {proxy} from '../../../../backend/cloudflare/proxy.js';

function handle(request: Request) {
  return proxy(request, process.env.RUST_API_URL);
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
