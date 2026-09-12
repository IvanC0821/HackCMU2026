import test from 'node:test';
import assert from 'node:assert/strict';
import {apiURL, apiRequest, mapDraft, generateApiDraft} from '../api.mjs';
import {newWorkspace, loadSampleRubric} from '../model.mjs';
test('API origin validation prevents credential leakage and unsafe redirects', async () => {
  for (const origin of ['https://user:pass@example.com','http://example.com','file:///tmp/x','https://example.com/path']) assert.throws(()=>apiURL(origin,'/api/v1/me'));
  assert.throws(()=>apiURL('https://example.com','//evil.com/api/v1/me'));
  let init;
  await apiRequest({origin:'https://example.com',token:'private-token'},'/api/v1/me',{},async(url,options)=>{init=options; return new Response('{}',{status:200});});
  assert.equal(init.redirect,'error'); assert.equal(init.credentials,'omit'); assert.equal(init.headers.Authorization,'Bearer private-token');
});
test('API errors are surfaced and do not become false success', async () => {
  await assert.rejects(()=>apiRequest({origin:'http://localhost:8000',token:'test'},'/api/v1/me',{},async()=>new Response('{"detail":"external_ai_disabled"}',{status:503})),/external_ai_disabled/);
});
test('backend performance bands preserve their exact point values', () => {
  const s=newWorkspace();loadSampleRubric(s);
  const spec={criteria:[{id:'test',question_id:'q1',requirement:'Give a justification',max_points:'5.50',bands:[{id:'full',description:'Valid',points:'5.50'},{id:'partial',description:'Incomplete',points:'2.25'}]}]};
  const mapped=mapDraft(spec,s.draft); assert.equal(mapped[0].criteria[0].max,5.5);assert.equal(mapped[0].criteria[0].bands[1].points,2.25);
  assert.deepEqual(mapped[0].assignmentPages,[1]); assert.equal(mapped[1].criteria.length,0);
  spec.criteria[0].question_id='unknown';assert.throws(()=>mapDraft(spec,s.draft),/unknown question/);
});
test('live drafting sends PDFs only on explicit invocation and follows existing contract routes', async () => {
  const s=newWorkspace();loadSampleRubric(s);
  for(const d of [s.documents.blank,s.documents.solution,...s.documents.examples]) {d.sample=false;d.blob=new Blob(['%PDF-test'],{type:'application/pdf'});}
  const calls=[];
  const fetcher=async(url,init)=>{
    calls.push({url,init});
    let result;
    if(url.includes('/documents?')) result={id:`doc-${calls.length}`};
    else if(url.endsWith('/courses/course-1/assignments')) {const body=JSON.parse(init.body);assert.equal(body.external_ai_allowed,true);assert.equal(body.material_document_ids.length,3);result={id:'assignment-1'};}
    else if(url.endsWith('/rubric-drafts:generate')) {assert(init.headers['Idempotency-Key']);result={id:'job-1',status:'pending'};}
    else if(url.endsWith('/jobs/job-1')) result={id:'job-1',status:'succeeded',result_id:'rubric-1'};
    else if(url.endsWith('/rubric-versions/rubric-1')) result={id:'rubric-1',spec:{criteria:[{id:'c1',question_id:'q1',requirement:'Reasoning',max_points:10,bands:[{id:'full',description:'Valid',points:10}]}]}};
    else throw new Error(url);
    return new Response(JSON.stringify(result),{status:200});
  };
  const result=await generateApiDraft({origin:'http://localhost:8000',token:'test',courseId:'course-1'},s,()=>{},undefined,fetcher,async()=>{});
  assert.equal(result.assignmentId,'assignment-1');assert.equal(result.questions[0].criteria[0].label,'Reasoning');
  assert.equal(calls.length,7);assert(calls.every(c=>!c.url.includes(':publish')));
});
test('sample files cannot be mistaken for uploaded references in live generation', async()=>{
  const s=newWorkspace();loadSampleRubric(s);
  await assert.rejects(()=>generateApiDraft({origin:'http://localhost:8000',token:'test',courseId:'c'},s),/Attach local PDFs/);
});
