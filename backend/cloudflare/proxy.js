// Website-side proxy. The server setting is never taken from a browser URL.
import {error,MAX_REQUEST_BYTES} from './api.js';
const endpoints = new Set(['health','side-top','fretboard']);
export async function proxy(request, origin, upstreamFetch=fetch) {
  const path=new URL(request.url).pathname.replace(/\/$/,'');
  const endpoint=path.replace(/^\/api\/v1\//,'');
  if(!endpoints.has(endpoint))return error('not_found','Unknown API endpoint.',404);
  const method=endpoint==='health'?'GET':'POST';
  if(request.method!==method)return error('method_not_allowed',`Use ${method}.`,405,{allow:method});
  if(!origin)return error('backend_unavailable','Rust preview is not configured. Select Browser to continue.',503);
  let url;
  try {
    url=new URL(origin);
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error();
  }catch{return error('backend_unavailable','Rust preview URL is invalid.',503);}
  url.pathname=path;
  const contentType=request.headers.get('content-type')||'';
  if(method==='POST'&&contentType.split(';')[0].trim().toLowerCase()!=='application/json')return error('unsupported_media_type','Use application/json.',415);
  let body;
  if(method==='POST') {
    const chunks=[];let bytes=0;const reader=request.body?.getReader();
    if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_REQUEST_BYTES){await reader.cancel();return error('payload_too_large','Request exceeds 16 KiB.',413);}chunks.push(value);}
    body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  }
  try {
    const response=await upstreamFetch(url,{method,headers:{'content-type':'application/json'},body,redirect:'manual',signal:AbortSignal.timeout(10000)});
    if((response.status>=300&&response.status<400)||response.status>=500)return error('backend_unavailable','Rust preview is unavailable. Select Browser to continue.',502);
    if(!response.headers.get('content-type')?.includes('application/json'))return error('backend_unavailable','Unexpected backend response.',502);
    return new Response(response.body,{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(response.headers.has('allow')?{allow:response.headers.get('allow')}:{})}});
  } catch (failure) {console.warn('Rust preview request failed:',failure instanceof Error?failure.message:'network error');return error('backend_unavailable','Could not reach Rust preview. Select Browser to continue.',502);}
}
