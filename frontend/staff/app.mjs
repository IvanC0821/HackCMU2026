import {putSolutionCrop, validCropRect} from './solution-crops.mjs';
import {renderRubricPDFs, attachCropDrawing, openRubricPDF, releaseRubricPDFs} from './rubric-pdf.mjs';
import {attachHintReview} from '../connected/hints.mjs';
import {newWorkspace, STAFF_SCHEMA, activeRubric, validateDraft, loadSampleRubric, publishDraft, addQuestion, addCriterion, seedClass, addSampleRevision, updateOutcome, markSkimmed, completeReview, reopenReview, prepareCurrentReviews, draftAnnouncement, parsePageList, record, touch} from './model.mjs';
import {renderWorkspace, routeFrom, escapeHTML} from './view.mjs';
import {openStore} from './storage.mjs';
import {connected, openRemoteStore, addSignOut, json} from '../connected/client.mjs';
import {apiRequest, generateApiDraft} from './api.mjs';
import {generateConnectedDraft} from '../connected/rubrics.mjs';
import {caseWork, loadCase, assessCase, submitCaseFinal, reopenCaseSubmission, appealCase} from './case.mjs';

let state = newWorkspace(), store = null, persistedRevision = 0, saveChain = Promise.resolve(), blocked = false, controller;
const appRoot = document.querySelector('#app'), dialog = document.querySelector('#staff-dialog');
const ui = {route: routeFrom(location.hash), editQ: 0, insightQ: 'q1', reviewQ: 'q1', sid: '', attempt: '', doc: 'student', page: 0,
  search: '', filter: 'all', docURLs: {}, error: '', message: '', storageStatus: 'Opening local workspace…', storageError: '',
  busy: false, apiOpen: false, apiOrigin: 'http://localhost:8000', apiCourse: '', apiToken: '', apiProgress: '', consent: false,
  setupDoc: 'solution', setupPage: 1, setupZoom: 1, setupTab: 'rubric', pdfCounts: {}, cropSelection: null, disclosures: {}, selectedDeductions: new Set(),
  caseVariant: 'incomplete', caseJSON: JSON.stringify(caseWork.incomplete, null, 2), initializing: true};
