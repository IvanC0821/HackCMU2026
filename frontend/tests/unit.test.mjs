import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requestURL, sendRequest, watchJob} from '../__debug__/api.mjs';
import {captureContext, presets} from '../__debug__/presets.mjs';

test('request paths cannot send bearer tokens to a different origin or path', () => {
  assert.equal(requestURL('http://localhost:8000', '/api/v1/me'), 'http://localhost:8000/api/v1/me');
  for (const path of ['https://example.com/api/v1/me', '//example.com/api/v1/me', '/api/v1/../../secret', '/api/v1/\\example.com', '/api/v1/me#token', '/api/v1/courses/{course-id}']) {
    assert.throws(() => requestURL('http://localhost:8000', path));
  }
  for (const origin of ['file:///tmp', 'http://token@example.com', 'https://example.com/path', 'https://example.com?token=secret']) {
    assert.throws(() => requestURL(origin, '/api/v1/me'));
  }
});

test('JSON requests preserve idempotency and keep credentials out of displayed metadata', async () => {
  const result = await sendRequest({origin: 'http://localhost:8000', path: '/api/v1/courses', method: 'POST',
    token: 'Bearer private-token', key: 'same-key', format: 'json', text: '{"title":"Test"}'}, async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    assert.equal(options.headers['Idempotency-Key'], 'same-key');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    return new Response('{"id":"course"}', {status: 201, headers: {'Content-Type': 'application/json'}});
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.id, 'course');
  assert(!JSON.stringify(result).includes('private-token'));
});

test('invalid JSON and missing files are rejected before a network call', async () => {
  const never = () => { throw new Error('network should not be used'); };
  const base = {origin: 'http://localhost:8000', path: '/api/v1/documents', method: 'POST'};
  await assert.rejects(sendRequest({...base, format: 'json', text: '{'}, never), /JSON body is invalid/);
  await assert.rejects(sendRequest({...base, format: 'pdf'}, never), /Choose a PDF/);
});

test('PDF multipart uses the browser boundary and accepts binary responses', async () => {
  const file = new File(['%PDF-'], 'work.pdf', {type: 'application/pdf'});
  const result = await sendRequest({origin: 'http://localhost:8000', path: '/api/v1/documents?course_id=c&kind=submission',
    method: 'POST', format: 'pdf', file}, async (url, options) => {
    assert(options.body instanceof FormData);
    assert.equal(options.body.get('file').name, 'work.pdf');
    assert.equal(options.headers['Content-Type'], undefined);
    return new Response('%PDF-', {headers: {'Content-Type': 'application/pdf'}});
  });
  assert(result.blob instanceof Blob);
});

test('job watching only reads and stops at terminal states', async () => {
  const states = ['queued', 'running', 'succeeded'], seen = [];
  const done = await watchJob({origin: 'http://localhost:8000', jobId: 'j', interval: 1,
    onResult: r => seen.push(r.data.status)}, async (url, options) => {
    assert.equal(options.method, 'GET');
    return new Response(JSON.stringify({id: 'j', kind: 'assessment', status: states.shift(), result_id: 'a'}),
      {headers: {'content-type': 'application/json'}});
  });
  assert.deepEqual(seen, ['queued', 'running', 'succeeded']);
  assert.equal(done.data.result_id, 'a');
});

test('watching can be aborted without another request', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(watchJob({origin: 'http://localhost:8000', jobId: 'j', signal: controller.signal,
    onResult: () => {}}, () => { throw new Error('must not fetch'); }), {name: 'AbortError'});
});

test('returned job and document IDs track their own resource types', () => {
  const base = {ok: true, method: 'POST', url: 'http://localhost:8000/api/v1/submissions/s/assessments'};
  assert.equal(captureContext({}, {...base, data: {id: 'j', kind: 'assessment', status: 'succeeded', result_id: 'a'}}, 'staff')['assessment-id'], 'a');
  const feedback = captureContext({'assessment-id': 'a'}, {...base, data: {id: 'f', kind: 'feedback', status: 'succeeded', result_id: 'issued'}}, 'student');
  assert.equal(feedback['assessment-id'], 'a');
  const next = captureContext({'document-id': 'old', 'region-id': 'stale'}, {...base, data: {id: 'new', kind: 'submission', pages: []}}, 'student');
  assert.equal(next['region-id'], '');
  assert.deepEqual(captureContext({}, {...base, ok: false, data: {id: 'do-not-capture'}}, 'staff'), {});
});

test('every preset resolves its route with supplied IDs and the rubric example matches the backend', async () => {
  const rubric = JSON.parse(await readFile(new URL('../__debug__/sample-rubric.json', import.meta.url)));
  const backendRubric = JSON.parse(await readFile(new URL('../../backend/examples/rubric.json', import.meta.url)));
  assert.deepEqual(rubric, backendRubric);
  const c = Object.fromEntries(['course-id', 'student-id', 'assignment-id', 'answer-key-id', 'document-id', 'rubric-id',
    'submission-id', 'assessment-id', 'finding-id', 'region-id', 'job-id', 'assessment-version', 'finding-version'].map(k => [k, '1']));
  assert.equal(new Set(presets.map(p => p.id)).size, presets.length);
  for (const preset of presets) {
    const request = preset.build(c, rubric);
    assert.doesNotThrow(() => requestURL('http://localhost:8000', request.path), preset.id);
  }
});
