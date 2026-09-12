// Create a directly openable preview without a server or third-party bundler.
import {readFile, writeFile} from 'node:fs/promises';
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const modules = await Promise.all(['connected/review-explanation.mjs', 'staff/model.mjs', 'staff/row-check.mjs', 'staff/case.mjs', 'staff/storage.mjs', 'staff/api.mjs', 'staff/case-view.mjs', 'staff/view.mjs', 'staff/app.mjs'].map(read));
const mathSource = (await read('connected/vendor/katex.mjs')).replace(/^export \{.+\};$/gm, '');
const mathLicense = await read('connected/vendor/KaTeX-LICENSE.txt');
const js = `/* ${mathLicense} */\nconst katex = (() => {\n${mathSource}\nreturn katex;\n})();\nconst connected = false;\n` + modules.map(source => source.replace(/^import .+;\n/gm, '').replace(/^export /gm, '')).join('\n');
const css = await read('staff/styles.css');
const source = await read('index.html');
const html = source.replace('<link rel="stylesheet" href="./staff/styles.css">', `<style>${css}</style>`)
  .replace('<script type="module" src="./staff/app.mjs"></script>', '')
  .replace('</body>', () => `<script>(() => {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();</script>\n</body>`);
await writeFile(new URL('preview.html', import.meta.url), html);
console.log('Created frontend/preview.html. Homework 1 → Grading standards → Use sample materials → Finalize → Student revision.');
