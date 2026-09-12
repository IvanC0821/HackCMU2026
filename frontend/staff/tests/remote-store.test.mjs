import test from 'node:test';
import assert from 'node:assert/strict';

test('connected rubric saves use the acknowledged revision without a racing reload', async () => {
  const original={fetch:globalThis.fetch,location:globalThis.location,sessionStorage:globalThis.sessionStorage};
  const doc={id:'solution',remoteId:'private-solution',name:'solution.pdf',sample:false};
  const stored={schema:1,revision:1,documents:{blank:null,solution:doc,examples:[]},versions:[],submissions:[{attempts:[{pdf:{id:'student',remoteId:'private-student',name:'work.pdf',pageCount:2}}]}],draft:[{id:'q1',solutionCrops:[{id:'crop',documentId:'solution',page:1,rect:[.1,.2,.7,.3],label:'Answer'}]}]};
  let reads=0;
  globalThis.location={pathname:'/teacher/'};
  globalThis.sessionStorage={getItem(){return null;},setItem(){}};
  globalThis.fetch=async(path,options={})=>{
    if(path==='/classroom/demo')return Response.json({enabled:true});
    if(path==='/classroom/me')return Response.json({role:'instructor'});
    if(path==='/classroom/files/private-solution'||path==='/classroom/files/private-student')return new Response(new Blob(['%PDF-test']));
    if(path==='/classroom/workspace'&&options.method==='PUT'){
      const body=JSON.parse(options.body);assert.equal(body.expectedRevision,1);assert.equal(body.state.revision,2);
      assert.equal(body.state.documents.solution.blob,undefined);
      assert.deepEqual(body.state.submissions[0].attempts[0].pdf,stored.submissions[0].attempts[0].pdf,'Student PDF metadata remains immutable');
      return Response.json(body.state);
    }
    if(path==='/classroom/workspace'){reads++;return Response.json(stored);}
    throw Error('Unexpected request '+path);
  };
  try{
    const {openRemoteStore}=await import('../../connected/client.mjs?crop-save-test');
    const store=await openRemoteStore(),snapshot=await store.load();
    snapshot.revision=2;
    const saved=await store.save(snapshot,1);
    assert.equal(saved.revision,2);
    assert.equal(reads,1,'Only the initial read; a stale reload cannot regress the saved revision');
    assert(saved.documents.solution.blob instanceof Blob);
    assert.deepEqual(saved.draft[0].solutionCrops,snapshot.draft[0].solutionCrops);
  }finally{Object.assign(globalThis,original);}
});
