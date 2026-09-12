import {post, json} from './client.mjs';
import {mapDraft} from '../staff/api.mjs';

export async function generateConnectedDraft(workspace, progress, signal,
    transport = {post, json}, pause = ms => new Promise(r => setTimeout(r, ms))) {
  const refs = [workspace.documents.blank, workspace.documents.solution, ...workspace.documents.examples].filter(Boolean);
  progress(`Reading ${refs.length} saved reference PDFs. Detailed rubric drafting can take several minutes; grades stay unchanged.`);
  const key = `verity-rubric-${workspace.revision}`;
  // Recover a running/completed request after Stop waiting or a reload, without another paid call.
  const saved = globalThis.sessionStorage?.getItem(key);
  let job = saved ? await transport.json(`/rubric-drafts/${encodeURIComponent(saved)}`) : await transport.post('/rubric-drafts', {
    expectedRevision: workspace.revision, consent: true, requestId: crypto.randomUUID(),
  });
  globalThis.sessionStorage?.setItem(key, job.id);
  for (let i = 0; i < 340; i++) {
    signal?.throwIfAborted();
    if (job.status === 'succeeded') {
      if (job.revision !== workspace.revision) throw Error('This draft belongs to an older workspace. No changes were applied.');
      return {questions: mapDraft(job.spec, workspace.draft, refs), rubricId: job.id, assignmentId: 'classroom', spec: job.spec, coverage: job.coverage};
    }
    if (job.status === 'failed') {
      globalThis.sessionStorage?.removeItem(key);
      throw Error(job.error || 'Rubric generation failed. Nothing was applied.');
    }
    progress(`Drafting from ${job.coverage.documents} PDFs · ${job.coverage.pages} pages. Job ${job.id}. You can stop waiting and resume; no grades are changing.`);
    await pause(2000); signal?.throwIfAborted();
    job = await transport.json(`/rubric-drafts/${encodeURIComponent(job.id)}`);
  }
  throw Error(`Draft ${job.id} is still pending. Generate AI draft will resume this request, without starting another model call.`);
}
