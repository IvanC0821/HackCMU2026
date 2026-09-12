import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../..',import.meta.url));
const portServer=createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));
const port=portServer.address().port;await new Promise(r=>portServer.close(r));
const origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['frontend/student/serve.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let browser,page;const errors=[];
try{
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error(`Server exited ${code}`)));});
 browser=await chromium.launch({channel:'chrome',headless:true});
 page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);
 // Seed only this fresh browser context with an explicitly fictional saved revision.
 await page.evaluate(async()=>{
  const {makeRevision,sampleResult}=await import('./model.mjs');const {saveRevision}=await import('./storage.mjs');
  const result=structuredClone(sampleResult);
  result.findings.push({...result.findings[0],id:'nearby',x:.76,y:.493,message:'Check the induction assumption before applying it to the next step. '.repeat(5)});
  result.findings.push({...result.findings[0],id:'bottom-edge',x:.98,y:.97,message:'Revisit the conclusion at the end of this page.'});
  result.findings.push({id:'unlocated',questionId:'q2',category:'Review needed',message:'No exact position was returned.'});
  await saveRevision(makeRevision({bytes:await(await fetch('./assets/sample-homework.pdf')).arrayBuffer(),fileName:'sample-homework.pdf',mapping:{q1:[0],q2:[1],q3:[2]},result,number:1,sample:true}));
 });
 await page.reload();await page.locator('[data-action="latest"]').click();
 await page.locator('.pdf-hint-box').nth(2).waitFor();
 assert.equal(await page.locator('.pdf-hint-box').count(),3,'Every located error on this page has a persistent hint');
 async function geometry(){return page.evaluate(()=>{
  const canvas=document.querySelector('#pdf-canvas'),paper=canvas.getBoundingClientRect();
  const notes=[...document.querySelectorAll('.pdf-hint-box')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x-paper.x,y:r.y-paper.y,w:r.width,h:r.height};});
  const marker=document.querySelector('.paper-marker[data-marker="f1"]');
  const line=document.querySelector('[data-connector="f1"]').getAttribute('points').split(' ')[0].split(',').map(Number);
  return {width:paper.width,height:paper.height,notes,x:parseFloat(marker.style.left),y:parseFloat(marker.style.top),line};
 });}
 let g=await geometry();
 const check=g=>{assert(Math.abs(g.x-g.width*.76)<1);assert(Math.abs(g.y-g.height*.493)<1);assert(Math.abs(g.line[0]-g.x)<.01&&Math.abs(g.line[1]-g.y)<.01);for(let i=0;i<g.notes.length;i++){assert(g.notes[i].x>g.width);if(i)assert(g.notes[i].y>=g.notes[i-1].y+g.notes[i-1].h+10);}};
 check(g);
 await page.screenshot({path:'/private/tmp/verity-annotations-desktop.png',fullPage:true});
 const before=g.width;
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.waitForFunction(width=>document.querySelector('#pdf-canvas').clientWidth>width,before);
 check(await geometry());
 await page.locator('.hint-heading').first().click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.pdf-hint-box').count(),3,'Dismissing selection never hides hint boxes');
 await page.selectOption('#page-select','2');await page.locator('.pdf-hint-box').filter({hasText:'Notation error'}).waitFor();
 assert.equal(await page.locator('.pdf-hint-box').count(),1,'Page changes only show that page’s hints');
 await page.selectOption('#page-select','0');await page.waitForFunction(()=>document.querySelectorAll('.pdf-hint-box').length===0);
 await page.selectOption('#page-select','1');await page.locator('.pdf-hint-box').nth(2).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Fit page width'}).click();
 await page.waitForFunction(()=>document.querySelector('#pdf-canvas').clientWidth<400);
 check(await geometry());
 await page.locator('.pdf-hint-box').first().scrollIntoViewIfNeeded();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'PDF scrolling stays inside its viewer on mobile');
 await page.screenshot({path:'/private/tmp/verity-annotations-mobile.png',fullPage:true});
 await page.setViewportSize({width:1600,height:1000});
 await page.goto(origin+'/?example=graded');
 await page.locator('.pdf-hint-box .hint-deduction').filter({hasText:'−4'}).waitFor();
 assert.match(await page.locator('.estimate').innerText(),/24\s*\/ 30/);
 assert.match(await page.locator('.estimate').innerText(),/Example grade/);
 assert.match(await page.locator('.feedback-card').innerText(),/Applied/);
 assert.match(await page.locator('.applied-deduction').innerText(),/−4/);
 assert.match(await page.locator('.review-question[data-question="q2"]').innerText(),/6\s*\/ 10/);
 await page.screenshot({path:'/private/tmp/verity-graded-example.png',fullPage:true});
 await page.locator('.review-question[data-question="q3"]').click();
 await page.locator('.pdf-hint-box .hint-deduction').filter({hasText:'−2'}).waitFor();
 assert.match(await page.locator('.review-question[data-question="q3"]').innerText(),/8\s*\/ 10/);
 await page.reload();await page.locator('.pdf-hint-box .hint-deduction').filter({hasText:'−4'}).waitFor();
 assert.equal(await page.evaluate(async()=>{const {readRevisions}=await import('./storage.mjs');return (await readRevisions()).filter(r=>r.id==='graded-example-v1').length;}),1,'Reopening the example reuses its saved revision');
 assert.deepEqual(errors,[]);
 console.log('Annotation browser passed: persistent hints, exact circles, connected lines, measured non-overlapping boxes, zoom, page filtering, unknown locations, and mobile scrolling.');
}catch(error){if(page)await page.screenshot({path:'/private/tmp/verity-annotations-failure.png',fullPage:true});throw error;}
finally{await browser?.close();child.kill('SIGTERM');if(child.exitCode===null)await new Promise(r=>child.once('exit',r));}
