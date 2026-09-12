export const assignment = {
  id:'sample-homework-1', course:'Discrete mathematics', code:'Sample course', title:'Homework 1', subtitle:'Proofs & mathematical reasoning',
  questions:[
    {id:'q1',number:1,title:'Direct proof',points:10,prompt:'Prove that the sum of two even integers is even.'},
    {id:'q2',number:2,title:'Mathematical induction',points:10,prompt:'Prove that 1 + 2 + … + n = n(n + 1) / 2 for every positive integer n.'},
    {id:'q3',number:3,title:'Sets & notation',points:10,prompt:'Express the positive even integers in set-builder notation, with the domain stated explicitly.'}
  ]
};
export const sampleResult = {
  source:'fixture', estimatedScore:24, maxScore:30,
  questions:[{id:'q1',score:10},{id:'q2',score:6},{id:'q3',score:8}],
  findings:[
    {id:'f1',questionId:'q2',category:'Logic error',message:'One step in your reasoning may need another look.',pageIndex:1,x:0.76,y:0.493},
    {id:'f2',questionId:'q3',category:'Notation error',message:'Some notation may be incomplete or ambiguous.',pageIndex:2,x:0.70,y:0.33}
  ]
};
// Explicitly fictional graded example; never applied to an uploaded submission.
export const gradedExampleResult = {
  source:'graded-example', estimatedScore:24, maxScore:30,
  questions:[{id:'q1',score:10},{id:'q2',score:6},{id:'q3',score:8}],
  findings:[
    {id:'graded-induction',questionId:'q2',category:'Circular reasoning',message:'The next case is assumed rather than derived. Use the induction hypothesis to justify the transition to k + 1.',pageIndex:1,x:.32,y:.48597,kind:'line',boxes:[{x:.11111,y:.47441,width:.2235,height:.02313}],deduction:4,applied:true},
    {id:'graded-domain',questionId:'q3',category:'Missing domain',message:'The condition k > 0 does not specify which values k can take. State the domain so the notation describes the intended set.',pageIndex:2,x:.265,y:.36225,kind:'line',boxes:[{x:.11111,y:.35068,width:.16971,height:.02313}],deduction:2,applied:true},
  ],
};
export const emptyMapping = () => Object.fromEntries(assignment.questions.map(q=>[q.id,[]]));
export function togglePage(mapping, question, page) {
  const pages = new Set(mapping[question] || []);
  pages.has(page) ? pages.delete(page) : pages.add(page);
  return {...mapping,[question]:[...pages].sort((a,b)=>a-b)};
}
export function mappingIssues(mapping, count) {
  return assignment.questions.filter(q=>!mapping[q.id]?.length || mapping[q.id].some(p=>!Number.isInteger(p)||p<0||p>=count)).map(q=>q.id);
}
export function validatePdf(file) {
  if (!file || !/\.pdf$/i.test(file.name)) return 'Choose a PDF file to continue.';
  if (file.size > 20 * 1024 * 1024) return 'This PDF is over 20 MB. Export a smaller copy and try again.';
  if (file.size === 0) return 'This file is empty. Choose a PDF that contains your work.';
  return null;
}
export function makeRevision({fileName,bytes,mapping,result,number,sample}) {
  return {id:crypto.randomUUID(),number,createdAt:new Date().toISOString(),fileName,bytes:bytes.slice(0),mapping:structuredClone(mapping),result:result ? structuredClone(result) : null,sample};
}
// The prototype deliberately does not assess arbitrary uploads. Replace this
// seam with the agreed student API, without importing staff credentials.
export async function assessSubmission({sample,signal,onProgress}) {
  signal?.throwIfAborted();
  if (!sample) return {status:'awaiting-integration',result:null};
  onProgress?.('Preparing sample feedback…');
  await new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},750);
    signal?.addEventListener('abort',abort,{once:true});
  });
  return {status:'ready',result:structuredClone(sampleResult)};
}
