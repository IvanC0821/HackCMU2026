export const connected = globalThis.location?.pathname === '/teacher/' || globalThis.location?.pathname === '/student/';
const tokenKey = 'verity-session';
export async function request(path, options = {}) {
  const token = sessionStorage.getItem(tokenKey);
  if (!token) { location.replace('/'); throw Error('Sign in with your course access code.'); }
  const response = await fetch(`/classroom${path}`, {...options, headers: {Authorization: `Bearer ${token}`, ...options.headers}});
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
        delete d.blob; delete d.path; d.sample = false;
      }
      await json('/workspace', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({state: copy, expectedRevision})});
      return this.load();
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
export function addSignOut() {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Sign out';
  button.className = 'connected-signout'; button.addEventListener('click', () => {sessionStorage.removeItem(tokenKey); location.replace('/');});
  document.body.append(button);
}
