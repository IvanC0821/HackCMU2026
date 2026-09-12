import {fixtureRoot, createInstructorState, loadDemoMaterials, invalidateStandards, saveStandards, runDemoCheck, reviewDecision, assessmentScore, approveDemoGrade, validatePdf, parsePages, pagesForQuestion} from './instructor-model.mjs';

const staffState = createInstructorState();
const ui = {question: 0, document: 'student-submission', documentPage: 0, zoom: 1, message: '', error: '', collapse: false, uploadBusy: false};
const root = document.querySelector('#app');
const pdfDialog = document.querySelector('#pdf-dialog');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const svgPaths = {
  mark: '<path d="m4 12 5 5L20 5"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h6"/>', right: '<path d="m9 5 7 7-7 7"/>', left: '<path d="m15 5-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="m5 12 4 4L19 6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  flag: '<path d="M5 22V3h14l-3 5 3 5H5"/>', book: '<path d="M4 3h14v18H6a3 3 0 010-6h12M4 3v15M8 7h6M8 11h6"/>',
};
const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPaths[name] || svgPaths.file}</svg>`;
const staffRoute = () => location.hash.includes('/review') ? 'review' : location.hash.includes('/standards') ? 'standards' : location.hash.includes('/homework/1') ? 'graded' : 'homeworks';
const totalPoints = () => staffState.questions.reduce((n, q) => n + (Number.isFinite(q.max) ? q.max : 0), 0);
const ruleCount = () => staffState.questions.reduce((n, q) => n + q.rules.length, 0);
const isProfessor = () => staffState.role === 'professor';
const readonly = () => !isProfessor() ? 'disabled' : '';
const materialCount = () => Number(Boolean(staffState.documents.questions)) + Number(Boolean(staffState.documents.solution)) + staffState.documents.examples.length;
const badge = (text, type = '') => `<span class="staff-badge ${type}"><i></i>${text}</span>`;
function assessmentStatus() {
  const score = assessmentScore(staffState);
  return staffState.assessment?.finalized ? badge('Graded', 'success') : score ? badge(score.pending ? 'Manual review' : 'Ready for review', 'warning') : badge('Not checked');
}
function navigation() {
  return `<aside class="sidebar"><div class="brand-row"><a class="brand" href="#/" aria-label="Verity homeworks">${glyph('mark')}<span class="brand-word">verity</span></a></div><div class="sidebar-content"><p class="staff-side-label">Teaching workspace</p><nav aria-label="Main navigation"><a class="nav-link active" href="#/">${glyph('grid')}<span class="nav-text">Homeworks</span></a></nav><p class="nav-label">Current assignment</p><a class="nav-link" href="#/homework/1">${glyph('file')}<span class="nav-text">Homework 1</span></a></div><div class="sidebar-foot"><span class="avatar">${glyph('user')}</span><div class="sidebar-foot-text"><label for="staff-role">Demo role</label><select id="staff-role" aria-label="Demo role"><option value="professor" ${isProfessor() ? 'selected' : ''}>Professor</option><option value="ta" ${!isProfessor() ? 'selected' : ''}>Teaching assistant</option></select></div></div></aside>`;
}
function flash() { return `${ui.error ? `<div class="staff-flash error" role="alert">${esc(ui.error)}</div>` : ''}${ui.message ? `<div class="staff-flash" role="status">${esc(ui.message)}</div>` : ''}`; }
function homeworkHeader(active) {
  return `<a class="back-link" href="#/">${glyph('left')}Homeworks</a><header class="page-heading"><div><h1>Homework 1</h1><p>Linear systems &amp; proofs <span class="dot-divider">·</span> ${staffState.questions.length} questions <span class="dot-divider">·</span> ${totalPoints()} points</p></div>${badge(staffState.dirty ? 'Standards in progress' : `Standards saved · v${staffState.version}`, staffState.dirty ? '' : 'success')}</header><nav class="staff-tabs" aria-label="Homework sections"><a href="#/homework/1" ${active === 'graded' ? 'aria-current="page"' : ''}>Graded homeworks <span>${staffState.assessment?.finalized ? 1 : 0}</span></a><a href="#/homework/1/standards" ${active === 'standards' ? 'aria-current="page"' : ''}>Grading standards</a></nav>`;
}
function homeworks() {
  return `<main id="main" class="main staff-main" tabindex="-1"><header class="page-heading"><div><h1>Homeworks</h1><p>Your assignments, grading standards, and reviewed work.</p></div><span class="sample-label">Interactive demo</span></header><div class="staff-list"><div class="staff-list-head"><span>Assignment</span><span>Standards</span><span>Graded</span><span></span></div><a class="homework-row" href="#/homework/1"><span class="homework-name"><span class="homework-icon">${glyph('file')}</span><span><strong>Homework 1</strong><small>Linear systems &amp; proofs · ${staffState.questions.length} questions · ${totalPoints()} points</small></span></span><span>${badge(staffState.dirty ? 'Set up standards' : 'Ready', staffState.dirty ? '' : 'success')}</span><span class="graded-count">${staffState.assessment?.finalized ? 1 : 0} / 1</span>${glyph('right')}</a></div><p class="workspace-note">Start with Homework 1. Set the standard once, then review each submission against it.</p></main>`;
}
function gradedHomeworks() {
  const score = assessmentScore(staffState);
  return `<main id="main" class="main staff-main" tabindex="-1">${homeworkHeader('graded')}${flash()}<section class="standards-summary"><div class="summary-icon">${glyph('book')}</div><div><h2>${staffState.dirty ? 'Set your grading standard' : 'Your grading standard is ready'}</h2><p>${materialCount()} reference PDFs · ${ruleCount()} deduction rules${staffState.dirty ? ' · Not saved yet' : ` · Version ${staffState.version}`}</p></div><a class="button ${staffState.dirty ? 'primary' : ''}" href="#/homework/1/standards">${staffState.dirty ? 'Set up standards' : 'View standards'}${glyph('right')}</a></section><div class="section-heading"><div><h2>Submissions</h2><p>Review proposed deductions before approving a grade.</p></div><span class="muted">1 sample submission</span></div><div class="table-scroll"><table class="assignment-table staff-submissions"><thead><tr><th scope="col">Student</th><th scope="col">Status</th><th scope="col">${staffState.assessment?.finalized ? 'Grade' : 'Suggested grade'}</th><th scope="col"></th></tr></thead><tbody><tr><td><a href="#/homework/1/review" class="student-link"><span class="initial-avatar">S</span><span><strong>Sample student</strong><small>student-submission.pdf</small></span></a></td><td>${assessmentStatus()}</td><td class="score">${score && !score.pending ? `${score.score} / ${score.max}` : '—'}</td><td><a class="button" href="#/homework/1/review">Review${glyph('right')}</a></td></tr></tbody></table></div><p class="workspace-note">This sample has correct mathematics with deliberately missing presentation details.</p>${staffState.history.length ? `<details class="review-history"><summary>Approved demo history (${staffState.history.length})</summary>${staffState.history.map(h => `<p>Standards v${h.version}: ${h.score.score} / ${h.score.max}, approved by the professor.</p>`).join('')}</details>` : ''}</main>`;
}
function fileRow(doc, kind, index = 0) {
  return `<div class="attached-file">${glyph('file')}<div><strong>${esc(doc.name)}</strong><small>${doc.demo ? 'Sample PDF' : 'Local PDF · not sent anywhere'}</small></div><button class="text-button" data-do="view-file" data-kind="${kind}" data-index="${index}">View</button><button class="icon-button" data-do="remove-file" data-kind="${kind}" data-index="${index}" aria-label="Remove ${esc(doc.name)}" ${readonly()}>×</button></div>`;
}
function uploadField(kind, title, help, optional = false) {
  const docs = kind === 'examples' ? staffState.documents.examples : staffState.documents[kind] ? [staffState.documents[kind]] : [];
  return `<section class="material-block"><div class="material-heading"><h3>${title}</h3><span>${optional ? 'Optional' : 'Required'}</span></div><p>${help}</p>${docs.map((d, i) => fileRow(d, kind, i)).join('')}${docs.length === 0 || optional ? `<label class="pdf-drop ${!isProfessor() ? 'is-disabled' : ''}">${glyph('upload')}<span>${optional && docs.length ? 'Add another example' : 'Choose PDF'}<small>PDF, up to 20 MB${optional ? ' · max 5 files' : ''}</small></span><input type="file" accept="application/pdf,.pdf" data-file="${kind}" aria-label="${title}" ${optional ? 'multiple' : ''} ${readonly()}></label>` : ''}</section>`;
}
function questionShape(q, qi) {
  return `<div class="question-shape"><div class="reference-page-fields"><label for="assignment-pages-${q.id}">Blank PDF pages<input id="assignment-pages-${q.id}" value="${q.assignmentPages.join(', ')}" data-field="assignmentPages" data-q="${qi}" placeholder="1, 2" ${readonly()}></label><label for="solution-pages-${q.id}">Solution PDF pages<input id="solution-pages-${q.id}" value="${q.solutionPages.join(', ')}" data-field="solutionPages" data-q="${qi}" placeholder="1, 2" ${readonly()}></label></div><p class="page-mapping-help">Use PDF page numbers, starting at 1. Students assign their own submission pages separately.</p><label for="form-${q.id}">Response type<select id="form-${q.id}" data-field="form" data-q="${qi}" ${readonly()}>${['Row reduction', 'Proof', 'Equation derivation', 'Numerical calculation', 'Other'].map(f => `<option ${q.form === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label><label for="expected-${q.id}">Expected work<textarea id="expected-${q.id}" data-field="expectedWork" data-q="${qi}" rows="3" maxlength="2000" ${readonly()}>${esc(q.expectedWork)}</textarea></label></div>`;
}
function questionEditor(q, qi) {
  return `<section class="question-editor"><header><div class="question-number">Q${qi + 1}</div><div class="question-name-fields"><label class="sr-only" for="title-${q.id}">Question ${qi + 1} title</label><input id="title-${q.id}" class="question-title-input" value="${esc(q.title)}" data-field="title" data-q="${qi}" maxlength="100" ${readonly()}><p>Deduct points when a requirement is missing.</p></div><label class="max-points"><input type="number" value="${q.max}" min="1" max="1000" step="0.5" data-field="max" data-q="${qi}" aria-label="Question ${qi + 1} maximum points" ${readonly()}> points</label></header><label class="sr-only" for="prompt-${q.id}">Question ${qi + 1} prompt</label><textarea id="prompt-${q.id}" class="question-prompt" data-field="prompt" data-q="${qi}" rows="2" ${readonly()}>${esc(q.prompt)}</textarea>${questionShape(q, qi)}<div class="deduction-head"><span>Requirement</span><span>Deduction</span><span></span></div>${q.rules.map((r, ri) => `<div class="deduction-row"><div><label class="sr-only" for="rule-${r.id}">Question ${qi + 1} requirement ${ri + 1}</label><input id="rule-${r.id}" value="${esc(r.text)}" data-field="text" data-q="${qi}" data-rule="${ri}" maxlength="240" ${readonly()}><small>${esc(r.category)}${r.check ? '' : ' · Manual review in demo'}</small></div><label class="deduction-points"><span>−</span><input type="number" value="${r.points}" min="0.01" step="0.25" max="${q.max}" data-field="points" data-q="${qi}" data-rule="${ri}" aria-label="Deduction for ${esc(r.text)}" ${readonly()}><span>pts</span></label><button class="icon-button" data-do="remove-rule" data-q="${qi}" data-rule="${ri}" aria-label="Remove requirement ${ri + 1} from question ${qi + 1}" ${readonly()}>×</button></div>`).join('')}<button class="text-button add-deduction" data-do="add-rule" data-q="${qi}" ${readonly()}>${glyph('plus')}Add deduction</button></section>`;
}
function standards() {
  return `<main id="main" class="main staff-main standards-main" tabindex="-1">${homeworkHeader('standards')}${flash()}<div class="standards-intro"><div><h2>What does good work look like?</h2><p>Give the grader your reference work, then define what earns a deduction.</p></div><button class="button" data-do="load-demo" ${readonly()}>Use demo PDFs</button></div>${!isProfessor() ? '<div class="staff-flash">TAs can inspect standards and review deductions. Switch to Professor to edit the setup.</div>' : ''}<div class="standards-layout"><div class="materials-column"><h2 class="section-title">Reference material</h2>${uploadField('questions', 'Blank assignment', 'The original questions students receive.')}${uploadField('solution', 'Instructor solution', 'Your worked solution, including the notation and level of detail you expect.')}${uploadField('examples', 'Past graded homeworks', 'Examples of the same homework showing previous deductions.', true)}<p class="local-note">Files stay in this tab. The scripted demo does not read uploaded PDFs.</p></div><div class="rubric-column"><div class="section-heading"><h2>Question-by-question deductions</h2><span class="muted">${totalPoints()} points total</span></div>${staffState.questions.map(questionEditor).join('')}<button class="text-button" data-do="add-question" ${readonly()}>${glyph('plus')}Add question</button><section class="grading-notes"><label for="grading-notes">General grading instructions</label><textarea id="grading-notes" data-field="notes" rows="3" maxlength="3000" ${readonly()}>${esc(staffState.notes)}</textarea></section></div></div><footer class="standards-footer"><p id="save-status">${staffState.dirty ? 'Unsaved changes' : `Standards v${staffState.version} saved in this tab`}</p><button class="button primary" data-do="save-standards" ${!isProfessor() || ui.uploadBusy ? 'disabled' : ''}>Save standards${glyph('check')}</button></footer></main>`;
}
function questionScore(qi) { const s = assessmentScore(staffState)?.questions[qi]; return s && !s.pending ? `${s.score} / ${s.max}` : `${staffState.questions[qi].max} pts`; }
function reviewSide() {
  const q = staffState.saved?.questions[ui.question] || staffState.questions[ui.question];
  const a = staffState.assessment;
  const score = assessmentScore(staffState);
  return `<aside class="review-panel staff-review-panel" aria-label="Grading review"><header class="staff-review-heading"><div><h1>Sample student</h1><p>Homework 1</p></div>${assessmentStatus()}</header><div class="review-score"><span>${a?.finalized ? 'Approved grade' : 'Suggested grade'}</span><strong>${score && !score.pending ? `${score.score}<small> / ${score.max}</small>` : '—'}</strong></div><div class="question-switcher" role="group" aria-label="Question">${staffState.questions.map((question, index) => `<button data-do="question" data-index="${index}" aria-pressed="${ui.question === index}"><strong>Question ${index + 1}</strong><span>${questionScore(index)}</span></button>`).join('')}</div><div class="question-panel-heading"><h2>${esc(q.title)}</h2><p class="student-page-map">Student-assigned pages: ${staffState.submission.questionPages[q.id]?.join(', ') || 'Not assigned'}</p><details class="expected-work-summary"><summary>Expected work · ${esc(q.form)}</summary><p>${esc(q.expectedWork)}</p></details><p>${a ? 'Check each proposed deduction against the work.' : 'Run the demo check to see suggested deductions.'}</p></div>${q.rules.map(r => {
    const finding = a?.results[r.id];
    const selected = finding?.decision || 'unreviewed';
    return `<section class="finding ${finding?.decision === 'deduct' ? 'has-deduction' : ''}"><div class="finding-top"><h3>${esc(r.text)}</h3><strong>${finding?.decision === 'keep' ? '0' : `−${r.points}`}<small> pts</small></strong></div>${finding ? `<p>${esc(finding.evidence)}</p><label class="decision-label" for="decision-${r.id}">Reviewer decision</label><select id="decision-${r.id}" data-decision="${r.id}" ${a.finalized ? 'disabled' : ''}><option value="unreviewed" ${selected === 'unreviewed' ? 'selected' : ''}>Needs manual review</option><option value="deduct" ${selected === 'deduct' ? 'selected' : ''}>Apply deduction (−${r.points})</option><option value="keep" ${selected === 'keep' ? 'selected' : ''}>No deduction</option></select>` : `<p>${esc(r.category)}</p>`}</section>`;
  }).join('')}${a ? `<section class="student-hints"><h2>Student feedback</h2><p>${esc(q.rules.filter(r => a.results[r.id]?.decision === 'deduct').map(r => a.results[r.id].hint || `Review this requirement: ${r.text}.`).join(' ') || 'No deductions applied for this question.')}</p></section>` : ''}<p class="sample-disclosure">Scripted demo. Only sample rules and documents are checked automatically. New rules or references require manual review.</p>${flash()}</aside>`;
}
function reviewPage() {
  const a = staffState.assessment;
  const score = assessmentScore(staffState);
  const doc = ui.document;
  const docNames = {'student-submission': 'Student submission', 'instructor-solution': 'Instructor solution', questions: 'Blank assignment', 'past-graded': 'Past graded example'};
  const material = doc === 'instructor-solution' ? staffState.documents.solution : doc === 'questions' ? staffState.documents.questions : doc === 'past-graded' ? staffState.documents.examples[0] : null;
  const mappedPages = pagesForQuestion(staffState, ui.question, doc);
  const page = mappedPages[ui.documentPage] || mappedPages[0] || 1;
  const pageCount = material?.pageCount || (doc === 'student-submission' ? staffState.submission.pageCount : null);
  const pageLabel = pageCount ? `Page ${page} of ${pageCount}` : `Reference page ${page}`;
  const custom = material && !material.demo;
  return `<main id="main" class="review-main staff-review-main" tabindex="-1"><section class="document-workspace" aria-label="Homework document"><div class="document-toolbar"><a class="back-link" href="#/homework/1">${glyph('left')}Homework 1</a><label class="sr-only" for="view-document">Document to view</label><select id="view-document">${Object.entries(docNames).map(([id, name]) => `<option value="${id}" ${doc === id ? 'selected' : ''} ${id !== 'student-submission' && !(id === 'instructor-solution' ? staffState.documents.solution : id === 'questions' ? staffState.documents.questions : staffState.documents.examples[0]) ? 'disabled' : ''}>${name}</option>`).join('')}</select></div><div class="document-scroll staff-document-scroll">${custom ? `<iframe class="custom-pdf" title="${esc(material.name)}" src="${esc(material.url)}#page=${page}&toolbar=0"></iframe><a class="back-link" href="${esc(material.url)}" target="_blank" rel="noopener">Open PDF in a separate tab</a>` : !mappedPages.length ? `<div class="empty-state"><h2>No pages assigned</h2><p>This question does not have pages assigned in the selected document.</p></div>` : `<img class="pdf-page" style="--zoom:${ui.zoom}" src="${fixtureRoot}${doc}-${page}.png" alt="${docNames[doc]}, question ${ui.question + 1}. Use Download PDF for selectable text." width="928" height="1200">`}</div><div class="viewer-controls"><div class="page-control"><button class="icon-button" data-do="previous-page" aria-label="Previous assigned page" ${ui.documentPage <= 0 ? 'disabled' : ''}>${glyph('left')}</button><span>${pageLabel}</span><button class="icon-button" data-do="next-page" aria-label="Next assigned page" ${ui.documentPage >= mappedPages.length - 1 ? 'disabled' : ''}>${glyph('right')}</button></div><div class="zoom-controls"><button class="icon-button" data-do="zoom-out" aria-label="Zoom out" ${ui.zoom <= .7 || custom ? 'disabled' : ''}>${glyph('minus')}</button><span class="zoom-label">${Math.round(ui.zoom * 100)}%</span><button class="icon-button" data-do="zoom-in" aria-label="Zoom in" ${ui.zoom >= 1.6 || custom ? 'disabled' : ''}>${glyph('plus')}</button></div></div></section>${reviewSide()}</main><footer class="bottom-bar"><span class="review-footer-info">${a?.finalized ? 'Approved in this demo only' : staffState.dirty ? 'Save your grading standards first' : `Grading against standards v${staffState.version}`}</span><div class="actions"><a class="button" href="${custom ? esc(material.url) : fixtureRoot + doc + '.pdf'}" download>Download PDF</a>${staffState.dirty ? '<a class="button primary" href="#/homework/1/standards">Set up standards</a>' : !a ? '<button class="button primary" data-do="run-check">Run demo check</button>' : a.finalized ? `<span class="approved-label">${glyph('check')}Grade approved</span>` : `<button class="button primary" data-do="approve" ${!isProfessor() || score.pending ? 'disabled' : ''}>${isProfessor() ? 'Approve demo grade' : 'Professor approval required'}</button>`}</div></footer>`;
}
function renderStaff(focus = false) {
  const page = staffRoute();
  root.className = `staff-app ${page === 'review' ? 'staff-review' : ''}`;
  document.title = `Verity · ${page === 'homeworks' ? 'Homeworks' : page === 'standards' ? 'Grading standards' : page === 'review' ? 'Review Homework 1' : 'Homework 1'}`;
  root.innerHTML = navigation() + ({homeworks, graded: gradedHomeworks, standards, review: reviewPage}[page])();
  if (focus) document.querySelector('#main')?.focus({preventScroll: true});
}
function notifyStaff(message) { document.querySelector('#announcement').textContent = message; }
function closePdf() { pdfDialog.close(); document.querySelector('#pdf-body').innerHTML = ''; }
function showPdf(doc) {
  document.querySelector('#pdf-title').textContent = doc.name;
  document.querySelector('#pdf-body').innerHTML = `<iframe title="${esc(doc.name)}" src="${esc(doc.url)}#toolbar=0"></iframe><a href="${esc(doc.url)}" target="_blank" rel="noopener">Open PDF in a separate tab</a>`;
  pdfDialog.showModal();
}
function releaseDoc(doc) { if (doc?.url?.startsWith('blob:')) URL.revokeObjectURL(doc.url); }
document.addEventListener('click', event => {
  const button = event.target.closest('[data-do]');
  if (!button || button.disabled) return;
  const action = button.dataset.do;
  ui.error = ''; ui.message = '';
  try {
    if (action === 'close-pdf') { closePdf(); return; }
    if (action === 'view-file') { const d = staffState.documents[button.dataset.kind]; showPdf(Array.isArray(d) ? d[+button.dataset.index] : d); return; }
    if (['load-demo', 'remove-file', 'add-rule', 'remove-rule', 'add-question'].includes(action) && !isProfessor()) throw new Error('Switch to Professor to edit the standards.');
    if (action === 'load-demo') {
      [staffState.documents.questions, staffState.documents.solution, ...staffState.documents.examples].forEach(releaseDoc);
      loadDemoMaterials(staffState); ui.message = 'Sample PDFs attached. Review the deductions, then save your standards.';
    }
    if (action === 'save-standards') { saveStandards(staffState); ui.message = `Standards v${staffState.version} saved in this tab. You can now review the sample homework.`; }
    if (action === 'remove-file') { const kind = button.dataset.kind;
      if (kind === 'examples') releaseDoc(staffState.documents.examples.splice(+button.dataset.index, 1)[0]);
      else { releaseDoc(staffState.documents[kind]); staffState.documents[kind] = null; }
      invalidateStandards(staffState);
    }
    if (action === 'add-rule') { staffState.questions[+button.dataset.q].rules.push({id: `custom-${staffState.nextRule++}`, text: '', points: 1, category: 'Custom requirement', check: null}); invalidateStandards(staffState); }
    if (action === 'add-question') { const index = staffState.questions.length + 1; staffState.questions.push({id: `q${index}`, title: `Question ${index}`, prompt: '', max: 10, form: 'Other', expectedWork: '', assignmentPages: [], solutionPages: [], rules: []}); invalidateStandards(staffState); }
    if (action === 'remove-rule') { staffState.questions[+button.dataset.q].rules.splice(+button.dataset.rule, 1); invalidateStandards(staffState); }
    if (action === 'run-check') { runDemoCheck(staffState); ui.message = 'Demo check complete. Review each deduction before approving.'; }
    if (action === 'approve') { const s = approveDemoGrade(staffState); ui.message = `Approved ${s.score} / ${s.max} in this demo. No student grade was published.`; }
    if (action === 'question') { ui.question = +button.dataset.index; ui.documentPage = 0; }
    if (action === 'previous-page') ui.documentPage = Math.max(0, ui.documentPage - 1);
    if (action === 'next-page') ui.documentPage = Math.min(pagesForQuestion(staffState, ui.question, ui.document).length - 1, ui.documentPage + 1);
    if (action === 'zoom-out') ui.zoom = Math.max(.7, +(ui.zoom - .1).toFixed(1));
    if (action === 'zoom-in') ui.zoom = Math.min(1.6, +(ui.zoom + .1).toFixed(1));
  } catch (e) { ui.error = e.message; }
  renderStaff(); notifyStaff(ui.error || ui.message);
  const selector = `[data-do="${action}"]${button.dataset.index !== undefined ? `[data-index="${button.dataset.index}"]` : ''}`;
  document.querySelector(selector)?.focus({preventScroll: true});
});
document.addEventListener('input', event => {
  const input = event.target;
  if (!input.dataset.field || !isProfessor()) return;
  const field = input.dataset.field;
  if (field === 'notes') {
    staffState.notes = input.value;
    for (const q of staffState.questions) for (const r of q.rules) r.check = null;
  } else {
    const q = staffState.questions[+input.dataset.q];
    const target = input.dataset.rule === undefined ? q : q.rules[+input.dataset.rule];
    target[field] = ['max', 'points'].includes(field) ? Number(input.value) : ['assignmentPages', 'solutionPages'].includes(field) ? parsePages(input.value) : input.value;
    if (field === 'text') target.check = null;
    if (['prompt', 'expectedWork', 'form'].includes(field)) for (const r of q.rules) r.check = null;
  }
  invalidateStandards(staffState);
  const label = document.querySelector('#save-status'); if (label) label.textContent = 'Unsaved changes';
});
document.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'staff-role') { staffState.role = input.value; ui.message = ''; ui.error = ''; renderStaff(); return; }
  if (input.id === 'view-document') { ui.document = input.value; ui.documentPage = 0; renderStaff(); return; }
  if (input.id === 'doc-page') { ui.documentPage = +input.value; renderStaff(); return; }
  if (input.dataset.decision) {
    try { reviewDecision(staffState, input.dataset.decision, input.value); ui.message = ''; ui.error = ''; }
    catch (e) { ui.error = e.message; }
    renderStaff(); document.querySelector(`#${input.id}`)?.focus({preventScroll: true}); return;
  }
  if (!input.dataset.file || !isProfessor()) return;
  const kind = input.dataset.file, files = [...input.files];
  if (!files.length) return;
  ui.uploadBusy = true; ui.error = ''; ui.message = ''; renderStaff();
  try {
    if (kind === 'examples' && staffState.documents.examples.length + files.length > 5) throw new Error('Attach up to five past graded PDFs.');
    for (const file of files) await validatePdf(file);
    const docs = files.map(file => ({name: file.name, url: URL.createObjectURL(file), demo: false}));
    if (kind === 'examples') staffState.documents.examples.push(...docs);
    else { releaseDoc(staffState.documents[kind]); staffState.documents[kind] = docs[0]; }
    invalidateStandards(staffState); ui.message = 'PDF attached locally. Uploaded references require manual review in this demo.';
  } catch (e) { ui.error = e.message; }
  finally { ui.uploadBusy = false; renderStaff(); notifyStaff(ui.error || ui.message); }
});
window.addEventListener('hashchange', () => { ui.error = ''; ui.message = ''; renderStaff(true); });
pdfDialog.addEventListener('close', () => { document.querySelector('#pdf-body').innerHTML = ''; });
renderStaff();
