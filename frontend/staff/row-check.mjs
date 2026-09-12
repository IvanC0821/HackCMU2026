// A narrow verifier for explicitly transcribed elementary row operations.
// It does not perform OCR or infer that unseen handwritten reasoning is correct.
export function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(value.trim())) throw new Error('Use a number or a fraction such as 1/3.');
  const [a, b = '1'] = value.trim().split('/').map(Number);
  if (!b || !Number.isFinite(a / b)) throw new Error('A fraction needs a nonzero denominator.');
  return a / b;
}
export function matrixValue(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8 || !value.every(r => Array.isArray(r) && r.length === value[0].length) || value[0].length < 2 || value[0].length > 9) throw new Error('Use a rectangular augmented matrix, up to 8 rows and 9 columns.');
  const m = value.map(row => row.map(numberValue));
  if (m.flat().some(n => Math.abs(n) > 1e9)) throw new Error('Matrix values exceed this checker’s supported range.');
  return m;
}
const closeNumber = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
export function sameMatrix(a, b) { return a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((n, j) => closeNumber(n, b[i][j]))); }
export function applyOperation(matrix, operation) {
  const m = matrixValue(matrix), op = operation;
  if (!op || !['swap', 'scale', 'add'].includes(op.type)) throw new Error('Specify swap, scale, or add for a row operation.');
  if (![op.target, ...(op.type === 'scale' ? [] : [op.source])].every(i => Number.isInteger(i) && i >= 0 && i < m.length)) throw new Error('The operation refers to a row that does not exist.');
  if (op.type !== 'scale' && op.source === op.target) throw new Error('Source and target rows must be different.');
  if (op.type === 'swap') [m[op.target], m[op.source]] = [m[op.source], m[op.target]];
  else {
    const factor = numberValue(op.factor);
    if (op.type === 'scale' && factor === 0) throw new Error('Multiplication by zero is not an invertible row operation.');
    m[op.target] = m[op.target].map((n, j) => op.type === 'scale' ? n * factor : n + factor * m[op.source][j]);
  }
  return matrixValue(m);
}
export function checkRowWork(work, expectedStart) {
  const initial = matrixValue(expectedStart), matrices = work.matrices?.map(matrixValue);
  if (!matrices?.length || matrices.length > 50) throw new Error('Include between 1 and 50 matrices.');
  if (matrices.some(m => m.length !== initial.length || m[0].length !== initial[0].length)) throw new Error('Every step must use the same matrix dimensions.');
  if (!Array.isArray(work.operations) || work.operations.length > matrices.length - 1) throw new Error('Operations must correspond to consecutive matrix transitions.');
  const solution = work.solution?.map(numberValue);
  if (!solution || solution.length !== initial[0].length - 1) throw new Error('Provide one final value for each variable.');
  const issues = [];
  if (!sameMatrix(initial, matrices[0])) issues.push({kind: 'incorrect', step: 0, detail: 'The starting matrix does not match the question.'});
  for (let i = 1; i < matrices.length; i++) {
    const operation = work.operations[i - 1];
    if (!operation) { issues.push({kind: 'missing', step: i, detail: `No intermediate operation is supplied between matrices ${i} and ${i + 1}.`}); continue; }
    try { if (!sameMatrix(applyOperation(matrices[i - 1], operation), matrices[i])) issues.push({kind: 'incorrect', step: i, detail: `The declared operation does not produce matrix ${i + 1}.`}); }
    catch (error) { issues.push({kind: 'incorrect', step: i, detail: error.message}); }
  }
  const last = matrices.at(-1);
  const reduced = last.length === solution.length && last.every((row, i) => row.slice(0, -1).every((n, j) => closeNumber(n, i === j ? 1 : 0)) && closeNumber(row.at(-1), solution[i]));
  if (!reduced) issues.push({kind: 'missing', step: matrices.length - 1, detail: 'The work does not reach reduced form with the stated solution.'});
  const answerCorrect = initial.every(row => closeNumber(row.slice(0, -1).reduce((sum, n, j) => sum + n * solution[j], 0), row.at(-1)));
  return {answerCorrect, reduced, operationsValid: !issues.some(i => i.kind === 'incorrect'), complete: !issues.length, issues,
    checkedTransitions: matrices.length - 1, flags: [
      ...(issues.length ? [{criterion: 'row-work', category: issues.some(i => i.kind === 'incorrect') ? 'Possible arithmetic error' : 'Possible missing work', text: issues.some(i => i.kind === 'incorrect') ? 'Double-check the calculation between these matrices.' : 'Double-check the steps connecting these matrices.', step: issues[0].step}] : []),
      ...(!answerCorrect ? [{criterion: 'answer', category: 'Possible answer error', text: 'Double-check your final values against the original equations.', step: matrices.length - 1}] : [])]};
}
