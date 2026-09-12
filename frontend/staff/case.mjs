import {checkRowWork} from './row-check.mjs';
import {activeRubric, clone, record, total, scoreAttempt, latestFor} from './model.mjs';
export const caseStart = [[2, 1, 5], [1, -1, 1]];
export const caseWork = {
  incomplete: {matrices: [caseStart, [[1, 0, 2], [0, 1, 1]]], operations: [null], solution: [2, 1]},
  corrected: {matrices: [caseStart, [[1, -1, 1], [2, 1, 5]], [[1, -1, 1], [0, 3, 3]], [[1, -1, 1], [0, 1, 1]], [[1, 0, 2], [0, 1, 1]]],
    operations: [{type: 'swap', target: 0, source: 1}, {type: 'add', target: 1, source: 0, factor: -2}, {type: 'scale', target: 1, factor: '1/3'}, {type: 'add', target: 0, source: 1, factor: 1}], solution: [2, 1]},
  alternative: {matrices: [caseStart, [[1, '1/2', '5/2'], [1, -1, 1]], [[1, '1/2', '5/2'], [0, '-3/2', '-3/2']], [[1, '1/2', '5/2'], [0, 1, 1]], [[1, 0, 2], [0, 1, 1]]],
    operations: [{type: 'scale', target: 0, factor: '1/2'}, {type: 'add', target: 1, source: 0, factor: -1}, {type: 'scale', target: 1, factor: '-2/3'}, {type: 'add', target: 0, source: 1, factor: '-1/2'}], solution: [2, 1]},
};
export const caseQuestion = {id: 'q1', title: 'Solving a linear system', prompt: 'Solve 2x + y = 5 and x − y = 1 using row reduction. Show the intermediate operations.', assignmentPages: [1], solutionPages: [1], owner: 'TA 1',
  expected: 'Start with the augmented matrix, show valid intermediate row operations, and state the final values of x and y.',
  alternatives: 'Accept any valid sequence of elementary row operations. Equivalent final-answer notation is accepted.',
  criteria: [{id: 'row-work', label: 'Show valid intermediate row operations', category: 'Missing work', max: 8, bands: [
    {id: 'full', label: 'Complete and valid row reduction', points: 8}, {id: 'partial', label: 'Correct reduced form, intermediate work missing', points: 6}, {id: 'missing', label: 'Incomplete or incorrect reduction', points: 0}]},
    {id: 'answer', label: 'State values satisfying the original equations', category: 'Arithmetic', max: 2, bands: [{id: 'full', label: 'Correct values', points: 2}, {id: 'missing', label: 'Incorrect final values', points: 0}]}]};
