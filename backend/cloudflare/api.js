// HTTP policy only. All dimensional validation and geometry run inside Rust.
export const MAX_REQUEST_BYTES = 16 * 1024;
const json = (value,status=200,extra={}) => Response.json(value,{status,headers:{'cache-control':'no-store',...extra}});
export const error = (code,message,status,extra={}) => json({ok:false,apiVersion:'v1',error:{code,message}},status,extra);
export function createApi(generate) {
  return async request => {
    const path=new URL(request.url).pathname.replace(/\/$/,'');
    if(path==='/api/v1/health') {
      if(request.method!=='GET')return error('method_not_allowed','Use GET.',405,{allow:'GET'});
      const check=JSON.parse(generate('fretboard','{"scaleLength":650,"fretCount":12,"nutWidth":44,"endWidth":55}'));
      if(!check.ok || check.data.frets[11].x!==325)return error('core_unavailable','Geometry core failed health check.',503);
      return json({ok:true,apiVersion:'v1',engine:'rust-wasm',units:'mm',tools:['side-top','fretboard']});
    }
    const tool={'/api/v1/side-top':'side-top','/api/v1/fretboard':'fretboard'}[path];
    if(!tool)return error('not_found','Unknown API endpoint.',404);
    if(request.method!=='POST')return error('method_not_allowed','Use POST.',405,{allow:'POST'});
    if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return error('unsupported_media_type','Use application/json.',415);
    const reader=request.body?.getReader();let bytes=0;const chunks=[];
    if(reader)while(true) {
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_REQUEST_BYTES){await reader.cancel();return error('payload_too_large','Request exceeds 16 KiB.',413);}
      chunks.push(value);
    }
    const buffer=new Uint8Array(bytes);let pos=0;for(const chunk of chunks){buffer.set(chunk,pos);pos+=chunk.length;}
    let input;
    try {input=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{return error('invalid_request','Request must be UTF-8 JSON.',400);}
    try {
      const result=JSON.parse(generate(tool,input));
      return json(result,result.ok?200:result.error.code==='invalid_request'?400:422);
    } catch {return error('internal_error','Unable to generate geometry.',500);}
  };
}