let channel, renderCycle = 0;
try { channel = new BroadcastChannel('verity-staff-mvp'); } catch { /* Optional same-origin cross-tab notification. */ }
function setDocURLs() {
  const docs = [state.documents, ...state.versions.map(v => v.documents)].flatMap(d => [d.blank, d.solution, ...d.examples]).concat(state.submissions.flatMap(s => s.attempts.map(a => a.pdf))).filter(Boolean);
  for (const doc of docs) if (!ui.docURLs[doc.id] || (connected && doc.blob && !ui.docURLs[doc.id].startsWith('blob:'))) ui.docURLs[doc.id] = doc.sample ? doc.path : doc.blob ? URL.createObjectURL(doc.blob) : '';
}
function render(focus = false) {
  renderCycle++;
  setDocURLs(); ui.sid = decodeURIComponent(location.hash.split('/review/')[1] || '');
  document.title = `Verity · ${ui.route === 'home' ? 'Homeworks' : state.title}`;
  appRoot.innerHTML = renderWorkspace(state, ui);
  if (connected) {
    const copy = new Map([
      ['Start with one homework. Your standards, PDFs, and reviews are saved in this browser.', 'Your standards, PDFs and student revisions are saved to the shared course.'],
      ['PDFs stay in this browser unless you explicitly send them to the connected API.', 'References are saved privately to your course. Only the published blank assignment is visible to students.'],
      ['This local MVP does not publish real grades. Student uploads and live grading integration come next.', 'Student PDFs arrive here automatically. Saved decisions update student feedback and the live chart. Dataset AI assessments are provisional; other new uploads wait for staff review.'],
    ]);
    for (const el of appRoot.querySelectorAll('.quiet-note, .privacy-note')) if (copy.has(el.textContent)) el.textContent = copy.get(el.textContent);
  }
  if (appRoot.querySelectorAll) {
    const docs = [state.documents, ...state.versions.map(v => v.documents)].flatMap(d => [d.blank, d.solution, ...d.examples]).filter(Boolean);
    void renderRubricPDFs(appRoot, docs, ui.docURLs, (id, count) => {
      ui.pdfCounts[id] = count;
      const canvas = appRoot.querySelector('.crop-surface canvas');
      if (canvas?.dataset.referencePdf === id) {
        const input = appRoot.querySelector('#setup-page'); if (input) input.max = count;
        const label = appRoot.querySelector('[data-pdf-page-count]'); if (label) label.textContent = `of ${count}`;
        const next = appRoot.querySelector('[data-action="setup-next"]'); if (next) next.disabled = ui.setupPage >= count;
      }
    });
    attachCropDrawing(appRoot, rect => {
      if (!ui.cropSelection) return;
      ui.cropSelection.rect = rect; render(); announce('Answer region selected. Save the crop or adjust its bounds.');
    });
  }
  if (connected && ui.route === 'standards') attachHintReview(appRoot, async () => { await saveChain; assertWritable(); }, async () => { state.dirty = true; touch(state); await save(); ui.message = 'Hints approved. Finalize the grading standard to release them.'; render(); });
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
  const deductionRow = event.target.closest('[data-deduction-row]');
  if (deductionRow && !ui.busy) {
    const editing = event.target.closest('input, textarea, label');
    const key = deductionRow.dataset.deductionRow;
    if (!editing && ui.selectedDeductions.has(key)) ui.selectedDeductions.delete(key);
    else ui.selectedDeductions.add(key);
    for (const row of appRoot.querySelectorAll('[data-deduction-row]')) {
      const selected = ui.selectedDeductions.has(row.dataset.deductionRow);
      row.classList.toggle('is-selected', selected);
      const marker = row.querySelector('.deduction-marker');
      marker.setAttribute('aria-pressed', String(selected));
      marker.textContent = selected ? '✓' : marker.dataset.rowNumber;
    }
    // Choosing an authoring row only changes editing focus, never student scores.
    return;
  }
  const jump = event.target.closest('[data-jump]');
  if (jump) { event.preventDefault(); document.getElementById(jump.dataset.jump)?.scrollIntoView({behavior: 'auto', block: 'center'}); return; }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'close-dialog') { dialog.close(); return; }
  if (action === 'cancel-api') { controller?.abort(); ui.apiProgress = 'Stopped waiting. A server job may still be running; check its ID before retrying.'; return; }
  if (ui.busy) return;
  ui.error = ''; ui.message = '';
  try {
    const navigation = ['start-crop', 'edit-crop', 'setup-tab', 'setup-prev', 'setup-next', 'setup-zoom-in', 'setup-zoom-out', 'cancel-crop', 'pdf', 'edit-question', 'review-question', 'insight', 'previous-page', 'next-page', 'copy', 'test-api'];
    if (!navigation.includes(action)) assertWritable();
    if (connected && ['reset','confirm-reset','seed','cohort','recheck'].includes(action)) throw Error('This shared classroom preserves student records. Use a separate demo workspace for reset or bulk sample replacement.');
    if (ui.cropSelection && ['publish','add-question','sample-rubric','edit-question','remove-file'].includes(action)) throw Error('Save or cancel the selected answer crop first.');
    if (action === 'setup-tab') ui.setupTab = button.dataset.tab;
    if (action === 'setup-prev') ui.setupPage = Math.max(1, ui.setupPage - 1);
    if (action === 'setup-next') {
      const doc = ui.setupDoc === 'solution' ? state.documents.solution : ui.setupDoc === 'blank' ? state.documents.blank : state.documents.examples[Number(ui.setupDoc.split('-')[1])];
      ui.setupPage = Math.min(ui.setupPage + 1, ui.pdfCounts[doc?.id] || doc?.pageCount || 1);
    }
    if (action === 'setup-zoom-in') ui.setupZoom = Math.min(2, Math.round((ui.setupZoom + .2)*10)/10);
    if (action === 'setup-zoom-out') ui.setupZoom = Math.max(.6, Math.round((ui.setupZoom - .2)*10)/10);
    if (action === 'start-crop' || action === 'edit-crop') {
      const q = state.draft[ui.editQ]; if (!q || !state.documents.solution) throw Error('Add a question and attach the solution PDF first.');
      const crop = action === 'edit-crop' ? q.solutionCrops?.find(c => c.id === button.dataset.cropId) : null;
      ui.setupDoc = 'solution'; ui.setupTab = 'rubric';
      const count = ui.pdfCounts[state.documents.solution.id] || state.documents.solution.pageCount || 1;
      ui.setupPage = crop ? Math.min(crop.page,count) : Math.min(ui.setupPage,count);
      ui.cropSelection = crop ? structuredClone(crop) : {rect: [.1,.15,.8,.25], label: `Question ${ui.editQ + 1} answer`};
    }
    if (action === 'cancel-crop') ui.cropSelection = null;
    if (action === 'remove-crop') {
      state.draft[ui.editQ].solutionCrops = (state.draft[ui.editQ].solutionCrops || []).filter(c => c.id !== button.dataset.cropId);
      ui.cropSelection = null; state.dirty = true; touch(state);
    }
    if (action === 'pdf') { showPDF(button.dataset.kind, Number(button.dataset.index)); return; }
    if (action === 'sample-rubric') { ui.setupDoc = 'solution'; ui.setupPage = 1; loadCase(state); ui.editQ = 0; ui.message = 'Demo references loaded. Review the 10-point standard, then finalize it.'; }
    if (action === 'case-variant') { ui.caseVariant = button.dataset.variant; ui.caseJSON = JSON.stringify(caseWork[ui.caseVariant], null, 2); }
    if (action === 'check-case') { assessCase(state, JSON.parse(ui.caseJSON), ui.caseVariant === 'edited' ? 'Edited work' : `${ui.caseVariant} work`); ui.message = 'Check complete. Review the feedback before submitting.'; }
    if (action === 'submit-case') {
      const checkedWork = state.caseChecks?.at(-1)?.attempt.questions.q1.structured;
      if (!checkedWork || JSON.stringify(checkedWork) !== JSON.stringify(JSON.parse(ui.caseJSON))) throw new Error('Check this edited version before submitting it.');
      submitCaseFinal(state); ui.message = 'Final demo version submitted. Your TA can now complete the review.';
    }
    if (action === 'reopen-case') { reopenCaseSubmission(state); ui.message = 'Demo submission reopened for another rehearsal. Earlier work is preserved.'; }
    if (action === 'publish') { const errors = validateDraft(state); if (errors.length) throw Error(errors.join(' ')); if (connected) { await saveChain; assertWritable(); const bank = await json('/hint-bank'); if (!['approved', 'published'].includes(bank.status)) throw Error('Review and approve the assignment hints before finalizing.'); } for (const q of state.draft) if ((q.solutionCrops || []).some(c => c.documentId !== state.documents.solution?.id || c.page > state.documents.solution?.pageCount)) ui.disclosures[`refs-${q.id}`] = true; const version = publishDraft(state); version.title = state.title; ui.message = connected ? `Standard v${version.id} published to students.` : `Standard v${version.id} finalized locally. Existing reviews keep their original standard.`; location.hash = '#/homework/1'; }
    if (action === 'add-question') { addQuestion(state); ui.editQ = state.draft.length - 1; ui.setupTab = 'rubric'; const q = state.draft[ui.editQ]; q.assignmentPages = [1]; q.solutionPages = [ui.setupDoc === 'solution' ? ui.setupPage : 1]; }
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
      releaseRubricPDFs(); ui.docURLs = {}; ui.editQ = 0; ui.attempt = ''; dialog.close(); location.hash = '#/'; ui.message = 'Local preview data cleared. This cannot be undone; server data was not changed.';
    }
    if (action === 'test-api') {
      ui.busy = true; ui.apiOpen = true; render();
      try { await apiRequest({origin: ui.apiOrigin, token: ui.apiToken}, '/api/v1/me', {signal: AbortSignal.timeout(15000)}); ui.message = 'API token accepted. Drafting still requires instructor permissions and an AI-enabled worker.'; }
      finally { ui.busy = false; }
    }
    if (!navigation.includes(action)) {
      render(); const shownCycle = renderCycle;
      if (action === 'add-question') document.querySelector(`[data-edit="question"][data-q="${ui.editQ}"][data-field="prompt"]`)?.focus();
      if (action === 'add-criterion') document.querySelector(`[data-edit="criterion"][data-q="${button.dataset.q}"][data-c="${state.draft[Number(button.dataset.q)].criteria.length-1}"][data-field="label"]`)?.focus();
      await save();
      if (shownCycle !== renderCycle || document.activeElement?.matches('input, textarea, select')) return;
    }
  } catch (error) { ui.error = error.message; }
  render(); announce(ui.error || ui.message); focusAgain(button);
});
document.addEventListener('input', event => {
  const input = event.target;
  if (ui.cropSelection && input.dataset.cropBound !== undefined) {
    ui.cropSelection.rect[Number(input.dataset.cropBound)] = Number(input.value)/100;
    const rect = ui.cropSelection.rect, overlay = document.querySelector('.crop-selection');
    if (overlay && validCropRect(rect)) overlay.style.cssText = `left:${rect[0]*100}%;top:${rect[1]*100}%;width:${rect[2]*100}%;height:${rect[3]*100}%`;
    return;
  }
  if (ui.cropSelection && input.name === 'label') { ui.cropSelection.label = input.value; return; }
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
    if (input.dataset.cropBound !== undefined || (ui.cropSelection && input.name === 'label')) return;
    if (['setup-document', 'setup-question'].includes(input.id) && ui.cropSelection) throw Error('Save or cancel the selected answer crop first.');
    if (input.id === 'setup-document') { ui.setupDoc = input.value; ui.setupPage = 1; render(); return; }
    if (input.id === 'setup-question') {
      ui.editQ = Number(input.value); ui.setupPage = state.draft[ui.editQ]?.[ui.setupDoc === 'blank' ? 'assignmentPages' : 'solutionPages']?.[0] || 1;
      render(); return;
    }
    if (input.id === 'setup-page') {
      if (!Number.isInteger(Number(input.value)) || Number(input.value)<1 || Number(input.value)>Number(input.max)) throw Error('Choose a page within this PDF.');
      ui.setupPage = Number(input.value); render(); return;
    }
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
      else {
        // A brief description is sufficient unless staff provide separate guidance.
        if (input.dataset.edit === 'question' && field === 'prompt' && (!q.expected || q.expected === q.prompt)) q.expected = input.value;
        target[field] = ['assignmentPages', 'solutionPages'].includes(field) ? parsePageList(input.value) : input.value;
      }
      state.dirty = true; touch(state);
    }
    if (input.dataset.file) {
      if (ui.cropSelection) throw Error('Save or cancel the selected crop before replacing a PDF.');
      const files = [...input.files]; if (!files.length) return;
      if (input.dataset.file === 'examples' && state.documents.examples.length + files.length > 28) throw new Error('Use up to 28 graded examples or guideline PDFs, plus the assignment and solution.');
      for (const file of files) await checkPdf(file);
      ui.busy = true; render();
      const docs = files.map(file => ({id: crypto.randomUUID(), name: file.name, blob: file, sample: false}));
      try { for (const doc of docs) doc.pageCount = (await openRubricPDF(doc)).numPages; }
      catch { throw Error('This PDF could not be opened. Choose a valid, unlocked PDF.'); }
      finally { ui.busy = false; }
      ui.setupDoc = input.dataset.file === 'examples' ? `example-${state.documents.examples.length}` : input.dataset.file; ui.setupPage = 1;
      if (input.dataset.file === 'examples') state.documents.examples.push(...docs); else state.documents[input.dataset.file] = docs[0];
      state.source = 'manual'; state.dirty = true; record(state, 'References attached locally', docs.map(d => d.name).join(', '));
      ui.message = input.dataset.file === 'solution' && state.draft.some(q => q.solutionCrops?.length) ? 'Solution replaced. Review and remap your answer excerpts before finalizing.' : 'PDF attached. Select a question and crop its answer from the solution.';
    }
    await save();
    if (input.dataset.edit || input.id === 'instructions' || input.id === 'announcement-draft') {
      const total = document.querySelector('[data-question-total]'); if (total) total.textContent = `${state.draft[ui.editQ].criteria.reduce((n,c) => n + c.max, 0)}`;
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
  if (!form.matches('.decision-form, #reopen-form, #api-form, #case-appeal, #crop-selection-form')) return;
  event.preventDefault(); ui.error = ''; ui.message = '';
  try {
    assertWritable();
    if (form.id === 'crop-selection-form') {
      if (!ui.cropSelection) return;
      const doc = state.documents.solution;
      putSolutionCrop(state.draft[ui.editQ], {...doc, pageCount: ui.pdfCounts[doc.id] || doc.pageCount}, {
        id: ui.cropSelection.id, page: ui.setupPage, label: form.elements.label.value,
        rect: [0,1,2,3].map(i => Number(form.elements[`bound${i}`].value)/100),
      });
      ui.cropSelection = null; state.dirty = true; touch(state); ui.message = 'Answer crop saved.';
    }
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
      await saveChain;
      const snapshot = structuredClone(state); render();
      try {
        const progress = progress => {
          ui.apiProgress = progress; const el = document.querySelector('.api-progress'); if (el) el.textContent = progress;
        };
        const result = connected ? await generateConnectedDraft(snapshot, progress, controller.signal)
          : await generateApiDraft({origin: ui.apiOrigin, courseId: ui.apiCourse, token: ui.apiToken}, snapshot, progress, controller.signal);
        if (state.revision !== snapshot.revision) throw new Error('The local draft changed while the API was working. Its result was not applied.');
        state.draft = result.questions; state.source = 'api'; state.dirty = true;
        state.remoteDraft = {assignmentId: result.assignmentId, rubricId: result.rubricId, spec: result.spec};
        if (result.spec.standards?.length) state.instructions += '\n\nAI-proposed grading policies (review before finalizing):\n' + result.spec.standards.join('\n\n');
        record(state, 'AI draft imported', `API assignment ${result.assignmentId}; rubric ${result.rubricId}. Not published remotely.`);
        ui.message = 'AI draft ready for review. Check each requirement, deduction, source page, and proposed grading policy before finalizing. Published grades are unchanged.';
      } finally { ui.busy = false; }
    }
    await save();
  } catch (error) { ui.error = error.name === 'AbortError' ? 'Stopped waiting. Existing API work was not deleted.' : error.message; }
  render(); announce(ui.error || ui.message);
});
document.addEventListener('toggle', event => {
  const key = event.target.dataset?.disclosure;
  if (key && event.target.isConnected) ui.disclosures[key] = event.target.open;
}, true);
document.addEventListener('keydown', event => {
  const tab = event.target.closest?.('[role="tab"][data-tab]');
  if (tab && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault(); ui.setupTab = event.key === 'Home' ? 'rubric' : event.key === 'End' ? 'references' : ui.setupTab === 'rubric' ? 'references' : 'rubric';
    render(); document.querySelector(`#studio-tab-${ui.setupTab}`)?.focus();
  }
  if (event.key === 'Escape' && ui.cropSelection) { ui.cropSelection = null; render(); }
});
window.addEventListener('hashchange', () => { ui.cropSelection = null; ui.route = routeFrom(location.hash); ui.attempt = ''; ui.page = 0; ui.error = ''; render(true); });
dialog.addEventListener('close', () => { document.querySelector('#staff-dialog-body').innerHTML = ''; });
let refreshing = false;
async function refreshWorkspace() {
  if (!store || blocked || refreshing || ui.busy || ui.cropSelection || state.revision !== persistedRevision || document.activeElement?.matches('input, textarea, select')) return;
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

let rubricResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(rubricResizeTimer);
  rubricResizeTimer = setTimeout(() => {
    if (!appRoot.querySelectorAll || !['standards','review'].includes(ui.route)) return;
    const docs = [state.documents, ...state.versions.map(v => v.documents)].flatMap(d => [d.blank, d.solution, ...d.examples]).filter(Boolean);
    void renderRubricPDFs(appRoot, docs, ui.docURLs);
  }, 150);
});
