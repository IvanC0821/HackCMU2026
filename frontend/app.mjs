import {runSample, approveSample} from './__debug__/sample.mjs';

const paths = {
  mark: '<path d="M3 12l6 7L21 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  book: '<path d="M4 3h13a2 2 0 012 2v16H6a3 3 0 010-6h13M4 3v15M8 7h7M8 11h5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  file: '<path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6"/>',
  download: '<path d="M12 3v12m-5-5l5 5 5-5M4 16v5h16v-5"/>',
  chat: '<path d="M21 4H3v13h5v4l5-4h8z"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  alert: '<path d="M12 8v5m0 3h.01M12 3L2 21h20z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/>',
  reset: '<path d="M3 10a9 9 0 111 8M3 3v7h7"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const courses = [{id: 'sample', code: 'Sample classroom', title: 'Discrete mathematics', assignments: 1}];
const state = {collapsed: false, role: 'teacher', expanded: true, zoom: 1, sample: null, busy: false, phase: '', error: '', score: null, preview: false};
const app = document.querySelector('#app');
const dialog = document.querySelector('#course-dialog');
const route = () => location.hash.slice(1).split('/').filter(Boolean);
const status = () => state.score !== null ? '<span class="status graded"><i class="dot"></i>Graded</span>' : state.sample || state.preview ? '<span class="status pending"><i class="dot"></i>Needs review</span>' : '<span class="status"><i class="dot"></i>Submitted</span>';

function sidebar(course, review) {
  return `<aside class="sidebar" aria-label="Workspace navigation">
    <div class="brand-row"><a class="brand" href="#/" aria-label="Verity course dashboard">${icon('mark')}<span class="brand-word">verity</span></a>
    <button class="icon-button" data-action="${review ? 'dashboard' : 'collapse'}" aria-label="${review ? 'Back to dashboard' : state.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">${icon(review ? 'left' : 'menu')}</button></div>
    <div class="sidebar-content"><div class="sidebar-title"><h2>${course ? escape(course.code) : 'Your courses'}</h2><p>${course ? escape(course.title) : 'A little less grading.<br>More room for learning.'}</p></div>
    <nav><a class="nav-link ${!course ? 'active' : ''}" href="#/" aria-label="Course dashboard" ${!course ? 'aria-current="page"' : ''}>${icon('grid')}<span class="nav-text">Course dashboard</span></a>
    ${course ? `<a class="nav-link active" href="#/course/${course.id}" aria-label="Assignments" ${!review ? 'aria-current="page"' : ''}>${icon('file')}<span class="nav-text">Assignments</span></a>` : `<p class="nav-label">Courses</p>${courses.map(c => `<a class="nav-link" href="#/course/${c.id}" aria-label="${escape(c.code)}">${icon('book')}<span class="nav-text">${escape(c.code)}</span></a>`).join('')}`}</nav></div>
    <div class="sidebar-foot"><span class="avatar">${icon('user')}</span><div class="sidebar-foot-text"><strong>Sample workspace</strong><small>HackCMU prototype</small></div></div>
  </aside>`;
}
function dashboard() {
  return `${sidebar()}<main id="main" class="main" tabindex="-1"><header class="page-heading"><h1>Course dashboard</h1><span class="sample-label">Demo workspace</span></header>
  <h2 class="section-label">Your courses</h2><div class="course-grid">${courses.map(c => `<a class="course-card" href="#/course/${c.id}"><div class="course-card-body"><h2>${escape(c.code)}</h2><p>${escape(c.title)}</p></div><div class="course-card-footer"><span>${c.assignments} ${c.assignments === 1 ? 'assignment' : 'assignments'}</span>${icon('right')}</div></a>`).join('')}
  <button class="course-card add-card" data-action="add-course">${icon('plus')}<span>Add a course</span></button></div>
  <p class="workspace-note">Open the sample classroom to explore a submission and its rubric feedback.</p></main>
  <footer class="bottom-bar"><span class="muted">Sample courses and submissions</span><button class="button primary" data-action="add-course">${icon('plus')}Add course</button></footer>`;
}
function coursePage(course) {
  return `${sidebar(course)}<main id="main" class="main" tabindex="-1"><a class="back-link" href="#/">${icon('left')}All courses</a>
  <header class="page-heading"><div><div class="course-heading"><h1>${escape(course.code)}</h1><span>Demo workspace</span></div><p>${escape(course.title)}</p></div></header>
  ${course.assignments ? `<div class="table-scroll"><table class="assignment-table"><thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Submissions</th><th scope="col">Points</th></tr></thead><tbody><tr><td><a class="assignment-title" href="#/review/sample">Induction homework</a><small>Proof by mathematical induction</small></td><td>${status()}</td><td>1 sample submission</td><td>10</td></tr></tbody></table></div>
  <p class="workspace-note">Review the sample proof, explore the student hint, and approve the suggested grade.</p>` : '<div class="empty-state"><h2>No assignments yet</h2><p>This is a preview course. The sample classroom has a complete review to explore.</p><a class="back-link" href="#/course/sample">Open sample classroom</a></div>'}</main>
  <footer class="bottom-bar"><span class="muted">${course.assignments} ${course.assignments === 1 ? 'assignment' : 'assignments'}</span>${course.assignments ? `<a class="button primary" href="#/review/sample">Review submission${icon('right')}</a>` : '<a class="button" href="#/course/sample">Open sample classroom</a>'}</footer>`;
}
function paper() {
  const flagged = (state.sample || state.preview) && state.expanded;
  return `<article class="paper" style="--zoom:${state.zoom}" aria-label="Sample homework submission"><div class="paper-meta"><span>Sample student</span><span>Discrete mathematics</span></div>
  <h2>Induction homework</h2><p class="paper-subtitle">Sample submission</p>
  <div class="paper-question"><strong>Question 1 <span class="muted">(10 points)</span></strong><p>Prove that the following holds for every integer <i>n</i> ≥ 1.</p><div class="equation">1 + 2 + ··· + n = <span>n(n + 1) / 2</span></div></div>
  <div class="paper-rule"></div><p class="proof-label">Student’s submitted proof</p>
  <div class="proof-step"><span class="step-number">1.</span><p>Base case: for n = 1, both sides equal 1.</p></div>
  <div class="proof-step ${flagged ? 'highlight' : ''}"><span class="step-number">2.</span><p>Assume the formula is true for k + 1.</p></div>
  ${flagged ? `<div class="annotation">${state.role === 'student' ? 'Revisit the inductive hypothesis.' : 'Review: this step assumes the conclusion.'}</div>` : ''}
  <div class="proof-step"><span class="step-number">3.</span><p>Therefore it is true for k + 1, which completes the induction.</p></div>
  <div class="paper-foot"><span>Fictional sample · deliberately includes a mistake</span><span>1 / 1</span></div></article>`;
}
function reviewPanel() {
  const ready = state.sample || state.preview;
  const teacher = state.role === 'teacher';
  const final = state.score !== null;
  const score = final ? `${escape(state.score)} <small>/ 10 pts</small>` : teacher && ready ? '2 <small>/ 10 pts</small>' : '<small>Awaiting teacher review</small>';
  return `<aside class="review-panel" aria-label="Grading and feedback"><header class="review-heading"><h1>Induction homework</h1></header><div style="margin-bottom:20px">${status()}</div>
  <div class="view-picker" role="group" aria-label="Sample view"><button data-action="teacher" aria-pressed="${teacher}">Teacher view</button><button data-action="student" aria-pressed="${!teacher}">Student view</button></div>
  <div class="notice">${icon('chat')}<span>${!ready ? 'Review the submission, then run the sample to explore rubric feedback.' : final ? 'The teacher has approved this grade.' : teacher ? 'Review the suggested score before sharing the final grade.' : 'Your feedback is ready. Your teacher will review the final grade.'}</span></div>
  <dl class="student-info"><dt>Student</dt><dd>Sample student</dd><dt>${final ? 'Total points' : teacher && ready ? 'Suggested score' : 'Grade'}</dt><dd class="score">${score}</dd></dl>
  <button class="question-toggle" data-action="question" aria-expanded="${state.expanded}" aria-controls="question-details"><span><small>Question 1</small><strong>Proof by induction</strong></span>${icon(state.expanded ? 'minus' : 'plus')}</button>
  <div id="question-details" ${!state.expanded ? 'hidden' : ''}>
  ${teacher ? `<div class="rubric"><div class="criterion"><div class="criterion-title"><span>Base case</span><span>${ready ? '2 / 2' : '2 pts'}</span></div><p>Verify the base case n = 1.</p>${ready ? `<p class="criterion-result">${icon('check')}Correctly established</p>` : ''}</div>
  <div class="criterion"><div class="criterion-title"><span>Inductive step</span><span>${ready ? '0 / 8' : '8 pts'}</span></div><p>State the hypothesis for k and establish the k + 1 case without assuming the conclusion.</p>${ready ? `<p class="criterion-result warning">${icon('alert')}Circular reasoning</p>` : ''}</div></div>` : ''}
  <section class="panel-section"><h2>${teacher ? 'Student feedback' : 'Your feedback'}</h2><p class="hint">${ready ? escape(state.sample?.hint || 'Separate what you may assume for k from what you must establish for k+1.') : 'Feedback will appear here after the sample is run.'}</p></section></div>
  <p class="sample-disclosure">${state.preview ? 'Visual preview only. Fixed sample feedback; no grade has been saved.' : 'Fixed sample demonstration, not AI grading. Teacher and student views use isolated sample accounts.'}</p>
  ${state.error ? `<p class="error" role="alert">${escape(state.error)}</p>` : ''}</aside>`;
}
function review() {
  const ready = state.sample || state.preview;
  const final = state.score !== null;
  const primary = state.busy ? `<button class="button primary" disabled>Working…</button>` : !ready ? `<button class="button primary" data-action="run">Run sample grading${icon('right')}</button>` : state.preview ? `<button class="button primary" data-action="run">Connect sample server${icon('right')}</button>` : state.role === 'teacher' ? `<button class="button primary" data-action="approve" ${final ? 'disabled' : ''}>${icon('check')}${final ? 'Grade approved' : 'Approve sample grade'}</button>` : '';
  return `${sidebar(courses[0], true)}<main id="main" class="review-main" tabindex="-1"><section class="document-workspace" aria-label="Submission document"><div class="document-toolbar"><a class="back-link" href="#/course/sample">${icon('left')}Assignments</a><span class="document-name">sample-homework.pdf</span><span class="sample-label">Sample submission</span></div>
  <div class="document-scroll">${paper()}</div><div class="viewer-controls"><span class="page-count">${icon('file')}Page 1 of 1</span><div class="zoom-controls"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out" ${state.zoom <= .7 ? 'disabled' : ''}>${icon('minus')}</button><span class="zoom-label">${Math.round(state.zoom * 100)}%</span><button class="icon-button" data-action="zoom-in" aria-label="Zoom in" ${state.zoom >= 1.6 ? 'disabled' : ''}>${icon('plus')}</button><button class="icon-button" data-action="zoom-reset" aria-label="Reset zoom">${icon('reset')}</button></div></div></section>${reviewPanel()}</main>
  <footer class="bottom-bar"><div class="review-footer-info">${icon(final ? 'check' : 'file')}<span>${state.busy ? escape(state.phase) : final ? 'Grade approved and shared with the sample student' : 'Question 1 · Proof by induction'}</span></div><div class="actions"><a class="button" href="./output/pdf/sample-homework.pdf" download>${icon('download')}Download original</a>${!ready && !state.busy ? '<button class="button subtle" data-action="preview">Preview feedback</button>' : ''}${primary}</div></footer>`;
}
function render({focus = false} = {}) {
  const [page, id] = route();
  const isReview = page === 'review' && id === 'sample';
  const course = courses.find(c => c.id === id);
  app.className = isReview ? 'review' : state.collapsed ? 'collapsed' : '';
  document.title = `Verity · ${isReview ? 'Submission review' : page === 'course' && course ? course.code : 'Course dashboard'}`;
  app.innerHTML = isReview ? review() : page === 'course' && course ? coursePage(course) : dashboard();
  if (focus) document.querySelector('#main').focus({preventScroll: true});
}
function announce(text) { document.querySelector('#announcement').textContent = text; }
async function run() {
  if (state.busy || state.sample) return;
  if (location.protocol === 'file:') {
    state.error = 'This is the offline preview. Use Preview feedback to explore the sample, or open the local demo server to save a reviewed grade.';
    render(); announce(state.error); return;
  }
  state.busy = true; state.error = ''; state.phase = 'Opening sample classroom…'; render();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    state.sample = await runSample({signal: controller.signal, sessionUrl: './__debug__/session',
      onStep(text) { state.phase = text; render(); announce(text); }, onSession() {}, onResponse() {}});
    state.preview = false;
    announce('Sample feedback is ready. The grade is waiting for teacher approval.');
  } catch {
    state.error = 'The sample server is unavailable or could not finish. You can still preview the fixed feedback. To save a sample grade, start the local demo server and try again.';
    announce(state.error);
  } finally { clearTimeout(timeout); state.busy = false; render(); }
}
async function approve() {
  if (!state.sample || state.busy || state.role !== 'teacher' || state.score !== null) return;
  state.busy = true; state.error = ''; state.phase = 'Saving the reviewed sample grade…'; render();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    state.score = await approveSample(state.sample, controller.signal);
    announce(`The teacher approved ${state.score} out of 10. The student can now see the grade.`);
  } catch { state.error = 'The grade could not be confirmed. Check the sample server and try again.'; announce(state.error); }
  finally { clearTimeout(timeout); state.busy = false; render(); }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'add-course') { dialog.showModal(); return; }
  if (action === 'close-dialog') { dialog.close(); return; }
  if (action === 'dashboard') { location.hash = '/'; return; }
  if (action === 'run') { run(); return; }
  if (action === 'approve') { approve(); return; }
  if (action === 'collapse') state.collapsed = !state.collapsed;
  if (action === 'teacher' || action === 'student') state.role = action;
  if (action === 'question') state.expanded = !state.expanded;
  if (action === 'preview') { state.preview = true; state.error = ''; announce('Fixed sample feedback preview. No grade has been saved.'); }
  if (action === 'zoom-in') state.zoom = Math.min(1.6, +(state.zoom + .1).toFixed(1));
  if (action === 'zoom-out') state.zoom = Math.max(.7, +(state.zoom - .1).toFixed(1));
  if (action === 'zoom-reset') state.zoom = 1;
  const scroll = document.querySelector('.document-scroll');
  const scrollTop = scroll?.scrollTop || 0;
  render();
  document.querySelector('.document-scroll')?.scrollTo({top: scrollTop});
  document.querySelector(`[data-action="${action}"]`)?.focus({preventScroll: true});
});
document.querySelector('#course-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const code = form.elements.code.value.trim(), title = form.elements.title.value.trim();
  if (!code || !title) return;
  courses.push({id: `course-${courses.length}`, code, title, assignments: 0});
  dialog.close(); form.reset(); render(); announce(`${code} added to this preview workspace.`);
});
window.addEventListener('hashchange', () => render({focus: true}));
render();
