const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const located = f => Number.isInteger(f?.pageIndex) && f.pageIndex >= 0 && ['x','y'].every(k => Number.isFinite(f[k]) && f[k] >= 0 && f[k] <= 1);
export function locationLabel(f) {
  if (!located(f)) return 'Location needs TA review';
  return `${f.kind === 'line' ? 'Marked line' : f.kind === 'work' ? 'Related work' : 'Part location'} · Page ${f.pageIndex + 1}`;
}
export function layoutMarkers(findings, page, width, height) {
  const placements = [];
  for (const f of findings.filter(f => f.pageIndex === page && located(f)).sort((a,b) => a.y-b.y || a.x-b.x)) {
    const x = clamp(f.x * width, 22, width-22), originalY = clamp(f.y * height,22,height-22);
    let y = originalY;
    const collides = n => placements.some(p => Math.abs(p.x-x)<44 && Math.abs(p.y-n)<44);
    for (let step=1;collides(y) && step<findings.length*2+2;step++) {
      y = clamp(originalY + (step%2 ? 1 : -1) * Math.ceil(step/2)*44,22,height-22);
    }
    placements.push({finding:f,x,y,targetX:f.x*width,targetY:f.y*height});
  }
  return placements;
}
export function markerMarkup(placements, active) {
  return placements.map(({finding:f,x,y,targetX,targetY}) => {
    const length=Math.hypot(x-targetX,y-targetY), angle=Math.atan2(targetY-y,targetX-x)*180/Math.PI;
    return `${length>2?`<span class="annotation-leader" aria-hidden="true" style="left:${x}px;top:${y}px;width:${length}px;transform:rotate(${angle}deg)"></span>`:''}<button class="paper-marker ${active===f.id?'selected':''}" style="left:${x}px;top:${y}px" data-marker="${esc(f.id)}" aria-label="${esc(f.category)}: ${esc(locationLabel(f))}" aria-pressed="${active===f.id}" aria-expanded="${active===f.id}" aria-controls="pdf-annotation-note"><span aria-hidden="true">?</span></button>`;
  }).join('');
}
export function detailMarkup(f, placement, width, height) {
  if (!f || !placement) return {highlights:'', note:''};
  const validBox = b => b && ['x','y','width','height'].every(k=>Number.isFinite(b[k])) && b.x>=0 && b.y>=0 && b.width>0 && b.height>0 && b.x+b.width<=1.000001 && b.y+b.height<=1.000001;
  const boxes=(Array.isArray(f.boxes)?f.boxes:[]).filter(validBox);
  const highlights=boxes.map(b=>`<span class="annotation-highlight ${f.kind==='line'?'line':'context'}" style="left:${b.x*100}%;top:${b.y*100}%;width:${b.width*100}%;height:${b.height*100}%"></span>`).join('');
  const cardWidth=Math.min(280,width-24), left=clamp(placement.x-cardWidth,12,width-cardWidth-12);
  const flip=placement.y+220>height;
  const top=flip?Math.max(12,placement.y-24):placement.y+26;
  const note=`<section class="pdf-annotation-note ${flip?'above':''}" id="pdf-annotation-note" role="region" aria-label="PDF feedback" style="left:${left}px;top:${top}px;width:${cardWidth}px"><header><span class="annotation-note-label">${esc(locationLabel(f))}</span><button type="button" class="annotation-close" data-annotation-close aria-label="Close PDF feedback">×</button></header><h3>${esc(f.category)}</h3><p>${esc(f.message)}</p>${f.kind!=='line'?`<small>${f.kind==='work'?'Marked area shows the related work, not an incorrect symbol.':'The part is located; an exact mistaken line has not been identified.'}</small>`:''}</section>`;
  return {highlights,note};
}
