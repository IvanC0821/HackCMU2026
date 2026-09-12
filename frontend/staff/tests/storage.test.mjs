import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../storage.mjs';
function fakeFactory(){
  let saved;
  const db={transaction(){let cancelled=false;const tx={abort(){cancelled=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {get(){const req={};queueMicrotask(()=>{req.result=structuredClone(saved);req.onsuccess?.();if(!cancelled)queueMicrotask(()=>tx.oncomplete?.());});return req;},put(value){saved=structuredClone(value);}};}};return tx;},close(){}};
  return {open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess();});return req;}};
}
test('local store persists reference blobs and refuses stale-tab overwrite',async()=>{
  const factory=fakeFactory(),a=await openStore(factory),b=await openStore(factory);
  assert.equal(await a.load(),null);
  await a.save({schema:1,revision:1,document:new Blob(['%PDF-test'])},0);
  assert.equal(await (await b.load()).document.text(),'%PDF-test');
  await assert.rejects(()=>b.save({schema:1,revision:2},0),/Another tab/);
  assert.equal((await a.load()).revision,1);
  await a.save({schema:1,revision:2},1);assert.equal((await b.load()).revision,2);
});
