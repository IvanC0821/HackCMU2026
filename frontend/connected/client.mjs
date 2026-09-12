export const connected = globalThis.location?.pathname === '/teacher/' || globalThis.location?.pathname === '/student/';
const tokenKey = 'verity-session';
let demo = false, accessCheck, demoStudents = [];
const studentKey = 'verity-demo-student';
const perspective = globalThis.location?.pathname === '/teacher/' ? 'teacher' : 'student';
async function checkAccessMode() {
  accessCheck ||= fetch('/classroom/demo').then(async r => {
    if (!r.ok) throw Error('Cannot connect to the classroom. Check that the server is running.');
    const mode = await r.json(); demo = mode.enabled === true; demoStudents = mode.students || [];
    if (demoStudents.length && !demoStudents.some(s => s.id === sessionStorage.getItem(studentKey))) sessionStorage.setItem(studentKey, demoStudents[0].id);
  }).catch(e => {accessCheck = null; throw e;});
  await accessCheck;
}
export async function request(path, options = {}) {
  await checkAccessMode();
  const token = sessionStorage.getItem(tokenKey);
  if (!demo && !token) { location.replace('/'); throw Error('Sign in with your course access code.'); }
  const access = demo ? {'X-Verity-Demo-Role': perspective} : {Authorization: `Bearer ${token}`};
  if (demo && perspective === 'student' && demoStudents.length) access['X-Verity-Demo-Student'] = sessionStorage.getItem(studentKey);
  const response = await fetch(`/classroom${path}`, {...options, headers: {...options.headers, ...access}});
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { sessionStorage.removeItem(tokenKey); location.replace('/'); }
    throw Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}). Your work has not been discarded.`);
  }
  return response;
}
export const json = async (path, options) => (await request(path, options)).json();
export const post = (path, data) => json(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
export async function requireRole(role) {
  const user = await json('/me');
  const staff = ['instructor', 'ta'].includes(user.role);
  if ((role === 'staff' && !staff) || (role === 'student' && user.role !== 'student')) {
    document.querySelector('#app').textContent = 'This account does not have access to this workspace. Return to sign in with the correct account.';
    const a = document.createElement('a'); a.href = '/'; a.textContent = ' Return to sign in'; document.querySelector('#app').append(a);
    throw Error('Access denied for this account.');
  }
  return user;
}
export async function upload(file) {
  const body = new FormData(); body.append('file', file, file.name || 'work.pdf');
  return json('/files', {method: 'POST', body});
}
const docCache = new Map();
function documents(s) {
  return [s.documents, ...s.versions.map(v => v.documents)].flatMap(d => [d.blank, d.solution, ...d.examples])
    .concat(s.submissions.flatMap(s => s.attempts.map(a => a.pdf))).filter(Boolean);
}
export async function openRemoteStore() {
  await requireRole('staff');
  return {
    async load() {
      const s = await json('/workspace');
      await Promise.all(documents(s).map(async d => {
        if (!d.remoteId) return;
        if (!docCache.has(d.id)) docCache.set(d.id, request(`/files/${encodeURIComponent(d.remoteId)}`).then(r => r.blob()).then(blob => ({...d, blob})));
        Object.assign(d, await docCache.get(d.id));
      }));
      return s;
    },
    async save(snapshot, expectedRevision) {
      const copy = structuredClone(snapshot);
      for (const d of documents(copy)) {
        if (!d.remoteId) {
          if (!docCache.has(d.id)) docCache.set(d.id, (async () => {
            let blob = d.blob;
            if (d.sample) {
              const name = d.path?.split('/').at(-1)?.replace('.pdf', '');
              blob = await (await request(`/sample/${encodeURIComponent(name)}`)).blob();
            }
            if (!blob) throw Error(`Reattach ${d.name}; the original PDF is unavailable.`);
            const remote = await upload(new File([blob], d.name, {type: 'application/pdf'}));
            return {...remote, id: d.id, blob};
          })());
          try { Object.assign(d, await docCache.get(d.id)); }
          catch (e) { docCache.delete(d.id); throw e; }
        }
        delete d.blob; delete d.path;
        if (d.sample === true) d.sample = false;
      }
      const saved = await json('/workspace', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({state: copy, expectedRevision})});
      // Use the acknowledged write, not a follow-up read that may observe an
      // older revision or another editor's later changes while this save finishes.
      for (const d of documents(saved)) {
        const cached = docCache.get(d.id);
        if (cached) d.blob = (await cached).blob;
      }
      return saved;
    },
    close() {},
  };
}

export async function fetchStudent() { return json('/student'); }
export async function submitStudent(revision, assignment) {
  revision.documentId ||= (await upload(new File([revision.bytes], revision.fileName, {type:'application/pdf'}))).remoteId;
  return post('/attempts', {id: revision.id, documentId: revision.documentId, fileName: revision.fileName,
    version: assignment.version, mapping: revision.mapping});
}
export async function revisionBytes(revision) {
  return (await request(`/files/${encodeURIComponent(revision.documentId)}`)).arrayBuffer();
}
export async function addDemoNavigation() {
  await checkAccessMode();
  if (demo) addSignOut();
}
export function addSignOut() {
  if (demo) {
    if (document.querySelector('.demo-switcher')) return;
    document.body.classList.add('open-demo');
    const nav = document.createElement('nav'); nav.className = 'demo-switcher'; nav.setAttribute('aria-label', 'Demo perspective');
    nav.innerHTML = `<div id="demo-controls" class="demo-controls"><div class="demo-context"><span>Demo</span></div><div class="demo-perspectives" aria-label="Switch view"><a href="/student/" ${perspective === 'student' ? 'aria-current="page"' : ''}>Student</a><a href="/teacher/" ${perspective === 'teacher' ? 'aria-current="page"' : ''}>TA</a></div></div><button class="demo-toggle" type="button" aria-controls="demo-controls" aria-expanded="true" aria-label="Collapse demo bar"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>`;
    document.body.prepend(nav);
    const examples = document.createElement('a'); examples.href = '/examples/'; examples.textContent = 'Example files'; examples.style.cssText = 'color:inherit;text-decoration:underline;white-space:nowrap';
    nav.querySelector('.demo-context').append(examples);
    const toggle = nav.querySelector('.demo-toggle'), controls = nav.querySelector('.demo-controls');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? 'Collapse demo bar' : 'Expand demo bar');
      controls.hidden = !expanded;
      document.body.classList.toggle('demo-collapsed', !expanded);
      dispatchEvent(new Event('resize'));
    });
    if (demoStudents.length) {
      const label = document.createElement('label'); label.className = 'demo-student';
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Demo student');
      for (const student of demoStudents) {
        const option = document.createElement('option'); option.value = student.id;
        option.textContent = `${student.name}${student.new ? ' · new submission' : ' · estimated feedback'}`;
        select.append(option);
      }
      select.value = sessionStorage.getItem(studentKey);
      select.addEventListener('change', () => {
        sessionStorage.setItem(studentKey, select.value);
        if (perspective === 'student') location.reload(); else location.assign('/student/');
      });
      label.append(select); nav.querySelector('.demo-context').append(label);
    }
    return;
  }
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Sign out';
  button.className = 'connected-signout'; button.addEventListener('click', () => {sessionStorage.removeItem(tokenKey); location.replace('/');});
  document.body.append(button);
}
