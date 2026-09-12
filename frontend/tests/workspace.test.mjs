import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../app.mjs', import.meta.url), 'utf8')).replace(/^import .+;\n/, '');
function workspace({protocol = 'http:', runFails = false, approveFails = false} = {}) {
  const app = {innerHTML: '', className: ''};
  const announcement = {};
  const listeners = {};
  let runCalls = 0, approveCalls = 0, sessionUrl;
  const noop = {focus() {}, scrollTo() {}, scrollTop: 0};
  const dialog = {showModal() {}, close() {}};
  const document = {title: '', querySelector(selector) {
    return selector === '#app' ? app : selector === '#announcement' ? announcement :
      selector === '#course-dialog' ? dialog : selector === '#course-form' ? {addEventListener(type, fn) { listeners.submit = fn; }} : noop;
  }, addEventListener(type, fn) { listeners[type] = fn; }};
  const context = vm.createContext({document, location: {hash: '#/', protocol},
    window: {addEventListener(type, fn) { listeners[type] = fn; }}, AbortController, setTimeout, clearTimeout,
    async runSample(options) {
      runCalls++; sessionUrl = options.sessionUrl;
      if (runFails) throw new Error('Unavailable');
      options.onStep('Getting sample feedback…');
      return {hint: 'Separate what you may assume <for k> from what you must establish.', approved: false};
    }, async approveSample() { approveCalls++; if (approveFails) throw new Error('Unavailable'); return 2; }});
  vm.runInContext(source, context);
  return {app, context, listeners, get runCalls() { return runCalls; }, get approveCalls() { return approveCalls; }, get sessionUrl() { return sessionUrl; },
    route(hash) { context.location.hash = hash; listeners.hashchange(); },
    click(action) { listeners.click({target: {closest() { return {dataset: {action}}; }}}); },
    async settle() { await new Promise(resolve => setImmediate(resolve)); }};
}
test('dashboard routes to an assignment and the correct review without displaying a proposed score initially', () => {
  const w = workspace();
  assert.match(w.app.innerHTML, /Course dashboard/);
  w.route('#/course/sample');
  assert.match(w.app.innerHTML, /assignment-table/);
  w.route('#/review/sample');
  assert.match(w.app.innerHTML, /Run sample grading/);
  assert.doesNotMatch(w.app.innerHTML, /Suggested score/);
  assert.match(w.app.innerHTML, /Awaiting teacher review/);
});
test('offline feedback is clearly a preview and never offers grade approval', () => {
  const w = workspace({protocol: 'file:'}); w.route('#/review/sample');
  w.click('run');
  assert.equal(w.runCalls, 0);
  assert.match(w.app.innerHTML, /offline preview/);
  w.click('preview');
  assert.match(w.app.innerHTML, /Visual preview only/);
  assert.doesNotMatch(w.app.innerHTML, /data-action="approve"/);
  w.click('student');
  assert.doesNotMatch(w.app.innerHTML, /Suggested score|0 \/ 8|2 \/ 2|Circular reasoning/);
  assert.match(w.app.innerHTML, /Awaiting teacher review/);
});
test('sample flow uses the root session route, escapes feedback and waits for explicit teacher approval', async () => {
  const w = workspace(); w.route('#/review/sample'); w.click('run'); await w.settle();
  assert.equal(w.runCalls, 1);
  assert.equal(w.sessionUrl, './__debug__/session');
  assert.match(w.app.innerHTML, /&lt;for k&gt;/);
  assert.equal(w.approveCalls, 0);
  w.click('student'); w.click('approve'); await w.settle();
  assert.equal(w.approveCalls, 0);
  assert.doesNotMatch(w.app.innerHTML, /Suggested score|data-action="approve"/);
  w.click('teacher'); w.click('approve'); await w.settle();
  assert.equal(w.approveCalls, 1);
  w.click('student');
  assert.match(w.app.innerHTML, /Total points/);
  assert.match(w.app.innerHTML, /2 <small>\/ 10 pts/);
  w.click('teacher'); w.click('approve'); await w.settle();
  assert.equal(w.approveCalls, 1);
});
test('failed loading and approval never show success', async () => {
  const w = workspace({runFails: true}); w.route('#/review/sample'); w.click('run'); await w.settle();
  assert.match(w.app.innerHTML, /role="alert"/);
  assert.doesNotMatch(w.app.innerHTML, /Grade approved/);
  const a = workspace({approveFails: true}); a.route('#/review/sample'); a.click('run'); await a.settle(); a.click('approve'); await a.settle();
  assert.match(a.app.innerHTML, /grade could not be confirmed/);
  assert.doesNotMatch(a.app.innerHTML, /Grade approved/);
});
test('user-created course text is escaped and an empty course has an honest empty state', () => {
  const w = workspace();
  w.listeners.submit({preventDefault() {}, currentTarget: {elements: {code: {value: '<img src=x>'}, title: {value: 'Linear <algebra>'}}, reset() {}}});
  assert.match(w.app.innerHTML, /&lt;img src=x&gt;/);
  assert.doesNotMatch(w.app.innerHTML, /<img src=x>/);
  w.route('#/course/course-1');
  assert.match(w.app.innerHTML, /No assignments yet/);
});
