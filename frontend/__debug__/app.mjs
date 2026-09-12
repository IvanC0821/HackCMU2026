import {runSample, approveSample} from './sample.mjs';
import {newKey, sendRequest, watchJob} from './api.mjs';
import {captureContext, presets} from './presets.mjs';

const $ = id => document.getElementById(id);
const contextIDs = ['course-id', 'student-id', 'assignment-id', 'answer-key-id', 'document-id',
  'rubric-id', 'submission-id', 'assessment-id', 'finding-id', 'region-id', 'job-id',
  'assessment-version', 'finding-version'];
let controller, blobURL, sampleRubric, guidedSample;
const context = () => Object.fromEntries(contextIDs.map(id => [id, $(id).value.trim()]));
const token = () => $(`${$('identity').value}-token`).value;

function clearBinary() {
  if (blobURL) URL.revokeObjectURL(blobURL);
  blobURL = undefined;
  $('download').hidden = $('image').hidden = true;
  $('download').removeAttribute('href');
  $('image').removeAttribute('src');
}

function display(result, identity) {
  clearBinary();
  $('status').textContent = `HTTP ${result.status} · ${result.elapsedMs} ms${result.ok ? '' : ' · request failed'}`;
  $('request-info').textContent = `${result.method} ${result.url}\nContent-Type: ${result.contentType || '(none)'}`;
  $('output').textContent = result.data === undefined ? (result.text || '') : JSON.stringify(result.data, null, 2);
  if (result.blob) {
    blobURL = URL.createObjectURL(result.blob);
    const extension = result.contentType.includes('pdf') ? 'pdf' : result.contentType.includes('png') ? 'png' : 'bin';
    $('download').href = blobURL;
    $('download').download = `response.${extension}`;
    $('download').hidden = false;
    $('output').textContent = `Binary response: ${result.blob.size} bytes.`;
    if (result.contentType === 'image/png') { $('image').src = blobURL; $('image').hidden = false; }
  }
  const next = captureContext(context(), result, identity);
  contextIDs.forEach(id => { $(id).value = next[id] ?? ''; });
}

function busy(value) {
  for (const id of ['send', 'watch', 'load', 'preset', 'sample-run']) $(id).disabled = value;
  $('stop').disabled = !value;
  $('sample-approve').disabled = value || !guidedSample || guidedSample.approved;
}

async function run(action) {
  if (controller) return;
  const ownController = new AbortController();
  controller = ownController;
  busy(true);
  $('status').textContent = 'Waiting for response…';
  try { await action(ownController.signal); }
  catch (error) {
    $('status').textContent = error.name === 'AbortError'
      ? 'Stopped waiting. Any server job already created continues running.'
      : `Error: ${error.message}${error instanceof TypeError ? ' Check the API origin, server status, and CORS configuration.' : ''}`;
  } finally {
    if (controller === ownController) { controller = undefined; busy(false); }
  }
}

async function loadPreset() {
  const preset = presets.find(p => p.id === $('preset').value);
  if (preset.id === 'rubric-import' && !sampleRubric) {
    const response = await fetch('./sample-rubric.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Could not load the sample rubric. Paste your rubric JSON manually.');
    sampleRubric = await response.json();
  }
  const request = preset.build(context(), sampleRubric);
  $('method').value = request.method;
  $('path').value = request.path;
  $('body-format').value = request.format;
  $('body').value = request.body === undefined ? '' : JSON.stringify(request.body, null, 2);
  $('preset-help').textContent = preset.help || 'Edit the request as needed, then send it using the selected identity.';
  $('idempotency-key').value = request.method === 'GET' ? '' : newKey();
}

const groups = new Map();
for (const preset of presets) {
  if (!groups.has(preset.group)) {
    const group = document.createElement('optgroup');
    group.label = preset.group; groups.set(preset.group, group); $('preset').append(group);
  }
  const option = document.createElement('option');
  option.value = preset.id; option.textContent = preset.label;
  groups.get(preset.group).append(option);
}
const prepare = () => loadPreset().catch(error => { $('status').textContent = `Error: ${error.message}`; });
$('preset').addEventListener('change', prepare);
$('load').addEventListener('click', prepare);
$('new-key').addEventListener('click', () => { $('idempotency-key').value = newKey(); });
$('stop').addEventListener('click', () => controller?.abort());
$('clear').addEventListener('click', () => {
  controller?.abort();
  $('staff-token').value = $('student-token').value = '';
  $('output').textContent = $('request-info').textContent = '';
  clearBinary();
  $('status').textContent = 'Tokens and output cleared.';
  guidedSample = undefined;
  $('sample-approve').disabled = true;
});
$('request-form').addEventListener('submit', event => {
  event.preventDefault();
  const identity = $('identity').value;
  const options = {origin: $('api-origin').value.trim(), path: $('path').value.trim(), method: $('method').value,
    token: token(), format: $('body-format').value, text: $('body').value, file: $('pdf-file').files[0],
    key: $('idempotency-key').value};
  run(async signal => { const result = await sendRequest({...options, signal}); if (!signal.aborted) display(result, identity); });
});
$('watch').addEventListener('click', () => {
  const identity = $('identity').value;
  const options = {origin: $('api-origin').value.trim(), token: token(), jobId: $('job-id').value.trim()};
  run(signal => watchJob({...options, signal, onResult: result => { if (!signal.aborted) display(result, identity); }}));
});
window.addEventListener('pagehide', () => { controller?.abort(); clearBinary(); $('staff-token').value = $('student-token').value = ''; });
prepare();

$('sample-run').addEventListener('click', () => {
  guidedSample = undefined;
  for (const id of ['sample-mistake', 'sample-hint', 'sample-score']) $(id).textContent = '';
  run(async signal => {
    try {
      const sample = await runSample({signal,
        onStep: text => { $('sample-status').textContent = text; },
        onSession: seed => {
          $('api-origin').value = seed.api_origin;
          $('staff-token').value = seed.tokens.staff;
          $('student-token').value = seed.tokens.student;
          contextIDs.forEach(id => { $(id).value = id.endsWith('-version') ? '1' : ''; });
        }, onResponse: display});
      signal.throwIfAborted();
      guidedSample = sample;
      $('identity').value = 'student';
      $('sample-status').textContent = 'Sample complete. Here is what the student sees:';
      $('sample-mistake').textContent = 'Mistake: the proof assumes the result for k + 1 instead of proving it.';
      $('sample-hint').textContent = 'Hint: ' + sample.hint;
      $('sample-score').textContent = 'Grade: waiting for teacher approval.';
    } catch (error) {
      $('sample-status').textContent = 'Could not finish the sample: ' + error.message;
      throw error;
    }
  });
});
$('sample-approve').addEventListener('click', () => {
  if (!guidedSample || guidedSample.approved) return;
  run(async signal => {
    try {
      const score = await approveSample(guidedSample, signal);
      $('sample-score').textContent = `Grade: ${score}/10 - approved by the sample teacher.`;
      $('sample-status').textContent = 'Teacher approval complete. The grade is now visible to the student.';
    } catch (error) {
      $('sample-status').textContent = 'Could not approve the sample: ' + error.message;
      throw error;
    }
  });
});
window.addEventListener('pagehide', () => { guidedSample = undefined; });
