export const STAFF_SCHEMA = 1;
export const clone = value => structuredClone(value);
export const cents = n => Math.round(Number(n) * 100);
export const total = q => q.criteria.reduce((n, c) => n + cents(c.max), 0) / 100;
export const now = () => new Date().toISOString();
export const band = (id, label, points) => ({id, label, points});
export const sampleQuestions = [
  {id: 'q1', title: 'Linear systems', prompt: 'Solve 2x + y = 5 and x − y = 1 using row reduction. Show each row operation and give the solution as a column vector.', assignmentPages: [1], solutionPages: [1], owner: 'TA 1',
    expected: 'An augmented matrix, intermediate matrices with labeled row operations, and a final solution column vector.', alternatives: 'Equivalent valid row operations are accepted. The final column-vector form is explicitly required by this sample question.', criteria: [
      {id: 'row-work', label: 'Show and label the row operations', category: 'Missing work', max: 7, bands: [band('full', 'Complete, valid row reduction', 7), band('partial', 'Correct reduction, missing operation labels', 5), band('missing', 'Missing or invalid reduction', 0)]},
      {id: 'answer', label: 'Obtain the correct solution', category: 'Arithmetic', max: 2, bands: [band('full', 'x = 2 and y = 1', 2), band('missing', 'Incorrect or missing answer', 0)]},
      {id: 'notation', label: 'Use the requested column-vector form', category: 'Notation', max: 1, bands: [band('full', 'Valid column-vector notation', 1), band('missing', 'Required notation missing', 0)]},
    ]},
  {id: 'q2', title: 'Proof by induction', prompt: 'Prove that 1 + 3 + ··· + (2n − 1) = n² for every integer n ≥ 1.', assignmentPages: [2], solutionPages: [2], owner: 'TA 2',
    expected: 'Base case, inductive hypothesis for arbitrary k ≥ 1, k + 1 step, and a conclusion for every integer n ≥ 1.', alternatives: 'Equivalent valid expressions are accepted. Assess reasoning, not similarity to the reference wording.', criteria: [
      {id: 'hypothesis', label: 'Establish the base case and induction hypothesis', category: 'Proof structure', max: 4, bands: [band('full', 'Base case and arbitrary k stated', 4), band('partial', 'One component missing', 2), band('missing', 'Both components missing', 0)]},
      {id: 'step', label: 'Justify the k + 1 step using the hypothesis', category: 'Logical error', max: 5, bands: [band('full', 'Valid inductive step', 5), band('partial', 'Partly justified step', 3), band('missing', 'Circular or absent reasoning', 0)]},
      {id: 'conclusion', label: 'State the conclusion for all integers n ≥ 1', category: 'Missing work', max: 1, bands: [band('full', 'Universal conclusion stated', 1), band('missing', 'Conclusion missing', 0)]},
    ]},
];
export function newWorkspace() {
  return {schema: STAFF_SCHEMA, revision: 0, role: 'Professor', title: 'Homework 1', course: 'Linear Algebra',
    documents: {blank: null, solution: null, examples: []}, draft: [], source: 'manual',
    instructions: 'Accept valid alternative reasoning. Flag possible mistakes; do not infer a deduction from messy handwriting alone.',
    dirty: false, versions: [], submissions: [], log: [], announcement: '', demoLoaded: false, updatedAt: null};
}
export function activeRubric(s) { return s.versions.at(-1) || null; }
export function touch(s) { s.revision++; s.updatedAt = now(); }
export function record(s, action, detail) { s.log.push({at: now(), actor: s.role, action, detail}); touch(s); }
export function parsePageList(value) {
  const parts = String(value).trim().split(/[\s,]+/).filter(Boolean);
  return parts.map(p => /^\d+$/.test(p) ? Number(p) : NaN).filter((p, i, a) => a.indexOf(p) === i || Number.isNaN(p));
}
export function validateDraft(s) {
  const errors = [];
  if (!s.documents.blank) errors.push('Attach the blank assignment PDF.');
  if (!s.documents.solution) errors.push('Attach the professor solution PDF.');
  if (!s.draft.length) errors.push('Add at least one question.');
  const ids = new Set();
  for (const [i, q] of s.draft.entries()) {
    const prefix = `Question ${i + 1}`;
    if (!q.id || ids.has(q.id)) errors.push('Question IDs must be unique.');
    ids.add(q.id);
    if (!q.title.trim() || !q.prompt.trim() || !q.expected.trim()) errors.push(`${prefix} needs a title, prompt and expected work.`);
    for (const [field, doc] of [['assignmentPages', s.documents.blank], ['solutionPages', s.documents.solution]]) {
      if (!q[field]?.length || q[field].some(p => !Number.isInteger(p) || p < 1 || (doc?.pageCount && p > doc.pageCount))) errors.push(`${prefix} needs valid ${field === 'assignmentPages' ? 'assignment' : 'solution'} pages.`);
    }
    if (!q.criteria.length) errors.push(`${prefix} needs a grading criterion.`);
    const criterionIds = new Set();
    for (const c of q.criteria) {
      if (!c.id || criterionIds.has(c.id)) errors.push(`${prefix} has duplicate criterion IDs.`);
      criterionIds.add(c.id);
      if (!c.label.trim() || !Number.isFinite(c.max) || c.max <= 0 || c.max > 1000 || Math.abs(cents(c.max) - c.max * 100) > 1e-7) errors.push(`${prefix} has an invalid criterion or point total.`);
      const bandIds = new Set();
      if (!c.bands.length || !c.bands.some(b => cents(b.points) === cents(c.max))) errors.push(`${prefix}: each criterion needs a full-credit outcome.`);
      for (const b of c.bands) {
        if (!b.id || bandIds.has(b.id) || !b.label.trim() || !Number.isFinite(b.points) || b.points < 0 || b.points > c.max || Math.abs(cents(b.points) - b.points * 100) > 1e-7) errors.push(`${prefix} has an invalid scoring outcome.`);
        bandIds.add(b.id);
      }
    }
  }
  return [...new Set(errors)];
}
export function loadSampleRubric(s) {
  if (s.versions.length) throw new Error('A standard already exists. Edit its draft or create a new question.');
  s.draft = clone(sampleQuestions); s.source = 'sample'; s.dirty = true;
  s.documents = {blank: {id: 'sample-blank', name: 'questions.pdf', sample: true, pageCount: 2, path: './output/pdf/homework-1/questions.pdf'},
    solution: {id: 'sample-solution', name: 'instructor-solution.pdf', sample: true, pageCount: 2, path: './output/pdf/homework-1/instructor-solution.pdf'},
    examples: [{id: 'sample-example', name: 'past-graded.pdf', sample: true, pageCount: 2, path: './output/pdf/homework-1/past-graded.pdf'}]};
  record(s, 'Sample draft loaded', 'Fictional sample materials and preset rubric; no AI analysis.');
}
export function publishDraft(s) {
  const errors = validateDraft(s); if (errors.length) throw new Error(errors.join(' '));
  if (!s.dirty && activeRubric(s)) throw new Error('There are no rubric changes to finalize.');
  const version = {id: s.versions.length + 1, questions: clone(s.draft), instructions: s.instructions, documents: clone(s.documents), source: s.source, at: now(),
    sampleCompatible: s.source === 'sample' && JSON.stringify(s.draft) === JSON.stringify(sampleQuestions),
    caseCompatible: s.source === 'row-case' && s.caseSignature === JSON.stringify(s.draft) && s.instructions === s.caseInstructions};
  s.versions.push(version); s.dirty = false;
  record(s, 'Rubric finalized locally', `Standard v${version.id}; previous reviews remain unchanged.`);
  return version;
}
export function addQuestion(s) {
  const used = new Set(s.draft.map(q => q.id)); let n = 1; while (used.has(`q${n}`)) n++;
  s.draft.push({id: `q${n}`, title: `Question ${n}`, prompt: '', expected: '', alternatives: '', owner: 'Unassigned', assignmentPages: [], solutionPages: [], criteria: []});
  s.dirty = true; touch(s);
}
export function addCriterion(q) {
  let n = 1; const ids = new Set(q.criteria.map(c => c.id)); while (ids.has(`criterion-${n}`)) n++;
  q.criteria.push({id: `criterion-${n}`, label: '', category: 'Missing work', max: 1, bands: [band('full', 'Requirement met', 1), band('missing', 'Requirement missing', 0)]});
}
const sampleBands = [
  [['partial', 'full', 'missing', 'full', 'full', 'missing'], ['full', 'full', 'full', 'full', 'full', 'full']],
  [['missing', 'missing', 'full', 'partial', 'partial', 'missing'], ['partial', 'full', 'full', 'full', 'partial', 'full']],
  [['full', 'full', 'missing', 'full', 'full', 'full'], ['full', 'full', 'missing', 'full', 'full', 'full']],
  [['partial', 'full', 'full', 'partial', 'missing', 'missing'], ['full', 'full', 'full', 'full', 'partial', 'missing']],
  [['full', 'full', 'full', 'full', 'full', 'full'], ['full', 'full', 'full', 'full', 'full', 'full']],
  [['partial', 'full', 'missing', 'full', 'partial', 'missing'], ['partial', 'full', 'full', 'full', 'full', 'missing']],
];
export function sampleAnswer(qid, results, disputed = false) {
  if (qid === 'q1') {
    const row = results['row-work'].band;
    return ['2x + y = 5,  x − y = 1', 'Augmented matrix: [2  1 | 5; 1  −1 | 1]',
      row === 'full' ? 'R₁ ↔ R₂\nR₂ ← R₂ − 2R₁\nR₂ ← (1/3)R₂\nR₁ ← R₁ + R₂\n[1  0 | 2; 0  1 | 1]' : row === 'partial' ? '⇒ [1  0 | 2; 0  1 | 1]' : 'I could not finish the row reduction.',
      results.answer.band !== 'full' ? 'x = 3, y = 1' : disputed || results.notation.band === 'full' ? '(x, y)ᵀ = (2, 1)ᵀ' : 'x = 2, y = 1'].join('\n\n');
  }
  return [results.hypothesis.band === 'full' ? 'At n = 1, 1 = 1². Assume the claim for an arbitrary k ≥ 1.' : 'Assume the claim for k.',
    results.step.band === 'full' ? '1 + 3 + ⋯ + (2k − 1) + (2k + 1)\n= k² + 2k + 1\n= (k + 1)², using the induction hypothesis.' : results.step.band === 'partial' ? 'Adding the next odd number gives (k + 1)².' : 'The statement holds for k + 1 because it holds for all n.',
    results.conclusion.band === 'full' ? 'By induction the identity holds for every integer n ≥ 1.' : ''].join('\n\n');
}
export function makeSampleAttempt(rubric, studentIndex, revision) {
  const chosen = sampleBands[studentIndex][revision - 1]; let index = 0;
  const questions = {};
  for (const q of rubric.questions) {
    const results = {};
    for (const c of q.criteria) {
      const chosenBand = chosen[index++];
      const b = c.bands.find(b => b.id === chosenBand);
      results[c.id] = {band: b.id, proposed: b.id, reason: '', evidence: b.points < c.max ? `Sample proposal: ${b.label}. Compare the work with this requirement.` : `Sample proposal: ${b.label}.`,
        unclear: studentIndex === 5 && revision === 2 && c.id === 'row-work', dispute: null};
    }
    const disputed = studentIndex === 2 && q.id === 'q1' && revision === 2;
    if (disputed) results.notation.dispute = {message: 'I used a transpose to write a column vector. Could you check this deduction?', status: 'open', resolution: ''};
    questions[q.id] = {results, skimmed: false, pages: [q.id === 'q1' ? 1 : 2], work: sampleAnswer(q.id, results, disputed)};
  }
  return {id: `demo-${studentIndex + 1}-r${revision}-v${rubric.id}`, revision, version: rubric.id, source: 'sample', final: true, reviewedAt: null, questions, at: now()};
}
export function seedClass(s, cohort = false) {
  const rubric = activeRubric(s);
  if (!rubric?.sampleCompatible) throw new Error('Sample proposals only match the unchanged sample rubric. Custom rubrics support manual review.');
  if (s.demoLoaded) throw new Error('The sample class is already loaded.');
  s.submissions = sampleBands.slice(0, cohort ? 6 : 1).map((_, i) => ({id: `demo-${i + 1}`, name: `Demo student ${String(i + 1).padStart(2, '0')}`, attempts: [makeSampleAttempt(rubric, i, 1)]}));
  s.demoLoaded = true; record(s, 'Sample work loaded', `${s.submissions.length} fictional student(s). Fixed sample proposals, not live AI.`);
}
export function addSampleRevision(s) {
  const rubric = activeRubric(s);
  if (!rubric?.sampleCompatible || !s.demoLoaded) throw new Error('Load sample work with the unchanged sample rubric first.');
  for (const [i, st] of s.submissions.entries()) {
    const next = makeSampleAttempt(rubric, i, 2);
    next.revision = Math.max(...st.attempts.map(a => a.revision)) + 1;
    next.id = `${st.id}-r${next.revision}-v${rubric.id}`;
    st.attempts.push(next);
  }
  record(s, 'Sample revision received', 'Explicitly simulated revisions; no attempt limit.');
}
export function latestFor(student, version) { return student.attempts.filter(a => a.version === version).at(-1) || null; }
export function scoreQuestion(q, review) {
  if (!review) return null;
  let score = 0;
  for (const c of q.criteria) { const b = c.bands.find(b => b.id === review.results[c.id]?.band); if (!b) return null; score += cents(b.points); }
  return score / 100;
}
export function scoreAttempt(rubric, attempt) {
  if (!attempt || attempt.version !== rubric.id) return null;
  const scores = rubric.questions.map(q => scoreQuestion(q, attempt.questions[q.id]));
  return scores.some(n => n === null) ? null : scores.reduce((n, v) => n + cents(v), 0) / 100;
}
export function reviewTarget(s, sid) {
  const rubric = activeRubric(s), student = s.submissions.find(st => st.id === sid), attempt = student && rubric && latestFor(student, rubric.id);
  if (!attempt) throw new Error('This submission needs a review under the current rubric.');
  return {rubric, student, attempt};
}
export function updateOutcome(s, sid, qid, cid, bandId, reason, resolution) {
  const {rubric, attempt} = reviewTarget(s, sid);
  if (attempt.reviewedAt) throw new Error('Reopen the review before changing it.');
  const q = rubric.questions.find(q => q.id === qid), c = q?.criteria.find(c => c.id === cid);
  if (!c?.bands.some(b => b.id === bandId)) throw new Error('Choose a valid scoring outcome.');
  const result = attempt.questions[qid].results[cid];
  if ((bandId !== result.band || result.dispute?.status === 'open' || result.unclear) && !reason?.trim()) throw new Error('Add a short reason for this review decision.');
  if (result.dispute?.status === 'open' && !['upheld', 'overturned'].includes(resolution)) throw new Error('Resolve the student dispute before saving this decision.');
  const before = result.band; result.band = bandId; result.reason = reason.trim(); result.confirmed = true; result.unclear = false;
  if (result.dispute?.status === 'open') { result.dispute.status = resolution; result.dispute.resolution = reason.trim(); }
  attempt.questions[qid].skimmed = false;
  record(s, 'Review decision', `${sid}, ${qid}, ${cid}: ${before || 'unresolved'} → ${bandId}. ${reason.trim()}`);
}
export function markSkimmed(s, sid, qid) {
  const {rubric, attempt} = reviewTarget(s, sid); if (attempt.reviewedAt) return;
  const review = attempt.questions[qid], q = rubric.questions.find(q => q.id === qid);
  if (!review?.pages?.length || !review.work?.trim()) throw new Error('Assign student pages and provide the work before marking it checked.');
  if (!review || scoreQuestion(q, review) === null || Object.values(review.results).some(r => r.unclear || r.dispute?.status === 'open')) throw new Error('Resolve uncertain outcomes and open disputes before marking this question checked.');
  review.skimmed = true;
  for (const r of Object.values(review.results)) r.confirmed = true;
  record(s, 'Question skimmed', `${sid}, ${qid}`);
}
export function completeReview(s, sid) {
  const {rubric, attempt} = reviewTarget(s, sid);
  if (!attempt.final) throw new Error('The student must submit a final version before the TA completes the review.');
  if (attempt.reviewedAt) return;
  if (!rubric.questions.every(q => attempt.questions[q.id]?.skimmed) || scoreAttempt(rubric, attempt) === null) throw new Error('Skim every question before completing this review.');
  attempt.reviewedAt = now(); record(s, 'Review completed locally', `${sid}: ${scoreAttempt(rubric, attempt)} points. No grade published externally.`);
}
export function reopenReview(s, sid, reason) {
  if (!reason?.trim()) throw new Error('Give a reason for reopening the review.');
  const {attempt} = reviewTarget(s, sid);
  if (!attempt.reviewedAt) throw new Error('This review is already open.');
  const snapshot = clone(attempt); snapshot.id += `-reopen-${s.revision}`; snapshot.reviewedAt = null;
  for (const q of Object.values(snapshot.questions)) q.skimmed = false;
  s.submissions.find(st => st.id === sid).attempts.push(snapshot);
  record(s, 'Review reopened', `${sid}: ${reason.trim()}`);
}
export function prepareCurrentReviews(s) {
  const rubric = activeRubric(s); if (!rubric) throw new Error('Finalize the rubric first.');
  let count = 0;
  for (const student of s.submissions) {
    if (latestFor(student, rubric.id)) continue;
    const previous = student.attempts.at(-1);
    const questions = Object.fromEntries(rubric.questions.map(q => [q.id, {pages: previous.questions[q.id]?.pages || [], work: previous.questions[q.id]?.work || '', skimmed: false,
      results: Object.fromEntries(q.criteria.map(c => [c.id, {band: null, proposed: null, evidence: 'The standard changed. Review this work against the new criterion.', reason: '', unclear: true, dispute: null}]))}]));
    student.attempts.push({...clone(previous), id: `${student.id}-v${rubric.id}-${s.revision}`, version: rubric.id, source: 'manual', reviewedAt: null, questions}); count++;
  }
  record(s, 'New-version reviews prepared', `${count} submissions require fresh human decisions; old reviews preserved.`); return count;
}
export function analytics(s) {
  const rubric = activeRubric(s); if (!rubric) return {questions: [], reviewed: 0, students: 0, disputes: 0, pending: 0, stale: 0};
  const eligible = s.submissions.map(st => ({student: st, attempts: st.attempts.filter(a => a.version === rubric.id)})).filter(x => x.attempts.length);
  const avg = values => values.length ? Math.round(values.reduce((n, v) => n + v, 0) / values.length * 10) / 10 : null;
  const questions = rubric.questions.map(q => {
    const first = [], latest = [], reviewed = [];
    const patterns = q.criteria.map(c => ({id: c.id, label: c.label, category: c.category, initial: 0, unresolved: 0, confirmed: 0, disputed: 0, overturned: 0, resolved: 0}));
    for (const item of eligible) {
      const firstReview = item.attempts[0].questions[q.id];
      const a = firstReview && {...firstReview, results: Object.fromEntries(Object.entries(firstReview.results).map(([id, result]) => [id, {...result, band: result.proposed ?? result.band}]))}, b = item.attempts.at(-1).questions[q.id];
      const aScore = scoreQuestion(q, a), bScore = scoreQuestion(q, b);
      if (aScore !== null) first.push(100 * aScore / total(q));
      if (bScore !== null) latest.push(100 * bScore / total(q));
      if (item.attempts.at(-1).reviewedAt && bScore !== null) reviewed.push(100 * bScore / total(q));
      for (const [i, c] of q.criteria.entries()) {
        const x = a?.results[c.id], y = b?.results[c.id];
        const points = r => c.bands.find(b => b.id === r?.band)?.points;
        const initial = points(x) !== undefined && points(x) < c.max;
        const current = points(y) !== undefined && points(y) < c.max;
        const p = patterns[i];
        if (initial) p.initial++;
        if (current && y.dispute?.status !== 'open') p.unresolved++;
        if (current && y.confirmed) p.confirmed++;
        if (y?.dispute?.status === 'open') p.disputed++;
        if (y?.dispute?.status === 'overturned' || (y?.proposed && y.proposed !== y.band && points(y) === c.max)) p.overturned++;
        if (initial && points(y) === c.max) p.resolved++;
      }
    }
    return {id: q.id, title: q.title, first: avg(first), latest: avg(latest), reviewed: avg(reviewed), firstN: first.length, latestN: latest.length, reviewedN: reviewed.length, patterns, owner: q.owner};
  });
  const attempts = eligible.map(e => e.attempts.at(-1));
  return {questions, students: eligible.length, stale: s.submissions.length - eligible.length,
    reviewed: attempts.filter(a => a.reviewedAt).length, pending: attempts.filter(a => !a.reviewedAt).length,
    disputes: attempts.reduce((n, a) => n + Object.values(a.questions).flatMap(q => Object.values(q.results)).filter(r => r.dispute?.status === 'open').length, 0)};
}
export function priorities(s) {
  return analytics(s).questions.flatMap(q => q.patterns.filter(p => p.unresolved > 0).map(p => ({...p, question: q.id, title: q.title}))).sort((a, b) => b.unresolved - a.unresolved || b.initial - a.initial);
}
export function draftAnnouncement(s) {
  const p = priorities(s).slice(0, 3);
  if (!p.length) return 'No unresolved patterns are available yet. Review more submissions before drafting a course reminder.';
  return `For our next recitation, we’ll revisit ${[...new Set(p.map(x => x.title.toLowerCase()))].join(' and ')}.\n\nAs you review ${s.title}, double-check these requirements:\n${p.map(x => `• ${x.label}`).join('\n')}\n\nBring a specific step you’re unsure about to recitation or office hours.`;
}
