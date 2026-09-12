import {newWorkspace, STAFF_SCHEMA, activeRubric, loadSampleRubric, publishDraft, addQuestion, addCriterion, seedClass, addSampleRevision, updateOutcome, markSkimmed, completeReview, reopenReview, prepareCurrentReviews, draftAnnouncement, parsePageList, record, touch} from './model.mjs';
import {renderWorkspace, routeFrom, escapeHTML} from './view.mjs';
import {openStore} from './storage.mjs';
import {connected, openRemoteStore, addSignOut} from '../connected/client.mjs';
import {apiRequest, generateApiDraft} from './api.mjs';
import {caseWork, loadCase, assessCase, submitCaseFinal, reopenCaseSubmission, appealCase} from './case.mjs';

let state = newWorkspace(), store = null, persistedRevision = 0, saveChain = Promise.resolve(), blocked = false, controller;
const appRoot = document.querySelector('#app'), dialog = document.querySelector('#staff-dialog');
const ui = {route: routeFrom(location.hash), editQ: 0, insightQ: 'q1', reviewQ: 'q1', sid: '', attempt: '', doc: 'student', page: 0,
  search: '', filter: 'all', docURLs: {}, error: '', message: '', storageStatus: 'Opening local workspace…', storageError: '',
  busy: false, apiOpen: false, apiOrigin: 'http://localhost:8000', apiCourse: '', apiToken: '', apiProgress: '', consent: false,
  caseVariant: 'incomplete', caseJSON: JSON.stringify(caseWork.incomplete, null, 2), initializing: true};
