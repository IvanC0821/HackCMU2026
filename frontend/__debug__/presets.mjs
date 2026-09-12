const id = (c, key) => c[key] || `{${key}}`;
const pathId = (c, key) => c[key] ? encodeURIComponent(c[key]) : `{${key}}`;
const cpath = (c) => `/api/v1/courses/${pathId(c, 'course-id')}`;
const apath = (c) => `/api/v1/assignments/${pathId(c, 'assignment-id')}`;
const spath = (c) => `/api/v1/submissions/${pathId(c, 'submission-id')}`;
const assessment = (c) => `/api/v1/assessments/${pathId(c, 'assessment-id')}`;
const dpath = (c) => `/api/v1/documents/${pathId(c, 'document-id')}`;
const job = (c) => `/api/v1/jobs/${pathId(c, 'job-id')}`;
const get = (path) => ({method: 'GET', path, format: 'none'});
const post = (path, body) => ({method: 'POST', path, format: body === undefined ? 'none' : 'json', body});
const assignmentBody = (c, ai) => ({title: 'Induction homework',
  questions: [{id: 'q1', prompt: 'Prove by induction that 1 + ... + n = n(n+1)/2.'}],
  material_document_ids: c['answer-key-id'] ? [c['answer-key-id']] : [],
  external_ai_allowed: ai, ocr_enabled: false,
  feedback_policy: {max_disclosure_level: 2, release_level: 2, location_visibility: 'point',
    max_findings: 3, max_words: 80, allow_generated: ai, show_scores: true}});
const finding = (c) => ({criterion_id: 'inductive_step', pattern_id: 'circular_induction', category: 'conceptual',
  impact: 'local', description: 'The argument assumes the conclusion for k+1.',
  evidence_region_ids: c['region-id'] ? [c['region-id']] : [], anchor: null, root_cause_id: null});

