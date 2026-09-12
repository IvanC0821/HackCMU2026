import {json, post} from './client.mjs';

export function attachHintReview(root, ready, onApproved = async () => {}) {
  const section = document.createElement('details');
  section.className = 'assignment-hints';
  section.innerHTML = `<summary>Assignment hints</summary><p>Hints are prepared when you save assignment setup. Review them before finalizing the standard. Students receive these saved hints.</p><button type="button">Review / refresh hints</button><div role="status"></div><div class="hint-editor"></div>`;
  section.addEventListener('change', event => event.stopPropagation());
  section.addEventListener('input', event => event.stopPropagation());
  const status = section.querySelector('[role="status"]'), editor = section.querySelector('.hint-editor');
  let bank;
  const show = value => {
    bank = value;
    editor.replaceChildren();
    status.textContent = `Hints: ${bank.status}. ${bank.job ? `Generation: ${bank.job.status}${bank.job.error_code ? ` (${bank.job.error_code})` : ''}.` : 'Rubric hints and conservative templates; no AI call.'}`;
    if (bank.provenance.calibration_notes) {
      const note = document.createElement('p'); note.textContent = `Past graded examples: ${bank.provenance.calibration_notes}`; editor.append(note);
    }
    const source = document.createElement('p');
    source.textContent = `Draft source: ${bank.provenance.source}. Attached reference documents used by AI: ${bank.provenance.documents?.length || 0}.`;
    editor.append(source);
    const original = document.createElement('details'), summary = document.createElement('summary'), proposal = document.createElement('pre');
    summary.textContent = 'Original draft'; proposal.textContent = JSON.stringify(bank.original, null, 2); original.append(summary, proposal); editor.append(original);
    for (const entry of bank.entries) {
      const label = document.createElement('label');
      label.textContent = `${entry.question_id} / ${entry.criterion_id} — level ${entry.level}`;
      const input = document.createElement('textarea'); input.rows = 2; input.value = entry.text; input.dataset.hintKey = entry.key;
      label.append(input); editor.append(label);
    }
    for (const [label, action] of [
      ['Save edits', async () => show(await saveEdits())],
      ['Approve these hints', async () => { const saved = await saveEdits(); show(await post('/hint-bank:approve', {expected_version: saved.version})); await onApproved(); }],
      ['Generate / retry AI draft', async () => show(await post('/hint-bank:generate', {expected_version: bank.version}))],
    ]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.onclick = () => run(action); editor.append(button);
    }
    const note = document.createElement('p'); note.textContent = 'Generation uses attached reference PDFs, including past graded examples. AI must be enabled on the server. Approved hints become immutable when the grading standard is finalized.'; editor.append(note);
  };
  async function saveEdits() {
    const text = new Map([...editor.querySelectorAll('textarea')].map(el => [el.dataset.hintKey, el.value]));
    return json('/hint-bank', {method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({expected_version: bank.version, entries: bank.entries.map(e => ({...e, text: text.get(e.key)}))})});
  }
  async function run(action) {
    const buttons = [...section.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
    try { await ready(); await action(); }
    catch (e) { status.textContent = e.message; }
    finally { buttons.forEach(b => b.disabled = false); }
  }
  section.querySelector('button').onclick = () => run(async () => show(await json('/hint-bank')));
  (root.querySelector('#studio-panel-references') || root.querySelector('.page-content'))?.append(section);
}
