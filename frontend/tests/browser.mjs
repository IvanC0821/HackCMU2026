import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';

const frontend = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const backend = path.resolve(frontend, '../backend');
const server = createServer(async (req, res) => {
  try {
    let requested = new URL(req.url, 'http://localhost').pathname;
    if (requested.endsWith('/')) requested += 'index.html';
    const target = path.resolve(frontend, '.' + requested);
    if (!target.startsWith(frontend + path.sep)) throw new Error('invalid path');
    const contentType = target.endsWith('.mjs') ? 'text/javascript' : target.endsWith('.json') ? 'application/json' : 'text/html';
    const body = await readFile(target);
    res.writeHead(200, {'Content-Type': contentType}); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const fixture = spawn(python, [path.join(frontend, 'tests/serve_fixture.py'), origin], {cwd: backend, stdio: ['ignore', 'pipe', 'pipe']});
const lines = createInterface({input: fixture.stdout});
let browser, backendErrors = '';
fixture.stderr.on('data', chunk => { backendErrors += chunk; });
try {
  const data = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Backend fixture did not start. ' + backendErrors)), 10000);
    lines.once('line', line => { clearTimeout(timeout); resolve(JSON.parse(line)); });
    fixture.once('error', error => { clearTimeout(timeout); reject(error); });
    fixture.once('exit', code => { if (code) { clearTimeout(timeout); reject(new Error('Backend fixture failed. ' + backendErrors)); } });
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(data.origin + '/health/ready')).ok) break; } catch {}
    if (i === 99) throw new Error('Backend was not ready');
    await new Promise(r => setTimeout(r, 50));
  }
  browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  assert.equal((await page.goto(origin + '/__debug__/')).status(), 200);
  await page.locator('#api-origin').fill(data.origin);
  await page.locator('#staff-token').fill(data.tokens.staff);
  await page.locator('#student-token').fill(data.tokens.student);

  async function request(preset, identity = 'staff', edit) {
    await page.selectOption('#identity', identity);
    await page.selectOption('#preset', preset);
    if (preset === 'rubric-import') await page.waitForFunction(() => document.querySelector('#body').value.includes('base_case'));
    if (edit) await edit();
    const method = await page.inputValue('#method');
    const url = data.origin + await page.inputValue('#path');
    const response = page.waitForResponse(r => r.url() === url && r.request().method() === method);
    await page.click('#send');
    const received = await response;
    await page.waitForFunction(() => !document.querySelector('#send').disabled);
    const text = await page.textContent('#output');
    return {status: received.status(), data: text?.startsWith('{') || text?.startsWith('[') ? JSON.parse(text) : text};
  }
  assert.equal((await request('me', 'student')).status, 200);
  assert.equal((await request('me')).status, 200);
  assert.equal(await page.evaluate(() => window.unsafe), undefined, 'Response HTML must remain plain text');
  assert.equal((await request('create-course')).status, 201);
  assert.equal((await request('enroll')).status, 201);
  const file = {name: 'homework.pdf', mimeType: 'application/pdf', buffer: Buffer.from(data.pdf, 'base64')};
  await page.setInputFiles('#pdf-file', file);
  assert.equal((await request('upload-key')).status, 201);
  assert.equal((await request('create-assignment')).status, 201);
  assert.equal((await request('rubric-import')).status, 201);
  assert.equal((await request('publish')).status, 200);
  assert.equal((await request('upload-work', 'student')).status, 201);
  assert.equal((await request('document', 'student')).status, 200);
  assert.equal((await request('submit', 'student')).status, 201);
  const assessmentJob = await request('assess-manual');
  assert.equal(assessmentJob.status, 202);
  assert.equal(assessmentJob.data.status, 'succeeded');
  const manualKey = await page.inputValue('#idempotency-key');
  assert(!('score' in (await request('assessment', 'student')).data));
  assert.equal((await request('finding')).status, 201);
  const hint = await request('feedback-bank', 'student', () => page.fill('#body', JSON.stringify({source: 'bank', requested_level: 4})));
  assert.equal(hint.data.effective_level, 2);
  assert.equal(hint.data.items[0].level, 2);
  await request('assessment');
  assert.equal((await request('finalize')).status, 200);
  assert.equal((await request('assessment', 'student')).data.score, 2);
  const retry = await request('assess-manual', 'staff', () => page.fill('#idempotency-key', manualKey));
  assert.equal(retry.data.id, assessmentJob.data.id);
  await page.click('#watch');
  await page.waitForFunction(() => !document.querySelector('#watch').disabled);
  assert.equal(JSON.parse(await page.textContent('#output')).status, 'succeeded');
  assert.equal((await request('assess-ai', 'student')).status, 503);
  assert((await page.textContent('#output')).includes('external_ai_disabled'));
  await page.fill('#body', '{');
  await page.click('#send');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('JSON body is invalid'));
  assert.equal((await request('document-file', 'student')).status, 200);
  assert(await page.locator('#download').isVisible());
  assert.equal((await request('page-image', 'student')).status, 200);
  await page.waitForFunction(() => document.querySelector('#image').naturalWidth > 0);
  await request('feedback-history', 'student');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert(!(await page.textContent('#request-info')).includes(data.tokens.student));
  await page.screenshot({path: '/private/tmp/verity-debug-console.png', fullPage: true});
  await page.click('#clear');
  assert.equal(await page.inputValue('#staff-token'), '');
  assert.equal(await page.inputValue('#student-token'), '');
  assert.equal(await page.textContent('#output'), '');
  assert.deepEqual(pageErrors, []);
  await page.goto(origin + '/');
  assert.equal(await page.locator('a[href*="__debug__"]').count(), 0);
  console.log('Browser workflow passed: PDF upload, rubric, grading, bounded hints, review, binary output, retries, errors and token clearing.');
} finally {
  await browser?.close();
  lines.close();
  fixture.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
