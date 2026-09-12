import test from 'node:test';
import assert from 'node:assert/strict';
import {cropRect, validCropRect, putSolutionCrop, solutionCropErrors} from '../solution-crops.mjs';
import {newWorkspace, loadSampleRubric, publishDraft} from '../model.mjs';

test('dragging in either direction produces zoom-independent bounded coordinates', () => {
  assert.deepEqual(cropRect([.8,.7],[.2,.3]), [.2,.3,.6,.4]);
  assert.deepEqual(cropRect([-.2,.3],[1.2,.8]), [0,.3,1,.5]);
  for (const rect of [[0,0,0,.2],[.9,0,.3,.3],[NaN,0,.2,.2],[-.2,0,.2,.2]]) assert.equal(validCropRect(rect),false);
});
test('multiple page crops persist into a version without binding student page mappings', () => {
  const s=newWorkspace();loadSampleRubric(s);const q=s.draft[0];
  putSolutionCrop(q,s.documents.solution,{page:1,rect:[.1,.2,.7,.3],label:'Method'});
  putSolutionCrop(q,s.documents.solution,{page:2,rect:[.2,.1,.6,.2],label:'Conclusion'});
  const v=publishDraft(s);
  assert.equal(v.questions[0].solutionCrops.length,2);
  assert.deepEqual(v.questions[0].solutionPages,[1,2]);
  assert.deepEqual(v.questions[0].assignmentPages,[1]);
  q.solutionCrops[0].rect[0]=.2;
  assert.equal(v.questions[0].solutionCrops[0].rect[0],.1);
});
test('replaced documents require explicit remapping; shorter PDFs reject absent pages', () => {
  const s=newWorkspace();loadSampleRubric(s);const q=s.draft[0];
  const crop=putSolutionCrop(q,s.documents.solution,{page:2,rect:[.1,.1,.8,.4]});
  s.documents.solution={id:'new-solution',pageCount:1};
  assert.match(solutionCropErrors(q,s.documents.solution).join(' '),/replacement solution PDF/);
  assert.throws(()=>publishDraft(s),/answer crop|answer crops/);
  assert.throws(()=>putSolutionCrop(q,s.documents.solution,{...crop,page:2}),/missing solution page/);
  putSolutionCrop(q,s.documents.solution,{...crop,page:1});
  assert.deepEqual(solutionCropErrors(q,s.documents.solution),[]);
  assert.deepEqual(q.solutionCrops[0].rect,[.1,.1,.8,.4]);
});
test('adding answer reference metadata alone keeps the sample grading logic compatible', () => {
  const s=newWorkspace();loadSampleRubric(s);
  putSolutionCrop(s.draft[0],s.documents.solution,{page:1,rect:[.1,.1,.8,.4]});
  assert.equal(publishDraft(s).sampleCompatible,true);
});
