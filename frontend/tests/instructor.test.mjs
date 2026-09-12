import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstructorState, loadDemoMaterials, invalidateStandards, saveStandards, runDemoCheck, reviewDecision, assessmentScore, approveDemoGrade, validateStandards, validatePdf, parsePages, pagesForQuestion} from '../instructor-model.mjs';

function setup() { const state = createInstructorState(); loadDemoMaterials(state); saveStandards(state); return state; }
test('requires blank assignment, worked solution, expected structure and valid rubric before saving', () => {
  const state = createInstructorState();
  assert.equal(validateStandards(state).length, 2);
  assert.throws(() => saveStandards(state), /blank assignment/);
  loadDemoMaterials(state); state.questions[0].expectedWork = '';
  assert.throws(() => saveStandards(state), /expected work/);
});
test('the deliberate formatting sample scores 7/10 and 9/10; correct math is retained', () => {
  const state = setup(); runDemoCheck(state);
  assert.deepEqual(assessmentScore(state).questions.map(q => q.score), [7, 9]);
  assert.equal(assessmentScore(state).score, 16);
  assert.equal(state.assessment.results.hypothesis.decision, 'keep');
  assert.match(state.assessment.results['column-vector'].evidence, /Both values are correct/);
});
test('professor adjusts deductions, TA reviews, only professor approves', () => {
  const state = setup(); state.role = 'ta';
  assert.throws(() => saveStandards(state), /professor/);
  assert.throws(() => loadDemoMaterials(state), /professor/);
  runDemoCheck(state); reviewDecision(state, 'column-vector', 'keep');
  assert.equal(assessmentScore(state).score, 17);
  assert.throws(() => approveDemoGrade(state), /professor/);
  state.role = 'professor'; approveDemoGrade(state);
  assert.equal(state.history[0].score.score, 17);
  assert.throws(() => reviewDecision(state, 'row-labels', 'keep'), /new check/);
  approveDemoGrade(state); assert.equal(state.history.length, 1);
});
test('changing standards invalidates proposals and preserves prior approved history', () => {
  const state = setup(); runDemoCheck(state); approveDemoGrade(state);
  state.questions[0].rules[0].points = 1;
  invalidateStandards(state);
  assert.equal(assessmentScore(state), null);
  assert.throws(() => runDemoCheck(state), /Save/);
  saveStandards(state); runDemoCheck(state);
  assert.equal(assessmentScore(state).score, 17);
  assert.equal(state.history[0].score.score, 16);
  assert.equal(state.version, 2);
});
test('custom references are not silently treated as scanned sample PDFs', () => {
  const state = setup(); state.documents.solution = {name: 'custom.pdf', demo: false};
  invalidateStandards(state); saveStandards(state); runDemoCheck(state);
  assert.equal(assessmentScore(state).pending, true);
  assert.equal(state.assessment.results['column-vector'].source, 'manual');
  assert.throws(() => approveDemoGrade(state), /every deduction/);
});
test('new criteria and missing results cannot receive automatic full credit', () => {
  const state = setup(); state.questions[0].rules.push({id: 'custom', text: 'Use exact values', points: 1, check: null});
  invalidateStandards(state); saveStandards(state); runDemoCheck(state);
  assert.equal(assessmentScore(state).pending, true);
  reviewDecision(state, 'custom', 'keep');
  assert.equal(assessmentScore(state).pending, false);
  delete state.assessment.results.hypothesis;
  assert.equal(assessmentScore(state).pending, true);
});
test('invalid deductions cannot create negative or nonfinite scores', () => {
  for (const bad of [-1, NaN, Infinity, 0, 1.001]) {
    const state = setup(); state.questions[0].rules[0].points = bad;
    assert.throws(() => saveStandards(state), /Deductions/);
  }
  const state = setup(); state.questions[0].rules[0].points = 11;
  assert.throws(() => saveStandards(state), /exceed/);
  state.questions[0].rules[0].points = .29;
  assert.equal(validateStandards(state).length, 0);
});
test('page lists support multiple nonconsecutive pages and reject invalid values', () => {
  assert.deepEqual(parsePages(' 1, 3, 4, 3 '), [1,3,4]);
  for (const text of ['', '0', '-1', '1.5', 'one', '1,,2']) assert.deepEqual(parsePages(text), []);
  const state = setup(); state.questions[0].assignmentPages = [3];
  assert.throws(() => saveStandards(state), /page numbers/);
});
test('teacher reference pages and student submission pages stay independent', () => {
  const state = setup();
  state.submission.questionPages.q1 = [2, 4]; state.submission.pageCount = 4;
  assert.deepEqual(pagesForQuestion(state, 0, 'questions'), [1]);
  assert.deepEqual(pagesForQuestion(state, 0, 'instructor-solution'), [1]);
  assert.deepEqual(pagesForQuestion(state, 0, 'student-submission'), [2,4]);
  runDemoCheck(state);
  assert.equal(state.assessment.results['row-labels'].decision, 'unreviewed');
});
test('file selection validates file size, extension and PDF signature', async () => {
  const file = (name, size, text) => ({name, size, slice: () => ({text: async () => text})});
  await validatePdf(file('work.pdf', 100, '%PDF-1.4\nexample'));
  await assert.rejects(validatePdf(file('work.html', 100, '%PDF-1.4')), /PDF file/);
  await assert.rejects(validatePdf(file('work.pdf', 21 * 1024 * 1024, '%PDF-1.4')), /20 MB/);
  await assert.rejects(validatePdf(file('work.pdf', 100, '<html>')), /appear/);
});
