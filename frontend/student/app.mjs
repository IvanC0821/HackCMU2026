import {assignment,emptyMapping,togglePage,mappingIssues,validatePdf,makeRevision,assessSubmission} from './model.mjs';
import {readRevisions,saveRevision} from './storage.mjs';
import {located, locationLabel, findingNumber, layoutMarkers, layoutCallouts, markerMarkup, calloutMarkup, detailMarkup} from './annotations.mjs';
const connected = location.pathname === '/student/';
const {requireRole, addSignOut, fetchStudent, submitStudent, revisionBytes, post, request} = connected ? await import('../connected/client.mjs') : {};

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 check:'<path d="m5 12 4 4 10-10"/>',book:'<path d="M4 4h7l1 2 1-2h7v16h-7l-1 1-1-1H4zM12 6v15"/>',
 file:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 down:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',plus:'<path d="M5 12h14M12 5v14"/>',minus:'<path d="M5 12h14"/>',
 chat:'<path d="M4 4h16v13h-9l-5 4v-4H4zM8 9h8M8 13h5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/>',layers:'<path d="m12 3 10 5-10 5L2 8zm-10 10 10 5 10-5M2 18l10 5 10-5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n]||paths.file}</svg>`;
const state={view:'home',pdf:null,bytes:null,fileName:'',sample:false,mapping:emptyMapping(),question:'q1',page:0,zoom:1,error:'',busy:false,progress:'',revisions:[],revision:null,result:null,activeFinding:null,noteOpen:false,tab:'feedback',mobilePanel:'document',thumbs:new Map(),storageWarning:'',loaded:false};
let pdfjs,drawEpoch=0,loadEpoch=0,currentController,pageRenderTask;
let currentAssignment = null, remoteRevision = -1, refreshing = false;
function setAssignment(raw) {
 currentAssignment ||= raw;
 Object.assign(assignment, structuredClone(raw));
 for (const key of ['title','course','code','subtitle']) assignment[key] = esc(assignment[key]);
 assignment.questions = raw.questions.map(q => ({...q, title:esc(q.title), prompt:esc(q.prompt)}));
}
const totalPoints = () => assignment.questions.reduce((n,q) => n + q.points, 0);
const announce=t=>{$('#announcer').textContent=t;};
const question=id=>assignment.questions.find(q=>q.id===id);
const fmtDate=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const pagesLabel=pages=>pages?.length?`${pages.length===1?'Page':'Pages'} ${pages.map(p=>p+1).join(', ')}`:'No pages selected';
const btn=(label,action,kind='secondary',extra='')=>`<button class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
const errorHTML=()=>state.error?`<div class="error" role="alert">${icon('info')}<span>${esc(state.error)}</span></div>`:'';
const mode=()=>`<span class="preview-label">${connected?'Connected to your course':state.sample?'Sample preview':'Local preview'}</span>`;

function sidebar(){return `<aside class="sidebar"><a href="#" class="brand" data-action="home" aria-label="Verity assignments"><span class="brand-symbol">${icon('check')}</span>verity</a>
  <div class="course-context"><span class="course-initials">DM</span><div><strong>${assignment.course}</strong><span>${assignment.code}</span></div></div>
  <nav aria-label="Course navigation"><button class="nav-item active" data-action="home">${icon('file')}Assignments</button></nav>
  <div class="sidebar-note">A little feedback.<br>A clearer next step.</div>
  <div class="profile"><span class="avatar">${icon('user')}</span><div><strong>Student workspace</strong><span>HackCMU prototype</span></div></div></aside>`;}
function header(){
 const isReview=state.view==='review';
 if (connected && isReview) return `<header class="topbar"><div class="breadcrumbs">${assignment.course} / ${assignment.title}</div><div class="estimate"><div><span>${state.result?.reviewed?'Reviewed score':'Estimated score'}</span><strong>${state.result?.estimatedScore != null ? `${state.result.estimatedScore}<small> / ${state.result.maxScore}</small>` : 'Pending'}</strong></div><span class="estimate-caption">${state.result?.reviewed?'TA reviewed':'Provisional · staff review required'}</span></div></header>`;
 return `<header class="topbar"><div class="breadcrumbs"><button data-action="home">${icon('book')}<span>${assignment.course}</span></button>${icon('chevron')}<span>${state.view==='home'?'Assignments':assignment.title}</span></div>
 ${isReview?`<div class="estimate"><div><span>Estimated score</span><strong>${state.result?`${state.result.estimatedScore}<small> / ${state.result.maxScore}</small>`:'<span class="score-wait">Pending</span>'}</strong></div><span class="estimate-caption">${state.result?'Provisional · sample':'Not yet assessed'}</span></div>`:`<span class="student-label">Student view</span>`}</header>`;
}
function steps(active){return `<ol class="steps" aria-label="Submission progress">${['Upload PDF','Assign pages','Review feedback'].map((name,i)=>`<li class="${i===active?'current':i<active?'complete':''}" ${i===active?'aria-current="step"':''}><span>${i<active?icon('check'):i+1}</span>${name}</li>`).join('')}</ol>`;}
function home(){const latest=state.revisions[0];if(connected)return connectedHome(latest);return `<div class="content home-content"><div class="page-title"><div><p class="overline">${assignment.course}</p><h1>Your assignments</h1><p>Submit your work. Know what to revisit.</p></div>${mode()}</div>
 <div class="assignment-list"><div class="list-heading"><h2>Homework</h2><span>1 assignment</span></div>
 <div class="table-scroll"><table><thead><tr><th>Assignment</th><th>Submission</th><th>Feedback</th><th><span class="sr-only">Action</span></th></tr></thead><tbody><tr>
 <td><button class="assignment-name" data-action="upload"><span class="assignment-icon">${icon('file')}</span><span><strong>${assignment.title}</strong><small>${assignment.subtitle}</small></span></button></td>
 <td>${latest?`<span class="status neutral">${icon('check')}Saved locally</span><small class="cell-note">Version ${latest.number}</small>`:'<span class="status neutral">Not submitted</span>'}</td>
 <td>${latest?.result?'<span class="status amber"><span class="tiny-question">?</span>2 points to revisit</span>':latest?'Awaiting connection':'<span class="muted">—</span>'}</td>
 <td>${latest?btn(`View submission ${icon('arrow')}`,'latest','secondary'):btn(`Submit work ${icon('arrow')}`,'upload','primary')}</td></tr></tbody></table></div></div>
 <div class="assignment-bottom"><div>${icon('info')}<p>This is a local prototype. Your files stay in this browser; nothing is sent to your course.</p></div><button class="text-button" data-action="sample">Try sample homework ${icon('arrow')}</button></div>
 <section class="expectations"><h2>Feedback that helps you ask better questions</h2><p>Look for yellow question marks on your work. They point to a possible issue and its general category, so you know what to revisit or bring to office hours.</p></section></div>`;}
function upload(){if(connected)return connectedUpload();return `<div class="content upload-content">${steps(0)}<div class="page-title"><div><h1>Submit ${assignment.title.toLowerCase()}</h1><p>Upload your work, then tell us where each answer is.</p></div>${mode()}</div>${errorHTML()}
 <div class="upload-layout"><section class="upload-section"><div id="drop-zone" class="drop-zone" aria-label="PDF drop area"><div class="upload-glyph">${icon('upload')}</div><h2>${state.busy?'Opening your PDF…':'Drop your PDF here'}</h2><p>or choose a file from your computer</p>${btn('Choose PDF','choose','primary',state.busy?'disabled':'')}<span class="file-limit">PDF only · Up to 10 pages · 20 MB</span></div>
 <div class="upload-foot">${icon('layers')}<p>Include all your answers in one PDF. You can assign the same page to more than one question.</p></div>
 <div class="sample-invitation"><div><strong>Just taking a look?</strong><p>Use a three-page example to explore the full feedback experience.</p></div>${btn('Use sample PDF','sample','secondary',state.busy?'disabled':'')}</div></section>
 <aside class="assignment-summary"><h2>${assignment.title}</h2><p>${assignment.subtitle}</p><dl><div><dt>Questions</dt><dd>3</dd></div><div><dt>Total points</dt><dd>30</dd></div><div><dt>Accepted file</dt><dd>PDF</dd></div></dl><h3>In this assignment</h3>${assignment.questions.map(q=>`<div class="summary-question"><span>${q.number}</span><div><strong>${q.title}</strong><small>${q.points} points</small></div></div>`).join('')}<div class="local-note">${icon('info')}<p>Local preview. Uploads are only saved in this browser when you submit.</p></div></aside></div></div>`;}
function mapping(){const q=question(state.question);const missing=mappingIssues(state.mapping,state.pdf?.numPages||0);return `<div class="mapping-page"><div class="content mapping-heading">${steps(1)}<div class="page-title"><div><h1>Where is each answer?</h1><p>Select a question, then select all the pages that contain your work.</p></div>${mode()}</div>${errorHTML()}</div>
 <div class="mapping-layout"><aside class="question-selector"><div class="section-heading"><h2>Questions</h2><span>${assignment.questions.length-missing.length} of ${assignment.questions.length} assigned</span></div>${assignment.questions.map(item=>`<button class="map-question ${state.question===item.id?'selected':''}" data-question="${item.id}" aria-pressed="${state.question===item.id}"><span class="question-number">${item.number}</span><span><strong>${item.title}</strong><small>${pagesLabel(state.mapping[item.id])}</small></span>${state.mapping[item.id]?.length?`<span class="mapped-check">${icon('check')}</span>`:''}</button>`).join('')}<p class="mapping-hint">A page can be assigned to more than one question.</p></aside>
 <section class="page-selection"><div class="selection-heading"><div><span class="overline">Question ${q.number}</span><h2>${q.title}</h2><p>${q.prompt}</p></div><span class="selection-count">${state.mapping[q.id].length} selected</span></div>
 <div class="thumbnail-grid">${Array.from({length:state.pdf?.numPages||0},(_,i)=>{const checked=state.mapping[q.id]?.includes(i);const owners=assignment.questions.filter(item=>state.mapping[item.id].includes(i));return `<label class="page-tile ${checked?'checked':''}"><input type="checkbox" data-page-check="${i}" ${checked?'checked':''} aria-label="Assign page ${i+1} to question ${q.number}"><span class="thumbnail-frame"><canvas id="thumb-${i}" aria-label="Preview of page ${i+1}"></canvas><span class="tile-check" aria-hidden="true">${icon('check')}</span></span><span class="tile-caption"><strong>Page ${i+1}</strong><span>${owners.map(item=>`<span class="owner-badge">Q${item.number}</span>`).join('')}</span></span></label>`;}).join('')}</div></section></div>
 <footer class="workflow-footer"><div class="footer-file">${icon('file')}<div><strong>${esc(state.fileName)}</strong><span>${state.pdf?.numPages} pages ${state.sample?'· Sample PDF':''}</span></div><button class="text-button" data-action="choose">Replace</button></div><div class="footer-actions"><span>${missing.length?`${missing.length} question${missing.length>1?'s':''} left to assign`:'All questions assigned'}</span>${btn(`${state.sample?'Get sample feedback':'Submit for feedback'} ${icon('arrow')}`,'submit','primary',missing.length||state.busy?'disabled':'')}</div></footer></div>`;}
function feedbackBody(){
 if(connected)return connectedFeedback();
 if(state.busy)return `<div class="feedback-empty"><span class="spinner"></span><h3>${esc(state.progress||'Preparing feedback…')}</h3><p>${state.sample?'Loading the preset result for this fictional sample.':'Your submission is being processed.'}</p></div>`;
 if(!state.result)return `<div class="feedback-empty">${icon('clock')}<h3>Saved. Feedback is pending.</h3><p>Your PDF and page assignments are saved locally. Live grading isn’t connected in this preview.</p><p>No score or error markers have been generated for your file.</p>${btn('Retry connection','retry','secondary')}<button class="text-button" data-action="sample">Explore sample feedback ${icon('arrow')}</button></div>`;
 const findings=state.result.findings.filter(f=>f.questionId===state.question);
 return `<div class="feedback-intro"><h2>${findings.length?'A place to take another look':'No issues flagged'}</h2><p>${findings.length?'Yellow circles connect each marked location to its hint beside the page.':'There are no feedback markers for this question in the sample.'}</p></div>
 ${findings.map(f=>`<button class="feedback-card ${state.activeFinding===f.id?'selected':''}" data-finding="${f.id}" aria-pressed="${state.activeFinding===f.id}"><span class="feedback-card-top"><span class="question-mark">${findingNumber(state.result.findings,f.id)}</span><strong>${esc(f.category)}</strong><span class="possible">Possible issue</span></span><span class="feedback-message">${esc(f.message)}</span><span class="feedback-location">${esc(locationLabel(f))} ${icon('arrow')}</span></button>`).join('')}
 <div class="feedback-guidance">${icon('chat')}<div><strong>Still unsure?</strong><p>Bring this question and your reasoning to office hours.</p></div></div>
 <div class="sample-disclaimer">Sample feedback is preset. It illustrates the experience, not a live model assessment.</div>`;
}
function review(){const q=question(state.question);return `<div class="review-page"><div class="review-heading"><div><button class="text-button muted" data-action="home">${icon('back')}Assignments</button><h1>${assignment.title}</h1></div><div class="review-heading-actions">${mode()}<button class="button secondary" data-action="upload">${icon('upload')}Upload revision</button></div></div>
 ${errorHTML()}${state.storageWarning?`<div class="error">${esc(state.storageWarning)}</div>`:''}
 <div class="mobile-switch" aria-label="Workspace view"><button class="${state.mobilePanel==='document'?'active':''}" data-panel="document">${icon('file')}Document</button><button class="${state.mobilePanel==='feedback'?'active':''}" data-panel="feedback">${icon('chat')}Feedback</button></div>
 <div class="review-grid" data-mobile-panel="${state.mobilePanel}"><aside class="review-questions"><div class="section-heading"><h2>Questions</h2><span>${totalPoints()} pts</span></div>
 ${assignment.questions.map(item=>{const findings=state.result?.findings.filter(f=>f.questionId===item.id)||[];const score=state.result?.questions.find(q=>q.id===item.id);return `<button class="review-question ${state.question===item.id?'selected':''}" data-question="${item.id}" aria-pressed="${state.question===item.id}"><span class="review-question-top"><strong>Question ${item.number}</strong>${score?`<span>${score.score}<small> / ${item.points}</small></span>`:'<span class="muted">—</span>'}</span><span class="question-topic">${item.title}</span><span class="review-question-status">${findings.length?`${findings.length} PDF note${findings.length===1?'':'s'}`:state.result?`${icon('check')}No issues flagged`:`${icon('clock')}Awaiting feedback`}</span><span class="assigned-pages">${pagesLabel(state.mapping[item.id])}</span></button>`;}).join('')}
 <button class="text-button edit-pages" data-action="remap">${icon('layers')}Edit page assignments</button><div class="version-nav"><label for="revision-select">Submission history</label><select id="revision-select" ${state.busy?'disabled':''}>${state.revisions.map(r=>`<option value="${r.id}" ${r.id===state.revision?.id?'selected':''}>Version ${r.number}${r.sample?' · Sample':''}</option>`).join('')}</select><small>${state.revision?fmtDate(state.revision.createdAt):''}</small></div></aside>
 <section class="pdf-section" aria-label="Submitted PDF"><div class="pdf-toolbar"><span class="pdf-name" title="${esc(state.fileName)}">${icon('file')}${esc(state.fileName)}</span><button class="icon-button" data-action="download" aria-label="Download submitted PDF">${icon('down')}</button></div>
 <div class="pdf-scroll" id="pdf-scroll"><div class="paper-wrapper" id="paper-wrapper"><canvas id="pdf-canvas" tabindex="-1" aria-label="Submitted work, page ${state.page+1}"></canvas><div id="annotation-highlights" class="annotation-highlights" aria-hidden="true"></div><div id="markers" class="markers"></div><div id="annotation-note" class="annotation-note"></div><p id="page-transcript" class="sr-only"></p></div></div>
 <div class="pdf-bottom"><div class="page-controls"><button class="icon-button" data-action="prev" aria-label="Previous page" ${state.page===0?'disabled':''}>${icon('back')}</button><label for="page-select" class="sr-only">PDF page</label><select id="page-select">${Array.from({length:state.pdf?.numPages||0},(_,i)=>`<option value="${i}" ${state.page===i?'selected':''}>Page ${i+1} of ${state.pdf.numPages}</option>`).join('')}</select><button class="icon-button" data-action="next" aria-label="Next page" ${state.page>=(state.pdf?.numPages||1)-1?'disabled':''}>${icon('arrow')}</button></div><div class="zoom-controls"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out" ${state.zoom<=.75?'disabled':''}>${icon('minus')}</button><button class="zoom-reset" data-action="zoom-reset" aria-label="Fit page width">${Math.round(state.zoom*100)}%</button><button class="icon-button" data-action="zoom-in" aria-label="Zoom in" ${state.zoom>=2?'disabled':''}>${icon('plus')}</button></div></div></section>
 <aside class="feedback-panel"><div class="feedback-tabs"><button class="${state.tab==='feedback'?'active':''}" data-tab="feedback">Feedback</button><button class="${state.tab==='question'?'active':''}" data-tab="question">Question</button></div><div class="feedback-question-label"><span>Question ${q.number}</span><span>${q.points} points</span></div><div id="feedback-body">${state.tab==='feedback'?feedbackBody():`<div class="question-details"><h2>${q.title}</h2><p>${q.prompt}</p><div class="local-note">${icon('info')}<p>Feedback identifies the type of issue without showing a worked solution.</p></div></div>`}</div></aside></div>
 <div class="review-footer"><span>${icon(state.busy?'clock':'check')}${state.busy?esc(state.progress):`Version ${state.revision?.number||1} saved ${state.storageWarning?'for this session':'locally'}`}</span><span>${state.result?'Estimated scores may change after instructor review.':'Your original PDF is preserved.'}</span></div></div>`;}

function render({focus=false}={}) {
 pageRenderTask?.cancel();
 drawEpoch++;
 $('#app').innerHTML=`${sidebar()}<div class="shell ${state.view==='review'?'review-shell':''}">${header()}<main id="main" tabindex="-1">${({home,upload,mapping,review}[state.view])()}</main></div>`;
 if(connected && state.view==='review') {
   $('.review-footer span').textContent = state.busy ? state.progress : state.revision?.saved ? `Version ${state.revision.number} · ${state.revision.final?'Handed in':'Practice saved to course'}` : 'Not saved · retry your upload';
   const actions=$('.review-heading-actions');
   actions.insertAdjacentHTML('beforeend',btn(state.revision?.final?'Handed in':'Hand in this version','final','primary',state.busy||state.revision?.final||!state.revision?.saved?'disabled':''));
   document.querySelectorAll('.review-question').forEach(el=>{const q=state.result?.questions.find(q=>q.id===el.dataset.question);if(q?.score===null)el.querySelector('.review-question-top span').textContent='Pending';});
 }
 document.title=`Verity · ${state.view==='home'?'Assignments':state.view==='mapping'?'Assign pages':state.view==='upload'?'Upload homework':'Student feedback'}`;
 if(state.view==='mapping')drawThumbs();
 if(state.view==='review')drawPage();
 if(focus)$('#main').focus({preventScroll:true});
}
async function pdfLibrary(){
 if(!pdfjs){pdfjs=await import('./node_modules/pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./node_modules/pdfjs-dist/build/pdf.worker.mjs',import.meta.url).href;}
 return pdfjs;
}
async function openPdf(bytes){
 const lib=await pdfLibrary();
 const task=lib.getDocument({data:new Uint8Array(bytes.slice(0)),isEvalSupported:false,cMapUrl:new URL('./node_modules/pdfjs-dist/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./node_modules/pdfjs-dist/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./node_modules/pdfjs-dist/wasm/',import.meta.url).href});
 task.onPassword=()=>task.destroy();
 const doc=await task.promise;
 if(doc.numPages>10){await doc.loadingTask.destroy();throw Error('Use a PDF with 10 pages or fewer.');}
 return doc;
}
async function loadFile(file,{sample=false}={}) {
 const err=validatePdf(file);if(err){state.error=err;state.view='upload';render();announce(err);return;}
 const epoch=++loadEpoch;state.busy=true;state.error='';state.view='upload';render();
 try {
   const bytes=await file.arrayBuffer();const pdf=await openPdf(bytes);
   if(epoch!==loadEpoch){await pdf.loadingTask.destroy();return;}
   pageRenderTask?.cancel();await state.pdf?.loadingTask.destroy();
   Object.assign(state,{pdf,bytes,fileName:file.name,sample,mapping:emptyMapping(),question:assignment.questions[0].id,page:0,zoom:1,result:null,revision:null,activeFinding:null,view:'mapping',thumbs:new Map()});
   announce(`PDF opened. ${pdf.numPages} pages. Assign pages to each question.`);
 } catch(error){state.error=error.message?.includes('10 pages')?error.message:'This PDF could not be opened. Check that it isn’t damaged or password-protected, then choose another copy.';}
 finally {if(epoch===loadEpoch){state.busy=false;render({focus:true});}}
}
async function loadSample(){
 if(state.busy)return;
 try {const r=await fetch('./assets/sample-homework.pdf');if(!r.ok)throw Error();await loadFile(new File([await r.blob()],'sample-homework.pdf',{type:'application/pdf'}),{sample:true});}
 catch {state.error='The sample PDF could not be loaded. Try again, or choose your own PDF.';state.view='upload';render();}
}
async function drawThumbs(){
 const epoch=drawEpoch;
 try {for(let i=0;i<state.pdf.numPages;i++){
   if(epoch!==drawEpoch)return;
   const canvas=$(`#thumb-${i}`);if(!canvas)return;
   const page=await state.pdf.getPage(i+1);if(epoch!==drawEpoch)return;
   const viewport=page.getViewport({scale:.36});canvas.width=viewport.width;canvas.height=viewport.height;
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 }}catch{if(epoch===drawEpoch){state.error='Page previews could not be rendered. Try replacing the PDF.';announce(state.error);}}
}
async function drawPage(){
 pageRenderTask?.cancel();
 const epoch=drawEpoch;const canvas=$('#pdf-canvas');if(!canvas||!state.pdf)return;
 try {
   const page=await state.pdf.getPage(state.page+1);if(epoch!==drawEpoch)return;
   const unit=page.getViewport({scale:1});
   const available=Math.max(240,$('#pdf-scroll').clientWidth-48);
   const hasNotes=(state.result?.findings||[]).some(f=>f.pageIndex===state.page&&located(f));
   const pageSpace=hasNotes&&available>=620?available-276:available;
   const displayWidth=Math.min(760,pageSpace)*state.zoom;
   const viewport=page.getViewport({scale:displayWidth/unit.width});
   const dpr=Math.min(devicePixelRatio||1,2);
   canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);
   canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
   const wrapper=$('#paper-wrapper');wrapper.style.width=`${viewport.width}px`;wrapper.style.height=`${viewport.height}px`;
   paintMarkers();
   pageRenderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[dpr,0,0,dpr,0,0]});
   await pageRenderTask.promise;
   const content=await page.getTextContent();if(epoch!==drawEpoch)return;
   $('#page-transcript').textContent=content.items.map(i=>i.str).join(' ');
 }catch(error){if(epoch===drawEpoch&&error.name!=='RenderingCancelledException'){state.error='This page could not be displayed. Download the original PDF or try another page.';const host=$('#paper-wrapper');if(host)host.innerHTML=errorHTML();announce(state.error);}}
}
function paintMarkers(){
 const target=$('#markers'),canvas=$('#pdf-canvas'),wrapper=$('#paper-wrapper');if(!target||!canvas)return;
 const placements=layoutMarkers(state.result?.findings||[],state.page,canvas.clientWidth,canvas.clientHeight);
 target.innerHTML=markerMarkup(placements,state.activeFinding);
 const heights={};
 let layout=layoutCallouts(placements,canvas.clientWidth,canvas.clientHeight);
 const notes=$('#annotation-note');notes.innerHTML=calloutMarkup(layout,state.activeFinding);
 for(const card of notes.querySelectorAll('[data-hint]'))heights[card.dataset.hint]=card.offsetHeight;
 layout=layoutCallouts(placements,canvas.clientWidth,canvas.clientHeight,heights);
 wrapper.style.width=`${layout.width}px`;wrapper.style.height=`${layout.height}px`;
 notes.innerHTML=calloutMarkup(layout,state.activeFinding);
 const highlights=$('#annotation-highlights');highlights.style.width=`${canvas.clientWidth}px`;highlights.style.height=`${canvas.clientHeight}px`;
 paintAnnotationDetail();
}
function paintAnnotationDetail(){
 const canvas=$('#pdf-canvas');if(!canvas)return;
 const placements=layoutMarkers(state.result?.findings||[],state.page,canvas.clientWidth,canvas.clientHeight);
 const placement=placements.find(p=>p.finding.id===state.activeFinding);
 $('#annotation-highlights').innerHTML=detailMarkup(placement?.finding,placement).highlights;
 for(const card of document.querySelectorAll('[data-hint]'))card.classList.toggle('selected',card.dataset.hint===state.activeFinding);
 for(const line of document.querySelectorAll('[data-connector]'))line.classList.toggle('selected',line.dataset.connector===state.activeFinding);
}
function closeAnnotation(){
 const previous=state.activeFinding;state.activeFinding=null;state.noteOpen=false;
 paintAnnotationDetail();
 document.querySelectorAll('[data-marker]').forEach(el=>{el.classList.remove('selected');el.setAttribute('aria-pressed','false');el.setAttribute('aria-expanded','false');});
 document.querySelectorAll('[data-finding]').forEach(el=>el.classList.remove('selected'));
 // Focusing a marker opens feedback; restore focus to the viewer instead on dismissal.
 if(previous)$('#pdf-canvas')?.focus({preventScroll:true});
}
function activateFinding(id,{navigate=false,showNote=true}={}){
 const f=state.result?.findings.find(item=>item.id===id);if(!f)return;
 const changeQuestion=state.question!==f.questionId;
 const changePanel=navigate&&located(f)&&state.mobilePanel!=='document';
 state.activeFinding=id;state.question=f.questionId;state.tab='feedback';state.noteOpen=showNote;
 if(navigate&&located(f))state.mobilePanel='document';
 if(navigate&&located(f)&&state.page!==f.pageIndex){state.page=f.pageIndex;render();return;}
 if(changeQuestion||changePanel){render();return;}
 $('#feedback-body').innerHTML=feedbackBody();
 document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab==='feedback'));
 document.querySelectorAll('[data-marker]').forEach(el=>{const active=el.dataset.marker===id;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));el.setAttribute('aria-expanded',String(active&&state.noteOpen));});
 paintAnnotationDetail();
 announce(`${f.category}. ${f.message}`);
}
async function submit(){
 if(connected)return connectedSubmit();
 if(state.busy||!state.pdf)return;
 const missing=mappingIssues(state.mapping,state.pdf.numPages);
 if(missing.length){state.error='Assign at least one page to every question.';render();return;}
 state.error='';state.storageWarning='';state.busy=true;state.progress=state.sample?'Preparing sample feedback…':'Saving your submission…';state.view='review';state.result=null;state.page=state.mapping.q1[0]||0;state.question='q1';state.zoom=1;state.activeFinding=null;
 const revision=makeRevision({fileName:state.fileName,bytes:state.bytes,mapping:state.mapping,result:null,number:Math.max(0,...state.revisions.map(r=>r.number))+1,sample:state.sample});
 state.revision=revision;state.revisions.unshift(revision);render({focus:true});
 try{await saveRevision(revision);}catch{state.storageWarning='Browser storage is unavailable. This version is kept only until you close or refresh the page.';}
 currentController=new AbortController();
 try{
   const response=await assessSubmission({sample:state.sample,signal:currentController.signal,onProgress:t=>{state.progress=t;announce(t);}});
   state.result=response.result;revision.result=response.result;
   if(response.result){const first=response.result.findings[0];state.question=first.questionId;state.page=first.pageIndex;state.activeFinding=first.id;}
   try{await saveRevision(revision);}catch{state.storageWarning='Browser storage is unavailable. This version is kept only until you close or refresh the page.';}
   announce(response.result?'Sample feedback ready. Two possible issues. Estimated sample score 24 out of 30.':'Submission saved locally. Live feedback is not connected.');
 }catch(error){if(error.name!=='AbortError')state.error='Feedback could not be retrieved. Your saved submission is still available.';}
 finally{state.busy=false;render();}
}
async function restore(id){
 const revision=state.revisions.find(r=>r.id===id);if(!revision||state.busy)return;
 state.busy=true;
 try{
  if(connected){revision.bytes ||= await revisionBytes(revision);setAssignment(revision.assignment);}
  const pdf=await openPdf(revision.bytes);pageRenderTask?.cancel();await state.pdf?.loadingTask.destroy();
  const first=revision.result?.findings[0];
  Object.assign(state,{pdf,bytes:revision.bytes.slice(0),fileName:revision.fileName,sample:revision.sample,mapping:structuredClone(revision.mapping),result:revision.result,revision,question:first?.questionId||assignment.questions[0].id,page:first?.pageIndex??revision.mapping[assignment.questions[0].id][0]??0,activeFinding:first?.id||null,noteOpen:false,view:'review',zoom:1,error:'',mobilePanel:'document'});
 }catch(error){console.warn('Saved PDF restore failed:',error.message);state.error='The saved PDF could not be reopened. Upload it again to create another version.';}
 finally{state.busy=false;render({focus:true});}
}
async function action(name){
 if(state.busy&&!['download','zoom-in','zoom-out','zoom-reset','prev','next'].includes(name))return;
 state.error='';
 if(connected && ['home','upload'].includes(name) && currentAssignment) setAssignment(currentAssignment);
 if(connected && name==='final') {state.busy=true;render();try{const a=await post(`/attempts/${encodeURIComponent(state.revision.id)}/final`,{});Object.assign(state.revision,a);announce('Final version handed in to your TA.');}catch(e){state.error=e.message;}finally{state.busy=false;render();}return;}
 if(connected && name==='retry'){await syncStudent(true);return;}
 if(connected && name==='blank'){try{const blob=await(await request(`/files/${encodeURIComponent(assignment.blank)}`)).blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='assignment.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){state.error=e.message;render();}return;}
 if(name==='home'){state.view='home';render({focus:true});return;}
 if(name==='upload'){state.view='upload';render({focus:true});return;}
 if(name==='choose'){$('#file-input').click();return;}
 if(name==='sample'){await loadSample();return;}
 if(name==='submit'){await submit();return;}
 if(name==='latest'){await restore(state.revisions[0]?.id);return;}
 if(name==='retry'){state.error='Live grading is not connected yet. Your PDF and page assignments are still saved locally.';render();return;}
 if(name==='remap'){state.view='mapping';state.result=null;state.activeFinding=null;render({focus:true});return;}
 if(name==='download'){const url=URL.createObjectURL(new Blob([state.bytes],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=state.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 if(name==='prev')state.page=Math.max(0,state.page-1);
 if(name==='next')state.page=Math.min(state.pdf.numPages-1,state.page+1);
 if(name==='zoom-in')state.zoom=Math.min(2,state.zoom+.25);
 if(name==='zoom-out')state.zoom=Math.max(.75,state.zoom-.25);
 if(name==='zoom-reset')state.zoom=1;
 render();document.querySelector(`[data-action="${name}"]`)?.focus({preventScroll:true});
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-annotation-close]')){closeAnnotation();return;}
 const el=event.target.closest('[data-action],[data-question],[data-finding],[data-marker],[data-tab],[data-panel]');if(!el||el.disabled)return;
 if(el.dataset.action){event.preventDefault();action(el.dataset.action);return;}
 if(el.dataset.question){state.question=el.dataset.question;state.activeFinding=null;state.noteOpen=false;if(state.view==='review'){const f=state.result?.findings.find(f=>f.questionId===state.question);state.page=f?.pageIndex??state.mapping[state.question]?.[0]??0;state.activeFinding=f?.id||null;}render();document.querySelector(`[data-question="${state.question}"]`)?.focus({preventScroll:true});}
 if(el.dataset.finding)activateFinding(el.dataset.finding,{navigate:true});
 if(el.dataset.marker)activateFinding(el.dataset.marker);
 if(el.dataset.tab){state.tab=el.dataset.tab;render();document.querySelector(`[data-tab="${state.tab}"]`)?.focus({preventScroll:true});}
 if(el.dataset.panel){state.mobilePanel=el.dataset.panel;render();document.querySelector(`[data-panel="${state.mobilePanel}"]`)?.focus({preventScroll:true});}
});

document.addEventListener('focusin',event=>{const el=event.target.closest('[data-marker]');if(el&&(state.activeFinding!==el.dataset.marker||!state.noteOpen))activateFinding(el.dataset.marker);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.activeFinding){event.preventDefault();closeAnnotation();}});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='file-input'){const file=el.files[0];el.value='';if(file)loadFile(file);}
 if(el.dataset.pageCheck!==undefined){const index=Number(el.dataset.pageCheck);state.mapping=togglePage(state.mapping,state.question,index);render();document.querySelector(`[data-page-check="${index}"]`)?.focus({preventScroll:true});announce(pagesLabel(state.mapping[state.question]));}
 if(el.id==='page-select'){state.page=Number(el.value);render();$('#page-select')?.focus({preventScroll:true});}
 if(el.id==='revision-select')restore(el.value);
});
document.addEventListener('dragover',event=>{event.preventDefault();$('#drop-zone')?.classList.add('dragging');});
document.addEventListener('dragleave',event=>{if(!event.relatedTarget)$('#drop-zone')?.classList.remove('dragging');});
document.addEventListener('drop',event=>{event.preventDefault();$('#drop-zone')?.classList.remove('dragging');if(state.busy||state.view!=='upload')return;if(event.dataTransfer.files.length!==1){state.error='Choose one PDF containing all your answers.';render();return;}loadFile(event.dataTransfer.files[0]);});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.view==='review'){drawEpoch++;drawPage();}},160);});
if(connected){
 $('#app').textContent='Connecting to your course…';
 try{await requireRole('student');addSignOut();await syncStudent(true);setInterval(syncStudent,1500);state.loaded=true;}
 catch(e){if(!$('#app a')){$('#app').textContent=e.message;}}
}else{render();try{state.revisions=await readRevisions();}catch{state.storageWarning='Browser storage is unavailable.';}state.loaded=true;if(state.view==='home')render();}

