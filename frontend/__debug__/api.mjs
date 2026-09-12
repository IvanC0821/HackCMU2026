// Network helpers are independent of the DOM so request behavior can be tested.
export function requestURL(origin, path) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash) {
    throw new Error('API origin must be an HTTP(S) origin without a path, credentials, query, or fragment.');
  }
  if (!/^\/(api\/v1(?:\/|$)|health\/(?:live|ready)(?:\?|$)|openapi\.json(?:\?|$))/.test(path) ||
      path.includes('\\') || /[\r\n]/.test(path)) {
    throw new Error('Use an API path starting with /api/v1/, /health/, or /openapi.json.');
  }
  const url = new URL(path, base);
  if (url.origin !== base.origin || url.hash || !['/api/v1', '/openapi.json', '/health/live', '/health/ready'].some(
    prefix => url.pathname === prefix || (prefix === '/api/v1' && url.pathname.startsWith(prefix + '/')))) {
    throw new Error('Request must stay on the selected API origin and path.');
  }
  if (/[{}]/.test(path)) throw new Error('Fill the resource IDs, then reload the preset.');
  return url.href;
}

export function newKey() {
  return crypto.randomUUID();
}

export async function sendRequest({origin, path, method, token, format, text, file, key, signal}, fetcher = fetch) {
  const url = requestURL(origin, path);
  if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) throw new Error('Unsupported method.');
  const headers = {Accept: 'application/json, application/pdf, image/png, text/plain'};
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`;
  if (key?.trim()) headers['Idempotency-Key'] = key.trim();
  let body;
  if (method !== 'GET' && format === 'json') {
    try { body = JSON.stringify(JSON.parse(text)); }
    catch { throw new Error('JSON body is invalid. Nothing was sent.'); }
    headers['Content-Type'] = 'application/json';
  } else if (method !== 'GET' && format === 'pdf') {
    if (!file) throw new Error('Choose a PDF file. Nothing was sent.');
    body = new FormData();
    body.append('file', file);
  }
  const started = performance.now();
  const response = await fetcher(url, {method, headers, body, signal, credentials: 'omit', redirect: 'error', cache: 'no-store'});
  const contentType = response.headers.get('content-type') || '';
  const result = {ok: response.ok, status: response.status, method, url, contentType,
    elapsedMs: Math.round(performance.now() - started)};
  if (contentType.includes('application/json')) {
    const raw = await response.text();
    try { result.data = JSON.parse(raw); }
    catch { result.text = raw; }
  } else if (contentType.includes('application/pdf') || contentType.startsWith('image/') || contentType.includes('octet-stream')) {
    result.blob = await response.blob();
  } else {
    result.text = await response.text();
  }
  return result;
}

export async function watchJob({origin, jobId, token, signal, onResult, interval = 1000, maxPolls = 300}, fetcher = fetch) {
  if (!jobId) throw new Error('Set a job ID first.');
  for (let i = 0; i < maxPolls; i++) {
    signal?.throwIfAborted();
    const result = await sendRequest({origin, path: `/api/v1/jobs/${encodeURIComponent(jobId)}`, method: 'GET', token, signal}, fetcher);
    onResult(result);
    if (!result.ok || ['succeeded', 'failed'].includes(result.data?.status)) return result;
    await new Promise((resolve, reject) => {
      const done = () => { signal?.removeEventListener('abort', cancel); resolve(); };
      const timer = setTimeout(done, interval);
      const cancel = () => { clearTimeout(timer); reject(new DOMException('Stopped waiting', 'AbortError')); };
      signal?.addEventListener('abort', cancel, {once: true});
      if (signal?.aborted) cancel();
    });
  }
  throw new Error('Stopped watching after 5 minutes. The server job may still be running; watch again to continue.');
}