export const presets = [
  {id: 'me', label: 'Who am I?', group: 'Connection and courses', help: 'Check each token. Sending as Student fills the student user ID.', build: () => get('/api/v1/me')},
  {id: 'health', label: 'Backend readiness', group: 'Connection and courses', build: () => get('/health/ready')},
  {id: 'courses', label: 'List courses', group: 'Connection and courses', build: () => get('/api/v1/courses')},
  {id: 'create-course', label: 'Create course', group: 'Connection and courses', build: () => post('/api/v1/courses', {title: 'Discrete mathematics debug'})},
  {id: 'enroll', label: 'Enroll student', group: 'Connection and courses', help: 'Send as staff. First check the student token with Who am I? to capture its user ID.', build: c => post(`${cpath(c)}/members`, {user_id: id(c, 'student-id'), role: 'student'})},
  {id: 'upload-key', label: 'Upload PDF answer key', group: 'Documents and assignments', help: 'Choose a PDF and send as staff before creating the assignment. The returned document ID becomes the answer key ID.', build: c => ({...post(`/api/v1/documents?course_id=${pathId(c, 'course-id')}&kind=answer_key`), format: 'pdf'})},
  {id: 'upload-rubric', label: 'Upload rubric PDF', group: 'Documents and assignments', help: 'Preserves the PDF. Add its document ID to assignment material_document_ids, then import or generate structured criteria.', build: c => ({...post(`/api/v1/documents?course_id=${pathId(c, 'course-id')}&kind=rubric`), format: 'pdf'})},
  {id: 'create-assignment', label: 'Create assignment (manual)', group: 'Documents and assignments', build: c => post(`${cpath(c)}/assignments`, assignmentBody(c, false))},
  {id: 'create-ai-assignment', label: 'Create assignment (AI enabled)', group: 'Documents and assignments', help: 'Requires server EXTERNAL_AI_ENABLED and credentials for AI calls. Set ocr_enabled to true for hosted GLM-OCR when ZAI_API_KEY is configured.', build: c => post(`${cpath(c)}/assignments`, assignmentBody(c, true))},
  {id: 'assignments', label: 'List assignments', group: 'Documents and assignments', build: c => get(`${cpath(c)}/assignments`)},
  {id: 'assignment', label: 'Read assignment', group: 'Documents and assignments', build: c => get(apath(c))},
  {id: 'rubric-import', label: 'Import rubric JSON', group: 'Rubrics', help: 'The editable example matches the sample induction question. For another question, replace criteria, bands and hints before publishing.', build: (c, rubric) => post(`${apath(c)}/rubric-versions`, rubric)},
  {id: 'rubric-draft', label: 'Generate rubric draft (AI)', group: 'Rubrics', build: c => post(`${apath(c)}/rubric-drafts:generate`, {instructions: 'Use the uploaded standards and accept valid alternative proofs.'})},
  {id: 'rubric', label: 'Read rubric', group: 'Rubrics', build: c => get(`/api/v1/rubric-versions/${pathId(c, 'rubric-id')}`)},
  {id: 'publish', label: 'Publish rubric', group: 'Rubrics', help: 'Publishing makes this rubric immutable. Review the rubric first.', build: c => post(`/api/v1/rubric-versions/${pathId(c, 'rubric-id')}:publish`)},
  {id: 'upload-work', label: 'Upload homework PDF', group: 'Submissions', help: 'Send as the student, or upload on their behalf as staff. Maximum 10 pages / 20 MiB with default server settings.', build: c => ({...post(`/api/v1/documents?course_id=${pathId(c, 'course-id')}&kind=submission`), format: 'pdf'})},
  {id: 'document', label: 'Read PDF geometry / regions', group: 'Submissions', help: 'The first returned step region fills the evidence region ID. Change it manually to target another step.', build: c => get(`${dpath(c)}?granularity=step`)},
  {id: 'document-file', label: 'Download original PDF', group: 'Submissions', build: c => get(`${dpath(c)}/file`)},
  {id: 'page-image', label: 'Read page image', group: 'Submissions', help: 'Page indexes start at zero. Edit the path for another page.', build: c => get(`${dpath(c)}/pages/0/image`)},
  {id: 'submit', label: 'Register submission', group: 'Submissions', help: 'Uses the homework document and enrolled student IDs.', build: c => post(`${apath(c)}/submissions`, {document_id: id(c, 'document-id'), student_id: id(c, 'student-id')})},
  {id: 'submissions', label: 'List submissions', group: 'Submissions', build: c => get(`${apath(c)}/submissions`)},
  {id: 'submission', label: 'Read submission', group: 'Submissions', build: c => get(spath(c))},
  {id: 'regions', label: 'Map question regions', group: 'Submissions', help: 'Staff only, before any assessment. Single-question homework needs no mapping. For multiple questions, add each question and its region IDs.', build: c => ({method: 'PUT', path: `${spath(c)}/regions`, format: 'json', body: {question_regions: {q1: [id(c, 'region-id')]}, manual_regions: []}})},
  {id: 'assess-manual', label: 'Create manual assessment', group: 'Assessment and feedback', help: 'Send as staff. Example outcomes match the sample rubric; change them to match the actual work.', build: c => post(`${spath(c)}/assessments`, {rubric_id: id(c, 'rubric-id'), source: 'manual', results: [
    {criterion_id: 'base_case', status: 'assessed', band_id: 'correct'}, {criterion_id: 'inductive_step', status: 'assessed', band_id: 'circular'}]})},
  {id: 'assess-ai', label: 'Create AI assessment', group: 'Assessment and feedback', help: 'Requires an AI-enabled assignment and a running worker. Send, then Watch job. Successful completion fills the assessment ID.', build: c => post(`${spath(c)}/assessments`, {rubric_id: id(c, 'rubric-id'), source: 'ai'})},
  {id: 'assessment', label: 'Read assessment', group: 'Assessment and feedback', help: 'Staff sees proposed scores, findings and current version. Students see scores only after finalization.', build: c => get(assessment(c))},
  {id: 'results', label: 'Replace criterion outcomes', group: 'Assessment and feedback', help: 'Read the assessment first for its latest version. Supply every criterion.', build: c => ({method: 'PUT', path: `${assessment(c)}/results`, format: 'json', body: {expected_version: Number(c['assessment-version']), results: [
    {criterion_id: 'base_case', status: 'assessed', band_id: 'correct'}, {criterion_id: 'inductive_step', status: 'assessed', band_id: 'partial'}]}})},
  {id: 'finding', label: 'Add manual finding', group: 'Assessment and feedback', help: 'Read document regions first. Edit the example diagnosis to match the actual evidence.', build: c => post(`${assessment(c)}/findings`, finding(c))},
  {id: 'edit-finding', label: 'Edit / dismiss finding', group: 'Assessment and feedback', help: 'This sends a full replacement. Edit all fields to match the existing finding; set dismissed to true to dismiss it.', build: c => ({method: 'PATCH', path: `/api/v1/findings/${pathId(c, 'finding-id')}`, format: 'json', body: {...finding(c), expected_version: Number(c['finding-version']), dismissed: false, confirmed: true}})},
  {id: 'feedback-bank', label: 'Request approved hints', group: 'Assessment and feedback', help: 'Available before grade finalization. The server enforces the disclosure cap.', build: c => post(`${assessment(c)}/feedback`, {source: 'bank', requested_level: 2})},
  {id: 'feedback-ai', label: 'Request AI hints', group: 'Assessment and feedback', help: 'Uncached hints return a job. Watch it, then read feedback history.', build: c => post(`${assessment(c)}/feedback`, {source: 'ai', requested_level: 2})},
  {id: 'feedback-history', label: 'Read feedback history', group: 'Assessment and feedback', build: c => get(`${spath(c)}/feedback`)},
  {id: 'math-check', label: 'Check polynomial identity', group: 'Assessment and feedback', build: c => post(`${assessment(c)}/math-checks`, {lhs: '(n+1)*(n+2)/2', rhs: 'n*(n+1)/2+n+1'})},
  {id: 'finalize', label: 'Finalize reviewed grade', group: 'Assessment and feedback', help: 'Instructor only. Read the assessment first for its latest version. Sending explicitly acknowledges your review.', build: c => post(`${assessment(c)}:finalize`, {expected_version: Number(c['assessment-version']), acknowledge_review: true})},
  {id: 'job', label: 'Read job', group: 'Jobs and analytics', build: c => get(job(c))},
  {id: 'retry', label: 'Retry failed job', group: 'Jobs and analytics', build: c => post(`${job(c)}:retry`)},
  {id: 'questions', label: 'Question analytics', group: 'Jobs and analytics', build: c => get(`${apath(c)}/analytics/questions?rubric_id=${pathId(c, 'rubric-id')}&attempt_policy=latest_assessed`)},
  {id: 'patterns', label: 'Pattern analytics', group: 'Jobs and analytics', build: c => get(`${apath(c)}/analytics/patterns?rubric_id=${pathId(c, 'rubric-id')}&attempt_policy=latest_assessed`)},
  {id: 'schema', label: 'OpenAPI schema', group: 'Jobs and analytics', build: () => get('/openapi.json')},
];

