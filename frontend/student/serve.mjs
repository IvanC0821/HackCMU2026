import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3002);
const types = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.pdf':'application/pdf','.woff2':'font/woff2','.wasm':'application/wasm','.bcmap':'application/octet-stream'};
createServer(async(req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
  try {
    const url = new URL(req.url, 'http://localhost');
    let filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if ((filename !== path.resolve(root) && !filename.startsWith(root)) || url.pathname.split('/').some(p => p.startsWith('.'))) throw Error();
    if ((await stat(filename)).isDirectory()) filename = path.join(filename,'index.html');
    const bytes = await readFile(filename);
    res.writeHead(200, {'Content-Type': types[path.extname(filename)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log(`Student workspace: http://localhost:${port}/`));
