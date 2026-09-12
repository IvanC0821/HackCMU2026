import {writeFile, mkdir} from 'node:fs/promises';
import {caseWork, caseQuestion} from './case.mjs';
const dir = new URL('../output/pdf/row-case/', import.meta.url);
await mkdir(dir, {recursive: true});
await writeFile(new URL('source.json', dir), JSON.stringify({question: caseQuestion.prompt, cases: caseWork}, null, 2));
