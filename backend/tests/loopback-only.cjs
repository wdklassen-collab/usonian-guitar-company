// Test runner fallback for containers that cannot enumerate network interfaces.
// Explicit local binding is supported; this does not change network permissions.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node preload hook is intentionally CommonJS.
const os=require('node:os');
const original=os.networkInterfaces;
os.networkInterfaces=()=>{
  try{return original();}catch(error){
    if(error.code!=='ERR_SYSTEM_ERROR')throw error;
    return {lo:[{address:'127.0.0.1',netmask:'255.0.0.0',family:'IPv4',mac:'00:00:00:00:00:00',internal:true,cidr:'127.0.0.1/8'}]};
  }
};
