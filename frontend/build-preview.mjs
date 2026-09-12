// Create a directly openable preview without a server or third-party bundler.
import {readFile, writeFile} from 'node:fs/promises';
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const modules = await Promise.all(['instructor-model.mjs', 'instructor.mjs'].map(read));
const js = modules.map(source => source.replace(/^import .+;\n/gm, '').replace(/^export /gm, '')).join('\n');
const css = await read('styles.css');
const instructorCss = await read('instructor.css');
const source = await read('index.html');
const html = source.replace('<link rel="stylesheet" href="./styles.css">', `<style>${css}</style>`)
  .replace('<link rel="stylesheet" href="./instructor.css">', `<style>${instructorCss}</style>`)
  .replace('<script type="module" src="./instructor.mjs"></script>', '')
  .replace('</body>', `<script>(() => {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();</script>\n</body>`);
await writeFile(new URL('preview.html', import.meta.url), html);
console.log('Created frontend/preview.html. Open Homework 1, set grading standards, then review the scripted sample.');
