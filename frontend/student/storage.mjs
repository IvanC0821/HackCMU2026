const open = () => new Promise((resolve,reject)=>{
  const req=indexedDB.open('verity-student-local-v1',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('revisions',{keyPath:'id'});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
export async function saveRevision(revision) {
  const db=await open();
  try {await new Promise((resolve,reject)=>{
    const tx=db.transaction('revisions','readwrite');tx.objectStore('revisions').put(revision);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });} finally {db.close();}
}
export async function readRevisions() {
  const db=await open();
  try {return await new Promise((resolve,reject)=>{
    const req=db.transaction('revisions').objectStore('revisions').getAll();
    req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.number-a.number));req.onerror=()=>reject(req.error);
  });} finally {db.close();}
}
