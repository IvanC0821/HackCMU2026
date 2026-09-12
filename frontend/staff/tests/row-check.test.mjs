import test from 'node:test';
import assert from 'node:assert/strict';
import {checkRowWork, applyOperation, numberValue} from '../row-check.mjs';
import {caseWork, caseStart, loadCase, assessCase, submitCaseFinal, reopenCaseSubmission} from '../case.mjs';
import {newWorkspace, publishDraft, analytics, markSkimmed, completeReview} from '../model.mjs';
test('missing operations are flagged without giving the solution steps',()=>{
  const result=checkRowWork(caseWork.incomplete,caseStart);assert(result.answerCorrect);assert(!result.complete);assert.equal(result.flags.length,1);
  assert.equal(result.flags[0].category,'Possible missing work');assert.doesNotMatch(result.flags[0].text,/R1|R2|1\/3|x =/);
});
test('both correct paths pass regardless of reference ordering',()=>{
  for(const key of ['corrected','alternative']) {const r=checkRowWork(caseWork[key],caseStart);assert(r.complete,key);assert(r.answerCorrect);assert.equal(r.flags.length,0);}
});
test('correct final answer cannot hide an incorrect intermediate operation',()=>{
  const work=structuredClone(caseWork.corrected);work.matrices[2][1][2]=4;
  const r=checkRowWork(work,caseStart);assert(r.answerCorrect);assert(!r.operationsValid);assert(r.flags.some(f=>f.category==='Possible arithmetic error'));
});
test('wrong values, changed question matrix and invalid fractions are caught',()=>{
  const work=structuredClone(caseWork.corrected);work.solution=[3,1];assert(!checkRowWork(work,caseStart).answerCorrect);
  assert.throws(()=>numberValue('1/0'));assert.throws(()=>numberValue('1;alert(1)'));assert.throws(()=>numberValue('Infinity'));
  assert.throws(()=>applyOperation(caseStart,{type:'scale',target:0,factor:0}));
  assert.throws(()=>applyOperation(caseStart,{type:'add',target:0,source:0,factor:2}));
});
test('elementary operations match independently computed values across 200 cases',()=>{
  for(let i=1;i<=200;i++){
    const a=[[i,2*i,-i],[i+1,-i,3]],k=(i%9)-4;
    const out=applyOperation(a,{type:'add',target:1,source:0,factor:k});
    assert.deepEqual(out[1],a[1].map((n,j)=>n+k*a[0][j]));assert.deepEqual(out[0],a[0]);
    assert.deepEqual(applyOperation(out,{type:'add',target:1,source:0,factor:-k}),a);
  }
});
test('approved single-case path, 8/10 to 10/10, finality and human skim',()=>{
  const s=newWorkspace();loadCase(s);publishDraft(s);
  assessCase(s,caseWork.incomplete,'Incomplete');assessCase(s,caseWork.corrected,'Corrected');assessCase(s,caseWork.alternative,'Alternative');
  const a=analytics(s);assert.equal(a.students,1);assert.equal(a.questions[0].first,80);assert.equal(a.questions[0].latest,100);assert.equal(a.questions[0].patterns[0].resolved,1);
  assert.throws(()=>completeReview(s,'case-student'),/final version/);submitCaseFinal(s);
  const before=structuredClone(s);assert.throws(()=>assessCase(s,caseWork.corrected),/final/);assert.deepEqual(s,before);
  markSkimmed(s,'case-student','q1');completeReview(s,'case-student');assert.equal(analytics(s).reviewed,1);
  reopenCaseSubmission(s);assessCase(s,caseWork.corrected);assert.equal(analytics(s).students,1);assert.equal(analytics(s).reviewed,0);
});
test('changed rubric instructions disable automatic demo assumptions',()=>{
  const s=newWorkspace();loadCase(s);s.instructions='Require a different method';publishDraft(s);
  assert.throws(()=>assessCase(s,caseWork.corrected),/unchanged demo standard/);
});
