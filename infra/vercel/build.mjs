import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const base=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(base,'../..');
const origin=process.env.VERITY_ORIGIN;
if(!origin || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) throw Error('Set VERITY_ORIGIN to the active classroom tunnel');
const site=path.join(base,'site'),pub=path.join(site,'public');
await mkdir(pub,{recursive:true});
await cp(path.join(base,'public'),pub,{recursive:true});
await mkdir(path.join(pub,'examples'),{recursive:true});
await cp(path.join(base,'public/index.html'),path.join(pub,'examples/index.html'));
for(const [src,dst] of [['connected','connected'],['staff','staff'],['student','student-assets']]){
 await cp(path.join(root,'frontend',src),path.join(pub,dst),{recursive:true,filter:p=>!p.includes('/node_modules')&&!p.includes('/tests')&&!p.endsWith('/package-lock.json')});
}
const pdfRoot=path.join(root,'frontend/student/node_modules/pdfjs-dist');
for(const part of ['build','cmaps','standard_fonts','wasm']) await cp(path.join(pdfRoot,part),path.join(pub,'student-assets/vendor/pdfjs-dist',part),{recursive:true});
// Vercel ignores node_modules uploads; publish the browser PDF renderer as vendor assets.
for(const file of ['student-assets/app.mjs','staff/rubric-pdf.mjs']) {
 const target=path.join(pub,file);
 await writeFile(target,(await readFile(target,'utf8')).replaceAll('node_modules/pdfjs-dist','vendor/pdfjs-dist'));
}
for(const role of ['student','teacher']){
 await mkdir(path.join(pub,role),{recursive:true});
 await cp(path.join(root,`frontend/connected/${role}.html`),path.join(pub,role,'index.html'));
}
const config={
 '$schema':'https://openapi.vercel.sh/vercel.json',
 framework:null,buildCommand:null,installCommand:null,outputDirectory:'public',
 rewrites:[{source:'/classroom/:path*',destination:`${origin}/classroom/:path*`}],
 headers:[
 {source:'/classroom/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'x-vercel-enable-rewrite-caching',value:'0'}]},
 {source:'/examples/:file*.pdf',headers:[{key:'Content-Disposition',value:'attachment'},{key:'X-Content-Type-Options',value:'nosniff'}]},
 {source:'/(.*)',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Content-Type-Options',value:'nosniff'}]}
 ]
};
await writeFile(path.join(site,'vercel.json'),JSON.stringify(config,null,2)+'\n');
await writeFile(path.join(site,'package.json'),JSON.stringify({name:'verity-hackcmu',private:true})+'\n');
console.log(`Deployment staged in ${site}`);
