import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {explainAssessment, renderAssessmentExplanation, renderReasonText} from '../../connected/review-explanation.mjs';

const screenshot = JSON.parse(readFileSync(new URL('../../../demo-data/03_graded_past_submissions/s06_Farid_Haddad/professor_grade.json', import.meta.url), 'utf8'));
// The saved grade's parts object is indexed by subpart.
const original = Object.values(screenshot).find(v => v?.['1c']?.comment)?.['1c'].comment;
const criterion = {max: 3, bands: [{id: 'two', points: 2}, {id: 'full', points: 3}]};

test('screenshot reason is concise and the saved evidence stays untouched', () => {
  assert(original?.includes('64.62'));
  const result = {band: 'two', proposed: 'two', evidence: original};
  const before = structuredClone(result);
  const note = explainAssessment(original);
  assert.equal(note.reason, 'u · w is 8, not 12.');
  assert.match(note.rule, /deducted once/);
  const html = renderAssessmentExplanation(result, criterion);
  assert.match(html, /−1 point/);
  const [preview, detail] = html.split('<details');
  assert.doesNotMatch(preview, /E8|64.62|3\/7/);
  assert.match(detail, /E8/);
  assert.match(detail, /<mfrac>/);
  assert.match(detail, /<msup>/);
  assert.deepEqual(result, before);
});

test('new compact format separates reason, check, and rule without dropping text', () => {
  const source = String.raw`Reason: Incorrect dot product.
Check: \(\mathbf{u}\cdot\mathbf{w}=8\), not \(12\).
Rule: Deduct once; later steps correctly use the student's value.`;
  const parsed = explainAssessment(source);
  assert.equal(parsed.reason, 'Incorrect dot product.');
  assert.match(parsed.check, /mathbf/);
  assert.equal(parsed.rule, "Deduct once; later steps correctly use the student's value.");
  const html = renderAssessmentExplanation({band: 'two', evidence: source}, criterion);
  assert.match(html, /deduction-check/);
  assert.match(html, /mathvariant="bold"/);
  assert.match(html, /Original explanation/);
});

test('math renders fractions, signs, indices, degrees, proof notation, and matrices', () => {
  const html = renderReasonText(String.raw`\(\cos\theta=\frac{2}{7},\quad R_2\leftarrow R_2-2R_1,\quad 73.40^\circ\). \(x\in A,\ A\subseteq B,\ \begin{bmatrix}1&-2\\3&4\end{bmatrix}\)`);
  for (const tag of ['mfrac', 'msub', 'msup', 'mtable']) assert.match(html, new RegExp(`<${tag}`));
  assert.doesNotMatch(html, /reason-math-fallback/);
  assert.match(html, /∈/); assert.match(html, /⊆/);
});

test('plain-text legacy notation and ordinary prose are preserved', () => {
  const html = renderReasonText('cos θ = 3/7; R2 → R2 - 3R1. Claim is false, not merely incomplete.');
  assert.match(html, /<mfrac>/); assert.match(html, /<msub>/);
  assert.doesNotMatch(html, /3R1/);
  assert.match(html, /Claim is false, not merely incomplete/);
  assert.equal(explainAssessment('Use x = 1.25. Missing units.').reason, 'Use x = 1.25.');
  assert.equal(explainAssessment('E8 is a variable, not a rule.').reason, 'E8 is a variable, not a rule.');
  assert.equal(explainAssessment('No arithmetic error; do not deduct once again.').rule, '');
});

test('does not claim an old explanation justifies a changed score or unresolved work', () => {
  assert.match(renderAssessmentExplanation({band: 'full', proposed: 'two', evidence: original}, criterion), /−1 point · original assessment/);
  assert.match(renderAssessmentExplanation({band: 'full', evidence: 'Correct work.'}, criterion), /Full credit/);
  assert.match(renderAssessmentExplanation({}, criterion), /Needs review/);
  assert.match(renderAssessmentExplanation({}, criterion), /No explanation provided/);
});

test('malformed math and HTML cannot break the queue or inject content', () => {
  const html = renderReasonText(String.raw`<img src=x onerror=alert(1)> \(\frac{1}{\) \(\href{javascript:alert(1)}{click}\) \(\htmlStyle{color:red}{x}\)`);
  assert.doesNotMatch(html, /<img|<script|href="javascript:|style="color:red/);
  assert.match(html, /&lt;img/);
  assert.match(html, /reason-math-fallback/);
  assert.doesNotThrow(() => renderReasonText(String.raw`\(\def\a{\a}\a\)`));
  assert.match(renderReasonText(String.raw`\(\frac{1}{2}\)`), /<mfrac>/);
});

test('offline preview bundles the real math renderer into valid JavaScript', () => {
  const frontend = new URL('../../', import.meta.url);
  execFileSync(process.execPath, ['build-preview.mjs'], {cwd: frontend});
  const html = readFileSync(new URL('preview.html', frontend), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
  assert.match(scripts[0][1], /renderAssessmentExplanation/);
});
