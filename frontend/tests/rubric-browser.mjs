import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const require=createRequire(new URL('../student/package.json',import.meta.url));
const {PDFDocument,StandardFonts}=require('pdf-lib');
const root=fileURLToPath(new URL('../..',import.meta.url));
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;await new Promise(r=>server.close(r));
const origin=`http://127.0.0.1:${port}`;
const testData=await mkdtemp(path.join(tmpdir(),'verity-rubric-'));
const serve=`import os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import run_classroom
run_classroom.DATA=Path(sys.argv[2])
os.environ['DATABASE_URL']='sqlite:///'+str(run_classroom.DATA/'classroom.db')
os.environ['STORAGE_DIR']=str(run_classroom.DATA/'documents')
run_classroom.provision()
import uvicorn
from verity.classroom import app
uvicorn.run(app, host='127.0.0.1', port=int(sys.argv[3]), log_level='warning')`;
const child=spawn(`${root}/backend/.venv/bin/python`,['-c',serve,`${root}/backend`,testData,String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let logs='',browser, page;child.stderr.on('data',data=>{logs+=data;});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(pages=2){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(let i=0;i<pages;i++){
  const p=pdf.addPage([612,i?1008:792]);
  p.drawText(`Question ${i+1}: Worked solution`,{x:60,y:p.getHeight()-100,size:22,font});
  p.drawText('The correct answer is x = 2 and y = 1.',{x:60,y:p.getHeight()-180,size:16,font});
  p.drawText('Show the row operations and justify each step.',{x:60,y:p.getHeight()-220,size:14,font});
 }
 return Buffer.from(await pdf.save());
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(`${origin}/classroom/demo`)).ok)break;}catch{}if(i===79)throw Error(logs);await wait(200);}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('pageerror',e=>console.error(e.message));
 await page.goto(`${origin}/teacher/#/homework/1/standards`);
 await page.getByRole('tab',{name:'Files & settings'}).click();
 await page.locator('.optional-materials > summary').click();
 await page.getByRole('button',{name:'Use sample materials'}).click();
 await page.locator('.crop-surface canvas[data-ready="true"]').waitFor();
 await page.getByRole('tab',{name:'Files & settings'}).click();
 await page.locator('input[data-file="solution"]').setInputFiles({name:'long-solution.pdf',mimeType:'application/pdf',buffer:await fixture()});
 await page.locator('.file-title').filter({hasText:'long-solution.pdf'}).waitFor();
 await page.locator('.save-state').filter({hasText:'saved to course'}).waitFor();
 await page.getByRole('tab',{name:'Rubric',exact:true}).click();
 await page.locator('.crop-surface canvas[data-ready="true"]').waitFor();
 if (!await page.locator('.question-reference').evaluate(el=>el.open)) await page.locator('.question-reference > summary').click();
 await page.getByRole('button',{name:'+ Crop answer from PDF',exact:true}).click();
 await page.locator('.crop-surface canvas[data-ready="true"]').waitFor();
 let bounds=await page.locator('.crop-surface').boundingBox();
 await page.mouse.move(bounds.x+bounds.width*.08,bounds.y+bounds.height*.08);
 await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.9,bounds.y+bounds.height*.34,{steps:8});await page.mouse.up();
 await page.locator('#crop-selection-form input[name="label"]').fill('Final answer and method');
 await page.getByRole('button',{name:'Save answer crop'}).click();
 await page.locator('.solution-excerpt canvas[data-ready="true"]').waitFor();
 await page.getByRole('button',{name:'Next reference page'}).click();
 await page.locator('.crop-surface canvas[data-page="2"][data-ready="true"]').waitFor();
 if (!await page.locator('.question-reference').evaluate(el=>el.open)) await page.locator('.question-reference > summary').click();
 await page.getByRole('button',{name:'+ Crop answer from PDF',exact:true}).click();
 await page.locator('#crop-selection-form input[name="label"]').fill('Long-page conclusion');
 await page.locator('.crop-precision > summary').click();
 await page.locator('#crop-selection-form input[name="bound0"]').fill('12.5');
 await page.locator('#crop-selection-form input[name="bound2"]').fill('65');
 await page.getByRole('button',{name:'Save answer crop'}).click();
 await page.locator('.solution-excerpt').nth(1).locator('canvas[data-ready="true"]').waitFor();
 assert.equal(await page.locator('.solution-excerpt').count(),2);
 const left=await page.locator('.rubric-document').boundingBox(),right=await page.locator('.rubric-sidebar').boundingBox();
 assert(left.x+left.width<=right.x+1,'PDF is to the left of rubric editor');
 await page.locator('.question-reference > summary').click();
 assert(!await page.locator('[data-field="assignmentPages"]').isVisible());
 assert(!await page.locator('[data-field="expected"]').isVisible());
 assert(await page.locator('[data-edit="band"]').first().isVisible(),'Deduction values are always visible');
 await page.screenshot({path:'/private/tmp/verity-rubric-desktop.png',fullPage:true});
 await page.locator('.deduction-marker').first().click();
 assert.equal(await page.locator('.deduction-marker').first().getAttribute('aria-pressed'),'true');
 await page.locator('.deduction-item').nth(1).click({position:{x:4,y:4}});
 assert.equal(await page.locator('.deduction-marker').first().getAttribute('aria-pressed'),'true','Selecting another deduction preserves the first');
 assert.equal(await page.locator('.deduction-marker').nth(1).getAttribute('aria-pressed'),'true');
 await page.locator('.deduction-marker').first().click();
 assert.equal(await page.locator('.deduction-marker').first().getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('.deduction-marker').nth(1).getAttribute('aria-pressed'),'true','Deselecting one leaves other deductions selected');
 await page.getByRole('tab',{name:'Files & settings'}).click();
 await page.getByRole('tab',{name:'Rubric',exact:true}).click();
 assert.equal(await page.locator('.deduction-marker').nth(1).getAttribute('aria-pressed'),'true','Independent selections survive rerender');
 await page.screenshot({path:'/private/tmp/verity-rubric-deductions.png',fullPage:true});
 await page.reload();await page.locator('.question-reference > summary').click();await page.locator('.solution-excerpt').nth(1).locator('canvas[data-ready="true"]').waitFor();
 assert.equal(await page.locator('.solution-excerpt').count(),2,'Crops survive remote save and reload');
 await page.getByRole('button',{name:'Add question',exact:true}).click();
 await page.locator('[data-edit="question"][data-q="1"][data-field="prompt"]').waitFor();
 const q=page.locator('.question-editor');
 await q.locator('[data-field="prompt"]').fill('Explain your reasoning.');
 await q.getByRole('button',{name:'+ Rubric item'}).click();
 await q.locator('[data-edit="criterion"][data-field="label"]').fill('Justify the result');
 await q.locator('[data-edit="band"][data-field="label"]').first().fill('A valid justification');
 await q.locator('[data-field="prompt"]').click();
 await page.locator('.save-state').filter({hasText:'saved to course'}).waitFor();
 await page.getByRole('tab',{name:'Files & settings'}).click();
 await page.locator('.assignment-hints > summary').click();
 await page.getByRole('button',{name:'Review / refresh hints',exact:true}).click();
 await page.getByRole('button',{name:'Approve these hints',exact:true}).click();
 await page.locator('.notice').filter({hasText:'Hints approved'}).waitFor();
 const publication=page.waitForResponse(response=>response.url().endsWith('/classroom/workspace')&&response.request().method()==='PUT'&&JSON.parse(response.request().postData()).state.versions.length>0);
 await page.getByRole('button',{name:'Finalize grading standard'}).click();
 const publishedResponse=await publication;
 assert.equal(publishedResponse.status(),200,await publishedResponse.text());
 await page.waitForURL('**/#/homework/1');
 const api=async(path,options={},role='teacher')=>{
  const response=await fetch(origin+'/classroom'+path,{...options,headers:{...options.headers,'X-Verity-Demo-Role':role}});
  assert(response.ok,`${path}: ${response.status}`);return response.json();
 };
 const state=await api('/workspace');
 const pub=await api('/student',{},'student');
 assert(!JSON.stringify(pub).includes('solutionCrops'));assert(!JSON.stringify(pub).includes('Final answer and method'));
 const form=new FormData();form.append('file',new Blob([await fixture()],{type:'application/pdf'}),'student.pdf');
 const uploaded=await api('/files',{method:'POST',body:form},'student');
 await api('/attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),documentId:uploaded.remoteId,fileName:'student.pdf',version:state.versions.at(-1).id,mapping:{q1:[0,1],q2:[1]}})},'student');
 const after=await api('/workspace'),sid=after.submissions.find(s=>s.attempts.some(a=>a.pdf.remoteId===uploaded.remoteId)).id;
 await page.goto(`${origin}/teacher/#/homework/1/review/${sid}`);
 await page.reload();
 await page.locator('.solution-excerpt').nth(1).locator('canvas[data-ready="true"]').waitFor();
 assert.equal(await page.locator('.solution-excerpt').count(),2,'TA sees published cropped answers');
 await page.screenshot({path:'/private/tmp/verity-rubric-ta.png',fullPage:true});
 await page.goto(`${origin}/teacher/#/homework/1/standards`);
 await page.getByRole('tab',{name:'Files & settings'}).click();
 await page.locator('input[data-file="solution"]').setInputFiles({name:'shorter-solution.pdf',mimeType:'application/pdf',buffer:await fixture(1)});
 await page.locator('.file-title').filter({hasText:'shorter-solution.pdf'}).waitFor();
 await page.locator('.save-state').filter({hasText:'saved to course'}).waitFor();
 await page.getByRole('tab',{name:'Rubric',exact:true}).click();
 await page.locator('#setup-question').selectOption('0');
 await page.locator('.question-reference > summary').click();
 assert.equal(await page.getByRole('button',{name:'Remap',exact:true}).count(),2);
 await page.getByRole('button',{name:'Finalize grading standard'}).click();
 await page.locator('[role="alert"]').filter({hasText:'replacement solution PDF'}).waitFor();
 await page.getByRole('button',{name:'Remap',exact:true}).first().click();
 await page.getByRole('button',{name:'Save answer crop'}).click();
 await page.locator('.stale-crop').nth(1).waitFor({state:'detached'});
 assert.equal(await page.getByRole('button',{name:'Remap',exact:true}).count(),1);
 const revised=await api('/workspace');
 assert.deepEqual(revised.versions[0].questions[0].solutionCrops,state.versions[0].questions[0].solutionCrops,'Published answer crops are immutable');
 assert.equal(revised.versions[0].questions[0].solutionCrops[1].rect[0],.125,'Keyboard bounds are saved as normalized coordinates');
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('.crop-surface canvas').getBoundingClientRect().width<innerWidth);
 assert.equal(await page.locator('.course-rail').count(),0,'Rubric editor omits the course navigation rail');
 await page.screenshot({path:'/private/tmp/verity-rubric-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow on mobile');
 assert.deepEqual(errors,[]);
 console.log('Rubric browser passed: PDF canvas, pointer and keyboard crops, long-page navigation, multi-question editing, remote persistence, immutable TA previews, student privacy, replacement remapping, responsive layout.');
}catch(error){
 if(page){await page.screenshot({path:'/private/tmp/verity-rubric-failure.png',fullPage:true});console.error((await page.locator('[role="alert"],.notice.warning').allTextContents()).join(' | '));console.error(await page.locator('.rubric-studio,.rubric-sidebar,#studio-panel-rubric').evaluateAll(els=>els.map(el=>({class:el.className,height:el.clientHeight,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop}))));}
 throw error;
}finally{
 await browser?.close();child.kill('SIGTERM');
 if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));
 await rm(testData,{recursive:true,force:true});
}
