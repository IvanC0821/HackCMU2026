export const fixtureRoot = './output/pdf/homework-1/';
export const demoQuestions = [
  {id: 'q1', title: 'Linear systems', prompt: 'Solve 2x + y = 5 and x − y = 1 using row reduction. Show each row operation and give the solution as a column vector.', max: 10,
    assignmentPages: [1], solutionPages: [1], form: 'Row reduction', expectedWork: 'An augmented matrix, intermediate matrices with labeled elementary row operations, and a final solution column vector.',
    rules: [
      {id: 'row-labels', text: 'Show and label each row operation', points: 2, category: 'Work shown', check: 'row-labels'},
      {id: 'column-vector', text: 'Write the final answer as a column vector', points: 1, category: 'Notation', check: 'column-vector'},
    ]},
  {id: 'q2', title: 'Proof by induction', prompt: 'Prove that 1 + 3 + ··· + (2n − 1) = n² for every integer n ≥ 1.', max: 10,
    assignmentPages: [2], solutionPages: [2], form: 'Proof', expectedWork: 'A base case, an inductive hypothesis for arbitrary k ≥ 1, the k + 1 step, and a conclusion covering every integer n ≥ 1.',
    rules: [
      {id: 'hypothesis', text: 'State the hypothesis for an arbitrary integer k ≥ 1', points: 2, category: 'Proof structure', check: 'hypothesis'},
      {id: 'conclusion', text: 'Conclude that the statement holds for every integer n ≥ 1', points: 1, category: 'Proof structure', check: 'conclusion'},
    ]},
];
export const demoFindings = {
  'row-labels': {decision: 'deduct', evidence: 'The submitted matrices jump directly to the reduced form without showing or labeling row operations.', hint: 'Show the row operations that connect your matrices.'},
  'column-vector': {decision: 'deduct', evidence: 'The answer is written as “x = 2, y = 1”. Both values are correct, but the required column-vector form is missing.', hint: 'Check the requested form of your final answer.'},
  hypothesis: {decision: 'keep', evidence: 'The student explicitly assumes the claim for an arbitrary integer k ≥ 1.', hint: ''},
  conclusion: {decision: 'deduct', evidence: 'The proof ends at (k + 1)² without the requested concluding sentence covering every integer n ≥ 1.', hint: 'Make the scope of your conclusion explicit.'},
};
export function createInstructorState() {
  return {role: 'professor', questions: structuredClone(demoQuestions), documents: {questions: null, solution: null, examples: []},
    notes: 'Accept mathematically correct work. Apply the explicit presentation requirements below; do not deduct twice for the same mistake.',
    dirty: true, version: 0, saved: null, assessment: null, history: [], nextRule: 1,
    submission: {id: 'demo-student', questionPages: {q1: [1], q2: [2]}, pageCount: 2}};
}
export function loadDemoMaterials(state) {
  if (state.role !== 'professor') throw new Error('Only the professor can change grading standards.');
  state.documents = {questions: {name: 'questions.pdf', url: fixtureRoot + 'questions.pdf', demo: true, pageCount: 2},
    solution: {name: 'instructor-solution.pdf', url: fixtureRoot + 'instructor-solution.pdf', demo: true, pageCount: 2},
    examples: [{name: 'past-graded.pdf', url: fixtureRoot + 'past-graded.pdf', demo: true, pageCount: 2}]};
  invalidateStandards(state);
}
export function invalidateStandards(state) { state.dirty = true; state.assessment = null; }
export function validateStandards(state) {
  const errors = [];
  if (!state.documents.questions) errors.push('Add the blank assignment PDF.');
  if (!state.documents.solution) errors.push('Add the instructor solution PDF.');
  for (const [index, q] of state.questions.entries()) {
    if (!q.title.trim() || !q.prompt.trim()) errors.push(`Question ${index + 1} needs a title and prompt.`);
    if (!q.form.trim() || !q.expectedWork.trim()) errors.push(`Question ${index + 1} needs a response type and expected work.`);
    for (const [field, doc] of [['assignmentPages', state.documents.questions], ['solutionPages', state.documents.solution]]) {
      if (!Array.isArray(q[field]) || !q[field].length || q[field].some(p => !Number.isInteger(p) || p < 1 || (doc?.pageCount && p > doc.pageCount))) errors.push(`Question ${index + 1} needs valid ${field === 'assignmentPages' ? 'assignment' : 'solution'} page numbers.`);
    }
    if (!Number.isFinite(q.max) || q.max <= 0 || q.max > 1000) errors.push(`Question ${index + 1} needs a valid point total.`);
    let deductions = 0;
    for (const r of q.rules) {
      if (!r.text.trim()) errors.push(`Question ${index + 1} has an empty deduction rule.`);
      if (!Number.isFinite(r.points) || r.points <= 0 || Math.abs(Math.round(r.points * 100) - r.points * 100) > 1e-7) errors.push('Deductions must be positive, with at most two decimal places.');
      deductions += Math.round(r.points * 100);
    }
    if (deductions > Math.round(q.max * 100)) errors.push(`Question ${index + 1} deductions exceed its point total.`);
  }
  return errors;
}
export function saveStandards(state) {
  if (state.role !== 'professor') throw new Error('Only the professor can save grading standards.');
  const errors = validateStandards(state);
  if (errors.length) throw new Error(errors.join(' '));
  state.version++;
  state.saved = {version: state.version, questions: structuredClone(state.questions), notes: state.notes};
  state.dirty = false;
  state.assessment = null;
}
export function runDemoCheck(state) {
  if (state.dirty || !state.saved) throw new Error('Save the grading standards before running a check.');
  for (const q of state.saved.questions) {
    const pages = state.submission.questionPages[q.id];
    if (!pages?.length || pages.some(p => !Number.isInteger(p) || p < 1 || p > state.submission.pageCount)) throw new Error(`No valid student pages are assigned to ${q.title}. This sample submission covers Questions 1 and 2.`);
  }
  const customReferences = [state.documents.questions, state.documents.solution, ...state.documents.examples].some(d => !d.demo);
  const results = {};
  for (const q of state.saved.questions) for (const r of q.rules) {
    const original = demoQuestions.find(d => d.id === q.id);
    const samePages = original && JSON.stringify(q.assignmentPages) === JSON.stringify(original.assignmentPages) && JSON.stringify(q.solutionPages) === JSON.stringify(original.solutionPages);
    const sameSubmissionPages = JSON.stringify(state.submission.questionPages[q.id]) === JSON.stringify(original?.assignmentPages);
    const fixture = !customReferences && samePages && sameSubmissionPages && r.check && demoFindings[r.check];
    results[r.id] = fixture ? {...fixture, source: 'scripted'} : {decision: 'unreviewed', source: 'manual',
      evidence: 'This rule or reference was changed. Review the submission against your standard manually.', hint: ''};
  }
  state.assessment = {version: state.version, results, finalized: false};
  return state.assessment;
}
export function reviewDecision(state, id, decision) {
  if (!['deduct', 'keep', 'unreviewed'].includes(decision)) throw new Error('Unknown review decision.');
  if (!state.assessment || state.assessment.finalized || state.dirty) throw new Error('Start a new check before editing the review.');
  if (!state.assessment.results[id]) throw new Error('Unknown deduction rule.');
  state.assessment.results[id].decision = decision;
}
export function assessmentScore(state) {
  if (!state.assessment || !state.saved || state.dirty || state.assessment.version !== state.saved.version) return null;
  const questions = state.saved.questions.map(q => {
    const pending = q.rules.some(r => !['deduct', 'keep'].includes(state.assessment.results[r.id]?.decision));
    const deduction = q.rules.reduce((sum, r) => sum + (state.assessment.results[r.id]?.decision === 'deduct' ? Math.round(r.points * 100) : 0), 0) / 100;
    return {id: q.id, max: q.max, score: Math.max(0, Math.round((q.max - deduction) * 100) / 100), pending};
  });
  return {questions, max: questions.reduce((n, q) => n + q.max, 0), score: Math.round(questions.reduce((n, q) => n + q.score, 0) * 100) / 100, pending: questions.some(q => q.pending)};
}
export function approveDemoGrade(state) {
  if (state.role !== 'professor') throw new Error('The professor approves the final grade. TAs can review deductions.');
  const score = assessmentScore(state);
  if (!score || score.pending) throw new Error('Review every deduction before approving the grade.');
  if (state.assessment.finalized) return score;
  state.assessment.finalized = true;
  state.history.push({version: state.version, score: structuredClone(score), results: structuredClone(state.assessment.results)});
  return score;
}
export async function validatePdf(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF file.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Each PDF must be 20 MB or smaller.');
  if (!(await file.slice(0, 1024).text()).includes('%PDF-')) throw new Error('This file does not appear to be a PDF.');
}

export function parsePages(value) {
  if (!/^\s*\d+(?:\s*,\s*\d+)*\s*$/.test(value)) return [];
  const pages = [...new Set(value.split(',').map(p => Number(p.trim())))];
  return pages.every(p => Number.isSafeInteger(p) && p > 0) ? pages : [];
}

// Student submission pages are independent from teacher reference pages.
export function pagesForQuestion(state, questionIndex, documentType) {
  const q = (state.saved && !state.dirty ? state.saved.questions : state.questions)[questionIndex];
  if (documentType === 'student-submission') return state.submission.questionPages[q.id] || [];
  if (documentType === 'questions') return q.assignmentPages;
  if (documentType === 'instructor-solution') return q.solutionPages;
  // The built-in past example has its own fixed mapping; custom examples are not mapped yet.
  return state.documents.examples[0]?.demo ? demoQuestions.find(d => d.id === q.id)?.assignmentPages || [] : [];
}
