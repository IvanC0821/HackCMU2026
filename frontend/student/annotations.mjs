const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const located = f => Number.isInteger(f?.pageIndex) && f.pageIndex >= 0 && ['x','y'].every(k => Number.isFinite(f[k]) && f[k] >= 0 && f[k] <= 1);
export const findingNumber = (findings, id) => findings.findIndex(f => f.id === id) + 1;
const validBox = b => b && ['x','y','width','height'].every(k=>Number.isFinite(b[k])) && b.x>=0 && b.y>=0 && b.width>0 && b.height>0 && b.x+b.width<=1.000001 && b.y+b.height<=1.000001;
export function locationLabel(f) {
  if (!located(f)) return 'Location needs TA review';
  return `${f.kind === 'line' ? 'Marked line' : f.kind === 'work' ? 'Related work' : 'Part location'} · Page ${f.pageIndex + 1}`;
}
export function layoutMarkers(findings, page, width, height) {
  return findings.filter(f=>f.pageIndex===page && located(f)).sort((a,b)=>a.y-b.y || a.x-b.x).map(f=>({
    finding:f, number:findingNumber(findings,f.id), x:f.x*width, y:f.y*height, targetX:f.x*width, targetY:f.y*height,
  }));
}
export function layoutCallouts(placements, pageWidth, pageHeight, heights={}) {
  let bottom=0;
  const cards=placements.map(p=>{
    const height=Math.max(70,heights[p.finding.id] || 140);
    const top=Math.max(12,p.targetY-24,bottom+12);
    bottom=top+height;
    return {...p,left:pageWidth+28,top,width:236,height};
  });
  return {cards,width:pageWidth+(cards.length?276:0),height:Math.max(pageHeight,bottom+12)};
}
export function markerMarkup(placements, active) {
  return placements.map(({finding:f,number,x,y})=>`<button class="paper-marker ${active===f.id?'selected':''}" style="left:${x}px;top:${y}px" data-marker="${esc(f.id)}" aria-label="Hint ${number}: ${esc(f.category)}: ${esc(locationLabel(f))}" aria-pressed="${active===f.id}" aria-controls="pdf-hint-${number}"><span aria-hidden="true"></span></button>`).join('');
}
export function calloutMarkup(layout, active) {
  const lines=layout.cards.map(p=>`<polyline class="hint-connector ${active===p.finding.id?'selected':''}" data-connector="${esc(p.finding.id)}" points="${p.targetX},${p.targetY} ${p.left-14},${p.targetY} ${p.left},${p.top+24}"/>`).join('');
  const notes=layout.cards.map(p=>{
    const f=p.finding;
    const context=f.kind==='work'?'The circle locates related work, not an incorrect symbol.':f.kind==='part'?'The circle locates this part; an exact mistaken line has not been identified.':'';
    return `<section class="pdf-hint-box ${active===f.id?'selected':''}" id="pdf-hint-${p.number}" data-hint="${esc(f.id)}" role="region" aria-label="Hint ${p.number}" style="left:${p.left}px;top:${p.top}px;width:${p.width}px"><button type="button" class="hint-heading" data-marker="${esc(f.id)}" aria-pressed="${active===f.id}" aria-label="Locate hint ${p.number}: ${esc(f.category)}"><span class="hint-number">${p.number}</span><strong>${esc(f.category)}</strong>${f.applied&&Number.isFinite(f.deduction)&&f.deduction>=0?`<span class="hint-deduction" aria-label="${f.deduction} points deducted">−${f.deduction}</span>`:''}</button><p>${esc(f.message)}</p><small>${esc(locationLabel(f))}</small>${context?`<small>${context}</small>`:''}</section>`;
  }).join('');
  return `<svg class="hint-connectors" width="${layout.width}" height="${layout.height}" aria-hidden="true">${lines}</svg>${notes}`;
}
export function detailMarkup(f, placement) {
  if(!f || !placement)return {highlights:'',note:''};
  const boxes=(Array.isArray(f.boxes)?f.boxes:[]).filter(validBox);
  return {highlights:boxes.map(b=>`<span class="annotation-highlight ${f.kind==='line'?'line':'context'}" style="left:${b.x*100}%;top:${b.y*100}%;width:${b.width*100}%;height:${b.height*100}%"></span>`).join(''),note:''};
}
