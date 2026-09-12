import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const scripts = await Promise.all(['instructor-model.mjs', 'instructor.mjs'].map(p => readFile(new URL('../' + p, import.meta.url), 'utf8')));
const code = scripts.map(s => s.replace(/^import .+;\n/gm, '').replace(/^export /gm, '')).join('\n');
function screen() {
  const root = {}, listeners = {}, elements = {};
  const noOp = {focus() {}, close() {}, showModal() {}, addEventListener() {}};
  const document = {querySelector(selector) { return selector === '#app' ? root : (elements[selector] ||= {...noOp}); }, addEventListener(type, cb) { listeners[type] = cb; }};
  const context = vm.createContext({document, location: {hash: '#/'}, window: {addEventListener(type, cb) { listeners[type] = cb; }}, structuredClone, URL});
  vm.runInContext(code, context);
  return {root, context, listeners, elements,
    route(hash) { context.location.hash = hash; listeners.hashchange(); },
    click(action, data = {}) { listeners.click({target: {closest() { return {dataset: {do: action, ...data}}; }}}); },
    change(id, value, dataset = {}) { return listeners.change({target: {id, value, dataset}}); },
    input(field, value, data = {}) { listeners.input({target: {value, dataset: {field, ...data}}}); },
  };
}
test('starts at Homeworks and supports standards, question mappings and review routes', () => {
  const s = screen();
  assert.match(s.root.innerHTML, /<h1>Homeworks<\/h1>/);
  assert.doesNotMatch(s.root.innerHTML, /Course dashboard/);
  s.route('#/homework/1'); assert.match(s.root.innerHTML, /Graded homeworks/);
  s.route('#/homework/1/standards');
  assert.match(s.root.innerHTML, /Blank PDF pages/);
  assert.match(s.root.innerHTML, /Expected work/);
  assert.match(s.root.innerHTML, /Students assign their own submission pages separately/);
  s.click('save-standards'); assert.match(s.root.innerHTML, /Add the blank assignment PDF/);
  s.click('load-demo'); s.click('save-standards');
  s.route('#/homework/1/review'); s.click('run-check');
  assert.match(s.root.innerHTML, /16<small> \/ 20/);
  assert.match(s.root.innerHTML, /Both values are correct/);
  s.click('question', {index: '1'});
  assert.match(s.root.innerHTML, /student-submission-2.png/);
  assert.match(s.root.innerHTML, /Student-assigned pages: 2/);
});
test('TA cannot approve; professor can, and review controls lock afterward', async () => {
  const s = screen(); s.route('#/homework/1/standards'); s.click('load-demo'); s.click('save-standards');
  await s.change('staff-role', 'ta');
  assert.match(s.root.innerHTML, /Switch to Professor to edit/);
  s.route('#/homework/1/review'); s.click('run-check');
  assert.match(s.root.innerHTML, /Professor approval required/);
  await s.change('decision-column-vector', 'keep', {decision: 'column-vector'});
  assert.match(s.root.innerHTML, /17<small> \/ 20/);
  await s.change('staff-role', 'professor'); s.click('approve');
  assert.match(s.root.innerHTML, /Grade approved/);
  assert.match(s.root.innerHTML, /id="decision-row-labels"[^>]+disabled/);
});
test('changing expected form invalidates assumptions; custom rule text is escaped', () => {
  const s = screen(); s.route('#/homework/1/standards'); s.click('load-demo');
  s.input('expectedWork', 'Use a <column> vector', {q: '0'});
  s.click('save-standards'); s.route('#/homework/1/review'); s.click('run-check');
  assert.match(s.root.innerHTML, /Use a &lt;column&gt; vector/);
  assert.match(s.root.innerHTML, /Needs manual review/);
});
test('review uses each reference mapping independently from student page mapping', async () => {
  const s = screen(); s.route('#/homework/1/standards'); s.click('load-demo');
  s.input('assignmentPages', '2', {q: '0'}); s.input('solutionPages', '1,2', {q: '0'}); s.click('save-standards');
  s.route('#/homework/1/review');
  assert.match(s.root.innerHTML, /student-submission-1.png/);
  await s.change('view-document', 'questions'); assert.match(s.root.innerHTML, /questions-2.png/);
  await s.change('view-document', 'instructor-solution'); assert.match(s.root.innerHTML, /instructor-solution-1.png/);
  s.click('next-page'); assert.match(s.root.innerHTML, /instructor-solution-2.png/);
});