let channel;
try { channel = new BroadcastChannel('verity-staff-mvp'); } catch { /* Optional same-origin cross-tab notification. */ }
function setDocURLs() {
  const docs = [state.documents, ...state.versions.map(v => v.documents)].flatMap(d => [d.blank, d.solution, ...d.examples]).concat(state.submissions.flatMap(s => s.attempts.map(a => a.pdf))).filter(Boolean);
  for (const doc of docs) if (!ui.docURLs[doc.id] || (connected && doc.blob && !ui.docURLs[doc.id].startsWith('blob:'))) ui.docURLs[doc.id] = doc.sample ? doc.path : doc.blob ? URL.createObjectURL(doc.blob) : '';
}
function render(focus = false) {
  setDocURLs(); ui.sid = decodeURIComponent(location.hash.split('/review/')[1] || '');
  document.title = `Verity · ${ui.route === 'home' ? 'Homeworks' : state.title}`;
  appRoot.innerHTML = renderWorkspace(state, ui);
  if (connected) {
    const copy = new Map([
      ['Start with one homework. Your standards, PDFs, and reviews are saved in this browser.', 'Your standards, PDFs and student revisions are saved to the shared course.'],
      ['PDFs stay in this browser unless you explicitly send them to the connected API.', 'References are saved privately to your course. Only the published blank assignment is visible to students.'],
      ['This local MVP does not publish real grades. Student uploads and live grading integration come next.', 'Student PDFs arrive here automatically. Saved scoring decisions update student feedback and the live chart. AI grading is not enabled for uploads.'],
    ]);
    for (const el of appRoot.querySelectorAll('.quiet-note, .privacy-note')) if (copy.has(el.textContent)) el.textContent = copy.get(el.textContent);
  }
  if (focus) document.querySelector('#main')?.focus({preventScroll: true});
}
function announce(text) { document.querySelector('#announcement').textContent = text; }
function save() {
  const snapshot = structuredClone(state);
  if (!store || blocked) return Promise.resolve();
  ui.storageStatus = connected ? 'Saving to course…' : 'Saving locally…';
  saveChain = saveChain.then(async () => {
    if (blocked) return;
    const saved = await store.save(snapshot, persistedRevision); persistedRevision = snapshot.revision;
    if (connected && saved && state.revision === snapshot.revision) { state = saved; persistedRevision = saved.revision; }
    ui.storageStatus = connected ? 'Connected · saved to course' : 'Saved in this browser'; channel?.postMessage({revision: persistedRevision});
    const indicator = document.querySelector('.save-state'); if (indicator) indicator.textContent = ui.storageStatus;
  }).catch(error => { blocked = true; ui.storageError = `${error.message} Keep this tab open or reload to read the saved version.`; ui.storageStatus = 'Save needs attention'; render(); });
  return saveChain;
}
function assertWritable() { if (blocked) throw new Error('Local save is blocked. Reload this workspace before making more changes.'); }
function showDialog(title, body) {
  document.querySelector('#staff-dialog-title').textContent = title;
  document.querySelector('#staff-dialog-body').innerHTML = body;
  dialog.showModal();
}
function showPDF(kind, index) {
  const doc = kind === 'examples' ? state.documents.examples[index] : state.documents[kind];
  const url = doc && ui.docURLs[doc.id]; if (!url) throw new Error('This PDF is not available. Reattach it in setup.');
  showDialog(doc.name, `<iframe class="dialog-pdf" title="${escapeHTML(doc.name)}" src="${escapeHTML(url)}#toolbar=0"></iframe><a class="btn" href="${escapeHTML(url)}" target="_blank" rel="noopener">Open PDF in a separate tab</a>`);
}
async function checkPdf(file) {
  if (!file?.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF file.');
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} exceeds 20 MB.`);
  if (!(await file.slice(0, 5).text()).startsWith('%PDF-')) throw new Error(`${file.name} does not have a valid PDF header.`);
}
function focusAgain(button) {
  const q = button.dataset.q, index = button.dataset.index;
  const candidates = [...document.querySelectorAll('[data-action]')];
  candidates.find(b => b.dataset.action === button.dataset.action && b.dataset.q === q && b.dataset.index === index)?.focus({preventScroll: true});
}
document.addEventListener('click', async event => {
  if (ui.initializing) return;
  const jump = event.target.closest('[data-jump]');
  if (jump) { event.preventDefault(); document.getElementById(jump.dataset.jump)?.scrollIntoView({behavior: 'auto', block: 'center'}); return; }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'close-dialog') { dialog.close(); return; }
  if (action === 'cancel-api') { controller?.abort(); ui.apiProgress = 'Stopped waiting. A server job may still be running; check its ID before retrying.'; return; }
  if (ui.busy) return;
  ui.error = ''; ui.message = '';
  try {
    const navigation = ['pdf', 'edit-question', 'review-question', 'insight', 'previous-page', 'next-page', 'copy', 'test-api'];
    if (!navigation.includes(action)) assertWritable();
    if (connected && ['reset','confirm-reset','seed','cohort','recheck'].includes(action)) throw Error('This shared classroom preserves student records. Use a separate demo workspace for reset or bulk sample replacement.');
    if (action === 'pdf') { showPDF(button.dataset.kind, Number(button.dataset.index)); return; }
    if (action === 'sample-rubric') { loadCase(state); ui.editQ = 0; ui.message = 'Demo references loaded. Review the 10-point standard, then finalize it.'; }
    if (action === 'case-variant') { ui.caseVariant = button.dataset.variant; ui.caseJSON = JSON.stringify(caseWork[ui.caseVariant], null, 2); }
    if (action === 'check-case') { assessCase(state, JSON.parse(ui.caseJSON), ui.caseVariant === 'edited' ? 'Edited work' : `${ui.caseVariant} work`); ui.message = 'Check complete. Review the feedback before submitting.'; }
    if (action === 'submit-case') {
      const checkedWork = state.caseChecks?.at(-1)?.attempt.questions.q1.structured;
      if (!checkedWork || JSON.stringify(checkedWork) !== JSON.stringify(JSON.parse(ui.caseJSON))) throw new Error('Check this edited version before submitting it.');
      submitCaseFinal(state); ui.message = 'Final demo version submitted. Your TA can now complete the review.';
    }
    if (action === 'reopen-case') { reopenCaseSubmission(state); ui.message = 'Demo submission reopened for another rehearsal. Earlier work is preserved.'; }
    if (action === 'publish') { const version = publishDraft(state); version.title = state.title; ui.message = connected ? `Standard v${version.id} published to students.` : `Standard v${version.id} finalized locally. Existing reviews keep their original standard.`; location.hash = '#/homework/1'; }
    if (action === 'add-question') { addQuestion(state); ui.editQ = state.draft.length - 1; }
    if (action === 'add-criterion') { addCriterion(state.draft[Number(button.dataset.q)]); state.dirty = true; touch(state); }
    if (action === 'remove-criterion') { state.draft[Number(button.dataset.q)].criteria.splice(Number(button.dataset.c), 1); state.dirty = true; touch(state); }
    if (action === 'add-band') {
      const criterion = state.draft[Number(button.dataset.q)].criteria[Number(button.dataset.c)];
      criterion.bands.push({id: `outcome-${crypto.randomUUID()}`, label: 'Partial credit', points: Math.round(criterion.max * 50) / 100});
      state.dirty = true; touch(state);
    }
    if (action === 'remove-file') {
      const kind = button.dataset.kind;
      if (kind === 'examples') state.documents.examples.splice(Number(button.dataset.index), 1); else state.documents[kind] = null;
      state.dirty = true; touch(state);
    }
    if (action === 'edit-question') ui.editQ = Number(button.dataset.index);
    if (action === 'review-question') { ui.reviewQ = button.dataset.q; ui.page = 0; }
    if (action === 'insight') ui.insightQ = button.dataset.q;
    if (action === 'seed' || action === 'cohort') { seedClass(state, action === 'cohort'); ui.message = 'Fictional first-attempt work loaded. Simulate a revision to see the change.'; }
    if (action === 'revision') { addSampleRevision(state); ui.message = 'A simulated revision was added. Previous attempts are preserved; the chart reflects the latest work.'; }
    if (action === 'skim') { markSkimmed(state, ui.sid, button.dataset.q); ui.message = 'Question checked.'; }
    if (action === 'complete') { completeReview(state, ui.sid); ui.message = connected ? 'Review completed. The student can see their reviewed score and general feedback.' : 'Review completed locally. No real grade was published.'; }
    if (action === 'reopen') { showDialog('Reopen review', '<form id="reopen-form"><label>Reason<textarea name="reason" required rows="3"></textarea></label><p>The previous reviewed snapshot will be preserved.</p><button class="btn primary" type="submit">Reopen review</button></form>'); return; }
    if (action === 'recheck') { const count = prepareCurrentReviews(state); ui.message = `${count} new-version reviews prepared. All scoring outcomes need a fresh decision.`; }
    if (action === 'announcement') { state.announcement = draftAnnouncement(state); record(state, 'Reminder drafted', 'Local draft only. No announcement sent.'); }
    if (action === 'copy') {
      try { await navigator.clipboard.writeText(state.announcement); ui.message = 'Reminder copied. Nothing was sent.'; }
      catch { const field = document.querySelector('#announcement-draft'); field?.select(); throw new Error('Clipboard access is unavailable. The reminder is selected; copy it with your keyboard.'); }
    }
    if (action === 'previous-page') ui.page = Math.max(0, ui.page - 1);
    if (action === 'next-page') ui.page++;
    if (action === 'reset') { showDialog('Clear this local workspace?', '<p>This removes this preview’s saved reference PDFs, rubric versions, and reviews from this browser. Other apps and server data are unaffected.</p><div class="actions"><button class="btn" data-action="close-dialog">Cancel</button><button class="btn danger" data-action="confirm-reset">Clear workspace</button></div>'); return; }
    if (action === 'confirm-reset') {
      await saveChain; const revision = state.revision; state = newWorkspace(); state.revision = revision + 1;
      for (const url of Object.values(ui.docURLs)) if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      ui.docURLs = {}; ui.editQ = 0; ui.attempt = ''; dialog.close(); location.hash = '#/'; ui.message = 'Local preview data cleared. This cannot be undone; server data was not changed.';
    }
    if (action === 'test-api') {
      ui.busy = true; ui.apiOpen = true; render();
      try { await apiRequest({origin: ui.apiOrigin, token: ui.apiToken}, '/api/v1/me', {signal: AbortSignal.timeout(15000)}); ui.message = 'API token accepted. Drafting still requires instructor permissions and an AI-enabled worker.'; }
      finally { ui.busy = false; }
    }
    if (!navigation.includes(action)) await save();
  } catch (error) { ui.error = error.message; }
  render(); announce(ui.error || ui.message); focusAgain(button);
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'case-json') {
    ui.caseJSON = input.value; ui.caseVariant = 'edited';
    const submit = document.querySelector('[data-action="submit-case"]'); if (submit) submit.disabled = true;
    const score = document.querySelector('.case-score strong'); if (score) score.textContent = 'Check edited work';
    return;
  }
  if (input.id === 'api-token') ui.apiToken = input.value;
  if (input.id === 'api-origin') ui.apiOrigin = input.value;
  if (input.id === 'api-course') ui.apiCourse = input.value;
});
document.addEventListener('change', async event => {
  if (ui.initializing) return;
  const input = event.target; ui.error = ''; ui.message = '';
  if (ui.busy) return;
  try {
    if (input.id === 'ai-consent') { ui.consent = input.checked; return; }
    if (input.id === 'case-json') { ui.caseJSON = input.value; ui.caseVariant = 'edited'; return; }
    if (input.id === 'document-kind') { ui.doc = input.value; ui.page = 0; render(); return; }
    if (input.id === 'attempt') { ui.attempt = input.value; ui.page = 0; render(); return; }
    if (input.id === 'filter' || input.id === 'search') { ui[input.id] = input.value; render(); document.querySelector(`#${input.id}`)?.focus(); return; }
    assertWritable();
    if (input.id === 'role') { state.role = input.value; touch(state); }
    if (input.id === 'instructions') { state.instructions = input.value; state.dirty = true; touch(state); }
    if (input.id === 'announcement-draft') { state.announcement = input.value; touch(state); }
    if (input.dataset.edit) {
      const qi = Number(input.dataset.q), ci = Number(input.dataset.c), bi = Number(input.dataset.b), field = input.dataset.field, q = state.draft[qi];
      const target = input.dataset.edit === 'question' ? q : input.dataset.edit === 'criterion' ? q.criteria[ci] : q.criteria[ci].bands[bi];
      if (field === 'max') {
        const old = target.max; target.max = input.value === '' ? NaN : Number(input.value);
        target.bands.filter(b => b.points === old).forEach(b => { b.points = target.max; });
      } else if (field === 'deduction') target.points = input.value === '' ? NaN : Math.round((q.criteria[ci].max - Number(input.value)) * 100) / 100;
      else target[field] = ['assignmentPages', 'solutionPages'].includes(field) ? parsePageList(input.value) : input.value;
      state.dirty = true; touch(state);
    }
    if (input.dataset.file) {
      const files = [...input.files]; if (!files.length) return;
      if (state.documents.examples.length + (input.dataset.file === 'examples' ? files.length : 0) > 5) throw new Error('Use up to five past graded PDFs for this MVP.');
      for (const file of files) await checkPdf(file);
      const docs = files.map(file => ({id: crypto.randomUUID(), name: file.name, blob: file, sample: false}));
      if (input.dataset.file === 'examples') state.documents.examples.push(...docs); else state.documents[input.dataset.file] = docs[0];
      state.source = 'manual'; state.dirty = true; record(state, 'References attached locally', docs.map(d => d.name).join(', '));
      ui.message = 'PDF saved locally. Add or review the question definitions. Uploaded files are not automatically graded.';
    }
    await save();
    if (input.dataset.edit || input.id === 'instructions' || input.id === 'announcement-draft') {
      const publish = document.querySelector('[data-action="publish"]'); if (publish) publish.disabled = false;
      const status = document.querySelector('.setup-footer>span'); if (status) status.textContent = 'Draft changes not finalized';
      const copy = document.querySelector('[data-action="copy"]'); if (copy) copy.disabled = !state.announcement;
      return;
    }
  } catch (error) { ui.error = error.message; }
  const field = input.dataset.field, qi = input.dataset.q, ci = input.dataset.c, bi = input.dataset.b;
  render(); announce(ui.error || ui.message);
  if (input.dataset.edit) [...document.querySelectorAll('[data-edit]')].find(el => el.dataset.field === field && el.dataset.q === qi && el.dataset.c === ci && el.dataset.b === bi)?.focus({preventScroll: true});
});
document.addEventListener('submit', async event => {
  if (ui.initializing) { event.preventDefault(); return; }
  const form = event.target;
  if (!form.matches('.decision-form, #reopen-form, #api-form, #case-appeal')) return;
  event.preventDefault(); ui.error = ''; ui.message = '';
  try {
    assertWritable();
    if (form.id === 'case-appeal') { appealCase(state, form.elements.message.value); ui.message = 'Dispute added to the TA review queue. No email or external message was sent.'; }
    if (form.matches('.decision-form')) {
      updateOutcome(state, ui.sid, form.dataset.q, form.dataset.c, form.elements.band.value, form.elements.reason.value, form.elements.resolution?.value);
      ui.message = 'Decision saved. Skim the whole question before marking it checked.';
    }
    if (form.id === 'reopen-form') { reopenReview(state, ui.sid, form.elements.reason.value); ui.attempt = ''; dialog.close(); ui.message = 'Review reopened. Previous reviewed snapshot preserved.'; }
    if (form.id === 'api-form') {
      if (!ui.consent) throw new Error('Confirm the reference-upload and external-AI permission first.');
      if (ui.busy) return;
      ui.busy = true; ui.apiOpen = true; controller = new AbortController();
      const snapshot = structuredClone(state); render();
      try {
        const result = await generateApiDraft({origin: ui.apiOrigin, courseId: ui.apiCourse, token: ui.apiToken}, snapshot, progress => {
          ui.apiProgress = progress; const el = document.querySelector('.api-progress'); if (el) el.textContent = progress;
        }, controller.signal);
        if (state.revision !== snapshot.revision) throw new Error('The local draft changed while the API was working. Its result was not applied.');
        state.draft = result.questions; state.source = 'api'; state.dirty = true;
        state.remoteDraft = {assignmentId: result.assignmentId, rubricId: result.rubricId, spec: result.spec};
        record(state, 'AI draft imported', `API assignment ${result.assignmentId}; rubric ${result.rubricId}. Not published remotely.`);
        ui.message = 'AI draft imported. Review the point bands and page mappings before finalizing locally.';
      } finally { ui.busy = false; }
    }
    await save();
  } catch (error) { ui.error = error.name === 'AbortError' ? 'Stopped waiting. Existing API work was not deleted.' : error.message; }
  render(); announce(ui.error || ui.message);
});
window.addEventListener('hashchange', () => { ui.route = routeFrom(location.hash); ui.attempt = ''; ui.page = 0; ui.error = ''; render(true); });
dialog.addEventListener('close', () => { document.querySelector('#staff-dialog-body').innerHTML = ''; });
let refreshing = false;
async function refreshWorkspace() {
  if (!store || blocked || refreshing || ui.busy || state.revision !== persistedRevision || document.activeElement?.matches('input, textarea, select')) return;
  refreshing = true;
  try {
    const fresh = await store.load();
    if (fresh?.revision > state.revision) { state = fresh; persistedRevision = fresh.revision; ui.storageError = ''; ui.storageStatus = connected ? 'Connected · live updates' : 'Saved in this browser'; render(); announce('New course activity received. Chart and review queue updated.'); }
  } catch (error) { ui.storageStatus = 'Connection interrupted · retrying'; const indicator = document.querySelector('.save-state'); if (indicator) indicator.textContent = ui.storageStatus; }
  finally { refreshing = false; }
}
channel?.addEventListener('message', refreshWorkspace);
async function start() {
  render();
  try {
    store = connected ? await openRemoteStore() : await openStore(); const restored = await store.load();
    if (restored && restored.schema !== STAFF_SCHEMA) { blocked = true; throw new Error('Saved workspace uses an unsupported version. Its data has not been changed.'); }
    if (restored) {
      state = restored; persistedRevision = restored.revision;
      const work = state.caseChecks?.at(-1)?.attempt.questions.q1.structured;
      if (work) { ui.caseJSON = JSON.stringify(work, null, 2); ui.caseVariant = Object.keys(caseWork).find(k => JSON.stringify(caseWork[k]) === JSON.stringify(work)) || 'edited'; }
    }
    ui.connected = connected; ui.storageStatus = connected ? 'Connected · live updates' : 'Saved in this browser';
    if (connected) { addSignOut(); setInterval(refreshWorkspace, 1500); }
  } catch (error) { if (connected) { blocked = true; return; } ui.storageError = error.message; ui.storageStatus = 'Session only'; }
  ui.initializing = false; render();
}
start();
