import {newKey, sendRequest} from './api.mjs';

function pdfFile(encoded, name) {
  return new File([Uint8Array.from(atob(encoded), c => c.charCodeAt(0))], name, {type: 'application/pdf'});
}

export async function runSample({signal, onStep, onSession, onResponse}) {
  onStep('Loading the sample files and classroom…');
  const sessionResponse = await fetch('./session', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: '{}', credentials: 'omit', cache: 'no-store', redirect: 'error', signal});
  if (!sessionResponse.ok) throw new Error('Sample mode needs the local demo server. Start it with: cd backend && uv run python -m scripts.debug_server');
  const seed = await sessionResponse.json();
  if (seed.demo !== true) throw new Error('This server did not provide an isolated sample session.');
  onSession(seed);
  async function request(role, method, path, body, file, activeSignal = signal) {
    activeSignal.throwIfAborted();
    const response = await sendRequest({origin: seed.api_origin, token: seed.tokens[role], method, path,
      format: file ? 'pdf' : body === undefined ? 'none' : 'json', file,
      text: body === undefined ? '' : JSON.stringify(body), key: method === 'GET' ? '' : newKey(), signal: activeSignal});
    activeSignal.throwIfAborted();
    onResponse(response, role);
    if (!response.ok) throw new Error(`Sample request failed (HTTP ${response.status}): ${JSON.stringify(response.data?.detail || response.text)}`);
    return response.data;
  }
  const student = await request('student', 'GET', '/api/v1/me');
  const course = await request('staff', 'POST', '/api/v1/courses', {title: 'Sample discrete math classroom'});
  await request('staff', 'POST', `/api/v1/courses/${course.id}/members`, {user_id: student.id, role: 'student'});
  onStep('Loading the answer key and rubric…');
  const key = await request('staff', 'POST', `/api/v1/documents?course_id=${course.id}&kind=answer_key`, undefined,
    pdfFile(seed.answer_key_pdf, 'sample-answer-key.pdf'));
  const assignment = await request('staff', 'POST', `/api/v1/courses/${course.id}/assignments`, {
    title: 'Sample induction homework', questions: [{id: 'q1', prompt: 'Prove that 1 + 2 + ... + n = n(n + 1) / 2.'}],
    material_document_ids: [key.id], external_ai_allowed: false, feedback_policy: {max_disclosure_level: 2, release_level: 2}});
  const rubric = await request('staff', 'POST', `/api/v1/assignments/${assignment.id}/rubric-versions`, seed.rubric);
  await request('staff', 'POST', `/api/v1/rubric-versions/${rubric.id}:publish`);
  onStep('Uploading the sample homework and applying the example grading…');
  const doc = await request('student', 'POST', `/api/v1/documents?course_id=${course.id}&kind=submission`, undefined,
    pdfFile(seed.homework_pdf, 'sample-homework.pdf'));
  const regions = await request('student', 'GET', `/api/v1/documents/${doc.id}`);
  const evidence = regions.regions.find(r => r.text.includes('Assume the formula is true for k + 1'));
  if (!evidence) throw new Error('The expected sample proof step was not found in the PDF.');
  const submission = await request('student', 'POST', `/api/v1/assignments/${assignment.id}/submissions`, {document_id: doc.id});
  const job = await request('staff', 'POST', `/api/v1/submissions/${submission.id}/assessments`, {
    rubric_id: rubric.id, source: 'manual', results: [
      {criterion_id: 'base_case', status: 'assessed', band_id: 'correct'},
      {criterion_id: 'inductive_step', status: 'assessed', band_id: 'circular'}]});
  await request('staff', 'POST', `/api/v1/assessments/${job.result_id}/findings`, {
    criterion_id: 'inductive_step', pattern_id: 'circular_induction', category: 'conceptual',
    description: 'The proof assumes the conclusion for k + 1 instead of deriving it from the k case.', evidence_region_ids: [evidence.id]});
  onStep('Getting the student hint…');
  const hint = await request('student', 'POST', `/api/v1/assessments/${job.result_id}/feedback`, {source: 'bank', requested_level: 2});
  const studentView = await request('student', 'GET', `/api/v1/assessments/${job.result_id}`);
  if ('score' in studentView) throw new Error('A proposed score was unexpectedly visible before review.');
  return {assessmentId: job.result_id, hint: hint.items[0].text, request, approved: false};
}

export async function approveSample(sample, signal) {
  const assessment = await sample.request('staff', 'GET', `/api/v1/assessments/${sample.assessmentId}`, undefined, undefined, signal);
  await sample.request('staff', 'POST', `/api/v1/assessments/${sample.assessmentId}:finalize`, {
    expected_version: assessment.version, acknowledge_review: true}, undefined, signal);
  const studentView = await sample.request('student', 'GET', `/api/v1/assessments/${sample.assessmentId}`, undefined, undefined, signal);
  sample.approved = true;
  return studentView.score;
}
