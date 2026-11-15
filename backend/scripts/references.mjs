import {readFile,writeFile} from 'node:fs/promises';
import {references} from './legacy.mjs';
const url=new URL('../core/data/measured.json',import.meta.url);
const content=JSON.stringify(await references())+'\n';
if(process.argv.includes('--check')) {
  if(await readFile(url,'utf8')!==content) throw new Error('Measured Rust data is stale: node backend/scripts/references.mjs');
} else await writeFile(url,content);
