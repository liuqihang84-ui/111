import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const version='1.1.1',integrity='jwntgT5tzDrKOkqg6xNDNpRcTUnGvmylZE5DFnzPXossiWOIDdZX+C81LI75hlXhsG58YZW+lGzcmjH1qrQE/Q==';
const modelHash='fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const root=path.dirname(fileURLToPath(import.meta.url)),output=path.join(root,'dist/vendor/vision');
async function obtain(cache,url){try{return await fs.readFile(cache);}catch{const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`Asset download failed: ${response.status}`);return Buffer.from(await response.arrayBuffer());}}
const tgz=await obtain(path.join(root,'.cache/tasks-vision.tgz'),`https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-${version}.tgz`);
if(createHash('sha512').update(tgz).digest('base64')!==integrity)throw new Error('Vision package integrity mismatch');
const tar=gunzipSync(tgz);let extracted=0;
for(let offset=0;offset+512<=tar.length;){
 const header=tar.subarray(offset,offset+512),name=header.subarray(0,100).toString().replace(/\0.*$/s,''),size=parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim()||'0',8);if(!name)break;
 const relative=name.replace(/^package\//,'');
 if(relative==='vision_bundle.mjs'||relative==='LICENSE'||relative.startsWith('wasm/')&&/\.(js|wasm)$/.test(relative)){
  const destination=path.resolve(output,relative);if(!destination.startsWith(output+path.sep))throw new Error('Invalid package path');await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,tar.subarray(offset+512,offset+512+size));extracted++;
 }
 offset+=512+Math.ceil(size/512)*512;
}
if(extracted<4)throw new Error('Incomplete vision package');
const model=await obtain(path.join(root,'.cache/hand_landmarker.task'),'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
if(createHash('sha256').update(model).digest('hex')!==modelHash)throw new Error('Hand model integrity mismatch');
await fs.writeFile(path.join(output,'hand_landmarker.task'),model);await fs.writeFile(path.join(output,'version.json'),JSON.stringify({version,modelHash}));
console.log(`Prepared local hand tracking assets (${version}); verified package and model hashes.`);