export function captureContext(context, result, identity) {
  const c = {...context}, d = result.data;
  if (!result.ok || !d || Array.isArray(d)) return c;
  const path = new URL(result.url).pathname;
  const post = result.method === 'POST';
  if (path === '/api/v1/me' && identity === 'student') c['student-id'] = d.id;
  if (path === '/api/v1/courses' && post) c['course-id'] = d.id;
  if (/\/assignments$/.test(path) && post) c['assignment-id'] = d.id;
  if (d.pages && d.id) {
    if (c['document-id'] !== d.id) c['region-id'] = '';
    c['document-id'] = d.id;
    if (d.kind === 'answer_key') c['answer-key-id'] = d.id;
    if (d.regions?.length) c['region-id'] = d.regions[0].id;
  }
  if (d.spec && d.assignment_id) c['rubric-id'] = d.id;
  if (d.revision && d.document_id && d.student_id) {
    c['submission-id'] = d.id; c['document-id'] = d.document_id;
    c['student-id'] = d.student_id; c['assignment-id'] = d.assignment_id;
  }
  if (d.kind && ['assessment', 'rubric_draft', 'feedback'].includes(d.kind)) {
    c['job-id'] = d.id;
    if (d.status === 'succeeded' && d.result_id) {
      if (d.kind === 'assessment') { c['assessment-id'] = d.result_id; c['assessment-version'] = '1'; }
      if (d.kind === 'rubric_draft') c['rubric-id'] = d.result_id;
    }
  }
  if (d.id && /^\/api\/v1\/assessments\/[^/]+(?::finalize|\/results)?$/.test(path) && d.version) {
    c['assessment-id'] = d.id; c['assessment-version'] = String(d.version);
  }
  if (d.id && d.criterion_id && d.assessment_id && d.version) {
    c['finding-id'] = d.id; c['finding-version'] = String(d.version);
  }
  return c;
}
