import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const files=['model.mjs','row-check.mjs','case.mjs','storage.mjs','api.mjs','case-view.mjs','view.mjs','app.mjs'];
const code=(await Promise.all(files.map(name=>readFile(new URL('../'+name,import.meta.url),'utf8')))).map(s=>s.replace(/^import .+;\n/gm,'').replace(/^export /gm,'')).join('\n');
async function screen() {
  const listeners={}, root={}, elements={};
  const noop={focus(){},close(){},showModal(){},addEventListener(){},matches(){return false;}};
  const document={activeElement:noop,querySelector(selector){return selector==='#app'?root:(elements[selector]||={...noop});},querySelectorAll(){return [];},addEventListener(event,fn){listeners[event]=fn;},getElementById(){return {scrollIntoView(){}};}};
  const context=vm.createContext({document,location:{hash:'#/'},window:{addEventListener(type,fn){listeners[type]=fn;}},performance,structuredClone,crypto,URL,Blob,File,AbortController,AbortSignal,setTimeout,clearTimeout,navigator:{}});
  vm.runInContext(code,context); await new Promise(r=>setImmediate(r));
  return {root,context,elements,
    route(hash){context.location.hash=hash;listeners.hashchange();},
    async click(action,data={}){await listeners.click({target:{closest(selector){return selector==='[data-action]'?{dataset:{action,...data}}:null;}}});},
    async change(id,value,dataset={}){await listeners.change({target:{id,value,dataset}});},
    async submit(kind,elements,data={}){await listeners.submit({preventDefault(){},target:{id:kind,elements,dataset:data,matches(selector){return kind==='decision'?selector.includes('.decision-form'):selector.includes('#'+kind);}}});},
  };
}
test('click-through covers setup, incomplete/corrected/alternative checks, final submit and TA skim',async()=>{
  const s=await screen();assert.match(s.root.innerHTML,/<h1>Homeworks/);
  s.route('#/homework/1/standards');await s.click('sample-rubric');assert.match(s.root.innerHTML,/10 pts/);
  await s.click('publish');s.route('#/homework/1/practice');
  await s.click('check-case');assert.match(s.root.innerHTML,/Possible missing work/);assert.match(s.root.innerHTML,/<strong>8<small> \/ 10/);
  await s.click('case-variant',{variant:'corrected'});await s.click('check-case');assert.match(s.root.innerHTML,/<strong>10<small> \/ 10/);
  await s.click('case-variant',{variant:'alternative'});await s.click('check-case');assert.match(s.root.innerHTML,/No issues found/);
  await s.click('submit-case');s.route('#/homework/1/review/case-student');
  await s.click('complete');assert.match(s.root.innerHTML,/Skim every question/);
  await s.change('role','TA');await s.click('skim',{q:'q1'});await s.click('complete');assert.match(s.root.innerHTML,/Review completed locally/);
  s.route('#/homework/1');assert.match(s.root.innerHTML,/first 80%, latest 100%, 1 assessed/);
});
test('malformed editable work does not crash rendering or silently score',async()=>{
  const s=await screen();s.route('#/homework/1/standards');await s.click('sample-rubric');await s.click('publish');s.route('#/homework/1/practice');
  await s.change('case-json','{"matrices": "bad"}');
  await s.click('check-case');assert.match(s.root.innerHTML,/Enter a valid work transcription/);assert.match(s.root.innerHTML,/role="alert"/);
  assert.doesNotMatch(s.root.innerHTML,/<strong>10<small>/);
});
test('editing work preserves the clicked control and cannot submit an unchecked version',async()=>{
  const s=await screen();s.route('#/homework/1/standards');await s.click('sample-rubric');await s.click('publish');s.route('#/homework/1/practice');await s.click('check-case');
  const before=s.root.innerHTML;
  const changed=vm.runInContext('JSON.stringify(caseWork.corrected)',s.context);
  await s.change('case-json',changed);assert.equal(s.root.innerHTML,before);
  await s.click('submit-case');assert.match(s.root.innerHTML,/Check this edited version before submitting/);
  assert.equal(vm.runInContext('state.submissions[0].attempts.at(-1).final',s.context),false);
  await s.click('check-case');await s.click('submit-case');
  assert.equal(vm.runInContext('state.submissions[0].attempts.at(-1).final',s.context),true);
});
test('appeal and TA reason travel through real event handlers',async()=>{
  const s=await screen();s.route('#/homework/1/standards');await s.click('sample-rubric');await s.click('publish');s.route('#/homework/1/practice');await s.click('check-case');
  await s.submit('case-appeal',{message:{value:'Please check my intermediate work.'}});
  await s.click('submit-case');s.route('#/homework/1/review/case-student');assert.match(s.root.innerHTML,/Student thinks the AI is wrong/);
  await s.submit('decision',{band:{value:'partial'},reason:{value:'Intermediate operations are absent from the submitted work.'},resolution:{value:'upheld'}},{q:'q1',c:'row-work'});
  assert.match(s.root.innerHTML,/Dispute upheld/);await s.click('skim',{q:'q1'});await s.click('complete');assert.match(s.root.innerHTML,/Review completed locally/);
});
test('failed storage opens in explicit session-only mode; no credential enters state',async()=>{
  const s=await screen();assert.match(s.root.innerHTML,/Session only/);assert.match(s.root.innerHTML,/Browser storage is unavailable/);
  assert.equal(vm.runInContext('JSON.stringify(state).includes("apiToken")',s.context),false);
});
