import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../model.mjs';
function ready(cohort = false) { const s = m.newWorkspace(); m.loadSampleRubric(s); m.publishDraft(s); m.seedClass(s, cohort); return s; }

test('blank workspace needs materials and a question; no attempt cap exists', () => {
  const s = m.newWorkspace(); assert.equal(m.validateDraft(s).length, 3);
  assert(!('attemptLimit' in s)); assert.equal(m.activeRubric(s), null);
  assert.throws(() => m.publishDraft(s), /Attach the blank/);
});
test('sample standard is editable, independent of the seed, and uses explicit deductions', () => {
  const s = m.newWorkspace(); m.loadSampleRubric(s);
  assert.deepEqual(m.validateDraft(s), []); assert.equal(m.total(s.draft[0]), 10);
  s.draft[0].criteria[0].label = 'Custom expected work'; assert.notEqual(m.sampleQuestions[0].criteria[0].label, 'Custom expected work');
  m.publishDraft(s); assert.equal(m.activeRubric(s).sampleCompatible, false);
  assert.throws(() => m.seedClass(s), /unchanged sample rubric/);
});
test('validation catches missing page mapping, duplicate IDs and invalid scoring bands', () => {
  const s = m.newWorkspace(); m.loadSampleRubric(s);
  s.draft[0].assignmentPages = [3]; assert.match(m.validateDraft(s).join(' '), /assignment pages/);
  s.draft[0].criteria[0].bands[0].points = 9; assert.match(m.validateDraft(s).join(' '), /invalid scoring outcome/);
  s.draft[1].id = s.draft[0].id; assert.match(m.validateDraft(s).join(' '), /unique/);
});
test('decimal validation and page parsing reject malformed values without rounding silently', () => {
  const s = m.newWorkspace(); m.loadSampleRubric(s); s.draft[0].criteria[0].bands[0].points = 6.001;
  assert.match(m.validateDraft(s).join(' '), /invalid scoring outcome/);
  assert.deepEqual(m.parsePageList('1, 2, 2'), [1, 2]);
  assert(Number.isNaN(m.parsePageList('1, 2x')[1]));
});
test('single-case demonstration starts at 16/20 and adds a 20/20 revision', () => {
  const s = ready(), r = m.activeRubric(s);
  assert.equal(s.submissions.length, 1); assert.equal(m.scoreAttempt(r, s.submissions[0].attempts[0]), 16);
  m.addSampleRevision(s); assert.equal(m.scoreAttempt(r, s.submissions[0].attempts[1]), 20);
  assert.deepEqual(m.analytics(s).questions.map(q => [q.first, q.latest]), [[70, 100], [90, 100]]);
  assert.equal(m.analytics(s).students, 1); assert.equal(m.analytics(s).reviewed, 0);
});
test('unlimited simulated revisions do not inflate distinct-student statistics', () => {
  const s = ready(); for (let i = 0; i < 12; i++) m.addSampleRevision(s);
  assert.equal(s.submissions[0].attempts.length, 13);
  const a = m.analytics(s); assert.equal(a.students, 1); assert.equal(a.questions[0].latestN, 1); assert.equal(a.questions[0].patterns[0].initial, 1);
});
test('every question needs a skim; TA role can complete the local review', () => {
  const s = ready(); s.role = 'TA';
  assert.throws(() => m.completeReview(s, 'demo-1'), /every question/);
  m.markSkimmed(s, 'demo-1', 'q1'); assert.throws(() => m.completeReview(s, 'demo-1'), /every question/);
  m.markSkimmed(s, 'demo-1', 'q2'); m.completeReview(s, 'demo-1');
  assert.equal(m.analytics(s).reviewed, 1); assert.equal(s.log.at(-1).actor, 'TA');
  assert.throws(() => m.updateOutcome(s, 'demo-1', 'q1', 'notation', 'full', 'Valid alternative'), /Reopen/);
});
test('changed judgments require rationale and reset the question skim', () => {
  const s = ready(); m.markSkimmed(s, 'demo-1', 'q1');
  assert.throws(() => m.updateOutcome(s, 'demo-1', 'q1', 'notation', 'full', ''), /reason/);
  m.updateOutcome(s, 'demo-1', 'q1', 'notation', 'full', 'Accepted alternate notation');
  assert.equal(m.reviewTarget(s, 'demo-1').attempt.questions.q1.skimmed, false);
  assert.equal(m.scoreAttempt(m.activeRubric(s), m.reviewTarget(s, 'demo-1').attempt), 17);
});
test('TA corrections preserve initial proposed scores and distinguish overturned flags', () => {
  const s = ready();
  m.updateOutcome(s, 'demo-1', 'q1', 'notation', 'full', 'Accepted alternate notation');
  const q = m.analytics(s).questions[0];
  assert.equal(q.first, 70); assert.equal(q.latest, 80);
  assert.equal(q.patterns.find(p => p.id === 'notation').overturned, 1);
  assert.equal(q.firstN, 1); assert.equal(q.latestN, 1);
});
test('unclear work and student disputes block a skim until explicitly resolved', () => {
  const s = ready(true); m.addSampleRevision(s);
  assert.equal(m.analytics(s).disputes, 1);
  assert.throws(() => m.markSkimmed(s, 'demo-3', 'q1'), /Resolve/);
  assert.throws(() => m.updateOutcome(s, 'demo-3', 'q1', 'notation', 'full', 'Transpose is valid'), /Resolve the student dispute/);
  m.updateOutcome(s, 'demo-3', 'q1', 'notation', 'full', 'Transpose notation gives a column vector', 'overturned');
  m.markSkimmed(s, 'demo-3', 'q1'); assert.equal(m.analytics(s).disputes, 0);
  assert.equal(m.analytics(s).questions[0].patterns.find(p => p.id === 'notation').overturned, 1);
  assert.throws(() => m.markSkimmed(s, 'demo-6', 'q1'), /Resolve/);
});
test('new rubric version excludes old scores and creates unresolved reviews explicitly', () => {
  const s = ready(), first = structuredClone(s.versions[0]);
  s.draft[0].expected += ' Clarified presentation.'; s.dirty = true; m.publishDraft(s);
  assert.deepEqual(s.versions[0], first); assert.equal(m.analytics(s).stale, 1); assert.equal(m.analytics(s).students, 0);
  assert.equal(m.prepareCurrentReviews(s), 1); assert.equal(m.prepareCurrentReviews(s), 0);
  const a = m.reviewTarget(s, 'demo-1').attempt; assert.equal(a.version, 2); assert.equal(a.source, 'manual');
  assert.equal(m.scoreAttempt(m.activeRubric(s), a), null);
  assert.equal(m.analytics(s).questions[0].latest, null);
  assert.equal(s.submissions[0].attempts[0].version, 1);
});
test('reopening preserves the completed review snapshot and requires a reason', () => {
  const s = ready(); m.markSkimmed(s, 'demo-1', 'q1'); m.markSkimmed(s, 'demo-1', 'q2'); m.completeReview(s, 'demo-1');
  const old = structuredClone(s.submissions[0].attempts[0]);
  assert.throws(() => m.reopenReview(s, 'demo-1', ''), /reason/);
  m.reopenReview(s, 'demo-1', 'Student appealed');
  assert.deepEqual(s.submissions[0].attempts[0], old); assert.equal(m.reviewTarget(s, 'demo-1').attempt.reviewedAt, null);
  assert.equal(m.analytics(s).students, 1);
});
test('teacher and student question pages remain independent', () => {
  const s = ready(); const a = m.reviewTarget(s, 'demo-1').attempt;
  s.draft[0].assignmentPages = [2]; s.draft[0].solutionPages = [1, 2];
  assert.deepEqual(a.questions.q1.pages, [1]); assert.deepEqual(m.activeRubric(s).questions[0].assignmentPages, [1]);
});
test('announcement is local text based on current issues and never claims measured learning', () => {
  const s = ready(); const text = m.draftAnnouncement(s);
  assert.match(text, /row operations/); assert.match(text, /office hours/);
  m.addSampleRevision(s); assert.equal(m.priorities(s).length, 0);
  assert.match(m.draftAnnouncement(s), /No unresolved patterns/);
});
test('add question and criterion supports general manual setup without preset analysis', () => {
  const s = m.newWorkspace(); m.addQuestion(s); m.addCriterion(s.draft[0]);
  assert.equal(s.draft[0].id, 'q1'); assert.equal(s.draft[0].criteria.length, 1); assert(s.dirty);
  assert.equal(s.source, 'manual'); assert.throws(() => m.seedClass(s), /unchanged/);
});