function connectedHome(latest) {
 return `<div class="content home-content"><div class="page-title"><div><p class="overline">Your course</p><h1>Your assignments</h1><p>Published homework and your submission history, in one place.</p></div>${mode()}</div>${errorHTML()}${state.storageWarning?`<p role="status">${esc(state.storageWarning)}</p>`:''}
 ${currentAssignment?`<section class="assignment-list"><div class="list-heading"><h2>${assignment.title}</h2><span>${assignment.subtitle}</span></div><div style="padding:24px"><p>${assignment.questions.length} question${assignment.questions.length===1?'':'s'} · ${totalPoints()} points</p><p>${latest?`Version ${latest.number} · ${latest.final?'Handed in':'Practice saved'} · ${latest.result?.estimatedScore!=null?`${latest.result.estimatedScore} / ${latest.result.maxScore}`:'Feedback pending'}`:'No submissions yet'}</p><div class="footer-actions">${btn('Upload your work','upload','primary')}${latest?btn('View submission','latest'):''}${assignment.blank?btn('Download questions','blank'):''}</div></div></section><div class="assignment-bottom"><div>${icon('info')}<p>Your TA receives your submitted PDF and page selections. You see only your own work and general feedback.</p></div></div>`:`<section class="assignment-list" style="padding:28px"><h2>No homework published yet</h2><p>Your professor is preparing the assignment. It will appear here automatically when published.</p></section>`}</div>`;
}
function connectedUpload() {
 return `<div class="content upload-content">${steps(0)}<div class="page-title"><div><h1>Submit ${assignment.title}</h1><p>Upload your work, then select the pages for each question.</p></div>${mode()}</div>${errorHTML()}<div class="upload-layout"><section class="upload-section"><div id="drop-zone" class="drop-zone" aria-label="PDF drop area"><div class="upload-glyph">${icon('upload')}</div><h2>${state.busy?'Opening your PDF…':'Drop your PDF here'}</h2><p>or choose a file from your computer</p>${btn('Choose PDF','choose','primary',state.busy?'disabled':'')}<span class="file-limit">PDF only · Up to 10 pages · 20 MB</span></div><div class="upload-foot">${icon('layers')}<p>Include all your answers in one PDF. A question can span multiple pages, and a page can belong to multiple questions.</p></div></section><aside class="assignment-summary"><h2>${assignment.title}</h2><p>${assignment.subtitle}</p><dl><div><dt>Questions</dt><dd>${assignment.questions.length}</dd></div><div><dt>Total points</dt><dd>${totalPoints()}</dd></div></dl>${assignment.questions.map(q=>`<div class="summary-question"><span>${q.number}</span><div><strong>${q.title}</strong><small>${q.points} points</small></div></div>`).join('')}<p>Your PDF is saved to your course when you submit. Practice versions and final hand-in are separate.</p></aside></div></div>`;
}
function connectedFeedback() {
 if(state.busy)return `<div class="feedback-empty"><span class="spinner"></span><h3>${esc(state.progress||'Saving…')}</h3></div>`;
 if(!state.revision?.saved)return `<div class="feedback-empty"><h3>Your upload needs attention</h3><p>${esc(state.error||'This version has not reached your course yet.')}</p>${btn('Try submitting again','submit','primary')}</div>`;
 if(!state.result)return `<div class="feedback-empty">${icon('clock')}<h3>Saved to your course</h3><p>Your PDF and page assignments are available to your TA. Feedback will appear here automatically.</p><p>Live AI grading is not enabled. No score or error locations have been invented for this file.</p></div>`;
 const findings=state.result.findings.filter(f=>f.questionId===state.question);
 const scored=state.result.questions.find(q=>q.id===state.question)?.score!=null;
 return `<div class="feedback-intro"><h2>${findings.length?'A place to take another look':scored?'No issues flagged':'This question is pending'}</h2><p>${findings.length?'Match each numbered note to the same number on your PDF.':'Your TA reviews the original work.'}</p></div>${findings.map(f=>`<button class="feedback-card ${state.activeFinding===f.id?'selected':''}" data-finding="${f.id}"><span class="feedback-card-top"><span class="question-mark">${findingNumber(state.result.findings,f.id)}</span><strong>${esc(f.category)}</strong></span><span class="feedback-message">${esc(f.message)}</span><span class="feedback-location">${esc(locationLabel(f))}</span></button>`).join('')}<div class="feedback-guidance">${icon('chat')}<div><strong>Still unsure?</strong><p>Bring this question and your reasoning to office hours.</p></div></div><div class="sample-disclaimer">${state.result.source==='ai-recorded'?'Recorded AI estimate · ':state.result.source==='ai'?'AI estimate · ':''}${state.result.reviewed?(state.result.source==='professor-import'?'Imported professor grade.':'Reviewed by your TA.'):'Provisional until TA review.'} Staff solutions and private grading notes are not shared.</div>`;
}
async function connectedSubmit() {
 if(state.busy||!state.pdf)return;
 if(mappingIssues(state.mapping,state.pdf.numPages).length){state.error='Assign at least one page to every question.';render();return;}
 state.busy=true;state.error='';state.progress='Saving your PDF and page selections…';state.view='review';state.result=null;
 let revision=state.revision && !state.revision.saved ? state.revision : makeRevision({fileName:state.fileName,bytes:state.bytes,mapping:state.mapping,result:null,number:state.revisions.length+1,sample:false});
 revision.mapping=structuredClone(state.mapping);state.revision=revision;render();
 try{const saved=await submitStudent(revision,assignment);Object.assign(revision,saved,{saved:true});state.revisions=[revision,...state.revisions.filter(r=>r.id!==revision.id)];state.result=saved.result;announce('Your submission is saved to the course.');}
 catch(e){state.error=e.message;}
 finally{state.busy=false;render();}
}
async function syncStudent(force=false) {
 if(refreshing||state.busy)return;refreshing=true;
 try{
  const data=await fetchStudent();const changed=data.revision!==remoteRevision;
  state.storageWarning='';
  if(!changed&&!force)return;
  remoteRevision=data.revision;currentAssignment=data.assignment;
  state.revisions=data.attempts.map(a=>({...a,saved:true,bytes:state.revisions.find(r=>r.id===a.id)?.bytes}));
  if(state.view==='home'||!state.loaded){if(currentAssignment)setAssignment(currentAssignment);else Object.assign(assignment,{title:'Assignments',course:'Your course',code:'Connected course',questions:[]});}
  if(state.view==='review'&&state.revision?.saved){const a=state.revisions.find(a=>a.id===state.revision.id);if(a){state.revision=a;state.result=a.result;}}
  if(['home','review'].includes(state.view)||force)render();
  announce('Course updated. Your latest feedback is available.');
 }catch(e){state.storageWarning='Connection interrupted. Your selected PDF is kept in this tab; reconnect before submitting.';if(force){state.error=e.message;render();}}
 finally{refreshing=false;}
}
