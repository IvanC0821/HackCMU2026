import {cropRect, validCropRect} from './solution-crops.mjs';

let rubricPdfLibrary;
const rubricPdfCache = new Map();
const rubricRenderTasks = new WeakMap();
function pdfAssetsBase() {
  // Both workspaces share the student's pinned PDF.js build; no third-party PDF upload.
  return new URL(location.pathname === '/teacher/' ? '/student-assets/node_modules/pdfjs-dist/' : './student/node_modules/pdfjs-dist/', location.href);
}
export async function openRubricPDF(doc, url) {
  if (rubricPdfCache.has(doc.id)) return rubricPdfCache.get(doc.id);
  const pending = (async () => {
    const base = pdfAssetsBase();
    rubricPdfLibrary ||= import(new URL('build/pdf.mjs', base).href).then(lib => {
      lib.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.mjs', base).href;
      return lib;
    });
    const lib = await rubricPdfLibrary;
    let bytes;
    if (doc.blob) bytes = await doc.blob.arrayBuffer();
    else {
      const response = await fetch(url); if (!response.ok) throw Error('PDF download failed.');
      bytes = await response.arrayBuffer();
    }
    const task = lib.getDocument({data: new Uint8Array(bytes), isEvalSupported: false,
      cMapUrl: new URL('cmaps/', base).href, cMapPacked: true,
      standardFontDataUrl: new URL('standard_fonts/', base).href, wasmUrl: new URL('wasm/', base).href});
    task.onPassword = () => task.destroy();
    return task.promise;
  })();
  rubricPdfCache.set(doc.id, pending);
  try { return await pending; }
  catch (error) { rubricPdfCache.delete(doc.id); throw error; }
}
export function releaseRubricPDFs() {
  for (const pending of rubricPdfCache.values()) pending.then(pdf => pdf.destroy()).catch(() => {});
  rubricPdfCache.clear();
}
export async function renderRubricPDFs(root, docs, urls, onPageCount) {
  const canvases = [...root.querySelectorAll('canvas[data-reference-pdf]')];
  const pageImages = new Map();
  for (const canvas of canvases) {
    if (!canvas.isConnected) return;
    const doc = docs.find(d => d?.id === canvas.dataset.referencePdf);
    const status = canvas.parentElement.querySelector('[data-pdf-status]');
    try {
      if (!doc || !urls[doc.id]) throw Error('Missing PDF');
      const pdf = await openRubricPDF(doc, urls[doc.id]);
      if (!canvas.isConnected) return;
      onPageCount?.(doc.id, pdf.numPages);
      const pageNumber = Number(canvas.dataset.page);
      if (pageNumber > pdf.numPages) throw Error('This page is not in this PDF. Choose another page.');
      const page = await pdf.getPage(pageNumber);
      const unit = page.getViewport({scale: 1});
      const rect = canvas.dataset.crop ? JSON.parse(canvas.dataset.crop) : null;
      if (rect && !validCropRect(rect)) throw Error('Invalid crop.');
      const available = Math.max(220, (canvas.closest('.rubric-pdf-scroll')?.clientWidth || 720) - 48);
      const displayWidth = Math.min(1000, available) * Number(canvas.dataset.zoom || 1);
      const viewport = page.getViewport({scale: (rect ? 1000 : displayWidth) / unit.width});
      if (rect) {
        const key = `${doc.id}:${pageNumber}`;
        if (!pageImages.has(key)) {
          const full = document.createElement('canvas'); full.width = Math.ceil(viewport.width); full.height = Math.ceil(viewport.height);
          await page.render({canvasContext: full.getContext('2d'), viewport}).promise;
          pageImages.set(key, full);
        }
        const full = pageImages.get(key), [x,y,w,h] = rect;
        canvas.width = Math.max(1, Math.round(w * full.width)); canvas.height = Math.max(1, Math.round(h * full.height));
        canvas.getContext('2d').drawImage(full, x*full.width, y*full.height, w*full.width, h*full.height, 0, 0, canvas.width, canvas.height);
      } else {
        const priorTask = rubricRenderTasks.get(canvas);
        if (priorTask) { priorTask.cancel(); await priorTask.promise.catch(() => {}); }
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        canvas.width = Math.round(viewport.width * dpr); canvas.height = Math.round(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        canvas.parentElement.style.width = `${viewport.width}px`;
        canvas.parentElement.style.height = `${viewport.height}px`;
        const task = page.render({canvasContext: canvas.getContext('2d'), viewport, transform: [dpr,0,0,dpr,0,0]});
        rubricRenderTasks.set(canvas, task); await task.promise;
        if (!canvas.isConnected) return;
        const transcript = canvas.parentElement.querySelector('[data-pdf-transcript]');
        if (transcript) transcript.textContent = (await page.getTextContent()).items.map(item => item.str).join(' ');
      }
      canvas.dataset.ready = 'true';
      if (status) status.textContent = '';
    } catch (error) {
      if (error.name === 'RenderingCancelledException') continue;
      if (canvas.isConnected && status) status.textContent = error.message?.startsWith('This page') ? error.message : 'Could not display this PDF. Reattach an unlocked PDF or open the original.';
    }
  }
}
export function attachCropDrawing(root, onSelection) {
  const surface = root.querySelector('.crop-surface.is-drawing');
  if (!surface) return;
  let start, pointer;
  const point = event => {
    const bounds = surface.getBoundingClientRect();
    return [(event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height];
  };
  surface.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !surface.querySelector('canvas[data-ready="true"]')) return;
    event.preventDefault(); start = point(event); pointer = event.pointerId; surface.setPointerCapture(pointer);
  });
  surface.addEventListener('pointermove', event => {
    if (!start || event.pointerId !== pointer) return;
    const rect = cropRect(start, point(event));
    const overlay = surface.querySelector('.crop-selection');
    if (overlay) { overlay.hidden = false; overlay.style.cssText = `left:${rect[0]*100}%;top:${rect[1]*100}%;width:${rect[2]*100}%;height:${rect[3]*100}%`; }
  });
  surface.addEventListener('pointerup', event => {
    if (!start || event.pointerId !== pointer) return;
    const rect = cropRect(start, point(event)); start = null; surface.releasePointerCapture(pointer);
    if (validCropRect(rect)) onSelection(rect);
  });
  surface.addEventListener('pointercancel', () => { start = null; });
}
