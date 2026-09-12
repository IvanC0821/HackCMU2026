// Uses only the existing /api/v1 contract. Tokens are passed in memory by the UI.
export function apiURL(origin, path) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Enter an API origin without a path or credentials.');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Use HTTPS for a non-local API.');
  if (!path.startsWith('/api/v1/') || path.includes('\\') || /[\r\n]/.test(path)) throw new Error('Invalid API path.');
  const target = new URL(path, url);
  if (target.origin !== url.origin || !target.pathname.startsWith('/api/v1/')) throw new Error('Invalid API path.');
  return target.href;
}
export async function apiRequest(config, path, {body, file, key, signal, method = 'GET'} = {}, fetcher = fetch) {
  if (!config.token?.trim()) throw new Error('Enter a staff access token.');
  const headers = {Authorization: `Bearer ${config.token.trim().replace(/^Bearer\s+/i, '')}`, Accept: 'application/json'};
  if (key) headers['Idempotency-Key'] = key;
  let payload;
  if (file) { payload = new FormData(); payload.append('file', file, file.name || 'reference.pdf'); }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const response = await fetcher(apiURL(config.origin, path), {method, headers, body: payload, signal, redirect: 'error', credentials: 'omit', cache: 'no-store'});
  let data; try { data = await response.json(); } catch { throw new Error('The API did not return JSON. Check the origin and server.'); }
  if (!response.ok) throw new Error(`API ${response.status}: ${typeof data.detail === 'string' ? data.detail : 'Request rejected. Check staff permissions and the server configuration.'}`);
  return data;
}
export function mapDraft(spec, questions, documents = []) {
  if (!Array.isArray(spec?.criteria) || !spec.criteria.length) throw new Error('The API draft did not include criteria.');
  if (spec.criteria.some(c => !questions.some(q => q.id === c.question_id))) throw new Error('The draft refers to an unknown question. Nothing was imported.');
  return questions.map(q => ({...structuredClone(q), criteria: spec.criteria.filter(c => c.question_id === q.id).map(c => {
    const patterns = structuredClone((spec.patterns || []).filter(p => p.criterion_ids.includes(c.id)));
    return {id: c.id, label: c.requirement, max: Number(c.max_points), category: [...new Set(patterns.map(p => p.category))].join(', ') || 'AI draft',
      conceptIds: structuredClone(c.concept_ids || []), patterns,
      sourceRefs: (c.source_refs || []).map(ref => ({...ref, name: documents.find(d => (d.remoteId || d.id) === ref.document_id)?.name || 'Reference PDF'})),
      bands: c.bands.map(b => ({id: b.id, label: b.description, points: Number(b.points)}))};
  })}));
}
export async function generateApiDraft(config, workspace, onProgress = () => {}, signal, fetcher = fetch, pause = ms => new Promise(r => setTimeout(r, ms))) {
  if (!config.courseId?.trim()) throw new Error('Enter the existing API course ID.');
  if (!workspace.draft.length || workspace.draft.some(q => !q.prompt.trim())) throw new Error('Add the question prompts before asking the API to draft a rubric.');
  const docs = [workspace.documents.blank, workspace.documents.solution, ...workspace.documents.examples];
  if (!docs[0]?.blob || !docs[1]?.blob || docs.some(d => !d?.blob)) throw new Error('Attach local PDFs for live drafting. Sample PDFs are for the offline demo only.');
  const request = (path, options) => apiRequest(config, path, {...options, signal}, fetcher);
  const docIds = [];
  for (const [index, doc] of docs.entries()) {
    onProgress(`Uploading reference ${index + 1} of ${docs.length}`);
    const file = new File([doc.blob], doc.name, {type: 'application/pdf'});
    const uploaded = await request(`/api/v1/documents?course_id=${encodeURIComponent(config.courseId)}&kind=${index === 0 ? 'assignment' : index === 1 ? 'answer_key' : 'graded_example'}`, {method: 'POST', file});
    docIds.push(uploaded.id);
  }
  onProgress('Creating the API assignment');
  const assignment = await request(`/api/v1/courses/${encodeURIComponent(config.courseId)}/assignments`, {method: 'POST', body: {
    title: workspace.title, questions: workspace.draft.map(q => ({id: q.id, prompt: q.prompt})), material_document_ids: docIds, external_ai_allowed: true, ocr_enabled: false,
    feedback_policy: {max_disclosure_level: 1, release_level: 1, location_visibility: 'question', max_findings: 3, max_words: 60, allow_generated: false, show_scores: true}}});
  onProgress(`Drafting rubric for API assignment ${assignment.id}`);
  const context = workspace.draft.map(q => `${q.id}: expected ${q.expected}; alternatives ${q.alternatives}; blank pages ${q.assignmentPages.join(',')}; solution pages ${q.solutionPages.join(',')}`).join('\n');
  let job = await request(`/api/v1/assignments/${encodeURIComponent(assignment.id)}/rubric-drafts:generate`, {method: 'POST', body: {instructions: `${workspace.instructions}\n${context}`}, key: crypto.randomUUID()});
  onProgress(`Waiting for draft job ${job.id}. API assignment ${assignment.id} is saved on the server.`);
  for (let attempt = 0; attempt < 150; attempt++) {
    signal?.throwIfAborted();
    if (job.status === 'succeeded') {
      const result = await request(`/api/v1/rubric-versions/${encodeURIComponent(job.result_id)}`);
      return {questions: mapDraft(result.spec, workspace.draft, docs.map((d, i) => ({...d, remoteId: docIds[i]}))), assignmentId: assignment.id, rubricId: result.id, spec: result.spec};
    }
    if (job.status === 'failed') throw new Error(`Draft failed: ${job.error_code || 'provider unavailable'}. Server assignment ${assignment.id} remains saved.`);
    await pause(2000); signal?.throwIfAborted();
    job = await request(`/api/v1/jobs/${encodeURIComponent(job.id)}`);
  }
  throw new Error(`Draft is still pending. Check job ${job.id} on API assignment ${assignment.id}; do not create a duplicate assignment.`);
}
