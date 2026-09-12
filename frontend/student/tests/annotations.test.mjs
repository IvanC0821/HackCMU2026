import test from 'node:test';
import assert from 'node:assert/strict';
import {located, locationLabel, findingNumber, layoutMarkers, markerMarkup, detailMarkup} from '../annotations.mjs';

const finding = {id:'q3:3a', pageIndex:2, x:0.6, y:0.3, kind:'line', category:'Notation error', message:'Check notation here.', boxes:[{x:0.2,y:0.28,width:0.35,height:0.04}]};

test('anchors track zoom and stay on the correct page', () => {
  const [a] = layoutMarkers([finding],2,600,800);
  const [b] = layoutMarkers([finding],2,900,1200);
  // PDF target scales; badge clearance remains a readable 32 screen pixels.
  assert.ok(Math.abs(b.targetX-2-(a.targetX-2)*1.5)<0.001);
  assert.ok(Math.abs(b.targetY-a.targetY*1.5)<0.001);
  assert.ok(Math.abs(b.x-b.targetX-32)<0.001);
  assert.ok(Math.abs(a.x-a.targetX-32)<0.001);
  assert.deepEqual(layoutMarkers([finding],1,600,800),[]);
  assert.equal(located({...finding,x:NaN}),false);
  assert.equal(located({...finding,y:-0.1}),false);
});
test('overlapping markers stay clickable and retain their exact target', () => {
  const pins = layoutMarkers([finding,{...finding,id:'second'},{...finding,id:'third'}],2,600,800);
  assert.equal(new Set(pins.map(p=>p.y)).size,3);
  assert.ok(pins.every(p=>Math.abs(p.targetY-240)<0.001 && p.x===364));
  assert.match(markerMarkup(pins,finding.id),/annotation-leader/);
  assert.match(markerMarkup(pins,finding.id),/aria-expanded="true"/);
  assert.doesNotMatch(markerMarkup(pins,finding.id,false),/aria-expanded="true"/);
});
test('numbers match sidebar identity across page filters and visual ordering', () => {
  const f2={...finding,id:'second',y:0.1}, f3={...finding,id:'third',pageIndex:3};
  const findings=[finding,f2,f3];
  const pins=layoutMarkers(findings,2,600,800);
  assert.deepEqual(pins.map(p=>p.number),[2,1]);
  assert.equal(layoutMarkers(findings,3,600,800)[0].number,3);
  assert.equal(findingNumber(findings,'second'),2);
  assert.match(markerMarkup(pins,'second'),/Feedback 2: Notation error/);
  assert.match(detailMarkup(f2,pins[0],600,800).note,/Feedback 2 ·/);
  assert.equal((markerMarkup(pins,null).match(/annotation-leader/g)||[]).length,2);
  assert.doesNotMatch(markerMarkup(pins,null),/>\?</);
});
test('badges sit outside quoted work and move left near the right page edge', () => {
  const f={...finding,boxes:[{x:0.2,y:0.3,width:0.75,height:0.02}]};
  const [p]=layoutMarkers([f],2,600,800);
  assert.equal(p.targetX,118); assert.equal(p.x,86);
  assert.ok(p.x+22<f.boxes[0].x*600);
  assert.match(markerMarkup([p],null),/annotation-leader/);
});
test('work and uncertain subparts are not labelled exact error lines', () => {
  assert.match(locationLabel(finding),/Marked line/);
  assert.match(locationLabel({...finding,kind:'work'}),/Related work/);
  assert.match(locationLabel({...finding,kind:'part'}),/Part location/);
  assert.match(locationLabel({...finding,x:undefined}),/needs TA review/);
  const [p] = layoutMarkers([finding],2,600,800);
  assert.match(detailMarkup({...finding,kind:'work'},p,600,800).note,/not an incorrect symbol/);
  assert.match(detailMarkup({...finding,kind:'part'},p,600,800).note,/exact mistaken line has not been identified/);
});
test('popup flips at page edge and escapes all feedback text', () => {
  const f = {...finding,id:'" onclick="bad()',category:'<script>bad()</script>',message:'<img onerror="bad()">',x:0.99,y:0.99,boxes:[{...finding.boxes[0],y:0.94}]};
  const [p] = layoutMarkers([f],2,320,500);
  const detail = detailMarkup(f,p,320,500);
  assert.match(detail.note,/pdf-annotation-note above/);
  assert.doesNotMatch(detail.note,/<script>|<img/);
  assert.match(detail.note,/&lt;script&gt;/);
  assert.doesNotMatch(markerMarkup([p],f.id),/data-marker="" onclick=/);
  assert.match(detail.highlights,/left:20%/);
});
test('no active marker or malformed boxes produce no fake highlights', () => {
  assert.deepEqual(detailMarkup(null,null,600,800),{highlights:'',note:''});
  const [p] = layoutMarkers([finding],2,600,800);
  assert.equal(detailMarkup({...finding,boxes:[null,{x:0.5,y:0.5,width:2,height:0.1}]},p,600,800).highlights,'');
});