export function loadCase(s) {
  if (s.versions.length || s.submissions.length) throw new Error('A workspace already exists. Clear it explicitly before loading a different demo.');
  s.draft = [clone(caseQuestion)]; s.source = 'row-case'; s.caseSignature = JSON.stringify(s.draft); s.caseInstructions = s.instructions; s.dirty = true;
  s.documents = {blank: {id: 'case-blank', name: 'Row reduction questions.pdf', sample: true, pageCount: 1, path: './output/pdf/row-case/questions.pdf'},
    solution: {id: 'case-solution', name: 'Professor solution.pdf', sample: true, pageCount: 1, path: './output/pdf/row-case/solution.pdf'},
    examples: [{id: 'case-example', name: 'Past graded example.pdf', sample: true, pageCount: 1, path: './output/pdf/row-case/past-graded.pdf'}]};
  record(s, 'Demo reference standard loaded', 'One fictional row-reduction question. Review the editable rubric before finalizing.');
}
export function operationLabel(op) {
  if (!op) return 'Intermediate operations not supplied';
  if (op.type === 'swap') return `R${op.target + 1} ↔ R${op.source + 1}`;
  if (op.type === 'scale') return `R${op.target + 1} ← (${op.factor}) R${op.target + 1}`;
  return `R${op.target + 1} ← R${op.target + 1} + (${op.factor}) R${op.source + 1}`;
}
export function workText(work) {
  return work.matrices.map((m, i) => `${i ? operationLabel(work.operations[i - 1]) + '\n' : 'Starting matrix\n'}${m.map(row => `[ ${row.slice(0, -1).join('   ')}  |  ${row.at(-1)} ]`).join('\n')}`).join('\n\n') + `\n\nx = ${work.solution[0]}, y = ${work.solution[1]}`;
}
export function assessCase(s, work, name = 'Edited work') {
  const rubric = activeRubric(s);
  if (!rubric?.caseCompatible || s.dirty) throw new Error('Finalize the unchanged demo standard before using the row checker. Custom standards require manual review.');
  const existing = s.submissions.find(st => st.id === 'case-student');
  if (existing && latestFor(existing, rubric.id)?.final) throw new Error('The demo submission is final. Reopen the student submission before checking another revision.');
  const started = performance.now(), checked = checkRowWork(work, caseStart);
  const results = {
    'row-work': {band: checked.complete ? 'full' : checked.operationsValid && checked.reduced ? 'partial' : 'missing', evidence: checked.issues.map(i => i.detail).join(' ') || `All ${checked.checkedTransitions} declared operations match their resulting matrices.`, hint: checked.flags.find(f => f.criterion === 'row-work')?.text || '', step: checked.flags[0]?.step ?? null},
    answer: {band: checked.answerCorrect ? 'full' : 'missing', evidence: checked.answerCorrect ? 'The stated values satisfy both original equations.' : 'The stated values do not satisfy both original equations.', hint: checked.flags.find(f => f.criterion === 'answer')?.text || ''},
  };
  for (const r of Object.values(results)) Object.assign(r, {proposed: r.band, reason: '', unclear: false, dispute: null});
  const attempt = {id: `case-${s.revision}-${Date.now()}`, revision: (s.caseChecks?.length || 0) + 1, version: rubric.id, source: 'row-checker', final: false, reviewedAt: null, at: new Date().toISOString(),
    label: name, elapsedMs: Math.max(0.01, Math.round((performance.now() - started) * 100) / 100), questions: {q1: {results, skimmed: false, pages: [1], work: workText(work), structured: clone(work)}}};
  (s.caseChecks ||= []).push({attempt: clone(attempt), flags: checked.flags});
  let student = s.submissions.find(st => st.id === 'case-student');
  if (!student) { student = {id: 'case-student', name: 'Demo student', attempts: []}; s.submissions.push(student); }
  student.attempts.push(attempt); s.demoLoaded = true;
  record(s, 'Work checked', `${name}: ${scoreAttempt(rubric, attempt)}/${total(rubric.questions[0])}. Narrow matrix checker; no OCR or GPT call.`);
  return {attempt, flags: checked.flags};
}
export function submitCaseFinal(s) {
  const a = latestFor(s.submissions.find(st => st.id === 'case-student') || {attempts: []}, activeRubric(s)?.id);
  if (!a) throw new Error('Check the work before submitting it.');
  if (s.dirty) throw new Error('The rubric has pending changes. Finalize the standard first.');
  a.final = true; record(s, 'Demo submission finalized', `Attempt ${a.revision} is now ready for the TA skim.`);
}
export function reopenCaseSubmission(s) {
  const st = s.submissions.find(st => st.id === 'case-student'), a = st && latestFor(st, activeRubric(s)?.id);
  if (!a?.final) throw new Error('There is no final demo submission to reopen.');
  const next = clone(a); next.id += `-draft-${s.revision}`; next.final = false; next.reviewedAt = null;
  for (const q of Object.values(next.questions)) q.skimmed = false;
  st.attempts.push(next); record(s, 'Demo submission reopened', 'Explicit rehearsal action; previous final snapshot preserved.');
}
export function appealCase(s, message) {
  if (!message?.trim()) throw new Error('Write a short explanation for the TA.');
  const st = s.submissions.find(st => st.id === 'case-student'), a = st && latestFor(st, activeRubric(s)?.id);
  if (!a || a.reviewedAt) throw new Error('A staff member must reopen a completed review before changing it.');
  const r = a.questions.q1.results['row-work']; r.dispute = {message: message.trim(), status: 'open', resolution: ''}; a.questions.q1.skimmed = false;
  record(s, 'Student dispute recorded', 'Demo student asked the TA to review the row-work judgment.');
}
