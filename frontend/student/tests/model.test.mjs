import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMapping,togglePage,mappingIssues,validatePdf,makeRevision,assessSubmission,sampleResult,gradedExampleResult} from '../model.mjs';

test('multiple pages per question and overlapping question mappings stay independent',()=>{
  const original=emptyMapping();
  let mapping=togglePage(original,'q1',2);
  mapping=togglePage(mapping,'q1',0);
  mapping=togglePage(mapping,'q2',0);
  assert.deepEqual(mapping,{q1:[0,2],q2:[0],q3:[]});
  assert.deepEqual(original,emptyMapping());
  assert.deepEqual(togglePage(mapping,'q1',0),{q1:[2],q2:[0],q3:[]});
});
test('all questions need a valid page, including page zero',()=>{
  assert.deepEqual(mappingIssues(emptyMapping(),3),['q1','q2','q3']);
  assert.deepEqual(mappingIssues({q1:[0],q2:[1,2],q3:[2]},3),[]);
  for(const bad of [-1,3,0.5,NaN]) assert.deepEqual(mappingIssues({q1:[0],q2:[bad],q3:[2]},3),['q2']);
});
test('PDF file guards cover extension, empty and oversized uploads',()=>{
  assert.equal(validatePdf({name:'Homework.PDF',size:100}),null);
  assert.match(validatePdf({name:'notes.png',size:100}),/PDF/);
  assert.match(validatePdf({name:'notes.pdf',size:0}),/empty/);
  assert.match(validatePdf({name:'notes.pdf',size:20*1024*1024+1}),/20 MB/);
});
test('a saved revision preserves its original bytes, mapping and result',()=>{
  const bytes=new Uint8Array([1,2,3]).buffer;
  const mapping={q1:[0],q2:[1],q3:[2]};
  const result=structuredClone(sampleResult);
  const revision=makeRevision({fileName:'work.pdf',bytes,mapping,result,number:1,sample:true});
  mapping.q1.push(2);new Uint8Array(bytes)[0]=99;result.estimatedScore=0;
  assert.deepEqual(revision.mapping.q1,[0]);
  assert.equal(new Uint8Array(revision.bytes)[0],1);
  assert.equal(revision.result.estimatedScore,24);
  assert.ok(revision.id);assert.ok(Date.parse(revision.createdAt));
});
test('arbitrary student work never receives a fixture grade',async()=>{
  assert.deepEqual(await assessSubmission({sample:false}),{status:'awaiting-integration',result:null});
});
test('sample assessment explicitly returns the fixture, with consistent totals',async()=>{
  const {result,status}=await assessSubmission({sample:true});
  assert.equal(status,'ready');assert.equal(result.source,'fixture');
  assert.notEqual(result,sampleResult);
  assert.equal(result.estimatedScore,result.questions.reduce((total,q)=>total+q.score,0));
  assert.equal(result.findings.length,2);
});
test('assessment respects both existing and mid-flight cancellation',async()=>{
  const early=new AbortController();early.abort();
  await assert.rejects(assessSubmission({sample:true,signal:early.signal}),{name:'AbortError'});
  const controller=new AbortController();
  const pending=assessSubmission({sample:true,signal:controller.signal});controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
});

test('graded example deductions match every question score and the total',()=>{
 const example=gradedExampleResult;
 for(const q of example.questions){
  const deducted=example.findings.filter(f=>f.questionId===q.id).reduce((sum,f)=>sum+f.deduction,0);
  assert.equal(q.score,10-deducted);
 }
 assert.equal(example.maxScore-example.findings.reduce((sum,f)=>sum+f.deduction,0),example.estimatedScore);
 assert(example.findings.every(f=>f.applied&&f.kind==='line'&&f.boxes.length));
});
