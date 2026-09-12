import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorkspace, loadSampleRubric, publishDraft, seedClass, clone} from '../model.mjs';
import {finalFor, submissionQueue, teachingSignals} from '../grading.mjs';
import {renderGrade, renderTeaching} from '../grading-view.mjs';

function fixture() {
  const s = newWorkspace(); loadSampleRubric(s); publishDraft(s); seedClass(s);
  s.submissions = s.submissions.slice(0, 1);
  const st = s.submissions[0], initial = st.attempts[0];
  initial.final = false; initial.pdf = {id:'first', name:'first.pdf'};
  const final = clone(initial); final.id = 'final'; final.final = true; final.revision = 2; final.pdf = {id:'final-pdf', name:'final.pdf'};
  for (const q of s.versions[0].questions) for (const c of q.criteria) {
    final.questions[q.id].results[c.id].band = c.bands.find(b => b.points === c.max).id;
    final.questions[q.id].results[c.id].proposed = final.questions[q.id].results[c.id].band;
    final.questions[q.id].results[c.id].evidence = 'Final evidence';
  }
  st.attempts.push(final);
  const later = clone(initial); later.id = 'later-practice'; later.revision = 3; st.attempts.push(later);
  return s;
}
test('whole-submission queue selects final even after a later practice upload', () => {
  const s = fixture(), st = s.submissions[0];
  assert.equal(finalFor(st, 1).id, 'final');
  assert.equal(submissionQueue(s)[0].attempt.id, 'final');
  assert.equal(submissionQueue(s)[0].count, 2);
  st.attempts.forEach(a => {a.final = false;});
  assert.deepEqual(submissionQueue(s), []);
});
test('final rendering never uses earlier evidence and keeps questions inside one submission', () => {
  const s = fixture(), st = s.submissions[0];
  st.attempts[0].questions.q1.results[Object.keys(st.attempts[0].questions.q1.results)[0]].evidence = 'EARLIER PRIVATE ERROR';
  s.reviewAssignments = {final:{userId:'ta', name:'Reviewer'}};
  const ui = {connected:true, actor:{id:'ta'}, docURLs:{'final-pdf':'blob:final',first:'blob:first'}, gradeAI:false, gradeDrafts:{}};
  const html = renderGrade(s, ui);
  assert.match(html, /Grade submissions/);
  assert.match(html, /Questions in this submission/);
  assert.match(html, /src="blob:final#page=/);
  assert.doesNotMatch(html, /EARLIER PRIVATE ERROR|Take this question/);
  assert.match(html, /Save and next question/);
  assert.doesNotMatch(html, /value="full" selected/);
});
test('unknown latest work is not counted as fixed and repeated attempts do not inflate students', () => {
  const s = fixture(), st = s.submissions[0];
  const q = s.versions[0].questions[0], c = q.criteria[0];
  const partial = c.bands.find(b => b.points < c.max).id;
  for (const a of st.attempts) { a.questions[q.id].results[c.id].band = partial; a.questions[q.id].results[c.id].proposed = partial; }
  st.attempts.at(-1).questions[q.id].results[c.id].band = null;
  st.attempts.at(-1).questions[q.id].results[c.id].proposed = null;
  let p = teachingSignals(s)[0].patterns[0];
  assert.equal(p.initial, 1); assert.equal(p.absentLater, 0); assert.equal(p.current, 0);
  st.attempts.at(-1).questions[q.id].results[c.id].band = c.bands.find(b => b.points === c.max).id;
  p = teachingSignals(s)[0].patterns[0];
  assert.equal(p.absentLater, 1);
  st.name = '<script>evil()</script>';
  assert.doesNotMatch(renderTeaching(s, {docURLs:{first:'blob:first'}}), /<script>/);
});

test('TA review uses published solution crops while the current draft changes', () => {
  const s = fixture(), published = s.versions[0], question = published.questions[0];
  published.documents.solution = {id:'published-solution', pageCount:2};
  question.solutionCrops = [{id:'crop', documentId:'published-solution', page:2, rect:[.1,.2,.7,.3], label:'Published answer'}];
  s.documents.solution = {id:'replacement-solution', pageCount:1};
  s.draft[0].solutionCrops = [{id:'new-crop', documentId:'replacement-solution', page:1, rect:[.1,.1,.5,.2], label:'Unpublished answer'}];
  const html = renderGrade(s, {connected:true, docURLs:{'final-pdf':'blob:final','published-solution':'blob:published'}});
  assert.match(html, /data-reference-pdf="published-solution" data-page="2"/);
  assert.match(html, /Published answer/);
  assert.doesNotMatch(html, /Unpublished answer|replacement-solution|data-action="edit-crop"/);
});
