import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorkspace, loadSampleRubric, publishDraft, seedClass, addSampleRevision} from '../model.mjs';
import {renderWorkspace, routeFrom} from '../view.mjs';
const baseUI = {route:'home', editQ:0, insightQ:null, reviewQ:'q1', sid:'demo-1', attempt:'', search:'', filter:'all', doc:'student', page:0, docURLs:{}, apiOrigin:'http://localhost:8000', apiCourse:'', apiToken:'', storageStatus:'Saved locally'};
function fixture() {const s = newWorkspace(); loadSampleRubric(s); publishDraft(s); seedClass(s); return s;}
test('all routes render semantic navigation and an empty chart without invented scores', () => {
  const s = newWorkspace();
  for (const route of ['home','standards','dashboard','submissions','activity','review']) {
    const html = renderWorkspace(s, {...baseUI, route}); assert.match(html, /<main id="main"/); assert.match(html, /aria-label="Courses"/);
  }
  const empty = renderWorkspace(s, {...baseUI, route:'dashboard'});
  assert.match(empty, /<svg class="question-chart"/);
  assert.match(empty, /No graded submissions yet/);
  assert.doesNotMatch(empty, /<polyline|<circle class="point/);
  const studio = renderWorkspace(s, {...baseUI, route:'standards'});
  assert.match(studio, /aria-label="Homework sections"/);
  assert.match(studio, /href="#\/homework\/1\/standards" aria-current="page">Rubric/);
  assert.match(studio, />Overview<|>Grading</);
  assert.doesNotMatch(studio, />Activity</);
  assert.equal(routeFrom('#/homework/1/review/demo-1'),'review');
});
test('chart exposes real denominators, percentages and provisional sample disclosure', () => {
  const s = fixture(); addSampleRevision(s);
  const html = renderWorkspace(s, {...baseUI, route:'dashboard', insightQ:'q1'});
  assert.match(html, /first 70%, latest 100%, 1 assessed/);
  assert.match(html, /Fictional demo records/); assert.match(html, /Estimates until TA review/);
  assert.match(html, /not class-wide conclusions/); assert.match(html, /<table>/);
});
test('PDF docs, page maps, alternatives, points and external consent appear in setup', () => {
  const html = renderWorkspace(fixture(), {...baseUI, route:'standards'});
  for (const text of ['Blank PDF pages','Solution PDF pages','Accepted alternatives','Past graded work','Deductions','Publish rubric','ai-consent']) assert(html.includes(text));
  assert.doesNotMatch(html, /Professor approval required|three checks/i);
});
test('one sample student has first-attempt work and previous version becomes read-only', () => {
  const s = fixture(); const id = s.submissions[0].attempts[0].id; addSampleRevision(s);
  let html = renderWorkspace(s, {...baseUI, route:'review'});
  assert.match(html, /Student-assigned pages: 1/); assert.match(html, /20<small> \/ 20/);
  html = renderWorkspace(s, {...baseUI, route:'review', attempt:id});
  assert.match(html, /Viewing a previous attempt/); assert.match(html, /name="band" disabled/);
});
test('student disputes, outcomes and rationale forms are visible to the TA', () => {
  const s = newWorkspace(); loadSampleRubric(s); publishDraft(s); seedClass(s,true); addSampleRevision(s); s.role='TA';
  const html = renderWorkspace(s,{...baseUI,route:'review',sid:'demo-3'});
  assert.match(html,/Student thinks the AI is wrong/); assert.match(html,/name="resolution"/); assert.match(html,/TA reasoning/);
});
test('all user text is escaped, including PDF names, prompts and activity reasons', () => {
  const s=fixture(); s.title='<img src=x onerror=alert(1)>'; s.versions[0].questions[0].prompt='<script>bad()</script>';
  s.log.push({at:new Date().toISOString(),actor:'TA',action:'<img>',detail:'<script>'});
  for (const route of ['home','review','activity']) {
    const html=renderWorkspace(s,{...baseUI,route}); assert.doesNotMatch(html,/<script>|<img src=x/); if(route!=='home') assert.match(html,/&lt;/);
  }
});

test('question details are hidden until a valid question is selected', () => {
  const s = fixture();
  const overview = renderWorkspace(s, {...baseUI, route:'dashboard'});
  assert.doesNotMatch(overview, /id="question-statistics"|class="question-summary"/);
  assert.match(overview, /class="chart-point" role="button" tabindex="0"/);
  assert.match(overview, /Show question statistics/);
  for (const q of s.versions[0].questions) {
    const selected = renderWorkspace(s, {...baseUI, route:'dashboard', insightQ:q.id});
    assert.match(selected, /id="question-statistics"/);
    assert(selected.includes(`id="question-statistics-title">${q.title}</h2>`));
  }
  assert.doesNotMatch(renderWorkspace(s, {...baseUI, route:'dashboard', insightQ:'removed-question'}), /id="question-statistics"/);
});
