import module from '../pkg/usonian_bg.wasm';
import {initSync,generate} from '../pkg/usonian.js';
import {createApi,error} from './api.js';
// Cloudflare supplies a precompiled WebAssembly.Module, not fetchable bytes.
initSync({module});
const api=createApi(generate);
const worker={async fetch(request) {
  try {return await api(request);}catch {return error('internal_error','Unable to process request.',500);}
}};
export default worker;
