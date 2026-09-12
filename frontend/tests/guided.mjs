import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const port = await freePort(), apiPort = await freePort();
const origin = `http://127.0.0.1:${port}`;
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const processHandle = spawn(path.join(root, 'backend/.venv/bin/python'), ['-m', 'scripts.debug_server', '--port', String(port), '--api-port', String(apiPort)], {
  cwd: path.join(root, 'backend'), stdio: ['ignore', 'pipe', 'pipe']});
const lines = createInterface({input: processHandle.stdout});
let browser, logs = '';
processHandle.stderr.on('data', data => { logs += data; });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sample server did not start: ' + logs)), 15000);
    lines.on('line', line => { if (line.startsWith('Sample website ready:')) { clearTimeout(timer); resolve(); } });
    processHandle.once('error', error => { clearTimeout(timer); reject(error); });
    processHandle.once('exit', code => { if (code) { clearTimeout(timer); reject(new Error(logs)); } });
  });
  const request = headers => fetch(origin + '/__debug__/session', {method: 'POST', headers, body: '{}'});
  assert.equal((await request({'Content-Type': 'application/json'})).status, 403);
  assert.equal((await request({'Content-Type': 'application/json', Origin: 'https://example.com'})).status, 403);
  assert.equal((await fetch(origin + '/__debug__/session')).status, 405);
  browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/__debug__/');
  assert.equal(await page.locator('#advanced').getAttribute('open'), null);
  assert.equal(await page.inputValue('#staff-token'), '');
  await page.click('#sample-run');
  await page.waitForFunction(() => document.querySelector('#sample-status').textContent.includes('Sample complete'), {timeout: 20000});
  assert((await page.textContent('#sample-hint')).includes('Separate what you may assume'));
  assert((await page.textContent('#sample-score')).includes('waiting for teacher approval'));
  assert(!(await page.textContent('#sample-score')).includes('2/10'));
  assert(await page.locator('#sample-approve').isEnabled());
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  await page.click('#sample-approve');
  await page.waitForFunction(() => document.querySelector('#sample-score').textContent.includes('2/10'));
  assert(await page.locator('#sample-approve').isDisabled());
  assert.deepEqual(errors, []);
  await page.screenshot({path: '/private/tmp/verity-guided-sample.png', fullPage: true});
  console.log('Guided sample passed: one click, no token entry, real PDFs and API, immediate hint, separate teacher approval, and protected local session.');
} finally {
  await browser?.close();
  lines.close();
  processHandle.kill('SIGTERM');
  if (processHandle.exitCode === null) await new Promise(resolve => processHandle.once('exit', resolve));
}
